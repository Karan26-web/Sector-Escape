// ---------------------------------------------------------------------------
// Guardians (Sector Sentinels), LXD 2026-10-23: they are never inside the arena
// to begin with. When Karan reaches it they charge in from beyond the gap in
// the wall and pound on the barrier across it. The charge destroys those in
// front of the part of the arc it covers; after an undercharged shot the
// survivors storm in the moment the glass gives way, more pour in behind them,
// and they surround Karan and pile on (user 2026-10-27: overwhelming, nobody
// standing about).
// All polar coordinates are relative to the current arena centre `C`.
// ---------------------------------------------------------------------------
import * as THREE from '../../vendor/three.module.js';
import { AnimatedSprite, makeShadow, topDownLift } from '../engine/sprites.js';
import { assets } from '../engine/assets.js';
import { audio } from '../engine/audio.js';
import { polar, degDiff, clamp, Ease, toDeg } from '../engine/util.js';
import { tweens } from '../engine/tween.js';

const GAP = 1.0;     // guardians stand this far beyond the barrier (the arc, r = R)
const WHITE = new THREE.Color(0xffffff);

export class BotManager {
  constructor(world, fx) {
    this.world = world; this.fx = fx; this.group = new THREE.Group(); world.add(this.group);
    this.bots = []; this.C = new THREE.Vector3(); this.R = 14; this.scale = 1;
    this.calm = false;     // false: every guardian hammers away (arrival); true: one blow every ~2–3 s (the learner is working)
    this.calmT = 0;
    this.frenzy = false;   // the pile-on after a too-small shot: the ones around Karan keep hammering him
    this.onPound = null;   // (bot) => the barrier ripples and thuds where the blow lands
    // the blow: the sheet's 'pound' row (fists up → slam → recoil → wind-up, impact on its 3rd frame); without that art,
    // the start of the lunge (crouch → strike) stands in, with a bigger lunge to sell it
    const def = assets.frames('enemy_bot');
    if (!def.anims.pound && def.anims.lunge) def.anims.pound = { row: def.anims.lunge.row, col: def.anims.lunge.col ?? 0, frames: 3, fps: 10, loop: false };
    const P = def.anims.pound || { frames: 3, fps: 10 }, real = P.frames >= 5;
    this.blow = { impact: ((real ? 2 : P.frames - 1) + 0.5) / P.fps, total: P.frames / P.fps, reach: real ? 0.3 : 0.55 };
  }
  get alive() { return this.bots.filter((b) => b.state !== 'dead' && b.state !== 'dying'); }

  /** Line the squad up beyond the gap (hidden until arrive()): one rank along the arc, just behind the barrier.
   *  maxR(deg): how far out the guardian ground reaches along deg (where an arriving guardian may start). */
  spawnWave({ theta, breachDeg, count, R, center, maxR = null, tint = null, scale = 1 }) {
    this.clear(); this.R = R; this.theta = theta; this.breachDeg = breachDeg; this.scale = scale; this.maxR = maxR; this.tint = tint;
    if (center) this.C.set(center.x, 0, center.z);
    this.marginDeg = Math.max(theta * 0.05, (1.5 / R) * 57.2958);   // keep clear of the gateposts at the arc ends
    const span = Math.max(0, theta - 2 * this.marginDeg);
    for (let i = 0; i < count; i++) this.makeBot(breachDeg + (count === 1 ? 0 : -span / 2 + (span * i) / (count - 1)));
  }
  /** One guardian at polar degree deg, hidden at its start (the far end of the guardian ground beyond the gap). */
  makeBot(deg) {
    const rStand = this.R + GAP, rFar = Math.max(rStand + 2.5, Math.min(rStand + 7.5, this.maxR ? this.maxR(deg) : rStand + 7));
    const spr = new AnimatedSprite('enemy_bot', { anim: 'idle', tint: this.tint });   // size from the manifest (the sheet's cells are 296 px tall)
    const shadow = makeShadow(0.7, 0.8);
    const g = new THREE.Group(); g.add(spr.sprite, shadow); g.visible = false; this.group.add(g);
    // a little size and tone variety so a squad of 20+ does not read as one sprite copied
    const vary = 0.94 + Math.random() * 0.12; spr.setScale(this.scale * vary); if (!this.tint) spr.material.color.setScalar(0.9 + Math.random() * 0.1); spr.baseTone = spr.material.color.clone();
    const bot = { g, spr, shadow, deg, r: rFar, rStand, rFar, state: 'waiting', y: 0, cool: 0, speed: 4.6 + Math.random() * 1.2, delay: 0 };
    spr.time = Math.random() * 3;
    this.place(bot); this.bots.push(bot);
    return bot;
  }
  place(b) { const p = polar(b.deg, b.r); b.g.position.set(this.C.x + p.x, 0, this.C.z + p.z); }
  /** The squad charges in from beyond the gap and slams into the barrier. Resolves at the first blow. */
  arrive({ stagger = 0.45 } = {}) {
    audio.play('bots.notice');
    return new Promise((res) => {
      this._onFirstBlow = res;
      for (const b of this.bots) {
        b.state = 'arriving'; b.delay = Math.random() * stagger; b.r = b.rFar; b.g.visible = true; this.place(b);
        const m = b.spr.material; m.opacity = 0; tweens.add({ duration: 0.35, delay: b.delay, onUpdate: (e) => (m.opacity = e) });
      }
      if (!this.bots.length) res();
    });
  }
  inSector(b, centerDeg, halfTheta) { return Math.abs(degDiff(centerDeg, b.deg)) <= halfTheta; }
  pan(b) { return clamp((b.g.position.x - this.C.x) / (this.R || 14), -1, 1) * 0.6; }

