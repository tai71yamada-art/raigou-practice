/* ================= 役と得点 ================= */
/* 不穏の塔：下から上へ重さが増える段がある塔（本来は重さが増えてはいけない） */
function isFuon(tiles){
  for(let i=1;i<tiles.length;i++){ if(tiles[i].w > tiles[i-1].w) return true; }
  return false;
}
function roleOf(ws){
  if(ws.length < 3) return null;
  const s = ws.slice().sort(function(a,b){ return a-b; });
  if(s.every(function(w){ return w===s[0]; })) return { type:'sakura', name:'桜花', base:2 };
  let consec = true;
  for(let i=1;i<s.length;i++){ if(s[i]-s[i-1] !== 1) consec = false; }
  if(consec) return { type:'lotus', name:'蓮花', base:1 };
  const allOdd = s.every(function(w){ return w%2===1; });
  const allEven = s.every(function(w){ return w%2===0; });
  if(allOdd || allEven){
    let step2 = true;
    for(let i=1;i<s.length;i++){ if(s[i]-s[i-1] !== 2) step2 = false; }
    if(step2) return { type:'lotus', name: allOdd ? '奇数蓮花' : '偶数蓮花', base:1 };
  }
  return null;
}
/* 雷神役：6段の塔（下から順）の駒の名前で判定する。言霊は言霊、音無は音無として見る */
const RAIJIN_ROLES = [
  { name:'時雨蓮花',   base:10, seqs:[['g浄','g瞬','g霧','g轟','g陣','g斬']] },
  { name:'霞・双頭蓮', base:11, seqs:[['g浄','g瞬','g霧','g轟','g轟','g轟']] },
  { name:'桜花乱舞',   base:11, seqs:[['g轟','o五','g轟','o五','g轟','o五'], ['o五','g轟','o五','g轟','o五','g轟']] },
  { name:'霧幻輪廻',   base:12, seqs:[['g霧','o六','g霧','o六','g霧','o六'], ['o六','g霧','o六','g霧','o六','g霧']] },
  { name:'毘沙門櫓',   base:12, seqs:[['g斬','g斬','g斬','g斬','g斬','g斬']] },
  { name:'六花白雪',   base:12, seqs:[['g瞬','g瞬','g霧','g霧','o六','o六']] }
];
function raijinRoleOf(tiles){
  if(!tiles || tiles.length !== 6) return null;
  const key = tiles.map(function(t){ return (t.kind === 'gen' ? 'g' : 'o') + t.name; });
  let best = null;
  RAIJIN_ROLES.forEach(function(r){
    if(r.seqs.some(function(sq){ return sq.every(function(k, i){ return key[i] === k; }); })){
      if(!best || r.base > best.base) best = r;
    }
  });
  return best;
}
function scoreTower(tiles){
  const n = tiles.length;
  if(n < 3) return { pts:0, role:'', base:0, height:0, dye:0 };
  const ws = tiles.map(function(t){ return t.w; });
  const dye = tiles.every(function(t){ return t.kind===tiles[0].kind; }) ? 1 : 0;
  const height = Math.min(Math.max(n-3, 0), 3);
  /* 公式の優先順位（ルールブック14ページ）：組み合わせ役 ＜ 特殊役 ＜ 基本役 ＜ 雷神役。
     役が重複する場合は優先順位が高い役のみを適用する。同格の中では点数が高い方を適用する。
     そのため重さ1,2,3,4,5,6の6段は、組み合わせ役の蓮々花（基礎2＋高さ3）ではなく、
     基本役の蓮花（基礎1＋高さ加点3）で計算する。 */
  const RANK_COMBO = 1, RANK_SPECIAL = 2, RANK_BASIC = 3;
  const cands = [];
  const whole = roleOf(ws);
  if(whole) cands.push({ rank:RANK_BASIC, pts: whole.base + height + dye, role: whole.name, base: whole.base, height: height, dye: dye });
  if(n === 6){
    const nc = {}, wc = {};
    tiles.forEach(function(t){
      const k = t.kind + t.name; nc[k] = (nc[k]||0)+1;
      wc[t.w] = (wc[t.w]||0)+1;
    });
    const nv = Object.values(nc), wv = Object.values(wc);
    // 椿（特殊役）：同じ駒そのものが2個ずつ、合計6段（基礎6点・加点なし）
    if(nv.length===3 && nv.every(function(c){ return c===2; })) cands.push({ rank:RANK_SPECIAL, pts:6, role:'椿', base:6, height:0, dye:0 });
    /* 山茶花（特殊役）：同じ重さの駒が2個ずつ、合計6段（基礎4点・加点なし）。
       ペア同士の重さが異なっている必要はないので、各重さの個数がすべて偶数なら成立する。
       例：下から4,4,1,1,1,1（重さ4が2個・重さ1が4個＝2組）も山茶花になる。 */
    if(wv.length >= 1 && wv.every(function(c){ return c % 2 === 0; })) cands.push({ rank:RANK_SPECIAL, pts:4, role:'山茶花', base:4, height:0, dye:0 });
    const bot = roleOf(ws.slice(0,3)), top = roleOf(ws.slice(3,6));
    if(bot && top){
      let base, nm;
      if(bot.type==='sakura' && top.type==='sakura'){ base=4; nm='桜々花'; }
      else if(bot.type==='lotus' && top.type==='lotus'){ base=2; nm='蓮々花'; }
      else { base=3; nm = (top.type==='sakura') ? '桜蓮花' : '蓮桜花'; }
      const pts = base + height + dye;
      cands.push({ rank:RANK_COMBO, pts:pts, role:nm, base:base, height:height, dye:dye });
    }
  }
  if(n === 6){
    const rj = raijinRoleOf(tiles);
    if(rj) cands.push({ rank:4, pts:rj.base, role:rj.name, base:rj.base, height:0, dye:0 });
  }
  if(!cands.length) return { pts:0, role:'', base:0, height:0, dye:0 };
  cands.sort(function(a,b){ return (b.rank - a.rank) || (b.pts - a.pts); });
  const best = cands[0];
  return { pts:best.pts, role:best.role, base:best.base, height:best.height, dye:best.dye };
}
/* 塔を解放して得点計算する。bonusは雷轟解放の+2など */
function releaseTower(pi, gi, bonus){
  const p = P(pi);
  const tiles = p.gates[gi];
  if(!tiles.length) return 0;
  if(isFuon(tiles)){
    p.score -= 1;
    if(G.penaltyCounts) G.penaltyCounts[pi]++;
    if(G.tally) G.tally.fuon[pi]++;
    if(!G.finishing) VIEW.fxFuonBanner(pi, gi, tiles.slice());
    tiles.forEach(function(t){ G.canyon.push(t); });
    p.gates[gi] = []; p.seals[gi] = null;
    if(G.cutHints) G.cutHints[pi][gi] = [];
    log(p.name + 'の桜門' + (gi+1) + 'の塔は不穏の塔でした。得点にならず、' + p.name + 'の陽玉-1点（残り' + p.score + '点）。駒は全部峡谷へ行きます。', 'bad');
    VIEW.render();
    if(!G.finishing) checkLose(pi);
    return -1;
  }
  const s = scoreTower(tiles);
  let pts = s.pts + (s.pts > 0 ? (bonus||0) : 0);
  p.score += pts;
  // 解放時は中身が公開されるので、積まれていた駒も分かる形で残す
  const contents = tiles.map(function(t){ return tileLabel(t); }).join('・');
  const snapshot = tiles.slice();
  p.gates[gi] = []; p.seals[gi] = null;
  if(G.cutHints) G.cutHints[pi][gi] = [];
  if(!G.finishing) VIEW.fxReleaseBanner(pi, gi, snapshot, s, pts, (s.pts > 0 ? (bonus||0) : 0));
  if(s.pts > 0){
    if(G.tally && (!G.tally.bestTower[pi] || pts > G.tally.bestTower[pi].pts)) G.tally.bestTower[pi] = { role:s.role, pts:pts };
    // 役になった塔の駒は峡谷へは行かず、「解放された役」の置き場へ置く
    G.released.push({ pi:pi, gi:gi, role:s.role, pts:pts, base:s.base, height:s.height, dye:s.dye,
                      bonus:(bonus||0), tiles:snapshot });
    let breakdown = s.role + '：基礎' + s.base + '点＋高さ加点' + s.height + '点＋染め加点' + s.dye + '点＝' + s.pts + '点';
    if(bonus) breakdown += '＋雷轟解放' + bonus + '点＝合計' + pts + '点';
    log(p.name + 'の桜門' + (gi+1) + 'の塔を解放：' + breakdown + '（積まれていた駒：' + contents + '） → ' + p.name + 'の陽玉は' + p.score + '点。駒は「解放された役」の置き場へ置きました。', 'score');
  } else {
    // 役にならなかった塔の駒は今まで通り峡谷へ
    snapshot.forEach(function(t){ G.canyon.push(t); });
    log(p.name + 'の桜門' + (gi+1) + 'の塔を解放：役なし 0点（基礎0点＋高さ加点0点＋染め加点0点＝0点）（積まれていた駒：' + contents + '）', 'sys');
  }
  return pts;
}

