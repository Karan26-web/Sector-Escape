# Stone causeway deck – tileable strip

| | |
|---|---|
| **Save as** | `assets/textures/causeway_stone.png` |
| **Type** | Texture (PNG-32 with alpha) |
| **Canvas size** | 512 × 1024 px |
| **World scale** | 4.4 m wide × 8 m per tile |
| **Priority** | P0 |
| **Manifest key** | `causeway_stone` |

## Used for
The walking surface of the Temple-Run style bridge from the jungle to the first gate (repeats along its length) and the short path out of the temple gate.

## Visual description
Top-down view of large worn stone paving slabs in staggered rows, dark mortar, chipped corners, moss in the cracks, a faint carved line down the middle. The strip's long edges are slab edges (the parapets are separate). Seamless top↔bottom.

## GPT image prompt (copy–paste)

```text
Top-down view of large worn stone paving slabs in staggered rows, dark mortar, chipped corners, moss in the cracks, a faint carved line down the middle. The strip's long edges are slab edges (the parapets are separate). Seamless top↔bottom.
Top-down orthographic, seamless vertical tiling, path runs top to bottom, no border art.
Art style: 2010s American TV superhero-cartoon look — clean, bold black ink outlines with varied line weight, flat cel-shaded colours with ONE hard-edged shadow tone and ONE small highlight per surface, slightly angular stylised shapes, saturated but grounded palette. No gradients except glows, no photorealism, no 3D render look, no text, no watermark, no signature.
Output size 512×1024 px, PNG.
```

## Checklist before dropping it in
- [ ] Transparent background where the spec says so (or flat `#FF00FF` → set `"chromaKey": "#FF00FF"` for this entry in `assets/manifest.json`).
- [ ] Exact canvas size; subject fills the frame as described.
- [ ] Outlines are crisp black ink, colours flat (no photoreal shading).
- [ ] Run `python3 tools/optimize_assets.py`, reload the game → the placeholder is replaced automatically.
