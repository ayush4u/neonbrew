import * as THREE from 'three';
import { PALETTE, SUN_DIR } from './palette.js';

// Interior palette (cosy café, matches golden-hour exterior)
export const INTERIOR = {
  wall: new THREE.Color('#f6dcc0'), ceiling: new THREE.Color('#f0cfae'),
  wood: new THREE.Color('#e0a36a'), woodLight: new THREE.Color('#ecb880'),
  pink: new THREE.Color('#f6a6b4'), pinkDeep: new THREE.Color('#e88a9c'),
  shade: new THREE.Color('#ffa888'), bulb: new THREE.Color('#ffb860'),
  ambient: new THREE.Color('#e0a088'), lamp: new THREE.Color('#ffc890'),
  neon: new THREE.Color('#ff9ac4'),
};
export const MAX_LAMPS = 4;

/**
 * Shared "cheap warm light" state: up to 4 fake point lights evaluated in-shader
 * (no three.js lights → no extra passes / recompiles, mobile friendly) plus a
 * room AABB used for fake corner/floor ambient occlusion.
 */
export function createInteriorLighting() {
  const lamps = Array.from({ length: MAX_LAMPS }, () => new THREE.Vector4(0, -999, 0, 0.001));
  return {
    uLamps: { value: lamps }, uLampColor: { value: INTERIOR.lamp.clone() },
    uAmbient: { value: INTERIOR.ambient.clone() },
    uRoomMin: { value: new THREE.Vector3(-1e3, -1e3, -1e3) }, uRoomMax: { value: new THREE.Vector3(1e3, 1e3, 1e3) }, uRoomInv: { value: new THREE.Matrix4() },
    uSun: { value: new THREE.Vector3(...SUN_DIR).normalize() },
    setLamps(list) { // list of {position: Vector3, radius}
      lamps.forEach((v, i) => { const l = list[i]; if (l) v.set(l.position.x, l.position.y, l.position.z, l.radius ?? 3.5); else v.set(0, -999, 0, 0.001); });
    },
    /** box is in the room's local frame; frameMatrixWorld maps that frame to world (rotated rooms OK). */
    setRoom(box, frameMatrixWorld = new THREE.Matrix4()) { this.uRoomMin.value.copy(box.min); this.uRoomMax.value.copy(box.max);
      this.uRoomInv.value.copy(frameMatrixWorld).invert(); },
  };
}

const VS = `varying vec3 vN, vW; void main(){ vec4 w = modelMatrix*vec4(position,1.0); vW = w.xyz;
  vN = normalize(mat3(modelMatrix)*normal); gl_Position = projectionMatrix*viewMatrix*w; }`;

/** Interior toon: smooth bands, warm lamp pools, fake AO toward corners / floor / ceiling. */
export function createInteriorToonMaterial(lighting, color, { aoStrength = 1.0, side = THREE.FrontSide } = {}) {
  return new THREE.ShaderMaterial({ side,
    uniforms: { uColor: { value: new THREE.Color(color) }, uAO: { value: aoStrength },
      uLamps: lighting.uLamps, uLampColor: lighting.uLampColor, uAmbient: lighting.uAmbient,
      uRoomMin: lighting.uRoomMin, uRoomMax: lighting.uRoomMax, uRoomInv: lighting.uRoomInv, uSun: lighting.uSun },
    vertexShader: VS,
    fragmentShader: `uniform vec3 uColor, uLampColor, uAmbient, uRoomMin, uRoomMax, uSun; uniform float uAO; uniform mat4 uRoomInv;
      uniform vec4 uLamps[${MAX_LAMPS}]; varying vec3 vN, vW;
      // smooth (anti-aliased) toon step
      float band(float x, float e){ float w = fwidth(x)*1.5 + 0.02; return smoothstep(e-w, e+w, x); }
      void main(){
        vec3 N = normalize(gl_FrontFacing ? vN : -vN);
        float lit = 0.0;
        for (int i = 0; i < ${MAX_LAMPS}; i++){
          vec3 d = uLamps[i].xyz - vW; float r = uLamps[i].w; float dist = length(d);
          float fall = clamp(1.0 - dist / r, 0.0, 1.0); fall *= fall;
          float wrap = clamp(dot(N, d/dist)*0.6 + 0.4, 0.0, 1.0);
          lit += fall * wrap;
        }
        lit = clamp(lit, 0.0, 1.2);
        // 3 soft toon bands
        float t = 0.55 + 0.25*band(lit, 0.18) + 0.2*band(lit, 0.5);
        // soft key from the sunset (through the windows) — subtle
        t += 0.06*band(dot(N, uSun), 0.3);
        // fake AO: distance to room walls / floor / ceiling
        vec3 rp = (uRoomInv*vec4(vW,1.0)).xyz; vec3 dmin = rp - uRoomMin, dmax = uRoomMax - rp;
        float wallD = min(min(dmin.x, dmax.x), min(dmin.z, dmax.z));
        float floorD = dmin.y, ceilD = dmax.y;
        float ao = mix(0.72, 1.0, smoothstep(0.0, 0.9, wallD));
        ao *= mix(0.80, 1.0, smoothstep(0.0, 0.7, floorD));
        ao *= mix(0.85, 1.0, smoothstep(0.0, 0.6, ceilD));
        // outside the room box (exterior faces): no AO, warm sunset bounce instead of lamp pools
        float inside = step(-0.02, min(min(min(dmin.x, dmax.x), min(dmin.z, dmax.z)), min(floorD, ceilD)));
        ao = mix(1.0, ao, uAO * inside);
        vec3 lightCol = mix(uAmbient, vec3(1.0), 0.55) * t + uLampColor * 0.4 * lit;
        lightCol = mix(vec3(1.0, 0.93, 0.86) * (0.98 + 0.06*band(N.y, 0.5)), lightCol, inside);
        vec3 c = uColor * lightCol * ao;
        gl_FragColor = vec4(min(c, vec3(0.97)), 1.0);
      }`,
  });
}

