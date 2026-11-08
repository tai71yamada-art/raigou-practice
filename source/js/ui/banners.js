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

/* 雷轟合戦にするか（人間が撃った側・受け手が轟を使った時）：はい／いいえで選ぶ。
   「はい」なら自分の轟も使って合戦、「いいえ」なら相手の移し替えがそのまま成立する */
function humanBattleCounterChoice(goName){
  return new Promise(function(resolve){
    let h = '<h3 class="serif">雷轟合戦にしますか？</h3>';
    h += '<p>相手は轟を使って、あなたの雷を受けました。あなたの手には「' + esc(goName) + '」があります。あなたも轟として使って応じると<b>雷轟合戦</b>になります。</p>';
    h += '<p class="sub">合戦では、両者が自分の塔を1つずつ選んで一番上の駒を一斉に開示し、重い方の塔に雷が落ちます（雷放なら雷轟解放として+2点）。同点の場合は、あなたが最初に指定した塔に当初の雷の効果が適用されます。「いいえ」を選ぶと、相手の移し替え（雷轟解放）がそのまま成立します。</p>';
    h += '<div class="btn-row">' +
         '<button type="button" class="btn primary yn" id="bcYes">はい<small>（轟を使って雷轟合戦）</small></button>' +
         '<button type="button" class="btn yn" id="bcNo">いいえ<small>（使わない）</small></button></div>';
    showModal(h);
    document.getElementById('bcYes').addEventListener('click', function(){ closeModal(); resolve(true); });
    document.getElementById('bcNo').addEventListener('click', function(){ closeModal(); resolve(false); });
  });
}
/* 雷轟解放への応答（人間が受け手）：轟で受けて合戦にするか、そのまま受けるかを選ぶ。
   掟3の注記：この雷には相手の轟が使われているため、陣は使えない（選べない形で表示する）。
   Promise<{action:'accept'}|{action:'go',slot}> */
function humanRaigouResponseChoice(attacker, gi, opts){
  return new Promise(function(resolve){
    const a = P(attacker);
    const isTei = opts.mode === 'tei';
    let h = '<h3 class="serif">' + (isTei ? '相手の雷＋轟（雷停）' : '相手の雷轟解放') + '：轟で受けますか？</h3>';
    h += '<p>' + esc(a.name) + 'が' + (isTei ? '<b>雷と轟</b>を合わせて、自分の桜門' + (gi+1) + 'の塔を<b>封印（雷停）</b>' : '<b>雷轟解放</b>で、自分の桜門' + (gi+1) + 'の塔を解放') + 'しようとしています。あなたが轟（霧を轟として使う場合も含みます）で受けると<b>雷轟合戦</b>になります。</p>';
    h += '<p class="sub">' + (isTei
      ? '合戦では、両者が自分の塔を1つずつ選んで一番上の駒を一斉に開示し、重い方の塔が封印されます（雷停なので得点はありません）。同点の場合は、相手の当初の塔がそのまま封印されます。'
      : '合戦では、両者が自分の塔を1つずつ選んで一番上の駒を一斉に開示し、重い方の塔に雷が落ち、雷轟解放として解放されます（役が成立すれば+2点はその塔の持ち主）。同点の場合は、相手の当初の塔に雷放がそのまま適用されます（+2点なし）。') + '</p>';
    if(opts.hasJin){
      h += '<div class="confirm-summary"><b>陣は使えません（言霊の掟）</b>：この雷には相手の轟が既に使われているため、陣（霧を陣として使う場合も含みます）は適用されません。陣は消費されず、手に残ります。</div>';
    }
    h += '<div class="btn-row">';
    if(opts.goSlot >= 0) h += '<button type="button" class="btn primary" data-rgo="go">「' + esc(opts.goName) + '」を轟として使って雷轟合戦にする</button>';
    h += '<button type="button" class="btn" data-rgo="accept">' + (isTei ? '受けない（封印をそのまま通す）' : '受けない（雷轟解放をそのまま成立させる）') + '</button>';
    h += '</div>';
    showModal(h);
    document.getElementById('modalRoot').querySelectorAll('[data-rgo]').forEach(function(b){
      b.addEventListener('click', function(){
        const v = b.getAttribute('data-rgo');
        closeModal();
        if(v === 'go') resolve({ action:'go', slot: opts.goSlot });
        else resolve({ action:'accept' });
      });
    });
  });
}
/* 雷への防御の選択（人間が守る側・第1段階）：
   使える防御駒（陣／霧を陣として／轟／霧を轟として）と「防がない（そのまま受ける）」から選ぶ。
   轟系を選んだ場合は、このあと humanRedirectChoice で移し先の塔を選ぶ。
   Promise<{action:'accept'}|{action:'jin',slot}|{action:'go',slot}> */
