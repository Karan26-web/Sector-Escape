"""
Sector Escape – automated playtest (Playwright, Python).
Drives the full flow: title → story → map → arena 1 (approach, alert, run,
tactical, scan, input) → undercharged → overcharged → perfect → exit → results.
Screenshots land in playtest/screens/.   Run:  python3 playtest/playtest.py [base_url]
"""
import asyncio, sys, time, os
from playwright.async_api import async_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8321/"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "screens") + "/"
os.makedirs(OUT, exist_ok=True)
ARGS = ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"]

async def phase(pg):
    return await pg.evaluate("window.__se ? window.__se.phase : null")

async def wait_phase(pg, want, timeout=60):
    t0 = time.time(); last = None
    while time.time() - t0 < timeout:
        p = await phase(pg)
        if p != last: print(f"   phase → {p}"); last = p
        if p == want: return True
        await pg.wait_for_timeout(150)
    print(f"!! timeout waiting for phase {want} (at {last})"); return False

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(headless=True, args=ARGS)
        ctx = await b.new_context(viewport={"width": 1280, "height": 720}, device_scale_factor=1)
        pg = await ctx.new_page()
        logs = []
        pg.on("console", lambda m: logs.append(f"[{m.type}] {m.text}") if m.type in ("error", "warning") else None)
        pg.on("pageerror", lambda e: logs.append(f"[pageerror] {e}"))
        async def shot(name):
            await pg.screenshot(path=f"{OUT}{name}.png"); print(f"📸 {name}")
        try:
            await pg.goto(BASE + "index.html?mute=1&reset=1", wait_until="load")
            await pg.wait_for_selector("#screen-title.active", timeout=90000); await pg.wait_for_timeout(1800); await shot("01_title")
            await pg.click("#btn-play"); await pg.wait_for_timeout(1500); await shot("02_story")
            await pg.click("#screen-story", position={"x": 100, "y": 100}); await pg.wait_for_timeout(400)
            await pg.click("#btn-start-journey"); await pg.wait_for_timeout(1200); await shot("03_map")
            await pg.click("#btn-enter")
            await wait_phase(pg, "approach", 30); await pg.wait_for_timeout(1800); await shot("04_approach")
            await wait_phase(pg, "inside", 60); await pg.wait_for_timeout(900); await shot("05_inside")
            await wait_phase(pg, "alert", 30); await pg.wait_for_timeout(1600); await shot("06_alert_breach")
            await wait_phase(pg, "run", 30); await pg.wait_for_timeout(1200); await shot("07_run_to_cannon")
            # steer with keyboard for a moment, then let auto-run finish
            await pg.keyboard.down("KeyW"); await pg.wait_for_timeout(900); await pg.keyboard.up("KeyW")
            await wait_phase(pg, "activate", 60); await pg.wait_for_timeout(600); await shot("08_activate")
            await wait_phase(pg, "tactical", 30); await pg.wait_for_timeout(1200); await shot("09_tactical_swing")
            await wait_phase(pg, "scan", 30); await pg.wait_for_timeout(2200); await shot("10_scan")
            await wait_phase(pg, "input", 40); await pg.wait_for_timeout(1500); await shot("11_input_panel")
            await pg.evaluate("__se.hint()"); await pg.wait_for_timeout(500); await shot("12_hint")
            # --- undercharged
            await pg.evaluate("__se.fire('100')"); await pg.wait_for_timeout(2300); await shot("13_fire_under")
            await wait_phase(pg, "result", 30); await pg.wait_for_timeout(1300); await shot("14_under_stamp"); await pg.wait_for_timeout(1400); await shot("14b_bots_lunge")
            await wait_phase(pg, "input", 40); await pg.wait_for_timeout(900); await shot("15_retry_feedback")
            # --- overcharged
            await pg.evaluate("__se.fire('200')"); await pg.wait_for_timeout(2400); await shot("16_fire_over")
            await wait_phase(pg, "result", 30); await pg.wait_for_timeout(900); await shot("17_over_stamp")
            await wait_phase(pg, "input", 40); await pg.wait_for_timeout(500)
            # --- perfect
            await pg.evaluate("__se.fire('154')"); await pg.wait_for_timeout(2300); await shot("18_fire_perfect")
            await wait_phase(pg, "result", 30); await pg.wait_for_timeout(1000); await shot("19_perfect_stamp")
            await wait_phase(pg, "exit", 60); await pg.wait_for_timeout(2600); await shot("20_exit_gate")
            await pg.wait_for_selector("#screen-results.active", timeout=60000); await pg.wait_for_timeout(4500); await shot("21_results")
            await pg.click("#btn-next"); await pg.wait_for_timeout(3500); await shot("22_map_travel")
            print("✅ playtest flow completed")
        except Exception as e:
            print("❌", repr(e)); await shot("zz_failure")
        finally:
            print("\n".join(logs[-40:]) or "(no console errors)")
            await b.close()

asyncio.run(main())
