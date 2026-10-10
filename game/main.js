// 눈보라 벌목장 — 부팅, 입력, 카메라, HUD, 저장, 모달
'use strict';

(() => {
  const canvas = document.getElementById('c');
  const ctx = canvas.getContext('2d');
  const $ = id => document.getElementById(id);
  const hud = { money: $('money'), wave: $('wave'), hutBar: $('hut-bar'), hutText: $('hut-text'), fenceBar: $('fence-bar'), fenceText: $('fence-text'),
                hpBar: $('hp-bar'), hpText: $('hp-text'), hint: $('hint'), hintText: $('hint-text'), tip: $('tip'), tipText: $('tip-text'),
                bonus: $('bonus'), sound: $('btn-sound'), warn: $('warn'), hunt: $('btn-hunt'), bottom: $('bottom') };

  // ---- 저장 ----
  function loadSave() { try { const s = localStorage.getItem(CFG.saveKey); return s ? JSON.parse(s) : null; } catch (e) { return null; } }
  function save() {
    try {
      const data = { v: 2, meta: game.meta, run: game.over ? null : game.serialize(), savedAt: Date.now(), muted: Sfx.muted };
      localStorage.setItem(CFG.saveKey, JSON.stringify(data));
    } catch (e) { /* 저장 불가 환경이면 그냥 진행 */ }
  }

  const saved = loadSave();
  const game = new Game({ meta: saved && saved.meta, run: saved && saved.run });
  Sfx.muted = !!(saved && saved.muted);
  let offlineGain = 0;
  if (saved && saved.run && saved.savedAt) offlineGain = game.applyOffline((Date.now() - saved.savedAt) / 1000);
  let onTitle = true;   // 시작 화면이 떠 있는 동안은 게임이 멈추고 카메라만 마을을 천천히 돈다
  const titleEl = $('title'), hudEl = $('hud');

  // ---- 카메라 / 크기 ----
  const cam = { x: game.player.x, y: game.player.y, w: 1, h: 1, scale: 1, dpr: 1 };
  const ui = { autoTarget: null, bottomPad: 60, topPad: 120 };
  // 화질 자동 조절: 프레임이 느려지면 해상도(dpr)를 한 단계씩 낮추고, 여유가 생기면 되돌린다
  const qual = { cap: Math.min(2, window.devicePixelRatio || 1), dpr: 0, ema: 16, slowT: 0, fastT: 0 };
  qual.dpr = qual.cap;
  function resize() {
    const r = canvas.parentElement.getBoundingClientRect();
    cam.dpr = qual.dpr;
    cam.w = r.width; cam.h = r.height;
    canvas.width = Math.round(r.width * cam.dpr); canvas.height = Math.round(r.height * cam.dpr);
    canvas.style.width = r.width + 'px'; canvas.style.height = r.height + 'px';
    cam.scale = r.height > r.width ? r.width / CFG.view.portraitW : r.height / CFG.view.landscapeH;
  }
  window.addEventListener('resize', resize); resize();

  // ---- 입력 ----
  const js = { active: false, id: null, ox: 0, oy: 0, x: 0, y: 0 };
  const keys = {};
  let auto = false;   // ⚔️ 사냥 버튼: 가까운 적에게 알아서 걸어간다
  canvas.addEventListener('pointerdown', e => {
    Sfx.init();
    if (js.active || onTitle) return;
    js.active = true; js.id = e.pointerId; js.ox = e.clientX; js.oy = e.clientY; js.x = 0; js.y = 0;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', e => {
    if (!js.active || e.pointerId !== js.id) return;
    let dx = e.clientX - js.ox, dy = e.clientY - js.oy;
    const d = Math.hypot(dx, dy), R = 44;
    if (d > R) { js.ox = e.clientX - (dx / d) * R; js.oy = e.clientY - (dy / d) * R; dx = (dx / d) * R; dy = (dy / d) * R; }
    js.x = dx / R; js.y = dy / R;
    if (d > 6) auto = false;
  });
  const endJs = e => { if (e.pointerId !== js.id) return; js.active = false; js.x = 0; js.y = 0; };
  canvas.addEventListener('pointerup', endJs); canvas.addEventListener('pointercancel', endJs);
  // 한글 IME 상태에서도 되도록 e.code로 본다
  const KEYMAP = { KeyW: 'w', KeyA: 'a', KeyS: 's', KeyD: 'd', ArrowUp: 'arrowup', ArrowDown: 'arrowdown', ArrowLeft: 'arrowleft', ArrowRight: 'arrowright', Space: ' ', KeyF: 'f' };
  const keyOf = e => KEYMAP[e.code] || e.key.toLowerCase();
  window.addEventListener('keydown', e => {
    if (paused) return;
    const k = keyOf(e);
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
    if (e.repeat) return;
    keys[k] = true;
    if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) auto = false;
    if (k === ' ' || k === 'f') toggleHunt();
    Sfx.init();
  });
  window.addEventListener('keyup', e => { keys[keyOf(e)] = false; });
  const clearKeys = () => { for (const k of Object.keys(keys)) keys[k] = false; };
  window.addEventListener('blur', clearKeys);
  function toggleHunt() { auto = !auto; if (auto && !game.nearestEnemy(game.player.x, game.player.y, Infinity)) auto = false; }
  hud.hunt.onclick = () => { Sfx.init(); toggleHunt(); };
  function readInput() {
    let x = js.x, y = js.y;
    if (keys['a'] || keys['arrowleft']) x -= 1; if (keys['d'] || keys['arrowright']) x += 1;
    if (keys['w'] || keys['arrowup']) y -= 1; if (keys['s'] || keys['arrowdown']) y += 1;
    const d = Math.hypot(x, y); if (d > 1) { x /= d; y /= d; }
    ui.autoTarget = null;
    if (auto && d < 0.05) {
      const p = game.player, t = game.nearestEnemy(p.x, p.y, Infinity);
      if (!t || p.down > 0) auto = false;
      else {
        ui.autoTarget = t;
        const dx = t.x - p.x, dy = t.y - p.y, dd = Math.hypot(dx, dy);
        if (dd > CFG.player.atkRange - 18) { x = dx / dd; y = dy / dd; }
      }
    }
    game.input.x = x; game.input.y = y;
  }

  // ---- 모달 ----
  const modalRoot = $('modal-root');
  function modal(html, buttons) {
    modalRoot.innerHTML = `<div class="modal"><div class="modal-card">${html}<div class="modal-actions"></div></div></div>`;
    const act = modalRoot.querySelector('.modal-actions');
    for (const b of buttons) { const el = document.createElement('button'); el.className = 'btn ' + (b.cls || ''); el.textContent = b.label; el.onclick = () => { Sfx.init(); if (b.onClick) b.onClick(); if (!b.keep) closeModal(); }; act.appendChild(el); }
    paused = true;
  }
  function closeModal() { modalRoot.innerHTML = ''; paused = false; last = performance.now(); }
  const fmt = n => fmtMoney(n);
  const fmtTime = s => `${Math.floor(s / 60)}분 ${Math.floor(s % 60)}초`;

  function helpHtml() {
    return `<h2>눈보라 벌목장</h2>
      <p>눈 덮인 산속에서 목재를 팔아 캠프를 키우세요. 가만히 있으면 북극곰이 찾아옵니다.</p>
      <ul>
        <li><b>이동</b> 화면 아무 곳이나 누른 채 드래그(또는 WASD · 방향키). 왼쪽 아래 미니맵으로 위치를 확인하세요</li>
        <li><b>벌목 · 낚시 · 제작</b> 나무 옆 / 강가 낚시터 / 공방 작업대에 서면 저절로 합니다</li>
        <li><b>판매</b> 가게의 초록 칸에 서면 물건을 내려놓고, 손님이 사 가며 돈을 둡니다. 돈 가까이 가면 저절로 줍습니다</li>
        <li><b>업그레이드</b> 바닥의 원 위에 서면 돈이 빠져나가며 결제됩니다. 원은 그 행동이 일어나는 자리 옆에 있습니다</li>
        <li><b>사냥</b> 사냥터(오른쪽 위)의 🐻 야생 곰 옆에 서면 도끼로 때립니다. ⚔️ 사냥 버튼(또는 F·스페이스)을 누르면 가까운 적에게 알아서 달려갑니다. 잡으면 🐾 모피와 현상금. 모피는 모피 상점에서 팝니다. 🧺 수거꾼은 바닥에 남은 고기·모피를 주워 나릅니다</li>
        <li><b>고기</b> 정육점 → 🦌 목장(순록 키우기) → 🔪 도축장(순록을 고기로) 순서로 열립니다. 목동이 출하 순록을 도축장에 데려가고, 도축업자가 고기로 만들어 정육점에 나릅니다</li>
        <li><b>습격</b> 남쪽 황무지에서 북극곰이 본부를 노립니다. 울타리 → 본부 순서로 부수고, 본부 내구도가 0이 되면 끝. 곰은 경비병과 나도 공격해서 쓰러뜨립니다</li>
        <li><b>끝없는 위협</b> 3의 배수 웨이브엔 🐺 늑대 무리, 10의 배수 웨이브엔 👹 보스(설인 → 설인 전사 → 설인 왕 → 고대 설인 → 얼음 거인). 보스는 체력이 낮아지면 분노합니다</li>
        <li><b>끝없는 성장</b> 정육점 · 🦌 목장 · 🔪 도축장 · 어물전 · 모피 상점 · 가구 공방(의자 → 피아노) · 마트 · 마을 회관(개척지 → 도시) · 방위대 · 봉화대가 차례로 열립니다. 울타리·본부·감시탑·무기는 레벨에 따라 모습이 튼튼해집니다</li>
        <li><b>마트 이후</b> 판매대·정육점·어물전·모피 상점은 마트로 합쳐져 사라지고, 빈 자리에 🍲 식당(생선·고기 요리), 🧵 재단소(모피 옷), 🏨 여관(침대·의자로 객실), 🚢 무역 부두(3분마다 무역선이 마트 재고를 대량 매입)가 들어섭니다. 마트는 계산대·품목 확장·묶음 구매로 키웁니다</li>
        <li><b>모피 · 수거</b> 모피는 사냥터 곰, 습격 온 곰·늑대·설인의 전리품, 🧶 무두질(도축한 순록)에서 나옵니다. 🗡️ 가죽 손질·🐟 미끼로 사냥터 생산을 늘리고, 🧺 수거꾼은 맵 전체의 고기·모피와 습격 전리품을 주워 나릅니다(🛷 썰매로 강화). 🐠 양식장은 식당 이후 강 왼쪽에, 🌲 남쪽 숲은 공방 옆에 열립니다</li>
        <li><b>📊 수급 현황</b> 위쪽 📊 버튼을 누르면 품목별 생산·소비·재고와 무엇을 올려야 하는지 알려 줍니다. 🔴 부족은 생산, 🟠 운반 지연은 수거꾼·썰매, 🟡 과잉은 수요(홍보·제작·마트). 같은 문제가 90초 넘게 이어지면 새 소식으로도 알려 줍니다. 수거꾼은 가게에 모자란 비싼 물건부터 나릅니다</li>
        <li><b>동쪽 개척</b> 마트와 회관이 있거나 생선·고기가 2분 넘게 남아돌면 🧭 동쪽 개척(목장 아래 오른쪽 끝)이 열립니다. 세계가 동쪽으로 넓어지고 🐠 훈제장(생선+장작 → 훈제·통조림·캐비어)과 🌭 육가공소(고기 → 소시지·육포·햄)가 들어섭니다. ❄️ 냉동 창고는 도축장 병목을 풉니다</li>
        <li><b>부상 · 치료</b> 쓰러진 경비병은 30초 안에 치료받지 못하면 전사하고 경비병 레벨이 깎입니다(다시 고용해 채우세요). 🏥 의무소를 짓고 🩺 의무병을 두면 달려가 치료하고, 급하면 내가 옆에 서도 치료됩니다</li>
        <li><b>급식소 · 배달부</b> 🍲 급식소를 지으면 직원들이 고기·생선을 먹어 배부르면 효율 +15%, 굶으면 −20%. 🚚 공방·식당·재단소 배달부는 더미·마트에서 재료를 직접 가져옵니다. 여관 객실은 무제한(객잔 → 호텔 → 리조트)</li>
        <li><b>운반 분업</b> 수거꾼 2명 이상이면 📦 운반 분업(사냥터 입구)을 열 수 있습니다. 1: 사냥꾼·도축업자 · 2: 어부·양식업자 · 3: 벌목꾼이 자리에서 일만 하고 더미(가죽 더미·생선 바구니·통나무 더미·도축장 보관함)에 쌓으면 수거꾼이 실어 나릅니다. 더미가 차면 직접 나르니 수거꾼·썰매를 함께 늘리세요. 더미 위에 서면 직접 가져갈 수도 있습니다</li>
        <li><b>감시탑 내구도 · 수리</b> 적은 지나가며 탑을 부수고 보스는 탑부터 노립니다. 부서진 탑은 쏘지 못하니 🔧 수리(본부 왼쪽 원)로 고치거나 🔨 수리공(캠프 남서쪽)을 두면 탑·본부·울타리를 알아서 고칩니다</li>
        <li><b>동쪽 벌판 아래</b> 🌱 묘목장(산림꾼이 나무를 심고 베어 목재), 🥛 낙농장(목장 3레벨 뒤 · 낙농꾼이 젖을 짜 우유), 🧀 유제품 공방(치즈·버터·아이스크림)</li>
        <li><b>광산 골짜기</b> 🧭 동쪽 길 끝에서 개척. ⛏️ 광산(광부가 광석 채굴), ⚒️ 대장간(광석+목재 → 철물·연장·갑옷·태엽), 💎 보석 세공소(반지·목걸이·왕관 — 귀족·왕족이 찾는 사치품)</li>
        <li><b>평원 농장</b> 광산 길 끝에서 개척. 🌾 밀밭(농부가 씨를 뿌리고 거둬 곡물), 🍞 빵집(곡물+우유 → 빵·파이·케이크), 🍺 양조장(맥주·벌꿀술·위스키). 마트 품목 확장 6~10단계로 새 상품을 마트에서도 팝니다</li>
        <li><b>날씨</b> 동쪽 개척 뒤 날씨가 바뀝니다. ☀️ 맑음(손님·성장 +15%) · ❄️ 눈보라(모두 느려지고 손님 −30%) · 🌫️ 안개(광산 뒤 · 탑 사거리 −30%) · 🌌 오로라(판매가 +20%) · 🌤️ 해빙(농장 뒤 · 작물 성장 +60%). 위쪽 ❄ 줄과 📊 창에 표시됩니다</li>
        <li><b>📜 주문 게시판</b> 회관 왼쪽에 세우면 상인·귀족·왕족이 대량 주문을 냅니다. 마트(또는 만드는 가게) 재고에서 1초에 1개씩 채워지고 기한 안에 다 채우면 가격의 1.5~1.9배 보상과 평판. 📊 창에서 진행을 봅니다</li>
        <li><b>눈송이 ❄</b> 끝나도 격퇴한 습격 3번마다 눈송이 1개. 다음 판 수입이 영구히 +3%씩</li>
      </ul>
      <p class="dim">자리를 비우면 일꾼들이 최대 2시간까지 대신 벌어 두고, 곰은 그동안 오지 않습니다. 3초마다 자동 저장됩니다.</p>`;
  }
  function showHelp() { modal(helpHtml(), [{ label: '시작!', cls: 'primary' }]); }
  // 수급 현황: 품목별 생산·소비·재고와 상태·추천. 무엇을 올려야 하는지 게임이 알려 준다
  function supplyHtml() {
    const rows = game.advice().map(a => {
      const G = CFG.goods[a.good], st = { ok: '🟢 괜찮음', short: '🔴 생산 부족', stuck: '🟠 운반 지연', glut: '🟡 과잉' }[a.status];
      const recs = a.recs.slice(0, 3).map(u => `${u.icon} ${u.name}`).join(' · ');
      return `<tr><td>${G.emoji} ${G.name}</td><td>${Math.round(a.prod)}</td><td>${Math.round(a.cons)}</td><td>${a.stock}/${a.cap}${a.held ? `<br><span class="dim">쌓임 ${a.held}</span>` : ''}</td><td>${st}${recs ? `<br><span class="dim">${recs}</span>` : ''}</td></tr>`;
    }).join('');
    const mgr = game.lv.manager ? `<p><button class="btn ${game.autoInvest ? 'primary' : ''}" id="btn-auto" style="width:100%">🧑‍💼 관리인 자동 투자: ${game.autoInvest ? '켬' : '끔'}</button></p>${game.managerLog.length ? `<p class="dim">최근 구매<br>${game.managerLog.slice().reverse().join('<br>')}</p>` : ''}` : '';
    const vt = TIERS.village[tierOf('village', game.lv.townhall)].name, repTxt = `<p class="dim">👥 마을 등급 <b>${vt}</b> · 손님 평판 <b>${Math.round(game.rep)}</b>/100 — 평판이 높으면 상인·귀족·왕족이 더 자주 오고 팁을 줍니다. 화나서 돌아가는 손님은 평판을 떨어뜨립니다.</p>`;
    const W = game.weatherDef, weatherTxt = game.lv.expandEast ? `<p class="dim">${W.icon} 지금 날씨 <b>${W.name}</b>${game.weather.kind === 'snow' ? '' : ` (${Math.max(0, Math.ceil(game.weather.t))}초 남음)`} — ☀️ 맑음: 손님·성장 +15% · ❄️ 눈보라: 손님 −30%, 성장 −40%, 이동 −20% · 🌫️ 안개: 탑 사거리 −30% · 🌌 오로라: 판매가 +20% · 🌤️ 해빙: 작물 성장 +60%</p>` : '';
    const ordersTxt = game.lv.board ? `<h3>📜 주문 게시판</h3>${game.orders.length ? `<table class="supply"><tr><th>주문자</th><th>물건</th><th>진행</th><th>남은 시간</th><th>보상</th></tr>${game.orders.map(o => `<tr><td>${['', '', '🧳 상인', '🎩 귀족', '👑 왕족'][o.cls]}</td><td>${CFG.goods[o.good].emoji} ${CFG.goods[o.good].name}</td><td>${o.done}/${o.qty}</td><td>${Math.floor(o.t / 60)}:${String(Math.ceil(o.t) % 60).padStart(2, '0')}</td><td>$${fmt(o.reward)} · 평판 +${o.rep}</td></tr>`).join('')}</table><p class="dim">마트(또는 만드는 가게) 재고에서 1초에 1개씩 채워집니다. 기한을 넘기면 평판 −2.</p>` : '<p class="dim">지금은 주문이 없어요. 110초마다 새 주문이 붙습니다.</p>'}` : '';
    return `<h2>📊 수급 현황</h2>${repTxt}${weatherTxt}${ordersTxt}${mgr}
      <p class="dim">최근 2분 기준 분당 생산·소비입니다. 🔴 부족이면 생산 업그레이드, 🟠 운반 지연이면 수거꾼·썰매, 🟡 과잉이면 수요(홍보·제작·마트)를 올리세요. 90초 넘게 이어지는 문제는 새 소식으로도 알려 줍니다.</p>
      <table class="supply"><tr><th>품목</th><th>생산/분</th><th>소비/분</th><th>가게 재고</th><th>상태 · 추천</th></tr>${rows || '<tr><td colspan="5" class="dim">아직 파는 가게가 없어요</td></tr>'}</table>`;
  }
  function showSupply() { modal(supplyHtml(), [{ label: '닫기', cls: 'primary' }]); const b = document.getElementById('btn-auto'); if (b) b.onclick = () => { game.autoInvest = !game.autoInvest; save(); showSupply(); }; }
  // 세이브 복사/붙여넣기: 다른 기기로 옮기거나 진행 상황을 공유할 때
  function exportText() { try { save(); return btoa(unescape(encodeURIComponent(localStorage.getItem(CFG.saveKey) || ''))); } catch (e) { return ''; } }
  function showExport() {
    const txt = exportText();
    modal(`<h2>💾 세이브 복사</h2><p class="dim">아래 글을 전부 복사해 두세요. 다른 기기의 "세이브 붙여넣기"에 넣으면 이어집니다.</p><textarea id="save-out" readonly style="width:100%;height:140px;font-size:11px;background:#0f1b2d;color:#aab8c8;border:1px solid var(--line);border-radius:8px;padding:8px">${txt}</textarea>`,
      [{ label: '복사', cls: 'primary', keep: true, onClick: () => { const ta = document.getElementById('save-out'); ta.select(); try { navigator.clipboard.writeText(ta.value); } catch (e) { document.execCommand('copy'); } } }, { label: '닫기' }]);
  }
  function showImport() {
    modal(`<h2>📥 세이브 붙여넣기</h2><p class="dim">복사해 둔 세이브 글을 붙여넣으세요. 지금 진행은 덮어씌워집니다.</p><textarea id="save-in" style="width:100%;height:140px;font-size:11px;background:#0f1b2d;color:#f2f6fa;border:1px solid var(--line);border-radius:8px;padding:8px"></textarea>`,
      [{ label: '불러오기', cls: 'primary', onClick: () => {
          try {
            let raw = document.getElementById('save-in').value.trim();
            if (!raw.startsWith('{')) raw = decodeURIComponent(escape(atob(raw)));
            const data = JSON.parse(raw);
            if (!data || typeof data !== 'object') throw new Error('bad');
            localStorage.setItem(CFG.saveKey, JSON.stringify(data));
            game.meta = Object.assign({ snowflakes: 0, bestWave: 0, bestEarned: 0, runs: 0 }, data.meta || {});
            game.newRun(data.run || null); snapCam(); save(); startPlay();
          } catch (e) { setTimeout(() => modal('<h2>불러오기 실패</h2><p>세이브 글이 올바르지 않아요.</p>', [{ label: '닫기', cls: 'primary' }]), 0); }
        } }, { label: '취소' }]);
  }
  function showMenu() {
    modal(`<h2>메뉴</h2>
      <p>${game.wave.n}차 습격까지 버팀 · 누적 $${fmt(game.earned)} · 경과 ${fmtTime(game.t)}</p>
      <p class="dim">잡은 곰 ${game.stats.kills} · 순록 출하 ${game.stats.harvests} · 도축 ${game.stats.slaughters} · 투숙객 ${game.stats.guests} · 무역 ${game.stats.trades}회 · 생선 ${game.stats.fish}(양식 ${game.stats.farmed || 0}) · 수거 ${game.stats.collected || 0} · 농장 수확 ${game.stats.crops || 0} · 주문 완료 ${game.stats.orders || 0} · 부서진 탑 ${game.stats.towersBroken || 0} · 만든 가구 ${game.stats.crafts} · 판매 ${game.stats.sales}회</p>
      <p class="dim">최고 기록 ${game.meta.bestWave}웨이브 · 눈송이 ❄ ${game.meta.snowflakes} (수입 +${Math.round((game.bonus - 1) * 100)}%) · ${game.meta.runs}번째 판</p>`,
      [{ label: '계속하기', cls: 'primary' },
       { label: '📊 수급 현황', onClick: () => setTimeout(showSupply, 0) },
       { label: '💾 세이브 복사', onClick: () => setTimeout(showExport, 0) },
       { label: '📥 세이브 붙여넣기', onClick: () => setTimeout(showImport, 0) },
       { label: '도움말', onClick: () => setTimeout(showHelp, 0) },
       { label: '시작 화면으로', onClick: () => { save(); setTimeout(showTitle, 0); } },
       { label: '이번 판 포기', cls: 'danger', onClick: () => setTimeout(confirmRestart, 0) },
       { label: '모든 기록 삭제', cls: 'danger', onClick: () => setTimeout(confirmReset, 0) }]);
  }
  function confirmRestart() {
    modal(`<h2>이번 판을 포기할까요?</h2><p>눈송이는 격퇴한 습격 수 기준으로 받습니다. 캠프는 처음부터 다시 시작합니다.</p>`,
      [{ label: '포기하고 새로 시작', cls: 'danger', onClick: () => { game.gameOver(); game.events.length = 0; setTimeout(showGameOver, 0); } }, { label: '취소' }]);
  }
  function confirmReset() {
    modal(`<h2>모든 기록을 지울까요?</h2><p>눈송이와 최고 기록까지 전부 사라집니다. 되돌릴 수 없습니다.</p>`,
      [{ label: '전부 삭제', cls: 'danger', onClick: () => { try { localStorage.removeItem(CFG.saveKey); } catch (e) {} game.meta = { snowflakes: 0, bestWave: 0, bestEarned: 0, runs: 0 }; game.newRun(null); snapCam(); save(); } }, { label: '취소' }]);
  }
  function showGameOver() {
    const r = game.lastResult || { cleared: 0, flakes: 0, earned: 0, time: 0, kills: 0, waveN: 0 };
    save();
    modal(`<h2>🐻 캠프가 무너졌다…</h2>
      <div class="stats">
        <div><span>버틴 습격</span><b>${r.cleared}회</b></div>
        <div><span>잡은 곰</span><b>${r.kills}마리</b></div>
        <div><span>번 돈</span><b>$${fmt(r.earned)}</b></div>
        <div><span>버틴 시간</span><b>${fmtTime(r.time)}</b></div>
      </div>
      <p>눈송이 ❄ <b>+${r.flakes}</b> (총 ${game.meta.snowflakes}개 → 다음 판 수입 +${Math.round(game.meta.snowflakes * CFG.meta.bonusPer * 100)}%)</p>
      <p class="dim">최고 기록 ${game.meta.bestWave}웨이브</p>`,
      [{ label: '다시 시작', cls: 'primary', onClick: () => { game.newRun(null); snapCam(); save(); } },
       { label: '시작 화면으로', onClick: () => { game.newRun(null); save(); setTimeout(showTitle, 0); } }]);
  }
  function showWelcomeBack(gain) {
    modal(`<h2>다녀오셨군요</h2><p>자리를 비운 동안 일꾼들이 <b>$${fmt(gain)}</b>를 벌어 뒀습니다. 곰들은 조용했습니다.</p>`,
      [{ label: '좋아', cls: 'primary' }]);
  }
  function snapCam() { cam.x = game.player.x; cam.y = game.player.y; }

  // ---- 시작 화면 ----
  function showTitle() {
    onTitle = true; paused = true; titleEl.hidden = false; hudEl.hidden = true; modalRoot.innerHTML = '';
    const hasRun = !game.over && (game.t > 5 || game.earned > 0 || Object.values(game.lv).some(v => v > 0));
    $('t-continue').hidden = !hasRun;
    if (hasRun) $('t-continue-sub').textContent = `${game.wave.n}차 습격까지 버팀 · $${fmt(game.earned)} · ${fmtTime(game.t)}`;
    $('t-new-sub').textContent = hasRun ? '지금 진행은 사라집니다 (눈송이는 유지)' : '처음부터 캠프를 세웁니다';
    const m = game.meta;
    $('t-meta').textContent = m.runs > 0 || m.snowflakes > 0 ? `❄ 눈송이 ${m.snowflakes} (수입 +${Math.round((game.bonus - 1) * 100)}%) · 최고 ${m.bestWave}웨이브 · ${m.runs}판` : '화면을 드래그해 움직이고, 나무 옆에 서면 벌목합니다';
    updateSoundBtn();
  }
  function startPlay() { onTitle = false; paused = false; titleEl.hidden = true; hudEl.hidden = false; snapCam(); last = performance.now(); }
  function updateSoundBtn() { const t = Sfx.muted ? '🔇 소리 꺼짐' : '🔊 소리 켜짐'; $('t-sound').querySelector('.tbtn-main').textContent = t; hud.sound.textContent = Sfx.muted ? '🔇' : '🔊'; }
  $('t-continue').onclick = () => { Sfx.init(); startPlay(); if (offlineGain > 0) { showWelcomeBack(offlineGain); offlineGain = 0; } };
  $('t-new').onclick = () => {
    Sfx.init();
    const hasRun = !$('t-continue').hidden;
    const begin = () => { const first = !saved; game.newRun(null); save(); startPlay(); offlineGain = 0; if (first) showHelp(); };
    if (hasRun) { titleEl.hidden = true; modal(`<h2>새로 시작할까요?</h2><p>지금 진행 중인 캠프는 사라집니다. 눈송이와 최고 기록은 남습니다.</p>`, [{ label: '새로 시작', cls: 'danger', onClick: begin }, { label: '취소', onClick: () => setTimeout(showTitle, 0) }]); }
    else begin();
  };
  $('t-help').onclick = () => { Sfx.init(); titleEl.hidden = true; modal(helpHtml(), [{ label: '닫기', cls: 'primary', onClick: () => setTimeout(showTitle, 0) }]); };
  $('t-sound').onclick = () => { Sfx.init(); Sfx.muted = !Sfx.muted; updateSoundBtn(); save(); };

  $('btn-help').onclick = () => { Sfx.init(); showHelp(); };
  $('btn-supply').onclick = () => { Sfx.init(); showSupply(); };
  $('btn-menu').onclick = () => { Sfx.init(); showMenu(); };
  hud.sound.onclick = () => { Sfx.init(); Sfx.muted = !Sfx.muted; updateSoundBtn(); save(); };

  // ---- 이벤트 → 효과음 ----
  function drainEvents() {
    for (const e of game.events) {
      if (e.type === 'over') { Sfx.play('over'); setTimeout(showGameOver, 600); continue; }
      if (e.type === 'warn') hud.warn.hidden = false;
      if (e.type === 'clear') hud.warn.hidden = true;
      if (e.type === 'big' || e.type === 'tierUp') { Sfx.play('clear'); continue; }
      if (e.type === 'boss' || e.type === 'enrage') { Sfx.play('wave'); continue; }
      if (e.type === 'ship') { Sfx.play('clear'); continue; }
      if (e.type === 'shipLeave') { Sfx.play('drop'); continue; }
      if (e.type === 'playerDown' || e.type === 'guardDown') { Sfx.play('fenceBroken'); continue; }
      Sfx.play(e.type);
    }
    game.events.length = 0;
  }

  // ---- 팁(한 번씩 뜨는 안내) ----
  let tipT = 0;
  function updateTips(dt) {
    if (tipT > 0) { tipT -= dt; if (tipT <= 0) hud.tip.hidden = true; return; }
    const t = game.tipQueue.shift();
    if (t) { hud.tipText.textContent = t.text; hud.tip.hidden = false; tipT = 8; Sfx.play('sell'); }
  }
  hud.tip.onclick = () => { tipT = 0; hud.tip.hidden = true; };

  // ---- HUD ----
  const lastHud = {};
  function setText(el, key, text) { if (lastHud[key] !== text) { lastHud[key] = text; el.textContent = text; } }
  function updateHud() {
    setText(hud.money, 'money', '$' + fmt(game.money));
    const w = game.wave;
    let wtext, cls = '';
    if (w.active) { wtext = `⚔️ ${w.n}차 습격 · 적 ${game.bears.length}`; cls = 'active'; }
    else { const s = Math.ceil(game.timeToWave); wtext = `🐻 ${w.n + 1}차까지 ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; if (w.warned) cls = 'warned'; }
    setText(hud.wave, 'wave', wtext);
    if (lastHud.waveCls !== cls) { lastHud.waveCls = cls; hud.wave.className = 'pill wave ' + cls; }
    const hk = game.hut.hp / game.hut.maxhp, fk = game.fence.hp / game.fence.maxhp, pk = game.player.hp / game.player.maxhp;
    hud.hutBar.style.width = (hk * 100).toFixed(1) + '%'; hud.hutBar.className = 'fill ' + (hk < 0.35 ? 'bad' : hk < 0.7 ? 'warn' : '');
    hud.fenceBar.style.width = (fk * 100).toFixed(1) + '%'; hud.fenceBar.className = 'fill fence ' + (fk <= 0 ? 'bad' : '');
    hud.hpBar.style.width = (pk * 100).toFixed(1) + '%'; hud.hpBar.className = 'fill hp ' + (pk < 0.35 ? 'bad' : '');
    setText(hud.hutText, 'hut', `🏠 ${Math.ceil(game.hut.hp)}/${game.hut.maxhp}`);
    setText(hud.fenceText, 'fence', `🧱 ${Math.ceil(game.fence.hp)}/${game.fence.maxhp}`);
    setText(hud.hpText, 'hp', game.player.down > 0 ? `😵 기절 ${Math.ceil(game.player.down)}초` : `❤️ ${Math.ceil(game.player.hp)}/${game.player.maxhp}`);
    const hint = HINTS[game.tutorial];
    const hidden = !hint; if (hud.hint.hidden !== hidden) hud.hint.hidden = hidden;
    if (hint) setText(hud.hintText, 'hint', hint.text);
    const W = game.weatherDef, wk = game.weather ? game.weather.kind : 'snow';
    const wtxt = game.lv.expandEast ? `${W.icon} ${W.name}${wk === 'snow' ? '' : ` ${Math.max(0, Math.ceil(game.weather.t))}초`}${W.cust && W.cust !== 1 ? ` · 손님 ${W.cust > 1 ? '+' : ''}${Math.round((W.cust - 1) * 100)}%` : ''}${W.grow && W.grow !== 1 ? ` · 성장 ${W.grow > 1 ? '+' : ''}${Math.round((W.grow - 1) * 100)}%` : ''}${W.move && W.move !== 1 ? ` · 이동 ${Math.round((W.move - 1) * 100)}%` : ''}${W.tower ? ` · 탑 사거리 ${Math.round((W.tower - 1) * 100)}%` : ''}${W.price ? ` · 판매가 +${Math.round((W.price - 1) * 100)}%` : ''}` : '';
    const otxt = game.orders && game.orders.length ? ` · 📜 주문 ${game.orders.length}건` : '';
    setText(hud.bonus, 'bonus', [game.meta.snowflakes > 0 ? `❄ ${game.meta.snowflakes} · 수입 +${Math.round((game.bonus - 1) * 100)}%` : '', wtxt + otxt].filter(Boolean).join('  |  '));
    const warnHidden = !(w.warned && !w.active);
    if (hud.warn.hidden !== warnHidden) hud.warn.hidden = warnHidden;
    if (!warnHidden) setText(hud.warn, 'warn', `⚠️ ${game.waveSummary(w.n + 1)} 접근 중! ${Math.ceil(game.timeToWave)}초`);
    const enemies = game.bears.length + game.wild.length;
    const huntHidden = enemies === 0 || game.player.down > 0;
    if (hud.hunt.hidden !== huntHidden) hud.hunt.hidden = huntHidden;
    if (!huntHidden) { const t = auto ? '🎯 추적 중 (취소)' : game.bears.length ? `⚔️ 싸우러 가기 (${game.bears.length})` : `⚔️ 사냥 (${game.wild.length})`; setText(hud.hunt, 'hunt', t); hud.hunt.className = 'hunt-btn' + (auto ? ' on' : ''); }
    ui.bottomPad = hud.bottom.getBoundingClientRect().height;
    ui.topPad = $('top-block').getBoundingClientRect().bottom;
  }

  // ---- 루프 ----
  let paused = false, last = performance.now(), acc = 0, time = 0, saveT = 0;
  const STEP = 1 / 60;
  function frame(now) {
    requestAnimationFrame(frame);
    let dt = (now - last) / 1000; last = now;
    if (dt > 0.25) dt = 0.25;
    time += dt;
    if (!paused && !document.hidden) {   // 화질 자동 조절
      qual.ema += (dt * 1000 - qual.ema) * 0.04;
      if (qual.ema > 30) { qual.slowT += dt; qual.fastT = 0; if (qual.slowT > 2.5 && qual.dpr > 1) { qual.dpr = Math.max(1, Math.round((qual.dpr - 0.25) * 4) / 4); qual.slowT = 0; qual.ema = 20; resize(); } }
      else if (qual.ema < 15) { qual.fastT += dt; qual.slowT = 0; if (qual.fastT > 20 && qual.dpr < qual.cap) { qual.dpr = Math.min(qual.cap, qual.dpr + 0.25); qual.fastT = 0; qual.ema = 20; resize(); } }
      else { qual.slowT = 0; qual.fastT = 0; }
    }
    if (!paused && !game.over) {
      readInput();
      acc += dt;
      let n = 0;
      while (acc >= STEP && n < 8) { game.update(STEP); acc -= STEP; n++; }
      if (n === 8) acc = 0;
      drainEvents();
      updateTips(dt);
      saveT += dt; if (saveT > 3) { saveT = 0; save(); }
    }
    const k = 1 - Math.pow(0.002, dt);
    if (onTitle) { const tx = CFG.world.w / 2 + Math.sin(time * 0.07) * 520, ty = CFG.world.h / 2 + Math.cos(time * 0.05) * 560; cam.x += (tx - cam.x) * Math.min(1, dt * 0.6); cam.y += (ty - cam.y) * Math.min(1, dt * 0.6); }
    else { cam.x += (game.player.x - cam.x) * k; cam.y += (game.player.y - 20 - cam.y) * k; }
    const hw = cam.w / 2 / cam.scale, hh = cam.h / 2 / cam.scale;
    const topPad = ui.topPad / cam.scale, botPad = ui.bottomPad / cam.scale;   // HUD에 가려지는 띠만큼 더 보여 준다
    cam.x = hw * 2 >= game.worldW ? game.worldW / 2 : clamp(cam.x, hw, game.worldW - hw);
    cam.y = hh * 2 >= CFG.world.h + topPad + botPad ? CFG.world.h / 2 : clamp(cam.y, hh - topPad, CFG.world.h - hh + botPad);
    ui.onTitle = onTitle;
    render(ctx, game, cam, time, dt, js, ui);
    if (!onTitle) updateHud();
  }

  let hiddenAt = 0;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { save(); hiddenAt = Date.now(); clearKeys(); }
    else if (hiddenAt) { const gain = game.applyOffline((Date.now() - hiddenAt) / 1000); hiddenAt = 0; last = performance.now(); if (gain > 0) showWelcomeBack(gain); }
  });
  window.addEventListener('pagehide', save);
  window.addEventListener('beforeunload', save);

  cam.x = CFG.world.w / 2; cam.y = CFG.world.h / 2;
  showTitle();
  requestAnimationFrame(frame);
  if ('serviceWorker' in navigator && location.protocol !== 'file:' && !location.hostname.endsWith('claude.ai')) {
    window.addEventListener('load', () => { navigator.serviceWorker.register('../sw.js').catch(() => {}); });
  }
  if (typeof Sprites !== 'undefined') Sprites.load('./assets/sprites.json');
  window.__game = game; // 디버깅/테스트용
})();
