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
      used="The player character whenever he faces the camera (idle beside the gun, hurt, victory, activating the gun).",
      anims=[("0", "idle", 6, 6, "loop", "relaxed stance, subtle breathing bob, slight arm sway"), ("1", "run", 8, 13, "loop", "full run cycle, strong arm swing, 2 contact + 2 passing poses, hair bounce"),
             ("2", "activate", 6, 10, "once", "reaches forward and slams a palm onto the gun's crystal, then holds the pose"), ("3", "hurt", 4, 10, "once", "knocked back, arms up, eyes shut, pain flash – last frame recovering"),
             ("4", "win", 6, 8, "loop", "jump for joy, both fists in the air, big grin")],
      desc=f"Front/three-quarter-front view of {HERO}.", prompt_extra="Three-quarter FRONT view (facing the viewer, turned ~20° to the left).", world="1.75 m tall")
asset("hero_back", title="Hero – Back sprite sheet", path="assets/sprites/hero_back.png", prio="P0", kind="sheet", size=(2048, 512), grid=(8, 2), cell=(256, 256),
      used="The player character seen from behind: running along the causeway, into the arena, to the gun and through the open arcs.",
      anims=[("0", "idle", 6, 6, "loop", "relaxed stance from behind, backpack visible, breathing bob"), ("1", "run", 8, 13, "loop", "full run cycle from behind, matching the front sheet timing exactly")],
      desc=f"Three-quarter BACK view of {HERO}. The backpack (with a rolled map strapped on top) is fully visible.", prompt_extra="Three-quarter BACK view (we see the back of the head and the backpack).", world="1.75 m tall")
asset("enemy_bot", title="Enemy – Sector Sentinel sprite sheet", path="assets/sprites/enemy_bot.png", prio="P0", kind="sheet", size=(2048, 1024), grid=(8, 4), cell=(256, 256),
      used="Every guardian: stands in the open arc, notices Karan, marches toward the gun, lunges at him, explodes when hit by the laser.",
      anims=[("0", "idle", 4, 5, "loop", "menacing standing scan, head turns slightly, eye glow pulses"), ("1", "walk", 8, 10, "loop", "heavy stomping march toward the viewer, arms swinging, slight forward lean"),
             ("2", "lunge", 6, 12, "once", "crouch (2 frames) → leap with arms thrust forward (2) → extended flying pounce (2)"), ("3", "death", 8, 14, "once", "white flash → shake → armour cracks and plates fly off → bright explosion → smoke puff fading out")],
      desc=f"Three-quarter FRONT view of {BOT}.", prompt_extra="Three-quarter FRONT view, walking toward the viewer.", world="2.1 m tall")
asset("boss_warden", title="Boss – The Sector Warden sprite sheet", path="assets/sprites/boss_warden.png", prio="P1", kind="sheet", size=(4096, 1536), grid=(8, 3), cell=(512, 512),
      used="Final-arena guardian standing behind the last squad in the open arc; destroyed by the perfect blast.",
      anims=[("0", "idle", 6, 5, "loop", "hovering slightly, cape drifting, arms crossed, eyes pulsing"), ("1", "hurt", 4, 8, "once", "staggers back, violet sparks, armour flash"), ("2", "defeat", 8, 7, "once", "shaking → core overloads (growing glow) → chain explosions → dissolves into smoke and embers")],
      desc=f"Three-quarter FRONT view of {BOSS}.", prompt_extra="Three-quarter FRONT view, imposing low-angle feel.", world="6.5 m tall")

# ------------------------------------------------------------------ props
asset("cannon", title="Sector Laser Gun (pedestal)", path="assets/sprites/cannon.png", prio="P0", kind="single", size=(1024, 1024),
      used="The ancient gun that rises from under the floor hatch at the centre of every arena. A billboard, so it must read well from any horizontal angle and from above.",
      desc="An ancient stone-and-bronze pedestal: a round stepped stone base carved with a ring of glowing cyan glyphs, a dark metal column with two bronze prongs holding a large floating hexagonal CYAN crystal that emits light. Moss on the base. Radially symmetric. The crystal is the focal point.",
      prompt_extra="Single object, centred, slight high three-quarter view (camera ~25° above horizon), bottom of the base touching the bottom edge, transparent background.", world="3.2 m tall")
