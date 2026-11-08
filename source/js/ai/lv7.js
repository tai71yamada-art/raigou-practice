/* ================= Lv.7：手番まるごとの判断 ================= */
function simSnap(){
  const s = { pl: [], used: new Set(G.used), hints: JSON.stringify(G.cutHints || null) };
  for(let pi = 0; pi < 2; pi++){
    const q = P(pi);
    s.pl.push({ hand: q.hand.slice(), body: q.body.slice(), gref: q.gates.slice(), gates: q.gates.map(function(g){ return g.slice(); }), seals: q.seals.slice(), score: q.score });
  }
  return s;
}
function simRestore(s){
  for(let pi = 0; pi < 2; pi++){
    const q = P(pi), d = s.pl[pi];
    for(let k = 0; k < d.hand.length; k++) q.hand[k] = d.hand[k];
    q.body.length = 0; d.body.forEach(function(t){ q.body.push(t); });
    for(let gi = 0; gi < 3; gi++){ q.gates[gi] = d.gref[gi]; q.gates[gi].length = 0; d.gates[gi].forEach(function(t){ q.gates[gi].push(t); }); }
    for(let gi = 0; gi < q.seals.length; gi++) q.seals[gi] = d.seals[gi];
    q.score = d.score;
  }
  G.used = new Set(s.used);
  G.cutHints = JSON.parse(s.hints);
}
/* 頭の中で1手適用する。結果が読めない手（蛇・瞬・浄）は terminal を返す */
function simApply(a, me, avail){
  const p = P(me), o = P(1 - me);
  const res = { terminal:false, bonus:0, attack:false };
  const take = function(slot){ const t = p.hand[slot]; p.hand[slot] = null; return t; };
  const releaseOwn = function(gi, plus){
    const tw = p.gates[gi];
    if(isFuon(tw)) p.score -= 1;
    else { const sc = scoreTower(tw).pts; p.score += sc + (sc > 0 ? plus : 0); }
    p.gates[gi] = []; p.seals[gi] = null;
    if(G.cutHints) G.cutHints[me][gi] = [];
  };
  switch(a.kind){
    case 'stack': {
      const t = take(a.hand);
      p.gates[a.gi] = p.gates[a.gi].concat([t]);
      if(p.gates[a.gi].length >= 6) releaseOwn(a.gi, 0);
      break;
    }
    case 'raigou': take(a.hand); take(a.partner); G.used.add('雷放'); releaseOwn(a.gi, 2); break;
    case 'rai': {
      take(a.hand); G.used.add(a.mode === 'hou' ? '雷放' : '雷停');
      const tg = a.target;
      if(tg.pi === me){ if(a.mode === 'hou') releaseOwn(tg.gi, 0); else p.seals[tg.gi] = { old:false }; }
      else {
        res.attack = true;
        if(a.mode === 'hou'){
          const v = aiTowerView(tg.pi, tg.gi, avail);
          o.score += v.fuon ? -1 : v.pts;
          o.gates[tg.gi] = []; o.seals[tg.gi] = null;
          if(G.cutHints) G.cutHints[tg.pi][tg.gi] = [];
        } else o.seals[tg.gi] = { old:false };
      }
      break;
    }
    case 'zan': {
      take(a.hand); G.used.add('斬');
      const tg = a.target, q = P(tg.pi), tw = q.gates[tg.gi];
      const removed = tg.end === 'top' ? tw[tw.length - 1] : tw[0];
      q.gates[tg.gi] = tg.end === 'top' ? tw.slice(0, -1) : tw.slice(1);
      if(tg.pi !== me){
        res.attack = true;
        if(G.cutHints && q.gates[tg.gi].length) G.cutHints[tg.pi][tg.gi] = G.cutHints[tg.pi][tg.gi].concat([{ w:removed.w, end:tg.end }]);
      }
      break;
    }
    default:
      take(a.hand);
      res.terminal = true;
      res.bonus = (a.gain || 0) * LV7_W.heur;
  }
  return res;
}
/* 局面評価（AI_SEAT から見た「手番が終わった時の盤面」の良さ） */
function aiEvalState(me, avail){
  const p = P(me), o = P(1 - me);
  const tw0 = G.tuneSeat && G.tuneSeat[me] && G.tuneSeat[me].W;   // テスト用の重みの上書き
  const W = tw0 ? Object.assign({}, LV7_W, tw0) : LV7_W;
  const endgame = G.finalRound || G.deck.length <= 4;
  let v = (p.score - o.score);
  /* 相手が次の手番で雷を持っていそうか（見えていない駒からの確率） */
  const un = aiUnseenByName(p);
  const nOpp = Math.min(innerCap(o), totalInner(o) + Math.min(2, G.deck.length));
  const pRai = probHasAny((un.cnt['雷'] || 0) + (un.cnt['霧'] || 0), nOpp, un.total);
  /* 一番高い塔（雷の的）を調べる */
  let maxLen = 0;
  for(let pi = 0; pi < 2; pi++) for(let gi = 0; gi < 3; gi++){ const L = P(pi).gates[gi].length; if(L >= 3 && !P(pi).seals[gi]) maxLen = Math.max(maxLen, L); }
  let myTop = 0, oppTop = 0;
  for(let gi = 0; gi < 3; gi++){
    if(p.gates[gi].length === maxLen && !p.seals[gi] && maxLen >= 3) myTop++;
    if(o.gates[gi].length === maxLen && !o.seals[gi] && maxLen >= 3) oppTop++;
  }
  for(let gi = 0; gi < 3; gi++){
    const tw = p.gates[gi];
    if(!tw.length) continue;
    if(isFuon(tw)){ v -= W.fuon * (endgame ? 1.1 : 1); continue; }
    const pts = scoreTower(tw).pts;
    if(endgame) v += pts + (G.finalRound ? 0 : (towerValue(tw, avail) - pts) * 0.3);
    else {
      const val = towerValue(tw, avail);
      v += W.pot * val;
      if(tw.length === 5 && !p.seals[gi]) v -= W.five;
      /* 一番高い塔が自分の見込みの高い塔だけなら、雷放されやすい */
      if(tw.length === maxLen && !p.seals[gi] && maxLen >= 3 && oppTop === 0){
        v -= W.expose * pRai * Math.max(0, val - pts) / Math.max(1, myTop);
      }
    }
  }
  for(let gi = 0; gi < 3; gi++){
    const tw = o.gates[gi];
    if(!tw.length) continue;
    const view = aiTowerView(1 - me, gi, avail);
    if(view.fuon){ v += W.fuon * 0.8; continue; }
    v -= W.oppPot * (endgame ? view.pts : view.val);
  }
  const stuck = aiStuckCount(p);
  v -= W.stuck * stuck;
  if(!G.finalRound && totalInner(p) >= innerCap(p)) v -= W.full;
  /* 見込みの高い塔がある間は陣を手に残す価値がある */
  const hasJin = p.hand.some(function(t){ return t && t.kind === 'gen' && (t.name === '陣' || t.name === '霧'); });
  if(hasJin && p.gates.some(function(tw){ return tw.length >= 3 && !isFuon(tw) && scoreTower(tw).pts >= 3; })) v += W.jinKeep;
  return v;
}
function aiCollect(){
  G._collectMode = (G._collectMode || 0) + 1;
  try{ const r = aiChooseAction(); return r || { acts:[], low:[], fuon:[] }; }
  finally { G._collectMode--; }
}
/* 攻撃が陣で防がれる見込み：相手の手に何手番も置かれたままの駒があれば高い */
function aiBlockProb(me){
  const o = P(1 - me);
  let p = 0;
  o.hand.forEach(function(t, k){ if(t) p = Math.max(p, handAge(1 - me, k) >= 2 ? 0.35 : 0.12); });
  return p;
}
function aiPlanTurn(acts, low, fuon){
  const me = AI_SEAT, avail = availFor();
  const all = acts.concat(low).concat(fuon);
  if(!all.length) return null;
  const snap = simSnap();
  const base = aiEvalState(me, avail);
  const pBlock = aiBlockProb(me);
  let best = null, bestV = base + 0.05;   // 何もしないより少しでも良い時だけ動く
  const scored = [];
  try{
    all.forEach(function(a){
      const r = simApply(a, me, avail);
      let v1 = aiEvalState(me, avail) + r.bonus;
      let v = v1;
      if(!r.terminal){
        /* 続けてもう1手 */
        const c2 = aiCollect();
        const all2 = c2.acts.concat(c2.low).concat(c2.fuon);
        const snap2 = simSnap();
        all2.forEach(function(b){
          const r2 = simApply(b, me, avail);
          const v2 = aiEvalState(me, avail) + r2.bonus;
          if(v2 > v) v = v2;
          simRestore(snap2);
        });
      }
      simRestore(snap);
      if(r.attack && pBlock > 0){
        /* 防がれたら駒を1つ失うだけ（＝手札が1つ減った盤面） */
        const t = P(me).hand[a.hand]; P(me).hand[a.hand] = null;
        const vb = aiEvalState(me, avail);
        P(me).hand[a.hand] = t;
        v = (1 - pBlock) * v + pBlock * vb;
      }
      scored.push({ a:a, v:v });
    });
  } finally { simRestore(snap); }
  scored.forEach(function(x){ if(x.v > bestV){ bestV = x.v; best = x.a; } });
  return best;
}
/* ---- Lv.6：内駒の行き場の数え ----
   不穏にならずに積める桜門が1つも無い内駒（体内・手）の数。gatesOverride で「この塔を空けたら」を試せる */
