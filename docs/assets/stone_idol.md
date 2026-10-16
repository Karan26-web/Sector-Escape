# Stone idol statue

| | |
|---|---|
| **Save as** | `assets/sprites/stone_idol.png` |
| **Type** | Single image (PNG-32 with alpha) |
| **Canvas size** | 512 × 1024 px |
| **World scale** | 4 m tall |
| **Priority** | P1 |
| **Manifest key** | `stone_idol` |

## Used for
Two idols flank each arena entrance outside the wall.

## Visual description
A tall weathered jungle temple idol: a carved stone head/face with closed eyes and glowing cyan inlays, geometric Maya/Khmer-inspired patterns, cracks, moss and vines, standing on a square plinth.

## GPT image prompt (copy–paste)

```text
A tall weathered jungle temple idol: a carved stone head/face with closed eyes and glowing cyan inlays, geometric Maya/Khmer-inspired patterns, cracks, moss and vines, standing on a square plinth.
Front view, centred, plinth at the bottom edge.
Art style: 2010s American TV superhero-cartoon look — clean, bold black ink outlines with varied line weight, flat cel-shaded colours with ONE hard-edged shadow tone and ONE small highlight per surface, slightly angular stylised shapes, saturated but grounded palette. No gradients except glows, no photorealism, no 3D render look, no text, no watermark, no signature.
Output size 512×1024 px, PNG with transparency.
```

## Checklist before dropping it in
- [ ] Transparent background (or flat `#FF00FF` → set `"chromaKey": "#FF00FF"` for this entry in `assets/manifest.json`).
- [ ] Exact canvas size; subject fills the frame as described.
- [ ] Outlines are crisp black ink, colours flat (no photoreal shading).
- [ ] Reload the game → the placeholder is replaced automatically.
