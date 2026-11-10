/* ================= 受け札（陣・轟）の解決 ================= */
function handHas(p, name){
  for(let i=0;i<p.hand.length;i++){ if(p.hand[i] && p.hand[i].name===name) return i; }
  return -1;
}
function consumeHand(p, slot){
  const t = p.hand[slot]; p.hand[slot] = null;
  if(t) markActed(p, slot);
  if(t && G.players && p === P(0) && G.hatsuGame) G.hatsuGame[t.name] = (G.hatsuGame[t.name] || 0) + 1;
  if(t) G.canyon.push(t);
  return t;
}
function isRaiLike(t){ return t && t.kind==='gen' && (t.name==='雷' || t.name==='霧' || t.name==='鳴'); }
function isGoLike(t){ return t && t.kind==='gen' && (t.name==='轟' || t.name==='霧' || t.name==='鳴'); }
/* 陣・轟をまねられる駒の手：霧を優先し、無ければ奥義「鳴」 */
function mimicSlot(p){ const k = handHas(p, '霧'); return k >= 0 ? k : handHas(p, '鳴'); }
/* 陣・轟として使った駒の記録用の言い方 */
function asJinText(name){ return name === '陣' ? '「陣」で防ぎました。' : '「' + name + '」を陣として使って防ぎました。'; }
/* 指定スロット以外の手にある、轟として使える駒のスロット（本物の轟を優先、次に霧） */
function goPartnerSlot(p, slot){
  let kiri = -1;
  for(let i=0;i<p.hand.length;i++){
    if(i===slot || !p.hand[i]) continue;
    if(p.hand[i].name==='轟') return i;
    if(p.hand[i].name==='霧') kiri = i;
  }
  if(kiri < 0) kiri = handHas(p, '鳴');
  return kiri === slot ? -1 : kiri;
}
/* 轟で移し先／合戦で選べる自分の塔：公式では段数の制限はなく、当初の対象の塔も選べる。
   封印中の塔と、駒が1つもない塔は対象外（現行通り）。 */
function goTowerCands(pi){
  const p = P(pi);
  const out = [];
  for(let gi=0; gi<3; gi++){
    if(p.seals[gi]) continue;
    if(p.gates[gi].length >= 1) out.push(gi);
  }
  return out;
}
/* 雷の対象になった時の受け札解決。
   対象が決まった後・効果が解決する前に、守る側が使うかどうかを選ぶ。
   人間が守る側の時は自動発動しない：使える防御駒と「防がない」を出す選択ポップアップを挟み、
   「防がない」を選べば効果はそのまま解決する。
   轟／霧（轟として）を選んだ場合は、ここでは「轟を使う宣言」だけを返し、
   移し先の決定や雷轟合戦の判定は primRai 側で行う（撃った側も轟を使えば合戦になるため）。
   AIが守る側の時は今まで通りAIが自分で判断する（自動）。
   使える対応：陣＝無効化、轟＝雷だけ移し替え、霧＝陣としても轟としても使える。
   戻り値: {type:'none'} | {type:'blocked'} | {type:'go', slot, prefGi} */
