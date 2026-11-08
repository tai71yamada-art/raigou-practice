/* ================= 設定（端末に保存） ================= */
/* ホーム画面に追加したときのオフライン用（https で公開した時だけ動く） */
if('serviceWorker' in navigator && /^https?:$/.test(location.protocol)){
  window.addEventListener('load', function(){ navigator.serviceWorker.register('sw.js').catch(function(){}); });
}
const SETTINGS_KEY = 'raigou.settings.v1';
const STATS_KEY = 'raigou.stats.v1';
function loadJSON(key, defs){
  try{
    const v = JSON.parse(localStorage.getItem(key) || 'null');
    return (v && typeof v === 'object') ? Object.assign({}, defs, v) : Object.assign({}, defs);
  }catch(_){ return Object.assign({}, defs); }
}
function saveJSON(key, v){ try{ localStorage.setItem(key, JSON.stringify(v)); }catch(_){} }
const SETTINGS = loadJSON(SETTINGS_KEY, { diff:'lv3', aiSpeed:'normal', skipConfirm:false, sound:true, bgm:true, bgmVol:'large' });
const BGM_VOLS = { large:1, mid:0.55, small:0.28 };   // 大＝これまでの音量
function saveSettings(){ saveJSON(SETTINGS_KEY, SETTINGS); }
const AI_SPEEDS = [
  { v:'slow',   label:'ゆっくり', f:1.8 },
  { v:'normal', label:'ふつう',   f:1 },
  { v:'fast',   label:'はやい',   f:0.45 }
];
function aiSpeedFactor(){ const o = AI_SPEEDS.find(function(x){ return x.v === SETTINGS.aiSpeed; }); return o ? o.f : 1; }
function aiWait(ms){ return wait(ms * aiSpeedFactor()); }

