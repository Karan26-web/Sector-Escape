# Game Design Document — Sector Escape: The Lost Jungle
*Skill: Area of a Sector of a Circle · A = (θ/360) × πr² · π = 22/7*

> Written for the LXD + production team. The gameplay follows the LXD brief and the 12-panel wireframe, revised by the LXD on 2026-10-23 (arrive → the guardians at the barrier → Karan at his observation point → the sector drawn → enter area → FIRE → three outcomes → exit); this document explains how each beat is implemented, why the maths is wired the way it is, and which knobs exist for tuning.

## 0. LXD review 2026-10-23 — no weapon, a barrier, an observation point
The Senior LXD's seven points, each implemented (the sector construction of §0a stays as it was):

| LXD point | What the game does now | Code |
|---|---|---|
| **1 Clean, focused screens** — anything that adds no value or distracts goes | Removed: the HUD's progress dots (the "Arena 1 / 7" kicker already says it), the guardians' threat bar, and the never-shown objective pill, banner, caption and toast (HTML, CSS and code); the hatch and its glowing ring; the tap-to-move marker; the stasis tint. The arena shows only the gap, the barrier, the guardians, Karan, the construction and the answer dock; the pounding calms to one blow every ~2–3 s while the learner works | `index.html`, `styles/main.css`, `ui.js` |
| **2 Replace the central weapon with the concept** — a point that becomes a radius and sweeps along the circumference into the sector | There is no weapon at all: the Sector Cannon, its drum and the floor hatch are gone (art archived). In the top view the centre point O lights up, one radius grows to the wall, sweeps along the arc and paints the sector, the rest of the circle dims (§0a). The learner's answer charges O itself: the charge sweeps exactly the wedge that area asks for | `sector.js` (was `cannon.js`) |
| **3 A designated observation point** — the character stands and watches; moves on only once the arena is cleared; movement never overlaps the action | Karan is no longer steered by the player. On arrival he walks to his spot just behind the centre, on the line from the gap through O (max(3 m, 0.2 R) from O, so from above he never covers O, the radii or the labels), faces the gap and stays there for the whole fight. He moves on only after the results card's Next: along the light path straight through O and the cleared gap into the next ring | `levels.js` (`watch`), `arenaScene.js` (`takePosition`, `exitRun`), `hero.js` |
| **4 Enemies only when the character arrives**, behind a thin transparent barrier across the gap, pounding on it | No guardian is inside a ring, or anywhere, before Karan gets there (the next arena no longer spawns its squad while he walks over). He enters and the gap in the wall is empty; a beat later the squad charges in from beyond it, the barrier flashes up across the gap just before they reach it, they slam into it and keep pounding (a ripple and a thud at every blow). The barrier spans exactly the arc of the sector, so from above it is the arc | `barrier.js`, `bots.js` (`arrive`, `pound`) |
| **5 Correct area** — the barrier breaks with the enemies; then a clear passage | The charge sweeps the sector, the barrier shatters (shards fly out through the gap, starting where the charge hit), bolts from O destroy every guardian, the wedge snaps gold. The gap is open: after the results card Karan walks through it | `arenaScene.js` (`battle`), `sector.js` (`fire`) |
| **6 Too small** — the barrier breaks, only part of the squad falls, the rest get in | The narrower charge still breaks the whole barrier, but only the guardians fully inside the covered part of the arc fall; the ones it misses (always at least two, however close the answer) walk in through the broken barrier and leap at Karan, the camera pushes in on the blow, −1 shield; then O pulses and they fall | `arenaScene.js` (`chargeTargets`), `bots.js` (`breakThrough`) |
| **7 Too big** — barrier and all enemies destroyed, the charge reflects back at the character at the centre, he falls, −1 life | The whole squad and the barrier go; the excess hits the walls beside the gap in red and reflects back as two beams into Karan; red flash, the camera pushes in on him, he is thrown 1.4 m back, falls, sits dazed for a beat and gets up (the front-view `hurt` frames, held), −1 shield; then he walks back to his spot | `sector.js` (`fire`), `hero.js` (`knockdown`) |

