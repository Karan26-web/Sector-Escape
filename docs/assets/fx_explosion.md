# Explosion sprite sheet

| | |
|---|---|
| **Save as** | `assets/sprites/fx_explosion.png` |
| **Type** | Sprite sheet (PNG-32 with alpha) |
| **Canvas size** | 2048 × 256 px |
| **Grid** | 8 columns × 1 rows · each cell 256 × 256 px |
| **World scale** | 2.8 m |
| **Priority** | P0 |
| **Manifest key** | `fx_explosion` |

## Used for
Robot destruction and boss explosions.

## Visual description
Cartoon explosion: bold ink-outlined spiky fireball, white→yellow→orange→dark-smoke progression, a few flying debris chunks in the middle frames.

## Sheet layout (row → animation)

| Row | Animation | Frames | FPS | Play | What happens |
|---|---|---|---|---|---|
| 0 | `boom` | 8 | 16 | once | white flash core → orange spiky fireball expanding → dark smoke ring and embers fading |

Rows are read top to bottom; frames left to right starting at column 0. Unused cells in a row stay empty (transparent). The grid is defined in `assets/manifest.json` under `images.fx_explosion.sheet` – if your generated sheet ends up with a different grid, edit `cols` / `rows` / `frames` there instead of redrawing.

## GPT image prompt (copy–paste)

```text
Cartoon explosion: bold ink-outlined spiky fireball, white→yellow→orange→dark-smoke progression, a few flying debris chunks in the middle frames.
Each frame centred in its cell; frames 1–8 are consecutive moments of ONE explosion.
Art style: 2010s American TV superhero-cartoon look — clean, bold black ink outlines with varied line weight, flat cel-shaded colours with ONE hard-edged shadow tone and ONE small highlight per surface, slightly angular stylised shapes, saturated but grounded palette. No gradients except glows, no photorealism, no 3D render look, no text, no watermark, no signature.
SPRITE SHEET RULES: a strict grid of 8 columns × 1 rows, every cell exactly 256×256 px, character centred horizontally in every cell with the feet on one shared baseline at 92% of the cell height, identical scale, proportions, colours and lighting in every cell, no grid lines, no cell borders, no labels, fully transparent background (if transparency is unavailable use a solid flat #FF00FF magenta background).
ROWS (top to bottom): row 0: 'boom' – 8 frames – white flash core → orange spiky fireball expanding → dark smoke ring and embers fading.
Output size 2048×256 px, PNG with transparency.
```

### If the grid comes out wrong
Image models often miscount cells. Reliable fallback: generate **one row at a time** (one animation per image, `1 × N` cells, same cell size), then stack the rows into the full sheet with any sprite packer or an image editor. Alternatively generate single poses and assemble. Always check the result in `tools/sheet-viewer.html` (choose the preset for this asset) – the feet must sit on the same baseline in every frame or the character will bounce.

## Checklist before dropping it in
- [ ] Transparent background (or flat `#FF00FF` → set `"chromaKey": "#FF00FF"` for this entry in `assets/manifest.json`).
- [ ] Exact canvas size; cells aligned to the grid, no borders.
- [ ] Outlines are crisp black ink, colours flat (no photoreal shading).
- [ ] Reload the game → the placeholder is replaced automatically. Use `tools/sheet-viewer.html` to preview the animation.

## Current manifest entry
```json
{
  "fx_explosion": {
    "path": "sprites/fx_explosion.png",
    "worldHeight": 2.8,
    "sheet": {
      "cols": 8,
      "rows": 1,
      "anims": {
        "boom": {
          "row": 0,
          "frames": 8,
          "fps": 16,
          "loop": false
        }
      }
    }
  }
}
```
