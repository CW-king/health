// 눈보라 벌목장 — 밸런스 설정. 숫자를 바꾸면 게임 난이도와 경제가 바뀐다.
'use strict';

const CFG = {
  saveKey: 'blizzard-lumber-v1',
  world: { w: 2000, h: 2600 },
  // 화면에 보이는 월드 폭(세로 화면) / 높이(가로 화면)
  view: { portraitW: 580, landscapeH: 800 },

  player: {
    x: 700, y: 1200, speed: 170,
    chopTime: 1.3,          // 도끼 1레벨 기준 통나무 1개를 베는 시간(초)
    carry: 5, carryPerBag: 3,
    pickup: 64,             // 돈·고기를 자동으로 줍는 반경
    atkRange: 78, atkCd: 0.6, atkDmg: 4,
    hp: 100, hpPerWeapon: 20, downTime: 6, regenTime: 25,   // 플레이어 체력. 0이 되면 downTime초 기절
  },
  worker: { speed: 130, chopMul: 1.5, carry: 4, dropRate: 0.12, idle: { x: 720, y: 900 } },
  guard:  { speed: 155, atkCd: 0.8, range: 55, dmg: 4, hp: 50, hpPerWeapon: 10, downTime: 20, regenTime: 30 },   // 경비병도 맞으면 쓰러진다
  weapon: { dmgPer: 2 },
  // 감시탑: 남문 앞이 첫 탑. per레벨마다 sites 순서대로 탑이 하나씩 더 선다(서쪽 담 밖 → 동쪽 담 밖 → 황무지 전진 초소)
  tower:  { x: 330, y: 1920, cd: 1.1, dmg: 6, dmgPer: 5, range: 320, rangePer: 14, per: 6,
            sites: [{ x: 330, y: 1920 }, { x: 50, y: 1720 }, { x: 610, y: 1650 }, { x: 160, y: 2110 }] },   // 외형 단계(1/4/8레벨)마다 화살 1→2→3발

  tree:   { logs: 3, regrow: 8, range: 50 },
  // 남쪽 숲: 공방 가까운 벌목지. 개간 레벨마다 perLevel그루가 열린다
  grove: { rect: { x: 80, y: 1010, w: 520, h: 300 }, origin: { x: 150, y: 1072 }, dx: 108, dy: 88, cols: 4, rows: 3, perLevel: 4 },
  forest: { origin: { x: 130, y: 310 }, dx: 108, dy: 88, cols: 5, rows: 7, base: 8, perLevel: 4,
            rect: { x: 60, y: 220, w: 600, h: 660 } },

  // 상품. base = 기본 판매가, 가격 업그레이드마다 ×1.12
  goods: {
    wood: { name: '목재', emoji: '🪵', base: 8,  priceUp: 'price' },
    meat: { name: '고기', emoji: '🥩', base: 22, priceUp: 'meatPrice' },
    fish: { name: '생선', emoji: '🐟', base: 15, priceUp: 'fishPrice' },
    pelt: { name: '모피', emoji: '🧥', base: 45, priceUp: 'peltPrice' },     // 곰·늑대·순록의 모피(사냥터·습격 전리품·무두질)
    animal: { name: '순록', emoji: '🦌', base: 0, priceUp: 'meatPrice' },   // 출하 순록(도축장으로 데려간다)
    // 제작품: shop = 만드는 곳, tier = 그 가게 레벨 순서, inputs = 재료, time = 제작 시간(초)
    chair:  { name: '의자',   emoji: '🪑', base: 60,   priceUp: 'furnPrice', shop: 'furn', inputs: { wood: 3 },  time: 4,  tier: 1 },
    sofa:   { name: '소파',   emoji: '🛋️', base: 150,  priceUp: 'furnPrice', shop: 'furn', inputs: { wood: 6 },  time: 7,  tier: 2 },
    bed:    { name: '침대',   emoji: '🛏️', base: 300,  priceUp: 'furnPrice', shop: 'furn', inputs: { wood: 10 }, time: 11, tier: 3 },
    closet: { name: '옷장',   emoji: '🗄️', base: 560,  priceUp: 'furnPrice', shop: 'furn', inputs: { wood: 16 }, time: 16, tier: 4 },
    piano:  { name: '피아노', emoji: '🎹', base: 1300, priceUp: 'furnPrice', shop: 'furn', inputs: { wood: 30 }, time: 28, tier: 5 },
    sashimi: { name: '생선회',   emoji: '🍣', base: 80,  priceUp: 'dishPrice', shop: 'rest', inputs: { fish: 2 },          time: 5,  tier: 1 },
    stew:    { name: '순록 스튜', emoji: '🍲', base: 140, priceUp: 'dishPrice', shop: 'rest', inputs: { meat: 2 },          time: 8,  tier: 2 },
    hotpot:  { name: '해물탕',   emoji: '🥘', base: 300, priceUp: 'dishPrice', shop: 'rest', inputs: { fish: 3, meat: 1 }, time: 12, tier: 3 },
    feast:   { name: '잔치 상차림', emoji: '🍱', base: 800, priceUp: 'dishPrice', shop: 'rest', inputs: { fish: 4, meat: 4 }, time: 20, tier: 4 },
    gloves:  { name: '가죽 장갑', emoji: '🧤', base: 90,   priceUp: 'clothPrice', shop: 'tailor', inputs: { pelt: 1 }, time: 5,  tier: 1 },
    coat:    { name: '모피 코트', emoji: '🧥', base: 320,  priceUp: 'clothPrice', shop: 'tailor', inputs: { pelt: 3 }, time: 10, tier: 2 },
    cloak:   { name: '모피 망토', emoji: '🧣', base: 700,  priceUp: 'clothPrice', shop: 'tailor', inputs: { pelt: 5 }, time: 16, tier: 3 },
    robe:    { name: '왕실 예복', emoji: '👘', base: 1600, priceUp: 'clothPrice', shop: 'tailor', inputs: { pelt: 8 }, time: 26, tier: 4 },
  },
  // 가게. drop = 물건을 내려놓는 칸, lanes = 손님 줄(시작점·방향), rate = 손님 방문 간격 배수, mul = 가격 배수
  shops: {
    wood: { name: '목재 판매대', goods: ['wood'], x: 980, y: 1000, w: 190, cap: 60, rate: 1, mul: 1,
            drop: { x: 840, y: 1025, r: 56 }, moneySpot: { x: 980, y: 1095 }, cashier: { x: 1050, y: 956 },
            lanes: [{ x: 1115, y: 1035, dx: 0.2, dy: 0.98 }], gap: 48, max: 10, serve: 0.7 },
    meat: { name: '정육점', goods: ['meat'], x: 1560, y: 1000, w: 160, cap: 40, rate: 1.3, mul: 1,
            drop: { x: 1560, y: 900, r: 50 }, moneySpot: { x: 1560, y: 1075 }, cashier: { x: 1615, y: 956 },
            lanes: [{ x: 1670, y: 1030, dx: 0.25, dy: 0.97 }], gap: 46, max: 8, serve: 0.8 },
    fish: { name: '어물전', goods: ['fish'], x: 980, y: 380, w: 160, cap: 40, rate: 1.2, mul: 1,
            drop: { x: 860, y: 410, r: 50 }, moneySpot: { x: 980, y: 460 }, cashier: { x: 1035, y: 336 },
            lanes: [{ x: 1090, y: 415, dx: 0.3, dy: 0.95 }], gap: 46, max: 8, serve: 0.8 },
    mart: { name: '마트', goods: ['wood', 'meat', 'fish', 'pelt'], x: 1500, y: 2150, w: 300, cap: 120, rate: 0.55, mul: 1.3,
            drop: { x: 1290, y: 2200, r: 58 }, moneySpot: { x: 1380, y: 2260 }, cashier: { x: 1440, y: 2100 },
            lanes: [{ x: 1420, y: 2270, dx: 0.12, dy: 0.99 }, { x: 1500, y: 2270, dx: 0.12, dy: 0.99 }, { x: 1580, y: 2270, dx: 0.12, dy: 0.99 }, { x: 1660, y: 2270, dx: 0.12, dy: 0.99 }, { x: 1740, y: 2270, dx: 0.12, dy: 0.99 }],
            gap: 44, max: 6, serve: 0.6 },
    pelt: { name: '모피 상점', goods: ['pelt'], x: 1780, y: 800, w: 150, cap: 40, rate: 1.25, mul: 1,
            drop: { x: 1680, y: 830, r: 48 }, moneySpot: { x: 1780, y: 875 }, cashier: { x: 1830, y: 756 },
            lanes: [{ x: 1890, y: 835, dx: 0.1, dy: 1 }], gap: 46, max: 6, serve: 0.9 },
    // 가구 공방: 목재(accepts)를 받아 가구(goods)를 만들어 판다. 마트가 생겨도 따로 영업한다
    furn: { name: '가구 공방', goods: ['chair', 'sofa', 'bed', 'closet', 'piano'], accepts: ['wood'], x: 900, y: 1800, w: 240, cap: 12, matCap: 60, rate: 1.5, mul: 1,
            drop: { x: 740, y: 1720, r: 52 }, moneySpot: { x: 1080, y: 1945 }, cashier: { x: 980, y: 1756 },
            lanes: [{ x: 1150, y: 1865, dx: 1, dy: 0.05 }], gap: 48, max: 7, serve: 1.0,
            benches: [{ x: 820, y: 1885 }, { x: 900, y: 1885 }, { x: 980, y: 1885 }], benchRange: 42, upg: 'workshop', worker: 'craftsman' },
    // 마트가 생기면 열리는 새 가게들(빈 자리에 들어선다)
    rest: { name: '식당', goods: ['sashimi', 'stew', 'hotpot', 'feast'], accepts: ['fish', 'meat'], x: 980, y: 1000, w: 220, cap: 12, matCap: 60, rate: 1.3, mul: 1,
            drop: { x: 840, y: 1025, r: 56 }, moneySpot: { x: 870, y: 1140 }, cashier: { x: 1060, y: 956 },
            lanes: [{ x: 1130, y: 1040, dx: 0.2, dy: 0.98 }], gap: 48, max: 8, serve: 0.9,
            benches: [{ x: 900, y: 1090 }, { x: 980, y: 1090 }, { x: 1060, y: 1090 }], benchRange: 42, upg: 'restaurant', worker: 'cook' },
    tailor: { name: '재단소', goods: ['gloves', 'coat', 'cloak', 'robe'], accepts: ['pelt'], x: 1780, y: 800, w: 170, cap: 10, matCap: 40, rate: 1.6, mul: 1,
            drop: { x: 1680, y: 830, r: 48 }, moneySpot: { x: 1780, y: 960 }, cashier: { x: 1830, y: 756 },
            lanes: [{ x: 1890, y: 835, dx: 0.1, dy: 1 }], gap: 46, max: 6, serve: 1.0,
            benches: [{ x: 1740, y: 890 }, { x: 1820, y: 890 }], benchRange: 42, upg: 'tailor', worker: 'tailorman' },
    inn: { name: '여관', goods: [], accepts: [], x: 1560, y: 1000, w: 170, cap: 0, rate: 1.2, mul: 1, stay: 40, rent: 25,
            drop: { x: 1560, y: 900, r: 0 }, moneySpot: { x: 1470, y: 1085 }, cashier: { x: 1615, y: 956 }, door: { x: 1560, y: 1050 },
            lanes: [{ x: 1660, y: 1070, dx: 0.25, dy: 0.97 }], gap: 46, max: 8, serve: 0.5 },
    // 도축장: 출하 순록(accepts)을 받아 고기로 만든다. 손님은 오지 않고, 고기는 정육점·마트로 나른다
    slaughter: { name: '도축장', goods: [], accepts: ['animal'], x: 1300, y: 1500, w: 150, cap: 60, animalCap: 6, rate: 1, mul: 1,
            drop: { x: 1300, y: 1392, r: 48 }, pickup: { x: 1190, y: 1565, r: 46 }, work: { x: 1380, y: 1560 }, rack: { x: 1085, y: 1560 }, moneySpot: { x: 1300, y: 1560 }, cashier: { x: 1300, y: 1456 },
            lanes: [{ x: 1300, y: 1600, dx: 0, dy: 1 }], gap: 40, max: 0, serve: 1, time: 6 },
  },
  counter: { dropRate: 0.07 },
  ship: { every: 180, stay: 60, mul: 1.6, dock: { x: 980, y: 300 }, berth: { x: 980, y: 110 }, minDemand: 10, maxDemand: 30 },   // 무역선: 마트가 있으면 3분마다 입항
  river: { x: 0, y: 30, w: 2000, h: 120 },                        // 강(맨 위)
  fishing: { spots: [{ x: 820, y: 190 }, { x: 940, y: 190 }, { x: 1060, y: 190 }, { x: 1180, y: 190 }],
             range: 42, time: 3.0, fisherMul: 1.3, carry: 4 },   // 낚시: 3초에 한 마리, 낚싯대 레벨당 ×0.89
  hunt: { rect: { x: 1450, y: 250, w: 500, h: 370 }, max: 3, maxPerHunter: 1, respawn: 10, firstAt: 45,
          hp: 25, hpGrowth: 1.06, speed: 35, fleeSpeed: 95, meat: 1, pelt: 2, bountyMul: 0.5,
          hunterDmg: 6, hunterCd: 0.8, hunterRange: 52, hunterCarry: 4, pickup: 46,
          post: { x: 1520, y: 580 }, collectorPost: { x: 1600, y: 640 }, collectorPostSouth: { x: 615, y: 1790 },   // 수거꾼 초소: 사냥터 입구 + 캠프 옆
          collectorCarry: 6, collectorPickup: 44, sledCarry: 4, sledPickup: 12, sledSpeed: 0.12, baitPer: 1,
          // 전리품 구역(캠프·황무지): 이 안의 드랍은 거리 가중치 zoneMul, 모피는 peltMul, 오래된 드랍은 agePer px/초만큼 먼저 줍는다
          loot: { rect: { x: 0, y: 1300, w: 900, h: 1300 }, zoneMul: 0.5, peltMul: 0.7, agePer: 8, ageMax: 60, sweepRange: 650 } },   // 야생 곰 사냥터(오른쪽 위)
  drops: { max: 150 },                                            // 바닥 드랍 상한(넘으면 전리품 구역 밖의 오래된 것부터 치운다)
  pileFull: 0.8,                                                  // 더미가 이만큼 차면 생산자는 직접 나른다(수거꾼이 모자라다는 신호)
  // 더미: 운반 분업(logistics) 뒤 생산자가 물건을 쌓아 두는 곳. 수거꾼이 여기서 실어 가게로 나른다. lv = 열리는 분업 단계
  piles: {
    pelt:      { x: 1560, y: 520,  good: 'pelt', name: '가죽 더미',   cap: 100, lv: 1 },   // 사냥꾼 초소 옆
    fish:      { x: 900,  y: 162,  good: 'fish', name: '생선 바구니', cap: 100, lv: 2 },   // 낚시터 물가
    fishFarm:  { x: 520,  y: 200,  good: 'fish', name: '양식 바구니', cap: 100, lv: 2 },   // 양식장 둑
    woodMain:  { x: 740,  y: 840,  good: 'wood', name: '통나무 더미', cap: 120, lv: 3 },   // 숲 동쪽 울타리 밖(벌목꾼 대기 자리 옆)
    woodGrove: { x: 640,  y: 1290, good: 'wood', name: '통나무 더미', cap: 120, lv: 3 },   // 남쪽 숲 옆
  },
  // 양식장: 강 왼쪽 가두리. growTime초 자라면 양식업자가 건져 yield마리를 나른다
  fishFarm: { pens: [{ x: 300, y: 95 }, { x: 390, y: 95 }, { x: 480, y: 95 }, { x: 570, y: 95 }, { x: 660, y: 95 }, { x: 750, y: 95 }],
              growTime: 40, yield: 6, harvestTime: 1.5, bankY: 174, post: { x: 400, y: 186 }, carry: 12 },
  wild: { rect: { x: 20, y: 2020, w: 880, h: 560 } },            // 남쪽 황무지: 습격은 여기서 온다
  // 목장: 순록을 길러 출하한다. 레벨마다 perLevel마리, growTime초 자라면 출하 가능
  ranch: { rect: { x: 1500, y: 1450, w: 400, h: 350 }, barn: { x: 1600, y: 1530 }, perLevel: 2, growTime: 60, meat: 4, harvestTime: 1.0, range: 48,
           speed: 26, rancherCarry: 1, post: { x: 1520, y: 1770 }, hay: [{ x: 1840, y: 1500 }, { x: 1870, y: 1520 }], trough: { x: 1820, y: 1760 } },
  customer: {
    spawn: { x: 1980, y: 1250 }, exit: { x: 1980, y: 1450 },
    speed: 140,
    interval: 3.4, intervalMul: 0.9, minInterval: 1.0,   // 홍보 레벨당 방문 간격 ×0.9, 최소 1초
    wantMin: 1, wantMax: 4,
    cashierMul: 0.5,
    patience: 45,
    bigEvery: 170, bigAfter: 150, bigMul: 1.5, bigPatience: 80,   // 대량 구매자: 150초 이후 170초마다, 1.5배 가격
  },
  price: { growth: 1.12 },
  combat: { knockback: 12, hitText: true, engageRange: 58, disengageRange: 95, foeDmgMul: 0.6 },   // 적이 경비병·플레이어를 공격하는 거리와 피해 배수

  hut:  { x: 330, y: 1640, hp: 120, hpPerFence: 20, r: 75 },
  camp: { x: 100, y: 1500, w: 460, h: 360 },
  fence: { baseHP: 80, growth: 1.22, regenTime: 45 },

  wave: {
    first: 100,             // 첫 습격까지의 시간(초)
    interval: 75, intervalPer: 3,   // 다음 습격까지 = interval + intervalPer × 웨이브
    warn: 12,               // 경고 시간(초)
    hp: 30, hpGrowth: 1.14,
    dmg: 3, dmgGrowth: 1.06,
    bounty: 12, bountyGrowth: 1.12,
    speed: 60,
  },
  pad: { r: 42, minRate: 40, rateMul: 1.3 },   // 원 위에 서면 초당 max(40, 가격×1.3)씩 지불
  offline: { min: 60, cap: 2 * 3600, eff: 0.6 },
  meta: { bonusPer: 0.03, flakeEvery: 3 },     // 눈송이 1개당 수입 +3%, 격퇴 3웨이브마다 눈송이 1개
};