- **After a wrong shot**: the ghost comparison fades, the barrier forms again, a fresh squad charges it, the camera returns to the sector and the formula works one step further. Only the exact area clears an arena (open question 1).
- **TOO SMALL / TOO WIDE** now hang just below Karan (in the empty half of the ring, or below his landing spot in the push-in), never over him.
- **The Warden** (ring 7) arrives with the squad, behind the barrier, and falls only to the exact sector (any wrong shot leaves it standing).
- **How to play, card 1** is now *Watch the gap*: an animated arena with the gap, the glowing barrier, five guardians pounding on it, Karan at his spot, and O drawing the radius and sweeping out the sector. Card 3's captions: too small "The barrier breaks, but some guardians get through" · just right "The barrier and every guardian destroyed" · too big "The extra charge bounces back and knocks Karan down".
- **Sounds**: barrier forming, a guardian's blow (thud + glassy ring), the shatter, Karan hitting the floor, the squad's footsteps as it charges in; the cannon, hatch and stasis cues are gone.
- **New art (delivered the same day, from the user's GPT strips):** the guardians' **pound** row (fists up → slam → recoil; the blow, the barrier ripple and the thud land on its impact frame), appended to the guardian sheet with `tools/add_sheet_row.py` (one scale for all frames, feet on the sheet's ground line); the sheet's cells grew to 256 × 296 px for the raised fists and its world height with them, so the robots keep their size. Karan's **cast** (seen from behind: steps in, swings his arm up, pushes his palm out toward the gap with a cyan glow, held while the charge sweeps) is the third row of the user's own hero_back sheet (idle · run · cast, drawn in the hero_back style so Karan keeps his age and height: the first GPT strip drew him older and taller and was rejected). That sheet replaced the old two-row one as delivered, after clearing small patches of grey checkerboard left between the arms; the versions rebuilt from the user's GIF (`hero_cast_animation.gif`) were not needed. The GPT specs, source strips and rejected builds are archived outside the project.
- Phases (`__se.phase`): inside → arrive → observe → tactical → scan → input → firing → result → cleared → exit.
- **Everything loads before the first screen** (user request, same day): one loading screen with the logo and a byte-accurate bar (the art streams in smallest file first, five at a time; the bar follows the bytes and never moves back), then the fonts, every texture uploaded to the GPU and every shader compiled. The title buttons pop in only at 100 %, and nothing can start the game before that. A file that fails or stalls never blocks: it is retried once, then drawn as its procedural stand-in. Nothing pops in or stalls once play starts (measured: no new shaders, textures or downloads during play).
- **Fewer buttons** (user request, same day): the map's star counter (★ x / 21), the speaker buttons (in-game HUD and map top bar), the HUD pause button and the final screen's "★ x / 21 · lifetime" line are gone. The HUD is the shields only (the arena card went the same day). Sound: M, or Settings on the map (and the pause menu); pause: Esc. Per-arena stars stay on the results card and the map tags.

## 0a. Top view, LXD request 2026-10-23 (earlier the same day) — draw the sector, then answer it
*"When we switch to the top view the cannon should be minimal: a point at the centre highlights and appears, a radius appears from it and sweeps to become the sector; then we zoom into the sector and the learner answers; when the answer is given we zoom out and show the whole circle."* Also: from above the cannon looked like a circle inside the arena circle, which is pedagogically wrong. (Since §0 there is no cannon at all; the sequence is otherwise unchanged.)

| Step | What the learner sees | Time |
|---|---|---|
| 1 Rise | The camera rises from Karan's observation point to frame the whole ring, the guardians pounding behind the barrier | 1.0 s |
| 2 Point | **O** pops at the centre: a small bright dot with a soft glow, labelled O | 0.55 s |
| 3 Radius | One radius grows from O to the wall along the first edge of the gap; a tick marks where it meets the wall; **r = 7 m** appears beside it | 0.6 s |
| 4 Sweep | The radius sweeps along the arc: the sector paints in behind it, the angle arc grows at O and **θ** counts up beside it (0° → 90°); the swept radius stays as the second radius | 1.6 s |
| 5 Part of the whole | The rest of the circle (360° − θ) dims | 0.5 s |
| 6 Zoom in | The camera closes in on the sector (O, the arc, the barrier and the guardians behind it, the labels and Karan at his spot, fitted left of the answer dock, above it on phones); the learner answers | 0.9 s |
| 7 Zoom out | The answer is given: the camera pulls back to the whole circle, the charge gathers at O and sweeps, so the shot and its comparison ghost are read against the full circle | 0.8 s |
| 8 Retry | After a wrong shot the camera zooms back into the sector; O, both radii, the angle arc and the labels stay drawn, and the formula above the keypad works one step further | 0.8 s |

- **No circle inside the circle.** Nothing round sits at the centre in the top view: no cannon or drum (retired in §0), a soft glow around O instead of an outline ring, and the floor art's carved medallion repainted as wedge flagstones converging on the centre, so even the floor points at O.
- **π = 22/7 beside the formula** (user request, same day): the dock reads *A = θ/360 × π × r²* | *π = 22/7*, the value a quieter "given" behind a hairline. On the first miss it glows with π and dissolves as 22/7 takes π's place in the worked line; from then on the formula itself carries the value, and the longer worked line keeps the full width of the dock (on the 300 px desktop dock, keeping the note there would shrink the worked line to 12–16 px).
- **Ring 7**: both camera fits also hold the whole Warden (it stands 5 m beyond the arc and towers 6.5 m), so the screen edge never cuts it; on desktop this makes ring 7's sector zoom about a third smaller than the other rings' (on phones the sector still fills the width).
- Code: `Sector.scan()` in `sector.js`; the sequence and the camera fits (`tacticalPose` = the whole ring, `sectorPose` = the sector, `heroPose` = the push-in on Karan) in `arenaScene.js`.

## 0b. LXD review 2026-10-22 — what changed
Implemented from the LXD's feedback PDF (*sector arena feedbacks.pdf*, 11 pages, every item; archived outside the project):
- **Title**: the painted evening sky, the temple behind the gate and the sun low on the right; camera low on the causeway, close to the gate; Karan stands with his back to us facing the gate (idle); carved-stone tablet buttons (glow on hover, press-down, the primary one pulses); Continue only with a save, labelled "Continue · Arena N" and highlighted; How to play is a real secondary tablet; tagline removed; the dark gradient stays behind the logo column; slow camera drift toward the gate, birds, fireflies, lake mist, torch light flickering on the stone; the old box posts are free-standing torches in stone sockets.
- **How to play**: 3 swipeable parchment cards (dots, Back/Next, swipe, ← →): *Reach the cannon* (animated: Karan runs to the hatch, the cannon rises; replaced by *Watch the gap* in §0) · *Find the sector area* (textbook diagram O, r, θ, open arc + formula) · *Fire!* (too small / just right / too big side by side; 3 shields; answers like 38.5 or 77/2). Last button "Let's go!".
- **Map**: fills the screen, start bottom-left → temple top-right (portrait on phones: bottom → top); the side panel became a small parchment tag next to the selected ring (placed where it covers the fewest other rings; docked at the bottom on phones) with Arena N of 7 · name · stars · Enter; removed tagline, diagram, radius/angle/guardian boxes, "Not cleared yet", START label, padlocks, decorative islands; slim top bar (← title · settings: sound, how to play, reset progress with confirm; the ★ x / 21 counter and the speaker were removed on 2026-10-23); ring states (cleared = lit stone, cyan rim, stars under the badge · current = gold pulse with Karan on it · locked = darker with drifting mist and hanging vines); number badges that never collide; finger-sized tap targets; torches lit up to the current ring; glowing doorway arcs between cleared rings; golden light beam over the temple; the Warden's red silhouette on arena 7; Karan walks the route between rings; unlock moment (pan in, mist clears, vines fall, ring flashes); first-visit "Tap to begin" arrow (once); tapping a cleared ring shows its stars and best score; hovering/tapping a locked ring shakes it: "Clear Arena N first"; twinkling water, waterfall spray, drifting cloud shadows, birds.
- **Arena / cannon**: both radius lines start at the bright centre dot **O**; the r label sits beside its line, θ beside the angle arc. (The slim top-down cannon piece of this review was retired on 2026-10-23; since §0 there is no cannon at all.)
- **Answer dock** (was the Sector Cannon panel): the formula, a one-line misconception tip, the answer field with m², and a compact stone keypad (7–9 ⌫ / 4–6 / / 1–3 . / 0 ✓), docked right-centre (follow-up request 2026-10-22; full-width bottom on phones). No header, no scroll box, no keypad toggle, no attempt counter, no hint button, no frame/leaves, no π key. Fractions and decimals to 3 places are accepted.
- **The formula, just above the keypad** (follow-up request 2026-10-22; it was a line on the floor under the sector): A = θ/360 × π × r² is shown on every ring. After the 1st wrong shot it works itself through in place: the numbers are substituted (θ → 90, π → 22/7, r² → 7 × 7), what cancels is crossed out in red with the small result written beside it, textbook style (90/360 → 1 over 4; the 7 of 22/7 against one 7 → 1 and 1; for r = 10.5 it becomes 1.5), and it simplifies to A = 1/4 × 22 × 7. After the 2nd it shows the answer as a fraction (A = 1/4 × 154 = 77/2). The beam feedback is one line near the arc ("Your beam covered 47° — the arc is 90°. Too small!"); the tip is one line above the answer ("Looks like you didn't square r: 7 × 7 = 49"); both clear as soon as a new answer is typed.
- **Firing**: the camera zooms out to the whole circle (2026-10-23; it pulled back a little before); a scan line sweeps exactly the wedge the answer asked for (cyan inside the arc, red for any excess); slow motion as radial bolts from O hit each guardian inside it and the beam hits the wall; overcharge reflects back at Karan. A ghost comparison stays for the banner: target wedge dashed in gold over a smaller shot · excess pulsing red · gold snap for exact. Wrong shots get a short banner (TOO SMALL / TOO WIDE), on the arena, never behind the dock (since §0: just below Karan); the exact shot has no banner: the wedge snaps gold and the results card follows. Survivors' attack is short with one clear hit; the lost shield cracks.
- **End of arena**: results card (Arena N cleared · ★ ☆ ☆ · ✗ for each missed star only · Next arena ▶ · ↻ Retry for ★★★ when a star is missing). The next arena starts only on Next; Retry replays the arena. Shields pop back one by one at the start of the next arena.
- **Guardians**: more of them (one per ~1.6 m of arc, 6–30), size and tone variety. (The march on the gun in three ranks was replaced in §0: they stay behind the barrier and pound on it.) A more realistic sprite needs new art: the `enemy_bot` spec was updated for GPT.
- **Passages stay open**: no seal rises behind Karan (`SEAL_BEHIND = false` in `levels.js`).
- **The temple** (follow-up, 2026-10-22: "the temple is getting stretched"). The 3:1 panorama wrapped once around 360° was stretched 3.3–4.6× sideways, so it now repeats 3 times around (1.1–1.5×). The goal temple is the user's painted temple (`temple`) as a sprite far beyond the temple court on the chain's axis: behind ring 1's gate on the title with the low sun just to its right (one painted temple of the panorama hides behind it), growing as Karan travels east, towering over the temple gate in the finale. The same art is the temple on the 2D map.
- **Text diet** (follow-up request, 2026-10-22: "remove every unnecessary text"). The game now shows text only where it teaches or is a control. Gone: every narration caption (causeway, gate, "Sealed in…", hatch, cannon wakes, "The way opens…", "The ring closes…", temple gate, the idle movement tip), the GUARDIANS AWAKEN banner (the alarm, red eyes and camera shake carry it), the "Reach the glowing hatch" objective (the hatch glows), the PERFECT! banner and the "exactly 90°" line, the points and the ✓ ticks on the results card (only missed stars are listed, with ✗), the "Shields restored" label, the generic "re-check each step" tip, the game-over formula paragraph and the final screen's subtitle. Kept: θ, r, O, the solution line, TOO SMALL / TOO WIDE, the one numbers line after a wrong shot ("Your beam covered 47° — the arc is 90°."), misconception tips, the answer field, the results card's title, stars and buttons, Skip, and the map / title / how-to-play copy the LXD specified.
- **One evening for the whole game** (follow-up requests, 2026-10-22). The sky and backdrop are the user's painted evening art: the `sky` texture on a sphere that follows the camera (its warm bottom on the horizon, its deep-blue top 35° up, clamped above) and the `jungle_panorama` wrapped once around the world on a 175-high cylinder, rotated so its right-hand temple stands behind ring 1's gate on the title and its painted sun sits to the right of the gate; only the panorama's very top fades into the sky. A soft round bloom is pinned on the painted sun (it also hides the art's horizontal stretch). Ring by ring the light deepens through tints of the same art: golden evening (rings 1–2, = the title) → dusk (3–4) → last light (5–6) → red storm-dusk for the Warden (7) → when he falls, the temple court's golden finale; lights, fog, foliage tint and the sun's bloom tween with it (`SKIES` in `chain.js`, `ENV` in `levels.js`). Fireflies drift over the lake during the causeway run as on the title. The trees are the user's six painted trees (`jungle_tree`), in the world and on the 2D map; the map's temple is the painted temple on its cliff island.

## 1. Learning design

**Hero.** Karan, an 11–12-year-old explorer (sprite sheets `hero_front` / `hero_back`).

**Target learner.** Grades 9–10 (CBSE/NCERT *Areas Related to Circles* convention π = 22/7 so every answer is a whole number). Prerequisites: area of a circle, squaring, fractions of 360°.

**Learning objective.** Given a radius and a central angle, compute the exact sector area and understand *why* "a fraction of the circle" is the right mental model: the breach is θ/360 of the wall, so the blast must be θ/360 of the circle's area.

**Why the mechanic teaches (not just tests).**
- The radius and angle are **read off the battlefield**, not given in a text box: the point O, the radius and its sweep along the arc are drawn in world space, and the gap the guardians are trying to break through *is* the sector's arc (the barrier spans exactly θ). The abstraction (sector) is made concrete (the thing standing between Karan and the guardians).
- The answer **is** the game action. Area → laser coverage. The learner sees the consequence of the number geometrically:
  - **Exact** → the charge covers precisely the sector; the barrier shatters and every guardian behind it is destroyed; the gap is open.
  - **Too small** → the charge is a *narrower* sector (same radius, angle = θ × entered/exact). It still breaks the barrier, but the guardians it does not cover survive, walk in through the gap and **attack Karan** (−1 shield).
  - **Too large** → the charge is a *wider* sector. Every guardian falls, but the excess (red) hits the wall beside the gap and **reflects back at Karan**, knocking him down (−1 shield).
  - **Thinking time is protected.** The guardians cannot get through the barrier until the charge breaks it, so there is no clock during the computation (they keep pounding, one blow every few seconds, for urgency without pressure). Time spent in the input phase still feeds the time bonus (§4). (Before 2026-10-21 a "too slow" outcome existed; see open question 5.)
- Failure never changes the problem. The learner retries the *same* r and θ with one more level of scaffolding, so each wrong attempt converts into guided practice rather than a new random question.

**Why area maps to the angle (fixed radius).** The breach spans the wall, so the natural "shape" of the blast is the sector of the arena. Keeping r fixed and varying the angle makes the error *visible as angular coverage* — the undercharged beam visibly leaves bots standing at the edges, the overcharged beam visibly spills onto the wall — exactly as panels 10 and 11 of the wireframe show. (Mapping error to radius would hide the mistake behind the enemies.)

**Answer format (LXD 2026-10-22).** Decimals and fractions are accepted and compared at 3 decimal places: 38.5, 38.500 and 77/2 are all correct for ring 1, 38 is not. Every answer in the game is exact with π = 22/7, so no wider tolerance is needed (π = 3.14 answers are deliberately not accepted). The keypad has digits, a fraction bar and a decimal point; a physical keyboard can still type `…π` forms, which are compared on the coefficient of π.

### Misconception diagnostics
Wrong answers are matched against the most common procedural errors before a generic message is shown. (Research on fraction games found that feedback improves correctness but not misconceptions unless it is *specific to the error type* — so the game logs and names the error.)

| Code | Trigger (entered ≈ …) | Message shown |
|---|---|---|
| `full-circle` | πr² | "That is the area of the WHOLE circle. The breach is only part of it — multiply πr² by θ/360." |
| `arc-length` | (θ/360)·2πr | "That is the ARC LENGTH, not the area. Area needs r²…" |
| `not-squared` | (θ/360)·πr | "The radius was not squared. r² = r × r." |
| `circumference` | 2πr | "That is the circumference…" |
| `used-diameter` | (θ/360)·π(2r)² | "Looks like the diameter was used instead of the radius." |
| `angle`, `radius`, `r-squared` | θ, r, r² | "You entered the angle / just the radius / r² is only one step…" |
| `decimal` | 10× or ÷10 | "Check your place value." |
| `fraction-flipped` | (360/θ)·πr² | "The fraction is upside down. Use θ/360." |
| `double`, `half` | 2× / ½× | "Exactly double / half…" |
| `forgot-pi` | (θ/360)·r² | "π is missing. You have (θ/360) × r² — multiply by π." |
| `pi-as-3` | (θ/360)·3r² | "π was taken as 3. Use 22/7." |
| `under` / `over` | anything else | "About N % too small / large. Re-check each step…" |

Every feedback card also states the geometric consequence: *"You entered 100 m² — the laser covered 58° of the 90° breach."*

### Scaffolding ladder (the formula above the keypad)
| When | What the formula shows (ring 1) |
|---|---|
| start (every ring) | A = θ/360 × π × r², with π = 22/7 beside it |
| after the 1st wrong shot | substituted A = 90/360 × 22/7 × 7 × 7 → crossed out (90/360 → 1/4, 7 against 7) → A = 1/4 × 22 × 7 |
| after the 2nd wrong shot | A = 1/4 × 154 = 77/2 (the answer as a fraction) |

The per-ring scaffold of the LXD brief (formula hidden from ring 3) is not applied any more: the user asked for the formula above the keypad on every ring. (One flag away if the LXD wants it back.)
There is no hint button (LXD): every miss automatically shows the next step; the changed parts glow amber, dissolve, and the new ones dissolve in left to right. The beam line and the one-line misconception tip carry the diagnosis.

## 2. Core loop — beats per ring (redesign 2026-10-21, revised with the LXD 2026-10-23)
Each game state has **one** focal point; jungle and architecture are atmosphere, the maths is unmistakable.

| Beat | What happens | Camera | Focus |
|---|---|---|---|
| 1 Anticipation | Pick the ring on the 2D expedition map: route, sector preview, r, θ, guardian speed | — (2D) | the selected medallion |
| 2 Threat | Ring 1: run the causeway over the lake with the wall and gate fully solid (no cut-away during the approach); the gate grinds open, Karan runs through, the camera steps inside the ring and the gate **slams shut in front of him** ("No way back"). The gate is a real archway: the carved frame on both faces is bent onto the wall's curve, a stone passage runs through the wall's thickness, and the door is cut to the arch's shape so it fills the opening exactly. Later rings: Karan arrives through the last gap. The ring is **empty**: a 1.5 s establishing shot of the gap in the wall; then the guardians **charge in from beyond it**, the barrier flashes up across the gap and they slam into it and pound (alarm, the Warden's roar in ring 7) | elevated shot from behind Karan (ring 1: a solved two-shot inside the wall); the near walls, gate and their torches cut away | the gap, the barrier, the guardians |
| 3 Position | Karan walks to his **observation point** (max(3 m, 0.2 R) behind O, on the line from the gap through O) and turns to the gap; he stays there for the whole fight | follow cam over his shoulder | Karan → the gap |
| 4 Understanding | The top view, built step by step (§0a): the camera rises to an 85° view **fitted to the whole ring** (the ring floor plus the guardians behind the barrier, projected and solved into the free screen area: left of the answer dock on desktop, above it on phones, so r 7 and r 21 rings fill the view equally); the world dims and desaturates outside the ring, tall trees sink away, the pounding calms to one blow every ~2–3 s; O appears, one radius grows to the wall (r beside it), sweeps along the arc and paints the sector (the angle arc and θ grow with it), the rest of the circle dims; then the camera **zooms into the sector** and the answer dock is used. No label ever covers a guardian or Karan | top view: whole ring → the sector | O → r → θ → the sector |
| 5 Power | FIRE: the camera zooms out to the whole circle, Karan casts toward the gap and the charge gathers at O, sweeps exactly the entered area, breaks the barrier and hits the guardians behind the covered arc; after a miss the camera zooms back into the sector | top view: whole ring | the charge |
| 6 Reward | The gap is clear → results card → an amber light path runs from Karan straight through O and the gap while the camera rises to frame the next ring | rising reveal | the next ring |
| 7 Progression | Overhead chase through the gap into the next ring, which is empty until he arrives (no seal rises: `SEAL_BEHIND = false`) | overhead chase | Karan |

