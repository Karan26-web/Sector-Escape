// ---------------------------------------------------------------------------
// Sector Escape – asset loader
//  * reads assets/manifest.json
//  * downloads and decodes every image before the game starts, with byte-accurate progress; a file that fails or stalls
//    never blocks: it is retried as a plain image, then replaced by a procedural placeholder, so the game always plays
//  * the voice-over's lines (manifest "vo") load in the same queue and are decoded to audio buffers (an offline audio
//    context: no tap needed); a line that fails is simply not spoken
// ---------------------------------------------------------------------------
import * as THREE from '../../vendor/three.module.js';
import { PLACEHOLDERS } from '../placeholders/index.js';

export const ASSET_BASE = './assets/';
const PARALLEL = 5;          // downloads at a time
const STALL_MS = 15000;      // a download that receives no byte for this long is aborted (and retried as a plain image)
const CAP_MS = 90000;        // no download may take longer than this in total
const IMG_MS = 30000;        // loading + decoding one image element, and the manifest request, give up after this

/** Load and DECODE an image (a decoded image draws and uploads at once; otherwise the first use pays for it).
 *  Rejects on an error or after IMG_MS: it never hangs. */
function loadImageEl(url) {
  return new Promise((resolve, reject) => {
    const im = new Image(); im.decoding = 'async';
    const timer = setTimeout(() => { im.onload = im.onerror = null; im.src = ''; reject(new Error('timed out')); }, IMG_MS);
    im.onload = () => Promise.resolve(im.decode && im.decode().catch(() => {})).then(() => { clearTimeout(timer); resolve(im); });
    im.onerror = () => { clearTimeout(timer); reject(new Error('could not load')); };
    im.src = url;
  });
}

/** Download a file through a streaming reader, reporting the bytes as they arrive: onBytes(received, Content-Length or 0).
 *  Aborted when no byte arrives for STALL_MS, or after CAP_MS in total. */
async function fetchBytes(url, onBytes) {
  const ctl = new AbortController(); let stall = 0;
  const kick = () => { clearTimeout(stall); stall = setTimeout(() => ctl.abort(new Error(`no data for ${STALL_MS / 1000} s`)), STALL_MS); };
  const cap = setTimeout(() => ctl.abort(new Error(`still downloading after ${CAP_MS / 1000} s`)), CAP_MS);
  try {
    kick();
    const res = await fetch(url, { signal: ctl.signal });
    if (!res.ok) throw Object.assign(new Error('HTTP ' + res.status), { status: res.status });
    // Content-Length counts the bytes on the wire: it matches what the reader yields only when nothing is compressed
    const len = res.headers.get('Content-Encoding') ? 0 : +res.headers.get('Content-Length') || 0, type = res.headers.get('Content-Type') || '';
    onBytes(0, len);
    if (!res.body || !res.body.getReader) { const b = await res.blob(); onBytes(b.size, len); return b; }
    const reader = res.body.getReader(), parts = []; let got = 0;
    for (;;) {
      kick();
      const { done, value } = await reader.read();
      if (done) break;
      parts.push(value); got += value.byteLength; onBytes(got, len);
    }
    return new Blob(parts, { type });
  } finally { clearTimeout(stall); clearTimeout(cap); }
}

/** Progress over a set of downloads, by bytes. Each file weighs its expected size (the manifest's on-disk "bytes", replaced
 *  by the Content-Length once its response starts) and counts in full only once decoded. The reported value never goes
 *  down, even when a file turns out bigger than expected. */
class ByteProgress {
  constructor(names, sizeOf, onProgress) {
    this.expect = new Map(names.map((n) => [n, sizeOf(n)])); this.got = new Map(); this.done = new Set(); this.shown = 0; this.on = onProgress;
  }
  bytes(name, got, len) { if (len) this.expect.set(name, len); this.got.set(name, got); this.emit(name); }
  finish(name) { this.done.add(name); this.emit(name); }
  emit(name) {
    let have = 0, total = 0;
    for (const [n, e] of this.expect) { total += e; have += this.done.has(n) ? e : Math.min(this.got.get(n) || 0, e) * 0.97; }
    const p = total ? have / total : 1;
    if (p > this.shown) { this.shown = p; if (this.on) this.on(p, name); }
  }
}

