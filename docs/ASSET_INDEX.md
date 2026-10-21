# Asset Index – Sector Escape: The Lost Jungle

Every visual asset the game loads, with its spec sheet. **The game runs without any of these files** – a procedural placeholder is drawn for anything missing – so you can produce them in any order. Save each file at the exact `assets/...` path (PNG), then run `python3 tools/optimize_assets.py` to convert to WebP and update the manifest.

**Status (2026-10-21, final):** all assets are installed, including the redesign set (`jungle_canopy`, `forest_silhouette`, `wall_pillar`, the dusk `ui_map_bg`) and new versions of `causeway_stone`, `causeway_side`, `water`, `floor_hatch`, `seal_slab` and `jungle_rocks`. Every sprite sheet carries a measured `baseline` in `assets/manifest.json` so characters and plants stand on the ground. `wall_pillar` is not drawn as a sprite: the game cuts it into capital / shaft / base bands and wraps them around the 3D junction columns. Retired: `gate_large_door`, `energy_lock`; `gate_large_frame` is the temple gate.

Priority: **P0** core look · **P1** polish · **P2** optional (procedural version is fine).

Shared rules for every prompt are in [STYLE_GUIDE.md](STYLE_GUIDE.md). Verify sprite sheets with `tools/sheet-viewer.html`.