asset("torch", title="Wall torch – flame flicker sheet", path="assets/sprites/torch.png", prio="P0", kind="sheet", size=(512, 256), grid=(4, 1), cell=(128, 256),
      used="Torches on the arena walls and on posts along the causeway (animated flame).",
      anims=[("0", "idle", 4, 9, "loop", "flame flickers and sways left/right, slightly different height per frame")],
      desc="A wrought-iron wall bracket holding a wooden torch with a bright cartoon flame (orange outer, yellow middle, pale core) and a soft warm glow halo.", prompt_extra="Front view, torch centred in each cell.", world="1.5 m tall")
asset("jungle_tree", title="Jungle trees – 4 variants", path="assets/sprites/jungle_tree.png", prio="P0", kind="sheet", size=(2048, 1024), grid=(4, 1), cell=(512, 1024),
      used="Hundreds of billboard trees ringing every arena and crowding both banks of the causeway (instanced).",
      anims=[("0", "variants a–d", 4, 0, "static", "broad canopy tree, tall palm-like tree, twisted vine-covered tree, dense bushy tree")],
      desc="Stylised jungle trees: thick dark trunks, layered rounded canopy masses in 3 greens, hanging vines, a few red/orange jungle flowers. Each tree fills its cell height, trunk base at the bottom centre.", prompt_extra="Four separate trees, one per cell, front view.", world="7–12 m tall")
asset("jungle_plant", title="Jungle plants – 4 variants", path="assets/sprites/jungle_plant.png", prio="P1", kind="sheet", size=(2048, 512), grid=(4, 1), cell=(512, 512),
      used="Ferns and bushes at the foot of the walls and along the causeway banks.",
      anims=[("0", "variants a–d", 4, 0, "static", "fern, broad-leaf plant, flowering bush, grass tuft")],
      desc="Cartoon jungle undergrowth: big fronds and leaves in layered greens with bold outlines, one variant with bright pink/orange flowers.", prompt_extra="Four separate plants, one per cell, front view, base at the bottom.", world="1.2–2.3 m tall")
asset("stone_idol", title="Stone idol statue", path="assets/sprites/stone_idol.png", prio="P1", kind="single", size=(512, 1024),
      used="Decorative idols (currently unused by the chain layout; kept for set dressing).",
      desc="A tall weathered jungle temple idol: a carved stone head/face with closed eyes and glowing cyan inlays, geometric Maya/Khmer-inspired patterns, cracks, moss and vines, standing on a square plinth.", prompt_extra="Front view, centred, plinth at the bottom edge.", world="4 m tall")
asset("rubble", title="Rubble – 4 piles", path="assets/sprites/rubble.png", prio="P2", kind="sheet", size=(1024, 256), grid=(4, 1), cell=(256, 256),
      used="Small rubble piles (set dressing).", anims=[("0", "variants a–d", 4, 0, "static", "four rubble piles of different shapes")],
      desc="Chunks of broken carved stone wall in small piles with dust, a few glowing cyan glyph fragments.", prompt_extra="Four piles, one per cell, slight high angle, bottom aligned.", world="0.6–1.1 m")
asset("jungle_canopy", title="Canopy masses – 4 clustered tree groups (redesigned foliage)", path="assets/sprites/jungle_canopy.png", prio="P1", kind="sheet", size=(2048, 1024), grid=(4, 1), cell=(512, 1024),
      used="Layer 2 of the redesigned jungle: hand-placed canopy masses that frame the rings and the causeway with gaps of open ground between them. One sprite replaces a 3–6 tree cluster (the game switches automatically when this file exists).",
      anims=[("0", "variants a–d", 4, 0, "static", "a: tall central tree flanked by two smaller ones; b: wide low mass of 4 crowns; c: palm-led group with a broad-leaf tree; d: vine-draped pair with a fern skirt")],
      desc="Clustered cartoon jungle canopies: 3–5 trees per cell merged into ONE strong unified silhouette, a single readable trunk group at the base, foliage painted in only 2–3 green values (deep #1f3d2b shadow, mid #3e6b3f, a restrained #6f9a52 highlight), very few small details, no individual leaf noise, a few hanging vines, no flowers. Calm, graphic shapes that read at small size and do not compete with the stone arenas.", prompt_extra="Four separate canopy masses, one per cell, front view, trunk bases on one shared baseline at 96% of the cell height, transparent background.", world="10–14 m tall")
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
asset("path_dirt", title="Dirt path – tileable strip", path="assets/textures/path_dirt.png", prio="P2", kind="texture", size=(512, 1024),
      used="Unused by the chain layout (the causeway and temple path use causeway_stone). Kept for set dressing.", desc="Top-down worn dirt trail running vertically: packed brown earth in the middle, flat stepping stones, grass encroaching at both long edges. Seamless top↔bottom.", prompt_extra="Top-down orthographic, seamless vertical tiling.", world="4.2 m × 8 m per tile")
