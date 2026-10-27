// Procedural character sheets: hero (front/back), enemy bot, boss warden
import { OUT, rrect, poly, circle, cel, bbox, limb, glow, sheet, shadeHex } from './draw.js';

const BOT = { armor: '#3f5a3a', armorS: '#273a26', armorH: '#5f7f57', metal: '#aab1b9', metalS: '#6b737c', eye: '#ff2d2d', core: '#eaf8ff', coreGlow: 'rgba(120,220,255,ALPHA)', eyeGlow: 'rgba(255,60,40,ALPHA)' };
const HERO = { skin: '#f0c59b', skinS: '#cf9a6b', hair: '#5b3a1e', hairS: '#3b240f', shirt: '#2aa8b7', shirtS: '#1a7784', shorts: '#c8a56c', shortsS: '#9c7c48', boot: '#6b4a2b', bootS: '#45301a', pack: '#7a5230', packS: '#4f3419', strap: '#4f3419' };

/* ------------------------------------------------------------------ BOT */
export function drawBot(g, cx, baseY, s, p = {}) {
  const { legL = 0, legR = 0, armL = 0, armR = 0, bob = 0, lean = 0, eye = 1, crouch = 0, lift = 0, armsFwd = 0, flash = 0, scale = 1, tint = null } = p;
  const C = tint || BOT;
  g.save(); g.translate(cx, baseY - lift * s); g.scale(s * scale, -s * scale); // y up in design units
  g.rotate(lean);
  const hipY = 46 - crouch * 10;
  const X = (v) => v, Y = (v) => v + bob;
  // legs (back to front)
  for (const [side, ang] of [[-1, legL], [1, legR]]) {
    const hx = side * 9, kx = hx + Math.sin(ang) * 10, ky = hipY * 0.55 - Math.cos(ang) * 2, fx = hx + Math.sin(ang) * 19, fy = Math.max(0, 3 - Math.cos(ang) * 3 + (ang > 0 ? Math.abs(Math.sin(ang)) * 6 : 0));
    limb(g, hx, Y(hipY), kx, Y(ky + crouch * 4), 13, C.armor, C.armorS, 3.2);
    limb(g, kx, Y(ky + crouch * 4), fx, fy + 4, 12, C.armor, C.armorS, 3.2);
    // boot
    g.save(); g.translate(fx, fy); bbox(g, -9, 0, 18, 8); cel(g, (gg) => rrect(gg, -9, 0, 18, 8, 3), C.metal, C.metalS, 3, { dir: side });
    g.restore();
  }
  // waist
  bbox(g, -14, Y(hipY - 2), 28, 10); cel(g, (gg) => rrect(gg, -14, Y(hipY - 2), 28, 10, 3), C.metalS, shadeHex(C.metalS, -0.3), 3);
  // torso
  const sh = 88 - crouch * 6;
  bbox(g, -23, Y(hipY + 2), 46, sh - hipY); cel(g, (gg) => poly(gg, [[-23, Y(sh)], [23, Y(sh)], [14, Y(hipY + 4)], [-14, Y(hipY + 4)]]), C.armor, C.armorS, 3.4, { hi: C.armorH });
  // chest plates
  g.strokeStyle = OUT; g.lineWidth = 2; g.beginPath(); g.moveTo(-16, Y(sh - 6)); g.lineTo(-8, Y(hipY + 14)); g.moveTo(16, Y(sh - 6)); g.lineTo(8, Y(hipY + 14)); g.stroke();
  // core
  glow(g, 0, Y(70), 16, C.coreGlow, 0.7 + flash * 0.3);
  circle(g, 0, Y(70), 8.5); g.fillStyle = C.metalS; g.fill(); g.lineWidth = 2.5; g.strokeStyle = OUT; g.stroke();
  circle(g, 0, Y(70), 5.5); g.fillStyle = C.core; g.fill();
  // arms
  for (const [side, ang] of [[-1, armL], [1, armR]]) {
    const sx = side * 25, sy = Y(sh - 4);
    const fwd = armsFwd; // 0..1 arms thrust forward (toward viewer → drawn lower/longer)
    const ex = sx + side * (10 - fwd * 6) + Math.sin(ang) * 10, ey = sy - 16 + fwd * 6 - Math.cos(ang) * 3;
    const hx = ex + side * (3 - fwd * 10) + Math.sin(ang) * 14, hy = ey - 16 + fwd * 14 - Math.cos(ang) * 2;
    limb(g, sx, sy, ex, ey, 11, C.armor, C.armorS, 3.2); limb(g, ex, ey, hx, hy, 10, C.metal, C.metalS, 3.2);
    circle(g, hx, hy, 6.5); g.fillStyle = C.metalS; g.fill(); g.lineWidth = 3; g.strokeStyle = OUT; g.stroke();
    // shoulder pad
    g.save(); bbox(g, sx - 12, sy - 4, 24, 15); cel(g, (gg) => rrect(gg, sx - 12, sy - 4, 24, 15, 5), C.armor, C.armorS, 3.2, { dir: side, hi: C.armorH }); g.restore();
  }
  // neck
  rrect(g, -6, Y(sh - 2), 12, 10, 2); g.fillStyle = C.metalS; g.fill(); g.lineWidth = 2.5; g.strokeStyle = OUT; g.stroke();
  g.beginPath(); g.moveTo(-6, Y(sh + 2)); g.lineTo(6, Y(sh + 2)); g.moveTo(-6, Y(sh + 5)); g.lineTo(6, Y(sh + 5)); g.lineWidth = 1.5; g.stroke();
  // head (skull faceplate)
  const hy0 = Y(sh + 6);
  bbox(g, -16, hy0, 32, 30); cel(g, (gg) => { gg.beginPath(); gg.moveTo(-16, hy0 + 8); gg.quadraticCurveTo(-16, hy0 + 30, 0, hy0 + 30); gg.quadraticCurveTo(16, hy0 + 30, 16, hy0 + 8); gg.quadraticCurveTo(16, hy0, 6, hy0); gg.lineTo(-6, hy0); gg.quadraticCurveTo(-16, hy0, -16, hy0 + 8); gg.closePath(); }, C.metal, C.metalS, 3.4);
  // brow ridge
  g.strokeStyle = OUT; g.lineWidth = 2.2; g.beginPath(); g.moveTo(-13, hy0 + 20); g.lineTo(-3, hy0 + 17); g.moveTo(13, hy0 + 20); g.lineTo(3, hy0 + 17); g.stroke();
  // eyes (angular red slits)
  glow(g, -7, hy0 + 15, 10, C.eyeGlow, 0.5 * eye); glow(g, 7, hy0 + 15, 10, C.eyeGlow, 0.5 * eye);
  g.fillStyle = C.eye; g.globalAlpha = 0.6 + 0.4 * eye;
  poly(g, [[-12, hy0 + 17], [-3, hy0 + 14.5], [-3, hy0 + 11.5], [-12, hy0 + 13]]); g.fill(); g.lineWidth = 1.5; g.strokeStyle = OUT; g.stroke();
  poly(g, [[12, hy0 + 17], [3, hy0 + 14.5], [3, hy0 + 11.5], [12, hy0 + 13]]); g.fill(); g.stroke();
  g.globalAlpha = 1;
  // mouth grille
  rrect(g, -6, hy0 + 2.5, 12, 6, 1); g.fillStyle = '#2a2f36'; g.fill(); g.lineWidth = 1.8; g.strokeStyle = OUT; g.stroke();
  g.beginPath(); for (let i = -3; i <= 3; i += 3) { g.moveTo(i, hy0 + 3); g.lineTo(i, hy0 + 8); } g.lineWidth = 1.2; g.stroke();
  if (flash > 0) { g.globalCompositeOperation = 'source-atop'; g.fillStyle = `rgba(255,255,255,${flash})`; g.fillRect(-60, -10, 120, 150); g.globalCompositeOperation = 'source-over'; }
  g.restore();
}

