# Sector Escape – The Lost Jungle

A 2.5D math adventure that teaches **Area of a Sector of a Circle** — `A = (θ/360) × πr²` (π = 22/7, NCERT convention).
A stone causeway over water leads Karan into a maze of seven **overlapping circular arenas**. In each ring the far arc is already open but the guardians stand in it; Karan runs to the centre, the **Sector Laser Gun** rises from under a hatch, scans the arc, and the entered sector area sets the width of the blast: too small and the survivors pounce, too large and the excess reflects off the solid wall, exact (**PERFECT SECTOR**) and every guardian falls — Karan runs through the open arc straight into the next ring and the trap seals behind him, until the temple gate.

Built with vanilla ES modules, HTML/CSS UI, fully procedural Web Audio sound and the open-source Three.js rendering library (one vendored, minified file). No game engine, no framework, **no build step**. The whole deployable folder is about 7 MB, 5.3 MB of which is WebP art.

## Run it
Modules need an HTTP server (file:// will not work):
```bash
cd "Sector Escape"
python3 -m http.server 8321        # or: npx serve .
# open http://localhost:8321/
```
Every asset is optional: anything missing in `assets/` is drawn procedurally, so the game is playable immediately and upgrades itself as art lands. (Expect harmless 404s in the console for missing PNGs.)

## Controls
| Action | Input |
|---|---|
| Move the hero | **WASD / arrows**, or **tap / click** the floor |
| Enter the answer | type, or the on-screen keypad (digits, `.`, `/`, `π`). Fractions like `616/4` and answers in terms of π like `49π`, `50pi`, `100π/2` are accepted |
| FIRE | **Enter** or the FIRE button |
| Hint | 💡 button (reveals formula → substituted values → worked steps) |
| Keypad | ⌨ button toggles the on-screen keypad (on by default on phones and tablets) |
| Mute / Pause | **M** / **Esc** or HUD buttons |
| Skip the causeway | "Tap to skip" pill |

## URL parameters (dev / QA)
`?level=5` start at arena 5 · `?skip=1` skip the causeway · `?auto=1` hero auto-runs to the cannon · `?mute=1` · `?reset=1` wipe saved progress.
Console API: `__se.phase`, `__se.fire('154')`, `__se.hint()`, `__se.scene`.

## Project layout
```
index.html, styles/main.css        shell + theme
src/main.js                        boot, title → story → map → arenas → ending
src/game/levels.js                 the LXD's 7-arena table, chain geometry solver (CHAIN), answer evaluation, diagnosis, hints, scoring
src/game/chain.js                  the whole world: causeway over water, gate, overlapping rings with open arcs, hatches, seals, temple, instanced jungle
src/game/arenaScene.js             one ring: causeway/entry → sealed in → noticed → run → hatch & gun → tactical → scan → input → fire → through the arc
src/game/cannon.js                 buried gun that rises, scan overlays (θ, r), sector-laser shader, reflections, pulse
src/engine/instancedSprites.js     thousands of billboards in one draw call (trees, plants, rocks)
src/game/bots.js, hero.js, boss.js entities
src/engine/*                       world/renderer, camera rig, sprites, assets (+chroma key), tweens, labels, fx, audio
src/placeholders/*                 procedural placeholder art
src/ui/ui.js                       screens, HUD, cannon panel, map
assets/manifest.json               every asset + sprite-sheet grid definitions
docs/                              GDD (with LXD rationale), STYLE_GUIDE, ASSET_INDEX + one spec per asset, SFX_SPEC
tools/sheet-viewer.html            preview/QA sprite sheets, view all placeholders (#gallery)
tools/gen_asset_docs.py            regenerates docs/ASSET_INDEX.md + docs/assets/*.md
tools/optimize_assets.py           PNG → WebP + manifest update
playtest/*.py                      Playwright playtests (screenshots in playtest/screens/)
```

## Asset pipeline (for the GPT-generated art)
All generated art is installed under `assets/` as **WebP** (36 of 37 assets; `gate_large_frame` still uses the small frame as a fallback). The original PNG zips, alternates and the concept sheet live outside the project in `../Sector Escape - art source/` so they never ship.

**Adding or replacing art:** save the PNG at the path in its spec, then run `python3 tools/optimize_assets.py` — it converts every PNG under `assets/` to WebP (lossy colour at q82–90, lossless alpha), rewrites the paths in `assets/manifest.json` and removes the PNGs. The loader also accepts a `.png` where the manifest says `.webp` (and vice versa), so an un-optimised drop-in still works.
1. Open `docs/ASSET_INDEX.md`, pick an asset, open its spec (one `.md` per asset with the copy-paste prompt, size, grid and animation rows).
2. Generate it following `docs/STYLE_GUIDE.md`. For sprite sheets prefer one row per generation and stack.
3. Save at the exact `assets/...` path. If the background is not transparent, generate on flat `#FF00FF` and set `"chromaKey": "#FF00FF"` on that entry in `assets/manifest.json`.
4. Check sheets in `tools/sheet-viewer.html`; adjust `cols/rows/frames/fps` in the manifest if your grid differs.
5. Reload the game.

## Deploy to Vercel
There is no build step; the folder is a static site with `index.html` as the entry point.
- **Dashboard:** vercel.com → *Add New → Project*. Either import the Git repo or drag & drop this folder. Framework preset **Other**, Build Command **empty**, Output Directory **default** (the root).
- **CLI:** `npx vercel` inside the folder (accept the defaults), then `npx vercel --prod` for the production URL.

`vercel.json` adds cache headers (the vendored Three.js is immutable; art under `assets/` revalidates hourly so new files show up quickly). `.vercelignore` keeps the playtest screenshots and Python scripts out of the upload. New art dropped into `assets/` only needs a redeploy.

## Playtesting
```bash
python3 playtest/smoke_chain.py       # title → overview → causeway → arena 1 (under / over / perfect) → through the arc → arena 2
python3 playtest/chain_full.py        # arenas 6–7, the Warden, temple finale + results, game over / retry / quit, mobile
```
Requires Python Playwright with Chromium (`pip3 install playwright && python3 -m playwright install chromium`). Screenshots are written to `playtest/screens/`.

## Design docs
- `docs/GDD.md` — game design + learning design (LXD) rationale, the chain geometry, level table, feedback matrix, scoring.
- `docs/NEW_ASSETS.md` — prompts for the optional foliage redesign sheets (canopy masses, distant silhouettes) and the map backdrop.
- `docs/ANSWER_KEY.md` — answers per arena for testers.
- `docs/STYLE_GUIDE.md` — art direction, palette, shared prompt block, sprite-sheet rules.
- `docs/ASSET_INDEX.md` → `docs/assets/*.md` — every asset to produce.
- `docs/sfx/SFX_SPEC.md` — every sound cue, music modes, how to override.
