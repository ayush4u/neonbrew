import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { createToonMaterial } from '../look/index.js';

/** CC0 GLB prop loader (Kenney kits, meshopt-compressed, in public/models/). */
const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const cache = new Map();
const toonCache = new Map();
const base = (import.meta.env && import.meta.env.BASE_URL) || '/';
function load(file) {
  if (!cache.has(file)) cache.set(file, loader.loadAsync(`${base}models/${file}.glb`).then((g) => g.scene));
  return cache.get(file);
}
const toon = (c) => { if (!toonCache.has(c)) toonCache.set(c, createToonMaterial(c)); return toonCache.get(c); };

/**
 * Place a GLB prop: normalised so its base sits at y and it is centred on x/z.
 * opts: { x, y, z, ry, h (target height) | w (target max footprint), colors: {materialName: '#hex'}, toonAll: '#hex' }
 * Meshes are named `${name}` (or `${name}_${k}` when the model has several parts).
 */
export async function placeProp(parent, file, name, opts = {}, names = []) {
  const src = await load(file);
  const inner = src.clone(true);
  const box = new THREE.Box3().setFromObject(inner), size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
  const s = opts.s ?? (opts.h ? opts.h / size.y : (opts.w ?? 1) / Math.max(size.x, size.z));
  inner.scale.setScalar(s); inner.position.set(-c.x * s, -box.min.y * s, -c.z * s);
  const g = new THREE.Group(); g.name = name; g.add(inner);
  g.position.set(opts.x ?? 0, opts.y ?? 0, opts.z ?? 0); g.rotation.y = opts.ry ?? 0;
  const meshes = []; inner.traverse((o) => { if (o.isMesh) meshes.push(o); });
  meshes.forEach((m, k) => {
    m.name = meshes.length > 1 ? `${name}_${k}` : name; names.push(m.name);
    m.castShadow = m.receiveShadow = true;
    const swap = (mt) => {
      const col = opts.colors?.[mt.name] ?? opts.toonAll;
      if (col) return toon(col);
      if (opts.colors && !mt.map) return toon('#' + mt.color.getHexString());
      return mt;
    };
    m.material = Array.isArray(m.material) ? m.material.map(swap) : swap(m.material);
  });
  parent.add(g); return g;
}
