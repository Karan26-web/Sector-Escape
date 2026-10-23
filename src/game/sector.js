// ---------------------------------------------------------------------------
// The sector (LXD 2026-10-23): no weapon stands at the centre any more. In the
// top view the centre point O lights up, a radius is drawn from it to the wall
// and sweeps along the arc into the sector; the learner's answer charges O and
// the charge sweeps exactly the wedge that area asks for, breaks the barrier
// across the gap and hits the guardians behind it (overcharge: the excess
// reflects off the wall at Karan). Positioned relative to the arena centre C.
// ---------------------------------------------------------------------------
import * as THREE from '../../vendor/three.module.js';
import { makeBillboard } from '../engine/sprites.js';
import { assets } from '../engine/assets.js';
import { tweens, tweenValue, delay } from '../engine/tween.js';
import { DEG, polar, Ease, clamp } from '../engine/util.js';
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
  float front = smoothstep(progress, progress - 0.07, r);
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
  if (dashed) { const t = dashTexture().clone(); t.needsUpdate = true; t.repeat.set(length / 1.2, 1); mat.map = t; }
  const m = new THREE.Mesh(geo, mat); m.rotation.x = -Math.PI / 2; m.rotation.z = deg * DEG; m.position.y = y; m.renderOrder = order; return m;
}
const dirV = (deg) => { const p = polar(deg, 1); return new THREE.Vector3(p.x, 0, p.z); };

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
   *  the arc is traced) → the rest of the circle dims. Labels sit beside their lines, never on them. */
  async scan({ breachDeg, theta }) {
    const R = this.R, W = this.world, lw = Math.max(1, R / 9), a0 = breachDeg - theta / 2, a1 = breachDeg + theta / 2;   // line widths grow with the ring so they stay crisp from far
    // 1) the centre O: a bright point with a soft highlight (a glow, not a ring outline)
    const dot = new THREE.Mesh(new THREE.CircleGeometry(0.2 * lw, 28), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false }));
    dot.rotation.x = -Math.PI / 2; dot.position.y = 0.09; dot.renderOrder = 15; dot.scale.setScalar(0.001); this.overlays.add(dot);
    const glow = makeBillboard('fx_glow', 2.4 * lw, { additive: true, tint: 0x9ff4ff, centerY: 0.5 }); glow.position.y = 0.12; glow.material.opacity = 0; glow.renderOrder = 14; this.overlays.add(glow);
    audio.play('label.pop');
    await tweenValue(0, 1, 0.55, (v) => { dot.scale.setScalar(Math.max(0.001, v < 0.6 ? (v / 0.6) * 1.45 : 1.45 - ((v - 0.6) / 0.4) * 0.45)); glow.material.opacity = v < 0.4 ? v * 2.5 : 1 - (v - 0.4) * 0.9; });
    this.oGlow = glow; this.oGlowBase = glow.scale.x;
    W.labels.add('origin', 'O', { className: 'measure origin', worldPos: this.C.clone().setY(0.6), push: dirV(breachDeg + 225) });
    await delay(0.4);
    // 2) one radius, from O out to the wall: r
    const rad0 = ribbon(R, 0.13 * lw, a0, 0xf3ebd8, { dashed: false, opacity: 0.95, y: 0.07, order: 13 }); rad0.scale.x = 0.001; this.overlays.add(rad0);
    audio.play('scan.ping');
    await tweenValue(0, 1, 0.6, (v) => (rad0.scale.x = Math.max(0.001, v)), { ease: Ease.outCubic });
    const tick = new THREE.Mesh(new THREE.PlaneGeometry(0.1 * lw, 0.8 * lw), new THREE.MeshBasicMaterial({ color: 0xf3ebd8, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    const tkp = polar(a0, R - 0.05); tick.position.set(tkp.x, 0.07, tkp.z); tick.rotation.x = -Math.PI / 2; tick.rotation.z = a0 * DEG; tick.renderOrder = 13; this.overlays.add(tick);
    const lp = polar(a0, R * 0.55);
    W.labels.add('radius', `r = ${R} m`, { className: 'measure radius', worldPos: new THREE.Vector3(this.C.x + lp.x, 0.6, this.C.z + lp.z), push: dirV(a0 - 90) });
    audio.play('label.pop');
    await delay(0.5);
    // 3) the radius sweeps through θ, painting the sector: the second radius, the angle at O and the arc grow with it
    const sweeper = ribbon(R, 0.13 * lw, a0, 0xffffff, { dashed: false, opacity: 1, y: 0.075, order: 14 }); this.overlays.add(sweeper);
    this.fill = sectorMesh(R, a0, theta, 0x52ded8, 0.01); const fu = this.fill.material.uniforms; fu.progress.value = 1; fu.reveal.value = 0; fu.opacity.value = 0.32; this.overlays.add(this.fill);
    const ar = Math.max(2.2, R * 0.18);
    const band = (r0, r1, len, color, op) => { const m = new THREE.Mesh(new THREE.RingGeometry(r0, r1, Math.max(8, Math.round(len / 3)), 1, a0 * DEG, Math.max(0.01, len) * DEG), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); m.rotation.x = -Math.PI / 2; m.position.y = 0.06; m.renderOrder = 13; this.overlays.add(m); return m; };
    let arc = null, arcEdge = null;
    const grow = (len) => { for (const m of [arc, arcEdge]) if (m) { this.overlays.remove(m); m.geometry.dispose(); m.material.dispose(); } arc = band(ar, ar + 0.16 * lw, len, 0xffffff, 0.75); arcEdge = band(R - 0.16 * lw, R - 0.02, len, 0x9ff7f2, 0.7); };
    this._sweep = 0;
    W.labels.add('theta', 'θ = 0°', { className: 'measure theta', worldPos: () => { const q = polar(a0 + this._sweep, ar + 0.1 * lw); return this._tv.set(this.C.x + q.x, 0.6, this.C.z + q.z); }, push: dirV(a0 + 90) });
    const thLabel = W.labels.items.get('theta');
    audio.play('scan.sweep');
    await tweenValue(0, theta, 1.6, (v) => {
      this._sweep = v; sweeper.rotation.z = (a0 + v) * DEG; fu.reveal.value = v / theta; grow(v);
      W.labels.set('theta', `θ = ${Math.round(v)}°`); if (thLabel) thLabel.push = dirV(a0 + v + 90);
    }, { ease: Ease.inOutSine });
    sweeper.material.color.setHex(0xf3ebd8); sweeper.material.opacity = 0.95;   // it stays as the second radius
    audio.play('label.pop');
    // 4) focus: the sector stays lit, the rest of the circle dims
    tweens.to(fu.opacity, { value: 0.18 }, { duration: 0.6 });
    const dim = new THREE.Mesh(new THREE.RingGeometry(0.01, R - 0.02, Math.max(24, Math.round((360 - theta) / 3)), 1, a1 * DEG, (360 - theta) * DEG), new THREE.MeshBasicMaterial({ color: 0x050c0a, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
    dim.rotation.x = -Math.PI / 2; dim.position.y = 0.005; dim.renderOrder = 8; this.overlays.add(dim);
    await tweenValue(0, 0.46, 0.5, (v) => (dim.material.opacity = v));
  }
  clearOverlays(fade = true) {
    for (const id of ['theta', 'radius', 'origin']) this.world.labels.remove(id, fade);
    this.pulsing = []; this.oGlow = null;
    const kids = [...this.overlays.children].filter((k) => k.position.y > -1);
    if (!fade) { kids.forEach((k) => this.overlays.remove(k)); this.fill = null; return; }
    kids.forEach((k) => { const mat = k.material; if (!mat) { this.overlays.remove(k); return; } const start = mat.uniforms ? mat.uniforms.opacity.value : mat.opacity; tweenValue(start, 0, 0.5, (v) => { if (mat.uniforms) mat.uniforms.opacity.value = v; else mat.opacity = v; }).then(() => this.overlays.remove(k)); });
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
   * Fire (LXD): 1) the charge sweeps across exactly the wedge the student asked for, painting it (the arc's part cyan,
   * any excess red); 2) slow motion: it reaches the arc and breaks the barrier (onArc: it cracks, then gives way), and
   * radial bolts from O hit every guardian behind the covered part; 3) an overcharged excess hits the wall beside the
   * gap and reflects back at Karan;
   * 4) a ghost comparison stays on the floor until releaseGhost(): the target wedge dashed over a smaller shot / the
   * excess in pulsing red / a gold snap when exact.
   * r: { status, firedTheta, theta, breachDeg }.  cb: { onArc() → resolves when the barrier gives way, targets() →
   * guardians behind the covered arc, kill(bot), onSlowEnd() → the camera back on the whole ring, reflectTo() → where
   * Karan stands, onReflect() }
   */
  async fire(r, cb = {}) {
    const R = this.R, W = this.world, lw = Math.max(1, R / 9);
    const fired = clamp(r.firedTheta, 2, 360), covered = Math.min(fired, r.theta), half = Math.max(0, (fired - r.theta) / 2), start = r.breachDeg - fired / 2;
    audio.play('charge.fire'); const hum = audio.play('laser.loop');
    W.rig.shake(0.35, 0.6); this.fx.flash(this.worldPos(0, 0, 1.2), 0xffffff, 10, 0.5);
    const pieces = [];   // in sweep order: [excess] [the arc's part] [excess]
    if (half > 0.3) pieces.push({ s: start, l: half, c: 0xff3b6b });
    pieces.push({ s: r.breachDeg - covered / 2, l: covered, c: 0x66ddff, main: true });
    if (half > 0.3) pieces.push({ s: r.breachDeg + r.theta / 2, l: half, c: 0xff3b6b });
    for (const p of pieces) { p.m = sectorMesh(R, p.s, p.l, p.c, 0.02); p.m.material.uniforms.progress.value = 1.1; p.m.material.uniforms.reveal.value = 0; this.overlays.add(p.m); this.lasers.push(p.m); }
    // 1) the sweep: a white line crosses the fired wedge and paints it
    const scanLine = ribbon(R, 0.22 * lw, start, 0xffffff, { dashed: false, opacity: 1, y: 0.05, order: 14 }); this.overlays.add(scanLine);
    audio.play('scan.sweep');
    await tweenValue(0, 1, 1.15, (v) => { const a = start + v * fired; scanLine.rotation.z = a * DEG; for (const p of pieces) p.m.material.uniforms.reveal.value = clamp((a - p.s) / p.l, 0, 1); }, { ease: Ease.inOutSine });
    this.overlays.remove(scanLine);
    this.orb.visible = false; this.light.intensity = 40;
    // 2) slow motion: the charge reaches the arc and the barrier breaks; bolts from O to every guardian behind the covered part
    W.timeScale = 0.35;
    if (cb.onArc) await cb.onArc();   // the barrier cracks, then gives way: the bolts go through as it falls
    const targets = (cb.targets ? cb.targets() : []).slice().sort((a, b) => a.deg - b.deg);
    for (const b of targets) {
      const bolt = ribbon(b.r + 0.3, 0.26 * lw, b.deg, 0xe8ffff, { dashed: false, opacity: 1, y: 0.07, order: 14 }); this.overlays.add(bolt);
      cb.kill && cb.kill(b);
      tweenValue(1, 0, 0.3, (v) => (bolt.material.opacity = v)).then(() => this.overlays.remove(bolt));
      await delay(Math.min(0.1, 0.8 / Math.max(1, targets.length)));
    }
    await delay(0.2);
    // 3) any excess hits the wall beside the gap in red (still in slow motion so it can be SEEN)…
    const impact = (startDeg, lenDeg, color) => {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(R - 0.15, R - 0.15, 2.4, Math.max(8, Math.round(lenDeg / 2)), 1, true, startDeg * DEG + Math.PI / 2, lenDeg * DEG), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      m.position.y = 0.7; this.overlays.add(m); tweenValue(1, 0, 0.9, (v) => (m.material.opacity = v)).then(() => this.overlays.remove(m));
    };
    if (half > 0.3) { impact(start, half, 0xff4f7a); impact(r.breachDeg + r.theta / 2, half, 0xff4f7a); }
    await delay(half > 0.3 ? 0.45 : 0.15);   // (the slow motion holds for the red excess; nothing more to see without one)
    W.timeScale = 1;
    const back = cb.onSlowEnd && cb.onSlowEnd();
    if (half > 0.3 && back) await back;      // the reflection must be seen from above: Karan in the frame
    // …and reflects back at Karan (he takes the hit where he stands)
    if (half > 0.3) {
      audio.play('reflect.zap');
      const to = cb.reflectTo ? cb.reflectTo().sub(this.C) : new THREE.Vector3();
      const beams = [start + half / 2, r.breachDeg + r.theta / 2 + half / 2].map((deg) => {
        const from = polar(deg, R - 0.3), a = new THREE.Vector3(from.x, 0.6, from.z), b = new THREE.Vector3(to.x, 0.6, to.z);
        const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 5, 10), new THREE.MeshBasicMaterial({ color: 0xff5a8a, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false }));
        rod.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
        const head = makeBillboard('fx_glow', 2.4, { additive: true, tint: 0xff7aa8, centerY: 0.5 });
        const g = new THREE.Group(); g.add(rod, head); g.position.copy(a); this.overlays.add(g);
        return { g, a, b };
      });
      await tweenValue(0, 1, 0.5, (e) => beams.forEach((k) => k.g.position.lerpVectors(k.a, k.b, e)), { ease: Ease.inQuad });
      beams.forEach((k) => this.overlays.remove(k.g));
      cb.onReflect && cb.onReflect();
    }
    hum && hum.stop(0.5);
    // 4) the ghost comparison (LXD): it stays until releaseGhost()
    const main = pieces.find((p) => p.main).m;
    if (r.status === 'under') this.dashedWedge(R, r.breachDeg - r.theta / 2, r.theta, 0xffd36b, lw);
    else if (r.status === 'over') this.pulsing = pieces.filter((p) => !p.main).map((p) => p.m);
    else {
      main.material.uniforms.color.value.set(0xffd36b); main.material.uniforms.opacity.value = 1.2;
      this.fx.flash(this.worldPos(r.breachDeg, R * 0.5, 1.0), 0xffe9a0, 14, 0.6);
      main.scale.setScalar(1.08); tweens.to(main.scale, { x: 1, y: 1, z: 1 }, { duration: 0.45, ease: Ease.outBack });
    }
    this.chargeLevel = 0;
    tweenValue(1, 0, 0.5, (v) => { this.orb.material.opacity = v; }).then(() => { this.orb.visible = false; });
    tweenValue(this.light.intensity, 0, 0.8, (v) => { this.light.intensity = v; });
    if (this.oGlow) { const g = this.oGlow, s0 = g.scale.x, s1 = this.oGlowBase; tweenValue(0, 1, 0.6, (e) => g.scale.setScalar(s0 + (s1 - s0) * e)); }
  }
  /** Fade the ghost comparison (the fired wedge, the dashed target, the red excess). The construction stays. */
  releaseGhost(dur = 0.6) {
    this.pulsing = [];
    const ghosts = [...this.lasers, ...this.overlays.children.filter((k) => k.userData.ghost)]; this.lasers = [];   // only the comparison: the construction (O, radii, θ) stays
    ghosts.forEach((k) => { const mat = k.material; const s0 = mat.uniforms ? mat.uniforms.opacity.value : mat.opacity; tweenValue(s0, 0, dur, (v) => { if (mat.uniforms) mat.uniforms.opacity.value = v; else mat.opacity = v; }).then(() => this.overlays.remove(k)); });
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
