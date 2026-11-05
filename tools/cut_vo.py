"""Cut the game's voice-over out of one recording, one clip per line, at the breathing spaces between them.

    python3 tools/cut_vo.py "../Sector Escape - art source/vo-2026-11-05/escape game voices.mp3"

tools/vo_cues.json lists every line: its id, who speaks it (narrator / karan), its words and where it sits in the recording
(seconds). For each line the tool finds the silence around it, cuts in the middle of that silence (at most 0.12 s before
the first word and 0.20 s after the last, so a breath or a word's tail is never clipped and the next line never leaks
in), fades the edges, takes 1 dB off (the recording peaks at -0.2 dBFS), encodes a mono MP3 (96 kbps, every browser
decodes it) into assets/audio/vo/<id>.mp3, and writes the clips into assets/manifest.json ("vo": path, who, text, length,
bytes) with a new version, so no browser keeps an old cut.

Needs macOS (afconvert decodes the source) and: pip3 install numpy lameenc
A re-recording: transcribe it (any tool), nudge each cue's from/to to its new place, run this again.
"""
import json, os, sys, subprocess, tempfile, wave, datetime
import numpy as np
import lameenc

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CUES = os.path.join(ROOT, 'tools', 'vo_cues.json')
OUT = os.path.join(ROOT, 'assets', 'audio', 'vo')
MANIFEST = os.path.join(ROOT, 'assets', 'manifest.json')
PRE, POST = 0.12, 0.20          # s of silence kept before the first word / after the last (at most half the pause)
FADE_IN, FADE_OUT = 0.006, 0.020
GAIN = 10 ** (-1 / 20)          # -1 dB: headroom for the encoder
KBPS = 96


def decode(src):
    tmp = tempfile.NamedTemporaryFile(suffix='.wav', delete=False).name
    subprocess.run(['afconvert', '-f', 'WAVE', '-d', 'LEI16@44100', '-c', '1', src, tmp], check=True)
    w = wave.open(tmp); sr = w.getframerate(); a = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
    os.unlink(tmp)
    return a, sr


def silence_mask(a, sr):
    """Per 10 ms frame: is it silent (12 dB above the recording's noise floor)?"""
    hop = sr // 100; n = len(a) // hop
    db = 20 * np.log10(np.sqrt(np.mean(a[:n * hop].reshape(n, hop) ** 2, axis=1)) + 1e-9)
    return db < np.percentile(db, 5) + 12, hop


def main():
    src = sys.argv[1] if len(sys.argv) > 1 else None
    if not src or not os.path.exists(src): sys.exit(__doc__)
    cues = json.load(open(CUES, encoding='utf-8'))['cues']
    a, sr = decode(src); quiet, hop = silence_mask(a, sr); n = len(quiet)
    os.makedirs(OUT, exist_ok=True)
    m = json.load(open(MANIFEST, encoding='utf-8')); vo = {}
    for c in cues:
        f0, f1 = int(c['from'] * 100), min(n - 1, int(c['to'] * 100))
        # the silence before the first word and after the last: cut inside it, never into a word
        s = f0
        while s > 0 and quiet[s - 1]: s -= 1
        e = f1
        while e < n - 1 and quiet[e + 1]: e += 1
        before, after = (f0 - s) / 100, (e - f1) / 100
        t0 = c['from'] - min(PRE, before / 2 if s > 0 else before)
        t1 = c['to'] + min(POST, after / 2 if e < n - 1 else after)
        clip = a[max(0, int(t0 * sr)):min(len(a), int(t1 * sr))].copy() * GAIN
        fi, fo = int(FADE_IN * sr), int(FADE_OUT * sr)
        clip[:fi] *= np.linspace(0, 1, fi); clip[-fo:] *= np.linspace(1, 0, fo)
        enc = lameenc.Encoder(); enc.set_bit_rate(KBPS); enc.set_in_sample_rate(sr); enc.set_channels(1); enc.set_quality(2)
        mp3 = enc.encode((np.clip(clip, -1, 1) * 32767).astype(np.int16).tobytes()) + enc.flush()
        path = os.path.join(OUT, c['id'] + '.mp3'); open(path, 'wb').write(mp3)
        vo[c['id']] = {'path': f"audio/vo/{c['id']}.mp3", 'who': c['who'], 'text': c['text'], 'dur': round(len(clip) / sr, 3), 'bytes': len(mp3)}
    m['vo'] = vo
    m['version'] = datetime.date.today().isoformat() + '.vo'
    open(MANIFEST, 'w', encoding='utf-8').write(json.dumps(m, indent=2, ensure_ascii=False) + '\n')
    total = sum(v['bytes'] for v in vo.values())
    print(f"{len(vo)} clips, {sum(v['dur'] for v in vo.values()):.1f} s, {total / 1024:.0f} KB → assets/audio/vo/; manifest version {m['version']}")


if __name__ == '__main__':
    main()
