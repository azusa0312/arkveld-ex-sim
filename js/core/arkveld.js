/* =====================================================================
 * 護鎖刃龍共用零件：王的位置／朝向／突進、半場與直線範圍、
 * 腳下黃圈（放圈）、分攤、分散、塔、步進式圓形 AOE（波狀龍閃）、結晶。
 * ===================================================================== */

/* ---------- 王的位置與朝向 ---------- */
const bossSt = { x: 0, z: -8, face: 180 };
const HOME = { x: 0, z: -8 }; // 平常站的位置（北半場，面向南）
const TARGET_R = 3.4; // 王腳下紅圈（目標圈）的外半徑：模型 4.0 × 縮放 0.85
const BLOW_OVER = TARGET_R; // 鎖刃敲打會越過中線，一直蓋到另一側紅圈的外緣
function placeBoss(x, z, face = bossSt.face) {
  Object.assign(bossSt, { x, z, face });
  boss.position.set(x, 0, z);
  const d = dirOf(face);
  boss.rotation.y = Math.atan2(d.x, d.z);
}
const bFwd = () => dirOf(bossSt.face);
const bRight = () => dirOf(bossSt.face + 90); // 王自己的右手方向
const bPos = () => ({ x: bossSt.x, z: bossSt.z });
// 以王為基準的位置：前方 f、右方 r（r 為負 = 王的左手側）
const local = (f, r, b = bossSt) => {
  const F = dirOf(b.face),
    R = dirOf(b.face + 90);
  return { x: b.x + F.x * f + R.x * r, z: b.z + F.z * f + R.z * r };
};
const faceTo = (from, to) => angOfPt(to, from);
// 王移動（突進／跳躍）：dur 秒內移到 (x,z)，最後面向 face
function dashBoss(x, z, dur, face) {
  const x0 = bossSt.x,
    z0 = bossSt.z,
    t0 = t;
  const f = face === undefined ? faceTo(bossSt, { x, z }) : face;
  placeBoss(x0, z0, faceTo(bossSt, { x, z }));
  tick(() => {
    const k = Math.min(1, (t - t0) / dur);
    placeBoss(x0 + (x - x0) * k, z0 + (z - z0) * k, k >= 1 ? f : bossSt.face);
    return k >= 1;
  });
}
function bossHome() {
  placeBoss(HOME.x, HOME.z, 180);
  setArmUp(null);
}

/* ---------- 範圍圖形 ---------- */
// 半場：dot(p - o, n) > c 的區域（畫成很大的矩形）
function halfMesh(o, n, c, color, op = 0.42) {
  const d = { x: -n.z, z: n.x };
  const o2 = add(add(o, n, c + 25), d, -30);
  return lineMesh(o2, d, 60, 25, color, op);
}
// 圓形範圍判定＋失敗訊息
function hitList(test) {
  return members.filter((m) => !m.dead && test(m));
}

/* ---------- 腳下黃圈（每人一個，點名後鎖定位置，延遲爆炸） ---------- */
const PUDDLE_R = 2.5;
// whenSnap：鎖定時間；delay：鎖定後幾秒爆炸。回傳 { spots } 讓之後檢查（例如不能放在塔上）
function puddles(whenSnap, delay, label, onDone) {
  const rec = { spots: [] };
  const follow = members.map((m) => {
    const c = ringMesh(0, 0, PUDDLE_R - 0.25, PUDDLE_R, 0xffd34a, 0.9, 0.09);
    omen(c, whenSnap - t + delay + 0.1);
    tick(() => {
      if (t >= whenSnap) return true;
      c.position.set(m.x, 0.09, m.z);
      return false;
    });
    return c;
  });
  at(whenSnap, () => {
    rec.spots = members.map((m, i) => {
      const p = { x: m.x, z: m.z, id: m.id };
      follow[i].position.set(p.x, 0.09, p.z);
      omen(circleMesh(p.x, p.z, PUDDLE_R, 0xffb02e, 0.35, 0.085), delay + 0.05);
      return p;
    });
  });
  at(whenSnap + delay, () => {
    if (state !== 'running') return;
    rec.spots.forEach((s) => strongFlash(circleMesh(s.x, s.z, PUDDLE_R, 0xffb02e, 0.6)));
    const ok = judge(label, (m) => {
      const s = rec.spots.find((s) => dist(s, m) < PUDDLE_R);
      if (!s) return '';
      return s.id === m.id
        ? `${who(m)} 被自己的黃圈炸到：黃圈在你腳下鎖定後要立刻離開。`
        : `${who(m)} 被 ${s.id} 的黃圈炸到（${where(s)}）：放圈要和別人錯開。`;
    });
    if (ok && onDone) onDone(rec);
  });
  return rec;
}

