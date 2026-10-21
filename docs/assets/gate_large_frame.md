# Temple gate – ornate stone frame

| | |
|---|---|
| **Save as** | `assets/textures/gate_large_frame.png` |
| **Type** | Texture (PNG-32 with alpha) |
| **Canvas size** | 2048 × 2048 px |
| **World scale** | ≈9.8 m × 9.8 m |
| **Priority** | P0 |
| **Manifest key** | `gate_large_frame` |

## Used for
The final temple gate at the end of the chain (the escape). The arched opening MUST be transparent.

## Visual description
Front view of a grand square block of ancient stonework with a tall arched doorway. Opening is 56% of the width, centred, from the bottom edge up to 78% of the height, fully transparent. A golden sun-disc keystone, carved sector/pie-slice motifs in the stone, two carved guardian faces, vines.

## GPT image prompt (copy–paste)

```text
Front view of a grand square block of ancient stonework with a tall arched doorway. Opening is 56% of the width, centred, from the bottom edge up to 78% of the height, fully transparent. A golden sun-disc keystone, carved sector/pie-slice motifs in the stone, two carved guardian faces, vines.
Flat frontal view, transparent background INSIDE the arch only.
Art style: 2010s American TV superhero-cartoon look — clean, bold black ink outlines with varied line weight, flat cel-shaded colours with ONE hard-edged shadow tone and ONE small highlight per surface, slightly angular stylised shapes, saturated but grounded palette. No gradients except glows, no photorealism, no 3D render look, no text, no watermark, no signature.
Output size 2048×2048 px, PNG with transparency.
```

## Checklist before dropping it in
- [ ] Transparent background where the spec says so (or flat `#FF00FF` → set `"chromaKey": "#FF00FF"` for this entry in `assets/manifest.json`).
- [ ] Exact canvas size; subject fills the frame as described.
- [ ] Outlines are crisp black ink, colours flat (no photoreal shading).
- [ ] Run `python3 tools/optimize_assets.py`, reload the game → the placeholder is replaced automatically.
