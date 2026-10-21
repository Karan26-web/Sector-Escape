# Smoke puff

| | |
|---|---|
| **Save as** | `assets/sprites/fx_smoke.png` |
| **Type** | Single image (PNG-32 with alpha) |
| **Canvas size** | 256 × 256 px |
| **World scale** | 0.6–1.6 m |
| **Priority** | P2 |
| **Manifest key** | `fx_smoke` |

## Used for
Dust puffs when running, hatch opening, seal slamming, smoke after explosions.

## Visual description
A fluffy cartoon smoke puff silhouette in white with soft edges on a transparent background.

## GPT image prompt (copy–paste)

```text
A fluffy cartoon smoke puff silhouette in white with soft edges on a transparent background.
Centred, transparent, white only (tinted in-game).
Art style: 2010s American TV superhero-cartoon look — clean, bold black ink outlines with varied line weight, flat cel-shaded colours with ONE hard-edged shadow tone and ONE small highlight per surface, slightly angular stylised shapes, saturated but grounded palette. No gradients except glows, no photorealism, no 3D render look, no text, no watermark, no signature.
Output size 256×256 px, PNG with transparency.
```

## Checklist before dropping it in
- [ ] Transparent background where the spec says so (or flat `#FF00FF` → set `"chromaKey": "#FF00FF"` for this entry in `assets/manifest.json`).
- [ ] Exact canvas size; subject fills the frame as described.
- [ ] Outlines are crisp black ink, colours flat (no photoreal shading).
- [ ] Run `python3 tools/optimize_assets.py`, reload the game → the placeholder is replaced automatically.
