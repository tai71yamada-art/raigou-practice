/* ================= 言霊カットイン・「隠」のカットイン ================= */
/* 言霊のカットイン（霧でまねた場合は効果の方の言霊名を渡す）
   横に言霊の名前だけを大きく出す。プレイヤーの言霊は自キャラの静止画イラスト
   （キャラの画像セットの cutin がスライドイン＋言霊名の大きな文字、約1.45秒表示）、
   AIの言霊はAIの画像（青い基板・チップ）の静止画を使う。
   #fxRoot は pointer-events:none なので、表示中もモーダルや盤面の操作は妨げない */
async function playCutIn(name, actorPi){
  if(actorPi === 0) setMeFace('act');
  SFX.play('cut');
  const root = document.getElementById('fxRoot');
  if(!root) return;
  const actor = (actorPi !== null && actorPi !== undefined) ? P(actorPi) : null;
  const isAI = !!(actor && actor.isAI);
  /* 言霊ごとの補足（読みはルールブックに載っているものだけ） */
  const INFO = {
    '雷放':['KOTODAMA · RAI','らいほう — 塔を強制解放'],
    '雷停':['KOTODAMA · RAI','らいてい — 塔を封印'],
    '雷':['KOTODAMA · RAI','雷放か雷停を選ぶ'],
    '蛇':['KOTODAMA','内駒を1つ奪う'],
    '斬':['KOTODAMA','塔の端の駒を斬る'],
    '陣':['KOTODAMA','言霊の効果を無効化'],
    '轟':['KOTODAMA','雷を自分の塔へ引き寄せる'],
    '霧':['KOTODAMA','言霊をまねる'],
    '瞬':['KOTODAMA','駒を2つ入れ替える'],
    '浄':['KOTODAMA','捨てて引き直す'],
    '雷轟':['RAIGOU','雷と轟で解放 — 役が成立すれば +2'],
    '雷轟・雷停':['RAIGOU','雷と轟で塔を封印'],
    '雷轟合戦':['RAIGOU BATTLE','重い方の塔に雷が落ちる']
  };
  const info = INFO[name] || ['KOTODAMA',''];
  const whoText = actor ? esc(actor.name) + ' の言霊' : '';
  let img = '';
  if(actor && isAI) img = '<img class="fsc-img" src="' + AI_IMG + '" alt="">';
  else if(actor) img = '<img class="fsc-img" src="' + CUT_IMG_ME + '" alt="">';
  const cls = 'fsc' + (isAI ? ' ai' : '') + (actor ? '' : ' noimg');
  root.innerHTML = '<div class="' + cls + '" role="status" aria-label="' + esc((whoText ? whoText + '：' : '') + name) + '">' +
    '<div class="fsc-band">' + img +
      '<div class="fsc-text"><span class="fsc-en">' + info[0] + '</span><span class="fsc-name">' + esc(name) + '</span>' +
      (info[1] ? '<span class="fsc-sub">' + info[1] + '</span>' : '') + (whoText ? '<span class="fsc-who">' + whoText + '</span>' : '') + '</div>' +
    '</div></div>';
  placeCutInBand(root.querySelector('.fsc-band'));
  const ms = 1450;
  G.fxBusy = true;
  await fxWait(ms);
  root.innerHTML = '';
  G.fxBusy = false;
}
/* 帯が自キャラのアイコンに重ならないよう、アイコンの下から帯を出す
   （発動・受けた の表情が見えるように）。画面が低くて入らない時は画面の下端に合わせる */
function placeCutInBand(band){
  const av = document.querySelector('#humanZone .pz-avatar');
  if(!band || !av) return;
  const r = av.getBoundingClientRect();
  if(!r.height) return;
  const h = band.offsetHeight, vh = window.innerHeight;
  let top = r.bottom + 6;
  if(top + h > vh - 4) top = Math.max(r.bottom - h * 0.25, vh - h - 4);
  band.style.top = Math.round(top) + 'px';
  band.style.marginTop = '0';
}
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
