// ---------------------------------------------------------------------------
// Arena: circular stone wall with gates and openable breach segments,
// torches, energy lock, surrounding jungle.
// Angle convention: deg 0 = +X (east), 90 = -Z (north).  See util.polar().
// ---------------------------------------------------------------------------
import * as THREE from '../../vendor/three.module.js';
import { assets } from '../engine/assets.js';
import { AnimatedSprite, makeBillboard } from '../engine/sprites.js';
import { tweens, tweenTo, tweenValue, delay } from '../engine/tween.js';
import { DEG, polar, wrapDeg, degDiff, mulberry32, Ease, clamp } from '../engine/util.js';
import { GATE, gateHalfDeg } from './levels.js';
import { audio } from '../engine/audio.js';

const SKY = { day: 0x9fd4ec, dusk: 0xf0a86a, night: 0x1b2440, storm: 0x515a6a };
const HEMI = { day: [0xdfeeff, 0x4a5a3a, 1.25], dusk: [0xffd3a8, 0x4a3a30, 1.1], night: [0x8a9fd8, 0x30403a, 1.15], storm: [0xb0b8c8, 0x303838, 1.0] };

export class Arena {
  constructor(world, level) {
    this.world = world; this.level = level;
    this.R = level.radius;
    this.H = 5 + this.R * 0.12;
    this.T = 1.0; // wall thickness
    this.group = new THREE.Group();
    this.segments = [];      // { group, a0, a1, tags:Set, baseY }
    this.breachOpen = new Set();
    this.torches = [];
    this.gates = {};
    this.lockBroken = false;
    this.rng = mulberry32(1000 + level.id * 77);
    this.build();
    world.add(this.group);
  }

  /* ------------------------------------------------------------ build */
  build() {
    const L = this.level, R = this.R, H = this.H, env = L.env;
    const scene = this.world.scene;
    scene.background = new THREE.Color(SKY[env.sky] ?? SKY.day);
    scene.fog = new THREE.FogExp2(new THREE.Color(env.fog), env.sky === 'night' ? 0.005 : 0.0038);
    // lights
    const [hs, hg, hi] = HEMI[env.sky] ?? HEMI.day;
    this.group.add(new THREE.HemisphereLight(hs, hg, hi));
    const sun = new THREE.DirectionalLight(env.sky === 'night' ? 0x8090c0 : 0xfff1d6, env.sky === 'night' ? 0.5 : 0.9);
    sun.position.set(30, 60, 20); this.group.add(sun);
    this.group.add(new THREE.AmbientLight(0xffffff, env.sky === 'night' ? 0.55 : 0.25));

    // floor
    const floorTex = assets.texture('arena_floor', { wrap: false });
    const floor = new THREE.Mesh(new THREE.CircleGeometry(R, 96), new THREE.MeshLambertMaterial({ map: floorTex, color: new THREE.Color(env.floor).multiplyScalar(1.15), transparent: true }));
    floor.rotation.x = -Math.PI / 2; floor.position.y = 0; floor.renderOrder = 0; this.group.add(floor); this.floor = floor;

    // outside ground
    const gtex = assets.texture('ground_jungle', { repeat: [40, 40] });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.MeshLambertMaterial({ map: gtex, color: 0xcfd8c0 }));
    ground.rotation.x = -Math.PI / 2; ground.position.y = -0.03; this.group.add(ground);

    // paths (entrance & exit)
    this.addPath(L.entranceDeg, 80); this.addPath(L.exitDeg, 110);

    // wall segmentation
    this.buildWalls();
    // gates
    this.gates.entrance = this.buildGate(L.entranceDeg, false);
    this.gates.exit = this.buildGate(L.exitDeg, true);
    // energy lock band
    const band = new THREE.Mesh(new THREE.TorusGeometry(R - 0.12, 0.08, 8, 160), new THREE.MeshBasicMaterial({ color: 0xff4a3a, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
    band.rotation.x = Math.PI / 2; band.position.y = H * 0.62; this.group.add(band); this.band = band;
    // torches
    this.buildTorches();
    // jungle & backdrop
    this.buildJungle();
    // next-arena silhouette down the exit path
    const next = polar(L.exitDeg, R + 95);
    const nTex = assets.texture('arena_wall', {}).clone(); nTex.needsUpdate = true; nTex.repeat.set(Math.round((2 * Math.PI * (R * 0.8 + 1)) / H), 1);
    const nextWall = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.8 + 1, R * 0.8 + 1, H, 48, 1, true), new THREE.MeshLambertMaterial({ map: nTex, color: new THREE.Color(env.wall).multiplyScalar(0.85) }));
    nextWall.position.set(next.x, H / 2, next.z); this.group.add(nextWall);
    const nextTop = new THREE.Mesh(new THREE.RingGeometry(R * 0.8 - 0.1, R * 0.8 + 1.1, 48), new THREE.MeshLambertMaterial({ color: 0x9a9a88, side: THREE.DoubleSide })); nextTop.rotation.x = -Math.PI / 2; nextTop.position.set(next.x, H, next.z); this.group.add(nextTop);
  }

