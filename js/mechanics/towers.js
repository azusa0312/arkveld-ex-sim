/* =====================================================================
 * 塔與 P2 特殊機制：
 *   護龍共振（踩塔）＋黃圈 ×3 →（可接）波狀龍閃＋結晶爆炸＋龍光擴散
 *   鎖刃躍動（骰子 1～8 依序撲人＋半場）
 *   龍閃炮 ×3（點名直線）＋白光分攤＋龍光擴散
 * ===================================================================== */

/* ---------- 護龍共振（踩塔）＋黃圈 ×3 ---------- */
const MELEE_IDS = ['MT', 'ST', 'D1', 'D2'];
function towerPhase(next, withExa) {
  placeBoss(0, -19, 180);
  setArmUp(null);
  const layout = variant('towerVar', ['NS', 'EW']);
  const rot = layout === 'EW' ? -90 : 0;
  const towers = towerLayout(layout);
  drawTowers(towers, 12.4);
  const ang = {};
  towers.forEach((tw) => (ang[tw.owner] = tw.a));
  ang.H1 = (90 + rot + 360) % 360;
  ang.H2 = (270 + rot + 360) % 360;
  const drop = (m, r) => posAt(ang[m.id] + 22.5, r);
  const myTower = (m) => towers.find((tw) => tw.owner === m.id);
  setCast('護龍共振', `大塔在${layout === 'NS' ? '北／南' : '西／東'}（坦克）、4 座小塔（D1～D4）＋腳下黃圈 ×3`, 12.2);
  advice = '黃圈不能放在塔上：近戰 中→外→中→進塔；遠程與治療 中→外→最外圈（D3／D4 最後進塔）。';
  let phase = 0;
  setPlan((m) => {
    const melee = MELEE_IDS.includes(m.id);
    if (phase === 0) return drop(m, 3);
    if (phase === 1) return drop(m, 15.5);
    if (phase === 2) return melee ? drop(m, 3) : drop(m, 19);
    const tw = myTower(m);
    return tw ? P(tw.x, tw.z) : posAt(ang[m.id], 16); // 治療：離開自己的黃圈，待在外圈
  });
  const t0 = t;
  const chk = (rec) => puddleOnTower(rec, towers, '黃圈放在塔上');
  puddles(t0 + 3, 2.2, '黃圈（第 1 次）', chk);
  at(t0 + 3.05, () => (phase = 1));
  puddles(t0 + 6, 2.2, '黃圈（第 2 次）', chk);
  at(t0 + 6.05, () => (phase = 2));
  puddles(t0 + 9, 2.2, '黃圈（第 3 次）', chk);
  at(t0 + 9.05, () => {
    phase = 3;
    advice = '黃圈放完了：坦克進大塔、D1～D4 進自己的小塔，治療留在外圈。';
  });
  at(t0 + 12.2, () => {
    if (state !== 'running') return;
    if (!resolveTowers('護龍共振', towers)) return;
    if (withExa) waveRattle(towers, rot, next);
    else next();
  });
}

