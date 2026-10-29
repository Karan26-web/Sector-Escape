// ---------------------------------------------------------------------------
// DOM UI: screens, HUD, answer dock and formula, stamps, map, results
// ---------------------------------------------------------------------------
import * as THREE from '../../vendor/three.module.js';
import { assets } from '../engine/assets.js';
import { audio } from '../engine/audio.js';
import { delay } from '../engine/tween.js';
import { CHAIN, formulaParts, choices, pickTruth, evaluatePick, solveSteps, sectorCoef, answerFor } from '../game/levels.js';
import { formatNumber } from '../engine/util.js';
import { MapArt } from './mapArt.js';
import { save } from '../game/save.js';

const $ = (sel) => document.querySelector(sel);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const frameCache = new Map();

export function imgUrl(name) {
  const img = assets.get(name); if (!img) return '';
  if (img instanceof HTMLCanvasElement) { if (!img.__dataUrl) img.__dataUrl = img.toDataURL('image/png'); return img.__dataUrl; }
  return img.src;
}
/** The file URL an image shown by its blob: URL falls back to (see init); none for a procedural placeholder. */
const fileFallback = (name) => (assets.isPlaceholder(name) ? '' : assets.fileUrl(name));
/** Show a loaded image in an <img>. */
function setImg(el, name) { const src = imgUrl(name); if (!el || !src) return; el.dataset.file = fileFallback(name); el.src = src; }
export function frameUrl(name, index) {
  const key = name + ':' + index; if (frameCache.has(key)) return frameCache.get(key);
  const img = assets.get(name), def = assets.frames(name); if (!img) return '';
  const c = document.createElement('canvas'); c.width = def.frameW; c.height = def.frameH;
  const col = index % def.cols, row = Math.floor(index / def.cols);
  c.getContext('2d').drawImage(img, col * def.frameW, row * def.frameH, def.frameW, def.frameH, 0, 0, def.frameW, def.frameH);
  const url = c.toDataURL('image/png'); frameCache.set(key, url); return url;
}
const animIndex = (name, anim) => { const d = assets.frames(name).anims[anim]; return d ? (d.col ?? 0) + (d.row ?? 0) * assets.frames(name).cols : 0; };

let game = null;
const timers = {};
function once(el, ev) { return new Promise((res) => el.addEventListener(ev, res, { once: true })); }
function waitClick(map) {
  return new Promise((res) => {
    const handlers = [];
    for (const [sel, val] of Object.entries(map)) { const el = $(sel); if (!el) continue; const h = () => { handlers.forEach(([e, f]) => e.removeEventListener('click', f)); res(val); }; el.addEventListener('click', h); handlers.push([el, h]); }
  });
}
/** (n/d)^fp × π × r^rp as the LXD writes it: (90/360) × π × (7)² */
const exprHtml = (e) => { const f = `(<span class="frac"><span>${e.n}</span><span>${e.d}</span></span>)`, r = formatNumber(e.r); return `${f}${e.fp === 2 ? '<sup>2</sup>' : ''} × π × ${e.rp === 2 ? `(${r})<sup>2</sup>` : r}`; };
const starsHtml = (n, max = 3) => [...Array(max)].map((_, i) => `<img src="${frameUrl('ui_icons', i < n ? 1 : 2)}" alt="">`).join('');
/** Inline icons, cartoon style (bold outline, flat fill). LXD 2026-10-29: ⚠ marks a mistake and 💡 a hint (H2); the outcomes
 *  carry a shape as well as a colour (H3): arrows closing in = too small, arrows opening out = too big, a tick = perfect;
 *  the hourglass labels the time to answer (B1). */
export const ICONS = {
  warn: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.6 L22.6 21 H1.4 Z" fill="#ffb02e" stroke="#3a1606" stroke-width="2.2" stroke-linejoin="round"/><path d="M12 9 V14.2" stroke="#3a1606" stroke-width="2.8" stroke-linecap="round"/><circle cx="12" cy="17.6" r="1.6" fill="#3a1606"/></svg>',
  bulb: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.4 a7 7 0 0 1 4.2 12.6 c-.8.6-1.2 1.4-1.2 2.3 V18 H9 v-.7 c0-.9-.4-1.7-1.2-2.3 A7 7 0 0 1 12 2.4 Z" fill="#ffe36b" stroke="#3a2a06" stroke-width="2" stroke-linejoin="round"/><path d="M9.2 20.2 H14.8 M10.2 22.4 H13.8" stroke="#3a2a06" stroke-width="2" stroke-linecap="round"/><path d="M10 8.2 a2.6 2.6 0 0 1 2-1.8" fill="none" stroke="#fff8d0" stroke-width="1.8" stroke-linecap="round"/></svg>',
  shrink: '<svg viewBox="0 0 40 24" aria-hidden="true"><path d="M2 12 H15 M9 5.5 L15.5 12 L9 18.5 M38 12 H25 M31 5.5 L24.5 12 L31 18.5" fill="none" stroke="currentColor" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  expand: '<svg viewBox="0 0 40 24" aria-hidden="true"><path d="M17 12 H3 M9.5 5.5 L3 12 L9.5 18.5 M23 12 H37 M30.5 5.5 L37 12 L30.5 18.5" fill="none" stroke="currentColor" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 12.5 L9.5 18.5 L20.5 6" fill="none" stroke="currentColor" stroke-width="3.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  hourglass: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 2.8 H18 M6 21.2 H18" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M7.4 3 C7.4 8 12 9.6 12 12 C12 14.4 7.4 16 7.4 21 H16.6 C16.6 16 12 14.4 12 12 C12 9.6 16.6 8 16.6 3 Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M9.6 19.4 C10.4 17.4 12 16.6 12 16.6 C12 16.6 13.6 17.4 14.4 19.4 Z" fill="currentColor"/></svg>',
};
/** The icon an outcome carries (stamps, the beam line, How to play). */
const OUTCOME_ICON = { under: ICONS.shrink, over: ICONS.expand, perfect: ICONS.check, correct: ICONS.check, timeup: ICONS.hourglass };
const shuffled = (a) => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };

