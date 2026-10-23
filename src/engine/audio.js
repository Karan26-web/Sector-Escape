// ---------------------------------------------------------------------------
// Sector Escape – procedural audio (Web Audio API)
// Every sound is synthesised: there are no audio files to download.
// ---------------------------------------------------------------------------

const SFX = {};
const PENTA = [146.83, 174.61, 196.0, 220.0, 261.63, 293.66, 349.23, 392.0, 440.0, 523.25]; // D minor pentatonic
const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12);

function safeStorage(key, fallback) {
  try { const v = localStorage.getItem(key); return v === null ? fallback : v; } catch { return fallback; }
}

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.muted = safeStorage('se_muted', '0') === '1';
    this.volumes = { master: 0.9, sfx: 0.85, music: 0.26, ambient: 0.4 };
    this.music = new MusicPlayer(this);
    this.ambient = new AmbientPlayer(this);
    this.lastPlayed = new Map();
  }

  /* ----------------------------------------------------------- lifecycle */
  ensure() {
    if (this.ctx) return this.ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    const ctx = (this.ctx = new AC());
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : this.volumes.master;
    this.limiter = ctx.createDynamicsCompressor();
    this.limiter.threshold.value = -8; this.limiter.knee.value = 12; this.limiter.ratio.value = 6;
    this.limiter.attack.value = 0.003; this.limiter.release.value = 0.2;
    this.master.connect(this.limiter); this.limiter.connect(ctx.destination);
    this.sfxBus = ctx.createGain(); this.sfxBus.gain.value = this.volumes.sfx; this.sfxBus.connect(this.master);
    this.musicBus = ctx.createGain(); this.musicBus.gain.value = this.volumes.music; this.musicBus.connect(this.master);
    this.ambBus = ctx.createGain(); this.ambBus.gain.value = this.volumes.ambient; this.ambBus.connect(this.master);
    // 2 s white-noise buffer reused by every noisy sound
    const len = ctx.sampleRate * 2, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noiseBuffer = buf;
    // distortion curve
    const curve = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) { const x = (i / 1023) * 2 - 1; curve[i] = Math.tanh(x * 3); }
    this.distCurve = curve;
    if (this.music.pendingMode) this.music.start(this.music.pendingMode);
    if (this.ambient.pendingMode) this.ambient.start(this.ambient.pendingMode);
    document.addEventListener('visibilitychange', () => { if (!document.hidden && ctx.state === 'suspended') ctx.resume().catch(() => {}); });
    return ctx;
  }
  unlock() {
    const ctx = this.ensure();
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
  }
  get now() { return this.ctx ? this.ctx.currentTime : 0; }
  setMuted(m) {
    this.muted = m;
    try { localStorage.setItem('se_muted', m ? '1' : '0'); } catch {}
    if (this.master) this.master.gain.setTargetAtTime(m ? 0 : this.volumes.master, this.now, 0.05);
  }
  toggleMute() { this.setMuted(!this.muted); return this.muted; }

  /* ----------------------------------------------------------- playback */
  play(name, o = {}) {
    if (!this.ctx) return null;
    // throttle identical rapid-fire sounds (footsteps etc.)
    const minGap = o.minGap ?? 0.03, last = this.lastPlayed.get(name) ?? -1;
    if (this.now - last < minGap) return null;
    this.lastPlayed.set(name, this.now);
    const fn = SFX[name];
    if (!fn) { console.warn('[audio] unknown sfx:', name); return null; }
    try { return fn(this, o) ?? null; } catch (e) { console.warn('[audio]', name, e); return null; }
  }

  /* ----------------------------------------------------------- node helpers */
  gain(v = 1, dest) { const g = this.ctx.createGain(); g.gain.value = v; g.connect(dest || this.sfxBus); return g; }
  osc(type, freq, dest) { const o = this.ctx.createOscillator(); o.type = type; o.frequency.value = freq; if (dest) o.connect(dest); return o; }
  filter(type, freq, Q = 1, dest) { const f = this.ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = Q; if (dest) f.connect(dest); return f; }
  noiseSrc(dest) { const s = this.ctx.createBufferSource(); s.buffer = this.noiseBuffer; s.loop = true; s.loopStart = Math.random() * 1.5; if (dest) s.connect(dest); return s; }
  dist(dest) { const w = this.ctx.createWaveShaper(); w.curve = this.distCurve; w.oversample = '2x'; if (dest) w.connect(dest); return w; }
  panner(pan = 0, dest) { if (!this.ctx.createStereoPanner) return dest; const p = this.ctx.createStereoPanner(); p.pan.value = pan; p.connect(dest); return p; }
  /** ADSR-ish envelope on an AudioParam. Returns the time the envelope ends. */
  env(param, t0, { a = 0.005, d = 0.1, s = 0, r = 0.1, peak = 1, hold = 0 } = {}) {
    param.cancelScheduledValues(t0);
    param.setValueAtTime(0.0001, t0);
    param.linearRampToValueAtTime(peak, t0 + a);
    const sus = Math.max(0.0001, peak * s);
    param.exponentialRampToValueAtTime(sus, t0 + a + d);
    param.setValueAtTime(sus, t0 + a + d + hold);
    param.exponentialRampToValueAtTime(0.0001, t0 + a + d + hold + r);
    return t0 + a + d + hold + r;
  }
  /** Tone with optional pitch sweep. */
  tone({ type = 'sine', f0 = 440, f1 = null, t0 = this.now, dur = 0.2, vol = 0.2, env = {}, dest = null, sweep = 'exp', detune = 0 }) {
    const g = this.gain(0.0001, dest); const o = this.osc(type, f0, g); o.detune.value = detune;
    if (f1 != null) {
      o.frequency.setValueAtTime(f0, t0);
      if (sweep === 'exp') o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t0 + dur); else o.frequency.linearRampToValueAtTime(f1, t0 + dur);
    }
    const end = this.env(g.gain, t0, { a: 0.005, d: dur * 0.5, s: 0.4, r: dur * 0.5, ...env, peak: vol });
    o.start(t0); o.stop(end + 0.05);
    return { osc: o, gain: g, end };
  }
  /** Filtered noise burst with optional cutoff sweep. */
  burst({ t0 = this.now, dur = 0.2, vol = 0.3, type = 'lowpass', f0 = 2000, f1 = null, Q = 1, env = {}, dest = null, pan = 0 }) {
    const out = pan ? this.panner(pan, dest || this.sfxBus) : (dest || this.sfxBus);
    const g = this.gain(0.0001, out); const f = this.filter(type, f0, Q, g); const n = this.noiseSrc(f);
    if (f1 != null) { f.frequency.setValueAtTime(f0, t0); f.frequency.exponentialRampToValueAtTime(Math.max(10, f1), t0 + dur); }
    const end = this.env(g.gain, t0, { a: 0.003, d: dur * 0.6, s: 0.3, r: dur * 0.4, ...env, peak: vol });
    n.start(t0); n.stop(end + 0.05);
    return { src: n, gain: g, filter: f, end };
  }
  /** Simple note sequence for stingers: [[midi, startOffset, dur, vol], ...]. */
  seq(notes, { type = 'triangle', t0 = this.now, vol = 0.2, env = {} } = {}) {
    for (const [midi, off, dur, v] of notes) this.tone({ type, f0: NOTE(midi), t0: t0 + off, dur, vol: (v ?? 1) * vol, env: { a: 0.01, d: dur * 0.3, s: 0.5, r: dur * 0.7, ...env } });
  }
}

