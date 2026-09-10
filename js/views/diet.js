import { html, esc, ICON, toast, openSheet, confirmSheet, num, round, nf, today, sum } from '../utils.js';
import { FOODS, FOOD_CATS, searchFoods } from '../data/foods.js';
import * as S from '../store.js';
import { ring, macroBars } from '../charts.js';
import { dateNav, bindDateNav, emptyBox, fab } from './common.js';

const SLOTS = ['아침','점심','저녁','간식'];
let cursor = today();

const slotByHour = () => {
  const h = new Date().getHours();
  return h < 10 ? '아침' : h < 15 ? '점심' : h < 21 ? '저녁' : '간식';
};

/* ── 수량·끼니 지정 시트 ───────────────────────────────── */
function amountSheet(food, slot, onDone){
  let qty = 1;
  const calc = (q) => ({
    kcal: Math.round(food.kcal * q), c: round(food.c * q, 1),
    p: round(food.p * q, 1), f: round(food.f * q, 1),
  });
  openSheet({
    title: food.n,
    body: html`
      <div class="tiny faint" style="margin:-8px 0 14px">1회 제공량 ${esc(food.u)} · ${nf(food.kcal)}kcal</div>
      <span class="tiny faint" style="display:block;margin-bottom:6px;font-weight:600">끼니</span>
      <div class="chips" style="margin-bottom:14px">
        ${SLOTS.map(s => `<button class="chip ${s === slot ? 'on' : ''}" data-slot="${s}">${s}</button>`).join('')}
      </div>
      <span class="tiny faint" style="display:block;margin-bottom:6px;font-weight:600">먹은 양</span>
      <div class="chips" style="margin-bottom:10px">
        ${[0.5, 1, 1.5, 2, 3].map(q => `<button class="chip ${q === 1 ? 'on' : ''}" data-q="${q}">${q}인분</button>`).join('')}
      </div>
      <input type="number" inputmode="decimal" step="0.1" id="qty" value="1" style="margin-bottom:14px">
      <div class="card tight" style="margin-bottom:14px">
        <div class="row between"><b id="k">${nf(food.kcal)}kcal</b>
          <span class="tiny faint mono" id="m">탄 ${food.c} · 단 ${food.p} · 지 ${food.f}g</span></div>
      </div>
      <button class="btn primary block" id="save">추가하기</button>`,
    onMount(root, close){
      const upd = () => {
        const v = calc(qty);
        root.querySelector('#k').textContent = `${nf(v.kcal)}kcal`;
        root.querySelector('#m').textContent = `탄 ${v.c} · 단 ${v.p} · 지 ${v.f}g`;
      };
      root.querySelectorAll('[data-slot]').forEach(b => b.onclick = () => {
        slot = b.dataset.slot;
        root.querySelectorAll('[data-slot]').forEach(x => x.classList.toggle('on', x === b));
      });
      root.querySelectorAll('[data-q]').forEach(b => b.onclick = () => {
        qty = Number(b.dataset.q);
        root.querySelector('#qty').value = qty;
        root.querySelectorAll('[data-q]').forEach(x => x.classList.toggle('on', x === b));
        upd();
      });
      root.querySelector('#qty').addEventListener('input', e => {
        qty = num(e.target.value, 1);
        root.querySelectorAll('[data-q]').forEach(x => x.classList.remove('on'));
        upd();
      });
      root.querySelector('#save').onclick = () => {
        if (qty <= 0) return toast('양을 확인해주세요');
        S.addMeal({ date: cursor, slot, name: food.n, unit: food.u, qty,
                    kcal: food.kcal, c: food.c, p: food.p, f: food.f });
        close(); toast('기록했습니다'); onDone?.();
      };
    },
  });
}

