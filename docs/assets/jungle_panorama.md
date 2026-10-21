# Jungle backdrop – 360° panorama

| | |
|---|---|
| **Save as** | `assets/textures/jungle_panorama.png` |
| **Type** | Texture (PNG-32 with alpha) |
| **Canvas size** | 4096 × 1024 px |
| **World scale** | surrounds the chain at 250 m radius |
| **Priority** | P0 |
| **Manifest key** | `jungle_panorama` |

## Used for
Wrapped around the whole world as a cylinder: distant jungle, mist and ruins beyond the walls. Must tile left↔right.

## Visual description
Wide cylindrical panorama: hazy sky at the top third (tinted per arena), layers of distant jungle canopy getting darker toward the viewer, waterfalls, two or three ancient stone temple spires poking through the canopy, mist band along the bottom. Horizon line at 55% height.

## GPT image prompt (copy–paste)

```text
Wide cylindrical panorama: hazy sky at the top third (tinted per arena), layers of distant jungle canopy getting darker toward the viewer, waterfalls, two or three ancient stone temple spires poking through the canopy, mist band along the bottom. Horizon line at 55% height.
4:1 panoramic strip, seamless left↔right wrap, horizon at 55% from the top.
Art style: painterly cartoon background that matches a cel-shaded TV animation — bold readable shapes, soft brushwork, limited palette, atmospheric depth, dramatic but clean lighting. No text, no watermark.
Output size 4096×1024 px, PNG.
```

## Checklist before dropping it in
- [ ] Transparent background where the spec says so (or flat `#FF00FF` → set `"chromaKey": "#FF00FF"` for this entry in `assets/manifest.json`).
- [ ] Exact canvas size; subject fills the frame as described.
- [ ] Outlines are crisp black ink, colours flat (no photoreal shading).
- [ ] Run `python3 tools/optimize_assets.py`, reload the game → the placeholder is replaced automatically.
