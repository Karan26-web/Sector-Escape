// ---------------------------------------------------------------------------
// One arena of the chain, start to finish:
//   (causeway → gate shuts) | entering through the arc  →  sealed in, the open
//   arc ahead is guarded → guardians notice → run to the centre → hatch opens,
//   gun rises → tactical view → scan → input → FIRE → outcome → run through the
//   arc into the next ring (the trap seals behind).
// Shared world objects (chain, cannon, bots) live in `game`; this class only
// moves through them.
// ---------------------------------------------------------------------------
import * as THREE from '../../vendor/three.module.js';
import { CHAIN, botCountFor, evaluateAnswer, computeScore } from './levels.js';
import { Boss } from './boss.js';
import { save } from './save.js';
import { assets } from '../engine/assets.js';
import { tweens, delay } from '../engine/tween.js';
import { polar, DEG, Ease } from '../engine/util.js';
import { audio } from '../engine/audio.js';
import { ui } from '../ui/ui.js';

const ABORT = Symbol('abort');
const TIMEOUT = Symbol('timeout');

export class ArenaScene {
  /** mode: 'causeway' (arena 1 from the jungle path) | 'inside' (spawn at the entrance) | 'entering' (Karan just ran in through the arc) */
  constructor(game, index, { mode = 'inside' } = {}) {
    this.game = game; this.index = index; this.A = CHAIN.arenas[index]; this.level = this.A.level; this.mode = mode;
    this.world = game.world; this.fx = game.fx; this.hero = game.hero; this.rig = game.world.rig; this.chain = game.chain; this.cannon = game.cannon; this.bots = game.bots;
    this.R = this.A.R; this.C = new THREE.Vector3(this.A.center.x, 0, this.A.center.z);
    this.next = index + 1 < CHAIN.arenas.length ? CHAIN.arenas[index + 1] : CHAIN.sanctuary;
    this.shields = 3; this.maxShields = 3; this.hintLevel = 0; this.usedHints = false; this.firstTry = null; this.timeUsed = 0; this.attempt = 0;
    this.phase = 'init'; this.aborted = false; this.disposed = false; this._resolveFire = null; this.boss = null; this.pathDots = [];
    this.firstGun = !save.load().seenGun;
    this.world.addUpdatable(this);
    this.spawnSquad();
  }
  /* ---------------------------------------------------------------- utils */
  setPhase(p) { this.phase = p; if (this.game.onPhase) this.game.onPhase(p); }
  async s(p) { const v = await p; if (this.aborted) throw ABORT; return v; }
  abort() { this.aborted = true; if (this._abortRes) this._abortRes({ outcome: 'quit' }); if (this._resolveFire) this._resolveFire(ABORT); }
  W(deg, r, y = 0) { const p = polar(deg, r); return new THREE.Vector3(this.C.x + p.x, y, this.C.z + p.z); }
  V(pt, y = 0) { return new THREE.Vector3(pt.x, y, pt.z); }
  dirDeg(deg) { const p = polar(deg, 1); return new THREE.Vector3(p.x, 0, p.z); }
  behindPose(pos, dir, dist = 6.5, height = 3.2, fov = 56, clamp = null) {
    const p = { pos: pos.clone().addScaledVector(dir, -dist).add(new THREE.Vector3(0, height, 0)), target: pos.clone().addScaledVector(dir, 6).add(new THREE.Vector3(0, 1.0, 0)), fov };
    if (clamp) this.clampInside(p.pos, clamp);
    return p;
  }
  /** Keep a camera position inside the ring (small arenas): pull it in radially and lift it to keep the view. */
  clampInside(pos, margin = 1.0) {
    const rel = pos.clone().sub(this.C).setY(0), l = rel.length(), lim = this.R - margin;
    if (l > lim) { rel.multiplyScalar(lim / l); pos.x = this.C.x + rel.x; pos.z = this.C.z + rel.z; pos.y += (l - lim) * 0.75; }
    return pos;
  }
  /** Dedicated puzzle camera: near top-down (85°), arc up, ring framed left of the panel (or above the sheet on phones). */
  tacticalPose() {
    const R = this.R, A = this.A, bay = A.bay ? A.bay.D : 0, u = this.dirDeg(A.exitDeg), right = new THREE.Vector3(-u.z, 0, u.x), up = new THREE.Vector3(0, 1, 0);
    const aspect = window.innerWidth / window.innerHeight, narrow = window.innerWidth < 760, fov = 32, tanH = Math.tan((fov / 2) * DEG), WH = 6.6;
    let D = 40, north, south, span, mid, latHalf;
    for (let it = 0; it < 3; it++) {           // wall tops sit closer to the camera and project outward: frame those, not the floor
      const k = D / (D - WH);
      north = (R + bay + 1.0) * k + 1.5; south = (R + 1.0) * k + 0.8; span = north + south; mid = (north - south) / 2;
      latHalf = Math.max(R + 1.0, (R + bay + 1.0) * Math.sin(Math.min(90, A.theta / 2) * DEG)) * k + 1.0;
      D = narrow ? Math.max(span / (2 * tanH * 0.4), latHalf / (tanH * aspect * 0.94)) : Math.max(span / (2 * tanH * 0.88), latHalf / (0.34 * 2 * tanH * aspect));
    }
    let target;
    if (!narrow) {
      const halfW = D * tanH * aspect;
      target = this.C.clone().addScaledVector(u, mid).addScaledVector(right, 0.16 * 2 * halfW);
    } else {
      target = this.C.clone().addScaledVector(u, mid).addScaledVector(u, -0.27 * 2 * D * tanH);
    }
    const pitch = 85 * DEG, pos = target.clone().addScaledVector(u, -D * Math.cos(pitch)).addScaledVector(up, D * Math.sin(pitch));
    return { pos, target, fov };
  }
  /** Pose (inside the ring) that frames Karan low and the guarded arc high, verified by projecting both. */
  solveTwoShot(arc, look) {
    const cam = new THREE.PerspectiveCamera(60, this.world.camera.aspect, 0.3, 500), side = new THREE.Vector3(-look.z, 0, look.x);
    const guards = this.bots.alive.map((b) => b.g.position.clone().setY(1.1));
    const gC = guards.length ? guards.reduce((a, b) => a.add(b), new THREE.Vector3()).multiplyScalar(1 / guards.length) : arc.clone().setY(1.1);
    const feet = this.hero.pos.clone().setY(0.05), head = this.hero.pos.clone().setY(1.85), v = new THREE.Vector3();
    const scr = (p) => { v.copy(p).project(cam); return { x: (v.x + 1) / 2, y: (1 - v.y) / 2, z: v.z }; };
    let best = null;
    for (const h of [3.6, 4.4, 5.2, 6.0]) for (const lat of [-3, -1.5, 0, 1.5, 3]) for (const back of [0.5, 1.5, 2.5]) {
      const pos = this.clampInside(this.hero.pos.clone().addScaledVector(side, lat).addScaledVector(look, -back).add(new THREE.Vector3(0, h, 0)), 0.8);
      for (const f of [0.25, 0.35, 0.45, 0.55, 0.65]) for (const fov of [56, 62]) {
        const target = this.hero.pos.clone().lerp(gC, f).setY(0.6);
        cam.fov = fov; cam.updateProjectionMatrix(); cam.position.copy(pos); cam.lookAt(target); cam.updateMatrixWorld();
        const F = scr(feet), Hd = scr(head), G = scr(gC);
        if (F.z > 1 || G.z > 1) continue;
        const gx = guards.map((g) => scr(g).x), gMin = Math.min(G.x, ...gx), gMax = Math.max(G.x, ...gx);
        let cost = 0;
        cost += Math.max(0, F.y - 0.9) * 40 + Math.max(0, 0.62 - Hd.y) * 20;                 // Karan fully in the lower band
        cost += Math.max(0, 0.24 - G.y) * 30 + Math.max(0, G.y - 0.42) * 20;                 // guardians in the upper band, under the banner
        cost += Math.max(0, 0.06 - gMin) * 20 + Math.max(0, gMax - 0.94) * 20;               // guardians inside left/right edges
        if (F.x < 0.32 && F.y > 0.78) cost += 6;                                              // not under the caption box
        cost += Math.max(0, 0.15 - (F.y - Hd.y)) * 20;                                        // Karan big enough to read
        cost += Math.abs(F.x - 0.58) * 1.5 + h * 0.05;
        if (!best || cost < best.cost) best = { cost, pos: pos.clone(), target: target.clone(), fov };
      }
    }
    return best ? { pos: best.pos, target: best.target, fov: best.fov } : { pos: this.hero.pos.clone().addScaledVector(look, -1.5).add(new THREE.Vector3(0, 5, 0)), target: arc.clone(), fov: 62 };
  }
  followHero(dirFn, lambda = 3.2, { dist = 6.5, height = 3.2, clamp = null } = {}) { this.rig.follow((out) => { const p = this.behindPose(this.hero.pos, dirFn(), dist, height, 56, clamp); out.pos.copy(p.pos); out.target.copy(p.target); out.fov = p.fov; return out; }, lambda); }
  waitFor(cond, { autoAfter = 1e9, auto = null, tick = null } = {}) {
    return new Promise((res) => { let t = 0, autod = false; const u = { update: (dt) => { t += dt; if (tick) tick(dt); if (!autod && auto && t > autoAfter) { autod = true; auto(); } if (cond()) { this.world.removeUpdatable(u); res(); } } }; this.world.addUpdatable(u); });
  }
  spawnSquad(budgetMul = 1) {
    this.bots.spawnWave({ theta: this.A.theta, breachDeg: this.A.exitDeg, count: botCountFor(this.R, this.A.theta), R: this.R, timeBudget: this.level.timeBudget * budgetMul, center: this.A.center, scale: 1.12 + Math.max(0, this.R - 14) / 45 });
    if (this.level.boss && !this.boss) this.boss = new Boss(this.world, this.fx, this.W(this.A.exitDeg, this.R + (this.A.bay ? this.A.bay.D * 0.5 : 0) + 5));
  }

