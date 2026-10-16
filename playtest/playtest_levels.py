"""Extra playtests: two-wave level (5), boss level (7), game-over + retry, mobile layout.
Run: python3 playtest/playtest_levels.py [base_url]"""
import asyncio, sys, time, os
from playwright.async_api import async_playwright
BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8321/"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "screens") + "/"
ARGS = ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"]

async def phase(pg): return await pg.evaluate("window.__se ? window.__se.phase : null")
async def wait_phase(pg, want, timeout=90):
    t0 = time.time(); last = None
    while time.time() - t0 < timeout:
        p = await phase(pg)
        if p != last: print(f"   phase → {p}"); last = p
        if p == want: return True
        await pg.wait_for_timeout(150)
    print(f"!! timeout waiting for {want} (at {last})"); return False

async def run_level(ctx, level, answers, tag, logs):
    pg = await ctx.new_page()
    pg.on("pageerror", lambda e: logs.append(f"[{tag} pageerror] {e}"))
    pg.on("console", lambda m: logs.append(f"[{tag} {m.type}] {m.text}") if m.type == "error" and "404" not in m.text else None)
    async def shot(n): await pg.screenshot(path=f"{OUT}{tag}_{n}.png"); print(f"📸 {tag}_{n}")
    await pg.goto(f"{BASE}index.html?level={level}&skip=1&auto=1&mute=1&reset=1", wait_until="load")
    for i, ans in enumerate(answers):
        if not await wait_phase(pg, "input", 150): await shot(f"w{i+1}_timeout"); break
        await pg.wait_for_timeout(900); await shot(f"w{i+1}_input")
        await pg.evaluate(f"__se.fire('{ans}')"); await pg.wait_for_timeout(2200); await shot(f"w{i+1}_fire")
        await wait_phase(pg, "result", 40); await pg.wait_for_timeout(1500); await shot(f"w{i+1}_result")
    if await wait_phase(pg, "exit", 120):
        await pg.wait_for_timeout(2200); await shot("exit")
        try:
            await pg.wait_for_selector("#screen-results.active", timeout=90000); await pg.wait_for_timeout(4500); await shot("results")
            if level == 7:
                await pg.click("#btn-next"); await pg.wait_for_selector("#screen-ending.active", timeout=20000); await pg.wait_for_timeout(1000); await shot("ending")
        except Exception as e: print("results timeout", e); await shot("results_timeout")
    await pg.close()

async def gameover(ctx, logs):
    pg = await ctx.new_page(); tag = "gameover"
    pg.on("pageerror", lambda e: logs.append(f"[{tag} pageerror] {e}"))
    async def shot(n): await pg.screenshot(path=f"{OUT}{tag}_{n}.png"); print(f"📸 {tag}_{n}")
    await pg.goto(f"{BASE}index.html?level=1&skip=1&auto=1&mute=1&reset=1", wait_until="load")
    for i in range(3):
        if not await wait_phase(pg, "input", 150): break
        await pg.wait_for_timeout(600)
        await pg.evaluate(f"__se.fire('{[616, 22, 9999][i]}')")  # full circle, arc length, huge
        await wait_phase(pg, "result", 40); await pg.wait_for_timeout(1200)
        if i == 0: await pg.wait_for_timeout(2500); await shot("feedback_full_circle_after")
    try:
        await pg.wait_for_selector("#screen-gameover.active", timeout=60000); await pg.wait_for_timeout(1200); await shot("screen")
        await pg.click("#btn-retry"); await wait_phase(pg, "input", 150); await pg.wait_for_timeout(800); await shot("retry_input")
    except Exception as e: print("gameover failed", e); await shot("fail")
    await pg.close()

async def pause_quit(ctx, logs):
    pg = await ctx.new_page(); tag = "pause"
    pg.on("pageerror", lambda e: logs.append(f"[{tag} pageerror] {e}"))
    async def shot(n): await pg.screenshot(path=f"{OUT}{tag}_{n}.png"); print(f"📸 {tag}_{n}")
    await pg.goto(f"{BASE}index.html?level=2&skip=1&auto=1&mute=1&reset=1", wait_until="load")
    if await wait_phase(pg, "input", 150):
        await pg.keyboard.press("Escape"); await pg.wait_for_timeout(700); await shot("menu")
        await pg.click("#btn-pause-map"); 
        try:
            await pg.wait_for_selector("#screen-map.active", timeout=20000); await pg.wait_for_timeout(1200); await shot("back_on_map")
        except Exception as e: print("pause→map failed", e); await shot("fail")
    await pg.close()

async def mobile(ctx_factory, logs):
    ctx = await ctx_factory({"width": 390, "height": 844}, 2, True)
    pg = await ctx.new_page(); tag = "mobile"
    async def shot(n): await pg.screenshot(path=f"{OUT}{tag}_{n}.png"); print(f"📸 {tag}_{n}")
    await pg.goto(f"{BASE}index.html?mute=1&reset=1", wait_until="load")
    await pg.wait_for_selector("#screen-title.active", timeout=90000); await pg.wait_for_timeout(1200); await shot("title")
    await pg.goto(f"{BASE}index.html?level=1&skip=1&auto=1&mute=1&reset=1", wait_until="load")
    if await wait_phase(pg, "input", 150): await pg.wait_for_timeout(1200); await shot("input")
    await ctx.close()

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(headless=True, args=ARGS)
        logs = []
        async def ctx_factory(vp, dsf=1, touch=False): return await b.new_context(viewport=vp, device_scale_factor=dsf, has_touch=touch, is_mobile=touch)
        ctx = await ctx_factory({"width": 1280, "height": 720})
        await run_level(ctx, 5, ["308", "924"], "L5", logs)
        await run_level(ctx, 7, ["616", "924", "1540"], "L7boss", logs)
        await gameover(ctx, logs)
        await pause_quit(ctx, logs)
        await mobile(ctx_factory, logs)
        print("\n".join(logs[-30:]) or "(no page errors)")
        await b.close()
asyncio.run(main())
