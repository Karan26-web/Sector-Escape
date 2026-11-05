// ---------------------------------------------------------------------------
// The voice-over (user 2026-11-05): the narrator's and Karan's recorded lines, one clip per line, cut from one
// recording at its breathing spaces (tools/cut_vo.py; the lines are listed in assets/manifest.json "vo").
// One voice at a time, never two over each other. play(id, { mode }):
//   'queue' (default) speaks after the line that is speaking and those already waiting (ttl: give up if it has not
//           started within ttl s: a reaction that comes too late is not said);
//   'drop'  speaks only if nobody is speaking or waiting (hints, small reactions);
//   'cut'   the line that is speaking fades out, the waiting ones are forgotten, this one speaks now (a new card, a
//           skipped line, the moment of a shot).
// once / max: at most once / max times in a session. While a line speaks the music and the jungle bed duck. Lines run
// in real time; pause() holds the line and resume() goes on from the same word. Without a running audio clock (no tap
// yet), when muted, or for a line that did not load, play() resolves at once: the game never waits on a voice that
// cannot be heard. play() resolves true when the line was spoken to its end, false otherwise; its promise carries
// .started (it is speaking or waiting) and .dur (its length, s).
// ---------------------------------------------------------------------------
import { audio } from './audio.js';
import { assets } from './assets.js';

const FADE = 0.12;   // s: a line that is cut fades out over this

export const vo = {
  cur: null,          // the line speaking: { id, src, gain, startAt, offset, buf, done }
  wait: [],           // the lines waiting: { id, buf, done, until }
  said: new Map(),    // id → times spoken this session
  held: null,         // pause(): the line that was speaking { id, buf, offset, done }

  has(id) { return !!assets.voice(id); },
  dur(id) { const b = assets.voice(id); return b ? b.duration : 0; },
  text(id) { const d = assets.voDef(id); return d ? d.text : ''; },
  get speaking() { return !!(this.cur || this.held || this.wait.length); },

  play(id, { mode = 'queue', ttl = Infinity, once = false, max = Infinity } = {}) {
    const ctx = audio.ctx, buf = assets.voice(id), n = this.said.get(id) || 0;
    const no = () => Object.assign(Promise.resolve(false), { started: false, dur: 0 });
    if (!buf || !ctx || ctx.state !== 'running' || audio.muted || (once && n) || n >= max) return no();
    if (mode === 'drop' && this.speaking) return no();
    this.said.set(id, n + 1);
    let done; const p = new Promise((r) => { done = r; });
    const line = { id, buf, done, until: performance.now() + ttl * 1000 };
    if (mode === 'cut') { this.clear(); this.start(line); }
    else if (!this.cur && !this.held) this.start(line);
    else this.wait.push(line);
    return Object.assign(p, { started: true, dur: buf.duration });
  },
  /** Speak a line from `offset` s into it. */
  start(line, offset = 0) {
    const ctx = audio.ctx, src = ctx.createBufferSource(), gain = ctx.createGain();
    src.buffer = line.buf; src.connect(gain); gain.connect(audio.voBus);
    const cur = this.cur = { ...line, src, gain, startAt: ctx.currentTime, offset };
    src.onended = () => { if (this.cur === cur) { this.cur = null; cur.done(true); this.next(); } };
    src.start(ctx.currentTime, offset);
    audio.duck(true);
  },
  /** The next waiting line that is still timely, or the music comes back. */
  next() {
    const now = performance.now();
    while (this.wait.length) { const l = this.wait.shift(); if (l.until >= now) { this.start(l); return; } l.done(false); }
    audio.duck(false);
  },
  /** Silence the line speaking (fading it) without touching the ones waiting. */
  hush(fade = FADE) {
    const c = this.cur; if (!c) return;
    this.cur = null; c.src.onended = null;
    try { c.gain.gain.setTargetAtTime(0, audio.now, fade / 3); c.src.stop(audio.now + fade); } catch {}
    c.done(false);
  },
  /** Everything stops: the line speaking fades, the waiting ones and a held one are forgotten. */
  stop(fade = FADE) { this.clear(fade); audio.duck(false); },
  clear(fade = FADE) {
    this.hush(fade);
    for (const l of this.wait.splice(0)) l.done(false);
    if (this.held) { this.held.done(false); this.held = null; }
  },
  /** Forget a waiting line (it no longer fits the moment); the line speaking is left alone. */
  drop(id) { this.wait = this.wait.filter((l) => (l.id === id ? (l.done(false), false) : true)); },
  /** The game pauses: the line stops where it is, to go on from there. */
  pause() {
    const c = this.cur; if (!c || !audio.ctx) return;
    this.cur = null; c.src.onended = null;
    try { c.src.stop(); } catch {}
    this.held = { ...c, offset: c.offset + Math.max(0, audio.ctx.currentTime - c.startAt) };
    audio.duck(false);
  },
  resume() {
    const h = this.held; if (!h) return;
    this.held = null;
    if (!audio.ctx || audio.ctx.state !== 'running' || h.offset >= h.buf.duration - 0.05) { h.done(h.offset >= h.buf.duration - 0.05); this.next(); return; }
    this.start(h, h.offset);
  },
};
