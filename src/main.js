// ---------------------------------------------------------------------------
// Sector Escape – The Lost Jungle · bootstrap & meta-game flow
// URL params: ?level=3  ?skip=1 (skip the causeway)  ?auto=1 (hero auto-runs)  ?mute=1  ?reset=1
// ---------------------------------------------------------------------------
import * as THREE from '../vendor/three.module.js';
import { World } from './engine/world.js';
import { assets } from './engine/assets.js';
import { audio } from './engine/audio.js';
import { FX } from './engine/fx.js';
import { Hero } from './game/hero.js';
import { ChainWorld } from './game/chain.js';
import { Cannon } from './game/cannon.js';
import { BotManager } from './game/bots.js';
import { ArenaScene } from './game/arenaScene.js';
import { CHAIN, LEVELS, TOTAL_LEVELS, validateChain } from './game/levels.js';
import { save } from './game/save.js';
import { ui } from './ui/ui.js';
import { polar, DEG } from './engine/util.js';

const params = new URLSearchParams(location.search);

class Game {
  constructor() {
    this.levels = LEVELS; this.scene = null; this.nextScene = null; this.sessionScore = 0; this.phase = 'boot';
    this.skipCutscenes = params.get('skip') === '1'; this.autoRun = params.get('auto') === '1';
    if (params.get('reset') === '1') save.reset();
    if (params.get('mute') === '1') audio.setMuted(true);
  }
  async boot() {
    ui.init(this);
    const problems = validateChain(); if (problems.length) console.warn('[chain]', problems);
    await assets.loadManifest();
    await assets.loadAll((p, name) => ui.loading.progress(p, name));
    ui.applyArt();
    this.world = new World(document.getElementById('game'), document.getElementById('labels'));
    this.fx = new FX(this.world); this.world.addUpdatable(this.fx);
    this.hero = new Hero(this.world, this.fx); this.world.addUpdatable(this.hero); this.hero.group.visible = false;
    this.chain = new ChainWorld(this.world, this.fx); this.world.addUpdatable(this.chain);
    this.cannon = new Cannon(this.world, this.fx); this.world.addUpdatable(this.cannon);
    this.bots = new BotManager(this.world, this.fx); this.world.addUpdatable(this.bots);
    try { this.world.renderer.compile(this.world.scene, this.world.camera); } catch {}
    const unlock = () => { audio.unlock(); if (!audio.ambient.running && !this.scene) { audio.ambient.start('jungle'); audio.music.start('title'); } };
    window.addEventListener('pointerdown', unlock); window.addEventListener('keydown', unlock);
    this.world.start();
    this.showIdle();
    const direct = parseInt(params.get('level') || '', 10);
    if (direct >= 1 && direct <= TOTAL_LEVELS) { ui.hideAll(); const r = await this.playFrom(direct); return this.mapLoop(r.lastId); }
    const data = save.load();
    for (;;) {
      const c = await ui.title.show(data.unlocked > 1 || Object.keys(data.cleared).length > 0);
      if (c === 'howto') { await ui.howto.show(); continue; }
      if (c === 'play' && !data.seenStory) { await ui.story.show(); data.seenStory = true; save.write(); }
      break;
    }
    return this.mapLoop();
  }
  /* locked cinematic title shot: down the causeway toward the gate, a slow breath of camera drift */
  showIdle() {
    this.hero.group.visible = false; this.chain.setActiveArena(0); this.chain.applySky('night', 1.2); this.chain.setFogDensity(0.0055); this.chain.setFocus(-1, false, 0.3); this.chain.setFireflies(true);
    this.chain.resetStartGate(false); this.chain.cutRing = -1;
    const base = { pos: new THREE.Vector3(-43, 3.3, 0.9), target: new THREE.Vector3(-8, 3.0, -3.6) };
    this.world.rig.follow((out) => { const t = this.world.elapsed; out.pos.copy(base.pos).add(new THREE.Vector3(Math.sin(t * 0.21) * 0.5, Math.sin(t * 0.17) * 0.15, 0)); out.target.copy(base.target); out.fov = 50; return out; }, 30);
  }