| # | Asset | File | Size | Grid | Prio | Spec |
|---|-------|------|------|------|------|------|
| 1 | Hero – Front sprite sheet | `assets/sprites/hero_front.png` | 2048×1280 | 8×5 (256×256) | P0 | [hero_front.md](assets/hero_front.md) |
| 2 | Hero – Back sprite sheet | `assets/sprites/hero_back.png` | 2048×512 | 8×2 (256×256) | P0 | [hero_back.md](assets/hero_back.md) |
| 3 | Enemy – Sector Sentinel sprite sheet | `assets/sprites/enemy_bot.png` | 2048×1024 | 8×4 (256×256) | P0 | [enemy_bot.md](assets/enemy_bot.md) |
| 4 | Boss – The Sector Warden sprite sheet | `assets/sprites/boss_warden.png` | 4096×1536 | 8×3 (512×512) | P1 | [boss_warden.md](assets/boss_warden.md) |
| 5 | Sector Laser Gun (pedestal) | `assets/sprites/cannon.png` | 1024×1024 | — | P0 | [cannon.md](assets/cannon.md) |
| 6 | Wall torch – flame flicker sheet | `assets/sprites/torch.png` | 512×256 | 4×1 (128×256) | P0 | [torch.md](assets/torch.md) |
| 7 | Jungle trees – 4 variants | `assets/sprites/jungle_tree.png` | 2048×1024 | 4×1 (512×1024) | P0 | [jungle_tree.md](assets/jungle_tree.md) |
| 8 | Jungle plants – 4 variants | `assets/sprites/jungle_plant.png` | 2048×512 | 4×1 (512×512) | P1 | [jungle_plant.md](assets/jungle_plant.md) |
| 9 | Stone idol statue | `assets/sprites/stone_idol.png` | 512×1024 | — | P1 | [stone_idol.md](assets/stone_idol.md) |
| 10 | Rubble – 4 piles | `assets/sprites/rubble.png` | 1024×256 | 4×1 (256×256) | P2 | [rubble.md](assets/rubble.md) |
| 11 | Canopy masses – 4 clustered tree groups (redesigned foliage) | `assets/sprites/jungle_canopy.png` | 2048×1024 | 4×1 (512×1024) | P1 | [jungle_canopy.md](assets/jungle_canopy.md) |
| 12 | Distant forest silhouettes – 4 variants (redesigned foliage) | `assets/sprites/forest_silhouette.png` | 2048×1024 | 4×1 (512×1024) | P2 | [forest_silhouette.md](assets/forest_silhouette.md) |
| 13 | Jungle boulders – 4 variants | `assets/sprites/jungle_rocks.png` | 2048×512 | 4×1 (512×512) | P0 | [jungle_rocks.md](assets/jungle_rocks.md) |
| 14 | Stone pillar (wall junction) | `assets/sprites/wall_pillar.png` | 256×1024 | — | P2 | [wall_pillar.md](assets/wall_pillar.md) |
| 15 | Arena floor (top-down circle) | `assets/textures/arena_floor.png` | 2048×2048 | — | P0 | [arena_floor.md](assets/arena_floor.md) |
| 16 | Arena wall – tileable stone | `assets/textures/arena_wall.png` | 1024×1024 | — | P0 | [arena_wall.md](assets/arena_wall.md) |
| 17 | Wall top rim – tileable | `assets/textures/wall_top.png` | 512×128 | — | P2 | [wall_top.md](assets/wall_top.md) |
| 18 | Jungle ground – tileable | `assets/textures/ground_jungle.png` | 1024×1024 | — | P1 | [ground_jungle.md](assets/ground_jungle.md) |
| 19 | Dirt path – tileable strip | `assets/textures/path_dirt.png` | 512×1024 | — | P2 | [path_dirt.md](assets/path_dirt.md) |
| 20 | Jungle backdrop – 360° panorama | `assets/textures/jungle_panorama.png` | 4096×1024 | — | P0 | [jungle_panorama.md](assets/jungle_panorama.md) |
| 21 | Sky gradient with clouds | `assets/textures/sky.png` | 1024×512 | — | P2 | [sky.md](assets/sky.md) |
| 22 | Jungle water – tileable | `assets/textures/water.png` | 512×512 | — | P0 | [water.md](assets/water.md) |
| 23 | Stone causeway deck – tileable strip | `assets/textures/causeway_stone.png` | 512×1024 | — | P0 | [causeway_stone.md](assets/causeway_stone.md) |
| 24 | Causeway parapet – tileable | `assets/textures/causeway_side.png` | 1024×256 | — | P1 | [causeway_side.md](assets/causeway_side.md) |
| 25 | Floor hatch (buried gun cap) | `assets/textures/floor_hatch.png` | 512×512 | — | P0 | [floor_hatch.md](assets/floor_hatch.md) |
| 26 | Seal slab (trap closes behind Karan) | `assets/textures/seal_slab.png` | 1024×1024 | — | P1 | [seal_slab.md](assets/seal_slab.md) |
| 27 | Entrance gate – stone frame | `assets/textures/gate_small_frame.png` | 1024×1024 | — | P0 | [gate_small_frame.md](assets/gate_small_frame.md) |
| 28 | Entrance gate – door leaf | `assets/textures/gate_small_door.png` | 512×1024 | — | P0 | [gate_small_door.md](assets/gate_small_door.md) |
| 29 | Temple gate – ornate stone frame | `assets/textures/gate_large_frame.png` | 2048×2048 | — | P0 | [gate_large_frame.md](assets/gate_large_frame.md) |
| 30 | [RETIRED] Exit gate – metal door leaf | `assets/textures/gate_large_door.png` | 1024×2048 | — | P2 | [gate_large_door.md](assets/gate_large_door.md) |
| 31 | [RETIRED] Energy lock glyph | `assets/textures/energy_lock.png` | 512×512 | — | P2 | [energy_lock.md](assets/energy_lock.md) |
| 32 | Explosion sprite sheet | `assets/sprites/fx_explosion.png` | 2048×256 | 8×1 (256×256) | P0 | [fx_explosion.md](assets/fx_explosion.md) |
| 33 | Spark particle | `assets/sprites/fx_spark.png` | 128×128 | — | P2 | [fx_spark.md](assets/fx_spark.md) |
| 34 | Glow sprite | `assets/sprites/fx_glow.png` | 256×256 | — | P2 | [fx_glow.md](assets/fx_glow.md) |
| 35 | Smoke puff | `assets/sprites/fx_smoke.png` | 256×256 | — | P2 | [fx_smoke.md](assets/fx_smoke.md) |
| 36 | Shockwave ring | `assets/sprites/fx_shockwave.png` | 512×512 | — | P2 | [fx_shockwave.md](assets/fx_shockwave.md) |
| 37 | Laser gradient | `assets/sprites/fx_laser.png` | 256×64 | — | P2 | [fx_laser.md](assets/fx_laser.md) |
| 38 | Game logo | `assets/ui/logo.png` | 1600×900 | — | P0 | [ui_logo.md](assets/ui_logo.md) |
| 39 | Story parchment panel | `assets/ui/parchment.png` | 1024×768 | — | P1 | [ui_parchment.md](assets/ui_parchment.md) |
| 40 | Story illustration (polaroid) | `assets/ui/story_illustration.png` | 800×600 | — | P1 | [ui_story_art.md](assets/ui_story_art.md) |
| 41 | Map backdrop – painted jungle | `assets/ui/map_bg.png` | 1920×1080 | — | P1 | [ui_map_bg.md](assets/ui_map_bg.md) |
| 42 | Overview arena badges – 4 states | `assets/ui/map_node.png` | 1024×256 | 4×1 (256×256) | P1 | [ui_map_node.md](assets/ui_map_node.md) |
| 43 | Overview player marker | `assets/ui/map_marker.png` | 256×256 | — | P2 | [ui_map_marker.md](assets/ui_map_marker.md) |
| 44 | Temple icon | `assets/ui/map_temple.png` | 512×512 | — | P2 | [ui_map_temple.md](assets/ui_map_temple.md) |
| 45 | HUD shields – full / empty | `assets/ui/shield.png` | 256×128 | 2×1 (128×128) | P1 | [ui_shield.md](assets/ui_shield.md) |
| 46 | HUD icon set | `assets/ui/icons.png` | 1024×128 | 8×1 (128×128) | P1 | [ui_icons.md](assets/ui_icons.md) |

