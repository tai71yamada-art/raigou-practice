/* ================= 積む ================= */
function canStack(p, gi, t){
  const tower = p.gates[gi];
  if(p.seals[gi]) return false;
  if(tower.length >= 6) return false;
  return true; // 重さの順番が合わない積み方も選べる（不穏の塔になる）
}
async function primStack(actor, handSlot, gi){
  const p = P(actor);
  const t = p.hand[handSlot];
  if(!t || !canStack(p, gi, t)) return false;
  p.hand[handSlot] = null;
  markActed(p, handSlot);
  p.gates[gi].push(t);
  VIEW.sfx('stack');
  if(p.isAI){
    log(p.name + 'は桜門' + (gi+1) + 'の塔に駒を積みました（' + p.gates[gi].length + '段）。');
  } else {
    log(p.name + 'は「' + tileLabel(t) + '」を桜門' + (gi+1) + 'に積みました（' + p.gates[gi].length + '段）。');
  }
  if(p.gates[gi].length >= 6){
    log(p.name + 'の桜門' + (gi+1) + 'が6段になりました。自動で解放します。');
    releaseTower(actor, gi, 0);
  }
  VIEW.render();
  return true;
}

