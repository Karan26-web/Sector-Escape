// Procedural environment textures (used when the PNG is missing)
import { OUT, canvas, rrect, poly, circle, glow, fbm, hash, shadeHex, rgba, sheet } from './draw.js';

/** Top-down circular arena floor with stone rings, radial seams and moss. Alpha outside the circle. */
export function arenaFloor(size = 2048) {
  const c = canvas(size, size), g = c.getContext('2d'), R = size / 2 - 4, cx = size / 2, cy = size / 2;
  circle(g, cx, cy, R); g.fillStyle = '#8c8a78'; g.fill();
  // noise mottling
  const img = g.getImageData(0, 0, size, size), d = img.data;
  for (let y = 0; y < size; y += 4) for (let x = 0; x < size; x += 4) {
    const dx = x - cx, dy = y - cy, rr = Math.sqrt(dx * dx + dy * dy); if (rr > R + 4) continue;
    const n = fbm(x / 140, y / 140, 7, 4), m = fbm(x / 60, y / 60, 11, 3);
    const moss = Math.max(0, m - 0.58) * 2.2 * (0.4 + 0.6 * (rr / R));
    const base = 0.78 + (n - 0.5) * 0.5;
    const r = 140 * base * (1 - moss * 0.5), gg = 138 * base * (1 - moss * 0.1), b = 120 * base * (1 - moss * 0.6);
    for (let oy = 0; oy < 4; oy++) for (let ox = 0; ox < 4; ox++) { const i = ((y + oy) * size + x + ox) * 4; d[i] = r; d[i + 1] = gg; d[i + 2] = b; }
  }
  g.putImageData(img, 0, 0);
  // concentric ring seams
  g.strokeStyle = 'rgba(30,25,20,0.55)'; g.lineWidth = 7;
  for (let i = 1; i <= 7; i++) { circle(g, cx, cy, (R * i) / 7); g.stroke(); }
  g.strokeStyle = 'rgba(255,255,230,0.18)'; g.lineWidth = 3;
  for (let i = 1; i <= 7; i++) { circle(g, cx, cy, (R * i) / 7 - 6); g.stroke(); }
  // radial seams
  g.strokeStyle = 'rgba(30,25,20,0.45)'; g.lineWidth = 5;
  for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; g.beginPath(); g.moveTo(cx + Math.cos(a) * R * 0.14, cy + Math.sin(a) * R * 0.14); g.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); g.stroke(); }
  // staggered block seams
  g.strokeStyle = 'rgba(30,25,20,0.3)'; g.lineWidth = 3;
  for (let ring = 1; ring < 7; ring++) { const r0 = (R * ring) / 7, r1 = (R * (ring + 1)) / 7, n = 24 * (ring + 1); for (let i = 0; i < n; i++) { const a = ((i + (ring % 2) * 0.5) / n) * Math.PI * 2; g.beginPath(); g.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); g.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); g.stroke(); } }
  // centre medallion
  circle(g, cx, cy, R * 0.14); g.fillStyle = '#6d6a5c'; g.fill(); g.lineWidth = 8; g.strokeStyle = 'rgba(20,15,10,0.7)'; g.stroke();
  circle(g, cx, cy, R * 0.09); g.strokeStyle = 'rgba(120,230,255,0.35)'; g.lineWidth = 6; g.stroke();
  // cracks
  g.strokeStyle = 'rgba(25,20,15,0.6)'; g.lineWidth = 3; g.lineCap = 'round';
  for (let k = 0; k < 18; k++) { let a = hash(k, 1) * Math.PI * 2, rr = R * (0.3 + hash(k, 2) * 0.6); let x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr; g.beginPath(); g.moveTo(x, y); for (let s = 0; s < 6; s++) { a += (hash(k, s + 5) - 0.5) * 1.6; x += Math.cos(a) * 28; y += Math.sin(a) * 28; g.lineTo(x, y); } g.stroke(); }
  // outer rim
  circle(g, cx, cy, R); g.lineWidth = 14; g.strokeStyle = 'rgba(20,15,10,0.85)'; g.stroke();
  return c;
}

