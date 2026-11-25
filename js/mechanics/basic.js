/* =====================================================================
 * 基本機制（P1、P2 都會重複出現）：
 * 咆哮、護龍亂擊、鎖刃敲打 ×2、回旋鎖刃【龍閃】＋龍光擴散、甩尾突刺、鎖刃下揮（分攤）
 * ===================================================================== */

const sideName = (n) => where({ x: n.x * 12, z: n.z * 12 });

// 咆哮：全體 AOE（times 次）
function roar(next, times = 1) {
  bossHome();
  setCast('咆哮', times > 1 ? `全體傷害 ×${times}` : '全體傷害', 3);
  advice = '全體 AOE，不用移動（治療注意血量）。';
  setPlan((m) => IDLE[m.id]);
  const hit = (k) =>
    at(t + (k === 0 ? 3 : 1.6), () => {
      if (state !== 'running') return;
      screenFlash();
      if (k + 1 < times) hit(k + 1);
      else next();
    });
  hit(0);
}

// 護龍亂擊：3 段全體傷害（轉場、狂暴）
function forgedFury(next, enrage) {
  bossHome();
  setCast('護龍亂擊', enrage ? '狂暴：讀完全滅' : '三段全體傷害，最後一下最痛', 5);
  advice = enrage ? '狂暴技：實戰要在讀條結束前打倒王。' : '轉場全體傷害：開減傷、補血。';
  setPlan((m) => IDLE[m.id]);
  [5, 6.2, 7.6].forEach((d, i) =>
    at(t + d, () => {
      if (state !== 'running') return;
      screenFlash();
      if (i === 2) {
        if (enrage) finishNote = '練習場到此結束：實戰要在護龍亂擊（狂暴）讀完前打倒王。';
        next();
      }
    }),
  );
}

/* ---------- 鎖刃敲打 ×2：先打舉手那一側半場，再打另一側 ---------- */
const BLOW_F = { MT: 3.5, ST: 3.5, D1: 5, D2: 6.5, H1: 10, H2: 11, D3: 9, D4: 12 };
const BLOW_R = { MT: 3, ST: 4.2, D1: 3.6, D2: 3, H1: 3.4, H2: 4.2, D3: 4.2, D4: 3 };
function chainBlow(next) {
  bossHome();
  const side = variant('blowVar', ['L', 'R']);
  setArmUp(side);
  const s = side === 'R' ? 1 : -1;
  const R = bRight(),
    o = bPos();
  const n1 = { x: R.x * s, z: R.z * s },
    n2 = { x: -n1.x, z: -n1.z };
  setCast('鎖刃敲打', `王舉起${side === 'R' ? '右' : '左'}手（${sideName(n1)}側）：先打舉手側，再打另一側`, 4);
  advice = `先站「沒舉手」的${sideName(n2)}側；第一下打完立刻換到${sideName(n1)}側。`;
  const spot = (m, sg) => local(BLOW_F[m.id], sg * BLOW_R[m.id]);
  const w1 = omen(halfMesh(o, n1, -1, 0xff5a3a, 0.3), 4.1);
  setPlan((m) => spot(m, -s), 0.3);
  at(t + 4, () => {
    if (state !== 'running') return;
    removeFx(w1);
    strongFlash(halfMesh(o, n1, -1, 0xff5a3a, 0.5));
    const ok = judge('鎖刃敲打（第一下）', (m) =>
      inHalf(m, o, n1, -1) ? `${who(m)} 站在舉手的${sideName(n1)}側：第一下打舉手側，要站另一側。` : '',
    );
    if (!ok) return;
    const w2 = omen(halfMesh(o, n2, -1, 0xff5a3a, 0.3), 2.7);
    advice = `第二下打${sideName(n2)}側：馬上換到${sideName(n1)}側！`;
    setPlan((m) => spot(m, s), 0.15);
    at(t + 2.6, () => {
      if (state !== 'running') return;
      removeFx(w2);
      strongFlash(halfMesh(o, n2, -1, 0xff5a3a, 0.5));
      const ok2 = judge('鎖刃敲打（第二下）', (m) =>
        inHalf(m, o, n2, -1) ? `${who(m)} 還在${sideName(n2)}側：第一下打完要立刻換邊。` : '',
      );
      setArmUp(null);
      if (ok2) next();
    });
  });
}

