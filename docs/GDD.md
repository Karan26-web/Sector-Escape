# Game Design Document — Sector Escape: The Lost Jungle
*Skill: Area of a Sector of a Circle · A = (θ/360) × πr² · π = 22/7*

> Written for the LXD + production team. The gameplay follows the LXD brief (approach → trapped → breach → run to the cannon → scan → enter area → FIRE → three outcomes → exit) and the 12-panel wireframe; this document explains how each beat is implemented, why the maths is wired the way it is, and which knobs exist for tuning.

## 0. LXD review 2026-10-22 — what changed
Implemented from the LXD's feedback PDF (*sector arena feedbacks.pdf*, 11 pages, every item; archived outside the project):
- **Title**: the painted evening sky, the temple behind the gate and the sun low on the right; camera low on the causeway, close to the gate; Karan stands with his back to us facing the gate (idle); carved-stone tablet buttons (glow on hover, press-down, the primary one pulses); Continue only with a save, labelled "Continue · Arena N" and highlighted; How to play is a real secondary tablet; tagline removed; the dark gradient stays behind the logo column; slow camera drift toward the gate, birds, fireflies, lake mist, torch light flickering on the stone; the old box posts are free-standing torches in stone sockets.
- **How to play**: 3 swipeable parchment cards (dots, Back/Next, swipe, ← →): *Reach the cannon* (animated: Karan runs to the hatch, the cannon rises) · *Find the sector area* (textbook diagram O, r, θ, open arc + formula) · *Fire!* (too small / just right / too big side by side; 3 shields; answers like 38.5 or 77/2). Last button "Let's go!".
- **Map**: fills the screen, start bottom-left → temple top-right (portrait on phones: bottom → top); the side panel became a small parchment tag next to the selected ring (placed where it covers the fewest other rings; docked at the bottom on phones) with Arena N of 7 · name · stars · Enter; removed tagline, diagram, radius/angle/guardian boxes, "Not cleared yet", START label, padlocks, decorative islands; slim top bar (← title · ★ x / 21 · sound · settings: sound, how to play, reset progress with confirm); ring states (cleared = lit stone, cyan rim, stars under the badge · current = gold pulse with Karan on it · locked = darker with drifting mist and hanging vines); number badges that never collide; finger-sized tap targets; torches lit up to the current ring; glowing doorway arcs between cleared rings; golden light beam over the temple; the Warden's red silhouette on arena 7; Karan walks the route between rings; unlock moment (pan in, mist clears, vines fall, ring flashes); first-visit "Tap to begin" arrow (once); tapping a cleared ring shows its stars and best score; hovering/tapping a locked ring shakes it: "Clear Arena N first"; twinkling water, waterfall spray, drifting cloud shadows, birds.
- **Arena / cannon**: from above the cannon is a slim crystal piece (half width) under a bright centre dot **O**; both radius lines start at O; the r label sits beside its line, θ beside the angle arc.
- **Answer dock** (was the Sector Cannon panel): the formula, a one-line misconception tip, the answer field with m², and a compact stone keypad (7–9 ⌫ / 4–6 / / 1–3 . / 0 ✓), docked right-centre (follow-up request 2026-10-22; full-width bottom on phones). No header, no scroll box, no keypad toggle, no attempt counter, no hint button, no frame/leaves, no π key. Fractions and decimals to 3 places are accepted.
- **The formula, just above the keypad** (follow-up request 2026-10-22; it was a line on the floor under the sector): A = θ/360 × π × r² is shown on every ring. After the 1st wrong shot it works itself through in place: the numbers are substituted (θ → 90, π → 22/7, r² → 7 × 7), what cancels is crossed out in red with the small result written beside it, textbook style (90/360 → 1 over 4; the 7 of 22/7 against one 7 → 1 and 1; for r = 10.5 it becomes 1.5), and it simplifies to A = 1/4 × 22 × 7. After the 2nd it shows the answer as a fraction (A = 1/4 × 154 = 77/2). The beam feedback is one line near the arc ("Your beam covered 47° — the arc is 90°. Too small!"); the tip is one line above the answer ("Looks like you didn't square r: 7 × 7 = 49"); both clear as soon as a new answer is typed.
- **Firing**: the camera pulls back a little; a scan line sweeps exactly the wedge the answer asked for (cyan inside the arc, red for any excess); slow motion as radial bolts from O hit each guardian inside it and the beam hits the wall; overcharge reflects back at Karan. A ghost comparison stays for the banner: target wedge dashed in gold over a smaller shot · excess pulsing red · gold snap for exact. Wrong shots get a short banner (TOO SMALL / TOO WIDE), centred on the arena under the centre O, never behind the dock; the exact shot has no banner: the wedge snaps gold and the results card follows. Survivors' attack is short with one clear hit; the lost shield cracks.
- **End of arena**: results card (Arena N cleared · ★ ☆ ☆ · ✗ for each missed star only · Next arena ▶ · ↻ Retry for ★★★ when a star is missing). The next arena starts only on Next; Retry replays the arena. Shields pop back one by one at the start of the next arena.
- **Guardians**: more of them (one per ~1.6 m of arc, 6–30), three ranks, size and tone variety, perfectly smooth approach (no stride surge, eased start, animation phase accumulated so speed changes never skip frames). A more realistic sprite needs new art: the `enemy_bot` spec was updated for GPT.
- **Passages stay open**: no seal rises behind Karan (`SEAL_BEHIND = false` in `levels.js`).
- **The temple** (follow-up, 2026-10-22: "the temple is getting stretched"). The 3:1 panorama wrapped once around 360° was stretched 3.3–4.6× sideways, so it now repeats 3 times around (1.1–1.5×). The goal temple is the user's painted temple (`temple`) as a sprite far beyond the temple court on the chain's axis: behind ring 1's gate on the title with the low sun just to its right (one painted temple of the panorama hides behind it), growing as Karan travels east, towering over the temple gate in the finale. The same art is the temple on the 2D map.
- **Text diet** (follow-up request, 2026-10-22: "remove every unnecessary text"). The game now shows text only where it teaches or is a control. Gone: every narration caption (causeway, gate, "Sealed in…", hatch, cannon wakes, "The way opens…", "The ring closes…", temple gate, the idle movement tip), the GUARDIANS AWAKEN banner (the alarm, red eyes and camera shake carry it), the "Reach the glowing hatch" objective (the hatch glows), the PERFECT! banner and the "exactly 90°" line, the points and the ✓ ticks on the results card (only missed stars are listed, with ✗), the "Shields restored" label, the generic "re-check each step" tip, the game-over formula paragraph and the final screen's subtitle. Kept: θ, r, O, the solution line, TOO SMALL / TOO WIDE, the one numbers line after a wrong shot ("Your beam covered 47° — the arc is 90°."), misconception tips, the answer field, the results card's title, stars and buttons, Skip, and the map / title / how-to-play copy the LXD specified.
- **One evening for the whole game** (follow-up requests, 2026-10-22). The sky and backdrop are the user's painted evening art: the `sky` texture on a sphere that follows the camera (its warm bottom on the horizon, its deep-blue top 35° up, clamped above) and the `jungle_panorama` wrapped once around the world on a 175-high cylinder, rotated so its right-hand temple stands behind ring 1's gate on the title and its painted sun sits to the right of the gate; only the panorama's very top fades into the sky. A soft round bloom is pinned on the painted sun (it also hides the art's horizontal stretch). Ring by ring the light deepens through tints of the same art: golden evening (rings 1–2, = the title) → dusk (3–4) → last light (5–6) → red storm-dusk for the Warden (7) → when he falls, the temple court's golden finale; lights, fog, foliage tint and the sun's bloom tween with it (`SKIES` in `chain.js`, `ENV` in `levels.js`). Fireflies drift over the lake during the causeway run as on the title. The trees are the user's six painted trees (`jungle_tree`), in the world and on the 2D map; the map's temple is the painted temple on its cliff island.

