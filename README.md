# Sector Escape – The Lost Jungle

A 2.5D math adventure that teaches **Area of a Sector of a Circle** — `A = (θ/360) × πr²` (π = 22/7, NCERT convention).
Trapped in a jungle of circular arenas, you run to the ancient **Sector Cannon**, read the radius and central angle straight off the battlefield, and charge the cannon with the **exact** sector area: too small and guardians survive and pounce, too large and the excess energy reflects off the wall and hits you; exact and every guardian is destroyed and the exit unlocks.

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
| Mute / Pause | **M** / **Esc** or HUD buttons |
| Skip cutscene | "Tap to skip" pill |

## URL parameters (dev / QA)
`?level=5` jump straight into arena 5 · `?variant=2` pick that arena's third problem set · `?skip=1` skip the approach cutscene · `?auto=1` hero auto-runs to the cannon · `?mute=1` · `?reset=1` wipe saved progress.
Console API: `__se.phase`, `__se.fire('154')`, `__se.hint()`, `__se.scene`.

## Project layout
```
index.html, styles/main.css        shell + theme
src/main.js                        boot, title → story → map → arenas → ending
src/game/levels.js                 7 arenas, answer evaluation, misconception diagnosis, hints, scoring
src/game/arenaScene.js             the arena state machine (approach → alert → run → tactical → input → fire → outcome → exit)
src/game/arena.js                  circular wall w/ openable breach segments, gates, torches, energy lock, jungle
src/game/cannon.js                 beacon, scan overlays (θ, r), sector-laser shader, reflections, pulse
src/game/bots.js, hero.js, boss.js entities
src/engine/*                       world/renderer, camera rig, sprites, assets (+chroma key), tweens, labels, fx, audio
src/placeholders/*                 procedural placeholder art
src/ui/ui.js                       screens, HUD, cannon panel, map
assets/manifest.json               every asset + sprite-sheet grid definitions
docs/                              GDD (with LXD rationale), STYLE_GUIDE, ASSET_INDEX + one spec per asset, SFX_SPEC
tools/sheet-viewer.html            preview/QA sprite sheets, view all placeholders (#gallery)
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
python3 playtest/playtest.py          # full flow: title → map → arena 1 (under / over / perfect) → results
python3 playtest/playtest_levels.py   # two-wave arena, boss arena, game over + retry, mobile layout
```
Requires Python Playwright with Chromium (`pip3 install playwright && python3 -m playwright install chromium`). Screenshots are written to `playtest/screens/`.

## Design docs
- `docs/GDD.md` — game design + learning design (LXD) rationale, difficulty ladder with per-arena problem sets, feedback matrix, scoring.
- `docs/STYLE_GUIDE.md` — art direction, palette, shared prompt block, sprite-sheet rules.
- `docs/ASSET_INDEX.md` → `docs/assets/*.md` — every asset to produce.
- `docs/sfx/SFX_SPEC.md` — every sound cue, music modes, how to override.
