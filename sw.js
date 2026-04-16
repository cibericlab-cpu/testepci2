/* PCI Manager Pro — Service Worker v1.2
   Fix: Bump cache version to force reload
*/
const CACHE_NAME = 'pci-manager-v2';
const PRE_CACHE = [
  './',
  './index.html',
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(PRE_CACHE).catch(() => {});
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (url.hostname.includes('supabase.co')) return;
  if (url.hostname.includes('groq.com')) return;
  if (url.hostname.includes('anthropic.com')) return;
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (
          !response ||
          response.status !== 200 ||
          response.type === 'opaque' ||
          url.origin !== location.origin
        ) {
          return response;
        }
        const toCache = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, toCache));
        return response;
      }).catch(() => cached || new Response('Offline', { status: 503 }));
    })
  );
});
