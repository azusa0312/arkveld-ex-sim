/* =====================================================================
 * 突進類機制：
 *   鎖刃飛翔突進【護龍共振 白線／龍閃 紅線】＋白光／龍光（兩組分攤）
 *   黃圈＋鎖哭龍閃（放兩次圈＋往前推進的直線）
 *   突進＆龍閃 ×3（三連突進 → 圓形 → 環形）
 *   鎖哭龍閃・改（十字 → 直線往外 → 往回 → 十字）
 * ===================================================================== */

/* ---------- 鎖刃飛翔突進＋白光／龍光 ---------- */
let siegeFromN = true; // 第一次從北邊衝到南邊，之後交替
const GRP_OFF = { MT: [0, 0], H1: [0.9, 0.9], D1: [-0.9, 0.9], D2: [0, -1.1] };
function grpOff(m) {
  const k = { ST: 'MT', H2: 'H1', D3: 'D1', D4: 'D2' }[m.id] || m.id;
  return GRP_OFF[k];
}
function siegeflight(next) {
  const color = variant('lineVar', ['W', 'R']);
  const fromN = siegeFromN;
  siegeFromN = !siegeFromN;
  const S = fromN ? P(0, -18) : P(0, 18),
    E = { x: -S.x, z: -S.z };
  placeBoss(S.x, S.z, faceTo(S, E));
  setArmUp(null);
  const F = norm(sub(E, S)),
    V = bRight();
  const uv = (u, v) => ({ x: F.x * u + V.x * v, z: F.z * u + V.z * v });
  const white = color === 'W';
  const hb = byId('H1'),
    hs = byId('H2');
  stackMark(hb, '#fff6c8', white ? '白光' : '龍光');
  stackMark(hs, '#fff6c8', white ? '白光' : '龍光');
  setCast(
    '鎖刃飛翔突進',
    white ? '地上白線【護龍共振】：線的兩側之後會變粗爆炸 → 站線外分攤' : '地上紅線【龍閃】：兩側爆炸，只有中間直線安全',
    5,
  );
  advice = white
    ? '先到王的右手側（面向王時的左邊）。突進後 MT 組在靠近王的那端、ST 組在遠端，各自分攤（站白線外）。'
    : '先到王的右手側等突進（別站線上）。突進後全員進中間的直線內，MT 組靠王、ST 組遠離王分攤。';
  const lineCol = white ? 0xffffff : 0xff3a2a;
  const tele = omen(lineMesh(S, F, 36, 0.4, lineCol, 0.85), 8);
  // 突進前：王的右手側；MT 組靠終點，ST 組靠起點
  const pre = (m) => add(uv(m.grp === 'M' ? 6 : -7, 7), P(...grpOff(m)));
  const post = (m) => add(uv(m.grp === 'M' ? 9 : -8, white ? 7 : 0), P(...grpOff(m)));
  setPlan(pre);
  const t0 = t;
  at(t0 + 5, () => {
    if (state !== 'running') return;
    dashBoss(E.x, E.z, 0.5, faceTo(E, P(0, 0)));
    if (!white) setPlan(post, 0.15);
  });
  at(t0 + 5.5, () => {
    if (state !== 'running') return;
    strongFlash(lineMesh(S, F, 36, 2.5, 0xffe0d0, 0.5));
    judge('鎖刃飛翔突進', (m) =>
      inLine(m, S, F, 36, 2.5) ? `${who(m)} 站在突進路線上（${where(m)}）：先站在線的旁邊等王衝過去。` : '',
    );
  });
  if (white) at(t0 + 5.5, () => setPlan(post, 0.1));
  const band = white ? 5 : 2.5;
  const warn = () =>
    white
      ? omen(lineMesh(S, F, 36, band, 0xffffff, 0.3), 2.1)
      : omen(
          new T.Group().add(
            lineMesh(add(S, V, band + 10), F, 36, 10, 0xff3a2a, 0.3),
            lineMesh(add(S, V, -band - 10), F, 36, 10, 0xff3a2a, 0.3),
          ),
          2.1,
        );
  let w2;
  at(t0 + 5.6, () => state === 'running' && (w2 = warn()));
  at(t0 + 7.6, () => {
    if (state !== 'running') return;
    removeFx(tele);
    if (w2) removeFx(w2);
    const hit = (m) => {
      const v = Math.abs(dot(sub(m, S), V));
      return white ? v < band : v > band;
    };
    if (white) strongFlash(lineMesh(S, F, 36, band, 0xffffff, 0.5));
    else {
      strongFlash(lineMesh(add(S, V, band + 10), F, 36, 10, 0xff3a2a, 0.5));
      strongFlash(lineMesh(add(S, V, -band - 10), F, 36, 10, 0xff3a2a, 0.5));
    }
    const ok = judge(white ? '護龍共振（白線變粗）' : '龍閃（兩側爆炸）', (m) =>
      hit(m)
        ? white
          ? `${who(m)} 站在白線的範圍內（${where(m)}）：白線會變粗，要站在線外分攤。`
          : `${who(m)} 站在中間直線外（${where(m)}）：紅線時只有中間的直線內安全。`
        : '',
    );
    if (!ok || !resolveStacks(white ? '白光（分攤）' : '龍光（分攤）', [hb, hs], 4)) return;
    next();
  });
}

