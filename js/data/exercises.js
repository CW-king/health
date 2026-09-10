// 운동 사전. type: 'strength'(무게×횟수) | 'cardio'(시간/거리)
// met: 유산소 칼로리 추정용 대사당량
export const MUSCLES = ['가슴','등','어깨','하체','팔','코어','유산소'];

export const MUSCLE_COLOR = {
  가슴:'--rose', 등:'--blue', 어깨:'--amber',
  하체:'--accent', 팔:'--violet', 코어:'--text-dim', 유산소:'--blue',
};

export const EXERCISES = [
  // 가슴
  { name:'벤치프레스',          muscle:'가슴', type:'strength', comp:true },
  { name:'인클라인 벤치프레스',  muscle:'가슴', type:'strength', comp:true },
  { name:'덤벨 프레스',         muscle:'가슴', type:'strength', comp:true },
  { name:'인클라인 덤벨 프레스', muscle:'가슴', type:'strength', comp:true },
  { name:'체스트 프레스 머신',   muscle:'가슴', type:'strength' },
  { name:'딥스',               muscle:'가슴', type:'strength', comp:true, body:true },
  { name:'푸시업',             muscle:'가슴', type:'strength', body:true },
  { name:'케이블 플라이',       muscle:'가슴', type:'strength' },
  { name:'덤벨 플라이',         muscle:'가슴', type:'strength' },
  { name:'펙덱 플라이',         muscle:'가슴', type:'strength' },

  // 등
  { name:'데드리프트',          muscle:'등', type:'strength', comp:true },
  { name:'루마니안 데드리프트',  muscle:'등', type:'strength', comp:true },
  { name:'풀업',               muscle:'등', type:'strength', comp:true, body:true },
  { name:'친업',               muscle:'등', type:'strength', comp:true, body:true },
  { name:'랫풀다운',           muscle:'등', type:'strength', comp:true },
  { name:'바벨로우',           muscle:'등', type:'strength', comp:true },
  { name:'덤벨로우',           muscle:'등', type:'strength', comp:true },
  { name:'티바로우',           muscle:'등', type:'strength', comp:true },
  { name:'시티드 케이블 로우',   muscle:'등', type:'strength', comp:true },
  { name:'페이스풀',           muscle:'등', type:'strength' },
  { name:'백 익스텐션',        muscle:'등', type:'strength', body:true },

  // 어깨
  { name:'오버헤드 프레스',     muscle:'어깨', type:'strength', comp:true },
  { name:'덤벨 숄더프레스',     muscle:'어깨', type:'strength', comp:true },
  { name:'아놀드 프레스',       muscle:'어깨', type:'strength', comp:true },
  { name:'사이드 레터럴 레이즈', muscle:'어깨', type:'strength' },
  { name:'프론트 레이즈',       muscle:'어깨', type:'strength' },
  { name:'리어델트 플라이',     muscle:'어깨', type:'strength' },
  { name:'업라이트 로우',       muscle:'어깨', type:'strength' },
  { name:'슈러그',             muscle:'어깨', type:'strength' },

  // 하체
  { name:'스쿼트',             muscle:'하체', type:'strength', comp:true },
  { name:'프론트 스쿼트',       muscle:'하체', type:'strength', comp:true },
  { name:'레그프레스',         muscle:'하체', type:'strength', comp:true },
  { name:'런지',               muscle:'하체', type:'strength', comp:true },
  { name:'불가리안 스플릿 스쿼트', muscle:'하체', type:'strength', comp:true },
  { name:'레그 익스텐션',       muscle:'하체', type:'strength' },
  { name:'레그 컬',            muscle:'하체', type:'strength' },
  { name:'힙 쓰러스트',        muscle:'하체', type:'strength', comp:true },
  { name:'카프레이즈',         muscle:'하체', type:'strength' },
  { name:'고블릿 스쿼트',       muscle:'하체', type:'strength', comp:true },
  { name:'스티프 데드리프트',    muscle:'하체', type:'strength', comp:true },

  // 팔
  { name:'바벨 컬',            muscle:'팔', type:'strength' },
  { name:'덤벨 컬',            muscle:'팔', type:'strength' },
  { name:'해머 컬',            muscle:'팔', type:'strength' },
  { name:'프리처 컬',          muscle:'팔', type:'strength' },
  { name:'케이블 푸시다운',     muscle:'팔', type:'strength' },
  { name:'라잉 트라이셉스 익스텐션', muscle:'팔', type:'strength' },
  { name:'오버헤드 트라이셉스 익스텐션', muscle:'팔', type:'strength' },
  { name:'클로즈그립 벤치프레스', muscle:'팔', type:'strength', comp:true },
  { name:'킥백',               muscle:'팔', type:'strength' },

  // 코어
  { name:'플랭크',             muscle:'코어', type:'strength', body:true, timed:true },
  { name:'크런치',             muscle:'코어', type:'strength', body:true },
  { name:'행잉 레그레이즈',     muscle:'코어', type:'strength', body:true },
  { name:'러시안 트위스트',     muscle:'코어', type:'strength' },
  { name:'케이블 크런치',       muscle:'코어', type:'strength' },
  { name:'마운틴 클라이머',     muscle:'코어', type:'strength', body:true },
  { name:'데드버그',           muscle:'코어', type:'strength', body:true },
  { name:'사이드 플랭크',       muscle:'코어', type:'strength', body:true, timed:true },

  // 유산소
  { name:'걷기',        muscle:'유산소', type:'cardio', met:3.5 },
  { name:'빠르게 걷기',  muscle:'유산소', type:'cardio', met:4.8 },
  { name:'런닝머신',     muscle:'유산소', type:'cardio', met:8.5 },
  { name:'야외 러닝',    muscle:'유산소', type:'cardio', met:9.0 },
  { name:'사이클',       muscle:'유산소', type:'cardio', met:7.0 },
  { name:'실내자전거',   muscle:'유산소', type:'cardio', met:6.8 },
  { name:'일립티컬',     muscle:'유산소', type:'cardio', met:5.5 },
  { name:'로잉머신',     muscle:'유산소', type:'cardio', met:7.5 },
  { name:'계단오르기',   muscle:'유산소', type:'cardio', met:8.8 },
  { name:'수영',        muscle:'유산소', type:'cardio', met:8.0 },
  { name:'줄넘기',       muscle:'유산소', type:'cardio', met:11.0 },
  { name:'등산',        muscle:'유산소', type:'cardio', met:6.5 },
  { name:'배드민턴',     muscle:'유산소', type:'cardio', met:5.5 },
  { name:'축구',        muscle:'유산소', type:'cardio', met:7.0 },
  { name:'농구',        muscle:'유산소', type:'cardio', met:6.5 },
  { name:'테니스',      muscle:'유산소', type:'cardio', met:7.3 },
  { name:'요가',        muscle:'유산소', type:'cardio', met:2.8 },
  { name:'필라테스',    muscle:'유산소', type:'cardio', met:3.2 },
  { name:'스트레칭',    muscle:'유산소', type:'cardio', met:2.3 },
  { name:'HIIT',       muscle:'유산소', type:'cardio', met:10.0 },
];

export function findExercise(name){
  return EXERCISES.find(e => e.name === name) || null;
}
