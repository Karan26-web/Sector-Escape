# Game Design Document — Sector Escape: The Lost Jungle
*Skill: Area of a Sector of a Circle · A = (θ/360) × πr² · π = 22/7*

> Written for the LXD + production team. The gameplay follows the LXD brief (approach → trapped → breach → run to the cannon → scan → enter area → FIRE → three outcomes → exit) and the 12-panel wireframe; this document explains how each beat is implemented, why the maths is wired the way it is, and which knobs exist for tuning.

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
  - **Too slow** → guardians reach the cannon before FIRE (−1 shield). The problem stays the same; scaffolding increases.
- Failure never changes the problem. The learner retries the *same* r and θ with one more level of scaffolding, so each wrong attempt converts into guided practice rather than a new random question.

**Why area maps to the angle (fixed radius).** The breach spans the wall, so the natural "shape" of the blast is the sector of the arena. Keeping r fixed and varying the angle makes the error *visible as angular coverage* — the undercharged beam visibly leaves bots standing at the edges, the overcharged beam visibly spills onto the wall — exactly as panels 10 and 11 of the wireframe show. (Mapping error to radius would hide the mistake behind the enemies.)

**Tolerance.** Decimal answers are correct if |entered − exact| ≤ max(0.5 m², 0.5 %), which accepts 153.86 for 154 (π = 3.14 or 3.1416) without accepting genuine slips. π-form answers (`49π`) compare the coefficient of π exactly (±0.5 %). Fractions such as `616/4` or `98π/2` are accepted as input.

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

### Scaffolding ladder
| Hint level | What the panel shows |
|---|---|
| 0 | values only (r, θ, π = 22/7); formula hidden behind 💡 |
| 1 | the formula A = θ/360 × πr² |
| 2 | formula + substituted values `90/360 × 22/7 × 14 × 14` |
| 3 | + worked steps: θ/360 = 1/4 · r² = 196 · πr² = 616 · **A = 1/4 × 616 = ?** (final step left to the learner) |

Per-arena starting level (`scaffold` in `levels.js`): arena 1 starts at level 2 (`full`), arena 2 at level 1 (`formula`), arenas 3+ at level 0 (`hint`). Each failed attempt raises the level by one automatically. Hints are always free; using one forfeits the small "No hints" bonus so fluent learners still have something to chase.

## 2. Core loop — seven beats per ring (redesign 2026-10-21)
Each game state has **one** focal point; jungle and architecture are atmosphere, the maths is unmistakable.

| Beat | What happens | Camera | Focus |
|---|---|---|---|
| 1 Anticipation | Pick the ring on the 2D expedition map: route, sector preview, r, θ, guardian speed | — (2D) | the selected medallion |
| 2 Threat | Ring 1: run the causeway over the lake, the small gate opens and slams shut. Later rings: Karan arrives through the open arc and the ring closes behind him (the seal rises). A 2 s establishing shot, then a beat of calm, then **GUARDIANS AWAKEN** | elevated shot from behind Karan; the near walls, gate and their torches cut away, so the whole ring reads with Karan low-centre and the guarded arc at the top | the guarded arc |
| 3 Discovery | A pulsing cyan ring marks the buried hatch; one short objective ("Reach the glowing hatch") | chase cam, locked heading, clamped inside the ring | the hatch |
| 4 Understanding | The hatch splits, a stone drum with a bronze rim rises out of the dark shaft carrying the Sector Cannon (full cinematic the first time, brisk afterwards). Then the dedicated puzzle mode: 0.85 s move to an 85° top-down camera, the world dims and desaturates outside the ring, tall trees sink away, the sector is drawn (radial lines, cyan arc, θ near the centre, r along a radius) and the panel slides in | puzzle camera | the sector + panel |
| 5 Power | FIRE: charge, then the sector laser sweeps exactly the entered area | puzzle camera | the beam |
| 6 Reward | PERFECT SECTOR → a held beat → an amber light path runs from Karan through the arc while the camera rises to frame the next ring; toast with stars and points | rising reveal | the next ring |
| 7 Progression | Overhead chase through the arc into the next ring; the missing arc of that ring rises as a seal behind him | overhead chase | Karan |

Wrong answers keep the LXD's consequences (UNDERCHARGED: survivors pounce; OVERCHARGED: the excess reflects off the wall) and always show a targeted diagnosis + the next hint step. Shields: 3 per ring; 0 → game over → retry the same ring or return to the map.

