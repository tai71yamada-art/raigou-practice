/* ================= アクションバー ================= */
function btn(cmd, label, cls, disabled){
  return '<button type="button" class="btn ' + (cls||'') + '" data-cmd="' + cmd + '"' + (disabled ? ' disabled' : '') + '>' + label + '</button>';
}
function renderActionbar(){
  const bar = document.getElementById('actionbar');
  if(!bar) return;
  if(!G.started) { bar.innerHTML=''; return; }
  if(G.over){ bar.innerHTML = '<p class="hint">対戦は終わりました。結果の画面を見てください。</p>'; bar.classList.remove('ougi-space','empty'); return; }
  if(rulesNow().ougi){ renderOugiSpace(bar); return; }
  bar.classList.remove('ougi-space','empty');
  if(G.turn !== 0 || G.busy){
    bar.innerHTML = '<p class="hint">' + (G.isFinalTurn ? '<b>最終手番です（選はありません）。</b>' : '') + 'AIが考えています…（駒の動きとログで追えます）</p>';
    return;
  }
  if(G.phase === 'gen'){
    bar.innerHTML = '<p class="hint">' + (G.isFinalTurn ? '<b>最終手番です（選はありません）。</b>' : '') + '<b>現</b>：画面のポップアップで、体内の駒を手に移すか、0現にするか選んでください。</p>';
    return;
  }
  if(G.phase === 'sen'){
    bar.innerHTML = '<p class="hint"><b>選</b>：画面のポップアップで、引く枚数を選んで駒を配置してください。</p>';
    return;
  }
  bar.innerHTML = '<p class="hint">' + (G.isFinalTurn ? '<b>最終手番です（選はありません）。</b>' : '') + '<b>積・発</b>：手の駒をタップすると、その場で使える操作が出ます。桜門をタップすると塔を拡大できます。終わる時は右下の<b>「隠」</b>を押したまま上にスワイプしてください。</p>';
}

/* 競技雷轟：手順の説明の代わりに、効果が続いている奥義を出す。何も無い時は詰める */
function renderOugiSpace(bar){
  const items = [];
  const who = function(pi){ return pi === 0 ? 'あなた' : 'AI'; };
  if(G.isFinalTurn) items.push('<span class="os-tag">最終手番</span>この手番は選がありません。');
  if(G.metsu){
    const held = [];
    [0,1].forEach(function(pi){ P(pi).seals.forEach(function(s){ if(s && s.held) s.held.forEach(function(t){ held.push(t); }); }); });
    items.push('<span class="os-tag os-metsu">滅</span>' + who(G.metsu.owner) + 'の持続奥義　蓄積 <b>' + metsuSum() + '／' + METSU_LIMIT + '</b>' +
      (G.metsu.stack.length ? '：' + G.metsu.stack.map(tileLabel).join('・') : '') +
      (held.length ? '<small>（雷停中：' + held.map(tileLabel).join('・') + '）</small>' : ''));
  }
  if(G.homura) items.push('<span class="os-tag os-fire">焔</span>' + who(G.homura.pi) + 'の桜門' + (G.homura.gi + 1) + 'が炎上中（' + P(G.homura.pi).gates[G.homura.gi].length + '段）');
  if(G.fuuNow) items.push('<span class="os-tag">封</span>この手番、' + who(G.turn) + 'は選を行えません。');
  if(G.fuuSkip) [0,1].forEach(function(pi){ if(G.fuuSkip[pi]) items.push('<span class="os-tag">封</span>次の手番、' + who(pi) + 'は選を行えません。'); });
  if(G.kakuNow) items.push('<span class="os-tag">赫</span>この手番、' + who(G.turn) + 'は0現です。');
  if(G.kakuZero) [0,1].forEach(function(pi){ if(G.kakuZero[pi]) items.push('<span class="os-tag">赫</span>次の手番、' + who(pi) + 'は0現です。'); });
  bar.classList.add('ougi-space');
  bar.classList.toggle('empty', !items.length);
  bar.innerHTML = items.map(function(x){ return '<div class="os-item">' + x + '</div>'; }).join('');
}
