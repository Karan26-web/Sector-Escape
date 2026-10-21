# Sound Design Spec – Sector Escape

Every sound below is **synthesised at runtime** (Web Audio, `src/engine/audio.js`), so the game is fully voiced with zero audio files. To replace any of them with produced audio, drop the file into `assets/sfx/` and map it in `assets/manifest.json`:

```json
"sfx": { "cannon.fire": "sfx/cannon_fire.mp3", "bot.explode": "sfx/bot_explode.ogg" }
```
Files are decoded on load and take precedence over the synth version with the same name. Music and ambience are generative; a produced loop can be added the same way under `"music"` (hook: `audio.loadFiles`).

Mixing: master limiter → buses `sfx` (0.85), `music` (0.26), `ambient` (0.4). Mute: HUD button or **M**; persisted in `localStorage`.

Anti-fatigue rules (tuned 2026-10-19 after playtest feedback about sounds "here and there"):
- Sentinel footsteps share one global cooldown (max ~2 per second, quiet), instead of one per bot.
- Simultaneous explosions are volume-scaled by 1/√(count/3), so a 24-bot perfect shot does not clip.
- Hover blips only on the big action buttons (Play, Enter, FIRE…), never on keypad keys.
- Insect bed and torch crackles are kept very low; arena mode drops them further.
- Music pad notes stop only after their release (no click at every bar), the tension arpeggio is a soft triangle, and the sequencer skips missed notes after the tab was hidden instead of replaying them in a burst.
- Charge, gate-grind and beam-hum sounds use low filter resonance to avoid whine.

