// ---------------------------------------------------------------------------
// Camera rig: cinematic pose tweens, damped follow, screen shake
// ---------------------------------------------------------------------------
import * as THREE from '../../vendor/three.module.js';
import { tweens } from './tween.js';
import { Ease, damp } from './util.js';

export class CameraRig {
  constructor(camera) {
    this.camera = camera;
    this.pos = new THREE.Vector3(0, 10, 20);
    this.target = new THREE.Vector3(0, 1, 0);
    this.fov = 50;
    this.followFn = null; this.followLambda = 4;
    this.shakeAmt = 0; this.shakeTime = 0;
    this._tween = null;
    this.mode = 'static';
    this._tmp = new THREE.Vector3();
  }
  /** A cut: jump to the pose (any camera move in progress stops). */
  setPose(p) {
    if (this._tween) { this._tween.cancel(); this._tween = null; }
    if (p.pos) this.pos.copy(p.pos); if (p.target) this.target.copy(p.target); if (p.fov) this.fov = p.fov;
    this.mode = 'static'; this.followFn = null; this._apply();
  }
  /** Smoothly move to a pose. Returns a promise. */
  moveTo(p, duration = 1.5, ease = Ease.inOutCubic) {
    if (this._tween) this._tween.cancel();
    const from = { pos: this.pos.clone(), target: this.target.clone(), fov: this.fov };
    const to = { pos: p.pos ? p.pos.clone() : from.pos.clone(), target: p.target ? p.target.clone() : from.target.clone(), fov: p.fov ?? from.fov };
    this.mode = 'tween'; this.followFn = null;
    this._tween = tweens.add({
      duration, ease,
      onUpdate: (e) => { this.pos.lerpVectors(from.pos, to.pos, e); this.target.lerpVectors(from.target, to.target, e); this.fov = from.fov + (to.fov - from.fov) * e; },
      onComplete: () => { this.mode = 'static'; this._tween = null; },
    });
    return this._tween.promise;
  }
  /** fn(out) must fill out.pos / out.target / out.fov each frame. */
  follow(fn, lambda = 4) { if (this._tween) { this._tween.cancel(); this._tween = null; } this.followFn = fn; this.followLambda = lambda; this.mode = 'follow'; }
  shake(amount = 0.3, time = 0.4) { this.shakeAmt = Math.max(this.shakeAmt, amount); this.shakeTime = Math.max(this.shakeTime, time); }
  update(dt) {
    if (this.mode === 'follow' && this.followFn) {
      const want = this.followFn(this._want || (this._want = { pos: new THREE.Vector3(), target: new THREE.Vector3(), fov: this.fov }));
      const k = 1 - Math.exp(-this.followLambda * dt);
      this.pos.lerp(want.pos, k); this.target.lerp(want.target, k); this.fov = damp(this.fov, want.fov ?? this.fov, this.followLambda, dt);
    }
    this._apply(dt);
  }
  _apply(dt = 0) {
    const cam = this.camera;
    cam.position.copy(this.pos);
    if (this.shakeTime > 0) {
      this.shakeTime -= dt; const a = this.shakeAmt * Math.min(1, this.shakeTime / 0.4);
      cam.position.x += (Math.random() - 0.5) * a; cam.position.y += (Math.random() - 0.5) * a; cam.position.z += (Math.random() - 0.5) * a;
      if (this.shakeTime <= 0) this.shakeAmt = 0;
    }
    cam.lookAt(this.target);
    if (Math.abs(cam.fov - this.fov) > 0.01) { cam.fov = this.fov; cam.updateProjectionMatrix(); }
  }
}
