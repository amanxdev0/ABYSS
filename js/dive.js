import * as THREE from 'three';

/* ---------------- helpers ---------------- */
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const env = (p, a, b, c, d) => sstep(a, b, p) * (1 - sstep(c, d, p));
const rnd = (a, b) => a + Math.random() * (b - a);
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const isCoarse = matchMedia('(pointer: coarse)').matches;

/* ---------------- dom + renderer ---------------- */
const canvas = document.getElementById('film');
const hudBar = document.getElementById('hudBar');
const hudKnob = document.getElementById('hudKnob');
const hudFps = document.getElementById('hudFps');
const hudZone = document.getElementById('hudZone');
const hudDepth = document.getElementById('hudDepth');

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
} catch (e) {
  document.body.classList.add('no-webgl');
  document.getElementById('nogl').hidden = false;
  document.querySelectorAll('.chapter').forEach((el) => el.classList.add('is-active'));
  throw e;
}
const PR_CAP = isCoarse ? 1.75 : 2;
let pixelRatio = Math.min(devicePixelRatio || 1, PR_CAP);
renderer.setPixelRatio(pixelRatio);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x6fc7e3);
scene.fog = new THREE.Fog(0x6fc7e3, 260, 1000);
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 4000);

/* soft radial glow texture */
function glowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.35, 'rgba(255,255,255,0.45)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const glowTex = glowTexture();

/* ---------------- marine snow (everywhere, always) ---------------- */
const snowGroup = new THREE.Group();
{
  const N = isCoarse ? 600 : 1100;
  const pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    pos[i * 3] = rnd(-120, 120);
    pos[i * 3 + 1] = rnd(-950, 40);
    pos[i * 3 + 2] = rnd(-120, 120);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  snowGroup.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xcfe6f2, size: 1.4, transparent: true, opacity: 0.55, depthWrite: false })));
}
scene.add(snowGroup);

/* ---------------- god rays (surface only) ---------------- */
const rayGroup = new THREE.Group();
const rayMats = [];
for (let i = 0; i < 5; i++) {
  const mt = new THREE.MeshBasicMaterial({ map: glowTex, color: 0xbfeaff, transparent: true, opacity: 0.10, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  mt.userData.base = 0.10;
  rayMats.push(mt);
  const pl = new THREE.Mesh(new THREE.PlaneGeometry(26, 130), mt);
  pl.position.set(-50 + i * 26 + rnd(-6, 6), -45, rnd(-30, 10));
  pl.rotation.z = 0.22 + rnd(-0.06, 0.06);
  rayGroup.add(pl);
}
scene.add(rayGroup);

/* ---------------- fish schools ---------------- */
function makeSchool(n, color, size, cx, cy, cz, rx, ry, rz) {
  const g = new THREE.Group();
  const geo = new THREE.ConeGeometry(size, size * 3.2, 6);
  geo.rotateZ(-Math.PI / 2);
  geo.scale(1, 0.55, 0.4);
  const inst = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ color }), n);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), eu = new THREE.Euler(), sv = new THREE.Vector3(1, 1, 1), pv = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    pv.set(rnd(-rx, rx), rnd(-ry, ry), rnd(-rz, rz));
    eu.set(0, rnd(0, Math.PI * 2), 0);
    q.setFromEuler(eu);
    const s = rnd(0.7, 1.3); sv.set(s, s, s);
    m.compose(pv, q, sv);
    inst.setMatrixAt(i, m);
  }
  inst.instanceMatrix.needsUpdate = true;
  g.add(inst);
  g.position.set(cx, cy, cz);
  scene.add(g);
  return g;
}
const school1 = makeSchool(isCoarse ? 50 : 90, 0x0e2a38, 0.55, 0, -18, 0, 26, 6, 14);
const school2 = makeSchool(isCoarse ? 40 : 70, 0x0a1e2c, 0.5, -10, -70, -10, 22, 5, 12);

