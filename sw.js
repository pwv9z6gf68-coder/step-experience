// Mr. Adrian's STEP Experience — Service Worker
// Caches all assets for offline play

const CACHE_NAME = 'step-experience-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/app.jsx',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  'https://unpkg.com/react@18/umd/react.production.min.js',
  'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js',
  'https://unpkg.com/@babel/standalone@7.23.6/babel.min.js',
];

// Install — cache everything
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching app assets');
      // Cache local assets immediately; CDN assets best-effort
      const local = ['/', '/index.html', '/app.jsx', '/manifest.json'];
      const cdn   = ASSETS.filter(a => a.startsWith('https://'));
      return cache.addAll(local).then(() =>
        Promise.allSettled(cdn.map(url =>
          fetch(url).then(r => cache.put(url, r)).catch(() => {})
        ))
      );
    })
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — cache-first, fall back to network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        // Cache fresh responses for same-origin and CDN
        if (response && response.status === 200) {
          const url = event.request.url;
          if (url.includes(self.location.origin) || url.includes('unpkg.com')) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          }
        }
        return response;
      }).catch(() => {
        // Offline fallback
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    })
  );
});
