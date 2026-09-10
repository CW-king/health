import { state, targets, rangeSummary, weightTrend, bestE1rm, workoutsBetween } from './store.js';
import { today, addDays, round, sum, num } from './utils.js';

/* 권장 기준
 * - 부위별 주간 직접 세트 10~20세트 (Schoenfeld 등 볼륨-반응 연구의 통용 범위)
 * - 유산소 주 150분 (WHO 신체활동 권고)
 * - 주간 볼륨 증가폭 10% 내외, 30% 초과 급증은 부상 위험 신호
 * - 감량기 체중 감소 속도 주당 체중의 0.5~1.0%
 */
const SETS_MIN = 8, SETS_MAX = 22;
const CARDIO_WEEK = 150;

const A = (level, title, body, action, priority = 5, tag = '') =>
  ({ level, title, body, action, priority, tag });

/* ── 식단 ─────────────────────────────────────────────── */
function dietAdvice(wk, t){
  const out = [];
  const goal = state.profile.goal;

  if (wk.loggedMealDays === 0){
    return [A('info', '식단 기록을 시작해보세요',
      '아직 이번 주 식단 기록이 없습니다. 칼로리와 단백질이 목표에 맞는지 봐야 조언을 드릴 수 있습니다.',
      '오늘 먹은 것 한 끼만 먼저 기록해보세요.', 9, '식단')];
  }

  if (wk.loggedMealDays < Math.min(4, wk.days)){
    out.push(A('warn', `식단 기록이 ${wk.loggedMealDays}일뿐입니다`,
      `${wk.days}일 중 ${wk.loggedMealDays}일만 기록했습니다. 기록이 절반 아래면 평균값이 실제 섭취를 반영하지 못합니다.`,
      '완벽하게 적으려 하지 말고 <b>주식과 단백질원만</b> 먼저 적으세요. 그것만으로도 80%는 잡힙니다.', 7, '식단'));
  }

  // 칼로리
  const gap = wk.avgKcal - t.kcal;
  const gapPct = t.kcal ? gap / t.kcal : 0;
  if (Math.abs(gapPct) <= 0.07){
    out.push(A('good', '칼로리가 목표에 잘 맞습니다',
      `하루 평균 ${wk.avgKcal}kcal로 목표 ${t.kcal}kcal와 ${Math.abs(gap)}kcal 차이입니다. 이 범위면 계획대로 가고 있습니다.`,
      '지금 식단 구성을 그대로 유지하세요.', 3, '식단'));
  } else if (gapPct > 0.07){
    const over = Math.round(gap);
    out.push(A(gapPct > 0.2 ? 'bad' : 'warn', `칼로리를 하루 ${over}kcal 초과하고 있습니다`,
      goal === 'cut'
        ? `평균 ${wk.avgKcal}kcal로 감량 목표 ${t.kcal}kcal를 넘습니다. 이 상태면 주당 약 ${round(over * 7 / 7700, 2)}kg만큼 감량이 느려집니다.`
        : `평균 ${wk.avgKcal}kcal로 목표 ${t.kcal}kcal를 넘습니다. 증량기라도 초과분이 크면 체지방 비율이 올라갑니다.`,
      `가장 쉬운 조정은 <b>지방과 술, 간식</b>입니다. 하루 ${over}kcal는 대략 견과류 한 줌 + 음료 한 잔 수준입니다.`, 8, '식단'));
  } else if (gapPct < -0.15){
    out.push(A(gapPct < -0.3 ? 'bad' : 'warn', `칼로리가 목표보다 ${Math.abs(Math.round(gap))}kcal 부족합니다`,
      `평균 ${wk.avgKcal}kcal로 목표 ${t.kcal}kcal에 못 미칩니다. 과한 적자는 근손실, 수행능력 저하, 폭식으로 이어집니다.`,
      '기초대사량(약 ' + t.bmr + 'kcal) 아래로 내려가지 않게 <b>탄수화물을 먼저 채우세요.</b>', 8, '식단'));
  }

  // 단백질
  if (wk.avgProtein > 0){
    const pGap = t.protein - wk.avgProtein;
    if (pGap > t.protein * 0.15){
      out.push(A('bad', `단백질이 하루 ${Math.round(pGap)}g 부족합니다`,
        `평균 ${wk.avgProtein}g을 먹었고 목표는 ${t.protein}g입니다. 감량기든 증량기든 단백질이 부족하면 늘린 볼륨이 근육으로 가지 않습니다.`,
        `<b>닭가슴살 100g(24g), 계란 2개(13g), 프로틴 1스쿱(24g)</b> 중 하나를 매일 추가하면 채워집니다.`, 9, '식단'));
    } else if (pGap <= 0){
      out.push(A('good', '단백질을 충분히 먹고 있습니다',
        `평균 ${wk.avgProtein}g으로 목표 ${t.protein}g을 채웠습니다. 근육 유지·성장의 가장 중요한 조건을 지키고 있습니다.`,
        '', 2, '식단'));
    }
  }

  // 지방 하한
  if (wk.avgFat > 0 && wk.avgFat < num(state.profile.weight, 70) * 0.5){
    out.push(A('warn', '지방 섭취가 너무 낮습니다',
      `하루 평균 ${wk.avgFat}g입니다. 지방이 체중 1kg당 0.5g 아래로 오래 유지되면 호르몬 수치와 컨디션에 영향을 줍니다.`,
      '<b>계란 노른자, 견과류, 올리브유, 등푸른 생선</b>으로 최소선을 지키세요.', 6, '식단'));
  }

  // 술
  const drinks = state.meals.filter(m =>
    m.date >= wk.dates[0] && m.date <= wk.dates.at(-1) && /소주|맥주|막걸리|와인|하이볼|위스키/.test(m.name));
  if (drinks.length >= 2){
    const kcal = Math.round(sum(drinks, d => d.kcal * (d.qty ?? 1)));
    out.push(A('warn', `이번 주 음주가 ${drinks.length}회입니다`,
      `술로만 ${kcal}kcal를 섭취했습니다. 알코올은 그 자체 칼로리보다 지방 산화를 억제하고 수면의 질을 떨어뜨려 회복을 방해하는 쪽이 더 큽니다.`,
      '술자리 다음 날 훈련은 강도를 낮추고, <b>주 1회 이하</b>로 줄여보세요.', 7, '식단'));
  }

  // 운동일/휴식일 배분
  const trainKcal = wk.daily.filter(d => d.trained && d.meals.length);
  const restKcal  = wk.daily.filter(d => !d.trained && d.meals.length);
  if (trainKcal.length >= 2 && restKcal.length >= 2){
    const tAvg = Math.round(sum(trainKcal, d => d.kcal) / trainKcal.length);
    const rAvg = Math.round(sum(restKcal, d => d.kcal) / restKcal.length);
    if (rAvg > tAvg + 150){
      out.push(A('warn', '쉬는 날에 더 많이 먹고 있습니다',
        `운동일 평균 ${tAvg}kcal, 휴식일 평균 ${rAvg}kcal입니다. 에너지가 필요한 날에 덜 먹고 안 쓰는 날에 더 먹는 구조입니다.`,
        '<b>탄수화물을 운동일 쪽으로 옮기세요.</b> 총량은 그대로 두고 배치만 바꿔도 수행능력이 올라갑니다.', 6, '식단'));
    }
  }
  return out;
}

