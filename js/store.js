import { uid, today, ymd, sum, round, clamp, num, addDays, lastDays } from './utils.js';
import { findExercise } from './data/exercises.js';

const KEY = 'fitlog.v1';

const DEFAULT_PROFILE = {
  sex: 'male',          // male | female
  age: 30,
  height: 175,          // cm
  weight: 70,           // kg
  activity: 1.375,      // 활동계수
  goal: 'cut',          // cut | maintain | bulk
  rate: 0.5,            // 주당 체중 변화 목표 kg
  proteinPerKg: 1.8,
  fatPct: 0.25,         // 총 칼로리 중 지방 비율
  restTarget: 2,        // 주당 목표 휴식일
  workoutTarget: 4,     // 주당 목표 운동 횟수
  kcalOverride: 0,      // 0이면 자동 계산
};

const EMPTY = {
  version: 1,
  profile: { ...DEFAULT_PROFILE },
  workouts: [],   // {id,date,name,muscle,type,sets:[{w,r}],minutes,distance,rpe,note}
  meals: [],      // {id,date,slot,name,unit,qty,kcal,c,p,f}
  weights: [],    // {date,kg}
  createdAt: today(),
};

/* ── 저장소 ───────────────────────────────────────────── */
function load(){
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(EMPTY);
    const data = JSON.parse(raw);
    return {
      ...structuredClone(EMPTY),
      ...data,
      profile: { ...DEFAULT_PROFILE, ...(data.profile || {}) },
    };
  } catch (e) {
    console.warn('저장된 데이터를 읽지 못했습니다', e);
    return structuredClone(EMPTY);
  }
}

export const state = load();

const subs = new Set();
export const subscribe = (fn) => { subs.add(fn); return () => subs.delete(fn); };

export function save(){
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    console.error('저장 실패', e);
  }
  subs.forEach(fn => fn(state));
}

/* ── 쓰기 ─────────────────────────────────────────────── */
export function addWorkout(w){
  const rec = { id: uid(), date: today(), sets: [], minutes: 0, distance: 0, rpe: 0, note: '', ...w };
  state.workouts.push(rec);
  save();
  return rec;
}
export function updateWorkout(id, patch){
  const w = state.workouts.find(x => x.id === id);
  if (!w) return;
  Object.assign(w, patch);
  save();
}
export function removeWorkout(id){
  state.workouts = state.workouts.filter(w => w.id !== id);
  save();
}

export function addMeal(m){
  const rec = { id: uid(), date: today(), slot: '점심', qty: 1, ...m };
  state.meals.push(rec);
  save();
  return rec;
}
export function removeMeal(id){
  state.meals = state.meals.filter(m => m.id !== id);
  save();
}

export function setWeight(kg, date = today()){
  const v = round(num(kg), 1);
  if (!v) return;
  const found = state.weights.find(w => w.date === date);
  if (found) found.kg = v; else state.weights.push({ date, kg: v });
  state.weights.sort((a, b) => a.date < b.date ? -1 : 1);
  state.profile.weight = v;
  save();
}
export function removeWeight(date){
  state.weights = state.weights.filter(w => w.date !== date);
  save();
}

export function setProfile(patch){
  Object.assign(state.profile, patch);
  save();
}

export function resetAll(){
  const fresh = structuredClone(EMPTY);
  Object.keys(state).forEach(k => delete state[k]);
  Object.assign(state, fresh);
  save();
}

export function importData(json){
  const data = JSON.parse(json);
  if (!data || typeof data !== 'object' || !Array.isArray(data.workouts)) {
    throw new Error('형식이 올바르지 않습니다');
  }
  const fresh = structuredClone(EMPTY);
  Object.keys(state).forEach(k => delete state[k]);
  Object.assign(state, fresh, data, { profile: { ...DEFAULT_PROFILE, ...(data.profile || {}) } });
  save();
}

export const exportData = () => JSON.stringify(state, null, 2);

