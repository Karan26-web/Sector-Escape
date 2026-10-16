// ---------------------------------------------------------------------------
// Enemy bots: pour through the breach, advance in menacing lurches,
// die inside the laser sector, lunge at the hero when they survive.
// ---------------------------------------------------------------------------
import * as THREE from '../../vendor/three.module.js';
import { AnimatedSprite, makeShadow } from '../engine/sprites.js';
import { audio } from '../engine/audio.js';
import { polar, degDiff, clamp, lerp, Ease } from '../engine/util.js';
import { tweens } from '../engine/tween.js';

const ATTACK_R = 2.7;
const PEDESTAL_R = 2.4;

export class BotManager {
  constructor(world, fx) {
    this.world = world; this.fx = fx; this.group = new THREE.Group(); world.add(this.group);
    this.bots = []; this.onReach = null; this.active = false; this.waveTime = 0; this.budget = 1;
  }
  get alive() { return this.bots.filter((b) => b.state !== 'dead' && b.state !== 'dying'); }
  get nearestR() { const a = this.alive; return a.length ? Math.min(...a.map((b) => b.r)) : Infinity; }
  /** 0..1 how close the closest bot is to the cannon. */
  get threat() { const r = this.nearestR; if (!isFinite(r)) return 0; return clamp(1 - (r - ATTACK_R) / (this.R + 2 - ATTACK_R), 0, 1); }

  spawnWave({ theta, breachDeg, count, R, timeBudget, tint = null }) {
    this.clear(); this.R = R; this.budget = timeBudget; this.waveTime = 0; this.active = true; this.theta = theta; this.breachDeg = breachDeg;
    const rows = count > 14 ? 3 : 2, perRow = Math.ceil(count / rows);
    const margin = Math.min(6, theta * 0.08);
    let idx = 0;
    for (let row = 0; row < rows; row++) {
      const n = Math.min(perRow, count - idx);
      for (let i = 0; i < n; i++, idx++) {
        const f = n === 1 ? 0.5 : (i + 0.5 + (row % 2) * 0.25) / (n + 0.5);
        const deg = breachDeg - theta / 2 + margin + (theta - margin * 2) * f + (Math.random() - 0.5) * 2;
        const r0 = R + 1.6 + row * 2.4 + Math.random() * 0.8;
        const spr = new AnimatedSprite('enemy_bot', { worldHeight: 2.1, anim: 'walk', tint });
        const shadow = makeShadow(0.7, 0.8);
        const g = new THREE.Group(); g.add(spr.sprite, shadow); this.group.add(g);
        const arrival = timeBudget * (0.94 + Math.random() * 0.12);
        const bot = { g, spr, shadow, deg, r: r0, r0, speed: (r0 - ATTACK_R) / arrival, state: 'walking', phase: Math.random() * Math.PI * 2, lurch: 1.4 + Math.random() * 0.5, delay: row * 0.9 + Math.random() * 0.7, y: 0, hitFlash: 0 };
        spr.time = Math.random() * 3; spr.play('idle');
        this.place(bot); this.bots.push(bot);
      }
    }
  }
  place(b) { const p = polar(b.deg, b.r); b.g.position.set(p.x, 0, p.z); b.spr.sprite.position.y = b.y; b.spr.sprite.scale.y = b.spr.baseScale.y; }

  /** Angular test: is the bot inside the sector centred on `centerDeg` spanning `halfTheta`? */
  inSector(b, centerDeg, halfTheta) { return Math.abs(degDiff(centerDeg, b.deg)) <= halfTheta; }

  /**
   * Destroy bots inside the fired sector; the laser front travels outward so
   * deaths are staggered by radius. Returns survivors (alive bots outside).
   */
  killInSector(centerDeg, halfTheta, frontSpeed = 40) {
    const survivors = [];
    for (const b of this.alive) {
      if (this.inSector(b, centerDeg, halfTheta)) this.kill(b, Math.max(0.05, b.r / frontSpeed));
      else survivors.push(b);
    }
    return survivors;
  }
  kill(b, delayS = 0) {
    if (b.state === 'dying' || b.state === 'dead') return; b.state = 'dying';
    tweens.delay(delayS).promise.then(() => {
      if (!this.bots.includes(b)) return;
      b.spr.play('death', { restart: true, onComplete: () => { b.state = 'dead'; this.group.remove(b.g); b.spr.dispose(); } });
      const p = b.g.position.clone(); p.y = 0.9;
      this.fx.explosion(p, 2.6); this.fx.smoke(p, 3);
      audio.play('bot.explode', { pan: clamp(p.x / (this.R || 14), -1, 1) * 0.6, vol: 0.9, minGap: 0.02 });
      b.shadow.visible = false;
    });
  }
  /** All remaining bots die in a radial pulse from the centre. */
  pulseKill() { for (const b of this.alive) this.kill(b, 0.1 + b.r / 25); }

  /** Survivors leap at the hero. Resolves true when the first one connects. */
  lunge(targetPos, onHit, filter = null) {
    let bots = this.alive; if (filter) { const f = bots.filter(filter); if (f.length) bots = f; }
    if (!bots.length) return Promise.resolve(false);
    this.active = false;
    return new Promise((res) => {
      let hit = false;
      bots.forEach((b, i) => {
        b.state = 'lunging';
        const from = b.g.position.clone(), to = targetPos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 1.4, 0, (Math.random() - 0.5) * 1.4));
        if (to.length() < PEDESTAL_R) to.setLength(PEDESTAL_R);
        const dist = from.distanceTo(to), dur = clamp(dist / 14, 0.45, 1.3), dl = i * 0.12;
        tweens.delay(dl).promise.then(() => { b.spr.play('lunge', { restart: true }); audio.play('bot.lunge', { pan: clamp(from.x / this.R, -1, 1) * 0.5, minGap: 0.05 }); });
        tweens.add({ duration: dur, delay: dl, ease: Ease.linear, onUpdate: (e) => {
          b.g.position.lerpVectors(from, to, e); b.spr.sprite.position.y = Math.sin(e * Math.PI) * 2.2; b.shadow.material.opacity = 0.8 * (1 - Math.sin(e * Math.PI) * 0.5);
        }, onComplete: () => { if (!hit) { hit = true; onHit && onHit(b); res(true); } b.state = 'attacking'; b.spr.play('idle'); } });
      });
    });
  }
  clear() { for (const b of this.bots) { this.group.remove(b.g); b.spr.dispose(); } this.bots = []; this.active = false; }

  update(dt) {
    if (this.active) this.waveTime += dt;
    let stepBudget = 2;
    for (const b of this.bots) {
      b.spr.update(dt);
      if (b.state !== 'walking') continue;
      if (!this.active) { b.spr.play('idle'); continue; }
      if (b.delay > 0) { b.delay -= dt; b.spr.play('idle'); continue; }
      b.phase += (dt * Math.PI * 2) / b.lurch;
      const m = 1 + 0.92 * Math.sin(b.phase);
      b.r -= b.speed * m * dt;
      b.spr.play('walk', { speed: clamp(0.45 + m * 0.5, 0.35, 1.5) });
      if (m > 1.85 && stepBudget > 0 && b.r < this.R) { stepBudget--; audio.play('bot.step', { pan: clamp(b.g.position.x / this.R, -1, 1) * 0.6, vol: clamp(1.3 - b.r / this.R, 0.25, 1), minGap: 0.09 }); }
      if (b.r <= ATTACK_R) { b.r = ATTACK_R; b.state = 'arrived'; b.spr.play('idle'); if (this.onReach) { const cb = this.onReach; this.onReach = null; cb(b); } }
      this.place(b);
    }
  }
}
