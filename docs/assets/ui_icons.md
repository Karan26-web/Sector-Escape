# HUD icon set

| | |
|---|---|
| **Save as** | `assets/ui/icons.png` |
| **Type** | Sprite sheet (PNG-32 with alpha) |
| **Canvas size** | 1024 × 128 px |
| **Grid** | 8 columns × 1 rows · each cell 128 × 128 px |
| **World scale** | — |
| **Priority** | P1 |
| **Manifest key** | `ui_icons` |

## Used for
HUD and results icons.

## Visual description
Chunky white glyph icons with thick black outlines (star is golden, empty star dark grey, bulb yellow).

## Sheet layout (row → animation)

| Row | Animation | Frames | FPS | Play | What happens |
|---|---|---|---|---|---|
| 0 | `timer, star, star-empty, hint-bulb, sound-on, sound-off, pause, play` | 8 | — | static | one icon per cell in that exact order |

Rows are read top to bottom; frames left to right starting at column 0. Unused cells in a row stay empty (transparent). The grid is defined in `assets/manifest.json` under `images.ui_icons.sheet` – if your generated sheet ends up with a different grid, edit `cols` / `rows` / `frames` there instead of redrawing.

## GPT image prompt (copy–paste)

```text
Chunky white glyph icons with thick black outlines (star is golden, empty star dark grey, bulb yellow).
Eight icons, one per cell, centred, transparent background, same stroke weight.
Art style: 2010s American TV superhero-cartoon look — clean, bold black ink outlines with varied line weight, flat cel-shaded colours with ONE hard-edged shadow tone and ONE small highlight per surface, slightly angular stylised shapes, saturated but grounded palette. No gradients except glows, no photorealism, no 3D render look, no text, no watermark, no signature.
SPRITE SHEET RULES: a strict grid of 8 columns × 1 rows, every cell exactly 128×128 px, character centred horizontally in every cell with the feet on one shared baseline at 92% of the cell height, identical scale, proportions, colours and lighting in every cell, no grid lines, no cell borders, no labels, fully transparent background (if transparency is unavailable use a solid flat #FF00FF magenta background).
Output size 1024×128 px, PNG with transparency.
```

## Checklist before dropping it in
- [ ] Transparent background (or flat `#FF00FF` → set `"chromaKey": "#FF00FF"` for this entry in `assets/manifest.json`).
- [ ] Exact canvas size; cells aligned to the grid, no borders.
- [ ] Outlines are crisp black ink, colours flat (no photoreal shading).
- [ ] Reload the game → the placeholder is replaced automatically. Use `tools/sheet-viewer.html` to preview the animation.

## Current manifest entry
```json
{
  "ui_icons": {
    "path": "ui/icons.png",
    "sheet": {
      "cols": 8,
      "rows": 1,
      "anims": {
        "timer": {
          "col": 0,
          "frames": 1
        },
        "star": {
          "col": 1,
          "frames": 1
        },
        "star_empty": {
          "col": 2,
          "frames": 1
        },
        "hint": {
          "col": 3,
          "frames": 1
        },
        "sound_on": {
          "col": 4,
          "frames": 1
        },
        "sound_off": {
          "col": 5,
          "frames": 1
        },
        "pause": {
          "col": 6,
          "frames": 1
        },
        "play": {
          "col": 7,
          "frames": 1
        }
      }
    }
  }
}
```
