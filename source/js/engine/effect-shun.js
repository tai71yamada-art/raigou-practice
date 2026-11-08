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
async function primShun(actor, handSlot, locA, locB){
  const p = P(actor);
  const t = p.hand[handSlot];
  if(!t) return false;
  const a = locTile(locA), b = locTile(locB);
  if(!a || !b) return false;
  await playCutIn('瞬', actor);
  const labelA = locLabel(locA, a);
  const labelB = locLabel(locB, b);
  const rectA = fxLocRect(locA, a), rectB = fxLocRect(locB, b);
  const htmlA = fxLocFaceUp(locA, locB) ? tileHtml(a, '', { ntid:true }) : backHtml(null);
  const htmlB = fxLocFaceUp(locB, locA) ? tileHtml(b, '', { ntid:true }) : backHtml(null);
  if(G.kn){
    [[locA, a], [locB, b]].forEach(function(x){
      const loc = x[0], tile = x[1];
      if(loc.zone === 'canyon'){ G.kn[0].add(tile.id); G.kn[1].add(tile.id); }
      else if(loc.pi !== undefined){ G.kn[loc.pi].add(tile.id); G.kn[actor].add(tile.id); }
    });
  }
  locSet(locA, b); locSet(locB, a);
  if(actor !== 0 && [locA, locB].some(function(l){ return l.pi === 0 && (l.zone === 'body' || l.zone === 'hand'); })) setMeFace('hit');
  sortBody(P(0)); sortBody(P(1));
  consumeHand(p, handSlot);
  log(p.name + 'の瞬で' + labelA + 'と' + labelB + 'が入れ替わりました。');
  // 2個の駒が入れ替わる動き（同時にすれ違う）と、入れ替わった後の体内の整列を並行して見せる
  const bodyAnimP = render();
  const jobs = [bodyAnimP];
  if(rectA && rectB && !REDUCED_MOTION){
    jobs.push(fxMoveClone(rectA, rectB, 38, htmlA));
    jobs.push(fxMoveClone(rectB, rectA, 38, htmlB));
  }
  await Promise.all(jobs);
  return true;
}
function shunLocKey(loc){
  return loc.zone + ':' + (loc.pi===undefined ? '' : loc.pi) + ':' + loc.idx;
}

