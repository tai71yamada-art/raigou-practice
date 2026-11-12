/* ================= 雷轟合戦カットイン：左＝相手（AI）、右＝自分。斜めの境界に電撃が走る ================= */
function clashZig(x1,y1,x2,y2,seg,amp,seed){
  let s = seed; const rnd = function(){ s = (s*9301+49297)%233280; return s/233280; };
  const pts = [];
  for(let i=0;i<=seg;i++){
    const t=i/seg; let x=x1+(x2-x1)*t, y=y1+(y2-y1)*t;
    if(i>0 && i<seg){ const nx=-(y2-y1), ny=(x2-x1), L=Math.hypot(nx,ny); const o=(rnd()*2-1)*amp; x+=nx/L*o; y+=ny/L*o; }
    pts.push(x.toFixed(1)+','+y.toFixed(1));
  }
  return pts.join(' ');
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
      '<div class="cl-side ai"><div class="cl-speed"></div><img class="cl-chara' + oppImgClass() + '" src="' + oppCutImg() + '" alt=""><div class="cl-tag ai"><small>' + (OPP_CHARA ? 'RIVAL' : (oppUnit() ? 'ARGUS' : 'CPU')) + '</small>' + esc(oppNamed() ? oppLabel() : ai.name) + '</div></div>' +
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