// 업그레이드 정의. pad = 바닥의 결제 원 위치, unlock = 보이는 조건. max가 Infinity면 끝없이 올릴 수 있다.
// 고정 가격표 뒤로는 마지막 값에서 growth배씩 올린다(고용 상한을 늘려도 가격이 이어지도록)
const tbl = (arr, growth) => l => (arr[l] != null ? arr[l] : Math.round(arr[arr.length - 1] * Math.pow(growth, l - arr.length + 1)));
const UPG = [
  { id: 'axe',    icon: '🪓', name: '도끼',       desc: '모두의 벌목 속도 +11%',    max: Infinity,
    cost: l => Math.round(30 * Math.pow(1.35, l)),  pad: { x: 150, y: 960 }, unlock: () => true },
  { id: 'bag',    icon: '🎒', name: '가방',       desc: '내 운반량 +3, 모든 일꾼 운반량 +1(경비병 제외)', max: Infinity,
    cost: l => Math.round(60 * Math.pow(1.5, l)),   pad: { x: 340, y: 960 }, unlock: () => true },
  { id: 'worker', icon: '👷', name: '벌목꾼 고용', desc: '스스로 베고 나르는 일꾼',   max: 10,
    cost: l => [100, 250, 600, 1300, 2600, 5000, 9500, 18000, 35000, 70000][l], pad: { x: 530, y: 960 }, unlock: () => true },
  { id: 'forest', icon: '🌲', name: '숲 확장',    desc: '나무 +4그루',              max: 6,
    cost: l => [220, 600, 1500, 3500, 8000, 18000][l], pad: { x: 760, y: 600 }, unlock: g => g.lv.worker >= 2 },
  { id: 'grove',  icon: '🌲', name: '남쪽 숲 개간', desc: '공방 가까운 남쪽 숲에 나무 +4그루. 벌목꾼이 공방까지 짧게 오갑니다', max: 3,
    cost: l => [1200, 2600, 5200][l],              pad: { x: 640, y: 1160 }, unlock: g => g.lv.workshop >= 1 && g.lv.forest >= 1 },
  { id: 'shoes',  icon: '👟', name: '신발',       desc: '나와 일꾼·경비병 모두 이동 속도 +10%', max: 10,
    cost: l => Math.round(90 * Math.pow(1.6, l)),   pad: { x: 840, y: 1300 }, unlock: g => g.lv.bag >= 1 },

  { id: 'price',  icon: '💲', name: '목재 가격',  desc: '통나무 판매가 +12%',        max: Infinity,
    cost: l => Math.round(150 * Math.pow(1.4, l)),  pad: { x: 1140, y: 890 }, martPad: { x: 1140, y: 2110 }, unlock: g => g.stats.sales >= 3 },
  { id: 'promo',  icon: '📣', name: '홍보',       desc: '모든 가게 손님 +11%, 3레벨마다 구매량 +1, 재고칸 +10', max: Infinity,
    cost: l => Math.round(120 * Math.pow(1.45, l)), pad: { x: 1300, y: 1100 }, martPad: { x: 1720, y: 2080 }, unlock: g => g.lv.price >= 1 },
  { id: 'cashier', icon: '🧾', name: '계산원',    desc: '모든 가게 돈 자동 수금, 판매 2배 빠름', max: 1,
    cost: () => 450,                                pad: { x: 900, y: 880 }, martPad: { x: 1900, y: 2120 }, unlock: g => g.lv.price >= 2 && g.lv.worker >= 2 },

  // ---- 사냥 · 고기 ----
  { id: 'butcher', icon: '🥩', name: '정육점 열기', desc: '고기를 파는 가게. 목장·도축장과 이어집니다', max: 1,
    cost: () => 500,                                pad: { x: 1560, y: 1000 }, unlock: g => g.lv.mart < 1 && (g.lv.worker >= 2 || g.stats.sales >= 20 || g.stats.kills >= 1) },
  { id: 'furShop', icon: '🧥', name: '모피 상점 열기', desc: '사냥터 곰의 모피를 파는 가게. 손님이 따로 옵니다', max: 1,
    cost: () => 400,                                pad: { x: 1780, y: 800 }, unlock: g => g.lv.mart < 1 && (g.stats.kills >= 1 || g.lv.hunter >= 1) },
  { id: 'hunter', icon: '🏹', name: '사냥꾼 고용', desc: '사냥터의 곰을 잡아 모피를 나릅니다', max: 10,
    cost: tbl([300, 700, 1500, 3200, 6500, 13000], 1.6), pad: { x: 1480, y: 680 }, unlock: g => g.lv.furShop >= 1 },
  { id: 'collector', icon: '🧺', name: '수거꾼 고용', desc: '레벨마다 모든 수거꾼 운반 +2·이동 +8%. 맵 전체의 드랍·더미·습격 전리품을 가게로 나릅니다', max: 10,
    cost: tbl([350, 900, 2200, 5000, 11000, 20000, 35000, 60000], 1.6), pad: { x: 1600, y: 700 }, unlock: g => g.lv.furShop >= 1 || g.lv.butcher >= 1 },
  { id: 'sled',   icon: '🛷', name: '수거 썰매',   desc: '수거꾼 운반량 +4(종류당), 줍는 반경 +12, 이동 속도 +12%. 썰매를 끌고 다닙니다', max: 5,
    cost: l => [700, 1800, 4500, 10000, 22000][l], pad: { x: 1340, y: 700 }, unlock: g => g.lv.collector >= 1 },
  { id: 'logistics', icon: '📦', name: '운반 분업', desc: '1: 사냥꾼·도축업자 · 2: 어부·양식업자 · 3: 벌목꾼이 자리에서 일만 하고 더미에 쌓습니다. 운반은 수거꾼 몫(단계마다 수거꾼 2·3·4명 필요)', max: 3,
    cost: l => [2500, 6000, 12000][l],             pad: { x: 1480, y: 820 }, unlock: g => g.lv.collector >= 2 + g.lv.logistics },   // 단계마다 수거꾼이 한 명 더 필요(2/3/4명)
  { id: 'traps',  icon: '🪤', name: '덫',         desc: '사냥터 곰 +1마리, 리젠 7% 단축. 모피 생산량이 늘어납니다', max: Infinity,
    cost: l => Math.round(600 * Math.pow(1.45, l)), pad: { x: 1950, y: 1080 }, unlock: g => g.lv.hunter >= 1 },
  { id: 'skinning', icon: '🗡️', name: '가죽 손질', desc: '잡은 곰·늑대·설인(사냥터·습격 모두)에서 🧥 모피 +1', max: 3,
    cost: l => [1500, 4000, 10000][l],             pad: { x: 1340, y: 560 }, unlock: g => g.lv.hunter >= 2 && g.lv.traps >= 1 },
  { id: 'bait',   icon: '🐟', name: '미끼',       desc: '곰이 한 번에 +1마리씩 더 나타납니다(사냥꾼이 많을수록 효과)', max: 4,
    cost: l => Math.round(900 * Math.pow(1.5, l)), pad: { x: 1700, y: 480 }, unlock: g => g.lv.traps >= 3 && g.lv.hunter >= 2 },
  { id: 'peltPrice', icon: '🏷️', name: '모피 가격', desc: '모피 판매가 +12%',          max: Infinity,
    cost: l => Math.round(350 * Math.pow(1.4, l)),  pad: { x: 1800, y: 680 }, martPad: { x: 1260, y: 2450 }, unlock: g => g.lv.furShop >= 1 },
  { id: 'meatPrice', icon: '🍖', name: '고기 가격', desc: '고기 판매가 +12%',          max: Infinity,
    cost: l => Math.round(300 * Math.pow(1.4, l)),  pad: { x: 1430, y: 1150 }, martPad: { x: 1140, y: 2230 }, unlock: g => g.lv.butcher >= 1 },

  // ---- 목장 ----
  { id: 'ranch',  icon: '🦌', name: '목장',       desc: '순록 +2마리. 다 자라면 도축장에 데려가 고기로 만듭니다', max: 10,
    cost: l => Math.round(1200 * Math.pow(1.6, l)), pad: { x: 1700, y: 1620 }, unlock: g => g.lv.butcher >= 1 },
  { id: 'feed',   icon: '🌾', name: '사료',       desc: '순록 성장 속도 +12%',          max: Infinity,
    cost: l => Math.round(150 * Math.pow(1.4, l)),  pad: { x: 1470, y: 1370 }, unlock: g => g.lv.ranch >= 1 },
  { id: 'breed',  icon: '🧬', name: '품종 개량',  desc: '순록 한 마리당 고기 +1',        max: Infinity,
    cost: l => Math.round(300 * Math.pow(1.45, l)), pad: { x: 1820, y: 1870 }, unlock: g => g.lv.ranch >= 1 },
  { id: 'rancher', icon: '🧑‍🌾', name: '목동 고용', desc: '다 자란 순록을 도축장에 데려갑니다', max: 5,
    cost: tbl([400, 1000, 2500], 1.7),               pad: { x: 1560, y: 1860 }, unlock: g => g.lv.ranch >= 1 && g.lv.slaughter >= 1 },

  // ---- 도축장 ----
  { id: 'slaughter', icon: '🔪', name: '도축장',  desc: '1레벨: 건설. 이후 도축 속도 +10%, 대기 순록 +2', max: Infinity,
    cost: l => Math.round(800 * Math.pow(1.5, l)),  pad: { x: 1390, y: 1470 }, unlock: g => g.lv.ranch >= 1 },
  { id: 'slaughterman', icon: '🧑‍🍳', name: '도축업자 고용', desc: '순록을 고기로 만들고 정육점에 나릅니다', max: 5,
    cost: tbl([500, 1200, 3000], 1.7),               pad: { x: 1160, y: 1700 }, unlock: g => g.lv.slaughter >= 1 },
  { id: 'tanning', icon: '🧶', name: '무두질',     desc: '도축한 순록 한 마리당 🧥 모피 +1. 도축업자가 모피 상점·마트·재단소로 나릅니다', max: 3,
    cost: l => [1800, 4500, 10000][l],             pad: { x: 1300, y: 1660 }, unlock: g => g.lv.slaughter >= 1 && g.lv.slaughterman >= 1 && (g.lv.furShop >= 1 || g.lv.mart >= 1) },

  // ---- 강 · 낚시 ----
  { id: 'fishShop', icon: '🐟', name: '어물전 열기', desc: '강에서 잡은 생선을 파는 가게', max: 1,
    cost: () => 800,                                pad: { x: 980, y: 380 }, unlock: g => g.lv.mart < 1 && (g.lv.butcher >= 1 || g.lv.worker >= 3 || g.t >= 300) },
  { id: 'rod',    icon: '🎣', name: '낚싯대',     desc: '낚시 속도 +12%',             max: Infinity,
    cost: l => Math.round(80 * Math.pow(1.4, l)),   pad: { x: 740, y: 300 }, unlock: g => g.lv.fishShop >= 1 },
  { id: 'fisher', icon: '🛶', name: '어부 고용',   desc: '강가에서 낚시해 생선을 나릅니다', max: 8,
    cost: tbl([350, 800, 1800, 4000], 1.6),           pad: { x: 760, y: 480 }, unlock: g => g.lv.fishShop >= 1 },
  { id: 'fishPrice', icon: '🍣', name: '생선 가격', desc: '생선 판매가 +12%',          max: Infinity,
    cost: l => Math.round(220 * Math.pow(1.4, l)),  pad: { x: 1200, y: 300 }, martPad: { x: 1140, y: 2350 }, unlock: g => g.lv.fishShop >= 1 },
  { id: 'fishFarm', icon: '🐠', name: '양식장',   desc: '강에 가두리 +1. 물고기가 다 자라면 양식업자가 그물로 건져 나릅니다', max: 6,
    cost: l => [1500, 2500, 4000, 5500, 7500, 10000][l], pad: { x: 860, y: 300 }, unlock: g => g.lv.restaurant >= 1 && g.lv.fisher >= 2 && g.lv.rod >= 3 },
  { id: 'fishFarmer', icon: '🥅', name: '양식업자 고용', desc: '다 자란 가두리를 건져 생선을 마트·식당에 나릅니다', max: 5,
    cost: tbl([600, 1500, 3500], 1.7),               pad: { x: 860, y: 420 }, unlock: g => g.lv.fishFarm >= 1 },
  { id: 'fishFeed', icon: '🫧', name: '어분 사료', desc: '양식 성장 속도 +12%, 2레벨마다 가두리당 생선 +1', max: Infinity,
    cost: l => Math.round(250 * Math.pow(1.4, l)),  pad: { x: 880, y: 560 }, unlock: g => g.lv.fishFarm >= 1 },

  // ---- 마트 ----
  { id: 'mart',   icon: '🏪', name: '마트',       desc: '1레벨: 건설(가게들이 마트로 합쳐지고 묶음 구매 ×1.3) · 이후: 재고 +40, 손님 +10%, 외형 확장', max: Infinity,
    cost: l => Math.round(12000 * Math.pow(1.45, l)), pad: { x: 1700, y: 2200 },
    unlock: g => g.lv.butcher >= 1 && g.lv.fishShop >= 1 && g.lv.price >= 3 },
  { id: 'martLanes', icon: '🛒', name: '계산대 추가', desc: '마트 계산대 +1줄(최대 5줄). 손님을 동시에 더 받습니다', max: 4,
    cost: l => [8000, 16000, 32000, 64000][l],     pad: { x: 1900, y: 2360 }, unlock: g => g.lv.mart >= 1 },
  { id: 'martGoods', icon: '📦', name: '품목 확장', desc: '1: 🪑 가구 · 2: 🍲 요리 · 3: 🧥 의복을 마트에서도 팝니다. 공방 직원이 남는 완제품을 마트로 나릅니다', max: 3,
    cost: l => [10000, 25000, 60000][l],           pad: { x: 1900, y: 2480 }, unlock: g => g.lv.mart >= 1 },
  { id: 'martBulk', icon: '🛍️', name: '묶음 구매', desc: '마트 손님이 품목마다 +1개씩 더 삽니다', max: 6,
    cost: l => Math.round(5000 * Math.pow(1.6, l)), pad: { x: 1900, y: 2240 }, unlock: g => g.lv.mart >= 1 },

  // ---- 마트 이후 새 컨텐츠 ----
  { id: 'restaurant', icon: '🍲', name: '식당', desc: '1레벨: 건설(🍣 생선회) · 2: 🍲 순록 스튜 · 3: 🥘 해물탕 · 4: 🍱 잔치 상차림. 생선·고기를 요리로', max: 4,
    cost: l => [3000, 7000, 15000, 32000][l],      pad: { x: 1150, y: 950 }, unlock: g => g.lv.mart >= 1 },
  { id: 'cook',   icon: '👨‍🍳', name: '요리사 고용', desc: '화덕에서 요리를 계속 만듭니다', max: 5,
    cost: tbl([900, 2200, 5000], 1.7),               pad: { x: 780, y: 1130 }, unlock: g => g.lv.restaurant >= 1 },
  { id: 'dishPrice', icon: '🍽️', name: '요리 가격', desc: '요리 판매가 +12%',          max: Infinity,
    cost: l => Math.round(500 * Math.pow(1.4, l)),  pad: { x: 1270, y: 880 }, unlock: g => g.lv.restaurant >= 1 },
  { id: 'tailor', icon: '🧵', name: '재단소',     desc: '1레벨: 건설(🧤 가죽 장갑) · 2: 🧥 모피 코트 · 3: 🧣 모피 망토 · 4: 👘 왕실 예복. 모피를 옷으로', max: 4,
    cost: l => [2500, 6000, 14000, 30000][l],      pad: { x: 1920, y: 900 }, unlock: g => g.lv.mart >= 1 && g.lv.furShop >= 1 },
  { id: 'tailorman', icon: '🪡', name: '재단사 고용', desc: '재봉대에서 옷을 계속 만듭니다', max: 4,
    cost: tbl([800, 2000], 1.8),                     pad: { x: 1720, y: 690 }, unlock: g => g.lv.tailor >= 1 },
  { id: 'clothPrice', icon: '🏷️', name: '의복 가격', desc: '의복 판매가 +12%',          max: Infinity,
    cost: l => Math.round(450 * Math.pow(1.4, l)),  pad: { x: 1850, y: 690 }, unlock: g => g.lv.tailor >= 1 },
  { id: 'inn',    icon: '🏨', name: '여관',       desc: '객실 +1. 돈과 함께 공방의 🛏️ 침대 1 · 🪑 의자 1이 필요합니다. 손님이 묵고 숙박비를 냅니다', max: 12,
    cost: l => Math.round(6000 * Math.pow(1.35, l)), pad: { x: 1700, y: 990 }, unlock: g => g.lv.mart >= 1 && g.lv.workshop >= 3,
    needs: { bed: 1, chair: 1 } },
  { id: 'innPrice', icon: '🛎️', name: '숙박비',   desc: '숙박비 +12%',                max: Infinity,
    cost: l => Math.round(600 * Math.pow(1.4, l)),  pad: { x: 1430, y: 1150 }, unlock: g => g.lv.inn >= 1 },
  { id: 'trade',  icon: '🚢', name: '무역 계약',  desc: '무역선이 머무는 동안 계약하면 마트 재고를 비싸게 삽니다', max: Infinity,
    cost: () => 0,                                 pad: { x: 980, y: 330 }, unlock: g => g.ship.state === 'docked' && !g.ship.done },

  // ---- 가구 공방 ----
  { id: 'workshop', icon: '🔨', name: '가구 공방', desc: '1레벨: 공방 건설(🪑 의자) · 2: 🛋️ 소파 · 3: 🛏️ 침대 · 4: 🗄️ 옷장 · 5: 🎹 피아노', max: 5,
    cost: l => [1500, 3000, 6500, 14000, 30000][l], pad: { x: 1070, y: 1845 },
    unlock: g => g.lv.worker >= 3 || g.stats.sales >= 60 },
  { id: 'tools',  icon: '🧰', name: '공구',       desc: '가구·요리·의복 제작 속도 +12%', max: Infinity,
    cost: l => Math.round(200 * Math.pow(1.4, l)),  pad: { x: 720, y: 1900 }, unlock: g => g.lv.workshop >= 1 },
  { id: 'craftsman', icon: '👨‍🔧', name: '목수 고용', desc: '작업대에서 가구를 계속 만듭니다', max: 5,
    cost: tbl([600, 1600, 4000], 1.7),                pad: { x: 1080, y: 2000 }, unlock: g => g.lv.workshop >= 1 },
  { id: 'furnPrice', icon: '🏷️', name: '가구 가격', desc: '가구 판매가 +12%',          max: Infinity,
    cost: l => Math.round(400 * Math.pow(1.4, l)),  pad: { x: 1240, y: 1800 }, unlock: g => g.lv.workshop >= 1 },

  // ---- 작업 효율 · 마을 ----
  { id: 'training', icon: '🎓', name: '일꾼 훈련', desc: '벌목꾼·사냥꾼·어부·목수 작업 효율 +10%', max: Infinity,
    cost: l => Math.round(500 * Math.pow(1.5, l)),  pad: { x: 720, y: 1000 }, unlock: g => g.lv.worker >= 2 },
  { id: 'townhall', icon: '🏛️', name: '마을 회관', desc: '마을 단위 투자. 모두의 작업 효율 +8%, 판매가 +5%, 마을 등급 상승. 방위대·봉화대가 열립니다', max: Infinity,
    cost: l => Math.round(20000 * Math.pow(2.2, l)), pad: { x: 460, y: 1420 },
    unlock: g => g.lv.mart >= 1 || g.lv.workshop >= 3 || (g.lv.butcher >= 1 && g.lv.fishShop >= 1 && g.lv.worker >= 5) },
  { id: 'militia', icon: '🪖', name: '마을 방위대', desc: '황무지 경계를 지키는 정예 병사(체력 2.2배, 공격 1.6배)', max: 6,
    cost: l => Math.round(15000 * Math.pow(1.8, l)), pad: { x: 620, y: 2080 }, unlock: g => g.lv.townhall >= 1 },
  { id: 'beacon', icon: '🔥', name: '봉화대',     desc: '습격 경고 +8초, 경비병·방위대 사기(공격력) +10%', max: Infinity,
    cost: l => Math.round(30000 * Math.pow(1.9, l)), pad: { x: 60, y: 2010 }, unlock: g => g.lv.townhall >= 2 },

  { id: 'fence',  icon: '🧱', name: '울타리 보강', desc: '울타리 내구도 ×1.22, 본부 +20', max: Infinity,
    cost: l => Math.round(60 * Math.pow(1.3, l)),  pad: { x: 660, y: 1560 }, unlock: () => true },
  { id: 'guard',  icon: '🛡️', name: '경비병 고용', desc: '곰과 싸우는 경비병',       max: 12,
    cost: tbl([180, 400, 900, 2000, 4200, 9000, 19000, 40000], 1.7), pad: { x: 220, y: 1960 }, unlock: g => g.lv.worker >= 1 || g.wave.n >= 1 || g.t >= 60 },
  { id: 'weapon', icon: '⚔️', name: '무기',       desc: '나와 경비병 공격력 +2. 3·7·12·18·28레벨, 그 뒤 10레벨마다 재질과 형태가 바뀝니다(창 → 미늘창 → 머스킷 → 소총 → … → 빔 캐논, 300레벨까지)', max: Infinity,
    cost: l => Math.round(80 * Math.pow(1.3, l)),  pad: { x: 440, y: 1960 }, unlock: g => g.lv.guard >= 1 },
  { id: 'tower',  icon: '🏹', name: '감시탑',     desc: '공격력 +5, 사거리 +12. 6레벨마다 탑 +1(최대 4). 12: 쇠뇌 · 16: 대포 · 20: 소총 · 26: 기관총, 36부터 10레벨마다 새 포대(300레벨까지)', max: Infinity,
    cost: l => Math.round(250 * Math.pow(1.4, l)), pad: { x: 580, y: 1900 }, unlock: g => g.lv.guard >= 1 && g.wave.n >= 2 },
  { id: 'repair', icon: '🔧', name: '본부 수리',  desc: '본부 내구도 전부 회복',     max: Infinity,
    cost: () => 0,                                 pad: { x: 50, y: 1430 }, unlock: g => g.hut.hp < g.hut.maxhp - 0.5 },
];

