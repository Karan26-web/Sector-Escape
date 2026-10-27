// ---------------------------------------------------------------------------
// One arena of the chain, start to finish (LXD 2026-10-23; the player walks
// Karan between the action beats since 2026-10-27, Roam):
//   (the opening → the walk along the causeway → the gate opens, he walks in,
//   it shuts) | entering through the last gap → the gap ahead is empty → the
//   guardians charge in from beyond it, a barrier flashes up across it and they
//   pound on it → the player walks him to the glowing observation spot behind
//   the centre → top view: O → a radius → the sweep into the sector → zoom in, the
//   learner answers → zoom out, the volley → outcome (exact: barrier and squad
//   destroyed · too small: the barrier breaks, the ones it missed and more behind
//   them storm in and pile on Karan · too big: everything destroyed, the excess
//   rays bounce off the wall and knock Karan down)
//   → results → the player walks him through the cleared gap into the next ring.
// Shared world objects (chain, sector, barrier, bots) live in `game`; this class
// only moves through them.
// ---------------------------------------------------------------------------
import * as THREE from '../../vendor/three.module.js';
import { CHAIN, botCountFor, evaluateAnswer, evaluatePick, pickTip, computeScore, beamLine, tipLine, enemyMaxR, SEAL_BEHIND, WALL_HEIGHT } from './levels.js';
import { Boss } from './boss.js';
import { SDF, PILLARS, walkPose } from './roam.js';
import { playOpening, handoverPoint, CAUSEWAY_VIEW } from './opening.js';
import { save } from './save.js';
import { controller } from '../engine/controller.js';
import { assets } from '../engine/assets.js';
import { tweens, delay } from '../engine/tween.js';
import { polar, DEG, Ease, degDiff, toDeg, wrapDeg } from '../engine/util.js';
import { audio } from '../engine/audio.js';
import { ui } from '../ui/ui.js';

const ABORT = Symbol('abort');
const GUARD_TOP = 3.7;   // from the top view the guardians (1 m beyond the arc) rise this far past the arc toward screen-up