Wrong answers keep the LXD's consequences (TOO SMALL: the barrier breaks, the uncovered guardians get in and attack; TOO WIDE: the excess reflects off the wall and knocks Karan down) and always show a targeted diagnosis + the next step of the formula. Then the barrier forms again and a fresh squad charges it. Shields: 3 per ring; 0 → game over → retry the same ring or return to the map.

## 3. Progression — the LXD's final table
Seven arenas with fixed dimensions (π = 22/7, every answer a clean number). The time budget scales the time bonus (since 2026-10-23 the guardians no longer march, so it no longer sets their speed). Exit directions zig-zag (right / lower-right / upper-right); where the suggested direction would have made the open arc overlap the entrance arc the turn was softened.

| # | Arena | r (m) | θ | Area | As a fraction | Guardians | Time budget | Exit faces | Sky |
|---|---|---|---|---|---|---|---|---|---|
| 1 | The Mossy Gate | 7 | 90° | **38.5** | 77/2 | 7 | 60 s | upper-right (45°) | golden evening |
| 2 | Fallen Idol | 10.5 | 120° | **115.5** | 231/2 | 14 | 54 s | right (0°) | golden evening |
| 3 | Serpent Court | 14 | 90° | **154** | 154 | 14 | 50 s | lower-right (320°) | dusk |
| 4 | Crimson Ruins | 14 | 135° | **231** | 231 | 21 | 46 s | right (0°) | dusk |
| 5 | Twin Falls | 17.5 | 72° | **192.5** | 385/2 | 14 | 42 s | lower-right (315°) | last light |
| 6 | Thunder Well | 21 | 60° | **231** | 231 | 14 | 38 s | upper-right (45°) | last light |
| 7 | The Warden's Court | 21 | 120° | **462** | 462 | 27 + the Warden | 34 s | right (0°) → temple | red storm-dusk |

