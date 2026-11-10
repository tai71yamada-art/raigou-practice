/* ================= 競技雷轟の画面（奥義駒の選択・月・開・奥義の操作） ================= */
/* 奥義駒の効果文（種別のバッジ＋本文＋注記） */
function ougiTextHtml(o){
  let h = '<div class="ougi-text">';
  if(o.types && o.types.length) h += '<div class="guide-badges">' + o.types.map(function(t){ return '<span class="guide-badge ougi-type">' + esc(ougiTypeLabel(t)) + '</span>'; }).join('') + '</div>';
  h += '<p class="ougi-desc">' + esc(o.text) + '</p>';
  if(o.notes && o.notes.length) h += '<div class="ougi-notes sub">' + o.notes.map(function(n){ return '<div>※' + esc(n) + '</div>'; }).join('') + '</div>';
  return h + '</div>';
}
function ougiCardHtml(o, extra){
  return '<div class="ougi-card">' + ougiTileHtml(o) + '<div class="oc-body"><b class="oc-name">奥義「' + esc(o.name) + '」</b>' + ougiTextHtml(o) + (extra || '') + '</div></div>';
}
/* 盤面の「月」を押した時：自分が持ち込んだ奥義駒と、開の決まりを見る（見るだけ） */
function openMoonInfo(){
  if(!G.started || !rulesNow().ougi) return;
  const p = P(0);
  let h = '<div class="guide-back"><div class="guide-box small" role="dialog" aria-label="月の奥義駒">';
  h += '<h3 class="serif">月の奥義駒</h3>';
  if(p.moon && p.moon.length){
    p.moon.forEach(function(t){ const o = ougiByName(t.name); if(o) h += ougiCardHtml(o); });
    h += '<div class="guide-note"><b>開：</b>自分の桜門が3つとも塔で埋まっていると、手番の最初に、どちらか1つを開けます（1対戦に1回）。開くと雷神化して、月が3か所目の手になります。開いた奥義駒は、そのまま月に置くことも、手の空いている場所や体内に移すこともできます。選ばなかった駒は除外されます。</div>';
  } else {
    h += '<p>月に奥義駒はありません。</p>';
  }
  h += '<div class="btn-row"><button type="button" class="btn primary" data-guide-close>閉じる</button></div></div></div>';
  const root = document.getElementById('guideRoot');
  root.innerHTML = h;
  root.querySelector('[data-guide-close]').addEventListener('click', closeGuide);
  root.querySelector('.guide-back').addEventListener('click', function(e){ if(e.target === e.currentTarget) closeGuide(); });
}

/* ---- スタート画面：持ち込む奥義駒を2個選ぶ（who＝'me'：あなた／'ai'：AI）。thenStart＝決めたらそのまま対戦開始 ---- */
function openOugiPicker(who, thenStart){
  const list = ougiReadyList();
  const dup = ougiAllowDup();
  let sel = (who === 'me' ? startOugi : (startAiOugi || [])).slice();
  const other = who === 'me' ? (startAiOugi || []) : startOugi;
  let focus = sel[sel.length - 1] || (list[0] && list[0].name);
  const root = document.getElementById('startSettingRoot');
  function taken(name){ return !dup && other.indexOf(name) >= 0; }
  function draw(){
    let h = '<div class="guide-back"><div class="guide-box small ougi-pick" role="dialog" aria-label="奥義駒を選ぶ">';
    h += '<h3 class="serif">' + (who === 'me' ? '奥義駒を選ぶ' : 'AIの奥義駒') + '</h3>';
    h += '<p class="sub">' + (who === 'me' ? '対戦に持ち込む奥義駒を<b>' + OUGI_BRING + '個</b>選んでください。対戦中に「開」で使えるのは、そのうち1つだけです。'
                                          : 'AIが持ち込む奥義駒です。選ばなければ、おまかせ（毎回ランダム）になります。') + '</p>';
    h += '<div class="ougi-grid">';
    list.forEach(function(o){
      const on = sel.indexOf(o.name) >= 0, tk = taken(o.name);
      h += '<button type="button" class="ougi-opt' + (on ? ' on' : '') + (focus === o.name ? ' focus' : '') + '" data-ougi-opt="' + esc(o.name) + '"' + (tk ? ' disabled' : '') + ' aria-pressed="' + on + '">' +
           ougiTileHtml(o) + (on ? '<span class="oo-check">' + (sel.indexOf(o.name) + 1) + '</span>' : '') + (tk ? '<span class="oo-taken">' + (who === 'me' ? 'AI' : 'あなた') + '</span>' : '') + '</button>';
    });
    h += '</div>';
    const fo = ougiByName(focus);
    if(fo) h += ougiCardHtml(fo);
    h += '<p class="sub ougi-pick-note">今選べるのは' + list.length + '種類です。ほかの奥義駒は順に追加していきます。' +
         (dup ? '<br>奥義駒は本来、相手と重ならない決まりですが、選べる駒が' + (OUGI_BRING * 2) + '種類そろうまでは同じ駒になることがあります。' : '<br>相手が選んでいる奥義駒は選べません。') + '</p>';
    h += '<div class="btn-row"><button type="button" class="btn" id="opRandom">ランダム</button>' +
         (who === 'ai' ? '<button type="button" class="btn" id="opAuto">おまかせに戻す</button>' : '') +
         '<button type="button" class="btn primary" id="opOk"' + (sel.length === OUGI_BRING ? '' : ' disabled') + '>' + (thenStart ? 'これで対戦開始' : 'これで決める') + '</button>' +
         '<button type="button" class="btn" id="opClose">閉じる</button></div>';
    h += '</div></div>';
    root.innerHTML = h;
    root.querySelectorAll('[data-ougi-opt]').forEach(function(b){
      b.addEventListener('click', function(){
        const n = b.getAttribute('data-ougi-opt');
        focus = n;
        const i = sel.indexOf(n);
        if(i >= 0) sel.splice(i, 1);
        else { if(sel.length >= OUGI_BRING) sel.shift(); sel.push(n); }
        draw();
      });
    });
    document.getElementById('opRandom').addEventListener('click', function(){
      sel = pickRandomOugi(OUGI_BRING, other); focus = sel[0] || focus; draw();
    });
    const auto = document.getElementById('opAuto');
    if(auto) auto.addEventListener('click', function(){ startAiOugi = null; syncStartButtons(); closeStartSetting(); });
    document.getElementById('opOk').addEventListener('click', function(){
      if(sel.length !== OUGI_BRING) return;
      if(who === 'me'){ startOugi = sel.slice(); SETTINGS.ougi = startOugi.slice(); saveSettings(); }
      else startAiOugi = sel.slice();
      syncStartButtons(); closeStartSetting();
      if(thenStart) startBattle();
    });
    document.getElementById('opClose').addEventListener('click', closeStartSetting);
    root.querySelector('.guide-back').addEventListener('click', function(e){ if(e.target === e.currentTarget) closeStartSetting(); });
  }
  draw();
}

