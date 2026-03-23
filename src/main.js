import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass }     from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass }     from 'three/examples/jsm/postprocessing/ShaderPass.js';
import gsap from 'gsap';

// ════════════════════════════════════════════════════════════
// DEVICE DETECTION
// ════════════════════════════════════════════════════════════
const isMobile = window.matchMedia('(pointer: coarse)').matches;
const isSmallScreen = window.innerWidth < 768;

// ════════════════════════════════════════════════════════════
// RENDERER
// ════════════════════════════════════════════════════════════
const renderer = new THREE.WebGLRenderer({ antialias: !isMobile });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
renderer.outputColorSpace   = THREE.SRGBColorSpace;
renderer.toneMapping        = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 2.0;
renderer.shadowMap.enabled  = !isMobile;
renderer.shadowMap.type     = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// ════════════════════════════════════════════════════════════
// SCENE & CAMERA
// ════════════════════════════════════════════════════════════
const scene = new THREE.Scene();
scene.fog   = new THREE.FogExp2(0x0a1020, 0.018);

const camera = new THREE.PerspectiveCamera(
  isMobile ? 62 : 52,
  window.innerWidth / window.innerHeight, 0.1, 200
);
camera.position.set(0, 2.2, 11);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping  = true;
controls.dampingFactor  = 0.07;
controls.enablePan      = false;
controls.minDistance    = isMobile ? 5.0 : 3.5;
controls.maxDistance    = isMobile ? 18 : 22;
controls.minPolarAngle  = 0.05;
controls.maxPolarAngle  = Math.PI * 0.58;
controls.target.set(0, 2.8, 0);
controls.update();

// ════════════════════════════════════════════════════════════
// WALK MODE (desktop: pointer lock, mobile: virtual joystick)
// ════════════════════════════════════════════════════════════
const walkState = {
  enabled: false,
  forward: false, backward: false, left: false, right: false, sprint: false,
  velocity: new THREE.Vector3(),
  speed: 3.8,
  sprintSpeed: 5.8,
  joystickX: 0,
  joystickY: 0,
  lookDeltaX: 0,
  lookDeltaY: 0,
};

// Orbit-mode WASD panning state (moves camera + target together)
const orbitPan = { forward:false, backward:false, left:false, right:false };

const walkToggle = document.getElementById('walk-toggle');
const mobileControls = document.getElementById('mobile-controls');
const hudHint = document.getElementById('hud-hint');

function setWalkMode(active) {
  walkState.enabled = active;
  if (active) {
    camera.position.set(0, 1.72, 1.35);
    camera.lookAt(0, 1.7, -2.1);
    controls.enabled = false;
    if (walkToggle) walkToggle.textContent = 'EXIT WALK';
    if (hudHint) hudHint.textContent = isMobile ? 'JOYSTICK TO MOVE · DRAG RIGHT TO LOOK' : 'WASD MOVE · MOUSE LOOK · ESC EXIT';
    if (isMobile && mobileControls) mobileControls.style.display = 'flex';
  } else {
    controls.enabled = true;
    if (walkToggle) walkToggle.textContent = 'WALK MODE';
    if (hudHint) hudHint.textContent = isMobile ? 'DRAG TO ORBIT · PINCH ZOOM' : 'WASD MOVE · DRAG ORBIT · SCROLL ZOOM · I WALK';
    if (isMobile && mobileControls) mobileControls.style.display = 'none';
    controls.target.set(0, 2.8, 0);
    controls.update();
    walkState.velocity.set(0, 0, 0);
  }
}

if (walkToggle) {
  walkToggle.addEventListener('click', () => setWalkMode(!walkState.enabled));
  walkToggle.addEventListener('touchend', (e) => e.preventDefault());
}

// ─── Desktop keyboard controls ───
window.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if (k === 'i' && !walkState.enabled) { setWalkMode(true); return; }
  if (k === 'escape' && walkState.enabled) { setWalkMode(false); return; }
  if (k === 'w' || k === 'arrowup') { walkState.forward = true; orbitPan.forward = true; }
  if (k === 's' || k === 'arrowdown') { walkState.backward = true; orbitPan.backward = true; }
  if (k === 'a' || k === 'arrowleft') { walkState.left = true; orbitPan.left = true; }
  if (k === 'd' || k === 'arrowright') { walkState.right = true; orbitPan.right = true; }
  if (k === 'shift') walkState.sprint = true;
});
window.addEventListener('keyup', (e) => {
  const k = e.key.toLowerCase();
  if (k === 'w' || k === 'arrowup') { walkState.forward = false; orbitPan.forward = false; }
  if (k === 's' || k === 'arrowdown') { walkState.backward = false; orbitPan.backward = false; }
  if (k === 'a' || k === 'arrowleft') { walkState.left = false; orbitPan.left = false; }
  if (k === 'd' || k === 'arrowright') { walkState.right = false; orbitPan.right = false; }
  if (k === 'shift') walkState.sprint = false;
});

// ─── Desktop mouse look ───
let mouseCaptured = false;
if (!isMobile) {
  renderer.domElement.addEventListener('click', () => {
    if (walkState.enabled && !mouseCaptured) {
      renderer.domElement.requestPointerLock();
    }
  });
  document.addEventListener('pointerlockchange', () => {
    mouseCaptured = document.pointerLockElement === renderer.domElement;
  });
  document.addEventListener('mousemove', (e) => {
    if (mouseCaptured && walkState.enabled) {
      const euler = new THREE.Euler(0, 0, 0, 'YXZ');
      euler.setFromQuaternion(camera.quaternion);
      euler.y -= e.movementX * 0.002;
      euler.x -= e.movementY * 0.002;
      euler.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, euler.x));
      camera.quaternion.setFromEuler(euler);
    }
  });
}

// ─── Mobile virtual joystick ───
if (isMobile) {
  const joystickZone = document.getElementById('joystick-zone');
  const joystickKnob = document.getElementById('joystick-knob');
  const lookZone = document.getElementById('look-zone');

  if (joystickZone && joystickKnob) {
    let joyTouchId = null;
    let joyCenter = { x: 0, y: 0 };
    const joyMaxDist = 40;

    joystickZone.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const t = e.changedTouches[0];
      joyTouchId = t.identifier;
      const rect = joystickZone.getBoundingClientRect();
      joyCenter.x = rect.left + rect.width / 2;
      joyCenter.y = rect.top + rect.height / 2;
    }, { passive: false });

    joystickZone.addEventListener('touchmove', (e) => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        if (t.identifier === joyTouchId) {
          let dx = t.clientX - joyCenter.x;
          let dy = t.clientY - joyCenter.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > joyMaxDist) { dx = dx / dist * joyMaxDist; dy = dy / dist * joyMaxDist; }
          joystickKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
          walkState.joystickX = dx / joyMaxDist;
          walkState.joystickY = -dy / joyMaxDist;
        }
      }
    }, { passive: false });

    const resetJoy = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === joyTouchId) {
          joyTouchId = null;
          joystickKnob.style.transform = 'translate(-50%, -50%)';
          walkState.joystickX = 0;
          walkState.joystickY = 0;
        }
      }
    };
    joystickZone.addEventListener('touchend', resetJoy, { passive: false });
    joystickZone.addEventListener('touchcancel', resetJoy, { passive: false });
  }

  if (lookZone) {
    let lookTouchId = null;
    let lastLook = { x: 0, y: 0 };

    lookZone.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const t = e.changedTouches[0];
      lookTouchId = t.identifier;
      lastLook.x = t.clientX;
      lastLook.y = t.clientY;
    }, { passive: false });

    lookZone.addEventListener('touchmove', (e) => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        if (t.identifier === lookTouchId) {
          walkState.lookDeltaX = (t.clientX - lastLook.x) * 0.004;
          walkState.lookDeltaY = (t.clientY - lastLook.y) * 0.004;
          lastLook.x = t.clientX;
          lastLook.y = t.clientY;
        }
      }
    }, { passive: false });

    const resetLook = () => {
      lookTouchId = null;
      walkState.lookDeltaX = 0;
      walkState.lookDeltaY = 0;
    };
    lookZone.addEventListener('touchend', resetLook, { passive: false });
    lookZone.addEventListener('touchcancel', resetLook, { passive: false });
  }
}

// ════════════════════════════════════════════════════════════
// POST PROCESSING
// ════════════════════════════════════════════════════════════
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const bloom = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  isMobile ? 0.4 : 0.55, 0.4, 0.82
);
composer.addPass(bloom);