/* ── 운동 ─────────────────────────────────────────────── */
function workoutAdvice(wk, prev){
  const out = [];
  const p = state.profile;

  if (wk.trainedDays === 0){
    return [A('info', '이번 주 운동 기록이 없습니다',
      '기록이 있어야 볼륨과 부위 균형을 볼 수 있습니다. 짧게라도 남겨두면 다음 주 계획이 훨씬 쉬워집니다.',
      '30분짜리 세션 하나부터 시작하세요.', 9, '운동')];
  }

  // 빈도
  const target = num(p.workoutTarget, 4);
  if (wk.trainedDays >= target){
    out.push(A('good', `주 ${wk.trainedDays}회 운동했습니다`,
      `목표 ${target}회를 채웠습니다. 빈도는 프로그램에서 가장 먼저 지켜야 할 변수이고, 지금 그걸 지키고 있습니다.`,
      '', 3, '운동'));
  } else if (wk.trainedDays <= target - 2){
    out.push(A('warn', `운동이 주 ${wk.trainedDays}회에 그쳤습니다`,
      `목표는 ${target}회입니다. 빈도가 떨어지면 부위별 주간 볼륨이 자연스럽게 미달됩니다.`,
      '한 번에 오래 하기보다 <b>40분짜리를 한 번 더</b> 넣는 쪽이 유지하기 쉽습니다.', 7, '운동'));
  }

  // 부위 균형
  const m = wk.byMuscle;
  const parts = ['가슴','등','어깨','하체','팔','코어'];
  const missing = parts.filter(k => !m[k] || m[k] < 3).filter(k => k !== '코어' && k !== '팔');
  const low  = parts.filter(k => m[k] && m[k] < SETS_MIN && !missing.includes(k));
  const high = parts.filter(k => (m[k] || 0) > SETS_MAX);

  if (missing.length){
    out.push(A('bad', `${missing.join(', ')} 운동을 하지 않았습니다`,
      `이번 주 해당 부위의 직접 세트가 거의 없습니다. 특정 부위를 계속 건너뛰면 근육 불균형과 자세 문제로 이어집니다.`,
      missing.includes('하체')
        ? '<b>하체는 몸 전체 근육량의 절반</b>입니다. 스쿼트나 레그프레스 3세트만이라도 다음 세션에 넣으세요.'
        : `다음 세션 앞부분에 ${missing[0]} 복합운동 3세트를 배치하세요.`, 9, '운동'));
  }
  if (high.length){
    out.push(A('warn', `${high.join(', ')} 볼륨이 많습니다`,
      high.map(k => `${k} ${m[k]}세트`).join(', ') + `. 주당 ${SETS_MAX}세트를 넘으면 추가 세트의 효율이 떨어지고 회복 부담만 커집니다.`,
      `그 세트를 <b>부족한 부위로 옮기면</b> 같은 시간에 더 나은 결과가 납니다.`, 6, '운동'));
  }
  if (low.length && !missing.length){
    out.push(A('info', `${low.join(', ')} 볼륨이 조금 부족합니다`,
      low.map(k => `${k} ${m[k]}세트`).join(', ') + `. 성장 자극에는 부위당 주 ${SETS_MIN}세트 이상이 무난한 출발선입니다.`,
      '각 부위에 <b>3세트짜리 종목 하나씩</b>만 더 붙이면 됩니다.', 4, '운동'));
  }

  // 밀기 / 당기기
  const push = (m['가슴'] || 0) + (m['어깨'] || 0);
  const pull = (m['등'] || 0);
  if (push >= 6 && pull >= 1 && push > pull * 1.8){
    out.push(A('warn', '미는 운동이 당기는 운동보다 많습니다',
      `밀기 ${push}세트 대 당기기 ${pull}세트입니다. 이 불균형이 쌓이면 어깨가 앞으로 말리고 회전근개 부담이 커집니다.`,
      '<b>밀기 대 당기기를 1:1</b>로 맞추세요. 로우나 풀다운 세트를 늘리는 쪽이 안전합니다.', 7, '운동'));
  }

  // 볼륨 추세
  if (prev.totalVolume > 0 && wk.totalVolume > 0){
    const chg = (wk.totalVolume - prev.totalVolume) / prev.totalVolume;
    if (chg > 0.3){
      out.push(A('warn', `볼륨이 지난주보다 ${Math.round(chg * 100)}% 급증했습니다`,
        `${Math.round(prev.totalVolume).toLocaleString()}kg → ${Math.round(wk.totalVolume).toLocaleString()}kg. 주간 부하 증가가 30%를 넘으면 부상 위험이 눈에 띄게 올라갑니다.`,
        '다음 주는 <b>이번 주와 비슷한 수준으로 유지</b>하고, 그 다음 주에 10%만 올리세요.', 8, '운동'));
    } else if (chg >= 0.03){
      out.push(A('good', `볼륨이 지난주보다 ${Math.round(chg * 100)}% 늘었습니다`,
        `점진적 과부하가 실제 숫자로 나타나고 있습니다. 이게 근성장의 가장 확실한 신호입니다.`,
        '', 3, '운동'));
    } else if (chg < -0.25){
      out.push(A('info', `볼륨이 지난주보다 ${Math.abs(Math.round(chg * 100))}% 줄었습니다`,
        `계획된 디로드라면 정상입니다. 아니라면 컨디션이나 일정 문제일 수 있습니다.`,
        '의도한 게 아니라면 다음 주에 <b>지난주 수준으로 복귀</b>하세요.', 4, '운동'));
    }
  }

  // 유산소
  if (wk.cardioMin < CARDIO_WEEK * 0.5){
    out.push(A('info', `유산소가 주 ${wk.cardioMin}분입니다`,
      `건강 권고 기준은 주 ${CARDIO_WEEK}분입니다. 심폐 능력은 웨이트 세트 사이 회복 속도에도 직접 영향을 줍니다.`,
      '<b>운동 후 20분 빠르게 걷기</b>를 주 3회만 붙여도 기준의 절반 가까이 채워집니다.', 4, '운동'));
  } else if (wk.cardioMin >= CARDIO_WEEK){
    out.push(A('good', `유산소를 주 ${wk.cardioMin}분 채웠습니다`,
      `권고 기준 ${CARDIO_WEEK}분을 넘겼습니다. 심폐 건강과 체지방 관리 양쪽에서 이득입니다.`, '', 2, '운동'));
  }

  // 연속 훈련
  let run = 0, maxRun = 0;
  for (const d of wk.daily){ run = d.trained ? run + 1 : 0; maxRun = Math.max(maxRun, run); }
  if (maxRun >= 6){
    out.push(A('warn', `${maxRun}일 연속으로 운동했습니다`,
      '근육은 훈련이 아니라 회복하는 동안 자랍니다. 쉬는 날 없이 이어가면 수행능력이 먼저 떨어집니다.',
      '<b>주 1~2일은 완전 휴식</b>으로 잡으세요. 가볍게 걷는 정도는 괜찮습니다.', 7, '운동'));
  }

  // RPE
  const rpes = wk.daily.flatMap(d => d.workouts.map(w => num(w.rpe))).filter(v => v > 0);
  if (rpes.length >= 4){
    const avg = round(sum(rpes) / rpes.length, 1);
    if (avg >= 9){
      out.push(A('warn', `평균 강도(RPE)가 ${avg}로 높습니다`,
        '거의 매 세트를 실패 지점까지 밀고 있습니다. 단기 자극은 크지만 관절과 신경 피로가 빠르게 누적됩니다.',
        '보조 운동은 <b>RPE 7~8</b>에서 멈추고, 복합운동에만 고강도를 쓰세요.', 6, '운동'));
    } else if (avg <= 6){
      out.push(A('info', `평균 강도(RPE)가 ${avg}로 낮습니다`,
        '세트를 여유 있게 끝내고 있습니다. 자극이 부족하면 볼륨이 많아도 성장이 더딥니다.',
        '마지막 세트만이라도 <b>1~2회 남기는 지점</b>까지 밀어보세요.', 5, '운동'));
    }
  }

  // 개인 기록
  const from = wk.dates[0];
  const names = [...new Set(workoutsBetween(from, today()).filter(w => w.type === 'strength').map(w => w.name))];
  const prs = [];
  for (const n of names){
    const all = bestE1rm(n);
    const before = bestE1rm(n, state.workouts.filter(w => w.date < from));
    if (all.value > 0 && all.value > before.value + 0.01) prs.push({ name: n, value: all.value, before: before.value });
  }
  if (prs.length){
    const top = prs.slice(0, 3).map(p => `${p.name} ${p.value}kg`).join(', ');
    out.push(A('good', `이번 주 개인 기록 ${prs.length}개를 세웠습니다`,
      `${top}${prs.length > 3 ? ' 외' : ''}. 추정 1RM 기준으로 이전 최고치를 넘었습니다.`,
      '', 2, '운동'));
  }
  return out;
}

