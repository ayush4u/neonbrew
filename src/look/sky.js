import * as THREE from 'three';
import { PALETTE } from './palette.js';
export function createSkyMaterial() {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uTime: { value: 0 }, uTop: { value: PALETTE.skyTop }, uMid: { value: PALETTE.skyMid }, uHorizon: { value: PALETTE.skyHorizon } },
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = projectionMatrix*modelViewMatrix*vec4(position,1.0); gl_Position = p.xyww; }`,
    fragmentShader: `
      uniform float uTime; uniform vec3 uTop, uMid, uHorizon; varying vec3 vDir;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
      float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
        return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
      void main(){
        vec3 d = normalize(vDir); float y = d.y;
        // peach-gold horizon → soft pink mid → light lavender top
        vec3 col = mix(uHorizon, uMid, smoothstep(-0.08, 0.22, y));
        col = mix(col, uTop, smoothstep(0.28, 0.88, y));
        // soft sun near horizon (right-forward)
        vec3 sunDir = normalize(vec3(-0.25, 0.06, -0.97));
        float sd = max(0.0, dot(d, sunDir));
        float core = smoothstep(0.9985, 0.9993, sd);
        float glow = pow(sd, 40.0);
        float halo = pow(sd, 8.0);
        col += vec3(1.0, 0.92, 0.7) * core * 0.55;
        col += vec3(1.0, 0.78, 0.5) * glow * 0.28;
        col += vec3(1.0, 0.72, 0.62) * halo * 0.1;
        // warm peach band along the horizon
        float band = exp(-abs(y - 0.02) * 14.0);
        col += vec3(1.0, 0.72, 0.48) * band * 0.08;
        // soft pastel clouds (no stars — golden hour)
        vec2 cp = vec2(atan(d.z, d.x)*2.2 + uTime*0.008, y*6.5);
        float cl = n(cp*2.0)*0.55 + n(cp*4.0)*0.35;
        cl = smoothstep(0.48, 0.78, cl) * smoothstep(0.02, 0.14, y) * smoothstep(0.5, 0.18, y);
        col = mix(col, vec3(1.0, 0.88, 0.92), cl*0.3);
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
}
export function createSky() {
  const m = new THREE.Mesh(new THREE.SphereGeometry(400, 32, 16), createSkyMaterial());
  m.name = 'sky'; m.frustumCulled = false; m.renderOrder = -1; return m;
}
