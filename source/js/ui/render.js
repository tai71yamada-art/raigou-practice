/* ================= 画面描画 ================= */
const UI = {
  selHand:null,        // 選択中の手のスロット
  pending:null,        // （旧方式の対象選択状態。新UIではポップアップフローを使うため通常は null）
  drawn:[],            // 選で引いて置き場所待ちの駒
  tabooPick:[],
  shunFirst:null,
  lastCanyon:undefined // 峡谷の枚数変化（アニメーション用）
};
function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;'); }
function tileHtml(t, extra, opts){
  const tid = (opts && opts.ntid) ? '' : ' data-tid="' + t.id + '"';
  return '<div class="tile ' + t.kind + (extra ? ' ' + extra : '') + '"' + tid + '><span class="w">' + t.w + '</span>' + esc(tileLabel(t)) + '</div>';
}
function backHtml(t, extra){
  if(typeof t === 'string'){ extra = t; t = null; }
  const tid = t ? ' data-tid="' + t.id + '"' : '';
  return '<div class="tile back' + (extra ? ' ' + extra : '') + '"' + tid + '></div>';
}
/* 駒の動きを目で追えるように：描画前の位置を覚えて、描画後に滑らかに移動させる。
   体内（.body-col）の駒は「重さ順への並び替え」が目で追えるよう、1枚の移動に約0.8秒
   （確認できるスピード：0.65〜0.9秒の範囲）かけ、フェードではなく位置の移動で見せる。
   animateRects の promise は全アニメーションの完了で解決し、bodyMoved は
   体内の駒が実際に動いたかどうかを示す（動かなければ余計に待たせない） */
const BODY_MOVE_MS = 800;
const REDUCED_MOTION = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function captureRects(){
  const m = {};
  document.querySelectorAll('[data-tid]').forEach(function(el){ m[el.getAttribute('data-tid')] = el.getBoundingClientRect(); });
  return m;
}
function animateRects(prev){
  if(REDUCED_MOTION || !prev) return { promise: Promise.resolve(), bodyMoved:false };
  const deckEl = document.querySelector('[data-anchor="deck"]');
  const deckRect = deckEl ? deckEl.getBoundingClientRect() : null;
  const anims = [];
  let bodyMoved = false;
  document.querySelectorAll('[data-tid]').forEach(function(el){
    const r = el.getBoundingClientRect();
    if(!r.width) return;
    const p = prev[el.getAttribute('data-tid')];
    const inBody = !!(el.closest && el.closest('.body-col'));
    try{
      if(p && p.width){
        const dx = p.left - r.left, dy = p.top - r.top;
        if(Math.abs(dx) > 4 || Math.abs(dy) > 4){
          if(inBody) bodyMoved = true;
          const a = el.animate([{ transform:'translate(' + dx + 'px,' + dy + 'px)' }, { transform:'none' }],
            { duration: inBody ? BODY_MOVE_MS : 420, easing:'ease-in-out' });
          if(a && a.finished) anims.push(a.finished.catch(function(){}));
        }
      } else if(deckRect){
        const dx = (deckRect.left + deckRect.width/2) - (r.left + r.width/2);
        const dy = (deckRect.top + deckRect.height/2) - (r.top + r.height/2);
        if(Math.abs(dx) > 30 || Math.abs(dy) > 30){
          if(inBody) bodyMoved = true;
          const a = el.animate([{ transform:'translate(' + dx + 'px,' + dy + 'px) scale(.55)', opacity:.35 }, { transform:'none', opacity:1 }],
            { duration: inBody ? BODY_MOVE_MS : 420, easing:'ease-in-out' });
          if(a && a.finished) anims.push(a.finished.catch(function(){}));
        }
      }
    }catch(e){ /* アニメーションが使えない環境では何もしない */ }
  });
  return { promise: Promise.all(anims).then(function(){}), bodyMoved: bodyMoved };
}

