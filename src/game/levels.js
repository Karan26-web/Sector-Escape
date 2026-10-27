// ---------------------------------------------------------------------------
// Sector Escape – level table (LXD final dimensions), chain geometry,
// answer parsing / evaluation, misconception diagnosis, hints, scoring.
//   A = (θ / 360) × π × r²: rings 1–3 in terms of π, rings 4–7 with π = 22/7
// The seven arenas form ONE continuous chain of overlapping circles: the open
// arc of arena i (central angle θ_i) is exactly the lens shared with arena i+1,
// so the two walls meet at the two intersection points and the open arc leads
// straight into the next arena.
// ---------------------------------------------------------------------------
import { reduceFraction, formatNumber, DEG, polar, wrapDeg, degDiff, toDeg, gcd } from '../engine/util.js';

export const PI = { num: 22, den: 7, value: 22 / 7, label: '22/7' };
// LXD 2026-10-22: fractions and decimals are accepted, compared at 3 decimal places (38.5, 38.500, 77/2 are all right;
// 38 is not). Every answer in the game is an exact decimal with π = 22/7, so no wider tolerance is needed.
const round3 = (v) => Math.round(v * 1000) / 1000;
/** LXD 2026-10-22: the passage you came through stays open (no seal rises behind Karan). */
export const SEAL_BEHIND = false;

const round6 = (v) => Math.round(v * 1e6) / 1e6;
export const sectorArea = (r, theta, pi = PI.value) => round6((theta / 360) * pi * r * r);
export const sectorCoef = (r, theta) => round6((theta / 360) * r * r);
/** User 2026-10-27: rings 1–3 are answered in terms of π. The π is printed beside the answer field and the learner enters
 *  only the whole number in front of it (r and θ are chosen so it is never a decimal); from ring 4 on, π = 22/7. */
export const answerFor = (level) => formatNumber(level.piForm ? sectorCoef(level.radius, level.theta) : sectorArea(level.radius, level.theta));
export const arcLength = (r, theta, pi = PI.value) => (theta / 360) * 2 * pi * r;
/** 22/7 gives a clean answer when 2r is a multiple of 7 (7, 10.5, 14, 17.5, 21 …). */
export const isPiFriendly = (r) => Math.abs((r * 2) % 7) < 1e-9;
export function formatArea(r, theta, piForm = false) {
  if (piForm) return `${formatNumber(sectorCoef(r, theta))}π`;
  if (isPiFriendly(r)) return formatNumber(sectorArea(r, theta));
  return `${formatNumber(sectorCoef(r, theta))}π ≈ ${formatNumber(sectorArea(r, theta))}`;
}
/** Guardians per breach: ~1 per 1.6 m of arc, 6..30 (LXD: more of them). */
export const botCountFor = (r, theta) => Math.max(6, Math.min(30, Math.round(arcLength(r, theta) / 1.6)));
/** Karan's observation point (LXD 2026-10-23): this far behind the centre O, on the line from the gap through O. He
 *  watches the action from there; from the top view his sprite stays clear of O, the radii, the sector and the labels
 *  (they keep their size on screen, so a bigger ring needs a little more room). */
export const watchR = (R) => Math.max(3, R * 0.2);

/* ---------------------------------------------------------------------- */
/* World constants                                                         */
/* ---------------------------------------------------------------------- */
export const WALL_HEIGHT = 6.5;
export const GATE = { smallWidth: 2.8, templeWidth: 5.2 };
export const gateHalfDeg = (widthM, r) => ((widthM / r) * 180) / Math.PI / 2;
/** Karan runs east along a stone causeway over water into arena 1's west gate. */
export const CAUSEWAY = { dirDeg: 0, length: 46, width: 4.4 };
export const SANCTUARY = { radius: 21, gateDeg: 0, name: 'The Lost Temple' };

// One evening across the journey (sky presets in chain.js): golden evening → deeper dusk → last light → the Warden's
// red storm-dusk → the temple court's golden finale. The keys are kept so the level table reads as before.
const ENV = {
  day: { sky: 'evening', floor: '#8d8f7a', wall: '#8f9a80', torches: 8 },
  day2: { sky: 'evening', floor: '#8a8478', wall: '#9a8f7e', torches: 8 },
  dusk: { sky: 'dusk', floor: '#7f8d7c', wall: '#7d8f7f', torches: 10 },
  dusk2: { sky: 'dusk', floor: '#8f7a72', wall: '#9a7f74', torches: 12 },
  night: { sky: 'twilight', floor: '#8c8680', wall: '#928b86', torches: 14 },
  night2: { sky: 'twilight', floor: '#83827f', wall: '#8a8984', torches: 16 },
  storm: { sky: 'storm', floor: '#8a7d6a', wall: '#9c8a6f', torches: 18 },
  golden: { sky: 'golden', floor: '#9a8f78', wall: '#a39578', torches: 10 },
};

