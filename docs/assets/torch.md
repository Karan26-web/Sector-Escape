# Wall torch – flame flicker sheet

| | |
|---|---|
| **Save as** | `assets/sprites/torch.png` |
| **Type** | Sprite sheet (PNG-32 with alpha) |
| **Canvas size** | 512 × 256 px |
| **Grid** | 4 columns × 1 rows · each cell 128 × 256 px |
| **World scale** | 1.5 m tall |
| **Priority** | P0 |
| **Manifest key** | `torch` |

## Used for
Torches on the arena walls and on posts along the causeway (animated flame).

## Visual description
A wrought-iron wall bracket holding a wooden torch with a bright cartoon flame (orange outer, yellow middle, pale core) and a soft warm glow halo.

## Sheet layout (row → animation)

| Row | Animation | Frames | FPS | Play | What happens |
|---|---|---|---|---|---|
| 0 | `idle` | 4 | 9 | loop | flame flickers and sways left/right, slightly different height per frame |

Rows are read top to bottom; frames left to right starting at column 0. Unused cells stay transparent. The grid is defined in `assets/manifest.json` under `images.torch.sheet` – if your sheet ends up with a different grid, edit `cols` / `rows` / `frames` there instead of redrawing.

## GPT image prompt (copy–paste)

```text
A wrought-iron wall bracket holding a wooden torch with a bright cartoon flame (orange outer, yellow middle, pale core) and a soft warm glow halo.
Front view, torch centred in each cell.
Art style: 2010s American TV superhero-cartoon look — clean, bold black ink outlines with varied line weight, flat cel-shaded colours with ONE hard-edged shadow tone and ONE small highlight per surface, slightly angular stylised shapes, saturated but grounded palette. No gradients except glows, no photorealism, no 3D render look, no text, no watermark, no signature.
SPRITE SHEET RULES: a strict grid of 4 columns × 1 rows, every cell exactly 128×256 px, character centred horizontally in every cell with the feet on one shared baseline at 92% of the cell height, identical scale, proportions, colours and lighting in every cell, no grid lines, no cell borders, no labels, fully transparent background (if transparency is unavailable use a solid flat #FF00FF magenta background).
ROWS (top to bottom): row 0: 'idle' – 4 frames – flame flickers and sways left/right, slightly different height per frame.
Output size 512×256 px, PNG with transparency.
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
  "torch": {
    "path": "sprites/torch.webp",
    "worldHeight": 1.5,
    "sheet": {
      "cols": 4,
      "rows": 1,
      "anims": {
        "idle": {
          "row": 0,
          "frames": 4,
          "fps": 9
        }
      }
    }
  }
}
```
