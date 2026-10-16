// ---------------------------------------------------------------------------
// Sector Escape – asset loader
//  * reads assets/manifest.json
//  * loads PNGs; any missing file falls back to a procedural placeholder so
//    the game is always playable while art is being produced
//  * optional chroma-key (e.g. "#FF00FF") for sheets generated on a flat colour
// ---------------------------------------------------------------------------
import * as THREE from '../../vendor/three.module.js';
import { PLACEHOLDERS } from '../placeholders/index.js';

export const ASSET_BASE = './assets/';

function hexToRgb(hex) { const n = parseInt(hex.replace('#', ''), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }

/** Make pixels close to `hex` transparent (with soft edge). */
export function chromaKey(img, hex, tolerance = 60, feather = 40) {
  const c = document.createElement('canvas'); c.width = img.width || img.naturalWidth; c.height = img.height || img.naturalHeight;
  const g = c.getContext('2d'); g.drawImage(img, 0, 0);
  const id = g.getImageData(0, 0, c.width, c.height), d = id.data, [kr, kg, kb] = hexToRgb(hex);
  for (let i = 0; i < d.length; i += 4) {
    const dist = Math.sqrt((d[i] - kr) ** 2 + (d[i + 1] - kg) ** 2 + (d[i + 2] - kb) ** 2);
    if (dist < tolerance) d[i + 3] = 0;
    else if (dist < tolerance + feather) d[i + 3] = Math.min(d[i + 3], Math.round(((dist - tolerance) / feather) * 255));
  }
  g.putImageData(id, 0, 0); return c;
}

function loadImageEl(url) {
  return new Promise((resolve, reject) => {
    const im = new Image(); im.onload = () => resolve(im); im.onerror = () => reject(new Error('missing ' + url)); im.src = url;
  });
}

export class Assets {
  constructor() {
    this.manifest = { images: {}, sfx: {}, music: {} };
    this.images = new Map();     // name → HTMLImageElement | HTMLCanvasElement
    this.textures = new Map();   // cache key → THREE.Texture
    this.status = new Map();     // name → 'file' | 'placeholder' | 'missing'
    this.renderer = null;
  }
  setRenderer(r) { this.renderer = r; }

  async loadManifest(url = ASSET_BASE + 'manifest.json') {
    try { const res = await fetch(url, { cache: 'no-cache' }); if (res.ok) this.manifest = await res.json(); }
    catch (e) { console.warn('[assets] manifest not loaded, using placeholders only', e); }
    return this.manifest;
  }

  def(name) { return this.manifest.images[name] || null; }

  async loadAll(onProgress) {
    const entries = Object.entries(this.manifest.images);
    let done = 0;
    const primary = entries.filter(([, d]) => !d.fallback), secondary = entries.filter(([, d]) => d.fallback);
    await Promise.all(primary.map(async ([name, def]) => { await this.load(name, def); done++; onProgress && onProgress(done / entries.length, name); }));
    for (const [name, def] of secondary) { await this.load(name, def); done++; onProgress && onProgress(done / entries.length, name); }
    // placeholders that are referenced in code but absent from the manifest
    for (const name of Object.keys(PLACEHOLDERS)) if (!this.images.has(name)) await this.load(name, this.manifest.images[name] || {});
  }

  async load(name, def = {}) {
    let img = null;
    if (def.path) {
      const alt = def.path.endsWith('.webp') ? def.path.replace(/\.webp$/, '.png') : def.path.replace(/\.png$/, '.webp');
      try {
        img = await loadImageEl(ASSET_BASE + def.path).catch(() => loadImageEl(ASSET_BASE + alt));
        if (def.chromaKey) img = chromaKey(img, def.chromaKey, def.chromaTolerance ?? 60, def.chromaFeather ?? 40);
        this.status.set(name, 'file');
      } catch { img = null; }
    }
    if (!img && def.fallback && this.images.has(def.fallback)) { img = this.images.get(def.fallback); this.status.set(name, 'fallback'); }
    if (!img) {
      const gen = PLACEHOLDERS[name];
      if (gen) { img = gen(def, this); this.status.set(name, 'placeholder'); }
      else { this.status.set(name, 'missing'); console.warn('[assets] no file and no placeholder for', name); return null; }
    }
    this.images.set(name, img);
    return img;
  }

  has(name) { return this.images.has(name); }
  get(name) { return this.images.get(name) || null; }
  isPlaceholder(name) { return this.status.get(name) !== 'file'; }

  /** Sheet geometry for a sprite sheet (cols/rows/frame size + anims). */
  frames(name) {
    const def = this.def(name) || {}, img = this.get(name);
    const sheet = def.sheet || { cols: 1, rows: 1, anims: { idle: { row: 0, frames: 1, fps: 1 } } };
    const w = img ? (img.width || img.naturalWidth) : 256, h = img ? (img.height || img.naturalHeight) : 256;
    return { cols: sheet.cols, rows: sheet.rows, frameW: w / sheet.cols, frameH: h / sheet.rows, anims: sheet.anims, worldHeight: def.worldHeight ?? 1.8, anchor: def.anchor ?? [0.5, 1] };
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

  /** CSS url() for UI images (file or placeholder canvas → data URL, cached). */
  cssUrl(name) {
    const img = this.get(name); if (!img) return 'none';
    if (img instanceof HTMLCanvasElement) { if (!img.__dataUrl) img.__dataUrl = img.toDataURL('image/png'); return `url(${img.__dataUrl})`; }
    return `url(${img.src})`;
  }
}

export const assets = new Assets();
