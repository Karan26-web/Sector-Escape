// ---------------------------------------------------------------------------
// The barrier (LXD 2026-10-23): a thin, transparent energy curtain across the
// gap in the arena wall, which is exactly the arc of the sector. The guardians
// pound on it from the far side (a ripple where each blow lands), the sector
// charge shatters it, and after a wrong shot it forms again for the next squad.
// From the top view it is seen edge-on: a bright line along the arc.
// ---------------------------------------------------------------------------
import * as THREE from '../../vendor/three.module.js';
import { tweenValue } from '../engine/tween.js';
import { DEG, clamp, Ease, degDiff, polar } from '../engine/util.js';
import { audio } from '../engine/audio.js';
import { WALL_HEIGHT } from './levels.js';

const HITS = 8;   // ripples alive at once
const CURTAIN_VERT = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const CURTAIN_FRAG = `
uniform vec3 color; uniform float time; uniform float opacity; uniform float rise; uniform float flash; uniform vec2 size;
uniform vec4 hits[${HITS}];   // x: metres along the arc, y: height, z: age (s), w: strength
varying vec2 vUv;
void main(){
  if (vUv.y > rise) discard;                                                 // forming: it rises out of the floor
  vec2 m = vUv * size;
  float floorLine = exp(-m.y * 3.0) * 0.5;                                    // bright at the floor: the arc, seen from above
  float film = 0.045 + 0.025 * sin(m.x * 1.9 + time * 1.3) * sin(m.y * 1.4 - time * 1.9);   // thin and see-through (LXD)
  vec2 g = m * vec2(1.25, 1.45); g.x += 0.5 * mod(floor(g.y), 2.0); vec2 c = abs(fract(g) - 0.5);
  float cells = smoothstep(0.44, 0.5, max(c.x * 1.15, c.y)) * 0.045;         // faint cells: a surface, not a haze
  float sides = exp(-min(vUv.x, 1.0 - vUv.x) * size.x * 1.6) * 0.3;          // where it meets the wall ends
  float ripples = 0.0;
  for (int i = 0; i < ${HITS}; i++) {
    vec4 h = hits[i]; if (h.w <= 0.0) continue;
    float d = distance(m, h.xy), fade = clamp(1.0 - h.z / 0.65, 0.0, 1.0);
    ripples += (exp(-pow((d - h.z * 4.5) * 3.2, 2.0)) * 0.7 + exp(-d * 2.2) * 0.4 * fade) * fade * h.w;
  }
  float edge = exp(-pow((vUv.y - rise) * 38.0, 2.0)) * step(rise, 0.995);     // the rising line while it forms
  float topFade = 1.0 - smoothstep(0.35, 0.95, vUv.y);
  float a = (floorLine + film + cells + sides) * topFade + ripples + edge * 1.3 + flash;
  vec3 col = mix(color, vec3(1.0), clamp(ripples * 0.55 + edge + flash, 0.0, 1.0));
  gl_FragColor = vec4(col, clamp(a, 0.0, 1.0) * opacity);
}`;
// shards: one triangle per piece, animated on the GPU (fly out, tumble, fall, fade); each piece waits `delay` so the
// break runs outward from the part of the arc the charge hit
const SHARD_VERT = `
attribute vec3 aCenter; attribute vec3 vel; attribute vec4 spin; attribute float delay;
uniform float time; varying float vT; varying float vShade;
vec3 rot(vec3 v, vec3 k, float a){ float c = cos(a), s = sin(a); return v * c + cross(k, v) * s + k * dot(k, v) * (1.0 - c); }
void main(){
  float t = max(0.0, time - delay); vT = t;
  vec3 p = aCenter + rot(position - aCenter, spin.xyz, spin.w * t) + vel * t + vec3(0.0, -4.9 * t * t, 0.0);
  p.y = max(p.y, 0.03);
  vShade = 0.55 + 0.45 * abs(rot(vec3(0.0, 0.0, 1.0), spin.xyz, spin.w * t).z);   // glints as it turns
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}`;
const SHARD_FRAG = `uniform vec3 color; varying float vT; varying float vShade;
void main(){ float a = (1.0 - smoothstep(0.5, 1.2, vT)) * 0.9; gl_FragColor = vec4(mix(color, vec3(1.0), 0.4) * vShade, a); }`;

