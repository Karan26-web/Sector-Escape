# Floor hatch (buried gun cap)

| | |
|---|---|
| **Save as** | `assets/textures/floor_hatch.png` |
| **Type** | Texture (PNG-32 with alpha) |
| **Canvas size** | 512 × 512 px |
| **World scale** | 4.6 m diameter |
| **Priority** | P0 |
| **Manifest key** | `floor_hatch` |

## Used for
The round stone cap at the centre of every arena. It splits along the VERTICAL centre line into two halves that slide apart when Karan arrives, then the Sector Laser Gun rises from underneath.

## Visual description
Top-down round stone hatch: a rim of eight bolts, an inner ring of cyan glyph ticks, a small cyan sector (pie-slice) glyph at the centre, and one straight vertical seam line through the middle (the two halves). Alpha outside the circle. Must look natural lying flush on the arena_floor stone.

## GPT image prompt (copy–paste)

```text
Top-down round stone hatch: a rim of eight bolts, an inner ring of cyan glyph ticks, a small cyan sector (pie-slice) glyph at the centre, and one straight vertical seam line through the middle (the two halves). Alpha outside the circle. Must look natural lying flush on the arena_floor stone.
Perfectly top-down, circle touching all four edges, transparent corners, the seam exactly vertical through the centre.
Art style: 2010s American TV superhero-cartoon look — clean, bold black ink outlines with varied line weight, flat cel-shaded colours with ONE hard-edged shadow tone and ONE small highlight per surface, slightly angular stylised shapes, saturated but grounded palette. No gradients except glows, no photorealism, no 3D render look, no text, no watermark, no signature.
Output size 512×512 px, PNG with transparency.
```

## Checklist before dropping it in
- [ ] Transparent background where the spec says so (or flat `#FF00FF` → set `"chromaKey": "#FF00FF"` for this entry in `assets/manifest.json`).
- [ ] Exact canvas size; subject fills the frame as described.
- [ ] Outlines are crisp black ink, colours flat (no photoreal shading).
- [ ] Run `python3 tools/optimize_assets.py`, reload the game → the placeholder is replaced automatically.
