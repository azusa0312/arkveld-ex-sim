/* =====================================================================
 * 常數、職能、場標與小工具
 * 座標：x 往東為正、z 往南為正（北 = -z）。圓形場地半徑 ARENA_R。
 * 角度一律「由北起順時針」的度數。
 * 分組照子言姐姐影片：MT 組（MT・H1・D1・D2）、ST 組（ST・H2・D3・D4）。
 * ===================================================================== */

const $ = (id) => document.getElementById(id);
const T = THREE;

const ARENA_R = 20, // 圓形場地半徑
  WALK_R = 19.4, // 可走半徑
  SPEED = 6;
const GROUP_NAME = { M: 'MT 組', S: 'ST 組' };
const ROLE_INFO = {
  MT: { grp: 'M', col: 0x4f8dff, tank: 1, melee: 1 },
  ST: { grp: 'S', col: 0x4f8dff, tank: 1, melee: 1 },
  H1: { grp: 'M', col: 0x47c27a },
  H2: { grp: 'S', col: 0x47c27a },
  D1: { grp: 'M', col: 0xe0565b, melee: 1 },
  D2: { grp: 'M', col: 0xe0565b, melee: 1 },
  D3: { grp: 'S', col: 0xe0565b },
  D4: { grp: 'S', col: 0xe0565b },
};
const ROLE_IDS = Object.keys(ROLE_INFO);
const GROUP_IDS = { M: ['MT', 'H1', 'D1', 'D2'], S: ['ST', 'H2', 'D3', 'D4'] };

// 場標：A 北、B 東、C 南、D 西（場邊），中央 1（照影片）
const WAYMARKS = {
  A: { x: 0, z: -17, col: '#ff5a5a', sq: 0 },
  B: { x: 17, z: 0, col: '#ffd84a', sq: 0 },
  C: { x: 0, z: 17, col: '#4ab4ff', sq: 0 },
  D: { x: -17, z: 0, col: '#c77dff', sq: 0 },
  1: { x: 0, z: 0, col: '#ff5a5a', sq: 1 },
};
// 開場／待機站位：王（北側）前方
const IDLE = {
  MT: { x: -1.5, z: -9 },
  ST: { x: 1.5, z: -9 },
  D1: { x: -3, z: -7 },
  D2: { x: 3, z: -7 },
  H1: { x: -4, z: 0 },
  H2: { x: 4, z: 0 },
  D3: { x: -2, z: 1.5 },
  D4: { x: 2, z: 1.5 },
};

const P = (x, z) => ({ x, z });
const dirOf = (a) => {
  const r = (a * Math.PI) / 180;
  return { x: Math.sin(r), z: -Math.cos(r) };
};
const posAt = (a, r, c = { x: 0, z: 0 }) => {
  const d = dirOf(a);
  return { x: c.x + d.x * r, z: c.z + d.z * r };
};
const angOfPt = (p, c = { x: 0, z: 0 }) => {
  const a = (Math.atan2(p.x - c.x, -(p.z - c.z)) * 180) / Math.PI;
  return (a + 360) % 360;
};
const angDiff = (a, b) => {
  const d = Math.abs((((a - b) % 360) + 360) % 360);
  return d > 180 ? 360 - d : d;
};
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const rand = (n) => Math.floor(Math.random() * n);
const pick = (arr) => arr[rand(arr.length)];
const shuffle = (arr) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = rand(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const who = (m) => (m.isPlayer ? m.id + '（你）' : m.id);
const dot = (a, b) => a.x * b.x + a.z * b.z;
const sub = (a, b) => ({ x: a.x - b.x, z: a.z - b.z });
const add = (a, b, k = 1) => ({ x: a.x + b.x * k, z: a.z + b.z * k });
const norm = (v) => {
  const l = Math.hypot(v.x, v.z) || 1;
  return { x: v.x / l, z: v.z / l };
};

// 方位文字（給失敗訊息用）
function where(p) {
  if (Math.hypot(p.x, p.z) < 5) return '中央';
  const names = ['北', '東北', '東', '東南', '南', '西南', '西', '西北'];
  return names[Math.round(angOfPt(p) / 45) % 8];
}

/* ---------- 幾何判定 ---------- */
// 線段型（矩形）範圍：起點 o、方向 d（單位向量）、長 len、半寬 hw
function inLine(p, o, d, len, hw) {
  const vx = p.x - o.x,
    vz = p.z - o.z;
  const along = vx * d.x + vz * d.z;
  const side = Math.abs(vx * -d.z + vz * d.x);
  return along >= -0.3 && along <= len && side <= hw;
}
// 半場：dot(p - o, n) > c
const inHalf = (p, o, n, c = 0) => dot(sub(p, o), n) > c;
