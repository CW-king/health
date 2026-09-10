import { $, $$ } from './utils.js';
import { todayView } from './views/today.js';
import { workoutView } from './views/workout.js';
import { dietView } from './views/diet.js';
import { reviewView } from './views/review.js';
import { moreView } from './views/more.js';

const ROUTES = {
  today:   todayView,
  workout: workoutView,
  diet:    dietView,
  review:  reviewView,
  more:    moreView,
};

const currentKey = () => {
  const key = (location.hash.replace(/^#\/?/, '') || 'today').split('/')[0];
  return ROUTES[key] ? key : 'today';
};

let scrollMemo = {};

function render(keepScroll = false){
  const key = currentKey();
  const view = ROUTES[key];
  const host = $('#view');
  const y = window.scrollY;

  $('#view-title').textContent = view.title;
  $('#topbar-actions').innerHTML = view.actions?.() ?? '';
  host.innerHTML = view.render();
  view.mount?.(host, () => render(true));

  $$('#tabbar a').forEach(a => a.classList.toggle('on', a.dataset.tab === key));

  if (keepScroll) window.scrollTo(0, y);
  else window.scrollTo(0, scrollMemo[key] ?? 0);
}

window.addEventListener('hashchange', () => {
  scrollMemo[currentKey()] = 0;
  render();
});
window.addEventListener('scroll', () => { scrollMemo[currentKey()] = window.scrollY; }, { passive: true });

// 다른 탭에서 기록이 바뀌면 화면을 맞춘다
window.addEventListener('storage', (e) => { if (e.key === 'fitlog.v1') location.reload(); });

render();

if ('serviceWorker' in navigator && location.protocol !== 'file:'){
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
