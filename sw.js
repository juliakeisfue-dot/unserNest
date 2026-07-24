// sw.js
const CACHE_NAME = 'unser-nest-v25';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './externesBackup/unser-nest-backup-2026-07-13T06-03-50-950Z.json',
  './icons/192x192.png',
  './icons/512x512.png',
  './modules/app/app.js',
  './modules/core/config.js',
  './modules/core/storage.js',
  './modules/core/backup.js',
  './modules/core/sync.js',
  './modules/core/users.js',
  './modules/core/utils.js',
  './modules/core/changelog.js',
  './modules/core/tracker.js',
  './modules/core/documentation.js',
  './modules/core/googleTasks.js',
  './modules/domains/shopping/manager.js',
  './modules/domains/shopping/ui.js',
  './modules/domains/inventory/manager.js',
  './modules/domains/inventory/ui.js',
  './modules/domains/quests/manager.js',
  './modules/domains/quests/ui.js',
  './modules/domains/tasks/ui.js',
  './modules/domains/recipes/manager.js',
  './modules/domains/recipes/ui.js',
  './modules/domains/mealplan/manager.js',
  './modules/domains/mealplan/ui.js',
  './modules/domains/reisekasse/manager.js',
  './modules/domains/reisekasse/ui.js',
  './modules/domains/rewards/ui.js',
  './modules/domains/chronicle/manager.js',
  './modules/domains/chronicle/ui.js',
  './modules/domains/bill/manager.js',
  './modules/domains/bill/ui.js',
  './modules/domains/help/manager.js',
  './modules/domains/help/ui.js',
  './modules/domains/analytics/manager.js',
  './modules/domains/analytics/ui.js',
  './modules/domains/documentation/manager.js',
  './modules/domains/documentation/ui.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      const results = await Promise.allSettled(
        ASSETS.map(asset => cache.add(asset))
      );

      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.warn('[SW] Asset konnte nicht gecacht werden:', ASSETS[index], result.reason);
        }
      });
    })
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
  const url = event.request.url;

  // Externe URLs (JSONBin, CDN, etc.) NIEMALS cachen – immer direkt ans Netz.
  // Sonst wird die erste API-Antwort gecacht und alle Geräte bekommen
  // beim nächsten Sync veraltete Daten zurück.
  if (!url.startsWith(self.location.origin)) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Eigene App-Assets: Cache-first, Fallback auf Netz
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});
