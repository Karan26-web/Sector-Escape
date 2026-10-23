// ---------------------------------------------------------------------------
// The barrier (LXD 2026-10-23): a thin, transparent energy curtain across the gap in the arena wall, which is exactly
// the arc of the sector. The guardians pound on it from the far side (a ripple where each blow lands). The sector charge
// breaks it in two beats (user, 2026-10-23: "it must crack, with a glass crack sound, then fall onto the ground and
// vanish"): it CRACKS — bright crack lines run over the glass from where the charge struck — then gives way: the pieces
// it cracked into fall to the floor, land with a glint and a tinkle, lie there a moment and vanish (all gone within
// ~2 s, long before Karan walks through). After a wrong shot it forms again for the next squad. From the top view it is
// seen edge-on: a bright line along the arc.
// ---------------------------------------------------------------------------
import * as THREE from '../../vendor/three.module.js';
import { tweenValue, delay } from '../engine/tween.js';
import { DEG, clamp, Ease, degDiff, polar } from '../engine/util.js';
import { audio } from '../engine/audio.js';
import { WALL_HEIGHT } from './levels.js';

const HITS = 8;               // ripples alive at once
export const CRACK_TIME = 0.4; // s (game time, so the slow motion stretches it) from the first crack to the glass giving way
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
// The pieces. Each is a convex cell of the glass (Voronoi), drawn as a fan of triangles from its centre; bary.x is 0 on
// the cell's outline, so the outlines are the crack lines. Everything is analytic on the GPU:
//  * crack (crackT): a piece's outline lights up once the crack front (crackT * crackSpeed m) reaches it (info.y m);
//  * break (breakT): after its own delay (info.x: from the impact outward) it falls under gravity from where it was,
//    pushed a little through the gap and tumbling; at the floor (rest height info.w) it lies down flat, skids a few cm,
//    glints, and 0.25–0.75 s later shrinks away. info.z: the glass's fade toward its top (as the curtain).
const SHARD_VERT = `
attribute vec3 aCenter; attribute vec3 vel; attribute vec4 spin; attribute vec3 bary; attribute vec4 info;
uniform float crackT; uniform float crackSpeed; uniform float breakT;
varying vec3 vBary; varying float vCrack; varying float vFill; varying float vShade; varying float vFlash;
vec3 rot(vec3 v, vec3 k, float a){ float c = cos(a), s = sin(a); return v * c + cross(k, v) * s + k * dot(k, v) * (1.0 - c); }
void main(){
  vBary = bary;
  float rnd = fract(sin(dot(aCenter, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
  float front = crackT * crackSpeed;                                                        // how far the cracks have run (m)
  vCrack = crackT < 0.0 ? 0.0 : smoothstep(info.y - 0.3, info.y + 0.05, front)
         * (0.75 + 0.6 * exp(-max(front - info.y, 0.0) * 1.2))                             // brightest where fresh
         * (0.35 + 0.65 * rnd) * info.z * info.z;                                           // uneven, as real cracks are; fading up the glass
  vec3 p = position; vFill = 0.0; vShade = 1.0; vFlash = 0.0;
  float t = breakT - info.x;
  if (breakT >= 0.0 && t > 0.0) {
    const float g = 9.8;
    float vy = vel.y, tl = (vy + sqrt(vy * vy + 2.0 * g * max(aCenter.y - info.w, 0.0))) / g;   // when it reaches the floor
    float tf = min(t, tl), after = max(t - tl, 0.0);
    float vanish = smoothstep(0.25 + rnd * 0.25, 0.6 + rnd * 0.15, after);
    vec3 off = rot(position - aCenter, spin.xyz, spin.w * tf);
    off.y *= 1.0 - smoothstep(0.0, 0.07, after);                               // it lies down flat once it lands
    off *= 1.0 - 0.7 * vanish;                                                   // and shrinks away
    vec3 c = aCenter + vec3(vel.x * tf, vy * tf - 0.5 * g * tf * tf, vel.z * tf);
    c.xz += vel.xz * 0.12 * (1.0 - exp(-after * 9.0));                           // a short skid on the stone
    p = c + off; p.y = max(p.y, info.w);
    vFill = (1.0 - vanish) * info.z;
    vec3 n = rot(normalize(vec3(aCenter.x, 0.0, aCenter.z)), spin.xyz, spin.w * tf);        // the glass faces the centre at rest
    vShade = abs(normalize(normalMatrix * n).z);                                                 // facing the camera: it catches the light
    vFlash = exp(-t * 28.0) + (after > 0.0 ? exp(-pow(after * 13.0, 2.0)) : 0.0);    // breaking loose, then the glint as it lands
  }
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}`;
const SHARD_FRAG = `uniform vec3 color; uniform float opacity;
varying vec3 vBary; varying float vCrack; varying float vFill; varying float vShade; varying float vFlash;
void main(){
  float e = vBary.x, w = max(fwidth(e), 1e-4);
  float line = 1.0 - smoothstep(0.0, w * 1.4, e);                 // the crack along the outline, ~1.5 px
  float halo = (1.0 - smoothstep(0.0, w * 5.0, e)) * 0.25;        // with a soft glow
  float broken = step(0.001, vFill), glint = pow(vShade, 8.0);
  float a = (line + halo) * vCrack * (1.0 - broken)               // cracked, still in place
          + vFill * (0.035 + 0.3 * glint + (line + halo) * 0.6 + vFlash * 0.45);   // falling: a faint cyan body, bright edges, a glint when a face turns to the light
  vec3 col = mix(color, vec3(1.0), clamp(0.25 + line * 0.45 + glint * 0.5 + vFlash * 0.6, 0.0, 1.0));
  gl_FragColor = vec4(col, clamp(a, 0.0, 1.0) * opacity);
}`;