function render(){
  if(!G.started) return Promise.resolve();
  if(UI.chipSlot !== null && UI.chipSlot !== undefined && (G.turn !== 0 || G.phase !== 'act' || G.busy)) closeHandChips();
  const prevRects = captureRects();
  document.getElementById('deckNum').textContent = G.deck.length;
  { const db = document.getElementById('deckBtn'); if(db) db.classList.toggle('low', G.deck.length <= 10); }
  const cn = document.getElementById('canyonNum');
  if(cn){
    if(UI.lastCanyon !== undefined && G.canyon.length > UI.lastCanyon){
      const btn = document.getElementById('canyonBtn');
      if(btn && !REDUCED_MOTION){ btn.classList.remove('pulse'); void btn.offsetWidth; btn.classList.add('pulse'); }
    }
    cn.textContent = G.canyon.length;
  }
  UI.lastCanyon = G.canyon.length;
  const tl = document.getElementById('turnLabel');
  if(G.over) tl.textContent = '対戦終了';
  else tl.textContent = (cur().isAI ? 'AIの手番' : 'あなたの手番') + ' · ' + G.turnNo + (G.isFinalTurn ? ' · 最終（選なし）' : (G.finalRound ? ' · 雷山が尽きた' : ''));
  const ss = document.getElementById('scoreStrip');
  if(ss) ss.textContent = 'あなた ' + P(0).score + '点 ・ AI ' + P(1).score + '点';
  document.getElementById('diffSelect').value = G.difficulty;
  renderZone(document.getElementById('aiZone'), 1);
  renderHumanZone();
  renderCanyon();
  renderReleased();
  document.querySelectorAll('#phasebar .phase-step').forEach(function(el){
    el.classList.toggle('on', el.getAttribute('data-ph') === G.phase && !G.over);
  });
  const hb = document.getElementById('hideBtn');
  if(hb){
    const showHb = (G.turn === 0 && G.phase === 'act' && !G.over && !G.busy);
    if(showHb && hb.classList.contains('gone')){
      hb.classList.remove('gone'); hb.classList.add('appear');
      setTimeout(function(){ hb.classList.remove('appear'); }, 320);
    }
    hb.hidden = !showHb;
  }
  renderActionbar();
  /* 体内の駒が動いた時は、その移動アニメーションの間入力を受け付けず（G.reorderBusy）、
     呼び出し側が await すればアニメーション完了後に次へ進む。動かなければ待たせない */
  return new Promise(function(res){
    requestAnimationFrame(function(){
      const anim = animateRects(prevRects);
      if(anim && anim.bodyMoved && !REDUCED_MOTION){
        G.reorderBusy = true;
        anim.promise.then(function(){ G.reorderBusy = false; res(); });
      } else if(anim){ anim.promise.then(res); }
      else res();
    });
  });
}
function isRevealedTile(t){
  return !!(t && G.revealedTopIds && G.revealedTopIds.has(t.id));
}
function gateInfoHtml(pi, gi){
  const tower = P(pi).gates[gi];
  if(pi === 1){
    // 相手の塔は中身が見えない。段数だけ分かる（雷轟合戦で開示された駒は表向きで残る）
    if(!tower.length) return '';
    const top = tower[tower.length-1];
    if(isRevealedTile(top)) return tower.length + '段（一番上は開示済み：「' + tileLabel(top) + '」重さ' + top.w + '）';
    return tower.length + '段';
  }
  if(tower.length && isFuon(tower)) return tower.length + '段 ・ <b>不穏の塔</b>（解放すると得点なし・陽玉-1点）';
  if(tower.length < 3) return tower.length ? tower.length + '段' : '';
  const s = scoreTower(tower);
  if(s.pts > 0) return tower.length + '段 ・ 今解放すると <b>' + s.role + ' ' + s.pts + '点</b>（基礎' + s.base + '＋高さ' + s.height + '＋染め' + s.dye + '）';
  return tower.length + '段 ・ 今解放すると 役なし 0点';
}
/* 桜門の上に出す短い見出し。詳しい内訳は桜門をタップして見る */
function gateShortLabel(pi, gi){
  const p = P(pi), tower = p.gates[gi];
  if(p.seals[gi]) return '<span class="gl-seal">封印中</span>';
  if(!tower.length) return '<span class="gl-name">桜門' + (gi+1) + '</span>';
  if(pi === 1) return '<span class="gl-n">' + tower.length + '段</span>';
  if(isFuon(tower)) return '<span class="gl-bad">不穏 ' + tower.length + '段</span>';
  if(tower.length >= 3){
    const s = scoreTower(tower);
    if(s.pts > 0) return '<span class="gl-role">' + esc(s.role) + ' ' + s.pts + '点</span>';
  }
  return '<span class="gl-n">' + tower.length + '段</span>';
}
function gateClasses(pi, gi){
  const cls = ['gate'];
  if(P(pi).seals[gi]) cls.push('sealed');
  if(pi === 0 && isFuon(P(pi).gates[gi])) cls.push('fuon');
  if(pi === 0 && !isFuon(P(pi).gates[gi]) && P(pi).gates[gi].length >= 3 && scoreTower(P(pi).gates[gi]).pts > 0) cls.push('has-role');
  if(isGateTargetable(pi, gi)) cls.push('targetable');
  return cls.join(' ');
}
function isGateTargetable(pi, gi){
  if(!UI.pending || G.turn !== 0 || G.busy) return false;
  const pd = UI.pending;
  if(pd.type==='stack') return pi===0 && canStack(P(0), gi, P(0).hand[pd.hand]);
  if(pd.type==='raigou') return pi===0 && raigouGates(P(0)).indexOf(gi) >= 0;
  if(pd.type==='rai' || pd.type==='kirRai') return raiTargets().some(function(x){ return x.pi===pi && x.gi===gi; });
  if(pd.type==='zan' || pd.type==='kirZan') return P(pi).gates[gi].length>0 && !P(pi).seals[gi];
  return false;
}
/* プレイヤーゾーンの盤面部分（桜門＋手・体内）のHTML。アバターや名前・陽玉は含まない */
function zoneMainHtml(pi){
  const p = P(pi);
  const isHuman = pi===0;
  /* 相手の体内：前回の描画から新しく入った駒に「NEW」の目印を付け、どの位置に入ったか見えるようにする */
  let aiNew = null;
  if(!isHuman){
    const ids = p.body.map(function(t){ return t.id; });
    const key = ids.join(',');
    if(UI.aiBodyKey !== key){
      const prev = UI.aiBodyIds;
      UI.aiNewIds = new Set(prev ? ids.filter(function(id){ return prev.indexOf(id) < 0; }) : []);
      UI.aiBodyIds = ids; UI.aiBodyKey = key;
    }
    aiNew = UI.aiNewIds || new Set();
  }
  // 桜門
  let gates = '<div class="gates">';
  for(let gi=0; gi<3; gi++){
    const tower = p.gates[gi];
    gates += '<div class="' + gateClasses(pi,gi) + '" data-gate="' + pi + ':' + gi + '">';
    gates += '<div class="g-label">' + gateShortLabel(pi, gi) + '</div><div class="g-stack">';

    if(!tower.length) gates += '<div class="gate-empty">EMPTY</div>';
    if(isHuman){
      for(let i=tower.length-1; i>=0; i--) gates += tileHtml(tower[i]);
    } else {
      for(let i=tower.length-1; i>=0; i--) gates += isRevealedTile(tower[i]) ? tileHtml(tower[i], 'revealed-top') : backHtml(tower[i]);
    }
    gates += '</div><div class="g-info">' + gateInfoHtml(pi,gi) + '</div></div>';
  }
  gates += '</div>';
  // 手（左右）
  function handHtml(s){
    const t = p.hand[s];
    let inner = '';
    if(t) inner = isHuman ? tileHtml(t, 'clickable') : backHtml(t);
    else inner = '<span class="body-count">空</span>';
    const label = handLabel(s);
    const slot = isHuman
      ? '<button type="button" class="hand-slot" data-hand="' + pi + ':' + s + '" aria-label="' + label + '">' + inner + '</button>'
      : '<div class="hand-slot" data-hand="' + pi + ':' + s + '">' + inner + '</div>';
    return '<div class="hand-wrap"><span class="ib-label">' + label + '</span>' + slot + '</div>';
  }
  // 体内（縦一列：body配列は重い順で index0 が一番重いので、column-reverse で一番下に表示する）
  let body = '<div class="body-wrap"><span class="ib-label">体内<small>下ほど重い</small></span><div class="body-col">';
  if(isHuman){
    p.body.forEach(function(t, idx){ body += '<div data-body="' + pi + ':' + idx + '">' + tileHtml(t, 'clickable') + '</div>'; });
  } else {
    p.body.forEach(function(t, idx){ body += '<div data-body="' + pi + ':' + idx + '">' + backHtml(t, aiNew && aiNew.has(t.id) ? 'is-new' : '') + '</div>'; });
  }
  if(!p.body.length) body += '<span class="body-count">（なし）</span>';
  body += '</div></div>';
  const inner = '<div class="inner-row">' + handHtml(0) + body + handHtml(1) + (p.hand.length > 2 ? handHtml(2) : '') + '</div>';
  return '<div class="pz-main ' + (isHuman ? 'me' : 'opp') + '">' + (isHuman ? gates + inner : inner + gates) + '</div>';
}
/* AI側ゾーンの描画（アバターは静止画なので、従来通りゾーンごと描き直してよい） */
function renderZone(el, pi){
  const p = P(pi);
  let h = '';
  h += '<div class="pz-head">' +
       '<img class="pz-avatar" src="' + AI_IMG + '" alt="AIのアバター（青い電子基盤とAIチップ）" width="480" height="480">' +
       '<span class="pz-name">' + esc(p.name) + (pi===G.sente ? '（先手）' : '（後手）') + '</span>' +
       (G.houses ? '<span class="pz-house">' + houseIconHtml(G.houses[pi]) + esc(houseLabel(G.houses[pi])) + '</span>' : '') +
       '<span class="pz-lv">AI ' + diffName() + '</span>' +
       '<span class="yogyoku">' + scoreHtmlOf(pi) + '</span></div>';
  h += zoneMainHtml(pi);
  el.innerHTML = h;
  el.classList.toggle('active', G.turn===pi && !G.over);
}
/* プレイヤー側ゾーンの描画。アバターは静止画で、名前・陽玉のテキストと
   盤面部分（#humanZoneBody）だけを更新する */
