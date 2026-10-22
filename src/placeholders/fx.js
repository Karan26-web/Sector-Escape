// Procedural FX sheets and glows
import { OUT, canvas, circle, poly, glow, hash, sheet } from './draw.js';

export function explosionSheet(fw = 256, fh = 256) {
  return sheet(8, 1, fw, fh, (g, c) => {
    const cx = fw / 2, cy = fh / 2, k = c / 7, r = fw * (0.12 + k * 0.42);
    if (c < 5) {
      glow(g, cx, cy, r * 1.4, 'rgba(255,200,90,ALPHA)', 0.9 - k * 0.5);
      // spiky blast
      g.beginPath(); for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2, rr = r * (i % 2 ? 1 : 0.72 + hash(c, i) * 0.2); g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } g.closePath();
      g.fillStyle = c < 2 ? '#ffffff' : '#ff9a2a'; g.fill(); g.lineWidth = 8; g.strokeStyle = OUT; g.stroke();
      circle(g, cx, cy, r * 0.55); g.fillStyle = c < 2 ? '#fff6c8' : '#ffe08a'; g.fill();
      if (c >= 2) { circle(g, cx, cy, r * 0.28); g.fillStyle = '#ffffff'; g.fill(); }
    } else {
      const a = 1 - (c - 4) / 4;
      for (let i = 0; i < 7; i++) { const ang = (i / 7) * Math.PI * 2 + c, rr = r * 0.7, x = cx + Math.cos(ang) * rr, y = cy + Math.sin(ang) * rr; circle(g, x, y, r * 0.45); g.fillStyle = `rgba(70,65,75,${0.6 * a})`; g.fill(); }
      for (let i = 0; i < 10; i++) { const ang = hash(c, i) * Math.PI * 2, rr = r * (1 + hash(c, i + 5) * 0.5); circle(g, cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr, 5 + hash(c, i + 9) * 8); g.fillStyle = `rgba(255,160,60,${a})`; g.fill(); }
    }
  });
}
export function sparkTex(size = 128) { const c = canvas(size, size), g = c.getContext('2d'); glow(g, size / 2, size / 2, size / 2, 'rgba(255,255,255,ALPHA)', 1); circle(g, size / 2, size / 2, size * 0.14); g.fillStyle = '#fff'; g.fill(); return c; }
export function glowTex(size = 256) { const c = canvas(size, size), g = c.getContext('2d'); glow(g, size / 2, size / 2, size / 2, 'rgba(255,255,255,ALPHA)', 1); return c; }
export function smokeTex(size = 256) { const c = canvas(size, size), g = c.getContext('2d'); for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2; glow(g, size / 2 + Math.cos(a) * size * 0.18, size / 2 + Math.sin(a) * size * 0.18, size * 0.3, 'rgba(255,255,255,ALPHA)', 0.5); } return c; }
export function shockwaveTex(size = 512) { const c = canvas(size, size), g = c.getContext('2d'); const grd = g.createRadialGradient(size / 2, size / 2, size * 0.3, size / 2, size / 2, size / 2); grd.addColorStop(0, 'rgba(255,255,255,0)'); grd.addColorStop(0.7, 'rgba(255,255,255,0.9)'); grd.addColorStop(0.85, 'rgba(255,255,255,1)'); grd.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = grd; g.fillRect(0, 0, size, size); return c; }
/** Horizontal gradient used for the laser sector (bright core → soft edge). */