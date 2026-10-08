// 눈보라 벌목장 — 게임 로직. 화면(canvas)에 의존하지 않아서 밸런스 시뮬레이션에도 쓴다.
'use strict';

const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const rnd = (a, b) => a + Math.random() * (b - a);
const rndi = (a, b) => Math.floor(rnd(a, b + 1));
const inRect = (x, y, r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;

function moveToward(e, tx, ty, speed, dt) {
  const dx = tx - e.x, dy = ty - e.y;
  const d = Math.hypot(dx, dy);
  if (d < 0.5) { e.x = tx; e.y = ty; return true; }
  const step = speed * dt;
  if (Math.abs(dx) > 0.5) e.facing = dx < 0 ? -1 : 1;
  e.moving = true;
  if (step >= d) { e.x = tx; e.y = ty; return true; }
  e.x += (dx / d) * step; e.y += (dy / d) * step;
  return false;
}

// 서로 겹치지 않게 살짝 밀어낸다
function separate(list, r, k) {
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i], b = list[j];
      let dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
      if (d >= r) continue;
      if (d < 0.01) { dx = Math.random() - 0.5; dy = Math.random() - 0.5; d = Math.hypot(dx, dy); }
      const push = ((r - d) / d) * 0.5 * k;
      a.x -= dx * push; a.y -= dy * push; b.x += dx * push; b.y += dy * push;
    }
  }
}

function pushOutRect(e, r, rect) {
  const cx = clamp(e.x, rect.x, rect.x + rect.w), cy = clamp(e.y, rect.y, rect.y + rect.h);
  let dx = e.x - cx, dy = e.y - cy;
  let d = Math.hypot(dx, dy);
  if (d >= r) return;
  if (d < 0.01) { // 안쪽에 있으면 가장 가까운 변으로
    const l = e.x - rect.x, rr = rect.x + rect.w - e.x, t = e.y - rect.y, b = rect.y + rect.h - e.y;
    const m = Math.min(l, rr, t, b);
    if (m === l) e.x = rect.x - r; else if (m === rr) e.x = rect.x + rect.w + r;
    else if (m === t) e.y = rect.y - r; else e.y = rect.y + rect.h + r;
    return;
  }
  e.x = cx + (dx / d) * r; e.y = cy + (dy / d) * r;
}

const COUNTER_RECT = { x: CFG.counter.x - CFG.counter.w / 2, y: CFG.counter.y - 38, w: CFG.counter.w, h: 44 };
const HUT_RECT = { x: CFG.hut.x - 62, y: CFG.hut.y - 30, w: 124, h: 56 };
const CUSTOMER_COATS = ['#3b82c4', '#2f6fb0', '#4a90d9', '#346fa8', '#5aa0e0'];

class Game {
  constructor(opts = {}) {
    this.meta = Object.assign({ snowflakes: 0, bestWave: 0, bestEarned: 0, runs: 0 }, opts.meta || {});
    this.input = { x: 0, y: 0 };
    this.events = [];
    this.newRun(opts.run || null);
  }

