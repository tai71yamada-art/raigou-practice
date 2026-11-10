/* ================= 競技雷轟：奥義駒・開・雷神化 =================
   ・対戦前に、各自が奥義駒を2個選んで「月」に裏向きで置く（相手には見えない）。
   ・手番は「開 → 現 → 選 → 積・発」。開は1対戦に1回だけ：自分の桜門がすべて塔で埋まっている時に、
     月の奥義駒を1つ選んで体内か手の空いている場所へ移せる（任意）。
   ・開したら、月に残った奥義駒は除外し、雷神化する（月が3か所目の手になる。積・発できる手は1手番2か所まで、内駒は6個まで）。
   ・奥義駒はすべて重さ9の言霊。発したら峡谷へ行く。陣で防げるのは雷・蛇・斬だけなので、奥義は防げない。
   効果を作った奥義駒は ougi-data.js の implemented を true にする（選択画面に出るのは true の駒だけ）。 */
const OUGI_BRING = 2;   // 持ち込む奥義駒の数
['覇','天','啓','和','禅','楼','幻','鳴','赫','涼','風','凛','鳳','焔','姫'].forEach(function(n){ const o = ougiByName(n); if(o) o.implemented = true; });

function ougiReadyList(){ return OUGI_DATA.filter(function(o){ return o.implemented && !o.kyogiBanned; }); }
/* 奥義駒は自分と相手で重ならないのが決まり。ただし作り終えた駒が4種類そろうまでは、重なりを認める */
function ougiAllowDup(){ return ougiReadyList().length < OUGI_BRING * 2; }
function mkOugiTile(name){ const t = mkTile('gen', name, OUGI_W); t.ougi = true; return t; }
function isOugi(t){ return !!(t && t.ougi); }
function pickRandomOugi(n, exclude){
  let pool = ougiReadyList().map(function(o){ return o.name; });
  if(!ougiAllowDup() && exclude && exclude.length) pool = pool.filter(function(x){ return exclude.indexOf(x) < 0; });
  return shuffle(pool).slice(0, n);
}
/* sets：[あなたの奥義駒の名前2つ, AIの奥義駒の名前2つ]。無い側はランダムに決める */
function setupOugi(sets){
  sets = sets || [];
  const ok = function(a){ return Array.isArray(a) && a.length === OUGI_BRING && a.every(function(n){ const o = ougiByName(n); return o && o.implemented && !o.kyogiBanned; }); };
  const mine = ok(sets[0]) ? sets[0].slice() : (ok(sets[1]) ? pickRandomOugi(OUGI_BRING, sets[1]) : pickRandomOugi(OUGI_BRING, []));
  const theirs = ok(sets[1]) ? sets[1].slice() : pickRandomOugi(OUGI_BRING, mine);
  G.excludedOugi = [];
  P(0).moon = mine.map(mkOugiTile);
  P(1).moon = theirs.map(mkOugiTile);
}
function gatesAllFilled(p){ return p.gates.every(function(g){ return g.length > 0; }); }
function emptyGates(pi){ const out = []; P(pi).gates.forEach(function(g, gi){ if(!g.length) out.push(gi); }); return out; }
/* 開した奥義駒の置き場所：月（開と同時に3か所目の手になる）、手の空いている場所、体内の空き。
   月は開いた時点で必ず空くので、内駒がいっぱいでも開できる */
function kaiDests(p){
  const out = [{ where:'moon', idx:2 }];
  p.hand.forEach(function(t, i){ if(!t) out.push({ where:'hand', idx:i }); });
  if(p.body.length < BODY_MAX) out.push({ where:'body' });
  return out;
}
function canKai(pi){
  const p = P(pi);
  return !!(rulesNow().ougi && !p.raijinka && p.moon && p.moon.length && gatesAllFilled(p));
}
async function doKai(pi, moonIdx, dest){
  const p = P(pi);
  if(!canKai(pi)) return false;
  const t = p.moon[moonIdx];
  if(!t) return false;
  const rest = p.moon.filter(function(x){ return x !== t; });
  rest.forEach(function(x){ G.excludedOugi.push(x); });
  setRaijinka(pi);   // 月が空いて、3か所目の手になる
  if(dest && dest.where === 'hand' && dest.idx < 2 && !p.hand[dest.idx]) p.hand[dest.idx] = t;
  else if(dest && dest.where === 'body' && p.body.length < BODY_MAX){ p.body.push(t); sortBody(p); }
  else { p.hand[2] = t; dest = { where:'moon', idx:2 }; }
  const whereText = dest.where === 'body' ? '体内' : (dest.where === 'moon' ? '月（3か所目の手）' : handLabel(dest.idx));
  if(p.isAI) log(p.name + 'は「開」：月の奥義駒を1つ内駒に移し、雷神化しました（月が3か所目の手になり、内駒は6個まで）。', 'sys');
  else log(p.name + 'は「開」：奥義駒「' + tileLabel(t) + '」を' + whereText + 'に移し、雷神化しました（月が3か所目の手になり、内駒は6個まで）。', 'sys');
  await VIEW.playOugiRelease(pi);
  await VIEW.render();
  return true;
}

