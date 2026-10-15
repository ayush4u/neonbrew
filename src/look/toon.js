import * as THREE from 'three';
import { PALETTE, SUN_DIR } from './palette.js';
const sun = new THREE.Vector3(...SUN_DIR).normalize();
// shared toon lighting snippet — lifted shadows for a cheerful sunny feel
export const TOON = `
  uniform vec3 uSun, uShadow;
  vec3 toon(vec3 base, vec3 N){ float l = dot(normalize(N), uSun);
    float b = l > 0.35 ? 1.0 : (l > -0.05 ? 0.84 : 0.68);
    vec3 c = mix(uShadow, base, b) ; return c + base*0.12*step(0.7,l); }`;
export function createGroundMaterial({ islandRadius = 6 } = {}) {
  return new THREE.ShaderMaterial({
    uniforms: { uSun: { value: sun }, uShadow: { value: PALETTE.shadow }, uSand: { value: PALETTE.sand }, uGrass: { value: PALETTE.grass }, uRadius: { value: islandRadius } },
    vertexShader: `varying vec3 vN, vW; void main(){ vec4 w = modelMatrix*vec4(position,1.0); vW=w.xyz;
      vN = normalize(mat3(modelMatrix)*normal); gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `${TOON} uniform vec3 uSand, uGrass; uniform float uRadius; varying vec3 vN, vW;
      void main(){ float r = length(vW.xz)/uRadius;
        float grass = smoothstep(0.78, 0.62, r + 0.03*sin(atan(vW.z,vW.x)*8.0)) * step(0.2, vW.y);
        vec3 base = mix(uSand, uGrass, grass);
        gl_FragColor = vec4(toon(base, vN), 1.0); }`,
  });
}
export function createToonMaterial(color) {
  return new THREE.ShaderMaterial({
    uniforms: { uSun: { value: sun }, uShadow: { value: PALETTE.shadow }, uColor: { value: new THREE.Color(color) } },
    vertexShader: `varying vec3 vN; void main(){ vN = normalize(mat3(modelMatrix)*normal); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `${TOON} uniform vec3 uColor; varying vec3 vN; void main(){ gl_FragColor = vec4(toon(uColor, vN),1.0); }`,
  });
}
// Striped canopy: stripes along object-space x.
export function createAwningMaterial({ a = PALETTE.awningA, b = PALETTE.awningB, stripes = 7.0 } = {}) {
  return new THREE.ShaderMaterial({ side: THREE.DoubleSide,
    uniforms: { uSun: { value: sun }, uShadow: { value: PALETTE.shadow }, uA: { value: a }, uB: { value: b }, uS: { value: stripes } },
    vertexShader: `varying vec3 vN; varying vec2 vUv; void main(){ vUv = uv; vN = normalize(mat3(modelMatrix)*normal); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `${TOON} uniform vec3 uA, uB; uniform float uS; varying vec3 vN; varying vec2 vUv;
      void main(){ vec3 base = mix(uA, uB, step(0.5, fract(vUv.x*uS))); gl_FragColor = vec4(toon(base, gl_FrontFacing ? vN : -vN),1.0); }`,
  });
}
