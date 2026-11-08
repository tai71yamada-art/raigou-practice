/* ================= ポップアップ共通部品 ================= */
function confirmYesNo(title, text){
  return new Promise(function(resolve){
    let h = '<h3 class="serif">' + esc(title) + '</h3>';
    h += '<div class="confirm-summary">' + text + '</div>';
    h += '<p>この内容でいいですか？</p>';
    h += '<div class="btn-row"><button type="button" class="btn primary yn" id="cfYes">はい</button>' +
         '<button type="button" class="btn yn" id="cfNo">いいえ<small>（選び直す）</small></button></div>';
    showModal(h);
    document.getElementById('cfYes').addEventListener('click', function(){ closeModal(); resolve(true); });
    document.getElementById('cfNo').addEventListener('click', function(){ closeModal(); resolve(false); });
    autoYes('cfYes');
  });
}
function bigTowerHtml(pi, gi, pickable){
  const p = P(pi);
  const tower = p.gates[gi];
  let h = '<div class="big-gate' + (pickable ? ' pickable' : '') + '"' + (pickable ? ' role="button" tabindex="0"' : '') + ' data-pickgate="' + pi + ':' + gi + '">';
  h += '<div class="bg-label">' + esc(p.name) + 'の桜門' + (gi+1) + (p.seals[gi] ? '（封印中）' : '') + '</div>';
  h += '<div class="big-stack">';
  if(!tower.length) h += '<div class="gate-empty">（空）</div>';
  if(pi === 0){
    for(let i = tower.length-1; i >= 0; i--) h += tileHtml(tower[i], '', { ntid:true });
  } else {
    for(let i = tower.length-1; i >= 0; i--) h += isRevealedTile(tower[i]) ? tileHtml(tower[i], 'revealed-top', { ntid:true }) : backHtml(null);
  }
  const topRev = tower.length && pi === 1 && isRevealedTile(tower[tower.length-1]);
  h += '</div><div class="bg-info">' + tower.length + '段' + (pi === 1 && topRev ? '（一番上は開示済み）' : '') + '</div></div>';
  return h;
}
/* 塔の拡大ポップアップで対象を選ぶ。targets: [{pi,gi}]。キャンセルは null */
function pickTowerModal(title, note, targets){
  return new Promise(function(resolve){
    if(!targets.length){ resolve(null); return; }
    let h = '<h3 class="serif">' + esc(title) + '</h3>';
    if(note) h += '<p>' + note + '</p>';
    let lastPi = null;
    h += '<div class="big-gates">';
    targets.forEach(function(tg){
      if(tg.pi !== lastPi){ h += '<div class="gate-group-label">' + esc(P(tg.pi).name) + 'の塔</div>'; lastPi = tg.pi; }
      h += bigTowerHtml(tg.pi, tg.gi, true);
    });
    h += '</div>';
    h += '<div class="btn-row"><button type="button" class="btn" id="ptCancel">やめる</button></div>';
    showModal(h);
    document.getElementById('ptCancel').addEventListener('click', function(){ closeModal(); resolve(null); });
    document.querySelectorAll('[data-pickgate]').forEach(function(el){
      el.addEventListener('click', function(){
        const a = el.getAttribute('data-pickgate').split(':');
        closeModal();
        resolve({ pi: parseInt(a[0],10), gi: parseInt(a[1],10) });
      });
    });
  });
}
/* 斬：選んだ塔の中で上を切るか下を切るかを、拡大表示の中で選ぶ */
function pickZanEnd(pi, gi){
  return new Promise(function(resolve){
    const p = P(pi);
    const tower = p.gates[gi];
    let h = '<h3 class="serif">斬：どちらの端を取りますか</h3>';
    h += '<p>' + esc(p.name) + 'の桜門' + (gi+1) + 'の塔です。' + (pi === 1 ? '取る位置は選べます。' : '') + '</p>';
    h += '<div class="modal-center"><div class="big-gate"><div class="bg-label">桜門' + (gi+1) + '（' + tower.length + '段）</div><div class="big-stack">';
    for(let i = tower.length-1; i >= 0; i--){
      let cls = '';
      if(i === tower.length-1) cls = 'hl-top';
      if(i === 0) cls = tower.length === 1 ? 'hl-top' : 'hl-bottom';
      h += (pi === 0 || isRevealedTile(tower[i])) ? tileHtml(tower[i], cls, { ntid:true }) : '<div class="tile back ' + cls + '"></div>';
    }
    h += '</div></div></div>';
    const topLabel = (pi === 0 || isRevealedTile(tower[tower.length-1])) ? '・「' + tileLabel(tower[tower.length-1]) + '」' : '';
    const botLabel = (pi === 0 || isRevealedTile(tower[0])) ? '・「' + tileLabel(tower[0]) + '」' : '';
    h += '<div class="btn-row">' +
         '<button type="button" class="btn primary" id="zanTopBtn">一番上（赤枠' + topLabel + '）を取る</button>' +
         '<button type="button" class="btn" id="zanBotBtn">一番下（金枠' + botLabel + '）を取る</button>' +
         '<button type="button" class="btn" id="zanBackBtn">塔を選び直す</button></div>';
    showModal(h);
    document.getElementById('zanTopBtn').addEventListener('click', function(){ closeModal(); resolve('top'); });
    document.getElementById('zanBotBtn').addEventListener('click', function(){ closeModal(); resolve('bottom'); });
    document.getElementById('zanBackBtn').addEventListener('click', function(){ closeModal(); resolve(null); });
  });
}
function locDescForShun(loc){
  if(loc.zone === 'canyon') return '峡谷の「' + tileLabel(G.canyon[loc.idx]) + '」';
  const owner = P(loc.pi);
  if(loc.pi === 1) return owner.name + 'の' + (loc.zone === 'body' ? '体内' : '手') + 'の駒';
  const t = locTile(loc);
  return owner.name + 'の' + (loc.zone === 'body' ? '体内' : '手') + 'の「' + (t ? tileLabel(t) : '?') + '」';
}
/* 瞬：入れ替える2個をポップアップで選ぶ（峡谷もここで選べる） */
function pickShunModal(handSlot){
  return new Promise(function(resolve){
    let picks = [];
    function itemHtml(key, label, inner, disabled){
      const sel = picks.indexOf(key) >= 0;
      return '<span data-shun-item="' + key + '">' + inner.replace('tile ', 'tile ' + (disabled ? '' : 'clickable') + (sel ? ' selected' : '') + ' ') + '</span>';
    }
    function draw(){
      const items = {}; // key -> loc
      let h = '<h3 class="serif">瞬：入れ替える駒を2個選ぶ</h3>';
      h += '<p>自分の体内・手、相手の体内・手、峡谷の駒から2個選んでください（峡谷の重さ7以上の言霊は選べません）。' + (picks.length ? 'あと' + (2 - picks.length) + '個選んでください。' : '') + '</p>';
      function section(title, build){ h += '<div class="gate-group-label">' + title + '</div><div class="pick-list">' + build + '</div>'; }
      function sectionBody(title, build){
        // 体内は縦一列・重い駒が一番下。body配列は重い順（index0が一番重い）なので column-reverse で表示する
        if(!build){ h += '<div class="gate-group-label">' + title + '（縦：下が重い）</div><span class="sub">（なし）</span>'; return; }
        h += '<div class="gate-group-label">' + title + '（縦：下が重い）</div><div class="pick-col-wrap"><span class="pick-col-note">▲ 上（軽い）</span><div class="pick-col">' + build + '</div><span class="pick-col-note">▼ 下（重い）</span></div>';
      }
      sectionBody('あなたの体内', P(0).body.map(function(t, idx){
        const key = 'b0:' + idx; items[key] = { zone:'body', pi:0, idx:idx };
        return itemHtml(key, '', tileHtml(t, '', { ntid:true }), false);
      }).join(''));
      section('あなたの手', P(0).hand.map(function(t, s){
        if(!t || s === handSlot) return '';
        const key = 'h0:' + s; items[key] = { zone:'hand', pi:0, idx:s };
        return itemHtml(key, '', tileHtml(t, '', { ntid:true }), false);
      }).join('') || '<span class="sub">（なし）</span>');
      sectionBody('相手の体内', P(1).body.map(function(t, idx){
        const key = 'b1:' + idx; items[key] = { zone:'body', pi:1, idx:idx };
        return itemHtml(key, '', backHtml(null), false);
      }).join(''));
      section('相手の手', P(1).hand.map(function(t, s){
        if(!t) return '';
        const key = 'h1:' + s; items[key] = { zone:'hand', pi:1, idx:s };
        return itemHtml(key, '', backHtml(null), false);
      }).join('') || '<span class="sub">（なし）</span>');
      section('峡谷', G.canyon.map(function(t, idx){
        const key = 'c:' + idx; items[key] = { zone:'canyon', idx:idx };
        const dis = t.kind === 'gen' && t.w >= 7;
        return '<span data-shun-item="' + key + '">' + tileHtml(t, dis ? '' : ('clickable' + (picks.indexOf(key) >= 0 ? ' selected' : '')), { ntid:true }) + '</span>';
      }).join('') || '<span class="sub">（なし）</span>');
      h += '<div class="btn-row"><button type="button" class="btn primary" id="shunOk" ' + (picks.length === 2 ? '' : 'disabled') + '>この2個で決める</button>' +
           '<button type="button" class="btn" id="shunCancel">やめる</button></div>';
      showModal(h);
      document.querySelectorAll('[data-shun-item]').forEach(function(el){
        el.addEventListener('click', function(){
          const key = el.getAttribute('data-shun-item');
          const loc = items[key];
          if(loc && loc.zone === 'canyon'){
            const t = G.canyon[loc.idx];
            if(t && t.kind === 'gen' && t.w >= 7) return;
          }
          const i = picks.indexOf(key);
          if(i >= 0) picks.splice(i, 1);
          else if(picks.length < 2) picks.push(key);
          draw();
        });
      });
      document.getElementById('shunCancel').addEventListener('click', function(){ closeModal(); resolve(null); });
      const okBtn = document.getElementById('shunOk');
      if(okBtn) okBtn.addEventListener('click', function(){
        if(picks.length !== 2) return;
        const locs = picks.map(function(k){ return items[k]; });
        closeModal();
        resolve(locs);
      });
    }
    draw();
  });
}
/* 蛇：奪う内駒をポップアップで選ぶ。items: [{loc:{pi,where,idx}, desc, html}]
   体内は縦一列で、重さ順で重い駒が一番下に来る並び（itemsは重い順＝body配列順に渡されるので column-reverse で表示する）。
   手は手として区別して横並びで表示する。 */