/**
 * Final arena dimensions and question forms from the LXD (review 2026-10-27). Every area is in terms of π: there is no
 * 22/7 any more and no decimal is ever shown.
 *  * Arenas 1–4 are answered by CHOOSING (ask), never typed: 1 picks one of three substituted formulas (mcq); 2 picks the
 *    angle and the radius in drop-downs inside the formula ('theta'); 3 and 4 pick the fraction θ/360 and the radius
 *    ('fraction'). Right or wrong, the game then works the chosen formula out on screen and fires what it gives.
 *  * Arenas 5–7 are typed in terms of π (piForm: the π is printed beside the field), always a whole number of π: r 20
 *    (80π), r 24 (96π: now truly the largest ring), r 21 (147π).
 *  * show: how the top view labels the sector: 'symbol' θ = 90° / r = 7 m (default) · 'value' just 120° / 10.5 m (θ
 *    always sits just above the angle's arc) · angle 'right': the right-angle square, no number · radius 'diameter': a
 *    diameter line with its whole length (no arena uses it since the user's 2026-10-27 review: arena 4 shows r).
 * exitDeg = direction of the
 * open arc (0° = east/right, 90° = north/up on the overview). The suggested
 * zig-zag is kept where the geometry allows it: a turn sharper than
 * 180° − (θ + φ)/2 would make the open arc overlap the entrance arc.
 * timeBudget = the seconds the time bonus is measured against (2026-10-23: the
 * guardians wait behind the barrier, so it no longer sets their speed).
 */
export const LEVELS = [
  { id: 1, name: 'The Mossy Gate', tagline: 'A small gate. A big trap.', radius: 7, theta: 90, exitDeg: 45, timeBudget: 60, speed: 'Slow', scaffold: 'full', env: ENV.day,
    ask: { kind: 'mcq', options: [{ n: 90, d: 360, fp: 1, r: 7, rp: 2 }, { n: 90, d: 180, fp: 1, r: 7, rp: 2 }, { n: 90, d: 360, fp: 2, r: 7, rp: 1 }] } },
  { id: 2, name: 'Fallen Idol', tagline: 'A third of the wall is missing', radius: 10.5, theta: 120, exitDeg: 0, timeBudget: 54, speed: 'Slow–Moderate', scaffold: 'formula', env: ENV.day2,
    ask: { kind: 'pick', form: 'theta', a: [60, 120, 30], r: [21, 120, 10.5] }, show: { angle: 'value', radius: 'value' } },
  { id: 3, name: 'Serpent Court', tagline: 'The guardians grow restless', radius: 14, theta: 90, exitDeg: 320, timeBudget: 50, speed: 'Moderate', scaffold: 'hint', env: ENV.dusk,
    ask: { kind: 'pick', form: 'fraction', a: [[1, 4], [1, 2], [1, 5]], r: [21, 7, 14] }, show: { angle: 'right', radius: 'value' } },
  // (arena 4's choices are ours: the LXD said "as in round 3". 3/4 = 135/180, the half-turn slip; 1/4 = arena 3's answer
  // carried over; 28 m = the diameter in place of the radius; 7 m = halved. The user (2026-10-27) had the radius shown, 14 m,
  // instead of the LXD's diameter 28 m)
  { id: 4, name: 'Crimson Ruins', tagline: 'A wide breach, little time', radius: 14, theta: 135, exitDeg: 0, timeBudget: 46, speed: 'Moderate–Fast', scaffold: 'hint', env: ENV.dusk2,
    ask: { kind: 'pick', form: 'fraction', a: [[3, 4], [3, 8], [1, 4]], r: [28, 14, 7] }, show: { angle: 'value', radius: 'value' } },
  { id: 5, name: 'Twin Falls', tagline: 'Narrow arc, fast feet', radius: 20, theta: 72, piForm: true, exitDeg: 315, timeBudget: 42, speed: 'Fast', scaffold: 'hint', env: ENV.night },
  { id: 6, name: 'Thunder Well', tagline: 'The largest ring in the jungle', radius: 24, theta: 60, piForm: true, exitDeg: 45, timeBudget: 38, speed: 'Faster', scaffold: 'hint', env: ENV.night2 },
  { id: 7, name: "The Warden's Court", tagline: 'The last ring before the temple', radius: 21, theta: 120, piForm: true, exitDeg: 0, timeBudget: 34, speed: 'Fastest', scaffold: 'hint', boss: true, env: ENV.storm },
];
export const TOTAL_LEVELS = LEVELS.length;

/* ---------------------------------------------------------------------- */
/* Chain geometry                                                          */
/*  Ring i's wall is open over θ_i (the gap, closed by the barrier). The    */
/*  passage into ring i+1 is the lens of the two circles, capped at         */
/*  LENS_MAX so neighbours overlap by 7–15 % of a diameter. When θ is wider */
/*  than the lens, a BAY (annular sector R..R+D over θ) continues the arc   */
/*  outward: its side walls extend the sector's radial lines and the        */
/*  guardians stand in it, behind the barrier. Every wall piece is derived  */
/*  from one boolean over disks and bays (keepRanges), so junctions close.  */
/* ---------------------------------------------------------------------- */
export const LENS_MAX = 64; // ≈15 % lens depth for equal radii
const add = (a, b) => ({ x: a.x + b.x, z: a.z + b.z });
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const bayDepth = (R) => Math.min(5.5, Math.max(3.6, R * 0.3));

