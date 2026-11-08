/* ================= 禁忌 ================= */
/* 選を迎えた時に満杯なら、陽玉-1・内駒を2個捨てる。捨てる駒はコールバックで選ぶ */
async function applyTaboo(pi, chooseDiscards){
  const p = P(pi);
  p.score -= 1;
  if(G.penaltyCounts) G.penaltyCounts[pi]++;
  log(p.name + 'は満杯のまま選を迎えたので禁忌です。陽玉-1点（残り' + p.score + '点）。内駒を2個捨てます。', 'bad');
  VIEW.render();
  await VIEW.fxTabooBanner(pi);
  if(checkLose(pi)) return false;
  const discards = await chooseDiscards(p);
  discards.forEach(function(t){
    removeInner(pi, t);
    G.canyon.push(t);
    log(p.name + 'は「' + tileLabel(t) + '」を捨てました。', 'sys');
  });
  sortBody(p);
  // 捨てた後に残った体内が詰まって並び替わる動きを見せてから選へ進む
  await VIEW.render();
  return true;
}
function removeInner(pi, t){
  const p = P(pi);
  let i = p.body.indexOf(t); if(i>=0){ p.body.splice(i,1); return; }
  i = p.hand.indexOf(t); if(i>=0){ p.hand[i] = null; return; }
}
function innerTiles(p){
  return p.body.concat(p.hand.filter(Boolean));
}

