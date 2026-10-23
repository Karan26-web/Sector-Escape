"""Append a new animation row to an existing sprite sheet, from generated frames: a strip (PNG with real alpha, figures
side by side) or an animated GIF (one figure per frame).

    python3 tools/add_sheet_row.py assets/sprites/enemy_bot.webp "Slam.png" --grid 8x4 --frames 6 --scale 0.5 --cell-height 296
    python3 tools/add_sheet_row.py assets/sprites/hero_back.webp cast.gif --grid 8x2 --frames 6 --ref-frame 1 --ref-height 214 --key solid

  --key solid: the art sits on one flat colour instead of transparency (read from the border). Everything enclosed by the
    ink outline stays opaque; outside it the colour is un-blended against the background, so the background goes clear
    and soft glows keep their colour and fade out smoothly.

How the frames are placed:
  * every figure in the strip is cut out by its connected alpha; small pieces (sparks, glows) join the nearest figure;
  * one scale for every frame (--scale, or --ref-height = the height the --ref-frame figure should have in sheet pixels),
    so the character never changes size between frames or against the sheet's other rows;
  * each frame's feet centre (alpha centroid of its lowest rows) goes on the cell's horizontal centre and on the sheet's
    ground line (--baseline, the manifest baseline), so the character stands still while it animates;
  * --cell-height grows every cell when the new poses need more headroom (raised arms): the existing frames move down so
    their feet stay on the ground line; the printed manifest values (baseline, worldHeight factor) keep in-game sizes;
  * --repeat 6=5 uses frame 5 again as frame 6 (e.g. when the art of frame 6 is cut off by the image edge).
Resizing uses premultiplied alpha (no dark fringes). Prints the manifest changes to make.
"""
import argparse, json, os
import numpy as np
from PIL import Image
from scipy import ndimage


def resize_premultiplied(im, size):
    a = np.asarray(im).astype(np.float32)
    al = a[..., 3:4] / 255.0
    pre = np.dstack([a[..., :3] * al, a[..., 3:4]]).astype(np.uint8)
    out = np.asarray(Image.fromarray(pre).resize(size, Image.LANCZOS)).astype(np.float32)
    al2 = out[..., 3:4] / 255.0
    out[..., :3] = np.where(al2 > 0.004, np.clip(out[..., :3] / np.maximum(al2, 1e-3), 0, 255), 0)
    return Image.fromarray(out.astype(np.uint8))


def key_solid(rgb, bg=None):
    """RGBA from art on a flat background colour (see --key solid)."""
    rgb = rgb.astype(np.float32)
    if bg is None: bg = np.median(np.concatenate([rgb[:4].reshape(-1, 3), rgb[-4:].reshape(-1, 3), rgb[:, :4].reshape(-1, 3), rgb[:, -4:].reshape(-1, 3)]), 0)
    B = np.asarray(bg, np.float32); d = rgb - B
    up = np.clip(d / np.maximum(255 - B, 1), 0, 1).max(-1); down = np.clip(-d / np.maximum(B, 1), 0, 1).max(-1)
    alpha = np.maximum(up, down)
    lum = lambda c: c[..., 0] * 0.3 + c[..., 1] * 0.59 + c[..., 2] * 0.11
    ink = lum(rgb) < lum(B[None, None]) - 10
    barrier = ndimage.binary_dilation(ink | (alpha > 0.55), iterations=1)
    lab, _ = ndimage.label(~barrier)
    border = np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))
    reached = np.isin(lab, border[border > 0])
    solid = ~reached
    # pockets of leftover fake-checkerboard (neutral light grey, e.g. between an arm and the body) are holes, not art:
    # generated art sometimes keeps them inside the outline. Cleared when they form a real patch, not single pixels.
    spread = rgb.max(-1) - rgb.min(-1)
    grey = solid & (spread < 22) & (lum(rgb) > 140)
    gl, gn = ndimage.label(grey)
    if gn:
        sizes = ndimage.sum(grey, gl, np.arange(1, gn + 1))
        holes = ndimage.binary_dilation(np.isin(gl, np.nonzero(sizes >= 25)[0] + 1), iterations=1) & (spread < 40) & (lum(rgb) > 110)
        solid &= ~holes; alpha = np.where(holes, 0, alpha)
    colour = np.where(solid[..., None], rgb, np.clip(B + d / np.maximum(alpha, 1e-3)[..., None], 0, 255))
    alpha = np.where(solid, 1.0, np.where(alpha < 0.03, 0, alpha))
    return np.dstack([colour, alpha * 255]).astype(np.uint8)