  /* ---------------------------------------------------------------- main */
  async run() {
    const abortP = new Promise((res) => { this._abortRes = res; });
    try { return await Promise.race([this.flow(), abortP]); }
    catch (e) { if (e === ABORT) return { outcome: 'quit' }; console.error(e); return { outcome: 'quit', error: e }; }
  }
  async flow() {
    const L = this.level;
    ui.hud.setArena(L, this.A, this.index); ui.hud.setShields(this.shields, this.maxShields);
    audio.ambient.start('jungle'); audio.music.start('explore'); audio.music.setMode('explore');
    this.chain.setActiveArena(this.index); this.chain.setFocus(this.index, false, 0);
    if (this.index > 0) { this.chain.raiseSeal(this.index - 1, true); this.chain.closeHatch(this.index - 1); }
    this.cannon.setArena(this.A); this.chain.closeHatch(this.index);
    this.hero.group.visible = true;
    if (this.mode === 'causeway') await this.s(this.causeway());
    else if (this.mode === 'inside') await this.s(this.placeInside());
    audio.ambient.setMode(L.boss ? 'boss' : 'arena');
    const ok = await this.s(this.battle());
    if (!ok) { this.setPhase('gameover'); return { outcome: 'gameover' }; }
    const score = computeScore({ timeUsed: this.timeUsed, timeBudget: L.timeBudget, shieldsLost: this.maxShields - this.shields, firstTryCorrect: this.firstTry === true, usedHints: this.usedHints });
    await this.s(this.exitRun(score));
    this.setPhase('done');
    return { outcome: 'cleared', score };
  }