function lens(R, theta, nextR) {
  const phi = theta <= 72 ? theta : LENS_MAX;
  const c = R * Math.sin((phi / 2) * DEG), h = R * Math.cos((phi / 2) * DEG);
  const hn = Math.sqrt(Math.max(0, nextR * nextR - c * c));
  const phiNext = (2 * Math.asin(Math.min(1, c / nextR))) / DEG;
  return { phi, c, h, hn, phiNext, d: h + hn, depth: R - h + (nextR - hn), bay: phi < theta - 1e-6 };
}


export const insideDisk = (p, ring, m = 0.05) => Math.hypot(p.x - ring.center.x, p.z - ring.center.z) < ring.R - m;
/** Is p inside arena a's bay (annular sector R..R+D over θ)? margin shrinks it. */
export function inBay(a, p, margin = 0) {
  if (!a || !a.bay) return false;
  const dx = p.x - a.center.x, dz = p.z - a.center.z, r = Math.hypot(dx, dz);
  if (r < a.R - 0.12 || r > a.R + a.bay.D - margin) return false;
  return Math.abs(degDiff(a.exitDeg, toDeg(dx, dz))) <= a.theta / 2 - (margin / Math.max(r, 1)) / DEG;
}
/** Sample fn over 0..360° and return the angular runs where it is true, endpoints refined by bisection. */
export function keepRanges(fn, step = 0.5) {
  const n = Math.round(360 / step), v = []; for (let i = 0; i < n; i++) v.push(!!fn(i * step));
  if (v.every(Boolean)) return [{ a0: 0, a1: 360 }];
  if (!v.some(Boolean)) return [];
  const refine = (lo, hi, loVal) => { for (let k = 0; k < 14; k++) { const m = (lo + hi) / 2; if (!!fn(m) === loVal) lo = m; else hi = m; } return (lo + hi) / 2; };
  let s0 = v.indexOf(false); const out = [];
  for (let k = 1; k <= n; k++) {
    const i = (s0 + k) % n, prev = (i - 1 + n) % n;
    if (v[i] && !v[prev]) {
      const a0 = refine((s0 + k - 1) * step, (s0 + k) * step, false);
      let j = k; while (v[(s0 + j) % n] && j < n + k) j++;
      const a1 = refine((s0 + j - 1) * step, (s0 + j) * step, true);
      out.push({ a0, a1 }); k = j - 1;
    }
  }
  return out.map(({ a0, a1 }) => { const b = ((a0 % 360) + 360) % 360; return { a0: b, a1: b + (((a1 - a0) % 360) + 360) % 360 }; });
}

