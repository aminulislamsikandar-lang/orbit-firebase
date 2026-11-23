/* Tests for public/vkeep.js (a playing video survives a page re-draw; only one video plays at a time).
 * Run: node tests/vkeep.test.js     (the DOM part needs jsdom, dev only: npm i -D jsdom; skipped if missing)
 * Play/pause are SIMULATED here (jsdom has no media player). This proves our logic, not how a real phone decodes the video.
 */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const VK = require(path.join(ROOT, 'public/vkeep.js'));
let pass = 0, fail = 0;
function t(name, ok, extra) { if (ok) { pass++; console.log('PASS  ' + name); } else { fail++; console.log('FAIL  ' + name + (extra ? '  -> ' + extra : '')); } }
const sleep = ms => new Promise(r => setTimeout(r, ms));
const code = f => fs.readFileSync(path.join(ROOT, 'public', f), 'utf8');

// ---------- pure pairing ----------
{ const g = [{ id: 'a', src: 'u1', keep: true }, { id: 'b', src: 'u2', keep: true }];
  const f = [{ id: 'b', src: 'u2', idle: true }, { id: 'a', src: 'u1', idle: true }];
  t('pair: same id + same src are matched, in any order', JSON.stringify(VK.pairVideos(g, f)) === '[[1,0],[0,1]]');
  t('pair: a new link (different src) is NOT replaced by the old element', VK.pairVideos([{ id: 'a', src: 'u1', keep: true }], [{ id: 'a', src: 'u9', idle: true }]).length === 0);
  t('pair: an old video with no progress is not kept', VK.pairVideos([{ id: 'a', src: 'u1', keep: false }], [{ id: 'a', src: 'u1', idle: true }]).length === 0);
  t('pair: a new video that already started is left alone', VK.pairVideos([{ id: 'a', src: 'u1', keep: true }], [{ id: 'a', src: 'u1', idle: false }]).length === 0);
  t('pair: one old video is reused only once', VK.pairVideos([{ id: 'a', src: 'u1', keep: true }], [{ id: 'a', src: 'u1', idle: true }, { id: 'a', src: 'u1', idle: true }]).length === 1);
  t('pair: no id -> never matched', VK.pairVideos([{ id: '', src: 'u', keep: true }], [{ id: '', src: 'u', idle: true }]).length === 0); }
t('index.html loads vkeep.js once, before vboost.js', (code('index.html').match(/<script src="\/vkeep\.js"><\/script>/g) || []).length === 1 && code('index.html').indexOf('/vkeep.js') < code('index.html').indexOf('/vboost.js'));
t('service worker keeps vkeep.js offline', code('sw.js').includes("'/vkeep.js'"));

