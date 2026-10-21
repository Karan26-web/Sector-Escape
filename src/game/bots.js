// ---------------------------------------------------------------------------
// Guardians (Sector Sentinels): stand in the open arc, notice Karan, advance
// toward the gun, die inside the laser sector, pounce when they survive.
// All polar coordinates are relative to the current arena centre `C`.
// ---------------------------------------------------------------------------
import * as THREE from '../../vendor/three.module.js';
import { AnimatedSprite, makeShadow } from '../engine/sprites.js';
import { audio } from '../engine/audio.js';
import { polar, degDiff, clamp, Ease } from '../engine/util.js';
import { tweens } from '../engine/tween.js';

const ATTACK_R = 2.7;
const PEDESTAL_R = 2.4;
// Guardians accelerate as they close in: speed × (1 + ACCEL·p²), p = progress from the arc (0) to the gun (1).
// Base speed is scaled by ∫₀¹ du / (1 + ACCEL·u²) so the first guardian still arrives on the LXD time budget.
const ACCEL = 0.6;
const ACCEL_INTEGRAL = Math.atan(Math.sqrt(ACCEL)) / Math.sqrt(ACCEL);

export class BotManager {
  constructor(world, fx) {
    this.world = world; this.fx = fx; this.group = new THREE.Group(); world.add(this.group);
    this.bots = []; this.onReach = null; this.active = false; this.waveTime = 0; this.budget = 1; this.speedMul = 1; this.stepCooldown = 0;
    this.C = new THREE.Vector3(); this.R = 14; this.scale = 1;
  }
  get alive() { return this.bots.filter((b) => b.state !== 'dead' && b.state !== 'dying'); }
  get nearestR() { const a = this.alive; return a.length ? Math.min(...a.map((b) => b.r)) : Infinity; }
  get threat() { const r = this.nearestR; if (!isFinite(r)) return 0; return clamp(1 - (r - ATTACK_R) / (this.R + 2 - ATTACK_R), 0, 1); }

  /** Spawn a squad standing just beyond the open arc (idle until alert()). */
  /** Spawn the squad standing ON the open arc of the current ring (they trace the sector's curved edge), idle until alert(). */
  spawnWave({ theta, breachDeg, count, R, timeBudget, center, tint = null, speedMul = 0.35, scale = 1 }) {
    this.clear(); this.R = R; this.budget = timeBudget; this.waveTime = 0; this.active = false; this.theta = theta; this.breachDeg = breachDeg; this.speedMul = speedMul; this.stepCooldown = 0; this.scale = scale;
    if (center) this.C.set(center.x, 0, center.z);
    const marginDeg = Math.max(theta * 0.05, (1.7 / R) * 57.2958);   // keep clear of the junction pillars at the arc ends
    const span = Math.max(0, theta - 2 * marginDeg), rArc = R - 0.55;
    for (let i = 0; i < count; i++) {
      const deg = breachDeg + (count === 1 ? 0 : -span / 2 + (span * i) / (count - 1));
      const spr = new AnimatedSprite('enemy_bot', { worldHeight: 2.1, anim: 'idle', tint });
      spr.setScale(scale);
      const shadow = makeShadow(0.7, 0.8);
      const g = new THREE.Group(); g.add(spr.sprite, shadow); this.group.add(g);
      const arrival = timeBudget * (0.94 + Math.random() * 0.12), L = Math.max(0.5, rArc - ATTACK_R);
      const bot = { g, spr, shadow, deg, r: rArc, r0: rArc, speed: (L * ACCEL_INTEGRAL) / arrival, state: 'walking', phase: Math.random() * Math.PI * 2, lurch: 1.4 + Math.random() * 0.5, delay: Math.random() * 0.6, y: 0 };
      spr.time = Math.random() * 3;
      this.place(bot); this.bots.push(bot);
    }
  }
  place(b) { const p = polar(b.deg, b.r); b.g.position.set(this.C.x + p.x, 0, this.C.z + p.z); b.spr.sprite.position.y = b.y; }
  /** The guardians notice Karan: eyes flash, then they advance. */
  alert() {
    this.active = true;
    for (const b of this.bots) { b.spr.material.color.setHex(0xff6a5a); tweens.add({ duration: 0.6, delay: Math.random() * 0.3, onUpdate: (e) => b.spr.material.color.lerpColors(new THREE.Color(0xff6a5a), new THREE.Color(0xffffff), e) }); }
    audio.play('bots.notice');
  }
  inSector(b, centerDeg, halfTheta) { return Math.abs(degDiff(centerDeg, b.deg)) <= halfTheta; }
  pan(b) { return clamp((b.g.position.x - this.C.x) / (this.R || 14), -1, 1) * 0.6; }

