/* ================= AIの強さ（Lv.1〜Lv.7） =================
   Lv.1＝従来の「よわい」、Lv.3＝従来の「ふつう」、Lv.5＝従来の「つよい」と全く同じ値。
   Lv.2はLv.1とLv.3の中間、Lv.4はLv.3とLv.5の中間で、各要素を線形に補間する。
   Lv.6はLv.3の判断＋不穏の塔の管理、Lv.7はLv.6＋相手の返し手を読む。 */
const DIFF_LEVELS = ['lv1','lv2','lv3','lv4','lv5','lv6','lv7'];
let AI_SEAT = 1;   // 今判断しているAIの席（通常は1）
function withSeat(pi, fn){ const s = AI_SEAT; AI_SEAT = pi; try{ return fn(); } finally { AI_SEAT = s; } }
function rawDiffLevel(){ const d = (G.seatDiff && G.seatDiff[AI_SEAT]) || G.difficulty; const i = DIFF_LEVELS.indexOf(d); return i < 0 ? 3 : i + 1; }
function diffLevel(){ const r = rawDiffLevel(); return r >= 6 ? 3 : r; }   // Lv.6はLv.3の判断を土台に、不穏の塔の管理を足す
function diffName(){ return 'Lv.' + rawDiffLevel(); }
/* v1=Lv.1の値, v3=Lv.3の値, v5=Lv.5の値として、現在のレベルの値を返す */
function dLerp(v1, v3, v5){
  const lv = diffLevel();
  if(lv <= 3) return v1 + (v3 - v1) * (lv - 1) / 2;
  return v3 + (v5 - v3) * (lv - 3) / 2;
}
function diffParams(){
  const lv = diffLevel();
  const dp = {
    lv: lv,
    miss: dLerp(0.5, 0, 0),          // 合戦・雷轟解放への応じ損ね確率（Lv.1:0.5 → Lv.2:0.25 → Lv.3〜:0）
    goMiss: dLerp(0.35, 0, 0),       // 轟の移し替えの見落とし確率
    jinHesitate: dLerp(0.5, 0, 0),   // 陣を使う場面で使わない確率（aiGoChoice用：Lv.1は半々）
    randomPick: dLerp(0.3, 0, 0),    // 一番良い手でない手を選ぶ確率
    senOneProb: dLerp(0.5, 0, 0),    // 選で1枚だけ引く確率（Lv.3〜は基本2枚）
    threshold: dLerp(0.25, 0.42, 0.35), // 手を打つ最低ゲイン（Lv.1:0.25, Lv.2:0.335, Lv.3:0.42, Lv.4:0.385, Lv.5:0.35）
    ownRaiFactor: dLerp(0.3, 0.55, 0.55),
    fuonRaiGain: dLerp(0.3, 1.0, 1.0),
    denyFactor: dLerp(0.3, 1.0, 1.0),
    zanFactor: dLerp(0.35, 0.8, 0.8),
    hebiGain: dLerp(0.35, 0.7, 0.85),
    raigouFactor: dLerp(0.4, 1.0, 1.0),
    goDesire: dLerp(0.4, 0.4, 0.75),   // 轟を手に持ちたい度合い
    jinDesire: dLerp(0.35, 0.35, 0.6), // 陣を手に持ちたい度合い
    guardPenalty: dLerp(0, 0, 0.65),   // 陣・轟を積んで消費することへの抵抗（Lv.4:0.325, Lv.5:0.65）
    maxActs: lv === 1 ? 5 : (lv === 2 ? 10 : 14), // 1手番の行動回数上限（Lv.2は5と14の中間）
    stackBase: 0.35, sixBonus: 0.4, fullBonus: 0.25, ownHouNeed: 3, raigouBase: 1.1, raigouMul: 0.55, denyMul: 0.85,
    lookahead: 0, lookRel: false, clearHou: 0, no5Pen: 0, no5Combo: 0, fuonBin: 0, fuonFix: 0,
    senClog: 0, noFuonIfAlt: 0, sinkPen: 0, houMinH: 0, zanBot: 0, zanTopScarce: 0, endSen: 0, hebiOld: 0, teiClog: 0, plan: 0
  };
  const raw = rawDiffLevel();
  if(raw >= 6) Object.assign(dp, LV6_TUNE);
  if(raw >= 7) Object.assign(dp, LV7_TUNE);
  if(G.tuneSeat && G.tuneSeat[AI_SEAT]) Object.assign(dp, G.tuneSeat[AI_SEAT]);
  return dp;
}
/* Lv.6：AI同士の対戦で詰めた調整値（Lv.5の値に上書き） */
const LV6_TUNE = { fuonBin: 0.6, fuonFix: 1.0 };
/* Lv.7：Lv.6＋相手の返し手を読む */
const LV7_TUNE = { plan: 1, zanBot: 0.6, zanTopScarce: 0.8 };
/* Lv.7 の局面評価の重み（AI同士の対戦で調整する） */
const LV7_W = { pot: 0.7, oppPot: 0.45, fuon: 0.9, five: 0.4, stuck: 0.35, full: 1.6, expose: 0, heur: 0.8, jinKeep: 0.25, botCut: 0.55 };
