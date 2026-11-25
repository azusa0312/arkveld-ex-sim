/* =====================================================================
 * 場景：渲染器、相機、燈光、圓形荒野地板、場標、護鎖刃龍（王）
 * 王的模型：身體、頭、左右兩隻帶鎖刃的前臂（可舉起）、尾巴、腳下目標圈。
 * ===================================================================== */

let renderer;
try {
  renderer = new T.WebGLRenderer({ antialias: true });
} catch (e) {
  window.__fatal('無法建立 WebGL，請開啟瀏覽器硬體加速。');
  throw e;
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = T.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = T.PCFSoftShadowMap;
$('stage').appendChild(renderer.domElement);

const scene = new T.Scene();
scene.background = new T.Color(0x1b1410);
scene.fog = new T.Fog(0x1b1410, 40, 95);
const camera = new T.PerspectiveCamera(54, innerWidth / innerHeight, 0.1, 200);
scene.add(new T.HemisphereLight(0xfff2dd, 0x2a1c12, 0.95));
const sun = new T.DirectionalLight(0xfff0dc, 1.35);
sun.position.set(-12, 30, 14);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
Object.assign(sun.shadow.camera, { left: -28, right: 28, top: 28, bottom: -28, near: 1, far: 90 });
scene.add(sun);

function canvasTex(cv) {
  const t = new T.CanvasTexture(cv);
  t.colorSpace = T.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/* ---------- 地板：乾裂的荒野土地（圓形），外圈是白色岩壁 ---------- */
function floorTexture() {
  const W = 1024,
    k = W / (ARENA_R * 2),
    cv = document.createElement('canvas');
  cv.width = cv.height = W;
  const g = cv.getContext('2d');
  const bg = g.createRadialGradient(W / 2, W / 2, 0, W / 2, W / 2, W * 0.55);
  bg.addColorStop(0, '#8a6a4a');
  bg.addColorStop(1, '#6a4e36');
  g.fillStyle = bg;
  g.fillRect(0, 0, W, W);
  for (let i = 0; i < 3000; i++) {
    g.fillStyle = `rgba(${Math.random() < 0.5 ? '255,236,210' : '40,25,15'},${Math.random() * 0.07})`;
    g.fillRect(Math.random() * W, Math.random() * W, Math.random() * 6 + 1, Math.random() * 6 + 1);
  }
  // 白色裂紋（影片裡地面的鹽晶紋路）
  g.strokeStyle = 'rgba(240,232,220,.35)';
  g.lineWidth = 2;
  for (let i = 0; i < 60; i++) {
    let x = Math.random() * W,
      y = Math.random() * W;
    g.beginPath();
    g.moveTo(x, y);
    for (let j = 0; j < 6; j++) {
      x += (Math.random() - 0.5) * 60;
      y += (Math.random() - 0.5) * 60;
      g.lineTo(x, y);
    }
    g.stroke();
  }
  // 輔助線：十字與 45 度斜線（淡）
  g.strokeStyle = 'rgba(255,240,210,.10)';
  g.lineWidth = 2;
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 4;
    g.beginPath();
    g.moveTo(W / 2 - Math.cos(a) * ARENA_R * k, W / 2 - Math.sin(a) * ARENA_R * k);
    g.lineTo(W / 2 + Math.cos(a) * ARENA_R * k, W / 2 + Math.sin(a) * ARENA_R * k);
    g.stroke();
  }
  [7, 14].forEach((r) => {
    g.beginPath();
    g.arc(W / 2, W / 2, r * k, 0, 7);
    g.stroke();
  });
  return canvasTex(cv);
}
const floor = new T.Mesh(
  new T.CircleGeometry(ARENA_R, 96).rotateX(-Math.PI / 2),
  new T.MeshStandardMaterial({
    map: floorTexture(),
    roughness: 0.95,
    stencilWrite: true,
    stencilRef: 1,
    stencilFunc: T.AlwaysStencilFunc,
    stencilZPass: T.ReplaceStencilOp,
  }),
);
floor.receiveShadow = true;
floor.renderOrder = -1;
scene.add(floor);
const outside = new T.Mesh(
  new T.PlaneGeometry(220, 220).rotateX(-Math.PI / 2),
  new T.MeshStandardMaterial({ color: 0x3d2c1f, roughness: 1 }),
);
outside.position.y = -0.4;
scene.add(outside);
// 岩壁：一圈白灰色的石塊
{
  const rim = new T.Mesh(
    new T.TorusGeometry(ARENA_R + 1.4, 1.2, 8, 96).rotateX(Math.PI / 2),
    new T.MeshStandardMaterial({ color: 0x8f877e, roughness: 0.95 }),
  );
  rim.scale.y = 0.35;
  rim.position.y = 0.1;
  rim.receiveShadow = true;
  scene.add(rim);
  const edge = new T.Mesh(
    new T.RingGeometry(ARENA_R - 0.12, ARENA_R + 0.05, 128).rotateX(-Math.PI / 2),
    new T.MeshBasicMaterial({ color: 0xfff6e6, transparent: true, opacity: 0.9, depthWrite: false }),
  );
  edge.position.y = 0.05;
  edge.renderOrder = 2;
  scene.add(edge);
}

function markTex(lbl, col, square) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 128;
  const g = cv.getContext('2d');
  g.fillStyle = col + '55';
  g.strokeStyle = col;
  g.lineWidth = 7;
  if (square) {
    g.fillRect(14, 14, 100, 100);
    g.strokeRect(14, 14, 100, 100);
  } else {
    g.beginPath();
    g.arc(64, 64, 52, 0, 7);
    g.fill();
    g.stroke();
  }
  g.fillStyle = '#fff';
  g.font = '900 64px system-ui,sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(lbl, 64, 68);
  return canvasTex(cv);
}
Object.entries(WAYMARKS).forEach(([l, w]) => {
  const m = new T.Mesh(
    new T.PlaneGeometry(1.6, 1.6).rotateX(-Math.PI / 2),
    new T.MeshBasicMaterial({ map: markTex(l, w.col, w.sq), transparent: true, depthWrite: false }),
  );
  m.position.set(w.x, 0.04, w.z);
  m.renderOrder = 1;
  scene.add(m);
});