/* ---- 発できるかどうか（できる時は ''、できない時は理由） ---- */
function haTargets(){
  const out = [];
  for(let pi = 0; pi < 2; pi++) for(let gi = 0; gi < 3; gi++){ if(P(pi).gates[gi].length > 0 && !P(pi).seals[gi]) out.push({ pi:pi, gi:gi }); }
  return out;
}
function tenTowers(pi){
  const out = [];
  for(let gi = 0; gi < 3; gi++){ if(P(pi).gates[gi].length > 0 && !P(pi).seals[gi]) out.push(gi); }
  return out;
}
/* 天で選べる駒の場所：峡谷と、全員の内駒（発している天そのものは除く） */
function tenSources(pi, slot){
  const out = [];
  for(let q = 0; q < 2; q++){
    P(q).body.forEach(function(t, i){ out.push({ zone:'body', pi:q, idx:i }); });
    P(q).hand.forEach(function(t, i){ if(t && !(q === pi && i === slot)) out.push({ zone:'hand', pi:q, idx:i }); });
  }
  G.canyon.forEach(function(t, i){ out.push({ zone:'canyon', idx:i }); });
  return out;
}
function keiTargets(){
  const out = [];
  for(let pi = 0; pi < 2; pi++){
    if(!emptyGates(pi).length) continue;
    for(let gi = 0; gi < 3; gi++){ if(P(pi).gates[gi].length >= 2 && !P(pi).seals[gi]) out.push({ pi:pi, gi:gi }); }
  }
  return out;
}
function ougiUsable(pi, slot){
  const t = P(pi).hand[slot];
  if(!isOugi(t)) return '奥義駒ではありません';
  if(G.used.has(t.name)) return 'この効果はこの手番使用済み';
  if(t.name === '覇') return haTargets().length ? '' : '対象になる塔がありません';
  if(t.name === '天'){
    if(!tenTowers(pi).length) return '自分の塔がありません';
    return tenSources(pi, slot).length ? '' : '入れ替える駒がありません';
  }
  if(t.name === '啓') return keiTargets().length ? '' : '2段以上の塔と空いた桜門を両方持つ人がいません';
  if(t.name === '和') return waTowers(pi).length ? '' : '3段以上の自分の塔がありません';
  if(t.name === '禅') return (P(0).body.length || P(1).body.length) ? '' : 'どちらの体内にも駒がありません';
  if(t.name === '楼'){
    if(G.actedSlots && G.actedSlots.size) return '一発奥義：この手番にほかの駒を積・発したあとは発せません';
    return rouTowers(pi).length ? '' : '2段以上の自分の塔がありません';
  }
  if(t.name === '幻') return genAvailable().length ? '' : '除外された駒がありません（奥義駒は選べません）';
  if(t.name === '鳴' || t.name === '赫' || t.name === '涼') return '';
  if(t.name === '風') return G.deck.length >= 3 ? '' : '雷山の駒が3個未満です';
  if(t.name === '鳳') return '';
  if(t.name === '焔'){
    if(G.actedSlots && G.actedSlots.size) return '一発奥義：この手番にほかの駒を積・発したあとは発せません';
    return homuraTargets().length ? '' : '対象にできる塔がありません（封印中の塔は選べません）';
  }
  if(t.name === '姫') return P(1 - pi).body.length ? '' : '相手の体内に駒がありません';
  if(t.name === '凛'){
    if(!G.deck.length) return '雷山に駒がありません';
    return rinTowers(pi).length ? '' : '役が完成している自分の塔がありません';
  }
  return 'この奥義駒は準備中です';
}

