/* ================= 駒が動く演出（蛇・瞬・浄）。ルール側からは VIEW 経由で呼ばれる ================= */
function fxLocRect(loc, tile){
  if(loc.zone === 'canyon') return fxRectOf('#canyonBtn');
  const el = document.querySelector('[data-tid="' + tile.id + '"]');
  return el ? el.getBoundingClientRect() : null;
}
function fxLocFaceUp(locFrom, locTo){
  // 峡谷は公開情報。自分の駒は表向き。相手の内駒同士の入れ替えだけ裏向きのまま
  if(locFrom.zone === 'canyon' || locTo.zone === 'canyon') return true;
  return locFrom.pi === 0 || locTo.pi === 0;
}
/* 蛇：奪われる駒の位置を控える → 奪った駒が手へ飛ぶ */
function fxHebiBefore(tile, faceUp){
  const el = document.querySelector('[data-tid="' + tile.id + '"]');
  return { rect: el ? el.getBoundingClientRect() : null, tile: tile, faceUp: faceUp };
}
function fxHebiAfter(tok, actor, handSlot){
  const handRect = fxRectOf('[data-hand="' + actor + ':' + handSlot + '"]');
  if(!tok || !tok.rect || !handRect) return Promise.resolve();
  return fxMoveClone(tok.rect, handRect, 40, tok.faceUp ? tileHtml(tok.tile, '', { ntid:true }) : backHtml(null));
}
/* 瞬：2個の駒の位置を控える → 同時にすれ違って入れ替わる */
function fxShunBefore(locA, a, locB, b){
  return {
    rectA: fxLocRect(locA, a), rectB: fxLocRect(locB, b),
    htmlA: fxLocFaceUp(locA, locB) ? tileHtml(a, '', { ntid:true }) : backHtml(null),
    htmlB: fxLocFaceUp(locB, locA) ? tileHtml(b, '', { ntid:true }) : backHtml(null)
  };
}
function fxShunAfter(tok){
  if(!tok || !tok.rectA || !tok.rectB || REDUCED_MOTION) return Promise.resolve();
  return Promise.all([fxMoveClone(tok.rectA, tok.rectB, 38, tok.htmlA), fxMoveClone(tok.rectB, tok.rectA, 38, tok.htmlB)]);
}
/* 浄：捨てる駒を中央に表示して消す。残った体内が詰まる動きと並行して見せる */
async function fxJoDiscard(discardTiles){
  const bodyAnimP = render();
  const layer = fxLayerEl();
  const row = document.createElement('div');
  row.className = 'fx-center-row';
  row.innerHTML = discardTiles.map(function(t){ return tileHtml(t, '', { ntid:true }); }).join('');
  layer.appendChild(row);
  await Promise.all([bodyAnimP, fxWait(860)]);
  row.remove();
}
