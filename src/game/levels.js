// ---------------------------------------------------------------------------
// Sector Escape – level data, answer evaluation & misconception diagnosis
// All values use π = 22/7 so every target area is a whole number.
// A = (θ / 360) × π × r²
// ---------------------------------------------------------------------------
import { reduceFraction, formatNumber } from '../engine/util.js';

export const PI = { num: 22, den: 7, value: 22 / 7, label: '22/7' };
/** Accept answers within ±0.5 m² or ±0.5 % (so π = 3.14 still passes). */
export const TOLERANCE = { abs: 0.5, rel: 0.005 };

export const sectorArea = (r, theta, pi = PI.value) => Math.round((theta / 360) * pi * r * r * 1e6) / 1e6;
export const arcLength = (r, theta, pi = PI.value) => (theta / 360) * 2 * pi * r;
export const circleArea = (r, pi = PI.value) => pi * r * r;

/** Number of bots that pour through a breach: ~1 per 2.2 m of arc, 4..24. */
export const botCountFor = (r, theta) => Math.max(4, Math.min(24, Math.round(arcLength(r, theta) / 2.2)));

const wave = (theta, breachDeg, timeBudget, extra = {}) => ({ theta, breachDeg, timeBudget, ...extra });

/**
 * scaffold:
 *   'full'    – formula AND substituted values visible from the start (stage 1)
 *   'formula' – formula visible, substitution via hint
 *   'hint'    – formula hidden; "Hint" button reveals it (free, forfeits the no-hint bonus)
 * Map node x/y are normalised positions traced from the LXD's sketch
 * (start bottom-left → destination bottom-right).
 */
export const LEVELS = [
  {
    id: 1, name: 'The Mossy Gate', tagline: 'Where the jungle first bites back',
    radius: 14, entranceDeg: 270, exitDeg: 90,
    waves: [wave(90, 30, 100)],
    scaffold: 'full',
    env: { floor: '#8d8f7a', wall: '#8f9a80', fog: '#20351f', torches: 8, moss: 0.9, sky: 'day' },
    mapNode: { x: 0.27, y: 0.63, color: '#f5c518' },
  },
  {
    id: 2, name: 'Fallen Idol', tagline: 'Half the wall is rotten stone',
    radius: 14, entranceDeg: 240, exitDeg: 120,
    waves: [wave(180, 0, 90)],
    scaffold: 'formula',
    env: { floor: '#8a8478', wall: '#9a8f7e', fog: '#2a2f1f', torches: 6, moss: 0.6, sky: 'day' },
    mapNode: { x: 0.34, y: 0.46, color: '#7ec8f5' },
  },
  {
    id: 3, name: 'Serpent Court', tagline: 'The guardians grow restless',
    radius: 21, entranceDeg: 270, exitDeg: 90,
    waves: [wave(60, 150, 80)],
    scaffold: 'hint',
    env: { floor: '#7f8d7c', wall: '#7d8f7f', fog: '#172e22', torches: 10, moss: 1.0, sky: 'dusk' },
    mapNode: { x: 0.42, y: 0.49, color: '#7ff59a' },
  },
  {
    id: 4, name: 'Crimson Ruins', tagline: 'A wide breach, little time',
    radius: 21, entranceDeg: 270, exitDeg: 90,
    waves: [wave(120, 20, 70)],
    scaffold: 'hint',
    env: { floor: '#8f7a72', wall: '#9a7f74', fog: '#2e1d1a', torches: 12, moss: 0.4, sky: 'dusk' },
    mapNode: { x: 0.47, y: 0.21, color: '#f54a3a' },
  },
  {
    id: 5, name: 'Twin Breach', tagline: 'Two waves. Two sectors. No mistakes.',
    radius: 28, entranceDeg: 270, exitDeg: 90,
    waves: [wave(45, 20, 65), wave(135, 190, 60)],
    scaffold: 'hint',
    env: { floor: '#86818f', wall: '#8b8299', fog: '#231c33', torches: 14, moss: 0.5, sky: 'night' },
    mapNode: { x: 0.65, y: 0.25, color: '#f58ae0' },
  },
  {
    id: 6, name: 'Thunder Well', tagline: 'The largest ring in the jungle',
    radius: 35, entranceDeg: 270, exitDeg: 90,
    waves: [wave(72, 0, 55)],
    scaffold: 'hint',
    env: { floor: '#777f8f', wall: '#7a8296', fog: '#141c2e', torches: 16, moss: 0.3, sky: 'night' },
    mapNode: { x: 0.67, y: 0.58, color: '#6a3fd6' },
  },
  {
    id: 7, name: "The Warden's Arena", tagline: 'Break every shield. Reach the temple.',
    radius: 28, entranceDeg: 270, exitDeg: 90,
    boss: { name: 'The Sector Warden', shields: 3, standDeg: 90 },
    waves: [wave(90, 0, 60), wave(135, 190, 55), wave(45, 45, 50)],
    scaffold: 'hint',
    env: { floor: '#8a7d6a', wall: '#9c8a6f', fog: '#2b1f12', torches: 18, moss: 0.2, sky: 'storm' },
    mapNode: { x: 0.83, y: 0.71, color: '#f5c9a8' },
  },
];

export const getLevel = (id) => LEVELS.find((l) => l.id === id) || null;
export const TOTAL_LEVELS = LEVELS.length;

/** Gate widths in metres → angular half-width in degrees on a wall of radius r. */
export const GATE = { smallWidth: 2.8, largeWidth: 4.4 };
export const gateHalfDeg = (widthM, r) => ((widthM / r) * 180) / Math.PI / 2;

