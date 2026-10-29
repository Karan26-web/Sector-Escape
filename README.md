# Sector Escape

A 2.5D maths adventure that teaches the **area of a sector**, `A = (θ/360) × π × r²`, every area in terms of π: arenas 1–4 by choosing the right values (the game works the formula out, then fires it), arenas 5–7 by typing the number in front of π.

On a magical evening, Karan is stranded on an islet in a jungle lake. A beam of light rises from a lost temple far away, and the only way there is a stone causeway into a chain of seven overlapping stone rings. Every game starts from the very start: Play always plays that opening (Skip › jumps it; there is no Continue), then the player walks Karan with an on-screen stick or W A S D. Each ring has a gap in its wall, which is the arc of a sector. When Karan arrives, guardians charge in from beyond the gap and pound on a thin barrier across it. The player walks him to a glowing spot behind the centre, and the camera goes top-down: a point O lights up, a radius grows from it and sweeps along the arc into the sector. The learner types the sector's area, and the answer sets the width of a volley of rays that O fires all at once. Exact: the barrier and every guardian are destroyed. Too small: the barrier breaks, and the guardians the rays missed storm in at once with more behind them, surround Karan and pile on. Too big: everything is destroyed, but the excess rays strike the wall beside the gap and those same rays bounce back and knock Karan down. The shot is drawn the way the mistake was made: a wrong angle sweeps wider or narrower, a wrong radius keeps the angle and reaches past the wall or falls short of it. A wrong answer costs a shield and climbs a hint ladder in the dock: the idea first (no numbers), then part of the working, and after the third miss the full working, after which the game moves on.

Vanilla ES modules, HTML/CSS UI, procedural Web Audio and the open-source Three.js renderer (one vendored file). No game engine, no framework, no build step.

## Run it
The game needs an HTTP server (opening `index.html` as a file will not work):
```bash
python3 -m http.server 8321      # in the project folder, then open http://localhost:8321/
```

## Controls
The player walks Karan between the action beats: along the causeway to ring 1's gate, to the glowing observation spot in each ring, out through each cleared gap, across the temple court. Each walk keeps him on its floor, which includes every ring already cleared, so he can walk back as far as ring 1's gate (shut behind him); its goal lights up as he nears it or whenever he stops. During the action (the top view, the shot and its outcome) he stays on his spot, and the learner's only job is the area.

| Action | Input |
|---|---|
| Walk | W A S D or the arrow keys; or drag the stick in the bottom-left corner (touch or mouse; a press anywhere in that corner brings the stick under the thumb) |
| Opening | a tap, Space or Enter shows a line whole / moves on; Skip › jumps to the walk |
| Answer | arenas 1–4: choose (arena 1 taps one of three formulas; 2–4 set two drop-downs in the formula, then FIRE), and the game works it out before firing; arenas 5–7: the keypad or the keyboard, the whole number in front of the fixed π (`80` = 80π) |
| Fire | ✓ on the keypad, or Enter |
| Sound / pause | M / Esc (no on-screen buttons; the map's settings menu also switches the sound) |

## Dev and QA
- URL parameters: `?level=5` start at arena 5 · `?skip=1` skip the causeway · `?mute=1` · `?reset=1` wipe saved progress (the opening plays again) · `?auto=1` Karan walks each walk by himself (the playtests use it).
- Console: `__se.phase` (opening.stranded → opening.temple → opening.path → causeway → gate → inside → arrive → observe → tactical → scan → input (the answer bar runs; timeup if it runs out) → solve (arenas 1–4: the working) → firing → result → exit; solution: the hint ladder's last rung, the full working before the right answer is fired), `__se.answer('correct' | 'under' | 'over')` (any arena, chosen or typed), `__se.pick({ opt })` / `__se.pick({ a, r })` (arenas 1–4: exactly that choice), `__se.walk(true)` (the autopilot), `__se.scene.answerLeft = 3` (run the answer bar out), `__se.controller.read()`, `__se.scene`, `__se.CHAIN`.

## Project layout
```
index.html, styles/main.css     the page and the UI theme
src/main.js                     boot and flow: title → Play (always the opening, then arena 1) → arenas → temple; the map after a run
src/game/levels.js              the 7 arenas (LXD table), chain geometry, answer checking, misconception tips, formula steps, scoring
src/game/chain.js               the world: evening sky and panorama, the temple and its beam, the islet, causeway, rings, gates, columns, jungle
src/game/arenaScene.js          one ring from entry to exit (its walks, the action, the results)
src/game/opening.js             the opening: stranded on the islet → the temple's beam → the chain of arenas
src/game/roam.js, markers.js    the player's walks (walkable floor as distance fields, the walk camera) and the goals they light up
src/game/sector.js              the O / r / θ construction, the charge at O, the beam and the after-shot comparison
src/game/barrier.js             the transparent barrier across the gap: ripples where the guardians pound; the break (crack → fall → vanish)
src/game/bots.js, hero.js, boss.js, save.js
src/ui/ui.js, mapArt.js         screens, HUD, answer dock and formula, how to play, the painted map
src/engine/                     renderer, camera rig, the controller (stick + keys), sprites, assets, tweens, labels, effects, audio
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
- `tools/harden_alpha.py` — tightens a sheet's soft, half-transparent edges in the rows you name, so the background stops showing through a character in close-ups (leave out rows that are meant to glow).
- `tools/manifest_sizes.py` — writes every image's size on disk into the manifest (`bytes`); the loading bar weighs each download by it. **Run it after adding or replacing art** (and bump `version` when a file keeps its name).
- `tools/sheet-viewer.html` — preview sprite sheets and their animations.

## Loading
Everything is loaded before the title (`src/main.js` boot, `src/engine/assets.js`): every manifest image is streamed into memory with a byte-accurate bar (smallest files first, 5 at a time, weighted by the manifest's `bytes` and refined by Content-Length; the bar never moves back), then the fonts, then every texture is uploaded to the GPU and every shader compiled. The title buttons only appear at 100 % and `playFrom` waits for the same promise. Failures never block: a download with no data for 15 s is aborted and retried as a plain image; a missing file (4xx) or a second failure uses the procedural placeholder. Images shown in the UI use the downloaded copy (`blob:` URL) and fall back once to the file URL if that ever fails.

## Deploy (Vercel)
Static site, no build step: import the repo (framework preset **Other**, no build command) or run `npx vercel --prod` in the folder. `.vercelignore` publishes only the game (`index.html`, `vercel.json`, `src/`, `styles/`, `vendor/`, `assets/`); docs, tools, playtests and the DEV button stay out.

Caching: the page, code and art are revalidated on every load (unchanged files cost a tiny "not modified" reply), so a new deploy always shows up. Every asset URL also carries the manifest's `version` (`?v=...`): bump it when you replace art under the same file name to force every browser onto the new files at once.

## Playtests
```bash
python3 playtest/smoke_chain.py    # title → map → causeway → arena 1 (the gap, the guardians at the barrier, too small, too big, perfect) → arena 2
python3 playtest/chain_full.py     # arenas 6–7, the Warden, the temple finale, the hint ladder's last rung (three misses → the full working → on), quit, phone layout
```
To check loading like a player, throttle the network in the browser's dev tools (e.g. Fast 3G, cache disabled): the logo appears at once, the bar fills steadily and only moves forward, and the title buttons pop in at 100 %.
Needs Python Playwright with Chromium. Screenshots go to `playtest/screens/`.
