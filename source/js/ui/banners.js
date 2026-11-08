/* ================= 演出バナー（塔の解放・役なし・不穏の塔・禁忌） =================
   #fxRoot2 は pointer-events:none。順番に1つずつ表示する（重ならないようキューで待つ） */
let FXQ = Promise.resolve();
function fxQueue(fn){ FXQ = FXQ.then(fn).catch(function(){}); return FXQ; }
function fxBannerShow(html, cls, ms){
  return new Promise(function(res){
    let root = document.getElementById('fxRoot2');
    if(!root){ root = document.createElement('div'); root.id = 'fxRoot2'; document.body.appendChild(root); }
    const dur = REDUCED_MOTION ? 400 : ms;
    root.innerHTML = '<div class="fxb ' + (cls||'') + '" style="animation-duration:' + dur + 'ms">' + html + '</div>';
    setTimeout(function(){ root.innerHTML = ''; res(); }, dur);
  });
}
function fxTilesRow(tiles, badIdx){
  return '<div class="fxb-tiles">' + tiles.map(function(t, i){
    const bad = (badIdx !== undefined && badIdx >= 0 && (i === badIdx || i === badIdx-1)) ? 'bad-pair' : '';
    return '<span style="animation-delay:' + (i*80) + 'ms;display:inline-block;">' + tileHtml(t, bad, { ntid:true }) + '</span>';
  }).join('') + '</div><div class="fxb-order">左が一番下 → 右が一番上</div>';
}
function fxReleaseBanner(pi, gi, tiles, s, pts, bonus){
  const p = P(pi);
  const who = esc(p.name) + 'の桜門' + (gi+1) + '（' + tiles.length + '段）';
  if(s.pts > 0){
    const kind = tiles.length === 6 && ['桜蓮花','蓮桜花','桜々花','蓮々花'].indexOf(s.role) >= 0 ? '組み合わせ役'
               : (['山茶花','椿'].indexOf(s.role) >= 0 ? '特殊役' : (s.base >= 10 ? '雷神役' : '役'));
    let br = '基礎' + s.base + '＋高さ' + s.height + '＋染め' + s.dye;
    if(bonus) br += '＋雷轟解放' + bonus;
    const html = '<div class="fxb-card"><span class="fxb-tag">TOWER RELEASE</span><span class="fxb-who">' + who + '</span>' +
      fxTilesRow(tiles) + '<span class="fxb-kind">' + kind + '</span><span class="fxb-role">' + esc(s.role) + '</span>' +
      '<span class="fxb-break">' + br + '</span><span class="fxb-pts">+' + pts + '</span></div>';
    return fxQueue(function(){ return fxBannerShow(html, '', 2100); });
  }
  const html = '<div class="fxb-card"><span class="fxb-tag">TOWER RELEASE</span><span class="fxb-who">' + who + '</span>' +
    fxTilesRow(tiles) + '<span class="fxb-role">役なし</span><span class="fxb-break">駒はすべて峡谷へ</span><span class="fxb-pts">0</span></div>';
  return fxQueue(function(){ return fxBannerShow(html, 'none', 1500); });
}
function fxFuonBanner(pi, gi, tiles){
  const p = P(pi);
  let badIdx = -1;
  for(let i=1;i<tiles.length;i++){ if(tiles[i].w > tiles[i-1].w){ badIdx = i; break; } }
  let why = '';
  if(badIdx > 0) why = '重さ' + tiles[badIdx-1].w + 'の「' + esc(tileLabel(tiles[badIdx-1])) + '」の上に、重さ' + tiles[badIdx].w + 'の「' + esc(tileLabel(tiles[badIdx])) + '」';
  const html = '<div class="fxb-card"><span class="fxb-tag">UNSTABLE TOWER</span><span class="fxb-who">' + esc(p.name) + 'の桜門' + (gi+1) + '（' + tiles.length + '段）</span>' +
    fxTilesRow(tiles, badIdx) + '<span class="fxb-kind">重さの順が逆</span><span class="fxb-role">不穏の塔</span>' +
    '<span class="fxb-break">' + why + '／得点なし・駒は峡谷へ</span><span class="fxb-pts">陽玉 −1</span></div>';
  return fxQueue(function(){ return fxBannerShow(html, 'bad', 2100); });
}
function fxTabooBanner(pi){
  const p = P(pi);
  const html = '<div class="fxb-card"><span class="fxb-tag">TABOO</span><span class="fxb-who">' + esc(p.name) + '：内駒が5つとも埋まったまま「選」を迎えました</span>' +
    '<span class="fxb-role">禁忌</span><span class="fxb-break">内駒を2つ峡谷へ捨てて、「選」からやり直し</span><span class="fxb-pts">陽玉 −1</span></div>';
  return fxQueue(function(){ return fxBannerShow(html, 'bad', 1800); });
}
/* 駒クローンを指定位置に作る */
function fxMakeClone(fromRect, size, innerHtml){
  const layer = fxLayerEl();
  const d = document.createElement('div');
  d.className = 'fx-clone';
  d.style.left = fromRect.left + 'px'; d.style.top = fromRect.top + 'px';
  d.style.width = size + 'px'; d.style.height = size + 'px';
  d.innerHTML = innerHtml;
  layer.appendChild(d);
  return d;
}
function fxFlyTo(el, fromRect, toRect, size, durationMs){
  const dx = (toRect.left + toRect.width/2 - size/2) - fromRect.left;
  const dy = (toRect.top + toRect.height/2 - size/2) - fromRect.top;
  try{
    return el.animate([
      { transform:'translate(0,0)', opacity:1 },
      { transform:'translate(' + dx + 'px,' + dy + 'px)', opacity:.25 }
    ], { duration: REDUCED_MOTION ? 60 : (durationMs || 620), easing:'ease-in-out' }).finished.catch(function(){});
  }catch(e){ return Promise.resolve(); }
}
/* 雷：対象の塔に落雷 */
async function fxLightning(pi, gi){
  SFX.play('thunder');
  const r = fxGateRect(pi, gi);
  if(!r) return;
  const layer = fxLayerEl();
  const flash = document.createElement('div');
  flash.className = 'fx-flash';
  flash.style.left = (r.left - 6) + 'px'; flash.style.top = (r.top - 6) + 'px';
  flash.style.width = (r.width + 12) + 'px'; flash.style.height = (r.height + 12) + 'px';
  layer.appendChild(flash);
  const bolt = document.createElement('div');
  bolt.className = 'fx-bolt';
  const bw = Math.max(90, r.width * 1.2), bh = Math.max(120, r.top + r.height * 0.55);
  bolt.style.left = (r.left + r.width/2 - bw/2) + 'px';
  bolt.style.top = '0px';
  bolt.style.width = bw + 'px'; bolt.style.height = bh + 'px';
  bolt.innerHTML = '<svg width="100%" height="100%" viewBox="0 0 100 200" preserveAspectRatio="none" aria-hidden="true">' +
    '<path d="M70 0 L38 74 L60 78 L26 150 L46 152 L40 200" fill="none" stroke="#3aa8ff" stroke-width="16" stroke-linejoin="bevel" opacity=".35"/>' +
    '<path d="M70 0 L38 74 L60 78 L26 150 L46 152 L40 200" fill="none" stroke="#7fd4ff" stroke-width="8" stroke-linejoin="bevel" opacity=".6"/>' +
    '<path d="M70 0 L38 74 L60 78 L26 150 L46 152 L40 200" fill="none" stroke="#eef9ff" stroke-width="4" stroke-linejoin="bevel"/>' +
    '<path d="M52 40 L30 56 M36 112 L14 128" fill="none" stroke="#7fd4ff" stroke-width="2.5"/></svg>';
  layer.appendChild(bolt);
  const tw = P(pi) ? P(pi).gates[gi] : null;
  const tag = document.createElement('div');
  tag.className = 'fx-target';
  tag.innerHTML = '<span>TARGET</span><b>' + esc(P(pi).name) + 'の桜門' + (gi+1) + (tw && tw.length ? '（' + tw.length + '段）' : '') + '</b>';
  tag.style.left = Math.min(window.innerWidth - 170, Math.max(8, r.left + r.width/2 - 80)) + 'px';
  tag.style.top = Math.max(8, r.top - 56) + 'px';
  layer.appendChild(tag);
  await fxWait(900);
  flash.remove(); bolt.remove(); tag.remove();
}
/* 雷停：対象の塔に封の印 */
async function fxSealFx(pi, gi){
  const r = fxGateRect(pi, gi);
  if(!r) return;
  const layer = fxLayerEl();
  const s = document.createElement('div');
  s.className = 'fx-sealstamp'; s.textContent = '封';
  s.style.left = (r.left + r.width/2 - 26) + 'px';
  s.style.top = (r.top + r.height/2 - 26) + 'px';
  layer.appendChild(s);
  await fxWait(860);
  s.remove();
}
/* 陣：五芒星で防ぐ */
async function fxPentagram(){
  const layer = fxLayerEl();
  const d = document.createElement('div');
  d.className = 'fx-penta';
  d.innerHTML = '<svg width="220" height="220" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="rgba(40,30,80,.25)" stroke="#c9a44a" stroke-width="2.5"/>' +
    '<polygon points="50,6 61.8,38.2 95.1,38.2 68.1,57.8 78.4,89.8 50,70 21.6,89.8 31.9,57.8 4.9,38.2 38.2,38.2" fill="none" stroke="#c9a44a" stroke-width="2.5" stroke-linejoin="round"/></svg>';
  layer.appendChild(d);
  await fxWait(900);
  d.remove();
}
/* 陣で防いだ時のカットイン＋五芒星 */
async function playJinFx(defenderPi){
  await playCutIn('陣', defenderPi);
  await fxPentagram();
}
/* 斬：切る箇所に斬撃、切られた駒が表になって峡谷へ消える */
async function fxZanFx(removedTile, gateRectBefore, end){
  if(!gateRectBefore) return;
  const layer = fxLayerEl();
  const size = 38;
  const y = end === 'top' ? gateRectBefore.top : gateRectBefore.bottom - size;
  const tileRect = { left: gateRectBefore.left + gateRectBefore.width/2 - size/2, top: y, width: size, height: size };
  const clone = fxMakeClone(tileRect, size, tileHtml(removedTile, '', { ntid:true }));
  const slash = document.createElement('div');
  slash.className = 'fx-slash';
  slash.style.left = (tileRect.left - 12) + 'px';
  slash.style.top = (tileRect.top + size/2) + 'px';
  slash.style.width = (size + 24) + 'px';
  layer.appendChild(slash);
  await fxWait(340);
  slash.remove();
  const canyonRect = fxRectOf('#canyonBtn');
  if(canyonRect && !REDUCED_MOTION) await fxFlyTo(clone, tileRect, canyonRect, size);
  clone.remove();
}
/* 駒クローンを別の場所へ移動させる（蛇・瞬）
   取られる／入れ替わる駒の動きは、体内の整列と同じく目で追い切れる速さ（約0.8秒）に統一する */
async function fxMoveClone(fromRect, toRect, size, innerHtml){
  if(!fromRect || !toRect) return;
  const clone = fxMakeClone({ left: fromRect.left + fromRect.width/2 - size/2, top: fromRect.top + fromRect.height/2 - size/2, width:size, height:size }, size, innerHtml);
  const startRect = clone.getBoundingClientRect();
  if(!REDUCED_MOTION) await fxFlyTo(clone, startRect, toRect, size, BODY_MOVE_MS + 20);
  clone.remove();
}