## 3. Progression — the LXD's final table
Seven arenas with fixed dimensions (π = 22/7, every answer a clean number). Enemy speed is derived from the time budget, so larger rings get faster guardians, exactly as the brief asks. Exit directions zig-zag (right / lower-right / upper-right); where the suggested direction would have made the open arc overlap the entrance arc the turn was softened.

| # | Arena | r (m) | θ | Area | Guardians | Time to the gun | Exit faces | Sky | Scaffold |
|---|---|---|---|---|---|---|---|---|---|
| 1 | The Mossy Gate | 7 | 90° | **38.5** | 5 | 60 s | upper-right (45°) | day | formula + substitution |
| 2 | Fallen Idol | 10.5 | 120° | **115.5** | 10 | 54 s | right (0°) | day | formula |
| 3 | Serpent Court | 14 | 90° | **154** | 10 | 50 s | lower-right (320°) | dusk | hint only |
| 4 | Crimson Ruins | 14 | 135° | **231** | 15 | 46 s | right (0°) | dusk | hint only |
| 5 | Twin Falls | 17.5 | 72° | **192.5** | 10 | 42 s | lower-right (315°) | night | hint only |
| 6 | Thunder Well | 21 | 60° | **231** | 10 | 38 s | upper-right (45°) | night | hint only |
| 7 | The Warden's Court | 21 | 120° | **462** | 20 + the Warden | 34 s | right (0°) → temple | storm | hint only |

### Chain geometry (how the overlap is computed)
- **Lens (the passage).** Ring i's wall is open over θ_i. The passage into ring i+1 is the lens of the two circles, with its angle capped at **64°** (θ ≤ 72° uses θ itself). For equal radii that gives a lens depth of ~15 % of a diameter (12–17 % across the chain), so rings touch without merging. Half-chord c = R·sin(φ/2); the next centre sits h + √(R′² − c²) along the exit direction.
- **Breach bay.** When θ is wider than the lens (arenas 1–4 and 7), an annular-sector bay (R → R + D, D = 3.6–5.5 m) continues the open arc outward. Its two side walls are the sector's radial lines extended, so the danger zone literally continues the sector; the guardians stand in it and in the lens.
- **Walls, pillars, seals from one boolean.** Every wall piece is "ring circle minus explicit openings minus every other disk minus every bay" (sampled at 0.5° and bisection-refined), bay walls are "bay outline minus the next disk", and a pillar stands at every wall end. The seal is the part of ring i+1's own circle that opens toward ring i: it rises out of the floor after Karan passes, so every ring becomes a complete circle again behind him (the seventh seal closes the temple court).
- `validateChain()` checks clean answers, lens depth ≤ 20 % of the smaller diameter, single-piece seals, guardian room at every arc edge, and ≥ 1.5 m between non-neighbouring rings.

## 4. Scoring
`Arena cleared 500` + `Time bonus 0–300` (linear on time spent in the input phase vs. budget) + `No damage 300` + `Perfect shot 200 × waves` (first try on every wave) + `No hints 100`.
Stars: ★★★ perfect first try & no damage · ★★ ≤ 1 shield lost · ★ cleared. Best score and stars per arena are saved (`localStorage`), the map shows them, and the total appears at the temple.