function humanRaiDefenseChoice(mode, targetGi, slots, opt){
  return new Promise(function(resolve){
    const d = P(0);
    const modeLabel = mode === 'hou' ? '雷放（塔を解放）' : '雷停（塔を封印）';
    let h;
    if(opt && opt.selfTargetBy !== undefined){
      const a = P(opt.selfTargetBy);
      h = '<h3 class="serif">相手の雷：轟で割り込みますか？</h3>';
      h += '<p>' + esc(a.name) + 'が、自分の桜門' + (targetGi+1) + 'の塔（' + a.gates[targetGi].length + '段）に<b>' + modeLabel + '</b>をかけようとしています。轟（霧を轟として使う場合も含みます）で受けると、雷の対象を<b>あなたの塔</b>に変えられます（段数は問いません）。</p>';
      h += '<p class="sub">' + (mode === 'hou' ? '雷放を移した場合は、あなたの塔が解放され、役が成立すれば雷轟解放として+2点です。' : '雷停を移すと、相手の塔の封印が外れ、代わりにあなたの塔が封印されます。') + '相手も轟で応じると雷轟合戦になります。自分の塔が狙われているわけではないので、陣は使えません。</p>';
    } else {
      h = '<h3 class="serif">相手の雷：防御しますか？</h3>';
      h += '<p>あなたの桜門' + (targetGi+1) + 'の塔（' + d.gates[targetGi].length + '段）が、相手の<b>' + modeLabel + '</b>の対象になりました。対象はもう決まっています。効果が解決する前に、手の防御駒を使うかどうか選んでください。</p>';
      h += '<p class="sub">「防がない」を選ぶと、効果はそのまま解決します（雷放ならあなたの塔が解放されて得点計算されます）。</p>';
    }
    h += '<div class="btn-row">';
    if(slots.jinSlot >= 0) h += '<button type="button" class="btn primary" data-def="jin:' + slots.jinSlot + '">陣で防ぐ（効果を無効化）</button>';
    if(slots.kiriAsJinSlot >= 0) h += '<button type="button" class="btn primary" data-def="jin:' + slots.kiriAsJinSlot + '">霧を陣として使って防ぐ（効果を無効化）</button>';
    if(slots.goSlot >= 0) h += '<button type="button" class="btn" data-def="go:' + slots.goSlot + '">轟で受ける（移し先を選ぶ。相手も轟で応じると雷轟合戦になります）</button>';
    if(slots.kiriAsGoSlot >= 0) h += '<button type="button" class="btn" data-def="go:' + slots.kiriAsGoSlot + '">霧を轟として使って受ける（移し先を選ぶ。相手も轟で応じると雷轟合戦になります）</button>';
    h += '<button type="button" class="btn" data-def="accept">' + (opt && opt.selfTargetBy !== undefined ? '割り込まない（そのまま通す）' : '防がない（そのまま受ける）') + '</button>';
    h += '</div>';
    showModal(h);
    document.getElementById('modalRoot').querySelectorAll('[data-def]').forEach(function(b){
      b.addEventListener('click', function(){
        const v = b.getAttribute('data-def');
        closeModal();
        if(v === 'accept'){ resolve({ action:'accept' }); return; }
        const parts = v.split(':');
        resolve({ action: parts[0], slot: parseInt(parts[1], 10) });
      });
    });
  });
}
/* 雷への防御の選択（人間が守る側・第2段階）：轟／霧（轟として）で受ける時の移し先の塔を選ぶ。
   「やっぱり防がない」を選んだら null（防御駒は消費しない） */
