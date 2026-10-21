# Jungle ground – tileable

| | |
|---|---|
| **Save as** | `assets/textures/ground_jungle.png` |
| **Type** | Texture (PNG-32 with alpha) |
| **Canvas size** | 1024 × 1024 px |
| **World scale** | 12 m × 12 m per tile |
| **Priority** | P1 |
| **Manifest key** | `ground_jungle` |

## Used for
Ground plane outside the arenas (repeats many times — keep it low-contrast).

## Visual description
Top-down jungle floor: grass in two greens, patches of dark soil, small leaves and roots, subtle noise, no strong focal elements. Seamless in both directions.

## GPT image prompt (copy–paste)

```text
Top-down jungle floor: grass in two greens, patches of dark soil, small leaves and roots, subtle noise, no strong focal elements. Seamless in both directions.
Top-down orthographic, seamless tiling on all four edges, low contrast.
Art style: 2010s American TV superhero-cartoon look — clean, bold black ink outlines with varied line weight, flat cel-shaded colours with ONE hard-edged shadow tone and ONE small highlight per surface, slightly angular stylised shapes, saturated but grounded palette. No gradients except glows, no photorealism, no 3D render look, no text, no watermark, no signature.
Output size 1024×1024 px, PNG.
```

## Checklist before dropping it in
- [ ] Transparent background where the spec says so (or flat `#FF00FF` → set `"chromaKey": "#FF00FF"` for this entry in `assets/manifest.json`).
- [ ] Exact canvas size; subject fills the frame as described.
- [ ] Outlines are crisp black ink, colours flat (no photoreal shading).
- [ ] Run `python3 tools/optimize_assets.py`, reload the game → the placeholder is replaced automatically.