  /* ---------------------------------------------------------------- entry beats */
  async placeInside() {
    this.hero.setPosition(this.V(this.A.spawn)); this.hero.faceTo(this.C); this.hero.surface = 'stone'; this.hero.stop();
    const dir = this.C.clone().sub(this.hero.pos).setY(0).normalize();
    await this.rig.moveTo(this.behindPose(this.hero.pos, dir, 5, 3.6, 60, 1.0), 1.8);
  }
  async causeway() {
    this.setPhase('causeway');
    const cw = CHAIN.causeway, dir = this.dirDeg(cw.dirDeg);
    this.chain.fadeOff = true;                                            // the wall and gate stay solid for the whole approach
    this.hero.setPosition(this.V(cw.start)); this.hero.face(dir); this.hero.surface = 'stone'; this.hero.stop();
    audio.ambient.setMode('causeway');
    await this.rig.moveTo(this.behindPose(this.hero.pos, dir, 5.5, 2.6, 58), 2.0);
    this.followHero(() => dir, 4);
    let skipped = false; ui.skip.show(() => { skipped = true; });
    const race = (p) => { let t; const skipP = new Promise((res) => { t = setInterval(() => { if (skipped) { clearInterval(t); res('skip'); } }, 50); }); return Promise.race([p, skipP]).finally(() => clearInterval(t)); };
    ui.caption('One way forward: the causeway to the small gate.', 3.6);
    if (await race(this.hero.runTo(this.V(cw.gate).addScaledVector(dir, -8), 6.5)) !== 'skip') {
      this.setPhase('gate'); this.chain.openStartGate();
      ui.caption('The gate grinds open…', 2);
      if (await race(this.hero.runTo(this.V(this.A.spawn), 6)) !== 'skip') await race(this.gateShut());
    }
    ui.skip.hide();
    if (skipped) { tweens.clear(); this.hero.stop(); this.hero.setPosition(this.V(this.A.spawn)); this.chain.resetStartGate(false); this.chain.applySky(this.level.env.sky, 0.1); }
    this.chain.fadeOff = false;
    await delay(0.3);
  }
  /** Inside the ring: Karan turns as the gate slams shut in front of him, seen from inside so nothing hides it. */
  async gateShut() {
    const g = this.chain.startGate, gp = g.worldPos.clone(), inward = this.C.clone().sub(gp).setY(0).normalize(), side = new THREE.Vector3(-inward.z, 0, inward.x);
    this.hero.stop(); this.hero.faceTo(gp);
    const camPos = this.hero.pos.clone().addScaledVector(inward, 3.4).addScaledVector(side, 1.7).add(new THREE.Vector3(0, 2.3, 0));
    this.clampInside(camPos, 0.8);
    await this.rig.moveTo({ pos: camPos, target: gp.clone().add(new THREE.Vector3(0, 1.9, 0)), fov: 56 }, 0.65);
    await this.chain.closeStartGate(0.5);
    ui.caption('The gate slams shut behind you. No way back.', 2.6);
    await delay(1.2);
  }

