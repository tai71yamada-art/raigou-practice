# 対局ログの記録：python3 record.py html out.json
# 乱数を固定してAI同士で対局させ、ログの全行・点数・勝者を保存する（作り直し前後の比較用）
import asyncio, sys, json, time
from playwright.async_api import async_playwright
HTML, OUT = sys.argv[1], sys.argv[2]
PAIRS = [('lv1','lv2'),('lv3','lv4'),('lv5','lv6'),('lv7','lv3'),('lv7','lv7'),('lv2','lv6')]
GAMES = int(sys.argv[3]) if len(sys.argv) > 3 else 12
INIT = """localStorage.setItem('raigou.settings.v1', JSON.stringify({sound:false,bgm:false,aiSpeed:'fast'}));"""
RUN = """async ([A, B, games, seed]) => {
  let s = seed; Math.random = function(){ s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
  const st = window.setTimeout; window.setTimeout = function(f, ms){ return st(f, 0); };
  window.requestAnimationFrame = function(f){ return st(function(){ f(performance.now()); }, 0); };
  const origMk = mkPlayer; mkPlayer = function(n, ai){ return origMk(n, true); };
  render = function(){ return Promise.resolve(); };
  let LINES = [];
  const oLog = log, oTurn = logTurn;
  log = function(t, c){ LINES.push((c||'') + '|' + t); return oLog(t, c); };
  logTurn = function(t){ LINES.push('T|' + t); return oTurn(t); };
  setInterval(function(){ ['finalNextBtn','battleOk'].forEach(function(id){ const b = document.getElementById(id); if(b) b.click(); }); }, 5);
  const res = [];
  for(let g = 0; g < games; g++){
    LINES = [];
    const sente = g % 2 === 0;
    const r = await new Promise(function(done){
      const orig = showResult;
      const to = st(function(){ showResult = orig; done({ stuck:true, turn:G.turnNo }); }, 20000);
      showResult = function(winner){ clearTimeout(to); showResult = orig; G.statsSaved = true;
        done({ winner: winner, s: [P(0).score, P(1).score], turns: G.turnNo }); };
      G.seatDiff = [A, B];
      newGame(sente, A);
      G.seatDiff = [A, B];
    });
    await new Promise(function(ok){ st(ok, 80); });
    r.lines = LINES.slice();
    res.push(r);
  }
  return res;
}"""
async def worker(b, idx, pair):
    pg = await b.new_page(viewport={'width':390,'height':844})
    errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.add_init_script(INIT)
    await pg.goto('file://' + HTML)
    await pg.wait_for_function('() => !document.getElementById("startGoBtn").disabled', timeout=60000)
    r = await pg.evaluate(RUN, [pair[0], pair[1], GAMES, 4242 + idx * 7919])
    await pg.close()
    return {'pair': pair, 'games': r, 'errs': errs[:5]}
async def main():
    t = time.time()
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        outs = await asyncio.gather(*[worker(b, i, pr) for i, pr in enumerate(PAIRS)])
        await b.close()
    json.dump(outs, open(OUT, 'w'), ensure_ascii=False)
    n = sum(len(o['games']) for o in outs); st = sum(1 for o in outs for g in o['games'] if g.get('stuck'))
    lines = sum(len(g.get('lines', [])) for o in outs for g in o['games'])
    print('games', n, 'stuck', st, 'lines', lines, 'errs', [o['errs'] for o in outs if o['errs']], 'sec', round(time.time()-t, 1))
asyncio.run(main())