## 1. Learning design

**Hero.** Karan, an 11–12-year-old explorer (sprite sheets `hero_front` / `hero_back`).

**Target learner.** Grades 9–10 (CBSE/NCERT *Areas Related to Circles* convention π = 22/7 so every answer is a whole number). Prerequisites: area of a circle, squaring, fractions of 360°.

**Learning objective.** Given a radius and a central angle, compute the exact sector area and understand *why* "a fraction of the circle" is the right mental model: the breach is θ/360 of the wall, so the blast must be θ/360 of the circle's area.

**Why the mechanic teaches (not just tests).**
- The radius and angle are **read off the battlefield**, not given in a text box: the radial lines and the radius line are drawn in world space during the cannon scan, and the enemies physically fill the sector. The abstraction (sector) is made concrete (danger zone).
- The answer **is** the game action. Area → laser coverage. The learner sees the consequence of the number geometrically:
  - **Exact** → the beam covers precisely the breach; every guardian inside is destroyed; the energy lock breaks; the exit opens.
  - **Too small** → the beam is a *narrower* sector (same radius, angle = θ × entered/exact). Guardians in the uncovered slivers survive and **pounce on the hero** (−1 shield).
  - **Too large** → the beam is a *wider* sector. The excess (magenta) hits the reflective wall beside the breach and **bounces back to the centre**, hitting the hero (−1 shield).
  - **Thinking time is protected.** The guardians march on the gun while Karan runs to the hatch, but the moment the camera goes top-down they freeze in a cyan stasis and stay frozen until the cannon fires, so there is no clock during the computation. Time spent in the input phase still feeds the time bonus (§4). (Before 2026-10-21 a "too slow" outcome existed; see open question 5.)
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
| start (every ring) | A = θ/360 × π × r² |
| after the 1st wrong shot | substituted A = 90/360 × 22/7 × 7 × 7 → crossed out (90/360 → 1/4, 7 against 7) → A = 1/4 × 22 × 7 |
| after the 2nd wrong shot | A = 1/4 × 154 = 77/2 (the answer as a fraction) |