  // ---- 파생 수치 ----
  get bonus() { return 1 + this.meta.snowflakes * CFG.meta.bonusPer; }
  get price() { return Math.round(CFG.price.base * Math.pow(CFG.price.growth, this.lv.price) * this.bonus); }
  get chopMul() { return Math.max(0.09, Math.pow(0.89, this.lv.axe)); }
  get workerCarry() { return CFG.worker.carry + Math.floor(this.lv.bag / 2); }
  get counterCap() { return CFG.counter.cap + 10 * this.lv.promo; }
  get wantMax() { return CFG.customer.wantMax + Math.floor(this.lv.promo / 3); }
  get carryCap() { return CFG.player.carry + CFG.player.carryPerBag * this.lv.bag; }
  get playerSpeed() { return CFG.player.speed * (1 + 0.1 * this.lv.shoes); }
  get custInterval() { return Math.max(CFG.customer.minInterval, CFG.customer.interval * Math.pow(CFG.customer.intervalMul, this.lv.promo)); }
  get atkDmg() { return CFG.player.atkDmg + CFG.weapon.dmgPer * this.lv.weapon; }
  get guardDmg() { return CFG.guard.dmg + CFG.weapon.dmgPer * this.lv.weapon; }
  get towerDmg() { return CFG.tower.dmg + CFG.tower.dmgPer * this.lv.tower; }
  get towerRange() { return CFG.tower.range + CFG.tower.rangePer * this.lv.tower; }
  get treeCount() { return Math.min(CFG.forest.base + CFG.forest.perLevel * this.lv.forest, FOREST_SPOTS.length); }
  get timeToWave() { return Math.max(0, this.wave.nextAt - this.t); }
  fenceMax(l) { return Math.round(CFG.fence.baseHP * Math.pow(CFG.fence.growth, l)); }
  hutMax(l) { return CFG.hut.hp + CFG.hut.hpPerFence * l; }
  bearCount(n) { return 1 + Math.floor((n - 1) / 4); }
  // 웨이브 구성: 곰은 늘 나오고, 4웨이브부터 3의 배수 웨이브엔 늑대 무리, 10의 배수 웨이브엔 설인 보스
  waveComposition(n) {
    const out = [];
    for (let i = 0; i < this.bearCount(n); i++) out.push('bear');
    if (n >= 4 && n % 3 === 0) for (let i = 0; i < 2 + Math.floor(n / 6); i++) out.push('wolf');
    if (n >= 10 && n % 10 === 0) out.push('yeti');
    return out;
  }
  waveSummary(n) {
    const c = {}; for (const t of this.waveComposition(n)) c[t] = (c[t] || 0) + 1;
    return Object.entries(c).map(([t, k]) => `${ENEMY[t].emoji} ${ENEMY[t].name} ${k}`).join(' · ');
  }
  bearHP(n) { return Math.round(CFG.wave.hp * Math.pow(CFG.wave.hpGrowth, n - 1)); }
  bearDmg(n) { return CFG.wave.dmg * Math.pow(CFG.wave.dmgGrowth, n - 1); }
  bounty(n) { return Math.round(CFG.wave.bounty * Math.pow(CFG.wave.bountyGrowth, n - 1) * this.bonus); }

  emit(type, x, y, extra) { this.events.push({ type, x, y, extra }); }
  text(x, y, text, color, life) { this.texts.push({ x, y, text, color: color || '#fff', t: 0, life: life || 1 }); }

  // ---- 새 판 / 저장 복원 ----
  newRun(saved) {
    const s = saved || {};
    this.t = s.t || 0;
    this.money = s.money || 0;
    this.earned = s.earned || 0;
    this.over = false;
    this.lastResult = null;
    this.lv = {};
    for (const u of UPG) this.lv[u.id] = (s.lv && s.lv[u.id]) || 0;
    this.paid = Object.assign({}, s.paid || {});
    this.fence = { maxhp: this.fenceMax(this.lv.fence) };
    this.fence.hp = s.fenceHp != null ? Math.min(s.fenceHp, this.fence.maxhp) : this.fence.maxhp;
    this.hut = { x: CFG.hut.x, y: CFG.hut.y, maxhp: this.hutMax(this.lv.fence) };
    this.hut.hp = s.hutHp != null ? Math.max(1, Math.min(s.hutHp, this.hut.maxhp)) : this.hut.maxhp;
    this.wave = { n: s.waveN || 0, nextAt: s.waveNextAt != null ? s.waveNextAt : CFG.wave.first, warned: false, active: false };
    if (this.wave.nextAt < this.t + 20) this.wave.nextAt = this.t + 30;   // 습격 도중 저장됐으면 잠시 유예
    this.counter = { x: CFG.counter.x, y: CFG.counter.y, logs: s.counterLogs || 0 };
    this.player = { x: CFG.player.x, y: CFG.player.y, logs: s.playerLogs || 0, chopT: 0, atkT: 0, dropT: 0,
                    facing: 1, moving: false, anim: 0, swing: 0, tree: null, fullT: 0 };
    this.trees = FOREST_SPOTS.map((p, i) => ({ x: p.x, y: p.y, logs: CFG.tree.logs, regrowT: 0, user: null, i, active: true }));
    this.workers = []; for (let i = 0; i < this.lv.worker; i++) this.addWorker();
    this.guards = []; for (let i = 0; i < this.lv.guard; i++) this.addGuard();
    this.customers = []; this.custT = 3; this.bigT = CFG.customer.bigEvery * 0.6;
    this.bears = []; this.arrows = []; this.bills = []; this.texts = []; this.chips = [];
    this.tutorial = s.tutorial || 0;
    this.stats = Object.assign({ sales: 0, chops: 0, kills: 0 }, s.stats || {});
    this.activePad = null; this.padFlow = 0; this.towerT = 0; this.shake = 0;
  }

