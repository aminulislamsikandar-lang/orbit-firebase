// Faster first visit without losing offline: the two big teacher recordings are not downloaded at install,
// but are streamed and saved the first time they are played. Real public/sw.js in a fake worker. Run: node tests/perf-safe.test.js
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
const t = (n, ok, x) => { if (ok) pass++; else { fail++; console.log('FAIL  ' + n + (x ? '  ' + x : '')); } };
const swSrc = fs.readFileSync(path.join(ROOT, 'public', 'sw.js'), 'utf8');
const html = fs.readFileSync(path.join(ROOT, 'public', 'index.html'), 'utf8');
const fj = JSON.parse(fs.readFileSync(path.join(ROOT, 'firebase.json'), 'utf8'));
const A1 = '/bolo-audio/assamese-vyanjan.mp3', A2 = '/bolo-audio/saath-byanjan.mp3';

function boot(online) {
  const stores = {}, fetched = [], listeners = {};
  const mk = n => stores[n] || (stores[n] = new Map());
  const caches = { open: async n => { const m = mk(n); return { match: async k => m.get(typeof k === 'string' ? k : k.url), put: async (k, r) => m.set(typeof k === 'string' ? k : k.url, r), add: async u => { const r = await fetchFn(u); if (!r.ok) throw new Error('bad'); m.set(u, r); } }; }, keys: async () => Object.keys(stores), delete: async () => true };
  const fetchFn = async req => { const u = typeof req === 'string' ? req : req.url; fetched.push(u); if (!online.on) throw new Error('offline'); return { ok: true, status: 200, type: 'basic', url: u, clone() { return this; } }; };
  const self = { addEventListener: (n, f) => { listeners[n] = f; }, skipWaiting() {}, clients: { claim() {}, matchAll: async () => [] }, registration: {}, location: { origin: 'https://x.test' } };
  vm.runInNewContext(swSrc, { self, caches, fetch: fetchFn, URL, Response: { error: () => ({ error: true }) }, location: self.location, Promise, console });
  return { listeners, stores, fetched };
}
const online = { on: true };
(async () => {
  const w = boot(online);
  let done; w.listeners.install({ waitUntil: p => { done = p; } }); await done;
  t('install does not download the two big recordings', !w.fetched.some(u => u.includes('bolo-audio')), w.fetched.filter(u => u.includes('bolo-audio')).join());
  t('install still saves the app files (config.js, questions.json)', w.fetched.includes('/config.js') && w.fetched.includes('/questions.json'));
  // first play: streams from the network and saves a full copy in the background
  let resp, wait = [];
  w.listeners.fetch({ request: { method: 'GET', url: 'https://x.test' + A1, mode: 'no-cors' }, respondWith: p => { resp = p; }, waitUntil: p => wait.push(p) });
  const r1 = await resp; await Promise.all(wait);
  t('first play: the audio is served (from the network)', r1 && r1.ok === true);
  t('first play: a full copy is saved in the background', w.stores['orbit-assets-v1'] && w.stores['orbit-assets-v1'].has(A1));
  // offline, second play: served from the saved copy
  online.on = false; wait = []; resp = null;
  w.listeners.fetch({ request: { method: 'GET', url: 'https://x.test' + A1, mode: 'no-cors' }, respondWith: p => { resp = p; }, waitUntil: p => wait.push(p) });
  const r2 = await resp;
  t('second play, even offline: served from the saved copy', r2 && r2.ok === true);
  // a recording never played and offline: fails like a normal network error, nothing else breaks
  wait = []; resp = null;
  w.listeners.fetch({ request: { method: 'GET', url: 'https://x.test' + A2, mode: 'no-cors' }, respondWith: p => { resp = p; }, waitUntil: p => wait.push(p) });
  let threw = false; try { await resp; } catch (e) { threw = true; } await Promise.all(wait);
  t('never played and offline: the audio simply fails (no crash in the worker)', threw === true);
  // other app files unchanged
  online.on = true; resp = null;
  w.listeners.fetch({ request: { method: 'GET', url: 'https://x.test/config.js', mode: 'no-cors' }, respondWith: p => { resp = p; }, waitUntil() {} });
  t('app files still use the saved copy first', (await resp).ok === true);

  t('cache version moved up (v87 or newer)', /SHELL = 'orbit-shell-v(8[7-9]|9\d|\d{3,})'/.test(swSrc));
  t('index.html preconnects to fonts.gstatic.com and www.gstatic.com', /rel="preconnect" href="https:\/\/fonts\.gstatic\.com" crossorigin/.test(html) && /rel="preconnect" href="https:\/\/www\.gstatic\.com" crossorigin/.test(html));
  const hs = fj.hosting.headers, cc = s => { const h = hs.find(x => x.source === s); return h && h.headers.find(k => k.key === 'Cache-Control').value; };
  t('images, swar pictures and recordings get a 7 day cache', /max-age=604800/.test(cc('/swar/**') || '') && /max-age=604800/.test(cc('/bolo-audio/**') || '') && /max-age=604800/.test(cc('**/*.@(webp|png|jpg|jpeg|svg|ico|woff2)') || ''));
  t('index.html, sw.js, config.js and json stay no-cache (a new version always reaches the phone)', cc('/sw.js') === 'no-cache' && cc('/config.js') === 'no-cache' && cc('**/*.json') === 'no-cache');
  console.log(pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
})();
