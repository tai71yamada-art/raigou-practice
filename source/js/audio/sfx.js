/* ================= 効果音（音声ファイルは使わず、その場で合成） ================= */
const SFX = (function(){
  let ctx = null;
  function ac(){
    if(!ctx){
      const C = window.AudioContext || window.webkitAudioContext;
      if(!C) return null;
      try{ ctx = new C(); }catch(_){ return null; }
    }
    if(ctx.state === 'suspended'){ try{ ctx.resume(); }catch(_){} }
    return ctx;
  }
  function tone(c, f1, f2, t0, dur, type, vol){
    const o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine';
    const t = c.currentTime + t0;
    o.frequency.setValueAtTime(f1, t);
    if(f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(c.destination);
    o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(c, t0, dur, vol, freq, q, type){
    const len = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    for(let i=0;i<len;i++) d[i] = (Math.random()*2-1) * Math.pow(1 - i/len, 2);
    const s = c.createBufferSource(); s.buffer = buf;
    const f = c.createBiquadFilter(); f.type = type || 'lowpass'; f.frequency.value = freq || 1200; f.Q.value = q || 0.7;
    const g = c.createGain(); g.gain.value = vol;
    s.connect(f); f.connect(g); g.connect(c.destination);
    s.start(c.currentTime + t0);
  }
  const S = {
    stack:  function(c){ noise(c, 0, 0.07, 0.5, 2600, 1.2, 'bandpass'); tone(c, 190, 120, 0, 0.09, 'triangle', 0.18); },
    draw:   function(c){ noise(c, 0, 0.09, 0.25, 4200, 0.8, 'highpass'); tone(c, 700, 980, 0, 0.07, 'sine', 0.06); },
    cut:    function(c){ noise(c, 0, 0.32, 0.35, 1800, 0.9, 'bandpass'); tone(c, 300, 900, 0, 0.25, 'sawtooth', 0.04); },
    thunder:function(c){ noise(c, 0, 0.12, 0.9, 5000, 0.5, 'highpass'); noise(c, 0.05, 1.1, 0.9, 420, 0.6); tone(c, 70, 38, 0.04, 0.9, 'sine', 0.35); },
    gain:   function(c, i){ const f = 880 * Math.pow(2, Math.min(i||0, 12) / 12); tone(c, f, null, 0, 0.18, 'triangle', 0.12); tone(c, f*2, null, 0.02, 0.12, 'sine', 0.04); },
    gainAi: function(c){ tone(c, 520, null, 0, 0.12, 'triangle', 0.06); },
    bad:    function(c){ tone(c, 160, 95, 0, 0.32, 'sawtooth', 0.09); },
    hide:   function(c){ tone(c, 620, 310, 0, 0.12, 'sine', 0.1); },
    win:    function(c){ [0,4,7,12].forEach(function(n, i){ tone(c, 523*Math.pow(2,n/12), null, i*0.11, 0.35, 'triangle', 0.13); }); },
    lose:   function(c){ [7,3,0,-5].forEach(function(n, i){ tone(c, 392*Math.pow(2,n/12), null, i*0.16, 0.4, 'triangle', 0.1); }); }
  };
  return {
    play: function(name, arg){
      if(!SETTINGS.sound) return;
      const c = ac(); if(!c || !S[name]) return;
      try{ S[name](c, arg); }catch(_){}
    },
    unlock: function(){ if(SETTINGS.sound || SETTINGS.bgm) ac(); },
    ctx: function(){ return ac(); }
  };
})();

