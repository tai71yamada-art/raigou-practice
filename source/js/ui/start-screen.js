/* ================= スタート画面の設定（AIの強さ／先手・後手／対戦開始） =================
   以前のラジオボタン式フォームの代わりに、ヒーロー内の3ボタン＋ポップアップで選ぶ。
   選択肢・説明文・初期値（Lv.3／先手）は以前のフォームと同一。 */
let startDiff = SETTINGS.diff || 'lv3';
let startOrder = 'sente';
let startRule = 'basic';
let startHouse = (SETTINGS.house && HOUSE_CHARA[SETTINGS.house]) ? SETTINGS.house : 'rakura';   // キャラクターの家（端末に保存）
applyChara(startHouse);
const START_RULE_OPTIONS = [
  { v:'basic', label:'基本ルール（奥義なし）', short:'基本ルール', d:'公式の2人戦をもとにした練習用のルールです。奥義駒と「滅」は入っていません。' },
  { v:'kyogi', label:'競技雷轟（奥義あり）', short:'競技雷轟', d:'シーズン6以降の大会ルール。奥義駒を2個持ち込みます。自分の桜門が3つとも埋まると「開」で1つを使えるようになり、雷神化して月が3か所目の手になります（積・発できる手は2か所まで）。' }
];
/* 競技雷轟で持ち込む奥義駒（2個）。AIの分は null＝おまかせ（ランダム） */
let startOugi = (Array.isArray(SETTINGS.ougi) ? SETTINGS.ougi : []).filter(function(n){ const o = ougiByName(n); return o && o.implemented && !o.kyogiBanned; }).slice(0, OUGI_BRING);
let startAiOugi = null;
const START_DIFF_OPTIONS = [
  { v:'lv1', label:'Lv.1', d:'決まりに沿って素直に動きます。たまに一番良い手ではない手を選び、妨害はあまりしません。まず慣れたい時に。' },
  { v:'lv2', label:'Lv.2', d:'Lv.1とLv.3の間です。素直に動きますが、Lv.3ほど正確ではなく、良い手を逃したり受けを外したりすることが時々あります。' },
  { v:'lv3', label:'Lv.3', d:'役の完成と高さ加点を優先し、満杯などの事故を避けます。完成した自分の塔は得点に変え、相手の未完成の高い塔には斬や雷放を使います。' },
  { v:'lv4', label:'Lv.4', d:'Lv.3とLv.5の間です。峡谷に出た駒を時々数えて残りを考え、陣・轟などの受け札を残す意識も持ち始めます。妨害や雷轟解放の狙いはLv.5ほど徹底しません。' },
  { v:'lv5', label:'Lv.5', d:'峡谷に出た駒を数えて残りを考え、相手の狙いを見て妨害の時機を選びます。陣・轟を手に残して雷轟解放も狙います。終盤は点差と雷山の残りで動きを変えます。' },
  { v:'lv6', label:'Lv.6', d:'Lv.3の堅実な組み立てに加えて、不穏の塔の後始末をします。一度不穏になった塔は要らない駒の捨て場にして桜門を空け、斬で直せる時は自分の塔を直して、終局の減点を避けます。AI同士の対戦でLv.3・Lv.5に勝ち越した強さです。' },
  { v:'lv7', label:'Lv.7', d:'1手ずつではなく「手番まるごと」で考えます。手の駒の使い方を順番も含めて頭の中で試し、手番が終わった時の盤面（確定した点・塔の見込み・不穏の塔・5段止め・雷の的・詰まり・相手の塔の崩れ方）が一番良くなる流れを選びます。斬は下を基本に狙います。' }
];
const START_ORDER_OPTIONS = [
  { v:'sente', label:'先手で始める', short:'先手', d:'体内1枚から始まります。' },
  { v:'gote', label:'後手で始める', short:'後手', d:'体内2枚から始まります。AIが先手です。' }
];
function syncStartButtons(){
  const dOpt = START_DIFF_OPTIONS.find(function(o){ return o.v === startDiff; });
  document.getElementById('diffBtnVal').textContent = dOpt ? dOpt.label : startDiff;
  const oOpt = START_ORDER_OPTIONS.find(function(o){ return o.v === startOrder; });
  document.getElementById('orderBtnVal').textContent = oOpt ? oOpt.short : startOrder;
  const rOpt = START_RULE_OPTIONS.find(function(o){ return o.v === startRule; });
  document.getElementById('ruleBtnVal').textContent = rOpt ? rOpt.short : startRule;
  document.getElementById('houseBtnVal').innerHTML = houseIconHtml(startHouse) + esc(HOUSE_CHARA[startHouse] || (houseById(startHouse).name + '家'));
  const kyogi = startRule === 'kyogi';
  const ob = document.getElementById('ougiBtn'), ab = document.getElementById('aiOugiBtn');
  if(ob){ ob.hidden = !kyogi; document.getElementById('ougiBtnVal').textContent = startOugi.length === OUGI_BRING ? startOugi.join('・') : '未選択'; }
  if(ab){ ab.hidden = !kyogi; document.getElementById('aiOugiBtnVal').textContent = startAiOugi ? startAiOugi.join('・') : 'おまかせ'; }
  if(typeof syncResumeUi === 'function') syncResumeUi();
}
function closeStartSetting(){ document.getElementById('startSettingRoot').innerHTML = ''; }
function openStartSetting(kind){
  const conf = {
    diff:  { title:'AIの強さ', options:START_DIFF_OPTIONS, get:function(){ return startDiff; }, set:function(v){ startDiff = v; SETTINGS.diff = v; saveSettings(); } },
    order: { title:'先手 / 後手', options:START_ORDER_OPTIONS, get:function(){ return startOrder; }, set:function(v){ startOrder = v; } },
    rule:  { title:'ルール', options:START_RULE_OPTIONS, get:function(){ return startRule; }, set:function(v){ startRule = v; } },
    house: { title:'キャラクターを選ぶ', grid:true,
             options:HOUSES.map(function(h){ const c = HOUSE_CHARA[h.id];
               return c ? { v:h.id, label:c, icon:h.id, img:HOUSE_CHARA_IMG[h.id] } : { v:h.id, label:'準備中', icon:h.id, disabled:true }; }),
             get:function(){ return startHouse; }, set:function(v){ startHouse = v; SETTINGS.house = v; saveSettings(); applyChara(v); } }
  }[kind];
  /* キャラ選択（grid）は、タイルを押しただけでは決まらない。「決定」で反映、「キャンセル」で前のまま閉じる */
  let current = conf.get();
  const root = document.getElementById('startSettingRoot');
  function draw(){
  let h = '<div class="guide-back"><div class="guide-box small' + (conf.grid ? ' house-pick' : '') + '" role="dialog" aria-label="' + conf.title + '">';
  h += '<h3 class="serif">' + conf.title + '</h3>';
  if(conf.grid) h += '<p class="sub house-pick-note">キャラの家の家紋が、桜門に入ります。</p><div class="house-grid">';
  conf.options.forEach(function(o){
    const on = o.v === current;
    if(o.img){
      /* キャラのタイル：左上に家紋、右下に立ち絵、左下に名前 */
      const nm = String(o.label).split(' ');
      h += '<button type="button" class="set-opt chara-tile' + (on ? ' on' : '') + '" data-setval="' + esc(o.v) + '" data-chara="' + esc(o.v) + '" aria-label="' + esc(o.label) + '">' +
           houseIconHtml(o.icon, 'ct-mon') + '<img class="ct-img" src="' + o.img + '" alt="">' +
           '<span class="ct-name"><small>' + esc(nm[0] || '') + '</small>' + esc(nm.slice(1).join(' ') || nm[0]) + '</span>' +
           (on ? '<span class="ct-check">選択中</span>' : '') + '</button>';
      return;
    }
    h += '<button type="button" class="set-opt' + (on ? ' on' : '') + '" data-setval="' + esc(o.v) + '"' + (o.disabled ? ' disabled' : '') + '>' +
         (o.icon ? houseIconHtml(o.icon, 'big') : '') +
         '<span class="so-head">' + esc(o.label) + (on ? '<span class="so-check">選択中</span>' : '') + (o.soon ? '<span class="so-soon">' + esc(o.soon) + '</span>' : '') + '</span>' +
         (o.d ? '<span class="so-desc">' + esc(o.d) + '</span>' : '') + '</button>';
  });
  if(conf.grid) h += '</div>';
  if(conf.grid) h += '<div class="btn-row"><button type="button" class="btn primary" data-set-ok>決定</button><button type="button" class="btn" data-set-close>キャンセル</button></div>';
  else h += '<div class="btn-row"><button type="button" class="btn" data-set-close>閉じる</button></div>';
  h += '</div></div>';
  root.innerHTML = h;
  root.querySelectorAll('[data-setval]').forEach(function(b){
    b.addEventListener('click', function(){
      if(b.disabled) return;
      if(conf.grid){
        const sc = root.querySelector('.guide-back').scrollTop;
        current = b.getAttribute('data-setval'); draw();
        root.querySelector('.guide-back').scrollTop = sc;
        return;
      }
      conf.set(b.getAttribute('data-setval'));
      syncStartButtons();
      closeStartSetting();
    });
  });
  const okBtn = root.querySelector('[data-set-ok]');
  if(okBtn) okBtn.addEventListener('click', function(){
    if(current !== conf.get()) conf.set(current);
    syncStartButtons();
    closeStartSetting();
  });
  root.querySelector('[data-set-close]').addEventListener('click', closeStartSetting);
  root.querySelector('.guide-back').addEventListener('click', function(e){ if(e.target === e.currentTarget) closeStartSetting(); });
  }
  draw();
}
document.getElementById('ruleBtn').addEventListener('click', function(){ openStartSetting('rule'); });
document.getElementById('houseBtn').addEventListener('click', function(){ openStartSetting('house'); });
document.getElementById('diffBtn').addEventListener('click', function(){ openStartSetting('diff'); });
document.getElementById('ougiBtn').addEventListener('click', function(){ openOugiPicker('me'); });
document.getElementById('aiOugiBtn').addEventListener('click', function(){ openOugiPicker('ai'); });
document.getElementById('orderBtn').addEventListener('click', function(){ openStartSetting('order'); });
let vsPlaying = false;
document.getElementById('startGoBtn').addEventListener('click', function(){ if(hasSave()) resumeBattle(); else startBattle(); });
/* 対戦開始（スタート画面の「対戦開始」とリザルトの「再戦」から）。条件はスタート画面の設定のまま */
function startBattle(){
  if(vsPlaying) return;
  if(startRule === 'kyogi' && startOugi.length !== OUGI_BRING){ openOugiPicker('me', true); return; }
  launchBattle(startOrder === 'sente', startDiff);
}
/* VS の演出のあと、対戦画面に切り替えて対局を始める。opts を省くとスタート画面の設定を使う。
   ストーリーの対戦は opts（ルール・自分のキャラ・相手の家・奥義駒）を渡す */
