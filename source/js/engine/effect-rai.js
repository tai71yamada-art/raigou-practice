/* ================= 雷 ================= */
function raiTargets(){
  let all = [];
  for(let pi=0; pi<2; pi++){
    for(let gi=0; gi<3; gi++){
      const len = P(pi).gates[gi].length;
      if(len >= 3 && !P(pi).seals[gi]) all.push({ pi:pi, gi:gi, len:len });
    }
  }
  if(!all.length) return [];
  const max = Math.max.apply(null, all.map(function(x){ return x.len; }));
  return all.filter(function(x){ return x.len===max; });
}
/* 雷の効果を1つの塔へ適用する共通処理。bonusは雷轟解放の+2（役が成立した時だけ releaseTower 内で加算）。
   countRaigou=true の時は、その塔の持ち主の雷轟解放数に数える（雷放の時だけ意味がある） */
async function applyRaiTo(actor, mode, targetPi, targetGi, bonus, countRaigou, source){
  const p = P(actor);
  const owner = P(targetPi);
  onTowerEffect({ source: source || 'rai', mode: mode, pi: targetPi, gi: targetGi, actor: actor });
  if(targetPi === 0 && actor !== 0 && (source || 'rai') === 'rai') VIEW.setMeFace('hit');
  if(mode === 'hou'){
    if(countRaigou && G.raigouCounts) G.raigouCounts[targetPi]++;
    await VIEW.fxLightning(targetPi, targetGi);
    log(p.name + 'の雷放：' + owner.name + 'の桜門' + (targetGi+1) + 'の塔（' + owner.gates[targetGi].length + '段）を解放します。' + (bonus ? '（雷轟解放：役が成立すれば+2点）' : ''));
    releaseTower(targetPi, targetGi, bonus || 0);
  } else {
    owner.seals[targetGi] = { old:false };
    log(p.name + 'の雷停：' + owner.name + 'の桜門' + (targetGi+1) + 'の塔を封印しました（持ち主の次の手番が終わるまで）。');
    VIEW.render();
    await VIEW.fxSealFx(targetPi, targetGi);
  }
  VIEW.render();
}
async function primRai(actor, handSlot, mode, target){
  const p = P(actor);
  const t = p.hand[handSlot];
  if(!t) return false;
  await VIEW.playCutIn(mode === 'hou' ? '雷放' : '雷停', actor);
  let targetGi = target.gi;
  let targetPi = target.pi;
  let goBonus = false; // 受け手の轟で移し替えられた（＝受け手側の雷轟解放）かどうか
  /* 轟は「誰か（自分を含む）が雷を適用するとき」に使える。撃った側が自分の塔を対象にした場合も、
     相手は轟で雷の対象を自分の塔に変えられる（この場合、相手は狙われていないので陣は使えない） */
  const selfTarget = (target.pi === actor);
  {
    const defender = selfTarget ? opp(actor) : target.pi;
    const def = await resolveRaiDefense(actor, defender, mode, targetGi, selfTarget ? { goOnly:true } : null);
    if(def.type==='blocked'){
      // 陣が雷の演出を打ち消す
      await VIEW.playJinFx(defender);
      consumeHand(p, handSlot); VIEW.render(); return true;
    }
    if(def.type==='go'){
      /* 受け手が轟を使った。撃った側も轟（霧）で応じれば雷轟合戦になる */
      const counter = await attackerCounterGo(actor, handSlot);
      if(counter){
        const d = P(defender);
        const defTileName = d.hand[def.slot] ? d.hand[def.slot].name : '轟';
        const atkTileName = p.hand[counter.slot] ? p.hand[counter.slot].name : '轟';
        consumeHand(d, def.slot);
        consumeHand(p, counter.slot);
        consumeHand(p, handSlot);
        log(d.name + 'は「' + defTileName + '」を轟として使い、' + p.name + 'も「' + atkTileName + '」を轟として使いました。両者が轟を使ったので雷轟合戦になります。使った雷と轟は全部峡谷へ行きます。', 'score');
        VIEW.render();
        await resolveRaigouBattle({ attacker: actor, defender: defender, mode: mode, originalTarget: { pi: target.pi, gi: target.gi } });
        VIEW.render();
        return true;
      }
      /* 合戦なし：受け手の轟で移し替え（雷轟解放）が成立する */
      const d = P(defender);
      let gi = def.prefGi;
      if(d.isAI){
        if(gi === undefined || gi === null || goTowerCands(defender).indexOf(gi) < 0){
          const cc = goTowerCands(defender);
          gi = cc.length ? cc[0] : targetGi;
        }
      } else {
        gi = await VIEW.humanRedirectChoice(mode, targetGi, goTowerCands(defender));
        if(gi === null || gi === undefined){
          log(d.name + 'は移し先を選ばず、そのまま受けることにしました（轟は消費しません）。', 'sys');
          gi = null;
        }
      }
      if(gi !== null && gi !== undefined){
        // 轟が雷の演出を打ち消し、移し先の塔に落雷する
        await VIEW.playCutIn('轟', defender);
        const usedName = d.hand[def.slot] ? d.hand[def.slot].name : '轟';
        consumeHand(d, def.slot);
        if(usedName === '霧') log(d.name + 'は「霧」を轟として使って受けて、落とす先を自分の桜門' + (gi+1) + 'の塔に変えました。', 'score');
        else log(d.name + 'は「轟」で受けて、落とす先を自分の桜門' + (gi+1) + 'の塔に変えました。', 'score');
        targetGi = gi;
        targetPi = defender;
        goBonus = true;
        VIEW.render();
      }
    }
  }
  consumeHand(p, handSlot);
  await applyRaiTo(actor, mode, targetPi, targetGi, goBonus ? 2 : 0, goBonus && mode === 'hou', goBonus ? 'go' : 'rai');
  VIEW.render();
  return true;
}

