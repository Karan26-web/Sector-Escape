// ---------------------------------------------------------------------------
// ChainWorld – the whole jungle in one scene: a stone causeway across a lake
// → the small gate of ring 1 → seven rings (each open arc leads through a
// breach bay and a shallow lens into the next) → the temple court.
// All wall pieces, bays, pillars and seals come from CHAIN (levels.js).
// ---------------------------------------------------------------------------
import * as THREE from '../../vendor/three.module.js';
import { assets } from '../engine/assets.js';
import { AnimatedSprite, makeBillboard } from '../engine/sprites.js';
import { SpriteCloud } from '../engine/instancedSprites.js';
import { tweens, tweenTo } from '../engine/tween.js';
import { DEG, polar, degDiff, mulberry32, Ease, lerp, toDeg } from '../engine/util.js';
import { CHAIN, GATE, WALL_HEIGHT, onGround } from './levels.js';
import { audio } from '../engine/audio.js';
import { FOCUS, focusable } from '../engine/focus.js';

const SKIES = {
  day:   { bg: 0x9fd4ec, fog: 0x1d3328, hemi: [0xdfeeff, 0x4a5a3a, 1.2], sun: [0xfff1d6, 0.9], amb: 0.25, pano: 0xffffff, sky: 0xffffff, foliage: 0xffffff },
  dusk:  { bg: 0xe8a070, fog: 0x2b1d1a, hemi: [0xffd3a8, 0x4a3a30, 1.1], sun: [0xffb070, 0.8], amb: 0.28, pano: 0xffc8a0, sky: 0xffb888, foliage: 0xf2d2b8 },
  night: { bg: 0x1b2440, fog: 0x141c2e, hemi: [0x8a9fd8, 0x30403a, 1.15], sun: [0x8090c0, 0.5], amb: 0.55, pano: 0x4a5a80, sky: 0x3a4a86, foliage: 0x7c8eb4 },
  storm: { bg: 0x515a6a, fog: 0x2b1f12, hemi: [0xb0b8c8, 0x303838, 1.0], sun: [0xc0c8d0, 0.6], amb: 0.35, pano: 0x9aa0a8, sky: 0x8a929c, foliage: 0xb4bcc6 },
};
const T = 1.0;          // wall thickness
const WATER_Y = -0.7;

export class ChainWorld {
  constructor(world, fx) {
    this.world = world; this.fx = fx; this.group = new THREE.Group(); world.add(this.group);
    this.H = WALL_HEIGHT; this.rng = mulberry32(4242);
    this.rings = []; this.seals = []; this.hatches = []; this.animTorches = []; this.lights = []; this.pillarMeshes = []; this.waterMats = []; this.wallPieces = []; this.cutRing = -1; this.keepSeals = false; this.fadeOff = false;
    this.skyName = null; this.fogDensity = 0.0034; this.activeIndex = -1; this.focusIndex = -1;
    this.tint = { pano: new THREE.Color(0xffffff), sky: new THREE.Color(0xffffff), foliage: new THREE.Color(0xffffff) };
    this.build();
  }
  rnd(a = 0, b = 1) { return a + this.rng() * (b - a); }