  /** One blow on the barrier: wind up, slam into it (the barrier ripples where it lands, on the impact frame), recoil. */
  pound(b) {
    b.state = 'striking';
    const B = this.blow, r0 = b.rStand, r1 = b.rStand - B.reach, hit = Math.min(0.12, B.impact * 0.5), wind = B.impact - hit, back = Math.max(0.3, B.total - B.impact);
    b.spr.play('pound', { restart: true, speed: 1 });
    tweens.add({ duration: hit, delay: wind, ease: Ease.inQuad, onUpdate: (e) => { if (b.state === 'striking') { b.r = r0 + (r1 - r0) * e; this.place(b); } },
      onComplete: () => {
        if (b.state !== 'striking') return;
        if (this.onPound) this.onPound(b);
        if (this._onFirstBlow) { const cb = this._onFirstBlow; this._onFirstBlow = null; cb(); }
        tweens.add({ duration: back, ease: Ease.outQuad, onUpdate: (e) => { if (b.state === 'striking') { b.r = r1 + (r0 - r1) * e; this.place(b); } },
          onComplete: () => { if (b.state !== 'striking') return; b.state = 'pounding'; b.spr.play('idle'); b.cool = 0.5 + Math.random() * 1.1; } });
      } });
  }

  /** The glass cracks: every guardian still at it hammers away at once (they feel it giving). */
  rally() { this.calm = false; this.idle = false; for (const b of this.bots) if (b.state === 'pounding') b.cool = Math.random() * 0.2; }

  kill(b, delayS = 0, vol = 1) {
    if (b.state === 'dying' || b.state === 'dead') return; b.state = 'dying';
    tweens.delay(delayS).promise.then(() => {
      if (!this.bots.includes(b)) return;
      b.spr.material.color.copy(b.spr.baseTone || WHITE);
      b.spr.play('death', { restart: true, onComplete: () => { b.state = 'dead'; this.group.remove(b.g); b.spr.dispose(); } });
      const p = b.g.position.clone(); p.y = 0.9;
      this.fx.explosion(p, 2.6); this.fx.smoke(p, 3);
      audio.play('bot.explode', { pan: this.pan(b), vol: 0.8 * vol, minGap: 0.02 });
      b.shadow.visible = false;
    });
  }
  /** The centre O pulses after the survivors' attack and they fall (the board resets for the next try). */
  pulseKill() { this.frenzy = false; const n = this.alive.length; for (const b of this.alive) this.kill(b, 0.1 + b.g.position.distanceTo(this.C) / 25, 1 / Math.sqrt(Math.max(1, n / 3))); }