/* 受け手が轟を使った時、撃った側も轟（霧）で応じるかを決める。
   応じれば雷轟合戦になる。撃った側の轟は雷のスロット以外の手から1枚だけ（掟4）。
   人間は「はい／いいえ」で選ぶ。AIは単純な判断（得点にしたい自分の塔がある時）で決める。
   戻り値: {slot} | null */
async function attackerCounterGo(actor, raiSlot){
  const p = P(actor);
  const slot = goPartnerSlot(p, raiSlot);
  if(slot < 0) return null;
  const raiTile = p.hand[raiSlot], goTile = p.hand[slot];
  if(!raiTile || !goTile) return null;
  if(raiTile.name === '霧' && goTile.name === '霧') return null; // 霧＋霧は不可
  if(!goTowerCands(actor).length) return null;
  if(!p.isAI){
    const yes = await VIEW.humanBattleCounterChoice(goTile.name);
    if(!yes) log(p.name + 'は轟を使わず、相手の移し替えを受け入れることにしました。', 'sys');
    return yes ? { slot: slot } : null;
  }
  /* AIの判断：解放して得点にしたい自分の塔（役が成立している塔）がある時だけ応じる */
  const cands = goTowerCands(actor);
  let bestPts = 0, bestTop = 0;
  cands.forEach(function(gi){
    const tw = p.gates[gi];
    bestPts = Math.max(bestPts, scoreTower(tw).pts);
    bestTop = Math.max(bestTop, tw[tw.length-1].w);
  });
  const dpCounter = withSeat(actor, diffParams);
  let want = bestPts >= 3 || (dpCounter.lv === 5 && bestTop >= 6 && bestPts >= 1) || (dpCounter.lv === 4 && bestTop >= 6 && bestPts >= 2);
  if(Math.random() < dpCounter.miss) want = false;
  if(want) log(p.name + 'は轟で応じて、雷轟合戦を望みました。', 'sys');
  return want ? { slot: slot } : null;
}
/* 雷轟解放への受け手の応答を決める。
   受け手が轟（霧を轟として）を使えば雷轟合戦になる。
   掟3：この雷には撃った側の轟が既に使われているため、陣（霧の陣まねも含む）は
   適用されず、消費もされず手に残る。人間にはその旨を表示し、陣は選べない形にする。
   戻り値: {type:'accept'} | {type:'go', slot} */
