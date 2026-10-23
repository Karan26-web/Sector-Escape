"""Generates docs/assets/*.md (one spec + GPT prompt per asset) and docs/ASSET_INDEX.md.
Run after changing the asset list:  python3 tools/gen_asset_docs.py"""
import os, json, pathlib
ROOT = str(pathlib.Path(__file__).resolve().parent.parent)
OUT = f"{ROOT}/docs/assets"; os.makedirs(OUT, exist_ok=True)

STYLE = ("Art style: 2010s American TV superhero-cartoon look — clean, bold black ink outlines with varied line weight, "
         "flat cel-shaded colours with ONE hard-edged shadow tone and ONE small highlight per surface, slightly angular "
         "stylised shapes, saturated but grounded palette. No gradients except glows, no photorealism, no 3D render look, "
         "no text, no watermark, no signature.")
BG_STYLE = ("Art style: painterly cartoon background that matches a cel-shaded TV animation — bold readable shapes, soft "
            "brushwork, limited palette, atmospheric depth, dramatic but clean lighting. No text, no watermark.")
SHEET_RULES = ("SPRITE SHEET RULES: a strict grid of {cols} columns × {rows} rows, every cell exactly {fw}×{fh} px, "
               "character centred horizontally in every cell with the feet on one shared baseline at 92% of the cell height, "
               "identical scale, proportions, colours and lighting in every cell, no grid lines, no cell borders, no labels, "
               "fully transparent background (if transparency is unavailable use a solid flat #FF00FF magenta background).")
HERO = ("the Explorer (Karan, 11–12 years old): short spiky dark-brown hair, warm tan skin, "
        "big friendly eyes, teal short-sleeve t-shirt, khaki cargo shorts, brown lace-up hiking boots, small brown canvas backpack "
        "with two straps, a thin leather bracelet; cheerful determined expression")
BOT = ("a Sector Sentinel: sinister humanoid robot about 2 m tall, gunmetal-silver skull-like faceplate with a heavy brow ridge, "
       "two angular glowing RED eye slits, a rectangular dark mouth vent with three vertical slats, segmented steel neck, bulky "
       "shoulder pads, dark olive-GREEN riveted armour plates on torso/arms/legs, a round glowing WHITE-cyan power core in the "
       "centre of the chest, grey steel hands and boots. Menacing, military, slightly battered; original design (not a licensed character)")
BOSS = ("the Sector Warden: a 6.5 m tall elite version of the Sector Sentinel — same skull faceplate but with two swept-back "
        "steel horns, deep PURPLE-violet armour with gold trim instead of green, a large AMBER-gold chest core, tattered dark cape, "
        "crackling violet energy between the shoulder plates; regal, ancient, terrifying")

A = []
def asset(name, **kw): kw["name"] = name; A.append(kw); return kw
V4 = [("0", "variants a–d", 4, 0, "static", "")]

# ------------------------------------------------------------------ characters
asset("hero_front", title="Hero – Front sprite sheet", path="assets/sprites/hero_front.png", prio="P0", kind="sheet", size=(2048, 1280), grid=(8, 5), cell=(256, 256),
      used="The player character whenever he faces the camera (idle, victory), and knocked down by a reflected overcharge: seen from above, someone thrown onto his back is seen face-up, so the hurt row is used from every camera.",
      anims=[("0", "idle", 6, 6, "loop", "relaxed stance, subtle breathing bob, slight arm sway"), ("1", "run", 8, 13, "loop", "full run cycle, strong arm swing, 2 contact + 2 passing poses, hair bounce"),
             ("2", "activate", 6, 10, "once", "pushes one palm forward, a casting pose, then holds it (not used in play at the moment)"), ("3", "hurt", 4, 10, "once", "thrown back with arms up → falling → sitting on the floor dazed → on hands and knees getting up (the game holds each pose: the knock-down)"),
             ("4", "win", 6, 8, "loop", "jump for joy, both fists in the air, big grin")],
      desc=f"Front/three-quarter-front view of {HERO}.", prompt_extra="Three-quarter FRONT view (facing the viewer, turned ~20° to the left).", world="1.75 m tall")
