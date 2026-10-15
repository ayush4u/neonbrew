import * as THREE from 'three';
import './style.css';
import { applyLook, setupPost } from '../look/index.js';
import { buildIsland, ISLAND_RADIUS } from './island.js';
import { createWalkControls } from './controls.js';
import { createShop } from './shop.js';

const touch = matchMedia('(pointer: coarse)').matches;
const hint = document.createElement('div'); hint.className = 'nb-hint';
hint.textContent = touch ? 'Joystick to walk · drag to look · find the counter inside' : 'WASD to walk · drag to look · walk in and order at the counter';
document.body.appendChild(hint);

const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
renderer.shadowMap.enabled = !touch; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(touch ? 70 : 62, innerWidth / innerHeight, 0.05, 500);
camera.userData.canvas = renderer.domElement; scene.add(camera);
scene.add(new THREE.HemisphereLight('#ffe2d0', '#6a5a8a', 0.9));
const sun = new THREE.DirectionalLight('#ffd2a8', 1.6); sun.position.set(9, 14, 8); sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024); Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9 }); scene.add(sun);

const island = buildIsland(scene);
// GLB props load async; apply the name-based look once they are in the scene so they get materials too
let look = { update() {} };
island.ready.then((names) => {
  look = applyLook(scene, { islandRadius: ISLAND_RADIUS });
  window.__nbProps = names; console.log(`[world] props ready: ${names.length} meshes`);
});
const post = setupPost(renderer, scene, camera);
const walk = createWalkControls(camera, island);
const shop = createShop(camera, island);

// screenshot / deep-link helpers: ?at=outside|door|inside|counter  &buy=latte
const q = new URLSearchParams(location.search);
const spots = { outside: [0, 6.8, Math.PI, -0.06], door: [0, 2.0, Math.PI, -0.05], inside: [1.2, 0.2, Math.PI + 0.45, -0.12], counter: [0, -0.6, Math.PI, -0.18], window: [-1.48, 2.3, Math.PI, -0.1], inwindow: [1.0, -0.4, -1.45, 0.02] };
if (spots[q.get('at')]) walk.place(...spots[q.get('at')]);
if (q.get('buy')) setTimeout(() => shop.buy(q.get('buy')), 1500);
if (q.get('menu')) setTimeout(() => shop.openMenu(), 1500);

const resize = () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); post.setSize(); };
addEventListener('resize', resize); resize();
const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(0.05, clock.getDelta()), t = clock.elapsedTime;
  walk.update(dt); shop.update(walk.position, dt, t); look.update(t);
  post.composer.render();
});