### Chain geometry (how the overlap is computed)
- **Lens (the passage).** Ring i's wall is open over θ_i. The passage into ring i+1 is the lens of the two circles, with its angle capped at **64°** (θ ≤ 72° uses θ itself). For equal radii that gives a lens depth of ~15 % of a diameter (12–17 % across the chain), so rings touch without merging. Half-chord c = R·sin(φ/2); the next centre sits h + √(R′² − c²) along the exit direction.
- **Breach bay.** When θ is wider than the lens (arenas 1–4 and 7), an annular-sector bay (R → R + D, D = 3.6–5.5 m) continues the open arc outward. Its two side walls are the sector's radial lines extended, so the breach reads as part of the sector.
- **Walls, pillars, seals from one boolean.** Every wall piece is "ring circle minus explicit openings minus every other disk minus every bay" (sampled at 0.5° and bisection-refined), bay walls are "bay outline minus the next disk". A carved column stands only where a wall ends at an opening: the gateposts of each passage, and where a bay wall runs into the next ring. Where a ring wall turns into its bay's side wall, and at the bay's outer corners, the walls simply meet (the side wall runs through the corner), so columns never line up one behind another. The whole chain has 16 columns, none within 4.5 m of another; they are slim (0.64 m shaft) and only a little taller than the wall. The seal is the part of ring i+1's own circle that opens toward ring i: it rises out of the floor after Karan passes, so every ring becomes a complete circle again behind him (the seventh seal closes the temple court).
- `validateChain()` checks clean answers, lens depth ≤ 20 % of the smaller diameter, single-piece seals, guardian room at every arc edge, and ≥ 1.5 m between non-neighbouring rings.

