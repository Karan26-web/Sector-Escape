"""Pack separate sprite images (transparent PNGs) into one grid sheet for the manifest.

    python3 tools/pack_sprites.py assets/sprites/jungle_tree.webp tree1.png tree2.png ... --cols 3 --cell 640

Each image is cropped to its opaque pixels, scaled so its height fills the cell from a small top margin down to the
shared ground line (`--baseline`, a fraction of the cell height), centred horizontally and bottom-aligned on that
line: every variant then stands on the ground at the same row, so one manifest `baseline` fits them all.
Resizing uses premultiplied alpha (no dark fringes). Prints the manifest `sheet` + `baseline` to paste.
"""
import argparse, json, math, os
import numpy as np
from PIL import Image


def resize_premultiplied(im, size):
    a = np.asarray(im).astype(np.float32)
    al = a[..., 3:4] / 255.0
    pre = np.dstack([a[..., :3] * al, a[..., 3:4]]).astype(np.uint8)
    out = np.asarray(Image.fromarray(pre).resize(size, Image.LANCZOS)).astype(np.float32)
    al2 = out[..., 3:4] / 255.0
    out[..., :3] = np.where(al2 > 0.004, np.clip(out[..., :3] / np.maximum(al2, 1e-3), 0, 255), 0)
    return Image.fromarray(out.astype(np.uint8))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('out'); ap.add_argument('inputs', nargs='+')
    ap.add_argument('--cols', type=int, default=4); ap.add_argument('--cell', type=int, default=512, help='cell size in px (square)')
    ap.add_argument('--baseline', type=float, default=0.975, help='ground line as a fraction of the cell height from the top')
    ap.add_argument('--top', type=float, default=0.01, help='top margin (fraction)')
    ap.add_argument('--quality', type=int, default=85)
    a = ap.parse_args()
    n = len(a.inputs); cols = min(a.cols, n); rows = math.ceil(n / cols); C = a.cell
    sheet = Image.new('RGBA', (cols * C, rows * C), (0, 0, 0, 0))
    for k, path in enumerate(a.inputs):
        im = Image.open(path).convert('RGBA')
        alpha = np.asarray(im.getchannel('A'))
        ys, xs = np.nonzero(alpha > 8)
        im = im.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
        h_target = (a.baseline - a.top) * C
        s = min(h_target / im.height, (C * 0.98) / im.width)       # fill the height; never wider than the cell
        w, h = max(1, round(im.width * s)), max(1, round(im.height * s))
        tile = resize_premultiplied(im, (w, h))
        x0 = (k % cols) * C + (C - w) // 2
        y0 = (k // cols) * C + round(a.baseline * C) - h             # bottom of the sprite on the ground line
        sheet.alpha_composite(tile, (x0, y0))
        print(f'{os.path.basename(path)}: {im.width}x{im.height} -> {w}x{h} in cell {k}')
    os.makedirs(os.path.dirname(a.out) or '.', exist_ok=True)
    sheet.save(a.out, 'WEBP', quality=a.quality, method=6, alpha_quality=90)
    anims = {chr(97 + k): {'col': k % cols, 'row': k // cols, 'frames': 1} for k in range(n)}
    print(f'wrote {a.out}: {sheet.width}x{sheet.height}px, {os.path.getsize(a.out) / 1024:.0f} KB')
    print('manifest:', json.dumps({'sheet': {'cols': cols, 'rows': rows, 'anims': anims}, 'baseline': a.baseline}))


if __name__ == '__main__':
    main()
