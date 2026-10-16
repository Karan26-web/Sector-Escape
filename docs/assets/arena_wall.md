# Arena wall – tileable stone

| | |
|---|---|
| **Save as** | `assets/textures/arena_wall.png` |
| **Type** | Texture (PNG-32 with alpha) |
| **Canvas size** | 1024 × 1024 px |
| **World scale** | 7 m × 7 m per tile |
| **Priority** | P0 |
| **Manifest key** | `arena_wall` |

## Used for
Inner and outer faces of the circular arena wall; one tile spans the full wall height (≈7 m) and repeats horizontally.

## Visual description
Front-facing ancient jungle temple wall: large fitted stone blocks in 6 rows with offset joints, a carved glyph band at 1/3 height, deep ink mortar lines, moss creeping up from the bottom third, a few hanging vines, slight darkening toward the bottom. MUST tile seamlessly left↔right.

## GPT image prompt (copy–paste)

```text
Front-facing ancient jungle temple wall: large fitted stone blocks in 6 rows with offset joints, a carved glyph band at 1/3 height, deep ink mortar lines, moss creeping up from the bottom third, a few hanging vines, slight darkening toward the bottom. MUST tile seamlessly left↔right.
Flat frontal orthographic view, seamless horizontal tiling, even lighting.
Art style: 2010s American TV superhero-cartoon look — clean, bold black ink outlines with varied line weight, flat cel-shaded colours with ONE hard-edged shadow tone and ONE small highlight per surface, slightly angular stylised shapes, saturated but grounded palette. No gradients except glows, no photorealism, no 3D render look, no text, no watermark, no signature.
Output size 1024×1024 px, PNG.
```

## Checklist before dropping it in
- [ ] Transparent background (or flat `#FF00FF` → set `"chromaKey": "#FF00FF"` for this entry in `assets/manifest.json`).
- [ ] Exact canvas size; subject fills the frame as described.
- [ ] Outlines are crisp black ink, colours flat (no photoreal shading).
- [ ] Reload the game → the placeholder is replaced automatically.