asset("hero_back", title="Hero – Back sprite sheet", path="assets/sprites/hero_back.png", prio="P0", kind="sheet", size=(2048, 768), grid=(8, 3), cell=(256, 256),
      used="The player character seen from behind: running along the causeway, into the arena, to his observation point behind the centre and through the cleared gaps; standing at that point during the top view.",
      anims=[("0", "idle", 6, 6, "loop", "relaxed stance from behind, backpack visible, breathing bob"), ("1", "run", 8, 13, "loop", "full run cycle from behind, matching the front sheet timing exactly"),
             ("2", "cast", 6, 10, "once", "seen from behind: standing → steps in → arm swings up → palm pushed out toward the arena gap with a soft cyan glow (held while the charge sweeps); same proportions as the idle row")],
      desc=f"Three-quarter BACK view of {HERO}. The backpack (with a rolled map strapped on top) is fully visible.", prompt_extra="Three-quarter BACK view (we see the back of the head and the backpack).", world="1.75 m tall")
asset("enemy_bot", title="Enemy – Sector Sentinel sprite sheet", path="assets/sprites/enemy_bot.png", prio="P0", kind="sheet", size=(2048, 1480), grid=(8, 5), cell=(256, 296),
      used="Every guardian: charges in from beyond the gap in the arena wall, pounds on the transparent barrier across it, explodes when the charge hits it; after a too-small charge the survivors walk in through the broken barrier and leap at Karan.",
      anims=[("0", "idle", 4, 5, "loop", "menacing standing scan, head turns slightly, eye glow pulses"), ("1", "walk", 8, 10, "loop", "heavy stomping march toward the viewer, arms swinging, slight forward lean"),
             ("2", "lunge", 6, 12, "once", "crouch (2 frames) → leap with arms thrust forward (2) → extended flying pounce (2)"), ("3", "death", 8, 14, "once", "white flash → shake → armour cracks and plates fly off → bright explosion → smoke puff fading out"),
             ("4", "pound", 6, 10, "once", "both fists raised high → swinging down → impact: fists thrust at the viewer against an invisible glass wall, white-cyan sparks at the knuckles → recoil → fists back to the shoulders → wind-up (the blow lands on frame 3)")],
      desc=f"Three-quarter FRONT view of {BOT}. Cells are 256×296 (taller than wide since 2026-10-23: the raised fists of the pound row need the headroom; feet on the ground line at 92 %). LXD 2026-10-22: make them read more REAL and heavy: weathered stone-and-bronze armour plates with chips, scratches and moss in the seams, visible weight (bent knees, planted feet), subtle rim light and soft contact shadow, believable proportions; keep the bold ink outline so they still match the cartoon world.", prompt_extra="Three-quarter FRONT view, facing the viewer.", world="2.1 m tall")
asset("boss_warden", title="Boss – The Sector Warden sprite sheet", path="assets/sprites/boss_warden.png", prio="P1", kind="sheet", size=(4096, 1536), grid=(8, 3), cell=(512, 512),
      used="Final-arena guardian standing behind the last squad, beyond the gap; it falls only to the exact sector.",
      anims=[("0", "idle", 6, 5, "loop", "hovering slightly, cape drifting, arms crossed, eyes pulsing"), ("1", "hurt", 4, 8, "once", "staggers back, violet sparks, armour flash"), ("2", "defeat", 8, 7, "once", "shaking → core overloads (growing glow) → chain explosions → dissolves into smoke and embers")],
      desc=f"Three-quarter FRONT view of {BOSS}.", prompt_extra="Three-quarter FRONT view, imposing low-angle feel.", world="6.5 m tall")

# ------------------------------------------------------------------ props
asset("cannon_orbs", title="Charge orbs (4 frames)", path="assets/sprites/cannon_orbs.png", prio="P2", kind="sheet", size=(768, 192), grid=(4, 1), cell=(192, 192),
      used="Additive glow that grows at the centre point O during the charge (spark → full charge ring).",
      anims=[("0", "grow", 4, 3, "once", "small spark, larger orb, bright orb with rays, orb inside a dashed energy ring")],
      desc="Cyan energy orbs with white-hot cores and soft halos, each larger and more energised than the last.", prompt_extra="Four orbs, one per cell, centred, transparent background.", world="0.9–3 m")
