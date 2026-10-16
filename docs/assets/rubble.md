# Breach rubble – 4 piles

| | |
|---|---|
| **Save as** | `assets/sprites/rubble.png` |
| **Type** | Sprite sheet (PNG-32 with alpha) |
| **Canvas size** | 1024 × 256 px |
| **Grid** | 4 columns × 1 rows · each cell 256 × 256 px |
| **World scale** | 0.6–1.1 m |
| **Priority** | P1 |
| **Manifest key** | `rubble` |

## Used for
Small rubble piles left on the floor where a wall section collapsed (breach).

## Visual description
Chunks of broken carved stone wall (same stone as the arena wall) in small piles with dust, a few glowing cyan glyph fragments.

## Sheet layout (row → animation)

| Row | Animation | Frames | FPS | Play | What happens |
|---|---|---|---|---|---|
| 0 | `variants a–d` | 4 | — | static | four rubble piles of different shapes |

Rows are read top to bottom; frames left to right starting at column 0. Unused cells in a row stay empty (transparent). The grid is defined in `assets/manifest.json` under `images.rubble.sheet` – if your generated sheet ends up with a different grid, edit `cols` / `rows` / `frames` there instead of redrawing.

## GPT image prompt (copy–paste)

```text
Chunks of broken carved stone wall (same stone as the arena wall) in small piles with dust, a few glowing cyan glyph fragments.
Four piles, one per cell, slight high angle, bottom aligned.
Art style: 2010s American TV superhero-cartoon look — clean, bold black ink outlines with varied line weight, flat cel-shaded colours with ONE hard-edged shadow tone and ONE small highlight per surface, slightly angular stylised shapes, saturated but grounded palette. No gradients except glows, no photorealism, no 3D render look, no text, no watermark, no signature.
SPRITE SHEET RULES: a strict grid of 4 columns × 1 rows, every cell exactly 256×256 px, character centred horizontally in every cell with the feet on one shared baseline at 92% of the cell height, identical scale, proportions, colours and lighting in every cell, no grid lines, no cell borders, no labels, fully transparent background (if transparency is unavailable use a solid flat #FF00FF magenta background).
Output size 1024×256 px, PNG with transparency.
```

## Checklist before dropping it in
- [ ] Transparent background (or flat `#FF00FF` → set `"chromaKey": "#FF00FF"` for this entry in `assets/manifest.json`).
- [ ] Exact canvas size; cells aligned to the grid, no borders.
- [ ] Outlines are crisp black ink, colours flat (no photoreal shading).
- [ ] Reload the game → the placeholder is replaced automatically. Use `tools/sheet-viewer.html` to preview the animation.

## Current manifest entry
```json
{
  "rubble": {
    "path": "sprites/rubble.png",
    "worldHeight": 1.2,
    "sheet": {
      "cols": 4,
      "rows": 1,
      "anims": {
        "a": {
          "col": 0,
          "frames": 1
        },
        "b": {
          "col": 1,
          "frames": 1
        },
        "c": {
          "col": 2,
          "frames": 1
        },
        "d": {
          "col": 3,
          "frames": 1
        }
      }
    }
  }
}
```