/* ── 체중 ─────────────────────────────────────────────── */
function bodyAdvice(){
  const out = [];
  const p = state.profile;
  const tr = weightTrend(28);

  if (!tr){
    out.push(A('info', '체중 기록이 부족합니다',
      '체중은 하루 변동이 크기 때문에 여러 번 재야 추세가 보입니다. 추세를 알아야 칼로리를 조정할 수 있습니다.',
      '<b>주 2~3회, 아침 공복에</b> 같은 조건으로 재세요.', 5, '체중'));
    return out;
  }

  const per = tr.perWeek;
  const goal = p.goal;
  const idealLo = num(p.weight, 70) * 0.005, idealHi = num(p.weight, 70) * 0.01;
  const dir = per < -0.05 ? '감소' : per > 0.05 ? '증가' : '유지';
  const desc = `최근 4주 추세는 주당 ${per > 0 ? '+' : ''}${per}kg (${dir})입니다.`;

  if (goal === 'cut'){
    if (per > -0.05){
      out.push(A('bad', '감량이 멈췄습니다',
        `${desc} 목표는 감량인데 체중이 줄지 않고 있습니다. 대부분 섭취 칼로리 과소 기록이 원인입니다.`,
        '<b>2주간 모든 끼니를 빠짐없이</b> 기록하고, 그래도 정체면 하루 200kcal를 줄이세요.', 9, '체중'));
    } else if (-per > idealHi * 1.4){
      out.push(A('warn', '감량 속도가 너무 빠릅니다',
        `${desc} 체중의 1%를 크게 넘는 속도입니다. 이 구간에서는 감소분의 상당 부분이 근육입니다.`,
        `주당 <b>${round(idealLo, 2)}~${round(idealHi, 2)}kg</b>이 적정입니다. 칼로리를 조금 올리고 단백질을 유지하세요.`, 8, '체중'));
    } else {
      out.push(A('good', '감량이 적정 속도로 진행 중입니다',
        `${desc} 근육 손실을 최소화하면서 체지방을 줄이는 구간입니다.`, '', 3, '체중'));
    }
  } else if (goal === 'bulk'){
    if (per < 0.05){
      out.push(A('warn', '체중이 늘지 않고 있습니다',
        `${desc} 증량이 목표라면 섭취가 부족한 상태입니다.`,
        '하루 <b>200~300kcal</b>를 탄수화물로 더하세요. 밥 한 공기면 충분합니다.', 8, '체중'));
    } else if (per > 0.5){
      out.push(A('warn', '증량 속도가 빠릅니다',
        `${desc} 주당 0.5kg를 넘으면 늘어나는 무게에서 체지방 비중이 커집니다.`,
        '주당 <b>0.25kg 안팎</b>으로 늦추세요. 하루 200kcal만 줄이면 됩니다.', 6, '체중'));
    } else {
      out.push(A('good', '증량이 적정 속도입니다',
        `${desc} 체지방 증가를 억제하면서 늘리는 구간입니다.`, '', 3, '체중'));
    }
  } else {
    if (Math.abs(per) > 0.25){
      out.push(A('info', '유지 목표인데 체중이 움직이고 있습니다',
        `${desc} 유지가 목표라면 섭취 칼로리를 재점검할 시점입니다.`,
        `${per > 0 ? '하루 150kcal를 줄이세요.' : '하루 150kcal를 더하세요.'}`, 5, '체중'));
    } else {
      out.push(A('good', '체중이 안정적으로 유지되고 있습니다', desc, '', 2, '체중'));
    }
  }
  return out;
}

