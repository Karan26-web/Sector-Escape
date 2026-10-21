# Causeway parapet – tileable

| | |
|---|---|
| **Save as** | `assets/textures/causeway_side.png` |
| **Type** | Texture (PNG-32 with alpha) |
| **Canvas size** | 1024 × 256 px |
| **World scale** | 6 m × 1.5 m per tile |
| **Priority** | P1 |
| **Manifest key** | `causeway_side` |

## Used for
Side faces of the bridge parapets and the deck's underside (repeats horizontally).

## Visual description
Frontal view of a low stone balustrade: two rows of fitted blocks with a lighter capstone row on top, moss creeping up from the bottom, water stains. Seamless left↔right.

## GPT image prompt (copy–paste)

```text
Frontal view of a low stone balustrade: two rows of fitted blocks with a lighter capstone row on top, moss creeping up from the bottom, water stains. Seamless left↔right.
Flat frontal orthographic view, seamless horizontal tiling.
Art style: 2010s American TV superhero-cartoon look — clean, bold black ink outlines with varied line weight, flat cel-shaded colours with ONE hard-edged shadow tone and ONE small highlight per surface, slightly angular stylised shapes, saturated but grounded palette. No gradients except glows, no photorealism, no 3D render look, no text, no watermark, no signature.
Output size 1024×256 px, PNG.
```

## Checklist before dropping it in
- [ ] Transparent background where the spec says so (or flat `#FF00FF` → set `"chromaKey": "#FF00FF"` for this entry in `assets/manifest.json`).
- [ ] Exact canvas size; subject fills the frame as described.
- [ ] Outlines are crisp black ink, colours flat (no photoreal shading).
- [ ] Run `python3 tools/optimize_assets.py`, reload the game → the placeholder is replaced automatically.
