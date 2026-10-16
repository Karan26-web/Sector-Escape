// ---------------------------------------------------------------------------
// DOM UI: screens, HUD, cannon panel, banners/stamps/captions, map
// ---------------------------------------------------------------------------
import { assets } from '../engine/assets.js';
import { audio } from '../engine/audio.js';
import { FORMULA_HTML, substituted, hintSteps, PI } from '../game/levels.js';

const $ = (sel) => document.querySelector(sel);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const frameCache = new Map();

/** URL (file or data) for an image asset. */
export function imgUrl(name) {
  const img = assets.get(name); if (!img) return '';
  if (img instanceof HTMLCanvasElement) { if (!img.__dataUrl) img.__dataUrl = img.toDataURL('image/png'); return img.__dataUrl; }
  return img.src;
}
/** Crop one cell of a sheet → data URL. */
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
let timers = {};
function once(el, ev) { return new Promise((res) => el.addEventListener(ev, res, { once: true })); }
function waitClick(map) {
  // map: { 'selector': value } → resolves with value of first clicked
  return new Promise((res) => {
    const handlers = [];
    for (const [sel, val] of Object.entries(map)) { const el = $(sel); if (!el) continue; const h = () => { handlers.forEach(([e, f]) => e.removeEventListener('click', f)); res(val); }; el.addEventListener('click', h); handlers.push([el, h]); }
  });
}

