import * as THREE from 'three';
import { createToonMaterial } from '../look/index.js';

export const ISLAND_RADIUS = 6;
const R = ISLAND_RADIUS;
export const FLOOR_Y = 1.15;              // café floor / plaza height
const CAFE = { x: 0, z: -1.2, w: 4.6, d: 3.8, h: 2.7, t: 0.14, door: 1.3 };

const mat = (c) => createToonMaterial(c);
function box(name, w, h, d, color, x, y, z, parent) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), typeof color === 'string' ? mat(color) : color);
  m.name = name; m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; parent.add(m); return m;
}
function cyl(name, rt, rb, h, color, x, y, z, parent, seg = 12) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat(color));
  m.name = name; m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; parent.add(m); return m;
}

/** dome height of the island at a flat distance r (matches the lathe below) */
export function groundHeight(r) {
  if (r >= R) return -0.25;
  // invert r = R*cos(a)*(1-0.08t) approximately
  const t = Math.acos(Math.min(1, r / R)) / (Math.PI / 2);
  return Math.max(-0.25, Math.sin(t * Math.PI * 0.5) * 1.35 - 0.25);
}

export function buildIsland(scene) {
  const world = new THREE.Group(); world.name = 'world';
  const colliders = [];   // xz AABBs {minX,maxX,minZ,maxZ}
  const addCol = (x, z, w, d) => colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });

  // water + island dome
  const water = new THREE.Mesh(new THREE.PlaneGeometry(420, 420, 64, 64), new THREE.MeshBasicMaterial());
  water.name = 'water'; water.rotation.x = -Math.PI / 2; world.add(water);
  const pts = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    pts.push(new THREE.Vector2(Math.max(R * Math.cos(t * Math.PI * 0.5) * (1 - 0.08 * t), 0.05), Math.sin(t * Math.PI * 0.5) * 1.35 - 0.25));
  }
  pts.push(new THREE.Vector2(0.01, 1.15));
  const ground = new THREE.Mesh(new THREE.LatheGeometry(pts, 72), new THREE.MeshBasicMaterial());
  ground.name = 'ground'; ground.receiveShadow = true; world.add(ground);

  // plaza deck the café + seating sit on
  cyl('plaza', 3.9, 4.1, 0.25, '#e9c9a0', 0, FLOOR_Y - 0.12, -0.2, world, 40);

  // ---------- café shell (hollow, walk-in) ----------
  const cafe = new THREE.Group(); cafe.name = 'cafe'; cafe.position.set(CAFE.x, FLOOR_Y, CAFE.z); world.add(cafe);
  const { w, d, h, t, door } = CAFE;
  const wall = '#c98f62', inner = '#f6e3cc';
  box('cafe_floor', w, 0.06, d, '#a4704c', 0, 0.03, 0, cafe);
  box('cafe_wall_back', w, h, t, wall, 0, h / 2, -d / 2, cafe);
  box('cafe_wall_left', t, h, d, wall, -w / 2, h / 2, 0, cafe);
  box('cafe_wall_right', t, h, d, wall, w / 2, h / 2, 0, cafe);
  const side = (w - door) / 2;
  box('cafe_wall_front_l', side, h, t, wall, -(door / 2 + side / 2), h / 2, d / 2, cafe);
  box('cafe_wall_front_r', side, h, t, wall, (door / 2 + side / 2), h / 2, d / 2, cafe);
  box('cafe_lintel', door, h - 2.05, t, wall, 0, 2.05 + (h - 2.05) / 2, d / 2, cafe);
  // inner warm lining so the inside reads cosy
  box('cafe_inner_back', w - 0.3, h - 0.1, 0.02, inner, 0, h / 2, -d / 2 + 0.08, cafe);
  // roof (open-able feel: slight overhang, peaked)
  const roof = new THREE.Mesh(new THREE.ConeGeometry(w * 0.78, 1.3, 4), mat('#ff8fa8'));
  roof.name = 'cafe_roof'; roof.rotation.y = Math.PI / 4; roof.scale.z = d / w; roof.position.set(0, h + 0.62, 0); roof.castShadow = true; cafe.add(roof);
  box('cafe_ceiling', w, 0.06, d, '#e8c9a8', 0, h - 0.03, 0, cafe);
  // windows on the front face, either side of the door
  [-1, 1].forEach((s, i) => {
    const win = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.8), new THREE.MeshBasicMaterial());
    win.name = `window_${i}`; win.position.set(s * (door / 2 + side / 2), 1.45, d / 2 + t / 2 + 0.01); cafe.add(win);
  });
  const sign = box('sign', 2.2, 0.42, 0.1, new THREE.MeshBasicMaterial(), 0, h + 0.05, d / 2 + 0.12, cafe);
  const awning = box('awning', w + 0.3, 0.08, 0.9, new THREE.MeshBasicMaterial(), 0, 2.25, d / 2 + 0.45, cafe);
  awning.rotation.x = 0.28;

  // interior: counter, espresso machine, menu board, stools, lamp, cups
  box('counter', 3.0, 1.0, 0.6, '#8a5a3c', 0, 0.5, -d / 2 + 1.0, cafe);
  box('counter_top', 3.15, 0.07, 0.72, '#f3e1c6', 0, 1.03, -d / 2 + 1.0, cafe);
  box('espresso', 0.55, 0.45, 0.35, '#b8c3cc', -0.8, 1.29, -d / 2 + 0.95, cafe);
  box('espresso_top', 0.6, 0.06, 0.4, '#3a2b25', -0.8, 1.54, -d / 2 + 0.95, cafe);
  [0.35, 0.65, 0.95].forEach((x, i) => {
    cyl(`cup_${i}`, 0.07, 0.055, 0.14, ['#ffffff', '#ffd6e2', '#cfeee9'][i], x, 1.14, -d / 2 + 0.9, cafe, 10);
  });
  const menuTex = makeMenuTexture();
  const board = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.0), new THREE.MeshBasicMaterial({ map: menuTex, toneMapped: false }));
  board.name = 'menu_board'; board.position.set(0, 1.95, -d / 2 + 0.1); cafe.add(board);
  [-1.2, 1.4].forEach((x, i) => {
    cyl(`stool_seat_${i}`, 0.22, 0.22, 0.07, '#ff8fa8', x, 0.62, d / 2 - 0.9, cafe, 14);
    cyl(`stool_leg_${i}`, 0.04, 0.05, 0.6, '#5a3d2c', x, 0.3, d / 2 - 0.9, cafe, 6);
    cyl(`ttable_${i}`, 0.35, 0.35, 0.05, '#f6e3cc', x + (i ? -0.55 : 0.55), 0.82, d / 2 - 0.9, cafe, 16);
    cyl(`ttable_leg_${i}`, 0.04, 0.05, 0.8, '#5a3d2c', x + (i ? -0.55 : 0.55), 0.4, d / 2 - 0.9, cafe, 6);
  });
  const lampShade = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.25, 14, 1, true), new THREE.MeshBasicMaterial({ color: '#ffcf8a', side: THREE.DoubleSide }));
  lampShade.name = 'lamp_shade'; lampShade.position.set(0, h - 0.45, -0.2); cafe.add(lampShade);
  const lamp = new THREE.PointLight('#ffb36b', 7, 6, 1.6); lamp.position.set(0, h - 0.6, -0.2); cafe.add(lamp);
  const lamp2 = new THREE.PointLight('#ffb36b', 4, 4, 1.6); lamp2.position.set(0, 1.6, -d / 2 + 0.9); cafe.add(lamp2);

  // colliders (world space): walls + counter
  const cx = CAFE.x, cz = CAFE.z;
  addCol(cx, cz - d / 2, w, t + 0.3);
  addCol(cx - w / 2, cz, t + 0.3, d);
  addCol(cx + w / 2, cz, t + 0.3, d);
  addCol(cx - (door / 2 + side / 2), cz + d / 2, side, t + 0.3);
  addCol(cx + (door / 2 + side / 2), cz + d / 2, side, t + 0.3);
  addCol(cx, cz - d / 2 + 1.0, 3.2, 0.9);

  // ---------- outdoor seating ----------
  [[-2.7, 1.9], [2.7, 1.9]].forEach(([x, z], i) => {
    cyl(`table_${i}`, 0.42, 0.42, 0.06, '#fff3e6', x, FLOOR_Y + 0.72, z, world, 14);
    cyl(`table_leg_${i}`, 0.04, 0.05, 0.7, '#5a3d2c', x, FLOOR_Y + 0.36, z, world, 6);
    cyl(`umb_pole_${i}`, 0.025, 0.025, 1.5, '#ffffff', x, FLOOR_Y + 1.1, z, world, 6);
    const um = new THREE.Mesh(new THREE.ConeGeometry(0.9, 0.38, 10), mat(i ? '#ffd27a' : '#8fe3d8'));
    um.name = `umbrella_${i}`; um.position.set(x, FLOOR_Y + 1.9, z); um.castShadow = true; world.add(um);
    addCol(x, z, 0.9, 0.9);
  });

  // ---------- palms ----------
  [[-4.6, -1.8], [4.5, -2.2], [-3.4, 3.7], [3.7, 3.4]].forEach(([x, z], i) => {
    const p = makePalm(`palm_${i}`); p.position.set(x, groundHeight(Math.hypot(x, z)) - 0.05, z);
    p.scale.setScalar(0.85 + (i % 2) * 0.12); p.rotation.y = i * 1.3; world.add(p);
    addCol(x, z, 0.5, 0.5);
  });

  // string lights from palm to café roof edge
  const bulbs = new THREE.Group(); bulbs.name = 'lights_string'; world.add(bulbs);
  const strand = (a, b, sag, off) => {
    for (let k = 0; k <= 10; k++) {
      const tt = k / 10, p = a.clone().lerp(b, tt); p.y -= Math.sin(tt * Math.PI) * sag;
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), new THREE.MeshBasicMaterial());
      bulb.name = `lights_${off + k}`; bulb.position.copy(p); bulbs.add(bulb);
    }
  };
  strand(new THREE.Vector3(-3.4, 3.9, 3.7), new THREE.Vector3(-2.2, FLOOR_Y + 2.6, 0.7), 0.4, 0);
  strand(new THREE.Vector3(3.7, 3.9, 3.4), new THREE.Vector3(2.2, FLOOR_Y + 2.6, 0.7), 0.4, 20);

  // ---------- dock with posts into the water ----------
  const dock = new THREE.Group(); dock.name = 'dock'; dock.position.set(0, 0, 5.0); world.add(dock);
  const DY = 0.32;
  for (let k = 0; k < 9; k++) box(`plank_${k}`, 1.5, 0.08, 0.36, k % 2 ? '#c08a5c' : '#b07a4e', 0, DY, k * 0.4, dock);
  [0, 1.6, 3.2].forEach((zz, i) => [-0.7, 0.7].forEach((xx, j) => cyl(`post_${i}_${j}`, 0.07, 0.08, 1.3, '#7a4f33', xx, DY - 0.45, zz, dock, 8)));
  box('dock_rail_l', 0.06, 0.06, 3.4, '#7a4f33', -0.72, DY + 0.5, 1.6, dock);
  box('dock_rail_r', 0.06, 0.06, 3.4, '#7a4f33', 0.72, DY + 0.5, 1.6, dock);

  scene.add(world);
  return {
    world, colliders, islandRadius: R,
    dock: { minX: -0.7, maxX: 0.7, minZ: 4.9, maxZ: 8.5, y: DY },
    counterZone: { x: CAFE.x, z: CAFE.z - d / 2 + 1.85, r: 0.9 },
    insideCafe: (x, z) => Math.abs(x - CAFE.x) < w / 2 && Math.abs(z - CAFE.z) < d / 2,
    spawn: new THREE.Vector3(0, 0, 6.8),
  };
}