function kaiDestText(d){ return d.where === 'body' ? '体内' : (d.where === 'moon' ? '月（3か所目の手）' : handLabel(d.idx)); }
/* ---- 開：手番の最初に、月の奥義駒を開くかどうかを選ぶ ---- */
function humanKaiPopup(){
  return new Promise(function(resolve){
    const p = P(0);
    function askWhich(){
      let h = '<h3 class="serif">開：奥義駒を開きますか？</h3>';
      h += '<p>自分の桜門が3つとも塔で埋まっているので、月の奥義駒を<b>1つだけ</b>開けます（1対戦に1回）。開くと<b>雷神化</b>して、月が3か所目の手になり、内駒は6個まで持てます。選ばなかった奥義駒は除外されます。</p>';
      p.moon.forEach(function(t, i){
        const o = ougiByName(t.name);
        h += ougiCardHtml(o, '<div class="oc-act"><button type="button" class="btn primary" data-kai="' + i + '">「' + esc(t.name) + '」を開く</button></div>');
      });
      h += '<div class="btn-row"><button type="button" class="btn" id="kaiSkip">今は開かない</button></div>';
      showModal(h);
      document.querySelectorAll('[data-kai]').forEach(function(b){
        b.addEventListener('click', function(){ askWhere(parseInt(b.getAttribute('data-kai'), 10)); });
      });
      document.getElementById('kaiSkip').addEventListener('click', function(){
        closeModal();
        log('あなたは開を見送りました。', 'sys');
        resolve(false);
      });
    }
    function askWhere(idx){
      const t = p.moon[idx];
      const dests = kaiDests(p);
      let h = '<h3 class="serif">開：「' + esc(t.name) + '」をどこに置きますか？</h3>';
      h += '<div class="modal-center">' + tileHtml(t, 'big', { ntid:true }) + '</div>';
      h += '<p>開くと月が3か所目の手になるので、そのまま月に置くこともできます。手（月を含む）に置くと、この手番から発したり積んだりできます。体内に置いた駒は、あとで「現」で手に移します。</p>';
      h += '<div class="act-list">';
      dests.forEach(function(d, i){
        h += '<button type="button" class="btn' + (i === 0 ? ' primary' : '') + '" data-kai-dest="' + i + '">' + kaiDestText(d) + 'に置く</button>';
      });
      h += '</div><div class="btn-row"><button type="button" class="btn" id="kaiBack">選び直す</button></div>';
      showModal(h);
      document.querySelectorAll('[data-kai-dest]').forEach(function(b){
        b.addEventListener('click', async function(){
          const d = dests[parseInt(b.getAttribute('data-kai-dest'), 10)];
          const ok = await confirmYesNo('開の確認', '奥義駒「' + esc(t.name) + '」を' + kaiDestText(d) + 'に置いて、雷神化します。もう一方の奥義駒は除外されます。');
          if(!ok){ askWhich(); return; }
          await doKai(0, idx, d);
          resolve(true);
        });
      });
      document.getElementById('kaiBack').addEventListener('click', askWhich);
    }
    askWhich();
  });
}

