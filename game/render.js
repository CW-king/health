// 눈보라 벌목장 — 그리기. 모든 좌표는 월드 단위이고, main.js가 카메라 변환을 걸어 준다.
'use strict';

const PAL = {
  snow: '#e9f1f8', snow2: '#dde8f2', snowShade: '#cfdcea', path: '#d3dfeb',
  shadow: 'rgba(40,70,110,0.16)',
  wood: '#8b5a2b', woodLight: '#b67a44', woodDark: '#6a4119', grain: '#d9a86c',
  treeL: '#3ec46a', treeR: '#2a9a52', treeTop: '#f4f9fc',
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
function pill(ctx, x, y, text, bg, fg, font) {
  ctx.font = font || 'bold 12px system-ui, sans-serif';
  const w = ctx.measureText(text).width + 14;
  ctx.fillStyle = bg; rrect(ctx, x - w / 2, y - 9, w, 18, 9);
  ctx.fillStyle = fg || '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, x, y + 1);
}
function label(ctx, x, y, text, size, color, stroke) {
  ctx.font = `bold ${size}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineWidth = 3; ctx.strokeStyle = stroke || 'rgba(20,30,45,0.75)'; ctx.lineJoin = 'round'; ctx.strokeText(text, x, y);
  ctx.fillStyle = color || '#fff'; ctx.fillText(text, x, y);
}
function log(ctx, x, y, w, h) {
  ctx.fillStyle = PAL.wood; rrect(ctx, x - w / 2, y - h / 2, w, h, h / 2);
  ctx.fillStyle = PAL.woodLight; rrect(ctx, x - w / 2 + 2, y - h / 2 + 1, w - 6, h / 3, 2);
  ctx.fillStyle = PAL.grain; circle(ctx, x + w / 2 - h / 2, y, h / 2 - 0.5);
  ctx.fillStyle = PAL.woodDark; circle(ctx, x + w / 2 - h / 2, y, h / 5);
}

// 눈 바닥의 점과 길은 매번 같은 자리에 찍히도록 미리 만들어 둔다
const GROUND = (() => {
  let seed = 7; const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const dots = []; for (let i = 0; i < 260; i++) dots.push({ x: r() * CFG.world.w, y: r() * CFG.world.h, s: 2 + r() * 5, a: 0.25 + r() * 0.35 });
  const flakes = []; for (let i = 0; i < 70; i++) flakes.push({ x: r(), y: r(), s: 1 + r() * 2.2, v: 18 + r() * 30, w: r() * 6.28 });
  return { dots, flakes };
})();

function drawGround(ctx, view) {
  ctx.fillStyle = PAL.snow; ctx.fillRect(view.x0 - 50, view.y0 - 50, view.x1 - view.x0 + 100, view.y1 - view.y0 + 100);
  // 숲 바닥, 캠프 바닥
  const F = CFG.forest.rect, C = CFG.camp;
  ctx.fillStyle = PAL.snow2; rrect(ctx, F.x, F.y, F.w, F.h, 24);
  ctx.fillStyle = PAL.snowShade; rrect(ctx, C.x - 16, C.y - 16, C.w + 32, C.h + 32, 22);
  ctx.fillStyle = PAL.snow2; rrect(ctx, C.x - 8, C.y - 8, C.w + 16, C.h + 16, 18);
  // 길
  ctx.strokeStyle = PAL.path; ctx.lineWidth = 46; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(300, 640); ctx.lineTo(520, 680); ctx.lineTo(700, 760); ctx.lineTo(1080, 1020); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(520, 680); ctx.lineTo(540, 900); ctx.lineTo(480, 1000); ctx.stroke();
  for (const d of GROUND.dots) {
    if (d.x < view.x0 || d.x > view.x1 || d.y < view.y0 || d.y > view.y1) continue;
    ctx.fillStyle = `rgba(255,255,255,${d.a})`; circle(ctx, d.x, d.y, d.s);
  }
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
  if (t.logs < CFG.tree.logs) { // 베인 자국
    ctx.fillStyle = PAL.grain; for (let i = 0; i < CFG.tree.logs - t.logs; i++) ctx.fillRect(x - 8, y - 10 - i * 6, 6, 3);
  }
}

// 사람(플레이어, 벌목꾼, 경비병, 손님) 공통
function drawPerson(ctx, e, o) {
  const bob = e.moving ? Math.abs(Math.sin(e.anim)) * 3 : 0;
  const leg = e.moving ? Math.sin(e.anim) * 5 : 0;
  shadow(ctx, e.x, e.y + 2, 14, 6);
  ctx.save(); ctx.translate(e.x, e.y - bob);
  if (e.facing < 0) ctx.scale(-1, 1);
  ctx.fillStyle = o.pants || '#2b3a55';
  rrect(ctx, -9 + leg * 0.6, -14, 7, 15, 3); rrect(ctx, 2 - leg * 0.6, -14, 7, 15, 3);
  ctx.fillStyle = o.coat; rrect(ctx, -13, -42, 26, 30, 8);
  if (o.vest) { ctx.fillStyle = o.vest; rrect(ctx, -9, -40, 18, 24, 4); }
  ctx.fillStyle = o.belt || 'rgba(0,0,0,0.18)'; ctx.fillRect(-13, -22, 26, 4);
  ctx.fillStyle = o.coat; rrect(ctx, -17, -40, 7, 18, 3);   // 뒤팔
  ctx.fillStyle = o.skin || '#f1c9a5'; circle(ctx, 0, -52, 11.5);
  if (o.beard) { ctx.fillStyle = o.beard; ctx.beginPath(); ctx.arc(0, -50, 11.5, 0.15, Math.PI - 0.15); ctx.lineTo(0, -36); ctx.closePath(); ctx.fill(); }
  ctx.fillStyle = '#222'; circle(ctx, 5, -54, 1.7); circle(ctx, 9.5, -54, 1.7);
  if (o.hood) { ctx.fillStyle = o.hood; ctx.beginPath(); ctx.arc(0, -53, 13, Math.PI * 0.95, Math.PI * 2.05); ctx.lineTo(13, -46); ctx.lineTo(-13, -46); ctx.closePath(); ctx.fill(); }
  else { ctx.fillStyle = o.hat; rrect(ctx, -12.5, -66, 25, 13, 6); ctx.fillStyle = o.hatBand || 'rgba(255,255,255,0.35)'; ctx.fillRect(-12.5, -57, 25, 3); ctx.fillStyle = o.pom || o.hat; circle(ctx, 0, -67, 4); }
  if (o.helmet) { ctx.fillStyle = o.helmet; ctx.beginPath(); ctx.arc(0, -54, 13, Math.PI, Math.PI * 2); ctx.closePath(); ctx.fill(); ctx.fillRect(-14, -56, 28, 4); }
  // 앞팔 + 도구
  const sw = e.swing || 0;
  ctx.save(); ctx.translate(11, -38);
  if (o.tool === 'axe') {
    ctx.rotate(-0.4 + (sw > 0 ? Math.sin(sw * Math.PI) * 1.6 : 0));
    ctx.fillStyle = o.coat; rrect(ctx, -3, -2, 7, 16, 3);
    ctx.fillStyle = PAL.wood; rrect(ctx, 1, -26, 4, 36, 2);
    ctx.fillStyle = '#9aa7b5'; ctx.beginPath(); ctx.moveTo(3, -28); ctx.lineTo(14, -24); ctx.lineTo(14, -12); ctx.lineTo(3, -14); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#d6dde6'; ctx.fillRect(12, -24, 2.5, 12);
  } else if (o.tool === 'spear') {
    ctx.rotate(-0.2 + (sw > 0 ? Math.sin(sw * Math.PI) * 1.1 : 0));
    ctx.fillStyle = o.coat; rrect(ctx, -3, -2, 7, 16, 3);
    ctx.fillStyle = PAL.wood; rrect(ctx, 1, -34, 3.5, 44, 1);
    ctx.fillStyle = '#d6dde6'; tri(ctx, 0, -34, 2.75, -44, 5.5, -34);
  } else {
    ctx.fillStyle = o.coat; rrect(ctx, -3, -2, 7, 18, 3);
  }
  ctx.restore();
  ctx.restore();
  // 짊어진 통나무
  if (e.logs > 0) {
    const n = Math.min(e.logs, 7);
    for (let i = 0; i < n; i++) log(ctx, e.x, e.y - bob - 72 - i * 7, 30, 7);
    if (e.logs > 7) pill(ctx, e.x, e.y - bob - 72 - n * 7 - 10, '×' + e.logs, 'rgba(20,30,45,0.7)');
  }
}

function drawBubble(ctx, x, y, text, emoji) {
  ctx.font = 'bold 13px system-ui, sans-serif';
  const w = ctx.measureText(text).width + 18;
  ctx.fillStyle = '#fff'; rrect(ctx, x - w / 2, y - 24, w, 24, 8); tri(ctx, x - 5, y - 1, x + 5, y - 1, x, y + 5);
  ctx.fillStyle = PAL.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, x, y - 12);
}

function drawBear(ctx, b) {
  shadow(ctx, b.x, b.y + 2, 25, 9);
  ctx.save(); ctx.translate(b.x, b.y);
  if (b.facing < 0) ctx.scale(-1, 1);
  ctx.translate(b.lunge * 9, 0);
  const bob = b.moving ? Math.abs(Math.sin(b.anim)) * 2 : 0;
  const body = b.flash > 0.01 ? '#ffb4b4' : '#f6f8fb', dark = b.flash > 0.01 ? '#e59a9a' : '#dde5ee';
  ctx.fillStyle = dark; rrect(ctx, -22, -14, 9, 15, 4); rrect(ctx, -6, -14, 9, 15, 4); rrect(ctx, 8, -12, 9, 13, 4); rrect(ctx, 16, -13, 9, 14, 4);
  ctx.fillStyle = body; ellipse(ctx, -2, -20 - bob, 27, 17);
  ctx.strokeStyle = 'rgba(60,80,110,0.25)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(-2, -20 - bob, 27, 17, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = body; circle(ctx, 20, -31 - bob, 13.5);
  circle(ctx, 13, -41 - bob, 4.5); circle(ctx, 27, -41 - bob, 4.5);
  ctx.fillStyle = dark; circle(ctx, 13, -41 - bob, 2.2); circle(ctx, 27, -41 - bob, 2.2);
  ctx.fillStyle = dark; ellipse(ctx, 28, -27 - bob, 7.5, 5.5);
  ctx.fillStyle = '#222'; circle(ctx, 31, -29 - bob, 2.6); circle(ctx, 23, -34 - bear_eye(b), 1.9);
  if (b.lunge > 0.5) { ctx.fillStyle = '#222'; ctx.fillRect(26, -24 - bob, 7, 2); }
  ctx.restore();
  if (b.hp < b.maxhp) bar(ctx, b.x - 22, b.y - 60, 44, 5, b.hp / b.maxhp, '#e74c3c');
}
function bear_eye(b) { return b.moving ? Math.abs(Math.sin(b.anim)) * 2 : 0; }

function drawWolf(ctx, b) {
  shadow(ctx, b.x, b.y + 2, 20, 7);
  ctx.save(); ctx.translate(b.x, b.y);
  if (b.facing < 0) ctx.scale(-1, 1);
  ctx.translate(b.lunge * 9, 0);
  const bob = b.moving ? Math.abs(Math.sin(b.anim * 1.4)) * 3 : 0;
  const body = b.flash > 0.01 ? '#ffb4b4' : '#8d99a6', dark = b.flash > 0.01 ? '#e59a9a' : '#5f6b78';
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
  shadow(ctx, b.x, b.y + 3, 38, 13);
  ctx.save(); ctx.translate(b.x, b.y);
  if (b.facing < 0) ctx.scale(-1, 1);
  ctx.translate(b.lunge * 12, 0);
  const bob = b.moving ? Math.abs(Math.sin(b.anim * 0.7)) * 4 : 0;
  const fur = b.flash > 0.01 ? '#ffb4b4' : '#e8f1fb', dark = b.flash > 0.01 ? '#e59a9a' : '#b7c9dd', skin = '#7f9bb8';
  ctx.fillStyle = dark; rrect(ctx, -26, -22, 18, 24, 8); rrect(ctx, 8, -22, 18, 24, 8);
  ctx.fillStyle = fur; rrect(ctx, -34, -92 - bob, 68, 76, 26);
  ctx.fillStyle = dark; rrect(ctx, -16, -70 - bob, 32, 40, 12);
  const arm = b.lunge > 0 ? -Math.sin(b.lunge * Math.PI) * 1.2 : Math.sin(time * 2) * 0.1;
  ctx.save(); ctx.translate(30, -80 - bob); ctx.rotate(arm); ctx.fillStyle = fur; rrect(ctx, -8, 0, 18, 52, 9); ctx.fillStyle = skin; rrect(ctx, -6, 44, 14, 12, 5); ctx.restore();
  ctx.save(); ctx.translate(-30, -80 - bob); ctx.rotate(-arm * 0.5); ctx.fillStyle = fur; rrect(ctx, -10, 0, 18, 52, 9); ctx.fillStyle = skin; rrect(ctx, -8, 44, 14, 12, 5); ctx.restore();
  ctx.fillStyle = fur; circle(ctx, 4, -108 - bob, 24);
  ctx.fillStyle = skin; rrect(ctx, -10, -116 - bob, 34, 26, 10);
  ctx.fillStyle = '#fff'; circle(ctx, 4, -108 - bob, 4); circle(ctx, 16, -108 - bob, 4);
  ctx.fillStyle = '#c0392b'; circle(ctx, 5, -108 - bob, 2.2); circle(ctx, 17, -108 - bob, 2.2);
  ctx.fillStyle = '#222'; rrect(ctx, -2, -98 - bob, 22, 5, 2); ctx.fillStyle = '#fff'; tri(ctx, 2, -98 - bob, 5, -92 - bob, 8, -98 - bob); tri(ctx, 12, -98 - bob, 15, -92 - bob, 18, -98 - bob);
  ctx.fillStyle = dark; tri(ctx, -12, -124 - bob, -8, -140 - bob, 0, -126 - bob); tri(ctx, 8, -126 - bob, 16, -140 - bob, 20, -124 - bob);
  ctx.restore();
  bar(ctx, b.x - 34, b.y - 150, 68, 7, b.hp / b.maxhp, '#8e44ad');
  label(ctx, b.x, b.y - 162, '👹 설인', 12, '#fff');
}

function drawEnemy(ctx, b, time) {
  if (b.type === 'wolf') drawWolf(ctx, b);
  else if (b.type === 'yeti') drawYeti(ctx, b, time);
  else drawBear(ctx, b);
}

function drawSled(ctx, c) {
  const x = c.x + (c.facing < 0 ? 34 : -34), y = c.y;
  shadow(ctx, x, y + 2, 26, 7);
  ctx.strokeStyle = PAL.woodDark; ctx.lineWidth = 3; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x - 26, y); ctx.lineTo(x + 24, y); ctx.quadraticCurveTo(x + 32, y - 2, x + 30, y - 10); ctx.stroke();
  ctx.fillStyle = PAL.wood; rrect(ctx, x - 22, y - 16, 44, 12, 3);
  ctx.fillStyle = PAL.woodLight; ctx.fillRect(x - 20, y - 14, 40, 2);
  const n = Math.min(c.logs, 6);
  for (let i = 0; i < n; i++) log(ctx, x - 12 + (i % 3) * 12, y - 22 - Math.floor(i / 3) * 7, 14, 6);
  ctx.strokeStyle = '#5b4636'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + (c.facing < 0 ? -24 : 24), y - 10); ctx.lineTo(c.x, c.y - 24); ctx.stroke();
}


function drawCounter(ctx, g, time) {
  const C = CFG.counter, x = C.x, y = C.y, w = C.w;
  shadow(ctx, x, y + 6, w / 2 + 4, 13);
  ctx.fillStyle = PAL.woodDark; ctx.fillRect(x - w / 2, y - 8, w, 20);        // 앞면
  ctx.fillStyle = PAL.wood; ctx.fillRect(x - w / 2, y - 38, w, 30);           // 윗면
  ctx.fillStyle = PAL.woodLight; for (let i = 0; i < 4; i++) ctx.fillRect(x - w / 2 + 4, y - 36 + i * 7, w - 8, 2);
  ctx.fillStyle = PAL.woodDark; ctx.fillRect(x - w / 2, y - 8, w, 3);
  const n = g.counter.logs, show = Math.min(n, 12);
  for (let i = 0; i < show; i++) { const col = i % 4, row = Math.floor(i / 4); log(ctx, x - 58 + col * 36 + (row % 2) * 6, y - 42 - row * 8, 30, 8); }
  pill(ctx, x + 2, y - 72, `🪵 ${n} / ${g.counterCap}`, n >= g.counterCap ? '#c0392b' : 'rgba(20,30,45,0.75)');
  // 간판
  const sx = x + w / 2 + 14;
  ctx.fillStyle = PAL.woodDark; ctx.fillRect(sx - 3, y - 70, 6, 72);
  ctx.fillStyle = '#f5e6c8'; rrect(ctx, sx - 34, y - 96, 68, 30, 5);
  ctx.strokeStyle = PAL.woodDark; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.roundRect(sx - 34, y - 96, 68, 30, 5); ctx.stroke();
  ctx.fillStyle = PAL.ink; ctx.font = 'bold 13px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('목재 판매', sx, y - 81);
  pill(ctx, sx, y - 60, `$${g.price}/개`, '#27ae60', '#fff', 'bold 11px system-ui, sans-serif');
  // 계산원
  if (g.lv.cashier) {
    const c = CFG.counter.cashier;
    drawPerson(ctx, { x: c.x, y: c.y, facing: 1, moving: false, anim: 0, logs: 0, swing: 0 }, { coat: '#8e44ad', hat: '#f1c40f', pom: '#fff' });
  }
}

function drawDropZone(ctx, g, time) {
  const d = CFG.counter.drop;
  ctx.save(); ctx.translate(d.x, d.y); ctx.scale(1, 0.72);
  ctx.fillStyle = 'rgba(46,204,113,0.22)'; circle(ctx, 0, 0, d.r);
  ctx.strokeStyle = '#2ecc71'; ctx.lineWidth = 4; ctx.setLineDash([14, 10]); ctx.lineDashOffset = -time * 30;
  ctx.beginPath(); ctx.arc(0, 0, d.r, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
  ctx.restore();
  ctx.font = '26px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff'; ctx.fillText('🪵', d.x, d.y - 2);
  label(ctx, d.x, d.y + 22, '목재 내려놓기', 11, '#fff');
}

function drawHut(ctx, g, time) {
  const x = CFG.hut.x, y = CFG.hut.y;
  shadow(ctx, x, y + 28, 78, 18);
  // 벽(통나무 집)
  ctx.fillStyle = PAL.wood; ctx.fillRect(x - 62, y - 40, 124, 66);
  ctx.fillStyle = PAL.woodDark; for (let i = 0; i < 6; i++) ctx.fillRect(x - 62, y - 38 + i * 11, 124, 2);
  // 지붕
  ctx.fillStyle = '#5b3a1a'; tri(ctx, x - 76, y - 36, x, y - 100, x + 76, y - 36);
  ctx.fillStyle = '#f4f9fc'; tri(ctx, x - 70, y - 40, x, y - 98, x + 70, y - 40);
  ctx.fillStyle = '#6b4423'; ctx.beginPath(); ctx.moveTo(x - 70, y - 40); ctx.lineTo(x - 30, y - 60); ctx.lineTo(x + 30, y - 60); ctx.lineTo(x + 70, y - 40); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#f4f9fc'; tri(ctx, x - 40, y - 56, x, y - 92, x + 40, y - 56);
  // 굴뚝 + 연기
  ctx.fillStyle = '#7f8c8d'; ctx.fillRect(x + 34, y - 92, 14, 26);
  for (let i = 0; i < 3; i++) { const k = ((time * 0.5 + i * 0.33) % 1); ctx.fillStyle = `rgba(255,255,255,${0.6 * (1 - k)})`; circle(ctx, x + 41 + Math.sin(k * 6 + i) * 6, y - 96 - k * 40, 5 + k * 8); }
  // 문, 창
  ctx.fillStyle = '#4a2d12'; rrect(ctx, x - 14, y - 10, 28, 36, 4);
  ctx.fillStyle = '#ffd27d'; rrect(ctx, x + 26, y - 30, 22, 18, 3); rrect(ctx, x - 48, y - 30, 22, 18, 3);
  ctx.fillStyle = '#4a2d12'; ctx.fillRect(x + 36, y - 30, 2, 18); ctx.fillRect(x + 26, y - 22, 22, 2); ctx.fillRect(x - 38, y - 30, 2, 18); ctx.fillRect(x - 48, y - 22, 22, 2);
  label(ctx, x, y - 110, '🏠 본부', 13, '#fff');
  if (g.hut.hp < g.hut.maxhp) { bar(ctx, x - 50, y - 128, 100, 7, g.hut.hp / g.hut.maxhp, g.hut.hp / g.hut.maxhp < 0.35 ? '#e74c3c' : '#f39c12'); }
}

function drawCampfire(ctx, time) {
  const x = CFG.hut.x, y = CFG.hut.y + 70;
  shadow(ctx, x, y + 2, 20, 8);
  ctx.fillStyle = PAL.woodDark; ctx.save(); ctx.translate(x, y); ctx.rotate(0.5); rrect(ctx, -16, -3, 32, 6, 3); ctx.rotate(-1); rrect(ctx, -16, -3, 32, 6, 3); ctx.restore();
  for (let i = 0; i < 3; i++) {
    const k = (time * 2 + i * 0.7) % 1, h = 18 + Math.sin(time * 9 + i) * 4;
    ctx.fillStyle = i === 0 ? '#ff8c42' : i === 1 ? '#ffb347' : '#ffe08a';
    tri(ctx, x - 9 + i * 3, y - 2, x + (i - 1) * 4, y - h - i * 5, x + 9 - i * 3, y - 2);
  }
  ctx.fillStyle = 'rgba(255,170,60,0.12)'; circle(ctx, x, y - 6, 40);
}

function drawTower(ctx, g, time) {
  if (!g.lv.tower) return;
  const x = CFG.tower.x, y = CFG.tower.y;
  shadow(ctx, x, y + 4, 26, 9);
  ctx.strokeStyle = PAL.woodDark; ctx.lineWidth = 5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x - 22, y); ctx.lineTo(x - 13, y - 78); ctx.moveTo(x + 22, y); ctx.lineTo(x + 13, y - 78); ctx.stroke();
  ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - 19, y - 26); ctx.lineTo(x + 19, y - 26); ctx.moveTo(x - 17, y - 52); ctx.lineTo(x + 17, y - 52); ctx.stroke();
  ctx.fillStyle = PAL.wood; rrect(ctx, x - 24, y - 86, 48, 12, 3);
  ctx.fillStyle = PAL.woodLight; ctx.fillRect(x - 22, y - 100, 3, 14); ctx.fillRect(x + 19, y - 100, 3, 14); ctx.fillRect(x - 22, y - 100, 44, 2.5);
  ctx.fillStyle = '#5b3a1a'; tri(ctx, x - 30, y - 112, x, y - 134, x + 30, y - 112);
  ctx.fillStyle = '#f4f9fc'; tri(ctx, x - 24, y - 114, x, y - 132, x + 24, y - 114);
  // 궁수
  ctx.fillStyle = '#2c3e50'; rrect(ctx, x - 7, y - 110, 14, 14, 4); ctx.fillStyle = '#f1c9a5'; circle(ctx, 0 + x, y - 115, 6);
  ctx.fillStyle = '#e74c3c'; tri(ctx, x + 26, y - 134, x + 42, y - 128, x + 26, y - 122);
  ctx.fillStyle = PAL.woodDark; ctx.fillRect(x + 25, y - 136, 2, 24);
  pill(ctx, x, y - 146, `🏹 Lv${g.lv.tower}`, 'rgba(20,30,45,0.75)');
}

// 캠프 울타리: 둘레를 따라 말뚝을 세우고, 내구도가 깎이면 뒤쪽 말뚝부터 부서진다
const FENCE_SEGS = (() => {
  const C = CFG.camp, step = 40, segs = [];
  const pts = [];
  for (let x = C.x; x < C.x + C.w; x += step) pts.push([x, C.y, x + step, C.y]);
  for (let y = C.y; y < C.y + C.h; y += step) pts.push([C.x + C.w, y, C.x + C.w, y + step]);
  for (let x = C.x + C.w; x > C.x; x -= step) pts.push([x, C.y + C.h, x - step, C.y + C.h]);
  for (let y = C.y + C.h; y > C.y; y -= step) pts.push([C.x, y, C.x, y - step]);
  let seed = 3; const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  pts.forEach((p, i) => segs.push({ x1: p[0], y1: p[1], x2: p[2], y2: p[3], order: r(), gate: p[1] === C.y + C.h && p[0] > C.x + C.w / 2 - 40 && p[0] < C.x + C.w / 2 + 40 }));
  const sorted = segs.slice().sort((a, b) => a.order - b.order);
  sorted.forEach((s, i) => (s.rank = i / segs.length));
  return segs;
})();
function drawFenceSeg(ctx, s, k, broken) {
  const yTop = Math.min(s.y1, s.y2);
  if (broken) {
    ctx.save(); ctx.translate(s.x1, s.y1); ctx.rotate(0.6);
    ctx.fillStyle = PAL.woodDark; rrect(ctx, -3, -14, 6, 16, 2); ctx.restore();
    ctx.fillStyle = PAL.woodDark; rrect(ctx, (s.x1 + s.x2) / 2 - 10, (s.y1 + s.y2) / 2 - 2, 20, 4, 2);
    return;
  }
  const vertical = Math.abs(s.x2 - s.x1) < 1;
  ctx.strokeStyle = k < 0.4 ? '#5d3d1c' : vertical ? PAL.woodLight : PAL.wood; ctx.lineWidth = vertical ? 2.5 : 4; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(s.x1, s.y1 - 22); ctx.lineTo(s.x2, s.y2 - 22); ctx.moveTo(s.x1, s.y1 - 10); ctx.lineTo(s.x2, s.y2 - 10); ctx.stroke();
  ctx.fillStyle = PAL.woodDark; rrect(ctx, s.x1 - 3.5, s.y1 - 32, 7, 34, 2);
  ctx.fillStyle = '#f4f9fc'; rrect(ctx, s.x1 - 4, s.y1 - 34, 8, 4, 2);
}
function drawDecorFence(ctx, x1, y1, x2, y2) {
  const vertical = Math.abs(x2 - x1) < 1;
  ctx.strokeStyle = vertical ? PAL.woodLight : PAL.wood; ctx.lineWidth = vertical ? 2.5 : 3.5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x1, y1 - 18); ctx.lineTo(x2, y2 - 18); ctx.moveTo(x1, y1 - 8); ctx.lineTo(x2, y2 - 8); ctx.stroke();
  ctx.fillStyle = PAL.woodDark; rrect(ctx, x1 - 3, y1 - 26, 6, 28, 2); ctx.fillStyle = '#f4f9fc'; rrect(ctx, x1 - 3.5, y1 - 28, 7, 3.5, 2);
}

function drawPad(ctx, g, u, time) {
  const x = u.pad.x, y = u.pad.y, r = CFG.pad.r;
  const cost = g.padCost(u), paid = g.paid[u.id] || 0, k = paid / cost;
  const active = g.activePad === u.id, afford = g.money + paid >= cost - 1e-6;
  ctx.save(); ctx.translate(x, y); ctx.scale(1, 0.74);
  ctx.fillStyle = active ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.55)'; circle(ctx, 0, 0, r);
  ctx.strokeStyle = afford ? '#27ae60' : 'rgba(60,90,130,0.45)'; ctx.lineWidth = active ? 5 : 3;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
  if (k > 0) { ctx.strokeStyle = '#27ae60'; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(0, 0, r - 4, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2); ctx.stroke(); }
  if (afford) { ctx.strokeStyle = `rgba(39,174,96,${0.35 + Math.sin(time * 5) * 0.25})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, r + 8, 0, Math.PI * 2); ctx.stroke(); }
  ctx.restore();
  ctx.font = '24px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#000'; ctx.fillText(u.icon, x, y - 4);
  pill(ctx, x, y + 20, '$' + fmtMoney(Math.ceil(cost - paid)), afford ? '#27ae60' : '#34495e', '#fff', 'bold 11px system-ui, sans-serif');
  const lv = g.lv[u.id];
  label(ctx, x, y - 44, u.name + (u.id !== 'repair' && lv > 0 ? ` Lv${lv}` : ''), 11, '#fff');
  if (active) label(ctx, x, y - 60, u.desc, 10, '#ffe08a');
}

