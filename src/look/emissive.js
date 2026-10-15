import * as THREE from 'three';
import { PALETTE } from './palette.js';
// Emissive materials output > 1.0 so only they cross the bloom threshold.
export function createStringLightsMaterial({ color = PALETTE.lightWarm, intensity = 1.55 } = {}) {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uColor: { value: color.clone() }, uIntensity: { value: intensity } },
    vertexShader: `varying float vSeed; void main(){ vec4 w = modelMatrix*vec4(position,1.0);
      vSeed = floor(w.x*3.0)+floor(w.z*3.0)*7.0; gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `uniform float uTime, uIntensity; uniform vec3 uColor; varying float vSeed;
      void main(){ float tw = 0.7 + 0.3*sin(uTime*3.0 + vSeed*1.7);
        gl_FragColor = vec4(uColor*uIntensity*tw, 1.0); }`,
  });
}
export function createNeonMaterial({ color = PALETTE.neonPink, intensity = 3.2 } = {}) {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uColor: { value: color.clone() }, uIntensity: { value: intensity } },
    vertexShader: `void main(){ gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `uniform float uTime, uIntensity; uniform vec3 uColor;
      void main(){ float f = 0.94 + 0.06*sin(uTime*9.0) ; f *= step(0.04, fract(sin(floor(uTime*6.0))*43758.5)) * 0.25 + 0.75;
        gl_FragColor = vec4(uColor*uIntensity*f, 1.0); }`,
  });
}
export function createWindowMaterial({ color = PALETTE.window, intensity = 1.25 } = {}) {
  return new THREE.MeshBasicMaterial({ color: color.clone().multiplyScalar(intensity), toneMapped: false });
}