The per-ring scaffold of the LXD brief (formula hidden from ring 3) is not applied any more: the user asked for the formula above the keypad on every ring. (One flag away if the LXD wants it back.)
There is no hint button (LXD): every miss automatically shows the next step; the changed parts glow amber, dissolve, and the new ones dissolve in left to right. The beam line and the one-line misconception tip carry the diagnosis.

## 2. Core loop — seven beats per ring (redesign 2026-10-21)
Each game state has **one** focal point; jungle and architecture are atmosphere, the maths is unmistakable.

| Beat | What happens | Camera | Focus |
|---|---|---|---|
| 1 Anticipation | Pick the ring on the 2D expedition map: route, sector preview, r, θ, guardian speed | — (2D) | the selected medallion |
| 2 Threat | Ring 1: run the causeway over the lake with the wall and gate fully solid (no cut-away during the approach); the gate grinds open, Karan runs through, the camera steps inside the ring and the gate **slams shut in front of him** ("No way back"). The gate is a real archway: the carved frame on both faces is bent onto the wall's curve, a stone passage runs through the wall's thickness, and the door is cut to the arch's shape so it fills the opening exactly (it sinks into the floor to open and slams up to close). Later rings: Karan arrives through the open arc and the ring closes behind him (the seal rises). A 2 s establishing shot, then a beat of calm, then **GUARDIANS AWAKEN** | elevated shot from behind Karan; the near walls, gate and their torches cut away, so the whole ring reads with Karan low-centre and the guarded arc at the top | the guarded arc |
| 3 Discovery | A pulsing cyan ring marks the buried hatch; one short objective ("Reach the glowing hatch") | chase cam, locked heading, clamped inside the ring | the hatch |
| 4 Understanding | The hatch splits, a stone drum with a bronze rim rises out of the dark shaft carrying the Sector Cannon (full cinematic the first time, brisk afterwards). The cannon has two painted views: an upright 3/4 sprite for the low arena shots, and a top-down piece that lies on the drum with its barrel aimed at the open arc; they crossfade with the camera's elevation. Sizes are tuned per view: in the low 3/4 shots the upright cannon is about Karan's height (1.8 m, ~2 m wide) standing on a 3 m drum whose top is a raised piece of the arena floor; the card is set forward by the depth at which its painted pedestal lands on the drum for the current camera elevation, so it never hovers behind an empty disc. From above, the top-down piece covers the whole drum (3.2 m). Shot over Karan's shoulder so he never hides it. During the charge the top-down cannon plays its 5 painted charge frames while a glow orb grows at the muzzle. Then the dedicated puzzle mode: 0.85 s move to an 85° top-down camera that is **fitted per ring** (the ring floor plus headroom for guardians on the arc is projected and solved into the free screen area: left of the panel and below the HUD on desktop, above the bottom sheet on phones, so r 7 and r 21 rings fill the view equally; 75–82 % of the height at 1470×820), the world dims and desaturates outside the ring, tall trees sink away, **the guardians lock in stasis** (cyan tint, pose held mid-stride; no extra markers on the guardians), Karan backs off to ~3.9 m still facing the cannon (from above a standing sprite lies toward the centre, so at the 2.5 m stand the cannon top covered his head), the sector is drawn (radial lines, cyan arc, a small angle arc at the vertex with θ just outside the sector beside it, r outside the other radial edge, so no label ever covers a guardian) and the panel slides in | puzzle camera | the sector + panel |
| 5 Power | FIRE: charge, then the sector laser sweeps exactly the entered area | puzzle camera | the beam |
| 6 Reward | PERFECT SECTOR → a held beat → an amber light path runs from Karan through the arc while the camera rises to frame the next ring; toast with stars and points | rising reveal | the next ring |
| 7 Progression | Overhead chase through the arc into the next ring; the missing arc of that ring rises as a seal behind him | overhead chase | Karan |

