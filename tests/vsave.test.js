/* Tests for public/vsave.js ("Save in Orbit" arrow under the recorded lesson videos).
 * Run: node tests/vsave.test.js
 */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const SRC = fs.readFileSync(path.join(ROOT, 'public/vsave.js'), 'utf8');
const VS = require(path.join(ROOT, 'public/vsave.js'));
let pass = 0, fail = 0;
function t(name, ok, extra) { if (ok) { pass++; console.log('PASS  ' + name); } else { fail++; console.log('FAIL  ' + name + (extra ? '  -> ' + extra : '')); } }

t('total size from Content-Range', VS.parseTotal('bytes 0-8388607/52428800') === 52428800 && VS.parseTotal('bytes 0-9/*') === 0 && VS.parseTotal(null) === 0);
t('range header for each 8 MB piece', VS.rangeHeader(0, VS.PART) === 'bytes=0-8388607' && VS.rangeHeader(VS.PART, VS.PART) === 'bytes=8388608-16777215');
t('saved copy is fresh for 30 days, then not', VS.isFresh(1000, 1000 + 29 * 86400000, 30) === true && VS.isFresh(1000, 1000 + 31 * 86400000, 30) === false && VS.isFresh(0, 5, 30) === false && VS.isFresh('x', 5, 30) === false);
t('room check: needs the video + 15 % spare; unknown quota lets it try', VS.roomOk(100, 1000, 0) === true && VS.roomOk(100, 150, 100) === false && VS.roomOk(100, 0, 0) === true && VS.roomOk(0, 10, 10) === true);
t('percent is clamped 0..100', VS.pctOf(50, 200) === 25 && VS.pctOf(300, 200) === 100 && VS.pctOf(5, 0) === 0);
t('error texts are short and friendly; a cancel shows nothing', VS.errText({ code: 'space' }) === 'Jagah kam hai' && VS.errText({ name: 'QuotaExceededError' }) === 'Jagah kam hai' && VS.errText({ name: 'AbortError' }) === '' && VS.errText({ status: 403 }).length > 0 && VS.errText({ offline: true }) === 'Internet nahi hai' && VS.errText(new Error('x')) === 'Save nahi hua');
t('MB text', VS.fmtMb(52428800) === '50 MB');
t('no innerHTML / eval / document.write (numbers.test rule)', !/innerHTML|eval\(|document\.write/.test(SRC));
t('no mp4 file is written to the phone: no <a download>, no Content-Disposition, no showSaveFilePicker', !/\.download\s*=|setAttribute\(["']download|showSaveFilePicker|createElement\(["']a["']\)/.test(SRC));

const idx = fs.readFileSync(path.join(ROOT, 'public/index.html'), 'utf8'), sw = fs.readFileSync(path.join(ROOT, 'public/sw.js'), 'utf8'), vp = fs.readFileSync(path.join(ROOT, 'public/vplayer.js'), 'utf8');
t('index.html loads /vsave.js once, before /vplayer.js', (idx.match(/<script src="\/vsave\.js"><\/script>/g) || []).length === 1 && idx.indexOf('/vsave.js') < idx.indexOf('/vplayer.js'));
t('service worker keeps vsave.js offline', sw.includes("'/vsave.js'"));
t('saved videos live in IndexedDB, not in a Cache the service worker would delete on update', /indexedDB/.test(SRC) && !/caches\.open/.test(SRC));
t('openVideo keeps the subscription check: no saved copy without access', /code!=='subscription_required'\?await savedVideoUrl/.test(idx));
t('the three video templates still have nodownload / no right click', (idx.match(/controlsList="nodownload"/g) || []).length >= 2);
t('vplayer.js only asks VSave for a button when it exists', /g\.VSave && g\.VSave\.bind/.test(vp));

let JSDOM = null; try { ({ JSDOM } = require('jsdom')); } catch (e) { /* skipped below */ }
if (!JSDOM) { console.log('SKIP  jsdom not installed (npm i -D jsdom) - DOM checks not run'); finish(); }
else (async () => {
  const tick = ms => new Promise(r => setTimeout(r, ms));
  // tiny in-memory IndexedDB stand-in (only what vsave.js calls)
  function fakeIDB() {
    const data = new Map();
    const req = fn => { const r = {}; setTimeout(() => { try { r.result = fn(); r.onsuccess && r.onsuccess(); } catch (e) { r.error = e; r.onerror && r.onerror(); } }, 0); return r; };
    const store = (tx) => ({
      get: id => req(() => data.get(id)),
      getAll: () => req(() => [...data.values()]),
      put: rec => { data.set(rec.id, rec); setTimeout(() => tx.oncomplete && tx.oncomplete(), 0); },
      delete: id => { data.delete(id); setTimeout(() => tx.oncomplete && tx.oncomplete(), 0); }
    });
    return { open() { const r = {}; setTimeout(() => { r.result = { createObjectStore() {}, transaction() { const tx = {}; tx.objectStore = () => store(tx); return tx; } }; r.onupgradeneeded && r.onupgradeneeded(); r.onsuccess && r.onsuccess(); }, 0); return r; }, data };
  }
  function page(fetchImpl, over) {
    const d = new JSDOM('<!doctype html><body></body>', { url: 'https://orbittutorial.web.app/', runScripts: 'outside-only', pretendToBeVisual: true });
    const w = d.window, idb = fakeIDB();
    w.indexedDB = idb; w.fetch = fetchImpl; w.confirm = () => true;
    w.URL.createObjectURL = () => 'blob:https://orbittutorial.web.app/fake-' + Math.random().toString(16).slice(2); w.URL.revokeObjectURL = () => {};
    w.orbitVideoUrl = async () => 'https://b2.example/v.mp4?sig=1';
    Object.assign(w, over || {});
    w.eval(SRC);
    return { w, idb };
  }
  function video(w, id) { const v = w.document.createElement('video'); v.setAttribute('data-vo', id); w.document.body.appendChild(v); return v; }
  // a 206 server that serves `size` bytes in Range pieces
  const server = size => async (url, o) => {
    const m = /bytes=(\d+)-(\d+)/.exec((o.headers || {}).Range || '');
    const s = Number(m[1]), e = Math.min(Number(m[2]), size - 1);
    if (s >= size) return { status: 416, headers: { get: () => null }, blob: async () => new Blob([]) };
    return { status: 206, headers: { get: k => (k.toLowerCase() === 'content-range' ? `bytes ${s}-${e}/${size}` : null) }, blob: async () => new Blob([new Uint8Array(e - s + 1)]) };
  };

  {  // save -> saved -> url -> remove
    const { w } = page(server(VS.PART * 2 + 1000));
    const v = video(w, 'vid-1'), b = w.document.createElement('button');
    t('bind gives a button', w.VSave.bind(v, b) === true);
    await tick(20);
    t('starts as the arrow (idle)', b.getAttribute('data-vs') === 'idle' && b.querySelector('svg'));
    t('no saved copy yet: url() is null', (await w.VSave.url('vid-1')) === null);
    b.click();
    await tick(10);
    t('while downloading the button shows busy', b.getAttribute('data-vs') === 'busy');
    await tick(150);
    t('after the download the button shows Saved', b.getAttribute('data-vs') === 'saved' && /Saved/.test(b.textContent));
    const u1 = await w.VSave.url('vid-1'), u2 = await w.VSave.url('vid-1');
    t('a saved copy gives one stable blob: address', /^blob:/.test(u1) && u1 === u2);
    b.click(); await tick(40);
    t('tapping Saved removes it (after confirm)', b.getAttribute('data-vs') === 'idle' && (await w.VSave.url('vid-1')) === null);
  }
  {  // a file that is an exact multiple of the piece size (416 after the last piece), and a server that ignores Range (200)
    const p1 = page(server(VS.PART * 2)); const b1 = p1.w.document.createElement('button');
    p1.w.VSave.bind(video(p1.w, 'x1'), b1); b1.click(); await tick(150);
    t('exact multiple of 8 MB still saves', b1.getAttribute('data-vs') === 'saved');
    const p2 = page(async () => ({ status: 200, headers: { get: () => null }, blob: async () => new Blob([new Uint8Array(500)]) })); const b2 = p2.w.document.createElement('button');
    p2.w.VSave.bind(video(p2.w, 'x2'), b2); b2.click(); await tick(60);
    t('a server that ignores Range (200) still saves', b2.getAttribute('data-vs') === 'saved');
  }
  {  // failures: nothing is stored, the button goes back to the arrow with a short reason
    const p = page(async () => ({ status: 403, headers: { get: () => null }, blob: async () => new Blob([]) })); const b = p.w.document.createElement('button');
    p.w.VSave.bind(video(p.w, 'f1'), b); b.click(); await tick(60);
    t('a 403 stores nothing and shows a reason', b.getAttribute('data-vs') === 'idle' && b.textContent.length > 0 && p.idb.data.size === 0);
    const q = page(server(1000), { orbitVideoUrl: async () => { throw new Error('subscription'); } }); const c = q.w.document.createElement('button');
    q.w.VSave.bind(video(q.w, 'f2'), c); c.click(); await tick(60);
    t('no access (the server refuses the link): nothing is saved', c.getAttribute('data-vs') === 'idle' && q.idb.data.size === 0);
  }
  {  // old copies are dropped
    const { w, idb } = page(server(1000));
    idb.data.set('old', { id: 'old', blob: new Blob([1]), size: 1, savedAt: Date.now() - 31 * 86400000 });
    t('a copy older than 30 days is not used and is removed', (await w.VSave.url('old')) === null && !idb.data.has('old'));
  }
  {  // opt-out and no IndexedDB
    const { w } = page(server(1000)); const v = video(w, 'o1'); v.setAttribute('data-vs-off', ''); const b = w.document.createElement('button');
    t('data-vs-off: no button is bound', w.VSave.bind(v, b) === false);
    const d = new JSDOM('<!doctype html><body></body>', { url: 'https://orbittutorial.web.app/', runScripts: 'outside-only' }).window; d.eval(SRC);
    const v2 = d.document.createElement('video'); v2.setAttribute('data-vo', 'n1');
    t('no IndexedDB: bind returns false and nothing breaks', d.VSave.bind(v2, d.document.createElement('button')) === false);
  }
  finish();
})();
function finish() { console.log(pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0); }
