# Art Style Guide – Sector Escape: The Lost Jungle

This is the shared visual contract for every asset in [ASSET_INDEX.md](ASSET_INDEX.md). Paste the **Shared prompt block** below into every GPT image request, then add the asset-specific prompt from its spec sheet.

## 1. Direction in one paragraph
A 2010s American TV superhero cartoon, re-skinned as a jungle-temple adventure. Clean, confident **black ink outlines** (thicker on the silhouette, thinner inside), **flat cel colours** with exactly one hard-edged shadow tone and one small highlight, slightly angular stylised anatomy, saturated but grounded colour. Backgrounds are a little more painterly (soft brushwork, atmospheric depth) while characters and props stay crisp and flat. Everything must read instantly at small sizes: the game shows enemies as ~60 px tall figures in the tactical top view.

**Never:** photorealism, 3D-render look, soft airbrushed shading, gradients on characters (glows only), text, watermarks, grid lines on sprite sheets.

**IP note:** the enemy design is *inspired by* classic armoured robot henchmen but is an original design ("Sector Sentinel"). Do not name any franchise or character in prompts; the specs describe the look directly.

## 2. Palette
| Role | Hex | Notes |
|---|---|---|
| Ink / outline | `#15111A` | all outlines & drop shadows |
| Hero skin / shade | `#F0C59B` / `#CF9A6B` | |
| Hero hair / shade | `#5B3A1E` / `#3B240F` | spiky dark brown |
| Hero shirt / shade | `#2AA8B7` / `#1A7784` | teal |
| Hero shorts / boots | `#C8A56C` / `#6B4A2B` | khaki, brown |
| Backpack | `#7A5230` / `#4F3419` | |
| Sentinel armour / shade / highlight | `#3F5A3A` / `#273A26` / `#5F7F57` | dark olive green |
| Sentinel faceplate / shade | `#AAB1B9` / `#6B737C` | gunmetal silver |
| Sentinel eyes | `#FF2D2D` + red glow | angular slits |
| Sentinel chest core | `#EAF8FF` + cyan glow | round |
| Warden armour / trim / core | `#4A2D5C` / `#C7A24A` / `#FFE8A0` | purple, gold, amber |
| Temple stone / mortar | `#7E8A74` / `#2A2A22` | greenish grey |
| Moss / jungle greens | `#4A7A3A`, `#1F5A2D`, `#2B7A3A`, `#3F9A4A` | dark → light |
| Cannon crystal / laser | `#7FE6FF` (cyan), white core | |
| Over-charge excess / reflection | `#FF4FA0` → `#FF5A8A` | hot magenta |
| Energy lock | `#FF4A3A` | red |
| UI gold / orange / green | `#F5C518` / `#FF8A2A` / `#3FBF5A` | logo, FIRE, success |

## 3. Line & light rules
- Silhouette outline ≈ 3 % of the character height (6–8 px in a 256 px cell, 12–14 px in 512 px). Interior lines about half that.
- Key light from the **upper-left**; shadow tone is ~25 % darker and slightly cooler; one small highlight on hair/metal/crystal.
- Glows (eyes, core, crystal, laser) are the only soft gradients allowed.
- Metal gets a single sharp specular stripe, not a gradient.

## 4. Camera conventions
| Asset class | View |
|---|---|
| Characters (hero, sentinel, warden) | three-quarter front (turned ~20° left) or three-quarter back; eye-level |
| Props (cannon, idol, torch, trees, rubble) | front, camera ~25° above horizon |
| Floor / ground / path / wall-top textures | strictly top-down orthographic |
| Wall / gates / doors | strictly frontal orthographic |
| Panorama / sky / map / story art | painted, horizon at 55 % for the panorama |

## 5. Shared prompt block (paste into every request)
```text
Art style: 2010s American TV superhero-cartoon look — clean, bold black ink outlines with varied line weight, flat cel-shaded colours with ONE hard-edged shadow tone and ONE small highlight per surface, slightly angular stylised shapes, saturated but grounded palette. Key light from the upper-left. No gradients except glows, no photorealism, no 3D render look, no text, no watermark, no signature.
```
For backgrounds (panorama, map, story art, parchment, sky) use instead:
```text
Art style: painterly cartoon background matching a cel-shaded TV animation — bold readable shapes, soft brushwork, limited palette, atmospheric depth, dramatic but clean lighting. No text, no watermark.
```

## 6. Sprite-sheet rules
```text
SPRITE SHEET RULES: a strict grid of C columns × R rows, every cell exactly W×H px, character centred horizontally in every cell with the feet on one shared baseline at 92% of the cell height, identical scale, proportions, colours and lighting in every cell, no grid lines, no cell borders, no labels, fully transparent background (if transparency is unavailable use a solid flat #FF00FF magenta background).
```
- Rows = animations, columns = frames (left → right). Unused cells stay transparent.
- Image models miscount cells. The reliable workflow is **one row per generation** (e.g. `1 × 8` cells), then stack rows into the final sheet. Or generate single poses and assemble.
- Keep the **same seed/reference image** for all rows of one character so colours and proportions do not drift. Generate the `idle` row first and feed it back as the reference.
- If transparency failed, generate on flat `#FF00FF` and set `"chromaKey": "#FF00FF"` on that entry in `assets/manifest.json` (the loader keys it out at runtime).
- If your sheet has a different grid than the spec, do not redraw – edit `cols`, `rows`, `frames`, `fps` for that entry in `assets/manifest.json`.
- QA every sheet in `tools/sheet-viewer.html` (drop the PNG, pick the preset). Feet must not bounce between frames; the figure must not drift sideways.

## 7. Files & naming
Save at the exact path listed in each spec (`assets/sprites/…`, `assets/textures/…`, `assets/ui/…`). PNG-32 with alpha. The game reloads assets on refresh and silently falls back to the procedural placeholder for anything missing or mis-sized.

## 8. Quick production order (recommended)
1. `enemy_bot` → `hero_back` → `hero_front` (characters define the look)
2. `cannon`, `arena_floor`, `arena_wall`, gates (the arena)
3. `jungle_tree`, `jungle_panorama`, `ui_logo`
4. everything P1, then P2 only if desired