Wrong answers keep the LXD's consequences (UNDERCHARGED: survivors break out of stasis and pounce; OVERCHARGED: the excess reflects off the wall) and always show a targeted diagnosis + the next hint step. The next squad shimmers in on the arc already frozen. Shields: 3 per ring; 0 → game over → retry the same ring or return to the map.

## 3. Progression — the LXD's final table
Seven arenas with fixed dimensions (π = 22/7, every answer a clean number). Guardian march speed is derived from the time budget (1.7 m/s in ring 1 → ~2.5 m/s in ring 7), so later rings get faster guardians, as the brief asks; the budget also scales the time bonus. Exit directions zig-zag (right / lower-right / upper-right); where the suggested direction would have made the open arc overlap the entrance arc the turn was softened.

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
The guardians stand **on the open arc of the ring Karan is in** (one line at R − 0.55 m, spaced evenly across θ, clear of the junction columns), so they literally trace the sector's curved edge. After GUARDIANS AWAKEN they **march briskly and smoothly** on the gun (1.7–2.5 m/s by ring, walk cycle synced to ground speed, only a light stride surge, no stop-start lurch). They **accelerate as they close in**: speed × (1 + 0.6·p²), where p is progress from the arc to the halt line. Over the last 1.4 m they brake and plant their feet in **two ranks** around the gun (halt line max(3.8 m, 0.42 R), back rank 1.3 m behind), clear of Karan's stand and the angle label. Ring 1's squad is in place within ~2 s; ring 7's within ~4 s. **Stasis:** when the camera goes top-down they freeze in place (`bots.freeze`) under a cyan tint, until the shot resolves. Survivors of an undercharged shot break stasis and pounce, and the laser shatters frozen guardians inside the beam.

## 4. Scoring
`Arena cleared 500` + `Time bonus 0–300` (linear on time spent in the input phase vs. budget) + `No damage 300` + `Perfect first shot 200`.
Stars, one per criterion, shown with ✓/✗ on the results card so the learner knows exactly what to replay for: ★ Cleared · ★ At most 1 miss · ★ First shot. Best score and stars per arena are saved (`localStorage`), the map shows them, and the total appears at the temple.