const grainPass = new ShaderPass({
  uniforms: { tDiffuse:{value:null}, uTime:{value:0}, uGrain:{value: isMobile ? 0.012 : 0.018} },
  vertexShader: `varying vec2 v; void main(){ v=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
  fragmentShader:`
    uniform sampler2D tDiffuse; uniform float uTime,uGrain; varying vec2 v;
    float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5);}
    void main(){
      vec2 d=v-.5;
      float caStr = 0.0006;
      float r=texture2D(tDiffuse,v+d*caStr).r;
      float g=texture2D(tDiffuse,v).g;
      float b=texture2D(tDiffuse,v-d*caStr).b;
      vec3 col=vec3(r,g,b)+h(v+fract(uTime*.07))*uGrain-uGrain*.5;
      gl_FragColor=vec4(col,1.);
    }`,
});
composer.addPass(grainPass);

const clock = new THREE.Clock();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
  bloom.setSize(window.innerWidth, window.innerHeight);
});

// ════════════════════════════════════════════════════════════
// CANVAS TEXT HELPERS
// ════════════════════════════════════════════════════════════
function makeLabel(text, { font='bold 96px Orbitron,monospace', color='#fff', glow='#fff', w=1024, h=256, blur=24, passes=3 }={}) {
  const c=document.createElement('canvas'); c.width=w; c.height=h;
  const ctx=c.getContext('2d');
  ctx.clearRect(0,0,w,h);
  ctx.font=font; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.shadowBlur=blur; ctx.shadowColor=glow;
  ctx.fillStyle=color;
  for(let i=0;i<passes;i++) ctx.fillText(text,w/2,h/2);
  return new THREE.CanvasTexture(c);
}
function labelMesh(text,pw,ph,opts){
  return new THREE.Mesh(
    new THREE.PlaneGeometry(pw,ph),
    new THREE.MeshBasicMaterial({
      map: makeLabel(text,opts),
      transparent:true, depthWrite:false, blending:THREE.AdditiveBlending
    })
  );
}

function panelTextMesh(lines, pw, ph, {
  font='bold 38px Share Tech Mono,monospace',
  color='#8ff4ff',
  glow='#00d3ff',
  w=1024, h=512, blur=6, lineGap=1.28,
}={}) {
  const c=document.createElement('canvas'); c.width=w; c.height=h;
  const ctx=c.getContext('2d');
  ctx.clearRect(0,0,w,h);
  ctx.font=font; ctx.textAlign='left'; ctx.textBaseline='top';
  ctx.fillStyle=color; ctx.shadowBlur=blur; ctx.shadowColor=glow;
  const fontSize = Number((font.match(/(\d+)px/)||['',38])[1]);
  const step = Math.round(fontSize * lineGap);
  let y = Math.round(h * 0.12);
  for (const line of lines) { ctx.fillText(line, Math.round(w * 0.08), y); y += step; }
  const tex = new THREE.CanvasTexture(c);
  return new THREE.Mesh(
    new THREE.PlaneGeometry(pw, ph),
    new THREE.MeshBasicMaterial({ map: tex, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending })
  );
}

// ════════════════════════════════════════════════════════════
// MATERIALS
// ════════════════════════════════════════════════════════════
const M = {
  wall:      new THREE.MeshStandardMaterial({color:0x4a4e62, emissive:0x071124, emissiveIntensity:0.28, roughness:0.88, metalness:0.05}),
  wallDark:  new THREE.MeshStandardMaterial({color:0x323749, emissive:0x050b18, emissiveIntensity:0.2, roughness:0.86}),
  sign:      new THREE.MeshStandardMaterial({color:0x1d2232, emissive:0x050914, emissiveIntensity:0.2, roughness:0.72, metalness:0.15}),
  frame:     new THREE.MeshStandardMaterial({color:0x23293a, roughness:0.55, metalness:0.75}),
  chrome:    new THREE.MeshStandardMaterial({color:0xaaaacc, roughness:0.15, metalness:1.0}),
  darkMetal: new THREE.MeshStandardMaterial({color:0x2a2f42, roughness:0.5, metalness:0.82}),
  wood:      new THREE.MeshStandardMaterial({color:0x2a1c12, roughness:0.9}),
  woodLight: new THREE.MeshStandardMaterial({color:0x5a3e28, roughness:0.82}),
  cream:     new THREE.MeshStandardMaterial({color:0xd4c4a8, roughness:0.5}),
  concrete:  new THREE.MeshStandardMaterial({color:0x3d4252, emissive:0x080c14, emissiveIntensity:0.15, roughness:0.82}),
  leather:   new THREE.MeshStandardMaterial({color:0x2a1a1a, emissive:0x0a0505, emissiveIntensity:0.15, roughness:0.75, metalness:0.05}),
  leatherTeal: new THREE.MeshStandardMaterial({color:0x1a3838, emissive:0x051515, emissiveIntensity:0.2, roughness:0.72, metalness:0.05}),
  tileDark:  new THREE.MeshStandardMaterial({color:0x1e2230, emissive:0x060812, emissiveIntensity:0.2, roughness:0.4, metalness:0.3}),
};
function sm(col,rough=0.85,metal=0){return new THREE.MeshStandardMaterial({color:col,roughness:rough,metalness:metal});}
function neonMat(col,opa=0.95){return new THREE.MeshBasicMaterial({color:col,blending:THREE.AdditiveBlending,transparent:true,opacity:opa,depthWrite:false});}
function neonStrip(w,h,col){
  return new THREE.Mesh(new THREE.PlaneGeometry(w,h),neonMat(col));
}

// glass
const glassMat = new THREE.MeshPhysicalMaterial({
  color:0xf7fbff, roughness:0.015, metalness:0.01,
  transmission:0.97, transparent:true, opacity:0.24,
  ior:1.45, thickness:0.08, depthWrite:false, side:THREE.FrontSide
});

// ════════════════════════════════════════════════════════════
// SKY SPHERE
// ════════════════════════════════════════════════════════════
const skySphere = new THREE.Mesh(
  new THREE.SphereGeometry(85, isMobile ? 12 : 16, isMobile ? 6 : 8),
  new THREE.ShaderMaterial({
    side:THREE.BackSide, depthWrite:false,
    uniforms:{uTime:{value:0}},
    vertexShader:`varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`
      uniform float uTime; varying vec2 vUv;
      float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5);}
      float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1)),f.x),f.y);}
      void main(){
        float y=vUv.y;
        vec3 sky=mix(vec3(0.18,0.06,0.28),vec3(0.04,0.04,0.10),y);
        float haze=smoothstep(.38,.0,y);
        sky+=vec3(0.45,0.10,0.35)*haze;
        sky+=vec3(0.0,0.35,0.55)*haze*.6;
        float cloud=n(vUv*vec2(5.,2.)+vec2(uTime*.012,0.));
        sky+=vec3(0.30,0.05,0.50)*smoothstep(.48,.68,cloud)*(1.-y)*.22;
        float stars=step(0.992,h(floor(vUv*400.)));
        sky+=vec3(0.6,0.7,1.0)*stars*(0.3+0.2*sin(uTime*2.+h(floor(vUv*400.))*6.28));
        gl_FragColor=vec4(sky,1.);}`,

  })
);
scene.add(skySphere);

