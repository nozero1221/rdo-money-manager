"""Functional and persistence checks on real browser storage. Runs locally or in CI.
Not a physical-iPhone test. All browser requests are to this temporary local server.
"""
import functools
import json
import tempfile
import threading
from datetime import datetime, timezone, timedelta
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass
server = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(QuietHandler, directory=str(ROOT)))
threading.Thread(target=server.serve_forever, daemon=True).start()
BASE = f'http://127.0.0.1:{server.server_port}'
KEY = 'rdo_companion_v5'
results = []

def loaded(page):
    page.wait_for_selector('#app:not([hidden])', timeout=15000)

def tab(page, name):
    page.locator(f'nav [data-view="{name}"]').click()

def state(page):
    return page.evaluate('(key)=>JSON.parse(localStorage.getItem(key))', KEY)

def run_suite(engine, engine_name):
    with tempfile.TemporaryDirectory(prefix='rdo-browser-') as profile:
        ctx = engine.launch_persistent_context(profile, headless=True, viewport={'width':390,'height':844}, is_mobile=True, has_touch=True)
        page = ctx.pages[0] if ctx.pages else ctx.new_page()
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.goto(BASE+'/tests/blank.html')
        now = page.evaluate('Date.now()')
        seed = {
            'rdo_manager_v3': {'goods':63,'moonActive':True,'moonEnd':now+5*60000,'moonDuration':48*60000,'buyerEnd':now+60000,'materials':'good','supplies':'good'},
            'rdo_legendary_collection_v1': {'got':{'emerald_wolf':True},'cooldowns':{'wolf':now+72*3600000}},
            'rdo_nat_mountain_grassland_v1': {'badger':{'sampled':True,'stamped':True}},
            'rdo_legendary_advisor_v2': {'syncOffsetMin':17,'calibrated':True}
        }
        page.evaluate('(seed)=>Object.entries(seed).forEach(([k,v])=>localStorage.setItem(k,JSON.stringify(v)))', seed)
        page.goto(BASE+'/');loaded(page)
        assert state(page)['data']['trader']['goods']==63
        assert state(page)['data']['clock']['offset']==17
        tab(page,'hunt')
        assert page.locator('[data-animal="emerald_wolf"]').is_hidden()
        tab(page,'sets')
        assert page.locator('#setProgress').inner_text()=='1 / 14 stamped'
        assert page.evaluate('document.documentElement.scrollWidth<=window.innerWidth')
        results.append(f'{engine_name}: legacy data and species cooldown filtering preserved')
        tab(page,'timers')
        page.locator('[data-action="goodsPlus"]').click()
        assert state(page)['data']['trader']['goods']==68
        page.locator('#undo').click()
        assert state(page)['data']['trader']['goods']==63
        old_end=state(page)['data']['moon']['end']
        page.reload();loaded(page)
        assert state(page)['data']['moon']['end']==old_end
        assert state(page)['data']['habitat']['stamped']['badger']
        results.append(f'{engine_name}: edits, Undo, reload and checklist persistence passed')
        # Simulate real time passing without running foreground interval callbacks.
        base=datetime.now(timezone.utc)
        page.clock.install(time=base)
        page.clock.set_system_time(base+timedelta(minutes=210))
        page.evaluate("window.dispatchEvent(new Event('pageshow'))")
        page.wait_for_function("JSON.parse(localStorage.getItem('rdo_companion_v5')).data.moon.status==='ready'")
        current=state(page)
        assert current['data']['buyers']['next']>page.evaluate('Date.now()')
        assert current['data']['buyers']['status']=='unknown'
        tab(page,'timers')
        assert 'Check' in page.locator('#buyerDecision').inner_text()
        results.append(f'{engine_name}: background-time catch-up and multiple buyer resets passed')
        tab(page,'tools')
        page.locator('[data-action="testStart"]').click()
        test_end=state(page)['data']['timers']['test']
        page.reload();loaded(page)
        assert state(page)['data']['timers']['test']==test_end
        tab(page,'tools')
        with page.expect_download() as info:
            page.locator('[data-action="backupExport"]').click()
        backup=json.loads(Path(info.value.path()).read_text())
        assert backup['schema']==5
        assert backup['data']['trader']['goods']==63
        assert len(backup['data']['history'])>0
        results.append(f'{engine_name}: backup export and persisted test timer passed')
        # Restore the exported snapshot after a real edit; importing must not reset timer deadlines.
        tab(page,'timers')
        page.locator('[data-action="goodsPlus"]').click()
        assert state(page)['data']['trader']['goods']==68
        tab(page,'tools')
        page.once('dialog', lambda dialog: dialog.accept())
        page.locator('#importFile').set_input_files({
            'name':'restore.json','mimeType':'application/json',
            'buffer':json.dumps(backup).encode()
        })
        page.wait_for_function("JSON.parse(localStorage.getItem('rdo_companion_v5')).data.trader.goods===63")
        assert state(page)['data']['timers']['test']==test_end
        results.append(f'{engine_name}: validated backup import restores data without restarting deadlines')
        tab(page,'plan')
        Path('test-results').mkdir(exist_ok=True)
        page.screenshot(path=f'test-results/{engine_name}-mobile-plan.png',full_page=True)
        assert not errors, errors
        ctx.close()
        # Close the entire browser, then reopen its same persistent profile.
        ctx=engine.launch_persistent_context(profile,headless=True)
        page=ctx.pages[0] if ctx.pages else ctx.new_page()
        page.goto(BASE+'/');loaded(page)
        assert state(page)['data']['trader']['goods']==63
        assert state(page)['data']['collection']['got']['emerald_wolf']
        assert state(page)['data']['timers']['test']==test_end
        results.append(f'{engine_name}: full browser close/reopen retained stored data')
        ctx.close()
    # Recovery when the database is the ONLY surviving legacy source.
    browser=engine.launch(headless=True)
    ctx=browser.new_context();page=ctx.new_page();page.goto(BASE+'/tests/blank.html')
    page.evaluate("""async()=>{await new Promise((resolve,reject)=>{
      const r=indexedDB.open('rdo-money-manager-state',1);
      r.onupgradeneeded=()=>r.result.createObjectStore('state',{keyPath:'key'});
      r.onsuccess=()=>{const db=r.result,tx=db.transaction('state','readwrite');
      tx.objectStore('state').put({key:'rdo_manager_v3',value:JSON.stringify({goods:87}),ts:Date.now()});
      tx.oncomplete=()=>{db.close();resolve()};tx.onerror=reject;};r.onerror=reject;
    })}""")
    page.goto(BASE+'/');loaded(page)
    assert state(page)['data']['trader']['goods']==87
    results.append(f'{engine_name}: database-only recovery was read before default saves')
    ctx.close()
    # Unavailable storage must be visible instead of a false success message.
    ctx=browser.new_context()
    ctx.add_init_script("Object.defineProperty(window,'indexedDB',{get(){throw new Error('test-blocked')}});Storage.prototype.setItem=function(){throw new Error('test-blocked')};")
    page=ctx.new_page();page.goto(BASE+'/');loaded(page);tab(page,'tools')
    page.locator('[data-action="testStart"]').click()
    page.wait_for_function("document.getElementById('saveStatus').textContent.includes('NOT SAVED')")
    results.append(f'{engine_name}: blocked storage displayed NOT SAVED warning')
    ctx.close();browser.close()

try:
    with sync_playwright() as playwright:
        for engine_name in ['chromium','webkit']:
            run_suite(getattr(playwright,engine_name),engine_name)
    Path('test-results').mkdir(exist_ok=True)
    Path('test-results/checks.json').write_text(json.dumps({'passed':results},indent=2))
    print('\n'.join(results))
finally:
    server.shutdown()