/** Horizontally tileable carved stone wall (1024x512). */
export function arenaWall(w = 1024, h = 512) {
  const c = canvas(w, h), g = c.getContext('2d');
  g.fillStyle = '#7e8a74'; g.fillRect(0, 0, w, h);
  const rows = 6, bh = h / rows;
  for (let r = 0; r < rows; r++) {
    const n = 5, bw = w / n, off = (r % 2) * bw * 0.5;
    for (let i = -1; i <= n; i++) {
      const x = i * bw + off, y = r * bh, shade = 0.85 + hash(i + 7, r) * 0.3;
      g.fillStyle = `rgb(${Math.round(128 * shade)},${Math.round(140 * shade)},${Math.round(118 * shade)})`;
      rrect(g, x + 6, y + 6, bw - 12, bh - 12, 10); g.fill(); g.lineWidth = 6; g.strokeStyle = 'rgba(20,20,15,0.75)'; g.stroke();
      g.fillStyle = 'rgba(255,255,240,0.12)'; g.fillRect(x + 12, y + 10, bw - 24, 10);
      g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(x + 12, y + bh - 22, bw - 24, 10);
    }
  }
  // carved glyph band
  g.fillStyle = 'rgba(30,30,25,0.35)'; g.fillRect(0, bh * 2 - 8, w, 16);
  g.strokeStyle = 'rgba(40,40,30,0.6)'; g.lineWidth = 4;
  for (let i = 0; i < 16; i++) { const x = (i + 0.5) * (w / 16), y = bh * 2; g.beginPath(); g.moveTo(x - 14, y - 14); g.lineTo(x, y + 14); g.lineTo(x + 14, y - 14); g.stroke(); }
  // moss (bottom) & vines (top)
  for (let i = 0; i < 180; i++) { const x = hash(i, 3) * w, y = h - hash(i, 4) * h * 0.4, r = 10 + hash(i, 5) * 36; glow(g, x, y, r, 'rgba(70,120,50,ALPHA)', 0.55); }
  for (let i = 0; i < 12; i++) { const x = hash(i, 9) * w; g.strokeStyle = '#2f5a2a'; g.lineWidth = 7; g.beginPath(); g.moveTo(x, 0); let yy = 0, xx = x; while (yy < h * (0.3 + hash(i, 10) * 0.4)) { yy += 30; xx += (hash(i, yy) - 0.5) * 30; g.lineTo(xx, yy); } g.stroke(); }
  // bottom darkening
  const grd = g.createLinearGradient(0, 0, 0, h); grd.addColorStop(0, 'rgba(0,0,0,0)'); grd.addColorStop(0.7, 'rgba(0,0,0,0.05)'); grd.addColorStop(1, 'rgba(0,0,0,0.45)'); g.fillStyle = grd; g.fillRect(0, 0, w, h);
  return c;
}

export function wallTop(w = 512, h = 128) {
  const c = canvas(w, h), g = c.getContext('2d'); g.fillStyle = '#5c6655'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#66705f' : '#525c4b'; g.fillRect(i * (w / 8), 0, w / 8, h); g.strokeStyle = 'rgba(0,0,0,0.6)'; g.lineWidth = 5; g.strokeRect(i * (w / 8) + 3, 3, w / 8 - 6, h - 6); }
  return c;
}

export function groundJungle(size = 512) {
  const c = canvas(size, size), g = c.getContext('2d'); const img = g.createImageData(size, size), d = img.data;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    // tileable via wrapped coordinates
    const u = x / size, v = y / size;
    const n = (fbm(u * 6, v * 6, 21, 4) + fbm((u + 1) * 6, v * 6, 21, 4) + fbm(u * 6, (v + 1) * 6, 21, 4) + fbm((u + 1) * 6, (v + 1) * 6, 21, 4)) / 4;
    const m = (fbm(u * 18, v * 18, 33, 3) + fbm((u + 1) * 18, (v + 1) * 18, 33, 3)) / 2;
    const i = (y * size + x) * 4, k = 0.6 + n * 0.8, dirt = Math.max(0, m - 0.62) * 2;
    d[i] = (55 + dirt * 60) * k; d[i + 1] = (105 - dirt * 30) * k; d[i + 2] = (45 - dirt * 10) * k; d[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  for (let i = 0; i < 700; i++) { const x = hash(i, 1) * size, y = hash(i, 2) * size; g.strokeStyle = `rgba(${90 + hash(i, 3) * 60},${150 + hash(i, 4) * 60},60,0.7)`; g.lineWidth = 3; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (hash(i, 5) - 0.5) * 14, y - 10 - hash(i, 6) * 14); g.stroke(); }
  return c;
}

