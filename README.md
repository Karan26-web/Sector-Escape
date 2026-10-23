# Sector Escape

A 2.5D maths adventure that teaches the **area of a sector** — `A = (θ/360) × π × r²`, with π = 22/7.

On a magical evening, Karan crosses a stone causeway into a chain of seven overlapping stone rings on the way to a lost temple. Each ring has a gap in its wall, which is the arc of a sector. When Karan arrives, guardians charge in from beyond the gap and pound on a thin barrier across it. He watches from a fixed spot behind the centre while the camera goes top-down: a point O lights up, a radius grows from it and sweeps along the arc into the sector. The learner types the sector's area, and the answer sets the width of the charge. Exact: the barrier and every guardian are destroyed. Too small: the barrier breaks, but the guardians the charge missed get in and attack. Too big: everything is destroyed, but the excess reflects back and knocks Karan down. A wrong answer costs a shield and works the formula through, one step per miss, right above the keypad.

Vanilla ES modules, HTML/CSS UI, procedural Web Audio and the open-source Three.js renderer (one vendored file). No game engine, no framework, no build step.

## Run it
The game needs an HTTP server (opening `index.html` as a file will not work):
```bash
python3 -m http.server 8321      # in the project folder, then open http://localhost:8321/
```

## Controls
Karan walks by himself (LXD: he has a designated observation point); the learner's only job in an arena is the area.

| Action | Input |
|---|---|
| Answer | the keypad (digits, `.`, `/`) or the keyboard; decimals (checked to 3 places) or fractions such as `77/2` |
| Fire | ✓ on the keypad, or Enter |
| Sound / pause | M / Esc (no on-screen buttons; the map's settings menu also switches the sound) |

## Dev and QA
- URL parameters: `?level=5` start at arena 5 · `?skip=1` skip the causeway · `?mute=1` · `?reset=1` wipe saved progress.
- Console: `__se.phase` (inside → arrive → observe → tactical → scan → input → firing → result → cleared → exit), `__se.fire('38.5')`, `__se.scene`, `__se.CHAIN`.
- **Temporary DEV skip button** (localhost only, or `?dev=1`): remove `src/dev/skip-level.js` and the DEV `<script>` block at the end of `index.html` before pushing.

## Project layout
```
index.html, styles/main.css     the page and the UI theme
src/main.js                     boot and flow: title → how to play / story → map → arenas → temple
src/game/levels.js              the 7 arenas (LXD table), chain geometry, answer checking, misconception tips, formula steps, scoring
src/game/chain.js               the world: evening sky and panorama, the temple, causeway, rings, gates, columns, jungle
src/game/arenaScene.js          one ring from entry to exit
src/game/sector.js              the O / r / θ construction, the charge at O, the beam and the after-shot comparison
src/game/barrier.js             the transparent barrier across the gap: ripples where the guardians pound; the break (crack → fall → vanish)
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
- `tools/add_sheet_row.py` — appends a generated animation strip (PNG with real alpha) as a new row of an existing sprite sheet: one scale for every frame, feet on the sheet's ground line, taller cells when a pose needs headroom; prints the manifest changes.
- `tools/manifest_sizes.py` — writes every image's size on disk into the manifest (`bytes`); the loading bar weighs each download by it. **Run it after adding or replacing art** (and bump `version` when a file keeps its name).
- `tools/sheet-viewer.html` — preview sprite sheets and their animations.

## Loading
Everything is loaded before the title (`src/main.js` boot, `src/engine/assets.js`): every manifest image is streamed into memory with a byte-accurate bar (smallest files first, 5 at a time, weighted by the manifest's `bytes` and refined by Content-Length; the bar never moves back), then the fonts, then every texture is uploaded to the GPU and every shader compiled. The title buttons only appear at 100 % and `playFrom` waits for the same promise. Failures never block: a download with no data for 15 s is aborted and retried as a plain image; a missing file (4xx) or a second failure uses the procedural placeholder. Images shown in the UI use the downloaded copy (`blob:` URL) and fall back once to the file URL if that ever fails.

## Deploy (Vercel)
Static site, no build step: import the repo (framework preset **Other**, no build command) or run `npx vercel --prod` in the folder. `.vercelignore` publishes only the game (`index.html`, `vercel.json`, `src/`, `styles/`, `vendor/`, `assets/`); docs, tools, playtests and the DEV button stay out.

Caching: the page, code and art are revalidated on every load (unchanged files cost a tiny "not modified" reply), so a new deploy always shows up. Every asset URL also carries the manifest's `version` (`?v=...`): bump it when you replace art under the same file name to force every browser onto the new files at once.

## Playtests
```bash
python3 playtest/smoke_chain.py    # title → map → causeway → arena 1 (the gap, the guardians at the barrier, too small, too wide, exact) → results → arena 2
python3 playtest/chain_full.py     # arenas 6–7, the Warden, the temple finale, game over / retry / quit, phone layout
```
To check loading like a player, throttle the network in the browser's dev tools (e.g. Fast 3G, cache disabled): the logo appears at once, the bar fills steadily and only moves forward, and the title buttons pop in at 100 %.
Needs Python Playwright with Chromium. Screenshots go to `playtest/screens/`.
