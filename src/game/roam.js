// ---------------------------------------------------------------------------
// Free walks (user 2026-10-27): between the action beats the player walks Karan
// with the controller. Each walk is run({ region, goal, … }) and resolves when
// he reaches the goal.
//  * The region is a signed-distance shape on the floor (negative inside): he
//    slides along its edge and can never leave it, so the walkable areas are
//    exactly the islet and the causeway, a ring's floor, the cleared gap into
//    the next ring, the temple court.
//  * The goal lights up (highlight(k)) as he comes near it, and fully, with a
//    soft chime, whenever the player stands still or keeps pushing into an edge.
//  * The camera follows from behind his right shoulder at a fixed heading
//    toward the goal (SWING), and the stick follows that heading: up = ahead.
// ---------------------------------------------------------------------------
import * as THREE from '../../vendor/three.module.js';
import { controller } from '../engine/controller.js';
import { audio } from '../engine/audio.js';
import { polar, degDiff, toDeg, DEG, clamp } from '../engine/util.js';
import { CHAIN } from './levels.js';

export const MOVE_SPEED = 5.2;   // m/s at full stick (the scripted runs are 6.5)
const IDLE_HINT = 2.4;           // s standing still before the goal is highlighted
const STUCK_HINT = 1.0;          // s pushing into an edge before the same
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

/** Signed distances on the floor (x, z), negative inside. */
export const SDF = {
  disk: (c, r) => (x, z) => Math.hypot(x - c.x, z - c.z) - r,
  /** a straight strip from a to b (its centre line), half as wide as hw */
  lane(a, b, hw) {
    const ux = b.x - a.x, uz = b.z - a.z, L = Math.hypot(ux, uz) || 1, dx = ux / L, dz = uz / L;
    return (x, z) => {
      const px = x - a.x, pz = z - a.z, t = px * dx + pz * dz, s = Math.abs(pz * dx - px * dz), qx = Math.abs(t - L / 2) - L / 2, qz = s - hw;
      return Math.hypot(Math.max(qx, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qz), 0);
    };
  },
  /** a strip from a to b with rounded ends, r either side: pushed forward against an end, he slides to its middle (the
   *  causeway ends at ring 1's door this way, so hugging a parapet still leads in through the doorway) */
  capsule(a, b, r) {
    const ux = b.x - a.x, uz = b.z - a.z, L2 = ux * ux + uz * uz || 1;
    return (x, z) => { const t = clamp(((x - a.x) * ux + (z - a.z) * uz) / L2, 0, 1); return Math.hypot(x - a.x - ux * t, z - a.z - uz * t) - r; };
  },
  /** an arena's bay: the annular sector R..R+D over θ beyond its arc (outside it: walls) */
  bay(a) {
    if (!a || !a.bay) return () => Infinity;
    const c = a.center, R0 = a.R - 0.6, R1 = a.R + a.bay.D, half = a.theta / 2;
    return (x, z) => { const dx = x - c.x, dz = z - c.z, r = Math.hypot(dx, dz), off = Math.abs(degDiff(a.exitDeg, toDeg(dx, dz))) - half; return Math.max(R0 - r, r - R1, off * DEG * Math.max(r, 1)); };
  },
  union: (...fs) => (x, z) => { let d = Infinity; for (const f of fs) { const v = f(x, z); if (v < d) d = v; } return d; },
  minus: (f, g) => (x, z) => Math.max(f(x, z), -g(x, z)),
  inset: (f, m) => (x, z) => f(x, z) + m,
};
/** The carved columns at the wall ends stand on the walkable edge: walk round them, not through them. */
export const PILLARS = SDF.union(...CHAIN.pillars.map((p) => SDF.disk(p, 1.15)));

/** How far (degrees) the walk camera swings round to his right. His back sheet (idle, run, cast) is drawn three-quarter,
 *  turned up and to the right: from straight behind, his run toward the goal read as running sideways (user 2026-10-27).
 *  From here his heading runs up and to the right on screen, the way the art runs. Less on a portrait phone, whose narrow
 *  frame must still hold the goal ahead. */
export const SWING = { wide: 28, tall: 18 };

/** The walk camera at rest: behind his right shoulder at a fixed heading (yawDeg), farther and wider on a portrait phone.
 *  The opening ends on exactly this pose, so the hand-over to the player has no cut. */
export function walkPose(at, yawDeg, v = {}, aspect = 1.6, out = { pos: new THREE.Vector3(), target: new THREE.Vector3(), fov: 52 }) {
  const tall = aspect < 0.8, k = tall ? 1.3 : 1, D = (v.dist ?? 7) * k, H = (v.height ?? 7.5) * k, A = v.ahead ?? 2.5;
  const f = polar(yawDeg, 1), b = polar(yawDeg + 180 + (tall ? SWING.tall : SWING.wide), D);   // behind him, swung to his right
  out.pos.set(at.x + b.x, H, at.z + b.z); out.target.set(at.x + f.x * A, 0.9, at.z + f.z * A); out.fov = tall ? 64 : (v.fov ?? 52);
  return out;
}

/** Pull p back inside the region along the field's gradient, so he slides along an edge instead of sticking to it.
 *  Returns how far he was pushed back (0 when he was inside). */
