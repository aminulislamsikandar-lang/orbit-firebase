// Service worker: scripts and question lists are kept for offline; robots.txt, sitemap.xml, the Google file and /api are never taken over.
const fs = require('fs'), path = require('path'), assert = require('assert');
const src = fs.readFileSync(path.join(__dirname, '..', 'public', 'sw.js'), 'utf8');
const handlers = {};
const self_ = { addEventListener: (t, f) => { handlers[t] = f; }, location: { origin: 'https://orbittutorial.web.app' }, skipWaiting() {}, clients: { claim() {} } };
const fakeCache = { match: async () => null, put() {}, add: async () => {} };
const fakeCaches = { open: async () => fakeCache, keys: async () => [], delete: async () => true };
new Function('self', 'location', 'caches', 'fetch', 'URL', src)(self_, self_.location, fakeCaches, async () => ({ ok: true, clone() { return this; } }), URL);
function route(url, mode) {
  let hit = false;
  handlers.fetch({ request: { method: 'GET', url, mode: mode || 'no-cors' }, respondWith() { hit = true; } });
  return hit;
}
const O = 'https://orbittutorial.web.app';
assert(route(O + '/', 'navigate'), 'home page is served offline');
assert(route(O + '/questions.json'), 'questions.json is kept');
assert(route(O + '/recall.js'), 'scripts are kept');
assert(route(O + '/questions.json?x=1'), 'query string ignored');
assert(!route(O + '/robots.txt'), 'robots.txt untouched');
assert(!route(O + '/sitemap.xml'), 'sitemap.xml untouched');
assert(!route(O + '/google5f142d3132da1242.html', 'navigate'), 'Google verification file untouched');
assert(!route(O + '/api/ping'), '/api never cached');
assert(!route('https://orbit-firebase.onrender.com/api/ping'), 'other origins untouched');
assert(!route(O + '/public-videos/a.html'), 'videos not cached');
const idx = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');
for (const k of ['lowData()', "act==='setlow'", 'M_NEEDNET', 'M_LOWDATA']) assert(idx.includes(k), 'index.html has ' + k);
const fj = fs.readFileSync(path.join(__dirname, '..', 'firebase.json'), 'utf8');
assert(fj.includes('"site": "orbittutorial"'), 'firebase.json site kept');
setTimeout(() => console.log('15 passed, 0 failed'), 20);
