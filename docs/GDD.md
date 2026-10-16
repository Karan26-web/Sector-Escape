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

**Tolerance.** Correct if |entered − exact| ≤ max(0.5 m², 0.5 %). This accepts 153.86 for 154 (π = 3.14 or 3.1416) without accepting genuine slips. Fractions such as `616/4` are accepted as input.

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

## 2. Core loop (as implemented)
| # | Beat | Camera / view | Audio |
|---|---|---|---|
| 1 | **Approach** — hero auto-runs along the jungle path to the small gate (skippable) | behind-the-shoulder follow | jungle ambience, explore music, grass footsteps |
| 2 | **Enter** — gate opens, hero walks in, gate slams shut | follow → pull-back reveal of the arena and the locked exit (caption "You are trapped!") | stone grind, slam, stone footsteps |
| 3 | **Alert** — "ENEMIES INCOMING!"; a curved wall section sinks into the ground; guardians pour in | quick swing to the breach | klaxon, collapse rumble, bot stomps |
| 4 | **Run to the cannon** — player-controlled (WASD / tap); beacon marks the centre; auto-assist after 9 s idle | follow | music → arena |
| 5 | **Activate** — hero slams the crystal; shockwave | close-up | power-up hum |
| 6 | **Tactical view** — camera sweeps up to a 64° top view with the breach at the top of the screen; the arena sits left of the panel | 1.7 s cinematic move | whoosh, music → tension |
| 7 | **Scan** — radar sweep → two low-opacity radial lines to the breach ends → angle arc with "θ = 90°" counting up → radius line with ticks and "r = 14 m" | tactical | sweep, pings, label pops |
| 8 | **Input** — Sector Cannon panel (formula per scaffold, values, keypad, FIRE, hint). Enemy-advance bar shows the time pressure | tactical | keypad ticks |
| 9 | **FIRE** — 1.35 s charge, then the sector laser expands from the centre | shake, flash | charge, blast, beam hum |
| 10a | **Perfect** — beam fills the breach; all guardians explode (staggered by distance); wall impact arc; energy lock shatters; "PERFECT SHOT!" | tactical | explosions, lock break, perfect stinger |
| 10b | **Undercharged** — narrower beam; edge guardians survive, leap at the hero (arc jump), −1 shield; emergency pulse clears them; wave re-enters | tactical | fail stinger, lunge, hit, pulse |
| 10c | **Overcharged** — wider beam; magenta excess hits the wall, red beams travel back to the centre, −1 shield; wave re-enters | tactical | fail stinger, ricochet zap, hit |
| 11 | **Exit** — camera returns behind the hero, exit doors slide apart, hero runs out through the gate | follow | unlock chime, music → explore |
| 12 | **Results** — Time bonus / No damage / Perfect shot / No hints, stars, total; map marker walks to the next arena | 2D | fanfare, counters, stars |

Shields: 3 per arena (reset on every arena). 0 shields → *Game over* → **Retry arena** (restarts at the alert, skipping the approach) or **Back to map**.

## 3. Progression
Seven arenas placed on the LXD's sketched map (positions traced from the sketch, start bottom-left → destination temple bottom-right). All answers are whole numbers.

| # | Arena | r (m) | θ | Area | Guardians | Time to reach cannon | Breach | Scaffold | New |
|---|---|---|---|---|---|---|---|---|---|
| 1 | The Mossy Gate | 14 | 90° | **154** | 10 | 100 s | NE | formula + values | tutorial pacing |
| 2 | Fallen Idol | 14 | 180° | **308** | 20 | 90 s | E (half the wall) | formula | semicircle, gates off-axis |
| 3 | Serpent Court | 21 | 60° | **231** | 10 | 80 s | W | hint-only | new radius, dusk |
| 4 | Crimson Ruins | 21 | 120° | **462** | 20 | 70 s | NE | hint-only | wide breach, less time |
| 5 | Twin Breach | 28 | 45° → 135° | **308 → 924** | 10 → 24 | 65 / 60 s | NE then SW | hint-only | two consecutive waves, night |
| 6 | Thunder Well | 35 | 72° | **770** | 20 | 55 s | E | hint-only | largest ring, fastest |
| 7 | The Warden's Arena (boss) | 28 | 90° → 135° → 45° | **616 → 924 → 308** | 20 → 24 → 10 | 60 / 55 / 50 s | varies | hint-only | three sector shields |

Difficulty levers (all in `src/game/levels.js`): time budget (bot arrival), bot count (≈ one per 2.2 m of breach arc, 4–24), θ variety, radius (changes the whole arena size and camera height), number of waves, scaffold level, environment (day/dusk/night/storm, torches, fog).

Wave timing: guardians spawn in 2–3 rows just outside the breach and lurch toward the centre so that the first arrives after the arena's time budget (retries use 85 % of it). The HUD "Enemy advance" bar is the visible timer.

## 4. Scoring
`Arena cleared 500` + `Time bonus 0–300` (linear on time spent in the input phase vs. budget) + `No damage 300` + `Perfect shot 200 × waves` (first try on every wave) + `No hints 100`.
Stars: ★★★ perfect first try & no damage · ★★ ≤ 1 shield lost · ★ cleared. Best score and stars per arena are saved (`localStorage`), the map shows them, and the total appears at the temple.

## 5. The boss — The Sector Warden
A 6.5 m elite guardian stands in front of the exit behind three rotating violet energy shields. Each wave is a different breach (θ = 90°, 135°, 45° with r = 28). A perfect blast destroys the wave *and* shatters one shield (the wave's bots are its power source). After the third, the Warden overloads and explodes, the lock breaks and the final gate opens. Wrong answers cost shields exactly as in other arenas, so the boss is a mastery check of three sectors in a row.

## 6. Dynamic camera (the "move to the top view")
| Pose | Position | Used |
|---|---|---|
| Follow (behind) | 6.5 m behind the hero, 3.2 m up, looking 6 m ahead, FOV 56 | approach, run, exit |
| Reveal | just behind the hero, 4.2 m up, looking at the far gate, FOV 62 | "You are trapped!" |
| Alert | over the hero's shoulder toward the breach | breach opening |
| **Tactical** | 2.5 R from the centre at 64° pitch, on the side opposite the breach so the breach is **up**; aim point shifted 0.3 R to the right so the arena sits left of the panel (shifted toward the camera on phones, where the panel is a bottom sheet), FOV 50 | scan, input, fire, results of the shot |
All moves are eased (`inOutCubic`, 0.6–1.7 s); impacts add screen shake.

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
Three.js r170 (vendored), ES modules, no bundler. Billboard sprite sheets for characters (front/back sheets for the hero), segmented cylinder walls so any arc can sink into the ground (overlapping breaches supported), shader-drawn sector laser (`progress` front, bright edges, stripes), HTML/CSS UI, Web Audio synthesis, Playwright playtests (`playtest/`). All art falls back to procedural canvases so the build is always playable.

## 11. Open questions for the LXD
1. Should the over-charge also *open* the gate (all enemies die) at the cost of a shield, or stay locked as now (exact answer required to progress)? Current: locked — it keeps "exact" as the goal.
2. Decimal radii (e.g. 3.5 m) and radian mode for senior classes — trivial to add to `levels.js`.
3. Arc-length variant: the same arena with "energy fence length" instead of area would reuse everything.