/* ---- 奥義を発する（対象を選ぶ → 確認 → 解決） ---- */
async function runOugiFlow(slot){
  const t = P(0).hand[slot];
  if(!isOugi(t) || ougiUsable(0, slot)) return;
  if(t.name === '覇'){
    while(true){
      const end = await pickHaEnd();
      if(!end) return;
      const ok = await confirmYesNo('奥義「覇」の確認', '全ての塔（あなたの塔も含む。封印中の塔は除く）の' + (end === 'top' ? '<b>一番上</b>' : '<b>一番下</b>') + 'の駒を捨て駒にします。');
      if(!ok) continue;
      await primHa(0, slot, end);
      return;
    }
  }
  if(t.name === '天'){
    while(true){
      const tgt = await pickTowerModal('奥義「天」：自分の塔を選ぶ', '選んだ塔の<b>一番上の駒</b>を、峡谷か誰かの内駒の1つと入れ替えます。', tenTowers(0).map(function(gi){ return { pi:0, gi:gi }; }));
      if(!tgt) return;
      const loc = await pickTenSourceModal(slot, tgt.gi);
      if(!loc) continue;
      const tw = P(0).gates[tgt.gi], top = tw[tw.length - 1];
      const ok = await confirmYesNo('奥義「天」の確認', '桜門' + (tgt.gi+1) + 'の塔の一番上の「' + esc(tileLabel(top)) + '」と、' + esc(locDescForShun(loc)) + 'を入れ替えます。');
      if(!ok) continue;
      await primTen(0, slot, tgt.gi, loc);
      return;
    }
  }
  if(t.name === '啓'){
    while(true){
      const tgt = await pickTowerModal('奥義「啓」：分ける塔を選ぶ', '2段以上の塔と、空いている桜門を両方持っている人の塔を選べます。分けた片方は、その人の空いている桜門へ移ります。', keiTargets());
      if(!tgt) return;
      const sp = await pickKeiSplitModal(tgt.pi, tgt.gi);
      if(!sp) continue;
      const owner = P(tgt.pi), n = owner.gates[tgt.gi].length;
      const ok = await confirmYesNo('奥義「啓」の確認', esc(owner.name) + 'の桜門' + (tgt.gi+1) + 'の塔（' + n + '段）を、下' + sp.k + '段と上' + (n - sp.k) + '段に分けて、<b>' + (sp.part === 'top' ? '上' : '下') + 'の部分</b>を桜門' + (sp.dest+1) + 'へ移します。');
      if(!ok) continue;
      await primKei(0, slot, tgt.pi, tgt.gi, sp.k, sp.part, sp.dest);
      return;
    }
  }
  if(t.name === '和'){
    while(true){
      const tgt = await pickTowerModal('奥義「和」：公開する塔を選ぶ', '3段以上の自分の塔を1つ選びます。塔の駒を全て公開し、重さの合計が<b>11なら陽玉+2点、33なら+4点、それ以外は-1点</b>です。公開した駒は峡谷へ置きます。', waTowers(0).map(function(gi){ return { pi:0, gi:gi }; }));
      if(!tgt) return;
      const tw = P(0).gates[tgt.gi], r = waResult(tw);
      const ok = await confirmYesNo('奥義「和」の確認', '<div class="wa-row">' + tw.map(function(x){ return tileHtml(x, '', { ntid:true }); }).join('') + '</div>' +
        '桜門' + (tgt.gi+1) + 'の塔（' + tw.length + '段）を公開します。重さの合計は<b>' + r.sum + '</b>なので、陽玉は<b>' + (r.delta > 0 ? '+' + r.delta : '-1') + '点</b>になります。');
      if(!ok) continue;
      await primWa(0, slot, tgt.gi);
      return;
    }
  }
  if(t.name === '禅'){
    const ok = await confirmYesNo('奥義「禅」の確認', 'あなたとAIが、それぞれ体内の<b>最も重い駒</b>を1つ選び、相手の体内へ同時に移します。移した駒は、両方に公開されます。適用したあと、もう1度だけ続けて適用するかを選べます。');
    if(!ok) return;
    await primZen(0, slot, function(){
      return confirmYesNoPlain('奥義「禅」', 'もう1度、体内の最も重い駒を移し合いますか？', 'もう1度移す', 'ここでやめる');
    });
    return;
  }
  if(t.name === '幻'){
    const ok = await confirmYesNo('奥義「幻」の確認', '除外された駒を確認し、その駒をあなたの体内か手の空いている場所に置きます（奥義駒は選べません）。発すると、置き場所を選ぶ前に駒が見えるので、途中でやめることはできません。');
    if(!ok) return;
    await primGen(0, slot, chooseGenDest);
    return;
  }
  if(t.name === '赫'){
    const ok = await confirmYesNo('奥義「赫」の確認', 'あなたもAIも、<b>次の手番だけ「現」が0個</b>になります（体内の駒を手に移せません）。この手番のあなたの「現」は、もう終わっています。');
    if(!ok) return;
    await primKaku(0, slot);
    return;
  }
  if(t.name === '滅'){
    const ok = await confirmYesNo('奥義「滅」の確認', '滅を頭に置きます（<b>持続奥義</b>）。これから、あなたもAIも、効果を適用した言霊は峡谷へ行かず滅の横に蓄積します（奥義駒は蓄積しません。雷停に使った駒は、封印が解けた時に数えます）。<br>蓄積の重さが<b>10以上</b>になった手番の最後に、<b>あなたがその手番の人の塔を1つ選び</b>、全て峡谷へ置きます。そのあと滅と蓄積した駒を峡谷へ置き、効果が終わります。');
    if(!ok) return;
    await primMetsu(0, slot);
    return;
  }
  if(t.name === '封'){
    const ok = await confirmYesNo('奥義「封」の確認', 'AIは、<b>次の手番に「選」を行えなくなります</b>（雷山から駒を引けません）。');
    if(!ok) return;
    await primFuu(0, slot);
    return;
  }
  if(t.name === '神'){
    while(true){
      const tgt = await pickTowerModal('奥義「神」：公開する塔を選ぶ', 'AIの塔を1つ選び、役名を宣言して公開します（封印中の塔は選べません）。<b>的中なら塔を奪ってあなたの完成役</b>にします（基礎点のみ）。<b>外れならAIがその塔を解放します</b>。<b>一発奥義</b>なので、この手番はほかの駒を積・発できなくなります。', kamiTargets(0));
      if(!tgt) return;
      const role = await pickKamiRole(tgt.gi);
      if(!role) continue;
      await primKami(0, slot, tgt.gi, role);
      return;
    }
  }
  if(t.name === '鳳'){
    const ok = await confirmYesNo('奥義「鳳」の確認', 'あなたとAIの<b>内駒（体内と手）を全て入れ替えます</b>。入れ替えた駒は両方に分かります。そのあと、受け取った駒を体内か手の好きな場所に置き直します（AIも同じように置き直します）。');
    if(!ok) return;
    await primHo(0, slot, hoArrangeFor);
    return;
  }
  if(t.name === '焔'){
    while(true){
      const tgt = await pickTowerModal('奥義「焔」：炎上させる桜門を選ぶ', '塔がある桜門を1つ選びます（自分の桜門も選べます。封印中の塔は選べません）。<b>手番が替わるたびに</b>、その塔の一番下の駒が峡谷へ置かれます。塔が無くなると焔も峡谷へ置き、炎上が終わります。<b>一発奥義</b>なので、この手番はほかの駒を積・発できなくなります。', homuraTargets());
      if(!tgt) return;
      const ok = await confirmYesNo('奥義「焔」の確認', (tgt.pi === 0 ? 'あなた' : 'AI') + 'の桜門' + (tgt.gi+1) + '（' + P(tgt.pi).gates[tgt.gi].length + '段）を炎上させます。');
      if(!ok) continue;
      await primHomura(0, slot, tgt.pi, tgt.gi);
      return;
    }
  }
  if(t.name === '姫'){
    const idx = await pickHimeModal();
    if(idx === null) return;
    await primHime(0, slot, idx);
    return;
  }
  if(t.name === '涼'){
    const ok = await confirmYesNo('奥義「涼」の確認', 'あなたとAIの<b>内駒（体内と手）を全て表向き</b>にします。表になった駒は、積むまで表のままです。');
    if(!ok) return;
    await primRyou(0, slot);
    return;
  }
  if(t.name === '風'){
    const ok = await confirmYesNo('奥義「風」の確認', '雷山から3個引き、1個を選んで' + handLabel(slot) + 'に置きます。残りの2個は<b>表向きで雷山の上に戻し</b>、そのまま雷山として使います。引いた駒が見えるので、途中でやめることはできません。');
    if(!ok) return;
    await primKaze(0, slot, chooseKazeTile);
    return;
  }
  if(t.name === '凛'){
    while(true){
      const tgt = await pickTowerModal('奥義「凛」：公開する塔を選ぶ', '役が完成している自分の塔を1つ選びます。雷山から1個引き、<b>音無なら塔を解放して役の点数+2点</b>、<b>言霊なら役の点数は0点</b>で、塔の駒は全て峡谷へ置きます。', rinTowers(0).map(function(gi){ return { pi:0, gi:gi }; }));
      if(!tgt) return;
      const tw = P(0).gates[tgt.gi], s = scoreTower(tw), top = deckOpenTop();
      const ok = await confirmYesNo('奥義「凛」の確認', '桜門' + (tgt.gi+1) + 'の塔（' + esc(s.role) + '・' + s.pts + '点）を公開して、雷山から1個引きます。音無なら' + (s.pts + 2) + '点、言霊なら0点です。' +
        (top.length ? '<br>雷山の一番上は表向きの「' + esc(tileLabel(top[0])) + '」です。' : ''));
      if(!ok) continue;
      await primRin(0, slot, tgt.gi);
      return;
    }
  }
  if(t.name === '鳴'){
    const kind = await pickMeiEffect(slot);
    if(!kind) return;
    const before = P(0).hand[slot];
    await runEffectFlow(kind, slot);
    if(P(0).hand[slot] !== before){ G.used.add('鳴'); log('（この効果は、奥義「鳴」で適用しました。）', 'sys'); }
    return;
  }
  if(t.name === '楼'){
    while(true){
      const tgt = await pickTowerModal('奥義「楼」：積み直す塔を選ぶ', '2段以上の自分の塔を1つ選び、好きな順番に積み直します。<b>一発奥義</b>なので、この手番はほかの駒を積・発できなくなります。', rouTowers(0).map(function(gi){ return { pi:0, gi:gi }; }));
      if(!tgt) return;
      const order = await pickRouOrderModal(tgt.gi);
      if(!order) continue;
      await primRou(0, slot, tgt.gi, order);
      return;
    }
  }
}
/* はい／いいえだけの確認（「選び直す」の添え書きなし・確認の省略の対象外） */
function confirmYesNoPlain(title, text, yesLabel, noLabel){
  return new Promise(function(resolve){
    let h = '<h3 class="serif">' + esc(title) + '</h3><p>' + text + '</p>';
    h += '<div class="btn-row"><button type="button" class="btn primary" id="cpYes">' + esc(yesLabel) + '</button><button type="button" class="btn" id="cpNo">' + esc(noLabel) + '</button></div>';
    showModal(h);
    document.getElementById('cpYes').addEventListener('click', function(){ closeModal(); resolve(true); });
    document.getElementById('cpNo').addEventListener('click', function(){ closeModal(); resolve(false); });
  });
}
/* 和：公開した塔と結果を見せる（あなた・AIどちらが発した時も） */
function showWaReveal(actor, gi, tiles, sum, delta){
  return new Promise(function(resolve){
    const p = P(actor);
    let h = '<h3 class="serif">奥義「和」：' + esc(p.name) + 'の桜門' + (gi+1) + 'の塔</h3>';
    h += '<div class="modal-center"><div class="big-gate"><div class="big-stack">';
    for(let i = tiles.length - 1; i >= 0; i--) h += tileHtml(tiles[i], '', { ntid:true });
    h += '</div></div></div>';
    h += '<p class="wa-result">重さの合計 <b>' + sum + '</b> → ' + esc(p.name) + 'の陽玉 <b class="' + (delta > 0 ? 'wa-plus' : 'wa-minus') + '">' + (delta > 0 ? '+' + delta : '-1') + '点</b></p>';
    h += '<p class="sub">公開した駒は峡谷へ置きます。</p>';
    h += '<div class="btn-row"><button type="button" class="btn primary" id="waOk">閉じる</button></div>';
    showModal(h);
    document.getElementById('waOk').addEventListener('click', function(){ closeModal(); resolve(); });
  });
}
/* 禅：最も重い駒が何種類かある時、移す駒をあなたが選ぶ。choices＝あなたの体内の番号 */
function chooseZenTile(choices){
  return new Promise(function(resolve){
    let h = '<h3 class="serif">奥義「禅」：移す駒を選ぶ</h3>';
    h += '<p>あなたの体内で最も重い駒が何種類かあります。AIの体内へ移す駒を1つ選んでください。</p><div class="pick-list">';
    choices.forEach(function(i){ h += '<button type="button" class="tile-btn" data-zen-i="' + i + '">' + tileHtml(P(0).body[i], 'clickable', { ntid:true }) + '</button>'; });
    h += '</div>';
    showModal(h);
    const box = document.querySelector('#modalRoot [data-peekbtn]');
    if(box) box.remove();   // 選ぶまで閉じられない処理なので、盤面を見るボタンは出さない
    document.querySelectorAll('[data-zen-i]').forEach(function(b){
      b.addEventListener('click', function(){ closeModal(); resolve(parseInt(b.getAttribute('data-zen-i'), 10)); });
    });
  });
}
/* 楼：下から順に駒を押して、新しい並びを作る */
function pickRouOrderModal(gi){
  return new Promise(function(resolve){
    const tw = P(0).gates[gi], n = tw.length;
    let order = [];
    function draw(){
      let h = '<h3 class="serif">奥義「楼」：積み直す順番を決める</h3>';
      h += '<p>桜門' + (gi+1) + 'の塔（' + n + '段）です。<b>下に置く駒から順に</b>押してください。</p>';
      h += '<div class="gate-group-label">今の塔の駒</div><div class="pick-list">';
      tw.forEach(function(x, i){
        const used = order.indexOf(i) >= 0;
        h += '<button type="button" class="tile-btn' + (used ? ' rou-used' : '') + '" data-rou-i="' + i + '"' + (used ? ' disabled' : '') + '>' + tileHtml(x, used ? '' : 'clickable', { ntid:true }) + '</button>';
      });
      h += '</div>';
      h += '<div class="gate-group-label">新しい塔（' + order.length + '／' + n + '段）</div><div class="modal-center"><div class="big-gate"><div class="big-stack">';
      if(!order.length) h += '<div class="gate-empty">（まだ空）</div>';
      for(let k = order.length - 1; k >= 0; k--) h += tileHtml(tw[order[k]], '', { ntid:true });
      h += '</div></div></div>';
      const done = order.length === n;
      if(done && isFuon(order.map(function(i){ return tw[i]; }))) h += '<p class="warn">この並びは不穏の塔になります。</p>';
      h += '<div class="btn-row"><button type="button" class="btn primary" id="rouOk"' + (done ? '' : ' disabled') + '>この順番で積み直す</button>' +
           '<button type="button" class="btn" id="rouReset"' + (order.length ? '' : ' disabled') + '>最初から</button>' +
           '<button type="button" class="btn" id="rouCancel">塔を選び直す</button></div>';
      showModal(h);
      document.querySelectorAll('[data-rou-i]').forEach(function(b){
        b.addEventListener('click', function(){ const i = parseInt(b.getAttribute('data-rou-i'), 10); if(order.indexOf(i) < 0){ order.push(i); draw(); } });
      });
      document.getElementById('rouReset').addEventListener('click', function(){ order = []; draw(); });
      document.getElementById('rouCancel').addEventListener('click', function(){ closeModal(); resolve(null); });
      document.getElementById('rouOk').addEventListener('click', function(){ if(order.length === n){ closeModal(); resolve(order.slice()); } });
    }
    draw();
  });
}
function pickHaEnd(){
  return new Promise(function(resolve){
    const tgs = haTargets();
    const mine = tgs.filter(function(x){ return x.pi === 0; }).length, theirs = tgs.length - mine;
    let h = '<h3 class="serif">奥義「覇」：どちらの端を捨てますか</h3>';
    h += '<p>全ての塔の一番上か、一番下の駒を捨て駒にします。どちらか一方を選ぶと、<b>全部の塔</b>に同じように効果があります（あなたの塔 ' + mine + '本・AIの塔 ' + theirs + '本。封印中の塔は除く）。</p>';
    h += '<div class="btn-row"><button type="button" class="btn primary" id="haTop">一番上を捨てる</button><button type="button" class="btn primary" id="haBot">一番下を捨てる</button>' +
         '<button type="button" class="btn" id="haCancel">やめる</button></div>';
    showModal(h);
    document.getElementById('haTop').addEventListener('click', function(){ closeModal(); resolve('top'); });
    document.getElementById('haBot').addEventListener('click', function(){ closeModal(); resolve('bottom'); });
    document.getElementById('haCancel').addEventListener('click', function(){ closeModal(); resolve(null); });
  });
}
/* 天：入れ替える相手の駒を1つ選ぶ（峡谷・全員の内駒）。瞬と同じ並べ方 */
function pickTenSourceModal(handSlot, gi){
  return new Promise(function(resolve){
    const tw = P(0).gates[gi], top = tw[tw.length - 1];
    const items = {};
    let h = '<h3 class="serif">奥義「天」：入れ替える駒を選ぶ</h3>';
    h += '<p>桜門' + (gi+1) + 'の塔の一番上の「' + esc(tileLabel(top)) + '」と入れ替える駒を、1つ選んでください。峡谷の駒はどれでも選べます。</p>';
    function wrap(key, inner){ return '<button type="button" class="tile-btn" data-ten-item="' + key + '">' + inner + '</button>'; }
    function section(title, build){ h += '<div class="gate-group-label">' + title + '</div><div class="pick-list">' + (build || '<span class="sub">（なし）</span>') + '</div>'; }
    function sectionBody(title, build){
      if(!build){ h += '<div class="gate-group-label">' + title + '（縦：下が重い）</div><span class="sub">（なし）</span>'; return; }
      h += '<div class="gate-group-label">' + title + '（縦：下が重い）</div><div class="pick-col-wrap"><span class="pick-col-note">▲ 上（軽い）</span><div class="pick-col">' + build + '</div><span class="pick-col-note">▼ 下（重い）</span></div>';
    }
    section('峡谷', G.canyon.map(function(t, idx){ const key = 'c:' + idx; items[key] = { zone:'canyon', idx:idx }; return wrap(key, tileHtml(t, 'clickable', { ntid:true })); }).join(''));
    sectionBody('あなたの体内', P(0).body.map(function(t, idx){ const key = 'b0:' + idx; items[key] = { zone:'body', pi:0, idx:idx }; return wrap(key, tileHtml(t, 'clickable', { ntid:true })); }).join(''));
    section('あなたの手', P(0).hand.map(function(t, s){ if(!t || s === handSlot) return ''; const key = 'h0:' + s; items[key] = { zone:'hand', pi:0, idx:s }; return wrap(key, tileHtml(t, 'clickable', { ntid:true })); }).join(''));
    sectionBody('相手の体内', P(1).body.map(function(t, idx){ const key = 'b1:' + idx; items[key] = { zone:'body', pi:1, idx:idx }; return wrap(key, oppInnerHtml(t, 'clickable', { ntid:true })); }).join(''));
    section('相手の手', P(1).hand.map(function(t, s){ if(!t) return ''; const key = 'h1:' + s; items[key] = { zone:'hand', pi:1, idx:s }; return wrap(key, oppInnerHtml(t, 'clickable', { ntid:true })); }).join(''));
    h += '<div class="btn-row"><button type="button" class="btn" id="tenCancel">塔を選び直す</button></div>';
    showModal(h);
    document.getElementById('tenCancel').addEventListener('click', function(){ closeModal(); resolve(null); });
    document.querySelectorAll('[data-ten-item]').forEach(function(el){
      el.addEventListener('click', function(){ closeModal(); resolve(items[el.getAttribute('data-ten-item')]); });
    });
  });
}
/* 啓：どこで分けるか・どちらを移すか・（空きが2つあれば）どの桜門へ移すかを選ぶ */
function pickKeiSplitModal(pi, gi){
  return new Promise(function(resolve){
    const owner = P(pi), tower = owner.gates[gi], n = tower.length;
    const dests = emptyGates(pi);
    let k = null, part = null, dest = dests.length === 1 ? dests[0] : null;
    function draw(){
      let h = '<h3 class="serif">奥義「啓」：塔を分ける</h3>';
      h += '<p>' + esc(owner.name) + 'の桜門' + (gi+1) + 'の塔（' + n + '段）です。' + (k === null ? '<b>分けたい所</b>の線を押してください。' : '下' + k + '段と上' + (n - k) + '段に分けます。空いた桜門へ<b>移す側</b>を選んでください。') + '</p>';
      h += '<div class="modal-center"><div class="big-gate kei-gate"><div class="bg-label">桜門' + (gi+1) + '</div><div class="big-stack">';
      for(let i = n - 1; i >= 0; i--){
        const cls = k === null ? '' : (i >= k ? 'kei-up' : 'kei-low') + ((part === 'top' && i >= k) || (part === 'bottom' && i < k) ? ' kei-move' : '');
        h += (pi === 0 || isRevealedTile(tower[i])) ? tileHtml(tower[i], cls, { ntid:true }) : '<div class="tile back ' + cls + '"></div>';
        if(i >= 1) h += '<button type="button" class="kei-cut' + (k === i ? ' on' : '') + '" data-kei-k="' + i + '" aria-label="下' + i + '段と上' + (n - i) + '段に分ける"><span>ここで分ける</span></button>';
      }
      h += '</div></div></div>';
      if(k !== null){
        h += '<div class="btn-row"><button type="button" class="btn' + (part === 'top' ? ' primary' : '') + '" data-kei-part="top">上の' + (n - k) + '段を移す</button>' +
             '<button type="button" class="btn' + (part === 'bottom' ? ' primary' : '') + '" data-kei-part="bottom">下の' + k + '段を移す</button></div>';
        if(dests.length > 1){
          h += '<p class="sub">移す先の桜門</p><div class="btn-row">' + dests.map(function(d){ return '<button type="button" class="btn' + (dest === d ? ' primary' : '') + '" data-kei-dest="' + d + '">桜門' + (d+1) + '</button>'; }).join('') + '</div>';
        }
      }
      h += '<div class="btn-row"><button type="button" class="btn primary" id="keiOk"' + (k !== null && part && dest !== null ? '' : ' disabled') + '>これで決める</button>' +
           '<button type="button" class="btn" id="keiCancel">塔を選び直す</button></div>';
      showModal(h);
      document.querySelectorAll('[data-kei-k]').forEach(function(b){ b.addEventListener('click', function(){ k = parseInt(b.getAttribute('data-kei-k'), 10); draw(); }); });
      document.querySelectorAll('[data-kei-part]').forEach(function(b){ b.addEventListener('click', function(){ part = b.getAttribute('data-kei-part'); draw(); }); });
      document.querySelectorAll('[data-kei-dest]').forEach(function(b){ b.addEventListener('click', function(){ dest = parseInt(b.getAttribute('data-kei-dest'), 10); draw(); }); });
      document.getElementById('keiCancel').addEventListener('click', function(){ closeModal(); resolve(null); });
      document.getElementById('keiOk').addEventListener('click', function(){
        if(k === null || !part || dest === null) return;
        closeModal(); resolve({ k:k, part:part, dest:dest });
      });
    }
    draw();
  });
}