export function botSheet(cols = 8, rows = 4, fw = 256, fh = 256, baseline = null) {
  const s = fw / 128; // figure ~124 units tall → ~2px per unit at 256
  return sheet(cols, rows, fw, fh, (g, c, r) => {
    const cx = fw / 2, base = baseline ? Math.round(fh * baseline) : fh - 10;   // feet on the manifest's ground line
    if (r === 0) { // idle 4
      const t = (c / 4) * Math.PI * 2; drawBot(g, cx, base, s, { bob: Math.sin(t) * 1.4, eye: 0.6 + 0.4 * Math.sin(t), armL: Math.sin(t) * 0.05, armR: -Math.sin(t) * 0.05 });
    } else if (r === 1) { // walk 8
      const t = (c / 8) * Math.PI * 2; drawBot(g, cx, base, s, { legL: Math.sin(t) * 0.55, legR: -Math.sin(t) * 0.55, armL: -Math.sin(t) * 0.45, armR: Math.sin(t) * 0.45, bob: Math.abs(Math.cos(t)) * 2.2, lean: 0.04 });
    } else if (r === 2) { // lunge 6
      const k = c / 5;
      if (c < 2) drawBot(g, cx, base, s, { crouch: 0.5 + c * 0.4, lean: -0.08, armL: 0.4, armR: -0.4, eye: 1 });
      else drawBot(g, cx, base, s, { lift: (c - 1) * 9, lean: 0.25 * k, armsFwd: Math.min(1, (c - 1) / 2.5), legL: 0.6, legR: -0.3, eye: 1 });
    } else if (r === 4) { // pound 6: wind up, slam forward, recoil
      const f = [0.2, 0.6, 1, 0.75, 0.4, 0.2][c] ?? 0.2; drawBot(g, cx, base, s, { armsFwd: f, lean: f * 0.14 - 0.03, crouch: f * 0.3, eye: 1 });
    } else { // death 8
      if (c === 0) drawBot(g, cx, base, s, { flash: 0.8, eye: 1 });
      else if (c === 1) drawBot(g, cx + 6, base, s, { lean: 0.1, eye: 1, flash: 0.2 });
      else if (c === 2) drawBot(g, cx - 7, base, s, { lean: -0.12, eye: 1, flash: 0.9 });
      else if (c === 3) { drawBot(g, cx, base, s, { lean: 0.05, eye: 1, flash: 0.4, scale: 1.05 }); glow(g, cx, base - 70, 90, 'rgba(255,200,120,ALPHA)', 0.6); }
      else if (c === 4) { glow(g, cx, base - 70, 120, 'rgba(255,255,255,ALPHA)', 1); glow(g, cx, base - 70, 120, 'rgba(255,170,60,ALPHA)', 0.9); }
      else if (c === 5) { glow(g, cx, base - 70, 110, 'rgba(255,120,30,ALPHA)', 0.8); for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2; circle(g, cx + Math.cos(a) * 55, base - 70 + Math.sin(a) * 55, 9 + (i % 3) * 3); g.fillStyle = i % 2 ? BOT.armor : BOT.metal; g.fill(); g.lineWidth = 3; g.strokeStyle = OUT; g.stroke(); } }
      else if (c === 6) { for (let i = 0; i < 6; i++) { circle(g, cx + Math.cos(i) * 40, base - 60 - i * 8, 26 - i * 2); g.fillStyle = `rgba(60,60,70,${0.55 - i * 0.05})`; g.fill(); } for (let i = 0; i < 5; i++) { const a = i * 1.3; circle(g, cx + Math.cos(a) * 80, base - 70 + Math.sin(a) * 80, 6); g.fillStyle = BOT.metalS; g.fill(); } }
      else { for (let i = 0; i < 5; i++) { circle(g, cx + Math.cos(i * 1.7) * 30, base - 80 - i * 10, 22); g.fillStyle = `rgba(60,60,70,${0.22 - i * 0.03})`; g.fill(); } }
    }
  });
}

