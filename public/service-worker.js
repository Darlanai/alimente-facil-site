/* Alimente Fácil - Service Worker (offline-first app shell + runtime caching)
   - Precache: app shell (HTML/CSS/JS/manifest/icons/offline)
   - Runtime cache: images (cache-first), fonts/css/js (stale-while-revalidate)
   - Videos: network-only (avoid huge caches)
*/
const VERSION = '2026.02.14.1';
const APP_SHELL_CACHE = `af-app-shell-${VERSION}`;
const RUNTIME_CACHE = `af-runtime-${VERSION}`;

const APP_SHELL = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/manifest.webmanifest',
  '/offline.html',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(APP_SHELL_CACHE);
    await cache.addAll(APP_SHELL);
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => {
      if (![APP_SHELL_CACHE, RUNTIME_CACHE].includes(k)) return caches.delete(k);
    }));
    self.clients.claim();
  })());
});

function isNavigation(request) {
  return request.mode === 'navigate' ||
    (request.method === 'GET' && request.headers.get('accept')?.includes('text/html'));
}

function isVideo(url) {
  return url.pathname.endsWith('.mp4') || url.pathname.endsWith('.webm') || url.pathname.endsWith('.mov');
}

async function cacheFirst(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const res = await fetch(request);
  if (res.ok) cache.put(request, res.clone());
  return res;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request).then((res) => {
    if (res.ok) cache.put(request, res.clone());
    return res;
  }).catch(() => null);
  return cached || (await fetchPromise) || cached;
}

async function networkFirst(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  try {
    const res = await fetch(request);
    if (res.ok) cache.put(request, res.clone());
    return res;
  } catch (e) {
    const cached = await cache.match(request);
    return cached || caches.match('/offline.html');
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Only handle same-origin
  if (url.origin !== self.location.origin) return;

  // Videos: avoid caching (huge)
  if (isVideo(url)) {
    event.respondWith(fetch(request));
    return;
  }

  // Navigations: network-first, fallback to cached index/offline
  if (isNavigation(request)) {
    event.respondWith((async () => {
      try {
        // If index is in cache, we still prefer network for freshness
        const res = await fetch(request);
        // If user is offline, fetch will throw
        return res;
      } catch (e) {
        // SPA fallback
        const cachedIndex = await caches.match('/index.html');
        return cachedIndex || caches.match('/offline.html');
      }
    })());
    return;
  }

  // Static assets
  const dest = request.destination;
  if (dest === 'style' || dest === 'script' || dest === 'font') {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  if (dest === 'image') {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Default: try SWR
  event.respondWith(staleWhileRevalidate(request));
});
