# Glow sprite

| | |
|---|---|
| **Save as** | `assets/sprites/fx_glow.png` |
| **Type** | Single image (PNG-32 with alpha) |
| **Canvas size** | 256 × 256 px |
| **World scale** | varies |
| **Priority** | P2 |
| **Manifest key** | `fx_glow` |

## Used for
Cannon crystal glow, flashes, beam heads.

## Visual description
Soft round white radial gradient glow, fully transparent at the edges.

## GPT image prompt (copy–paste)

```text
Soft round white radial gradient glow, fully transparent at the edges.
Centred, transparent, white only.
Art style: 2010s American TV superhero-cartoon look — clean, bold black ink outlines with varied line weight, flat cel-shaded colours with ONE hard-edged shadow tone and ONE small highlight per surface, slightly angular stylised shapes, saturated but grounded palette. No gradients except glows, no photorealism, no 3D render look, no text, no watermark, no signature.
Output size 256×256 px, PNG with transparency.
```

## Checklist before dropping it in
- [ ] Transparent background (or flat `#FF00FF` → set `"chromaKey": "#FF00FF"` for this entry in `assets/manifest.json`).
- [ ] Exact canvas size; subject fills the frame as described.
- [ ] Outlines are crisp black ink, colours flat (no photoreal shading).
- [ ] Reload the game → the placeholder is replaced automatically.