// ---------- DOM behaviour ----------
let JSDOM = null; try { ({ JSDOM } = require('jsdom')); } catch (e) { /* skipped */ }
if (!JSDOM) { console.log('SKIP  jsdom not installed (npm i -D jsdom) - DOM checks not run'); finish(); }
else (async () => {
  const bus = [];                                   // fake BroadcastChannel: all fake windows share it (like tabs of one browser)
  class FakeBC { constructor(n) { this.n = n; bus.push(this); } postMessage(d) { bus.forEach(c => { if (c !== this && c.n === this.n && c.onmessage) setTimeout(() => c.onmessage({ data: d }), 0); }); } }
  const mk = () => {
    const w = new JSDOM('<!doctype html><body><div id="app"></div></body>', { url: 'https://orbittutorial.web.app/', runScripts: 'outside-only', pretendToBeVisual: true }).window;
    const P = w.HTMLMediaElement.prototype;
    Object.defineProperty(P, 'paused', { get() { return this._p !== false; }, configurable: true });
    Object.defineProperty(P, 'currentTime', { get() { return this._t || 0; }, set(v) { this._t = v; }, configurable: true });
    P.play = function () { this._p = false; this.dispatchEvent(new w.Event('play')); return Promise.resolve(); };
    P.pause = function () { if (this._p === false) { this._p = true; this.dispatchEvent(new w.Event('pause')); } };
    w.BroadcastChannel = FakeBC;
    w.eval(code('vkeep.js'));
    return w;
  };
  const html = (id, src) => '<p>x</p><video controls data-vo="' + id + '" src="' + src + '"></video>';

  { const w = mk(), app = w.document.getElementById('app');
    app.innerHTML = html('v1', 'https://b2/x.mp4?sig=1'); await sleep(5);
    const v = app.querySelector('video'); v.play(); v.currentTime = 42;
    app.innerHTML = html('v1', 'https://b2/x.mp4?sig=1'); await sleep(10);       // a page re-draw while playing
    const now = app.querySelector('video');
    t('re-draw while playing: the SAME element is still on the page (no restart)', now === v && v.currentTime === 42);
    t('re-draw while playing: it is still playing', v.paused === false); }

  { const w = mk(), app = w.document.getElementById('app');
    app.innerHTML = html('v1', 'u1'); await sleep(5);
    const v = app.querySelector('video'); v.play(); v.currentTime = 10;
    app.innerHTML = html('v1', 'u1');
    v._p = true;                                   // simulate the browser pausing it because it left the page (before our code runs)
    await sleep(10);
    t('browser paused it while it was away: same element is back AND playing again', app.querySelector('video') === v && v.paused === false && v.currentTime === 10); }

  { const w = mk(), app = w.document.getElementById('app');
    app.innerHTML = html('v1', 'u1'); await sleep(5);
    const v = app.querySelector('video'); v.play(); v.currentTime = 10;
    app.innerHTML = '<p>video closed</p>'; await sleep(10);
    t('video removed for good: it is paused at once (no sound from a video you cannot see)', v.paused === true && !v.isConnected); }

  { const w = mk(), app = w.document.getElementById('app');
    app.innerHTML = html('v1', 'u1'); await sleep(5);
    const v = app.querySelector('video'); v.play(); v.currentTime = 10;
    app.innerHTML = html('v1', 'u2'); await sleep(10);
    const nv = app.querySelector('video');
    t('a different link for the same video id: the new element is used, the old one is paused', nv !== v && v.paused === true); }

  { const w = mk(), app = w.document.getElementById('app');
    app.innerHTML = html('a', 'u1') + html('b', 'u2'); await sleep(5);
    const [a, b] = app.querySelectorAll('video');
    a.play(); b.play();
    t('ONE AT A TIME: starting video B pauses video A', a.paused === true && b.paused === false);
    a.play();
    t('ONE AT A TIME: starting A again pauses B', b.paused === true && a.paused === false);
    a.pause();
    t('a video the student paused is not restarted by a re-draw', (() => { app.innerHTML = html('a', 'u1') + html('b', 'u2'); return true; })());
    await sleep(10);
    t('student-paused video stays paused after a re-draw', [...app.querySelectorAll('video')].every(x => x.paused === true)); }

  { const w = mk(), app = w.document.getElementById('app');
    app.innerHTML = html('a', 'u1'); await sleep(5);
    const a = app.querySelector('video'); a.play();
    app.innerHTML = '<p>other chapter</p>'; await sleep(10);          // a is now detached and paused
    app.innerHTML = html('b', 'u2'); await sleep(5);
    app.querySelector('video').play();
    t('a video from another chapter never restarts by itself', a.paused === true);
    t('VKeep.state lists the videos on the page', Array.isArray(w.VKeep.state()) && w.VKeep.state().length === 1); }

  { const A = mk(), B = mk();                      // two Orbit tabs
    A.document.getElementById('app').innerHTML = html('a', 'u1'); B.document.getElementById('app').innerHTML = html('a', 'u1'); await sleep(5);
    const va = A.document.querySelector('video'), vb = B.document.querySelector('video');
    va.play(); await sleep(10);
    vb.play(); await sleep(10);
    t('ACROSS TABS: starting a video in tab B pauses the video in tab A', va.paused === true && vb.paused === false);
    va.play(); await sleep(10);
    t('ACROSS TABS: and the other way round', vb.paused === true && va.paused === false);
    t('VKeep.media lists what played in this tab', Array.isArray(A.VKeep.media()) && A.VKeep.media().length >= 1); }

  finish();
})();
function finish() { console.log('\n' + pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0); }
