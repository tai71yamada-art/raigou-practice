/* ================= 盤面を見る（ピーク） ================= */
function enterPeek(){
  if(G.peeking) return;
  G.peeking = true;
  const mb = document.querySelector('#modalRoot .modal-back');
  if(mb) mb.style.display = 'none';
  const pr = document.getElementById('peekRoot');
  pr.innerHTML = '<div class="peek-bar"><span>盤面を見ています（閲覧専用：駒や塔の操作はできません）。峡谷ボタンや下のログ／解放された役タブも見られます。</span>' +
                 '<button type="button" class="btn primary" id="peekBack">戻る</button></div>';
  document.getElementById('peekBack').addEventListener('click', exitPeek);
  try{ window.scrollTo({ top:0, behavior:'smooth' }); }catch(e){ window.scrollTo(0,0); }
}
function exitPeek(){
  G.peeking = false;
  document.getElementById('peekRoot').innerHTML = '';
  const pm = document.getElementById('peekModalRoot');
  if(pm) pm.innerHTML = '';
  const mb = document.querySelector('#modalRoot .modal-back');
  if(mb) mb.style.display = '';
}