  /** Too small (LXD; user 2026-10-27: it must overwhelm Karan, with nobody standing about). The moment the glass gives
   *  way the guardians the shot missed storm in through the gap, and `extra` more pour in right behind them through the
   *  same uncovered stretch. They cut in through the gap, run for a place around Karan (the first ones in front, the rest
   *  wrapping round his sides and back), leap onto him and keep hammering him until O's pulse (pulseKill).
   *  onContact(b): the first to reach him. onBlow(b): every blow after that. Returns { contact, allIn }: contact resolves
   *  true at the first contact (false if nobody got through), allIn once every one of them has landed on him. */
  swarm(target, { extra = 0, onContact = null, onBlow = null } = {}) {
    const lead = this.alive; if (!lead.length) return { contact: Promise.resolve(false), allIn: Promise.resolve() };
    this.frenzy = true; this.onBlow = onBlow;
    const half = this.theta / 2 - this.marginDeg, jitter = Math.max(2, this.theta / Math.max(2, this.bots.length));
    const all = lead.map((b) => ({ b, wait: Math.random() * 0.08 }));
    for (let k = 0; k < extra; k++) {   // reinforcements, in waves behind the survivors, through the stretch they came through
      const s = lead[k % lead.length], deg = this.breachDeg + clamp(degDiff(this.breachDeg, s.deg) + (Math.random() - 0.5) * 2 * jitter, -half, half);
      const rank = Math.floor(k / lead.length), b = this.makeBot(deg);
      b.r = Math.min(b.rFar, this.R + GAP + 1.1 + rank * 0.9); this.place(b);   // a rank or two right behind the survivors
      all.push({ b, wait: 0.1 + rank * 0.15 + Math.random() * 0.08, fresh: true });
    }
    // places around Karan: an inner ring of up to 7, the rest on an outer ring. Nearest first, each takes the free place
    // closest to its own side of him, so the front fills first and the later ones wrap around him.
    const K = target.clone().setY(0), n = all.length, inner = Math.min(n, 7), places = [];
    const at = (o, deg, r) => { const p = polar(deg, r); return new THREE.Vector3(o.x + p.x, 0, o.z + p.z); };
    for (let i = 0; i < n; i++) { const ring = i < inner ? 0 : 1, m = ring ? n - inner : inner, j = ring ? i - inner : i; places.push({ deg: this.breachDeg + (j / m) * 360 + (ring ? 180 / m : 0), r: ring ? 2.0 : 1.2 }); }
    all.sort((p, q) => p.b.g.position.distanceTo(K) - q.b.g.position.distanceTo(K));
    const speed = 6 + this.R * 0.25; let longest = 0, resolve, resolveAll, landed = 0;
    const contact = new Promise((res) => { resolve = res; }), allIn = new Promise((res) => { resolveAll = res; });
    this._onContact = (b) => {
      if (++landed >= n && resolveAll) { resolveAll(); resolveAll = null; }
      if (!resolve) return; const r = resolve; resolve = null; if (onContact) onContact(b); r(true);
    };
    for (const a of all) {
      const b = a.b, side = toDeg(b.g.position.x - K.x, b.g.position.z - K.z);
      let best = 0; for (let i = 1; i < places.length; i++) if (Math.abs(degDiff(side, places[i].deg)) < Math.abs(degDiff(side, places[best].deg))) best = i;
      const pl = places.splice(best, 1)[0], inside = at(this.C, b.deg, this.R - 1.2);
      b.slot = at(K, pl.deg, pl.r); b.toward = K.clone().sub(b.slot).normalize();
      b.path = [inside, at(K, pl.deg, pl.r + 1.7)];                     // through the gap, then round to its place
      b.state = 'charging'; b.wait = a.wait; b.speed = speed * (0.92 + Math.random() * 0.16);
      if (a.fresh) { b.g.visible = true; b.spr.material.opacity = 0; b.fadeIn = true; }
      longest = Math.max(longest, a.wait + (b.g.position.distanceTo(inside) + inside.distanceTo(b.path[1])) / b.speed + 0.4);
    }
    audio.play('swarm.surge');
    tweens.delay(longest + 1.5).promise.then(() => { if (resolve) { const r = resolve; resolve = null; r(false); } if (resolveAll) { resolveAll(); resolveAll = null; } });   // watchdog
    return { contact, allIn };
  }
  /** The last stride: a leap onto Karan, landing in its place around him. */
  leap(b) {
    b.state = 'leaping'; b.spr.play('lunge', { restart: true }); audio.play('bot.lunge', { pan: this.pan(b), minGap: 0.06 });
    const from = b.g.position.clone(), to = b.slot;
    tweens.add({ duration: 0.36, ease: Ease.linear, onUpdate: (e) => { if (b.state !== 'leaping') return; b.g.position.lerpVectors(from, to, e); b.y = Math.sin(e * Math.PI) * 1.3; b.shadow.material.opacity = 0.8 * (1 - Math.sin(e * Math.PI) * 0.5); },
      onComplete: () => { b.y = 0; if (b.state !== 'leaping') return; b.state = 'mauling'; b.cool = Math.random() * 0.2; b.spr.play('idle'); if (this._onContact) this._onContact(b); } });
  }
  /** One blow in the pile-on: fists up, a lean into Karan (onBlow on the impact frame), back to its place. */
  maul(b) {
    b.state = 'clawing';
    const B = this.blow, sp = 1.4, p0 = b.slot.clone(), p1 = p0.clone().addScaledVector(b.toward, 0.3), hit = Math.min(0.1, B.impact * 0.5) / sp;
    b.spr.play('pound', { restart: true, speed: sp });
    tweens.add({ duration: hit, delay: B.impact / sp - hit, ease: Ease.inQuad, onUpdate: (e) => { if (b.state === 'clawing') b.g.position.lerpVectors(p0, p1, e); },
      onComplete: () => {
        if (b.state !== 'clawing') return;
        if (this.onBlow && this.frenzy) this.onBlow(b);
        tweens.add({ duration: 0.22, ease: Ease.outQuad, onUpdate: (e) => { if (b.state === 'clawing') b.g.position.lerpVectors(p1, p0, e); },
          onComplete: () => { if (b.state !== 'clawing') return; b.state = 'mauling'; b.cool = 0.15 + Math.random() * 0.45; b.spr.play('idle'); } });
      } });
  }
  /** Game over: the pile-on stops (they stand over him). */
  halt() { this.frenzy = false; }
  clear() { for (const b of this.bots) { this.group.remove(b.g); b.spr.dispose(); } this.bots = []; this._onFirstBlow = null; this._onContact = null; this.onBlow = null; this.calm = false; this.idle = false; this.frenzy = false; }

