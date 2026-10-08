// 눈보라 벌목장 — 밸런스 설정. 숫자를 바꾸면 게임 난이도와 경제가 바뀐다.
'use strict';

const CFG = {
  saveKey: 'blizzard-lumber-v1',
  world: { w: 1100, h: 1500 },
  // 화면에 보이는 월드 폭(세로 화면) / 높이(가로 화면)
  view: { portraitW: 560, landscapeH: 760 },

  player: {
    x: 520, y: 760, speed: 150,
    chopTime: 1.3,          // 도끼 1레벨 기준 통나무 1개를 베는 시간(초)
    carry: 5, carryPerBag: 3,
    pickup: 60,             // 돈을 자동으로 줍는 반경
    atkRange: 75, atkCd: 0.6, atkDmg: 4,
  },
  worker: { speed: 115, chopMul: 1.5, carry: 4, dropRate: 0.12, idle: { x: 470, y: 560 } },
  guard:  { speed: 140, atkCd: 0.8, range: 55, dmg: 4 },
  weapon: { dmgPer: 2 },
  tower:  { x: 430, y: 915, cd: 1.1, dmg: 6, dmgPer: 5, range: 240, rangePer: 12 },

  tree:   { logs: 3, regrow: 8, range: 50 },
  forest: { origin: { x: 110, y: 170 }, dx: 95, dy: 85, cols: 4, rows: 6, base: 6, perLevel: 3,
            rect: { x: 50, y: 80, w: 405, h: 545 } },

  counter: {
    x: 640, y: 640, w: 170, h: 50, cap: 60,
    drop: { x: 525, y: 665, r: 55 },     // 목재를 내려놓는 칸
    moneySpot: { x: 640, y: 735 },        // 손님이 돈을 두는 자리
    cashier: { x: 700, y: 596 },          // 계산원이 서는 자리
    dropRate: 0.07,
  },
  customer: {
    spawn: { x: 1090, y: 1010 }, exit: { x: 1090, y: 1180 },
    queue: { x: 765, y: 672, dx: 0.62, dy: 0.78, gap: 48, max: 8 },
    speed: 120,
    interval: 4.5, intervalMul: 0.9, minInterval: 1.3,   // 홍보 레벨당 방문 간격 ×0.9, 최소 1.3초
    wantMin: 1, wantMax: 3,
    serve: 0.7, serveCashier: 0.35,
    patience: 40,
    bigEvery: 170, bigAfter: 150, bigMul: 1.5, bigPatience: 70,   // 대량 구매자: 150초 이후 170초마다, 1.5배 가격
  },
  price: { base: 8, growth: 1.12 },

  hut:  { x: 300, y: 985, hp: 120, hpPerFence: 20, r: 75 },
  camp: { x: 150, y: 880, w: 320, h: 240 },
  fence: { baseHP: 80, growth: 1.22, regenTime: 45 },

  wave: {
    first: 100,              // 첫 습격까지의 시간(초)
    interval: 75, intervalPer: 3,   // 다음 습격까지 = interval + intervalPer × 웨이브
    warn: 12,               // 경고 시간(초)
    hp: 30, hpGrowth: 1.14,
    dmg: 3, dmgGrowth: 1.06,
    bounty: 12, bountyGrowth: 1.12,
    speed: 55,
  },
  pad: { r: 40, minRate: 40, rateMul: 1.3 },   // 원 위에 서면 초당 max(40, 가격×1.3)씩 지불
  offline: { min: 60, cap: 2 * 3600, eff: 0.6 },
  meta: { bonusPer: 0.03, flakeEvery: 3 },     // 눈송이 1개당 수입 +3%, 격퇴 3웨이브마다 눈송이 1개
};