function buildChain() {
  const arenas = [];
  let center = { x: 0, z: 0 };
  for (let i = 0; i < LEVELS.length; i++) {
    const L = LEVELS[i], R = L.radius, nextR = i + 1 < LEVELS.length ? LEVELS[i + 1].radius : SANCTUARY.radius;
    const ln = lens(R, L.theta, nextR);
    const nextCenter = add(center, polar(L.exitDeg, ln.d));
    const entranceDeg = i === 0 ? wrapDeg(CAUSEWAY.dirDeg + 180) : wrapDeg(arenas[i - 1].exitDeg + 180);
    const D = ln.bay ? bayDepth(R) : 0;
    const a = {
      index: i, id: L.id, level: L, R, theta: L.theta, exitDeg: L.exitDeg, center, nextCenter, nextR, lens: ln,
      entrance: { deg: entranceDeg }, gate: i === 0 ? { deg: entranceDeg, half: gateHalfDeg(GATE.smallWidth, R) } : null,
      bay: D ? { D, corners: [-1, 1].map((s) => ({ inner: add(center, polar(L.exitDeg + s * L.theta / 2, R)), outer: add(center, polar(L.exitDeg + s * L.theta / 2, R + D)) })) } : null,
      chord: { mid: add(center, polar(L.exitDeg, ln.h)), width: 2 * ln.c },
      spawn: add(center, polar(entranceDeg, R - (i === 0 ? 2.8 : 3.2))),
      watchR: watchR(R), watch: add(center, polar(L.exitDeg + 180, watchR(R))),
    };
    arenas.push(a);
    center = nextCenter;
  }
  const last = arenas[arenas.length - 1];
  const sEntrance = wrapDeg(last.exitDeg + 180);
  const sanctuary = { index: arenas.length, id: 'temple', name: SANCTUARY.name, R: SANCTUARY.radius, center, exitDeg: SANCTUARY.gateDeg, entrance: { deg: sEntrance },
    gate: { deg: SANCTUARY.gateDeg, half: gateHalfDeg(GATE.templeWidth, SANCTUARY.radius), temple: true }, env: ENV.golden, spawn: add(center, polar(sEntrance, SANCTUARY.radius - 3.2)) };
  sanctuary.gatePos = add(center, polar(SANCTUARY.gateDeg, SANCTUARY.radius));
  sanctuary.escape = add(center, polar(SANCTUARY.gateDeg, SANCTUARY.radius + 9));
  const all = [...arenas, sanctuary];

  // ---- walls: ring circles minus openings, other disks and bays
  for (const ring of all) {
    ring.wallArcs = keepRanges((deg) => {
      if (ring.level && Math.abs(degDiff(ring.exitDeg, deg)) < ring.theta / 2) return false;
      if (ring.gate && Math.abs(degDiff(ring.gate.deg, deg)) < ring.gate.half) return false;
      const p = add(ring.center, polar(deg, ring.R));
      for (const o of all) if (o !== ring && insideDisk(p, o)) return false;
      for (const o of arenas) if (o !== ring && inBay(o, p, 0)) return false;
      return true;
    });
  }
  // ---- bay walls: outer arc + two radial walls, minus the next disk
  for (const a of arenas) {
    if (!a.bay) continue;
    const next = all[a.index + 1], Rb = a.R + a.bay.D;
    a.bay.outerArcs = keepRanges((deg) => {
      if (Math.abs(degDiff(a.exitDeg, deg)) > a.theta / 2) return false;
      const p = add(a.center, polar(deg, Rb));
      return !all.some((o) => o !== a && insideDisk(p, o));
    }, 0.25);
    a.bay.radials = [-1, 1].map((s) => {
      const deg = a.exitDeg + s * a.theta / 2; let r1 = Rb;
      for (let r = a.R; r <= Rb; r += 0.05) if (insideDisk(add(a.center, polar(deg, r)), next)) { r1 = r; break; }
      return { deg, r0: a.R, r1 };
    });
  }
  // ---- seals: the part of ring i+1's circle that opens into ring i / bay i; rising it closes the ring behind Karan
  for (const a of arenas) {
    const next = all[a.index + 1];
    a.seal = { ring: next.index, arcs: keepRanges((deg) => { const p = add(next.center, polar(deg, next.R)); return insideDisk(p, a) || inBay(a, p, 0); }, 0.25) };
  }
  // ---- columns: only where a RING wall ends (the gateposts of each passage) and where a bay wall runs into the next
  //      ring. The bay's own outer corners are closed by extending its side walls (chain.js), so no stack of columns
  //      forms along a bay wall.
  const ends = [];
  const pushEnd = (p) => { if (!ends.some((e) => dist(e, p) < 1.0)) ends.push(p); };
  const atEdge = (a, d) => !!a.bay && [a.exitDeg - a.theta / 2, a.exitDeg + a.theta / 2].some((e) => Math.abs(degDiff(e, d)) < 0.6);
  // a ring wall that turns into its bay's side wall is a corner, not an opening: no column there
  for (const ring of all) for (const r of ring.wallArcs) if (r.a1 - r.a0 < 359.9) for (const d of [r.a0, r.a1]) if (!atEdge(ring, d)) pushEnd(add(ring.center, polar(d, ring.R)));
  for (const a of arenas) if (a.bay) {
    for (const r of a.bay.outerArcs) for (const d of [r.a0, r.a1]) if (!atEdge(a, d)) pushEnd(add(a.center, polar(d, a.R + a.bay.D)));
    for (const w of a.bay.radials) if (w.r1 < a.R + a.bay.D - 0.05) pushEnd(add(a.center, polar(w.deg, w.r1)));
  }
  const gateSpots = [add(arenas[0].center, polar(arenas[0].gate.deg, arenas[0].R)), sanctuary.gatePos];
  const pillars = ends.filter((p) => gateSpots.every((g) => dist(g, p) > 2.4));

  const gate = gateSpots[0];
  const causeway = { gate, dirDeg: CAUSEWAY.dirDeg, width: CAUSEWAY.width, start: add(gate, polar(CAUSEWAY.dirDeg + 180, CAUSEWAY.length)), end: add(gate, polar(CAUSEWAY.dirDeg + 180, 0.5)) };
  const bounds = { minX: Math.min(causeway.start.x - 6, ...all.map((a) => a.center.x - a.R)), maxX: Math.max(sanctuary.escape.x + 10, ...all.map((a) => a.center.x + a.R)),
    minZ: Math.min(...all.map((a) => a.center.z - a.R - (a.bay ? a.bay.D : 0))), maxZ: Math.max(...all.map((a) => a.center.z + a.R + (a.bay ? a.bay.D : 0))) };
  bounds.cx = (bounds.minX + bounds.maxX) / 2; bounds.cz = (bounds.minZ + bounds.maxZ) / 2; bounds.w = bounds.maxX - bounds.minX; bounds.h = bounds.maxZ - bounds.minZ;
  return { arenas, sanctuary, causeway, bounds, all, pillars };
}
export const CHAIN = buildChain();

/** Walkable chain ground (any disk or bay), with an optional inset margin. */
export function onGround(x, z, margin = 0) {
  const p = { x, z };
  return CHAIN.all.some((o) => insideDisk(p, o, margin)) || CHAIN.arenas.some((a) => inBay(a, p, margin));
}
/** Furthest radius from arena a's centre along `deg` that is guardian ground (next disk or bay), contiguous from the wall. */
export function enemyMaxR(a, deg) {
  const u = polar(deg, 1), next = CHAIN.all[a.index + 1];
  let best = a.R + 0.6;
  for (let r = a.R + 0.6; r < a.R + 8; r += 0.2) {
    const p = { x: a.center.x + u.x * r, z: a.center.z + u.z * r };
    if (insideDisk(p, next, 0.9) || inBay(a, p, 0.8)) best = r; else break;
  }
  return best;
}