  serialize() {
    return {
      t: this.t, money: this.money, earned: this.earned, lv: this.lv, paid: this.paid,
      fenceHp: this.fence.hp, hutHp: this.hut.hp, waveN: this.wave.n, waveNextAt: this.wave.nextAt,
      counterLogs: this.counter.logs, playerLogs: this.player.logs, tutorial: this.tutorial, stats: this.stats,
    };
  }

  // 자리를 비운 동안 벌목꾼이 번 돈(수요와 생산 중 작은 쪽, 효율 60%)
  applyOffline(seconds) {
    const s = Math.min(seconds, CFG.offline.cap);
    if (s < CFG.offline.min || this.lv.worker === 0 || this.over) return 0;
    const W = CFG.worker, cap = this.workerCarry;
    const cycle = cap * CFG.player.chopTime * W.chopMul * this.chopMul + 9;
    const prod = this.lv.worker * cap / cycle;
    const demand = ((CFG.customer.wantMin + this.wantMax) / 2) / this.custInterval;
    const rate = Math.min(prod, demand) * this.price * (this.lv.cashier ? 1 : 0.7);
    const gain = Math.floor(rate * s * CFG.offline.eff);
    this.money += gain; this.earned += gain;
    return gain;
  }

  addWorker() {
    const i = this.workers.length;
    this.workers.push({ x: CFG.counter.drop.x - 40, y: CFG.counter.drop.y + 40 + i * 6, logs: 0, state: 'find', target: null,
                        chopT: 0, dropT: 0, facing: 1, moving: false, anim: 0, swing: 0, i });
  }
  addGuard() {
    const i = this.guards.length;
    const p = GUARD_POSTS[i % GUARD_POSTS.length];
    this.guards.push({ x: p.x, y: p.y, post: p, atkT: 0, swing: 0, facing: 1, moving: false, anim: 0, i });
  }

  // ---- 메인 업데이트 ----
  update(dt) {
    if (this.over) return;
    this.t += dt;
    this.updatePlayer(dt);
    this.updateTrees(dt);
    this.updateWorkers(dt);
    this.updateCustomers(dt);
    this.updateBills(dt);
    this.updatePads(dt);
    this.updateWaves(dt);
    this.updateBears(dt);
    if (this.over) return;
    this.updateGuards(dt);
    this.updateTower(dt);
    this.updateArrows(dt);
    this.bears = this.bears.filter(b => !b.dead);
    this.updateFx(dt);
    this.updateTutorial();
  }

  nearestTree(x, y, range, who) {
    let best = null, bd = range;
    for (const t of this.trees) {
      if (!t.active || t.logs <= 0) continue;
      if (t.user && t.user !== who) continue;
      const d = dist(x, y, t.x, t.y);
      if (d < bd) { bd = d; best = t; }
    }
    return best;
  }
  nearestBear(x, y, range) {
    let best = null, bd = range;
    for (const b of this.bears) {
      if (b.dead) continue;
      const d = dist(x, y, b.x, b.y);
      if (d < bd) { bd = d; best = b; }
    }
    return best;
  }

  collide(e, r) {
    for (const t of this.trees) {
      if (!t.active) continue;
      const ty = t.y + 2, d = dist(e.x, e.y, t.x, ty), min = r + 11;
      if (d < min && d > 0.01) { e.x += ((e.x - t.x) / d) * (min - d); e.y += ((e.y - ty) / d) * (min - d); }
    }
    pushOutRect(e, r, COUNTER_RECT);
    pushOutRect(e, r, HUT_RECT);
  }

  chop(tree, who) {
    tree.logs--; who.logs++; this.stats.chops++;
    if (tree.logs <= 0) { tree.regrowT = CFG.tree.regrow; if (tree.user) tree.user.target = null; tree.user = null; }
    for (let i = 0; i < 5; i++) this.chips.push({ x: tree.x, y: tree.y - 20, vx: rnd(-90, 90), vy: rnd(-160, -40), z: 0, t: 0 });
    this.emit('chop', tree.x, tree.y);
  }