/* ======================================================================= */
/* SFX library                                                             */
/* ======================================================================= */
const rnd = (a, b) => a + Math.random() * (b - a);

// --- UI ------------------------------------------------------------------
SFX['ui.hover'] = (A) => A.tone({ f0: 1200, f1: 1500, dur: 0.05, vol: 0.025, env: { a: 0.003, d: 0.02, s: 0.2, r: 0.03 } });
SFX['ui.click'] = (A) => { A.tone({ type: 'square', f0: 700, f1: 380, dur: 0.07, vol: 0.08, env: { a: 0.002, d: 0.03, s: 0.2, r: 0.04 } }); A.burst({ dur: 0.03, vol: 0.12, type: 'highpass', f0: 2500 }); };
SFX['ui.confirm'] = (A) => A.seq([[72, 0, 0.09, 1], [79, 0.08, 0.16, 1]], { vol: 0.14 });
SFX['ui.error'] = (A) => { const t = A.now; A.tone({ type: 'square', f0: 190, dur: 0.14, vol: 0.12, t0: t }); A.tone({ type: 'square', f0: 150, dur: 0.22, vol: 0.12, t0: t + 0.14 }); };
SFX['ui.type'] = (A) => A.burst({ dur: 0.025, vol: 0.14, type: 'bandpass', f0: rnd(1800, 2600), Q: 2, env: { a: 0.001, d: 0.015, s: 0.1, r: 0.01 } });
SFX['ui.panel'] = (A) => A.burst({ dur: 0.28, vol: 0.14, type: 'bandpass', f0: 400, f1: 2400, Q: 1.5, env: { a: 0.05, d: 0.12, s: 0.4, r: 0.1 } });
SFX['ui.stamp'] = (A) => { const t = A.now; A.tone({ f0: 140, f1: 45, dur: 0.18, vol: 0.5, t0: t, env: { a: 0.002, d: 0.08, s: 0.3, r: 0.1 } }); A.burst({ t0: t, dur: 0.1, vol: 0.35, f0: 3000, f1: 200 }); };
SFX['ui.star'] = (A) => A.seq([[91, 0, 0.12, 1], [96, 0.07, 0.25, 1]], { type: 'sine', vol: 0.12 });
SFX['ui.count'] = (A) => A.tone({ f0: 900, dur: 0.03, vol: 0.06, env: { a: 0.002, d: 0.01, s: 0.3, r: 0.02 } });
SFX['ui.whoosh'] = (A) => A.burst({ dur: 0.4, vol: 0.18, type: 'bandpass', f0: 300, f1: 3000, Q: 1, env: { a: 0.08, d: 0.15, s: 0.3, r: 0.15 } });

