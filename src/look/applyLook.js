import * as THREE from 'three';
import { createSky } from './sky.js';
import { createWaterMaterial } from './water.js';
import { createGroundMaterial, createAwningMaterial } from './toon.js';
import { createPalmMaterial } from './palm.js';
import { createStringLightsMaterial, createNeonMaterial, createWindowMaterial } from './emissive.js';
import { PALETTE, FOG_COLOR } from './palette.js';

/** Assigns look materials by mesh name and adds the sky. Returns { update(t), materials }. */
export function applyLook(scene, { islandRadius = 6 } = {}) {
  const m = {
    water: createWaterMaterial({ islandRadius }),
    ground: createGroundMaterial({ islandRadius }),
    lights: createStringLightsMaterial(),
    sign: createNeonMaterial({ color: PALETTE.neonPink, intensity: 1.5 }),
    window: createWindowMaterial(),
    awning: createAwningMaterial(),
  };
  const palms = []; const timed = [m.water, m.lights, m.sign];
  scene.traverse((o) => {
    if (!o.isMesh) return; const n = o.name || '';
    if (n === 'ground') o.material = m.ground;
    else if (n === 'water') o.material = m.water;
    else if (n === 'sign') o.material = m.sign;
    else if (n.startsWith('palm_')) {
      o.geometry.computeBoundingBox();
      const pm = createPalmMaterial({ height: Math.max(0.5, o.geometry.boundingBox.max.y) });
      palms.push(pm); timed.push(pm); o.material = pm;
    } else if (n.startsWith('lights_')) o.material = m.lights;
    else if (n.startsWith('window_')) o.material = m.window;
    else if (n === 'awning') o.material = m.awning;
  });
  const sky = createSky(); scene.add(sky); timed.push(sky.material);
  scene.background = PALETTE.skyHorizon.clone();
  scene.fog = new THREE.Fog(FOG_COLOR.clone(), 55, 180);
  return { materials: { ...m, palms, sky: sky.material }, update(t) { for (const x of timed) x.uniforms.uTime.value = t; } };
}