/** Decode audio bytes (callback form: older Safari has no promise version). Rejects on bad data or after IMG_MS. */
let decoder = null;
function decodeAudio(bytes) {
  const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  if (!OAC) return Promise.reject(new Error('no Web Audio'));
  decoder = decoder || new OAC(1, 1, 44100);
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('decoding timed out')), IMG_MS);
    try { decoder.decodeAudioData(bytes, (b) => { clearTimeout(timer); resolve(b); }, (e) => { clearTimeout(timer); reject(e || new Error('could not decode')); }); }
    catch (e) { clearTimeout(timer); reject(e); }
  });
}

export class Assets {
  constructor() {
    this.manifest = { images: {}, sfx: {}, music: {}, vo: {} };
    this.images = new Map();     // name → HTMLImageElement | HTMLCanvasElement
    this.voices = new Map();     // voice-over line id → AudioBuffer
    this.textures = new Map();   // cache key → THREE.Texture
    this.status = new Map();     // name → 'file' | 'placeholder' | 'missing'
    this.renderer = null;
  }
  setRenderer(r) { this.renderer = r; }

  async loadManifest(url = ASSET_BASE + 'manifest.json') {
    const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), IMG_MS);
    try { const res = await fetch(url, { cache: 'no-cache', signal: ctl.signal }); if (res.ok) this.manifest = await res.json(); }
    catch (e) { console.warn('[assets] manifest not loaded, using placeholders only', e); }
    finally { clearTimeout(timer); }
    return this.manifest;
  }

  def(name) { return this.manifest.images[name] || null; }
  /** A voice-over line: { path, who, text, dur, bytes } */
  voDef(id) { return (this.manifest.vo || {})[id] || null; }
  voice(id) { return this.voices.get(id) || null; }
  /** The file's own URL. ?v=<manifest version>: a replaced file gets a new URL, so no browser keeps showing a cached old copy.
   *  Loaded images use a blob: URL of the downloaded bytes instead; this is the fallback if that ever fails. */
  fileUrl(name, def = this.def(name)) {
    if (!def || !def.path) return '';
    return ASSET_BASE + def.path + (this.manifest.version ? `?v=${encodeURIComponent(this.manifest.version)}` : '');
  }

  /** Every manifest image and voice-over line, before the game starts: smallest files first (the bar moves from the first
   *  second and the big files stream in at the end), PARALLEL at a time. `first` names jump the queue and `onFirst` runs
   *  once they are in (the loading screen's logo). onProgress(0..1, name) follows the bytes. Lines queue as 'vo:<id>'. */
  async loadAll(onProgress, { first = [], onFirst = null } = {}) {
    const names = Object.keys(this.manifest.images).filter((n) => !this.images.has(n))
      .concat(Object.keys(this.manifest.vo || {}).filter((id) => !this.voices.has(id)).map((id) => 'vo:' + id));
    const entry = (n) => (n.startsWith('vo:') ? this.voDef(n.slice(3)) : this.def(n));
    const known = names.map((n) => entry(n).bytes).filter(Boolean).sort((a, b) => a - b);
    const guess = known.length ? known[known.length >> 1] : 100000;     // a file without a size entry weighs the median
    const size = (n) => entry(n).bytes || guess;
    const queue = names.sort((a, b) => first.includes(b) - first.includes(a) || size(a) - size(b));
    const prog = new ByteProgress(queue, size, onProgress);
    const waiting = new Set(first.filter((n) => queue.includes(n)));
    if (onFirst && !waiting.size) onFirst();
    const worker = async () => {
      for (let n; (n = queue.shift()); ) {
        if (n.startsWith('vo:')) await this.loadVoice(n.slice(3), prog); else await this.load(n, this.def(n), prog);
        prog.finish(n);
        if (waiting.delete(n) && !waiting.size && onFirst) onFirst();
      }
    };
    await Promise.all(Array.from({ length: Math.min(PARALLEL, queue.length) }, worker));
    // placeholders that are referenced in code but absent from the manifest
    for (const name of Object.keys(PLACEHOLDERS)) if (!this.images.has(name)) await this.load(name, {});
  }

  /** One image: streamed into a blob: URL (its bytes move the progress bar); if that fails or stalls, the plain file URL;
   *  if that fails too, its procedural placeholder. Never throws, never hangs. */
  async load(name, def = {}, prog = null) {
    let img = null;
    if (def.path) {
      const url = this.fileUrl(name);
      try {
        const blob = await fetchBytes(url, (got, len) => prog && prog.bytes(name, got, len));
        const local = URL.createObjectURL(blob);   // kept for the whole session: the UI shows these images by this URL too
        img = await loadImageEl(local).catch((e) => { URL.revokeObjectURL(local); throw e; });
      } catch (e) {
        const gone = e.status >= 400 && e.status < 500;   // the file is not there: asking again cannot help
        console.warn(`[assets] ${name}: ${e.message || e}; ${gone ? 'using its placeholder' : 'retrying as a plain image'}`);
        if (!gone) img = await loadImageEl(url).catch(() => null);
      }
      if (img) this.status.set(name, 'file');
    }
    if (!img) {
      const gen = PLACEHOLDERS[name];
      if (gen) { img = gen(def, this); this.status.set(name, 'placeholder'); }
      else { this.status.set(name, 'missing'); if (def.path) console.warn('[assets] no file and no placeholder for', name); return null; }
    }
    this.images.set(name, img);
    return img;
  }

  /** One voice-over line: downloaded (its bytes move the bar) and decoded. Never throws: a line that cannot load is not
   *  spoken (its words are on screen where the game needs them). */
  async loadVoice(id, prog = null) {
    const def = this.voDef(id), name = 'vo:' + id; if (!def || !def.path) return null;
    try {
      const blob = await fetchBytes(this.fileUrl(name, def), (got, len) => prog && prog.bytes(name, got, len));
      const buf = await decodeAudio(await blob.arrayBuffer());
      this.voices.set(id, buf); return buf;
    } catch (e) { console.warn(`[assets] voice ${id}: ${e.message || e}`); return null; }
  }

  has(name) { return this.images.has(name); }
  get(name) { return this.images.get(name) || null; }
  isPlaceholder(name) { return this.status.get(name) !== 'file'; }

  /** Sheet geometry for a sprite sheet (cols/rows/frame size + anims). */
  frames(name) {
    const def = this.def(name) || {}, img = this.get(name);
    const sheet = def.sheet || { cols: 1, rows: 1, anims: { idle: { row: 0, frames: 1, fps: 1 } } };
    const w = img ? (img.width || img.naturalWidth) : 256, h = img ? (img.height || img.naturalHeight) : 256;
    return { cols: sheet.cols, rows: sheet.rows, frameW: w / sheet.cols, frameH: h / sheet.rows, anims: sheet.anims, worldHeight: def.worldHeight ?? 1.8, anchor: def.anchor ?? [0.5, 1], baseline: def.baseline ?? 1 };
  }

  /** THREE texture for an image (cached). opts: repeat [x,y], wrap, nearest, srgb */
  texture(name, opts = {}) {
    const key = name + JSON.stringify(opts);
    if (this.textures.has(key)) return this.textures.get(key);
    const img = this.get(name);
    if (!img) return null;
    const tex = new THREE.Texture(img);
    tex.colorSpace = opts.linear ? THREE.NoColorSpace : THREE.SRGBColorSpace;
    if (opts.wrap !== false) { tex.wrapS = tex.wrapT = THREE.RepeatWrapping; } else { tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping; }
    if (opts.repeat) tex.repeat.set(opts.repeat[0], opts.repeat[1]);
    if (opts.nearest) { tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.NearestFilter; tex.generateMipmaps = false; }
    else { tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearMipmapLinearFilter; }
    if (this.renderer) tex.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
    tex.needsUpdate = true;
    this.textures.set(key, tex);
    return tex;
  }

}

export const assets = new Assets();
