# Cannon charge orbs (4 frames)

| | |
|---|---|
| **Save as** | `assets/sprites/cannon_orbs.png` |
| **Type** | Sprite sheet (PNG-32 with alpha) |
| **Canvas size** | 768 × 192 px |
| **Grid** | 4 columns × 1 rows · each cell 192 × 192 px |
| **World scale** | 0.9–3 m |
| **Priority** | P2 |
| **Manifest key** | `cannon_orbs` |

## Used for
Additive glow that grows at the muzzle during the charge (spark → full charge ring).

## Visual description
Cyan energy orbs with white-hot cores and soft halos, each larger and more energised than the last.

## Sheet layout (row → animation)

| Row | Animation | Frames | FPS | Play | What happens |
|---|---|---|---|---|---|
| 0 | `grow` | 4 | 3 | once | small spark, larger orb, bright orb with rays, orb inside a dashed energy ring |

Rows are read top to bottom; frames left to right starting at column 0. Unused cells stay transparent. The grid is defined in `assets/manifest.json` under `images.cannon_orbs.sheet` – if your sheet ends up with a different grid, edit `cols` / `rows` / `frames` there instead of redrawing.

## GPT image prompt (copy–paste)

```text
Cyan energy orbs with white-hot cores and soft halos, each larger and more energised than the last.
Four orbs, one per cell, centred, transparent background.
Art style: 2010s American TV superhero-cartoon look — clean, bold black ink outlines with varied line weight, flat cel-shaded colours with ONE hard-edged shadow tone and ONE small highlight per surface, slightly angular stylised shapes, saturated but grounded palette. No gradients except glows, no photorealism, no 3D render look, no text, no watermark, no signature.
SPRITE SHEET RULES: a strict grid of 4 columns × 1 rows, every cell exactly 192×192 px, character centred horizontally in every cell with the feet on one shared baseline at 92% of the cell height, identical scale, proportions, colours and lighting in every cell, no grid lines, no cell borders, no labels, fully transparent background (if transparency is unavailable use a solid flat #FF00FF magenta background).
ROWS (top to bottom): row 0: 'grow' – 4 frames – small spark, larger orb, bright orb with rays, orb inside a dashed energy ring.
Output size 768×192 px, PNG with transparency.
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
  "cannon_orbs": {
    "path": "sprites/cannon_orbs.webp",
    "sheet": {
      "cols": 4,
      "rows": 1,
      "anims": {
        "grow": {
          "row": 0,
          "frames": 4,
          "fps": 3,
          "loop": false
        }
      }
    }
  }
}
```
