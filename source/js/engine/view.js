/* ================= ルールと画面のつなぎ目（VIEW） =================
   engine/ と ai/ のファイルは画面（DOM）を直接さわらず、表示・演出・あなたへの質問はすべて VIEW を通す。
   ここにあるのは「画面がないとき」の動き（何もしない／すぐ終わる）。
   ブラウザでは ui/view-bind.js が本物の画面の処理に差し替える。
   node で動かすテスト（tests/）では、この既定のまま AI 同士で対局できる。 */
const VIEW = {
  /* 表示 */
  render: function(){ return Promise.resolve(); },
  log: function(text, cls){},
  logTurn: function(text){},
  logClear: function(){},
  resetGameUi: function(){},
  resetTurnUi: function(){},
  applyHouseClasses: function(){},
  gameSetup: function(){ return { rule:'basic', house:'rakura' }; },
  sfx: function(name){},
  setMeFace: function(kind, ms){},
  aiBand: function(text){},
  aiWait: function(ms){ return Promise.resolve(); },
  /* 演出（終わるまで待つものは Promise を返す） */
  playCutIn: function(name, actorPi){ return Promise.resolve(); },
  playOugiRelease: function(pi){ return Promise.resolve(); },
  arrangeHo: function(pi, tiles, hc){ return Promise.resolve(null); },
  showRinReveal: function(){ return Promise.resolve(); },
  showWaReveal: function(pi, gi, tiles, sum, delta){ return Promise.resolve(); },
  chooseZenTile: function(choices){ return Promise.resolve(choices[0]); },
  playClash: function(meIdx, oppIdx){ return Promise.resolve(); },
  playHideCutIn: function(actorPi){ return Promise.resolve(); },
  playJinFx: function(){ return Promise.resolve(); },
  fxSealFx: function(pi, gi){ return Promise.resolve(); },
  fxLightning: function(pi, gi){ return Promise.resolve(); },
  fxReleaseBanner: function(){ return Promise.resolve(); },
  fxFuonBanner: function(){ return Promise.resolve(); },
  fxTabooBanner: function(){ return Promise.resolve(); },
  fxGateRect: function(pi, gi){ return null; },
  fxZanFx: function(tile, rectBefore, end){ return Promise.resolve(); },
  fxHebiBefore: function(tile, faceUp){ return null; },
  fxHebiAfter: function(tok, actor, handSlot){ return Promise.resolve(); },
  fxShunBefore: function(locA, a, locB, b){ return null; },
  fxShunAfter: function(tok){ return Promise.resolve(); },
  fxJoDiscard: function(tiles){ return Promise.resolve(); },
  showBattleRevealModal: function(){ return Promise.resolve(); },
  showFinalRevealModal: function(){ return Promise.resolve(); },
  showResult: function(winner, detail){},
  /* あなた（人間の席）への質問。画面がないときは人間の席を作らないので呼ばれない */
  humanFlow: function(){ throw new Error('VIEW.humanFlow: 画面がありません'); },
  humanBattlePick: function(){ throw new Error('VIEW.humanBattlePick: 画面がありません'); },
  humanRaiDefenseChoice: function(){ throw new Error('VIEW: 画面がありません'); },
  humanJinDefenseChoice: function(){ throw new Error('VIEW: 画面がありません'); },
  humanBattleCounterChoice: function(){ throw new Error('VIEW: 画面がありません'); },
  humanRaigouResponseChoice: function(){ throw new Error('VIEW: 画面がありません'); },
  humanRedirectChoice: function(){ throw new Error('VIEW: 画面がありません'); }
};
