import * as THREE from 'three';
import { PALETTE, SUN_DIR } from './palette.js';
import { TOON } from './toon.js';
// Sway increases with height (object-space y). Leaves vs trunk picked by height ratio.
export function createPalmMaterial({ height = 4 } = {}) {
  return new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    uniforms: { uTime: { value: 0 }, uHeight: { value: height }, uSun: { value: new THREE.Vector3(...SUN_DIR).normalize() },
      uShadow: { value: PALETTE.shadow }, uTrunk: { value: PALETTE.palmTrunk }, uLeaf: { value: PALETTE.palmLeaf } },
    vertexShader: `uniform float uTime, uHeight; varying vec3 vN; varying float vH; varying float vR;
      void main(){ vR = length(position.xz); vec3 p = position; float t = clamp(p.y/uHeight, 0.0, 1.2); vH = t;
        float ph = modelMatrix[3].x*0.7 + modelMatrix[3].z*0.3;
        float s = t*t; p.x += sin(uTime*1.3+ph)*0.18*s; p.z += cos(uTime*1.1+ph)*0.12*s;
        p.y += sin(uTime*2.0+p.x*2.0+ph)*0.05*step(0.85,t);
        vN = normalize(mat3(modelMatrix)*normal); gl_Position = projectionMatrix*modelViewMatrix*vec4(p,1.0); }`,
    fragmentShader: `${TOON} uniform vec3 uTrunk, uLeaf; varying vec3 vN; varying float vH; varying float vR;
      void main(){ vec3 base = (vR > 0.3 || vH > 0.97) ? uLeaf : uTrunk * (0.9 + 0.1*step(0.5, fract(vH*14.0)));
        gl_FragColor = vec4(toon(base, gl_FrontFacing ? vN : -vN), 1.0); }`,
  });
}
