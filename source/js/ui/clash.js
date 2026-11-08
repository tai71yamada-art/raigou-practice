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