export function validateChain() {
  const problems = [];
  for (const a of CHAIN.arenas) {
    if (a.level.ask) {
      const right = choices(a.level).filter((c) => evaluatePick(c.expr, a.R, a.theta).status === 'correct');
      if (!right.some((c) => c.right)) problems.push(`Arena ${a.id}: no choice gives the area`);
    } else if (a.level.piForm) {
      const k = sectorCoef(a.R, a.theta);
      if (!Number.isInteger(a.R) || !Number.isInteger(k)) problems.push(`Arena ${a.id}: r ${a.R}, answer ${k}π: not whole numbers`);
    } else {
      const area = sectorArea(a.R, a.theta);
      if (Math.abs(area * 2 - Math.round(area * 2)) > 1e-9) problems.push(`Arena ${a.id}: area ${area} is not a half-integer`);
    }
    const overlapPct = Math.round((100 * a.lens.depth) / (2 * Math.min(a.R, a.nextR)));
    if (overlapPct > 20) problems.push(`Arena ${a.id}: lens depth ${overlapPct}% of the smaller diameter`);
    if (a.seal.arcs.length !== 1) problems.push(`Arena ${a.id}: seal has ${a.seal.arcs.length} pieces`);
    const inset = Math.max(4, (1.2 / a.R) / DEG);
    for (const s of [-1, 1]) { const m = enemyMaxR(a, a.exitDeg + s * (a.theta / 2 - inset)); if (m < a.R + 1.4) problems.push(`Arena ${a.id}: no guardian room at the arc edge (${(m - a.R).toFixed(1)} m)`); }
  }
  for (let i = 0; i < CHAIN.all.length; i++) for (let j = i + 2; j < CHAIN.all.length; j++) {
    const A = CHAIN.all[i], B = CHAIN.all[j], g = dist(A.center, B.center) - A.R - B.R - (A.bay ? A.bay.D : 0);
    if (g < 1.5) problems.push(`${A.id} and ${B.id} are only ${g.toFixed(1)} m apart`);
  }
  return problems;
}

/* ---------------------------------------------------------------------- */
/* Answer parsing & evaluation                                             */
/* ---------------------------------------------------------------------- */
const NUM = '\\d+(?:\\.\\d+)?';
const numOrFrac = (s) => {
  const m = s.match(new RegExp(`^\\(?(${NUM})(?:/(${NUM}))?\\)?$`));
  if (!m) return NaN;
  const a = parseFloat(m[1]), b = m[2] != null ? parseFloat(m[2]) : 1;
  return b === 0 ? NaN : a / b;
};
/** "154", "616/4", "153.86", "49π", "49pi", "49*pi", "pi*49", "98π/2", "(3/4)π", "π". */
export function parseAnswer(raw) {
  if (typeof raw === 'number') return { value: raw, isPi: false, piCoef: null, text: formatNumber(raw) };
  const s = String(raw ?? '').trim().toLowerCase().replace(/,/g, '').replace(/\s+/g, '').replace(/[×x*·]/g, '').replace(/pi/g, 'π');
  const piCount = (s.match(/π/g) || []).length;
  if (piCount > 1) return { value: NaN, isPi: true, piCoef: NaN, text: raw };
  if (piCount === 1) {
    let coef;
    const tail = s.match(new RegExp(`^(.*)π/(${NUM})$`));
    if (tail) { const c = tail[1] === '' ? 1 : numOrFrac(tail[1]); coef = c / parseFloat(tail[2]); }
    else if (s === 'π') coef = 1;
    else if (s.endsWith('π')) coef = numOrFrac(s.slice(0, -1));
    else if (s.startsWith('π')) coef = numOrFrac(s.slice(1));
    else coef = NaN;
    return { value: coef * PI.value, isPi: true, piCoef: coef, text: `${formatNumber(coef)}π` };
  }
  const v = numOrFrac(s);
  return { value: v, isPi: false, piCoef: null, text: isFinite(v) ? formatNumber(v) : String(raw) };
}

/** piForm: the π is printed beside the field, so a plain number is the coefficient of π (9 → 9π). */
export function evaluateAnswer(raw, r, theta, { piForm = false } = {}) {
  const exact = sectorArea(r, theta), coef = sectorCoef(r, theta);
  let p = parseAnswer(raw);
  if (piForm && !p.isPi) p = { value: p.value * PI.value, isPi: true, piCoef: p.value, text: `${p.text}π` };
  const base = { exact, coef, exactText: formatArea(r, theta, piForm), isPi: p.isPi, enteredText: p.text };
  if (!isFinite(p.value) || p.value <= 0) return { ...base, status: 'invalid', entered: NaN, ratio: 0, firedTheta: 0, excessTheta: 0, coverage: 0, diagnosis: null };
  let status, ratio;
  if (p.isPi) { ratio = p.piCoef / coef; status = Math.abs(round3(p.piCoef) - round3(coef)) < 1e-6 ? 'correct' : p.piCoef < coef ? 'under' : 'over'; }
  else { ratio = p.value / exact; status = Math.abs(round3(p.value) - round3(exact)) < 1e-6 ? 'correct' : p.value < exact ? 'under' : 'over'; }
  const firedTheta = Math.min(360, theta * ratio);
  const diagnosis = status === 'correct' ? null : piForm ? diagnosePi(p.piCoef, r, theta, coef) : diagnose(p.value, r, theta, exact);
  return { ...base, status, entered: p.value, ratio, firedTheta, excessTheta: Math.max(0, firedTheta - theta), coverage: Math.min(1, ratio), diagnosis };
}

