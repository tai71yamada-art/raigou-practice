/* ================= 家紋の表示（家のデータは engine/houses.js） ================= */
/* キャラ選択のタイルに出す立ち絵（背景なし・顔中心の範囲） */
const HOUSE_CHARA_IMG = { rakura:'{{asset:chara/rakura/tile.webp}}', kuze:'{{asset:chara/kuze/tile.webp}}', shigure:'{{asset:chara/shigure/tile.webp}}' };
function houseIconHtml(id, cls){ return '<span class="house-ico house-' + id + (cls ? ' ' + cls : '') + '" aria-hidden="true"></span>'; }
/* 対戦エリアに家のクラスを付ける（桜門の家紋がそれに変わる） */
function applyHouseClasses(){
  [['aiZone', 1], ['humanZone', 0]].forEach(function(pair){
    const el = document.getElementById(pair[0]);
    if(!el || !G.houses) return;
    HOUSES.concat([AI_HOUSE]).forEach(function(h){ el.classList.remove('house-' + h.id); });
    el.classList.add('house-' + G.houses[pair[1]]);
  });
}

