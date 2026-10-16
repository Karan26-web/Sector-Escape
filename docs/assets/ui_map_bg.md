# World map – jungle

| | |
|---|---|
| **Save as** | `assets/ui/map_bg.png` |
| **Type** | Single image (PNG-32 with alpha) |
| **Canvas size** | 1920 × 1080 px |
| **World scale** | — |
| **Priority** | P1 |
| **Manifest key** | `ui_map_bg` |

## Used for
Background of the level map. The game draws the dotted path, the 7 arena nodes, START (bottom-left) and DESTINATION (bottom-right) on top — leave those zones uncluttered.

## Visual description
Top-down painted jungle map: dense canopy textures in several greens, a winding river with small waterfalls, misty clearings, rocky outcrops, faint ancient ruins; brighter open ground along a diagonal band from bottom-left to top-centre to bottom-right where the path will run. No markers, no text, no circles.

## GPT image prompt (copy–paste)

```text
Top-down painted jungle map: dense canopy textures in several greens, a winding river with small waterfalls, misty clearings, rocky outcrops, faint ancient ruins; brighter open ground along a diagonal band from bottom-left to top-centre to bottom-right where the path will run. No markers, no text, no circles.
Top-down 16:9 illustrated map, no text, no icons.
Art style: painterly cartoon background that matches a cel-shaded TV animation — bold readable shapes, soft brushwork, limited palette, atmospheric depth, dramatic but clean lighting. No text, no watermark.
Output size 1920×1080 px, PNG with transparency.
```

## Checklist before dropping it in
- [ ] Transparent background (or flat `#FF00FF` → set `"chromaKey": "#FF00FF"` for this entry in `assets/manifest.json`).
- [ ] Exact canvas size; subject fills the frame as described.
- [ ] Outlines are crisp black ink, colours flat (no photoreal shading).
- [ ] Reload the game → the placeholder is replaced automatically.
