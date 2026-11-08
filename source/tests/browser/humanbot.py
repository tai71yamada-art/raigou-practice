# あなた（人間）の操作をでたらめに行うボットで対局：python3 humanbot.py html out.json [games]
# 画面のボタンを実際に押して進めるので、ポップアップ・受け札の質問・カットインなど画面側の流れを通る
import asyncio, sys, json, time
from playwright.async_api import async_playwright
HTML, OUT = sys.argv[1], sys.argv[2]
GAMES = int(sys.argv[3]) if len(sys.argv) > 3 else 4
W = 6
INIT = """localStorage.setItem('raigou.settings.v1', JSON.stringify({sound:false,bgm:false,aiSpeed:'fast'}));"""
RUN = """async ([games, seed, lv]) => {
  let s = seed; Math.random = function(){ s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
  let bs = seed * 7 + 3; const brand = function(){ bs = (bs * 1103515245 + 12345) % 2147483648; return bs / 2147483648; };
  const st = window.setTimeout; window.setTimeout = function(f, ms){ return st(f, 0); };
  window.requestAnimationFrame = function(f){ return st(function(){ f(performance.now()); }, 0); };
  let LINES = [];
  const oLog = log, oTurn = logTurn;
  log = function(t, c){ LINES.push((c||'') + '|' + t); return oLog(t, c); };
  let VIOL = [];
  const countTiles = function(){
    const ids = [];
    G.deck.forEach(t => ids.push(t.id)); G.canyon.forEach(t => ids.push(t.id));
    G.released.forEach(r => r.tiles.forEach(t => ids.push(t.id))); if(G.excluded) ids.push(G.excluded.id);
    for(let pi = 0; pi < 2; pi++){ const q = P(pi); q.body.forEach(t => ids.push(t.id)); q.hand.forEach(t => { if(t) ids.push(t.id); }); q.gates.forEach(g => g.forEach(t => ids.push(t.id))); }
    return [ids.length, new Set(ids).size];
  };
  logTurn = function(t){ LINES.push('T|' + t); const c = countTiles(); if(c[0] !== 64 || c[1] !== 64) VIOL.push(G.turnNo + ':' + c.join('/')); return oTurn(t); };
  let acts = 0, lastTurn = -1, clicks = 0;
  const tick = function(){
    if(!G.started || G.over && !document.getElementById('finalNextBtn')) return;
    const mr = document.getElementById('modalRoot');
    const btns = mr ? [...mr.querySelectorAll('button:not([disabled]), [role="button"], .clickable')].filter(b => !b.hasAttribute('data-peekbtn')) : [];
    if(btns.length){
      const tg = [...mr.querySelectorAll('.targetable')];
      if(mr.querySelector('.selected') && tg.length && brand() < 0.9){ clicks++; tg[Math.floor(brand() * tg.length)].click(); return; }
      const drawn = [...mr.querySelectorAll('[data-sen-drawn]')];
      if(drawn.length && !mr.querySelector('.selected') && brand() < 0.8){ clicks++; drawn[0].click(); return; }
      const prim = btns.filter(b => b.classList.contains('primary'));
      const pick = (brand() < 0.55 || !prim.length) ? btns[Math.floor(brand() * btns.length)] : prim[0];
      clicks++; pick.click(); return;
    }
    if(G.turn === 0 && G.phase === 'act' && !G.busy && !G.acting && !G.fxBusy){
      if(G.turnNo !== lastTurn){ lastTurn = G.turnNo; acts = 0; }
      const chips = [...document.querySelectorAll('.hc-chip:not([disabled])')].filter(c => c.getAttribute('data-chip') !== 'more');
      if(chips.length && brand() < 0.8){ chips[Math.floor(brand() * chips.length)].click(); acts++; return; }
      const hands = [...document.querySelectorAll('button[data-hand^="0:"]')];
      if(hands.length && acts < 4 && brand() < 0.7){ hands[Math.floor(brand() * hands.length)].click(); acts++; return; }
      onCmd('endTurn');
    }
  };
  setInterval(tick, 3);
  const res = [];
  for(let g = 0; g < games; g++){
    LINES = []; clicks = 0;
    const sente = g % 2 === 0;
    const r = await new Promise(function(done){
      const orig = showResult;
      const to = st(function(){ showResult = orig; done({ stuck:true, turn:G.turnNo, phase:G.phase, busy:G.busy, acting:G.acting, modal:(document.getElementById('modalRoot').textContent||'').slice(0,400), hand:P(0).hand.map(function(t){ return t ? t.name : null; }), body:P(0).body.map(function(t){ return t.name; }), cap:innerCap(P(0)), deck:G.deck.length }); }, 40000);
      showResult = function(winner){ clearTimeout(to); showResult = orig; G.statsSaved = true;
        done({ winner: winner, s: [P(0).score, P(1).score], turns: G.turnNo }); };
      newGame(sente, lv);
    });
    await new Promise(function(ok){ st(ok, 80); });
    r.lines = LINES.slice(); r.clicks = clicks; r.viol = VIOL.slice(0, 3); VIOL = [];
    res.push(r);
  }
  return res;
}"""
LVS = ['lv1','lv3','lv5','lv7','lv6','lv2']
async def worker(b, idx):
    pg = await b.new_page(viewport={'width':390,'height':844})
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.add_init_script(INIT)
    await pg.goto('file://' + HTML)
    await pg.wait_for_function('() => !document.getElementById("startGoBtn").disabled', timeout=60000)
    r = await pg.evaluate(RUN, [GAMES, 9001 + idx * 104729, LVS[idx % len(LVS)]])
    await pg.close()
    return {'games': r, 'errs': errs[:5]}
async def main():
    t = time.time()
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        outs = await asyncio.gather(*[worker(b, i) for i in range(W)])
        await b.close()
    json.dump(outs, open(OUT, 'w'), ensure_ascii=False)
    gs = [g for o in outs for g in o['games']]
    print('games', len(gs), 'stuck', sum(1 for g in gs if g.get('stuck')), 'lines', sum(len(g.get('lines', [])) for g in gs),
          'clicks', sum(g.get('clicks', 0) for g in gs), 'errs', [o['errs'] for o in outs if o['errs']], 'sec', round(time.time() - t, 1))
    print('tile-count violations', [g['viol'] for g in gs if g.get('viol')])
    for g in gs:
        if g.get('stuck'): print('STUCK', {k: v for k, v in g.items() if k != 'lines'})
asyncio.run(main())