export function clampTo(sdf, p) {
  let pushed = 0;
  for (let i = 0; i < 3; i++) {
    const d = sdf(p.x, p.z); if (d <= 0) break;
    const e = 0.02, gx = sdf(p.x + e, p.z) - sdf(p.x - e, p.z), gz = sdf(p.x, p.z + e) - sdf(p.x, p.z - e), gl = Math.hypot(gx, gz);
    if (gl < 1e-9) break;
    p.x -= (gx / gl) * (d + 1e-3); p.z -= (gz / gl) * (d + 1e-3); pushed += d;
  }
  return pushed;
}

export class Roam {
  constructor(game) {
    this.game = game; this.world = game.world; this.hero = game.hero;
    this.cur = null;
    this.autopilot = false;   // tests: walk to the goal by itself (?auto=1, __se.walk(true))
    this._v = new THREE.Vector3();
    game.world.addUpdatable(this);
  }
  get active() { return !!this.cur; }

  /**
   * Hand Karan to the player until he reaches the goal.
   * o: { region (x, z) → signed distance · goal: { pos, r?, reached?(pos) } · mark?: where "near" is measured (the door;
   *      default goal.pos) · near?, far?: the highlight is full within near m, nothing beyond far · highlight?(k, dt) ·
   *      yawDeg: the heading the camera looks along (toward the goal) · view?: { dist, height, ahead, fov } ·
   *      onTick?(pos) · onMove?(metres walked) · onBump?(point on the edge he pushes into) }
   */
  run(o) {
    this.stop();
    return new Promise((res) => {
      const f = polar(o.yawDeg ?? 0, 1);
      const c = this.cur = { ...o, res, fwd: new THREE.Vector3(f.x, 0, f.z), right: new THREE.Vector3(-f.z, 0, f.x), still: 0, stuck: 0, hl: 0, pinged: true, moved: 0, bumpT: 0, last: this.hero.pos.clone() };
      const h = this.hero;
      h.stop(); h.drive = new THREE.Vector3(); h.bound = (p) => { c.pushed = clampTo(c.region, p); };
      this.game.chain.watchPoint = h.pos;   // no wall between the walk camera and him stays solid
      clampTo(c.region, h.pos);
      if (o.view !== false) this.follow(c);
      controller.enable(true);
    });
  }
  follow(c) { const v = c.view || {}, yaw = c.yawDeg ?? 0; this.world.rig.follow((out) => walkPose(this.hero.pos, yaw, v, this.world.camera.aspect, out), v.lambda ?? 3.6); }
  /** Take him back from the player (the walk is over, or the scene ended). The stick hides. */
  stop() {
    const c = this.cur; if (!c) return;
    this.cur = null; this.hero.drive = null; this.hero.bound = null; this.game.chain.watchPoint = null;
    controller.enable(false);
  }

  update(dt) {
    const c = this.cur; if (!c || dt <= 0) return;
    const h = this.hero, inp = this.autopilot ? this.steer(c) : controller.read();
    h.drive.copy(c.right).multiplyScalar(inp.x).addScaledVector(c.fwd, inp.y).multiplyScalar(MOVE_SPEED);
    const step = Math.hypot(h.pos.x - c.last.x, h.pos.z - c.last.z); c.last.copy(h.pos); c.moved += step;
    if (c.onMove) c.onMove(c.moved);
    // standing still, or pushing into an edge (moving much slower than the stick asks)
    const pushing = inp.mag > 0.35;
    c.still = pushing ? 0 : c.still + dt;
    c.stuck = pushing && step / dt < 0.3 * MOVE_SPEED * inp.mag ? c.stuck + dt : 0;
    if ((c.bumpT -= dt) <= 0 && pushing && c.pushed > 0 && c.onBump) { c.bumpT = 0.7; c.onBump(h.pos.clone()); }
    // the goal: brighter the nearer he gets; full, with a chime once per pause, when he stands still or is stuck
    const m = c.mark || c.goal.pos, dist = Math.hypot(h.pos.x - m.x, h.pos.z - m.z);
    const idle = c.still > IDLE_HINT || c.stuck > STUCK_HINT;
    if (idle && !c.pinged) { c.pinged = true; audio.play('objective.ping'); }
    if (!idle && (pushing || c.still < 0.5)) c.pinged = false;
    const want = Math.max(1 - smooth(c.near ?? 4, c.far ?? 12, dist), idle ? 1 : 0);
    c.hl += (want - c.hl) * Math.min(1, dt * 4);
    if (c.highlight) c.highlight(c.hl, dt);
    if (c.onTick) c.onTick(h.pos);
    const g = c.goal, done = g.reached ? g.reached(h.pos) : Math.hypot(h.pos.x - g.pos.x, h.pos.z - g.pos.z) < (g.r ?? 0.8);
    if (done && this.cur === c) { this.stop(); c.res(); }
  }
  /** autopilot: straight for the goal (every walk's region is convex enough), easing in at the end */
  steer(c) {
    const h = this.hero.pos, g = c.goal.pos, dx = g.x - h.x, dz = g.z - h.z, L = Math.hypot(dx, dz) || 1, k = Math.min(1, L / 1.5);
    return { x: ((dx * c.right.x + dz * c.right.z) / L) * k, y: ((dx * c.fwd.x + dz * c.fwd.z) / L) * k, mag: k };
  }
}
