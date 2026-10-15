import * as THREE from 'three';
import { createSky } from './sky.js';
import { createWaterMaterial } from './water.js';
import { createGroundMaterial, createAwningMaterial } from './toon.js';
import { createPalmMaterial } from './palm.js';
import { createStringLightsMaterial, createNeonMaterial, createWindowMaterial } from './emissive.js';
import { PALETTE, FOG_COLOR } from './palette.js';
import { INTERIOR, createInteriorLighting, createInteriorToonMaterial, createGlassMaterial,
  createLampShadeMaterial, createBulbMaterial, createWallNeonMaterial } from './interior.js';

// Interior name-prefix contract (see README.md). Order matters: first match wins.
const INTERIOR_RULES = [
  ['wall_', 'wall'], ['ceiling', 'ceiling'], ['floor', 'floor'],
  ['counter_top', 'wood'], ['counter_panel', 'pink'], ['counter_', 'wood'],
  ['stool_seat', 'pink'], ['stool_', 'wood'], ['shelf_', 'woodLight'], ['table_', 'woodLight'], ['chair_', 'pink'],
];

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
  const lighting = createInteriorLighting();
  const im = {
    wall: createInteriorToonMaterial(lighting, INTERIOR.wall),
    ceiling: createInteriorToonMaterial(lighting, INTERIOR.ceiling),
    floor: createInteriorToonMaterial(lighting, INTERIOR.wood),
    wood: createInteriorToonMaterial(lighting, INTERIOR.wood),
    woodLight: createInteriorToonMaterial(lighting, INTERIOR.woodLight),
    pink: createInteriorToonMaterial(lighting, INTERIOR.pink),
    glass: createGlassMaterial(), shade: createLampShadeMaterial(),
    bulb: createBulbMaterial(), neonWall: createWallNeonMaterial(),
  };
  const roomBox = new THREE.Box3(); const lampList = []; let roomFrame = null;
  const palms = []; const timed = [m.water, m.lights, m.sign, im.bulb, im.neonWall];
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
    else if (n.startsWith('glass_')) { o.material = im.glass; o.renderOrder = 10; }
    else if (n.startsWith('lamp_bulb')) { o.material = im.bulb; lampList.push(o); }
    else if (n.startsWith('lamp_shade')) o.material = im.shade;
    else if (n.startsWith('lamp_')) o.material = im.wood;
    else if (n.startsWith('neon_wall')) o.material = im.neonWall;
    else { const r = INTERIOR_RULES.find(([p]) => n.startsWith(p)); if (r) {
      o.material = im[r[1]];
      if (r[1] === 'floor' || r[1] === 'ceiling') {
        // room AABB in the parent's frame so rotated buildings still get correct corner AO
        o.updateWorldMatrix(true, false); if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
        roomBox.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrix)); roomFrame = roomFrame || o.parent;
      }
    } }
  });
  if (roomFrame) lighting.setRoom(roomBox, roomFrame.matrixWorld);
  lighting.setLamps(lampList.slice(0, 4).map((o) => ({ position: o.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, -0.15, 0)), radius: 3.6 })));
  const sky = createSky(); scene.add(sky); timed.push(sky.material);
  scene.background = PALETTE.skyHorizon.clone();
  scene.fog = new THREE.Fog(FOG_COLOR.clone(), 55, 180);
  return { materials: { ...m, interior: im, lighting, palms, sky: sky.material }, update(t) { for (const x of timed) x.uniforms.uTime.value = t; } };
}