/** The part of convex polygon `poly` ([[u, v], …]) nearer to site a than to site b. */
function clipNearer(poly, a, b) {
  const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, nx = b[0] - a[0], ny = b[1] - a[1], side = (p) => (p[0] - mx) * nx + (p[1] - my) * ny, out = [];
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i], q = poly[(i + 1) % poly.length], sp = side(p), sq = side(q);
    if (sp <= 0) out.push(p);
    if ((sp < 0 && sq > 0) || (sp > 0 && sq < 0)) { const k = sp / (sp - sq); out.push([p[0] + (q[0] - p[0]) * k, p[1] + (q[1] - p[1]) * k]); }
  }
  return out;
}

export class Barrier {
  constructor(world, fx) {
    this.world = world; this.fx = fx; this.group = new THREE.Group(); world.add(this.group);
    this.mesh = null; this.shards = null; this.up = false; this.next = 0; this.crackT = -1; this.breakT = -1; this.life = 0;
    this.uniforms = {
      color: { value: new THREE.Color(0x8ff4ff) }, time: { value: 0 }, opacity: { value: 1 }, rise: { value: 0 }, flash: { value: 0 },
      size: { value: new THREE.Vector2(1, 1) }, hits: { value: Array.from({ length: HITS }, () => new THREE.Vector4()) },
    };
    this.mat = new THREE.ShaderMaterial({ vertexShader: CURTAIN_VERT, fragmentShader: CURTAIN_FRAG, uniforms: this.uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    this.shardMat = new THREE.ShaderMaterial({ vertexShader: SHARD_VERT, fragmentShader: SHARD_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      uniforms: { crackT: { value: -1 }, crackSpeed: { value: 20 }, breakT: { value: -1 }, opacity: { value: 1 }, color: { value: this.uniforms.color.value.clone() } } });
    // warm-up copies, compiled with everything else while the game loads (no stall the first time the barrier forms or
    // breaks): a curtain that draws nothing (rise 0) and one zero-area piece, far below the ground
    const wc = new THREE.Mesh(new THREE.PlaneGeometry(0.01, 0.01), this.mat); wc.position.y = -60; this.group.add(wc);
    const sg = new THREE.BufferGeometry(), z = (n) => new THREE.BufferAttribute(new Float32Array(3 * n), n);
    for (const [k, n] of [['position', 3], ['aCenter', 3], ['vel', 3], ['spin', 4], ['bary', 3], ['info', 4]]) sg.setAttribute(k, z(n));
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
    this.up = false; this.clearShards(); if (this.mesh) this.mesh.visible = false;
    const u = this.uniforms; u.rise.value = 0; u.flash.value = 0; u.opacity.value = 1; for (const h of u.hits.value) h.w = 0;
  }
  /** The curtain rises out of the floor across the gap. */
  async form(dur = 0.6) {
    if (!this.mesh) return;
    this.clearShards();   // (the last break's pieces are long gone by now; never two layers of glass)
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
  /** The charge hits the glass where it covers the arc (fromDeg … fromDeg + spanDeg). Beat 1: it cracks — crack lines run
   *  out from the struck part over the whole glass, with a crack sound. Beat 2 (CRACK_TIME later): it gives way and the
   *  pieces fall, land and vanish. Resolves at the moment it gives way (the guardians behind are hit then). */
  async breakAt({ fromDeg = this.a0, spanDeg = this.theta } = {}) {
    if (!this.mesh || !this.up) return;
    this.up = false;
    const origins = this.buildPieces(fromDeg, spanDeg);
    this.crackT = 0; this.breakT = -1;
    this.uniforms.flash.value = 0.5; this.world.rig.shake(0.12, 0.25);
    audio.play('barrier.crack', { dur: CRACK_TIME / Math.max(0.05, this.world.timeScale) });
    for (const o of origins) this.fx.flash(this.local(o.deg, this.R - 0.1, o.y), 0xdffcff, 2.2, 0.3);
    await delay(CRACK_TIME);
    if (!this.shards) return;                                   // (the scene ended meanwhile)
    this.breakT = 0; audio.play('barrier.shatter');
    this.uniforms.flash.value = 0.8; this.world.rig.shake(0.3, 0.4);
    tweenValue(1, 0, 0.06, (v) => { this.uniforms.opacity.value = v; }).then(() => { if (!this.up && this.mesh) this.mesh.visible = false; });
    delay(0.5).then(() => { if (this.shards && this.breakT >= 0) audio.play('barrier.settle'); });
  }
  /** World position of polar degree `deg`, radius r, height y in this arena. */
  local(deg, r, y) { const p = polar(deg, r); return new THREE.Vector3(this.group.position.x + p.x, y, this.group.position.z + p.z); }
  /** Cut the glass into the pieces it will break into: a Voronoi pattern over the curtain (u along the arc, v up, in m)
   *  from a jittered grid of sites, so neighbouring pieces share their crack lines exactly. Returns the crack origins:
   *  points across the struck part at chest height, where the cracks start. */
  buildPieces(fromDeg, spanDeg) {
    this.clearShards();
    const R = this.R, H = this.H, arcM = R * this.theta * DEG, top = H * 0.9;
    const cu = clamp(0.32 + R * 0.02, 0.42, 0.85), cv = cu * 1.15, nu = Math.max(3, Math.round(arcM / cu)), nv = Math.max(3, Math.round(top / cv)), du = arcM / nu, dv = top / nv;
    const site = [];
    for (let i = 0; i < nu; i++) { site.push([]); for (let j = 0; j < nv; j++) site[i].push([(i + 0.5 + (Math.random() - 0.5) * 0.76) * du, (j + 0.5 + (Math.random() - 0.5) * 0.76) * dv]); }
    // where the charge struck: the covered part of the arc, at chest height; the cracks start there
    const u0 = clamp(degDiff(this.a0, fromDeg) * DEG * R, 0, arcM), u1 = clamp(u0 + spanDeg * DEG * R, u0, arcM), n = clamp(Math.round((u1 - u0) / 9), 1, 4);
    const origins = Array.from({ length: n }, (_, k) => { const u = u0 + ((k + 0.5) / n) * (u1 - u0) + (Math.random() - 0.5) * 0.6, v = 1.0 + Math.random() * 0.8; return { u, v, y: v, deg: this.a0 + u / (R * DEG) }; });
    const cells = []; let tris = 0, far = 0;
    for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
      const s = site[i][j];
      let poly = [[Math.max(0, s[0] - 1.6 * du), Math.max(0, s[1] - 1.6 * dv)], [Math.min(arcM, s[0] + 1.6 * du), Math.max(0, s[1] - 1.6 * dv)], [Math.min(arcM, s[0] + 1.6 * du), Math.min(top, s[1] + 1.6 * dv)], [Math.max(0, s[0] - 1.6 * du), Math.min(top, s[1] + 1.6 * dv)]];
      for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { if ((a || b) && site[i + a] && site[i + a][j + b]) poly = clipNearer(poly, s, site[i + a][j + b]); }
      if (poly.length < 3) continue;
      const c = poly.reduce((m, p) => [m[0] + p[0] / poly.length, m[1] + p[1] / poly.length], [0, 0]);
      const dist = Math.min(...origins.map((o) => Math.hypot(c[0] - o.u, c[1] - o.v)));
      cells.push({ poly, c, dist }); tris += poly.length; far = Math.max(far, dist);
    }
    const P = new Float32Array(tris * 9), C = new Float32Array(tris * 9), V = new Float32Array(tris * 9), S = new Float32Array(tris * 12), B = new Float32Array(tris * 9), I = new Float32Array(tris * 12);
    const g = 9.8, at = (u, v) => { const p = polar(this.a0 + u / (R * DEG), R); return [p.x, v, p.z]; };
    let k = 0; this.life = 0;
    for (const { poly, c, dist } of cells) {
      const deg = this.a0 + c[0] / (R * DEG), out = polar(deg, 1), tan = polar(deg + 90, 1), cen = at(c[0], c[1]);
      const push = (0.35 + 1.7 * Math.exp(-dist / 2.5)) * (0.7 + Math.random() * 0.6);   // the struck part is thrown hardest, through the gap
      const side = (Math.random() - 0.5) * 0.8, vy = -0.3 + Math.random() * 1.3;
      const vel = [out.x * push + tan.x * side, vy, out.z * push + tan.z * side];
      const ax = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize(), w = (Math.random() < 0.5 ? -1 : 1) * (2.5 + Math.random() * 6) * Math.sqrt(0.5 / cu);
      const rest = 0.025 + Math.random() * 0.02, wait = dist / 45 + Math.random() * 0.04, fade = 1 - smooth(0.35, 0.95, c[1] / H);
      const tl = (vy + Math.sqrt(vy * vy + 2 * g * Math.max(0, c[1] - rest))) / g;
      this.life = Math.max(this.life, wait + tl + 0.8);
      for (let e = 0; e < poly.length; e++) {
        const corners = [cen, at(...poly[e]), at(...poly[(e + 1) % poly.length])];
        for (let q = 0; q < 3; q++, k++) {
          P.set(corners[q], k * 3); C.set(cen, k * 3); V.set(vel, k * 3);
          S.set([ax.x, ax.y, ax.z, w], k * 4); B.set(q === 0 ? [1, 0, 0] : q === 1 ? [0, 1, 0] : [0, 0, 1], k * 3); I.set([wait, dist, fade, rest], k * 4);
        }
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(P, 3)); geo.setAttribute('aCenter', new THREE.BufferAttribute(C, 3));   // ('centroid' is a reserved word in GLSL ES 3.0)
    geo.setAttribute('vel', new THREE.BufferAttribute(V, 3)); geo.setAttribute('spin', new THREE.BufferAttribute(S, 4));
    geo.setAttribute('bary', new THREE.BufferAttribute(B, 3)); geo.setAttribute('info', new THREE.BufferAttribute(I, 4));
    const su = this.shardMat.uniforms; su.crackSpeed.value = Math.max(10, far / (CRACK_TIME * 0.85)); su.crackT.value = 0; su.breakT.value = -1;   // the cracks reach every piece just before it gives way
    this.shards = new THREE.Mesh(geo, this.shardMat);   // (the program was compiled at load with the warm-up piece)
    this.shards.frustumCulled = false; this.shards.renderOrder = 13;
    this.group.add(this.shards);
    return origins;
  }
  clearShards() { if (!this.shards) return; this.group.remove(this.shards); this.shards.geometry.dispose(); this.shards = null; this.crackT = this.breakT = -1; }
  update(dt, t) {
    const u = this.uniforms; u.time.value = t;
    for (const h of u.hits.value) if (h.w > 0) { h.z += dt; if (h.z > 0.7) h.w = 0; }
    if (u.flash.value > 0) u.flash.value = Math.max(0, u.flash.value - dt * 5);
    if (this.shards) {
      if (this.crackT >= 0) this.crackT += dt;
      if (this.breakT >= 0) this.breakT += dt;
      const su = this.shardMat.uniforms; su.crackT.value = this.crackT; su.breakT.value = this.breakT;
      if (this.breakT > this.life) this.clearShards();         // every piece has landed and vanished
    }
  }
}

function smooth(a, b, x) { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
