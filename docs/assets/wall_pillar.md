# Stone pillar (wall junction)

| | |
|---|---|
| **Save as** | `assets/sprites/wall_pillar.png` |
| **Type** | Single image (PNG-32 with alpha) |
| **Canvas size** | 256 × 1024 px |
| **World scale** | 7.2 m |
| **Priority** | P2 |
| **Manifest key** | `wall_pillar` |

## Used for
The carved columns where two arena walls meet. The game slices this art into capital / shaft / base bands (by the opaque width of each row) and wraps them around three stacked cylinders, so keep the capital and base clearly wider than the shaft.

## Visual description
A tall carved stone column with a wider cap and base, glyph bands, a small glowing cyan gem near the top, moss at the foot.

## GPT image prompt (copy–paste)

```text
A tall carved stone column with a wider cap and base, glyph bands, a small glowing cyan gem near the top, moss at the foot.
Front view, centred, base at the bottom edge, transparent background.
Art style: 2010s American TV superhero-cartoon look — clean, bold black ink outlines with varied line weight, flat cel-shaded colours with ONE hard-edged shadow tone and ONE small highlight per surface, slightly angular stylised shapes, saturated but grounded palette. No gradients except glows, no photorealism, no 3D render look, no text, no watermark, no signature.
Output size 256×1024 px, PNG with transparency.
```

## Checklist before dropping it in
- [ ] Transparent background where the spec says so (or flat `#FF00FF` → set `"chromaKey": "#FF00FF"` for this entry in `assets/manifest.json`).
- [ ] Exact canvas size; subject fills the frame as described.
- [ ] Outlines are crisp black ink, colours flat (no photoreal shading).
- [ ] Run `python3 tools/optimize_assets.py`, reload the game → the placeholder is replaced automatically.
