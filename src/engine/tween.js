// ---------------------------------------------------------------------------
// Minimal game-time tween manager (dt driven, pauses when the game pauses)
// ---------------------------------------------------------------------------
import { Ease } from './util.js';

class Tween {
  constructor(o) {
    this.duration = Math.max(0, o.duration ?? 0.5);
    this.delay = o.delay ?? 0;
    this.ease = o.ease ?? Ease.outCubic;
    this.onUpdate = o.onUpdate ?? null;
    this.onComplete = o.onComplete ?? null;
    this.target = o.target ?? null;
    this.props = o.props ?? null;
    this.from = null;
    this.tag = o.tag ?? null;
    this.t = 0;
    this.done = false;
    this.cancelled = false;
    this.promise = new Promise((res) => { this._resolve = res; });
  }
  _init() {
    if (this.target && this.props && !this.from) {
      this.from = {};
      for (const k in this.props) this.from[k] = this.target[k];
    }
  }
  update(dt) {
    if (this.done) return true;
    if (this.delay > 0) { this.delay -= dt; if (this.delay > 0) return false; dt = -this.delay; this.delay = 0; }
    this._init();
    this.t += dt;
    const raw = this.duration <= 0 ? 1 : Math.min(1, this.t / this.duration);
    const e = this.ease(raw);
    if (this.target && this.props) {
      for (const k in this.props) this.target[k] = this.from[k] + (this.props[k] - this.from[k]) * e;
    }
    if (this.onUpdate) this.onUpdate(e, raw);
    if (raw >= 1) { this.done = true; if (this.onComplete) this.onComplete(); this._resolve(true); return true; }
    return false;
  }
  cancel() { if (this.done) return; this.done = true; this.cancelled = true; this._resolve(false); }
}

export class TweenManager {
  constructor() { this.list = []; }
  add(opts) { const tw = new Tween(opts); this.list.push(tw); return tw; }
  /** Animate numeric properties of `target` to the values in `props`. */
  to(target, props, opts = {}) { return this.add({ ...opts, target, props }); }
  /** Animate a scalar from->to, calling onUpdate(value, eased, raw). */
  value(from, to, duration, onUpdate, opts = {}) {
    return this.add({ ...opts, duration, onUpdate: (e, raw) => onUpdate(from + (to - from) * e, e, raw) });
  }
  /** Game-time delay (seconds). */
  delay(seconds, tag) { return this.add({ duration: seconds, ease: Ease.linear, tag }); }
  update(dt) {
    if (!this.list.length) return;
    const keep = [];
    for (const tw of this.list) { if (!tw.update(dt)) keep.push(tw); }
    this.list = keep;
  }
  cancelTag(tag) { for (const tw of this.list) if (tw.tag === tag) tw.cancel(); }
  clear() { for (const tw of this.list) tw.cancel(); this.list = []; }
}

export const tweens = new TweenManager();
export const tweenTo = (target, props, opts) => tweens.to(target, props, opts).promise;
export const tweenValue = (from, to, duration, onUpdate, opts) => tweens.value(from, to, duration, onUpdate, opts).promise;
export const delay = (seconds, tag) => tweens.delay(seconds, tag).promise;