// --- World ---------------------------------------------------------------
SFX['step.grass'] = (A, o) => A.burst({ dur: 0.08, vol: 0.08, type: 'bandpass', f0: rnd(600, 1000), Q: 1.2, pan: o.pan ?? 0, env: { a: 0.004, d: 0.04, s: 0.2, r: 0.04 } });
SFX['step.stone'] = (A, o) => { const t = A.now; A.burst({ t0: t, dur: 0.09, vol: 0.08, f0: 1800, f1: 300, pan: o.pan ?? 0, env: { a: 0.003, d: 0.05, s: 0.2, r: 0.04 } }); A.tone({ t0: t, f0: 150, f1: 70, dur: 0.07, vol: 0.08 }); };
SFX['bot.step'] = (A, o) => { const t = A.now; const v = o.vol ?? 1; A.tone({ type: 'square', f0: rnd(150, 180), f1: 90, dur: 0.07, vol: 0.07 * v, t0: t, env: { a: 0.002, d: 0.04, s: 0.1, r: 0.03 } }); A.burst({ t0: t, dur: 0.05, vol: 0.14 * v, type: 'highpass', f0: 3000, pan: o.pan ?? 0 }); A.tone({ t0: t, f0: 70, f1: 40, dur: 0.12, vol: 0.14 * v, env: { a: 0.002, d: 0.06, s: 0.2, r: 0.06 } }); };
SFX['gate.open'] = (A) => {
  const t = A.now;
  A.burst({ t0: t, dur: 1.6, vol: 0.4, f0: 140, Q: 0.7, env: { a: 0.2, d: 0.9, s: 0.6, r: 0.5 } });
  const grind = A.burst({ t0: t, dur: 1.5, vol: 0.1, type: 'bandpass', f0: 600, f1: 900, Q: 1.5, env: { a: 0.1, d: 0.8, s: 0.6, r: 0.5 } });
  const lfo = A.osc('sine', 9); const lg = A.gain(0.06, grind.gain.gain); lfo.connect(lg); lfo.start(t); lfo.stop(t + 1.6);
  A.tone({ t0: t + 1.45, f0: 90, f1: 40, dur: 0.25, vol: 0.4, env: { a: 0.003, d: 0.1, s: 0.3, r: 0.15 } });
  A.burst({ t0: t + 1.45, dur: 0.15, vol: 0.3, f0: 2500, f1: 150 });
};
SFX['gate.unlock'] = (A) => { A.seq([[76, 0, 0.3, 1], [80, 0.12, 0.3, 1], [83, 0.24, 0.5, 1], [88, 0.36, 0.9, 1]], { type: 'sine', vol: 0.16 }); A.burst({ t0: A.now + 0.3, dur: 0.8, vol: 0.08, type: 'highpass', f0: 5000, env: { a: 0.2, d: 0.3, s: 0.5, r: 0.3 } }); };
SFX['alarm'] = (A) => { const t = A.now; for (let i = 0; i < 4; i++) { A.tone({ type: 'triangle', f0: i % 2 ? 587 : 784, dur: 0.17, vol: 0.11, t0: t + i * 0.19, env: { a: 0.01, d: 0.05, s: 0.7, r: 0.05 } }); } };
SFX['scan.sweep'] = (A) => { const t = A.now; const r = A.tone({ f0: 380, f1: 1700, dur: 1.1, vol: 0.09, t0: t, env: { a: 0.05, d: 0.4, s: 0.7, r: 0.5 } }); const lfo = A.osc('sine', 14); const lg = A.gain(0.05, r.gain.gain); lfo.connect(lg); lfo.start(t); lfo.stop(t + 1.3); };
SFX['scan.ping'] = (A) => { const t = A.now; A.tone({ f0: 1400, dur: 0.25, vol: 0.12, t0: t, env: { a: 0.003, d: 0.1, s: 0.2, r: 0.15 } }); A.tone({ f0: 1400, dur: 0.2, vol: 0.05, t0: t + 0.17, env: { a: 0.003, d: 0.08, s: 0.2, r: 0.12 } }); };
SFX['label.pop'] = (A) => { A.tone({ f0: 800, f1: 1300, dur: 0.05, vol: 0.09, env: { a: 0.003, d: 0.02, s: 0.3, r: 0.03 } }); A.burst({ dur: 0.02, vol: 0.1, type: 'highpass', f0: 3000 }); };
SFX['torch'] = (A) => A.burst({ dur: 0.06, vol: 0.025, type: 'bandpass', f0: rnd(1200, 2600), Q: 3 });

SFX['gate.slam'] = (A) => {
  const t = A.now;
  A.burst({ t0: t, dur: 0.5, vol: 0.16, type: 'bandpass', f0: 900, f1: 500, Q: 1.5, env: { a: 0.03, d: 0.3, s: 0.5, r: 0.15 } });
  A.tone({ t0: t + 0.45, f0: 80, f1: 30, dur: 0.5, vol: 0.7, env: { a: 0.003, d: 0.18, s: 0.3, r: 0.3 } });
  A.burst({ t0: t + 0.45, dur: 0.35, vol: 0.55, f0: 1400, f1: 70, env: { a: 0.002, d: 0.15, s: 0.3, r: 0.2 } });
  A.burst({ t0: t + 0.55, dur: 0.9, vol: 0.12, f0: 300, Q: 0.7, env: { a: 0.05, d: 0.5, s: 0.4, r: 0.4 } });
};
SFX['seal.slam'] = (A) => {
  const t = A.now;
  A.burst({ t0: t, dur: 0.9, vol: 0.35, f0: 160, Q: 0.7, env: { a: 0.1, d: 0.5, s: 0.6, r: 0.3 } });
  A.tone({ t0: t, type: 'sawtooth', f0: 50, f1: 70, dur: 0.8, vol: 0.1, env: { a: 0.1, d: 0.4, s: 0.6, r: 0.3 } });
  A.tone({ t0: t + 0.75, f0: 70, f1: 28, dur: 0.6, vol: 0.8, env: { a: 0.003, d: 0.2, s: 0.3, r: 0.4 } });
  A.burst({ t0: t + 0.75, dur: 0.4, vol: 0.6, f0: 2000, f1: 60, env: { a: 0.002, d: 0.18, s: 0.3, r: 0.22 } });
  for (let i = 0; i < 6; i++) A.burst({ t0: t + 0.85 + Math.random() * 0.5, dur: 0.06, vol: 0.12, f0: rnd(900, 2200), f1: 200, pan: rnd(-0.5, 0.5) });
};
SFX['bots.notice'] = (A) => {
  const t = A.now;
  for (let i = 0; i < 3; i++) A.tone({ t0: t + i * 0.09, type: 'square', f0: 520 + i * 120, dur: 0.08, vol: 0.06, env: { a: 0.003, d: 0.03, s: 0.4, r: 0.04 } });
  A.tone({ t0: t + 0.3, type: 'sawtooth', f0: 90, f1: 160, dur: 0.6, vol: 0.1, env: { a: 0.05, d: 0.3, s: 0.5, r: 0.25 } });
  A.burst({ t0: t + 0.3, dur: 0.5, vol: 0.1, type: 'bandpass', f0: 300, f1: 1500, Q: 1, env: { a: 0.05, d: 0.25, s: 0.4, r: 0.2 } });
};


