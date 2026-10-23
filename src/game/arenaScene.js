// ---------------------------------------------------------------------------
// One arena of the chain, start to finish (LXD 2026-10-23):
//   (causeway → gate shuts) | entering through the last gap → the gap ahead is
//   empty → the guardians charge in from beyond it, a barrier flashes up across
//   it and they pound on it → Karan walks to his observation point behind the
//   centre → top view: O → a radius → the sweep into the sector → zoom in, the
//   learner answers → zoom out, the charge → outcome (exact: barrier and squad
//   destroyed · too small: the barrier breaks, survivors get in and attack ·
//   too big: everything destroyed, the excess reflects and knocks Karan down)
//   → results → through the cleared gap into the next ring.
// Shared world objects (chain, sector, barrier, bots) live in `game`; this class
// only moves through them.
// ---------------------------------------------------------------------------
import * as THREE from '../../vendor/three.module.js';
import { CHAIN, botCountFor, evaluateAnswer, computeScore, beamLine, tipLine, enemyMaxR, SEAL_BEHIND, WALL_HEIGHT } from './levels.js';
import { Boss } from './boss.js';
import { assets } from '../engine/assets.js';
import { tweens, delay } from '../engine/tween.js';
import { polar, DEG, Ease, degDiff } from '../engine/util.js';
import { audio } from '../engine/audio.js';
import { ui } from '../ui/ui.js';

const ABORT = Symbol('abort');
const GUARD_TOP = 3.7;   // from the top view the guardians (1 m beyond the arc) rise this far past the arc toward screen-up