// 업그레이드 정의. pad = 바닥의 결제 원 위치, unlock = 보이는 조건. max가 Infinity면 끝없이 올릴 수 있다.
const UPG = [
  { id: 'axe',    icon: '🪓', name: '도끼',       desc: '모두의 벌목 속도 +11%',    max: Infinity,
    cost: l => Math.round(30 * Math.pow(1.35, l)),  pad: { x: 150, y: 695 }, unlock: () => true },
  { id: 'bag',    icon: '🎒', name: '가방',       desc: '내 운반량 +3, 2레벨마다 벌목꾼 +1', max: Infinity,
    cost: l => Math.round(60 * Math.pow(1.5, l)),   pad: { x: 260, y: 695 }, unlock: () => true },
  { id: 'worker', icon: '👷', name: '벌목꾼 고용', desc: '스스로 베고 나르는 일꾼',   max: 10,
    cost: l => [100, 250, 600, 1300, 2600, 5000, 9500, 18000, 35000, 70000][l], pad: { x: 370, y: 695 }, unlock: () => true },
  { id: 'forest', icon: '🌲', name: '숲 확장',    desc: '나무 +3그루',              max: 6,
    cost: l => [220, 600, 1500, 3500, 8000, 18000][l], pad: { x: 500, y: 420 }, unlock: g => g.lv.worker >= 2 },
  { id: 'shoes',  icon: '👟', name: '신발',       desc: '내 이동 속도 +10%',        max: 10,
    cost: l => Math.round(90 * Math.pow(1.6, l)),   pad: { x: 480, y: 560 }, unlock: g => g.lv.bag >= 1 },

  { id: 'price',  icon: '💲', name: '목재 가격',  desc: '통나무 판매가 +12%',        max: Infinity,
    cost: l => Math.round(150 * Math.pow(1.4, l)),  pad: { x: 560, y: 830 }, unlock: g => g.stats.sales >= 3 },
  { id: 'promo',  icon: '📣', name: '홍보',       desc: '손님 +11%, 3레벨마다 구매량 +1, 판매대 +10', max: Infinity,
    cost: l => Math.round(120 * Math.pow(1.45, l)), pad: { x: 660, y: 830 }, unlock: g => g.lv.price >= 1 },
  { id: 'cashier', icon: '🧾', name: '계산원',    desc: '돈 자동 수금, 판매 2배 빠름', max: 1,
    cost: () => 450,                                pad: { x: 760, y: 830 }, unlock: g => g.lv.price >= 2 && g.lv.worker >= 2 },

  { id: 'fence',  icon: '🧱', name: '울타리 보강', desc: '울타리 내구도 ×1.22, 본부 +20', max: Infinity,
    cost: l => Math.round(60 * Math.pow(1.3, l)),  pad: { x: 560, y: 980 }, unlock: () => true },
  { id: 'guard',  icon: '🛡️', name: '경비병 고용', desc: '곰과 싸우는 경비병',       max: 8,
    cost: l => [180, 400, 900, 2000, 4200, 9000, 19000, 40000][l], pad: { x: 560, y: 1080 }, unlock: g => g.lv.worker >= 1 || g.wave.n >= 1 || g.t >= 60 },
  { id: 'weapon', icon: '⚔️', name: '무기',       desc: '나와 경비병 공격력 +2',     max: Infinity,
    cost: l => Math.round(80 * Math.pow(1.3, l)),  pad: { x: 660, y: 980 }, unlock: g => g.lv.guard >= 1 },
  { id: 'tower',  icon: '🏹', name: '감시탑',     desc: '화살 공격력 +5, 사거리 +12', max: Infinity,
    cost: l => Math.round(250 * Math.pow(1.4, l)), pad: { x: 660, y: 1080 }, unlock: g => g.lv.guard >= 1 && g.wave.n >= 2 },
  { id: 'repair', icon: '🔧', name: '본부 수리',  desc: '본부 내구도 전부 회복',     max: Infinity,
    cost: () => 0,                                 pad: { x: 300, y: 1180 }, unlock: g => g.hut.hp < g.hut.maxhp - 0.5 },
];

// 적 종류. 웨이브가 오를수록 섞여 나온다.
const ENEMY = {
  bear: { name: '북극곰', emoji: '🐻', hp: 1,    dmg: 1,   speed: 1,   bounty: 1,   r: 34 },
  wolf: { name: '늑대',   emoji: '🐺', hp: 0.45, dmg: 0.6, speed: 1.9, bounty: 0.6, r: 26 },
  yeti: { name: '설인',   emoji: '👹', hp: 6,    dmg: 2.5, speed: 0.7, bounty: 8,   r: 50 },
};

// 숲의 나무 자리. 캠프와 가까운 아래쪽 줄부터 채운다.
const FOREST_SPOTS = (() => {
  const out = [];
  const F = CFG.forest;
  for (let r = F.rows - 1; r >= 0; r--)
    for (let c = 0; c < F.cols; c++)
      out.push({ x: F.origin.x + c * F.dx + (r % 2) * 18, y: F.origin.y + r * F.dy });
  return out;
})();

// 경비병이 평소에 서 있는 자리
const GUARD_POSTS = [
  { x: 190, y: 915 }, { x: 420, y: 1095 }, { x: 420, y: 960 }, { x: 190, y: 1095 }, { x: 300, y: 1125 },
  { x: 250, y: 1100 }, { x: 350, y: 1100 }, { x: 440, y: 1030 },
];

// 처음 하는 사람에게 보여 주는 안내
const HINTS = [
  { text: '화면을 드래그(또는 방향키)해서 나무 옆에 서면 저절로 벌목합니다', target: () => ({ x: 395, y: 595 }) },
  { text: '판매대 왼쪽의 초록 칸에 서면 목재를 내려놓습니다', target: () => CFG.counter.drop },
  { text: '손님이 두고 간 돈 가까이 가면 저절로 줍습니다', target: () => CFG.counter.moneySpot },
  { text: '바닥의 원 위에 서면 돈이 빠져나가면서 업그레이드됩니다', target: () => UPG[0].pad },
  { text: '곧 북극곰이 옵니다! 🧱 울타리와 🛡️ 경비병으로 본부를 지키세요', target: () => UPG.find(u => u.id === 'fence').pad },
];

if (typeof module !== 'undefined') module.exports = { CFG, UPG, ENEMY, FOREST_SPOTS, GUARD_POSTS, HINTS };
