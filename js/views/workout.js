import { html, esc, ICON, toast, openSheet, confirmSheet, num, round, nf, fmtVolume, today, sum } from '../utils.js';
import { EXERCISES, MUSCLES, findExercise } from '../data/exercises.js';
import * as S from '../store.js';
import { dateNav, bindDateNav, emptyBox, fab } from './common.js';

let cursor = today();

/* ── 운동 선택 시트 ────────────────────────────────────── */
function pickExercise(onPick){
  let filter = '', q = '';
  const recents = S.recentExercises(6);

  openSheet({
    title: '운동 선택',
    body: html`
      <input type="search" id="q" placeholder="운동 이름 검색" autocomplete="off">
      <div class="chips" style="margin:12px 0">
        <button class="chip on" data-m="">전체</button>
        ${MUSCLES.map(m => `<button class="chip" data-m="${esc(m)}">${esc(m)}</button>`).join('')}
      </div>
      ${recents.length ? `<div class="sec-title" style="margin-top:6px">최근 한 운동</div>
        <div class="chips" style="margin-bottom:10px">
          ${recents.map(r => `<button class="chip" data-recent="${esc(r.name)}">${esc(r.name)}</button>`).join('')}
        </div>` : ''}
      <div class="opts" id="list"></div>`,
    onMount(root, close){
      const list = root.querySelector('#list');
      const render = () => {
        const s = q.trim().toLowerCase();
        const hits = EXERCISES
          .filter(e => (!filter || e.muscle === filter) && (!s || e.name.toLowerCase().includes(s)))
          .slice(0, 60);
        list.innerHTML = hits.length ? hits.map(e => `
          <button class="opt" data-name="${esc(e.name)}">
            <span><span class="nm">${esc(e.name)}</span>
              <span class="mt">${esc(e.muscle)}${e.comp ? ' · 복합' : ''}${e.body ? ' · 맨몸' : ''}</span></span>
            <span class="kc">${e.type === 'cardio' ? '유산소' : '웨이트'}</span>
          </button>`).join('')
          : `<div class="empty">검색 결과가 없습니다.<br>이름을 직접 입력해 기록할 수 있습니다.</div>
             ${s ? `<button class="btn block" data-custom="${esc(q)}">"${esc(q)}" 직접 추가</button>` : ''}`;
        list.querySelectorAll('[data-name]').forEach(b =>
          b.onclick = () => { close(); onPick(findExercise(b.dataset.name)); });
        list.querySelectorAll('[data-custom]').forEach(b =>
          b.onclick = () => { close(); customExercise(b.dataset.custom, onPick); });
      };
      root.querySelector('#q').addEventListener('input', e => { q = e.target.value; render(); });
      root.querySelectorAll('[data-m]').forEach(b => b.onclick = () => {
        filter = b.dataset.m;
        root.querySelectorAll('[data-m]').forEach(x => x.classList.toggle('on', x === b));
        render();
      });
      root.querySelectorAll('[data-recent]').forEach(b => b.onclick = () => {
        const known = findExercise(b.dataset.recent);
        const past = S.state.workouts.find(w => w.name === b.dataset.recent);
        close();
        onPick(known || { name: past.name, muscle: past.muscle, type: past.type });
      });
      render();
      setTimeout(() => root.querySelector('#q')?.focus(), 60);
    },
  });
}

