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
