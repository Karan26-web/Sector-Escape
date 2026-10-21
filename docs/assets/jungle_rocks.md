# Jungle boulders – 4 variants

| | |
|---|---|
| **Save as** | `assets/sprites/jungle_rocks.png` |
| **Type** | Sprite sheet (PNG-32 with alpha) |
| **Canvas size** | 2048 × 512 px |
| **Grid** | 4 columns × 1 rows · each cell 512 × 512 px |
| **World scale** | 1.1–2.6 m |
| **Priority** | P0 |
| **Manifest key** | `jungle_rocks` |

## Used for
Rocks that hug every arena wall and line both banks of the causeway so Karan feels hemmed in (instanced, hundreds on screen).

## Visual description
Chunky cartoon jungle boulders in grey-green stone with bold ink outlines, one hard shadow side, moss patches and a few vines; each sits on a little base of dirt and grass so it reads as grounded.

## Sheet layout (row → animation)

| Row | Animation | Frames | FPS | Play | What happens |
|---|---|---|---|---|---|
| 0 | `variants a–d` | 4 | — | static | low wide boulder, tall cracked boulder, mossy boulder pair, flat slab with a carved glyph |

Rows are read top to bottom; frames left to right starting at column 0. Unused cells stay transparent. The grid is defined in `assets/manifest.json` under `images.jungle_rocks.sheet` – if your sheet ends up with a different grid, edit `cols` / `rows` / `frames` there instead of redrawing.

## GPT image prompt (copy–paste)

```text
Chunky cartoon jungle boulders in grey-green stone with bold ink outlines, one hard shadow side, moss patches and a few vines; each sits on a little base of dirt and grass so it reads as grounded.
Four separate rocks, one per cell, front view from slightly above, base at the bottom of the cell.
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
  "jungle_rocks": {
    "path": "sprites/jungle_rocks.webp",
    "worldHeight": 1.8,
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
    "baseline": 0.917
  }
}
```
