// Orbit service worker: keeps the app page and fonts so the app opens offline.
// API calls (/api/*) are never cached here; answers are stored by the page itself.
const SHELL = 'orbit-shell-v2';
const FONTS = 'orbit-fonts-v1';

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL).then(c => c.add('/')).catch(() => {}).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== SHELL && k !== FONTS).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function staleWhileRevalidate(cacheName, key, request) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(key);
  const net = fetch(request).then(res => {
    if (res && (res.ok || res.type === 'opaque')) cache.put(key, res.clone());
    return res;
  }).catch(() => null);
  if (hit) { net.catch(() => {}); return hit; }
  const res = await net;
  return res || Response.error();
}

self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (r.mode === 'navigate' && u.origin === location.origin) {
    e.respondWith(staleWhileRevalidate(SHELL, '/', r));
  } else if (u.hostname === 'fonts.googleapis.com' || u.hostname === 'fonts.gstatic.com') {
    e.respondWith(staleWhileRevalidate(FONTS, r, r));
  }
});
