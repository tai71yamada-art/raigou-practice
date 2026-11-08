/* ================= AIの行動を上部の帯で知らせる ================= */
/* AIの行動を上部の帯で知らせる */
let _aiBandTimer = null;
function aiBand(text){
  let el = document.getElementById('aiBand');
  if(!el){ el = document.createElement('div'); el.id = 'aiBand'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
  el.innerHTML = '<span class="ab-who">AI</span><span class="ab-txt">' + esc(text) + '</span>';
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  clearTimeout(_aiBandTimer);
  _aiBandTimer = setTimeout(function(){ el.classList.remove('show'); }, 1500 * aiSpeedFactor() + 500);
}