/* ---------- 波狀龍閃：塔留下結晶，步進 AOE 從中央往外推，碰到結晶就爆炸 ---------- */
const QUAD = { MT: [315, -5], D3: [315, 5], D4: [45, -5], H1: [45, 5], ST: [135, -5], D2: [135, 5], D1: [225, -5], H2: [225, 5] };
function waveRattle(towers, rot, next) {
  placeBoss(0, 0, 180);
  const crystals = towers.map((tw) => {
    const r = tw.big ? 6.5 : 4;
    const g = new T.Group();
    const c = new T.Mesh(
      new T.OctahedronGeometry(tw.big ? 1.1 : 0.7),
      new T.MeshStandardMaterial({ color: 0xe8f4ff, emissive: 0x6aa8ff, emissiveIntensity: 0.6 }),
    );
    c.position.y = 1;
    g.add(c, ringMesh(0, 0, r - 0.12, r, 0xbfdfff, 0.6, 0.075));
    g.position.set(tw.x, 0, tw.z);
    omen(g, 14);
    return { ...tw, r, mesh: g };
  });
  setCast('波狀龍閃', '步進的圓形 AOE 從中央往外推；碰到結晶會爆炸（大塔結晶範圍大）', 3);
  advice = '站在斜角（兩條路線的夾角）靠內側，離大結晶、小結晶都遠一點。';
  setPlan((m) => posAt(QUAD[m.id][0] + rot + QUAD[m.id][1], 5.5), 0.2);
  const t1 = t;
  const boom = (cr) => {
    if (state !== 'running' || !cr.mesh.parent) return;
    removeFx(cr.mesh);
    strongFlash(circleMesh(cr.x, cr.z, cr.r, 0x9fd0ff, 0.55));
    judge('結晶爆炸', (m) =>
      dist(m, cr) < cr.r ? `${who(m)} 被${cr.big ? '大' : '小'}結晶的爆炸打到（${where(cr)}）：離結晶遠一點。` : '',
    );
  };
  // 第一波：沿大塔方向往外推，推到大結晶就引爆
  [0, 180].forEach((a) => {
    const d = dirOf(a + rot);
    exaflare('波狀龍閃', P(0, 0), d, 5, 4, 0.9, 2.8, t1 + 3, (c) => {
      crystals.filter((cr) => cr.big && dist(cr, c) < 3).forEach(boom);
    });
  });
  // 第二波：沿另一條軸往外推；小結晶跟著爆炸
  [90, 270].forEach((a) => exaflare('波狀龍閃', P(0, 0), dirOf(a + rot), 5, 4, 0.9, 2.8, t1 + 8));
  at(t1 + 9.5, () => crystals.filter((cr) => !cr.big).forEach(boom));
  // 最後：龍光擴散
  at(t1 + 12.2, () => {
    if (state !== 'running') return;
    setCast('龍光擴散', '全員點名圓形：散開', 3);
    advice = '散開到外圈，每人一個方向。';
    spreadOmens(3.1);
    setPlan((m) => posAt(ROLE_IDS.indexOf(m.id) * 45 + 22.5 + rot, 11), 0.1);
  });
  at(t1 + 15.2, () => {
    if (state !== 'running') return;
    if (!resolveSpread('龍光擴散')) return;
    bossHome();
    next();
  });
}

/* ---------- 鎖刃躍動：骰子 1～8 ---------- */
function clamorousChase(next) {
  placeBoss(0, -19, 180);
  const arm = variant('chaseVar', ['L', 'R']);
  setArmUp(arm);
  const cw = arm === 'L';
  const order = cw ? ['B', 'C', 'D', 'A'] : ['D', 'C', 'B', 'A'];
  const SP = { A: P(0, -16.5), B: P(16.5, 0), C: P(0, 16.5), D: P(-16.5, 0) };
  const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8]);
  const numOf = {};
  members.forEach((m, i) => {
    numOf[m.id] = nums[i];
    setTag(m, String(nums[i]), '#ffe08a');
  });
  const spotOf = (k) => SP[order[(k - 1) % 4]];
  setCast(
    '鎖刃躍動',
    `王${cw ? '左' : '右'}手較高 → ${cw ? '順' : '逆'}時針：1/5 在 ${order[0]}、2/6 在 C、3/7 在 ${order[2]}、4/8 在 A`,
    6,
  );
  const me = numOf[player.id];
  advice = `你是 ${me} 號：${me <= 4 ? `先到 ${order[(me - 1) % 4]} 點等王撲過來，撲完立刻回中間` : `先在中間，等 ${me - 4} 號被撲完、半場打完後再去 ${order[(me - 1) % 4]} 點`}。`;
  const t0 = t;
  const T_ = (k) => t0 + 6 + 3.4 * (k - 1);
  const ids = ROLE_IDS;
  const center = (m) => posAt(ids.indexOf(m.id) * 45, 1.2);
  setPlan((m) => {
    const k = numOf[m.id];
    const sp = spotOf(k);
    if (k <= 4) return t < T_(k) ? sp : center(m);
    if (t < T_(k - 4) + 2.7) return center(m);
    return t < T_(k) ? sp : center(m);
  }, 0.3);
  for (let k = 1; k <= 8; k++) {
    const tg = members.find((m) => numOf[m.id] === k);
    const sp = spotOf(k);
    const n = norm(sp);
    let hitAt;
    at(T_(k) - 0.45, () => {
      if (state !== 'running') return;
      hitAt = { x: tg.x, z: tg.z };
      omen(circleMesh(hitAt.x, hitAt.z, 6, 0xff5a3a, 0.3), 0.5);
      dashBoss(hitAt.x, hitAt.z, 0.45, faceTo(hitAt, P(0, 0)));
    });
    at(T_(k), () => {
      if (state !== 'running') return;
      strongFlash(circleMesh(hitAt.x, hitAt.z, 6, 0xff5a3a, 0.55));
      setTag(tg, '');
      const ok = judge(`鎖刃躍動（${k} 號）`, (m) =>
        m !== tg && dist(m, hitAt) < 6 ? `${who(m)} 離 ${k} 號太近，被撲擊的範圍打到：沒輪到的人留在中間。` : '',
      );
      if (!ok) return;
      giveVuln(tg, 9);
      omen(halfMesh(P(0, 0), n, 6, 0xff5a3a, 0.3), 2.65);
    });
    at(T_(k) + 2.6, () => {
      if (state !== 'running') return;
      strongFlash(halfMesh(P(0, 0), n, 6, 0xff5a3a, 0.5));
      const ok = judge(`鎖刃躍動（${k} 號後的半場）`, (m) =>
        inHalf(m, P(0, 0), n, 6)
          ? m === tg
            ? `${who(m)} 被撲完沒有回中間：王接著會打那一側的半場（被撲的人有易傷，會直接死亡）。`
            : `${who(m)} 太早到場邊（${where(m)}）：要等前一個人的半場打完再過去。`
          : '',
      );
      if (!ok) return;
      if (k === 8) {
        setArmUp(null);
        bossHome();
        next();
      }
    });
  }
}

