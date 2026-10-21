# Laser gradient

| | |
|---|---|
| **Save as** | `assets/sprites/fx_laser.png` |
| **Type** | Single image (PNG-32 with alpha) |
| **Canvas size** | 256 × 64 px |
| **World scale** | — |
| **Priority** | P2 |
| **Manifest key** | `fx_laser` |

## Used for
Optional gradient used by beam ribbons (the sector laser itself is a shader).

## Visual description
Horizontal white gradient: solid bright left fading to soft transparent right.

## GPT image prompt (copy–paste)

```text
Horizontal white gradient: solid bright left fading to soft transparent right.
Flat gradient strip.
Art style: 2010s American TV superhero-cartoon look — clean, bold black ink outlines with varied line weight, flat cel-shaded colours with ONE hard-edged shadow tone and ONE small highlight per surface, slightly angular stylised shapes, saturated but grounded palette. No gradients except glows, no photorealism, no 3D render look, no text, no watermark, no signature.
Output size 256×64 px, PNG with transparency.
```

## Checklist before dropping it in
- [ ] Transparent background where the spec says so (or flat `#FF00FF` → set `"chromaKey": "#FF00FF"` for this entry in `assets/manifest.json`).
- [ ] Exact canvas size; subject fills the frame as described.
- [ ] Outlines are crisp black ink, colours flat (no photoreal shading).
- [ ] Run `python3 tools/optimize_assets.py`, reload the game → the placeholder is replaced automatically.