function humanRedirectChoice(mode, targetGi, cands){
  return new Promise(function(resolve){
    const d = P(0);
    let h = '<h3 class="serif">雷の落とす先を移す：移し先の塔を選ぶ</h3>';
    h += '<p>相手の雷を、あなたのどの塔に移しますか？移した先の塔に雷の効果が解決します（雷放で移した場合は、その塔の持ち主の雷轟解放として+2点が付きます）。</p>';
    h += '<div class="big-gates">';
    cands.forEach(function(gi){ h += bigTowerHtml(0, gi, true); });
    h += '</div>';
    h += '<div class="btn-row">';
    cands.forEach(function(gi){
      const tw = d.gates[gi];
      const s = scoreTower(tw);
      const label = '桜門' + (gi+1) + 'の塔（' + tw.length + '段' + (mode==='hou' && s.pts ? '・' + s.role + ' ' + s.pts + '点+2' : '') + '）に移す';
      h += '<button type="button" class="btn primary" data-redir="' + gi + '">' + label + '</button>';
    });
    h += '<button type="button" class="btn" data-redir="cancel">やっぱり防がない（そのまま受ける）</button>';
    h += '</div>';
    showModal(h);
    document.getElementById('modalRoot').querySelectorAll('[data-redir]').forEach(function(b){
      b.addEventListener('click', function(){
        const v = b.getAttribute('data-redir');
        closeModal();
        resolve(v === 'cancel' ? null : parseInt(v, 10));
      });
    });
    document.getElementById('modalRoot').querySelectorAll('[data-pickgate]').forEach(function(el){
      el.addEventListener('click', function(){
        const a = el.getAttribute('data-pickgate').split(':');
        closeModal();
        resolve(parseInt(a[1], 10));
      });
    });
  });
}
/* 斬・蛇への防御の選択（人間が守る側）：
   陣／霧（陣として）と「防がない（そのまま受ける）」から選ぶ。
   Promise<{action:'accept'}|{action:'jin',slot}> */
