// Orbit service worker: keeps the app page, its scripts and the question lists so chapters open offline.
// API calls (/api/*) are never cached here; answers are stored by the page itself.
// robots.txt, sitemap.xml and the Google verification file are NOT touched: they always go to the server.
const SHELL = 'orbit-shell-v100';
const FONTS = 'orbit-fonts-v1';
const ASSETS = 'orbit-assets-v1';

// Same-origin files the app needs to run offline (JSON lists + scripts + icons).
const CORE = [
  '/config.js', '/catalog.js', '/publicchapters.js', '/custom-course.js', '/warp-loader.js', '/busy.js', '/team.js', '/mathvideo-admin.js',
  '/narration-sync.js', '/narration-sprites.js', '/mathvideo-player.js', '/narration-loader.js',
  '/voiceover.js', '/vkeep.js', '/vboost.js', '/vsave.js', '/vplayer.js', '/voiceover-admin.js', '/narration-admin.js', '/video-admin.js', '/qvideo.js', '/ytplayer.js', '/plan.js',
  '/analytics.js', '/parent-key.js', '/recall.js', '/voicematch-core.js', '/assamese-fuse.js', '/bolo-core.js', '/bolorec-core.js', '/bolorec.js', '/saath-core.js', '/saath.js', '/swarsaath-core.js', '/swarsaath.js', '/abcsaath-core.js', '/abcsaath.js', '/byanjanpic-core.js', '/byanjanpic.js', '/byanjan-video.js', '/bolo.js', '/swarborno.js', '/swar/swar.mp3', '/swar/swar-01.webp', '/swar/swar-02.webp', '/swar/swar-03.webp', '/swar/swar-04.webp', '/swar/swar-05.webp', '/swar/swar-06.webp', '/swar/swar-07.webp', '/swar/swar-08.webp', '/swar/swar-09.webp', '/swar/swar-10.webp', '/swar/swar-11.webp', '/kidlink.js', '/vlab.js', '/models3d.js', '/promptbox.js', '/abcgames.js', '/abclevels.js', '/numcore.js', '/numgames.js', '/numlevels.js', '/sunogame.js', '/numcount.js', '/report.js', '/avatar.js', '/studytime.js', '/kidbank.js', '/cloud.js',
  '/limit-msg.js', '/revision-core.js', '/answer-check.js', '/quiz.js', '/exam.js', '/aireview.js', '/classroom.js', '/weekly.js', '/voice-tutor.js',
  '/firebase-config.js', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png',
  '/questions.json', '/videos.json', '/publicvideos.json',
  ...'abcdefghijklmnopqrstuvwxyz'.split('').map(l => '/abc/' + l + '.webp')   // the 26 ABC letter pictures
];
const CORE_SET = new Set(CORE);
// Two big teacher recordings (about 1.3 MB) are NOT downloaded at install any more: a student who never opens Kid mode never pays for them.
// The first time one is played it streams from the server and a full copy is saved in the background, so it works offline from then on.
const AUDIO_LAZY = new Set(['/bolo-audio/assamese-vyanjan.mp3', '/bolo-audio/saath-byanjan.mp3', '/bolo-audio/saath-abc.mp3']);
async function lazyAudio(e, path) {
  const cache = await caches.open(ASSETS);
  const hit = await cache.match(path);
  if (hit) return hit;
  e.waitUntil(cache.add(path).catch(() => {}));   // a plain (non-range) request, so the full 200 answer can be saved
  return fetch(e.request);
}

self.addEventListener('install', e => {
  e.waitUntil(
    Promise.all([
      caches.open(SHELL).then(c => c.add('/')).catch(() => {}),
      // One failed file must not block the install, so each is added on its own.
      caches.open(ASSETS).then(c => Promise.all(CORE.map(u => c.add(u).catch(() => {}))))
    ]).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  const keep = [SHELL, FONTS, ASSETS];
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => !keep.includes(k)).map(k => caches.delete(k))))
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
  const same = u.origin === location.origin;
  // Only the app's home page gets the saved app page. Other addresses (robots.txt, sitemap.xml, the Google verification file) go to the server as normal.
  if (r.mode === 'navigate' && same && (u.pathname === '/' || u.pathname === '/index.html')) {
    e.respondWith(staleWhileRevalidate(SHELL, '/', r));
  } else if (u.hostname === 'fonts.googleapis.com' || u.hostname === 'fonts.gstatic.com') {
    e.respondWith(staleWhileRevalidate(FONTS, r, r));
  } else if (same && AUDIO_LAZY.has(u.pathname)) {
    e.respondWith(lazyAudio(e, u.pathname));
  } else if (same && CORE_SET.has(u.pathname)) {
    // Ignore any ?query so /questions.json?x=1 and /questions.json share one saved copy.
    e.respondWith(staleWhileRevalidate(ASSETS, u.pathname, r));
  } else if (u.hostname === 'www.gstatic.com' && u.pathname.indexOf('/firebasejs/') === 0) {
    // Firebase login/sync code, so the account still loads on a weak connection.
    e.respondWith(staleWhileRevalidate(ASSETS, r, r));
  }
});

// "Padhai ka time" alerts for a parent (Web Push). The server sends a small JSON {title, body, tag, url}; nothing else is shown.
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (x) { d = {}; }
  const title = String(d.title || 'Orbit').slice(0, 80);
  e.waitUntil(self.registration.showNotification(title, {
    body: String(d.body || '').slice(0, 240), icon: '/icon-192.png', badge: '/icon-192.png',
    tag: String(d.tag || 'orbit-study').slice(0, 40), renotify: true, data: { url: '/#study' }   // always the app's own page, never an address from the message
  }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) { if (c.url.startsWith(self.location.origin) && 'focus' in c) { c.focus(); return 'navigate' in c ? c.navigate('/#study') : undefined; } }
    return self.clients.openWindow('/#study');
  }));
});
