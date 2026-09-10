// 오프라인 캐시. 파일을 바꾸면 CACHE 이름의 버전을 올린다.
const CACHE = 'fitlog-v1';
const ASSETS = [
  './', './index.html', './manifest.webmanifest',
  './css/app.css',
  './js/app.js', './js/utils.js', './js/store.js', './js/advice.js', './js/charts.js',
  './js/data/exercises.js', './js/data/foods.js',
  './js/views/common.js', './js/views/today.js', './js/views/workout.js',
  './js/views/diet.js', './js/views/review.js', './js/views/more.js',
  './icons/icon-192.png', './icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// 네트워크 우선, 실패하면 캐시 (배포 직후에도 최신 파일을 받도록)
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request).then(r => r || caches.match('./index.html')))
  );
});