async function resolveRaiDefense(attacker, defender, mode, targetGi, opt){
  const d = P(defender);
  /* opt.goOnly：撃った側が自分の塔を対象にした雷。受け手は狙われていないので陣は使えず、
     轟（霧を轟として使う場合も含む）で「雷の対象を自分の塔に変える」ことだけができる */
  const goOnly = !!(opt && opt.goOnly);
  if(!goOnly && G.tally) G.tally.attacked[defender]++;
  const goSlot = handHas(d, '轟');
  const kiriSlot = mimicSlot(d);
  const jinSlot = goOnly ? -1 : handHas(d, '陣');
  if(goSlot < 0 && kiriSlot < 0 && jinSlot < 0) return { type:'none' };
  // 移し先の候補（轟／霧を轟として使う時に選べる自分の塔。段数制限なし・対象の塔も含む）
  const cands = goTowerCands(defender);
  const goUsable = cands.length > 0 && (goSlot >= 0 || kiriSlot >= 0);
  const jinUsable = !goOnly && (jinSlot >= 0 || kiriSlot >= 0);
  if(!goUsable && !jinUsable) return { type:'none' };

  if(!d.isAI){
    /* ---- 人間が守る側：まず防御するかどうか・どの駒で受けるか選ぶ ---- */
    const pick = await VIEW.humanRaiDefenseChoice(mode, targetGi, {
      jinSlot: jinUsable ? jinSlot : -1,
      kiriAsJinSlot: jinUsable ? kiriSlot : -1,
      goSlot: goUsable ? goSlot : -1,
      kiriAsGoSlot: goUsable ? kiriSlot : -1
    }, goOnly ? { selfTargetBy: attacker } : null);
    if(!pick || pick.action === 'accept'){
      log(d.name + 'は防御駒を使わず、そのまま受けることにしました。', 'sys');
      return { type:'none' };
    }
    if(pick.action === 'jin'){
      const usedName = d.hand[pick.slot] ? d.hand[pick.slot].name : '陣';
      consumeHand(d, pick.slot);
      log(d.name + 'は' + asJinText(usedName), 'sys');
      VIEW.render();
      if(G.tally) G.tally.blocked[defender]++;
      return { type:'blocked' };
    }
    if(pick.action === 'go'){
      /* 轟／霧（轟として）を使う宣言だけを返す。消費と移し先／合戦の決定は primRai 側で行う
         （撃った側が轟で応じれば雷轟合戦になり、「やっぱり防がない」余地も残すため） */
      log(d.name + 'は轟として使える駒で受けることを選びました。', 'sys');
      if(G.tally) G.tally.goResp[defender]++;
      return { type:'go', slot: pick.slot, prefGi: undefined };
    }
    return { type:'none' };
  }

  /* ---- AIが守る側：今まで通り自動で判断する ---- */
  if(goOnly){
    if(!goUsable) return { type:'none' };
    const choice = withSeat(defender, function(){ return aiGoChoiceSelfTarget(attacker, defender, mode, targetGi, cands); });
    if(choice){ if(G.tally) G.tally.goResp[defender]++; return { type:'go', slot: goSlot >= 0 ? goSlot : kiriSlot, prefGi: choice.gi }; }
    return { type:'none' };
  }
  if(goSlot >= 0 || kiriSlot >= 0){
    if(cands.length){
      const choice = withSeat(defender, function(){ return aiGoChoice(defender, mode, targetGi, cands, jinSlot>=0); });
      if(choice && choice.type==='redirect'){
        /* 轟を使う宣言だけを返す（消費は primRai 側。撃った側が応じれば合戦になる） */
        const useSlot = goSlot >= 0 ? goSlot : kiriSlot;
        if(G.tally) G.tally.goResp[defender]++;
        return { type:'go', slot: useSlot, prefGi: choice.gi };
      }
      if(choice && choice.type==='jin' && jinSlot>=0){
        consumeHand(d, jinSlot);
        log(d.name + 'は「陣」で防ぎました。', 'sys');
        VIEW.render();
        if(G.tally) G.tally.blocked[defender]++;
        return { type:'blocked' };
      }
      if(choice && choice.type==='accept') return { type:'none' };
    }
  }
  if(jinSlot >= 0){
    consumeHand(d, jinSlot);
    log(d.name + 'は「陣」で防ぎました。', 'sys');
    VIEW.render();
    if(G.tally) G.tally.blocked[defender]++;
    return { type:'blocked' };
  }
  if(kiriSlot >= 0){
    const kn = d.hand[kiriSlot].name;
    consumeHand(d, kiriSlot);
    log(d.name + 'は' + asJinText(kn), 'sys');
    VIEW.render();
    if(G.tally) G.tally.blocked[defender]++;
    return { type:'blocked' };
  }
  return { type:'none' };
}
/* 蛇・斬の対象になった時の防御解決。
   人間が守る側の時は自動発動しない：対象（塔／取る駒）が決まった後・効果が解決する前に、
   陣／霧（陣として）と「防がない」を出す選択ポップアップを挟む。
   AIが守る側の時は今まで通り自動で判断する。
   防いだら相手の効果アニメーションを五芒星で打ち消す */
async function resolveJinDefense(defender, attackName, targetDesc){
  const d = P(defender);
  if(G.tally) G.tally.attacked[defender]++;
  const jinSlot = handHas(d, '陣');
  const kiriSlot = mimicSlot(d);
  if(jinSlot < 0 && kiriSlot < 0) return false;
  if(!d.isAI){
    const pick = await VIEW.humanJinDefenseChoice(attackName || '言霊', targetDesc || '', jinSlot, kiriSlot);
    if(!pick || pick.action === 'accept'){
      log(d.name + 'は防御駒を使わず、そのまま受けることにしました。', 'sys');
      return false;
    }
    const usedName = d.hand[pick.slot] ? d.hand[pick.slot].name : '陣';
    consumeHand(d, pick.slot);
    log(d.name + 'は' + asJinText(usedName), 'sys');
    VIEW.render();
    await VIEW.playJinFx(defender);
    if(G.tally) G.tally.blocked[defender]++;
    return true;
  }
  /* AIが守る側：自動 */
  if(jinSlot >= 0){
    consumeHand(d, jinSlot);
    log(d.name + 'は「陣」で防ぎました。', 'sys');
    VIEW.render();
    await VIEW.playJinFx(defender);
    if(G.tally) G.tally.blocked[defender]++;
    return true;
  }
  const kn2 = d.hand[kiriSlot].name;
  consumeHand(d, kiriSlot);
  log(d.name + 'は' + asJinText(kn2), 'sys');
  VIEW.render();
  await VIEW.playJinFx(defender);
  if(G.tally) G.tally.blocked[defender]++;
  return true;
}

