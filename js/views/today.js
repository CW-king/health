import { html, esc, nf, round, num, today, addDays, weekStart, lastDays, dow, toast, openSheet, fmtVolume } from '../utils.js';
import * as S from '../store.js';
import { todayTip } from '../advice.js';
import { ring, macroBars, lineChart } from '../charts.js';

function weekStrip(){
  const start = weekStart();
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const t = today();
  return html`
  <div class="week">
    ${days.map(d => `<div class="d">${dow(d)}</div>`).join('')}
    ${days.map(d => {
      const s = S.daySummary(d);
      const future = d > t;
      const cls = future ? '' : s.trained ? 'done' : (s.meals.length ? 'rest' : '');
      const label = future ? '' : s.trained ? (s.sets || '✓') : (s.meals.length ? '휴' : '·');
      return `<div class="cell ${cls} ${d === t ? 'today' : ''}" title="${d}">${label}</div>`;
    }).join('')}
  </div>
  <div class="row" style="gap:14px;margin-top:10px;font-size:11px">
    <span class="faint"><i style="display:inline-block;width:9px;height:9px;border-radius:3px;background:var(--accent);margin-right:5px"></i>운동한 날 (숫자는 세트)</span>
    <span class="faint"><i style="display:inline-block;width:9px;height:9px;border-radius:3px;background:color-mix(in srgb,var(--blue) 45%,transparent);margin-right:5px"></i>기록만 한 날</span>
  </div>`;
}

function weightSheet(onDone){
  const cur = S.state.weights.at(-1);
  openSheet({
    title: '체중 기록',
    body: html`
      <label class="field"><span>오늘 체중 (kg)</span>
        <input type="number" inputmode="decimal" step="0.1" id="kg" value="${cur?.kg ?? S.state.profile.weight}"></label>
      <p class="tiny faint" style="margin-bottom:14px">아침 공복, 화장실을 다녀온 뒤 같은 조건에서 재면 추세가 가장 정확합니다.</p>
      <button class="btn primary block" id="save">저장</button>`,
    onMount(root, close){
      root.querySelector('#save').onclick = () => {
        const v = num(root.querySelector('#kg').value);
        if (v < 20 || v > 300) return toast('체중을 확인해주세요');
        S.setWeight(v);
        close(); toast('저장했습니다'); onDone?.();
      };
      setTimeout(() => root.querySelector('#kg')?.select(), 60);
    },
  });
}

export const todayView = {
  title: '오늘',
  actions: () => '',

  render(){
    const t = S.targets();
    const d = S.daySummary(today());
    const tip = todayTip();
    const left = t.kcal - d.kcal;
    const st = S.streak();
    const tr = S.weightTrend(28);
    const wpts = S.state.weights.slice(-14).map(w => ({ date: w.date, value: w.kg }));

    return html`
      <div class="card" style="border-color:color-mix(in srgb,var(--accent) 22%,var(--line-soft))">
        <div class="row between" style="margin-bottom:8px">
          <span class="pill ${tip.tone === 'good' ? 'accent' : tip.tone === 'warn' ? 'amber' : 'blue'}">오늘의 코칭</span>
          ${st ? `<span class="tiny faint">🔥 ${st}일 연속 기록</span>` : ''}
        </div>
        <p style="font-size:14.5px;line-height:1.65">${esc(tip.text)}</p>
      </div>

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
      </div>

      <div class="card">
        <div class="card-h"><h2>오늘 운동</h2>
          <a class="btn sm" href="#/workout">기록하기</a></div>
        ${d.workouts.length ? html`
          <div class="stat-row" style="margin-bottom:10px">
            <div class="stat"><b>${d.sets}</b><span>세트</span></div>
            <div class="stat"><b>${fmtVolume(d.volume)}</b><span>볼륨</span></div>
            <div class="stat"><b>${nf(d.burned)}</b><span>소모 kcal</span></div>
          </div>
          <div class="wrap">${d.workouts.map(w =>
            `<span class="pill">${esc(w.name)}${w.type === 'cardio' ? ` ${w.minutes}분` : ` ${w.sets.length}세트`}</span>`).join('')}</div>`
        : `<div class="empty">아직 오늘 운동 기록이 없습니다.</div>`}
      </div>

      <div class="card">
        <div class="card-h"><h2>이번 주</h2>
          <span class="sub">${S.rangeSummary(7).trainedDays}일 운동</span></div>
        ${weekStrip()}
      </div>

      <div class="card">
        <div class="card-h"><h2>체중</h2>
          <button class="btn sm" id="wbtn">＋ 기록</button></div>
        ${wpts.length >= 2 ? html`
          ${lineChart({ points: wpts, trendPerWeek: tr?.perWeek ?? null })}
          <div class="row between tiny" style="margin-top:8px">
            <span class="muted">현재 <b class="mono">${wpts.at(-1).value}kg</b></span>
            ${tr ? `<span class="faint mono">4주 추세 ${tr.perWeek > 0 ? '+' : ''}${tr.perWeek}kg/주</span>` : ''}
          </div>`
        : `<div class="empty">체중을 2회 이상 기록하면 추세선이 나타납니다.</div>`}
      </div>

      <div class="card">
        <div class="card-h"><h2>목표</h2><a class="btn sm ghost" href="#/more">수정</a></div>
        <div class="stat-row">
          <div class="stat"><b>${nf(t.kcal)}</b><span>목표 kcal</span></div>
          <div class="stat"><b>${t.protein}g</b><span>단백질</span></div>
          <div class="stat"><b>${nf(t.tdee)}</b><span>유지 kcal</span></div>
        </div>
        <p class="tiny faint center" style="margin-top:10px">
          ${S.state.profile.goal === 'cut' ? '감량' : S.state.profile.goal === 'bulk' ? '증량' : '유지'} 목표 ·
          기초대사량 ${nf(t.bmr)}kcal</p>
      </div>`;
  },

  mount(root, rerender){
    root.querySelector('#wbtn').onclick = () => weightSheet(rerender);
  },
};
