
const staticAssets = [
    '/',
    '/index.html',
    '/styles.css',
    '/scripts.js',
    '/images/copy.svg',
    '/images/logo_1.svg',
    '/images/logo_2.svg',
    '/images/logo_3.svg',
    '/images/logo_4.svg',
    '/images/logo.svg',
    '/images/question.svg',
    '/manifest.webmanifest',
    '/sw.js',
    'tesseract.min.js'
  ];

self.addEventListener('install', async function(event) {
    const cache = await caches.open("data-cache");
    await cache.addAll(staticAssets);
    return self.skipWaiting()
  });
  
self.addEventListener("activate", e => {
    self.clients.claim();
})
self.addEventListener('fetch', function(event) {
    event.respondWith(
      caches.match(event.request).then(function(response) {
        return response || fetch(event.request);
      })
    );
});