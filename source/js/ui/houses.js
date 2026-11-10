/* ================= 家紋の表示（家のデータは engine/houses.js） ================= */
/* キャラ選択のタイルに出す立ち絵（背景なし・顔中心の範囲） */
const HOUSE_CHARA_IMG = {{chara_tiles}};   // build.py が assets/chara/<id>/tile.webp から作る
function houseIconHtml(id, cls){ return '<span class="house-ico house-' + id + (cls ? ' ' + cls : '') + '" aria-hidden="true"></span>'; }
/* 対戦エリアに家のクラスを付ける（桜門の家紋がそれに変わる） */
function applyHouseClasses(){
  [['aiZone', 1], ['humanZone', 0]].forEach(function(pair){
    const el = document.getElementById(pair[0]);
    if(!el || !G.houses) return;
    HOUSES.concat(STORY_HOUSES, [AI_HOUSE]).forEach(function(h){ el.classList.remove('house-' + h.id); });
    el.classList.add('house-' + G.houses[pair[1]]);
  });
}

