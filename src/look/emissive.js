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

// "NEON BREW" + coffee cup, drawn once to a canvas: R = soft halo, G = tube core. Works on any 0..1 UVs.
let signTex = null;
function getSignTexture() {
  if (signTex) return signTex;
  const c = document.createElement('canvas'); c.width = 1024; c.height = 256; const x = c.getContext('2d');
  x.fillStyle = '#000'; x.fillRect(0, 0, 1024, 256);
  const draw = (style, lw) => {
    x.font = '600 128px "Trebuchet MS", "Arial Rounded MT Bold", Verdana, sans-serif'; x.textBaseline = 'middle'; x.textAlign = 'left';
    x.fillStyle = style; x.strokeStyle = style; x.lineWidth = lw; x.lineCap = 'round'; x.lineJoin = 'round';
    x.fillText('NEON BREW', 60, 134);
    // cup icon at the right
    x.beginPath(); x.moveTo(800, 92); x.lineTo(812, 190); x.quadraticCurveTo(815, 206, 832, 206); x.lineTo(902, 206);
    x.quadraticCurveTo(919, 206, 922, 190); x.lineTo(934, 92); x.closePath(); x.stroke();
    x.beginPath(); x.arc(940, 135, 24, -Math.PI / 2, Math.PI / 2); x.stroke();
    x.beginPath(); x.moveTo(790, 222); x.lineTo(944, 222); x.stroke();
    [838, 868, 898].forEach((sx) => { x.beginPath(); x.moveTo(sx, 76); x.bezierCurveTo(sx + 14, 60, sx - 14, 48, sx, 30); x.stroke(); });
  };
  x.globalCompositeOperation = 'lighter';
  x.shadowColor = '#f00'; x.shadowBlur = 28; draw('#f00', 16); draw('#f00', 16);
  x.shadowBlur = 0; draw('#0f0', 7);
  signTex = new THREE.CanvasTexture(c); signTex.colorSpace = THREE.NoColorSpace; signTex.anisotropy = 4;
  return signTex;
}
/** Glowing pink neon "NEON BREW" + cup on a dark plum backing; tubes > 1.0 so they bloom. */
export function createNeonSignMaterial({ color = PALETTE.neonPink, intensity = 2.6, backing = new THREE.Color('#2a1630') } = {}) {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uMap: { value: getSignTexture() }, uColor: { value: color.clone() }, uIntensity: { value: intensity }, uBack: { value: backing } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `uniform float uTime, uIntensity; uniform vec3 uColor, uBack; uniform sampler2D uMap; varying vec2 vUv;
      void main(){ vec4 t = texture2D(uMap, vUv);
        float f = 0.95 + 0.05*sin(uTime*9.0); f *= 1.0 - 0.2*step(0.97, fract(sin(floor(uTime*6.0))*43758.5));
        vec3 c = uBack + uColor*t.r*0.55*f;
        c = mix(c, mix(uColor, vec3(1.0, 0.9, 0.95), 0.45*t.g)*uIntensity*f, t.g);
        gl_FragColor = vec4(c, 1.0); }`,
  });
}
