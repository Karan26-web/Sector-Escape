// ---------------------------------------------------------------------------
// World-anchored HTML labels (θ, r, "ENEMIES INCOMING" markers etc.)
// ---------------------------------------------------------------------------
import * as THREE from '../../vendor/three.module.js';

export class LabelLayer {
  constructor(container, camera) {
    this.container = container; this.camera = camera; this.items = new Map(); this._v = new THREE.Vector3();
  }
  /** worldPos: THREE.Vector3 or () => Vector3. */
  add(id, html, { className = '', worldPos, offset = [0, 0], visible = true } = {}) {
    this.remove(id);
    const el = document.createElement('div');
    el.className = 'wlabel ' + className; el.innerHTML = html; el.style.opacity = visible ? '1' : '0';
    this.container.appendChild(el);
    this.items.set(id, { el, worldPos, offset });
    requestAnimationFrame(() => el.classList.add('in'));
    return el;
  }
  get(id) { const it = this.items.get(id); return it ? it.el : null; }
  set(id, html) { const el = this.get(id); if (el) el.innerHTML = html; }
  remove(id, fade = false) {
    const it = this.items.get(id); if (!it) return;
    this.items.delete(id);
    if (fade) { it.el.classList.remove('in'); it.el.classList.add('out'); setTimeout(() => it.el.remove(), 400); } else it.el.remove();
  }
  clear(fade = false) { for (const id of [...this.items.keys()]) this.remove(id, fade); }
  update() {
    if (!this.items.size) return;
    const w = this.container.clientWidth, h = this.container.clientHeight;
    for (const it of this.items.values()) {
      const p = typeof it.worldPos === 'function' ? it.worldPos() : it.worldPos;
      this._v.copy(p).project(this.camera);
      const behind = this._v.z > 1;
      const x = (this._v.x * 0.5 + 0.5) * w + it.offset[0], y = (-this._v.y * 0.5 + 0.5) * h + it.offset[1];
      it.el.style.transform = `translate(-50%, -50%) translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
      it.el.style.visibility = behind ? 'hidden' : 'visible';
    }
  }
}
