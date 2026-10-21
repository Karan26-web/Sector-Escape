# Boss – The Sector Warden sprite sheet

| | |
|---|---|
| **Save as** | `assets/sprites/boss_warden.png` |
| **Type** | Sprite sheet (PNG-32 with alpha) |
| **Canvas size** | 4096 × 1536 px |
| **Grid** | 8 columns × 3 rows · each cell 512 × 512 px |
| **World scale** | 6.5 m tall |
| **Priority** | P1 |
| **Manifest key** | `boss_warden` |

## Used for
Final-arena guardian standing behind the last squad in the open arc; destroyed by the perfect blast.

## Visual description
Three-quarter FRONT view of the Sector Warden: a 6.5 m tall elite version of the Sector Sentinel — same skull faceplate but with two swept-back steel horns, deep PURPLE-violet armour with gold trim instead of green, a large AMBER-gold chest core, tattered dark cape, crackling violet energy between the shoulder plates; regal, ancient, terrifying.

## Sheet layout (row → animation)

| Row | Animation | Frames | FPS | Play | What happens |
|---|---|---|---|---|---|
| 0 | `idle` | 6 | 5 | loop | hovering slightly, cape drifting, arms crossed, eyes pulsing |
| 1 | `hurt` | 4 | 8 | once | staggers back, violet sparks, armour flash |
| 2 | `defeat` | 8 | 7 | once | shaking → core overloads (growing glow) → chain explosions → dissolves into smoke and embers |

Rows are read top to bottom; frames left to right starting at column 0. Unused cells stay transparent. The grid is defined in `assets/manifest.json` under `images.boss_warden.sheet` – if your sheet ends up with a different grid, edit `cols` / `rows` / `frames` there instead of redrawing.

## GPT image prompt (copy–paste)

```text
Three-quarter FRONT view of the Sector Warden: a 6.5 m tall elite version of the Sector Sentinel — same skull faceplate but with two swept-back steel horns, deep PURPLE-violet armour with gold trim instead of green, a large AMBER-gold chest core, tattered dark cape, crackling violet energy between the shoulder plates; regal, ancient, terrifying.
Three-quarter FRONT view, imposing low-angle feel.
Art style: 2010s American TV superhero-cartoon look — clean, bold black ink outlines with varied line weight, flat cel-shaded colours with ONE hard-edged shadow tone and ONE small highlight per surface, slightly angular stylised shapes, saturated but grounded palette. No gradients except glows, no photorealism, no 3D render look, no text, no watermark, no signature.
SPRITE SHEET RULES: a strict grid of 8 columns × 3 rows, every cell exactly 512×512 px, character centred horizontally in every cell with the feet on one shared baseline at 92% of the cell height, identical scale, proportions, colours and lighting in every cell, no grid lines, no cell borders, no labels, fully transparent background (if transparency is unavailable use a solid flat #FF00FF magenta background).
ROWS (top to bottom): row 0: 'idle' – 6 frames – hovering slightly, cape drifting, arms crossed, eyes pulsing | row 1: 'hurt' – 4 frames – staggers back, violet sparks, armour flash | row 2: 'defeat' – 8 frames – shaking → core overloads (growing glow) → chain explosions → dissolves into smoke and embers.
Output size 4096×1536 px, PNG with transparency.
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
  "boss_warden": {
    "path": "sprites/boss_warden.webp",
    "worldHeight": 6.5,
    "chromaKey": null,
    "sheet": {
      "cols": 8,
      "rows": 3,
      "anims": {
        "idle": {
          "row": 0,
          "frames": 6,
          "fps": 5
        },
        "hurt": {
          "row": 1,
          "frames": 4,
          "fps": 8,
          "loop": false
        },
        "defeat": {
          "row": 2,
          "frames": 8,
          "fps": 7,
          "loop": false
        }
      }
    },
    "baseline": 0.916
  }
}
```
