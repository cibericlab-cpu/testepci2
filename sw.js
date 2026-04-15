// ═══════════════════════════════════════════════════════════════════════
// PCI Manager Pro — Service Worker  (sw.js)
// Coloque este arquivo na RAIZ do repositório GitHub Pages
// ═══════════════════════════════════════════════════════════════════════

const CACHE = 'pci-v1';

// Assets que nunca são cacheados (sempre rede direta)
const NO_CACHE = [
    'supabase.co',
    'api.groq.com',
    'api.anthropic.com',
    'brasilapi.com.br',
];

// ── Instalação ──────────────────────────────────────────────────────────
self.addEventListener('install', e => {
    console.log('[SW] Instalado');
    e.waitUntil(
        caches.open(CACHE).then(c => c.addAll(['/', '/index.html']).catch(() => {}))
    );
    self.skipWaiting();
});

// ── Ativação — limpar caches antigos ────────────────────────────────────
self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys()
            .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

// ── Fetch ────────────────────────────────────────────────────────────────
self.addEventListener('fetch', e => {
    const url = new URL(e.request.url);

    // Ignorar não-HTTP e métodos que modificam dados
    if (!e.request.url.startsWith('http')) return;
    if (e.request.method !== 'GET') return;

    // APIs externas → sempre rede, sem cache
    if (NO_CACHE.some(h => url.hostname.includes(h))) return;

    // CDNs (fontes, ícones, libs) → Cache-First
    const isCDN = ['googleapis.com','cdnjs.cloudflare.com','jsdelivr.net','unpkg.com']
        .some(h => url.hostname.includes(h));

    if (isCDN) {
        e.respondWith(
            caches.match(e.request).then(cached => {
                if (cached) return cached;
                return fetch(e.request).then(res => {
                    if (res && res.status === 200)
                        caches.open(CACHE).then(c => c.put(e.request, res.clone()));
                    return res;
                });
            })
        );
        return;
    }

    // index.html e assets locais → Network-First, fallback cache
    e.respondWith(
        fetch(e.request)
            .then(res => {
                if (res && res.status === 200)
                    caches.open(CACHE).then(c => c.put(e.request, res.clone()));
                return res;
            })
            .catch(() => caches.match(e.request).then(c => c || caches.match('/index.html')))
    );
});

// ── Mensagens ────────────────────────────────────────────────────────────
self.addEventListener('message', e => {
    if (e.data?.type === 'SKIP_WAITING') self.skipWaiting();
    if (e.data?.type === 'CLEAR_CACHE')  caches.keys().then(k => k.forEach(n => caches.delete(n)));
});