// --- The barrier across the gap (LXD 2026-10-23) ------------------------
SFX['barrier.form'] = (A) => {   // it shimmers up out of the floor
  const t = A.now;
  A.burst({ t0: t, dur: 0.6, vol: 0.12, type: 'bandpass', f0: 500, f1: 5200, Q: 3, env: { a: 0.08, d: 0.3, s: 0.4, r: 0.2 } });
  A.seq([[76, 0.05, 0.5, 0.8], [83, 0.14, 0.6, 0.7], [88, 0.24, 0.7, 0.6]], { type: 'sine', vol: 0.05 });
};
SFX['barrier.hit'] = (A, o) => {   // a guardian's fist on the barrier: a dull thud and a short glassy ring
  const t = A.now, v = o.vol ?? 1, pan = o.pan ?? 0;
  A.tone({ t0: t, f0: 120, f1: 55, dur: 0.16, vol: 0.32 * v, pan, env: { a: 0.002, d: 0.07, s: 0.3, r: 0.08 } });
  A.burst({ t0: t, dur: 0.07, vol: 0.18 * v, type: 'lowpass', f0: 900, pan, env: { a: 0.002, d: 0.04, s: 0.2, r: 0.03 } });
  A.tone({ t0: t + 0.01, type: 'sine', f0: rnd(1250, 1500), dur: 0.35, vol: 0.05 * v, pan, env: { a: 0.002, d: 0.12, s: 0.2, r: 0.2 } });
};
SFX['barrier.shatter'] = (A) => {   // the charge breaks it: a crack, then glass raining down
  const t = A.now;
  A.burst({ t0: t, dur: 0.12, vol: 0.45, type: 'highpass', f0: 2500, env: { a: 0.001, d: 0.05, s: 0.3, r: 0.06 } });
  A.tone({ t0: t, f0: 90, f1: 35, dur: 0.5, vol: 0.4, env: { a: 0.003, d: 0.2, s: 0.3, r: 0.25 } });
  for (let i = 0; i < 18; i++) A.burst({ t0: t + 0.03 + Math.random() * 0.75, dur: 0.05 + Math.random() * 0.06, vol: rnd(0.05, 0.14), type: 'bandpass', f0: rnd(2600, 7000), Q: 6, pan: rnd(-0.7, 0.7), env: { a: 0.001, d: 0.03, s: 0.2, r: 0.03 } });
  A.seq([[95, 0.02, 0.4, 0.6], [100, 0.1, 0.5, 0.5]], { type: 'sine', vol: 0.04 });
};
SFX['hero.fall'] = (A) => {   // Karan hits the floor after the reflected charge
  const t = A.now;
  A.tone({ t0: t, f0: 95, f1: 38, dur: 0.28, vol: 0.5, env: { a: 0.002, d: 0.1, s: 0.3, r: 0.15 } });
  A.burst({ t0: t, dur: 0.22, vol: 0.25, type: 'lowpass', f0: 700, f1: 200, env: { a: 0.002, d: 0.09, s: 0.3, r: 0.1 } });
};

