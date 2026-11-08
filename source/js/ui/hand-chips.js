/* ================= 手の駒の操作チップ（配置案2） =================
   手の駒をタップすると、その駒のすぐ上に「使える操作」だけをチップで出す。
   細かい説明は「詳しく」から従来のポップアップで見られる */
const CHIP_SHORT = {
  stack:'積', raiHou:'雷放', raiTei:'雷停', raigou:'雷轟解放', raigouTei:'雷＋轟で雷停',
  blocked:'使えません', raigouFromGo:'雷轟解放', raigouTeiFromGo:'雷＋轟で雷停', raigouFromKiriGo:'雷轟解放', raigouTeiFromKiriGo:'雷＋轟で雷停',
  kirRai:'霧→雷', kirHebi:'霧→蛇', kirZan:'霧→斬', hebi:'蛇：奪う', zan:'斬', shun:'瞬：入れ替え', jo:'浄：引き直し'
};
function closeHandChips(){
  const r = document.getElementById('chipRoot');
  if(r) r.innerHTML = '';
  document.querySelectorAll('.hand-slot.chip-on').forEach(function(el){ el.classList.remove('chip-on'); });
  UI.chipSlot = null;
}
function showHandChips(slot){
  const p = P(0), t = p.hand[slot];
  if(!t) return;
  if(UI.chipSlot === slot){ closeHandChips(); return; } // もう一度タップで閉じる
  closeHandChips();
  let root = document.getElementById('chipRoot');
  if(!root){ root = document.createElement('div'); root.id = 'chipRoot'; document.body.appendChild(root); }
  const acts = buildHandActs(t, slot).filter(function(a){ return a.kind !== 'none'; });
  let h = '<div class="hand-chips" role="menu" aria-label="' + esc(tileLabel(t)) + 'の操作">';
  h += '<div class="hc-row">';
  acts.forEach(function(a, i){
    const label = CHIP_SHORT[a.kind] || a.label;
    const primary = a.kind !== 'stack' && !a.disabled;
    h += '<button type="button" role="menuitem" class="hc-chip' + (primary ? ' primary' : '') + '" data-chip="' + i + '"' + (a.disabled ? ' disabled' : '') + ' title="' + esc(a.label) + '">' + esc(label) + '</button>';
  });
  h += '<button type="button" role="menuitem" class="hc-chip more" data-chip="more">詳しく</button>';
  h += '</div>';
  if(t.kind === 'gen' && (t.name === '陣' || t.name === '轟')) h += '<div class="hc-note">「' + t.name + '」は手に置いておく受け札です（相手の言霊に応じて使います）</div>';
  h += '<div class="hc-arrow"></div></div>';
  root.innerHTML = h;
  const box = root.querySelector('.hand-chips');
  const slotEl = document.querySelector('[data-hand="0:' + slot + '"]');
  if(slotEl){
    slotEl.classList.add('chip-on');
    const r = slotEl.getBoundingClientRect();
    const bw = box.offsetWidth, bh = box.offsetHeight;
    let left = r.left + r.width/2 - bw/2;
    left = Math.max(8, Math.min(window.innerWidth - bw - 8, left));
    let top = r.top - bh - 10;
    if(top < 8) top = r.bottom + 10;
    box.style.left = left + 'px'; box.style.top = top + 'px';
    const arrow = box.querySelector('.hc-arrow');
    if(arrow) arrow.style.left = Math.max(12, Math.min(bw - 24, r.left + r.width/2 - left - 7)) + 'px';
    if(top > r.top) box.classList.add('below');
  }
  UI.chipSlot = slot;
  root.querySelectorAll('[data-chip]').forEach(function(b){
    b.addEventListener('click', function(ev){
      ev.stopPropagation();
      const v = b.getAttribute('data-chip');
      closeHandChips();
      if(v === 'more'){ showHandPopup(slot); return; }
      const a = acts[parseInt(v, 10)];
      if(a && !a.disabled) runEffectFlow(a.kind, slot);
    });
  });
}
/* チップの外をタップしたら閉じる（手の駒を続けてタップした場合は、そちらのチップが開く） */
document.addEventListener('click', function(e){
  if(!UI.chipSlot && UI.chipSlot !== 0) return;
  if(e.target.closest('#chipRoot')) return;
  if(e.target.closest('[data-hand]')) return;
  closeHandChips();
}, true);
window.addEventListener('resize', function(){ closeHandChips(); });
window.addEventListener('scroll', function(){ closeHandChips(); }, { passive:true });
function onHand(pi, s){
  if(pi !== 0 || G.phase !== 'act') return;
  if(!P(0).hand[s]) return;
  showHandChips(s);
}
document.addEventListener('click', function(e){
  if(G.peeking) return; // 盤面を見ている間は閲覧専用（戻る・峡谷・タブは別リスナーで動く）
  if(G.fxBusy) return;  // カットイン／効果アニメーション中は操作できない
  if(G.reorderBusy) return;  // 体内の駒が並び替わるアニメーション中も操作できない
  const cmdEl = e.target.closest('[data-cmd]');
  if(cmdEl){ onCmd(cmdEl.getAttribute('data-cmd'), cmdEl.getAttribute('data-arg')); return; }
  if(G.turn !== 0 || G.busy || G.acting || G.over || !G.started) return;
  if(e.target.closest('#modalRoot')) return;
  const gateEl = e.target.closest('[data-gate]');
  if(gateEl){ const a = gateEl.getAttribute('data-gate').split(':'); onGate(parseInt(a[0],10), parseInt(a[1],10)); return; }
  const bodyEl = e.target.closest('[data-body]');
  if(bodyEl){ const a = bodyEl.getAttribute('data-body').split(':'); onBody(parseInt(a[0],10), parseInt(a[1],10)); return; }
  const handEl = e.target.closest('[data-hand]');
  if(handEl){ const a = handEl.getAttribute('data-hand').split(':'); onHand(parseInt(a[0],10), parseInt(a[1],10)); return; }
});
/* 峡谷ボタン：中身をポップアップで表示 */
document.getElementById('canyonBtn').addEventListener('click', function(){
  if(!G.started || G.over) return;
  if(G.peeking){ showCanyonModal(true); return; }
  if(document.getElementById('modalRoot').innerHTML) return;
  showCanyonModal(false);
});
/* 下部タブの切り替え（ログ／解放された役） */
/* 「隠」：押したまま上にスワイプすると手番終了（タップだけでは終わらない＝誤操作防止）。
   キーボード操作（Enter／Space）の時だけはクリックで終了できる */
