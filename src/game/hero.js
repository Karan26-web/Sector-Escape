// ---------------------------------------------------------------------------
// Hero: billboard character with front/back sheets, movement & footsteps
// ---------------------------------------------------------------------------
import * as THREE from '../../vendor/three.module.js';
import { AnimatedSprite, makeShadow, topDownLift } from '../engine/sprites.js';
import { audio } from '../engine/audio.js';
import { tweens } from '../engine/tween.js';
import { clamp } from '../engine/util.js';

export class Hero {
  constructor(world, fx) {
    this.world = world; this.fx = fx;
    this.group = new THREE.Group();
    this.front = new AnimatedSprite('hero_front', { worldHeight: 1.75 });
    this.back = new AnimatedSprite('hero_back', { worldHeight: 1.75 });
    this.shadow = makeShadow(0.6, 0.9);
    this.group.add(this.front.sprite, this.back.sprite, this.shadow);
    this.back.sprite.visible = false;
    this.pos = this.group.position;
    this.vel = new THREE.Vector3();
    this.facing = new THREE.Vector3(0, 0, -1);
    this.speed = 6.5;
    this.control = false;        // player control enabled
    this.target = null;          // click-to-move target
    this.boundsRadius = null;    // keep inside the current arena (around boundsCenter)
    this.keepOutRadius = null;   // stay off the gun pedestal
    this.boundsCenter = new THREE.Vector3();
    this.special = null;         // name of a non-locomotion anim currently playing
    this.stepTimer = 0; this.surface = 'stone';
    this.onArrive = null;
    this.hidden = false;
    world.add(this.group);
    this._tmp = new THREE.Vector3(); this._tmp2 = new THREE.Vector3();
  }
  get visibleSprite() { return this.back.sprite.visible ? this.back : this.front; }
  setPosition(v) { this.pos.copy(v); this.pos.y = 0; }
  face(dir) { if (dir.lengthSq() > 1e-6) { this.facing.copy(dir).setY(0).normalize(); } }
  faceTo(point) { this.face(this._tmp.copy(point).sub(this.pos)); }

  /** Run to a point (cutscene). Resolves when within 0.35 m. face: keep looking at this point while moving (a backstep). */
  runTo(point, speed = this.speed, { face = null } = {}) {
    this.target = point.clone(); this.target.y = 0; this.runSpeed = speed; this.control = false; this.lookAt = face ? face.clone() : null;
    return new Promise((res) => { this.onArrive = res; });
  }
  /** Run through several points in order. */
  async runPath(points, speed = this.speed) { for (const p of points) await this.runTo(p, speed); }
  distTo(p) { return Math.hypot(this.pos.x - p.x, this.pos.z - p.z); }
  stop() { this.target = null; this.lookAt = null; this.vel.set(0, 0, 0); }

  /** Play a one-shot animation on the visible sheet; resolves when done. */
  playSpecial(name, { hold = 0 } = {}) {
    return new Promise((res) => {
      const s = this.front; this.showFront(true); this.special = name;
      if (!s.hasAnim(name)) { this.special = null; res(); return; }
      s.play(name, { restart: true, onComplete: () => { tweens.delay(hold).promise.then(() => { if (this.special === name) this.special = null; res(); }); } });
      if (s.def.anims[name].loop !== false) { tweens.delay(hold || 1).promise.then(() => { if (this.special === name) this.special = null; res(); }); }
    });
  }
  showFront(f) { this.front.sprite.visible = f; this.back.sprite.visible = !f; }
  hurt() { this.flash(0xff4040, 0.5); return this.playSpecial('hurt', { hold: 0.3 }); }
  celebrate(hold = 1.6) { return this.playSpecial('win', { hold }); }
  flash(color, dur = 0.4) {
    for (const s of [this.front, this.back]) { s.material.color.setHex(color); }
    tweens.add({ duration: dur, onUpdate: (e) => { for (const s of [this.front, this.back]) s.material.color.lerpColors(new THREE.Color(color), new THREE.Color(0xffffff), e); } });
  }

