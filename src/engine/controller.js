// ---------------------------------------------------------------------------
// The player's controller (user 2026-10-27: the player moves Karan, the game no
// longer walks him). An on-screen stick in the bottom-left corner (touch or
// mouse; a touch anywhere in its corner brings it under the thumb) and
// W A S D / the arrow keys. read() → { x, y, mag }: x to the right, y up the
// screen (away from the camera), mag 0..1. Hidden and silent unless enabled.
// ---------------------------------------------------------------------------
import { audio } from './audio.js';

const DEAD = 0.14;            // stick dead zone (fraction of its travel)
const KEYS = { KeyW: [0, 1], ArrowUp: [0, 1], KeyS: [0, -1], ArrowDown: [0, -1], KeyA: [-1, 0], ArrowLeft: [-1, 0], KeyD: [1, 0], ArrowRight: [1, 0] };
const ZERO = Object.freeze({ x: 0, y: 0, mag: 0 });

export const controller = {
  on: false, keys: new Set(), stick: { x: 0, y: 0, id: null }, el: null, base: null, knob: null,
  R: 46,                      // how far the knob travels (px)
  rest: { x: 100, y: 100 }, center: { x: 100, y: 100 },
  /** a touch screen: the walkthrough says "drag", not "W A S D" */
  get touch() { return !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches); },

  init() {
    const el = this.el = document.getElementById('joystick'); this.base = el.querySelector('.js-base'); this.knob = el.querySelector('.js-knob');
    window.addEventListener('keydown', (e) => {
      if (!KEYS[e.code] || e.target instanceof HTMLInputElement) return;
      if (this.on) e.preventDefault();   // (the arrows would scroll the page)
      this.keys.add(e.code); if (this.on) this.demo(false);
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => { this.keys.clear(); this.release(); });
    el.addEventListener('pointerdown', (e) => {
      if (!this.on || this.stick.id != null) return;
      e.preventDefault(); el.setPointerCapture(e.pointerId);
      const p = this.local(e), near = Math.hypot(p.x - this.rest.x, p.y - this.rest.y) < 66 * 1.5;
      this.center = near ? { ...this.rest } : p;   // a touch away from the stick brings the stick under the thumb
      this.placeBase(this.center); this.stick.id = e.pointerId; el.classList.add('held'); this.demo(false); this.drag(p);
    });
    el.addEventListener('pointermove', (e) => { if (e.pointerId === this.stick.id) this.drag(this.local(e)); });
    const up = (e) => { if (e.pointerId === this.stick.id) this.release(); };
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    window.addEventListener('resize', () => this.layout()); this.layout();
  },
  local(e) { const r = this.el.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; },
  drag(p) {
    let dx = p.x - this.center.x, dy = p.y - this.center.y; const m = Math.hypot(dx, dy);
    if (m > this.R) { dx *= this.R / m; dy *= this.R / m; }
    this.stick.x = dx / this.R; this.stick.y = -dy / this.R;
    this.knob.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px)`;
  },
  release() {
    this.stick.id = null; this.stick.x = this.stick.y = 0;
    if (!this.el) return;
    this.knob.style.transform = ''; this.el.classList.remove('held'); this.placeBase(this.rest);
  },
  /** the stick's resting place: its corner, clear of the screen edge (and the phone's safe area: the zone itself sits inside it) */
  layout() {
    if (!this.el) return;
    const h = this.el.clientHeight, s = window.innerWidth < 760 ? 22 : 30;
    this.rest = { x: s + 66, y: h - s - 66 };
    if (this.stick.id == null) this.placeBase(this.rest);
  },
  placeBase(c) { this.base.style.left = `${c.x}px`; this.base.style.top = `${c.y}px`; },

  /** The stick on or off (it fades in and out with the free walks; held keys and a held stick are dropped). */
  enable(on) {
    if (this.on === on) return;
    this.on = on; this.release(); if (!on) this.demo(false);
    if (this.el) this.el.classList.toggle('on', on);
  },
  /** First appearance after the opening: it pops up with a ripple. demo: the knob shows the move until the player tries. */
  reveal({ demo = false } = {}) {
    if (!this.el) return;
    this.el.classList.remove('reveal'); void this.el.offsetWidth; this.el.classList.add('reveal');
    audio.play('controller.reveal'); this.demo(demo);
  },
  demo(on) { if (this.el) this.el.classList.toggle('demo', on); },

  /** Where the player is pushing: the stick when it is held, else the keys (diagonals normalised). */
  read() {
    if (!this.on) return ZERO;
    if (this.stick.id != null) {
      const m = Math.hypot(this.stick.x, this.stick.y);
      if (m <= DEAD) return ZERO;
      const k = Math.min(1, (m - DEAD) / (1 - DEAD));
      return { x: (this.stick.x / m) * k, y: (this.stick.y / m) * k, mag: k };
    }
    let x = 0, y = 0;
    for (const c of this.keys) { const k = KEYS[c]; x += k[0]; y += k[1]; }
    const m = Math.hypot(x, y);
    return m ? { x: x / m, y: y / m, mag: 1 } : ZERO;
  },
};
