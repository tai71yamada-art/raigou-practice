/* 雷轟 練習アプリの自動テスト（画面なし・node で動く）
     node source/tests/run_tests.js            … 全部
     node source/tests/run_tests.js --quick    … 対局テストを少なめに
     node source/tests/run_tests.js --update   … 「いつもの対局」の記録を今の動きで更新する（AIやルールをわざと変えた時だけ）
   0. ルール側（engine/ ai/）が画面を直接さわっていないか
   1. 役と得点：ルールブックの例どおりに点数が出るか
   2. 駒と雷山：駒の数・除外1枚
   3. AI同士の対局：いろいろなレベルで最後まで進むか。毎手番、駒が消えたり増えたりしていないか
   3b. 途中保存：手番の始めで保存して別の場所で戻し、続きが保存しなかった時と全く同じになるか
   4. いつもの対局：決まった乱数で対局した結果が、前回の記録と同じか（意図しない変更の検出）
   5. 競技雷轟：開・雷神化・奥義（覇・天・啓）の動きと、AI同士の対局での決まりごと */
'use strict';
const fs = require('fs'), path = require('path');
const H = require('./headless');
const QUICK = process.argv.includes('--quick'), UPDATE = process.argv.includes('--update');
const SNAP = path.join(__dirname, 'snapshot.json');

let pass = 0, fail = 0;
function ok(cond, name, detail){
  if(cond){ pass++; }
  else { fail++; console.log('  ✗ ' + name + (detail ? '  … ' + detail : '')); }
}
function section(t){ console.log('\n■ ' + t); }

