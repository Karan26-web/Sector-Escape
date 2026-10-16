// ---------------------------------------------------------------------------
// Sector Escape – The Lost Jungle · bootstrap & meta-game flow
// URL params: ?level=3  ?skip=1 (skip cutscenes)  ?auto=1 (hero auto-runs)  ?mute=1  ?reset=1
// ---------------------------------------------------------------------------
import * as THREE from '../vendor/three.module.js';
import { World } from './engine/world.js';
import { assets } from './engine/assets.js';
import { audio } from './engine/audio.js';
import { FX } from './engine/fx.js';
import { Hero } from './game/hero.js';
import { Arena } from './game/arena.js';
import { ArenaScene } from './game/arenaScene.js';
import { LEVELS, TOTAL_LEVELS, getLevel, validateLevels, resolveLevel } from './game/levels.js';
import { save } from './game/save.js';
import { ui } from './ui/ui.js';
import { polar } from './engine/util.js';

const params = new URLSearchParams(location.search);

class Game {
  constructor() {
    this.levels = LEVELS; this.scene = null; this.backdrop = null; this.sessionScore = 0; this.phase = 'boot';
    this.skipCutscenes = params.get('skip') === '1'; this.autoRun = params.get('auto') === '1';
    if (params.get('reset') === '1') save.reset();
    if (params.get('mute') === '1') audio.setMuted(true);
  }
  async boot() {
    ui.init(this);
    const problems = validateLevels(); if (problems.length) console.warn('[levels]', problems);
    await assets.loadManifest();
    await assets.loadAll((p, name) => ui.loading.progress(p, name));
    ui.applyArt();
    this.world = new World(document.getElementById('game'), document.getElementById('labels'));
    this.fx = new FX(this.world); this.world.addUpdatable(this.fx);
    this.hero = new Hero(this.world, this.fx); this.world.addUpdatable(this.hero); this.hero.group.visible = false;
    const unlock = () => { audio.unlock(); if (!audio.ambient.running && !this.scene) { audio.ambient.start('jungle'); audio.music.start('title'); } };
    window.addEventListener('pointerdown', unlock); window.addEventListener('keydown', unlock);
    this.world.start();
    this.showBackdrop();
    const direct = parseInt(params.get('level') || '', 10);
    if (direct >= 1 && direct <= TOTAL_LEVELS) {
      ui.hideAll(); const res = await this.playLevel(direct);
      if (res.outcome === 'cleared') { const d = save.clearedLevel(direct, res.score.stars, res.score.total, TOTAL_LEVELS); if (direct === TOTAL_LEVELS) await this.showEnding(d); }
      return this.mapLoop(res.outcome === 'cleared' ? Math.min(TOTAL_LEVELS, direct + 1) : direct);
    }
    // title loop
    const data = save.load();
    for (;;) {
      const c = await ui.title.show(data.unlocked > 1 || Object.keys(data.cleared).length > 0);
      if (c === 'howto') { await ui.howto.show(); continue; }
      if (c === 'play' && !data.seenStory) { await ui.story.show(); data.seenStory = true; save.write(); }
      break;
    }
    return this.mapLoop();
  }
  /* slow orbit around arena 1 behind the title / map */
  showBackdrop() {
    if (this.backdrop) return;
    this.backdrop = new Arena(this.world, LEVELS[0]); this.world.addUpdatable(this.backdrop);
    const R = LEVELS[0].radius;
    this.world.rig.follow((out) => { const t = this.world.elapsed * 6; const p = polar(t, R * 1.9); out.pos.set(p.x, R * 0.95, p.z); out.target.set(0, 2, 0); out.fov = 50; return out; }, 20);
  }
  hideBackdrop() { if (!this.backdrop) return; this.world.removeUpdatable(this.backdrop); this.backdrop.dispose(); this.backdrop = null; }

  async mapLoop(currentId = null) {
    let travel = null;
    for (;;) {
      this.showBackdrop();
      const data = save.load();
      const p = ui.map.show({ levels: LEVELS, saveData: data, currentId: travel ? travel[0] : (currentId ?? data.unlocked) });
      if (travel) { await new Promise((r) => setTimeout(r, 450)); await ui.map.travel(travel[0], travel[1]); travel = null; }
      const chosen = await p;
      if (chosen == null) { const c = await ui.title.show(true); if (c === 'howto') await ui.howto.show(); continue; }
      ui.map.hide();
      const res = await this.playLevel(chosen);
      currentId = chosen;
      if (res.outcome !== 'cleared') continue;
      const d = save.clearedLevel(chosen, res.score.stars, res.score.total, TOTAL_LEVELS);
      if (chosen === TOTAL_LEVELS) { await this.showEnding(d); continue; }
      travel = [chosen, chosen + 1]; currentId = chosen + 1;
    }
  }
  async showEnding(d) {
    const stars = Object.values(d.stars).reduce((s, v) => s + v, 0);
    const c = await ui.ending.show({ total: d.totalScore, stars }); if (c === 'reset') save.reset();
  }
  afterLevel(id, res) { if (res.outcome === 'cleared') save.clearedLevel(id, res.score.stars, res.score.total, TOTAL_LEVELS); }

  async playLevel(id, skipIntro = false, resolved = null) {
    // variant: cycles with the number of times this arena was cleared (new numbers on replay); ?variant=K overrides
    const forced = parseInt(params.get('variant') || '', 10);
    const level = resolved || resolveLevel(getLevel(id), Number.isFinite(forced) ? forced : (save.load().clears?.[id] || 0));
    this.hideBackdrop(); ui.hideAll(); ui.hud.show();
    const scene = new ArenaScene(this, level, { skipIntro }); this.scene = scene;
    const res = await scene.run();
    if (res.outcome === 'gameover') {
      const c = await ui.gameover.show(); scene.dispose(); this.scene = null;
      if (c === 'retry') return this.playLevel(id, true, level);
      return res;
    }
    if (res.outcome === 'cleared') { this.sessionScore += res.score.total; ui.hud.setScore(this.sessionScore); await ui.results.show({ level, score: res.score }); }
    scene.dispose(); this.scene = null; ui.hud.hide();
    return res;
  }
  addScore(n) { this.sessionScore += n; ui.hud.setScore(this.sessionScore); }
  onPhase(p) { this.phase = p; }
  async togglePause() {
    if (!this.scene || this.pausing) return;
    if (this.world.paused) return; // handled by the pause screen
    this.pausing = true; this.world.paused = true; audio.music.setMode('calm');
    const c = await ui.pause.show();
    this.world.paused = false; this.pausing = false;
    if (c === 'map' && this.scene) { this.scene.abort(); }
    else audio.music.setMode(this.scene && this.scene.phase === 'input' ? 'tension' : 'arena');
  }
}

const game = new Game();
window.__se = {
  game,
  get scene() { return game.scene; },
  get phase() { return game.scene ? game.scene.phase : game.phase; },
  fire(v) { ui.panel.setValue(v); ui.panel.fire(); },
  hint() { ui.panel.hint(); },
  assets, audio, THREE,
};
game.boot().catch((e) => { console.error(e); document.getElementById('loading-text').textContent = 'Error: ' + e.message; });