function humanJinDefenseChoice(attackName, targetDesc, jinSlot, kiriSlot){
  return new Promise(function(resolve){
    let h = '<h3 class="serif">相手の' + esc(attackName) + '：防御しますか？</h3>';
    h += '<p>相手の<b>' + esc(attackName) + '</b>の対象に、' + esc(targetDesc) + 'が選ばれました。対象はもう決まっています。効果が解決する前に、手の防御駒を使うかどうか選んでください。</p>';
    h += '<p class="sub">「防がない」を選ぶと、効果はそのまま解決します。</p>';
    h += '<div class="btn-row">';
    if(jinSlot >= 0) h += '<button type="button" class="btn primary" data-jdef="jin:' + jinSlot + '">陣で防ぐ（効果を無効化）</button>';
    if(kiriSlot >= 0) h += '<button type="button" class="btn primary" data-jdef="jin:' + kiriSlot + '">霧を陣として使って防ぐ（効果を無効化）</button>';
    h += '<button type="button" class="btn" data-jdef="accept">防がない（そのまま受ける）</button>';
    h += '</div>';
    showModal(h);
    document.getElementById('modalRoot').querySelectorAll('[data-jdef]').forEach(function(b){
      b.addEventListener('click', function(){
        const v = b.getAttribute('data-jdef');
        closeModal();
        if(v === 'accept'){ resolve({ action:'accept' }); return; }
        resolve({ action:'jin', slot: parseInt(v.split(':')[1], 10) });
      });
    });
  });
}
/* 禁忌のときに捨てる内駒2個を選ぶ */
function humanTabooChoice(p){
  return new Promise(function(resolve){
    UI.tabooPick = [];
    let h = '<h3 class="serif">禁忌です</h3>';
    h += '<p>満杯（内駒5個）のまま選を迎えたので、陽玉が1点減りました（残り' + p.score + '点）。内駒を2個選んで捨ててください。</p>';
    h += '<div class="pick-list" id="tabooList"></div>';
    h += '<div class="btn-row"><button type="button" class="btn primary" id="tabooOk" disabled>2個選んだら捨てる</button></div>';
    showModal(h);
    const list = document.getElementById('tabooList');
    function drawList(){
      list.innerHTML = '';
      innerTiles(p).forEach(function(t){
        const d = document.createElement('div');
        d.innerHTML = tileHtml(t, UI.tabooPick.indexOf(t)>=0 ? 'selected clickable' : 'clickable');
        d.firstChild.addEventListener('click', function(){
          const i = UI.tabooPick.indexOf(t);
          if(i>=0) UI.tabooPick.splice(i,1);
          else if(UI.tabooPick.length<2) UI.tabooPick.push(t);
          document.getElementById('tabooOk').disabled = UI.tabooPick.length!==2;
          drawList();
        });
        list.appendChild(d);
      });
    }
    drawList();
    document.getElementById('tabooOk').addEventListener('click', function(){
      const picks = UI.tabooPick.slice();
      closeModal();
      resolve(picks);
    });
  });
}
/* 浄の操作モーダル */
function humanJoFlow(handSlot){
  return new Promise(function(resolve){
    const p = P(0);
    const joTile = p.hand[handSlot];
    const others = innerTiles(p).filter(function(t){ return t !== joTile; });
    let discard = [];
    let h = '<h3 class="serif">浄を発します</h3>';
    h += '<p>自分の内駒を0〜4個捨てて、同じ数だけ引き直します。そのあと、内駒の全部を置き直せます（手の駒を体内に戻すこともできます）。置き直しでも体内は3個まで、手は2箇所までです。捨てる駒を選んでください。</p>';
    h += '<div class="pick-list" id="joDiscardList"></div>';
    h += '<div class="btn-row"><button type="button" class="btn primary" id="joNext">捨てて引き直す</button><button type="button" class="btn" id="joCancel">やめる</button></div>';
    showModal(h);
    const list = document.getElementById('joDiscardList');
    function drawList(){
      list.innerHTML = '';
      others.forEach(function(t){
        const d = document.createElement('div');
        d.innerHTML = tileHtml(t, discard.indexOf(t)>=0 ? 'selected clickable' : 'clickable');
        d.firstChild.addEventListener('click', function(){
          const i = discard.indexOf(t);
          if(i>=0) discard.splice(i,1);
          else if(discard.length<4) discard.push(t);
          drawList();
        });
        list.appendChild(d);
      });
      if(!others.length) list.innerHTML = '<span class="sub">捨てられる内駒がありません。</span>';
    }
    drawList();
    document.getElementById('joCancel').addEventListener('click', function(){ closeModal(); resolve(null); });
    document.getElementById('joNext').addEventListener('click', async function(){
      // 捨てて引き直し、置き直し画面へ
      const disc = discard.slice();
      const res = await joDraw(0, handSlot, disc);
      const pool = res.pool;
      let handPick = [];
      let h2 = '<h3 class="serif">置き直し</h3>';
      h2 += '<p>' + disc.length + '個捨てて、' + res.drawnCount + '個引きました。手に置く駒を最大' + P(0).hand.length + '個まで押して選んでください（残りは体内に入ります）。体内は3個までなので、残りが3個を超える置き方はできません。置き直した駒はこの手番に使えます。</p>';
      h2 += '<div class="pick-list" id="joPool"></div>';
      h2 += '<p class="sub" id="joHandLabel"></p>';
      h2 += '<div class="btn-row"><button type="button" class="btn primary" id="joDone">この置き方で決定</button></div>';
      showModal(h2);
      const poolEl = document.getElementById('joPool');
      function drawPool(){
        poolEl.innerHTML = '';
        pool.forEach(function(t){
          const d = document.createElement('div');
          d.innerHTML = tileHtml(t, handPick.indexOf(t)>=0 ? 'selected clickable' : 'clickable');
          d.firstChild.addEventListener('click', function(){
            const i = handPick.indexOf(t);
            if(i>=0) handPick.splice(i,1);
            else if(handPick.length<P(0).hand.length) handPick.push(t);
            drawPool();
          });
          poolEl.appendChild(d);
        });
        document.getElementById('joHandLabel').textContent =
          '手に置く駒：' + (handPick.length ? handPick.map(tileLabel).join('、') : '（なし）') +
          '／体内：' + (pool.length - handPick.length) + '個（3個まで）';
        document.getElementById('joDone').disabled = (pool.length - handPick.length) > 3;
      }
      drawPool();
      document.getElementById('joDone').addEventListener('click', function(){
        closeModal();
        resolve({ handTiles:handPick.slice(), pool:res.pool, counts:{ discardCount:res.discardCount, drawnCount:res.drawnCount } });
      });
    });
  });
}
