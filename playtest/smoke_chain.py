"""Smoke test of the chain world: boot, overview, causeway, arena 1 to the exit, screenshots at each phase."""
import asyncio, sys, time, os
from playwright.async_api import async_playwright
BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8321/"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "screens") + "/"; os.makedirs(OUT, exist_ok=True)
ARGS = ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]
async def phase(pg): return await pg.evaluate("window.__se ? window.__se.phase : null")
async def wait_phase(pg, want, timeout=150):
    t0 = time.time(); last = None
    while time.time() - t0 < timeout:
        p = await phase(pg)
        if p != last: print(f"   phase → {p}"); last = p
        if p == want: return True
        await pg.wait_for_timeout(150)
    print(f"!! timeout waiting for {want} (at {last})"); return False
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(headless=True, args=ARGS)
        pg = await b.new_page(viewport={"width": 1280, "height": 720}); logs = []
        pg.on("console", lambda m: logs.append(f"[{m.type}] {m.text}") if m.type in ("error", "warning") and "404" not in m.text and "GL Driver" not in m.text else None)
        pg.on("pageerror", lambda e: logs.append(f"[pageerror] {e}"))
        async def shot(n): await pg.screenshot(path=f"{OUT}chain_{n}.png"); print("📸", n)
        try:
            await pg.goto(BASE + "index.html?mute=1&reset=1", wait_until="load")
            await pg.wait_for_selector("#screen-title.active", timeout=120000); await pg.wait_for_timeout(2500); await shot("01_title")
            await pg.click("#btn-play"); await pg.wait_for_timeout(500); await pg.click("#screen-story", position={"x": 60, "y": 60}); await pg.wait_for_timeout(400); await pg.click("#btn-start-journey")
            await pg.wait_for_selector("#screen-map.active", timeout=30000); await pg.wait_for_timeout(1500); await shot("02_map")
            await pg.click("#btn-enter")
            await wait_phase(pg, "causeway", 40); await pg.wait_for_timeout(2600); await shot("03_causeway")
            await wait_phase(pg, "gate", 60); await pg.wait_for_timeout(1200); await shot("04_gate_opening")
            await wait_phase(pg, "inside", 60); await pg.wait_for_timeout(3200); await shot("05_inside_reveal")
            await wait_phase(pg, "alert", 30); await pg.wait_for_timeout(1000); await shot("06_alert")
            await wait_phase(pg, "run", 30); await pg.wait_for_timeout(1500); await shot("07_run")
            await pg.keyboard.down("KeyW"); await wait_phase(pg, "rise", 60); await pg.keyboard.up("KeyW"); await pg.wait_for_timeout(1600); await shot("08_rise")
            await wait_phase(pg, "scan", 40); await pg.wait_for_timeout(2600); await shot("09_scan")
            await wait_phase(pg, "input", 40); await pg.wait_for_timeout(1200); await shot("10_input")
            await pg.evaluate("__se.fire('30')"); await pg.wait_for_timeout(2300); await shot("11_under_fire")
            await wait_phase(pg, "result", 40); await pg.wait_for_timeout(2500); await shot("12_under_lunge")
            await wait_phase(pg, "input", 60); await pg.evaluate("__se.fire('50')"); await pg.wait_for_timeout(2400); await shot("13_over_fire")
            await wait_phase(pg, "result", 40); await wait_phase(pg, "input", 60); await pg.evaluate("__se.fire('38.5')"); await pg.wait_for_timeout(2300); await shot("14_perfect")
            await wait_phase(pg, "exit", 60); await pg.wait_for_timeout(2600); await shot("15_reward_path")
            await pg.wait_for_timeout(4200); await shot("16_seal")
            await wait_phase(pg, "inside", 60); await pg.wait_for_timeout(3200); await shot("17_arena2_reveal")
            await wait_phase(pg, "input", 120); await pg.wait_for_timeout(1200); await shot("18_arena2_input")
            print("✅ chain smoke flow reached arena 2")
        except Exception as e:
            print("❌", repr(e)); await shot("zz_failure")
        finally:
            print("\n".join(logs[-25:]) or "(no console errors)"); await b.close()
asyncio.run(main())