export function junglePanorama(w = 4096, h = 1024) {
  const c = canvas(w, h), g = c.getContext('2d');
  const sky = g.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#5aa8d8'); sky.addColorStop(0.45, '#bfe3ee'); sky.addColorStop(0.6, '#e9d9b0'); sky.addColorStop(1, '#6f8a52'); g.fillStyle = sky; g.fillRect(0, 0, w, h);
  // distant temple spires
  g.fillStyle = 'rgba(80,90,80,0.5)';
  for (let i = 0; i < 6; i++) { const x = hash(i, 1) * w, bw = 60 + hash(i, 2) * 80, bh = 120 + hash(i, 3) * 160; poly(g, [[x - bw, h * 0.55], [x - bw * 0.3, h * 0.55 - bh], [x + bw * 0.3, h * 0.55 - bh], [x + bw, h * 0.55]]); g.fill(); }
  // layered tree lines (tileable: wrap x)
  const layers = [['#3f6b45', 0.5, 90], ['#2f5636', 0.56, 130], ['#1f4027', 0.64, 180], ['#152e1c', 0.74, 230]];
  layers.forEach(([col, yb, amp], li) => {
    g.fillStyle = col; g.beginPath(); g.moveTo(0, h);
    for (let x = 0; x <= w; x += 16) { const u = x / w, n = (fbm(u * 14 + li * 7, li, 50 + li, 3) + fbm((u + 1) * 14 + li * 7, li, 50 + li, 3)) / 2; g.lineTo(x, h * yb - n * amp + Math.sin(u * Math.PI * 2 * 9) * 6); }
    g.lineTo(w, h); g.closePath(); g.fill();
    // canopy blobs
    for (let i = 0; i < 70; i++) { const u = hash(i, li + 60); const x = u * w, n = (fbm(u * 14 + li * 7, li, 50 + li, 3) + fbm((u + 1) * 14 + li * 7, li, 50 + li, 3)) / 2, y = h * yb - n * amp; circle(g, x, y, 40 + hash(i, li + 70) * 60); g.fillStyle = col; g.fill(); circle(g, x - 20, y - 20, 25 + hash(i, li + 80) * 30); g.fillStyle = shadeHex(col, 0.25); g.fill(); }
  });
  // mist band
  const mist = g.createLinearGradient(0, h * 0.6, 0, h); mist.addColorStop(0, 'rgba(220,235,220,0)'); mist.addColorStop(0.5, 'rgba(220,235,220,0.35)'); mist.addColorStop(1, 'rgba(200,220,200,0.6)'); g.fillStyle = mist; g.fillRect(0, 0, w, h);
  return c;
}

export function skyDome(w = 1024, h = 512) {
  const c = canvas(w, h), g = c.getContext('2d'); const grd = g.createLinearGradient(0, 0, 0, h); grd.addColorStop(0, '#2b6fb3'); grd.addColorStop(0.5, '#7fc3ea'); grd.addColorStop(1, '#dcefe9'); g.fillStyle = grd; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 30; i++) { const x = hash(i, 1) * w, y = h * (0.3 + hash(i, 2) * 0.5), r = 30 + hash(i, 3) * 70; for (let k = 0; k < 5; k++) { circle(g, x + (hash(i, k + 4) - 0.5) * r * 2, y + (hash(i, k + 9) - 0.5) * r * 0.5, r * (0.5 + hash(i, k + 14) * 0.5)); g.fillStyle = 'rgba(255,255,255,0.55)'; g.fill(); } }
  return c;
}