function makeMenuTexture() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 232;
  const g = c.getContext('2d');
  g.fillStyle = '#2b1e1a'; g.fillRect(0, 0, 512, 232);
  g.strokeStyle = '#c98f62'; g.lineWidth = 10; g.strokeRect(5, 5, 502, 222);
  g.fillStyle = '#ff9ec0'; g.font = 'bold 34px system-ui'; g.textAlign = 'center'; g.fillText('NEON BREW', 256, 46);
  g.font = '24px system-ui'; g.textAlign = 'left'; g.fillStyle = '#f6e3cc';
  [['Neon Latte', '₹180'], ['Island Cold Brew', '₹160'], ['Pink Foam Matcha', '₹200'], ['Sunset Mocha', '₹190']].forEach(([n, p], i) => {
    g.fillText(n, 40, 92 + i * 36); g.textAlign = 'right'; g.fillText(p, 472, 92 + i * 36); g.textAlign = 'left';
  });
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; return tx;
}

function makePalm(name) {
  const H = 3.6, positions = [], segs = 8, rings = 10;
  for (let i = 0; i < rings; i++) {
    const y0 = (i / rings) * H, y1 = ((i + 1) / rings) * H, r0 = 0.18 - i * 0.008, r1 = 0.18 - (i + 1) * 0.008;
    for (let j = 0; j < segs; j++) {
      const a0 = (j / segs) * Math.PI * 2, a1 = ((j + 1) / segs) * Math.PI * 2;
      const P = (a, r, y) => [Math.cos(a) * r, y, Math.sin(a) * r];
      for (const v of [P(a0, r0, y0), P(a1, r0, y0), P(a1, r1, y1), P(a0, r0, y0), P(a1, r1, y1), P(a0, r1, y1)]) positions.push(...v);
    }
  }
  for (let f = 0; f < 7; f++) {
    const ang = (f / 7) * Math.PI * 2 + 0.2, len = 1.6 + (f % 2) * 0.25;
    const tipX = Math.cos(ang) * len, tipZ = Math.sin(ang) * len, tipY = H - 0.15 - Math.sin(0.35) * len;
    const midX = tipX * 0.55, midZ = tipZ * 0.55, midY = H + 0.25, sw = 0.28;
    const sx = Math.cos(ang + Math.PI / 2) * sw, sz = Math.sin(ang + Math.PI / 2) * sw;
    for (const v of [[0, H, 0], [midX + sx, midY, midZ + sz], [tipX, tipY, tipZ], [0, H, 0], [tipX, tipY, tipZ], [midX - sx, midY, midZ - sz]]) positions.push(...v);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial()); m.name = name; m.castShadow = true; return m;
}