### Guardians
(LXD 2026-10-23.) The guardians are **never inside a ring before Karan**. When he arrives, the squad (one per ~1.6 m of arc, 6–30, size and tone variety) charges in from up to 7.5 m beyond the gap, through the bay or the next ring, fading in as it comes; the barrier forms across the gap and they slam into it. They stand in **one rank 1 m behind the barrier**, spaced evenly across θ, clear of the gateposts, so from above they trace the sector's arc from outside. **Pounding:** a crouch, a 0.55 m lunge into the barrier (a ripple and a thud where the blow lands), a step back; while Karan arrives and walks to his spot every guardian pounds every 0.5–1.6 s, from the top view on one random guardian every ~2–3 s. The blow is the sheet's pound row (impact on its third frame, a 0.3 m lean into the barrier); without that art the lunge's first frames stand in. **Charge:** the guardians behind the covered part of the arc fall to bolts from O; after a too-small charge the others step through the broken barrier, run at Karan and leap; O then pulses and they fall. In the top view they draw over the floor overlays, like Karan.

## 4. Scoring
`Arena cleared 500` + `Time bonus 0–300` (linear on time spent in the input phase vs. budget) + `No damage 300` + `Perfect first shot 200`.
Stars, one per criterion, shown with ✓/✗ on the results card so the learner knows exactly what to replay for: ★ Cleared · ★ At most 1 miss · ★ First shot. Best score and stars per arena are saved (`localStorage`) and the map's tag shows them for each arena (since 2026-10-23 there is no running ★ x / 21 total).

