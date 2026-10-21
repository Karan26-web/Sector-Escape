// ---------------------------------------------------------------------------
// Arena focus ("spotlight"): materials darken + desaturate with distance from
// FOCUS.center, so the current ring stays vivid while the jungle and the other
// rings fade back. Shared uniforms → one tween drives every material.
// ---------------------------------------------------------------------------
import * as THREE from '../../vendor/three.module.js';

export const FOCUS = {
  center: { value: new THREE.Vector3() },
  radii: { value: new THREE.Vector2(10, 18) }, // x: full brightness up to, y: fully dimmed from
  amount: { value: 0 },                        // 0 = off, 1 = on
  cull: { value: 0 },                          // 0..1: tall billboards near the focus ring sink away (top-down mode)
  cullRadii: { value: new THREE.Vector2(14, 22) },
};
export const FOCUS_UNIFORMS_GLSL = 'uniform vec3 uFocusCenter; uniform vec2 uFocusRadii; uniform float uFocusAmount;';
/** Apply to gl_FragColor given a world position `wp`. */
export const FOCUS_APPLY_GLSL = `{ float fd = distance(wp.xz, uFocusCenter.xz); float ff = uFocusAmount * smoothstep(uFocusRadii.x, uFocusRadii.y, fd);
  vec3 fg = vec3(dot(gl_FragColor.rgb, vec3(0.299, 0.587, 0.114))); gl_FragColor.rgb = mix(gl_FragColor.rgb, fg, 0.55 * ff) * mix(1.0, 0.28, ff); }`;

/** Patch a MeshLambert/MeshBasic material so it honours FOCUS. Idempotent. */
export function focusable(mat) {
  if (!mat || mat.userData.focus) return mat;
  mat.userData.focus = true;
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uFocusCenter = FOCUS.center; shader.uniforms.uFocusRadii = FOCUS.radii; shader.uniforms.uFocusAmount = FOCUS.amount;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vFocusPos;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvFocusPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vFocusPos; ' + FOCUS_UNIFORMS_GLSL)
      .replace('#include <dithering_fragment>', '#include <dithering_fragment>\n' + FOCUS_APPLY_GLSL.replace('wp.xz', 'vFocusPos.xz'));
  };
  return mat;
}
