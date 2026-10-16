// ---------------------------------------------------------------------------
// Sector Escape – level data, difficulty ladder, answer parsing & evaluation
//   A = (θ / 360) × π × r²
// Tiers 1–3 use radii that are multiples of 7 so π = 22/7 gives whole numbers.
// Tiers 4–5 use other radii: the exact answer is a multiple of π (e.g. 50π),
// which the learner may type directly ("50π", "50pi"); decimals using 22/7,
// 3.14 or 3.1416 are accepted as well.
// ---------------------------------------------------------------------------
import { reduceFraction, formatNumber } from '../engine/util.js';

export const PI = { num: 22, den: 7, value: 22 / 7, label: '22/7' };
/** Accept decimal answers within ±0.5 m² or ±0.5 % (π = 3.14 still passes); π-form within 0.5 %. */
export const TOLERANCE = { abs: 0.5, rel: 0.005, coefRel: 0.005 };

const round6 = (v) => Math.round(v * 1e6) / 1e6;
export const sectorArea = (r, theta, pi = PI.value) => round6((theta / 360) * pi * r * r);
/** Coefficient of π in the exact answer: (θ/360) · r². */
export const sectorCoef = (r, theta) => round6((theta / 360) * r * r);
export const arcLength = (r, theta, pi = PI.value) => (theta / 360) * 2 * pi * r;
export const circleArea = (r, pi = PI.value) => pi * r * r;
/** True when 22/7 makes the answers whole numbers (radius a multiple of 7). */
export const isPiFriendly = (r) => r % 7 === 0;
/** "154" or "50π ≈ 157.14" */
export function formatArea(r, theta) {
  if (isPiFriendly(r)) return formatNumber(sectorArea(r, theta));
  return `${formatNumber(sectorCoef(r, theta))}π ≈ ${formatNumber(sectorArea(r, theta))}`;
}

/** Number of bots that pour through a breach: ~1 per 2.2 m of arc, 4..24. */
export const botCountFor = (r, theta) => Math.max(4, Math.min(24, Math.round(arcLength(r, theta) / 2.2)));

const wave = (theta, breachDeg, timeBudget) => ({ theta, breachDeg, timeBudget });
/** A variant = one concrete problem set for an arena (radius + waves, optional gate positions). */
const variant = (radius, waves, gates = {}) => ({ radius, waves, ...gates });

/**
 * Difficulty ladder (see docs/GDD.md §3):
 *   tier 1  friendly angles (90°, 180°), formula + substitution shown, 100 s
 *   tier 2  60°/120°/45°/135°, formula on request, 80–70 s
 *   tier 3  two consecutive waves, night, 65–55 s
 *   tier 4  radius not a multiple of 7 → answer in terms of π (or decimals), 55 s
 *   tier 5  boss: three widening breaches, 60–50 s
 * variants[0] is the canonical problem from the LXD brief; replaying a cleared
 * arena cycles through the other variants so practice always brings new numbers.
 */