## SFX cue list
| Name | Moment | Character (what it should sound like) | Length | Generation prompt (for an SFX model) |
|---|---|---|---|---|
| `ui.hover` | pointer over a button | tiny soft blip | 50 ms | "very short soft UI hover blip, high pitched sine, subtle" |
| `ui.click` | any button | snappy click + low thock | 80 ms | "crisp cartoon UI click with a wooden thock" |
| `ui.confirm` | Play / Enter Arena / FIRE pressed | two rising notes | 250 ms | "short two-note rising confirmation chime, bright, game UI" |
| `ui.back` | back / cancel | two falling notes | 220 ms | "short two-note descending UI blip" |
| `ui.error` | invalid input, locked node | buzzy low double tone | 350 ms | "short negative buzzer, cartoon, low, two pulses" |
| `ui.type` | each digit typed / keypad | tiny tick | 25 ms | "single tiny keypad tick, dry" |
| `ui.panel` | cannon panel slides in | airy whoosh up | 280 ms | "quick airy swipe whoosh rising, UI panel slide" |
| `ui.whoosh` | camera swings to tactical view | bigger cinematic whoosh | 400 ms | "cinematic camera swoosh, airy, medium" |
| `ui.stamp` | result stamp slams in | heavy thud + paper slap | 180 ms | "rubber stamp slam on desk, punchy low thud" |
| `ui.star` | star appears on results | sparkle ding | 300 ms | "magical sparkle ding, two quick high notes" |
| `ui.count` | score counting up | tick | 30 ms | "fast counter tick, tiny, dry" |
| `step.grass` / `step.stone` | hero footsteps outside / inside | soft grass rustle / stone tap | 80–90 ms | "single footstep on grass, light" / "single footstep on stone tile, light" |
| `bot.step` | sentinel stomp (closest bots only) | metallic clank + sub thump | 120 ms | "heavy robot footstep, metallic clank with low thump" |
| `gate.open` | entrance opens, breach seals | stone grinding rumble, final clunk | 1.6 s | "massive stone door sliding open, grinding rumble, ends with a heavy clunk" |
| `gate.close` | entrance locks behind the player | grind then deep slam | 1.1 s | "stone door sliding shut and slamming, deep impact, dust" |
| `gate.slam` | the entrance gate shuts behind Karan | short grind then a very heavy slam, settling rumble | 1.3 s | "heavy wooden gate slamming shut in a stone arch, deep thud, rumble" |
| `seal.slam` | the stone slab seals the waist behind Karan | rising rumble → massive slam → falling debris | 1.6 s | "massive stone slab rising and locking into place, deep boom, falling pebbles" |
| `hatch.open` | the floor hatch splits open | click, stone grind with hiss, clunk | 1.3 s | "stone hatch sliding open, grinding, hydraulic hiss, clunk" |
| `gun.rise` | the Sector Laser Gun rises from the floor | rising mechanical rumble, lock clunk, chime | 1.8 s | "ancient machine rising from the ground, rumble, metal lock, crystalline chime" |
| `bots.notice` | the guardians notice Karan | three rising blips + low growl swell | 0.9 s | "robots powering up to alert, three rising beeps, low electric growl" |
| `gate.unlock` | exit lock disengages | ascending 4-note chime + shimmer | 1.3 s | "ancient mechanism unlocking, ascending magical chime with shimmer" |
| `breach.open` | wall section collapses | long rumble + cracking stones | 2.2 s | "stone wall collapsing into the ground, rumble, cracking rocks, debris" |
| `alarm` | ENEMIES INCOMING | two-tone klaxon ×4 | 0.8 s | "retro two-tone alarm klaxon, four pulses, cartoon" |
| `cannon.activate` | hero slams the crystal | click, rising power hum | 1.6 s | "ancient machine powering up, rising hum with a crystalline shimmer" |
| `scan.sweep` | radar sweep over the arena | sine sweep with tremolo | 1.1 s | "sci-fi radar sweep, rising tone with soft tremolo" |
| `scan.ping` | radial lines / radius line appear | sonar ping with echo | 400 ms | "clean sonar ping with a short echo" |
| `label.pop` | θ / r label pops | tiny pop | 50 ms | "small UI pop, bubble-like" |
| `torch` | ambient (arena) | soft crackle | 60 ms | "single soft fire crackle" |
| `cannon.charge` | after FIRE, 1.35 s build-up | rising saw, filter opening, pulsing sub | 1.4 s | "energy cannon charging up, rising pitch, pulsing sub bass, builds to a peak" |
| `cannon.fire` | laser release | huge burst, descending boom, distorted saw | 0.7 s | "massive sci-fi energy cannon blast, deep boom with a sharp crack" |
| `laser.loop` | while the beam is on | layered saw hum + hiss | loop ~1.5 s | "sustained energy beam hum, layered, electric hiss" |
| `bot.explode` | each sentinel destroyed | noisy burst, low drop, metallic ring | 450 ms | "small robot exploding, metallic debris, cartoon explosion" |
| `bot.lunge` | survivors leap at the hero | whoosh + rising saw | 350 ms | "robot leaping, mechanical whoosh" |
| `bot.hit` | a sentinel lands on the hero | heavy impact | 220 ms | "heavy metallic body impact, punchy" |
| `reflect.zap` | excess energy bounces off the wall | FM zap up then down + hiss | 550 ms | "sci-fi laser ricochet zap, electric, bouncing" |
| `reflect.hit` | reflected beam hits the hero | impact + electric buzz | 500 ms | "electric shock impact on a person, buzz, cartoon" |
| `player.hurt` | any damage | low thud, noise, descending saw | 350 ms | "cartoon hero hurt impact, low thud with a descending whine" |
| `shield.break` | a shield icon is lost | glass shatter + ringing | 350 ms | "energy shield shattering like glass, ringing shards" |
| `pulse` | emergency pulse clears attackers | sub drop + rising sweep + noise | 600 ms | "energy shockwave pulse, deep sub drop with a rising sweep" |
| `lock.break` | perfect shot breaks the energy lock | power-down → shatter → chime | 1.4 s | "force field powering down then shattering, followed by an unlock chime" |
| `boss.roar` | Warden intro / taunts | distorted layered roar + vibrato | 1.8 s | "giant robot roar, distorted, metallic, menacing" |
| `boss.shield.break` | a Warden shield breaks | shatter + descending saw | 0.9 s | "large energy shield shattering with a descending tone" |
| `boss.defeat` | Warden destroyed | chain explosions, final boom, chime | 3.5 s | "chain of explosions culminating in a huge boom, then a triumphant chime" |
| `sting.perfect` | PERFECT SHOT | major arpeggio + chord | 1.2 s | "triumphant short major-key stinger, bright, 4 rising notes" |
| `sting.fail` | UNDERCHARGED / OVERCHARGED / TOO SLOW | descending minor 4 notes + sub | 1.2 s | "short failure stinger, descending notes, not harsh" |
| `sting.clear` | arena cleared | fanfare with timpani | 2.2 s | "short victory fanfare, brass-like with timpani hits" |
| `sting.gameover` | shields depleted | low minor triad + rumble | 2.5 s | "sombre game over stinger, low minor chord with rumble" |
| `sting.wave` | second breach | alarm hits + rising tone | 0.9 s | "two alarm hits and a rising tension tone" |
| `sting.boss` | boss reveal | roar + low brass motif | 2.2 s | "boss reveal stinger, roar with ominous low brass" |

## Music (generative, `MusicPlayer`)
D-minor pentatonic jungle-adventure loop at 96–118 BPM made of layers that fade per mode:

| Mode | When | Layers |
|---|---|---|
| `title` | title screen | pad, light bass, light percussion, lead melody |
| `explore` | approach, exit run, results | pad, bass, log-drum percussion, marimba-like lead |
| `arena` | inside the arena before the cannon is active | pad, driving bass, full percussion, soft arp |
| `tension` | input phase (104 BPM) | darker chords (D–B♭–A), pulsing bass, hats, 16th-note arp |
| `boss` | Warden arena (118 BPM) | all layers, minor progression, toms |
| `calm` | pause / game over | pad + sparse lead |

Produced-music guidance if you replace it: 2–3 stems (bed / percussion / tension arp) at the same tempo so the game can still crossfade by intensity.

## Ambience (`AmbientPlayer`)
- **causeway**: jungle bed plus gentle water lapping (low-passed noise with a slow swell).
- **jungle**: wind (filtered noise with slow LFO), insects (narrow band-pass chirr), random bird calls panned left/right every few seconds.
- **arena**: same bed, quieter, plus a low stone-chamber drone and torch crackles.
- **boss**: louder drone.