  updatePlayer(dt) {
    const p = this.player;
    let ix = this.input.x, iy = this.input.y;
    const len = Math.hypot(ix, iy);
    if (len > 1) { ix /= len; iy /= len; }
    p.moving = len > 0.08;
    if (p.moving) {
      p.x += ix * this.playerSpeed * dt; p.y += iy * this.playerSpeed * dt;
      if (Math.abs(ix) > 0.15) p.facing = ix < 0 ? -1 : 1;
      p.anim += dt * 11;
    }
    this.collide(p, 13);
    p.x = clamp(p.x, 18, CFG.world.w - 18); p.y = clamp(p.y, 30, CFG.world.h - 14);

    p.atkT -= dt; p.swing = Math.max(0, p.swing - dt * 4); p.fullT = Math.max(0, p.fullT - dt);
    const bear = this.nearestBear(p.x, p.y, CFG.player.atkRange);
    if (bear) {
      p.chopT = 0; p.tree = null;
      if (p.atkT <= 0) { p.atkT = CFG.player.atkCd; p.swing = 1; p.facing = bear.x < p.x ? -1 : 1; this.hitBear(bear, this.atkDmg, 'player'); }
    } else {
      const tree = this.nearestTree(p.x, p.y, CFG.tree.range, p);
      if (tree && p.logs < this.carryCap) {
        if (p.tree !== tree) { p.tree = tree; p.chopT = 0; }
        p.facing = tree.x < p.x ? -1 : 1;
        p.chopT += dt;
        const need = CFG.player.chopTime * this.chopMul;
        if (p.chopT >= need) { p.chopT -= need; p.swing = 1; this.chop(tree, p); }
      } else {
        if (tree && p.logs >= this.carryCap && p.fullT <= 0) { p.fullT = 1.5; this.text(p.x, p.y - 80, '가득 찼어요!', '#ffd166', 1.2); }
        p.tree = null; p.chopT = 0;
      }
    }
    const dz = CFG.counter.drop;
    if (p.logs > 0 && dist(p.x, p.y, dz.x, dz.y) < dz.r) {
      p.dropT += dt;
      while (p.dropT >= CFG.counter.dropRate && p.logs > 0 && this.counter.logs < this.counterCap) {
        p.dropT -= CFG.counter.dropRate; p.logs--; this.counter.logs++; this.emit('drop', dz.x, dz.y);
      }
      if (this.counter.logs >= this.counterCap && p.fullT <= 0) { p.fullT = 2; this.text(dz.x, dz.y - 70, '판매대가 가득!', '#ffd166', 1.2); }
    } else p.dropT = 0;
  }

  updateTrees(dt) {
    const n = this.treeCount;
    for (const t of this.trees) {
      t.active = t.i < n;
      if (!t.active) continue;
      if (t.logs <= 0) { t.regrowT -= dt; if (t.regrowT <= 0) { t.logs = CFG.tree.logs; t.regrowT = 0; } }
    }
  }

  pickTree(w) {
    let best = null, bd = Infinity;
    for (const t of this.trees) {
      if (!t.active || t.logs <= 0 || t.user) continue;
      const d = dist(w.x, w.y, t.x, t.y);
      if (d < bd) { bd = d; best = t; }
    }
    return best;
  }

  updateWorkers(dt) {
    const W = CFG.worker, cap = this.workerCarry;
    for (const w of this.workers) {
      w.moving = false; w.swing = Math.max(0, w.swing - dt * 4);
      if (w.state === 'find') {
        if (w.logs >= cap) { w.state = 'toCounter'; continue; }
        const tree = this.pickTree(w);
        if (tree) { tree.user = w; w.target = tree; w.state = 'toTree'; }
        else if (w.logs > 0) w.state = 'toCounter';
        else moveToward(w, W.idle.x + (w.i % 3) * 28, W.idle.y + Math.floor(w.i / 3) * 30, W.speed, dt);
      } else if (w.state === 'toTree') {
        const t = w.target;
        if (!t || t.logs <= 0 || t.user !== w) { if (t && t.user === w) t.user = null; w.target = null; w.state = 'find'; continue; }
        if (moveToward(w, t.x + 28, t.y + 8, W.speed, dt)) { w.state = 'chop'; w.chopT = 0; }
      } else if (w.state === 'chop') {
        const t = w.target;
        if (!t || t.logs <= 0) { w.target = null; w.state = 'find'; continue; }
        w.facing = -1;
        w.chopT += dt;
        const need = CFG.player.chopTime * W.chopMul * this.chopMul;
        if (w.chopT >= need) {
          w.chopT -= need; w.swing = 1; this.chop(t, w);
          if (w.logs >= cap) { if (t.user === w) t.user = null; w.target = null; w.state = 'toCounter'; }
          else if (t.logs <= 0) { w.target = null; w.state = 'find'; }
        }
      } else if (w.state === 'toCounter') {
        const dz = CFG.counter.drop, ang = (w.i / 6) * Math.PI * 2;
        if (moveToward(w, dz.x + Math.cos(ang) * 24, dz.y + Math.sin(ang) * 18, W.speed, dt)) { w.state = 'drop'; w.dropT = 0; }
      } else if (w.state === 'drop') {
        w.dropT += dt;
        while (w.dropT >= W.dropRate && w.logs > 0 && this.counter.logs < this.counterCap) { w.dropT -= W.dropRate; w.logs--; this.counter.logs++; this.emit('drop', w.x, w.y); }
        if (w.logs === 0) w.state = 'find';
      }
      if (w.moving) w.anim += dt * 11;
    }
  }

