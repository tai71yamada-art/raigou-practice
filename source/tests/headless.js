/* 画面なしでルールとAIを動かす土台（node 用）
   engine/ と ai/ のファイルだけを読み込み、VIEW は既定（何もしない）のまま使う。
   使い方：
     const H = require('./headless');
     const eng = H.createEngine(1234);                 // 乱数の種
     const r = await eng.play(['lv3','lv7'], true);    // 席0がLv.3（先手）、席1がLv.7。両方AI */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const JS = path.join(__dirname, '..', 'js');

function engineFiles(){
  return fs.readFileSync(path.join(JS, 'ORDER.txt'), 'utf8').split(/\s+/).filter(Boolean)
    .filter(function(f){ return f === '_prelude.js' || f.startsWith('engine/') || f.startsWith('ai/'); });
}
// キャラの名前（build.py と同じく assets/chara/<id>/chara.json から）
function charaNames(){
  const base = path.join(__dirname, '..', 'assets', 'chara');
  return '{ ' + fs.readdirSync(base).sort().map(function(id){
    return id + ':' + JSON.stringify(JSON.parse(fs.readFileSync(path.join(base, id, 'chara.json'), 'utf8')).name);
  }).join(', ') + ' }';
}
const ENGINE_CODE = engineFiles().map(function(f){ return fs.readFileSync(path.join(JS, f), 'utf8'); }).join('')
  .replace(/\{\{VERSION\}\}/g, 'test').replace('{{chara_names}}', charaNames()) +
  '\n;globalThis.__E = { G:G, P:P, VIEW:VIEW, newGame:newGame, getMk:function(){ return mkPlayer; }, setMk:function(f){ mkPlayer = f; },' +
  ' scoreTower:scoreTower, isFuon:isFuon, roleOf:roleOf, raijinRoleOf:raijinRoleOf, mkTile:mkTile, GEN_DEF:GEN_DEF, ON_DEF:ON_DEF,' +
  ' sortBody:sortBody, totalInner:totalInner, innerCap:innerCap, buildDeck:buildDeck,' +
  ' serializeGame:serializeGame, restoreGame:restoreGame, startTurn:function(){ return startTurn(); },' +
  ' getStartTurn:function(){ return startTurn; }, setStartTurn:function(f){ startTurn = f; },' +
  ' canKai:canKai, doKai:doKai, primHa:primHa, primTen:primTen, primKei:primKei, mkOugiTile:mkOugiTile, ougiUsable:ougiUsable, ougiReadyList:ougiReadyList,' +
  ' RULESETS:RULESETS, setRaijinka:setRaijinka, canActFromSlot:canActFromSlot, primStack:primStack };';

function createEngine(seed){
  let s = seed >>> 0;
  const ctx = {
    console: console,
    setTimeout: function(f){ return setImmediate(f); }, clearTimeout: function(){}, setInterval: function(){ return 0; },
    performance: { now: function(){ return 0; } }
  };
  vm.createContext(ctx);
  // 乱数を種から決まる列にする（同じ種なら同じ対局になる）
  vm.runInContext('Math.random = function(){ return __rnd(); };', Object.assign(ctx, { __rnd: function(){ s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; } }));
  vm.runInContext(ENGINE_CODE, ctx, { filename: 'engine.js' });
  const E = ctx.__E;
  const origMk = E.getMk();
  E.setMk(function(n){ return origMk(n, true); });   // 両方の席をAIに
  let lines = [], done = null;
  E.VIEW.log = function(t, c){ lines.push((c || '') + '|' + t); };
  E.VIEW.logTurn = function(t){ lines.push('T|' + t); };
  E.VIEW.showResult = function(winner){ if(done) done({ winner: winner, s: [E.P(0).score, E.P(1).score], turns: E.G.turnNo }); };
  return {
    E: E,
    rng: { get: function(){ return s; }, set: function(v){ s = v; } },
    lines: function(){ return lines; },
    /* 保存した対局から続ける：restoreGame してから次の手番を始め、終局まで進める */
    resume: function(data, timeoutMs){
      lines = [];
      return new Promise(function(resolve, reject){
        const timer = setTimeout(function(){ done = null; reject(new Error('再開した対局が終わりません')); }, timeoutMs || 30000);
        done = function(r){ clearTimeout(timer); done = null; r.lines = lines; setTimeout(function(){ resolve(r); }, 30); };
        try{ E.restoreGame(JSON.parse(JSON.stringify(data))); E.startTurn(); }catch(e){ clearTimeout(timer); reject(e); }
      });
    },
    /* opts（省略可）：{ rule:'kyogi', ougi:[[…],[…]] } など。省略すると基本ルール */
    play: function(levels, sente, timeoutMs, opts){
      lines = [];
      return new Promise(function(resolve, reject){
        const timer = setTimeout(function(){ done = null; reject(new Error('対局が終わりません（' + E.G.turnNo + '手番目）')); }, timeoutMs || 30000);
        // 結果が出た後も、終わりかけの処理（演出待ちなど）が少し残るので、それが片付いてから返す
        done = function(r){ clearTimeout(timer); done = null; r.lines = lines; setTimeout(function(){ resolve(r); }, 30); };
        try{
          E.G.seatDiff = levels;
          E.newGame(sente !== false, levels[0], Object.assign({ rule:'basic', house:'rakura' }, opts || {}));
          E.G.seatDiff = levels;
        }catch(e){ clearTimeout(timer); reject(e); }
      });
    }
  };
}
module.exports = { createEngine: createEngine, engineFiles: engineFiles };