// --- Combat -------------------------------------------------------------
SFX['charge.build'] = (A) => {
  const t = A.now, D = 1.35;
  const g = A.gain(0.0001); const f = A.filter('lowpass', 250, 2, g); const o = A.osc('sawtooth', 100, f);
  o.frequency.exponentialRampToValueAtTime(380, t + D); f.frequency.exponentialRampToValueAtTime(3200, t + D);
  A.env(g.gain, t, { a: 0.1, d: D * 0.6, s: 1, hold: D * 0.35, r: 0.12, peak: 0.15 });
  o.start(t); o.stop(t + D + 0.2);
  A.burst({ t0: t, dur: D, vol: 0.08, type: 'bandpass', f0: 500, f1: 4000, Q: 1, env: { a: 0.3, d: D * 0.5, s: 1, r: 0.1 } });
  const sg = A.gain(0.0001); const sub = A.osc('sine', 55, sg); const am = A.osc('sine', 7); const amg = A.gain(0.3, sg.gain); am.connect(amg);
  am.frequency.exponentialRampToValueAtTime(26, t + D); A.env(sg.gain, t, { a: 0.1, d: D * 0.5, s: 1, hold: D * 0.4, r: 0.1, peak: 0.3 });
  sub.start(t); am.start(t); sub.stop(t + D + 0.3); am.stop(t + D + 0.3);
};
SFX['charge.fire'] = (A) => {
  const t = A.now;
  A.burst({ t0: t, dur: 0.7, vol: 0.55, f0: 9000, f1: 180, Q: 0.7, env: { a: 0.004, d: 0.35, s: 0.3, r: 0.35 } });
  A.tone({ t0: t, f0: 900, f1: 110, dur: 0.4, vol: 0.4, env: { a: 0.003, d: 0.15, s: 0.3, r: 0.25 } });
  const g = A.gain(0.0001); const d = A.dist(g); const f = A.filter('lowpass', 1800, 2, d); const o = A.osc('sawtooth', 220, f);
  o.frequency.exponentialRampToValueAtTime(140, t + 0.45); A.env(g.gain, t, { a: 0.004, d: 0.2, s: 0.3, r: 0.3, peak: 0.25 }); o.start(t); o.stop(t + 0.7);
  A.tone({ t0: t, f0: 60, f1: 30, dur: 0.5, vol: 0.5, env: { a: 0.003, d: 0.2, s: 0.3, r: 0.3 } });
};
SFX['laser.loop'] = (A) => {
  const t = A.now; const g = A.gain(0.0001); const f = A.filter('lowpass', 1400, 3, g);
  const o1 = A.osc('sawtooth', 110, f), o2 = A.osc('sawtooth', 110.8, f), o3 = A.osc('sine', 55, f);
  const lfo = A.osc('sine', 5.5); const lg = A.gain(400, f.frequency); lfo.connect(lg);
  const hiss = A.burst({ t0: t, dur: 30, vol: 0.06, type: 'bandpass', f0: 3200, Q: 2, env: { a: 0.1, d: 0.1, s: 1, hold: 29, r: 0.5 } });
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.09, t + 0.12);
  [o1, o2, o3, lfo].forEach((o) => o.start(t));
  return { stop: (fade = 0.35) => { const n = A.now; g.gain.cancelScheduledValues(n); g.gain.setValueAtTime(g.gain.value, n); g.gain.exponentialRampToValueAtTime(0.0001, n + fade); hiss.gain.gain.cancelScheduledValues(n); hiss.gain.gain.setValueAtTime(hiss.gain.gain.value || 0.0001, n); hiss.gain.gain.exponentialRampToValueAtTime(0.0001, n + fade); [o1, o2, o3, lfo].forEach((o) => o.stop(n + fade + 0.05)); hiss.src.stop(n + fade + 0.05); } };
};
SFX['bot.explode'] = (A, o) => {
  const t = A.now + (o.delay ?? 0), v = o.vol ?? 1, pan = o.pan ?? 0;
  A.burst({ t0: t, dur: 0.45, vol: 0.4 * v, f0: 4500, f1: 250, Q: 0.8, pan, env: { a: 0.003, d: 0.2, s: 0.3, r: 0.25 } });
  A.tone({ t0: t, f0: rnd(180, 240), f1: 40, dur: 0.3, vol: 0.3 * v, env: { a: 0.003, d: 0.12, s: 0.3, r: 0.18 } });
  A.tone({ t0: t + 0.02, type: 'square', f0: rnd(1500, 2300), f1: 900, dur: 0.22, vol: 0.06 * v, env: { a: 0.002, d: 0.1, s: 0.2, r: 0.12 } });
};
SFX['bot.lunge'] = (A, o) => { const t = A.now; A.burst({ t0: t, dur: 0.35, vol: 0.2, type: 'bandpass', f0: 300, f1: 2600, Q: 1.2, pan: o.pan ?? 0, env: { a: 0.06, d: 0.15, s: 0.4, r: 0.14 } }); A.tone({ t0: t, type: 'sawtooth', f0: 180, f1: 620, dur: 0.3, vol: 0.06 }); };
SFX['bot.hit'] = (A) => { const t = A.now; A.tone({ t0: t, f0: 95, f1: 38, dur: 0.22, vol: 0.45, env: { a: 0.002, d: 0.08, s: 0.3, r: 0.14 } }); A.burst({ t0: t, dur: 0.16, vol: 0.3, f0: 700, f1: 120 }); A.tone({ t0: t, type: 'square', f0: 220, f1: 110, dur: 0.12, vol: 0.08 }); };
SFX['reflect.zap'] = (A, o) => {
  const t = A.now + (o.delay ?? 0);
  const g = A.gain(0.0001); const o1 = A.osc('sine', 600, g); const o2 = A.osc('square', 300, g);
  o1.frequency.setValueAtTime(600, t); o1.frequency.exponentialRampToValueAtTime(2600, t + 0.18); o1.frequency.exponentialRampToValueAtTime(220, t + 0.55);
  o2.frequency.setValueAtTime(300, t); o2.frequency.exponentialRampToValueAtTime(1300, t + 0.18); o2.frequency.exponentialRampToValueAtTime(110, t + 0.55);
  A.env(g.gain, t, { a: 0.01, d: 0.3, s: 0.5, r: 0.25, peak: 0.16 }); o1.start(t); o2.start(t); o1.stop(t + 0.7); o2.stop(t + 0.7);
  A.burst({ t0: t, dur: 0.5, vol: 0.15, type: 'highpass', f0: 2500, env: { a: 0.02, d: 0.25, s: 0.4, r: 0.2 } });
};
SFX['reflect.hit'] = (A) => {
  const t = A.now; SFX['bot.hit'](A);
  const g = A.gain(0.0001); const d = A.dist(g); const o = A.osc('square', 110, d); const am = A.osc('square', 30); const amg = A.gain(0.5, g.gain); am.connect(amg);
  A.env(g.gain, t, { a: 0.005, d: 0.2, s: 0.5, r: 0.25, peak: 0.18 }); o.start(t); am.start(t); o.stop(t + 0.5); am.stop(t + 0.5);
};
SFX['player.hurt'] = (A) => { const t = A.now; A.tone({ t0: t, f0: 70, f1: 30, dur: 0.35, vol: 0.5, env: { a: 0.002, d: 0.12, s: 0.3, r: 0.22 } }); A.burst({ t0: t, dur: 0.25, vol: 0.3, f0: 1200, f1: 150 }); A.tone({ t0: t + 0.02, type: 'sawtooth', f0: 320, f1: 80, dur: 0.32, vol: 0.1 }); };
SFX['shield.break'] = (A) => {
  const t = A.now;
  A.burst({ t0: t, dur: 0.35, vol: 0.3, type: 'highpass', f0: 3800, env: { a: 0.002, d: 0.15, s: 0.3, r: 0.2 } });
  [2800, 3700, 5200, 4300].forEach((f, i) => A.tone({ t0: t + i * 0.015, f0: f, f1: f * 0.9, dur: 0.3, vol: 0.06, env: { a: 0.002, d: 0.12, s: 0.2, r: 0.18 } }));
  A.tone({ t0: t, f0: 120, f1: 50, dur: 0.2, vol: 0.3 });
};
SFX['pulse'] = (A) => { const t = A.now; A.tone({ t0: t, f0: 50, f1: 20, dur: 0.6, vol: 0.5, env: { a: 0.003, d: 0.25, s: 0.4, r: 0.35 } }); A.burst({ t0: t, dur: 0.55, vol: 0.35, f0: 2200, f1: 100, env: { a: 0.003, d: 0.25, s: 0.3, r: 0.3 } }); A.tone({ t0: t, f0: 200, f1: 950, dur: 0.3, vol: 0.12, env: { a: 0.01, d: 0.12, s: 0.5, r: 0.17 } }); };
SFX['boss.roar'] = (A) => {
  const t = A.now; const g = A.gain(0.0001); const d = A.dist(g); const f = A.filter('lowpass', 500, 2, d);
  const o1 = A.osc('sawtooth', 68, f), o2 = A.osc('sawtooth', 72, f); const vib = A.osc('sine', 6); const vg = A.gain(5, o1.frequency); vib.connect(vg);
  A.env(g.gain, t, { a: 0.15, d: 0.6, s: 0.7, hold: 0.3, r: 0.5, peak: 0.35 }); [o1, o2, vib].forEach((o) => { o.start(t); o.stop(t + 1.8); });
  A.burst({ t0: t, dur: 1.4, vol: 0.2, f0: 800, f1: 200, env: { a: 0.1, d: 0.6, s: 0.5, r: 0.5 } });
};
SFX['boss.defeat'] = (A) => { const t = A.now; for (let i = 0; i < 6; i++) SFX['bot.explode'](A, { delay: i * 0.22, vol: 1.1, pan: rnd(-0.7, 0.7) }); A.burst({ t0: t + 1.2, dur: 1.4, vol: 0.55, f0: 6000, f1: 100, env: { a: 0.01, d: 0.6, s: 0.4, r: 0.8 } }); A.tone({ t0: t + 1.2, f0: 80, f1: 25, dur: 1.2, vol: 0.5 }); A.seq([[74, 2.0, 0.3], [78, 2.15, 0.3], [81, 2.3, 0.3], [86, 2.45, 1.2]], { vol: 0.16 }); };

