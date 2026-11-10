/* ================= あなたの手番の操作（現・禁忌・選のポップアップ） ================= */
/* 人間の手番：現ポップアップ →（禁忌）→ 選ポップアップ → 積・発 */
async function humanFlow(){
  if(canKai(0)){
    G.phase = 'kai'; render();
    await humanKaiPopup();
    if(G.over){ G.acting = false; render(); return; }
    G.phase = 'gen'; render();
  }
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
