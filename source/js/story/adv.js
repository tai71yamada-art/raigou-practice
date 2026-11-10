/* ================= ストーリーモードのADV（物語を読む画面） =================
   文字送り・オート・スキップ・ログ・選択肢・セーブ／ロード（20枠）・設定。
   画面は #advRoot の中だけで完結し、対戦に入る時は STORY_BATTLE に渡す。
   セーブは端末に保存（練習モードの設定や途中保存とは別の場所）。 */
const ADV = (function(){
  const KEY = 'raigou.story.v1';
  const MEM = {};
  const store = {
    get: function(k, d){ try{ const v = localStorage.getItem(KEY + '.' + k); return v === null ? (k in MEM ? MEM[k] : d) : JSON.parse(v); }catch(e){ return k in MEM ? MEM[k] : d; } },
    set: function(k, v){ MEM[k] = v; try{ if(v === null) localStorage.removeItem(KEY + '.' + k); else localStorage.setItem(KEY + '.' + k, JSON.stringify(v)); }catch(e){} }
  };
  const CONF = Object.assign({ speed:6, auto:5, alpha:82, skip:'read', fx:'on' }, store.get('conf', {}));
  const READ = new Set(store.get('read', []));
  const SLOT_PAGES = 3, SLOT_PER_PAGE = 6;
  const SLOT_ALL = ['q', 'auto'].concat(Array.from({ length:SLOT_PAGES * SLOT_PER_PAGE }, function(_, k){ return k + 1; }));

  /* 進行の状態：ch＝章の番号、i＝台本の何行目か */
  const S = { ch:0, i:0, bg:'black', chars:{}, speaker:null, flags:{}, log:[] };
  let typing = null, waiting = false, autoOn = false, skipOn = false, autoTimer = null, playing = false, lastSay = 0, gate = null;
  let root = null;
  const $ = function(id){ return document.getElementById('adv' + id); };
  function chapter(){ return STORY_CHAPTERS[S.ch]; }
  function script(){ return chapter().script; }
  function labelIndex(name){ const sc = script(); for(let k = 0; k < sc.length; k++) if(sc[k].label === name) return k; return sc.length; }
  function hash(str){ let h = 5381; for(let k = 0; k < str.length; k++) h = ((h << 5) + h + str.charCodeAt(k)) | 0; return (h >>> 0).toString(36); }
  function lineKey(c){ return chapter().id + ':' + hash(c.text); }

  /* ---------- 画面の骨組み ---------- */
  function build(){
    if(root) return;
    root = document.createElement('div');
    root.id = 'advRoot'; root.hidden = true;
    root.innerHTML =
      '<div id="advScreen">' +
        '<div id="advBg" class="av-bg av-bg-black"></div><div class="av-bg-label" id="advBgLabel"></div>' +
        '<div id="advChars"></div><div id="advTap"></div><div id="advFlash"></div><div id="advMode"></div>' +
        '<div id="advChoices"></div>' +
        '<div id="advUi">' +
          '<div id="advTools">' +
            [['auto','オート'],['skip','スキップ'],['log','ログ'],['qsave','Qセーブ'],['qload','Qロード'],['save','セーブ'],['load','ロード'],['hide','隠す'],['menu','設定']]
              .map(function(x){ return '<button type="button" class="av-tb" data-t="' + x[0] + '">' + x[1] + '</button>'; }).join('') +
          '</div>' +
          '<div id="advWin"><div id="advName"></div><div id="advText"></div><div id="advNext">▼</div></div>' +
        '</div>' +
        '<div class="av-ov" id="advLogOv"><h2>ログ</h2><div class="av-body" id="advLogBody"></div><div class="av-foot"><button type="button" class="av-btn primary" data-close="LogOv">閉じる</button></div></div>' +
        '<div class="av-ov" id="advSlotOv"><h2 id="advSlotTitle">セーブ</h2><div class="av-tabs" id="advSlotTabs"></div><div class="av-body"><div class="av-slots" id="advSlotList"></div></div><div class="av-foot"><button type="button" class="av-btn primary" data-close="SlotOv">閉じる</button></div></div>' +
        '<div class="av-ov" id="advConfOv"><h2>物語の設定</h2><div class="av-body">' +
          '<div class="av-set"><label>文字の速さ<span id="advVSpeed"></span></label><input type="range" id="advCSpeed" min="0" max="10" step="1"><div class="av-preview" id="advCPreview"></div></div>' +
          '<div class="av-set"><label>オートの待ち時間<span id="advVAuto"></span></label><input type="range" id="advCAuto" min="0" max="10" step="1"></div>' +
          '<div class="av-set"><label>メッセージ窓の濃さ<span id="advVAlpha"></span></label><input type="range" id="advCAlpha" min="30" max="100" step="5"></div>' +
          '<div class="av-set"><label>スキップする文章</label><div class="av-seg" id="advCSkip"><button type="button" data-v="read">読んだ文章だけ</button><button type="button" data-v="all">全部</button></div></div>' +
          '<div class="av-set"><label>画面の揺れ・光</label><div class="av-seg" id="advCFx"><button type="button" data-v="on">あり</button><button type="button" data-v="off">なし</button></div></div>' +
          '<p class="av-note">音（BGM・効果音）のオン・オフは、スタート画面の「設定」で変えられます。</p>' +
        '</div><div class="av-foot"><button type="button" class="av-btn" id="advCTitle">タイトルへ</button><button type="button" class="av-btn primary" data-close="ConfOv">閉じる</button></div></div>' +
        '<div id="advDlg"><div class="av-box"><p id="advDlgText"></p><div class="av-foot" id="advDlgFoot"></div></div></div>' +
        '<div id="advToast"></div>' +
      '</div>';
    document.body.appendChild(root);
    $('Tap').addEventListener('click', onTap);
    $('Win').addEventListener('click', onTap);
    $('Tools').addEventListener('click', function(ev){
      const b = ev.target.closest('[data-t]'); if(!b) return;
      ev.stopPropagation();
      const t = b.getAttribute('data-t');
      if(t !== 'auto' && t !== 'skip') stopModes();
      if(t === 'auto') toggleAuto();
      else if(t === 'skip') toggleSkip();
      else if(t === 'log') openLog();
      else if(t === 'save') openSlots('save');
      else if(t === 'load') openSlots('load');
      else if(t === 'qsave') quickSave();
      else if(t === 'qload') quickLoad();
      else if(t === 'hide') $('Ui').classList.add('hidden');
      else if(t === 'menu') openConf();
    });
    root.querySelectorAll('[data-close]').forEach(function(b){
      b.addEventListener('click', function(){ $(b.getAttribute('data-close')).classList.remove('show'); if(!playing) exit(); });
    });
    $('CTitle').addEventListener('click', function(){ confirmDlg('タイトルに戻りますか？\nセーブしていない所は失われます。', '戻る', exit); });
    document.addEventListener('keydown', function(e){
      if(!playing || root.hidden || root.querySelector('.av-ov.show')) return;
      if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); onTap(); }
    });
    /* アプリから離れた時は、オート・スキップを止めてオートセーブ */
    document.addEventListener('visibilitychange', function(){ if(document.hidden && playing && !root.hidden){ stopModes(); autoSave(); } });
    applyConf();
  }
  function applyConf(){ root.style.setProperty('--av-alpha', (CONF.alpha / 100).toFixed(2)); }
  function charDelay(){ return CONF.speed >= 10 ? 0 : Math.round(80 - CONF.speed * 7.5); }
  function autoWait(len){ return 600 + (10 - CONF.auto) * 180 + len * (40 + (10 - CONF.auto) * 6); }

  /* ---------- 背景・立ち絵・名前 ---------- */
  function bgStyle(el, name){
    const b = STORY_BG[name] || STORY_BG.black;
    el.className = 'av-bg av-bg-' + (STORY_BG[name] ? name : 'black');
    el.style.backgroundImage = b.img ? 'url(' + b.img + ')' : '';
    el.classList.toggle('has-img', !!b.img);
  }
  function drawBg(){ bgStyle($('Bg'), S.bg); $('BgLabel').textContent = (STORY_BG[S.bg] || {}).label || ''; }
  function drawChars(){
    const box = $('Chars');
    Object.keys(STORY_CHARA).forEach(function(id){
      let el = box.querySelector('[data-ch="' + id + '"]');
      const pos = S.chars[id];
      if(!el){
        if(!pos) return;   // 絵は、初めて出る時に読み込む
        el = document.createElement('div'); el.className = 'av-ch'; el.setAttribute('data-ch', id);
        el.innerHTML = '<img alt="" src="' + storyCharaImg(id) + '">'; box.appendChild(el);
        void el.offsetWidth;
      }
      el.classList.toggle('on', !!pos);
      if(pos){ el.classList.remove('pos-left', 'pos-center', 'pos-right'); el.classList.add('pos-' + pos); }
      el.classList.toggle('speak', !!pos && (S.speaker === id || !S.speaker || Object.keys(S.chars).length === 1));
    });
  }
  function setName(id){
    const n = $('Name'), c = id && STORY_CHARA[id];
    if(!c){ n.innerHTML = ''; return; }
    n.style.setProperty('--nc', c.color);
    n.innerHTML = (c.house ? houseIconHtml(c.house) : '') + esc(c.name);
  }

  /* ---------- 文章の表示 ---------- */
  function showText(str, narr, done){
    const el = $('Text');
    el.classList.toggle('narr', !!narr);
    $('Next').classList.remove('show');
    function finish(){
      if(typing){ clearInterval(typing.id); typing = null; }
      el.textContent = str;
      $('Next').classList.add('show');
      waiting = true;
      if(done) done();
    }
    const d = skipOn ? 0 : charDelay();
    if(d === 0){ finish(); return; }
    let k = 0; el.textContent = '';
    typing = { finish: finish };
    typing.id = setInterval(function(){ k++; el.textContent = str.slice(0, k); if(k >= str.length) finish(); }, d);
  }
  function clearTyping(){ if(typing){ clearInterval(typing.id); typing = null; } }

  /* ---------- 台本を進める ---------- */
  function step(){
    waiting = false; clearTimeout(autoTimer);
    const sc = script();
    while(S.i < sc.length){
      const c = sc[S.i];
      if(c.if && !S.flags[c.if]){ S.i++; continue; }
      if(c.ifnot && S.flags[c.ifnot]){ S.i++; continue; }
      if(c.label){ S.i++; continue; }
      if(c.jump){ S.i = labelIndex(c.jump); continue; }
      if(c.set){ S.flags[c.set] = true; S.i++; continue; }
      if(c.bg){ S.bg = c.bg; drawBg(); S.i++; continue; }
      if(c.show){ S.chars[c.show] = c.pos || 'center'; S.i++; drawChars(); continue; }
      if(c.hide){ delete S.chars[c.hide]; S.i++; drawChars(); continue; }
      if(c.fx){ S.i++; doFx(c.fx); continue; }
      if(c.end) break;
      if(c.choice){ showChoice(c.choice); return; }
      if(c.battle){ showBattleGate(c.battle); return; }
      if(c.text !== undefined){ sayLine(c); return; }
      S.i++;
    }
    chapterEnd();
  }
  function chapterEnd(){
    stopModes();
    const cleared = store.get('cleared', []);
    if(cleared.indexOf(chapter().id) < 0){ cleared.push(chapter().id); store.set('cleared', cleared); }
    if(S.ch + 1 < STORY_CHAPTERS.length){
      S.ch++; S.i = 0; S.chars = {}; S.speaker = null; S.bg = 'black';
      setName(null); $('Text').textContent = ''; drawBg(); drawChars();
      S.log.push({ n:'', c:'', t:'― ' + chapter().title + ' ―', mark:true });
      step();
      return;
    }
    playing = false;
    infoDlg('「' + chapter().title + '」はここまでです。\n物語のつづきは、準備中です。', 'タイトルへ', exit);
  }
  function sayLine(c){
    const idx = S.i;
    lastSay = idx;   // 表示中の行（セーブすると、この行から再開する）
    S.speaker = c.say || null;
    drawChars(); setName(c.say);
    const ch = c.say ? STORY_CHARA[c.say] : null;
    S.log.push({ n: ch ? ch.name : '', c: ch ? ch.color : '', t:c.text });
    if(S.log.length > 200) S.log.shift();
    const key = lineKey(c);
    if(skipOn && CONF.skip === 'read' && !READ.has(key)){ stopModes(); toast('まだ読んでいない文章なので、スキップを止めました'); }
    showText(c.text, !c.say, function(){
      if(!READ.has(key)){ READ.add(key); store.set('read', Array.from(READ)); }
      S.i = idx + 1;
      if(skipOn) autoTimer = setTimeout(step, 70);
      else if(autoOn) autoTimer = setTimeout(step, autoWait(c.text.length));
    });
  }
  function doFx(kind){
    if(CONF.fx === 'off' || skipOn || REDUCED_MOTION) return;
    const el = kind === 'flash' ? $('Flash') : $('Screen');
    const cls = kind === 'flash' ? 'go' : 'shake';
    el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls);
  }
  function showChoice(list){
    stopModes();
    const box = $('Choices');
    box.innerHTML = list.map(function(o, k){ return '<button type="button" class="av-cbtn" data-k="' + k + '">' + esc(o.text) + '</button>'; }).join('');
    box.classList.add('show');
    autoSave();
    box.querySelectorAll('[data-k]').forEach(function(b){
      b.addEventListener('click', function(ev){
        ev.stopPropagation();
        const o = list[+b.getAttribute('data-k')];
        box.classList.remove('show');
        S.log.push({ n:'', c:'', t:'▶ ' + o.text.replace(/[「」]/g, ''), mark:true });
        S.i = labelIndex(o.jump);
        step();
      });
    });
  }
  /* 対戦の入り口：ここでオートセーブし、「対戦を始める」を押すと対戦へ */
  function battleLabel(b){
    const opp = b.opp && HOUSE_CHARA[b.opp] ? HOUSE_CHARA[b.opp] : 'AI';
    return { opp: opp, rule: (RULESETS[b.rule] || RULESETS.basic).label, lv: 'Lv.' + String(b.level || 'lv1').replace('lv', '') };
  }
  function showBattleGate(b){
    stopModes();
    gate = b;
    const L = battleLabel(b), box = $('Choices');
    box.innerHTML = '<div class="av-gate"><small>BATTLE</small><b>' + esc(b.title || '対戦') + '</b>' +
      '<span>相手：' + esc(L.opp) + '</span><span>' + esc(L.rule) + '・相手の強さ ' + esc(L.lv) + '・' + (b.sente !== false ? '先手' : '後手') + '</span>' +
      '<span class="av-gate-note">勝つと物語が進みます。負けた時は、この対戦をやり直せます。</span></div>' +
      '<button type="button" class="av-cbtn go" id="advGateGo">対戦を始める</button>';
    box.classList.add('show');
    autoSave();
    $('GateGo').addEventListener('click', function(ev){
      ev.stopPropagation();
      box.classList.remove('show');
      STORY_BATTLE.start(b);   // 対戦画面に切り替わる時に、この画面は隠れる（launchBattle → ADV.hide）
    });
  }
  /* 対戦に勝って戻ってきた時 */
  function afterBattle(){
    build();
    document.getElementById('startScreen').hidden = true;
    root.hidden = false;
    BGM.stop();
    if(gate){
      S.log.push({ n:'', c:'', t:'▶ ' + (gate.title || '対戦') + 'に勝利', mark:true });
      gate = null;
    }
    S.i++;
    playing = true;
    step();
  }

  /* ---------- タップ・オート・スキップ ---------- */
  function overlayOpen(){ return $('Choices').classList.contains('show'); }
  function onTap(){
    if(!playing) return;
    if($('Ui').classList.contains('hidden')){ $('Ui').classList.remove('hidden'); return; }
    if(autoOn || skipOn){ stopModes(); return; }
    if(overlayOpen()) return;
    if(typing){ typing.finish(); return; }
    if(waiting) step();
  }
  function stopModes(){ autoOn = false; skipOn = false; clearTimeout(autoTimer); drawModes(); }
  function drawModes(){
    if(!root) return;
    root.querySelector('[data-t="auto"]').classList.toggle('on', autoOn);
    root.querySelector('[data-t="skip"]').classList.toggle('on', skipOn);
    const m = $('Mode'); m.style.display = (autoOn || skipOn) ? 'block' : 'none'; m.textContent = autoOn ? 'オート' : 'スキップ中';
  }
  function toggleAuto(){
    if(overlayOpen()) return;
    skipOn = false; autoOn = !autoOn; drawModes();
    if(autoOn && !typing && waiting) autoTimer = setTimeout(step, 400);
  }
  function toggleSkip(){
    if(overlayOpen()) return;
    autoOn = false; skipOn = !skipOn; drawModes();
    if(skipOn){ if(typing) typing.finish(); else if(waiting) step(); }
  }

  /* ---------- セーブ／ロード ---------- */
  function snapshot(){
    const last = S.log.length ? S.log[S.log.length - 1] : null;
    const i = overlayOpen() ? S.i : ((waiting || typing) ? lastSay : S.i);
    const c = script()[i] || {};
    return { v:1, ch: chapter().id, i:i, key: c.text !== undefined ? c.text : (c.choice ? '?choice' : (c.battle ? '?battle' : '')),
             bg:S.bg, chars:Object.assign({}, S.chars), speaker:S.speaker, flags:Object.assign({}, S.flags),
             title: chapter().title + (c.battle ? '（対戦の前）' : ''), log:S.log.slice(-60), at:Date.now(),
             text: c.battle ? '対戦：' + (c.battle.title || '') : (last ? (last.n ? last.n + '「' + last.t.replace(/\n/g, '') + '」' : last.t.replace(/\n/g, '')) : '') };
  }
  /* 台本を書き直して行がずれた時は、同じ文章の行を探して、そこから再開する */
  function locate(d){
    const sc = script();
    const keyOf = function(c){ return c.text !== undefined ? c.text : (c.choice ? '?choice' : (c.battle ? '?battle' : '')); };
    if(sc[d.i] && keyOf(sc[d.i]) === d.key) return d.i;
    let best = -1;
    sc.forEach(function(c, k){ if(d.key && keyOf(c) === d.key && (best < 0 || Math.abs(k - d.i) < Math.abs(best - d.i))) best = k; });
    return best >= 0 ? best : Math.min(d.i, Math.max(0, sc.length - 1));
  }
  function restore(d){
    build();
    stopModes(); clearTyping(); gate = null;
    $('Choices').classList.remove('show');
    const chIdx = STORY_CHAPTERS.findIndex(function(c){ return c.id === d.ch; });
    S.ch = chIdx >= 0 ? chIdx : 0;
    S.i = locate(d); S.bg = d.bg; S.chars = Object.assign({}, d.chars); S.speaker = d.speaker; S.flags = Object.assign({}, d.flags);
    const c = script()[S.i] || {};
    S.log = (d.log || []).slice(0, c.text !== undefined ? -1 : undefined);   // 再開する文章は、このあともう一度ログに入る
    $('Chars').innerHTML = '';
    drawBg(); drawChars(); setName(null); $('Text').textContent = '';
    enter();
    step();
  }
  function getSlot(n){ return store.get('slot.' + n, null); }
  function putSlot(n, d){ store.set('slot.' + n, d); }
  function hasSave(){ return SLOT_ALL.some(function(n){ return !!getSlot(n); }); }
  function latestSlot(){
    let best = null;
    SLOT_ALL.forEach(function(n){ const d = getSlot(n); if(d && (!best || d.at > best.d.at)) best = { n:n, d:d }; });
    return best;
  }
  function autoSave(){ if(playing) putSlot('auto', snapshot()); }
  function slotLabel(n){ return n === 'q' ? 'クイック' : (n === 'auto' ? 'オート' : 'No.' + n); }
  function fmtDate(t){ const d = new Date(t), p = function(x){ return (x < 10 ? '0' : '') + x; };
    return d.getFullYear() + '/' + p(d.getMonth() + 1) + '/' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()); }
  function thumbHtml(d){
    const b = STORY_BG[d.bg] || STORY_BG.black;
    let h = '<div class="av-bg av-bg-' + (STORY_BG[d.bg] ? d.bg : 'black') + (b.img ? ' has-img" style="background-image:url(' + b.img + ')' : '') + '"></div>';
    Object.keys(d.chars || {}).forEach(function(id){
      if(!STORY_CHARA[id]) return;
      const x = { left:'30%', center:'50%', right:'70%' }[d.chars[id]] || '50%';
      h += '<img class="av-mini" alt="" style="left:' + x + '" src="' + storyCharaImg(id) + '">';
    });
    return h + '<div class="av-mtext">' + esc(d.text || '') + '</div>';
  }
  let slotMode = 'save', slotPage = 0;
  function openSlots(mode){
    slotMode = mode;
    $('SlotTitle').textContent = mode === 'save' ? 'セーブ' : 'ロード';
    const L = latestSlot();
    if(L) slotPage = typeof L.n === 'number' ? Math.floor((L.n - 1) / SLOT_PER_PAGE) : (mode === 'load' ? 'extra' : slotPage);
    drawSlots(); $('SlotOv').classList.add('show');
  }
  function drawSlots(){
    const tabs = [];
    for(let p = 0; p < SLOT_PAGES; p++) tabs.push('<button type="button" class="av-tab' + (p === slotPage ? ' on' : '') + '" data-p="' + p + '">' + (p + 1) + '</button>');
    tabs.push('<button type="button" class="av-tab' + (slotPage === 'extra' ? ' on' : '') + '" data-p="extra">Q・オート</button>');
    $('SlotTabs').innerHTML = tabs.join('');
    $('SlotTabs').querySelectorAll('[data-p]').forEach(function(b){ b.addEventListener('click', function(){ const v = b.getAttribute('data-p'); slotPage = v === 'extra' ? 'extra' : +v; drawSlots(); }); });
    const nums = slotPage === 'extra' ? ['q', 'auto'] : Array.from({ length:SLOT_PER_PAGE }, function(_, k){ return slotPage * SLOT_PER_PAGE + k + 1; });
    const L = latestSlot();
    $('SlotList').innerHTML = nums.map(function(n){
      const d = getSlot(n);
      if(!d) return '<div class="av-slot empty" data-n="' + n + '" role="button" tabindex="0"><span class="av-no">' + slotLabel(n) + '</span><div class="av-thumb">空き</div><div class="av-meta"><b>―</b>&nbsp;</div></div>';
      return '<div class="av-slot' + (L && L.n === n ? ' latest' : '') + '" data-n="' + n + '" role="button" tabindex="0"><span class="av-no">' + slotLabel(n) + (L && L.n === n ? '・最新' : '') + '</span>' +
        (typeof n === 'number' ? '<button type="button" class="av-del" data-del="' + n + '">消す</button>' : '') +
        '<div class="av-thumb">' + thumbHtml(d) + '</div><div class="av-meta"><b>' + esc(d.title || '') + '</b>' + fmtDate(d.at) + '</div></div>';
    }).join('');
    $('SlotList').querySelectorAll('[data-n]').forEach(function(el){ el.addEventListener('click', function(){ slotAction(el.getAttribute('data-n')); }); });
    $('SlotList').querySelectorAll('[data-del]').forEach(function(el){
      el.addEventListener('click', function(ev){ ev.stopPropagation(); const n = +el.getAttribute('data-del');
        confirmDlg('No.' + n + 'のセーブを消しますか？', '消す', function(){ putSlot(n, null); drawSlots(); }); });
    });
  }
  function slotAction(nRaw){
    const n = (nRaw === 'q' || nRaw === 'auto') ? nRaw : +nRaw, d = getSlot(n);
    if(slotMode === 'save'){
      if(n === 'auto'){ toast('オートセーブの枠には、選択肢や対戦の前で自動で記録します'); return; }
      if(!playing){ toast('物語を始めてからセーブできます'); return; }
      const doSave = function(){ putSlot(n, snapshot()); drawSlots(); toast(slotLabel(n) + 'にセーブしました'); };
      if(d) confirmDlg(slotLabel(n) + 'に上書きしますか？', '上書きする', doSave); else doSave();
      return;
    }
    if(!d){ toast('この枠にはセーブがありません'); return; }
    const go = function(){ $('SlotOv').classList.remove('show'); restore(d); toast('ロードしました'); };
    if(playing) confirmDlg('ロードしますか？\n今の進み具合のうち、セーブしていない所は失われます。', 'ロードする', go); else go();
  }
  function quickSave(){ if(!playing) return; putSlot('q', snapshot()); toast('クイックセーブしました'); }
  function quickLoad(){
    const d = getSlot('q'); if(!d){ toast('クイックセーブがありません'); return; }
    confirmDlg('クイックセーブした所に戻りますか？', '戻る', function(){ restore(d); toast('クイックロードしました'); });
  }

  /* ---------- ログ ---------- */
  function openLog(){
    $('LogBody').innerHTML = S.log.map(function(l){
      if(l.mark) return '<div class="av-log av-log-mark">' + esc(l.t) + '</div>';
      return '<div class="av-log">' + (l.n ? '<div class="av-log-name" style="color:' + l.c + '">' + esc(l.n) + '</div>' : '') + '<div class="av-log-text">' + esc(l.t) + '</div></div>';
    }).join('') || '<p class="av-note">まだ文章がありません。</p>';
    $('LogOv').classList.add('show');
    const b = $('LogBody'); b.scrollTop = b.scrollHeight;
  }

  /* ---------- 設定 ---------- */
  let pvTimer = null;
  function previewText(){
    clearInterval(pvTimer);
    const s = 'この速さで文章が表示されます。', el = $('CPreview'), d = charDelay();
    if(d === 0){ el.textContent = s; return; }
    let k = 0; el.textContent = '';
    pvTimer = setInterval(function(){ k++; el.textContent = s.slice(0, k); if(k >= s.length) clearInterval(pvTimer); }, d);
  }
  function openConf(){
    const bind = function(name, key, fmt){
      const el = $('C' + name), v = $('V' + name);
      el.value = CONF[key];
      const show = function(){ v.textContent = fmt(+el.value); };
      show();
      el.oninput = function(){ CONF[key] = +el.value; show(); applyConf(); store.set('conf', CONF); if(key === 'speed') previewText(); };
    };
    bind('Speed', 'speed', function(v){ return v >= 10 ? '一瞬で表示' : v + ' / 10'; });
    bind('Auto', 'auto', function(v){ return v === 0 ? '長い' : (v === 10 ? '短い' : v + ' / 10'); });
    bind('Alpha', 'alpha', function(v){ return v + '%'; });
    const seg = function(name, key){
      $('C' + name).querySelectorAll('button').forEach(function(b){
        b.classList.toggle('on', b.getAttribute('data-v') === CONF[key]);
        b.onclick = function(){ CONF[key] = b.getAttribute('data-v'); store.set('conf', CONF); seg(name, key); };
      });
    };
    seg('Skip', 'skip'); seg('Fx', 'fx');
    $('ConfOv').classList.add('show');
    previewText();
  }

  /* ---------- お知らせ・確認 ---------- */
  function toast(t){ const el = $('Toast'); el.textContent = t; el.classList.add('show'); clearTimeout(el._t); el._t = setTimeout(function(){ el.classList.remove('show'); }, 1700); }
  function confirmDlg(text, okLabel, onOk){
    $('DlgText').textContent = text;
    $('DlgFoot').innerHTML = '<button type="button" class="av-btn primary" id="advDOk">' + esc(okLabel) + '</button><button type="button" class="av-btn" id="advDNo">やめる</button>';
    $('Dlg').classList.add('show');
    $('DOk').onclick = function(){ $('Dlg').classList.remove('show'); onOk(); };
    $('DNo').onclick = function(){ $('Dlg').classList.remove('show'); };
  }
  function infoDlg(text, okLabel, onOk){
    $('DlgText').textContent = text;
    $('DlgFoot').innerHTML = '<button type="button" class="av-btn primary" id="advDOk">' + esc(okLabel) + '</button>';
    $('Dlg').classList.add('show');
    $('DOk').onclick = function(){ $('Dlg').classList.remove('show'); onOk(); };
  }

  /* ---------- 出入り ---------- */
  function enter(){
    build();
    playing = true;
    document.getElementById('startScreen').hidden = true;
    closeStartSetting();
    root.hidden = false;
    $('Ui').classList.remove('hidden');
    BGM.stop();   // 物語の曲はまだ無いので、スタート画面の曲を止める
  }
  function exit(){
    playing = false; stopModes(); clearTyping(); gate = null;
    if(root){
      root.hidden = true;
      ['Choices', 'LogOv', 'SlotOv', 'ConfOv', 'Dlg'].forEach(function(id){ $(id).classList.remove('show'); });
    }
    document.getElementById('startScreen').hidden = false;
    setStartMode('select');
    BGM.title();
  }
  function newGame(){
    build();
    stopModes(); clearTyping(); gate = null;
    Object.assign(S, { ch:0, i:0, bg:'black', chars:{}, speaker:null, flags:{}, log:[] });
    $('Chars').innerHTML = ''; $('Choices').classList.remove('show');
    $('Text').textContent = ''; setName(null); drawBg(); drawChars();
    S.log.push({ n:'', c:'', t:'― ' + chapter().title + ' ―', mark:true });
    enter();
    step();
  }
  /* スタート画面の「続きから」：セーブを選ぶ画面だけを開く（閉じるとスタート画面に戻る） */
  function openLoad(){
    build();
    playing = false;
    document.getElementById('startScreen').hidden = true;
    root.hidden = false;
    $('Ui').classList.add('hidden');
    drawBg();
    openSlots('load');
  }
  return {
    newGame: newGame, openLoad: openLoad, hasSave: hasSave, afterBattle: afterBattle, exit: exit,
    hide: function(){ if(root) root.hidden = true; },
    isOpen: function(){ return !!(root && !root.hidden); },
    state: S
  };
})();
