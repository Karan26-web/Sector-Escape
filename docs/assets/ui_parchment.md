# Story parchment panel

| | |
|---|---|
| **Save as** | `assets/ui/parchment.png` |
| **Type** | Single image (PNG-32 with alpha) |
| **Canvas size** | 1024 × 768 px |
| **World scale** | — |
| **Priority** | P1 |
| **Manifest key** | `ui_parchment` |

## Used for
Background of the story/introduction panel (text is rendered by the game on top).

## Visual description
An aged parchment sheet with torn uneven edges, subtle stains and fibre texture, slightly darker vignette, an empty area (no text!).

## GPT image prompt (copy–paste)

```text
An aged parchment sheet with torn uneven edges, subtle stains and fibre texture, slightly darker vignette, an empty area (no text!).
Flat, front view, fills the canvas, NO text.
Art style: painterly cartoon background that matches a cel-shaded TV animation — bold readable shapes, soft brushwork, limited palette, atmospheric depth, dramatic but clean lighting. No text, no watermark.
Output size 1024×768 px, PNG with transparency.
```

## Checklist before dropping it in
- [ ] Transparent background where the spec says so (or flat `#FF00FF` → set `"chromaKey": "#FF00FF"` for this entry in `assets/manifest.json`).
- [ ] Exact canvas size; subject fills the frame as described.
- [ ] Outlines are crisp black ink, colours flat (no photoreal shading).
- [ ] Run `python3 tools/optimize_assets.py`, reload the game → the placeholder is replaced automatically.
