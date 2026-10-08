// 눈보라 벌목장 — 게임 로직. 화면(canvas)에 의존하지 않아서 밸런스 시뮬레이션에도 쓴다.
'use strict';

const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const rnd = (a, b) => a + Math.random() * (b - a);
const rndi = (a, b) => Math.floor(rnd(a, b + 1));
const inRect = (x, y, r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
const GOOD_IDS = ['wood', 'meat', 'fish', 'pelt', 'animal'];
const ALL_GOODS = Object.keys(CFG.goods);
const FURN_IDS = ALL_GOODS.filter(g => CFG.goods[g].tier);
const emptyStock = () => { const o = {}; for (const g of ALL_GOODS) o[g] = 0; return o; };

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
  const dx = e.x - cx, dy = e.y - cy;
  const d = Math.hypot(dx, dy);
  if (d >= r) return;
  if (d < 0.01) {
    const l = e.x - rect.x, rr = rect.x + rect.w - e.x, t = e.y - rect.y, b = rect.y + rect.h - e.y;
    const m = Math.min(l, rr, t, b);
    if (m === l) e.x = rect.x - r; else if (m === rr) e.x = rect.x + rect.w + r;
    else if (m === t) e.y = rect.y - r; else e.y = rect.y + rect.h + r;
    return;
  }
  e.x = cx + (dx / d) * r; e.y = cy + (dy / d) * r;
}

const shopRect = sh => ({ x: sh.x - sh.w / 2, y: sh.y - 38, w: sh.w, h: 44 });
const HUT_RECT = { x: CFG.hut.x - 62, y: CFG.hut.y - 30, w: 124, h: 56 };
const MART_RECT = { x: CFG.shops.mart.x - CFG.shops.mart.w / 2, y: CFG.shops.mart.y - 60, w: CFG.shops.mart.w, h: 100 };
const FURN_RECT = { x: CFG.shops.furn.x - CFG.shops.furn.w / 2, y: CFG.shops.furn.y - 60, w: CFG.shops.furn.w, h: 90 };
const RIVER_RECT = CFG.river;
const SLAUGHTER_RECT = { x: CFG.shops.slaughter.x - 75, y: CFG.shops.slaughter.y - 50, w: 150, h: 70 };
const CUSTOMER_COATS = ['#3b82c4', '#2f6fb0', '#4a90d9', '#346fa8', '#5aa0e0', '#7b6fd1', '#d16f9a'];

class Game {
  constructor(opts = {}) {
    this.meta = Object.assign({ snowflakes: 0, bestWave: 0, bestEarned: 0, runs: 0 }, opts.meta || {});
    this.input = { x: 0, y: 0 };
    this.events = [];
    this.newRun(opts.run || null);
  }

