# Spark particle

| | |
|---|---|
| **Save as** | `assets/sprites/fx_spark.png` |
| **Type** | Single image (PNG-32 with alpha) |
| **Canvas size** | 128 × 128 px |
| **World scale** | 0.3 m |
| **Priority** | P2 |
| **Manifest key** | `fx_spark` |

## Used for
Additive spark particles.

## Visual description
A soft white radial glow dot with a bright core on a transparent background.

## GPT image prompt (copy–paste)

```text
A soft white radial glow dot with a bright core on a transparent background.
Centred, transparent, white only (the game tints it).
Art style: 2010s American TV superhero-cartoon look — clean, bold black ink outlines with varied line weight, flat cel-shaded colours with ONE hard-edged shadow tone and ONE small highlight per surface, slightly angular stylised shapes, saturated but grounded palette. No gradients except glows, no photorealism, no 3D render look, no text, no watermark, no signature.
Output size 128×128 px, PNG with transparency.
```

## Checklist before dropping it in
- [ ] Transparent background (or flat `#FF00FF` → set `"chromaKey": "#FF00FF"` for this entry in `assets/manifest.json`).
- [ ] Exact canvas size; subject fills the frame as described.
- [ ] Outlines are crisp black ink, colours flat (no photoreal shading).
- [ ] Reload the game → the placeholder is replaced automatically.
