// ---------------------------------------------------------------------------
// Sector Escape – The Lost Jungle · bootstrap & meta-game flow
// URL params: ?level=3  ?skip=1 (skip the causeway)  ?mute=1  ?reset=1  ?auto=1 (Karan walks to each goal by himself: tests)
// ---------------------------------------------------------------------------
import * as THREE from '../vendor/three.module.js';
import { World } from './engine/world.js';
import { assets } from './engine/assets.js';
import { audio } from './engine/audio.js';
import { vo } from './engine/vo.js';
import { FX } from './engine/fx.js';
import { Hero } from './game/hero.js';
import { ChainWorld } from './game/chain.js';
import { Sector } from './game/sector.js';
import { Barrier } from './game/barrier.js';
import { BotManager } from './game/bots.js';
import { ArenaScene } from './game/arenaScene.js';
import { Roam } from './game/roam.js';
import { Markers } from './game/markers.js';
import { controller } from './engine/controller.js';
import { CHAIN, LEVELS, TOTAL_LEVELS, validateChain, SEAL_BEHIND } from './game/levels.js';
import { save } from './game/save.js';
import { ui } from './ui/ui.js';
import { polar, DEG } from './engine/util.js';

const params = new URLSearchParams(location.search);

class Game {
  constructor() {
    this.levels = LEVELS; this.scene = null; this.nextScene = null; this.sessionScore = 0; this.phase = 'boot';
    this.skipCutscenes = params.get('skip') === '1';
    this.ready = new Promise((res) => { this.setReady = res; });   // resolved once everything is loaded and warmed up (boot)
    if (params.get('reset') === '1') save.reset();
    if (params.get('mute') === '1') audio.setMuted(true);
  }
  async boot() {
    ui.init(this); controller.init();
    const problems = validateChain(); if (problems.length) console.warn('[chain]', problems);
    // Everything is ready before the first screen (user, 2026-10-23): the art (downloaded and decoded), the fonts, then every
    // texture on the GPU and every shader compiled, so nothing pops in or stalls once the game is running.
    await assets.loadManifest();
    const fonts = this.loadFonts();                                                   // the fonts download alongside the art
    await assets.loadAll((p) => ui.loading.progress(p * 0.8, 'Loading the jungle…'), { first: ['ui_logo'], onFirst: () => ui.loading.logo() });   // the logo first, for the loading screen
    await Promise.race([fonts, new Promise((r) => setTimeout(r, 4000))]);           // then at most 4 s more for them (offline, or Google Fonts blocked)
    ui.loading.progress(0.84, 'Preparing the arenas…');
    ui.applyArt();
    this.world = new World(document.getElementById('game'), document.getElementById('labels'));
    this.fx = new FX(this.world); this.world.addUpdatable(this.fx);
    this.hero = new Hero(this.world, this.fx); this.world.addUpdatable(this.hero); this.hero.group.visible = false;
    this.chain = new ChainWorld(this.world, this.fx); this.world.addUpdatable(this.chain);
    this.sector = new Sector(this.world, this.fx); this.world.addUpdatable(this.sector);
    this.barrier = new Barrier(this.world, this.fx); this.world.addUpdatable(this.barrier);
    this.bots = new BotManager(this.world, this.fx); this.world.addUpdatable(this.bots);
    // the player's walks (user 2026-10-27) and the goals they light up; the markers are built now so they compile with the rest
    this.markers = new Markers(this.world, this.fx, this.chain); this.world.addUpdatable(this.markers);
    this.roam = new Roam(this); this.roam.autopilot = params.get('auto') === '1';
    // the Warden's purple light exists from the start (unlit) and is lent to it: the light count never changes mid-game
    this.bossLight = new THREE.PointLight(0xa050ff, 0, 25, 2); this.bossLight.position.set(0, -40, 0); this.world.add(this.bossLight);
    this.showIdle();                                                                  // the title scene, with the lights the game plays with
    await this.warmUp((p) => ui.loading.progress(0.84 + p * 0.16, 'Preparing the arenas…'));
    ui.loading.progress(1, 'Ready'); await new Promise((r) => setTimeout(r, 250));   // a beat on the full bar, then the title buttons pop in
    this.setReady();
    const unlock = () => { audio.unlock(); if (!audio.ambient.running && !this.scene) { audio.ambient.start('jungle'); audio.music.start('title'); } };
    for (const ev of ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown']) window.addEventListener(ev, unlock);   // (a touch's pointerdown is not a gesture everywhere: the tap's end is)
    this.world.start();
    const direct = parseInt(params.get('level') || '', 10);
    if (direct >= 1 && direct <= TOTAL_LEVELS) { ui.hideAll(); const r = await this.playFrom(direct); return this.mapLoop(r.lastId); }
    await this.soundGate(unlock);
    while (await ui.title.show() === 'howto') await ui.howto.show();
    ui.hideAll(); const r = await this.playFromStart();
    return this.mapLoop(r.lastId);
  }
  /** The title greets the player aloud (user 2026-11-05: the voice-over). Browsers keep sound off until the page is touched,
   *  so when it is off the finished loading screen asks for one tap; muted, or where sound may already play, the title
   *  comes straight up. unlock: the first-touch handler (it starts the title's music and jungle bed). */
  async soundGate(unlock) {
    if (audio.muted) return;
    audio.unlock(); await new Promise((r) => setTimeout(r, 150));
    if (!(audio.ctx && audio.ctx.state === 'running')) await ui.loading.tapToStart();
    unlock();
    for (let i = 0; i < 20 && !(audio.ctx && audio.ctx.state === 'running'); i++) await new Promise((r) => setTimeout(r, 50));
  }
  /** Load the UI fonts, every weight the CSS uses, so no screen swaps fonts later. Their stylesheet loads without blocking
   *  the first paint (index.html), so it is awaited first. Boot caps the wait once the art is in. */
  loadFonts() {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    const css = document.getElementById('font-css');
    const sheet = !css || css.dataset.done ? Promise.resolve() : new Promise((r) => { css.addEventListener('load', r, { once: true }); css.addEventListener('error', r, { once: true }); });
    const want = ['700', '800'].map((w) => `${w} 20px "Barlow Condensed"`).concat(['400', '500', '600', '700'].map((w) => `${w} 16px Poppins`));
    return sheet.then(() => Promise.all(want.map((f) => document.fonts.load(f).catch(() => null))));
  }
  /** The GPU side of loading: upload every texture the world uses, including those that only appear later (the guardians,
   *  the Warden, the effects), and compile every shader (the later effects keep invisible warm-up copies in the scene).
   *  Otherwise each would stall a frame the first time it is seen. */
  async warmUp(onProgress) {
    const r = this.world.renderer, scene = this.world.scene, cam = this.world.camera, texes = new Set();
    for (const n of ['enemy_bot', 'boss_warden', 'fx_explosion', 'fx_spark', 'fx_glow', 'fx_smoke', 'fx_shockwave', 'cannon_orbs']) { const t = assets.texture(n, { wrap: false }); if (t) texes.add(t); }
    scene.traverse((o) => {
      for (const m of [].concat(o.material || [])) {
        for (const k of ['map', 'alphaMap', 'emissiveMap']) if (m[k] && m[k].isTexture) texes.add(m[k]);
        if (m.uniforms) for (const u of Object.values(m.uniforms)) if (u && u.value && u.value.isTexture) texes.add(u.value);
      }
    });
    const nextFrame = () => new Promise((res) => requestAnimationFrame(() => res()));
    let i = 0;
    for (const t of texes) { try { r.initTexture(t); } catch {} if (++i % 5 === 0) { onProgress((0.75 * i) / texes.size); await nextFrame(); } }
    onProgress(0.8); await nextFrame();
    try { if (r.compileAsync && r.extensions.has('KHR_parallel_shader_compile')) await r.compileAsync(scene, cam); else r.compile(scene, cam); } catch (e) { console.warn('[warm-up]', e); }
    onProgress(1); await nextFrame();
  }
  /* Title shot (LXD): dusk, low on the causeway and close to the gate; Karan stands with his back to us facing the gate;
     the temple glows with the low sun behind it; the camera drifts slowly toward the gate and back. */
  showIdle() {
    this.chain.setActiveArena(0); this.chain.applySky('evening', 1.2); this.chain.setFogDensity(0.0042); this.chain.setFocus(-1, false, 0.3); this.chain.setFireflies(true);
    this.chain.resetStartGate(false); this.chain.cutRing = -1; this.chain.fadeOff = true; this.bots.clear(); this.sector.reset(); this.barrier.hide();   // walls stay solid on the title
    this.chain.setBeam(false);   // (the temple's beam belongs to the journey: the opening raises it)
    // camera on the left edge of the causeway: the bridge runs up the right of the frame to the gate, clear of the logo column
    const far = new THREE.Vector3(-37, 2.75, -1.6), near = new THREE.Vector3(-31.5, 2.55, -1.4), target = new THREE.Vector3(-8, 3.0, 1.2);
    this.chain.setTitleMode(true, { camPos: far });   // the evening sky itself is global (chain.js); this adds the lake mist + torch light
    this.hero.group.visible = true; this.hero.stop(); this.hero.standUp(); this.hero.control = false;   // (a pile-on game over leaves him down) this.hero.setPosition(new THREE.Vector3(-24.5, 0, 0.5)); this.hero.face(new THREE.Vector3(1, 0, 0));
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
        while (await ui.title.show() === 'howto') await ui.howto.show();
        const r = await this.playFromStart(); selectedId = r.lastId;
        continue;
      }
      const r = await this.playFrom(id);
      selectedId = r.lastId;
    }
  }

  /** Play (user 2026-10-27: no Continue): every game starts from the very start, the opening and then arena 1. */
  playFromStart() { return this.playFrom(1, { opening: true }); }
  /** Play the chain from arena `startId` to the temple (or until game over / quit). opening: arena 1 starts with the opening. */
  async playFrom(startId, { opening = false } = {}) {
    await this.ready;   // the start is guarded: never before everything is loaded
    ui.hideAll(); ui.hud.show(); this.sessionScore = 0; this.runLog = []; this.lastShields = null; this.chain.setFireflies(false); this.chain.setTitleMode(false, { dur: 0.6 }); this.chain.fadeOff = false; this.chain.setFogDensity(0.0034, 0.6);
    let index = startId - 1;
    const causeway = index === 0 && !this.skipCutscenes;
    if (!(opening && causeway)) this.chain.setBeam(true);   // the temple's beam marks the goal from everywhere (the opening raises it)
    this.resetWorldFor(index);
    let scene = new ArenaScene(this, index, { mode: causeway ? 'causeway' : 'inside', opening: opening && causeway });
    for (;;) {
      this.scene = scene; this.nextScene = null;
      const res = await scene.run();
      const level = CHAIN.arenas[index].level;
      if (res.outcome === 'cleared') {
        save.clearedLevel(level.id, res.score.stars, res.score.total, TOTAL_LEVELS); this.sessionScore += res.score.total;
        this.runLog.push({ id: level.id, name: level.name, stars: res.score.stars, score: res.score.total, flawless: res.score.flawless });
        scene.dispose();
        if (index === CHAIN.arenas.length - 1) {
          this.scene = null; this.phase = 'finale';
          await ArenaScene.finale(this);
          await ui.results.show({ perArena: this.runLog, sessionTotal: this.sessionScore });
          this.finish(); return { lastId: level.id };
        }
        index++; scene = this.nextScene || new ArenaScene(this, index, { mode: 'entering' }); continue;
      }
      if (res.outcome === 'gameover') {
        const c = await ui.gameover.show(); scene.dispose(); this.bots.clear();
        if (c === 'retry') { ui.hud.show(); this.resetWorldFor(index); scene = new ArenaScene(this, index, { mode: 'inside' }); continue; }   // (game over hid the HUD: the shields and the answer bar)
        this.finish(); return { lastId: level.id };
      }
      scene.dispose(); this.bots.clear(); this.finish(); return { lastId: level.id };
    }
  }
  prepareNext(index) { if (index < CHAIN.arenas.length) this.nextScene = new ArenaScene(this, index, { mode: 'entering' }); }
  resetWorldFor(index) {
    this.chain.seals.forEach((s, i) => { if (!s) return; if (SEAL_BEHIND && i < index) this.chain.raiseSeal(i, true); else this.chain.lowerSeal(i); });
    this.chain.resetStartGate(false);
    this.sector.reset(); this.barrier.hide();
  }
  finish() { vo.stop(); this.scene = null; this.nextScene = null; this.roam.stop(); this.markers.clear(); ui.hud.hide(); this.showIdle(); audio.music.setMode('title'); audio.ambient.setMode('jungle'); }
  onPhase(p) { this.phase = p; }
  async togglePause() {
    if (!this.scene || this.pausing || this.world.paused) return;
    const mode = audio.music.mode; this.pausing = true; this.world.paused = true; audio.music.setMode('calm'); vo.pause();   // (a line stops mid-word and goes on from there)
    const c = await ui.pause.show();
    this.world.paused = false; this.pausing = false;
    if (c === 'map' && this.scene) { vo.stop(); this.scene.abort(); }
    else { audio.music.setMode(mode); vo.resume(); }   // (whatever was playing: the boss theme, a walk's explore, the answer's tension)
  }
}

const game = new Game();
window.__se = {
  game, CHAIN,
  get scene() { return game.scene; },
  get phase() { return game.scene ? game.scene.phase : game.phase; },
  fire(v) { ui.panel.setValue(v); ui.panel.fire(); },
  /** tests / DEV: answer the question with the wanted outcome ('correct' · 'under' · 'over'), chosen or typed */
  answer(kind = 'correct') { return ui.panel.answer(kind); },
  /** tests / DEV, arenas 1–4: exactly this choice, { opt: i } or { a: i, r: j } (indices into the level's lists) */
  pick(sel) { return ui.pick.choosePick(sel); },
  /** tests / DEV: Karan walks to each goal by himself (the same as ?auto=1) */
  walk(on = true) { game.roam.autopilot = on; },
  controller, vo,
  assets, audio, THREE, ui,
};
game.boot().catch((e) => { console.error(e); document.getElementById('loading-text').textContent = 'Error: ' + e.message; });