## 5. The Warden (arena 7)
The Sector Warden stands behind the last squad in the open arc of the seventh ring and roars when Karan is noticed. There are no shields any more (the brief's final table has none): a perfect sector destroys the squad and the Warden together; an undercharged shot leaves it standing. It is the "final arena" flavour, not a separate mechanic.

## 6. Presentation modes & cameras
| Mode | Composition |
|---|---|
| **Title** | Dusk shot low on the causeway, close to the gate of ring 1, the temple backlit by a low sun; Karan stands on the causeway facing the gate; logo + stone-tablet buttons (Continue · Arena N highlighted when there is a save, else Play) + How to play; slow drift toward the gate, birds, fireflies, lake mist, flickering torch light (see §0) |
| **Map** | A painted isometric miniature of the **real** chain (`src/ui/mapArt.js`) filling the screen, start bottom-left → temple top-right (bottom → top on phones); parchment tag beside the selected ring; slim top bar; ring states, badges, lit route, doorway glows, temple beam, the Warden, Karan walking, unlock moment, living water (see §0) |
| **Establishing / arena** | Ring 1: a projection-verified two-shot from inside the wall (a small solver tries heights, lateral offsets and aim points and keeps the pose that puts Karan fully in the lower band, clear of the caption box, and the guardians in the upper band, clear of the banner), so the gate he just came through stays solid. Other rings: elevated shot from behind Karan (distance 0.5 R + 3.5, height 1.05 × distance). **Camera rule:** whenever the camera is outside the current ring, its wall pieces, gate and torches within ±72° of the camera bearing fade to 8 % (smoothly), so nothing stands between the camera and the player. The run itself uses a behind-the-shoulder chase with a locked heading, clamped inside the ring; pillars that brush the camera fade |
| **Puzzle** | 85° near top-down, FOV 32°, arc pointing up; the ring is fitted to the free screen area (left of the answer dock on desktop, above it on phones). The centre O, both radii, the arc, θ and r are drawn on top of the slim top-down cannon; the formula sits just above the keypad |
| **Reward / exit** | The camera rises over the cleared ring to frame the next one while an amber path lights up; then an overhead chase (9 m up) keeps the seal in frame as it rises behind Karan |

All moves are eased; impacts add screen shake.

### Design system
Palette: deep jungle `#142925`, ancient stone `#776F60`, muted moss `#446549`, **temple cyan `#52DED8`** (maths, machinery, completed seals), **active amber `#F4BF55`** (selection, actions, the next objective), warm ivory `#F3EBD8` (text), **threat red `#DC6657`** (guardians, damage, errors). Type: Barlow Condensed for headings and buttons, Poppins for body; the expressive logo is the only comic lettering. One primary (amber) button per screen.

### Jungle (three layers)
1. **Distant forest:** a wide ellipse of tall, dark, low-detail `forest_silhouette` clumps.
2. **Tree clusters:** seeded clusters of 2–4 of the six painted trees (`jungle_tree`, one big and 1–3 smaller, 7–13 m) on two bands around each ring and behind the lake banks, with deliberate gaps of open ground. The painted trees are about as wide as they are tall, so clusters are smaller than the old cartoon canopy masses.
3. **Foreground accents:** sparse rocks and large ferns at the foot of the walls and along the shoreline.
No random scatter; placement is seeded and deterministic. The lake has an irregular shoreline cut into the ground with a mud bank, instead of a hard rectangle edge.

## 7. Audio
Fully procedural (`src/engine/audio.js`): 46 cues (incl. the stasis lock), generative music with six modes (title / explore / arena / tension / boss / calm) and a jungle ambience bed with birds and torch crackle. Every learner-facing event has a sound (UI, footsteps, gates, alarm, scan, charge, beam, explosions, ricochet, hurt, stingers). Mute with **M**.

## 8. UX & accessibility
- Input: the **stone keypad** (theme from the `newNumPad` mockup) is the input on every device, and a physical keyboard still types into its display (Enter fires). Calculator layout: digit block, a right column with a red delete (hold = clear), π and the decimal point, a wide 0 and a wide green ✓ that fires the cannon. Fractions can still be typed on a keyboard; every answer is a clean decimal or a …π form. Frame cut from the wall-top texture (`assets/ui/numpad_frame.webp`, `tools/make_ui_numpad.py`), cyan crest gem that pulses once an answer is entered, two vine sprigs. The panel is deliberately quiet: one header row (title · attempt tag · Hint), one brief (the formula, or "hidden", plus the givens r · θ · π; the substituted line replaces the givens), then the keypad. It is pinned at the bottom and only the brief and feedback scroll, so ✓ is always reachable.
- Outcomes are redundant across channels: colour (cyan / red / magenta), text stamp, sound stinger, camera shake, HUD shields.
- Captions mirror the wireframe's narrative lines; objective pill tells the player what to do next; cutscenes are skippable; pause menu.
- Responsive: panel becomes a bottom sheet under 760 px (the puzzle camera keeps the ring above the sheet's maximum height); short desktop screens (≤ 800 px tall) get a compact keypad; tap-to-move for touch.
- Colour choices keep ≥ 4.5:1 contrast for text on panels.

## 9. Telemetry hooks (recommended next step)
Log per attempt: arena, wave, r, θ, entered value, `status`, `diagnosis.code`, time-to-fire, hint level, shields. This produces the error-type distribution the LXD needs to tune scaffolds and spot systematic misconceptions (e.g. many `full-circle` codes → strengthen the "fraction of the circle" scan animation).

## 10. Tech summary
World: one Three.js scene holds the causeway, all seven rings, the temple court and ~2,000 jungle billboards (trees, plants, rocks) drawn in three instanced draw calls with a vertex-shader billboard, alpha-to-coverage edges and near-camera fading for the top views. Walls are segmented cylinders with openings cut per arc; floors are alpha-tested circles with polygon offset so overlapping lenses never z-fight.
Performance budget: pixel ratio capped at 1.5 and adapted at runtime (drops to 0.75 on slow GPUs, climbs back when frames are fast); at most 4 dynamic torch lights per arena; particle budget of 160 sprites; laser and FX shaders are compiled during arena load so the first shot does not hitch; no per-frame allocations in the hero controller. The floor is an alpha-tested opaque surface, so characters can never sort underneath it.

Three.js r170 (vendored), ES modules, no bundler. Billboard sprite sheets for characters (front/back sheets for the hero), segmented cylinder walls so any arc can sink into the ground (overlapping breaches supported), shader-drawn sector laser (`progress` front, bright edges, stripes), HTML/CSS UI, Web Audio synthesis, Playwright playtests (`playtest/`). All art falls back to procedural canvases so the build is always playable.

## 11. Open questions for the LXD
1. An overcharged shot kills every guardian but still costs a shield and does not clear the arena (the exact area is required to move on). Keep?
4. Resolved 2026-10-22: the passage stays open behind Karan (`SEAL_BEHIND = false`); set it to true to bring the rising seal back.
2. Decimal radii (e.g. 3.5 m) and radian mode for senior classes — trivial to add to `levels.js`.
6. Guardian art: the sprite sheet is the GPT art; "more realistic" needs a regenerated `enemy_bot` sheet from its updated spec (rebuild the GPT specs with `python3 tools/gen_asset_docs.py`). In code they already vary in size and tone.
3. Arc-length variant: the same arena with "energy fence length" instead of area would reuse everything.
5. Stasis during input (design request, 2026-10-21; the LXD's How-to-play text asked for guardians that "move towards you slowly while you think" — the card now says they freeze, matching the game) removes the brief's "too slow" consequence: there is no clock while the learner computes, and time only affects the bonus. If the LXD wants pressure back, the cleanest option is a visible stasis meter that runs out after N seconds and lets the march resume.
