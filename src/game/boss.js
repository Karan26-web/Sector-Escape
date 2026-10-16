// ---------------------------------------------------------------------------
// The Sector Warden – final boss with three sector shields
// ---------------------------------------------------------------------------
import * as THREE from '../../vendor/three.module.js';
import { AnimatedSprite, makeShadow, makeBillboard } from '../engine/sprites.js';
import { tweens, tweenValue } from '../engine/tween.js';
import { polar, DEG, Ease } from '../engine/util.js';
import { audio } from '../engine/audio.js';

export class Boss {
  constructor(world, fx, level) {
    this.world = world; this.fx = fx; this.level = level;
    const R = level.radius, deg = level.boss.standDeg;
    this.group = new THREE.Group();
    this.spr = new AnimatedSprite('boss_warden', { worldHeight: 6.5 });
    this.shadow = makeShadow(2.2, 0.9);
    const p = polar(deg, R - 5.5); this.group.position.set(p.x, 0, p.z);
    this.group.add(this.spr.sprite, this.shadow);
    this.shields = [];
    const n = level.boss.shields;
    for (let i = 0; i < n; i++) {
      const arc = 360 / n - 18;
      const m = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.2, 5.5, 24, 1, true, (i * 360 / n) * DEG, arc * DEG), new THREE.MeshBasicMaterial({ color: 0xb060ff, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      m.position.y = 3; this.group.add(m); this.shields.push(m);
    }
    this.glow = makeBillboard('fx_glow', 7, { additive: true, tint: 0xa050ff, centerY: 0.5 }); this.glow.position.y = 3.2; this.glow.material.opacity = 0.35; this.group.add(this.glow);
    this.light = new THREE.PointLight(0xa050ff, 30, 25, 2); this.light.position.y = 4; this.group.add(this.light);
    world.add(this.group); this.t = 0; this.alive = true;
  }
  get position() { return this.group.position; }
  roar() { audio.play('boss.roar'); this.world.rig.shake(0.3, 0.8); this.fx.flash(this.position.clone().add(new THREE.Vector3(0, 3, 0)), 0xc06cff, 10, 0.6); }
  async breakShield(i) {
    const m = this.shields[i]; if (!m || !m.visible) return;
    audio.play('boss.shield.break'); this.spr.play('hurt', { restart: true });
    this.fx.sparks(this.position.clone().add(new THREE.Vector3(0, 3, 0)), 30, 0xd090ff, 7, 1, 0.5);
    await tweenValue(0, 1, 0.5, (v) => { m.material.opacity = 0.35 + Math.sin(v * Math.PI) * 0.6; m.scale.setScalar(1 + v * 0.4); }, { ease: Ease.outCubic });
    m.visible = false; this.world.rig.shake(0.25, 0.4);
    tweens.delay(0.6).promise.then(() => { if (this.alive) this.spr.play('idle'); });
  }
  async defeat() {
    this.alive = false; audio.play('boss.defeat'); this.spr.play('defeat', { restart: true });
    const p = this.position.clone();
    for (let i = 0; i < 7; i++) tweens.delay(i * 0.22).promise.then(() => this.fx.explosion(p.clone().add(new THREE.Vector3((Math.random() - 0.5) * 4, 1 + Math.random() * 4, (Math.random() - 0.5) * 2)), 4));
    this.world.rig.shake(0.6, 1.8);
    await tweenValue(0, 1, 1.6, (v) => { this.glow.material.opacity = 0.35 + v * 0.65; this.glow.scale.setScalar(7 + v * 10); this.light.intensity = 30 + v * 200; });
    this.fx.flash(p.clone().add(new THREE.Vector3(0, 3, 0)), 0xffffff, 40, 0.9);
    await tweenValue(1, 0, 0.8, (v) => { this.spr.material.opacity = v; this.glow.material.opacity = v; this.light.intensity = 230 * v; this.shadow.material.opacity = v; });
    this.group.visible = false;
  }
  update(dt) {
    this.t += dt; this.spr.update(dt);
    if (this.alive) { this.spr.sprite.position.y = 0.3 + Math.sin(this.t * 1.5) * 0.25; this.group.rotation.y = 0; this.shields.forEach((m, i) => { m.rotation.y = this.t * 0.5 * (i % 2 ? -1 : 1); m.material.opacity = 0.18 + Math.sin(this.t * 2 + i) * 0.06; }); this.glow.material.opacity = 0.3 + Math.sin(this.t * 2) * 0.1; }
  }
  dispose() { this.world.remove(this.group); this.spr.dispose(); }
}
