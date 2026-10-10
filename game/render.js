// 눈보라 벌목장 — 그리기. 모든 좌표는 월드 단위이고, main.js가 카메라 변환을 걸어 준다.
'use strict';

const PAL = {
  snow: '#e9f1f8', snow2: '#dde8f2', snowShade: '#cfdcea', path: '#d3dfeb', wildSnow: '#d9e0e8',
  shadow: 'rgba(40,70,110,0.16)',
  wood: '#8b5a2b', woodLight: '#b67a44', woodDark: '#6a4119', grain: '#d9a86c',
  stone: '#9aa5b1', stoneDark: '#6f7b88', stoneLight: '#c3ccd6',
  treeL: '#3ec46a', treeR: '#2a9a52', treeTop: '#f4f9fc',
  water: '#4f8fd6', water2: '#6aa6e8', ice: '#eaf4fc',
  ink: '#1f2d3d',
};

const circle = (ctx, x, y, r) => { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); };
const ellipse = (ctx, x, y, rx, ry) => { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); };
function tri(ctx, ax, ay, bx, by, cx, cy) { ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.lineTo(cx, cy); ctx.closePath(); ctx.fill(); }
function rrect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill(); }
function shadow(ctx, x, y, rx, ry) { ctx.fillStyle = PAL.shadow; ellipse(ctx, x, y, rx, ry); }
function bar(ctx, x, y, w, h, k, color) {
  ctx.fillStyle = 'rgba(20,30,45,0.55)'; rrect(ctx, x - 1, y - 1, w + 2, h + 2, 3);
  ctx.fillStyle = color; rrect(ctx, x, y, Math.max(0, w * Math.max(0, Math.min(1, k))), h, 2);
}
// ---- 글자 캐시: 글자(특히 이모지) 그리기는 비싸서, 같은 글자는 한 번 그려 둔 이미지를 찍는다 ----
const TEXT_CACHE = { map: new Map(), max: 700, res: 2, on: typeof document !== 'undefined' };
function cachedText(ctx, key, w, h, render) {
  let c = TEXT_CACHE.map.get(key);
  if (!c) {
    if (TEXT_CACHE.map.size >= TEXT_CACHE.max) TEXT_CACHE.map.clear();
    const R = TEXT_CACHE.res, cv = document.createElement('canvas'); cv.width = Math.max(1, Math.ceil(w * R)); cv.height = Math.max(1, Math.ceil(h * R));
    const cc = cv.getContext('2d'); cc.scale(R, R); render(cc, w, h);
    c = { cv, w, h }; TEXT_CACHE.map.set(key, c);
  }
  return c;
}
function textWidth(ctx, text, font) { const k = font + '|' + text; let w = TEXT_W.get(k); if (w == null) { ctx.font = font; w = ctx.measureText(text).width; if (TEXT_W.size > 3000) TEXT_W.clear(); TEXT_W.set(k, w); } return w; }
const TEXT_W = new Map();
function pill(ctx, x, y, text, bg, fg, font) {
  font = font || 'bold 12px system-ui, sans-serif';
  const w = textWidth(ctx, text, font) + 14;
  if (!TEXT_CACHE.on) { ctx.font = font; ctx.fillStyle = bg; rrect(ctx, x - w / 2, y - 9, w, 18, 9); ctx.fillStyle = fg || '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, x, y + 1); return; }
  const c = cachedText(ctx, `p|${font}|${bg}|${fg || ''}|${text}`, w + 2, 22, (cc, W, H) => { cc.font = font; cc.fillStyle = bg; rrect(cc, 1, 2, w, 18, 9); cc.fillStyle = fg || '#fff'; cc.textAlign = 'center'; cc.textBaseline = 'middle'; cc.fillText(text, W / 2, 12); });
  ctx.drawImage(c.cv, x - c.w / 2, y - 11, c.w, c.h);
}
function label(ctx, x, y, text, size, color, stroke) {
  const font = `bold ${size}px system-ui, sans-serif`;
  if (!TEXT_CACHE.on) { ctx.font = font; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineWidth = 3; ctx.strokeStyle = stroke || 'rgba(20,30,45,0.75)'; ctx.lineJoin = 'round'; ctx.strokeText(text, x, y); ctx.fillStyle = color || '#fff'; ctx.fillText(text, x, y); return; }
  const w = textWidth(ctx, text, font) + 8, h = size * 1.5 + 6;
  const c = cachedText(ctx, `l|${size}|${color || ''}|${stroke || ''}|${text}`, w, h, (cc, W, H) => { cc.font = font; cc.textAlign = 'center'; cc.textBaseline = 'middle'; cc.lineWidth = 3; cc.strokeStyle = stroke || 'rgba(20,30,45,0.75)'; cc.lineJoin = 'round'; cc.strokeText(text, W / 2, H / 2); cc.fillStyle = color || '#fff'; cc.fillText(text, W / 2, H / 2); });
  ctx.drawImage(c.cv, x - c.w / 2, y - c.h / 2, c.w, c.h);
}
function emoji(ctx, x, y, text, size) {
  const font = `${size}px system-ui, sans-serif`;
  if (!TEXT_CACHE.on) { ctx.font = font; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#000'; ctx.fillText(text, x, y); return; }
  const w = textWidth(ctx, text, font) + 6, h = size * 1.4 + 4;
  const c = cachedText(ctx, `e|${size}|${text}`, w, h, (cc, W, H) => { cc.font = font; cc.textAlign = 'center'; cc.textBaseline = 'middle'; cc.fillStyle = '#000'; cc.fillText(text, W / 2, H / 2); });
  ctx.drawImage(c.cv, x - c.w / 2, y - c.h / 2, c.w, c.h);
}
function log(ctx, x, y, w, h) {
  ctx.fillStyle = PAL.wood; rrect(ctx, x - w / 2, y - h / 2, w, h, h / 2);
  ctx.fillStyle = PAL.woodLight; rrect(ctx, x - w / 2 + 2, y - h / 2 + 1, w - 6, h / 3, 2);
  ctx.fillStyle = PAL.grain; circle(ctx, x + w / 2 - h / 2, y, h / 2 - 0.5);
  ctx.fillStyle = PAL.woodDark; circle(ctx, x + w / 2 - h / 2, y, h / 5);
}
function meatChunk(ctx, x, y, s) {
  ctx.fillStyle = '#d64545'; rrect(ctx, x - 9 * s, y - 6 * s, 18 * s, 12 * s, 5 * s);
  ctx.fillStyle = '#f08080'; rrect(ctx, x - 6 * s, y - 4 * s, 9 * s, 4 * s, 2 * s);
  ctx.fillStyle = '#f5f0e6'; rrect(ctx, x + 6 * s, y - 2 * s, 8 * s, 4 * s, 2 * s); circle(ctx, x + 14 * s, y - 3 * s, 2.5 * s); circle(ctx, x + 14 * s, y + 3 * s, 2.5 * s);
}
function fishShape(ctx, x, y, s, color) {
  ctx.fillStyle = color || '#5aa9e6'; ellipse(ctx, x, y, 11 * s, 5.5 * s); tri(ctx, x - 9 * s, y, x - 16 * s, y - 6 * s, x - 16 * s, y + 6 * s);
  ctx.fillStyle = '#d9ecfa'; ellipse(ctx, x + 1 * s, y + 1 * s, 6 * s, 2.5 * s);
  ctx.fillStyle = '#222'; circle(ctx, x + 6 * s, y - 1.5 * s, 1.3 * s);
}
function popScale(g, key) { const p = g.pops[key] || 0; return 1 + Math.sin(p * Math.PI) * 0.08; }
function fmtMoney(n) {
  n = Math.floor(n);
  if (n >= 1e18) return (n / 1e18).toFixed(n >= 1e19 ? 0 : 1) + 'Qi';
  if (n >= 1e15) return (n / 1e15).toFixed(n >= 1e16 ? 0 : 1) + 'Qa';
  if (n >= 1e12) return (n / 1e12).toFixed(n >= 1e13 ? 0 : 1) + 'T';
  if (n >= 1e9) return (n / 1e9).toFixed(n >= 1e10 ? 0 : 1) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + 'M';
  if (n >= 1e4) return (n / 1e3).toFixed(n >= 1e5 ? 0 : 1) + 'K';
  return n.toLocaleString('en-US');
}

// 눈 바닥의 점, 장식(바위·고목)은 매번 같은 자리에 찍히도록 미리 만들어 둔다
const GROUND = (() => {
  let seed = 7; const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const dots = []; for (let i = 0; i < 520; i++) dots.push({ x: r() * (CFG.world.w + CFG.east.w), y: 160 + r() * (CFG.world.h - 160), s: 2 + r() * 5, a: 0.25 + r() * 0.35 });
  const flakes = []; for (let i = 0; i < 70; i++) flakes.push({ x: r(), y: r(), s: 1 + r() * 2.2, v: 18 + r() * 30, w: r() * 6.28 });
  const floes = []; for (let i = 0; i < 14; i++) floes.push({ x: r() * (CFG.world.w + CFG.east.w), y: CFG.river.y + 20 + r() * (CFG.river.h - 40), w: 24 + r() * 40, h: 12 + r() * 10, v: 8 + r() * 10 });
  const H = CFG.hunt.rect, rocks = []; for (let i = 0; i < 7; i++) rocks.push({ x: H.x + 30 + r() * (H.w - 60), y: H.y + 30 + r() * (H.h - 60), s: 10 + r() * 14 });
  const W = CFG.wild.rect, dead = []; for (let i = 0; i < 10; i++) dead.push({ x: W.x + 30 + r() * (W.w - 60), y: W.y + 40 + r() * (W.h - 80), s: 0.7 + r() * 0.6, k: r() });
  return { dots, flakes, floes, rocks, dead };
})();

function drawGround(ctx, g, view, time) {
  ctx.fillStyle = PAL.snow; ctx.fillRect(view.x0 - 50, view.y0 - 50, view.x1 - view.x0 + 100, view.y1 - view.y0 + 100);
  const F = CFG.forest.rect, C = CFG.camp, H = CFG.hunt.rect, W = CFG.wild.rect;
  ctx.fillStyle = PAL.snow2; rrect(ctx, F.x, F.y, F.w, F.h, 24);
  ctx.fillStyle = '#dfe6ee'; rrect(ctx, H.x, H.y, H.w, H.h, 30);
  ctx.fillStyle = PAL.wildSnow; rrect(ctx, W.x, W.y, W.w, W.h, 40);
  if (g.lv.ranch) { const Rr = CFG.ranch.rect; ctx.fillStyle = '#e3e6d6'; rrect(ctx, Rr.x, Rr.y, Rr.w, Rr.h, 18); }
  if (g.lv.grove) { const Gr = CFG.grove.rect; ctx.fillStyle = PAL.snow2; rrect(ctx, Gr.x, Gr.y, Gr.w, Gr.h, 24); }
  if (g.lv.expandEast) { const E = CFG.east; ctx.fillStyle = '#e4ebf2'; ctx.fillRect(E.x, 160, E.w, CFG.world.h - 160); ctx.strokeStyle = PAL.path; ctx.lineWidth = 50; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(E.x - 40, E.road.y); ctx.lineTo(E.x + 520, E.road.y); ctx.moveTo(E.x + 330, E.road.y); ctx.lineTo(E.x + 330, 700); ctx.moveTo(E.x + 330, E.road.y); ctx.lineTo(E.x + 330, 1330); ctx.stroke(); }
  ctx.fillStyle = PAL.snowShade; rrect(ctx, C.x - 16, C.y - 16, C.w + 32, C.h + 32, 22);
  ctx.fillStyle = PAL.snow2; rrect(ctx, C.x - 8, C.y - 8, C.w + 16, C.h + 16, 18);
  // 길
  ctx.strokeStyle = PAL.path; ctx.lineWidth = 50; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(360, 900); ctx.lineTo(840, 1025); ctx.lineTo(980, 1120); ctx.lineTo(1560, 1120); ctx.lineTo(1980, 1250);   // 숲 → 판매대 → 정육점 → 손님 입구
  ctx.moveTo(980, 1120); ctx.lineTo(840, 1300); ctx.lineTo(600, 1420); ctx.lineTo(330, 1900);                            // 판매대 → 갈림길 → 캠프 남문
  ctx.moveTo(840, 1300); ctx.lineTo(900, 1700); ctx.lineTo(1290, 2200); ctx.lineTo(1980, 1450);                           // 갈림길 → 공방 → 마트 → 입구
  ctx.moveTo(860, 410); ctx.lineTo(900, 880); ctx.moveTo(1560, 900); ctx.lineTo(1500, 690); ctx.lineTo(1680, 830);        // 어물전 ↔ 판매대, 정육점 ↔ 사냥터 ↔ 모피 상점
  ctx.moveTo(1560, 1120); ctx.lineTo(1300, 1405); ctx.lineTo(1500, 1620);                                                  // 정육점 ↔ 도축장 ↔ 목장
  ctx.stroke();
  // 강
  const R = CFG.river;
  ctx.fillStyle = PAL.ice; ctx.fillRect(R.x, R.y - 14, R.w, R.h + 28);
  const grd = ctx.createLinearGradient(0, R.y, 0, R.y + R.h); grd.addColorStop(0, PAL.water2); grd.addColorStop(1, PAL.water);
  ctx.fillStyle = grd; ctx.fillRect(R.x, R.y, R.w, R.h);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2;
  for (let k = 0; k < 4; k++) { const y = R.y + 22 + k * 24; ctx.beginPath(); for (let x = Math.max(R.x, view.x0 - 20); x < Math.min(R.x + R.w, view.x1 + 20); x += 8) ctx.lineTo(x, y + Math.sin(x * 0.04 + time * 1.6 + k) * 3); ctx.stroke(); }
  for (const f of GROUND.floes) { const x = ((f.x + time * f.v) % (R.w + 80)) - 40; if (x < view.x0 - 60 || x > view.x1 + 60) continue; ctx.fillStyle = PAL.ice; rrect(ctx, x, f.y, f.w, f.h, 6); ctx.fillStyle = 'rgba(255,255,255,0.6)'; rrect(ctx, x + 3, f.y + 2, f.w - 10, 3, 2); }
  ctx.fillStyle = PAL.snowShade; ctx.fillRect(R.x, R.y + R.h, R.w, 6);
  for (const d of GROUND.dots) {
    if (d.x < view.x0 || d.x > view.x1 || d.y < view.y0 || d.y > view.y1) continue;
    ctx.fillStyle = `rgba(255,255,255,${d.a})`; circle(ctx, d.x, d.y, d.s);
  }
  // 구역 이름
  label(ctx, H.x + H.w / 2, H.y + 24, '🐻 사냥터', 14, 'rgba(255,255,255,0.9)', 'rgba(60,80,110,0.5)');
  label(ctx, W.x + W.w / 2, W.y + 30, '❄ 남쪽 황무지 — 습격은 여기서 온다', 13, 'rgba(255,255,255,0.9)', 'rgba(60,80,110,0.5)');
  label(ctx, F.x + F.w / 2, F.y - 18, '🌲 숲', 14, 'rgba(255,255,255,0.9)', 'rgba(60,80,110,0.5)');
}

function drawRock(ctx, r) {
  shadow(ctx, r.x, r.y + 3, r.s, r.s * 0.4);
  ctx.fillStyle = PAL.stoneDark; ellipse(ctx, r.x, r.y - r.s * 0.3, r.s, r.s * 0.7);
  ctx.fillStyle = PAL.stone; ellipse(ctx, r.x - r.s * 0.15, r.y - r.s * 0.45, r.s * 0.7, r.s * 0.45);
  ctx.fillStyle = PAL.ice; ellipse(ctx, r.x - r.s * 0.1, r.y - r.s * 0.85, r.s * 0.5, r.s * 0.18);
}
function drawDeadTree(ctx, d, time) {
  const x = d.x, y = d.y, s = d.s;
  shadow(ctx, x, y + 2, 14 * s, 5 * s);
  ctx.strokeStyle = '#5b5148'; ctx.lineWidth = 6 * s; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 2 * s, y - 50 * s); ctx.moveTo(x + 1 * s, y - 28 * s); ctx.lineTo(x - 18 * s, y - 48 * s); ctx.moveTo(x + 2 * s, y - 38 * s); ctx.lineTo(x + 16 * s, y - 56 * s); ctx.stroke();
  if (d.k > 0.6) { ctx.fillStyle = '#e8e2d6'; ellipse(ctx, x + 26 * s, y + 2, 7 * s, 3 * s); circle(ctx, x + 32 * s, y + 1, 3 * s); }   // 뼈
}
function drawCave(ctx) {
  const H = CFG.hunt.rect, x = H.x + H.w - 70, y = H.y + H.h - 40;
  shadow(ctx, x, y + 4, 60, 16);
  ctx.fillStyle = PAL.stoneDark; ellipse(ctx, x, y - 20, 62, 44);
  ctx.fillStyle = PAL.stone; ellipse(ctx, x - 8, y - 30, 48, 30);
  ctx.fillStyle = PAL.ice; ellipse(ctx, x - 6, y - 52, 36, 10);
  ctx.fillStyle = '#2b3442'; ellipse(ctx, x, y - 6, 26, 22); ctx.fillStyle = PAL.wildSnow; ctx.fillRect(x - 30, y, 60, 10);
  label(ctx, x, y - 70, '곰 굴', 11, '#fff');
}

function drawTree(ctx, t, time) {
  const x = t.x, y = t.y;
  shadow(ctx, x, y + 4, 26, 10);
  if (t.logs <= 0) {
    ctx.fillStyle = PAL.woodDark; rrect(ctx, x - 10, y - 12, 20, 14, 3);
    ctx.fillStyle = PAL.grain; ellipse(ctx, x, y - 12, 10, 4.5);
    ctx.fillStyle = PAL.woodDark; ellipse(ctx, x, y - 12, 4, 1.8);
    const k = 1 - t.regrowT / CFG.tree.regrow;
    if (k > 0.25) { const h = 12 + k * 20; ctx.fillStyle = PAL.treeL; tri(ctx, x - 6 - k * 6, y - 14, x, y - 14 - h, x + 6 + k * 6, y - 14); }
    return;
  }
  ctx.fillStyle = PAL.woodDark; ctx.fillRect(x - 7, y - 26, 14, 28);
  ctx.fillStyle = PAL.wood; ctx.fillRect(x - 7, y - 26, 6, 28);
  const sway = Math.sin(time * 1.3 + x * 0.013 + y * 0.007) * 1.6;
  const tiers = [[34, 0], [27, 24], [20, 44]];
  for (const [hw, off] of tiers) {
    const by = y - 18 - off, ty = by - hw * 1.35, ax = x + sway * (off / 44);
    ctx.fillStyle = PAL.treeL; tri(ctx, ax - hw, by, ax, ty, ax, by + 3);
    ctx.fillStyle = PAL.treeR; tri(ctx, ax, ty, ax + hw, by, ax, by + 3);
    ctx.fillStyle = PAL.treeTop; tri(ctx, ax - hw * 0.28, ty + hw * 0.42, ax, ty, ax + hw * 0.28, ty + hw * 0.42);
  }
  if (t.logs < CFG.tree.logs) { ctx.fillStyle = PAL.grain; for (let i = 0; i < CFG.tree.logs - t.logs; i++) ctx.fillRect(x - 8, y - 10 - i * 6, 6, 3); }
}

// ---- 사람 ----
function drawTool(ctx, o, sw, g) {
  ctx.strokeStyle = OUT_C; ctx.lineWidth = 1.4; ctx.lineJoin = 'round';
  if (o.tool === 'axe') {
    const T = TIERS.axe[tierOf('axe', g.lv.axe)];
    ctx.rotate(-0.4 + (sw > 0 ? Math.sin(sw * Math.PI) * 1.6 : 0));
    ctx.fillStyle = PAL.wood; ctx.beginPath(); ctx.roundRect(1, -26, 4, 36, 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = T.color; ctx.beginPath(); ctx.moveTo(3, -28); ctx.lineTo(14, -24); ctx.lineTo(14, -12); ctx.lineTo(3, -14); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffffffaa'; ctx.fillRect(12, -24, 2.5, 12);
    if (tierOf('axe', g.lv.axe) >= 3) { ctx.fillStyle = 'rgba(179,136,255,0.35)'; circle(ctx, 9, -20, 11); }
  } else if (o.tool === 'spear') {
    const wt = o.weaponTier != null ? o.weaponTier : tierOf('weapon', g.lv.weapon), T = TIERS.weapon[wt];
    ctx.rotate(-0.2 + (sw > 0 ? Math.sin(sw * Math.PI) * 1.1 : 0));
    ctx.fillStyle = wt >= 2 ? '#5b4636' : PAL.wood; ctx.beginPath(); ctx.roundRect(1, -34 - wt * 3, 3.5 + wt * 0.5, 44 + wt * 3, 1); ctx.fill(); ctx.stroke();
    ctx.fillStyle = T.color; ctx.beginPath(); ctx.moveTo(-1 - wt, -34 - wt * 3); ctx.lineTo(2.75, -48 - wt * 4); ctx.lineTo(6.5 + wt, -34 - wt * 3); ctx.closePath(); ctx.fill(); ctx.stroke();
    if (wt >= 2) { ctx.fillStyle = T.color; tri(ctx, 4, -40 - wt * 3, 14, -36 - wt * 3, 4, -30 - wt * 3); }   // 미늘창 날
    if (T.glow) { ctx.fillStyle = T.glow + '55'; circle(ctx, 3, -42, 10); }
  } else if (o.tool === 'halberd') {   // 미늘창: 긴 자루 + 도끼날 + 창끝
    const T = TIERS.weapon[tierOf('weapon', g.lv.weapon)];
    ctx.rotate(-0.2 + (sw > 0 ? Math.sin(sw * Math.PI) * 1.1 : 0));
    ctx.fillStyle = '#5b4636'; ctx.beginPath(); ctx.roundRect(1, -40, 4, 52, 1); ctx.fill(); ctx.stroke();
    ctx.fillStyle = T.color; ctx.beginPath(); ctx.moveTo(-1, -40); ctx.lineTo(3, -54); ctx.lineTo(7, -40); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(5, -40); ctx.quadraticCurveTo(20, -36, 16, -22); ctx.lineTo(5, -26); ctx.closePath(); ctx.fill(); ctx.stroke();
    if (T.glow) { ctx.fillStyle = T.glow + '55'; circle(ctx, 6, -38, 12); }
  } else if (o.tool === 'gun' || o.tool === 'rifle' || o.tool === 'smg' || o.tool === 'energy') {   // 총: 총열 + 개머리판, 쏠 때 총구 불꽃. 형태마다 길이·부품이 다르다
    const T = TIERS.weapon[tierOf('weapon', g.lv.weapon)], shape = o.tool;
    ctx.rotate(-1.35 + (sw > 0 ? Math.sin(sw * Math.PI) * 0.15 : 0));
    const len = shape === 'smg' ? 24 : shape === 'rifle' ? 44 : shape === 'energy' ? 40 : 36;
    ctx.fillStyle = '#5b4636'; ctx.beginPath(); ctx.roundRect(-2, -8, 6, 22, 2); ctx.fill(); ctx.stroke();   // 개머리판
    if (shape === 'energy') { ctx.fillStyle = '#2b3442'; ctx.beginPath(); ctx.roundRect(-3, -6 - len, 9, len, 3); ctx.fill(); ctx.stroke(); ctx.fillStyle = T.color; ctx.beginPath(); ctx.roundRect(-1, -4 - len, 5, len - 10, 2); ctx.fill(); ctx.fillStyle = T.color + '66'; circle(ctx, 1.5, -2 - len, 8); }
    else { ctx.fillStyle = T.color; ctx.beginPath(); ctx.roundRect(0, -6 - len, 3.5, len, 1); ctx.fill(); ctx.stroke(); }
    if (shape === 'rifle') { ctx.fillStyle = '#2b3442'; ctx.beginPath(); ctx.roundRect(-3, -30, 9, 6, 2); ctx.fill(); ctx.stroke(); }   // 조준경
    if (shape === 'smg') { ctx.fillStyle = '#2b3442'; ctx.beginPath(); ctx.roundRect(-1, -14, 5, 12, 1); ctx.fill(); ctx.stroke(); }   // 탄창
    if (T.glow && shape !== 'energy') { ctx.fillStyle = T.glow + '44'; circle(ctx, 2, -6 - len, 7); }
    if (o.flashT > 0) { ctx.fillStyle = shape === 'energy' ? T.color : 'rgba(255,230,120,0.95)'; circle(ctx, 2, -10 - len, 7); ctx.fillStyle = 'rgba(255,255,255,0.8)'; circle(ctx, 2, -10 - len, 3); }
  } else if (o.tool === 'hammer') {
    ctx.rotate(-0.5 + (sw > 0 ? Math.sin(sw * Math.PI) * 1.4 : 0));
    ctx.fillStyle = o.coat; rrect(ctx, -3, -2, 7, 16, 3);
    ctx.fillStyle = PAL.wood; rrect(ctx, 1, -22, 4, 30, 2);
    ctx.fillStyle = '#7f8c8d'; rrect(ctx, -5, -28, 16, 9, 2);
  } else if (o.tool === 'rod') {
    ctx.rotate(-1.1);
    ctx.fillStyle = o.coat; rrect(ctx, -3, -2, 7, 16, 3);
    ctx.fillStyle = '#5b4636'; rrect(ctx, 1, -46, 3, 52, 1);
  } else {
    ctx.fillStyle = o.coat; rrect(ctx, -3, -2, 7, 18, 3);
  }
}
// 둥근 몸통 + 음영 + 외곽선. 걷기·숨쉬기·눈 깜빡임 애니메이션
const OUTLINE = 'rgba(28,38,56,0.38)';
function shade(ctx, color, x, y, r, k) {   // 색을 살짝 어둡게/밝게 한 방사형 그라데이션
  const grd = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r * 1.15);
  grd.addColorStop(0, lighten(color, 0.22)); grd.addColorStop(1, lighten(color, -0.18 * (k || 1)));
  return grd;
}
const _colCache = {};
function lighten(hex, k) {
  const key = hex + k; if (_colCache[key]) return _colCache[key];
  let r = 128, g = 128, b = 128;
  if (/^#[0-9a-f]{6}$/i.test(hex)) { r = parseInt(hex.slice(1, 3), 16); g = parseInt(hex.slice(3, 5), 16); b = parseInt(hex.slice(5, 7), 16); }
  else return hex;
  const f = v => Math.max(0, Math.min(255, Math.round(k >= 0 ? v + (255 - v) * k : v * (1 + k))));
  return (_colCache[key] = `rgb(${f(r)},${f(g)},${f(b)})`);
}
function capsule(ctx, x, y, w, h, fill, outline) {
  ctx.fillStyle = fill; ctx.beginPath(); ctx.roundRect(x, y, w, h, Math.min(w, h) / 2); ctx.fill();
  if (outline) { ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.2; ctx.stroke(); }
}
// 2단계 그리기: 모든 부위를 먼저 굵은 외곽선으로 깔고, 그 위에 채운다 → 실루엣 바깥에만 선이 남아 한 덩어리로 보인다
const OUT_W = 3.4, OUT_C = 'rgba(26,36,54,0.9)';
function drawParts(ctx, parts) {
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.strokeStyle = OUT_C; ctx.lineWidth = OUT_W;
  for (const p of parts) { ctx.beginPath(); p.path(ctx); ctx.stroke(); }
  for (const p of parts) { ctx.beginPath(); p.path(ctx); ctx.fillStyle = p.fill; ctx.fill(); }
}
const capPath = (x, y, w, h) => ctx => ctx.roundRect(x, y, w, h, Math.min(w, h) / 2);
const circPath = (x, y, r) => ctx => ctx.arc(x, y, r, 0, Math.PI * 2);
const ellPath = (x, y, rx, ry) => ctx => ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);

function drawPerson(ctx, e, o, g) {
  const t = e.anim || 0, moving = !!e.moving, now = g ? g.t : 0;
  const breathe = moving ? 0 : Math.sin(now * 2.2 + e.x * 0.05) * 0.8;
  const bob = moving ? Math.abs(Math.sin(t)) * 2.4 : breathe;
  ctx.fillStyle = 'rgba(40,70,110,0.16)'; ellipse(ctx, e.x, e.y + 2, 15, 6);
  // 이미지 스프라이트가 있으면 그것을 쓴다
  const state = e.down > 0 ? 'down' : (e.swing > 0 ? 'work' : moving ? 'walk' : 'idle');
  const usedSprite = typeof Sprites !== 'undefined' && o.sprite && Sprites.draw(ctx, o.sprite, state, t, now, e.x, e.y - bob, e.facing || 1, o.scale || 1);
  if (!usedSprite) {
    if (PERSON_CACHE.on && !(e.down > 0)) drawPersonCached(ctx, e, o, bob, state, moving, g);
    else {
      ctx.save(); ctx.translate(e.x, e.y - bob);
      if (e.down > 0) { ctx.rotate(e.facing < 0 ? 1.4 : -1.4); ctx.translate(0, 10); }
      if (e.facing < 0) ctx.scale(-1, 1);
      if (o.scale) ctx.scale(o.scale, o.scale);
      drawPersonBody(ctx, e, o, t, moving, now, g);
      ctx.restore();
    }
  }
  drawPersonCarry(ctx, e, o, bob);
}
// 사람 스프라이트 캐시: 같은 차림·동작·걸음 위상은 한 번만 벡터로 그려 두고 이미지로 찍는다(사람이 많아져도 가볍게)
const PERSON_CACHE = { map: new Map(), max: 480, res: 1.5, on: typeof document !== 'undefined', W: 96, H: 106, base: 94 };   // 칸 96×106(발이 y=94), 1.5배 해상도 → 한 장 약 90KB
function personKey(e, o, state, ph, sw) {
  return `${o.sprite}|${o.coat}|${o.pants}|${o.skin}|${o.hat}|${o.hatBand}|${o.pom}|${o.cap}|${o.hood}|${o.fur}|${o.helmet}|${o.beard}|${o.belt}|${o.bag}|${o.bagSize}|${o.vest}|${o.apron}|${o.armor}|${o.shield}|${o.shieldKite}|${o.tool}|${state}|${ph}|${sw}|${e.flash > 0.01 ? 1 : 0}|${o.flashT > 0 ? 1 : 0}`;
}
function drawPersonCached(ctx, e, o, bob, state, moving, g) {
  const TAU = Math.PI * 2, t = e.anim || 0, P = PERSON_CACHE;
  const ph = moving ? Math.floor((((t % TAU) + TAU) % TAU) / TAU * 8) : 0;   // 걷기 8단계
  const sw = e.swing > 0 ? Math.min(3, Math.ceil(e.swing * 3)) : 0;          // 휘두르기 3단계
  const key = personKey(e, o, state, ph, sw);
  let c = P.map.get(key);
  if (!c) {
    if (P.map.size >= P.max) P.map.clear();
    c = document.createElement('canvas'); c.width = P.W * P.res; c.height = P.H * P.res;
    const cc = c.getContext('2d'); cc.scale(P.res, P.res); cc.translate(P.W / 2, P.base);
    const fe = { x: 0, y: 0, anim: moving ? ((ph + 0.5) / 8) * TAU : 0, moving, swing: sw / 3, down: 0, flash: e.flash, facing: 1 };
    drawPersonBody(cc, fe, o, fe.anim, moving, 0, g);
    P.map.set(key, c);
  }
  const sc = o.scale || 1;
  ctx.save(); ctx.translate(e.x, e.y - bob); if ((e.facing || 1) < 0) ctx.scale(-1, 1); if (sc !== 1) ctx.scale(sc, sc);
  ctx.drawImage(c, -P.W / 2, -P.base, P.W, P.H);
  ctx.restore();
}
// 사람 몸통(벡터). 원점이 발 위치, 오른쪽을 본다
function drawPersonBody(ctx, e, o, t, moving, now, g) {
  {
    const leg = moving ? Math.sin(t) * 6 : 0, arm = moving ? Math.sin(t) * 0.5 : 0;
    const blink = now > 0 && ((now * 0.7 + e.x * 0.01) % 4) > 3.86;
    if (moving) ctx.rotate(0.04);
    const coat = e.flash > 0.01 ? '#ffb4b4' : o.coat, pants = o.pants || '#2b3a55', skin = o.skin || '#f3cfae';
    const parts = [];
    // 다리·신발 (몸통 아래에 겹침)
    parts.push({ path: capPath(-10 + leg * 0.5, -17, 9, 18), fill: shade(ctx, pants, -5, -8, 10) });
    parts.push({ path: capPath(1 - leg * 0.5, -17, 9, 18), fill: shade(ctx, pants, 5, -8, 10) });
    parts.push({ path: capPath(-11 + leg * 0.55, -4, 11, 6), fill: '#3b2a1a' });
    parts.push({ path: capPath(0 - leg * 0.55, -4, 11, 6), fill: '#3b2a1a' });
    if (o.bag) parts.push({ path: capPath(-23, -42, 12, 14 + (o.bagSize || 0) * 3), fill: shade(ctx, o.bag, -17, -34, 10) });
    // 뒤팔 (어깨에서 회전)
    const backArm = ctx => { ctx.save(); ctx.translate(-9, -37); ctx.rotate(-arm); ctx.roundRect(-3.5, -3, 7, 19, 3.5); ctx.restore(); };
    parts.push({ path: backArm, fill: lighten(coat, -0.14) });
    // 몸통 + 목 + 머리 (서로 겹치게)
    parts.push({ path: capPath(-13, -44, 26, 33), fill: shade(ctx, coat, 0, -31, 17) });
    parts.push({ path: capPath(-4, -48, 8, 10), fill: lighten(skin, -0.08) });
    parts.push({ path: circPath(0, -54, 12.5), fill: shade(ctx, skin, 0, -55, 13) });
    parts.push({ path: circPath(-11.5, -54, 2.8), fill: lighten(skin, -0.1) });
    // 모자류 (실루엣에 포함)
    if (o.hood) parts.push({ path: ctx => { ctx.arc(0, -55, 14.5, Math.PI * 0.92, Math.PI * 2.08); ctx.lineTo(14.5, -46); ctx.lineTo(-14.5, -46); ctx.closePath(); }, fill: shade(ctx, o.hood, 0, -58, 15) });
    else if (o.fur) parts.push({ path: ctx => ctx.roundRect(-13.5, -70, 27, 17, 8), fill: shade(ctx, o.fur, 0, -63, 13) });
    else if (o.cap) parts.push({ path: ctx => { ctx.arc(0, -57, 13, Math.PI, Math.PI * 2); ctx.lineTo(17, -57); ctx.lineTo(17, -53); ctx.lineTo(-13, -53); ctx.closePath(); }, fill: shade(ctx, o.cap, 0, -60, 13) });
    else if (o.hat) { parts.push({ path: ctx => ctx.roundRect(-13, -68, 26, 15, 7), fill: shade(ctx, o.hat, 0, -63, 13) }); parts.push({ path: circPath(0, -69, 4.4), fill: o.pom || lighten(o.hat, 0.3) }); }
    if (o.helmet) { parts.push({ path: ctx => { ctx.arc(0, -56, 14, Math.PI, Math.PI * 2); ctx.closePath(); }, fill: shade(ctx, o.helmet, 0, -60, 14) }); parts.push({ path: ctx => ctx.roundRect(-15, -58, 30, 4.5, 2), fill: lighten(o.helmet, -0.15) }); parts.push({ path: ctx => ctx.roundRect(-2, -73, 4, 17, 2), fill: '#e74c3c' }); }
    if (o.shield) parts.push({ path: o.shieldKite ? ctx => { ctx.moveTo(-27, -40); ctx.lineTo(-10, -40); ctx.lineTo(-10, -22); ctx.lineTo(-18, -12); ctx.lineTo(-27, -22); ctx.closePath(); } : circPath(-19, -30, 9.5), fill: shade(ctx, o.shield, -19, -30, 9) });
    // 앞팔
    const frontArm = ctx => { ctx.save(); ctx.translate(11, -37); ctx.rotate(o.tool ? -0.2 : arm); ctx.roundRect(-3.5, -3, 7, 19, 3.5); ctx.restore(); };
    parts.push({ path: frontArm, fill: shade(ctx, coat, 11, -28, 9) });
    drawParts(ctx, parts);
    // 세부(외곽선 없이)
    if (o.vest) { ctx.fillStyle = o.vest; ctx.beginPath(); ctx.roundRect(-9, -42, 18, 26, 5); ctx.fill(); }
    if (o.apron) { ctx.fillStyle = o.apron; ctx.beginPath(); ctx.roundRect(-8, -36, 16, 23, 4); ctx.fill(); }
    if (o.armor) { ctx.fillStyle = shade(ctx, o.armor, 0, -32, 12); ctx.beginPath(); ctx.roundRect(-11, -42, 22, 22, 6); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(-9, -40, 4, 16); }
    ctx.fillStyle = o.belt || 'rgba(0,0,0,0.2)'; ctx.fillRect(-13, -22, 26, 4); ctx.fillStyle = '#d4b24c'; ctx.fillRect(-2, -22, 4, 4);
    if (o.shield) { ctx.fillStyle = 'rgba(255,255,255,0.45)'; circle(ctx, -19, -30, 3); }
    if (o.hood) { ctx.fillStyle = '#f4f4f4'; for (let a = Math.PI * 1.02; a < Math.PI * 2; a += 0.38) circle(ctx, Math.cos(a) * 13.5, -55 + Math.sin(a) * 13.5, 2.3); }
    if (o.fur) { ctx.fillStyle = '#5b4636'; ctx.fillRect(-12, -59, 24, 4); }
    if (o.hat) { ctx.fillStyle = o.hatBand || 'rgba(255,255,255,0.4)'; ctx.fillRect(-13, -58, 26, 3.5); ctx.fillStyle = 'rgba(255,255,255,0.35)'; circle(ctx, -1.2, -70.2, 1.6); }
    if (o.cap) { ctx.fillStyle = lighten(o.cap, -0.2); ctx.fillRect(-13, -56, 30, 2); }
    if (o.beard) { ctx.fillStyle = o.beard; ctx.beginPath(); ctx.arc(0, -51, 12.5, 0.2, Math.PI - 0.2); ctx.quadraticCurveTo(0, -31, 0, -37); ctx.closePath(); ctx.fill(); }
    ctx.fillStyle = 'rgba(255,120,120,0.22)'; ellipse(ctx, 8, -50, 3.2, 1.8);
    ctx.fillStyle = '#222';
    if (blink) { ctx.fillRect(3, -55, 4, 1.4); ctx.fillRect(8.5, -55, 4, 1.4); }
    else { ellipse(ctx, 5, -55, 1.7, 2.2); ellipse(ctx, 9.8, -55, 1.7, 2.2); ctx.fillStyle = '#fff'; circle(ctx, 5.6, -56, 0.6); circle(ctx, 10.4, -56, 0.6); }
    if (e.down > 0) { ctx.strokeStyle = '#222'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(3, -57); ctx.lineTo(7, -53); ctx.moveTo(7, -57); ctx.lineTo(3, -53); ctx.stroke(); }
    ctx.strokeStyle = '#8a5a4a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(7, -48, 2, 0.2, Math.PI - 0.2); ctx.stroke();
    // 손과 도구
    ctx.save(); ctx.translate(11, -37); ctx.rotate(o.tool ? -0.2 : arm); ctx.fillStyle = skin; circle(ctx, 0, 15, 3.6); ctx.restore();
    ctx.save(); ctx.translate(-9, -37); ctx.rotate(-arm); ctx.fillStyle = skin; circle(ctx, 0, 15, 3.6); ctx.restore();
    if (o.tool) { ctx.save(); ctx.translate(11, -38); drawTool(ctx, { ...o, coat }, e.swing || 0, g); ctx.restore(); }
  }
}
// 짊어진 물건
function drawPersonCarry(ctx, e, o, bob) {
  if (e.inv && e.down <= 0) {
    let h = 72;
    const nw = Math.min(e.inv.wood, 7);
    for (let i = 0; i < nw; i++) log(ctx, e.x, e.y - bob - h - i * 7, 30, 7);
    h += nw * 7;
    const nm = Math.min(e.inv.meat, 5);
    for (let i = 0; i < nm; i++) meatChunk(ctx, e.x, e.y - bob - h - 4 - i * 8, 0.8);
    h += nm * 8;
    const nf = Math.min(e.inv.fish, 5);
    for (let i = 0; i < nf; i++) fishShape(ctx, e.x, e.y - bob - h - 4 - i * 7, 0.8);
    h += nf * 7;
    const np = Math.min(e.inv.pelt || 0, 4);
    for (let i = 0; i < np; i++) peltBundle(ctx, e.x, e.y - bob - h - 6 - i * 9, 0.8);
    h += np * 9;
    if (e.inv.animal > 0) { const ax = e.x - (e.facing || 1) * 34; drawReindeer(ctx, { x: ax, y: e.y + 2, grow: 1, facing: e.facing || 1, moving: e.moving, anim: e.anim, harvestT: 0, i: 0, led: true }, 0); ctx.strokeStyle = '#5b4636'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(e.x + (e.facing || 1) * 6, e.y - 30); ctx.lineTo(ax + (e.facing || 1) * 18, e.y - 34); ctx.stroke(); if (e.inv.animal > 1) pill(ctx, ax, e.y - 70, `×${e.inv.animal}`, 'rgba(20,30,45,0.7)'); }
    const parts = [];
    if (e.inv.wood) parts.push(`🪵${e.inv.wood}`); if (e.inv.meat) parts.push(`🥩${e.inv.meat}`); if (e.inv.fish) parts.push(`🐟${e.inv.fish}`); if (e.inv.pelt) parts.push(`🐾${e.inv.pelt}`); if (e.inv.animal) parts.push(`🦌${e.inv.animal}`);
    if (parts.length && o.showInv) pill(ctx, e.x, e.y - bob - h - 12, parts.join(' '), 'rgba(20,30,45,0.7)');
  }
}

function drawBubble(ctx, x, y, text) {
  const font = 'bold 13px system-ui, sans-serif', w = textWidth(ctx, text, font) + 18;
  if (!TEXT_CACHE.on) { ctx.font = font; ctx.fillStyle = '#fff'; rrect(ctx, x - w / 2, y - 24, w, 24, 8); tri(ctx, x - 5, y - 1, x + 5, y - 1, x, y + 5); ctx.fillStyle = PAL.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, x, y - 12); return; }
  const c = cachedText(ctx, `b|${text}`, w + 2, 31, (cc, W, H) => { cc.font = font; cc.fillStyle = '#fff'; rrect(cc, 1, 1, w, 24, 8); tri(cc, W / 2 - 5, 24, W / 2 + 5, 24, W / 2, 30); cc.fillStyle = PAL.ink; cc.textAlign = 'center'; cc.textBaseline = 'middle'; cc.fillText(text, W / 2, 13); });
  ctx.drawImage(c.cv, x - c.w / 2, y - 25, c.w, c.h);
}