  addPath(deg, length) {
    const R = this.R;
    const tex = assets.texture('path_dirt', { repeat: [1, length / 8] });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(4.6, length), new THREE.MeshLambertMaterial({ map: tex, color: 0xffffff, transparent: true, depthWrite: false }));
    const mid = polar(deg, R + length / 2);
    m.rotation.x = -Math.PI / 2; m.rotation.z = -(deg * DEG) + Math.PI / 2; // plane length axis along the radial direction
    m.position.set(mid.x, -0.012, mid.z); m.renderOrder = 1; this.group.add(m);
  }

  features() {
    const L = this.level, R = this.R;
    const f = [
      { type: 'gate', key: 'entrance', deg: L.entranceDeg, half: gateHalfDeg(GATE.smallWidth, R) },
      { type: 'gate', key: 'exit', deg: L.exitDeg, half: gateHalfDeg(GATE.largeWidth, R) },
    ];
    L.waves.forEach((w, i) => f.push({ type: 'breach', key: 'breach' + i, wave: i, deg: w.breachDeg, half: w.theta / 2 }));
    return f;
  }

  buildWalls() {
    const feats = this.features();
    const bounds = new Set();
    for (const f of feats) { bounds.add(wrapDeg(f.deg - f.half)); bounds.add(wrapDeg(f.deg + f.half)); }
    const B = [...bounds].sort((a, b) => a - b);
    const wallTex = assets.get('arena_wall');
    for (let i = 0; i < B.length; i++) {
      const a0 = B[i], a1 = i + 1 < B.length ? B[i + 1] : B[0] + 360;
      if (a1 - a0 < 0.01) continue;
      const mid = (a0 + a1) / 2;
      const tags = new Set();
      for (const f of feats) if (Math.abs(degDiff(f.deg, mid)) < f.half - 1e-6) tags.add(f.key);
      if (tags.has('entrance') || tags.has('exit')) continue; // gate slot – no wall here
      // split long plain arcs so texture seams/lighting stay even
      const pieces = Math.max(1, Math.ceil((a1 - a0) / 30));
      for (let p = 0; p < pieces; p++) {
        const s0 = a0 + ((a1 - a0) * p) / pieces, s1 = a0 + ((a1 - a0) * (p + 1)) / pieces;
        const seg = this.buildWallArc(s0, s1);
        seg.tags = tags; this.segments.push(seg); this.group.add(seg.group);
      }
    }
  }

  buildWallArc(a0deg, a1deg) {
    const R = this.R, H = this.H, T = this.T, env = this.level.env;
    const a0 = a0deg * DEG, a1 = a1deg * DEG, len = a1 - a0;
    const segs = Math.max(2, Math.ceil(len / (3 * DEG)));
    const tileW = H; // one texture tile spans H metres horizontally (square texture)
    const mkTex = (radius) => { const t = assets.texture('arena_wall', {}).clone(); t.needsUpdate = true; t.repeat.set((len * radius) / tileW, 1); t.offset.set((a0 * radius) / tileW, 0); return t; };
    const col = new THREE.Color(env.wall);
    const inner = new THREE.Mesh(new THREE.CylinderGeometry(R, R, H, segs, 1, true, a0 + Math.PI / 2, len), new THREE.MeshLambertMaterial({ map: mkTex(R), color: col, side: THREE.BackSide }));
    const outer = new THREE.Mesh(new THREE.CylinderGeometry(R + T, R + T, H, segs, 1, true, a0 + Math.PI / 2, len), new THREE.MeshLambertMaterial({ map: mkTex(R + T), color: col.clone().multiplyScalar(0.8), side: THREE.FrontSide }));
    inner.position.y = H / 2; outer.position.y = H / 2;
    const topTex = assets.texture('wall_top', {}).clone(); topTex.needsUpdate = true; topTex.repeat.set((len * R) / 4, 1);
    const top = new THREE.Mesh(new THREE.RingGeometry(R - 0.02, R + T + 0.02, segs, 1, a0, len), new THREE.MeshLambertMaterial({ map: topTex, color: 0xb8b8a8, side: THREE.DoubleSide }));
    top.rotation.x = -Math.PI / 2; top.position.y = H;
    // end caps (visible when a breach is open)
    const cap = (ang) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(T, H), new THREE.MeshLambertMaterial({ color: col.clone().multiplyScalar(0.55), side: THREE.DoubleSide })); const p = polar(ang / DEG, R + T / 2); m.position.set(p.x, H / 2, p.z); m.rotation.y = -ang + Math.PI / 2; return m; };
    const g = new THREE.Group(); g.add(inner, outer, top, cap(a0), cap(a1));
    return { group: g, a0: a0deg, a1: a1deg, tags: new Set(), baseY: 0 };
  }

  buildGate(deg, large) {
    const R = this.R, H = this.H, T = this.T;
    const slot = large ? GATE.largeWidth : GATE.smallWidth;
    const fdef = assets.def(large ? 'gate_large_frame' : 'gate_small_frame') || {};
    const usingFallback = assets.status.get(large ? 'gate_large_frame' : 'gate_small_frame') === 'fallback';
    const opening = usingFallback ? (fdef.fallbackOpening ?? 0.46) : (fdef.opening ?? (large ? 0.56 : 0.46)), top = usingFallback ? (fdef.fallbackTop ?? 0.3) : (fdef.top ?? (large ? 0.22 : 0.3));
    const W = Math.min(slot / opening, H * 1.15);
    const doorH = W * (1 - top) * 0.98;
    const frameTex = assets.texture(large ? 'gate_large_frame' : 'gate_small_frame', { wrap: false });
    const doorTex = assets.texture(large ? 'gate_large_door' : 'gate_small_door', { wrap: false });
    const g = new THREE.Group();
    const a = deg * DEG;
    const face = (radius, outward) => { const p = polar(deg, radius); const m = new THREE.Mesh(new THREE.PlaneGeometry(W, W), new THREE.MeshLambertMaterial({ map: frameTex, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide })); m.position.set(p.x, W / 2, p.z); m.rotation.y = Math.atan2(-Math.cos(a), Math.sin(a)) + (outward ? Math.PI : 0); return m; };
    g.add(face(R - 0.08, false), face(R + T + 0.08, true));
    // door leaves
    const dp = polar(deg, R + T * 0.5), rotY = Math.atan2(-Math.cos(a), Math.sin(a));
    const leaves = [];
    const tangent = new THREE.Vector3(Math.cos(rotY), 0, -Math.sin(rotY)); // plane +X in world
    if (large) {
      for (const s of [-1, 1]) {
        const leaf = new THREE.Mesh(new THREE.PlaneGeometry(slot / 2 + 0.05, doorH), new THREE.MeshLambertMaterial({ map: doorTex, side: THREE.DoubleSide, transparent: true, alphaTest: 0.5 }));
        leaf.rotation.y = rotY; leaf.position.set(dp.x, doorH / 2, dp.z).addScaledVector(tangent, (s * slot) / 4); leaf.userData.side = s; leaves.push(leaf); g.add(leaf);
      }
    } else {
      const leaf = new THREE.Mesh(new THREE.PlaneGeometry(slot + 0.1, doorH), new THREE.MeshLambertMaterial({ map: doorTex, side: THREE.DoubleSide, transparent: true, alphaTest: 0.5 }));
      leaf.rotation.y = rotY; leaf.position.set(dp.x, doorH / 2, dp.z); leaves.push(leaf); g.add(leaf);
    }
    let lock = null;
    if (large) {
      const lp = polar(deg, R + 0.25);
      lock = new THREE.Mesh(new THREE.PlaneGeometry(slot * 0.8, slot * 0.8), new THREE.MeshBasicMaterial({ map: assets.texture('energy_lock', { wrap: false }), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      lock.position.set(lp.x, doorH * 0.5, lp.z); lock.rotation.y = rotY; g.add(lock);
      const lightP = polar(deg, R - 1.5); const pl = new THREE.PointLight(0xff5040, 18, 12, 2); pl.position.set(lightP.x, 3, lightP.z); g.add(pl); this.lockLight = pl;
    }
    this.group.add(g);
    return { group: g, leaves, lock, deg, slot, doorH, large, open: false, tangent, worldPos: polar(deg, R) };
  }

  buildTorches() {
    const L = this.level, R = this.R, H = this.H, n = L.env.torches;
    const feats = this.features();
    let lights = 0;
    for (let i = 0; i < n; i++) {
      const deg = (i / n) * 360 + 180 / n;
      if (feats.some((f) => Math.abs(degDiff(f.deg, deg)) < f.half + 4)) continue;
      const spr = new AnimatedSprite('torch', { worldHeight: 1.5, center: [0.5, 0.2] });
      spr.time = Math.random() * 10;
      const p = polar(deg, R - 0.45); spr.sprite.position.set(p.x, H * 0.5, p.z);
      this.group.add(spr.sprite); this.torches.push(spr);
      if (lights < 8) { const pl = new THREE.PointLight(0xff9a3a, 22, R * 0.9, 2); const lp = polar(deg, R - 1.4); pl.position.set(lp.x, H * 0.55, lp.z); pl.userData.base = 22; this.group.add(pl); this.torches.push({ light: pl, phase: Math.random() * 10, update(dt) { this.phase += dt * 9; pl.intensity = pl.userData.base * (0.85 + 0.15 * Math.sin(this.phase) * Math.sin(this.phase * 0.37)); } }); lights++; }
    }
  }

  buildJungle() {
    const L = this.level, R = this.R, rng = this.rng;
    // panorama cylinder
    const pano = new THREE.Mesh(new THREE.CylinderGeometry(190, 190, 110, 64, 1, true), new THREE.MeshBasicMaterial({ map: assets.texture('jungle_panorama', { wrap: true }), side: THREE.BackSide, fog: false, color: L.env.sky === 'night' ? 0x4a5a80 : L.env.sky === 'dusk' ? 0xffc8a0 : 0xffffff }));
    pano.position.y = 38; this.group.add(pano);
    const skyTint = { day: 0xffffff, dusk: 0xffb888, night: 0x3a4a86, storm: 0x8a929c }[L.env.sky] ?? 0xffffff;
    const sky = new THREE.Mesh(new THREE.SphereGeometry(400, 32, 16), new THREE.MeshBasicMaterial({ map: assets.texture('sky', { wrap: false }), side: THREE.BackSide, fog: false, color: skyTint }));
    sky.position.y = -30; this.group.add(sky);
    // trees & plants
    const corridors = [L.entranceDeg, L.exitDeg];
    let placed = 0;
    for (let i = 0; i < 400 && placed < 110; i++) {
      const deg = rng() * 360, r = R + 5 + Math.pow(rng(), 0.7) * 75;
      if (corridors.some((c) => Math.abs(degDiff(c, deg)) < Math.atan2(5, r) / DEG + 2)) continue;
      const p = polar(deg, r);
      const big = rng() < 0.65;
      const spr = makeBillboard(big ? 'jungle_tree' : 'jungle_plant', big ? 7 + rng() * 5 : 1.2 + rng() * 1.2, { frame: Math.floor(rng() * 4) });
      spr.position.set(p.x, -0.02, p.z); this.group.add(spr); placed++;
    }
    // idols flanking the entrance (outside)
    for (const s of [-1, 1]) { const p = polar(L.entranceDeg + s * (atanDeg(4.5, R + 4)), R + 4); const idol = makeBillboard('stone_idol', 4); idol.position.set(p.x, 0, p.z); this.group.add(idol); }
    function atanDeg(w, r) { return Math.atan2(w, r) / DEG; }
  }

  /* ------------------------------------------------------------ queries */
  pos(deg, r = this.R, y = 0) { const p = polar(deg, r); return new THREE.Vector3(p.x, y, p.z); }
  get center() { return new THREE.Vector3(0, 0, 0); }

  /* ------------------------------------------------------------ actions */
  async openGate(key, dur = 1.6) {
    const g = this.gates[key]; if (!g || g.open) return; g.open = true; audio.play('gate.open');
    const ps = g.leaves.map((leaf) => g.large
      ? tweenTo(leaf.position, { x: leaf.position.x + g.tangent.x * leaf.userData.side * (g.slot / 2 + 0.1), z: leaf.position.z + g.tangent.z * leaf.userData.side * (g.slot / 2 + 0.1) }, { duration: dur, ease: Ease.inOutCubic })
      : tweenTo(leaf.position, { y: leaf.position.y - g.doorH - 0.15 }, { duration: dur, ease: Ease.inOutCubic }));
    this.world.rig.shake(0.08, dur);
    await Promise.all(ps);
  }
  async closeGate(key, dur = 0.9) {
    const g = this.gates[key]; if (!g || !g.open) return; g.open = false; audio.play('gate.close');
    const ps = g.leaves.map((leaf) => g.large
      ? tweenTo(leaf.position, { x: leaf.position.x - g.tangent.x * leaf.userData.side * (g.slot / 2 + 0.1), z: leaf.position.z - g.tangent.z * leaf.userData.side * (g.slot / 2 + 0.1) }, { duration: dur, ease: Ease.inCubic })
      : tweenTo(leaf.position, { y: leaf.position.y + g.doorH + 0.15 }, { duration: dur, ease: Ease.inCubic }));
    await Promise.all(ps); this.world.rig.shake(0.25, 0.3);
  }
  /** Sink the wall segments of wave `i` into the ground. */
  async openBreach(i, dur = 2.4) {
    const key = 'breach' + i; if (this.breachOpen.has(key)) return; this.breachOpen.add(key);
    audio.play('breach.open'); this.world.rig.shake(0.35, dur);
    const segs = this.segments.filter((s) => s.tags.has(key));
    const ps = segs.map((s) => tweenTo(s.group.position, { y: -this.H - 0.6 }, { duration: dur, ease: Ease.inOutCubic }));
    // rubble along the breach line
    const w = this.level.waves[i];
    for (let k = 0; k < Math.max(3, Math.round(w.theta / 18)); k++) {
      const deg = w.breachDeg - w.theta / 2 + (k + 0.5) * (w.theta / Math.max(3, Math.round(w.theta / 18)));
      const p = polar(deg, this.R - 0.4 - this.rng() * 0.8); const rb = makeBillboard('rubble', 0.6 + this.rng() * 0.5, { frame: Math.floor(this.rng() * 4) });
      rb.position.set(p.x, 0, p.z); const target = rb.scale.clone(); rb.scale.set(0.01, 0.01, 1); this.group.add(rb); (this.rubble ||= []).push(rb);
      tweens.add({ duration: 0.5, delay: dur * 0.6 + k * 0.1, ease: Ease.outBack, onUpdate: (e) => rb.scale.set(Math.max(0.01, target.x * e), Math.max(0.01, target.y * e), 1) });
    }
    await Promise.all(ps);
  }
  async closeBreach(i, dur = 1.6) {
    const key = 'breach' + i; if (!this.breachOpen.has(key)) return; this.breachOpen.delete(key);
    audio.play('gate.open'); this.world.rig.shake(0.2, dur);
    const segs = this.segments.filter((s) => s.tags.has(key));
    await Promise.all(segs.map((s) => tweenTo(s.group.position, { y: 0 }, { duration: dur, ease: Ease.inOutCubic })));
  }
  /** The energy band + lock glyph shatter. */
  async breakLock() {
    if (this.lockBroken) return; this.lockBroken = true;
    audio.play('lock.break');
    const band = this.band, lock = this.gates.exit.lock;
    await tweenValue(0, 1, 0.5, (v) => { band.material.color.setHSL(0.5 + v * 0.2, 1, 0.5 + v * 0.3); band.scale.setScalar(1 + v * 0.03); });
    const start = band.material.opacity;
    await tweenValue(0, 1, 0.9, (v) => { band.material.opacity = start * (1 - v); if (lock) { lock.material.opacity = 1 - v; lock.scale.setScalar(1 + v * 1.5); lock.rotation.z = v * 2; } if (this.lockLight) this.lockLight.color.setHSL(0.45, 1, 0.5 + v * 0.3), (this.lockLight.intensity = 18 * (1 - v)); });
    band.visible = false; if (lock) lock.visible = false;
  }
  /** Red flash on the band when an over-charge hits the reflective wall. */
  flashBand() { const b = this.band; if (!b.visible) return; tweenValue(0, 1, 0.5, (v) => { b.material.opacity = 0.9 + Math.sin(v * Math.PI) * 0.8; b.scale.setScalar(1 + Math.sin(v * Math.PI) * 0.02); }); }

  update(dt, t) {
    for (const tr of this.torches) tr.update(dt);
    if (this.band && this.band.visible && !this.lockBroken) this.band.material.opacity = 0.7 + Math.sin(t * 3) * 0.2;
    const lock = this.gates.exit && this.gates.exit.lock; if (lock && lock.visible && !this.lockBroken) { lock.material.opacity = 0.8 + Math.sin(t * 4) * 0.2; lock.rotation.z = t * 0.4; }
  }
  dispose() {
    this.world.remove(this.group);
    this.group.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
  }
}