  updateCustomers(dt) {
    const C = CFG.customer;
    this.custT -= dt;
    let qlen = 0;
    for (const c of this.customers) if (c.state === 'queue') qlen++;
    if (this.custT <= 0) {
      this.custT = this.custInterval * rnd(0.7, 1.3);
      if (qlen < C.queue.max) {
        this.customers.push({ x: C.spawn.x, y: C.spawn.y + rnd(-10, 10), want: rndi(C.wantMin, this.wantMax), state: 'queue', serveT: 0,
                              patience: C.patience, logs: 0, coat: CUSTOMER_COATS[rndi(0, CUSTOMER_COATS.length - 1)],
                              facing: -1, moving: false, anim: 0, mood: 0, wait: false, big: false, mul: 1 });
      }
    }
    // 대량 구매자: 썰매를 끌고 와서 한 번에 많이, 비싸게 사 간다
    this.bigT -= dt;
    if (this.t > C.bigAfter && this.bigT <= 0) {
      this.bigT = C.bigEvery * rnd(0.8, 1.2);
      if (qlen < C.queue.max) {
        const want = 8 + Math.floor(this.wave.n / 2) + Math.floor(this.lv.promo / 2);
        this.customers.push({ x: C.spawn.x, y: C.spawn.y, want, state: 'queue', serveT: 0, patience: C.bigPatience, logs: 0, coat: '#7a4b2a',
                              facing: -1, moving: false, anim: 0, mood: 0, wait: false, big: true, mul: C.bigMul });
        this.text(C.queue.x + 60, C.queue.y - 40, `🛷 대량 구매자! 통나무 ${want}개를 ${C.bigMul}배 가격에`, '#ffd166', 2.5);
        this.emit('big', C.spawn.x, C.spawn.y);
      }
    }
    let qi = 0;
    for (const c of this.customers) {
      c.moving = false;
      if (c.state === 'queue') {
        const tx = C.queue.x + C.queue.dx * C.queue.gap * qi, ty = C.queue.y + C.queue.dy * C.queue.gap * qi;
        const arrived = moveToward(c, tx, ty, C.speed, dt);
        c.wait = arrived;
        if (arrived) c.facing = -1;
        if (qi === 0 && arrived) {
          if (this.counter.logs >= c.want) {
            c.serveT += dt;
            if (c.serveT >= (this.lv.cashier ? C.serveCashier : C.serve)) this.sell(c);
          } else {
            c.patience -= dt;
            if (c.patience <= 0) { c.state = 'leave'; c.mood = -1; this.text(c.x, c.y - 70, '😠 그냥 갈래요', '#ff8a80', 1.4); this.emit('angry', c.x, c.y); }
          }
        }
        qi++;
      } else if (c.state === 'leave') {
        if (moveToward(c, C.exit.x, C.exit.y + (c.mood < 0 ? -40 : 0), C.speed, dt)) c.dead = true;
      }
      if (c.moving) c.anim += dt * 11;
    }
    this.customers = this.customers.filter(c => !c.dead);
  }

  sell(c) {
    this.counter.logs -= c.want; c.logs = c.want; c.state = 'leave'; c.mood = 1; c.serveT = 0;
    this.stats.sales++;
    const M = CFG.counter.moneySpot;
    this.spawnBills(Math.round(c.want * this.price * (c.mul || 1)), M.x, M.y, 48, 16);
    this.emit('sell', c.x, c.y);
  }

