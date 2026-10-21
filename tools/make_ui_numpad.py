"""Build the keypad's stone frame (a 9-slice for CSS border-image) from the in-game wall-top stone texture.

    python3 tools/make_ui_numpad.py   →  assets/ui/numpad_frame.webp

The frame reuses the big middle course of blocks in textures/wall_top.webp, so the keypad is carved from the same
mossy stone as the ring walls. Layout (2x pixels): B-px border on every side, one full texture period along each
edge (so `border-image-repeat: round` tiles seamlessly), rounded outer corners, an ink outline, top-lit shading.
The interior stays transparent; CSS paints the dark panel behind it.
"""
import os
from PIL import Image, ImageDraw, ImageEnhance

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'assets', 'textures', 'wall_top.webp')
OUT = os.path.join(ROOT, 'assets', 'ui', 'numpad_frame.webp')
B = 40                # border thickness in the image (CSS uses border-width 20px → crisp at 2x)
ROW = (16, 107)       # the big middle course of wall_top (grout lines at y≈18 and y≈104 of 128)
RADIUS = 28           # outer corner radius
STRETCH = 1.9         # widen the blocks: chunky frame stones (about 2.5x as long as the frame is thick), like the mockup
INK = (20, 22, 16, 255)


def main():
    tex = Image.open(SRC).convert('RGBA')
    row = tex.crop((0, ROW[0], tex.width, ROW[1]))
    strip = row.resize((round(row.width * B / row.height * STRETCH), B), Image.LANCZOS)   # one seamless period, B tall
    E = strip.width
    W = H = B + E + B
    frame = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    shade = lambda im, k: ImageEnhance.Brightness(im).enhance(k)
    # edges: the strip's top (outer) side always faces outward; light from above
    frame.paste(shade(strip, 1.08), (B, 0))
    frame.paste(shade(strip.rotate(180), 0.80), (B, H - B))
    frame.paste(shade(strip.rotate(90, expand=True), 0.95), (0, B))
    frame.paste(shade(strip.rotate(-90, expand=True), 0.88), (W - B, B))
    # corners: a square of block, oriented like its neighbouring top/bottom edge
    corner = strip.crop((E - B, 0, E, B))
    frame.paste(shade(corner, 1.04), (0, 0)); frame.paste(shade(corner.transpose(Image.FLIP_LEFT_RIGHT), 1.0), (W - B, 0))
    frame.paste(shade(corner.rotate(180), 0.80), (W - B, H - B)); frame.paste(shade(corner.rotate(180).transpose(Image.FLIP_LEFT_RIGHT), 0.84), (0, H - B))
    # rounded outer silhouette + ink outline (outer edge) + a thin dark seam on the inner edge
    mask = Image.new('L', (W, H), 0); md = ImageDraw.Draw(mask)
    md.rounded_rectangle([0, 0, W - 1, H - 1], radius=RADIUS, fill=255); md.rectangle([B, B, W - B - 1, H - B - 1], fill=0)
    frame.putalpha(Image.composite(frame.getchannel('A'), Image.new('L', (W, H), 0), mask))
    d = ImageDraw.Draw(frame)
    d.rounded_rectangle([1, 1, W - 2, H - 2], radius=RADIUS, outline=INK, width=4)
    d.rectangle([B - 2, B - 2, W - B + 1, H - B + 1], outline=(14, 16, 12, 230), width=3)
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    frame.save(OUT, 'WEBP', quality=90, method=6)
    print(f'wrote {os.path.relpath(OUT, ROOT)}  {W}x{H}px  slice {B}px  ({os.path.getsize(OUT) / 1024:.1f} KB)')


if __name__ == '__main__':
    main()
