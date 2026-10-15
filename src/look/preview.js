import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { applyLook, setupPost, createToonMaterial, createNeonMaterial, PALETTE } from './index.js';

const R = 6;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 600);
camera.position.set(11, 6.5, 13);
if (innerWidth < innerHeight) camera.position.multiplyScalar(1.6);

const water = new THREE.Mesh(new THREE.PlaneGeometry(420, 420, 64, 64), new THREE.MeshBasicMaterial());
water.rotation.x = -Math.PI / 2; water.name = 'water'; scene.add(water);

const pts = [];
for (let i = 0; i <= 24; i++) {
  const t = i / 24;
  const r = R * Math.cos(t * Math.PI * 0.5) * (1 - 0.08 * t);
  const y = Math.sin(t * Math.PI * 0.5) * 1.35 - 0.25;
  pts.push(new THREE.Vector2(Math.max(r, 0.05), y));
}
pts.push(new THREE.Vector2(0.01, 1.15));
const ground = new THREE.Mesh(new THREE.LatheGeometry(pts, 72), new THREE.MeshBasicMaterial());
ground.name = 'ground'; scene.add(ground);

const cafe = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.2, 2.4), createToonMaterial(PALETTE.woodWall));
cafe.position.set(0, 2.05, -1.0); cafe.name = 'cafe'; scene.add(cafe);
const roof = new THREE.Mesh(new THREE.ConeGeometry(2.7, 1.35, 4), createToonMaterial('#f0a090'));
roof.position.set(0, 3.75, -1.0); roof.rotation.y = Math.PI / 4; scene.add(roof);
// cream trim: corner posts + eave band
const trimMat = createToonMaterial(PALETTE.woodTrim);
[[-1.6, 0.2], [1.6, 0.2], [-1.6, -2.2], [1.6, -2.2]].forEach(([x, z]) => {
  const t = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.25, 0.14), trimMat); t.position.set(x, 2.05, z); scene.add(t);
});
const eave = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.14, 2.6), trimMat); eave.position.set(0, 3.12, -1.0); scene.add(eave);

// striped awning over the front
const awning = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.9), new THREE.MeshBasicMaterial());
awning.position.set(0, 2.35, 0.55); awning.rotation.x = -Math.PI / 2 + 0.55; awning.name = 'awning'; scene.add(awning);
// counter + glowing coffee cup with steam
const counter = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.55, 0.45), createToonMaterial(PALETTE.woodDark));
counter.position.set(0, 1.25, 0.6); scene.add(counter);
const counterTop = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.07, 0.52), trimMat);
counterTop.position.set(0, 1.55, 0.6); scene.add(counterTop);
const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.1, 0.22, 12), createToonMaterial('#fff4ea'));
cup.position.set(0.5, 1.69, 0.6); scene.add(cup);
const coffee = new THREE.Mesh(new THREE.CircleGeometry(0.115, 12), createNeonMaterial({ color: PALETTE.coffee, intensity: 1.2 }));
coffee.rotation.x = -Math.PI / 2; coffee.position.set(0.5, 1.805, 0.6); scene.add(coffee);
const steam = [];
for (let i = 0; i < 3; i++) {
  const s = new THREE.Mesh(new THREE.SphereGeometry(0.06 - i * 0.012, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.5 }));
  s.position.set(0.5, 1.95 + i * 0.13, 0.6); scene.add(s); steam.push(s);
}
const sign = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.42, 0.1), new THREE.MeshBasicMaterial());
sign.position.set(0, 2.78, 0.27); sign.name = 'sign'; scene.add(sign);

[-0.85, 0.85].forEach((x, i) => {
  const w = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 0.85), new THREE.MeshBasicMaterial());
  w.position.set(x, 1.75, 0.21); w.name = `window_${i}`; scene.add(w);
});

// cute extras: pastel flower box under the counter, potted plants by the door
const flowerCols = [PALETTE.flowerA, PALETTE.flowerB, PALETTE.flowerC, PALETTE.flowerA, PALETTE.flowerB];
const fbox = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.22, 0.28), createToonMaterial('#9fd8c8'));
fbox.position.set(0, 0.9, 0.95); scene.add(fbox);
for (let i = 0; i < 9; i++) {
  const f = new THREE.Mesh(new THREE.IcosahedronGeometry(0.1, 0), createToonMaterial(flowerCols[i % 5]));
  f.position.set(-0.96 + i * 0.24, 1.08, 0.95 + (i % 2) * 0.05); scene.add(f);
}
function pot(x, z, leaf) {
  const p = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.16, 0.36, 10), createToonMaterial(PALETTE.pot));
  p.position.set(x, 1.0, z); scene.add(p);
  const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.32, 0), createToonMaterial(leaf));
  b.position.set(x, 1.38, z); scene.add(b);
  const fl = new THREE.Mesh(new THREE.IcosahedronGeometry(0.08, 0), createToonMaterial(PALETTE.flowerA));
  fl.position.set(x + 0.12, 1.62, z + 0.12); scene.add(fl);
}
pot(-1.9, 0.75, '#5cc068'); pot(1.9, 0.75, '#6ccc70');