  /* ---------------------------------------------------------------- the fight */
  async reveal() {
    const L = this.level;
    this.setPhase('inside');
    const arc = this.W(this.A.exitDeg, this.R, 1.2), look = arc.clone().sub(this.hero.pos).setY(0).normalize();
    this.hero.face(look);
    // establishing shot: behind and above Karan, the guarded arc filling the frame
    const Dka = this.hero.distTo(arc);
    this.chain.keepSeals = false;
    if (this.index === 0) {
      // ring 1: the camera must stay inside the wall (the gate he just came through stays solid and shut).
      // Search a few poses and keep the one whose projection puts Karan in the lower-middle/right (clear of the
      // caption box) and the guardians in the upper-middle (clear of the banner), with both fully in frame.
      this.rig.moveTo(this.solveTwoShot(arc, look), 1.6);
    } else {
      const B = this.R * 0.5 + 3.5, Hc = B * 1.05;
      this.rig.moveTo({ pos: this.hero.pos.clone().addScaledVector(look, -B).add(new THREE.Vector3(0, Hc, 0)), target: this.hero.pos.clone().addScaledVector(look, Dka * 0.42), fov: 56 }, 1.6);
    }
    ui.caption(this.index === 0 ? 'Sealed in. Guardians hold the open arc.' : `Ring ${L.id}. The arc ahead is guarded.`, 2.8);
    await delay(2.0);
    this.setPhase('alert'); audio.play('alarm'); audio.music.setMode(L.boss ? 'boss' : 'arena');
    ui.banner('GUARDIANS AWAKEN', 'alert', 1.8); this.bots.alert(); if (this.boss) this.boss.roar(); this.rig.shake(0.15, 0.5);
    await delay(1.3);
    this.chain.setHatchGlow(this.index, true); audio.play('scan.ping');
    ui.objective('Reach the glowing hatch');
    if (this.index === 0) ui.caption('Something is buried under the hatch at the centre.', 3);
  }
  async battle() {
    const L = this.level, A = this.A, R = this.R;
    this.attempt = 0;
    await this.reveal();
    // ---- run to the centre (player controlled; guardians creep)
    this.setPhase('run');
    const runDir = this.C.clone().sub(this.hero.pos).setY(0).normalize();
    this.followHero(() => runDir, 4.5, { clamp: 1.0 });
    this.hero.boundsCenter.copy(this.C); this.hero.boundsRadius = R - 1.2; this.hero.keepOutRadius = null; this.hero.control = true;
    const inp = this.world.input; let idle = 0, assisted = false;
    await this.waitFor(() => this.hero.distTo(this.C) < 2.9, { autoAfter: this.game.autoRun ? 0.2 : 1e9, auto: () => { this.hero.control = false; this.hero.runTo(this.C, 7); },
      tick: (dt) => { if (inp.axis().active || inp.pointer.down || this.hero.target) idle = 0; else idle += dt; if (!assisted && idle > 12) { assisted = true; this.hero.runTo(this.C, 6.5); this.hero.control = true; ui.caption('Tip: use WASD / arrow keys or tap the floor to move.', 3); } } });
    this.hero.control = false; this.hero.stop(); this.hero.boundsRadius = null; ui.objective(null);
    // ---- the hatch opens, the Sector Cannon rises out of the floor (cinematic the first time, brisk later)
    this.setPhase('rise');
    const first = this.firstGun, stand = this.V(A.stand);
    await this.hero.runTo(stand, 5); this.hero.faceTo(this.C);
    this.rig.moveTo({ pos: this.clampInside(stand.clone().addScaledVector(this.dirDeg(A.exitDeg), -5.2).add(new THREE.Vector3(0, first ? 2.2 : 3.4, 0)), 1.0), target: this.C.clone().add(new THREE.Vector3(0, first ? 1.2 : 0.8, 0)), fov: 52 }, first ? 0.8 : 0.5);
    this.chain.setHatchGlow(this.index, false);
    await this.chain.openHatch(this.index, first ? 1.0 : 0.6);
    await this.cannon.rise(first ? 1.4 : 0.8);
    this.hero.keepOutRadius = 2.7; this.hero.boundsCenter.copy(this.C);
    if (first) { ui.caption('The Sector Cannon wakes. It needs the exact area of the open sector.', 3.4); save.load().seenGun = true; save.write(); this.firstGun = false; }
    await Promise.all([this.hero.playSpecial('activate', { hold: 0.15 }), this.cannon.activate()]);
    if (first) await delay(0.4);
    // ---- tactical view + scan
    this.setPhase('tactical'); audio.play('ui.whoosh'); ui.objective(null);
    this.chain.setFocus(this.index, true, 0.85, { cull: true });
    await this.rig.moveTo(this.tacticalPose(), 0.85, Ease.inOutCubic);
    await delay(0.15);
    audio.music.setMode(L.boss ? 'boss' : 'tension');
    this.setPhase('scan');
    await this.cannon.scan({ breachDeg: A.exitDeg, theta: A.theta });
    // ---- input loop
    while (true) {
      this.attempt++;
      this.setPhase('input');
      this.bots.speedMul = 1;
      if (this.attempt === 1) ui.panel.open({ r: R, theta: A.theta, scaffold: L.scaffold, piFriendly: true, hintLevel: this.hintLevel, attempts: this.attempt, onFire: (v) => this._resolveFire && this._resolveFire(v), onHint: (lvl) => { this.usedHints = true; this.hintLevel = lvl; } });
      else ui.panel.setAttempts(`Attempt ${this.attempt}`);
      ui.hud.setThreat(this.bots.threat, true);
      this.bots.onReach = () => this._resolveFire && this._resolveFire(TIMEOUT);
      const t0 = this.world.elapsed;
      const answer = await new Promise((res) => { this._resolveFire = res; });
      this._resolveFire = null; this.timeUsed += this.world.elapsed - t0;
      if (answer === ABORT) throw ABORT;
      if (answer === TIMEOUT) {
        this.setPhase('result'); ui.panel.lock();
        await ui.stamp('under', 'TOO SLOW!', 'The guardians reached the gun'); audio.play('sting.fail');
        await this.bots.lunge(this.hero.pos, () => this.hitHero('bot'), (b) => b.r < R * 0.5);
        if (this.shields <= 0) return this.gameOver();
        this.cannon.pulse(); this.bots.pulseKill(); await delay(1.1);
        ui.panel.setFeedback({ type: 'bad', title: 'The guardians reached you before you fired.', html: 'Calculate faster this time — the arc is the same: (θ/360) × πr².' });
        this.hintLevel = Math.min(3, this.hintLevel + 1); if (this.firstTry === null) this.firstTry = false;
        this.spawnSquad(0.85); this.bots.alert(); ui.panel.unlock(); ui.panel.renderFormula();
        continue;
      }
      const res = evaluateAnswer(answer, R, A.theta);
      if (res.status === 'invalid') { ui.panel.setFeedback({ type: 'bad', title: 'Enter a number', html: 'Type the sector area in m², e.g. 38.5' }); audio.play('ui.error'); this.attempt--; continue; }
      // ---- fire
      this.setPhase('firing'); ui.panel.lock(); this.bots.active = false; ui.hud.setThreat(0, false);
      await this.cannon.charge();
      await this.cannon.fire({ ...res, theta: A.theta, breachDeg: A.exitDeg }, {
        onFront: (half) => { this.bots.killInSector(A.exitDeg, half); if (this.boss && res.status !== 'under') this.boss.defeat(); else if (this.boss) this.boss.hurt(); },
        onReflect: () => this.hitHero('reflect'),
        onWallHit: () => {},
      });
      this.setPhase('result');
      if (res.status === 'correct') {
        if (this.firstTry === null) this.firstTry = this.attempt === 1;
        audio.play('sting.perfect');
        await delay(0.35);
        await ui.stamp('perfect', 'PERFECT SECTOR', `Exact area ${res.exactText} m² — every guardian destroyed`);
        ui.panel.close(); this.cannon.clearOverlays(true); await delay(0.3);
        return true;
      }
      if (this.firstTry === null) this.firstTry = false;
      if (res.status === 'under') {
        audio.play('sting.fail');
        await ui.stamp('under', 'UNDERCHARGED', `The laser covered only ${Math.round(res.coverage * 100)}% of the arc — survivors attack!`);
        await this.bots.lunge(this.hero.pos, () => this.hitHero('bot'));
        if (this.shields <= 0) return this.gameOver();
        this.cannon.pulse(); this.bots.pulseKill(); await delay(1.1);
      } else {
        audio.play('sting.fail');
        await ui.stamp('over', 'OVERCHARGED', `Too wide by ${Math.round(res.excessTheta)}° — the excess hit the wall and reflected back!`);
        if (this.shields <= 0) return this.gameOver();
        await delay(0.5);
      }
      const d = res.diagnosis;
      ui.panel.setFeedback({ type: 'bad', title: d.title, html: `${d.tip}<br><span style="color:#b9cbd4">You entered <b>${res.enteredText}</b> m² — the laser covered <b>${Math.round(res.firedTheta)}°</b> of the <b>${A.theta}°</b> arc.</span>` });
      this.hintLevel = Math.min(3, this.hintLevel + 1); this.usedHints = this.usedHints || this.hintLevel >= 3;
      this.spawnSquad(0.85); this.bots.alert();
      ui.panel.unlock(); ui.panel.hintLevel = this.hintLevel; ui.panel.renderFormula(); ui.panel.setAttempts(`Attempt ${this.attempt + 1}`);
    }
  }
  hitHero(kind) {
    if (this.shields <= 0) return;
    this.shields--; ui.hud.setShields(this.shields, this.maxShields); ui.damage();
    audio.play(kind === 'reflect' ? 'reflect.hit' : 'bot.hit'); audio.play('player.hurt'); audio.play('shield.break');
    this.fx.hit(this.hero.pos.clone().add(new THREE.Vector3(0, 1, 0))); this.rig.shake(0.6, 0.6); this.hero.hurt();
  }
  gameOver() { this.chain.setFocus(this.index, false, 0.6, { cull: false }); audio.play('sting.gameover'); audio.music.setMode('calm'); ui.panel.close(); this.cannon.clearOverlays(true); return false; }

