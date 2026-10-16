// ---------------------------------------------------------------------------
// Renderer / scene / main loop
// ---------------------------------------------------------------------------
import * as THREE from '../../vendor/three.module.js';
import { CameraRig } from './camera.js';
import { LabelLayer } from './labels.js';
import { Input } from './input.js';
import { tweens } from './tween.js';
import { assets } from './assets.js';

export class World {
  constructor(canvasHost, labelHost) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NoToneMapping;
    canvasHost.appendChild(this.renderer.domElement);
    assets.setRenderer(this.renderer);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.1, 600);
    this.rig = new CameraRig(this.camera);
    this.labels = new LabelLayer(labelHost, this.camera);
    this.input = new Input(this.renderer.domElement);
    this.updatables = new Set();
    this.clock = new THREE.Clock();
    this.timeScale = 1; this.paused = false; this.elapsed = 0;
    this._resize = () => this.resize(); window.addEventListener('resize', this._resize); this.resize();
    this.running = false;
    this.onFrame = null;
  }
  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.renderer.domElement.style.width = w + 'px'; this.renderer.domElement.style.height = h + 'px';
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
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
      let dt = Math.min(0.05, this.clock.getDelta()) * this.timeScale;
      if (this.paused) dt = 0;
      this.elapsed += dt;
      tweens.update(dt);
      for (const u of this.updatables) u.update(dt, this.elapsed);
      this.rig.update(dt);
      if (this.onFrame) this.onFrame(dt);
      this.labels.update();
      this.renderer.render(this.scene, this.camera);
    };
    requestAnimationFrame(loop);
  }
  /** Raycast NDC point against the y=0 floor plane. */
  floorPoint(ndcX, ndcY, out = new THREE.Vector3()) {
    const ray = new THREE.Raycaster(); ray.setFromCamera({ x: ndcX, y: ndcY }, this.camera);
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    return ray.ray.intersectPlane(plane, out) ? out : null;
  }
}
