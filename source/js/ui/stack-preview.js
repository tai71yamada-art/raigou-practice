/* ================= 積の仮置き（決定／キャンセル） ================= */
function stackPreviewModal(slot, gi){
  return new Promise(function(resolve){
    const p = P(0);
    const t = p.hand[slot];
    const tower = p.gates[gi];
    const nt = tower.concat([t]);
    const fuon = isFuon(nt);
    let info = '';
    if(nt.length >= 6){
      if(fuon) info = '<b>6段目</b>です。決定すると自動で解放されますが、<b>不穏の塔</b>なので得点にならず、あなたの陽玉が<b>-1点</b>になります。';
      else {
        const s = scoreTower(nt);
        info = '<b>6段目</b>です。決定すると自動で解放されます。' + (s.pts > 0 ? '役は <b>' + esc(s.role) + ' ' + s.pts + '点</b>（基礎' + s.base + '＋高さ' + s.height + '＋染め' + s.dye + '）になります。' : '役なし <b>0点</b>です。');
      }
    } else {
      info = 'この塔は <b>' + nt.length + '段</b>になります。' + (fuon
        ? '<b>注意：重さの順番が崩れるため、この塔は不穏の塔になります</b>（解放しても得点にならず、陽玉-1点）。'
        : '重さの順番は保たれます（不穏にはなりません）。');
    }
    let h = '<h3 class="serif">積む：仮置き</h3>';
    h += '<p>桜門' + (gi+1) + 'の塔の上に「' + esc(tileLabel(t)) + '」を仮置きしました（金色の破線が仮置きの駒です）。まだ正式には積まれていません。</p>';
    h += '<div class="modal-center"><div class="big-gate"><div class="bg-label">桜門' + (gi+1) + '</div><div class="big-stack">';
    h += tileHtml(t, 'provisional', { ntid:true });
    for(let i = tower.length-1; i >= 0; i--) h += tileHtml(tower[i], '', { ntid:true });
    h += '</div></div></div>';
    h += '<div class="confirm-summary">' + info + '</div>';
    h += '<div class="btn-row"><button type="button" class="btn primary" id="stkOk">決定</button>' +
         '<button type="button" class="btn" id="stkCancel">キャンセル</button></div>';
    showModal(h);
    document.getElementById('stkOk').addEventListener('click', function(){ closeModal(); resolve(true); });
    document.getElementById('stkCancel').addEventListener('click', function(){ closeModal(); resolve(false); });
    if(!fuon) autoYes('stkOk');
  });
}

