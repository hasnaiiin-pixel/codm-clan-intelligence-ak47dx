const CACHE_NAME = 'codm-mirza-pwa-v7-0-full';
const OFFLINE_URL = '/offline.html';
const CORE_ASSETS = [
  '/',
  '/dashboard',
  '/events',
  '/notifications',
  OFFLINE_URL,
  '/manifest.webmanifest',
  '/assets/mirza-app-icon-192.png',
  '/assets/mirza-app-icon-512.png',
  '/assets/mirza-apple-touch-icon.png',
  '/assets/mirza-developer-logo.png',
  '/assets/ak47dx-logo.jpeg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/_next/webpack-hmr')) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match(OFFLINE_URL)))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => cached);
      return cached || networkFetch;
    })
  );
});

self.addEventListener('push', (event) => {
  let data = { title: 'CODM Clan Intelligence', body: 'Nuova notifica disponibile.', url: '/notifications' };
  try { data = { ...data, ...event.data.json() }; } catch {}
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/assets/mirza-app-icon-192.png',
      badge: '/assets/mirza-app-icon-192.png',
      data: { url: data.url || '/notifications' },
      tag: data.tag || 'codm-mirza-notification'
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification?.data?.url || '/notifications';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});
