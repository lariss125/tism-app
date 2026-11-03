// Bewaart de appbestanden zodat Tism ook zonder internet opent. Gegevens staan in localStorage, niet hier.
const CACHE = 'tism-v2';
const FILES = ['./', 'index.html', 'app.js', 'state.js', 'patterns.js', 'style.css', 'favicon.svg', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});

// Eerst het netwerk, zodat nieuwe versies meteen zichtbaar zijn; zonder verbinding de bewaarde kopie.
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== location.origin) return;
  event.respondWith(fetch(event.request).then(response => {
    if (response.ok) {const copy = response.clone(); caches.open(CACHE).then(cache => cache.put(event.request, copy));}
    return response;
  }).catch(() => caches.match(event.request, {ignoreSearch: true}).then(hit => hit || caches.match('./'))));
});