export class ArenaScene {
  /** mode: 'causeway' (arena 1 from the jungle path) | 'inside' (spawn at the entrance) | 'entering' (Karan just walked in
   *  through the last gap). opening: arena 1 starts with the opening (a new game's first Play). */
  constructor(game, index, { mode = 'inside', opening = false } = {}) {
    this.game = game; this.index = index; this.A = CHAIN.arenas[index]; this.level = this.A.level; this.mode = mode; this.opening = opening;
    this.world = game.world; this.fx = game.fx; this.hero = game.hero; this.rig = game.world.rig; this.chain = game.chain; this.sector = game.sector; this.barrier = game.barrier; this.bots = game.bots;
    this.R = this.A.R; this.C = new THREE.Vector3(this.A.center.x, 0, this.A.center.z);
    this.next = index + 1 < CHAIN.arenas.length ? CHAIN.arenas[index + 1] : CHAIN.sanctuary;
    this.shields = 3; this.maxShields = 3; this.misses = 0; this.firstTry = null; this.timeUsed = 0; this.attempt = 0;
    this.phase = 'init'; this.aborted = false; this.disposed = false; this._resolveFire = null; this.boss = null; this.pathDots = []; this.heroDown = null; this.storm = null;
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
    if (this.level.show && this.level.show.radius === 'diameter') pts.push(at(a0 + 180, R * 0.42).addScaledVector(this.dirDeg(a0 + 90), 2.4 * lw));   // the diameter's length, past O
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
   *  the pieces dropping to the floor and the guardians behind all read. (Below 55° the sprites draw before the glass.)
   *  withHero (a wrong answer): Karan in the foreground too, with room behind him — what comes next is aimed at him
   *  (the guardians storming in, or the bounced rays). */
  breakPose(withHero = false) {
    const A = this.A, pts = [];
    for (let d = -A.theta / 2; d <= A.theta / 2 + 0.01; d += A.theta / 8) {
      pts.push(this.W(A.exitDeg + d, this.R - 1.4), this.W(A.exitDeg + d, this.R, WALL_HEIGHT * 0.62));   // the floor where the pieces land; the visible glass
    }
    for (const b of this.bots.alive) pts.push(b.g.position.clone().setY(2.5));                               // the guardians behind it
    if (withHero) { const h = this.hero.pos; pts.push(h.clone(), h.clone().setY(1.9), h.clone().addScaledVector(this.dirDeg(A.exitDeg), -1.8)); }
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
  waitFor(cond, { autoAfter = 1e9, auto = null, tick = null } = {}) {
    return new Promise((res) => { let t = 0, autod = false; const u = { update: (dt) => { t += dt; if (tick) tick(dt); if (!autod && auto && t > autoAfter) { autod = true; auto(); } if (cond()) { this.world.removeUpdatable(u); res(); } } }; this.world.addUpdatable(u); });
  }
  /** The squad lines up (hidden) beyond the gap, in the guardian ground (bay or next ring), ready to charge in. */
  spawnSquad() {
    this.bots.spawnWave({ theta: this.A.theta, breachDeg: this.A.exitDeg, count: botCountFor(this.R, this.A.theta), R: this.R, center: this.A.center, maxR: (deg) => enemyMaxR(this.A, deg), scale: 1.12 + Math.max(0, this.R - 14) / 45 });
    this.bots.onPound = (b) => { if (!this.barrier.standing) return; this.barrier.impact(b.deg, 1.0 + Math.random() * 0.8); audio.play('barrier.hit', { pan: this.bots.pan(b), vol: this.bots.calm ? 0.5 : 0.85, minGap: 0.06 }); };
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
    this.hero.group.visible = true; this.hero.standUp();
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
  /** Arena 1 from the jungle: the opening (a new game's first Play), then the player walks Karan along the causeway to the
   *  gate; it opens as he reaches it and shuts behind him once he is inside. */
  async causeway() {
    this.chain.fadeOff = true;                                            // the wall and gate stay solid for the whole approach
    this.chain.setFireflies(true);                                        // evening: fireflies over the lake, as on the title
    this.hero.surface = 'stone'; this.hero.stop();
    audio.ambient.setMode('causeway');
    if (this.opening) await this.s(playOpening(this));
    else {
      const hand = handoverPoint(); this.hero.setPosition(hand); this.hero.face(this.dirDeg(CHAIN.causeway.dirDeg)); this.chain.setBeam(true);
      this.rig.setPose(walkPose(hand, CHAIN.causeway.dirDeg, CAUSEWAY_VIEW, this.world.camera.aspect)); await delay(0.3);
    }
    await this.s(this.walkToGate());
    await this.s(this.gateShut());
    this.chain.fadeOff = false; this.chain.setFireflies(false);
    await delay(0.3);
  }
  /** The first walk (user 2026-10-27): the islet and the causeway are the walkable floor (its parapets and the water bound
   *  it), ring 1's gate the goal. The door glows as he comes near, and whenever he stands still; it opens as he reaches
   *  it and the walk ends once he is inside the ring. The first time, the stick pops up with its walkthrough. */
  async walkToGate() {
    this.setPhase('causeway');
    const A = this.A, cw = CHAIN.causeway, g = this.chain.startGate, I = this.chain.islet, M = this.game.markers;
    const P = (r) => this.W(A.gate.deg, r), door = P(A.R + 1.6);                // along the gate's axis (the wall is 1 m thick)
    const hw = cw.width / 2 - 0.5, walk = SDF.union(SDF.disk(I, I.r - 1.1), SDF.capsule(I, P(A.R + 1.35 + hw), hw));   // (its round end sits on the door)
    const through = SDF.union(walk, SDF.lane(P(A.R + 1.4), P(A.R - 1.6), 0.9), SDF.inset(SDF.disk(A.center, A.R), 0.8));
    const open = () => g.leaf.position.y < g.openY * 0.55;                    // (not through the door while it is still sinking)
    const region = SDF.minus((x, z) => (open() ? through(x, z) : walk(x, z)), PILLARS);
    const first = this.opening || !save.load().moveTutorialSeen; let opened = false, taught = !first;   // (every start from the very beginning shows it)
    ui.hud.show(); controller.reveal({ demo: first }); if (first) ui.moveHint.show(controller.touch);
    await this.game.roam.run({
      region, yawDeg: cw.dirDeg, view: CAUSEWAY_VIEW,
      goal: { pos: this.V(A.spawn), reached: (p) => Math.hypot(p.x - A.center.x, p.z - A.center.z) < A.R - 1.5 },
      mark: door, near: 5, far: 16, highlight: (k, dt) => M.door(opened ? 0 : k, dt),
      onMove: (m) => { if (!taught && m > 1.6) { taught = true; ui.moveHint.done(); const d = save.load(); d.moveTutorialSeen = true; save.write(); } },
      onTick: (p) => { if (!opened && p.distanceTo(door) < 3.4) { opened = true; this.setPhase('gate'); M.doorOff(); this.chain.openStartGate(1.0); } },
    });
    M.doorOff(); ui.moveHint.hide();
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
  /** LXD: Karan's designated observation point, just behind the centre on the line from the gap through O. The player walks
   *  him there (user 2026-10-27): the spot glows on the floor, brighter as he nears it and whenever he stands still. The
   *  ring's floor is the walkable area (the barrier holds the gap, the walls the rest; an open passage shimmers when he
   *  pushes into it). On the spot the action begins, and he stays there for all of it. */
  async takePosition() {
    this.setPhase('observe');
    const A = this.A, M = this.game.markers;
    this.bots.calm = true;   // the pounding eases while he walks over (it is the player's walk: it may take a while)
    M.spotAt(this.watch);
    await this.game.roam.run({
      region: SDF.minus(SDF.inset(SDF.disk(A.center, A.R), 0.75), PILLARS), yawDeg: A.exitDeg, view: this.walkView(),
      goal: { pos: this.watch, r: 0.75 }, near: 2.5, far: 10, highlight: (k, dt) => M.spotSet(k, dt), onBump: (p) => this.edgeBump(p),
    });
    M.spotOff();
    await this.hero.runTo(this.watch, 2.4, { within: 0.06 });   // the last step onto the spot
    this.hero.faceTo(this.gapMid);
    await delay(0.3);
  }
  /** The walk camera in a ring: higher and farther back in the big rings (they fill the view alike). */
  walkView() { const R = this.R; return { dist: 5.5 + R * 0.22, height: 6 + R * 0.3, ahead: 1.5 }; }
  /** He pushes into the edge of the walkable floor. Where no wall stands (a passage he may not take) a shimmer shows the
   *  edge; the barrier ripples where he presses on it; a wall needs no sign. */
  edgeBump(p) {
    for (const ring of [this.A, this.next]) {
      const dx = p.x - ring.center.x, dz = p.z - ring.center.z; if (Math.abs(Math.hypot(dx, dz) - ring.R) > 1.4) continue;
      const deg = toDeg(dx, dz);
      if (ring === this.A && this.barrier.standing && Math.abs(degDiff(ring.exitDeg, deg)) < ring.theta / 2) { this.barrier.impact(deg, 1.1, 0.7); audio.play('roam.bump', { minGap: 0.5 }); return; }
      if (ring.wallArcs.some((w) => wrapDeg(deg - w.a0) <= w.a1 - w.a0)) continue;
      const q = polar(deg, ring.R - 0.3); this.game.markers.bump(new THREE.Vector3(ring.center.x + q.x, 0, ring.center.z + q.z)); return;
    }
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
    await this.sector.scan({ breachDeg: A.exitDeg, theta: A.theta, show: L.show });
    await delay(0.3);
    // ---- the formula above the keypad (user, 2026-10-22): shown from the start on every ring; misses work it through.
    //      Filled while the dock is still off-screen, so the phone fit (sectorPose) measures the dock at its real height.
    // arenas 1–4 choose their answer (mcq / drop-downs), 5–7 type it in terms of π; every area is in terms of π (LXD 2026-10-27)
    const picking = !!L.ask, piForm = picking || !!L.piForm;
    ui.formula.show(R, A.theta, { piForm });
    await this.rig.moveTo(this.sectorPose(), 0.9, Ease.inOutCubic);    // zoom in on the sector: the learner answers here
    const arcTop = this.W(A.exitDeg, R + GUARD_TOP, 0.6), outward = this.dirDeg(A.exitDeg);
    // ---- input loop
    while (true) {
      this.attempt++;
      this.setPhase('input');
      if (this.attempt === 1) ui.panel.open({ piForm, level: L, onFire: (v) => this._resolveFire && this._resolveFire(v), onType: () => ui.beamline.hide() });
      const t0 = this.world.elapsed;
      const answer = await new Promise((res) => { this._resolveFire = res; });
      this._resolveFire = null; this.timeUsed += this.world.elapsed - t0;
      if (answer === ABORT) throw ABORT;
      let res;
      if (picking) {
        // the chosen formula is worked out on screen, right or wrong, and what it gives is fired (LXD 2026-10-27)
        this.setPhase('solve'); ui.panel.lock(); ui.panel.setTip(''); ui.beamline.hide(false);
        await this.s(ui.formula.solveExpr(answer.expr));
        res = evaluatePick(answer.expr, R, A.theta); res.tip = res.status === 'correct' ? '' : pickTip(L, answer.sel);
      } else {
        res = evaluateAnswer(answer, R, A.theta, { piForm });
        if (res.status === 'invalid') { ui.panel.setTip(piForm ? 'Enter the number that goes in front of π' : 'Enter a number like 38.5 or 77/2'); audio.play('ui.error'); this.attempt--; ui.panel.unlock(); continue; }
      }
      // ---- the charge: zoom out to the whole circle, O charges and fires its rays all at once across the wedge the
      //      answer asks for; they break the barrier and strike the guardians behind the part of the arc they cover
      this.setPhase('firing'); this.heroDown = null; ui.panel.lock(); ui.panel.setTip(''); ui.beamline.hide(false);
      await this.rig.moveTo(this.tacticalPose(), 0.8, Ease.inOutCubic);
      this.hero.faceTo(this.gapMid); this.hero.cast(); await delay(0.25);   // Karan casts toward the gap; the charge gathers at O as his palm reaches out
      await this.sector.charge();
      const covered = Math.min(res.firedTheta, A.theta);
      this.storm = null;
      await this.sector.fire({ ...res, theta: A.theta, breachDeg: A.exitDeg }, {
        onArc: () => {   // the rays hit the glass: the camera drops to see it crack (Karan in frame after a wrong answer), and
                         // every guardian at it hammers away as it cracks
          this.bots.rally(); this.rig.moveTo(this.breakPose(res.status !== 'correct'), 0.28, Ease.outCubic);
          return this.barrier.breakAt({ fromDeg: A.exitDeg - covered / 2, spanDeg: covered });
        },
        onBreak: () => {   // it gives way. Too small: the ones the shot missed storm in that instant, more pouring in behind them
          this.bots.idle = true;
          if (res.status === 'under') this.storm = this.bots.swarm(this.hero.pos, { extra: this.reinforcements(), onContact: () => this.hitHero('swarm'), onBlow: (b) => this.blowOnHero(b) });
        },
        // too big: the bounced rays have just knocked Karan down and the camera is pushing in on him; otherwise the whole ring
        onSlowEnd: () => (res.status === 'over' ? null : this.rig.moveTo(this.tacticalPose(), 0.6, Ease.inOutCubic)),
        targets: () => this.chargeTargets(res.status, covered),
        kill: (b, at) => this.bots.kill(b, at, 0.7),
        reflectTo: () => this.hero.pos.clone(),
        onReflect: () => this.hitHero('reflect'),
      });
      this.hero.endCast();   // (a knock-down has already taken over if the charge reflected)
      if (this.boss) { if (res.status === 'correct') this.boss.defeat(); else this.boss.hurt(); }   // the Warden falls only to the exact sector
      this.setPhase('result');
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
        // too small: the guardians the shot missed have been storming in since the glass gave way (more behind them, through
        // the same uncovered stretch); they reach Karan, surround him and pile on, until O's pulse throws them off
        const storm = this.storm, got = storm ? await storm.contact : false; this.storm = null;
        const stamp = ui.stamp('under', 'TOO SMALL', '', 1.5);
        if (got) { await Promise.race([storm.allIn, delay(1.8)]); await delay(0.9); }   // the pile-on: the whole crowd on him, blows from every side
        if (this.shields <= 0) { this.bots.halt(); await stamp; return this.gameOver(); }
        this.sector.pulse(); this.bots.pulseKill(); await delay(0.45);
        await this.hero.recover(); await stamp;
      } else {
        // too big: every guardian fell, but the excess rays bounced off the wall into Karan (during the shot); he gets up
        await ui.stamp('over', 'TOO WIDE', '', 1.3);
        if (this.heroDown) await this.heroDown;
        if (this.shields <= 0) return this.gameOver();
      }
      // the lesson, from above, once the action is over: the shot against the sector (the dashed target around it / its red
      // excess) and the numbers line beside the arc (during the push-in it would only collide with the r label)
      await this.rig.moveTo(this.tacticalPose(), 0.6, Ease.inOutCubic);
      ui.beamline.show(beamLine(res, A.theta), res.status, arcTop, outward); await delay(0.7);
      this.sector.releaseGhost(0.8);
      // ---- back to the sector for the next answer: Karan returns to his spot, the barrier forms again and a fresh
      //      squad charges it; the one-line tip goes above the answer. Typed: the formula works itself one step further
      //      (1st miss → substitute, cross out, simplify; 2nd miss → the answer as a fraction). Chosen: the wrong choices
      //      are struck out and the plain formula returns (each try already showed its working)
      ui.panel.setTip(picking ? res.tip : tipLine(res.diagnosis, R, A.theta));
      if (picking) { ui.pick.markWrong(answer.sel); ui.formula.show(R, A.theta, { piForm }); }
      const back = this.hero.distTo(this.watch) > 0.15 ? this.hero.runTo(this.watch, 3.2, { face: this.gapMid, within: 0.06 }) : null;
      this.rig.moveTo(this.sectorPose(), 0.8, Ease.inOutCubic);
      this.spawnSquad(); this.bots.calm = false;
      const arrived = this.squadArrives();
      if (!picking && this.misses === 1) await ui.formula.walkthrough();
      else if (!picking && this.misses === 2) await ui.formula.solve();
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
  /** Too small: as many again pour in behind the survivors (at least 3, so even a near miss is a crowd), up to 16 around
   *  Karan in all. The survivors themselves already scale with how much of the arc the shot missed. */
  reinforcements() { const n = this.bots.alive.length; return Math.max(0, Math.min(16 - n, Math.max(3, Math.round(n * 1.2)))); }
  /** Karan takes a hit: the bounced rays (he is knocked down) or the swarm reaching him (down under the pile). −1 shield. */
  hitHero(kind) {
    if (this.shields <= 0 || this.aborted) return;
    this.shields--; ui.hud.setShields(this.shields, this.maxShields); ui.damage();
    audio.play(kind === 'reflect' ? 'reflect.hit' : 'bot.hit'); audio.play('player.hurt'); audio.play('shield.break');
    this.fx.hit(this.hero.pos.clone().add(new THREE.Vector3(0, 1, 0))); this.rig.shake(0.6, 0.6);
    if (kind === 'reflect') {
      // thrown back away from the gap: frame (and hang TOO WIDE below) where he will land, not where he stood
      const land = this.hero.pos.clone().add(this.hero.pos.clone().sub(this.gapMid).setY(0).normalize().multiplyScalar(1.4));
      this.heroDown = this.hero.knockdown(this.gapMid);
      this.rig.moveTo(this.heroPose(3.2, land), 0.55, Ease.outCubic);
    } else {
      this.heroDown = this.hero.overwhelm();
      this.rig.moveTo(this.heroPose(4.4), 0.45, Ease.outCubic);   // push in on the pile-on
    }
  }
  /** A blow in the pile-on: no further shield (one per wrong shot), but every blow lands — a thud, sparks, a jolt. */
  blowOnHero(b) {
    if (this.aborted) return;
    audio.play('swarm.blow', { pan: this.bots.pan(b), minGap: 0.07 });
    this.fx.sparks(this.hero.pos.clone().setY(0.4), 3, 0xff6040, 3, 0.4, 0.28); this.hero.flash(0xff6050, 0.18); this.rig.shake(0.1, 0.12);
  }
  gameOver() { this.bots.halt(); this.chain.setFocus(this.index, false, 0.6, { cull: false }); audio.play('sting.gameover'); audio.music.setMode('calm'); ui.panel.close(); ui.beamline.hide(); ui.setArenaCentre(null); this.sector.clearOverlays(true); return false; }

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
    const A = this.A, next = this.next, u = this.dirDeg(A.exitDeg), M = this.game.markers;
    const through = this.W(A.exitDeg, this.R + 0.6), nextC = this.V(next.center), spawn = this.V(next.spawn);
    // reward: the way on lights up in amber, from Karan's spot straight through O and the cleared gap
    this.chain.setFocus(this.index, false, 0.9, { cull: false });
    this.lightPath([this.hero.pos.clone(), through, spawn]);
    this.rig.moveTo({ pos: this.C.clone().addScaledVector(u, -(this.R * 0.8 + 6)).add(new THREE.Vector3(0, this.R * 0.9 + 9, 0)), target: nextC.clone().addScaledVector(u, -next.R * 0.35).add(new THREE.Vector3(0, 1, 0)), fov: 56 }, 1.3);
    await this.hero.celebrate(0.25);
    await delay(0.5);
    if (this.game.prepareNext) this.game.prepareNext(this.index + 1);
    // progression (user 2026-10-27): the player walks him out through the cleared gap, lit like an open door, into the next
    // ring (the way back stays closed); its guardians only appear once he is inside it
    M.gapAt(A);
    let floor = SDF.union(SDF.inset(SDF.disk(A.center, A.R), 0.75), SDF.inset(SDF.bay(A), 0.7), SDF.inset(SDF.disk(next.center, next.R), 0.75));
    const prev = CHAIN.arenas[this.index - 1]; if (prev) floor = SDF.minus(floor, SDF.disk(prev.center, prev.R + 0.3));
    await this.game.roam.run({
      region: SDF.minus(floor, PILLARS), yawDeg: A.exitDeg, view: this.walkView(),
      goal: { pos: spawn, reached: (p) => Math.hypot(p.x - nextC.x, p.z - nextC.z) < next.R - 1.6 },
      mark: through, near: 3, far: 12, highlight: (k, dt) => M.gapSet(k, dt), onBump: (p) => this.edgeBump(p),
    });
    M.gapOff(); this.clearPath(0.6);
    this.chain.cutRing = next.index; this.chain.keepSeals = true;
    if (SEAL_BEHIND) {   // (off, LXD: the passage you came through stays open) the ring closes behind him; he looks back
      this.chain.raiseSeal(this.index);
      const sm = this.chain.seals[this.index].mid, back = new THREE.Vector3(sm.x, 0, sm.z).sub(this.hero.pos).setY(0).normalize();
      this.hero.face(back);
      await this.rig.moveTo({ pos: this.hero.pos.clone().addScaledVector(back, -4.2).add(new THREE.Vector3(0, 3.0, 0)), target: new THREE.Vector3(sm.x, 2.4, sm.z), fov: 58 }, 0.7);
      await delay(1.0);
    }
    this.hero.faceTo(nextC);
    await delay(0.2);
  }
  /** After the seventh ring: the player walks him across the temple court to the temple gate (it glows brighter as he
   *  nears it); there the gate flares and he runs out through it. */
  static async finale(game) {
    const S = CHAIN.sanctuary, hero = game.hero, rig = game.world.rig, chain = game.chain, M = game.markers, last = CHAIN.arenas[CHAIN.arenas.length - 1];
    game.onPhase && game.onPhase('finale');
    chain.setActiveArena(S.index); audio.music.setMode('explore');
    const gate = new THREE.Vector3(S.gatePos.x, 0, S.gatePos.z), esc = new THREE.Vector3(S.escape.x, 0, S.escape.z), dir = esc.clone().sub(gate).normalize(), stand = gate.clone().addScaledVector(dir, -2.4);
    const court = SDF.union(SDF.inset(SDF.disk(S.center, S.R), 0.8), SDF.inset(SDF.disk(last.center, last.R), 0.8), SDF.inset(SDF.bay(last), 0.7), SDF.lane(gate.clone().addScaledVector(dir, -3), gate, 1.4));
    await game.roam.run({
      region: SDF.minus(court, PILLARS), yawDeg: S.gateDeg, view: { dist: 9, height: 8, ahead: 3 },
      goal: { pos: stand, r: 1.4 }, mark: gate, near: 6, far: 20, highlight: (k) => M.templeGate(k),
    });
    M.templeGate(0);
    rig.follow((out) => { const d = gate.clone().sub(hero.pos).setY(0).normalize(); out.pos.copy(hero.pos).addScaledVector(d, -7).add(new THREE.Vector3(0, 3.4, 0)); out.target.copy(hero.pos).addScaledVector(d, 8).add(new THREE.Vector3(0, 1.5, 0)); out.fov = 56; return out; }, 3);
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
    this.game.roam.stop(); this.game.markers.clear(); ui.moveHint.hide(); ui.cine.end(); ui.skip.hide();   // (a walk or the opening cut short)
  }
}