/* ── 점수 ─────────────────────────────────────────────── */
export function weeklyScore(wk, t){
  const p = state.profile;
  const items = [];
  const add = (label, value, weight) => items.push({ label, value: Math.max(0, Math.min(1, value)), weight });

  add('운동 빈도', wk.trainedDays / Math.max(1, num(p.workoutTarget, 4)), 25);

  const parts = ['가슴','등','어깨','하체'];
  const covered = parts.filter(k => (wk.byMuscle[k] || 0) >= 3).length;
  add('부위 균형', covered / parts.length, 20);

  if (wk.loggedMealDays > 0){
    const dev = Math.abs(wk.avgKcal - t.kcal) / Math.max(1, t.kcal);
    add('칼로리 정확도', 1 - dev / 0.25, 20);
    add('단백질', wk.avgProtein / Math.max(1, t.protein), 20);
  } else {
    add('칼로리 정확도', 0, 20);
    add('단백질', 0, 20);
  }
  add('기록 성실도', wk.loggedMealDays / wk.days, 15);

  const total = sum(items, i => i.value * i.weight) / sum(items, i => i.weight);
  return { score: Math.round(total * 100), items };
}

/* ── 종합 ─────────────────────────────────────────────── */
export function buildAdvice(days = 7){
  const t = targets();
  const wk = rangeSummary(days);
  const prev = rangeSummary(days, addDays(today(), -days));
  const list = [...dietAdvice(wk, t), ...workoutAdvice(wk, prev), ...bodyAdvice()];
  list.sort((a, b) => b.priority - a.priority);
  return { list, week: wk, prev, targets: t, score: weeklyScore(wk, t) };
}

