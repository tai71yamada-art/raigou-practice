/* ================= AIから見た塔の見込み（相手の塔は中身を見ずに予想する） ================= */
/* 高さごとの見込み（AI同士の対戦で実測した平均）。on：役になっている割合、pts：役の時の平均点、
   valOn/valOff：役の時／役でない時の見込み点 */
const TOWER_PRIOR = {"1": {"on": 0.0, "pts": 0.0, "valOn": 0.0, "valOff": 0.64}, "2": {"on": 0.0, "pts": 0.0, "valOn": 0.0, "valOff": 0.82}, "3": {"on": 0.628, "pts": 1.8, "valOn": 2.83, "valOff": 0.69}, "4": {"on": 0.481, "pts": 2.59, "valOn": 3.56, "valOff": 0.84}, "5": {"on": 0.237, "pts": 3.8, "valOn": 4.18, "valOff": 0.92}};
function aiKnows(t, seat){ if(G.aiPeek && G.aiPeek[seat]) return true; return !!(t && ((G.kn && G.kn[seat] && G.kn[seat].has(t.id)) || (G.revealedTopIds && G.revealedTopIds.has(t.id)))); }
/* 分かっている重さ（位置つき）が、どれかの基本役（桜花・蓮花・偶数／奇数蓮花）と両立するか。
   塔は下から重い順に積む決まりなので、下から i 段目の重さは「一番下 − d×i」（d=0:桜花、1:蓮花、2:偶数・奇数蓮花） */
