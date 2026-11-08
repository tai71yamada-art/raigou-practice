/* ================= カットインのコマ送りアニメーション（自分の言霊） =================
   iPhone の Safari は動画の自動再生に制限があるため（低電力モード中は音なしでも再生されない）、
   動画から切り出したコマを1枚の画像（WebP）にまとめ、canvas に1コマずつ描いて動かす。
   画像データは <script type="text/plain" id="cutinSpriteData"> に置き、起動時のローディングで変換する。
   読み込めなかった端末では、これまで通り静止画のカットインになる */
const CUT_SPRITE_META = { n:18, w:264, h:486, cols:6, playMs:1300 };
let CUT_SPRITE = null, CUT_SPRITE_OK = false;
function decodeBase64Chunked(b64, onProgress){
  return new Promise(function(resolve, reject){
    try{
      b64 = b64.replace(/\s+/g, '');
      const pad = (b64.endsWith('==') ? 2 : (b64.endsWith('=') ? 1 : 0));
      const total = b64.length / 4 * 3 - pad;
      const out = new Uint8Array(total);
      const STEP = 4 * 32768; // 4の倍数の長さずつ atob する
      let pos = 0, o = 0;
      (function next(){
        try{
          const end = Math.min(b64.length, pos + STEP);
          const bin = atob(b64.slice(pos, end));
          for(let i=0; i<bin.length; i++) out[o++] = bin.charCodeAt(i);
          pos = end;
          if(onProgress) onProgress(pos / b64.length);
          if(pos < b64.length) setTimeout(next, 0);
          else resolve(out);
        }catch(e){ reject(e); }
      })();
    }catch(e){ reject(e); }
  });
}
function prepCutSprite(onProgress){
  return new Promise(function(resolve){
    const el = document.getElementById('cutinSpriteData');
    if(!el){ resolve(false); return; }
    const b64 = el.textContent.replace(/\s+/g, '');
    let settled = false;
    function finish(ok, img){
      if(settled) return; settled = true;
      CUT_SPRITE_OK = ok; if(ok){ CUT_SPRITE = img; el.textContent = ''; }
      if(onProgress) onProgress(1);
      resolve(ok);
    }
    function tryLoad(src, onFail){
      const img = new Image();
      img.onload = function(){
        if(!img.naturalWidth){ onFail(); return; }
        if(img.decode) img.decode().then(function(){ finish(true, img); }, function(){ finish(true, img); });
        else finish(true, img);
      };
      img.onerror = onFail;
      img.src = src;
    }
    decodeBase64Chunked(b64, function(p){ if(onProgress) onProgress(p * 0.85); })
      .then(function(bytes){
        let url = null;
        try{ url = URL.createObjectURL(new Blob([bytes], { type:'image/webp' })); }catch(e){}
        const viaData = function(){ tryLoad('data:image/webp;base64,' + b64, function(){ finish(false); }); };
        if(url) tryLoad(url, viaData); else viaData();
      })
      .catch(function(){ tryLoad('data:image/webp;base64,' + b64, function(){ finish(false); }); });
  });
}
/* canvas にコマを順に描く。最後のコマ（決めポーズ）で止める */
function playCutSprite(canvas){
  const m = CUT_SPRITE_META, img = CUT_SPRITE;
  if(!canvas || !img) return function(){};
  const ctx = canvas.getContext('2d');
  let last = -1, alive = true;
  function draw(i){
    if(i === last) return;
    last = i;
    ctx.clearRect(0, 0, m.w, m.h);
    ctx.drawImage(img, (i % m.cols) * m.w, Math.floor(i / m.cols) * m.h, m.w, m.h, 0, 0, m.w, m.h);
  }
  if(REDUCED_MOTION){ draw(m.n - 1); return function(){}; }
  const start = performance.now();
  draw(0);
  (function step(now){
    if(!alive) return;
    const t = (now || performance.now()) - start;
    draw(Math.min(m.n - 1, Math.floor(t / m.playMs * m.n)));
    if(t < m.playMs) requestAnimationFrame(step);
  })();
  return function(){ alive = false; };
}

