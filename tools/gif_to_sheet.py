"""Turn an animated GIF whose "transparency" is a baked-in checkerboard (common in generated art) into a real
transparent WebP sprite sheet for the manifest.

    python3 tools/gif_to_sheet.py assets/torch_moving_flame.gif assets/sprites/torch_stand.webp --height 352 --cols 10

How the background is removed (per frame):
  * the checker's two colours, cell size and phase are measured from the image border;
  * ink-outlined parts (anything enclosed by near-black outline, e.g. a torch handle) stay fully opaque: a flood fill
    from the border that stops at dark outline pixels finds everything that is NOT enclosed;
  * everything the fill reaches (background, flame, glow) is un-blended against the predicted checker colour:
    alpha = max_c (C - B) / (255 - B), colour = B + (C - B) / alpha, so bright cores stay opaque, soft glows become
    translucent but keep their colour, and the checker itself goes fully transparent.
Frames are cropped to their union bounding box, resized with premultiplied alpha, and packed cols x rows.
The printed manifest snippet assumes the bottom of the art is the ground contact (baseline 1.0).
"""
import argparse, json, math, os
import numpy as np
from PIL import Image, ImageSequence
from scipy import ndimage

def lumof(rgb):
    return rgb[..., 0] * 0.3 + rgb[..., 1] * 0.59 + rgb[..., 2] * 0.11   # (avoids numpy 2.0's spurious matmul FP warnings on macOS)


def checker_model(rgb):
    """Two checker colours, cell size and phase, measured from the top rows / left columns."""
    lum = lumof(rgb)
    band = np.concatenate([rgb[:12].reshape(-1, 3), rgb[:, :12].reshape(-1, 3)])
    bl = lumof(band)
    th = (np.percentile(bl, 10) + np.percentile(bl, 90)) / 2
    dark, light = band[bl < th].mean(0), band[bl >= th].mean(0)

    def edges(profile):
        sm = np.convolve(profile, np.ones(5) / 5, mode='same')
        b = sm > th
        return np.nonzero(b[1:] != b[:-1])[0] + 1

    ex = edges(lum[5, :]); ey = edges(lum[:, 5])
    cell = float(np.median(np.diff(ex)))
    phase_x = float(ex[0] % cell); phase_y = float(ey[0] % cell)
    first_light = bool(lum[5, 5] > th)        # colour of the cell containing (5, 5)
    return dark, light, cell, phase_x, phase_y, first_light


def unbake(rgb, model):
    dark, light, cell, px, py, first_light = model
    H, W, _ = rgb.shape
    ys, xs = np.mgrid[0:H, 0:W]
    i = np.floor((xs - px) / cell); j = np.floor((ys - py) / cell)
    i0 = np.floor((5 - px) / cell); j0 = np.floor((5 - py) / cell)
    is_light = ((i + j - i0 - j0) % 2 == 0) == first_light
    B = np.where(is_light[..., None], light, dark)
    # within 2 px of a cell edge the dithered boundary jitters: take whichever checker colour is closer
    fx = (xs - px) % cell; fy = (ys - py) % cell
    near = (np.minimum(fx, cell - fx) < 2.5) | (np.minimum(fy, cell - fy) < 2.5)
    closer_light = np.abs(rgb - light).sum(-1) < np.abs(rgb - dark).sum(-1)
    B = np.where((near & closer_light)[..., None], light, np.where(near[..., None], dark, B))
    d = rgb - B
    # un-blend against the known checker colour; strength from red/green only (fire glow is warm, while the GIF's dither
    # noise strays bluish and would otherwise leave faint dark specks)
    alpha_est = np.clip(((d[..., :2] - 5.0) / (255.0 - B[..., :2])).max(-1), 0, 1)
    colour_est = np.clip(B + d / np.maximum(alpha_est, 1e-3)[..., None], 0, 255)
    # flood from the border through background + FAINT glow only. Barriers: ink lines (darker than the checker, or dark
    # and not bluish like it), neutral solid colours (metal/stone greys), and anything strongly lit (flame, rim light).
    # Whatever the flood cannot reach is solid art (handles, stones, outlines) and is made fully opaque.
    bluish = (rgb[..., 2] - rgb[..., 0]) > 4
    dark_ink = (lumof(rgb) < lumof(B) - 12) | ((lumof(rgb) < 34) & ~bluish & (np.abs(d).max(-1) > 9))
    neutral = (np.abs(d).max(-1) > 18) & ((d[..., 0] - d[..., 2]) < 0.35 * np.maximum(d.max(-1), 1))
    strong = alpha_est > 0.5
    barrier = ndimage.binary_dilation(dark_ink | neutral, iterations=2) | strong
    labels, _ = ndimage.label(~barrier)
    border = np.unique(np.concatenate([labels[0], labels[-1], labels[:, 0], labels[:, -1]]))
    reached = np.isin(labels, border[border > 0])
    solid = ~reached & ~strong                                                  # strong (glowing) pixels keep their recovered alpha
    sl, n = ndimage.label(solid)                                                # drop tiny specks (dither noise read as ink)
    if n:
        sizes = ndimage.sum(solid, sl, index=np.arange(1, n + 1))
        solid &= np.isin(sl, np.nonzero(sizes >= 40)[0] + 1)
    alpha = np.where(solid, 1.0, alpha_est)
    colour = np.where(solid[..., None], rgb, colour_est)
    return np.dstack([colour, alpha * 255]).astype(np.float32)


