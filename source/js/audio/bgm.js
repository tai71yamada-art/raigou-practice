/* ================= BGM =================
   曲は約142.6秒で同じ演奏をくり返すので、1周分（＋つなぎ用に少し）だけを入れ、
   WebAudio の AudioBuffer のループ（loopStart〜loopEnd）でつなぎ目なく回す。
   つなぎ目は、波形が最もそろう位置（2.2916秒 → 144.9003秒）を選んである。 */
const BGM = (function(){
  const BASE = 0.32;     // 効果音より控えめに（大の音量）
  function vol(){ return BASE * (BGM_VOLS[SETTINGS.bgmVol] || 1); }
  /* el：HTMLに埋め込んだ曲データ／file：ホーム画面版で横に置く mp3 */
  const TRACKS = {
    battle: { el:'bgmData',      file:'bgm.mp3',       ls:2.291587,           le:144.900272 },
    title:  { el:'bgmTitleData', file:'bgm_title.mp3', ls:25.946666666666665, le:173.94666666666666 }
  };
  const bufs = {}, loads = {};
  let src = null, gain = null, want = null, cur = null;
  function bytes(id){
    const el = document.getElementById(id);
    if(!el || !el.textContent.length) return null;
    const b64 = el.textContent.replace(/\s+/g, '');
    const bin = atob(b64), len = bin.length, out = new Uint8Array(len);
    for(let i = 0; i < len; i++) out[i] = bin.charCodeAt(i);
    return out.buffer;
  }
  function load(name){
    if(bufs[name]) return Promise.resolve(bufs[name]);
    if(loads[name]) return loads[name];
    const c = SFX.ctx(), T = TRACKS[name]; if(!c || !T) return Promise.resolve(null);
    const abP = (function(){
      const ab = bytes(T.el);
      if(ab) return Promise.resolve(ab);
      if(!/^https?:$/.test(location.protocol)) return Promise.resolve(null);
      return fetch(T.file).then(function(r){ return r.ok ? r.arrayBuffer() : null; }).catch(function(){ return null; });
    })();
    loads[name] = abP.then(function(ab){ if(!ab) return null; return new Promise(function(res){
      try{
        const pr = c.decodeAudioData(ab, function(b){ res(b); }, function(){ res(null); });
        if(pr && pr.then) pr.then(res, function(){ res(null); });
      }catch(_){ res(null); }
    }); }).then(function(b){
      bufs[name] = b;
      if(b){ const el = document.getElementById(T.el); if(el) el.textContent = ''; }
      else loads[name] = null;
      return b;
    });
    return loads[name];
  }
  function ensureGain(c){
    if(!gain){ gain = c.createGain(); gain.gain.value = 0; gain.connect(c.destination); }
    return gain;
  }
  function fadeTo(v, sec){
    const c = SFX.ctx(); if(!c || !gain) return;
    const t = c.currentTime;
    gain.gain.cancelScheduledValues(t);
    gain.gain.setValueAtTime(gain.gain.value, t);
    gain.gain.linearRampToValueAtTime(v, t + sec);
  }
  function stopSrc(){ if(src){ try{ src.stop(); }catch(_){} src.disconnect(); src = null; cur = null; } }
  function play(name){
    const c = SFX.ctx(), b = bufs[name], T = TRACKS[name];
    if(!c || !b || want !== name || !SETTINGS.bgm) return;
    stopSrc();
    const g = ensureGain(c);
    g.gain.cancelScheduledValues(c.currentTime); g.gain.setValueAtTime(0, c.currentTime);
    src = c.createBufferSource();
    src.buffer = b; src.loop = true;
    src.loopStart = T.ls; src.loopEnd = Math.min(T.le, b.duration);
    src.connect(g);
    src.start(0, 0);
    cur = name;
    fadeTo(vol(), 1.0);
  }
  function startTrack(name){
    if(want === name && cur === name) return;
    want = name;
    if(!SETTINGS.bgm) return;
    SFX.ctx();
    if(cur && cur !== name){
      /* 前の曲を短くフェードアウトしてから次の曲へ */
      fadeTo(0, 0.35);
      const s0 = src;
      setTimeout(function(){ if(s0 === src && want === name) stopSrc(); load(name).then(function(){ play(name); }); }, 380);
    } else {
      load(name).then(function(){ play(name); });
    }
  }
  return {
    /* 対戦の曲（対戦開始のタップの中、または演出の後に呼ぶ）。曲の頭から流す */
    start: function(){ startTrack('battle'); },
    /* スタート画面の曲 */
    title: function(){ startTrack('title'); },
    /* スタート画面の曲だけを先に止める（対戦開始の演出の間は無音にする） */
    stop: function(){
      want = null;
      fadeTo(0, 0.6);
      const s0 = src;
      setTimeout(function(){ if(!want && s0 === src) stopSrc(); }, 650);
    },
    /* 設定で切り替えた時 */
    apply: function(){
      if(!SETTINGS.bgm){ fadeTo(0, 0.3); const s0 = src; setTimeout(function(){ if(!SETTINGS.bgm && s0 === src) stopSrc(); }, 350); }
      else if(want && !src){ const w = want; load(w).then(function(){ play(w); }); }
      else if(want){ fadeTo(vol(), 0.3); }
    },
    /* アプリが裏に回ったら音ごと一時停止し、戻ったら続きから */
    vis: function(hidden){
      const c = SFX.ctx(); if(!c) return;
      try{ if(hidden) c.suspend(); else c.resume(); }catch(_){}
    },
    playing: function(){ return cur; },
    /* 起動時の読み込み画面で、スタート画面の曲を先に展開しておく（最初のタップですぐ鳴らせるように） */
    preload: function(name){ return load(name); }
  };
})();