/* ---- 覇：全ての塔の一番上、もしくは一番下の駒を捨て駒にする（雷停中の塔は含まない） ---- */
async function primHa(actor, slot, end){
  const p = P(actor), t = p.hand[slot];
  if(!isOugi(t) || t.name !== '覇') return false;
  const tgs = haTargets();
  if(!tgs.length) return false;
  G.used.add('覇');
  await VIEW.playCutIn('覇', actor);
  if(actor !== 0 && tgs.some(function(x){ return x.pi === 0; })) VIEW.setMeFace('hit');
  const fx = [], parts = [];
  tgs.forEach(function(tg){
    const tower = P(tg.pi).gates[tg.gi];
    const rect = VIEW.fxGateRect(tg.pi, tg.gi);
    const removed = (end === 'top') ? tower.pop() : tower.shift();
    G.canyon.push(removed);
    if(G.cutHints){ if(tower.length) G.cutHints[tg.pi][tg.gi].push({ w:removed.w, end:end }); else G.cutHints[tg.pi][tg.gi] = []; }
    fx.push({ removed:removed, rect:rect });
    parts.push(P(tg.pi).name + 'の桜門' + (tg.gi+1) + '「' + tileLabel(removed) + '」');
  });
  consumeHand(p, slot);
  log(p.name + 'の奥義「覇」：全ての塔の' + (end === 'top' ? '一番上' : '一番下') + 'の駒を捨て駒にしました（' + parts.join('・') + '）。');
  VIEW.render();
  await Promise.all(fx.map(function(f){ return VIEW.fxZanFx(f.removed, f.rect, end); }));
  return true;
}
/* ---- 天：自分の塔を1つ選び、その一番上の駒と、捨て駒（峡谷）か全員の内駒から選んだ1駒の場所を入れ替える ----
   loc は瞬と同じ形 { zone:'body'|'hand'|'canyon', pi, idx } */
async function primTen(actor, slot, gi, loc){
  const p = P(actor), t = p.hand[slot];
  if(!isOugi(t) || t.name !== '天') return false;
  const tower = p.gates[gi];
  if(!tower || !tower.length || p.seals[gi]) return false;
  const top = tower[tower.length - 1], other = locTile(loc);
  if(!other || other === t || other === top) return false;
  G.used.add('天');
  await VIEW.playCutIn('天', actor);
  const fromLabel = locLabel(loc, other);
  const pub = loc.zone === 'canyon' || loc.pi !== actor;   // 相手にも分かる入れ替えか（自分の内駒との入れ替えだけは相手に見えない）
  tower[tower.length - 1] = other;
  locSet(loc, top);
  if(pub){
    if(G.revealedTopIds) G.revealedTopIds.add(other.id);
    if(G.kn){ G.kn[0].add(other.id); G.kn[1].add(other.id); if(loc.zone !== 'canyon'){ G.kn[0].add(top.id); G.kn[1].add(top.id); } }
  }
  if(actor !== 0 && loc.pi === 0 && loc.zone !== 'canyon') VIEW.setMeFace('hit');
  sortBody(P(0)); sortBody(P(1));
  consumeHand(p, slot);
  if(p.isAI && !pub) log(p.name + 'の奥義「天」：桜門' + (gi+1) + 'の塔の一番上の駒と、自分の内駒を入れ替えました。');
  else log(p.name + 'の奥義「天」：桜門' + (gi+1) + 'の塔の一番上の「' + tileLabel(top) + '」と、' + fromLabel + 'を入れ替えました。');
  await VIEW.render();
  return true;
}
/* ---- 啓：2段以上の塔と空いた桜門を持つ人を選び、その塔を好きな所で上下2つに分け、片方を空いた桜門へ置く ----
   k＝下の部分の段数（1〜段数-1）。part＝空いた桜門へ移す側（'top'＝上の部分／'bottom'＝下の部分） */
async function primKei(actor, slot, tpi, gi, k, part, destGi){
  homuraCheck();
  const p = P(actor), t = p.hand[slot];
  if(!isOugi(t) || t.name !== '啓') return false;
  const q = P(tpi), tower = q.gates[gi];
  if(!tower || tower.length < 2 || q.seals[gi]) return false;
  if(!(k >= 1 && k <= tower.length - 1)) return false;
  if(destGi === gi || !q.gates[destGi] || q.gates[destGi].length) return false;
  G.used.add('啓');
  await VIEW.playCutIn('啓', actor);
  if(actor !== 0 && tpi === 0) VIEW.setMeFace('hit');
  const n = tower.length, lower = tower.slice(0, k), upper = tower.slice(k);
  if(part === 'bottom'){ q.gates[gi] = upper; q.gates[destGi] = lower; }
  else { q.gates[gi] = lower; q.gates[destGi] = upper; }
  q.seals[destGi] = null;
  if(G.cutHints){ G.cutHints[tpi][gi] = []; G.cutHints[tpi][destGi] = []; }
  consumeHand(p, slot);
  log(p.name + 'の奥義「啓」：' + q.name + 'の桜門' + (gi+1) + 'の塔（' + n + '段）を下' + k + '段と上' + (n - k) + '段に分け、' +
      (part === 'bottom' ? '下' : '上') + 'の部分を桜門' + (destGi+1) + 'へ移しました。');
  await VIEW.render();
  return true;
}