/* ---------- 分攤 ---------- */
// target：被點名的人；need：至少幾人；r：半徑；回傳判定函式（在 when 執行）
function stackMark(m, color = '#fff6c8', text = '分攤') {
  setTag(m, text, color);
  const ring = ringMesh(0, 0, 2.6, 3.0, 0xfff1a8, 0.85, 0.1);
  omen(ring, 30);
  m._stackRing = ring;
  tick(() => {
    if (!ring.parent) return true;
    ring.position.set(m.x, 0.1, m.z);
    return false;
  });
  return ring;
}
function resolveStacks(title, targets, need, r = 3.0) {
  const ok = judge(title, (m) => {
    for (const tg of targets) {
      if (tg !== m) continue;
      const n = members.filter((o) => dist(o, tg) <= r).length;
      if (n < need) return `${tg.id} 的分攤只有 ${n} 人（至少要 ${need} 人一起吃）。`;
    }
    const inN = targets.filter((tg) => dist(m, tg) <= r).length;
    if (inN > 1) return `${who(m)} 同時吃到兩個分攤（${where(m)}）：兩組要分開。`;
    return '';
  });
  targets.forEach((tg) => {
    strongFlash(circleMesh(tg.x, tg.z, r, 0xfff1a8, 0.55));
    setTag(tg, '');
    if (tg._stackRing) removeFx(tg._stackRing);
  });
  return ok;
}

/* ---------- 分散（龍光擴散）：每人腳下圓圈，不能重疊到別人 ---------- */
const SPREAD_R = 3.6;
function spreadOmens(life) {
  members.forEach((m) => {
    const c = ringMesh(0, 0, SPREAD_R - 0.2, SPREAD_R, 0xb98bff, 0.85, 0.095);
    omen(c, life);
    tick(() => {
      if (!c.parent) return true;
      c.position.set(m.x, 0.095, m.z);
      return false;
    });
  });
}
function resolveSpread(title) {
  members.forEach((m) => strongFlash(circleMesh(m.x, m.z, SPREAD_R, 0xb98bff, 0.4)));
  const ok = judge(title, (m) => {
    const o = members.find((o) => o !== m && dist(o, m) < SPREAD_R);
    return o ? `${who(m)} 和 ${o.id} 的龍光擴散重疊了（${where(m)}）：要散開，至少隔 ${SPREAD_R} 公尺。` : '';
  });
  members.forEach((m) => giveVuln(m, 3));
  return ok;
}

/* ---------- 塔（護龍共振）：2 座大塔（坦克）＋ 4 座小塔 ---------- */
const BIG_R = 3.2,
  SMALL_R = 2.0,
  TOWER_D = 10.5;
// layout 'NS'：大塔在北／南；'EW'：大塔在西／東（整組旋轉 -90 度）
function towerLayout(layout) {
  const rot = layout === 'EW' ? -90 : 0;
  const mk = (a, big, owner) => ({ ...posAt(a + rot, TOWER_D), big, owner, a: (a + rot + 360) % 360 });
  return [
    mk(0, 1, 'MT'),
    mk(180, 1, 'ST'),
    mk(315, 0, 'D3'),
    mk(45, 0, 'D4'),
    mk(225, 0, 'D1'),
    mk(135, 0, 'D2'),
  ];
}
function drawTowers(towers, life) {
  towers.forEach((tw) => {
    const r = tw.big ? BIG_R : SMALL_R;
    const g = new T.Group();
    g.add(circleMesh(0, 0, r, 0xff5a3a, 0.28, 0.08), ringMesh(0, 0, r - 0.18, r, 0xff8a5a, 0.95, 0.085));
    const pillar = new T.Mesh(
      new T.CylinderGeometry(0.18, 0.18, 6, 8),
      new T.MeshBasicMaterial({ color: 0xff7a4a, transparent: true, opacity: 0.6 }),
    );
    pillar.position.y = 3;
    g.add(pillar);
    g.add(floatLabel(tw.big ? '大塔' : '小塔', '#ffd0b0', 0, 0, 3.4, 0.8));
    g.position.set(tw.x, 0, tw.z);
    omen(g, life);
    tw.mesh = g;
  });
}
function resolveTowers(title, towers) {
  towers.forEach((tw) => strongFlash(circleMesh(tw.x, tw.z, tw.big ? BIG_R : SMALL_R, 0xff7a4a, 0.6)));
  const reasons = [];
  towers.forEach((tw) => {
    const r = tw.big ? BIG_R : SMALL_R;
    const inside = members.filter((m) => dist(m, tw) <= r);
    if (!inside.length) reasons.push(`${where(tw)}的${tw.big ? '大' : '小'}塔沒人踩（應該是 ${tw.owner}）：漏塔會全體受傷＋易傷。`);
    if (tw.big && inside.some((m) => !m.tank))
      reasons.push(`${where(tw)}的大塔有非坦克踩：${inside.filter((m) => !m.tank).map((m) => m.id).join('、')}（大塔只給坦克）。`);
    if (!tw.big && inside.some((m) => m.tank)) reasons.push(`${where(tw)}的小塔有坦克踩：坦克要去大塔。`);
  });
  if (reasons.length) {
    fail(title, reasons);
    return false;
  }
  return true;
}
// 黃圈不能放在塔上
function puddleOnTower(rec, towers, title) {
  return judge(title, (m) => {
    const s = rec.spots.find((s) => s.id === m.id);
    if (!s) return '';
    const tw = towers.find((tw) => dist(s, tw) < PUDDLE_R + (tw.big ? BIG_R : SMALL_R));
    return tw ? `${who(m)} 把黃圈放在${where(tw)}的塔上了：黃圈要放在塔以外的地方。` : '';
  });
}

