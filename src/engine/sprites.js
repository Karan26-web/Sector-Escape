// ---------------------------------------------------------------------------
// Sprite-sheet animated billboards (THREE.Sprite) + blob shadows
// ---------------------------------------------------------------------------
import * as THREE from '../../vendor/three.module.js';
import { assets } from './assets.js';

export class AnimatedSprite {
  /**
   * @param {string} sheetName  manifest key
   * @param {object} o { worldHeight, center:[x,y] (THREE sprite center; [0.5,0] = feet), tint, fps }
   */
  constructor(sheetName, o = {}) {
    this.sheetName = sheetName;
    this.def = assets.frames(sheetName);
    const base = assets.texture(sheetName, { wrap: false });
    this.tex = base.clone(); this.tex.needsUpdate = true;
    this.tex.wrapS = this.tex.wrapT = THREE.ClampToEdgeWrapping;
    this.tex.repeat.set(1 / this.def.cols, 1 / this.def.rows);
    this.material = new THREE.SpriteMaterial({ map: this.tex, transparent: true, alphaTest: 0.02, depthWrite: false, depthTest: true, color: o.tint ?? 0xffffff });
    this.sprite = new THREE.Sprite(this.material);
    const c = o.center ?? [0.5, 1 - (this.def.baseline ?? 1)];   // anchor at the measured feet line, not the cell edge
    this.sprite.center.set(c[0], c[1]);
    this.worldHeight = o.worldHeight ?? this.def.worldHeight;
    this.aspect = this.def.frameW / this.def.frameH;
    this.baseScale = new THREE.Vector3(this.worldHeight * this.aspect, this.worldHeight, 1);
    this.sprite.scale.copy(this.baseScale);
    this.anim = null; this.animName = ''; this.frame = 0; this.time = 0; this.speed = 1; this.flipX = false; this.onComplete = null; this.finished = false;
    this.play(o.anim ?? Object.keys(this.def.anims)[0]);
  }
  get position() { return this.sprite.position; }
  hasAnim(name) { return !!this.def.anims[name]; }
  play(name, { restart = false, speed = 1, onComplete = null } = {}) {
    if (!this.def.anims[name]) name = Object.keys(this.def.anims)[0];
    if (this.animName === name && !restart) { this.speed = speed; if (onComplete) this.onComplete = onComplete; return this; }
    this.anim = this.def.anims[name]; this.animName = name; this.frame = 0; this.time = 0; this.phase = 0; this.speed = speed; this.finished = false; this.onComplete = onComplete;
    this._apply(); return this;
  }
  /** Show one frame of an animation and keep it (no playback): poses held for a beat, e.g. Karan sitting after a fall. */
  hold(name, frame) { this.play(name, { restart: true }); this.frame = Math.max(0, Math.min(frame, (this.anim.frames ?? 1) - 1)); this.finished = true; this._apply(); return this; }
  setFlip(f) { if (this.flipX !== f) { this.flipX = f; this._apply(); } }
  setScale(mul) { this.sprite.scale.set(this.baseScale.x * mul, this.baseScale.y * mul, 1); }
  update(dt) {
    if (!this.anim || this.finished) return;
    const fps = (this.anim.fps ?? 8) * this.speed;
    this.time += dt; this.phase = (this.phase ?? this.time * fps) + dt * fps;   // accumulate: speed may change every frame
    const total = this.anim.frames ?? 1;
    const f = Math.floor(this.phase);
    if (this.anim.loop === false) {
      if (f >= total) { this.frame = total - 1; this.finished = true; this._apply(); if (this.onComplete) { const cb = this.onComplete; this.onComplete = null; cb(); } return; }
      this.frame = f;
    } else this.frame = f % total;
    this._apply();
  }
  _apply() {
    if (!this.anim) return;
    const cols = this.def.cols, rows = this.def.rows;
    const idx = (this.anim.col ?? 0) + this.frame, col = idx % cols, row = (this.anim.row ?? 0) + Math.floor(idx / cols);   // long anims wrap onto the next rows
    if (this.flipX) { this.tex.repeat.x = -1 / cols; this.tex.offset.x = (col + 1) / cols; }
    else { this.tex.repeat.x = 1 / cols; this.tex.offset.x = col / cols; }
    this.tex.offset.y = 1 - (row + 1) / rows;
  }
  dispose() { this.material.dispose(); this.tex.dispose(); }
}

let _shadowTex = null;
function shadowTexture() {
  if (_shadowTex) return _shadowTex;
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  const grd = g.createRadialGradient(64, 64, 10, 64, 64, 64); grd.addColorStop(0, 'rgba(0,0,0,0.55)'); grd.addColorStop(0.7, 'rgba(0,0,0,0.35)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
  _shadowTex = new THREE.CanvasTexture(c); return _shadowTex;
}
/** Soft blob shadow lying on the floor. */
/** How far to raise standing character sprites off the floor for the current camera (metres).
 *  A camera-facing sprite seen from a near-vertical camera lies almost flat, a few cm above the floor, where the ring
 *  floors' depth offsets (they keep overlapping rings from flickering) win the depth test and hide it. Lifting it
 *  0.35 m in steep views fixes that; the parallax at 85° is ~3 cm, so nothing visibly moves. 0 below 55° pitch. */
const _fwd = new THREE.Vector3();
export function topDownLift(camera) {
  _fwd.set(0, 0, -1).applyQuaternion(camera.quaternion);
  const pitch = Math.asin(Math.min(1, Math.max(-1, -_fwd.y))) * 57.2958;
  return Math.min(1, Math.max(0, (pitch - 55) / 25)) * 0.35;
}

export function makeShadow(radius = 0.5, opacity = 1) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(radius * 2, radius * 2), new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false, opacity }));
  m.rotation.x = -Math.PI / 2; m.position.y = 0.02; m.renderOrder = -1; return m;
}

/** Static billboard (single image or one cell of a sheet) e.g. torch flame, tree, fern. */
export function makeBillboard(name, worldHeight, o = {}) {
  const def = assets.frames(name);
  let tex = assets.texture(name, { wrap: false });
  if (o.frame != null && (def.cols > 1 || def.rows > 1)) {
    tex = tex.clone(); tex.needsUpdate = true; tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    const col = o.frame % def.cols, row = Math.floor(o.frame / def.cols);
    tex.repeat.set(1 / def.cols, 1 / def.rows); tex.offset.set(col / def.cols, 1 - (row + 1) / def.rows);
  }
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, alphaTest: o.alphaTest ?? 0.05, depthWrite: o.depthWrite ?? false, color: o.tint ?? 0xffffff, fog: o.fog ?? true, blending: o.additive ? THREE.AdditiveBlending : THREE.NormalBlending, opacity: o.opacity ?? 1 });
  const s = new THREE.Sprite(mat); s.center.set(0.5, o.centerY ?? 1 - (def.baseline ?? 1));
  s.scale.set(worldHeight * (def.frameW / def.frameH), worldHeight, 1);
  return s;
}
