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
import { CHAIN, LEVELS, TOTAL_LEVELS, validateChain, SEAL_BEHIND } from './game/levels.js';
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
      const c = await ui.title.show(this.resumeInfo());
      if (c === 'howto') { await ui.howto.show(); continue; }
      if (c === 'continue') { ui.hideAll(); const r = await this.playFrom(this.resumeInfo().id); return this.mapLoop(r.lastId); }   // straight back into the saved arena
      if (c === 'play' && !data.seenStory) { await ui.story.show(); data.seenStory = true; save.write(); }
      break;
    }
    return this.mapLoop();
  }
  /** Where Continue resumes: the next arena to play (null for a brand-new player). */
  resumeInfo() { const d = save.load(); const has = d.unlocked > 1 || Object.keys(d.cleared).length > 0; return has ? { id: Math.min(TOTAL_LEVELS, d.unlocked) } : null; }
  /* Title shot (LXD): dusk, low on the causeway and close to the gate; Karan stands with his back to us facing the gate;
     the temple glows with the low sun behind it; the camera drifts slowly toward the gate and back. */
  showIdle() {
    this.chain.setActiveArena(0); this.chain.applySky('evening', 1.2); this.chain.setFogDensity(0.0042); this.chain.setFocus(-1, false, 0.3); this.chain.setFireflies(true);
    this.chain.resetStartGate(false); this.chain.cutRing = -1; this.chain.fadeOff = true; this.bots.clear(); this.cannon.reset();   // walls stay solid on the title
    // camera on the left edge of the causeway: the bridge runs up the right of the frame to the gate, clear of the logo column
    const far = new THREE.Vector3(-37, 2.75, -1.6), near = new THREE.Vector3(-31.5, 2.55, -1.4), target = new THREE.Vector3(-8, 3.0, 1.2);
    this.chain.setTitleMode(true, { camPos: far });   // the evening sky itself is global (chain.js); this adds the lake mist + torch light
    this.hero.group.visible = true; this.hero.stop(); this.hero.control = false; this.hero.setPosition(new THREE.Vector3(-24.5, 0, 0.5)); this.hero.face(new THREE.Vector3(1, 0, 0));
    const t0 = this.world.elapsed;
    this.world.rig.setPose({ pos: far, target, fov: 50 });                      // start on the shot (no swoop), then drift
    this.world.rig.follow((out) => { const t = this.world.elapsed - t0, k = (1 - Math.cos((t / 46) * Math.PI * 2)) / 2; out.pos.lerpVectors(far, near, k).add(new THREE.Vector3(0, Math.sin(t * 0.37) * 0.06, Math.sin(t * 0.21) * 0.12)); out.target.copy(target); out.fov = 50; return out; }, 3);
  }

  async mapLoop(selectedId = null) {
    for (;;) {
      const data = save.load();
      const id = await ui.map.show({ saveData: data, selectedId: selectedId ?? data.unlocked });
      ui.map.hide();
      if (id == null) {
        this.showIdle();
        let c = await ui.title.show(this.resumeInfo());
        while (c === 'howto') { await ui.howto.show(); c = await ui.title.show(this.resumeInfo()); }
        if (c === 'continue') { const r = await this.playFrom(this.resumeInfo().id); selectedId = r.lastId; }
        continue;
      }
      const r = await this.playFrom(id);
      selectedId = r.lastId;
    }
  }

  /** Play the chain from arena `startId` to the temple (or until game over / quit). */
  async playFrom(startId) {
    ui.hideAll(); ui.hud.show(); this.sessionScore = 0; this.runLog = []; this.lastShields = null; this.chain.setFireflies(false); this.chain.setTitleMode(false, { dur: 0.6 }); this.chain.fadeOff = false; this.chain.setFogDensity(0.0034, 0.6);
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
        if (res.retry) { this.bots.clear(); this.resetWorldFor(index); scene = new ArenaScene(this, index, { mode: 'inside' }); continue; }   // results card → Retry
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
    this.chain.seals.forEach((s, i) => { if (!s) return; if (SEAL_BEHIND && i < index) this.chain.raiseSeal(i, true); else this.chain.lowerSeal(i); });
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
  assets, audio, THREE, ui,
};
game.boot().catch((e) => { console.error(e); document.getElementById('loading-text').textContent = 'Error: ' + e.message; });