/* ---------- 回旋鎖刃【龍閃】＋龍光擴散：安全在尾巴那一側，同時散開 ---------- */
const OURO_SPOTS = {
  MT: [0, 3],
  D1: [5, 3],
  H1: [10, 3],
  D3: [15, 3],
  ST: [-2.5, 8],
  D2: [2.5, 8],
  H2: [7.5, 8],
  D4: [12.5, 8],
};
function ouroblade(next) {
  bossHome();
  const side = variant('tailVar', ['L', 'R']); // 尾巴甩向王的哪一手
  const s = side === 'R' ? 1 : -1;
  const R = bRight(),
    o = bPos();
  const safeN = { x: R.x * s, z: R.z * s },
    hitN = { x: -safeN.x, z: -safeN.z };
  bossParts.tail.rotation.y = s * 0.9; // 模型：尾巴擺向安全側
  setCast('回旋鎖刃【龍閃】', `尾巴在${sideName(safeN)}側 → 打另一半；同時全員龍光擴散`, 5);
  advice = `去尾巴那一側（${sideName(safeN)}）並散開，每人隔 ${SPREAD_R} 公尺以上。`;
  const w = omen(halfMesh(o, hitN, 0, 0xff5a3a, 0.3), 5.1);
  spreadOmens(5.1);
  setPlan((m) => {
    const [f, r] = OURO_SPOTS[m.id];
    return local(f, r * s);
  });
  at(t + 5, () => {
    if (state !== 'running') return;
    removeFx(w);
    strongFlash(halfMesh(o, hitN, 0, 0xff5a3a, 0.5));
    bossParts.tail.rotation.y = 0;
    const ok = judge('回旋鎖刃', (m) =>
      inHalf(m, o, hitN, 0) ? `${who(m)} 站在${sideName(hitN)}側：回旋鎖刃打沒有尾巴的那一半。` : '',
    );
    if (!ok || !resolveSpread('龍光擴散')) return;
    next();
  });
}

/* ---------- 甩尾突刺：王背後的扇形，站到王的正面 ---------- */
const TAIL_HALF = 65,
  TAIL_LEN = 26;
function steeltail(next) {
  bossHome();
  const back = (bossSt.face + 180) % 360;
  setCast('甩尾突刺', `王舉起尾巴 → 打王背後（${where(posAt(back, 12))}側）的扇形`, 4);
  advice = '不要站在王的背後或尾巴附近，繞到王的正面。';
  const w = omen(coneMesh(bPos(), back, TAIL_HALF, TAIL_LEN, 0xff5a3a, 0.35), 4.1);
  bossParts.tail.rotation.x = -0.5; // 尾巴舉起
  const ids = ROLE_IDS;
  setPlan((m) => local(4 + (ids.indexOf(m.id) % 4) * 2.2, ids.indexOf(m.id) < 4 ? -3 : 3));
  at(t + 4, () => {
    if (state !== 'running') return;
    removeFx(w);
    bossParts.tail.rotation.x = 0;
    strongFlash(coneMesh(bPos(), back, TAIL_HALF, TAIL_LEN, 0xff5a3a, 0.55));
    const ok = judge('甩尾突刺', (m) =>
      inCone(m, bPos(), back, TAIL_HALF, TAIL_LEN) ? `${who(m)} 站在王的背後（${where(m)}）：甩尾突刺打王背後的扇形，要到王的正面。` : '',
    );
    if (ok) next();
  });
}

/* ---------- 鎖刃下揮：全員分攤，之後原地留下大圓圈 ---------- */
function chainCharge(next) {
  bossHome();
  const tg = pick(members.filter((m) => !m.tank));
  stackMark(tg);
  setCast('鎖刃下揮', `${tg.id} 點名分攤（全員一起吃）→ 之後原地爆炸`, 4.5);
  advice = `全員到王的正面和 ${tg.id} 一起分攤；分攤後馬上離開那個位置。`;
  const ids = ROLE_IDS;
  const near = (m) => add(local(6, 0), dirOf((ids.indexOf(m.id) * 360) / 8), m === tg ? 0 : 1.2);
  setPlan(near);
  at(t + 4.5, () => {
    if (state !== 'running') return;
    if (!resolveStacks('鎖刃下揮', [tg], 8)) return;
    const c = { x: tg.x, z: tg.z };
    const w = omen(circleMesh(c.x, c.z, 7, 0xff5a3a, 0.35), 2.1);
    advice = '分攤後原地會爆炸：往外跑出大圓圈！';
    setPlan((m) => add(c, dirOf(90 + ((ids.indexOf(m.id) - 3.5) * 22)), 9.5), 0.15);
    at(t + 2, () => {
      if (state !== 'running') return;
      removeFx(w);
      strongFlash(circleMesh(c.x, c.z, 7, 0xff5a3a, 0.55));
      const ok = judge('鎖刃下揮（原地爆炸）', (m) =>
        dist(m, c) < 7 ? `${who(m)} 分攤完沒有離開（${where(m)}）：原地會留下大圓圈爆炸。` : '',
      );
      if (ok) next();
    });
  });
}
