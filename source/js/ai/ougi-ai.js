/* ================= AI：競技雷轟（開・奥義） ================= */
/* 開するかどうか。雷神化は手が1つ増えて内駒の上限も増えるので、開できる時は基本的にすぐ開く。
   Lv.1・Lv.2 はときどき見送る */
const AI_OUGI_LIKE = { '覇':1.0, '天':0.9, '啓':0.8 };
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
  }
}
function aiOugiText(act){
  const who = function(pi){ return pi === AI_SEAT ? '自分' : 'あなた'; };
  if(act.name === '覇') return '奥義「覇」：全ての塔の' + (act.end === 'top' ? '一番上' : '一番下') + 'を捨てる';
  if(act.name === '天') return '奥義「天」：自分の桜門' + (act.gi + 1) + 'の塔の一番上を入れ替える';
  if(act.name === '啓') return '奥義「啓」：' + who(act.target.pi) + 'の桜門' + (act.target.gi + 1) + 'の塔を2つに分ける';
  return '奥義';
}
async function aiOugiExecute(act, me){
  if(act.name === '覇') await primHa(me, act.hand, act.end);
  else if(act.name === '天') await primTen(me, act.hand, act.gi, act.loc);
  else if(act.name === '啓') await primKei(me, act.hand, act.target.pi, act.target.gi, act.k, act.part, act.dest);
}