asset("jungle_panorama", title="Jungle backdrop – 360° panorama", path="assets/textures/jungle_panorama.png", prio="P0", kind="texture", size=(4096, 1024),
      used="Wrapped around the whole world as a cylinder: distant jungle, mist and ruins beyond the walls. Must tile left↔right.",
      desc="Wide cylindrical panorama: hazy sky at the top third (tinted per arena), layers of distant jungle canopy getting darker toward the viewer, waterfalls, two or three ancient stone temple spires poking through the canopy, mist band along the bottom. Horizon line at 55% height.", prompt_extra="4:1 panoramic strip, seamless left↔right wrap, horizon at 55% from the top.", world="surrounds the chain at 250 m radius", style=BG_STYLE)
asset("sky", title="Sky gradient with clouds", path="assets/textures/sky.png", prio="P2", kind="texture", size=(1024, 512),
      used="Sky dome texture (tinted for day/dusk/night/storm as Karan moves through the chain).", desc="Soft blue sky gradient (deep blue top → pale horizon) with a few cartoon cumulus clouds, flat painted style.", prompt_extra="Flat horizontal strip, seamless left↔right.", world="dome", style=BG_STYLE)
asset("water", title="Jungle water – tileable", path="assets/textures/water.png", prio="P0", kind="texture", size=(512, 512),
      used="The lake under the stone causeway (two scrolling layers: base + additive shimmer).",
      desc="Top-down cartoon jungle water: teal-green base with soft darker depths, bright cyan caustic ribbons and a few sun sparkles, painted flat (no photoreal foam). Seamless on all four edges.", prompt_extra="Top-down orthographic, seamless tiling on all edges, no shoreline, no objects.", world="9 m × 9 m per tile", style=BG_STYLE)
asset("causeway_stone", title="Stone causeway deck – tileable strip", path="assets/textures/causeway_stone.png", prio="P0", kind="texture", size=(512, 1024),
      used="The walking surface of the Temple-Run style bridge from the jungle to the first gate (repeats along its length) and the short path out of the temple gate.",
      desc="Top-down view of large worn stone paving slabs in staggered rows, dark mortar, chipped corners, moss in the cracks, a faint carved line down the middle. The strip's long edges are slab edges (the parapets are separate). Seamless top↔bottom.", prompt_extra="Top-down orthographic, seamless vertical tiling, path runs top to bottom, no border art.", world="4.4 m wide × 8 m per tile")
asset("causeway_side", title="Causeway parapet – tileable", path="assets/textures/causeway_side.png", prio="P1", kind="texture", size=(1024, 256),
      used="Side faces of the bridge parapets and the deck's underside (repeats horizontally).",
      desc="Frontal view of a low stone balustrade: two rows of fitted blocks with a lighter capstone row on top, moss creeping up from the bottom, water stains. Seamless left↔right.", prompt_extra="Flat frontal orthographic view, seamless horizontal tiling.", world="6 m × 1.5 m per tile")
asset("floor_hatch", title="Floor hatch (buried gun cap)", path="assets/textures/floor_hatch.png", prio="P0", kind="texture", size=(512, 512),
      used="The round stone cap at the centre of every arena. It splits along the VERTICAL centre line into two halves that slide apart when Karan arrives, then the Sector Laser Gun rises from underneath.",
      desc="Top-down round stone hatch: a rim of eight bolts, an inner ring of cyan glyph ticks, a small cyan sector (pie-slice) glyph at the centre, and one straight vertical seam line through the middle (the two halves). Alpha outside the circle. Must look natural lying flush on the arena_floor stone.", prompt_extra="Perfectly top-down, circle touching all four edges, transparent corners, the seam exactly vertical through the centre.", world="4.6 m diameter")
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
asset("gate_large_door", title="[RETIRED] Exit gate – metal door leaf", path="assets/textures/gate_large_door.png", prio="P2", kind="texture", size=(1024, 2048),
      used="No longer used by the game (exit gates were replaced by open arcs).", desc="Front view of a tall dark steel-and-bronze door leaf with five horizontal panels, rivets and faint engraved glyph lines.", prompt_extra="Flat frontal view, fills the full canvas.", world="—")
