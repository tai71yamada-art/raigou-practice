/* ================= 途中保存（保存して終了 → 対戦再開） =================
   メニューの「保存して終了」で盤面を端末に保存し、スタート画面へ戻る。
   保存がある間は「対戦開始」が「対戦再開」になり、押すと VS の演出なしで保存した盤面に戻る。
   保存は1つだけ。再開したら消える（もう一度やめる時は、また保存する）。 */
function saveKey(){ return 'raigou.save.v1'; }   // 端末（ブラウザ）に保存する場所の名前
function loadSave(){
  try{ const s = localStorage.getItem(saveKey()); return s ? JSON.parse(s) : null; }catch(_){ return null; }
}
function hasSave(){ return !!loadSave(); }
function clearSave(){ try{ localStorage.removeItem(saveKey()); }catch(_){} }

/* メニューを開いた時に、今保存できるかを表示する */
function syncSaveButton(){
  const b = document.getElementById('saveQuitBtn'); if(!b) return;
  const okNow = canSaveGame();
  b.disabled = !okNow;
  const note = document.getElementById('saveQuitNote');
  if(note) note.hidden = okNow;
}
function saveAndQuit(){
  if(!canSaveGame()){ syncSaveButton(); return; }
  const logBox = document.getElementById('log');
  const data = {
    app: APP_VERSION, at: Date.now(),
    turnNo: G.turnNo, diff: G.difficulty, house: G.houses[0],
    log: logBox ? logBox.innerHTML : '',
    game: serializeGame()
  };
  try{ localStorage.setItem(saveKey(), JSON.stringify(data)); }
  catch(_){ alertSaveFailed(); return; }
  quitGame();
  syncStartButtons();
}
function alertSaveFailed(){
  const b = document.getElementById('saveQuitBtn');
  if(b){ b.textContent = '保存できませんでした（端末の空きを確認）'; setTimeout(function(){ b.textContent = '保存して終了'; }, 2600); }
}
/* 保存した盤面に戻る（VS の演出なし） */
function resumeBattle(){
  if(vsPlaying) return;
  const data = loadSave();
  if(!data){ syncStartButtons(); return; }
  JINGLE.stop();
  closeStartSetting();
  SFX.ctx();
  try{
    restoreGame(data.game);
  }catch(e){
    clearSave(); syncStartButtons();
    console.warn('保存した対戦を読み込めませんでした', e);
    return;
  }
  clearSave();
  G.started = true; G.over = false; G.busy = false; G.acting = false; G.statsSaved = false; G.fxBusy = false; G.reorderBusy = false;
  // キャラ・家紋・AIの強さは保存した時のものに合わせる
  if(G.houses && HOUSE_CHARA[G.houses[0]]){ startHouse = G.houses[0]; applyChara(startHouse); }
  applyHouseClasses();
  const ds = document.getElementById('diffSelect'); if(ds) ds.value = G.difficulty;
  VIEW.resetGameUi(); VIEW.resetTurnUi();
  const logBox = document.getElementById('log'); if(logBox) logBox.innerHTML = data.log || '';
  document.getElementById('startScreen').hidden = true;
  document.getElementById('resultScreen').hidden = true;
  document.getElementById('gameScreen').hidden = false;
  window.scrollTo(0, 0);
  BGM.start();
  log('保存した対戦を再開しました（' + G.turnNo + '手番目・あなたの積・発から）。', 'sys');
  syncStartButtons();
  render();
}
function discardSaveConfirm(){
  const b = document.getElementById('resumeDiscardBtn'); if(!b) return;
  if(!b.classList.contains('armed')){ b.classList.add('armed'); b.textContent = 'もう一度押すと消します'; return; }
  clearSave(); syncStartButtons();
}
/* スタート画面のボタンの見た目（保存があれば「対戦再開」） */
function syncResumeUi(){
  const go = document.getElementById('startGoBtn'); if(!go) return;
  const data = loadSave();
  const v = go.querySelector('.sa-value');
  if(v) v.textContent = data ? '対戦再開' : '対戦開始';
  go.classList.toggle('resume', !!data);
  const row = document.getElementById('resumeRow');
  if(row){
    row.hidden = !data;
    if(data){
      const nm = HOUSE_CHARA[data.house] || '';
      const lvNo = String(data.diff || '').replace('lv', '');
      document.getElementById('resumeInfo').textContent = '保存した対戦：' + (nm ? nm + '・' : '') + 'Lv.' + lvNo + '・' + data.turnNo + '手番目';
      const b = document.getElementById('resumeDiscardBtn');
      b.classList.remove('armed'); b.textContent = '消して新しく始める';
    }
  }
}
document.getElementById('saveQuitBtn').addEventListener('click', saveAndQuit);
document.getElementById('resumeDiscardBtn').addEventListener('click', discardSaveConfirm);
document.getElementById('menuDetails').addEventListener('toggle', syncSaveButton);
syncResumeUi();
