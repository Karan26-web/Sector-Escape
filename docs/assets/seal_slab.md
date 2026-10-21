# Seal slab (trap closes behind Karan)

| | |
|---|---|
| **Save as** | `assets/textures/seal_slab.png` |
| **Type** | Texture (PNG-32 with alpha) |
| **Canvas size** | 1024 × 1024 px |
| **World scale** | ≈ 12 m × 6.5 m (stretched per junction) |
| **Priority** | P1 |
| **Manifest key** | `seal_slab` |

## Used for
The stone slab that rises out of the floor across the waist between two arenas after Karan passes (stretched to the width of the waist, 10–26 m).

## Visual description
Frontal view of a massive carved stone slab: fitted blocks, a big central glyph of two concentric red glowing rings with eight radial spokes and a red pie-slice (sector) symbol, scorch marks, ink outline border. Reads from far away.

## GPT image prompt (copy–paste)

```text
Frontal view of a massive carved stone slab: fitted blocks, a big central glyph of two concentric red glowing rings with eight radial spokes and a red pie-slice (sector) symbol, scorch marks, ink outline border. Reads from far away.
Flat frontal orthographic view, fills the whole canvas, no transparency.
Art style: 2010s American TV superhero-cartoon look — clean, bold black ink outlines with varied line weight, flat cel-shaded colours with ONE hard-edged shadow tone and ONE small highlight per surface, slightly angular stylised shapes, saturated but grounded palette. No gradients except glows, no photorealism, no 3D render look, no text, no watermark, no signature.
Output size 1024×1024 px, PNG.
```

## Checklist before dropping it in
- [ ] Transparent background where the spec says so (or flat `#FF00FF` → set `"chromaKey": "#FF00FF"` for this entry in `assets/manifest.json`).
- [ ] Exact canvas size; subject fills the frame as described.
- [ ] Outlines are crisp black ink, colours flat (no photoreal shading).
- [ ] Run `python3 tools/optimize_assets.py`, reload the game → the placeholder is replaced automatically.
