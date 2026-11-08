/* ================= 対戦開始の雷の音（音声ファイル） ================= */
const VS_THUNDER = (function(){
  const VOL = 0.9;
  let buf = null, loading = null;
  function load(){
    if(buf) return Promise.resolve(buf);
    if(loading) return loading;
    const c = SFX.ctx(), el = document.getElementById('vsThunderData');
    if(!c || !el || !el.textContent.length) return Promise.resolve(null);
    const bin = atob(el.textContent.replace(/\s+/g, '')), u = new Uint8Array(bin.length);
    for(let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    loading = new Promise(function(res){
      try{
        const pr = c.decodeAudioData(u.buffer, function(b){ res(b); }, function(){ res(null); });
        if(pr && pr.then) pr.then(res, function(){ res(null); });
      }catch(_){ res(null); }
    }).then(function(b){ buf = b; if(!b) loading = null; return b; });
    return loading;
  }
  return {
    preload: function(){ load(); },
    play: function(){
      if(!SETTINGS.sound) return;
      load().then(function(b){
        const c = SFX.ctx(); if(!c || !b) return;
        const g = c.createGain(); g.gain.value = VOL; g.connect(c.destination);
        const src = c.createBufferSource(); src.buffer = b; src.connect(g);
        src.onended = function(){ src.disconnect(); g.disconnect(); };
        src.start(0);
      });
    }
  };
})();
