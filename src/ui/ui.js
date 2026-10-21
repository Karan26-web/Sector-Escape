// ---------------------------------------------------------------------------
// DOM UI: screens, HUD, cannon panel, banners/stamps/captions, overview, toast
// ---------------------------------------------------------------------------
import * as THREE from '../../vendor/three.module.js';
import { assets } from '../engine/assets.js';
import { audio } from '../engine/audio.js';
import { FORMULA_HTML, substituted, hintSteps, PI, CHAIN } from '../game/levels.js';
import { MapArt } from './mapArt.js';

const $ = (sel) => document.querySelector(sel);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const frameCache = new Map();

export function imgUrl(name) {
  const img = assets.get(name); if (!img) return '';
  if (img instanceof HTMLCanvasElement) { if (!img.__dataUrl) img.__dataUrl = img.toDataURL('image/png'); return img.__dataUrl; }
  return img.src;
}
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
const starsHtml = (n, max = 3) => [...Array(max)].map((_, i) => `<img src="${frameUrl('ui_icons', i < n ? 1 : 2)}" alt="">`).join('');

export const ui = {
  init(g) {
    game = g;
    document.body.addEventListener('pointerenter', (e) => { if (e.target instanceof HTMLButtonElement && (e.target.classList.contains('big') || e.target.classList.contains('fire'))) audio.play('ui.hover', { minGap: 0.25 }); }, true);
    document.body.addEventListener('click', (e) => { if (e.target instanceof HTMLButtonElement && !e.target.classList.contains('silent')) audio.play('ui.click'); }, true);
    $('#btn-mute').addEventListener('click', () => this.hud.setMuted(audio.toggleMute()));
    $('#btn-pause-mute').addEventListener('click', () => this.hud.setMuted(audio.toggleMute()));
    $('#btn-pause').addEventListener('click', () => game.togglePause());
    window.addEventListener('keydown', (e) => { if (e.code === 'KeyM' && !(e.target instanceof HTMLInputElement)) this.hud.setMuted(audio.toggleMute()); if (e.code === 'Escape') game.togglePause(); });
    this.panel.init();
    this.hud.setMuted(audio.muted);
    const logo = imgUrl('ui_logo'); $('#loading-logo').src = logo; $('#title-logo').src = logo;
  },
  applyArt() { $('#title-logo').src = imgUrl('ui_logo'); $('.parchment').style.backgroundImage = `url(${imgUrl('ui_parchment')})`; $('#story-art').src = imgUrl('ui_story_art'); this.hud.setMuted(audio.muted); },

  /* ---------------------------------------------------------- screens */
  show(id) { const el = $('#screen-' + id); if (el) el.classList.add('active'); },
  hide(id) { const el = $('#screen-' + id); if (el) el.classList.remove('active'); },
  hideAll() { document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active')); },
  loading: { progress(p, text) { $('#progress-fill').style.width = Math.round(p * 100) + '%'; if (text) $('#loading-text').textContent = `Loading ${text}…`; } },
  title: {
    async show(hasSave) { $('#btn-continue').style.display = hasSave ? '' : 'none'; ui.hideAll(); ui.show('title'); const c = await waitClick({ '#btn-play': 'play', '#btn-continue': 'continue', '#btn-howto': 'howto' }); return c; },
    hide() { ui.hide('title'); },
  },
  howto: { async show() { ui.show('howto'); $('#screen-howto').classList.add('dim'); await once($('#btn-howto-close'), 'click'); ui.hide('howto'); } },
  story: {
    async show() {
      ui.hideAll(); ui.show('story');
      const text = 'Karan is trapped in the Lost Jungle! A maze of overlapping stone rings seals every path. Break each sector, cross each open arc and reach the lost temple!';
      const p = $('#story-text'); p.textContent = ''; const btn = $('#btn-start-journey'); btn.style.visibility = 'hidden';
      let done = false; const finish = () => { done = true; p.textContent = text; btn.style.visibility = 'visible'; };
      $('#screen-story').addEventListener('click', (e) => { if (e.target !== btn && !done) finish(); }, { once: true });
      for (let i = 0; i < text.length && !done; i++) { p.textContent = text.slice(0, i + 1); if (i % 2 === 0) audio.play('ui.type', { minGap: 0.02 }); await sleep(26); }
      finish();
      await once(btn, 'click'); audio.play('ui.confirm'); ui.hide('story');
    },
  },

  /* ---------------------------------------------------------- map: painted isometric miniature of the real chain */
  map: {
    selected: null, saveData: null, art: null, raf: 0,
    async show({ saveData, selectedId }) {
      ui.hideAll(); ui.show('map'); this.saveData = saveData;
      const first = Math.max(1, Math.min(CHAIN.arenas.length, selectedId || 1));
      this.selected = saveData.cleared[first] || first <= saveData.unlocked ? first : saveData.unlocked;
      const cv = $('#map-canvas');
      if (!this.art) {
        this.art = new MapArt(cv);
        cv.addEventListener('pointermove', (e) => { const id = this.art.hit(e.clientX, e.clientY); this.art.hover = id; cv.classList.toggle('hovering', id > 0); });
        cv.addEventListener('pointerleave', () => { this.art.hover = -1; cv.classList.remove('hovering'); });
        cv.addEventListener('click', (e) => {
          const id = this.art.hit(e.clientX, e.clientY); if (id < 0) return;
          if (!(this.saveData.cleared[id] || id <= this.saveData.unlocked)) { audio.play('ui.error'); return; }
          audio.play('ui.click'); this.select(id);
        });
      }
      try { await document.fonts.load('800 32px "Barlow Condensed"'); } catch {}
      this.art.save = saveData; this.art.build(); this.select(this.selected, true);
      this._onResize = () => { this.art.build(); }; window.addEventListener('resize', this._onResize);
      let last = performance.now();
      const loop = (now) => { this.raf = requestAnimationFrame(loop); this.art.frame(Math.min(0.05, (now - last) / 1000)); last = now; };
      cancelAnimationFrame(this.raf); this.raf = requestAnimationFrame(loop);
      return new Promise((res) => {
        const enter = () => { cleanup(); audio.play('ui.confirm'); res(this.selected); };
        const back = () => { cleanup(); res(null); };
        const cleanup = () => { $('#btn-enter').removeEventListener('click', enter); $('#btn-map-back').removeEventListener('click', back); };
        $('#btn-enter').addEventListener('click', enter); $('#btn-map-back').addEventListener('click', back);
      });
    },
    select(id, silent = false) {
      const a = CHAIN.arenas[id - 1], L = a.level, sd = this.saveData; this.selected = id; if (this.art) this.art.selected = id;
      $('#mp-num').textContent = L.id; $('#mp-name').textContent = L.name; $('#mp-tag').textContent = L.tagline;
      $('#mp-r').textContent = `${a.R} m`; $('#mp-t').textContent = `${a.theta}°`; $('#mp-g').textContent = L.speed;
      $('#mp-stars').innerHTML = starsHtml(sd.stars[L.id] || 0);
      $('#mp-best').textContent = sd.best[L.id] ? `Best score ${sd.best[L.id]}` : (sd.cleared[L.id] ? '' : 'Not cleared yet');
      $('#btn-enter').textContent = sd.cleared[L.id] ? 'Replay arena' : (L.id === 1 ? 'Enter the jungle' : 'Enter arena');
      const d = $('#mp-diagram'), cx = 100, cy = 104, rr = 74, a0 = (90 - a.theta / 2) * Math.PI / 180, a1 = (90 + a.theta / 2) * Math.PI / 180;
      d.innerHTML = `<circle cx="${cx}" cy="${cy}" r="${rr}" class="d-ring"/>
        <path d="M ${cx} ${cy} L ${cx + rr * Math.cos(a0)} ${cy - rr * Math.sin(a0)} A ${rr} ${rr} 0 ${a.theta > 180 ? 1 : 0} 0 ${cx + rr * Math.cos(a1)} ${cy - rr * Math.sin(a1)} Z" class="d-sector"/>
        <line x1="${cx}" y1="${cy}" x2="${cx + rr * Math.cos(a0)}" y2="${cy - rr * Math.sin(a0)}" class="d-radius"/>
        <circle cx="${cx}" cy="${cy}" r="4" class="d-hub"/>
        <text x="${cx}" y="${cy - 26}" class="d-theta">θ = ${a.theta}°</text>
        <text x="${cx + rr * 0.55 * Math.cos(a0) + 14}" y="${cy - rr * 0.55 * Math.sin(a0) + 14}" class="d-r">r = ${a.R}</text>`;
      if (!silent) { $('#map-panel').classList.remove('flash'); void $('#map-panel').offsetWidth; $('#map-panel').classList.add('flash'); }
    },
    hide() { ui.hide('map'); cancelAnimationFrame(this.raf); if (this._onResize) window.removeEventListener('resize', this._onResize); },
  },

  /* ---------------------------------------------------------- results (final), game over, pause */
  results: {
    async show({ perArena, sessionTotal, total, stars }) {
      ui.hud.hide(); ui.show('results'); $('#screen-results').classList.add('dim');
      const rows = $('#res-rows'); rows.innerHTML = ''; $('#res-total').textContent = '0'; $('#res-stars').innerHTML = '';
      const btn = $('#btn-next'); btn.style.visibility = 'hidden';
      await sleep(400);
      for (const r of perArena) { const tr = document.createElement('tr'); tr.innerHTML = `<td>Arena ${r.id} · ${r.name}<span class="st">${'★'.repeat(r.stars)}${'☆'.repeat(3 - r.stars)}</span></td><td>+${r.score}</td>`; tr.style.opacity = 0; rows.appendChild(tr); await sleep(60); tr.style.transition = 'opacity .3s'; tr.style.opacity = 1; audio.play('ui.count'); await sleep(220); }
      const t0 = performance.now(), dur = 800; await new Promise((res) => { const tick = (t) => { const k = Math.min(1, (t - t0) / dur); $('#res-total').textContent = Math.round(sessionTotal * k); if (k < 1) { if (Math.random() < 0.5) audio.play('ui.count', { minGap: 0.05 }); requestAnimationFrame(tick); } else res(); }; requestAnimationFrame(tick); });
      $('#res-stars').innerHTML = `<span style="font-family:var(--font-head);font-weight:800;font-size:28px;letter-spacing:.04em;color:var(--amber)">★ ${stars} / ${CHAIN.arenas.length * 3} · lifetime ${total}</span>`; audio.play('ui.star');
      btn.style.visibility = 'visible';
      await once(btn, 'click'); ui.hide('results');
    },
  },
  gameover: { async show() { ui.hud.hide(); ui.panel.close(); ui.show('gameover'); $('#screen-gameover').classList.add('dim'); const c = await waitClick({ '#btn-retry': 'retry', '#btn-go-map': 'map' }); ui.hide('gameover'); return c; } },
  pause: { async show() { ui.show('pause'); $('#screen-pause').classList.add('dim'); const c = await waitClick({ '#btn-resume': 'resume', '#btn-pause-map': 'map' }); ui.hide('pause'); return c; }, hide() { ui.hide('pause'); } },

  /* ---------------------------------------------------------- HUD */
  hud: {
    show() { $('#hud').classList.add('show'); }, hide() { $('#hud').classList.remove('show'); this.setThreat(0, false); ui.objective(null); },
    setArena(level, arena, index = 0) {
      $('#hud-num').textContent = level.id; $('#hud-title').textContent = level.name;
      $('#hud-dots').innerHTML = CHAIN.arenas.map((a, i) => `<i class="${i < index ? 'done' : i === index ? 'now' : ''}"></i>`).join('');
    },
    setShields(n, max = 3) {
      const box = $('#hud-shields'); const prev = box.children.length;
      if (prev !== max) { box.innerHTML = ''; for (let i = 0; i < max; i++) box.appendChild(document.createElement('img')); }
      [...box.children].forEach((im, i) => { const full = i < n; const was = im.dataset.full === '1'; im.src = frameUrl('ui_shield', full ? 0 : 1); im.dataset.full = full ? '1' : '0'; if (was && !full) { im.classList.remove('lost'); void im.offsetWidth; im.classList.add('lost'); } });
    },
    setScore() {},
    setThreat(v, show = true) { const t = $('#threat'); t.classList.toggle('show', show); $('#threat-fill').style.width = Math.round(v * 100) + '%'; t.classList.toggle('hot', v > 0.75); },
    setMuted(m) { $('#btn-mute').style.backgroundImage = `url(${frameUrl('ui_icons', animIndex('ui_icons', m ? 'sound_off' : 'sound_on'))})`; $('#btn-pause').style.backgroundImage = `url(${frameUrl('ui_icons', animIndex('ui_icons', 'pause'))})`; },
  },
  objective(text) { const el = $('#objective'); if (!text) { el.classList.remove('show'); return; } el.textContent = text; el.classList.add('show'); },
  banner(text, style = 'info', duration = 2.2) {
    const el = $('#banner'); el.className = style; el.textContent = text; void el.offsetWidth; el.classList.add('show');
    clearTimeout(timers.banner); return new Promise((res) => { timers.banner = setTimeout(() => { el.classList.remove('show'); res(); }, duration * 1000); });
  },
  caption(text, duration = 3.5) {
    const el = $('#caption'); el.textContent = text; el.classList.add('show'); clearTimeout(timers.caption);
    if (duration > 0) timers.caption = setTimeout(() => el.classList.remove('show'), duration * 1000);
  },
  stamp(kind, title, sub = '', duration = 1.7) {
    const el = $('#stamp'); el.className = kind; el.innerHTML = `${title}${sub ? `<small>${sub}</small>` : ''}`; void el.offsetWidth; el.classList.add('show'); audio.play('ui.stamp');
    clearTimeout(timers.stamp); return new Promise((res) => { timers.stamp = setTimeout(() => { el.classList.remove('show'); setTimeout(res, 200); }, duration * 1000); });
  },
  toast({ title, stars, points }, duration = 4) {
    const el = $('#toast'); el.querySelector('.t-title').textContent = title; el.querySelector('.t-stars').innerHTML = starsHtml(stars); el.querySelector('.t-points').textContent = `+${points} points`;
    el.classList.add('show'); audio.play('ui.star'); clearTimeout(timers.toast); timers.toast = setTimeout(() => el.classList.remove('show'), duration * 1000);
  },
  damage() { const el = $('#damage'); el.classList.remove('hit'); void el.offsetWidth; el.classList.add('hit'); },
  skip: { show(cb) { const el = $('#skip'); el.classList.add('show'); el.onclick = () => { el.classList.remove('show'); cb(); }; }, hide() { const el = $('#skip'); el.classList.remove('show'); el.onclick = null; } },

  /* ---------------------------------------------------------- cannon panel */
  panel: {
    cfg: null, hintLevel: 0, locked: false,
    init() {
      // stone keypad: digits, a column of maths keys (π / .), red delete (hold = clear), green ✓ = FIRE
      const ICON = {
        del: '<svg viewBox="0 0 44 30" aria-hidden="true"><path d="M14 3 H40 Q42 3 42 5 V25 Q42 27 40 27 H14 L3 15 Z" fill="#fff6ec" stroke="#3a0f0a" stroke-width="2.6" stroke-linejoin="round"/><path d="M21 10 L31 20 M31 10 L21 20" stroke="#d2402f" stroke-width="3.6" stroke-linecap="round"/></svg>',
        ok: '<svg viewBox="0 0 44 34" aria-hidden="true"><path d="M7 18 L17 27 L37 6" fill="none" stroke="#0d3a24" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/><path d="M7 18 L17 27 L37 6" fill="none" stroke="#fbfff8" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      };
      const keys = [['7'], ['8'], ['9'], ['π', 'sym'], ['4'], ['5'], ['6'], ['/', 'sym'], ['1'], ['2'], ['3'], ['.', 'sym'], ['⌫', 'del'], ['0'], ['✓', 'ok']];
      const pad = $('#keypad'); pad.innerHTML = ''; this.keyEls = {};
      for (const [k, kind] of keys) {
        const b = document.createElement('button'); b.className = `silent k${kind ? ' k-' + kind : ''}`; b.dataset.k = k;
        b.innerHTML = `<span class="k-face"><span class="k-glyph">${ICON[kind] || k}</span></span>`;
        if (kind === 'ok') { b.setAttribute('aria-label', 'Fire the cannon'); b.addEventListener('click', () => this.fire()); }
        else if (kind === 'del') {
          b.setAttribute('aria-label', 'Delete (hold to clear)'); let t = null, held = false;
          b.addEventListener('pointerdown', () => { held = false; clearTimeout(t); t = setTimeout(() => { held = true; this.key('C'); }, 550); });
          for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) b.addEventListener(ev, () => clearTimeout(t));
          b.addEventListener('click', () => { if (!held) this.key('⌫'); held = false; });
        } else b.addEventListener('click', () => this.key(k));
        pad.appendChild(b); this.keyEls[k] = b;
      }
      const inp = $('#answer');
      inp.addEventListener('input', () => { inp.value = inp.value.replace(/[^0-9./πpiPI*() ]/g, ''); this.refresh(); audio.play('ui.type', { minGap: 0.03 }); });
      inp.addEventListener('keydown', (e) => {
        const map = { Backspace: '⌫', Delete: '⌫', Enter: '✓', p: 'π', P: 'π' }, el = this.keyEls[map[e.key] || e.key];
        if (el) { el.classList.add('press'); setTimeout(() => el.classList.remove('press'), 120); }   // typing lights the stone key too
        if (e.key === 'Enter') { e.preventDefault(); this.fire(); }
      });
      $('#btn-fire').addEventListener('click', () => this.fire());
      $('#btn-hint').addEventListener('click', () => this.hint());
      const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
      // the stone keypad is the primary input on every device (new storage key, so an old "hidden" choice doesn't hide it)
      let pref = null; try { pref = localStorage.getItem('se_keypad2'); } catch {}
      $('#cannon-panel').classList.toggle('show-keypad', pref === null ? true : pref === '1');
      if (coarse) { $('#answer').setAttribute('inputmode', 'none'); $('#answer').setAttribute('readonly', ''); }
      $('#btn-keypad').addEventListener('click', () => { const on = $('#cannon-panel').classList.toggle('show-keypad'); try { localStorage.setItem('se_keypad2', on ? '1' : '0'); } catch {} });
    },
    key(k) {
      const inp = $('#answer'); audio.play('ui.type', { minGap: 0.02 });
      if (k === '⌫') inp.value = inp.value.slice(0, -1); else if (k === 'C') inp.value = ''; else if (inp.value.length < 10) inp.value += k;
      this.refresh();
    },
    refresh() { const on = $('#answer').value.trim().length > 0 && !this.locked; $('#btn-fire').classList.toggle('ready', on); $('#numpad').classList.toggle('ready', on); },
    open(cfg) {
      this.cfg = cfg; this.hintLevel = cfg.hintLevel ?? 0; this.locked = false;
      $('#cannon-panel').classList.add('open'); $('#cannon-panel').classList.remove('locked'); audio.play('ui.panel');
      $('#values').innerHTML = `<li>r = <b>${cfg.r} m</b></li><li class="theta">θ = <b>${cfg.theta}°</b></li><li>π = <b>${PI.label}</b> <span class="muted-small">or type …π</span></li>`;
      $('#answer').value = ''; $('#btn-fire').disabled = false; this.setFeedback(null); this.setAttempts(cfg.attempts > 1 ? `Attempt ${cfg.attempts}` : '');
      this.renderFormula(); this.refresh();
      if (!$('#answer').hasAttribute('readonly')) setTimeout(() => $('#answer').focus({ preventScroll: true }), 350);
    },
    close() { $('#cannon-panel').classList.remove('open'); $('#answer').blur(); },
    effectiveLevel() { const s = this.cfg?.scaffold; return Math.max(this.hintLevel, s === 'full' ? 2 : s === 'formula' ? 1 : 0); },
    renderFormula() {
      const lvl = this.effectiveLevel(), box = $('#formula-box'), c = this.cfg; if (!c) return;
      if (lvl === 0) box.innerHTML = `<span class="hidden-f">Formula hidden — press 💡 Hint if you need it</span>`;
      else box.innerHTML = `<div>${FORMULA_HTML}</div>${lvl >= 2 ? `<div class="sub">${substituted(c.r, c.theta)}</div>` : ''}`;
      if (lvl >= 3) { const steps = hintSteps(c.r, c.theta); this.setFeedback({ type: 'hint', title: 'Step by step', html: `<ol>${steps.slice(0, 3).map((s) => `<li><b>${s.label}:</b> ${s.text}</li>`).join('')}<li><b>${steps[3].label}:</b> ${steps[3].text}</li></ol>` }); }
      else { const e = $('#feedback'); e.className = 'feedback'; e.innerHTML = ''; }
      $('#btn-hint').style.visibility = lvl >= 3 ? 'hidden' : 'visible';
    },
    hint() { if (!this.cfg) return; this.hintLevel = Math.min(3, this.effectiveLevel() + 1); this.cfg.onHint && this.cfg.onHint(this.hintLevel); this.renderFormula(); audio.play('ui.confirm'); },
    setFeedback(fb) {
      if (!fb) { for (const id of ['#feedback', '#diagnosis']) { const e = $(id); e.className = 'feedback'; e.innerHTML = ''; } return; }
      const el = $(fb.type === 'bad' ? '#diagnosis' : '#feedback');
      el.className = 'feedback show ' + (fb.type || ''); el.innerHTML = `<h4>${fb.title}</h4>${fb.html || ''}`;
      setTimeout(() => { try { el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch {} }, 420);
    },
    setAttempts(t) { $('#attempts').textContent = t; },
    lock() { this.locked = true; $('#cannon-panel').classList.add('locked'); $('#btn-fire').disabled = true; $('#btn-fire').classList.remove('ready'); $('#numpad').classList.remove('ready'); },
    unlock() { this.locked = false; $('#cannon-panel').classList.remove('locked'); $('#btn-fire').disabled = false; $('#answer').value = ''; this.refresh(); if (!$('#answer').hasAttribute('readonly')) setTimeout(() => $('#answer').focus({ preventScroll: true }), 50); },
    setValue(v) { $('#answer').value = String(v); this.refresh(); },
    fire() { if (this.locked || !this.cfg) return; const v = $('#answer').value.trim(); if (!v) { audio.play('ui.error'); $('#answer').focus(); return; } audio.play('ui.confirm'); this.cfg.onFire && this.cfg.onFire(v); },
  },
};