  spawnBills(amount, x, y, sx, sy) {
    const n = amount >= 40 ? 3 : amount >= 12 ? 2 : 1;
    const base = Math.floor(amount / n);
    for (let i = 0; i < n; i++) {
      const a = i === n - 1 ? amount - base * (n - 1) : base;
      if (this.bills.length >= 45) { this.bills[this.bills.length - 1].amount += a; continue; }
      this.bills.push({ x: x + rnd(-sx, sx), y: y + rnd(-sy, sy), z: 36, vz: rnd(20, 60), amount: a, state: 'ground', rot: rnd(-0.6, 0.6), t: 0 });
    }
  }

  updateBills(dt) {
    const p = this.player, CA = CFG.counter.cashier;
    for (const b of this.bills) {
      b.t += dt;
      if (b.state === 'ground') {
        if (b.z > 0 || b.vz !== 0) { b.vz -= 420 * dt; b.z += b.vz * dt; if (b.z <= 0) { b.z = 0; b.vz = 0; } }
        if (dist(b.x, b.y, p.x, p.y) < CFG.player.pickup) b.state = 'fly';
        else if (this.lv.cashier && b.t > 0.9) b.state = 'auto';
      } else {
        const tx = b.state === 'fly' ? p.x : CA.x, ty = b.state === 'fly' ? p.y - 30 : CA.y - 30;
        const k = 1 - Math.pow(0.0005, dt);
        const d = dist(b.x, b.y, tx, ty);
        const step = Math.max(d * k, 380 * dt);
        if (step >= d) { b.x = tx; b.y = ty; } else { b.x += ((tx - b.x) / d) * step; b.y += ((ty - b.y) / d) * step; }
        b.z += (20 - b.z) * k;
        if (dist(b.x, b.y, tx, ty) < 6) { b.dead = true; this.addMoney(b.amount, tx, ty); }
      }
    }
    this.bills = this.bills.filter(b => !b.dead);
  }

  addMoney(a, x, y) {
    this.money += a; this.earned += a;
    this.text(x + rnd(-10, 10), y - 20, '+$' + a, '#7CFC9A', 0.9);
    this.emit('coin', x, y);
  }

  // ---- 업그레이드 결제 원 ----
  padCost(u) {
    if (u.id === 'repair') return Math.max(1, Math.ceil((this.hut.maxhp - this.hut.hp) * (2 + this.wave.n * 0.4)));
    return u.cost(this.lv[u.id]);
  }
  padVisible(u) {
    if (u.id !== 'repair' && this.lv[u.id] >= u.max) return false;
    return u.unlock(this);
  }
  updatePads(dt) {
    const p = this.player;
    this.activePad = null; this.padFlow = Math.max(0, this.padFlow - dt * 3);
    for (const u of UPG) {
      if (!this.padVisible(u)) { if (u.id === 'repair') this.paid.repair = 0; continue; }
      if (dist(p.x, p.y, u.pad.x, u.pad.y) > CFG.pad.r) continue;
      this.activePad = u.id;
      const cost = this.padCost(u), paid = this.paid[u.id] || 0;
      if (this.money < 0.01) continue;
      const rate = Math.max(CFG.pad.minRate, cost * CFG.pad.rateMul);
      const amt = Math.min(this.money, rate * dt, cost - paid);
      if (amt <= 0) continue;
      this.money -= amt; this.paid[u.id] = paid + amt; this.padFlow = 1;
      if (this.paid[u.id] >= cost - 1e-6) { this.paid[u.id] = 0; this.buy(u); }
    }
  }
  buy(u) {
    if (u.id === 'repair') { this.hut.hp = this.hut.maxhp; this.text(u.pad.x, u.pad.y - 50, '본부 수리 완료!', '#7CFC9A', 1.3); this.emit('buy', u.pad.x, u.pad.y, u); return; }
    this.lv[u.id]++;
    if (u.id === 'worker') this.addWorker();
    else if (u.id === 'guard') this.addGuard();
    else if (u.id === 'fence') {
      const nm = this.fenceMax(this.lv.fence); this.fence.hp += nm - this.fence.maxhp; this.fence.maxhp = nm;
      const hm = this.hutMax(this.lv.fence); this.hut.hp += hm - this.hut.maxhp; this.hut.maxhp = hm;
    }
    this.text(u.pad.x, u.pad.y - 50, `${u.icon} ${u.name} Lv${this.lv[u.id]}`, '#fff', 1.4);
    this.emit('buy', u.pad.x, u.pad.y, u);
  }