asset("torch", title="Wall torch – flame flicker sheet", path="assets/sprites/torch.png", prio="P0", kind="sheet", size=(512, 256), grid=(4, 1), cell=(128, 256),
      used="Torches on the arena walls (animated flame). The causeway uses the free-standing torch_stand.",
      anims=[("0", "idle", 4, 9, "loop", "flame flickers and sways left/right, slightly different height per frame")],
      desc="A wrought-iron wall bracket holding a wooden torch with a bright cartoon flame (orange outer, yellow middle, pale core) and a soft warm glow halo.", prompt_extra="Front view, torch centred in each cell.", world="1.5 m tall")
asset("torch_stand", title="Free-standing torch – flame loop sheet", path="assets/sprites/torch_stand.png", prio="P1", kind="sheet", size=(1260, 960), grid=(10, 3), cell=(126, 320),
      used="Torches along the causeway, planted in stone sockets on the parapet (no wall bracket). Built from torch_moving_flame.gif with tools/gif_to_sheet.py (removes a baked-in checkerboard).",
      anims=[("0–2", "idle", 30, 14, "loop", "flame sways and licks upward, three embers drift; frames read left to right, row by row")],
      desc="A hand torch: wooden handle with iron bands, a stone crown cup, a spike at the bottom, and a big cartoon flame (orange outer, yellow core) with a soft warm glow.", prompt_extra="Front view, torch centred, spike tip touching the bottom edge, real transparent background (no checkerboard).", world="1.7 m tall")
asset("jungle_tree", title="Jungle trees – 6 painted variants", path="assets/sprites/jungle_tree.png", prio="P0", kind="sheet", size=(1920, 1280), grid=(3, 2), cell=(640, 640),
      used="Every tree in the world (instanced billboards): clusters ringing each arena, both banks of the causeway, the far band; also the trees on the 2D map. Built from the user's tree1–6 art with tools/pack_sprites.py (each tree bottom-aligned on the 97.5% ground line).",
      anims=[("0–1", "variants a–f", 6, 0, "static", "broad vine-hung tree, tall twisting tree, leaning palm, giant root-flared banyan, wide umbrella tree, layered tall tree")],
      desc="Painterly jungle trees (no ink outline): mossy twisting trunks, hanging vines, layered lush canopies in warm and cool greens, root flares; each about as wide as it is tall.", prompt_extra="One tree per image on a transparent background, 1254×1254, trunk base near the bottom edge; pack with tools/pack_sprites.py.", world="7–13 m tall")
asset("jungle_plant", title="Jungle plants – 4 variants", path="assets/sprites/jungle_plant.png", prio="P1", kind="sheet", size=(2048, 512), grid=(4, 1), cell=(512, 512),
      used="Ferns and bushes at the foot of the walls and along the causeway banks.",
      anims=[("0", "variants a–d", 4, 0, "static", "fern, broad-leaf plant, flowering bush, grass tuft")],
      desc="Cartoon jungle undergrowth: big fronds and leaves in layered greens with bold outlines, one variant with bright pink/orange flowers.", prompt_extra="Four separate plants, one per cell, front view, base at the bottom.", world="1.2–2.3 m tall")
asset("forest_silhouette", title="Distant forest silhouettes – 4 variants (redesigned foliage)", path="assets/sprites/forest_silhouette.png", prio="P2", kind="sheet", size=(2048, 1024), grid=(4, 1), cell=(512, 1024),
      used="Layer 1 of the redesigned jungle: tall dark silhouettes far beyond the rings that give depth without detail (the game switches automatically when this file exists).",
      anims=[("0", "variants a–d", 4, 0, "static", "four tall tree-line clumps of different outlines")],
      desc="Soft, atmospheric distant jungle tree clumps: dark desaturated green-blue (#1d3330 to #2c4a40) flat silhouettes with only a faint lighter rim on the upper-left edges, almost no interior detail, slightly hazy edges, tall and narrow so they read as a far tree line.", prompt_extra="Four separate silhouettes, one per cell, front view, bases on one shared baseline at 98% of the cell height, transparent background.", world="16–22 m tall", style=BG_STYLE)