/* ================= 和・禅・楼 ================= */
/* 一発奥義（楼など）を発した手番は、ほかの駒を積・発できない。G.ippatsu は手番の始めに戻す */
function waTowers(pi){ const out = []; P(pi).gates.forEach(function(g, gi){ if(g.length >= 3 && !P(pi).seals[gi]) out.push(gi); }); return out; }
function rouTowers(pi){ const out = []; P(pi).gates.forEach(function(g, gi){ if(g.length >= 2 && !P(pi).seals[gi]) out.push(gi); }); return out; }
function waResult(tiles){
  const sum = tiles.reduce(function(a, t){ return a + t.w; }, 0);
  return { sum:sum, delta: sum === 11 ? 2 : (sum === 33 ? 4 : -1) };
}
/* ---- 和：自分の3段以上の塔を1つ選んで全て公開。重さの合計が11なら陽玉+2、33なら+4、それ以外は-1。公開した駒は峡谷へ ---- */
async function primWa(actor, slot, gi){
  const p = P(actor), t = p.hand[slot];
  if(!isOugi(t) || t.name !== '和') return false;
  const tiles = p.gates[gi];
  if(!tiles || tiles.length < 3 || p.seals[gi]) return false;
  G.used.add('和');
  await VIEW.playCutIn('和', actor);
  const snap = tiles.slice(), r = waResult(snap);
  p.gates[gi] = []; p.seals[gi] = null;
  if(G.cutHints) G.cutHints[actor][gi] = [];
  snap.forEach(function(x){ if(G.kn){ G.kn[0].add(x.id); G.kn[1].add(x.id); } });
  consumeHand(p, slot);
  p.score += r.delta;
  log(p.name + 'の奥義「和」：桜門' + (gi+1) + 'の塔（' + snap.map(tileLabel).join('・') + '）を公開しました。重さの合計は' + r.sum + 'なので、' +
      (r.delta > 0 ? '陽玉+' + r.delta + '点' : '陽玉-1点') + '（' + p.score + '点）。公開した駒は峡谷へ置きました。', r.delta > 0 ? 'score' : 'bad');
  await VIEW.showWaReveal(actor, gi, snap, r.sum, r.delta);
  snap.forEach(function(x){ G.canyon.push(x); });
  VIEW.render();
  if(r.delta < 0) checkLose(actor);
  return true;
}
/* ---- 禅：全員が体内の最も重い駒を1つ選び、右隣（2人戦では相手）の体内へ移す。使用者が望めば、もう1度だけ ----
   最も重い駒が複数ある時は、その持ち主が選ぶ（人は画面で、AIは自分にとって価値の低い方） */
function zenChoices(pi){
  const b = P(pi).body;
  if(!b.length) return [];
  const mw = Math.max.apply(null, b.map(function(t){ return t.w; }));
  const seen = {}, out = [];
  b.forEach(function(t, i){ if(t.w === mw && !seen[t.kind + t.name]){ seen[t.kind + t.name] = 1; out.push(i); } });
  return out;
}
async function zenOnce(actor){
  const picks = [null, null];
  for(let pi = 0; pi < 2; pi++){
    const ch = zenChoices(pi);
    if(!ch.length) continue;
    let idx = ch[0];
    if(ch.length > 1){
      if(P(pi).isAI) idx = aiZenPick(pi, ch);
      else idx = await VIEW.chooseZenTile(ch);
    }
    picks[pi] = P(pi).body[idx];
  }
  for(let pi = 0; pi < 2; pi++){ const x = picks[pi]; if(x){ const b = P(pi).body; b.splice(b.indexOf(x), 1); } }
  for(let pi = 0; pi < 2; pi++){ const x = picks[pi]; if(x){ P(1 - pi).body.push(x); if(G.kn){ G.kn[0].add(x.id); G.kn[1].add(x.id); } } }
  sortBody(P(0)); sortBody(P(1));
  const parts = [];
  for(let pi = 0; pi < 2; pi++) parts.push(picks[pi] ? P(pi).name + 'は「' + tileLabel(picks[pi]) + '」を' + P(1 - pi).name + 'の体内へ移しました。' : P(pi).name + 'は体内に駒がないので、移す駒はありませんでした。');
  log('禅：' + parts.join(''));
  if(actor !== 0 && picks[0]) VIEW.setMeFace('hit');
  await VIEW.render();
  return picks;
}
async function primZen(actor, slot, wantAgain){
  const p = P(actor), t = p.hand[slot];
  if(!isOugi(t) || t.name !== '禅') return false;
  if(!P(0).body.length && !P(1).body.length) return false;
  G.used.add('禅');
  await VIEW.playCutIn('禅', actor);
  consumeHand(p, slot);
  log(p.name + 'の奥義「禅」：全員が体内の最も重い駒を、相手の体内へ移します。');
  await zenOnce(actor);
  if(P(0).body.length || P(1).body.length){
    const again = await wantAgain();
    if(again){ log(p.name + 'は「禅」をもう1度適用しました。'); await zenOnce(actor); }
  }
  return true;
}
/* ---- 楼（一発奥義）：自分の塔を1つ選び、好きな順番で積み直す。order＝新しい並び（下から、元の位置の番号） ---- */
async function primRou(actor, slot, gi, order){
  const p = P(actor), t = p.hand[slot];
  if(!isOugi(t) || t.name !== '楼') return false;
  if(G.actedSlots && G.actedSlots.size) return false;
  const tw = p.gates[gi];
  if(!tw || tw.length < 2 || p.seals[gi] || !order || order.length !== tw.length) return false;
  const chk = order.slice().sort(function(a, b){ return a - b; });
  if(chk.some(function(v, i){ return v !== i; })) return false;
  G.used.add('楼');
  await VIEW.playCutIn('楼', actor);
  p.gates[gi] = order.map(function(i){ return tw[i]; });
  if(G.cutHints) G.cutHints[actor][gi] = [];
  if(G.revealedTopIds) tw.forEach(function(x){ G.revealedTopIds.delete(x.id); });
  consumeHand(p, slot);
  G.ippatsu = true;
  log(p.name + 'の奥義「楼」（一発奥義）：桜門' + (gi+1) + 'の塔（' + tw.length + '段）を好きな順番に積み直しました。この手番は、ほかの駒を積・発できません。');
  await VIEW.render();
  return true;
}