function makePalm(px, pz, scale = 1, name = 'palm_0') {
  const H = 3.6;
  const positions = [];
  const normals = [];
  // trunk (tapered cylinder as triangle strip approx via many quads)
  const segs = 8, rings = 10;
  for (let i = 0; i < rings; i++) {
    const y0 = (i / rings) * H, y1 = ((i + 1) / rings) * H;
    const r0 = 0.18 - i * 0.008, r1 = 0.18 - (i + 1) * 0.008;
    for (let j = 0; j < segs; j++) {
      const a0 = (j / segs) * Math.PI * 2, a1 = ((j + 1) / segs) * Math.PI * 2;
      const p = [
        [Math.cos(a0) * r0, y0, Math.sin(a0) * r0],
        [Math.cos(a1) * r0, y0, Math.sin(a1) * r0],
        [Math.cos(a1) * r1, y1, Math.sin(a1) * r1],
        [Math.cos(a0) * r0, y0, Math.sin(a0) * r0],
        [Math.cos(a1) * r1, y1, Math.sin(a1) * r1],
        [Math.cos(a0) * r1, y1, Math.sin(a0) * r1],
      ];
      for (const v of p) { positions.push(...v); normals.push(v[0], 0, v[2]); }
    }
  }
  // fronds
  const fronds = 7;
  for (let f = 0; f < fronds; f++) {
    const ang = (f / fronds) * Math.PI * 2 + 0.2;
    const len = 1.6 + (f % 2) * 0.25;
    const tipY = H - 0.15 - Math.sin(0.35) * len;
    const tipX = Math.cos(ang) * len;
    const tipZ = Math.sin(ang) * len;
    const midX = tipX * 0.55, midZ = tipZ * 0.55, midY = H + 0.25;
    const w = 0.28;
    const side = [Math.cos(ang + Math.PI / 2) * w, Math.sin(ang + Math.PI / 2) * w];
    const verts = [
      [0, H, 0], [midX + side[0], midY, midZ + side[1]], [tipX, tipY, tipZ],
      [0, H, 0], [tipX, tipY, tipZ], [midX - side[0], midY, midZ - side[1]],
    ];
    for (const v of verts) { positions.push(...v); normals.push(0, 1, 0); }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial());
  mesh.name = name;
  mesh.position.set(px, 0.95, pz);
  mesh.scale.setScalar(scale);
  scene.add(mesh);
  return mesh;
}
makePalm(-3.5, 2.0, 1.05, 'palm_0');
makePalm(3.3, 1.5, 0.92, 'palm_1');
makePalm(-1.7, -3.4, 1.12, 'palm_2');

const curve = new THREE.CatmullRomCurve3([
  new THREE.Vector3(-3.5, 4.5, 2.0),
  new THREE.Vector3(-1.4, 3.9, 0.5),
  new THREE.Vector3(1.5, 4.1, 0.3),
  new THREE.Vector3(3.3, 4.4, 1.5),
]);
const lights = new THREE.Mesh(new THREE.TubeGeometry(curve, 48, 0.04, 6, false), new THREE.MeshBasicMaterial());
lights.name = 'lights_0'; scene.add(lights);
// discrete bulbs for nicer twinkle
const bulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(0.07, 6, 6), new THREE.MeshBasicMaterial(), 14);
const m4 = new THREE.Matrix4();
for (let i = 0; i < 14; i++) {
  const p = curve.getPoint(i / 13);
  m4.makeTranslation(p.x, p.y, p.z);
  bulbs.setMatrixAt(i, m4);
}
bulbs.name = 'lights_1'; scene.add(bulbs);

// wooden dock: planks with gaps on posts, running from the beach out over the water
const dock = new THREE.Group(); dock.name = 'dock';
const plankMat = createToonMaterial(PALETTE.pier), postMat = createToonMaterial(PALETTE.pierDark);
const DL = 6.4, DW = 1.2, deckY = 0.42;
for (let i = 0, n = 17; i < n; i++) {
  const pl = new THREE.Mesh(new THREE.BoxGeometry(0.31, 0.08, DW), plankMat);
  pl.position.set(i * (DL / n) + 0.19, deckY, 0); dock.add(pl);
}
[-DW / 2 + 0.07, DW / 2 - 0.07].forEach((z) => {
  const rail = new THREE.Mesh(new THREE.BoxGeometry(DL, 0.08, 0.08), postMat); rail.position.set(DL / 2, deckY - 0.08, z); dock.add(rail);
  for (let x = 1.2; x <= DL + 0.01; x += 1.3) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 1.3, 8), postMat); p.position.set(x, deckY - 0.25, z); dock.add(p);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.28, 8), postMat); top.position.set(x, deckY + 0.16, z); dock.add(top);
  }
});
const ang = Math.atan2(2.6, 4.4);
dock.position.set(Math.cos(ang) * 4.4, 0, Math.sin(ang) * 4.4); dock.rotation.y = -ang; scene.add(dock);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setClearColor(PALETTE.skyHorizon);
document.body.appendChild(renderer.domElement);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1.5, 0); controls.enableDamping = true; controls.maxDistance = 40; controls.minPolarAngle = 0.2; controls.maxPolarAngle = Math.PI * 0.48; controls.update();

const look = applyLook(scene, { islandRadius: R });
const postFx = setupPost(renderer, scene, camera);
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); postFx.setSize();
});
const clock = new THREE.Clock();
(function loop() {
  requestAnimationFrame(loop);
  const t = clock.getElapsedTime(); look.update(t);
  steam.forEach((s, i) => { s.position.x = 0.5 + Math.sin(t * 2 + i) * 0.04; s.material.opacity = 0.35 + 0.15 * Math.sin(t * 1.5 + i); });
  controls.update();
  postFx.composer.render();
})();
