# Map arena nodes – 4 states

| | |
|---|---|
| **Save as** | `assets/ui/map_node.png` |
| **Type** | Sprite sheet (PNG-32 with alpha) |
| **Canvas size** | 1024 × 256 px |
| **Grid** | 4 columns × 1 rows · each cell 256 × 256 px |
| **World scale** | — |
| **Priority** | P1 |
| **Manifest key** | `ui_map_node` |

## Used for
Arena markers on the map.

## Visual description
Round stone medallion markers seen from above: a carved circular arena viewed top-down with a coloured glowing ring (grey, gold, green, red) and the state icon in the centre.

## Sheet layout (row → animation)

| Row | Animation | Frames | FPS | Play | What happens |
|---|---|---|---|---|---|
| 0 | `locked / open / cleared / boss` | 4 | — | static | cell 1 grey ring with a padlock; cell 2 golden ring with a cyan sector glyph; cell 3 green ring with a white check mark; cell 4 red ring with a horned robot skull |

Rows are read top to bottom; frames left to right starting at column 0. Unused cells in a row stay empty (transparent). The grid is defined in `assets/manifest.json` under `images.ui_map_node.sheet` – if your generated sheet ends up with a different grid, edit `cols` / `rows` / `frames` there instead of redrawing.

## GPT image prompt (copy–paste)

```text
Round stone medallion markers seen from above: a carved circular arena viewed top-down with a coloured glowing ring (grey, gold, green, red) and the state icon in the centre.
Four circular icons, one per cell, centred, transparent background.
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
  "ui_map_node": {
    "path": "ui/map_node.png",
    "sheet": {
      "cols": 4,
      "rows": 1,
      "anims": {
        "locked": {
          "col": 0,
          "frames": 1
        },
        "open": {
          "col": 1,
          "frames": 1
        },
        "cleared": {
          "col": 2,
          "frames": 1
        },
        "boss": {
          "col": 3,
          "frames": 1
        }
      }
    }
  }
}
```