// 적 종류. 웨이브가 오를수록 섞여 나온다.
const ENEMY = {
  bear: { name: '북극곰', emoji: '🐻', hp: 1,    dmg: 1,   speed: 1,   bounty: 1,   r: 34, meat: 2, pelt: 2 },
  wolf: { name: '늑대',   emoji: '🐺', hp: 0.45, dmg: 0.6, speed: 1.9, bounty: 0.6, r: 26, meat: 0, pelt: 2 },
  yeti: { name: '설인',   emoji: '👹', hp: 6,    dmg: 2.5, speed: 0.7, bounty: 8,   r: 50, meat: 10, pelt: 6 },
};

// 보스(설인) 단계: 10웨이브마다 한 단계씩. hp/dmg는 일반 곰 대비 배수, scale은 크기
const BOSS = [
  { name: '설인',     hp: 6,  dmg: 2.5, scale: 1.0, bounty: 8,  meat: 12 },
  { name: '설인 전사', hp: 9,  dmg: 3.2, scale: 1.12, bounty: 12, meat: 16 },
  { name: '설인 왕',   hp: 13, dmg: 4.0, scale: 1.25, bounty: 18, meat: 22 },
  { name: '고대 설인', hp: 18, dmg: 5.0, scale: 1.4, bounty: 26, meat: 30 },
  { name: '얼음 거인', hp: 25, dmg: 6.5, scale: 1.6, bounty: 40, meat: 40 },
];
// 수급 현황 추천: 부족(more)·운반 지연(haul)·과잉(sell)일 때 권하는 업그레이드 id. 지금 보이는 결제 원만 보여 준다
const ADVICE = {
  more: { wood: ['worker', 'axe', 'forest', 'grove', 'training'], meat: ['ranch', 'slaughterman', 'breed', 'feed', 'rancher', 'hunter'],
          fish: ['fisher', 'rod', 'fishFarm', 'fishFarmer', 'fishFeed'], pelt: ['traps', 'bait', 'skinning', 'tanning', 'hunter'] },
  haul: ['collector', 'sled', 'shoes'],
  sell: { wood: ['promo', 'workshop', 'craftsman', 'mart', 'martLanes'], meat: ['promo', 'restaurant', 'cook', 'mart', 'martLanes'],
          fish: ['promo', 'restaurant', 'cook', 'mart', 'martLanes'], pelt: ['promo', 'tailor', 'tailorman', 'mart', 'martLanes'] },
};
const bossTier = n => Math.min(BOSS.length - 1, Math.max(0, Math.floor(n / 10) - 1));
const ENRAGE = { at: 0.35, speed: 1.5, dmg: 1.4 };   // 체력 35% 이하에서 분노