/* ---------------------------------------------------------------------- */
/* Answer evaluation                                                       */
/* ---------------------------------------------------------------------- */

export function parseAnswer(raw) {
  if (typeof raw === 'number') return raw;
  const s = String(raw ?? '').trim().replace(/,/g, '');
  // allow simple fractions like 616/4
  const frac = s.match(/^(-?\d+(?:\.\d+)?)\s*\/\s*(-?\d+(?:\.\d+)?)$/);
  if (frac) { const d = parseFloat(frac[2]); return d === 0 ? NaN : parseFloat(frac[1]) / d; }
  const n = parseFloat(s.replace(/[^0-9.\-]/g, ''));
  return isFinite(n) ? n : NaN;
}

/**
 * Evaluate a learner's answer for a sector of radius r and angle theta.
 * Returns status 'correct' | 'under' | 'over' | 'invalid', the geometry the
 * cannon will fire (firedTheta), and a misconception diagnosis when wrong.
 */
export function evaluateAnswer(raw, r, theta) {
  const exact = sectorArea(r, theta);
  const entered = parseAnswer(raw);
  if (!isFinite(entered) || entered <= 0) {
    return { status: 'invalid', exact, entered: NaN, ratio: 0, firedTheta: 0, excessTheta: 0, coverage: 0, diagnosis: null };
  }
  const tol = Math.max(TOLERANCE.abs, exact * TOLERANCE.rel);
  const ratio = entered / exact;
  const firedTheta = Math.min(360, theta * ratio);
  let status = 'correct';
  if (Math.abs(entered - exact) > tol) status = entered < exact ? 'under' : 'over';
  return {
    status, exact, entered, ratio, firedTheta,
    excessTheta: Math.max(0, firedTheta - theta),
    coverage: Math.min(1, ratio),
    diagnosis: status === 'correct' ? null : diagnose(entered, r, theta, exact),
  };
}

/** Identify the most likely misconception behind a wrong answer. */
export function diagnose(entered, r, theta, exact = sectorArea(r, theta)) {
  const pi = PI.value;
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
    [r, 'radius', 'That is just the radius.', 'Use the full formula: (θ/360) × πr².'],
    [exact * 10, 'decimal', 'Ten times too large.', 'Check your place value / decimal point.'],
    [exact / 10, 'decimal', 'Ten times too small.', 'Check your place value / decimal point.'],
    [(360 / theta) * pi * r * r, 'fraction-flipped', 'The fraction is upside down.', 'Use θ/360, not 360/θ.'],
    [exact * 2, 'double', 'Exactly double the required area.', 'Did you use 2πr² or a 2 somewhere it does not belong?'],
    [exact / 2, 'half', 'Exactly half the required area.', 'Check the fraction θ/360 — reduce it carefully.'],
    [(theta / 360) * 3 * r * r, 'pi-as-3', 'π was taken as 3.', 'Use π = 22/7 (≈ 3.14).'],
  ];
  for (const [target, code, title, tip] of checks) {
    if (near(entered, target) && !near(target, exact, 0.005)) return { code, title, tip, under };
  }
  const pct = Math.round(Math.abs(entered / exact - 1) * 100);
  return under
    ? { code: 'under', title: `About ${pct}% too small.`, tip: 'Re-check each step: θ/360, then r², then × 22/7.', under: true }
    : { code: 'over', title: `About ${pct}% too large.`, tip: 'Re-check each step: θ/360, then r², then × 22/7.', under: false };
}

/* ---------------------------------------------------------------------- */
/* Scaffolding text                                                        */
/* ---------------------------------------------------------------------- */

export const FORMULA_HTML = 'A = <span class="frac"><span>θ</span><span>360</span></span> × π r<sup>2</sup>';

export function substituted(r, theta) {
  return `A = <span class="frac"><span>${theta}</span><span>360</span></span> × <span class="frac"><span>22</span><span>7</span></span> × ${r} × ${r}`;
}

/** Worked steps – the last one leaves the final multiplication to the learner. */
export function hintSteps(r, theta) {
  const [n, d] = reduceFraction(theta, 360);
  const whole = PI.value * r * r;
  const fracTxt = d === 1 ? `${n}` : `${n}/${d}`;
  return [
    { label: 'Fraction of the circle', text: `θ/360 = ${theta}/360 = ${fracTxt}` },
    { label: 'Square the radius', text: `r² = ${r} × ${r} = ${r * r}` },
    { label: 'Whole circle area', text: `πr² = 22/7 × ${r * r} = ${formatNumber(whole)}` },
    { label: 'Sector area', text: `A = ${fracTxt} × ${formatNumber(whole)} = ?` },
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

/* Self-check: every wave must have a whole-number answer and not overlap a gate. */
export function validateLevels() {
  const problems = [];
  for (const L of LEVELS) {
    const eh = gateHalfDeg(GATE.largeWidth, L.radius), ih = gateHalfDeg(GATE.smallWidth, L.radius);
    for (const w of L.waves) {
      const a = sectorArea(L.radius, w.theta);
      if (Math.abs(a - Math.round(a)) > 1e-9) problems.push(`L${L.id} θ=${w.theta}: area ${a} not integer`);
      const inArc = (deg, c, half) => { let d = ((deg - c) % 360 + 540) % 360 - 180; return Math.abs(d) < half; };
      for (const [g, gh, name] of [[L.exitDeg, eh, 'exit'], [L.entranceDeg, ih, 'entrance']]) {
        if (inArc(g, w.breachDeg, w.theta / 2 + gh)) problems.push(`L${L.id} θ=${w.theta}@${w.breachDeg} overlaps ${name} gate`);
      }
    }
  }
  return problems;
}
