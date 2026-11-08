/* ================= 戦績（端末に保存） ================= */
const STATS_DEFS = { games:{}, hatsu:{}, roles:{}, best:0, raigou:0, total:0 };
function loadStats(){ return loadJSON(STATS_KEY, STATS_DEFS); }
function recordStats(winner){
  if(G.statsSaved) return;
  G.statsSaved = true;
  const st = loadStats();
  st.games = st.games || {}; st.hatsu = st.hatsu || {}; st.roles = st.roles || {};
  const lv = G.difficulty || 'lv3';
  const g = st.games[lv] || { w:0, l:0, d:0, sum:0 };
  if(winner === 0) g.w++; else if(winner === 1) g.l++; else g.d++;
  g.sum += P(0).score;
  st.games[lv] = g;
  st.total = (st.total || 0) + 1;
  st.best = Math.max(st.best || 0, P(0).score);
  st.raigou = (st.raigou || 0) + ((G.raigouCounts && G.raigouCounts[0]) || 0);
  Object.keys(G.hatsuGame || {}).forEach(function(k){ st.hatsu[k] = (st.hatsu[k] || 0) + G.hatsuGame[k]; });
  (G.released || []).forEach(function(e){ if(e.pi === 0 && e.role) st.roles[e.role] = (st.roles[e.role] || 0) + 1; });
  /* v36 から記録する項目（記録を始めてからの対局だけを数える） */
  const ex = st.ex = Object.assign(newStatsEx(), st.ex || {});
  const T = G.tally || newTally();
  const res = winner === 0 ? 'w' : (winner === 1 ? 'l' : 'd');
  ex.n++;
  const side = G.sente === 0 ? ex.sente : ex.gote; side[res]++;
  if(res === 'w'){ ex.streak++; ex.bestStreak = Math.max(ex.bestStreak, ex.streak); } else ex.streak = 0;
  ex.recent.push(res); if(ex.recent.length > 10) ex.recent = ex.recent.slice(-10);
  const diff = P(0).score - P(1).score;
  if(res === 'w'){ ex.winDiff += diff; ex.winN++; } else if(res === 'l'){ ex.loseDiff += diff; ex.loseN++; }
  const rg = (G.raigouCounts || [0, 0]);
  ex.raigouMe += rg[0]; ex.raigouAi += rg[1]; ex.raigouMax = Math.max(ex.raigouMax, rg[0]);
  for(let k = 0; k < 3; k++) ex.gassen[k] += T.gassen[0][k];
  ex.attacked += T.attacked[0]; ex.blocked += T.blocked[0]; ex.goResp += T.goResp[0];
  ex.fuon += T.fuon[0]; ex.taboo += T.taboo[0];
  const bt = T.bestTower[0];
  if(bt && (!ex.bestTower || bt.pts > ex.bestTower.pts)) ex.bestTower = { role:bt.role, pts:bt.pts, at:Date.now() };
  saveJSON(STATS_KEY, st);
}
function newStatsEx(){
  return { n:0, sente:{ w:0, l:0, d:0 }, gote:{ w:0, l:0, d:0 }, streak:0, bestStreak:0, recent:[],
           winDiff:0, winN:0, loseDiff:0, loseN:0, raigouMe:0, raigouAi:0, raigouMax:0, gassen:[0,0,0],
           attacked:0, blocked:0, goResp:0, fuon:0, taboo:0, bestTower:null };
}
/* 役図鑑に並べる役（ルールブックの分類順） */
const ZUKAN = [
  { title:'基本役', roles:['桜花', '蓮花', '奇数蓮花', '偶数蓮花'] },
  { title:'組み合わせ役', roles:['桜々花', '蓮々花', '桜蓮花', '蓮桜花'] },
  { title:'特殊役', roles:['椿', '山茶花'] },
  { title:'雷神役', raijin:true, roles: RAIJIN_ROLES.map(function(r){ return r.name; }) }
];
function openStats(){
  const st = loadStats();
  const lvs = ['lv1','lv2','lv3','lv4','lv5','lv6','lv7'];
  let W = 0, L = 0, D = 0, S = 0;
  lvs.forEach(function(k){ const g = (st.games || {})[k]; if(g){ W += g.w; L += g.l; D += g.d; S += g.sum; } });
  const N = W + L + D;
  const pct = function(w, n){ return n ? Math.round(w * 100 / n) + '%' : '―'; };
  let h = '<div class="guide-back"><div class="guide-box stats-box" role="dialog" aria-label="戦績">';
  h += '<h3 class="serif">戦績</h3>';
  h += '<div class="stats-kpis">' +
       '<div class="kpi"><span>対戦</span><b>' + N + '</b></div>' +
       '<div class="kpi"><span>勝率</span><b>' + pct(W, N) + '</b></div>' +
       '<div class="kpi"><span>最高陽玉</span><b>' + (st.best || 0) + '</b></div>' +
       '<div class="kpi"><span>平均陽玉</span><b>' + (N ? (S / N).toFixed(1) : '―') + '</b></div>' +
       '<div class="kpi"><span>雷轟解放</span><b>' + (st.raigou || 0) + '</b></div></div>';
  const ex = Object.assign(newStatsEx(), st.ex || {});
  const kpi = function(label, val){ return '<div class="kpi"><span>' + label + '</span><b>' + val + '</b></div>'; };
  const sgn = function(v){ return (v > 0 ? '+' : '') + v; };
  /* 連勝・最近の10局 */
  h += '<div class="stats-kpis k3">' + kpi('連勝中', ex.streak) + kpi('最高連勝', ex.bestStreak) +
       kpi('平均点差', ex.winN || ex.loseN ? '<small>勝</small>' + (ex.winN ? sgn((ex.winDiff / ex.winN).toFixed(1)) : '―') + ' <small>負</small>' + (ex.loseN ? sgn((ex.loseDiff / ex.loseN).toFixed(1)) : '―') : '―') + '</div>';
  h += '<div class="st-recent" aria-label="最近の10局"><span class="st-recent-label">最近の10局</span>';
  if(!ex.recent.length) h += '<span class="sub">まだありません</span>';
  ex.recent.forEach(function(r){ h += '<i class="' + r + '">' + ({ w:'勝', l:'負', d:'分' })[r] + '</i>'; });
  h += '</div>';
  /* 先手・後手 */
  h += '<h4>先手・後手</h4><div class="stats-table"><div class="st-row st-head"><span></span><span>勝</span><span>負</span><span>分</span><span>勝率</span></div>';
  [['先手', ex.sente], ['後手', ex.gote]].forEach(function(r){
    const n = r[1].w + r[1].l + r[1].d;
    h += '<div class="st-row"><span>' + r[0] + '</span><span>' + r[1].w + '</span><span>' + r[1].l + '</span><span>' + r[1].d + '</span><span>' + pct(r[1].w, n) + '</span></div>';
  });
  h += '</div>';
  /* 雷轟まわり */
  h += '<h4>雷轟</h4><div class="stats-kpis k3">' +
       kpi('雷轟解放<small>あなた／AI</small>', ex.raigouMe + '<small>／' + ex.raigouAi + '</small>') +
       kpi('1局の最多', ex.raigouMax) +
       kpi('雷轟合戦<small>勝・負・分</small>', ex.gassen.join('・')) + '</div>';
  const defOk = ex.blocked + ex.goResp;
  h += '<div class="stats-kpis k3">' + kpi('狙われた', ex.attacked) + kpi('陣で防いだ<small>／轟で応じた</small>', ex.blocked + '<small>／' + ex.goResp + '</small>') +
       kpi('受けの成功率', pct(defOk, ex.attacked)) + '</div>';
  h += '<p class="sub st-note">狙われた＝相手の雷・蛇・斬があなたに向いた回数。陣（霧）で防いだ・轟で応じた割合を成功率にしています。</p>';
  /* ミスの記録 */
  const pen = ex.fuon + ex.taboo;
  h += '<h4>ミスの記録</h4><div class="stats-kpis k3">' + kpi('不穏の塔', ex.fuon) + kpi('禁忌', ex.taboo) +
       kpi('1局の平均', ex.n ? (pen / ex.n).toFixed(2) : '―') + '</div>';
  h += '<p class="sub st-note">陽玉を失ったミスの回数です。1局の平均が減っていけば上達のしるし。</p>';
  /* 最高点の塔 */
  h += '<h4>最高点の塔</h4>' + (ex.bestTower
       ? '<div class="st-best"><b>' + ex.bestTower.pts + '点</b><span>' + esc(ex.bestTower.role) + '</span></div>'
       : '<p class="sub">まだありません。</p>');
  if(ex.n < N) h += '<p class="sub st-note">ここまでの項目は、記録を始めてからの' + ex.n + '局分です（それより前の' + (N - ex.n) + '局は含みません）。</p>';
  h += '<h4>AIの強さ別</h4><div class="stats-table"><div class="st-row st-head"><span>強さ</span><span>勝</span><span>負</span><span>分</span><span>勝率</span></div>';
  lvs.forEach(function(k, i){
    const g = (st.games || {})[k] || { w:0, l:0, d:0 };
    const n = g.w + g.l + g.d;
    h += '<div class="st-row"><span>Lv.' + (i + 1) + '</span><span>' + g.w + '</span><span>' + g.l + '</span><span>' + g.d + '</span><span>' + pct(g.w, n) + '</span></div>';
  });
  h += '</div>';
  /* 発した駒（陣・轟で応じた回数も含む） */
  const hat = st.hatsu || {};
  const hatMax = Math.max(1, Math.max.apply(null, GEN_DEF.map(function(d){ return hat[d.name] || 0; })));
  h += '<h4>発した駒の回数</h4><p class="sub st-note">陣・轟で応じた回数も含みます。</p><div class="stats-bars">';
  GEN_DEF.forEach(function(d){
    const n = hat[d.name] || 0;
    h += '<div class="sb-row"><div class="tile gen"><span class="w">' + d.w + '</span>' + d.name + '</div>' +
         '<div class="sb-track"><div class="sb-fill" style="width:' + Math.round(n * 100 / hatMax) + '%"></div></div><b>' + n + '</b></div>';
  });
  h += '</div>';
  /* 役図鑑：作ったことのある役に印。雷神役は達成すると光る */
  const rc = st.roles || {};
  let got = 0, all = 0;
  ZUKAN.forEach(function(g){ g.roles.forEach(function(r){ all++; if(rc[r]) got++; }); });
  h += '<h4>役図鑑 <small>' + got + ' / ' + all + '</small></h4>';
  ZUKAN.forEach(function(g){
    h += '<p class="zk-title">' + g.title + '</p><div class="zk-grid' + (g.raijin ? ' raijin' : '') + '">';
    g.roles.forEach(function(r){
      const n = rc[r] || 0;
      h += '<div class="zk' + (n ? ' on' : '') + '"><span>' + esc(r) + '</span><b>' + (n ? n + '回' : '未達成') + '</b></div>';
    });
    h += '</div>';
  });
  h += '<p class="sub st-note">最後まで対戦したゲームだけを記録します（この端末のこのブラウザに保存）。</p>';
  h += '<div class="btn-row"><button type="button" class="btn primary" data-guide-close>閉じる</button><button type="button" class="btn" id="statsReset">記録をリセット</button></div>';
  h += '</div></div>';
  const root = document.getElementById('guideRoot');
  root.innerHTML = h;
  root.querySelector('[data-guide-close]').addEventListener('click', closeGuide);
  root.querySelector('.guide-back').addEventListener('click', function(e){ if(e.target === e.currentTarget) closeGuide(); });
  const rb = document.getElementById('statsReset');
  rb.addEventListener('click', function(){
    if(!rb.classList.contains('armed')){ rb.classList.add('armed'); rb.textContent = 'もう一度押すとリセット'; return; }
    saveJSON(STATS_KEY, STATS_DEFS); openStats();
  });
}

