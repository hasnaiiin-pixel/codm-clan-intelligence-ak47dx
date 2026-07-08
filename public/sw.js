const CODM_CACHE = 'clan-manager-pwa-v12-0-definitive-excel-photo-sql-import';
const CODM_OFFLINE_URL = '/offline.html';
const CORE_ASSETS = [CODM_OFFLINE_URL, '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png', '/icons/icon-maskable-512.png'];

async function deleteOldCodmCaches() {
  const keys = await caches.keys();
  await Promise.all(
    keys
      .filter((key) => (key.startsWith('codm-') || key.startsWith('clan-manager-pwa-')) && key !== CODM_CACHE)
      .map((key) => caches.delete(key))
  );
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CODM_CACHE)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    deleteOldCodmCaches()
      .then(() => self.clients.claim())
      .then(async () => {
        const clientsList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        for (const client of clientsList) client.postMessage({ type: 'CODM_SW_UPDATED', version: CODM_CACHE });
      })
  );
});

async function networkFirst(request, fallbackUrl) {
  try {
    const response = await fetch(request, { cache: 'no-store' });
    if (response && response.ok && request.method === 'GET') {
      const origin = new URL(request.url).origin;
      if (origin === self.location.origin && !new URL(request.url).pathname.startsWith('/api/')) {
        const copy = response.clone();
        caches.open(CODM_CACHE).then((cache) => cache.put(request, copy)).catch(() => undefined);
      }
    }
    return response;
  } catch (_) {
    return (await caches.match(request)) || (fallbackUrl ? caches.match(fallbackUrl) : undefined) || Response.error();
  }
}

async function cacheFirstStatic(request) {
  const cached = await caches.match(request);
  if (cached) {
    fetch(request).then((response) => {
      if (response && response.ok) caches.open(CODM_CACHE).then((cache) => cache.put(request, response.clone())).catch(() => undefined);
    }).catch(() => undefined);
    return cached;
  }
  const response = await fetch(request);
  if (response && response.ok) {
    const copy = response.clone();
    caches.open(CODM_CACHE).then((cache) => cache.put(request, copy)).catch(() => undefined);
  }
  return response;
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // API e dati dinamici: mai cache. Serve soprattutto per PWA installata, eventi e notifiche.
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(request, { cache: 'no-store' }));
    return;
  }

  // Pagine e chunk Next.js: network-only. Evita codice vecchio nella PWA installata.
  if (request.mode === 'navigate' || url.pathname.startsWith('/_next/')) {
    event.respondWith(fetch(request, { cache: 'no-store' }).catch(() => caches.match(CODM_OFFLINE_URL)));
    return;
  }

  // Icone e asset statici: cache-first con aggiornamento in background.
  if (url.pathname.startsWith('/icons/') || url.pathname.startsWith('/assets/') || url.pathname === '/manifest.webmanifest' || url.pathname === CODM_OFFLINE_URL) {
    event.respondWith(cacheFirstStatic(request));
    return;
  }

  event.respondWith(networkFirst(request, CODM_OFFLINE_URL));
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
  if (event.data && event.data.type === 'CLEAR_CODM_CACHES') {
    event.waitUntil(deleteOldCodmCaches());
  }
});

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (_) {
    payload = { body: event.data ? event.data.text() : 'Nuova notifica CODM.' };
  }

  const title = payload.title || 'CLAN MANAGER';
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
