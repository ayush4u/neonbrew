import * as THREE from 'three';
import { PALETTE, SUN_DIR } from './palette.js';
const sun = new THREE.Vector3(...SUN_DIR).normalize();
// shared toon lighting snippet — lifted shadows for a cheerful sunny feel
export const TOON = `
  uniform vec3 uSun, uShadow;
  vec3 toon(vec3 base, vec3 N){ float l = dot(normalize(N), uSun);
    float b = l > 0.35 ? 1.0 : (l > -0.05 ? 0.84 : 0.68);
    vec3 c = mix(uShadow, base, b) ; return c + base*0.12*step(0.7,l); }`;
// 2D value noise + fbm shared by ground shaders
export const NOISE = `
  float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
    return mix(mix(h21(i), h21(i+vec2(1,0)), f.x), mix(h21(i+vec2(0,1)), h21(i+vec2(1,1)), f.x), f.y); }
  float fbm(vec2 p){ return 0.55*vnoise(p) + 0.3*vnoise(p*2.1+7.3) + 0.15*vnoise(p*4.3-3.1); }`;
/**
 * Island ground (object space, so it works for any placed/rotated island mesh centred on its origin):
 * noise grass patches + tufts near the middle, sand ripples & colour variation, darker wet band near
 * the shoreline, wobbly organic boundaries. islandRadius = shoreline radius in object units.
 */
export function createGroundMaterial({ islandRadius = 6 } = {}) {
  return new THREE.ShaderMaterial({
    uniforms: { uSun: { value: sun }, uShadow: { value: PALETTE.shadow }, uSand: { value: PALETTE.sand }, uGrass: { value: PALETTE.grass }, uRadius: { value: islandRadius } },
    vertexShader: `varying vec3 vN, vP; void main(){ vP = position;
      vN = normalize(mat3(modelMatrix)*normal); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `${TOON} ${NOISE} uniform vec3 uSand, uGrass; uniform float uRadius; varying vec3 vN, vP;
      void main(){ vec2 q = vP.xz; float r = length(q)/uRadius;
        float n = fbm(q*0.55), n2 = fbm(q*1.7+11.0);
        float rw = r + (n-0.5)*0.22;                       // wobbly organic boundaries
        // grass: soft core around the middle + noisy patches that fade toward the beach
        float g = smoothstep(0.36, 0.24, rw) + smoothstep(0.6, 0.72, n2) * smoothstep(0.72, 0.4, rw);
        g = clamp(g, 0.0, 1.0); float grass = step(0.5, g);
        // tufts: small blobs just outside the grass edge
        vec2 c = q*3.2; float tuft = step(0.86, h21(floor(c))) * step(length(fract(c)-0.5), 0.26);
        grass = max(grass, tuft * step(0.12, g) * step(rw, 0.78));
        vec3 grassC = uGrass * (0.9 + 0.2*n2) * (1.0 - 0.12*step(0.5, g)*step(0.68, fbm(q*2.6)));
        // sand: colour variation + gentle ripples
        float rip = sin(dot(q, vec2(0.8, 0.6))*7.0 + n*6.0);
        vec3 sandC = uSand * (0.95 + 0.08*n) * (1.0 + 0.035*step(0.6, rip));
        sandC = mix(sandC, sandC*vec3(1.02,1.0,0.94), smoothstep(0.75, 0.6, rw)); // dry, paler inland
        float wet = smoothstep(0.86, 0.94, r + (n-0.5)*0.08);
        sandC = mix(sandC, uSand*vec3(0.78,0.68,0.58), wet*0.85);
        sandC = mix(sandC, vec3(1.0,0.97,0.9), step(0.955, r + (n2-0.5)*0.05)*step(r, 0.99)*0.5); // foam lip
        vec3 base = mix(sandC, grassC, grass);
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

// Props: path_stone_* / rock_* (rounded warm stones), plant_* (fresh green, slight sway).
export function createPlantMaterial(color = PALETTE.grass) {
  return new THREE.ShaderMaterial({
    uniforms: { uSun: { value: sun }, uShadow: { value: PALETTE.shadow }, uColor: { value: new THREE.Color(color) }, uTime: { value: 0 } },
    vertexShader: `uniform float uTime; varying vec3 vN; varying float vY; void main(){ vN = normalize(mat3(modelMatrix)*normal);
      vec3 p = position; vY = p.y; vec4 w = modelMatrix*vec4(0,0,0,1);
      float s = max(p.y, 0.0); p.x += sin(uTime*1.6 + w.x*0.7 + w.z)*0.04*s*s; p.z += cos(uTime*1.3 + w.z)*0.03*s*s;
      gl_Position = projectionMatrix*modelViewMatrix*vec4(p,1.0); }`,
    fragmentShader: `${TOON} uniform vec3 uColor; varying vec3 vN; varying float vY;
      void main(){ gl_FragColor = vec4(toon(uColor*(0.85+0.25*clamp(vY*1.5,0.0,1.0)), vN),1.0); }`,
  });
}
