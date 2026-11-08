/* ================= 蛇 ================= */
/* targetLoc: {pi, where:'body'|'hand', idx} idxはbody配列の位置 or 手のスロット */
async function primHebi(actor, handSlot, targetLoc){
  const p = P(actor);
  const t = p.hand[handSlot];
  if(!t) return false;
  const tp = P(targetLoc.pi);
  const _hebiHitMe = (targetLoc.pi === 0 && actor !== 0);
  await VIEW.playCutIn('蛇', actor);
  if(targetLoc.pi !== actor && await resolveJinDefense(targetLoc.pi, '蛇', tp.name + 'の' + (targetLoc.where==='body' ? '体内' : '手') + 'の駒1個')){
    consumeHand(p, handSlot); VIEW.render(); return true;
  }
  let stolen = null;
  if(targetLoc.where === 'body'){
    stolen = tp.body[targetLoc.idx];
    if(!stolen) return false;
  } else {
    stolen = tp.hand[targetLoc.idx];
    if(!stolen) return false;
  }
  // 奪われる駒の今の位置を演出用に控える（相手の駒どうしは裏向きのまま動かす）
  const fxTok = VIEW.fxHebiBefore(stolen, (targetLoc.pi === 0 || actor === 0));
  if(G.kn){ G.kn[actor].add(stolen.id); G.kn[targetLoc.pi].add(stolen.id); }
  if(_hebiHitMe) VIEW.setMeFace('hit');
  if(targetLoc.where === 'body') tp.body.splice(targetLoc.idx, 1);
  else tp.hand[targetLoc.idx] = null;
  consumeHand(p, handSlot);       // 蛇は峡谷へ
  p.hand[handSlot] = stolen;      // 空いた手に奪った駒
  if(targetLoc.pi === actor && p.isAI){
    // AIが自分の内駒を手に移した（蛇現）場合は、中身は相手には見えないので名前は伏せる
    log(p.name + 'の蛇：自分の' + (targetLoc.where==='body' ? '体内' : '手') + 'から駒を手に移しました。');
  } else if(targetLoc.pi === actor){
    log(p.name + 'の蛇：自分の' + (targetLoc.where==='body' ? '体内' : '手') + 'から「' + tileLabel(stolen) + '」を手に移しました。');
  } else if(p.isAI){
    log(p.name + 'の蛇で' + tp.name + 'の「' + tileLabel(stolen) + '」が奪われました（' + tp.name + 'の' + (targetLoc.where==='body' ? '体内' : '手') + 'から）。');
  } else {
    log(p.name + 'の蛇で相手の「' + tileLabel(stolen) + '」を奪いました（相手の' + (targetLoc.where==='body' ? '体内' : '手') + 'から）。');
  }
  sortBody(tp);
  // 奪った駒が空いた手へ移動する動きと、残った体内が詰まる動きを並行して見せる（どちらも確認できる速さ）
  const bodyAnimP = VIEW.render();
  await Promise.all([bodyAnimP, VIEW.fxHebiAfter(fxTok, actor, handSlot)]);
  return true;
}

