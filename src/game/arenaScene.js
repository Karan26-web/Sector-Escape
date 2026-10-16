// ---------------------------------------------------------------------------
// One arena, start to finish:
//   approach → enter (gate locks) → alert (breach, bots) → run to cannon →
//   activate → tactical camera → scan (θ, r) → input → FIRE → outcome →
//   (retry | next wave | exit)
// ---------------------------------------------------------------------------
import * as THREE from '../../vendor/three.module.js';
import { Arena } from './arena.js';
import { BotManager } from './bots.js';
import { Cannon } from './cannon.js';
import { Boss } from './boss.js';
import { botCountFor, evaluateAnswer, computeScore } from './levels.js';
import { tweens, delay } from '../engine/tween.js';
import { polar, DEG, Ease, clamp } from '../engine/util.js';
import { audio } from '../engine/audio.js';
import { ui } from '../ui/ui.js';

const ABORT = Symbol('abort');
const TIMEOUT = Symbol('timeout');
const UP = new THREE.Vector3(0, 1, 0);

export class ArenaScene {
  constructor(game, level, { skipIntro = false } = {}) {
    this.game = game; this.level = level; this.skipIntro = skipIntro || game.skipCutscenes;
    this.world = game.world; this.fx = game.fx; this.hero = game.hero; this.rig = game.world.rig;
    this.R = level.radius;
    this.arena = new Arena(this.world, level);
    this.bots = new BotManager(this.world, this.fx);
    this.cannon = new Cannon(this.world, this.fx, this.R);
    this.boss = level.boss ? new Boss(this.world, this.fx, level) : null;
    this.shields = 3; this.maxShields = 3;
    this.hintLevel = 0; this.usedHints = false; this.firstTry = []; this.timeUsed = 0; this.waveIndex = 0; this.attempt = 0;
    this.phase = 'init'; this.aborted = false; this.disposed = false;
    this._resolveFire = null;
    this.world.addUpdatable(this);
    this.bots.scale = 1 + (this.R - 14) / 40;
  }
  /* ---------------------------------------------------------------- utils */
  setPhase(p) { this.phase = p; if (this.game.onPhase) this.game.onPhase(p); }
  async s(p) { const v = await p; if (this.aborted) throw ABORT; return v; }
  abort() { this.aborted = true; if (this._abortRes) this._abortRes({ outcome: 'quit' }); if (this._resolveFire) this._resolveFire(ABORT); }
  get center() { return new THREE.Vector3(0, 0, 0); }
  dirDeg(deg) { const p = polar(deg, 1); return new THREE.Vector3(p.x, 0, p.z); }
  behindPose(pos, dir, dist = 6.5, height = 3.2, fov = 56) {
    return { pos: pos.clone().addScaledVector(dir, -dist).add(new THREE.Vector3(0, height, 0)), target: pos.clone().addScaledVector(dir, 6).add(new THREE.Vector3(0, 1.0, 0)), fov };
  }
  tacticalPose(breachDeg) {
    const R = this.R, d = this.dirDeg(breachDeg), narrow = window.innerWidth < 760;
    const D = R * (narrow ? 3.1 : 2.65), pitch = 64 * DEG, h = D * Math.sin(pitch), off = D * Math.cos(pitch);
    const right = new THREE.Vector3(-d.z, 0, d.x);
    const target = narrow ? d.clone().multiplyScalar(-R * 0.3) : right.multiplyScalar(R * 0.3).addScaledVector(d, R * 0.12);
    const pos = target.clone().addScaledVector(d, -off); pos.y = h;
    return { pos, target, fov: 50 };
  }
  followHero(dirFn, lambda = 3.2) { this.rig.follow((out) => { const p = this.behindPose(this.hero.pos, dirFn()); out.pos.copy(p.pos); out.target.copy(p.target); out.fov = p.fov; return out; }, lambda); }