/* ---------------------------------------------------------------------- */
/* Arenas 1–4: answers chosen, not typed (LXD 2026-10-27)                   */
/*  A chosen answer is an expression { n, d, fp, r, rp }: (n/d)^fp × π ×    */
/*  r^rp. It is worked out exactly (fractions, never decimals) and fired    */
/*  like a typed answer: its area decides the shot.                         */
/* ---------------------------------------------------------------------- */
const Q = (n, d = 1) => { if (d < 0) { n = -n; d = -d; } const g = gcd(n, d); return { n: n / g, d: d / g }; };
const qOf = (x) => { let d = 1; while (!Number.isInteger(Math.round(x * d * 1e9) / 1e9) && d < 1e6) d *= 10; return Q(Math.round(x * d), d); };
const qMul = (a, b) => Q(a.n * b.n, a.d * b.d);
const qPow = (a, k) => (k === 2 ? qMul(a, a) : a);
/** the expression's number in front of π, exact */
export const exprCoef = (e) => qMul(qPow(Q(e.n, e.d), e.fp), qPow(qOf(e.r), e.rp));
/** Every choice of a level, with the expression it makes: mcq → its options; pick → each angle-or-fraction × radius pair.
 *  sel: { opt } or { a, r } (indices); right: the substitution of the diagram's own values (θ/360 and R). */
export function choices(L) {
  const ask = L.ask; if (!ask) return [];
  const exact = Q(L.theta, 360), R = qOf(L.radius), same = (p, q) => p.n === q.n && p.d === q.d;
  if (ask.kind === 'mcq') return ask.options.map((e, i) => ({ sel: { opt: i }, expr: e, right: e.fp === 1 && e.rp === 2 && same(Q(e.n, e.d), exact) && same(qOf(e.r), R) }));
  const out = [];
  ask.a.forEach((a, i) => ask.r.forEach((r, j) => {
    const expr = ask.form === 'theta' ? { n: a, d: 360, fp: 1, r, rp: 2 } : { n: a[0], d: a[1], fp: 1, r, rp: 2 };
    out.push({ sel: { a: i, r: j }, expr, right: same(Q(expr.n, expr.d), exact) && same(qOf(r), R) });
  }));
  return out;
}
/** which option of each drop-down (or the mcq option) is the diagram's own value */
export function pickTruth(L) {
  const right = choices(L).find((c) => c.right); return right ? right.sel : {};
}
/** Evaluate a chosen expression like a typed answer (status, the fired wedge), in terms of π. */
export function evaluatePick(e, r, theta) {
  const k = exprCoef(e), coef = sectorCoef(r, theta), value = k.n / k.d, ratio = value / coef;
  const status = Math.abs(ratio - 1) < 1e-9 ? 'correct' : ratio < 1 ? 'under' : 'over', firedTheta = Math.min(360, theta * ratio);
  return { status, coef, entered: value * PI.value, ratio, firedTheta, excessTheta: Math.max(0, firedTheta - theta), coverage: Math.min(1, ratio), diagnosis: null, k };
}
/** The working, line by line, for the animation (ui.formula.solveExpr): as chosen → (a decimal radius as a fraction) →
 *  the fraction reduced and the power worked out → A = kπ. */
export function solveSteps(e) {
  const r = qOf(e.r), f = Q(e.n, e.d), steps = [{ f: { n: e.n, d: e.d, pow: e.fp }, r: { text: formatNumber(e.r), pow: e.rp } }];
  if (r.d !== 1) steps.push({ f: { n: e.n, d: e.d, pow: e.fp }, r: { q: r, pow: e.rp } });
  steps.push({ f: { q: qPow(f, e.fp) }, r: { q: qPow(r, e.rp) } });
  steps.push({ k: exprCoef(e) });
  return steps;
}
/** One line after a wrong choice: what was misread, in the diagram's own terms. */
export function pickTip(L, sel) {
  const ask = L.ask, truth = pickTruth(L), R = formatNumber(L.radius);
  if (ask.kind === 'mcq') {
    const e = ask.options[sel.opt];
    if (e.d !== 360) return `A full turn is 360°: the fraction is ${L.theta}/360, not ${e.n}/${e.d}.`;
    if (e.fp === 2 || e.rp !== 2) return `Only the radius is squared: (${L.theta}/360) × π × (${R})².`;
    return '';
  }
  const aWrong = sel.a !== truth.a, rWrong = sel.r !== truth.r, rv = ask.r[sel.r];
  if (rWrong) {
    if (rv === L.radius * 2) return L.show && L.show.radius === 'diameter' ? `${formatNumber(rv)} m is the diameter: the radius is half of it, ${R} m.` : `${formatNumber(rv)} m is twice the radius: the radius is ${R} m.`;
    if (ask.form === 'theta' && rv === L.theta) return `${formatNumber(rv)} is the angle, not the radius: the radius is ${R} m.`;
    return `The radius is ${R} m${L.show && L.show.radius === 'diameter' ? ': half the diameter' : ''}.`;
  }
  if (aWrong) {
    if (ask.form === 'theta') return `The angle at O is ${L.theta}°.`;
    const [n, d] = reduceFraction(L.theta, 360), mark = L.show && L.show.angle === 'right' ? 'The square mark at O means 90°' : `The angle is ${L.theta}°`;
    return `${mark}: ${L.theta}/360 = ${n}/${d}.`;
  }
  return '';
}

