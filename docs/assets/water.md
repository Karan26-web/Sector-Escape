# Jungle water – tileable

| | |
|---|---|
| **Save as** | `assets/textures/water.png` |
| **Type** | Texture (PNG-32 with alpha) |
| **Canvas size** | 512 × 512 px |
| **World scale** | 9 m × 9 m per tile |
| **Priority** | P0 |
| **Manifest key** | `water` |

## Used for
The lake under the stone causeway (two scrolling layers: base + additive shimmer).

## Visual description
Top-down cartoon jungle water: teal-green base with soft darker depths, bright cyan caustic ribbons and a few sun sparkles, painted flat (no photoreal foam). Seamless on all four edges.

## GPT image prompt (copy–paste)

```text
Top-down cartoon jungle water: teal-green base with soft darker depths, bright cyan caustic ribbons and a few sun sparkles, painted flat (no photoreal foam). Seamless on all four edges.
Top-down orthographic, seamless tiling on all edges, no shoreline, no objects.
Art style: painterly cartoon background that matches a cel-shaded TV animation — bold readable shapes, soft brushwork, limited palette, atmospheric depth, dramatic but clean lighting. No text, no watermark.
Output size 512×512 px, PNG.
```

## Checklist before dropping it in
- [ ] Transparent background where the spec says so (or flat `#FF00FF` → set `"chromaKey": "#FF00FF"` for this entry in `assets/manifest.json`).
- [ ] Exact canvas size; subject fills the frame as described.
- [ ] Outlines are crisp black ink, colours flat (no photoreal shading).
- [ ] Run `python3 tools/optimize_assets.py`, reload the game → the placeholder is replaced automatically.