/* ── 목표 계산 ─────────────────────────────────────────── */
/** Mifflin-St Jeor 기초대사량 */
export function bmr(p = state.profile){
  const base = 10 * num(p.weight, 70) + 6.25 * num(p.height, 175) - 5 * num(p.age, 30);
  return Math.round(base + (p.sex === 'female' ? -161 : 5));
}
/** 활동대사량 */
export const tdee = (p = state.profile) => Math.round(bmr(p) * num(p.activity, 1.375));

/** 하루 목표 칼로리와 매크로 */
export function targets(p = state.profile){
  const t = tdee(p);
  let kcal;
  if (num(p.kcalOverride) > 0) {
    kcal = Math.round(num(p.kcalOverride));
  } else {
    // 체중 1kg ≈ 7700kcal → 주당 목표 변화량을 하루 단위로 환산
    const delta = Math.round(num(p.rate, 0.5) * 7700 / 7);
    kcal = p.goal === 'cut' ? t - delta : p.goal === 'bulk' ? t + delta : t;
    kcal = Math.max(kcal, Math.round(bmr(p) * 1.05)); // 기초대사량 아래로는 내리지 않는다
  }
  const protein = Math.round(num(p.weight, 70) * num(p.proteinPerKg, 1.8));
  const fat     = Math.round(kcal * num(p.fatPct, 0.25) / 9);
  const carb    = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
  return { kcal, protein, carb, fat, tdee: t, bmr: bmr(p) };
}

/* ── 조회 ─────────────────────────────────────────────── */
export const workoutsOn = (date) => state.workouts.filter(w => w.date === date);
export const mealsOn    = (date) => state.meals.filter(m => m.date === date);

export const workoutsBetween = (from, to) => state.workouts.filter(w => w.date >= from && w.date <= to);
export const mealsBetween    = (from, to) => state.meals.filter(m => m.date >= from && m.date <= to);

/** 세트 볼륨. 맨몸 운동은 체중의 일부를 부하로 계산한다. */
export function workoutVolume(w, bodyKg = num(state.profile.weight, 70)){
  if (w.type !== 'strength') return 0;
  const meta = findExercise(w.name);
  const bodyLoad = meta?.body ? bodyKg * 0.65 : 0;
  return sum(w.sets, s => (num(s.w) + bodyLoad) * num(s.r));
}

/** 에플리 공식 추정 1RM */
export const e1rm = (weight, reps) => {
  const w = num(weight), r = num(reps);
  if (!w || !r) return 0;
  return round(w * (1 + r / 30), 1);
};

export function bestE1rm(name, records = state.workouts){
  let best = 0, at = null;
  for (const w of records){
    if (w.name !== name || w.type !== 'strength') continue;
    for (const s of w.sets){
      const v = e1rm(s.w, s.r);
      if (v > best) { best = v; at = w.date; }
    }
  }
  return { value: best, date: at };
}

/** 운동으로 소모한 추정 칼로리 */
export function burnedKcal(w, bodyKg = num(state.profile.weight, 70)){
  const meta = findExercise(w.name);
  if (w.type === 'cardio'){
    const met = meta?.met ?? 6;
    return Math.round(met * 3.5 * bodyKg / 200 * num(w.minutes));
  }
  const minutes = num(w.minutes) || w.sets.length * 3;
  return Math.round(5.0 * 3.5 * bodyKg / 200 * minutes);
}

/** 하루 요약 */
export function daySummary(date){
  const meals = mealsOn(date);
  const ws = workoutsOn(date);
  const kcal = sum(meals, m => m.kcal * (m.qty ?? 1));
  const c = sum(meals, m => m.c * (m.qty ?? 1));
  const p = sum(meals, m => m.p * (m.qty ?? 1));
  const f = sum(meals, m => m.f * (m.qty ?? 1));
  const volume  = sum(ws, w => workoutVolume(w));
  const sets    = sum(ws, w => w.type === 'strength' ? w.sets.length : 0);
  const cardio  = sum(ws, w => w.type === 'cardio' ? num(w.minutes) : 0);
  const burned  = sum(ws, w => burnedKcal(w));
  const weight  = state.weights.find(w => w.date === date)?.kg ?? null;
  return {
    date, meals, workouts: ws,
    kcal: Math.round(kcal), carb: Math.round(c), protein: Math.round(p), fat: Math.round(f),
    volume: Math.round(volume), sets, cardio, burned, weight,
    trained: ws.length > 0,
  };
}

