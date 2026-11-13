/* OndaChat: solo caché de recursos públicos. No almacenar mensajes ni identidad. */
const CACHE_NAME = 'ondachat-static-v4';
const SHELL = [
  './', './index.html', './styles.css', './app.js', './firebase-config.js',
  './tech-support.js', './moderation.js', './mobile-nav.js', './install.js', './manifest.webmanifest',
  './icon-192.png', './icon-512.png'
];
const PATHS = new Set(SHELL.map(path => new URL(path, self.registration.scope).pathname));
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME)
    .then(cache => cache.addAll(SHELL))
    .then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(key => key.startsWith('ondachat-static-') && key !== CACHE_NAME)
        .map(key => caches.delete(key))
  )).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || !PATHS.has(url.pathname)) return;
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response.ok && response.type === 'basic') {
          const copy = response.clone();
          event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy)));
        }
        return response;
      })
      .catch(async () => {
        const exact = await caches.match(event.request, { ignoreSearch: true });
        if (exact) return exact;
        if (event.request.mode === 'navigate') {
          const index = await caches.match(new URL('./index.html', self.registration.scope).href);
          if (index) return index;
        }
        return Response.error();
      })
  );
});
