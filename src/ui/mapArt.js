// ---------------------------------------------------------------------------
// MapArt – the level map as a painted isometric miniature of the REAL chain.
// Every ring is drawn at its true centre and radius from CHAIN, with walls
// only where the game has walls (so the lens passages and breach bays read
// exactly as in play), pillars at the real junctions, the causeway, the
// temple court, all on cliff islands over turquoise water with waterfalls,
// jungle, ruins and mist. A static layer is painted once per resize; a light
// dynamic layer adds selection, states, labels and torch flicker.
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
    this.selected = 1; this.hover = -1; this.save = null; this.t = 0; this.ready = false; this.flames = [];
  }

  /* ================================================================ layout */
  layout() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2), W = Math.round(window.innerWidth * dpr), H = Math.round(window.innerHeight * dpr);
    const portrait = window.innerWidth < 760 && window.innerHeight > window.innerWidth;
    this.dpr = dpr; this.W = W; this.H = H; this.portrait = portrait;
    for (const c of [this.cv, this.stat]) { c.width = W; c.height = H; }
    this.cv.style.width = window.innerWidth + 'px'; this.cv.style.height = window.innerHeight + 'px';
    const area = portrait ? { x: 0, y: 0.04 * H, w: W, h: H * 0.54 } : { x: 0.02 * W, y: 0.05 * H, w: W - (416 * dpr) - 0.03 * W, h: H * 0.9 };
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
    const islands = [];
    for (let tries = 0; tries < 600 && islands.length < 9; tries++) {
      const b = CHAIN.bounds, x = rnd(b.minX - 70, b.maxX + 70), z = rnd(b.minZ - 80, b.maxZ + 80), r = rnd(9, 17);
      const far = CHAIN.all.every((o) => Math.hypot(x - o.center.x, z - o.center.z) > o.R + r + 16) && islands.every((i) => Math.hypot(x - i.x, z - i.z) > i.r + r + 10)
        && !(x < CHAIN.causeway.gate.x + 4 && x > CHAIN.causeway.start.x - 8 && Math.abs(z - CHAIN.causeway.gate.z) < r + 6);
      const p = this.P(x, z), edge = Math.min(p.x, p.y, W - p.x, H - p.y); if (!far || edge < -40 * this.dpr || edge > 0.22 * Math.min(W, H)) continue;   // hug the frame
      islands.push({ x, z, r });
    }
    const islandMask = this.mask((m) => { for (const i of islands) { this.ell(m, i, i.r); m.fill(); for (let k = 0; k < 6; k++) { const a = rnd(0, 360), p = polar(a, i.r * rnd(0.5, 1)); this.ell(m, { x: i.x + p.x, z: i.z + p.z }, i.r * rnd(0.35, 0.6)); m.fill(); } } });
    for (const mk of [islandMask, chainMask]) this.cliffs(g, mk);
    this.waterfalls(g, chainMask, rnd);
    // ---- drawables (painter's order by screen y of their base)
    const draw = [];
    // causeway
    draw.push({ y: -1e9, f: () => this.causeway(g) });
    for (const r of CHAIN.all) { const p = this.P(r.center.x, r.center.z); draw.push({ y: p.y, f: () => this.ring(g, r) }); }
    // pillars with torches
    this.flames = [];
    CHAIN.pillars.forEach((pt, i) => { const p = this.P(pt.x, pt.z); draw.push({ y: p.y + 0.5, f: () => this.pillar(g, p, i % 2 === 0) }); });
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
      trees.push({ x, z, h: rnd(8, 11.5), f: Math.floor(rng() * 4), kind: 'canopy' });
    }
    for (const i of islands) {
      const n = 2 + Math.floor(i.r / 7);
      for (let k = 0; k < n; k++) { const a = rnd(0, 360), p = polar(a, i.r * rnd(0.15, 0.55)); trees.push({ x: i.x + p.x, z: i.z + p.z, h: rnd(9, 13), f: Math.floor(rng() * 4), kind: 'canopy' }); }
      if (rng() < 0.45) { const p = polar(rnd(0, 360), i.r * 0.5); trees.push({ x: i.x + p.x, z: i.z + p.z, h: rnd(5, 7), kind: 'ruin' }); }
    }
    for (const t of trees) { const p = this.P(t.x, t.z); draw.push({ y: p.y, f: () => this.tree(g, p, t) }); }
    draw.sort((a, b) => a.y - b.y).forEach((d) => d.f());
    // ---- atmosphere: warm glow behind the temple, mist at the edges
    const tp = this.P(CHAIN.sanctuary.escape.x, CHAIN.sanctuary.escape.z);
    const glow = g.createRadialGradient(tp.x, tp.y - 60 * this.dpr, 10, tp.x, tp.y - 60 * this.dpr, 420 * this.dpr); glow.addColorStop(0, 'rgba(255,190,110,0.32)'); glow.addColorStop(1, 'rgba(255,190,110,0)'); g.fillStyle = glow; g.fillRect(0, 0, W, H);
    for (const [fx, fy, fr] of [[0, 1, 0.55], [0, 0, 0.35], [1, 1, 0.45], [0.45, 1.05, 0.4], [1, 0.1, 0.3]]) {
      const mist = g.createRadialGradient(fx * W, fy * H, 0, fx * W, fy * H, fr * Math.max(W, H)); mist.addColorStop(0, 'rgba(225,235,232,0.55)'); mist.addColorStop(0.6, 'rgba(225,235,232,0.18)'); mist.addColorStop(1, 'rgba(225,235,232,0)');
      g.fillStyle = mist; g.fillRect(0, 0, W, H);
    }
    const vig = g.createRadialGradient(W * 0.4, H * 0.5, H * 0.35, W * 0.4, H * 0.5, Math.max(W, H) * 0.8); vig.addColorStop(0, 'rgba(5,12,10,0)'); vig.addColorStop(1, 'rgba(5,12,10,0.45)'); g.fillStyle = vig; g.fillRect(0, 0, W, H);
    this.ready = true;
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
    const env = r.level ? r.level.env : r.env, shade = { day: 0, dusk: 0.08, night: 0.2, storm: 0.14 }[env.sky] || 0;
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
  pillar(g, p, torch) {
    const S = this.S, w = Math.max(5 * this.dpr, 1.5 * S), h = Math.max(10 * this.dpr, 3.6 * S);
    const art = assets.get('wall_pillar');
    if (art) g.drawImage(art, p.x - w * 0.75, p.y - h, w * 1.5, h);
    else { g.fillStyle = C.stone; g.fillRect(p.x - w / 2, p.y - h, w, h); }
    if (torch) this.flames.push({ x: p.x, y: p.y - h - 2 * this.dpr, s: w });
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
      g.fillStyle = '#3d3a33'; g.fillRect(p.x - w / 2, p.y - h, w, h); this.flames.push({ x: p.x, y: p.y - h - 1, s: w * 1.4 });
    }
  }
  temple(g, p) {
    const img = assets.get('ui_map_temple'), h = Math.max(110 * this.dpr, 34 * this.S);
    const glow = g.createRadialGradient(p.x, p.y - h * 0.5, 4, p.x, p.y - h * 0.5, h); glow.addColorStop(0, 'rgba(255,214,140,0.55)'); glow.addColorStop(1, 'rgba(255,214,140,0)'); g.fillStyle = glow; g.fillRect(p.x - h, p.y - h * 1.5, h * 2, h * 2);
    if (img) g.drawImage(img, p.x - h / 2, p.y - h * 0.92, h, h);
  }
  tree(g, p, t) {
    const S = this.S;
    if (t.kind === 'ruin') { const img = assets.get('wall_pillar'), h = t.h * S; if (img) g.drawImage(img, p.x - h * 0.13, p.y - h, h * 0.26, h); return; }
    const img = assets.get('jungle_canopy') || assets.get('jungle_tree'), def = assets.frames(assets.get('jungle_canopy') ? 'jungle_canopy' : 'jungle_tree');
    if (!img) return;
    const h = t.h * S, w = h * (def.frameW / def.frameH), base = def.baseline ?? 1, col = t.f % def.cols;
    g.drawImage(img, col * def.frameW, 0, def.frameW, def.frameH, p.x - w / 2, p.y - h * base, w, h);
  }

  /* ================================================================ dynamic layer */
  ringState(id) { const s = this.save; if (!s) return 'open'; return s.cleared[id] ? 'cleared' : id <= s.unlocked ? 'open' : 'locked'; }
  frame(dt) {
    if (!this.ready) return;
    this.t += dt; const g = this.g, S = this.S, dpr = this.dpr, t = this.t;
    g.clearRect(0, 0, this.W, this.H); g.drawImage(this.stat, 0, 0);
    // torch flicker
    for (const f of this.flames) { const k = 0.8 + 0.2 * Math.sin(t * 9 + f.x * 0.13) * Math.sin(t * 5.3 + f.y * 0.07); const r = Math.max(3 * dpr, f.s * 0.55) * k; const gr = g.createRadialGradient(f.x, f.y, 0, f.x, f.y, r * 3); gr.addColorStop(0, 'rgba(255,240,180,1)'); gr.addColorStop(0.3, 'rgba(255,170,70,0.75)'); gr.addColorStop(1, 'rgba(255,120,40,0)'); g.fillStyle = gr; g.beginPath(); g.arc(f.x, f.y, r * 3, 0, TAU); g.fill(); }
    // rings: state plates, numbers, selection
    for (const r of CHAIN.arenas) {
      const id = r.level.id, st = this.ringState(id), c = this.P(r.center.x, r.center.z), rx = r.R * S, ry = rx * K, sel = id === this.selected, hov = id === this.hover && !sel;
      if (st === 'locked') { g.beginPath(); g.ellipse(c.x, c.y, rx, ry, 0, 0, TAU); g.fillStyle = 'rgba(8,12,10,0.3)'; g.fill(); }
      if (sel) {
        const pulse = 0.5 + 0.5 * Math.sin(t * 3);
        g.save(); g.shadowColor = C.amber; g.shadowBlur = (14 + 10 * pulse) * dpr;
        g.beginPath(); g.ellipse(c.x, c.y, rx + 0.9 * S, ry + 0.9 * S * K, 0, 0, TAU); g.lineWidth = Math.max(3 * dpr, 0.6 * S); g.strokeStyle = C.amber; g.stroke(); g.restore();
        g.save(); g.setLineDash([10 * dpr, 12 * dpr]); g.lineDashOffset = -t * 30 * dpr; g.beginPath(); g.ellipse(c.x, c.y, rx + 2.2 * S, ry + 2.2 * S * K, 0, 0, TAU); g.lineWidth = 2 * dpr; g.strokeStyle = 'rgba(244,191,85,0.7)'; g.stroke(); g.restore();
      } else if (hov) { g.beginPath(); g.ellipse(c.x, c.y, rx + 0.6 * S, ry + 0.6 * S * K, 0, 0, TAU); g.lineWidth = 2 * dpr; g.strokeStyle = 'rgba(243,235,216,0.6)'; g.stroke(); }
      if (st === 'cleared') {
        g.save(); g.setLineDash([rx * 0.32, rx * 0.12]); g.beginPath(); g.ellipse(c.x, c.y, rx * 0.66, ry * 0.66, 0, 0, TAU); g.lineWidth = Math.max(2.5 * dpr, 0.5 * S); g.strokeStyle = C.cyan; g.shadowColor = C.cyan; g.shadowBlur = 10 * dpr; g.stroke(); g.restore();
      }
      // centre plate
      const pr = Math.min(Math.max(13 * dpr, rx * 0.32), ry * 0.95 / K);
      g.beginPath(); g.ellipse(c.x, c.y, pr, pr * K, 0, 0, TAU); g.fillStyle = 'rgba(28,26,22,0.88)'; g.fill(); g.lineWidth = Math.max(2 * dpr, 0.35 * S); g.strokeStyle = sel ? C.amber : st === 'cleared' ? C.cyan : '#8a8170'; g.stroke();
      if (st === 'locked') {
        const s2 = pr * 0.5; g.fillStyle = '#b8b0a0'; g.fillRect(c.x - s2 * 0.6, c.y - s2 * 0.25, s2 * 1.2, s2 * 0.85);
        g.beginPath(); g.arc(c.x, c.y - s2 * 0.25, s2 * 0.38, Math.PI, 0); g.lineWidth = Math.max(2, s2 * 0.18); g.strokeStyle = '#b8b0a0'; g.stroke();
      } else {
        g.font = `800 ${Math.round(pr * 1.05)}px "Barlow Condensed", "Arial Narrow", sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.lineWidth = Math.max(3, pr * 0.14); g.strokeStyle = C.ink; g.strokeText(String(id), c.x, c.y + pr * 0.05); g.fillStyle = C.ivory; g.fillText(String(id), c.x, c.y + pr * 0.05);
      }
      if (st === 'cleared') { const bx = c.x + pr * 0.78, by = c.y - pr * 0.42, br = Math.max(6 * dpr, pr * 0.28); g.beginPath(); g.arc(bx, by, br, 0, TAU); g.fillStyle = C.cyan; g.fill(); g.lineWidth = 2 * dpr; g.strokeStyle = C.ink; g.stroke(); g.beginPath(); g.moveTo(bx - br * 0.45, by); g.lineTo(bx - br * 0.1, by + br * 0.38); g.lineTo(bx + br * 0.5, by - br * 0.35); g.lineWidth = Math.max(2, br * 0.28); g.stroke(); }
    }
    const s = CHAIN.causeway.start, sp = this.P(s.x, s.z); this.label(g, 'Start', sp.x, sp.y + 30 * dpr, C.ivory, 1.0);
    const e = CHAIN.sanctuary.escape, ep = this.P(e.x, e.z), th = Math.max(110 * dpr, 34 * S);
    const above = ep.y - th - 18 * dpr > 24 * dpr; this.label(g, 'The Lost Temple', ep.x, above ? ep.y - th - 14 * dpr : ep.y + 22 * dpr, C.ivory, 1.0);
  }
  label(g, text, x, y, color, scale = 1) {
    const fs = Math.round((this.portrait ? 17 : 20) * this.dpr * scale), t = text.toUpperCase();
    g.font = `800 ${fs}px "Barlow Condensed", "Arial Narrow", sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    const w = g.measureText(t).width + fs * 1.1, h = fs * 1.5;
    x = Math.min(this.W - w / 2 - 6 * this.dpr, Math.max(w / 2 + 6 * this.dpr, x)); y = Math.min(this.H - h / 2 - 4 * this.dpr, Math.max(h / 2 + 4 * this.dpr, y));
    g.beginPath(); g.roundRect ? g.roundRect(x - w / 2, y - h / 2, w, h, h / 2) : g.rect(x - w / 2, y - h / 2, w, h);
    g.fillStyle = 'rgba(8,18,16,0.72)'; g.fill(); g.lineWidth = Math.max(1, this.dpr); g.strokeStyle = 'rgba(243,235,216,0.18)'; g.stroke();
    g.fillStyle = color; g.fillText(t, x, y + fs * 0.04);
  }
  /** Ring id under a CSS-pixel point (frontmost wins), or -1. */
  hit(cssX, cssY) {
    const w = this.unproject(cssX * this.dpr, cssY * this.dpr); let best = -1, bestY = -Infinity;
    for (const r of CHAIN.arenas) if (Math.hypot(w.x - r.center.x, w.z - r.center.z) < r.R + 0.8) { const y = this.P(r.center.x, r.center.z).y; if (y > bestY) { bestY = y; best = r.level.id; } }
    return best;
  }
}
