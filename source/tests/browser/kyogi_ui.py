# 競技雷轟の画面確認：スタート画面 → 奥義選択 → 盤面（月）→ 開 → 覇・天・啓の操作
import asyncio, sys
from playwright.async_api import async_playwright
OUT='/home/claude/kyogi/'
W,Hh = (int(sys.argv[1]), int(sys.argv[2])) if len(sys.argv)>2 else (390,844)
TAG = sys.argv[3] if len(sys.argv)>3 else 'p'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        pg = await b.new_page(viewport={'width':W,'height':Hh})
        errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.add_init_script("try{localStorage.clear()}catch(e){}; window.__noAnim=1;")
        await pg.goto('file:///home/claude/raigou-practice/dist/raigou_app.html')
        await pg.wait_for_function('() => !document.getElementById("startGoBtn").disabled', timeout=60000)
        n=[0]
        async def shot(name):
            n[0]+=1; await pg.wait_for_timeout(350); await pg.screenshot(path=OUT+TAG+'_%02d_%s.png'%(n[0],name))
        await pg.evaluate("SETTINGS.skipConfirm=false; SETTINGS.sound=false; SETTINGS.bgm=false;")
        await pg.click('#ruleBtn'); await pg.wait_for_timeout(200); await shot('rule')
        await pg.click('[data-setval="kyogi"]'); await shot('start_kyogi')
        await pg.click('#startGoBtn'); await shot('picker_empty')
        await pg.click('#opClose'); await pg.click('#ougiBtn')
        await pg.click('[data-ougi-opt="覇"]'); await pg.click('[data-ougi-opt="啓"]'); await shot('picker_sel')
        await pg.click('#opOk'); await pg.click('#aiOugiBtn'); await shot('picker_ai'); await pg.click('#opClose'); await shot('start_ready')
        await pg.evaluate("playVsIntro = function(){ return Promise.resolve(); }; playCutIn = (function(o){ return function(a,b){ window.__cut=(window.__cut||[]).concat([a]); return o(a,b); }; })(playCutIn);")
        await pg.click('#startGoBtn'); await pg.wait_for_timeout(900); await shot('game_gen')
        # 盤面を作る：桜門を3つ埋めて、開のポップアップを出す
        await pg.evaluate("""() => { closeModal();
          const mk=(k,n,w)=>mkTile(k,n,w);
          P(0).gates=[[mk('on','五',5),mk('on','四',4),mk('on','三',3)],[mk('gen','轟',5),mk('on','二',2)],[mk('on','六',6)]];
          P(1).gates=[[mk('on','七',7),mk('on','六',6),mk('on','五',5),mk('on','四',4)],[mk('on','三',3),mk('on','三',3)],[]];
          P(0).body=[mk('on','四',4)]; P(0).hand=[mk('gen','雷',1), null];
          P(1).body=[mk('on','二',2),mk('on','一',1)]; P(1).hand=[mk('gen','陣',4), null];
          G.canyon=[mk('on','二',2),mk('gen','蛇',2),mk('on','七',7),mk('gen','瞬',7)];
          G.turn=0; G.busy=false; G.acting=true; G.phase='gen'; render(); }""")
        await pg.wait_for_timeout(1200); await shot('board_moon')
        await pg.click('[data-cmd="moonInfo"]'); print('clicked', flush=True); await shot('moon_info'); print('shot', flush=True)
        print('dbg', await pg.evaluate("[G.peeking, G.fxBusy, G.reorderBusy, G.over, G.started, document.getElementById('guideRoot').innerHTML.length, typeof openMoonInfo]"))
        await pg.click('[data-guide-close]', timeout=3000)
        await pg.evaluate("void humanFlow()"); await shot('kai_ask')
        await pg.click('[data-kai="0"]'); await shot('kai_where')
        await pg.click('[data-kai-dest="0"]'); await shot('kai_confirm')
        await pg.click('#cfYes'); await pg.wait_for_timeout(500); await shot('kai_cutin')
        await pg.wait_for_timeout(1500); await shot('after_kai_gen')
        # 現・選を飛ばして積・発へ
        await pg.evaluate("""() => { closeModal(); G.phase='act'; G.acting=false; render(); }""")
        await shot('act_raijin')
        hs = await pg.evaluate("P(0).hand.map(t=>t?t.name:null)")
        print('hand', hs, 'raijinka', await pg.evaluate("P(0).raijinka"), 'excluded', await pg.evaluate("G.excludedOugi.map(t=>t.name)"))
        slot = hs.index('覇')
        await pg.click('[data-hand="0:%d"]'%slot); await shot('chips_ha')
        await pg.click('[data-chip="more"]'); await shot('popup_ha'); await pg.click('#handClose')
        await pg.click('[data-hand="0:%d"]'%slot); await pg.click('[data-chip="1"]'); await shot('ha_pick')
        await pg.click('#haTop'); await shot('ha_confirm'); await pg.click('#cfYes'); await pg.wait_for_timeout(2600); await shot('ha_done')
        print('after ha', await pg.evaluate("[P(0).gates.map(g=>g.map(t=>t.name).join('')), P(1).gates.map(g=>g.map(t=>t.name).join('')), G.canyon.map(t=>t.name).join('')]"))
        # 天
        await pg.evaluate("""() => { G.used=new Set(); G.actedSlots=new Set(); P(0).hand[2]=mkOugiTile('天'); render(); }""")
        await pg.click('[data-hand="0:2"]'); await shot('chips_ten'); await pg.click('[data-chip="1"]'); await shot('ten_tower')
        await pg.click('[data-pickgate="0:0"]'); await shot('ten_source')
        await pg.click('[data-ten-item="c:0"]'); await shot('ten_confirm'); await pg.click('#cfYes'); await pg.wait_for_timeout(2300); await shot('ten_done')
        print('after ten', await pg.evaluate("[P(0).gates.map(g=>g.map(t=>t.name).join('')), G.canyon.map(t=>t.name).join('')]"))
        # 啓（相手の4段→分ける）
        await pg.evaluate("""() => { G.used=new Set(); G.actedSlots=new Set(); P(0).hand[2]=mkOugiTile('啓'); P(1).gates[0]=[mkTile('on','七',7),mkTile('on','六',6),mkTile('on','五',5),mkTile('on','四',4)]; P(1).gates[1]=[]; P(1).gates[2]=[]; render(); }""")
        await pg.click('[data-hand="0:2"]'); await pg.click('[data-chip="1"]'); await shot('kei_tower')
        await pg.click('[data-pickgate="1:0"]'); await shot('kei_split0')
        await pg.click('[data-kei-k="2"]'); await pg.click('[data-kei-part="top"]'); await shot('kei_split1')
        await pg.click('[data-kei-dest="2"]'); await pg.click('#keiOk'); await shot('kei_confirm'); await pg.click('#cfYes'); await pg.wait_for_timeout(2300); await shot('kei_done')
        print('after kei', await pg.evaluate("P(1).gates.map(g=>g.length)"), 'cut', await pg.evaluate("window.__cut"))
        print('ERR', errs)
        await b.close()
import traceback
try:
    asyncio.run(asyncio.wait_for(main(), 200))
except BaseException as e:
    traceback.print_exc()