asset("jungle_rocks", title="Jungle boulders – 4 variants", path="assets/sprites/jungle_rocks.png", prio="P0", kind="sheet", size=(2048, 512), grid=(4, 1), cell=(512, 512),
      used="Rocks that hug every arena wall and line both banks of the causeway so Karan feels hemmed in (instanced, hundreds on screen).",
      anims=[("0", "variants a–d", 4, 0, "static", "low wide boulder, tall cracked boulder, mossy boulder pair, flat slab with a carved glyph")],
      desc="Chunky cartoon jungle boulders in grey-green stone with bold ink outlines, one hard shadow side, moss patches and a few vines; each sits on a little base of dirt and grass so it reads as grounded.", prompt_extra="Four separate rocks, one per cell, front view from slightly above, base at the bottom of the cell.", world="1.1–2.6 m")
asset("wall_pillar", title="Stone pillar (wall junction)", path="assets/sprites/wall_pillar.png", prio="P2", kind="single", size=(256, 1024),
      used="The carved columns where two arena walls meet. The game slices this art into capital / shaft / base bands (by the opaque width of each row) and wraps them around three stacked cylinders, so keep the capital and base clearly wider than the shaft.",
      desc="A tall carved stone column with a wider cap and base, glyph bands, a small glowing cyan gem near the top, moss at the foot.", prompt_extra="Front view, centred, base at the bottom edge, transparent background.", world="7.2 m")

# ------------------------------------------------------------------ textures
asset("arena_floor", title="Arena floor (top-down circle)", path="assets/textures/arena_floor.png", prio="P0", kind="texture", size=(2048, 2048),
      used="The circular stone floor of every arena, seen mostly from the tactical top view. The circle must touch the image edges; everything outside the circle transparent.",
      desc="Top-down view of an ancient circular stone battle floor: concentric rings of fitted stone blocks (7 rings), radial seams every 15°, a round carved medallion in the centre with a cyan glyph circle, cracks, scattered moss, darker outer rim ring. Flat, evenly lit, no perspective, no cast shadows.",
      prompt_extra="Perfectly top-down orthographic view, circle centred and touching all four edges, transparent corners.", world="scaled to each arena's radius (7–21 m)")
asset("arena_wall", title="Arena wall – tileable stone", path="assets/textures/arena_wall.png", prio="P0", kind="texture", size=(1024, 1024),
      used="Inner and outer faces of the circular arena walls and the junction pillars; one tile spans the wall height (6.5 m) and repeats horizontally.",
      desc="Front-facing ancient jungle temple wall: large fitted stone blocks in 6 rows with offset joints, a carved glyph band at 1/3 height, deep ink mortar lines, moss creeping up from the bottom third, a few hanging vines, slight darkening toward the bottom. MUST tile seamlessly left↔right.",
      prompt_extra="Flat frontal orthographic view, seamless horizontal tiling, even lighting.", world="6.5 m × 6.5 m per tile")
asset("wall_top", title="Wall top rim – tileable", path="assets/textures/wall_top.png", prio="P2", kind="texture", size=(512, 128),
      used="The flat top of the arena walls and pillar caps (seen from the tactical view).", desc="Top-down strip of dark grey-green capstones with mortar lines, seamless left↔right.", prompt_extra="Top-down, seamless horizontal tiling.", world="4 m × 1 m")
asset("ground_jungle", title="Jungle ground – tileable", path="assets/textures/ground_jungle.png", prio="P1", kind="texture", size=(1024, 1024),
      used="Ground plane outside the arenas (repeats many times — keep it low-contrast).", desc="Top-down jungle floor: grass in two greens, patches of dark soil, small leaves and roots, subtle noise, no strong focal elements. Seamless in both directions.", prompt_extra="Top-down orthographic, seamless tiling on all four edges, low contrast.", world="12 m × 12 m per tile")
asset("jungle_panorama", title="Jungle backdrop – magical evening panorama", path="assets/textures/jungle_panorama.png", prio="P0", kind="texture", size=(2172, 724),
      used="Wrapped once around the whole world as a cylinder (rotated so its right-hand temple stands behind ring 1's gate on the title, with its painted sun to the right). Only its very top fades into the sky texture.", 
      desc="Wide painted evening panorama: violet-blue sky with glowing pink and orange clouds, a low sun on the horizon, misty jungle valleys with waterfalls, two stepped stone temples on hills, rock spires, layered canopy getting darker toward the viewer.", prompt_extra="3:1 panoramic strip, seamless left↔right wrap, horizon (and the sun) at about 52% from the top.", world="surrounds the chain at 260 m radius", style=BG_STYLE)
