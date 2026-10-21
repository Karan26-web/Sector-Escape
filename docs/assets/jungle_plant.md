# Jungle plants – 4 variants

| | |
|---|---|
| **Save as** | `assets/sprites/jungle_plant.png` |
| **Type** | Sprite sheet (PNG-32 with alpha) |
| **Canvas size** | 2048 × 512 px |
| **Grid** | 4 columns × 1 rows · each cell 512 × 512 px |
| **World scale** | 1.2–2.3 m tall |
| **Priority** | P1 |
| **Manifest key** | `jungle_plant` |

## Used for
Ferns and bushes at the foot of the walls and along the causeway banks.

## Visual description
Cartoon jungle undergrowth: big fronds and leaves in layered greens with bold outlines, one variant with bright pink/orange flowers.

## Sheet layout (row → animation)

| Row | Animation | Frames | FPS | Play | What happens |
|---|---|---|---|---|---|
| 0 | `variants a–d` | 4 | — | static | fern, broad-leaf plant, flowering bush, grass tuft |

Rows are read top to bottom; frames left to right starting at column 0. Unused cells stay transparent. The grid is defined in `assets/manifest.json` under `images.jungle_plant.sheet` – if your sheet ends up with a different grid, edit `cols` / `rows` / `frames` there instead of redrawing.

## GPT image prompt (copy–paste)

```text
Cartoon jungle undergrowth: big fronds and leaves in layered greens with bold outlines, one variant with bright pink/orange flowers.
Four separate plants, one per cell, front view, base at the bottom.
Art style: 2010s American TV superhero-cartoon look — clean, bold black ink outlines with varied line weight, flat cel-shaded colours with ONE hard-edged shadow tone and ONE small highlight per surface, slightly angular stylised shapes, saturated but grounded palette. No gradients except glows, no photorealism, no 3D render look, no text, no watermark, no signature.
SPRITE SHEET RULES: a strict grid of 4 columns × 1 rows, every cell exactly 512×512 px, character centred horizontally in every cell with the feet on one shared baseline at 92% of the cell height, identical scale, proportions, colours and lighting in every cell, no grid lines, no cell borders, no labels, fully transparent background (if transparency is unavailable use a solid flat #FF00FF magenta background).
Output size 2048×512 px, PNG with transparency.
```

## Checklist before dropping it in
- [ ] Transparent background where the spec says so (or flat `#FF00FF` → set `"chromaKey": "#FF00FF"` for this entry in `assets/manifest.json`).
- [ ] Exact canvas size; cells aligned to the grid, no borders.
- [ ] Outlines are crisp black ink, colours flat (no photoreal shading).
- [ ] Run `python3 tools/optimize_assets.py`, reload the game → the placeholder is replaced automatically. Use `tools/sheet-viewer.html` to preview the animation.

## Current manifest entry
```json
{
  "jungle_plant": {
    "path": "sprites/jungle_plant.webp",
    "worldHeight": 1.6,
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
    },
    "baseline": 0.916
  }
}
```