/* ---------- 黃圈＋鎖哭龍閃 ---------- */
// 第一次放圈位置（u = 王前方距離、v = 王右手側距離）與第二次位置
const RATTLE_A = { MT: [6, -3], ST: [6, 3], D1: [6, -9], D2: [6, 9], H1: [14, -3], H2: [14, 3], D3: [14, -9], D4: [14, 9] };
const RATTLE_B = { MT: [2, -6], ST: [2, 0], D1: [2, -12], D2: [2, 6], H1: [18, 0], H2: [18, 6], D3: [18, -6], D4: [18, 12] };
function rattle(next) {
  placeBoss(0, -16, 180);
  setArmUp(null);
  setCast('鎖哭龍閃', '腳下黃圈 ×2 → 王前方的直線一格一格往前推', 5);
  advice = '散開放兩次黃圈（放完就走）；直線推過來時，等前一格打完就走進去。';
  const b0 = { ...bossSt };
  const L = (uv) => local(uv[0], uv[1], b0);
  setPlan((m) => L(RATTLE_A[m.id]));
  const t0 = t;
  puddles(t0 + 5, 1.2, '黃圈（第一次）');
  at(t0 + 5.05, () => state === 'running' && setPlan((m) => L(RATTLE_B[m.id]), 0.1));
  puddles(t0 + 7.4, 1.2, '黃圈（第二次）');
  // 直線：每 1.1 秒往前 4 公尺，厚 4 公尺，橫跨整個場地
  const F = dirOf(180);
  let lastU = null;
  // 第二次放圈後：沿自己那一條（v 不變）走到 u = 5 等；之後永遠站在「剛打完的那一格」
  at(t0 + 7.45, () => {
    if (state !== 'running') return;
    setPlan((m) => L([lastU === null ? 5 : lastU, RATTLE_B[m.id][1]]), 0.1);
  });
  const N = 8,
    start = t0 + 9.8;
  for (let k = 0; k < N; k++) {
    const u = 2 + 4 * k;
    const o = local(u, -25, b0);
    const R = dirOf(b0.face + 90);
    at(start + 1.1 * k - 1.0, () => state === 'running' && omen(lineMesh(o, R, 50, 2, 0xff6a3a, 0.3), 1.05));
    at(start + 1.1 * k, () => {
      if (state !== 'running') return;
      const c = local(u, -25, b0);
      strongFlash(lineMesh(c, R, 50, 2, 0xff6a3a, 0.55));
      const ok = judge('鎖哭龍閃', (m) => {
        const mu = dot(sub(m, b0), F);
        return Math.abs(mu - u) < 2
          ? `${who(m)} 被往前推的直線打到（${where(m)}）：等前一格打完就走進去（往王的方向穿過）。`
          : '';
      });
      if (!ok) return;
      lastU = u;
      if (k === N - 1) next();
    });
  }
}

