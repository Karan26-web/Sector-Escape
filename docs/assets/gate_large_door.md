# [RETIRED] Exit gate – metal door leaf

| | |
|---|---|
| **Save as** | `assets/textures/gate_large_door.png` |
| **Type** | Texture (PNG-32 with alpha) |
| **Canvas size** | 1024 × 2048 px |
| **World scale** | — |
| **Priority** | P2 |
| **Manifest key** | `gate_large_door` |

## Used for
No longer used by the game (exit gates were replaced by open arcs).

## Visual description
Front view of a tall dark steel-and-bronze door leaf with five horizontal panels, rivets and faint engraved glyph lines.

## GPT image prompt (copy–paste)

```text
Front view of a tall dark steel-and-bronze door leaf with five horizontal panels, rivets and faint engraved glyph lines.
Flat frontal view, fills the full canvas.
Art style: 2010s American TV superhero-cartoon look — clean, bold black ink outlines with varied line weight, flat cel-shaded colours with ONE hard-edged shadow tone and ONE small highlight per surface, slightly angular stylised shapes, saturated but grounded palette. No gradients except glows, no photorealism, no 3D render look, no text, no watermark, no signature.
Output size 1024×2048 px, PNG.
```

## Checklist before dropping it in
- [ ] Transparent background where the spec says so (or flat `#FF00FF` → set `"chromaKey": "#FF00FF"` for this entry in `assets/manifest.json`).
- [ ] Exact canvas size; subject fills the frame as described.
- [ ] Outlines are crisp black ink, colours flat (no photoreal shading).
- [ ] Run `python3 tools/optimize_assets.py`, reload the game → the placeholder is replaced automatically.
