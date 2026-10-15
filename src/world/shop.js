import * as THREE from 'three';

const MENU = [
  { id: 'latte', name: 'Neon Latte', price: 180, color: '#e9c6a0' },
  { id: 'cold', name: 'Island Cold Brew', price: 160, color: '#5a3424' },
  { id: 'matcha', name: 'Pink Foam Matcha', price: 200, color: '#9fd39a' },
  { id: 'mocha', name: 'Sunset Mocha', price: 190, color: '#7a4a32' },
];

/** Counter prompt + order sheet + cup-in-hand. Call update(playerPos) each frame. */
export function createShop(camera, island) {
  const ui = document.createElement('div'); ui.className = 'nb-ui';
  ui.innerHTML = `
    <div class="nb-prompt">Order at the counter <button class="nb-btn" data-open>Open menu</button></div>
    <div class="nb-sheet" hidden>
      <div class="nb-title">Neon Brew ☕ <span>pick your brew</span></div>
      <div class="nb-items">${MENU.map((m) => `<button class="nb-item" data-id="${m.id}"><i style="background:${m.color}"></i>${m.name}<b>₹${m.price}</b></button>`).join('')}</div>
      <button class="nb-close" data-close>Not now</button>
    </div>
    <div class="nb-toast" hidden></div>`;
  document.body.appendChild(ui);
  const prompt = ui.querySelector('.nb-prompt'), sheet = ui.querySelector('.nb-sheet'), toast = ui.querySelector('.nb-toast');
  let dismissed = false, near = false;

  // cup held in view
  const cup = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.045, 0.13, 48), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6 }));
  const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.052, 0.05, 48), new THREE.MeshStandardMaterial({ color: '#ff8fa8' }));
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.064, 0.064, 0.02, 48), new THREE.MeshStandardMaterial({ color: '#3a2b25' }));
  lid.position.y = 0.075; sleeve.position.y = -0.005; cup.add(body, sleeve, lid);
  cup.position.set(0.24, -0.2, -0.62); cup.rotation.set(0.1, 0, -0.1); cup.visible = false;
  camera.add(cup);

  const show = (el, v) => { el.hidden = !v; };
  ui.addEventListener('click', (e) => {
    const t = e.target.closest('button'); if (!t) return;
    if (t.dataset.open !== undefined) { show(sheet, true); show(prompt, false); }
    if (t.dataset.close !== undefined) { show(sheet, false); dismissed = true; }
    if (t.dataset.id) buy(MENU.find((m) => m.id === t.dataset.id));
  });
  ui.addEventListener('pointerdown', (e) => e.stopPropagation());
  addEventListener('keydown', (e) => { if (e.code === 'KeyF' && near) { show(sheet, true); show(prompt, false); } });

  function buy(item) {
    show(sheet, false); dismissed = true;
    toast.innerHTML = `☕ <b>${item.name}</b> is yours, ₹${item.price}. Enjoy the view!`;
    show(toast, true); clearTimeout(buy.t); buy.t = setTimeout(() => show(toast, false), 3200);
    sleeve.material.color.set(item.color === '#5a3424' ? '#8fe3d8' : '#ff8fa8');
    cup.visible = true; cup.position.y = -0.4;
  }

  const z = island.counterZone;
  function update(p, dt, t) {
    near = Math.hypot(p.x - z.x, p.z - z.z) < z.r + 0.5;
    if (!near) { dismissed = false; show(prompt, false); show(sheet, false); }
    else if (sheet.hidden && !dismissed) show(prompt, true);
    if (cup.visible) { cup.position.y += (-0.2 + Math.sin(t * 2) * 0.004 - cup.position.y) * (1 - Math.exp(-8 * dt)); }
  }
  return { update, buy: (id) => buy(MENU.find((m) => m.id === id)), openMenu: () => { show(sheet, true); show(prompt, false); } };
}
