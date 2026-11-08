/* ================= 設定画面 ================= */
function openSettings(){
  const seg = function(key, opts){
    const cur = key === 'bgmMode' ? (SETTINGS.bgm ? (SETTINGS.bgmVol || 'large') : 'off') : SETTINGS[key];
    return '<div class="seg" data-seg="' + key + '">' + opts.map(function(o){
      return '<button type="button" class="seg-btn' + (String(cur) === String(o.v) ? ' on' : '') + '" data-v="' + o.v + '">' + esc(o.label) + '</button>';
    }).join('') + '</div>';
  };
  let h = '<div class="guide-back"><div class="guide-box small settings-box" role="dialog" aria-label="設定">';
  h += '<h3 class="serif">設定</h3>';
  h += '<div class="set-sec"><div class="set-title">AIの強さ</div>' + seg('diff', START_DIFF_OPTIONS.map(function(o){ return { v:o.v, label:o.label }; })) + '</div>';
  h += '<div class="set-sec"><div class="set-title">AIの行動の速さ</div>' + seg('aiSpeed', AI_SPEEDS) + '</div>';
  h += '<div class="set-sec"><div class="set-title">確認の省略</div>' + seg('skipConfirm', [{ v:'false', label:'オフ' }, { v:'true', label:'オン' }]) +
       '<p class="sub set-desc">「これでいいですか？」や、積む前の仮置きの確認を省きます。不穏の塔になる積み方だけは確認します。</p></div>';
  h += '<div class="set-sec"><div class="set-title">BGM</div>' + seg('bgmMode', [{ v:'off', label:'オフ' }, { v:'small', label:'小' }, { v:'mid', label:'中' }, { v:'large', label:'大' }]) + '</div>';
  h += '<div class="set-sec"><div class="set-title">効果音</div>' + seg('sound', [{ v:'false', label:'オフ' }, { v:'true', label:'オン' }]) + '</div>';
  h += '<p class="set-ver">バージョン ' + APP_VERSION + '</p>';
  h += '<div class="btn-row"><button type="button" class="btn primary" data-guide-close>閉じる</button></div>';
  h += '</div></div>';
  const root = document.getElementById('guideRoot');
  root.innerHTML = h;
  root.querySelector('[data-guide-close]').addEventListener('click', closeGuide);
  root.querySelector('.guide-back').addEventListener('click', function(e){ if(e.target === e.currentTarget) closeGuide(); });
  root.querySelectorAll('[data-seg]').forEach(function(segEl){
    const key = segEl.getAttribute('data-seg');
    segEl.querySelectorAll('.seg-btn').forEach(function(b){
      b.addEventListener('click', function(){
        let v = b.getAttribute('data-v');
        if(key === 'skipConfirm' || key === 'sound' || key === 'bgm') v = (v === 'true');
        if(key === 'bgmMode'){
          if(v === 'off') SETTINGS.bgm = false; else { SETTINGS.bgm = true; SETTINGS.bgmVol = v; }
        } else SETTINGS[key] = v;
        saveSettings();
        if(key === 'diff'){
          startDiff = v;
          const ds = document.getElementById('diffSelect'); if(ds) ds.value = v;
          if(G.started && !G.over && G.difficulty !== v){ G.difficulty = v; log('AIの強さを「' + diffName() + '」に変えました。', 'sys'); }
          syncStartButtons(); render();
        }
        if(key === 'sound' && v){ SFX.unlock(); SFX.play('gain', 4); }
        if(key === 'bgmMode') BGM.apply();
        segEl.querySelectorAll('.seg-btn').forEach(function(x){ x.classList.toggle('on', x === b); });
      });
    });
  });
}