// 외형 단계: 레벨이 at 이상이면 그 단계의 모습으로 그려진다
const TIERS = {
  fence: [{ at: 0, name: '나무 울타리' }, { at: 5, name: '통나무 목책' }, { at: 10, name: '돌담' }, { at: 20, name: '성벽' }],
  hut:   [{ at: 0, name: '오두막' }, { at: 5, name: '통나무집' }, { at: 10, name: '석조 본부' }, { at: 20, name: '요새' }],
  // 감시탑 단계: shot(투사체) arrow 화살 · bolt 쇠뇌 · cannon 대포(범위 피해) · bullet 소총(연사) · mg 기관총. shots 한 번에 쏘는 수, cd 발사 간격 배수, dmg 한 발 피해 배수
  tower: [{ at: 1, name: '망루', shot: 'arrow', shots: 1, cd: 1, dmg: 1 }, { at: 4, name: '감시탑', shot: 'arrow', shots: 2, cd: 1, dmg: 1 }, { at: 8, name: '석탑', shot: 'arrow', shots: 3, cd: 1, dmg: 1 },
          { at: 12, name: '쇠뇌탑', shot: 'bolt', shots: 3, cd: 1.1, dmg: 1.7 }, { at: 16, name: '대포탑', shot: 'cannon', shots: 2, cd: 1.7, dmg: 2.4, splash: 80 },
          { at: 20, name: '소총탑', shot: 'bullet', shots: 4, cd: 0.55, dmg: 0.6 }, { at: 26, name: '기관총탑', shot: 'mg', shots: 6, cd: 0.35, dmg: 0.45 }],
  stall: [{ at: 0, name: '좌판' }, { at: 3, name: '천막 가게' }, { at: 7, name: '목재 상점' }],
  workshop: [{ at: 1, name: '작업 헛간' }, { at: 2, name: '가구 공방' }, { at: 4, name: '대형 공방' }],
  mart:  [{ at: 1, name: '동네 마트' }, { at: 3, name: '마트' }, { at: 6, name: '대형 마트' }, { at: 10, name: '백화점' }],
  rest: [{ at: 1, name: '포장마차' }, { at: 2, name: '식당' }, { at: 4, name: '연회장' }],
  tailor: [{ at: 1, name: '재단소' }, { at: 3, name: '양장점' }],
  ranch: [{ at: 1, name: '울타리 목장' }, { at: 4, name: '축사' }, { at: 8, name: '대형 축사' }],
  village: [{ at: 0, name: '개척지' }, { at: 1, name: '마을' }, { at: 3, name: '큰 마을' }, { at: 6, name: '읍내' }, { at: 10, name: '도시' }],
  axe:   [{ at: 0, name: '쇠도끼', color: '#9aa7b5' }, { at: 3, name: '강철 도끼', color: '#6fa8dc' }, { at: 6, name: '황금 도끼', color: '#f1c40f' }, { at: 10, name: '수정 도끼', color: '#b388ff' }],
  weapon: null,   // 아래에서 재질×형태로 300레벨까지 만든다
};
// 무기 재질(색)과 형태(모양·사거리). 단계 k마다 재질이 바뀌고 3단계마다 형태가 바뀐다. 0·3·7·12·18·28레벨 뒤로는 10레벨마다 한 단계
const MATERIALS = [{ name: '나무', color: '#d6dde6' }, { name: '강철', color: '#6fa8dc' }, { name: '황금', color: '#f1c40f' }, { name: '수정', color: '#b388ff' }, { name: '흑요석', color: '#4a4a5a' },
                   { name: '미스릴', color: '#8ef1e6' }, { name: '용뼈', color: '#f5e6c8' }, { name: '별철', color: '#ff8a65' }, { name: '얼음핵', color: '#9ad0ff' }, { name: '태양석', color: '#ffd166' },
                   { name: '흑철', color: '#3b3f4a' }, { name: '오리하르콘', color: '#ff6f91' }, { name: '아다만트', color: '#7fe0a0' }, { name: '운석', color: '#a0522d' }, { name: '천둥석', color: '#fff176' },
                   { name: '월광석', color: '#cfd8ff' }, { name: '심연석', color: '#283593' }, { name: '영혼석', color: '#80deea' }, { name: '혼돈석', color: '#d500f9' }, { name: '창공석', color: '#40c4ff' },
                   { name: '불사조깃', color: '#ff7043' }, { name: '거인뼈', color: '#e0d8c3' }, { name: '성운석', color: '#ba68c8' }, { name: '시간석', color: '#c8e6c9' }, { name: '무한석', color: '#ffd54f' },
                   { name: '신성석', color: '#ffffff' }, { name: '공허석', color: '#1a1a2e' }, { name: '창세석', color: '#00e5ff' }, { name: '종말석', color: '#ff1744' }, { name: '초월석', color: '#e1bee7' },
                   { name: '영원석', color: '#b2ff59' }, { name: '절대석', color: '#f8bbd0' }, { name: '궁극석', color: '#ffea00' }];
