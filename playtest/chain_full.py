"""Late-chain checks: arena 6 → 7 (boss) → temple finale → final results; the hint ladder's last rung (three misses: the full
working, then on); pause/quit; mobile overview."""
import asyncio, sys, time, os
from playwright.async_api import async_playwright
BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8321/"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "screens") + "/"; os.makedirs(OUT, exist_ok=True)
ARGS = ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]
async def phase(pg): return await pg.evaluate("window.__se ? window.__se.phase : null")
async def wait_phase(pg, want, timeout=180):
    t0 = time.time(); last = None
    while time.time() - t0 < timeout:
        p = await phase(pg)
        if p != last: print(f"   phase → {p}"); last = p
        if p == want: return True
        await pg.wait_for_timeout(150)
    print(f"!! timeout waiting for {want} (at {last})"); return False
async def settle(pg):
    await pg.wait_for_timeout(1200)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(headless=True, args=ARGS); logs = []
        def hook(pg, tag):
            pg.on("pageerror", lambda e: logs.append(f"[{tag} pageerror] {e}"))
            pg.on("console", lambda m: logs.append(f"[{tag} {m.type}] {m.text}") if m.type == "error" and "404" not in m.text else None)
        ctx = await b.new_context(viewport={"width": 1280, "height": 720}); pg = await ctx.new_page(); hook(pg, "late")
        async def shot(n): await pg.screenshot(path=f"{OUT}late_{n}.png"); print("📸", n)
        try:
            await pg.goto(BASE + "index.html?level=6&skip=1&mute=1&reset=1&auto=1", wait_until="load", timeout=180000)   # (auto: Karan walks the walks)
            await wait_phase(pg, "inside", 150); await pg.wait_for_timeout(3200); await shot("01_a6_reveal")
            await wait_phase(pg, "input", 150); await pg.wait_for_timeout(1200); await shot("02_a6_input")
            await pg.evaluate("__se.answer('correct')"); await wait_phase(pg, "exit", 60); await pg.wait_for_timeout(2500); await shot("03_a6_exit")
            await wait_phase(pg, "inside", 90); await pg.wait_for_timeout(3200); await shot("04_a7_reveal_boss")
            await wait_phase(pg, "input", 150); await pg.wait_for_timeout(1200); await shot("05_a7_input")
            await pg.evaluate("__se.answer('correct')"); await pg.wait_for_timeout(2500); await shot("06_a7_fire")
            await wait_phase(pg, "exit", 60); await pg.wait_for_timeout(3000); await shot("07_a7_exit")
            await wait_phase(pg, "finale", 90); await pg.wait_for_timeout(2500); await shot("08_finale_court")
            await pg.wait_for_selector("#screen-results.active", timeout=120000); await pg.wait_for_timeout(5000); await shot("09_results")
            await pg.click("#btn-next"); await pg.wait_for_selector("#screen-map.active", timeout=30000); await settle(pg); await pg.wait_for_timeout(500); await shot("10_overview_cleared")
            print("✅ late chain + finale OK")
        except Exception as e:
            print("❌ late:", repr(e)); await shot("zz_failure")
        # the hint ladder's last rung on arena 5 (close the finished page first: headless SwiftShader is CPU-bound). LXD 2026-10-29:
        # the third miss (here also the last shield) shows the full working and the game moves on: no game over any more
        await pg.close()
        pg2 = await ctx.new_page(); hook(pg2, "ladder")
        try:
            await pg2.goto(BASE + "index.html?level=5&skip=1&mute=1&reset=1&auto=1", wait_until="load", timeout=180000)   # software rendering: boot takes ~25–30 s
            for i, a in enumerate(["400", "999", "10"]):   # arena 5 = 80π (typed): the whole circle (400π), too big, too small
                if not await wait_phase(pg2, "input", 150): break
                await pg2.wait_for_timeout(400); await pg2.evaluate(f"__se.fire('{a}')"); await wait_phase(pg2, "result", 40); await pg2.wait_for_timeout(800)
                if i == 0: await pg2.wait_for_timeout(2500); await pg2.screenshot(path=f"{OUT}late_11_feedback_full_circle.png")
            await wait_phase(pg2, "solution", 120); await pg2.wait_for_timeout(6500); await pg2.screenshot(path=f"{OUT}late_12_full_working.png"); print("📸 full working")
            await wait_phase(pg2, "exit", 90); await pg2.wait_for_timeout(1500); await pg2.screenshot(path=f"{OUT}late_13_moved_on.png"); print("📸 moved on")
            await pg2.keyboard.press("Escape"); await pg2.wait_for_timeout(600); await pg2.click("#btn-pause-map"); await pg2.wait_for_selector("#screen-map.active", timeout=30000); await settle(pg2); await pg2.screenshot(path=f"{OUT}late_14_quit_overview.png"); print("📸 quit→overview")
            print("✅ hint ladder → full working → moved on / quit OK")
        except Exception as e:
            print("❌ ladder:", repr(e)); await pg2.screenshot(path=f"{OUT}late_zz_ladder.png")
        # mobile overview + input (close the desktop pages first: headless SwiftShader is CPU-bound)
        await pg2.close(); await ctx.close()
        m = await b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, has_touch=True, is_mobile=True); pm = await m.new_page(); hook(pm, "mobile")
        try:
            await pm.goto(BASE + "index.html?mute=1&reset=1", wait_until="load", timeout=120000); await pm.wait_for_selector("#screen-title.active", timeout=120000)
            await pm.tap("#btn-play"); await wait_phase(pm, "opening.stranded", 60); await pm.wait_for_timeout(3500); await pm.screenshot(path=f"{OUT}late_15a_mobile_opening.png"); print("📸 mobile opening")
            await pm.tap("#skip"); await wait_phase(pm, "causeway", 60); await pm.wait_for_timeout(1500); await pm.screenshot(path=f"{OUT}late_15b_mobile_stick.png"); print("📸 mobile stick + walkthrough")
            await pm.keyboard.press("Escape"); await pm.wait_for_timeout(600); await pm.tap("#btn-pause-map")
            await pm.wait_for_selector("#screen-map.active", timeout=30000); await settle(pm); await pm.wait_for_timeout(500); await pm.screenshot(path=f"{OUT}late_15_mobile_overview.png"); print("📸 mobile overview")
            await pm.goto(BASE + "index.html?level=1&skip=1&mute=1&auto=1", wait_until="load", timeout=120000)
            await wait_phase(pm, "input", 150); await pm.wait_for_timeout(1200); await pm.screenshot(path=f"{OUT}late_16_mobile_input.png"); print("📸 mobile input")
        except Exception as e:
            print("❌ mobile:", repr(e))
        print("\n".join(logs[-20:]) or "(no page errors)"); await b.close()
asyncio.run(main())
