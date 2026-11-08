/* ================= 起動時のローディング =================
   画像・フォント・カットイン動画を読み込み終えてから、スタート画面の操作を受け付ける。
   どれかが失敗したり時間がかかりすぎたりしても止まらないよう、各段階に上限時間を設けている */
(function bootLoad(){
  const screen = document.getElementById('loadScreen');
  const fill = document.getElementById('lsFill'), pctEl = document.getElementById('lsPct');
  const noteEl = document.getElementById('lsNote'), bar = document.getElementById('lsBar');
  let prog = 0;
  function set(p, note){
    prog = Math.max(prog, Math.min(1, p));
    const v = Math.round(prog * 100);
    if(fill) fill.style.width = v + '%';
    if(pctEl) pctEl.textContent = v + '%';
    if(bar) bar.setAttribute('aria-valuenow', String(v));
    if(note && noteEl) noteEl.textContent = note;
  }
  function limit(p, ms){ return Promise.race([Promise.resolve(p).catch(function(){}), new Promise(function(r){ setTimeout(r, ms); })]); }
  function loadImg(src){
    return new Promise(function(res){
      const im = new Image();
      im.onload = function(){ if(im.decode) im.decode().then(res, res); else res(); };
      im.onerror = function(){ res(); };
      im.src = src;
    });
  }
  const lockBtns = ['startGoBtn','ruleBtn','houseBtn','diffBtn','orderBtn'].map(function(id){ return document.getElementById(id); }).filter(Boolean);
  lockBtns.forEach(function(b){ b.disabled = true; });
  let finished = false;
  function done(){
    if(finished) return; finished = true;
    set(1, '準備完了');
    lockBtns.forEach(function(b){ b.disabled = false; });
    try{ VS_THUNDER.preload(); JINGLE.preload(); }catch(_){}
    setTimeout(function(){ if(screen){ screen.classList.add('done'); setTimeout(function(){ screen.hidden = true; }, 450); } }, 250);
  }
  // 全体の安全装置：何があっても20秒で先へ進める
  setTimeout(done, 20000);
  (async function(){
    // 1. 画像（ページ内の画像＋カットイン用の静止画）
    set(0.02, '画像を読み込んでいます');
    const srcs = [];
    document.querySelectorAll('img').forEach(function(im){ if(im.getAttribute('src')) srcs.push(im.getAttribute('src')); });
    srcs.push(AI_IMG, ME_AVATAR, CUT_IMG_ME, RESULT_IMG_WIN, RESULT_IMG_LOSE, FACE_IMG.act, FACE_IMG.hit, FACE_IMG.joy);
    let n = 0;
    await limit(Promise.all(srcs.map(function(src){ return loadImg(src).then(function(){ n++; set(0.02 + 0.68 * n / srcs.length); }); })), 8000);
    // 2. フォント
    set(0.7, 'フォントを読み込んでいます');
    if(document.fonts && document.fonts.load){
      const fams = ['1em "Zen Antique"', '700 1em "Zen Kaku Gothic Antique"', '900 1em "Zen Kaku Gothic Antique"', '700 1em "Chakra Petch"'];
      let f = 0;
      await limit(Promise.all(fams.map(function(fm){ return document.fonts.load(fm, '雷轟').catch(function(){}).then(function(){ f++; set(0.7 + 0.28 * f / fams.length); }); })), 5000);
    }
    done();
  })().catch(done);
})();
