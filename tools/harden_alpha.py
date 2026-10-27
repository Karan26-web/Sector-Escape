"""Tighten a sprite sheet's soft alpha edges, row by row, so the background stops showing through a character.

    python3 tools/harden_alpha.py assets/sprites/hero_front.webp --grid 8x6 --rows 0-4
    python3 tools/harden_alpha.py assets/sprites/hero_back.webp --grid 8x3 --rows 0,1

Some art arrives with a wide, blurry alpha falloff (several px of half-transparent ink around the figure, worst on spiky
hair). Seen big (the opening's close-ups) the background bleeds through it: teal water in Karan's hair where it crosses the
lake, a seam where the backdrop changes colour. Per listed row:
  * alpha ramps from --lo to --hi (fractions of opaque): below --lo goes clear, above --hi solid, a thin anti-aliased edge
    between, so the outline stays smooth but no longer see-through;
  * the solid core of each figure (its filled silhouette, 2 px in from the edge) is forced opaque, so no hole opens inside.
Leave out rows whose softness is meant to be (glows, the cast row's cyan hand): they are copied untouched.
Colour is unchanged; the sheet is saved with lossless alpha. Run tools/manifest_sizes.py and bump the manifest version after.
"""
import argparse, os
import numpy as np
from PIL import Image
from scipy import ndimage


def rows_arg(s):
    out = set()
    for part in s.split(','):
        a, _, b = part.partition('-'); out.update(range(int(a), int(b or a) + 1))
    return sorted(out)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('sheet'); ap.add_argument('--grid', required=True, help='COLSxROWS, e.g. 8x6')
    ap.add_argument('--rows', required=True, type=rows_arg, help='rows to tighten, e.g. 0-4 or 0,1')
    ap.add_argument('--lo', type=float, default=0.25); ap.add_argument('--hi', type=float, default=0.7)
    ap.add_argument('--quality', type=int, default=92, help='WebP quality of the colour (alpha is lossless)')
    ap.add_argument('--out', help='output sheet (default: overwrite SHEET)')
    a = ap.parse_args()
    cols, nrows = map(int, a.grid.lower().split('x'))
    im = np.asarray(Image.open(a.sheet).convert('RGBA')).copy()
    ch = im.shape[0] // nrows
    for r in a.rows:
        band = im[r * ch:(r + 1) * ch]
        al = band[..., 3].astype(np.float32) / 255
        body = ndimage.binary_fill_holes(al > 0.5)
        core = ndimage.binary_erosion(body, iterations=2)
        tight = np.clip((al - a.lo) / (a.hi - a.lo), 0, 1); tight[core] = 1
        before = ((al > 0.02) & (al < 0.98)).sum(); band[..., 3] = np.round(tight * 255).astype(np.uint8)
        after = ((tight > 0.02) & (tight < 0.98)).sum()
        print(f'  row {r}: half-transparent px {before} -> {after}')
    dst = a.out or a.sheet
    Image.fromarray(im).save(dst, 'WEBP', quality=a.quality, method=6, alpha_quality=100)
    print(f'wrote {dst} ({os.path.getsize(dst) // 1024} KB)')


if __name__ == '__main__':
    main()