  /* ---------------------------------------------------------------- main */
  async run() {
    const abortP = new Promise((res) => { this._abortRes = res; });
    try { return await Promise.race([this.flow(), abortP]); }
    catch (e) { if (e === ABORT) return { outcome: 'quit' }; console.error(e); return { outcome: 'quit', error: e }; }
  }
  async flow() {
    const L = this.level;
    ui.hud.setArena(L); ui.hud.setShields(this.shields, this.maxShields); ui.hud.setWave(1, L.waves.length); ui.hud.setScore(this.game.sessionScore || 0);
    if (L.variantIndex) ui.caption(`Replay — new numbers (problem set ${L.variantIndex + 1} of ${L.variantCount})`, 3);
    audio.ambient.start('jungle'); audio.music.start('explore'); audio.music.setMode('explore');
    this.hero.group.visible = true;
    if (this.skipIntro) this.placeInside(); else await this.s(this.approachAndEnter());
    audio.ambient.setMode(L.boss ? 'boss' : 'arena');
    if (this.boss) await this.s(this.bossIntro());
    for (let i = 0; i < L.waves.length; i++) {
      this.waveIndex = i; ui.hud.setWave(i + 1, L.waves.length);
      const ok = await this.s(this.playWave(i));
      if (!ok) { this.setPhase('gameover'); return { outcome: 'gameover' }; }
    }
    await this.s(this.exitSequence());
    const score = computeScore({ timeUsed: this.timeUsed, timeBudget: L.waves.reduce((s, w) => s + w.timeBudget, 0), shieldsLost: this.maxShields - this.shields, firstTryCorrect: this.firstTry.every(Boolean) && this.firstTry.length === L.waves.length, usedHints: this.usedHints, waves: L.waves.length });
    this.setPhase('done');
    return { outcome: 'cleared', score };
  }

  /* ---------------------------------------------------------------- intro */
  placeInside() {
    const L = this.level, R = this.R;
    this.hero.setPosition(this.arena.pos(L.entranceDeg, Math.max(3, R - 9))); this.hero.faceTo(this.center); this.hero.surface = 'stone';
    const dir = this.dirDeg(L.entranceDeg).negate();
    this.rig.setPose(this.behindPose(this.hero.pos, dir, 5, 3.6, 60));
  }
  async approachAndEnter() {
    const L = this.level, R = this.R, ent = L.entranceDeg;
    this.setPhase('approach');
    const dirIn = this.dirDeg(ent).negate(); // toward the centre
    this.hero.setPosition(this.arena.pos(ent, R + 30)); this.hero.faceTo(this.center); this.hero.surface = 'grass';
    this.rig.setPose(this.behindPose(this.hero.pos, dirIn));
    this.followHero(() => dirIn);
    let skipped = false; ui.skip.show(() => { skipped = true; });
    ui.caption(`Arena ${L.id} — ${L.name}. Enter the small gate to start the arena.`, 4);
    const race = (p) => { let t; const skipP = new Promise((res) => { t = setInterval(() => { if (skipped) { clearInterval(t); res('skip'); } }, 50); }); return Promise.race([p, skipP]).finally(() => clearInterval(t)); };
    if (await race(this.hero.runTo(this.arena.pos(ent, R + 4.5), 6.5)) !== 'skip') {
      if (await race(this.arena.openGate('entrance')) !== 'skip') {
        if (await race(this.hero.runTo(this.arena.pos(ent, Math.max(3, R - 9)), 6)) !== 'skip') { this.hero.surface = 'stone'; await race(this.arena.closeGate('entrance')); }
      }
    }
    ui.skip.hide();
    if (skipped) { tweens.clear(); this.hero.stop(); this.hero.setPosition(this.arena.pos(ent, Math.max(3, R - 9))); this.hero.faceTo(this.center); this.hero.surface = 'stone'; const g = this.arena.gates.entrance; g.open = false; }
    // reveal shot
    this.setPhase('inside');
    this.rig.moveTo({ pos: this.hero.pos.clone().addScaledVector(dirIn, -5).add(new THREE.Vector3(0, 3.6, 0)), target: this.hero.pos.clone().addScaledVector(dirIn, 7).add(new THREE.Vector3(0, 1.6, 0)), fov: 60 }, 1.6);
    ui.caption('You are trapped! Find a way to open the exit gate.', 3.6);
    await delay(skipped ? 0.8 : 2.0);
  }
  async bossIntro() {
    const b = this.boss; this.setPhase('boss-intro');
    const look = b.position.clone().add(new THREE.Vector3(0, 3.2, 0));
    const toHero = this.hero.pos.clone().sub(b.position).setY(0).normalize();
    this.rig.moveTo({ pos: b.position.clone().addScaledVector(toHero, 10).add(new THREE.Vector3(0, 2.2, 0)), target: look, fov: 50 }, 1.2);
    await delay(1.2); b.roar(); ui.banner('THE SECTOR WARDEN', 'boss', 2.4); ui.caption('The Warden guards the exit behind three sector shields. Break them all!', 4.5);
    audio.play('sting.boss'); await delay(2.2);
  }