  update(dt) {
    const lift = topDownLift(this.world.camera);   // keep floor-level sprites visible from the puzzle camera
    let running = null; const ro = lift > 0 ? 16 : 0;   // from above, drawn after the floor overlays (the dim) like Karan
    for (const b of this.bots) {
      b.spr.sprite.position.y = b.y + lift; b.spr.sprite.renderOrder = ro;
      b.spr.update(dt);
      if (b.state === 'arriving') {
        if (b.delay > 0) { b.delay -= dt; continue; }
        b.r -= b.speed * dt; b.spr.play('walk', { speed: 1.9 }); running = b;
        if (b.r <= b.rStand) { b.r = b.rStand; this.place(b); this.pound(b); continue; }   // straight into the first blow
        this.place(b);
      } else if (b.state === 'pounding' && !this.calm && !this.idle) {
        b.cool -= dt;
        if (b.cool <= 0) this.pound(b);
      } else if (b.state === 'charging') {   // storming in: through the gap, then round to its place by Karan
        if (b.wait > 0) { b.wait -= dt; continue; }
        if (b.fadeIn) { const m = b.spr.material; m.opacity = Math.min(1, m.opacity + dt * 4); if (m.opacity >= 1) b.fadeIn = false; }
        const pos = b.g.position, tgt = b.path[0], dx = tgt.x - pos.x, dz = tgt.z - pos.z, d = Math.hypot(dx, dz), step = b.speed * dt;
        b.spr.play('walk', { speed: 2.2 }); running = b;
        if (d <= step) { pos.x = tgt.x; pos.z = tgt.z; b.path.shift(); if (!b.path.length) this.leap(b); }
        else { pos.x += (dx / d) * step; pos.z += (dz / d) * step; }
      } else if (b.state === 'mauling' && this.frenzy) {
        b.cool -= dt;
        if (b.cool <= 0) this.maul(b);
      }
    }
    if (running && (this.stepT = (this.stepT || 0) - dt) <= 0) { this.stepT = 0.15; audio.play('bot.step', { pan: this.pan(running), vol: 0.45, minGap: 0.1 }); }   // the charge-in thunders
    if (this.calm && !this.idle && (this.calmT -= dt) <= 0) {
      const ready = this.bots.filter((b) => b.state === 'pounding');
      if (ready.length) this.pound(ready[Math.floor(Math.random() * ready.length)]);
      this.calmT = 1.8 + Math.random() * 1.4;
    }
  }
}
