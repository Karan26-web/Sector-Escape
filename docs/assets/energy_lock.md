# [RETIRED] Energy lock glyph

| | |
|---|---|
| **Save as** | `assets/textures/energy_lock.png` |
| **Type** | Texture (PNG-32 with alpha) |
| **Canvas size** | 512 × 512 px |
| **World scale** | — |
| **Priority** | P2 |
| **Manifest key** | `energy_lock` |

## Used for
No longer used by the game (there is no exit lock any more).

## Visual description
A glowing red-orange circular energy glyph with a pie-slice symbol.

## GPT image prompt (copy–paste)

```text
A glowing red-orange circular energy glyph with a pie-slice symbol.
Centred, symmetric, transparent background.
Art style: 2010s American TV superhero-cartoon look — clean, bold black ink outlines with varied line weight, flat cel-shaded colours with ONE hard-edged shadow tone and ONE small highlight per surface, slightly angular stylised shapes, saturated but grounded palette. No gradients except glows, no photorealism, no 3D render look, no text, no watermark, no signature.
Output size 512×512 px, PNG with transparency.
```

## Checklist before dropping it in
- [ ] Transparent background where the spec says so (or flat `#FF00FF` → set `"chromaKey": "#FF00FF"` for this entry in `assets/manifest.json`).
- [ ] Exact canvas size; subject fills the frame as described.
- [ ] Outlines are crisp black ink, colours flat (no photoreal shading).
- [ ] Run `python3 tools/optimize_assets.py`, reload the game → the placeholder is replaced automatically.
