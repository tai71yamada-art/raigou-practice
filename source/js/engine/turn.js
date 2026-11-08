/* ================= 手番の進行 ================= */
function startTurn(){
  G.turnNo++;
  G.used = new Set();
  G.actedSlots = new Set();
  G.genMoves = 0;
  G.phase = 'gen';
  G.isFinalTurn = !!(G.endIn !== null && G.finalTurnActive);
  UI.selHand = null; UI.pending = null; UI.drawn = [];
  const p = cur();
  // 自分の手番の開始時点で残っている封印は、この手番の終わりに解ける
  p.seals = p.seals.map(function(s){ return s ? { old:true } : null; });
  logTurn(G.turnNo + '手番目：' + p.name + 'の手番' + (G.isFinalTurn ? '（最終手番です・選はありません）' : (G.finalRound ? '（雷山は尽きました。終了の合図が出ています）' : '')));
  render();
  if(p.isAI){
    G.busy = true; render();
    aiTurn();
  } else {
    G.busy = false; G.acting = true; render();
    humanFlow();
  }
}
/* 人間の手番：現ポップアップ →（禁忌）→ 選ポップアップ → 積・発 */
async function humanFlow(){
  await humanGenPopup();
  if(G.over){ G.acting = false; render(); return; }
  if(!(G.finalRound || G.deck.length === 0)){
    G.phase = 'sen'; render();
    if(totalInner(P(0)) >= innerCap(P(0))){
      const ok = await applyTaboo(0, humanTabooChoice);
      if(!ok || G.over){ G.acting = false; render(); return; }
    }
    await humanSenPopup();
    if(G.over){ G.acting = false; render(); return; }
  }
  G.phase = 'act';
  G.acting = false;
  render();
}
/* ---- 現ポップアップ：体内の駒を選ぶ／0現。確認 はい→確定、いいえ→選び直し ---- */
function humanGenPopup(){
  return new Promise(function(resolve){
    const p = P(0);
    const freeSlots = p.hand.filter(function(x){ return !x; }).length;
    const maxMove = Math.min(GEN_MAX, freeSlots, p.body.length);
    let sel = [];
    let zeroMode = false;
    function drawConfirm(){
      let h = '<h3 class="serif">現：これでいいですか？</h3>';
      if(zeroMode || !sel.length){
        h += '<p>0現にします。体内の駒は手に移しません。</p>';
      } else {
        h += '<p>体内の次の駒を手に移します。</p><div class="pick-list">' +
             sel.map(function(t){ return tileHtml(t, '', { ntid:true }); }).join('') + '</div>';
      }
      h += '<div class="btn-row"><button type="button" class="btn primary yn" id="genYes">はい</button>' +
           '<button type="button" class="btn yn" id="genNo">いいえ<small>（選び直す）</small></button></div>';
      showModal(h);
      document.getElementById('genYes').addEventListener('click', async function(){
        closeModal();
        if(zeroMode || !sel.length){
          log('あなたは現：0現にしました（体内の駒は移しません）。', 'sys');
        } else {
          sel.forEach(function(t){
            const idx = p.body.indexOf(t);
            if(idx < 0) return;
            const slot = p.hand.indexOf(null);
            if(slot < 0) return;
            p.body.splice(idx, 1);
            p.hand[slot] = t;
            G.genMoves++;
            log('あなたは現：「' + tileLabel(t) + '」を手に移しました。');
          });
        }
        // 残った体内が詰まって並び替わる動きを見せてから次（選）へ進む
        await render();
        resolve();
      });
      document.getElementById('genNo').addEventListener('click', function(){ drawSelect(); });
      autoYes('genYes');
    }
    function drawSelect(){
      let h = '<h3 class="serif">現：体内の駒を手に移す</h3>';
      if(maxMove <= 0){
        h += '<p>手に空きがないか、体内に駒がないため、移せる駒がありません。0現にします。</p>';
        h += '<div class="btn-row"><button type="button" class="btn primary" id="genZeroOnly">0現にする</button></div>';
        showModal(h);
        document.getElementById('genZeroOnly').addEventListener('click', function(){ zeroMode = true; sel = []; drawConfirm(); });
        return;
      }
      h += '<p>手に移したい体内の駒をタップしてください（' + maxMove + '個まで）。</p>';
      h += '<div class="pick-col-wrap"><span class="pick-col-note">▲ 上（軽い）</span><div class="pick-col" id="genList"></div><span class="pick-col-note">▼ 下（重い）</span></div>';
      h += '<div class="btn-row"><button type="button" class="btn primary" id="genDecide" disabled>これで決める</button>' +
           '<button type="button" class="btn" id="genZero">0現にする</button></div>';
      showModal(h);
      const list = document.getElementById('genList');
      function drawList(){
        list.innerHTML = '';
        p.body.forEach(function(t){
          const d = document.createElement('button');
          d.type = 'button'; d.className = 'tile-btn';
          d.innerHTML = tileHtml(t, (sel.indexOf(t) >= 0 ? 'selected' : '') + ' clickable', { ntid:true });
          d.addEventListener('click', function(){
            const i = sel.indexOf(t);
            if(i >= 0) sel.splice(i, 1);
            else if(sel.length < maxMove) sel.push(t);
            zeroMode = false;
            document.getElementById('genDecide').disabled = !sel.length;
            drawList();
          });
          list.appendChild(d);
        });
        if(!p.body.length) list.innerHTML = '<span class="sub">体内に駒がありません。</span>';
      }
      drawList();
      document.getElementById('genDecide').addEventListener('click', function(){ if(sel.length){ zeroMode = false; drawConfirm(); } });
      document.getElementById('genZero').addEventListener('click', function(){ zeroMode = true; sel = []; drawConfirm(); });
    }
    drawSelect();
  });
}
/* ---- 選ポップアップ：枚数を選ぶ → 配置 → 確認 はい→確定、いいえ→配置し直し ---- */
function humanSenPopup(){
  return new Promise(function(resolve){
    const p = P(0);
    const cap = innerCap(p) - totalInner(p);
    const canDraw = Math.min(cap, G.deck.length);
    if(canDraw <= 0){ resolve(); return; }
    let h = '<h3 class="serif">選：雷山から引く</h3>';
    h += '<p>何個引きますか？（今はあと ' + canDraw + '個まで引けます。体内は3個まで、手は' + p.hand.length + '箇所まで、合計' + innerCap(p) + '個まで）</p>';
    h += '<div class="sen-pick">' +
         '<button type="button" class="sen-btn one" id="senDraw1"><span class="sb-big">一選</span><span class="sb-sub">1個引く</span></button>' +
         (canDraw >= 2 ? '<button type="button" class="sen-btn two" id="senDraw2"><span class="sb-big">二選</span><span class="sb-sub">2個引く</span></button>' : '') +
         '</div>';
    showModal(h);
    function startDraw(n){
      const drawn = drawTiles(n);
      log('あなたは選：雷山から' + drawn.length + '個引きました。');
      render();
      placement(drawn);
    }
    document.getElementById('senDraw1').addEventListener('click', function(){ startDraw(1); });
    const b2 = document.getElementById('senDraw2');
    if(b2) b2.addEventListener('click', function(){ startDraw(2); });

    function placement(drawn){
      const snapshot = { body: p.body.slice(), hand: p.hand.slice() };
      let selT = null;
      function unplaced(){
        return drawn.filter(function(t){ return p.body.indexOf(t) < 0 && p.hand.indexOf(t) < 0; });
      }
      /* 選ポップアップ内でも体内の並び替えが見えるように：配置操作の前後で
         ポップアップ内の駒（引いた駒・手・体内）の位置を控え、FLIPで滑らかに動かす。
         体内へ置いた駒が重さ順の正しい位置へ滑り、既存の体内の駒もずれて追える。
         速さは盤面の体内と同じ約0.8秒（確認できるスピード） */
      function captureSenRects(){
        const m = {};
        const un = unplaced();
        document.querySelectorAll('#modalRoot [data-sen-drawn]').forEach(function(el){
          const t = un[parseInt(el.getAttribute('data-sen-drawn'), 10)];
          if(t) m[t.id] = el.getBoundingClientRect();
        });
        document.querySelectorAll('#modalRoot [data-sen-bodytile]').forEach(function(el){
          m[el.getAttribute('data-sen-bodytile')] = el.getBoundingClientRect();
        });
        document.querySelectorAll('#modalRoot [data-sen-hand]').forEach(function(box){
          const t = p.hand[parseInt(box.getAttribute('data-sen-hand'), 10)];
          const tileEl = box.querySelector('.tile');
          if(t && tileEl) m[t.id] = tileEl.getBoundingClientRect();
        });
        return m;
      }
      function animateSenRects(prev){
        if(REDUCED_MOTION || !prev) return Promise.resolve();
        const anims = [];
        function flip(el, id){
          if(!el) return;
          const r = el.getBoundingClientRect();
          if(!r.width) return;
          const pv = prev[id];
          if(!pv || !pv.width) return;
          const dx = pv.left - r.left, dy = pv.top - r.top;
          if(Math.abs(dx) > 4 || Math.abs(dy) > 4){
            try{
              const a = el.animate([{ transform:'translate(' + dx + 'px,' + dy + 'px)' }, { transform:'none' }],
                { duration: BODY_MOVE_MS, easing:'ease-in-out' });
              if(a && a.finished) anims.push(a.finished.catch(function(){}));
            }catch(e){ /* アニメーションが使えない環境では何もしない */ }
          }
        }
        const un = unplaced();
        document.querySelectorAll('#modalRoot [data-sen-drawn]').forEach(function(el){
          const t = un[parseInt(el.getAttribute('data-sen-drawn'), 10)];
          if(t) flip(el, t.id);
        });
        document.querySelectorAll('#modalRoot [data-sen-bodytile]').forEach(function(el){
          flip(el, el.getAttribute('data-sen-bodytile'));
        });
        document.querySelectorAll('#modalRoot [data-sen-hand]').forEach(function(box){
          const t = p.hand[parseInt(box.getAttribute('data-sen-hand'), 10)];
          if(t) flip(box.querySelector('.tile') || box, t.id);
        });
        return Promise.all(anims).then(function(){});
      }
      /* 配置操作1回分：盤面の再描画（体内のFLIP）とポップアップ内のFLIPを並行して見せ、
         終わるまで入力を受け付けない */
      async function animateSenPlacement(prevRects, boardRenderPromise){
        G.reorderBusy = true;
        await Promise.all([animateSenRects(prevRects), boardRenderPromise || Promise.resolve()]);
        G.reorderBusy = false;
      }
      function drawConfirm(){
        let h2 = '<h3 class="serif">選：この配置でいいですか？</h3>';
        h2 += '<div class="confirm-summary">手：' + p.hand.filter(Boolean).map(function(t){ return '「' + tileLabel(t) + '」'; }).join('、') +
              '<br>体内：' + (p.body.length ? p.body.map(function(t){ return '「' + tileLabel(t) + '」'; }).join('、') : '（なし）') + '</div>';
        h2 += '<div class="btn-row"><button type="button" class="btn primary yn" id="senYes">はい</button>' +
              '<button type="button" class="btn yn" id="senNo">いいえ<small>（配置し直す）</small></button></div>';
        showModal(h2);
        document.getElementById('senYes').addEventListener('click', async function(){ closeModal(); await render(); resolve(); });
        document.getElementById('senNo').addEventListener('click', function(){
          p.body = snapshot.body.slice();
          p.hand = snapshot.hand.slice();
          selT = null;
          render();
          drawPlace();
        });
        autoYes('senYes');
      }
      function drawPlace(){
        const un = unplaced();
        if(!un.length){ drawConfirm(); return; }
        let h2 = '<h3 class="serif">選：引いた駒を置く</h3>';
        h2 += '<p>置きたい駒をタップして選び、次に置き場所（手の空き、または体内）をタップしてください。置いた駒をタップすると取り消せます。</p>';
        h2 += '<div class="ib-label" style="font-size:.78rem;color:var(--ink-soft);">引いた駒</div><div class="pick-list">';
        un.forEach(function(t, i){
          h2 += '<button type="button" class="tile-btn" data-sen-drawn="' + i + '">' + tileHtml(t, 'clickable anim-in' + (selT === t ? ' selected' : ''), { ntid:true }) + '</button>';
        });
        h2 += '</div>';
        h2 += '<div class="ib-label" style="font-size:.78rem;color:var(--ink-soft);">手</div><div class="slot-row">';
        for(let s = 0; s < p.hand.length; s++){
          const t = p.hand[s];
          const isDrawn = t && drawn.indexOf(t) >= 0;
          h2 += '<div class="slot-box' + (t ? ' filled' : (selT ? ' targetable' : '')) + '" role="button" data-sen-hand="' + s + '">' +
                (t ? tileHtml(t, isDrawn ? 'clickable' : '', { ntid:true }) : '<span class="sb-label">空き</span>') +
                '<span class="sb-label">' + handLabel(s) + '</span></div>';
        }
        h2 += '</div>';
        h2 += '<div class="ib-label" style="font-size:.78rem;color:var(--ink-soft);">体内</div>';
        h2 += '<div class="slot-box' + (selT && p.body.length < 3 ? ' targetable' : ' filled') + '" role="button" data-sen-body="1" style="flex-direction:row;flex-wrap:wrap;min-height:62px;">';
        if(p.body.length){
          p.body.forEach(function(t){
            const isDrawn = drawn.indexOf(t) >= 0;
            h2 += '<button type="button" class="tile-btn" data-sen-bodytile="' + t.id + '">' + tileHtml(t, isDrawn ? 'clickable anim-in' : '', { ntid:true }) + '</button>';
          });
        } else h2 += '<span class="sb-label">体内は空です</span>';
        h2 += '</div>';
        if(p.body.length >= 3) h2 += '<p class="sub">体内は3個までです。</p>';
        showModal(h2);
        document.querySelectorAll('[data-sen-drawn]').forEach(function(el){
          el.addEventListener('click', function(){
            if(G.reorderBusy) return;
            const t = un[parseInt(el.getAttribute('data-sen-drawn'), 10)];
            selT = (selT === t) ? null : t;
            drawPlace();
          });
        });
        document.querySelectorAll('[data-sen-hand]').forEach(function(el){
          el.addEventListener('click', async function(){
            if(G.reorderBusy) return;
            const s = parseInt(el.getAttribute('data-sen-hand'), 10);
            const t = p.hand[s];
            if(t && drawn.indexOf(t) >= 0){
              const prevRects = captureSenRects();
              p.hand[s] = null; selT = t;
              const rp = render();
              drawPlace();
              await animateSenPlacement(prevRects, rp);
              return;
            }
            if(!t && selT){
              const prevRects = captureSenRects();
              p.hand[s] = selT; selT = null;
              const rp = render();
              drawPlace();
              await animateSenPlacement(prevRects, rp);
            }
          });
        });
        const bodyBox = document.querySelector('[data-sen-body]');
        if(bodyBox) bodyBox.addEventListener('click', async function(e){
          if(e.target.closest('[data-sen-bodytile]')) return;
          if(G.reorderBusy) return;
          if(selT && p.body.length < 3){
            // 置く前の位置を控えてから重さ順に整列させ、ポップアップ内で滑って移動する動きを見せる
            const prevRects = captureSenRects();
            p.body.push(selT); sortBody(p); selT = null;
            const rp = render();
            drawPlace();
            await animateSenPlacement(prevRects, rp);
          }
        });
        document.querySelectorAll('[data-sen-bodytile]').forEach(function(el){
          el.addEventListener('click', async function(e){
            e.stopPropagation();
            if(G.reorderBusy) return;
            const id = parseInt(el.getAttribute('data-sen-bodytile'), 10);
            const idx = p.body.findIndex(function(t){ return t.id === id; });
            if(idx >= 0 && drawn.indexOf(p.body[idx]) >= 0){
              const prevRects = captureSenRects();
              selT = p.body.splice(idx, 1)[0];
              const rp = render();
              drawPlace();
              await animateSenPlacement(prevRects, rp);
            }
          });
        });
      }
      drawPlace();
    }
  });
}
/* 手に置いたままの駒の見張り（裏向きでも「同じ駒が置かれたまま」なのは見えている） */
function trackHandAge(){
  if(!G.handSince) G.handSince = [[null,null,null],[null,null,null]];
  for(let pi = 0; pi < 2; pi++){
    const hs = P(pi).hand;
    for(let k = 0; k < hs.length && k < 3; k++){
      const t = hs[k], rec = G.handSince[pi][k];
      if(!t) G.handSince[pi][k] = null;
      else if(!rec || rec.id !== t.id) G.handSince[pi][k] = { id:t.id, since:G.turnNo };
    }
  }
}
function handAge(pi, k){ const r = G.handSince && G.handSince[pi] && G.handSince[pi][k]; return r ? (G.turnNo - r.since) : 0; }
async function endTurn(){
  try{ trackHandAge(); }catch(_){}
  const p = cur();
  const actorPi = G.turn;
  // 自分の塔の古い封印を解く
  for(let gi=0; gi<3; gi++){
    if(p.seals[gi] && p.seals[gi].old){ p.seals[gi] = null; log(p.name + 'の桜門' + (gi+1) + 'の塔の封印が解けました。', 'sys'); }
  }
  if(G.over) return;
  // 「隠」の宣言：プレイヤーが隠ボタンを押した時も、AIが手番終了を選んだ時も、
  // 中央に「隠」のカットインを出してから次の手番へ移る
  log(p.name + 'は「隠」を宣言しました。', 'sys');
  await playHideCutIn(actorPi);
  if(G.over) return;
  if(G.endIn !== null){
    G.endIn--;
    if(G.endIn <= 0){ G.isFinalTurn = false; finishGame(null, ''); return; }
    // 最後の駒を引いた手番が終わった後は、残りの手番はすべて選なしの最終手番
    G.finalTurnActive = true;
  }
  G.turn = opp(G.turn);
  startTurn();
}
function finishGame(forceWinner, reason){
  G.over = true; G.phase = 'over'; G.busy = false;
  if(forceWinner === null || forceWinner === undefined){
    if(G.finalRevealStarted) return;
    G.finalRevealStarted = true;
    log('対戦終了。最終手番が終わりました。先手から順に、残った塔を全部解放して開示します。', 'sys');
    render();
    finishGameReveal();
    return;
  }
  render();
  showResult(forceWinner, reason);
}
/* 最終解放の開示：先手→後手の順に、塔の中身をまとめて開示し、結果を得点に反映する。「次へ」で進む */
function showFinalRevealModal(pi, stepLabel, entries, scoreAfter){
  return new Promise(function(resolve){
    const p = P(pi);
    let delta = 0;
    entries.forEach(function(e){ delta += (e.kind === 'fuon') ? -1 : e.pts; });
    const before = scoreAfter - delta;
    let h = '<div class="final-reveal">';
    h += '<span class="fr-tag">FINAL RELEASE</span><h3 class="serif">終局 — 塔の全解放</h3>';
    h += '<p class="fr-lead">雷山が尽き、最終手番が終わりました。先手から順に、残った塔を全部開示します。</p>';
    h += '<div class="fr-card' + (pi === 0 ? ' me' : ' opp') + '"><div class="fr-head"><span class="fr-bar"></span><span class="fr-name">' + esc(p.name) + '</span><span class="fr-step">' + stepLabel + '</span>' +
         '<span class="fr-score">' + before + ' → <b>' + scoreAfter + '</b></span></div>';
    for(let gi=0; gi<3; gi++){
      const e = entries.filter(function(x){ return x.gi === gi; })[0];
      h += '<div class="fr-row"><span class="fr-gate">桜門' + (gi+1) + '</span>';
      if(!e){
        h += '<span class="fr-res none">塔なし</span></div>';
        continue;
      }
      h += '<div class="fr-tiles">' + e.tiles.map(function(t, ti){ return '<span style="animation-delay:' + (gi*160 + ti*70) + 'ms;display:inline-block;">' + tileHtml(t, 'anim-in', { ntid:true }) + '</span>'; }).join('') + '</div>';
      if(e.kind === 'fuon') h += '<span class="fr-res bad">不穏の塔</span><span class="fr-pts bad">−1</span>';
      else if(e.pts > 0) h += '<span class="fr-res"><b>' + esc(e.role) + '</b><small>基礎' + e.base + '＋高さ' + e.height + '＋染め' + e.dye + '</small></span><span class="fr-pts">+' + e.pts + '</span>';
      else h += '<span class="fr-res none">役なし → 峡谷</span><span class="fr-pts none">0</span>';
      h += '</div>';
    }
    h += '</div>';
    h += '<p class="fr-note">駒は左が一番下 → 右が一番上の順に並びます</p>';
    h += '<div class="btn-row"><button type="button" class="btn primary" id="finalNextBtn">次へ</button></div></div>';
    showModal(h);
    const pb = document.querySelector('#modalRoot [data-peekbtn]');
    if(pb) pb.remove();
    document.getElementById('finalNextBtn').addEventListener('click', function(){ closeModal(); resolve(); });
  });
}
async function finishGameReveal(){
  G.finishing = true;
  const order = [G.sente, opp(G.sente)];
  const labels = ['先手', '後手'];
  for(let step=0; step<2; step++){
    const pi = order[step];
    // 解放前に中身と結果を控える（解放すると塔が空になるため）
    const entries = [];
    for(let gi=0; gi<3; gi++){
      const tiles = P(pi).gates[gi].slice();
      if(!tiles.length) continue;
      if(isFuon(tiles)) entries.push({ gi:gi, tiles:tiles, kind:'fuon', pts:0, role:'', base:0, height:0, dye:0 });
      else { const s = scoreTower(tiles); entries.push({ gi:gi, tiles:tiles, kind:'normal', pts:s.pts, role:s.role, base:s.base, height:s.height, dye:s.dye }); }
    }
    // 解放のアニメーション：残っている塔に順に落雷の演出を見せる
    for(let k=0; k<entries.length; k++){
      await fxLightning(pi, entries[k].gi);
    }
    // 実際に解放して得点を反映する（不穏のペナルティ集計も releaseTower 内で行う）
    entries.forEach(function(e){ releaseTower(pi, e.gi, 0); });
    render();
    await showFinalRevealModal(pi, labels[step], entries, P(pi).score);
  }
  G.finishing = false;
  const a = P(0), b = P(1);
  let winner, detail;
  if(a.score !== b.score){
    winner = a.score > b.score ? 0 : 1;
    detail = '陽玉は あなた ' + a.score + '点、AI ' + b.score + '点でした。';
  } else if(totalInner(a) !== totalInner(b)){
    winner = totalInner(a) < totalInner(b) ? 0 : 1;
    detail = '陽玉は同点（' + a.score + '点）。内駒の少ない方（あなた ' + totalInner(a) + '個、AI ' + totalInner(b) + '個）の勝ちです。';
  } else {
    winner = -1;
    detail = '陽玉も内駒の数も同じで、引き分けです。';
  }
  render();
  showResult(winner, detail);
}