const WEAPON_FAMILIES = [{ name: '창', shape: 'spear' }, { name: '미늘창', shape: 'halberd' }, { name: '머스킷', shape: 'gun', gun: true, range: 125 }, { name: '소총', shape: 'rifle', gun: true, range: 150 },
                         { name: '연발 소총', shape: 'rifle', gun: true, range: 170 }, { name: '기관단총', shape: 'smg', gun: true, range: 180 }, { name: '레일건', shape: 'energy', gun: true, range: 220 },
                         { name: '플라즈마 총', shape: 'energy', gun: true, range: 240 }, { name: '빔 캐논', shape: 'energy', gun: true, range: 260 }, { name: '특이점 포', shape: 'energy', gun: true, range: 280 }];
TIERS.weapon = (() => {
  const ats = [0, 3, 7, 12, 18, 28]; for (let a = 38; a <= 298; a += 10) ats.push(a);
  return ats.map((at, k) => { const fam = WEAPON_FAMILIES[Math.min(WEAPON_FAMILIES.length - 1, Math.floor(k / 3))], mat = MATERIALS[Math.min(k, MATERIALS.length - 1)];
    return { at, k, name: `${mat.name} ${fam.name}`, color: mat.color, glow: k >= 3 ? mat.color : null, shape: fam.shape, gun: !!fam.gun, range: fam.range }; });
})();
// 감시탑도 36레벨부터 10레벨마다 한 단계: 네 가지 포대를 돌며 재질이 바뀌고 피해가 15%씩 오른다
(() => {
  const kinds = [{ name: '기관총탑', shot: 'mg', shots: 8, cd: 0.32, dmg: 0.5 }, { name: '속사포탑', shot: 'cannon', shots: 3, cd: 1.4, dmg: 2.6, splash: 100 },
                 { name: '레일건탑', shot: 'bolt', shots: 4, cd: 0.9, dmg: 2.4 }, { name: '플라즈마탑', shot: 'cannon', shots: 2, cd: 1.1, dmg: 3.2, splash: 120 }];
  let i = 0; for (let at = 36; at <= 296; at += 10, i++) { const K = kinds[i % kinds.length], mat = MATERIALS[Math.min(i + 5, MATERIALS.length - 1)], up = Math.pow(1.15, Math.floor(i / 4));
    TIERS.tower.push(Object.assign({}, K, { at, name: `${mat.name} ${K.name}`, color: mat.color, dmg: Math.round(K.dmg * up * 100) / 100 })); }
})();
const tierOf = (kind, lv) => { const t = TIERS[kind]; let i = 0; for (let k = 0; k < t.length; k++) if (lv >= t[k].at) i = k; return i; };

