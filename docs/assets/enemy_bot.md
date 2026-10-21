# Enemy – Sector Sentinel sprite sheet

| | |
|---|---|
| **Save as** | `assets/sprites/enemy_bot.png` |
| **Type** | Sprite sheet (PNG-32 with alpha) |
| **Canvas size** | 2048 × 1024 px |
| **Grid** | 8 columns × 4 rows · each cell 256 × 256 px |
| **World scale** | 2.1 m tall |
| **Priority** | P0 |
| **Manifest key** | `enemy_bot` |

## Used for
Every guardian: stands in the open arc, notices Karan, marches toward the gun, lunges at him, explodes when hit by the laser.

## Visual description
Three-quarter FRONT view of a Sector Sentinel: sinister humanoid robot about 2 m tall, gunmetal-silver skull-like faceplate with a heavy brow ridge, two angular glowing RED eye slits, a rectangular dark mouth vent with three vertical slats, segmented steel neck, bulky shoulder pads, dark olive-GREEN riveted armour plates on torso/arms/legs, a round glowing WHITE-cyan power core in the centre of the chest, grey steel hands and boots. Menacing, military, slightly battered; original design (not a licensed character).

## Sheet layout (row → animation)

| Row | Animation | Frames | FPS | Play | What happens |
|---|---|---|---|---|---|
| 0 | `idle` | 4 | 5 | loop | menacing standing scan, head turns slightly, eye glow pulses |
| 1 | `walk` | 8 | 10 | loop | heavy stomping march toward the viewer, arms swinging, slight forward lean |
| 2 | `lunge` | 6 | 12 | once | crouch (2 frames) → leap with arms thrust forward (2) → extended flying pounce (2) |
| 3 | `death` | 8 | 14 | once | white flash → shake → armour cracks and plates fly off → bright explosion → smoke puff fading out |

Rows are read top to bottom; frames left to right starting at column 0. Unused cells stay transparent. The grid is defined in `assets/manifest.json` under `images.enemy_bot.sheet` – if your sheet ends up with a different grid, edit `cols` / `rows` / `frames` there instead of redrawing.

## GPT image prompt (copy–paste)

```text
Three-quarter FRONT view of a Sector Sentinel: sinister humanoid robot about 2 m tall, gunmetal-silver skull-like faceplate with a heavy brow ridge, two angular glowing RED eye slits, a rectangular dark mouth vent with three vertical slats, segmented steel neck, bulky shoulder pads, dark olive-GREEN riveted armour plates on torso/arms/legs, a round glowing WHITE-cyan power core in the centre of the chest, grey steel hands and boots. Menacing, military, slightly battered; original design (not a licensed character).
Three-quarter FRONT view, walking toward the viewer.
Art style: 2010s American TV superhero-cartoon look — clean, bold black ink outlines with varied line weight, flat cel-shaded colours with ONE hard-edged shadow tone and ONE small highlight per surface, slightly angular stylised shapes, saturated but grounded palette. No gradients except glows, no photorealism, no 3D render look, no text, no watermark, no signature.
SPRITE SHEET RULES: a strict grid of 8 columns × 4 rows, every cell exactly 256×256 px, character centred horizontally in every cell with the feet on one shared baseline at 92% of the cell height, identical scale, proportions, colours and lighting in every cell, no grid lines, no cell borders, no labels, fully transparent background (if transparency is unavailable use a solid flat #FF00FF magenta background).
ROWS (top to bottom): row 0: 'idle' – 4 frames – menacing standing scan, head turns slightly, eye glow pulses | row 1: 'walk' – 8 frames – heavy stomping march toward the viewer, arms swinging, slight forward lean | row 2: 'lunge' – 6 frames – crouch (2 frames) → leap with arms thrust forward (2) → extended flying pounce (2) | row 3: 'death' – 8 frames – white flash → shake → armour cracks and plates fly off → bright explosion → smoke puff fading out.
Output size 2048×1024 px, PNG with transparency.
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
  "enemy_bot": {
    "path": "sprites/enemy_bot.webp",
    "worldHeight": 2.1,
    "chromaKey": null,
    "sheet": {
      "cols": 8,
      "rows": 4,
      "anims": {
        "idle": {
          "row": 0,
          "frames": 4,
          "fps": 5
        },
        "walk": {
          "row": 1,
          "frames": 8,
          "fps": 10
        },
        "lunge": {
          "row": 2,
          "frames": 6,
          "fps": 12,
          "loop": false
        },
        "death": {
          "row": 3,
          "frames": 8,
          "fps": 14,
          "loop": false
        }
      }
    },
    "baseline": 0.91
  }
}
```
