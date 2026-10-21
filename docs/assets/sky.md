# Sky gradient with clouds

| | |
|---|---|
| **Save as** | `assets/textures/sky.png` |
| **Type** | Texture (PNG-32 with alpha) |
| **Canvas size** | 1024 × 512 px |
| **World scale** | dome |
| **Priority** | P2 |
| **Manifest key** | `sky` |

## Used for
Sky dome texture (tinted for day/dusk/night/storm as Karan moves through the chain).

## Visual description
Soft blue sky gradient (deep blue top → pale horizon) with a few cartoon cumulus clouds, flat painted style.

## GPT image prompt (copy–paste)

```text
Soft blue sky gradient (deep blue top → pale horizon) with a few cartoon cumulus clouds, flat painted style.
Flat horizontal strip, seamless left↔right.
Art style: painterly cartoon background that matches a cel-shaded TV animation — bold readable shapes, soft brushwork, limited palette, atmospheric depth, dramatic but clean lighting. No text, no watermark.
Output size 1024×512 px, PNG.
```

## Checklist before dropping it in
- [ ] Transparent background where the spec says so (or flat `#FF00FF` → set `"chromaKey": "#FF00FF"` for this entry in `assets/manifest.json`).
- [ ] Exact canvas size; subject fills the frame as described.
- [ ] Outlines are crisp black ink, colours flat (no photoreal shading).
- [ ] Run `python3 tools/optimize_assets.py`, reload the game → the placeholder is replaced automatically.
