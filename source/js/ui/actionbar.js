/* ================= アクションバー ================= */
function btn(cmd, label, cls, disabled){
  return '<button type="button" class="btn ' + (cls||'') + '" data-cmd="' + cmd + '"' + (disabled ? ' disabled' : '') + '>' + label + '</button>';
}
function renderActionbar(){
  const bar = document.getElementById('actionbar');
  if(!bar) return;
  if(!G.started) { bar.innerHTML=''; return; }
  if(G.over){ bar.innerHTML = '<p class="hint">対戦は終わりました。結果の画面を見てください。</p>'; return; }
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
