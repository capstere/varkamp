const CACHE_NAME = 'varkamp-cache-v1.0.7';
const URLS_TO_CACHE = [
  'index.html',
  'offline.html',
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

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(URLS_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const req = e.request;
  // Navigationsförfrågningar → offline.html
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(c=>c.put(req, copy));
          return res;
        })
        .catch(() => caches.match('offline.html'))
    );
    return;
  }
  // Övrigt: cache-first med nätfallback
  e.respondWith(
    caches.match(req).then(r => r || fetch(req))
      .catch(() => new Response("⚠️ Offline – resursen kunde inte hämtas.", {
        status: 503, statusText: "Offline", headers:{'Content-Type':'text/plain'}
      }))
  );
});

self.addEventListener('message', e => {
  if (e.data.type === 'SKIP_WAITING') self.skipWaiting();
});
