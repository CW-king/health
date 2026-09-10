import { html, esc, nf, round, fmtDateShort, dow, fmtVolume } from '../utils.js';
import * as S from '../store.js';
import { buildAdvice } from '../advice.js';
import { barsWithTarget, hBars, lineChart, tableView } from '../charts.js';

let period = 7;

const scoreColor = (v) => v >= 80 ? 'var(--accent)' : v >= 60 ? 'var(--amber)' : 'var(--rose)';
const scoreWord  = (v) => v >= 90 ? '아주 좋습니다' : v >= 75 ? '잘 하고 있습니다'
                        : v >= 55 ? '보완할 부분이 있습니다' : '기본부터 다시 잡아봅시다';

export const reviewView = {
  title: '리뷰',
  actions: () => '',

  render(){
    const { list, week, targets: t, score } = buildAdvice(period);

    // 일자별 칼로리
    const kcalData = week.daily.map(d => ({
      label: `${fmtDateShort(d.date)} (${dow(d.date)})`, sub: period <= 7 ? dow(d.date) : fmtDateShort(d.date), value: d.kcal,
    }));
    // 일자별 볼륨
    const volData = week.daily.map(d => ({
      label: `${fmtDateShort(d.date)} (${dow(d.date)})`, sub: period <= 7 ? dow(d.date) : fmtDateShort(d.date), value: Math.round(d.volume),
    }));
    // 부위별 세트
    const parts = ['가슴','등','어깨','하체','팔','코어'];
    const muscleData = parts.map(p => ({ label: p, value: week.byMuscle[p] || 0 }));
    // 체중
    const wpts = S.state.weights.filter(w => w.date >= week.dates[0]).map(w => ({ date: w.date, value: w.kg }));
    const tr = S.weightTrend(Math.max(28, period));

    // 개인 기록
    const names = [...new Set(S.state.workouts.filter(w => w.type === 'strength').map(w => w.name))];
    const prs = names.map(n => ({ name: n, ...S.bestE1rm(n) })).filter(p => p.value > 0)
      .sort((a, b) => b.value - a.value).slice(0, 6);

    const adviceCard = (a) => html`
      <div class="advice ${a.level}">
        <div class="row between" style="margin-bottom:4px">
          <h3>${esc(a.title)}</h3>
          ${a.tag ? `<span class="pill">${esc(a.tag)}</span>` : ''}
        </div>
        <p>${esc(a.body)}</p>
        ${a.action ? `<div class="todo">${a.action}</div>` : ''}
      </div>`;

    return html`
      <div class="chips" style="margin-bottom:14px">
        ${[7, 14, 30].map(p => `<button class="chip ${p === period ? 'on' : ''}" data-p="${p}">최근 ${p}일</button>`).join('')}
      </div>

      <div class="card">
        <div class="card-h"><h2>${period}일 종합 점수</h2><span class="sub">${esc(scoreWord(score.score))}</span></div>
        <div class="row" style="gap:16px;align-items:center">
          <div style="flex:none;text-align:center;min-width:76px">
            <b style="font-size:38px;font-weight:800;letter-spacing:-.04em;color:${scoreColor(score.score)}">${score.score}</b>
            <div class="tiny faint">/ 100</div>
          </div>
          <div class="grow macro">
            ${score.items.map(i => `
              <div class="macro-line">
                <div class="row between"><span class="nm">${esc(i.label)}</span>
                  <span class="vl">${Math.round(i.value * 100)}%</span></div>
                <div class="bar"><i style="width:${round(i.value * 100, 1)}%;background:${scoreColor(i.value * 100)}"></i></div>
              </div>`).join('')}
          </div>
        </div>
      </div>

      <div class="sec-title">코칭</div>
      ${list.length ? list.map(adviceCard).join('') : `<div class="empty">기록을 조금만 더 쌓으면 조언을 드릴 수 있습니다.</div>`}

      <div class="sec-title">숫자로 보기</div>
      <div class="card">
        <div class="card-h"><h2>일자별 섭취 칼로리</h2><span class="sub">평균 ${nf(week.avgKcal)}kcal</span></div>
        ${barsWithTarget({ data: kcalData, target: t.kcal, unit: 'kcal', labelEvery: period <= 7 ? 1 : 3 })}
        ${tableView(['날짜', '칼로리', '단백질', '탄수', '지방'],
          week.daily.map(d => [`${fmtDateShort(d.date)}(${dow(d.date)})`, nf(d.kcal), `${d.protein}g`, `${d.carb}g`, `${d.fat}g`]))}
      </div>

      <div class="card">
        <div class="card-h"><h2>일자별 운동 볼륨</h2><span class="sub">합계 ${fmtVolume(week.totalVolume)}</span></div>
        ${barsWithTarget({ data: volData, target: 0, unit: 'kg', labelEvery: period <= 7 ? 1 : 99 })}
        <div class="row between tiny faint" style="margin-top:6px">
          <span>운동 ${week.trainedDays}일 · 휴식 ${week.restDays}일</span>
          <span>유산소 ${week.cardioMin}분</span>
        </div>
      </div>

      <div class="card">
        <div class="card-h"><h2>부위별 주간 세트</h2><span class="sub">점선 = 권장 10세트</span></div>
        ${hBars({ data: muscleData, target: 10 })}
      </div>

      ${wpts.length >= 2 ? html`
        <div class="card">
          <div class="card-h"><h2>체중 변화</h2>
            <span class="sub">${tr ? `${tr.perWeek > 0 ? '+' : ''}${tr.perWeek}kg/주` : ''}</span></div>
          ${lineChart({ points: wpts, trendPerWeek: tr?.perWeek ?? null })}
        </div>` : ''}

      ${prs.length ? html`
        <div class="card">
          <div class="card-h"><h2>개인 최고 기록</h2><span class="sub">추정 1RM</span></div>
          ${prs.map(p => `
            <div class="item">
              <div class="grow"><div class="nm">${esc(p.name)}</div>
                <div class="dt">${esc(p.date || '')}</div></div>
              <div class="rt"><b>${p.value}kg</b><span>1RM</span></div>
            </div>`).join('')}
        </div>` : ''}

      <p class="tiny faint center" style="margin:18px 4px 0;line-height:1.7">
        이 조언은 기록된 숫자에 일반적인 트레이닝·영양 기준을 적용한 결과입니다.<br>
        의학적 진단이 아니며, 통증이나 질환이 있다면 전문가와 상의하세요.</p>`;
  },

  mount(root, rerender){
    root.querySelectorAll('[data-p]').forEach(b => b.onclick = () => { period = Number(b.dataset.p); rerender(); });
  },
};
