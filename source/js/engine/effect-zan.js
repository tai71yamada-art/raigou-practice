/* ================= 斬 ================= */
async function primZan(actor, handSlot, target){
  const p = P(actor);
  const t = p.hand[handSlot];
  if(!t) return false;
  await playCutIn('斬', actor);
  if(target.pi !== actor && await resolveJinDefense(target.pi, '斬', P(target.pi).name + 'の桜門' + (target.gi+1) + 'の塔の' + (target.end==='top' ? '一番上' : '一番下') + 'の駒')){
    consumeHand(p, handSlot); render(); return true;
  }
  const tp = P(target.pi);
  if(target.pi === 0 && actor !== 0) setMeFace('hit');
  const tower = tp.gates[target.gi];
  if(!tower.length) return false;
  const gateRectBefore = fxGateRect(target.pi, target.gi);
  const removed = (target.end === 'top') ? tower.pop() : tower.shift();
  G.canyon.push(removed);
  if(G.cutHints){ if(tower.length) G.cutHints[target.pi][target.gi].push({ w:removed.w, end:target.end }); else G.cutHints[target.pi][target.gi] = []; }
  consumeHand(p, handSlot);
  log(p.name + 'の斬：' + tp.name + 'の桜門' + (target.gi+1) + 'の塔の' + (target.end==='top' ? '一番上' : '一番下') +
      'の「' + tileLabel(removed) + '」を取り除きました（残り' + tower.length + '段）。');
  render();
  // 切られた箇所が切れ、駒が表になって峡谷へ消える動き（峡谷で公開されるため表向きでよい）
  await fxZanFx(removed, gateRectBefore, target.end);
  return true;
}

