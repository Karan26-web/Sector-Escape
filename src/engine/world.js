// ---------------------------------------------------------------------------
// Renderer / scene / main loop
// ---------------------------------------------------------------------------
import * as THREE from '../../vendor/three.module.js';
import { CameraRig } from './camera.js';
import { LabelLayer } from './labels.js';
import { tweens } from './tween.js';
import { assets } from './assets.js';

export class World {
  constructor(canvasHost, labelHost) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.maxPR = Math.min(window.devicePixelRatio || 1, 1.5); this.pr = this.maxPR; this._ft = 1 / 60; this._prTimer = 0;
    this.renderer.setPixelRatio(this.pr);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NoToneMapping;
    canvasHost.appendChild(this.renderer.domElement);
    // a pinch on the 3D view must not zoom the page (iOS ignores user-scalable=no): the dock and keypad slid off-screen
    this.renderer.domElement.style.touchAction = 'none'; document.addEventListener('gesturestart', (e) => e.preventDefault());
    assets.setRenderer(this.renderer);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.5, 900);
    this.rig = new CameraRig(this.camera);
    this.labels = new LabelLayer(labelHost, this.camera); this.labelLayers = [this.labels];
    this.updatables = new Set();
    this.clock = new THREE.Clock();
    this.timeScale = 1; this.paused = false; this.elapsed = 0;
    this.sleeping = false;   // an opaque full-screen UI (the map) covers the 3D view: skip updating and rendering it
    this._resize = () => this.resize(); window.addEventListener('resize', this._resize); this.resize();
    this.running = false;
    this.onFrame = null;
  }
  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.renderer.domElement.style.width = w + 'px'; this.renderer.domElement.style.height = h + 'px';
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    if (this.onResize) this.onResize();   // (a tablet turned mid-question: the scene frames its view again)
  }
  add(obj) { this.scene.add(obj); return obj; }
  remove(obj) { this.scene.remove(obj); }
  addUpdatable(u) { this.updatables.add(u); return u; }
  removeUpdatable(u) { this.updatables.delete(u); }
  start() {
    if (this.running) return; this.running = true; this.clock.start();
    const loop = () => {
      if (!this.running) return;
      requestAnimationFrame(loop);
      const raw = this.clock.getDelta();
      if (this.sleeping) return;
      // adaptive resolution: drop the pixel ratio when frames are slow, restore when they are fast
      //   measured against the screen's own frame gap (the shortest in the window): a 60 Hz screen never gets under 16.7 ms,
      //   so the old 13 ms bar never restored it, and a 30 fps cap (iOS Low Power) is not slowness
      this._ft += (Math.min(raw, 0.1) - this._ft) * 0.05; this._prTimer += raw; this._gap = Math.min(this._gap ?? 1, Math.max(raw, 1 / 144));
      if (this._prTimer > 2) {
        const gap = this._gap; this._prTimer = 0; this._gap = 1;
        if (this._ft > Math.max(0.028, gap * 1.6) && this.pr > 0.75) { this.pr = Math.max(0.75, this.pr - 0.25); this.renderer.setPixelRatio(this.pr); }
        else if (this._ft < Math.max(1 / 55, gap * 1.2) && this.pr < this.maxPR) { this.pr = Math.min(this.maxPR, this.pr + 0.25); this.renderer.setPixelRatio(this.pr); }
      }
      let dt = Math.min(0.05, raw) * this.timeScale;
      if (this.paused) dt = 0;
      this.elapsed += dt;
      tweens.update(dt);
      for (const u of this.updatables) u.update(dt, this.elapsed);
      this.rig.update(dt); this.camera.updateMatrixWorld();   // (lookAt leaves the matrix a frame behind: labels slipped against their lines)
      if (this.onFrame) this.onFrame(dt);
      for (const l of this.labelLayers) l.update();
      this.renderer.render(this.scene, this.camera);
    };
    requestAnimationFrame(loop);
  }
}
