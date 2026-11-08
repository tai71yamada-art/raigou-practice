/* ================= 駒一覧・役一覧（ガイド） =================
   サマリー（言霊の効果・役の種類・駒の個数・駒の重さ）をもとにした資料画面。
   対戦状態には一切触れないので、試合中・スタート画面のどちらからでも開閉できる。 */
const GUIDE_NOTE = '自分の手番で、同じ言霊の「効果」は2回まで発することができない（雷放と雷停は別の効果として数える。霧でまねた効果も同じ）。';
const KOMA_GUIDE = [
  { kind:'gen', name:'雷', w:1, n:8, desc:'次の2つの効果から1つを選んで適用する。\n①雷放：全ての塔の中で最も高く、3段以上の塔を1つ解放する（役が成立していれば、その塔の持ち主が点を得る）。\n②雷停：全ての塔の中で最も高く、3段以上の塔を1つ封印する。封印された塔は、持ち主の次の手番が終わるまで積むことも効果の対象にすることもできない。' },
  { kind:'gen', name:'蛇', w:2, n:7, desc:'全プレイヤーの内駒（体内・手）の中から1枚を選び、奪って自分の空いた手に置く。自分を対象にすることもできる。奪った駒はその手番のうちに積む・発することができる（ただし、奪った「蛇」をその手番に使うことはできない）。' },
  { kind:'gen', name:'斬', w:3, n:6, desc:'どれかの塔を1つ選び、その一番上か一番下の駒1枚を取り除いて峡谷に置く。' },
  { kind:'gen', name:'陣', w:4, n:5, desc:'手に置いておく守りの駒。自分が「雷」「蛇」「斬」の対象になった時に表向きにすると、その効果を無効化できる（「瞬」には効かない）。使うと峡谷に置く。' },
  { kind:'gen', name:'轟', w:5, n:4, desc:'手に置いておく守りの駒。誰かが「雷」を使った時に表向きにすると、雷の対象を自分の塔に変更できる（自分の塔なら何段でもよい）。雷放を自分の塔に受けて役が成立すると「雷轟解放」となり、追加で2点を得る。' },
  { kind:'gen', name:'霧', w:6, n:3, desc:'他の言霊のコピー。「雷」「蛇」「斬」「陣」「轟」のいずれかと同じ効果を適用できる（「瞬」「浄」はまねられない）。' },
  { kind:'gen', name:'瞬', w:7, n:2, desc:'全プレイヤーの体内・手と、峡谷にある駒の中から2枚を選び、その位置を入れ替える。ただし、峡谷にある重さ7以上の言霊を選ぶことはできない。' },
  { kind:'gen', name:'浄', w:8, n:1, desc:'自分の内駒から0〜4枚を選び峡谷に置き、同じ枚数を雷山から引く（雷山に残っている枚数まで）。その後、内駒を全て好きな位置に置き直すことができる（手の駒を体内に戻すこともできる）。置き直した駒はその手番のうちに使える。' },
  { kind:'gen', name:'滅', w:9, n:1, badge:'持続奥義', desc:'持続奥義。発すると「頭」に置かれ、以後、使われた言霊の駒は峡谷ではなく滅の横にたまっていく。たまった駒の重さの合計が10以上になった手番の最後に、滅の持ち主が、その手番プレイヤーの塔を1つ選び、駒を全て峡谷に置く。', note:'※このアプリの対戦（奥義なしルール）では山札に入りません。' },
  { kind:'on', name:'一', w:1, n:4, desc:'効果のない駒（音無）。手からは「積む」ことでしか出すことができない。塔の駒が全部音無（または全部言霊）だと「染め加点」+1点になる。' },
  { kind:'on', name:'二', w:2, n:4, desc:'効果のない駒（音無）。手からは「積む」ことでしか出すことができない。塔の駒が全部音無（または全部言霊）だと「染め加点」+1点になる。' },
  { kind:'on', name:'三', w:3, n:4, desc:'効果のない駒（音無）。手からは「積む」ことでしか出すことができない。塔の駒が全部音無（または全部言霊）だと「染め加点」+1点になる。' },
  { kind:'on', name:'四', w:4, n:4, desc:'効果のない駒（音無）。手からは「積む」ことでしか出すことができない。塔の駒が全部音無（または全部言霊）だと「染め加点」+1点になる。' },
  { kind:'on', name:'五', w:5, n:4, desc:'効果のない駒（音無）。手からは「積む」ことでしか出すことができない。塔の駒が全部音無（または全部言霊）だと「染め加点」+1点になる。' },
  { kind:'on', name:'六', w:6, n:4, desc:'効果のない駒（音無）。手からは「積む」ことでしか出すことができない。塔の駒が全部音無（または全部言霊）だと「染め加点」+1点になる。' },
  { kind:'on', name:'七', w:7, n:4, desc:'効果のない駒（音無）。手からは「積む」ことでしか出すことができない。塔の駒が全部音無（または全部言霊）だと「染め加点」+1点になる。' },
  { kind:'on', name:'八', w:8, n:4, desc:'効果のない駒（音無）。手からは「積む」ことでしか出すことができない。塔の駒が全部音無（または全部言霊）だと「染め加点」+1点になる。' }
];
const YAKU_GUIDE = [
  { group:'基本役', note:'追加点（高さ加点・染め加点）が付きます。', items:[
    { name:'桜花', pts:'基礎2点', cond:'同じ重さの駒が3段以上重なった塔。', ex:['四','四','四'] },
    { name:'蓮花', pts:'基礎1点', cond:'重さが連続した駒が3段以上重なった塔。', ex:['三','二','一'] },
    { name:'奇数蓮花', pts:'基礎1点', cond:'奇数の重さが連続して3段以上重なった塔（例：1・3・5）。', ex:['五','三','一'] },
    { name:'偶数蓮花', pts:'基礎1点', cond:'偶数の重さが連続して3段以上重なった塔（例：2・4・6）。', ex:['六','四','二'] }
  ]},
  { group:'組み合わせ役', note:'必ず6段の塔で成立します。追加点（高さ加点・染め加点）が付きます。', items:[
    { name:'桜蓮花', pts:'基礎3点', cond:'下3段が蓮花、上3段が桜花の塔。', ex:['四','三','二','二','二','二'], exNote:'下3段が四→三→二の蓮花、上3段が二の桜花です。' },
    { name:'蓮桜花', pts:'基礎3点', cond:'下3段が桜花、上3段が蓮花の塔。', ex:['五','五','五','三','二','一'], exNote:'下3段が五の桜花、上3段が三→二→一の蓮花です。' },
    { name:'桜々花', pts:'基礎4点', cond:'6段すべて同じ重さの塔。', ex:['三','三','三','三','三','三'] },
    { name:'蓮々花', pts:'基礎2点', cond:'6段すべて連続した重さの塔。', ex:['六','五','四','三','二','一'] }
  ]},
  { group:'特殊役', note:'必ず6段の塔で成立します。追加点は付きません。', items:[
    { name:'山茶花', pts:'基礎4点', cond:'同じ重さの駒2枚ずつのペアが3組ある塔（ペア同士の重さは同じでもよい）。', ex:['四','四','一','一','一','一'] },
    { name:'椿', pts:'基礎6点', cond:'同じ駒2枚ずつのペアが3組ある塔。', ex:['霧','霧','陣','陣','雷','雷'], exNote:'同じ言霊のペアが3組（霧・陣・雷）ある例です。' }
  ]},
  { group:'雷神役', note:'必ず6段の塔で成立します。追加点は付きません。', items:[
    { name:'時雨蓮花', yomi:'しぐれれんげ', pts:'基礎10点', cond:'上から斬・陣・轟・霧・瞬・浄の6段。', ex:['浄','瞬','霧','轟','陣','斬'], exNote:'言霊6種が1つずつ、重い順に並びます。' },
    { name:'霞・双頭蓮', yomi:'かすみ・そうとうれん', pts:'基礎11点', cond:'上から轟・轟・轟・霧・瞬・浄の6段。', ex:['浄','瞬','霧','轟','轟','轟'] },
    { name:'桜花乱舞', yomi:'おうからんぶ', pts:'基礎11点', cond:'轟3個と五3個が交互に重なった6段（轟と五のどちらが一番下でもよい）。', ex:['轟','五','轟','五','轟','五'], exNote:'どれも重さ5なので、交互に積んでも不穏の塔にはなりません。' },
    { name:'霧幻輪廻', yomi:'むげんりんね', pts:'基礎12点', cond:'霧3個と六3個が交互に重なった6段（霧と六のどちらが一番下でもよい）。', ex:['霧','六','霧','六','霧','六'] },
    { name:'毘沙門櫓', yomi:'びしゃもんやぐら', pts:'基礎12点', cond:'斬6個の6段。', ex:['斬','斬','斬','斬','斬','斬'] },
    { name:'六花白雪', yomi:'りっかしらゆき', pts:'基礎12点', cond:'上から六・六・霧・霧・瞬・瞬の6段。', ex:['瞬','瞬','霧','霧','六','六'], exNote:'2人戦では瞬は2個しかないので、2個とも集める必要があります。' },
    { name:'雷神役の決まり', pts:'', cond:'決められた駒6個がそろった6段の塔だけで成立する、最上位の役です。高さ加点・染め加点は付きません。ほかの役にも当てはまる時は、雷神役が優先されます。狙って作るのは難しいですが、引き次第では届くこともあります。' }
  ]},
  { group:'追加点', note:'', items:[
    { name:'高さ加点', pts:'最大+3点', cond:'塔が4段以上の時、4段目から1段ごとに+1点（最大+3点）。基本役と組み合わせ役に付く。' },
    { name:'染め加点', pts:'+1点', cond:'塔の駒が全て言霊、または全て音無の時+1点。基本役と組み合わせ役に付く。' }
  ]},
  { group:'役無し・その他', note:'', items:[
    { name:'役無し', pts:'0点', cond:'どの役にも当てはまらない塔は「役無し」で0点。' },
    { name:'不穏の塔', pts:'0点', cond:'重さの順番（下ほど重い）が崩れた塔は「不穏の塔」。解放されると0点で、陽玉を1つ失う。' },
    { name:'役が重なった時', pts:'', cond:'1つの塔が複数の役に当てはまる時は、雷神役＞基本役＞特殊役＞組み合わせ役の順で、一番上の役だけが点になる。' }
  ]}
];
function guideTileHtml(k){
  return '<div class="tile ' + k.kind + '"><span class="w">' + k.w + '</span>' + esc(k.name) + '</div>';
}
function closeGuideDetail(){ document.getElementById('guideDetailRoot').innerHTML = ''; }
function closeGuide(){ closeGuideDetail(); document.getElementById('guideRoot').innerHTML = ''; }
function openKomaDetail(idx){
  const k = KOMA_GUIDE[idx];
  if(!k) return;
  let h = '<div class="guide-back detail"><div class="guide-box small" role="dialog" aria-label="' + esc(k.name) + 'の解説">';
  h += '<h3 class="serif">' + (k.kind === 'on' ? '音無「' + esc(k.name) + '」' : '「' + esc(k.name) + '」') + 'の解説</h3>';
  h += '<div class="guide-detail-tile">' + guideTileHtml(k) + '</div>';
  h += '<div class="guide-badges"><span class="guide-badge">' + (k.kind === 'on' ? '音無' : '言霊') + '</span>' +
       '<span class="guide-badge">×' + k.n + '個</span><span class="guide-badge">重さ ' + k.w + '</span>' +
       (k.badge ? '<span class="guide-badge warn">' + esc(k.badge) + '</span>' : '') + '</div>';
  h += '<p class="guide-desc">' + esc(k.desc) + '</p>';
  if(k.note) h += '<div class="guide-note">' + esc(k.note) + '</div>';
  h += '<div class="btn-row"><button type="button" class="btn primary" data-guide-back>駒一覧に戻る</button></div>';
  h += '</div></div>';
  const root = document.getElementById('guideDetailRoot');
  root.innerHTML = h;
  root.querySelector('[data-guide-back]').addEventListener('click', closeGuideDetail);
  root.querySelector('.guide-back').addEventListener('click', function(e){ if(e.target === e.currentTarget) closeGuideDetail(); });
}
/* 例の塔の駒1枚分のタイルHTML。数字は音無（漢数字→重さ）、言霊名は言霊として描く */
function yakuExTileHtml(name){
  const gen = KOMA_GUIDE.find(function(k){ return k.kind === 'gen' && k.name === name; });
  if(gen) return guideTileHtml(gen);
  return guideTileHtml({ kind:'on', name:name, w:KANJI_NUM.indexOf(name) });
}
/* 例の塔の図：ex は下（1段目）から上への順。表示は上から下へ積む */
function yakuTowerHtml(it){
  let tiles = '';
  for(let i = it.ex.length - 1; i >= 0; i--) tiles += yakuExTileHtml(it.ex[i]);
  let h = '<div class="tower-fig"><div class="tower-fig-label">例の塔</div>';
  h += '<div class="tower-fig-body"><div class="tower-side"><span>上</span><span>下</span></div>';
  h += '<div><div class="tower-stack">' + tiles + '</div><div class="tower-base"></div></div>';
  h += '<div class="tower-side"><span>' + it.ex.length + '段目</span><span>1段目</span></div></div>';
  h += '<p class="tower-cap">下が1段目です。' + (it.exNote ? esc(it.exNote) : '') + '</p></div>';
  return h;
}
function openYakuDetail(gi, ii){
  const g = YAKU_GUIDE[gi];
  if(!g) return;
  const it = g.items[ii];
  if(!it) return;
  let h = '<div class="guide-back detail"><div class="guide-box small" role="dialog" aria-label="' + esc(it.name) + 'の解説">';
  h += '<h3 class="serif">「' + esc(it.name) + '」</h3>';
  h += '<div class="guide-badges"><span class="guide-badge">' + esc(g.group) + '</span>' +
       (it.pts ? '<span class="guide-badge">' + esc(it.pts) + '</span>' : '') + '</div>';
  h += '<p class="guide-desc">' + esc(it.cond) + '</p>';
  if(g.note) h += '<div class="guide-note">' + esc(g.note) + '</div>';
  if(it.ex) h += yakuTowerHtml(it);
  h += '<div class="btn-row"><button type="button" class="btn primary" data-guide-back>役一覧に戻る</button></div>';
  h += '</div></div>';
  const root = document.getElementById('guideDetailRoot');
  root.innerHTML = h;
  root.querySelector('[data-guide-back]').addEventListener('click', closeGuideDetail);
  root.querySelector('.guide-back').addEventListener('click', function(e){ if(e.target === e.currentTarget) closeGuideDetail(); });
}
let komaTab = 'koma'; // 駒一覧のタブ：'koma'＝言霊・音無、'ougi'＝奥義駒
function ougiTileHtml(o){
  return '<div class="tile ougi"><span class="w">' + o.w + '</span>' + esc(o.name) + '</div>';
}
function ougiTypeLabel(t){ return t + '奥義'; }
function openOugiDetail(name){
  const o = ougiByName(name);
  if(!o) return;
  let h = '<div class="guide-back detail"><div class="guide-box small" role="dialog" aria-label="奥義駒' + esc(o.name) + 'の解説">';
  h += '<h3 class="serif">奥義駒「' + esc(o.name) + '」</h3>';
  h += '<div class="guide-detail-tile">' + ougiTileHtml(o) + '</div>';
  h += '<p class="ougi-owner">' + esc(o.raijinName) + '【' + esc(o.ougiName) + '】</p>';
  h += '<div class="guide-badges"><span class="guide-badge">奥義駒</span><span class="guide-badge">重さ ' + o.w + '</span>';
  o.types.forEach(function(t){ h += '<span class="guide-badge ougi-type">' + esc(ougiTypeLabel(t)) + '</span>'; });
  if(o.kyogiChanged) h += '<span class="guide-badge warn">競技雷轟で変更</span>';
  if(o.kyogiBanned) h += '<span class="guide-badge warn">公式大会では使用禁止</span>';
  if(o.basicSet) h += '<span class="guide-badge">基本セットの駒</span>';
  h += '</div>';
  h += '<p class="guide-desc">' + esc(o.text) + '</p>';
  if(o.notes && o.notes.length){
    h += '<div class="guide-note ougi-notes">' + o.notes.map(function(n){ return '<div>※' + esc(n) + '</div>'; }).join('') + '</div>';
  }
  if(o.textOld){
    h += '<details class="ougi-old"><summary>変更前のテキスト</summary><p>' + esc(o.textOld) + '</p></details>';
  }
  h += '<div class="btn-row"><button type="button" class="btn primary" data-guide-back>駒一覧に戻る</button></div>';
  h += '</div></div>';
  const root = document.getElementById('guideDetailRoot');
  root.innerHTML = h;
  root.querySelector('[data-guide-back]').addEventListener('click', closeGuideDetail);
  root.querySelector('.guide-back').addEventListener('click', function(e){ if(e.target === e.currentTarget) closeGuideDetail(); });
}
function komaTabHtml(){
  let h = '<h4>言霊（9種）</h4><div class="guide-grid">';
  KOMA_GUIDE.forEach(function(k, i){ if(k.kind !== 'gen') return;
    h += '<button type="button" class="koma-card" data-koma="' + i + '" aria-label="' + esc(k.name) + 'の解説を開く">' + guideTileHtml(k) +
         '<span class="koma-meta"><span class="koma-name">' + esc(k.name) + '</span><br><span class="koma-sub">×' + k.n + '個 ・ 重さ' + k.w + (k.badge ? ' ・ ' + esc(k.badge) : '') + '</span></span><span class="koma-go">解説 ›</span></button>';
  });
  h += '</div><h4>音無（8種）</h4><div class="guide-grid">';
  KOMA_GUIDE.forEach(function(k, i){ if(k.kind !== 'on') return;
    h += '<button type="button" class="koma-card" data-koma="' + i + '" aria-label="音無' + esc(k.name) + 'の解説を開く">' + guideTileHtml(k) +
         '<span class="koma-meta"><span class="koma-name">音無「' + esc(k.name) + '」</span><br><span class="koma-sub">×' + k.n + '個 ・ 重さ' + k.w + '</span></span><span class="koma-go">解説 ›</span></button>';
  });
  h += '</div>';
  return h;
}
function ougiTabHtml(){
  let h = '<div class="guide-note">奥義駒は競技雷轟（準備中）で使う駒です。今の対戦ではまだ使えません。全て重さ9の言霊です。</div>';
  RAIJIN_DATA.forEach(function(r){
    h += '<h4>' + esc(r.gen) + ' ' + esc(r.name) + '【' + esc(r.ougi) + '】' + (r.kyogiBanned ? '<span class="ougi-h4-note">公式大会では使用禁止</span>' : '') + '</h4>';
    h += '<div class="guide-grid">';
    r.pieces.forEach(function(name){
      const o = ougiByName(name);
      if(!o) return;
      const sub = (o.types.length ? o.types.map(ougiTypeLabel).join('・') : '奥義駒') + (o.kyogiChanged ? '＊' : '');
      h += '<button type="button" class="koma-card" data-ougi="' + esc(o.name) + '" aria-label="奥義駒' + esc(o.name) + 'の解説を開く">' + ougiTileHtml(o) +
           '<span class="koma-meta"><span class="koma-name">' + esc(o.name) + '</span><br><span class="koma-sub">' + esc(sub) + '</span></span><span class="koma-go">解説 ›</span></button>';
    });
    h += '</div>';
  });
  return h;
}
function openKomaList(tab){
  closeGuideDetail();
  if(tab === 'koma' || tab === 'ougi') komaTab = tab;
  let h = '<div class="guide-back"><div class="guide-box" role="dialog" aria-label="駒一覧">';
  h += '<h3 class="serif">駒一覧</h3>';
  h += '<div class="guide-tabs" role="tablist">' +
       '<button type="button" role="tab" class="guide-tab' + (komaTab === 'koma' ? ' on' : '') + '" data-koma-tab="koma" aria-selected="' + (komaTab === 'koma') + '">言霊・音無</button>' +
       '<button type="button" role="tab" class="guide-tab' + (komaTab === 'ougi' ? ' on' : '') + '" data-koma-tab="ougi" aria-selected="' + (komaTab === 'ougi') + '">奥義駒</button></div>';
  if(komaTab === 'koma'){
    h += '<div class="guide-note"><b>注意：</b>' + esc(GUIDE_NOTE) + '</div>';
    h += '<p class="guide-total">言霊 37個 ・ 音無 32個 ・ 計69個　―　駒を押すと解説が開きます。</p>';
    h += komaTabHtml();
  } else {
    h += '<p class="guide-total">奥義駒 ' + OUGI_DATA.length + '個（雷神12人×3駒＋天魔3駒）　―　駒を押すと効果の全文が開きます。＊は競技雷轟でテキストが変わった駒です。</p>';
    h += ougiTabHtml();
  }
  h += '<div class="btn-row"><button type="button" class="btn primary" data-guide-close>閉じる</button></div>';
  h += '</div></div>';
  const root = document.getElementById('guideRoot');
  root.innerHTML = h;
  root.querySelector('[data-guide-close]').addEventListener('click', closeGuide);
  root.querySelector('.guide-back').addEventListener('click', function(e){ if(e.target === e.currentTarget) closeGuide(); });
  root.querySelectorAll('[data-koma-tab]').forEach(function(b){
    b.addEventListener('click', function(){ openKomaList(b.getAttribute('data-koma-tab')); root.querySelector('.guide-back').scrollTop = 0; });
  });
  root.querySelectorAll('[data-koma]').forEach(function(b){
    b.addEventListener('click', function(){ openKomaDetail(parseInt(b.getAttribute('data-koma'), 10)); });
  });
  root.querySelectorAll('[data-ougi]').forEach(function(b){
    b.addEventListener('click', function(){ openOugiDetail(b.getAttribute('data-ougi')); });
  });
}
function openYakuList(){
  closeGuideDetail();
  let h = '<div class="guide-back"><div class="guide-box" role="dialog" aria-label="役一覧">';
  h += '<h3 class="serif">役一覧</h3>';
  h += '<div class="guide-note"><b>注意：</b>' + esc(GUIDE_NOTE) + '</div>';
  h += '<p class="guide-total">役を押すと、説明と「例の塔」の図が開きます（雷神役など、図のないものもあります）。</p>';
  YAKU_GUIDE.forEach(function(g, gi){
    h += '<h4>' + esc(g.group) + '</h4>';
    if(g.note) h += '<p class="sub" style="margin:2px 0 8px;">' + esc(g.note) + '</p>';
    g.items.forEach(function(it, ii){
      h += '<button type="button" class="yaku-row" data-yaku="' + gi + '-' + ii + '" aria-label="' + esc(it.name) + 'の解説を開く"><span class="yaku-head"><span class="yaku-name">' + esc(it.name) + '</span>' +
           (it.pts ? '<span class="yaku-pts">' + esc(it.pts) + '</span>' : '') + '<span class="yaku-go">' + (it.ex ? '例の塔 ›' : '詳細 ›') + '</span></span>' +
           '<span class="yaku-cond" style="display:block;">' + esc(it.cond) + '</span></button>';
    });
  });
  h += '<div class="btn-row"><button type="button" class="btn primary" data-guide-close>閉じる</button></div>';
  h += '</div></div>';
  const root = document.getElementById('guideRoot');
  root.innerHTML = h;
  root.querySelector('[data-guide-close]').addEventListener('click', closeGuide);
  root.querySelector('.guide-back').addEventListener('click', function(e){ if(e.target === e.currentTarget) closeGuide(); });
  root.querySelectorAll('[data-yaku]').forEach(function(b){
    b.addEventListener('click', function(){
      const parts = b.getAttribute('data-yaku').split('-');
      openYakuDetail(parseInt(parts[0], 10), parseInt(parts[1], 10));
    });
  });
}
[['menuSettingsBtn', openSettings], ['startSettingsBtn', openSettings], ['menuStatsBtn', openStats], ['startStatsBtn', openStats],
 ['menuKomaBtn', function(){ openKomaList(); }], ['startKomaBtn', function(){ openKomaList(); }], ['menuYakuBtn', openYakuList], ['startYakuBtn', openYakuList]].forEach(function(pair){
  const el = document.getElementById(pair[0]);
  if(el) el.addEventListener('click', function(){
    const d = document.getElementById('menuDetails');
    if(d) d.removeAttribute('open');
    pair[1]();
  });
});


