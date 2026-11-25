/* =====================================================================
 * 機制清單：全程模式依這個順序執行，也可在「練習範圍」單選（id）或選整段（grp）
 * 新增機制時：在 mechanics/ 加檔案、在這裡加一行、在 index.html 的 #mode 選單加選項。
 * 順序照子言姐姐影片開頭的時間軸（上位鎖刃龍是固定時間軸）。
 * ===================================================================== */

const STEPS = [
  // P1
  { id: 'roar', grp: 'p1', name: '咆哮', fn: (n) => roar(n) },
  { id: 'blow', grp: 'p1', name: '鎖刃敲打 ×2', fn: (n) => chainBlow(n) },
  { id: 'siege', grp: 'p1', name: '鎖刃飛翔突進＋白光／龍光', fn: (n) => siegeflight(n) },
  { id: 'rattle', grp: 'p1', name: '黃圈＋鎖哭龍閃', fn: (n) => rattle(n) },
  { id: 'siege2', grp: 'p1', name: '鎖刃飛翔突進＋白光／龍光（第二次）', fn: (n) => siegeflight(n) },
  { id: 'blow2', grp: 'p1', name: '鎖刃敲打 ×2', fn: (n) => chainBlow(n) },
  { id: 'rush', grp: 'p1', name: '突進＆龍閃 ×3', fn: (n) => rush(n) },
  { id: 'ouro', grp: 'p1', name: '回旋鎖刃【龍閃】＋龍光擴散', fn: (n) => ouroblade(n) },
  { id: 'tail', grp: 'p1', name: '甩尾突刺', fn: (n) => steeltail(n) },
  { id: 'charge', grp: 'p1', name: '鎖刃下揮（分攤）', fn: (n) => chainCharge(n) },
  { id: 'blow3', grp: 'p1', name: '鎖刃敲打 ×2', fn: (n) => chainBlow(n) },
  { id: 'roar2', grp: 'p1', name: '咆哮', fn: (n) => roar(n) },
  { id: 'tower', grp: 'p1', name: '護龍共振（踩塔）＋黃圈 ×3 → 波狀龍閃＋龍光擴散', fn: (n) => towerPhase(n, true) },
  // P2
  { id: 'fury', grp: 'p2', name: '護龍亂擊（轉場）', fn: (n) => forgedFury(n) },
  { id: 'chase', grp: 'p2', name: '鎖刃躍動（骰子 1～8）', fn: (n) => clamorousChase(n) },
  { id: 'tower2', grp: 'p2', name: '護龍共振（踩塔）＋黃圈 ×3', fn: (n) => towerPhase(n, false) },
  { id: 'weal', grp: 'p2', name: '龍閃炮 ×3＋白光＋龍光擴散', fn: (n) => wyvernsWeal(n) },
  { id: 'wrath', grp: 'p2', name: '鎖哭龍閃・改', fn: (n) => wrathRattle(n) },
  { id: 'blow4', grp: 'p2', name: '鎖刃敲打 ×2', fn: (n) => chainBlow(n) },
  { id: 'roar3', grp: 'p2', name: '咆哮', fn: (n) => roar(n) },
  { id: 'rush2', grp: 'p2', name: '突進＆龍閃 ×3', fn: (n) => rush(n) },
  { id: 'ouro2', grp: 'p2', name: '回旋鎖刃【龍閃】＋龍光擴散', fn: (n) => ouroblade(n) },
  { id: 'tail2', grp: 'p2', name: '甩尾突刺', fn: (n) => steeltail(n) },
  { id: 'charge2', grp: 'p2', name: '鎖刃下揮（分攤）', fn: (n) => chainCharge(n) },
  { id: 'blow5', grp: 'p2', name: '鎖刃敲打 ×2', fn: (n) => chainBlow(n) },
  { id: 'roar4', grp: 'p2', name: '咆哮', fn: (n) => roar(n) },
  { id: 'tower3', grp: 'p2', name: '護龍共振（踩塔）＋黃圈 ×3 → 波狀龍閃', fn: (n) => towerPhase(n, true) },
  { id: 'charge3', grp: 'p2', name: '鎖刃下揮（分攤）', fn: (n) => chainCharge(n) },
  { id: 'blow6', grp: 'p2', name: '鎖刃敲打 ×2', fn: (n) => chainBlow(n) },
  { id: 'siege3', grp: 'p2', name: '鎖刃飛翔突進＋白光／龍光', fn: (n) => siegeflight(n) },
  { id: 'rattle2', grp: 'p2', name: '黃圈＋鎖哭龍閃', fn: (n) => rattle(n) },
  { id: 'siege4', grp: 'p2', name: '鎖刃飛翔突進＋白光／龍光（第二次）', fn: (n) => siegeflight(n) },
  { id: 'blow7', grp: 'p2', name: '鎖刃敲打 ×2', fn: (n) => chainBlow(n) },
  { id: 'roar5', grp: 'p2', name: '咆哮', fn: (n) => roar(n) },
  { id: 'rush3', grp: 'p2', name: '突進＆龍閃 ×3', fn: (n) => rush(n) },
  { id: 'ouro3', grp: 'p2', name: '回旋鎖刃【龍閃】＋龍光擴散', fn: (n) => ouroblade(n) },
  { id: 'tail3', grp: 'p2', name: '甩尾突刺', fn: (n) => steeltail(n) },
  { id: 'charge4', grp: 'p2', name: '鎖刃下揮（分攤）', fn: (n) => chainCharge(n) },
  { id: 'blow8', grp: 'p2', name: '鎖刃敲打 ×2', fn: (n) => chainBlow(n) },
  { id: 'roar6', grp: 'p2', name: '咆哮 ×2', fn: (n) => roar(n, 2) },
  { id: 'enrage', grp: 'p2', name: '護龍亂擊（狂暴）', fn: (n) => forgedFury(n, true) },
];

// 「練習範圍」選單直接由 STEPS 產生，保證選單和全程順序一致
{
  const sel = $('mode');
  STEPS.forEach((s, i) => {
    const o = document.createElement('option');
    o.value = s.id;
    o.textContent = `${s.grp.toUpperCase()}-${String(i + 1).padStart(2, '0')}　${s.name}`;
    sel.appendChild(o);
  });
}