/* ------------------------------------------------------------------ HERO */
export function drawHero(g, cx, baseY, s, p = {}) {
  const { back = false, legL = 0, legR = 0, armL = 0, armR = 0, bob = 0, lean = 0, lift = 0, point = 0, arms = 0, hurt = 0, scale = 1 } = p;
  const C = HERO; const Y = (v) => v + bob;
  g.save(); g.translate(cx, baseY - lift * s); g.scale(s * scale, -s * scale); g.rotate(lean);
  // backpack behind body (front view peeks out)
  if (!back) { bbox(g, -14, Y(50), 28, 30); cel(g, (gg) => rrect(gg, -14, Y(50), 28, 30, 6), C.pack, C.packS, 3); }
  // legs
  for (const [side, ang] of [[-1, legL], [1, legR]]) {
    const hx = side * 6, kx = hx + Math.sin(ang) * 8, ky = 22 - Math.cos(ang) * 1, fx = hx + Math.sin(ang) * 16, fy = Math.max(0, 2 - Math.cos(ang) * 2 + (ang > 0 ? Math.abs(Math.sin(ang)) * 7 : 0));
    limb(g, hx, Y(42), kx, Y(ky), 9, C.skin, C.skinS, 3);
    limb(g, kx, Y(ky), fx, fy + 6, 8.5, C.skin, C.skinS, 3);
    g.save(); g.translate(fx, fy); bbox(g, -7, 0, 14, 10); cel(g, (gg) => rrect(gg, -7, 0, 14, 10, 3), C.boot, C.bootS, 3, { dir: side }); g.restore();
  }
  // shorts
  bbox(g, -12, Y(38), 24, 16); cel(g, (gg) => rrect(gg, -12, Y(38), 24, 16, 4), C.shorts, C.shortsS, 3.2);
  // torso
  bbox(g, -12, Y(52), 24, 28); cel(g, (gg) => poly(gg, [[-13, Y(80)], [13, Y(80)], [11, Y(52)], [-11, Y(52)]]), C.shirt, C.shirtS, 3.2);
  if (back) { bbox(g, -11, Y(50), 22, 32); cel(g, (gg) => rrect(gg, -11, Y(50), 22, 32, 6), C.pack, C.packS, 3); rrect(g, -9, Y(70), 18, 10, 3); g.fillStyle = C.packS; g.fill(); g.lineWidth = 2.5; g.strokeStyle = OUT; g.stroke(); }
  else { g.fillStyle = C.strap; g.fillRect(-9, Y(54), 4, 26); g.fillRect(5, Y(54), 4, 26); }
  // arms
  for (const [side, ang] of [[-1, armL], [1, armR]]) {
    const sx = side * 13, sy = Y(77);
    let ex = sx + side * 4 + Math.sin(ang) * 8, ey = sy - 13 - Math.cos(ang) * 1, hx = ex + side * 2 + Math.sin(ang) * 10, hy = ey - 12;
    if (arms > 0) { ex = sx + side * 9; ey = sy + 10 * arms; hx = sx + side * 12; hy = sy + 26 * arms; }
    if (point > 0 && side === 1) { ex = sx + 6; ey = sy + 8 * point; hx = sx + 4; hy = sy + 24 * point; }
    limb(g, sx, sy, ex, ey, 7.5, C.shirt, C.shirtS, 3); limb(g, ex, ey, hx, hy, 6.5, C.skin, C.skinS, 3);
    circle(g, hx, hy, 4.5); g.fillStyle = C.skin; g.fill(); g.lineWidth = 2.6; g.strokeStyle = OUT; g.stroke();
  }
  // head
  const hy0 = Y(93);
  bbox(g, -13, hy0 - 13, 26, 26); cel(g, (gg) => circle(gg, 0, hy0, 13), C.skin, C.skinS, 3.2);
  // hair
  if (back) { bbox(g, -14, hy0 - 6, 28, 22); cel(g, (gg) => poly(gg, [[-14, hy0 - 2], [-12, hy0 + 10], [-6, hy0 + 16], [0, hy0 + 19], [7, hy0 + 15], [13, hy0 + 11], [14, hy0 - 2], [8, hy0 + 2], [0, hy0 - 1], [-8, hy0 + 2]]), C.hair, C.hairS, 3); }
  else {
    bbox(g, -15, hy0 + 2, 30, 18); cel(g, (gg) => poly(gg, [[-15, hy0 + 3], [-13, hy0 + 11], [-8, hy0 + 17], [-2, hy0 + 20], [5, hy0 + 17], [11, hy0 + 18], [15, hy0 + 9], [13, hy0 + 4], [8, hy0 + 8], [2, hy0 + 5], [-5, hy0 + 9], [-10, hy0 + 5]]), C.hair, C.hairS, 3);
    // face
    g.fillStyle = OUT; circle(g, -5, hy0 + 1, 1.8); g.fill(); circle(g, 5, hy0 + 1, 1.8); g.fill();
    g.lineWidth = 1.6; g.strokeStyle = OUT; g.beginPath();
    if (hurt > 0) { g.moveTo(-4, hy0 - 6); g.lineTo(4, hy0 - 6); } else { g.arc(0, hy0 - 4, 4, Math.PI * 1.15, Math.PI * 1.85, true); }
    g.stroke();
    g.beginPath(); g.moveTo(-8, hy0 + 5); g.lineTo(-2, hy0 + 4); g.moveTo(8, hy0 + 5); g.lineTo(2, hy0 + 4); g.stroke();
  }
  if (hurt > 0) { g.globalCompositeOperation = 'source-atop'; g.fillStyle = `rgba(255,40,40,${hurt * 0.45})`; g.fillRect(-60, -10, 120, 150); g.globalCompositeOperation = 'source-over'; }
  g.restore();
}