// ---- 적 ----
function drawBear(ctx, b, colors) {
  const sc = b.scale || 1, t = b.anim || 0;
  const sg = ctx.createRadialGradient(b.x, b.y + 2, 4, b.x, b.y + 2, 26 * sc); sg.addColorStop(0, 'rgba(40,70,110,0.26)'); sg.addColorStop(1, 'rgba(40,70,110,0)');
  ctx.fillStyle = sg; ellipse(ctx, b.x, b.y + 2, 27 * sc, 10 * sc);
  const key = b.type === 'wild' ? 'wild' : 'bear';
  const state = b.lunge > 0.3 ? 'attack' : b.moving ? 'walk' : 'idle';
  if (typeof Sprites !== 'undefined' && Sprites.draw(ctx, key, state, t, 0, b.x, b.y, b.facing, sc)) { if (b.hp < b.maxhp) bar(ctx, b.x - 22, b.y - 60 * sc, 44, 5, b.hp / b.maxhp, '#e74c3c'); return; }
  ctx.save(); ctx.translate(b.x, b.y);
  if (b.facing < 0) ctx.scale(-1, 1);
  ctx.scale(sc, sc);
  ctx.translate(b.lunge * 9, 0);
  const bob = b.moving ? Math.abs(Math.sin(t)) * 2 : 0;
  const leg = b.moving ? Math.sin(t) * 4 : 0;
  const hit = b.flash > 0.6;
  const body = hit ? '#ffd6d6' : colors.body, dark = hit ? '#f0b0b0' : colors.dark;
  const parts = [];
  for (const [lx, ph] of [[-21, 0], [-7, 1], [7, 0], [16, 1]]) { const dy = ph ? -leg : leg; parts.push({ path: capPath(lx, -16 + Math.max(0, dy) * 0.3, 10, 17), fill: shade(ctx, dark, lx + 5, -8, 8) }); }
  parts.push({ path: ellPath(-2, -21 - bob, 27, 17), fill: shade(ctx, body, -4, -25 - bob, 26) });
  parts.push({ path: circPath(13, -42 - bob, 5), fill: body }); parts.push({ path: circPath(27, -42 - bob, 5), fill: body });
  parts.push({ path: circPath(20, -31 - bob, 14), fill: shade(ctx, body, 18, -34 - bob, 14) });
  parts.push({ path: ellPath(28, -27 - bob, 7.5, 5.5), fill: lighten(body, -0.08) });
  drawParts(ctx, parts);
  ctx.fillStyle = dark; circle(ctx, 13, -42 - bob, 2.3); circle(ctx, 27, -42 - bob, 2.3);
  ctx.fillStyle = '#222'; ellipse(ctx, 31, -29 - bob, 2.8, 2.2); ctx.fillStyle = '#fff'; circle(ctx, 30.2, -30 - bob, 0.8);
  ctx.fillStyle = '#222'; ellipse(ctx, 23, -34 - bob, 1.9, 2.3); ctx.fillStyle = '#fff'; circle(ctx, 23.5, -35 - bob, 0.7);
  if (b.lunge > 0.5) { ctx.fillStyle = '#7a1f1f'; ellipse(ctx, 29, -23 - bob, 4, 2.5); ctx.fillStyle = '#fff'; tri(ctx, 26, -25 - bob, 27.5, -21.5 - bob, 29, -25 - bob); }
  ctx.restore();
  if (b.hp < b.maxhp) bar(ctx, b.x - 22, b.y - 60 * sc, 44, 5, b.hp / b.maxhp, '#e74c3c');
}
function drawWolf(ctx, b) {
  shadow(ctx, b.x, b.y + 2, 20, 7);
  ctx.save(); ctx.translate(b.x, b.y);
  if (b.facing < 0) ctx.scale(-1, 1);
  ctx.translate(b.lunge * 9, 0);
  const bob = b.moving ? Math.abs(Math.sin(b.anim * 1.4)) * 3 : 0;
  const body = b.flash > 0.6 ? '#ffd6d6' : '#8d99a6', dark = b.flash > 0.6 ? '#f0b0b0' : '#5f6b78';
  ctx.fillStyle = dark; rrect(ctx, -17, -12, 6, 13, 3); rrect(ctx, -7, -12, 6, 13, 3); rrect(ctx, 5, -11, 6, 12, 3); rrect(ctx, 12, -12, 6, 13, 3);
  ctx.fillStyle = body; ellipse(ctx, -2, -17 - bob, 21, 11);
  ctx.strokeStyle = dark; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-20, -20 - bob); ctx.quadraticCurveTo(-34, -24 - bob, -32, -36 - bob); ctx.stroke();
  ctx.fillStyle = body; ellipse(ctx, 17, -24 - bob, 11, 8.5);
  ctx.fillStyle = dark; tri(ctx, 9, -30 - bob, 12, -42 - bob, 16, -31 - bob); tri(ctx, 18, -31 - bob, 22, -42 - bob, 25, -30 - bob);
  ctx.fillStyle = dark; ellipse(ctx, 26, -22 - bob, 6, 4);
  ctx.fillStyle = '#222'; circle(ctx, 30, -23 - bob, 2); ctx.fillStyle = '#ffd166'; circle(ctx, 19, -27 - bob, 1.8);
  ctx.restore();
  if (b.hp < b.maxhp) bar(ctx, b.x - 18, b.y - 52, 36, 4, b.hp / b.maxhp, '#e74c3c');
}
function drawYeti(ctx, b, time) {
  const sc = b.scale || 1;
  shadow(ctx, b.x, b.y + 3, 38 * sc, 13 * sc);
  ctx.save(); ctx.translate(b.x, b.y);
  if (b.facing < 0) ctx.scale(-1, 1);
  ctx.scale(sc, sc);
  ctx.translate(b.lunge * 12, 0);
  const bob = b.moving ? Math.abs(Math.sin(b.anim * 0.7)) * 4 : 0;
  const fur = b.flash > 0.6 ? '#ffd6d6' : b.enraged ? '#ffe3e3' : '#e8f1fb', dark = b.flash > 0.6 ? '#f0b0b0' : b.enraged ? '#e8a8a8' : '#b7c9dd', skin = '#7f9bb8';
  ctx.fillStyle = dark; rrect(ctx, -26, -22, 18, 24, 8); rrect(ctx, 8, -22, 18, 24, 8);
  ctx.fillStyle = fur; rrect(ctx, -34, -92 - bob, 68, 76, 26);
  ctx.fillStyle = dark; rrect(ctx, -16, -70 - bob, 32, 40, 12);
  const arm = b.lunge > 0 ? -Math.sin(b.lunge * Math.PI) * 1.2 : Math.sin(time * 2) * 0.1;
  ctx.save(); ctx.translate(30, -80 - bob); ctx.rotate(arm); ctx.fillStyle = fur; rrect(ctx, -8, 0, 18, 52, 9); ctx.fillStyle = skin; rrect(ctx, -6, 44, 14, 12, 5); ctx.restore();
  ctx.save(); ctx.translate(-30, -80 - bob); ctx.rotate(-arm * 0.5); ctx.fillStyle = fur; rrect(ctx, -10, 0, 18, 52, 9); ctx.fillStyle = skin; rrect(ctx, -8, 44, 14, 12, 5); ctx.restore();
  ctx.fillStyle = fur; circle(ctx, 4, -108 - bob, 24);
  ctx.fillStyle = skin; rrect(ctx, -10, -116 - bob, 34, 26, 10);
  ctx.fillStyle = '#fff'; circle(ctx, 4, -108 - bob, 4); circle(ctx, 16, -108 - bob, 4);
  ctx.fillStyle = b.enraged ? '#ff1744' : '#c0392b'; circle(ctx, 5, -108 - bob, 2.2); circle(ctx, 17, -108 - bob, 2.2);
  if (b.enraged) { ctx.fillStyle = 'rgba(255,23,68,0.35)'; circle(ctx, 5, -108 - bob, 6); circle(ctx, 17, -108 - bob, 6); }
  ctx.fillStyle = '#222'; rrect(ctx, -2, -98 - bob, 22, 5, 2); ctx.fillStyle = '#fff'; tri(ctx, 2, -98 - bob, 5, -92 - bob, 8, -98 - bob); tri(ctx, 12, -98 - bob, 15, -92 - bob, 18, -98 - bob);
  ctx.fillStyle = dark; tri(ctx, -12, -124 - bob, -8, -140 - bob, 0, -126 - bob); tri(ctx, 8, -126 - bob, 16, -140 - bob, 20, -124 - bob);
  if (sc > 1.2) { ctx.fillStyle = '#4b6ea8'; tri(ctx, -20, -126 - bob, -14, -150 - bob, -4, -128 - bob); tri(ctx, 12, -128 - bob, 20, -152 - bob, 26, -126 - bob); }   // 왕관 뿔
  ctx.restore();
  bar(ctx, b.x - 34, b.y - 150 * sc, 68, 7, b.hp / b.maxhp, b.enraged ? '#ff1744' : '#8e44ad');
  label(ctx, b.x, b.y - 162 * sc, `👹 ${b.bossName || '설인'}${b.enraged ? ' (분노)' : ''}`, 12, '#fff');
}
// 보스 체력바·이름(설인은 자체 그림에 포함)
function drawBossBar(ctx, b) {
  const sc = b.scale || 1;
  bar(ctx, b.x - 34, b.y - 80 * sc, 68, 7, b.hp / b.maxhp, b.enraged ? '#ff1744' : '#8e44ad');
  label(ctx, b.x, b.y - 92 * sc, `${b.ability === 'armor' ? '🧊' : b.type === 'wolfking' ? '🐺' : '🐻‍❄️'} ${b.bossName}${b.enraged ? ' (분노)' : ''}`, 12, '#fff');
}
// 얼음 골렘: 각진 얼음 몸통, 느리고 단단하다
function drawGolem(ctx, b, time) {
  const sc = b.scale || 1;
  shadow(ctx, b.x, b.y + 3, 34 * sc, 12 * sc);
  ctx.save(); ctx.translate(b.x, b.y); if (b.facing < 0) ctx.scale(-1, 1); ctx.scale(sc, sc); ctx.translate(b.lunge * 10, 0);
  const bob = b.moving ? Math.abs(Math.sin(b.anim * 0.6)) * 3 : 0, ice = b.flash > 0.6 ? '#ffd6d6' : b.enraged ? '#d7f0ff' : '#bfe3ff', dark = '#7fb8e6', deep = '#4a8fc7';
  ctx.fillStyle = dark; rrect(ctx, -26, -24, 18, 26, 4); rrect(ctx, 8, -24, 18, 26, 4);
  ctx.fillStyle = ice; ctx.beginPath(); ctx.moveTo(-34, -30 - bob); ctx.lineTo(-24, -96 - bob); ctx.lineTo(24, -96 - bob); ctx.lineTo(34, -30 - bob); ctx.closePath(); ctx.fill();
  ctx.fillStyle = deep; ctx.beginPath(); ctx.moveTo(-10, -90 - bob); ctx.lineTo(0, -60 - bob); ctx.lineTo(-16, -44 - bob); ctx.closePath(); ctx.fill();
  ctx.fillStyle = dark; rrect(ctx, -52, -90 - bob, 18, 56, 6); rrect(ctx, 34, -90 - bob, 18, 56, 6);
  ctx.fillStyle = ice; ctx.beginPath(); ctx.moveTo(-18, -96 - bob); ctx.lineTo(-10, -126 - bob); ctx.lineTo(10, -126 - bob); ctx.lineTo(18, -96 - bob); ctx.closePath(); ctx.fill();
  ctx.fillStyle = b.enraged ? '#ff1744' : '#1e3a5f'; circle(ctx, -6, -110 - bob, 3); circle(ctx, 6, -110 - bob, 3);
  ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-20, -80 - bob); ctx.lineTo(-6, -70 - bob); ctx.moveTo(10, -88 - bob); ctx.lineTo(20, -50 - bob); ctx.stroke();
  ctx.restore();
}
function drawEnemy(ctx, b, time) {
  if ((b.type === 'wolf' || b.type === 'yeti') && typeof Sprites !== 'undefined' && Sprites.draw(ctx, b.type, b.lunge > 0.3 ? 'attack' : b.moving ? 'walk' : 'idle', b.anim || 0, time, b.x, b.y, b.facing, b.scale || 1)) { bar(ctx, b.x - 22, b.y - 60 * (b.scale || 1), 44, 5, b.hp / b.maxhp, '#e74c3c'); return; }
  if (b.type === 'wolf') drawWolf(ctx, b);
  else if (b.type === 'yeti') drawYeti(ctx, b, time);
  else if (b.type === 'gbear') { ctx.save(); ctx.translate(b.x, b.y); ctx.scale(b.scale, b.scale); ctx.translate(-b.x, -b.y); drawBear(ctx, b, { body: b.enraged ? '#ffe3e3' : '#eef2f7', dark: '#c9d3df' }); ctx.restore(); ctx.strokeStyle = '#c0392b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(b.x + 10, b.y - 44); ctx.lineTo(b.x + 22, b.y - 30); ctx.moveTo(b.x + 16, b.y - 46); ctx.lineTo(b.x + 28, b.y - 32); ctx.stroke(); drawBossBar(ctx, b); }
  else if (b.type === 'wolfking') { ctx.save(); ctx.translate(b.x, b.y); ctx.scale(b.scale, b.scale); ctx.translate(-b.x, -b.y); drawWolf(ctx, b); ctx.restore(); ctx.fillStyle = '#f1c40f'; const cx = b.x + b.facing * 24 * b.scale, cy = b.y - 44 * b.scale; tri(ctx, cx - 10, cy, cx - 6, cy - 12, cx - 2, cy); tri(ctx, cx - 2, cy, cx + 2, cy - 14, cx + 6, cy); tri(ctx, cx + 6, cy, cx + 10, cy - 12, cx + 14, cy); ctx.fillRect(cx - 10, cy - 2, 24, 4); drawBossBar(ctx, b); }
  else if (b.type === 'golem') { drawGolem(ctx, b, time); drawBossBar(ctx, b); }
  else if (b.type === 'wild') drawBear(ctx, b, { body: '#a67c52', dark: '#7a5230' });
  else drawBear(ctx, b, { body: '#f6f8fb', dark: '#dde5ee' });
}

// ---- 가게 ----
function drawStallBase(ctx, g, sh, awning, tier) {
  const x = sh.x, y = sh.y, w = sh.w;
  shadow(ctx, x, y + 6, w / 2 + 4, 13);
  if (tier >= 2) {   // 지붕 있는 상점
    ctx.fillStyle = PAL.woodDark; ctx.fillRect(x - w / 2 - 10, y - 120, 6, 130); ctx.fillRect(x + w / 2 + 4, y - 120, 6, 130);
    ctx.fillStyle = '#5b3a1a'; ctx.beginPath(); ctx.moveTo(x - w / 2 - 22, y - 118); ctx.lineTo(x, y - 150); ctx.lineTo(x + w / 2 + 22, y - 118); ctx.closePath(); ctx.fill();
    ctx.fillStyle = PAL.treeTop; ctx.beginPath(); ctx.moveTo(x - w / 2 - 16, y - 120); ctx.lineTo(x, y - 148); ctx.lineTo(x + w / 2 + 16, y - 120); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffd27d'; circle(ctx, x - w / 2 - 7, y - 90, 5); circle(ctx, x + w / 2 + 7, y - 90, 5);   // 등불
    ctx.fillStyle = 'rgba(255,210,125,0.15)'; circle(ctx, x - w / 2 - 7, y - 90, 22); circle(ctx, x + w / 2 + 7, y - 90, 22);
  }
  if (tier >= 1) {   // 천막
    ctx.fillStyle = PAL.woodDark; ctx.fillRect(x - w / 2 - 4, y - 100, 5, 100); ctx.fillRect(x + w / 2 - 1, y - 100, 5, 100);
    for (let i = 0; i < Math.ceil((w + 20) / 24); i++) { ctx.fillStyle = i % 2 ? '#f5f0e6' : awning; ctx.fillRect(x - w / 2 - 10 + i * 24, y - 112, 24, 22); }
    ctx.fillStyle = awning; for (let i = 0; i < Math.ceil((w + 20) / 24); i++) tri(ctx, x - w / 2 - 10 + i * 24, y - 90, x - w / 2 + 2 + i * 24, y - 82, x - w / 2 + 14 + i * 24, y - 90);
  }
  ctx.fillStyle = PAL.woodDark; ctx.fillRect(x - w / 2, y - 8, w, 20);        // 앞면
  ctx.fillStyle = PAL.wood; ctx.fillRect(x - w / 2, y - 38, w, 30);           // 윗면
  ctx.fillStyle = PAL.woodLight; for (let i = 0; i < 4; i++) ctx.fillRect(x - w / 2 + 4, y - 36 + i * 7, w - 8, 2);
  ctx.fillStyle = PAL.woodDark; ctx.fillRect(x - w / 2, y - 8, w, 3);
}
function drawSign(ctx, x, y, text, sub, subBg) {
  ctx.fillStyle = PAL.woodDark; ctx.fillRect(x - 3, y - 70, 6, 72);
  ctx.font = 'bold 13px system-ui, sans-serif'; const w = Math.max(68, ctx.measureText(text).width + 20);
  ctx.fillStyle = '#f5e6c8'; rrect(ctx, x - w / 2, y - 96, w, 30, 5);
  ctx.strokeStyle = PAL.woodDark; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.roundRect(x - w / 2, y - 96, w, 30, 5); ctx.stroke();
  ctx.fillStyle = PAL.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, x, y - 81);
  if (sub) pill(ctx, x, y - 60, sub, subBg || '#27ae60', '#fff', 'bold 11px system-ui, sans-serif');
}
function drawStockPill(ctx, g, id, x, y) {
  const st = g.shops[id].stock, cap = g.shopCap(id);
  const parts = g.shopGoods(id).map(gd => `${CFG.goods[gd].emoji}${st[gd]}`);
  const full = g.shopGoods(id).some(gd => st[gd] >= cap);
  pill(ctx, x, y, `${parts.join(' ')} / ${cap}`, full ? '#c0392b' : 'rgba(20,30,45,0.75)');
}
function drawClosed(ctx, x, y) {
  ctx.save(); ctx.translate(x, y - 50); ctx.rotate(-0.08);
  ctx.fillStyle = '#f5e6c8'; rrect(ctx, -52, -14, 104, 28, 5); ctx.strokeStyle = PAL.woodDark; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(-52, -14, 104, 28, 5); ctx.stroke();
  ctx.fillStyle = PAL.ink; ctx.font = 'bold 12px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('마트로 이전했어요', 0, 1);
  ctx.restore();
}
function drawWoodStall(ctx, g, time) {
  const sh = CFG.shops.wood, open = g.shopOpen('wood'), tier = tierOf('stall', g.lv.price);
  ctx.save(); const sc = popScale(g, 'wood'); ctx.translate(sh.x, sh.y); ctx.scale(sc, sc); ctx.translate(-sh.x, -sh.y);
  drawStallBase(ctx, g, sh, '#c0392b', tier);
  const n = g.shops.wood.stock.wood, show = Math.min(n, 16);
  for (let i = 0; i < show; i++) { const col = i % 4, row = Math.floor(i / 4); log(ctx, sh.x - 66 + col * 38 + (row % 2) * 6, sh.y - 42 - row * 8, 30, 8); }
  if (open) drawStockPill(ctx, g, 'wood', sh.x, sh.y - (tier >= 1 ? 124 : 72)); else drawClosed(ctx, sh.x, sh.y);
  drawSign(ctx, sh.x + sh.w / 2 + 28, sh.y + 4, TIERS.stall[tier].name, open ? `$${g.price('wood')}/개` : null);
  ctx.restore();
}
function drawMeatShop(ctx, g, time) {
  const sh = CFG.shops.meat, open = g.shopOpen('meat');
  ctx.save(); const sc = popScale(g, 'meat'); ctx.translate(sh.x, sh.y); ctx.scale(sc, sc); ctx.translate(-sh.x, -sh.y);
  drawStallBase(ctx, g, sh, '#e74c3c', 1);
  ctx.strokeStyle = '#5b4636'; ctx.lineWidth = 2; for (let i = 0; i < 3; i++) { const hx = sh.x - 40 + i * 40; ctx.beginPath(); ctx.moveTo(hx, sh.y - 90); ctx.lineTo(hx, sh.y - 64); ctx.stroke(); meatChunk(ctx, hx, sh.y - 58, 0.9); }   // 매달린 고기
  const n = Math.min(g.shops.meat.stock.meat, 8);
  for (let i = 0; i < n; i++) meatChunk(ctx, sh.x - 54 + (i % 4) * 36, sh.y - 30 + Math.floor(i / 4) * 10 - 10, 0.9);
  if (open) drawStockPill(ctx, g, 'meat', sh.x, sh.y - 124); else drawClosed(ctx, sh.x, sh.y);
  drawSign(ctx, sh.x + sh.w / 2 + 28, sh.y + 4, '정육점', open ? `$${g.price('meat')}/개` : null);
  ctx.restore();
}
function drawFishShop(ctx, g, time) {
  const sh = CFG.shops.fish, open = g.shopOpen('fish');
  ctx.save(); const sc = popScale(g, 'fish'); ctx.translate(sh.x, sh.y); ctx.scale(sc, sc); ctx.translate(-sh.x, -sh.y);
  drawStallBase(ctx, g, sh, '#2980b9', 1);
  ctx.fillStyle = PAL.ice; rrect(ctx, sh.x - 70, sh.y - 40, 140, 22, 6);   // 얼음
  const n = Math.min(g.shops.fish.stock.fish, 8);
  for (let i = 0; i < n; i++) fishShape(ctx, sh.x - 50 + (i % 4) * 34, sh.y - 34 + Math.floor(i / 4) * 9 - 6, 0.9, i % 2 ? '#5aa9e6' : '#e67e22');
  if (open) drawStockPill(ctx, g, 'fish', sh.x, sh.y - 124); else drawClosed(ctx, sh.x, sh.y);
  drawSign(ctx, sh.x + sh.w / 2 + 28, sh.y + 4, '어물전', open ? `$${g.price('fish')}/마리` : null);
  ctx.restore();
}
function drawFurShop(ctx, g, time) {
  const sh = CFG.shops.pelt, open = g.shopOpen('pelt');
  ctx.save(); const sc = popScale(g, 'pelt'); ctx.translate(sh.x, sh.y); ctx.scale(sc, sc); ctx.translate(-sh.x, -sh.y);
  drawStallBase(ctx, g, sh, '#8b5a2b', 1);
  ctx.strokeStyle = '#5b4636'; ctx.lineWidth = 2; for (let i = 0; i < 3; i++) { const hx = sh.x - 40 + i * 40; ctx.beginPath(); ctx.moveTo(hx, sh.y - 90); ctx.lineTo(hx, sh.y - 66); ctx.stroke(); peltBundle(ctx, hx, sh.y - 56, 1); }   // 걸린 모피
  const n = Math.min(g.shops.pelt.stock.pelt, 6);
  for (let i = 0; i < n; i++) peltBundle(ctx, sh.x - 50 + (i % 3) * 50, sh.y - 30 + Math.floor(i / 3) * 10 - 10, 0.9);
  if (open) drawStockPill(ctx, g, 'pelt', sh.x, sh.y - 124); else drawClosed(ctx, sh.x, sh.y);
  drawSign(ctx, sh.x + sh.w / 2 + 28, sh.y + 4, '모피 상점', open ? `$${g.price('pelt')}/장` : null);
  ctx.restore();
}
function peltBundle(ctx, x, y, s) {
  ctx.fillStyle = '#8d6a4a'; ellipse(ctx, x, y, 13 * s, 8 * s);
  ctx.fillStyle = '#a67c52'; ellipse(ctx, x - 2 * s, y - 2 * s, 9 * s, 5 * s);
  ctx.fillStyle = '#f4f9fc'; for (let i = -1; i <= 1; i++) circle(ctx, x + i * 7 * s, y - 6 * s, 2.2 * s);
  ctx.strokeStyle = '#5b4636'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x - 4 * s, y - 8 * s); ctx.lineTo(x - 4 * s, y + 8 * s); ctx.stroke();
}
function drawSlaughterhouse(ctx, g, time) {
  if (!g.lv.slaughter) return;
  const sh = CFG.shops.slaughter, st = g.shops.slaughter.stock, x = sh.x, y = sh.y, w = sh.w, h = 70;
  ctx.save(); const sc = popScale(g, 'slaughter'); ctx.translate(x, y); ctx.scale(sc, sc); ctx.translate(-x, -y);
  shadow(ctx, x, y + 24, w / 2 + 6, 12);
  ctx.fillStyle = '#c9c2b2'; ctx.fillRect(x - w / 2, y - h + 20, w, h);
  ctx.fillStyle = '#b3aa98'; for (let i = 0; i < 5; i++) ctx.fillRect(x - w / 2, y - h + 22 + i * 12, w, 2);
  ctx.fillStyle = '#7b2d26'; ctx.beginPath(); ctx.moveTo(x - w / 2 - 12, y - h + 22); ctx.lineTo(x, y - h - 22); ctx.lineTo(x + w / 2 + 12, y - h + 22); ctx.closePath(); ctx.fill();
  ctx.fillStyle = PAL.treeTop; ctx.beginPath(); ctx.moveTo(x - w / 2 - 4, y - h + 20); ctx.lineTo(x, y - h - 18); ctx.lineTo(x + w / 2 + 4, y - h + 20); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#4a2d12'; rrect(ctx, x - 16, y - 12, 32, 34, 4);
  ctx.fillStyle = '#7f8c8d'; ctx.fillRect(x + w / 2 - 34, y - h - 10, 12, 26);
  for (let i = 0; i < 2; i++) { const k = ((time * 0.5 + i * 0.5) % 1); ctx.fillStyle = `rgba(255,255,255,${0.5 * (1 - k)})`; circle(ctx, x + w / 2 - 28 + Math.sin(k * 6) * 5, y - h - 14 - k * 36, 5 + k * 7); }
  // 대기 순록 우리(건물 왼쪽)
  const penX = x - w / 2 - 44, penY = y + 6;
  ctx.strokeStyle = PAL.wood; ctx.lineWidth = 3; ctx.strokeRect(penX - 26, penY - 30, 52, 36);
  const na = Math.min(st.animal, 3);
  for (let i = 0; i < na; i++) { ctx.fillStyle = '#8d6a4a'; ellipse(ctx, penX - 12 + i * 12, penY - 10, 9, 6); ctx.fillStyle = '#4a2d12'; circle(ctx, penX - 4 + i * 12, penY - 16, 3); }
  pill(ctx, penX, penY - 44, `🦌 ${st.animal}/${g.slaughterAnimalCap}`, st.animal >= g.slaughterAnimalCap ? '#c0392b' : 'rgba(20,30,45,0.75)', '#fff', 'bold 10px system-ui, sans-serif');
  // 도축대(건물 오른쪽 아래)
  const W = sh.work; shadow(ctx, W.x, W.y + 4, 26, 8);
  ctx.fillStyle = PAL.woodDark; ctx.fillRect(W.x - 22, W.y - 6, 5, 14); ctx.fillRect(W.x + 17, W.y - 6, 5, 14);
  ctx.fillStyle = '#d9c7a8'; rrect(ctx, W.x - 26, W.y - 22, 52, 16, 3); ctx.fillStyle = '#c0392b'; rrect(ctx, W.x - 12, W.y - 20, 18, 8, 2);
  ctx.fillStyle = '#9aa7b5'; rrect(ctx, W.x + 8, W.y - 30, 12, 9, 2); ctx.fillStyle = PAL.woodDark; ctx.fillRect(W.x + 18, W.y - 28, 10, 3);   // 칼
  const worker = g.slaughtermen[0] || (g.player.slaughtering ? g.player : null);
  if (worker && worker.proc) bar(ctx, W.x - 22, W.y - 40, 44, 5, worker.proc.t / worker.proc.need, '#ff6b81');
  else if (worker && worker.procWait === 'animal') drawBubble(ctx, W.x, W.y - 36, '🦌 대기 없음');
  else if (worker && worker.procWait === 'full') drawBubble(ctx, W.x, W.y - 36, '보관함 가득');
  // 무두질 건조대(도축대 왼쪽): 기둥 둘 사이에 모피를 걸어 말린다
  if (g.lv.tanning) {
    const R = sh.rack; shadow(ctx, R.x, R.y + 4, 30, 7);
    ctx.fillStyle = '#5b4636'; ctx.fillRect(R.x - 26, R.y - 44, 5, 50); ctx.fillRect(R.x + 21, R.y - 44, 5, 50); ctx.fillRect(R.x - 28, R.y - 46, 56, 4);
    const np = Math.min(st.pelt, 3); for (let i = 0; i < np; i++) peltBundle(ctx, R.x - 14 + i * 14, R.y - 30 + (i % 2) * 3, 0.75);
    if (st.pelt === 0) { ctx.fillStyle = '#a67c52'; ellipse(ctx, R.x, R.y - 34, 10, 5); }
    pill(ctx, R.x, R.y - 60, `🐾 ${st.pelt} · 마리당 +${g.peltPerAnimal}`, 'rgba(20,30,45,0.75)', '#fff', 'bold 10px system-ui, sans-serif');
  }
  label(ctx, W.x, W.y + 18, '도축대', 10, '#fff');
  // 고기 받기 칸
  const pk = sh.pickup;
  ctx.save(); ctx.translate(pk.x, pk.y); ctx.scale(1, 0.72);
  ctx.fillStyle = 'rgba(255,107,129,0.2)'; circle(ctx, 0, 0, pk.r);
  ctx.strokeStyle = '#ff6b81'; ctx.lineWidth = 4; ctx.setLineDash([14, 10]); ctx.lineDashOffset = time * 30; ctx.beginPath(); ctx.arc(0, 0, pk.r, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
  ctx.restore();
  emoji(ctx, pk.x, pk.y - 4, '🥩', 22); label(ctx, pk.x, pk.y + 22, '고기 받기', 11, '#fff');
  const nm = Math.min(st.meat, 6); for (let i = 0; i < nm; i++) meatChunk(ctx, pk.x - 20 + (i % 3) * 20, pk.y - 44 - Math.floor(i / 3) * 10, 0.8);
  pill(ctx, pk.x, pk.y - 66, `🥩 ${st.meat}/${g.shopCap('slaughter')}`, st.meat >= g.shopCap('slaughter') ? '#c0392b' : 'rgba(20,30,45,0.75)', '#fff', 'bold 10px system-ui, sans-serif');
  // 간판
  ctx.fillStyle = '#f5e6c8'; rrect(ctx, x - 50, y - h + 28, 100, 24, 5); ctx.strokeStyle = PAL.woodDark; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(x - 50, y - h + 28, 100, 24, 5); ctx.stroke();
  ctx.fillStyle = PAL.ink; ctx.font = 'bold 12px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(`🔪 도축장 Lv${g.lv.slaughter}`, x, y - h + 40);
  pill(ctx, x, y - h + 6, `마리당 ${Math.round(g.slaughterTime * 10) / 10}초 → 🥩${g.meatPerAnimal}${g.peltPerAnimal ? ' 🐾' + g.peltPerAnimal : ''}`, 'rgba(20,30,45,0.75)', '#fff', 'bold 10px system-ui, sans-serif');
  ctx.restore();
}
function drawMart(ctx, g, time) {
  if (!g.lv.mart) return;
  const sh = CFG.shops.mart, tier = tierOf('mart', g.lv.mart), x = sh.x, y = sh.y, w = sh.w + tier * 20, h = 100 + tier * 14;
  ctx.save(); const sc = popScale(g, 'mart'); ctx.translate(x, y); ctx.scale(sc, sc); ctx.translate(-x, -y);
  shadow(ctx, x, y + 44, w / 2 + 6, 16);
  ctx.fillStyle = tier >= 2 ? '#dfe3e8' : '#e8d9b8'; ctx.fillRect(x - w / 2, y - h + 40, w, h);                 // 벽
  ctx.fillStyle = tier >= 2 ? '#34495e' : '#8b5a2b'; ctx.fillRect(x - w / 2 - 8, y - h + 30, w + 16, 14);            // 지붕 테두리
  ctx.fillStyle = PAL.treeTop; ctx.fillRect(x - w / 2 - 8, y - h + 24, w + 16, 8);
  ctx.fillStyle = '#9ad0ff'; rrect(ctx, x - w / 2 + 14, y - h + 56, w - 28, h - 56 - 26, 6);                           // 유리창
  ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(x - w / 2 + 14, y - h + 56, w - 28, 8);
  // 선반에 진열된 재고
  const st = g.shops.mart.stock, cap = g.shopCap('mart');
  const shelves = [['wood', '🪵'], ['meat', '🥩'], ['fish', '🐟'], ['pelt', '🧥']].concat(g.martCategories().map(c => [c, c === 'furn' ? '🪑' : c === 'rest' ? '🍲' : '🧥']));
  const catCount = c => g.shopGoods(c).reduce((a, gd) => a + st[gd], 0);
  shelves.forEach(([gd, em], i) => { const sx = x - w / 2 + 36 + i * ((w - 72) / Math.max(1, shelves.length - 1)); if (!(gd in st)) { ctx.fillStyle = '#5b4636'; ctx.fillRect(sx - 28, y - 30, 56, 3); ctx.fillRect(sx - 28, y - 52, 56, 3); emoji(ctx, sx, y - 40, em, 16); pill(ctx, sx, y - 14, `${catCount(gd)}`, 'rgba(20,30,45,0.7)', '#fff', 'bold 10px system-ui, sans-serif'); return; } ctx.fillStyle = '#5b4636'; ctx.fillRect(sx - 28, y - 30, 56, 3); ctx.fillRect(sx - 28, y - 52, 56, 3); emoji(ctx, sx, y - 40, em, 16); pill(ctx, sx, y - 14, `${st[gd]}`, st[gd] >= cap ? '#c0392b' : 'rgba(20,30,45,0.7)', '#fff', 'bold 10px system-ui, sans-serif'); });
  // 간판
  ctx.fillStyle = tier >= 2 ? '#e74c3c' : '#f5e6c8'; rrect(ctx, x - 90 - tier * 10, y - h + 2, 180 + tier * 20, 30, 6);
  ctx.fillStyle = tier >= 2 ? '#fff' : PAL.ink; ctx.font = `bold ${15 + tier}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(`🏪 ${TIERS.mart[tier].name}`, x, y - h + 17);
  if (tier >= 2) { ctx.fillStyle = `rgba(255,80,80,${0.25 + Math.sin(time * 4) * 0.15})`; rrect(ctx, x - 96 - tier * 10, y - h - 4, 192 + tier * 20, 42, 10); }
  // 계산대(열린 줄마다)
  for (let i = 0; i < g.martLanes; i++) { const ln = sh.lanes[i]; const cx = ln.x - 40, cy = ln.y - 10; ctx.fillStyle = PAL.woodDark; ctx.fillRect(cx - 18, cy - 8, 36, 16); ctx.fillStyle = PAL.wood; ctx.fillRect(cx - 18, cy - 30, 36, 24); ctx.fillStyle = '#2c3e50'; rrect(ctx, cx - 8, cy - 44, 16, 14, 3); pill(ctx, cx, cy - 56, `계산대 ${i + 1}`, 'rgba(20,30,45,0.7)', '#fff', 'bold 10px system-ui, sans-serif'); }
  pill(ctx, x, y + 46, `총 ${g.shopGoods('mart').reduce((a, gd) => a + st[gd], 0)} / ${cap}개 · 가격 ×${sh.mul} · 계산대 ${g.martLanes}줄`, 'rgba(20,30,45,0.75)');
  ctx.restore();
}
function drawWorkshop(ctx, g, time) {
  if (!g.lv.workshop) return;
  const sh = CFG.shops.furn, tier = tierOf('workshop', g.lv.workshop), x = sh.x, y = sh.y, w = sh.w, h = 80 + tier * 12;
  ctx.save(); const sc = popScale(g, 'furn'); ctx.translate(x, y); ctx.scale(sc, sc); ctx.translate(-x, -y);
  shadow(ctx, x, y + 32, w / 2 + 6, 14);
  ctx.fillStyle = tier >= 2 ? '#a66b3b' : PAL.wood; ctx.fillRect(x - w / 2, y - h + 30, w, h);
  ctx.fillStyle = PAL.woodDark; for (let i = 0; i < Math.floor(h / 12); i++) ctx.fillRect(x - w / 2, y - h + 32 + i * 12, w, 2);
  ctx.fillStyle = '#5b3a1a'; ctx.beginPath(); ctx.moveTo(x - w / 2 - 14, y - h + 32); ctx.lineTo(x, y - h - 30 - tier * 8); ctx.lineTo(x + w / 2 + 14, y - h + 32); ctx.closePath(); ctx.fill();
  ctx.fillStyle = PAL.treeTop; ctx.beginPath(); ctx.moveTo(x - w / 2 - 6, y - h + 30); ctx.lineTo(x, y - h - 26 - tier * 8); ctx.lineTo(x + w / 2 + 6, y - h + 30); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#4a2d12'; rrect(ctx, x - 24, y - 20, 48, 50, 6);   // 큰 문
  ctx.fillStyle = '#ffd27d'; rrect(ctx, x - w / 2 + 16, y - h + 48, 26, 20, 3); rrect(ctx, x + w / 2 - 42, y - h + 48, 26, 20, 3);
  if (tier >= 1) { ctx.fillStyle = '#7f8c8d'; ctx.fillRect(x + w / 2 - 40, y - h - 12, 14, 30); for (let i = 0; i < 2; i++) { const k = ((time * 0.5 + i * 0.5) % 1); ctx.fillStyle = `rgba(255,255,255,${0.5 * (1 - k)})`; circle(ctx, x + w / 2 - 33 + Math.sin(k * 6) * 5, y - h - 16 - k * 36, 5 + k * 7); } }
  if (tier >= 2) { ctx.fillStyle = '#ffd27d'; circle(ctx, x - w / 2 - 6, y - 40, 5); circle(ctx, x + w / 2 + 6, y - 40, 5); ctx.fillStyle = 'rgba(255,210,125,0.15)'; circle(ctx, x - w / 2 - 6, y - 40, 24); circle(ctx, x + w / 2 + 6, y - 40, 24); }
  // 매장: 벽에 걸린 가구와 재고
  const st = g.shops.furn.stock, open = g.shopGoods('furn'), cap = g.shopCap('furn');
  // 매장 진열(건물 오른쪽에 붙은 진열장)
  const dx0 = x + w / 2 + 12;
  ctx.fillStyle = '#5b4636'; ctx.fillRect(dx0, y - 4, 44 * open.length + 8, 6);
  open.forEach((gd, i) => { const gx = dx0 + 26 + i * 44, gy = y - 10; ctx.fillStyle = 'rgba(255,255,255,0.75)'; rrect(ctx, gx - 19, gy - 34, 38, 34, 6); emoji(ctx, gx, gy - 18, CFG.goods[gd].emoji, 20); pill(ctx, gx, gy + 6, `${st[gd]}`, st[gd] >= cap ? '#c0392b' : st[gd] ? 'rgba(20,30,45,0.7)' : 'rgba(120,60,60,0.7)', '#fff', 'bold 10px system-ui, sans-serif'); });
  ctx.fillStyle = '#f5e6c8'; rrect(ctx, x - 70, y - h + 36, 140, 26, 5); ctx.strokeStyle = PAL.woodDark; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(x - 70, y - h + 36, 140, 26, 5); ctx.stroke();
  ctx.fillStyle = PAL.ink; ctx.font = 'bold 13px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(`🔨 ${TIERS.workshop[tier].name}`, x, y - h + 49);
  pill(ctx, x, y - h + 8, `재료 🪵 ${st.wood} / ${sh.matCap}`, st.wood >= sh.matCap ? '#c0392b' : st.wood === 0 ? 'rgba(120,60,60,0.75)' : 'rgba(20,30,45,0.75)');
  drawSign(ctx, x + w / 2 + 22 * open.length + 40, y + 60, '가구 매장', `${open.map(gd => CFG.goods[gd].emoji + '$' + fmtMoney(g.price(gd))).join(' ')}`);
  ctx.restore();
}
function drawBench(ctx, g, b, worker, time, shopId) {
  shadow(ctx, b.x, b.y + 4, 26, 8);
  if (shopId === 'rest') {   // 화덕
    ctx.fillStyle = PAL.stoneDark; rrect(ctx, b.x - 24, b.y - 22, 48, 26, 5); ctx.fillStyle = PAL.stone; rrect(ctx, b.x - 22, b.y - 20, 44, 8, 3);
    ctx.fillStyle = '#2b3442'; ellipse(ctx, b.x, b.y - 26, 16, 6); ctx.fillStyle = '#5b4636'; ellipse(ctx, b.x, b.y - 28, 12, 4);
    for (let i = 0; i < 3; i++) { const h = 8 + Math.sin(time * 9 + i + b.x) * 3; ctx.fillStyle = i === 0 ? '#ff8c42' : i === 1 ? '#ffb347' : '#ffe08a'; tri(ctx, b.x - 10 + i * 4, b.y - 4, b.x + (i - 1) * 4, b.y - 6 - h, b.x + 10 - i * 4, b.y - 4); }
    if (worker && worker.craft) { const k = ((time * 0.7) % 1); ctx.fillStyle = `rgba(255,255,255,${0.5 * (1 - k)})`; circle(ctx, b.x + Math.sin(k * 6) * 4, b.y - 36 - k * 24, 4 + k * 6); }
  } else if (shopId === 'tailor') {   // 재봉대
    ctx.fillStyle = PAL.woodDark; ctx.fillRect(b.x - 22, b.y - 6, 5, 14); ctx.fillRect(b.x + 17, b.y - 6, 5, 14);
    ctx.fillStyle = '#d9c7a8'; rrect(ctx, b.x - 26, b.y - 22, 52, 16, 3);
    ctx.fillStyle = '#2c3e50'; rrect(ctx, b.x - 4, b.y - 38, 22, 16, 4); ctx.fillStyle = '#95a5a6'; ctx.fillRect(b.x + 12, b.y - 30, 3, 10);   // 재봉틀
    ctx.fillStyle = '#8d6a4a'; ellipse(ctx, b.x - 14, b.y - 26, 8, 4);
  } else {
    ctx.fillStyle = PAL.woodDark; ctx.fillRect(b.x - 22, b.y - 6, 5, 14); ctx.fillRect(b.x + 17, b.y - 6, 5, 14);
    ctx.fillStyle = PAL.wood; rrect(ctx, b.x - 26, b.y - 22, 52, 16, 3); ctx.fillStyle = PAL.woodLight; ctx.fillRect(b.x - 24, b.y - 20, 48, 3);
    ctx.fillStyle = '#7f8c8d'; rrect(ctx, b.x + 10, b.y - 30, 12, 9, 2);   // 바이스
  }
  const e = worker;
  if (e && e.craft) { const G = CFG.goods[e.craft.good]; emoji(ctx, b.x - 6, b.y - 44, G.emoji, 16); bar(ctx, b.x - 22, b.y - 58, 44, 5, e.craft.t / e.craft.need, '#f1c40f'); }
  else if (e && e.craftWait === 'full') drawBubble(ctx, b.x, b.y - 48, '진열대 가득');
  else if (e && e.craftWait) drawBubble(ctx, b.x, b.y - 48, `${CFG.goods[e.craftWait] ? CFG.goods[e.craftWait].emoji : ''} 재료 부족`);
}
// 식당·재단소(마트 이후 빈 자리에 들어서는 제작 가게)
function drawCraftHouse(ctx, g, shopId, time) {
  if (!g.shopOpen(shopId)) return;
  const sh = CFG.shops[shopId], lvl = g.lv[sh.upg], tier = tierOf(shopId, lvl), x = sh.x, y = sh.y, w = sh.w, h = 76 + tier * 10;
  const isRest = shopId === 'rest', ST = { rest: { wall: '#e8d9b8', roof: '#b03a2e', band: '#c0392b', emo: '🍲', sign: '식당 메뉴', chimney: true }, tailor: { wall: '#cfc3d9', roof: '#5e3b73', band: '#8e44ad', emo: '🧵', sign: '옷 가게' }, smoke: { wall: '#d9c7a8', roof: '#5b3a1a', band: '#8b5a2b', emo: '🐠', sign: '훈제 가게', chimney: true }, meatproc: { wall: '#e8cfcf', roof: '#7b2d26', band: '#c0392b', emo: '🌭', sign: '육가공 매장' } }[shopId];
  ctx.save(); const sc = popScale(g, shopId); ctx.translate(x, y); ctx.scale(sc, sc); ctx.translate(-x, -y);
  shadow(ctx, x, y + 30, w / 2 + 6, 14);
  ctx.fillStyle = ST.wall; ctx.fillRect(x - w / 2, y - h + 30, w, h);
  ctx.fillStyle = 'rgba(0,0,0,0.08)'; for (let i = 0; i < Math.floor(h / 12); i++) ctx.fillRect(x - w / 2, y - h + 32 + i * 12, w, 2);
  ctx.fillStyle = ST.roof; ctx.beginPath(); ctx.moveTo(x - w / 2 - 12, y - h + 32); ctx.lineTo(x, y - h - 24 - tier * 6); ctx.lineTo(x + w / 2 + 12, y - h + 32); ctx.closePath(); ctx.fill();
  ctx.fillStyle = PAL.treeTop; ctx.beginPath(); ctx.moveTo(x - w / 2 - 4, y - h + 30); ctx.lineTo(x, y - h - 20 - tier * 6); ctx.lineTo(x + w / 2 + 4, y - h + 30); ctx.closePath(); ctx.fill();
  // 천막/간판 띠
  for (let i = 0; i < Math.ceil(w / 24); i++) { ctx.fillStyle = i % 2 ? '#f5f0e6' : ST.band; ctx.fillRect(x - w / 2 + i * 24, y - 6, Math.min(24, w - i * 24), 14); }
  ctx.fillStyle = '#4a2d12'; rrect(ctx, x - 16, y - 2, 32, 32, 4);
  ctx.fillStyle = '#ffd27d'; rrect(ctx, x - w / 2 + 16, y - h + 50, 26, 20, 3); rrect(ctx, x + w / 2 - 42, y - h + 50, 26, 20, 3);
  if (ST.chimney) { ctx.fillStyle = '#7f8c8d'; ctx.fillRect(x + w / 2 - 36, y - h - 8, 14, 30); for (let i = 0; i < 3; i++) { const k = ((time * 0.5 + i * 0.33) % 1); ctx.fillStyle = `rgba(255,255,255,${0.5 * (1 - k)})`; circle(ctx, x + w / 2 - 29 + Math.sin(k * 6 + i) * 6, y - h - 12 - k * 36, 5 + k * 8); } }
  if (tier >= 1) { ctx.fillStyle = '#ffd27d'; circle(ctx, x - w / 2 - 6, y - 30, 5); circle(ctx, x + w / 2 + 6, y - 30, 5); ctx.fillStyle = 'rgba(255,210,125,0.15)'; circle(ctx, x - w / 2 - 6, y - 30, 22); circle(ctx, x + w / 2 + 6, y - 30, 22); }
  // 진열(오른쪽 진열장)
  const st = g.shops[shopId].stock, open = g.shopGoods(shopId), cap = g.shopCap(shopId);
  const dx0 = x + w / 2 + 12;
  ctx.fillStyle = '#5b4636'; ctx.fillRect(dx0, y + 4, 44 * open.length + 8, 6);
  open.forEach((gd, i) => { const gx = dx0 + 26 + i * 44, gy = y - 2; ctx.fillStyle = 'rgba(255,255,255,0.75)'; rrect(ctx, gx - 19, gy - 34, 38, 34, 6); emoji(ctx, gx, gy - 18, CFG.goods[gd].emoji, 20); pill(ctx, gx, gy + 6, `${st[gd]}`, st[gd] >= cap ? '#c0392b' : st[gd] ? 'rgba(20,30,45,0.7)' : 'rgba(120,60,60,0.7)', '#fff', 'bold 10px system-ui, sans-serif'); });
  ctx.fillStyle = '#f5e6c8'; rrect(ctx, x - 70, y - h + 34, 140, 26, 5); ctx.strokeStyle = PAL.woodDark; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(x - 70, y - h + 34, 140, 26, 5); ctx.stroke();
  ctx.fillStyle = PAL.ink; ctx.font = 'bold 13px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(`${ST.emo} ${TIERS[shopId][tier].name} Lv${lvl}`, x, y - h + 47);
  const mats = sh.accepts.map(m => `${CFG.goods[m].emoji} ${st[m]}`).join(' ');
  pill(ctx, x, y - h + 6, `재료 ${mats} / ${sh.matCap}`, sh.accepts.some(m => st[m] >= sh.matCap) ? '#c0392b' : sh.accepts.every(m => st[m] === 0) ? 'rgba(120,60,60,0.75)' : 'rgba(20,30,45,0.75)');
  drawSign(ctx, x + w / 2 + 22 * open.length + 40, y + 70, ST.sign, `${open.map(gd => CFG.goods[gd].emoji + '$' + fmtMoney(g.price(gd))).join(' ')}`);
  ctx.restore();
}
function drawInn(ctx, g, time) {
  if (!g.shopOpen('inn')) return;
  const sh = CFG.shops.inn, x = sh.x, y = sh.y, w = sh.w, floors = 1 + Math.min(6, Math.floor((g.lv.inn - 1) / 4)), h = 60 + floors * 34;
  ctx.save(); const sc = popScale(g, 'inn'); ctx.translate(x, y); ctx.scale(sc, sc); ctx.translate(-x, -y);
  shadow(ctx, x, y + 30, w / 2 + 6, 14);
  ctx.fillStyle = '#e3d5c0'; ctx.fillRect(x - w / 2, y - h + 30, w, h);
  ctx.fillStyle = '#8b5a2b'; for (let f = 0; f < floors; f++) ctx.fillRect(x - w / 2, y - h + 30 + f * 34 + 30, w, 3);
  ctx.fillStyle = '#5b3a1a'; ctx.fillRect(x - w / 2 - 8, y - h + 22, w + 16, 10); ctx.fillStyle = PAL.treeTop; ctx.fillRect(x - w / 2 - 8, y - h + 16, w + 16, 7);
  for (let f = 0; f < floors; f++) for (let i = 0; i < 4; i++) { const occupied = f * 4 + i < g.inn.guests.length; ctx.fillStyle = occupied ? '#ffd27d' : '#9ad0ff'; rrect(ctx, x - w / 2 + 14 + i * 38, y - h + 40 + f * 34, 24, 18, 3); }
  ctx.fillStyle = '#4a2d12'; rrect(ctx, x - 16, y - 2, 32, 32, 4);
  ctx.fillStyle = '#f5e6c8'; rrect(ctx, x - 60, y - h - 2, 120, 24, 5); ctx.strokeStyle = PAL.woodDark; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(x - 60, y - h - 2, 120, 24, 5); ctx.stroke();
  ctx.fillStyle = PAL.ink; ctx.font = 'bold 12px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(`🏨 ${TIERS.inn[tierOf('inn', g.lv.inn)].name} · 객실 ${g.inn.guests.length}/${g.lv.inn}`, x, y - h + 10);
  pill(ctx, x, y + 44, `숙박비 $${g.rent} · ${CFG.shops.inn.stay}초 투숙`, 'rgba(20,30,45,0.75)');
  ctx.restore();
}
function drawDock(ctx, g, time) {
  const D = CFG.ship.dock, R = CFG.river;
  ctx.fillStyle = PAL.woodDark; ctx.fillRect(D.x - 18, R.y + R.h - 30, 36, D.y - R.y - R.h + 20);
  ctx.fillStyle = PAL.wood; ctx.fillRect(D.x - 16, R.y + R.h - 32, 32, D.y - R.y - R.h + 20);
  ctx.fillStyle = PAL.woodDark; for (let yy = R.y + R.h - 26; yy < D.y - 14; yy += 10) ctx.fillRect(D.x - 16, yy, 32, 1.5);
  ctx.fillStyle = '#5b4636'; ctx.fillRect(D.x - 22, D.y - 40, 6, 36); ctx.fillRect(D.x + 16, D.y - 40, 6, 36);
  label(ctx, D.x, D.y - 52, '🚢 무역 부두', 12, '#fff');
  const sp = g.ship;
  if (sp.state === 'docked') { const parts = Object.keys(sp.demand || {}).map(k => `${CFG.goods[k].emoji}${sp.demand[k]}`).join(' '); pill(ctx, D.x, D.y - 70, sp.done ? '계약 완료 · 출항 대기' : `매입 희망 ${parts} · ${Math.ceil(sp.t)}초`, sp.done ? 'rgba(20,30,45,0.75)' : '#c0392b'); }
  else pill(ctx, D.x, D.y - 70, `다음 입항 ${Math.ceil(sp.t)}초`, 'rgba(20,30,45,0.75)');
}
// 무역선: 동쪽으로 떠나 동쪽에서 돌아온다(왼쪽 가두리 위를 지나지 않게)
function drawShip(ctx, g, time) {
  const B = CFG.ship.berth, sp = g.ship, S = CFG.ship;
  let x = B.x;
  if (sp.state === 'away') { const k = 1 - sp.t / S.every; x = k < 0.5 ? B.x + 300 + k * 2 * 1700 : CFG.world.w + 400 - (k - 0.5) * 2 * (CFG.world.w + 400 - B.x) ; if (sp.t > S.every - 1) x = B.x; }
  else if (sp.t > S.stay - 1.5) x = B.x + (S.stay - sp.t) / 1.5 * 0 ;
  const y = B.y + Math.sin(time * 1.5) * 2;
  if (x < -300 || x > CFG.world.w + 300) return;
  ctx.fillStyle = 'rgba(20,40,70,0.25)'; ellipse(ctx, x, y + 22, 80, 10);
  ctx.fillStyle = '#5b3a1a'; ctx.beginPath(); ctx.moveTo(x - 80, y); ctx.lineTo(x + 70, y); ctx.lineTo(x + 90, y - 22); ctx.lineTo(x - 90, y - 22); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#8b5a2b'; ctx.fillRect(x - 80, y - 20, 150, 6);
  ctx.fillStyle = '#d9c7a8'; rrect(ctx, x - 30, y - 50, 60, 28, 4); ctx.fillStyle = '#4a2d12'; rrect(ctx, x - 22, y - 44, 10, 10, 2); rrect(ctx, x + 12, y - 44, 10, 10, 2);
  ctx.fillStyle = PAL.woodDark; ctx.fillRect(x - 2, y - 120, 4, 100);
  ctx.fillStyle = '#f5f0e6'; ctx.beginPath(); ctx.moveTo(x + 2, y - 116); ctx.lineTo(x + 60 + Math.sin(time * 3) * 3, y - 80); ctx.lineTo(x + 2, y - 50); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#e74c3c'; tri(ctx, x - 2, y - 122, x - 20, y - 116, x - 2, y - 110);
  if (sp.state === 'docked') { for (let i = 0; i < 3; i++) { ctx.fillStyle = '#b8862e'; rrect(ctx, x - 70 + i * 26, y - 40, 22, 18, 3); ctx.fillStyle = '#8b5a2b'; ctx.fillRect(x - 70 + i * 26, y - 32, 22, 2); } }
}

function drawDropZone(ctx, g, id, time) {
  const sh = CFG.shops[id], d = sh.drop;
  const acc = g.shopAccepts(id), accepts = (id === 'mart' ? ['wood', 'meat', 'fish', 'pelt'].concat(g.martCategories().map(c => c === 'furn' ? 'chair' : c === 'rest' ? 'stew' : 'coat')) : acc).map(gd => CFG.goods[gd].emoji).join('');
  ctx.save(); ctx.translate(d.x, d.y); ctx.scale(1, 0.72);
  ctx.fillStyle = 'rgba(46,204,113,0.22)'; circle(ctx, 0, 0, d.r);
  ctx.strokeStyle = '#2ecc71'; ctx.lineWidth = 4; ctx.setLineDash([14, 10]); ctx.lineDashOffset = -time * 30;
  ctx.beginPath(); ctx.arc(0, 0, d.r, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
  ctx.restore();
  emoji(ctx, d.x, d.y - 4, accepts, 22);
  label(ctx, d.x, d.y + 22, id === 'furn' ? '재료 내려놓기' : id === 'slaughter' ? '순록 데려오기' : `${sh.name} 내려놓기`, 11, '#fff');
}

// ---- 캠프: 울타리 · 본부 · 감시탑(단계별 외형) ----
function drawHut(ctx, g, time) {
  const x = CFG.hut.x, y = CFG.hut.y, tier = tierOf('hut', g.lv.fence);
  ctx.save(); const sc = popScale(g, 'hut'); ctx.translate(x, y); ctx.scale(sc, sc); ctx.translate(-x, -y);
  const w = 62 + tier * 12, h = 66 + tier * 10, stone = tier >= 2;
  shadow(ctx, x, y + 28, w + 16, 18);
  ctx.fillStyle = stone ? PAL.stone : PAL.wood; ctx.fillRect(x - w, y - h + 26, w * 2, h);
  if (stone) { ctx.fillStyle = PAL.stoneDark; for (let r = 0; r < Math.floor(h / 12); r++) { ctx.fillRect(x - w, y - h + 26 + r * 12, w * 2, 1.5); for (let c = 0; c < Math.ceil(w / 14); c++) ctx.fillRect(x - w + ((r % 2) * 14) + c * 28, y - h + 26 + r * 12, 1.5, 12); } }
  else { ctx.fillStyle = PAL.woodDark; for (let i = 0; i < Math.floor(h / 11); i++) ctx.fillRect(x - w, y - h + 28 + i * 11, w * 2, 2); }
  if (tier >= 3) {   // 요새: 성가퀴와 깃발
    ctx.fillStyle = PAL.stoneDark; for (let i = -w; i < w; i += 16) ctx.fillRect(x + i, y - h + 12, 9, 16);
    ctx.fillStyle = PAL.stone; ctx.fillRect(x - w - 6, y - h + 26, w * 2 + 12, 6);
    for (const fx of [x - w + 6, x + w - 6]) { ctx.fillStyle = PAL.woodDark; ctx.fillRect(fx - 1, y - h - 30, 3, 44); ctx.fillStyle = '#e74c3c'; tri(ctx, fx + 2, y - h - 30, fx + 24 + Math.sin(time * 5) * 2, y - h - 22, fx + 2, y - h - 14); }
  } else {   // 지붕
    ctx.fillStyle = stone ? '#5d6d7e' : '#5b3a1a'; tri(ctx, x - w - 14, y - h + 30, x, y - h - 34, x + w + 14, y - h + 30);
    ctx.fillStyle = PAL.treeTop; tri(ctx, x - w - 8, y - h + 26, x, y - h - 32, x + w + 8, y - h + 26);
    ctx.fillStyle = stone ? '#4a5968' : '#6b4423'; ctx.beginPath(); ctx.moveTo(x - w - 8, y - h + 26); ctx.lineTo(x - w * 0.45, y - h + 6); ctx.lineTo(x + w * 0.45, y - h + 6); ctx.lineTo(x + w + 8, y - h + 26); ctx.closePath(); ctx.fill();
    ctx.fillStyle = PAL.treeTop; tri(ctx, x - w * 0.6, y - h + 10, x, y - h - 26, x + w * 0.6, y - h + 10);
  }
  ctx.fillStyle = '#7f8c8d'; ctx.fillRect(x + w * 0.55, y - h - 26, 14, 26);
  for (let i = 0; i < 3; i++) { const k = ((time * 0.5 + i * 0.33) % 1); ctx.fillStyle = `rgba(255,255,255,${0.6 * (1 - k)})`; circle(ctx, x + w * 0.55 + 7 + Math.sin(k * 6 + i) * 6, y - h - 30 - k * 40, 5 + k * 8); }
  ctx.fillStyle = '#4a2d12'; rrect(ctx, x - 14, y - 10, 28, 36, 4);
  if (tier >= 3) { ctx.fillStyle = '#4a2d12'; rrect(ctx, x - 20, y - 16, 40, 42, 6); ctx.fillStyle = '#6a4119'; ctx.fillRect(x - 20, y - 16, 40, 2); ctx.fillRect(x - 20, y, 40, 2); }
  ctx.fillStyle = '#ffd27d'; rrect(ctx, x + 26, y - 30, 22, 18, 3); rrect(ctx, x - 48, y - 30, 22, 18, 3);
  if (tier >= 1) { ctx.fillStyle = '#ffd27d'; rrect(ctx, x + 26, y - h + 44, 22, 14, 3); rrect(ctx, x - 48, y - h + 44, 22, 14, 3); }
  ctx.fillStyle = '#4a2d12'; ctx.fillRect(x + 36, y - 30, 2, 18); ctx.fillRect(x + 26, y - 22, 22, 2); ctx.fillRect(x - 38, y - 30, 2, 18); ctx.fillRect(x - 48, y - 22, 22, 2);
  if (tier >= 1) { ctx.fillStyle = PAL.woodDark; ctx.fillRect(x - w - 10, y + 20, w * 2 + 20, 6); for (let i = -w - 8; i < w + 8; i += 20) ctx.fillRect(x + i, y + 8, 4, 14); }   // 툇마루
  label(ctx, x, y - h - 50, `🏠 본부 · ${TIERS.hut[tier].name}`, 13, '#fff');
  if (g.hut.hp < g.hut.maxhp) bar(ctx, x - 50, y - h - 68, 100, 7, g.hut.hp / g.hut.maxhp, g.hut.hp / g.hut.maxhp < 0.35 ? '#e74c3c' : '#f39c12');
  ctx.restore();
}
// ---- 목장 ----
function drawReindeer(ctx, a, time) {
  const sc = 0.75 + a.grow * 0.35, ready = a.grow >= 1;
  shadow(ctx, a.x, a.y + 2, 20 * sc, 7 * sc);
  if (typeof Sprites !== 'undefined' && Sprites.draw(ctx, 'reindeer', a.moving ? 'walk' : 'idle', a.anim || 0, time, a.x, a.y, a.facing, sc)) { /* 스프라이트 */ }
  else {
    ctx.save(); ctx.translate(a.x, a.y); if (a.facing < 0) ctx.scale(-1, 1); ctx.scale(sc, sc);
    const bob = a.moving ? Math.abs(Math.sin(a.anim)) * 2 : 0, lg = a.moving ? Math.sin(a.anim) * 3 : 0;
    const parts = [];
    for (const [lx, ph] of [[-16, 0], [-6, 1], [6, 0], [13, 1]]) parts.push({ path: capPath(lx, -15 + (ph ? -lg : lg) * 0.3, 6, 16), fill: '#6d4c33' });
    parts.push({ path: ellPath(0, -20 - bob, 21, 11.5), fill: shade(ctx, '#8d6a4a', 0, -22 - bob, 18) });
    parts.push({ path: ctx => ctx.roundRect(12, -41 - bob, 11, 23, 5), fill: shade(ctx, '#8d6a4a', 17, -36 - bob, 10) });
    parts.push({ path: ellPath(19, -40 - bob, 9.5, 7.5), fill: shade(ctx, '#8d6a4a', 19, -42 - bob, 9) });
    drawParts(ctx, parts);
    ctx.fillStyle = '#e8d9b8'; ellipse(ctx, -4, -14 - bob, 10, 5);
    ctx.fillStyle = '#4a2d12'; circle(ctx, 27, -38 - bob, 2.5); ctx.fillStyle = '#222'; circle(ctx, 20, -42 - bob, 1.8); ctx.fillStyle = '#fff'; circle(ctx, 20.6, -42.6 - bob, 0.6);
    ctx.strokeStyle = '#d9c7a8'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(16, -46 - bob); ctx.lineTo(12, -58 - bob); ctx.moveTo(13, -53 - bob); ctx.lineTo(7, -56 - bob); ctx.moveTo(22, -46 - bob); ctx.lineTo(26, -58 - bob); ctx.moveTo(25, -53 - bob); ctx.lineTo(31, -56 - bob); ctx.stroke();
    ctx.fillStyle = '#c0392b'; circle(ctx, 28, -36 - bob, 1.8);
    ctx.restore();
  }
  if (a.led) return;
  if (ready) { const k = Math.sin(time * 4 + a.i) * 2; drawBubble(ctx, a.x, a.y - 66 + k, '🦌 출하'); }
  else bar(ctx, a.x - 14, a.y - 60 * sc, 28, 3, a.grow, '#7CFC9A');
  if (a.harvestT > 0) bar(ctx, a.x - 14, a.y - 66 * sc, 28, 4, a.harvestT / CFG.ranch.harvestTime, '#ffd166');
}
function drawRanch(ctx, g, items, vis, time) {
  if (!g.lv.ranch) return;
  const R = CFG.ranch.rect, B = CFG.ranch.barn, tier = tierOf('ranch', g.lv.ranch);
  // 울타리(문은 왼쪽 아래)
  for (let x = R.x; x < R.x + R.w; x += 40) { if (vis(x, R.y, 60)) items.push({ y: R.y, f: () => drawDecorFence(ctx, x, R.y, Math.min(x + 40, R.x + R.w), R.y) }); if (vis(x, R.y + R.h, 60)) items.push({ y: R.y + R.h, f: () => drawDecorFence(ctx, x, R.y + R.h, Math.min(x + 40, R.x + R.w), R.y + R.h) }); }
  for (let y = R.y; y < R.y + R.h; y += 40) { if (y < R.y + R.h - 100 || y > R.y + R.h - 20) { if (vis(R.x, y, 60)) items.push({ y: y + 40, f: () => drawDecorFence(ctx, R.x, y + 40, R.x, y) }); } if (vis(R.x + R.w, y, 60)) items.push({ y: y + 40, f: () => drawDecorFence(ctx, R.x + R.w, y + 40, R.x + R.w, y) }); }
  // 축사
  items.push({ y: B.y + 20, f: () => {
    ctx.save(); const sc = popScale(g, 'ranch'); ctx.translate(B.x, B.y); ctx.scale(sc, sc); ctx.translate(-B.x, -B.y);
    const w = 44 + tier * 12, h = 46 + tier * 10;
    shadow(ctx, B.x, B.y + 22, w + 8, 12);
    ctx.fillStyle = tier >= 2 ? '#b03a2e' : '#a04a3a'; ctx.fillRect(B.x - w, B.y - h + 20, w * 2, h);
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; for (let i = 0; i < 4; i++) ctx.fillRect(B.x - w, B.y - h + 24 + i * 11, w * 2, 2);
    ctx.fillStyle = '#5b3a1a'; ctx.beginPath(); ctx.moveTo(B.x - w - 10, B.y - h + 22); ctx.lineTo(B.x, B.y - h - 18 - tier * 4); ctx.lineTo(B.x + w + 10, B.y - h + 22); ctx.closePath(); ctx.fill();
    ctx.fillStyle = PAL.treeTop; ctx.beginPath(); ctx.moveTo(B.x - w - 4, B.y - h + 20); ctx.lineTo(B.x, B.y - h - 14 - tier * 4); ctx.lineTo(B.x + w + 4, B.y - h + 20); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#4a2d12'; rrect(ctx, B.x - 14, B.y - 8, 28, 30, 4); ctx.fillStyle = '#d9c7a8'; ctx.fillRect(B.x - 14, B.y - 8, 28, 2); ctx.fillRect(B.x - 1, B.y - 8, 2, 30);
    if (tier >= 1) { ctx.fillStyle = '#f5e6c8'; circle(ctx, B.x, B.y - h + 8, 8); ctx.fillStyle = '#4a2d12'; ctx.fillRect(B.x - 1, B.y - h + 8, 2, 7); ctx.fillRect(B.x - 5, B.y - h + 2, 10, 2); }   // 둥근 창
    if (tier >= 2) { ctx.fillStyle = '#7f8c8d'; ctx.fillRect(B.x + w - 20, B.y - h - 10, 10, 24); }
    ctx.fillStyle = '#f5e6c8'; rrect(ctx, B.x - 56, B.y - h - 34 - tier * 4, 112, 22, 5); ctx.strokeStyle = PAL.woodDark; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(B.x - 56, B.y - h - 34 - tier * 4, 112, 22, 5); ctx.stroke();
    ctx.fillStyle = PAL.ink; ctx.font = 'bold 12px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(`🦌 ${TIERS.ranch[tier].name} Lv${g.lv.ranch}`, B.x, B.y - h - 23 - tier * 4);
    ctx.restore();
    pill(ctx, B.x, B.y + 36, `순록 ${g.animals.length}마리 · 출하 ${g.animals.filter(a => a.grow >= 1).length} · 마리당 🥩${g.meatPerAnimal} · ${Math.round(g.growTime)}초`, 'rgba(20,30,45,0.75)');
  } });
  for (const hy of CFG.ranch.hay) items.push({ y: hy.y, f: () => { shadow(ctx, hy.x, hy.y + 2, 16, 6); ctx.fillStyle = '#d4b24c'; rrect(ctx, hy.x - 16, hy.y - 22, 32, 24, 5); ctx.fillStyle = '#b8962e'; ctx.fillRect(hy.x - 16, hy.y - 14, 32, 2); ctx.fillRect(hy.x - 16, hy.y - 6, 32, 2); ctx.fillStyle = PAL.treeTop; rrect(ctx, hy.x - 16, hy.y - 24, 32, 5, 3); } });
  const T = CFG.ranch.trough; items.push({ y: T.y, f: () => { shadow(ctx, T.x, T.y + 2, 24, 6); ctx.fillStyle = PAL.woodDark; rrect(ctx, T.x - 24, T.y - 14, 48, 16, 3); ctx.fillStyle = '#5aa9e6'; rrect(ctx, T.x - 21, T.y - 12, 42, 6, 2); } });
  for (const a of g.animals) if (vis(a.x, a.y, 70)) items.push({ y: a.y, f: () => drawReindeer(ctx, a, time) });
  for (const r of g.ranchers) if (vis(r.x, r.y, 80)) items.push({ y: r.y, f: () => drawPerson(ctx, r, { sprite: 'rancher', coat: '#27ae60', pants: '#2b3a55', hat: '#d4b24c', hatBand: '#8b5a2b', pom: '#d4b24c' }, g) });
}
// 의무소: 흰 오두막에 빨간 십자
function drawInfirmary(ctx, g, time) {
  const I = CFG.infirmary, x = I.x, y = I.y, w = 80, h = 50;
  shadow(ctx, x, y + 18, w / 2 + 4, 10);
  ctx.fillStyle = '#f4f6f8'; ctx.fillRect(x - w / 2, y - h + 20, w, h);
  ctx.fillStyle = '#c0392b'; ctx.beginPath(); ctx.moveTo(x - w / 2 - 8, y - h + 22); ctx.lineTo(x, y - h - 14); ctx.lineTo(x + w / 2 + 8, y - h + 22); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#e74c3c'; ctx.fillRect(x - 4, y - h + 30, 8, 24); ctx.fillRect(x - 12, y - h + 38, 24, 8);
  ctx.fillStyle = '#5b4636'; rrect(ctx, x + 18, y - 4, 14, 24, 3);
  label(ctx, x, y + 32, `🏥 의무소 · 의무병 ${g.medics.length}`, 10, '#fff');
}
// 급식소: 긴 식탁과 솥, 식량 창고 수량
function drawMess(ctx, g, time) {
  const M = CFG.mess, x = M.x, y = M.y, st = g.shops.pantry.stock, total = st.meat + st.fish;
  shadow(ctx, x, y + 14, 56, 10);
  ctx.fillStyle = PAL.woodDark; ctx.fillRect(x - 46, y - 8, 6, 22); ctx.fillRect(x + 40, y - 8, 6, 22);
  ctx.fillStyle = '#d9c7a8'; rrect(ctx, x - 52, y - 20, 104, 14, 3);
  ctx.fillStyle = '#2b3442'; ellipse(ctx, x - 22, y - 26, 13, 8); ctx.fillStyle = '#c0392b'; ellipse(ctx, x - 22, y - 28, 9, 4);
  for (let i = 0; i < 2; i++) { const k = ((time * 0.6 + i * 0.5) % 1); ctx.fillStyle = `rgba(255,255,255,${0.5 * (1 - k)})`; circle(ctx, x - 22 + Math.sin(k * 6) * 4, y - 34 - k * 26, 4 + k * 5); }
  const nm = Math.min(st.meat, 3), nf = Math.min(st.fish, 3);
  for (let i = 0; i < nm; i++) meatChunk(ctx, x + 4 + i * 14, y - 26, 0.7);
  for (let i = 0; i < nf; i++) fishShape(ctx, x + 4 + i * 14, y - 36, 0.6);
  const fedTxt = g.fed >= 0.5 ? '😋 배부름 +15%' : '😣 굶주림 −20%';
  pill(ctx, x, y - 56, `🍲 ${total}/${M.cap} · ${fedTxt}`, g.fed >= 0.5 ? 'rgba(20,30,45,0.75)' : '#c0392b', '#fff', 'bold 10px system-ui, sans-serif');
  label(ctx, x, y + 26, '급식소', 10, '#fff');
}
// 동쪽 벌판 팻말
function drawEastSign(ctx, g, time) {
  const E = CFG.east, x = E.x + 60, y = E.road.y - 40;
  shadow(ctx, x, y + 2, 14, 5);
  ctx.fillStyle = PAL.woodDark; ctx.fillRect(x - 3, y - 50, 6, 52);
  ctx.fillStyle = PAL.wood; rrect(ctx, x - 44, y - 62, 88, 22, 4);
  ctx.fillStyle = PAL.ink; ctx.font = 'bold 12px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(`🧭 ${E.name}`, x, y - 51);
}
function drawTownhall(ctx, g, time) {
  if (!g.lv.townhall) return;
  const x = TOWNHALL.x, y = TOWNHALL.y, tier = tierOf('village', g.lv.townhall), w = 80 + tier * 10, h = 70 + tier * 12;
  ctx.save(); const sc = popScale(g, 'townhall'); ctx.translate(x, y); ctx.scale(sc, sc); ctx.translate(-x, -y);
  shadow(ctx, x, y + 30, w + 10, 16);
  ctx.fillStyle = tier >= 3 ? '#e6e2d8' : '#d9c7a8'; ctx.fillRect(x - w, y - h + 30, w * 2, h);
  ctx.fillStyle = tier >= 3 ? '#b9b3a6' : '#a68b5b'; for (let i = 0; i < 4; i++) ctx.fillRect(x - w + 10 + i * ((w * 2 - 20) / 3) - 4, y - h + 30, 8, h);   // 기둥
  ctx.fillStyle = '#5b3a1a'; tri(ctx, x - w - 14, y - h + 32, x, y - h - 20, x + w + 14, y - h + 32);
  ctx.fillStyle = PAL.treeTop; tri(ctx, x - w - 6, y - h + 30, x, y - h - 16, x + w + 6, y - h + 30);
  ctx.fillStyle = '#4a2d12'; rrect(ctx, x - 16, y - 12, 32, 42, 5);
  ctx.fillStyle = '#ffd27d'; rrect(ctx, x - w + 16, y - h + 48, 20, 16, 3); rrect(ctx, x + w - 36, y - h + 48, 20, 16, 3);
  if (tier >= 2) { ctx.fillStyle = '#a68b5b'; ctx.fillRect(x - 12, y - h - 46, 24, 30); ctx.fillStyle = '#5b3a1a'; tri(ctx, x - 18, y - h - 44, x, y - h - 62, x + 18, y - h - 44); ctx.fillStyle = '#f1c40f'; circle(ctx, x, y - h - 32, 5); }   // 종탑
  if (tier >= 4) { ctx.fillStyle = '#3b6fd1'; tri(ctx, x + 2, y - h - 64, x + 22, y - h - 58, x + 2, y - h - 52); ctx.fillStyle = PAL.woodDark; ctx.fillRect(x, y - h - 66, 2, 20); }
  ctx.fillStyle = '#f5e6c8'; rrect(ctx, x - 60, y - h + 2, 120, 24, 5); ctx.strokeStyle = PAL.woodDark; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(x - 60, y - h + 2, 120, 24, 5); ctx.stroke();
  ctx.fillStyle = PAL.ink; ctx.font = 'bold 12px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(`🏛️ ${TIERS.village[tier].name} 회관 Lv${g.lv.townhall}`, x, y - h + 14);
  pill(ctx, x, y + 44, `효율 ×${g.effMul.toFixed(2)} · 가격 +${5 * g.lv.townhall}%`, 'rgba(20,30,45,0.75)');
  ctx.restore();
}
function drawBeacon(ctx, g, time) {
  if (!g.lv.beacon) return;
  const x = BEACON.x, y = BEACON.y, lit = g.wave.warned || g.wave.active;
  ctx.save(); const sc = popScale(g, 'beacon'); ctx.translate(x, y); ctx.scale(sc, sc); ctx.translate(-x, -y);
  shadow(ctx, x, y + 3, 22, 8);
  ctx.fillStyle = PAL.stone; ctx.fillRect(x - 16, y - 70, 32, 70); ctx.fillStyle = PAL.stoneDark; for (let r = 0; r < 7; r++) ctx.fillRect(x - 16, y - 70 + r * 10, 32, 1.5);
  ctx.fillStyle = PAL.woodDark; ctx.fillRect(x - 22, y - 78, 44, 8);
  ctx.fillStyle = '#4a2d12'; rrect(ctx, x - 18, y - 96, 36, 18, 4);
  if (lit) { for (let i = 0; i < 3; i++) { const h = 30 + Math.sin(time * 9 + i) * 6; ctx.fillStyle = i === 0 ? '#ff8c42' : i === 1 ? '#ffb347' : '#ffe08a'; tri(ctx, x - 14 + i * 4, y - 94, x + (i - 1) * 5, y - 94 - h - i * 6, x + 14 - i * 4, y - 94); } ctx.fillStyle = 'rgba(255,170,60,0.18)'; circle(ctx, x, y - 110, 60); for (let i = 0; i < 3; i++) { const k = ((time * 0.6 + i * 0.33) % 1); ctx.fillStyle = `rgba(90,90,90,${0.5 * (1 - k)})`; circle(ctx, x + Math.sin(k * 5 + i) * 8, y - 130 - k * 60, 6 + k * 12); } }
  else { ctx.fillStyle = PAL.woodDark; rrect(ctx, x - 10, y - 104, 20, 8, 3); }
  pill(ctx, x, y - 150, `🔥 봉화대 Lv${g.lv.beacon} · 경고 ${g.warnTime}초`, 'rgba(20,30,45,0.75)');
  ctx.restore();
}
function drawMilitiaPost(ctx, p) {
  ctx.fillStyle = PAL.woodDark; ctx.fillRect(p.x - 2, p.y - 40, 4, 40); ctx.fillStyle = '#c0392b'; tri(ctx, p.x + 2, p.y - 40, p.x + 18, p.y - 34, p.x + 2, p.y - 28);
  ctx.fillStyle = 'rgba(60,80,110,0.25)'; ellipse(ctx, p.x, p.y + 2, 10, 4);
}
function drawCampfire(ctx, time) {
  const x = CFG.hut.x, y = CFG.hut.y + 80;
  shadow(ctx, x, y + 2, 20, 8);
  ctx.fillStyle = PAL.woodDark; ctx.save(); ctx.translate(x, y); ctx.rotate(0.5); rrect(ctx, -16, -3, 32, 6, 3); ctx.rotate(-1); rrect(ctx, -16, -3, 32, 6, 3); ctx.restore();
  for (let i = 0; i < 3; i++) { const h = 18 + Math.sin(time * 9 + i) * 4; ctx.fillStyle = i === 0 ? '#ff8c42' : i === 1 ? '#ffb347' : '#ffe08a'; tri(ctx, x - 9 + i * 3, y - 2, x + (i - 1) * 4, y - h - i * 5, x + 9 - i * 3, y - 2); }
  ctx.fillStyle = 'rgba(255,170,60,0.12)'; circle(ctx, x, y - 6, 40);
}
function drawBrokenTower(ctx, g, time, site, idx) {   // 부서진 탑: 밑동과 잔해, 연기
  const x = site.x, y = site.y, tier = tierOf('tower', g.lv.tower), stone = tier >= 2;
  shadow(ctx, x, y + 4, 30, 10);
  ctx.fillStyle = stone ? PAL.stoneDark : PAL.woodDark;
  ctx.beginPath(); ctx.moveTo(x - 24, y + 2); ctx.lineTo(x - 20, y - 30); ctx.lineTo(x - 6, y - 22); ctx.lineTo(x + 4, y - 38); ctx.lineTo(x + 14, y - 18); ctx.lineTo(x + 24, y - 26); ctx.lineTo(x + 26, y + 2); ctx.closePath(); ctx.fill();
  ctx.fillStyle = stone ? PAL.stone : PAL.wood; ctx.fillRect(x - 18, y - 16, 34, 16);
  for (let i = 0; i < 4; i++) { ctx.fillStyle = stone ? PAL.stoneDark : PAL.woodDark; rrect(ctx, x - 44 + i * 24 + Math.sin(i * 3) * 4, y - 4 + (i % 2) * 6, 14, 7, 2); }
  for (let i = 0; i < 3; i++) { const k = ((time * 0.5 + i * 0.33) % 1); ctx.fillStyle = `rgba(90,90,100,${0.45 * (1 - k)})`; circle(ctx, x - 4 + Math.sin(time * 1.3 + i) * 8, y - 36 - k * 46, 7 + k * 9); }
  label(ctx, x, y - 96, `🔧 ${idx + 1}호 탑 부서짐`, 11, '#ff8a80');
}
function drawTower(ctx, g, time, site, idx) {
  if (!g.lv.tower) return;
  if (!g.towerAlive(idx)) return drawBrokenTower(ctx, g, time, site, idx);
  const x = site.x, y = site.y, tier = tierOf('tower', g.lv.tower), H = 78 + Math.min(2, tier) * 20, D = TIERS.tower[tier];
  ctx.save(); const sc = popScale(g, 'tower'); ctx.translate(x, y); ctx.scale(sc, sc); ctx.translate(-x, -y);
  shadow(ctx, x, y + 4, 28 + tier * 4, 10);
  if (tier >= 2) {   // 석탑
    ctx.fillStyle = PAL.stone; ctx.fillRect(x - 26, y - H, 52, H);
    ctx.fillStyle = PAL.stoneDark; for (let r = 0; r < Math.floor(H / 12); r++) { ctx.fillRect(x - 26, y - H + r * 12, 52, 1.5); ctx.fillRect(x - 26 + (r % 2) * 13, y - H + r * 12, 1.5, 12); ctx.fillRect(x + (r % 2) * 13, y - H + r * 12, 1.5, 12); }
    ctx.fillStyle = PAL.stoneDark; for (let i = -30; i < 30; i += 12) ctx.fillRect(x + i, y - H - 14, 7, 14);
    ctx.fillStyle = PAL.stoneLight; ctx.fillRect(x - 32, y - H - 2, 64, 6);
    ctx.fillStyle = '#2b3442'; rrect(ctx, x - 5, y - H + 20, 10, 18, 4); rrect(ctx, x - 5, y - H + 50, 10, 18, 4);
  } else {
    ctx.strokeStyle = PAL.woodDark; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x - 22, y); ctx.lineTo(x - 13, y - H); ctx.moveTo(x + 22, y); ctx.lineTo(x + 13, y - H); ctx.stroke();
    ctx.lineWidth = 3; for (let k = 26; k < H; k += 26) { ctx.beginPath(); ctx.moveTo(x - 19, y - k); ctx.lineTo(x + 19, y - k); ctx.stroke(); }
    if (tier >= 1) { ctx.fillStyle = PAL.wood; ctx.fillRect(x - 20, y - H + 20, 40, H - 20); ctx.fillStyle = PAL.woodDark; for (let i = 0; i < Math.floor((H - 20) / 10); i++) ctx.fillRect(x - 20, y - H + 22 + i * 10, 40, 1.5); }
    ctx.fillStyle = PAL.wood; rrect(ctx, x - 26, y - H - 8, 52, 12, 3);
    ctx.fillStyle = PAL.woodLight; ctx.fillRect(x - 24, y - H - 22, 3, 14); ctx.fillRect(x + 21, y - H - 22, 3, 14); ctx.fillRect(x - 24, y - H - 22, 48, 2.5);
    ctx.fillStyle = '#5b3a1a'; tri(ctx, x - 32, y - H - 34, x, y - H - 58, x + 32, y - H - 34);
    ctx.fillStyle = PAL.treeTop; tri(ctx, x - 26, y - H - 36, x, y - H - 56, x + 26, y - H - 36);
  }
  const top = y - H - (tier >= 2 ? 16 : 30);
  if (tier >= 3) {   // 쇠뇌·대포·소총·기관총: 탑 위 무기
    const fire = (g.towerTs && g.towerTs[idx] != null && g.towerTs[idx] > CFG.tower.cd * D.cd - 0.1);
    if (D.shot === 'bolt') { ctx.strokeStyle = '#5b4636'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x - 24, top - 14); ctx.quadraticCurveTo(x, top - 4, x + 24, top - 14); ctx.stroke(); ctx.fillStyle = PAL.woodDark; rrect(ctx, x - 3, top - 26, 6, 30, 2); ctx.fillStyle = '#9aa7b5'; tri(ctx, x - 4, top - 26, x, top - 36, x + 4, top - 26); }
    else if (D.shot === 'cannon') { ctx.fillStyle = '#2b3442'; rrect(ctx, x - 12, top - 14, 34, 12, 5); ctx.fillStyle = '#5b4636'; circle(ctx, x - 8, top - 2, 7); circle(ctx, x + 10, top - 2, 7); ctx.fillStyle = '#111'; circle(ctx, x + 22, top - 8, 4.5); if (fire) { ctx.fillStyle = 'rgba(255,200,80,0.8)'; circle(ctx, x + 30, top - 8, 9); } }
    else if (D.shot === 'bullet') { for (let i = 0; i < 2; i++) { const ax = x - 12 + i * 24; ctx.fillStyle = '#34495e'; rrect(ctx, ax - 6, top - 2, 12, 13, 4); ctx.fillStyle = '#f1c9a5'; circle(ctx, ax, top - 7, 5); ctx.fillStyle = '#b87333'; rrect(ctx, ax - 2, top - 26, 4, 26, 1); ctx.fillStyle = '#5b4636'; rrect(ctx, ax - 3, top - 8, 6, 10, 1); } ctx.fillStyle = '#c9a47a'; rrect(ctx, x - 30, top + 4, 60, 8, 4); if (fire) { ctx.fillStyle = 'rgba(255,230,120,0.9)'; circle(ctx, x + 12, top - 28, 5); } }
    else { ctx.fillStyle = '#7f8c8d'; rrect(ctx, x - 16, top - 6, 32, 12, 4); ctx.fillStyle = '#2b3442'; rrect(ctx, x - 6, top - 24, 12, 20, 3); ctx.fillStyle = '#111'; rrect(ctx, x - 2, top - 44, 5, 24, 1); ctx.fillStyle = '#b8862e'; rrect(ctx, x - 22, top - 14, 10, 12, 2); ctx.fillStyle = '#2c3e50'; rrect(ctx, x + 10, top - 4, 12, 13, 4); ctx.fillStyle = '#f1c9a5'; circle(ctx, x + 16, top - 9, 5); if (fire) { ctx.fillStyle = 'rgba(255,230,120,0.9)'; circle(ctx, x + 1, top - 48, 6 + Math.random() * 3); } }
    if (D.color) { ctx.fillStyle = D.color + '66'; circle(ctx, x, top - 24, 16); ctx.fillStyle = D.color; circle(ctx, x, top - 24, 4); }   // 재질 빛
  } else
  // 궁수(단계마다 한 명씩)
  for (let i = 0; i < 1 + tier; i++) { const ax = x - 10 * tier + i * 20; ctx.fillStyle = '#2c3e50'; rrect(ctx, ax - 6, top - 2, 12, 13, 4); ctx.fillStyle = '#f1c9a5'; circle(ctx, ax, top - 7, 5); ctx.strokeStyle = '#5b4636'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(ax + 8, top - 4, 8, -1.2, 1.2); ctx.stroke(); }
  ctx.fillStyle = '#e74c3c'; tri(ctx, x + 28, top - 40, x + 46 + Math.sin(time * 5) * 2, top - 33, x + 28, top - 26);
  ctx.fillStyle = PAL.woodDark; ctx.fillRect(x + 27, top - 42, 2, 30);
  if (idx === 0) pill(ctx, x, top - 54, `${D.shot === 'cannon' ? '💣' : D.shot === 'bullet' || D.shot === 'mg' ? '🔫' : '🏹'} ${D.name} Lv${g.lv.tower} · ${D.shot === 'cannon' ? '포탄' : D.shot === 'bolt' ? '쇠뇌' : D.shot === 'bullet' || D.shot === 'mg' ? '탄' : '화살'} ${g.towerArrows}발`, 'rgba(20,30,45,0.75)');
  else label(ctx, x, top - 50, `${idx + 1}호`, 10, '#fff');   // 다른 탑은 작은 번호만(글자 가림 줄이기)
  const tm = g.towerMax(g.lv.tower), thp = g.towerHp[idx];
  if (thp < tm - 0.5) bar(ctx, x - 22, y + 8, 44, 5, thp / tm, thp / tm < 0.35 ? '#e74c3c' : '#2ecc71');   // 내구도(상했을 때만)
  ctx.restore();
}

// 캠프 울타리: 둘레를 따라 세우고, 내구도가 깎이면 뒤쪽부터 부서진다
const FENCE_SEGS = (() => {
  const C = CFG.camp, step = 40, segs = [];
  const pts = [];
  for (let x = C.x; x < C.x + C.w; x += step) pts.push([x, C.y, x + step, C.y]);
  for (let y = C.y; y < C.y + C.h; y += step) pts.push([C.x + C.w, y, C.x + C.w, y + step]);
  for (let x = C.x + C.w; x > C.x; x -= step) pts.push([x, C.y + C.h, x - step, C.y + C.h]);
  for (let y = C.y + C.h; y > C.y; y -= step) pts.push([C.x, y, C.x, y - step]);
  let seed = 3; const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  pts.forEach(p => segs.push({ x1: p[0], y1: p[1], x2: p[2], y2: p[3], order: r(), gate: p[1] === C.y + C.h && p[3] === C.y + C.h && Math.min(p[0], p[2]) >= C.x + C.w / 2 - 40 && Math.max(p[0], p[2]) <= C.x + C.w / 2 + 40 }));
  const sorted = segs.slice().sort((a, b) => a.order - b.order);
  sorted.forEach((s, i) => (s.rank = i / segs.length));
  return segs;
})();
function drawFenceSeg(ctx, s, k, broken, tier, g) {
  const vertical = Math.abs(s.x2 - s.x1) < 1;
  const x1 = Math.min(s.x1, s.x2), x2 = Math.max(s.x1, s.x2), y = Math.max(s.y1, s.y2);
  if (broken) {
    if (tier >= 2) { ctx.fillStyle = PAL.stoneDark; ellipse(ctx, (s.x1 + s.x2) / 2, (s.y1 + s.y2) / 2 - 2, 14, 7); ctx.fillStyle = PAL.stone; ellipse(ctx, (s.x1 + s.x2) / 2 - 6, (s.y1 + s.y2) / 2 - 8, 8, 5); }
    else { ctx.save(); ctx.translate(s.x1, s.y1); ctx.rotate(0.6); ctx.fillStyle = PAL.woodDark; rrect(ctx, -3, -14, 6, 16, 2); ctx.restore(); ctx.fillStyle = PAL.woodDark; rrect(ctx, (s.x1 + s.x2) / 2 - 10, (s.y1 + s.y2) / 2 - 2, 20, 4, 2); }
    return;
  }
  const dark = k < 0.4;
  if (tier === 0) {   // 나무 울타리
    ctx.strokeStyle = dark ? '#5d3d1c' : vertical ? PAL.woodLight : PAL.wood; ctx.lineWidth = vertical ? 2.5 : 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(s.x1, s.y1 - 22); ctx.lineTo(s.x2, s.y2 - 22); ctx.moveTo(s.x1, s.y1 - 10); ctx.lineTo(s.x2, s.y2 - 10); ctx.stroke();
    ctx.fillStyle = PAL.woodDark; rrect(ctx, s.x1 - 3.5, s.y1 - 32, 7, 34, 2);
    ctx.fillStyle = '#f4f9fc'; rrect(ctx, s.x1 - 4, s.y1 - 34, 8, 4, 2);
  } else if (tier === 1) {   // 통나무 목책
    if (vertical) { ctx.fillStyle = dark ? '#5d3d1c' : PAL.woodDark; ctx.fillRect(s.x1 - 7, Math.min(s.y1, s.y2) - 40, 14, 42); ctx.fillStyle = dark ? '#6a4a2a' : PAL.wood; ctx.fillRect(s.x1 - 7, Math.min(s.y1, s.y2) - 40, 5, 42); ctx.fillStyle = '#f4f9fc'; rrect(ctx, s.x1 - 7, Math.min(s.y1, s.y2) - 42, 14, 4, 2); }
    else { for (let x = x1; x < x2; x += 10) { ctx.fillStyle = dark ? '#5d3d1c' : PAL.woodDark; ctx.fillRect(x, y - 42, 9, 44); ctx.fillStyle = dark ? '#6a4a2a' : PAL.wood; ctx.fillRect(x, y - 42, 3, 44); ctx.fillStyle = '#f4f9fc'; tri(ctx, x, y - 42, x + 4.5, y - 50, x + 9, y - 42); } }
  } else {   // 돌담 / 성벽
    const h = tier === 2 ? 40 : 56;
    if (vertical) { ctx.fillStyle = dark ? '#7a8590' : PAL.stone; ctx.fillRect(s.x1 - 9, Math.min(s.y1, s.y2) - h, 18, h + 2); ctx.fillStyle = PAL.stoneDark; for (let r = 0; r < h / 10; r++) ctx.fillRect(s.x1 - 9, Math.min(s.y1, s.y2) - h + r * 10, 18, 1.5); ctx.fillStyle = PAL.stoneLight; ctx.fillRect(s.x1 - 10, Math.min(s.y1, s.y2) - h - 3, 20, 4); if (tier >= 3) { ctx.fillStyle = PAL.stoneDark; ctx.fillRect(s.x1 - 10, Math.min(s.y1, s.y2) - h - 12, 20, 10); } }
    else {
      ctx.fillStyle = dark ? '#7a8590' : PAL.stone; ctx.fillRect(x1, y - h, x2 - x1, h + 2);
      ctx.fillStyle = PAL.stoneDark; for (let r = 0; r < h / 10; r++) { ctx.fillRect(x1, y - h + r * 10, x2 - x1, 1.5); for (let c = 0; c < 2; c++) ctx.fillRect(x1 + (r % 2) * 10 + c * 20, y - h + r * 10, 1.5, 10); }
      ctx.fillStyle = PAL.stoneLight; ctx.fillRect(x1, y - h - 3, x2 - x1, 4);
      if (tier >= 3) { ctx.fillStyle = PAL.stoneDark; for (let x = x1; x < x2; x += 14) ctx.fillRect(x, y - h - 14, 8, 12); }
    }
  }
}
function drawCornerTower(ctx, x, y, time) {
  shadow(ctx, x, y + 3, 22, 8);
  ctx.fillStyle = PAL.stone; ctx.fillRect(x - 18, y - 84, 36, 84);
  ctx.fillStyle = PAL.stoneDark; for (let r = 0; r < 8; r++) { ctx.fillRect(x - 18, y - 84 + r * 10, 36, 1.5); ctx.fillRect(x - 18 + (r % 2) * 9, y - 84 + r * 10, 1.5, 10); }
  ctx.fillStyle = PAL.stoneDark; for (let i = -20; i < 20; i += 10) ctx.fillRect(x + i, y - 96, 6, 12);
  ctx.fillStyle = PAL.stoneLight; ctx.fillRect(x - 22, y - 86, 44, 5);
  ctx.fillStyle = '#2b3442'; rrect(ctx, x - 4, y - 60, 8, 14, 3);
  ctx.fillStyle = PAL.woodDark; ctx.fillRect(x - 1, y - 124, 2, 30); ctx.fillStyle = '#3b6fd1'; tri(ctx, x + 1, y - 124, x + 18 + Math.sin(time * 5) * 2, y - 117, x + 1, y - 110);
}
function drawDecorFence(ctx, x1, y1, x2, y2) {
  const vertical = Math.abs(x2 - x1) < 1;
  ctx.strokeStyle = vertical ? PAL.woodLight : PAL.wood; ctx.lineWidth = vertical ? 2.5 : 3.5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x1, y1 - 18); ctx.lineTo(x2, y2 - 18); ctx.moveTo(x1, y1 - 8); ctx.lineTo(x2, y2 - 8); ctx.stroke();
  ctx.fillStyle = PAL.woodDark; rrect(ctx, x1 - 3, y1 - 26, 6, 28, 2); ctx.fillStyle = '#f4f9fc'; rrect(ctx, x1 - 3.5, y1 - 28, 7, 3.5, 2);
}
function drawFishingSpot(ctx, sp) {
  shadow(ctx, sp.x, sp.y + 3, 20, 7);
  ctx.fillStyle = PAL.woodDark; ctx.fillRect(sp.x - 16, sp.y - 10, 32, 6); ctx.fillRect(sp.x - 14, sp.y - 4, 4, 8); ctx.fillRect(sp.x + 10, sp.y - 4, 4, 8);
  ctx.fillStyle = '#7f8c8d'; rrect(ctx, sp.x + 22, sp.y - 14, 12, 14, 3); ctx.fillStyle = '#5aa9e6'; ellipse(ctx, sp.x + 28, sp.y - 13, 5, 2);   // 양동이
  label(ctx, sp.x, sp.y + 16, '🎣 낚시터', 10, '#fff');
}
function drawFishingLine(ctx, e, time) {
  const tipX = e.x + (e.facing < 0 ? -18 : 18), tipY = e.y - 86;
  const bx = e.x + (e.facing < 0 ? -36 : 36), by = CFG.river.y + CFG.river.h - 22 + Math.sin(time * 3 + e.x) * 2;
  ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(tipX, tipY); ctx.quadraticCurveTo(bx, tipY + 20, bx, by); ctx.stroke();
  ctx.fillStyle = '#e74c3c'; circle(ctx, bx, by, 3.5); ctx.fillStyle = '#fff'; circle(ctx, bx, by - 2, 1.5);
}

// 밟고 있는 결제 원의 설명(맨 위에 그려 캐릭터에 가려지지 않게). 2~3줄로 접는다
function drawPadDesc(ctx, g, u) {
  const pp = g.padPos(u), x = pp.x, y = pp.y;
  ctx.font = 'bold 10px system-ui, sans-serif';
  const lines = [], words = u.desc.split(/(?<=[·,.])\s*|\s+/); let cur = '';
  for (const w of words) { const t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width > 240 && cur) { lines.push(cur); cur = w; } else cur = t; }
  if (cur) lines.push(cur);
  if (lines.length > 3) { lines.length = 3; lines[2] = lines[2].slice(0, 28) + '…'; }
  const w = Math.min(260, Math.max(...lines.map(l => ctx.measureText(l).width)) + 16), h = 12 * lines.length + 6, top = y - 64 - h;
  ctx.fillStyle = 'rgba(20,30,45,0.85)'; rrect(ctx, x - w / 2, top, w, h, 6);
  ctx.fillStyle = '#ffe08a'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  lines.forEach((l, i) => ctx.fillText(l, x, top + 9 + i * 12));
}
function drawPad(ctx, g, u, time) {
  const pp = g.padPos(u), x = pp.x, y = pp.y, r = CFG.pad.r;
  const cost = g.padCost(u), paid = g.paid[u.id] || 0, k = cost > 0 ? paid / cost : 0;
  const needsOk = g.hasNeeds(u);
  const active = g.activePad === u.id, afford = cost <= 0 || (needsOk && g.money + paid >= cost - 1e-6);
  ctx.save(); ctx.translate(x, y); ctx.scale(1, 0.74);
  ctx.fillStyle = active ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.55)'; circle(ctx, 0, 0, r);
  ctx.strokeStyle = afford ? '#27ae60' : 'rgba(60,90,130,0.45)'; ctx.lineWidth = active ? 5 : 3;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
  if (k > 0) { ctx.strokeStyle = '#27ae60'; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(0, 0, r - 4, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2); ctx.stroke(); }
  if (afford) { ctx.strokeStyle = `rgba(39,174,96,${0.35 + Math.sin(time * 5) * 0.25})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, r + 8, 0, Math.PI * 2); ctx.stroke(); }
  ctx.restore();
  emoji(ctx, x, y - 4, u.icon, 24);
  pill(ctx, x, y + 20, cost <= 0 ? '밟으면 계약' : !needsOk ? Object.keys(u.needs).map(k => `${CFG.goods[k].emoji}${u.needs[k]}`).join(' ') + ' 필요' : '$' + fmtMoney(Math.max(0, Math.ceil(cost - paid))), afford ? '#27ae60' : !needsOk ? '#c0392b' : '#34495e', '#fff', 'bold 11px system-ui, sans-serif');
  const lv = g.lv[u.id];
  label(ctx, x, y - 46, u.name + (u.max !== 1 && u.id !== 'repair' && lv > 0 ? ` Lv${lv}` : ''), 11, '#fff');
}