/* ---------------- jellyfish ---------------- */
const jellies = [];
const jellyMats = [];
function makeJelly(x, y, z, r, color, phase) {
  const g = new THREE.Group();
  const bellMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5 });
  bellMat.userData.base = 0.5; jellyMats.push(bellMat);
  const bell = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), bellMat);
  g.add(bell);
  const tMat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.45 });
  tMat.userData.base = 0.45; jellyMats.push(tMat);
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const tg = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(Math.cos(a) * r * 0.7, 0, Math.sin(a) * r * 0.7),
      new THREE.Vector3(Math.cos(a) * r * 0.9, -r * 1.2, Math.sin(a) * r * 0.9),
      new THREE.Vector3(Math.cos(a) * r * 0.6, -r * 2.2, Math.sin(a) * r * 0.6),
    ]);
    g.add(new THREE.Line(tg, tMat));
  }
  g.position.set(x, y, z);
  scene.add(g);
  jellies.push({ g, bell, phase, baseY: y });
}
makeJelly(-30, -55, -20, 2.2, 0xff9fd4, 0);
makeJelly(25, -115, 10, 1.7, 0xb49fff, 2.1);
makeJelly(-15, -165, -30, 2.6, 0xff9fd4, 4.2);
makeJelly(40, -85, 30, 1.4, 0x9fe8ff, 1.2);

/* ---------------- anglerfish ---------------- */
const anglers = [];
function makeAngler(x, y, z, s, phase) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(1.5, 18, 14), new THREE.MeshBasicMaterial({ color: 0x05060c }));
  body.scale.set(1.5, 1.05, 0.9);
  g.add(body);
  const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.6, 6), new THREE.MeshBasicMaterial({ color: 0x05060c }));
  stalk.position.set(1.6, 1.0, 0); stalk.rotation.z = -0.7;
  g.add(stalk);
  const lureMat = new THREE.SpriteMaterial({ map: glowTex, color: 0x54f0ff, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false });
  const lure = new THREE.Sprite(lureMat);
  lure.scale.set(1.6, 1.6, 1);
  lure.position.set(2.3, 1.7, 0);
  g.add(lure);
  g.scale.set(s, s, s);
  g.position.set(x, y, z);
  g.rotation.y = Math.PI;
  scene.add(g);
  anglers.push({ g, lureMat, phase, baseY: y });
}
makeAngler(18, -230, -12, 1.4, 0);
makeAngler(-35, -285, 20, 1.0, 2.4);