/** Window glass: near-clear, warm sunset fresnel at grazing angles. Transparent, no depth write. */
export function createGlassMaterial({ tint = PALETTE.skyHorizon, top = PALETTE.skyMid, base = 0.05, strength = 0.55 } = {}) {
  return new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: { uTint: { value: tint.clone() }, uTop: { value: top.clone() }, uBase: { value: base }, uStr: { value: strength } },
    vertexShader: VS,
    fragmentShader: `uniform vec3 uTint, uTop; uniform float uBase, uStr; varying vec3 vN, vW;
      void main(){ vec3 V = normalize(cameraPosition - vW); vec3 N = normalize(gl_FrontFacing ? vN : -vN);
        float f = pow(1.0 - clamp(abs(dot(N, V)), 0.0, 1.0), 4.0);
        vec3 R = reflect(-V, N); vec3 refl = mix(uTint, uTop, smoothstep(-0.1, 0.5, R.y));
        // faint diagonal sheen streak
        float sheen = smoothstep(0.92, 1.0, sin((vW.x + vW.y)*3.0)) * 0.05;
        float a = clamp(uBase + uStr*f + sheen, 0.0, 0.7);
        gl_FragColor = vec4(refl, a); }`,
  });
}

/** Lamp shade: peach toon outside, glowing warm inside (back faces). */
export function createLampShadeMaterial({ color = INTERIOR.shade, inner = INTERIOR.bulb } = {}) {
  return new THREE.ShaderMaterial({ side: THREE.DoubleSide,
    uniforms: { uColor: { value: color.clone() }, uInner: { value: inner.clone() } },
    vertexShader: VS,
    fragmentShader: `uniform vec3 uColor, uInner; varying vec3 vN, vW;
      void main(){ vec3 N = normalize(vN);
        if (!gl_FrontFacing) { gl_FragColor = vec4(uInner*1.05, 1.0); return; }
        float up = N.y*0.5 + 0.5; float b = smoothstep(0.35, 0.6, up);
        vec3 c = uColor * mix(0.82, 1.0, b);
        // lower rim catches bulb glow
        c += uInner * 0.18 * smoothstep(0.4, 0.0, up);
        gl_FragColor = vec4(min(c, vec3(0.98)), 1.0); }`,
  });
}

/** Emissive amber bulb: > 1.0 output so it crosses bloom threshold gently. */
export function createBulbMaterial({ color = INTERIOR.bulb, intensity = 2.2 } = {}) {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uColor: { value: color.clone() }, uIntensity: { value: intensity } },
    vertexShader: `void main(){ gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `uniform float uTime, uIntensity; uniform vec3 uColor;
      void main(){ float f = 0.97 + 0.03*sin(uTime*2.3); gl_FragColor = vec4(uColor*uIntensity*f, 1.0); }`,
  });
}

/** Soft pink wall neon with gentle flicker (slow breathe + rare short dips). */
export function createWallNeonMaterial({ color = INTERIOR.neon, intensity = 2.2 } = {}) {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uColor: { value: color.clone() }, uIntensity: { value: intensity } },
    vertexShader: `void main(){ gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `uniform float uTime, uIntensity; uniform vec3 uColor;
      float h(float n){ return fract(sin(n)*43758.5453); }
      void main(){ float breathe = 0.93 + 0.07*sin(uTime*1.7);
        float slot = floor(uTime*8.0); float dip = step(0.965, h(slot)) * 0.3;
        gl_FragColor = vec4(uColor*uIntensity*(breathe - dip), 1.0); }`,
  });
}