/** 사전에 없는 운동을 부위·종류와 함께 등록 */
function customExercise(name, onPick){
  let muscle = '가슴';
  openSheet({
    title: '새 운동 등록',
    body: html`
      <label class="field"><span>이름</span><input type="text" id="n" value="${esc(name)}"></label>
      <span class="tiny faint" style="display:block;margin-bottom:7px;font-weight:600">부위</span>
      <div class="chips" style="margin-bottom:16px">
        ${MUSCLES.map(m => `<button class="chip ${m === muscle ? 'on' : ''}" data-m="${esc(m)}">${esc(m)}</button>`).join('')}
      </div>
      <p class="tiny faint" style="margin-bottom:14px">부위를 정확히 골라야 주간 볼륨 균형 분석이 맞습니다. 유산소를 고르면 시간·거리로 기록합니다.</p>
      <button class="btn primary block" id="ok">다음</button>`,
    onMount(root, close){
      root.querySelectorAll('[data-m]').forEach(b => b.onclick = () => {
        muscle = b.dataset.m;
        root.querySelectorAll('[data-m]').forEach(x => x.classList.toggle('on', x === b));
      });
      root.querySelector('#ok').onclick = () => {
        const n = root.querySelector('#n').value.trim();
        if (!n) return toast('이름을 입력해주세요');
        close();
        onPick({ name: n, muscle, type: muscle === '유산소' ? 'cardio' : 'strength' });
      };
    },
  });
}

/* ── 기록 편집 시트 ────────────────────────────────────── */
function editWorkout(meta, existing, onDone){
  const isCardio = (existing?.type ?? meta.type) === 'cardio';
  const timed = !!findExercise(meta.name)?.timed;

  // 직전 같은 운동의 세트를 기본값으로 가져온다
  const prev = [...S.state.workouts].reverse().find(w => w.name === meta.name && w.id !== existing?.id);
  const initSets = existing?.sets?.length ? existing.sets
    : prev?.sets?.length ? prev.sets.map(s => ({ ...s }))
    : [{ w: '', r: '' }, { w: '', r: '' }, { w: '', r: '' }];

  const setRow = (s, i) => html`
    <div class="setrow" data-row>
      <span class="no">${i + 1}</span>
      <input type="number" inputmode="decimal" step="0.5" placeholder="${timed ? '무게' : 'kg'}" value="${s.w ?? ''}" data-w>
      <input type="number" inputmode="numeric" placeholder="${timed ? '초' : '회'}" value="${s.r ?? ''}" data-r>
      <button class="del" data-rm aria-label="세트 삭제">${ICON.x}</button>
    </div>`;

  openSheet({
    title: existing ? `${meta.name} 수정` : meta.name,
    body: html`
      ${isCardio ? html`
        <div class="grid2">
          <label class="field"><span>시간 (분)</span>
            <input type="number" inputmode="numeric" id="min" value="${existing?.minutes || ''}" placeholder="30"></label>
          <label class="field"><span>거리 (km)</span>
            <input type="number" inputmode="decimal" step="0.1" id="dist" value="${existing?.distance || ''}" placeholder="선택"></label>
        </div>`
      : html`
        <div class="setrow" style="margin-bottom:6px">
          <span class="no"></span>
          <span class="tiny faint center">무게</span>
          <span class="tiny faint center">${timed ? '시간(초)' : '횟수'}</span><span></span>
        </div>
        <div id="sets">${initSets.map(setRow).join('')}</div>
        <button class="btn sm block" id="addset" style="margin:2px 0 14px">＋ 세트 추가</button>
        <div class="row between tiny faint" style="margin:-8px 0 12px 2px">
          <span id="vol"></span><span id="rm"></span>
        </div>`}

      <label class="field"><span>강도 RPE (선택, 1~10)</span>
        <input type="number" inputmode="numeric" min="1" max="10" id="rpe" value="${existing?.rpe || ''}" placeholder="8 = 2회 정도 남김"></label>
      <label class="field"><span>메모</span>
        <input type="text" id="note" value="${esc(existing?.note || '')}" placeholder="자세, 컨디션 등"></label>
      <button class="btn primary block" id="save">${existing ? '수정 저장' : '기록 추가'}</button>`,

    onMount(root, close){
      const setsBox = root.querySelector('#sets');

      const refresh = () => {
        if (!setsBox) return;
        [...setsBox.querySelectorAll('[data-row]')].forEach((r, i) => r.querySelector('.no').textContent = i + 1);
        const sets = readSets();
        const vol = sum(sets, s => num(s.w) * num(s.r));
        const best = Math.max(0, ...sets.map(s => S.e1rm(s.w, s.r)));
        root.querySelector('#vol').textContent = vol ? `볼륨 ${nf(vol)}kg` : '';
        root.querySelector('#rm').textContent  = best ? `추정 1RM ${best}kg` : '';
      };
      const readSets = () => setsBox ? [...setsBox.querySelectorAll('[data-row]')]
        .map(r => ({ w: r.querySelector('[data-w]').value, r: r.querySelector('[data-r]').value }))
        .filter(s => s.w !== '' || s.r !== '')
        .map(s => ({ w: num(s.w), r: num(s.r) })) : [];

      const bindRow = (row) => {
        row.querySelector('[data-rm]').onclick = () => {
          if (setsBox.querySelectorAll('[data-row]').length <= 1) return;
          row.remove(); refresh();
        };
        row.querySelectorAll('input').forEach(i => i.addEventListener('input', refresh));
      };
      setsBox?.querySelectorAll('[data-row]').forEach(bindRow);

      root.querySelector('#addset')?.addEventListener('click', () => {
        const last = [...setsBox.querySelectorAll('[data-row]')].at(-1);
        const w = last?.querySelector('[data-w]').value ?? '';
        const r = last?.querySelector('[data-r]').value ?? '';
        setsBox.insertAdjacentHTML('beforeend', setRow({ w, r }, setsBox.children.length));
        bindRow(setsBox.lastElementChild);
        refresh();
      });
      refresh();

      root.querySelector('#save').onclick = () => {
        const base = {
          date: cursor, name: meta.name, muscle: meta.muscle, type: isCardio ? 'cardio' : 'strength',
          rpe: num(root.querySelector('#rpe').value),
          note: root.querySelector('#note').value.trim(),
        };
        if (isCardio){
          base.minutes  = num(root.querySelector('#min').value);
          base.distance = num(root.querySelector('#dist').value);
          base.sets = [];
          if (!base.minutes) return toast('시간을 입력해주세요');
        } else {
          base.sets = readSets().filter(s => s.r > 0);
          if (!base.sets.length) return toast('세트를 하나 이상 입력해주세요');
        }
        if (existing) S.updateWorkout(existing.id, base); else S.addWorkout(base);
        close();
        toast(existing ? '수정했습니다' : '기록했습니다');
        onDone?.();
      };
    },
  });
}

