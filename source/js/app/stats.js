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
  saveJSON(STATS_KEY, st);
}
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
  /* 作った役 */
  const roles = Object.keys(st.roles || {}).map(function(k){ return [k, st.roles[k]]; }).sort(function(a, b){ return b[1] - a[1]; });
  h += '<h4>作った役</h4>';
  if(!roles.length) h += '<p class="sub">まだ役を作っていません。</p>';
  else {
    h += '<div class="stats-roles">';
    roles.forEach(function(r){ h += '<div class="sr-row"><span>' + esc(r[0]) + '</span><b>' + r[1] + '回</b></div>'; });
    h += '</div>';
  }
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