function drawBill(ctx, b) {
  const y = b.y - b.z;
  if (b.z > 0.5) shadow(ctx, b.x, b.y, 9, 4);
  ctx.save(); ctx.translate(b.x, y); ctx.rotate(b.rot * (b.state === 'ground' ? 1 : 0.2));
  ctx.fillStyle = '#2e9e5b'; rrect(ctx, -10, -6, 20, 12, 2);
  ctx.fillStyle = '#5dc983'; rrect(ctx, -8, -4, 16, 8, 1.5);
  ctx.fillStyle = '#2e9e5b'; circle(ctx, 0, 0, 2.6);
  ctx.restore();
}
function drawDrop(ctx, d) {
  const y = d.y - d.z;
  if (d.z > 0.5) shadow(ctx, d.x, d.y, 9, 4);
  ctx.save(); ctx.translate(d.x, y); ctx.rotate(d.rot); if (d.kind === 'pelt') peltBundle(ctx, 0, 0, 1); else meatChunk(ctx, 0, 0, 1); ctx.restore();
}
function drawArrow(ctx, a) {
  ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(a.ang || 0);
  if (a.kind === 'cannon') { ctx.fillStyle = 'rgba(80,80,80,0.35)'; circle(ctx, -14, 0, 5); circle(ctx, -26, 1, 4); ctx.fillStyle = '#111'; circle(ctx, 0, 0, 6); ctx.fillStyle = '#555'; circle(ctx, -2, -2, 2); ctx.restore(); return; }
  if (a.kind === 'bullet' || a.kind === 'mg') { ctx.strokeStyle = 'rgba(255,230,120,0.9)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-16, 0); ctx.lineTo(4, 0); ctx.stroke(); ctx.fillStyle = '#ffe08a'; circle(ctx, 4, 0, 2); ctx.restore(); return; }
  if (a.kind === 'bolt') { ctx.strokeStyle = '#2b3442'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(10, 0); ctx.stroke(); ctx.fillStyle = '#9aa7b5'; tri(ctx, 10, -4, 17, 0, 10, 4); ctx.restore(); return; }
  ctx.strokeStyle = PAL.woodDark; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(8, 0); ctx.stroke();
  ctx.fillStyle = a.tier >= 2 ? '#ffb347' : '#d6dde6'; tri(ctx, 8, -3, 13, 0, 8, 3);
  if (a.tier >= 2) { ctx.fillStyle = 'rgba(255,140,66,0.6)'; circle(ctx, 9, 0, 5); }
  ctx.fillStyle = '#e74c3c'; tri(ctx, -10, -3, -6, 0, -10, 3);
  ctx.restore();
}
function drawJoystick(ctx, js, dpr) {
  if (!js.active) return;
  ctx.save(); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = 'rgba(255,255,255,0.22)'; circle(ctx, js.ox, js.oy, 52);
  ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(js.ox, js.oy, 52, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.75)'; circle(ctx, js.ox + js.x * 40, js.oy + js.y * 40, 22);
  ctx.restore();
}

// 미니맵(화면 왼쪽 아래)
function drawMinimap(ctx, g, cam, ui) {
  const W = 92, H = Math.round(W * CFG.world.h / g.worldW), x0 = 10, y0 = ui.topPad + 8;
  const k = W / g.worldW;
  ctx.save(); ctx.setTransform(cam.dpr, 0, 0, cam.dpr, 0, 0); ctx.globalAlpha = 0.9;
  ctx.fillStyle = '#dfe8f1'; rrect(ctx, x0 - 3, y0 - 3, W + 6, H + 6, 8);
  ctx.fillStyle = PAL.snow; ctx.fillRect(x0, y0, W, H);
  const R = (r, c) => { ctx.fillStyle = c; ctx.fillRect(x0 + r.x * k, y0 + r.y * k, r.w * k, r.h * k); };
  if (g.lv.expandEast) R({ x: CFG.east.x, y: 160, w: CFG.east.w, h: CFG.world.h - 160 }, '#e4ebf2');
  R({ x: 0, y: CFG.river.y, w: g.worldW, h: CFG.river.h }, PAL.water); R(CFG.forest.rect, '#9ad8ac'); if (g.lv.grove) R(CFG.grove.rect, '#9ad8ac'); R(CFG.hunt.rect, '#d3c3a8'); R(CFG.wild.rect, '#c9cfd6'); R(CFG.camp, '#c9a47a'); if (g.lv.ranch) R(CFG.ranch.rect, '#cfd6b8');
  const dot = (x, y, c, r) => { ctx.fillStyle = c; circle(ctx, x0 + x * k, y0 + y * k, r); };
  for (const id of Object.keys(CFG.shops)) if (g.shopOpen(id)) dot(CFG.shops[id].x, CFG.shops[id].y, id === 'mart' ? '#e74c3c' : id === 'furn' ? '#d35400' : id === 'meat' ? '#c0392b' : id === 'fish' ? '#2980b9' : id === 'pelt' ? '#6d4c41' : id === 'slaughter' ? '#7b2d26' : id === 'rest' ? '#e67e22' : id === 'tailor' ? '#8e44ad' : id === 'inn' ? '#f1c40f' : '#8b5a2b', 3);
  for (const b of g.wild) dot(b.x, b.y, '#a67c52', 2);
  for (const c of g.collectors) dot(c.x, c.y, '#27ae60', 1.6);
  for (const b of g.bears) dot(b.x, b.y, '#e74c3c', b.bossName ? 4 : 2.5);
  for (const c of g.customers) dot(c.x, c.y, '#3b82c4', 1.2);
  dot(g.player.x, g.player.y, '#ffd166', 3.5); ctx.strokeStyle = '#222'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x0 + g.player.x * k, y0 + g.player.y * k, 3.5, 0, Math.PI * 2); ctx.stroke();
  // 화면 범위
  const vw = cam.w / cam.scale, vh = cam.h / cam.scale;
  ctx.strokeStyle = 'rgba(31,45,61,0.6)'; ctx.lineWidth = 1; ctx.strokeRect(x0 + (cam.x - vw / 2) * k, y0 + (cam.y - vh / 2) * k, vw * k, vh * k);
  ctx.restore();
}

