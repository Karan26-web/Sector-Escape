// ---------------------------------------------------------------------------
// The Sector Cannon: beacon, activation, battlefield scan (θ, r overlays),
// sector laser (correct / undercharged / overcharged + reflections), pulse.
// ---------------------------------------------------------------------------
import * as THREE from '../../vendor/three.module.js';
import { assets } from '../engine/assets.js';
import { makeBillboard } from '../engine/sprites.js';
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

function sectorMesh(R, startDeg, lengthDeg, color, y = 0.07) {
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
/** Flat ribbon from the centre outward along `deg`, growing with scale.x. */
function ribbon(length, width, deg, color, { dashed = true, opacity = 0.55, y = 0.09 } = {}) {
  const geo = new THREE.PlaneGeometry(length, width); geo.translate(length / 2, 0, 0);
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  if (dashed) { const t = dashTexture().clone(); t.needsUpdate = true; t.repeat.set(length / 1.2, 1); mat.map = t; }
  const m = new THREE.Mesh(geo, mat); m.rotation.x = -Math.PI / 2; m.rotation.z = deg * DEG; m.position.y = y; m.renderOrder = 9; return m;
}

export class Cannon {
  constructor(world, fx, R) {
    this.world = world; this.fx = fx; this.R = R;
    this.group = new THREE.Group(); world.add(this.group);
    this.body = makeBillboard('cannon', 3.2); this.body.position.y = 0; this.group.add(this.body);
    this.glow = makeBillboard('fx_glow', 2.2, { additive: true, tint: 0x7fe6ff, centerY: 0.5 }); this.glow.position.y = 2.35; this.glow.material.opacity = 0.55; this.group.add(this.glow);
    this.ring = new THREE.Mesh(new THREE.TorusGeometry(1.55, 0.06, 8, 64), new THREE.MeshBasicMaterial({ color: 0x7fe6ff, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.ring.rotation.x = Math.PI / 2; this.ring.position.y = 0.25; this.group.add(this.ring);
    this.beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.3, 14, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0x7fe6ff, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    this.beacon.position.y = 7; this.group.add(this.beacon);
    this.light = new THREE.PointLight(0x7fe6ff, 12, 16, 2); this.light.position.y = 2.6; this.group.add(this.light);
    this.active = false; this.spin = 0.6; this.t = 0; this.chargeLevel = 0;
    this.overlays = new THREE.Group(); world.add(this.overlays);
    this.lasers = [];
  }
  setBeacon(on) { tweens.to(this.beacon.material, { opacity: on ? 0.12 : 0 }, { duration: 0.6 }); }

  async activate() {
    this.active = true; audio.play('cannon.activate'); this.setBeacon(false);
    this.world.rig.shake(0.1, 0.6);
    await tweenValue(0, 1, 1.2, (v) => { this.spin = 0.6 + v * 5; this.glow.material.opacity = 0.55 + v * 0.45; this.glow.scale.setScalar(2.2 + v * 0.6); this.light.intensity = 12 + v * 30; }, { ease: Ease.outCubic });
    this.fx.shockwave(new THREE.Vector3(0, 0, 0), this.R * 1.05, 0.9, 0x7fe6ff);
    this.fx.flash(new THREE.Vector3(0, 2.4, 0), 0x9ff4ff, 6, 0.5);
  }

  /** Radar sweep + θ / r overlays. labels: world.labels. */
  async scan({ breachDeg, theta, scaffoldFill = true }) {
    const R = this.R, W = this.world;
    // sweep
    const sweep = sectorMesh(R, 0, 22, 0x7fe6ff, 0.1); sweep.material.uniforms.progress.value = 1; sweep.material.uniforms.opacity.value = 0.55; this.overlays.add(sweep);
    audio.play('scan.sweep');
    await tweenValue(0, 1, 1.15, (v) => { sweep.rotation.z = -(v * 360 * DEG) + (breachDeg - theta / 2 - 11) * DEG; }, { ease: Ease.inOutSine });
    this.overlays.remove(sweep);
    // radial lines to the breach ends
    const a0 = breachDeg - theta / 2, a1 = breachDeg + theta / 2;
    const lines = [a0, a1].map((d) => { const m = ribbon(R, 0.16, d, 0xbfefff, { opacity: 0.55 }); m.scale.x = 0.001; this.overlays.add(m); return m; });
    audio.play('scan.ping');
    await tweenValue(0, 1, 0.6, (v) => lines.forEach((m) => (m.scale.x = Math.max(0.001, v))), { ease: Ease.outCubic });
    // faint sector fill (scaffold)
    if (scaffoldFill) { this.fill = sectorMesh(R, a0, theta, 0xff6a4a, 0.05); this.fill.material.uniforms.progress.value = 1; this.fill.material.uniforms.opacity.value = 0; this.overlays.add(this.fill); tweens.to(this.fill.material.uniforms.opacity, { value: 0.14 }, { duration: 0.8 }); }
    // angle arc + label
    const ar = Math.max(2.6, R * 0.2);
    let arc = null; const mkArc = (len) => { if (arc) { this.overlays.remove(arc); arc.geometry.dispose(); } arc = new THREE.Mesh(new THREE.RingGeometry(ar, ar + 0.18, Math.max(8, Math.round(len / 3)), 1, a0 * DEG, Math.max(0.01, len) * DEG), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); arc.rotation.x = -Math.PI / 2; arc.position.y = 0.1; this.overlays.add(arc); };
    const lp = polar(breachDeg, ar + 1.6, 0); const lv = new THREE.Vector3(lp.x, 0.4, lp.z);
    W.labels.add('theta', 'θ = 0°', { className: 'measure theta', worldPos: lv });
    audio.play('label.pop');
    await tweenValue(0, theta, 0.55, (v) => { mkArc(v); W.labels.set('theta', `θ = ${Math.round(v)}°`); }, { ease: Ease.outCubic });
    this.arc = arc;
    // radius line + ticks + label
    const rl = ribbon(R, 0.12, breachDeg, 0xfff1a8, { dashed: false, opacity: 0.8, y: 0.11 }); rl.scale.x = 0.001; this.overlays.add(rl);
    const tick = (r) => { const t = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 1.2), new THREE.MeshBasicMaterial({ color: 0xfff1a8, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); const p = polar(breachDeg, r); t.position.set(p.x, 0.11, p.z); t.rotation.x = -Math.PI / 2; t.rotation.z = breachDeg * DEG; this.overlays.add(t); return t; };
    tick(0.05); const t2 = tick(R - 0.05); t2.visible = false;
    const rp = polar(breachDeg, R * 0.55); const rv = new THREE.Vector3(rp.x, 0.4, rp.z);
    audio.play('scan.ping');
    await tweenValue(0, 1, 0.6, (v) => (rl.scale.x = Math.max(0.001, v)), { ease: Ease.outCubic });
    t2.visible = true;
    W.labels.add('radius', `r = ${R} m`, { className: 'measure radius', worldPos: rv, offset: [0, -26] });
    audio.play('label.pop');
    this.measure = { lines, rl, ticks: [t2], a0, a1, breachDeg, theta };
  }
  clearOverlays(fade = true) {
    this.world.labels.remove('theta', fade); this.world.labels.remove('radius', fade);
    const kids = [...this.overlays.children];
    if (!fade) { kids.forEach((k) => this.overlays.remove(k)); return; }
    kids.forEach((k) => { const mat = k.material; const start = mat.uniforms ? mat.uniforms.opacity.value : mat.opacity; tweenValue(start, 0, 0.5, (v) => { if (mat.uniforms) mat.uniforms.opacity.value = v; else mat.opacity = v; }).then(() => this.overlays.remove(k)); });
  }

  /** Charge-up then fire. Returns after the beam has fully expanded (≈1.9 s). */
  async charge() {
    audio.play('cannon.charge');
    this.world.rig.shake(0.05, 1.4);
    await tweenValue(0, 1, 1.35, (v) => { this.chargeLevel = v; this.spin = 5 + v * 30; this.glow.material.opacity = 1; this.glow.scale.setScalar(2.8 + v * 2.2); this.light.intensity = 40 + v * 120; this.glow.material.color.setHSL(0.52 - v * 0.05, 1, 0.6 + v * 0.35); }, { ease: Ease.inQuad });
  }
  /**
   * Fire the sector laser.
   * @param {{status, firedTheta, theta, breachDeg, excessTheta}} r
   * @param {{onFront(halfThetaCovered), onReflect(), onWallHit()}} cb
   */
  async fire(r, cb = {}) {
    const R = this.R, W = this.world;
    audio.play('cannon.fire'); const hum = audio.play('laser.loop');
    W.rig.shake(0.45, 0.8);
    this.fx.flash(new THREE.Vector3(0, 2.4, 0), 0xffffff, 10, 0.5);
    const fired = clamp(r.firedTheta, 0, 360);
    const covered = Math.min(fired, r.theta);
    // main beam (the part that lands on the required sector)
    const mainStart = r.breachDeg - covered / 2;
    const main = sectorMesh(R, mainStart, covered, 0x66ddff); this.overlays.add(main); this.lasers.push(main);
    const edgeGlow = (deg) => { const m = ribbon(R, 0.5, deg, 0xffffff, { dashed: false, opacity: 0.9, y: 0.12 }); m.scale.x = 0.001; this.overlays.add(m); this.lasers.push(m); return m; };
    const e0 = edgeGlow(mainStart), e1 = edgeGlow(mainStart + covered);
    // excess slivers (over-charge) in hot magenta
    const excess = [];
    if (r.excessTheta > 0.5) {
      const half = r.excessTheta / 2;
      excess.push(sectorMesh(R, r.breachDeg - r.theta / 2 - half, half, 0xff4fa0), sectorMesh(R, r.breachDeg + r.theta / 2, half, 0xff4fa0));
      excess.forEach((m) => { this.overlays.add(m); this.lasers.push(m); });
    }
    cb.onFront && cb.onFront(covered / 2);
    await tweenValue(0, 1, 0.5, (v) => { [main, ...excess].forEach((m) => (m.material.uniforms.progress.value = v)); e0.scale.x = e1.scale.x = Math.max(0.001, v); }, { ease: Ease.outQuad });
    // wall impact arc
    const impact = (startDeg, lenDeg, color) => {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(R - 0.15, R - 0.15, 2.4, Math.max(8, Math.round(lenDeg / 2)), 1, true, startDeg * DEG + Math.PI / 2, lenDeg * DEG), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      m.position.y = 1.3; this.overlays.add(m); tweenValue(1, 0, 0.8, (v) => (m.material.opacity = v)).then(() => this.overlays.remove(m));
    };
    impact(mainStart, covered, 0xbff6ff); cb.onWallHit && cb.onWallHit();
    W.rig.shake(0.3, 0.4);
    if (excess.length) {
      // reflective wall: the excess bounces back to the centre
      const half = r.excessTheta / 2;
      impact(r.breachDeg - r.theta / 2 - half, half, 0xff6a9a); impact(r.breachDeg + r.theta / 2, half, 0xff6a9a);
      excess.forEach((m) => tweens.to(m.material.uniforms.opacity, { value: 0.35 }, { duration: 0.4 }));
      await delay(0.15);
      audio.play('reflect.zap');
      const beams = [r.breachDeg - r.theta / 2 - half / 2, r.breachDeg + r.theta / 2 + half / 2].map((deg) => {
        const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 5, 10), new THREE.MeshBasicMaterial({ color: 0xff5a8a, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false }));
        rod.rotation.z = Math.PI / 2; rod.rotation.y = deg * DEG; // lay along the radial direction
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
    // fade beams
    const kids = [...this.lasers]; this.lasers = [];
    kids.forEach((k) => { const mat = k.material; const s = mat.uniforms ? mat.uniforms.opacity.value : mat.opacity; tweenValue(s, 0, 0.6, (v) => { if (mat.uniforms) mat.uniforms.opacity.value = v; else mat.opacity = v; }).then(() => this.overlays.remove(k)); });
    this.chargeLevel = 0;
    tweens.to(this.glow.material, { opacity: 0.8 }, { duration: 0.6 }); tweens.add({ duration: 0.8, onUpdate: (e) => { this.glow.scale.setScalar(5 - e * 2.2); this.light.intensity = 160 - e * 120; this.spin = 35 - e * 30; this.glow.material.color.setHSL(0.52, 1, 0.6); } });
  }
  /** Emergency pulse that clears attackers after the hero is hit. */
  pulse() { audio.play('pulse'); this.fx.shockwave(new THREE.Vector3(0, 0, 0), this.R + 2, 0.8, 0xbff6ff); this.fx.flash(new THREE.Vector3(0, 1.5, 0), 0x9ff4ff, 8, 0.5); this.world.rig.shake(0.3, 0.4); }

  update(dt, t) {
    this.t = t; this.ring.rotation.z += dt * this.spin;
    this.ring.material.opacity = 0.45 + Math.sin(t * 3) * 0.15 + this.chargeLevel * 0.4;
    if (!this.chargeLevel) { this.glow.material.opacity = (this.active ? 0.8 : 0.55) + Math.sin(t * 2.2) * 0.12; }
    this.beacon.rotation.y = t * 0.4;
    for (const l of this.lasers) if (l.material.uniforms) l.material.uniforms.time.value = t;
    if (this.fill) this.fill.material.uniforms.time.value = t;
  }
}
