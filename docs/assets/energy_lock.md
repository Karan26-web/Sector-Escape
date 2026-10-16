# Energy lock glyph

| | |
|---|---|
| **Save as** | `assets/textures/energy_lock.png` |
| **Type** | Texture (PNG-32 with alpha) |
| **Canvas size** | 512 × 512 px |
| **World scale** | 3.5 m |
| **Priority** | P1 |
| **Manifest key** | `energy_lock` |

## Used for
Glowing red lock symbol floating on the exit gate; shatters when the perfect sector blast breaks the energy lock.

## Visual description
A glowing red-orange circular energy glyph: two concentric rings, 8 short radial spokes, and a pie-slice (sector) symbol in the centre, soft red glow halo, transparent background.

## GPT image prompt (copy–paste)

```text
A glowing red-orange circular energy glyph: two concentric rings, 8 short radial spokes, and a pie-slice (sector) symbol in the centre, soft red glow halo, transparent background.
Centred, symmetric, transparent background, additive-friendly (bright on transparent).
Art style: 2010s American TV superhero-cartoon look — clean, bold black ink outlines with varied line weight, flat cel-shaded colours with ONE hard-edged shadow tone and ONE small highlight per surface, slightly angular stylised shapes, saturated but grounded palette. No gradients except glows, no photorealism, no 3D render look, no text, no watermark, no signature.
Output size 512×512 px, PNG with transparency.
```

## Checklist before dropping it in
- [ ] Transparent background (or flat `#FF00FF` → set `"chromaKey": "#FF00FF"` for this entry in `assets/manifest.json`).
- [ ] Exact canvas size; subject fills the frame as described.
- [ ] Outlines are crisp black ink, colours flat (no photoreal shading).
- [ ] Reload the game → the placeholder is replaced automatically.
