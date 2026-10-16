# Arena floor (top-down circle)

| | |
|---|---|
| **Save as** | `assets/textures/arena_floor.png` |
| **Type** | Texture (PNG-32 with alpha) |
| **Canvas size** | 2048 × 2048 px |
| **World scale** | scaled to each arena's radius (7–35 m) |
| **Priority** | P0 |
| **Manifest key** | `arena_floor` |

## Used for
The circular stone floor of every arena, seen mostly from the tactical top view. The circle must touch the image edges; everything outside the circle transparent.

## Visual description
Top-down view of an ancient circular stone battle floor: concentric rings of fitted stone blocks (7 rings), radial seams every 15°, a round carved medallion in the centre with a cyan glyph circle, cracks, scattered moss, darker outer rim ring. Flat, evenly lit, no perspective, no cast shadows.

## GPT image prompt (copy–paste)

```text
Top-down view of an ancient circular stone battle floor: concentric rings of fitted stone blocks (7 rings), radial seams every 15°, a round carved medallion in the centre with a cyan glyph circle, cracks, scattered moss, darker outer rim ring. Flat, evenly lit, no perspective, no cast shadows.
Perfectly top-down orthographic view, circle centred and touching all four edges, transparent corners.
Art style: 2010s American TV superhero-cartoon look — clean, bold black ink outlines with varied line weight, flat cel-shaded colours with ONE hard-edged shadow tone and ONE small highlight per surface, slightly angular stylised shapes, saturated but grounded palette. No gradients except glows, no photorealism, no 3D render look, no text, no watermark, no signature.
Output size 2048×2048 px, PNG with transparency.
```

## Checklist before dropping it in
- [ ] Transparent background (or flat `#FF00FF` → set `"chromaKey": "#FF00FF"` for this entry in `assets/manifest.json`).
- [ ] Exact canvas size; subject fills the frame as described.
- [ ] Outlines are crisp black ink, colours flat (no photoreal shading).
- [ ] Reload the game → the placeholder is replaced automatically.
