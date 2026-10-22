// ---------------------------------------------------------------------------
// MapArt – the level map as a painted isometric miniature of the REAL chain,
// filling the screen from the start (bottom-left) to the temple (top-right).
// A static layer (water, cliffs, rings, walls, trees) is painted once per resize;
// the dynamic layer carries everything that changes (LXD 2026-10-22): ring states
// (cleared = lit stone + glowing rim + stars, current = gold pulse with Karan on
// it, locked = darker with mist and vines), number badges that never collide,
// torches lit up to the current ring, glowing doorways between cleared rings, the
// temple's light beam, the Warden on ring 7, Karan walking the route, the unlock
// moment (pan in, mist clears, vines fall, ring lights up) and a living world.
// ---------------------------------------------------------------------------
import { assets } from '../engine/assets.js';
import { CHAIN, GATE } from '../game/levels.js';
import { polar, mulberry32 } from '../engine/util.js';

const K = 0.6;                       // isometric squash
const C = { amber: '#f4bf55', cyan: '#52ded8', ivory: '#f3ebd8', ink: '#0a1311', stone: '#8a8170', stoneD: '#4d473c', stoneL: '#b5ab93' };
const TAU = Math.PI * 2;

export class MapArt {
  constructor(canvas) {
    this.cv = canvas; this.g = canvas.getContext('2d');
    this.stat = document.createElement('canvas'); this.sg = this.stat.getContext('2d');
    this.selected = 1; this.hover = -1; this.save = null; this.t = 0; this.ready = false; this.flames = []; this.falls = []; this.glints = [];
    this.frontier = 1; this.hero = { id: 1, walk: null }; this.unlock = null; this.shakeT = {}; this.badges = {}; this.vines = {};
  }