asset("sky", title="Evening sky with clouds", path="assets/textures/sky.png", prio="P1", kind="texture", size=(1774, 887),
      used="The sky sphere: its warm bottom sits on the horizon and its deep-blue top 35° up (where the panorama's painted sky fades into it); it follows the camera and is tinted per ring as the evening deepens.", desc="Painted magical-evening sky: deep blue-violet at the top → magenta → pink → orange → warm yellow at the bottom, puffy sunlit clouds in pink and gold, a few wisps.", prompt_extra="2:1 strip, seamless left↔right, warmest at the bottom centre.", world="sky sphere", style=BG_STYLE)
asset("water", title="Jungle water – tileable", path="assets/textures/water.png", prio="P0", kind="texture", size=(512, 512),
      used="The lake under the stone causeway (two scrolling layers: base + additive shimmer).",
      desc="Top-down cartoon jungle water: teal-green base with soft darker depths, bright cyan caustic ribbons and a few sun sparkles, painted flat (no photoreal foam). Seamless on all four edges.", prompt_extra="Top-down orthographic, seamless tiling on all edges, no shoreline, no objects.", world="9 m × 9 m per tile", style=BG_STYLE)
asset("causeway_stone", title="Stone causeway deck – tileable strip", path="assets/textures/causeway_stone.png", prio="P0", kind="texture", size=(512, 1024),
      used="The walking surface of the Temple-Run style bridge from the jungle to the first gate (repeats along its length) and the short path out of the temple gate.",
      desc="Top-down view of large worn stone paving slabs in staggered rows, dark mortar, chipped corners, moss in the cracks, a faint carved line down the middle. The strip's long edges are slab edges (the parapets are separate). Seamless top↔bottom.", prompt_extra="Top-down orthographic, seamless vertical tiling, path runs top to bottom, no border art.", world="4.4 m wide × 8 m per tile")
asset("causeway_side", title="Causeway parapet – tileable", path="assets/textures/causeway_side.png", prio="P1", kind="texture", size=(1024, 256),
      used="Side faces of the bridge parapets and the deck's underside (repeats horizontally).",
      desc="Frontal view of a low stone balustrade: two rows of fitted blocks with a lighter capstone row on top, moss creeping up from the bottom, water stains. Seamless left↔right.", prompt_extra="Flat frontal orthographic view, seamless horizontal tiling.", world="6 m × 1.5 m per tile")
asset("seal_slab", title="Seal slab (trap closes behind Karan)", path="assets/textures/seal_slab.png", prio="P1", kind="texture", size=(1024, 1024),
      used="The stone slab that rises out of the floor across the waist between two arenas after Karan passes (stretched to the width of the waist, 10–26 m).",
      desc="Frontal view of a massive carved stone slab: fitted blocks, a big central glyph of two concentric red glowing rings with eight radial spokes and a red pie-slice (sector) symbol, scorch marks, ink outline border. Reads from far away.", prompt_extra="Flat frontal orthographic view, fills the whole canvas, no transparency.", world="≈ 12 m × 6.5 m (stretched per junction)")
asset("gate_small_frame", title="Entrance gate – stone frame", path="assets/textures/gate_small_frame.png", prio="P0", kind="texture", size=(1024, 1024),
      used="The small entrance gate of arena 1 at the end of the causeway. The arched opening MUST be transparent: the door (separate asset) and the world are visible through it.",
      desc="Front view of a square block of carved jungle-temple stonework containing an arched doorway. The arch opening is 46% of the image width, centred, from the bottom edge up to 70% of the image height; it is fully transparent. Ornate keystone, carved glyph columns on both sides, moss at the bottom.", prompt_extra="Flat frontal view, transparent background INSIDE the arch and nowhere else.", world="≈6 m × 6 m")
asset("gate_small_door", title="Entrance gate – door leaf", path="assets/textures/gate_small_door.png", prio="P0", kind="texture", size=(512, 1024),
      used="The wooden door that slides down into the ground when Karan approaches and slams back up behind him.", desc="Front view of a heavy wooden plank door with three dark iron bands and rivets, worn and scratched, slightly rounded top corners. Fills the whole image.", prompt_extra="Flat frontal view, fills the full canvas, no background.", world="2.8 m × 4.2 m")