// ════════════════════════════════════════════════════════════
// WET STREET
// ════════════════════════════════════════════════════════════
const streetMat = new THREE.ShaderMaterial({
  uniforms:{uTime:{value:0}},
  vertexShader:`varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader:`
    uniform float uTime; varying vec2 vUv;
    float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5);}
    float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1)),f.x),f.y);}
    float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*n(p);p*=2.1;a*=.5;}return v;}
    void main(){
      vec3 base=vec3(0.16,0.16,0.18)+fbm(vUv*90.)*.08;
      float wet=smoothstep(0.,.65,vUv.y);
      float r1=fbm(vUv*3.+vec2(uTime*.14,0.));
      float r2=fbm(vUv*4.2+vec2(0.,uTime*.11));
      float r3=fbm(vUv*2.8+vec2(uTime*.07,-uTime*.05));
      vec3 ref=vec3(0.,1.,1.)*r1*.7+vec3(1.,.1,.5)*r2*.55+vec3(1.,.55,.1)*r3*.4;
      base=mix(base,ref,wet*.82);
      base+=vec3(.2,.9,1.)*step(.77,n(vec2(vUv.x*42.,vUv.y*14.-uTime*.9)))*.18;
      float lane=step(.498,fract(vUv.x*3.5))*step(fract(vUv.x*3.5),.502);
      base=mix(base,vec3(.28,.28,.32),lane*.4);
      gl_FragColor=vec4(base,1.);}`,
});
const streetMesh = new THREE.Mesh(new THREE.PlaneGeometry(42, 28, 1, 1), streetMat);
streetMesh.rotation.x = -Math.PI / 2; streetMesh.position.set(0, 0, 6);
scene.add(streetMesh);

// Footpath — wide raised sidewalk
const fpMesh = new THREE.Mesh(new THREE.BoxGeometry(12, 0.14, 4.2), M.concrete);
fpMesh.position.set(0, 0.07, 2.2); scene.add(fpMesh);
// curb
const curbMesh = new THREE.Mesh(new THREE.BoxGeometry(12.2, 0.18, 0.15), sm(0x48505e, 0.8));
curbMesh.position.set(0, 0.09, 4.3); scene.add(curbMesh);

// helper: create mesh + set position (and optionally rotation)
function pm(geo, mat, x, y, z, rx, ry, rz) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  if (rx || ry || rz) m.rotation.set(rx||0, ry||0, rz||0);
  return m;
}

// ════════════════════════════════════════════════════════════
// ██████  CAFE BUILDING — MODERN ARCHITECTURAL REDESIGN  ██████
// ════════════════════════════════════════════════════════════
const cafe = new THREE.Group();
scene.add(cafe);

// ── Key measurements ─────────────────────────────────────
const BW = 10, BH = 6.0, BD = 6;
const glassBot = 0.0, glassH = 3.4;
const glassTop = glassBot + glassH;
const signBandBot = glassTop + 0.15;
const signBandH = BH - signBandBot;
const signBandMid = signBandBot + signBandH / 2;

// ══════════════════════════════════════════════════════════
// STRUCTURAL SHELL
// ══════════════════════════════════════════════════════════

// Back wall
cafe.add(pm(new THREE.BoxGeometry(BW, BH, 0.22), M.wall, 0, BH/2, -BD));

// Side walls
[-BW/2, BW/2].forEach(x => {
  cafe.add(pm(new THREE.BoxGeometry(0.22, BH, BD+0.2), M.wall, x, BH/2, -BD/2));
});

// Flat roof — cantilever overhang
cafe.add(pm(new THREE.BoxGeometry(BW+1.6, 0.18, BD+2.8), sm(0x1e2028, 0.88), 0, BH+0.09, -BD/2+0.8));
// Roof edge neon reveal
const roofEdge = new THREE.Mesh(new THREE.BoxGeometry(BW+1.5, 0.03, 0.03), neonMat(0x00cccc, 0.4));
roofEdge.position.set(0, BH, 1.2); cafe.add(roofEdge);

// Interior floor — polished dark
cafe.add(pm(new THREE.BoxGeometry(BW-0.4, 0.06, BD-0.2), new THREE.MeshStandardMaterial({color:0x2e2a38, emissive:0x080610, emissiveIntensity:0.2, roughness:0.3, metalness:0.15}), 0, 0.03, -BD/2+0.1));

// ══════════════════════════════════════════════════════════
// FRONT FACADE — Floor-to-ceiling glass
// ══════════════════════════════════════════════════════════

// Upper sign band
cafe.add(pm(new THREE.BoxGeometry(BW, signBandH, 0.28), M.sign, 0, signBandMid, 0));

// Horizontal reveal at glass top
cafe.add(pm(new THREE.BoxGeometry(BW, 0.08, 0.32), M.darkMetal, 0, glassTop+0.04, 0.02));

// Steel mullions
[-BW/2+0.15, -BW/4, -1.1, 1.1, BW/4, BW/2-0.15].forEach(x => {
  cafe.add(pm(new THREE.BoxGeometry(0.08, glassH, 0.2), M.darkMetal, x, glassH/2, 0.02));
});

// Bottom rail
cafe.add(pm(new THREE.BoxGeometry(BW, 0.06, 0.24), M.darkMetal, 0, 0.03, 0.02));

// Glass panels
const glLeft = new THREE.Mesh(new THREE.PlaneGeometry(BW/2-1.2, glassH-0.1), glassMat);
glLeft.position.set(-BW/4-0.5, glassH/2, 0.06); cafe.add(glLeft);
const glRight = new THREE.Mesh(new THREE.PlaneGeometry(BW/2-1.2, glassH-0.1), glassMat);
glRight.position.set(BW/4+0.5, glassH/2, 0.06); cafe.add(glRight);

// ── SLIDING DOOR ──
const doorW = 2.0;
const leftDoor = new THREE.Mesh(new THREE.PlaneGeometry(doorW/2-0.04, glassH-0.1), glassMat);
leftDoor.position.set(-doorW/4, glassH/2, 0.08); cafe.add(leftDoor);
const rightDoor = new THREE.Mesh(new THREE.PlaneGeometry(doorW/2-0.04, glassH-0.1), glassMat);
rightDoor.position.set(doorW/4, glassH/2, 0.08); cafe.add(rightDoor);

// Door frame
cafe.add(pm(new THREE.BoxGeometry(0.06, glassH, 0.12), M.darkMetal, -doorW/2, glassH/2, 0.06));
cafe.add(pm(new THREE.BoxGeometry(0.06, glassH, 0.12), M.darkMetal, doorW/2, glassH/2, 0.06));

// Pull handles
const doorHandleL = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.65, 12), M.chrome);
doorHandleL.position.set(-0.2, 1.45, 0.14); cafe.add(doorHandleL);
const doorHandleR = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.65, 12), M.chrome);
doorHandleR.position.set(0.2, 1.45, 0.14); cafe.add(doorHandleR);

// Welcome mat + neon edge
const doorMat = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.9), new THREE.MeshStandardMaterial({color:0x14161d, roughness:0.95}));
doorMat.rotation.x = -Math.PI/2; doorMat.position.set(0, 0.015, 0.7); cafe.add(doorMat);
const matGlow = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.03), neonMat(0x00cccc, 0.3));
matGlow.rotation.x = -Math.PI/2; matGlow.position.set(0, 0.016, 1.16); cafe.add(matGlow);

// Threshold
const threshold = new THREE.Mesh(new THREE.BoxGeometry(doorW+0.2, 0.03, 0.18), sm(0x4b4f5e, 0.55, 0.35));
threshold.position.set(0, 0.015, 0.15); cafe.add(threshold);

// ══════════════════════════════════════════════════════════
// INTERIOR — L-counter, booths, window bar, TV wall
// ══════════════════════════════════════════════════════════

// Interior back wall warm plaster
cafe.add(pm(new THREE.BoxGeometry(BW-0.5, BH-0.2, 0.1), new THREE.MeshStandardMaterial({color:0x3a2820, emissive:0x120804, emissiveIntensity:0.45, roughness:0.82}), 0, BH/2, -BD+0.12));

// Warm glow behind glass
const intGlowMat = new THREE.MeshBasicMaterial({color:0xffcc77, transparent:true, opacity:0.10, blending:THREE.AdditiveBlending, depthWrite:false, side:THREE.DoubleSide});
cafe.add(pm(new THREE.PlaneGeometry(BW-1.2, glassH-0.2), intGlowMat, 0, glassH/2, -0.15));

// ── L-SHAPED COUNTER ──
// Long side
const counterLong = new THREE.Mesh(new THREE.BoxGeometry(4.5, 1.08, 0.85), new THREE.MeshStandardMaterial({color:0x2a2435, emissive:0x0c0810, emissiveIntensity:0.25, roughness:0.45, metalness:0.5}));
counterLong.position.set(-0.8, 0.54, -3.2); cafe.add(counterLong);
cafe.add(pm(new THREE.BoxGeometry(4.5, 0.05, 0.85), new THREE.MeshStandardMaterial({color:0x453852, emissive:0x100818, emissiveIntensity:0.2, roughness:0.12, metalness:0.85}), -0.8, 1.09, -3.2));

// Short side (perpendicular)
const counterShort = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.08, 2.0), new THREE.MeshStandardMaterial({color:0x2a2435, emissive:0x0c0810, emissiveIntensity:0.25, roughness:0.45, metalness:0.5}));
counterShort.position.set(-2.8, 0.54, -2.2); cafe.add(counterShort);
cafe.add(pm(new THREE.BoxGeometry(0.85, 0.05, 2.0), new THREE.MeshStandardMaterial({color:0x453852, emissive:0x100818, emissiveIntensity:0.2, roughness:0.12, metalness:0.85}), -2.8, 1.09, -2.2));

// Under-counter neon accents
const ucNeon1 = new THREE.Mesh(new THREE.BoxGeometry(4.3, 0.02, 0.02), neonMat(0x00e6ff, 0.5));
ucNeon1.position.set(-0.8, 0.08, -2.78); cafe.add(ucNeon1);
const ucNeon2 = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 1.9), neonMat(0x00e6ff, 0.5));
ucNeon2.position.set(-2.38, 0.08, -2.2); cafe.add(ucNeon2);
const ucNeonPink = new THREE.Mesh(new THREE.BoxGeometry(4.3, 0.015, 0.02), neonMat(0xff2d78, 0.3));
ucNeonPink.position.set(-0.8, 0.12, -2.77); cafe.add(ucNeonPink);

// ── PENDANT LIGHTS ──
[-1.8, -0.6, 0.6].forEach(x => {
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.22, 12, 1, true), new THREE.MeshStandardMaterial({color:0x1a1a2a, roughness:0.6, metalness:0.7, side:THREE.DoubleSide}));
  shade.position.set(x, 3.2, -3.2); shade.rotation.x = Math.PI; cafe.add(shade);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 10), new THREE.MeshBasicMaterial({color:0xffdd88}));
  bulb.position.set(x, 3.06, -3.2); cafe.add(bulb);
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, BH-3.2, 4), sm(0x222233, 0.5));
  cord.position.set(x, (BH+3.2)/2, -3.2); cafe.add(cord);
  const pl = new THREE.PointLight(0xffcc66, 2.8, 5); pl.position.set(x, 3.0, -3.2); cafe.add(pl);
});

// ── ESPRESSO MACHINE ──
cafe.add(pm(new THREE.BoxGeometry(0.9, 0.7, 0.65), new THREE.MeshStandardMaterial({color:0x3a3848, roughness:0.22, metalness:0.88, emissive:0x060408, emissiveIntensity:0.3}), 0.4, 1.44, -3.45));
cafe.add(pm(new THREE.PlaneGeometry(0.6, 0.25), new THREE.MeshBasicMaterial({color:0x00e5ff, blending:THREE.AdditiveBlending, transparent:true, opacity:0.55}), 0.4, 1.55, -3.12));

// Coffee grinder
cafe.add(pm(new THREE.CylinderGeometry(0.12, 0.10, 0.5, 16), new THREE.MeshStandardMaterial({color:0x3a3848, roughness:0.22, metalness:0.82}), 1.2, 1.35, -3.45));

// ── BAR STOOLS ──
[-1.6, -0.4, 0.8].forEach(x => {
  const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.05, 16), M.leatherTeal);
  seat.position.set(x, 0.78, -2.45); cafe.add(seat);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.7, 8), M.chrome);
  stem.position.set(x, 0.42, -2.45); cafe.add(stem);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.04, 16), M.darkMetal);
  base.position.set(x, 0.07, -2.45); cafe.add(base);
  const footrest = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.01, 8, 16), M.chrome);
  footrest.rotation.x = Math.PI/2; footrest.position.set(x, 0.32, -2.45); cafe.add(footrest);
});

// ── BOOTH SEATING — right wall ──
function createBooth(x, z, rotation) {
  const booth = new THREE.Group();
  const back = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.95, 0.18), M.leather);
  back.position.set(0, 0.72, -0.35); booth.add(back);
  const seat = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.12, 0.55), M.leather);
  seat.position.set(0, 0.37, -0.08); booth.add(seat);
  const panel = new THREE.Mesh(new THREE.BoxGeometry(1.84, 0.32, 0.6), M.darkMetal);
  panel.position.set(0, 0.16, -0.08); booth.add(panel);
  const accent = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.015, 0.02), neonMat(0xff2d78, 0.35));
  accent.position.set(0, 0.06, 0.2); booth.add(accent);
  booth.position.set(x, 0, z);
  booth.rotation.y = rotation;
  cafe.add(booth);
}
createBooth(3.8, -1.8, -Math.PI/2);
createBooth(3.8, -3.8, -Math.PI/2);

// ── BOOTH TABLES ──
function createBoothTable(x, z) {
  const top = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.04, 0.55), new THREE.MeshStandardMaterial({color:0x403848, roughness:0.3, metalness:0.6}));
  top.position.set(x, 0.72, z); cafe.add(top);
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.68, 10), M.chrome);
  ped.position.set(x, 0.36, z); cafe.add(ped);
  const pl = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.03, 0.35), M.darkMetal);
  pl.position.set(x, 0.02, z); cafe.add(pl);
}
createBoothTable(3.0, -1.8);
createBoothTable(3.0, -3.8);

// ── WINDOW COUNTER — left wall ──
const windowCounter = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.04, 3.5), new THREE.MeshStandardMaterial({color:0x403848, roughness:0.3, metalness:0.6}));
windowCounter.position.set(-4.5, 1.0, -1.5); cafe.add(windowCounter);
[-0.3, -1.5, -2.7].forEach(z => {
  const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.03, 0.06), M.chrome);
  bracket.position.set(-4.5, 0.85, z); cafe.add(bracket);
  const vBracket = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.15, 0.06), M.chrome);
  vBracket.position.set(-4.32, 0.92, z); cafe.add(vBracket);
});
[-0.5, -1.5, -2.5].forEach(z => {
  const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.04, 14), M.leatherTeal);
  seat.position.set(-4.1, 0.82, z); cafe.add(seat);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.76, 8), M.chrome);
  stem.position.set(-4.1, 0.42, z); cafe.add(stem);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.03, 14), M.darkMetal);
  base.position.set(-4.1, 0.06, z); cafe.add(base);
});

// ══════════════════════════════════════════════════════════
// TV / MEDIA WALL
// ══════════════════════════════════════════════════════════
const mediaWall = new THREE.Mesh(new THREE.BoxGeometry(5.6, 2.4, 0.08), new THREE.MeshStandardMaterial({color:0x0e1420, roughness:0.6, metalness:0.5, emissive:0x061022, emissiveIntensity:0.4}));
mediaWall.position.set(0, 2.85, -5.78); cafe.add(mediaWall);
const mediaEdge = new THREE.Mesh(new THREE.BoxGeometry(5.68, 2.48, 0.02), new THREE.MeshBasicMaterial({color:0x00cfff, transparent:true, opacity:0.3, blending:THREE.AdditiveBlending, depthWrite:false}));
mediaEdge.position.set(0, 2.85, -5.73); cafe.add(mediaEdge);

const menuHdr = panelTextMesh(
  ['NEONBREW // MENU  24/7'],
  4.2, 0.4,
  { font:'bold 58px Orbitron,monospace', color:'#6ff7ff', glow:'#00d3ff', w:1600, h:180, blur:7 }
);
menuHdr.position.set(0, 3.65, -5.68); cafe.add(menuHdr);

const menuLeft = panelTextMesh(
  ['HOT BREW', 'ESPRESSO      ¥420', 'LATTE         ¥450', 'MOCHA         ¥520', 'MATCHA BYTE   ¥540'],
  2.4, 1.0,
  { font:'bold 34px Share Tech Mono,monospace', color:'#87f3ff', glow:'#00aecd', w:1200, h:520, blur:6 }
);
menuLeft.position.set(-1.3, 2.75, -5.68); cafe.add(menuLeft);

const menuRight = panelTextMesh(
  ['COLD SYSTEM', 'NIGHT BLEND   ¥560', 'SYNTH COLD    ¥600', 'CYBER TONIC   ¥620', 'VOID AFFOGATO ¥640'],
  2.4, 1.0,
  { font:'bold 34px Share Tech Mono,monospace', color:'#ffb0de', glow:'#ff2d78', w:1200, h:520, blur:6 }
);
menuRight.position.set(1.3, 2.75, -5.68); cafe.add(menuRight);

const menuDivider = new THREE.Mesh(new THREE.PlaneGeometry(0.03, 1.2), new THREE.MeshBasicMaterial({color:0x00d2ff, transparent:true, opacity:0.4, blending:THREE.AdditiveBlending, depthWrite:false}));
menuDivider.position.set(0, 2.7, -5.67); cafe.add(menuDivider);

// Equalizer bars
const interiorBars = [];
[-2.2, -1.6, -1.0, -0.4, 0.2, 0.8, 1.4, 2.0].forEach((x, i) => {
  const col = i % 2 === 0 ? 0x00d8ff : 0xff4f95;
  const bar = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.6), new THREE.MeshBasicMaterial({color:col, transparent:true, opacity:0.34, blending:THREE.AdditiveBlending, depthWrite:false}));
  bar.position.set(x, 2.0, -5.66);
  cafe.add(bar);
  interiorBars.push(bar);
});

// ── DISPLAY CASE ──
const caseBody = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.9, 0.7), new THREE.MeshStandardMaterial({color:0x2f3446, roughness:0.4, metalness:0.55}));
caseBody.position.set(1.6, 0.55, -3.2); cafe.add(caseBody);
const caseGlass = new THREE.Mesh(new THREE.BoxGeometry(1.46, 0.55, 0.68), new THREE.MeshPhysicalMaterial({color:0xdff4ff, roughness:0.03, transmission:0.94, thickness:0.05, transparent:true, opacity:0.32, depthWrite:false}));
caseGlass.position.set(1.6, 0.85, -3.2); cafe.add(caseGlass);
const shelfGlow = new THREE.Mesh(new THREE.BoxGeometry(1.38, 0.02, 0.6), new THREE.MeshBasicMaterial({color:0x66f2ff, transparent:true, opacity:0.4, blending:THREE.AdditiveBlending, depthWrite:false}));
shelfGlow.position.set(1.6, 0.78, -3.2); cafe.add(shelfGlow);
[-0.35, 0, 0.35].forEach(dx => {
  const pastry = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 0.09, 16), new THREE.MeshStandardMaterial({color:0xc08a5a, roughness:0.82}));
  pastry.position.set(1.6+dx, 0.72, -3.08); cafe.add(pastry);
});

// ── SHELVING ──
[-1.8, -1.2].forEach(shelfY => {
  cafe.add(pm(new THREE.BoxGeometry(4.0, 0.04, 0.2), M.wood, 0, shelfY+3.0, -5.85));
});
[-1.5, -0.9, -0.3, 0.3, 0.9, 1.5].forEach((x, i) => {
  const bottleColor = [0x6df7ff, 0xff66a8, 0x7dff8c, 0xffcc66][i % 4];
  const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.28, 10), new THREE.MeshStandardMaterial({color:0x9ab5cc, emissive:bottleColor, emissiveIntensity:0.22, roughness:0.2, metalness:0.15}));
  bottle.position.set(x, 1.38, -5.8); cafe.add(bottle);
  const bottle2 = bottle.clone();
  bottle2.position.set(x+0.15, 1.98, -5.8); cafe.add(bottle2);
});

// ── CEILING — exposed beams + track lights ──
[-2, 0, 2].forEach(x => {
  const beam = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.15, BD-0.4), sm(0x232830, 0.7, 0.4));
  beam.position.set(x, BH-0.08, -BD/2); cafe.add(beam);
});
const trackRail = new THREE.Mesh(new THREE.BoxGeometry(BW-1, 0.04, 0.04), sm(0x2a2f3d, 0.4, 0.8));
trackRail.position.set(0, BH-0.22, -1.5); cafe.add(trackRail);
[-3.5, -1.5, 0.5, 2.5].forEach(x => {
  const spotBody = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.12, 8), sm(0x1e2028, 0.5, 0.7));
  spotBody.position.set(x, BH-0.28, -1.5); cafe.add(spotBody);
});

// ══════════════════════════════════════════════════════════
// CANOPY — Modern flat with neon
// ══════════════════════════════════════════════════════════
const canopyD = 2.2, canopyY = glassTop + 0.3;
const canopy = new THREE.Mesh(new THREE.BoxGeometry(BW+0.6, 0.08, canopyD), sm(0x1e2028, 0.85, 0.1));
canopy.position.set(0, canopyY, canopyD/2); cafe.add(canopy);
const cSoffit = new THREE.Mesh(new THREE.PlaneGeometry(BW+0.4, canopyD-0.1), new THREE.MeshStandardMaterial({color:0x3a3030, emissive:0x181010, emissiveIntensity:0.3, roughness:0.85, side:THREE.DoubleSide}));
cSoffit.rotation.x = Math.PI/2; cSoffit.position.set(0, canopyY-0.04, canopyD/2); cafe.add(cSoffit);
const canopyNeon = new THREE.Mesh(new THREE.BoxGeometry(BW+0.4, 0.025, 0.025), neonMat(0xff2d78, 0.45));
canopyNeon.position.set(0, canopyY-0.06, canopyD+0.02); cafe.add(canopyNeon);
const canopyNeon2 = new THREE.Mesh(new THREE.BoxGeometry(BW+0.4, 0.018, 0.018), neonMat(0x00cccc, 0.3));
canopyNeon2.position.set(0, canopyY-0.09, canopyD+0.02); cafe.add(canopyNeon2);

// Canopy support columns
[-BW/2+0.3, BW/2-0.3].forEach(x => {
  const col = new THREE.Mesh(new THREE.BoxGeometry(0.06, canopyY, 0.06), M.darkMetal);
  col.position.set(x, canopyY/2, canopyD-0.1); cafe.add(col);
});

// Under-canopy lighting
const underCanopyWarm = new THREE.PointLight(0xffcc88, 3.5, 8);
underCanopyWarm.position.set(0, canopyY-0.15, canopyD*0.5); cafe.add(underCanopyWarm);
[-3.0, 3.0].forEach(x => {
  const wl = new THREE.PointLight(0xffcc88, 2.0, 5); wl.position.set(x, canopyY-0.15, canopyD*0.5); cafe.add(wl);
});

// ══════════════════════════════════════════════════════════
// SIGN BOARD
// ══════════════════════════════════════════════════════════
const nBorderT = neonStrip(8.5, 0.03, 0x00cccc); nBorderT.position.set(0, BH-0.04, 0.3); cafe.add(nBorderT);
const nBorderB = neonStrip(8.5, 0.03, 0x00cccc); nBorderB.position.set(0, signBandBot+0.02, 0.3); cafe.add(nBorderB);
const nBorderL = neonStrip(0.03, signBandH+0.08, 0xff2d78); nBorderL.position.set(-4.25, signBandMid, 0.3); cafe.add(nBorderL);
const nBorderR = neonStrip(0.03, signBandH+0.08, 0xff2d78); nBorderR.position.set(4.25, signBandMid, 0.3); cafe.add(nBorderR);

// ── Hero Hindi Sign — Devanagari neon ──
const hindiLbl = labelMesh('नियोन ब्रू', 7.0, 1.3, {font:'bold 160px sans-serif', color:'#00ffe0', glow:'#00ccaa', w:2048, h:380, blur:18, passes:3});
hindiLbl.position.set(0, signBandMid+0.18, 0.34); cafe.add(hindiLbl);

const hindiSub = labelMesh('कैफ़े  ◆  बेकरी  ◆  वाई-फ़ाई', 6.5, 0.45, {font:'bold 64px sans-serif', color:'#ff4090', glow:'#cc2060', w:2048, h:200, blur:10, passes:2});
hindiSub.position.set(0, signBandMid-0.55, 0.34); cafe.add(hindiSub);

// Small English under Hindi
const engSmall = labelMesh('N E O N B R E W', 4.5, 0.3, {font:'bold 48px Orbitron,monospace', color:'#ffffff', glow:'#88ccdd', w:1600, h:140, blur:6, passes:1});
engSmall.position.set(0, signBandMid-0.92, 0.34); cafe.add(engSmall);

const openLbl = labelMesh('OPEN', 0.95, 0.5, {font:'bold 92px Orbitron,monospace', color:'#39ff14', glow:'#39ff14', w:512, h:256, blur:10, passes:2});
openLbl.position.set(4.2, glassH/2+0.5, 0.3); cafe.add(openLbl);
const oT = neonStrip(1.05, 0.04, 0x39ff14); oT.position.set(4.2, glassH/2+0.78, 0.3); cafe.add(oT);
const oB = neonStrip(1.05, 0.04, 0x39ff14); oB.position.set(4.2, glassH/2+0.18, 0.3); cafe.add(oB);

// ══════════════════════════════════════════════════════════
// ROOFTOP
// ══════════════════════════════════════════════════════════
cafe.add(pm(new THREE.BoxGeometry(BW+0.4, 0.4, 0.14), sm(0x22222c, 0.88), 0, BH+0.2, -0.05));
[[-3, -2], [3, -2]].forEach(([x, z]) => {
  cafe.add(pm(new THREE.BoxGeometry(1.2, 0.5, 0.8), sm(0x202028, 0.7, 0.4), x, BH+0.35, z));
});
const antMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 2.0, 6), M.chrome);
antMesh.position.set(3.8, BH+1.2, -1); cafe.add(antMesh);
const blinkLight = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), new THREE.MeshBasicMaterial({color:0xff2222, transparent:true}));
blinkLight.position.set(3.8, BH+2.2, -1); cafe.add(blinkLight);
gsap.to(blinkLight.material, {opacity:0, duration:0.95, repeat:-1, yoyo:true});

// Hanging lanterns
[-3.5, 3.5].forEach(x => {
  const lantern = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.22, 12), neonMat(0xff6600, 0.7));
  lantern.position.set(x, canopyY-0.22, canopyD-0.15); cafe.add(lantern);
  cafe.add(pm(new THREE.CylinderGeometry(0.004, 0.004, 0.18, 6), sm(0x333333, 0.7), x, canopyY-0.08, canopyD-0.15));
  const ll = new THREE.PointLight(0xff8833, 1.5, 4.5); ll.position.set(x, canopyY-0.35, canopyD-0.05); cafe.add(ll);
});

// Door light spill
const doorSpill = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 3.2), new THREE.MeshBasicMaterial({color:0xffcc77, transparent:true, opacity:0.06, blending:THREE.AdditiveBlending, depthWrite:false}));
doorSpill.rotation.x = -Math.PI/2; doorSpill.position.set(0, 0.15, 1.8); cafe.add(doorSpill);

// ── Steam particles ──
const steamCount = isMobile ? 60 : 120;
const steamGeo = new THREE.BufferGeometry();
const steamPos = new Float32Array(steamCount * 3);
const steamVel = new Float32Array(steamCount);
for (let i = 0; i < steamCount; i++) {
  steamPos[i*3] = (Math.random()-0.5)*1.5 - 3;
  steamPos[i*3+1] = BH + 0.5 + Math.random()*1.5;
  steamPos[i*3+2] = -2 + (Math.random()-0.5)*0.5;
  steamVel[i] = 0.2 + Math.random()*0.4;
}
steamGeo.setAttribute('position', new THREE.BufferAttribute(steamPos, 3));
const steamPts = new THREE.Points(steamGeo, new THREE.PointsMaterial({color:0x889aaa, size:0.12, transparent:true, opacity:0.22, blending:THREE.AdditiveBlending, depthWrite:false}));
cafe.add(steamPts);
const steamAttr = steamGeo.attributes.position;

// ════════════════════════════════════════════════════════════
// EXTERIOR STREETSCAPE — CYBERPUNK REDESIGN
// ════════════════════════════════════════════════════════════

// ── LED ground strips — animated in render loop ──
const groundStrips = [];
[-4.5, -3.0, 3.0, 4.5].forEach(x => {
  const strip = new THREE.Mesh(
    new THREE.PlaneGeometry(0.04, 3.8),
    neonMat(0x00cccc, 0.35)
  );
  strip.rotation.x = -Math.PI/2;
  strip.position.set(x, 0.16, 2.0);
  scene.add(strip);
  groundStrips.push(strip);
});
// Cross strips
[-0.2, 0.2].forEach(z => {
  const cs = new THREE.Mesh(new THREE.PlaneGeometry(9.5, 0.03), neonMat(0xff2d78, 0.2));
  cs.rotation.x = -Math.PI/2; cs.position.set(0, 0.155, 0.6+z);
  scene.add(cs);
});

// ── Holographic Order Kiosk (left side) ──
const kioskBase = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, 1.1, 16), new THREE.MeshStandardMaterial({color:0x1a2030, roughness:0.3, metalness:0.85, emissive:0x050a14, emissiveIntensity:0.3}));
kioskBase.position.set(-4.2, 0.55, 2.2); scene.add(kioskBase);
const kioskRing = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.015, 10, 24), neonMat(0x00cccc, 0.5));
kioskRing.rotation.x = Math.PI/2; kioskRing.position.set(-4.2, 1.12, 2.2); scene.add(kioskRing);
const kioskScreen = panelTextMesh(
  ['▸ TAP TO ORDER', '  SYNTH LATTE', '  NIGHT BLEND', '  MATCHA BYTE'],
  0.55, 0.45,
  {font:'bold 28px Share Tech Mono,monospace', color:'#6ff7ff', glow:'#00d3ff', w:600, h:520, blur:5}
);
kioskScreen.position.set(-4.2, 1.4, 2.2); scene.add(kioskScreen);
const kioskHolo = new THREE.Mesh(
  new THREE.ConeGeometry(0.22, 0.6, 4, 1, true),
  new THREE.MeshBasicMaterial({color:0x00e8ff, transparent:true, opacity:0.08, blending:THREE.AdditiveBlending, depthWrite:false, side:THREE.DoubleSide})
);
kioskHolo.position.set(-4.2, 1.8, 2.2); scene.add(kioskHolo);
const kioskLight = new THREE.PointLight(0x00ccff, 2.0, 5);
kioskLight.position.set(-4.2, 1.5, 2.3); scene.add(kioskLight);

// ── Outdoor tables (redesigned — floating neon-edge) ──
function cafeTable(x, z) {
  // Table top with neon edge
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.03, 24), new THREE.MeshStandardMaterial({color:0x1a1e2a, roughness:0.2, metalness:0.8}));
  top.position.set(x, 0.74, z); scene.add(top);
  const topGlow = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.008, 8, 24), neonMat(0x00cccc, 0.45));
  topGlow.rotation.x = Math.PI/2; topGlow.position.set(x, 0.755, z); scene.add(topGlow);
  // Pedestal
  scene.add(pm(new THREE.CylinderGeometry(0.03, 0.04, 0.7, 10), M.chrome, x, 0.38, z));
  // Glowing base ring
  const baseRing = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.01, 8, 20), neonMat(0xff2d78, 0.3));
  baseRing.rotation.x = Math.PI/2; baseRing.position.set(x, 0.04, z); scene.add(baseRing);
  // Chairs — sleek
  [-0.52, 0.52].forEach(dx => {
    const chairSeat = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.03, 0.28), new THREE.MeshStandardMaterial({color:0x1a2838, roughness:0.4, metalness:0.6}));
    chairSeat.position.set(x+dx, 0.52, z+0.08); scene.add(chairSeat);
    const chairLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.5, 8), M.chrome);
    chairLeg.position.set(x+dx, 0.26, z+0.08); scene.add(chairLeg);
    const chairBack = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.32, 0.02), new THREE.MeshStandardMaterial({color:0x1a2838, roughness:0.4, metalness:0.6}));
    chairBack.position.set(x+dx, 0.7, z-0.07); scene.add(chairBack);
  });
  // Holographic table number
  const num = labelMesh(x < 0 ? '01' : '02', 0.18, 0.14, {font:'bold 72px Orbitron,monospace', color:'#00e8ff', glow:'#00ccff', w:256, h:200, blur:8, passes:2});
  num.position.set(x, 0.9, z); scene.add(num);
  // Ambient candle glow
  const cLight = new THREE.PointLight(0xffcc44, 0.8, 3);
  cLight.position.set(x, 0.88, z); scene.add(cLight);
}
cafeTable(-2.8, 2.6);
cafeTable(2.8, 2.6);

// ── Neon puddle reflections on ground ──
const puddleMat = new THREE.MeshBasicMaterial({color:0x00aacc, transparent:true, opacity:0.06, blending:THREE.AdditiveBlending, depthWrite:false});
[[-1.8, 3.5], [2.2, 4.0], [-3.5, 4.5], [0.5, 3.0]].forEach(([x, z]) => {
  const puddle = new THREE.Mesh(new THREE.CircleGeometry(0.4+Math.random()*0.3, 16), puddleMat);
  puddle.rotation.x = -Math.PI/2; puddle.position.set(x, 0.02, z);
  scene.add(puddle);
});

// Pavement light pools
[-1.5, 1.5].forEach(x => {
  const pl = new THREE.PointLight(0xffcc88, 2.0, 6); pl.position.set(x, 0.3, 2.0); scene.add(pl);
});

// ── Entrance planters — modern concrete with neon strip ──
[-2.2, 2.2].forEach(x => {
  const pot = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.6, 0.55), new THREE.MeshStandardMaterial({color:0x222830, roughness:0.75, metalness:0.15}));
  pot.position.set(x, 0.3, 1.3); scene.add(pot);
  // Glowing rim
  const rim = new THREE.Mesh(new THREE.BoxGeometry(0.57, 0.02, 0.57), neonMat(0x00cccc, 0.28));
  rim.position.set(x, 0.61, 1.3); scene.add(rim);
  // Plant — layered
  const bush = new THREE.Mesh(new THREE.SphereGeometry(0.25, 12, 12), new THREE.MeshStandardMaterial({color:0x1e5a30, emissive:0x0a2810, emissiveIntensity:0.2, roughness:0.88}));
  bush.position.set(x, 0.78, 1.3); bush.scale.set(1.1, 1.4, 1.1); scene.add(bush);
  const innerLeaf = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 10), new THREE.MeshStandardMaterial({color:0x3a8a4a, roughness:0.85}));
  innerLeaf.position.set(x, 0.92, 1.3); scene.add(innerLeaf);
});

// ── Bollards — illuminated ──
[-3.8, -2.8, 2.8, 3.8].forEach((x, i) => {
  const bollard = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.72, 14), new THREE.MeshStandardMaterial({color:0x7d86a0, roughness:0.2, metalness:0.92}));
  bollard.position.set(x, 0.36, 4.0); scene.add(bollard);
  const bollardCap = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 12), neonMat(i%2===0 ? 0x00cccc : 0xff2d78, 0.55));
  bollardCap.position.set(x, 0.73, 4.0); scene.add(bollardCap);
});

// ── Vertical Neon Billboards — Japanese city style ──
const neonBoards = [];
function neonBillboard(x, z, ry, lines, col, colHex) {
  const g = new THREE.Group();
  // Tall narrow backplate
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.7, 3.4, 0.06), new THREE.MeshStandardMaterial({color:0x08090e, roughness:0.5, metalness:0.6}));
  g.add(plate);
  // Outer neon border frame
  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.76, 3.46, 0.01), neonMat(colHex, 0.25));
  frame.position.z = 0.035; g.add(frame);
  // Inner neon border (double border look)
  const innerFrame = new THREE.Mesh(new THREE.BoxGeometry(0.6, 3.2, 0.01), neonMat(colHex, 0.12));
  innerFrame.position.z = 0.036; g.add(innerFrame);
  // Pole mount
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.2, 8), sm(0x3a4250, 0.4, 0.7));
  pole.position.set(0.36, -0.8, -0.04); g.add(pole);
  // Vertical text labels
  const textMesh = panelTextMesh(lines, 0.55, 2.8, {font:'bold 48px Share Tech Mono,monospace', color:col, glow:col, w:380, h:1400, blur:10, lineGap:1.05});
  textMesh.position.z = 0.04; g.add(textMesh);
  // Top accent light
  const topNeon = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.04, 0.03), neonMat(colHex, 0.7));
  topNeon.position.y = 1.72; topNeon.position.z = 0.02; g.add(topNeon);
  // Bottom accent light
  const botNeon = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.04, 0.03), neonMat(colHex, 0.7));
  botNeon.position.y = -1.72; botNeon.position.z = 0.02; g.add(botNeon);
  // Side accent strips
  [-0.36, 0.36].forEach(sx => {
    const side = new THREE.Mesh(new THREE.BoxGeometry(0.02, 3.3, 0.03), neonMat(colHex, 0.35));
    side.position.set(sx, 0, 0.02); g.add(side);
  });
  // Point light for glow spill
  const pl = new THREE.PointLight(colHex, 2.5, 7);
  pl.position.set(0, 0, 0.8); g.add(pl);
  g.position.set(x, 2.5, z);
  g.rotation.y = ry;
  scene.add(g);
  neonBoards.push({ group:g, frame, innerFrame, textMesh, topNeon, botNeon, pl });
}
neonBillboard(-5.8, 2.8, 0.3,
  ['エ','ス','プ','レ','ッ','ソ','','B','A','R'],
  '#00e8ff', 0x00e8ff);
neonBillboard(5.8, 2.8, -0.3,
  ['O','P','E','N','','2','4','/','7'],
  '#ff4090', 0xff4090);

// ── Bike rack (modern) ──
const rackMat = new THREE.MeshStandardMaterial({color:0x6a7088, roughness:0.25, metalness:0.9});
[-6.3, -5.8].forEach(x => {
  const loop = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.018, 10, 20, Math.PI), rackMat);
  loop.rotation.x = Math.PI/2; loop.position.set(x, 0.34, 4.5); scene.add(loop);
});
// Bike
const bikeFrame = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.55, 8), new THREE.MeshStandardMaterial({color:0x44505e, roughness:0.35, metalness:0.8}));
bikeFrame.rotation.z = Math.PI/2.5; bikeFrame.position.set(-6.05, 0.48, 4.42); scene.add(bikeFrame);
const bikeWheelMat = sm(0x1a1d27, 0.6, 0.2);
[-6.35, -5.85].forEach(x => {
  const wh = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.014, 10, 22), bikeWheelMat);
  wh.rotation.y = Math.PI/2; wh.position.set(x, 0.32, 4.42); scene.add(wh);
});

// ── Lamp posts — cyberpunk style ──
function lampPost(x, z) {
  // Pole
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 5.0, 10), sm(0x3a4250, 0.45, 0.7));
  pole.position.set(x, 2.5, z); scene.add(pole);
  // Arm
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.2, 8), sm(0x3a4250, 0.45, 0.7));
  arm.rotation.z = Math.PI/2; arm.position.set(x+(x<0?0.6:-0.6), 4.95, z); scene.add(arm);
  // Light housing
  const housing = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.1, 0.2), sm(0x2a3040, 0.4, 0.55));
  housing.position.set(x+(x<0?1.2:-1.2), 4.9, z); scene.add(housing);
  // Glow panel
  const glowPanel = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.15), neonMat(0xffeedd, 0.6));
  glowPanel.rotation.x = Math.PI/2; glowPanel.position.set(x+(x<0?1.2:-1.2), 4.84, z); scene.add(glowPanel);
  const lp = new THREE.PointLight(0xffd4a0, 4.0, 16);
  lp.position.set(x+(x<0?1.2:-1.2), 4.8, z); scene.add(lp);
  // Neon ring on pole
  const poleRing = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.008, 8, 16), neonMat(0x00cccc, 0.4));
  poleRing.rotation.x = Math.PI/2; poleRing.position.set(x, 3.2, z); scene.add(poleRing);
}
lampPost(-7.0, 2.2);
lampPost(7.0, 2.2);

// ── Floating holographic logo above entrance ──
const holoLogo = labelMesh('⬡ नियोन ब्रू', 2.2, 0.5, {font:'bold 72px sans-serif', color:'#00ffdd', glow:'#00ccaa', w:1024, h:200, blur:12, passes:2});
holoLogo.position.set(0, BH+1.0, 1.5); scene.add(holoLogo);
const holoGlow = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.55), new THREE.MeshBasicMaterial({color:0x00eebb, transparent:true, opacity:0.04, blending:THREE.AdditiveBlending, depthWrite:false}));
holoGlow.position.set(0, BH+1.0, 1.48); scene.add(holoGlow);

// ── Neighbor facades — taller, more detailed ──
function addNeighborFacade(x, side) {
  const dir = x < 0 ? 1 : -1;
  const facadeW = 3.0, facadeH = 7.5, facadeD = 5.0;
  const shell = new THREE.Mesh(new THREE.BoxGeometry(facadeW, facadeH, facadeD), new THREE.MeshStandardMaterial({color: side === 'left' ? 0x262e3e : 0x2c3244, roughness:0.88}));
  shell.position.set(x, facadeH/2, -1.5); scene.add(shell);
  // Roller shutter
  const roller = new THREE.Mesh(new THREE.BoxGeometry(2.0, 2.8, 0.06), new THREE.MeshStandardMaterial({color:0x3a4054, roughness:0.78, metalness:0.3}));
  roller.position.set(x+dir*1.52, 1.6, 0.7); roller.rotation.y = dir*Math.PI/2; scene.add(roller);
  // Window with faint warm glow
  const win = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.5), new THREE.MeshBasicMaterial({color:0xffd59a, transparent:true, opacity:0.45}));
  win.position.set(x+dir*1.54, 4.0, -1.0); win.rotation.y = dir*Math.PI/2; scene.add(win);
  // Upper window
  const win2 = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.8), new THREE.MeshBasicMaterial({color:0xccddff, transparent:true, opacity:0.2}));
  win2.position.set(x+dir*1.54, 5.8, -0.5); win2.rotation.y = dir*Math.PI/2; scene.add(win2);
  // Neon sign
  const signTxt = side === 'left' ? 'ROASTERY' : 'भुनाई';
  const signCol = side === 'left' ? '#00d0ff' : '#ff7a55';
  const sideSign = labelMesh(signTxt, 1.8, 0.5, {font: side === 'right' ? 'bold 60px sans-serif' : 'bold 60px Orbitron,monospace', color:signCol, glow:signCol, w:1024, h:200, blur:10, passes:2});
  sideSign.position.set(x+dir*1.56, 5.5, -0.2); sideSign.rotation.y = dir*Math.PI/2; scene.add(sideSign);
  // AC unit on roof
  const ac = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.3, 0.5), sm(0x3a3e48, 0.7, 0.4));
  ac.position.set(x-dir*0.5, facadeH+0.15, -1.0); scene.add(ac);
  // Side pipes/conduit
  const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, facadeH-1, 8), sm(0x4a505e, 0.5, 0.6));
  pipe.position.set(x+dir*1.48, facadeH/2, 0.0); scene.add(pipe);
  // Neon accent strip
  const accentStrip = new THREE.Mesh(new THREE.BoxGeometry(0.02, facadeH*0.4, 0.02), neonMat(side==='left'?0x00ccff:0xff6644, 0.35));
  accentStrip.position.set(x+dir*1.55, facadeH*0.6, -2.0); scene.add(accentStrip);
}
addNeighborFacade(-7.8, 'left');
addNeighborFacade(7.8, 'right');

// ── Vending machine (right side) ──
const vendBody = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.5, 0.5), new THREE.MeshStandardMaterial({color:0x181e28, roughness:0.5, metalness:0.6}));
vendBody.position.set(4.5, 0.75, 1.8); scene.add(vendBody);
const vendScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.7), new THREE.MeshBasicMaterial({color:0x001a33, transparent:true, opacity:0.8}));
vendScreen.position.set(4.5, 0.95, 2.06); scene.add(vendScreen);
const vendLabel = labelMesh('SYNTH\nDRINKS', 0.38, 0.4, {font:'bold 52px Orbitron,monospace', color:'#ff4090', glow:'#ff2d78', w:512, h:512, blur:8, passes:2});
vendLabel.position.set(4.5, 0.95, 2.07); scene.add(vendLabel);
const vendSlot = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.04, 0.06), neonMat(0x39ff14, 0.5));
vendSlot.position.set(4.5, 0.35, 2.06); scene.add(vendSlot);
const vendLight = new THREE.PointLight(0xff2d78, 1.5, 4);
vendLight.position.set(4.5, 1.2, 2.3); scene.add(vendLight);

// ── Manhole cover ──
const manhole = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.02, 20), sm(0x3a3e48, 0.7, 0.5));
manhole.position.set(1.5, 0.01, 5.5); scene.add(manhole);
const manholeGlow = new THREE.Mesh(new THREE.RingGeometry(0.22, 0.28, 20), neonMat(0x00cccc, 0.12));
manholeGlow.rotation.x = -Math.PI/2; manholeGlow.position.set(1.5, 0.025, 5.5); scene.add(manholeGlow);

// ── Fire hydrant ──
const hydrant = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.55, 12), sm(0xcc3333, 0.7, 0.2));
hydrant.position.set(5.6, 0.28, 3.8); scene.add(hydrant);
const hydrantCap = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 10), sm(0xcc3333, 0.7, 0.2));
hydrantCap.position.set(5.6, 0.56, 3.8); scene.add(hydrantCap);

// ════════════════════════════════════════════════════════════
// LIGHTING
// ════════════════════════════════════════════════════════════
scene.add(new THREE.AmbientLight(0x7088aa, 5.5));
scene.add(new THREE.HemisphereLight(0x8fbcff, 0x2a3344, 2.2));

const moon = new THREE.DirectionalLight(0x8fb1ff, 2.9);
moon.position.set(-10, 16, 6); moon.castShadow = !isMobile; scene.add(moon);

const frontFill = new THREE.SpotLight(0x88d3ff, 2.0, 24, Math.PI*0.32, 0.5, 1.6);
frontFill.position.set(0, 6.5, 8.5);
frontFill.target.position.set(0, 2.3, -0.6);
scene.add(frontFill); scene.add(frontFill.target);

const intA = new THREE.PointLight(0xffaa55, 8.5, 14); intA.position.set(-2, 2.8, -2); scene.add(intA);
const intB = new THREE.PointLight(0xffaa55, 8.5, 14); intB.position.set(2, 2.8, -2); scene.add(intB);
const intC = new THREE.PointLight(0xff8833, 5.5, 12); intC.position.set(0, 1.8, -3); scene.add(intC);
const intD = new THREE.PointLight(0xffeedd, 4.0, 10); intD.position.set(0, 5.0, -3); scene.add(intD);

if (!isMobile) {
  const intWindowFillL = new THREE.SpotLight(0xffd8a6, 8, 10, Math.PI*0.35, 0.5, 1.2);
  intWindowFillL.position.set(-2, 3.2, -0.3); intWindowFillL.target.position.set(-1.5, 0.5, -3);
  scene.add(intWindowFillL); scene.add(intWindowFillL.target);
  const intWindowFillR = new THREE.SpotLight(0xffd8a6, 8, 10, Math.PI*0.35, 0.5, 1.2);
  intWindowFillR.position.set(2, 3.2, -0.3); intWindowFillR.target.position.set(1.5, 0.5, -3);
  scene.add(intWindowFillR); scene.add(intWindowFillR.target);
}

const barTaskLight = new THREE.SpotLight(0xfff1d2, 5.0, 11, Math.PI*0.22, 0.45, 1.4);
barTaskLight.position.set(-0.5, 5.2, -2);
barTaskLight.target.position.set(-0.5, 0.9, -2.8);
scene.add(barTaskLight); scene.add(barTaskLight.target);

const cyanL = new THREE.PointLight(0x00fff5, 3.0, 12); cyanL.position.set(0, signBandMid, 1.2); scene.add(cyanL);
const magL = new THREE.PointLight(0xff2d78, 2.5, 10); magL.position.set(0, canopyY+0.3, 1.5); scene.add(magL);
const awnL = new THREE.PointLight(0xff2d78, 2.5, 9); awnL.position.set(0, canopyY-0.5, canopyD+0.5); scene.add(awnL);

if (!isMobile) {
  const frontageLift = new THREE.SpotLight(0x62b4ff, 6, 12, Math.PI*0.4, 0.45, 1.0);
  frontageLift.position.set(0, 4.5, 2.5); frontageLift.target.position.set(0, 1.5, -1.5);
  scene.add(frontageLift); scene.add(frontageLift.target);
}

// ════════════════════════════════════════════════════════════
// RAIN
// ════════════════════════════════════════════════════════════
const DROPS = isMobile ? 1200 : 3400;
const rp = new Float32Array(DROPS * 6), rv = new Float32Array(DROPS);
for (let i = 0; i < DROPS; i++) {
  const x = (Math.random()-.5)*32, z = (Math.random()-.5)*24, y = Math.random()*24;
  const i6 = i*6;
  rp[i6]=x; rp[i6+1]=y; rp[i6+2]=z; rp[i6+3]=x; rp[i6+4]=y-.26; rp[i6+5]=z;
  rv[i] = 7 + Math.random()*5;
}
const rainGeo = new THREE.BufferGeometry();
rainGeo.setAttribute('position', new THREE.BufferAttribute(rp, 3));
scene.add(new THREE.LineSegments(rainGeo, new THREE.LineBasicMaterial({color:0x99ccff, transparent:true, opacity:0.22, blending:THREE.AdditiveBlending, depthWrite:false})));
const rainAttr = rainGeo.attributes.position;

// Walk collision volumes
const walkObstacles = [
  new THREE.Box3(new THREE.Vector3(-3.1, 0, -3.7), new THREE.Vector3(1.2, 2, -2.7)),
  new THREE.Box3(new THREE.Vector3(-3.3, 0, -3.3), new THREE.Vector3(-2.3, 2, -1.2)),
  new THREE.Box3(new THREE.Vector3(0.8, 0, -3.6), new THREE.Vector3(2.4, 1.5, -2.8)),
  new THREE.Box3(new THREE.Vector3(3.3, 0, -2.5), new THREE.Vector3(4.8, 1.2, -1.1)),
  new THREE.Box3(new THREE.Vector3(3.3, 0, -4.5), new THREE.Vector3(4.8, 1.2, -3.1)),
  new THREE.Box3(new THREE.Vector3(-4.8, 0, -3.5), new THREE.Vector3(-3.8, 1.2, 0.2)),
];
const doorAnim = { open: 0.0 };

// ════════════════════════════════════════════════════════════
// INTRO ANIMATION
// ════════════════════════════════════════════════════════════
camera.position.set(0, 5.0, 18); camera.lookAt(0, 3.5, 0);
cafe.position.y = -3; cafe.scale.setScalar(0.92);
controls.enabled = false; // disable during intro to prevent GSAP fight

function hideLoader() {
  const el = document.getElementById('loader');
  if (!el) return;
  el.style.transition = 'opacity 0.6s ease';
  el.style.opacity = '0';
  el.style.pointerEvents = 'none';
  setTimeout(() => { el.style.display = 'none'; }, 700);
}

let prog = 0;
const lt = setInterval(() => {
  prog = Math.min(prog + Math.random()*16 + 5, 100);
  if (window.setLoaderProgress) window.setLoaderProgress(prog);
  if (prog >= 100) { clearInterval(lt); setTimeout(hideLoader, 300); }
}, 100);

setTimeout(() => {
  gsap.to(camera.position, {x:0, y:3.8, z: isMobile ? 14 : 12, duration:2.5, ease:'power3.out'});
  gsap.to(controls.target, {x:0, y:2.8, z:0, duration:2.5, ease:'power3.out',
    onUpdate: () => controls.update(),
    onComplete: () => { controls.enabled = true; }
  });
  gsap.to(cafe.position, {y:0, duration:2.0, delay:0.2, ease:'power3.out'});
  gsap.to(cafe.scale, {x:1, y:1, z:1, duration:2.0, delay:0.2, ease:'power3.out'});
}, 900);

// ════════════════════════════════════════════════════════════
// ANIMATE
// ════════════════════════════════════════════════════════════
function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta(), elapsed = clock.getElapsedTime();

  skySphere.material.uniforms.uTime.value = elapsed;
  streetMat.uniforms.uTime.value = elapsed;
  grainPass.uniforms.uTime.value = elapsed;

  // Rain
  for (let i = 0; i < DROPS; i++) {
    const i6 = i*6;
    rainAttr.array[i6+1] -= rv[i]*delta;
    rainAttr.array[i6+4] -= rv[i]*delta;
    if (rainAttr.array[i6+1] < -1) {
      const nx = (Math.random()-.5)*32, nz = (Math.random()-.5)*24, ny = 22+Math.random()*4;
      rainAttr.array[i6]=nx; rainAttr.array[i6+1]=ny; rainAttr.array[i6+2]=nz;
      rainAttr.array[i6+3]=nx; rainAttr.array[i6+4]=ny-.26; rainAttr.array[i6+5]=nz;
    }
  }
  rainAttr.needsUpdate = true;

  // Steam
  for (let i = 0; i < steamCount; i++) {
    const i3 = i*3;
    steamAttr.array[i3+1] += steamVel[i]*delta;
    steamAttr.array[i3] += Math.sin(elapsed*0.5+i)*0.003;
    if (steamAttr.array[i3+1] > BH+3.0) {
      steamAttr.array[i3] = (Math.random()-0.5)*1.5 - 3;
      steamAttr.array[i3+1] = BH + 0.5;
      steamAttr.array[i3+2] = -2 + (Math.random()-0.5)*0.5;
    }
  }
  steamAttr.needsUpdate = true;

  // Neon flicker
  const fl = 1 + 0.06*Math.sin(elapsed*8.4)*Math.sin(elapsed*3.2);
  cyanL.intensity = 3.0*fl;
  magL.intensity = 2.5*(1 + 0.08*Math.sin(elapsed*5.1));
  intA.intensity = 9.5 + Math.sin(elapsed*1.8)*0.75;
  intB.intensity = 9.5 + Math.sin(elapsed*2.2+1)*0.75;
  intC.intensity = 6.0 + Math.sin(elapsed*1.3+0.5)*0.4;
  intD.intensity = 4.5 + Math.sin(elapsed*0.9)*0.25;

  // Interior equalizer bars
  for (let i = 0; i < interiorBars.length; i++) {
    const bar = interiorBars[i];
    const wave = 0.32 + 0.24*Math.sin(elapsed*2.1 + i*0.7);
    bar.material.opacity = wave;
    bar.scale.y = 0.85 + 0.35*(0.5 + 0.5*Math.sin(elapsed*1.8 + i));
    bar.position.y = 2.0 + 0.06*Math.sin(elapsed*1.8 + i*0.9);
  }
  ucNeonPink.material.opacity = 0.18 + 0.2*(0.5 + 0.5*Math.sin(elapsed*3.2));

  // Exterior animations
  groundStrips.forEach((s, i) => { s.material.opacity = 0.25 + 0.15*Math.sin(elapsed*2.0 + i*1.6); });
  holoLogo.position.y = BH + 1.0 + Math.sin(elapsed*1.2)*0.08;
  holoLogo.material.opacity = 0.7 + 0.3*Math.sin(elapsed*0.8);
  kioskHolo.rotation.y = elapsed*0.5;
  kioskHolo.material.opacity = 0.15 + 0.1*Math.sin(elapsed*1.5);

  // Neon billboard blink — Japanese city flicker
  neonBoards.forEach((b, idx) => {
    const flk = 0.6 + 0.4*Math.sin(elapsed*3.5 + idx*2.1)*Math.sin(elapsed*1.8 + idx);
    b.frame.material.opacity = 0.18 + 0.12*flk;
    b.innerFrame.material.opacity = 0.08 + 0.06*flk;
    b.topNeon.material.opacity = 0.5 + 0.3*flk;
    b.botNeon.material.opacity = 0.5 + 0.3*flk;
    b.pl.intensity = 1.5 + 1.2*flk;
    // Random harsh flicker every few seconds
    const harsh = Math.sin(elapsed*12.5 + idx*7.3) > 0.92 ? 0.15 : 1.0;
    b.textMesh.material.opacity = harsh;
  });

  // Hindi sign flicker
  hindiLbl.material.opacity = 0.85 + 0.15*Math.sin(elapsed*2.5);
  hindiSub.material.opacity = 0.7 + 0.3*Math.sin(elapsed*1.6 + 0.5);

  // Auto sliding doors
  const ddx = camera.position.x;
  const ddz = camera.position.z - 0.18;
  const nearDoor = Math.hypot(ddx, ddz) < 2.2;
  const doorTarget = nearDoor ? 1.0 : 0.0;
  doorAnim.open += (doorTarget - doorAnim.open) * Math.min(1.0, delta*8.0);
  leftDoor.position.x = -doorW/4 - doorAnim.open*0.45;
  rightDoor.position.x = doorW/4 + doorAnim.open*0.45;
  doorHandleL.position.x = -0.2 - doorAnim.open*0.45;
  doorHandleR.position.x = 0.2 + doorAnim.open*0.45;

  // Walk mode movement
  if (walkState.enabled) {
    const prevPos = camera.position.clone();
    const moveSpeed = walkState.sprint ? walkState.sprintSpeed : walkState.speed;
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0; forward.normalize();
    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0,1,0)).normalize();
    const desired = new THREE.Vector3();

    if (walkState.forward) desired.add(forward);
    if (walkState.backward) desired.sub(forward);
    if (walkState.right) desired.add(right);
    if (walkState.left) desired.sub(right);

    // Mobile joystick
    if (isMobile) {
      if (Math.abs(walkState.joystickY) > 0.15) desired.addScaledVector(forward, walkState.joystickY);
      if (Math.abs(walkState.joystickX) > 0.15) desired.addScaledVector(right, walkState.joystickX);
      if (Math.abs(walkState.lookDeltaX) > 0.001 || Math.abs(walkState.lookDeltaY) > 0.001) {
        const euler = new THREE.Euler(0, 0, 0, 'YXZ');
        euler.setFromQuaternion(camera.quaternion);
        euler.y -= walkState.lookDeltaX;
        euler.x -= walkState.lookDeltaY;
        euler.x = Math.max(-Math.PI/3, Math.min(Math.PI/3, euler.x));
        camera.quaternion.setFromEuler(euler);
        walkState.lookDeltaX = 0;
        walkState.lookDeltaY = 0;
      }
    }

    if (desired.lengthSq() > 0) {
      desired.normalize().multiplyScalar(moveSpeed);
      walkState.velocity.lerp(desired, Math.min(1.0, delta*10.0));
    } else {
      walkState.velocity.multiplyScalar(Math.max(0.0, 1.0 - delta*9.0));
    }
    camera.position.addScaledVector(walkState.velocity, delta);

    camera.position.x = THREE.MathUtils.clamp(camera.position.x, -4.6, 4.6);
    camera.position.z = THREE.MathUtils.clamp(camera.position.z, -5.6, 4.0);
    camera.position.y = 1.72;

    const probe = new THREE.Vector3(camera.position.x, 1.0, camera.position.z);
    for (const obstacle of walkObstacles) {
      if (obstacle.containsPoint(probe)) {
        camera.position.copy(prevPos);
        walkState.velocity.multiplyScalar(0.15);
        break;
      }
    }
  }

  // Orbit-mode WASD panning (camera + target move together)
  if (!walkState.enabled && (orbitPan.forward || orbitPan.backward || orbitPan.left || orbitPan.right)) {
    const panSpeed = 4.5 * delta;
    const camDir = new THREE.Vector3();
    camera.getWorldDirection(camDir);
    camDir.y = 0; camDir.normalize();
    const camRight = new THREE.Vector3().crossVectors(camDir, new THREE.Vector3(0,1,0)).normalize();
    const move = new THREE.Vector3();
    if (orbitPan.forward) move.add(camDir);
    if (orbitPan.backward) move.sub(camDir);
    if (orbitPan.right) move.add(camRight);
    if (orbitPan.left) move.sub(camRight);
    if (move.lengthSq() > 0) {
      move.normalize().multiplyScalar(panSpeed);
      camera.position.add(move);
      controls.target.add(move);
    }
  }

  if (!walkState.enabled) controls.update();
  composer.render();
}
animate();
