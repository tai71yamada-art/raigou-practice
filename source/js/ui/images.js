/* ================= 画像・動画の共通データ ================= */
const AI_IMG = '{{asset:img/ai.jpg}}';
const AI_EYES_IMG = '{{asset:img/ai_eyes.webp}}';   // 奥義解放のカットイン（AI）
/* 対戦相手の見た目。OPP_CHARA が null ならいつものAI、家ID（'rakura' など）ならそのキャラ（ストーリーの対戦） */
let OPP_CHARA = null;
function oppAssets(){ return OPP_CHARA ? charaAssets(OPP_CHARA) : null; }
function oppAvatar(){ const a = oppAssets(); return a ? a.avatar : AI_IMG; }
function oppCutImg(){ const a = oppAssets(); return a ? a.cutin : AI_IMG; }
function oppEyesImg(){ const a = oppAssets(); return a ? (a.eyes || a.cutin) : AI_EYES_IMG; }
function oppLabel(){ return OPP_CHARA ? charaName(OPP_CHARA) : 'AI'; }
/* 盤面の見出しなど、狭い所に出す短い名前（「雷藏 くらら」→「くらら」） */
function oppShort(){ return OPP_CHARA ? oppLabel().split(' ').pop() : 'AI'; }
function oppHouseId(){ return OPP_CHARA || AI_HOUSE.id; }
/* 今の自分のキャラ（練習モードは選んだキャラ、ストーリーの対戦はその対戦のキャラ） */
function meChara(){ return document.documentElement.getAttribute('data-chara') || startHouse; }
let ME_AVATAR = '';
let RESULT_IMG_WIN = '';
const FACE_IMG = { normal:'', act:'', hit:'', joy:'' };
/* 陽玉の表示：実際の点数（p.score）に、表示用の点数（UI.disp）を1点ずつ近づけていく */
function dispScore(pi){
  if(!UI.disp) UI.disp = [P(0).score, P(1).score];
  return UI.disp[pi];
}
function scoreHtmlOf(pi){ const v = dispScore(pi); return '陽玉 ' + v + '点 <span class="dots">' + '●'.repeat(Math.max(0, v)) + '</span>'; }
function paintScore(pi, dir){
  const el = pi === 0 ? document.getElementById('humanScore') : document.querySelector('#aiZone .yogyoku');
  if(!el) return;
  el.innerHTML = scoreHtmlOf(pi);
  el.classList.remove('pop-up', 'pop-down'); void el.offsetWidth;
  el.classList.add(dir === 'up' ? 'pop-up' : 'pop-down');
}
let _gainStreak = 0;
setInterval(function(){
  if(!G.players || !G.started) return;
  if(!UI.disp) UI.disp = [P(0).score, P(1).score];
  let moving = false;
  for(let pi = 0; pi < 2; pi++){
    const d = UI.disp[pi], sc = P(pi).score;
    if(d === sc) continue;
    moving = true;
    const up = sc > d;
    UI.disp[pi] += up ? 1 : -1;
    paintScore(pi, up ? 'up' : 'down');
    if(up){
      if(pi === 0){ SFX.play('gain', _gainStreak++); setMeFace('joy'); }
      else SFX.play('gainAi');
    } else SFX.play('bad');
  }
  if(!moving) _gainStreak = 0;
}, 170);
let _faceTimer = null, _faceHold = 0, _faceFrom = 0;
/* 演出（カットイン・解放バナーなど）が出ている間は数えず、演出が終わってから ms 後に通常へ戻す */
function _faceFxActive(){ const r = document.getElementById('fxRoot'); return !!(G.fxBusy || (r && r.childElementCount)); }
/* 自分のアイコンの表情を変える（演出が終わってから ms 後に通常へ戻る） */
function setMeFace(kind, ms){
  const img = document.querySelector('#humanZone .pz-avatar');
  if(!img) return;
  const src = FACE_IMG[kind] || FACE_IMG.normal;
  if(img.getAttribute('src') !== src){
    img.setAttribute('src', src);
    img.classList.remove('face-pop'); void img.offsetWidth;
    if(kind !== 'normal') img.classList.add('face-pop');
  }
  clearInterval(_faceTimer); _faceTimer = null;
  if(kind === 'normal') return;
  _faceHold = ms || 2600; _faceFrom = Date.now();
  _faceTimer = setInterval(function(){
    if(_faceFxActive()){ _faceFrom = Date.now(); return; }
    if(Date.now() - _faceFrom >= _faceHold) setMeFace('normal');
  }, 100);
}
let RESULT_IMG_LOSE = '';
let CUT_IMG_ME = '';