function renderHumanZone(){
  const el = document.getElementById('humanZone');
  if(!el) return;
  const p = P(0);
  const nameEl = document.getElementById('humanName');
  if(nameEl){
    const nameText = p.name + (G.sente === 0 ? '（先手）' : '（後手）');
    if(nameEl.textContent !== nameText) nameEl.textContent = nameText;
  }
  const houseEl = document.getElementById('humanHouse');
  if(houseEl && G.houses){
    const hh = houseIconHtml(G.houses[0]) + houseById(G.houses[0]).name + '家';
    if(houseEl.innerHTML !== hh) houseEl.innerHTML = hh;
  }
  const scoreEl = document.getElementById('humanScore');
  if(scoreEl){
    const scoreHtml = scoreHtmlOf(0);
    if(scoreEl.innerHTML !== scoreHtml) scoreEl.innerHTML = scoreHtml;
  }
  const bodyEl = document.getElementById('humanZoneBody');
  if(bodyEl) bodyEl.innerHTML = zoneMainHtml(0);
  el.classList.toggle('active', G.turn===0 && !G.over);
}
/* 峡谷は盤面ではボタンの枚数だけを示し、中身はポップアップで見る */
function renderCanyon(){
  const cn = document.getElementById('canyonNum');
  if(cn) cn.textContent = G.canyon.length;
  const rt = document.getElementById('tabRemain');
  if(rt && !rt.hidden) renderRemain();
}
function showCanyonModal(peekMode){
  const counts = new Map();
  G.canyon.forEach(function(t){
    const k = t.kind + ':' + t.name;
    if(!counts.has(k)) counts.set(k, { t:t, c:0 });
    counts.get(k).c++;
  });
  const allKinds = [];
  GEN_DEF.forEach(function(d){ allKinds.push({ kind:'gen', name:d.name, w:d.w, total:d.n }); });
  ON_DEF.forEach(function(d){ allKinds.push({ kind:'on', name:d.name, w:d.w, total:4 }); });
  allKinds.sort(function(a,b){ return a.w - b.w || (a.kind < b.kind ? -1 : 1); });
  let h = '<h3 class="serif">峡谷</h3>';
  h += '<p>峡谷に出た駒は <b>' + G.canyon.length + '個</b>です。数字は「峡谷にある数／その駒の全体数」です。</p>';
  h += '<div class="canyon-grid">';
  allKinds.forEach(function(k){
    const e = counts.get(k.kind + ':' + k.name);
    const c = e ? e.c : 0;
    const sample = { kind:k.kind, name:k.name, w:k.w };
    h += '<div class="canyon-cell' + (c ? '' : ' zero') + '">' + tileHtml(sample, '', { ntid:true }) +
         '<span>' + esc(k.name) + ' <span class="frac">' + c + '/' + k.total + '</span></span></div>';
  });
  h += '</div>';
  h += '<div class="btn-row"><button type="button" class="btn primary" id="canyonClose">閉じる</button></div>';
  if(peekMode){
    const pm = document.getElementById('peekModalRoot');
    pm.innerHTML = '<div class="modal-back" style="z-index:95;"><div class="modal-box">' + h + '</div></div>';
    pm.querySelector('#canyonClose').addEventListener('click', function(){ pm.innerHTML = ''; });
    return;
  }
  showModal(h);
  document.getElementById('canyonClose').addEventListener('click', closeModal);
}