## 5. The Warden (arena 7)
The Sector Warden stands behind the last squad in the open arc of the seventh ring and roars when Karan is noticed. There are no shields any more (the brief's final table has none): a perfect sector destroys the squad and the Warden together; an undercharged shot leaves it standing. It is the "final arena" flavour, not a separate mechanic.

## 6. Presentation modes & cameras
| Mode | Composition |
|---|---|
| **Title** | Locked cinematic shot from the lake, down the causeway to the gate of ring 1 at twilight; the logo and one primary button (Play) in a dark left column; Continue appears only with a save; fireflies and torches are the only motion. No orbit, so no foliage popping |
| **Map** | A designed 2D layer (not the 3D level): darkened painted backdrop, a stone stepping-stone route snaking through seven medallions, START and the temple. Each medallion shows its own sector wedge. States: locked (muted stone), available, selected (amber tracing + slow halo, the only animated element), cleared (cyan seal). A docked right-hand panel holds the name, a mini sector diagram, r / θ / guardian speed, stars and the single Enter button. Phones: vertical route + bottom sheet |
| **Establishing / arena** | Elevated shot from behind Karan (distance 0.55 R + 3, pitch ~55° to Karan). **Camera rule:** whenever the camera is outside the current ring, its wall pieces, gate and torches within ±72° of the camera bearing fade to 8 % (smoothly), so nothing stands between the camera and the player. The run itself uses a behind-the-shoulder chase with a locked heading, clamped inside the ring; pillars that brush the camera fade |
| **Puzzle** | 85° near top-down, FOV 32°, arc pointing up. Distance is solved so the wall **tops** (which project outward) fit: the ring fills the left ~68 % beside the panel (top 58 % on phones). The spotlight darkens (×0.28) and desaturates the world beyond R + 1.6 m (fully by R + 7.5 m); billboards taller than 4 m near the ring sink away; overlay line widths scale with R so they stay crisp |
| **Reward / exit** | The camera rises over the cleared ring to frame the next one while an amber path lights up; then an overhead chase (9 m up) keeps the seal in frame as it rises behind Karan |

All moves are eased; impacts add screen shake.

### Design system
Palette: deep jungle `#142925`, ancient stone `#776F60`, muted moss `#446549`, **temple cyan `#52DED8`** (maths, machinery, completed seals), **active amber `#F4BF55`** (selection, actions, the next objective), warm ivory `#F3EBD8` (text), **threat red `#DC6657`** (guardians, damage, errors). Type: Barlow Condensed for headings and buttons, Poppins for body; the expressive logo is the only comic lettering. One primary (amber) button per screen.

### Jungle (three layers)
1. **Distant forest:** a wide ellipse of tall, dark, low-detail clumps (or `forest_silhouette` sprites).
2. **Canopy masses:** hand-placed clusters of 3–6 trees (or one `jungle_canopy` sprite) on two bands around each ring and behind the lake banks, with deliberate gaps of open ground.
3. **Foreground accents:** sparse rocks and large ferns at the foot of the walls and along the shoreline.
No random scatter; placement is seeded and deterministic. The lake has an irregular shoreline cut into the ground with a mud bank, instead of a hard rectangle edge.

## 7. Audio
Fully procedural (see `docs/sfx/SFX_SPEC.md`): 45 cues, generative music with six modes (title / explore / arena / tension / boss / calm) and a jungle ambience bed with birds and torch crackle. Every learner-facing event has a sound (UI, footsteps, gates, alarm, scan, charge, beam, explosions, ricochet, hurt, stingers). Mute with **M**.

## 8. UX & accessibility
- Input by keyboard or on-screen keypad; fractions accepted; Enter fires.
- Outcomes are redundant across channels: colour (cyan / red / magenta), text stamp, sound stinger, camera shake, HUD shields.
- Captions mirror the wireframe's narrative lines; objective pill tells the player what to do next; cutscenes are skippable; pause menu.
- Responsive: panel becomes a bottom sheet under 760 px; tap-to-move for touch.
- Colour choices keep ≥ 4.5:1 contrast for text on panels.

## 9. Telemetry hooks (recommended next step)
Log per attempt: arena, wave, r, θ, entered value, `status`, `diagnosis.code`, time-to-fire, hint level, shields. This produces the error-type distribution the LXD needs to tune scaffolds and spot systematic misconceptions (e.g. many `full-circle` codes → strengthen the "fraction of the circle" scan animation).

## 10. Tech summary
World: one Three.js scene holds the causeway, all seven rings, the temple court and ~2,000 jungle billboards (trees, plants, rocks) drawn in three instanced draw calls with a vertex-shader billboard, alpha-to-coverage edges and near-camera fading for the top views. Walls are segmented cylinders with openings cut per arc; floors are alpha-tested circles with polygon offset so overlapping lenses never z-fight.
Performance budget: pixel ratio capped at 1.5 and adapted at runtime (drops to 0.75 on slow GPUs, climbs back when frames are fast); at most 4 dynamic torch lights per arena; particle budget of 160 sprites; laser and FX shaders are compiled during arena load so the first shot does not hitch; no per-frame allocations in the hero controller. The floor is an alpha-tested opaque surface, so characters can never sort underneath it.

Three.js r170 (vendored), ES modules, no bundler. Billboard sprite sheets for characters (front/back sheets for the hero), segmented cylinder walls so any arc can sink into the ground (overlapping breaches supported), shader-drawn sector laser (`progress` front, bright edges, stripes), HTML/CSS UI, Web Audio synthesis, Playwright playtests (`playtest/`). All art falls back to procedural canvases so the build is always playable.

## 11. Open questions for the LXD
1. An overcharged shot kills every guardian but still costs a shield and does not clear the arena (the exact area is required to move on). Keep?
4. The waist seals behind Karan with a rising stone slab (the "entrance gate closes and never reopens" beat). It is one flag in `levels.js` if you prefer the waist to stay open.
2. Decimal radii (e.g. 3.5 m) and radian mode for senior classes — trivial to add to `levels.js`.
3. Arc-length variant: the same arena with "energy fence length" instead of area would reuse everything.
