// Simple service worker for offline support
const CACHE_NAME = 'vr-app-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/vite.svg',
  // Agrega aquí rutas a tus assets, fuentes, modelos, imágenes, etc.
  '/fonts/RockSalt.ttf',
  '/fonts/Roboto.ttf',
  '/fonts/Aclonica.ttf',
  '/fonts/Ultra.ttf',
  // Ejemplo de assets:
  // '/models/PointsMen.glb',
  // '/images/piso_ajedrez.jpg',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))
    )
  );
});
