/* ================= ログ ================= */
const logEl = function(){ return document.getElementById('log'); };
function uiLogClear(){ const el = logEl(); if(el) el.innerHTML=''; }
function uiLogTurn(text){
  const el = logEl(); if(!el) return;
  const g = document.createElement('div'); g.className = 'lt-group';
  const d = document.createElement('div'); d.className='lt'; d.textContent = text;
  g.appendChild(d);
  el.insertBefore(g, el.firstChild); el.scrollTop = 0;
}
function uiLog(text, cls){
  const el = logEl(); if(!el) return;
  const d = document.createElement('div'); d.className = 'le' + (cls ? ' '+cls : '');
  d.textContent = text;
  const g = el.firstElementChild;
  if(g && g.classList.contains('lt-group')) g.insertBefore(d, g.firstElementChild.nextSibling); // 見出しのすぐ下＝その手番で一番新しい行
  else el.insertBefore(d, el.firstChild);
  el.scrollTop = 0;
}

