/* ================= 対戦開始の VS 演出 =================
   左＝相手（左右反転）、右＝自分。斜めの境界で衝突し、中央に VS と電撃。約2.65秒で対戦画面へ。 */
function playVsIntro(){
  return new Promise(function(done){
    VS_THUNDER.play();
    const root = document.getElementById('vsRoot');
    if(!root){ done(); return; }
    const p1 = clashZig(62,0,38,100,16,8,11), p2 = clashZig(62,0,38,100,20,11,43), p3 = clashZig(62,0,38,100,12,5,77);
    const bolt = '<svg class="cl-bolt" viewBox="0 0 100 100" preserveAspectRatio="none">' +
      '<polyline class="b1" points="'+p2+'" fill="none" stroke="#3aa8ff" stroke-width="2.8" vector-effect="non-scaling-stroke" opacity=".7"/>' +
      '<polyline class="b2" points="'+p1+'" fill="none" stroke="#7fd4ff" stroke-width="3.8" vector-effect="non-scaling-stroke"/>' +
      '<polyline points="'+p3+'" fill="none" stroke="#f2fbff" stroke-width="1.8" vector-effect="non-scaling-stroke"/></svg>';
    let sp = '', sd = 29; const r = function(){ sd = (sd*9301+49297)%233280; return sd/233280; };
    for(let i=0;i<34;i++){
      const a = r()*Math.PI*2, d = 40 + r()*110;
      sp += '<i class="cl-spark" style="left:calc(50% + ' + ((r()*2-1)*70).toFixed(0) + 'px);top:calc(50% + ' + ((r()*2-1)*42).toFixed(0) + '%);--dx:' + (Math.cos(a)*d).toFixed(0) + 'px;--dy:' + (Math.sin(a)*d).toFixed(0) + 'px;animation-delay:' + (0.5 + r()*0.7).toFixed(2) + 's"></i>';
    }
    root.innerHTML = '<div class="vs" role="status" aria-label="対戦開始：AI 対 あなた">' +
      '<div class="vs-side ai"><div class="vs-speed"></div><img class="vs-chara" src="' + AI_IMG + '" alt=""><div class="vs-tag ai"><small>CPU</small>' + houseIconHtml(AI_HOUSE.id) + 'AI</div></div>' +
      '<div class="vs-side me"><div class="vs-speed"></div><img class="vs-chara" src="' + CUT_IMG_ME + '" alt=""><div class="vs-tag me"><small>YOU</small>' + houseIconHtml(startHouse) + 'あなた</div></div>' +
      '<div class="vs-edge">' + bolt + sp + '</div>' +
      '<div class="vs-mark"><b>VS</b><span>BATTLE START</span></div>' +
      '<div class="vs-flash"></div></div>';
    fxWait(2350).then(function(){ done(); });
  });
}
async function playClash(mePi, aiPi){
  const root = document.getElementById('fxRoot');
  if(!root) return;
  if(mePi === 0) setMeFace('act');
  SFX.play('cut');
  const me = P(mePi), ai = P(aiPi);
  const p1 = clashZig(64,0,36,100,14,10,7), p2 = clashZig(64,0,36,100,18,14,31), p3 = clashZig(64,0,36,100,10,6,99);
  const bolt = '<svg class="cl-bolt" viewBox="0 0 100 100" preserveAspectRatio="none">' +
    '<polyline class="b1" points="'+p2+'" fill="none" stroke="#3aa8ff" stroke-width="2.6" vector-effect="non-scaling-stroke" opacity=".7"/>' +
    '<polyline class="b2" points="'+p1+'" fill="none" stroke="#7fd4ff" stroke-width="3.5" vector-effect="non-scaling-stroke"/>' +
    '<polyline points="'+p3+'" fill="none" stroke="#f2fbff" stroke-width="1.6" vector-effect="non-scaling-stroke"/></svg>';
  /* 火花はアニメーション用の見た目だけなので、ゲームの乱数を使わない固定の並びにする */
  let sp = '', s = 17; const r = function(){ s = (s*9301+49297)%233280; return s/233280; };
  for(let i=0;i<26;i++){
    const a = r()*Math.PI*2, d = 30 + r()*90;
    sp += '<i class="cl-spark" style="left:calc(50% + ' + ((r()*2-1)*60).toFixed(0) + 'px);top:calc(50% + ' + ((r()*2-1)*120).toFixed(0) + 'px);--dx:' + (Math.cos(a)*d).toFixed(0) + 'px;--dy:' + (Math.sin(a)*d).toFixed(0) + 'px;animation-delay:' + (0.5 + r()*0.6).toFixed(2) + 's"></i>';
  }
  root.innerHTML = '<div class="clash" role="status" aria-label="雷轟合戦：' + esc(ai.name) + ' 対 ' + esc(me.name) + '"><div class="cl-dim"></div>' +
    '<div class="cl-stage">' +
      '<div class="cl-title"><div class="cl-en">RAIGOU CLASH</div><div class="cl-jp"><span>雷</span><span>轟</span><span>合</span><span>戦</span></div></div>' +
      '<div class="cl-side ai"><div class="cl-speed"></div><img class="cl-chara" src="' + AI_IMG + '" alt=""><div class="cl-tag ai"><small>CPU</small>' + esc(ai.name) + '</div></div>' +
      '<div class="cl-side me"><div class="cl-speed"></div><img class="cl-chara" src="' + CUT_IMG_ME + '" alt=""><div class="cl-tag me"><small>YOU</small>' + esc(me.name) + '</div></div>' +
      '<div class="cl-edge">' + bolt + sp + '</div>' +
    '</div><div class="cl-flash"></div></div>';
  G.fxBusy = true;
  const tSnd = setTimeout(function(){ SFX.play('thunder'); }, REDUCED_MOTION ? 0 : 500);
  await fxWait(2330);
  clearTimeout(tSnd);
  root.innerHTML = '';
  G.fxBusy = false;
}
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
  const useVideo = !!(actor && !isAI && CUT_SPRITE && CUT_SPRITE_OK);
  if(actor && isAI) img = '<img class="fsc-img" src="' + AI_IMG + '" alt="">';
  else if(useVideo) img = '<div class="fsc-vidwrap"><canvas class="fsc-vid" width="' + CUT_SPRITE_META.w + '" height="' + CUT_SPRITE_META.h + '"></canvas></div>';
  else if(actor) img = '<img class="fsc-img" src="' + CUT_IMG_ME + '" alt="">';
  const cls = 'fsc' + (isAI ? ' ai' : '') + (actor ? '' : ' noimg') + (useVideo ? ' vid' : '');
  root.innerHTML = '<div class="' + cls + '" role="status" aria-label="' + esc((whoText ? whoText + '：' : '') + name) + '">' +
    '<div class="fsc-band">' + img +
      '<div class="fsc-text"><span class="fsc-en">' + info[0] + '</span><span class="fsc-name">' + esc(name) + '</span>' +
      (info[1] ? '<span class="fsc-sub">' + info[1] + '</span>' : '') + (whoText ? '<span class="fsc-who">' + whoText + '</span>' : '') + '</div>' +
    '</div></div>';
  let ms = 1450, stopAnim = null;
  if(useVideo){
    stopAnim = playCutSprite(root.querySelector('.fsc-vid'));
    ms = 1900;
    const fsc = root.querySelector('.fsc');
    if(fsc) fsc.style.animationDuration = ms + 'ms';
  }
  G.fxBusy = true;
  await fxWait(ms);
  if(stopAnim) stopAnim();
  root.innerHTML = '';
  G.fxBusy = false;
}
