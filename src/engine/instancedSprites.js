// ---------------------------------------------------------------------------
// SpriteCloud – thousands of camera-facing billboards (trees, plants, rocks)
// in ONE draw call: an instanced quad billboarded in the vertex shader,
// alpha-to-coverage edges (MSAA), scene fog, sRGB output.
// ---------------------------------------------------------------------------
import * as THREE from '../../vendor/three.module.js';
import { assets } from './assets.js';
import { FOCUS, FOCUS_APPLY_GLSL } from './focus.js';

const VERT = /* glsl */`
attribute vec3 offset; attribute vec2 scl; attribute vec2 uvOff; attribute float shade;
uniform vec2 uvScale; uniform float uCull; uniform vec2 uCullRadii; uniform vec3 uFocusCenter; varying vec2 vUv; varying float vShade; varying vec3 vWorld;
#include <fog_pars_vertex>
void main() {
  vUv = uvOff + uv * uvScale; vShade = shade; vWorld = offset;
  float hd = distance(offset.xz, uFocusCenter.xz);
  float k = mix(1.0, smoothstep(uCullRadii.x, uCullRadii.y, hd), uCull * step(4.0, scl.y));
  vec4 mvCenter = modelViewMatrix * vec4(offset, 1.0);
  vec4 mvPosition = vec4(mvCenter.xyz + vec3(position.x * scl.x * k, position.y * scl.y * k, 0.0), 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;
const FRAG = /* glsl */`
uniform sampler2D map; uniform vec3 tint; varying vec2 vUv; varying float vShade; varying vec3 vWorld;
uniform vec3 uFocusCenter; uniform vec2 uFocusRadii; uniform float uFocusAmount;
#include <fog_pars_fragment>
void main() {
  vec4 c = texture2D(map, vUv);
  if (c.a < 0.08) discard;
  gl_FragColor = vec4(c.rgb * tint * vShade, 1.0);
  #include <colorspace_fragment>
  #include <fog_fragment>
  ${FOCUS_APPLY_GLSL.replace('wp.xz', 'vWorld.xz')}
}`;

export class SpriteCloud {
  constructor(sheetName, max, { tint = 0xffffff } = {}) {
    this.def = assets.frames(sheetName); this.max = max; this.count = 0;
    this.aspect = this.def.frameW / this.def.frameH;
    const base = new THREE.PlaneGeometry(1, 1); base.translate(0, 0.5, 0);
    const geo = new THREE.InstancedBufferGeometry();
    geo.setIndex(base.index); geo.setAttribute('position', base.attributes.position); geo.setAttribute('uv', base.attributes.uv);
    this.offsets = new Float32Array(max * 3); this.scales = new Float32Array(max * 2); this.uvOffs = new Float32Array(max * 2); this.shades = new Float32Array(max);
    this.aOffset = new THREE.InstancedBufferAttribute(this.offsets, 3); this.aScale = new THREE.InstancedBufferAttribute(this.scales, 2);
    this.aUv = new THREE.InstancedBufferAttribute(this.uvOffs, 2); this.aShade = new THREE.InstancedBufferAttribute(this.shades, 1);
    geo.setAttribute('offset', this.aOffset); geo.setAttribute('scl', this.aScale); geo.setAttribute('uvOff', this.aUv); geo.setAttribute('shade', this.aShade);
    geo.instanceCount = 0;
    const uniforms = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { map: { value: null }, uvScale: { value: new THREE.Vector2(1 / this.def.cols, 1 / this.def.rows) }, tint: { value: new THREE.Color(tint) } }]);
    uniforms.uFocusCenter = FOCUS.center; uniforms.uFocusRadii = FOCUS.radii; uniforms.uFocusAmount = FOCUS.amount; uniforms.uCull = FOCUS.cull; uniforms.uCullRadii = FOCUS.cullRadii;
    uniforms.map.value = assets.texture(sheetName, { wrap: false });
    const mat = new THREE.ShaderMaterial({ uniforms, vertexShader: VERT, fragmentShader: FRAG, fog: true, transparent: false, depthWrite: true, side: THREE.DoubleSide, alphaToCoverage: true });
    this.mesh = new THREE.Mesh(geo, mat); this.mesh.frustumCulled = false; this.geo = geo; this.material = mat;
  }
  /** Place one billboard with its base at (x,y,z). frame = sheet cell index. */
  add(x, y, z, height, frame = 0, shade = 1) {
    if (this.count >= this.max) return false;
    const i = this.count++, cols = this.def.cols, rows = this.def.rows;
    this.offsets[i * 3] = x; this.offsets[i * 3 + 1] = y - (1 - (this.def.baseline ?? 1)) * height; this.offsets[i * 3 + 2] = z;   // trunk base on the ground
    this.scales[i * 2] = height * this.aspect; this.scales[i * 2 + 1] = height;
    this.uvOffs[i * 2] = (frame % cols) / cols; this.uvOffs[i * 2 + 1] = 1 - (Math.floor(frame / cols) + 1) / rows;
    this.shades[i] = shade;
    return true;
  }
  commit() { this.geo.instanceCount = this.count; for (const a of [this.aOffset, this.aScale, this.aUv, this.aShade]) a.needsUpdate = true; }
}