/* ---------------------------------------------------------------- gates */
export function gateFrame(size = 1024, large = false) {
  const c = canvas(size, size), g = c.getContext('2d'), m = size * 0.1;
  // outer stone block
  rrect(g, m * 0.4, m * 0.5, size - m * 0.8, size - m * 0.5, 30); g.fillStyle = large ? '#8a7f68' : '#7f8a72'; g.fill(); g.lineWidth = 16; g.strokeStyle = OUT; g.stroke();
  // blocks
  g.strokeStyle = 'rgba(20,15,10,0.55)'; g.lineWidth = 8;
  for (let r = 0; r < 6; r++) for (let i = 0; i < 5; i++) { const x = m * 0.4 + i * ((size - m * 0.8) / 5) + (r % 2) * 60, y = m * 0.5 + r * ((size - m * 0.5) / 6); g.strokeRect(x + 8, y + 8, (size - m * 0.8) / 5 - 16, (size - m * 0.5) / 6 - 16); }
  // opening (transparent arch)
  g.globalCompositeOperation = 'destination-out';
  const ow = size * (large ? 0.56 : 0.46), ox = (size - ow) / 2, top = size * (large ? 0.22 : 0.3);
  g.beginPath(); g.moveTo(ox, size); g.lineTo(ox, top + ow / 2); g.arc(size / 2, top + ow / 2, ow / 2, Math.PI, 0); g.lineTo(ox + ow, size); g.closePath(); g.fill();
  g.globalCompositeOperation = 'source-over';
  g.lineWidth = 18; g.strokeStyle = OUT; g.beginPath(); g.moveTo(ox, size); g.lineTo(ox, top + ow / 2); g.arc(size / 2, top + ow / 2, ow / 2, Math.PI, 0); g.lineTo(ox + ow, size); g.stroke();
  // keystone & carvings
  g.fillStyle = '#b9ab86'; poly(g, [[size / 2 - 50, top - 10], [size / 2 + 50, top - 10], [size / 2 + 36, top + 70], [size / 2 - 36, top + 70]]); g.fill(); g.lineWidth = 10; g.strokeStyle = OUT; g.stroke();
  if (large) { glow(g, size / 2, top - 10, 90, 'rgba(255,220,120,ALPHA)', 0.7); circle(g, size / 2, top - 10, 36); g.fillStyle = '#f5c518'; g.fill(); g.stroke(); }
  for (let i = 0; i < 6; i++) { const y = size * 0.42 + i * 70; g.strokeStyle = 'rgba(30,30,20,0.6)'; g.lineWidth = 6; g.beginPath(); g.moveTo(ox - 90, y); g.lineTo(ox - 40, y + 20); g.lineTo(ox - 90, y + 40); g.moveTo(ox + ow + 90, y); g.lineTo(ox + ow + 40, y + 20); g.lineTo(ox + ow + 90, y + 40); g.stroke(); }
  // moss
  for (let i = 0; i < 40; i++) glow(g, hash(i, 1) * size, size - hash(i, 2) * size * 0.35, 20 + hash(i, 3) * 50, 'rgba(70,120,50,ALPHA)', 0.5);
  return c;
}
export function gateDoor(w = 512, h = 1024, large = false) {
  const c = canvas(w, h), g = c.getContext('2d');
  g.fillStyle = large ? '#5a5f6a' : '#6b4a2b'; rrect(g, 4, 4, w - 8, h - 8, 14); g.fill(); g.lineWidth = 12; g.strokeStyle = OUT; g.stroke();
  if (large) { for (let i = 0; i < 5; i++) { g.fillStyle = i % 2 ? '#4e535d' : '#656b77'; g.fillRect(16, 16 + i * (h / 5), w - 32, h / 5 - 24); g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 5; g.strokeRect(16, 16 + i * (h / 5), w - 32, h / 5 - 24); } }
  else { for (let i = 0; i < 4; i++) { const x = 20 + i * ((w - 40) / 4); g.fillStyle = i % 2 ? '#7a5632' : '#5e4025'; g.fillRect(x, 16, (w - 40) / 4 - 6, h - 32); } for (const y of [h * 0.2, h * 0.5, h * 0.8]) { g.fillStyle = '#3b3f45'; g.fillRect(10, y - 20, w - 20, 40); g.strokeStyle = OUT; g.lineWidth = 6; g.strokeRect(10, y - 20, w - 20, 40); for (let k = 0; k < 4; k++) { circle(g, 40 + k * ((w - 80) / 3), y, 8); g.fillStyle = '#8d939c'; g.fill(); g.stroke(); } } }
  return c;
}
export function torchSheet(fw = 128, fh = 256) {
  return sheet(4, 1, fw, fh, (g, c) => {
    const cx = fw / 2, t = (c / 4) * Math.PI * 2;
    // bracket + stick
    g.fillStyle = '#3b3f45'; rrect(g, cx - 10, fh * 0.55, 20, fh * 0.4, 6); g.fill(); g.lineWidth = 5; g.strokeStyle = OUT; g.stroke();
    g.fillStyle = '#6b4a2b'; rrect(g, cx - 7, fh * 0.42, 14, fh * 0.18, 4); g.fill(); g.stroke();
    // flame
    const fl = fh * 0.42, hgt = fh * 0.3 + Math.sin(t) * 10, sway = Math.cos(t) * 8;
    glow(g, cx, fl - hgt * 0.4, 70, 'rgba(255,170,60,ALPHA)', 0.6);
    for (const [col, k] of [['#ff6a1a', 1], ['#ffb02e', 0.68], ['#fff1a8', 0.36]]) { g.beginPath(); g.moveTo(cx - 20 * k, fl); g.quadraticCurveTo(cx - 24 * k + sway * k, fl - hgt * 0.5 * k, cx + sway * k, fl - hgt * k); g.quadraticCurveTo(cx + 24 * k + sway * k, fl - hgt * 0.5 * k, cx + 20 * k, fl); g.closePath(); g.fillStyle = col; g.fill(); if (k === 1) { g.lineWidth = 4; g.strokeStyle = OUT; g.stroke(); } }
  });
}
export function treeSheet(fw = 512, fh = 1024) {
  return sheet(4, 1, fw, fh, (g, c) => {
    const cx = fw / 2, trunkH = fh * (0.45 + hash(c, 1) * 0.15), tw = 40 + hash(c, 2) * 30;
    g.fillStyle = '#5a3d22'; poly(g, [[cx - tw, fh], [cx - tw * 0.6, fh - trunkH], [cx + tw * 0.6, fh - trunkH], [cx + tw, fh]]); g.fill(); g.lineWidth = 10; g.strokeStyle = OUT; g.stroke();
    g.fillStyle = '#3d2814'; g.fillRect(cx - tw * 0.2, fh - trunkH, tw * 0.5, trunkH);
    const cols = ['#1f5a2d', '#2b7a3a', '#3f9a4a'];
    for (let i = 0; i < 14; i++) { const a = hash(c, i + 10) * Math.PI * 2, r = (fw * 0.12 + hash(c, i + 30) * fw * 0.26), x = cx + Math.cos(a) * r * 0.9, y = fh - trunkH - fh * 0.12 + Math.sin(a) * r * 0.5, rr = fw * 0.12 + hash(c, i + 50) * fw * 0.1; circle(g, x, y, rr); g.fillStyle = cols[i % 3]; g.fill(); g.lineWidth = 8; g.strokeStyle = OUT; g.stroke(); }
    for (let i = 0; i < 10; i++) { const a = hash(c, i + 70) * Math.PI * 2, r = fw * 0.2, x = cx + Math.cos(a) * r, y = fh - trunkH - fh * 0.14 + Math.sin(a) * r * 0.5, rr = fw * 0.1; circle(g, x, y, rr); g.fillStyle = cols[(i + 1) % 3]; g.fill(); }
    // hanging vines
    g.strokeStyle = '#2f6a2f'; g.lineWidth = 8; for (let i = 0; i < 4; i++) { const x = cx + (hash(c, i + 90) - 0.5) * fw * 0.6; g.beginPath(); g.moveTo(x, fh - trunkH); g.lineTo(x + 10, fh - trunkH + 120 + hash(c, i) * 120); g.stroke(); }
  });
}
export function plantSheet(fw = 512, fh = 512) {
  return sheet(4, 1, fw, fh, (g, c) => {
    const cx = fw / 2, base = fh - 20, n = 7 + c;
    for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + ((i / (n - 1)) - 0.5) * 2.2, len = fh * (0.45 + hash(c, i) * 0.35), col = ['#2f7f3a', '#3f9f4a', '#56b85e'][i % 3]; const x1 = cx + Math.cos(a) * len, y1 = base + Math.sin(a) * len; g.strokeStyle = OUT; g.lineWidth = 34; g.lineCap = 'round'; g.beginPath(); g.moveTo(cx, base); g.quadraticCurveTo(cx + Math.cos(a) * len * 0.5, base + Math.sin(a) * len * 0.5 - 30, x1, y1); g.stroke(); g.strokeStyle = col; g.lineWidth = 24; g.stroke(); g.strokeStyle = shadeHex(col, 0.25); g.lineWidth = 6; g.stroke(); }
  });
}
export function rockSheet(fw = 512, fh = 512) {
  return sheet(4, 1, fw, fh, (g, c) => {
    const cx = fw / 2, base = fh - 30, n = 7 + c;
    const pts = []; for (let i = 0; i < n; i++) { const a = -Math.PI + (i / n) * Math.PI, r = fw * (0.3 + hash(c, i) * 0.14); pts.push([cx + Math.cos(a) * r, base + Math.sin(a) * r * (0.55 + c * 0.08)]); }
    poly(g, pts); g.fillStyle = c % 2 ? '#6f7a7a' : '#7d8780'; g.fill(); g.lineWidth = 12; g.strokeStyle = OUT; g.stroke();
    g.save(); poly(g, pts); g.clip(); g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(cx + fw * 0.1, 0, fw, fh); g.fillStyle = 'rgba(255,255,255,0.14)'; g.fillRect(0, 0, cx - fw * 0.15, base - fh * 0.3); g.restore();
    g.strokeStyle = 'rgba(25,20,15,0.55)'; g.lineWidth = 6; for (let k = 0; k < 4; k++) { g.beginPath(); let x = cx + (hash(c, k + 20) - 0.5) * fw * 0.4, y = base - hash(c, k + 30) * fh * 0.3; g.moveTo(x, y); for (let s = 0; s < 3; s++) { x += (hash(c, k * 7 + s) - 0.5) * 60; y += 30 + hash(c, k * 9 + s) * 30; g.lineTo(x, y); } g.stroke(); }
    for (let i = 0; i < 8; i++) glow(g, cx + (hash(c, i + 40) - 0.5) * fw * 0.5, base - hash(c, i + 50) * fh * 0.2, 20 + hash(c, i + 60) * 40, 'rgba(70,120,50,ALPHA)', 0.55);
  });
}
/** Tileable cartoon jungle water. */
export function waterTex(size = 512) {
  const c = canvas(size, size), g = c.getContext('2d'); const img = g.createImageData(size, size), d = img.data;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = x / size, v = y / size;
    const n = (fbm(u * 6, v * 6, 91, 3) + fbm((u + 1) * 6, v * 6, 91, 3) + fbm(u * 6, (v + 1) * 6, 91, 3) + fbm((u + 1) * 6, (v + 1) * 6, 91, 3)) / 4;
    const k = (fbm(u * 14, v * 14, 93, 2) + fbm((u + 1) * 14, (v + 1) * 14, 93, 2)) / 2;
    const caustic = Math.pow(Math.max(0, 1 - Math.abs(k - 0.5) * 6), 2);
    const i = (y * size + x) * 4;
    d[i] = 30 + n * 40 + caustic * 120; d[i + 1] = 120 + n * 50 + caustic * 100; d[i + 2] = 130 + n * 40 + caustic * 80; d[i + 3] = 255;
  }
  g.putImageData(img, 0, 0); return c;
}
/** Top-down worn stone causeway, tiles vertically (path runs top→bottom). */
export function causewayStone(w = 512, h = 1024) {
  const c = canvas(w, h), g = c.getContext('2d'); g.fillStyle = '#4a4238'; g.fillRect(0, 0, w, h);
  const rows = 8, rh = h / rows;
  for (let r = 0; r < rows; r++) { const cols = 3 + (r % 2), cw = w / cols; for (let i = 0; i < cols; i++) { const x = i * cw + (r % 2 ? cw * 0.5 : 0); for (const xx of [x, x - w]) { const k = 0.85 + hash(i, r) * 0.3; g.fillStyle = `rgb(${Math.round(150 * k)},${Math.round(142 * k)},${Math.round(118 * k)})`; rrect(g, xx + 7, r * rh + 7, cw - 14, rh - 14, 18); g.fill(); g.lineWidth = 6; g.strokeStyle = 'rgba(25,20,15,0.7)'; g.stroke(); g.fillStyle = 'rgba(255,255,230,0.14)'; g.fillRect(xx + 14, r * rh + 12, cw - 28, 10); } } }
  for (let i = 0; i < 70; i++) glow(g, hash(i, 1) * w, hash(i, 2) * h, 10 + hash(i, 3) * 30, 'rgba(70,120,50,ALPHA)', 0.45);
  for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(0,0,0,${hash(i, 9) * 0.12})`; g.fillRect(hash(i, 5) * w, hash(i, 6) * h, 3, 3); }
  return c;
}
/** Low stone parapet along the causeway, tiles horizontally. */
export function causewaySide(w = 1024, h = 256) {
  const c = canvas(w, h), g = c.getContext('2d'); g.fillStyle = '#6f7a6a'; g.fillRect(0, 0, w, h);
  const rows = 2, rh = h / rows; for (let r = 0; r < rows; r++) { const n = 6, bw = w / n; for (let i = -1; i <= n; i++) { const x = i * bw + (r % 2) * bw * 0.5, k = 0.85 + hash(i + 3, r) * 0.3; g.fillStyle = `rgb(${Math.round(125 * k)},${Math.round(136 * k)},${Math.round(115 * k)})`; rrect(g, x + 6, r * rh + 6, bw - 12, rh - 12, 10); g.fill(); g.lineWidth = 6; g.strokeStyle = 'rgba(20,20,15,0.75)'; g.stroke(); } }
  g.fillStyle = 'rgba(255,255,240,0.12)'; g.fillRect(0, 0, w, 14);
  for (let i = 0; i < 60; i++) glow(g, hash(i, 1) * w, h - hash(i, 2) * h * 0.5, 10 + hash(i, 3) * 30, 'rgba(70,120,50,ALPHA)', 0.5);
  return c;
}
/** Round stone hatch covering the buried gun (two halves split on the vertical seam). */
export function sealSlab(w = 1024, h = 1024) {
  const c = canvas(w, h), g = c.getContext('2d'); g.fillStyle = '#5c655a'; g.fillRect(0, 0, w, h);
  for (let r = 0; r < 5; r++) for (let i = 0; i < 4; i++) { const x = i * (w / 4) + (r % 2) * (w / 8), y = r * (h / 5), k = 0.85 + hash(i, r + 7) * 0.3; g.fillStyle = `rgb(${Math.round(110 * k)},${Math.round(120 * k)},${Math.round(105 * k)})`; rrect(g, x + 8, y + 8, w / 4 - 16, h / 5 - 16, 14); g.fill(); g.lineWidth = 8; g.strokeStyle = 'rgba(20,20,15,0.75)'; g.stroke(); }
  glow(g, w / 2, h / 2, 260, 'rgba(255,80,60,ALPHA)', 0.5);
  g.strokeStyle = '#ff5a4a'; g.lineWidth = 14; circle(g, w / 2, h / 2, 190); g.stroke(); circle(g, w / 2, h / 2, 130); g.lineWidth = 8; g.stroke();
  g.beginPath(); g.moveTo(w / 2, h / 2); g.arc(w / 2, h / 2, 110, -Math.PI / 2 - 0.9, -Math.PI / 2 + 0.9); g.closePath(); g.fillStyle = 'rgba(255,120,100,0.8)'; g.fill();
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; g.beginPath(); g.moveTo(w / 2 + Math.cos(a) * 190, h / 2 + Math.sin(a) * 190); g.lineTo(w / 2 + Math.cos(a) * 250, h / 2 + Math.sin(a) * 250); g.lineWidth = 10; g.stroke(); }
  g.lineWidth = 18; g.strokeStyle = OUT; g.strokeRect(9, 9, w - 18, h - 18);
  return c;
}
/** Stone column standing where two arena walls meet. */
export function wallPillar(w = 256, h = 1024) {
  const c = canvas(w, h), g = c.getContext('2d'), cx = w / 2;
  g.fillStyle = '#7a8575'; rrect(g, cx - 70, 60, 140, h - 120, 20); g.fill(); g.lineWidth = 10; g.strokeStyle = OUT; g.stroke();
  g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(cx + 20, 70, 50, h - 140); g.fillStyle = 'rgba(255,255,240,0.14)'; g.fillRect(cx - 60, 70, 22, h - 140);
  for (const y of [40, h - 90]) { g.fillStyle = '#8a9684'; rrect(g, cx - 100, y, 200, 60, 12); g.fill(); g.stroke(); }
  g.strokeStyle = 'rgba(30,30,25,0.6)'; g.lineWidth = 5; for (let i = 0; i < 7; i++) { const y = 160 + i * 110; g.beginPath(); g.moveTo(cx - 40, y); g.lineTo(cx, y + 24); g.lineTo(cx + 40, y); g.stroke(); }
  glow(g, cx, h * 0.3, 40, 'rgba(120,230,255,ALPHA)', 0.5); circle(g, cx, h * 0.3, 14); g.fillStyle = '#7fe6ff'; g.fill(); g.lineWidth = 5; g.strokeStyle = OUT; g.stroke();
  for (let i = 0; i < 12; i++) glow(g, cx + (hash(i, 1) - 0.5) * 140, h - hash(i, 2) * 300, 16 + hash(i, 3) * 30, 'rgba(70,120,50,ALPHA)', 0.5);
  return c;
}
