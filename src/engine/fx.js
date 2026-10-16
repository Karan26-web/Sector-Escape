// ---------------------------------------------------------------------------
// Particle / flash / shockwave effects built from sprites and simple meshes
// ---------------------------------------------------------------------------
import * as THREE from '../../vendor/three.module.js';
import { assets } from './assets.js';
import { AnimatedSprite, makeBillboard } from './sprites.js';
import { tweens } from './tween.js';
import { Ease } from './util.js';

export class FX {
  constructor(world) {
    this.world = world; this.group = new THREE.Group(); world.add(this.group);
    this.particles = []; this.anims = [];
    this._sparkMat = null; this._smokeMat = null;
  }
  _mat(name, additive = true, color = 0xffffff) {
    return new THREE.SpriteMaterial({ map: assets.texture(name, { wrap: false }), transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, color });
  }
  /** Sprite-sheet explosion (auto removed). */
  explosion(pos, size = 2.8, delay = 0) {
    const run = () => {
      const s = new AnimatedSprite('fx_explosion', { worldHeight: size, center: [0.5, 0.35], anim: 'boom' });
      s.material.depthTest = false; s.sprite.renderOrder = 20;
      s.sprite.position.copy(pos); this.group.add(s.sprite); this.anims.push(s);
      s.play('boom', { restart: true, onComplete: () => { this.group.remove(s.sprite); this.anims = this.anims.filter((a) => a !== s); s.dispose(); } });
      this.sparks(pos, 10, 0xffb060, 5); this.flash(pos, 0xffc080, size * 1.2, 0.25);
    };
    if (delay > 0) tweens.delay(delay).promise.then(run); else run();
  }
  /** Burst of small additive sparks with gravity. */
  sparks(pos, n = 12, color = 0xffffff, speed = 4, life = 0.7, size = 0.35) {
    for (let i = 0; i < n; i++) {
      const sp = new THREE.Sprite(this._mat('fx_spark', true, color)); sp.scale.setScalar(size * (0.6 + Math.random() * 0.8));
      sp.position.copy(pos); sp.position.y += 0.6; this.group.add(sp);
      const a = Math.random() * Math.PI * 2, up = Math.random();
      this.particles.push({ s: sp, v: new THREE.Vector3(Math.cos(a) * speed * Math.random(), 2 + up * speed, Math.sin(a) * speed * Math.random()), life, t: 0, g: -12, shrink: true });
    }
  }
  /** Soft smoke/dust puff. */
  dust(pos, n = 1, color = 0xd8d0b8, size = 0.6) {
    for (let i = 0; i < n; i++) {
      const sp = new THREE.Sprite(this._mat('fx_smoke', false, color)); sp.material.opacity = 0.35; sp.scale.setScalar(size);
      sp.position.copy(pos).add(new THREE.Vector3((Math.random() - 0.5) * 0.5, 0.15, (Math.random() - 0.5) * 0.5)); this.group.add(sp);
      this.particles.push({ s: sp, v: new THREE.Vector3((Math.random() - 0.5) * 0.6, 0.6 + Math.random() * 0.5, (Math.random() - 0.5) * 0.6), life: 0.8, t: 0, g: 0, grow: 1.6, fade: true });
    }
  }
  smoke(pos, n = 6, color = 0x555555, size = 1.4) {
    for (let i = 0; i < n; i++) {
      const sp = new THREE.Sprite(this._mat('fx_smoke', false, color)); sp.material.opacity = 0.5; sp.scale.setScalar(size * (0.7 + Math.random() * 0.6));
      sp.position.copy(pos).add(new THREE.Vector3((Math.random() - 0.5), 0.5 + Math.random(), (Math.random() - 0.5))); this.group.add(sp);
      this.particles.push({ s: sp, v: new THREE.Vector3((Math.random() - 0.5) * 1.2, 1 + Math.random(), (Math.random() - 0.5) * 1.2), life: 1.6, t: 0, g: 0, grow: 1.8, fade: true });
    }
  }
  /** Quick additive glow flash. */
  flash(pos, color = 0xffffff, size = 3, dur = 0.3, hold = 0) {
    const sp = new THREE.Sprite(this._mat('fx_glow', true, color)); sp.position.copy(pos); sp.scale.setScalar(size * 0.3); sp.material.depthTest = false; sp.renderOrder = 30; this.group.add(sp);
    tweens.add({ duration: dur, delay: hold, ease: Ease.outCubic, onUpdate: (e) => { sp.scale.setScalar(size * (0.3 + e)); sp.material.opacity = 1 - e; }, onComplete: () => { this.group.remove(sp); sp.material.dispose(); } });
    return sp;
  }
  /** Expanding ring on the floor. */
  shockwave(pos, maxRadius = 10, dur = 0.7, color = 0x9ff4ff) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ map: assets.texture('fx_shockwave', { wrap: false }), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color, side: THREE.DoubleSide }));
    m.rotation.x = -Math.PI / 2; m.position.copy(pos); m.position.y += 0.08; m.renderOrder = 15; this.group.add(m);
    tweens.add({ duration: dur, ease: Ease.outCubic, onUpdate: (e) => { m.scale.setScalar(Math.max(0.01, maxRadius * e)); m.material.opacity = 1 - e; }, onComplete: () => { this.group.remove(m); m.geometry.dispose(); m.material.dispose(); } });
  }
  /** Click-to-move marker. */
  marker(pos) { this.shockwave(pos, 1.2, 0.5, 0x7fe6ff); }
  /** Full-screen style damage vignette is CSS; this is a 3D red burst at a point. */
  hit(pos) { this.flash(pos, 0xff3030, 3.5, 0.4); this.sparks(pos, 16, 0xff6040, 6, 0.6); }

  update(dt) {
    for (const a of this.anims) a.update(dt);
    const keep = [];
    for (const p of this.particles) {
      p.t += dt; const k = p.t / p.life;
      if (k >= 1) { this.group.remove(p.s); p.s.material.dispose(); continue; }
      p.v.y += p.g * dt; p.s.position.addScaledVector(p.v, dt);
      if (p.s.position.y < 0.05 && p.g) { p.s.position.y = 0.05; p.v.y *= -0.3; p.v.x *= 0.6; p.v.z *= 0.6; }
      if (p.shrink) p.s.scale.setScalar(p.s.scale.x * (1 - dt * 1.5));
      if (p.grow) p.s.scale.setScalar(p.s.scale.x * (1 + dt * (p.grow - 1)));
      if (p.fade) p.s.material.opacity = (1 - k) * 0.5; else p.s.material.opacity = 1 - k * k;
      keep.push(p);
    }
    this.particles = keep;
  }
  clear() { for (const p of this.particles) this.group.remove(p.s); this.particles = []; for (const a of this.anims) this.group.remove(a.sprite); this.anims = []; }
}
