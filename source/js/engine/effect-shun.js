/* ================= 瞬 ================= */
/* loc: {zone:'body'|'hand'|'canyon', pi, idx} */
function locTile(loc){
  if(loc.zone==='canyon') return G.canyon[loc.idx];
  const p = P(loc.pi);
  return loc.zone==='body' ? p.body[loc.idx] : p.hand[loc.idx];
}
function locSet(loc, t){
  if(loc.zone==='canyon'){ G.canyon[loc.idx] = t; return; }
  const p = P(loc.pi);
  if(loc.zone==='body') p.body[loc.idx] = t; else p.hand[loc.idx] = t;
}
function locLabel(loc, tile){
  const nm = '「' + tileLabel(tile) + '」';
  if(loc.zone === 'canyon') return '峡谷の' + nm;
  const owner = P(loc.pi);
  if(loc.zone === 'body') return owner.name + 'の体内の' + nm;
  return owner.name + 'の手の' + nm;
}
async function primShun(actor, handSlot, locA, locB){
  const p = P(actor);
  const t = p.hand[handSlot];
  if(!t) return false;
  const a = locTile(locA), b = locTile(locB);
  if(!a || !b) return false;
  await VIEW.playCutIn('瞬', actor);
  const labelA = locLabel(locA, a);
  const labelB = locLabel(locB, b);
  const fxTok = VIEW.fxShunBefore(locA, a, locB, b);   // 入れ替わる前の位置を演出用に控える
  if(G.kn){
    [[locA, a], [locB, b]].forEach(function(x){
      const loc = x[0], tile = x[1];
      if(loc.zone === 'canyon'){ G.kn[0].add(tile.id); G.kn[1].add(tile.id); }
      else if(loc.pi !== undefined){ G.kn[loc.pi].add(tile.id); G.kn[actor].add(tile.id); }
    });
  }
  locSet(locA, b); locSet(locB, a);
  if(actor !== 0 && [locA, locB].some(function(l){ return l.pi === 0 && (l.zone === 'body' || l.zone === 'hand'); })) VIEW.setMeFace('hit');
  sortBody(P(0)); sortBody(P(1));
  consumeHand(p, handSlot);
  log(p.name + 'の瞬で' + labelA + 'と' + labelB + 'が入れ替わりました。');
  // 2個の駒が入れ替わる動き（同時にすれ違う）と、入れ替わった後の体内の整列を並行して見せる
  const bodyAnimP = VIEW.render();
  await Promise.all([bodyAnimP, VIEW.fxShunAfter(fxTok)]);
  return true;
}

