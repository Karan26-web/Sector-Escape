"""Quick visual pass with the real art: title, map, approach, inside, alert, run, scan, input, fire, exit + boss intro."""
import asyncio, sys, time, os
from playwright.async_api import async_playwright
BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8321/"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "screens") + "/"
ARGS = ["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--ignore-gpu-blocklist"]
async def phase(pg): return await pg.evaluate("window.__se ? window.__se.phase : null")
async def wait_phase(pg, want, timeout=120):
    t0 = time.time()
    while time.time() - t0 < timeout:
        if await phase(pg) == want: return True
        await pg.wait_for_timeout(150)
    print("!! timeout", want); return False
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(headless=True, args=ARGS)
        pg = await b.new_page(viewport={"width": 1280, "height": 720}); errs = []
        pg.on("pageerror", lambda e: errs.append(str(e)))
        async def shot(n): await pg.screenshot(path=f"{OUT}art_{n}.png"); print("📸", n)
        await pg.goto(BASE + "index.html?mute=1&reset=1", wait_until="load")
        await pg.wait_for_selector("#screen-title.active", timeout=90000); await pg.wait_for_timeout(1500); await shot("01_title")
        await pg.click("#btn-play"); await pg.wait_for_timeout(600); await pg.click("#screen-story", position={"x": 60, "y": 60}); await pg.wait_for_timeout(500); await shot("02_story")
        await pg.click("#btn-start-journey"); await pg.wait_for_timeout(1200); await shot("03_map")
        await pg.click("#btn-enter")
        await wait_phase(pg, "approach"); await pg.wait_for_timeout(2500); await shot("04_approach")
        await wait_phase(pg, "inside"); await pg.wait_for_timeout(1200); await shot("05_inside")
        await wait_phase(pg, "alert"); await pg.wait_for_timeout(2600); await shot("06_alert")
        await wait_phase(pg, "run"); await pg.wait_for_timeout(2500); await shot("07_run")
        await wait_phase(pg, "activate"); await pg.wait_for_timeout(500); await shot("08_activate")
        await wait_phase(pg, "input"); await pg.wait_for_timeout(1500); await shot("09_input")
        await pg.evaluate("__se.fire('154')"); await pg.wait_for_timeout(2300); await shot("10_fire")
        await wait_phase(pg, "exit"); await pg.wait_for_timeout(2400); await shot("11_exit")
        await pg.wait_for_selector("#screen-results.active", timeout=90000); await pg.wait_for_timeout(3000); await shot("12_results")
        # boss intro + night arena
        await pg.goto(BASE + "index.html?level=7&skip=1&auto=1&mute=1", wait_until="load")
        await wait_phase(pg, "boss-intro"); await pg.wait_for_timeout(1800); await shot("13_boss_intro")
        await wait_phase(pg, "input"); await pg.wait_for_timeout(1200); await shot("14_boss_input")
        await pg.goto(BASE + "index.html?level=5&skip=1&auto=1&mute=1", wait_until="load")
        await wait_phase(pg, "run"); await pg.wait_for_timeout(2000); await shot("15_night_run")
        print("page errors:", errs); await b.close()
asyncio.run(main())
