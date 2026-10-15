import * as THREE from 'three';
import { createToonMaterial, PALETTE } from './index.js';

/**
 * Preview-only interior blockout: a small café room behind an arched opening,
 * placed out on the water toward the sun so a shot looking in through the arch
 * frames warm interior against the sunset sky. Mesh names follow the look
 * contract in README.md (wall_*, floor, ceiling, counter_*, stool_*, lamp_*,
 * glass_*, neon_wall*), so applyLook() styles it — nothing here sets look materials.
 */
export function addInteriorBlockout(scene) {
  const sunH = new THREE.Vector3(0.55, 0, 0.45).normalize();
  const g = new THREE.Group(); g.name = 'interior_preview';
  g.position.copy(sunH.clone().multiplyScalar(24)).setY(0.45);
  g.rotation.y = Math.atan2(-sunH.x, -sunH.z); // local +z (the arch) faces away from the sun
  const B = () => new THREE.MeshBasicMaterial();
  const add = (geo, name, x, y, z, mat = B()) => { const m = new THREE.Mesh(geo, mat); m.name = name; m.position.set(x, y, z); g.add(m); return m; };
  const W = 5, H = 3, D = 4, T = 0.2;

  // shell (all thick boxes so exterior faces exist too)
  add(new THREE.BoxGeometry(W, 0.12, D), 'floor', 0, -0.06, 0);
  add(new THREE.BoxGeometry(W + 2 * T, T, D + T), 'ceiling', 0, H + T / 2, -T / 2);
  add(new THREE.BoxGeometry(W + 2 * T, H, T), 'wall_back', 0, H / 2, -D / 2 - T / 2);
  add(new THREE.BoxGeometry(T, H, D + T), 'wall_left', -W / 2 - T / 2, H / 2, -T / 2);
  add(new THREE.BoxGeometry(T, H, D + T), 'wall_right', W / 2 + T / 2, H / 2, -T / 2);

  // front wall with arched opening
  const archW = 2.3, archSpring = 1.55, archR = archW / 2;
  const archPath = (p) => { p.moveTo(-archR, 0); p.lineTo(archR, 0); p.lineTo(archR, archSpring); p.absarc(0, archSpring, archR, 0, Math.PI, false); p.lineTo(-archR, 0); return p; };
  const front = new THREE.Shape(); front.moveTo(-W / 2 - T, 0); front.lineTo(W / 2 + T, 0); front.lineTo(W / 2 + T, H + T); front.lineTo(-W / 2 - T, H + T); front.lineTo(-W / 2 - T, 0);
  const archHoleX = -0.55;
  const hole = new THREE.Path(); archPath(hole); front.holes.push(translatePath(hole, archHoleX));
  const winHole = new THREE.Path(); winHole.absarc(1.65, 1.75, 0.45, 0, Math.PI * 2, true); front.holes.push(winHole);
  const fGeo = new THREE.ExtrudeGeometry(front, { depth: T, bevelEnabled: false, curveSegments: 24 });
  add(fGeo, 'wall_front', 0, 0, D / 2);
  // exterior trim around the arch (outside material, not part of the interior contract)
  // (trim built as a thin extruded outline)
  const trimShape = translateShape(outline(archR + 0.16, archSpring, 0.16), archHoleX);
  add(new THREE.ExtrudeGeometry(trimShape, { depth: 0.08, bevelEnabled: false, curveSegments: 24 }), 'arch_trim', 0, 0, D / 2 + T, createToonMaterial(PALETTE.woodDark));
  // glass in the arch and in the round side window
  const archGlass = new THREE.ShapeGeometry(translateShape(archPath(new THREE.Shape()), archHoleX), 24);
  add(archGlass, 'glass_arch', 0, 0, D / 2 + T * 0.5);
  add(new THREE.CircleGeometry(0.45, 32), 'glass_round', 1.65, 1.75, D / 2 + T * 0.5);
  // roof + deck (exterior look)
  const roofGeo = new THREE.CylinderGeometry(1, 1, D + 0.9, 32, 1, false, Math.PI / 2, Math.PI); roofGeo.rotateX(Math.PI / 2);
  add(roofGeo, 'roof', 0, H + T - 0.06, 0.05, createToonMaterial('#f0a090')).scale.set((W + 0.9) / 2, 0.75, 1);
  addIsland(g, archHoleX, D);

  // counter along the back-left, pastel panels + light wood top
  add(new THREE.BoxGeometry(2.9, 0.95, 0.6), 'counter_panel', -0.9, 0.475, -1.0);
  add(new THREE.BoxGeometry(3.05, 0.08, 0.72), 'counter_top', -0.9, 0.99, -0.98);
  add(new THREE.BoxGeometry(2.9, 0.1, 0.62), 'counter_base', -0.9, 0.05, -0.99);
  // pastel vertical slats on the counter front
  for (let i = 0; i < 9; i++) add(new THREE.BoxGeometry(0.04, 0.8, 0.03), `counter_slat_${i}`, -2.2 + i * 0.33, 0.5, -0.69);
  // stools
  [-1.9, -1.0, -0.1].forEach((x, i) => {
    add(new THREE.CylinderGeometry(0.22, 0.22, 0.1, 20), `stool_seat_${i}`, x, 0.68, -0.25);
    [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([a, b], k) => {
      const l = add(new THREE.CylinderGeometry(0.03, 0.035, 0.64, 6), `stool_leg_${i}_${k}`, x + a * 0.12, 0.32, -0.25 + b * 0.12);
      l.rotation.set(b * 0.08, 0, -a * 0.08);
    });
  });
  // back-wall shelves + cups
  [1.6, 2.05].forEach((y, i) => add(new THREE.BoxGeometry(1.5, 0.06, 0.3), `shelf_${i}`, 1.4, y, -D / 2 + 0.15));
  for (let i = 0; i < 5; i++) add(new THREE.CylinderGeometry(0.07, 0.06, 0.13, 10), `cup_${i}`, 0.85 + i * 0.27, 1.7, -D / 2 + 0.15, createToonMaterial('#fff4ea'));
  // little table + chairs on the right
  add(new THREE.CylinderGeometry(0.45, 0.45, 0.06, 24), 'table_top', 1.55, 0.75, 0.2);
  add(new THREE.CylinderGeometry(0.05, 0.12, 0.72, 10), 'table_leg', 1.55, 0.36, 0.2);
  [[-0.7, 0.2], [0.75, 0.25]].forEach(([dx, dz], i) => {
    add(new THREE.BoxGeometry(0.42, 0.08, 0.42), `chair_seat_${i}`, 1.55 + dx, 0.47, 0.2 + dz);
    add(new THREE.BoxGeometry(0.06, 0.5, 0.42), `chair_back_${i}`, 1.55 + dx + Math.sign(dx) * 0.2, 0.75, 0.2 + dz);
    add(new THREE.BoxGeometry(0.36, 0.45, 0.36), `stool_chairbase_${i}`, 1.55 + dx, 0.22, 0.2 + dz);
  });

  // pendant lamps
  [-1.75, -0.85, 0.05].forEach((x, i) => {
    const z = -0.75, y = 2.2;
    add(new THREE.CylinderGeometry(0.012, 0.012, H - y - 0.2, 4), `lamp_cord_${i}`, x, y + 0.2 + (H - y - 0.2) / 2, z);
    const shade = add(new THREE.SphereGeometry(0.27, 24, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), `lamp_shade_${i}`, x, y, z);
    shade.scale.set(1, 0.85, 1);
    add(new THREE.CylinderGeometry(0.05, 0.08, 0.1, 10), `lamp_cap_${i}`, x, y + 0.25, z);
    add(new THREE.SphereGeometry(0.075, 12, 8), `lamp_bulb_${i}`, x, y - 0.02, z);
  });

  // back-wall neon: rounded-rect frame + cup (on a cream board)
  add(new THREE.BoxGeometry(1.5, 0.85, 0.05), 'shelf_signboard', -0.9, 2.05, -D / 2 + 0.03);
  const rr = new THREE.CurvePath(); const w = 0.62, h = 0.32, r = 0.1;
  const P = (x, y) => new THREE.Vector3(x, y, 0);
  rr.add(new THREE.LineCurve3(P(-w + r, -h), P(w - r, -h))); rr.add(new THREE.QuadraticBezierCurve3(P(w - r, -h), P(w, -h), P(w, -h + r)));
  rr.add(new THREE.LineCurve3(P(w, -h + r), P(w, h - r))); rr.add(new THREE.QuadraticBezierCurve3(P(w, h - r), P(w, h), P(w - r, h)));
  rr.add(new THREE.LineCurve3(P(w - r, h), P(-w + r, h))); rr.add(new THREE.QuadraticBezierCurve3(P(-w + r, h), P(-w, h), P(-w, h - r)));
  rr.add(new THREE.LineCurve3(P(-w, h - r), P(-w, -h + r))); rr.add(new THREE.QuadraticBezierCurve3(P(-w, -h + r), P(-w, -h), P(-w + r, -h)));
  add(new THREE.TubeGeometry(rr, 96, 0.022, 6, true), 'neon_wall_frame', -0.9, 2.05, -D / 2 + 0.09);
  const cup = new THREE.CatmullRomCurve3([P(-0.16, 0.12), P(-0.13, -0.1), P(0, -0.15), P(0.13, -0.1), P(0.16, 0.12)]);
  add(new THREE.TubeGeometry(cup, 32, 0.022, 6, false), 'neon_wall_cup', -0.9, 2.02, -D / 2 + 0.09);
  add(new THREE.TorusGeometry(0.07, 0.02, 6, 20, Math.PI * 1.2), 'neon_wall_handle', -0.71, 2.05, -D / 2 + 0.09).rotation.z = -Math.PI * 0.6;
  for (let i = 0; i < 2; i++) add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([P(0, 0), P(0.04, 0.06), P(-0.02, 0.12), P(0.02, 0.18)]), 12, 0.016, 5, false), `neon_wall_steam_${i}`, -0.95 + i * 0.1, 2.16, -D / 2 + 0.09);

  scene.add(g);
  g.updateMatrixWorld(true);
  // shot cameras (world space)
  const toWorld = (x, y, z) => g.localToWorld(new THREE.Vector3(x, y, z));
  return {
    group: g,
    shot(aspect) {
      const portrait = aspect < 1;
      return portrait
        ? { position: toWorld(-0.3, 2.8, 11.5), target: toWorld(-0.45, 1.2, 0.0) }
        : { position: toWorld(0.4, 2.5, 8.2), target: toWorld(-0.2, 1.1, -0.5) };
    },
  };
}