export const ui = {
  init(g) {
    game = g;
    // global button sfx
    document.body.addEventListener('pointerenter', (e) => { if (e.target instanceof HTMLButtonElement) audio.play('ui.hover'); }, true);
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
      const text = 'Karan is trapped in the Lost Jungle! Ancient circular traps seal every path. Break the sector rings, defeat the guardians and reach the lost temple!';
      const p = $('#story-text'); p.textContent = ''; const btn = $('#btn-start-journey'); btn.style.visibility = 'hidden';
      let done = false; const finish = () => { done = true; p.textContent = text; btn.style.visibility = 'visible'; };
      $('#screen-story').addEventListener('click', (e) => { if (e.target !== btn && !done) finish(); }, { once: true });
      for (let i = 0; i < text.length && !done; i++) { p.textContent = text.slice(0, i + 1); if (i % 2 === 0) audio.play('ui.type', { minGap: 0.02 }); await sleep(26); }
      finish();
      await once(btn, 'click'); audio.play('ui.confirm'); ui.hide('story');
    },
  },

  /* ---------------------------------------------------------- map */
  map: {
    points: [], pathEl: null, selected: null,
    show({ levels, saveData, currentId }) {
      ui.hideAll(); ui.show('map'); this.levels = levels; this.saveData = saveData;
      const svg = $('#map-svg'); svg.innerHTML = '';
      const W = 1920, H = 1080, NS = 'http://www.w3.org/2000/svg';
      const mk = (tag, attrs = {}, parent = svg) => { const el = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v); parent.appendChild(el); return el; };
      mk('image', { href: imgUrl('ui_map_bg'), width: W, height: H, preserveAspectRatio: 'xMidYMid slice' });
      const start = { x: 0.07 * W, y: 0.86 * H }, dest = { x: 0.95 * W, y: 0.9 * H };
      this.points = [start, ...levels.map((l) => ({ x: l.mapNode.x * W, y: l.mapNode.y * H })), dest];
      const d = catmull(this.points);
      mk('path', { d, fill: 'none', stroke: '#15111a', 'stroke-width': 13, 'stroke-dasharray': '24 18', 'stroke-linecap': 'round' });
      mk('path', { d, fill: 'none', stroke: 'rgba(255,255,255,.85)', 'stroke-width': 6, 'stroke-dasharray': '24 18', 'stroke-linecap': 'round' });
      const clearedCount = levels.filter((l) => saveData.cleared[l.id]).length;
      if (clearedCount > 0) mk('path', { d: catmull(this.points.slice(0, clearedCount + 1)), fill: 'none', stroke: '#f5c518', 'stroke-width': 6, 'stroke-dasharray': '24 18', 'stroke-linecap': 'round' });
      this.pathEl = mk('path', { d, fill: 'none', stroke: 'none' });
      mk('text', { x: start.x, y: start.y - 48, class: 'map-label', 'text-anchor': 'middle' }).textContent = 'START';
      mk('image', { href: imgUrl('ui_map_temple'), x: dest.x - 90, y: dest.y - 150, width: 180, height: 180 });
      mk('text', { x: dest.x, y: dest.y + 60, class: 'map-label', 'text-anchor': 'middle' }).textContent = 'DESTINATION';
      // nodes
      const unlocked = saveData.unlocked;
      this.nodes = {};
      levels.forEach((l, i) => {
        const p = this.points[i + 1], s = 74 + (l.radius - 14) * 2.2;
        const state = saveData.cleared[l.id] ? 'cleared' : l.id <= unlocked ? (l.boss ? 'boss' : 'open') : 'locked';
        const g = mk('g', { class: 'node ' + (state === 'locked' ? 'locked' : ''), transform: `translate(${p.x} ${p.y})` });
        mk('image', { href: frameUrl('ui_map_node', animIndex('ui_map_node', state)), x: -s / 2, y: -s / 2, width: s, height: s, class: 'ring' }, g);
        mk('text', { y: 14 }, g).textContent = l.id;
        if (state !== 'locked') mk('text', { y: s / 2 + 28, class: 'name' }, g).textContent = l.name;
        g.addEventListener('click', () => { if (state === 'locked') { g.classList.remove('shake'); void g.getBBox(); g.classList.add('shake'); audio.play('ui.error'); return; } this.select(l, saveData); });
        this.nodes[l.id] = g;
      });
      // marker at the furthest unlocked (or current)
      const cur = levels.find((l) => l.id === (currentId ?? unlocked)) || levels[0];
      const mp = this.points[levels.indexOf(cur) + 1];
      this.marker = mk('image', { href: imgUrl('ui_map_marker'), width: 84, height: 84, x: mp.x - 42, y: mp.y - 100 });
      this.select(cur, saveData);
      return new Promise((res) => {
        const enter = () => { $('#btn-map-back').removeEventListener('click', back); audio.play('ui.confirm'); res(this.selected.id); };
        const back = () => { $('#btn-enter').removeEventListener('click', enter); res(null); };
        $('#btn-enter').addEventListener('click', enter, { once: true }); $('#btn-map-back').addEventListener('click', back, { once: true });
      });
    },
    select(l, saveData) {
      this.selected = l; Object.values(this.nodes).forEach((g) => g.classList.remove('selected')); this.nodes[l.id].classList.add('selected');
      $('#mc-num').textContent = l.id; $('#mc-name').textContent = l.name; $('#mc-tag').textContent = l.tagline;
      const stars = saveData.stars[l.id] || 0; $('#mc-stars').innerHTML = [0, 1, 2].map((i) => `<img src="${frameUrl('ui_icons', i < stars ? 1 : 2)}" alt="">`).join('');
      $('#mc-best').textContent = saveData.best[l.id] ? `Best score: ${saveData.best[l.id]}` : (l.boss ? 'Final arena · 3 sector shields' : `Radius ${l.radius} m · ${l.waves.length} wave${l.waves.length > 1 ? 's' : ''}`);
      $('#map-card').classList.add('show');
    },
    /** Walk the marker from level a to level b (ids; 0 = start). */
    async travel(fromId, toId) {
      const pts = this.points, i0 = fromId, i1 = toId; // points[0]=start, points[k]=level k
      const full = this.pathEl, L = full.getTotalLength();
      const lenAt = (p) => { let best = 0, bd = 1e9; for (let s = 0; s <= L; s += L / 600) { const q = full.getPointAtLength(s); const d = (q.x - p.x) ** 2 + (q.y - p.y) ** 2; if (d < bd) { bd = d; best = s; } } return best; };
      const s0 = lenAt(pts[i0]), s1 = lenAt(pts[i1]);
      const dur = 2200, t0 = performance.now(); let lastStep = 0;
      await new Promise((res) => { const tick = (t) => { const k = Math.min(1, (t - t0) / dur), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; const q = full.getPointAtLength(s0 + (s1 - s0) * e); const bob = Math.abs(Math.sin(k * Math.PI * 6)) * 10; this.marker.setAttribute('x', q.x - 42); this.marker.setAttribute('y', q.y - 100 - bob); if (t - lastStep > 300) { lastStep = t; audio.play('step.grass'); } if (k < 1) requestAnimationFrame(tick); else res(); }; requestAnimationFrame(tick); });
      audio.play('ui.confirm');
      const lvl = this.levels[toId - 1]; if (lvl && this.saveData) this.select(lvl, this.saveData);
    },
    hide() { ui.hide('map'); },
  },

  /* ---------------------------------------------------------- results & misc screens */
  results: {
    async show({ level, score }) {
      ui.hud.hide(); ui.show('results'); $('#screen-results').classList.add('dim');
      $('#res-title').textContent = level.boss ? 'The Warden is defeated!' : `Arena ${level.id} Cleared!`;
      $('#res-caption').textContent = level.boss ? 'The final jungle exit opens. The lost temple awaits.' : 'The exit gate opens! Continue through the jungle to the next arena.';
      const rows = $('#res-rows'); rows.innerHTML = ''; const stars = $('#res-stars'); stars.innerHTML = ''; $('#res-total').textContent = '0';
      const btn = $('#btn-next'); btn.style.visibility = 'hidden';
      await sleep(400);
      for (const r of score.rows) { if (r.value === 0 && r.label !== 'Arena cleared') continue; const tr = document.createElement('tr'); tr.innerHTML = `<td>${r.label}</td><td>+${r.value}</td>`; tr.style.opacity = 0; rows.appendChild(tr); await sleep(60); tr.style.transition = 'opacity .3s'; tr.style.opacity = 1; audio.play('ui.count'); await sleep(260); }
      // count up total
      const t0 = performance.now(), dur = 700; await new Promise((res) => { const tick = (t) => { const k = Math.min(1, (t - t0) / dur); $('#res-total').textContent = Math.round(score.total * k); if (k < 1) { if (Math.random() < .5) audio.play('ui.count', { minGap: .05 }); requestAnimationFrame(tick); } else res(); }; requestAnimationFrame(tick); });
      for (let i = 0; i < 3; i++) { const im = document.createElement('img'); im.src = frameUrl('ui_icons', i < score.stars ? 1 : 2); im.className = 'pop'; stars.appendChild(im); if (i < score.stars) audio.play('ui.star'); await sleep(260); }
      btn.style.visibility = 'visible'; btn.textContent = level.boss ? 'Reach the Temple ›' : 'Next Adventure ›';
      await once(btn, 'click'); ui.hide('results');
    },
  },
  gameover: { async show() { ui.hud.hide(); ui.panel.close(); ui.show('gameover'); $('#screen-gameover').classList.add('dim'); const c = await waitClick({ '#btn-retry': 'retry', '#btn-go-map': 'map' }); ui.hide('gameover'); return c; } },
  ending: { async show({ total, stars }) { ui.hideAll(); ui.show('ending'); $('#screen-ending').classList.add('dim'); $('#end-total').textContent = total; $('#end-stars').innerHTML = `<span style="font-family:var(--font-display);font-size:34px;color:var(--gold)">★ ${stars} / ${game.levels.length * 3}</span>`; const c = await waitClick({ '#btn-end-map': 'map', '#btn-end-reset': 'reset' }); ui.hide('ending'); return c; } },
  pause: { async show() { ui.show('pause'); $('#screen-pause').classList.add('dim'); const c = await waitClick({ '#btn-resume': 'resume', '#btn-pause-map': 'map' }); ui.hide('pause'); return c; }, hide() { ui.hide('pause'); } },

  /* ---------------------------------------------------------- HUD */
  hud: {
    show() { $('#hud').classList.add('show'); }, hide() { $('#hud').classList.remove('show'); this.setThreat(0, false); ui.objective(null); },
    setArena(level) { $('#hud-arena .hud-num').textContent = level.id; $('#hud-arena .hud-title').textContent = level.name; },
    setWave(i, n) { $('#hud-wave').textContent = n > 1 ? `Wave ${i} / ${n}` : `Radius ${game.scene ? game.scene.level.radius : ''} m`; },
    setShields(n, max = 3) {
      const box = $('#hud-shields'); const prev = box.children.length;
      if (prev !== max) { box.innerHTML = ''; for (let i = 0; i < max; i++) { const im = document.createElement('img'); box.appendChild(im); } }
      [...box.children].forEach((im, i) => { const full = i < n; const was = im.dataset.full === '1'; im.src = frameUrl('ui_shield', full ? 0 : 1); im.dataset.full = full ? '1' : '0'; if (was && !full) { im.classList.remove('lost'); void im.offsetWidth; im.classList.add('lost'); } });
    },
    setScore(v) { $('#hud-score-val').textContent = v; },
    setThreat(v, show = true) { const t = $('#threat'); t.classList.toggle('show', show); $('#threat-fill').style.width = Math.round(v * 100) + '%'; t.classList.toggle('hot', v > 0.75); },
    setMuted(m) { const idx = animIndex('ui_icons', m ? 'sound_off' : 'sound_on'); $('#btn-mute').style.backgroundImage = `url(${frameUrl('ui_icons', idx)})`; $('#btn-pause').style.backgroundImage = `url(${frameUrl('ui_icons', animIndex('ui_icons', 'pause'))})`; },
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
  damage() { const el = $('#damage'); el.classList.remove('hit'); void el.offsetWidth; el.classList.add('hit'); },
  skip: { show(cb) { const el = $('#skip'); el.classList.add('show'); el.onclick = () => { el.classList.remove('show'); cb(); }; }, hide() { const el = $('#skip'); el.classList.remove('show'); el.onclick = null; } },

  /* ---------------------------------------------------------- cannon panel */
  panel: {
    cfg: null, hintLevel: 0,
    init() {
      const keys = ['7', '8', '9', '⌫', '4', '5', '6', '/', '1', '2', '3', '.', '0', 'C'];
      const pad = $('#keypad'); pad.innerHTML = '';
      for (const k of keys) { const b = document.createElement('button'); b.textContent = k; b.className = 'silent' + (k === '0' ? ' wide' : ''); b.addEventListener('click', () => this.key(k)); pad.appendChild(b); }
      const inp = $('#answer');
      inp.addEventListener('input', () => { inp.value = inp.value.replace(/[^0-9./]/g, ''); this.refresh(); audio.play('ui.type', { minGap: 0.03 }); });
      inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); this.fire(); } });
      $('#btn-fire').addEventListener('click', () => this.fire());
      $('#btn-hint').addEventListener('click', () => this.hint());
    },
    key(k) {
      const inp = $('#answer'); audio.play('ui.type', { minGap: 0.02 });
      if (k === '⌫') inp.value = inp.value.slice(0, -1); else if (k === 'C') inp.value = ''; else if (inp.value.length < 10) inp.value += k;
      this.refresh();
    },
    refresh() { $('#btn-fire').classList.toggle('ready', $('#answer').value.trim().length > 0 && !this.locked); },
    open(cfg) {
      this.cfg = cfg; this.hintLevel = cfg.hintLevel ?? 0; this.locked = false;
      $('#cannon-panel').classList.add('open'); $('#cannon-panel').classList.remove('locked'); audio.play('ui.panel');
      $('#values').innerHTML = `<li>r = <b>${cfg.r} m</b></li><li class="theta">θ = <b>${cfg.theta}°</b></li><li>π = <b>${PI.label}</b></li>`;
      $('#answer').value = ''; $('#btn-fire').disabled = false; this.setFeedback(null); this.setAttempts(cfg.attempts > 1 ? `Attempt ${cfg.attempts}` : '');
      this.renderFormula(); this.refresh(); setTimeout(() => $('#answer').focus({ preventScroll: true }), 350);
    },
    close() { $('#cannon-panel').classList.remove('open'); $('#answer').blur(); },
    effectiveLevel() { const s = this.cfg?.scaffold; return Math.max(this.hintLevel, s === 'full' ? 2 : s === 'formula' ? 1 : 0); },
    renderFormula() {
      const lvl = this.effectiveLevel(), box = $('#formula-box'), c = this.cfg;
      if (lvl === 0) box.innerHTML = `<span class="hidden-f">Formula hidden — press 💡 Hint if you need it</span>`;
      else box.innerHTML = `<div>${FORMULA_HTML}</div>${lvl >= 2 ? `<div class="sub">${substituted(c.r, c.theta)}</div>` : ''}`;
      if (lvl >= 3) { const steps = hintSteps(c.r, c.theta); this.setFeedback({ type: 'hint', title: 'Step by step', html: `<ol>${steps.slice(0, 3).map((s) => `<li><b>${s.label}:</b> ${s.text}</li>`).join('')}<li><b>${steps[3].label}:</b> ${steps[3].text}</li></ol>` }); }
      else { const e = $('#feedback'); e.className = 'feedback'; e.innerHTML = ''; }
      $('#btn-hint').style.visibility = lvl >= 3 ? 'hidden' : 'visible';
    },
    hint() { this.hintLevel = Math.min(3, this.effectiveLevel() + 1); this.cfg.onHint && this.cfg.onHint(this.hintLevel); this.renderFormula(); audio.play('ui.confirm'); },
    setFeedback(fb) {
      if (!fb) { for (const id of ['#feedback', '#diagnosis']) { const e = $(id); e.className = 'feedback'; e.innerHTML = ''; } return; }
      const el = $(fb.type === 'bad' ? '#diagnosis' : '#feedback');
      el.className = 'feedback show ' + (fb.type || ''); el.innerHTML = `<h4>${fb.title}</h4>${fb.html || ''}`;
      setTimeout(() => { try { el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch {} }, 420);
    },
    setAttempts(t) { $('#attempts').textContent = t; },
    lock() { this.locked = true; $('#cannon-panel').classList.add('locked'); $('#btn-fire').disabled = true; $('#btn-fire').classList.remove('ready'); },
    unlock() { this.locked = false; $('#cannon-panel').classList.remove('locked'); $('#btn-fire').disabled = false; $('#answer').value = ''; this.refresh(); setTimeout(() => $('#answer').focus({ preventScroll: true }), 50); },
    setValue(v) { $('#answer').value = String(v); this.refresh(); },
    fire() { if (this.locked || !this.cfg) return; const v = $('#answer').value.trim(); if (!v) { audio.play('ui.error'); $('#answer').focus(); return; } audio.play('ui.confirm'); this.cfg.onFire && this.cfg.onFire(v); },
  },
};

function catmull(pts) {
  if (pts.length < 2) return '';
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 }, c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    d += ` C ${c1.x} ${c1.y} ${c2.x} ${c2.y} ${p2.x} ${p2.y}`;
  }
  return d;
}
