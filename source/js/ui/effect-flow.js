/* ================= 効果の実行フロー（対象選択→最終確認→解決） ================= */
async function runEffectFlow(kind, slot){
  G.acting = true;
  UI.selHand = slot;
  try{
    if(kind === 'stack'){
      const targets = [0,1,2].filter(function(gi){ return canStack(P(0), gi, P(0).hand[slot]); }).map(function(gi){ return { pi:0, gi:gi }; });
      const tgt = await pickTowerModal('積む：自分の塔を選ぶ', '選んだ塔の上に駒が<b>仮置き</b>されます。「決定」を押すまでは正式には積まれません。下の駒より重い駒も積めますが、順番が合わず<b>不穏の塔</b>になります（解放しても得点にならず、陽玉-1点）。', targets);
      if(tgt){
        const decided = await stackPreviewModal(slot, tgt.gi);
        if(decided) await primStack(0, slot, tgt.gi);
        else log('積むのをキャンセルしました（駒は手に残っています）。', 'sys');
      }
    }
    else if(kind === 'raigouTei' || kind === 'raigouTeiFromGo' || kind === 'raigouTeiFromKiriGo'){
      let raiSlot = slot;
      if(kind === 'raigouTeiFromGo' || kind === 'raigouTeiFromKiriGo') raiSlot = raiPartnerSlot(P(0), slot);
      const targets = raigouGates(P(0)).map(function(gi){ return { pi:0, gi:gi }; });
      while(true){
        const tgt = await pickTowerModal('雷＋轟で雷停：自分の塔を選ぶ', '手の「轟」（霧を轟として使う場合も含む）と合わせて、封印する自分の塔を選んでください。段数は問いません。封印はあなたの次の手番が終わるまで続きます。', targets);
        if(!tgt) break;
        const tw = P(0).gates[tgt.gi];
        const ok = await confirmYesNo('雷停の確認', '自分の桜門' + (tgt.gi+1) + 'の塔（' + tw.length + '段）を、雷と轟を合わせて封印します。封印中は相手の言霊の対象にならず、あなたも積めません。');
        if(!ok) continue;
        G.used.add('雷停'); // 掟1：雷停の効果として数える
        await primRaigou(0, raiSlot, tgt.gi, undefined, 'tei');
        break;
      }
    }
    else if(kind === 'raigou' || kind === 'raigouFromGo' || kind === 'raigouFromKiriGo'){
      let raiSlot = slot;
      if(kind === 'raigouFromGo') raiSlot = raiPartnerSlot(P(0), slot);
      if(kind === 'raigouFromKiriGo') raiSlot = raiPartnerSlot(P(0), slot);
      const targets = raigouGates(P(0)).map(function(gi){ return { pi:0, gi:gi }; });
      while(true){
        const tgt = await pickTowerModal('雷轟解放：自分の塔を選ぶ', '手の「轟」（霧を轟として使う場合も含む）と合わせて解放する塔を選んでください。役の点数に+2点されます。', targets);
        if(!tgt) break;
        const tw = P(0).gates[tgt.gi];
        const ok = await confirmYesNo('雷轟解放の確認', '自分の桜門' + (tgt.gi+1) + 'の塔（' + tw.length + '段）を、雷轟解放で解放します。' + (isFuon(tw) ? '<br><b>不穏の塔</b>なので得点にならず、陽玉-1点です。' : ''));
        if(!ok) continue;
        G.used.add('雷放'); // 雷轟解放は雷放の効果として数える（掟1：効果単位）
        await primRaigou(0, raiSlot, tgt.gi);
        break;
      }
    }
    else if(kind === 'raiHou' || kind === 'raiTei' || kind === 'kirRai'){
      let mode = kind === 'raiTei' ? 'tei' : 'hou';
      if(kind === 'kirRai'){
        const m = await new Promise(function(resolve){
          const houUsed = G.used.has('雷放'), teiUsed = G.used.has('雷停');
          let h = '<h3 class="serif">霧で雷をまねます</h3><p>どちらの効果にしますか？（雷放と雷停は別の効果なので、片方を使っていても、もう片方はこの手番に使えます）</p>';
          h += '<div class="btn-row"><button type="button" class="btn primary" id="kmHou"' + (houUsed ? ' disabled' : '') + '>雷放（塔を解放）' + (houUsed ? '（使用済み）' : '') + '</button>' +
               '<button type="button" class="btn" id="kmTei"' + (teiUsed ? ' disabled' : '') + '>雷停（塔を封印）' + (teiUsed ? '（使用済み）' : '') + '</button>' +
               '<button type="button" class="btn" id="kmCancel">やめる</button></div>';
          showModal(h);
          document.getElementById('kmHou').addEventListener('click', function(){ closeModal(); resolve('hou'); });
          document.getElementById('kmTei').addEventListener('click', function(){ closeModal(); resolve('tei'); });
          document.getElementById('kmCancel').addEventListener('click', function(){ closeModal(); resolve(null); });
        });
        if(!m) return;
        mode = m;
      }
      const targets = raiTargets();
      while(true){
        const tgt = await pickTowerModal((mode === 'hou' ? '雷放' : '雷停') + '：対象の塔を選ぶ', '対象は一番段数が高い塔（3段以上）だけです。', targets);
        if(!tgt) break;
        const owner = P(tgt.pi);
        const ok = await confirmYesNo((mode === 'hou' ? '雷放' : '雷停') + 'の確認',
          esc(owner.name) + 'の桜門' + (tgt.gi+1) + 'の塔（' + owner.gates[tgt.gi].length + '段）を' + (mode === 'hou' ? '解放します。' : '封印します。'));
        if(!ok) continue;
        G.used.add(mode === 'hou' ? '雷放' : '雷停'); // 掟1：効果単位（霧でまねても同じ効果として数える）
        await primRai(0, slot, mode, { pi: tgt.pi, gi: tgt.gi });
        break;
      }
    }
    else if(kind === 'hebi' || kind === 'kirHebi'){
      const items = [];
      P(1).body.forEach(function(t, idx){ items.push({ group:'相手の体内', loc:{ pi:1, where:'body', idx:idx }, desc:'相手の体内の駒', html: backHtml(null, 'clickable') }); });
      P(1).hand.forEach(function(t, s){ if(t) items.push({ group:'相手の手', loc:{ pi:1, where:'hand', idx:s }, desc:'相手の手の駒', html: backHtml(null, 'clickable') }); });
      P(0).body.forEach(function(t, idx){ items.push({ group:'あなたの体内', loc:{ pi:0, where:'body', idx:idx }, desc:'あなたの体内の「' + tileLabel(t) + '」', html: tileHtml(t, 'clickable', { ntid:true }) }); });
      P(0).hand.forEach(function(t, s){ if(t && s !== slot) items.push({ group:'あなたの手', loc:{ pi:0, where:'hand', idx:s }, desc:'あなたの手の「' + tileLabel(t) + '」', html: tileHtml(t, 'clickable', { ntid:true }) }); });
      while(true){
        const it = await pickHebiModal(items);
        if(!it) break;
        const ok = await confirmYesNo('蛇の確認', esc(it.desc) + 'を奪って、空いた手に置きます。');
        if(!ok) continue;
        G.used.add('蛇'); // 掟1：霧でまねても「蛇」の効果として数える。奪った蛇もこの手番では発せない
        await primHebi(0, slot, it.loc);
        break;
      }
    }
    else if(kind === 'zan' || kind === 'kirZan'){
      const targets = [];
      for(let pi = 0; pi < 2; pi++) for(let gi = 0; gi < 3; gi++){
        if(P(pi).gates[gi].length > 0 && !P(pi).seals[gi]) targets.push({ pi:pi, gi:gi });
      }
      while(true){
        const tgt = await pickTowerModal('斬：対象の塔を選ぶ', '自分の塔でも相手の塔でも選べます。', targets);
        if(!tgt) break;
        const end = await pickZanEnd(tgt.pi, tgt.gi);
        if(!end) continue;
        const owner = P(tgt.pi);
        const ok = await confirmYesNo('斬の確認',
          esc(owner.name) + 'の桜門' + (tgt.gi+1) + 'の塔の' + (end === 'top' ? '一番上' : '一番下') + 'の駒を取り除きます。取り除いた駒は峡谷へ行きます。');
        if(!ok) continue;
        G.used.add('斬'); // 掟1：霧でまねても「斬」の効果として数える
        await primZan(0, slot, { pi: tgt.pi, gi: tgt.gi, end: end });
        break;
      }
    }
    else if(kind === 'shun'){
      while(true){
        const locs = await pickShunModal(slot);
        if(!locs) break;
        const ok = await confirmYesNo('瞬の確認', esc(locDescForShun(locs[0])) + ' と ' + esc(locDescForShun(locs[1])) + ' を入れ替えます。');
        if(!ok) continue;
        G.used.add('瞬');
        await primShun(0, slot, locs[0], locs[1]);
        break;
      }
    }
    else if(kind === 'ougi'){
      await runOugiFlow(slot);
    }
    else if(kind === 'jo'){
      const res = await humanJoFlow(slot);
      if(res) await joArrange(0, slot, res.handTiles, res.pool, res.counts);
    }
  } finally {
    G.acting = false;
    UI.selHand = null;
    UI.pending = null;
    UI.shunFirst = null;
    render();
  }
}
