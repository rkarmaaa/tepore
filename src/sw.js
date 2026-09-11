// Service worker di Tepore: app disponibile anche offline.
// La versione viene aggiornata da npm run build (scripts/stamp.mjs).
const VERSION = 'tepore-202609111307';
const FONTS = 'tepore-fonts';

const SHELL = [
  './',
  './index.html',
  './css/main.css',
  './js/app.js',
  './js/store.js',
  './js/emotions.js',
  './js/dates.js',
  './js/haptics.js',
  './js/slider.js',
  './js/today.js',
  './js/calendar.js',
  './js/settings.js',
  './js/notebook.js',
  './js/version.js',
  './manifest.webmanifest',
  './icons/icon.svg',
  './icons/apple-touch-icon.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION && k !== FONTS).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // Font Google: cache-first
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.open(FONTS).then(async (cache) => {
        const hit = await cache.match(request);
        if (hit) return hit;
        const res = await fetch(request);
        if (res.ok || res.type === 'opaque') cache.put(request, res.clone());
        return res;
      }),
    );
    return;
  }

  if (url.origin !== location.origin) return;

  // Navigazione: rete prima, poi la shell in cache
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html')),
    );
    return;
  }

  // Risorse: cache subito, aggiornamento in background
  event.respondWith(
    caches.open(VERSION).then(async (cache) => {
      const hit = await cache.match(request, { ignoreSearch: true });
      const net = fetch(request)
        .then((res) => { if (res.ok) cache.put(request, res.clone()); return res; })
        .catch(() => hit);
      return hit || net;
    }),
  );
});
