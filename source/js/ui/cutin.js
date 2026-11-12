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
    '雷轟合戦':['RAIGOU BATTLE','重い方の塔に雷が落ちる'],
    '雷神化':['RAIJINKA','奥義駒を開いた ― 月が3か所目の手に'],
    '覇':['OUGI','全ての塔の端の駒を捨て駒にする'],
    '天':['OUGI','塔の一番上の駒を入れ替える'],
    '啓':['OUGI','塔を上下2つに分ける'],
    '和':['OUGI','塔を公開し、重さの合計で陽玉が増減する'],
    '禅':['OUGI','体内の最も重い駒を相手へ移す'],
    '楼':['OUGI','塔を好きな順番に積み直す（一発奥義）'],
    '幻':['OUGI','除外された駒を自分の内駒にする'],
    '鳴':['OUGI','言霊1つと同じ効果を適用する'],
    '赫':['OUGI','次の手番は全員の「現」が0個'],
    '涼':['OUGI','全員の内駒を表向きにする'],
    '風':['OUGI','雷山から3個引き、1個を手に置く'],
    '凛':['OUGI','塔を公開し、雷山の駒で役の点数が決まる'],
    '鳳':['OUGI','相手と内駒を全て入れ替える'],
    '焔':['OUGI','桜門を炎上させる（一発奥義）'],
    '姫':['OUGI','相手の体内の駒と入れ替わる'],
    '滅':['OUGI','使った言霊を蓄積する（持続奥義）'],
    '封':['OUGI','相手は次の手番に「選」を行えない'],
    '神':['OUGI','役名を当てて塔を奪う（一発奥義）']
  };
  const info = INFO[name] || ['KOTODAMA',''];
  const whoText = actor ? esc(isAI ? oppLabel() : actor.name) + (name === '雷神化' ? '' : (ougiByName(name) ? ' の奥義' : ' の言霊')) : '';
  let img = '';
  if(actor && isAI) img = '<img class="fsc-img' + oppImgClass() + '" src="' + oppCutImg() + '" alt="">';
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
/* 奥義解放のカットイン（開をした時）：細い斜めの帯に目元を映す。
   目元の動画があるキャラは動画（音なし）、ないキャラとAIは目元の静止画。どの奥義駒を開いたかは出さない */
let EYES_IMG_ME = '', EYES_VIDEO_ME = '';
async function playOugiRelease(pi){
  const root = document.getElementById('fxRoot');
  if(!root) return;
  const p = P(pi), isAI = !!(p && p.isAI);
  if(!isAI) setMeFace('act');
  SFX.play('cut');
  const still = isAI ? oppEyesImg() : EYES_IMG_ME;
  const media = (!isAI && EYES_VIDEO_ME)
    ? '<video class="our-media" muted playsinline preload="auto" poster="' + still + '" src="' + EYES_VIDEO_ME + '"></video>'
    : '<img class="our-media our-still" src="' + still + '" alt="">';
  root.innerHTML = '<div class="our' + (isAI ? ' ai' : '') + '" role="status" aria-label="' + esc(p.name) + '：奥義解放">' +
    '<div class="our-band"><div class="our-win">' + media + '<div class="our-scan"></div></div></div>' +
    '<div class="our-title"><small>OUGI RELEASE</small>奥義解放</div>' +
    '<div class="our-who">' + esc(p.name) + ' ― 雷神化</div>' +
    '<div class="our-flash"></div></div>';
  /* 言霊のカットインと同じく、自キャラのアイコンの下から帯を出す（画面が低い時は下端に合わせる） */
  { const our = root.querySelector('.our'), av = document.querySelector('#humanZone .pz-avatar');
    if(our && av){ const r = av.getBoundingClientRect(), bh = root.querySelector('.our-band').offsetHeight, vh = window.innerHeight;
      if(r.height){ let top = r.bottom + 26; if(top + bh + 120 > vh) top = Math.max(r.bottom - bh * 0.3, vh - bh - 120); our.style.setProperty('--our-top', Math.round(top) + 'px'); } } }
  const v = root.querySelector('video');
  if(v){ setTimeout(function(){ try{ const pr = v.play(); if(pr && pr.catch) pr.catch(function(){}); }catch(_){} }, 160); }
  G.fxBusy = true;
  await fxWait(3300);
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
