/* ================= 手駒ポップアップ（積む／発する） ================= */
function buildHandActs(t, s){
  const p = P(0);
  const acts = [];
  if(G.ippatsu){
    acts.push({ kind:'blocked', label:'この手番は一発奥義を発したので、ほかの駒を積・発できません', disabled:true });
    return acts;
  }
  if(!canActFromSlot(p, s)){
    acts.push({ kind:'blocked', label:'この手番は、もう2か所の手で積・発しました（積・発できる手は最大2か所）', disabled:true });
    return acts;
  }
  /* 掟1：使用済みは駒の名前ではなく「効果」単位で判定する。
     雷放と雷停は別の効果。霧でまねた効果も、その効果を使ったことになる */
  const usedHou = G.used.has('雷放'), usedTei = G.used.has('雷停');
  const usedHebi = G.used.has('蛇'), usedZan = G.used.has('斬');
  const usedShun = G.used.has('瞬'), usedJo = G.used.has('浄');
  const effNote = function(u){ return u ? '（この効果はこの手番使用済み）' : ''; };
  const anyStack = [0,1,2].some(function(gi){ return canStack(p, gi, t); });
  acts.push({ kind:'stack', label:'積（塔を選ぶ）', disabled: !anyStack });
  if(t.kind !== 'gen') return acts;
  if(t.ougi){
    const why = ougiUsable(0, s);
    acts.push({ kind:'ougi', short:'発：' + t.name, label:'発する：奥義「' + t.name + '」' + (why ? '（' + why + '）' : ''), disabled: !!why });
    return acts;
  }
  if(t.name === '雷'){
    const ok = raiTargets().length > 0;
    acts.push({ kind:'raiHou', label:'発する：雷放' + effNote(usedHou), disabled: usedHou || !ok });
    acts.push({ kind:'raiTei', label:'発する：雷停' + effNote(usedTei), disabled: usedTei || !ok });
    if(!ok) acts.push({ kind:'none', label:'（対象になる3段以上の塔がありません）', disabled: true });
    const partnerSlot = goPartnerSlot(p, s);
    if(partnerSlot >= 0 && raigouGates(p).length > 0 && canActPair(p, s, partnerSlot)){
      const pt = p.hand[partnerSlot];
      acts.push({ kind:'raigou', label:'雷轟解放（手の' + (pt.name !== '轟' ? pt.name + 'を轟として使って' : '轟と合わせて') + '自分の塔を解放 +2点）' + effNote(usedHou), disabled: usedHou });
      acts.push({ kind:'raigouTei', label:'雷＋轟で雷停（手の' + (pt.name !== '轟' ? pt.name + 'を轟として使って' : '轟と合わせて') + '、段数を問わず自分の塔を封印）' + effNote(usedTei), disabled: usedTei });
    }
  } else if(t.name === '蛇'){
    acts.push({ kind:'hebi', label:'発する：内駒を1個奪う' + effNote(usedHebi), disabled: usedHebi });
  } else if(t.name === '斬'){
    const ok = [0,1].some(function(pi){ return P(pi).gates.some(function(gw){ return gw.length > 0; }) && P(pi).gates.some(function(gw, gi){ return gw.length > 0 && !P(pi).seals[gi]; }); });
    acts.push({ kind:'zan', label:'発する：塔の端の駒を取る' + effNote(usedZan), disabled: usedZan || !ok });
  } else if(t.name === '霧'){
    const raiOk = raiTargets().length > 0;
    const raiUsedBoth = usedHou && usedTei;
    acts.push({ kind:'kirRai', label:'発する（まねる）：雷' + effNote(raiUsedBoth), disabled: raiUsedBoth || !raiOk });
    acts.push({ kind:'kirHebi', label:'発する（まねる）：蛇' + effNote(usedHebi), disabled: usedHebi });
    acts.push({ kind:'kirZan', label:'発する（まねる）：斬' + effNote(usedZan), disabled: usedZan });
    const partnerSlot = goPartnerSlot(p, s);
    if(partnerSlot >= 0 && raigouGates(p).length > 0 && canActPair(p, s, partnerSlot)){
      const pt = p.hand[partnerSlot];
      // 霧＋霧は不可（同じ言霊を2回使うことになる）。霧（雷役）と合わせられるのは本物の轟だけ
      if(pt.name === '轟'){
        acts.push({ kind:'raigou', label:'雷轟解放（霧で雷をまねて、手の轟と合わせて自分の塔を解放 +2点）' + effNote(usedHou), disabled: usedHou });
        acts.push({ kind:'raigouTei', label:'雷＋轟で雷停（霧で雷をまねて、手の轟と合わせて自分の塔を封印）' + effNote(usedTei), disabled: usedTei });
      }
    }
    const otherSlot = otherHandSlot(p, s, function(x){ return x.kind==='gen' && x.name==='雷'; });
    const other = (otherSlot >= 0 && canActPair(p, s, otherSlot)) ? p.hand[otherSlot] : null;
    if(other && other.name === '雷' && !usedHou && raigouGates(p).length > 0){
      acts.push({ kind:'raigouFromKiriGo', label:'雷轟解放（この霧を轟として使って、手の雷と合わせて自分の塔を解放 +2点）', disabled: usedHou });
    }
    if(other && other.name === '雷' && !usedTei && raigouGates(p).length > 0){
      acts.push({ kind:'raigouTeiFromKiriGo', label:'雷＋轟で雷停（この霧を轟として使って、手の雷と合わせて自分の塔を封印）', disabled: false });
    }
  } else if(t.name === '轟'){
    const otherSlot = raiPartnerSlot(p, s);
    const other = (otherSlot >= 0 && canActPair(p, s, otherSlot)) ? p.hand[otherSlot] : null;
    if(other && other.kind === 'gen' && (other.name === '雷' || other.name === '霧' || other.name === '鳴') && !usedHou && raigouGates(p).length > 0){
      acts.push({ kind:'raigouFromGo', label:'雷轟解放：もう一方の手の「' + other.name + '」と合わせて自分の塔を解放（+2点）', disabled: false });
    }
    if(other && other.kind === 'gen' && (other.name === '雷' || other.name === '霧' || other.name === '鳴') && !usedTei && raigouGates(p).length > 0){
      acts.push({ kind:'raigouTeiFromGo', label:'雷＋轟で雷停：もう一方の手の「' + other.name + '」と合わせて、段数を問わず自分の塔を封印', disabled: false });
    }
  } else if(t.name === '瞬'){
    acts.push({ kind:'shun', label:'発する：駒を2個入れ替える' + effNote(usedShun), disabled: usedShun });
  } else if(t.name === '浄'){
    acts.push({ kind:'jo', label:'発する：捨てて引き直す' + effNote(usedJo), disabled: usedJo });
  }
  return acts;
}
function showHandPopup(slot){
  const p = P(0);
  const t = p.hand[slot];
  if(!t) return;
  UI.selHand = slot;
  const acts = buildHandActs(t, slot);
  let h = '<h3 class="serif">手の駒：' + esc(tileLabel(t)) + '（重さ' + t.w + '）</h3>';
  h += '<div class="modal-center">' + tileHtml(t, 'big', { ntid:true }) + '</div>';
  if(t.kind === 'gen' && (t.name === '陣' || t.name === '轟')){
    h += '<p>「' + t.name + '」は手に置いておく受け札です。発するものではありません。積むことはできます。</p>';
  }
  if(t.ougi){ const od = ougiByName(t.name); if(od) h += ougiTextHtml(od); }
  h += '<div class="act-list">';
  acts.forEach(function(a, i){
    h += '<button type="button" class="btn' + (i === 0 ? ' primary' : '') + '" data-act="' + i + '"' + (a.disabled ? ' disabled' : '') + '>' + esc(a.label) + '</button>';
  });
  h += '</div>';
  h += '<div class="btn-row"><button type="button" class="btn" id="handClose">閉じる</button></div>';
  showModal(h);
  document.getElementById('handClose').addEventListener('click', function(){ closeModal(); UI.selHand = null; render(); });
  document.querySelectorAll('[data-act]').forEach(function(b){
    b.addEventListener('click', function(){
      const a = acts[parseInt(b.getAttribute('data-act'), 10)];
      closeModal();
      if(a && a.kind !== 'none') runEffectFlow(a.kind, slot);
    });
  });
}