/* ================= 幻・鳴・赫 ================= */
/* ---- 幻：除外された駒（奥義駒を除く）を確認し、1つを自分の体内か手の空いている場所に置く。
   2人戦で除外されている駒はセットアップの1個だけ（雷神化で除外した奥義駒は選べない） ---- */
function genAvailable(){ return G.excluded && !isOugi(G.excluded) ? [G.excluded] : []; }
/* 置ける場所。発した幻の手は空くので、そこにも置ける */
function genDests(pi, slot){
  const p = P(pi), out = [];
  p.hand.forEach(function(x, s){ if(!x || s === slot) out.push({ where:'hand', idx:s }); });
  if(p.body.length < BODY_MAX) out.push({ where:'body' });
  return out;
}
async function primGen(actor, slot, chooseDest){
  const p = P(actor), t = p.hand[slot];
  if(!isOugi(t) || t.name !== '幻') return false;
  const cands = genAvailable();
  if(!cands.length) return false;
  G.used.add('幻');
  await VIEW.playCutIn('幻', actor);
  const dests = genDests(actor, slot);
  consumeHand(p, slot);
  const x = cands[0];
  if(G.kn) G.kn[actor].add(x.id);
  let d = await chooseDest(x, dests);
  if(!d || !dests.some(function(y){ return y.where === d.where && y.idx === d.idx; })) d = dests[0];
  G.excluded = null;
  if(d.where === 'body'){ p.body.push(x); sortBody(p); }
  else p.hand[d.idx] = x;
  const place = d.where === 'body' ? '体内' : handLabel(d.idx);
  if(p.isAI) log(p.name + 'の奥義「幻」：除外された駒を確認し、その駒を自分の' + place + 'に置きました。');
  else log(p.name + 'の奥義「幻」：除外された駒「' + tileLabel(x) + '」を、自分の' + place + 'に置きました。');
  await VIEW.render();
  return true;
}
/* ---- 赫：全プレイヤーは、次の手番だけ「現」が0個になる。G.kakuZero[pi] は手番の始めに G.kakuNow へ移す ---- */
async function primKaku(actor, slot){
  const p = P(actor), t = p.hand[slot];
  if(!isOugi(t) || t.name !== '赫') return false;
  G.used.add('赫');
  await VIEW.playCutIn('赫', actor);
  consumeHand(p, slot);
  G.kakuZero = [true, true];
  log(p.name + 'の奥義「赫」：あなたもAIも、次の手番だけ「現」が0個になります（体内の駒を手に移せません）。', 'score');
  if(actor !== 0) VIEW.setMeFace('hit');
  VIEW.render();
  return true;
}
/* ---- 鳴：雷・蛇・斬・陣・轟・霧・瞬・浄のどれか1つと同じ効果。
   自分の手番では、選んだ言霊の効果をそのまま（鳴の手で）実行する。陣・轟（と霧でまねる陣・轟）は、
   相手の雷・蛇・斬を受けた時に、霧と同じように使える（responses.js の mimicSlot） ---- */
