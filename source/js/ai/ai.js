/* ================= AI ================= */
function availFor(){
  const lv = diffLevel();
  if(lv >= 5) return unknownAvail(AI_SEAT); // Lv.5（従来のつよい）：常に峡谷を数えて残りを考える
  if(lv === 4){
    // Lv.4はLv.3（数えない）とLv.5（常に数える）の中間：手番ごとに半々の確率で数える（手番内では一貫させる）
    if(G._availTurn !== G.turnNo){ G._availTurn = G.turnNo; G._availUse = Math.random() < 0.5; }
    return G._availUse ? unknownAvail(AI_SEAT) : null;
  }
  return null;
}
function unknownAvail(aiIdx){
  const full = {};
  GEN_DEF.forEach(function(d){ full[d.w] = (full[d.w]||0) + d.n; });
  ON_DEF.forEach(function(d){ full[d.w] = (full[d.w]||0) + 4; });
  const sub = function(t){ full[t.w]--; };
  G.canyon.forEach(sub);
  G.released.forEach(function(e){ e.tiles.forEach(sub); });
  for(let pi=0; pi<2; pi++) P(pi).gates.forEach(function(g){ g.forEach(function(t){ if(pi === aiIdx || aiKnows(t, aiIdx)) sub(t); }); });
  P(aiIdx).body.forEach(sub);
  P(aiIdx).hand.filter(Boolean).forEach(sub);
  return full;
}
function completionBest(tiles, avail){
  const n = tiles.length;
  if(n >= 6) return scoreTower(tiles).pts;
  let best = scoreTower(tiles).pts;
  const need = 6 - n;
  const topW = tiles[n-1].w;
  const seq = [];
  (function rec(maxW, left){
    if(left === 0){
      ['gen','on'].forEach(function(k){
        const added = seq.map(function(w, i){ return { kind:k, name:'仮' + i, w:w }; });
        const pts = scoreTower(tiles.concat(added)).pts;
        if(pts > best) best = pts;
      });
      return;
    }
    for(let w=maxW; w>=1; w--){
      if(avail){
        let usedW = 0; seq.forEach(function(x){ if(x===w) usedW++; });
        if((avail[w]||0) <= usedW) continue;
      }
      seq.push(w); rec(w, left-1); seq.pop();
    }
  })(topW, need);
  return best;
}
function towerValue(tiles, avail){
  const n = tiles.length;
  if(!n) return 0;
  const cur = scoreTower(tiles).pts;
  if(n >= 6) return cur;
  let v = cur;
  if(n < 3){
    const ws = tiles.map(function(t){ return t.w; });
    if(ws.every(function(w){ return w===ws[0]; })) v += 0.35 * n;
    else {
      const uniq = new Set(ws).size === ws.length;
      const s = ws.slice().sort(function(a,b){ return a-b; });
      const span = s[s.length-1] - s[0];
      if(uniq && span <= 5) v += 0.3 * n;
      else if(uniq && ws.every(function(w){ return w%2===ws[0]%2; }) && span <= 10) v += 0.28 * n;
      else v += 0.08 * n;
    }
    // 上に積める余地（完成見込み）も少し織り込む。軽い駒で塞がれた塔は伸びない
    v += Math.max(0, completionBest(tiles, avail) - cur) * 0.04;
  } else {
    const cb = completionBest(tiles, avail);
    v += Math.max(0, cb - cur) * (n===5 ? 0.5 : n===4 ? 0.35 : 0.25);
  }
  return v;
}

/* 雷轟合戦でAIが自分の塔を選ぶ：一番上の駒が最も重い塔を優先し、同点なら役の点数が高い塔 */
function aiBattlePick(pi){
  const cands = goTowerCands(pi);
  let best = -1, bestKey = -1;
  cands.forEach(function(gi){
    const tw = P(pi).gates[gi];
    const top = tw[tw.length-1];
    const key = top.w * 1000 + scoreTower(tw).pts * 10 + tw.length;
    if(key > bestKey){ bestKey = key; best = gi; }
  });
  return best;
}