/* 幻：除外された駒を見せて、置き場所を選ぶ */
function chooseGenDest(x, dests){
  return new Promise(function(resolve){
    let h = '<h3 class="serif">奥義「幻」：除外された駒</h3>';
    h += '<div class="modal-center">' + tileHtml(x, 'big', { ntid:true }) + '</div>';
    h += '<p>除外されていた駒は「' + esc(tileLabel(x)) + '」（重さ' + x.w + '）でした。置く場所を選んでください。</p><div class="btn-row">';
    dests.forEach(function(d, i){ h += '<button type="button" class="btn' + (i === 0 ? ' primary' : '') + '" data-gen-d="' + i + '">' + (d.where === 'body' ? '体内に置く' : handLabel(d.idx) + 'に置く') + '</button>'; });
    h += '</div>';
    showModal(h);
    const pk = document.querySelector('#modalRoot [data-peekbtn]'); if(pk) pk.remove();
    document.querySelectorAll('[data-gen-d]').forEach(function(b){
      b.addEventListener('click', function(){ closeModal(); resolve(dests[parseInt(b.getAttribute('data-gen-d'), 10)]); });
    });
  });
}
/* 鳴：どの言霊と同じ効果にするかを選ぶ。戻り値は runEffectFlow の種類（やめたら null） */
function pickMeiEffect(slot){
  return new Promise(function(resolve){
    const p = P(0);
    const usedHou = G.used.has('雷放'), usedTei = G.used.has('雷停');
    const raiOk = raiTargets().length > 0;
    const zanOk = [0,1].some(function(pi){ return P(pi).gates.some(function(gw, gi){ return gw.length > 0 && !P(pi).seals[gi]; }); });
    const items = [];
    const add = function(kind, label, why){ items.push({ kind:kind, label:label, why:why || '' }); };
    add('raiHou', '雷：雷放（一番高い塔を解放）', usedHou ? 'この手番使用済み' : (raiOk ? '' : '3段以上の塔がありません'));
    add('raiTei', '雷：雷停（一番高い塔を封印）', usedTei ? 'この手番使用済み' : (raiOk ? '' : '3段以上の塔がありません'));
    const goSlot = goPartnerSlot(p, slot);
    if(goSlot >= 0 && raigouGates(p).length && canActPair(p, slot, goSlot)){
      const nm = p.hand[goSlot].name;
      add('raigou', '雷：手の「' + nm + '」と合わせて雷轟解放（自分の塔を解放 +2点）', usedHou ? 'この手番使用済み' : '');
      add('raigouTei', '雷：手の「' + nm + '」と合わせて雷停（自分の塔を封印）', usedTei ? 'この手番使用済み' : '');
    }
    const raiSlot = raiPartnerSlot(p, slot);
    if(raiSlot >= 0 && goPartnerSlot(p, raiSlot) === slot && raigouGates(p).length && canActPair(p, slot, raiSlot)){
      const nm = p.hand[raiSlot].name;
      add('raigouFromKiriGo', '轟：手の「' + nm + '」と合わせて雷轟解放（自分の塔を解放 +2点）', usedHou ? 'この手番使用済み' : '');
      add('raigouTeiFromKiriGo', '轟：手の「' + nm + '」と合わせて雷停（自分の塔を封印）', usedTei ? 'この手番使用済み' : '');
    }
    add('hebi', '蛇：内駒を1個奪う', G.used.has('蛇') ? 'この手番使用済み' : '');
    add('zan', '斬：塔の一番上か一番下の駒を取る', G.used.has('斬') ? 'この手番使用済み' : (zanOk ? '' : '対象になる塔がありません'));
    add('shun', '瞬：駒を2個入れ替える', G.used.has('瞬') ? 'この手番使用済み' : '');
    add('jo', '浄：内駒を捨てて引き直す', G.used.has('浄') ? 'この手番使用済み' : '');
    let h = '<h3 class="serif">奥義「鳴」：同じ効果にする言霊を選ぶ</h3>';
    h += '<div class="act-list">';
    items.forEach(function(it, i){ h += '<button type="button" class="btn act-btn" data-mei="' + i + '"' + (it.why ? ' disabled' : '') + '>' + esc(it.label) + (it.why ? '<small>（' + esc(it.why) + '）</small>' : '') + '</button>'; });
    h += '</div>';
    h += '<p class="sub">「霧」と同じ効果は、上のどれかを選ぶのと同じです。「陣」「轟」と同じ効果は、相手の雷・蛇・斬を受けた時に、手にある鳴を使って適用できます。</p>';
    h += '<div class="btn-row"><button type="button" class="btn" id="meiCancel">やめる</button></div>';
    showModal(h);
    document.getElementById('meiCancel').addEventListener('click', function(){ closeModal(); resolve(null); });
    document.querySelectorAll('[data-mei]').forEach(function(b){
      b.addEventListener('click', function(){ closeModal(); resolve(items[parseInt(b.getAttribute('data-mei'), 10)].kind); });
    });
  });
}

