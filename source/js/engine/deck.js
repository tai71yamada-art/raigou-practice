/* ================= 山・終了管理 ================= */
function drawTiles(n){
  const out = [];
  for(let i=0;i<n && G.deck.length>0;i++){ const t = G.deck.pop(); if(G.deckOpen) G.deckOpen.delete(t.id); out.push(t); }
  if(out.length) VIEW.sfx('draw');
  if(out.length > 0 && G.deck.length===0 && G.endIn===null && !G.over){
    /* 公式の終了手順（ルールブック11ページ・13ページ）：最後の駒を引いても即終了にしない。
       今の手番を最後まで行い、次に相手が選なしで最終手番を行い、次に最後の駒を引いた人が
       選なしでもう一度最終手番を行ってから終了する。手番終了は合計3回。 */
    G.endIn = 3;
    G.lastDrawer = G.turn;
    G.finalTurnActive = false;
    G.finalRound = true;
    log('雷山の最後の駒が引かれました。終了の合図です。雷山は0枚ですが、すぐには終わりません。今の手番を最後まで行い、その後、相手が選なしで最終手番を行い、最後に' + P(G.turn).name + 'が選なしでもう一度最終手番を行って対戦終了です。', 'sys');
  }
  return out;
}
function checkLose(pi){
  if(P(pi).score <= 0 && !G.over){
    G.over = true; G.phase = 'over';
    log(P(pi).name + 'の陽玉が0点になりました。', 'bad');
    finishGame(opp(pi), '陽玉が0点になったため、' + P(opp(pi)).name + 'の勝ちです。');
    return true;
  }
  return false;
}