  // ---- 파생 수치 ----
  get bonus() { return 1 + this.meta.snowflakes * CFG.meta.bonusPer; }
  price(good) { const G = CFG.goods[good]; return Math.round(G.base * Math.pow(CFG.price.growth, this.lv[G.priceUp]) * this.bonus * (1 + 0.05 * this.lv.townhall)); }
  get chopMul() { return Math.max(0.09, Math.pow(0.89, this.lv.axe)); }
  get effMul() { return (1 + 0.08 * this.lv.townhall) * (1 + 0.1 * this.lv.training); }   // 일꾼 작업 효율
  get warnTime() { return CFG.wave.warn + 8 * this.lv.beacon; }
  get moraleMul() { return 1 + 0.1 * this.lv.beacon; }
  get fishTime() { return Math.max(0.3, CFG.fishing.time * Math.pow(0.89, this.lv.rod)); }
  get workerCarry() { return CFG.worker.carry + Math.floor(this.lv.bag / 2); }
  get wantMax() { return CFG.customer.wantMax + Math.floor(this.lv.promo / 3); }
  get carryCap() { return CFG.player.carry + CFG.player.carryPerBag * this.lv.bag; }
  get moveMul() { return 1 + 0.1 * this.lv.shoes; }   // 👟 신발: 모두의 이동 속도
  get playerSpeed() { return CFG.player.speed * this.moveMul; }
  get workerSpeed() { return CFG.worker.speed * this.moveMul; }
  get guardSpeed() { return CFG.guard.speed * this.moveMul; }
  get custInterval() { return Math.max(CFG.customer.minInterval, CFG.customer.interval * Math.pow(CFG.customer.intervalMul, this.lv.promo)); }
  get atkDmg() { return CFG.player.atkDmg + CFG.weapon.dmgPer * this.lv.weapon; }
  get guardDmg() { return CFG.guard.dmg + CFG.weapon.dmgPer * this.lv.weapon; }
  get hunterDmg() { return (CFG.hunt.hunterDmg + CFG.weapon.dmgPer * this.lv.weapon) * this.effMul; }
  get towerDmg() { return CFG.tower.dmg + CFG.tower.dmgPer * this.lv.tower; }
  get towerRange() { return CFG.tower.range + CFG.tower.rangePer * this.lv.tower; }
  get towerArrows() { return 1 + tierOf('tower', this.lv.tower); }
  get guardMaxHP() { return CFG.guard.hp + CFG.guard.hpPerWeapon * this.lv.weapon; }
  get playerMaxHP() { return CFG.player.hp + CFG.player.hpPerWeapon * this.lv.weapon; }
  get treeCount() { return Math.min(CFG.forest.base + CFG.forest.perLevel * this.lv.forest, FOREST_SPOTS.length); }
  get timeToWave() { return Math.max(0, this.wave.nextAt - this.t); }
  get martLanes() { return Math.min(3, Math.max(1, this.lv.mart)); }
  shopCap(id) { return CFG.shops[id].cap + (id === 'furn' ? 2 * this.lv.promo : 10 * this.lv.promo) + (id === 'mart' ? 30 * Math.max(0, this.lv.mart - 1) : 0); }
  shopAccepts(id) { return CFG.shops[id].accepts || CFG.shops[id].goods; }
  shopGoods(id) { return id === 'furn' ? CFG.shops.furn.goods.filter(g => CFG.goods[g].tier <= this.lv.workshop) : CFG.shops[id].goods; }
  get toolMul() { return Math.max(0.1, Math.pow(0.89, this.lv.tools)); }
  shopOpen(id) {
    if (id === 'mart') return this.lv.mart >= 1;
    if (id === 'furn') return this.lv.workshop >= 1;
    if (id === 'slaughter') return this.lv.slaughter >= 1;
    if (id === 'pelt') return this.lv.furShop >= 1 && this.lv.mart < 1;
    if (this.lv.mart >= 1) return false;
    if (id === 'meat') return this.lv.butcher >= 1;
    if (id === 'fish') return this.lv.fishShop >= 1;
    return true;
  }
  deliveryShop(good) {
    if (good === 'animal') return this.shopOpen('slaughter') ? 'slaughter' : null;
    if (this.lv.mart >= 1) return 'mart';
    return this.shopOpen(good) ? good : null;
  }
  // 벌목꾼용: 판매대(또는 마트)와 공방 중 재고 비율이 낮은 쪽으로 목재를 나른다
  woodDest() {
    const main = this.deliveryShop('wood');
    if (!this.shopOpen('furn')) return main;
    const mf = this.shops[main].stock.wood / this.shopCap(main), ff = this.shops.furn.stock.wood / CFG.shops.furn.matCap;
    return ff < mf ? 'furn' : main;
  }
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
    return Object.entries(c).map(([t, k]) => `${ENEMY[t].emoji} ${t === 'yeti' ? BOSS[bossTier(n)].name : ENEMY[t].name} ${k}`).join(' · ');
  }
  bearHP(n) { return Math.round(CFG.wave.hp * Math.pow(CFG.wave.hpGrowth, n - 1)); }
  bearDmg(n) { return CFG.wave.dmg * Math.pow(CFG.wave.dmgGrowth, n - 1); }
  bounty(n) { return Math.round(CFG.wave.bounty * Math.pow(CFG.wave.bountyGrowth, n - 1) * this.bonus); }
  wildHP() { return Math.round(CFG.hunt.hp * Math.pow(CFG.hunt.hpGrowth, this.wave.n)); }
  get wildMax() { return CFG.hunt.max + Math.floor(this.hunters.length * CFG.hunt.maxPerHunter); }
  get growTime() { return Math.max(6, CFG.ranch.growTime * Math.pow(0.89, this.lv.feed)); }
  get meatPerAnimal() { return CFG.ranch.meat + this.lv.breed; }
  get animalCount() { return this.lv.ranch * CFG.ranch.perLevel; }
  get animalCap() { return 1 + Math.floor(this.lv.bag / 3); }   // 한 번에 데려갈 수 있는 순록
  get slaughterTime() { return CFG.shops.slaughter.time * Math.pow(0.9, Math.max(0, this.lv.slaughter - 1)); }
  get slaughterAnimalCap() { return CFG.shops.slaughter.animalCap + 2 * Math.max(0, this.lv.slaughter - 1); }

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
    this.shops = {};
    for (const id of Object.keys(CFG.shops)) {
      const st = emptyStock();
      if (s.shops && s.shops[id]) Object.assign(st, s.shops[id]);
      if (id === 'wood' && s.counterLogs) st.wood = s.counterLogs;   // 예전 저장 호환
      this.shops[id] = { id, stock: st, custT: 2 + Math.random() * 2 };
    }
    const inv = Object.assign({ wood: s.playerLogs || 0, meat: 0, fish: 0, pelt: 0, animal: 0 }, s.inv || {});
    this.player = { x: CFG.player.x, y: CFG.player.y, inv, chopT: 0, fishT: 0, atkT: 0, dropT: 0,
                    facing: 1, moving: false, anim: 0, swing: 0, tree: null, fishing: false, fullT: 0, hp: 0, maxhp: 0, down: 0, flash: 0 };
    this.player.maxhp = this.playerMaxHP; this.player.hp = s.playerHp != null ? Math.min(s.playerHp, this.player.maxhp) : this.player.maxhp;
    this.trees = FOREST_SPOTS.map((p, i) => ({ x: p.x, y: p.y, logs: CFG.tree.logs, regrowT: 0, user: null, i, active: true }));
    this.workers = []; for (let i = 0; i < this.lv.worker; i++) this.addWorker();
    this.guards = []; for (let i = 0; i < this.lv.guard; i++) this.addGuard(false); for (let i = 0; i < this.lv.militia; i++) this.addGuard(true);
    this.hunters = []; for (let i = 0; i < this.lv.hunter; i++) this.addHunter();
    this.craftsmen = []; for (let i = 0; i < this.lv.craftsman; i++) this.addCraftsman();
    this.animals = []; for (let i = 0; i < this.animalCount; i++) this.addAnimal(s.animals && s.animals[i] != null ? s.animals[i] : Math.random() * 0.6);
    this.slaughtermen = []; for (let i = 0; i < this.lv.slaughterman; i++) this.addSlaughterman();
    this.player.proc = null;
    this.ranchers = []; for (let i = 0; i < this.lv.rancher; i++) this.addRancher();
    this.player.craft = null;
    this.fishers = []; for (let i = 0; i < this.lv.fisher; i++) this.addFisher();
    this.customers = []; this.bigT = CFG.customer.bigEvery * 0.6;
    this.bears = []; this.wild = []; this.wildT = Math.max(5, CFG.hunt.firstAt - this.t);
    this.arrows = []; this.bills = []; this.drops = []; this.texts = []; this.chips = []; this.splashes = []; this.sparks = []; this.pops = {};
    this.tutorial = s.tutorial || 0;
    this.tips = (s.tips || []).slice();
    this.tipQueue = [];
    this.stats = Object.assign({ sales: 0, chops: 0, kills: 0, fish: 0, hunts: 0, crafts: 0, harvests: 0, slaughters: 0 }, s.stats || {});
    this.activePad = null; this.padFlow = 0; this.towerT = 0; this.shake = 0;
  }

  serialize() {
    const shops = {}; for (const id of Object.keys(this.shops)) shops[id] = this.shops[id].stock;
    return {
      t: this.t, money: this.money, earned: this.earned, lv: this.lv, paid: this.paid,
      fenceHp: this.fence.hp, hutHp: this.hut.hp, waveN: this.wave.n, waveNextAt: this.wave.nextAt,
      shops, inv: this.player.inv, playerHp: this.player.hp, tutorial: this.tutorial, tips: this.tips, stats: this.stats,
      animals: this.animals.map(a => a.grow),
    };
  }

  // 자리를 비운 동안 일꾼들이 번 돈(수요와 생산 중 작은 쪽, 효율 60%)
  applyOffline(seconds) {
    const s = Math.min(seconds, CFG.offline.cap);
    if (s < CFG.offline.min || this.over) return 0;
    const avgWant = (CFG.customer.wantMin + this.wantMax) / 2;
    let rate = 0;
    // 목재
    const cap = this.workerCarry;
    const woodProd = this.lv.worker * cap / (cap * CFG.player.chopTime * CFG.worker.chopMul * this.chopMul / this.effMul + 9);
    const woodDemand = avgWant / (this.custInterval * (this.lv.mart ? CFG.shops.mart.rate : CFG.shops.wood.rate));
    rate += Math.min(woodProd, woodDemand) * this.price('wood');
    // 고기
    if (this.deliveryShop('pelt') && this.lv.hunter) {
      const peltProd = Math.min(this.lv.hunter * 0.05, this.wildMax * CFG.hunt.pelt / CFG.hunt.respawn);
      const peltDemand = avgWant / (this.custInterval * (this.lv.mart ? CFG.shops.mart.rate : CFG.shops.pelt.rate));
      rate += Math.min(peltProd, peltDemand) * this.price('pelt');
    }
    // 목장(목동이 있어야 자동)
    if (this.deliveryShop('meat') && this.lv.rancher && this.lv.ranch && this.lv.slaughter && this.lv.slaughterman) {
      const ranchProd = Math.min(this.animalCount * this.meatPerAnimal / (this.growTime + 8), this.lv.slaughterman * this.meatPerAnimal / (this.slaughterTime * 1.2 / this.effMul + 4));
      const meatDemand2 = avgWant / (this.custInterval * (this.lv.mart ? CFG.shops.mart.rate : CFG.shops.meat.rate));
      rate += Math.min(ranchProd, meatDemand2) * this.price('meat');
    }
    // 생선
    if (this.deliveryShop('fish') && this.lv.fisher) {
      const fishProd = this.lv.fisher * CFG.fishing.carry / (CFG.fishing.carry * this.fishTime * CFG.fishing.fisherMul / this.effMul + 10);
      const fishDemand = avgWant / (this.custInterval * (this.lv.mart ? CFG.shops.mart.rate : CFG.shops.fish.rate));
      rate += Math.min(fishProd, fishDemand) * this.price('fish');
    }
    // 가구: 목수가 만드는 양, 남는 목재, 손님 수요 중 작은 쪽
    if (this.shopOpen('furn') && this.lv.craftsman) {
      const open = this.shopGoods('furn');
      const avgWood = open.reduce((a, g) => a + CFG.goods[g].wood, 0) / open.length, avgTime = open.reduce((a, g) => a + CFG.goods[g].time, 0) / open.length * this.toolMul * 1.2;
      const avgPrice = open.reduce((a, g) => a + this.price(g), 0) / open.length;
      const woodLeft = Math.max(0, woodProd - woodDemand);
      const furnRate = Math.min(this.lv.craftsman / avgTime, woodLeft / avgWood, 1 / (this.custInterval * CFG.shops.furn.rate));
      rate += furnRate * avgPrice;
    }
    if (this.lv.mart) rate *= CFG.shops.mart.mul;
    if (!this.lv.cashier) rate *= 0.7;
    const gain = Math.floor(rate * s * CFG.offline.eff);
    this.money += gain; this.earned += gain;
    return gain;
  }

  addWorker() {
    const i = this.workers.length;
    this.workers.push({ x: CFG.shops.wood.drop.x - 40, y: CFG.shops.wood.drop.y + 40 + i * 6, inv: { wood: 0, meat: 0, fish: 0, pelt: 0, animal: 0 }, state: 'find', target: null,
                        chopT: 0, dropT: 0, facing: 1, moving: false, anim: 0, swing: 0, i });
  }
  addGuard(militia) {
    const list = this.guards.filter(g => !!g.militia === !!militia), i = list.length;
    const p = militia ? MILITIA_POSTS[i % MILITIA_POSTS.length] : GUARD_POSTS[i % GUARD_POSTS.length];
    const hp = Math.round(this.guardMaxHP * (militia ? 2.2 : 1));
    this.guards.push({ x: p.x, y: p.y, post: p, atkT: 0, swing: 0, facing: 1, moving: false, anim: 0, i, hp, maxhp: hp, down: 0, flash: 0, militia: !!militia });
  }
  addHunter() {
    const i = this.hunters.length, P = CFG.hunt.post;
    this.hunters.push({ x: P.x + (i % 3) * 30, y: P.y + Math.floor(i / 3) * 26, inv: { wood: 0, meat: 0, fish: 0, pelt: 0, animal: 0 }, state: 'find', target: null,
                        atkT: 0, dropT: 0, swing: 0, facing: 1, moving: false, anim: 0, i });
  }
  addFisher() {
    const i = this.fishers.length, sp = CFG.fishing.spots[i % CFG.fishing.spots.length];
    this.fishers.push({ x: sp.x + 20, y: sp.y + 60, spot: sp, inv: { wood: 0, meat: 0, fish: 0, pelt: 0, animal: 0 }, state: 'toSpot', fishT: 0, dropT: 0,
                        fishing: false, facing: 1, moving: false, anim: 0, i });
  }
  addCraftsman() {
    const i = this.craftsmen.length, b = CFG.shops.furn.benches[i % CFG.shops.furn.benches.length];
    this.craftsmen.push({ x: b.x, y: b.y + 60, bench: b, state: 'toBench', craft: null, swing: 0, facing: 1, moving: false, anim: 0, i });
  }
  carried(e) { return GOOD_IDS.reduce((a, g) => a + (e.inv[g] || 0), 0); }
  // ---- 목장 ----
  addAnimal(grow) {
    const R = CFG.ranch.rect, x = rnd(R.x + 40, R.x + R.w - 40), y = rnd(R.y + 60, R.y + R.h - 30);
    this.animals.push({ x, y, grow: Math.min(1, grow || 0), tx: x, ty: y, waitT: rnd(0.5, 2), facing: 1, moving: false, anim: 0, harvestT: 0, i: this.animals.length });
  }
  addRancher() {
    const i = this.ranchers.length, P = CFG.ranch.post;
    this.ranchers.push({ x: P.x + i * 28, y: P.y, inv: { wood: 0, meat: 0, fish: 0, pelt: 0, animal: 0 }, state: 'find', target: null, harvestT: 0, dropT: 0, swing: 0, facing: 1, moving: false, anim: 0, i });
  }
  nearestReadyAnimal(x, y, range) {
    let best = null, bd = range;
    for (const a of this.animals) { if (a.grow < 1) continue; const d = dist(x, y, a.x, a.y); if (d < bd) { bd = d; best = a; } }
    return best;
  }
  // 다 자란 순록에게서 고기를 거둔다. true면 수확 완료
  harvest(a, who, dt) {
    a.harvestT += dt;
    if (a.harvestT < CFG.ranch.harvestTime) return false;
    a.harvestT = 0; a.grow = 0;
    who.inv.animal++; this.stats.harvests++;
    this.text(a.x, a.y - 50, '🦌 출하!', '#ffd166', 1);
    for (let i = 0; i < 4; i++) this.sparks.push({ x: a.x, y: a.y - 30, vx: rnd(-40, 40), vy: rnd(-80, -30), t: 0, life: 0.6, color: '#ff8a80', s: 3 });
    this.emit('harvest', a.x, a.y);
    return true;
  }
  updateAnimals(dt) {
    while (this.animals.length < this.animalCount) this.addAnimal(0);
    const R = CFG.ranch.rect, gt = this.growTime;
    for (const a of this.animals) {
      a.moving = false;
      if (a.grow < 1) a.grow = Math.min(1, a.grow + dt / gt);
      if (a.waitT > 0) { a.waitT -= dt; if (a.waitT <= 0) { a.tx = rnd(R.x + 40, R.x + R.w - 40); a.ty = rnd(R.y + 60, R.y + R.h - 30); } continue; }
      if (moveToward(a, a.tx, a.ty, CFG.ranch.speed, dt)) a.waitT = rnd(1.5, 4);
      if (a.moving) a.anim += dt * 6;
    }
    separate(this.animals, 36, 0.4);
  }
  updateRanchers(dt) {
    const cap = CFG.ranch.rancherCarry + Math.floor(this.lv.training / 3);
    const shopId = this.deliveryShop('animal');
    for (const r of this.ranchers) {
      r.moving = false; r.swing = Math.max(0, r.swing - dt * 4);
      if (r.state === 'find') {
        if (r.inv.animal >= cap) { r.state = 'toShop'; continue; }
        const a = this.nearestReadyAnimal(r.x, r.y, Infinity);
        if (a && shopId) { r.target = a; r.state = 'go'; }
        else if (r.inv.animal > 0 && shopId) r.state = 'toShop';
        else moveToward(r, CFG.ranch.post.x + r.i * 28, CFG.ranch.post.y, this.workerSpeed, dt);
      } else if (r.state === 'go') {
        const a = r.target;
        if (!a || a.grow < 1) { r.target = null; r.state = 'find'; continue; }
        if (dist(r.x, r.y, a.x, a.y) > CFG.ranch.range - 10) moveToward(r, a.x, a.y, this.workerSpeed, dt);
        else { r.facing = a.x < r.x ? -1 : 1; r.swing = 1; if (this.harvest(a, r, dt * this.effMul)) { r.target = null; r.state = 'find'; } }
      } else if (r.state === 'toShop') {
        if (!shopId) { r.state = 'find'; continue; }
        const dz = CFG.shops[shopId].drop, ang = (r.i / 3) * Math.PI * 2 + 2.5;
        if (moveToward(r, dz.x + Math.cos(ang) * 22, dz.y + Math.sin(ang) * 16, this.workerSpeed, dt)) { r.state = 'drop'; r.dropT = 0; }
      } else if (r.state === 'drop') {
        if (!shopId) { r.state = 'find'; continue; }
        if (!this.deposit(r, shopId, dt, CFG.worker.dropRate)) r.state = 'find';
      }
      if (r.moving) r.anim += dt * 11;
    }
  }
  // ---- 도축 ----
  addSlaughterman() {
    const i = this.slaughtermen.length, W = CFG.shops.slaughter.work;
    this.slaughtermen.push({ x: W.x + i * 26, y: W.y + 50, inv: { wood: 0, meat: 0, fish: 0, pelt: 0, animal: 0 }, state: 'toWork', proc: null, dropT: 0, swing: 0, facing: 1, moving: false, anim: 0, i });
  }
  // 대기 순록 한 마리를 고기로 만든다
  updateSlaughter(e, dt, mul) {
    const shop = this.shops.slaughter, cap = this.shopCap('slaughter');
    if (!e.proc) {
      if (shop.stock.animal <= 0) { e.procWait = 'animal'; return; }
      if (shop.stock.meat + this.meatPerAnimal > cap) { e.procWait = 'full'; return; }
      shop.stock.animal--; e.proc = { t: 0, need: this.slaughterTime * mul };
    }
    e.procWait = null;
    e.proc.t += dt;
    if (Math.floor(e.proc.t * 1.5) !== Math.floor((e.proc.t - dt) * 1.5)) { e.swing = 1; this.emit('chop', e.x, e.y); }
    if (e.proc.t >= e.proc.need) {
      e.proc = null; shop.stock.meat += this.meatPerAnimal; this.stats.slaughters++;
      this.text(e.x, e.y - 80, `🥩 +${this.meatPerAnimal}`, '#ffb4b4', 1.1);
      this.emit('harvest', e.x, e.y);
    }
  }
  // 도축장 고기를 가져간다(고기 받기 칸)
  withdraw(e, dt, cap) {
    const shop = this.shops.slaughter;
    e.dropT += dt;
    while (e.dropT >= CFG.counter.dropRate && shop.stock.meat > 0 && e.inv.meat < cap) { e.dropT -= CFG.counter.dropRate; shop.stock.meat--; e.inv.meat++; this.emit('drop', e.x, e.y); }
    if (shop.stock.meat <= 0 || e.inv.meat >= cap) e.dropT = Math.min(e.dropT, CFG.counter.dropRate);
  }
  updateSlaughtermen(dt) {
    if (!this.shopOpen('slaughter')) return;
    const S = CFG.shops.slaughter, shop = this.shops.slaughter, cap = 8 + Math.floor(this.lv.bag / 2);
    const shopId = this.deliveryShop('meat');
    for (const m of this.slaughtermen) {
      m.moving = false; m.swing = Math.max(0, m.swing - dt * 4);
      if (m.state === 'toWork') { if (moveToward(m, S.work.x + m.i * 26, S.work.y + 8, this.workerSpeed, dt)) m.state = 'work'; }
      else if (m.state === 'work') {
        m.facing = -1;
        this.updateSlaughter(m, dt, 1.2 / this.effMul);
        // 고기가 쌓였거나(용량) 더 할 일이 없으면 정육점으로 나른다
        if (shopId && (shop.stock.meat >= cap || (shop.stock.animal <= 0 && !m.proc && shop.stock.meat > 0))) {
          const take = Math.min(cap, shop.stock.meat); shop.stock.meat -= take; m.inv.meat += take; m.state = 'toShop';
        }
      } else if (m.state === 'toShop') {
        if (!shopId) { m.state = 'toWork'; continue; }
        const dz = CFG.shops[shopId].drop, ang = (m.i / 3) * Math.PI * 2 + 4;
        if (moveToward(m, dz.x + Math.cos(ang) * 22, dz.y + Math.sin(ang) * 16, this.workerSpeed, dt)) { m.state = 'drop'; m.dropT = 0; }
      } else if (m.state === 'drop') {
        if (!shopId) { m.state = 'toWork'; continue; }
        if (!this.deposit(m, shopId, dt, CFG.worker.dropRate)) m.state = 'toWork';
      }
      if (m.moving) m.anim += dt * 11;
    }
  }
  // ---- 가구 제작 ----
  // 열린 가구 중 재고가 가장 적은 것(같으면 높은 단계)을 만든다. 재고가 다 찼으면 null
  craftTier() {
    const cap = this.shopCap('furn'), st = this.shops.furn.stock;
    let best = null;
    for (const g of this.shopGoods('furn')) { if (st[g] >= cap) continue; if (!best || st[g] <= st[best]) best = g; }
    return best;
  }
  updateCraft(e, dt, mul) {
    const shop = this.shops.furn;
    if (!e.craft) {
      const g = this.craftTier();
      if (!g) { e.craftWait = 'full'; return; }
      const G = CFG.goods[g];
      if (shop.stock.wood < G.wood) { e.craftWait = 'wood'; return; }
      shop.stock.wood -= G.wood;
      e.craft = { good: g, t: 0, need: G.time * this.toolMul * mul };
    }
    e.craftWait = null;
    e.craft.t += dt;
    if (Math.floor(e.craft.t * 2) !== Math.floor((e.craft.t - dt) * 2)) { e.swing = 1; this.emit('hammer', e.x, e.y); for (let i = 0; i < 2; i++) this.chips.push({ x: e.x + 10, y: e.y - 20, vx: rnd(-60, 60), vy: rnd(-120, -40), z: 0, t: 0 }); }
    if (e.craft.t >= e.craft.need) {
      const g = e.craft.good; e.craft = null;
      shop.stock[g] = Math.min(this.shopCap('furn'), shop.stock[g] + 1); this.stats.crafts++;
      this.text(e.x, e.y - 80, `${CFG.goods[g].emoji} ${CFG.goods[g].name} 완성!`, '#ffd166', 1.2);
      this.emit('craft', e.x, e.y);
    }
  }
  updateCraftsmen(dt) {
    if (!this.shopOpen('furn')) return;
    for (const c of this.craftsmen) {
      c.moving = false; c.swing = Math.max(0, c.swing - dt * 4);
      if (c.state === 'toBench') { if (moveToward(c, c.bench.x + 16, c.bench.y + 8, this.workerSpeed, dt)) c.state = 'work'; }
      else { c.facing = -1; this.updateCraft(c, dt, 1.2 / this.effMul); }
      if (c.moving) c.anim += dt * 11;
    }
  }
  nearestBench(x, y) {
    const F = CFG.shops.furn; let best = null, bd = F.benchRange;
    for (const b of F.benches) { const d = dist(x, y, b.x + 16, b.y + 8); if (d < bd) { bd = d; best = b; } }
    return best;
  }

  // ---- 메인 업데이트 ----
  update(dt) {
    if (this.over) return;
    this.t += dt;
    this.updatePlayer(dt);
    this.updateTrees(dt);
    this.updateWorkers(dt);
    this.updateWild(dt);
    this.updateHunters(dt);
    this.updateFishers(dt);
    this.updateAnimals(dt);
    this.updateRanchers(dt);
    this.updateSlaughtermen(dt);
    this.updateCraftsmen(dt);
    this.updateCustomers(dt);
    this.updateBills(dt);
    this.updateDrops(dt);
    this.updatePads(dt);
    this.updateWaves(dt);
    this.updateBears(dt);
    if (this.over) return;
    this.updateGuards(dt);
    this.updateTower(dt);
    this.updateArrows(dt);
    this.bears = this.bears.filter(b => !b.dead);
    this.wild = this.wild.filter(b => !b.dead);
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
  nearestOf(list, x, y, range) {
    let best = null, bd = range;
    for (const b of list) {
      if (b.dead) continue;
      const d = dist(x, y, b.x, b.y);
      if (d < bd) { bd = d; best = b; }
    }
    return best;
  }
  nearestBear(x, y, range) { return this.nearestOf(this.bears, x, y, range); }
  nearestWild(x, y, range) { return this.nearestOf(this.wild, x, y, range); }
  // 플레이어/자동 추적이 노리는 적: 습격 중인 적 우선, 없으면 야생 곰
  nearestEnemy(x, y, range) { return this.nearestBear(x, y, range) || this.nearestWild(x, y, range); }
  nearestSpot(x, y, range) {
    let best = null, bd = range;
    for (const sp of CFG.fishing.spots) { const d = dist(x, y, sp.x, sp.y); if (d < bd) { bd = d; best = sp; } }
    return best;
  }

  collide(e, r) {
    for (const t of this.trees) {
      if (!t.active) continue;
      const ty = t.y + 2, d = dist(e.x, e.y, t.x, ty), min = r + 11;
      if (d < min && d > 0.01) { e.x += ((e.x - t.x) / d) * (min - d); e.y += ((e.y - ty) / d) * (min - d); }
    }
    for (const id of Object.keys(CFG.shops)) {
      if (id === 'mart') { if (this.lv.mart) pushOutRect(e, r, MART_RECT); }
      else if (id === 'furn') { /* FURN_RECT로 처리 */ }
      else if (id === 'slaughter') { /* SLAUGHTER_RECT로 처리 */ }
      else if (this.shopOpen(id) || (id === 'wood')) pushOutRect(e, r, shopRect(CFG.shops[id]));
      else if ((id === 'meat' && this.lv.butcher) || (id === 'fish' && this.lv.fishShop) || (id === 'pelt' && this.lv.furShop)) pushOutRect(e, r, shopRect(CFG.shops[id]));
    }
    if (this.lv.workshop) pushOutRect(e, r, FURN_RECT);
    if (this.lv.ranch) pushOutRect(e, r, { x: CFG.ranch.barn.x - 50, y: CFG.ranch.barn.y - 30, w: 100, h: 50 });
    if (this.lv.slaughter) pushOutRect(e, r, SLAUGHTER_RECT);
    if (this.lv.townhall) pushOutRect(e, r, { x: TOWNHALL.x - 80, y: TOWNHALL.y - 40, w: 160, h: 70 });
    pushOutRect(e, r, HUT_RECT);
    pushOutRect(e, r, { x: RIVER_RECT.x, y: RIVER_RECT.y - 40, w: RIVER_RECT.w + 40, h: RIVER_RECT.h + 8 });
  }

  chop(tree, who) {
    tree.logs--; who.inv.wood++; this.stats.chops++;
    if (tree.logs <= 0) { tree.regrowT = CFG.tree.regrow; if (tree.user) tree.user.target = null; tree.user = null; }
    for (let i = 0; i < 5; i++) this.chips.push({ x: tree.x, y: tree.y - 20, vx: rnd(-90, 90), vy: rnd(-160, -40), z: 0, t: 0 });
    this.emit('chop', tree.x, tree.y);
  }
  catchFish(who, x, y) {
    who.inv.fish++; this.stats.fish++;
    this.splashes.push({ x, y, t: 0 });
    this.text(x, y - 30, '🐟', '#fff', 0.8);
    this.emit('fish', x, y);
  }
  // 물건 내려놓기(가게가 받는 상품만). true면 내려놓을 게 남아 있음
  deposit(e, shopId, dt, rate) {
    const sh = CFG.shops[shopId], shop = this.shops[shopId];
    const cap = shopId === 'furn' ? sh.matCap : shopId === 'slaughter' ? this.slaughterAnimalCap : this.shopCap(shopId);
    const goods = this.shopAccepts(shopId);
    e.dropT += dt;
    let moved = false;
    while (e.dropT >= rate) {
      let did = false;
      for (const g of goods) {
        if (e.inv[g] > 0 && shop.stock[g] < cap) { e.inv[g]--; shop.stock[g]++; did = true; moved = true; this.emit('drop', e.x, e.y); break; }
      }
      if (!did) break;
      e.dropT -= rate;
    }
    if (!moved) e.dropT = Math.min(e.dropT, rate);
    return goods.some(g => e.inv[g] > 0);
  }
  shopFull(e, shopId) { const cap = shopId === 'furn' ? CFG.shops.furn.matCap : shopId === 'slaughter' ? this.slaughterAnimalCap : this.shopCap(shopId); return this.shopAccepts(shopId).every(g => e.inv[g] === 0 || this.shops[shopId].stock[g] >= cap); }

  updatePlayer(dt) {
    const p = this.player;
    p.flash = Math.max(0, p.flash - dt * 6);
    if (p.down > 0) {
      p.down -= dt; p.moving = false; p.fishing = false; p.crafting = false; p.tree = null;
      if (p.down <= 0) { p.hp = Math.ceil(p.maxhp * 0.5); this.text(p.x, p.y - 80, '일어났다!', '#7CFC9A', 1.2); }
      return;
    }
    if (p.hp < p.maxhp && !this.nearestBear(p.x, p.y, 320)) p.hp = Math.min(p.maxhp, p.hp + (p.maxhp / CFG.player.regenTime) * dt);
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
    p.fishing = false; p.crafting = false; p.harvesting = null; p.slaughtering = false;
    const enemy = this.nearestEnemy(p.x, p.y, CFG.player.atkRange);
    if (enemy) {
      p.chopT = 0; p.tree = null;
      if (p.atkT <= 0) { p.atkT = CFG.player.atkCd; p.swing = 1; p.facing = enemy.x < p.x ? -1 : 1; this.hitBear(enemy, this.atkDmg, 'player', p); }
    } else {
      const tree = this.nearestTree(p.x, p.y, CFG.tree.range, p);
      const spot = !tree ? this.nearestSpot(p.x, p.y, CFG.fishing.range) : null;
      const bench = !tree && !spot && this.shopOpen('furn') ? this.nearestBench(p.x, p.y) : null;
      const animal = !tree && !spot && !bench && this.lv.ranch ? this.nearestReadyAnimal(p.x, p.y, CFG.ranch.range) : null;
      const SW = CFG.shops.slaughter.work, atWork = !tree && !spot && !bench && !animal && this.shopOpen('slaughter') && dist(p.x, p.y, SW.x, SW.y + 8) < 44;
      if (tree && p.inv.wood < this.carryCap) {
        if (p.tree !== tree) { p.tree = tree; p.chopT = 0; }
        p.facing = tree.x < p.x ? -1 : 1;
        p.chopT += dt;
        const need = CFG.player.chopTime * this.chopMul;
        if (p.chopT >= need) { p.chopT -= need; p.swing = 1; this.chop(tree, p); }
      } else if (spot && p.inv.fish < this.carryCap && !p.moving) {
        p.fishing = true; p.tree = null; p.chopT = 0;
        p.fishT += dt;
        if (p.fishT >= this.fishTime) { p.fishT = 0; this.catchFish(p, spot.x, spot.y - 50); }
      } else if (bench && !p.moving) {
        p.crafting = true; p.facing = -1; this.updateCraft(p, dt, 1);
      } else if (animal && p.inv.animal < this.animalCap && !p.moving) {
        p.harvesting = animal; p.facing = animal.x < p.x ? -1 : 1; p.swing = Math.max(p.swing, 0.5);
        this.harvest(animal, p, dt);
      } else if (atWork && !p.moving) {
        p.slaughtering = true; p.facing = -1; this.updateSlaughter(p, dt, 1);
      } else {
        if (((tree && p.inv.wood >= this.carryCap) || (spot && p.inv.fish >= this.carryCap) || (animal && p.inv.animal >= this.animalCap)) && p.fullT <= 0) { p.fullT = 1.5; this.text(p.x, p.y - 80, '가득 찼어요!', '#ffd166', 1.2); }
        p.tree = null; p.chopT = 0; p.fishT = 0;
      }
    }
    // 도축장 고기 받기
    let inZone = false;
    if (this.shopOpen('slaughter')) { const pk = CFG.shops.slaughter.pickup; if (dist(p.x, p.y, pk.x, pk.y) < pk.r) { inZone = true; this.withdraw(p, dt, this.carryCap); if (this.shops.slaughter.stock.meat <= 0 && p.fullT <= 0 && p.inv.meat === 0) { p.fullT = 2; this.text(pk.x, pk.y - 60, '아직 고기가 없어요', '#ffd166', 1.2); } } }
    // 가게에 내려놓기
    for (const id of Object.keys(CFG.shops)) {
      if (!this.shopOpen(id)) continue;
      const dz = CFG.shops[id].drop;
      if (dist(p.x, p.y, dz.x, dz.y) >= dz.r) continue;
      inZone = true;
      const remaining = this.deposit(p, id, dt, CFG.counter.dropRate);
      if (remaining && this.shopFull(p, id) && p.fullT <= 0) { p.fullT = 2; this.text(dz.x, dz.y - 70, '재고가 가득!', '#ffd166', 1.2); }
      else if (remaining && !this.shopFull(p, id)) { /* 내려놓는 중 */ }
      else if (!remaining && p.fullT <= 0 && this.carried(p) > 0) {
        const other = GOOD_IDS.filter(g => p.inv[g] > 0 && !this.shopAccepts(id).includes(g)).map(g => CFG.goods[g].emoji).join('');
        if (other) { p.fullT = 2.5; this.text(dz.x, dz.y - 70, `${other}는 여기서 안 받아요`, '#ffd166', 1.4); }
      }
    }
    if (!inZone) p.dropT = 0;
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
      const shopId = w.dest && this.shopOpen(w.dest) ? w.dest : this.deliveryShop('wood');
      w.moving = false; w.swing = Math.max(0, w.swing - dt * 4);
      if (w.state === 'find') {
        if (w.inv.wood >= cap) { w.state = 'toCounter'; w.dest = this.woodDest(); continue; }
        const tree = this.pickTree(w);
        if (tree) { tree.user = w; w.target = tree; w.state = 'toTree'; }
        else if (w.inv.wood > 0) { w.state = 'toCounter'; w.dest = this.woodDest(); }
        else moveToward(w, W.idle.x + (w.i % 3) * 28, W.idle.y + Math.floor(w.i / 3) * 30, this.workerSpeed, dt);
      } else if (w.state === 'toTree') {
        const t = w.target;
        if (!t || t.logs <= 0 || t.user !== w) { if (t && t.user === w) t.user = null; w.target = null; w.state = 'find'; continue; }
        if (moveToward(w, t.x + 28, t.y + 8, this.workerSpeed, dt)) { w.state = 'chop'; w.chopT = 0; }
      } else if (w.state === 'chop') {
        const t = w.target;
        if (!t || t.logs <= 0) { w.target = null; w.state = 'find'; continue; }
        w.facing = -1;
        w.chopT += dt;
        const need = CFG.player.chopTime * W.chopMul * this.chopMul / this.effMul;
        if (w.chopT >= need) {
          w.chopT -= need; w.swing = 1; this.chop(t, w);
          if (w.inv.wood >= cap) { if (t.user === w) t.user = null; w.target = null; w.state = 'toCounter'; w.dest = this.woodDest(); }
          else if (t.logs <= 0) { w.target = null; w.state = 'find'; }
        }
      } else if (w.state === 'toCounter') {
        const dz = CFG.shops[shopId].drop, ang = (w.i / 6) * Math.PI * 2;
        if (moveToward(w, dz.x + Math.cos(ang) * 24, dz.y + Math.sin(ang) * 18, this.workerSpeed, dt)) { w.state = 'drop'; w.dropT = 0; }
      } else if (w.state === 'drop') {
        const remaining = this.deposit(w, shopId, dt, W.dropRate);
        if (!remaining) { w.state = 'find'; w.dest = null; }
        else if (this.shopFull(w, shopId)) { const alt = this.woodDest(); if (alt !== shopId) { w.dest = alt; w.state = 'toCounter'; } }
      }
      if (w.moving) w.anim += dt * 11;
    }
  }

  // ---- 야생 곰(사냥감) ----
  spawnWild() {
    const R = CFG.hunt.rect, hp = this.wildHP();
    const x = rnd(R.x + 30, R.x + R.w - 30), y = rnd(R.y + 30, R.y + R.h - 30);
    this.wild.push({ x, y, hp, maxhp: hp, speed: CFG.hunt.speed, state: 'wander', tx: x, ty: y, waitT: rnd(0.5, 2), fleeT: 0, fx: 0, fy: 0,
                     type: 'wild', flash: 0, lunge: 0, facing: 1, moving: false, anim: 0, dead: false, meat: CFG.hunt.meat, pelt: CFG.hunt.pelt,
                     bounty: Math.round(this.bounty(Math.max(1, this.wave.n)) * CFG.hunt.bountyMul) });
    this.emit('wild', x, y);
  }
  updateWild(dt) {
    this.wildT -= dt;
    if (this.wildT <= 0 && this.wild.length < this.wildMax) { this.wildT = CFG.hunt.respawn * rnd(0.8, 1.2); this.spawnWild(); }
    const R = CFG.hunt.rect;
    for (const b of this.wild) {
      b.moving = false; b.flash = Math.max(0, b.flash - dt * 6); b.lunge = Math.max(0, b.lunge - dt * 3);
      if (b.state === 'flee') {
        b.fleeT -= dt;
        const nx = clamp(b.x + b.fx * CFG.hunt.fleeSpeed * dt, R.x + 10, R.x + R.w - 10), ny = clamp(b.y + b.fy * CFG.hunt.fleeSpeed * dt, R.y + 10, R.y + R.h - 10);
        b.x = nx; b.y = ny; b.moving = true; b.anim += dt * 12; b.facing = b.fx < 0 ? -1 : 1;
        if (b.fleeT <= 0) { b.state = 'wander'; b.waitT = rnd(0.5, 1.5); }
      } else {
        if (b.waitT > 0) { b.waitT -= dt; if (b.waitT <= 0) { b.tx = rnd(R.x + 30, R.x + R.w - 30); b.ty = rnd(R.y + 30, R.y + R.h - 30); } continue; }
        if (moveToward(b, b.tx, b.ty, b.speed, dt)) b.waitT = rnd(1, 3);
        if (b.moving) b.anim += dt * 6;
      }
    }
    separate(this.wild, 40, 0.5);
  }

  updateHunters(dt) {
    const H = CFG.hunt, cap = H.hunterCarry + Math.floor(this.lv.bag / 2);
    const shopId = this.deliveryShop('pelt');
    for (const h of this.hunters) {
      h.moving = false; h.atkT -= dt; h.swing = Math.max(0, h.swing - dt * 4);
      // 근처 고기 줍기
      for (const d of this.drops) if (d.kind === 'pelt' && d.state === 'ground' && h.inv.pelt < cap && dist(d.x, d.y, h.x, h.y) < H.pickup) { d.state = 'fly'; d.to = h; }
      if (h.state === 'find') {
        if (h.inv.pelt >= cap) { h.state = 'toShop'; continue; }
        const b = this.nearestWild(h.x, h.y, Infinity);
        const drop = this.nearestDrop('pelt', h.x, h.y, 260);
        if (drop) { h.target = drop; h.state = 'collect'; }
        else if (b) { h.target = b; h.state = 'chase'; }
        else if (h.inv.pelt > 0 && shopId) h.state = 'toShop';
        else moveToward(h, H.post.x + (h.i % 3) * 30, H.post.y + Math.floor(h.i / 3) * 26, this.guardSpeed, dt);
      } else if (h.state === 'chase') {
        const b = h.target;
        if (!b || b.dead) { h.target = null; h.state = 'find'; continue; }
        if (dist(h.x, h.y, b.x, b.y) > H.hunterRange) moveToward(h, b.x, b.y, this.guardSpeed, dt);
        else { h.facing = b.x < h.x ? -1 : 1; if (h.atkT <= 0) { h.atkT = H.hunterCd; h.swing = 1; this.hitBear(b, this.hunterDmg, 'hunter', h); } }
      } else if (h.state === 'collect') {
        const d = h.target;
        if (!d || d.state !== 'ground' || h.inv.pelt >= cap) { h.target = null; h.state = 'find'; continue; }
        moveToward(h, d.x, d.y, this.guardSpeed, dt);
      } else if (h.state === 'toShop') {
        if (!shopId) { h.state = 'find'; continue; }
        const dz = CFG.shops[shopId].drop, ang = (h.i / 6) * Math.PI * 2 + 1;
        if (moveToward(h, dz.x + Math.cos(ang) * 22, dz.y + Math.sin(ang) * 16, this.guardSpeed, dt)) { h.state = 'drop'; h.dropT = 0; }
      } else if (h.state === 'drop') {
        if (!shopId) { h.state = 'find'; continue; }
        if (!this.deposit(h, shopId, dt, CFG.worker.dropRate)) h.state = 'find';
      }
      if (h.moving) h.anim += dt * 11;
    }
    separate(this.hunters, 24, 0.4);
  }

  updateFishers(dt) {
    const F = CFG.fishing, cap = F.carry + Math.floor(this.lv.bag / 2);
    const shopId = this.deliveryShop('fish');
    for (const f of this.fishers) {
      f.moving = false; f.fishing = false;
      if (f.state === 'toSpot') {
        if (moveToward(f, f.spot.x + 14, f.spot.y + 6, this.workerSpeed, dt)) { f.state = 'fish'; f.fishT = 0; }
      } else if (f.state === 'fish') {
        f.fishing = true; f.facing = 1;
        f.fishT += dt;
        if (f.fishT >= this.fishTime * F.fisherMul / this.effMul) { f.fishT = 0; this.catchFish(f, f.spot.x, f.spot.y - 50); }
        if (f.inv.fish >= cap) f.state = shopId ? 'toShop' : 'wait';
      } else if (f.state === 'wait') {
        if (shopId) f.state = 'toShop';
      } else if (f.state === 'toShop') {
        if (!shopId) { f.state = 'wait'; continue; }
        const dz = CFG.shops[shopId].drop, ang = (f.i / 4) * Math.PI * 2 + 2;
        if (moveToward(f, dz.x + Math.cos(ang) * 22, dz.y + Math.sin(ang) * 16, this.workerSpeed, dt)) { f.state = 'drop'; f.dropT = 0; }
      } else if (f.state === 'drop') {
        if (!shopId) { f.state = 'wait'; continue; }
        if (!this.deposit(f, shopId, dt, CFG.worker.dropRate)) f.state = 'toSpot';
      }
      if (f.moving) f.anim += dt * 11;
    }
  }

  // ---- 손님 ----
  makeWant(shopId, big) {
    const sh = CFG.shops[shopId], want = {};
    if (big) { want.wood = 8 + Math.floor(this.wave.n / 2) + Math.floor(this.lv.promo / 2); return want; }
    if (shopId === 'mart') {
      const kinds = sh.goods.slice().sort(() => Math.random() - 0.5).slice(0, rndi(1, 3));
      for (const g of kinds) want[g] = rndi(CFG.customer.wantMin, this.wantMax);
    } else if (shopId === 'furn') {
      const open = this.shopGoods('furn'); want[open[rndi(0, open.length - 1)]] = 1;
    } else want[sh.goods[0]] = rndi(CFG.customer.wantMin, this.wantMax);
    return want;
  }
  laneFor(shopId) {
    const sh = CFG.shops[shopId], n = shopId === 'mart' ? this.martLanes : 1;
    const counts = new Array(n).fill(0);
    for (const c of this.customers) if (c.state === 'queue' && c.shop === shopId) counts[c.lane]++;
    let best = 0; for (let i = 1; i < n; i++) if (counts[i] < counts[best]) best = i;
    return { lane: best, count: counts[best], max: sh.max };
  }
  spawnCustomer(shopId, big) {
    const C = CFG.customer, l = this.laneFor(shopId);
    if (l.count >= l.max) return false;
    this.customers.push({ x: C.spawn.x, y: C.spawn.y + rnd(-10, 10), shop: shopId, lane: l.lane, want: this.makeWant(shopId, big), state: 'queue', serveT: 0,
                          patience: big ? C.bigPatience : C.patience, got: null, coat: big ? '#7a4b2a' : CUSTOMER_COATS[rndi(0, CUSTOMER_COATS.length - 1)],
                          facing: -1, moving: false, anim: 0, mood: 0, wait: false, big: !!big, mul: big ? C.bigMul : 1 });
    return true;
  }
  updateCustomers(dt) {
    const C = CFG.customer;
    for (const id of Object.keys(CFG.shops)) {
      const shop = this.shops[id];
      if (!this.shopOpen(id) || !CFG.shops[id].goods.length) continue;
      shop.custT -= dt;
      if (shop.custT <= 0) {
        const sh = CFG.shops[id];
        shop.custT = this.custInterval * sh.rate / (id === 'mart' ? 1 + 0.1 * Math.max(0, this.lv.mart - 1) : 1) * rnd(0.7, 1.3);
        this.spawnCustomer(id, false);
      }
    }
    // 대량 구매자: 썰매를 끌고 와서 목재를 한 번에 많이, 비싸게 사 간다
    this.bigT -= dt;
    if (this.t > C.bigAfter && this.bigT <= 0) {
      this.bigT = C.bigEvery * rnd(0.8, 1.2);
      const id = this.deliveryShop('wood');
      if (id && this.spawnCustomer(id, true)) {
        const c = this.customers[this.customers.length - 1];
        this.text(CFG.shops[id].x, CFG.shops[id].y - 110, `🛷 대량 구매자! 통나무 ${c.want.wood}개를 ${C.bigMul}배 가격에`, '#ffd166', 2.5);
        this.emit('big', c.x, c.y);
      }
    }
    const qi = {};
    for (const c of this.customers) {
      c.moving = false;
      if (c.state === 'queue') {
        if (!this.shopOpen(c.shop)) { c.state = 'leave'; c.mood = 0; continue; }
        const sh = CFG.shops[c.shop], key = c.shop + c.lane, i = qi[key] || 0; qi[key] = i + 1;
        const ln = sh.lanes[c.lane] || sh.lanes[0];
        const tx = ln.x + ln.dx * sh.gap * i, ty = ln.y + ln.dy * sh.gap * i;
        const arrived = moveToward(c, tx, ty, C.speed, dt);
        c.wait = arrived;
        if (arrived) c.facing = c.shop === 'mart' ? 1 : -1;
        if (i === 0 && arrived) {
          const shop = this.shops[c.shop];
          const ok = Object.keys(c.want).every(g => shop.stock[g] >= c.want[g]);
          if (ok) {
            c.serveT += dt;
            if (c.serveT >= sh.serve * (this.lv.cashier ? C.cashierMul : 1)) this.sell(c);
          } else {
            c.patience -= dt;
            if (c.patience <= 0) { c.state = 'leave'; c.mood = -1; this.text(c.x, c.y - 70, '😠 그냥 갈래요', '#ff8a80', 1.4); this.emit('angry', c.x, c.y); }
          }
        }
      } else if (c.state === 'leave') {
        if (moveToward(c, C.exit.x, C.exit.y + (c.mood < 0 ? -60 : 0), C.speed, dt)) c.dead = true;
      }
      if (c.moving) c.anim += dt * 11;
    }
    this.customers = this.customers.filter(c => !c.dead);
  }

  sell(c) {
    const sh = CFG.shops[c.shop], shop = this.shops[c.shop];
    let amount = 0;
    for (const g of Object.keys(c.want)) { shop.stock[g] -= c.want[g]; amount += c.want[g] * this.price(g); }
    amount = Math.round(amount * sh.mul * (c.mul || 1));
    c.got = c.want; c.state = 'leave'; c.mood = 1; c.serveT = 0;
    this.stats.sales++;
    this.spawnBills(amount, sh.moneySpot.x, sh.moneySpot.y, 44, 14, c.shop);
    this.emit('sell', c.x, c.y);
  }

  spawnBills(amount, x, y, sx, sy, shopId) {
    const n = amount >= 40 ? 3 : amount >= 12 ? 2 : 1;
    const base = Math.floor(amount / n);
    for (let i = 0; i < n; i++) {
      const a = i === n - 1 ? amount - base * (n - 1) : base;
      if (this.bills.length >= 60) { this.bills[this.bills.length - 1].amount += a; continue; }
      this.bills.push({ x: x + rnd(-sx, sx), y: y + rnd(-sy, sy), z: 36, vz: rnd(20, 60), amount: a, state: 'ground', rot: rnd(-0.6, 0.6), t: 0, shop: shopId || null });
    }
  }
  updateBills(dt) {
    const p = this.player;
    for (const b of this.bills) {
      b.t += dt;
      if (b.state === 'ground') {
        if (b.z > 0 || b.vz !== 0) { b.vz -= 420 * dt; b.z += b.vz * dt; if (b.z <= 0) { b.z = 0; b.vz = 0; } }
        if (dist(b.x, b.y, p.x, p.y) < CFG.player.pickup) b.state = 'fly';
        else if (this.lv.cashier && b.t > 0.9) b.state = 'auto';
      } else {
        const CA = CFG.shops[b.shop && this.shopOpen(b.shop) ? b.shop : (this.lv.mart ? 'mart' : 'wood')].cashier;
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

  // ---- 바닥에 떨어진 고기 ----
  spawnDrops(kind, n, x, y) {
    for (let i = 0; i < n; i++) {
      if (this.drops.length >= 80) break;
      const a = rnd(0, Math.PI * 2), r = rnd(8, 34);
      this.drops.push({ kind, x: x + Math.cos(a) * r, y: y + Math.sin(a) * r * 0.6, z: 30, vz: rnd(40, 90), state: 'ground', to: null, t: 0, rot: rnd(-0.5, 0.5) });
    }
  }
  nearestDrop(kind, x, y, range) {
    let best = null, bd = range;
    for (const d of this.drops) { if (d.kind !== kind || d.state !== 'ground') continue; const dd = dist(x, y, d.x, d.y); if (dd < bd) { bd = dd; best = d; } }
    return best;
  }
  updateDrops(dt) {
    const p = this.player;
    for (const d of this.drops) {
      d.t += dt;
      if (d.state === 'ground') {
        if (d.z > 0 || d.vz !== 0) { d.vz -= 420 * dt; d.z += d.vz * dt; if (d.z <= 0) { d.z = 0; d.vz = 0; } }
        if (p.inv[d.kind] < this.carryCap && p.down <= 0 && dist(d.x, d.y, p.x, p.y) < CFG.player.pickup) { d.state = 'fly'; d.to = p; }
      } else {
        const to = d.to, tx = to.x, ty = to.y - 40;
        const k = 1 - Math.pow(0.0005, dt), dd = dist(d.x, d.y, tx, ty);
        const step = Math.max(dd * k, 380 * dt);
        if (step >= dd) { d.x = tx; d.y = ty; } else { d.x += ((tx - d.x) / dd) * step; d.y += ((ty - d.y) / dd) * step; }
        if (dist(d.x, d.y, tx, ty) < 6) { d.dead = true; to.inv[d.kind]++; if (to === p) { this.text(tx, ty - 10, `+1 ${CFG.goods[d.kind].emoji}`, '#ffb4b4', 0.8); this.emit('pick', tx, ty); } }
      }
    }
    this.drops = this.drops.filter(d => !d.dead);
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
    else if (u.id === 'guard') this.addGuard(false);
    else if (u.id === 'militia') this.addGuard(true);
    else if (u.id === 'hunter') this.addHunter();
    else if (u.id === 'fisher') this.addFisher();
    else if (u.id === 'craftsman') this.addCraftsman();
    else if (u.id === 'rancher') this.addRancher();
    else if (u.id === 'slaughterman') this.addSlaughterman();
    else if (u.id === 'ranch') { while (this.animals.length < this.animalCount) this.addAnimal(0); }
    else if (u.id === 'weapon') { for (const g of this.guards) { const m = Math.round(this.guardMaxHP * (g.militia ? 2.2 : 1)); g.hp += m - g.maxhp; g.maxhp = m; } const p = this.player; p.hp += this.playerMaxHP - p.maxhp; p.maxhp = this.playerMaxHP; }
    else if (u.id === 'workshop' && this.lv.workshop > 1) { const g = FURN_IDS[this.lv.workshop - 1]; this.text(u.pad.x, u.pad.y - 80, `${CFG.goods[g].emoji} ${CFG.goods[g].name} 제작 가능!`, '#ffd166', 2); }
    else if (u.id === 'fence') {
      const nm = this.fenceMax(this.lv.fence); this.fence.hp += nm - this.fence.maxhp; this.fence.maxhp = nm;
      const hm = this.hutMax(this.lv.fence); this.hut.hp += hm - this.hut.maxhp; this.hut.maxhp = hm;
    } else if (u.id === 'mart' && this.lv.mart === 1) {
      // 가게 재고를 마트로 옮기고, 줄 선 손님은 돌려보낸다
      const m = this.shops.mart.stock;
      for (const id of ['wood', 'meat', 'fish', 'pelt']) { for (const g of ['wood', 'meat', 'fish', 'pelt']) { m[g] += this.shops[id].stock[g]; this.shops[id].stock[g] = 0; } }
      for (const c of this.customers) if (c.state === 'queue' && c.shop !== 'furn' && c.shop !== 'slaughter') { c.state = 'leave'; c.mood = 0; }
      this.text(CFG.shops.mart.x, CFG.shops.mart.y - 130, '🏪 마트 개업! 모든 손님이 마트로 옵니다', '#ffd166', 3);
    }
    const nameLv = u.max === 1 ? u.name : `${u.name} Lv${this.lv[u.id]}`;
    this.text(u.pad.x, u.pad.y - 50, `${u.icon} ${nameLv}`, '#fff', 1.4);
    this.sparkle(u.pad.x, u.pad.y - 10, 14, '#ffd166');
    this.levelFx(u.id);
    this.emit('buy', u.pad.x, u.pad.y, u);
  }

  // 업그레이드 대상 건물에 반짝이 + 통통 튀는 효과, 외형 단계가 바뀌면 배너
  sparkle(x, y, n, color) {
    for (let i = 0; i < n; i++) { const a = rnd(0, Math.PI * 2), v = rnd(40, 160); this.sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, t: 0, life: rnd(0.5, 0.9), color: color || '#fff', s: rnd(2, 4) }); }
  }
  levelFx(id) {
    const lv = this.lv[id];
    const tierKind = { fence: 'fence', tower: 'tower', price: 'stall', workshop: 'workshop', mart: 'mart', axe: 'axe', weapon: 'weapon' }[id];
    const changed = tierKind && TIERS[tierKind].some(t => t.at === lv);
    const C = CFG.camp;
    if (id === 'fence') {
      this.pops.fence = 1; this.pops.hut = 1;
      for (let i = 0; i < 10; i++) this.sparkle(rnd(C.x, C.x + C.w), rnd(C.y, C.y + C.h) - 20, 3, '#ffe08a');
      if (changed) {
        const fname = TIERS.fence[tierOf('fence', lv)].name, hname = TIERS.hut[tierOf('hut', lv)].name;
        this.text(this.hut.x, this.hut.y - 150, `🧱 ${fname}으로 강화! 🏠 ${hname}`, '#ffd166', 2.6); this.shake = 0.6; this.emit('tierUp', this.hut.x, this.hut.y);
      }
    } else if (id === 'tower') { this.pops.tower = 1; this.sparkle(CFG.tower.x, CFG.tower.y - 80, 16, '#ffe08a'); if (changed) { this.text(CFG.tower.x, CFG.tower.y - 170, `🏹 ${TIERS.tower[tierOf('tower', lv)].name}으로 증축!`, '#ffd166', 2.4); this.emit('tierUp'); } }
    else if (id === 'price' || id === 'promo' || id === 'cashier') { this.pops.wood = 1; const sh = CFG.shops[this.lv.mart ? 'mart' : 'wood']; this.sparkle(sh.x, sh.y - 40, 14, '#7CFC9A'); if (changed) { this.text(sh.x, sh.y - 120, `🏪 ${TIERS.stall[tierOf('stall', lv)].name}으로 확장!`, '#ffd166', 2.4); this.emit('tierUp'); } }
    else if (id === 'meatPrice') { this.pops.meat = 1; this.sparkle(CFG.shops.meat.x, CFG.shops.meat.y - 40, 12, '#ffb4b4'); }
    else if (id === 'fishPrice' || id === 'rod') { this.pops.fish = 1; this.sparkle(CFG.shops.fish.x, CFG.shops.fish.y - 40, 12, '#9ad0ff'); }
    else if (id === 'workshop' || id === 'tools' || id === 'furnPrice') { this.pops.furn = 1; this.sparkle(CFG.shops.furn.x, CFG.shops.furn.y - 50, 16, '#ffd166'); if (changed) { this.text(CFG.shops.furn.x, CFG.shops.furn.y - 140, `🔨 ${TIERS.workshop[tierOf('workshop', lv)].name}으로 증축!`, '#ffd166', 2.4); this.emit('tierUp'); } }
    else if (id === 'mart') { this.pops.mart = 1; this.sparkle(CFG.shops.mart.x, CFG.shops.mart.y - 60, 24, '#ffd166'); if (changed) { this.text(CFG.shops.mart.x, CFG.shops.mart.y - 150, `🏪 ${TIERS.mart[tierOf('mart', lv)].name}으로 확장!`, '#ffd166', 2.6); this.emit('tierUp'); } }
    else if (id === 'axe') { this.pops.player = 1; this.sparkle(this.player.x, this.player.y - 40, 12, TIERS.axe[tierOf('axe', lv)].color); if (changed) { this.text(this.player.x, this.player.y - 110, `🪓 ${TIERS.axe[tierOf('axe', lv)].name} 획득!`, '#ffd166', 2.2); this.emit('tierUp'); } }
    else if (id === 'weapon') { this.pops.player = 1; for (const g of this.guards) this.sparkle(g.x, g.y - 40, 8, TIERS.weapon[tierOf('weapon', lv)].color); this.sparkle(this.player.x, this.player.y - 40, 10, '#fff'); if (changed) { this.text(this.player.x, this.player.y - 110, `⚔️ ${TIERS.weapon[tierOf('weapon', lv)].name}으로 교체!`, '#ffd166', 2.2); this.emit('tierUp'); } }
    else if (id === 'bag' || id === 'shoes') { this.pops.player = 1; this.sparkle(this.player.x, this.player.y - 40, 10, '#fff'); }
    else if (id === 'forest') { for (const t of this.trees) if (t.i >= this.treeCount - CFG.forest.perLevel && t.i < this.treeCount) this.sparkle(t.x, t.y - 50, 8, '#7CFC9A'); }
    else if (id === 'worker') { const w = this.workers[this.workers.length - 1]; if (w) this.sparkle(w.x, w.y - 40, 10, '#fff'); }
    else if (id === 'guard') { const g = this.guards[this.guards.length - 1]; if (g) this.sparkle(g.x, g.y - 40, 10, '#fff'); }
    else if (id === 'hunter') { const h = this.hunters[this.hunters.length - 1]; if (h) this.sparkle(h.x, h.y - 40, 10, '#fff'); }
    else if (id === 'fisher') { const f = this.fishers[this.fishers.length - 1]; if (f) this.sparkle(f.x, f.y - 40, 10, '#fff'); }
    else if (id === 'craftsman') { const c = this.craftsmen[this.craftsmen.length - 1]; if (c) this.sparkle(c.x, c.y - 40, 10, '#fff'); }
    else if (id === 'butcher') { this.pops.meat = 1; this.sparkle(CFG.shops.meat.x, CFG.shops.meat.y - 40, 20, '#ffb4b4'); }
    else if (id === 'townhall') { this.pops.townhall = 1; this.sparkle(TOWNHALL.x, TOWNHALL.y - 60, 30, '#ffd166'); const vt = TIERS.village[tierOf('village', lv)]; if (TIERS.village.some(t => t.at === lv)) { this.text(TOWNHALL.x, TOWNHALL.y - 150, `🏛️ 이제 ${vt.name}입니다!`, '#ffd166', 3); this.shake = 0.5; this.emit('tierUp'); } }
    else if (id === 'militia') { const m = this.guards[this.guards.length - 1]; if (m) this.sparkle(m.x, m.y - 40, 14, '#ff8a80'); }
    else if (id === 'beacon') { this.pops.beacon = 1; this.sparkle(BEACON.x, BEACON.y - 80, 20, '#ffb347'); }
    else if (id === 'training') { for (const w of this.workers.concat(this.hunters, this.fishers, this.craftsmen)) this.sparkle(w.x, w.y - 40, 6, '#7CFC9A'); }
    else if (id === 'fishShop') { this.pops.fish = 1; this.sparkle(CFG.shops.fish.x, CFG.shops.fish.y - 40, 20, '#9ad0ff'); }
    else if (id === 'ranch') { this.pops.ranch = 1; this.sparkle(CFG.ranch.barn.x, CFG.ranch.barn.y - 50, 20, '#ffd166'); for (const a of this.animals) this.sparkle(a.x, a.y - 20, 3, '#fff'); if (TIERS.ranch.some(t => t.at === lv)) { this.text(CFG.ranch.barn.x, CFG.ranch.barn.y - 130, `🦌 ${TIERS.ranch[tierOf('ranch', lv)].name}으로 확장!`, '#ffd166', 2.4); this.emit('tierUp'); } }
    else if (id === 'feed' || id === 'breed') { for (const a of this.animals) this.sparkle(a.x, a.y - 20, 4, id === 'feed' ? '#7CFC9A' : '#ffb4b4'); }
    else if (id === 'rancher') { const r = this.ranchers[this.ranchers.length - 1]; if (r) this.sparkle(r.x, r.y - 40, 10, '#fff'); }
    else if (id === 'slaughter') { this.pops.slaughter = 1; this.sparkle(CFG.shops.slaughter.x, CFG.shops.slaughter.y - 50, 18, '#ffb4b4'); }
    else if (id === 'slaughterman') { const m = this.slaughtermen[this.slaughtermen.length - 1]; if (m) this.sparkle(m.x, m.y - 40, 10, '#fff'); }
    else if (id === 'furShop' || id === 'peltPrice') { this.pops.pelt = 1; this.sparkle(CFG.shops.pelt.x, CFG.shops.pelt.y - 40, 16, '#d9a86c'); }
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
    if (!w.warned && this.t >= w.nextAt - this.warnTime) { w.warned = true; this.emit('warn'); }
    if (this.t >= w.nextAt) {
      w.n++; w.active = true;
      for (const type of this.waveComposition(w.n)) this.spawnBear(w.n, type);
      this.emit('wave', this.hut.x, this.hut.y, w.n);
    }
  }
  spawnBear(n, type) {
    const E = ENEMY[type || 'bear'];
    const side = Math.random(), R = CFG.wild.rect;
    let x, y;
    if (side < 0.6) { x = rnd(R.x + 20, R.x + R.w); y = CFG.world.h - 30; }
    else { x = 25; y = rnd(R.y, CFG.world.h - 40); }
    const boss = type === 'yeti' ? BOSS[bossTier(n)] : null;
    const hp = Math.round(this.bearHP(n) * (boss ? boss.hp : E.hp)), a = rnd(0, Math.PI * 2);
    this.bears.push({ x, y, hp, maxhp: hp, dmg: this.bearDmg(n) * (boss ? boss.dmg : E.dmg), speed: CFG.wave.speed * E.speed * rnd(0.95, 1.15), state: 'walk',
                      tx: this.hut.x + Math.cos(a) * 45, ty: this.hut.y + 28 + Math.sin(a) * 22, type: type || 'bear', r: E.r * (boss ? boss.scale : 1), meat: boss ? boss.meat : E.meat, pelt: boss ? E.pelt + bossTier(n) * 2 : E.pelt,
                      bounty: Math.round(this.bounty(n) * (boss ? boss.bounty : E.bounty)), scale: boss ? boss.scale : 1, bossName: boss ? boss.name : null, enraged: false,
                      atkT: rnd(0.2, 0.8), lunge: 0, flash: 0, facing: -1, moving: false, anim: 0, n, dead: false });
    if (boss) { this.text(x, y - 160, `👹 ${boss.name} 출현!`, '#ff5252', 3); this.emit('boss', x, y); }
  }
  hitBear(b, dmg, by, attacker) {
    if (b.dead) return;
    b.hp -= dmg; b.flash = 1;
    if (CFG.combat.hitText) this.text(b.x + rnd(-12, 12), b.y - (b.type === 'yeti' ? 150 : 58), `-${dmg}`, by === 'player' ? '#ffd166' : '#fff', 0.6);
    if (attacker && b.type !== 'yeti') {   // 밀려남
      const d = dist(b.x, b.y, attacker.x, attacker.y) || 1, k = CFG.combat.knockback * (by === 'player' ? 1 : 0.4);
      b.x += ((b.x - attacker.x) / d) * k; b.y += ((b.y - attacker.y) / d) * k;
      b.x = clamp(b.x, 10, CFG.world.w - 10); b.y = clamp(b.y, 10, CFG.world.h - 10);
    }
    if (b.type === 'wild' && b.state !== 'flee' && attacker) {   // 야생 곰은 맞으면 잠시 달아난다
      const d = dist(b.x, b.y, attacker.x, attacker.y) || 1;
      b.state = 'flee'; b.fleeT = 0.9; b.fx = (b.x - attacker.x) / d; b.fy = (b.y - attacker.y) / d;
    }
    this.emit('hit', b.x, b.y, by);
    if (b.hp <= 0) {
      b.dead = true; this.stats.kills++;
      if (b.type === 'wild') this.stats.hunts++;
      this.spawnBills(b.bounty, b.x, b.y, 20, 12, null);
      if (b.meat) this.spawnDrops('meat', b.meat, b.x, b.y);
      if (b.pelt) this.spawnDrops('pelt', b.pelt, b.x, b.y);
      this.emit('kill', b.x, b.y);
    }
  }
  // 경비병·플레이어가 맞는다. 체력이 0이 되면 잠시 쓰러진다
  hurt(f, dmg, isPlayer) {
    if (f.down > 0) return;
    dmg = Math.round(dmg * CFG.combat.foeDmgMul * 10) / 10;
    f.hp -= dmg; f.flash = 1;
    this.text(f.x + rnd(-10, 10), f.y - 70, `-${dmg}`, '#ff8a80', 0.6);
    this.emit('hurt', f.x, f.y);
    if (f.hp <= 0) {
      f.hp = 0; f.down = isPlayer ? CFG.player.downTime : CFG.guard.downTime;
      this.text(f.x, f.y - 90, isPlayer ? '😵 기절! 잠시 못 움직여요' : '💫 경비병이 쓰러졌다!', '#ff8a80', 1.6);
      this.emit(isPlayer ? 'playerDown' : 'guardDown', f.x, f.y);
    }
  }
  nearestFoe(x, y, range) {
    let best = null, bd = range, isPlayer = false;
    for (const g of this.guards) { if (g.down > 0) continue; const d = dist(x, y, g.x, g.y); if (d < bd) { bd = d; best = g; } }
    const p = this.player;
    if (p.down <= 0) { const d = dist(x, y, p.x, p.y); if (d < bd) { bd = d; best = p; isPlayer = true; } }
    return best ? { foe: best, isPlayer } : null;
  }
  updateBears(dt) {
    const camp = CFG.camp, hut = this.hut, CB = CFG.combat;
    for (const b of this.bears) {
      b.moving = false; b.flash = Math.max(0, b.flash - dt * 6); b.lunge = Math.max(0, b.lunge - dt * 3);
      b.atkT -= dt;
      // 보스 분노
      if (b.type === 'yeti' && !b.enraged && b.hp <= b.maxhp * ENRAGE.at) { b.enraged = true; b.speed *= ENRAGE.speed; b.dmg *= ENRAGE.dmg; this.text(b.x, b.y - 170, `${b.bossName} 분노!!`, '#ff5252', 2); this.shake = 0.8; this.emit('enrage', b.x, b.y); }
      // 가까운 경비병·플레이어와 싸운다
      if (b.state !== 'fight') { const f = this.nearestFoe(b.x, b.y, CB.engageRange); if (f) { b.state = 'fight'; b.foe = f.foe; b.foeIsPlayer = f.isPlayer; } }
      if (b.state === 'fight') {
        const f = b.foe;
        const fd = dist(b.x, b.y, f.x, f.y);
        if (!f || f.down > 0 || fd > CB.disengageRange) { b.state = 'walk'; b.foe = null; continue; }
        b.facing = f.x < b.x ? -1 : 1;
        if (fd > CB.engageRange - 12) { moveToward(b, f.x, f.y, b.speed * 1.3, dt); b.anim += dt * 8; }   // 밀려났으면 다시 다가온다
        else if (b.atkT <= 0) { b.atkT = 1; b.lunge = 1; this.hurt(f, b.dmg, b.foeIsPlayer); }
        continue;
      }
      if (b.state === 'walk') {
        const d = dist(b.x, b.y, b.tx, b.ty);
        if (d <= 6) { b.state = 'hut'; continue; }
        const nx = b.x + ((b.tx - b.x) / d) * b.speed * dt, ny = b.y + ((b.ty - b.y) / d) * b.speed * dt;
        if (this.fence.hp > 0 && inRect(nx, ny, camp) && !inRect(b.x, b.y, camp)) { b.state = 'fence'; b.facing = hut.x < b.x ? -1 : 1; continue; }
        b.x = nx; b.y = ny; b.moving = true; b.anim += dt * 8; b.facing = b.tx < b.x ? -1 : 1;
      } else if (b.state === 'fence') {
        if (this.fence.hp <= 0) { b.state = 'walk'; continue; }
        if (!inRect(b.x, b.y, { x: camp.x - 30, y: camp.y - 30, w: camp.w + 60, h: camp.h + 60 })) { b.state = 'walk'; continue; }   // 밀려났으면 다시 접근
        if (b.atkT <= 0) {
          b.atkT = 1; b.lunge = 1;
          this.fence.hp = Math.max(0, this.fence.hp - b.dmg);
          this.emit('hitFence', b.x, b.y);
          if (this.fence.hp <= 0) { this.text(hut.x, hut.y - 110, '울타리가 부서졌다!', '#ff8a80', 1.6); this.emit('fenceBroken', hut.x, hut.y); }
        }
      } else if (b.state === 'hut') {
        if (dist(b.x, b.y, b.tx, b.ty) > 40) { b.state = 'walk'; continue; }
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
      g.moving = false; g.atkT -= dt; g.swing = Math.max(0, g.swing - dt * 4); g.flash = Math.max(0, g.flash - dt * 6);
      if (g.down > 0) { g.down -= dt; if (g.down <= 0) { g.hp = g.maxhp; this.text(g.x, g.y - 70, '경비병 복귀!', '#7CFC9A', 1.2); } continue; }
      if (g.hp < g.maxhp && this.bears.length === 0) g.hp = Math.min(g.maxhp, g.hp + (g.maxhp / G.regenTime) * dt);
      const b = this.nearestBear(g.x, g.y, Infinity);
      if (b) {
        if (dist(g.x, g.y, b.x, b.y) > G.range) moveToward(g, b.x, b.y, this.guardSpeed, dt);
        else {
          g.facing = b.x < g.x ? -1 : 1;
          if (g.atkT <= 0) { g.atkT = G.atkCd; g.swing = 1; this.hitBear(b, Math.round(this.guardDmg * (g.militia ? 1.6 : 1) * this.moraleMul * 10) / 10, 'guard', g); }
        }
      } else moveToward(g, g.post.x, g.post.y, this.guardSpeed, dt);
      if (g.moving) g.anim += dt * 11;
    }
    separate(this.guards, 26, 0.4);
  }

  updateTower(dt) {
    if (this.lv.tower <= 0) return;
    this.towerT -= dt;
    if (this.towerT > 0) return;
    const T = CFG.tower;
    const inRange = this.bears.filter(b => !b.dead && dist(T.x, T.y, b.x, b.y) < this.towerRange).sort((a, b) => dist(T.x, T.y, a.x, a.y) - dist(T.x, T.y, b.x, b.y));
    if (!inRange.length) return;
    this.towerT = T.cd;
    const sx = T.x, sy = T.y - 95 - 20 * tierOf('tower', this.lv.tower), n = this.towerArrows;
    for (let i = 0; i < n; i++) {
      const b = inRange[i % inRange.length];
      this.arrows.push({ x: sx, y: sy, sx, sy, target: b, t: -i * 0.08, dur: Math.max(0.15, dist(sx, sy, b.x, b.y) / 650), dmg: this.towerDmg, tier: tierOf('tower', this.lv.tower) });
    }
    this.emit('arrow', sx, sy);
  }
  updateArrows(dt) {
    for (const a of this.arrows) {
      a.t += dt;
      if (a.t < 0) continue;
      const k = Math.min(1, a.t / a.dur), b = a.target;
      const tx = b.x, ty = b.y - 16;
      const px = a.x, py = a.y;
      a.x = lerp(a.sx, tx, k); a.y = lerp(a.sy, ty, k) - Math.sin(k * Math.PI) * 36;
      a.ang = Math.atan2(a.y - py, a.x - px);
      if (k >= 1) { a.dead = true; if (!b.dead) this.hitBear(b, a.dmg, 'tower', null); }
    }
    this.arrows = this.arrows.filter(a => !a.dead);
  }

  updateFx(dt) {
    for (const c of this.chips) { c.t += dt; c.x += c.vx * dt; c.vy += 420 * dt; c.y += c.vy * dt; }
    this.chips = this.chips.filter(c => c.t < 0.6);
    for (const s of this.splashes) s.t += dt;
    this.splashes = this.splashes.filter(s => s.t < 0.7);
    for (const s of this.sparks) { s.t += dt; s.x += s.vx * dt; s.vy += 140 * dt; s.y += s.vy * dt; }
    this.sparks = this.sparks.filter(s => s.t < s.life);
    for (const k of Object.keys(this.pops)) this.pops[k] = Math.max(0, this.pops[k] - dt * 1.6);
    for (const t of this.texts) { t.t += dt; t.y -= 28 * dt; }
    this.texts = this.texts.filter(t => t.t < t.life);
    this.shake = Math.max(0, this.shake - dt * 4);
  }

  updateTutorial() {
    const s = this.tutorial;
    if (s === 0 && this.stats.chops > 0) this.tutorial = 1;
    else if (s === 1 && (this.shops.wood.stock.wood > 0 || this.stats.sales > 0)) this.tutorial = 2;
    else if (s === 2 && this.earned > 0) this.tutorial = 3;
    else if (s === 3 && Object.values(this.lv).some(v => v > 0)) this.tutorial = 4;
    else if (s === 4 && (this.lv.fence > 0 || this.lv.guard > 0 || this.wave.n > 0)) this.tutorial = 5;
    // 새 컨텐츠 팁(한 번씩)
    for (const tip of TIPS) {
      if (this.tips.includes(tip.id)) continue;
      if (tip.when(this)) { this.tips.push(tip.id); this.tipQueue.push(tip); }
    }
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

if (typeof module !== 'undefined') module.exports = { Game, dist, clamp, lerp, moveToward, HUT_RECT, MART_RECT, FURN_RECT, SLAUGHTER_RECT, shopRect, GOOD_IDS, ALL_GOODS, FURN_IDS };
