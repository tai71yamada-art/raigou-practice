/* ================= 対局の途中保存 =================
   G（盤面・山・峡谷・手番・AIの見込みなど）をまるごと文字にして保存し、あとで同じ状態に戻す。
   駒は同じ駒が何か所からも指されている（例：合戦で開示された駒の記録）ので、
   駒は番号（id）で書き出し、戻す時に同じ1つの駒につなぎ直す。Set・Map もそのまま戻る。 */
const SAVE_FORMAT = 1;

function isTileObj(v){
  return v && typeof v === 'object' && typeof v.id === 'number' && (v.kind === 'gen' || v.kind === 'on') && typeof v.name === 'string';
}
/* 今の対局に出てくる駒を全部集める（id → 駒） */
function collectTiles(){
  const map = {};
  const seen = new Set();
  (function walk(v){
    if(!v || typeof v !== 'object' || seen.has(v)) return;
    seen.add(v);
    if(isTileObj(v)){ if(!map[v.id]) map[v.id] = v; return; }
    if(v instanceof Set || v instanceof Map){ v.forEach(function(x, k){ walk(x); walk(k); }); return; }
    if(Array.isArray(v)){ v.forEach(walk); return; }
    Object.keys(v).forEach(function(k){ walk(v[k]); });
  })(G);
  return map;
}
function encodeValue(v, tiles){
  if(v === undefined) return { $u:1 };
  if(v === null || typeof v !== 'object') return v;
  if(isTileObj(v)){
    // 同じ番号の「本物の駒」ならその番号だけ、写し（別の物）なら中身ごと
    if(tiles[v.id] === v) return { $t: v.id };
    return { $tc: Object.assign({}, v) };
  }
  if(v instanceof Set) return { $set: Array.from(v).map(function(x){ return encodeValue(x, tiles); }) };
  if(v instanceof Map) return { $map: Array.from(v).map(function(kv){ return [encodeValue(kv[0], tiles), encodeValue(kv[1], tiles)]; }) };
  if(Array.isArray(v)) return v.map(function(x){ return encodeValue(x, tiles); });
  const o = {};
  Object.keys(v).forEach(function(k){
    if(typeof v[k] === 'function') return;
    o[k.charAt(0) === '$' ? '$$' + k : k] = encodeValue(v[k], tiles);
  });
  return o;
}
function decodeValue(v, tiles){
  if(v === null || typeof v !== 'object') return v;
  if(Array.isArray(v)) return v.map(function(x){ return decodeValue(x, tiles); });
  if(v.$u) return undefined;
  if('$t' in v) return tiles[v.$t];
  if(v.$tc) return Object.assign({}, v.$tc);
  if(v.$set) return new Set(v.$set.map(function(x){ return decodeValue(x, tiles); }));
  if(v.$map) return new Map(v.$map.map(function(kv){ return [decodeValue(kv[0], tiles), decodeValue(kv[1], tiles)]; }));
  const o = {};
  Object.keys(v).forEach(function(k){ o[k.indexOf('$$') === 0 ? k.slice(2) : k] = decodeValue(v[k], tiles); });
  return o;
}
/* 今の対局を保存用の物にする */
function serializeGame(){
  const tiles = collectTiles();
  const g = {};
  Object.keys(G).forEach(function(k){ g[k] = encodeValue(G[k], tiles); });
  return {
    format: SAVE_FORMAT,
    uid: _uid,
    tiles: Object.keys(tiles).map(function(id){ return Object.assign({}, tiles[id]); }),
    G: g
  };
}
/* 保存した物から対局を戻す（G の中身を入れ替える） */
function restoreGame(data){
  if(!data || data.format !== SAVE_FORMAT) throw new Error('保存の形式が違います');
  const tiles = {};
  data.tiles.forEach(function(t){ tiles[t.id] = Object.assign({}, t); });
  Object.keys(G).forEach(function(k){ delete G[k]; });
  Object.keys(data.G).forEach(function(k){ G[k] = decodeValue(data.G[k], tiles); });
  _uid = data.uid;
}
/* 保存してよい場面か：あなたの手番で、積・発を待っている時（演出や質問の途中でない） */
function canSaveGame(){
  return !!(G.started && !G.over && G.players && G.players.length && G.turn === 0 && !P(0).isAI &&
            G.phase === 'act' && !G.acting && !G.busy && !G.finishing);
}