function isMei(t){ return !!(t && t.kind === 'gen' && t.name === '鳴'); }

/* ================= 涼・風・凛 ================= */
/* 表向きの内駒（涼）：G.openIds。積むまで表のまま（primStack で外す） */
function isOpenTile(t){ return !!(t && G.openIds && G.openIds.has(t.id)); }
/* 表向きで雷山の上に戻した駒（風）：G.deckOpen。引かれたら外す（drawTiles） */
function deckOpenTop(){
  const out = [];
  for(let i = G.deck.length - 1; i >= 0; i--){ const t = G.deck[i]; if(G.deckOpen && G.deckOpen.has(t.id)) out.push(t); else break; }
  return out;
}
/* ---- 涼：全プレイヤーは内駒を全て表向きにする。表になった駒は積むまで表のまま ---- */
async function primRyou(actor, slot){
  const p = P(actor), t = p.hand[slot];
  if(!isOugi(t) || t.name !== '涼') return false;
  G.used.add('涼');
  await VIEW.playCutIn('涼', actor);
  consumeHand(p, slot);
  if(!G.openIds) G.openIds = new Set();
  const parts = [];
  for(let pi = 0; pi < 2; pi++){
    const q = P(pi), tiles = q.body.concat(q.hand.filter(Boolean));
    tiles.forEach(function(x){ G.openIds.add(x.id); if(G.kn){ G.kn[0].add(x.id); G.kn[1].add(x.id); } });
    parts.push(q.name + '：' + (tiles.length ? tiles.map(tileLabel).join('・') : 'なし'));
  }
  log(p.name + 'の奥義「涼」：全員の内駒を表向きにしました（' + parts.join('／') + '）。表になった駒は、積むまで表のままです。', 'score');
  if(actor !== 0) VIEW.setMeFace('hit');
  await VIEW.render();
  return true;
}
/* ---- 風：雷山から3駒（2人＋1）引き、1つを自分の手に置く。残りは表向きで雷山の上に戻し、雷山として扱う ---- */
async function primKaze(actor, slot, choose){
  const p = P(actor), t = p.hand[slot];
  if(!isOugi(t) || t.name !== '風' || G.deck.length < 3) return false;
  G.used.add('風');
  await VIEW.playCutIn('風', actor);
  consumeHand(p, slot);
  const drawn = [G.deck.pop(), G.deck.pop(), G.deck.pop()];
  VIEW.sfx('draw');
  drawn.forEach(function(x){ if(G.deckOpen) G.deckOpen.delete(x.id); if(G.kn) G.kn[actor].add(x.id); });
  let k = await choose(drawn);
  if(!(k >= 0 && k < 3)) k = 0;
  const keep = drawn[k], rest = drawn.filter(function(_, i){ return i !== k; });
  p.hand[slot] = keep;
  if(!G.deckOpen) G.deckOpen = new Set();
  for(let i = rest.length - 1; i >= 0; i--){ const x = rest[i]; G.deck.push(x); G.deckOpen.add(x.id); if(G.kn){ G.kn[0].add(x.id); G.kn[1].add(x.id); } }
  const restTxt = rest.map(function(x){ return '「' + tileLabel(x) + '」'; }).join('と');
  if(p.isAI) log(p.name + 'の奥義「風」：雷山から3個引き、1個を手に置きました。残りの' + restTxt + 'は、表向きで雷山の上に戻しました（次に引かれるのは' + '「' + tileLabel(rest[0]) + '」）。');
  else log(p.name + 'の奥義「風」：雷山から3個引き、「' + tileLabel(keep) + '」を' + handLabel(slot) + 'に置きました。残りの' + restTxt + 'は、表向きで雷山の上に戻しました（次に引かれるのは「' + tileLabel(rest[0]) + '」）。');
  await VIEW.render();
  return true;
}
/* ---- 凛：役が完成している自分の塔を1つ公開し、雷山から1駒引く。音無なら塔を解放して役の点数+2点。
   言霊なら役の点数は0点で、塔の駒は全て峡谷へ。引いた駒は峡谷へ ---- */