export const ui = {
  init(g) {
    game = g;
    document.body.addEventListener('pointerenter', (e) => { if (e.target instanceof HTMLButtonElement && (e.target.classList.contains('tablet') || e.target.classList.contains('big'))) audio.play('ui.hover', { minGap: 0.25 }); }, true);
    document.body.addEventListener('click', (e) => { if (e.target instanceof HTMLButtonElement && !e.target.classList.contains('silent')) audio.play('ui.click'); }, true);
    // no speaker or pause button on screen (user, 2026-10-23): M toggles the sound, Esc pauses; the map's settings menu
    // and the pause menu also switch the sound
    $('#btn-pause-mute').addEventListener('click', () => audio.toggleMute());
    $('#answer-timer .at-ico').innerHTML = ICONS.hourglass;
    $('#feedback .fb-mistake .fb-ico').innerHTML = ICONS.warn; $('#feedback .fb-hint .fb-ico').innerHTML = ICONS.bulb;
    window.addEventListener('keydown', (e) => { if (e.code === 'KeyM' && !(e.target instanceof HTMLInputElement)) audio.toggleMute(); if (e.code === 'Escape') game.togglePause(); });
    this.panel.init();
    // an <img> / SVG <image> shown by its blob: URL that ever fails to load falls back, once, to the file's own URL (data-file)
    $('#ui').addEventListener('error', (e) => {
      const el = e.target, f = el && el.dataset && el.dataset.file; if (!f || el.dataset.retried) return;
      el.dataset.retried = '1'; if (el.tagName === 'IMG') el.src = f; else el.setAttribute('href', f);
    }, true);
  },
  applyArt() { document.documentElement.style.setProperty('--stone-tex', `url("${imgUrl('wall_top')}")`);   // the tablet buttons' stone: the already-loaded image, no second fetch
    setImg($('#title-logo'), 'ui_logo'); $('.howto-deck').style.backgroundImage = `url(${imgUrl('ui_parchment')})`; },

  /* ---------------------------------------------------------- screens */
  show(id) { const el = $('#screen-' + id); if (el) el.classList.add('active'); },
  hide(id) { const el = $('#screen-' + id); if (el) el.classList.remove('active'); },
  hideAll() { document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active')); },
  loading: {
    shown: 0, text: '',
    /** The loading bar (called on every downloaded chunk). It only ever moves forward; the text is only rewritten when it changes. */
    progress(p, text) {
      this.shown = Math.max(this.shown, Math.min(1, p));
      $('#progress-fill').style.transform = `scaleX(${this.shown.toFixed(4)})`; $('#loading-bar').setAttribute('aria-valuenow', String(Math.round(this.shown * 100)));
      if (text && text !== this.text) { this.text = text; $('#loading-text').textContent = text; }
    },
    logo() { setImg($('#loading-logo'), 'ui_logo'); },
  },
  title: {
    /** Play and How to play. There is no Continue (user 2026-10-27): every game starts from the very start. */
    async show() {
      ui.hideAll(); ui.show('title'); const c = await waitClick({ '#btn-play': 'play', '#btn-howto': 'howto' }); return c;
    },
    hide() { ui.hide('title'); },
  },
  /* How to play (LXD): three swipeable cards, dots + Back/Next, the last button reads "Let's go!" */
  howto: {
    built: false, i: 0,
    build() {
      if (this.built) return; this.built = true;
      // 1 · Watch the gap (LXD 2026-10-23): the guardians pound on the barrier across the gap; Karan watches from his spot;
      //     the point O draws a radius and sweeps out the sector
      { const cx = 110, cy = 140, R = 86, P = (a, r = R) => [cx + r * Math.cos(a * Math.PI / 180), cy + r * Math.sin(a * Math.PI / 180)].map((v) => +v.toFixed(1));
        const [l0x, l0y] = P(-135), [l1x, l1y] = P(-45), [w0x, w0y] = P(-45, R + 5), [w1x, w1y] = P(225, R + 5);
        // the guardians play their pound row (show() cycles the frames); sized from the sheet's cells, feet on its ground line
        const ed = assets.frames('enemy_bot'), pi = animIndex('enemy_bot', ed.anims.pound ? 'pound' : 'idle'), pn = ed.anims.pound ? ed.anims.pound.frames : 1;
        this.poundFrames = [...Array(pn)].map((_, k) => frameUrl('enemy_bot', pi + k));
        const kar = frameUrl('hero_back', 0), bh = 32, bw = (bh * ed.frameW) / ed.frameH;
        const guards = [-124, -107, -90, -73, -56].map((a, k) => { const [x, y] = P(a, R + 14);
          return `<image href="${this.poundFrames[0]}" x="${(x - bw / 2).toFixed(1)}" y="${(y - bh * ed.baseline).toFixed(1)}" width="${bw.toFixed(1)}" height="${bh}" class="g-bot" data-k="${k}"/>`; }).join('');
        // (the floor art's own stone rim is scaled out of the clip, so the drawn wall with its gap is the only edge)
        $('#hw-pic-0').innerHTML = `<svg viewBox="0 0 220 236" class="hw-gap" aria-hidden="true">
          <defs><clipPath id="hw-floor-clip"><circle cx="${cx}" cy="${cy}" r="${R}"/></clipPath></defs>
          <image href="${imgUrl('arena_floor')}" data-file="${fileFallback('arena_floor')}" x="${cx - R / 0.86}" y="${cy - R / 0.86}" width="${(2 * R) / 0.86}" height="${(2 * R) / 0.86}" clip-path="url(#hw-floor-clip)" preserveAspectRatio="xMidYMid slice"/>
          <path d="M${w0x} ${w0y} A${R + 5} ${R + 5} 0 1 1 ${w1x} ${w1y}" class="g-wall"/>
          <path d="M${cx} ${cy} L${l0x} ${l0y} A${R} ${R} 0 0 1 ${l1x} ${l1y} Z" class="g-wedge"/>
          <line x1="${cx}" y1="${cy}" x2="${l0x}" y2="${l0y}" class="g-radius g-r0"/>
          <line x1="${cx}" y1="${cy}" x2="${l0x}" y2="${l0y}" class="g-radius g-sweep"/>
          <circle cx="${cx}" cy="${cy}" r="4" class="g-o"/>
          <path d="M${l0x} ${l0y} A${R} ${R} 0 0 1 ${l1x} ${l1y}" class="g-barrier"/>
          ${guards}
          <image href="${kar}" x="${cx - 16}" y="${cy + 26 - 32 * 0.91}" width="32" height="32"/></svg>`; }
      // 2 · Find the sector area: the textbook picture: centre O, r, θ, the open arc
      const C = 110, Rr = 82, a0 = -135, a1 = -45, P = (deg, r) => [C + r * Math.cos(deg * Math.PI / 180), C + r * Math.sin(deg * Math.PI / 180)];
      const [x0, y0] = P(a0, Rr), [x1, y1] = P(a1, Rr), [tx0, ty0] = P(a0, 26), [tx1, ty1] = P(a1, 26);
      $('#hw-pic-1').innerHTML = `<svg viewBox="0 0 220 210" class="hw-diagram">
        <circle cx="${C}" cy="${C}" r="${Rr}" class="d-ring"/>
        <path d="M${C} ${C} L${x0} ${y0} A${Rr} ${Rr} 0 0 1 ${x1} ${y1} Z" class="d-sector"/>
        <path d="M${x0} ${y0} A${Rr} ${Rr} 0 0 1 ${x1} ${y1}" class="d-arc"/>
        <line x1="${C}" y1="${C}" x2="${x0}" y2="${y0}" class="d-edge"/><line x1="${C}" y1="${C}" x2="${x1}" y2="${y1}" class="d-edge r"/>
        <path d="M${tx0} ${ty0} A26 26 0 0 1 ${tx1} ${ty1}" class="d-angle"/>
        <circle cx="${C}" cy="${C}" r="4.5" class="d-o"/><text x="${C + 9}" y="${C + 16}" class="d-lbl">O</text>
        <text x="${C}" y="${C - 34}" class="d-lbl cy" text-anchor="middle">θ</text>
        <text x="${(C + x1) / 2 + 12}" y="${(C + y1) / 2 + 10}" class="d-lbl">r</text>
        <text x="${C}" y="${C - Rr - 8}" class="d-lbl small" text-anchor="middle">open arc</text></svg>`;
      // 3 · Fire!: the three outcomes side by side, labelled as in the game (LXD 2026-10-29: TOO SMALL / PERFECT / TOO BIG),
      //     each with its shape as well as its colour: the missing part dashed, the excess hatched, an icon by the name
      const mini = (kind) => {
        const c = 50, r = 38, wedge = (s, l, cls) => { const [ax, ay] = [c + r * Math.cos(s * Math.PI / 180), 54 + r * Math.sin(s * Math.PI / 180)], e = s + l, [bx, by] = [c + r * Math.cos(e * Math.PI / 180), 54 + r * Math.sin(e * Math.PI / 180)]; return `<path d="M${c} 54 L${ax} ${ay} A${r} ${r} 0 ${l > 180 ? 1 : 0} 1 ${bx} ${by} Z" class="${cls}"/>`; };
        const ring = `<circle cx="${c}" cy="54" r="${r}" class="m-ring"/>`;
        if (kind === 'small') return `<svg viewBox="0 0 100 100">${ring}${wedge(-135, 90, 'm-target')}${wedge(-112, 44, 'm-beam')}<circle cx="27" cy="31" r="5" class="m-bot"/><circle cx="73" cy="31" r="5" class="m-bot"/></svg>`;
        if (kind === 'right') return `<svg viewBox="0 0 100 100">${ring}${wedge(-135, 90, 'm-gold')}<text x="50" y="40" text-anchor="middle" class="m-star">★</text></svg>`;
        return `<svg viewBox="0 0 100 100"><defs><pattern id="hw-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="rgba(225, 35, 85, 0.45)"/><rect width="3" height="6" fill="rgba(160, 10, 55, 0.95)"/></pattern></defs>${ring}${wedge(-160, 25, 'm-excess')}${wedge(-135, 90, 'm-beam')}${wedge(-45, 25, 'm-excess')}<path d="M86 34 Q74 52 56 54" class="m-bounce"/><path d="M56 54 l7 -6 M56 54 l8 3" class="m-bounce"/></svg>`;
      };
      $('#hw-pic-2').innerHTML = [['small', 'under', 'Too small', 'The barrier breaks, but some guardians get through'], ['right', 'perfect', 'Perfect', 'The barrier and every guardian destroyed'], ['big', 'over', 'Too big', 'The extra charge bounces back and knocks Karan down']]
        .map(([k, o, t, d]) => `<figure class="hw-out ${k}">${mini(k)}<figcaption><b><span class="hw-ico">${OUTCOME_ICON[o]}</span>${t}</b>${d}</figcaption></figure>`).join('');
      $('#hw-shields').innerHTML = [0, 1, 2].map(() => `<img src="${frameUrl('ui_shield', 0)}" alt="">`).join('');
      // swipe / keys / dots
      const vp = $('.hw-viewport'); let x0s = null;
      vp.addEventListener('pointerdown', (e) => { x0s = e.clientX; });
      vp.addEventListener('pointerup', (e) => { if (x0s == null) return; const dx = e.clientX - x0s; x0s = null; if (Math.abs(dx) > 40) this.go(this.i + (dx < 0 ? 1 : -1)); });
      [...$('#hw-dots').children].forEach((d, k) => d.addEventListener('click', () => this.go(k)));
    },
    go(k) {
      this.i = Math.max(0, Math.min(2, k));
      $('#hw-track').style.transform = `translateX(${-this.i * 100}%)`;
      [...$('#hw-dots').children].forEach((d, j) => d.classList.toggle('on', j === this.i));
      $('#hw-back').style.visibility = this.i === 0 ? 'hidden' : 'visible';
      $('#hw-next').textContent = this.i === 2 ? "Let's go!" : 'Next';
      audio.play('ui.whoosh');
    },
    async show() {
      this.build(); ui.show('howto'); $('#screen-howto').classList.add('dim'); this.go(0);
      const bots = [...document.querySelectorAll('#hw-pic-0 .g-bot')], pf = this.poundFrames; let tick = 0;   // the guardians pound, out of step
      const anim = setInterval(() => { tick++; bots.forEach((im, k) => im.setAttribute('href', pf[(tick + k * 2) % pf.length])); }, 100);
      const onKey = (e) => { if (e.key === 'ArrowRight') this.go(this.i + 1); if (e.key === 'ArrowLeft') this.go(this.i - 1); };
      window.addEventListener('keydown', onKey);
      await new Promise((res) => {
        const next = () => { if (this.i < 2) this.go(this.i + 1); else { cleanup(); res(); } };
        const back = () => this.go(this.i - 1);
        const cleanup = () => { $('#hw-next').removeEventListener('click', next); $('#hw-back').removeEventListener('click', back); };
        $('#hw-next').addEventListener('click', next); $('#hw-back').addEventListener('click', back);
      });
      clearInterval(anim); window.removeEventListener('keydown', onKey); audio.play('ui.confirm'); ui.hide('howto');
    },
  },
  /* ---------------------------------------------------------- the opening (user 2026-10-27): letterbox, the narrator, Karan
     The narrator's lines fade in whole across the lower letterbox; Karan's are typed out in a dialogue box with his face.
     A tap (or Space / Enter) shows a line whole, a second tap moves on; otherwise each is held for its reading time. Game
     time, so a pause holds a line. */
  cine: {
    on: false, token: 0, hurry: null, bound: false,
    bind() {
      if (this.bound) return; this.bound = true;
      $('#cine').addEventListener('pointerdown', () => { if (this.hurry) this.hurry(); });
      window.addEventListener('keydown', (e) => { if (this.on && (e.code === 'Space' || e.code === 'Enter')) { e.preventDefault(); if (this.hurry) this.hurry(); } });
    },
    start() { this.bind(); this.on = true; this.clear(); $('#cine').classList.add('on'); ui.hud.hide(); },
    end() { this.cancel(); this.on = false; $('#cine').classList.remove('on'); },
    cancel() { this.token++; this.hurry = null; this.clear(); },
    clear() { $('#cine-dialog').classList.remove('show', 'done'); $('#cine-narration').classList.remove('show'); },
    /** Karan's face: the portrait sheet once that art exists (mood = its frame: 0 worried · 1 surprised · 2 determined),
     *  until then his idle frame cropped to head and shoulders. */
    portrait(mood = 0) {
      if (assets.def('karan_portrait') && !assets.isPlaceholder('karan_portrait')) return frameUrl('karan_portrait', mood);
      if (this._face !== undefined) return this._face;
      this._face = '';
      try {
        const def = assets.frames('hero_front'), img = assets.get('hero_front'), a = def.anims.idle || { row: 0, col: 0 };
        const fw = Math.round(def.frameW), fh = Math.round(def.frameH), c = document.createElement('canvas'); c.width = fw; c.height = fh;
        const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, (a.col ?? 0) * fw, (a.row ?? 0) * fh, fw, fh, 0, 0, fw, fh);
        const d = g.getImageData(0, 0, fw, fh).data; let x0 = fw, x1 = -1, y0 = fh;
        for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) if (d[(y * fw + x) * 4 + 3] > 60) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; }
        if (x1 < 0) return this._face;
        const sz = Math.round((x1 - x0) * 0.8), cx = (x0 + x1) / 2, o = document.createElement('canvas'); o.width = o.height = 160;
        o.getContext('2d').drawImage(c, cx - sz / 2, y0 - sz * 0.05, sz, sz, 0, 0, 160, 160);
        this._face = o.toDataURL('image/png');
      } catch (e) { console.warn('[portrait]', e); }
      return this._face;
    },
    /** who: 'narrator' | 'karan'. Resolves when the line has been read (or tapped on), or at once if cancelled. */
    async say(who, text, { mood = 0 } = {}) {
      const my = ++this.token, karan = who === 'karan', box = karan ? $('#cine-dialog') : $('#cine-narration'), el = karan ? $('#cine-line') : box;
      this.clear();
      if (karan) { const src = this.portrait(mood), im = $('#cine-portrait'); if (src) im.src = src; im.style.visibility = src ? '' : 'hidden'; }
      el.textContent = karan ? '' : text; void box.offsetWidth; box.classList.add('show'); audio.play(karan ? 'ui.panel' : 'cine.narration');
      if (karan) {
        let full = false; this.hurry = () => { full = true; };
        for (let i = 1; i <= text.length && !full; i++) {
          el.textContent = text.slice(0, i);
          if (i % 2 === 0 && /\w/.test(text[i - 1])) audio.play('voice.karan', { minGap: 0.035 });
          await delay(0.03); if (my !== this.token) return;
        }
        el.textContent = text; box.classList.add('done');
      }
      let go = false; this.hurry = () => { go = true; };
      const hold = Math.min(5.4, Math.max(2.4, 1.3 + text.length * 0.045));
      for (let t = 0; t < hold && !go; t += 0.05) { await delay(0.05); if (my !== this.token) return; }
      this.hurry = null; box.classList.remove('show', 'done');
      await delay(0.3);
    },
  },
  /** The time to answer (user 2026-10-28): a thin bar at the top centre of the screen, draining toward its middle, labelled
   *  with an hourglass and the seconds left (LXD 2026-10-29: the plain bar said nothing). set(f, left): f of the time left
   *  (1 → 0) and the seconds; amber in its last third, red and breathing in its last 15 s. */
  timer: {
    /** A new question: the bar opens from its middle to full, `after` s from now (the last shot's numbers line first fades
     *  out where the bar runs: they ran into each other, user 2026-10-28). */
    start(after = 0, total = 90) { const el = $('#answer-timer'); this.f = null; this.secs = total; $('#answer-secs').textContent = String(total); el.style.setProperty('--timer-after', `${after}s`); el.classList.remove('intro'); void el.offsetWidth; el.classList.add('intro'); },
    set(f, left) {
      const el = $('#answer-timer'), s = Math.max(0, Math.ceil(left - 1e-6));
      if (s !== this.secs) { this.secs = s; $('#answer-secs').textContent = String(s); }
      if (this.f === f && el.classList.contains('on')) return; this.f = f;
      el.classList.add('on'); el.querySelector('.at-bar > i').style.transform = `scaleX(${f.toFixed(4)})`;
      el.classList.toggle('low', f < 1 / 3); el.classList.toggle('last', f < 15 / 90);
    },
    hide() { this.f = null; $('#answer-timer').classList.remove('on', 'low', 'last', 'intro'); },
  },

  /* ---------------------------------------------------------- map: painted isometric miniature of the real chain */
  map: {
    selected: null, saveData: null, art: null, raf: 0, busy: false, first: false,
    bindOnce() {
      const cv = $('#map-canvas'), art = this.art;
      const locked = (id) => !(this.saveData.cleared[id] || id <= this.saveData.unlocked);
      const tipFor = (id) => { const b = art.anchor(id, true); const tip = $('#map-tip'); tip.textContent = `Clear Arena ${this.saveData.unlocked} first`; tip.style.transform = `translate(-50%, 0) translate(${b.x}px, ${b.y}px)`; tip.classList.add('show'); clearTimeout(this._tipT); this._tipT = setTimeout(() => tip.classList.remove('show'), 1600); };
      cv.addEventListener('pointermove', (e) => {
        const id = art.hit(e.clientX, e.clientY); if (id !== art.hover && id > 0 && locked(id) && e.pointerType === 'mouse') { art.shake(id); tipFor(id); }
        art.hover = id; cv.classList.toggle('hovering', id > 0 && !locked(id));
      });
      cv.addEventListener('pointerleave', () => { art.hover = -1; cv.classList.remove('hovering'); });
      cv.addEventListener('click', (e) => {
        if (this.busy) return; const id = art.hit(e.clientX, e.clientY); if (id < 0) { this.closeSettings(); return; }
        if (locked(id)) { audio.play('ui.error'); art.shake(id); tipFor(id); return; }
        audio.play('ui.click'); this.select(id);
      });
      $('#btn-map-settings').addEventListener('click', (e) => { e.stopPropagation(); $('#map-settings').classList.toggle('open'); this.syncSettings(); });
      $('#ms-sound').addEventListener('click', () => { audio.toggleMute(); this.syncSettings(); });
      $('#ms-howto').addEventListener('click', () => { this.closeSettings(); ui.howto.show(); });
      $('#ms-reset').addEventListener('click', () => {
        const b = $('#ms-reset'); if (this.busy) return;   // (not during the unlock walk: it would strand the map waiting for it)
        if (!b.classList.contains('confirm')) { b.classList.add('confirm'); b.textContent = 'Tap again to reset'; return; }
        save.reset(); this.saveData = save.load(); this.closeSettings(); this.refresh(); this.art.placeHero(1); this.select(1, true);
      });
    },
    syncSettings() { $('#ms-sound').textContent = `Sound: ${audio.muted ? 'off' : 'on'}`; const b = $('#ms-reset'); b.classList.remove('confirm'); b.textContent = 'Reset progress'; },
    closeSettings() { $('#map-settings').classList.remove('open'); this.syncSettings(); },   // (a half-confirmed reset never waits behind a closed menu)
    frontier() { return Math.min(CHAIN.arenas.length, this.saveData.unlocked); },
    refresh() {
      const sd = this.saveData, art = this.art; art.save = sd; art.frontier = this.frontier(); art.build();
    },
    async show({ saveData }) {
      ui.hideAll(); ui.show('map'); this.saveData = saveData;
      setTimeout(() => { if ($('#screen-map').classList.contains('active')) game.world.sleeping = true; }, 500);   // once the map has faded in, the hidden 3D view stops rendering
      if (!this.art) { this.art = new MapArt($('#map-canvas')); this.bindOnce(); }
      try { await document.fonts.load('800 32px "Barlow Condensed"'); } catch {}
      $('#map-tag').style.backgroundImage = `url(${imgUrl('ui_parchment')})`;
      this.refresh();
      // where Karan was when the map was last seen; an older save (no record) starts on the frontier, no replay of every unlock
      const frontier = this.frontier(), seen = saveData.mapUnlockSeen == null ? frontier : Math.max(1, Math.min(frontier, saveData.mapUnlockSeen));
      this.art.placeHero(seen); this.selected = frontier; this.art.selected = frontier;
      this._onResize = () => this.art.build(); window.addEventListener('resize', this._onResize);
      let last = performance.now();
      const loop = (now) => { this.raf = requestAnimationFrame(loop); this.art.frame(Math.max(0, Math.min(0.05, (now - last) / 1000))); last = now; this.place(); };   // rAF stamps can precede the start time
      cancelAnimationFrame(this.raf); this.raf = requestAnimationFrame(loop);
      // the unlock moment, then Karan walks the glowing path to the new ring (LXD). Back stays live meanwhile: a tap skips
      // to the end and leaves (no control on screen is ever dead while an animation plays)
      let left = false; const leaveEarly = () => { left = true; this.art.skipAnimations(); };
      if (frontier > seen) {
        this.busy = true; $('#map-tag').classList.remove('show'); $('#btn-map-back').addEventListener('click', leaveEarly);
        audio.play('gate.unlock'); await this.art.playUnlock(frontier);   // one unlock moment, for the newest ring (rings opened on the way are simply open)
        if (!left) await this.art.walkTo(frontier);
        $('#btn-map-back').removeEventListener('click', leaveEarly);
        saveData.mapUnlockSeen = frontier; save.write(); this.busy = false;
        if (left) { this.art.skipAnimations(); this.closeSettings(); return null; }
      } else if (saveData.mapUnlockSeen !== frontier) { saveData.mapUnlockSeen = frontier; save.write(); }
      this.first = !saveData.mapHintSeen && !saveData.cleared[1];
      this.select(frontier, true);
      return new Promise((res) => {
        const enter = () => { if (this.busy) return; cleanup(); if (this.first) { saveData.mapHintSeen = true; save.write(); } audio.play('ui.confirm'); res(this.selected); };
        const back = () => { cleanup(); res(null); };
        const cleanup = () => { $('#btn-enter').removeEventListener('click', enter); $('#btn-map-back').removeEventListener('click', back); this.closeSettings(); };
        $('#btn-enter').addEventListener('click', enter); $('#btn-map-back').addEventListener('click', back);
      });
    },
    select(id, silent = false) {
      const a = CHAIN.arenas[id - 1], L = a.level, sd = this.saveData; this.selected = id; if (this.art) this.art.selected = id;
      $('#mp-num').textContent = L.id; $('#mp-name').textContent = L.name;
      $('#mp-stars').innerHTML = starsHtml(sd.stars[L.id] || 0);
      $('#mp-best').textContent = sd.cleared[L.id] && sd.best[L.id] ? `Best score ${sd.best[L.id]}` : '';   // a cleared ring shows its best run
      $('#btn-enter').textContent = sd.cleared[L.id] ? 'Replay ▶' : 'Enter ▶';
      if (!silent && this.art) this.art.walkTo(id);
      const tag = $('#map-tag'); tag.classList.remove('show'); void tag.offsetWidth; tag.classList.add('show');
    },
    /** Keep the tag beside the selected ring where it covers the fewest other badges/rings (the whole chain stays
     *  visible, LXD); phones dock it at the bottom. The first-visit arrow sits on the tag. */
    place() {
      if (!this.art || !this.art.ready) return;
      const tag = $('#map-tag'), arrow = $('#map-arrow'), rb = this.art.ringBox(this.selected); if (!rb) return;
      const w = tag.offsetWidth, h = tag.offsetHeight, vw = window.innerWidth, vh = window.innerHeight, gap = 16;
      let best = null;
      if (this.art.portrait) best = { x: (vw - w) / 2, y: vh - h - 14, side: 'dock' };
      else {
        const others = CHAIN.arenas.filter((a) => a.level.id !== this.selected).map((a) => this.art.ringBox(a.level.id));
        const cands = [
          { side: 'above', x: rb.bx - w / 2, y: rb.by - rb.br - h - gap },
          { side: 'left', x: rb.cx - rb.rx - w - gap, y: rb.cy - h / 2 },
          { side: 'right', x: rb.cx + rb.rx + gap, y: rb.cy - h / 2 },
          { side: 'aboveLeft', x: rb.cx - rb.rx * 0.7 - w, y: rb.by - h - gap },
          { side: 'aboveRight', x: rb.cx + rb.rx * 0.7, y: rb.by - h - gap },
          { side: 'below', x: rb.cx - w / 2, y: rb.cy + rb.ry + gap },
        ];
        cands.forEach((c, i) => {
          const inR = (x, y, m = 8) => x > c.x - m && x < c.x + w + m && y > c.y - m && y < c.y + h + m;
          let cost = i * 0.6;
          if (c.x < 8 || c.y < 66 || c.x + w > vw - 8 || c.y + h > vh - 8) cost += 1000;
          for (const o of others) { if (inR(o.bx, o.by, o.br + 4)) cost += 12; if (inR(o.cx, o.cy, 0)) cost += 4; }
          if (inR(rb.cx, rb.cy, 0) || inR(rb.bx, rb.by, rb.br)) cost += 30;
          if (!best || cost < best.cost) best = { ...c, cost };
        });
      }
      const x = Math.max(8, Math.min(vw - w - 8, best.x)), y = Math.max(66, Math.min(vh - h - 8, best.y));
      tag.style.transform = `translate(${x}px, ${y}px)`;
      tag.dataset.side = best.side;
      if (best.side === 'above' || best.side === 'aboveLeft' || best.side === 'aboveRight') tag.style.setProperty('--tip-x', `${Math.max(16, Math.min(w - 16, rb.bx - x))}px`);
      if (best.side === 'below') tag.style.setProperty('--tip-x', `${Math.max(16, Math.min(w - 16, rb.cx - x))}px`);
      if (best.side === 'left' || best.side === 'right') tag.style.setProperty('--tip-y', `${Math.max(16, Math.min(h - 16, rb.cy - y))}px`);
      const showArrow = this.first && !this.busy && this.selected === 1;
      arrow.classList.toggle('show', showArrow);
      if (showArrow) arrow.style.transform = `translate(-50%, 0) translate(${x + w / 2}px, ${y - 58}px)`;
    },
    hide() { game.world.sleeping = false; ui.hide('map'); cancelAnimationFrame(this.raf); if (this._onResize) window.removeEventListener('resize', this._onResize); $('#map-tag').classList.remove('show'); $('#map-arrow').classList.remove('show'); this.closeSettings(); },
  },

  /* ---------------------------------------------------------- results (final), game over, pause */
  results: {
    async show({ perArena, sessionTotal }) {
      ui.hud.hide(); ui.show('results'); $('#screen-results').classList.add('dim');
      const rows = $('#res-rows'); rows.innerHTML = ''; $('#res-total').textContent = '0';
      // praise for no mistakes (LXD 2026-10-29): each arena cleared without one is marked; a run without one is praised
      const praise = $('#res-praise'), flawless = perArena.length > 0 && perArena.every((r) => r.flawless);
      const n = perArena.length, where = n === 1 ? 'the arena' : n === 2 ? 'both arenas' : `all ${n} arenas`;
      praise.innerHTML = flawless ? `${ICONS.check}<span>Not a single mistake in ${where}. Outstanding work!</span>` : ''; praise.classList.remove('show');
      const btn = $('#btn-next'); btn.style.visibility = 'hidden';
      await sleep(400);
      for (const r of perArena) { const tr = document.createElement('tr'); tr.innerHTML = `<td>Arena ${r.id} · ${r.name}<span class="st">${'★'.repeat(r.stars)}${'☆'.repeat(3 - r.stars)}</span>${r.flawless ? '<span class="res-flawless">No mistakes</span>' : ''}</td><td>+${r.score}</td>`; tr.style.opacity = 0; rows.appendChild(tr); await sleep(60); tr.style.transition = 'opacity .3s'; tr.style.opacity = 1; audio.play('ui.count'); await sleep(220); }
      if (flawless) { praise.classList.add('show'); audio.play('praise'); }
      const t0 = performance.now(), dur = 800; await new Promise((res) => { const tick = (t) => { const k = Math.min(1, (t - t0) / dur); $('#res-total').textContent = Math.round(sessionTotal * k); if (k < 1) { if (Math.random() < 0.5) audio.play('ui.count', { minGap: 0.05 }); requestAnimationFrame(tick); } else res(); }; requestAnimationFrame(tick); });
      btn.style.visibility = 'visible';
      await once(btn, 'click'); ui.hide('results');
    },
  },
  gameover: { async show() { ui.hud.hide(); ui.panel.close(); ui.show('gameover'); $('#screen-gameover').classList.add('dim'); const c = await waitClick({ '#btn-retry': 'retry', '#btn-go-map': 'map' }); ui.hide('gameover'); return c; } },
  pause: { async show() { ui.show('pause'); $('#screen-pause').classList.add('dim'); const c = await waitClick({ '#btn-resume': 'resume', '#btn-pause-map': 'map' }); ui.hide('pause'); return c; }, hide() { ui.hide('pause'); } },

  /* ---------------------------------------------------------- HUD */
  hud: {
    show() { $('#hud').classList.add('show'); }, hide() { $('#hud').classList.remove('show'); },
    setShields(n, max = 3) {
      const box = $('#hud-shields'); const prev = box.children.length;
      if (prev !== max) { box.innerHTML = ''; for (let i = 0; i < max; i++) box.appendChild(document.createElement('img')); }
      [...box.children].forEach((im, i) => { const full = i < n; const was = im.dataset.full === '1'; im.src = frameUrl('ui_shield', full ? 0 : 1); im.dataset.full = full ? '1' : '0'; if (was && !full) { im.classList.remove('lost'); void im.offsetWidth; im.classList.add('lost'); } });
    },
    /** Each arena starts with 3 shields: show the refill so it is not confusing (LXD). */
    async refillShields(from, to = 3) {
      this.setShields(from, to); await sleep(500);
      const box = $('#hud-shields'); audio.play('ui.star');   // the shields pop back in one by one (no label needed)
      for (let i = from; i < to; i++) { const im = box.children[i]; im.src = frameUrl('ui_shield', 0); im.dataset.full = '1'; im.classList.remove('refill'); void im.offsetWidth; im.classList.add('refill'); await sleep(180); }
    },
  },
  /** kind: 'under' (TOO SMALL) · 'over' (TOO BIG) · 'perfect' · 'timeup': its colour and its icon (H3: never colour alone). */
  stamp(kind, title, sub = '', duration = 1.7) {
    const el = $('#stamp'), ico = OUTCOME_ICON[kind];
    el.className = kind; el.innerHTML = `<span class="st-title">${ico ? `<span class="st-ico">${ico}</span>` : ''}${title}</span>${sub ? `<small>${sub}</small>` : ''}`; void el.offsetWidth; el.classList.add('show'); audio.play('ui.stamp');
    clearTimeout(timers.stamp); return new Promise((res) => { timers.stamp = setTimeout(() => { el.classList.remove('show'); setTimeout(res, 200); }, duration * 1000); });
  },
  damage() { const el = $('#damage'); el.classList.remove('hit'); void el.offsetWidth; el.classList.add('hit'); },
  skip: { show(cb) { const el = $('#skip'); el.classList.add('show'); el.onclick = () => { el.classList.remove('show'); cb(); }; }, hide() { const el = $('#skip'); el.classList.remove('show'); el.onclick = null; } },

  /* ---------------------------------------------------------- answer dock (LXD: answer bar + compact keypad only) */
  panel: {
    cfg: null, locked: false, keyEls: {}, typed: false,
    init() {
      // stone keys, calculator layout: digit block, a right column (red delete · fraction bar · decimal point), wide 0, wide ✓ = FIRE.
      // Answers may be decimals (up to 3 places) or fractions such as 77/2; π is not on the keypad (LXD).
      const ICON = {
        del: '<svg viewBox="0 0 44 30" aria-hidden="true"><path d="M14 3 H40 Q42 3 42 5 V25 Q42 27 40 27 H14 L3 15 Z" fill="#fff6ec" stroke="#3a0f0a" stroke-width="2.6" stroke-linejoin="round"/><path d="M21 10 L31 20 M31 10 L21 20" stroke="#d2402f" stroke-width="3.6" stroke-linecap="round"/></svg>',
        ok: '<svg viewBox="0 0 44 34" aria-hidden="true"><path d="M7 18 L17 27 L37 6" fill="none" stroke="#0d3a24" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/><path d="M7 18 L17 27 L37 6" fill="none" stroke="#fbfff8" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      };
      const keys = [['7'], ['8'], ['9'], ['⌫', 'del'], ['4'], ['5'], ['6'], ['/', 'sym'], ['1'], ['2'], ['3'], ['.', 'sym'], ['0', 'zero'], ['✓', 'ok']];
      const pad = $('#keypad'); pad.innerHTML = ''; this.keyEls = {};
      for (const [k, kind] of keys) {
        const b = document.createElement('button'); b.className = `silent k${kind ? ' k-' + kind : ''}`; b.dataset.k = k;
        b.innerHTML = `<span class="k-face"><span class="k-glyph">${ICON[kind] || k}</span></span>`;
        if (kind === 'ok') { b.setAttribute('aria-label', 'Fire the charge'); b.addEventListener('click', () => this.fire()); }
        else if (kind === 'del') {
          b.setAttribute('aria-label', 'Delete (hold to clear)'); let t = null, held = false;
          b.addEventListener('pointerdown', () => { held = false; clearTimeout(t); t = setTimeout(() => { held = true; this.key('C'); }, 550); });
          for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) b.addEventListener(ev, () => clearTimeout(t));
          b.addEventListener('click', () => { if (!held) this.key('⌫'); held = false; });
        } else { if (k === '/') b.setAttribute('aria-label', 'Fraction bar'); b.addEventListener('click', () => this.key(k)); }
        b.addEventListener('mousedown', (e) => e.preventDefault());   // (keep the focus in the answer field: Enter fires, not the last key)
        pad.appendChild(b); this.keyEls[k] = b;
      }
      const inp = $('#answer');
      inp.addEventListener('input', () => { if (this.locked) { inp.value = ''; return; } inp.value = this.clean(inp.value); this.changed(); audio.play('ui.type', { minGap: 0.03 }); });
      inp.addEventListener('keydown', (e) => {
        const map = { Backspace: '⌫', Delete: '⌫', Enter: '✓' }, el = this.keyEls[map[e.key] || e.key];
        if (el) { el.classList.add('press'); setTimeout(() => el.classList.remove('press'), 120); }   // typing lights the stone key too
        if (e.key === 'Enter') { e.preventDefault(); this.fire(); }
      });
      const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
      if (coarse) { inp.setAttribute('inputmode', 'none'); inp.setAttribute('readonly', ''); }
    },
    /** digits, one fraction bar, one decimal point per number, at most 3 decimal places */
    clean(v) {
      const parts = String(v).replace(/[^0-9./]/g, '').split('/').slice(0, 2);
      return parts.map((p) => { const i = p.indexOf('.'); return i < 0 ? p : p.slice(0, i + 1) + p.slice(i + 1).replace(/\./g, '').slice(0, 3); }).join('/').slice(0, 12);
    },
    key(k) {
      if (this.locked) return;   // (during the shot and the lesson: the entry would only be wiped on unlock)
      const inp = $('#answer');
      if (k === '⌫') inp.value = inp.value.slice(0, -1);
      else if (k === 'C') inp.value = '';
      else { const next = this.clean(inp.value + k); if (next === inp.value) { audio.play('ui.error', { minGap: 0.1 }); return; } inp.value = next; }
      audio.play('ui.type', { minGap: 0.02 }); this.changed();
    },
    /** the student started a new answer: the old mistake line goes (LXD); the hint stays, it is for this try */
    changed() { this.refresh(); if (!this.typed && $('#answer').value.length) { this.typed = true; this.clearMistake(); this.cfg && this.cfg.onType && this.cfg.onType(); } },
    refresh() { $('#answer-dock').classList.toggle('ready', $('#answer').value.trim().length > 0 && !this.locked); },
    open(cfg) {
      this.cfg = cfg; this.locked = false; this.typed = false;
      // arenas 1–4 (LXD 2026-10-27): the answer is chosen, no keypad; 5–7: typed, a number of π (the π fixed beside the field)
      const picking = !!(cfg.level && cfg.level.ask); $('#answer-dock').classList.toggle('pick-mode', picking);
      if (picking) ui.pick.build(cfg.level, (choice) => { if (this.locked) return; audio.play('ui.confirm'); this.cfg.onFire && this.cfg.onFire(choice); });
      const pi = !!cfg.piForm; $('#answer-dock').classList.toggle('pi-form', pi);
      $('#answer').placeholder = pi ? '?' : 'Area'; $('#answer-sr').textContent = pi ? 'Area in square metres, as a number of π' : 'Area in square metres';
      $('#answer-dock').classList.add('open'); $('#answer-dock').classList.remove('locked', 'solving'); audio.play('ui.panel');
      $('#answer').value = ''; this.setTip(''); this.refresh();
      if (!$('#answer').hasAttribute('readonly')) setTimeout(() => $('#answer').focus({ preventScroll: true }), 350);
    },
    close() { $('#answer-dock').classList.remove('open', 'ready', 'solving'); $('#answer').blur(); this.setTip(''); },
    /** The feedback under the formula (LXD 2026-10-29, H2: at least 16 px, ⚠ for a mistake, 💡 for a hint): the mistake
     *  (with an optional note, a line after it) and the hint ladder's current rung. Either may be empty. */
    setFeedback({ mistake = '', note = '', hint = '' } = {}) {
      const box = $('#feedback'), m = box.querySelector('.fb-mistake'), h = box.querySelector('.fb-hint'), mt = m.querySelector('.fb-text');
      mt.textContent = mistake; if (note) { const s = document.createElement('span'); s.className = 'fb-note'; s.textContent = note; mt.appendChild(s); }
      h.querySelector('.fb-text').textContent = hint;
      m.classList.toggle('show', !!mistake); h.classList.toggle('show', !!hint); box.classList.toggle('show', !!(mistake || hint));
    },
    clearMistake() { const box = $('#feedback'); box.querySelector('.fb-mistake').classList.remove('show'); box.classList.toggle('show', box.querySelector('.fb-hint').classList.contains('show')); },
    setTip(text) { this.setFeedback({ mistake: text || '' }); },
    lock() { this.locked = true; $('#answer-dock').classList.add('locked'); $('#answer-dock').classList.remove('ready'); },
    unlock() { this.locked = false; this.typed = false; $('#answer-dock').classList.remove('locked'); $('#answer').value = ''; this.refresh(); if (!$('#answer').hasAttribute('readonly')) setTimeout(() => $('#answer').focus({ preventScroll: true }), 50); },
    setValue(v) { $('#answer').value = String(v); this.refresh(); },
    fire() { if (this.locked || !this.cfg) return; const v = $('#answer').value.trim(); if (!v) { audio.play('ui.error'); return; } audio.play('ui.confirm'); this.cfg.onFire && this.cfg.onFire(v); },
    /** tests / DEV: answer with the wanted outcome ('correct' · 'under' · 'over'), chosen or typed */
    answer(kind = 'correct') {
      if (!this.cfg || this.locked) return false;
      const L = this.cfg.level; if (L && L.ask) return ui.pick.answer(kind);
      const k = sectorCoef(L.radius, L.theta);
      this.setValue(kind === 'correct' ? answerFor(L) : formatNumber(Math.max(1, Math.round(k * (kind === 'under' ? 0.5 : 1.6))))); this.fire(); return true;
    },
  },

  /* ---------------------------------------------------------- arenas 1–4 (LXD 2026-10-27): the answer is chosen
     mcq: three substituted formulas, a tap answers. pick: the formula with two drop-downs (the angle, or the fraction
     θ/360, and the radius) and FIRE once both are set. LXD 2026-10-29: nothing is struck out after a wrong shot. Every
     option stays open and the order is shuffled each time the question is shown (and again after each miss), so the
     learner thinks again instead of taking what is left; a half-right drop-down answer keeps its right part. No option
     looks chosen before it is touched: hover only for a real pointer that has moved, the press on a tap. Answers
     { expr, sel }. */
  pick: {
    L: null, sel: {}, onChoose: null, menuSlot: null, order: null,
    build(L, onChoose) {
      this.L = L; this.onChoose = onChoose; this.sel = {};
      const ask = L.ask, box = $('#pick'), idx = (list) => (list ? shuffled(list.map((_, i) => i)) : null); this.closeMenu();
      this.order = { opt: idx(ask.options), a: idx(ask.a), r: idx(ask.r) };
      if (ask.kind === 'mcq') {
        box.innerHTML = `<p class="pk-q">Which one gives the area of the sector?</p><div class="pk-opts">${this.order.opt.map((i) => `<button class="pk-opt silent" data-i="${i}"><span class="pk-x">${exprHtml(ask.options[i])}</span></button>`).join('')}</div>`;
        box.querySelectorAll('.pk-opt').forEach((b) => b.addEventListener('click', () => this.choose({ opt: +b.dataset.i })));
      } else {
        const chip = (slot) => `<button class="pk-chip silent" data-slot="${slot}" aria-haspopup="listbox" aria-label="${slot === 'r' ? 'the radius' : ask.form === 'theta' ? 'the angle' : 'the fraction of the circle'}">?</button>`;
        const first = ask.form === 'theta' ? `(<span class="frac"><span>${chip('a')}</span><span>360</span></span>)` : chip('a');
        box.innerHTML = `<p class="pk-q">Complete the formula</p><div class="pk-formula">A = ${first} × π × (${chip('r')})<sup>2</sup></div><div class="pk-menu" role="listbox" hidden></div><button class="pk-fire btn primary silent" disabled>Fire ✓</button>`;
        box.querySelectorAll('.pk-chip').forEach((c) => c.addEventListener('click', (e) => { e.stopPropagation(); if (ui.panel.locked) return; if (this.menuSlot === c.dataset.slot) this.closeMenu(); else this.openMenu(c); }));
        box.querySelector('.pk-fire').addEventListener('click', () => { if (this.ready()) this.choose({ a: this.sel.a, r: this.sel.r }); });
        if (!this._outside) { this._outside = true; document.addEventListener('pointerdown', (e) => { if (this.menuSlot && !e.target.closest('.pk-menu, .pk-chip')) this.closeMenu(); }); }
        requestAnimationFrame(() => this.fit());
      }
      this.disarm();
    },
    /** Hover highlights wait for the pointer to really move over the choices: an option that appears under a resting
     *  cursor, or under the finger that has just chosen, must not look selected (H1). */
    disarm() {
      const box = $('#pick'); box.classList.remove('armed');
      if (!this._arm) this._arm = () => box.classList.add('armed');
      box.removeEventListener('pointermove', this._arm); box.addEventListener('pointermove', this._arm, { once: true });
    },
    /** the question is back after a miss: a new order (A2), the formulas sliding to their new places */
    reshuffle() {
      const list = $('#pick .pk-opts');
      if (list) {
        const btns = [...list.children], top = new Map(btns.map((b) => [b, b.getBoundingClientRect().top])), was = btns.map((b) => b.dataset.i).join();
        let order = shuffled(btns); while (btns.length > 1 && order.map((b) => b.dataset.i).join() === was) order = shuffled(btns);
        order.forEach((b) => list.appendChild(b));
        order.forEach((b) => { const dy = top.get(b) - b.getBoundingClientRect().top; if (Math.abs(dy) > 1 && b.animate) b.animate([{ transform: `translateY(${dy}px)` }, { transform: 'none' }], { duration: 420, easing: 'cubic-bezier(0.2, 0.9, 0.3, 1)' }); });
      }
      for (const slot of ['a', 'r']) if (this.order[slot]) this.order[slot] = shuffled(this.order[slot]);
      this.disarm();
    },
    /** the formula stays on one line inside the dock: it scales down when a chosen value makes it longer (10.5 m) */
    fit() {
      const f = $('#pick .pk-formula'); if (!f) return;
      f.style.fontSize = ''; let fs = parseFloat(getComputedStyle(f).fontSize);
      while (f.scrollWidth > f.clientWidth && fs > 13) { fs -= 1; f.style.fontSize = fs + 'px'; }
    },
    label(slot, v) { if (slot === 'r') return `${formatNumber(v)} m`; return this.L.ask.form === 'theta' ? `${v}°` : `<span class="frac"><span>${v[0]}</span><span>${v[1]}</span></span>`; },
    /** the drop-down: below its chip, or above it when the dock sits at the bottom of the screen (phones); its options in
     *  this question's shuffled order, all of them open */
    openMenu(chip) {
      const slot = chip.dataset.slot, opts = this.L.ask[slot], menu = $('#pick .pk-menu'), dock = $('#answer-dock');
      menu.innerHTML = this.order[slot].map((i) => `<button class="silent${this.sel[slot] === i ? ' on' : ''}" role="option" data-i="${i}">${this.label(slot, opts[i])}</button>`).join('');
      menu.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { this.set(slot, +b.dataset.i); this.closeMenu(); }));
      menu.hidden = false; this.menuSlot = slot; chip.classList.add('open'); audio.play('ui.click');
      const d = dock.getBoundingClientRect(), c = chip.getBoundingClientRect(), below = window.innerHeight - c.bottom > menu.offsetHeight + 14, half = menu.offsetWidth / 2;
      menu.style.left = `${Math.max(half + 8, Math.min(d.width - half - 8, c.left - d.left + c.width / 2))}px`;   // under its chip, inside the dock
      menu.style.top = `${below ? c.bottom - d.top + 8 : c.top - d.top - menu.offsetHeight - 8}px`;
    },
    closeMenu() { const menu = $('#pick .pk-menu'); if (menu) menu.hidden = true; document.querySelectorAll('.pk-chip.open').forEach((c) => c.classList.remove('open')); this.menuSlot = null; },
    set(slot, i) {
      this.sel[slot] = i; const chip = $(`#pick .pk-chip[data-slot="${slot}"]`); chip.innerHTML = this.label(slot, this.L.ask[slot][i]); chip.classList.add('set'); chip.classList.remove('again');
      $('#pick .pk-fire').disabled = !this.ready(); this.fit(); audio.play('ui.type'); if (ui.panel.cfg && ui.panel.cfg.onType) ui.panel.cfg.onType();
    },
    ready() { return this.sel.a != null && this.sel.r != null; },
    choose(sel) {
      if (ui.panel.locked) return;
      const c = choices(this.L).find((x) => (sel.opt != null ? x.sel.opt === sel.opt : x.sel.a === sel.a && x.sel.r === sel.r)); if (!c) return;
      if (sel.opt != null) $(`#pick .pk-opt[data-i="${sel.opt}"]`).classList.add('chosen');
      this.closeMenu(); this.onChoose({ expr: c.expr, sel });
    },
    /** after a wrong shot (LXD 2026-10-29: nothing is struck out): the chosen formula lets go; a drop-down answer's wrong
     *  part empties again, marked to look at again, and its right part stays set */
    afterMiss(sel) {
      if (sel.opt != null) { const b = $(`#pick .pk-opt[data-i="${sel.opt}"]`); if (b) b.classList.remove('chosen'); return; }
      const truth = pickTruth(this.L);
      for (const slot of ['a', 'r']) if (sel[slot] !== truth[slot]) {
        this.sel[slot] = null;
        const chip = $(`#pick .pk-chip[data-slot="${slot}"]`); chip.innerHTML = '?'; chip.classList.remove('set'); chip.classList.add('again');
      }
      $('#pick .pk-fire').disabled = !this.ready(); this.fit();
    },
    /** the hint ladder's last rung: the right choice is shown, then worked out and fired */
    reveal(sel) {
      this.closeMenu(); $('#answer-dock').classList.add('solving');
      if (sel.opt != null) { const b = $(`#pick .pk-opt[data-i="${sel.opt}"]`); if (b) b.classList.add('solution'); return; }
      for (const slot of ['a', 'r']) {
        this.sel[slot] = sel[slot]; const chip = $(`#pick .pk-chip[data-slot="${slot}"]`);
        chip.innerHTML = this.label(slot, this.L.ask[slot][sel[slot]]); chip.classList.remove('again'); chip.classList.add('set', 'solution');
      }
      $('#pick .pk-fire').disabled = true; this.fit();
    },
    /** tests / DEV: a choice with the wanted outcome (the diagram's own values for 'correct') */
    answer(kind) {
      const all = choices(this.L), c = (kind === 'correct' && all.find((x) => x.right)) || all.find((x) => !x.right && evaluatePick(x.expr, this.L.radius, this.L.theta).status === kind) || all[0];
      return this.choosePick(c.sel);
    },
    /** tests / DEV: exactly this choice ({ opt } or { a, r }) */
    choosePick(sel) { if (sel.opt == null) { this.set('a', sel.a); this.set('r', sel.r); } this.choose(sel); return true; },
  },

  /** Centre of the arena area (left of the dock) for stamps: set by the puzzle camera, cleared afterwards. */
  setArenaCentre(x, y) { const st = document.documentElement.style; if (x == null) { st.removeProperty('--arena-cx'); st.removeProperty('--arena-cy'); } else { st.setProperty('--arena-cx', `${Math.round(x)}px`); st.setProperty('--arena-cy', `${Math.round(y)}px`); } },

  /* ---------------------------------------------------------- the formula above the keypad (user, 2026-10-22)
     A = θ/360 × π × r² from the start. It carries the hint ladder (LXD 2026-10-29): after the 1st miss it points at the
     part the idea is about, no numbers (point); after the 2nd it works part of itself out, the fraction of the turn or
     r × r (partial); after the 3rd the full working: substituted (θ, r), what cancels crossed out with the small result
     beside it (θ/360 → n/d), simplified (r × r → r²), then the answer A = n/d × r²π = kπ (full).
     (Without piForm, unused since 2026-10-27: π = 22/7 is substituted and the 7 cancels against one r.) */
  formula: {
    p: null, cur: [], piForm: false,
    row() { return $('#formula .row'); },
    V(text, note = null) { return `<span class="v">${text}${note == null ? '' : `<i class="note">${note}</i>`}</span>`; },
    F(num, den) { return `<span class="frac"><span class="num">${num}</span><span class="den">${den}</span></span>`; },
    /** [key, html] tokens for a stage; equal html = the token stays put, anything else dissolves out and in */
    tokens(stage) {
      const p = this.p, V = (t, n) => this.V(t, n), F = (a, b) => this.F(a, b), X = (k) => [k, '×'];
      const f0 = F(V('θ'), V('360')), f1 = F(V(p.theta, p.n), V('360', p.d)), pi1 = F(V('22'), V('7', '1')), r2 = `${V('r')}<sup>2</sup>`;
      // part of the working (the ladder's 2nd rung): the fraction of the turn, or r × r; the rest still in letters
      if (stage === 'theta') return [['A', 'A ='], ['f', f1], X('x1'), ['pi', V('π')], X('x2'), ['r', r2]];
      if (stage === 'radius') return [['A', 'A ='], ['f', f0], X('x1'), ['pi', V('π')], X('x2'), ['r1', V(p.rText)], X('x3'), ['r2', V(p.rText)]];
      if (this.piForm) switch (stage) {
        case 'formula': return [['A', 'A ='], ['f', f0], X('x1'), ['pi', V('π')], X('x2'), ['r', r2]];
        case 'sub': return [['A', 'A ='], ['f', f1], X('x1'), ['pi', V('π')], X('x2'), ['r1', V(p.rText)], X('x3'), ['r2', V(p.rText)]];
        case 'reduced': return [['A', 'A ='], ['f', F(V(p.n), V(p.d))], X('x1'), ['pi', V('π')], X('x2'), ['rr', V(p.r2Text)]];
        case 'solved': return [['A', 'A ='], ['f', F(V(p.n), V(p.d))], X('x1'), ['P', `${V(p.r2Text)}${V('π')}`], ['eq', '='], ['ans', `${p.cd === 1 ? V(p.cn) : F(V(p.cn), V(p.cd))}${V('π')}`]];
      }
      switch (stage) {
        case 'formula': return [['A', 'A ='], ['f', f0], X('x1'), ['pi', V('π')], X('x2'), ['r', r2]];
        case 'sub': return [['A', 'A ='], ['f', f1], X('x1'), ['pi', pi1], X('x2'), ['r1', V(p.rText, p.kText)], X('x3'), ['r2', V(p.rText)]];
        case 'reduced': return [['A', 'A ='], ['f', F(V(p.n), V(p.d))], X('x1'), ['pi', V('22')], X('x2'), ...(p.k === 1 ? [] : [['r1', V(p.kText)], X('x3')]), ['r2', V(p.rText)]];
        case 'solved': return [['A', 'A ='], ['f', F(V(p.n), V(p.d))], X('x1'), ['P', V(p.PText)], ['eq', '='], ['ans', p.ad === 1 ? V(p.an) : F(V(p.an), V(p.ad))]];
      }
      return [];
    },
    render(tokens, changed = new Set(), stagger = 0) {
      let n = 0;
      this.row().innerHTML = tokens.map(([k, h]) => { const c = changed.has(k), d = c && stagger ? ` style="animation-delay:${(n++ * stagger).toFixed(2)}s"` : ''; return `<span class="tok${c ? ' in key' : ''}" data-k="${k}"${d}>${h}</span>`; }).join('');
      this.cur = tokens; this.fit();
    },
    /** keep the line inside the dock (long radii such as 10.5 × 10.5), beside the π = 22/7 note while it is there */
    fit() {
      const box = $('#formula'), row = this.row(); if (!box || !row) return;
      const given = box.querySelector('.given'), room = box.clientWidth - 14 - (given ? given.offsetWidth + parseFloat(getComputedStyle(box).columnGap || 0) : 0);
      row.style.fontSize = ''; let fs = parseFloat(getComputedStyle(row).fontSize);
      while (row.scrollWidth > room && fs > 12) { fs -= 1; row.style.fontSize = fs + 'px'; }
    },
    /** the formula, and beside it the value of π every answer uses (user, 2026-10-23); none in arenas 1–3, where π stays π */
    show(r, theta, { piForm = false } = {}) {
      this.p = formulaParts(r, theta); this.piForm = piForm;
      $('#formula').innerHTML = `<div class="row"></div>${piForm ? '' : `<div class="given">π = ${this.F('22', '7')}</div>`}`; this.render(this.tokens('formula'));
    },
    hide() { $('#formula').innerHTML = ''; this.cur = []; },
    /** tokens that change glow, dissolve, and the new ones dissolve in (staggered left to right) */
    async morph(tokens, { glow = true, stagger = 0.16 } = {}) {
      const row = this.row(); if (!row) return;
      const old = new Map(this.cur), changed = new Set(tokens.filter(([k, h]) => old.get(k) !== h).map(([k]) => k));
      const leaving = [...row.children].filter((n) => changed.has(n.dataset.k) || !tokens.some(([k]) => k === n.dataset.k));
      // π = 22/7 leaves with the π it explains: once π is replaced by 22/7 the formula itself shows the value (and the
      // longer worked line gets the whole width)
      const given = changed.has('pi') ? $('#formula .given') : null; if (given) leaving.push(given);
      if (glow && leaving.length) { leaving.forEach((n) => n.classList.add('glow')); await sleep(420); }
      leaving.forEach((n) => n.classList.add('out')); audio.play('scan.ping'); await sleep(430);
      if (given) given.remove();
      this.render(tokens, changed, stagger); await sleep(560 + Math.max(0, changed.size - 1) * stagger * 1000);
    },
    /** cross out what cancels, pair by pair, writing the result small beside each crossed number */
    async cancel() {
      const row = this.row(); if (!row) return;
      const q = (sel) => row.querySelector(sel), pairs = [[q('[data-k="f"] .num .v'), q('[data-k="f"] .den .v')]];
      if (!this.piForm) pairs.push([q('[data-k="pi"] .den .v'), q('[data-k="r1"] .v')]);   // (in terms of π nothing cancels against 22/7)
      for (const pair of pairs) {
        for (const v of pair) { if (!v) continue; v.classList.add('struck'); audio.play('ui.type'); await sleep(230); }
        await sleep(120); for (const v of pair) { const n = v && v.querySelector('.note'); if (n) n.classList.add('show'); }
        audio.play('label.pop'); await sleep(620);
      }
      await sleep(350);
    },
    /** The ladder's 1st rung: the part of the formula its idea is about glows (key: 'f' the fraction, 'pi', 'r' the r², or
     *  a list of them; null: none). */
    point(key) {
      const row = this.row(); if (!row) return;
      row.querySelectorAll('.tok.point').forEach((n) => n.classList.remove('point'));
      const ts = [].concat(key || []).map((k) => row.querySelector(`.tok[data-k="${k}"]`)).filter(Boolean);
      ts.forEach((t) => t.classList.add('point')); if (ts.length) audio.play('label.pop');
    },
    /** The 2nd rung: part of the working, in place: 'theta' the fraction of the turn, 'radius' r × r */
    async partial(kind) { if (!this.p) return; this.point(null); await this.morph(this.tokens(kind === 'radius' ? 'radius' : 'theta')); },
    /** substitute → cross out → simplify */
    async walkthrough() { if (!this.p) return; await this.morph(this.tokens('sub')); await sleep(250); await this.cancel(); await this.morph(this.tokens('reduced'), { glow: false }); },
    /** the answer, as a fraction of π */
    async solve() { if (!this.p) return; await this.morph(this.tokens('solved')); },
    /** The last rung, typed arenas: the full working, through to the answer */
    async full() { if (!this.p) return; this.point(null); await this.walkthrough(); await sleep(450); await this.solve(); },
    /** Arenas 1–4 (LXD 2026-10-27): the chosen formula worked out step by step, right or wrong, before it is fired: as
     *  chosen → a decimal radius as a fraction → the fraction reduced and the power worked out → A = kπ m² (never a
     *  decimal). The answer stays on the line, in amber, while the shot plays. */
    async solveExpr(e) {
      const V = (t) => this.V(t), F = (a, b) => this.F(a, b), q = (x) => (x.d === 1 ? V(x.n) : F(V(x.n), V(x.d)));
      const sq = (html, pow) => (pow === 2 ? `(${html})<sup>2</sup>` : html);
      const line = (st) => {
        if (st.k) return [['A', 'A ='], ['ans', st.k.d === 1 ? V(`${st.k.n}π`) : F(V(`${st.k.n}π`), V(st.k.d))], ['unit', 'm²']];
        const f = st.f.q ? q(st.f.q) : `(${F(V(st.f.n), V(st.f.d))})${st.f.pow === 2 ? '<sup>2</sup>' : ''}`;   // as the LXD writes it: (90/360), (90/360)²
        const r = st.r.text != null ? sq(V(st.r.text), st.r.pow) : st.r.pow ? sq(q(st.r.q), st.r.pow) : q(st.r.q);
        return [['A', 'A ='], ['f', f], ['x1', '×'], ['pi', V('π')], ['x2', '×'], ['r', r]];
      };
      const steps = solveSteps(e), first = line(steps[0]);
      $('#formula').innerHTML = '<div class="row"></div>'; this.cur = [];
      this.render(first, new Set(first.map(([k]) => k)), 0.07); audio.play('scan.ping'); await sleep(1250);
      for (const st of steps.slice(1)) { await this.morph(line(st)); await sleep(st.k ? 900 : 450); }
    },
  },
  /** One line near the beam after a shot (LXD), in the game's language, with its outcome's icon (H3). */
  beamline: {
    show(text, status, worldPos, push) {
      const el = document.createElement('span'); el.textContent = text;   // (the line is plain text; the icon is ours)
      game.world.labels.add('beamline', `${OUTCOME_ICON[status] ? `<span class="bl-ico">${OUTCOME_ICON[status]}</span>` : ''}${el.innerHTML}`, { className: `beamline ${status}`, worldPos, push, clampTop: window.innerWidth < 760 ? 64 : 16 });   // below the shields on phones
    },
    hide(fade = true) { game.world.labels.remove('beamline', fade); },
    get shown() { return !!game.world.labels.get('beamline'); },
  },
};
