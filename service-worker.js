const CACHE_NAME = 'varkamp-v1';
const URLS_TO_CACHE = [
  '/varkamp/',
  '/varkamp/index.html',
  '/varkamp/styles.css',
  '/varkamp/script.js',
  '/varkamp/manifest.json',
  '/varkamp/icon-192.png',
  '/varkamp/assets/audio/correct.mp3',
  '/varkamp/assets/audio/wrong.mp3',
  '/varkamp/assets/audio/finish.mp3',
  '/varkamp/assets/audio/p3-chorus-rev.mp3',
  '/varkamp/assets/images/stego.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(URLS_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});
