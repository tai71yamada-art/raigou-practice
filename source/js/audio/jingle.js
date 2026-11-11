/* ================= 勝利・敗北のジングル（音声ファイル） ================= */
const JINGLE = (function(){
  const CLIPS = { win:{ el:'jingleWinData', vol:0.42 }, lose:{ el:'jingleLoseData', vol:0.9 } };
  const bufs = {}, loads = {};
  let src = null, gain = null;
  function load(k){
    if(bufs[k]) return Promise.resolve(bufs[k]);
    if(loads[k]) return loads[k];
    const c = SFX.ctx(), el = document.getElementById(CLIPS[k].el);
    if(!c || !el || !el.textContent.length) return Promise.resolve(null);
    const bin = atob(el.textContent.replace(/\s+/g, '')), u = new Uint8Array(bin.length);
    for(let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    loads[k] = new Promise(function(res){
      try{
        const pr = c.decodeAudioData(u.buffer, function(b){ res(b); }, function(){ res(null); });
        if(pr && pr.then) pr.then(res, function(){ res(null); });
      }catch(_){ res(null); }
    }).then(function(b){ bufs[k] = b; if(!b) loads[k] = null; return b; });
    return loads[k];
  }
  function stop(){
    if(src){
      const c = SFX.ctx(), s0 = src, g0 = gain; src = null; gain = null;
      try{ g0.gain.setTargetAtTime(0, c.currentTime, 0.06); s0.stop(c.currentTime + 0.3); }catch(_){}
    }
  }
  return {
    preload: function(){ load('win'); load('lose'); },
    play: function(k){
      stop();
      if(!SETTINGS.sound || !CLIPS[k]) return;
      load(k).then(function(b){
        const c = SFX.ctx(); if(!c || !b) return;
        const g = c.createGain(); g.gain.value = CLIPS[k].vol; g.connect(c.destination);
        const s = c.createBufferSource(); s.buffer = b; s.connect(g);
        s.onended = function(){ s.disconnect(); g.disconnect(); if(src === s){ src = null; gain = null; } };
        s.start(0); src = s; gain = g;
      });
    },
    stop: stop
  };
})();
/* スタート画面：最初の操作（タップ・キー）で音を出せるようになったら、タイトルの曲を流す */
(function(){
  function kick(e){
    if(e && e.target && e.target.closest && e.target.closest('#startGoBtn')) return;
    const ss = document.getElementById('startScreen');
    if(ss && !ss.hidden && !BGM.playing()) BGM.title();
    VS_THUNDER.preload();
  }
  ['pointerup','touchend','keydown'].forEach(function(ev){ document.addEventListener(ev, kick, { passive:true }); });
})();
document.addEventListener('visibilitychange', function(){ BGM.vis(document.hidden); });
/* iPhoneでは音を出す前に一度タップが必要 */
document.addEventListener('pointerdown', function(){ SFX.unlock(); }, { passive:true });

