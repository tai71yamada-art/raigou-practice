/* ================= 駒の定義 ================= */
const GEN_DEF = [
  {name:'雷', w:1, n:8}, {name:'蛇', w:2, n:7}, {name:'斬', w:3, n:6},
  {name:'陣', w:4, n:5}, {name:'轟', w:5, n:4}, {name:'霧', w:6, n:3},
  {name:'瞬', w:7, n:2}, {name:'浄', w:8, n:1}
];
const ON_DEF = [
  {name:'一', w:1}, {name:'二', w:2}, {name:'三', w:3}, {name:'四', w:4},
  {name:'五', w:5}, {name:'六', w:6}, {name:'七', w:7}
];
const KANJI_NUM = ['','一','二','三','四','五','六','七','八','九'];
let _uid = 0;
function mkTile(kind, name, w){ return { id:_uid++, kind:kind, name:name, w:w }; }
function tileLabel(t){ return t.name; }
function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); const tmp=a[i]; a[i]=a[j]; a[j]=tmp; } return a; }
function wait(ms){ return new Promise(function(r){ setTimeout(r, ms); }); }

