// Service worker di Tepore: app disponibile anche offline.
// La versione viene aggiornata da npm run build (scripts/stamp.mjs).
const VERSION = 'tepore-202609111307';

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
  './js/sheet.js',
  './js/config.js',
  './js/dropbox.js',
  './js/backup.js',
  './js/reminder.js',
  './js/version.js',
  './fonts/fraunces-normal-latin.woff2',
  './fonts/fraunces-italic-latin.woff2',
  './fonts/figtree-normal-latin.woff2',
  './manifest.webmanifest',
  './icons/icon.svg',
  './icons/apple-touch-icon.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/favicon-32.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    // allSettled: se un file manca, il resto della shell resta comunque offline
    await Promise.allSettled(SHELL.map((url) => cache.add(url)));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

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

// Tocco sul promemoria serale: riporta all'app invece di aprire una scheda nuova
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    const open = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of open) {
      if ('focus' in client) return client.focus();
    }
    return self.clients.openWindow('./');
  })());
});
