import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

export function isLowPower() {
  const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && innerWidth < 900);
  return mobile || (window.devicePixelRatio || 1) < 1.25 && (navigator.hardwareConcurrency || 8) <= 4;
}

/** Threshold-based bloom: scene stays <= 1.0, emissives output > 1.0, so only they bloom. */
export function setupPost(renderer, scene, camera, { lowPower = isLowPower() } = {}) {
  const pr = Math.min(window.devicePixelRatio || 1, lowPower ? 1.5 : 2);
  renderer.setPixelRatio(pr);
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.82;
  const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: lowPower ? 0 : 4 });
  const composer = new EffectComposer(renderer, rt);
  composer.setPixelRatio(pr);
  composer.addPass(new RenderPass(scene, camera));
  const bloomScale = lowPower ? 0.5 : 1;
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), lowPower ? 0.3 : 0.38, lowPower ? 0.2 : 0.28, 1.05);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  function setSize(w = innerWidth, h = innerHeight) {
    renderer.setSize(w, h); composer.setSize(w, h);
    bloom.setSize(Math.floor(w * pr * bloomScale), Math.floor(h * pr * bloomScale));
  }
  setSize();
  return { composer, setSize, bloom, lowPower };
}