export class Barrier {
  constructor(world, fx) {
    this.world = world; this.fx = fx; this.group = new THREE.Group(); world.add(this.group);
    this.mesh = null; this.shards = null; this.up = false; this.next = 0; this.t = 0;
    this.uniforms = {
      color: { value: new THREE.Color(0x8ff4ff) }, time: { value: 0 }, opacity: { value: 1 }, rise: { value: 0 }, flash: { value: 0 },
      size: { value: new THREE.Vector2(1, 1) }, hits: { value: Array.from({ length: HITS }, () => new THREE.Vector4()) },
    };
    this.mat = new THREE.ShaderMaterial({ vertexShader: CURTAIN_VERT, fragmentShader: CURTAIN_FRAG, uniforms: this.uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    this.shardMat = new THREE.ShaderMaterial({ vertexShader: SHARD_VERT, fragmentShader: SHARD_FRAG, uniforms: { time: { value: 0 }, color: { value: this.uniforms.color.value.clone() } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    // warm-up copies, compiled with everything else while the game loads (no stall the first time the barrier forms or breaks):
    // a curtain that draws nothing (rise 0) and one zero-area shard, far below the ground
    const wc = new THREE.Mesh(new THREE.PlaneGeometry(0.01, 0.01), this.mat); wc.position.y = -60; this.group.add(wc);
    const sg = new THREE.BufferGeometry(), z3 = () => new THREE.BufferAttribute(new Float32Array(9), 3);
    sg.setAttribute('position', z3()); sg.setAttribute('aCenter', z3()); sg.setAttribute('vel', z3()); sg.setAttribute('spin', new THREE.BufferAttribute(new Float32Array(12), 4)); sg.setAttribute('delay', new THREE.BufferAttribute(new Float32Array(3), 1));
    const ws = new THREE.Mesh(sg, this.shardMat); ws.position.y = -60; ws.frustumCulled = false; this.group.add(ws);
  }
  /** Fit the curtain to arena a's gap: the arc at r = R from exitDeg − θ/2 to exitDeg + θ/2, as tall as the wall. */
  setArena(a) {
    this.clearShards();
    if (this.mesh) { this.group.remove(this.mesh); this.mesh.geometry.dispose(); }
    const R = a.R - 0.04, H = WALL_HEIGHT, a0 = a.exitDeg - a.theta / 2;
    Object.assign(this, { R, H, a0, theta: a.theta, exitDeg: a.exitDeg });
    // CylinderGeometry measures its angle from +Z toward +X: polar degree d sits at d + 90°
    const geo = new THREE.CylinderGeometry(R, R, H, Math.max(16, Math.round(a.theta / 2)), 6, true, a0 * DEG + Math.PI / 2, a.theta * DEG);
    geo.translate(0, H / 2, 0);
    this.mesh = new THREE.Mesh(geo, this.mat); this.mesh.renderOrder = 12;
    this.group.position.set(a.center.x, 0, a.center.z); this.group.add(this.mesh);
    this.uniforms.size.value.set(R * a.theta * DEG, H);
    this.hide();
  }
  hide() {
    this.up = false; if (this.mesh) this.mesh.visible = false;
    const u = this.uniforms; u.rise.value = 0; u.flash.value = 0; u.opacity.value = 1; for (const h of u.hits.value) h.w = 0;
  }
  /** The curtain rises out of the floor across the gap. */
  async form(dur = 0.6) {
    if (!this.mesh) return;
    this.mesh.visible = true; this.up = true; this.uniforms.opacity.value = 1; this.uniforms.flash.value = 0;
    audio.play('barrier.form');
    await tweenValue(0, 1, dur, (v) => (this.uniforms.rise.value = v), { ease: Ease.outCubic });
  }
  /** A guardian's blow at polar degree `deg`, height y: a ripple spreads from the spot. */
  impact(deg, y = 1.3, strength = 1) {
    if (!this.up) return;
    const along = clamp(degDiff(this.a0, deg), 0, this.theta) * DEG * this.R, h = this.uniforms.hits.value[this.next];
    h.set(along, y, 0, strength); this.next = (this.next + 1) % HITS;
  }
  /** The charge breaks it: a white flash, then the curtain splits into shards that fly outward and fall. The break
   *  starts at the part of the arc the charge covered (fromDeg … fromDeg + spanDeg) and runs along the rest. */
  shatter({ fromDeg = this.a0, spanDeg = this.theta } = {}) {
    if (!this.mesh || !this.up) return;
    this.up = false; audio.play('barrier.shatter');
    this.uniforms.flash.value = 0.9;
    tweenValue(1, 0, 0.18, (v) => { this.uniforms.opacity.value = v; }).then(() => { if (!this.up && this.mesh) this.mesh.visible = false; });
    this.spawnShards(fromDeg, spanDeg);
    for (let k = 0; k <= 4; k++) { const p = polar(this.a0 + (this.theta * k) / 4, this.R); this.fx.flash(new THREE.Vector3(this.group.position.x + p.x, 1.4, this.group.position.z + p.z), 0xbff8ff, 3.2, 0.35); }
  }
  spawnShards(fromDeg, spanDeg) {
    this.clearShards();
    const R = this.R, H = this.H * 0.82, arcM = R * this.theta * DEG, n = Math.round(clamp(arcM * H * 1.1, 70, 300));
    const pos = new Float32Array(n * 9), cen = new Float32Array(n * 9), vel = new Float32Array(n * 9), spin = new Float32Array(n * 12), dl = new Float32Array(n * 3);
    const v = new THREE.Vector3(), axis = new THREE.Vector3();
    for (let i = 0; i < n; i++) {
      const deg = this.a0 + Math.random() * this.theta, y = Math.pow(Math.random(), 1.6) * H;   // more pieces low down, where the film is brightest
      const out = polar(deg, 1), tan = polar(deg + 90, 1), s = 0.18 + Math.random() * 0.34;
      const cx = out.x * R, cz = out.z * R;
      // a small triangle in the curtain's plane (tangent + up)
      const corners = [0, 1, 2].map((k) => { const a = (k / 3) * Math.PI * 2 + Math.random() * 1.2; return [Math.cos(a) * s, Math.sin(a) * s]; });
      corners.forEach(([tx, ty], k) => {
        const o = i * 9 + k * 3; pos[o] = cx + tan.x * tx; pos[o + 1] = y + ty; pos[o + 2] = cz + tan.z * tx;
        cen[o] = cx; cen[o + 1] = y; cen[o + 2] = cz;
      });
      // outward (through the gap, the way the charge went), a little sideways and up
      v.set(out.x, 0, out.z).multiplyScalar(2.5 + Math.random() * 4.5).addScaledVector(new THREE.Vector3(tan.x, 0, tan.z), (Math.random() - 0.5) * 3).add(new THREE.Vector3(0, 1 + Math.random() * 3.5, 0));
      axis.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
      const w = (Math.random() < 0.5 ? -1 : 1) * (5 + Math.random() * 9);
      const off = Math.abs(degDiff(fromDeg + spanDeg / 2, deg)) - spanDeg / 2, wait = clamp((off * DEG * R) / 28, 0, 0.35) + Math.random() * 0.05;
      for (let k = 0; k < 3; k++) {
        const o = i * 9 + k * 3; vel[o] = v.x; vel[o + 1] = v.y; vel[o + 2] = v.z;
        const q = i * 12 + k * 4; spin[q] = axis.x; spin[q + 1] = axis.y; spin[q + 2] = axis.z; spin[q + 3] = w;
        dl[i * 3 + k] = wait;
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('aCenter', new THREE.BufferAttribute(cen, 3));   // ('centroid' is a reserved word in GLSL ES 3.0)
    geo.setAttribute('vel', new THREE.BufferAttribute(vel, 3)); geo.setAttribute('spin', new THREE.BufferAttribute(spin, 4)); geo.setAttribute('delay', new THREE.BufferAttribute(dl, 1));
    this.shards = new THREE.Mesh(geo, this.shardMat.clone());   // (same program as the warmed-up one) this.shards.frustumCulled = false; this.shards.renderOrder = 13; this.shardT = 0;
    this.group.add(this.shards);
  }
  clearShards() { if (!this.shards) return; this.group.remove(this.shards); this.shards.geometry.dispose(); this.shards.material.dispose(); this.shards = null; }
  update(dt, t) {
    const u = this.uniforms; u.time.value = t;
    for (const h of u.hits.value) if (h.w > 0) { h.z += dt; if (h.z > 0.7) h.w = 0; }
    if (u.flash.value > 0) u.flash.value = Math.max(0, u.flash.value - dt * 5);
    if (this.shards) { this.shardT += dt; this.shards.material.uniforms.time.value = this.shardT; if (this.shardT > 1.8) this.clearShards(); }
  }
}