  /* ================================================================ layout */
  layout() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2), W = Math.round(window.innerWidth * dpr), H = Math.round(window.innerHeight * dpr);
    const portrait = window.innerWidth < 760 && window.innerHeight > window.innerWidth;
    this.dpr = dpr; this.W = W; this.H = H; this.portrait = portrait;
    for (const c of [this.cv, this.stat]) { c.width = W; c.height = H; }
    this.cv.style.width = window.innerWidth + 'px'; this.cv.style.height = window.innerHeight + 'px';
    const top = 64 * dpr;   // slim top bar
    const area = portrait ? { x: 0.05 * W, y: top + 0.06 * H, w: 0.9 * W, h: H - top - 0.06 * H - 170 * dpr }   // phones: the tag docks at the bottom
      : { x: 0.03 * W, y: top + 0.1 * H, w: 0.94 * W, h: H - top - 0.13 * H };
    const s = CHAIN.causeway.start, e = CHAIN.sanctuary.escape;
    const orig = Math.atan2(e.z - s.z, e.x - s.x), desired = portrait ? -1.32 : -0.72;
    this.beta = desired - orig; this.cb = Math.cos(this.beta); this.sb = Math.sin(this.beta);
    // projected extents of everything we draw (world units)
    let minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity;
    const ext = (x, z, rx, ryTop = rx * K, ryBot = rx * K) => { const p = this.rot(x, z); minU = Math.min(minU, p.u - rx); maxU = Math.max(maxU, p.u + rx); minV = Math.min(minV, p.v - ryTop); maxV = Math.max(maxV, p.v + ryBot); };
    for (const r of CHAIN.all) ext(r.center.x, r.center.z, r.R + 4, (r.R + 4) * K + 6, (r.R + 4) * K + 5);
    ext(s.x, s.z, 7, 6, 8); ext(e.x, e.z, 12, 22, 6);
    const S = Math.min(area.w / (maxU - minU), area.h / (maxV - minV));
    this.S = S;
    this.ox = area.x + (area.w - (maxU - minU) * S) / 2 - minU * S;
    this.oy = area.y + (area.h - (maxV - minV) * S) / 2 - minV * S;
    this.cliff = Math.max(10 * dpr, 3.6 * S);
  }
  rot(x, z) { return { u: x * this.cb - z * this.sb, v: (x * this.sb + z * this.cb) * K }; }
  P(x, z) { const r = this.rot(x, z); return { x: this.ox + r.u * this.S, y: this.oy + r.v * this.S }; }
  /** screen (device px) → world x/z */
  unproject(px, py) { const u = (px - this.ox) / this.S, v = (py - this.oy) / this.S / K; return { x: u * this.cb + v * this.sb, z: -u * this.sb + v * this.cb }; }
  arcPts(c, r, a0, a1, step = 3) { const out = [], n = Math.max(2, Math.ceil(Math.abs(a1 - a0) / step)); for (let i = 0; i <= n; i++) { const d = a0 + ((a1 - a0) * i) / n, p = polar(d, r); out.push(this.P(c.x + p.x, c.z + p.z)); } return out; }
  ell(g, c, r) { const p = this.P(c.x, c.z); g.beginPath(); g.ellipse(p.x, p.y, r * this.S, r * this.S * K, 0, 0, TAU); }

  /* ================================================================ static layer */
  build() {
    this.layout();
    const g = this.sg, W = this.W, H = this.H, S = this.S, rng = mulberry32(777);
    const rnd = (a, b) => a + rng() * (b - a);
    g.clearRect(0, 0, W, H);
    // ---- water
    const water = assets.get('water');
    if (water) { const pc = document.createElement('canvas'), sz = Math.round(260 * this.dpr); pc.width = pc.height = sz; pc.getContext('2d').drawImage(water, 0, 0, sz, sz); g.fillStyle = g.createPattern(pc, 'repeat'); }
    else g.fillStyle = '#2aa3a0';
    g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(38,168,166,0.42)'; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 26; i++) { const x = rnd(0, W), y = rnd(0, H), r = rnd(80, 220) * this.dpr, gl = g.createRadialGradient(x, y, 0, x, y, r); gl.addColorStop(0, `rgba(200,255,245,${rnd(0.05, 0.12).toFixed(3)})`); gl.addColorStop(1, 'rgba(200,255,245,0)'); g.fillStyle = gl; g.fillRect(x - r, y - r, r * 2, r * 2); }
    const deep = g.createRadialGradient(W * 0.42, H * 0.5, H * 0.1, W * 0.42, H * 0.5, Math.max(W, H) * 0.75);
    deep.addColorStop(0, 'rgba(20,90,95,0)'); deep.addColorStop(1, 'rgba(6,30,34,0.55)'); g.fillStyle = deep; g.fillRect(0, 0, W, H);
    // ---- island masks: the chain plateau + decorative islands
    const chainMask = this.mask((m) => {
      for (const r of CHAIN.all) {
        this.ell(m, r.center, r.R + 6.5); m.fill();
        for (let k = 0; k < 22; k++) { const a = rnd(0, 360), p = polar(a, r.R + rnd(5, 10)); this.ell(m, { x: r.center.x + p.x, z: r.center.z + p.z }, rnd(2.6, 5.4)); m.fill(); }
        if (r.bay) { const D = r.bay.D, pts = [...this.arcPts(r.center, r.R + D + 3, r.exitDeg - r.theta / 2 - 4, r.exitDeg + r.theta / 2 + 4)]; m.beginPath(); const c0 = this.P(r.center.x, r.center.z); m.moveTo(c0.x, c0.y); pts.forEach((p) => m.lineTo(p.x, p.y)); m.closePath(); m.fill(); }
      }
      const e = CHAIN.sanctuary.escape; this.ell(m, e, 12); m.fill();
      const s = CHAIN.causeway.start; this.ell(m, s, 5.5); m.fill();
    });
    this.cliffs(g, chainMask);
    this.waterfalls(g, chainMask, rnd);
    // ---- drawables (painter's order by screen y of their base)
    const draw = [];
    // causeway
    draw.push({ y: -1e9, f: () => this.causeway(g) });
    for (const r of CHAIN.all) { const p = this.P(r.center.x, r.center.z); draw.push({ y: p.y, f: () => this.ring(g, r) }); }
    // pillars with torches
    this.flames = [];
    const ringOf = (pt) => { let best = 0, bd = Infinity; CHAIN.arenas.forEach((a, k) => { const d = Math.abs(Math.hypot(pt.x - a.center.x, pt.z - a.center.z) - a.R); if (d < bd) { bd = d; best = k; } }); return best; };
    CHAIN.pillars.forEach((pt, i) => { const p = this.P(pt.x, pt.z); draw.push({ y: p.y + 0.5, f: () => this.pillar(g, p, i % 2 === 0, ringOf(pt)) }); });
    // temple
    { const e = CHAIN.sanctuary.escape, p = this.P(e.x, e.z); draw.push({ y: p.y, f: () => this.temple(g, p) }); }
    // trees around the chain and on the islands (deterministic, with breathing room)
    const trees = [], mdata = chainMask.getContext('2d').getImageData(0, 0, W, H).data;
    const onPlateau = (x, z) => { const p = this.P(x, z), ix = Math.round(p.x), iy = Math.round(p.y); return ix >= 0 && iy >= 0 && ix < W && iy < H && mdata[(iy * W + ix) * 4 + 3] > 128; };
    const clear = (x, z, m) => CHAIN.all.every((o) => Math.hypot(x - o.center.x, z - o.center.z) > o.R + m) && CHAIN.arenas.every((a) => !a.bay || Math.hypot(x - a.center.x, z - a.center.z) > a.R + a.bay.D + m - 1)
      && !(x < CHAIN.causeway.gate.x + 2 && Math.abs(z - CHAIN.causeway.gate.z) < 6) && Math.hypot(x - CHAIN.sanctuary.escape.x, z - CHAIN.sanctuary.escape.z) > 13;
    for (const r of CHAIN.all) for (const band of [[4.6, 7.2, 13, 21], [8.5, 12, 16, 26]]) for (let a = rnd(0, 20); a < 360; a += rnd(band[2], band[3])) {
      const p = polar(a, r.R + rnd(band[0], band[1])), x = r.center.x + p.x, z = r.center.z + p.z;
      if (!onPlateau(x, z) || !clear(x, z, 3.4) || trees.some((t) => Math.hypot(t.x - x, t.z - z) < 5)) continue;
      trees.push({ x, z, h: rnd(6.5, 9), f: Math.floor(rng() * 6), kind: 'canopy' });   // the painted trees are as wide as they are tall
    }
    for (const t of trees) { const p = this.P(t.x, t.z); draw.push({ y: p.y, f: () => this.tree(g, p, t) }); }
    draw.sort((a, b) => a.y - b.y).forEach((d) => d.f());
    // ---- atmosphere: warm glow behind the temple, mist at the edges
    const tp = this.P(CHAIN.sanctuary.escape.x, CHAIN.sanctuary.escape.z);
    const glow = g.createRadialGradient(tp.x, tp.y - 60 * this.dpr, 10, tp.x, tp.y - 60 * this.dpr, 420 * this.dpr); glow.addColorStop(0, 'rgba(255,190,110,0.32)'); glow.addColorStop(1, 'rgba(255,190,110,0)'); g.fillStyle = glow; g.fillRect(0, 0, W, H);
    for (const [fx, fy, fr] of [[0, 1, 0.55], [0, 0, 0.35], [1, 1, 0.45], [0.45, 1.05, 0.4], [1, 0.1, 0.3]]) {
      const mist = g.createRadialGradient(fx * W, fy * H, 0, fx * W, fy * H, fr * Math.max(W, H)); mist.addColorStop(0, 'rgba(225,235,232,0.34)'); mist.addColorStop(0.6, 'rgba(225,235,232,0.1)'); mist.addColorStop(1, 'rgba(225,235,232,0)');
      g.fillStyle = mist; g.fillRect(0, 0, W, H);
    }
    const vig = g.createRadialGradient(W * 0.5, H * 0.55, H * 0.4, W * 0.5, H * 0.55, Math.max(W, H) * 0.8); vig.addColorStop(0, 'rgba(5,12,10,0)'); vig.addColorStop(1, 'rgba(5,12,10,0.4)'); g.fillStyle = vig; g.fillRect(0, 0, W, H);
    // ---- precomputed pieces for the dynamic layer
    const md = chainMask.getContext('2d').getImageData(0, 0, W, H).data, onLand = (x, y) => { const ix = Math.round(x), iy = Math.round(y); return ix < 0 || iy < 0 || ix >= W || iy >= H ? false : md[(iy * W + ix) * 4 + 3] > 10; };
    this.glints = [];
    for (let k = 0; k < 900 && this.glints.length < 56; k++) { const x = rnd(0, W), y = rnd(70 * this.dpr, H); if (onLand(x, y) || onLand(x, y - this.cliff * 1.8)) continue; this.glints.push({ x, y, ph: rnd(0, TAU), sp: rnd(0.5, 1.3), s: rnd(3, 7) * this.dpr }); }
    this.computeBadges(); this.buildVines(rnd); this.buildBoss();
    this.clouds = [0, 1, 2].map((k) => ({ x: rnd(0, W), y: rnd(0.15, 0.85) * H, r: rnd(0.16, 0.26) * Math.max(W, H), sp: rnd(6, 12) * this.dpr * (k % 2 ? 1 : 0.7) }));
    this.ready = true;
  }
  /** Number badges on each ring's back wall, pushed apart until none touch (LXD: "the 1 and 2 badges collide"). */
  computeBadges() {
    const dpr = this.dpr, S = this.S, hw = Math.max(4 * dpr, 1.8 * S);
    const b = CHAIN.arenas.map((r) => { const c = this.P(r.center.x, r.center.z), ry = r.R * S * K; return { id: r.level.id, x: c.x, y: c.y - ry - hw * 0.4, r: Math.max(16 * dpr, Math.min(22 * dpr, r.R * S * 0.17)) }; });
    for (let it = 0; it < 40; it++) for (let i = 0; i < b.length; i++) for (let j = i + 1; j < b.length; j++) {
      const A = b[i], B = b[j], dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy) || 1, need = A.r + B.r + 14 * dpr;
      if (d < need) { const push = (need - d) / 2; A.x -= (dx / d) * push; A.y -= (dy / d) * push; B.x += (dx / d) * push; B.y += (dy / d) * push; }
    }
    this.badges = {}; b.forEach((x) => (this.badges[x.id] = x));
  }
  /** Hanging vines over each ring's wall (drawn while the ring is locked; they fall away when it unlocks). */
  buildVines(rnd) {
    const S = this.S, dpr = this.dpr, hw = Math.max(4 * dpr, 1.8 * S); this.vines = {};
    for (const r of CHAIN.arenas) {
      const c = this.P(r.center.x, r.center.z), strands = [], n = 6 + Math.round(r.R / 3);
      for (let k = 0; k < n; k++) {
        const a = (k / n) * 360 + rnd(-12, 12), p = polar(a, r.R), w = this.P(r.center.x + p.x, r.center.z + p.z), x0 = w.x - c.x, y0 = w.y - hw - c.y;
        const len = rnd(1.6, 3.4) * hw + rnd(0, 0.25) * r.R * S * K, steps = 8, ph = rnd(0, TAU), amp = rnd(2, 5) * dpr, pts = [], leaves = [];
        for (let i = 0; i <= steps; i++) { const yy = y0 + (len * i) / steps, xx = x0 + Math.sin(ph + i * 0.9) * amp; pts.push([xx, yy]); if (i > 0 && i % 2 === 0) leaves.push([xx, yy, (i % 4 ? 1 : -1) * rnd(0.5, 1.1)]); }
        strands.push({ pts, leaves, w: rnd(1.6, 2.6) * dpr });
      }
      this.vines[r.level.id] = strands;
    }
  }
  buildBoss() {
    const img = assets.get('boss_warden'); this.bossSil = null; if (!img) return;
    const def = assets.frames('boss_warden'), h = Math.round(86 * this.dpr), w = Math.round((h * def.frameW) / def.frameH);
    const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
    x.drawImage(img, 0, 0, def.frameW, def.frameH, 0, 0, w, h); x.globalCompositeOperation = 'source-atop'; x.fillStyle = 'rgba(46,6,12,0.9)'; x.fillRect(0, 0, w, h);
    this.bossSil = c; this.bossBase = def.baseline ?? 1;
  }
  mask(paint) { const c = document.createElement('canvas'); c.width = this.W; c.height = this.H; const m = c.getContext('2d'); m.fillStyle = '#fff'; paint(m); return c; }
  /** Extrude a mask into a cliff (rock band + shadow on the water) and paint its grassy top. */
  cliffs(g, mask) {
    const W = this.W, H = this.H, hc = this.cliff;
    const tint = (fill) => { const c = document.createElement('canvas'); c.width = W; c.height = H; const t = c.getContext('2d'); t.drawImage(mask, 0, 0); t.globalCompositeOperation = 'source-in'; t.fillStyle = fill; t.fillRect(0, 0, W, H); return c; };
    // shadow + foam ring on the water
    g.save(); g.filter = `blur(${Math.round(hc * 0.5)}px)`; g.globalAlpha = 0.55; g.drawImage(tint('#05201f'), 0, hc + hc * 0.35); g.restore();
    g.save(); g.globalAlpha = 0.55; g.drawImage(tint('#d9f6ef'), 0, hc + 2); g.restore();
    // rock band: dark at the waterline, lighter at the top lip
    const rockD = tint(this.rockPattern('#4a3f33', '#3a3128')), rockL = tint(this.rockPattern('#7b6c58', '#62564a'));
    for (let y = Math.round(hc); y >= 1; y--) g.drawImage(y > hc * 0.45 ? rockD : rockL, 0, y);
    // grass top
    const top = document.createElement('canvas'); top.width = W; top.height = H; const tg = top.getContext('2d');
    tg.drawImage(mask, 0, 0); tg.globalCompositeOperation = 'source-in';
    const gj = assets.get('ground_jungle');
    if (gj) { const pc = document.createElement('canvas'), sz = Math.max(64, Math.round(12 * this.S)); pc.width = pc.height = sz; pc.getContext('2d').drawImage(gj, 0, 0, sz, sz); tg.fillStyle = tg.createPattern(pc, 'repeat'); } else tg.fillStyle = '#4f7a3a';
    tg.fillRect(0, 0, W, H); tg.globalCompositeOperation = 'source-atop'; tg.fillStyle = 'rgba(30,60,25,0.18)'; tg.fillRect(0, 0, W, H);
    g.save(); g.globalAlpha = 0.9; g.drawImage(tint('#a9c77a'), 0, -Math.max(2, hc * 0.12)); g.restore();   // lit lip on the far edges
    g.drawImage(top, 0, 0);
  }
  rockPattern(a, b) {
    const c = document.createElement('canvas'), sz = Math.round(48 * this.dpr); c.width = c.height = sz; const p = c.getContext('2d'), r = mulberry32(31);
    p.fillStyle = a; p.fillRect(0, 0, sz, sz); p.strokeStyle = b; p.lineWidth = 2 * this.dpr;
    for (let i = 0; i < 9; i++) { const x = r() * sz; p.beginPath(); p.moveTo(x, 0); p.lineTo(x + (r() - 0.5) * 8, sz); p.stroke(); }
    return this.g.createPattern(c, 'repeat');
  }
  waterfalls(g, mask, rnd) {
    const W = this.W, H = this.H, d = mask.getContext('2d').getImageData(0, 0, W, H).data, hc = this.cliff, falls = [];
    for (let k = 0; k < 14 && falls.length < 5; k++) {
      const x = Math.round(W * (0.08 + rnd(0, 0.62))); let yb = -1;
      for (let y = H - 1; y > 0; y -= 2) if (d[(y * W + x) * 4 + 3] > 128) { yb = y; break; }
      if (yb < 0 || falls.some((f) => Math.abs(f.x - x) < W * 0.08)) continue;
      falls.push({ x, y: yb });
    }
    this.falls = falls.map((f) => ({ ...f, w: Math.max(12 * this.dpr, this.S * 3.2) }));
    for (const f of falls) {
      const w = Math.max(12 * this.dpr, this.S * 3.2), grd = g.createLinearGradient(0, f.y, 0, f.y + hc + 6);
      grd.addColorStop(0, 'rgba(235,252,250,0.95)'); grd.addColorStop(1, 'rgba(170,235,235,0.75)');
      g.fillStyle = grd; g.fillRect(f.x - w / 2, f.y - 2, w, hc + 8);
      g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = Math.max(1, this.dpr);
      for (let i = 0; i < 3; i++) { const xx = f.x - w / 2 + (w * (i + 0.5)) / 3; g.beginPath(); g.moveTo(xx, f.y); g.lineTo(xx, f.y + hc + 6); g.stroke(); }
      g.fillStyle = 'rgba(240,255,252,0.85)';
      for (let i = 0; i < 6; i++) { g.beginPath(); g.ellipse(f.x + (i - 2.5) * w * 0.32, f.y + hc + 8 + (i % 2) * 3, w * 0.42, w * 0.18, 0, 0, TAU); g.fill(); }
      const mist = g.createRadialGradient(f.x, f.y + hc + 8, 0, f.x, f.y + hc + 8, w * 2.2); mist.addColorStop(0, 'rgba(240,255,252,0.55)'); mist.addColorStop(1, 'rgba(240,255,252,0)'); g.fillStyle = mist; g.fillRect(f.x - w * 2.2, f.y + hc - w, w * 4.4, w * 4);
    }
  }

  /* ---------------------------------------------------------------- pieces */
  wallBand(g, pts, hw, light = C.stoneL) {
    if (pts.length < 2) return;
    g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y))); for (let i = pts.length - 1; i >= 0; i--) g.lineTo(pts[i].x, pts[i].y - hw); g.closePath();
    const grd = g.createLinearGradient(0, Math.min(...pts.map((p) => p.y)) - hw, 0, Math.max(...pts.map((p) => p.y)));
    grd.addColorStop(0, '#9a917d'); grd.addColorStop(1, '#5c5548'); g.fillStyle = grd; g.fill();
    g.lineWidth = Math.max(1.2, this.S * 0.35); g.strokeStyle = 'rgba(20,18,14,0.55)'; g.stroke();
    g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p.x, p.y - hw) : g.moveTo(p.x, p.y - hw))); g.lineWidth = Math.max(2, this.S * 0.9); g.strokeStyle = light; g.stroke();
  }
  ring(g, r) {
    const S = this.S, c = this.P(r.center.x, r.center.z), rx = r.R * S, ry = rx * K, hw = Math.max(4 * this.dpr, 1.8 * S);
    // base disc edge (slight thickness so the platform reads as built)
    g.save(); g.beginPath(); g.ellipse(c.x, c.y + hw * 0.35, rx, ry, 0, 0, TAU); g.fillStyle = '#3a352c'; g.fill(); g.restore();
    // floor texture squashed into the ellipse
    const floor = assets.get('arena_floor');
    g.save(); g.beginPath(); g.ellipse(c.x, c.y, rx, ry, 0, 0, TAU); g.clip();
    if (floor) g.drawImage(floor, c.x - rx, c.y - ry, rx * 2, ry * 2); else { g.fillStyle = '#6d6858'; g.fill(); }
    const env = r.level ? r.level.env : r.env, shade = { evening: 0.03, golden: 0, day: 0, dusk: 0.08, twilight: 0.14, night: 0.2, storm: 0.14 }[env.sky] || 0;
    if (shade) { g.fillStyle = `rgba(10,14,22,${shade})`; g.fillRect(c.x - rx, c.y - ry, rx * 2, ry * 2); }
    if (!r.level) { g.fillStyle = 'rgba(255,200,120,0.18)'; g.fillRect(c.x - rx, c.y - ry, rx * 2, ry * 2); }
    g.restore();
    // breach bay floor
    if (r.bay) {
      const D = r.bay.D, a0 = r.exitDeg - r.theta / 2, a1 = r.exitDeg + r.theta / 2, outer = this.arcPts(r.center, r.R + D, a0, a1), inner = this.arcPts(r.center, r.R - 0.2, a1, a0);
      g.beginPath(); [...outer, ...inner].forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y))); g.closePath(); g.fillStyle = '#6a6252'; g.fill();
      for (const arc of r.bay.outerArcs) this.wallBand(g, this.arcPts(r.center, r.R + D, arc.a0, arc.a1), hw);
      for (const w of r.bay.radials) { const p0 = polar(w.deg, w.r0), p1 = polar(w.deg, w.r1); this.wallBand(g, [this.P(r.center.x + p0.x, r.center.z + p0.z), this.P(r.center.x + p1.x, r.center.z + p1.z)], hw); }
    }
    // walls exactly where the game has walls: far half first, near half after the floor
    for (const arc of r.wallArcs) {
      const pts = this.arcPts(r.center, r.R, arc.a0, arc.a1);
      const back = [], front = [];
      pts.forEach((p) => (p.y <= c.y ? back : front).push(p));
      this.wallBand(g, pts, hw);
    }
    // gates
    if (r.gate) {
      const gp = polar(r.gate.deg, r.R), p = this.P(r.center.x + gp.x, r.center.z + gp.z), img = assets.get(r.gate.temple ? 'gate_large_frame' : 'gate_small_frame');
      const h = (r.gate.temple ? 8 : 5.2) * S; if (img) g.drawImage(img, p.x - h / 2, p.y - h * 0.92, h, h);
    }
  }
  pillar(g, p, torch, ring = 0) {
    const S = this.S, w = Math.max(5 * this.dpr, 1.5 * S), h = Math.max(10 * this.dpr, 3.6 * S);
    const art = assets.get('wall_pillar');
    if (art) g.drawImage(art, p.x - w * 0.75, p.y - h, w * 1.5, h);
    else { g.fillStyle = C.stone; g.fillRect(p.x - w / 2, p.y - h, w, h); }
    if (torch) this.flames.push({ x: p.x, y: p.y - h - 2 * this.dpr, s: w, ring });
  }
  causeway(g) {
    const cw = CHAIN.causeway, S = this.S, half = cw.width / 2, a = this.P(cw.start.x, cw.start.z - half), b = this.P(cw.gate.x, cw.gate.z - half), c2 = this.P(cw.gate.x, cw.gate.z + half), d = this.P(cw.start.x, cw.start.z + half);
    const thick = Math.max(4 * this.dpr, 1.6 * S);
    g.beginPath(); g.moveTo(d.x, d.y); g.lineTo(c2.x, c2.y); g.lineTo(c2.x, c2.y + thick); g.lineTo(d.x, d.y + thick); g.closePath(); g.fillStyle = '#4b453a'; g.fill();
    const deck = assets.get('causeway_stone');
    g.save(); g.beginPath(); [a, b, c2, d].forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y))); g.closePath(); g.clip();
    g.fillStyle = '#8b8471'; g.fill();
    if (deck) { const pc = document.createElement('canvas'), sz = Math.max(24, Math.round(4.4 * S)); pc.width = sz; pc.height = sz * 2; pc.getContext('2d').drawImage(deck, 0, 0, sz, sz * 2); g.fillStyle = g.createPattern(pc, 'repeat'); g.globalAlpha = 0.9; g.fillRect(Math.min(a.x, d.x) - 10, Math.min(a.y, b.y) - 10, Math.abs(b.x - d.x) + 20, Math.abs(c2.y - a.y) + 40); g.globalAlpha = 1; }
    g.restore();
    for (const [p, q] of [[a, b], [d, c2]]) { g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(q.x, q.y); g.lineWidth = Math.max(2, 0.7 * S); g.strokeStyle = C.stoneL; g.stroke(); }
    const L = Math.hypot(cw.gate.x - cw.start.x, cw.gate.z - cw.start.z);
    for (let t = 6; t < L - 3; t += 9) for (const side of [-1, 1]) {
      const x = cw.start.x + ((cw.gate.x - cw.start.x) * t) / L, z = cw.start.z + side * (half + 0.3), p = this.P(x, z), w = Math.max(3, 0.7 * S), h = Math.max(6, 2.2 * S);
      g.fillStyle = '#3d3a33'; g.fillRect(p.x - w / 2, p.y - h, w, h); this.flames.push({ x: p.x, y: p.y - h - 1, s: w * 1.4, ring: -1 });
    }
  }
  temple(g, p) {
    const img = assets.get('temple'), h = Math.max(110 * this.dpr, 34 * this.S);
    const glow = g.createRadialGradient(p.x, p.y - h * 0.5, 4, p.x, p.y - h * 0.5, h); glow.addColorStop(0, 'rgba(255,214,140,0.55)'); glow.addColorStop(1, 'rgba(255,214,140,0)'); g.fillStyle = glow; g.fillRect(p.x - h, p.y - h * 1.5, h * 2, h * 2);
    if (img) g.drawImage(img, p.x - h / 2, p.y - h * 0.95, h, h);   // painted temple on its cliff island; the island's foot (95%) on the plateau
  }
  tree(g, p, t) {
    const S = this.S;
    if (t.kind === 'ruin') { const img = assets.get('wall_pillar'), h = t.h * S; if (img) g.drawImage(img, p.x - h * 0.13, p.y - h, h * 0.26, h); return; }
    const img = assets.get('jungle_tree'), def = assets.frames('jungle_tree');   // the same painted trees as in the game
    if (!img) return;
    const f = t.f % (def.cols * def.rows), col = f % def.cols, row = Math.floor(f / def.cols);
    const h = t.h * S, w = h * (def.frameW / def.frameH), base = def.baseline ?? 1;
    g.drawImage(img, col * def.frameW, row * def.frameH, def.frameW, def.frameH, p.x - w / 2, p.y - h * base, w, h);
  }

  /* ================================================================ dynamic layer */
  ringState(id) { const s = this.save; if (!s) return 'open'; return s.cleared[id] ? 'cleared' : id <= s.unlocked ? 'open' : 'locked'; }
  /** World route Karan walks between two rings: centre → the arc's midpoint (the shared doorway) → next centre … */
  route(from, to) {
    const ctr = (id) => { const a = CHAIN.arenas[id - 1]; return { x: a.center.x, z: a.center.z }; }, pts = [ctr(from)], step = to > from ? 1 : -1;
    for (let i = from; i !== to; i += step) { const a = CHAIN.arenas[Math.min(i, i + step) - 1], m = polar(a.exitDeg, a.R); pts.push({ x: a.center.x + m.x, z: a.center.z + m.z }); pts.push(ctr(i + step)); }
    return pts;
  }
  placeHero(id) { this.hero = { id, walk: null }; }
  walkTo(id) {
    if (this.hero.walk) { this.hero.id = this.hero.walk.to; this.hero.walk.res(); this.hero.walk = null; }
    if (id === this.hero.id) return Promise.resolve();
    const pts = this.route(this.hero.id, id); let len = 0; for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z);
    return new Promise((res) => { this.hero.walk = { pts, len, d: 0, speed: Math.max(26, len / 2.6), to: id, res }; });
  }
  heroWorld() {
    const w = this.hero.walk; if (!w) { const a = CHAIN.arenas[this.hero.id - 1]; return { x: a.center.x, z: a.center.z, dx: 0, dz: 1 }; }
    let d = w.d; for (let i = 1; i < w.pts.length; i++) { const a = w.pts[i - 1], b = w.pts[i], L = Math.hypot(b.x - a.x, b.z - a.z); if (d <= L || i === w.pts.length - 1) { const k = Math.min(1, d / (L || 1)); return { x: a.x + (b.x - a.x) * k, z: a.z + (b.z - a.z) * k, dx: b.x - a.x, dz: b.z - a.z }; } d -= L; }
    return w.pts[w.pts.length - 1];
  }
  /** Unlock moment (LXD): pan in to the ring, the mist clears, the vines fall away, the ring lights up, pan out. */
  playUnlock(id) { return new Promise((res) => { this.unlock = { id, t0: this.t, res }; }); }
  shake(id) { this.shakeT[id] = this.t; }
  static ease(x) { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); }
  view() {
    const u = this.unlock; if (!u) return { s: 1, cx: 0, cy: 0 };
    const tt = this.t - u.t0, a = CHAIN.arenas[u.id - 1], c = this.P(a.center.x, a.center.z);
    const k = tt < 0.8 ? MapArt.ease(tt / 0.8) : tt < 2.3 ? 1 : 1 - MapArt.ease((tt - 2.3) / 0.7);
    return { s: 1 + 0.35 * k, cx: c.x, cy: c.y };
  }
  /** How locked ring `id` looks right now (1 = mist + vines, 0 = clear). */
  lockVis(id) {
    const u = this.unlock; if (u && u.id === id) return 1 - MapArt.ease((this.t - u.t0 - 0.9) / 1.1);
    return this.ringState(id) === 'locked' ? 1 : 0;
  }
  /** A ring's screen box in CSS px (with the current view transform): centre, radii, badge. */
  ringBox(id) {
    const a = CHAIN.arenas[id - 1], b = this.badges[id]; if (!a || !b) return null;
    const v = this.view(), tf = (x, y) => ({ x: (v.cx + (x - v.cx) * v.s) / this.dpr, y: (v.cy + (y - v.cy) * v.s) / this.dpr }), c = tf(...Object.values(this.P(a.center.x, a.center.z))), bb = tf(b.x, b.y), k = v.s / this.dpr;
    return { cx: c.x, cy: c.y, rx: a.R * this.S * k, ry: a.R * this.S * K * k, bx: bb.x, by: bb.y, br: b.r * k };
  }
  /** CSS-pixel anchor above the ring's badge (for the floating label) or below the ring. */
  anchor(id, below = false) {
    const b = this.badges[id], a = CHAIN.arenas[id - 1]; if (!b || !a) return null;
    const v = this.view(), tf = (x, y) => ({ x: (v.cx + (x - v.cx) * v.s) / this.dpr, y: (v.cy + (y - v.cy) * v.s) / this.dpr });
    if (!below) return tf(b.x, b.y - b.r - 6 * this.dpr);
    const c = this.P(a.center.x, a.center.z); return tf(c.x, c.y + a.R * this.S * K + 10 * this.dpr);
  }
  frame(dt) {
    if (!this.ready) return;
    this.t += dt; const g = this.g, S = this.S, dpr = this.dpr, t = this.t, W = this.W, H = this.H;
    if (this.hero.walk) { const w = this.hero.walk; w.d += w.speed * dt; if (w.d >= w.len) { this.hero.id = w.to; this.hero.walk = null; w.res(); } }
    if (this.unlock && t - this.unlock.t0 > 3.0) { const r = this.unlock.res; this.unlock = null; r(); }
    const v = this.view();
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H);
    g.setTransform(v.s, 0, 0, v.s, v.cx * (1 - v.s), v.cy * (1 - v.s));
    g.drawImage(this.stat, 0, 0);
    // living water: twinkling glints; waterfall spray
    g.save(); g.globalCompositeOperation = 'lighter';
    for (const gl of this.glints) { const a = Math.pow(Math.max(0, Math.sin(t * gl.sp + gl.ph)), 10); if (a < 0.02) continue; g.strokeStyle = `rgba(230,255,250,${(0.85 * a).toFixed(3)})`; g.lineWidth = 1.6 * dpr; g.beginPath(); g.moveTo(gl.x - gl.s, gl.y); g.lineTo(gl.x + gl.s, gl.y); g.moveTo(gl.x, gl.y - gl.s * 0.45); g.lineTo(gl.x, gl.y + gl.s * 0.45); g.stroke(); }
    for (const f of this.falls) for (let i = 0; i < 7; i++) { const ph = (((t * 0.9 + i / 7) % 1) + 1) % 1, x = f.x + Math.sin(i * 2.3) * f.w * 0.9, y = f.y + this.cliff + 6 * dpr - ph * 18 * dpr; g.fillStyle = `rgba(240,255,252,${(0.5 * (1 - ph)).toFixed(3)})`; g.beginPath(); g.arc(x, y, (2 + ph * 4) * dpr, 0, TAU); g.fill(); }
    g.restore();
    const ids = CHAIN.arenas.map((a) => a.level.id), cur = this.frontier;
    // doorways: the open arc between two cleared rings glows amber (the trail is earned)
    for (const r of CHAIN.arenas) if (this.ringState(r.level.id) === 'cleared') {
      const pts = this.arcPts(r.center, r.R, r.exitDeg - r.theta / 2, r.exitDeg + r.theta / 2, 2);
      g.save(); g.shadowColor = C.amber; g.shadowBlur = 14 * dpr; g.lineCap = 'round'; g.lineWidth = Math.max(3 * dpr, 0.8 * S); g.strokeStyle = `rgba(255,205,110,${(0.7 + 0.3 * Math.sin(t * 2.4)).toFixed(3)})`;
      g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y))); g.stroke(); g.restore();
    }
    // ring states
    for (const r of CHAIN.arenas) {
      const id = r.level.id, st = this.ringState(id), c0 = this.P(r.center.x, r.center.z), rx = r.R * S, ry = rx * K;
      const sk = this.shakeT[id] != null && t - this.shakeT[id] < 0.45 ? Math.sin((t - this.shakeT[id]) * 48) * 5 * dpr * (1 - (t - this.shakeT[id]) / 0.45) : 0, c = { x: c0.x + sk, y: c0.y };
      const lv = this.lockVis(id);
      if (st === 'cleared') {
        g.save(); g.beginPath(); g.ellipse(c.x, c.y, rx, ry, 0, 0, TAU); g.fillStyle = 'rgba(255,214,150,0.14)'; g.fill();
        g.shadowColor = C.cyan; g.shadowBlur = 12 * dpr; g.lineWidth = Math.max(2.5 * dpr, 0.5 * S); g.strokeStyle = 'rgba(120,240,232,0.85)'; g.stroke(); g.restore();
      }
      if (lv > 0.01) {
        g.save(); g.beginPath(); g.ellipse(c.x, c.y, rx + 1.2 * S, ry + 1.2 * S * K, 0, 0, TAU); g.fillStyle = `rgba(6,12,10,${(0.5 * lv).toFixed(3)})`; g.fill(); g.clip();
        for (let i = 0; i < 6; i++) { const mx = c.x + Math.sin(t * 0.12 + i * 1.9) * rx * 0.6, my = c.y + Math.cos(t * 0.09 + i * 2.7) * ry * 0.5, mr = rx * (0.45 + 0.15 * Math.sin(i)); const gr = g.createRadialGradient(mx, my, 0, mx, my, mr); gr.addColorStop(0, `rgba(220,230,228,${(0.42 * lv).toFixed(3)})`); gr.addColorStop(1, 'rgba(220,230,228,0)'); g.fillStyle = gr; g.fillRect(mx - mr, my - mr, mr * 2, mr * 2); }
        g.restore();
        const u = this.unlock && this.unlock.id === id ? MapArt.ease((t - this.unlock.t0 - 0.9) / 1.1) : 0;
        g.save(); g.translate(c.x, c.y + u * u * 60 * dpr); g.globalAlpha = lv; g.lineCap = 'round';
        for (const sd of this.vines[id] || []) {
          g.beginPath(); sd.pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.lineWidth = sd.w + 1.5 * dpr; g.strokeStyle = '#1d3317'; g.stroke(); g.lineWidth = sd.w; g.strokeStyle = '#4f8a32'; g.stroke();
          for (const [x, y, a] of sd.leaves) { g.save(); g.translate(x, y); g.rotate(a); g.beginPath(); g.ellipse(4 * dpr, 0, 5 * dpr, 2.6 * dpr, 0, 0, TAU); g.fillStyle = '#6fb043'; g.fill(); g.lineWidth = 1 * dpr; g.strokeStyle = '#1d3317'; g.stroke(); g.restore(); }
        }
        g.restore();
      }
      if (id === cur && lv < 0.2) {   // current: gold pulsing ring
        const pulse = 0.5 + 0.5 * Math.sin(t * 3);
        g.save(); g.shadowColor = C.amber; g.shadowBlur = (14 + 12 * pulse) * dpr; g.beginPath(); g.ellipse(c.x, c.y, rx + 0.9 * S, ry + 0.9 * S * K, 0, 0, TAU); g.lineWidth = Math.max(3 * dpr, 0.7 * S); g.strokeStyle = C.amber; g.stroke(); g.restore();
      }
      if (id === this.selected && id !== cur) { g.save(); g.setLineDash([10 * dpr, 10 * dpr]); g.lineDashOffset = -t * 26 * dpr; g.beginPath(); g.ellipse(c.x, c.y, rx + 1.4 * S, ry + 1.4 * S * K, 0, 0, TAU); g.lineWidth = 2.2 * dpr; g.strokeStyle = 'rgba(243,235,216,0.85)'; g.stroke(); g.restore(); }
      else if (id === this.hover && id !== this.selected && st !== 'locked') { g.beginPath(); g.ellipse(c.x, c.y, rx + 0.7 * S, ry + 0.7 * S * K, 0, 0, TAU); g.lineWidth = 2 * dpr; g.strokeStyle = 'rgba(243,235,216,0.6)'; g.stroke(); }
    }
    // torches: lit along the route up to the current ring; beyond it they are cold embers
    for (const f of this.flames) {
      if (f.ring >= cur) { g.fillStyle = 'rgba(120,40,20,0.8)'; g.beginPath(); g.arc(f.x, f.y + 2 * dpr, Math.max(1.5 * dpr, f.s * 0.14), 0, TAU); g.fill(); continue; }
      const k = 0.8 + 0.2 * Math.sin(t * 9 + f.x * 0.13) * Math.sin(t * 5.3 + f.y * 0.07); const r = Math.max(3 * dpr, f.s * 0.55) * k; const gr = g.createRadialGradient(f.x, f.y, 0, f.x, f.y, r * 3); gr.addColorStop(0, 'rgba(255,240,180,1)'); gr.addColorStop(0.3, 'rgba(255,170,70,0.75)'); gr.addColorStop(1, 'rgba(255,120,40,0)'); g.fillStyle = gr; g.beginPath(); g.arc(f.x, f.y, r * 3, 0, TAU); g.fill();
    }
    // the temple's golden light beam, visible from anywhere on the map
    { const e = CHAIN.sanctuary.escape, p = this.P(e.x, e.z), th = Math.max(110 * dpr, 34 * S), top = p.y - th * 0.88, w = 18 * dpr, k = 0.75 + 0.25 * Math.sin(t * 1.3);
      g.save(); g.globalCompositeOperation = 'lighter';
      for (const [ww, al] of [[w * 2.6, 0.22], [w, 0.5]]) { const gr = g.createLinearGradient(0, top, 0, Math.max(0, top - 520 * dpr)); gr.addColorStop(0, `rgba(255,214,120,${(al * k).toFixed(3)})`); gr.addColorStop(1, 'rgba(255,214,120,0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(p.x - ww * 0.35, top); g.lineTo(p.x + ww * 0.35, top); g.lineTo(p.x + ww, top - 520 * dpr); g.lineTo(p.x - ww, top - 520 * dpr); g.closePath(); g.fill(); }
      g.restore(); }
    // the Warden waits on arena 7 (LXD: show the final challenge from the start)
    const last = CHAIN.arenas[CHAIN.arenas.length - 1];
    if (this.bossSil && this.ringState(last.level.id) !== 'cleared') {
      const c = this.P(last.center.x, last.center.z), ry = last.R * S * K, by = c.y - ry * 0.25, pulse = 0.5 + 0.5 * Math.sin(t * 2.2);
      const gr = g.createRadialGradient(c.x, by, 0, c.x, by, 60 * dpr); gr.addColorStop(0, `rgba(255,50,40,${(0.35 + 0.2 * pulse).toFixed(3)})`); gr.addColorStop(1, 'rgba(255,50,40,0)'); g.fillStyle = gr; g.beginPath(); g.ellipse(c.x, by, 60 * dpr, 60 * dpr * K, 0, 0, TAU); g.fill();
      g.save(); g.shadowColor = `rgba(255,60,50,${(0.6 + 0.3 * pulse).toFixed(3)})`; g.shadowBlur = 16 * dpr; g.drawImage(this.bossSil, c.x - this.bossSil.width / 2, by - this.bossSil.height * this.bossBase + Math.sin(t * 1.5) * 2 * dpr); g.restore();
    }
    // Karan: idle on the current ring, or walking the route (drawn before the badges so a badge always reads)
    this.drawHero(g);
    this.drawBadges(g, ids, cur, last, t, dpr);
    this.drawUnlockFlash(g, t, S, dpr);
    this.drawSky(g, t, dpr, W, H);
  }
  drawUnlockFlash(g, t, S, dpr) {
    if (this.unlock) { const tt = t - this.unlock.t0 - 1.7; if (tt > 0 && tt < 0.8) { const a = CHAIN.arenas[this.unlock.id - 1], c = this.P(a.center.x, a.center.z), k = tt / 0.8, rx = a.R * S * (1 + k * 0.5); g.save(); g.globalCompositeOperation = 'lighter'; g.beginPath(); g.ellipse(c.x, c.y, rx, rx * K, 0, 0, TAU); g.lineWidth = 6 * dpr * (1 - k); g.strokeStyle = `rgba(255,214,120,${(1 - k).toFixed(3)})`; g.stroke(); g.fillStyle = `rgba(255,214,120,${(0.25 * (1 - k)).toFixed(3)})`; g.fill(); g.restore(); } }
  }
  drawSky(g, t, dpr, W, H) {
    g.setTransform(1, 0, 0, 1, 0, 0);
    for (const cl of this.clouds) { const x = ((cl.x + t * cl.sp) % (W + cl.r * 2)) - cl.r, gr = g.createRadialGradient(x, cl.y, 0, x, cl.y, cl.r); gr.addColorStop(0, 'rgba(4,20,22,0.13)'); gr.addColorStop(1, 'rgba(4,20,22,0)'); g.fillStyle = gr; g.fillRect(x - cl.r, cl.y - cl.r, cl.r * 2, cl.r * 2); }
    for (let i = 0; i < 3; i++) { const per = 22 + i * 7, ph = ((t + i * 9) % per) / per, x = -60 * dpr + ph * (W + 120 * dpr), y = H * (0.18 + i * 0.09) + Math.sin(t * 0.8 + i) * 14 * dpr, f = Math.sin(t * 9 + i) * 4 * dpr, s = (9 - i * 2) * dpr;
      g.beginPath(); g.moveTo(x - s, y - f); g.quadraticCurveTo(x - s * 0.4, y - s * 0.4, x, y); g.quadraticCurveTo(x + s * 0.4, y - s * 0.4, x + s, y - f); g.lineWidth = 2 * dpr; g.strokeStyle = 'rgba(20,30,28,0.75)'; g.stroke(); }
  }
  drawBadges(g, ids, cur, last, t, dpr) {
    const starPath = (x, y, r) => { g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath(); };
    for (const id of ids) {
      const b = this.badges[id], st = this.ringState(id), lv = this.lockVis(id), sk = this.shakeT[id] != null && t - this.shakeT[id] < 0.45 ? Math.sin((t - this.shakeT[id]) * 48) * 5 * dpr * (1 - (t - this.shakeT[id]) / 0.45) : 0;
      const x = b.x + sk, y = b.y, boss = id === last.level.id;
      g.beginPath(); g.arc(x, y, b.r, 0, TAU); g.fillStyle = lv > 0.5 ? 'rgba(24,26,24,0.92)' : 'rgba(20,24,22,0.94)'; g.fill();
      g.lineWidth = Math.max(2.5 * dpr, b.r * 0.16); g.strokeStyle = id === cur && lv < 0.5 ? C.amber : st === 'cleared' ? C.cyan : boss ? '#e0564a' : '#7d7666'; g.stroke();
      g.font = `800 ${Math.round(b.r * 1.15)}px "Barlow Condensed", "Arial Narrow", sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = lv > 0.5 ? 'rgba(243,235,216,0.55)' : C.ivory; g.fillText(String(id), x, y + b.r * 0.06);
      if (st === 'cleared') { const n = (this.save && this.save.stars[id]) || 0, sr = Math.max(4.5 * dpr, b.r * 0.32); for (let i = 0; i < 3; i++) { starPath(x + (i - 1) * sr * 2.3, y + b.r + sr * 1.5, sr); g.fillStyle = i < n ? '#ffcf4a' : 'rgba(20,24,22,0.9)'; g.fill(); g.lineWidth = 1.2 * dpr; g.strokeStyle = '#3a2a08'; g.stroke(); } }
    }
  }
  drawHero(g) {
    const w = this.heroWorld(), a = CHAIN.arenas[this.hero.id - 1];
    if (!this.hero.walk && a) { w.z += 0; const fwd = this.unproject(...Object.values(this.P(w.x, w.z)).map((v, i) => v + (i ? a.R * this.S * K * 0.3 : 0))); w.x = fwd.x; w.z = fwd.z; }   // stand forward of the centre, clear of the back-wall badge
    const p0 = this.P(w.x, w.z), p1 = this.P(w.x + (w.dx || 0) * 0.01, w.z + (w.dz || 0) * 0.01), walking = !!this.hero.walk, dpr = this.dpr;
    const up = walking && p1.y < p0.y - 0.0001, sheet = walking && up ? 'hero_back' : 'hero_front', im = assets.get(sheet); if (!im) return;
    const def = assets.frames(sheet), an = def.anims[walking ? 'run' : 'idle'] || def.anims.idle, n = an.frames || 1, fr = Math.floor(this.t * (an.fps || 8)) % n;
    const col = ((an.col ?? 0) + fr) % def.cols, row = (an.row ?? 0) + Math.floor(((an.col ?? 0) + fr) / def.cols);
    const h = 56 * dpr, wpx = (h * def.frameW) / def.frameH, base = def.baseline ?? 1, flip = walking && p1.x < p0.x;
    g.save(); g.beginPath(); g.ellipse(p0.x, p0.y, wpx * 0.28, wpx * 0.1, 0, 0, TAU); g.fillStyle = 'rgba(0,0,0,0.35)'; g.fill();
    g.translate(p0.x, p0.y); if (flip) g.scale(-1, 1); g.drawImage(im, col * def.frameW, row * def.frameH, def.frameW, def.frameH, -wpx / 2, -h * base, wpx, h); g.restore();
  }
  /** Ring id under a CSS-pixel point (the ring disc, never smaller than a finger, or its badge); nearest wins. */
  hit(cssX, cssY) {
    if (this.unlock) return -1;
    const x = cssX * this.dpr, y = cssY * this.dpr; let best = -1, bd = Infinity;
    for (const r of CHAIN.arenas) {
      const c = this.P(r.center.x, r.center.z), rx = Math.max(r.R * this.S, 30 * this.dpr), ry = Math.max(r.R * this.S * K, 26 * this.dpr), b = this.badges[r.level.id];
      const m = Math.min(((x - c.x) / rx) ** 2 + ((y - c.y) / ry) ** 2, b ? (Math.hypot(x - b.x, y - b.y) / (b.r * 1.5)) ** 2 : 9);
      if (m < 1 && m < bd) { bd = m; best = r.level.id; }
    }
    return best;
  }
}