// --- Stingers -----------------------------------------------------------
SFX['sting.perfect'] = (A) => { A.seq([[72, 0, 0.12], [76, 0.1, 0.12], [79, 0.2, 0.12], [84, 0.3, 0.7]], { type: 'triangle', vol: 0.18 }); A.seq([[60, 0.3, 0.8, 0.6], [67, 0.3, 0.8, 0.5]], { type: 'sine', vol: 0.12 }); A.burst({ t0: A.now + 0.3, dur: 0.6, vol: 0.06, type: 'highpass', f0: 6000, env: { a: 0.1, d: 0.2, s: 0.5, r: 0.3 } }); };
SFX['sting.fail'] = (A) => { A.seq([[63, 0, 0.18], [62, 0.17, 0.18], [61, 0.34, 0.18], [60, 0.51, 0.6]], { type: 'sawtooth', vol: 0.08, env: { a: 0.01, d: 0.1, s: 0.6, r: 0.2 } }); A.tone({ f0: 55, dur: 0.9, vol: 0.14, type: 'sine', env: { a: 0.05, d: 0.4, s: 0.5, r: 0.4 } }); };
SFX['sting.clear'] = (A) => { const t = A.now; A.seq([[67, 0, 0.15], [72, 0.15, 0.15], [76, 0.3, 0.15], [79, 0.45, 0.5], [84, 0.9, 1.1]], { type: 'sawtooth', vol: 0.07, env: { a: 0.02, d: 0.1, s: 0.7, r: 0.3 } }); A.seq([[55, 0.45, 0.6, 1], [60, 0.9, 1.2, 1]], { type: 'triangle', vol: 0.14 }); A.tone({ t0: t + 0.45, f0: 90, f1: 50, dur: 0.4, vol: 0.3 }); A.tone({ t0: t + 0.9, f0: 90, f1: 50, dur: 0.6, vol: 0.3 }); };
SFX['sting.gameover'] = (A) => { A.seq([[57, 0, 0.5], [53, 0.45, 0.5], [50, 0.9, 1.6]], { type: 'triangle', vol: 0.16 }); A.burst({ dur: 2.2, vol: 0.2, f0: 150, Q: 0.7, env: { a: 0.3, d: 1, s: 0.5, r: 0.9 } }); };