  // ---- 습격 ----
  updateWaves(dt) {
    const W = CFG.wave, w = this.wave;
    if (w.active) {
      if (this.bears.length === 0) {
        w.active = false; w.warned = false;
        w.nextAt = this.t + W.interval + W.intervalPer * w.n;
        if (w.n > this.meta.bestWave) this.meta.bestWave = w.n;
        this.text(this.hut.x, this.hut.y - 120, `${w.n}차 습격 격퇴! 🎉`, '#7CFC9A', 2);
        this.emit('clear', this.hut.x, this.hut.y);
      }
      return;
    }
    if (!w.warned && this.t >= w.nextAt - W.warn) { w.warned = true; this.emit('warn'); }
    if (this.t >= w.nextAt) {
      w.n++; w.active = true;
      for (const type of this.waveComposition(w.n)) this.spawnBear(w.n, type);
      this.emit('wave', this.hut.x, this.hut.y, w.n);
    }
  }
  spawnBear(n, type) {
    const E = ENEMY[type || 'bear'];
    const side = Math.random();
    let x, y;
    if (side < 0.45) { x = CFG.world.w - 30; y = rnd(650, CFG.world.h - 60); }
    else if (side < 0.8) { x = rnd(200, CFG.world.w - 150); y = CFG.world.h - 30; }
    else { x = rnd(20, 110); y = CFG.world.h - 30; }
    const hp = Math.round(this.bearHP(n) * E.hp), a = rnd(0, Math.PI * 2);
    this.bears.push({ x, y, hp, maxhp: hp, dmg: this.bearDmg(n) * E.dmg, speed: CFG.wave.speed * E.speed * rnd(0.95, 1.15), state: 'walk',
                      tx: this.hut.x + Math.cos(a) * 45, ty: this.hut.y + 28 + Math.sin(a) * 22, type: type || 'bear', r: E.r,
                      bounty: Math.round(this.bounty(n) * E.bounty),
                      atkT: rnd(0.2, 0.8), lunge: 0, flash: 0, facing: -1, moving: false, anim: 0, n, dead: false });
  }
  hitBear(b, dmg, by) {
    if (b.dead) return;
    b.hp -= dmg; b.flash = 1;
    this.emit('hit', b.x, b.y, by);
    if (b.hp <= 0) {
      b.dead = true; this.stats.kills++;
      this.spawnBills(b.bounty, b.x, b.y, 20, 12);
      this.emit('kill', b.x, b.y);
    }
  }
  updateBears(dt) {
    const camp = CFG.camp, hut = this.hut;
    for (const b of this.bears) {
      b.moving = false; b.flash = Math.max(0, b.flash - dt * 6); b.lunge = Math.max(0, b.lunge - dt * 3);
      b.atkT -= dt;
      if (b.state === 'walk') {
        const d = dist(b.x, b.y, b.tx, b.ty);
        if (d <= 6) { b.state = 'hut'; continue; }
        const nx = b.x + ((b.tx - b.x) / d) * b.speed * dt, ny = b.y + ((b.ty - b.y) / d) * b.speed * dt;
        if (this.fence.hp > 0 && inRect(nx, ny, camp) && !inRect(b.x, b.y, camp)) { b.state = 'fence'; b.facing = hut.x < b.x ? -1 : 1; continue; }
        b.x = nx; b.y = ny; b.moving = true; b.anim += dt * 8; b.facing = b.tx < b.x ? -1 : 1;
      } else if (b.state === 'fence') {
        if (this.fence.hp <= 0) { b.state = 'walk'; continue; }
        if (b.atkT <= 0) {
          b.atkT = 1; b.lunge = 1;
          this.fence.hp = Math.max(0, this.fence.hp - b.dmg);
          this.emit('hitFence', b.x, b.y);
          if (this.fence.hp <= 0) { this.text(hut.x, hut.y - 110, '울타리가 부서졌다!', '#ff8a80', 1.6); this.emit('fenceBroken', hut.x, hut.y); }
        }
      } else if (b.state === 'hut') {
        if (b.atkT <= 0) {
          b.atkT = 1; b.lunge = 1; this.shake = 1;
          this.hut.hp = Math.max(0, this.hut.hp - b.dmg);
          this.emit('hitHut', b.x, b.y);
          if (this.hut.hp <= 0) { this.gameOver(); return; }
        }
      }
    }
    separate(this.bears, 36, 0.5);
    if (this.bears.length === 0 && this.fence.hp < this.fence.maxhp)
      this.fence.hp = Math.min(this.fence.maxhp, this.fence.hp + (this.fence.maxhp / CFG.fence.regenTime) * dt);
  }

