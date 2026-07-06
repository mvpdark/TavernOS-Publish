// ---------------------------------------------------------------------------
// TavernOS Service Worker
//
// Caching strategy:
//   - Static assets (HTML/JS/CSS/images): cache-first, fall back to network.
//   - API requests (/api/...): network-first, fall back to cache when offline.
//   - Non-GET and SSE/streaming requests are always passed through untouched.
//
// Only registered in production builds — never active during Vite dev (HMR).
// ---------------------------------------------------------------------------

const CACHE_NAME = 'tavernos-v1';

// Pre-cached on install. Other static assets (hashed JS/CSS) are cached
// on first fetch via the cache-first handler below.
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/favicon.ico',
  '/favicon-16.png',
  '/favicon-32.png',
  '/favicon-256.png',
  '/loading.html',
];

// ---------------------------------------------------------------------------
// Install: pre-cache the static shell.
// ---------------------------------------------------------------------------
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      // addAll fails atomically if any single request fails, so we add
      // each asset independently and swallow individual failures.
      Promise.all(
        STATIC_ASSETS.map((url) =>
          cache.add(url).catch(() => {
            /* ignore missing asset */
          }),
        ),
      ),
    ),
  );
  self.skipWaiting();
});

// ---------------------------------------------------------------------------
// Activate: remove stale caches from previous versions, claim clients.
// ---------------------------------------------------------------------------
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// ---------------------------------------------------------------------------
// Fetch: route requests to the appropriate caching strategy.
// ---------------------------------------------------------------------------
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(event.request.url);

  // Only handle GET — POST/PUT/DELETE etc. always go to the network.
  if (request.method !== 'GET') return;

  // Ignore cross-origin requests (chrome-extension, analytics, etc.)
  if (url.origin !== self.location.origin) return;

  // Skip SSE / streaming responses — they must stay live.
  const accept = request.headers.get('accept');
  if (accept && accept.includes('text/event-stream')) return;

  // -- API requests: network-first with cache fallback --------------------
  if (url.pathname.startsWith('/api/')) {
    // Never cache sensitive endpoints (settings, credentials, OAuth)
    const isSensitive = url.pathname.startsWith('/api/settings') ||
                        url.pathname.startsWith('/api/oauth') ||
                        url.pathname.startsWith('/api/storage') ||
                        url.pathname.startsWith('/api/plus');
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache a copy of successful non-sensitive responses for offline use.
          if (response.ok && !isSensitive) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          if (isSensitive) return Response.error();
          return caches.match(request).then((cached) => cached || Response.error());
        }),
    );
    return;
  }

  // -- Static assets: cache-first -----------------------------------------
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          if (response.ok && response.type === 'basic') {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() =>
          // Last-resort fallback to the cached app shell for navigation requests.
          request.mode === 'navigate'
            ? caches.match('/index.html')
            : Response.error(),
        );
    }),
  );
});
