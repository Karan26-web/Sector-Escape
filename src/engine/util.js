// ---------------------------------------------------------------------------
// Sector Escape – shared math / timing helpers
// ---------------------------------------------------------------------------
export const TAU = Math.PI * 2;
export const DEG = Math.PI / 180;

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const invLerp = (a, b, v) => (b === a ? 0 : (v - a) / (b - a));
export const remap = (v, a, b, c, d) => lerp(c, d, clamp(invLerp(a, b, v), 0, 1));
export const smoothstep = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };

/** Wrap an angle (radians) to [-PI, PI). */
export function normAngle(a) {
  a = a % TAU;
  if (a < -Math.PI) a += TAU;
  if (a >= Math.PI) a -= TAU;
  return a;
}
/** Shortest signed delta from `from` to `to` (radians). */
export const angleDiff = (from, to) => normAngle(to - from);
/** Wrap degrees to [0, 360). */
export const wrapDeg = (d) => ((d % 360) + 360) % 360;
/** Signed shortest delta in degrees, result in [-180, 180). */
export function degDiff(from, to) {
  let d = (to - from) % 360;
  if (d < -180) d += 360;
  if (d >= 180) d -= 360;
  return d;
}

/** Frame-rate independent exponential smoothing. */
export const damp = (cur, target, lambda, dt) => lerp(cur, target, 1 - Math.exp(-lambda * dt));
export const dampAngle = (cur, target, lambda, dt) => cur + angleDiff(cur, target) * (1 - Math.exp(-lambda * dt));

export const Ease = {
  linear: (t) => t,
  inQuad: (t) => t * t,
  outQuad: (t) => 1 - (1 - t) * (1 - t),
  inOutQuad: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  inCubic: (t) => t * t * t,
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  inOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  outExpo: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  inExpo: (t) => (t <= 0 ? 0 : Math.pow(2, 10 * t - 10)),
  outBack: (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  inBack: (t) => { const c1 = 1.70158, c3 = c1 + 1; return c3 * t * t * t - c1 * t * t; },
  outElastic: (t) => {
    if (t <= 0) return 0; if (t >= 1) return 1;
    const c4 = TAU / 3; return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  },
  outBounce: (t) => {
    const n1 = 7.5625, d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  },
};

/** Deterministic PRNG (seeded) so levels look identical each run. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const rand = (a = 0, b = 1) => a + Math.random() * (b - a);
export const randInt = (a, b) => Math.floor(rand(a, b + 1));
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

/** Wall-clock wait (use tweens.delay for game-time waits). */
export const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** Position on the arena circle. 0° = +X (east), 90° = -Z (north / "up" on the map). */
export function polar(deg, radius, y = 0) {
  const a = deg * DEG;
  return { x: Math.cos(a) * radius, y, z: -Math.sin(a) * radius };
}
/** Inverse of polar(): degrees in [0,360) for a world x/z. */
export function toDeg(x, z) { return wrapDeg(Math.atan2(-z, x) / DEG); }

export function formatNumber(n, maxDecimals = 2) {
  if (!isFinite(n)) return '—';
  const r = Math.round(n * Math.pow(10, maxDecimals)) / Math.pow(10, maxDecimals);
  return String(r);
}
export function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { [a, b] = [b, a % b]; } return a || 1; }
export function reduceFraction(n, d) { const g = gcd(n, d); return [n / g, d / g]; }
export const pad2 = (n) => String(n).padStart(2, '0');
export function formatTime(sec) { sec = Math.max(0, Math.ceil(sec)); return `${Math.floor(sec / 60)}:${pad2(sec % 60)}`; }
