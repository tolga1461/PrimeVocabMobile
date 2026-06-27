const CACHE_NAME = 'primevocab-mobile-v2';
const ASSETS = [
  './index.html',
  './css/style.css',
  './js/polyfill.js',
  './js/config.js',
  './js/utils_common.js',
  './js/phrasal_verbs.js',
  './js/cefr_data.js',
  './js/apiClient.js',
  './js/panel_utils.js',
  './js/archive.js',
  './js/review.js',
  './js/games.js',
  './js/settings.js',
  './js/sync.js',
  './js/app.js',
  './manifest.json',
  './icons/icon48.png',
  './icons/icon128.png',
  './icons/icon192.png',
  './icons/icon512.png'
];

// Install: Cache static resources
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate: Delete old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Network First, falling back to cache
self.addEventListener('fetch', (e) => {
  // Ignore non-GET requests and external API/OAuth requests
  if (e.request.method !== 'GET' || e.request.url.includes('googleapis.com') || e.request.url.includes('accounts.google.com')) {
    return;
  }

  e.respondWith(
    fetch(e.request)
      .then((response) => {
        // If response is valid, clone it and save to cache
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // If network request fails (offline), return from cache
        return caches.match(e.request);
      })
  );
});
