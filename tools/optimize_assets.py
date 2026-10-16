"""
Convert every PNG under assets/ to WebP (lossy colour, lossless alpha), update
assets/manifest.json paths and delete the PNGs. Re-run it whenever new art lands.
    python3 tools/optimize_assets.py            # convert + report
    python3 tools/optimize_assets.py --dry-run  # report only
Quality: sprites/UI 90, textures 85, very large textures 82 (visually lossless at game scale).
"""
import os, sys, json
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, 'assets'); MANIFEST = os.path.join(ASSETS, 'manifest.json')
DRY = '--dry-run' in sys.argv
def quality(path, im):
    if '/textures/' in path: return 82 if im.width * im.height >= 2048 * 1024 else 85
    if '/ui/' in path and im.width * im.height >= 1920 * 1080: return 84
    return 90
before = after = 0; converted = []
for root, _, files in os.walk(ASSETS):
    for f in sorted(files):
        if not f.lower().endswith('.png'): continue
        src = os.path.join(root, f); dst = src[:-4] + '.webp'
        im = Image.open(src); q = quality(src.replace(os.sep, '/'), im)
        b = os.path.getsize(src); before += b
        if not DRY:
            im.save(dst, 'WEBP', quality=q, method=6, alpha_quality=100)
            os.remove(src)
        a = os.path.getsize(dst) if os.path.exists(dst) else 0; after += a
        converted.append((os.path.relpath(src, ASSETS), b, a, q))
m = json.load(open(MANIFEST))
for k, d in m['images'].items():
    if d.get('path', '').endswith('.png'):
        if not DRY: d['path'] = d['path'][:-4] + '.webp'
if not DRY: json.dump(m, open(MANIFEST, 'w'), indent=2, ensure_ascii=False)
for rel, b, a, q in converted: print(f"{rel:40s} {b/1024:8.0f} KB → {a/1024:7.0f} KB  (q{q})")
print(f"\n{len(converted)} files: {before/1024/1024:.1f} MB → {after/1024/1024:.1f} MB" + (" [dry run]" if DRY else ""))
