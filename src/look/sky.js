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
        vec3 col = mix(uHorizon, uMid, smoothstep(-0.05, 0.25, y));
        col = mix(col, uTop, smoothstep(0.25, 0.85, y));
        // stars
        vec2 sp = vec2(atan(d.z, d.x)*40.0, y*80.0); vec2 c = floor(sp);
        float s = h(c); vec2 f = fract(sp)-0.5;
        float star = step(0.985, s) * smoothstep(0.12, 0.0, length(f)) * (0.6+0.4*sin(uTime*2.0+s*60.0));
        col += star * smoothstep(0.2, 0.6, y) * 0.9;
        // soft clouds
        vec2 cp = vec2(atan(d.z, d.x)*2.5 + uTime*0.01, y*7.0);
        float cl = n(cp*2.0)*0.6 + n(cp*4.0)*0.3;
        cl = smoothstep(0.5, 0.8, cl) * smoothstep(0.0, 0.12, y) * smoothstep(0.45, 0.15, y);
        col = mix(col, vec3(1.0,0.82,0.86), cl*0.45);
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
}
export function createSky() {
  const m = new THREE.Mesh(new THREE.SphereGeometry(400, 32, 16), createSkyMaterial());
  m.name = 'sky'; m.frustumCulled = false; m.renderOrder = -1; return m;
}
