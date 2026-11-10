/* ================= プレイヤーの操作（盤面タップ） ================= */
async function onCmd(cmd, arg){
  if(G.over) return;
  if(cmd === 'moonInfo'){ openMoonInfo(); return; }
  if(cmd === 'endTurn'){
    if(G.turn === 0 && !G.busy && !G.acting && G.phase === 'act'){
      UI.pending = null; UI.selHand = null; UI.shunFirst = null;
      closeModal();
      endTurn();
    }
    return;
  }
  /* その他の操作はポップアップ側のフローで処理する */
}
function onGate(pi, gi){
  /* 塔の対象選択は拡大ポップアップで行う。盤面の塔をタップした時は、その塔を拡大して内訳を見せる */
  if(UI.pending) return;
  closeHandChips();
  const p = P(pi);
  let h = '<h3 class="serif">' + esc(p.name) + 'の桜門' + (gi+1) + '</h3>';
  h += '<div class="big-gates" style="justify-content:center">' + bigTowerHtml(pi, gi, false) + '</div>';
  const info = gateInfoHtml(pi, gi);
  h += '<p class="sub">' + (info || 'まだ駒が積まれていません。') + '</p>';
  if(pi === 1) h += '<p class="sub">相手の塔は段数だけが分かります。解放された時に中身と得点の内訳が分かります。</p>';
  h += '<div class="btn-row"><button type="button" class="btn primary" id="gateClose">閉じる</button></div>';
  showModal(h);
  const pb = document.querySelector('#modalRoot [data-peekbtn]');
  if(pb) pb.remove();
  document.getElementById('gateClose').addEventListener('click', function(){ closeModal(); });
}
function onBody(pi, idx){ /* 現はポップアップで行うため、盤面の体内タップでは何もしない */ }