async function resolveRaigouResponse(attacker, defender, gi, modeOpt){
  const mode = modeOpt === 'tei' ? 'tei' : 'hou';
  const d = P(defender);
  const goSlot = handHas(d, '轟');
  const kiriSlot = handHas(d, '霧');
  const jinSlot = handHas(d, '陣');
  const goCandSlot = goSlot >= 0 ? goSlot : kiriSlot;
  const cands = goTowerCands(defender);
  const canGo = goCandSlot >= 0 && cands.length > 0;
  if(d.isAI){
    if(!canGo) return { type:'accept' };
    /* AIの判断：自分の塔を+2点で解放したい時、または相手の大きな解放を妨害したい時に受ける */
    const atkPts = scoreTower(P(attacker).gates[gi]).pts;
    let bestPts = 0, bestTop = 0;
    cands.forEach(function(g2){
      const tw = d.gates[g2];
      bestPts = Math.max(bestPts, scoreTower(tw).pts);
      bestTop = Math.max(bestTop, tw[tw.length-1].w);
    });
    let want = mode === 'hou'
      ? (bestPts >= 3 || atkPts >= 4 || bestTop >= 6)
      : (P(attacker).gates[gi].length >= 4 && bestTop >= 6); // 雷停：相手が高い塔を守ろうとしていて、合戦に勝てそうな時だけ
    if(Math.random() < withSeat(defender, diffParams).miss) want = false;
    if(!want) return { type:'accept' };
    log(d.name + 'は雷轟解放に対して、轟で受けることを選びました。', 'sys');
    return { type:'go', slot: goCandSlot };
  }
  /* 人間：防御駒を何も持っていなければポップアップ自体を出さない */
  if(goSlot < 0 && kiriSlot < 0 && jinSlot < 0) return { type:'accept' };
  const pick = await VIEW.humanRaigouResponseChoice(attacker, gi, {
    mode: mode,
    goSlot: canGo ? goCandSlot : -1,
    goName: canGo ? (d.hand[goCandSlot] ? d.hand[goCandSlot].name : '轟') : '',
    hasJin: jinSlot >= 0 || kiriSlot >= 0
  });
  if(!pick || pick.action !== 'go'){
    log(d.name + 'は轟を使わず、雷轟解放をそのまま受けることにしました。', 'sys');
    return { type:'accept' };
  }
  return { type:'go', slot: pick.slot };
}
/* 雷轟合戦の本体：両者が塔を選び → 一番上を一斉開示 → A／C判定 → 雷の効果を適用する。
   合戦の間は他の言霊の効果は割り込まない（掟2）。使った雷と轟は呼び出し側で峡谷へ送る。
   o: {attacker, defender, mode:'hou'|'tei', originalTarget:{pi,gi}} */
