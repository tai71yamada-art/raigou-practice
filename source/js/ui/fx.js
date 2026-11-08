/* ================= カットイン＆効果アニメーション ================= */
function fxLayerEl(){
  let el = document.getElementById('fxLayer');
  if(!el){ el = document.createElement('div'); el.id = 'fxLayer'; document.body.appendChild(el); }
  return el;
}
function fxRectOf(sel){
  const el = document.querySelector(sel);
  return el ? el.getBoundingClientRect() : null;
}
function fxGateRect(pi, gi){ return fxRectOf('[data-gate="' + pi + ':' + gi + '"] .g-stack') || fxRectOf('[data-gate="' + pi + ':' + gi + '"]'); }
function fxWait(ms){ return wait(REDUCED_MOTION ? Math.min(ms, 160) : ms); }
/* 「隠」のカットイン（言霊のカットインと同じ系統の演出で、1秒弱の短め表示） */
async function playHideCutIn(actorPi){
  SFX.play('hide');
  const root = document.getElementById('fxRoot');
  if(!root) return;
  const who = (actorPi !== null && actorPi !== undefined && P(actorPi)) ? P(actorPi).name : '';
  root.innerHTML = '<div class="fx-cut fx-cut-hide"><div class="fx-cut-who">' + (who ? esc(who) + ' の手番終了' : '手番終了') + '</div><div class="fx-cut-chars"><span class="fx-cut-char">隠</span></div></div>';
  G.fxBusy = true;
  await fxWait(880);
  root.innerHTML = '';
  G.fxBusy = false;
}
/* 言霊のカットイン（霧でまねた場合は効果の方の言霊名を渡す）
   横に言霊の名前だけを大きく出す。プレイヤーの言霊は自キャラの静止画イラスト
   （cutin.jpg がスライドイン＋言霊名の大きな文字、約1.45秒表示）、
   AIの言霊はAIの画像（青い基板・チップ）の静止画を使う。
   #fxRoot は pointer-events:none なので、表示中もモーダルや盤面の操作は妨げない */