/* ── 직접 입력 ─────────────────────────────────────────── */
function customFood(name, slot, onDone){
  openSheet({
    title: '음식 직접 입력',
    body: html`
      <label class="field"><span>이름</span><input type="text" id="n" value="${esc(name || '')}" placeholder="예: 엄마표 김치찜"></label>
      <label class="field"><span>1회 제공량 설명</span><input type="text" id="u" placeholder="예: 1접시"></label>
      <label class="field"><span>칼로리 (kcal)</span><input type="number" inputmode="numeric" id="kc" placeholder="400"></label>
      <div class="grid3">
        <label class="field"><span>탄수 g</span><input type="number" inputmode="decimal" id="c"></label>
        <label class="field"><span>단백질 g</span><input type="number" inputmode="decimal" id="p"></label>
        <label class="field"><span>지방 g</span><input type="number" inputmode="decimal" id="f"></label>
      </div>
      <p class="tiny faint" style="margin-bottom:14px">칼로리를 비우면 탄단지로 자동 계산합니다 (탄·단 4kcal, 지방 9kcal).</p>
      <button class="btn primary block" id="save">추가하기</button>`,
    onMount(root, close){
      root.querySelector('#save').onclick = () => {
        const n = root.querySelector('#n').value.trim();
        if (!n) return toast('이름을 입력해주세요');
        const c = num(root.querySelector('#c').value), p = num(root.querySelector('#p').value), f = num(root.querySelector('#f').value);
        const kc = num(root.querySelector('#kc').value) || Math.round(c * 4 + p * 4 + f * 9);
        if (!kc) return toast('칼로리 또는 탄단지를 입력해주세요');
        S.addMeal({ date: cursor, slot, name: n, unit: root.querySelector('#u').value.trim() || '1회', qty: 1,
                    kcal: kc, c, p, f });
        close(); toast('기록했습니다'); onDone?.();
      };
    },
  });
}

/* ── 음식 검색 시트 ────────────────────────────────────── */
function pickFood(slot, onDone){
  let q = '', cat = '';
  const recents = S.recentFoods(6);
  openSheet({
    title: `${slot} 기록`,
    body: html`
      <input type="search" id="q" placeholder="음식 이름 검색" autocomplete="off">
      <div class="chips" style="margin:12px 0">
        <button class="chip on" data-c="">전체</button>
        ${FOOD_CATS.map(c => `<button class="chip" data-c="${esc(c)}">${esc(c)}</button>`).join('')}
      </div>
      ${recents.length ? `<div class="sec-title" style="margin-top:6px">자주 먹는 것</div>
        <div class="chips" style="margin-bottom:10px">
          ${recents.map(r => `<button class="chip" data-recent="${esc(r.name)}">${esc(r.name)}</button>`).join('')}
        </div>` : ''}
      <div class="opts" id="list"></div>
      <button class="btn block" id="custom" style="margin-top:4px">직접 입력하기</button>`,
    onMount(root, close){
      const list = root.querySelector('#list');
      const render = () => {
        const s = q.trim().toLowerCase();
        const hits = FOODS.filter(f => (!cat || f.cat === cat) && (!s || f.n.toLowerCase().includes(s))).slice(0, 60);
        list.innerHTML = hits.length ? hits.map(f => `
          <button class="opt" data-n="${esc(f.n)}">
            <span><span class="nm">${esc(f.n)}</span><span class="mt">${esc(f.u)} · 단백질 ${f.p}g</span></span>
            <span class="kc">${nf(f.kcal)}kcal</span></button>`).join('')
          : `<div class="empty">검색 결과가 없습니다.<br>아래에서 직접 입력해보세요.</div>`;
        list.querySelectorAll('[data-n]').forEach(b => b.onclick = () => {
          close(); amountSheet(FOODS.find(f => f.n === b.dataset.n), slot, onDone);
        });
      };
      root.querySelector('#q').addEventListener('input', e => { q = e.target.value; render(); });
      root.querySelectorAll('[data-c]').forEach(b => b.onclick = () => {
        cat = b.dataset.c;
        root.querySelectorAll('[data-c]').forEach(x => x.classList.toggle('on', x === b));
        render();
      });
      root.querySelectorAll('[data-recent]').forEach(b => b.onclick = () => {
        const name = b.dataset.recent;
        const known = FOODS.find(f => f.n === name);
        const past = S.recentFoods(30).find(m => m.name === name);
        close();
        amountSheet(known || { n: past.name, u: past.unit || '1회', kcal: past.kcal, c: past.c, p: past.p, f: past.f }, slot, onDone);
      });
      root.querySelector('#custom').onclick = () => { close(); customFood(q, slot, onDone); };
      render();
      setTimeout(() => root.querySelector('#q')?.focus(), 60);
    },
  });
}

