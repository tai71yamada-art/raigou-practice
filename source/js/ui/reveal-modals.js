/* ================= 開示の画面（終局の全解放・雷轟合戦） ================= */
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
/* 雷轟合戦の開示モーダル：両者の一番上の駒と重さ、A／Cの判定、雷の落ち先を示す */
function showBattleRevealModal(o, picks, tops, pattern, winnerPi){
  return new Promise(function(resolve){
    const atk = o.attacker;
    function sideHtml(pi, cls){
      const tw = P(pi).gates[picks[pi]];
      const top = tops[pi];
      const win = (pattern === 'A' && winnerPi === pi) ? ' win' : '';
      return '<div class="bt-side ' + cls + win + '"><div class="bt-who"><span class="bt-en">' + (pi === 0 ? 'YOU' : 'AI') + '</span>' +
             '<span class="bt-name">' + esc(P(pi).name) + ' — 桜門' + (picks[pi]+1) + '（' + tw.length + '段）</span></div>' +
             '<div class="bt-tile">' + tileHtml(top, 'big', { ntid:true }) + '</div>' +
             '<div class="bt-w">一番上の駒：重さ ' + top.w + '</div></div>';
    }
    let h = '<div class="battle-split">';
    h += sideHtml(1, 'top');
    h += '<div class="bt-mid"><span class="bt-title">雷轟合戦</span><span class="bt-sub">' + esc(P(atk).name) + 'の雷に、両者が轟で応じた — 重い方の塔に雷が落ちる</span></div>';
    h += sideHtml(0, 'bottom');
    if(pattern === 'A'){
      h += '<div class="bt-result"><b>' + esc(P(winnerPi).name) + 'の塔に雷が落ちる！</b><span>' +
           (o.mode === 'hou' ? '雷轟解放：役が成立すれば陽玉 +2' : '雷停が適用されます') + '</span></div>';
    } else {
      h += '<div class="bt-result draw"><b>同じ重さ — 合戦は引き分け</b><span>' + esc(P(atk).name) + 'が最初に指定した塔（' + esc(P(o.originalTarget.pi).name) + 'の桜門' + (o.originalTarget.gi+1) + '）に当初の雷が落ちます。+2点は付きません。</span></div>';
    }
    h += '<p class="bt-note">開示された一番上の駒は、このあとも表向きのまま見えます</p>';
    h += '<div class="btn-row"><button type="button" class="btn primary" id="battleOk">雷を落とす</button></div>';
    h += '</div>';
    showModal(h);
    const pb = document.querySelector('#modalRoot [data-peekbtn]');
    if(pb) pb.remove();
    document.getElementById('battleOk').addEventListener('click', function(){ closeModal(); resolve(); });
  });
}