function pickHebiModal(items){
  return new Promise(function(resolve){
    let h = '<h3 class="serif">蛇：奪う内駒を選ぶ</h3>';
    h += '<p>奪う駒をタップしてください。相手の駒は場所で選びます。自分の体内の駒も選べます。体内は縦に並び、一番下が一番重い駒です。</p>';
    let lastGroup = '';
    items.forEach(function(it, i){
      const isBody = it.loc && it.loc.where === 'body';
      if(it.group !== lastGroup){
        if(isBody) h += '<div class="gate-group-label">' + esc(it.group) + '（縦：下が重い）</div><div class="pick-col-wrap"><span class="pick-col-note">▲ 上（軽い）</span><div class="pick-col">';
        else h += '<div class="gate-group-label">' + esc(it.group) + '</div><div class="pick-list">';
        lastGroup = it.group;
      }
      h += '<button type="button" class="tile-btn" data-hebi-item="' + i + '">' + it.html + '</button>';
      const next = items[i+1];
      if(!next || next.group !== it.group){
        if(isBody) h += '</div><span class="pick-col-note">▼ 下（重い）</span></div>';
        else h += '</div>';
      }
    });
    h += '<div class="btn-row"><button type="button" class="btn" id="hebiCancel">やめる</button></div>';
    showModal(h);
    document.getElementById('hebiCancel').addEventListener('click', function(){ closeModal(); resolve(null); });
    document.querySelectorAll('[data-hebi-item]').forEach(function(el){
      el.addEventListener('click', function(){
        const it = items[parseInt(el.getAttribute('data-hebi-item'), 10)];
        closeModal();
        resolve(it);
      });
    });
  });
}

