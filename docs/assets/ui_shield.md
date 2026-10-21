# HUD shields – full / empty

| | |
|---|---|
| **Save as** | `assets/ui/shield.png` |
| **Type** | Sprite sheet (PNG-32 with alpha) |
| **Canvas size** | 256 × 128 px |
| **Grid** | 2 columns × 1 rows · each cell 128 × 128 px |
| **World scale** | — |
| **Priority** | P1 |
| **Manifest key** | `ui_shield` |

## Used for
Health indicator (3 shields).

## Visual description
Comic-style shield icons with thick outlines.

## Sheet layout (row → animation)

| Row | Animation | Frames | FPS | Play | What happens |
|---|---|---|---|---|---|
| 0 | `full / empty` | 2 | — | static | cell 1 glossy bright blue shield with a cyan glow; cell 2 dark cracked grey shield |

Rows are read top to bottom; frames left to right starting at column 0. Unused cells stay transparent. The grid is defined in `assets/manifest.json` under `images.ui_shield.sheet` – if your sheet ends up with a different grid, edit `cols` / `rows` / `frames` there instead of redrawing.

## GPT image prompt (copy–paste)

```text
Comic-style shield icons with thick outlines.
Two icons, one per cell, centred, transparent background.
Art style: 2010s American TV superhero-cartoon look — clean, bold black ink outlines with varied line weight, flat cel-shaded colours with ONE hard-edged shadow tone and ONE small highlight per surface, slightly angular stylised shapes, saturated but grounded palette. No gradients except glows, no photorealism, no 3D render look, no text, no watermark, no signature.
SPRITE SHEET RULES: a strict grid of 2 columns × 1 rows, every cell exactly 128×128 px, character centred horizontally in every cell with the feet on one shared baseline at 92% of the cell height, identical scale, proportions, colours and lighting in every cell, no grid lines, no cell borders, no labels, fully transparent background (if transparency is unavailable use a solid flat #FF00FF magenta background).
Output size 256×128 px, PNG with transparency.
```

## Checklist before dropping it in
- [ ] Transparent background where the spec says so (or flat `#FF00FF` → set `"chromaKey": "#FF00FF"` for this entry in `assets/manifest.json`).
- [ ] Exact canvas size; cells aligned to the grid, no borders.
- [ ] Outlines are crisp black ink, colours flat (no photoreal shading).
- [ ] Run `python3 tools/optimize_assets.py`, reload the game → the placeholder is replaced automatically. Use `tools/sheet-viewer.html` to preview the animation.

## Current manifest entry
```json
{
  "ui_shield": {
    "path": "ui/shield.webp",
    "sheet": {
      "cols": 2,
      "rows": 1,
      "anims": {
        "full": {
          "col": 0,
          "frames": 1
        },
        "empty": {
          "col": 1,
          "frames": 1
        }
      }
    }
  }
}
```
