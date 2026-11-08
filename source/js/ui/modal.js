/* ================= モーダル ================= */
/* 確認の省略：設定がオンなら「はい」を自動で押す（画面にはほぼ出さない） */
function autoYes(btnId){
  if(!SETTINGS.skipConfirm) return false;
  const b = document.getElementById(btnId);
  if(!b) return false;
  const root = document.getElementById('modalRoot');
  root.classList.add('auto-skip');
  b.click();
  root.classList.remove('auto-skip');
  return true;
}
function showModal(html){
  const root = document.getElementById('modalRoot');
  root.innerHTML = '<div class="modal-back"><div class="modal-box">' + html + '</div></div>';
  // 「盤面を見る」ボタン：ポップアップを一時的に隠して盤面を閲覧できる（操作はできない）
  const box = root.querySelector('.modal-box');
  if(box && !box.querySelector('[data-peekbtn]')){
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'btn'; b.setAttribute('data-peekbtn', '1');
    b.textContent = '盤面を見る'; b.style.marginTop = '12px';
    b.addEventListener('click', enterPeek);
    box.appendChild(b);
  }
}
function closeModal(){ document.getElementById('modalRoot').innerHTML = ''; }

