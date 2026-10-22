// Procedural UI imagery (logo, parchment, map, icons ...)
import { OUT, canvas, rrect, circle, poly, glow, hash, fbm, inkText, sheet } from './draw.js';

export function logo(w = 1600, h = 900) {
  const c = canvas(w, h), g = c.getContext('2d'), cx = w / 2;
  // emblem ring
  glow(g, cx, h * 0.42, 420, 'rgba(90,220,255,ALPHA)', 0.35);
  circle(g, cx, h * 0.42, 330); g.lineWidth = 26; g.strokeStyle = '#2b6b74'; g.stroke(); g.lineWidth = 12; g.strokeStyle = '#7fe6ff'; g.stroke();
  // sector wedge behind the title
  g.beginPath(); g.moveTo(cx, h * 0.42); g.arc(cx, h * 0.42, 330, -Math.PI * 0.78, -Math.PI * 0.22); g.closePath(); g.fillStyle = 'rgba(120,230,255,0.35)'; g.fill(); g.lineWidth = 10; g.strokeStyle = '#7fe6ff'; g.stroke();
  inkText(g, 'SECTOR', cx, h * 0.33, 230, '#f5c518', OUT, 28);
  g.save(); g.translate(0, 6); inkText(g, 'SECTOR', cx, h * 0.33, 230, 'rgba(0,0,0,0)', 'rgba(0,0,0,0.0)', 0); g.restore();
  inkText(g, 'ESCAPE', cx, h * 0.55, 230, '#ff8a2a', OUT, 28);
  // ribbon
  rrect(g, cx - 420, h * 0.68, 840, 110, 20); g.fillStyle = '#1c3b30'; g.fill(); g.lineWidth = 12; g.strokeStyle = OUT; g.stroke();
  inkText(g, 'THE LOST JUNGLE', cx, h * 0.68 + 58, 86, '#eafff4', OUT, 10, '700 ');
  // leaves
  g.fillStyle = '#2f8a3a'; g.strokeStyle = OUT; g.lineWidth = 8;
  for (const [x, y, a] of [[cx - 560, h * 0.3, -0.6], [cx + 560, h * 0.3, 0.6], [cx - 520, h * 0.78, 0.5], [cx + 520, h * 0.78, -0.5]]) { g.save(); g.translate(x, y); g.rotate(a); g.beginPath(); g.ellipse(0, 0, 150, 60, 0, 0, Math.PI * 2); g.fill(); g.stroke(); g.beginPath(); g.moveTo(-140, 0); g.lineTo(140, 0); g.stroke(); g.restore(); }
  return c;
}
export function parchment(w = 1024, h = 768) {
  const c = canvas(w, h), g = c.getContext('2d');
  g.fillStyle = '#e8d6ad'; g.beginPath(); g.moveTo(20, 30);
  for (let x = 20; x <= w - 20; x += 40) g.lineTo(x, 20 + (hash(x, 1) - 0.5) * 26);
  for (let y = 30; y <= h - 20; y += 40) g.lineTo(w - 20 + (hash(y, 2) - 0.5) * 26, y);
  for (let x = w - 20; x >= 20; x -= 40) g.lineTo(x, h - 20 + (hash(x, 3) - 0.5) * 26);
  for (let y = h - 20; y >= 30; y -= 40) g.lineTo(20 + (hash(y, 4) - 0.5) * 26, y);
  g.closePath(); g.fill(); g.lineWidth = 10; g.strokeStyle = '#5a3e1e'; g.stroke();
  for (let i = 0; i < 2500; i++) { const x = hash(i, 5) * w, y = hash(i, 6) * h; g.fillStyle = `rgba(120,80,30,${hash(i, 7) * 0.12})`; g.fillRect(x, y, 3, 3); }
  const grd = g.createRadialGradient(w / 2, h / 2, h * 0.2, w / 2, h / 2, w * 0.7); grd.addColorStop(0, 'rgba(0,0,0,0)'); grd.addColorStop(1, 'rgba(90,60,20,0.35)'); g.fillStyle = grd; g.fillRect(0, 0, w, h);
  return c;
}
export function storyArt(w = 800, h = 600) {
  const c = canvas(w, h), g = c.getContext('2d');
  const sky = g.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#f6c76b'); sky.addColorStop(0.6, '#a9d6c3'); sky.addColorStop(1, '#2e5a34'); g.fillStyle = sky; g.fillRect(0, 0, w, h);
  g.fillStyle = '#6e7a66'; poly(g, [[w * 0.25, h * 0.75], [w * 0.35, h * 0.3], [w * 0.65, h * 0.3], [w * 0.75, h * 0.75]]); g.fill(); g.lineWidth = 10; g.strokeStyle = OUT; g.stroke();
  poly(g, [[w * 0.4, h * 0.3], [w * 0.5, h * 0.12], [w * 0.6, h * 0.3]]); g.fillStyle = '#8a9681'; g.fill(); g.stroke();
  g.fillStyle = '#1b1510'; rrect(g, w * 0.45, h * 0.5, w * 0.1, h * 0.25, 20); g.fill(); g.stroke();
  for (let i = 0; i < 30; i++) { circle(g, hash(i, 1) * w, h * 0.65 + hash(i, 2) * h * 0.35, 30 + hash(i, 3) * 60); g.fillStyle = ['#1f5a2d', '#2b7a3a', '#3f9a4a'][i % 3]; g.fill(); g.lineWidth = 6; g.strokeStyle = OUT; g.stroke(); }
  g.lineWidth = 30; g.strokeStyle = '#fff'; g.strokeRect(15, 15, w - 30, h - 30);
  return c;
}
export function mapTemple(size = 512) { const c = canvas(size, size), g = c.getContext('2d'), cx = size / 2; glow(g, cx, size * 0.5, 240, 'rgba(255,220,120,ALPHA)', 0.6); g.fillStyle = '#8a9681'; g.strokeStyle = OUT; g.lineWidth = 12; poly(g, [[60, size - 60], [120, size * 0.45], [size - 120, size * 0.45], [size - 60, size - 60]]); g.fill(); g.stroke(); poly(g, [[150, size * 0.45], [cx, 60], [size - 150, size * 0.45]]); g.fillStyle = '#a8b49e'; g.fill(); g.stroke(); g.fillStyle = '#1b1510'; rrect(g, cx - 40, size * 0.62, 80, size * 0.3, 20); g.fill(); g.stroke(); circle(g, cx, size * 0.3, 30); g.fillStyle = '#f5c518'; g.fill(); g.stroke(); return c; }
export function shieldSheet(fw = 128, fh = 128) {
  return sheet(2, 1, fw, fh, (g, c) => { const cx = fw / 2; const path = () => { g.beginPath(); g.moveTo(cx, 12); g.lineTo(fw - 16, 30); g.quadraticCurveTo(fw - 16, 90, cx, fh - 10); g.quadraticCurveTo(16, 90, 16, 30); g.closePath(); }; if (c === 0) glow(g, cx, fh / 2, 70, 'rgba(90,200,255,ALPHA)', 0.6); path(); g.fillStyle = c === 0 ? '#3aa0ff' : '#3a3f47'; g.fill(); g.lineWidth = 8; g.strokeStyle = OUT; g.stroke(); if (c === 0) { g.fillStyle = 'rgba(255,255,255,0.45)'; g.beginPath(); g.moveTo(cx - 4, 22); g.lineTo(fw - 26, 36); g.quadraticCurveTo(fw - 28, 70, cx - 4, 60); g.closePath(); g.fill(); } else { g.strokeStyle = '#8a9099'; g.lineWidth = 6; g.beginPath(); g.moveTo(cx - 18, 40); g.lineTo(cx + 14, 88); g.stroke(); } });
}
export function iconSheet(fw = 128, fh = 128) {
  return sheet(8, 1, fw, fh, (g, c) => {
    const cx = fw / 2, cy = fh / 2; g.lineWidth = 9; g.strokeStyle = '#eafff4'; g.lineCap = 'round'; g.lineJoin = 'round'; g.fillStyle = '#eafff4';
    const stroke = (fn) => { g.save(); g.strokeStyle = OUT; g.lineWidth = 18; fn(); g.stroke(); g.restore(); fn(); g.stroke(); };
    switch (c) {
      case 0: stroke(() => { circle(g, cx, cy + 6, 40); }); stroke(() => { g.beginPath(); g.moveTo(cx, cy + 6); g.lineTo(cx, cy - 20); g.moveTo(cx, cy + 6); g.lineTo(cx + 18, cy + 14); g.moveTo(cx - 14, cy - 40); g.lineTo(cx + 14, cy - 40); }); break; // timer
      case 1: stroke(() => { g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i / 10) * Math.PI * 2, r = i % 2 ? 20 : 46; g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } g.closePath(); }); g.fillStyle = '#f5c518'; g.fill(); break; // star
      case 2: stroke(() => { g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i / 10) * Math.PI * 2, r = i % 2 ? 20 : 46; g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } g.closePath(); }); g.fillStyle = '#3a3f47'; g.fill(); break; // star empty
      case 3: stroke(() => { circle(g, cx, cy - 10, 32); }); stroke(() => { g.beginPath(); g.moveTo(cx - 14, cy + 30); g.lineTo(cx + 14, cy + 30); g.moveTo(cx - 10, cy + 44); g.lineTo(cx + 10, cy + 44); }); g.fillStyle = '#f5c518'; circle(g, cx, cy - 10, 22); g.fill(); break; // hint bulb
      case 4: stroke(() => { g.beginPath(); g.moveTo(cx - 40, cy - 14); g.lineTo(cx - 18, cy - 14); g.lineTo(cx + 4, cy - 34); g.lineTo(cx + 4, cy + 34); g.lineTo(cx - 18, cy + 14); g.lineTo(cx - 40, cy + 14); g.closePath(); }); stroke(() => { g.beginPath(); g.arc(cx + 18, cy, 18, -1, 1); g.moveTo(cx + 34, cy - 30); g.arc(cx + 18, cy, 34, -1, 1); }); break; // sound on
      case 5: stroke(() => { g.beginPath(); g.moveTo(cx - 40, cy - 14); g.lineTo(cx - 18, cy - 14); g.lineTo(cx + 4, cy - 34); g.lineTo(cx + 4, cy + 34); g.lineTo(cx - 18, cy + 14); g.lineTo(cx - 40, cy + 14); g.closePath(); }); stroke(() => { g.beginPath(); g.moveTo(cx + 16, cy - 16); g.lineTo(cx + 44, cy + 16); g.moveTo(cx + 44, cy - 16); g.lineTo(cx + 16, cy + 16); }); break; // sound off
      case 6: stroke(() => { g.beginPath(); g.rect(cx - 30, cy - 34, 18, 68); g.rect(cx + 12, cy - 34, 18, 68); }); g.fill(); break; // pause
      case 7: stroke(() => { g.beginPath(); g.moveTo(cx - 30, cy - 30); g.lineTo(cx + 36, cy); g.lineTo(cx - 30, cy + 30); g.closePath(); }); g.fill(); break; // play
    }
  });
}