export class ArenaScene {
  /** mode: 'causeway' (arena 1 from the jungle path) | 'inside' (spawn at the entrance) | 'entering' (Karan just ran in through the last gap) */
  constructor(game, index, { mode = 'inside' } = {}) {
    this.game = game; this.index = index; this.A = CHAIN.arenas[index]; this.level = this.A.level; this.mode = mode;
    this.world = game.world; this.fx = game.fx; this.hero = game.hero; this.rig = game.world.rig; this.chain = game.chain; this.sector = game.sector; this.barrier = game.barrier; this.bots = game.bots;
    this.R = this.A.R; this.C = new THREE.Vector3(this.A.center.x, 0, this.A.center.z);
    this.next = index + 1 < CHAIN.arenas.length ? CHAIN.arenas[index + 1] : CHAIN.sanctuary;
    this.shields = 3; this.maxShields = 3; this.misses = 0; this.firstTry = null; this.timeUsed = 0; this.attempt = 0;
    this.phase = 'init'; this.aborted = false; this.disposed = false; this._resolveFire = null; this.boss = null; this.pathDots = []; this.heroDown = null;
    this.watch = this.V(this.A.watch); this.gapMid = this.W(this.A.exitDeg, this.R);
    this.world.addUpdatable(this);
    // no guardians yet (LXD): they arrive when Karan reaches this arena (reveal)
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
    if (clamp) {
      const before = p.pos.clone(); this.clampInside(p.pos, clamp);
      const pulled = Math.hypot(before.x - p.pos.x, before.z - p.pos.z);
      // the wall pulled the camera in close (and up): aim back toward Karan in proportion, or he drops out of the frame
      if (pulled > 0.01) p.target.lerp(pos.clone().add(new THREE.Vector3(0, 0.9, 0)), Math.min(1, pulled / dist) * 0.9);
    }
    return p;
  }
  /** Keep a camera position inside the ring (small arenas): pull it in radially and lift it to keep the view. */
  clampInside(pos, margin = 1.0) {
    const rel = pos.clone().sub(this.C).setY(0), l = rel.length(), lim = this.R - margin;
    if (l > lim) { rel.multiplyScalar(lim / l); pos.x = this.C.x + rel.x; pos.z = this.C.z + rel.z; pos.y += (l - lim) * 0.75; }
    return pos;
  }
  /** Near-top-down camera (85°, the open arc up) that FITS the given world points into the free part of the screen
   *  (left of the answer dock on desktop, above it on phones, below the shields). Real points are projected through a
   *  scratch camera and the pose is solved iteratively (distance + aim offset). margin < 1 leaves breathing room. */
  fitPose(pts, margin = 1, pitchDeg = 85) {
    const u = this.dirDeg(this.A.exitDeg), right = new THREE.Vector3(-u.z, 0, u.x), up = new THREE.Vector3(0, 1, 0);
    const vw = window.innerWidth, vh = window.innerHeight, narrow = vw < 760, fov = 32, pitch = pitchDeg * DEG, tanH = Math.tan((fov / 2) * DEG);
    const dock = document.getElementById('answer-dock'), pad = narrow ? 8 : 20;
    const free = narrow
      ? { x0: pad, x1: vw - pad, y0: 64, y1: vh - ((dock && dock.offsetHeight) || 300) - 8 - 34 - pad }   // below the shields, above the answer dock (+ room for the tip line)
      : { x0: pad, x1: vw - ((dock && dock.offsetWidth) || 276) - 20 - pad, y0: 28, y1: vh - pad };       // the HUD is only the shields, above the dock
    const fw = (free.x1 - free.x0) * margin, fh = (free.y1 - free.y0) * margin;
    const cam = this._fitCam || (this._fitCam = new THREE.PerspectiveCamera(fov, 1, 0.5, 2000));
    cam.aspect = vw / vh; cam.updateProjectionMatrix();
    const target = pts[0].clone(), v = new THREE.Vector3(); let D = 2.4 * this.R + 12;
    const place = () => { cam.position.copy(target).addScaledVector(u, -D * Math.cos(pitch)).addScaledVector(up, D * Math.sin(pitch)); cam.lookAt(target); cam.updateMatrixWorld(); };
    for (let it = 0; it < 7; it++) {
      place();
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
      for (const p of pts) { v.copy(p).project(cam); const sx = ((v.x + 1) / 2) * vw, sy = ((1 - v.y) / 2) * vh; x0 = Math.min(x0, sx); x1 = Math.max(x1, sx); y0 = Math.min(y0, sy); y1 = Math.max(y1, sy); }
      const mpp = (2 * D * tanH) / vh;   // metres per screen px at the aim point
      target.addScaledVector(right, ((x0 + x1) / 2 - (free.x0 + free.x1) / 2) * mpp).addScaledVector(u, -((y0 + y1) / 2 - (free.y0 + free.y1) / 2) * mpp);
      D *= Math.max((x1 - x0) / fw, (y1 - y0) / fh);
    }
    place();
    return { pos: cam.position.clone(), target, fov, cam, vw, vh };
  }
  /** Points along the gap beyond the arc where the guardians' sprites end (they stand toward screen-up from above). */
  guardTops() { const A = this.A, out = []; for (let d = -A.theta / 2; d <= A.theta / 2 + 0.01; d += A.theta / 6) out.push(this.W(A.exitDeg + d, this.R + GUARD_TOP)); return out; }
  /** The whole circle (the construction, the shot, the result): the ring floor plus a sliver of wall and the guardians
   *  behind the barrier. Every ring, r 7 or r 21, fills the view the same way. */
  tacticalPose() {
    const R = this.R, u = this.dirDeg(this.A.exitDeg), pts = [this.C.clone()];
    for (let a = 0; a < 360; a += 10) pts.push(this.C.clone().addScaledVector(this.dirDeg(a), R + 0.5));
    pts.push(...this.guardTops());
    if (this.boss && this.boss.alive) pts.push(this.wardenTop());
    const p = this.fitPose(pts);
    // TOO SMALL / TOO WIDE hang just below Karan's feet, in the empty half of the ring, so they never cover him
    const v = this.C.clone().addScaledVector(u, -(this.A.watchR + 0.9)).project(p.cam);
    ui.setArenaCentre(((v.x + 1) / 2) * p.vw, ((1 - v.y) / 2) * p.vh);
    return { pos: p.pos, target: p.target, fov: p.fov };
  }
  /** Zoomed in on the sector (LXD: the learner answers looking at the sector): O, both radii, the arc, the barrier and
   *  the guardians behind it, with room for the O, r and θ labels beside their lines. */
  sectorPose() {
    const A = this.A, R = this.R, lw = Math.max(1, R / 9), a0 = A.exitDeg - A.theta / 2, a1 = A.exitDeg + A.theta / 2, ar = Math.max(2.2, R * 0.18);
    const at = (deg, r) => this.C.clone().addScaledVector(this.dirDeg(deg), r);
    const pts = [this.C.clone()];
    for (let d = a0; d <= a1 + 0.01; d += Math.max(2, A.theta / 24)) pts.push(at(d, R + 0.6));
    pts.push(...this.guardTops());
    pts.push(at(a1, ar).addScaledVector(this.dirDeg(a1 + 90), 2.8 * lw));                   // θ beside the angle at O
    pts.push(at(a0, R * 0.55).addScaledVector(this.dirDeg(a0 - 90), 2.6 * lw));             // r beside the first radius
    pts.push(at(A.exitDeg + 180, Math.max(1.5 * lw, A.watchR + 0.45)));                     // O and its label, and Karan watching from his spot
    if (this.boss && this.boss.alive) pts.push(this.wardenTop());
    const p = this.fitPose(pts, 0.94);
    return { pos: p.pos, target: p.target, fov: p.fov };
  }
  /** A closer look at Karan when he takes a hit (LXD: the consequence must be evident). TOO SMALL / TOO WIDE move to just
   *  below him in this view. near: how much floor around him stays in frame (m). */
  heroPose(near = 3.2, at = this.hero.pos) {
    const h = at.clone().setY(0), u = this.dirDeg(this.A.exitDeg), pts = [h.clone()];
    for (let a = 0; a < 360; a += 45) pts.push(h.clone().addScaledVector(this.dirDeg(a), near));
    const p = this.fitPose(pts, 0.9), v = h.clone().addScaledVector(u, -0.9).project(p.cam);
    ui.setArenaCentre(((v.x + 1) / 2) * p.vw, ((1 - v.y) / 2) * p.vh);
    return { pos: p.pos, target: p.target, fov: p.fov };
  }
  /** The barrier breaking (user 2026-10-23: crack → fall to the floor → vanish): a lower camera from inside the ring
   *  looking at the gap. From straight above the glass is edge-on and a fall is invisible; at 54° the cracks on the glass,
   *  the pieces dropping to the floor and the guardians behind all read. (Below 55° the sprites draw before the glass.) */
  breakPose() {
    const A = this.A, pts = [];
    for (let d = -A.theta / 2; d <= A.theta / 2 + 0.01; d += A.theta / 8) {
      pts.push(this.W(A.exitDeg + d, this.R - 1.4), this.W(A.exitDeg + d, this.R, WALL_HEIGHT * 0.62));   // the floor where the pieces land; the visible glass
    }
    for (const b of this.bots.alive) pts.push(b.g.position.clone().setY(2.5));                               // the guardians behind it
    const p = this.fitPose(pts, 0.9, 54);
    return { pos: p.pos, target: p.target, fov: p.fov };
  }
  /** Ring 7: the Warden stands beyond the arc and its 6.5 m sprite rises toward screen-up in the top view; this point keeps
   *  all of it in frame (a sliver of its glow at the screen edge reads as a framing mistake). */
  wardenTop() { return this.boss.position.clone().setY(0).addScaledVector(this.dirDeg(this.A.exitDeg), 7.4); }
  /** Pose (inside the ring) that frames Karan low and the guarded gap high, verified by projecting both. */
  solveTwoShot(arc, look, guardPts) {
    const cam = new THREE.PerspectiveCamera(60, this.world.camera.aspect, 0.3, 500), side = new THREE.Vector3(-look.z, 0, look.x);
    const guards = guardPts.length ? guardPts : [arc.clone().setY(1.1)];
    const gC = guards.reduce((a, b) => a.add(b), new THREE.Vector3()).multiplyScalar(1 / guards.length);
    const feet = this.hero.pos.clone().setY(0.05), head = this.hero.pos.clone().setY(1.85), v = new THREE.Vector3();
    const scr = (p) => { v.copy(p).project(cam); return { x: (v.x + 1) / 2, y: (1 - v.y) / 2, z: v.z }; };
    let best = null; const fovs = this.world.camera.aspect < 0.8 ? [62, 72, 80] : [56, 62];   // portrait phones need a wider lens for the whole squad
    for (const h of [3.6, 4.4, 5.2, 6.0]) for (const lat of [-3, -1.5, 0, 1.5, 3]) for (const back of [0.5, 1.5, 2.5]) {
      const pos = this.clampInside(this.hero.pos.clone().addScaledVector(side, lat).addScaledVector(look, -back).add(new THREE.Vector3(0, h, 0)), 0.8);
      for (const f of [0.25, 0.35, 0.45, 0.55, 0.65]) for (const fov of fovs) {
        const target = this.hero.pos.clone().lerp(gC, f).setY(0.6);
        cam.fov = fov; cam.updateProjectionMatrix(); cam.position.copy(pos); cam.lookAt(target); cam.updateMatrixWorld();
        const F = scr(feet), Hd = scr(head), G = scr(gC);
        if (F.z > 1 || G.z > 1) continue;
        const gx = guards.map((g) => scr(g).x), gMin = Math.min(G.x, ...gx), gMax = Math.max(G.x, ...gx);
        let cost = 0;
        cost += Math.max(0, F.y - 0.9) * 40 + Math.max(0, 0.62 - Hd.y) * 20;                 // Karan fully in the lower band
        cost += Math.max(0, 0.24 - G.y) * 30 + Math.max(0, G.y - 0.42) * 20;                 // the guardians in the upper band
        cost += Math.max(0, 0.06 - gMin) * 20 + Math.max(0, gMax - 0.94) * 20;               // …inside the left/right edges
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
  /** The squad lines up (hidden) beyond the gap, in the guardian ground (bay or next ring), ready to charge in. */
  spawnSquad() {
    this.bots.spawnWave({ theta: this.A.theta, breachDeg: this.A.exitDeg, count: botCountFor(this.R, this.A.theta), R: this.R, center: this.A.center, maxR: (deg) => enemyMaxR(this.A, deg), scale: 1.12 + Math.max(0, this.R - 14) / 45 });
    this.bots.onPound = (b) => { if (!this.barrier.up) return; this.barrier.impact(b.deg, 1.0 + Math.random() * 0.8); audio.play('barrier.hit', { pan: this.bots.pan(b), vol: this.bots.calm ? 0.5 : 0.85, minGap: 0.06 }); };
  }
  /** Squad charges in; the barrier flashes up across the gap just before the first one reaches it. Resolves at the first
   *  blow (~2 s), or at a watchdog if that blow never lands (game time, so a pause does not trip it): play never stalls. */
  async squadArrives(formAfter = 0.15) {
    const first = this.bots.arrive();
    await delay(formAfter); this.barrier.form(0.55);
    await Promise.race([first, delay(6)]);
  }

  /* ---------------------------------------------------------------- main */
  async run() {
    const abortP = new Promise((res) => { this._abortRes = res; });
    try { return await Promise.race([this.flow(), abortP]); }
    catch (e) { if (e === ABORT) return { outcome: 'quit' }; console.error(e); return { outcome: 'quit', error: e }; }
  }
  async flow() {
    const L = this.level;
    const prevShields = this.game.lastShields; this.game.lastShields = null;
    if (prevShields != null && prevShields < this.maxShields) ui.hud.refillShields(prevShields, this.maxShields);   // show the refill (LXD)
    else ui.hud.setShields(this.shields, this.maxShields);
    audio.ambient.start('jungle'); audio.music.start('explore'); audio.music.setMode('explore');
    this.chain.setActiveArena(this.index); this.chain.setFocus(this.index, false, 0);
    if (this.index > 0 && SEAL_BEHIND) this.chain.raiseSeal(this.index - 1, true);
    this.sector.setArena(this.A); this.barrier.setArena(this.A);
    this.hero.group.visible = true;
    if (this.mode === 'causeway') await this.s(this.causeway());
    else if (this.mode === 'inside') await this.s(this.placeInside());
    audio.ambient.setMode(L.boss ? 'boss' : 'arena');
    const ok = await this.s(this.battle());
    this.game.lastShields = this.shields;
    if (!ok) { this.setPhase('gameover'); return { outcome: 'gameover' }; }
    const score = computeScore({ timeUsed: this.timeUsed, timeBudget: L.timeBudget, shieldsLost: this.maxShields - this.shields, firstTryCorrect: this.firstTry === true });
    // results card (LXD): which stars, why, and Retry; the next arena only starts when the student presses Next
    this.setPhase('cleared');
    const choice = await this.s(ui.result.show({ level: L, score, last: this.index === CHAIN.arenas.length - 1 }));
    if (choice === 'retry') { this.setPhase('done'); return { outcome: 'cleared', score, retry: true }; }
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
    this.chain.setFireflies(true);                                        // evening: fireflies over the lake, as on the title
    this.hero.setPosition(this.V(cw.start)); this.hero.face(dir); this.hero.surface = 'stone'; this.hero.stop();
    audio.ambient.setMode('causeway');
    // coming from the map screen: cut straight to the shot behind Karan (a fly-back from the title spot hid him for 2 s)
    this.rig.setPose(this.behindPose(this.hero.pos, dir, 5.5, 2.6, 58)); await delay(0.5);
    this.followHero(() => dir, 4);
    let skipped = false; ui.skip.show(() => { skipped = true; });
    const race = (p) => { let t; const skipP = new Promise((res) => { t = setInterval(() => { if (skipped) { clearInterval(t); res('skip'); } }, 50); }); return Promise.race([p, skipP]).finally(() => clearInterval(t)); };
    if (await race(this.hero.runTo(this.V(cw.gate).addScaledVector(dir, -8), 6.5)) !== 'skip') {
      this.setPhase('gate'); this.chain.openStartGate();
      if (await race(this.hero.runTo(this.V(this.A.spawn), 6)) !== 'skip') await race(this.gateShut());
    }
    ui.skip.hide();
    if (skipped) { tweens.clear(); this.hero.stop(); this.hero.setPosition(this.V(this.A.spawn)); this.chain.resetStartGate(false); this.chain.applySky(this.level.env.sky, 0.1); }
    this.chain.fadeOff = false; this.chain.setFireflies(false);
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
    await delay(1.0);
  }

  /* ---------------------------------------------------------------- the fight */
  /** LXD: the arena is empty when Karan reaches it. The gap ahead; then the guardians charge in from beyond it, the
   *  barrier flashes up across it and they pound on it. */
  async reveal() {
    const L = this.level, A = this.A;
    this.setPhase('inside');
    this.spawnSquad();
    const look = this.gapMid.clone().sub(this.hero.pos).setY(0).normalize();
    this.hero.face(look);
    // establishing shot: Karan low in the frame, the gap and the ground beyond it high
    const spots = this.bots.bots.map((b) => this.W(b.deg, b.rStand, 1.1));
    if (this.index === 0) this.rig.moveTo(this.solveTwoShot(this.gapMid.clone().setY(1.2), look, spots), 1.6);   // ring 1: stay inside the wall (the gate behind is solid)
    else {
      const B = this.R * 0.5 + 3.5, Hc = B * 1.05, Dka = this.hero.distTo(this.gapMid);
      this.rig.moveTo({ pos: this.hero.pos.clone().addScaledVector(look, -B).add(new THREE.Vector3(0, Hc, 0)), target: this.hero.pos.clone().addScaledVector(look, Dka * 0.5).setY(1.0), fov: this.world.camera.aspect < 0.8 ? 74 : 56 }, 1.6);
    }
    await delay(1.5);
    this.setPhase('arrive'); audio.play('alarm'); audio.music.setMode(L.boss ? 'boss' : 'arena');
    if (L.boss && !this.boss) { this.boss = new Boss(this.world, this.fx, this.W(A.exitDeg, this.R + (A.bay ? A.bay.D * 0.5 : 0) + 5), this.game.bossLight); this.boss.roar(); }
    this.bots.calm = false;
    await this.squadArrives();
    this.rig.shake(0.18, 0.4);
    await delay(1.4);   // a beat of pounding: the urgency has to land before anything else happens
  }
  /** LXD: Karan's designated observation point, just behind the centre on the line from the gap through O. He walks
   *  there now and stays for the whole action, so his movement never overlaps it. */
  async takePosition() {
    this.setPhase('observe');
    this.followHero(() => this.gapMid.clone().sub(this.hero.pos).setY(0).normalize(), 3.2, { dist: 5.2, height: 3.6, clamp: 1.0 });
    await this.hero.runTo(this.watch, 4.2, { within: 0.06 });
    this.hero.faceTo(this.gapMid);
    await delay(0.35);
  }
  async battle() {
    const L = this.level, A = this.A, R = this.R;
    this.attempt = 0;
    await this.reveal();
    await this.takePosition();
    // ---- the top view, in the LXD's order: O lights up → a radius is drawn to the wall → it sweeps along the arc into
    //      the sector → the rest of the circle dims → zoom in on the sector to answer
    this.setPhase('tactical'); audio.play('ui.whoosh');
    this.bots.calm = true;   // the pounding eases off while the sector is drawn and the learner works (urgency, not noise)
    this.chain.setFocus(this.index, true, 0.85, { cull: true });
    await this.rig.moveTo(this.tacticalPose(), 1.0, Ease.inOutCubic);
    audio.music.setMode(L.boss ? 'boss' : 'tension');
    this.setPhase('scan');
    await this.sector.scan({ breachDeg: A.exitDeg, theta: A.theta });
    await delay(0.3);
    // ---- the formula above the keypad (user, 2026-10-22): shown from the start on every ring; misses work it through.
    //      Filled while the dock is still off-screen, so the phone fit (sectorPose) measures the dock at its real height.
    ui.formula.show(R, A.theta);
    await this.rig.moveTo(this.sectorPose(), 0.9, Ease.inOutCubic);    // zoom in on the sector: the learner answers here
    const arcTop = this.W(A.exitDeg, R + GUARD_TOP, 0.6), outward = this.dirDeg(A.exitDeg);
    // ---- input loop
    while (true) {
      this.attempt++;
      this.setPhase('input');
      if (this.attempt === 1) ui.panel.open({ onFire: (v) => this._resolveFire && this._resolveFire(v), onType: () => ui.beamline.hide() });
      const t0 = this.world.elapsed;
      const answer = await new Promise((res) => { this._resolveFire = res; });
      this._resolveFire = null; this.timeUsed += this.world.elapsed - t0;
      if (answer === ABORT) throw ABORT;
      const res = evaluateAnswer(answer, R, A.theta);
      if (res.status === 'invalid') { ui.panel.setTip('Enter a number like 38.5 or 77/2'); audio.play('ui.error'); this.attempt--; ui.panel.unlock(); continue; }
      // ---- the charge: zoom out to the whole circle, O charges, the charge sweeps the wedge the answer asks for, breaks
      //      the barrier and hits the guardians behind the part of the arc it covers
      this.setPhase('firing'); this.heroDown = null; ui.panel.lock(); ui.panel.setTip(''); ui.beamline.hide(false);
      await this.rig.moveTo(this.tacticalPose(), 0.8, Ease.inOutCubic);
      this.hero.faceTo(this.gapMid); this.hero.cast(); await delay(0.25);   // Karan casts toward the gap; the charge gathers at O as his palm reaches out
      await this.sector.charge();
      const covered = Math.min(res.firedTheta, A.theta);
      await this.sector.fire({ ...res, theta: A.theta, breachDeg: A.exitDeg }, {
        onArc: () => {   // the charge hits the glass: the camera drops to see it crack, then give way and fall
          this.bots.idle = true; this.rig.moveTo(this.breakPose(), 0.28, Ease.outCubic);
          return this.barrier.breakAt({ fromDeg: A.exitDeg - covered / 2, spanDeg: covered });
        },
        onSlowEnd: () => this.rig.moveTo(this.tacticalPose(), 0.6, Ease.inOutCubic),
        targets: () => this.chargeTargets(res.status, covered),
        kill: (b) => this.bots.kill(b, 0, 0.7),
        reflectTo: () => this.hero.pos.clone(),
        onReflect: () => this.hitHero('reflect'),
      });
      this.hero.endCast();   // (a knock-down has already taken over if the charge reflected)
      if (this.boss) { if (res.status === 'correct') this.boss.defeat(); else this.boss.hurt(); }   // the Warden falls only to the exact sector
      this.setPhase('result');
      if (res.status !== 'correct') ui.beamline.show(beamLine(res, A.theta), res.status, arcTop, outward);
      if (res.status === 'correct') {
        if (this.firstTry === null) this.firstTry = this.attempt === 1;
        audio.play('sting.perfect');
        await delay(1.6);   // let the gold snap of the wedge read before the results card
        this.sector.releaseGhost(0.6); ui.panel.close(); ui.beamline.hide(); ui.setArenaCentre(null);
        this.sector.clearOverlays(true); await delay(0.3);
        return true;
      }
      if (this.firstTry === null) this.firstTry = false;
      this.misses++;
      audio.play('sting.fail');
      if (res.status === 'under') {
        // too small: the barrier is broken, the guardians the charge missed walk in and attack
        const attack = this.bots.breakThrough(this.hero.pos, () => this.hitHero('bot'));
        await ui.stamp('under', 'TOO SMALL', '', 1.3);
        await attack; if (this.heroDown) await this.heroDown;
        if (this.shields <= 0) return this.gameOver();
        this.sector.pulse(); this.bots.pulseKill(); await delay(0.9);
      } else {
        // too big: every guardian fell, but the excess knocked Karan down (during the shot); he gets back up
        await ui.stamp('over', 'TOO WIDE', '', 1.3);
        if (this.heroDown) await this.heroDown;
        if (this.shields <= 0) return this.gameOver();
      }
      this.sector.releaseGhost(0.8);
      // ---- back to the sector for the next answer: Karan returns to his spot, the barrier forms again and a fresh
      //      squad charges it; the one-line tip goes above the answer and the formula works itself one step further:
      //      1st miss → substitute, cross out, simplify; 2nd miss → the answer as a fraction (LXD)
      ui.panel.setTip(tipLine(res.diagnosis, R, A.theta));
      const back = this.hero.distTo(this.watch) > 0.15 ? this.hero.runTo(this.watch, 3.2, { face: this.gapMid, within: 0.06 }) : null;
      this.rig.moveTo(this.sectorPose(), 0.8, Ease.inOutCubic);
      this.spawnSquad(); this.bots.calm = false;
      const arrived = this.squadArrives();
      if (this.misses === 1) await ui.formula.walkthrough();
      else if (this.misses === 2) await ui.formula.solve();
      await arrived; if (back) await back; this.hero.faceTo(this.gapMid);
      this.bots.calm = true;
      ui.panel.unlock();
    }
  }
  /** Who the charge destroys. Exact or wider: the whole squad. Too small (LXD): only the guardians fully inside the covered
   *  part of the arc (one it merely grazes slips past), and never all of them, however close the answer. */
  chargeTargets(status, covered) {
    const alive = this.bots.alive, A = this.A;
    if (status !== 'under') return alive;
    let hit = alive.filter((b) => this.bots.inSector(b, A.exitDeg, covered / 2 - (0.6 / (this.R + 1)) / DEG));
    if (alive.length > 1 && hit.length >= alive.length - 1) {
      const byEdge = alive.slice().sort((p, q) => Math.abs(degDiff(A.exitDeg, p.deg)) - Math.abs(degDiff(A.exitDeg, q.deg)));
      hit = byEdge.slice(0, Math.max(0, alive.length - 2));   // the two at the ends of the arc get through
    }
    return hit;
  }
  /** Karan takes a hit: a guardian's blow (he flinches) or the reflected charge (he is knocked down). −1 shield. */
  hitHero(kind) {
    if (this.shields <= 0) return;
    this.shields--; ui.hud.setShields(this.shields, this.maxShields); ui.damage();
    audio.play(kind === 'reflect' ? 'reflect.hit' : 'bot.hit'); audio.play('player.hurt'); audio.play('shield.break');
    this.fx.hit(this.hero.pos.clone().add(new THREE.Vector3(0, 1, 0))); this.rig.shake(0.6, 0.6);
    if (kind === 'reflect') {
      // thrown back away from the gap: frame (and hang TOO WIDE below) where he will land, not where he stood
      const land = this.hero.pos.clone().add(this.hero.pos.clone().sub(this.gapMid).setY(0).normalize().multiplyScalar(1.4));
      this.heroDown = this.hero.knockdown(this.gapMid);
      this.rig.moveTo(this.heroPose(3.2, land), 0.55, Ease.outCubic);
    } else {
      this.heroDown = this.hero.hurt();
      this.rig.moveTo(this.heroPose(4.6), 0.45, Ease.outCubic);   // push in on the blow
    }
  }
  gameOver() { this.chain.setFocus(this.index, false, 0.6, { cull: false }); audio.play('sting.gameover'); audio.music.setMode('calm'); ui.panel.close(); ui.beamline.hide(); ui.setArenaCentre(null); this.sector.clearOverlays(true); return false; }

  /* ---------------------------------------------------------------- reward + progression: through the cleared gap into the next ring */
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
    this.setPhase('exit'); ui.panel.close(); audio.music.setMode('explore'); audio.play('sting.clear');
    await delay(0.45);                                                  // breathing: let the cleared ring sit for a beat
    const A = this.A, next = this.next, u = this.dirDeg(A.exitDeg);
    const through = this.W(A.exitDeg, this.R + 0.6), nextC = this.V(next.center), spawn = this.V(next.spawn);
    // reward: the way on lights up in amber, from Karan's spot straight through O and the cleared gap
    this.chain.setFocus(this.index, false, 0.9, { cull: false });
    this.lightPath([this.hero.pos.clone(), through, spawn]);
    this.rig.moveTo({ pos: this.C.clone().addScaledVector(u, -(this.R * 0.8 + 6)).add(new THREE.Vector3(0, this.R * 0.9 + 9, 0)), target: nextC.clone().addScaledVector(u, -next.R * 0.35).add(new THREE.Vector3(0, 1, 0)), fov: 56 }, 1.3);
    await this.hero.celebrate(0.25);
    await delay(0.5);
    // progression: overhead chase through the gap; the next arena's guardians only appear once Karan is inside it
    const overhead = (out) => { out.pos.copy(this.hero.pos).addScaledVector(u, -3.5).add(new THREE.Vector3(0, 9, 0)); out.target.copy(this.hero.pos).addScaledVector(u, 2.5).add(new THREE.Vector3(0, 0.6, 0)); out.fov = 58; return out; };
    this.rig.follow(overhead, 3.2);
    if (this.game.prepareNext) this.game.prepareNext(this.index + 1);
    const seal = SEAL_BEHIND ? this.chain.seals[this.index] : null;   // LXD: the passage you came through stays open
    const inside = this.waitFor(() => this.hero.distTo(nextC) < next.R - 1.6).then(() => { this.chain.cutRing = next.index; this.chain.keepSeals = true; if (seal) this.chain.raiseSeal(this.index); });
    await this.hero.runPath([through, spawn], 6.5);
    this.clearPath(0.6);
    if (seal) {
      await inside;
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
    await hero.runTo(gate.clone().addScaledVector(dir, -2.5), 7);
    audio.play('gate.unlock'); game.fx.flash(gate.clone().add(new THREE.Vector3(0, 2.5, 0)), 0xffe0a0, 12, 0.8);
    await hero.runTo(esc.clone().addScaledVector(dir, -1), 7);
    await hero.celebrate(1.4);
    audio.play('sting.clear');
  }

  update(dt) {
    if (this.boss) this.boss.update(dt);
  }
  dispose() {
    if (this.disposed) return; this.disposed = true; this.aborted = true;
    this.world.removeUpdatable(this); if (this.boss) { this.boss.dispose(); this.boss = null; } this.clearPath(0.01);
    this.sector.clearOverlays(false); this.barrier.hide(); this.world.labels.clear(); ui.panel.close(); ui.result.hide(); ui.setArenaCentre(null);
  }
}