function launchBattle(sente, diff, opts){
  if(vsPlaying) return;
  JINGLE.stop();
  vsPlaying = true;
  closeStartSetting();
  BGM.stop();             // タイトルの曲を止めて、VS の演出は効果音だけ
  SFX.ctx();              // タップの中で音を使えるようにしておく（演出の後に対戦の曲を流すため）
  playVsIntro().then(function(){
    document.getElementById('startScreen').hidden = true;
    document.getElementById('resultScreen').hidden = true;
    document.getElementById('gameScreen').hidden = false;
    window.scrollTo(0, 0);
    if(typeof ADV !== 'undefined') ADV.hide();
    BGM.start();
    newGame(sente, diff, opts);
    const ds = document.getElementById('diffSelect'); if(ds) ds.value = diff;
    /* 幕（VS）の裏で対戦画面に切り替えてから、幕をフェードアウト（スタート画面が一瞬見えないように） */
    requestAnimationFrame(function(){ requestAnimationFrame(function(){
      const root = document.getElementById('vsRoot'), v = root && root.querySelector('.vs');
      if(v) v.classList.add('out');
      setTimeout(function(){ if(root) root.innerHTML = ''; vsPlaying = false; }, REDUCED_MOTION ? 0 : 340);
    }); });
  });
}
syncStartButtons();
document.getElementById('diffSelect').addEventListener('change', function(e){
  G.difficulty = e.target.value;
  if(G.started && !G.over) log('AIの強さを「' + diffName() + '」に変えました。', 'sys');
  render();
});
/* 対戦を途中で終えてスタート画面へ（戦績には記録しない） */
function confirmQuit(){
  const d = document.getElementById('menuDetails'); if(d) d.removeAttribute('open');
  if(typeof closeHandChips === 'function') closeHandChips();
  const root = document.getElementById('quitRoot') || (function(){ const r = document.createElement('div'); r.id = 'quitRoot'; document.body.appendChild(r); return r; })();
  root.innerHTML = '<div class="modal-back quit-back"><div class="modal-box quit-box" role="alertdialog" aria-label="対戦終了の確認">' +
    '<h3 class="serif">対戦終了</h3><p class="quit-msg">戦績は記録されません。よろしいですか？</p>' +
    '<div class="btn-row"><button type="button" class="btn primary yn" id="quitYes">はい</button><button type="button" class="btn yn" id="quitNo">いいえ</button></div></div></div>';
  document.getElementById('quitNo').addEventListener('click', function(){ root.innerHTML = ''; });
  document.getElementById('quitYes').addEventListener('click', function(){ root.innerHTML = ''; quitGame(); });
}
function quitGame(){
  G.over = true;          // 進行中のAIの手番や演出の続きを止める（次の対戦開始で元に戻る）
  G.started = false; G.busy = false; G.acting = false;
  G.statsSaved = true;    // 途中終了は戦績に記録しない
  BGM.title();
  closeModal();
  ['fxRoot','guideRoot','guideDetailRoot'].forEach(function(id){ const el = document.getElementById(id); if(el) el.innerHTML = ''; });
  const band = document.getElementById('aiBand'); if(band) band.classList.remove('show');
  if(typeof setMeFace === 'function') setMeFace('normal');
  document.getElementById('gameScreen').hidden = true;
  document.getElementById('resultScreen').hidden = true;
  document.getElementById('startScreen').hidden = false;
  window.scrollTo(0, 0);
  if(STORY_BATTLE.active){ STORY_BATTLE.finish(); setStartMode('select'); }   // ストーリーの対戦をやめた時は、モード選択へ
}
document.getElementById('restartBtn').addEventListener('click', confirmQuit);
document.getElementById('againBtn').addEventListener('click', backToStart);
document.getElementById('rematchBtn').addEventListener('click', function(){ startBattle(); });

