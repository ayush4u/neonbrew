import * as THREE from 'three';
import { PALETTE } from './palette.js';
// Distance-from-center foam (island is round at origin): cheap, no depth texture -> phone friendly.
export function createWaterMaterial({ islandRadius = 6 } = {}) {
  return new THREE.ShaderMaterial({
    fog: false,
    uniforms: { uTime: { value: 0 }, uRadius: { value: islandRadius }, uDeep: { value: PALETTE.waterDeep },
      uShallow: { value: PALETTE.waterShallow }, uFoam: { value: PALETTE.foam }, uSky: { value: PALETTE.skyHorizon } },
    vertexShader: `uniform float uTime; varying vec3 vW;
      void main(){ vec4 w = modelMatrix*vec4(position,1.0);
        w.y += sin(w.x*0.5+uTime*1.2)*0.04 + cos(w.z*0.6+uTime)*0.04;
        vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `uniform float uTime, uRadius; uniform vec3 uDeep, uShallow, uFoam, uSky; varying vec3 vW;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
      float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
        return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
      void main(){
        float r = length(vW.xz); float d = r - uRadius;
        vec3 col = mix(uShallow, uDeep, smoothstep(0.0, 9.0, d));
        // toon glints
        float g = n(vW.xz*1.6 + vec2(uTime*0.3, uTime*0.2)) * n(vW.xz*2.3 - uTime*0.25);
        col += step(0.62, g) * 0.14 * (1.0 - smoothstep(20.0, 50.0, r));
        // foam rings travelling outward
        float wob = n(vW.xz*1.5 + uTime*0.4)*0.35;
        float ring = fract((d + wob)*0.7 - uTime*0.35);
        float rings = step(0.86, ring) * smoothstep(3.2, 0.5, d);
        float edge = step(d + wob*0.8, 0.45);
        col = mix(col, uFoam, max(edge, rings*0.85));
        // horizon fade to sky
        vec3 v = cameraPosition - vW; float fres = pow(1.0 - clamp(normalize(v).y, 0.0, 1.0), 4.0);
        col = mix(col, uSky, fres*0.3);
        col = mix(col, uSky, smoothstep(60.0, 150.0, r));
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
}