function rinTowers(pi){
  const p = P(pi), out = [];
  for(let gi = 0; gi < 3; gi++){ const tw = p.gates[gi]; if(!p.seals[gi] && tw.length >= 3 && !isFuon(tw) && scoreTower(tw).pts > 0) out.push(gi); }
  return out;
}
async function primRin(actor, slot, gi){
  const p = P(actor), t = p.hand[slot];
  if(!isOugi(t) || t.name !== '凛' || rinTowers(actor).indexOf(gi) < 0 || !G.deck.length) return false;
  G.used.add('凛');
  await VIEW.playCutIn('凛', actor);
  consumeHand(p, slot);
  const snap = p.gates[gi].slice(), s = scoreTower(snap);
  snap.forEach(function(x){ if(G.kn){ G.kn[0].add(x.id); G.kn[1].add(x.id); } });
  const x = drawTiles(1)[0];
  if(G.deckOpen) G.deckOpen.delete(x.id);
  if(G.kn){ G.kn[0].add(x.id); G.kn[1].add(x.id); }
  const win = x.kind === 'on';
  log(p.name + 'の奥義「凛」：桜門' + (gi+1) + 'の塔（' + snap.map(tileLabel).join('・') + '、' + s.role + '）を公開し、雷山から「' + tileLabel(x) + '」を引きました。' +
      (win ? '音無なので、塔を解放して役の点数に+2点します。' : '言霊なので、役の点数は0点になり、塔の駒は全て峡谷へ置きます。'), win ? 'score' : 'bad');
  await VIEW.showRinReveal(actor, gi, snap, s, x, win);
  G.canyon.push(x);
  if(win) releaseTower(actor, gi, 2);
  else {
    snap.forEach(function(y){ G.canyon.push(y); });
    p.gates[gi] = []; p.seals[gi] = null;
    if(G.cutHints) G.cutHints[actor][gi] = [];
  }
  await VIEW.render();
  return true;
}

/* ================= 鳳・焔・姫 ================= */
/* ---- 鳳：相手と内駒（体内と手）を全て入れ替え、両方が体内か手の好きな場所に置き直す。
   arrange(pi, tiles, handCount) は、手に置く駒の番号の配列を返す（体内は3個まで） ---- */
function hoArrangeOk(tiles, handIdx, handCount){
  return handIdx.length <= handCount && tiles.length - handIdx.length <= BODY_MAX &&
         handIdx.every(function(i){ return i >= 0 && i < tiles.length; }) && new Set(handIdx).size === handIdx.length;
}
function hoDefaultArrange(tiles, handCount){
  /* 体内に入りきらない分だけ、軽い順に手へ */
  const order = tiles.map(function(_, i){ return i; }).sort(function(a, b){ return tiles[a].w - tiles[b].w; });
  return order.slice(0, Math.max(0, tiles.length - BODY_MAX));
}
async function primHo(actor, slot, arrange){
  const p = P(actor), q = P(1 - actor), t = p.hand[slot];
  if(!isOugi(t) || t.name !== '鳳') return false;
  G.used.add('鳳');
  await VIEW.playCutIn('鳳', actor);
  consumeHand(p, slot);
  const mine = p.body.concat(p.hand.filter(Boolean)), theirs = q.body.concat(q.hand.filter(Boolean));
  p.body = []; q.body = [];
  p.hand = p.hand.map(function(){ return null; }); q.hand = q.hand.map(function(){ return null; });
  mine.concat(theirs).forEach(function(x){ if(G.kn){ G.kn[0].add(x.id); G.kn[1].add(x.id); } });
  log(p.name + 'の奥義「鳳」：' + p.name + 'と' + q.name + 'の内駒を全て入れ替えました（' +
      p.name + 'へ：' + (theirs.length ? theirs.map(tileLabel).join('・') : 'なし') + '／' + q.name + 'へ：' + (mine.length ? mine.map(tileLabel).join('・') : 'なし') + '）。', 'score');
  /* 置き直しは、発した人から順に */
  const plan = [[p, theirs, actor], [q, mine, 1 - actor]];
  for(let k = 0; k < 2; k++){
    const pl = plan[k][0], tiles = plan[k][1], pi = plan[k][2], hc = pl.hand.length;
    let hi = tiles.length ? await arrange(pi, tiles, hc) : [];
    if(!hi || !hoArrangeOk(tiles, hi, hc)) hi = hoDefaultArrange(tiles, hc);
    let s = 0;
    tiles.forEach(function(x, i){
      if(hi.indexOf(i) >= 0){ while(s < hc && pl.hand[s]) s++; pl.hand[s] = x; }
      else pl.body.push(x);
    });
    sortBody(pl);
  }
  if(actor !== 0) VIEW.setMeFace('hit');
  await VIEW.render();
  return true;
}
/* ---- 焔（一発奥義）：塔がある桜門を1つ選び、炎上させる。隠駒が動くたび（手番が替わるたび）に、
   その塔の一番下の駒を峡谷へ。塔が無くなると焔も峡谷へ置き、効果が終わる。
   封印中の塔は選べない。炎上中の塔が封印されている間は、焔の効果も止まる。 G.homura = {pi, gi, tile, by} ---- */
