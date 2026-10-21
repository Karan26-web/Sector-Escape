# Sector Cannon – top-down charge sequence (5 frames)

| | |
|---|---|
| **Save as** | `assets/sprites/cannon_top_charge.png` |
| **Type** | Sprite sheet (PNG-32 with alpha) |
| **Canvas size** | 1280 × 256 px |
| **Grid** | 5 columns × 1 rows · each cell 256 × 256 px |
| **World scale** | 5.3 m |
| **Priority** | P1 |
| **Manifest key** | `cannon_top_charge` |

## Used for
Plays on the top-down cannon during the 1.35 s charge, then holds the last frame while the sector laser fires.

## Visual description
Top-down Sector Cannon on its pedestal, same design and framing in every cell, the muzzle charging up and a cyan beam starting to fire downward.

## Sheet layout (row → animation)

| Row | Animation | Frames | FPS | Play | What happens |
|---|---|---|---|---|---|
| 0 | `charge` | 5 | 4 | once | core dark → core glowing → bright muzzle → short beam → full beam stub, barrel pointing down |

Rows are read top to bottom; frames left to right starting at column 0. Unused cells stay transparent. The grid is defined in `assets/manifest.json` under `images.cannon_top_charge.sheet` – if your sheet ends up with a different grid, edit `cols` / `rows` / `frames` there instead of redrawing.

## GPT image prompt (copy–paste)

```text
Top-down Sector Cannon on its pedestal, same design and framing in every cell, the muzzle charging up and a cyan beam starting to fire downward.
Five cells, identical framing (pedestal circle fills each cell), barrel pointing down.
Art style: 2010s American TV superhero-cartoon look — clean, bold black ink outlines with varied line weight, flat cel-shaded colours with ONE hard-edged shadow tone and ONE small highlight per surface, slightly angular stylised shapes, saturated but grounded palette. No gradients except glows, no photorealism, no 3D render look, no text, no watermark, no signature.
SPRITE SHEET RULES: a strict grid of 5 columns × 1 rows, every cell exactly 256×256 px, character centred horizontally in every cell with the feet on one shared baseline at 92% of the cell height, identical scale, proportions, colours and lighting in every cell, no grid lines, no cell borders, no labels, fully transparent background (if transparency is unavailable use a solid flat #FF00FF magenta background).
ROWS (top to bottom): row 0: 'charge' – 5 frames – core dark → core glowing → bright muzzle → short beam → full beam stub, barrel pointing down.
Output size 1280×256 px, PNG with transparency.
```

### If the grid comes out wrong
Image models often miscount cells. Reliable fallback: generate **one row at a time** (one animation per image, `1 × N` cells, same cell size), then stack the rows into the full sheet. Always check the result in `tools/sheet-viewer.html` – the feet must sit on the same baseline in every frame.

## Checklist before dropping it in
- [ ] Transparent background where the spec says so (or flat `#FF00FF` → set `"chromaKey": "#FF00FF"` for this entry in `assets/manifest.json`).
- [ ] Exact canvas size; cells aligned to the grid, no borders.
- [ ] Outlines are crisp black ink, colours flat (no photoreal shading).
- [ ] Run `python3 tools/optimize_assets.py`, reload the game → the placeholder is replaced automatically. Use `tools/sheet-viewer.html` to preview the animation.

## Current manifest entry
```json
{
  "cannon_top_charge": {
    "path": "sprites/cannon_top_charge.webp",
    "sheet": {
      "cols": 5,
      "rows": 1,
      "anims": {
        "charge": {
          "row": 0,
          "frames": 5,
          "fps": 4,
          "loop": false
        }
      }
    }
  }
}
```
