import { html, esc, nf, num, round, toast, confirmSheet, today, addDays, uid } from '../utils.js';
import * as S from '../store.js';
import { EXERCISES } from '../data/exercises.js';
import { FOODS } from '../data/foods.js';

const ACTIVITY = [
  [1.2,   '거의 안 움직임 (좌식)'],
  [1.375, '가벼운 활동 (주 1~3회 운동)'],
  [1.55,  '보통 (주 3~5회 운동)'],
  [1.725, '활발함 (주 6~7회 운동)'],
  [1.9,   '매우 활발 (육체노동 · 2회 훈련)'],
];

function download(name, text){
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** 화면을 둘러보기 위한 예시 기록 2주치 */
function seedSample(){
  const plan = [
    ['가슴','벤치프레스','인클라인 덤벨 프레스','케이블 플라이'],
    ['등','랫풀다운','바벨로우','시티드 케이블 로우'],
    null,
    ['하체','스쿼트','레그프레스','레그 컬'],
    ['어깨','오버헤드 프레스','사이드 레터럴 레이즈','페이스풀'],
    ['팔','바벨 컬','케이블 푸시다운','해머 컬'],
    null,
  ];
  const meals = [
    ['아침','현미밥'],['아침','계란(삶은)'],['점심','닭가슴살'],['점심','흰쌀밥'],
    ['점심','김치'],['저녁','연어'],['저녁','고구마'],['간식','그릭요거트'],['간식','웨이프로틴'],
  ];
  for (let i = 13; i >= 0; i--){
    const date = addDays(today(), -i);
    const day = plan[(13 - i) % 7];
    if (day){
      const [muscle, ...names] = day;
      names.forEach((n, k) => {
        const base = 40 + k * 5 + Math.round((13 - i) / 7) * 2.5;
        S.state.workouts.push({
          id: uid(), date, name: n, muscle, type: 'strength', minutes: 0, distance: 0,
          rpe: 8, note: '', sets: [1,2,3].map(() => ({ w: base, r: 8 + Math.floor(Math.random() * 4) })),
        });
      });
      if ((13 - i) % 3 === 0){
        S.state.workouts.push({ id: uid(), date, name: '런닝머신', muscle: '유산소', type: 'cardio',
          minutes: 25, distance: 4, rpe: 6, note: '', sets: [] });
      }
    }
    meals.forEach(([slot, name]) => {
      const f = FOODS.find(x => x.n === name);
      if (!f) return;
      S.state.meals.push({ id: uid(), date, slot, name: f.n, unit: f.u, qty: 1,
        kcal: f.kcal, c: f.c, p: f.p, f: f.f });
    });
    if (i % 2 === 0) S.state.weights.push({ date, kg: round(72.5 - (13 - i) * 0.05 + (Math.random() - 0.5) * 0.4, 1) });
  }
  S.state.weights.sort((a, b) => a.date < b.date ? -1 : 1);
  const last = S.state.weights.at(-1);
  if (last) S.state.profile.weight = last.kg;
  S.save();
}

export const moreView = {
  title: '더보기',
  actions: () => '',

  render(){
    const p = S.state.profile;
    const t = S.targets();
    const days = new Set([...S.state.workouts.map(w => w.date), ...S.state.meals.map(m => m.date)]).size;

    return html`
      <div class="card">
        <div class="card-h"><h2>내 목표</h2><span class="sub">자동 계산</span></div>
        <div class="stat-row">
          <div class="stat"><b>${nf(t.kcal)}</b><span>목표 kcal</span></div>
          <div class="stat"><b>${t.protein}g</b><span>단백질</span></div>
          <div class="stat"><b>${nf(t.tdee)}</b><span>유지 kcal</span></div>
        </div>
        <p class="tiny faint" style="margin-top:10px;line-height:1.65">
          기초대사량 ${nf(t.bmr)}kcal (Mifflin-St Jeor) × 활동계수 ${p.activity} = 유지 ${nf(t.tdee)}kcal.
          여기에 ${p.goal === 'cut' ? '감량' : p.goal === 'bulk' ? '증량' : '유지'} 목표를 적용했습니다.
          탄수 ${t.carb}g · 지방 ${t.fat}g.</p>
      </div>

      <div class="sec-title">내 정보</div>
      <div class="card">
        <div class="chips" style="margin-bottom:14px">
          <button class="chip ${p.sex === 'male' ? 'on' : ''}" data-sex="male">남성</button>
          <button class="chip ${p.sex === 'female' ? 'on' : ''}" data-sex="female">여성</button>
        </div>
        <div class="grid3">
          <label class="field"><span>나이</span><input type="number" inputmode="numeric" data-p="age" value="${p.age}"></label>
          <label class="field"><span>키 (cm)</span><input type="number" inputmode="decimal" data-p="height" value="${p.height}"></label>
          <label class="field"><span>체중 (kg)</span><input type="number" inputmode="decimal" step="0.1" data-p="weight" value="${p.weight}"></label>
        </div>
        <label class="field"><span>활동 수준</span>
          <select data-p="activity">
            ${ACTIVITY.map(([v, l]) => `<option value="${v}" ${Number(p.activity) === v ? 'selected' : ''}>${l}</option>`).join('')}
          </select></label>
      </div>

      <div class="sec-title">목표 설정</div>
      <div class="card">
        <span class="tiny faint" style="display:block;margin-bottom:7px;font-weight:600">방향</span>
        <div class="chips" style="margin-bottom:14px">
          <button class="chip ${p.goal === 'cut' ? 'on' : ''}" data-goal="cut">체지방 감량</button>
          <button class="chip ${p.goal === 'maintain' ? 'on' : ''}" data-goal="maintain">유지</button>
          <button class="chip ${p.goal === 'bulk' ? 'on' : ''}" data-goal="bulk">근육 증량</button>
        </div>
        <div class="grid2">
          <label class="field"><span>주당 목표 변화 (kg)</span>
            <input type="number" inputmode="decimal" step="0.1" data-p="rate" value="${p.rate}"></label>
          <label class="field"><span>주당 운동 횟수</span>
            <input type="number" inputmode="numeric" data-p="workoutTarget" value="${p.workoutTarget}"></label>
        </div>
        <div class="grid2">
          <label class="field"><span>단백질 (체중 1kg당 g)</span>
            <input type="number" inputmode="decimal" step="0.1" data-p="proteinPerKg" value="${p.proteinPerKg}"></label>
          <label class="field"><span>지방 비율 (%)</span>
            <input type="number" inputmode="numeric" data-p="fatPct100" value="${Math.round(p.fatPct * 100)}"></label>
        </div>
        <label class="field"><span>칼로리 직접 지정 (0이면 자동)</span>
          <input type="number" inputmode="numeric" data-p="kcalOverride" value="${p.kcalOverride}"></label>
        <p class="tiny faint">감량은 주당 체중의 0.5~1%가 적정 속도입니다. 단백질은 감량기 1.8~2.2g/kg를 권장합니다.</p>
      </div>

      <div class="sec-title">데이터</div>
      <div class="card">
        <div class="row between" style="margin-bottom:12px">
          <span class="tiny muted">운동 ${S.state.workouts.length}건 · 식단 ${S.state.meals.length}건 · 체중 ${S.state.weights.length}건</span>
          <span class="tiny faint">${days}일치</span>
        </div>
        <div class="grid2" style="margin-bottom:10px">
          <button class="btn" id="export">파일로 내보내기</button>
          <button class="btn" id="import">파일에서 가져오기</button>
        </div>
        <button class="btn block" id="sample" style="margin-bottom:10px">예시 데이터 2주치 넣어보기</button>
        <button class="btn block danger" id="reset">전체 기록 삭제</button>
        <input type="file" id="file" accept="application/json,.json" hidden>
        <p class="tiny faint" style="margin-top:12px;line-height:1.65">
          모든 기록은 이 휴대폰 브라우저 안에만 저장됩니다. 서버로 전송되지 않습니다.
          기기를 바꾸거나 브라우저 데이터를 지우면 사라지니 가끔 내보내기로 백업하세요.</p>
      </div>

      <div class="sec-title">홈 화면에 설치하기</div>
      <div class="card">
        <p class="tiny muted" style="line-height:1.8">
          <b>아이폰(Safari)</b> — 공유 버튼 → "홈 화면에 추가"<br>
          <b>안드로이드(Chrome)</b> — 우측 상단 ⋮ → "홈 화면에 추가" 또는 "앱 설치"<br>
          설치하면 주소창 없이 앱처럼 열리고, 인터넷 없이도 동작합니다.</p>
      </div>

      <p class="tiny faint center" style="margin:18px 4px 0;line-height:1.7">
        핏로그 · 운동 ${EXERCISES.length}종 · 음식 ${FOODS.length}종 내장<br>
        영양 정보는 일반적인 성분표 기준의 근사치입니다.</p>`;
  },

  mount(root, rerender){
    const commit = (key, value) => {
      if (key === 'fatPct100') S.setProfile({ fatPct: Math.min(0.6, Math.max(0.1, num(value, 25) / 100)) });
      else if (key === 'activity') S.setProfile({ activity: num(value, 1.375) });
      else S.setProfile({ [key]: num(value) });
    };
    root.querySelectorAll('[data-p]').forEach(el => {
      el.addEventListener('change', () => { commit(el.dataset.p, el.value); rerender(); });
    });
    root.querySelectorAll('[data-sex]').forEach(b => b.onclick = () => { S.setProfile({ sex: b.dataset.sex }); rerender(); });
    root.querySelectorAll('[data-goal]').forEach(b => b.onclick = () => { S.setProfile({ goal: b.dataset.goal }); rerender(); });

    root.querySelector('#export').onclick = () => {
      download(`fitlog-${today()}.json`, S.exportData());
      toast('내보냈습니다');
    };
    const file = root.querySelector('#file');
    root.querySelector('#import').onclick = () => file.click();
    file.onchange = async () => {
      const f = file.files?.[0];
      if (!f) return;
      try {
        S.importData(await f.text());
        toast('가져왔습니다'); rerender();
      } catch (e) {
        toast('파일을 읽지 못했습니다');
      }
      file.value = '';
    };
    root.querySelector('#sample').onclick = () => {
      confirmSheet('예시 데이터 2주치를 추가할까요?', () => { seedSample(); toast('추가했습니다'); rerender(); }, '추가');
    };
    root.querySelector('#reset').onclick = () => {
      confirmSheet('모든 기록이 지워집니다. 계속할까요?', () => { S.resetAll(); toast('삭제했습니다'); rerender(); });
    };
  },
};