async function resolveRaigouBattle(o){
  const atk = o.attacker, def = o.defender, mode = o.mode;
  if(atk === 0 || def === 0) VIEW.setMeFace('act', 4000);
  G.inGassen = true; // 雷轟合戦中：奥義を含む全言霊の効果・持続奥義への蓄積は適用しない
  { const hp = !P(atk).isAI ? atk : (!P(def).isAI ? def : null);
    if(hp !== null) await VIEW.playClash(hp, hp === atk ? def : atk);
    else await VIEW.playCutIn('雷轟合戦', null); }
  log('雷轟合戦！ ' + P(atk).name + 'と' + P(def).name + 'が自分の塔を1つずつ選び、一番上の駒を一斉に開示します。合戦の間は他の言霊の効果は割り込みません。', 'score');
  VIEW.render();
  const picks = {};
  const order = (!P(atk).isAI) ? [atk, def] : (!P(def).isAI ? [def, atk] : [atk, def]);
  for(let k=0; k<order.length; k++){
    const pi = order[k];
    picks[pi] = P(pi).isAI ? aiBattlePick(pi) : await VIEW.humanBattlePick(pi);
    if(picks[pi] === null || picks[pi] === undefined || !P(pi).gates[picks[pi]] || !P(pi).gates[picks[pi]].length){
      const cc = goTowerCands(pi);
      picks[pi] = cc.length ? cc[0] : (o.originalTarget.pi === pi ? o.originalTarget.gi : 0);
    }
  }
  const tops = {};
  [atk, def].forEach(function(pi){
    const tw = P(pi).gates[picks[pi]];
    tops[pi] = tw[tw.length-1];
    if(tops[pi] && G.revealedTopIds) G.revealedTopIds.add(tops[pi].id);
    if(tops[pi] && G.kn){ G.kn[0].add(tops[pi].id); G.kn[1].add(tops[pi].id); }
  });
  VIEW.render();
  const wa = tops[atk].w, wd = tops[def].w;
  let pattern, winnerPi = null;
  if(wa !== wd){ pattern = 'A'; winnerPi = wa > wd ? atk : def; }
  else pattern = 'C';
  log('雷轟合戦の開示：' + P(atk).name + 'の桜門' + (picks[atk]+1) + 'の一番上は「' + tileLabel(tops[atk]) + '」（重さ' + wa + '）、' + P(def).name + 'の桜門' + (picks[def]+1) + 'の一番上は「' + tileLabel(tops[def]) + '」（重さ' + wd + '）。開示された駒は今後も塔の表示で分かります。', 'sys');
  if(pattern === 'A'){
    log('雷轟合戦の判定はA：重い方が単独なので、' + P(winnerPi).name + 'の選んだ塔に雷が落ちます。' + (mode === 'hou' ? '雷轟解放として解放され、役が成立すれば+2点です。' : '雷停が適用されます。'), 'score');
  } else {
    log('雷轟合戦の判定はC：重さが同点なので、どちらの選んだ塔にも落ちず、雷を撃った' + P(atk).name + 'が最初に指定した塔に当初の雷の効果が適用されます。+2点は付きません。', 'sys');
  }
  if(G.tally){
    if(pattern === 'A'){ G.tally.gassen[winnerPi][0]++; G.tally.gassen[1 - winnerPi][1]++; }
    else { G.tally.gassen[0][2]++; G.tally.gassen[1][2]++; }
  }
  await VIEW.showBattleRevealModal(o, picks, tops, pattern, winnerPi);
  G.inGassen = false; // 合戦の判定が出たら終了。条件を満たした受動奥義はここから後で処理する
  if(pattern === 'A'){
    const wpi = winnerPi, wgi = picks[winnerPi];
    onTowerEffect({ source:'go', mode: mode, pi: wpi, gi: wgi, actor: atk });
    if(mode === 'hou'){
      if(G.raigouCounts) G.raigouCounts[wpi]++;
      await VIEW.fxLightning(wpi, wgi);
      log(P(wpi).name + 'の桜門' + (wgi+1) + 'の塔に雷が落ち、雷轟解放として解放します。', 'score');
      releaseTower(wpi, wgi, 2);
    } else {
      P(wpi).seals[wgi] = { old:false };
      log(P(wpi).name + 'の桜門' + (wgi+1) + 'の塔に雷が落ち、雷停が適用されました（持ち主の次の手番が終わるまで）。', 'score');
      VIEW.render();
      await VIEW.fxSealFx(wpi, wgi);
    }
  } else {
    await applyRaiTo(atk, mode, o.originalTarget.pi, o.originalTarget.gi, 0, false, 'rai'); // 引き分け後は雷の効果
  }
  VIEW.render();
}