/* ======================================================================= */
/* Ambient: jungle wind, insects and birds                                 */
/* ======================================================================= */
class AmbientPlayer {
  constructor(A) { this.A = A; this.running = false; this.mode = 'jungle'; this.nodes = []; this.timer = null; }
  start(mode = 'jungle') {
    const A = this.A; if (!A.ctx) { this.pendingMode = mode; return; } this.pendingMode = null; this.mode = mode;
    if (this.running) { this.setMode(mode); return; }
    this.running = true; const t = A.now;
    // wind
    const wg = A.gain(0.0001, A.ambBus); const wf = A.filter('lowpass', 420, 0.8, wg); const wn = A.noiseSrc(wf);
    const wl = A.osc('sine', 0.08); const wlg = A.gain(220, wf.frequency); wl.connect(wlg);
    wg.gain.setTargetAtTime(0.22, t, 1.5); wn.start(t); wl.start(t);
    // insects
    const ig = A.gain(0.0001, A.ambBus); const inf = A.filter('bandpass', 6200, 9, ig); const inn = A.noiseSrc(inf);
    const am = A.osc('sine', 8); const amg = A.gain(0.3, ig.gain); am.connect(amg);
    ig.gain.setTargetAtTime(0.012, t, 2); inn.start(t); am.start(t);
    // water lapping (causeway)
    const wtg = A.gain(0.0001, A.ambBus); const wtf = A.filter('lowpass', 700, 0.8, wtg); const wtn = A.noiseSrc(wtf);
    const wtl = A.osc('sine', 0.35); const wtlg = A.gain(0.5, wtg.gain); wtl.connect(wtlg); wtn.start(t); wtl.start(t);
    // low arena drone (fades in for 'arena' mode)
    const dg = A.gain(0.0001, A.ambBus); const df = A.filter('lowpass', 180, 1, dg); const d1 = A.osc('sawtooth', 55, df); const d2 = A.osc('sawtooth', 55.6, df);
    d1.start(t); d2.start(t);
    this.nodes = [wn, wl, inn, am, d1, d2, wtn, wtl]; this.gains = { wind: wg, insects: ig, drone: dg, water: wtg };
    this.setMode(mode);
    this.timer = setInterval(() => this.tick(), 350);
  }
  setMode(mode) {
    this.mode = mode; if (!this.A.ctx) { this.pendingMode = mode; return; } if (!this.gains) return; const t = this.A.now;
    const arena = mode === 'arena' || mode === 'boss';
    this.gains.drone.gain.setTargetAtTime(arena ? (mode === 'boss' ? 0.16 : 0.09) : 0.0001, t, 1.2);
    this.gains.wind.gain.setTargetAtTime(arena ? 0.1 : 0.22, t, 1.2);
    this.gains.insects.gain.setTargetAtTime(arena ? 0.004 : 0.012, t, 1.2);
    this.gains.water.gain.setTargetAtTime(mode === 'causeway' ? 0.14 : 0.0001, t, 1.5);
  }
  tick() {
    if (!this.running || this.A.muted) return;
    const birdChance = this.mode === 'jungle' || this.mode === 'causeway' ? 0.22 : 0.05;
    if (Math.random() < birdChance) this.bird();
    if (this.mode !== 'jungle' && Math.random() < 0.07) SFX['torch'](this.A);
  }
  bird() {
    const A = this.A, t = A.now, pan = rnd(-0.8, 0.8), base = rnd(1500, 2800), n = 1 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) {
      const g = A.gain(0.0001, A.panner(pan, A.ambBus)); const o = A.osc('sine', base, g); const t0 = t + i * rnd(0.12, 0.2);
      o.frequency.setValueAtTime(base, t0); o.frequency.exponentialRampToValueAtTime(base * 1.5, t0 + 0.06); o.frequency.exponentialRampToValueAtTime(base * 1.1, t0 + 0.14);
      A.env(g.gain, t0, { a: 0.01, d: 0.06, s: 0.5, r: 0.08, peak: 0.08 }); o.start(t0); o.stop(t0 + 0.25);
    }
  }
  stop() {
    if (!this.running) return; this.running = false; clearInterval(this.timer);
    const t = this.A.now; Object.values(this.gains).forEach((g) => g.gain.setTargetAtTime(0.0001, t, 0.6));
    this.nodes.forEach((n) => { try { n.stop(t + 2.5); } catch {} }); this.nodes = []; this.gains = null;
  }
}

