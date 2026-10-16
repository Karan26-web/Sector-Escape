# Hero – Front sprite sheet

| | |
|---|---|
| **Save as** | `assets/sprites/hero_front.png` |
| **Type** | Sprite sheet (PNG-32 with alpha) |
| **Canvas size** | 2048 × 1280 px |
| **Grid** | 8 columns × 5 rows · each cell 256 × 256 px |
| **World scale** | 1.75 m tall |
| **Priority** | P0 |
| **Manifest key** | `hero_front` |

## Used for
The player character whenever they face the camera (idle at the cannon, hurt, victory, activating the cannon).

## Visual description
Front/three-quarter-front view of the Explorer (working name: Karan, 11–12 years old, gender-neutral read): short spiky dark-brown hair, warm tan skin, big friendly eyes, teal short-sleeve t-shirt, khaki cargo shorts, brown lace-up hiking boots, small brown canvas backpack with two straps, a thin leather bracelet; cheerful determined expression.

## Sheet layout (row → animation)

| Row | Animation | Frames | FPS | Play | What happens |
|---|---|---|---|---|---|
| 0 | `idle` | 6 | 6 | loop | relaxed stance, subtle breathing bob, slight arm sway |
| 1 | `run` | 8 | 13 | loop | full run cycle, strong arm swing, 2 contact + 2 passing poses, hair bounce |
| 2 | `activate` | 6 | 10 | once | reaches forward and slams a palm onto the cannon's crystal, then holds the pose |
| 3 | `hurt` | 4 | 10 | once | knocked back, arms up, eyes shut, pain flash – last frame recovering |
| 4 | `win` | 6 | 8 | loop | jump for joy, both fists in the air, big grin |

Rows are read top to bottom; frames left to right starting at column 0. Unused cells in a row stay empty (transparent). The grid is defined in `assets/manifest.json` under `images.hero_front.sheet` – if your generated sheet ends up with a different grid, edit `cols` / `rows` / `frames` there instead of redrawing.

## GPT image prompt (copy–paste)

```text
Front/three-quarter-front view of the Explorer (working name: Karan, 11–12 years old, gender-neutral read): short spiky dark-brown hair, warm tan skin, big friendly eyes, teal short-sleeve t-shirt, khaki cargo shorts, brown lace-up hiking boots, small brown canvas backpack with two straps, a thin leather bracelet; cheerful determined expression.
Three-quarter FRONT view (facing the viewer, turned ~20° to the left).
Art style: 2010s American TV superhero-cartoon look — clean, bold black ink outlines with varied line weight, flat cel-shaded colours with ONE hard-edged shadow tone and ONE small highlight per surface, slightly angular stylised shapes, saturated but grounded palette. No gradients except glows, no photorealism, no 3D render look, no text, no watermark, no signature.
SPRITE SHEET RULES: a strict grid of 8 columns × 5 rows, every cell exactly 256×256 px, character centred horizontally in every cell with the feet on one shared baseline at 92% of the cell height, identical scale, proportions, colours and lighting in every cell, no grid lines, no cell borders, no labels, fully transparent background (if transparency is unavailable use a solid flat #FF00FF magenta background).
ROWS (top to bottom): row 0: 'idle' – 6 frames – relaxed stance, subtle breathing bob, slight arm sway | row 1: 'run' – 8 frames – full run cycle, strong arm swing, 2 contact + 2 passing poses, hair bounce | row 2: 'activate' – 6 frames – reaches forward and slams a palm onto the cannon's crystal, then holds the pose | row 3: 'hurt' – 4 frames – knocked back, arms up, eyes shut, pain flash – last frame recovering | row 4: 'win' – 6 frames – jump for joy, both fists in the air, big grin.
Output size 2048×1280 px, PNG with transparency.
```

### If the grid comes out wrong
Image models often miscount cells. Reliable fallback: generate **one row at a time** (one animation per image, `1 × N` cells, same cell size), then stack the rows into the full sheet with any sprite packer or an image editor. Alternatively generate single poses and assemble. Always check the result in `tools/sheet-viewer.html` (choose the preset for this asset) – the feet must sit on the same baseline in every frame or the character will bounce.

## Checklist before dropping it in
- [ ] Transparent background (or flat `#FF00FF` → set `"chromaKey": "#FF00FF"` for this entry in `assets/manifest.json`).
- [ ] Exact canvas size; cells aligned to the grid, no borders.
- [ ] Outlines are crisp black ink, colours flat (no photoreal shading).
- [ ] Reload the game → the placeholder is replaced automatically. Use `tools/sheet-viewer.html` to preview the animation.

## Current manifest entry
```json
{
  "hero_front": {
    "path": "sprites/hero_front.png",
    "worldHeight": 1.75,
    "chromaKey": null,
    "sheet": {
      "cols": 8,
      "rows": 5,
      "anims": {
        "idle": {
          "row": 0,
          "frames": 6,
          "fps": 6
        },
        "run": {
          "row": 1,
          "frames": 8,
          "fps": 13
        },
        "activate": {
          "row": 2,
          "frames": 6,
          "fps": 10,
          "loop": false
        },
        "hurt": {
          "row": 3,
          "frames": 4,
          "fps": 10,
          "loop": false
        },
        "win": {
          "row": 4,
          "frames": 6,
          "fps": 8
        }
      }
    }
  }
}
```
