# Sector Cannon – top-down view (puzzle mode)

| | |
|---|---|
| **Save as** | `assets/sprites/cannon_top.png` |
| **Type** | Single image (PNG-32 with alpha) |
| **Canvas size** | 512 × 512 px |
| **World scale** | 5.3 m |
| **Priority** | P0 |
| **Manifest key** | `cannon_top` |

## Used for
Lies flat on the risen drum in the top-down puzzle view, rotated so the barrel points at the open arc. Barrel must point DOWN in the image.

## Visual description
Perfectly top-down view of the Sector Cannon on its circular pedestal: crystal crown at the top, barrel running down the middle ending in a glowing cyan muzzle near the bottom, bronze ring with four cyan gem blocks, cyan light arcs, moss.

## GPT image prompt (copy–paste)

```text
Perfectly top-down view of the Sector Cannon on its circular pedestal: crystal crown at the top, barrel running down the middle ending in a glowing cyan muzzle near the bottom, bronze ring with four cyan gem blocks, cyan light arcs, moss.
Top-down orthographic, circle centred and touching all edges, barrel pointing straight down, transparent background.
Art style: 2010s American TV superhero-cartoon look — clean, bold black ink outlines with varied line weight, flat cel-shaded colours with ONE hard-edged shadow tone and ONE small highlight per surface, slightly angular stylised shapes, saturated but grounded palette. No gradients except glows, no photorealism, no 3D render look, no text, no watermark, no signature.
Output size 512×512 px, PNG with transparency.
```

## Checklist before dropping it in
- [ ] Transparent background where the spec says so (or flat `#FF00FF` → set `"chromaKey": "#FF00FF"` for this entry in `assets/manifest.json`).
- [ ] Exact canvas size; subject fills the frame as described.
- [ ] Outlines are crisp black ink, colours flat (no photoreal shading).
- [ ] Run `python3 tools/optimize_assets.py`, reload the game → the placeholder is replaced automatically.