/** 오늘 기준의 짧은 코칭 한 줄 */
export function todayTip(){
  const t = targets();
  const d = rangeSummary(1).daily[0];
  const left = t.kcal - d.kcal;
  const pLeft = t.protein - d.protein;

  if (d.meals.length === 0 && d.workouts.length === 0)
    return { text: '오늘 기록이 아직 없습니다. 아침 체중이나 첫 끼부터 남겨보세요.', tone: 'info' };
  if (pLeft > 30)
    return { text: `단백질이 ${Math.round(pLeft)}g 남았습니다. 닭가슴살 한 팩이나 프로틴 한 스쿱이면 채워집니다.`, tone: 'warn' };
  if (left < -200)
    return { text: `목표보다 ${Math.abs(Math.round(left))}kcal 더 먹었습니다. 저녁은 가볍게 가거나 20분 걷기를 붙이세요.`, tone: 'warn' };
  if (left > 500 && new Date().getHours() >= 19)
    return { text: `아직 ${Math.round(left)}kcal 남았습니다. 너무 적게 먹으면 내일 훈련이 무너집니다.`, tone: 'warn' };
  if (d.trained && pLeft <= 0)
    return { text: '운동과 단백질 목표를 모두 채웠습니다. 오늘은 잘 자는 게 남은 과제입니다.', tone: 'good' };
  if (d.trained)
    return { text: `오늘 ${d.sets}세트를 소화했습니다. 남은 단백질 ${Math.max(0, Math.round(pLeft))}g만 채우면 완벽합니다.`, tone: 'good' };
  return { text: `아직 운동 기록이 없습니다. 남은 칼로리는 ${Math.round(left)}kcal입니다.`, tone: 'info' };
}
