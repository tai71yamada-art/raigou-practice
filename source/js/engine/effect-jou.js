/* ================= 浄 ================= */
/* 捨てて引き直すまでを行い、置き直し前の内駒プールを返す */
async function joDraw(actor, handSlot, discardTiles){
  const p = P(actor);
  const joTile = p.hand[handSlot];
  await VIEW.playCutIn('浄', actor);
  discardTiles.forEach(function(t){ removeInner(actor, t); G.canyon.push(t); });
  // 浄：捨てる駒を表示して消える演出（捨てた駒は峡谷で公開される）。
  // 残った体内が詰まる動きと並行して見せる
  if(discardTiles.length) await VIEW.fxJoDiscard(discardTiles);
  const drawn = drawTiles(discardTiles.length);
  const pool = innerTiles(p).filter(function(t){ return t !== joTile; }).concat(drawn);
  return { pool:pool, drawnCount:drawn.length, discardCount:discardTiles.length };
}
/* handTiles（最大2個）を手に、残りを体内に置く。浄は峡谷へ。poolはjoDrawが返した内駒プール（引いた駒を含む）。
   再配置後の体内が重さ順へ滑って整列する動きを見せてから次へ進むため async */
async function joArrange(actor, handSlot, handTiles, pool, counts){
  const p = P(actor);
  const joTile = p.hand[handSlot];
  markActed(p, handSlot);
  p.body = []; p.hand = p.hand.map(function(){ return null; });
  const rest = pool.slice();
  (handTiles||[]).forEach(function(t, i){
    const k = rest.indexOf(t);
    if(k>=0 && i<p.hand.length){ p.hand[i] = t; rest.splice(k,1); }
  });
  // 体内3・手の上限を守る：体内に入りきらない分は空いている手へ回す
  for(let s=0; s<p.hand.length && rest.length>BODY_MAX; s++){
    if(!p.hand[s]){ p.hand[s] = rest.pop(); }
  }
  p.body = rest; sortBody(p);
  discardUsed(joTile);
  if(actor === 0 && G.hatsuGame) G.hatsuGame['浄'] = (G.hatsuGame['浄'] || 0) + 1;
  G.used.add('浄');
  log(p.name + 'の浄：内駒を' + counts.discardCount + '個捨てて、' + counts.drawnCount + '個引き直し、置き直しました。');
  await VIEW.render();
  return true;
}