asset("gate_large_frame", title="Temple gate – ornate stone frame", path="assets/textures/gate_large_frame.png", prio="P0", kind="texture", size=(2048, 2048),
      used="The final temple gate at the end of the chain (the escape). The arched opening MUST be transparent.",
      desc="Front view of a grand square block of ancient stonework with a tall arched doorway. Opening is 56% of the width, centred, from the bottom edge up to 78% of the height, fully transparent. A golden sun-disc keystone, carved sector/pie-slice motifs in the stone, two carved guardian faces, vines.", prompt_extra="Flat frontal view, transparent background INSIDE the arch only.", world="≈9.8 m × 9.8 m")

# ------------------------------------------------------------------ fx
asset("fx_explosion", title="Explosion sprite sheet", path="assets/sprites/fx_explosion.png", prio="P0", kind="sheet", size=(2048, 256), grid=(8, 1), cell=(256, 256),
      used="Guardian destruction and Warden explosions.", anims=[("0", "boom", 8, 16, "once", "white flash core → orange spiky fireball expanding → dark smoke ring and embers fading")],
      desc="Cartoon explosion: bold ink-outlined spiky fireball, white→yellow→orange→dark-smoke progression, a few flying debris chunks in the middle frames.", prompt_extra="Each frame centred in its cell; frames 1–8 are consecutive moments of ONE explosion.", world="2.8 m")
asset("fx_spark", title="Spark particle", path="assets/sprites/fx_spark.png", prio="P2", kind="single", size=(128, 128), used="Additive spark particles.", desc="A soft white radial glow dot with a bright core on a transparent background.", prompt_extra="Centred, transparent, white only (the game tints it).", world="0.3 m")
asset("fx_glow", title="Glow sprite", path="assets/sprites/fx_glow.png", prio="P2", kind="single", size=(256, 256), used="The soft highlight on the centre point O, flashes, beam heads, temple light.", desc="Soft round white radial gradient glow, fully transparent at the edges.", prompt_extra="Centred, transparent, white only.", world="varies")
asset("fx_smoke", title="Smoke puff", path="assets/sprites/fx_smoke.png", prio="P2", kind="single", size=(256, 256), used="Dust puffs when running and when Karan is knocked down, seal slamming, smoke after explosions.", desc="A fluffy cartoon smoke puff silhouette in white with soft edges on a transparent background.", prompt_extra="Centred, transparent, white only (tinted in-game).", world="0.6–1.6 m")
asset("fx_shockwave", title="Shockwave ring", path="assets/sprites/fx_shockwave.png", prio="P2", kind="single", size=(512, 512), used="Expanding floor rings: the pulse from O that ends the survivors' attack.", desc="A thin bright white ring with a soft outer glow on a transparent background.", prompt_extra="Centred, transparent, white only.", world="varies")

# ------------------------------------------------------------------ ui
asset("ui_logo", title="Game logo", path="assets/ui/logo.png", prio="P0", kind="single", size=(1600, 740),
      used="Title screen and loading screen.", desc="Painted logo: the words \"SECTOR ESCAPE\" as chunky carved stone blocks (golden top word, pale stone bottom word) with cracks, moss and vines, a glowing cyan compass jewel in the O and a cyan gem in the A, jungle leaves around, sitting on a mossy stone ledge.",
      prompt_extra="Centred composition, transparent background. The text must read exactly: SECTOR ESCAPE.", world="—")
asset("ui_parchment", title="Story parchment panel", path="assets/ui/parchment.png", prio="P1", kind="single", size=(1024, 768),
      used="Background of the story/introduction panel (text is rendered by the game on top).", desc="An aged parchment sheet with torn uneven edges, subtle stains and fibre texture, slightly darker vignette, an empty area (no text!).", prompt_extra="Flat, front view, fills the canvas, NO text.", world="—", style=BG_STYLE)
asset("ui_story_art", title="Story illustration (polaroid)", path="assets/ui/story_illustration.png", prio="P1", kind="single", size=(800, 600),
      used="The photo pinned on the story parchment.", desc="A painted jungle vista at sunrise: a chain of overlapping circular stone arenas half-hidden by canopy, a glowing cyan light rising from one centre, a lost temple on a far hill, mist, exotic birds.", prompt_extra="Landscape 4:3 composition, no frame, no text.", world="—", style=BG_STYLE)