/* ---------- 突進＆龍閃 ×3 ---------- */
function rush(next) {
  const mir = variant('rushVar', ['A', 'B']) === 'B' ? -1 : 1;
  const S = P(0, -18);
  placeBoss(S.x, S.z, 180);
  setArmUp(null);
  const pts = [P(-7 * mir, 5), P(9 * mir, -8), P(8 * mir, 9)];
  const wait = P(3 * mir, 15);
  setCast('突進＆龍閃', '三連突進：每個落點先圓形、之後擴散成環形', 4);
  advice = `先在第 3 個落點（${where(pts[2])}）旁邊等，第 3 下突進打完就走進它的圓圈裡。`;
  const tele = [];
  let from = S;
  pts.forEach((p, i) => {
    tele.push(omen(circleMesh(p.x, p.z, 6, 0xff5a3a, 0.22), 12));
    tele.push(omen(floatLabel(String(i + 1), '#ffd0b0', p.x, p.z, 1.2, 1.4), 12));
    tele.push(omen(lineMesh(from, norm(sub(p, from)), dist(p, from), 3, 0xff5a3a, 0.12), 4 + 1.6 * i + 0.6));
    from = p;
  });
  const ids = ROLE_IDS;
  const off = (m, r = 1.4) => add(P(0, 0), dirOf(ids.indexOf(m.id) * 45), r);
  setPlan((m) => add(wait, off(m)));
  const t0 = t;
  from = S;
  pts.forEach((p, i) => {
    const a = from;
    at(t0 + 4 + 1.6 * i - 0.5, () => state === 'running' && dashBoss(p.x, p.z, 0.5));
    at(t0 + 4 + 1.6 * i, () => {
      if (state !== 'running') return;
      const d = norm(sub(p, a)),
        len = dist(p, a);
      strongFlash(circleMesh(p.x, p.z, 6, 0xff5a3a, 0.55));
      strongFlash(lineMesh(a, d, len, 3, 0xff5a3a, 0.45));
      const ok = judge(`突進（第 ${i + 1} 下）`, (m) =>
        dist(m, p) < 6 || inLine(m, a, d, len, 3)
          ? `${who(m)} 被第 ${i + 1} 下突進打到（${where(m)}）：在第 3 個落點旁邊等，不要站在路線上。`
          : '',
      );
      if (ok && i === 2) {
        advice = '第 3 下打完了：走進第 3 個落點的圓圈裡（環形的內側安全）。';
        setPlan((m) => add(pts[2], off(m, 1.6)), 0.1);
      }
    });
    from = p;
  });
  pts.forEach((p, i) => {
    at(t0 + 7.3 + 1.2 * i, () => state === 'running' && omen(ringMesh(p.x, p.z, 6, 12, 0xff5a3a, 0.25), 1.25));
    at(t0 + 8.5 + 1.2 * i, () => {
      if (state !== 'running') return;
      strongFlash(ringMesh(p.x, p.z, 6, 12, 0xff5a3a, 0.55));
      const ok = judge(`龍閃（第 ${i + 1} 個環形）`, (m) => {
        const d = dist(m, p);
        return d >= 6 && d < 12
          ? `${who(m)} 被第 ${i + 1} 個落點的環形打到（${where(m)}）：環形的內圈（原本圓圈的位置）是安全的。`
          : '';
      });
      if (!ok) return;
      if (i === 2) {
        tele.forEach((x) => removeFx(x));
        bossHome();
        next();
      }
    });
  });
}

