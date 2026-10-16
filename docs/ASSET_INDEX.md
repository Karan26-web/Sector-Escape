# Asset Index – Sector Escape: The Lost Jungle

Every visual asset the game loads, with its spec sheet. **The game runs without any of these files** – a procedural placeholder is drawn for anything missing – so you can produce them in any order. Save each file at the exact `assets/...` path; the game picks it up on reload.

Priority: **P0** core look · **P1** polish · **P2** optional (procedural version is fine).

**Status (2026-10-16):** 36 of 37 assets are installed in `assets/`. Only `gate_large_frame` is missing; the game reuses `gate_small_frame` for the exit gate until it arrives (set via `fallback` in `assets/manifest.json`). Installed files are WebP (converted by `tools/optimize_assets.py`, lossless alpha); the manifest paths therefore end in `.webp`. Source PNG packs, alternates and the concept sheet live outside the project in `../Sector Escape - art source/`.

Shared rules for every prompt are in [STYLE_GUIDE.md](STYLE_GUIDE.md). Verify sprite sheets with `tools/sheet-viewer.html`.

| # | Asset | File | Size | Grid | Prio | Spec |
|---|-------|------|------|------|------|------|
| 1 | Hero – Front sprite sheet | `assets/sprites/hero_front.png` | 2048×1280 | 8×5 (256×256) | P0 | [hero_front.md](assets/hero_front.md) |
| 2 | Hero – Back sprite sheet | `assets/sprites/hero_back.png` | 2048×512 | 8×2 (256×256) | P0 | [hero_back.md](assets/hero_back.md) |
| 3 | Enemy – Sector Sentinel sprite sheet | `assets/sprites/enemy_bot.png` | 2048×1024 | 8×4 (256×256) | P0 | [enemy_bot.md](assets/enemy_bot.md) |
| 4 | Boss – The Sector Warden sprite sheet | `assets/sprites/boss_warden.png` | 4096×1536 | 8×3 (512×512) | P1 | [boss_warden.md](assets/boss_warden.md) |
| 5 | Sector Cannon (pedestal) | `assets/sprites/cannon.png` | 1024×1024 | — | P0 | [cannon.md](assets/cannon.md) |
| 6 | Wall torch – flame flicker sheet | `assets/sprites/torch.png` | 512×256 | 4×1 (128×256) | P0 | [torch.md](assets/torch.md) |
| 7 | Jungle trees – 4 variants | `assets/sprites/jungle_tree.png` | 2048×1024 | 4×1 (512×1024) | P0 | [jungle_tree.md](assets/jungle_tree.md) |
| 8 | Jungle plants – 4 variants | `assets/sprites/jungle_plant.png` | 2048×512 | 4×1 (512×512) | P1 | [jungle_plant.md](assets/jungle_plant.md) |
| 9 | Stone idol statue | `assets/sprites/stone_idol.png` | 512×1024 | — | P1 | [stone_idol.md](assets/stone_idol.md) |
| 10 | Breach rubble – 4 piles | `assets/sprites/rubble.png` | 1024×256 | 4×1 (256×256) | P1 | [rubble.md](assets/rubble.md) |
| 11 | Arena floor (top-down circle) | `assets/textures/arena_floor.png` | 2048×2048 | — | P0 | [arena_floor.md](assets/arena_floor.md) |
| 12 | Arena wall – tileable stone | `assets/textures/arena_wall.png` | 1024×1024 | — | P0 | [arena_wall.md](assets/arena_wall.md) |
| 13 | Wall top rim – tileable | `assets/textures/wall_top.png` | 512×128 | — | P2 | [wall_top.md](assets/wall_top.md) |
| 14 | Jungle ground – tileable | `assets/textures/ground_jungle.png` | 1024×1024 | — | P1 | [ground_jungle.md](assets/ground_jungle.md) |
| 15 | Dirt path – tileable strip | `assets/textures/path_dirt.png` | 512×1024 | — | P1 | [path_dirt.md](assets/path_dirt.md) |
| 16 | Jungle backdrop – 360° panorama | `assets/textures/jungle_panorama.png` | 4096×1024 | — | P0 | [jungle_panorama.md](assets/jungle_panorama.md) |
| 17 | Sky gradient with clouds | `assets/textures/sky.png` | 1024×512 | — | P2 | [sky.md](assets/sky.md) |
| 18 | Entrance gate – stone frame | `assets/textures/gate_small_frame.png` | 1024×1024 | — | P0 | [gate_small_frame.md](assets/gate_small_frame.md) |
| 19 | Entrance gate – door leaf | `assets/textures/gate_small_door.png` | 512×1024 | — | P0 | [gate_small_door.md](assets/gate_small_door.md) |
| 20 | Exit gate – ornate stone frame | `assets/textures/gate_large_frame.png` | 2048×2048 | — | P0 | [gate_large_frame.md](assets/gate_large_frame.md) |
| 21 | Exit gate – metal door leaf | `assets/textures/gate_large_door.png` | 1024×2048 | — | P0 | [gate_large_door.md](assets/gate_large_door.md) |
| 22 | Energy lock glyph | `assets/textures/energy_lock.png` | 512×512 | — | P1 | [energy_lock.md](assets/energy_lock.md) |
| 23 | Explosion sprite sheet | `assets/sprites/fx_explosion.png` | 2048×256 | 8×1 (256×256) | P0 | [fx_explosion.md](assets/fx_explosion.md) |
| 24 | Spark particle | `assets/sprites/fx_spark.png` | 128×128 | — | P2 | [fx_spark.md](assets/fx_spark.md) |
| 25 | Glow sprite | `assets/sprites/fx_glow.png` | 256×256 | — | P2 | [fx_glow.md](assets/fx_glow.md) |
| 26 | Smoke puff | `assets/sprites/fx_smoke.png` | 256×256 | — | P2 | [fx_smoke.md](assets/fx_smoke.md) |
| 27 | Shockwave ring | `assets/sprites/fx_shockwave.png` | 512×512 | — | P2 | [fx_shockwave.md](assets/fx_shockwave.md) |
| 28 | Laser gradient | `assets/sprites/fx_laser.png` | 256×64 | — | P2 | [fx_laser.md](assets/fx_laser.md) |
| 29 | Game logo | `assets/ui/logo.png` | 1600×900 | — | P0 | [ui_logo.md](assets/ui_logo.md) |
| 30 | Story parchment panel | `assets/ui/parchment.png` | 1024×768 | — | P1 | [ui_parchment.md](assets/ui_parchment.md) |
| 31 | Story illustration (polaroid) | `assets/ui/story_illustration.png` | 800×600 | — | P1 | [ui_story_art.md](assets/ui_story_art.md) |
| 32 | World map – jungle | `assets/ui/map_bg.png` | 1920×1080 | — | P1 | [ui_map_bg.md](assets/ui_map_bg.md) |
| 33 | Map arena nodes – 4 states | `assets/ui/map_node.png` | 1024×256 | 4×1 (256×256) | P1 | [ui_map_node.md](assets/ui_map_node.md) |
| 34 | Map player marker | `assets/ui/map_marker.png` | 256×256 | — | P1 | [ui_map_marker.md](assets/ui_map_marker.md) |
| 35 | Map destination temple | `assets/ui/map_temple.png` | 512×512 | — | P1 | [ui_map_temple.md](assets/ui_map_temple.md) |
| 36 | HUD shields – full / empty | `assets/ui/shield.png` | 256×128 | 2×1 (128×128) | P1 | [ui_shield.md](assets/ui_shield.md) |
| 37 | HUD icon set | `assets/ui/icons.png` | 1024×128 | 8×1 (128×128) | P1 | [ui_icons.md](assets/ui_icons.md) |

