/* ================= モード選択（ストーリー／練習） =================
   読み込みが終わると、まずモード選択が出る。#startScreen の data-mode で、ボタンの並びを切り替える。
     select＝ストーリー／練習を選ぶ、story＝続きから／はじめから、practice＝今までの練習モードの設定 */
function setStartMode(mode){
  const el = document.getElementById('startScreen');
  el.setAttribute('data-mode', mode);
  closeStartSetting();
  syncStoryButtons();
  window.scrollTo(0, 0);
}
function syncStoryButtons(){
  const b = document.getElementById('storyContBtn');
  if(b) b.disabled = !ADV.hasSave();   // セーブが無い時は「続きから」を選べない
}
document.getElementById('modeStoryBtn').addEventListener('click', function(){ setStartMode('story'); });
document.getElementById('modePracticeBtn').addEventListener('click', function(){ setStartMode('practice'); });
document.getElementById('modeBackBtn').addEventListener('click', function(){ setStartMode('select'); });
document.getElementById('storyNewBtn').addEventListener('click', function(){ ADV.newGame(); });
document.getElementById('storyContBtn').addEventListener('click', function(){ if(ADV.hasSave()) ADV.openLoad(); });
syncStoryButtons();
applyOppTheme();
