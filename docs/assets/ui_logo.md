# Game logo

| | |
|---|---|
| **Save as** | `assets/ui/logo.png` |
| **Type** | Single image (PNG-32 with alpha) |
| **Canvas size** | 1600 × 900 px |
| **World scale** | — |
| **Priority** | P0 |
| **Manifest key** | `ui_logo` |

## Used for
Title screen and loading screen.

## Visual description
Game logo: the words "SECTOR ESCAPE" in big chunky golden-yellow (top word) and orange (bottom word) comic lettering with thick black outlines and a drop shadow, a dark-green ribbon banner below reading "THE LOST JUNGLE" in white; behind the letters a cyan glowing ring with a highlighted pie-slice sector (the maths motif), framed by jungle leaves and small vines. Transparent background.

## GPT image prompt (copy–paste)

```text
Game logo: the words "SECTOR ESCAPE" in big chunky golden-yellow (top word) and orange (bottom word) comic lettering with thick black outlines and a drop shadow, a dark-green ribbon banner below reading "THE LOST JUNGLE" in white; behind the letters a cyan glowing ring with a highlighted pie-slice sector (the maths motif), framed by jungle leaves and small vines. Transparent background.
Centred composition, transparent background. The text must read exactly: SECTOR ESCAPE / THE LOST JUNGLE.
Art style: 2010s American TV superhero-cartoon look — clean, bold black ink outlines with varied line weight, flat cel-shaded colours with ONE hard-edged shadow tone and ONE small highlight per surface, slightly angular stylised shapes, saturated but grounded palette. No gradients except glows, no photorealism, no 3D render look, no text, no watermark, no signature.
Output size 1600×900 px, PNG with transparency.
```

## Checklist before dropping it in
- [ ] Transparent background (or flat `#FF00FF` → set `"chromaKey": "#FF00FF"` for this entry in `assets/manifest.json`).
- [ ] Exact canvas size; subject fills the frame as described.
- [ ] Outlines are crisp black ink, colours flat (no photoreal shading).
- [ ] Reload the game → the placeholder is replaced automatically.
