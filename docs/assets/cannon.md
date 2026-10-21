# Sector Laser Gun (pedestal)

| | |
|---|---|
| **Save as** | `assets/sprites/cannon.png` |
| **Type** | Single image (PNG-32 with alpha) |
| **Canvas size** | 1024 × 1024 px |
| **World scale** | 3.2 m tall |
| **Priority** | P0 |
| **Manifest key** | `cannon` |

## Used for
The ancient gun that rises from under the floor hatch at the centre of every arena. A billboard, so it must read well from any horizontal angle and from above.

## Visual description
An ancient stone-and-bronze pedestal: a round stepped stone base carved with a ring of glowing cyan glyphs, a dark metal column with two bronze prongs holding a large floating hexagonal CYAN crystal that emits light. Moss on the base. Radially symmetric. The crystal is the focal point.

## GPT image prompt (copy–paste)

```text
An ancient stone-and-bronze pedestal: a round stepped stone base carved with a ring of glowing cyan glyphs, a dark metal column with two bronze prongs holding a large floating hexagonal CYAN crystal that emits light. Moss on the base. Radially symmetric. The crystal is the focal point.
Single object, centred, slight high three-quarter view (camera ~25° above horizon), bottom of the base touching the bottom edge, transparent background.
Art style: 2010s American TV superhero-cartoon look — clean, bold black ink outlines with varied line weight, flat cel-shaded colours with ONE hard-edged shadow tone and ONE small highlight per surface, slightly angular stylised shapes, saturated but grounded palette. No gradients except glows, no photorealism, no 3D render look, no text, no watermark, no signature.
Output size 1024×1024 px, PNG with transparency.
```

## Checklist before dropping it in
- [ ] Transparent background where the spec says so (or flat `#FF00FF` → set `"chromaKey": "#FF00FF"` for this entry in `assets/manifest.json`).
- [ ] Exact canvas size; subject fills the frame as described.
- [ ] Outlines are crisp black ink, colours flat (no photoreal shading).
- [ ] Run `python3 tools/optimize_assets.py`, reload the game → the placeholder is replaced automatically.