def resize_premultiplied(rgba, size):
    a = rgba[..., 3:4] / 255.0
    pre = np.dstack([rgba[..., :3] * a, rgba[..., 3:4]]).astype(np.uint8)
    im = Image.fromarray(pre).resize(size, Image.LANCZOS)
    out = np.asarray(im).astype(np.float32)
    a2 = out[..., 3:4] / 255.0
    out[..., :3] = np.where(a2 > 0.004, np.clip(out[..., :3] / np.maximum(a2, 1e-3), 0, 255), 0)
    return out.astype(np.uint8)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('src'); ap.add_argument('dst')
    ap.add_argument('--height', type=int, default=352, help='frame height in the sheet (px)')
    ap.add_argument('--cols', type=int, default=10)
    ap.add_argument('--quality', type=int, default=82)
    a = ap.parse_args()
    gif = Image.open(a.src)
    frames = [np.asarray(f.convert('RGB')).astype(np.float32) for f in ImageSequence.Iterator(gif)]
    durations = [f.info.get('duration', 100) for f in ImageSequence.Iterator(Image.open(a.src))]
    model = checker_model(frames[0])
    print(f'checker: dark {model[0].round(1)}, light {model[1].round(1)}, cell {model[2]:.0f}px, phase ({model[3]:.0f}, {model[4]:.0f})')
    rgba = [unbake(f, model) for f in frames]
    union = np.zeros(rgba[0].shape[:2], bool)
    for f in rgba: union |= f[..., 3] > 6
    ys, xs = np.nonzero(union)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    fh = a.height; fw = round((x1 - x0) * fh / (y1 - y0))
    n = len(rgba); cols = min(a.cols, n); rows = math.ceil(n / cols)
    sheet = Image.new('RGBA', (fw * cols, fh * rows), (0, 0, 0, 0))
    for k, f in enumerate(rgba):
        tile = resize_premultiplied(f[y0:y1, x0:x1], (fw, fh))
        sheet.paste(Image.fromarray(tile), ((k % cols) * fw, (k // cols) * fh))
    os.makedirs(os.path.dirname(a.dst) or '.', exist_ok=True)
    sheet.save(a.dst, 'WEBP', quality=a.quality, method=6, alpha_quality=90)
    fps = round(1000 / (sum(durations) / len(durations)))
    print(f'wrote {a.dst}: {n} frames {fw}x{fh}, sheet {cols}x{rows} = {sheet.width}x{sheet.height}px, {os.path.getsize(a.dst) / 1024:.0f} KB')
    print('manifest sheet:', json.dumps({'cols': cols, 'rows': rows, 'anims': {'idle': {'row': 0, 'frames': n, 'fps': fps}}}))


if __name__ == '__main__':
    main()
