/* ================= カットイン＆効果アニメーション ================= */
function fxLayerEl(){
  let el = document.getElementById('fxLayer');
  if(!el){ el = document.createElement('div'); el.id = 'fxLayer'; document.body.appendChild(el); }
  return el;
}
function fxRectOf(sel){
  const el = document.querySelector(sel);
  return el ? el.getBoundingClientRect() : null;
}
function fxGateRect(pi, gi){ return fxRectOf('[data-gate="' + pi + ':' + gi + '"] .g-stack') || fxRectOf('[data-gate="' + pi + ':' + gi + '"]'); }
function fxWait(ms){ return wait(REDUCED_MOTION ? Math.min(ms, 160) : ms); }