  /* ================================================================ build */
  build() {
    const scene = this.world.scene, B = CHAIN.bounds;
    scene.background = new THREE.Color(SKIES.day.bg); scene.fog = new THREE.FogExp2(new THREE.Color(SKIES.day.fog), this.fogDensity);
    this.hemi = new THREE.HemisphereLight(0xdfeeff, 0x4a5a3a, 1.2); this.sun = new THREE.DirectionalLight(0xfff1d6, 0.9); this.sun.position.set(30, 60, 20); this.amb = new THREE.AmbientLight(0xffffff, 0.25);
    this.group.add(this.hemi, this.sun, this.amb);
    for (let i = 0; i < 4; i++) { const pl = new THREE.PointLight(0xff9a3a, 26, 24, 2); pl.visible = false; pl.userData.base = 26; pl.userData.phase = Math.random() * 10; this.group.add(pl); this.lights.push(pl); }
    const mid = new THREE.Vector3(B.cx, 0, B.cz);
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(540, 32, 16), new THREE.MeshBasicMaterial({ map: assets.texture('sky', { wrap: false }), side: THREE.BackSide, fog: false })); this.sky.position.copy(mid); this.sky.position.y = -40; this.group.add(this.sky);
    const fade = document.createElement('canvas'); fade.width = 4; fade.height = 256; const fg = fade.getContext('2d'); const grd = fg.createLinearGradient(0, 0, 0, 256); grd.addColorStop(0, '#000'); grd.addColorStop(0.3, '#000'); grd.addColorStop(0.46, '#fff'); grd.addColorStop(1, '#fff'); fg.fillStyle = grd; fg.fillRect(0, 0, 4, 256);
    this.pano = new THREE.Mesh(new THREE.CylinderGeometry(260, 260, 130, 64, 1, true), new THREE.MeshBasicMaterial({ map: assets.texture('jungle_panorama', { wrap: true }), alphaMap: new THREE.CanvasTexture(fade), transparent: true, depthWrite: false, side: THREE.BackSide, fog: false })); this.pano.position.copy(mid); this.pano.position.y = 44; this.pano.renderOrder = -5; this.group.add(this.pano);
    this.buildGroundAndLake();
    this.buildCauseway();
    for (const ring of CHAIN.all) this.buildRing(ring);
    for (const a of CHAIN.arenas) if (a.bay) this.buildBay(a);
    this.buildPillars();
    this.startGate = this.buildGate(CHAIN.arenas[0]);
    this.buildTemple();
    for (const a of CHAIN.arenas) this.seals[a.index] = this.buildSeal(a);
    this.buildJungle();
    this.buildFireflies();
    this.group.traverse((o) => { if (!o.material) return; for (const m of Array.isArray(o.material) ? o.material : [o.material]) if (m.isMeshLambertMaterial) focusable(m); });
  }

  /* ---------------------------------------------------------------- ground with a lake hole */
  lakeOutline() {
    if (this._lake) return this._lake;
    const cw = CHAIN.causeway, x0 = cw.start.x - 12, x1 = cw.gate.x - 3.2, cx = (x0 + x1) / 2, ax = (x1 - x0) / 2, az = 16, pts = [];
    for (let k = 0; k < 72; k++) {
      const t = (k / 72) * Math.PI * 2, n = 1 + 0.12 * Math.sin(t * 3 + 1.3) + 0.07 * Math.sin(t * 7 + 0.4) + 0.05 * Math.sin(t * 11 + 2.1);
      const east = Math.cos(t) > 0 ? Math.pow(Math.cos(t), 0.6) : Math.cos(t);       // flatter east end at the gate
      pts.push(new THREE.Vector2(cx + ax * east * (0.96 + 0.04 * n), (az * Math.sin(t) * n) * (0.7 + 0.3 * (1 - Math.abs(Math.cos(t))))));
    }
    this._lake = pts; return pts;
  }
  insideLake(x, z, pad = 0) {
    const pts = this.lakeOutline(); let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const a = pts[i], b = pts[j]; if (((a.y > -z) !== (b.y > -z)) && x < ((b.x - a.x) * (-z - a.y)) / (b.y - a.y) + a.x) inside = !inside; }
    if (!inside || pad <= 0) return inside;
    return pts.every((p) => Math.hypot(p.x - x, p.y + z) > pad);
  }
  buildGroundAndLake() {
    const B = CHAIN.bounds, x0 = B.minX - 190, x1 = B.maxX + 190, z0 = B.minZ - 190, z1 = B.maxZ + 190;
    const shape = new THREE.Shape([new THREE.Vector2(x0, -z1), new THREE.Vector2(x1, -z1), new THREE.Vector2(x1, -z0), new THREE.Vector2(x0, -z0)]);
    shape.holes.push(new THREE.Path([...this.lakeOutline()].reverse()));
    const gTex = assets.texture('ground_jungle', { repeat: [1 / 12, 1 / 12] });
    const ground = new THREE.Mesh(new THREE.ShapeGeometry(shape, 4), new THREE.MeshLambertMaterial({ map: gTex, color: 0xc4ceb4 }));
    ground.rotation.x = -Math.PI / 2; ground.position.y = -0.02; this.group.add(ground);
    // lake: base + additive shimmer, slightly larger than the hole
    const lakeShape = new THREE.Shape(this.lakeOutline().map((p) => new THREE.Vector2(p.x + Math.sign(p.x - CHAIN.causeway.start.x) * 0.0, p.y)));
    for (const [opacity, additive, speed] of [[1, false, 1], [0.2, true, -0.6]]) {
      const tex = assets.texture('water', { repeat: [1 / 9, 1 / 9] }).clone(); tex.needsUpdate = true;
      const m = new THREE.Mesh(new THREE.ShapeGeometry(lakeShape, 4), new THREE.MeshLambertMaterial({ map: tex, color: additive ? 0x8fe8e0 : 0x9fd8d0, transparent: additive, opacity, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, depthWrite: !additive }));
      m.rotation.x = -Math.PI / 2; m.position.y = WATER_Y + (additive ? 0.02 : 0); this.group.add(m); this.waterMats.push({ tex, speed });
    }
    // dark bank skirt so the ground edge reads as a shore, not a cut
    const skirtPts = []; for (const p of this.lakeOutline()) skirtPts.push(p);
    const skirtGeo = new THREE.BufferGeometry(); const pos = [];
    for (let i = 0; i < skirtPts.length; i++) { const a = skirtPts[i], b = skirtPts[(i + 1) % skirtPts.length]; pos.push(a.x, -0.02, -a.y, b.x, -0.02, -b.y, b.x, WATER_Y - 0.1, -b.y, a.x, -0.02, -a.y, b.x, WATER_Y - 0.1, -b.y, a.x, WATER_Y - 0.1, -a.y); }
    skirtGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); skirtGeo.computeVertexNormals();
    this.group.add(new THREE.Mesh(skirtGeo, new THREE.MeshLambertMaterial({ color: 0x5a5340, side: THREE.DoubleSide })));
  }

  /* ---------------------------------------------------------------- walls */
  wallArc(R, a0deg, a1deg, col, { tex = 'arena_wall', tileW = this.H, height = this.H } = {}) {
    const H = height, a0 = a0deg * DEG, len = (a1deg - a0deg) * DEG;
    const segs = Math.max(2, Math.ceil(len / (3 * DEG)));
    const mkTex = (radius) => { const t = assets.texture(tex, {}).clone(); t.needsUpdate = true; t.repeat.set((len * radius) / tileW, 1); t.offset.set((a0 * radius) / tileW, 0); return t; };
    const inner = new THREE.Mesh(new THREE.CylinderGeometry(R, R, H, segs, 1, true, a0 + Math.PI / 2, len), new THREE.MeshLambertMaterial({ map: mkTex(R), color: col, side: THREE.BackSide }));
    const outer = new THREE.Mesh(new THREE.CylinderGeometry(R + T, R + T, H, segs, 1, true, a0 + Math.PI / 2, len), new THREE.MeshLambertMaterial({ map: mkTex(R + T), color: col.clone().multiplyScalar(0.8) }));
    inner.position.y = H / 2; outer.position.y = H / 2;
    const topTex = assets.texture('wall_top', {}).clone(); topTex.needsUpdate = true; topTex.repeat.set((len * R) / 4, 1);
    const top = new THREE.Mesh(new THREE.RingGeometry(R - 0.02, R + T + 0.02, segs, 1, a0, len), new THREE.MeshLambertMaterial({ map: topTex, color: 0xb8b8a8, side: THREE.DoubleSide }));
    top.rotation.x = -Math.PI / 2; top.position.y = H;
    const g = new THREE.Group(); g.add(inner, outer, top); return g;
  }
  splitArcs(arcs, maxDeg = 30) { const out = []; for (const r of arcs) { const n = Math.max(1, Math.ceil((r.a1 - r.a0) / maxDeg)); for (let k = 0; k < n; k++) out.push([r.a0 + ((r.a1 - r.a0) * k) / n, r.a0 + ((r.a1 - r.a0) * (k + 1)) / n]); } return out; }

  buildRing(ring) {
    const R = ring.R, H = this.H, env = ring.level ? ring.level.env : ring.env;
    const g = new THREE.Group(); g.position.set(ring.center.x, 0, ring.center.z); this.group.add(g);
    const floorY = 0.003 * ring.index;
    const floor = new THREE.Mesh(new THREE.CircleGeometry(R, 96), new THREE.MeshLambertMaterial({ map: assets.texture('arena_floor', { wrap: false }), color: new THREE.Color(env.floor).multiplyScalar(1.12), alphaTest: 0.5, polygonOffset: true, polygonOffsetFactor: -(ring.index + 1), polygonOffsetUnits: -2 }));
    floor.rotation.x = -Math.PI / 2; floor.position.y = floorY; g.add(floor);
    const col = new THREE.Color(env.wall);
    for (const [a0, a1] of this.splitArcs(ring.wallArcs)) { const w = this.wallArc(R, a0, a1, col); g.add(w); this.wallPieces.push({ g: w, ring: ring.index, mid: (a0 + a1) / 2, a0, a1, mats: w.children.map((c) => c.material), k: 1 }); }
    // torches evenly along the kept wall, never at a wall end
    const torchPos = [], total = ring.wallArcs.reduce((s, r) => s + (r.a1 - r.a0), 0), every = Math.max(28, total / Math.max(4, env.torches));
    for (const r of ring.wallArcs) {
      for (let deg = r.a0 + Math.min(every / 2, (r.a1 - r.a0) / 2); deg < r.a1 - 6; deg += every) {
        if (deg < r.a0 + 6) continue;
        const spr = new AnimatedSprite('torch', { worldHeight: 1.5, center: [0.5, 0.2] }); spr.time = this.rnd(0, 10);
        const p = polar(deg, R - 0.45); spr.sprite.position.set(p.x, H * 0.5, p.z); g.add(spr.sprite); this.animTorches.push({ spr, ring: ring.index, deg, k: 1, cut: 1 });
        const lp = polar(deg, R - 1.4); torchPos.push(new THREE.Vector3(ring.center.x + lp.x, H * 0.55, ring.center.z + lp.z));
      }
    }
    let hatch = null;
    if (ring.level) { hatch = this.buildHatch(floorY); g.add(hatch.group); this.hatches[ring.index] = hatch; }
    this.rings[ring.index] = { group: g, torchPos, floorY, hatch, arena: ring, wallColor: col };
  }

  buildBay(a) {
    const env = a.level.env, col = new THREE.Color(env.wall), D = a.bay.D, Rb = a.R + D, H = this.H;
    const g = new THREE.Group(); g.position.set(a.center.x, 0, a.center.z); this.group.add(g);
    const tex = assets.texture('causeway_stone', { repeat: [Rb / 3, Rb / 3] });
    const floor = new THREE.Mesh(new THREE.RingGeometry(a.R - 0.1, Rb + 0.05, Math.max(12, Math.round(a.theta / 3)), 1, (a.exitDeg - a.theta / 2) * DEG, a.theta * DEG),
      new THREE.MeshLambertMaterial({ map: tex, color: new THREE.Color(env.floor).multiplyScalar(1.05), polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }));
    floor.rotation.x = -Math.PI / 2; floor.position.y = -0.006; g.add(floor);
    for (const [a0, a1] of this.splitArcs(a.bay.outerArcs, 24)) g.add(this.wallArc(Rb, a0, a1, col));
    for (const w of a.bay.radials) {
      const r1 = w.r1 >= Rb - 0.05 ? w.r1 + T : w.r1, L = r1 - w.r0; if (L < 0.3) continue;   // reach the outer wall's far face: closed corner, no column
      const wt = assets.texture('arena_wall', {}).clone(); wt.needsUpdate = true; wt.repeat.set(L / H, 1);
      const side = new THREE.MeshLambertMaterial({ map: wt, color: col }), topM = new THREE.MeshLambertMaterial({ map: assets.texture('wall_top', {}), color: 0xb8b8a8 });
      const Hb = H + 0.03;   // a hair above the ring wall's cap where they overlap at the inner corner (no z-fight)
      const box = new THREE.Mesh(new THREE.BoxGeometry(T, Hb, L), [side, side, topM, topM, side, side]);
      const mp = polar(w.deg, (w.r0 + r1) / 2); box.position.set(mp.x, Hb / 2, mp.z);
      const u = polar(w.deg, 1); box.rotation.y = Math.atan2(u.x, u.z);
      // nudge outward so the wall face lines up with the sector's radial line
      const n = polar(w.deg + 90 * Math.sign(degDiff(a.exitDeg, w.deg)), T / 2); box.position.x += n.x; box.position.z += n.z;
      g.add(box);
    }
  }
  /** Cut the wall_pillar art into capital / shaft / base bands (opaque crops on a stone backing) for stacked cylinders. */
  pillarArt() {
    if (this._pillarArt !== undefined) return this._pillarArt;
    this._pillarArt = null;
    try {
      const img = assets.get('wall_pillar'); if (!img) return null;
      const W = img.width || img.naturalWidth, Hh = img.height || img.naturalHeight;
      const cv = document.createElement('canvas'); cv.width = W; cv.height = Hh; const g = cv.getContext('2d'); g.drawImage(img, 0, 0);
      const d = g.getImageData(0, 0, W, Hh).data, spans = [];
      for (let y = 0; y < Hh; y++) { let x0 = -1, x1 = -1; for (let x = 0; x < W; x++) if (d[(y * W + x) * 4 + 3] > 200) { if (x0 < 0) x0 = x; x1 = x; } spans.push(x0 < 0 ? null : [x0, x1, x1 - x0]); }
      const rows = (a, b) => spans.slice(Math.round(a * Hh), Math.round(b * Hh)).filter(Boolean);
      const shaftW = rows(0.4, 0.65).map((s2) => s2[2]).sort((p, q) => p - q)[Math.floor(rows(0.4, 0.65).length / 2)];
      let capEnd = Math.round(0.08 * Hh); while (capEnd < Hh * 0.45 && !(spans[capEnd] && spans[capEnd][2] <= shaftW * 1.1 && spans[capEnd + 6] && spans[capEnd + 6][2] <= shaftW * 1.1)) capEnd++;
      let baseStart = Math.round(0.95 * Hh); while (baseStart > Hh * 0.55 && !(spans[baseStart] && spans[baseStart][2] <= shaftW * 1.1 && spans[baseStart - 6] && spans[baseStart - 6][2] <= shaftW * 1.1)) baseStart--;
      const top = spans.findIndex(Boolean), bottom = Hh - 1 - [...spans].reverse().findIndex(Boolean);
      const band = (y0, y1) => {
        const rs = spans.slice(y0, y1).filter(Boolean), maxW = Math.max(...rs.map((r) => r[2])), core = rs.filter((r) => r[2] >= maxW * 0.9);
        const x0 = Math.max(...core.map((r) => r[0])) + 2, x1 = Math.min(...core.map((r) => r[1])) - 2;
        const c = document.createElement('canvas'); c.width = Math.max(8, x1 - x0); c.height = Math.max(8, y1 - y0); const cg = c.getContext('2d');
        cg.fillStyle = '#4a463a'; cg.fillRect(0, 0, c.width, c.height); cg.drawImage(img, x0, y0, x1 - x0, y1 - y0, 0, 0, c.width, c.height);
        const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.ClampToEdgeWrapping; t.anisotropy = 4;
        return { tex: t, w: x1 - x0, h: y1 - y0, maxW };
      };
      const cap = band(top, capEnd), shaft = band(capEnd, baseStart), base = band(baseStart, bottom + 1), total = bottom + 1 - top;
      this._pillarArt = { cap, shaft, base, fr: { cap: cap.h / total, shaft: shaft.h / total, base: base.h / total }, shaftW };
    } catch (e) { console.warn('[pillar art]', e); }
    return this._pillarArt;
  }
  buildPillars() {
    const H = this.H, Hp = H + 0.35, art = this.pillarArt(), capTex = assets.texture('wall_top', {});
    const oldTex = assets.texture('arena_wall', {}).clone(); oldTex.needsUpdate = true; oldTex.repeat.set(0.6, 1.1);
    for (const p of CHAIN.pillars) {
      const g = new THREE.Group(); g.position.set(p.x, 0, p.z); const mats = [];
      if (art) {
        const rS = 0.64, hS = Hp * art.fr.shaft, hB = Hp * art.fr.base, hC = Hp * art.fr.cap;
        const part = (b, r0, r1, h, y) => {
          const tex = b.tex.clone(); tex.needsUpdate = true;
          const natural = (b.w / b.h) * h, around = Math.max(2, Math.round((2 * Math.PI * Math.max(r0, r1)) / natural)); tex.repeat.set(around, 1);
          const side = new THREE.MeshLambertMaterial({ map: tex }), topM = new THREE.MeshLambertMaterial({ map: capTex, color: 0xb8b8a8 }), bot = new THREE.MeshLambertMaterial({ color: 0x3a372e });
          const m = new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, h, 16), [side, topM, bot]); m.position.y = y + h / 2; g.add(m); mats.push(side, topM, bot);
        };
        const rB = Math.min(0.98, rS * (art.base.w / art.shaftW)), rC = Math.min(0.98, rS * (art.cap.w / art.shaftW));
        part(art.base, rB * 0.97, rB, hB, 0);
        part(art.shaft, rS, rS, hS, hB);
        part(art.cap, rC, rC * 0.92, hC, hB + hS);
      } else {
        const ring = CHAIN.all.reduce((best, o) => (Math.abs(Math.hypot(p.x - o.center.x, p.z - o.center.z) - o.R) < Math.abs(Math.hypot(p.x - best.center.x, p.z - best.center.z) - best.R) ? o : best), CHAIN.all[0]);
        const col = new THREE.Color((ring.level ? ring.level.env : ring.env).wall);
        const body = new THREE.MeshLambertMaterial({ map: oldTex, color: col.clone().multiplyScalar(0.92) }), cap = new THREE.MeshLambertMaterial({ map: capTex, color: 0xb8b8a8 });
        const m = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.9, H + 0.5, 12), body); m.position.y = (H + 0.5) / 2;
        const c = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 0.8, 0.5, 12), cap); c.position.y = H + 0.75; g.add(m, c); mats.push(body, cap);
      }
      this.group.add(g);
      const ringOf = CHAIN.all.find((o) => Math.abs(Math.hypot(p.x - o.center.x, p.z - o.center.z) - o.R) < 1.2);
      this.pillarMeshes.push({ g, mats, k: 1, ring: ringOf ? ringOf.index : -1, mid: ringOf ? toDeg(p.x - ringOf.center.x, p.z - ringOf.center.z) : 0 });
    }
  }

  /* ---------------------------------------------------------------- hatch (buried gun cap) */
  buildHatch(floorY) {
    const g = new THREE.Group(); g.rotation.x = -Math.PI / 2; g.position.y = floorY + 0.03;
    const shaft = new THREE.Mesh(new THREE.CircleGeometry(1.6, 40), new THREE.MeshBasicMaterial({ color: 0x050807, polygonOffset: true, polygonOffsetFactor: -20, polygonOffsetUnits: -3 })); shaft.position.z = -0.01; g.add(shaft);
    const tex = assets.texture('floor_hatch', { wrap: false });
    const mk = (start) => new THREE.Mesh(new THREE.CircleGeometry(1.66, 40, start, Math.PI), new THREE.MeshLambertMaterial({ map: tex, transparent: true, alphaTest: 0.5, polygonOffset: true, polygonOffsetFactor: -30, polygonOffsetUnits: -4 }));
    const a = mk(-Math.PI / 2), b = mk(Math.PI / 2); g.add(a, b);
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.76, 1.92, 64), new THREE.MeshBasicMaterial({ color: 0x52ded8, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); ring.position.z = 0.02; g.add(ring);
    return { group: g, halves: [a, b], ring, shaft, open: false, glow: 0 };
  }
  async openHatch(i, dur = 1.0) {
    const h = this.hatches[i]; if (!h || h.open) return; h.open = true; audio.play('hatch.open');
    const C = this.rings[i].arena.center; this.fx.dust(new THREE.Vector3(C.x, 0, C.z), 4, 0xd8d0b8, 1.1);
    await Promise.all(h.halves.map((m, k) => tweenTo(m.position, { x: (k === 0 ? 1 : -1) * 2.2, z: -0.22 }, { duration: dur, ease: Ease.inOutCubic })));
    h.halves.forEach((m) => (m.visible = false));
  }
  closeHatch(i) { const h = this.hatches[i]; if (!h) return; h.open = false; h.halves.forEach((m) => { m.visible = true; m.position.set(0, 0, 0); }); h.glow = 0; h.ring.material.opacity = 0; }
  setHatchGlow(i, on) { const h = this.hatches[i]; if (h) h.glow = on ? 1 : 0; }

  /* ---------------------------------------------------------------- gate of ring 1 */
  /** Ring 1's gate as a real archway: carved frame on both faces, a stone passage through the wall thickness, and an
   *  arch-shaped door that exactly fills the opening (so it can never overlap the arch stones). */
  buildGate(a) {
    const o = a.gate, R = a.R, H = this.H, slot = GATE.smallWidth;
    const fdef = assets.def('gate_small_frame') || {}; const openingF = fdef.opening ?? 0.46, top = fdef.top ?? 0.3;
    const W = Math.min(slot / openingF, H * 1.15), ow = W * openingF, apex = W * (1 - top), spring = Math.max(0.6, apex - ow / 2);
    const frameTex = assets.texture('gate_small_frame', { wrap: false }), doorTex = assets.texture('gate_small_door', { wrap: false });
    const g = new THREE.Group(); g.position.set(a.center.x, 0, a.center.z); this.group.add(g);
    const ang = o.deg * DEG, rotY = Math.atan2(-Math.cos(ang), Math.sin(ang)), mid = polar(o.deg, R + T / 2);
    const arch = new THREE.Group(); arch.position.set(mid.x, 0, mid.z); arch.rotation.y = rotY; g.add(arch);   // local x along the wall, y up, z through it
    // both carved frames are bent onto the wall's curve (a flat card would sink behind the concave inner face of a small ring)
    const Rm = R + T / 2, rIn = R - 0.06, rOut = R + T + 0.06, zAt = (r, x) => Rm - Math.sqrt(r * r - x * x);   // local z of the wall face at lateral x
    for (const r of [rIn, rOut]) {
      const fg = new THREE.PlaneGeometry(W, W, 24, 1); if (r === rOut) fg.rotateY(Math.PI);   // outer frame faces out of the ring
      const fp = fg.attributes.position;
      for (let i = 0; i < fp.count; i++) { const x = fp.getX(i), ph = x / r; fp.setXYZ(i, r * Math.sin(ph), fp.getY(i) + W / 2, Rm - r * Math.cos(ph)); }
      fg.computeVertexNormals();
      arch.add(new THREE.Mesh(fg, new THREE.MeshLambertMaterial({ map: frameTex, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide })));
    }
    // the passage: jambs + arch vault extruded through the wall
    const outline = [[-ow / 2, 0], [-ow / 2, spring]];
    for (let k = 1; k < 24; k++) { const t = Math.PI - (Math.PI * k) / 24; outline.push([Math.cos(t) * ow / 2, spring + Math.sin(t) * ow / 2]); }
    outline.push([ow / 2, spring], [ow / 2, 0]);
    const pos = [], uv = []; let acc = 0;
    for (let k = 0; k < outline.length - 1; k++) {
      const [x0, y0] = outline[k], [x1, y1] = outline[k + 1], len = Math.hypot(x1 - x0, y1 - y0), u0 = acc / 3, u1 = (acc + len) / 3; acc += len;
      const a0 = zAt(rOut, x0), a1 = zAt(rOut, x1), b0 = zAt(rIn, x0), b1 = zAt(rIn, x1);   // the passage runs frame to frame
      pos.push(x0, y0, a0, x1, y1, a1, x1, y1, b1, x0, y0, a0, x1, y1, b1, x0, y0, b0);
      uv.push(u0, 0, u1, 0, u1, 1, u0, 0, u1, 1, u0, 1);
    }
    const tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); tg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); tg.computeVertexNormals();
    const tt = assets.texture('arena_wall', {}).clone(); tt.needsUpdate = true; tt.repeat.set(1, 0.35);
    arch.add(new THREE.Mesh(tg, new THREE.MeshLambertMaterial({ map: tt, color: 0x8f8878, side: THREE.DoubleSide })));
    // the door: an arch-shaped leaf in the middle of the passage
    const e = 0.03, shape = new THREE.Shape();
    shape.moveTo(-ow / 2 + e, 0); shape.lineTo(-ow / 2 + e, spring); shape.absarc(0, spring, ow / 2 - e, Math.PI, 0, true); shape.lineTo(ow / 2 - e, 0); shape.closePath();
    const lg = new THREE.ShapeGeometry(shape, 24), lp = lg.attributes.position, luv = lg.attributes.uv;
    for (let i = 0; i < lp.count; i++) luv.setXY(i, (lp.getX(i) + ow / 2) / ow, lp.getY(i) / apex);
    const leaf = new THREE.Mesh(lg, new THREE.MeshLambertMaterial({ map: doorTex, side: THREE.DoubleSide, alphaTest: 0.5 }));
    arch.add(leaf);
    const mats = []; g.traverse((c) => { if (c.material) mats.push(c.material); });
    this.wallPieces.push({ g, ring: a.index, mid: o.deg, mats, k: 1 });   // the gate cuts away with its wall
    return { group: g, leaf, doorH: apex, openY: -(apex + 0.25), open: false, worldPos: new THREE.Vector3(a.center.x + mid.x, 0, a.center.z + mid.z) };
  }
  async openStartGate(dur = 1.4) { const g = this.startGate; if (g.open) return; g.open = true; audio.play('gate.open'); this.world.rig.shake(0.06, dur); await tweenTo(g.leaf.position, { y: g.openY }, { duration: dur, ease: Ease.inOutCubic }); }
  async closeStartGate(dur = 0.55) {
    const g = this.startGate; if (!g.open) return; g.open = false; audio.play('gate.slam');
    await tweenTo(g.leaf.position, { y: 0 }, { duration: dur, ease: Ease.inCubic });
    this.world.rig.shake(0.35, 0.4); this.fx.dust(g.worldPos.clone(), 6, 0xd8d0b8, 1.4);
  }
  resetStartGate(open = false) { const g = this.startGate; g.open = open; g.leaf.position.y = open ? g.openY : 0; }

  /* ---------------------------------------------------------------- seals: the missing arc of the next ring rises */
  buildSeal(a) {
    const next = CHAIN.all[a.seal.ring], H = this.H, col = new THREE.Color(0xffffff);
    const g = new THREE.Group(); g.position.set(next.center.x, -H - 0.6, next.center.z); g.visible = false; this.group.add(g);
    for (const [a0, a1] of this.splitArcs(a.seal.arcs, 24)) { const w = this.wallArc(next.R, a0, a1, col, { tex: 'seal_slab', tileW: H }); g.add(w); this.wallPieces.push({ g: w, ring: next.index, mid: (a0 + a1) / 2, a0, a1, seal: true, mats: w.children.map((c) => c.material), k: 1 }); }
    const r = a.seal.arcs[0], midDeg = (r.a0 + r.a1) / 2, glowP = polar(midDeg, next.R - 0.3);
    const glow = new THREE.PointLight(0xff5040, 0, 14, 2); glow.position.set(glowP.x, 3, glowP.z); g.add(glow);
    return { group: g, up: false, H, glow, mid: { x: next.center.x + polar(midDeg, next.R).x, z: next.center.z + polar(midDeg, next.R).z }, ring: a.seal.ring };
  }
  async raiseSeal(i, instant = false) {
    const s = this.seals[i]; if (!s || s.up) return; s.up = true; s.group.visible = true;
    if (instant) { s.group.position.y = 0; s.glow.intensity = 4; return; }
    audio.play('seal.slam'); this.world.rig.shake(0.2, 0.9);
    await tweenTo(s.group.position, { y: 0 }, { duration: 0.85, ease: Ease.outCubic });
    tweens.add({ duration: 1.2, onUpdate: (e) => { s.glow.intensity = 14 * (1 - e) + 4 * e; } });
    this.world.rig.shake(0.45, 0.4);
    for (let k = 0; k < 6; k++) this.fx.dust(new THREE.Vector3(s.mid.x + (Math.random() - 0.5) * 7, 0, s.mid.z + (Math.random() - 0.5) * 7), 2, 0xd8d0b8, 1.6);
  }
  lowerSeal(i) { const s = this.seals[i]; if (!s) return; s.up = false; s.group.position.y = -s.H - 0.6; s.group.visible = false; s.glow.intensity = 0; }

  /* ---------------------------------------------------------------- causeway */
  buildCauseway() {
    const cw = CHAIN.causeway, L = Math.hypot(cw.gate.x - cw.start.x, cw.gate.z - cw.start.z) + 2, w = cw.width;
    const g = new THREE.Group(); g.position.set((cw.start.x + cw.gate.x) / 2, 0, (cw.start.z + cw.gate.z) / 2); g.rotation.y = cw.dirDeg * DEG; this.group.add(g);
    const deckGeo = new THREE.PlaneGeometry(w, L); deckGeo.rotateX(-Math.PI / 2); deckGeo.rotateY(-Math.PI / 2);   // V (the path direction in the texture) runs along the causeway
    const top = new THREE.Mesh(deckGeo, new THREE.MeshLambertMaterial({ map: assets.texture('causeway_stone', { repeat: [1, L / 8] }), color: 0xffffff })); top.position.y = 0.005; g.add(top);
    const sideTex = assets.texture('causeway_side', { repeat: [L / 6, 1] });
    const under = new THREE.Mesh(new THREE.BoxGeometry(L, 1.6, w + 1.0), new THREE.MeshLambertMaterial({ map: sideTex, color: 0x9aa094 })); under.position.y = -0.82; g.add(under);
    // parapets stop inside ring 1's wall thickness (they used to poke through into the ring beside the gate)
    const a0 = CHAIN.arenas[0], lat = w / 2 + 0.25, pEnd = L / 2 - 1 - (Math.sqrt((a0.R + T) ** 2 - lat * lat) - 0.08 - a0.R), pLen = pEnd + L / 2;
    for (const s of [-1, 1]) {
      const par = new THREE.Mesh(new THREE.BoxGeometry(pLen, 0.9, 0.5), new THREE.MeshLambertMaterial({ map: sideTex, color: 0xb8bcae })); par.position.set((pEnd - L / 2) / 2, 0.45, s * lat); g.add(par);
      for (let x = -L / 2 + 9; x < L / 2 - 4; x += 9) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.34, 1.2, 0.34), new THREE.MeshLambertMaterial({ color: 0x4a4f55 })); post.position.set(x, 1.4, s * (w / 2 + 0.25)); g.add(post);
        const spr = new AnimatedSprite('torch', { worldHeight: 1.5, center: [0.5, 0.2] }); spr.time = this.rnd(0, 10); spr.sprite.position.set(x, 1.9, s * (w / 2 + 0.25)); g.add(spr.sprite); this.animTorches.push({ spr, ring: -1, k: 1 });
      }
    }
  }

  /* ---------------------------------------------------------------- temple gate (end of the chain) */
  buildTemple() {
    const S = CHAIN.sanctuary, o = S.gate, R = S.R, H = this.H;
    const fdef = assets.def('gate_large_frame') || {}; const openingF = fdef.opening ?? 0.444;
    const W = Math.min(GATE.templeWidth / openingF, H * 1.5);
    const g = new THREE.Group(); g.position.set(S.center.x, 0, S.center.z); this.group.add(g);
    const ang = o.deg * DEG, rotY = Math.atan2(-Math.cos(ang), Math.sin(ang)), frameTex = assets.texture('gate_large_frame', { wrap: false });
    for (const [radius, outward] of [[R - 0.08, false], [R + T + 0.08, true]]) { const p = polar(o.deg, radius); const m = new THREE.Mesh(new THREE.PlaneGeometry(W, W), new THREE.MeshLambertMaterial({ map: frameTex, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide })); m.position.set(p.x, W / 2, p.z); m.rotation.y = rotY + (outward ? Math.PI : 0); g.add(m); }
    this.wallPieces.push({ g, ring: S.index, mid: o.deg, mats: g.children.map((c) => c.material), k: 1 });
    const dp = polar(o.deg, R + T / 2);
    this.templeGlow = makeBillboard('fx_glow', 6, { additive: true, tint: 0xffd080, centerY: 0.5 }); this.templeGlow.position.set(dp.x, 2.6, dp.z); this.templeGlow.material.opacity = 0.55; g.add(this.templeGlow);
    const pl = new THREE.PointLight(0xffc070, 30, 22, 2); pl.position.set(dp.x, 3, dp.z); g.add(pl); this.templeLight = pl;
    const pathL = 18, pm = polar(o.deg, R + T + pathL / 2);
    const pathGeo = new THREE.PlaneGeometry(GATE.templeWidth, pathL); pathGeo.rotateX(-Math.PI / 2); pathGeo.rotateY((o.deg - 90) * DEG);
    const path = new THREE.Mesh(pathGeo, new THREE.MeshLambertMaterial({ map: assets.texture('causeway_stone', { repeat: [1, pathL / 8] }) })); path.position.set(pm.x, 0.01, pm.z); g.add(path);
    const ep = polar(o.deg, R + T + pathL); const esc = makeBillboard('fx_glow', 22, { additive: true, tint: 0xfff0c0, centerY: 0.5 }); esc.position.set(ep.x, 5, ep.z); esc.material.opacity = 0.7; g.add(esc); this.escapeGlow = esc;
  }

  /* ---------------------------------------------------------------- foliage: three layers, clustered, with breathing room */
  buildJungle() {
    const cw = CHAIN.causeway, S = CHAIN.sanctuary, B = CHAIN.bounds;
    const trees = new SpriteCloud('jungle_tree', 900), plants = new SpriteCloud('jungle_plant', 360), rocks = new SpriteCloud('jungle_rocks', 360);
    // redesigned foliage: when the canopy-mass / distant-silhouette sheets exist, one sprite replaces a hand-built cluster
    const canopyReal = assets.status.get('jungle_canopy') === 'file', distantReal = assets.status.get('forest_silhouette') === 'file';
    const canopy = canopyReal ? new SpriteCloud('jungle_canopy', 260) : null, distant = distantReal ? new SpriteCloud('forest_silhouette', 160) : null;
    const onCauseway = (x, z, m) => x > cw.start.x - 3 - m && x < cw.gate.x + 1 && Math.abs(z - cw.gate.z) < cw.width / 2 + 0.8 + m;
    const onTemplePath = (x, z, m) => x > S.gatePos.x - 3 - m && x < S.escape.x + 14 && Math.abs(z - S.gatePos.z) < 4.5 + m;
    const blocked = (x, z, m) => onGround(x, z, -m) || onCauseway(x, z, m) || onTemplePath(x, z, m) || this.insideLake(x, z) || (m > 2 && this.insideLake(x, z, -m));
    const nearLake = (x, z, m) => !this.insideLake(x, z) && this.lakeOutline().some((p) => Math.hypot(p.x - x, p.y + z) < m);
    const clusters = [];
    const cluster = (x, z, { n = [3, 6], big = 11, small = 7.5, shade = 0.95, spread = 2.6, minGap = 9, keep = 3.2 } = {}) => {
      if (blocked(x, z, keep + 1.5) || clusters.some((c) => Math.hypot(c.x - x, c.z - z) < minGap)) return false;
      clusters.push({ x, z });
      if (canopy) { canopy.add(x, 0, z, big + this.rnd(0, 2.5), Math.floor(this.rng() * 4), shade * this.rnd(0.9, 1)); if (this.rng() < 0.5) { const a = this.rng() * Math.PI * 2, tx = x + Math.cos(a) * (spread + 1.6), tz = z + Math.sin(a) * (spread + 1.6); if (!blocked(tx, tz, keep)) trees.add(tx, 0, tz, small, Math.floor(this.rng() * 4), shade * 0.92); } return true; }
      const count = n[0] + Math.floor(this.rng() * (n[1] - n[0] + 1));
      for (let k = 0; k < count; k++) {
        const a = this.rng() * Math.PI * 2, r = k === 0 ? 0 : 1.1 + this.rng() * spread, tx = x + Math.cos(a) * r, tz = z + Math.sin(a) * r;
        if (blocked(tx, tz, keep)) continue;
        trees.add(tx, 0, tz, (k === 0 ? big : small) + this.rnd(0, 2.5), Math.floor(this.rng() * 4), shade * this.rnd(0.86, 1));
      }
      for (let k = 0; k < 2; k++) { const a = this.rng() * Math.PI * 2, tx = x + Math.cos(a) * (spread + 1.4), tz = z + Math.sin(a) * (spread + 1.4); if (!blocked(tx, tz, 1.2)) plants.add(tx, 0, tz, this.rnd(1.3, 2.2), Math.floor(this.rng() * 4), this.rnd(0.85, 1)); }
      return true;
    };
    // Layer 2 – canopy masses framing the rings (gaps between clusters are intentional)
    for (const ring of CHAIN.all) {
      const R = ring.R + (ring.bay ? ring.bay.D * 0.6 : 0), n = Math.max(7, Math.round((2 * Math.PI * (R + 11)) / 15));
      for (let k = 0; k < n; k++) { const d = (k / n) * 360 + this.rnd(-7, 7), p = polar(d, R + this.rnd(8.5, 12.5)); cluster(ring.center.x + p.x, ring.center.z + p.z); }
      for (let k = 0; k < n; k++) { const d = (k / n) * 360 + 180 / n + this.rnd(-6, 6), p = polar(d, R + this.rnd(19, 27)); cluster(ring.center.x + p.x, ring.center.z + p.z, { shade: 0.78, big: 12.5, minGap: 11 }); }
    }
    // causeway framing: clusters behind the banks on both sides, bank rocks and reeds with gaps
    for (const s of [-1, 1]) {
      for (let x = cw.start.x - 6; x < cw.gate.x - 4; x += this.rnd(9, 13)) {
        const z = cw.gate.z + s * this.rnd(19, 24); let px = x, pz = z;
        for (let tries = 0; tries < 6 && this.insideLake(px, pz, -3); tries++) pz += s * 2.5;
        cluster(px, pz, { shade: 0.92, minGap: 8 });
      }
    }
    for (const p of this.lakeOutline()) {
      if (this.rng() < 0.42) continue;
      const x = p.x + this.rnd(-0.6, 0.6), z = -p.y + this.rnd(-0.6, 0.6);
      if (onCauseway(x, z, 1.5) || onGround(x, z, -2)) continue;
      if (this.rng() < 0.55) rocks.add(x, -0.25, z, this.rnd(1.0, 2.1), Math.floor(this.rng() * 4), this.rnd(0.8, 0.95));
      else plants.add(x, -0.1, z, this.rnd(1.2, 2.0), Math.floor(this.rng() * 4), this.rnd(0.85, 1));
    }
    // Layer 3 – foreground accents at the foot of the ring walls (sparse)
    for (const ring of CHAIN.all) {
      for (const r of ring.wallArcs) for (let deg = r.a0 + 10; deg < r.a1 - 10; deg += this.rnd(22, 34)) {
        const p = polar(deg, ring.R + 2.0), x = ring.center.x + p.x, z = ring.center.z + p.z;
        if (blocked(x, z, 0.9)) continue;
        if (this.rng() < 0.5) rocks.add(x, 0, z, this.rnd(1.1, 2.0), Math.floor(this.rng() * 4), this.rnd(0.82, 0.95));
        else plants.add(x, 0, z, this.rnd(1.8, 2.8), Math.floor(this.rng() * 4), this.rnd(0.85, 1));
      }
    }
    // Layer 1 – distant forest: tall, dark, low-detail clumps on a wide ellipse
    const ax = B.w / 2 + 70, az = B.h / 2 + 62;
    for (let k = 0; k < 64; k++) {
      const t = (k / 64) * Math.PI * 2 + this.rnd(-0.03, 0.03), sc = this.rnd(0.92, 1.12), x = B.cx + Math.cos(t) * ax * sc, z = B.cz + Math.sin(t) * az * sc;
      if (distant) { if (!blocked(x, z, 6)) distant.add(x, 0, z, this.rnd(16, 22), Math.floor(this.rng() * 4), this.rnd(0.5, 0.62)); continue; }
      for (let j = 0; j < 4; j++) { const tx = x + this.rnd(-5, 5), tz = z + this.rnd(-5, 5); if (!blocked(tx, tz, 6)) trees.add(tx, 0, tz, this.rnd(14, 19), Math.floor(this.rng() * 4), this.rnd(0.42, 0.55)); }
    }
    for (const c of [trees, plants, rocks, canopy, distant]) if (c) { c.commit(); this.group.add(c.mesh); }
    this.clouds = { trees, plants, rocks, canopy, distant };
  }

  /* ---------------------------------------------------------------- fireflies (title ambience) */
  buildFireflies() {
    const cw = CHAIN.causeway, n = 46, g = new THREE.Group(); g.visible = false; this.group.add(g);
    const tex = assets.texture('fx_spark', { wrap: false }); this.flies = [];
    for (let i = 0; i < n; i++) {
      const m = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xd8ff8a, opacity: 0 });
      const s = new THREE.Sprite(m); s.scale.setScalar(this.rnd(0.18, 0.32));
      const home = new THREE.Vector3(this.rnd(cw.start.x + 4, cw.gate.x - 2), this.rnd(0.6, 3.4), this.rnd(-9, 9));
      s.position.copy(home); g.add(s); this.flies.push({ s, home, ph: this.rnd(0, 10), sp: this.rnd(0.3, 0.7) });
    }
    this.fireflies = g;
  }
  setFireflies(on) { if (this.fireflies) this.fireflies.visible = on; }

  /* ================================================================ state */
  setActiveArena(i) {
    this.activeIndex = i; this.cutRing = i; const ring = this.rings[i]; if (!ring) return;
    const n = ring.torchPos.length;
    this.lights.forEach((pl, k) => { const tp = ring.torchPos[Math.floor((k / 4) * n)]; if (tp) { pl.position.copy(tp); pl.visible = true; } else pl.visible = false; });
    const env = ring.arena.level ? ring.arena.level.env : ring.arena.env; this.applySky(env.sky);
  }
  applySky(name, dur = 1.6) {
    if (this.skyName === name) return; this.skyName = name;
    const to = SKIES[name], scene = this.world.scene;
    const from = { bg: scene.background.clone(), fog: scene.fog.color.clone(), hs: this.hemi.color.clone(), hg: this.hemi.groundColor.clone(), hi: this.hemi.intensity, sc: this.sun.color.clone(), si: this.sun.intensity, ai: this.amb.intensity, pano: this.tint.pano.clone(), sky: this.tint.sky.clone(), fol: this.tint.foliage.clone() };
    const T2 = { fol: new THREE.Color(to.foliage), bg: new THREE.Color(to.bg), fog: new THREE.Color(to.fog), hs: new THREE.Color(to.hemi[0]), hg: new THREE.Color(to.hemi[1]), sc: new THREE.Color(to.sun[0]), pano: new THREE.Color(to.pano), sky: new THREE.Color(to.sky) };
    tweens.cancelTag('sky');
    tweens.add({ duration: dur, tag: 'sky', onUpdate: (e) => {
      scene.background.lerpColors(from.bg, T2.bg, e); scene.fog.color.lerpColors(from.fog, T2.fog, e);
      this.hemi.color.lerpColors(from.hs, T2.hs, e); this.hemi.groundColor.lerpColors(from.hg, T2.hg, e); this.hemi.intensity = lerp(from.hi, to.hemi[2], e);
      this.sun.color.lerpColors(from.sc, T2.sc, e); this.sun.intensity = lerp(from.si, to.sun[1], e); this.amb.intensity = lerp(from.ai, to.amb, e);
      this.tint.pano.lerpColors(from.pano, T2.pano, e); this.tint.sky.lerpColors(from.sky, T2.sky, e);
      this.tint.foliage.lerpColors(from.fol, T2.fol, e); if (this.clouds) for (const c of Object.values(this.clouds)) if (c) c.material.uniforms.tint.value.copy(this.tint.foliage);
    } });
  }
  setFogDensity(d, dur = 1.2) { const fog = this.world.scene.fog; tweens.cancelTag('fog'); const from = fog.density; tweens.add({ duration: dur, tag: 'fog', onUpdate: (e) => { fog.density = lerp(from, d, e); }, onComplete: () => { this.fogDensity = d; } }); }
  /** Spotlight the ring at `index`; `cull` also sinks tall trees near it (top-down puzzle mode). */
  setFocus(index, on, dur = 1.0, { cull = false } = {}) {
    const a = CHAIN.all[index];
    if (a && on) { const extra = a.bay ? a.bay.D : 0; FOCUS.center.value.set(a.center.x, 0, a.center.z); FOCUS.radii.value.set(a.R + 1.6, a.R + 7.5); FOCUS.cullRadii.value.set(a.R + extra + 5, a.R + extra + 17); this.focusIndex = index; }
    tweens.cancelTag('focus');
    const from = FOCUS.amount.value, to = on ? 1 : 0, cFrom = FOCUS.cull.value, cTo = on && cull ? 1 : 0;
    if (dur <= 0) { FOCUS.amount.value = to; FOCUS.cull.value = cTo; return; }
    tweens.add({ duration: dur, tag: 'focus', ease: Ease.inOutSine, onUpdate: (e) => { FOCUS.amount.value = from + (to - from) * e; FOCUS.cull.value = cFrom + (cTo - cFrom) * e; } });
  }

  update(dt, t) {
    const f = FOCUS.amount.value, cam = this.world.camera.position;
    for (const tr of this.animTorches) { tr.spr.update(dt); const k = tr.ring === this.focusIndex ? 1 : 1 - 0.72 * f; if (Math.abs(k - tr.k) > 0.01) { tr.k = k; tr.spr.material.color.setScalar(k); } }
    this.pano.material.color.copy(this.tint.pano).multiplyScalar(1 - 0.65 * f); this.sky.material.color.copy(this.tint.sky).multiplyScalar(1 - 0.65 * f);
    for (const pl of this.lights) if (pl.visible) { pl.userData.phase += dt * 9; pl.intensity = pl.userData.base * (0.85 + 0.15 * Math.sin(pl.userData.phase) * Math.sin(pl.userData.phase * 0.37)); }
    for (const w of this.waterMats) { w.tex.offset.x += dt * 0.012 * w.speed; w.tex.offset.y += dt * 0.008 * w.speed; }
    for (const h of this.hatches) if (h) h.ring.material.opacity = h.glow ? 0.45 + Math.sin(t * 3.2) * 0.25 : Math.max(0, h.ring.material.opacity - dt * 1.5);
    if (this.templeGlow) { this.templeGlow.material.opacity = 0.5 + Math.sin(t * 2) * 0.12; this.templeLight.intensity = 30 + Math.sin(t * 2) * 6; }
    // camera rule: walls of the current ring between the camera and the ring cut away; pillars also fade when the camera brushes past
    const cr = this.fadeOff ? null : CHAIN.all[this.cutRing]; let camB = 0, cutOn = false;
    if (cr) { const hx = cam.x - cr.center.x, hz = cam.z - cr.center.z; cutOn = Math.hypot(hx, hz) > cr.R - 0.5 && cam.y > 2 && cam.y < 45; camB = toDeg(hx, hz); }
    const ease = Math.min(1, dt * 5);
    const applyK = (o, k) => { if (Math.abs(k - o.k) < 0.01) return; o.k = k; for (const m of o.mats) { const tr = k < 0.99; if (m.transparent !== tr) { m.transparent = tr; m.needsUpdate = true; } m.opacity = k; m.depthWrite = !tr; } };
    // occluder test: does a wall sample sit on the camera→target sightline, below the wall top?
    const tg = this.world.rig.target, sx = tg.x - cam.x, sz = tg.z - cam.z, sl2 = sx * sx + sz * sz || 1, WT = this.H + 0.6;
    const occludes = (px, pz, rad) => { const t = ((px - cam.x) * sx + (pz - cam.z) * sz) / sl2; if (t < 0.02 || t > 0.86) return false; if (cam.y + (tg.y - cam.y) * t > WT) return false; const qx = cam.x + sx * t - px, qz = cam.z + sz * t - pz; return qx * qx + qz * qz < rad * rad; };
    for (const w of this.wallPieces) {
      if (!w.pts) { const o = CHAIN.all[w.ring]; w.pts = (w.a0 != null ? [w.a0, w.mid, w.a1] : [w.mid]).map((d) => { const p = polar(d, o.R + 0.5); return [o.center.x + p.x, o.center.z + p.z]; }); }
      const blocking = !this.fadeOff && cam.y > 1.5 && w.pts.some(([px, pz]) => occludes(px, pz, 2.0));
      const t = (cutOn && !(w.seal && this.keepSeals) && w.ring === this.cutRing && Math.abs(degDiff(camB, w.mid)) < 72) || (blocking && !(w.seal && this.keepSeals)) ? 0.08 : 1; applyK(w, w.k + (t - w.k) * ease);
    }
    for (const tr of this.animTorches) { if (tr.deg == null) continue; const t = cutOn && tr.ring === this.cutRing && Math.abs(degDiff(camB, tr.deg)) < 72 ? 0 : 1; const c = tr.cut + (t - tr.cut) * ease; if (Math.abs(c - tr.cut) > 0.01 || (t !== tr.cut && Math.abs(c - t) < 0.01)) { tr.cut = Math.abs(c - t) < 0.01 ? t : c; tr.spr.material.opacity = tr.cut; tr.spr.sprite.visible = tr.cut > 0.02; } }
    for (const p of this.pillarMeshes) {
      const d = Math.hypot(cam.x - p.g.position.x, cam.z - p.g.position.z), near = !this.fadeOff && cam.y < 12 ? Math.min(1, Math.max(0.18, (d - 1.5) / 3.5)) : 1;
      let cut = 1;
      if (cutOn) { const o = CHAIN.all[this.cutRing], dx = p.g.position.x - o.center.x, dz = p.g.position.z - o.center.z; if (Math.abs(Math.hypot(dx, dz) - o.R) < 1.6 && Math.abs(degDiff(camB, toDeg(dx, dz))) < 72) cut = 0.08; }   // junction pillars sit on two circles: test against the cut ring itself
      if (!this.fadeOff && cam.y > 1.5 && occludes(p.g.position.x, p.g.position.z, 1.6)) cut = Math.min(cut, 0.08);
      applyK(p, p.k + (Math.min(near, cut) - p.k) * ease);
    }
    if (this.fireflies && this.fireflies.visible) for (const fl of this.flies) {
      fl.ph += dt * fl.sp; const s = fl.s;
      s.position.set(fl.home.x + Math.sin(fl.ph * 0.9) * 1.6, fl.home.y + Math.sin(fl.ph * 1.7) * 0.5, fl.home.z + Math.cos(fl.ph * 0.7) * 1.4);
      s.material.opacity = Math.max(0, Math.sin(fl.ph * 2.3)) * 0.9;
    }
  }
}