export function diagnose(entered, r, theta, exact = sectorArea(r, theta)) {
  const pi = PI.value, piTxt = '22/7';
  const near = (v, target, rel = 0.02) => Math.abs(v - target) <= Math.max(0.51, Math.abs(target) * rel);
  const under = entered < exact;
  const checks = [
    [pi * r * r, 'full-circle', 'That is the area of the WHOLE circle.', 'The open arc is only part of it — multiply πr² by θ/360.'],
    [(theta / 360) * 2 * pi * r, 'arc-length', 'That is the ARC LENGTH, not the area.', 'Area needs r² — multiply by r once more, and use πr² instead of 2πr.'],
    [(theta / 360) * pi * r, 'not-squared', 'The radius was not squared.', 'r² means r × r. Use ' + r + ' × ' + r + ' = ' + formatNumber(r * r) + '.'],
    [2 * pi * r, 'circumference', 'That is the circumference of the circle.', 'Area uses πr², not 2πr.'],
    [(theta / 360) * pi * (2 * r) * (2 * r), 'used-diameter', 'Looks like the diameter was used instead of the radius.', 'r is the distance from the gun to the wall: ' + r + ' m.'],
    [theta, 'angle', 'You entered the angle itself.', 'θ is only the first ingredient. Compute (θ/360) × πr².'],
    [r * r, 'r-squared', 'r² is only one step of the formula.', 'Now multiply by π and by θ/360.'],
    [(theta / 360) * r * r, 'forgot-pi', 'π is missing.', 'You have (θ/360) × r² — now multiply by 22/7.'],
    [r, 'radius', 'That is just the radius.', 'Use the full formula: (θ/360) × πr².'],
    [exact * 10, 'decimal', 'Ten times too large.', 'Check your place value / decimal point.'],
    [exact / 10, 'decimal', 'Ten times too small.', 'Check your place value / decimal point.'],
    [(360 / theta) * pi * r * r, 'fraction-flipped', 'The fraction is upside down.', 'Use θ/360, not 360/θ.'],
    [exact * 2, 'double', 'Exactly double the required area.', 'Did you use 2πr² or a 2 somewhere it does not belong?'],
    [exact / 2, 'half', 'Exactly half the required area.', 'Check the fraction θ/360 — reduce it carefully.'],
    [(theta / 360) * 3 * r * r, 'pi-as-3', 'π was taken as 3.', `Use π = ${piTxt} (≈ 3.14).`],
  ];
  for (const [target, code, title, tip] of checks) if (near(entered, target) && !near(target, exact, 0.005)) return { code, title, tip, under };
  const pct = Math.round(Math.abs(entered / exact - 1) * 100);
  return under ? { code: 'under', title: `About ${pct}% too small.`, tip: `Re-check each step: θ/360, then r², then × ${piTxt}.`, under: true }
               : { code: 'over', title: `About ${pct}% too large.`, tip: `Re-check each step: θ/360, then r², then × ${piTxt}.`, under: false };
}
/** The same diagnosis for rings answered in terms of π: `entered` is the number in front of π, so every check is in
 *  units of π (the whole circle is r², the circumference 2r …). One mistake only exists here: multiplying by 22/7 (or
 *  3.14) although the π is already printed beside the answer. */
export function diagnosePi(entered, r, theta, coef = sectorCoef(r, theta)) {
  const near = (v, target, rel = 0.02) => Math.abs(v - target) <= Math.max(0.51, Math.abs(target) * rel);
  const under = entered < coef;
  const checks = [
    [coef * PI.value, 'pi-included', 'π was multiplied in.', 'The π is already beside the answer — enter only the number in front of it.'],
    [coef * 3.14, 'pi-included', 'π was multiplied in.', 'The π is already beside the answer — enter only the number in front of it.'],
    [r * r, 'full-circle', 'That is the WHOLE circle (r²π).', 'The open arc is only part of it — multiply r² by θ/360.'],
    [(theta / 360) * 2 * r, 'arc-length', 'That is the ARC LENGTH, not the area.', 'Area needs r², not 2r.'],
    [(theta / 360) * r, 'not-squared', 'The radius was not squared.', `r² means r × r. Use ${r} × ${r} = ${r * r}.`],
    [2 * r, 'circumference', 'That is the circumference (2rπ).', 'Area uses r², not 2r.'],
    [(theta / 360) * 4 * r * r, 'used-diameter', 'Looks like the diameter was used instead of the radius.', `r is the distance from O to the wall: ${r} m.`],
    [theta, 'angle', 'You entered the angle itself.', 'Compute (θ/360) × r².'],
    [r, 'radius', 'That is just the radius.', 'Use (θ/360) × r².'],
    [coef * 10, 'decimal', 'Ten times too large.', 'Check your place value.'],
    [coef / 10, 'decimal', 'Ten times too small.', 'Check your place value.'],
    [(360 / theta) * r * r, 'fraction-flipped', 'The fraction is upside down.', 'Use θ/360, not 360/θ.'],
    [coef * 2, 'double', 'Exactly double the required area.', 'Is there an extra × 2?'],
    [coef / 2, 'half', 'Exactly half the required area.', 'Check the fraction θ/360.'],
  ];
  for (const [target, code, title, tip] of checks) if (near(entered, target) && !near(target, coef, 0.005)) return { code, title, tip, under };
  const pct = Math.round(Math.abs(entered / coef - 1) * 100);
  return { code: under ? 'under' : 'over', title: `About ${pct}% too ${under ? 'small' : 'large'}.`, tip: 'Re-check each step: θ/360, then r².', under };
}

