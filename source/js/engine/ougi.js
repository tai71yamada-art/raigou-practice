/* ================= 競技雷轟：奥義駒・開・雷神化 =================
   ・対戦前に、各自が奥義駒を2個選んで「月」に裏向きで置く（相手には見えない）。
   ・手番は「開 → 現 → 選 → 積・発」。開は1対戦に1回だけ：自分の桜門がすべて塔で埋まっている時に、
     月の奥義駒を1つ選んで体内か手の空いている場所へ移せる（任意）。
   ・開したら、月に残った奥義駒は除外し、雷神化する（月が3か所目の手になる。積・発できる手は1手番2か所まで、内駒は6個まで）。
   ・奥義駒はすべて重さ9の言霊。発したら峡谷へ行く。陣で防げるのは雷・蛇・斬だけなので、奥義は防げない。
   効果を作った奥義駒は ougi-data.js の implemented を true にする（選択画面に出るのは true の駒だけ）。 */
const OUGI_BRING = 2;   // 持ち込む奥義駒の数
['覇','天','啓'].forEach(function(n){ const o = ougiByName(n); if(o) o.implemented = true; });

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
