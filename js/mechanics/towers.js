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
    else {
      pendingCrystals = makeCrystals(towers, 80); // 結晶留到龍閃炮
      next();
    }
  });
}

/* ---------- 結晶：塔判定後留在原地，被範圍碰到就爆炸（大塔的結晶範圍大） ---------- */
let pendingCrystals = null;
function makeCrystals(towers, life) {
  return towers.map((tw) => {
    const r = tw.big ? 6.5 : 4;
    const g = new T.Group();
    const c = new T.Mesh(
      new T.OctahedronGeometry(tw.big ? 1.1 : 0.7),
      new T.MeshStandardMaterial({ color: 0xe8f4ff, emissive: 0x6aa8ff, emissiveIntensity: 0.6 }),
    );
    c.position.y = 1;
    g.add(c, ringMesh(0, 0, r - 0.12, r, 0xbfdfff, 0.6, 0.075));
    g.position.set(tw.x, 0, tw.z);
    omen(g, life);
    return { x: tw.x, z: tw.z, big: tw.big, r, mesh: g };
  });
}

/* ---------- 波狀龍閃：塔留下結晶，步進 AOE 從中央往外推，碰到結晶就爆炸 ---------- */
const QUAD = { MT: [315, -5], D3: [315, 5], D4: [45, -5], H1: [45, 5], ST: [135, -5], D2: [135, 5], D1: [225, -5], H2: [225, 5] };
function waveRattle(towers, rot, next) {
  placeBoss(0, 0, 180);
  const crystals = makeCrystals(towers, 14);
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

/* ---------- 鎖刃躍動：骰子 1～8 ----------
 * 一開始看哪隻手較高決定順／逆時針；每次撲人前看王「哪隻手放下」，撲完就打那一手側的半場。 */
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
  advice = `你是 ${me} 號（${order[(me - 1) % 4]} 點）：等前一個人被撲完、半場打完再過去；平常在中間，看王哪隻手放下，站到另一側。`;
  const t0 = t;
  const GAP = 6.5;
  const T_ = (k) => t0 + 6.5 + GAP * (k - 1); // 第 k 次撲擊
  const REVEAL = 2.5, // 撲擊前幾秒看得出哪隻手放下
    CLEAVE = 2.2; // 撲擊後幾秒打半場
  const hands = [],
    halfN = [];
  for (let k = 1; k <= 8; k++) {
    hands[k] = pick(['L', 'R']);
    const face = faceTo(spotOf(k), P(0, 0));
    halfN[k] = dirOf(face + (hands[k] === 'R' ? 90 : -90)); // 放下那隻手的方向
  }
  const ids = ROLE_IDS;
  const jit = (m) => posAt(ids.indexOf(m.id) * 45, 1.1);
  // 目前「已經看得到手」、還沒打半場的那一次撲擊
  const active = () => {
    for (let k = 1; k <= 8; k++) if (t >= T_(k) - REVEAL && t < T_(k) + CLEAVE + 0.1) return k;
    return 0;
  };
  setPlan((m) => {
    const k = numOf[m.id];
    const sp = spotOf(k);
    const a = active();
    const safe = (n) => add(jit(m), n, -4.5);
    if (t < T_(k)) {
      // 還沒輪到：前一個人的半場打完才出發
      if (k === 1 || t >= T_(k - 1) + CLEAVE + 0.1) return sp;
      return a ? safe(halfN[a]) : jit(m);
    }
    if (t < T_(k) + CLEAVE + 0.1) return add(P(sp.x * 0.45, sp.z * 0.45), halfN[k], -5); // 被撲完：往安全側閃
    return a ? safe(halfN[a]) : jit(m);
  }, 0.3);
  for (let k = 1; k <= 8; k++) {
    const tg = members.find((m) => numOf[m.id] === k);
    const n = halfN[k];
    const hs = hands[k] === 'R' ? '右' : '左';
    let hitAt, w;
    at(T_(k) - REVEAL, () => {
      if (state !== 'running') return;
      setArmUp(hands[k] === 'R' ? 'L' : 'R'); // 另一隻手舉起＝這隻手放下
      setCast('鎖刃躍動', `撲向 ${k} 號：王的${hs}手放下 → 撲完打${hs}手那半邊（${sideName(n)}側）`, REVEAL);
    });
    at(T_(k) - 0.45, () => {
      if (state !== 'running') return;
      hitAt = { x: tg.x, z: tg.z };
      omen(circleMesh(hitAt.x, hitAt.z, 6, 0xff5a3a, 0.3), 0.5);
      dashBoss(hitAt.x, hitAt.z, 0.45, faceTo(spotOf(k), P(0, 0)));
    });
    at(T_(k), () => {
      if (state !== 'running') return;
      strongFlash(circleMesh(hitAt.x, hitAt.z, 6, 0xff5a3a, 0.55));
      setTag(tg, '');
      const ok = judge(`鎖刃躍動（${k} 號）`, (m) =>
        m !== tg && dist(m, hitAt) < 6 ? `${who(m)} 離 ${k} 號太近，被撲擊的範圍打到：沒輪到的人不要靠近場邊點。` : '',
      );
      if (!ok) return;
      giveVuln(tg, 9);
      w = omen(halfMesh(P(0, 0), n, -1, 0xff5a3a, 0.3), CLEAVE + 0.05);
    });
    at(T_(k) + CLEAVE, () => {
      if (state !== 'running') return;
      if (w) removeFx(w);
      strongFlash(halfMesh(P(0, 0), n, -1, 0xff5a3a, 0.5));
      const ok = judge(`鎖刃躍動（${k} 號後的半場）`, (m) =>
        inHalf(m, P(0, 0), n, -1)
          ? m === tg
            ? `${who(m)} 被撲完沒閃開：王會打${hs}手那半邊（${sideName(n)}側），被撲的人有易傷會直接死亡。`
            : `${who(m)} 站在${sideName(n)}側：王的${hs}手放下，撲完會打那半邊，要站另一側。`
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

/* ---------- 龍閃炮 ×3：每發隨機點名，光束碰到結晶會爆炸 ---------- */
// 找安全點：在東半（'E'）或西半（'W'）中，離 pref 最近、不在任何危險範圍內的位置
function safeSpot(pref, side, hazards, extra) {
  let best = null,
    bd = 1e9;
  for (let x = -16; x <= 16; x += 1)
    for (let z = -16; z <= 16; z += 1) {
      const p = P(x, z);
      if (Math.hypot(x, z) > 16) continue;
      if (side === 'E' ? x < 3 : x > -3) continue;
      if (hazards.some((h) => h(p))) continue;
      if (extra && !extra(p)) continue;
      const d = dist(p, pref);
      if (d < bd) {
        bd = d;
        best = p;
      }
    }
  return best || pref;
}
const BEAM_HW = 5; // 龍閃炮半寬（影片看起來約場地的四分之一寬）
function wyvernsWeal(next) {
  placeBoss(0, -18, 180);
  setArmUp(null);
  const o = bPos();
  const crystals = pendingCrystals || makeCrystals(towerLayout(variant('towerVar', ['NS', 'EW'])), 60);
  pendingCrystals = null;
  const tgs = shuffle(['MT', 'ST', 'D1', 'D2', 'D3', 'D4']).slice(0, 3).map(byId);
  const SIDES = ['E', 'W', 'E'];
  const tgSpot = [posAt(60, 18), posAt(300, 18), posAt(60, 18)];
  const inBeam = (p, d, mg = 0) => inLine(p, o, d, 45, BEAM_HW + mg);
  const blasting = (d) => crystals.filter((c) => inBeam(c, d, 0.6));
  // 每一發的安全位置（照預測的光束方向先算好）
  const plan = SIDES.map((sd, i) => {
    const d = norm(sub(tgSpot[i], o));
    const hz = [(p) => inBeam(p, d, 2), ...blasting(d).map((c) => (p) => dist(p, c) < c.r + 2)];
    const dodges =
      sd === 'E' ? [posAt(85, 17), posAt(80, 12), posAt(100, 15)] : [posAt(275, 17), posAt(280, 12), posAt(260, 15)];
    const dodge = dodges.find((p) => !hz.some((h) => h(p))) || dodges[0];
    const other = sd === 'E' ? 'W' : 'E';
    if (i === 1) {
      const sm = safeSpot(posAt(60, 11), other, hz);
      const ss = safeSpot(posAt(120, 12), other, hz, (p) => dist(p, sm) > 8.5);
      return { dodge, sm, ss };
    }
    return { dodge, grp: safeSpot(posAt(250, 9), other, hz) };
  });
  setCast('龍閃炮', '每發隨機點名一人：直線衝擊波 ×3（東 → 西 → 東），碰到結晶會爆炸', 5);
  advice = `第 1 發點名 ${tgs[0].id}：${tgs[0].id} 去王右前方（東）場邊引導；其他人在西邊、離結晶遠一點。直線出現後被點名的人往旁邊閃。`;
  setTag(tgs[0], '龍閃炮', '#ff9a7a');
  const ids = ROLE_IDS;
  const cluster = (m, c) => add(c, dirOf(ids.indexOf(m.id) * 45), 1.1);
  let cur = 0,
    dodged = false,
    spread = false;
  setPlan((m) => {
    if (spread) {
      // 第 3 發的人留在東邊閃避點，其他 7 人在西半邊沿外圈散開
      if (m === tgs[2]) return plan[2].dodge;
      const rest = ids.filter((id) => id !== tgs[2].id);
      return posAt(200 + rest.indexOf(m.id) * 25, 13);
    }
    const i = Math.min(cur, 2);
    if (m === tgs[i]) return dodged ? plan[i].dodge : tgSpot[i];
    if (i === 1) return cluster(m, m.grp === 'M' ? plan[1].sm : plan[1].ss);
    return cluster(m, plan[i].grp);
  });
  const h1 = byId('H1'),
    h2 = byId('H2');
  const t0 = t;
  const beam = (snapAt, i) => {
    let d;
    at(snapAt, () => {
      if (state !== 'running') return;
      d = norm(sub(tgs[i], o));
      omen(lineMesh(o, d, 45, BEAM_HW, 0xff3a2a, 0.35), 1.65);
      blasting(d).forEach((c) => c.mesh.parent && omen(circleMesh(c.x, c.z, c.r, 0x9fd0ff, 0.25), 1.65));
      dodged = true;
    });
    at(snapAt + 1.6, () => {
      if (state !== 'running') return;
      const tg = tgs[i];
      strongFlash(lineMesh(o, d, 45, BEAM_HW, 0xff3a2a, 0.6));
      const bl = blasting(d).filter((c) => c.mesh.parent);
      bl.forEach((c) => {
        removeFx(c.mesh);
        strongFlash(circleMesh(c.x, c.z, c.r, 0x9fd0ff, 0.55));
      });
      const ok = judge(`龍閃炮（第 ${i + 1} 發）`, (m) => {
        if (inBeam(m, d))
          return m === tg
            ? `${who(m)} 被自己引導的龍閃炮打到：直線出現後要往旁邊閃。`
            : `${who(m)} 站在龍閃炮的直線上（${where(m)}）：要站在被點名的人的另一側。`;
        const c = bl.find((c) => dist(m, c) < c.r);
        return c ? `${who(m)} 被光束引爆的${c.big ? '大' : '小'}結晶炸到（${where(c)}）：光束經過的結晶會爆炸，要離遠一點。` : '';
      });
      if (!ok) return;
      setTag(tg, '');
      dodged = false;
      cur = i + 1;
      if (i === 0) {
        setTag(tgs[1], '龍閃炮', '#ff9a7a');
        stackMark(h1, '#fff6c8', '白光');
        stackMark(h2, '#fff6c8', '白光');
        advice = `第 2 發點名 ${tgs[1].id}，往西：${tgs[1].id} 去西邊；其他人到東邊分兩組分攤（MT 組靠王、ST 組遠離王）。`;
      }
      if (i === 1) {
        if (!resolveStacks('白光（分攤）', [h1, h2], 3)) return;
        setTag(tgs[2], '龍閃炮', '#ff9a7a');
        advice = `第 3 發點名 ${tgs[2].id}，往東：${tgs[2].id} 去東邊；其他人回西邊，打完後馬上散開（龍光擴散）。`;
      }
      if (i === 2) {
        spread = true;
        spreadOmens(2.7);
        at(t + 2.6, () => {
          if (state !== 'running') return;
          if (!resolveSpread('龍光擴散')) return;
          crystals.forEach((c) => c.mesh.parent && removeFx(c.mesh));
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