export function heroSheet(back, cols = 8, rows = back ? 2 : 5, fw = 256, fh = 256) {
  const s = fw / 120;
  return sheet(cols, rows, fw, fh, (g, c, r) => {
    const cx = fw / 2, base = fh - 10;
    if (r === 0) { const t = (c / 6) * Math.PI * 2; drawHero(g, cx, base, s, { back, bob: Math.sin(t) * 1.2, armL: Math.sin(t) * 0.04, armR: -Math.sin(t) * 0.04 }); }
    else if (r === 1 || r === 5) { const t = (c / 8) * Math.PI * 2; drawHero(g, cx, base, s, { back, legL: Math.sin(t) * 0.85, legR: -Math.sin(t) * 0.85, armL: -Math.sin(t) * 0.7, armR: Math.sin(t) * 0.7, bob: Math.abs(Math.cos(t)) * 3, lean: 0.08 }); }   // (row 5: the front run)
    else if (r === 2) { const k = Math.min(1, c / 3); drawHero(g, cx, base, s, { back, point: k, lean: -0.04 * k, bob: c >= 4 ? -1.5 : 0 }); }
    else if (r === 3) { drawHero(g, cx, base, s, { back, lean: -0.22 - c * 0.03, arms: 0.7, hurt: c % 2 === 0 ? 0.9 : 0.3, legL: -0.3, legR: 0.4 }); }
    else { const t = (c / 6) * Math.PI; drawHero(g, cx, base, s, { back, lift: Math.sin(t) * 22, arms: 1, legL: 0.3 * Math.sin(t), legR: -0.3 * Math.sin(t) }); }
  });
}

