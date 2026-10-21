# Canopy masses – 4 clustered tree groups (redesigned foliage)

| | |
|---|---|
| **Save as** | `assets/sprites/jungle_canopy.png` |
| **Type** | Sprite sheet (PNG-32 with alpha) |
| **Canvas size** | 2048 × 1024 px |
| **Grid** | 4 columns × 1 rows · each cell 512 × 1024 px |
| **World scale** | 10–14 m tall |
| **Priority** | P1 |
| **Manifest key** | `jungle_canopy` |

## Used for
Layer 2 of the redesigned jungle: hand-placed canopy masses that frame the rings and the causeway with gaps of open ground between them. One sprite replaces a 3–6 tree cluster (the game switches automatically when this file exists).

## Visual description
Clustered cartoon jungle canopies: 3–5 trees per cell merged into ONE strong unified silhouette, a single readable trunk group at the base, foliage painted in only 2–3 green values (deep #1f3d2b shadow, mid #3e6b3f, a restrained #6f9a52 highlight), very few small details, no individual leaf noise, a few hanging vines, no flowers. Calm, graphic shapes that read at small size and do not compete with the stone arenas.

## Sheet layout (row → animation)

| Row | Animation | Frames | FPS | Play | What happens |
|---|---|---|---|---|---|
| 0 | `variants a–d` | 4 | — | static | a: tall central tree flanked by two smaller ones; b: wide low mass of 4 crowns; c: palm-led group with a broad-leaf tree; d: vine-draped pair with a fern skirt |

Rows are read top to bottom; frames left to right starting at column 0. Unused cells stay transparent. The grid is defined in `assets/manifest.json` under `images.jungle_canopy.sheet` – if your sheet ends up with a different grid, edit `cols` / `rows` / `frames` there instead of redrawing.

## GPT image prompt (copy–paste)

```text
Clustered cartoon jungle canopies: 3–5 trees per cell merged into ONE strong unified silhouette, a single readable trunk group at the base, foliage painted in only 2–3 green values (deep #1f3d2b shadow, mid #3e6b3f, a restrained #6f9a52 highlight), very few small details, no individual leaf noise, a few hanging vines, no flowers. Calm, graphic shapes that read at small size and do not compete with the stone arenas.
Four separate canopy masses, one per cell, front view, trunk bases on one shared baseline at 96% of the cell height, transparent background.
Art style: 2010s American TV superhero-cartoon look — clean, bold black ink outlines with varied line weight, flat cel-shaded colours with ONE hard-edged shadow tone and ONE small highlight per surface, slightly angular stylised shapes, saturated but grounded palette. No gradients except glows, no photorealism, no 3D render look, no text, no watermark, no signature.
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
  "jungle_canopy": {
    "path": "sprites/jungle_canopy.webp",
    "worldHeight": 12,
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
    "baseline": 0.957
  }
}
```
