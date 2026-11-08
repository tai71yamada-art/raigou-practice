/* 雷轟 練習アプリの自動テスト（画面なし・node で動く）
     node source/tests/run_tests.js            … 全部
     node source/tests/run_tests.js --quick    … 対局テストを少なめに
     node source/tests/run_tests.js --update   … 「いつもの対局」の記録を今の動きで更新する（AIやルールをわざと変えた時だけ）
   0. ルール側（engine/ ai/）が画面を直接さわっていないか
   1. 役と得点：ルールブックの例どおりに点数が出るか
   2. 駒と雷山：駒の数・除外1枚
   3. AI同士の対局：いろいろなレベルで最後まで進むか。毎手番、駒が消えたり増えたりしていないか
   3b. 途中保存：手番の始めで保存して別の場所で戻し、続きが保存しなかった時と全く同じになるか
   4. いつもの対局：決まった乱数で対局した結果が、前回の記録と同じか（意図しない変更の検出） */
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

  console.log('\n結果：' + pass + '件 OK、' + fail + '件 NG（' + ((Date.now() - t0) / 1000).toFixed(1) + '秒）');
  process.exit(fail ? 1 : 0);
})().catch(function(e){ console.error(e); process.exit(1); });
