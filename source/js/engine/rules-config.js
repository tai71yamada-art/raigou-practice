/* ================= ルール設定と奥義実装の土台 =================
   基本ルールでは手は2か所・内駒5個のまま。競技雷轟（準備中）で雷神化すると「月」が3か所目の手になり、
   内駒は最大6個、積・発できる手は1手番で最大2か所まで。 */
const RULESETS = {
  basic: { id:'basic', label:'基本ルール', ougi:false },
  kyogi: { id:'kyogi', label:'競技雷轟', ougi:true, ready:true }
};
const BODY_MAX = 3;      // 体内は3個まで
const ACT_HAND_MAX = 2;  // 1手番で積・発に使える手は最大2か所（競技雷轟）
const GEN_MAX = 2;       // 現で手に移せるのは0〜2個
function rulesNow(){ return (G && G.rules) || RULESETS.basic; }
function innerCap(p){ return BODY_MAX + p.hand.length; }
function handSlotsAll(p){ return p.hand.map(function(_, i){ return i; }); }
function handLabel(s){ return s === 0 ? '左手' : (s === 1 ? '右手' : '月'); }
function otherHandSlot(p, slot, pred){
  for(let i=0;i<p.hand.length;i++){ if(i!==slot && p.hand[i] && pred(p.hand[i])) return i; }
  return -1;
}
/* 轟（または霧を轟として）と組む「雷」役の手。本物の雷を優先し、無ければ霧 */
function raiPartnerSlot(p, slot){
  let k = otherHandSlot(p, slot, function(x){ return x.kind==='gen' && x.name==='雷'; });
  if(k < 0) k = otherHandSlot(p, slot, function(x){ return x.kind==='gen' && x.name==='霧'; });
  if(k < 0) k = otherHandSlot(p, slot, function(x){ return x.kind==='gen' && x.name==='鳴'; });
  return k;
}
/* 積・発に使った手の管理（手番プレイヤーのみ）。手が2か所の基本ルールでは制限にかからない */
function canActFromSlot(p, slot){
  if(G.ippatsu && G.players && p === P(G.turn)) return false;   // 一発奥義を発した手番
  if(!G.actedSlots || p !== P(G.turn)) return true;
  return G.actedSlots.has(slot) || G.actedSlots.size < ACT_HAND_MAX;
}
function canActPair(p, a, b){
  if(!G.actedSlots || p !== P(G.turn)) return true;
  const s = new Set(G.actedSlots); s.add(a); if(b !== null && b !== undefined && b >= 0) s.add(b);
  return s.size <= ACT_HAND_MAX;
}
function markActed(p, slot){
  if(G.actedSlots && G.players && p === P(G.turn) && slot !== null && slot !== undefined && slot >= 0) G.actedSlots.add(slot);
}
/* 雷神化：月を3か所目の手にする（競技雷轟の奥義実装時に「開」から呼ぶ） */
function setRaijinka(pi){
  const p = P(pi);
  if(p.raijinka) return;
  p.raijinka = true;
  p.moon = [];
  while(p.hand.length < 3) p.hand.push(null);
}
/* 持続奥義（舞・蒼・鬼・滅）は「頭」に置き、同時に1つまで */
function persistentOwner(){ for(let pi=0;pi<2;pi++){ if(P(pi).head) return pi; } return -1; }
function canPlayPersistent(){ return persistentOwner() < 0; }
/* 塔への処理の判定元。source:'rai'＝雷の効果（雷放・雷停）、'go'＝轟の効果。
   奥義（持続奥義の蓄積・受動奥義など）を実装するときのフック。今は記録だけ */
function onTowerEffect(info){ G.lastTowerEffect = info; }
function sortBody(p){ p.body.sort(function(a,b){ return b.w - a.w; }); } // 重い順（index0=一番下）

function mkPlayer(name, isAI){
  return { name:name, isAI:isAI, score:2, body:[], hand:[null,null],
           gates:[[],[],[]], seals:[null,null,null],
           raijinka:false, moon:[], head:null };  // moon＝月の奥義駒、head＝頭の持続奥義
}

function buildDeck(){
  const tiles=[];
  GEN_DEF.forEach(function(d){ for(let i=0;i<d.n;i++) tiles.push(mkTile('gen', d.name, d.w)); });
  ON_DEF.forEach(function(d){ for(let i=0;i<4;i++) tiles.push(mkTile('on', d.name, d.w)); });
  // 合計64枚（全68枚から音無「八」4枚を除いたもの。奥義駒は入れない）
  shuffle(tiles);
  G.excluded = tiles.pop(); // 裏向きの1枚を除外 → 対戦で使うのは63枚
  return tiles;
}

/* opts（省略可）：{ rule:'basic'|…, house:'rakura'|… }。省略すると画面で選んだもの（VIEW.gameSetup）を使う */
function newGame(humanSente, difficulty, opts){
  opts = opts || VIEW.gameSetup();
  _uid = 0;
  VIEW.resetGameUi();
  G.deck = buildDeck();
  G.canyon = [];
  G.released = [];
  G.players = [ mkPlayer('あなた', false), mkPlayer('AI', true) ];
  G.sente = humanSente ? 0 : 1;
  G.difficulty = difficulty;
  G.turn = G.sente; G.turnNo = 0; G.over = false; G.started = true;
  G.endIn = null; G.lastDrawer = null; G.finalTurnActive = false; G.isFinalTurn = false; G.finalRound = false; G.busy = false;
  G.raigouCounts = [0,0]; G.penaltyCounts = [0,0]; G.tally = newTally(); G.finalRevealStarted = false; G.finishing = false;
  G.revealedTopIds = new Set();
  G.kn = [new Set(), new Set()]; G.cutHints = [[[],[],[]],[[],[],[]]];
  G.hatsuGame = {}; G.statsSaved = false;
  G.rules = RULESETS[opts.rule] || RULESETS.basic;
  G.houses = [ opts.house || 'rakura', AI_HOUSE.id ];
  VIEW.applyHouseClasses();
  G.actedSlots = new Set(); G.inGassen = false; G.lastTowerEffect = null;
  G.excludedOugi = []; G.kakuZero = [false, false]; G.kakuNow = false; G.ippatsu = false;
  if(G.rules.ougi) setupOugi(opts.ougi);
  // 初期の体内：先手1枚、後手2枚
  const gote = opp(G.sente);
  P(G.sente).body.push(G.deck.pop());
  P(gote).body.push(G.deck.pop(), G.deck.pop());
  P(0).body && sortBody(P(0)); sortBody(P(1));
  VIEW.logClear();
  log('対戦開始。先手は' + P(G.sente).name + '、後手は' + P(gote).name + 'です。', 'sys');
  log('あなたは' + houseById(G.houses[0]).name + '家です。', 'sys');
  if(G.rules.ougi) log('ルールは競技雷轟です。奥義駒を2個ずつ月に置きました。自分の桜門がすべて塔で埋まると、手番の最初に「開」ができます（1対戦に1回）。', 'sys');
  log('陽玉は各自2点から。雷山は' + G.deck.length + '枚です。', 'sys');
  startTurn();
}

