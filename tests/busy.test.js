// Global loading indicator (public/busy.js): every wait on the network shows a bar + a ticking seconds counter,
// quick requests do not flicker, the loader can never get stuck, and it is wired into index.html and the service worker.
// Run: node tests/busy.test.js
const fs = require('fs'), path = require('path'), assert = require('assert');
const ROOT = path.join(__dirname, '..');
let n = 0; const ok = (c, m) => { assert(c, m); n++; };
const src = fs.readFileSync(path.join(ROOT, 'public', 'busy.js'), 'utf8');
const idx = fs.readFileSync(path.join(ROOT, 'public', 'index.html'), 'utf8');
const sw = fs.readFileSync(path.join(ROOT, 'public', 'sw.js'), 'utf8');

// ---- static checks ----
ok(!/\.(innerHTML|outerHTML)\s*\+?=/.test(src) && !/insertAdjacentHTML|document\.write|eval\(/.test(src), 'no HTML sinks');
ok(!/https?:\/\//.test(src), 'no external URLs');
ok(src.length < 12000, 'stays small (' + src.length + ' bytes)');
ok(/<script src="\/busy\.js"><\/script>/.test(idx), 'busy.js is loaded by index.html');
ok(idx.indexOf('/busy.js') < idx.indexOf("const SPN="), 'busy.js loads before the page script that fetches');
ok(idx.includes('BUSY.endBoot()') && idx.includes('BUSY.wrapCloud()'), 'boot entry ends and cloud calls are wrapped when the login state is known');
ok((idx.match(/window\.onCloudFail=e=>\{if\(window\.BUSY\)BUSY\.endBoot\(\);/g) || []).length === 1, 'a failed cloud start also ends the boot loader');
ok(sw.includes("'/busy.js'"), 'cached for offline');
ok(+(/orbit-shell-v(\d+)/.exec(sw) || [])[1] >= 53, 'service worker cache version bumped');
ok(!/Tumhara course load ho raha hai…<\/p><\/div>`;/.test(idx), 'course wait screen uses the animated loader');

// ---- pure message logic ----
global.window = global; global.orbitLang = () => 'hing';
global.document = undefined;
let M;
{
  global.fetch = undefined; global.CLOUD = undefined;
  require(path.join(ROOT, 'public', 'busy.js'));
  M = window.BUSY._message;
}
const e = (key, ago) => ({ key, t0: 100000 - ago }), NOW = 100000;
ok(M([], NOW, true) === null, 'nothing waiting: no message');
let m = M([e('answer', 2200)], NOW, true);
ok(m.cls === '' && /Answer ban raha hai… 2s$/.test(m.text), 'normal wait names the job and counts seconds: ' + m.text);
m = M([e('tr', 5000), e('vis', 1000)], NOW, true);
ok(/\(\+1\)/.test(m.text) && /5s$/.test(m.text), 'two waits: oldest first, "(+1)" for the other');
m = M([e('load', 9000)], NOW, true);
ok(m.cls === 'slow' && /jaag raha hai/.test(m.text) && /9s$/.test(m.text), 'after 8 s: server may be waking up');
m = M([e('load', 31000)], NOW, true);
ok(m.cls === 'long' && /refresh/.test(m.text) && /31s$/.test(m.text), 'after 30 s: check internet / refresh');
m = M([e('load', 1000)], NOW, false);
ok(m.cls === 'off' && /Internet nahi hai/.test(m.text), 'offline is said plainly');
ok(window.BUSY._count() === 1, 'the boot entry is the only thing waiting');
window.BUSY.endBoot(); ok(window.BUSY._count() === 0, 'endBoot ends the boot entry');
window.BUSY.endBoot(); ok(window.BUSY._count() === 0, 'ending twice is harmless');
const end = window.BUSY.begin('load'); end(); end(); ok(window.BUSY._count() === 0, 'begin/end is idempotent');
let resolve; const pr = new Promise(r => { resolve = r; });
window.BUSY.track(pr, 'load'); ok(window.BUSY._count() === 1, 'track waits for the promise');

// ---- fake browser ----
let JSDOM = null; try { ({ JSDOM } = require('jsdom')); } catch (x) { /* ignore */ }
if (!JSDOM) { console.log('SKIP  jsdom not installed - busy DOM tests not run'); console.log(n + ' passed, 0 failed'); process.exit(0); }
const wait = ms => new Promise(r => setTimeout(r, ms));
function boot(fetchImpl, extra) {
  const dom = new JSDOM('<!doctype html><body><div id="app"></div></body>', { runScripts: 'outside-only', url: 'https://orbittutorial.web.app/', pretendToBeVisual: true });
  const w = dom.window; w.ORBIT_API = 'https://api.example.org'; w.fetch = fetchImpl;
  if (extra) extra(w);
  w.eval(src);
  return w;
}
(async () => {
  // a slow request shows the bar and the pill, a fast one shows nothing
  let release; const slow = () => new Promise(r => { release = () => r({ ok: true }); });
  let w = boot(slow);
  w.BUSY.endBoot();
  const calls = []; const p = w.fetch('/api/answer', { method: 'POST' }); calls.push(p);
  ok(w.BUSY._count() === 1, 'a fetch to our own server is tracked');
  ok(!w.document.getElementById('busy-pill') || !/on/.test(w.document.getElementById('busy-pill').className), 'nothing is drawn in the first moments (no flicker)');
  await wait(1200);
  let pill = w.document.getElementById('busy-pill'), bar = w.document.getElementById('busy-bar');
  ok(pill && /\bon\b/.test(pill.className) && bar && /\bon\b/.test(bar.className), 'after 350 ms the bar and the pill are shown');
  ok(/Answer ban raha hai/.test(pill.textContent) && /\ds$/.test(pill.textContent), 'pill says what is loading and counts seconds: ' + pill.textContent);
  ok(pill.getAttribute('role') === 'status' && pill.getAttribute('aria-live') === 'polite', 'screen readers are told');
  const t1 = pill.textContent; await wait(1100);
  ok(w.document.getElementById('busy-pill').textContent !== t1, 'the counter keeps ticking (proof the app is alive)');
  release(); await p; await wait(50);
  ok(w.BUSY._count() === 0 && !/\bon\b/.test(w.document.getElementById('busy-pill').className) && !/\bon\b/.test(w.document.getElementById('busy-bar').className), 'everything hides when the request ends');

  // quick request never shows anything
  w = boot(async () => ({ ok: true })); w.BUSY.endBoot();
  await w.fetch('/questions.json'); await wait(500);
  ok(!w.document.getElementById('busy-pill'), 'a quick request never draws the loader');

  // failures also end the loader
  w = boot(async () => { throw new TypeError('network'); }); w.BUSY.endBoot();
  let thrown = false; try { await w.fetch('/api/translate', { method: 'POST' }); } catch (x) { thrown = x instanceof w.TypeError || x.name === 'TypeError'; }
  ok(thrown && w.BUSY._count() === 0, 'a failed fetch still throws the same error and ends the loader');

  // what is not tracked
  let seen = 0; w = boot(() => { seen++; return Promise.resolve({ ok: true }); }); w.BUSY.endBoot();
  w.fetch('https://firestore.googleapis.com/x'); w.fetch('https://fonts.gstatic.com/a'); w.fetch('https://api.example.org/api/ping'); w.fetch('/api/ping');
  w.fetch('/api/answer', { headers: { 'X-No-Busy': '1' } });
  ok(seen === 5 && w.BUSY._count() === 0, 'other sites, ping, analytics-style calls and X-No-Busy are not tracked');
  const t = w.fetch('https://api.example.org/api/answer'); ok(w.BUSY._count() === 1, 'the Orbit API server is tracked'); await t;

  // cloud calls
  w = boot(async () => ({ ok: true }), win => { win.CLOUD = { course: { get: () => new Promise(r => { win.__rel = r; }), set: async () => 1 }, token: () => new Promise(r => { win.__tk = r; }), newId: () => 'abc', login: () => new Promise(() => {}) }; });
  w.BUSY.endBoot(); w.BUSY.wrapCloud(); w.BUSY.wrapCloud();
  ok(w.CLOUD.newId() === 'abc', 'sync cloud methods still return their value');
  w.CLOUD.token(); w.CLOUD.login(); ok(w.BUSY._count() === 0, 'token and login are not tracked (login waits on the person)');
  const g = w.CLOUD.course.get(); ok(w.BUSY._count() === 1, 'a cloud read is tracked'); w.__rel({ ok: 1 }); await g; await wait(20);
  ok(w.BUSY._count() === 0, 'and ends when the read ends');
  await w.CLOUD.course.set({}); ok(w.BUSY._count() === 0, 'a fast write ends at once (wrapping twice did not double count)');

  console.log(n + ' passed, 0 failed');
})().catch(x => { console.log('FAIL  ' + (x && x.message)); console.log(n + ' passed, 1 failed'); process.exit(1); });
