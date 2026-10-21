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
uniform vec3 color; uniform float progress; uniform float radius; uniform float thetaStart; uniform float thetaLength; uniform float time; uniform float opacity; uniform float edgeW;
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
  float alpha = front * (core * stripes * (0.5 + 0.5 * edgeGlow)) + frontGlow * 1.3;
  vec3 col = mix(color, vec3(1.0), clamp(edgeGlow * 0.55 + frontGlow * 0.8, 0.0, 1.0));
  gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0) * opacity);
}`;

export function sectorMesh(R, startDeg, lengthDeg, color, y = 0.07) {
  const segs = Math.max(12, Math.round(lengthDeg / 2));
  const geo = new THREE.RingGeometry(0.001, R, segs, 1, startDeg * DEG, lengthDeg * DEG);
  const mat = new THREE.ShaderMaterial({ vertexShader: SECTOR_VERT, fragmentShader: SECTOR_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { color: { value: new THREE.Color(color) }, progress: { value: 0 }, radius: { value: R }, thetaStart: { value: startDeg * DEG }, thetaLength: { value: lengthDeg * DEG }, time: { value: 0 }, opacity: { value: 1 }, edgeW: { value: clamp(3 / lengthDeg, 0.03, 0.2) } } });
  const m = new THREE.Mesh(geo, mat); m.rotation.x = -Math.PI / 2; m.position.y = y; m.renderOrder = 10; return m;
}
function dashTexture() {
  if (dashTexture.t) return dashTexture.t;
  const c = document.createElement('canvas'); c.width = 256; c.height = 16; const g = c.getContext('2d');
  g.fillStyle = '#fff'; for (let x = 0; x < 256; x += 32) g.fillRect(x, 0, 20, 16);
  const t = new THREE.CanvasTexture(c); t.wrapS = THREE.RepeatWrapping; dashTexture.t = t; return t;
}
/** Flat ribbon from the centre outward along `deg`; grows with scale.x. */
function ribbon(length, width, deg, color, { dashed = true, opacity = 0.55, y = 0.09 } = {}) {
  const geo = new THREE.PlaneGeometry(length, width); geo.translate(length / 2, 0, 0);
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  if (dashed) { const t = dashTexture().clone(); t.needsUpdate = true; t.repeat.set(length / 1.2, 1); mat.map = t; }
  const m = new THREE.Mesh(geo, mat); m.rotation.x = -Math.PI / 2; m.rotation.z = deg * DEG; m.position.y = y; m.renderOrder = 9; return m;
}

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
    const rim = new THREE.Mesh(new THREE.TorusGeometry(1.52, 0.08, 8, 64), new THREE.MeshLambertMaterial({ color: 0xb98a44, emissive: 0x3a2408 })); rim.rotation.x = Math.PI / 2; rim.position.y = PH; this.lift.add(rim);
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
    const dg = new THREE.PlaneGeometry(3.2, 3.2); dg.rotateX(-Math.PI / 2);
    this.decal = new THREE.Mesh(dg, new THREE.MeshBasicMaterial({ map: this.topTex, transparent: true, alphaTest: 0.04, depthWrite: false, opacity: 0 }));
    this.decal.position.y = PH + 0.04; this.decal.renderOrder = 12; this.lift.add(this.decal);
    const ot = assets.texture('cannon_orbs', { wrap: false }); this.orbTex = ot.clone(); this.orbTex.needsUpdate = true; this.orbTex.repeat.set(1 / 4, 1);
    this.orb = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.orbTex, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, opacity: 0 }));
    this.orb.renderOrder = 14; this.orb.visible = false; this.lift.add(this.orb);
    this.topW = 0;   // 0 = 3/4 sprite, 1 = top-down decal (driven by camera elevation)
    this.light = new THREE.PointLight(0x52ded8, 12, 12, 2); this.light.position.y = PH + 1.15; this.lift.add(this.light);
    this.beacon = new THREE.Object3D(); // kept for API compatibility (the hatch ring is the cue now)
    this.overlays = new THREE.Group(); world.add(this.overlays);
    this.lasers = []; this.active = false; this.spin = 0.6; this.t = 0; this.chargeLevel = 0; this.risen = false;
    this.lift.position.y = -4.4; this.lift.visible = false;
    const warm = sectorMesh(14, 0, 10, 0x66ddff); warm.material.uniforms.opacity.value = 0; warm.position.y = -5; this.overlays.add(warm); // shader warm-up
  }
  /** Park the (buried) gun at an arena centre. */
  setArena(a) {
    this.C.set(a.center.x, 0, a.center.z); this.R = a.R; this.group.position.copy(this.C); this.overlays.position.copy(this.C);
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

  /** Scan sweep → two low-opacity radial lines to the arc ends → θ near the centre, r along one radial line. */
  async scan({ breachDeg, theta }) {
    const R = this.R, W = this.world, lw = Math.max(1, R / 9);   // overlay line widths grow with the ring so they stay crisp from the puzzle camera
    const sweep = sectorMesh(R, 0, 22, 0x7fe6ff, 0.1); sweep.material.uniforms.progress.value = 1; sweep.material.uniforms.opacity.value = 0.45; this.overlays.add(sweep);
    audio.play('scan.sweep');
    await tweenValue(0, 1, 1.15, (v) => { sweep.rotation.z = -(v * 360 * DEG) + (breachDeg - theta / 2 - 11) * DEG; }, { ease: Ease.inOutSine });
    this.overlays.remove(sweep);
    const a0 = breachDeg - theta / 2, a1 = breachDeg + theta / 2;
    const dim = new THREE.Mesh(new THREE.RingGeometry(0.01, R - 0.02, Math.max(24, Math.round((360 - theta) / 3)), 1, a1 * DEG, (360 - theta) * DEG), new THREE.MeshBasicMaterial({ color: 0x050c0a, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
    dim.rotation.x = -Math.PI / 2; dim.position.y = 0.055; dim.renderOrder = 8; this.overlays.add(dim); tweens.to(dim.material, { opacity: 0.46 }, { duration: 0.6 });
    const lines = [a0, a1].map((d) => { const m = ribbon(R, 0.14 * lw, d, 0xc8faf6, { dashed: false, opacity: 0.6 }); m.scale.x = 0.001; this.overlays.add(m); return m; });
    audio.play('scan.ping');
    await tweenValue(0, 1, 0.6, (v) => lines.forEach((m) => (m.scale.x = Math.max(0.001, v))), { ease: Ease.outCubic });
    this.fill = sectorMesh(R, a0, theta, 0x52ded8, 0.05); this.fill.material.uniforms.progress.value = 1; this.fill.material.uniforms.opacity.value = 0; this.overlays.add(this.fill);
    tweens.to(this.fill.material.uniforms.opacity, { value: 0.16 }, { duration: 0.8 });
    const arcEdge = new THREE.Mesh(new THREE.RingGeometry(R - 0.16 * lw, R - 0.02, Math.max(12, Math.round(theta / 2)), 1, a0 * DEG, theta * DEG), new THREE.MeshBasicMaterial({ color: 0x9ff7f2, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    arcEdge.rotation.x = -Math.PI / 2; arcEdge.position.y = 0.1; this.overlays.add(arcEdge); tweens.to(arcEdge.material, { opacity: 0.7 }, { duration: 0.6 });
    // central angle: a small arc at the vertex (just outside the gun) + its label OUTSIDE the sector beside the arc's end,
    // mirroring the r label on the other edge, so no label ever sits on top of the guardians standing inside the arc
    const ar = Math.max(2.6, R * 0.2);
    let arc = null; const mkArc = (len) => { if (arc) { this.overlays.remove(arc); arc.geometry.dispose(); } arc = new THREE.Mesh(new THREE.RingGeometry(ar, ar + 0.16 * lw, Math.max(8, Math.round(len / 3)), 1, a0 * DEG, Math.max(0.01, len) * DEG), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); arc.rotation.x = -Math.PI / 2; arc.position.y = 0.1; this.overlays.add(arc); };
    const tp = polar(a1, ar + 0.3), toff = polar(a1 + 90, Math.max(1.6, R * 0.09) + 0.6);
    W.labels.add('theta', 'θ = 0°', { className: 'measure theta', worldPos: new THREE.Vector3(this.C.x + tp.x + toff.x, 0.4, this.C.z + tp.z + toff.z) });
    audio.play('label.pop');
    await tweenValue(0, theta, 0.55, (v) => { mkArc(v); W.labels.set('theta', `θ = ${Math.round(v)}°`); }, { ease: Ease.outCubic });
    // radius along the first radial line
    const rl = ribbon(R, 0.12 * lw, a0, 0xf3ebd8, { dashed: false, opacity: 0.85, y: 0.11 }); rl.scale.x = 0.001; this.overlays.add(rl);
    const tick = (r) => { const t = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 1.0), new THREE.MeshBasicMaterial({ color: 0xf3ebd8, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); const p = polar(a0, r); t.position.set(p.x, 0.11, p.z); t.rotation.x = -Math.PI / 2; t.rotation.z = a0 * DEG; this.overlays.add(t); return t; };
    tick(0.05); const t2 = tick(R - 0.05); t2.visible = false;
    audio.play('scan.ping');
    await tweenValue(0, 1, 0.6, (v) => (rl.scale.x = Math.max(0.001, v)), { ease: Ease.outCubic });
    t2.visible = true;
    const lp = polar(a0, R * 0.55), off = polar(a0 - 90 * Math.sign(theta < 180 ? 1 : 1), Math.max(1.6, R * 0.09));
    W.labels.add('radius', `r = ${R} m`, { className: 'measure radius', worldPos: new THREE.Vector3(this.C.x + lp.x + off.x, 0.4, this.C.z + lp.z + off.z) });
    audio.play('label.pop');
  }
  clearOverlays(fade = true) {
    this.world.labels.remove('theta', fade); this.world.labels.remove('radius', fade);
    const kids = [...this.overlays.children].filter((k) => k.position.y > -1);
    if (!fade) { kids.forEach((k) => this.overlays.remove(k)); this.fill = null; return; }
    kids.forEach((k) => { const mat = k.material; const start = mat.uniforms ? mat.uniforms.opacity.value : mat.opacity; tweenValue(start, 0, 0.5, (v) => { if (mat.uniforms) mat.uniforms.opacity.value = v; else mat.opacity = v; }).then(() => this.overlays.remove(k)); });
    this.fill = null;
  }

  async charge() {
    audio.play('cannon.charge'); this.world.rig.shake(0.05, 1.4);
    this.decal.material.map = this.chargeTex; this.orb.visible = true;
    await tweenValue(0, 1, 1.35, (v) => {
      this.chargeLevel = v; this.spin = 5 + v * 30; this.glow.material.opacity = 0.35 + v * 0.45; this.glow.scale.setScalar(0.85 + v * 1.25); this.light.intensity = 40 + v * 120; this.glow.material.color.setHSL(0.52 - v * 0.05, 1, 0.6 + v * 0.35);
      this.chargeTex.offset.x = Math.min(4, Math.floor(v * 5)) / 5;                     // 5 painted frames: core lights → beam stub
      const of = Math.min(3, Math.floor(v * 4)); this.orbTex.offset.x = of / 4;        // 4 painted orbs: spark → full charge ring
      this.orb.material.opacity = Math.min(1, v * 2.5); this.orb.scale.setScalar(0.6 + v * 1.4);
    }, { ease: Ease.inQuad });
  }
  /**
   * Fire the sector laser. r: { firedTheta, theta, breachDeg, excessTheta }.
   * cb: { onFront(halfThetaCovered), onReflect(), onWallHit() }
   */
  async fire(r, cb = {}) {
    const R = this.R, W = this.world;
    audio.play('cannon.fire'); const hum = audio.play('laser.loop');
    W.rig.shake(0.45, 0.8);
    this.fx.flash(this.worldPos(0, 0, 1.6), 0xffffff, 10, 0.5);
    const fired = clamp(r.firedTheta, 0, 360), covered = Math.min(fired, r.theta);
    const mainStart = r.breachDeg - covered / 2;
    const main = sectorMesh(R, mainStart, covered, 0x66ddff); this.overlays.add(main); this.lasers.push(main);
    const edgeGlow = (deg) => { const m = ribbon(R, 0.5, deg, 0xffffff, { dashed: false, opacity: 0.9, y: 0.12 }); m.scale.x = 0.001; this.overlays.add(m); this.lasers.push(m); return m; };
    const e0 = edgeGlow(mainStart), e1 = edgeGlow(mainStart + covered);
    const excess = [];
    if (r.excessTheta > 0.5) {
      const half = r.excessTheta / 2;
      excess.push(sectorMesh(R, r.breachDeg - r.theta / 2 - half, half, 0xff4fa0), sectorMesh(R, r.breachDeg + r.theta / 2, half, 0xff4fa0));
      excess.forEach((m) => { this.overlays.add(m); this.lasers.push(m); });
    }
    cb.onFront && cb.onFront(covered / 2);
    await tweenValue(0, 1, 0.5, (v) => { [main, ...excess].forEach((m) => (m.material.uniforms.progress.value = v)); e0.scale.x = e1.scale.x = Math.max(0.001, v); }, { ease: Ease.outQuad });
    const impact = (startDeg, lenDeg, color) => {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(R - 0.15, R - 0.15, 2.4, Math.max(8, Math.round(lenDeg / 2)), 1, true, startDeg * DEG + Math.PI / 2, lenDeg * DEG), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      m.position.y = 1.3; this.overlays.add(m); tweenValue(1, 0, 0.8, (v) => (m.material.opacity = v)).then(() => this.overlays.remove(m));
    };
    impact(mainStart, covered, 0xbff6ff); cb.onWallHit && cb.onWallHit();
    W.rig.shake(0.3, 0.4);
    if (excess.length) {
      const half = r.excessTheta / 2;
      impact(r.breachDeg - r.theta / 2 - half, half, 0xff6a9a); impact(r.breachDeg + r.theta / 2, half, 0xff6a9a);
      excess.forEach((m) => tweens.to(m.material.uniforms.opacity, { value: 0.35 }, { duration: 0.4 }));
      await delay(0.15);
      audio.play('reflect.zap');
      const beams = [r.breachDeg - r.theta / 2 - half / 2, r.breachDeg + r.theta / 2 + half / 2].map((deg) => {
        const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 5, 10), new THREE.MeshBasicMaterial({ color: 0xff5a8a, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false }));
        rod.rotation.z = Math.PI / 2; rod.rotation.y = deg * DEG;
        const head = makeBillboard('fx_glow', 2.4, { additive: true, tint: 0xff7aa8, centerY: 0.5 });
        const g = new THREE.Group(); g.add(rod, head); g.position.y = 1.2; this.overlays.add(g);
        return { g, deg };
      });
      await tweenValue(R, 0, 0.5, (rv) => beams.forEach((b) => { const p = polar(b.deg, rv); b.g.position.set(p.x, 1.2, p.z); }), { ease: Ease.inQuad });
      beams.forEach((b) => this.overlays.remove(b.g));
      cb.onReflect && cb.onReflect();
    }
    await delay(excess.length ? 0.5 : 0.9);
    hum && hum.stop(0.5);
    const kids = [...this.lasers]; this.lasers = [];
    kids.forEach((k) => { const mat = k.material; const s = mat.uniforms ? mat.uniforms.opacity.value : mat.opacity; tweenValue(s, 0, 0.6, (v) => { if (mat.uniforms) mat.uniforms.opacity.value = v; else mat.opacity = v; }).then(() => this.overlays.remove(k)); });
    this.chargeLevel = 0;
    tweenValue(1, 0, 0.5, (v) => { this.orb.material.opacity = v; }).then(() => { this.orb.visible = false; this.decal.material.map = this.topTex; this.chargeTex.offset.x = 0; });
    tweens.to(this.glow.material, { opacity: 0.5 }, { duration: 0.6 }); tweens.add({ duration: 0.8, onUpdate: (e) => { this.glow.scale.setScalar(2.1 - e * 1.25); this.light.intensity = 160 - e * 120; this.spin = 35 - e * 30; this.glow.material.color.setHSL(0.52, 1, 0.6); } });
  }
  pulse() { audio.play('pulse'); this.fx.shockwave(this.C.clone(), this.R + 2, 0.8, 0xbff6ff); this.fx.flash(this.worldPos(0, 0, 1.1), 0x9ff4ff, 8, 0.5); this.world.rig.shake(0.3, 0.4); }

  update(dt, t) {
    this.t = t; this.ring.rotation.z += dt * this.spin;
    const cam = this.world.camera.position, elev = Math.atan2(cam.y - this.lift.position.y, Math.hypot(cam.x - this.C.x, cam.z - this.C.z)) / DEG;
    const w = Math.min(1, Math.max(0, (elev - 52) / 16)); this.topW += (w - this.topW) * Math.min(1, dt * 8);
    const k = this.topW;
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
