/* PCI Manager Pro — Service Worker v1.1
   Fix: Response body lido apenas uma vez (evita "clone" error)
*/

const CACHE_NAME = 'pci-manager-v1';

// Recursos para cachear na instalação
const PRE_CACHE = [
  './',
  './index.html',
];

// ── Instalação ──────────────────────────────────────────────
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(PRE_CACHE).catch(() => {
        // Falha silenciosa se algum recurso não existir ainda
      });
    })
  );
});

// ── Ativação ─────────────────────────────────────────────────
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

// ── Fetch ────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Requisições ao Supabase: NUNCA interceptar — deixa passar direto
  // (evita o erro "Failed to execute 'clone' on 'Response': body already used")
  if (url.hostname.includes('supabase.co')) {
    return; // passa direto para a rede sem qualquer interceptação
  }

  // Para requisições POST/PUT/DELETE: nunca cachear
  if (event.request.method !== 'GET') {
    return;
  }

  // Estratégia: Cache First para recursos estáticos, Network First para o resto
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).then(response => {
        // Só cacheia respostas válidas de mesma origem
        if (
          !response ||
          response.status !== 200 ||
          response.type === 'opaque' ||
          url.origin !== location.origin
        ) {
          return response;
        }

        // Clonar ANTES de qualquer leitura do body
        const toCache = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, toCache));
        return response;
      }).catch(() => cached || new Response('Offline', { status: 503 }));
    })
  );
});