(function setupSwipeHide(){
  const btn = document.getElementById('hideBtn');
  if(!btn) return;
  const THRESH = 56; // これ以上上に動かしたら手番終了
  const MAX = 84;
  let startY = null, pid = null, dy = 0, hintTimer = null;
  function canEnd(){ return G.turn === 0 && !G.busy && !G.acting && G.phase === 'act' && !G.over && !G.peeking && !G.fxBusy && !G.reorderBusy; }
  function setPos(v){
    btn.style.transform = v ? 'translateY(' + v + 'px)' : '';
    const p = Math.min(1, -v / THRESH);
    btn.style.setProperty('--sh-p', p.toFixed(3));
    btn.classList.toggle('ready', p >= 1);
  }
  function reset(){
    startY = null; pid = null; dy = 0;
    btn.classList.remove('dragging');
    setPos(0);
  }
  function showHint(){
    btn.classList.add('hint');
    clearTimeout(hintTimer);
    hintTimer = setTimeout(function(){ btn.classList.remove('hint'); }, 1400);
  }
  function finish(){
    btn.classList.remove('dragging');
    // 指を離した位置から、さらに上へスーッと消えていく。消えたあとは見えないまま元の位置に戻し、
    // 次に「隠」が出る時（自分の積・発）に改めて表示する
    btn.style.setProperty('--sh-from', dy + 'px');
    btn.classList.add('fly');
    setTimeout(function(){
      btn.classList.add('gone');
      btn.classList.remove('fly', 'ready');
      setPos(0);
    }, 560);
    UI.pending = null; UI.selHand = null; UI.shunFirst = null;
    closeModal();
    if(typeof closeHandChips === 'function') closeHandChips();
    endTurn();
  }
  btn.addEventListener('pointerdown', function(e){
    if(!canEnd()) return;
    startY = e.clientY; pid = e.pointerId; dy = 0;
    try{ btn.setPointerCapture(pid); }catch(_){}
    btn.classList.add('dragging');
    e.preventDefault();
  });
  btn.addEventListener('pointermove', function(e){
    if(startY === null || e.pointerId !== pid) return;
    dy = Math.max(-MAX, Math.min(0, e.clientY - startY));
    setPos(dy);
  });
  btn.addEventListener('pointerup', function(e){
    if(startY === null || e.pointerId !== pid) return;
    const moved = -dy;
    if(moved >= THRESH && canEnd()){ startY = null; pid = null; finish(); return; }
    if(moved < 8) showHint(); // タップだけ：やり方を表示
    reset();
  });
  btn.addEventListener('pointercancel', reset);
  btn.addEventListener('lostpointercapture', function(){ if(startY !== null) reset(); });
  btn.addEventListener('click', function(e){
    e.stopPropagation();
    if(e.detail === 0 && canEnd()) finish(); // キーボード操作
  });
})();
/* 下のタブ（ログ／解放された役／残り駒） */
function showBelowTab(key){
  [['Log','tabLog'],['Rel','tabRel'],['Remain','tabRemain']].forEach(function(p){
    const on = (p[0] === key);
    document.getElementById(p[1]).hidden = !on;
    document.getElementById('tabBtn' + p[0]).classList.toggle('on', on);
  });
  if(key === 'Remain') renderRemain();
}
document.getElementById('tabBtnLog').addEventListener('click', function(){ showBelowTab('Log'); });
document.getElementById('tabBtnRel').addEventListener('click', function(){ showBelowTab('Rel'); });
document.getElementById('tabBtnRemain').addEventListener('click', function(){ showBelowTab('Remain'); });
/* あなたから見て「まだ見えていない駒」：全体から、峡谷・解放された役・自分の内駒と塔・開示された相手の塔の駒を引く */
function remainCounts(){
  const map = {};
  GEN_DEF.forEach(function(d){ map[d.name] = { kind:'gen', name:d.name, w:d.w, total:d.n, left:d.n }; });
  ON_DEF.forEach(function(d){ map[d.name] = { kind:'on', name:d.name, w:d.w, total:4, left:4 }; });
  const sub = function(t){ if(t && map[t.name]) map[t.name].left--; };
  G.canyon.forEach(sub);
  (G.released || []).forEach(function(e){ e.tiles.forEach(sub); });
  const me = P(0);
  me.body.forEach(sub); me.hand.forEach(sub); me.gates.forEach(function(g){ g.forEach(sub); });
  P(1).gates.forEach(function(g){ g.forEach(function(t){ if(G.revealedTopIds && G.revealedTopIds.has(t.id)) sub(t); }); });
  return map;
}
function renderRemain(){
  const box = document.getElementById('remainBox');
  if(!box || !G.players) return;
  const map = remainCounts();
  let unseen = 0; Object.keys(map).forEach(function(k){ unseen += Math.max(0, map[k].left); });
  const ai = P(1);
  const aiTower = ai.gates.reduce(function(a, g){ return a + g.filter(function(t){ return !(G.revealedTopIds && G.revealedTopIds.has(t.id)); }).length; }, 0);
  let h = '<p class="remain-sum">まだ見えていない駒 <b>' + unseen + '</b>個</p>';
  h += '<p class="sub remain-where">雷山 ' + G.deck.length + '個・相手の内駒 ' + totalInner(ai) + '個・相手の塔 ' + aiTower + '個・除外 1個 のどれかにあります。</p>';
  [['gen','言霊'],['on','音無']].forEach(function(grp){
    h += '<div class="remain-label">' + grp[1] + '</div><div class="remain-grid">';
    Object.keys(map).forEach(function(k){
      const m = map[k]; if(m.kind !== grp[0]) return;
      const left = Math.max(0, m.left);
      h += '<div class="remain-cell' + (left === 0 ? ' zero' : '') + '">' +
           '<div class="tile ' + m.kind + '"><span class="w">' + m.w + '</span>' + esc(m.name) + '</div>' +
           '<div class="remain-n"><b>' + left + '</b><small>/' + m.total + '</small></div></div>';
    });
    h += '</div>';
  });
  box.innerHTML = h;
}