function roleFeasible(n, knownW){
  const ks = Object.keys(knownW).map(Number);
  if(!ks.length) return true;
  for(let d = 0; d <= 2; d++){
    const i0 = ks[0], base = knownW[i0] + d * i0;
    let ok = true;
    for(let k = 0; k < ks.length; k++){ if(knownW[ks[k]] !== base - d * ks[k]){ ok = false; break; } }
    if(!ok) continue;
    if(base - d * (n - 1) < 1) continue;   // 一番上が重さ1より軽くなる並びは無理
    return true;
  }
  return false;
}
function knownFuon(tiles, known){
  for(let i = 0; i < tiles.length; i++){
    if(!known[i]) continue;
    for(let j = i + 1; j < tiles.length; j++){ if(known[j] && tiles[j].w > tiles[i].w) return true; }
  }
  return false;
}
/* tiles と「分かっているか」の配列から見込みを出す */
function estTower(tiles, known, hints){
  const n = tiles.length;
  if(!n) return { pts:0, val:0, fuon:false, best:0, exact:true };
  if(known.every(Boolean)){
    return { pts:scoreTower(tiles).pts, val:towerValue(tiles, null), fuon:isFuon(tiles), best:completionBest(tiles, null), exact:true };
  }
  if(knownFuon(tiles, known)) return { pts:0, val:-1, fuon:true, best:0, exact:false };
  const kw = {}; let kc = 0;
  known.forEach(function(k, i){ if(k){ kw[i] = tiles[i].w; kc++; } });
  /* 斬られた駒は、その端にあった駒として役の予想に使う（一番上なら n 段目、一番下なら -1 段目） */
  let hc = 0;
  (hints || []).forEach(function(h){ if(h.end === 'top'){ kw[n + hc] = h.w; } else { const sh = {}; Object.keys(kw).forEach(function(k){ sh[Number(k) + 1] = kw[k]; }); for(const k in kw) delete kw[k]; Object.assign(kw, sh); kw[0] = h.w; } hc++; });
  const pr = TOWER_PRIOR[Math.min(n, 6)] || TOWER_PRIOR[5];
  const botHit = (hints || []).some(function(h){ return h.end === 'bottom'; }) && rawDiffLevel() >= 7;
  if(!roleFeasible(n + hc, kw)) return { pts:0, val:pr.valOff * 0.6, fuon:false, best:0, exact:false };
  /* 分かっている駒・手がかりが役と両立しているほど、役になっている見込みを上げる */
  const clue = Math.min(1, (kc + hc) / Math.max(1, n));
  const qOn = n < 3 ? 0 : pr.on + (1 - pr.on) * clue * 0.7;
  const pts = qOn * pr.pts;
  let val = qOn * pr.valOn + (1 - qOn) * pr.valOff;
  if(botHit) val *= LV7_W.botCut;   // 下を斬られた塔は、6段の役も積み直しも難しくなる
  return { pts:pts, val:val, fuon:false, best:Math.max(pts, val) * 1.15, exact:false };
}
function aiTowerView(pi, gi, avail, tilesOverride){
  const tw = tilesOverride || P(pi).gates[gi];
  if(pi === AI_SEAT || (G.aiPeek && G.aiPeek[AI_SEAT])){   // G.aiPeek はテスト専用（以前の「中身を見る」AIとの比較用）
    return { pts:scoreTower(tw).pts, val:towerValue(tw, avail), fuon:isFuon(tw), best:tw.length ? completionBest(tw, avail) : 0, exact:true };
  }
  const known = tw.map(function(t){ return aiKnows(t, AI_SEAT); });
  return estTower(tw, known, (G.cutHints && G.cutHints[pi] && G.cutHints[pi][gi]) || []);
}
/* その駒を手に持ちたい度合い（現・選の置き場所・捨て駒選びに使う） */
function aiTileDesire(t, p){
  const avail = availFor();
  let d = 0;
  for(let gi=0; gi<3; gi++){
    if(canStack(p, gi, t)){
      const nt = p.gates[gi].concat([t]);
      if(isFuon(nt)) continue; // AIは不穏の塔を作らない
      const before = towerValue(p.gates[gi], avail);
      const after = nt.length===6 ? scoreTower(nt).pts : towerValue(nt, avail);
      d = Math.max(d, 0.3 + (after - before));
    }
  }
  if(t.kind === 'gen'){
    const bonus = { '雷':0.85, '蛇':0.55, '斬':0.6, '陣':0.35, '轟':0.4, '霧':0.55, '瞬':0.5, '浄':0.45 };
    let b = bonus[t.name] || 0;
    if(t.ougi) b = 0.9;   // 奥義駒は手に持って発したい
    if(t.name==='雷' && !raiTargets().length) b = 0.1;
    if(t.name==='轟') b = Math.max(b, diffParams().goDesire);
    if(t.name==='陣') b = Math.max(b, diffParams().jinDesire);
    // 受け札は手に1枚まで。すでに陣か轟が手にある時は、もう1枚は手に持たない
    if((t.name==='陣' || t.name==='轟') && p.hand.some(function(h){ return h && (h.name==='陣' || h.name==='轟'); })) b = 0.1;
    d = Math.max(d, b);
  }
  return d;
}
function aiPickDiscards(p){
  const tiles = innerTiles(p).slice().sort(function(a,b){ return aiTileDesire(a,p) - aiTileDesire(b,p); });
  return tiles.slice(0, 2);
}
/* 轟の判断（AIが守る側） */
/* 相手が自分の塔に撃った雷に、AIが轟で割り込むかどうか。
   雷放：自分の役ができている塔を+2点で解放したい時／相手の大きな解放を止めたい時。
   雷停：相手が高い塔を封印で守ろうとしている時に、その守りを外す（封印は自分の一番価値の低い塔へ） */
function aiGoChoiceSelfTarget(attacker, defender, mode, targetGi, cands){
  const d = P(defender);
  const dp = diffParams();
  if(Math.random() < dp.miss) return null;
  const atkTower = P(attacker).gates[targetGi];
  if(mode === 'hou'){
    let bestGi = -1, bestPts = 0;
    cands.forEach(function(gi){ const s = scoreTower(d.gates[gi]); if(s.pts > bestPts){ bestPts = s.pts; bestGi = gi; } });
    if(bestGi >= 0) return { gi: bestGi };
    if(withSeat(defender, function(){ return aiTowerView(attacker, targetGi, null).pts; }) >= 3){
      let shortGi = -1, shortLen = 99;
      cands.forEach(function(gi){ if(d.gates[gi].length < shortLen){ shortLen = d.gates[gi].length; shortGi = gi; } });
      if(shortGi >= 0) return { gi: shortGi };
    }
    return null;
  }
  if(atkTower.length >= 4){
    let worstGi = -1, worstV = 1e9;
    cands.forEach(function(gi){ const v = towerValue(d.gates[gi], availFor()); if(v < worstV){ worstV = v; worstGi = gi; } });
    if(worstGi >= 0) return { gi: worstGi };
  }
  return null;
}
function aiGoChoice(defender, mode, targetGi, cands, hasJin){
  const d = P(defender);
  const dp = diffParams();
  if(mode === 'hou'){
    let bestGi = -1, bestPts = 0;
    cands.forEach(function(gi){
      const s = scoreTower(d.gates[gi]);
      if(s.pts > bestPts){ bestPts = s.pts; bestGi = gi; }
    });
    if(bestGi >= 0){
      if(Math.random() < dp.goMiss) { /* たまに移し損ねる（Lv.1:35%、Lv.2:17.5%、Lv.3〜:0%） */ }
      else return { type:'redirect', gi:bestGi };
    }
    const targetScore = scoreTower(d.gates[targetGi]);
    if(hasJin && targetScore.pts === 0 && Math.random() >= dp.jinHesitate) return { type:'jin' };
    return { type:'accept' };
  }
  let worstGi = -1, worstV = 1e9;
  cands.forEach(function(gi){
    const v = towerValue(d.gates[gi], availFor());
    if(v < worstV){ worstV = v; worstGi = gi; }
  });
  if(worstGi >= 0 && towerValue(d.gates[targetGi], availFor()) > worstV + 0.5) return { type:'redirect', gi:worstGi };
  if(hasJin && towerValue(d.gates[targetGi], availFor()) >= 2) return { type:'jin' };
  return { type:'accept' };
}

