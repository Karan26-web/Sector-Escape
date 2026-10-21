# Distant forest silhouettes – 4 variants (redesigned foliage)

| | |
|---|---|
| **Save as** | `assets/sprites/forest_silhouette.png` |
| **Type** | Sprite sheet (PNG-32 with alpha) |
| **Canvas size** | 2048 × 1024 px |
| **Grid** | 4 columns × 1 rows · each cell 512 × 1024 px |
| **World scale** | 16–22 m tall |
| **Priority** | P2 |
| **Manifest key** | `forest_silhouette` |

## Used for
Layer 1 of the redesigned jungle: tall dark silhouettes far beyond the rings that give depth without detail (the game switches automatically when this file exists).

## Visual description
Soft, atmospheric distant jungle tree clumps: dark desaturated green-blue (#1d3330 to #2c4a40) flat silhouettes with only a faint lighter rim on the upper-left edges, almost no interior detail, slightly hazy edges, tall and narrow so they read as a far tree line.

## Sheet layout (row → animation)

| Row | Animation | Frames | FPS | Play | What happens |
|---|---|---|---|---|---|
| 0 | `variants a–d` | 4 | — | static | four tall tree-line clumps of different outlines |

Rows are read top to bottom; frames left to right starting at column 0. Unused cells stay transparent. The grid is defined in `assets/manifest.json` under `images.forest_silhouette.sheet` – if your sheet ends up with a different grid, edit `cols` / `rows` / `frames` there instead of redrawing.

## GPT image prompt (copy–paste)

```text
Soft, atmospheric distant jungle tree clumps: dark desaturated green-blue (#1d3330 to #2c4a40) flat silhouettes with only a faint lighter rim on the upper-left edges, almost no interior detail, slightly hazy edges, tall and narrow so they read as a far tree line.
Four separate silhouettes, one per cell, front view, bases on one shared baseline at 98% of the cell height, transparent background.
Art style: painterly cartoon background that matches a cel-shaded TV animation — bold readable shapes, soft brushwork, limited palette, atmospheric depth, dramatic but clean lighting. No text, no watermark.
SPRITE SHEET RULES: a strict grid of 4 columns × 1 rows, every cell exactly 512×1024 px, character centred horizontally in every cell with the feet on one shared baseline at 92% of the cell height, identical scale, proportions, colours and lighting in every cell, no grid lines, no cell borders, no labels, fully transparent background (if transparency is unavailable use a solid flat #FF00FF magenta background).
Output size 2048×1024 px, PNG with transparency.
```

## Checklist before dropping it in
- [ ] Transparent background where the spec says so (or flat `#FF00FF` → set `"chromaKey": "#FF00FF"` for this entry in `assets/manifest.json`).
- [ ] Exact canvas size; cells aligned to the grid, no borders.
- [ ] Outlines are crisp black ink, colours flat (no photoreal shading).
- [ ] Run `python3 tools/optimize_assets.py`, reload the game → the placeholder is replaced automatically. Use `tools/sheet-viewer.html` to preview the animation.

## Current manifest entry
```json
{
  "forest_silhouette": {
    "path": "sprites/forest_silhouette.webp",
    "worldHeight": 18,
    "fallback": "jungle_tree",
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
    "baseline": 0.968
  }
}
```
