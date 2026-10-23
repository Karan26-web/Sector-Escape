"""Write every manifest image's real on-disk size into assets/manifest.json ("bytes"), so the loading bar can weight each
download by its actual size before the first byte arrives (the browser refines it with Content-Length).

    python3 tools/manifest_sizes.py

Run it whenever art is added or replaced (and bump the manifest "version" when a file keeps its name).
"""
import json, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
path = os.path.join(ROOT, 'assets', 'manifest.json')
m = json.load(open(path, encoding='utf-8'))
total = 0
for name, d in m['images'].items():
    f = d.get('path') and os.path.join(ROOT, 'assets', d['path'])
    if f and os.path.exists(f):
        d['bytes'] = os.path.getsize(f); total += d['bytes']
    else:
        d.pop('bytes', None)
open(path, 'w', encoding='utf-8').write(json.dumps(m, indent=2, ensure_ascii=False) + '\n')
print(f'{sum(1 for d in m["images"].values() if "bytes" in d)} images, {total / 1024:.0f} KB in total')
