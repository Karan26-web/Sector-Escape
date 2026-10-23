// ---------------------------------------------------------------------------
// Hero: billboard character with front/back sheets, scripted movement & footsteps.
// Karan is never steered by the player (LXD 2026-10-23): he walks to his
// observation point in each arena, watches, and moves on once it is cleared.
// ---------------------------------------------------------------------------
import * as THREE from '../../vendor/three.module.js';
import { AnimatedSprite, makeShadow, topDownLift } from '../engine/sprites.js';
import { audio } from '../engine/audio.js';
import { tweens, tweenValue } from '../engine/tween.js';
import { clamp, Ease } from '../engine/util.js';

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
    this.target = null;          // where a scripted run is heading
    this.special = null;         // name of a non-locomotion anim currently playing
    this.stepTimer = 0; this.surface = 'stone';
    this.onArrive = null;
    world.add(this.group);
    this._tmp = new THREE.Vector3(); this._tmp2 = new THREE.Vector3();
  }
  get visibleSprite() { return this.back.sprite.visible ? this.back : this.front; }
  setPosition(v) { this.pos.copy(v); this.pos.y = 0; }
  face(dir) { if (dir.lengthSq() > 1e-6) { this.facing.copy(dir).setY(0).normalize(); } }
  faceTo(point) { this.face(this._tmp.copy(point).sub(this.pos)); }

  /** Run to a point (cutscene). Resolves when within `within` m (0.35 by default; small for a designated spot).
   *  face: keep looking at this point while moving (a backstep). */
  runTo(point, speed = this.speed, { face = null, within = 0.35 } = {}) {
    this.target = point.clone(); this.target.y = 0; this.runSpeed = speed; this.lookAt = face ? face.clone() : null; this.within = within;
    this.runT = 0; this.runMax = this.distTo(this.target) / speed * 1.8 + 1.5;   // watchdog (update): past this he steps onto the spot
    return new Promise((res) => { this.onArrive = res; });
  }
  /** Run through several points in order. */
  async runPath(points, speed = this.speed) { for (const p of points) await this.runTo(p, speed); }
  distTo(p) { return Math.hypot(this.pos.x - p.x, this.pos.z - p.z); }
  stop() { this.target = null; this.lookAt = null; this.vel.set(0, 0, 0); }   // (a pending runTo stays pending: an aborted scene's flow must not resume)

  /** Play a one-shot animation on the front sheet; resolves when done. */
  playSpecial(name, { hold = 0 } = {}) {
    return new Promise((res) => {
      const s = this.front; this.showFront(true); this.special = name;
      if (!s.hasAnim(name)) { this.special = null; res(); return; }
      s.play(name, { restart: true, onComplete: () => { tweens.delay(hold).promise.then(() => { if (this.special === name) this.special = null; res(); }); } });
      if (s.def.anims[name].loop !== false) { tweens.delay(hold || 1).promise.then(() => { if (this.special === name) this.special = null; res(); }); }
    });
  }
  showFront(f) { this.front.sprite.visible = f; this.back.sprite.visible = !f; }
  /** A hit he stays on his feet for (a guardian's blow): a red flash and a flinch. */
  async hurt() {
    this.flash(0xff4040, 0.5);
    const s = this.front; if (!s.hasAnim('hurt')) return;
    this.showFront(true); this.special = 'hurt';
    s.hold('hurt', 0); await tweens.delay(0.16).promise; s.hold('hurt', 1); await tweens.delay(0.3).promise;
    if (this.special === 'hurt') this.special = null;
  }
  /** Knocked down by the reflected charge (LXD 2026-10-23): thrown back away from `from`, falls, sits dazed, gets up.
   *  The front sheet is right for this from every camera: from above, someone knocked onto his back is seen face-up. */
  async knockdown(from) {
    const s = this.front, away = this._tmp2.copy(this.pos).sub(from).setY(0);
    if (away.lengthSq() < 1e-4) away.copy(this.facing).multiplyScalar(-1); away.normalize();
    const p0 = this.pos.clone(), p1 = p0.clone().addScaledVector(away, 1.4);
    this.stop(); this.flash(0xff4f7a, 0.7); this.showFront(true); this.special = 'knockdown';
    const has = s.hasAnim('hurt'), pose = (f) => { if (has) s.hold('hurt', f); };
    pose(0);
    await tweenValue(0, 1, 0.42, (e) => { this.pos.lerpVectors(p0, p1, e); }, { ease: Ease.outCubic });
    pose(1); await tweens.delay(0.14).promise;
    pose(2); audio.play('hero.fall'); if (this.fx) { this.fx.dust(this.pos, 4, 0xd8d0b8, 0.9); } this.world.rig.shake(0.25, 0.3);
    await tweens.delay(0.95).promise;                                  // a beat on the floor: the consequence has to read
    pose(3); await tweens.delay(0.4).promise;
    if (this.special === 'knockdown') this.special = null;
  }
  /** Casting the charge toward the gap: the back sheet's cast row (seen from behind in the top view) plays once and holds
   *  its last pose until endCast(). Without that art it does nothing (the charge still gathers at O by itself). */
  cast() {
    const s = this.back; if (!s.hasAnim('cast')) return Promise.resolve();
    this.stop(); this.showFront(false); this.special = 'cast'; s.setFlip(false);
    return new Promise((res) => s.play('cast', { restart: true, onComplete: res }));
  }
  endCast() { if (this.special === 'cast') this.special = null; }
  celebrate(hold = 1.6) { return this.playSpecial('win', { hold }); }
  flash(color, dur = 0.4) {
    for (const s of [this.front, this.back]) { s.material.color.setHex(color); }
    tweens.add({ duration: dur, onUpdate: (e) => { for (const s of [this.front, this.back]) s.material.color.lerpColors(new THREE.Color(color), new THREE.Color(0xffffff), e); } });
  }

  update(dt) {
    const w = this.world, cam = w.camera;
    const lift = topDownLift(cam); this.front.sprite.position.y = lift; this.back.sprite.position.y = lift;   // visible from the puzzle camera
    const ro = lift > 0 ? 16 : 0; this.front.sprite.renderOrder = ro; this.back.sprite.renderOrder = ro;           // ...and drawn over the floor overlays (the dim)
    // ---- scripted movement
    const move = this._tmp.set(0, 0, 0); let moving = false;
    if (this.target && this.special !== 'knockdown') {
      move.copy(this.target).sub(this.pos).setY(0);
      const d = move.length();
      if (d >= (this.within ?? 0.35) && (this.runT += dt) > this.runMax) { this.pos.x = this.target.x; this.pos.z = this.target.z; move.set(0, 0, 0); }   // stuck: finish the run
      if (move.length() < (this.within ?? 0.35)) { this.target = null; this.vel.set(0, 0, 0); if (this.lookAt) { this.faceTo(this.lookAt); this.lookAt = null; } const cb = this.onArrive; this.onArrive = null; if (cb) cb(); }
      else { move.normalize(); moving = true; if (d < 0.6) move.multiplyScalar(Math.max(0.25, d / 0.6)); }   // ease into a designated spot
    }
    const spd = this.runSpeed || this.speed;
    if (moving) { this.vel.lerp(move.multiplyScalar(spd), 1 - Math.exp(-12 * dt)); this.face(this.lookAt ? this._tmp2.copy(this.lookAt).sub(this.pos) : this.vel); }
    else this.vel.multiplyScalar(Math.exp(-14 * dt));
    if (this.special !== 'knockdown') this.pos.addScaledVector(this.vel, dt);
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
    } else if (this.special === 'knockdown' || this.special === 'hurt') this.front.setFlip(false);
    this.front.update(dt); this.back.update(dt);
  }
  dispose() { this.world.remove(this.group); this.front.dispose(); this.back.dispose(); }
}
