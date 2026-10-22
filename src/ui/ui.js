// ---------------------------------------------------------------------------
// DOM UI: screens, HUD, cannon panel, banners/stamps/captions, overview, toast
// ---------------------------------------------------------------------------
import * as THREE from '../../vendor/three.module.js';
import { assets } from '../engine/assets.js';
import { audio } from '../engine/audio.js';
import { CHAIN, formulaParts } from '../game/levels.js';
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
    document.body.addEventListener('pointerenter', (e) => { if (e.target instanceof HTMLButtonElement && (e.target.classList.contains('tablet') || e.target.classList.contains('big'))) audio.play('ui.hover', { minGap: 0.25 }); }, true);
    document.body.addEventListener('click', (e) => { if (e.target instanceof HTMLButtonElement && !e.target.classList.contains('silent')) audio.play('ui.click'); }, true);
    $('#btn-mute').addEventListener('click', () => this.hud.setMuted(audio.toggleMute()));
    $('#btn-pause-mute').addEventListener('click', () => this.hud.setMuted(audio.toggleMute()));
    $('#btn-pause').addEventListener('click', () => game.togglePause());
    window.addEventListener('keydown', (e) => { if (e.code === 'KeyM' && !(e.target instanceof HTMLInputElement)) this.hud.setMuted(audio.toggleMute()); if (e.code === 'Escape') game.togglePause(); });
    this.panel.init();
    this.hud.setMuted(audio.muted);
    const logo = imgUrl('ui_logo'); $('#loading-logo').src = logo; $('#title-logo').src = logo;
  },
  applyArt() { $('#title-logo').src = imgUrl('ui_logo'); $('.parchment').style.backgroundImage = `url(${imgUrl('ui_parchment')})`; $('.howto-deck').style.backgroundImage = `url(${imgUrl('ui_parchment')})`; $('#story-art').src = imgUrl('ui_story_art'); this.hud.setMuted(audio.muted); },

  /* ---------------------------------------------------------- screens */
  show(id) { const el = $('#screen-' + id); if (el) el.classList.add('active'); },
  hide(id) { const el = $('#screen-' + id); if (el) el.classList.remove('active'); },
  hideAll() { document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active')); },
  loading: { progress(p, text) { $('#progress-fill').style.width = Math.round(p * 100) + '%'; if (text) $('#loading-text').textContent = `Loading ${text}…`; } },
  title: {
    /** resume: null for a new player (Play is the main button); { id } when there is progress (Continue · Arena N is). */
    async show(resume) {
      const cont = $('#btn-continue'), play = $('#btn-play');
      cont.style.display = resume ? '' : 'none'; if (resume) cont.textContent = `Continue · Arena ${resume.id}`;
      cont.classList.toggle('primary', !!resume); play.classList.toggle('primary', !resume);
      ui.hideAll(); ui.show('title'); const c = await waitClick({ '#btn-play': 'play', '#btn-continue': 'continue', '#btn-howto': 'howto' }); return c;
    },
    hide() { ui.hide('title'); },
  },
  /* How to play (LXD): three swipeable cards, dots + Back/Next, the last button reads "Let's go!" */
  howto: {
    built: false, i: 0,
    build() {
      if (this.built) return; this.built = true;
      // 1 · Reach the cannon: Karan runs up to the hatch in the centre and the cannon rises
      $('#hw-pic-0').innerHTML = `<div class="hw-arena"><div class="hw-floor" style="background-image:url(${imgUrl('arena_floor')})"></div>
        <svg class="hw-path" viewBox="0 0 200 200"><path d="M100 182 L100 112" stroke="#f4bf55" stroke-width="3" stroke-dasharray="6 7" fill="none"/></svg>
        <img class="hw-hatch" src="${imgUrl('floor_hatch')}" alt=""><img class="hw-cannon" src="${imgUrl('cannon')}" alt=""><img class="hw-karan" id="hw-karan" alt=""></div>`;
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
      // 3 · Fire!: the three outcomes side by side
      const mini = (kind) => {
        const c = 50, r = 38, wedge = (s, l, cls) => { const [ax, ay] = [c + r * Math.cos(s * Math.PI / 180), 54 + r * Math.sin(s * Math.PI / 180)], e = s + l, [bx, by] = [c + r * Math.cos(e * Math.PI / 180), 54 + r * Math.sin(e * Math.PI / 180)]; return `<path d="M${c} 54 L${ax} ${ay} A${r} ${r} 0 ${l > 180 ? 1 : 0} 1 ${bx} ${by} Z" class="${cls}"/>`; };
        const ring = `<circle cx="${c}" cy="54" r="${r}" class="m-ring"/>`;
        if (kind === 'small') return `<svg viewBox="0 0 100 100">${ring}${wedge(-135, 90, 'm-target')}${wedge(-112, 44, 'm-beam')}<circle cx="27" cy="31" r="5" class="m-bot"/><circle cx="73" cy="31" r="5" class="m-bot"/></svg>`;
        if (kind === 'right') return `<svg viewBox="0 0 100 100">${ring}${wedge(-135, 90, 'm-gold')}<text x="50" y="40" text-anchor="middle" class="m-star">★</text></svg>`;
        return `<svg viewBox="0 0 100 100">${ring}${wedge(-160, 25, 'm-excess')}${wedge(-135, 90, 'm-beam')}${wedge(-45, 25, 'm-excess')}<path d="M86 34 Q74 52 56 54" class="m-bounce"/><path d="M56 54 l7 -6 M56 54 l8 3" class="m-bounce"/></svg>`;
      };
      $('#hw-pic-2').innerHTML = [['small', 'Too small', 'Some guardians survive and attack'], ['right', 'Just right', 'Every guardian destroyed'], ['big', 'Too big', 'The beam bounces off the wall and hits you']]
        .map(([k, t, d]) => `<figure class="hw-out ${k}">${mini(k)}<figcaption><b>${t}</b>${d}</figcaption></figure>`).join('');
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
      const frames = [...Array(8)].map((_, k) => frameUrl('hero_back', 8 + k)); let f = 0;   // Karan's run cycle (row 2 of his back sheet)
      const kar = $('#hw-karan'), anim = setInterval(() => { kar.src = frames[f++ % 8]; }, 80);
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
      $('#btn-map-sound').addEventListener('click', () => ui.hud.setMuted(audio.toggleMute()));
      $('#btn-map-settings').addEventListener('click', (e) => { e.stopPropagation(); $('#map-settings').classList.toggle('open'); this.syncSettings(); });
      $('#ms-sound').addEventListener('click', () => { ui.hud.setMuted(audio.toggleMute()); this.syncSettings(); });
      $('#ms-howto').addEventListener('click', () => { this.closeSettings(); ui.howto.show(); });
      $('#ms-reset').addEventListener('click', () => {
        const b = $('#ms-reset');
        if (!b.classList.contains('confirm')) { b.classList.add('confirm'); b.textContent = 'Tap again to reset'; return; }
        save.reset(); this.saveData = save.load(); this.closeSettings(); this.refresh(); this.art.placeHero(1); this.select(1, true);
      });
    },
    syncSettings() { $('#ms-sound').textContent = `Sound: ${audio.muted ? 'off' : 'on'}`; const b = $('#ms-reset'); b.classList.remove('confirm'); b.textContent = 'Reset progress'; },
    closeSettings() { $('#map-settings').classList.remove('open'); },
    frontier() { return Math.min(CHAIN.arenas.length, this.saveData.unlocked); },
    refresh() {
      const sd = this.saveData, art = this.art; art.save = sd; art.frontier = this.frontier(); art.build();
      const stars = Object.values(sd.stars).reduce((a, b) => a + b, 0); $('#map-stars').textContent = `★ ${stars} / ${CHAIN.arenas.length * 3}`;
    },
    async show({ saveData }) {
      ui.hideAll(); ui.show('map'); this.saveData = saveData; ui.hud.setMuted(audio.muted);
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
      // the unlock moment, then Karan walks the glowing path to the new ring (LXD)
      if (frontier > seen) {
        this.busy = true; $('#map-tag').classList.remove('show');
        audio.play('gate.unlock'); await this.art.playUnlock(frontier);   // one unlock moment, for the newest ring (rings opened on the way are simply open)
        await this.art.walkTo(frontier);
        saveData.mapUnlockSeen = frontier; save.write(); this.busy = false;
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
    /** Each arena starts with 3 shields: show the refill so it is not confusing (LXD). */
    async refillShields(from, to = 3) {
      this.setShields(from, to); await sleep(500);
      const box = $('#hud-shields'); audio.play('ui.star');   // the shields pop back in one by one (no label needed)
      for (let i = from; i < to; i++) { const im = box.children[i]; im.src = frameUrl('ui_shield', 0); im.dataset.full = '1'; im.classList.remove('refill'); void im.offsetWidth; im.classList.add('refill'); await sleep(180); }
    },
    setScore() {},
    setThreat(v, show = true) { const t = $('#threat'); t.classList.toggle('show', show); $('#threat-fill').style.width = Math.round(v * 100) + '%'; t.classList.toggle('hot', v > 0.75); },
    setMuted(m) { const snd = `url(${frameUrl('ui_icons', animIndex('ui_icons', m ? 'sound_off' : 'sound_on'))})`; $('#btn-mute').style.backgroundImage = snd; $('#btn-map-sound').style.backgroundImage = snd; $('#btn-pause').style.backgroundImage = `url(${frameUrl('ui_icons', animIndex('ui_icons', 'pause'))})`; },
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
        if (kind === 'ok') { b.setAttribute('aria-label', 'Fire the cannon'); b.addEventListener('click', () => this.fire()); }
        else if (kind === 'del') {
          b.setAttribute('aria-label', 'Delete (hold to clear)'); let t = null, held = false;
          b.addEventListener('pointerdown', () => { held = false; clearTimeout(t); t = setTimeout(() => { held = true; this.key('C'); }, 550); });
          for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) b.addEventListener(ev, () => clearTimeout(t));
          b.addEventListener('click', () => { if (!held) this.key('⌫'); held = false; });
        } else { if (k === '/') b.setAttribute('aria-label', 'Fraction bar'); b.addEventListener('click', () => this.key(k)); }
        pad.appendChild(b); this.keyEls[k] = b;
      }
      const inp = $('#answer');
      inp.addEventListener('input', () => { inp.value = this.clean(inp.value); this.changed(); audio.play('ui.type', { minGap: 0.03 }); });
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
      const inp = $('#answer');
      if (k === '⌫') inp.value = inp.value.slice(0, -1);
      else if (k === 'C') inp.value = '';
      else { const next = this.clean(inp.value + k); if (next === inp.value) { audio.play('ui.error', { minGap: 0.1 }); return; } inp.value = next; }
      audio.play('ui.type', { minGap: 0.02 }); this.changed();
    },
    /** the student started a new answer: old feedback goes (LXD) */
    changed() { this.refresh(); if (!this.typed && $('#answer').value.length) { this.typed = true; this.setTip(''); this.cfg && this.cfg.onType && this.cfg.onType(); } },
    refresh() { $('#cannon-panel').classList.toggle('ready', $('#answer').value.trim().length > 0 && !this.locked); },
    open(cfg) {
      this.cfg = cfg; this.locked = false; this.typed = false;
      $('#cannon-panel').classList.add('open'); $('#cannon-panel').classList.remove('locked'); audio.play('ui.panel');
      $('#answer').value = ''; this.setTip(''); this.refresh();
      if (!$('#answer').hasAttribute('readonly')) setTimeout(() => $('#answer').focus({ preventScroll: true }), 350);
    },
    close() { $('#cannon-panel').classList.remove('open', 'ready'); $('#answer').blur(); this.setTip(''); },
    setTip(text) { const el = $('#tip'); el.textContent = text || ''; el.classList.toggle('show', !!text); },
    lock() { this.locked = true; $('#cannon-panel').classList.add('locked'); $('#cannon-panel').classList.remove('ready'); },
    unlock() { this.locked = false; this.typed = false; $('#cannon-panel').classList.remove('locked'); $('#answer').value = ''; this.refresh(); if (!$('#answer').hasAttribute('readonly')) setTimeout(() => $('#answer').focus({ preventScroll: true }), 50); },
    setValue(v) { $('#answer').value = String(v); this.refresh(); },
    fire() { if (this.locked || !this.cfg) return; const v = $('#answer').value.trim(); if (!v) { audio.play('ui.error'); return; } audio.play('ui.confirm'); this.cfg.onFire && this.cfg.onFire(v); },
  },

  /** Centre of the arena area (left of the dock) for stamps: set by the puzzle camera, cleared afterwards. */
  setArenaCentre(x, y) { const st = document.documentElement.style; if (x == null) { st.removeProperty('--arena-cx'); st.removeProperty('--arena-cy'); } else { st.setProperty('--arena-cx', `${Math.round(x)}px`); st.setProperty('--arena-cy', `${Math.round(y)}px`); } },

  /* ---------------------------------------------------------- the formula above the keypad (user, 2026-10-22)
     A = θ/360 × π × r² from the start. 1st wrong shot: the numbers are substituted (θ, π = 22/7, r), what cancels is
     crossed out with the small result written beside it (θ/360 → n/d; the 7 of 22/7 against one r → k), then it
     simplifies to A = n/d × 22 × k × r. 2nd wrong shot: A = n/d × P = the answer as a fraction. */
  formula: {
    p: null, cur: [],
    row() { return $('#formula .row'); },
    V(text, note = null) { return `<span class="v">${text}${note == null ? '' : `<i class="note">${note}</i>`}</span>`; },
    F(num, den) { return `<span class="frac"><span class="num">${num}</span><span class="den">${den}</span></span>`; },
    /** [key, html] tokens for a stage; equal html = the token stays put, anything else dissolves out and in */
    tokens(stage) {
      const p = this.p, V = (t, n) => this.V(t, n), F = (a, b) => this.F(a, b), X = (k) => [k, '×'];
      const f0 = F(V('θ'), V('360')), f1 = F(V(p.theta, p.n), V('360', p.d)), pi1 = F(V('22'), V('7', '1')), r2 = `${V('r')}<sup>2</sup>`;
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
    /** keep the line inside the dock (long radii such as 10.5 × 10.5) */
    fit() {
      const box = $('#formula'), row = this.row(); if (!box || !row) return;
      row.style.fontSize = ''; let fs = parseFloat(getComputedStyle(row).fontSize);
      while (row.scrollWidth > box.clientWidth - 14 && fs > 12) { fs -= 1; row.style.fontSize = fs + 'px'; }
    },
    show(r, theta) { this.p = formulaParts(r, theta); $('#formula').innerHTML = '<div class="row"></div>'; this.render(this.tokens('formula')); },
    hide() { $('#formula').innerHTML = ''; this.cur = []; },
    /** tokens that change glow, dissolve, and the new ones dissolve in (staggered left to right) */
    async morph(tokens, { glow = true, stagger = 0.16 } = {}) {
      const row = this.row(); if (!row) return;
      const old = new Map(this.cur), changed = new Set(tokens.filter(([k, h]) => old.get(k) !== h).map(([k]) => k));
      const leaving = [...row.children].filter((n) => changed.has(n.dataset.k) || !tokens.some(([k]) => k === n.dataset.k));
      if (glow && leaving.length) { leaving.forEach((n) => n.classList.add('glow')); await sleep(420); }
      leaving.forEach((n) => n.classList.add('out')); audio.play('scan.ping'); await sleep(430);
      this.render(tokens, changed, stagger); await sleep(560 + Math.max(0, changed.size - 1) * stagger * 1000);
    },
    /** cross out what cancels, pair by pair, writing the result small beside each crossed number */
    async cancel() {
      const row = this.row(); if (!row) return;
      const q = (sel) => row.querySelector(sel), pairs = [[q('[data-k="f"] .num .v'), q('[data-k="f"] .den .v')], [q('[data-k="pi"] .den .v'), q('[data-k="r1"] .v')]];
      for (const pair of pairs) {
        for (const v of pair) { if (!v) continue; v.classList.add('struck'); audio.play('ui.type'); await sleep(230); }
        await sleep(120); for (const v of pair) { const n = v && v.querySelector('.note'); if (n) n.classList.add('show'); }
        audio.play('label.pop'); await sleep(620);
      }
      await sleep(350);
    },
    /** 1st wrong shot: substitute → cross out → simplify */
    async walkthrough() { if (!this.p) return; await this.morph(this.tokens('sub')); await sleep(250); await this.cancel(); await this.morph(this.tokens('reduced'), { glow: false }); },
    /** 2nd wrong shot: the answer as a fraction */
    async solve() { if (!this.p) return; await this.morph(this.tokens('solved')); },
  },
  /** One line near the beam after a shot (LXD), in the game's language. */
  beamline: {
    show(text, status, worldPos, push) { game.world.labels.add('beamline', text, { className: `beamline ${status}`, worldPos, push, clampTop: 104 }); },
    hide(fade = true) { game.world.labels.remove('beamline', fade); },
  },

  /* ---------------------------------------------------------- end-of-arena results card */
  result: {
    async show({ level, score, last }) {
      const el = $('#arena-result');
      $('#ar-title').textContent = `Arena ${level.id} cleared`;
      $('#ar-stars').innerHTML = [0, 1, 2].map((i) => `<img src="${frameUrl('ui_icons', i < score.stars ? 1 : 2)}" alt="${i < score.stars ? 'star' : 'empty star'}">`).join('');
      // only the stars that were missed, and why (three stars need no explanation)
      $('#ar-criteria').innerHTML = score.criteria.filter((c) => !c.ok).map((c) => `<li class="miss">${c.label}</li>`).join('');
      $('#btn-ar-next').textContent = last ? 'To the temple ▶' : 'Next arena ▶';
      $('#btn-ar-retry').style.display = score.stars < 3 ? '' : 'none';
      el.classList.add('show'); audio.play('ui.panel');
      const choice = waitClick({ '#btn-ar-next': 'next', '#btn-ar-retry': 'retry' });   // buttons work at once, even while the stars pop
      let done = false; choice.then(() => { done = true; });
      const imgs = [...el.querySelectorAll('.ar-stars img')];
      for (let i = 0; i < imgs.length && !done; i++) { await sleep(260); imgs[i].classList.add('pop'); if (i < score.stars) audio.play('ui.star'); }
      const c = await choice;
      el.classList.remove('show'); audio.play('ui.confirm'); await sleep(250);
      return c;
    },
    hide() { $('#arena-result').classList.remove('show'); },
  },
};