asset("energy_lock", title="[RETIRED] Energy lock glyph", path="assets/textures/energy_lock.png", prio="P2", kind="texture", size=(512, 512),
      used="No longer used by the game (there is no exit lock any more).", desc="A glowing red-orange circular energy glyph with a pie-slice symbol.", prompt_extra="Centred, symmetric, transparent background.", world="—")

# ------------------------------------------------------------------ fx
asset("fx_explosion", title="Explosion sprite sheet", path="assets/sprites/fx_explosion.png", prio="P0", kind="sheet", size=(2048, 256), grid=(8, 1), cell=(256, 256),
      used="Guardian destruction and Warden explosions.", anims=[("0", "boom", 8, 16, "once", "white flash core → orange spiky fireball expanding → dark smoke ring and embers fading")],
      desc="Cartoon explosion: bold ink-outlined spiky fireball, white→yellow→orange→dark-smoke progression, a few flying debris chunks in the middle frames.", prompt_extra="Each frame centred in its cell; frames 1–8 are consecutive moments of ONE explosion.", world="2.8 m")
asset("fx_spark", title="Spark particle", path="assets/sprites/fx_spark.png", prio="P2", kind="single", size=(128, 128), used="Additive spark particles.", desc="A soft white radial glow dot with a bright core on a transparent background.", prompt_extra="Centred, transparent, white only (the game tints it).", world="0.3 m")
asset("fx_glow", title="Glow sprite", path="assets/sprites/fx_glow.png", prio="P2", kind="single", size=(256, 256), used="Gun crystal glow, flashes, beam heads, temple light.", desc="Soft round white radial gradient glow, fully transparent at the edges.", prompt_extra="Centred, transparent, white only.", world="varies")
asset("fx_smoke", title="Smoke puff", path="assets/sprites/fx_smoke.png", prio="P2", kind="single", size=(256, 256), used="Dust puffs when running, hatch opening, seal slamming, smoke after explosions.", desc="A fluffy cartoon smoke puff silhouette in white with soft edges on a transparent background.", prompt_extra="Centred, transparent, white only (tinted in-game).", world="0.6–1.6 m")
asset("fx_shockwave", title="Shockwave ring", path="assets/sprites/fx_shockwave.png", prio="P2", kind="single", size=(512, 512), used="Expanding floor rings: gun rise, activation, emergency pulse, tap-to-move marker.", desc="A thin bright white ring with a soft outer glow on a transparent background.", prompt_extra="Centred, transparent, white only.", world="varies")
asset("fx_laser", title="Laser gradient", path="assets/sprites/fx_laser.png", prio="P2", kind="single", size=(256, 64), used="Optional gradient used by beam ribbons (the sector laser itself is a shader).", desc="Horizontal white gradient: solid bright left fading to soft transparent right.", prompt_extra="Flat gradient strip.", world="—")

# ------------------------------------------------------------------ ui
asset("ui_logo", title="Game logo", path="assets/ui/logo.png", prio="P0", kind="single", size=(1600, 900),
      used="Title screen and loading screen.", desc="Game logo: the words \"SECTOR ESCAPE\" in big chunky golden-yellow (top word) and orange (bottom word) comic lettering with thick black outlines and a drop shadow, a dark-green ribbon banner below reading \"THE LOST JUNGLE\" in white; behind the letters a cyan glowing ring with a highlighted pie-slice sector, framed by jungle leaves. Transparent background.",
      prompt_extra="Centred composition, transparent background. The text must read exactly: SECTOR ESCAPE / THE LOST JUNGLE.", world="—")
asset("ui_parchment", title="Story parchment panel", path="assets/ui/parchment.png", prio="P1", kind="single", size=(1024, 768),
      used="Background of the story/introduction panel (text is rendered by the game on top).", desc="An aged parchment sheet with torn uneven edges, subtle stains and fibre texture, slightly darker vignette, an empty area (no text!).", prompt_extra="Flat, front view, fills the canvas, NO text.", world="—", style=BG_STYLE)
asset("ui_story_art", title="Story illustration (polaroid)", path="assets/ui/story_illustration.png", prio="P1", kind="single", size=(800, 600),
      used="The photo pinned on the story parchment.", desc="A painted jungle vista at sunrise: a chain of overlapping circular stone arenas half-hidden by canopy, a glowing cyan light rising from one centre, a lost temple on a far hill, mist, exotic birds.", prompt_extra="Landscape 4:3 composition, no frame, no text.", world="—", style=BG_STYLE)
