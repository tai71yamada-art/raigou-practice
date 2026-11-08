/* ================= 家（六花紋）のデータ =================
   id は CSS の .house-<id>（家紋の透かし）と、assets/chara/<id>/ に対応する。
   HOUSE_CHARA：家ごとのキャラクター（まだいない家は null＝準備中） */
const HOUSES = [
  { id:'kuze',    name:'空晴', yomi:'くぜ' },
  { id:'rakura',  name:'雷藏', yomi:'らくら' },
  { id:'yakumo',  name:'八雲', yomi:'やくも' },
  { id:'shigure', name:'時雨', yomi:'しぐれ' },
  { id:'hisetsu', name:'飛雪', yomi:'ひせつ' },
  { id:'tobari',  name:'帳',   yomi:'とばり' }
];
const AI_HOUSE = { id:'ai', name:'', yomi:'' }; // AI専用の家紋（家名なし）
/* 家ごとのキャラクター（まだいない家は null＝準備中） */
const HOUSE_CHARA = { rakura:'雷藏 くらら', kuze:'空晴 ふうか', yakumo:null, shigure:'時雨 いづな', hisetsu:null, tobari:null };
function houseById(id){ if(id === 'ai') return AI_HOUSE; return HOUSES.find(function(h){ return h.id === id; }) || HOUSES[0]; }
function houseLabel(id){ const h = houseById(id); return h.name ? h.name + '家' : ''; }