## Where each asset shows up

- **Hero – Front sprite sheet** — The player character whenever he faces the camera (idle beside the gun, hurt, victory, activating the gun).
- **Hero – Back sprite sheet** — The player character seen from behind: running along the causeway, into the arena, to the gun and through the open arcs.
- **Enemy – Sector Sentinel sprite sheet** — Every guardian: stands in the open arc, notices Karan, marches toward the gun, lunges at him, explodes when hit by the laser.
- **Boss – The Sector Warden sprite sheet** — Final-arena guardian standing behind the last squad in the open arc; destroyed by the perfect blast.
- **Sector Laser Gun (pedestal)** — The ancient gun that rises from under the floor hatch at the centre of every arena. A billboard, so it must read well from any horizontal angle and from above.
- **Wall torch – flame flicker sheet** — Torches on the arena walls and on posts along the causeway (animated flame).
- **Jungle trees – 4 variants** — Hundreds of billboard trees ringing every arena and crowding both banks of the causeway (instanced).
- **Jungle plants – 4 variants** — Ferns and bushes at the foot of the walls and along the causeway banks.
- **Stone idol statue** — Decorative idols (currently unused by the chain layout; kept for set dressing).
- **Rubble – 4 piles** — Small rubble piles (set dressing).
- **Canopy masses – 4 clustered tree groups (redesigned foliage)** — Layer 2 of the redesigned jungle: hand-placed canopy masses that frame the rings and the causeway with gaps of open ground between them. One sprite replaces a 3–6 tree cluster (the game switches automatically when this file exists).
- **Distant forest silhouettes – 4 variants (redesigned foliage)** — Layer 1 of the redesigned jungle: tall dark silhouettes far beyond the rings that give depth without detail (the game switches automatically when this file exists).
- **Jungle boulders – 4 variants** — Rocks that hug every arena wall and line both banks of the causeway so Karan feels hemmed in (instanced, hundreds on screen).
- **Stone pillar (wall junction)** — The carved columns where two arena walls meet. The game slices this art into capital / shaft / base bands (by the opaque width of each row) and wraps them around three stacked cylinders, so keep the capital and base clearly wider than the shaft.
- **Arena floor (top-down circle)** — The circular stone floor of every arena, seen mostly from the tactical top view. The circle must touch the image edges; everything outside the circle transparent.
- **Arena wall – tileable stone** — Inner and outer faces of the circular arena walls and the junction pillars; one tile spans the wall height (6.5 m) and repeats horizontally.
- **Wall top rim – tileable** — The flat top of the arena walls and pillar caps (seen from the tactical view).
- **Jungle ground – tileable** — Ground plane outside the arenas (repeats many times — keep it low-contrast).
- **Dirt path – tileable strip** — Unused by the chain layout (the causeway and temple path use causeway_stone). Kept for set dressing.
- **Jungle backdrop – 360° panorama** — Wrapped around the whole world as a cylinder: distant jungle, mist and ruins beyond the walls. Must tile left↔right.
- **Sky gradient with clouds** — Sky dome texture (tinted for day/dusk/night/storm as Karan moves through the chain).
- **Jungle water – tileable** — The lake under the stone causeway (two scrolling layers: base + additive shimmer).
- **Stone causeway deck – tileable strip** — The walking surface of the Temple-Run style bridge from the jungle to the first gate (repeats along its length) and the short path out of the temple gate.
- **Causeway parapet – tileable** — Side faces of the bridge parapets and the deck's underside (repeats horizontally).
- **Floor hatch (buried gun cap)** — The round stone cap at the centre of every arena. It splits along the VERTICAL centre line into two halves that slide apart when Karan arrives, then the Sector Laser Gun rises from underneath.
- **Seal slab (trap closes behind Karan)** — The stone slab that rises out of the floor across the waist between two arenas after Karan passes (stretched to the width of the waist, 10–26 m).
- **Entrance gate – stone frame** — The small entrance gate of arena 1 at the end of the causeway. The arched opening MUST be transparent: the door (separate asset) and the world are visible through it.
- **Entrance gate – door leaf** — The wooden door that slides down into the ground when Karan approaches and slams back up behind him.
- **Temple gate – ornate stone frame** — The final temple gate at the end of the chain (the escape). The arched opening MUST be transparent.
- **[RETIRED] Exit gate – metal door leaf** — No longer used by the game (exit gates were replaced by open arcs).
- **[RETIRED] Energy lock glyph** — No longer used by the game (there is no exit lock any more).
- **Explosion sprite sheet** — Guardian destruction and Warden explosions.
- **Spark particle** — Additive spark particles.
- **Glow sprite** — Gun crystal glow, flashes, beam heads, temple light.
- **Smoke puff** — Dust puffs when running, hatch opening, seal slamming, smoke after explosions.
- **Shockwave ring** — Expanding floor rings: gun rise, activation, emergency pulse, tap-to-move marker.
- **Laser gradient** — Optional gradient used by beam ribbons (the sector laser itself is a shader).
- **Game logo** — Title screen and loading screen.
- **Story parchment panel** — Background of the story/introduction panel (text is rendered by the game on top).
- **Story illustration (polaroid)** — The photo pinned on the story parchment.
- **Map backdrop – painted jungle** — Backdrop of the 2D expedition-route map (darkened and vignetted by the game; the route, rings and temple are drawn on top). Keep the left two-thirds calm: that is where the route snakes; the right third sits under the docked panel.
- **Overview arena badges – 4 states** — Arena badges drawn over the live overview at each ring's centre.
- **Overview player marker** — Karan's badge (optional on the overview).
- **Temple icon** — Optional destination icon.
- **HUD shields – full / empty** — Health indicator (3 shields).
- **HUD icon set** — HUD and results icons.