/* ------------------------------------------------------------------ BOSS */
const BOSS = { ...BOT, armor: '#4a2d5c', armorS: '#2d1a3a', armorH: '#6f4a85', metal: '#c7ccd3', metalS: '#7d858f', core: '#ffe8a0', coreGlow: 'rgba(255,200,80,ALPHA)' };
export function bossSheet(cols = 8, rows = 3, fw = 512, fh = 512) {
  const s = fw / 150;
  return sheet(cols, rows, fw, fh, (g, c, r) => {
    const cx = fw / 2, base = fh - 20;
    const horns = () => { g.save(); g.translate(cx, base); g.scale(s, -s); g.fillStyle = BOSS.metal; g.strokeStyle = OUT; g.lineWidth = 3.5; poly(g, [[-14, 128], [-30, 150], [-10, 134]]); g.fill(); g.stroke(); poly(g, [[14, 128], [30, 150], [10, 134]]); g.fill(); g.stroke(); g.restore(); };
    if (r === 0) { const t = (c / 6) * Math.PI * 2; drawBot(g, cx, base, s, { tint: BOSS, bob: Math.sin(t) * 1.6, eye: 0.7 + 0.3 * Math.sin(t), armL: 0.5 + Math.sin(t) * 0.05, armR: -0.5 - Math.sin(t) * 0.05 }); horns(); }
    else if (r === 1) { drawBot(g, cx + (c % 2 ? 8 : -8), base, s, { tint: BOSS, lean: c % 2 ? 0.08 : -0.08, flash: c % 2 ? 0.1 : 0.7, eye: 1, armL: 0.9, armR: -0.9 }); horns(); }
    else { if (c < 4) { drawBot(g, cx + (c % 2 ? 10 : -10), base, s, { tint: BOSS, lean: (c % 2 ? 1 : -1) * 0.1 * (c + 1), flash: c % 2 ? 0.9 : 0.3, eye: 1 }); horns(); glow(g, cx, base - 150, 80 + c * 40, 'rgba(255,220,120,ALPHA)', 0.3 + c * 0.15); }
      else if (c < 6) { glow(g, cx, base - 150, 260, 'rgba(255,255,255,ALPHA)', 1); glow(g, cx, base - 150, 240, 'rgba(255,170,60,ALPHA)', 0.9); for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2 + c; circle(g, cx + Math.cos(a) * (90 + c * 20), base - 150 + Math.sin(a) * (90 + c * 20), 14 + (i % 3) * 5); g.fillStyle = i % 2 ? BOSS.armor : BOSS.metal; g.fill(); g.lineWidth = 4; g.strokeStyle = OUT; g.stroke(); } }
      else { for (let i = 0; i < 8; i++) { circle(g, cx + Math.cos(i * 1.4) * 70, base - 140 - i * 14, 50 - i * 3); g.fillStyle = `rgba(60,50,70,${(c === 6 ? 0.5 : 0.22) - i * 0.03})`; g.fill(); } } }
  });
}
