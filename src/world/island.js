import * as THREE from 'three';
import { createToonMaterial } from '../look/index.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { placeProp } from './props.js';

export const ISLAND_RADIUS = 6;
const R = ISLAND_RADIUS;
export const FLOOR_Y = 1.15;              // café floor / plaza height
const CAFE = { x: 0, z: -1.2, w: 4.6, d: 3.8, h: 2.7, t: 0.14, door: 1.3 };

const mat = (c) => createToonMaterial(c);
function box(name, w, h, d, color, x, y, z, parent) {
  const bev = Math.min(0.06, Math.min(w, h, d) * 0.35);
  const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 4, bev), typeof color === 'string' ? mat(color) : color);
  m.name = name; m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; parent.add(m); return m;
}
function cyl(name, rt, rb, h, color, x, y, z, parent, seg = 32) {
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


/** Arched opening path (rectangle + semicircle top). */
function archHole(cx, y0, w, spring) {
  const p = new THREE.Path(); const r = w / 2;
  p.moveTo(cx - r, y0); p.lineTo(cx + r, y0); p.lineTo(cx + r, spring);
  p.absarc(cx, spring, r, 0, Math.PI, false); p.lineTo(cx - r, y0); return p;
}
function extrude(shape, depth, bevel = 0.025) {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 3, curveSegments: 28 });
  g.translate(0, 0, -depth / 2); return g;
}
function meshOf(name, geo, material, parent) {
  const m = new THREE.Mesh(geo, typeof material === 'string' ? mat(material) : material);
  m.name = name; m.castShadow = m.receiveShadow = true; parent.add(m); return m;
}
/** arch-shaped ring (frame) around an arched opening */
function archFrame(cx, y0, w, spring, band) {
  const s = new THREE.Shape(); const r = w / 2 + band;
  s.moveTo(cx - r, y0 - band); s.lineTo(cx + r, y0 - band); s.lineTo(cx + r, spring);
  s.absarc(cx, spring, r, 0, Math.PI, false); s.lineTo(cx - r, y0 - band);
  s.holes.push(archHole(cx, y0, w, spring)); return s;
}
function stripedCone(radius, height, a, b, seg = 16) {
  const g = new THREE.ConeGeometry(radius, height, seg, 1, false).toNonIndexed();
  const pos = g.attributes.position, col = [], ca = new THREE.Color(a), cb = new THREE.Color(b);
  for (let i = 0; i < pos.count; i += 3) {
    let ang = 0; for (let k = 0; k < 3; k++) ang += Math.atan2(pos.getZ(i + k), pos.getX(i + k)) / 3;
    const cx = (pos.getX(i) + pos.getX(i + 1) + pos.getX(i + 2)) / 3, cz = (pos.getZ(i) + pos.getZ(i + 1) + pos.getZ(i + 2)) / 3;
    const sector = Math.floor(((Math.atan2(cz, cx) + Math.PI) / (Math.PI * 2)) * seg) % seg;
    const c = sector % 2 ? ca : cb; for (let k = 0; k < 3; k++) col.push(c.r, c.g, c.b);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.computeVertexNormals(); return g;
}
function textTexture(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'));
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; return tx;
}

export function buildIsland(scene) {
  const world = new THREE.Group(); world.name = 'world';
  const colliders = [];   // xz AABBs {minX,maxX,minZ,maxZ}
  const addCol = (x, z, w, d) => colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
  const propNames = [];   // names of new prop meshes (procedural + GLB) for the look layer
  const P = (m) => { propNames.push(m.name); return m; };
  const loads = [];
  const glb = (parent, file, name, opts) => loads.push(placeProp(parent, file, name, opts, propNames).catch((e) => console.warn('prop failed', file, e)));

  // water + island dome
  const water = new THREE.Mesh(new THREE.PlaneGeometry(420, 420, 64, 64), new THREE.MeshBasicMaterial());
  water.name = 'water'; water.rotation.x = -Math.PI / 2; world.add(water);
  const pts = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    pts.push(new THREE.Vector2(Math.max(R * Math.cos(t * Math.PI * 0.5) * (1 - 0.08 * t), 0.05), Math.sin(t * Math.PI * 0.5) * 1.35 - 0.25));
  }
  pts.push(new THREE.Vector2(0.01, 1.15));
  const ground = new THREE.Mesh(new THREE.LatheGeometry(pts, 128), new THREE.MeshBasicMaterial());
  ground.name = 'ground'; ground.receiveShadow = true; world.add(ground);

  cyl('plaza', 3.9, 4.1, 0.25, '#e9c9a0', 0, FLOOR_Y - 0.12, -0.2, world, 48);

  // ---------- café shell: ONE set of walls with real arched openings ----------
  const cafe = new THREE.Group(); cafe.name = 'cafe'; cafe.position.set(CAFE.x, FLOOR_Y, CAFE.z); world.add(cafe);
  const { w, d, h, t, door } = CAFE;
  const wall = '#f2b48a', trim = '#fff1e2', pink = '#ff8fab', wood = '#b9784f';
  const side = (w - door) / 2, winX = door / 2 + side / 2;
  const WIN = { w: 1.05, y0: 0.82, spring: 1.62 };       // arched windows: sill 0.82, arch top 2.145
  const DOOR = { spring: 1.55 };                          // door arch top 2.2

  box('cafe_floor', w - 0.05, 0.06, d - 0.05, '#d9a477', 0, 0.03, 0, cafe);
  // floor tiles (checker) for a cosy café feel
  const tileTex = textTexture(256, 256, (g) => { g.fillStyle = '#f7e4cf'; g.fillRect(0, 0, 256, 256); g.fillStyle = '#e7b48f'; for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) if ((i + j) % 2) g.fillRect(i * 32, j * 32, 32, 32); });
  tileTex.wrapS = tileTex.wrapT = THREE.RepeatWrapping; tileTex.repeat.set(2.3, 1.9);
  const tiles = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.2, d - 0.2), new THREE.MeshLambertMaterial({ map: tileTex }));
  tiles.name = 'cafe_floor_tiles'; tiles.rotation.x = -Math.PI / 2; tiles.position.y = 0.065; tiles.receiveShadow = true; cafe.add(P(tiles));

  // front wall: door notch + two arched window holes
  const fs = new THREE.Shape(); const dr = door / 2;
  fs.moveTo(-w / 2, 0); fs.lineTo(-dr, 0); fs.lineTo(-dr, DOOR.spring); fs.absarc(0, DOOR.spring, dr, Math.PI, 0, true);
  fs.lineTo(dr, 0); fs.lineTo(w / 2, 0); fs.lineTo(w / 2, h); fs.lineTo(-w / 2, h); fs.lineTo(-w / 2, 0);
  fs.holes.push(archHole(-winX, WIN.y0, WIN.w, WIN.spring), archHole(winX, WIN.y0, WIN.w, WIN.spring));
  meshOf('cafe_wall_front', extrude(fs, t), wall, cafe).position.z = d / 2;
  // side walls with one arched window each (sky visible from inside)
  const sideWall = (name, x, winIdx) => {
    const s = new THREE.Shape(); s.moveTo(-d / 2, 0); s.lineTo(d / 2, 0); s.lineTo(d / 2, h); s.lineTo(-d / 2, h); s.lineTo(-d / 2, 0);
    s.holes.push(archHole(-0.55, WIN.y0, WIN.w, WIN.spring));
    const m = meshOf(name, extrude(s, t), wall, cafe); m.rotation.y = Math.PI / 2; m.position.x = x;
    const f = meshOf(`window_${winIdx}`, extrude(archFrame(-0.55, WIN.y0, WIN.w, WIN.spring, 0.09), t + 0.08, 0.015), new THREE.MeshBasicMaterial(), cafe);
    f.rotation.y = Math.PI / 2; f.position.x = x;
    const sill = box(`window_sill_${winIdx}`, 0.3, 0.07, WIN.w + 0.3, trim, x, WIN.y0 - 0.02, 0.55, cafe); P(sill);
  };
  sideWall('cafe_wall_left', -w / 2, 2); sideWall('cafe_wall_right', w / 2, 3);
  box('cafe_wall_back', w, h, t, wall, 0, h / 2, -d / 2, cafe);
  box('cafe_inner_back', w - 0.3, h - 0.1, 0.02, '#ffe9d6', 0, h / 2, -d / 2 + 0.08, cafe);
  // wainscot band inside (two-tone walls)
  P(box('cafe_wainscot_back', w - 0.3, 0.9, 0.03, '#9ed9cc', 0, 0.45, -d / 2 + 0.1, cafe));
  // front window frames (named window_* for the look layer: warm glowing arches) + sills + door frame
  [-1, 1].forEach((sg, i) => {
    meshOf(`window_${i}`, extrude(archFrame(sg * winX, WIN.y0, WIN.w, WIN.spring, 0.09), t + 0.08, 0.015), new THREE.MeshBasicMaterial(), cafe).position.z = d / 2;
    P(box(`window_sill_${i}`, WIN.w + 0.3, 0.07, 0.34, trim, sg * winX, WIN.y0 - 0.02, d / 2 + 0.04, cafe));
    P(box(`window_box_${i}`, WIN.w + 0.1, 0.18, 0.2, pink, sg * winX, WIN.y0 - 0.16, d / 2 + 0.2, cafe));
    for (let k = 0; k < 5; k++) {
      const fl = new THREE.Mesh(new THREE.IcosahedronGeometry(0.075, 1), mat(['#ff6f91', '#ffd166', '#fff3e6', '#ff9ec0', '#9be37a'][k]));
      fl.name = `window_flower_${i}_${k}`; fl.position.set(sg * winX - 0.4 + k * 0.2, WIN.y0 - 0.02 + (k % 2) * 0.04, d / 2 + 0.2); cafe.add(P(fl));
    }
  });
  P(meshOf('door_frame', extrude(archFrame(0, 0.09, door, DOOR.spring, 0.1), t + 0.1, 0.015), trim, cafe)).position.z = d / 2;

  // arched (barrel-vault) pink roof over the same shell
  const RX = w / 2, RY = 1.25, OV = 0.28;
  const rs = new THREE.Shape(); rs.absellipse(0, 0, RX + OV, RY + OV * 0.8, 0, Math.PI, false);
  rs.lineTo(-RX + 0.02, 0); rs.absellipse(0, 0, RX - 0.02, RY, Math.PI, 0, true); rs.lineTo(RX + OV, 0);
  const roof = meshOf('cafe_roof', extrude(rs, d + 0.7, 0.06), pink, cafe); roof.position.set(0, h, 0);
  // cream underside lining visible from inside
  const vaultGeo = new THREE.CylinderGeometry(RX - 0.03, RX - 0.03, d - 0.1, 40, 1, true, Math.PI / 2, Math.PI);
  vaultGeo.rotateX(Math.PI / 2); vaultGeo.scale(1, RY / RX, 1);
  const vm = mat('#fff1e2'); vm.side = THREE.BackSide;
  P(meshOf('cafe_vault_inner', vaultGeo, vm, cafe)).position.y = h;
  // gable ends (fill the arch above the walls)
  const gs = new THREE.Shape(); gs.absellipse(0, 0, RX, RY, 0, Math.PI, false); gs.lineTo(RX, 0);
  const gf = meshOf('cafe_gable_front', extrude(gs, t, 0.02), wall, cafe); gf.position.set(0, h, d / 2);
  const gb = meshOf('cafe_gable_back', extrude(gs, t, 0.02), wall, cafe); gb.position.set(0, h, -d / 2);
  P(gf); P(gb);
  // scalloped trim along the roof's front edge
  for (let k = 0; k <= 16; k++) {
    const a = (k / 16) * Math.PI, sc = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 12), mat(k % 2 ? '#ffd3de' : '#fff1e2'));
    sc.name = `roof_trim_${k}`; sc.position.set(Math.cos(a) * (RX + OV + 0.02), h + Math.sin(a) * (RY + OV * 0.8 + 0.02), d / 2 + 0.36); cafe.add(P(sc));
  }
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.16, 20, 14), mat('#ffd166')); knob.name = 'roof_finial'; knob.position.set(0, h + RY + OV + 0.12, 0); cafe.add(P(knob));

  const sign = box('sign', 2.2, 0.42, 0.1, new THREE.MeshBasicMaterial(), 0, h + 0.5, d / 2 + 0.14, cafe);

  // striped curved awning over door + windows, with scalloped valance
  const AW = w + 0.3, AD = 0.85, ag = new THREE.PlaneGeometry(AW, 1, 32, 8), ap = ag.attributes.position;
  for (let i = 0; i < ap.count; i++) { const v = 0.5 - ap.getY(i); ap.setXYZ(i, ap.getX(i), 0.1 * Math.sin(v * Math.PI) - 0.36 * v, v * AD); }
  ag.computeVertexNormals();
  const awning = meshOf('awning', ag, new THREE.MeshBasicMaterial(), cafe); awning.position.set(0, 2.62, d / 2 + 0.1);
  for (let k = 0; k < 14; k++) {
    const sc = new THREE.Mesh(new THREE.CircleGeometry(AW / 28, 16, Math.PI, Math.PI), mat(k % 2 ? '#f06470' : '#fff0e0'));
    sc.material.side = THREE.DoubleSide; sc.name = `awning_scallop_${k}`;
    sc.position.set(-AW / 2 + AW / 28 + k * (AW / 14), 2.62 - 0.36 + 0.005, d / 2 + 0.1 + AD + 0.005); sc.rotation.x = -0.25; cafe.add(P(sc));
  }

  // ---------- interior ----------
  const CZ = -d / 2 + 1.0, TOP = 1.065;
  // chunky counter: cream body, pink slats, wood top
  P(box('counter', 3.0, 0.98, 0.6, '#fff1e2', 0, 0.49, CZ, cafe));
  for (let k = 0; k < 11; k++) P(box(`counter_slat_${k}`, 0.2, 0.78, 0.05, pink, -1.25 + k * 0.25, 0.5, CZ + 0.31, cafe));
  P(box('counter_kick', 3.0, 0.1, 0.06, wood, 0, 0.06, CZ + 0.32, cafe));
  P(box('counter_top', 3.2, 0.08, 0.76, wood, 0, 1.025, CZ, cafe));

  // espresso machine (procedural, retro mint)
  const ex = -0.95, ez = CZ - 0.05;
  P(box('espresso_body', 0.64, 0.42, 0.42, '#8fd8c8', ex, TOP + 0.24, ez, cafe));
  P(box('espresso_top', 0.68, 0.07, 0.46, '#e9eef2', ex, TOP + 0.48, ez, cafe));
  P(box('espresso_tray', 0.62, 0.05, 0.2, '#cfd8de', ex, TOP + 0.04, ez + 0.28, cafe));
  P(box('espresso_base', 0.66, 0.06, 0.46, '#e9eef2', ex, TOP + 0.03, ez, cafe));
  const gauge = cyl('espresso_gauge', 0.07, 0.07, 0.03, '#fff8ef', ex, TOP + 0.36, ez + 0.22, cafe, 24); gauge.rotation.x = Math.PI / 2; P(gauge);
  [-0.15, 0.15].forEach((o, i) => {
    P(cyl(`espresso_head_${i}`, 0.06, 0.05, 0.07, '#e9eef2', ex + o, TOP + 0.2, ez + 0.23, cafe, 20));
    P(box(`espresso_handle_${i}`, 0.04, 0.035, 0.18, '#3a2b25', ex + o, TOP + 0.17, ez + 0.34, cafe));
  });
  [-0.24, -0.08, 0.08, 0.24].forEach((o, i) => P(cyl(`espresso_warmcup_${i}`, 0.04, 0.03, 0.06, i % 2 ? '#ffd6e2' : '#ffffff', ex + o, TOP + 0.545, ez - 0.05, cafe, 16)));
  glb(cafe, 'cup-coffee', 'espresso_cup_0', { x: ex - 0.15, y: TOP + 0.065, z: ez + 0.26, h: 0.08 });
  glb(cafe, 'kitchenBlender', 'blender', { x: ex - 0.5, y: TOP, z: ez - 0.05, h: 0.34 });

  // cake stand + register
  P(cyl('cake_stand_foot', 0.05, 0.08, 0.14, '#fff8ef', -0.3, TOP + 0.07, CZ, cafe, 20));
  P(cyl('cake_stand_plate', 0.2, 0.18, 0.025, '#fff8ef', -0.3, TOP + 0.15, CZ, cafe, 28));
  glb(cafe, 'cake', 'cake', { x: -0.3, y: TOP + 0.163, z: CZ, w: 0.3 });
  P(box('register', 0.3, 0.16, 0.24, '#ffd166', 0.15, TOP + 0.08, CZ - 0.05, cafe));
  P(box('register_screen', 0.22, 0.12, 0.03, '#3a2b25', 0.15, TOP + 0.2, CZ - 0.13, cafe));

  // pastry case with pastries on two levels
  const px = 0.86;
  P(box('pastry_case_base', 1.0, 0.07, 0.5, wood, px, TOP + 0.035, CZ, cafe));
  P(box('pastry_case_top', 1.04, 0.05, 0.54, pink, px, TOP + 0.52, CZ, cafe));
  const glass = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.44, 0.48), new THREE.MeshStandardMaterial({ color: '#e8fbff', transparent: true, opacity: 0.18, roughness: 0.05, depthWrite: false }));
  glass.name = 'pastry_case_glass'; glass.position.set(px, TOP + 0.29, CZ); cafe.add(P(glass));
  P(box('pastry_case_shelf', 0.94, 0.025, 0.44, '#fff8ef', px, TOP + 0.29, CZ, cafe));
  const pastries = ['croissant', 'donut-sprinkles', 'cupcake', 'muffin'];
  pastries.forEach((f, i) => {
    glb(cafe, f, `pastry_${f.replace('-', '_')}_0`, { x: px - 0.33 + i * 0.22, y: TOP + 0.07, z: CZ + 0.05, w: 0.17 });
    glb(cafe, pastries[(i + 2) % 4], `pastry_${pastries[(i + 2) % 4].replace('-', '_')}_1_${i}`, { x: px - 0.33 + i * 0.22, y: TOP + 0.305, z: CZ, w: 0.15 });
  });
  glb(cafe, 'cookie-chocolate', 'pastry_cookie', { x: px + 0.6, y: TOP + 0.01, z: CZ + 0.15, w: 0.12 });

  // chalkboard menu with wood frame + shelves of mugs
  const board = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.0), new THREE.MeshBasicMaterial({ map: makeMenuTexture(), toneMapped: false }));
  board.name = 'menu_board'; board.position.set(0, 1.95, -d / 2 + 0.12); cafe.add(board);
  P(box('menu_frame', 2.36, 1.16, 0.04, wood, 0, 1.95, -d / 2 + 0.1, cafe));
  [-1, 1].forEach((sg, i) => [1.45, 1.95].forEach((y, j) => {
    P(box(`shelf_${i}_${j}`, 0.7, 0.05, 0.22, wood, sg * 1.7, y, -d / 2 + 0.2, cafe));
    for (let k = 0; k < 3; k++) glb(cafe, 'mug', `shelf_mug_${i}_${j}_${k}`, { x: sg * 1.7 - 0.22 + k * 0.22, y: y + 0.025, z: -d / 2 + 0.2, h: 0.13, ry: Math.PI });
  }));
  glb(cafe, 'plantSmall2', 'shelf_plant_0', { x: -1.7, y: 2.0, z: -d / 2 + 0.2, h: 0.3 });

  // pendant lamps (amber) hanging from the vault
  const lampGlow = new THREE.MeshBasicMaterial({ color: '#ffd38a', toneMapped: false });
  [-0.95, 0, 0.95].forEach((x, i) => {
    const ceil = h + RY * Math.sqrt(1 - (x / RX) ** 2), y = 2.3;
    P(cyl(`pendant_cord_${i}`, 0.008, 0.008, ceil - y, '#3a2b25', x, y + (ceil - y) / 2, CZ + 0.1, cafe, 6));
    const shade = new THREE.Mesh(new THREE.SphereGeometry(0.2, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#ffad4d', side: THREE.DoubleSide, toneMapped: false }));
    shade.name = `pendant_shade_${i}`; shade.position.set(x, y - 0.12, CZ + 0.1); cafe.add(P(shade));
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.075, 16, 12), lampGlow); bulb.name = `pendant_bulb_${i}`; bulb.position.set(x, y - 0.15, CZ + 0.1); cafe.add(P(bulb));
  });
  const lamp = new THREE.PointLight('#ffb36b', 7, 6, 1.6); lamp.position.set(0, 2.0, CZ + 0.4); cafe.add(lamp);
  const lamp2 = new THREE.PointLight('#ffb36b', 4, 5, 1.6); lamp2.position.set(0, 1.9, 0.9); cafe.add(lamp2);

  // pink bar stools at the counter (Kenney stoolBar, recoloured)
  const stoolCol = { carpet: '#ff8fab', wood: '#8a5a3c' };
  [-1.15, -0.75, 0.75, 1.15].forEach((x, i) => glb(cafe, 'stoolBar', `stool_${i}`, { x, z: CZ + 0.62, h: 0.8, colors: stoolCol }));
  // café tables + chairs by the side windows
  [-1, 1].forEach((sg, i) => {
    const tx = sg * 1.55, tz = 0.55;
    glb(cafe, 'tableRound', `cafe_table_${i}`, { x: tx, z: tz, h: 0.78, colors: { wood: '#fff1e2' } });
    glb(cafe, 'chairRounded', `cafe_chair_${i}_0`, { x: tx, z: tz + 0.62, h: 0.92, ry: Math.PI, colors: { wood: i ? '#9ed9cc' : '#ffd166' } });
    glb(cafe, 'chairRounded', `cafe_chair_${i}_1`, { x: tx, z: tz - 0.62, h: 0.92, colors: { wood: i ? '#9ed9cc' : '#ffd166' } });
    glb(cafe, i ? 'cup-saucer' : 'mug', `cafe_table_cup_${i}`, { x: tx + 0.1, y: 0.79, z: tz, h: 0.1 });
    glb(cafe, 'plantSmall1', `sill_plant_${i}`, { x: sg * (w / 2 - 0.05), y: WIN.y0 + 0.02, z: 0.15, h: 0.28 });
    glb(cafe, 'pottedPlant', `cafe_plant_${i}`, { x: sg * 1.9, z: d / 2 - 0.35, h: 1.1, colors: { wood: '#e8896a', woodDark: '#7a4f33', plant: '#4cb85a' } });
  });
  glb(cafe, 'rugRound', 'cafe_rug', { x: 0, y: 0.07, z: 0.75, w: 1.5, colors: { carpet: '#ffc2d1', carpetDarker: '#ff8fab' } });

  // colliders (world space): walls + counter + tables
  const cx = CAFE.x, cz = CAFE.z;
  addCol(cx, cz - d / 2, w, t + 0.3);
  addCol(cx - w / 2, cz, t + 0.3, d);
  addCol(cx + w / 2, cz, t + 0.3, d);
  addCol(cx - (door / 2 + side / 2), cz + d / 2, side, t + 0.3);
  addCol(cx + (door / 2 + side / 2), cz + d / 2, side, t + 0.3);
  addCol(cx, cz - d / 2 + 1.0, 3.2, 0.9);
  addCol(cx - 1.55, cz + 0.55, 0.8, 0.8); addCol(cx + 1.55, cz + 0.55, 0.8, 0.8);

  // ---------- outdoor seating: umbrella tables ----------
  [[-2.7, 1.9], [2.7, 1.9]].forEach(([x, z], i) => {
    glb(world, 'tableRound', `table_${i}`, { x, y: FLOOR_Y, z, h: 0.76, colors: { wood: '#fff3e6' } });
    [0, 1].forEach((k) => glb(world, 'chairRounded', `table_chair_${i}_${k}`, { x: x + (k ? 0.65 : -0.65), y: FLOOR_Y, z, h: 0.92, ry: k ? -Math.PI / 2 : Math.PI / 2, colors: { wood: i ? '#ff9ec0' : '#8fd8c8' } }));
    P(cyl(`umb_pole_${i}`, 0.025, 0.025, 1.6, '#ffffff', x, FLOOR_Y + 1.15, z, world, 12));
    const um = new THREE.Mesh(stripedCone(0.95, 0.42, i ? '#ffd166' : '#ff7a8a', '#fff3e6'), new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
    um.name = `umbrella_${i}`; um.position.set(x, FLOOR_Y + 2.0, z); um.castShadow = true; world.add(P(um));
    const fin = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 8), mat('#ffffff')); fin.name = `umbrella_finial_${i}`; fin.position.set(x, FLOOR_Y + 2.24, z); world.add(P(fin));
    glb(world, i ? 'cup-saucer' : 'cup-coffee', `table_cup_${i}`, { x: x + 0.12, y: FLOOR_Y + 0.77, z: z + 0.05, h: 0.1 });
    addCol(x, z, 0.9, 0.9);
  });
  // A-frame chalkboard + potted plants by the door
  const aTex = textTexture(256, 340, (g) => {
    g.fillStyle = '#2b2622'; g.fillRect(0, 0, 256, 340); g.strokeStyle = '#d9a477'; g.lineWidth = 14; g.strokeRect(7, 7, 242, 326);
    g.textAlign = 'center'; g.fillStyle = '#ffd166'; g.font = 'bold 38px system-ui'; g.fillText('TODAY', 128, 70);
    g.fillStyle = '#ff9ec0'; g.font = 'bold 30px system-ui'; g.fillText('Sunset', 128, 140); g.fillText('Mocha', 128, 178);
    g.fillStyle = '#fff3e6'; g.font = '26px system-ui'; g.fillText('+ fresh', 128, 240); g.fillText('croissants ✿', 128, 274);
  });
  const ab = new THREE.Group(); ab.name = 'chalkboard_aframe'; ab.position.set(1.2, FLOOR_Y, 1.5); ab.rotation.y = -0.35; world.add(ab);
  [1, -1].forEach((sg, i) => {
    const pnl = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.03), [mat(wood), mat(wood), mat(wood), mat(wood), new THREE.MeshBasicMaterial({ map: aTex }), mat(wood)]);
    pnl.name = `chalkboard_aframe_${i}`; pnl.position.set(0, 0.34, sg * 0.12); pnl.rotation.x = sg * 0.18; if (i) pnl.rotation.y = Math.PI; ab.add(P(pnl));
  });
  addCol(1.2, 1.5, 0.5, 0.4);
  [-1, 1].forEach((sg, i) => glb(world, 'pottedPlant', `door_plant_${i}`, { x: sg * 1.0, y: FLOOR_Y, z: CAFE.z + d / 2 + 0.45, h: 0.95, colors: { wood: '#e8896a', woodDark: '#7a4f33', plant: '#3fb04f' } }));

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
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 12), new THREE.MeshBasicMaterial());
      bulb.name = `lights_${off + k}`; bulb.position.copy(p); bulbs.add(bulb);
    }
  };
  strand(new THREE.Vector3(-3.4, 3.9, 3.7), new THREE.Vector3(-2.2, FLOOR_Y + 2.6, 0.7), 0.4, 0);
  strand(new THREE.Vector3(3.7, 3.9, 3.4), new THREE.Vector3(2.2, FLOOR_Y + 2.6, 0.7), 0.4, 20);

  // ---------- roped dock ----------
  const dock = new THREE.Group(); dock.name = 'dock'; dock.position.set(0, 0, 5.0); world.add(dock);
  const DY = 0.32;
  for (let k = 0; k < 9; k++) box(`plank_${k}`, 1.5, 0.08, 0.36, k % 2 ? '#c08a5c' : '#b07a4e', 0, DY, k * 0.4, dock);
  const postTops = [];
  [0, 1.6, 3.2].forEach((zz, i) => [-0.7, 0.7].forEach((xx, j) => {
    cyl(`post_${i}_${j}`, 0.075, 0.085, 1.5, '#7a4f33', xx, DY - 0.2, zz, dock, 12);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.085, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat('#8a5a3c'));
    cap.name = `dock_post_cap_${i}_${j}`; cap.position.set(xx, DY + 0.55, zz); dock.add(P(cap));
    postTops.push(new THREE.Vector3(xx, DY + 0.5, zz));
  }));
  const ropeMat = mat('#efd9ad');
  [0, 1].forEach((j) => [0, 1].forEach((i) => {
    const a = postTops[i * 2 + j], b = postTops[(i + 1) * 2 + j];
    const mid = a.clone().lerp(b, 0.5); mid.y -= 0.18;
    const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([a, a.clone().lerp(mid, 0.5).setY(a.y - 0.12), mid, b.clone().lerp(mid, 0.5).setY(a.y - 0.12), b]), 24, 0.022, 8), ropeMat);
    tube.name = `dock_rope_${j}_${i}`; dock.add(P(tube));
  }));
  const buoy = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.065, 12, 24), mat('#ff6f61')); buoy.name = 'dock_buoy'; buoy.position.set(0.79, DY + 0.25, 1.6); buoy.rotation.y = Math.PI / 2; dock.add(P(buoy));
  [0, 1, 2, 3].forEach((k) => { const st = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.068, 8, 4, Math.PI / 6), mat('#ffffff')); st.name = `dock_buoy_stripe_${k}`; st.position.copy(buoy.position); st.rotation.set(0, Math.PI / 2, k * Math.PI / 2); dock.add(P(st)); });
  const lan = new THREE.Mesh(new THREE.SphereGeometry(0.09, 14, 10), new THREE.MeshBasicMaterial({ color: '#ffd38a', toneMapped: false })); lan.name = 'dock_lantern'; lan.position.set(0.7, DY + 0.72, 3.2); dock.add(P(lan));

  scene.add(world);
  const ready = Promise.all(loads).then(() => propNames);
  return {
    world, colliders, islandRadius: R, propNames, ready,
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