function aiStuckCount(p, gatesOverride){
  const gates = gatesOverride || p.gates;
  const tiles = p.body.concat(p.hand.filter(Boolean));
  let stuck = 0;
  tiles.forEach(function(t){
    let ok = false;
    for(let gi = 0; gi < 3 && !ok; gi++){
      if(p.seals[gi]) continue;
      const g = gates[gi];
      if(g.length >= 6) continue;
      if(!g.length || g[g.length-1].w >= t.w) ok = true;
    }
    if(!ok) stuck++;
  });
  return stuck;
}
/* ---- Lv.7：相手の次の手番で受けそうな斬・雷放による損失の見込み ----
   見えていない駒（雷山・相手の内駒・除外）から、相手の内駒（次の選で+2）に斬・雷（霧はどちらにもなる）が
   含まれる確率を出し、自分の塔ごとに「一番上か下を斬られた時」「雷放で早く解放された時」の損を見積もる。 */
function aiUnseenByName(me){
  const cnt = {};
  GEN_DEF.forEach(function(d){ cnt[d.name] = d.n; });
  let total = 0; Object.keys(cnt).forEach(function(k){ total += cnt[k]; });
  ON_DEF.forEach(function(d){ total += 4; });
  const sub = function(t){ if(t && cnt[t.name] !== undefined) cnt[t.name]--; if(t) total--; };
  G.canyon.forEach(sub);
  G.released.forEach(function(e){ e.tiles.forEach(sub); });
  for(let pi=0; pi<2; pi++) P(pi).gates.forEach(function(g){ g.forEach(function(t){ if(P(pi) === me || aiKnows(t, AI_SEAT)) sub(t); }); });
  me.body.forEach(sub); me.hand.filter(Boolean).forEach(sub);
  return { cnt:cnt, total:Math.max(1, total) };
}
function probHasAny(k, n, U){
  /* U枚の中にk枚の当たり。n枚引いて1枚以上当たる確率 */
  if(k <= 0 || n <= 0) return 0;
  if(n >= U) return 1;
  let miss = 1;
  for(let i = 0; i < n; i++){ miss *= Math.max(0, (U - k - i)) / (U - i); }
  return 1 - miss;
}
function aiThreatLoss(gates, seals, avail, pZan, pHou){
  let zanLoss = 0, houLoss = 0;
  for(let gi=0; gi<3; gi++){
    const tw = gates[gi];
    if(!tw.length || seals[gi] || isFuon(tw)) continue;
    const v = towerValue(tw, avail);
    ['top','bottom'].forEach(function(end){
      const after = end === 'top' ? tw.slice(0,-1) : tw.slice(1);
      zanLoss = Math.max(zanLoss, v - towerValue(after, avail));
    });
    houLoss = Math.max(houLoss, (v - scoreTower(tw).pts) * 0.85);
  }
  return pZan * zanLoss + pHou * houLoss;
}
function aiApplyLookahead(acts, p, o, avail, lambda, rel){
  if(G.finalRound) return;
  const un = aiUnseenByName(p);
  const n = Math.min(innerCap(o), totalInner(o) + Math.min(2, G.deck.length));
  const kiri = un.cnt['霧'] || 0;
  const pZan = probHasAny((un.cnt['斬'] || 0) + kiri, n, un.total);
  const pHou = probHasAny((un.cnt['雷'] || 0) + kiri, n, un.total);
  const base = aiThreatLoss(p.gates, p.seals, avail, pZan, pHou);
  acts.forEach(function(a){
    let gates = p.gates, seals = p.seals;
    if(a.kind === 'stack'){
      gates = p.gates.slice(); gates[a.gi] = p.gates[a.gi].concat([p.hand[a.hand]]);
      if(gates[a.gi].length >= 6) gates[a.gi] = [];
    } else if((a.kind === 'rai' && a.target.pi === AI_SEAT && a.mode === 'hou') || a.kind === 'raigou'){
      const gi = a.kind === 'raigou' ? a.gi : a.target.gi;
      gates = p.gates.slice(); gates[gi] = [];
    } else if(a.kind === 'rai' && a.target.pi === AI_SEAT && a.mode === 'tei'){
      seals = p.seals.slice(); seals[a.target.gi] = { old:false };
    } else if(a.kind === 'zan' && a.target.pi === AI_SEAT){
      gates = p.gates.slice(); gates[a.target.gi] = p.gates[a.target.gi].slice(0, -1);
    } else return;
    a._risk = aiThreatLoss(gates, seals, avail, pZan, pHou) - base;
  });
  if(rel){
    /* 同じ駒をどの塔に積むかの比べ合いだけに使う（積む・積まないの判断は変えない） */
    const minBy = {};
    acts.forEach(function(a){ if(a.kind === 'stack' && a._risk !== undefined){ const k = a.hand; minBy[k] = Math.min(minBy[k] === undefined ? 1e9 : minBy[k], a._risk); } });
    acts.forEach(function(a){ if(a.kind === 'stack' && a._risk !== undefined) a.gain -= lambda * (a._risk - minBy[a.hand]); else if(a._risk !== undefined && a._risk < 0) a.gain -= lambda * a._risk; });
  } else {
    acts.forEach(function(a){ if(a._risk !== undefined) a.gain -= lambda * a._risk; });
  }
}
/* AIの行動を上部の帯で知らせる */
let _aiBandTimer = null;
function aiBand(text){
  let el = document.getElementById('aiBand');
  if(!el){ el = document.createElement('div'); el.id = 'aiBand'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
  el.innerHTML = '<span class="ab-who">AI</span><span class="ab-txt">' + esc(text) + '</span>';
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  clearTimeout(_aiBandTimer);
  _aiBandTimer = setTimeout(function(){ el.classList.remove('show'); }, 1500 * aiSpeedFactor() + 500);
}
function aiActText(act){
  const who = function(pi){ return pi === AI_SEAT ? '自分' : 'あなた'; };
  const kiri = function(){ return act.via === '霧' ? '（霧でまねる）' : ''; };
  switch(act.kind){
    case 'stack':  return '積：桜門' + (act.gi + 1) + 'に積む（' + (P(AI_SEAT).gates[act.gi].length + 1) + '段目）';
    case 'rai':    return (act.mode === 'hou' ? '雷放' : '雷停') + kiri() + '：' + who(act.target.pi) + 'の桜門' + (act.target.gi + 1) + 'の塔へ';
    case 'raigou': return '雷轟解放：自分の桜門' + (act.gi + 1) + 'の塔へ';
    case 'zan':    return '斬' + kiri() + '：' + who(act.target.pi) + 'の桜門' + (act.target.gi + 1) + 'の塔の' + (act.target.end === 'top' ? '一番上' : '一番下') + 'を狙う';
    case 'hebi':   return '蛇' + kiri() + '：' + who(act.targetLoc.pi) + 'の' + (act.targetLoc.where === 'body' ? '体内' : '手') + 'の駒を狙う';
    case 'shun':   return '瞬：駒を2個入れ替える';
    case 'jo':     return '浄：内駒を捨てて引き直す';
  }
  return '行動中';
}
async function aiExecute(act, me){
  if(me === undefined) me = 1;
  switch(act.kind){
    case 'stack': await primStack(me, act.hand, act.gi); break;
    case 'raigou': G.used.add('雷放'); await primRaigou(me, act.hand, act.gi, act.partner); break;
    case 'rai': G.used.add(act.mode === 'hou' ? '雷放' : '雷停'); await primRai(me, act.hand, act.mode, act.target); break;
    case 'zan': G.used.add('斬'); await primZan(me, act.hand, act.target); break;
    case 'hebi': G.used.add('蛇'); await primHebi(me, act.hand, act.targetLoc); break;
    case 'shun': G.used.add('瞬'); await primShun(me, act.hand, act.locA, act.locB); break;
    case 'jo': {
      const res = await joDraw(me, act.hand, act.discards);
      const handTiles = withSeat(me, function(){ return res.pool.slice().sort(function(a,b){ return aiTileDesire(b, P(me)) - aiTileDesire(a, P(me)); }).slice(0, P(me).hand.length); });
      await joArrange(me, act.hand, handTiles, res.pool, res);
      break;
    }
  }
}

