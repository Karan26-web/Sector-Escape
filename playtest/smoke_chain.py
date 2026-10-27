"""Smoke test of the chain world: boot, Play → the opening (stranded · the temple's beam · the arenas), the walk along the
causeway (the autopilot drives the controller), the gate, arena 1 (the gap, the guardians arriving at the barrier, the walk to
the observation spot, the top-view construction, too small / too wide / exact), the results card, the walk into arena 2."""
import asyncio, sys, time, os
from playwright.async_api import async_playwright
BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8321/"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "screens") + "/"; os.makedirs(OUT, exist_ok=True)
ARGS = ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]
async def phase(pg): return await pg.evaluate("window.__se ? window.__se.phase : null")
ORDER = ['opening.stranded', 'opening.temple', 'opening.path', 'causeway', 'gate', 'inside', 'arrive', 'observe', 'tactical', 'scan', 'input']
async def wait_phase(pg, want, timeout=150, or_later=False):
    """Wait for a phase; with or_later, also accept any later phase of the same arena intro (screenshots can be slow)."""
    t0 = time.time(); last = None
    while time.time() - t0 < timeout:
        p = await phase(pg)
        if p != last: print(f"   phase → {p}"); last = p
        if p == want: return True
        if or_later and want in ORDER and p in ORDER and ORDER.index(p) > ORDER.index(want): return True
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
            await pg.goto(BASE + "index.html?mute=1&reset=1&auto=1", wait_until="load", timeout=180000)
            await pg.wait_for_selector("#screen-title.active", timeout=120000); await pg.wait_for_timeout(2500); await shot("01_title")
            await pg.click("#btn-play")
            await wait_phase(pg, "opening.stranded", 60); await pg.wait_for_timeout(3000); await shot("02_opening_stranded")
            await wait_phase(pg, "opening.temple", 120); await pg.wait_for_timeout(5000); await shot("02b_opening_temple_beam")
            await wait_phase(pg, "opening.path", 120); await pg.wait_for_timeout(9000); await shot("02c_opening_arenas")
            await wait_phase(pg, "causeway", 120); await pg.wait_for_timeout(1500); await shot("03_causeway_walk")
            await wait_phase(pg, "gate", 60); await pg.wait_for_timeout(1200); await shot("04_gate_opening")
            await wait_phase(pg, "inside", 60); await pg.wait_for_timeout(900); await shot("05_inside_gap")
            await wait_phase(pg, "arrive", 30, or_later=True); await pg.wait_for_timeout(1500); await shot("06_guardians_pound")
            await wait_phase(pg, "observe", 30, or_later=True); await pg.wait_for_timeout(500); await shot("07_to_observation_point")
            await wait_phase(pg, "tactical", 40, or_later=True); await pg.wait_for_timeout(900); await shot("08_top_view")
            await wait_phase(pg, "scan", 40, or_later=True); await pg.wait_for_timeout(2600); await shot("09_scan")
            await wait_phase(pg, "input", 40); await pg.wait_for_timeout(1200); await shot("10_input")
            await pg.evaluate("__se.answer('under')"); await pg.wait_for_timeout(2300); await shot("11_under_fire")
            await wait_phase(pg, "result", 40); await pg.wait_for_timeout(2000); await shot("12_under_breakthrough")
            await wait_phase(pg, "input", 60); await pg.evaluate("__se.answer('over')")
            await pg.wait_for_function("__se.scene && __se.scene.heroDown !== null", timeout=60000); await pg.wait_for_timeout(900); await shot("13_over_knockdown")
            await wait_phase(pg, "result", 40); await wait_phase(pg, "input", 60); await pg.evaluate("__se.answer('correct')"); await pg.wait_for_timeout(2300); await shot("14_perfect")
            await wait_phase(pg, "exit", 60); await pg.wait_for_timeout(2600); await shot("15_reward_path")   # (no results card: straight on)
            await pg.wait_for_timeout(4200); await shot("16_through_the_gap")
            await wait_phase(pg, "inside", 90, or_later=True); await pg.wait_for_timeout(3200); await shot("17_arena2_reveal")
            await wait_phase(pg, "input", 120); await pg.wait_for_timeout(1200); await shot("18_arena2_input")
            print("✅ chain smoke flow reached arena 2")
        except Exception as e:
            print("❌", repr(e)); await shot("zz_failure")
        finally:
            print("\n".join(logs[-25:]) or "(no console errors)"); await b.close()
asyncio.run(main())
