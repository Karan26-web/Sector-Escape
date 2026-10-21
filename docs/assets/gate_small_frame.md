# Entrance gate – stone frame

| | |
|---|---|
| **Save as** | `assets/textures/gate_small_frame.png` |
| **Type** | Texture (PNG-32 with alpha) |
| **Canvas size** | 1024 × 1024 px |
| **World scale** | ≈6 m × 6 m |
| **Priority** | P0 |
| **Manifest key** | `gate_small_frame` |

## Used for
The small entrance gate of arena 1 at the end of the causeway. The arched opening MUST be transparent: the door (separate asset) and the world are visible through it.

## Visual description
Front view of a square block of carved jungle-temple stonework containing an arched doorway. The arch opening is 46% of the image width, centred, from the bottom edge up to 70% of the image height; it is fully transparent. Ornate keystone, carved glyph columns on both sides, moss at the bottom.

## GPT image prompt (copy–paste)

```text
Front view of a square block of carved jungle-temple stonework containing an arched doorway. The arch opening is 46% of the image width, centred, from the bottom edge up to 70% of the image height; it is fully transparent. Ornate keystone, carved glyph columns on both sides, moss at the bottom.
Flat frontal view, transparent background INSIDE the arch and nowhere else.
Art style: 2010s American TV superhero-cartoon look — clean, bold black ink outlines with varied line weight, flat cel-shaded colours with ONE hard-edged shadow tone and ONE small highlight per surface, slightly angular stylised shapes, saturated but grounded palette. No gradients except glows, no photorealism, no 3D render look, no text, no watermark, no signature.
Output size 1024×1024 px, PNG with transparency.
```

## Checklist before dropping it in
- [ ] Transparent background where the spec says so (or flat `#FF00FF` → set `"chromaKey": "#FF00FF"` for this entry in `assets/manifest.json`).
- [ ] Exact canvas size; subject fills the frame as described.
- [ ] Outlines are crisp black ink, colours flat (no photoreal shading).
- [ ] Run `python3 tools/optimize_assets.py`, reload the game → the placeholder is replaced automatically.
