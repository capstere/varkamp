const CACHE_NAME = 'varkamp-cache-v1.0.3';
const URLS_TO_CACHE = [
  'index.html',
  'styles.css',
  'script.js',
  'manifest.json',
  'icon-192.png',
  'assets/audio/correct.mp3',
  'assets/audio/wrong.mp3',
  'assets/audio/finish.mp3',
  'assets/audio/p3-chorus-rev.mp3',
  'assets/images/stego.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(URLS_TO_CACHE))
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
    caches.match(event.request).then(response =>
      response || fetch(event.request).catch(() => new Response("⚠️ Offline – resursen kunde inte hämtas.", {
        status: 503,
        statusText: "Offline",
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }
      }))
    )
  );
});