def gif_figures(path, key):
    """[(crop, feet x, feet bottom)] from the frames of an animated image, one figure per frame."""
    im = Image.open(path); out = []
    for k in range(getattr(im, 'n_frames', 1)):
        im.seek(k); fr = im.convert('RGBA')
        a = np.asarray(fr)
        if key == 'solid' or a[..., 3].min() == 255: a = key_solid(a[..., :3])
        out.append(Image.fromarray(a))
    return out


def cut_figures(strip, n):
    """[(crop RGBA image, feet centre x, feet bottom y)] in strip order (relative to each crop)."""
    rgba = np.asarray(strip)
    alpha = rgba[..., 3]
    lab, k = ndimage.label(alpha > 8)
    if k == 0: raise SystemExit('the strip has no opaque pixels (is the background really transparent?)')
    idx = np.arange(1, k + 1)
    sizes = ndimage.sum(alpha > 8, lab, idx)
    cx = np.array(ndimage.center_of_mass(alpha > 8, lab, idx))[:, 1]
    big = [i for i in range(k) if sizes[i] >= 0.15 * sizes.max()]
    if len(big) != n: raise SystemExit(f'found {len(big)} figures, expected {n} (sizes {sorted(sizes.astype(int))[-n - 2:]})')
    big.sort(key=lambda i: cx[i])
    owner = {i: big.index(min(big, key=lambda j: abs(cx[j] - cx[i]))) for i in range(k)}   # small bits join the nearest figure
    out = []
    for f in range(n):
        mask = np.isin(lab, [i + 1 for i in range(k) if owner[i] == f])
        ys, xs = np.nonzero(mask)
        x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
        crop = rgba[y0:y1, x0:x1].copy(); crop[..., 3] = np.where(mask[y0:y1, x0:x1], crop[..., 3], 0)
        solid = crop[..., 3] > 96
        rows = np.nonzero(solid.any(1))[0]; bottom = rows.max() + 1                     # the feet: lowest solid rows
        band = solid[max(0, bottom - max(4, int(0.04 * (y1 - y0)))):bottom]
        fx = np.nonzero(band)[1].mean()
        out.append((Image.fromarray(crop), fx, bottom))
    return out


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('sheet'); ap.add_argument('strip')
    ap.add_argument('--grid', required=True, help='current grid COLSxROWS, e.g. 8x4')
    ap.add_argument('--frames', type=int, required=True)
    ap.add_argument('--scale', type=float); ap.add_argument('--ref-frame', type=int, default=1); ap.add_argument('--ref-height', type=float)
    ap.add_argument('--baseline', type=float, default=0.91, help='current manifest baseline (ground line, fraction of the cell height)')
    ap.add_argument('--cell-height', type=int, help='grow every cell to this height (px)')
    ap.add_argument('--repeat', action='append', default=[], help='DST=SRC (1-based): reuse frame SRC as frame DST')
    ap.add_argument('--key', choices=['none', 'solid'], default='none', help='remove a flat background colour (GIFs without alpha are keyed automatically)')
    ap.add_argument('--quality', type=int, default=85, help='WebP quality of the written sheet')
    ap.add_argument('--out', help='output sheet (default: overwrite SHEET)')
    a = ap.parse_args()
    cols, rows = map(int, a.grid.lower().split('x'))
    sheet = Image.open(a.sheet).convert('RGBA'); W, H = sheet.size
    cw, ch = W // cols, H // rows
    H2 = a.cell_height or ch
    if H2 < ch: raise SystemExit('--cell-height can only grow the cells')
    pad = H2 - ch; feet_y = a.baseline * ch + pad
    src = Image.open(a.strip)
    if getattr(src, 'n_frames', 1) > 1:                                          # an animated GIF: one figure per frame
        frames = gif_figures(a.strip, a.key)
        if len(frames) != a.frames: raise SystemExit(f'the animation has {len(frames)} frames, expected {a.frames}')
        figs = [cut_figures(f, 1)[0] for f in frames]
    else:
        strip = src.convert('RGBA')
        if a.key == 'solid': strip = Image.fromarray(key_solid(np.asarray(strip)[..., :3]))
        figs = cut_figures(strip, a.frames)
    for r in a.repeat:
        d, s_ = (int(v) - 1 for v in r.split('=')); figs[d] = figs[s_]
    if a.scale: s = a.scale
    elif a.ref_height:
        crop, fx, bottom = figs[a.ref_frame - 1]; top = np.nonzero(np.asarray(crop)[..., 3].any(1))[0].min()
        s = a.ref_height / (bottom - top)
    else: raise SystemExit('give --scale or --ref-height')
    out = Image.new('RGBA', (W, (rows + 1) * H2), (0, 0, 0, 0))
    for r in range(rows): out.alpha_composite(sheet.crop((0, r * ch, W, (r + 1) * ch)), (0, r * H2 + pad))
    for f, (crop, fx, bottom) in enumerate(figs):
        w, h = max(1, round(crop.width * s)), max(1, round(crop.height * s))
        tile = resize_premultiplied(crop, (w, h))
        x = round((f % cols) * cw + cw / 2 - fx * s); y = round(rows * H2 + feet_y - bottom * s)
        cx0, cy0 = (f % cols) * cw, rows * H2
        over = [cx0 - x, cy0 - y, x + w - (cx0 + cw), y + h - (cy0 + H2)]
        if max(over) > 0:
            print(f'  ! frame {f + 1} spills over its cell by left/top/right/bottom = {over} px ' + ('(faded out before the edge)' if max(over[0], over[2]) > 0 and max(over[1], over[3]) <= 0 else '(clipped)'))
        box = (max(0, cx0 - x), max(0, cy0 - y), min(w, cx0 + cw - x), min(h, cy0 + H2 - y))
        piece = tile.crop(box)
        if over[0] > 0 or over[2] > 0:   # a soft glow reaching past a side edge fades out over the last px instead of a hard cut
            pa = np.asarray(piece).copy(); n = min(pa.shape[1], 28); ramp = np.linspace(0, 1, n, endpoint=False) ** 1.5
            if over[2] > 0: pa[:, -n:, 3] = (pa[:, -n:, 3] * ramp[::-1][None, :]).astype(np.uint8)
            if over[0] > 0: pa[:, :n, 3] = (pa[:, :n, 3] * ramp[None, :]).astype(np.uint8)
            piece = Image.fromarray(pa)
        out.alpha_composite(piece, (x + box[0], y + box[1]))
        print(f'  frame {f + 1}: {crop.width}x{crop.height} -> {w}x{h}, feet at ({fx * s:.0f}, {bottom * s:.0f}) in the tile, top {y - cy0} px from the cell top')
    dst = a.out or a.sheet
    out.save(dst, 'WEBP', quality=a.quality, method=6, alpha_quality=90)
    print(f'wrote {dst}: {out.width}x{out.height} ({os.path.getsize(dst) // 1024} KB), cells {cw}x{H2}, scale {s:.3f}')
    snippet = {'sheet.rows': rows + 1, 'new anim row': rows, 'frames': a.frames}
    if pad: snippet.update({'baseline': round(feet_y / H2, 4), 'worldHeight ×': round(H2 / ch, 4)})
    print('manifest:', json.dumps(snippet))


if __name__ == '__main__':
    main()