function translatePath(p, dx) { const out = new THREE.Path(p.getPoints(24).map((v) => new THREE.Vector2(v.x + dx, v.y))); return out; }
function translateShape(s, dx) { const out = new THREE.Shape(s.getPoints(24).map((v) => new THREE.Vector2(v.x + dx, v.y)));
  out.holes = s.holes.map((h) => translatePath(h, dx)); return out; }
function outline(R, spring, t) { // arch-shaped band of thickness t
  const s = new THREE.Shape(); s.moveTo(-R, 0); s.lineTo(-R + t, 0); s.lineTo(-R + t, spring);
  s.absarc(0, spring, R - t, Math.PI, 0, true); s.lineTo(R - t, 0); s.lineTo(R, 0); s.lineTo(R, spring);
  s.absarc(0, spring, R, 0, Math.PI, false); s.lineTo(-R, 0); return s;
}

// Round, slightly domed island (named `ground`, styled by applyLook) + entrance props.
// Island centre sits a little in front of the café so the front yard has room; shore radius 6.
function addIsland(g, doorX, D) {
  const R = 6, cz = 1.0;
  const geo = new THREE.RingGeometry(0.02, R, 72, 18); geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i); const a = Math.atan2(v.z, v.x), r = Math.hypot(v.x, v.z) / R;
    const wob = 1 + 0.035 * Math.sin(a * 3 + 0.7) + 0.025 * Math.sin(a * 7 + 2.1) + 0.012 * Math.sin(a * 13);
    const y = -0.03 - 0.62 * Math.pow(r, 2.4); // gentle dome, edge dips under the water line (local -0.45)
    p.setXYZ(i, v.x * wob, y, v.z * wob);
  }
  geo.computeVertexNormals();
  const isl = new THREE.Mesh(geo, new THREE.MeshBasicMaterial()); isl.name = 'ground'; isl.position.set(0, 0, cz); g.add(isl);
  const yAt = (x, z) => -0.03 - 0.62 * Math.pow(Math.min(1, Math.hypot(x, z - cz) / R), 2.4);
  const B = () => new THREE.MeshBasicMaterial();
  const put = (geo, name, x, z, y = 0, mat = B()) => { const m = new THREE.Mesh(geo, mat); m.name = name; m.position.set(x, yAt(x, z) + y, z); g.add(m); return m; };
  // stepping-stone path from the arch out toward the beach
  const stone = new THREE.IcosahedronGeometry(1, 1);
  [[0.0, 2.75], [0.2, 3.45], [-0.05, 4.15], [0.3, 4.85], [0.05, 5.55]].forEach(([x, z], i) => {
    const s = put(stone, `path_stone_${i}`, doorX + x, z, -0.01);
    s.scale.set(0.34 + 0.04 * (i % 2), 0.06, 0.28); s.rotation.y = i * 0.9;
  });
  // rounded rocks
  const rock = new THREE.IcosahedronGeometry(1, 1);
  [[2.9, 3.3, 0.32], [3.3, 3.0, 0.2], [-3.1, 4.4, 0.28], [-2.75, 4.75, 0.16], [3.6, 5.2, 0.24], [-4.6, 4.2, 0.45], [-5.2, 3.0, 0.35], [4.8, 4.0, 0.42], [5.4, 2.4, 0.3], [-3.6, 6.0, 0.3], [4.0, 6.0, 0.26], [-5.8, 0.8, 0.4], [5.9, 0.2, 0.36]].forEach(([x, z, r], i) => {
    const m = put(rock, `rock_${i}`, x, z, r * 0.25); m.scale.set(r, r * 0.7, r * 0.9); m.rotation.set(0.3 * i, i, 0);
  });
  // shells on the sand
  const shellMat = createToonMaterial('#ffe0d8');
  [[1.6, 5.6], [-1.9, 6.0], [2.4, 6.1], [-0.9, 6.3]].forEach(([x, z], i) => {
    const m = put(new THREE.SphereGeometry(0.09, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), `shell_${i}`, x, z, -0.01, shellMat);
    m.scale.set(1, 0.55, 1.25); m.rotation.y = i * 1.3;
  });
  // potted plants flanking the door
  const potMat = createToonMaterial(PALETTE.pot);
  [[doorX - 1.55, 2.6, 1.0], [doorX + 1.45, 2.55, 0.85], [2.1, 2.7, 0.7]].forEach(([x, z, k], i) => {
    put(new THREE.CylinderGeometry(0.2 * k, 0.15 * k, 0.32 * k, 12), `pot_${i}`, x, z, 0.16 * k, potMat);
    const top = 0.32 * k;
    [[0, 0.22, 0, 0.22], [0.1, 0.14, 0.06, 0.16], [-0.1, 0.13, -0.04, 0.15], [0.02, 0.36, -0.03, 0.14]].forEach(([dx, dy, dz, r], j) => {
      const b = new THREE.SphereGeometry(r * k, 10, 8); b.translate(dx * k, dy * k, dz * k);
      put(b, `plant_pot_${i}_${j}`, x, z, top);
    });
  });
  // grass tufts (little cone fans) around the building
  const blade = new THREE.ConeGeometry(0.04, 0.26, 4); blade.translate(0, 0.13, 0);
  [[-2.9, 2.5], [-3.2, 1.0], [2.95, 2.3], [3.3, 0.5], [-1.9, 3.3], [1.3, 3.4], [2.3, 4.0], [-2.4, 3.8], [0.9, 2.6], [-3.4, -0.8], [3.2, -1.4]].forEach(([x, z], i) => {
    for (let k = 0; k < 3; k++) {
      const m = put(blade, `plant_tuft_${i}_${k}`, x + (k - 1) * 0.06, z + (k % 2) * 0.04, -0.02);
      m.rotation.set(0, i, (k - 1) * 0.35);
    }
  });
}