function fmtMoney(n) {
  n = Math.floor(n);
  if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + 'M';
  if (n >= 1e4) return (n / 1e3).toFixed(n >= 1e5 ? 0 : 1) + 'K';
  return n.toLocaleString('en-US');
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

function drawArrow(ctx, a) {
  ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(a.ang || 0);
  ctx.strokeStyle = PAL.woodDark; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(8, 0); ctx.stroke();
  ctx.fillStyle = '#d6dde6'; tri(ctx, 8, -3, 13, 0, 8, 3);
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

// 메인 렌더
function render(ctx, g, cam, time, dtv, js) {
  const { w, h, scale, dpr } = cam;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  const shakeX = g.shake > 0 ? (Math.random() - 0.5) * 8 * g.shake : 0, shakeY = g.shake > 0 ? (Math.random() - 0.5) * 8 * g.shake : 0;
  ctx.setTransform(scale * dpr, 0, 0, scale * dpr, (w / 2 - cam.x * scale + shakeX) * dpr, (h / 2 - cam.y * scale + shakeY) * dpr);
  const view = { x0: cam.x - w / 2 / scale, x1: cam.x + w / 2 / scale, y0: cam.y - h / 2 / scale, y1: cam.y + h / 2 / scale };
  const vis = (x, y, m) => x > view.x0 - m && x < view.x1 + m && y > view.y0 - m && y < view.y1 + m;

  drawGround(ctx, view);
  // 바닥에 붙은 것들
  drawDropZone(ctx, g, time);
  if (g.lv.tower && g.bears.length) { ctx.strokeStyle = 'rgba(231,76,60,0.25)'; ctx.lineWidth = 2; ctx.setLineDash([8, 8]); ctx.beginPath(); ctx.ellipse(CFG.tower.x, CFG.tower.y, g.towerRange, g.towerRange * 0.74, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); }
  for (const u of UPG) if (g.padVisible(u) && vis(u.pad.x, u.pad.y, 80)) drawPad(ctx, g, u, time);
  for (const b of g.bills) if (b.state === 'ground' && b.z <= 0.5 && vis(b.x, b.y, 30)) drawBill(ctx, b);

  // 높이가 있는 것들을 y 기준으로 정렬
  const items = [];
  const F = CFG.forest.rect;
  for (let x = F.x; x < F.x + F.w; x += 40) items.push({ y: F.y, f: () => drawDecorFence(ctx, x, F.y, Math.min(x + 40, F.x + F.w), F.y) });
  for (let y = F.y; y < F.y + F.h; y += 40) { items.push({ y: y + 40, f: () => drawDecorFence(ctx, F.x, y + 40, F.x, y) }); items.push({ y: y + 40, f: () => drawDecorFence(ctx, F.x + F.w, y + 40, F.x + F.w, y) }); }
  for (let x = F.x; x < F.x + F.w; x += 40) { if (x > F.x + F.w / 2 - 60 && x < F.x + F.w / 2 + 20) continue; items.push({ y: F.y + F.h, f: () => drawDecorFence(ctx, x, F.y + F.h, Math.min(x + 40, F.x + F.w), F.y + F.h) }); }
  const fk = g.fence.hp / g.fence.maxhp;
  for (const s of FENCE_SEGS) { if (s.gate) continue; const broken = s.rank >= fk - 1e-6 && fk < 1; items.push({ y: Math.max(s.y1, s.y2), f: () => drawFenceSeg(ctx, s, fk, broken || fk <= 0) }); }
  for (const t of g.trees) if (t.active && vis(t.x, t.y, 120)) items.push({ y: t.y, f: () => drawTree(ctx, t, time) });
  items.push({ y: CFG.counter.y + 10, f: () => drawCounter(ctx, g, time) });
  items.push({ y: CFG.hut.y + 26, f: () => drawHut(ctx, g, time) });
  items.push({ y: CFG.hut.y + 70, f: () => drawCampfire(ctx, time) });
  items.push({ y: CFG.tower.y, f: () => drawTower(ctx, g, time) });
  const p = g.player;
  items.push({ y: p.y, f: () => {
    drawPerson(ctx, p, { coat: '#e8d9b8', pants: '#4a3b2a', hood: '#c9b48e', beard: '#f4f4f4', tool: 'axe', belt: '#7a5230' });
    if (p.logs > 0 || p.tree) pill(ctx, p.x, p.y - 84 - Math.min(p.logs, 7) * 7, `🪵 ${p.logs}/${g.carryCap}`, 'rgba(20,30,45,0.7)');
    if (p.tree && p.chopT > 0) bar(ctx, p.x - 18, p.y - 76, 36, 4, p.chopT / (CFG.player.chopTime * g.chopMul), '#f1c40f');
  } });
  for (const wk of g.workers) items.push({ y: wk.y, f: () => drawPerson(ctx, wk, { coat: '#d35400', vest: '#f39c12', hat: '#f1c40f', pom: '#fff', tool: 'axe' }) });
  for (const gd of g.guards) items.push({ y: gd.y, f: () => drawPerson(ctx, gd, { coat: '#2c3e50', pants: '#1b2631', helmet: '#95a5a6', hat: '#34495e', tool: 'spear' }) });
  for (const c of g.customers) if (vis(c.x, c.y, 80)) items.push({ y: c.y, f: () => {
    if (c.big) { drawSled(ctx, c); drawPerson(ctx, { ...c, logs: 0 }, { coat: c.coat, pants: '#3b2a1a', hat: '#8b1e1e', pom: '#fff', beard: '#d9c7a8' }); }
    else drawPerson(ctx, c, { coat: c.coat, pants: '#2b3a55', hat: '#1f4e79', pom: '#fff', hood: null });
    if (c.state === 'queue' && c.wait) drawBubble(ctx, c.x, c.y - 92, c.serveT > 0 || g.counter.logs >= c.want ? `${c.big ? '🛷' : '🪵'} ×${c.want}${c.big ? ` ($${g.price * c.mul}/개)` : ''}` : (c.patience < 12 ? '😠' : '…'));
    else if (c.mood > 0 && c.state === 'leave') drawBubble(ctx, c.x, c.y - 92, '😊');
  } });
  for (const b of g.bears) items.push({ y: b.y, f: () => drawEnemy(ctx, b, time) });
  items.sort((a, b) => a.y - b.y);
  for (const it of items) it.f();

  // 위에 떠 있는 것들
  for (const b of g.bills) if (!(b.state === 'ground' && b.z <= 0.5)) drawBill(ctx, b);
  for (const a of g.arrows) drawArrow(ctx, a);
  for (const c of g.chips) { ctx.fillStyle = PAL.grain; ctx.fillRect(c.x - 2.5, c.y - 2.5, 5, 5); }
  if (g.activePad && g.padFlow > 0) { // 결제 중 지폐가 날아가는 연출
    const u = UPG.find(u => u.id === g.activePad);
    for (let i = 0; i < 3; i++) { const k = (time * 2.2 + i / 3) % 1; const bx = lerp(p.x, u.pad.x, k), by = lerp(p.y - 40, u.pad.y, k) - Math.sin(k * Math.PI) * 30; drawBill(ctx, { x: bx, y: by, z: 0, rot: k * 6, state: 'fly' }); }
  }
  for (const t of g.texts) { const k = t.t / t.life; ctx.globalAlpha = 1 - k * k; label(ctx, t.x, t.y, t.text, 14, t.color); ctx.globalAlpha = 1; }
  // 안내 화살표
  const hint = HINTS[g.tutorial];
  if (hint) {
    const tg = hint.target(); const dx = tg.x - p.x, dy = tg.y - p.y, d = Math.hypot(dx, dy);
    if (d > 90) { const ax = p.x + (dx / d) * 48, ay = p.y - 20 + (dy / d) * 48, ang = Math.atan2(dy, dx);
      ctx.save(); ctx.translate(ax, ay); ctx.rotate(ang); ctx.fillStyle = '#ffd166'; tri(ctx, -8, -9, 10 + Math.sin(time * 8) * 3, 0, -8, 9); ctx.restore(); }
  }
  // 곰이 화면 밖에 있으면 가장자리에 표시
  for (const b of g.bears) {
    if (vis(b.x, b.y, -20)) continue;
    const cx = clamp(b.x, view.x0 + 30, view.x1 - 30), cy = clamp(b.y, view.y0 + 90, view.y1 - 40);
    ctx.font = '26px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#000'; ctx.fillText(ENEMY[b.type].emoji, cx, cy);
    ctx.fillStyle = '#e74c3c'; const ang = Math.atan2(b.y - cy, b.x - cx); ctx.save(); ctx.translate(cx + Math.cos(ang) * 22, cy + Math.sin(ang) * 22); ctx.rotate(ang); tri(ctx, -5, -6, 6, 0, -5, 6); ctx.restore();
  }

  // 화면 공간: 눈, 경고, 조이스틱
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
  drawJoystick(ctx, js, dpr);
}