export const LEVELS = [
  {
    id: 1, name: 'The Mossy Gate', tagline: 'Where the jungle first bites back', tier: 1,
    entranceDeg: 270, exitDeg: 90, scaffold: 'full',
    variants: [variant(14, [wave(90, 30, 100)]), variant(14, [wave(45, 20, 100)]), variant(14, [wave(135, 0, 95)])],
    env: { floor: '#8d8f7a', wall: '#8f9a80', fog: '#20351f', torches: 8, moss: 0.9, sky: 'day' },
    mapNode: { x: 0.27, y: 0.63, color: '#f5c518' },
  },
  {
    id: 2, name: 'Fallen Idol', tagline: 'Half the wall is rotten stone', tier: 1,
    entranceDeg: 240, exitDeg: 120, scaffold: 'formula',
    variants: [variant(14, [wave(180, 0, 90)]), variant(14, [wave(270, 0, 90)], { entranceDeg: 200, exitDeg: 160 }), variant(21, [wave(180, 0, 90)])],
    env: { floor: '#8a8478', wall: '#9a8f7e', fog: '#2a2f1f', torches: 6, moss: 0.6, sky: 'day' },
    mapNode: { x: 0.34, y: 0.46, color: '#7ec8f5' },
  },
  {
    id: 3, name: 'Serpent Court', tagline: 'The guardians grow restless', tier: 2,
    entranceDeg: 270, exitDeg: 90, scaffold: 'hint',
    variants: [variant(21, [wave(60, 150, 80)]), variant(21, [wave(40, 200, 80)]), variant(21, [wave(100, 0, 80)])],
    env: { floor: '#7f8d7c', wall: '#7d8f7f', fog: '#172e22', torches: 10, moss: 1.0, sky: 'dusk' },
    mapNode: { x: 0.42, y: 0.49, color: '#7ff59a' },
  },
  {
    id: 4, name: 'Crimson Ruins', tagline: 'A wide breach, little time', tier: 2,
    entranceDeg: 270, exitDeg: 90, scaffold: 'hint',
    variants: [variant(21, [wave(120, 20, 70)]), variant(21, [wave(160, 0, 70)]), variant(28, [wave(135, 0, 70)])],
    env: { floor: '#8f7a72', wall: '#9a7f74', fog: '#2e1d1a', torches: 12, moss: 0.4, sky: 'dusk' },
    mapNode: { x: 0.47, y: 0.21, color: '#f54a3a' },
  },
  {
    id: 5, name: 'Twin Breach', tagline: 'Two waves. Two sectors. No mistakes.', tier: 3,
    entranceDeg: 270, exitDeg: 90, scaffold: 'hint',
    variants: [
      variant(28, [wave(45, 20, 65), wave(135, 190, 60)]),
      variant(28, [wave(90, 0, 65), wave(225, 0, 55)], { entranceDeg: 230, exitDeg: 130 }),
      variant(35, [wave(72, 0, 60), wave(144, 180, 55)]),
    ],
    env: { floor: '#86818f', wall: '#8b8299', fog: '#231c33', torches: 14, moss: 0.5, sky: 'night' },
    mapNode: { x: 0.65, y: 0.25, color: '#f58ae0' },
  },
  {
    id: 6, name: 'Thunder Well', tagline: 'No more friendly numbers — think in π', tier: 4,
    entranceDeg: 270, exitDeg: 90, scaffold: 'hint',
    variants: [variant(20, [wave(45, 30, 55)]), variant(15, [wave(72, 0, 55)]), variant(18, [wave(100, 200, 55)]), variant(24, [wave(75, 0, 50)])],
    env: { floor: '#777f8f', wall: '#7a8296', fog: '#141c2e', torches: 16, moss: 0.3, sky: 'night' },
    mapNode: { x: 0.67, y: 0.58, color: '#6a3fd6' },
  },
  {
    id: 7, name: "The Warden's Arena", tagline: 'Break every shield. Reach the temple.', tier: 5,
    entranceDeg: 300, exitDeg: 60, scaffold: 'hint',
    boss: { name: 'The Sector Warden', shields: 3, standDeg: 60 },
    variants: [
      variant(28, [wave(90, 180, 60), wave(135, 180, 55), wave(225, 180, 50)]),
      variant(35, [wave(72, 180, 60), wave(144, 180, 55), wave(216, 180, 50)]),
      variant(30, [wave(60, 180, 60), wave(120, 180, 55), wave(200, 180, 50)]),
    ],
    env: { floor: '#8a7d6a', wall: '#9c8a6f', fog: '#2b1f12', torches: 18, moss: 0.2, sky: 'storm' },
    mapNode: { x: 0.83, y: 0.71, color: '#f5c9a8' },
  },
];
// canonical radius/waves for code that just needs a preview of the arena
for (const L of LEVELS) { L.radius = L.variants[0].radius; L.waves = L.variants[0].waves; L.piFriendly = isPiFriendly(L.radius); }

export const getLevel = (id) => LEVELS.find((l) => l.id === id) || null;
export const TOTAL_LEVELS = LEVELS.length;

/** Concrete level for one play-through: variant `index` (wraps). */
export function resolveLevel(level, index = 0) {
  const v = level.variants[((index % level.variants.length) + level.variants.length) % level.variants.length];
  const out = { ...level, radius: v.radius, waves: v.waves, variantIndex: index % level.variants.length, variantCount: level.variants.length,
    entranceDeg: v.entranceDeg ?? level.entranceDeg, exitDeg: v.exitDeg ?? level.exitDeg, piFriendly: isPiFriendly(v.radius) };
  if (level.boss) out.boss = { ...level.boss, standDeg: out.exitDeg };
  return out;
}

/** Gate widths in metres → angular half-width in degrees on a wall of radius r. */
export const GATE = { smallWidth: 2.8, largeWidth: 4.4 };
export const gateHalfDeg = (widthM, r) => ((widthM / r) * 180) / Math.PI / 2;

/* ---------------------------------------------------------------------- */
/* Answer parsing                                                          */
/* ---------------------------------------------------------------------- */
const NUM = '\\d+(?:\\.\\d+)?';
const numOrFrac = (s) => {
  const m = s.match(new RegExp(`^\\(?(${NUM})(?:/(${NUM}))?\\)?$`));
  if (!m) return NaN;
  const a = parseFloat(m[1]), b = m[2] != null ? parseFloat(m[2]) : 1;
  return b === 0 ? NaN : a / b;
};
/**
 * Parse "154", "616/4", "153.86", "49π", "49pi", "49*pi", "pi*49", "49π/2", "(3/4)π", "π".
 * Returns { value (numeric, π=22/7 substituted), isPi, piCoef, text }.
 */