/* 風：引いた3個から、手に置く1個を選ぶ */
function chooseKazeTile(tiles){
  return new Promise(function(resolve){
    let h = '<h3 class="serif">奥義「風」：手に置く駒を選ぶ</h3>';
    h += '<p>雷山から引いた3個です。手に置く1個を選んでください。残りの2個は表向きで雷山の上に戻します。</p><div class="pick-list">';
    tiles.forEach(function(x, i){ h += '<button type="button" class="tile-btn" data-kaze="' + i + '">' + tileHtml(x, 'clickable', { ntid:true }) + '</button>'; });
    h += '</div>';
    showModal(h);
    const pk = document.querySelector('#modalRoot [data-peekbtn]'); if(pk) pk.remove();
    document.querySelectorAll('[data-kaze]').forEach(function(b){
      b.addEventListener('click', function(){ closeModal(); resolve(parseInt(b.getAttribute('data-kaze'), 10)); });
    });
  });
}
/* 凛：公開した塔と引いた駒、結果を見せる（あなた・AIどちらが発した時も） */
function showRinReveal(actor, gi, tiles, s, x, win){
  return new Promise(function(resolve){
    const p = P(actor);
    let h = '<h3 class="serif">奥義「凛」：' + esc(p.name) + 'の桜門' + (gi+1) + 'の塔</h3>';
    h += '<div class="rin-draw"><div class="big-gate"><div class="big-stack">';
    for(let i = tiles.length - 1; i >= 0; i--) h += tileHtml(tiles[i], '', { ntid:true });
    h += '</div><div class="bg-info">' + esc(s.role) + '・' + s.pts + '点</div></div>';
    h += '<div><p class="sub">雷山から引いた駒</p>' + tileHtml(x, 'big', { ntid:true }) + '</div></div>';
    h += '<p class="wa-result">' + (win ? '音無なので解放：<b class="wa-plus">' + (s.pts + 2) + '点</b>（役' + s.pts + '点＋2点）' : '言霊なので<b class="wa-minus">0点</b>。塔の駒は全て峡谷へ置きます。') + '</p>';
    h += '<div class="btn-row"><button type="button" class="btn primary" id="rinOk">閉じる</button></div>';
    showModal(h);
    document.getElementById('rinOk').addEventListener('click', function(){ closeModal(); resolve(); });
  });
}

