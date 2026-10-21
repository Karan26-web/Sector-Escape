# Sector Cannon – 3/4 view (arena shots)

| | |
|---|---|
| **Save as** | `assets/sprites/cannon.png` |
| **Type** | Single image (PNG-32 with alpha) |
| **Canvas size** | 336 × 305 px |
| **World scale** | 1.8 m tall in the low 3/4 shots (≈ 2 m wide; the painted pedestal stands on a 3 m stone drum). Keep the pedestal ellipse drawn at ~30° (height ≈ half its width) with its centre ~25 % of the image height above the bottom edge: the game grounds the card using those proportions |
| **Priority** | P0 |
| **Manifest key** | `cannon` |

## Used for
The cannon rising out of the floor hatch and being activated (low 3/4 camera). The game crossfades to cannon_top when the camera goes top-down.

## Visual description
The upright ancient Sector Cannon on its round stone-and-bronze pedestal: tall hexagonal cyan crystal crown, two curved bronze wing plates, a glowing cyan core column, a cyan light ring set into the pedestal, a cyan gem plate on the front step, moss on the stones. Seen from the front, camera ~30° above horizon.

## GPT image prompt (copy–paste)

```text
The upright ancient Sector Cannon on its round stone-and-bronze pedestal: tall hexagonal cyan crystal crown, two curved bronze wing plates, a glowing cyan core column, a cyan light ring set into the pedestal, a cyan gem plate on the front step, moss on the stones. Seen from the front, camera ~30° above horizon.
Single object, centred, pedestal base touching the bottom edge, transparent background. (Current file was cut from the newCanon2 asset sheet.)
Art style: 2010s American TV superhero-cartoon look — clean, bold black ink outlines with varied line weight, flat cel-shaded colours with ONE hard-edged shadow tone and ONE small highlight per surface, slightly angular stylised shapes, saturated but grounded palette. No gradients except glows, no photorealism, no 3D render look, no text, no watermark, no signature.
Output size 336×305 px, PNG with transparency.
```

## Checklist before dropping it in
- [ ] Transparent background where the spec says so (or flat `#FF00FF` → set `"chromaKey": "#FF00FF"` for this entry in `assets/manifest.json`).
- [ ] Exact canvas size; subject fills the frame as described.
- [ ] Outlines are crisp black ink, colours flat (no photoreal shading).
- [ ] Run `python3 tools/optimize_assets.py`, reload the game → the placeholder is replaced automatically.
