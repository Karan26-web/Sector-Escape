// ---------------------------------------------------------------------------
// The sector (LXD 2026-10-23): no weapon stands at the centre any more. In the
// top view the centre point O lights up, a radius is drawn from it to the wall
// and sweeps along the arc into the sector; the learner's answer charges O and
// O fires a volley of rays across exactly the wedge that area asks for, all at
// once (user 2026-10-27): they break the barrier across the gap and strike the
// guardians behind it; an overcharge's rays strike the wall beside the gap and
// those same rays bounce back across the ring into Karan. Positioned relative
// to the arena centre C.
// ---------------------------------------------------------------------------
import * as THREE from '../../vendor/three.module.js';
import { makeBillboard } from '../engine/sprites.js';
import { assets } from '../engine/assets.js';
import { tweens, tweenValue, delay } from '../engine/tween.js';
import { DEG, polar, Ease, clamp, degDiff } from '../engine/util.js';
import { audio } from '../engine/audio.js';

const SECTOR_VERT = `varying vec3 vPos; void main(){ vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;
const SECTOR_FRAG = `
uniform vec3 color; uniform float progress; uniform float radius; uniform float thetaStart; uniform float thetaLength; uniform float time; uniform float opacity; uniform float edgeW; uniform float reveal;
varying vec3 vPos;
void main(){
  float r = length(vPos.xy) / radius;
  float ang = atan(vPos.y, vPos.x);
  float a = mod(ang - thetaStart + 6.2831853, 6.2831853);
  float f = clamp(a / thetaLength, 0.0, 1.0);
  float edge = smoothstep(0.0, edgeW, f) * smoothstep(0.0, edgeW, 1.0 - f);
  float edgeGlow = 1.0 - edge;
  float front = 1.0 - smoothstep(progress - 0.07, progress, r);
  float frontGlow = exp(-pow((r - progress) * 16.0, 2.0)) * step(r, progress + 0.08);
  float core = 0.3 + 0.7 * pow(1.0 - r, 1.3);
  float stripes = 0.86 + 0.14 * sin(r * 70.0 - time * 16.0);
  float shown = 1.0 - smoothstep(reveal - 0.004, reveal + 0.004, f);                    // angular reveal (scan sweep)
  float lead = exp(-pow((f - reveal) * 70.0, 2.0)) * step(reveal, 0.999) * step(0.001, reveal);
  float alpha = (front * (core * stripes * (0.5 + 0.5 * edgeGlow)) + frontGlow * 1.3) * shown + lead * 1.4;
  vec3 col = mix(color, vec3(1.0), clamp(edgeGlow * 0.55 + frontGlow * 0.8, 0.0, 1.0));
  gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0) * opacity);
}`;

export function sectorMesh(R, startDeg, lengthDeg, color, y = 0.07) {
  const segs = Math.max(12, Math.round(lengthDeg / 2));
  const geo = new THREE.RingGeometry(0.001, R, segs, 1, startDeg * DEG, lengthDeg * DEG);
  const mat = new THREE.ShaderMaterial({ vertexShader: SECTOR_VERT, fragmentShader: SECTOR_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { color: { value: new THREE.Color(color) }, progress: { value: 0 }, radius: { value: R }, thetaStart: { value: startDeg * DEG }, thetaLength: { value: lengthDeg * DEG }, time: { value: 0 }, opacity: { value: 1 }, edgeW: { value: clamp(3 / lengthDeg, 0.03, 0.2) }, reveal: { value: 1 } } });
  const m = new THREE.Mesh(geo, mat); m.rotation.x = -Math.PI / 2; m.position.y = y; m.renderOrder = 10; return m;
}
function dashTexture() {
  if (dashTexture.t) return dashTexture.t;
  const c = document.createElement('canvas'); c.width = 256; c.height = 16; const g = c.getContext('2d');
  g.fillStyle = '#fff'; for (let x = 0; x < 256; x += 32) g.fillRect(x, 0, 20, 16);
  const t = new THREE.CanvasTexture(c); t.wrapS = THREE.RepeatWrapping; dashTexture.t = t; return t;
}
/** Flat ribbon from the centre outward along `deg`; grows with scale.x. */
function ribbon(length, width, deg, color, { dashed = true, opacity = 0.55, y = 0.09, order = 9 } = {}) {
  const geo = new THREE.PlaneGeometry(length, width); geo.translate(length / 2, 0, 0);
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  if (dashed) { const t = dashTexture().clone(); t.needsUpdate = true; t.repeat.set(length / 1.2, 1); t.userData.owned = true; mat.map = t; }
  const m = new THREE.Mesh(geo, mat); m.rotation.x = -Math.PI / 2; m.rotation.z = deg * DEG; m.position.y = y; m.renderOrder = order; return m;
}
const dirV = (deg) => { const p = polar(deg, 1); return new THREE.Vector3(p.x, 0, p.z); };
/** A flat line on the floor from a to b (overlay coordinates). */
function segment(a, b, width, color, { opacity = 0.9, y = 0.06, order = 13 } = {}) {
  const L = Math.hypot(b.x - a.x, b.z - a.z), geo = new THREE.PlaneGeometry(L, width); geo.translate(L / 2, 0, 0);
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  m.rotation.x = -Math.PI / 2; m.rotation.z = Math.atan2(-(b.z - a.z), b.x - a.x); m.position.set(a.x, y, a.z); m.renderOrder = order; return m;
}

const RAY_Y = 0.5;      // the rays fly at chest height (1 m: the overlays sit 0.5 m up): they strike the glass, the guardians, Karan
const RAY_OUT = 0.22;   // s: every ray from O to the arc, all at once
const RAY_BACK = 0.5;   // s of game time (≈1.4 s in the slow motion): a bounced ray back across the ring into Karan
const UNIT = new THREE.PlaneGeometry(1, 1).translate(0.5, 0, 0);   // one ray segment, scaled to length × width (shared)
/** One ray of the volley: a white-hot core in a coloured halo, flat at chest height, a glow riding its tip. Its path is a
 *  polyline (O → the glass, the wall or a guardian; a bounced ray goes on from the wall to Karan) and grow(d) draws it up
 *  to d m along that path, so a bounce is the SAME ray turning at the wall, never a new one. */
class Ray {
  constructor(parent, core, halo, lw) {
    this.parent = parent; this.lw = lw; this.pts = []; this.segs = []; this.len = 0; this.g = new THREE.Group(); parent.add(this.g);
    this.mats = [[core, 1], [halo, 0.45]].map(([c, o]) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
    this.head = makeBillboard('fx_glow', 1.4 * lw, { additive: true, tint: halo, centerY: 0.5 }); this.head.renderOrder = 15; this.head.visible = false; this.g.add(this.head);
  }
  /** Extend the path to p (overlay coordinates, at chest height). */
  to(p) {
    const b = new THREE.Vector3(p.x, RAY_Y, p.z), a = this.pts[this.pts.length - 1];
    if (a) {
      const seg = { a, b, L: a.distanceTo(b), from: this.len, meshes: [] };
      for (const [w, mat] of [[0.1, this.mats[0]], [0.42, this.mats[1]]]) {
        const m = new THREE.Mesh(UNIT, mat); m.rotation.x = -Math.PI / 2; m.rotation.z = Math.atan2(-(b.z - a.z), b.x - a.x); m.position.copy(a);
        m.scale.set(0.001, w * this.lw, 1); m.renderOrder = 14; m.visible = false; this.g.add(m); seg.meshes.push(m);
      }
      this.segs.push(seg); this.len += seg.L;
    }
    this.pts.push(b); return this;
  }
  /** Distance along the path to vertex i. */
  at(i) { let d = 0; for (let k = 0; k < i && k < this.segs.length; k++) d += this.segs[k].L; return d; }
  grow(d) {
    this.head.visible = d > 0.01;
    for (const s of this.segs) {
      const v = clamp(d - s.from, 0, s.L);
      for (const m of s.meshes) { m.visible = v > 0.001; m.scale.x = Math.max(0.001, v); }
      if (v > 0 && s.L > 1e-6) this.head.position.lerpVectors(s.a, s.b, v / s.L);
    }
  }
  fade(dur) { return tweenValue(1, 0, dur, (v) => { this.mats[0].opacity = v; this.mats[1].opacity = 0.45 * v; this.head.material.opacity = v; }).then(() => this.dispose()); }
  dispose() { this.parent.remove(this.g); this.mats.forEach((m) => m.dispose()); this.head.material.dispose(); }
}

export class Sector {
  constructor(world, fx) {
    this.world = world; this.fx = fx; this.R = 14; this.C = new THREE.Vector3();
    this.group = new THREE.Group(); world.add(this.group);
    // the charge gathers at O: four painted orbs (spark → full charge ring) and a light on the floor
    const ot = assets.texture('cannon_orbs', { wrap: false }); this.orbTex = ot.clone(); this.orbTex.needsUpdate = true; this.orbTex.repeat.set(1 / 4, 1);
    this.orb = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.orbTex, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, opacity: 0 }));
    this.orb.renderOrder = 16; this.orb.visible = false; this.orb.position.y = 0.75; this.group.add(this.orb);
    this.light = new THREE.PointLight(0x7fe6ff, 0, 14, 2); this.light.position.y = 1.2; this.group.add(this.light);
    // the construction lies just above the floor (ring floors use depth offsets that would swallow a decal at y = 0)
    this.overlays = new THREE.Group(); world.add(this.overlays); this.pulsing = []; this.oGlow = null; this._sweep = 0; this._tv = new THREE.Vector3();
    this.lasers = []; this.chargeLevel = 0;
    // shader warm-ups (compiled while the game loads): the sector shader and the plain and dashed lines, invisible below the floor
    const warm = [sectorMesh(14, 0, 10, 0x66ddff), ribbon(1, 0.1, 0, 0xffffff, { dashed: false, opacity: 0 }), ribbon(1, 0.1, 0, 0xffffff, { dashed: true, opacity: 0 })];
    warm[0].material.uniforms.opacity.value = 0; for (const w of warm) { w.position.y = -5; this.overlays.add(w); }
  }
  setArena(a) {
    this.C.set(a.center.x, 0, a.center.z); this.R = a.R; this.group.position.copy(this.C);
    this.overlays.position.copy(this.C); this.overlays.position.y = 0.5;
    this.reset();
  }
  reset() {
    this.clearOverlays(false); this.lasers = []; this.chargeLevel = 0;
    this.orb.visible = false; this.orb.material.opacity = 0; this.light.intensity = 0;
  }
  worldPos(deg, r, y = 0) { const p = polar(deg, r); return new THREE.Vector3(this.C.x + p.x, y, this.C.z + p.z); }

  /** The top-view construction, drawn the way a teacher draws it (LXD 2026-10-23): the centre point O lights up → one
   *  radius is drawn from O to the wall (r) → that radius sweeps through θ and paints the sector (the angle grows at O,
   *  the arc is traced) → the rest of the circle dims. Labels sit beside their lines, never on them.
   *  show (LXD 2026-10-27, per arena): angle 'symbol' θ = 90° · 'value' just the degrees, inside the angle · 'right' the
   *  right-angle square at O, no number; radius 'symbol' r = 7 m · 'value' just the length · 'diameter' the radius drawn on
   *  through O to the far wall with the whole length on it (the learner halves it). */
  async scan({ breachDeg, theta, show = {} }) {
    const R = this.R, W = this.world, lw = Math.max(1, R / 9), a0 = breachDeg - theta / 2, a1 = breachDeg + theta / 2;   // line widths grow with the ring so they stay crisp from far
    const angle = show.angle || 'symbol', radius = show.radius || 'symbol', diameter = radius === 'diameter';
    // 1) the centre O: a bright point with a soft highlight (a glow, not a ring outline)
    const dot = new THREE.Mesh(new THREE.CircleGeometry(0.2 * lw, 28), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false }));
    dot.rotation.x = -Math.PI / 2; dot.position.y = 0.09; dot.renderOrder = 15; dot.scale.setScalar(0.001); this.overlays.add(dot);
    const glow = makeBillboard('fx_glow', 2.4 * lw, { additive: true, tint: 0x9ff4ff, centerY: 0.5 }); glow.position.y = 0.12; glow.material.opacity = 0; glow.renderOrder = 14; this.overlays.add(glow);
    audio.play('label.pop');
    await tweenValue(0, 1, 0.55, (v) => { dot.scale.setScalar(Math.max(0.001, v < 0.6 ? (v / 0.6) * 1.45 : 1.45 - ((v - 0.6) / 0.4) * 0.45)); glow.material.opacity = v < 0.4 ? v * 2.5 : 1 - (v - 0.4) * 0.9; });
    this.oGlow = glow; this.oGlowBase = glow.scale.x;   // (no "O" label: the lit point is the centre, user 2026-10-27)
    await delay(0.4);
    // 2) one radius, from O out to the wall: r (the diameter: from O both ways, wall to wall)
    const radii = (diameter ? [a0, a0 + 180] : [a0]).map((d) => { const m = ribbon(R, 0.13 * lw, d, 0xf3ebd8, { dashed: false, opacity: 0.95, y: 0.07, order: 13 }); m.scale.x = 0.001; this.overlays.add(m); return m; });
    audio.play('scan.ping');
    await tweenValue(0, 1, 0.6, (v) => radii.forEach((m) => (m.scale.x = Math.max(0.001, v))), { ease: Ease.outCubic });
    for (const d of diameter ? [a0, a0 + 180] : [a0]) {
      const tick = new THREE.Mesh(new THREE.PlaneGeometry(0.1 * lw, 0.8 * lw), new THREE.MeshBasicMaterial({ color: 0xf3ebd8, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      const tkp = polar(d, R - 0.05); tick.position.set(tkp.x, 0.07, tkp.z); tick.rotation.x = -Math.PI / 2; tick.rotation.z = d * DEG; tick.renderOrder = 13; this.overlays.add(tick);
    }
    const ld = diameter ? a0 + 180 : a0, lp = polar(ld, R * (diameter ? 0.42 : 0.55));   // (a diameter's length sits on its far half, clear of the sector)
    W.labels.add('radius', diameter ? `${2 * R} m` : radius === 'value' ? `${R} m` : `r = ${R} m`, { className: 'measure radius', worldPos: new THREE.Vector3(this.C.x + lp.x, 0.6, this.C.z + lp.z), push: dirV(ld - 90) });
    audio.play('label.pop');
    await delay(0.5);
    // 3) the radius sweeps through θ, painting the sector: the second radius, the angle at O and the arc grow with it
    const sweeper = ribbon(R, 0.13 * lw, a0, 0xffffff, { dashed: false, opacity: 1, y: 0.075, order: 14 }); this.overlays.add(sweeper);
    this.fill = sectorMesh(R, a0, theta, 0x52ded8, 0.01); const fu = this.fill.material.uniforms; fu.progress.value = 1; fu.reveal.value = 0; fu.opacity.value = 0.32; this.overlays.add(this.fill);
    const ar = Math.max(2.2, R * 0.18);
    // the angle's arc at O and the traced arc along the wall: built once at the full angle, one segment per degree, and
    // revealed as the radius sweeps (rebuilding both every frame of the sweep stuttered on tablets)
    const segs = Math.max(8, Math.round(theta));
    const band = (r0, r1, color, op) => { const m = new THREE.Mesh(new THREE.RingGeometry(r0, r1, segs, 1, a0 * DEG, theta * DEG), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); m.rotation.x = -Math.PI / 2; m.position.y = 0.06; m.renderOrder = 13; m.geometry.setDrawRange(0, 0); this.overlays.add(m); return m; };
    // (a right angle is marked with a square, not an arc)
    const bands = [angle === 'right' ? null : band(ar, ar + 0.16 * lw, 0xffffff, 0.75), band(R - 0.16 * lw, R - 0.02, 0x9ff7f2, 0.7)].filter(Boolean);
    const grow = (len) => { const n = 6 * Math.min(segs, Math.ceil((segs * len) / theta - 1e-6)); for (const m of bands) m.geometry.setDrawRange(0, n); };   // (6 indices per segment, in order from a0)
    this._sweep = 0;
    const text = (v) => (angle === 'value' ? `${Math.round(v)}°` : `θ = ${Math.round(v)}°`);
    if (angle !== 'right') W.labels.add('theta', text(0), { className: 'measure theta', worldPos: () => this.angleLabelPos(a0, this._sweep, theta, ar + 0.16 * lw) });
    const thLabel = W.labels.items.get('theta');
    audio.play('scan.sweep');
    await tweenValue(0, theta, 1.6, (v) => {
      this._sweep = v; sweeper.rotation.z = (a0 + v) * DEG; fu.reveal.value = v / theta; grow(v);
      if (thLabel) W.labels.set('theta', text(v));
    }, { ease: Ease.inOutSine });
    sweeper.material.color.setHex(0xf3ebd8); sweeper.material.opacity = 0.95;   // it stays as the second radius
    if (angle === 'right') {   // the right-angle square: two short sides from the radii to the far corner
      const sz = ar * 0.75, p0 = polar(a0, sz), p1 = polar(a1, sz), c = { x: p0.x + p1.x, z: p0.z + p1.z };
      for (const [a, b] of [[p0, c], [c, p1]]) { const m = segment(a, b, 0.15 * lw, 0xffffff, { opacity: 0 }); this.overlays.add(m); tweenValue(0, 0.9, 0.3, (v) => (m.material.opacity = v)); }
    }
    audio.play('label.pop');
    // 4) focus: the sector stays lit, the rest of the circle dims
    tweens.to(fu.opacity, { value: 0.18 }, { duration: 0.6 });
    const dim = new THREE.Mesh(new THREE.RingGeometry(0.01, R - 0.02, Math.max(24, Math.round((360 - theta) / 3)), 1, a1 * DEG, (360 - theta) * DEG), new THREE.MeshBasicMaterial({ color: 0x050c0a, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
    dim.rotation.x = -Math.PI / 2; dim.position.y = 0.005; dim.renderOrder = 8; this.overlays.add(dim);
    await tweenValue(0, 0.46, 0.5, (v) => (dim.material.opacity = v));
  }
  /** Where θ's label sits (user 2026-10-27: "on top, just adjacent to the angle"): on the angle's bisector just past its
   *  arc (outer radius arcR), and only as far out as it must be to clear both radii, a narrow angle pushing it out a
   *  little. Worked out on screen from the label's own size, so it holds at every zoom and on every screen. The distance
   *  is the finished angle's (theta), so while the radius sweeps it the label circles O at that distance, counting up. */
  angleLabelPos(a0, sweep, theta, arcR) {
    const cam = this.world.camera, L = this.world.labels, el = L.get('theta'), w = L.container.clientWidth, h = L.container.clientHeight;
    const scr = (deg, r) => { const p = polar(deg, r); return this._tv.set(this.C.x + p.x, 0, this.C.z + p.z).project(cam); };
    const c = scr(0, 0), cx = c.x, cy = c.y;
    const dir = (deg) => { const q = scr(deg, 1), x = (q.x - cx) * w / 2, y = (cy - q.y) * h / 2, l = Math.hypot(x, y) || 1; return { x: x / l, y: y / l, s: l }; };   // screen direction, px per m
    const u0 = dir(a0), u1 = dir(a0 + theta), b = dir(a0 + theta / 2), mid = a0 + sweep / 2;
    const hw = el ? el.offsetWidth / 2 : 0, hh = el ? el.offsetHeight / 2 : 0, ext = (nx, ny) => hw * Math.abs(nx) + hh * Math.abs(ny);
    let t = arcR * b.s + 8 + ext(b.x, b.y);                                                      // just past the arc
    for (const u of [u0, u1]) {                                                                  // clear of both radii
      const s = Math.abs(b.x * u.y - b.y * u.x);   // how fast the bisector moves away from this radius
      if (s > 0.05) t = Math.max(t, (ext(-u.y, u.x) + 8) / s);
    }
    t = Math.min(t, this.R * 0.8 * b.s);                                                         // (always inside the circle)
    const p = polar(mid, t / b.s);
    return this._tv.set(this.C.x + p.x, 0.6, this.C.z + p.z);
  }
  /** Take an overlay off the floor and free what it owns (not the shared ray segment, sprite quads or cached textures:
   *  every scan and shot used to leave its meshes on the GPU). */
  drop(k) {
    this.overlays.remove(k);
    k.traverse((o) => {
      if (o.geometry && o.geometry !== UNIT && !o.isSprite) o.geometry.dispose();
      const m = o.material; if (m) { if (m.map && m.map.userData.owned) m.map.dispose(); m.dispose(); }
    });
  }
  clearOverlays(fade = true) {
    for (const id of ['theta', 'radius']) this.world.labels.remove(id, fade);
    this.pulsing = []; this.oGlow = null;
    const kids = [...this.overlays.children].filter((k) => k.position.y > -1);
    if (!fade) { kids.forEach((k) => this.drop(k)); this.fill = null; return; }
    kids.forEach((k) => { const mat = k.material; if (!mat) { this.drop(k); return; } const start = mat.uniforms ? mat.uniforms.opacity.value : mat.opacity; tweenValue(start, 0, 0.5, (v) => { if (mat.uniforms) mat.uniforms.opacity.value = v; else mat.opacity = v; }).then(() => this.drop(k)); });
    this.fill = null;
  }

  /** The answer is in: the charge gathers at O (the orb grows, O and the floor around it light up). */
  async charge() {
    audio.play('charge.build'); this.world.rig.shake(0.05, 1.1);
    this.orb.visible = true; const os = Math.max(1, this.R / 9);
    await tweenValue(0, 1, 1.1, (v) => {
      this.chargeLevel = v; this.light.intensity = v * 90;
      const of = Math.min(3, Math.floor(v * 4)); this.orbTex.offset.x = of / 4;        // 4 painted orbs: spark → full charge ring
      this.orb.material.opacity = Math.min(1, v * 2.5); this.orb.scale.setScalar((0.35 + v * 0.9) * os);
      if (this.oGlow) { this.oGlow.material.opacity = 0.5 + v * 0.5; this.oGlow.scale.setScalar(this.oGlowBase * (1 + v)); }
    }, { ease: Ease.inQuad });
  }
  /** Gold dashed outline of a wedge (the TARGET, drawn over a smaller undercharged shot). */
  dashedWedge(R, startDeg, lenDeg, color, lw) {
    const out = [], mat = () => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1, depthWrite: false, side: THREE.DoubleSide });
    for (const d of [startDeg, startDeg + lenDeg]) { const m = ribbon(R, 0.16 * lw, d, color, { dashed: true, opacity: 1, y: 0.08, order: 14 }); out.push(m); }
    const n = Math.max(6, Math.round((lenDeg * DEG * R) / (1.1 * lw))), step = lenDeg / n;
    for (let k = 0; k < n; k++) { const m = new THREE.Mesh(new THREE.RingGeometry(R - 0.2 * lw, R - 0.04 * lw, 6, 1, (startDeg + k * step) * DEG, step * 0.6 * DEG), mat()); m.rotation.x = -Math.PI / 2; m.position.y = 0.08; m.renderOrder = 14; out.push(m); }
    out.forEach((m) => { m.userData.ghost = true; this.overlays.add(m); }); return out;
  }
  /**
   * Fire (LXD; a volley since 2026-10-27): 1) every ray leaves O at the same instant, across exactly the wedge the student
   * asked for (cyan over the arc's part, red for any excess), and the wedge lights up behind their fronts; 2) they land, in
   * slow motion: the arc's rays strike the glass (onArc: it cracks, then gives way), an overcharge's rays strike the wall
   * beside the gap and bounce straight back into Karan; 3) as the glass gives way the arc's rays go on through the gap,
   * each guardian the shot covers struck by its own ray (onBreak: too small → the ones it missed storm in at once);
   * 4) a comparison stays on the floor until releaseGhost(): the target wedge dashed around a narrower shot / the excess
   * pulsing red / a gold snap when exact.
   * r: { status, firedTheta, theta, breachDeg }.  cb: { targets() → the guardians the shot covers, onArc() → resolves as
   * the glass gives way, kill(bot, delay), onBreak(), reflectTo() → where Karan stands, onReflect(), onSlowEnd() }
   */
  async fire(r, cb = {}) {
    const R = this.R, W = this.world, lw = Math.max(1, R / 9);
    const fired = clamp(r.firedTheta, 2, 360), covered = Math.min(fired, r.theta), extra = r.status === 'over' ? Math.max(0, fired - r.theta) / 2 : 0;   // (only a too-wide shot bounces)
    const start = r.breachDeg - fired / 2, a1 = r.breachDeg + r.theta / 2;
    const targets = cb.targets ? cb.targets() : [];
    audio.play('charge.fire'); audio.play('ray.volley'); const hum = audio.play('laser.loop');
    W.rig.shake(0.35, 0.6); this.fx.flash(this.worldPos(0, 0, 1.2), 0xdffcff, 6 * lw, 0.4);   // (the rays, not a white-out, carry the shot)
    this.orb.visible = false; this.light.intensity = 60;
    // the wedge the answer asks for, [excess] [the arc's part] [excess], lit out from O behind the rays' fronts
    const pieces = [];
    if (extra > 0) pieces.push({ s: start, l: extra, c: 0xff3b6b });
    pieces.push({ s: r.breachDeg - covered / 2, l: covered, c: 0x66ddff, main: true });
    if (extra > 0) pieces.push({ s: a1, l: extra, c: 0xff3b6b });
    for (const p of pieces) { p.m = sectorMesh(R, p.s, p.l, p.c, 0.02); p.m.material.uniforms.progress.value = 0; this.overlays.add(p.m); this.lasers.push(p.m); }
    // 1) the volley: every ray leaves O at once and they all land together
    const rays = this.volley(r.breachDeg, r.theta, fired, covered, extra, targets, lw);
    await tweenValue(0, 1, RAY_OUT, (e) => { for (const k of rays) k.ray.grow(k.ray.at(1) * e); for (const p of pieces) p.m.material.uniforms.progress.value = e * 1.08; }, { ease: Ease.outQuad });
    // 2) they land, in slow motion: the glass cracks; an overcharge's rays strike the wall and bounce back (alongside)
    W.timeScale = 0.35;
    if (r.status === 'under') this.dashedWedge(R, r.breachDeg - r.theta / 2, r.theta, 0xffd36b, lw);   // the sector it should have covered
    else if (r.status === 'over') this.pulsing = pieces.filter((p) => !p.main).map((p) => p.m);
    const bounced = this.bounce(rays.filter((k) => k.kind === 'wall'), extra > 0 ? [[start, extra], [a1, extra]] : [], cb, lw);
    if (cb.onArc) await cb.onArc();
    // 3) the glass gives way: the arc's rays run on through the gap, each covered guardian struck by its own ray
    for (const k of rays) if (k.kind !== 'wall') { tweenValue(k.ray.at(1), k.ray.len, 0.08, (v) => k.ray.grow(v), { ease: Ease.linear }); if (k.bot && cb.kill) cb.kill(k.bot, 0.08); }
    if (cb.onBreak) cb.onBreak();
    if (!(await bounced)) await delay(0.3);
    W.timeScale = 1;
    if (cb.onSlowEnd) cb.onSlowEnd();
    rays.forEach((k) => k.ray.fade(0.45));
    hum && hum.stop(0.5);
    // 4) the exact sector snaps gold (the dashed target and the red excess have been there since the rays landed)
    if (r.status === 'correct') {
      const main = pieces.find((p) => p.main).m;
      main.material.uniforms.color.value.set(0xffd36b); main.material.uniforms.opacity.value = 1.2;
      this.fx.flash(this.worldPos(r.breachDeg, R * 0.5, 1.0), 0xffe9a0, 14, 0.6);
      main.scale.setScalar(1.08); tweens.to(main.scale, { x: 1, y: 1, z: 1 }, { duration: 0.45, ease: Ease.outBack });
    }
    this.chargeLevel = 0;
    tweenValue(1, 0, 0.5, (v) => { this.orb.material.opacity = v; }).then(() => { this.orb.visible = false; });
    tweenValue(this.light.intensity, 0, 0.8, (v) => { this.light.intensity = v; });
    if (this.oGlow) { const g = this.oGlow, s0 = g.scale.x, s1 = this.oGlowBase; tweenValue(0, 1, 0.6, (e) => g.scale.setScalar(s0 + (s1 - s0) * e)); }
  }
  /** The rays of a shot: one at every guardian the shot covers (it is seen to strike it), more across the rest of the arc's
   *  part so no stretch of it is bare, and across each overcharged side (at least one each: an overcharge must be seen to
   *  bounce back). Every ring fills the view alike, so a step in degrees is a spacing on screen. */
  volley(breachDeg, theta, fired, covered, extra, targets, lw) {
    const R = this.R, step = clamp(fired / 10, 6, 10), c0 = breachDeg - covered / 2, list = targets.map((b) => ({ deg: b.deg, kind: 'bot', bot: b }));
    const n = Math.max(1, Math.round(covered / step));
    for (let i = 0; i < n; i++) { const d = c0 + ((i + 0.5) * covered) / n; if (!list.some((k) => Math.abs(degDiff(k.deg, d)) < step * 0.7)) list.push({ deg: d, kind: 'arc' }); }
    if (extra > 0) for (const s0 of [breachDeg - fired / 2, breachDeg + theta / 2]) { const m = Math.max(1, Math.round(extra / step)); for (let i = 0; i < m; i++) list.push({ deg: s0 + ((i + 0.5) * extra) / m, kind: 'wall' }); }
    for (const k of list) {
      const wall = k.kind === 'wall';
      k.ray = wall ? new Ray(this.overlays, 0xffe3ec, 0xff3b6b, lw) : new Ray(this.overlays, 0xf2ffff, 0x66ddff, lw);
      k.ray.to(polar(k.deg, 0.35)).to(polar(k.deg, wall ? R - 0.15 : R - 0.05));    // O → the wall / the glass
      if (k.bot) k.ray.to(polar(k.deg, k.bot.r)); else if (!wall) k.ray.to(polar(k.deg, R + 1.8));   // → on through the gap
    }
    return list;
  }
  /** An overcharge (LXD): its rays strike the wall beside the gap, the wall flares red there, and the SAME rays bounce off
   *  it and run back across the ring, converging on Karan. Resolves true as they reach him (onReflect); false (at once)
   *  when nothing was overcharged. */
  async bounce(rays, arcs, cb, lw) {
    if (!rays.length) return false;
    const R = this.R, o = this.overlays.position;
    for (const [s0, l] of arcs) {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(R - 0.15, R - 0.15, 2.4, Math.max(8, Math.round(l / 2)), 1, true, s0 * DEG + Math.PI / 2, l * DEG), new THREE.MeshBasicMaterial({ color: 0xff4f7a, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      m.position.y = 0.7; this.overlays.add(m); tweenValue(1, 0, 0.9, (v) => (m.material.opacity = v)).then(() => { this.overlays.remove(m); m.geometry.dispose(); m.material.dispose(); });
    }
    for (const k of rays) { const p = k.ray.pts[1].clone().add(o); p.y -= 0.6; this.fx.flash(p.clone().setY(1.0), 0xff4f7a, 2.4 * lw, 0.4); this.fx.sparks(p, 5, 0xff8ab0, 3.5, 0.5, 0.3 * lw); }
    audio.play('ray.ricochet'); audio.play('reflect.zap');
    const to = cb.reflectTo ? cb.reflectTo().sub(this.C) : new THREE.Vector3();
    for (const k of rays) { const j = polar(Math.random() * 360, Math.random() * 0.35); k.ray.to({ x: to.x + j.x, z: to.z + j.z }); }
    const d0 = rays.map((k) => k.ray.at(1));   // (from the wall on)
    await tweenValue(0, 1, RAY_BACK, (e) => rays.forEach((k, i) => k.ray.grow(d0[i] + (k.ray.len - d0[i]) * e)), { ease: Ease.inQuad });
    this.fx.flash(new THREE.Vector3(o.x + to.x, 1.0, o.z + to.z), 0xff5a8a, 4.5, 0.45);
    if (cb.onReflect) cb.onReflect();
    return true;
  }
  /** Fade the ghost comparison (the fired wedge, the dashed target, the red excess). The construction stays. */
  releaseGhost(dur = 0.6) {
    this.pulsing = [];
    const ghosts = [...this.lasers, ...this.overlays.children.filter((k) => k.userData.ghost)]; this.lasers = [];   // only the comparison: the construction (O, radii, θ) stays
    ghosts.forEach((k) => { const mat = k.material; const s0 = mat.uniforms ? mat.uniforms.opacity.value : mat.opacity; tweenValue(s0, 0, dur, (v) => { if (mat.uniforms) mat.uniforms.opacity.value = v; else mat.opacity = v; }).then(() => this.drop(k)); });
  }
  /** O sends a shockwave across the arena (the survivors who got in fall to it). */
  pulse() { audio.play('pulse'); this.fx.shockwave(this.C.clone(), this.R + 2, 0.8, 0xbff6ff); this.fx.flash(this.worldPos(0, 0, 1.1), 0x9ff4ff, 8, 0.5); this.world.rig.shake(0.3, 0.4); }

  update(dt, t) {
    for (const m of this.pulsing) m.material.uniforms.opacity.value = 0.95 + 0.35 * Math.sin(t * 8);
    if (this.oGlow && !this.chargeLevel) this.oGlow.material.opacity = 0.42 + 0.12 * Math.sin(t * 2.4);   // O keeps a soft pulse
    for (const l of this.lasers) if (l.material.uniforms) l.material.uniforms.time.value = t;
    if (this.fill) this.fill.material.uniforms.time.value = t;
  }
}
