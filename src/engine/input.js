// ---------------------------------------------------------------------------
// Keyboard + pointer input (tap-to-move friendly)
// ---------------------------------------------------------------------------
export class Input {
  constructor(el) {
    this.el = el; this.keys = new Set(); this.pointer = { x: 0, y: 0, down: false }; this.taps = [];
    this.enabled = true;
    window.addEventListener('keydown', (e) => { if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return; this.keys.add(e.code); if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault(); });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
    const toNdc = (e) => { const r = el.getBoundingClientRect(); return { x: ((e.clientX - r.left) / r.width) * 2 - 1, y: -((e.clientY - r.top) / r.height) * 2 + 1 }; };
    el.addEventListener('pointerdown', (e) => { if (!this.enabled) return; const p = toNdc(e); this.pointer.x = p.x; this.pointer.y = p.y; this.pointer.down = true; this.taps.push(p); });
    el.addEventListener('pointermove', (e) => { const p = toNdc(e); this.pointer.x = p.x; this.pointer.y = p.y; });
    window.addEventListener('pointerup', () => { this.pointer.down = false; });
  }
  isDown(...codes) { return codes.some((c) => this.keys.has(c)); }
  /** Movement axis from WASD / arrows, x right, y forward(up). */
  axis() {
    let x = 0, y = 0;
    if (this.isDown('KeyA', 'ArrowLeft')) x -= 1; if (this.isDown('KeyD', 'ArrowRight')) x += 1;
    if (this.isDown('KeyW', 'ArrowUp')) y += 1; if (this.isDown('KeyS', 'ArrowDown')) y -= 1;
    const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; }
    return { x, y, active: l > 0 };
  }
  consumeTap() { return this.taps.length ? this.taps.shift() : null; }
  clearTaps() { this.taps.length = 0; }
}
