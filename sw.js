self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installed');
  self.skipWaiting(); // Activate the SW immediately after install
});

self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activated');
  return self.clients.claim(); // Claim control of all clients
});

self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