  killInSector(centerDeg, halfTheta, frontSpeed = 40) {
    const survivors = [], hit = this.alive.filter((b) => this.inSector(b, centerDeg, halfTheta));
    const vol = 1 / Math.sqrt(Math.max(1, hit.length / 3));
    for (const b of this.alive) { if (this.inSector(b, centerDeg, halfTheta)) this.kill(b, Math.max(0.05, b.r / frontSpeed), vol); else survivors.push(b); }
    return survivors;
  }
  kill(b, delayS = 0, vol = 1) {
    if (b.state === 'dying' || b.state === 'dead') return; b.state = 'dying';
    tweens.delay(delayS).promise.then(() => {
      if (!this.bots.includes(b)) return;
      b.spr.play('death', { restart: true, onComplete: () => { b.state = 'dead'; this.group.remove(b.g); b.spr.dispose(); } });
      const p = b.g.position.clone(); p.y = 0.9;
      this.fx.explosion(p, 2.6); this.fx.smoke(p, 3);
      audio.play('bot.explode', { pan: this.pan(b), vol: 0.8 * vol, minGap: 0.02 });
      b.shadow.visible = false;
    });
  }
  pulseKill() { const n = this.alive.length; for (const b of this.alive) this.kill(b, 0.1 + b.r / 25, 1 / Math.sqrt(Math.max(1, n / 3))); }

  /** Survivors leap at Karan. Resolves true when the first one connects. */
  lunge(targetPos, onHit, filter = null) {
    let bots = this.alive; if (filter) { const f = bots.filter(filter); if (f.length) bots = f; }
    if (!bots.length) return Promise.resolve(false);
    this.active = false;
    return new Promise((res) => {
      let hit = false;
      bots.forEach((b, i) => {
        b.state = 'lunging';
        const from = b.g.position.clone(), to = targetPos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 1.4, 0, (Math.random() - 0.5) * 1.4));
        const rel = to.clone().sub(this.C); if (rel.length() < PEDESTAL_R) { rel.setLength(PEDESTAL_R); to.copy(this.C).add(rel); }
        const d = from.distanceTo(to), dur = clamp(d / 14, 0.45, 1.3), dl = i * 0.12;
        tweens.delay(dl).promise.then(() => { b.spr.play('lunge', { restart: true }); audio.play('bot.lunge', { pan: this.pan(b), minGap: 0.05 }); });
        tweens.add({ duration: dur, delay: dl, ease: Ease.linear, onUpdate: (e) => { b.g.position.lerpVectors(from, to, e); b.spr.sprite.position.y = Math.sin(e * Math.PI) * 2.2; b.shadow.material.opacity = 0.8 * (1 - Math.sin(e * Math.PI) * 0.5); },
          onComplete: () => { if (!hit) { hit = true; onHit && onHit(b); res(true); } b.state = 'attacking'; b.spr.play('idle'); } });
      });
    });
  }
  clear() { for (const b of this.bots) { this.group.remove(b.g); b.spr.dispose(); } this.bots = []; this.active = false; }

  update(dt) {
    if (this.active) this.waveTime += dt;
    if (this.stepCooldown > 0) this.stepCooldown -= dt;
    for (const b of this.bots) {
      b.spr.update(dt);
      if (b.state !== 'walking') continue;
      if (!this.active) { b.spr.play('idle'); continue; }
      if (b.delay > 0) { b.delay -= dt; b.spr.play('idle'); continue; }
      b.phase += (dt * Math.PI * 2) / b.lurch;
      const m = 1 + 0.92 * Math.sin(b.phase);
      const prog = clamp(1 - (b.r - ATTACK_R) / Math.max(0.01, b.r0 - ATTACK_R), 0, 1), accel = 1 + ACCEL * prog * prog;   // faster near the gun
      b.r -= b.speed * m * accel * this.speedMul * dt;
      b.spr.play('walk', { speed: clamp((0.45 + m * 0.5) * Math.max(0.5, this.speedMul) * accel, 0.3, 1.9) });
      if (m > 1.85 && this.stepCooldown <= 0 && b.r < this.R) { this.stepCooldown = 0.45 / accel; audio.play('bot.step', { pan: this.pan(b), vol: clamp(0.85 - b.r / this.R, 0.12, 0.55), minGap: 0.25 }); }
      if (b.r <= ATTACK_R) { b.r = ATTACK_R; b.state = 'arrived'; b.spr.play('idle'); if (this.onReach) { const cb = this.onReach; this.onReach = null; cb(b); } }
      this.place(b);
    }
  }
}