  /* ---------------------------------------------------------------- a wave */
  async playWave(i) {
    const L = this.level, R = this.R, w = L.waves[i];
    this.attempt = 0;
    // ---- alert
    this.setPhase('alert');
    audio.play('alarm'); audio.music.setMode(L.boss ? 'boss' : 'arena');
    ui.banner(i === 0 ? 'ENEMIES INCOMING!' : (i === L.waves.length - 1 ? 'FINAL BREACH!' : 'SECOND BREACH!'), 'alert', 2.4);
    if (i > 0) audio.play('sting.wave');
    const bp = this.arena.pos(w.breachDeg, R, this.arena.H * 0.35);
    const toBreach = bp.clone().sub(this.hero.pos).setY(0).normalize();
    this.rig.moveTo({ pos: this.hero.pos.clone().add(new THREE.Vector3(0, 2.6, 0)).addScaledVector(toBreach, -3.5), target: bp, fov: 58 }, 0.9);
    await delay(0.7);
    await this.arena.openBreach(i);
    const count = botCountFor(R, w.theta);
    this.spawn(w, count, w.timeBudget);
    if (i === 0) {
      // ---- run to the cannon (player controlled)
      this.setPhase('run');
      this.hero.faceTo(this.center);
      this.followHero(() => this.hero.vel.lengthSq() > 0.5 ? this.hero.vel.clone().normalize() : this.hero.facing.clone(), 2.8);
      this.hero.control = true; this.hero.boundsRadius = R - 1.2; this.hero.keepOutRadius = 2.0; this.cannon.setBeacon(true);
      ui.objective('Run to the central cannon to activate it'); ui.caption('Run to the central cannon to activate it.', 3.2);
      await this.waitFor(() => this.hero.pos.length() < 2.7, { autoAfter: this.game.autoRun ? 0.2 : 9, auto: () => { this.hero.control = false; this.hero.runTo(this.center, 7); } });
      this.hero.control = false; this.hero.stop(); this.hero.boundsRadius = null; this.hero.keepOutRadius = null; ui.objective(null);
      const stand = this.dirDeg(w.breachDeg).multiplyScalar(-2.2); this.hero.setPosition(stand); this.hero.faceTo(bp);
      // ---- activate
      this.setPhase('activate');
      this.rig.moveTo(this.behindPose(this.hero.pos, this.dirDeg(w.breachDeg), 5, 2.6, 52), 0.6);
      await Promise.all([this.hero.playSpecial('activate', { hold: 0.2 }), this.cannon.activate()]);
    } else {
      const stand = this.dirDeg(w.breachDeg).multiplyScalar(-2.2); this.hero.stop(); this.hero.setPosition(stand); this.hero.faceTo(bp);
    }
    // ---- tactical view
    this.setPhase('tactical');
    audio.play('ui.whoosh');
    await this.rig.moveTo(this.tacticalPose(w.breachDeg), 1.7, Ease.inOutCubic);
    audio.music.setMode(L.boss ? 'boss' : 'tension');
    this.setPhase('scan');
    await this.cannon.scan({ breachDeg: w.breachDeg, theta: w.theta, scaffoldFill: L.scaffold !== 'hint' });
    // ---- input loop
    while (true) {
      this.attempt++;
      this.setPhase('input');
      if (this.attempt === 1) ui.panel.open({ r: R, theta: w.theta, scaffold: L.scaffold, piFriendly: L.piFriendly !== false, hintLevel: this.hintLevel, attempts: this.attempt, onFire: (v) => this._resolveFire && this._resolveFire(v), onHint: (lvl) => { this.usedHints = true; this.hintLevel = lvl; } });
      else ui.panel.setAttempts(`Attempt ${this.attempt}`);
      ui.hud.setThreat(this.bots.threat, true);
      this.bots.onReach = () => this._resolveFire && this._resolveFire(TIMEOUT);
      const t0 = this.world.elapsed;
      const answer = await new Promise((res) => { this._resolveFire = res; });
      this._resolveFire = null; this.timeUsed += this.world.elapsed - t0;
      if (answer === ABORT) throw ABORT;
      if (answer === TIMEOUT) {
        this.setPhase('result');
        ui.panel.lock(); await ui.stamp('under', 'TOO SLOW!', 'The guardians reached the cannon'); audio.play('sting.fail');
        await this.bots.lunge(this.hero.pos, () => this.hitHero('bot'), (b) => b.r < R * 0.5);
        if (this.shields <= 0) return this.gameOver();
        this.cannon.pulse(); this.bots.pulseKill(); await delay(1.1);
        ui.panel.setFeedback({ type: 'bad', title: 'The guardians reached you before you fired.', html: 'Calculate faster this time — the breach is the same: (θ/360) × πr².' });
        this.hintLevel = Math.min(3, this.hintLevel + 1);
        this.spawn(w, count, w.timeBudget * 0.85); ui.panel.unlock(); ui.panel.renderFormula();
        continue;
      }
      const res = evaluateAnswer(answer, R, w.theta);
      if (res.status === 'invalid') { ui.panel.setFeedback({ type: 'bad', title: 'Enter a number', html: 'Type the sector area in m², e.g. 154' }); audio.play('ui.error'); this.attempt--; continue; }
      // ---- fire
      this.setPhase('firing'); ui.panel.lock(); this.bots.active = false; ui.hud.setThreat(0, false);
      await this.cannon.charge();
      let survivors = [];
      await this.cannon.fire({ ...res, theta: w.theta, breachDeg: w.breachDeg }, {
        onFront: (half) => { survivors = this.bots.killInSector(w.breachDeg, half); },
        onReflect: () => { this.hitHero('reflect'); },
        onWallHit: () => { if (res.status !== 'correct') this.arena.flashBand(); },
      });
      this.setPhase('result');
      if (res.status === 'correct') {
        if (this.attempt === 1) this.firstTry[i] = true; else this.firstTry[i] = false;
        audio.play('sting.perfect');
        await ui.stamp('perfect', 'PERFECT SHOT!', `Exact area ${res.exactText} m² — every guardian destroyed`);
        ui.panel.close();
        if (this.boss) { await this.boss.breakShield(i); if (i === L.waves.length - 1) { await this.boss.defeat(); await this.arena.breakLock(); } else { await this.arena.closeBreach(i); } }
        else if (i === L.waves.length - 1) { await this.arena.breakLock(); }
        else { ui.caption('Sector sealed! Another breach is opening…', 3); await this.arena.closeBreach(i); }
        this.cannon.clearOverlays(true); await delay(0.4);
        return true;
      }
      if (res.status === 'under') {
        audio.play('sting.fail');
        await ui.stamp('under', 'UNDERCHARGED!', `Some enemies survived! Covered ${Math.round(res.coverage * 100)}% of the sector`);
        await this.bots.lunge(this.hero.pos, () => this.hitHero('bot'));
        if (this.shields <= 0) return this.gameOver();
        this.cannon.pulse(); this.bots.pulseKill(); await delay(1.1);
      } else {
        audio.play('sting.fail');
        await ui.stamp('over', 'OVERCHARGED!', `Excess energy reflected back! (+${Math.round(res.excessTheta)}° too wide)`);
        if (this.shields <= 0) return this.gameOver();
        await delay(0.5);
      }
      // ---- retry same problem with stronger scaffolding
      const d = res.diagnosis;
      ui.panel.setFeedback({ type: 'bad', title: d.title, html: `${d.tip}<br><span style="color:#b9cbd4">You entered <b>${res.enteredText}</b> m² — the laser covered <b>${Math.round(res.firedTheta)}°</b> of the <b>${w.theta}°</b> breach.</span>` });
      this.hintLevel = Math.min(3, this.hintLevel + 1); this.usedHints = this.usedHints || this.hintLevel >= 3;
      this.spawn(w, count, w.timeBudget * 0.85);
      ui.panel.unlock(); ui.panel.hintLevel = this.hintLevel; ui.panel.renderFormula(); ui.panel.setAttempts(`Attempt ${this.attempt + 1}`);
    }
  }
  spawn(w, count, budget) {
    this.bots.spawnWave({ theta: w.theta, breachDeg: w.breachDeg, count, R: this.R, timeBudget: budget });
    for (const b of this.bots.bots) b.spr.setScale(this.bots.scale);
  }
  waitFor(cond, { autoAfter = 8, auto = null } = {}) {
    return new Promise((res) => { let t = 0, autod = false; const u = { update: (dt) => { t += dt; if (!autod && auto && t > autoAfter) { autod = true; auto(); } if (cond()) { this.world.removeUpdatable(u); res(); } } }; this.world.addUpdatable(u); });
  }
  hitHero(kind) {
    if (this.shields <= 0) return;
    this.shields--; ui.hud.setShields(this.shields, this.maxShields); ui.damage();
    audio.play(kind === 'reflect' ? 'reflect.hit' : 'bot.hit'); audio.play('player.hurt'); audio.play('shield.break');
    this.fx.hit(this.hero.pos.clone().add(new THREE.Vector3(0, 1, 0))); this.rig.shake(0.6, 0.6); this.hero.hurt();
  }
  gameOver() { audio.play('sting.gameover'); audio.music.setMode('calm'); ui.panel.close(); this.cannon.clearOverlays(true); return false; }