/* ---------- 王：護鎖刃龍 ---------- */
const boss = new T.Group();
const bossParts = {};
{
  const hide = new T.MeshStandardMaterial({ color: 0xd8d3cc, roughness: 0.75 });
  const dark = new T.MeshStandardMaterial({ color: 0x5b5560, roughness: 0.6 });
  const body = new T.Mesh(new T.SphereGeometry(1, 24, 16), hide);
  body.scale.set(2.4, 1.8, 3.6);
  body.position.y = 2.6;
  body.castShadow = true;
  const neck = new T.Mesh(new T.CylinderGeometry(0.8, 1.2, 2.6, 12), hide);
  neck.rotation.x = 1.0;
  neck.position.set(0, 3.6, 3.4);
  const head = new T.Mesh(new T.ConeGeometry(1.0, 2.8, 12), dark);
  head.rotation.x = Math.PI / 2;
  head.position.set(0, 4.2, 5.2);
  // 背上的鱗刺
  for (let i = 0; i < 6; i++) {
    const sp = new T.Mesh(new T.ConeGeometry(0.35, 1.6, 6), hide);
    sp.position.set((i % 2 ? 1 : -1) * 0.9, 4.2, -1.8 + i * 0.8);
    sp.rotation.z = (i % 2 ? -1 : 1) * 0.4;
    boss.add(sp);
  }
  boss.add(body, neck, head);
  // 前臂＋鎖刃：s = +1 王的右手（王面向南時在西側）
  const mkArm = (s) => {
    const g = new T.Group();
    const mat = new T.MeshStandardMaterial({ color: 0xcfc8c0, roughness: 0.6, emissive: 0x000000 });
    const arm = new T.Mesh(new T.CylinderGeometry(0.45, 0.6, 4.2, 10), mat);
    arm.position.y = -2.1;
    const blade = new T.Mesh(new T.BoxGeometry(0.25, 3.2, 1.4), dark);
    blade.position.set(0, -3.6, 0.6);
    g.add(arm, blade);
    g.position.set(-s * 2.2, 4.2, 1.8); // 模型 +x 是王的左手（面向 +z 時）
    boss.add(g);
    return { g, mat };
  };
  bossParts.armR = mkArm(1);
  bossParts.armL = mkArm(-1);
  // 尾巴
  const tail = new T.Group();
  for (let i = 0; i < 6; i++) {
    const seg = new T.Mesh(new T.SphereGeometry(0.9 - i * 0.12, 12, 8), hide);
    seg.scale.z = 1.6;
    seg.position.set(0, 2.0 - i * 0.2, -3.4 - i * 1.5);
    tail.add(seg);
  }
  boss.add(tail);
  bossParts.tail = tail;
  // 目標圈
  const tr = new T.Mesh(
    new T.RingGeometry(3.7, 4.0, 64).rotateX(-Math.PI / 2),
    new T.MeshBasicMaterial({ color: 0xff6a5a, transparent: true, opacity: 0.8, depthWrite: false }),
  );
  tr.position.y = 0.06;
  tr.renderOrder = 3;
  boss.add(tr);
}
boss.scale.setScalar(0.85);
scene.add(boss);

// 舉手：'L' 王的左手、'R' 王的右手、null 放下
function setArmUp(side) {
  [
    ['L', bossParts.armL],
    ['R', bossParts.armR],
  ].forEach(([k, a]) => {
    const up = k === side;
    a.g.rotation.z = up ? (k === 'L' ? 2.4 : -2.4) : 0;
    a.g.position.y = up ? 5.2 : 4.2;
    a.mat.emissive.setHex(up ? 0xff6a2a : 0);
    a.mat.emissiveIntensity = 0.9;
  });
}