// ---- 메인 렌더 ----
function render(ctx, g, cam, time, dtv, js, ui) {
  const { w, h, scale, dpr } = cam;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  const shakeX = g.shake > 0 ? (Math.random() - 0.5) * 8 * g.shake : 0, shakeY = g.shake > 0 ? (Math.random() - 0.5) * 8 * g.shake : 0;
  ctx.setTransform(scale * dpr, 0, 0, scale * dpr, (w / 2 - cam.x * scale + shakeX) * dpr, (h / 2 - cam.y * scale + shakeY) * dpr);
  const view = { x0: cam.x - w / 2 / scale, x1: cam.x + w / 2 / scale, y0: cam.y - h / 2 / scale, y1: cam.y + h / 2 / scale };
  const vis = (x, y, m) => x > view.x0 - m && x < view.x1 + m && y > view.y0 - m && y < view.y1 + m;

  drawGround(ctx, g, view, time);
  // 바닥에 붙은 것들
  for (const id of Object.keys(CFG.shops)) if (g.shopOpen(id) && g.shopAccepts(id).length && CFG.shops[id].drop.r > 0 && vis(CFG.shops[id].drop.x, CFG.shops[id].drop.y, 80)) drawDropZone(ctx, g, id, time);
  if (g.lv.tower && g.bears.length) { ctx.strokeStyle = 'rgba(231,76,60,0.25)'; ctx.lineWidth = 2; ctx.setLineDash([8, 8]); ctx.beginPath(); ctx.ellipse(CFG.tower.x, CFG.tower.y, g.towerRange, g.towerRange * 0.74, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); }
  for (const u of UPG) { const pp = g.padPos(u); if (g.padVisible(u) && vis(pp.x, pp.y, 90)) drawPad(ctx, g, u, time); }
  for (const b of g.bills) if (b.state === 'ground' && b.z <= 0.5 && vis(b.x, b.y, 30)) drawBill(ctx, b);
  for (const d of g.drops) if (d.state === 'ground' && d.z <= 0.5 && vis(d.x, d.y, 30)) drawDrop(ctx, d);
  if (ui.autoTarget && !ui.autoTarget.dead) { const t = ui.autoTarget; ctx.strokeStyle = 'rgba(255,209,102,0.9)'; ctx.lineWidth = 3; ctx.setLineDash([6, 6]); ctx.lineDashOffset = -time * 40; ctx.beginPath(); ctx.ellipse(t.x, t.y + 2, 34, 14, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); }
  for (const s of g.splashes) { const k = s.t / 0.7; ctx.strokeStyle = `rgba(255,255,255,${1 - k})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(s.x, s.y + 24, 6 + k * 22, 3 + k * 9, 0, 0, Math.PI * 2); ctx.stroke(); }

  // 높이가 있는 것들을 y 기준으로 정렬
  const items = [];
  const F = CFG.forest.rect;
  for (let x = F.x; x < F.x + F.w; x += 40) if (vis(x, F.y, 60)) items.push({ y: F.y, f: () => drawDecorFence(ctx, x, F.y, Math.min(x + 40, F.x + F.w), F.y) });
  for (let y = F.y; y < F.y + F.h; y += 40) { if (vis(F.x, y, 60)) items.push({ y: y + 40, f: () => drawDecorFence(ctx, F.x, y + 40, F.x, y) }); if (vis(F.x + F.w, y, 60)) items.push({ y: y + 40, f: () => drawDecorFence(ctx, F.x + F.w, y + 40, F.x + F.w, y) }); }
  for (let x = F.x; x < F.x + F.w; x += 40) { if (x > F.x + F.w / 2 - 60 && x < F.x + F.w / 2 + 20) continue; if (vis(x, F.y + F.h, 60)) items.push({ y: F.y + F.h, f: () => drawDecorFence(ctx, x, F.y + F.h, Math.min(x + 40, F.x + F.w), F.y + F.h) }); }
  const fk = g.fence.hp / g.fence.maxhp, ftier = tierOf('fence', g.lv.fence);
  for (const s of FENCE_SEGS) { if (s.gate) continue; if (!vis(s.x1, s.y1, 80)) continue; const broken = (s.rank >= fk - 1e-6 && fk < 1) || fk <= 0; items.push({ y: Math.max(s.y1, s.y2), f: () => drawFenceSeg(ctx, s, fk, broken, ftier, g) }); }
  if (ftier >= 3) { const C = CFG.camp; for (const [cx, cy] of [[C.x, C.y], [C.x + C.w, C.y], [C.x, C.y + C.h], [C.x + C.w, C.y + C.h]]) items.push({ y: cy + 1, f: () => drawCornerTower(ctx, cx, cy, time) }); }
  for (const t of g.trees) if (t.active && vis(t.x, t.y, 120)) items.push({ y: t.y, f: () => drawTree(ctx, t, time) });
  for (const r of GROUND.rocks) if (vis(r.x, r.y, 40)) items.push({ y: r.y, f: () => drawRock(ctx, r) });
  for (const d of GROUND.dead) if (vis(d.x, d.y, 60)) items.push({ y: d.y, f: () => drawDeadTree(ctx, d, time) });
  items.push({ y: CFG.hunt.rect.y + CFG.hunt.rect.h - 40, f: () => drawCave(ctx) });
  for (const sp of CFG.fishing.spots) if (vis(sp.x, sp.y, 60)) items.push({ y: sp.y, f: () => drawFishingSpot(ctx, sp) });
  if (g.shopOpen('wood')) items.push({ y: CFG.shops.wood.y + 10, f: () => drawWoodStall(ctx, g, time) });
  if (g.shopOpen('meat')) items.push({ y: CFG.shops.meat.y + 10, f: () => drawMeatShop(ctx, g, time) });
  if (g.shopOpen('fish')) items.push({ y: CFG.shops.fish.y + 10, f: () => drawFishShop(ctx, g, time) });
  if (g.shopOpen('pelt')) items.push({ y: CFG.shops.pelt.y + 10, f: () => drawFurShop(ctx, g, time) });
  items.push({ y: CFG.shops.rest.y + 30, f: () => drawCraftHouse(ctx, g, 'rest', time) });
  items.push({ y: CFG.shops.tailor.y + 30, f: () => drawCraftHouse(ctx, g, 'tailor', time) });
  items.push({ y: CFG.shops.smoke.y + 30, f: () => drawCraftHouse(ctx, g, 'smoke', time) });
  items.push({ y: CFG.shops.meatproc.y + 30, f: () => drawCraftHouse(ctx, g, 'meatproc', time) });
  if (g.lv.expandEast) items.push({ y: CFG.east.road.y - 40, f: () => drawEastSign(ctx, g, time) });
  items.push({ y: CFG.shops.inn.y + 30, f: () => drawInn(ctx, g, time) });
  if (g.lv.mart) { items.push({ y: CFG.ship.dock.y + 10, f: () => drawDock(ctx, g, time) }); items.push({ y: CFG.ship.berth.y + 60, f: () => drawShip(ctx, g, time) }); }
  items.push({ y: CFG.shops.slaughter.y + 24, f: () => drawSlaughterhouse(ctx, g, time) });
  items.push({ y: CFG.shops.mart.y + 40, f: () => drawMart(ctx, g, time) });
  items.push({ y: CFG.shops.furn.y + 30, f: () => drawWorkshop(ctx, g, time) });
  for (const shopId of CRAFT_SHOPS) if (g.shopOpen(shopId)) CFG.shops[shopId].benches.forEach((b, i) => items.push({ y: b.y + 8, f: () => { const nb = g.player.crafting ? g.nearestBench(g.player.x, g.player.y) : null; drawBench(ctx, g, b, g.crafters[shopId][i] || (nb && nb.bench === b ? g.player : null), time, shopId); } }));
  drawRanch(ctx, g, items, vis, time);
  items.push({ y: CFG.hut.y + 26, f: () => drawHut(ctx, g, time) });
  items.push({ y: TOWNHALL.y + 30, f: () => drawTownhall(ctx, g, time) });
  if (g.lv.infirmary) items.push({ y: CFG.infirmary.y + 14, f: () => drawInfirmary(ctx, g, time) });
  if (g.manager && g.lv.manager && vis(g.manager.x, g.manager.y, 80)) items.push({ y: g.manager.y, f: () => { const m = g.manager; drawPerson(ctx, m, { sprite: 'manager', coat: '#2c3e50', pants: '#1b2631', hat: '#111', hatBand: '#c0392b', belt: '#c0392b' }, g); label(ctx, m.x, m.y - 72, g.autoInvest ? '🧑‍💼 관리인' : '🧑‍💼 관리인(쉼)', 11, '#fff'); if (m.sayT > 0) drawBubble(ctx, m.x, m.y - 86, m.say); } });
  if (g.lv.mess) items.push({ y: CFG.mess.y + 14, f: () => drawMess(ctx, g, time) });
  for (const r of g.repairmen) if (vis(r.x, r.y, 80)) items.push({ y: r.y, f: () => { drawPerson(ctx, r, { sprite: 'repairman', coat: '#e67e22', vest: '#f1c40f', pants: '#2b3a55', hat: '#f1c40f', belt: '#5b4636', tool: 'hammer' }, g); if (r.working && r.target) { const j = r.target, k = j.kind === 'tower' ? g.towerHp[j.i] / g.towerMax(g.lv.tower) : j.kind === 'hut' ? g.hut.hp / g.hut.maxhp : g.fence.hp / g.fence.maxhp; bar(ctx, r.x - 18, r.y - 76, 36, 5, k, '#f1c40f'); label(ctx, r.x, r.y - 86, '🔨 수리 중', 10, '#fff'); } } });
  for (const m of g.medics) if (vis(m.x, m.y, 80)) items.push({ y: m.y, f: () => { drawPerson(ctx, m, { sprite: 'medic', coat: '#f4f6f8', pants: '#2b3a55', cap: '#e74c3c', belt: '#c0392b', bag: '#e74c3c', bagSize: 2 }, g); if (m.healing && m.target) bar(ctx, m.target.x - 18, m.target.y - 50, 36, 5, (m.target.healT || 0) / CFG.guard.healTime, '#7CFC9A'); } });
  for (const shopId of CRAFT_SHOPS) for (const r of g.runners[shopId]) if (vis(r.x, r.y, 80)) items.push({ y: r.y, f: () => drawPerson(ctx, r, { sprite: 'runner', coat: shopId === 'furn' ? '#a0522d' : shopId === 'rest' ? '#e67e22' : '#8e44ad', pants: '#2b3a55', cap: '#f1c40f', bag: '#b8962e', bagSize: 5 }, g) });
  items.push({ y: BEACON.y, f: () => drawBeacon(ctx, g, time) });
  if (g.lv.militia) for (let i = 0; i < g.lv.militia; i++) { const mp = MILITIA_POSTS[i]; items.push({ y: mp.y - 1, f: () => drawMilitiaPost(ctx, mp) }); }
  items.push({ y: CFG.hut.y + 80, f: () => drawCampfire(ctx, time) });
  g.towerSites().forEach((S, i) => items.push({ y: S.y, f: () => drawTower(ctx, g, time, S, i) }));
  // 계산원(열린 가게마다)
  if (g.lv.cashier) for (const id of Object.keys(CFG.shops)) if (g.shopOpen(id) && CFG.shops[id].goods.length) { const c = CFG.shops[id].cashier; items.push({ y: c.y, f: () => drawPerson(ctx, { x: c.x, y: c.y, facing: 1, moving: false, anim: 0, swing: 0, down: 0, flash: 0 }, { sprite: 'cashier', coat: '#8e44ad', hat: '#f1c40f', pom: '#fff' }, g) }); }
  const p = g.player;
  items.push({ y: p.y, f: () => {
    const sc = popScale(g, 'player');
    drawPerson(ctx, p, { sprite: 'player', coat: '#e8d9b8', pants: '#4a3b2a', hood: '#c9b48e', beard: '#f4f4f4', tool: p.fishing ? 'rod' : p.crafting ? (p.craftShop === 'tailor' ? null : 'hammer') : p.gun ? (TIERS.weapon[tierOf('weapon', g.lv.weapon)].shape || 'gun') : 'axe', flashT: p.flashT || 0, belt: '#7a5230', bag: g.lv.bag ? '#7a5230' : null, bagSize: Math.min(g.lv.bag, 6), showInv: true, scale: sc }, g);
    if (p.fishing) { drawFishingLine(ctx, p, time); bar(ctx, p.x - 18, p.y - 76, 36, 4, p.fishT / g.fishTime, '#5aa9e6'); }
    if (p.tree && p.chopT > 0) bar(ctx, p.x - 18, p.y - 76, 36, 4, p.chopT / (CFG.player.chopTime * g.chopMul), '#f1c40f');
    if (p.harvesting) label(ctx, p.x, p.y - 96, '🦌 데려오는 중…', 11, '#fff');
    if (p.slaughtering) label(ctx, p.x, p.y - 96, '🔪 도축 중…', 11, '#fff');
    if (p.crafting && p.craftShop === 'rest') label(ctx, p.x, p.y - 96, '🍳 요리 중…', 11, '#fff');
    if (p.crafting && p.craftShop === 'tailor') label(ctx, p.x, p.y - 96, '🧵 재봉 중…', 11, '#fff');
    if (p.hp < p.maxhp) bar(ctx, p.x - 20, p.y - 70, 40, 5, p.hp / p.maxhp, p.hp / p.maxhp < 0.35 ? '#e74c3c' : '#2ecc71');
    if (p.down > 0) label(ctx, p.x, p.y - 60, `😵 ${Math.ceil(p.down)}`, 14, '#fff');
  } });
  for (const wk of g.workers) if (vis(wk.x, wk.y, 80)) items.push({ y: wk.y, f: () => drawPerson(ctx, wk, { sprite: 'worker', coat: '#d35400', vest: '#f39c12', hat: '#f1c40f', pom: '#fff', tool: 'axe' }, g) });
  const wt = tierOf('weapon', g.lv.weapon), guardLook = { sprite: 'guard', coat: wt >= 3 ? '#5d6d7e' : '#2c3e50', pants: '#1b2631', helmet: TIERS.weapon[wt].color, hat: '#34495e', tool: TIERS.weapon[wt].shape || 'spear', shield: wt >= 1 ? (wt >= 2 ? '#b8860b' : '#8b5a2b') : null, shieldKite: wt >= 2, armor: wt >= 3 ? '#aab4c0' : null };
  const militiaLook = { ...guardLook, sprite: 'militia', coat: '#8e2b2b', pants: '#2b1b1b', helmet: '#d4af37', shield: '#b8860b', shieldKite: true, armor: wt >= 2 ? '#c9c2b2' : null };
  for (const gd of g.guards) if (vis(gd.x, gd.y, 80)) items.push({ y: gd.y, f: () => { drawPerson(ctx, gd, Object.assign({ flashT: gd.flashT || 0 }, gd.militia ? militiaLook : guardLook), g); if (gd.down > 0) { const bl = gd.bleed != null ? gd.bleed : CFG.guard.bleedOut; bar(ctx, gd.x - 18, gd.y - 44, 36, 4, bl / CFG.guard.bleedOut, '#ff5252'); label(ctx, gd.x, gd.y - 56, `🩸 ${Math.ceil(bl)}초`, 11, '#fff'); } if (gd.hp < gd.maxhp && gd.down <= 0) bar(ctx, gd.x - 18, gd.y - 72, 36, 4, gd.hp / gd.maxhp, '#2ecc71'); if (gd.down > 0) label(ctx, gd.x, gd.y - 40, `💫 ${Math.ceil(gd.down)}`, 12, '#fff'); } });
  for (const hn of g.hunters) if (vis(hn.x, hn.y, 80)) items.push({ y: hn.y, f: () => drawPerson(ctx, hn, { sprite: 'hunter', coat: '#6d4c41', pants: '#3e2723', fur: '#a1887f', tool: 'spear' }, g) });
  for (const fs of g.fishers) if (vis(fs.x, fs.y, 80)) items.push({ y: fs.y, f: () => { drawPerson(ctx, fs, { sprite: 'fisher', coat: '#f1c40f', pants: '#2b3a55', cap: '#e67e22', tool: 'rod' }, g); if (fs.fishing) { drawFishingLine(ctx, fs, time); bar(ctx, fs.x - 18, fs.y - 76, 36, 4, fs.fishT / (g.fishTime * CFG.fishing.fisherMul / g.effMul), '#5aa9e6'); } } });
  for (const cl of g.collectors) if (vis(cl.x, cl.y, 90)) items.push({ y: cl.y, f: () => {
    if (g.lv.sled) drawCollectorSled(ctx, cl);
    drawPerson(ctx, cl, { sprite: 'collector', coat: '#7f8c8d', pants: '#2b3a55', cap: '#27ae60', bag: '#b8962e', bagSize: 4 + g.lv.sled }, g);
    if (cl.sweepT > 0) drawBubble(ctx, cl.x, cl.y - 86, '🧺 청소!'); else if (cl.wait === 'raid' && cl === g.collectors.find(o => o.wait === 'raid')) drawBubble(ctx, cl.x, cl.y - 86, '🧺 전리품 대기');
  } });
  for (const pen of g.pens) if (vis(pen.x, pen.y, 70)) items.push({ y: pen.y + 22, f: () => drawPen(ctx, pen, g, time) });
  for (const pl of Object.values(g.piles)) if (g.pileActive(pl) && vis(pl.x, pl.y, 70)) items.push({ y: pl.y + 6, f: () => drawPile(ctx, g, pl) });
  for (const ff of g.fishFarmers) if (vis(ff.x, ff.y, 80)) items.push({ y: ff.y, f: () => { drawPerson(ctx, ff, { sprite: 'fishFarmer', coat: '#16a085', pants: '#2b3a55', cap: '#1abc9c', belt: '#5b4636' }, g); if (ff.target && ff.swing > 0) drawNet(ctx, ff, time); } });
  if (g.lv.collector) for (const P of [CFG.hunt.collectorPost, CFG.hunt.collectorPostSouth]) if ((P === CFG.hunt.collectorPost || g.collectors.length >= 2) && vis(P.x, P.y, 60)) items.push({ y: P.y - 30, f: () => drawCollectorPost(ctx, P) });
  if (g.lv.bait) { const B = CFG.hunt.rect; const bx = B.x + B.w / 2 + 40, by = B.y + 40; if (vis(bx, by, 40)) items.push({ y: by, f: () => { shadow(ctx, bx, by + 2, 18, 6); for (let i = 0; i < 3; i++) fishShape(ctx, bx - 10 + i * 10, by - 6 - (i % 2) * 5, 0.9); } }); }
  for (const sm of g.slaughtermen) if (vis(sm.x, sm.y, 80)) items.push({ y: sm.y, f: () => drawPerson(ctx, sm, { sprite: 'slaughterman', coat: '#ecf0f1', pants: '#2b3a55', apron: '#c0392b', cap: '#7b2d26', tool: 'hammer' }, g) });
  const crafterLook = { furn: { sprite: 'craftsman', coat: '#5d6d7e', pants: '#2b3a55', apron: '#8b5a2b', cap: '#c0392b', tool: 'hammer' }, rest: { sprite: 'cook', coat: '#ecf0f1', pants: '#2b3a55', apron: '#c0392b', hat: '#fff', pom: '#fff', tool: 'hammer' }, tailor: { sprite: 'tailor', coat: '#8e44ad', pants: '#2b3a55', apron: '#f5e6c8', cap: '#5e3b73', tool: null }, smoke: { sprite: 'smoker', coat: '#8b5a2b', pants: '#2b3a55', apron: '#5b4636', cap: '#e67e22', tool: 'hammer' }, meatproc: { sprite: 'meatworker', coat: '#ecf0f1', pants: '#2b3a55', apron: '#c0392b', cap: '#c0392b', tool: 'hammer' } };
  for (const shopId of CRAFT_SHOPS) for (const cm of g.crafters[shopId]) if (vis(cm.x, cm.y, 80)) items.push({ y: cm.y, f: () => drawPerson(ctx, cm, crafterLook[shopId], g) });
  for (const c of g.customers) if (vis(c.x, c.y, 90)) items.push({ y: c.y, f: () => {
    if (c.big) { drawSled(ctx, c); drawPerson(ctx, c, { sprite: 'bigbuyer', coat: c.coat, pants: '#3b2a1a', hat: '#8b1e1e', pom: '#fff', beard: '#d9c7a8' }, g); }
    else {   // 계급별 차림: 마을 사람 → 나그네(목도리·배낭) → 상인(검은 모자·큰 가방) → 귀족(모피 후드·금띠) → 왕족(왕관·망토)
      const cls = c.cls || 0, look = [
        { sprite: 'customer', coat: c.coat, pants: '#2b3a55', hat: '#1f4e79', pom: '#fff' },
        { sprite: 'customer', coat: c.coat, pants: '#2b3a55', hat: '#1f4e79', pom: '#fff', belt: '#c0392b', bag: '#8b5a2b', bagSize: 2 },
        { sprite: 'customer', coat: '#3d3d4e', pants: '#1b2631', hat: '#111', hatBand: '#c0392b', bag: '#5b4636', bagSize: 4, belt: '#b8862e' },
        { sprite: 'customer', coat: '#4a235a', pants: '#1b2631', hood: '#e8d9b8', belt: '#f1c40f', bag: '#6d4c41', bagSize: 2 },
        { sprite: 'customer', coat: '#7b1e3a', pants: '#1b2631', hat: '#f1c40f', hatBand: '#e74c3c', belt: '#f1c40f', armor: '#f5e6c8' },
      ][cls];
      drawPerson(ctx, c, look, g);
      if (cls >= 3 && c.state === 'queue') label(ctx, c.x, c.y - 74, cls === 4 ? '👑 왕족' : '🎩 귀족', 10, '#ffd166');
    }
    if (c.state === 'queue' && c.wait) {
      const ok = Object.keys(c.want).every(gd => g.shops[c.shop].stock[gd] >= c.want[gd]);
      const wantText = Object.keys(c.want).map(gd => `${CFG.goods[gd].emoji}×${c.want[gd]}`).join(' ');
      drawBubble(ctx, c.x, c.y - 92, ok || c.serveT > 0 ? `${c.big ? '🛷 ' : ''}${wantText}${c.big ? ' (1.5배)' : ''}` : (c.patience < 12 ? '😠' : `… ${wantText}`));
    } else if (c.state === 'leave' && c.got) {
      const items2 = Object.keys(c.got).map(gd => gd === 'room' ? '🛎️' : CFG.goods[gd].emoji + (c.got[gd] > 1 ? c.got[gd] : '')).join(' ');
      emoji(ctx, c.x, c.y - 84, items2, 14); if (c.mood > 0) drawBubble(ctx, c.x, c.y - 100, '😊');
    }
  } });
  for (const b of g.wild) if (vis(b.x, b.y, 90)) items.push({ y: b.y, f: () => drawEnemy(ctx, b, time) });
  for (const b of g.bears) if (vis(b.x, b.y, 160)) items.push({ y: b.y, f: () => drawEnemy(ctx, b, time) });
  items.sort((a, b) => a.y - b.y);
  for (const it of items) it.f();

  // 위에 떠 있는 것들
  for (const b of g.bills) if (!(b.state === 'ground' && b.z <= 0.5)) drawBill(ctx, b);
  for (const d of g.drops) if (!(d.state === 'ground' && d.z <= 0.5)) drawDrop(ctx, d);
  for (const a of g.arrows) if (a.t >= 0) drawArrow(ctx, a);
  for (const c of g.chips) { ctx.fillStyle = PAL.grain; ctx.fillRect(c.x - 2.5, c.y - 2.5, 5, 5); }
  for (const s of g.sparks) { const k = s.t / s.life; ctx.globalAlpha = 1 - k; ctx.fillStyle = s.color; ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(k * 6); ctx.fillRect(-s.s, -s.s, s.s * 2, s.s * 2); ctx.restore(); ctx.globalAlpha = 1; }
  if (g.activePad && g.padFlow > 0) {
    const u = UPG.find(u => u.id === g.activePad), pp = g.padPos(u);
    for (let i = 0; i < 3; i++) { const k = (time * 2.2 + i / 3) % 1; const bx = lerp(p.x, pp.x, k), by = lerp(p.y - 40, pp.y, k) - Math.sin(k * Math.PI) * 30; drawBill(ctx, { x: bx, y: by, z: 0, rot: k * 6, state: 'fly' }); }
  }
  if (g.activePad) { const u = UPG.find(u => u.id === g.activePad); if (u && g.padVisible(u)) drawPadDesc(ctx, g, u); }
  for (const t of g.texts) { const k = t.t / t.life; ctx.globalAlpha = 1 - k * k; label(ctx, t.x, t.y, t.text, 14, t.color); ctx.globalAlpha = 1; }
  // 안내 화살표
  const hint = HINTS[g.tutorial];
  if (hint) {
    const tg = hint.target(); const dx = tg.x - p.x, dy = tg.y - p.y, d = Math.hypot(dx, dy);
    if (d > 90) { const ax = p.x + (dx / d) * 48, ay = p.y - 20 + (dy / d) * 48, ang = Math.atan2(dy, dx);
      ctx.save(); ctx.translate(ax, ay); ctx.rotate(ang); ctx.fillStyle = '#ffd166'; tri(ctx, -8, -9, 10 + Math.sin(time * 8) * 3, 0, -8, 9); ctx.restore(); }
  }
  // 화면 밖의 적은 가장자리에 표시
  for (const b of g.bears) {
    if (vis(b.x, b.y, -20)) continue;
    const cx = clamp(b.x, view.x0 + 30, view.x1 - 30), cy = clamp(b.y, view.y0 + 110, view.y1 - 60);
    emoji(ctx, cx, cy, g.enemyEmoji(b.type), 26);
    ctx.fillStyle = '#e74c3c'; const ang = Math.atan2(b.y - cy, b.x - cx); ctx.save(); ctx.translate(cx + Math.cos(ang) * 22, cy + Math.sin(ang) * 22); ctx.rotate(ang); tri(ctx, -5, -6, 6, 0, -5, 6); ctx.restore();
  }

  // 화면 공간: 눈, 경고, 미니맵, 조이스틱
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  for (const f of GROUND.flakes) {
    f.y += (f.v * dtv) / h; f.w += dtv; if (f.y > 1) { f.y -= 1; f.x = Math.random(); }
    ctx.fillStyle = 'rgba(255,255,255,0.8)'; circle(ctx, (f.x + Math.sin(f.w) * 0.01) * w, f.y * h, f.s);
  }
  if (g.wave.warned || g.wave.active) {
    const a = g.wave.active ? 0.18 : 0.25 + Math.sin(time * 6) * 0.2;
    const grd = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.45, w / 2, h / 2, Math.max(w, h) * 0.75);
    grd.addColorStop(0, 'rgba(200,30,30,0)'); grd.addColorStop(1, `rgba(200,30,30,${a})`);
    ctx.fillStyle = grd; ctx.fillRect(0, 0, w, h);
  }
  if (p.down > 0) { ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(0, 0, w, h); }
  if (!ui.onTitle) drawMinimap(ctx, g, cam, ui);
  drawJoystick(ctx, js, dpr);
}

// 수거꾼 썰매: 고기·모피를 싣고 끈다
function drawCollectorSled(ctx, c) {
  drawSled(ctx, { x: c.x, y: c.y, facing: c.facing, got: null });
  const x = c.x + (c.facing < 0 ? 34 : -34), y = c.y;
  const nm = Math.min(c.inv.meat || 0, 4), np = Math.min(c.inv.pelt || 0, 4);
  for (let i = 0; i < nm; i++) meatChunk(ctx, x - 12 + (i % 2) * 14, y - 22 - Math.floor(i / 2) * 8, 0.7);
  for (let i = 0; i < np; i++) peltBundle(ctx, x + 6 - (i % 2) * 14, y - 22 - Math.floor(i / 2) * 8 - (nm ? 0 : 0), 0.65);
}
// 수거꾼 초소: 바구니와 팻말
function drawCollectorPost(ctx, P) {
  shadow(ctx, P.x, P.y + 2, 16, 6);
  ctx.fillStyle = '#b8962e'; rrect(ctx, P.x - 14, P.y - 16, 28, 16, 5); ctx.fillStyle = '#d4b24c'; rrect(ctx, P.x - 16, P.y - 20, 32, 6, 3);
  ctx.strokeStyle = '#8b5a2b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(P.x, P.y - 18, 12, Math.PI, 0); ctx.stroke();
  label(ctx, P.x, P.y - 40, '🧺 수거 초소', 10, '#fff');
}
// 더미: 통나무 더미 / 생선 바구니 / 가죽 더미. 쌓인 양만큼 그리고 수량 알약을 단다
function drawPile(ctx, g, pl) {
  const x = pl.x, y = pl.y, n = pl.stock, full = n >= pl.cap;
  shadow(ctx, x, y + 3, 30, 9);
  if (pl.good === 'wood') {
    ctx.fillStyle = PAL.woodDark; ctx.fillRect(x - 34, y - 4, 6, 10); ctx.fillRect(x + 28, y - 4, 6, 10);   // 받침 말뚝
    const k = Math.min(12, Math.ceil(n / 7));
    for (let i = 0; i < k; i++) { const row = Math.floor(i / 4), col = i % 4; log(ctx, x - 21 + col * 14 + (row % 2) * 7, y - 4 - row * 8, 16, 7); }
    if (!k) { ctx.fillStyle = 'rgba(90,70,50,0.25)'; ellipse(ctx, x, y, 28, 8); }
  } else if (pl.good === 'fish') {
    ctx.fillStyle = '#b8862e'; rrect(ctx, x - 24, y - 18, 48, 22, 6); ctx.fillStyle = '#d4a84b'; rrect(ctx, x - 26, y - 22, 52, 7, 3);
    ctx.strokeStyle = '#8b5a2b'; ctx.lineWidth = 1.5; for (let i = -16; i <= 16; i += 8) { ctx.beginPath(); ctx.moveTo(x + i, y - 16); ctx.lineTo(x + i, y + 2); ctx.stroke(); }
    const k = Math.min(6, Math.ceil(n / 10));
    for (let i = 0; i < k; i++) fishShape(ctx, x - 15 + (i % 3) * 15, y - 24 - Math.floor(i / 3) * 7, 0.75);
    ctx.strokeStyle = '#8b5a2b'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(x, y - 20, 22, Math.PI, 0); ctx.stroke();
  } else if (pl.good === 'meat') {   // 고기 걸이: 가로대에 고기 덩어리를 매단다
    ctx.fillStyle = '#5b4636'; ctx.fillRect(x - 28, y - 40, 5, 44); ctx.fillRect(x + 23, y - 40, 5, 44); ctx.fillRect(x - 30, y - 42, 60, 4);
    const k = Math.min(5, Math.ceil(n / 12));
    for (let i = 0; i < k; i++) { const mx = x - 20 + i * 10, my = y - 30 + (i % 2) * 4; ctx.strokeStyle = '#8b5a2b'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(mx, y - 40); ctx.lineTo(mx, my - 6); ctx.stroke(); ctx.fillStyle = '#c0392b'; rrect(ctx, mx - 5, my - 6, 10, 14, 4); ctx.fillStyle = '#f5cba7'; rrect(ctx, mx - 3, my - 4, 3, 10, 2); }
    if (!k) { ctx.fillStyle = '#a67c52'; ellipse(ctx, x, y - 30, 10, 5); }
  } else {
    ctx.fillStyle = '#5b4636'; ctx.fillRect(x - 28, y - 40, 5, 44); ctx.fillRect(x + 23, y - 40, 5, 44); ctx.fillRect(x - 30, y - 42, 60, 4);   // 걸이
    const k = Math.min(5, Math.ceil(n / 12));
    for (let i = 0; i < k; i++) peltBundle(ctx, x - 20 + i * 10, y - 26 + (i % 2) * 4, 0.8);
    if (!k) { ctx.fillStyle = '#a67c52'; ellipse(ctx, x, y - 30, 10, 5); }
  }
  const emo = CFG.goods[pl.good].emoji;
  pill(ctx, x, y - 54, `${emo} ${n}/${pl.cap}`, full ? '#c0392b' : 'rgba(20,30,45,0.75)', '#fff', 'bold 10px system-ui, sans-serif');
  label(ctx, x, y + 18, pl.name, 10, '#fff');
}
// 양식장 가두리: 물 위 나무틀과 그물. 다 자라면 물고기가 보인다
function drawPen(ctx, pen, g, time) {
  const x = pen.x, y = pen.y, w = 64, h = 38, ready = pen.grow >= 1;
  ctx.fillStyle = 'rgba(30,80,130,0.35)'; rrect(ctx, x - w / 2 + 4, y - h / 2 + 4, w - 8, h - 8, 6);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1;
  for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(x - w / 2 + 6, y + i * 7); ctx.lineTo(x + w / 2 - 6, y + i * 7); ctx.stroke(); }
  for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(x + i * 9, y - h / 2 + 6); ctx.lineTo(x + i * 9, y + h / 2 - 6); ctx.stroke(); }
  const nf = ready ? 4 : pen.grow > 0.5 ? 2 : pen.grow > 0.2 ? 1 : 0;
  for (let i = 0; i < nf; i++) { const k = time * 1.5 + i * 1.7 + pen.i; fishShape(ctx, x + Math.sin(k) * 16, y + Math.cos(k * 0.7) * 8, ready ? 0.8 : 0.5); }
  ctx.strokeStyle = PAL.woodDark; ctx.lineWidth = 4; ctx.lineJoin = 'round'; ctx.strokeRect(x - w / 2, y - h / 2, w, h);
  ctx.fillStyle = PAL.wood; for (const [cx, cy] of [[x - w / 2, y - h / 2], [x + w / 2, y - h / 2], [x - w / 2, y + h / 2], [x + w / 2, y + h / 2]]) circle(ctx, cx, cy, 4);
  const bob = Math.sin(time * 2 + pen.i) * 1.5;
  for (let i = -1; i <= 1; i++) { ctx.fillStyle = i ? '#e74c3c' : '#f4f9fc'; circle(ctx, x + i * 20, y - h / 2 - 2 + bob, 3.5); }   // 부표
  if (ready) drawBubble(ctx, x, y - 34 + Math.sin(time * 4 + pen.i) * 2, '🐟 수확');
  else bar(ctx, x - 20, y - 32, 40, 3, pen.grow, '#5aa9e6');
  if (pen.harvestT > 0) bar(ctx, x - 20, y - 38, 40, 4, pen.harvestT / CFG.fishFarm.harvestTime, '#ffd166');
}
// 양식업자가 가두리로 뻗는 뜰채
function drawNet(ctx, f, time) {
  const pen = f.target; if (!pen) return;
  const hx = f.x + f.facing * 12, hy = f.y - 36, k = Math.sin(time * 10) * 4;
  ctx.strokeStyle = '#5b4636'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(pen.x, pen.y + 16 + k); ctx.stroke();
  ctx.strokeStyle = '#f4f9fc'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(pen.x, pen.y + 16 + k, 12, 7, 0, 0, Math.PI * 2); ctx.stroke();
}
function drawSled(ctx, c) {
  const x = c.x + (c.facing < 0 ? 34 : -34), y = c.y;
  shadow(ctx, x, y + 2, 26, 7);
  ctx.strokeStyle = PAL.woodDark; ctx.lineWidth = 3; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x - 26, y); ctx.lineTo(x + 24, y); ctx.quadraticCurveTo(x + 32, y - 2, x + 30, y - 10); ctx.stroke();
  ctx.fillStyle = PAL.wood; rrect(ctx, x - 22, y - 16, 44, 12, 3);
  ctx.fillStyle = PAL.woodLight; ctx.fillRect(x - 20, y - 14, 40, 2);
  const n = c.got ? Math.min(c.got.wood || 0, 6) : 0;
  for (let i = 0; i < n; i++) log(ctx, x - 12 + (i % 3) * 12, y - 22 - Math.floor(i / 3) * 7, 14, 6);
  ctx.strokeStyle = '#5b4636'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + (c.facing < 0 ? -24 : 24), y - 10); ctx.lineTo(c.x, c.y - 24); ctx.stroke();
}