## Where each asset shows up

- **Hero – Front sprite sheet** — The player character whenever they face the camera (idle at the cannon, hurt, victory, activating the cannon).
- **Hero – Back sprite sheet** — The player character seen from behind: running along the jungle path, entering the arena, running to the cannon, facing the enemy breach.
- **Enemy – Sector Sentinel sprite sheet** — Every enemy robot: pours through the breach, marches toward the cannon, lunges at the hero, explodes when hit by the laser.
- **Boss – The Sector Warden sprite sheet** — Final arena boss standing in front of the exit gate behind three energy shields.
- **Sector Cannon (pedestal)** — The ancient cannon fixed in the centre of every arena. Drawn as a billboard, so it must read well from any horizontal angle and from above.
- **Wall torch – flame flicker sheet** — Torches mounted around the inner arena wall (animated flame).
- **Jungle trees – 4 variants** — Billboard trees scattered outside the arenas and along the jungle paths.
- **Jungle plants – 4 variants** — Ferns and bushes along the paths and around arena walls.
- **Stone idol statue** — Two idols flank each arena entrance outside the wall.
- **Breach rubble – 4 piles** — Small rubble piles left on the floor where a wall section collapsed (breach).
- **Arena floor (top-down circle)** — The circular stone floor of every arena, seen mostly from the tactical top view. The circle must touch the image edges; everything outside the circle transparent.
- **Arena wall – tileable stone** — Inner and outer faces of the circular arena wall; one tile spans the full wall height (≈7 m) and repeats horizontally.
- **Wall top rim – tileable** — The flat top of the arena wall (seen from the tactical view).
- **Jungle ground – tileable** — Ground plane outside the arenas (repeats many times — keep it low-contrast).
- **Dirt path – tileable strip** — The jungle path leading into each entrance gate and out of each exit gate (repeats along its length).
- **Jungle backdrop – 360° panorama** — Wrapped around the whole world as a cylinder: distant jungle, mist and ruins seen beyond the arena walls. Must tile left↔right.
- **Sky gradient with clouds** — Optional sky dome texture (the game tints it for day/dusk/night/storm).
- **Entrance gate – stone frame** — The small entrance gate of every arena. The arched opening MUST be transparent: the door (separate asset) and the world are visible through it.
- **Entrance gate – door leaf** — The wooden door that slides down into the ground when the entrance opens.
- **Exit gate – ornate stone frame** — The large locked exit gate opposite the entrance. The arched opening MUST be transparent.
- **Exit gate – metal door leaf** — Each of the two exit-gate leaves (the image is used for both; they slide apart sideways).
- **Energy lock glyph** — Glowing red lock symbol floating on the exit gate; shatters when the perfect sector blast breaks the energy lock.
- **Explosion sprite sheet** — Robot destruction and boss explosions.
- **Spark particle** — Additive spark particles.
- **Glow sprite** — Cannon crystal glow, flashes, beam heads.
- **Smoke puff** — Dust puffs when running, smoke after explosions.
- **Shockwave ring** — Expanding floor rings: cannon activation, emergency pulse, tap-to-move marker.
- **Laser gradient** — Optional gradient used by beam ribbons (the sector laser itself is a shader).
- **Game logo** — Title screen and loading screen.
- **Story parchment panel** — Background of the story/introduction panel (text is rendered by the game on top).
- **Story illustration (polaroid)** — The photo pinned on the story parchment.
- **World map – jungle** — Background of the level map. The game draws the dotted path, the 7 arena nodes, START (bottom-left) and DESTINATION (bottom-right) on top — leave those zones uncluttered.
- **Map arena nodes – 4 states** — Arena markers on the map.
- **Map player marker** — The hero's position on the map.
- **Map destination temple** — Destination icon at the end of the map path.
- **HUD shields – full / empty** — Health indicator (3 shields).
- **HUD icon set** — HUD and results icons.