/* ---------- 龍閃炮 ×3 ---------- */
function wyvernsWeal(next) {
  placeBoss(0, -18, 180);
  setArmUp(null);
  const tg = pick(members.filter((m) => /^D/.test(m.id)));
  setTag(tg, '龍閃炮', '#ff9a7a');
  const o = bPos();
  setCast('龍閃炮', `${tg.id} 被點名：直線衝擊波 ×3（東 → 西 → 東）`, 5);
  advice = `${tg.id} 去王右前方（東邊）場邊引導；其他人在西邊。直線出現後被點名的人往旁邊閃。`;
  const ids = ROLE_IDS.filter((id) => id !== tg.id);
  const cluster = (m, c) => add(c, dirOf(ids.indexOf(m.id) * 51), 1.1);
  const WEST = posAt(250, 9);
  let step = 0;
  const tgSpot = [posAt(60, 18), posAt(85, 17), posAt(300, 18), posAt(275, 17), posAt(60, 18), posAt(85, 17)];
  const stackM = posAt(60, 11),
    stackS = posAt(120, 12);
  const h1 = byId('H1'),
    h2 = byId('H2');
  setPlan((m) => {
    if (m === tg) return tgSpot[step];
    if (step <= 1 || step >= 4) {
      if (step === 5) return posAt(200 + ids.indexOf(m.id) * 25, 13);
      return cluster(m, WEST);
    }
    return cluster(m, m.grp === 'M' ? stackM : stackS);
  });
  const t0 = t;
  const beam = (snapAt, idx) => {
    let d;
    at(snapAt, () => {
      if (state !== 'running') return;
      d = norm(sub(tg, o));
      omen(lineMesh(o, d, 45, 3.5, 0xff3a2a, 0.35), 1.65);
      step = idx * 2 + 1; // 被點名的人往旁邊閃
    });
    at(snapAt + 1.6, () => {
      if (state !== 'running') return;
      strongFlash(lineMesh(o, d, 45, 3.5, 0xff3a2a, 0.6));
      const ok = judge(`龍閃炮（第 ${idx + 1} 發）`, (m) =>
        inLine(m, o, d, 45, 3.5)
          ? m === tg
            ? `${who(m)} 被自己引導的龍閃炮打到：直線出現後要往旁邊閃。`
            : `${who(m)} 站在龍閃炮的直線上（${where(m)}）：要站在被點名的人的另一側。`
          : '',
      );
      if (!ok) return;
      if (idx === 0) {
        step = 2;
        stackMark(h1, '#fff6c8', '白光');
        stackMark(h2, '#fff6c8', '白光');
        advice = `第 2 發往西：${tg.id} 去西邊；其他人到東邊分兩組分攤（MT 組靠王、ST 組遠離王）。`;
      }
      if (idx === 1) {
        if (!resolveStacks('白光（分攤）', [h1, h2], 3)) return;
        step = 4;
        advice = `第 3 發往東：${tg.id} 回東邊；其他人回西邊，打完後馬上散開（龍光擴散）。`;
      }
      if (idx === 2) {
        step = 5;
        spreadOmens(2.1);
        at(t + 2, () => {
          if (state !== 'running') return;
          if (!resolveSpread('龍光擴散')) return;
          setTag(tg, '');
          bossHome();
          next();
        });
      }
    });
  };
  beam(t0 + 5, 0);
  beam(t0 + 13, 1);
  beam(t0 + 21.5, 2);
}
