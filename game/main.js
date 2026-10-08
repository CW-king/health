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

  // ---- 카메라 / 크기 ----
  const cam = { x: game.player.x, y: game.player.y, w: 1, h: 1, scale: 1, dpr: 1 };
  const ui = { autoTarget: null, bottomPad: 60, topPad: 120 };
  function resize() {
    const r = canvas.parentElement.getBoundingClientRect();
    cam.dpr = Math.min(2.5, window.devicePixelRatio || 1);
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
    if (js.active) return;
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
  window.addEventListener('keydown', e => {
    const k = e.key.toLowerCase(); keys[k] = true;
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
    if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) auto = false;
    if (k === ' ' || k === 'f') toggleHunt();
    Sfx.init();
  });
  window.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });
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

  function showHelp() {
    modal(`<h2>눈보라 벌목장</h2>
      <p>눈 덮인 산속에서 목재를 팔아 캠프를 키우세요. 가만히 있으면 북극곰이 찾아옵니다.</p>
      <ul>
        <li><b>이동</b> 화면 아무 곳이나 누른 채 드래그(또는 WASD · 방향키). 왼쪽 아래 미니맵으로 위치를 확인하세요</li>
        <li><b>벌목 · 낚시 · 제작</b> 나무 옆 / 강가 낚시터 / 공방 작업대에 서면 저절로 합니다</li>
        <li><b>판매</b> 가게의 초록 칸에 서면 물건을 내려놓고, 손님이 사 가며 돈을 둡니다. 돈 가까이 가면 저절로 줍습니다</li>
        <li><b>업그레이드</b> 바닥의 원 위에 서면 돈이 빠져나가며 결제됩니다. 원은 그 행동이 일어나는 자리 옆에 있습니다</li>
        <li><b>사냥</b> 사냥터(오른쪽 위)의 🐻 야생 곰 옆에 서면 도끼로 때립니다. ⚔️ 사냥 버튼(또는 F·스페이스)을 누르면 가까운 적에게 알아서 달려갑니다. 잡으면 🧥 모피와 현상금. 모피는 모피 상점에서 팝니다. 🧺 수거꾼은 바닥에 남은 고기·모피를 주워 나릅니다</li>
        <li><b>고기</b> 정육점 → 🦌 목장(순록 키우기) → 🔪 도축장(순록을 고기로) 순서로 열립니다. 목동이 출하 순록을 도축장에 데려가고, 도축업자가 고기로 만들어 정육점에 나릅니다</li>
        <li><b>습격</b> 남쪽 황무지에서 북극곰이 본부를 노립니다. 울타리 → 본부 순서로 부수고, 본부 내구도가 0이 되면 끝. 곰은 경비병과 나도 공격해서 쓰러뜨립니다</li>
        <li><b>끝없는 위협</b> 3의 배수 웨이브엔 🐺 늑대 무리, 10의 배수 웨이브엔 👹 보스(설인 → 설인 전사 → 설인 왕 → 고대 설인 → 얼음 거인). 보스는 체력이 낮아지면 분노합니다</li>
        <li><b>끝없는 성장</b> 정육점 · 🦌 목장 · 🔪 도축장 · 어물전 · 모피 상점 · 가구 공방(의자 → 피아노) · 마트 · 마을 회관(개척지 → 도시) · 방위대 · 봉화대가 차례로 열립니다. 울타리·본부·감시탑·무기는 레벨에 따라 모습이 튼튼해집니다</li>
        <li><b>마트 이후</b> 판매대·정육점·어물전·모피 상점은 마트로 합쳐져 사라지고, 빈 자리에 🍲 식당(생선·고기 요리), 🧵 재단소(모피 옷), 🏨 여관(침대·의자로 객실), 🚢 무역 부두(3분마다 무역선이 마트 재고를 대량 매입)가 들어섭니다. 마트는 계산대·품목 확장·묶음 구매로 키웁니다</li>
        <li><b>눈송이 ❄</b> 끝나도 격퇴한 습격 3번마다 눈송이 1개. 다음 판 수입이 영구히 +3%씩</li>
      </ul>
      <p class="dim">자리를 비우면 일꾼들이 최대 2시간까지 대신 벌어 두고, 곰은 그동안 오지 않습니다. 3초마다 자동 저장됩니다.</p>`,
      [{ label: '시작!', cls: 'primary' }]);
  }
  function showMenu() {
    modal(`<h2>메뉴</h2>
      <p>${game.wave.n}차 습격까지 버팀 · 누적 $${fmt(game.earned)} · 경과 ${fmtTime(game.t)}</p>
      <p class="dim">잡은 곰 ${game.stats.kills} · 순록 출하 ${game.stats.harvests} · 도축 ${game.stats.slaughters} · 투숙객 ${game.stats.guests} · 무역 ${game.stats.trades}회 · 낚은 생선 ${game.stats.fish} · 만든 가구 ${game.stats.crafts} · 판매 ${game.stats.sales}회</p>
      <p class="dim">최고 기록 ${game.meta.bestWave}웨이브 · 눈송이 ❄ ${game.meta.snowflakes} (수입 +${Math.round((game.bonus - 1) * 100)}%) · ${game.meta.runs}번째 판</p>`,
      [{ label: '계속하기', cls: 'primary' },
       { label: '도움말', onClick: () => setTimeout(showHelp, 0) },
       { label: '이번 판 포기', cls: 'danger', onClick: () => setTimeout(confirmRestart, 0) },
       { label: '모든 기록 삭제', cls: 'danger', onClick: () => setTimeout(confirmReset, 0) }]);
  }
  function confirmRestart() {
    modal(`<h2>이번 판을 포기할까요?</h2><p>눈송이는 격퇴한 습격 수 기준으로 받습니다. 캠프는 처음부터 다시 시작합니다.</p>`,
      [{ label: '포기하고 새로 시작', cls: 'danger', onClick: () => { game.gameOver(); setTimeout(showGameOver, 0); } }, { label: '취소' }]);
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
      [{ label: '다시 시작', cls: 'primary', onClick: () => { game.newRun(null); snapCam(); save(); } }]);
  }
  function showWelcomeBack(gain) {
    modal(`<h2>다녀오셨군요</h2><p>자리를 비운 동안 일꾼들이 <b>$${fmt(gain)}</b>를 벌어 뒀습니다. 곰들은 조용했습니다.</p>`,
      [{ label: '좋아', cls: 'primary' }]);
  }
  function snapCam() { cam.x = game.player.x; cam.y = game.player.y; }

  $('btn-help').onclick = () => { Sfx.init(); showHelp(); };
  $('btn-menu').onclick = () => { Sfx.init(); showMenu(); };
  hud.sound.onclick = () => { Sfx.init(); Sfx.muted = !Sfx.muted; hud.sound.textContent = Sfx.muted ? '🔇' : '🔊'; save(); };
  hud.sound.textContent = Sfx.muted ? '🔇' : '🔊';

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
    setText(hud.bonus, 'bonus', game.meta.snowflakes > 0 ? `❄ ${game.meta.snowflakes} · 수입 +${Math.round((game.bonus - 1) * 100)}%` : '');
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
    cam.x += (game.player.x - cam.x) * k; cam.y += (game.player.y - 20 - cam.y) * k;
    const hw = cam.w / 2 / cam.scale, hh = cam.h / 2 / cam.scale;
    const topPad = ui.topPad / cam.scale, botPad = ui.bottomPad / cam.scale;   // HUD에 가려지는 띠만큼 더 보여 준다
    cam.x = hw * 2 >= CFG.world.w ? CFG.world.w / 2 : clamp(cam.x, hw, CFG.world.w - hw);
    cam.y = hh * 2 >= CFG.world.h + topPad + botPad ? CFG.world.h / 2 : clamp(cam.y, hh - topPad, CFG.world.h - hh + botPad);
    render(ctx, game, cam, time, dt, js, ui);
    updateHud();
  }

  let hiddenAt = 0;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { save(); hiddenAt = Date.now(); }
    else if (hiddenAt) { const gain = game.applyOffline((Date.now() - hiddenAt) / 1000); hiddenAt = 0; last = performance.now(); if (gain > 0) showWelcomeBack(gain); }
  });
  window.addEventListener('pagehide', save);
  window.addEventListener('beforeunload', save);

  snapCam();
  if (!saved) showHelp();
  else if (offlineGain > 0) showWelcomeBack(offlineGain);
  requestAnimationFrame(frame);
  if ('serviceWorker' in navigator && location.protocol !== 'file:' && !location.hostname.endsWith('claude.ai')) {
    window.addEventListener('load', () => { navigator.serviceWorker.register('../sw.js').catch(() => {}); });
  }
  window.__game = game; // 디버깅/테스트용
})();
