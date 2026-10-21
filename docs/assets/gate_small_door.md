# Entrance gate – door leaf

| | |
|---|---|
| **Save as** | `assets/textures/gate_small_door.png` |
| **Type** | Texture (PNG-32 with alpha) |
| **Canvas size** | 512 × 1024 px |
| **World scale** | 2.8 m × 4.2 m |
| **Priority** | P0 |
| **Manifest key** | `gate_small_door` |

## Used for
The wooden door that slides down into the ground when Karan approaches and slams back up behind him.

## Visual description
Front view of a heavy wooden plank door with three dark iron bands and rivets, worn and scratched, slightly rounded top corners. Fills the whole image.

## GPT image prompt (copy–paste)

```text
Front view of a heavy wooden plank door with three dark iron bands and rivets, worn and scratched, slightly rounded top corners. Fills the whole image.
Flat frontal view, fills the full canvas, no background.
Art style: 2010s American TV superhero-cartoon look — clean, bold black ink outlines with varied line weight, flat cel-shaded colours with ONE hard-edged shadow tone and ONE small highlight per surface, slightly angular stylised shapes, saturated but grounded palette. No gradients except glows, no photorealism, no 3D render look, no text, no watermark, no signature.
Output size 512×1024 px, PNG.
```

## Checklist before dropping it in
- [ ] Transparent background where the spec says so (or flat `#FF00FF` → set `"chromaKey": "#FF00FF"` for this entry in `assets/manifest.json`).
- [ ] Exact canvas size; subject fills the frame as described.
- [ ] Outlines are crisp black ink, colours flat (no photoreal shading).
- [ ] Run `python3 tools/optimize_assets.py`, reload the game → the placeholder is replaced automatically.
