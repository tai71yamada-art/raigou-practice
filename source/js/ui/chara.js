/* ================= キャラごとの画像セット =================
   <script type="text/plain" id="charaData-家ID"> に JSON で置く（hero・win・lose・cutin・avatar・avatar_act・avatar_hit・avatar_joy）。
   選んだキャラのものだけ取り出す（他のキャラの画像は読み込まない）。 */
const CHARA_CACHE = {};
function charaAssets(id){
  if(CHARA_CACHE[id]) return CHARA_CACHE[id];
  const el = document.getElementById('charaData-' + id);
  if(!el) return null;
  try{ CHARA_CACHE[id] = JSON.parse(el.textContent); }catch(e){ return null; }
  return CHARA_CACHE[id];
}
function charaName(id){ return HOUSE_CHARA[id] || ''; }
function applyChara(id){
  let a = charaAssets(id);
  if(!a){ id = 'rakura'; a = charaAssets(id); }
  if(!a) return;
  document.documentElement.setAttribute('data-chara', id);
  ME_AVATAR = a.avatar; RESULT_IMG_WIN = a.win; RESULT_IMG_LOSE = a.lose; CUT_IMG_ME = a.cutin;
  FACE_IMG.normal = a.avatar; FACE_IMG.act = a.avatar_act || a.avatar; FACE_IMG.hit = a.avatar_hit || a.avatar; FACE_IMG.joy = a.avatar_joy || a.avatar;
  const alt = 'あなたのキャラクター（' + charaName(id) + '）';
  document.querySelectorAll('#humanZone .pz-avatar').forEach(function(im){ im.setAttribute('src', a.avatar); im.setAttribute('alt', alt); });
  const rh = document.getElementById('resultHeroImg');
  if(rh) rh.removeAttribute('src');
}
