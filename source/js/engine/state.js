/* ================= ゲーム状態 ================= */
const G = {
  started:false, over:false,
  deck:[], canyon:[], released:[], excluded:null,
  players:[], sente:0, turn:0, turnNo:0,
  phase:'gen',           // gen | sen | act | over
  used:new Set(),        // この手番に使った「効果」の名前（掟1：効果単位。雷放と雷停は別々に数える）
  revealedTopIds:null,   // 雷轟合戦で開示され、その後も表向きで残る駒のid集合
  genMoves:0,
  endIn:null,            // 雷山が尽きたあと、何回手番が終わったら対戦終了か（最後の駒を引いた手番＋相手の最終手番＋引いた人の最終手番＝3）
  lastDrawer:null,       // 雷山の最後の駒を引いたプレイヤー
  finalTurnActive:false, // 最後の駒を引いた手番が終わり、選なしの最終手番に入ったか
  isFinalTurn:false,     // 今の手番が選なしの最終手番か
  difficulty:'lv3',
  busy:false,            // AI手番中・モーダル中はtrue
  finalRound:false,
  raigouCounts:[0,0],    // 雷轟解放した回数（自分の組み合わせ＋相手の雷を轟で受けて解放した場合）
  penaltyCounts:[0,0],   // 禁忌・不穏で陽玉を失った回数
  finalRevealStarted:false
};
function P(i){ return G.players[i]; }
function cur(){ return P(G.turn); }
function opp(i){ return 1-i; }
function totalInner(p){ return p.body.length + p.hand.filter(Boolean).length; }