export function openAdd(){
  pickExercise(meta => editWorkout(meta, null));
}

/** 지난 세션 전체를 오늘로 복사 */
function repeatSession(date, onDone){
  const src = S.workoutsOn(date);
  src.forEach(({ id, ...rest }) => S.addWorkout({ ...rest, date: cursor }));
  toast(`${src.length}개 종목을 불러왔습니다`);
  onDone?.();
}

/* ── 화면 ─────────────────────────────────────────────── */
export const workoutView = {
  title: '운동',
  actions: () => `<button class="icon-btn" id="repeat" aria-label="지난 운동 불러오기">${ICON.copy}</button>`,

  render(){
    const list = S.workoutsOn(cursor);
    const d = S.daySummary(cursor);
    const wk = S.rangeSummary(7);

    const card = (w) => {
      const meta = findExercise(w.name);
      const vol = S.workoutVolume(w);
      const best = Math.max(0, ...w.sets.map(s => S.e1rm(s.w, s.r)));
      const detail = w.type === 'cardio'
        ? `${w.minutes}분${w.distance ? ` · ${w.distance}km` : ''} · 약 ${S.burnedKcal(w)}kcal`
        : w.sets.map(s => `${s.w ? s.w + 'kg' : '맨몸'}×${s.r}`).join('  ');
      return html`
      <div class="item">
        <div class="grow" data-edit="${w.id}" style="cursor:pointer">
          <div class="row" style="gap:7px">
            <span class="nm">${esc(w.name)}</span>
            <span class="pill">${esc(w.muscle)}</span>
            ${w.rpe ? `<span class="pill amber">RPE ${w.rpe}</span>` : ''}
          </div>
          <div class="dt">${esc(detail)}</div>
          ${w.note ? `<div class="dt">💬 ${esc(w.note)}</div>` : ''}
        </div>
        <div class="rt">
          ${w.type === 'strength' ? `<b>${fmtVolume(vol)}</b><span>${best ? `1RM ${best}kg` : '볼륨'}</span>` : ''}
        </div>
        <button class="del" data-del="${w.id}" aria-label="삭제">${ICON.trash}</button>
      </div>`;
    };

    return html`
      ${dateNav(cursor)}
      <div class="card">
        <div class="stat-row">
          <div class="stat"><b>${d.workouts.length}</b><span>종목</span></div>
          <div class="stat"><b>${d.sets}</b><span>세트</span></div>
          <div class="stat"><b>${fmtVolume(d.volume)}</b><span>볼륨</span></div>
        </div>
        <div class="row between tiny faint" style="margin-top:10px">
          <span>유산소 ${d.cardio}분</span><span>소모 추정 ${nf(d.burned)}kcal</span>
        </div>
      </div>

      <div class="card">
        <div class="card-h"><h2>오늘의 운동</h2>
          <span class="sub">${list.length ? `${list.length}종목` : ''}</span></div>
        ${list.length ? list.map(card).join('')
          : emptyBox('아직 기록이 없습니다.<br>오른쪽 아래 ＋ 버튼으로 추가하세요.')}
      </div>

      <div class="card">
        <div class="card-h"><h2>이번 주</h2><span class="sub">최근 7일</span></div>
        <div class="stat-row">
          <div class="stat"><b>${wk.trainedDays}</b><span>운동일</span></div>
          <div class="stat"><b>${wk.totalSets}</b><span>총 세트</span></div>
          <div class="stat"><b>${fmtVolume(wk.totalVolume)}</b><span>총 볼륨</span></div>
        </div>
      </div>
      ${fab('운동 추가')}`;
  },

  mount(root, rerender){
    bindDateNav(root, cursor, d => { cursor = d; rerender(); });
    root.querySelector('#fab').onclick = () => pickExercise(meta => editWorkout(meta, null, rerender));
    root.querySelectorAll('[data-del]').forEach(b => b.onclick = () => {
      const w = S.state.workouts.find(x => x.id === b.dataset.del);
      confirmSheet(`${w?.name} 기록을 삭제할까요?`, () => { S.removeWorkout(b.dataset.del); rerender(); });
    });
    root.querySelectorAll('[data-edit]').forEach(el => el.onclick = () => {
      const w = S.state.workouts.find(x => x.id === el.dataset.edit);
      if (w) editWorkout(findExercise(w.name) || w, w, rerender);
    });
    const rp = document.querySelector('#repeat');
    if (rp) rp.onclick = () => {
      const dates = [...new Set(S.state.workouts.map(w => w.date))].filter(d => d !== cursor).sort().reverse().slice(0, 8);
      if (!dates.length) return toast('불러올 지난 기록이 없습니다');
      openSheet({
        title: '지난 운동 불러오기',
        body: `<div class="opts">${dates.map(d => {
          const ws = S.workoutsOn(d);
          return `<button class="opt" data-d="${d}">
            <span><span class="nm">${d}</span>
              <span class="mt">${ws.map(w => w.name).slice(0, 3).join(', ')}${ws.length > 3 ? ' 외' : ''}</span></span>
            <span class="kc">${ws.length}종목</span></button>`;
        }).join('')}</div>`,
        onMount(sheet, close){
          sheet.querySelectorAll('[data-d]').forEach(b => b.onclick = () => {
            close(); repeatSession(b.dataset.d, rerender);
          });
        },
      });
    };
  },

  setDate(d){ cursor = d; },
  getDate(){ return cursor; },
};
