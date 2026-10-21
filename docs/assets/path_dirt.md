# Dirt path – tileable strip

| | |
|---|---|
| **Save as** | `assets/textures/path_dirt.png` |
| **Type** | Texture (PNG-32 with alpha) |
| **Canvas size** | 512 × 1024 px |
| **World scale** | 4.2 m × 8 m per tile |
| **Priority** | P2 |
| **Manifest key** | `path_dirt` |

## Used for
Unused by the chain layout (the causeway and temple path use causeway_stone). Kept for set dressing.

## Visual description
Top-down worn dirt trail running vertically: packed brown earth in the middle, flat stepping stones, grass encroaching at both long edges. Seamless top↔bottom.

## GPT image prompt (copy–paste)

```text
Top-down worn dirt trail running vertically: packed brown earth in the middle, flat stepping stones, grass encroaching at both long edges. Seamless top↔bottom.
Top-down orthographic, seamless vertical tiling.
Art style: 2010s American TV superhero-cartoon look — clean, bold black ink outlines with varied line weight, flat cel-shaded colours with ONE hard-edged shadow tone and ONE small highlight per surface, slightly angular stylised shapes, saturated but grounded palette. No gradients except glows, no photorealism, no 3D render look, no text, no watermark, no signature.
Output size 512×1024 px, PNG.
```

## Checklist before dropping it in
- [ ] Transparent background where the spec says so (or flat `#FF00FF` → set `"chromaKey": "#FF00FF"` for this entry in `assets/manifest.json`).
- [ ] Exact canvas size; subject fills the frame as described.
- [ ] Outlines are crisp black ink, colours flat (no photoreal shading).
- [ ] Run `python3 tools/optimize_assets.py`, reload the game → the placeholder is replaced automatically.