/* 解放されて役になった塔の置き場（ログの下）。両プレイヤーで分け、塔ごとに並べる */
function renderReleased(){
  const el = document.getElementById('releasedList');
  if(!el) return;
  if(!G.released.length){
    el.innerHTML = '<p class="rel-empty">まだ役になった塔はありません。</p>';
    return;
  }
  let h = '';
  for(let pi=0; pi<2; pi++){
    const entries = G.released.filter(function(e){ return e.pi === pi; });
    h += '<div class="rel-player"><div class="rel-player-name">' + esc(P(pi).name) + 'の役（' + entries.length + '）</div>';
    if(!entries.length){
      h += '<p class="rel-empty">まだありません。</p>';
    } else {
      entries.forEach(function(e){
        let meta = '桜門' + (e.gi+1) + ' ・ 基礎' + e.base + '点＋高さ加点' + e.height + '点＋染め加点' + e.dye + '点';
        if(e.bonus) meta += '＋雷轟解放' + e.bonus + '点';
        h += '<div class="rel-entry"><div class="rel-head"><span class="rel-role">' + esc(e.role) + '</span>' +
             '<span class="rel-pts">' + e.pts + '点</span><span class="rel-meta">' + meta + '</span></div>' +
             '<div class="rel-tiles">' + e.tiles.map(function(t){ return tileHtml(t); }).join('') + '</div></div>';
      });
    }
    h += '</div>';
  }
  el.innerHTML = h;
}

