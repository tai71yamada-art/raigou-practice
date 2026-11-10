/* ================= ストーリーの対戦（ADV → 対戦 → ADV） =================
   対戦そのものは練習モードと同じしくみ（launchBattle）を使い、キャラ・相手・ルール・AIの強さを台本から渡す。
   勝つと物語が進み、負け・引き分けはやり直し。戦績には入れず、途中保存（保存して終了）も使わない。 */
const STORY_BATTLE = {
  active: null,
  start: function(conf){
    this.active = { conf: conf };
    document.body.removeAttribute('data-story-res');
    document.body.classList.add('story-battle');
    OPP_CHARA = (conf.opp && charaAssets(conf.opp)) ? conf.opp : null;
    const me = conf.me || STORY_ME;
    applyChara(me);
    const kyogi = conf.rule === 'kyogi';
    launchBattle(conf.sente !== false, conf.level || 'lv1', {
      rule: kyogi ? 'kyogi' : 'basic', house: me, aiHouse: OPP_CHARA || undefined,
      ougi: kyogi ? [conf.ougi ? conf.ougi.slice() : pickRandomOugi(OUGI_BRING, conf.aiOugi || []), conf.aiOugi ? conf.aiOugi.slice() : null] : null
    });
  },
  onResult: function(winner){ document.body.setAttribute('data-story-res', winner === 0 ? 'win' : 'lose'); },
  /* 対戦の見た目を、練習モードの設定に戻す */
  finish: function(){
    this.active = null;
    OPP_CHARA = null;
    document.body.classList.remove('story-battle');
    document.body.removeAttribute('data-story-res');
    applyChara(startHouse);
  },
  hideScreens: function(){
    JINGLE.stop();
    document.getElementById('gameScreen').hidden = true;
    document.getElementById('resultScreen').hidden = true;
    G.started = false; G.over = false;
  }
};
document.getElementById('storyNextBtn').addEventListener('click', function(){
  if(!STORY_BATTLE.active) return;
  STORY_BATTLE.hideScreens(); STORY_BATTLE.finish();
  ADV.afterBattle();
});
document.getElementById('storyRetryBtn').addEventListener('click', function(){
  if(!STORY_BATTLE.active) return;
  STORY_BATTLE.start(STORY_BATTLE.active.conf);
});
document.getElementById('storyQuitBtn').addEventListener('click', function(){
  if(!STORY_BATTLE.active) return;
  STORY_BATTLE.finish();
  backToStart();
  setStartMode('select');
});