// 숲의 나무 자리. 캠프와 가까운 아래쪽 줄부터 채운다.
const FOREST_SPOTS = (() => {
  const out = [];
  const F = CFG.forest;
  for (let r = F.rows - 1; r >= 0; r--)
    for (let c = 0; c < F.cols; c++)
      out.push({ x: F.origin.x + c * F.dx + (r % 2) * 18, y: F.origin.y + r * F.dy });
  const G = CFG.grove;   // 남쪽 숲(뒤에 붙는다. grove: 몇 번째 그루인지)
  let k = 0;
  for (let r = 0; r < G.rows; r++)
    for (let c = 0; c < G.cols; c++)
      out.push({ x: G.origin.x + c * G.dx + (r % 2) * 18, y: G.origin.y + r * G.dy, grove: k++ });
  return out;
})();

// 경비병이 평소에 서 있는 자리
const GUARD_POSTS = [
  { x: 180, y: 1800 }, { x: 480, y: 1800 }, { x: 180, y: 1560 }, { x: 480, y: 1560 }, { x: 540, y: 1690 },
  { x: 260, y: 1835 }, { x: 400, y: 1835 }, { x: 330, y: 1545 },
];

// 마을 방위대 초소(황무지 경계)와 봉화대·회관 위치
const MILITIA_POSTS = [{ x: 160, y: 1990 }, { x: 340, y: 2015 }, { x: 520, y: 1990 }, { x: 700, y: 2000 }, { x: 250, y: 2040 }, { x: 430, y: 2045 }];
const TOWNHALL = { x: 330, y: 1380 };
const BEACON = { x: 60, y: 1920 };

