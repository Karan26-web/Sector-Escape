# Jungle trees – 4 variants

| | |
|---|---|
| **Save as** | `assets/sprites/jungle_tree.png` |
| **Type** | Sprite sheet (PNG-32 with alpha) |
| **Canvas size** | 2048 × 1024 px |
| **Grid** | 4 columns × 1 rows · each cell 512 × 1024 px |
| **World scale** | 7–12 m tall |
| **Priority** | P0 |
| **Manifest key** | `jungle_tree` |

## Used for
Billboard trees scattered outside the arenas and along the jungle paths.

## Visual description
Stylised jungle trees: thick dark trunks, layered rounded canopy masses in 3 greens (dark base, mid, light highlight), hanging vines, a few red/orange jungle flowers. Each tree fills its cell height, trunk base at the bottom centre.

## Sheet layout (row → animation)

| Row | Animation | Frames | FPS | Play | What happens |
|---|---|---|---|---|---|
| 0 | `variants a–d` | 4 | — | static | four different trees: broad canopy tree, tall palm-like tree, twisted vine-covered tree, dense bushy tree |

Rows are read top to bottom; frames left to right starting at column 0. Unused cells in a row stay empty (transparent). The grid is defined in `assets/manifest.json` under `images.jungle_tree.sheet` – if your generated sheet ends up with a different grid, edit `cols` / `rows` / `frames` there instead of redrawing.

## GPT image prompt (copy–paste)

```text
Stylised jungle trees: thick dark trunks, layered rounded canopy masses in 3 greens (dark base, mid, light highlight), hanging vines, a few red/orange jungle flowers. Each tree fills its cell height, trunk base at the bottom centre.
Four separate trees, one per cell, front view.
Art style: 2010s American TV superhero-cartoon look — clean, bold black ink outlines with varied line weight, flat cel-shaded colours with ONE hard-edged shadow tone and ONE small highlight per surface, slightly angular stylised shapes, saturated but grounded palette. No gradients except glows, no photorealism, no 3D render look, no text, no watermark, no signature.
SPRITE SHEET RULES: a strict grid of 4 columns × 1 rows, every cell exactly 512×1024 px, character centred horizontally in every cell with the feet on one shared baseline at 92% of the cell height, identical scale, proportions, colours and lighting in every cell, no grid lines, no cell borders, no labels, fully transparent background (if transparency is unavailable use a solid flat #FF00FF magenta background).
Output size 2048×1024 px, PNG with transparency.
```

## Checklist before dropping it in
- [ ] Transparent background (or flat `#FF00FF` → set `"chromaKey": "#FF00FF"` for this entry in `assets/manifest.json`).
- [ ] Exact canvas size; cells aligned to the grid, no borders.
- [ ] Outlines are crisp black ink, colours flat (no photoreal shading).
- [ ] Reload the game → the placeholder is replaced automatically. Use `tools/sheet-viewer.html` to preview the animation.

## Current manifest entry
```json
{
  "jungle_tree": {
    "path": "sprites/jungle_tree.png",
    "worldHeight": 9,
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