/* ── 화면 ─────────────────────────────────────────────── */
export const dietView = {
  title: '식단',
  actions: () => '',

  render(){
    const t = S.targets();
    const d = S.daySummary(cursor);
    const left = t.kcal - d.kcal;

    const mealRow = (m) => {
      const q = m.qty ?? 1;
      return html`
      <div class="item">
        <div class="grow">
          <div class="nm">${esc(m.name)}${q !== 1 ? ` <span class="faint tiny">×${q}</span>` : ''}</div>
          <div class="dt">${esc(m.unit || '')} · 탄 ${round(m.c * q, 1)} · 단 ${round(m.p * q, 1)} · 지 ${round(m.f * q, 1)}g</div>
        </div>
        <div class="rt"><b>${nf(m.kcal * q)}</b><span>kcal</span></div>
        <button class="del" data-del="${m.id}" aria-label="삭제">${ICON.trash}</button>
      </div>`;
    };

    const slotCard = (slot) => {
      const items = d.meals.filter(m => m.slot === slot);
      const kc = sum(items, m => m.kcal * (m.qty ?? 1));
      return html`
      <div class="card">
        <div class="card-h">
          <h2>${slot}${items.length ? ` <span class="faint" style="font-weight:600">${nf(kc)}kcal</span>` : ''}</h2>
          <button class="btn sm" data-add="${slot}">＋ 추가</button>
        </div>
        ${items.length ? items.map(mealRow).join('') : `<div class="tiny faint" style="padding:4px 0 2px">기록 없음</div>`}
      </div>`;
    };

    return html`
      ${dateNav(cursor)}
      <div class="card">
        <div class="kcal-wrap">
          ${ring({ value: d.kcal, max: t.kcal, center: `
            <div class="ring-label">
              <b>${nf(Math.abs(left))}</b>
              <div class="tiny faint">${left >= 0 ? 'kcal 남음' : 'kcal 초과'}</div>
            </div>` })}
          <div class="grow">
            <div class="row between tiny" style="margin-bottom:8px">
              <span class="muted">섭취 <b class="mono">${nf(d.kcal)}</b></span>
              <span class="faint mono">목표 ${nf(t.kcal)}</span>
            </div>
            ${macroBars({ carb: d.carb, protein: d.protein, fat: d.fat, target: t })}
          </div>
        </div>
        ${d.burned ? `<div class="tiny faint center" style="margin-top:12px">
          운동 소모 추정 ${nf(d.burned)}kcal · 순 섭취 ${nf(d.kcal - d.burned)}kcal</div>` : ''}
      </div>

      ${SLOTS.map(slotCard).join('')}
      ${fab('식단 추가')}`;
  },

  mount(root, rerender){
    bindDateNav(root, cursor, d => { cursor = d; rerender(); });
    root.querySelector('#fab').onclick = () => pickFood(slotByHour(), rerender);
    root.querySelectorAll('[data-add]').forEach(b => b.onclick = () => pickFood(b.dataset.add, rerender));
    root.querySelectorAll('[data-del]').forEach(b => b.onclick = () => {
      const m = S.state.meals.find(x => x.id === b.dataset.del);
      confirmSheet(`${m?.name} 기록을 삭제할까요?`, () => { S.removeMeal(b.dataset.del); rerender(); });
    });
  },

  setDate(d){ cursor = d; },
  getDate(){ return cursor; },
};
