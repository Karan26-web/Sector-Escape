// ---------------------------------------------------------------------------
// The Sector Laser Gun: buried under a stone hatch at the arena centre, rises
// when Karan reaches it, scans the open arc (θ, r overlays at low opacity),
// fires the sector laser (exact / undercharged / overcharged + reflections).
// Everything is positioned relative to the current arena centre `C`.
// ---------------------------------------------------------------------------
import * as THREE from '../../vendor/three.module.js';
import { makeBillboard, makeShadow } from '../engine/sprites.js';
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

export class Cannon {
  constructor(world, fx) {
    this.world = world; this.fx = fx; this.R = 14; this.C = new THREE.Vector3();
    this.group = new THREE.Group(); world.add(this.group);
    this.lift = new THREE.Group(); this.group.add(this.lift);                          // everything that rises out of the hatch shaft
    // stone drum with a bronze rim: the floor section the gun stands on (flush with the floor when risen)
    const PH = 0.42, stoneTex = assets.texture('arena_wall', {}).clone(); stoneTex.needsUpdate = true; stoneTex.repeat.set(2.2, 0.14);
    // drum top = a raised piece of the arena floor: the centre of the floor art (its compass medallion ends up under the
    // cannon's pedestal, flagstone rings show around it). Only seen in 3/4 shots; the top-down decal covers it.
    const topTex = assets.texture('arena_floor', { wrap: false }).clone(); topTex.needsUpdate = true; topTex.repeat.set(0.36, 0.36); topTex.offset.set(0.32, 0.32);
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.55, 3.8 + PH, 40), [new THREE.MeshLambertMaterial({ map: stoneTex, color: 0x9a9484 }), new THREE.MeshLambertMaterial({ map: topTex, color: 0xa8a290 }), new THREE.MeshLambertMaterial({ color: 0x2a2822 })]);
    drum.position.y = PH - (3.8 + PH) / 2; this.lift.add(drum);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(1.52, 0.08, 8, 64), new THREE.MeshLambertMaterial({ color: 0xb98a44, emissive: 0x3a2408 })); rim.rotation.x = Math.PI / 2; rim.position.y = PH; this.lift.add(rim); this.rim = rim;
    this.shadow = makeShadow(0.8, 0.8); this.shadow.position.y = PH + 0.02; this.lift.add(this.shadow);
    // 3/4 view (low arena shots): the upright cannon, about Karan's height (1.8 m tall, ~2 m wide) so it reads as a device
    // standing on the drum, not a monument; its painted pedestal (Ø ≈ 1.02 h) sits inside the 3 m drum with a stone margin.
    // The top-down decal keeps its own size (3.2 m), which already reads right from above.
    this.PH = PH; this.bodyH = 1.8;
    this.body = makeBillboard('cannon', this.bodyH); this.body.position.y = PH - 0.03; this.lift.add(this.body);
    this.glow = makeBillboard('fx_glow', 0.85, { additive: true, tint: 0x52ded8, centerY: 0.5 }); this.glow.position.y = PH + 0.9; this.glow.material.opacity = 0.35; this.lift.add(this.glow);
    this.ring = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.05, 8, 64), new THREE.MeshBasicMaterial({ color: 0x52ded8, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.ring.rotation.x = Math.PI / 2; this.ring.position.y = PH + 0.03; this.ring.visible = false; this.lift.add(this.ring);   // the cannon art carries its own glowing ring
    // top-down view (puzzle mode): the painted top-down cannon lies on the drum, barrel aimed at the open arc
    this.topTex = assets.texture('cannon_top', { wrap: false });
    const cs = assets.texture('cannon_top_charge', { wrap: false }); this.chargeTex = cs.clone(); this.chargeTex.needsUpdate = true; this.chargeTex.repeat.set(1 / 5, 1);
    // LXD: from above the cannon is a slim crystal piece (half its old 3.2 m) so the centre O and the radius lines read
    const dg = new THREE.PlaneGeometry(1.6, 1.6); dg.rotateX(-Math.PI / 2);
    this.decal = new THREE.Mesh(dg, new THREE.MeshBasicMaterial({ map: this.topTex, transparent: true, alphaTest: 0.04, depthWrite: false, opacity: 0 }));
    this.decal.position.y = PH + 0.04; this.decal.renderOrder = 12; this.lift.add(this.decal);
    const ot = assets.texture('cannon_orbs', { wrap: false }); this.orbTex = ot.clone(); this.orbTex.needsUpdate = true; this.orbTex.repeat.set(1 / 4, 1);
    this.orb = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.orbTex, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, opacity: 0 }));
    this.orb.renderOrder = 14; this.orb.visible = false; this.lift.add(this.orb);
    this.topW = 0;   // 0 = 3/4 sprite, 1 = top-down decal (driven by camera elevation)
    this.light = new THREE.PointLight(0x52ded8, 12, 12, 2); this.light.position.y = PH + 1.15; this.lift.add(this.light);
    this.beacon = new THREE.Object3D(); // kept for API compatibility (the hatch ring is the cue now)
    this.overlays = new THREE.Group(); world.add(this.overlays); this.pulsing = [];   // puzzle overlays: drawn just above the drum + top-down cannon
    this.lasers = []; this.active = false; this.spin = 0.6; this.t = 0; this.chargeLevel = 0; this.risen = false;
    this.lift.position.y = -4.4; this.lift.visible = false;
    const warm = sectorMesh(14, 0, 10, 0x66ddff); warm.material.uniforms.opacity.value = 0; warm.position.y = -5; this.overlays.add(warm); // shader warm-up
  }
  /** Park the (buried) gun at an arena centre. */
  setArena(a) {
    this.C.set(a.center.x, 0, a.center.z); this.R = a.R; this.group.position.copy(this.C); this.overlays.position.copy(this.C); this.overlays.position.y = this.PH + 0.1;
    const e = a.exitDeg * DEG; this.decal.rotation.y = Math.atan2(Math.cos(e), -Math.sin(e));   // texture-down (+Z) → exit direction
    const m = polar(a.exitDeg, 0.42); this.orb.position.set(m.x, 0.6, m.z);
    this.reset();
  }
  reset() {
    this.clearOverlays(false); this.lasers = [];
    this.lift.position.y = -4.4; this.lift.visible = false; this.risen = false; this.active = false; this.chargeLevel = 0; this.spin = 0.6;
    this.glow.material.opacity = 0.35; this.glow.scale.setScalar(0.85); this.glow.material.color.setHex(0x52ded8); this.light.intensity = 12;
    this.decal.material.map = this.topTex; this.orb.visible = false; this.orb.material.opacity = 0;
  }
  setBeacon() {}
  worldPos(deg, r, y = 0) { const p = polar(deg, r); return new THREE.Vector3(this.C.x + p.x, y, this.C.z + p.z); }

  /** The gun rises out of the opened hatch. */
  async rise(dur = 1.1) {
    this.lift.visible = true; this.risen = true; audio.play('gun.rise'); this.world.rig.shake(0.12, dur);
    this.fx.dust(this.C.clone(), 6, 0xd8d0b8, 1.3);
    await tweenValue(-4.4, 0, dur, (v) => { this.lift.position.y = v; }, { ease: Ease.outCubic });
    this.fx.shockwave(this.C.clone(), 4.5, 0.5, 0x7fe6ff); this.world.rig.shake(0.22, 0.3);
  }
  async activate() {
    this.active = true; audio.play('cannon.activate');
    this.world.rig.shake(0.1, 0.6);
    await tweenValue(0, 1, 1.2, (v) => { this.spin = 0.6 + v * 5; this.glow.material.opacity = 0.55 + v * 0.45; this.glow.scale.setScalar(2.2 + v * 0.6); this.light.intensity = 12 + v * 30; }, { ease: Ease.outCubic });
    this.fx.shockwave(this.C.clone(), this.R * 1.05, 0.9, 0x7fe6ff);
    this.fx.flash(this.worldPos(0, 0, 2.4), 0x9ff4ff, 6, 0.5);
  }

  /** Scan sweep, then the textbook construction ON TOP of the cannon (LXD): centre O, both radius lines from O to the
   *  wall, the arc, the angle θ at O, and r measured along one radius. Labels sit beside their lines, never on them. */
  async scan({ breachDeg, theta }) {
    const R = this.R, W = this.world, lw = Math.max(1, R / 9);   // overlay line widths grow with the ring so they stay crisp from the puzzle camera
    const sweep = sectorMesh(R, 0, 22, 0x7fe6ff, 0.03); sweep.material.uniforms.progress.value = 1; sweep.material.uniforms.opacity.value = 0.45; this.overlays.add(sweep);
    audio.play('scan.sweep');
    await tweenValue(0, 1, 1.15, (v) => { sweep.rotation.z = -(v * 360 * DEG) + (breachDeg - theta / 2 - 11) * DEG; }, { ease: Ease.inOutSine });
    this.overlays.remove(sweep);
    const a0 = breachDeg - theta / 2, a1 = breachDeg + theta / 2;
    const dim = new THREE.Mesh(new THREE.RingGeometry(0.01, R - 0.02, Math.max(24, Math.round((360 - theta) / 3)), 1, a1 * DEG, (360 - theta) * DEG), new THREE.MeshBasicMaterial({ color: 0x050c0a, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
    dim.rotation.x = -Math.PI / 2; dim.position.y = 0.005; dim.renderOrder = 8; this.overlays.add(dim); tweens.to(dim.material, { opacity: 0.46 }, { duration: 0.6 });
    // centre O: a bright dot exactly at the centre, over the cannon
    const dot = new THREE.Mesh(new THREE.CircleGeometry(0.2 * lw, 28), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false }));
    const halo = new THREE.Mesh(new THREE.RingGeometry(0.27 * lw, 0.37 * lw, 32), new THREE.MeshBasicMaterial({ color: 0x7fe6ff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
    for (const m of [dot, halo]) { m.rotation.x = -Math.PI / 2; m.position.y = 0.09; m.renderOrder = 15; this.overlays.add(m); }
    W.labels.add('origin', 'O', { className: 'measure origin', worldPos: this.C.clone().setY(0.6), push: dirV(breachDeg + 225) });
    const lines = [a0, a1].map((d) => { const m = ribbon(R, 0.14 * lw, d, 0xc8faf6, { dashed: false, opacity: 0.8, y: 0.06, order: 13 }); m.scale.x = 0.001; this.overlays.add(m); return m; });
    audio.play('scan.ping');
    await tweenValue(0, 1, 0.6, (v) => lines.forEach((m) => (m.scale.x = Math.max(0.001, v))), { ease: Ease.outCubic });
    this.fill = sectorMesh(R, a0, theta, 0x52ded8, 0.01); this.fill.material.uniforms.progress.value = 1; this.fill.material.uniforms.opacity.value = 0; this.overlays.add(this.fill);
    tweens.to(this.fill.material.uniforms.opacity, { value: 0.16 }, { duration: 0.8 });
    const arcEdge = new THREE.Mesh(new THREE.RingGeometry(R - 0.16 * lw, R - 0.02, Math.max(12, Math.round(theta / 2)), 1, a0 * DEG, theta * DEG), new THREE.MeshBasicMaterial({ color: 0x9ff7f2, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    arcEdge.rotation.x = -Math.PI / 2; arcEdge.position.y = 0.06; arcEdge.renderOrder = 13; this.overlays.add(arcEdge); tweens.to(arcEdge.material, { opacity: 0.7 }, { duration: 0.6 });
    // central angle at O: a small arc + its label outside the sector beside the arc's end (never on the guardians)
    const ar = Math.max(2.2, R * 0.18);
    let arc = null; const mkArc = (len) => { if (arc) { this.overlays.remove(arc); arc.geometry.dispose(); } arc = new THREE.Mesh(new THREE.RingGeometry(ar, ar + 0.16 * lw, Math.max(8, Math.round(len / 3)), 1, a0 * DEG, Math.max(0.01, len) * DEG), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); arc.rotation.x = -Math.PI / 2; arc.position.y = 0.06; arc.renderOrder = 13; this.overlays.add(arc); };
    const tp = polar(a1, ar + 0.1 * lw);
    W.labels.add('theta', 'θ = 0°', { className: 'measure theta', worldPos: new THREE.Vector3(this.C.x + tp.x, 0.6, this.C.z + tp.z), push: dirV(a1 + 90) });
    audio.play('label.pop');
    await tweenValue(0, theta, 0.55, (v) => { mkArc(v); W.labels.set('theta', `θ = ${Math.round(v)}°`); }, { ease: Ease.outCubic });
    // r along the first radius, from O to the wall; its label sits beside the line (LXD), not on it
    const rl = ribbon(R, 0.12 * lw, a0, 0xf3ebd8, { dashed: false, opacity: 0.9, y: 0.07, order: 13 }); rl.scale.x = 0.001; this.overlays.add(rl);
    const tick = (r) => { const t = new THREE.Mesh(new THREE.PlaneGeometry(0.1 * lw, 0.8 * lw), new THREE.MeshBasicMaterial({ color: 0xf3ebd8, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); const p = polar(a0, r); t.position.set(p.x, 0.07, p.z); t.rotation.x = -Math.PI / 2; t.rotation.z = a0 * DEG; t.renderOrder = 13; this.overlays.add(t); return t; };
    const t2 = tick(R - 0.05); t2.visible = false;
    audio.play('scan.ping');
    await tweenValue(0, 1, 0.6, (v) => (rl.scale.x = Math.max(0.001, v)), { ease: Ease.outCubic });
    t2.visible = true;
    const lp = polar(a0, R * 0.55);
    W.labels.add('radius', `r = ${R} m`, { className: 'measure radius', worldPos: new THREE.Vector3(this.C.x + lp.x, 0.6, this.C.z + lp.z), push: dirV(a0 - 90) });
    audio.play('label.pop');
  }
  clearOverlays(fade = true) {
    for (const id of ['theta', 'radius', 'origin']) this.world.labels.remove(id, fade);
    this.pulsing = []; this.ghost = null;
    const kids = [...this.overlays.children].filter((k) => k.position.y > -1);
    if (!fade) { kids.forEach((k) => this.overlays.remove(k)); this.fill = null; return; }
    kids.forEach((k) => { const mat = k.material; if (!mat) { this.overlays.remove(k); return; } const start = mat.uniforms ? mat.uniforms.opacity.value : mat.opacity; tweenValue(start, 0, 0.5, (v) => { if (mat.uniforms) mat.uniforms.opacity.value = v; else mat.opacity = v; }).then(() => this.overlays.remove(k)); });
    this.fill = null;
  }

  async charge() {
    audio.play('cannon.charge'); this.world.rig.shake(0.05, 1.1);
    this.decal.material.map = this.chargeTex; this.orb.visible = true;
    await tweenValue(0, 1, 1.1, (v) => {
      this.chargeLevel = v; this.spin = 5 + v * 30; this.glow.material.opacity = 0.35 + v * 0.45; this.glow.scale.setScalar(0.85 + v * 1.25); this.light.intensity = 40 + v * 120; this.glow.material.color.setHSL(0.52 - v * 0.05, 1, 0.6 + v * 0.35);
      this.chargeTex.offset.x = Math.min(4, Math.floor(v * 5)) / 5;                     // 5 painted frames: core lights → beam stub
      const of = Math.min(3, Math.floor(v * 4)); this.orbTex.offset.x = of / 4;        // 4 painted orbs: spark → full charge ring
      this.orb.material.opacity = Math.min(1, v * 2.5); this.orb.scale.setScalar(0.6 + v * 1.4);
    }, { ease: Ease.inQuad });
  }
  /** Gold dashed outline of a wedge (the TARGET, drawn over a smaller undercharged shot). */
  dashedWedge(R, startDeg, lenDeg, color, lw) {
    const out = [], mat = () => new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1, depthWrite: false, side: THREE.DoubleSide });
    for (const d of [startDeg, startDeg + lenDeg]) { const m = ribbon(R, 0.16 * lw, d, color, { dashed: true, opacity: 1, y: 0.08, order: 14 }); out.push(m); }
    const n = Math.max(6, Math.round((lenDeg * DEG * R) / (1.1 * lw))), step = lenDeg / n;
    for (let k = 0; k < n; k++) { const m = new THREE.Mesh(new THREE.RingGeometry(R - 0.2 * lw, R - 0.04 * lw, 6, 1, (startDeg + k * step) * DEG, step * 0.6 * DEG), mat()); m.rotation.x = -Math.PI / 2; m.position.y = 0.08; m.renderOrder = 14; out.push(m); }
    out.forEach((m) => this.overlays.add(m)); return out;
  }
  /**
   * Fire (LXD): 1) a scan line sweeps across exactly the wedge the student asked for, painting it (the arc part cyan,
   * any excess red); 2) slow motion: radial bolts from O to every guardian inside the covered wedge; 3) the beam hits the
   * wall (slow motion), an overcharged excess reflects back at Karan; 4) a ghost comparison stays on the floor until
   * releaseGhost(): target wedge dashed over your smaller wedge / the excess in pulsing red / a gold snap when exact.
   * r: { status, firedTheta, theta, breachDeg, excessTheta }.  cb: { targets() → guardians in the covered wedge, kill(bot), onReflect() }
   */
  async fire(r, cb = {}) {
    const R = this.R, W = this.world, lw = Math.max(1, R / 9);
    const fired = clamp(r.firedTheta, 2, 360), covered = Math.min(fired, r.theta), half = Math.max(0, (fired - r.theta) / 2), start = r.breachDeg - fired / 2;
    audio.play('cannon.fire'); const hum = audio.play('laser.loop');
    W.rig.shake(0.35, 0.6); this.fx.flash(this.worldPos(0, 0, 1.6), 0xffffff, 10, 0.5);
    const pieces = [];   // in sweep order: [excess] [the arc's part] [excess]
    if (half > 0.3) pieces.push({ s: start, l: half, c: 0xff3b6b });
    pieces.push({ s: r.breachDeg - covered / 2, l: covered, c: 0x66ddff, main: true });
    if (half > 0.3) pieces.push({ s: r.breachDeg + r.theta / 2, l: half, c: 0xff3b6b });
    for (const p of pieces) { p.m = sectorMesh(R, p.s, p.l, p.c, 0.02); p.m.material.uniforms.progress.value = 1.1; p.m.material.uniforms.reveal.value = 0; this.overlays.add(p.m); this.lasers.push(p.m); }
    // 1) the scan: a white line sweeps across the fired wedge and paints it
    const scanLine = ribbon(R, 0.22 * lw, start, 0xffffff, { dashed: false, opacity: 1, y: 0.05, order: 14 }); this.overlays.add(scanLine);
    audio.play('scan.sweep');
    await tweenValue(0, 1, 1.15, (v) => { const a = start + v * fired; scanLine.rotation.z = a * DEG; for (const p of pieces) p.m.material.uniforms.reveal.value = clamp((a - p.s) / p.l, 0, 1); }, { ease: Ease.inOutSine });
    this.overlays.remove(scanLine);
    // 2) slow motion: radial bolts from O to every guardian inside the covered wedge
    W.timeScale = 0.35;
    const targets = (cb.targets ? cb.targets() : []).slice().sort((a, b) => a.deg - b.deg);
    for (const b of targets) {
      const bolt = ribbon(b.r, 0.26 * lw, b.deg, 0xe8ffff, { dashed: false, opacity: 1, y: 0.07, order: 14 }); this.overlays.add(bolt);
      cb.kill && cb.kill(b);
      tweenValue(1, 0, 0.3, (v) => (bolt.material.opacity = v)).then(() => this.overlays.remove(bolt));
      await delay(Math.min(0.1, 0.8 / Math.max(1, targets.length)));
    }
    await delay(0.2);
    // 3) the wall: the arc flashes; any excess hits the wall in red (still in slow motion so it can be SEEN)
    const impact = (startDeg, lenDeg, color) => {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(R - 0.15, R - 0.15, 2.4, Math.max(8, Math.round(lenDeg / 2)), 1, true, startDeg * DEG + Math.PI / 2, lenDeg * DEG), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      m.position.y = 0.7; this.overlays.add(m); tweenValue(1, 0, 0.9, (v) => (m.material.opacity = v)).then(() => this.overlays.remove(m));
    };
    impact(r.breachDeg - covered / 2, covered, 0xbff6ff); W.rig.shake(0.3, 0.4);
    if (half > 0.3) { impact(start, half, 0xff4f7a); impact(r.breachDeg + r.theta / 2, half, 0xff4f7a); }
    await delay(0.5);
    W.timeScale = 1;
    // overcharged: the excess reflects back at Karan
    if (half > 0.3) {
      audio.play('reflect.zap');
      const beams = [start + half / 2, r.breachDeg + r.theta / 2 + half / 2].map((deg) => {
        const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 5, 10), new THREE.MeshBasicMaterial({ color: 0xff5a8a, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false }));
        rod.rotation.z = Math.PI / 2; rod.rotation.y = deg * DEG;
        const head = makeBillboard('fx_glow', 2.4, { additive: true, tint: 0xff7aa8, centerY: 0.5 });
        const g = new THREE.Group(); g.add(rod, head); g.position.y = 0.6; this.overlays.add(g);
        return { g, deg };
      });
      await tweenValue(R, 0, 0.55, (rv) => beams.forEach((b) => { const p = polar(b.deg, rv); b.g.position.set(p.x, 0.6, p.z); }), { ease: Ease.inQuad });
      beams.forEach((b) => this.overlays.remove(b.g));
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
    tweenValue(1, 0, 0.5, (v) => { this.orb.material.opacity = v; }).then(() => { this.orb.visible = false; this.decal.material.map = this.topTex; this.chargeTex.offset.x = 0; });
    tweens.to(this.glow.material, { opacity: 0.5 }, { duration: 0.6 }); tweens.add({ duration: 0.8, onUpdate: (e) => { this.glow.scale.setScalar(2.1 - e * 1.25); this.light.intensity = 160 - e * 120; this.spin = 35 - e * 30; this.glow.material.color.setHSL(0.52, 1, 0.6); } });
  }
  /** Fade the ghost comparison (the fired wedge, the dashed target, the red excess). The scan overlays stay. */
  releaseGhost(dur = 0.6) {
    this.pulsing = [];
    const ghosts = [...this.lasers, ...this.overlays.children.filter((k) => k.renderOrder === 14 && k.material && !k.material.uniforms)]; this.lasers = [];
    ghosts.forEach((k) => { const mat = k.material; const s0 = mat.uniforms ? mat.uniforms.opacity.value : mat.opacity; tweenValue(s0, 0, dur, (v) => { if (mat.uniforms) mat.uniforms.opacity.value = v; else mat.opacity = v; }).then(() => this.overlays.remove(k)); });
  }
  pulse() { audio.play('pulse'); this.fx.shockwave(this.C.clone(), this.R + 2, 0.8, 0xbff6ff); this.fx.flash(this.worldPos(0, 0, 1.1), 0x9ff4ff, 8, 0.5); this.world.rig.shake(0.3, 0.4); }

  update(dt, t) {
    this.t = t; this.ring.rotation.z += dt * this.spin;
    const cam = this.world.camera.position, elev = Math.atan2(cam.y - this.lift.position.y, Math.hypot(cam.x - this.C.x, cam.z - this.C.z)) / DEG;
    const w = Math.min(1, Math.max(0, (elev - 52) / 16)); this.topW += (w - this.topW) * Math.min(1, dt * 8);
    const k = this.topW;
    this.rim.visible = k < 0.5;
    for (const m of this.pulsing) m.material.uniforms.opacity.value = 0.95 + 0.35 * Math.sin(t * 8);
    this.body.material.opacity = 1 - k; this.body.visible = k < 0.98; this.shadow.visible = k < 0.98;
    if (this.body.visible) {
      // a flat card at the drum centre leaves the painted pedestal hovering behind an empty disc. Stand the card toward
      // the camera by the depth at which the art's pedestal centre (0.256 h above the card's bottom) lands on the drum
      // centre for this camera elevation, capped at the pedestal's front edge (0.51 h)
      const hx = cam.x - this.C.x, hz = cam.z - this.C.z, hl = Math.hypot(hx, hz) || 1, el = Math.atan2(cam.y - this.PH, hl);
      const d = clamp((0.256 * this.bodyH) / Math.tan(Math.max(0.09, el)), 0.3, 0.51 * this.bodyH);
      this.body.position.set((hx / hl) * d, this.PH - 0.03, (hz / hl) * d); this.shadow.position.set((hx / hl) * d * 0.55, this.PH + 0.02, (hz / hl) * d * 0.55);
    }
    this.decal.material.opacity = k; this.decal.visible = k > 0.02;
    this.ring.material.opacity = (0.3 + Math.sin(t * 3) * 0.1 + this.chargeLevel * 0.4) * (1 - k);
    if (!this.chargeLevel && this.risen) this.glow.material.opacity = ((this.active ? 0.5 : 0.35) + Math.sin(t * 2.2) * 0.08) * (1 - 0.6 * k);
    this.beacon.rotation.y = t * 0.4;
    for (const l of this.lasers) if (l.material.uniforms) l.material.uniforms.time.value = t;
    if (this.fill) this.fill.material.uniforms.time.value = t;
  }
}
