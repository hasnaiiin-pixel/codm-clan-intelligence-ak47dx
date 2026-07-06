const CACHE_NAME = 'clan-manager-mirza-v6-9-stable';
const CORE_ASSETS = [
  '/',
  '/dashboard',
  '/manifest.webmanifest',
  '/assets/mirza-app-icon-192.png',
  '/assets/mirza-app-icon-512.png',
  '/assets/mirza-developer-logo.png',
  '/assets/ak47dx-logo.jpeg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(fetch(request).then((response) => {
    const clone = response.clone();
    caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
    return response;
  }).catch(() => caches.match(request).then((cached) => cached || caches.match('/dashboard'))));
});