/* ---------------- abyssal vent field ---------------- */
const ventGroup = new THREE.Group();
const ventMats = [];
let smokerPts, smokerBase, smokerSpeed;
{
  const floor = new THREE.Mesh(new THREE.CircleGeometry(400, 40), new THREE.MeshBasicMaterial({ color: 0x0a0e14 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -445;
  ventGroup.add(floor);
  const coneMat = new THREE.MeshBasicMaterial({ color: 0x141a24, transparent: true, opacity: 1 });
  coneMat.userData.base = 1; ventMats.push(coneMat);
  const cone = new THREE.Mesh(new THREE.ConeGeometry(7, 26, 10), coneMat);
  cone.position.set(30, -432, -20);
  ventGroup.add(cone);
  const glowMat = new THREE.SpriteMaterial({ map: glowTex, color: 0xff5a2a, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false });
  glowMat.userData.base = 0.8; ventMats.push(glowMat);
  const glow = new THREE.Sprite(glowMat);
  glow.scale.set(22, 22, 1);
  glow.position.set(30, -436, -20);
  ventGroup.add(glow);
  ventGroup.userData.glow = glow;
  /* tube worms */
  const wormMat = new THREE.MeshBasicMaterial({ color: 0xd8cfc0, transparent: true, opacity: 1 });
  wormMat.userData.base = 1; ventMats.push(wormMat);
  for (let i = 0; i < 9; i++) {
    const w = new THREE.Mesh(new THREE.ConeGeometry(0.35, rnd(2, 4.5), 6), wormMat);
    w.position.set(30 + rnd(-9, 9), -443, -20 + rnd(-9, 9));
    ventGroup.add(w);
  }
  /* black smoker particles */
  const N = 130;
  smokerBase = new Float32Array(N * 3); smokerSpeed = new Float32Array(N);
  const pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    smokerBase[i * 3] = 30 + rnd(-2, 2);
    smokerBase[i * 3 + 1] = rnd(-420, -360);
    smokerBase[i * 3 + 2] = -20 + rnd(-2, 2);
    smokerSpeed[i] = rnd(6, 14);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const smokerMat = new THREE.PointsMaterial({ color: 0x8a8f99, size: 2.6, transparent: true, opacity: 0.5, depthWrite: false });
  smokerMat.userData.base = 0.5; ventMats.push(smokerMat);
  smokerPts = new THREE.Points(g, smokerMat);
  ventGroup.add(smokerPts);
}
scene.add(ventGroup);

/* ---------------- trench walls ---------------- */
const trenchGroup = new THREE.Group();
const trenchMats = [];
{
  const wallMat = new THREE.MeshBasicMaterial({ color: 0x070b12, transparent: true, opacity: 1 });
  wallMat.userData.base = 1; trenchMats.push(wallMat);
  const left = new THREE.Mesh(new THREE.BoxGeometry(420, 420, 160), wallMat);
  left.position.set(-235, -770, -30); left.rotation.z = 0.42;
  const right = new THREE.Mesh(new THREE.BoxGeometry(420, 420, 160), wallMat);
  right.position.set(235, -770, -30); right.rotation.z = -0.42;
  trenchGroup.add(left, right);
  const rockGeo = new THREE.DodecahedronGeometry(1, 0);
  for (let i = 0; i < 26; i++) {
    const rk = new THREE.Mesh(rockGeo, wallMat);
    const s = rnd(1.5, 6);
    rk.scale.set(s, s * 0.7, s);
    rk.position.set(rnd(-70, 70), rnd(-930, -880), rnd(-50, 30));
    rk.rotation.set(rnd(0, 3), rnd(0, 3), rnd(0, 3));
    trenchGroup.add(rk);
  }
}
scene.add(trenchGroup);

/* ---------------- submersible (Challenger Deep) ---------------- */
const subGroup = new THREE.Group();
const subMats = [];
{
  const hullMat = new THREE.MeshBasicMaterial({ color: 0xd8b13a, transparent: true, opacity: 1 });
  hullMat.userData.base = 1; subMats.push(hullMat);
  const hull = new THREE.Mesh(new THREE.SphereGeometry(2.2, 20, 14), hullMat);
  hull.scale.set(1.8, 1, 1);
  subGroup.add(hull);
  const viewMat = new THREE.MeshBasicMaterial({ color: 0x0a1420, transparent: true, opacity: 1 });
  viewMat.userData.base = 1; subMats.push(viewMat);
  const view = new THREE.Mesh(new THREE.SphereGeometry(0.8, 14, 10), viewMat);
  view.position.set(3.4, 0.3, 0);
  subGroup.add(view);
  const beamMat = new THREE.MeshBasicMaterial({ map: glowTex, color: 0xfff2c4, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  beamMat.userData.base = 0.35; subMats.push(beamMat);
  const beam = new THREE.Mesh(new THREE.ConeGeometry(6, 34, 16, 1, true), beamMat);
  beam.rotation.z = Math.PI / 2 + 0.35;
  beam.position.set(16, -6, 0);
  subGroup.add(beam);
  const lampMat = new THREE.SpriteMaterial({ map: glowTex, color: 0xfff6d8, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
  lampMat.userData.base = 0.9; subMats.push(lampMat);
  const lamp = new THREE.Sprite(lampMat);
  lamp.scale.set(5, 5, 1);
  lamp.position.set(3.8, 0.3, 0);
  subGroup.add(lamp);
  subGroup.position.set(20, -880, 10);
}
scene.add(subGroup);

/* ---------------- bioluminescence ---------------- */
let biolumMat;
{
  const N = isCoarse ? 200 : 350;
  const pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    pos[i * 3] = rnd(-110, 110);
    pos[i * 3 + 1] = rnd(-900, -150);
    pos[i * 3 + 2] = rnd(-110, 110);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  biolumMat = new THREE.PointsMaterial({ color: 0x54f0ff, size: 2.0, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false });
  scene.add(new THREE.Points(g, biolumMat));
}

/* ---------------- camera journey ----------------
   Stop positions are measured from the real page layout (see measureChapters),
   so the camera always frames exactly the chapter whose text is on screen. */
const stops = [];
const STOP_DEFS = [
  { ch: 0, at: 0.5, name: 'ABYSS', depth: 0, pos: [0, 26, 90], look: [0, -30, 0] },
  { ch: 1, at: 0.5, name: 'THE SURFACE', depth: 0, pos: [0, 6, 70], look: [0, -25, 0] },
  { ch: 2, at: 0.5, name: 'SUNLIGHT ZONE', depth: 120, pos: [-30, -2, 60], look: [10, -18, 0] },
  { ch: 3, at: 0.5, name: 'TWILIGHT ZONE', depth: 650, pos: [25, -48, 55], look: [-10, -58, 0] },
  { ch: 4, at: 0.5, name: 'MIDNIGHT ZONE', depth: 2400, pos: [-20, -195, 48], look: [15, -210, 0] },
  { ch: 5, at: 0.5, name: 'THE ABYSS', depth: 5000, pos: [40, -410, 60], look: [25, -430, -10] },
  { ch: 6, at: 0.35, name: 'THE TRENCH', depth: 7500, pos: [60, -615, 70], look: [0, -640, 0] },
  { ch: 6, at: 0.75, name: 'CHALLENGER DEEP', depth: 10911, pos: [45, -895, 55], look: [10, -915, 0] },
  { ch: 7, at: 0.4, name: 'THE FULL COLUMN', depth: 5000, pos: [260, -450, 320], look: [0, -450, 0] },
  { ch: 7, at: 0.85, name: 'THE FULL COLUMN', depth: 5000, pos: [300, -430, 360], look: [0, -450, 0] },
];
function buildStops() {
  stops.length = 0;
  for (const d of STOP_DEFS) {
    const ch = chapters[d.ch] || chapters[chapters.length - 1];
    stops.push({ p: ch.from + (ch.to - ch.from) * d.at, name: d.name, depth: d.depth, pos: d.pos, look: d.look });
  }
  stops.sort((a, b) => a.p - b.p);
}

const COL_KEYS = [
  { p: 0.00, c: new THREE.Color(0x6fc7e3) },
  { p: 0.18, c: new THREE.Color(0x2b8fb8) },
  { p: 0.35, c: new THREE.Color(0x0e5b85) },
  { p: 0.52, c: new THREE.Color(0x083a5c) },
  { p: 0.68, c: new THREE.Color(0x041f38) },
  { p: 0.82, c: new THREE.Color(0x020d1c) },
  { p: 1.00, c: new THREE.Color(0x000409) },
];
const _pos = new THREE.Vector3(), _look = new THREE.Vector3(), _c = new THREE.Color();
const _sv = new THREE.Vector3();

function render(p, t) {
  let i = 0;
  while (i < stops.length - 2 && p > stops[i + 1].p) i++;
  const A = stops[i], B = stops[i + 1], tt = sstep(A.p, B.p, p);
  _pos.set(lerp(A.pos[0], B.pos[0], tt), lerp(A.pos[1], B.pos[1], tt), lerp(A.pos[2], B.pos[2], tt));
  _look.set(lerp(A.look[0], B.look[0], tt), lerp(A.look[1], B.look[1], tt), lerp(A.look[2], B.look[2], tt));
  camera.position.copy(_pos);
  camera.position.x += Math.sin(t * 0.4) * 1.2;
  camera.position.y += Math.cos(t * 0.33) * 0.9;
  camera.lookAt(_look);
  const depth = lerp(A.depth, B.depth, tt);
  const zone = A.name === B.name ? A.name : (tt < 0.5 ? A.name : B.name);

  let ci = 0;
  while (ci < COL_KEYS.length - 2 && p > COL_KEYS[ci + 1].p) ci++;
  const CA = COL_KEYS[ci], CB = COL_KEYS[ci + 1], ct2 = sstep(CA.p, CB.p, p);
  _c.copy(CA.c).lerp(CB.c, ct2);
  scene.background.copy(_c);
  scene.fog.color.copy(_c);
  const fogT = sstep(0.1, 0.5, p);
  scene.fog.near = lerp(260, 50, fogT);
  scene.fog.far = lerp(1000, 260, fogT);

  /* marine snow drift */
  snowGroup.rotation.y = t * 0.008;
  snowGroup.position.y = Math.sin(t * 0.1) * 3;

  /* god rays */
  const eRay = env(p, 0, 0.02, 0.14, 0.26);
  rayGroup.visible = eRay > 0.004;
  rayMats.forEach((mt) => { mt.opacity = mt.userData.base * eRay; });

  /* fish schools */
  const eS1 = env(p, 0, 0.02, 0.28, 0.40);
  school1.visible = eS1 > 0.004;
  school1.rotation.y = t * 0.12;
  school1.position.y = -18 + Math.sin(t * 0.4) * 2;
  const eS2 = env(p, 0.14, 0.22, 0.38, 0.50);
  school2.visible = eS2 > 0.004;
  school2.rotation.y = -t * 0.09;
  school2.position.y = -70 + Math.sin(t * 0.33 + 1) * 2;

  /* jellyfish pulse + bob */
  const eJel = env(p, 0.16, 0.24, 0.44, 0.56);
  jellyMats.forEach((mt) => { mt.opacity = mt.userData.base * eJel; });
  jellies.forEach((j) => {
    j.g.visible = eJel > 0.004;
    j.bell.scale.y = 1 + 0.28 * Math.sin(t * 2 + j.phase);
    j.g.position.y = j.baseY + Math.sin(t * 0.5 + j.phase) * 4;
  });

  /* anglerfish */
  const eAng = env(p, 0.44, 0.52, 0.60, 0.70);
  anglers.forEach((a) => {
    a.g.visible = eAng > 0.004;
    a.g.position.y = a.baseY + Math.sin(t * 0.6 + a.phase) * 3;
    a.lureMat.opacity = (0.7 + 0.3 * Math.sin(t * 4 + a.phase)) * eAng;
  });

  /* bioluminescence twinkle */
  const eBio = sstep(0.35, 0.5, p);
  biolumMat.opacity = eBio * (0.55 + 0.25 * Math.sin(t * 3));

  /* vent field */
  const eVent = env(p, 0.58, 0.66, 0.74, 0.82);
  ventGroup.visible = eVent > 0.004;
  ventMats.forEach((mt) => { mt.opacity = mt.userData.base * eVent; });
  ventGroup.userData.glow.material.opacity = ventGroup.userData.glow.material.userData.base * eVent * (0.75 + 0.25 * Math.sin(t * 2.5));
  {
    const posAttr = smokerPts.geometry.attributes.position;
    for (let k = 0; k < smokerSpeed.length; k++) {
      const y = -420 + ((smokerBase[k * 3 + 1] + 420 + t * smokerSpeed[k]) % 60);
      posAttr.array[k * 3] = smokerBase[k * 3] + Math.sin(t * 2 + k) * 1.5;
      posAttr.array[k * 3 + 1] = y;
      posAttr.array[k * 3 + 2] = smokerBase[k * 3 + 2] + Math.cos(t * 1.7 + k) * 1.5;
    }
    posAttr.needsUpdate = true;
  }

  /* trench walls */
  const eTre = sstep(0.74, 0.84, p);
  trenchGroup.visible = eTre > 0.004;
  trenchMats.forEach((mt) => { mt.opacity = mt.userData.base * eTre; });

  /* submersible */
  const eSub = env(p, 0.80, 0.86, 0.96, 1.02);
  subGroup.visible = eSub > 0.004;
  subMats.forEach((mt) => { mt.opacity = mt.userData.base * eSub; });
  subGroup.position.y = -880 + Math.sin(t * 0.5) * 2;
  subGroup.rotation.y = Math.sin(t * 0.2) * 0.3;

  renderer.render(scene, camera);
  return { zone, depth };
}

/* ---------------- interpolation engine ---------------- */
let targetP = 0, smoothP = 0;
function readScroll() {
  const max = document.documentElement.scrollHeight - innerHeight;
  targetP = max > 0 ? clamp01(scrollY / max) : 0;
}
let resizeT = 0;
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  clearTimeout(resizeT);
  resizeT = setTimeout(measureChapters, 150);
});
addEventListener('load', measureChapters);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => measureChapters());
addEventListener('scroll', readScroll, { passive: true });
readScroll();

const chapterEls = [...document.querySelectorAll('.chapter')];
const chapters = chapterEls.map((el) => ({ el, from: 0, to: 1, active: false }));
function measureChapters() {
  const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
  chapterEls.forEach((el, i) => {
    const from = clamp01(el.offsetTop / max);
    const to = clamp01((el.offsetTop + el.offsetHeight) / max);
    chapters[i].from = from;
    chapters[i].to = i === chapters.length - 1 ? 1 : to;
  });
  buildStops();
  readScroll();
}

let lastZone = '';
function syncChapters(p, zone, depth) {
  let ai = chapters.length - 1;
  for (let i = 0; i < chapters.length; i++) {
    if (p < chapters[i].to) { ai = i; break; }
  }
  for (let i = 0; i < chapters.length; i++) {
    const on = i === ai;
    if (on !== chapters[i].active) { chapters[i].active = on; chapters[i].el.classList.toggle('is-active', on); }
  }
  if (zone !== lastZone) { lastZone = zone; hudZone.textContent = zone; }
  hudDepth.textContent = Math.round(depth).toLocaleString('en-US') + ' m';
  const pct = (p * 100).toFixed(2) + '%';
  hudBar.style.width = pct;
  hudKnob.style.left = pct;
}

let fpsEma = 60, lastFpsText = 0, lastQuality = 0;
function syncPerf(dt, t) {
  if (dt > 0) fpsEma += (1 / dt - fpsEma) * 0.06;
  if (t - lastFpsText > 0.5) {
    lastFpsText = t;
    const f = Math.round(fpsEma);
    hudFps.textContent = `${f} fps`;
    hudFps.className = 'hud-fps ' + (f >= 40 ? 'good' : 'warn');
  }
  if (t - lastQuality > 2.5) {
    lastQuality = t;
    if (fpsEma < 34 && pixelRatio > 1) {
      pixelRatio = Math.max(1, pixelRatio - 0.25);
      renderer.setPixelRatio(pixelRatio);
    } else if (fpsEma > 57 && pixelRatio < PR_CAP) {
      pixelRatio = Math.min(PR_CAP, pixelRatio + 0.25);
      renderer.setPixelRatio(pixelRatio);
    }
  }
}

const clock = new THREE.Clock();
function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), 0.1);
  const t = clock.elapsedTime;
  const k = 1 - Math.exp(-dt * 5.5);
  smoothP += (targetP - smoothP) * k;
  if (Math.abs(targetP - smoothP) < 0.0004) smoothP = targetP;
  const r = render(smoothP, t);
  syncChapters(smoothP, r.zone, r.depth);
  syncPerf(dt, t);
}

renderer.setSize(innerWidth, innerHeight);
measureChapters();
if (reducedMotion) {
  const syncStatic = () => { readScroll(); const r = render(targetP, 0); syncChapters(targetP, r.zone, r.depth); };
  addEventListener('scroll', syncStatic, { passive: true });
  syncStatic();
} else {
  frame();
}