/* ---------------------------------------------------------------------- */
/* Scaffolding                                                             */
/* ---------------------------------------------------------------------- */
/** Numbers for the formula above the keypad (user, 2026-10-22). The formula A = θ/360 × π × r² is shown from the start;
 *  the 1st wrong shot substitutes the numbers (θ, π = 22/7, r), crosses out what cancels (θ/360 → n/d; one r against
 *  the 7 of 22/7 → k = r/7) and simplifies (A = n/d × 22 × k × r); the 2nd shows the answer as a fraction. Every LXD
 *  radius is a multiple of 3.5, so k is 1, 1.5, 2, 2.5 or 3. */
export function formulaParts(r, theta) {
  const [n, d] = reduceFraction(theta, 360), k = r / 7, P = 22 * k * r;
  const [an, ad] = reduceFraction(Math.round(n * P * 2), d * 2);
  // in terms of π (rings 1–3, whole r): A = n/d × π × r × r → n/d × π × r² → n/d × r²π = cn/cd π
  const r2 = r * r, [cn, cd] = Number.isInteger(r2) ? reduceFraction(n * r2, d) : [n * r2, d];
  return { theta, r, n, d, k, P, an, ad, rText: formatNumber(r), kText: formatNumber(k), PText: formatNumber(P), answerFraction: ad === 1 ? `${an}` : `${an}/${ad}`,
    r2Text: formatNumber(r2), cn, cd };
}
/** One line near the beam after a WRONG shot: just the numbers (the banner already says too small / too wide). */
export function beamLine(res, theta) {
  if (res.status === 'correct') return '';
  return `Your beam covered ${Math.round(res.firedTheta)}° — the arc is ${theta}°.`;
}
/** The misconception tip: one line just above the answer field. */
export function tipLine(diag, r, theta) {
  if (!diag) return '';
  const [n, d] = reduceFraction(theta, 360), f = d === 1 ? `${n}` : `${n}/${d}`, rr = formatNumber(r), r2 = formatNumber(r * r);
  const lines = {
    'full-circle': `That's the whole circle — now take θ/360 = ${f} of it.`,
    'arc-length': `That's the arc length — area needs π r², not 2πr.`,
    'not-squared': `Looks like you didn't square r: ${rr} × ${rr} = ${r2}`,
    circumference: `That's the circumference — area uses π r², not 2πr.`,
    'used-diameter': `Looks like you used the diameter — r is ${rr} m.`,
    angle: `That's just the angle — use (θ/360) × π r².`,
    'r-squared': `r² = ${r2} is only one step — now × 22/7 × ${f}.`,
    'forgot-pi': `π is missing — multiply by 22/7.`,
    radius: `That's just the radius — use (θ/360) × π r².`,
    decimal: diag.under ? `Ten times too small — check the decimal point.` : `Ten times too big — check the decimal point.`,
    'fraction-flipped': `The fraction is upside down — use θ/360, not 360/θ.`,
    double: `Exactly double — is there an extra × 2?`,
    half: `Exactly half — check θ/360 = ${f}.`,
    'pi-as-3': `π was taken as 3 — use 22/7.`,
    'pi-included': `π is already beside your answer — enter only the number in front of it.`,
  };
  return lines[diag.code] || '';   // no generic advice: the solution line on the floor already shows the next step
}

/* ---------------------------------------------------------------------- */
/* Scoring                                                                 */
/* ---------------------------------------------------------------------- */
export const SCORE = { base: 500, timeMax: 300, noDamage: 300, perfectShot: 200 };
/** Stars (shown on the results card with the reason for each): ★ cleared · ★ at most one miss · ★ first shot. */
export function computeScore({ timeUsed, timeBudget, shieldsLost, firstTryCorrect }) {
  const timeBonus = Math.round(SCORE.timeMax * Math.max(0, 1 - timeUsed / Math.max(1, timeBudget)));
  const rows = [
    { label: 'Arena cleared', value: SCORE.base }, { label: 'Time bonus', value: timeBonus },
    { label: 'No damage', value: shieldsLost === 0 ? SCORE.noDamage : 0 }, { label: 'Perfect first shot', value: firstTryCorrect ? SCORE.perfectShot : 0 },
  ];
  const total = rows.reduce((s, r) => s + r.value, 0);
  const criteria = [{ label: 'Cleared', ok: true }, { label: 'At most 1 miss', ok: shieldsLost <= 1 }, { label: 'First shot', ok: !!firstTryCorrect }];
  const stars = criteria.filter((c) => c.ok).length;
  return { rows, total, stars, criteria };
}