/** 기간 요약 */
export function rangeSummary(days = 7, end = today()){
  const dates = lastDays(days, end);
  const daily = dates.map(daySummary);
  const loggedMealDays = daily.filter(d => d.meals.length > 0);
  const trainedDays = daily.filter(d => d.trained);
  const byMuscle = {};
  for (const d of daily){
    for (const w of d.workouts){
      if (w.type !== 'strength') continue;
      byMuscle[w.muscle] = (byMuscle[w.muscle] || 0) + w.sets.length;
    }
  }
  return {
    dates, daily, byMuscle,
    days,
    trainedDays: trainedDays.length,
    restDays: days - trainedDays.length,
    totalVolume: sum(daily, d => d.volume),
    totalSets: sum(daily, d => d.sets),
    cardioMin: sum(daily, d => d.cardio),
    burned: sum(daily, d => d.burned),
    loggedMealDays: loggedMealDays.length,
    avgKcal:    loggedMealDays.length ? Math.round(sum(loggedMealDays, d => d.kcal) / loggedMealDays.length) : 0,
    avgProtein: loggedMealDays.length ? Math.round(sum(loggedMealDays, d => d.protein) / loggedMealDays.length) : 0,
    avgCarb:    loggedMealDays.length ? Math.round(sum(loggedMealDays, d => d.carb) / loggedMealDays.length) : 0,
    avgFat:     loggedMealDays.length ? Math.round(sum(loggedMealDays, d => d.fat) / loggedMealDays.length) : 0,
  };
}

/** 연속 기록일 (오늘 또는 어제부터 거슬러 올라가며) */
export function streak(){
  const hasLog = (d) => workoutsOn(d).length > 0 || mealsOn(d).length > 0;
  let cur = today();
  if (!hasLog(cur)) cur = addDays(cur, -1);
  let n = 0;
  while (hasLog(cur) && n < 400){ n++; cur = addDays(cur, -1); }
  return n;
}

/** 최근에 쓴 운동/음식 (빠른 입력용) */
export function recentExercises(limit = 8){
  const seen = new Map();
  for (let i = state.workouts.length - 1; i >= 0 && seen.size < limit; i--){
    const w = state.workouts[i];
    if (!seen.has(w.name)) seen.set(w.name, w);
  }
  return [...seen.values()];
}
export function recentFoods(limit = 8){
  const seen = new Map();
  for (let i = state.meals.length - 1; i >= 0 && seen.size < limit; i--){
    const m = state.meals[i];
    if (!seen.has(m.name)) seen.set(m.name, m);
  }
  return [...seen.values()];
}

/** 체중 추세: 최근 n일 선형 회귀 기울기 (kg/주) */
export function weightTrend(days = 28){
  const from = addDays(today(), -days);
  const pts = state.weights.filter(w => w.date >= from);
  if (pts.length < 2) return null;
  const x0 = new Date(pts[0].date).getTime();
  const xs = pts.map(p => (new Date(p.date).getTime() - x0) / 86400000);
  const ys = pts.map(p => p.kg);
  const n = xs.length;
  const mx = sum(xs) / n, my = sum(ys) / n;
  let a = 0, b = 0;
  for (let i = 0; i < n; i++){ a += (xs[i] - mx) * (ys[i] - my); b += (xs[i] - mx) ** 2; }
  if (!b) return null;
  return {
    perWeek: round(a / b * 7, 2),
    first: pts[0], last: pts[pts.length - 1], count: n,
  };
}

export { DEFAULT_PROFILE, clamp };