function homuraTargets(){
  const out = [];
  for(let pi = 0; pi < 2; pi++) for(let gi = 0; gi < 3; gi++){
    if(P(pi).gates[gi].length && !P(pi).seals[gi]) out.push({ pi:pi, gi:gi });
  }
  return out;
}
function isBurning(pi, gi){ return !!(G.homura && G.homura.pi === pi && G.homura.gi === gi); }
async function primHomura(actor, slot, pi, gi){
  const p = P(actor), t = p.hand[slot];
  if(!isOugi(t) || t.name !== '焔') return false;
  if(!homuraTargets().some(function(x){ return x.pi === pi && x.gi === gi; })) return false;
  G.used.add('焔');
  await VIEW.playCutIn('焔', actor);
  p.hand[slot] = null;
  markActed(p, slot);
  if(G.players && p === P(0) && G.hatsuGame) G.hatsuGame['焔'] = (G.hatsuGame['焔'] || 0) + 1;
  G.homura = { pi:pi, gi:gi, tile:t, by:actor };
  G.ippatsu = true;
  log(p.name + 'の奥義「焔」：' + P(pi).name + 'の桜門' + (gi+1) + 'を炎上させました。手番が替わるたびに、この塔の一番下の駒が峡谷へ置かれます。', 'bad');
  if(actor !== 0 && pi === 0) VIEW.setMeFace('hit');
  await VIEW.render();
  return true;
}
/* 手番が替わった時（隠駒が動いた時）の炎上の処理。塔が無くなっていたら焔を峡谷へ */
function homuraTick(){
  const h = G.homura;
  if(!h) return;
  const p = P(h.pi), tw = p.gates[h.gi];
  if(!tw.length){ homuraEnd(); return; }
  if(p.seals[h.gi]){ log('炎上中の' + p.name + 'の桜門' + (h.gi+1) + 'の塔は封印中なので、焔の効果は止まっています。', 'sys'); return; }
  const x = tw.shift();
  G.canyon.push(x);
  if(G.cutHints && G.cutHints[h.pi] && G.cutHints[h.pi][h.gi]) G.cutHints[h.pi][h.gi] = [];
  log('焔：' + p.name + 'の桜門' + (h.gi+1) + 'の塔の一番下の「' + tileLabel(x) + '」が燃えて、峡谷へ置かれました（残り' + tw.length + '段）。', 'bad');
  if(!tw.length) homuraEnd();
}
/* 炎上中の桜門の塔が（解放などで）無くなっていたら、すぐに焔を峡谷へ。新しく積んだ塔は燃やさない */
function homuraCheck(){ if(G.homura && !P(G.homura.pi).gates[G.homura.gi].length) homuraEnd(); }
function homuraEnd(){
  const h = G.homura; if(!h) return;
  G.canyon.push(h.tile);
  G.homura = null;
  log('焔：桜門の塔が無くなったので、焔を峡谷へ置き、炎上が終わりました。', 'sys');
}
/* ---- 姫：相手の体内の駒を1つ選び、姫があった手へ移す。姫は、選んだ駒があった相手の体内へ移る ---- */
async function primHime(actor, slot, bodyIdx){
  const p = P(actor), q = P(1 - actor), t = p.hand[slot];
  if(!isOugi(t) || t.name !== '姫' || !q.body[bodyIdx]) return false;
  G.used.add('姫');
  await VIEW.playCutIn('姫', actor);
  markActed(p, slot);
  if(G.players && p === P(0) && G.hatsuGame) G.hatsuGame['姫'] = (G.hatsuGame['姫'] || 0) + 1;
  const x = q.body[bodyIdx];
  q.body[bodyIdx] = t;
  p.hand[slot] = x;
  sortBody(q);
  if(G.kn){ G.kn[actor].add(x.id); G.kn[0].add(t.id); G.kn[1].add(t.id); }
  if(p.isAI) log(p.name + 'の奥義「姫」：' + q.name + 'の体内の駒を1つ取り、' + handLabel(slot) + 'に置きました。姫は' + q.name + 'の体内へ移りました。', 'bad');
  else log(p.name + 'の奥義「姫」：' + q.name + 'の体内から「' + tileLabel(x) + '」を取り、' + handLabel(slot) + 'に置きました。姫は' + q.name + 'の体内へ移りました。', 'score');
  if(actor !== 0) VIEW.setMeFace('hit');
  await VIEW.render();
  return true;
}
