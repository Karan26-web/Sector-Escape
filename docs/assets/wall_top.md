# Wall top rim – tileable

| | |
|---|---|
| **Save as** | `assets/textures/wall_top.png` |
| **Type** | Texture (PNG-32 with alpha) |
| **Canvas size** | 512 × 128 px |
| **World scale** | 4 m × 1 m |
| **Priority** | P2 |
| **Manifest key** | `wall_top` |

## Used for
The flat top of the arena wall (seen from the tactical view).

## Visual description
Top-down strip of dark grey-green capstones with mortar lines, seamless left↔right.

## GPT image prompt (copy–paste)

```text
Top-down strip of dark grey-green capstones with mortar lines, seamless left↔right.
Top-down, seamless horizontal tiling.
Art style: 2010s American TV superhero-cartoon look — clean, bold black ink outlines with varied line weight, flat cel-shaded colours with ONE hard-edged shadow tone and ONE small highlight per surface, slightly angular stylised shapes, saturated but grounded palette. No gradients except glows, no photorealism, no 3D render look, no text, no watermark, no signature.
Output size 512×128 px, PNG.
```

## Checklist before dropping it in
- [ ] Transparent background (or flat `#FF00FF` → set `"chromaKey": "#FF00FF"` for this entry in `assets/manifest.json`).
- [ ] Exact canvas size; subject fills the frame as described.
- [ ] Outlines are crisp black ink, colours flat (no photoreal shading).
- [ ] Reload the game → the placeholder is replaced automatically.
