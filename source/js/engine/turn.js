/* ================= 手番の進行 ================= */
function startTurn(){
  G.turnNo++;
  if(G.turnNo > 1 && typeof homuraTick === 'function') homuraTick();   // 奥義「焔」：隠駒が動いたので、炎上中の塔を燃やす
  G.used = new Set();
  G.actedSlots = new Set();
  G.ippatsu = false;
  G.kakuNow = !!(G.kakuZero && G.kakuZero[G.turn]);   // 奥義「赫」：この手番は0現
  if(G.kakuNow) G.kakuZero[G.turn] = false;
  G.genMoves = 0;
  G.phase = 'gen';
  G.isFinalTurn = !!(G.endIn !== null && G.finalTurnActive);
  VIEW.resetTurnUi();
  const p = cur();
  // 自分の手番の開始時点で残っている封印は、この手番の終わりに解ける
  p.seals = p.seals.map(function(s){ return s ? { old:true } : null; });
  logTurn(G.turnNo + '手番目：' + p.name + 'の手番' + (G.isFinalTurn ? '（最終手番です・選はありません）' : (G.finalRound ? '（雷山は尽きました。終了の合図が出ています）' : '')));
  VIEW.render();
  if(p.isAI){
    G.busy = true; VIEW.render();
    aiTurn();
  } else {
    G.busy = false; G.acting = true; VIEW.render();
    VIEW.humanFlow();
  }
}
/* 手に置いたままの駒の見張り（裏向きでも「同じ駒が置かれたまま」なのは見えている） */
function trackHandAge(){
  if(!G.handSince) G.handSince = [[null,null,null],[null,null,null]];
  for(let pi = 0; pi < 2; pi++){
    const hs = P(pi).hand;
    for(let k = 0; k < hs.length && k < 3; k++){
      const t = hs[k], rec = G.handSince[pi][k];
      if(!t) G.handSince[pi][k] = null;
      else if(!rec || rec.id !== t.id) G.handSince[pi][k] = { id:t.id, since:G.turnNo };
    }
  }
}
function handAge(pi, k){ const r = G.handSince && G.handSince[pi] && G.handSince[pi][k]; return r ? (G.turnNo - r.since) : 0; }
async function endTurn(){
  try{ trackHandAge(); }catch(_){}
  const p = cur();
  const actorPi = G.turn;
  // 自分の塔の古い封印を解く
  for(let gi=0; gi<3; gi++){
    if(p.seals[gi] && p.seals[gi].old){ p.seals[gi] = null; log(p.name + 'の桜門' + (gi+1) + 'の塔の封印が解けました。', 'sys'); }
  }
  if(G.over) return;
  // 「隠」の宣言：プレイヤーが隠ボタンを押した時も、AIが手番終了を選んだ時も、
  // 中央に「隠」のカットインを出してから次の手番へ移る
  log(p.name + 'は「隠」を宣言しました。', 'sys');
  await VIEW.playHideCutIn(actorPi);
  if(G.over) return;
  if(G.endIn !== null){
    G.endIn--;
    if(G.endIn <= 0){ G.isFinalTurn = false; finishGame(null, ''); return; }
    // 最後の駒を引いた手番が終わった後は、残りの手番はすべて選なしの最終手番
    G.finalTurnActive = true;
  }
  G.turn = opp(G.turn);
  startTurn();
}
function finishGame(forceWinner, reason){
  G.over = true; G.phase = 'over'; G.busy = false;
  if(forceWinner === null || forceWinner === undefined){
    if(G.finalRevealStarted) return;
    G.finalRevealStarted = true;
    log('対戦終了。最終手番が終わりました。先手から順に、残った塔を全部解放して開示します。', 'sys');
    VIEW.render();
    finishGameReveal();
    return;
  }
  VIEW.render();
  VIEW.showResult(forceWinner, reason);
}
async function finishGameReveal(){
  G.finishing = true;
  const order = [G.sente, opp(G.sente)];
  const labels = ['先手', '後手'];
  for(let step=0; step<2; step++){
    const pi = order[step];
    // 解放前に中身と結果を控える（解放すると塔が空になるため）
    const entries = [];
    for(let gi=0; gi<3; gi++){
      const tiles = P(pi).gates[gi].slice();
      if(!tiles.length) continue;
      if(isFuon(tiles)) entries.push({ gi:gi, tiles:tiles, kind:'fuon', pts:0, role:'', base:0, height:0, dye:0 });
      else { const s = scoreTower(tiles); entries.push({ gi:gi, tiles:tiles, kind:'normal', pts:s.pts, role:s.role, base:s.base, height:s.height, dye:s.dye }); }
    }
    // 解放のアニメーション：残っている塔に順に落雷の演出を見せる
    for(let k=0; k<entries.length; k++){
      await VIEW.fxLightning(pi, entries[k].gi);
    }
    // 実際に解放して得点を反映する（不穏のペナルティ集計も releaseTower 内で行う）
    entries.forEach(function(e){ releaseTower(pi, e.gi, 0); });
    VIEW.render();
    await VIEW.showFinalRevealModal(pi, labels[step], entries, P(pi).score);
  }
  G.finishing = false;
  const a = P(0), b = P(1);
  let winner, detail;
  if(a.score !== b.score){
    winner = a.score > b.score ? 0 : 1;
    detail = '陽玉は あなた ' + a.score + '点、AI ' + b.score + '点でした。';
  } else if(totalInner(a) !== totalInner(b)){
    winner = totalInner(a) < totalInner(b) ? 0 : 1;
    detail = '陽玉は同点（' + a.score + '点）。内駒の少ない方（あなた ' + totalInner(a) + '個、AI ' + totalInner(b) + '個）の勝ちです。';
  } else {
    winner = -1;
    detail = '陽玉も内駒の数も同じで、引き分けです。';
  }
  VIEW.render();
  VIEW.showResult(winner, detail);
}

