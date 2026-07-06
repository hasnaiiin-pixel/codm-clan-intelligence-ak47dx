const CODM_CACHE = 'codm-ak47dx-pwa-v7-3-events-cloud-notifications-icon-final';
const CODM_OFFLINE_URL = '/offline.html';
const CORE_ASSETS = ['/', CODM_OFFLINE_URL, '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CODM_CACHE)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CODM_CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match(CODM_OFFLINE_URL)));
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        const origin = new URL(request.url).origin;
        if (response.ok && origin === self.location.origin) {
          const copy = response.clone();
          caches.open(CODM_CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    })
  );
});

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (_) {
    payload = { body: event.data ? event.data.text() : 'Nuova notifica CODM.' };
  }

  const title = payload.title || 'CODM Clan';
  const options = {
    body: payload.body || 'Nuovo aggiornamento disponibile.',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: payload.data || { url: '/' }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification?.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const existing = clientList.find((client) => 'focus' in client);
      if (existing) return existing.focus();
      if (clients.openWindow) return clients.openWindow(url);
      return undefined;
    })
  );
});