## 5. The Warden (arena 7)
The Sector Warden arrives with the last squad, beyond the seventh ring's gap, behind the barrier, and roars. There are no shields any more (the brief's final table has none): the exact sector destroys the squad and the Warden together; any wrong shot leaves it standing (it staggers). It is the "final arena" flavour, not a separate mechanic.

## 6. Presentation modes & cameras
| Mode | Composition |
|---|---|
| **Title** | Dusk shot low on the causeway, close to the gate of ring 1, the temple backlit by a low sun; Karan stands on the causeway facing the gate; logo + stone-tablet buttons (Continue · Arena N highlighted when there is a save, else Play) + How to play; slow drift toward the gate, birds, fireflies, lake mist, flickering torch light (see §0b) |
| **Map** | A painted isometric miniature of the **real** chain (`src/ui/mapArt.js`) filling the screen, start bottom-left → temple top-right (bottom → top on phones); parchment tag beside the selected ring; slim top bar; ring states, badges, lit route, doorway glows, temple beam, the Warden, Karan walking, unlock moment, living water (see §0b) |
| **Establishing / arena** | Ring 1: a projection-verified two-shot from inside the wall (a small solver tries heights, lateral offsets, aim points and lenses, wider on portrait phones, and keeps the pose that puts Karan fully in the lower band and the guardians' spots behind the barrier in the upper band), so the gate he just came through stays solid. Other rings: elevated shot from behind Karan (distance 0.5 R + 3.5, height 1.05 × distance; a wider lens on portrait phones). **Camera rule:** whenever the camera is outside the current ring, its wall pieces, gate and torches within ±72° of the camera bearing fade to 8 % (smoothly), so nothing stands between the camera and the player. Karan's walk to his observation point uses a behind-the-shoulder follow cam, clamped inside the ring; pillars that brush the camera fade |
| **Puzzle** | 85° near top-down, FOV 32°, arc pointing up, fitted to the free screen area (left of the answer dock on desktop, above it on phones). Three fits: the **whole ring** (`tacticalPose`) while the sector is constructed and while the shot plays, the **sector** (`sectorPose`: O, the arc, the barrier and the guardians, room for the labels, Karan at his spot) while the learner answers, and a **push-in on Karan** (`heroPose`) when he is hit. Nothing stands at the centre except O; the formula sits just above the keypad |
| **Reward / exit** | The camera rises over the cleared ring to frame the next one while an amber path lights up; then an overhead chase (9 m up) follows Karan through the gap into the next ring |

All moves are eased; impacts add screen shake.

### Design system
Palette: deep jungle `#142925`, ancient stone `#776F60`, muted moss `#446549`, **temple cyan `#52DED8`** (maths, machinery, completed seals), **active amber `#F4BF55`** (selection, actions, the next objective), warm ivory `#F3EBD8` (text), **threat red `#DC6657`** (guardians, damage, errors). Type: Barlow Condensed for headings and buttons, Poppins for body; the expressive logo is the only comic lettering. One primary (amber) button per screen.

### Jungle (three layers)
1. **Distant forest:** a wide ellipse of tall, dark, low-detail `forest_silhouette` clumps.
2. **Tree clusters:** seeded clusters of 2–4 of the six painted trees (`jungle_tree`, one big and 1–3 smaller, 7–13 m) on two bands around each ring and behind the lake banks, with deliberate gaps of open ground. The painted trees are about as wide as they are tall, so clusters are smaller than the old cartoon canopy masses.
3. **Foreground accents:** sparse rocks and large ferns at the foot of the walls and along the shoreline.
No random scatter; placement is seeded and deterministic. The lake has an irregular shoreline cut into the ground with a mud bank, instead of a hard rectangle edge.

## 7. Audio
Fully procedural (`src/engine/audio.js`): 48 cues (incl. the barrier forming, the guardians' blows on it, its shatter, Karan's fall), generative music with six modes (title / explore / arena / tension / boss / calm) and a jungle ambience bed with birds and torch crackle. Every learner-facing event has a sound (UI, footsteps, gates, alarm, the barrier, scan, charge, explosions, ricochet, hurt, stingers). Mute with **M**.

## 8. UX & accessibility
- Input: the compact stone keypad of the answer dock (§0b) is the only input in an arena (Karan is never steered), on every device, and a physical keyboard still types into its display (Enter fires). Layout 7–9 ⌫ / 4–6 / / 1–3 . / 0 ✓: a red delete (hold = clear), a fraction bar, the decimal point and a green ✓ that fires the charge. The dock is deliberately quiet: the formula, one tip line, the answer field with m², the keypad; nothing scrolls, so ✓ is always reachable.
- Outcomes are redundant across channels: colour (cyan / red / magenta), text stamp, sound stinger, camera shake, HUD shields.
- No captions, objective pill or banners (LXD: nothing that does not add value); the causeway cutscene is skippable; pause menu on Esc (no on-screen pause or speaker button since 2026-10-23).
- Responsive: panel becomes a bottom sheet under 760 px (the puzzle camera keeps the ring above the sheet's maximum height); short desktop screens (≤ 800 px tall) get a compact keypad.
- Colour choices keep ≥ 4.5:1 contrast for text on panels.

## 9. Telemetry hooks (recommended next step)
Log per attempt: arena, wave, r, θ, entered value, `status`, `diagnosis.code`, time-to-fire, hint level, shields. This produces the error-type distribution the LXD needs to tune scaffolds and spot systematic misconceptions (e.g. many `full-circle` codes → strengthen the "fraction of the circle" scan animation).

## 10. Tech summary
World: one Three.js scene holds the causeway, all seven rings, the temple court and ~2,000 jungle billboards (trees, plants, rocks) drawn in three instanced draw calls with a vertex-shader billboard, alpha-to-coverage edges and near-camera fading for the top views. Walls are segmented cylinders with openings cut per arc; floors are alpha-tested circles with polygon offset so overlapping lenses never z-fight.
Performance budget: pixel ratio capped at 1.5 and adapted at runtime (drops to 0.75 on slow GPUs, climbs back when frames are fast); at most 4 dynamic torch lights per arena; particle budget of 160 sprites; laser and FX shaders are compiled during arena load so the first shot does not hitch; no per-frame allocations in the hero controller. The floor is an alpha-tested opaque surface, so characters can never sort underneath it.

Three.js r170 (vendored), ES modules, no bundler. Billboard sprite sheets for characters (front/back sheets for the hero), segmented cylinder walls so any arc can sink into the ground (overlapping breaches supported), shader-drawn sector charge (`progress` front, bright edges, stripes), shader-drawn barrier (ripples per blow, GPU-animated shards for the shatter), HTML/CSS UI, Web Audio synthesis, Playwright playtests (`playtest/`). All art falls back to procedural canvases so the build is always playable.

## 11. Open questions for the LXD
1. An overcharged shot kills every guardian but still costs a shield and does not clear the arena (the exact area is required to move on). Keep?
4. Resolved 2026-10-22: the passage stays open behind Karan (`SEAL_BEHIND = false`); set it to true to bring the rising seal back.
2. Decimal radii (e.g. 3.5 m) and radian mode for senior classes — trivial to add to `levels.js`.
6. Guardian art: the sprite sheet is the GPT art; "more realistic" needs a regenerated `enemy_bot` sheet from its updated spec (rebuild the GPT specs with `python3 tools/gen_asset_docs.py`). In code they already vary in size and tone.
3. Arc-length variant: the same arena with "energy fence length" instead of area would reuse everything.
5. No clock while the learner computes (2026-10-21 stasis, since 2026-10-23 the barrier): the guardians cannot get in until the charge breaks it, so time only affects the bonus. If the LXD wants pressure back, the cleanest option is a barrier that visibly weakens with every blow and breaks after N seconds.