/* 鳳：受け取った駒を、手と体内に分ける（体内は3個まで・手は空いている数まで） */
function arrangeHo(pi, tiles, hc){
  return new Promise(function(resolve){
    let hand = hoDefaultArrange(tiles, hc);
    function draw(){
      const bodyN = tiles.length - hand.length, ok = hoArrangeOk(tiles, hand, hc);
      let h = '<h3 class="serif">奥義「鳳」：受け取った駒を置き直す</h3>';
      h += '<p>駒を押すと、手と体内を切り替えます。手は' + hc + 'か所、体内は3個までです（体内は重い順に並びます）。</p>';
      h += '<div class="gate-group-label">手（' + hand.length + '／' + hc + '）</div><div class="ho-zone">';
      hand.forEach(function(i){ h += '<button type="button" class="tile-btn" data-ho="' + i + '">' + tileHtml(tiles[i], 'clickable', { ntid:true }) + '</button>'; });
      h += '</div><div class="gate-group-label">体内（' + bodyN + '／3）</div><div class="ho-zone">';
      tiles.forEach(function(x, i){ if(hand.indexOf(i) < 0) h += '<button type="button" class="tile-btn" data-ho="' + i + '">' + tileHtml(x, 'clickable', { ntid:true }) + '</button>'; });
      h += '</div>';
      if(!ok) h += '<p class="warn">' + (hand.length > hc ? '手に置ける駒は' + hc + '個までです。' : '体内に置ける駒は3個までです。') + '</p>';
      h += '<div class="btn-row"><button type="button" class="btn primary" id="hoOk"' + (ok ? '' : ' disabled') + '>この置き方で決める</button></div>';
      showModal(h);
      const pk = document.querySelector('#modalRoot [data-peekbtn]'); if(pk) pk.remove();
      document.querySelectorAll('[data-ho]').forEach(function(b){
        b.addEventListener('click', function(){ const i = parseInt(b.getAttribute('data-ho'), 10), k = hand.indexOf(i);
          if(k >= 0) hand.splice(k, 1); else hand.push(i); draw(); });
      });
      document.getElementById('hoOk').addEventListener('click', function(){ if(hoArrangeOk(tiles, hand, hc)){ closeModal(); resolve(hand.slice()); } });
    }
    draw();
  });
}
/* 姫：AIの体内の駒を1つ選ぶ（裏向きの駒は、置かれている位置で選ぶ） */
function pickHimeModal(){
  return new Promise(function(resolve){
    const q = P(1), n = q.body.length;
    let h = '<h3 class="serif">奥義「姫」：AIの体内の駒を選ぶ</h3>';
    h += '<p>選んだ駒をあなたの手（姫があった所）へ移し、姫はAIの体内へ移ります。体内の駒は、下ほど重い駒です。</p><div class="pick-list">';
    for(let i = n - 1; i >= 0; i--){
      const x = q.body[i], known = isOpenTile(x) || (G.kn && G.kn[0].has(x.id));
      h += '<button type="button" class="tile-btn" data-hime="' + i + '">' + (known ? tileHtml(x, 'clickable', { ntid:true }) : backHtml(null, 'clickable')) +
           '<small>' + (i === 0 ? '一番下' : (i === n - 1 ? '一番上' : '真ん中')) + '</small></button>';
    }
    h += '</div><div class="btn-row"><button type="button" class="btn" id="himeNo">やめる</button></div>';
    showModal(h);
    document.getElementById('himeNo').addEventListener('click', function(){ closeModal(); resolve(null); });
    document.querySelectorAll('[data-hime]').forEach(function(b){
      b.addEventListener('click', function(){ closeModal(); resolve(parseInt(b.getAttribute('data-hime'), 10)); });
    });
  });
}

