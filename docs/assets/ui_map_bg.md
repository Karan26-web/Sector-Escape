# Map backdrop – painted jungle

| | |
|---|---|
| **Save as** | `assets/ui/map_bg.png` |
| **Type** | Single image (PNG-32 with alpha) |
| **Canvas size** | 1920 × 1080 px |
| **World scale** | — |
| **Priority** | P1 |
| **Manifest key** | `ui_map_bg` |

## Used for
Backdrop of the 2D expedition-route map (darkened and vignetted by the game; the route, rings and temple are drawn on top). Keep the left two-thirds calm: that is where the route snakes; the right third sits under the docked panel.

## Visual description
Top-down painted jungle at dusk: a winding river along the left side, large calm canopy masses in 2–3 dark greens with clear open clearings between them, a few ancient stone ruins, mist pooling in the low areas, moody teal-green palette (#142925 base). No markers, no text, no circles, no paths.

## GPT image prompt (copy–paste)

```text
Top-down painted jungle at dusk: a winding river along the left side, large calm canopy masses in 2–3 dark greens with clear open clearings between them, a few ancient stone ruins, mist pooling in the low areas, moody teal-green palette (#142925 base). No markers, no text, no circles, no paths.
Top-down 16:9 illustrated map, no text, no icons, low detail so a route can be drawn over it.
Art style: painterly cartoon background that matches a cel-shaded TV animation — bold readable shapes, soft brushwork, limited palette, atmospheric depth, dramatic but clean lighting. No text, no watermark.
Output size 1920×1080 px, PNG with transparency.
```

## Checklist before dropping it in
- [ ] Transparent background where the spec says so (or flat `#FF00FF` → set `"chromaKey": "#FF00FF"` for this entry in `assets/manifest.json`).
- [ ] Exact canvas size; subject fills the frame as described.
- [ ] Outlines are crisp black ink, colours flat (no photoreal shading).
- [ ] Run `python3 tools/optimize_assets.py`, reload the game → the placeholder is replaced automatically.
