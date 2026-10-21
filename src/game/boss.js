// ---------------------------------------------------------------------------
// The Sector Warden – towering guardian standing behind the final squad.
// It falls with the perfect blast (no shields: the maths is the fight).
// ---------------------------------------------------------------------------
import * as THREE from '../../vendor/three.module.js';
import { AnimatedSprite, makeShadow, makeBillboard } from '../engine/sprites.js';
import { tweens, tweenValue } from '../engine/tween.js';
import { audio } from '../engine/audio.js';

export class Boss {
  constructor(world, fx, position) {
    this.world = world; this.fx = fx;
    this.group = new THREE.Group(); this.group.position.copy(position); this.group.position.y = 0;
    this.spr = new AnimatedSprite('boss_warden', { worldHeight: 6.5 });
    this.shadow = makeShadow(2.2, 0.9);
    this.glow = makeBillboard('fx_glow', 7, { additive: true, tint: 0xa050ff, centerY: 0.5 }); this.glow.position.y = 3.2; this.glow.material.opacity = 0.3;
    this.light = new THREE.PointLight(0xa050ff, 30, 25, 2); this.light.position.y = 4;
    this.group.add(this.spr.sprite, this.shadow, this.glow, this.light);
    world.add(this.group); this.t = 0; this.alive = true;
  }
  get position() { return this.group.position; }
  roar() { audio.play('boss.roar'); this.world.rig.shake(0.3, 0.8); this.fx.flash(this.position.clone().add(new THREE.Vector3(0, 3, 0)), 0xc06cff, 10, 0.6); }
  hurt() { audio.play('boss.roar'); this.spr.play('hurt', { restart: true }); tweens.delay(0.7).promise.then(() => { if (this.alive) this.spr.play('idle'); }); }
  async defeat() {
    this.alive = false; audio.play('boss.defeat'); this.spr.play('defeat', { restart: true });
    const p = this.position.clone();
    for (let i = 0; i < 7; i++) tweens.delay(i * 0.22).promise.then(() => this.fx.explosion(p.clone().add(new THREE.Vector3((Math.random() - 0.5) * 4, 1 + Math.random() * 4, (Math.random() - 0.5) * 2)), 4));
    this.world.rig.shake(0.6, 1.8);
    await tweenValue(0, 1, 1.6, (v) => { this.glow.material.opacity = 0.3 + v * 0.7; this.glow.scale.setScalar(7 + v * 10); this.light.intensity = 30 + v * 200; });
    this.fx.flash(p.clone().add(new THREE.Vector3(0, 3, 0)), 0xffffff, 40, 0.9);
    await tweenValue(1, 0, 0.8, (v) => { this.spr.material.opacity = v; this.glow.material.opacity = v; this.light.intensity = 230 * v; this.shadow.material.opacity = v; });
    this.group.visible = false;
  }
  update(dt) {
    this.t += dt; this.spr.update(dt);
    if (this.alive) { this.spr.sprite.position.y = 0.3 + Math.sin(this.t * 1.5) * 0.25; this.glow.material.opacity = 0.25 + Math.sin(this.t * 2) * 0.1; }
  }
  dispose() { this.world.remove(this.group); this.spr.dispose(); }
}
