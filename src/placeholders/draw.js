// Canvas drawing helpers for the procedural placeholder art
export const OUT = '#15111a';
export function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
export function rrect(g, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
export function poly(g, pts) { g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); }
export function circle(g, x, y, r) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.closePath(); }
export function ellipse(g, x, y, rx, ry, rot = 0) { g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); g.closePath(); }
/** Fill current path with base colour, add a hard cel shadow on one side, then ink outline. */
export function cel(g, pathFn, base, shade, lw = 5, { dir = 1, amount = 0.42, hi = null } = {}) {
  pathFn(g); g.fillStyle = base; g.fill();
  g.save(); pathFn(g); g.clip();
  // measure bounds roughly by sampling the path's extents through a big rect & composite trick: use shadow polygon from caller bbox
  const b = g.__bbox; if (b) {
    g.fillStyle = shade; const w = b.w * amount;
    if (dir > 0) g.fillRect(b.x + b.w - w, b.y - 2, w + 4, b.h + 4); else g.fillRect(b.x - 2, b.y - 2, w + 4, b.h + 4);
    if (hi) { g.fillStyle = hi; const hw = b.w * 0.14; if (dir > 0) g.fillRect(b.x + 2, b.y + 2, hw, b.h * 0.5); else g.fillRect(b.x + b.w - hw - 2, b.y + 2, hw, b.h * 0.5); }
  }
  g.restore();
  if (lw > 0) { pathFn(g); g.lineWidth = lw; g.strokeStyle = OUT; g.lineJoin = 'round'; g.stroke(); }
}
export function bbox(g, x, y, w, h) { g.__bbox = { x, y, w, h }; }
/** Thick limb segment with outline and a shade stripe. */
export function limb(g, x0, y0, x1, y1, w, color, shade, lw = 5) {
  g.lineCap = 'round'; g.lineJoin = 'round';
  g.strokeStyle = OUT; g.lineWidth = w + lw * 2; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
  g.strokeStyle = color; g.lineWidth = w; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
  if (shade) { const dx = y1 - y0, dy = -(x1 - x0), l = Math.hypot(dx, dy) || 1, ox = (dx / l) * w * 0.28, oy = (dy / l) * w * 0.28; g.strokeStyle = shade; g.lineWidth = w * 0.36; g.beginPath(); g.moveTo(x0 + ox, y0 + oy); g.lineTo(x1 + ox, y1 + oy); g.stroke(); }
}
export function glow(g, x, y, r, color, a = 0.8) {
  const grd = g.createRadialGradient(x, y, 0, x, y, r);
  grd.addColorStop(0, color.replace('ALPHA', a)); grd.addColorStop(0.5, color.replace('ALPHA', a * 0.35)); grd.addColorStop(1, color.replace('ALPHA', 0));
  g.fillStyle = grd; g.fillRect(x - r, y - r, r * 2, r * 2);
}
export function hash(x, y, seed = 0) { let h = (x * 374761393 + y * 668265263 + seed * 1442695041) | 0; h = (h ^ (h >> 13)) * 1274126177; return ((h ^ (h >> 16)) >>> 0) / 4294967296; }
/** Smooth value noise in [0,1]. */
export function noise2(x, y, seed = 0) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi, seed), b = hash(xi + 1, yi, seed), c = hash(xi, yi + 1, seed), d = hash(xi + 1, yi + 1, seed);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
export function fbm(x, y, seed = 0, oct = 4) { let s = 0, a = 0.5, f = 1, n = 0; for (let i = 0; i < oct; i++) { s += noise2(x * f, y * f, seed + i) * a; n += a; a *= 0.5; f *= 2; } return s / n; }
export function shadeHex(hex, amt) {
  const n = parseInt(hex.slice(1), 16); let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  r = Math.max(0, Math.min(255, Math.round(r * (1 + amt)))); g = Math.max(0, Math.min(255, Math.round(g * (1 + amt)))); b = Math.max(0, Math.min(255, Math.round(b * (1 + amt))));
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}
export function rgba(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; }
/** Build a sprite sheet by calling draw(g, col, row, frameW, frameH) per cell. */
export function sheet(cols, rows, fw, fh, draw) {
  const c = canvas(cols * fw, rows * fh), g = c.getContext('2d');
  for (let r = 0; r < rows; r++) for (let col = 0; col < cols; col++) {
    g.save(); g.translate(col * fw, row(r) * fh); g.beginPath(); g.rect(0, 0, fw, fh); g.clip(); draw(g, col, r, fw, fh); g.restore();
  }
  function row(r) { return r; }
  return c;
}
/** Inked text with thick outline (for logos/stamps). */
export function inkText(g, text, x, y, size, fill, stroke = OUT, lw = 10, font = '900 ') {
  g.font = `${font}${size}px "Bangers","Impact","Arial Black",sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.lineJoin = 'round'; g.lineWidth = lw; g.strokeStyle = stroke; g.strokeText(text, x, y); g.fillStyle = fill; g.fillText(text, x, y);
}