asset("temple", title="The lost temple on its cliff island", path="assets/sprites/temple.png", prio="P0", kind="single", size=(1024, 1024),
      used="The goal, everywhere: a sprite standing far beyond the temple court on the chain's axis (seen behind ring 1's gate on the title, growing as Karan nears it; a painted temple of the panorama hides behind it), and the temple at the end of the 2D map.", desc="Painted stepped stone temple overgrown with moss and jungle, standing on a small cliff island with hanging greenery; warm evening light.", prompt_extra="Single object on a transparent background, the island's foot near the bottom edge.", world="about 100 m tall in the world")
asset("ui_shield", title="HUD shields – full / empty", path="assets/ui/shield.png", prio="P1", kind="sheet", size=(256, 128), grid=(2, 1), cell=(128, 128),
      used="Health indicator (3 shields).", anims=[("0", "full / empty", 2, 0, "static", "cell 1 glossy bright blue shield with a cyan glow; cell 2 dark cracked grey shield")],
      desc="Comic-style shield icons with thick outlines.", prompt_extra="Two icons, one per cell, centred, transparent background.", world="—")
asset("ui_icons", title="HUD icon set", path="assets/ui/icons.png", prio="P1", kind="sheet", size=(1024, 128), grid=(8, 1), cell=(128, 128),
      used="HUD and results icons.", anims=[("0", "timer, star, star-empty, hint-bulb, sound-on, sound-off, pause, play", 8, 0, "static", "one icon per cell in that exact order")],
      desc="Chunky white glyph icons with thick black outlines (star is golden, empty star dark grey, bulb yellow).", prompt_extra="Eight icons, one per cell, centred, transparent background, same stroke weight.", world="—")

INDEX_HDR = """# Asset Index – Sector Escape: The Lost Jungle

Every visual asset the game loads, with its spec sheet. **The game runs without any of these files** – a procedural placeholder is drawn for anything missing – so you can produce them in any order. Save each file at the exact `assets/...` path (PNG), then run `python3 tools/optimize_assets.py` to convert to WebP and update the manifest.

**Status (2026-10-22):** all assets are installed. The magical-evening art is live: the painted `jungle_panorama` and `sky`, six painted trees packed into `jungle_tree` (`tools/pack_sprites.py`), the free-standing `torch_stand` (`tools/gif_to_sheet.py`) and the painted `temple` (in the world and on the map). Every sprite sheet carries a measured `baseline` in `assets/manifest.json` so characters and plants stand on the ground. `wall_pillar` is not drawn as a sprite: the game cuts it into capital / shaft / base bands and wraps them around the 3D junction columns. Removed as unused (2026-10-22 cleanup, archived outside the project): `jungle_canopy`, `stone_idol`, `rubble`, `path_dirt`, `gate_large_door`, `energy_lock`, `fx_laser`, `ui_map_bg`, `ui_map_node`, `ui_map_marker`.

**2026-10-23 (LXD: no weapon at the centre, guardians behind a barrier):** `cannon`, `cannon_top`, `cannon_top_charge` and `floor_hatch` are retired (archived outside the project). The user's GPT strips arrived the same day: `enemy_bot` row 4 **pound** is installed (appended with `tools/add_sheet_row.py`; the sheet's cells grew to 256×296 for the raised fists). `hero_back` row 2 **cast** is the user's own hero_back sheet (idle · run · cast), installed as delivered after clearing grey checkerboard leftovers (the first GPT strip drew Karan older and taller and was rejected): any new Karan art must keep the sheet's proportions (big head, about 4 heads tall, an 11–12-year-old).

Priority: **P0** core look · **P1** polish · **P2** optional (procedural version is fine).

Every prompt below embeds the shared art style and sprite-sheet rules. Verify sprite sheets with `tools/sheet-viewer.html`.

| # | Asset | File | Size | Grid | Prio | Spec |
|---|-------|------|------|------|------|------|
"""
rows = []
for i, a in enumerate(A, 1):
    grid = f"{a['grid'][0]}×{a['grid'][1]} ({a['cell'][0]}×{a['cell'][1]})" if a.get("grid") else "—"
    rows.append(f"| {i} | {a['title']} | `{a['path']}` | {a['size'][0]}×{a['size'][1]} | {grid} | {a['prio']} | [{a['name']}.md](assets/{a['name']}.md) |")
