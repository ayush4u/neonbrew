import * as THREE from 'three';
import { groundHeight, FLOOR_Y } from './island.js';

/** First-person walk: WASD/arrows + drag-to-look on desktop, joystick + drag on phones. */
export function createWalkControls(camera, island, { eye = 1.45, speed = 2.6 } = {}) {
  const keys = new Set();
  const pos = island.spawn.clone();
  let yaw = Math.PI, pitch = -0.05;            // facing the café
  const vel = new THREE.Vector3();
  const joy = { x: 0, y: 0 };
  const touch = matchMedia('(pointer: coarse)').matches;
  let look = null;

  addEventListener('keydown', (e) => keys.add(e.code));
  addEventListener('keyup', (e) => keys.delete(e.code));
  const canvas = camera.userData.canvas || document.body;
  canvas.addEventListener('pointerdown', (e) => { look = { id: e.pointerId, x: e.clientX, y: e.clientY }; });
  addEventListener('pointermove', (e) => {
    if (!look || look.id !== e.pointerId) return;
    yaw -= (e.clientX - look.x) * 0.005; pitch -= (e.clientY - look.y) * 0.004;
    pitch = Math.max(-0.9, Math.min(0.6, pitch)); look.x = e.clientX; look.y = e.clientY;
  });
  addEventListener('pointerup', (e) => { if (look?.id === e.pointerId) look = null; });

  if (touch) {
    const el = document.createElement('div'); el.className = 'nb-joy';
    el.innerHTML = '<div class="nb-knob"></div>'; document.body.appendChild(el);
    const knob = el.firstChild; let jid = null, ox = 0, oy = 0;
    el.addEventListener('pointerdown', (e) => { e.stopPropagation(); jid = e.pointerId; const r = el.getBoundingClientRect(); ox = r.left + r.width / 2; oy = r.top + r.height / 2; el.setPointerCapture(jid); });
    el.addEventListener('pointermove', (e) => {
      if (e.pointerId !== jid) return;
      let dx = (e.clientX - ox) / 45, dy = (e.clientY - oy) / 45; const m = Math.hypot(dx, dy);
      if (m > 1) { dx /= m; dy /= m; } joy.x = dx; joy.y = dy; knob.style.transform = `translate(${dx * 32}px,${dy * 32}px)`;
    });
    const end = () => { jid = null; joy.x = joy.y = 0; knob.style.transform = ''; };
    el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
  }

  const RAD = 0.28;
  function collide(p) {
    for (const c of island.colliders) {
      const nx = Math.max(c.minX, Math.min(p.x, c.maxX)), nz = Math.max(c.minZ, Math.min(p.z, c.maxZ));
      const dx = p.x - nx, dz = p.z - nz, d2 = dx * dx + dz * dz;
      if (d2 < RAD * RAD) {
        if (d2 > 1e-6) { const d = Math.sqrt(d2); p.x = nx + (dx / d) * RAD; p.z = nz + (dz / d) * RAD; }
        else { // inside box: push out along shortest axis
          const opts = [[c.minX - RAD - p.x, 0], [c.maxX + RAD - p.x, 0], [0, c.minZ - RAD - p.z], [0, c.maxZ + RAD - p.z]];
          opts.sort((a, b) => Math.abs(a[0] + a[1]) - Math.abs(b[0] + b[1])); p.x += opts[0][0]; p.z += opts[0][1];
        }
      }
    }
  }
  const dock = island.dock;
  const onDock = (p) => p.x > dock.minX - 0.1 && p.x < dock.maxX + 0.1 && p.z > dock.minZ && p.z < dock.maxZ;
  function floorAt(p) {
    if (onDock(p)) return Math.max(dock.y + 0.04, groundHeight(Math.hypot(p.x, p.z)));
    const r = Math.hypot(p.x, p.z);
    return r < 4.0 ? FLOOR_Y : groundHeight(r);
  }

  const fwdV = new THREE.Vector3(), rightV = new THREE.Vector3();
  let bob = 0;
  function update(dt) {
    const f = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) - joy.y;
    const s = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0) + joy.x;
    if (keys.has('KeyQ')) yaw += dt * 1.8; if (keys.has('KeyE')) yaw -= dt * 1.8;
    fwdV.set(Math.sin(yaw), 0, Math.cos(yaw)); rightV.set(-Math.cos(yaw), 0, Math.sin(yaw));
    const want = fwdV.multiplyScalar(f).add(rightV.multiplyScalar(-s)); if (want.lengthSq() > 1) want.normalize();
    vel.lerp(want.multiplyScalar(speed), 1 - Math.exp(-10 * dt));
    const next = pos.clone().addScaledVector(vel, dt);
    collide(next);
    const r = Math.hypot(next.x, next.z);
    if (r > island.islandRadius - 0.5 && !onDock(next)) { const k = (island.islandRadius - 0.5) / r; next.x *= k; next.z *= k; }
    pos.x = next.x; pos.z = next.z;
    const moving = vel.length() > 0.2; bob += dt * (moving ? 9 : 0);
    const gy = floorAt(pos) + eye + (moving ? Math.sin(bob) * 0.025 : 0);
    pos.y += (gy - pos.y) * (1 - Math.exp(-14 * dt));
    camera.position.copy(pos);
    camera.rotation.set(pitch, yaw + Math.PI, 0, 'YXZ');
  }
  return {
    update, position: pos,
    place(x, z, yawV, pitchV = -0.05) { pos.set(x, 0, z); pos.y = floorAt(pos) + eye; yaw = yawV; pitch = pitchV; },
  };
}