  async mapLoop(selectedId = null) {
    for (;;) {
      const data = save.load();
      const id = await ui.map.show({ saveData: data, selectedId: selectedId ?? data.unlocked });
      ui.map.hide();
      if (id == null) { this.showIdle(); const c = await ui.title.show(true); if (c === 'howto') await ui.howto.show(); continue; }
      const r = await this.playFrom(id);
      selectedId = r.lastId;
    }
  }

  /** Play the chain from arena `startId` to the temple (or until game over / quit). */
  async playFrom(startId) {
    ui.hideAll(); ui.hud.show(); this.sessionScore = 0; this.runLog = []; this.chain.setFireflies(false); this.chain.setFogDensity(0.0034, 0.6);
    let index = startId - 1;
    this.resetWorldFor(index);
    let scene = new ArenaScene(this, index, { mode: index === 0 && !this.skipCutscenes ? 'causeway' : 'inside' });
    for (;;) {
      this.scene = scene; this.nextScene = null;
      const res = await scene.run();
      const level = CHAIN.arenas[index].level;
      if (res.outcome === 'cleared') {
        save.clearedLevel(level.id, res.score.stars, res.score.total, TOTAL_LEVELS); this.sessionScore += res.score.total; ui.hud.setScore(this.sessionScore);
        this.runLog.push({ id: level.id, name: level.name, stars: res.score.stars, score: res.score.total });
        scene.dispose();
        if (index === CHAIN.arenas.length - 1) {
          this.scene = null; this.phase = 'finale';
          await ArenaScene.finale(this);
          const d = save.load(); const stars = Object.values(d.stars).reduce((s, v) => s + v, 0);
          await ui.results.show({ perArena: this.runLog, sessionTotal: this.sessionScore, total: d.totalScore, stars });
          this.finish(); return { lastId: level.id };
        }
        index++; scene = this.nextScene || new ArenaScene(this, index, { mode: 'entering' }); continue;
      }
      if (res.outcome === 'gameover') {
        const c = await ui.gameover.show(); scene.dispose(); this.bots.clear();
        if (c === 'retry') { this.resetWorldFor(index); scene = new ArenaScene(this, index, { mode: 'inside' }); continue; }
        this.finish(); return { lastId: level.id };
      }
      scene.dispose(); this.bots.clear(); this.finish(); return { lastId: level.id };
    }
  }
  prepareNext(index) { if (index < CHAIN.arenas.length) this.nextScene = new ArenaScene(this, index, { mode: 'entering' }); }
  resetWorldFor(index) {
    this.chain.seals.forEach((s, i) => { if (!s) return; if (i < index) this.chain.raiseSeal(i, true); else this.chain.lowerSeal(i); });
    CHAIN.arenas.forEach((a) => this.chain.closeHatch(a.index));
    this.chain.resetStartGate(false);
    this.cannon.reset();
  }
  finish() { this.scene = null; this.nextScene = null; ui.hud.hide(); this.showIdle(); audio.music.setMode('title'); audio.ambient.setMode('jungle'); }
  onPhase(p) { this.phase = p; }
  async togglePause() {
    if (!this.scene || this.pausing || this.world.paused) return;
    this.pausing = true; this.world.paused = true; audio.music.setMode('calm');
    const c = await ui.pause.show();
    this.world.paused = false; this.pausing = false;
    if (c === 'map' && this.scene) this.scene.abort();
    else audio.music.setMode(this.scene && this.scene.phase === 'input' ? 'tension' : 'arena');
  }
}

const game = new Game();
window.__se = {
  game, CHAIN,
  get scene() { return game.scene; },
  get phase() { return game.scene ? game.scene.phase : game.phase; },
  fire(v) { ui.panel.setValue(v); ui.panel.fire(); },
  hint() { ui.panel.hint(); },
  assets, audio, THREE,
};
game.boot().catch((e) => { console.error(e); document.getElementById('loading-text').textContent = 'Error: ' + e.message; });