export function parseAnswer(raw) {
  if (typeof raw === 'number') return { value: raw, isPi: false, piCoef: null, text: formatNumber(raw) };
  let s = String(raw ?? '').trim().toLowerCase().replace(/,/g, '').replace(/\s+/g, '').replace(/[×x*·]/g, '').replace(/pi/g, 'π');
  const piCount = (s.match(/π/g) || []).length;
  if (piCount > 1) return { value: NaN, isPi: true, piCoef: NaN, text: raw };
  if (piCount === 1) {
    // forms: Cπ, πC, Cπ/D, (A/B)π, π
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

/**
 * Evaluate a learner's answer for a sector of radius r and angle theta.
 * status 'correct' | 'under' | 'over' | 'invalid'; firedTheta drives the laser.
 */
export function evaluateAnswer(raw, r, theta) {
  const exact = sectorArea(r, theta), coef = sectorCoef(r, theta);
  const p = parseAnswer(raw);
  const base = { exact, coef, exactText: formatArea(r, theta), isPi: p.isPi, enteredText: p.text };
  if (!isFinite(p.value) || p.value <= 0) return { ...base, status: 'invalid', entered: NaN, ratio: 0, firedTheta: 0, excessTheta: 0, coverage: 0, diagnosis: null };
  let status, ratio;
  if (p.isPi) {
    ratio = p.piCoef / coef;
    status = Math.abs(p.piCoef - coef) <= Math.max(0.005, coef * TOLERANCE.coefRel) ? 'correct' : p.piCoef < coef ? 'under' : 'over';
  } else {
    ratio = p.value / exact;
    const tol = Math.max(TOLERANCE.abs, exact * TOLERANCE.rel);
    status = Math.abs(p.value - exact) <= tol ? 'correct' : p.value < exact ? 'under' : 'over';
  }
  const firedTheta = Math.min(360, theta * ratio);
  return { ...base, status, entered: p.value, ratio, firedTheta, excessTheta: Math.max(0, firedTheta - theta), coverage: Math.min(1, ratio),
    diagnosis: status === 'correct' ? null : diagnose(p.value, r, theta, exact) };
}

/** Identify the most likely misconception behind a wrong answer (numeric value, π = 22/7). */
export function diagnose(entered, r, theta, exact = sectorArea(r, theta)) {
  const pi = PI.value, piTxt = isPiFriendly(r) ? '22/7' : 'π';
  const near = (v, target, rel = 0.02) => Math.abs(v - target) <= Math.max(0.51, Math.abs(target) * rel);
  const under = entered < exact;
  const checks = [
    [pi * r * r, 'full-circle', 'That is the area of the WHOLE circle.', 'The breach is only part of it — multiply πr² by θ/360.'],
    [(theta / 360) * 2 * pi * r, 'arc-length', 'That is the ARC LENGTH, not the area.', 'Area needs r² — multiply by r once more, and use πr² instead of 2πr.'],
    [(theta / 360) * pi * r, 'not-squared', 'The radius was not squared.', 'r² means r × r. Use ' + r + ' × ' + r + ' = ' + r * r + '.'],
    [2 * pi * r, 'circumference', 'That is the circumference of the circle.', 'Area uses πr², not 2πr.'],
    [(theta / 360) * pi * (2 * r) * (2 * r), 'used-diameter', 'Looks like the diameter was used instead of the radius.', 'r is the distance from the centre to the wall: ' + r + ' m.'],
    [theta, 'angle', 'You entered the angle itself.', 'θ is only the first ingredient. Compute (θ/360) × πr².'],
    [r * r, 'r-squared', 'r² is only one step of the formula.', 'Now multiply by π and by θ/360.'],
    [(theta / 360) * r * r, 'forgot-pi', 'π is missing.', 'You have (θ/360) × r² — now multiply by π (type it as …π or use 22/7).'],
    [r, 'radius', 'That is just the radius.', 'Use the full formula: (θ/360) × πr².'],
    [exact * 10, 'decimal', 'Ten times too large.', 'Check your place value / decimal point.'],
    [exact / 10, 'decimal', 'Ten times too small.', 'Check your place value / decimal point.'],
    [(360 / theta) * pi * r * r, 'fraction-flipped', 'The fraction is upside down.', 'Use θ/360, not 360/θ.'],
    [exact * 2, 'double', 'Exactly double the required area.', 'Did you use 2πr² or a 2 somewhere it does not belong?'],
    [exact / 2, 'half', 'Exactly half the required area.', 'Check the fraction θ/360 — reduce it carefully.'],
    [(theta / 360) * 3 * r * r, 'pi-as-3', 'π was taken as 3.', `Use π = ${piTxt} (≈ 3.14).`],
  ];
  for (const [target, code, title, tip] of checks) {
    if (near(entered, target) && !near(target, exact, 0.005)) return { code, title, tip, under };
  }
  const pct = Math.round(Math.abs(entered / exact - 1) * 100);
  return under
    ? { code: 'under', title: `About ${pct}% too small.`, tip: `Re-check each step: θ/360, then r², then × ${piTxt}.`, under: true }
    : { code: 'over', title: `About ${pct}% too large.`, tip: `Re-check each step: θ/360, then r², then × ${piTxt}.`, under: false };
}

/* ---------------------------------------------------------------------- */
/* Scaffolding text                                                        */
/* ---------------------------------------------------------------------- */
export const FORMULA_HTML = 'A = <span class="frac"><span>θ</span><span>360</span></span> × π r<sup>2</sup>';

export function substituted(r, theta) {
  const piPart = isPiFriendly(r) ? '<span class="frac"><span>22</span><span>7</span></span>' : 'π';
  return `A = <span class="frac"><span>${theta}</span><span>360</span></span> × ${piPart} × ${r} × ${r}`;
}

/** Worked steps – the last one leaves the final multiplication to the learner. */
export function hintSteps(r, theta) {
  const [n, d] = reduceFraction(theta, 360);
  const fracTxt = d === 1 ? `${n}` : `${n}/${d}`;
  if (isPiFriendly(r)) {
    const whole = PI.value * r * r;
    return [
      { label: 'Fraction of the circle', text: `θ/360 = ${theta}/360 = ${fracTxt}` },
      { label: 'Square the radius', text: `r² = ${r} × ${r} = ${r * r}` },
      { label: 'Whole circle area', text: `πr² = 22/7 × ${r * r} = ${formatNumber(whole)}` },
      { label: 'Sector area', text: `A = ${fracTxt} × ${formatNumber(whole)} = ?` },
    ];
  }
  return [
    { label: 'Fraction of the circle', text: `θ/360 = ${theta}/360 = ${fracTxt}` },
    { label: 'Square the radius', text: `r² = ${r} × ${r} = ${r * r}` },
    { label: 'Whole circle area', text: `πr² = ${r * r}π  (≈ ${formatNumber(PI.value * r * r)} with 22/7)` },
    { label: 'Sector area', text: `A = ${fracTxt} × ${r * r}π = ?π   — type the answer as a multiple of π, e.g. 50π` },
  ];
}

/* ---------------------------------------------------------------------- */
/* Scoring                                                                 */
/* ---------------------------------------------------------------------- */
export const SCORE = { base: 500, timeMax: 300, noDamage: 300, perfectShot: 200, noHints: 100 };

export function computeScore({ timeUsed, timeBudget, shieldsLost, firstTryCorrect, usedHints, waves = 1 }) {
  const timeBonus = Math.round(SCORE.timeMax * Math.max(0, 1 - timeUsed / Math.max(1, timeBudget)));
  const rows = [
    { label: 'Arena cleared', value: SCORE.base },
    { label: 'Time bonus', value: timeBonus },
    { label: 'No damage', value: shieldsLost === 0 ? SCORE.noDamage : 0 },
    { label: 'Perfect shot', value: firstTryCorrect ? SCORE.perfectShot * waves : 0 },
    { label: 'No hints', value: usedHints ? 0 : SCORE.noHints },
  ];
  const total = rows.reduce((s, r) => s + r.value, 0);
  const stars = shieldsLost === 0 && firstTryCorrect ? 3 : shieldsLost <= 1 ? 2 : 1;
  return { rows, total, stars };
}

/* Self-check: every variant must have a clean answer and no breach may overlap a gate. */
export function validateLevels() {
  const problems = [];
  const inArc = (deg, c, half) => { const d = ((deg - c) % 360 + 540) % 360 - 180; return Math.abs(d) < half; };
  for (const L of LEVELS) {
    L.variants.forEach((v, vi) => {
      const R = resolveLevel(L, vi);
      const eh = gateHalfDeg(GATE.largeWidth, R.radius), ih = gateHalfDeg(GATE.smallWidth, R.radius);
      for (const w of R.waves) {
        const a = R.piFriendly ? sectorArea(R.radius, w.theta) : sectorCoef(R.radius, w.theta);
        if (Math.abs(a - Math.round(a)) > 1e-9) problems.push(`L${L.id} v${vi} r=${R.radius} θ=${w.theta}: ${R.piFriendly ? 'area' : 'π-coefficient'} ${a} not integer`);
        for (const [g, gh, name] of [[R.exitDeg, eh, 'exit'], [R.entranceDeg, ih, 'entrance']]) {
          if (inArc(g, w.breachDeg, w.theta / 2 + gh)) problems.push(`L${L.id} v${vi} θ=${w.theta}@${w.breachDeg} overlaps ${name} gate (${g}°)`);
        }
      }
    });
  }
  return problems;
}
