// ---------------------------------------------------------------------------
// Guardians (Sector Sentinels), LXD 2026-10-23: they are never inside the arena
// to begin with. When Karan reaches it they charge in from beyond the gap in
// the wall and pound on the barrier across it. The charge destroys those in
// front of the part of the arc it covers; after an undercharged shot the
// survivors walk in through the broken barrier and attack Karan.
// All polar coordinates are relative to the current arena centre `C`.
// ---------------------------------------------------------------------------
import * as THREE from '../../vendor/three.module.js';
import { AnimatedSprite, makeShadow, topDownLift } from '../engine/sprites.js';
import { assets } from '../engine/assets.js';
import { audio } from '../engine/audio.js';
import { polar, degDiff, clamp, Ease } from '../engine/util.js';
import { tweens } from '../engine/tween.js';

const GAP = 1.0;     // guardians stand this far beyond the barrier (the arc, r = R)
const WHITE = new THREE.Color(0xffffff);

export class BotManager {
  constructor(world, fx) {
    this.world = world; this.fx = fx; this.group = new THREE.Group(); world.add(this.group);
    this.bots = []; this.C = new THREE.Vector3(); this.R = 14; this.scale = 1;
    this.calm = false;     // false: every guardian hammers away (arrival); true: one blow every ~2–3 s (the learner is working)
    this.calmT = 0;
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
    this.clear(); this.R = R; this.theta = theta; this.breachDeg = breachDeg; this.scale = scale;
    if (center) this.C.set(center.x, 0, center.z);
    const marginDeg = Math.max(theta * 0.05, (1.5 / R) * 57.2958);   // keep clear of the gateposts at the arc ends
    const span = Math.max(0, theta - 2 * marginDeg), rStand = R + GAP;
    for (let i = 0; i < count; i++) {
      const deg = breachDeg + (count === 1 ? 0 : -span / 2 + (span * i) / (count - 1));
      const spr = new AnimatedSprite('enemy_bot', { anim: 'idle', tint });   // size from the manifest (the sheet's cells are 296 px tall)
      const shadow = makeShadow(0.7, 0.8);
      const g = new THREE.Group(); g.add(spr.sprite, shadow); g.visible = false; this.group.add(g);
      // a little size and tone variety so a squad of 20+ does not read as one sprite copied
      const vary = 0.94 + Math.random() * 0.12; spr.setScale(scale * vary); if (!tint) spr.material.color.setScalar(0.9 + Math.random() * 0.1); spr.baseTone = spr.material.color.clone();
      const rFar = Math.max(rStand + 2.5, Math.min(rStand + 7.5, maxR ? maxR(deg) : rStand + 7));
      const bot = { g, spr, shadow, deg, r: rFar, rStand, rFar, state: 'waiting', y: 0, cool: 0, speed: 4.6 + Math.random() * 1.2, delay: 0 };
      spr.time = Math.random() * 3;
      this.place(bot); this.bots.push(bot);
    }
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
  pulseKill() { const n = this.alive.length; for (const b of this.alive) this.kill(b, 0.1 + b.g.position.distanceTo(this.C) / 25, 1 / Math.sqrt(Math.max(1, n / 3))); }

  /** After an undercharged shot: the survivors step through the broken barrier, run at Karan and the first leap
   *  connects. Resolves true at that hit (false if nobody survived). */
  breakThrough(targetPos, onHit) {
    const bots = this.alive; if (!bots.length) return Promise.resolve(false);
    return new Promise((res) => {
      let hit = false, longest = 0;
      bots.forEach((b, i) => {
        b.state = 'charging';
        const from = b.g.position.clone(), aim = targetPos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 1.6, 0, (Math.random() - 0.5) * 1.6));
        const toward = aim.clone().sub(from).setY(0), L = toward.length(); toward.normalize();
        const leapAt = from.clone().addScaledVector(toward, Math.max(0, L - 2.6)), run = Math.max(0, L - 2.6) / 6.2, dl = i * 0.06 + Math.random() * 0.1;
        longest = Math.max(longest, dl + run + 0.42);
        tweens.delay(dl).promise.then(() => { if (b.state === 'charging') b.spr.play('walk', { speed: 2 }); });
        tweens.add({ duration: run, delay: dl, ease: Ease.linear, onUpdate: (e) => { if (b.state === 'charging') b.g.position.lerpVectors(from, leapAt, e); },
          onComplete: () => {
            if (b.state !== 'charging') return;
            b.spr.play('lunge', { restart: true }); audio.play('bot.lunge', { pan: this.pan(b), minGap: 0.05 });
            tweens.add({ duration: 0.42, ease: Ease.linear, onUpdate: (e) => { if (b.state !== 'charging') return; b.g.position.lerpVectors(leapAt, aim, e); b.y = Math.sin(e * Math.PI) * 1.6; b.shadow.material.opacity = 0.8 * (1 - Math.sin(e * Math.PI) * 0.5); },
              onComplete: () => { b.y = 0; if (b.state === 'charging') { b.state = 'attacking'; b.spr.play('idle'); } if (!hit) { hit = true; onHit && onHit(b); res(true); } } });
          } });
      });
      tweens.delay(longest + 1).promise.then(() => { if (!hit) { hit = true; res(false); } });   // watchdog: no leap ever landed
    });
  }
  clear() { for (const b of this.bots) { this.group.remove(b.g); b.spr.dispose(); } this.bots = []; this._onFirstBlow = null; this.calm = false; this.idle = false; }

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