asset("ui_map_bg", title="Map backdrop – painted jungle", path="assets/ui/map_bg.png", prio="P1", kind="single", size=(1920, 1080),
      used="Backdrop of the 2D expedition-route map (darkened and vignetted by the game; the route, rings and temple are drawn on top). Keep the left two-thirds calm: that is where the route snakes; the right third sits under the docked panel.", desc="Top-down painted jungle at dusk: a winding river along the left side, large calm canopy masses in 2–3 dark greens with clear open clearings between them, a few ancient stone ruins, mist pooling in the low areas, moody teal-green palette (#142925 base). No markers, no text, no circles, no paths.", prompt_extra="Top-down 16:9 illustrated map, no text, no icons, low detail so a route can be drawn over it.", world="—", style=BG_STYLE)
asset("ui_map_node", title="Overview arena badges – 4 states", path="assets/ui/map_node.png", prio="P1", kind="sheet", size=(1024, 256), grid=(4, 1), cell=(256, 256),
      used="Arena badges drawn over the live overview at each ring's centre.", anims=[("0", "locked / open / cleared / boss", 4, 0, "static", "cell 1 grey ring with a padlock; cell 2 golden ring with a cyan sector glyph; cell 3 green ring with a white check mark; cell 4 red ring with a horned robot skull")],
      desc="Round stone medallion markers seen from above with a coloured glowing ring (grey, gold, green, red) and the state icon in the centre.", prompt_extra="Four circular icons, one per cell, centred, transparent background.", world="—")
asset("ui_map_marker", title="Overview player marker", path="assets/ui/map_marker.png", prio="P2", kind="single", size=(256, 256), used="Karan's badge (optional on the overview).", desc=f"Round teal badge with the smiling face of {HERO.split(':')[0]} inside (head and shoulders), cyan glow, thick outline.", prompt_extra="Centred, transparent background.", world="—")
asset("ui_map_temple", title="Temple icon", path="assets/ui/map_temple.png", prio="P2", kind="single", size=(512, 512), used="Optional destination icon.", desc="A golden-lit ancient step temple icon with a glowing sun disc at its top and jungle leaves at the base.", prompt_extra="Centred, transparent background.", world="—")
asset("ui_shield", title="HUD shields – full / empty", path="assets/ui/shield.png", prio="P1", kind="sheet", size=(256, 128), grid=(2, 1), cell=(128, 128),
      used="Health indicator (3 shields).", anims=[("0", "full / empty", 2, 0, "static", "cell 1 glossy bright blue shield with a cyan glow; cell 2 dark cracked grey shield")],
      desc="Comic-style shield icons with thick outlines.", prompt_extra="Two icons, one per cell, centred, transparent background.", world="—")
asset("ui_icons", title="HUD icon set", path="assets/ui/icons.png", prio="P1", kind="sheet", size=(1024, 128), grid=(8, 1), cell=(128, 128),
      used="HUD and results icons.", anims=[("0", "timer, star, star-empty, hint-bulb, sound-on, sound-off, pause, play", 8, 0, "static", "one icon per cell in that exact order")],
      desc="Chunky white glyph icons with thick black outlines (star is golden, empty star dark grey, bulb yellow).", prompt_extra="Eight icons, one per cell, centred, transparent background, same stroke weight.", world="—")

INDEX_HDR = """# Asset Index – Sector Escape: The Lost Jungle

Every visual asset the game loads, with its spec sheet. **The game runs without any of these files** – a procedural placeholder is drawn for anything missing – so you can produce them in any order. Save each file at the exact `assets/...` path (PNG), then run `python3 tools/optimize_assets.py` to convert to WebP and update the manifest.

**Status (2026-10-21, final):** all assets are installed, including the redesign set (`jungle_canopy`, `forest_silhouette`, `wall_pillar`, the dusk `ui_map_bg`) and new versions of `causeway_stone`, `causeway_side`, `water`, `floor_hatch`, `seal_slab` and `jungle_rocks`. Every sprite sheet carries a measured `baseline` in `assets/manifest.json` so characters and plants stand on the ground. `wall_pillar` is not drawn as a sprite: the game cuts it into capital / shaft / base bands and wraps them around the 3D junction columns. Retired: `gate_large_door`, `energy_lock`; `gate_large_frame` is the temple gate.

Priority: **P0** core look · **P1** polish · **P2** optional (procedural version is fine).

Shared rules for every prompt are in [STYLE_GUIDE.md](STYLE_GUIDE.md). Verify sprite sheets with `tools/sheet-viewer.html`.

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