open(f"{ROOT}/docs/ASSET_INDEX.md", "w").write(INDEX_HDR + "\n".join(rows) + "\n\n## Where each asset shows up\n\n" + "\n".join(f"- **{a['title']}** — {a['used']}" for a in A) + "\n")

manifest = json.load(open(f"{ROOT}/assets/manifest.json"))["images"]
for a in A:
    name = a["name"]; m = manifest.get(name, {}); style = a.get("style", STYLE); is_sheet = a["kind"] == "sheet"
    md = [f"# {a['title']}", "", "| | |", "|---|---|", f"| **Save as** | `{a['path']}` |", f"| **Type** | {'Sprite sheet' if is_sheet else 'Texture' if a['kind']=='texture' else 'Single image'} (PNG-32 with alpha) |", f"| **Canvas size** | {a['size'][0]} × {a['size'][1]} px |"]
    if is_sheet: md.append(f"| **Grid** | {a['grid'][0]} columns × {a['grid'][1]} rows · each cell {a['cell'][0]} × {a['cell'][1]} px |")
    md += [f"| **World scale** | {a.get('world','—')} |", f"| **Priority** | {a['prio']} |", f"| **Manifest key** | `{name}` |", "", "## Used for", a["used"], "", "## Visual description", a["desc"], ""]
    if is_sheet and a.get("anims"):
        md += ["## Sheet layout (row → animation)", "", "| Row | Animation | Frames | FPS | Play | What happens |", "|---|---|---|---|---|---|"]
        for row, nm, frames, fps, play, what in a["anims"]: md.append(f"| {row} | `{nm}` | {frames} | {fps or '—'} | {play} | {what} |")
        md += ["", f"Rows are read top to bottom; frames left to right starting at column 0. Unused cells stay transparent. The grid is defined in `assets/manifest.json` under `images.{name}.sheet` – if your sheet ends up with a different grid, edit `cols` / `rows` / `frames` there instead of redrawing.", ""]
    prompt = [a["desc"], a.get("prompt_extra", ""), style]
    if is_sheet: prompt.append(SHEET_RULES.format(cols=a["grid"][0], rows=a["grid"][1], fw=a["cell"][0], fh=a["cell"][1]))
    if is_sheet and a.get("anims") and a["anims"][0][3]: prompt.append("ROWS (top to bottom): " + " | ".join(f"row {r}: '{nm}' – {frames} frames – {what}" for r, nm, frames, fps, play, what in a["anims"]) + ".")
    transparent = a['kind'] != 'texture' or 'transparent' in (a['desc'] + a.get('prompt_extra', '')).lower() or 'alpha' in a['desc'].lower()
    prompt.append(f"Output size {a['size'][0]}×{a['size'][1]} px, PNG" + (" with transparency." if transparent else "."))
    md += ["## GPT image prompt (copy–paste)", "", "```text", "\n".join(p for p in prompt if p), "```", ""]
    if is_sheet and a.get("anims") and a["anims"][0][3]:
        md += ["### If the grid comes out wrong", "Image models often miscount cells. Reliable fallback: generate **one row at a time** (one animation per image, `1 × N` cells, same cell size), then stack the rows into the full sheet. Always check the result in `tools/sheet-viewer.html` – the feet must sit on the same baseline in every frame.", ""]
    md += ["## Checklist before dropping it in", "- [ ] Transparent background where the spec says so (or flat `#FF00FF` → set `\"chromaKey\": \"#FF00FF\"` for this entry in `assets/manifest.json`).",
           "- [ ] Exact canvas size; " + ("cells aligned to the grid, no borders." if is_sheet else "subject fills the frame as described."),
           "- [ ] Outlines are crisp black ink, colours flat (no photoreal shading).",
           "- [ ] Run `python3 tools/optimize_assets.py`, reload the game → the placeholder is replaced automatically." + (" Use `tools/sheet-viewer.html` to preview the animation." if is_sheet else ""), ""]
    if m.get("sheet"): md += ["## Current manifest entry", "```json", json.dumps({name: m}, indent=2), "```", ""]
    open(f"{OUT}/{name}.md", "w").write("\n".join(md))
print(f"wrote {len(A)} asset specs + ASSET_INDEX.md")
missing = set(manifest) - {a['name'] for a in A}
print("manifest keys without spec:", missing or "none")