/* ======================================================================= */
/* Music: generative adventure loop with intensity layers                  */
/* ======================================================================= */
const MELODY = [5, -1, 7, -1, 9, 7, -1, 5, -1, -1, 4, -1, 5, -1, -1, -1, 7, -1, 9, -1, 10, 9, -1, 7, -1, -1, 5, -1, 4, -1, -1, -1];
const TENSION_ARP = [0, 4, 7, 4, 0, 4, 9, 4];
class MusicPlayer {
  constructor(A) {
    this.A = A; this.playing = false; this.mode = 'explore'; this.intensity = 0; this.bpm = 96; this.step = 0; this.nextTime = 0; this.timer = null;
    this.layers = null;
  }
  _layers() {
    if (this.layers) return this.layers; const A = this.A;
    const mk = (v) => { const g = A.gain(v, A.musicBus); return g; };
    this.layers = { pad: mk(0.0001), bass: mk(0.0001), perc: mk(0.0001), lead: mk(0.0001), arp: mk(0.0001) };
    return this.layers;
  }
  start(mode = 'explore') {
    if (!this.A.ctx) { this.pendingMode = mode; return; } this.pendingMode = null; this._layers(); this.setMode(mode);
    if (this.playing) return; this.playing = true; this.step = 0; this.nextTime = this.A.now + 0.15;
    this.timer = setInterval(() => this.schedule(), 45);
  }
  stop(fade = 1.2) {
    this.pendingMode = null; if (!this.playing) return; this.playing = false; clearInterval(this.timer);
    const t = this.A.now; Object.values(this.layers).forEach((g) => g.gain.setTargetAtTime(0.0001, t, fade / 3));
  }
  setMode(mode) {
    this.mode = mode; if (!this.A.ctx) { this.pendingMode = mode; return; } const L = this._layers(); const t = this.A.now, tc = 0.8;
    const set = (g, v) => g.gain.setTargetAtTime(Math.max(0.0001, v), t, tc);
    this.bpm = mode === 'boss' ? 118 : mode === 'tension' ? 104 : 96;
    switch (mode) {
      case 'explore': set(L.pad, 0.5); set(L.bass, 0.35); set(L.perc, 0.3); set(L.lead, 0.42); set(L.arp, 0.0001); break;
      case 'arena': set(L.pad, 0.45); set(L.bass, 0.5); set(L.perc, 0.5); set(L.lead, 0.0001); set(L.arp, 0.1); break;
      case 'tension': set(L.pad, 0.35); set(L.bass, 0.55); set(L.perc, 0.6); set(L.lead, 0.0001); set(L.arp, 0.22); break;
      case 'boss': set(L.pad, 0.5); set(L.bass, 0.7); set(L.perc, 0.8); set(L.lead, 0.2); set(L.arp, 0.28); break;
      case 'calm': set(L.pad, 0.55); set(L.bass, 0.0001); set(L.perc, 0.0001); set(L.lead, 0.2); set(L.arp, 0.0001); break;
      case 'title': set(L.pad, 0.55); set(L.bass, 0.3); set(L.perc, 0.2); set(L.lead, 0.35); set(L.arp, 0.0001); break;
    }
  }
  schedule() {
    if (!this.playing || this.A.muted) { if (this.playing) this.nextTime = Math.max(this.nextTime, this.A.now + 0.1); return; }
    const step16 = 60 / this.bpm / 4;
    if (this.nextTime < this.A.now - 0.1) this.nextTime = this.A.now + 0.05; // tab was hidden: skip missed notes
    while (this.nextTime < this.A.now + 0.25) { this.playStep(this.step, this.nextTime, step16); this.step++; this.nextTime += step16; }
  }
  playStep(step, t, step16) {
    const A = this.A, L = this.layers, s = step % 16, bar = Math.floor(step / 16);
    const minor = this.mode === 'boss' || this.mode === 'tension';
    const roots = minor ? [50, 46, 45, 50] : [50, 53, 48, 50]; // D, Bb, A | D, F, C
    const root = roots[bar % 4];
    // pad – one chord per bar
    if (s === 0) {
      [0, 3, 7, 12].forEach((iv, i) => { const g = A.gain(0.0001, L.pad); const f = A.filter('lowpass', 900, 0.7, g); const o = A.osc(i === 3 ? 'sine' : 'triangle', NOTE(root + iv), f); o.detune.value = rnd(-6, 6); const end = A.env(g.gain, t, { a: 0.6, d: 1.5, s: 0.6, hold: step16 * 10, r: 1.2, peak: 0.07 }); o.start(t); o.stop(end + 0.1); });
    }
    // bass
    const bassPattern = minor ? [0, 3, 6, 8, 10, 11, 14] : [0, 6, 8, 12, 14];
    if (bassPattern.includes(s)) { const g = A.gain(0.0001, L.bass); const f = A.filter('lowpass', 420, 2, g); const o = A.osc('sawtooth', NOTE(root - 24 + (s === 6 || s === 14 ? 7 : s === 11 ? 5 : 0)), f); const sub = A.osc('sine', NOTE(root - 36), g); A.env(g.gain, t, { a: 0.005, d: 0.15, s: 0.3, r: 0.1, peak: 0.22 }); o.start(t); sub.start(t); o.stop(t + 0.4); sub.stop(t + 0.4); }
    // percussion – jungle kit: kick, log drum, shaker
    const kick = minor ? [0, 6, 8, 10] : [0, 8];
    if (kick.includes(s)) A.tone({ t0: t, f0: 150, f1: 42, dur: 0.22, vol: 0.5, dest: L.perc, env: { a: 0.002, d: 0.1, s: 0.2, r: 0.12 } });
    if (s === 4 || s === 12) { A.burst({ t0: t, dur: 0.14, vol: 0.28, type: 'bandpass', f0: 1200, f1: 600, Q: 1, dest: L.perc, env: { a: 0.002, d: 0.06, s: 0.3, r: 0.08 } }); A.tone({ t0: t, f0: 320, f1: 190, dur: 0.1, vol: 0.14, dest: L.perc }); }
    if (s % 2 === 0) A.burst({ t0: t, dur: 0.045, vol: s % 4 === 2 ? 0.1 : 0.05, type: 'highpass', f0: 7500, dest: L.perc, env: { a: 0.001, d: 0.02, s: 0.2, r: 0.02 } });
    if (minor && (s === 14 || (bar % 2 === 1 && s === 15))) A.tone({ t0: t, f0: 220, f1: 120, dur: 0.18, vol: 0.2, dest: L.perc });
    // lead melody (explore / boss)
    const m = MELODY[step % 32];
    if (m >= 0 && (s % 2 === 0 || this.mode === 'boss')) { const f0 = PENTA[m % PENTA.length] * 2; const g = A.gain(0.0001, L.lead); const o = A.osc('triangle', f0, g); const o2 = A.osc('sine', f0 * 2, g); A.env(g.gain, t, { a: 0.01, d: 0.25, s: 0.2, r: 0.3, peak: 0.11 }); o.start(t); o2.start(t); o.stop(t + 0.7); o2.stop(t + 0.7); }
    // tension arpeggio (16ths)
    const arpN = TENSION_ARP[s % 8]; const ag = A.gain(0.0001, L.arp); const af = A.filter('lowpass', 1400, 1.5, ag); const ao = A.osc('triangle', NOTE(root + 12 + arpN), af);
    A.env(ag.gain, t, { a: 0.003, d: 0.08, s: 0.2, r: 0.05, peak: 0.07 }); ao.start(t); ao.stop(t + 0.2);
  }
}

export const audio = new AudioEngine();