// 처음 하는 사람에게 차례로 보여 주는 안내
const HINTS = [
  { text: '화면을 드래그(또는 방향키)해서 나무 옆에 서면 저절로 벌목합니다', target: () => ({ x: 580, y: 838 }) },
  { text: '판매대 왼쪽의 초록 칸에 서면 목재를 내려놓습니다', target: () => CFG.shops.wood.drop },
  { text: '손님이 두고 간 돈 가까이 가면 저절로 줍습니다', target: () => CFG.shops.wood.moneySpot },
  { text: '바닥의 원 위에 서면 돈이 빠져나가면서 업그레이드됩니다', target: () => UPG[0].pad },
  { text: '곧 북극곰이 옵니다! 🧱 울타리와 🛡️ 경비병으로 본부를 지키세요', target: () => UPG.find(u => u.id === 'fence').pad },
];

// 새 컨텐츠가 열릴 때 한 번씩 보여 주는 팁
const TIPS = [
  { id: 'wild',    when: g => g.wild.length > 0,                      text: '사냥터(오른쪽 위)에 🐻 야생 곰이 나타났어요. 옆에 서면 도끼로 사냥합니다. 잡으면 🧥 모피! ⚔️ 사냥 버튼을 누르면 알아서 달려갑니다' },
  { id: 'pelt',    when: g => g.drops.some(d => d.kind === 'pelt'),  text: '🧥 모피가 떨어졌어요! 주워 두세요. 사냥터 옆 모피 상점을 열면 비싸게 팝니다' },
  { id: 'collector', when: g => g.padVisible(UPG.find(u => u.id === 'collector')) && g.drops.length >= 4, text: '바닥에 고기·모피가 남아 있어요. 🧺 수거꾼(사냥터 입구)을 고용하면 맵 전체를 돌며 주워 가게에 나릅니다. 2명째부터는 캠프 옆 초소에서 습격 전리품을 기다립니다' },
  { id: 'logipad', when: g => g.padVisible(UPG.find(u => u.id === 'logistics')), text: '📦 운반 분업(사냥터 입구)을 하면 사냥꾼·도축업자부터 자리에서 일만 하고 더미에 쌓습니다. 운반은 수거꾼 몫이 되니 수거꾼과 썰매를 함께 늘리세요' },
  { id: 'logi1',   when: g => g.lv.logistics >= 1, text: '운반 분업 1단계! 사냥꾼은 🧥 가죽 더미(사냥꾼 초소 옆)에 쌓고 도축업자는 도축장 보관함에 둡니다. 수거꾼이 실어 나릅니다. 더미가 가득 차면 직접 나릅니다' },
  { id: 'logi2',   when: g => g.lv.logistics >= 2, text: '운반 분업 2단계! 어부는 🐟 생선 바구니(낚시터 옆), 양식업자는 양식 바구니(둑)에 담습니다' },
  { id: 'logi3',   when: g => g.lv.logistics >= 3, text: '운반 분업 3단계! 벌목꾼은 🪵 통나무 더미(숲 동쪽 문, 남쪽 숲 옆)에 쌓습니다. 수거꾼이 판매대·마트·공방으로 나릅니다' },
  { id: 'sled',    when: g => g.lv.sled >= 1, text: '🛷 썰매 장착! 수거꾼이 한 번에 더 많이 싣고, 지나가며 넓게 줍고, 더 빨리 달립니다' },
  { id: 'skinning', when: g => g.padVisible(UPG.find(u => u.id === 'skinning')), text: '🗡️ 가죽 손질(사냥터 입구)을 배우면 곰 한 마리에서 모피를 더 벗깁니다. 습격 온 곰·늑대·설인도 마찬가지라 수거꾼이 가져올 전리품이 늘어요' },
  { id: 'bait',    when: g => g.padVisible(UPG.find(u => u.id === 'bait')), text: '덫을 놓아도 곰은 한 마리씩만 나오네요. 🐟 미끼(사냥터 안)를 두면 한 번에 여러 마리가 몰려와 사냥꾼이 바빠집니다' },
  { id: 'tanning', when: g => g.lv.tanning >= 1, text: '무두질 시작! 도축한 순록마다 🧥 모피가 나옵니다. 도축업자가 모피 상점·마트·재단소로 나르고, 고기 받기 칸에서 직접 받을 수도 있어요' },
  { id: 'grovepad', when: g => g.padVisible(UPG.find(u => u.id === 'grove')), text: '공방이 목재를 기다리나요? 🌲 남쪽 숲 개간(숲 아래쪽)을 하면 공방 가까이에 벌목지가 생겨 벌목꾼 동선이 짧아집니다' },
  { id: 'fishfarmpad', when: g => g.padVisible(UPG.find(u => u.id === 'fishFarm')), text: '낚시만으로는 생선이 모자라나요? 🐠 양식장(낚싯대 원 옆)을 열면 강 왼쪽 가두리에서 물고기를 키워 한 번에 여러 마리씩 건집니다. 어분 사료와 양식업자 수만큼 늘어납니다' },
  { id: 'fishfarm', when: g => g.lv.fishFarm >= 1, text: '양식장 개업! 가두리가 다 자라면 🐟 수확 표시가 뜹니다. 강가에 서면 직접 건질 수 있고, 🥅 양식업자를 고용하면 자동으로 건져 나릅니다' },
  { id: 'furShop', when: g => g.lv.furShop >= 1, text: '모피 상점 개업! 모피는 상점 왼쪽 칸에 내려놓으세요. 🏹 사냥꾼을 고용하면 자동으로 사냥해 나릅니다' },
  { id: 'butcher', when: g => g.lv.butcher >= 1,                     text: '정육점 개업! 고기는 정육점 위쪽 칸에 내려놓으세요. 꾸준한 고기는 🦌 목장(정육점 아래)에서 나옵니다' },
  { id: 'ranchpad', when: g => g.padVisible(UPG.find(u => u.id === 'ranch')), text: '곰 사냥만으론 고기가 모자라죠? 🦌 목장(정육점 아래)을 지으면 순록을 길러 꾸준히 고기를 얻습니다. 목장 → 도축장 → 정육점 순서로 이어집니다' },
  { id: 'ranch', when: g => g.lv.ranch >= 1, text: '목장 개업! 순록이 다 자라면 🦌 출하 표시가 뜹니다. 옆에 서면 데리고 나올 수 있고, 목동을 고용하면 자동으로 도축장에 데려갑니다' },
  { id: 'slaughterpad', when: g => g.padVisible(UPG.find(u => u.id === 'slaughter')), text: '순록은 🔪 도축장(목장 왼쪽)에서 고기가 됩니다. 도축장을 짓고 🧑‍🍳 도축업자를 고용하세요' },
  { id: 'slaughter', when: g => g.lv.slaughter >= 1, text: '도축장 개업! 출하 순록을 도축장 위 칸에 데려가세요. 도축업자가 고기로 만들어 정육점에 나릅니다. 직접 하려면 도축대 앞에 서고, 고기는 왼쪽 칸에서 받습니다' },
  { id: 'fishpad', when: g => g.padVisible(UPG.find(u => u.id === 'fishShop')), text: '강가(위쪽)에서 낚시를 할 수 있어요. 🐟 어물전을 열면 생선을 팝니다' },
  { id: 'fish',    when: g => g.lv.fishShop >= 1,                    text: '어물전 개업! 강가 낚시터에 서면 낚시합니다. 🧑‍🌾 어부를 고용하면 자동!' },
  { id: 'mart',    when: g => g.padVisible(UPG.find(u => u.id === 'mart')), text: '🏪 마트를 지을 수 있어요! 모든 손님이 한곳에 모이고, 목재·고기·생선·모피를 묶음으로 1.3배 가격에 사 갑니다' },
  { id: 'workpad', when: g => g.padVisible(UPG.find(u => u.id === 'workshop')), text: '목재가 남나요? 🔨 가구 공방(왼쪽 아래)을 지으면 목재로 가구를 만들어 훨씬 비싸게 팝니다' },
  { id: 'workshop', when: g => g.lv.workshop >= 1,                 text: '공방 개업! 공방 왼쪽 위 칸에 목재를 내려놓고 작업대 앞에 서면 🪑 의자를 만듭니다. 👨‍🔧 목수를 고용하면 자동! 벌목꾼도 목재가 남으면 공방으로 나릅니다' },
  { id: 'martsites', when: g => g.lv.mart >= 1, text: '가게들이 마트로 합쳐지면서 비워진 자리에 새 건물을 지을 수 있어요: 🍲 식당(옛 판매대), 🧵 재단소(옛 모피 상점), 🏨 여관(옛 정육점), 🚢 무역 부두(옛 어물전). 가격·홍보 원은 마트 옆으로 옮겨졌습니다' },
  { id: 'ship', when: g => g.ship.state === 'docked', text: '🚢 무역선 입항! 60초 안에 강가 부두(옛 어물전 자리)의 계약 원에 서면 마트 재고를 1.6배 가격에 대량으로 사 갑니다' },
  { id: 'townhall', when: g => g.padVisible(UPG.find(u => u.id === 'townhall')), text: '마을이 커졌어요! 🏛️ 마을 회관(캠프 위쪽)을 지으면 모두의 작업 효율과 판매가가 오르고, 🪖 마을 방위대와 🔥 봉화대가 열립니다. 비싸지만 마을을 지키는 투자예요' },
  { id: 'martopen', when: g => g.lv.mart >= 1,                       text: '마트 개업! 이제 목재·고기·생선·모피를 마트 왼쪽 칸에 내려놓으세요. 가게 재고는 마트로 옮겨졌습니다(가구 공방과 도축장은 그대로)' },
];

if (typeof module !== 'undefined') module.exports = { CFG, UPG, ENEMY, FOREST_SPOTS, GUARD_POSTS, MILITIA_POSTS, TOWNHALL, BEACON, HINTS, TIPS, TIERS, tierOf, BOSS, bossTier, ENRAGE, ADVICE, MATERIALS, WEAPON_FAMILIES };