/* 神：宣言する役名を選ぶ */
function pickKamiRole(gi){
  return new Promise(function(resolve){
    const n = P(1).gates[gi].length;
    let h = '<h3 class="serif">奥義「神」：役名を宣言する</h3>';
    h += '<p>AIの桜門' + (gi+1) + 'の塔（' + n + '段）が、どの役になっているかを宣言します。</p><div class="act-list">';
    KAMI_ROLES.forEach(function(r){ h += '<button type="button" class="btn act-btn" data-kami="' + r + '">「' + r + '」と宣言する</button>'; });
    h += '</div><div class="btn-row"><button type="button" class="btn" id="kamiNo">塔を選び直す</button></div>';
    showModal(h);
    document.getElementById('kamiNo').addEventListener('click', function(){ closeModal(); resolve(null); });
    document.querySelectorAll('[data-kami]').forEach(function(b){ b.addEventListener('click', function(){ closeModal(); resolve(b.getAttribute('data-kami')); }); });
  });
}
/* 神：公開した塔と結果を見せる（あなた・AIどちらが発した時も） */
function showKamiReveal(actor, gi, tiles, declared, actual, hit){
  return new Promise(function(resolve){
    const p = P(actor), q = P(1 - actor);
    let h = '<h3 class="serif">奥義「神」：' + esc(q.name) + 'の桜門' + (gi+1) + 'の塔</h3>';
    h += '<div class="modal-center"><div class="big-gate"><div class="big-stack">';
    for(let i = tiles.length - 1; i >= 0; i--) h += tileHtml(tiles[i], '', { ntid:true });
    h += '</div></div></div>';
    h += '<p class="wa-result">宣言：<b>' + esc(declared) + '</b> ／ 実際：<b>' + (actual ? esc(actual) : (isFuon(tiles) ? '不穏の塔' : '役なし')) + '</b></p>';
    h += '<p class="wa-result">' + (hit ? '<b class="wa-plus">的中</b>：' + esc(p.name) + 'が塔を奪い、完成役にします。' : '<b class="wa-minus">外れ</b>：' + esc(q.name) + 'がこの塔を解放します。') + '</p>';
    h += '<div class="btn-row"><button type="button" class="btn primary" id="kamiOk">閉じる</button></div>';
    showModal(h);
    document.getElementById('kamiOk').addEventListener('click', function(){ closeModal(); resolve(); });
  });
}
/* 滅：あなたが滅を置いた時、手番の人の塔から壊す塔を選ぶ（必ず1つ選ぶ） */
async function chooseMetsuTowerUI(owner, turnPi, gis){
  while(true){
    const pr = pickTowerModal('奥義「滅」：壊す塔を選ぶ', '蓄積の重さが10以上になりました。' + (turnPi === 0 ? 'あなた' : 'AI') + 'の塔を1つ選んでください。選んだ塔の駒は全て峡谷へ置きます。', gis.map(function(gi){ return { pi:turnPi, gi:gi }; }));
    const cancel = document.getElementById('ptCancel'); if(cancel) cancel.remove();   // 必ず1つ選ぶので「やめる」は出さない
    const tgt = await pr;
    if(tgt) return tgt.gi;
  }
}
