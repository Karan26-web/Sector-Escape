# Story illustration (polaroid)

| | |
|---|---|
| **Save as** | `assets/ui/story_illustration.png` |
| **Type** | Single image (PNG-32 with alpha) |
| **Canvas size** | 800 × 600 px |
| **World scale** | — |
| **Priority** | P1 |
| **Manifest key** | `ui_story_art` |

## Used for
The photo pinned on the story parchment.

## Visual description
A painted jungle vista at sunrise: a chain of overlapping circular stone arenas half-hidden by canopy, a glowing cyan light rising from one centre, a lost temple on a far hill, mist, exotic birds.

## GPT image prompt (copy–paste)

```text
A painted jungle vista at sunrise: a chain of overlapping circular stone arenas half-hidden by canopy, a glowing cyan light rising from one centre, a lost temple on a far hill, mist, exotic birds.
Landscape 4:3 composition, no frame, no text.
Art style: painterly cartoon background that matches a cel-shaded TV animation — bold readable shapes, soft brushwork, limited palette, atmospheric depth, dramatic but clean lighting. No text, no watermark.
Output size 800×600 px, PNG with transparency.
```

## Checklist before dropping it in
- [ ] Transparent background where the spec says so (or flat `#FF00FF` → set `"chromaKey": "#FF00FF"` for this entry in `assets/manifest.json`).
- [ ] Exact canvas size; subject fills the frame as described.
- [ ] Outlines are crisp black ink, colours flat (no photoreal shading).
- [ ] Run `python3 tools/optimize_assets.py`, reload the game → the placeholder is replaced automatically.
