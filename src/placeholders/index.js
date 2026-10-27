// Registry: manifest key → placeholder generator(def, assets) → canvas
import { heroSheet, botSheet, bossSheet } from './chars.js';
import * as T from './textures.js';
import * as F from './fx.js';
import * as U from './ui.js';

export const PLACEHOLDERS = {
  hero_front: (def) => heroSheet(false, 8, (def.sheet && def.sheet.rows) || 5),   // follow the manifest grid (the front-run row)
  hero_back: (def) => heroSheet(true, 8, (def.sheet && def.sheet.rows) || 2),   // follow the manifest grid (the cast row)
  enemy_bot: (def) => botSheet(8, (def.sheet && def.sheet.rows) || 4, 256, 296, def.baseline),   // follow the manifest grid (pound row, 296 px cells)
  boss_warden: () => bossSheet(),
  torch: () => T.torchSheet(),
  jungle_tree: () => T.treeSheet(),
  jungle_plant: () => T.plantSheet(),
  jungle_rocks: () => T.rockSheet(),
  water: () => T.waterTex(),
  causeway_stone: () => T.causewayStone(),
  causeway_side: () => T.causewaySide(),
  cannon_orbs: () => { const c = document.createElement('canvas'); c.width = 768; c.height = 192; const g = c.getContext('2d'); for (let i = 0; i < 4; i++) { const s = 80 + i * 36; g.drawImage(F.glowTex(256), i * 192 + (192 - s) / 2, (192 - s) / 2, s, s); } return c; },
  seal_slab: () => T.sealSlab(),
  wall_pillar: () => T.wallPillar(),
  arena_floor: () => T.arenaFloor(),
  arena_wall: () => T.arenaWall(1024, 1024),
  wall_top: () => T.wallTop(),
  ground_jungle: () => T.groundJungle(),
  jungle_panorama: () => T.junglePanorama(),
  sky: () => T.skyDome(),
  gate_small_frame: () => T.gateFrame(1024, false),
  gate_small_door: () => T.gateDoor(512, 1024, false),
  gate_large_frame: () => T.gateFrame(2048, true),
  fx_explosion: () => F.explosionSheet(),
  fx_spark: () => F.sparkTex(),
  fx_glow: () => F.glowTex(),
  fx_smoke: () => F.smokeTex(),
  fx_shockwave: () => F.shockwaveTex(),
  ui_logo: () => U.logo(),
  ui_parchment: () => U.parchment(),
  ui_story_art: () => U.storyArt(),
  temple: () => U.mapTemple(),
  ui_shield: () => U.shieldSheet(),
  ui_icons: () => U.iconSheet(),
};