  /* ---------------------------------------------------------------- exit */
  async exitSequence() {
    const L = this.level, R = this.R; this.setPhase('exit');
    ui.panel.close(); ui.hud.setThreat(0, false); audio.music.setMode('explore'); audio.play('sting.clear'); this.hero.boundsRadius = null; this.hero.control = false;
    const exitP = this.arena.pos(L.exitDeg, R - 1.5); const dir = exitP.clone().sub(this.hero.pos).setY(0).normalize();
    this.hero.faceTo(exitP);
    await this.rig.moveTo(this.behindPose(this.hero.pos, dir, 7, 3.5, 58), 1.3);
    ui.caption('The exit gate opens! Continue through the jungle to the next arena.', 4.5);
    await Promise.all([this.arena.openGate('exit', 1.8), this.hero.celebrate(0.4)]);
    this.hero.surface = 'stone';
    this.followHero(() => dir, 3);
    const p1 = this.hero.runTo(this.arena.pos(L.exitDeg, R + 1), 7); await p1; this.hero.surface = 'grass';
    await this.hero.runTo(this.arena.pos(L.exitDeg, R + 12), 7);
  }

  update(dt, t) {
    this.arena.update(dt, t); this.bots.update(dt); this.cannon.update(dt, t); if (this.boss) this.boss.update(dt);
    if (this.phase === 'input') ui.hud.setThreat(this.bots.threat, true);
  }
  dispose() {
    if (this.disposed) return; this.disposed = true; this.aborted = true;
    this.world.removeUpdatable(this); this.cannon.clearOverlays(false); this.bots.clear(); this.world.remove(this.bots.group); this.world.remove(this.cannon.group); this.world.remove(this.cannon.overlays);
    if (this.boss) this.boss.dispose(); this.arena.dispose(); this.world.labels.clear(); this.fx.clear(); ui.panel.close(); ui.objective(null);
  }
}
