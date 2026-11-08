# 主要画面のスクショ：python3 screens.py html outdir
import asyncio, sys, os
from playwright.async_api import async_playwright
HTML, OUT = sys.argv[1], sys.argv[2]; os.makedirs(OUT, exist_ok=True)
INIT = """localStorage.setItem('raigou.settings.v1', JSON.stringify({sound:false,bgm:false,aiSpeed:'fast'}));
let __s=777; Math.random=function(){ __s=(__s*1103515245+12345)%2147483648; return __s/2147483648; };"""
FREEZE = "*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}"
async def shot(pg, name):
    await pg.wait_for_timeout(250); await pg.screenshot(path=f'{OUT}/{name}.png')
async def run(b, w, h, tag):
    pg = await b.new_page(viewport={'width':w,'height':h})
    errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
    await pg.add_init_script(INIT)
    await pg.goto('file://' + HTML)
    await pg.wait_for_function('() => !document.getElementById("startGoBtn").disabled', timeout=60000)
    await pg.add_style_tag(content=FREEZE)
    await pg.wait_for_timeout(1500)
    for cid in ['rakura','kuze','shigure']:
        await pg.evaluate(f"()=>{{startHouse='{cid}'; applyChara('{cid}'); syncStartButtons();}}")
        await shot(pg, f'{tag}_start_{cid}')
    await pg.evaluate("()=>openStartSetting('house')"); await shot(pg, f'{tag}_pick'); await pg.evaluate("()=>closeStartSetting()")
    await pg.evaluate("()=>openStartSetting('diff')"); await shot(pg, f'{tag}_diff'); await pg.evaluate("()=>closeStartSetting()")
    for sel,name in [('#startKomaBtn','guide_piece'),('#startYakuBtn','guide_yaku'),('#startStatsBtn','stats'),('#startSettingsBtn','settings'),('#ruleBtn','rule')]:
        el = await pg.query_selector(sel)
        if el:
            await el.click(); await shot(pg, f'{tag}_{name}')
            await pg.evaluate("()=>{document.querySelectorAll('.guide-back,.modal-back').forEach(e=>e.remove()); try{closeModal()}catch(e){}; try{closeStartSetting()}catch(e){}}")
    # 対局画面
    await pg.evaluate("()=>{ startHouse='shigure'; applyChara('shigure'); }")
    await pg.click('#startGoBtn'); await pg.wait_for_timeout(5000)
    await shot(pg, f'{tag}_game')
    await pg.evaluate("()=>{ try{closeModal()}catch(e){} }"); await shot(pg, f'{tag}_game2')
    for w_ in [0,1,2]:
        await pg.evaluate(f"()=>showResult({w_})"); await shot(pg, f'{tag}_res{w_}')
    print(tag, 'errs', errs)
    await pg.close()
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        await run(b, 390, 844, 'p'); await run(b, 375, 667, 'se')
        await b.close()
asyncio.run(main())