/* ---------- 步進式圓形 AOE（波狀龍閃） ---------- */
// 從 o 往方向 d 每 step 秒前進 gap 公尺，共 n 下，半徑 r；每一下判定
function exaflare(title, o, d, n, gap, step, r, startAt, onHit) {
  for (let i = 0; i < n; i++) {
    const c = add(o, d, gap * i);
    const when = startAt + step * i;
    omen(circleMesh(c.x, c.z, r, 0xff6a3a, i === 0 ? 0.35 : 0.12, 0.08), when - t + 0.05);
    at(when, () => {
      if (state !== 'running') return;
      strongFlash(circleMesh(c.x, c.z, r, 0xff6a3a, 0.55));
      judge(title, (m) => (dist(m, c) < r ? `${who(m)} 被步進的圓形 AOE 打到（${where(m)}）：站在兩條路線的夾角裡。` : ''));
      if (onHit) onHit(c);
    });
  }
}

/* ---------- 安全路線：每一波都在範圍外、兩波之間走得到 ----------
 * hazards[k](p)：第 k 波判定時 p 是否危險（已含邊距）
 * start：開場大約的位置；firstReach：開場到第一波最多能走多遠；step：兩波之間最多走多遠
 * prefer：最後想靠近的點（同樣距離時優先）。回傳每一波時要站的位置。 */
function planRoute(hazards, start, firstReach, step, prefer) {
  const nodes = [];
  for (let x = -18; x <= 18; x += 1)
    for (let z = -18; z <= 18; z += 1) if (Math.hypot(x, z) <= WALK_R - 1) nodes.push(P(x, z));
  const n = nodes.length;
  let cost = nodes.map((p) => (dist(p, start) <= firstReach && !hazards[0](p) ? dist(p, start) * 0.3 : Infinity));
  const back = [];
  for (let k = 1; k < hazards.length; k++) {
    const nc = new Array(n).fill(Infinity),
      from = new Array(n).fill(-1);
    for (let j = 0; j < n; j++) {
      if (hazards[k](nodes[j])) continue;
      for (let i = 0; i < n; i++) {
        if (cost[i] === Infinity) continue;
        const d = dist(nodes[i], nodes[j]);
        if (d > step) continue;
        if (cost[i] + d < nc[j]) {
          nc[j] = cost[i] + d;
          from[j] = i;
        }
      }
    }
    back.push(from);
    cost = nc;
  }
  let best = -1,
    bc = Infinity;
  for (let j = 0; j < n; j++) {
    const c = cost[j] + (prefer ? dist(nodes[j], prefer) * 0.2 : 0);
    if (c < bc) {
      bc = c;
      best = j;
    }
  }
  if (best < 0) {
    console.warn('planRoute：找不到安全路線');
    return hazards.map(() => start);
  }
  const path = [best];
  for (let k = back.length - 1; k >= 0; k--) path.unshift(back[k][path[0]]);
  return path.map((i) => nodes[i]);
}