  updateGuards(dt) {
    const G = CFG.guard;
    for (const g of this.guards) {
      g.moving = false; g.atkT -= dt; g.swing = Math.max(0, g.swing - dt * 4);
      const b = this.nearestBear(g.x, g.y, Infinity);
      if (b) {
        if (dist(g.x, g.y, b.x, b.y) > G.range) moveToward(g, b.x, b.y, G.speed, dt);
        else {
          g.facing = b.x < g.x ? -1 : 1;
          if (g.atkT <= 0) { g.atkT = G.atkCd; g.swing = 1; this.hitBear(b, this.guardDmg, 'guard'); }
        }
      } else moveToward(g, g.post.x, g.post.y, G.speed, dt);
      if (g.moving) g.anim += dt * 11;
    }
    separate(this.guards, 26, 0.4);
  }

  updateTower(dt) {
    if (this.lv.tower <= 0) return;
    this.towerT -= dt;
    if (this.towerT > 0) return;
    const T = CFG.tower;
    const b = this.nearestBear(T.x, T.y, this.towerRange);
    if (!b) return;
    this.towerT = T.cd;
    const sx = T.x, sy = T.y - 95;
    this.arrows.push({ x: sx, y: sy, sx, sy, target: b, t: 0, dur: Math.max(0.15, dist(sx, sy, b.x, b.y) / 650), dmg: this.towerDmg });
    this.emit('arrow', sx, sy);
  }
  updateArrows(dt) {
    for (const a of this.arrows) {
      a.t += dt;
      const k = Math.min(1, a.t / a.dur), b = a.target;
      const tx = b.x, ty = b.y - 16;
      const px = a.x, py = a.y;
      a.x = lerp(a.sx, tx, k); a.y = lerp(a.sy, ty, k) - Math.sin(k * Math.PI) * 36;
      a.ang = Math.atan2(a.y - py, a.x - px);
      if (k >= 1) { a.dead = true; this.hitBear(b, a.dmg, 'tower'); }
    }
    this.arrows = this.arrows.filter(a => !a.dead);
  }

  updateFx(dt) {
    for (const c of this.chips) { c.t += dt; c.x += c.vx * dt; c.vy += 420 * dt; c.y += c.vy * dt; }
    this.chips = this.chips.filter(c => c.t < 0.6);
    for (const t of this.texts) { t.t += dt; t.y -= 28 * dt; }
    this.texts = this.texts.filter(t => t.t < t.life);
    this.shake = Math.max(0, this.shake - dt * 4);
  }

  updateTutorial() {
    const s = this.tutorial;
    if (s === 0 && this.stats.chops > 0) this.tutorial = 1;
    else if (s === 1 && (this.counter.logs > 0 || this.stats.sales > 0)) this.tutorial = 2;
    else if (s === 2 && this.earned > 0) this.tutorial = 3;
    else if (s === 3 && Object.values(this.lv).some(v => v > 0)) this.tutorial = 4;
    else if (s === 4 && (this.lv.fence > 0 || this.lv.guard > 0 || this.wave.n > 0)) this.tutorial = 5;
  }

  gameOver() {
    this.over = true;
    this.meta.runs++;
    const cleared = Math.max(0, this.wave.n - 1);
    if (cleared > this.meta.bestWave) this.meta.bestWave = cleared;
    if (this.earned > this.meta.bestEarned) this.meta.bestEarned = this.earned;
    const flakes = Math.floor(cleared / CFG.meta.flakeEvery);
    this.meta.snowflakes += flakes;
    this.lastResult = { cleared, flakes, earned: Math.floor(this.earned), time: this.t, kills: this.stats.kills, waveN: this.wave.n };
    this.emit('over', this.hut.x, this.hut.y);
  }
}

if (typeof module !== 'undefined') module.exports = { Game, dist, clamp, lerp, moveToward, COUNTER_RECT, HUT_RECT };