  update(dt) {
    const w = this.world, cam = w.camera;
    const lift = topDownLift(cam); this.front.sprite.position.y = lift; this.back.sprite.position.y = lift;   // visible from the puzzle camera
    const ro = lift > 0 ? 16 : 0; this.front.sprite.renderOrder = ro; this.back.sprite.renderOrder = ro;           // ...and drawn over the floor overlays (the dim)
    // ---- movement
    let move = this._tmp.set(0, 0, 0); let moving = false;
    if (this.control && this.target && w.input.axis().active) { this.target = null; this.onArrive = null; } // player takes over from auto-run
    if (this.target) {
      move.copy(this.target).sub(this.pos).setY(0);
      const d = move.length();
      if (d < 0.35) { this.target = null; this.vel.set(0, 0, 0); if (this.lookAt) { this.faceTo(this.lookAt); this.lookAt = null; } const cb = this.onArrive; this.onArrive = null; if (cb) cb(); }
      else { move.normalize(); moving = true; }
    } else if (this.control) {
      const ax = w.input.axis();
      if (ax.active) {
        const fwd = this._tmp2.set(0, 0, -1).applyQuaternion(cam.quaternion).setY(0).normalize();
        const right = (this._right ||= new THREE.Vector3()).set(-fwd.z, 0, fwd.x);
        move.copy(fwd).multiplyScalar(ax.y).addScaledVector(right, ax.x).normalize(); moving = true;
      }
      const tap = w.input.consumeTap();
      if (tap) { const p = w.floorPoint(tap.x, tap.y); if (p) { if (this.boundsRadius && p.length() > this.boundsRadius) p.setLength(this.boundsRadius); this.target = p.clone(); this.fx && this.fx.marker(p); } }
    }
    const spd = this.target && !this.control ? (this.runSpeed || this.speed) : this.speed;
    if (moving) { this.vel.lerp(move.multiplyScalar(spd), 1 - Math.exp(-12 * dt)); this.face(this.lookAt ? this._tmp2.copy(this.lookAt).sub(this.pos) : this.vel); }
    else this.vel.multiplyScalar(Math.exp(-14 * dt));
    this.pos.addScaledVector(this.vel, dt);
    const bc = this.boundsCenter, dx = this.pos.x - bc.x, dz = this.pos.z - bc.z, l = Math.hypot(dx, dz);
    if (this.boundsRadius && l > this.boundsRadius) { this.pos.x = bc.x + dx * this.boundsRadius / l; this.pos.z = bc.z + dz * this.boundsRadius / l; }
    if (this.keepOutRadius && l < this.keepOutRadius && l > 1e-4) { this.pos.x = bc.x + dx * this.keepOutRadius / l; this.pos.z = bc.z + dz * this.keepOutRadius / l; }
    const speedNow = this.vel.length();
    // ---- footsteps
    if (speedNow > 1.5) { this.stepTimer -= dt * (speedNow / 6); if (this.stepTimer <= 0) { this.stepTimer = 0.3; audio.play(this.surface === 'grass' ? 'step.grass' : 'step.stone', { minGap: 0.12 }); if (this.fx) this.fx.dust(this.pos); } }
    // ---- choose sheet: back when facing away from camera
    if (!this.special) {
      // the camera's viewing direction (not its position): sprites face the camera plane, and from the near-vertical puzzle
      // camera (shifted sideways for the panel) the hero→camera vector is almost sideways and picked the wrong sheet
      const toCam = this._tmp2.set(0, 0, 1).applyQuaternion(cam.quaternion).setY(0).normalize();
      const facingCam = this.facing.dot(toCam);
      const showBack = facingCam < -0.15 ? true : facingCam > 0.15 ? false : this.back.sprite.visible;
      this.showFront(!showBack);
      const s = this.visibleSprite;
      s.play(speedNow > 0.8 ? 'run' : 'idle', { speed: speedNow > 0.8 ? clamp(speedNow / 6, 0.7, 1.4) : 1 });
      // mirror when moving to the camera's left
      const right = this._tmp.set(1, 0, 0).applyQuaternion(cam.quaternion).setY(0).normalize();
      const lat = this.facing.dot(right); if (lat < -0.45) this._flip = true; else if (lat > 0.45) this._flip = false;
      s.setFlip(!!this._flip);
    }
    this.front.update(dt); this.back.update(dt);
  }
  dispose() { this.world.remove(this.group); this.front.dispose(); this.back.dispose(); }
}
