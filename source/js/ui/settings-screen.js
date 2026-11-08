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
function showResult(winner, detail){
  BGM.stop();
  recordStats(winner);
  if(winner === 0) JINGLE.play('win');
  else if(winner === 1) JINGLE.play('lose');
  else SFX.play('hide');
  const rsEl = document.getElementById('resultScreen');
  if(rsEl) rsEl.setAttribute('data-res', winner === 0 ? 'win' : (winner === 1 ? 'lose' : 'draw'));
  const rhImg = document.getElementById('resultHeroImg'), heroSrc = document.querySelector('.hero-img');
  if(rhImg){
    const want = winner === 0 ? RESULT_IMG_WIN : (winner === 1 ? RESULT_IMG_LOSE : ((charaAssets(startHouse) || {}).hero || ''));
    if(want && rhImg.getAttribute('src') !== want) rhImg.setAttribute('src', want);
  }
  const rEn = document.getElementById('resultEn'), rBig = document.getElementById('resultBig');
  if(rEn) rEn.textContent = winner === 0 ? 'VICTORY' : (winner === 1 ? 'DEFEAT' : 'DRAW');
  if(rBig) rBig.textContent = winner === 0 ? '勝利' : (winner === 1 ? '敗北' : '引分');
  const rhs = document.getElementById('resultHeroScore');
  if(rhs) rhs.innerHTML = '<b>' + P(0).score + '</b><i>vs</i><em>' + P(1).score + '</em><small>陽玉 · あなた 対 AI ' + esc(diffName()) + '</small>';
  document.getElementById('resultScore').textContent = '陽玉：あなた ' + P(0).score + '点 ／ AI ' + P(1).score + '点';
  document.getElementById('resultDetail').textContent = detail;
  const statsEl = document.getElementById('resultStats');
  if(statsEl){
    function rolesOf(pi){
      const roles = (G.released || []).filter(function(e){ return e.pi === pi; });
      return roles.length ? roles.map(function(e){ return '<span>' + esc(e.role) + ' <small>' + e.pts + '点</small></span>'; }).join('') : '<span class="muted">なし</span>';
    }
    function cell(v, cls){ return '<span class="rt-v' + (cls ? ' ' + cls : '') + '">' + v + '</span>'; }
    const rc = G.raigouCounts || [0,0], pc = G.penaltyCounts || [0,0];
    let sh = '<div class="result-table">';
    sh += '<div class="rt-row rt-head"><span></span><span class="rt-me">あなた</span><span>AI</span></div>';
    sh += '<div class="rt-row"><span class="rt-k">最終点数</span>' + cell(P(0).score, 'me num') + cell(P(1).score, 'num') + '</div>';
    sh += '<div class="rt-row"><span class="rt-k">作った役</span><span class="rt-v roles">' + rolesOf(0) + '</span><span class="rt-v roles">' + rolesOf(1) + '</span></div>';
    sh += '<div class="rt-row"><span class="rt-k">雷轟解放</span>' + cell(rc[0] || 0, 'me num') + cell(rc[1] || 0, 'num') + '</div>';
    sh += '<div class="rt-row"><span class="rt-k">ペナルティ<small>禁忌・不穏</small></span>' + cell(pc[0] || 0, 'num' + ((pc[0]||0) ? ' bad' : '')) + cell(pc[1] || 0, 'num' + ((pc[1]||0) ? ' bad' : '')) + '</div>';
    sh += '<div class="rt-row"><span class="rt-k">残りの内駒</span>' + cell(totalInner(P(0)), 'num') + cell(totalInner(P(1)), 'num') + '</div>';
    sh += '</div><p class="rt-note">陽玉が同点のときは、内駒の少ない方の勝ち</p>';
    statsEl.innerHTML = sh;
  }
  closeModal();
  document.getElementById('gameScreen').hidden = true;
  document.getElementById('resultScreen').hidden = false;
}
function backToStart(){
  JINGLE.stop();
  BGM.title();
  document.getElementById('gameScreen').hidden = true;
  document.getElementById('resultScreen').hidden = true;
  document.getElementById('startScreen').hidden = false;
  G.started = false; G.over = false;
}