(async function main(){
  const t0 = Date.now();
  const E = H.createEngine(1).E;
  const byName = {};
  E.GEN_DEF.forEach(function(d){ byName[d.name] = { kind:'gen', w:d.w }; });
  E.ON_DEF.forEach(function(d){ byName[d.name] = { kind:'on', w:d.w }; });
  /* 塔を「下から順」の駒の名前で作る。例 tower('轟 陣 斬') */
  function tower(s){ return s.split(/\s+/).map(function(n){ const d = byName[n]; return E.mkTile(d.kind, n, d.w); }); }

  section('0. ルール側が画面をさわっていないか');
  H.engineFiles().forEach(function(f){
    const src = fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
    const hit = src.match(/\b(document|window|localStorage|innerHTML|addEventListener|getBoundingClientRect)\b/);
    ok(!hit, f + ' は画面を直接さわらない', hit ? '「' + hit[0] + '」を使っています（VIEW 経由にしてください）' : '');
  });

  section('1. 役と得点');
  const CASES = [
    // [下から順の駒, 役, 点数]
    ['雷 雷 雷', '桜花', 3],                 // 基礎2＋染め1
    ['一 雷 一', '桜花', 2],                 // 言霊と音無が混ざると染めなし
    ['三 二 一', '蓮花', 2],                 // 基礎1＋染め1
    ['斬 二 雷', '蓮花', 1],
    ['五 三 一', '奇数蓮花', 2],
    ['陣 二 二', '', 0],                     // 4,2,2 は役なし
    ['四 二 一', '', 0],
    ['轟 轟 轟 轟', '桜花', 4],              // 基礎2＋高さ1＋染め1
    ['六 五 四 三 二 一', '蓮花', 5],         // 6段の1〜6は蓮々花ではなく基本役の蓮花（基礎1＋高さ3＋染め1）
    ['霧 轟 陣 三 二 一', '蓮花', 4],
    ['轟 轟 陣 陣 斬 斬', '椿', 6],           // 同じ駒が2個ずつ
    ['四 四 一 一 一 一', '山茶花', 4],       // 同じ重さが2個ずつ（4が2個・1が4個）
    ['三 三 三 一 一 一', '桜々花', 8],       // 組み合わせ役：基礎4＋高さ3＋染め1
    ['斬 斬 斬 斬 斬 斬', '毘沙門櫓', 12],    // 雷神役は桜花より優先
    ['浄 瞬 霧 轟 陣 斬', '時雨蓮花', 10],
    ['浄 瞬 霧 轟 轟 轟', '霞・双頭蓮', 11],
    ['瞬 瞬 霧 霧 六 六', '六花白雪', 12]
  ];
  CASES.forEach(function(c){
    const r = E.scoreTower(tower(c[0]));
    ok(r.role === c[1] && r.pts === c[2], c[0], '役「' + r.role + '」' + r.pts + '点（期待：「' + c[1] + '」' + c[2] + '点）');
  });
  ok(E.isFuon(tower('雷 轟')) === true, '不穏の塔：上の駒の方が重い');
  ok(E.isFuon(tower('轟 轟 雷')) === false, '不穏ではない：同じ重さ・軽い駒が上');
  ok(E.scoreTower(tower('轟 陣')).pts === 0, '2段以下は役にならない');

  section('2. 駒と雷山');
  {
    const eng = H.createEngine(7);
    const deck = eng.E.buildDeck();
    ok(deck.length === 63, '雷山は63枚（64枚から1枚除外）', deck.length + '枚');
    const all = deck.concat([eng.E.G.excluded]);
    const count = {};
    all.forEach(function(t){ count[t.name] = (count[t.name] || 0) + 1; });
    ok(count['雷'] === 8 && count['浄'] === 1 && count['一'] === 4 && count['七'] === 4 && !count['八'], '駒の内訳（雷8・浄1・音無は一〜七が各4）');
    ok(new Set(all.map(function(t){ return t.id; })).size === 64, '駒の番号が重ならない');
  }

  section('3. AI同士の対局（毎手番、駒が64個のままか・塔が6段を超えないか）');
  const LV = ['lv1', 'lv2', 'lv3', 'lv4', 'lv5', 'lv6', 'lv7'];
  const N = QUICK ? 14 : 70;
  let games = 0, turnsChecked = 0, bad = 0, firstBad = '';
  for(let i = 0; i < N; i++){
    const eng = H.createEngine(100 + i);
    const G = eng.E.G, P = eng.E.P;
    const orig = eng.E.VIEW.logTurn;
    function check(where){
      if(!G.players || !G.players.length) return;
      const ids = [];
      G.deck.forEach(function(t){ ids.push(t.id); });
      G.canyon.forEach(function(t){ ids.push(t.id); });
      G.released.forEach(function(r){ r.tiles.forEach(function(t){ ids.push(t.id); }); });
      if(G.excluded) ids.push(G.excluded.id);
      for(let pi = 0; pi < 2; pi++){
        const p = P(pi);
        p.body.forEach(function(t){ ids.push(t.id); });
        p.hand.forEach(function(t){ if(t) ids.push(t.id); });
        p.gates.forEach(function(g){ g.forEach(function(t){ ids.push(t.id); }); if(g.length > 6){ bad++; if(!firstBad) firstBad = where + ': 塔が' + g.length + '段'; } });
      }
      const uniq = new Set(ids).size;
      if(ids.length !== 64 || uniq !== 64){ bad++; if(!firstBad) firstBad = where + ': 駒 ' + ids.length + '個（重なりなし ' + uniq + '）'; }
      turnsChecked++;
    }
    eng.E.VIEW.logTurn = function(t){ check('対局' + i + ' ' + G.turnNo + '手番目'); return orig(t); };
    try{
      const r = await eng.play([LV[i % 7], LV[(i * 3 + 1) % 7]], i % 2 === 0, 30000);
      check('対局' + i + ' 終局');
      if(r.winner === 0 || r.winner === 1 || r.winner === -1) games++;
    }catch(e){ bad++; if(!firstBad) firstBad = '対局' + i + ': ' + e.message; }
  }
  ok(games === N, N + '局すべて最後まで終わる', games + '局');
  ok(bad === 0, '駒の数と塔の高さに矛盾がない（' + turnsChecked + '手番を確認）', firstBad);

  section('3b. 途中保存：保存して戻した対局が、保存しなかった対局と同じに進むか');
  {
    let same = 0, tried = 0, why = '';
    const M = QUICK ? 6 : 20;
    for(let i = 0; i < M; i++){
      const lv = [LV[(i * 2) % 7], LV[(i * 5 + 3) % 7]];
      const k = 4 + (i * 7) % 30;          // 何手番目の始めで保存するか
      const A = H.createEngine(500 + i);
      let snap = null, rngAt = 0, lineAt = 0;
      const realStart = A.E.getStartTurn();
      A.E.setStartTurn(function(){
        if(!snap && A.E.G.turnNo === k){ snap = JSON.parse(JSON.stringify(A.E.serializeGame())); rngAt = A.rng.get(); lineAt = A.lines().length; }
        return realStart();
      });
      const ra = await A.play(lv, i % 2 === 0);
      if(!snap) continue;              // その手番まで行かずに終わった
      tried++;
      const B = H.createEngine(1);
      B.rng.set(rngAt);
      const rb = await B.resume(snap);
      const tailA = ra.lines.slice(lineAt);
      if(JSON.stringify(tailA) === JSON.stringify(rb.lines) && ra.winner === rb.winner && ra.s.join() === rb.s.join()) same++;
      else if(!why){ const j = tailA.findIndex(function(l, x){ return l !== rb.lines[x]; }); why = '対局' + i + '（' + k + '手番目で保存）の' + j + '行目：' + tailA[j] + ' ／ ' + rb.lines[j]; }
    }
    ok(tried > 0 && same === tried, '保存→再開した' + tried + '局が、最後まで同じ進み方', why);
  }

  section('4. いつもの対局（決まった乱数での結果が前回と同じか）');
  const SEEDS = [[11, ['lv3', 'lv3']], [22, ['lv1', 'lv5']], [33, ['lv6', 'lv7']], [44, ['lv7', 'lv2']], [55, ['lv4', 'lv6']]];
  const snap = {};
  for(const [seed, lv] of SEEDS){
    const eng = H.createEngine(seed);
    const rs = [];
    for(let g = 0; g < 4; g++){
      const r = await eng.play(lv, g % 2 === 0);
      rs.push([r.winner, r.s[0], r.s[1], r.turns, r.lines.length]);
    }
    snap[seed + ':' + lv.join('-')] = rs;
  }
  if(UPDATE || !fs.existsSync(SNAP)){
    fs.writeFileSync(SNAP, JSON.stringify(snap, null, 1));
    console.log('  記録を更新しました（' + path.relative(process.cwd(), SNAP) + '）');
  } else {
    const prev = JSON.parse(fs.readFileSync(SNAP, 'utf8'));
    Object.keys(snap).forEach(function(k){
      ok(JSON.stringify(prev[k]) === JSON.stringify(snap[k]), k, '前回 ' + JSON.stringify(prev[k]) + ' → 今回 ' + JSON.stringify(snap[k]));
    });
  }

  section('5. 競技雷轟（開・雷神化・奥義）');
  {
    /* 盤面を手で作って、1つずつ確かめる */
    function fresh(seed){
      const eng = H.createEngine(seed || 7), X = eng.E;
      X.setStartTurn(function(){});            // 手番は進めない（盤面だけ使う）
      X.newGame(true, 'lv3', { rule:'kyogi', house:'rakura', ougi:[['覇','天'],['啓','覇']] });
      X.G.turn = 0; X.G.used = new Set(); X.G.actedSlots = new Set();
      for(let pi = 0; pi < 2; pi++){ const p = X.P(pi); p.body = []; p.hand = [null, null]; p.gates = [[],[],[]]; p.seals = [null,null,null]; }
      X.G.canyon = [];
      return X;
    }
    function mk(X, s){ return s.split(/\s+/).filter(Boolean).map(function(n){ const d = byName[n]; return X.mkTile(d.kind, n, d.w); }); }
    const names = function(a){ return a.map(function(t){ return t.name; }).join(' '); };
    {
      const X = fresh();
      ok(X.P(0).moon.length === 2 && X.P(1).moon.length === 2 && X.P(0).moon.every(function(t){ return t.ougi && t.w === 9; }), '月に奥義駒が2個ずつ（重さ9）');
      ok(!X.canKai(0), '桜門が空いていると開できない');
      X.P(0).gates = [mk(X, '五'), mk(X, '三'), mk(X, '二')];
      ok(X.canKai(0), '桜門が3つとも埋まると開できる');
      await X.doKai(0, 0, { where:'hand', idx:0 });
      const p = X.P(0);
      ok(p.raijinka && p.hand.length === 3 && p.hand[0] && p.hand[0].name === '覇' && p.moon.length === 0, '開：選んだ奥義駒が手に入り、雷神化して手が3か所になる');
      ok(X.G.excludedOugi.length === 1 && X.G.excludedOugi[0].name === '天', '開：選ばなかった奥義駒は除外');
      ok(X.innerCap(p) === 6, '雷神化すると内駒は6個まで');
      ok(!X.canKai(0), '開は1対戦に1回だけ');
      p.hand[1] = mk(X, '一')[0]; p.hand[2] = mk(X, '一')[0];
      await X.primStack(0, 1, 0); await X.primStack(0, 2, 1);
      ok(!X.canActFromSlot(p, 0), '積・発できる手は1手番で2か所まで');
    }
    {
      const X = fresh();
      X.P(0).gates = [mk(X, '五 四 三'), mk(X, '二'), []];
      X.P(1).gates = [mk(X, '六 五'), [], mk(X, '七 三 一')];
      X.P(1).seals[2] = { old:false };
      X.P(0).hand[0] = X.mkOugiTile('覇');
      await X.primHa(0, 0, 'top');
      ok(names(X.P(0).gates[0]) === '五 四' && X.P(0).gates[1].length === 0 && names(X.P(1).gates[0]) === '六', '覇（一番上）：全ての塔の一番上が捨て駒になる');
      ok(names(X.P(1).gates[2]) === '七 三 一', '覇：雷停中の塔は含まない');
      ok(X.G.canyon.length === 4 && X.G.canyon[3].name === '覇' && !X.P(0).hand[0], '覇：捨てた駒と覇は峡谷へ');
      const Y = fresh();
      Y.P(0).gates = [mk(Y, '五 四 三'), [], []]; Y.P(1).gates = [mk(Y, '六 五'), [], []];
      Y.P(0).hand[1] = Y.mkOugiTile('覇');
      await Y.primHa(0, 1, 'bottom');
      ok(names(Y.P(0).gates[0]) === '四 三' && names(Y.P(1).gates[0]) === '五', '覇（一番下）：全ての塔の一番下が捨て駒になる');
    }
    {
      const X = fresh();
      X.P(0).gates = [mk(X, '五 四 一'), [], []];
      X.G.canyon = mk(X, '三 雷');
      X.P(0).hand[0] = X.mkOugiTile('天');
      await X.primTen(0, 0, 0, { zone:'canyon', idx:0 });
      ok(names(X.P(0).gates[0]) === '五 四 三' && X.G.canyon[0].name === '一', '天：塔の一番上と峡谷の駒が入れ替わる');
      const Y = fresh();
      Y.P(0).gates = [mk(Y, '五 四 一'), [], []];
      Y.P(1).body = mk(Y, '七 三');
      Y.P(0).hand[0] = Y.mkOugiTile('天');
      await Y.primTen(0, 0, 0, { zone:'body', pi:1, idx:1 });
      ok(names(Y.P(0).gates[0]) === '五 四 三' && names(Y.P(1).body) === '七 一', '天：塔の一番上と相手の体内の駒が入れ替わる（体内は重い順に並び直す）');
      const Z = fresh();
      Z.P(0).gates = [mk(Z, '五 四 一'), [], []]; Z.P(0).seals[0] = { old:false };
      Z.P(0).hand[0] = Z.mkOugiTile('天'); Z.G.canyon = mk(Z, '三');
      ok(Z.ougiUsable(0, 0) !== '', '天：封印中の塔しか無い時は発できない');
    }
    {
      const X = fresh();
      X.P(1).gates = [mk(X, '六 五 四 三 二'), [], mk(X, '一')];
      X.P(0).hand[0] = X.mkOugiTile('啓');
      await X.primKei(0, 0, 1, 0, 2, 'top', 1);
      ok(names(X.P(1).gates[0]) === '六 五' && names(X.P(1).gates[1]) === '四 三 二', '啓：塔を上下に分け、上の部分を空いた桜門へ');
      const Y = fresh();
      Y.P(0).gates = [mk(Y, '六 五 四 三'), [], []];
      Y.P(0).hand[0] = Y.mkOugiTile('啓');
      await Y.primKei(0, 0, 0, 0, 1, 'bottom', 2);
      ok(names(Y.P(0).gates[0]) === '五 四 三' && names(Y.P(0).gates[2]) === '六', '啓：下の部分を移すこともできる');
      const Z = fresh();
      Z.P(0).gates = [mk(Z, '六 五'), mk(Z, '一'), mk(Z, '二')]; Z.P(1).gates = [mk(Z, '三'), [], []];
      Z.P(0).hand[0] = Z.mkOugiTile('啓');
      ok(Z.ougiUsable(0, 0) !== '', '啓：2段以上の塔と空いた桜門を両方持つ人がいないと発できない');
    }
    /* AI同士の競技雷轟：毎手番、駒の数・塔の高さ・内駒の上限を確かめる */
    const NK = QUICK ? 21 : 84;
    let kGames = 0, kBad = 0, kFirst = '', kai = 0, hatsu = { '覇':0, '天':0, '啓':0 }, kTurns = 0;
    for(let i = 0; i < NK; i++){
      const eng = H.createEngine(3000 + i);
      const G = eng.E.G, P = eng.E.P;
      const orig = eng.E.VIEW.logTurn;
      function check(where){
        if(!G.players || !G.players.length) return;
        const ids = [];
        const add = function(t){ if(t) ids.push(t.id); };
        G.deck.forEach(add); G.canyon.forEach(add); (G.excludedOugi || []).forEach(add); add(G.excluded);
        G.released.forEach(function(r){ r.tiles.forEach(add); });
        for(let pi = 0; pi < 2; pi++){
          const p = P(pi);
          p.body.forEach(add); p.hand.forEach(add); p.moon.forEach(add);
          p.gates.forEach(function(g){ g.forEach(add); if(g.length > 6){ kBad++; if(!kFirst) kFirst = where + ': 塔が' + g.length + '段'; } });
          if(p.body.length > 3 || p.hand.length !== (p.raijinka ? 3 : 2)){ kBad++; if(!kFirst) kFirst = where + ': 体内' + p.body.length + '個・手' + p.hand.length + 'か所'; }
          if(p.raijinka && p.moon.length){ kBad++; if(!kFirst) kFirst = where + ': 雷神化したのに月に駒がある'; }
        }
        if(ids.length !== 68 || new Set(ids).size !== 68){ kBad++; if(!kFirst) kFirst = where + ': 駒 ' + ids.length + '個'; }
        kTurns++;
      }
      eng.E.VIEW.logTurn = function(t){ check('競技' + i + ' ' + G.turnNo + '手番目'); return orig(t); };
      try{
        const r = await eng.play([LV[i % 7], LV[(i * 3 + 1) % 7]], i % 2 === 0, 30000, { rule:'kyogi' });
        check('競技' + i + ' 終局');
        if(r.winner === 0 || r.winner === 1 || r.winner === -1) kGames++;
        r.lines.forEach(function(l){ if(l.indexOf('は「開」') >= 0) kai++; Object.keys(hatsu).forEach(function(n){ if(l.indexOf('の奥義「' + n + '」') >= 0) hatsu[n]++; }); });
      }catch(e){ kBad++; if(!kFirst) kFirst = '競技' + i + ': ' + e.message; }
    }
    ok(kGames === NK, '競技雷轟の' + NK + '局がすべて最後まで終わる', kGames + '局');
    ok(kBad === 0, '競技雷轟：駒の数・塔の高さ・手の数に矛盾がない（' + kTurns + '手番を確認）', kFirst);
    ok(kai > 0, 'AIが開する（' + kai + '回）');
    ok(hatsu['覇'] + hatsu['天'] + hatsu['啓'] > 0, 'AIが奥義を発する（覇' + hatsu['覇'] + '・天' + hatsu['天'] + '・啓' + hatsu['啓'] + '）');
    console.log('  （' + NK + '局で 開 ' + kai + '回、覇 ' + hatsu['覇'] + '・天 ' + hatsu['天'] + '・啓 ' + hatsu['啓'] + '回）');
  }

  console.log('\n結果：' + pass + '件 OK、' + fail + '件 NG（' + ((Date.now() - t0) / 1000).toFixed(1) + '秒）');
  process.exit(fail ? 1 : 0);
})().catch(function(e){ console.error(e); process.exit(1); });
