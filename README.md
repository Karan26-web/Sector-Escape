# Sector Escape

A 2.5D maths adventure that teaches the **area of a sector** — `A = (θ/360) × π × r²`, with π = 22/7.

On a magical evening, Karan crosses a stone causeway into a chain of seven overlapping stone rings on the way to a lost temple. In each ring the guardians hold the open arc. Karan runs to the centre, the Sector Cannon rises, the camera goes top-down (the guardians freeze), and the learner types the area of the sector. The answer sets the width of the beam: too small and the survivors pounce, too wide and the excess bounces off the wall, exact and every guardian falls. A wrong answer works the formula through, one step per miss, right above the keypad.

Vanilla ES modules, HTML/CSS UI, procedural Web Audio and the open-source Three.js renderer (one vendored file). No game engine, no framework, no build step.

## Run it
The game needs an HTTP server (opening `index.html` as a file will not work):
```bash
python3 -m http.server 8321      # in the project folder, then open http://localhost:8321/
```

## Controls
| Action | Input |
|---|---|
| Move | WASD / arrows, or tap the floor |
| Answer | the keypad (digits, `.`, `/`) or the keyboard; decimals (checked to 3 places) or fractions such as `77/2` |
| Fire | ✓ on the keypad, or Enter |
| Mute / pause | M / Esc, or the HUD buttons |

## Dev and QA
- URL parameters: `?level=5` start at arena 5 · `?skip=1` skip the causeway · `?auto=1` Karan runs to the cannon by himself · `?mute=1` · `?reset=1` wipe saved progress.
- Console: `__se.phase`, `__se.fire('38.5')`, `__se.scene`, `__se.CHAIN`.
- **Temporary DEV skip button** (localhost only, or `?dev=1`): remove `src/dev/skip-level.js` and its `<script>` line at the end of `index.html` before pushing.

## Project layout
```
index.html, styles/main.css     the page and the UI theme
src/main.js                     boot and flow: title → how to play / story → map → arenas → temple
src/game/levels.js              the 7 arenas (LXD table), chain geometry, answer checking, misconception tips, formula steps, scoring
src/game/chain.js               the world: evening sky and panorama, the temple, causeway, rings, gates, hatches, columns, jungle
src/game/arenaScene.js          one ring from entry to exit
src/game/cannon.js              the cannon, the O / r / θ construction, the beam and the after-shot comparison
src/game/bots.js, hero.js, boss.js, save.js
src/ui/ui.js, mapArt.js         screens, HUD, answer dock and formula, results card, how to play, the painted map
src/engine/                     renderer, camera rig, sprites, assets, tweens, labels, effects, audio
src/placeholders/               procedural stand-ins drawn if an asset fails to load
assets/                         WebP art; assets/manifest.json lists every asset (sprite-sheet grids and ground baselines)
vendor/three.module.js          Three.js
tools/                          art helpers (see below)
playtest/                       Playwright playtests
docs/GDD.md                     the game and learning design
```

## Art pipeline
All art is GPT-generated, installed as WebP and registered in `assets/manifest.json`. The originals and every replaced file are kept outside the project in `../Sector Escape - art source/`.
- `tools/optimize_assets.py` — converts manifest-listed PNGs to WebP and updates the manifest.
- `tools/pack_sprites.py` — packs separate sprites (e.g. the six trees) into one sheet, all standing on one ground line.
- `tools/gif_to_sheet.py` — turns a GIF with a fake checkerboard background into a transparent sprite sheet.
- `tools/gen_asset_docs.py` — writes a GPT prompt spec for every asset into `docs/` when new art is needed.
- `tools/sheet-viewer.html` — preview sprite sheets and their animations.

## Deploy (Vercel)
Static site, no build step: import the repo (framework preset **Other**, no build command) or run `npx vercel --prod` in the folder. `.vercelignore` publishes only the game (`index.html`, `vercel.json`, `src/`, `styles/`, `vendor/`, `assets/`); docs, tools, playtests and the DEV button stay out.

## Playtests
```bash
python3 playtest/smoke_chain.py    # title → map → causeway → arena 1 (too small, too wide, exact) → results → arena 2
python3 playtest/chain_full.py     # arenas 6–7, the Warden, the temple finale, game over / retry / quit, phone layout
```
Needs Python Playwright with Chromium. Screenshots go to `playtest/screens/`.