/* ---------- 鎖哭龍閃・改：十字 → 直線往外推 → 往回推 → 十字，中間夾著鎖刃敲打 ×2 ---------- */
const WRATH_Q = { MT: [-1, -1], D1: [-1, -1], H1: [1, -1], D2: [1, -1], ST: [-1, 1], D3: [-1, 1], H2: [1, 1], D4: [1, 1] };
function wrathRattle(next) {
  placeBoss(0, -18, 180);
  setArmUp(null);
  setCast('鎖哭龍閃・改', '先十字 → 直線往外推到場邊 → 再往回推 → 最後再十字；中間還有鎖刃敲打 ×2', 4);
  advice = '十字打完走到正中央；直線推到外圈後，王舉手打半場（先躲舉手側、再換邊）；回中央等直線推回來，最後退到斜角。';
  const ids = ROLE_IDS;
  const jit = (m) => P((ids.indexOf(m.id) % 2) * 0.5 - 0.25, ids.indexOf(m.id) < 4 ? -0.3 : 0.3);
  const quad = (m) => add(P(WRATH_Q[m.id][0] * 4.5, WRATH_Q[m.id][1] * 4.5), jit(m));
  // 鎖刃敲打：舉手側先打
  const side = variant('blowVar', ['L', 'R']);
  const s = side === 'R' ? 1 : -1;
  const R = bRight(),
    o = bPos();
  const n1 = { x: R.x * s, z: R.z * s },
    n2 = { x: -n1.x, z: -n1.z };
  const sideSpot = (m, n) => add(P(n.x * 5, n.z * 5), P(0, (ids.indexOf(m.id) - 3.5) * 0.8)); // 站在紅圈的延伸線外
  let ph = 0;
  setPlan((m) => {
    if (ph === 0 || ph === 5) return quad(m);
    if (ph === 2) return sideSpot(m, n2); // 第一下打舉手側 → 站另一側
    if (ph === 3) return sideSpot(m, n1);
    return jit(m);
  });
  const crossHit = (p) => Math.abs(p.x) < 2.5 || Math.abs(p.z) < 2.5;
  const sqHit = (p, d) =>
    (Math.abs(Math.abs(p.x) - d) < 2 && Math.abs(p.z) < d + 2) || (Math.abs(Math.abs(p.z) - d) < 2 && Math.abs(p.x) < d + 2);
  const crossMesh = (op) =>
    new T.Group().add(lineMesh(P(0, -21), P(0, 1), 42, 2.5, 0xff6a3a, op), lineMesh(P(-21, 0), P(1, 0), 42, 2.5, 0xff6a3a, op));
  const sqMesh = (d, op) => {
    const g = new T.Group();
    [
      [P(-d - 2, -d), P(1, 0)],
      [P(-d - 2, d), P(1, 0)],
      [P(-d, -d - 2), P(0, 1)],
      [P(d, -d - 2), P(0, 1)],
    ].forEach(([oo, dd]) => g.add(lineMesh(oo, dd, 2 * d + 4, 2, 0xff6a3a, op)));
    return g;
  };
  const t0 = t;
  const seq = [
    { at: 4, kind: 'x' },
    { at: 5.6, d: 4 },
    { at: 7.2, d: 8 },
    { at: 8.8, d: 12 },
    { at: 10.4, d: 16 },
    { at: 12.0, d: 12 },
    { at: 13.6, d: 8 },
    { at: 15.2, d: 4 },
    { at: 16.8, kind: 'x' },
  ];
  seq.forEach((sq, i) => {
    at(t0 + sq.at - 1.4, () => state === 'running' && omen(sq.kind ? crossMesh(0.28) : sqMesh(sq.d, 0.28), 1.45));
    at(t0 + sq.at, () => {
      if (state !== 'running') return;
      strongFlash(sq.kind ? crossMesh(0.55) : sqMesh(sq.d, 0.55));
      const ok = judge('鎖哭龍閃・改', (m) =>
        (sq.kind ? crossHit(m) : sqHit(m, sq.d))
          ? sq.kind
            ? `${who(m)} 被十字打到（${where(m)}）：十字的時候要站在斜角。`
            : `${who(m)} 被推動的直線打到（${where(m)}）：第一次十字後走到正中央附近，直線往回推到最內圈後才退到斜角。`
          : '',
      );
      if (!ok) return;
      if (i === 0) ph = 1;
      if (i === 7) ph = 5;
      if (i === seq.length - 1) {
        setArmUp(null);
        next();
      }
    });
  });
  // 直線推到外圈時：鎖刃敲打 ×2（t0+8.0、t0+10.6）
  let w1, w2;
  at(t0 + 5.7, () => {
    if (state !== 'running') return;
    setArmUp(side);
    setCast('鎖刃敲打', `王舉起${side === 'R' ? '右' : '左'}手（${sideName(n1)}側）：先打舉手側，再打另一側`, 2.3);
    w1 = omen(halfMesh(o, n1, -BLOW_OVER, 0xff5a3a, 0.3), 2.4);
    ph = 2;
  });
  at(t0 + 8.0, () => {
    if (state !== 'running') return;
    removeFx(w1);
    strongFlash(halfMesh(o, n1, -BLOW_OVER, 0xff5a3a, 0.5));
    const ok = judge('鎖刃敲打（第一下）', (m) =>
      inHalf(m, o, n1, -BLOW_OVER) ? `${who(m)} 被第一下打到（${where(m)}）：第一下打舉手的${sideName(n1)}側，範圍會越過中線約 3.4 公尺，要站遠一點。` : '',
    );
    if (!ok) return;
    w2 = omen(halfMesh(o, n2, -BLOW_OVER, 0xff5a3a, 0.3), 2.7);
    ph = 3;
  });
  at(t0 + 10.6, () => {
    if (state !== 'running') return;
    removeFx(w2);
    strongFlash(halfMesh(o, n2, -BLOW_OVER, 0xff5a3a, 0.5));
    const ok = judge('鎖刃敲打（第二下）', (m) =>
      inHalf(m, o, n2, -BLOW_OVER) ? `${who(m)} 被第二下打到（${where(m)}）：第一下打完要立刻換到${sideName(n1)}側，離中線 3.4 公尺以上。` : '',
    );
    if (!ok) return;
    setArmUp(null);
    ph = 4;
  });
}
