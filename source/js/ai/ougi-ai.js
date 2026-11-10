/* ================= AI：競技雷轟（開・奥義） ================= */
/* 開するかどうか。雷神化は手が1つ増えて内駒の上限も増えるので、開できる時は基本的にすぐ開く。
   Lv.1・Lv.2 はときどき見送る */
const AI_OUGI_LIKE = { '覇':1.0, '天':0.9, '啓':0.8, '和':0.6, '禅':0.7, '楼':0.9, '幻':0.6, '鳴':0.85, '赫':0.4, '涼':0.35, '風':0.7, '凛':0.7 };
function aiPickKai(){
  const p = P(AI_SEAT);
  if(!canKai(AI_SEAT)) return null;
  const lv = rawDiffLevel();
  if(lv === 1 && Math.random() < 0.5) return null;
  if(lv === 2 && Math.random() < 0.25) return null;
  let best = 0, bestV = -1;
  p.moon.forEach(function(t, i){ const v = (AI_OUGI_LIKE[t.name] || 0.5) + Math.random() * 0.4; if(v > bestV){ bestV = v; best = i; } });
  return { idx: best, dest: kaiDests(p)[0] };
}
/* 積む手の評価の調整：奥義駒はただの重さ9として積まない／開のために空いた桜門を埋める後押し */
function aiOugiStackAdjust(p, t, gi){
  let d = 0;
  if(t.ougi) d -= 0.9;
  if(!p.raijinka && p.moon && p.moon.length && !p.gates[gi].length && p.gates.filter(function(g){ return !g.length; }).length === 1) d += 0.5;
  return d;
}
function aiOwnVal(tiles, avail){ return !tiles.length ? 0 : (isFuon(tiles) ? -1 : towerValue(tiles, avail)); }
/* 手の奥義駒 t（手の場所 s）で打てる手を acts に足す */
function aiOugiActs(p, s, t, dp, avail, acts){
  if(G.used.has(t.name)) return;
  if(ougiUsable(AI_SEAT, s)) return;
  const me = AI_SEAT, opn = 1 - AI_SEAT;
  if(t.name === '覇'){
    ['top','bottom'].forEach(function(end){
      let g = 0;
      haTargets().forEach(function(tg){
        const tw = P(tg.pi).gates[tg.gi];
        const after = end === 'top' ? tw.slice(0, -1) : tw.slice(1);
        if(tg.pi === me) g += aiOwnVal(after, avail) - aiOwnVal(tw, avail);
        else g += aiTowerView(tg.pi, tg.gi, avail).val - (after.length ? aiTowerView(tg.pi, tg.gi, avail, after).val : 0);
      });
      if(g > 0.8) acts.push({ kind:'ougi', name:'覇', hand:s, end:end, gain: g * dp.zanFactor });
    });
  } else if(t.name === '天'){
    let best = null;
    const seen = {};
    tenTowers(me).forEach(function(gi){
      const tw = p.gates[gi], top = tw[tw.length - 1], base = aiOwnVal(tw, avail);
      tenSources(me, s).forEach(function(loc){
        const x = locTile(loc);
        if(!x || x === top) return;
        if(loc.zone !== 'canyon' && loc.pi !== me && !aiKnows(x, me)) return;   // 相手の内駒は、中身を知っている駒だけ
        const key = gi + ':' + loc.zone + ':' + (loc.zone === 'canyon' ? x.kind + x.name : loc.pi + ':' + x.id);
        if(seen[key]) return; seen[key] = 1;
        const nt = tw.slice(0, -1).concat([x]);
        if(isFuon(nt)) return;
        /* 先に軽い計算でふるいにかける：今の点が上がるか、不穏の塔が直る入れ替えだけを詳しく見る */
        if(!(isFuon(tw) || scoreTower(nt).pts > scoreTower(tw).pts)) return;
        let g = towerValue(nt, avail) - base;
        if(loc.zone !== 'canyon' && loc.pi === me) g += (aiTileDesire(top, p) - aiTileDesire(x, p)) * 0.3;
        if(loc.zone !== 'canyon' && loc.pi === opn) g += 0.2;
        if(!best || g > best.gain) best = { kind:'ougi', name:'天', hand:s, gi:gi, loc:loc, gain:g };
      });
    });
    if(best && best.gain > 0.7) acts.push(best);
  } else if(t.name === '啓'){
    let best = null;
    keiTargets().forEach(function(tg){
      const tw = P(tg.pi).gates[tg.gi], dest = emptyGates(tg.pi)[0];
      for(let k = 1; k <= tw.length - 1; k++){
        const lower = tw.slice(0, k), upper = tw.slice(k);
        let g;
        if(tg.pi === me) g = aiOwnVal(lower, avail) + aiOwnVal(upper, avail) - aiOwnVal(tw, avail);
        else g = aiTowerView(tg.pi, tg.gi, avail).val - aiTowerView(tg.pi, tg.gi, avail, lower).val - aiTowerView(tg.pi, tg.gi, avail, upper).val;
        if(!best || g > best.gain) best = { kind:'ougi', name:'啓', hand:s, target:tg, k:k, part:'top', dest:dest, gain:g };
      }
    });
    if(best && best.gain > 0.7) acts.push(best);
  } else if(t.name === '和'){
    /* 重さの合計が11か33の塔だけ（それ以外は陽玉が減る） */
    waTowers(me).forEach(function(gi){
      const tw = p.gates[gi], r = waResult(tw);
      if(r.delta <= 0) return;
      const g = r.delta - Math.max(0, aiOwnVal(tw, avail)) * 0.8;
      if(g > 0.6) acts.push({ kind:'ougi', name:'和', hand:s, gi:gi, gain:g });
    });
  } else if(t.name === '禅'){
    const g = aiZenGain(me);
    if(g > 0.5) acts.push({ kind:'ougi', name:'禅', hand:s, gain:g });
  } else if(t.name === '楼'){
    if(G.actedSlots && G.actedSlots.size) return;
    let best = null;
    rouTowers(me).forEach(function(gi){
      const tw = p.gates[gi], base = aiOwnVal(tw, avail);
      const r = aiBestOrder(tw, avail);
      const g = r.val - base - 0.8;   // 一発奥義なので、この手番のほかの手をあきらめる分を引く
      if(!best || g > best.gain) best = { kind:'ougi', name:'楼', hand:s, gi:gi, order:r.order, gain:g };
    });
    if(best && best.gain > 0.4) acts.push(best);
  } else if(t.name === '幻'){
    /* 中身は発するまで分からない。奥義駒を、まだ見ていない駒1個に替える手 */
    if(!G.finalRound && G.deck.length > 4) acts.push({ kind:'ougi', name:'幻', hand:s, gain:0.5 });
  } else if(t.name === '赫'){
    /* 相手の次の現を止める。自分の次の現も止まるので、その分を引く */
    const q = P(1 - me);
    const oppMv = Math.min(GEN_MAX, q.body.length, q.hand.filter(function(x){ return !x; }).length);
    const myMv = Math.min(GEN_MAX, p.body.length, p.hand.filter(function(x, k){ return !x || k === s; }).length);
    const g = 0.45 * oppMv - 0.3 * myMv;
    if(g > 0.35) acts.push({ kind:'ougi', name:'赫', hand:s, gain:g });
  } else if(t.name === '涼'){
    /* 相手の分からない内駒が見える分と、自分の内駒が見られる分 */
    const q = P(1 - me);
    const oppUnknown = q.body.concat(q.hand.filter(Boolean)).filter(function(x){ return !aiKnows(x, me); }).length;
    const mine = p.body.length + p.hand.filter(function(x, k){ return x && k !== s; }).length;
    const g = 0.22 * oppUnknown - 0.1 * mine;
    if(g > 0.4) acts.push({ kind:'ougi', name:'涼', hand:s, gain:g });
  } else if(t.name === '風'){
    if(!G.finalRound) acts.push({ kind:'ougi', name:'風', hand:s, gain:0.55 });
  } else if(t.name === '凛'){
    const pOn = aiRinOnProb(me);
    rinTowers(me).forEach(function(gi){
      const tw = p.gates[gi], pts = scoreTower(tw).pts;
      /* 塔の点数は解放できて初めて手に入るので、今の点数は少し割り引いて考える。伸ばせる見込みも一部足す */
      const keep = 0.75 * pts + (G.finalRound ? 0 : 0.25) * Math.max(0, aiOwnVal(tw, avail) - pts);
      const g = pOn * (pts + 2) - keep;
      if(g > 0.15) acts.push({ kind:'ougi', name:'凛', hand:s, gi:gi, gain:g });
    });
  }
}
/* 凛：雷山の一番上が音無である見込み（表向きなら確実に分かる） */
function aiRinOnProb(me){
  const top = deckOpenTop();
  if(top.length) return top[0].kind === 'on' ? 1 : 0;
  const un = withSeat(me, function(){ return aiUnseenByName(P(me)); });
  let gen = 0; Object.keys(un.cnt).forEach(function(k){ gen += Math.max(0, un.cnt[k]); });
  return Math.max(0, Math.min(1, (un.total - gen) / un.total));
}
/* 禅で相手に渡す駒と、受け取る駒の見込み */
function aiZenGain(me){
  const p = P(me), q = P(1 - me);
  const give = zenChoices(me).map(function(i){ return p.body[i]; });
  const giveV = give.length ? Math.min.apply(null, give.map(function(t){ return aiTileDesire(t, p); })) : 0;
  let recvV = 0;
  const rc = zenChoices(1 - me);
  if(rc.length){
    const known = rc.map(function(i){ return q.body[i]; }).filter(function(t){ return aiKnows(t, me); });
    recvV = known.length ? Math.max.apply(null, known.map(function(t){ return aiTileDesire(t, p); })) : 0.45;
  }
  return recvV - giveV + (rc.length ? 0.25 : 0);   // 相手の一番重い駒を取り上げる分を少し足す
}
function aiZenPick(pi, choices){
  return withSeat(pi, function(){ return aiZenPickRaw(pi, choices); });
}
function aiZenPickRaw(pi, choices){
  const p = P(pi);
  let best = choices[0], bv = Infinity;
  choices.forEach(function(i){ const v = aiTileDesire(p.body[i], p); if(v < bv){ bv = v; best = i; } });
  return best;
}
/* 楼：塔の並べ方を全部試して、いちばん価値が高い並び（不穏にならないもの）を探す */
function aiBestOrder(tw, avail){
  const n = tw.length, idx = tw.map(function(_, i){ return i; });
  let best = { val:-Infinity, order:idx.slice() };
  const seen = {};
  (function perm(cur, rest){
    if(!rest.length){
      const tiles = cur.map(function(i){ return tw[i]; });
      const key = tiles.map(function(t){ return t.kind + t.name; }).join(',');
      if(seen[key]) return; seen[key] = 1;
      if(isFuon(tiles)) return;
      const v = n >= 6 ? scoreTower(tiles).pts : towerValue(tiles, avail);
      if(v > best.val) best = { val:v, order:cur.slice() };
      return;
    }
    for(let k = 0; k < rest.length; k++){ cur.push(rest[k]); perm(cur, rest.slice(0, k).concat(rest.slice(k + 1))); cur.pop(); }
  })([], idx);
  if(best.val === -Infinity) best.val = -1;
  return best;
}
function aiOugiText(act){
  const who = function(pi){ return pi === AI_SEAT ? '自分' : 'あなた'; };
  if(act.name === '覇') return '奥義「覇」：全ての塔の' + (act.end === 'top' ? '一番上' : '一番下') + 'を捨てる';
  if(act.name === '天') return '奥義「天」：自分の桜門' + (act.gi + 1) + 'の塔の一番上を入れ替える';
  if(act.name === '啓') return '奥義「啓」：' + who(act.target.pi) + 'の桜門' + (act.target.gi + 1) + 'の塔を2つに分ける';
  if(act.name === '和') return '奥義「和」：自分の桜門' + (act.gi + 1) + 'の塔を公開する';
  if(act.name === '禅') return '奥義「禅」：体内の最も重い駒を移し合う';
  if(act.name === '涼') return '奥義「涼」：全員の内駒を表向きにする';
  if(act.name === '風') return '奥義「風」：雷山から3個引き、1個を手に置く';
  if(act.name === '凛') return '奥義「凛」：自分の桜門' + (act.gi + 1) + 'の塔を公開して、雷山から1個引く';
  if(act.name === '幻') return '奥義「幻」：除外された駒を自分の内駒にする';
  if(act.name === '赫') return '奥義「赫」：次の手番は全員0現にする';
  if(act.name === '楼') return '奥義「楼」：自分の桜門' + (act.gi + 1) + 'の塔を積み直す';
  return '奥義';
}
async function aiOugiExecute(act, me){
  if(act.name === '覇') await primHa(me, act.hand, act.end);
  else if(act.name === '天') await primTen(me, act.hand, act.gi, act.loc);
  else if(act.name === '啓') await primKei(me, act.hand, act.target.pi, act.target.gi, act.k, act.part, act.dest);
  else if(act.name === '和') await primWa(me, act.hand, act.gi);
  else if(act.name === '禅') await primZen(me, act.hand, function(){ return Promise.resolve(withSeat(me, function(){ return aiZenGain(me) > 0.5; })); });
  else if(act.name === '楼') await primRou(me, act.hand, act.gi, act.order);
  else if(act.name === '幻') await primGen(me, act.hand, function(x, dests){
    return Promise.resolve(withSeat(me, function(){
      const hand = dests.filter(function(d){ return d.where === 'hand'; }), body = dests.filter(function(d){ return d.where === 'body'; });
      if(!body.length) return hand[0];
      if(!hand.length) return body[0];
      return aiTileDesire(x, P(me)) > 0.5 ? hand[0] : body[0];
    }));
  });
  else if(act.name === '赫') await primKaku(me, act.hand);
  else if(act.name === '涼') await primRyou(me, act.hand);
  else if(act.name === '風') await primKaze(me, act.hand, function(tiles){
    return Promise.resolve(withSeat(me, function(){
      let bi = 0, bv = -Infinity;
      tiles.forEach(function(x, i){ const v = aiTileDesire(x, P(me)); if(v > bv){ bv = v; bi = i; } });
      return bi;
    }));
  });
  else if(act.name === '凛') await primRin(me, act.hand, act.gi);
}