async function aiTurn(){
  const me = G.turn;
  const p = P(me);
  await VIEW.aiWait(650);
  if(G.over) return;
  if(rulesNow().ougi){
    const kai = withSeat(me, aiPickKai);
    if(kai){ VIEW.aiBand('開：月の奥義駒を開いて雷神化'); await VIEW.aiWait(350); await doKai(me, kai.idx, kai.dest); await VIEW.aiWait(350); if(G.over) return; }
  }
  { const b0 = p.body.length; withSeat(me, aiGen); const mv = b0 - p.body.length;
    VIEW.aiBand(mv > 0 ? '現：体内の駒を' + mv + '個、手に移した' : '現：0現（手に移さない）'); }
  // 現で残った体内（裏向き）が詰まる動きを、プレイヤーが追える速さで見せる
  await VIEW.render();
  await VIEW.aiWait(350);
  if(G.over) return;
  if(!(G.finalRound || G.deck.length === 0)){
    if(totalInner(p) >= innerCap(p)){
      const ok = await applyTaboo(me, function(pp){ return Promise.resolve(withSeat(me, function(){ return aiPickDiscards(pp); })); });
      if(!ok || G.over) return;
    }
    { const d0 = G.deck.length; withSeat(me, aiSen); const n = d0 - G.deck.length;
      if(n > 0) VIEW.aiBand('選：雷山から' + n + '個引いた（' + (n === 2 ? '二選' : '一選') + '）'); }
    // 選で引いた駒が体内で重さ順に整列する動き（裏向きのまま）を見せる
    await VIEW.render();
    await VIEW.aiWait(350);
  }
  let guard = 0;
  const maxActs = withSeat(me, diffParams).maxActs;
  while(guard++ < maxActs){
    if(G.over) return;
    const act = withSeat(me, aiChooseAction);
    if(!act) break;
    VIEW.aiBand(withSeat(me, function(){ return aiActText(act); }));
    await VIEW.aiWait(450);
    await aiExecute(act, me);
    VIEW.render();
    await VIEW.aiWait(520);
  }
  if(G.over) return;
  G.busy = false;
  endTurn();
}
function aiGen(){
  const p = P(AI_SEAT);
  let moves = 0;
  while(moves < 2){
    const slot = p.hand.indexOf(null);
    if(slot < 0) break;
    let bestIdx = -1, bestU = 0.32;
    p.body.forEach(function(t, idx){
      const u = aiTileDesire(t, p);
      if(u > bestU){ bestU = u; bestIdx = idx; }
    });
    if(bestIdx < 0) break;
    const t = p.body.splice(bestIdx, 1)[0];
    p.hand[slot] = t;
    moves++;
    log('AIは現：体内の駒を手に移しました。', 'sys');
  }
}
function aiSen(){
  const p = P(AI_SEAT);
  const cap = innerCap(p) - totalInner(p);
  let n = Math.min(2, cap, G.deck.length);
  const dpSen = diffParams();
  if(Math.random() < dpSen.senOneProb) n = Math.min(1, cap, G.deck.length); // Lv.1は半々、Lv.2は1/4の確率で1枚だけ引く
  // 終盤に負けている時は山を残す：Lv.5は残り10枚から、Lv.4は中間として残り6枚から
  const endgameDeck = dpSen.lv === 5 ? 10 : (dpSen.lv === 4 ? 6 : -1);
  if(endgameDeck > 0 && G.deck.length <= endgameDeck && p.score < P(1-AI_SEAT).score){
    n = Math.min(1, cap, G.deck.length); // 負けている時は山を残す
  }
  // 手の駒がどれも積めない時は、引く数を抑えて満杯を先送りする
  if(totalInner(p) === innerCap(p) - 2 && n === 2){
    const anyStackable = p.hand.some(function(t){
      return t && [0,1,2].some(function(gi){ return canStack(p, gi, t); });
    });
    if(!anyStackable) n = 1;
  }
  if(dpSen.senClog > 0 && n === 2 && aiStuckCount(p) >= dpSen.senClog) n = 1;
  if(dpSen.endSen > 0 && G.deck.length <= 10){
    if(p.score > P(1-AI_SEAT).score) n = Math.min(2, cap, G.deck.length);
    else if(p.score < P(1-AI_SEAT).score) n = Math.min(1, cap, G.deck.length);
  }
  if(n <= 0) return;
  const drawn = drawTiles(n);
  log('AIは選：雷山から' + drawn.length + '個引きました。', 'sys');
  drawn.forEach(function(t){
    const slot = p.hand.indexOf(null);
    if(slot >= 0 && (aiTileDesire(t, p) > 0.5 || p.body.length >= 3)) p.hand[slot] = t;
    else if(p.body.length < 3) p.body.push(t);
    else if(slot >= 0) p.hand[slot] = t;
  });
  sortBody(p);
}
function aiHebiTarget(){
  const human = P(1-AI_SEAT), p = P(AI_SEAT);
  const locs = [];
  human.body.forEach(function(t, i){ locs.push({ pi:1-AI_SEAT, where:'body', idx:i }); });
  human.hand.forEach(function(t, i){ if(t) locs.push({ pi:1-AI_SEAT, where:'hand', idx:i }); });
  if(!locs.length){
    if(p.body.length) return { pi:AI_SEAT, where:'body', idx:Math.floor(Math.random()*p.body.length) };
    return null;
  }
  if(diffParams().hebiOld > 0){
    const olds = locs.filter(function(l){ return l.where === 'hand' && handAge(l.pi, l.idx) >= 2; });
    if(olds.length){ olds.sort(function(a,b){ return handAge(b.pi, b.idx) - handAge(a.pi, a.idx); }); return olds[0]; }
  }
  // 狙いの正確さ：Lv.5は的確に狙い、Lv.4はその半分ほどの確率で的確に狙う。Lv.3以下はランダム
  const smartProb = diffLevel() === 5 ? 1 : (diffLevel() === 4 ? 0.5 : 0);
  if(Math.random() < smartProb){
    const handLocs = locs.filter(function(l){ return l.where==='hand'; });
    if(handLocs.length && Math.random() < 0.6) return handLocs[Math.floor(Math.random()*handLocs.length)];
    const bodyLocs = locs.filter(function(l){ return l.where==='body'; });
    if(bodyLocs.length) return bodyLocs[bodyLocs.length-1]; // 体内の一番上＝軽い駒を狙う
    return handLocs[0];
  }
  return locs[Math.floor(Math.random()*locs.length)];
}
function aiChooseAction(){
  const p = P(AI_SEAT), human = P(1-AI_SEAT);
  const dp = diffParams();
  const lvl = dp.lv; // 1〜5の数値レベル
  const avail = availFor();
  const acts = [];
  const fuonCands = [];
  const lowStacks = [];   // 評価は低いが不穏にはならない積み手
  const handSlots = handSlotsAll(p).filter(function(s){ return !!p.hand[s] && canActFromSlot(p, s); });

  handSlots.forEach(function(s){
    const t = p.hand[s];
    // 積む
    for(let gi=0; gi<3; gi++){
      if(!canStack(p, gi, t)) continue;
      const before = towerValue(p.gates[gi], avail);
      const nt = p.gates[gi].concat([t]);
      let gain;
      if(nt.length === 6) gain = scoreTower(nt).pts - before + dp.sixBonus;
      else gain = towerValue(nt, avail) - before + dp.stackBase; // 積むこと自体が前進（内駒も減る）
      if(totalInner(p) >= 4) gain += dp.fullBonus; // 満杯が近い時は消費を優先
      if(rulesNow().ougi) gain += aiOugiStackAdjust(p, t, gi);
      if(dp.no5Pen > 0 && nt.length === 5){
        /* 5段で手番を終えると雷放の的になりやすい。同じ手番に6段目を積める駒が手にあるなら後押し、無ければ控える */
        let combo = false;
        handSlotsAll(p).forEach(function(s2){
          const u = p.hand[s2];
          if(s2 === s || !u || !canActFromSlot(p, s2) || u.w > t.w) return;
          if(scoreTower(nt.concat([u])).pts > 0) combo = true;
        });
        if(combo) gain += dp.no5Combo;
        else gain -= dp.no5Pen * (totalInner(p) >= 4 ? 0.4 : 1);
      }
      if(dp.guardPenalty > 0 && t.kind==='gen' && (t.name==='陣' || t.name==='轟') && nt.length < 6) gain -= (totalInner(p) >= 4 ? dp.guardPenalty * (0.15 / 0.65) : dp.guardPenalty);
      if(nt.length < 6 && scoreTower(nt).pts === 0){
        // 重い駒を受けられる門（空き門・上が重い門）を、軽い駒で塞がない
        const tops = p.gates.map(function(g){ return g.length ? g[g.length-1].w : 99; });
        const openCount = tops.filter(function(x){ return x >= 5; }).length;
        const curTop = p.gates[gi].length ? p.gates[gi][p.gates[gi].length-1].w : 99;
        if(curTop >= 5 && t.w < 5 && openCount <= 1) gain -= 0.9;
        else if(p.gates[gi].length && curTop - t.w >= 4) gain -= 0.3;
      }
      if(nt.length < 6 && scoreTower(nt).pts === 0 && p.gates[gi].length >= 3) gain -= 0.1;
      if(dp.fuonBin > 0 && isFuon(p.gates[gi])){
        /* もう不穏の塔：ここに積んでも追加の減点は無い。要らない駒ほど捨てる価値がある */
        const binGain = dp.fuonBin + (nt.length === 6 ? 0.3 : 0) + (totalInner(p) >= 4 ? dp.fullBonus : 0) - Math.max(0, aiTileDesire(t, p)) * 0.25;
        acts.push({ kind:'stack', hand:s, gi:gi, gain:binGain, bin:true });
        continue;
      }
      if(isFuon(nt)){
        // 通常は不穏の塔を作らない。満杯回避の非常用候補としてだけ残す
        fuonCands.push({ kind:'stack', hand:s, gi:gi, gain:0.5, fuon:true, desire: aiTileDesire(t, p), towerVal: towerValue(p.gates[gi], avail), isSix: nt.length===6 });
        continue;
      }
      if(dp.sinkPen > 0){
        const g2 = p.gates.slice(); g2[gi] = nt.length >= 6 ? [] : nt;
        const pTmp = { body:p.body, hand:p.hand.map(function(x, k){ return k === s ? null : x; }), seals:p.seals };
        const inc = aiStuckCount(pTmp, g2) - aiStuckCount(pTmp, p.gates);
        if(inc > 0) gain -= dp.sinkPen * inc;
      }
      if(gain > -1.2) acts.push({ kind:'stack', hand:s, gi:gi, gain:gain }); // 非常時の消費手として残す
      else lowStacks.push({ kind:'stack', hand:s, gi:gi, gain:gain });
    }
    if(t.kind !== 'gen') return;
    if(t.ougi){ if(!G._collectMode) aiOugiActs(p, s, t, dp, avail, acts); return; }
    // 効果の候補（霧は雷・蛇・斬をまねる）
    let effs = [];
    if(t.name==='雷' || t.name==='蛇' || t.name==='斬') effs = [t.name];
    else if(t.name==='霧') effs = ['雷','蛇','斬'];
    effs.forEach(function(eff){
      const via = t.name;
      /* 掟1：効果単位で判定する。雷は雷放／雷停を別々に判定し、霧でまねた効果も同じ効果として数える */
      const canHou = !G.used.has('雷放'), canTei = !G.used.has('雷停');
      if(eff === '雷'){
        raiTargets().forEach(function(tg){
          const tw = P(tg.pi).gates[tg.gi];
          const view = aiTowerView(tg.pi, tg.gi, avail);
          const curPts = view.pts;
          const val = view.val;
          if(tg.pi === AI_SEAT){
            // 自分の塔：雷放で得点に変える
            if(canHou && curPts >= dp.ownHouNeed && !G.finalRound) acts.push({ kind:'rai', hand:s, via:via, mode:'hou', target:tg, gain: curPts * dp.ownRaiFactor });
            else if(dp.clearHou > 0 && canHou && !view.fuon && !G.finalRound){
              /* 空け雷放：この塔を空けると行き場の無い内駒がどれだけ減るか（雷自身は手から出ていくので数えない） */
              const g2 = p.gates.slice(); g2[tg.gi] = [];
              const before = aiStuckCount(p) - (t.w <= 1 ? 0 : 0), after = aiStuckCount(p, g2);
              const freed = before - after;
              const pressure = totalInner(p) >= 4 ? 1 : (totalInner(p) >= 3 ? 0.5 : 0);
              const g = dp.clearHou * freed * pressure + curPts * dp.ownRaiFactor - Math.max(0, val - curPts) * 0.6;
              if(freed > 0 && pressure > 0 && g > 0) acts.push({ kind:'rai', hand:s, via:via, mode:'hou', target:tg, gain: g, clear:true });
            }
            const ownTeiNeed = lvl === 5 ? 4 : (lvl === 4 ? 5 : 99); // 雷停で守るのはLv.5が4点から、Lv.4は中間として5点から
            if(canTei && curPts >= ownTeiNeed && !G.finalRound) acts.push({ kind:'rai', hand:s, via:via, mode:'tei', target:tg, gain: 0.8 }); // 雷停で守る
          } else {
            // 相手の塔：育ちきる前に解放して伸びを止める／封印して遅らせる
            if(canHou && view.fuon) acts.push({ kind:'rai', hand:s, via:via, mode:'hou', target:tg, gain: dp.fuonRaiGain }); // 不穏の塔を解放させれば相手は-1点
            const deny = (val - curPts) * dp.denyMul;
            const lowUnknown = dp.houMinH > 0 && !view.exact && tw.length < dp.houMinH && !tw.some(function(t){ return aiKnows(t, AI_SEAT); });
            if(canHou && deny > 0.4 && !lowUnknown) acts.push({ kind:'rai', hand:s, via:via, mode:'hou', target:tg, gain: deny * dp.denyFactor });
            let teiGain = Math.min(1.2, val * 0.3);
            if(dp.teiClog > 0 && totalInner(human) >= innerCap(human) - 1) teiGain += dp.teiClog;
            if(lvl === 5 && tw.length >= 4 && tw.length <= 5 && curPts < view.best) teiGain = 1.15;
            else if(lvl === 4 && tw.length >= 4 && tw.length <= 5 && curPts < view.best) teiGain = Math.max(teiGain, 0.95); // Lv.4は中間の上乗せ
            const teiNeed = lvl === 1 ? Infinity : (lvl === 2 ? 0.8 : 0.4); // Lv.1は雷停を使わず、Lv.2は中間として高いゲインの時だけ
            if(canTei && teiGain > teiNeed) acts.push({ kind:'rai', hand:s, via:via, mode:'tei', target:tg, gain: teiGain });
          }
        });
      } else if(eff === '斬'){
        if(G.used.has('斬')) return;
        for(let gi=0; gi<3; gi++){
          const tw = human.gates[gi];
          if(!tw.length || human.seals[gi]) continue;
          ['top','bottom'].forEach(function(end){
            const after = end==='top' ? tw.slice(0,-1) : tw.slice(1);
            const v0 = aiTowerView(1-AI_SEAT, gi, avail), v1 = aiTowerView(1-AI_SEAT, gi, avail, after);
            let loss = v0.val - v1.val + (G.finalRound ? (v0.pts - v1.pts) * 0.5 : 0);
            if(dp.zanBot > 0 && !v0.exact){
              if(end === 'bottom') loss += dp.zanBot * (tw.length >= 4 ? 1 : 0.4);
              else if(dp.zanTopScarce > 0){
                const top = tw[tw.length-1];
                if(aiKnows(top, AI_SEAT)){
                  const un = aiUnseenByName(p);
                  let same = 0; Object.keys(un.cnt).forEach(function(k){ const d = GEN_DEF.concat(ON_DEF).find(function(x){ return x.name === k; }); if(d && d.w === top.w) same += un.cnt[k]; });
                  if(same <= 1) loss += dp.zanTopScarce;
                }
              }
            }
            if(loss > 0.3) acts.push({ kind:'zan', hand:s, via:via, target:{ pi:1-AI_SEAT, gi:gi, end:end }, gain: loss * dp.zanFactor });
          });
        }
        // 自分の不穏の塔を直す（一番上か一番下を落として不穏でなくなるなら）
        if(dp.fuonFix > 0){
          for(let gi=0; gi<3; gi++){
            const tw = p.gates[gi];
            if(tw.length < 2 || p.seals[gi] || !isFuon(tw)) continue;
            ['top','bottom'].forEach(function(end){
              const after = end === 'top' ? tw.slice(0,-1) : tw.slice(1);
              if(!isFuon(after)) acts.push({ kind:'zan', hand:s, via:via, target:{ pi:AI_SEAT, gi:gi, end:end }, gain: dp.fuonFix * (1 + towerValue(after, avail) * 0.3), fix:true });
            });
          }
        }
        // 非常時：積める先が無い時は、自分の塔の軽い一番上を斬って積み口を開ける
        const anyStack = handSlots.some(function(hs){
          const ht = p.hand[hs];
          return ht && [0,1,2].some(function(g2){ return canStack(p, g2, ht); });
        });
        if(!anyStack){
          for(let gi=0; gi<3; gi++){
            const tw = p.gates[gi];
            if(tw.length >= 2 && !p.seals[gi] && tw[tw.length-1].w <= 2){
              acts.push({ kind:'zan', hand:s, via:via, target:{ pi:AI_SEAT, gi:gi, end:'top' }, gain: 0.62 });
            }
          }
        }
      } else if(eff === '蛇'){
        if(G.used.has('蛇')) return;
        const tgt = aiHebiTarget();
        if(tgt) acts.push({ kind:'hebi', hand:s, via:via, targetLoc:tgt, gain: dp.hebiGain });
      }
    });
    if(t.name === '瞬' && !G.used.has('瞬') && lvl >= 2){
      // 峡谷に欲しい駒があれば、体内の不要な駒と入れ替える
      G.canyon.forEach(function(ct, ci){
        if(ct.kind==='gen' && ct.w >= 7) return;
        for(let gi=0; gi<3; gi++){
          if(!canStack(p, gi, ct)) continue;
          const before = towerValue(p.gates[gi], avail);
          const nt = p.gates[gi].concat([ct]);
          const gain = (nt.length===6 ? scoreTower(nt).pts : towerValue(nt, avail)) - before;
          if(gain > (lvl === 2 ? 0.9 : 0.55)){ // Lv.2は中間として、はっきり得な時だけ瞬を使う
            let junkIdx = -1, junkU = 0.35;
            p.body.forEach(function(bt, bi){ const u = aiTileDesire(bt, p); if(u < junkU){ junkU = u; junkIdx = bi; } });
            if(junkIdx >= 0) acts.push({ kind:'shun', hand:s, locA:{ zone:'canyon', idx:ci }, locB:{ zone:'body', pi:AI_SEAT, idx:junkIdx }, gain: gain - 0.15 });
          }
        }
      });
    }
    if(t.name === '浄' && !G.used.has('浄')){
      const hasGoodStack = acts.some(function(a){ return a.kind==='stack' && a.gain > 0.35; });
      const junk = innerTiles(p).filter(function(x){ return x !== t && aiTileDesire(x, p) < 0.35; });
      if(!hasGoodStack && junk.length >= (lvl === 2 ? 3 : 2) && lvl >= 2){ // Lv.2は中間として、不要な駒が多い時だけ浄を使う
        acts.push({ kind:'jo', hand:s, discards: junk.slice(0, 4), gain: 0.7 });
      }
    }
  });

  // 雷轟解放：雷役と轟役が両方手にあれば、自分の塔を+2点で解放する手を候補にする
  // 可能なのは「雷＋轟」「雷＋霧（霧が轟役）」「霧（雷役）＋轟」の3通りだけ。霧＋霧は不可
  (function(){
    let raiSlot = -1, goSlot = -1, via = null;
    for(let i=0;i<handSlots.length && raiSlot<0;i++){
      for(let j=0;j<handSlots.length;j++){
        if(i===j) continue;
        const ti = p.hand[handSlots[i]], tj = p.hand[handSlots[j]];
        if(ti.name === '霧' && tj.name === '霧') continue;
        if(isRaiLike(ti) && isGoLike(tj)){ raiSlot = handSlots[i]; goSlot = handSlots[j]; via = ti.name; break; }
      }
    }
    if(raiSlot < 0 || goSlot < 0 || !via || G.used.has('雷放')) return; // 雷轟解放は雷放の効果として数える
    for(let gi=0; gi<3; gi++){
      const tw = p.gates[gi];
      if(!tw.length || p.seals[gi] || isFuon(tw)) continue;
      const curPts = scoreTower(tw).pts;
      if(curPts <= 0) continue;
      let gain = curPts * dp.raigouMul + dp.raigouBase; // 雷轟解放の+2点の価値を織り込む
      gain *= dp.raigouFactor;
      if(G.finalRound) gain += 1.0;
      acts.push({ kind:'raigou', hand:raiSlot, via:via, gi:gi, gain:gain, partner:goSlot });
    }
  })();

  const innerNow = totalInner(p);
  // 満杯回避の非常手段：合法な積み方や発で駒を減らせない時だけ、不穏になる積み方で排出する
  function fuonFallback(){
    if(dp.noFuonIfAlt && lowStacks.length && innerNow >= innerCap(p) - 1){
      lowStacks.sort(function(a,b){ return b.gain - a.gain; });
      return lowStacks[0];
    }
    if(!fuonCands.length) return null;
    if(innerNow >= innerCap(p)){
      // 5個のまま終えると次の選で必ず禁忌になるので、不穏でも1個減らす
    } else if(innerNow === innerCap(p) - 1 && acts.length === 0){
      // 合法な消費手が全く無く、このままでは満杯に向かう時だけ
    } else {
      return null;
    }
    const sorted = fuonCands.slice().sort(function(a,b){
      if(a.isSix !== b.isSix) return a.isSix ? 1 : -1; // 6段で即解放(-1点)になるものは最後
      if(a.desire !== b.desire) return a.desire - b.desire; // 一番価値の低い駒から捨てる
      return a.towerVal - b.towerVal; // 一番見込みの低い塔を不穏にする
    });
    return sorted[0];
  }
  for(let k = acts.length - 1; k >= 0; k--){
    const a = acts[k];
    if(a.partner !== undefined && a.partner !== null && !canActPair(p, a.hand, a.partner)) acts.splice(k, 1);
  }
  if(G._collectMode) return { acts: acts, low: lowStacks, fuon: fuonCands };
  if(dp.plan > 0) return aiPlanTurn(acts, lowStacks, fuonCands);
  if(!acts.length) return fuonFallback();
  if(dp.lookahead > 0) aiApplyLookahead(acts, p, P(1-AI_SEAT), avail, dp.lookahead, dp.lookRel);
  acts.sort(function(a,b){ return b.gain - a.gain; });
  // 内駒が多い時は、多少損でも駒を消費して満杯（禁忌）を避ける。
  // 特に5個のまま手番を終えると次の選で必ず禁忌になるので、1個は必ず消費する
  let normalChoice = null;
  if(Math.random() < dp.randomPick){
    // たまに一番良い手ではない手を選ぶ（Lv.1:30%、Lv.2:15%、Lv.3〜:0%）
    normalChoice = acts[Math.floor(Math.random() * Math.min(3, acts.length))];
  } else if(lvl <= 2){
    if(innerNow >= innerCap(p)) normalChoice = acts[0].gain > -1.05 ? acts[0] : null;
    else normalChoice = acts[0].gain > dp.threshold ? acts[0] : null;
  } else {
    let threshold = dp.threshold;
    if(innerNow >= innerCap(p)) threshold = -1.05;
    else if(innerNow === innerCap(p) - 1) threshold = Math.min(threshold, 0.1);
    else if(innerNow === innerCap(p) - 2) threshold = Math.min(threshold, 0.3);
    normalChoice = acts[0].gain > threshold ? acts[0] : null;
  }
  if(normalChoice) return normalChoice;
  return fuonFallback();
}

