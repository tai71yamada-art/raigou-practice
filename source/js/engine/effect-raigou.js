/* ================= 雷轟解放（自分の雷＋自分の轟。霧をどちらか一方のまねに使える） ================= */
function raigouGates(p){
  const out = [];
  for(let gi=0; gi<3; gi++){ if(p.gates[gi].length>=1 && !p.seals[gi]) out.push(gi); }
  return out;
}
async function primRaigou(actor, handSlot, gi, partnerSlotOpt, modeOpt){
  const mode = modeOpt === 'tei' ? 'tei' : 'hou';
  const p = P(actor);
  const t = p.hand[handSlot];
  if(!t || !isRaiLike(t)) return false;
  let goSlot = -1;
  if(partnerSlotOpt !== undefined && partnerSlotOpt !== null && partnerSlotOpt !== handSlot && p.hand[partnerSlotOpt] && isGoLike(p.hand[partnerSlotOpt])) goSlot = partnerSlotOpt;
  else goSlot = goPartnerSlot(p, handSlot);
  if(goSlot < 0) return false;
  if(!p.gates[gi].length || p.seals[gi]) return false;
  // 霧＋霧は不可：同じ言霊（霧）を同じ手番に2回使うことになるため
  if(t.name === '霧' && p.hand[goSlot] && p.hand[goSlot].name === '霧') return false;
  await playCutIn(mode === 'hou' ? '雷轟' : '雷轟・雷停', actor);
  const partnerTile = p.hand[goSlot];
  let pairLabel = '「' + tileLabel(t) + '」と「' + tileLabel(partnerTile) + '」';
  if(partnerTile.name === '霧') pairLabel += '（霧を轟として使用）';
  if(t.name === '霧') pairLabel += '（霧で雷をまねる）';
  /* 受け手の応答：轟（霧）で受ければ雷轟合戦。陣は掟3で適用されないため応答の対象にしない */
  const defender = opp(actor);
  const resp = await resolveRaigouResponse(actor, defender, gi, mode);
  if(resp.type === 'go'){
    const d = P(defender);
    const defTileName = d.hand[resp.slot] ? d.hand[resp.slot].name : '轟';
    log(p.name + (mode === 'hou' ? 'の雷轟解放：' : 'の雷＋轟（雷停）：') + pairLabel + 'を合わせて、自分の桜門' + (gi+1) + 'の塔を' + (mode === 'hou' ? '解放' : '封印') + 'しようとしました。', 'sys');
    consumeHand(p, handSlot);
    consumeHand(p, goSlot);
    consumeHand(d, resp.slot);
    log(d.name + 'は「' + defTileName + '」を轟として使って受けました。両者が轟を使ったので雷轟合戦になります。使った雷と轟は全部峡谷へ行きます。', 'score');
    render();
    await resolveRaigouBattle({ attacker: actor, defender: defender, mode: mode, originalTarget: { pi: actor, gi: gi } });
    render();
    return true;
  }
  if(mode === 'tei'){
    consumeHand(p, handSlot);
    consumeHand(p, goSlot);
    onTowerEffect({ source:'go', mode:'tei', pi: actor, gi: gi, actor: actor });
    p.seals[gi] = { old:false };
    log(p.name + 'の雷＋轟（雷停）：' + pairLabel + 'を合わせて、自分の桜門' + (gi+1) + 'の塔を封印しました（' + p.name + 'の次の手番が終わるまで）。', 'score');
    render();
    await fxSealFx(actor, gi);
    render();
    return true;
  }
  if(G.raigouCounts) G.raigouCounts[actor]++;
  consumeHand(p, handSlot);
  consumeHand(p, goSlot);
  log(p.name + 'の雷轟解放：' + pairLabel + 'を合わせて、自分の桜門' + (gi+1) + 'の塔を解放します。');
  onTowerEffect({ source:'go', mode:'hou', pi: actor, gi: gi, actor: actor });
  await fxLightning(actor, gi);
  releaseTower(actor, gi, 2);
  render();
  return true;
}