  /* ---------------------------------------------------------------- reward + progression: through the open arc into the next ring */
  lightPath(points) {
    const tex = assets.texture('fx_glow', { wrap: false }), dots = [];
    let carry = 0;
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i], b = points[i + 1], L = a.distanceTo(b);
      for (let t = carry; t < L; t += 1.5) {
        const p = a.clone().lerp(b, t / L); p.y = 0.12;
        const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: 0xf4bf55, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
        s.position.copy(p); s.scale.setScalar(0.95); this.world.add(s); dots.push(s);
      }
      carry = (carry + 1.5 - (L % 1.5)) % 1.5;
    }
    dots.forEach((s, k) => tweens.add({ duration: 0.35, delay: k * 0.045, onUpdate: (e) => { s.material.opacity = 0.85 * e; } }));
    if (dots.length) audio.play('gate.unlock');
    this.pathDots.push(...dots);
  }
  clearPath(fade = 0.5) {
    const dots = this.pathDots; this.pathDots = [];
    dots.forEach((s) => tweens.add({ duration: fade, onUpdate: (e) => { s.material.opacity = 0.85 * (1 - e); }, onComplete: () => { this.world.remove(s); s.material.dispose(); } }));
  }
  async exitRun(score) {
    this.setPhase('exit'); ui.panel.close(); ui.hud.setThreat(0, false); ui.objective(null); audio.music.setMode('explore'); audio.play('sting.clear');
    this.hero.boundsRadius = null; this.hero.keepOutRadius = null; this.hero.control = false;
    await delay(0.45);                                                  // breathing: let the cleared ring sit for a beat
    const A = this.A, next = this.next, u = this.dirDeg(A.exitDeg);
    const sidePt = [this.V(A.side[0]), this.V(A.side[1])].sort((p, q) => p.distanceTo(this.hero.pos) - q.distanceTo(this.hero.pos))[0];
    const nextC = this.V(next.center), spawn = this.V(next.spawn);
    // reward: the way on lights up in amber while the camera frames the next ring
    this.chain.setFocus(this.index, false, 0.9, { cull: false });
    this.lightPath([this.hero.pos.clone(), sidePt, spawn]);
    this.rig.moveTo({ pos: this.C.clone().addScaledVector(u, -(this.R * 0.8 + 6)).add(new THREE.Vector3(0, this.R * 0.9 + 9, 0)), target: nextC.clone().addScaledVector(u, -next.R * 0.35).add(new THREE.Vector3(0, 1, 0)), fov: 56 }, 1.3);
    ui.toast({ title: `Arena ${this.level.id} cleared`, stars: score.stars, points: score.total });
    ui.caption(this.index === CHAIN.arenas.length - 1 ? 'The last ring is broken. The temple court lies ahead!' : 'The way opens. Into the next ring!', 3);
    await this.hero.celebrate(0.25);
    await delay(0.5);
    // progression: overhead chase through the arc; the next ring closes behind Karan
    const overhead = (out) => { out.pos.copy(this.hero.pos).addScaledVector(u, -3.5).add(new THREE.Vector3(0, 9, 0)); out.target.copy(this.hero.pos).addScaledVector(u, 2.5).add(new THREE.Vector3(0, 0.6, 0)); out.fov = 58; return out; };
    this.rig.follow(overhead, 3.2);
    if (this.game.prepareNext) this.game.prepareNext(this.index + 1);
    const seal = this.chain.seals[this.index];
    const sealWhenInside = seal ? this.waitFor(() => this.hero.distTo(nextC) < next.R - 1.6).then(() => { this.chain.cutRing = next.index; this.chain.keepSeals = true; this.chain.raiseSeal(this.index); ui.caption('The ring closes behind you.', 2.4); }) : null;
    await this.hero.runPath([sidePt, spawn], 7);
    this.clearPath(0.6);
    if (sealWhenInside) {
      await sealWhenInside;
      // look back as the ring closes behind Karan
      const sm = this.chain.seals[this.index].mid, back = new THREE.Vector3(sm.x, 0, sm.z).sub(this.hero.pos).setY(0).normalize();
      this.hero.face(back);
      await this.rig.moveTo({ pos: this.hero.pos.clone().addScaledVector(back, -4.2).add(new THREE.Vector3(0, 3.0, 0)), target: new THREE.Vector3(sm.x, 2.4, sm.z), fov: 58 }, 0.7);
      await delay(1.0);
    }
    this.hero.faceTo(nextC);
    await delay(0.3);
  }
  /** After the seventh ring: across the temple court and out through the temple gate. */
  static async finale(game) {
    const S = CHAIN.sanctuary, hero = game.hero, rig = game.world.rig, chain = game.chain;
    game.onPhase && game.onPhase('finale');
    chain.setActiveArena(S.index); audio.music.setMode('explore');
    const gate = new THREE.Vector3(S.gatePos.x, 0, S.gatePos.z), esc = new THREE.Vector3(S.escape.x, 0, S.escape.z), dir = esc.clone().sub(gate).normalize();
    hero.faceTo(gate);
    rig.follow((out) => { const d = gate.clone().sub(hero.pos).setY(0).normalize(); out.pos.copy(hero.pos).addScaledVector(d, -7).add(new THREE.Vector3(0, 3.4, 0)); out.target.copy(hero.pos).addScaledVector(d, 8).add(new THREE.Vector3(0, 1.5, 0)); out.fov = 56; return out; }, 3);
    ui.caption('The temple gate stands open. Run!', 3.5);
    await hero.runTo(gate.clone().addScaledVector(dir, -2.5), 7);
    audio.play('gate.unlock'); game.fx.flash(gate.clone().add(new THREE.Vector3(0, 2.5, 0)), 0xffe0a0, 12, 0.8);
    await hero.runTo(esc.clone().addScaledVector(dir, -1), 7);
    await hero.celebrate(1.4);
    audio.play('sting.clear');
  }

  update(dt) {
    if (this.boss) this.boss.update(dt);
    if (this.phase === 'input') ui.hud.setThreat(this.bots.threat, true);
  }
  dispose() {
    if (this.disposed) return; this.disposed = true; this.aborted = true;
    this.world.removeUpdatable(this); if (this.boss) { this.boss.dispose(); this.boss = null; } this.clearPath(0.01);
    this.cannon.clearOverlays(false); this.world.labels.clear(); ui.panel.close(); ui.objective(null);
  }
}
