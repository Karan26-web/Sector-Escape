// ---------------------------------------------------------------------------
// Where to go next (user 2026-10-27). The goal of each walk lights up as Karan
// comes near it, and fully whenever the player stands still (Roam supplies k:
// 0 = resting, 1 = full):
//  * ring 1's gate: its door glows amber, a glow hangs in the doorway, motes rise;
//  * the observation spot behind O: a ring of light on the floor, a soft glow
//    inside it and a faint shaft of light above it (always faintly there while
//    it is the goal: nothing else marks the spot);
//  * the cleared gap: a low glow of warm light along the threshold, an open door;
//  * the temple gate: its own glow grows (ChainWorld.templeBoost).
// bump(): a short shimmer where he pushes into an edge that has no wall (an open
// passage he may not take): the restriction is seen, not just felt.
// Everything is built once at load (the shaders compile with the rest), parked
// out of sight until used.
// ---------------------------------------------------------------------------
import * as THREE from '../../vendor/three.module.js';
import { assets } from '../engine/assets.js';
import { audio } from '../engine/audio.js';
import { DEG, polar } from '../engine/util.js';
import { CHAIN } from './levels.js';

const AMBER = 0xffc560;
const PARK = -60;   // y of a marker not in use
/** light rising from the floor: bright at the bottom, gone at the top */
function riseTexture() {
  const c = document.createElement('canvas'); c.width = 4; c.height = 128; const g = c.getContext('2d'), gr = g.createLinearGradient(0, 128, 0, 0);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,255,255,0.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 4, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const additive = (o = {}) => new THREE.MeshBasicMaterial({ color: AMBER, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, ...o });

export class Markers {
  constructor(world, fx, chain) {
    this.world = world; this.fx = fx; this.chain = chain; this.t = 0; this.moteT = 0;
    const rise = riseTexture(), glow = assets.texture('fx_glow', { wrap: false }), lift = { polygonOffset: true, polygonOffsetFactor: -8, polygonOffsetUnits: -8 };   // over the ring floors' own offsets
    // the spot
    const sp = this.spot = new THREE.Group(); sp.position.y = PARK; world.add(sp);
    this.spotRing = new THREE.Mesh(new THREE.RingGeometry(0.6, 0.78, 48), additive(lift)); this.spotRing.rotation.x = -Math.PI / 2; this.spotRing.position.y = 0.08;
    this.spotDisc = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.6), additive({ map: glow, ...lift })); this.spotDisc.rotation.x = -Math.PI / 2; this.spotDisc.position.y = 0.07;
    const sg = new THREE.PlaneGeometry(1.5, 4.4); sg.translate(0, 2.2, 0);
    this.spotShaft = new THREE.Mesh(sg, additive({ map: rise }));
    for (const m of [this.spotRing, this.spotDisc, this.spotShaft]) { m.renderOrder = 9; sp.add(m); }
    // the open gap: its geometry follows the arena (gapAt)
    this.gapMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), additive({ map: rise })); this.gapMesh.position.y = PARK; this.gapMesh.renderOrder = 9; world.add(this.gapMesh);
    this.gapArena = null;
    // ring 1's doorway
    this.doorGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: AMBER, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.doorGlow.position.y = PARK; world.add(this.doorGlow);
  }

  /* ---------------------------------------------------------------- ring 1's gate */
  /** k 0..1; the door leaf glows (emissive), a glow hangs in front of the doorway, motes rise when it is strong */
  door(k, dt = 0) {
    const g = this.chain.startGate, m = g.leaf.material, pulse = 0.8 + 0.2 * Math.sin(this.t * 4.2);
    m.emissive.setHex(AMBER); m.emissiveIntensity = k * 0.45 * pulse;   // (warm, but still a wooden door)
    if (k < 0.01) { this.doorGlow.position.y = PARK; return; }
    const c = CHAIN.arenas[0].center, out = new THREE.Vector3(g.worldPos.x - c.x, 0, g.worldPos.z - c.z).normalize();   // out of the ring, toward the causeway
    this.doorGlow.position.copy(g.worldPos).addScaledVector(out, 0.9).setY(g.doorH * 0.45);
    this.doorGlow.scale.setScalar(3.2 + 1.2 * k); this.doorGlow.material.opacity = Math.min(1, k * 0.62 * pulse);
    this.motes(k, dt, () => this.doorGlow.position.clone().setY(0.2), 1.0);
  }
  doorOff() { const m = this.chain.startGate.leaf.material; m.emissiveIntensity = 0; this.doorGlow.position.y = PARK; }

  /* ---------------------------------------------------------------- the observation spot */
  spotAt(p) { this.spot.position.set(p.x, 0, p.z); this.spotSet(0); }
  /** k 0..1 on top of a resting glow (nothing else marks the spot) */
  spotSet(k, dt = 0) {
    const e = 0.32 + 0.68 * k, pulse = 0.82 + 0.18 * Math.sin(this.t * 4), cam = this.world.camera.position;
    this.spotRing.material.opacity = e * pulse; this.spotRing.scale.setScalar(1 + 0.1 * k * Math.sin(this.t * 3));
    this.spotDisc.material.opacity = 0.55 * e * pulse; this.spotShaft.material.opacity = 0.18 + 0.4 * k * pulse;
    this.spotShaft.rotation.y = Math.atan2(cam.x - this.spot.position.x, cam.z - this.spot.position.z);
    if (this.spot.position.y > PARK + 1) this.motes(k, dt, () => this.spot.position.clone().add(new THREE.Vector3((Math.random() - 0.5) * 1.2, 0, (Math.random() - 0.5) * 1.2)), 0.8);
  }
  spotOff() { this.spot.position.y = PARK; }

  /* ---------------------------------------------------------------- the cleared gap */
  /** a low curtain of warm light along arena a's arc: the open door to the next ring */
  gapAt(a) {
    if (this.gapArena !== a) {
      this.gapArena = a; this.gapMesh.geometry.dispose();
      // low, a glow along the threshold: 3.4 m of curtain, seen from the walk camera above it, lay over the next ring's
      // floor like a pulsing pane (user 2026-10-28: "something is flickering")
      const geo = new THREE.CylinderGeometry(a.R - 0.1, a.R - 0.1, 1.2, Math.max(12, Math.round(a.theta / 3)), 1, true, (a.exitDeg - a.theta / 2) * DEG + Math.PI / 2, a.theta * DEG);
      geo.translate(0, 0.6, 0); this.gapMesh.geometry = geo;
    }
    this.gapMesh.position.set(a.center.x, 0, a.center.z); this.gapSet(0);
  }
  gapSet(k, dt = 0) {
    const a = this.gapArena; if (!a) return;
    this.gapMesh.material.opacity = (0.14 + 0.36 * k) * (1 + 0.08 * k * Math.sin(this.t * 2));   // (it breathes only when fully lit)
    this.motes(k, dt, () => { const p = polar(a.exitDeg + (Math.random() - 0.5) * a.theta * 0.9, a.R); return new THREE.Vector3(a.center.x + p.x, 0.2, a.center.z + p.z); }, 0.5);
  }
  gapOff() { this.gapMesh.position.y = PARK; this.gapArena = null; }

  /* ---------------------------------------------------------------- the temple gate */
  templeGate(k) { this.chain.templeBoost = k; }

  /** A short shimmer where he pushes into an open edge he may not cross. */
  bump(p) { this.fx.flash(p.clone().setY(1.1), 0x9ff4ff, 2.2, 0.4); audio.play('roam.bump', { minGap: 0.5 }); }

  /** warm motes drifting up from the goal while it is lit strongly */
  motes(k, dt, at, every) {
    if (k < 0.55 || (this.moteT -= dt) > 0) return;
    this.moteT = every * (1.4 - k); this.fx.sparks(at(), 2, 0xffd88a, 1.1, 1.0, 0.22);
  }
  clear() { this.doorOff(); this.spotOff(); this.gapOff(); this.templeGate(0); }
  update(dt) { this.t += dt; }
}
