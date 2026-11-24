/* Tests for public/vboost.js (louder video sound). Pure logic only; the real Web Audio / Backblaze CORS behaviour must be tried on a phone.
 * Run: node tests/vboost.test.js
 */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const VB = require(path.join(ROOT, 'public/vboost.js'));
let pass = 0, fail = 0;
function t(name, ok, extra) { if (ok) { pass++; console.log('PASS  ' + name); } else { fail++; console.log('FAIL  ' + name + (extra ? '  -> ' + extra : '')); } }
const base = 'https://orbittutorial.web.app/';
const b2 = 'https://orbit-bucket.s3.us-west-004.backblazeb2.com/v/ch1.mp4?X-Amz-Signature=abc';

t('default boost is 3x', VB.gainValue(undefined) === 3 && VB.DEFAULT_GAIN === 3);
t('custom boost is used but capped at 6x, junk and below 1 go back to 3x', VB.gainValue(2) === 2 && VB.gainValue(50) === 6 && VB.gainValue('x') === 3 && VB.gainValue(0.5) === 3 && VB.gainValue(-1) === 3);
t('slider level: 1x to 4x, junk or below 1 uses the fallback, above 4 is cut to 4', VB.levelValue(2.5, 3) === 2.5 && VB.levelValue(9, 3) === 4 && VB.levelValue('x', 3) === 3 && VB.levelValue(0.5, 3) === 3 && VB.levelValue(1, 3) === 1 && VB.LEVEL_MAX === 4);
t('Backblaze link is another site', VB.isCross(b2, base) === true);
t('own file and blob: are not another site', VB.isCross('/public-videos/a.mp4', base) === false && VB.isCross('blob:https://orbittutorial.web.app/1234', base) === false);
t('garbage src is not treated as cross-site', VB.isCross('', 'https://orbittutorial.web.app/') === false || VB.isCross('', base) === false);
t('another-site video WITHOUT crossorigin must NOT go through Web Audio (it would play silence)', VB.safeToBoost(b2, null, base) === false && VB.safeToBoost(b2, '', base) === false);
t('another-site video loaded with crossorigin=anonymous may be boosted', VB.safeToBoost(b2, 'anonymous', base) === true);
t('same-site video can always be boosted', VB.safeToBoost('/public-videos/a.mp4', null, base) === true);

const idx = fs.readFileSync(path.join(ROOT, 'public/index.html'), 'utf8'), sw = fs.readFileSync(path.join(ROOT, 'public/sw.js'), 'utf8');
t('index.html loads /vboost.js once', (idx.match(/<script src="\/vboost\.js"><\/script>/g) || []).length === 1);
t('service worker keeps vboost.js offline', sw.includes("'/vboost.js'"));

// ---------- DOM behaviour (jsdom, dev only) ----------
let JSDOM = null; try { ({ JSDOM } = require('jsdom')); } catch (e) { /* skipped below */ }
if (!JSDOM) console.log('SKIP  jsdom not installed (npm i -D jsdom) - DOM checks not run');
else {
  const dom = new JSDOM('<!doctype html><body></body>', { url: base, runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window; let loads = 0, appErr = 0;
  w.HTMLMediaElement.prototype.load = function () { loads++; };
  w.eval(fs.readFileSync(path.join(ROOT, 'public/vboost.js'), 'utf8'));
  w.document.body.innerHTML = '<video controls src="' + b2 + '"></video><video controls src="/public-videos/a.mp4"></video>';
  const [a, b] = w.document.querySelectorAll('video');
  a.onerror = () => { appErr++; };
  setTimeout(() => {
    t('another-site video gets crossorigin=anonymous and is reloaded', a.getAttribute('crossorigin') === 'anonymous' && loads >= 1);
    t('same-site video is left alone', b.getAttribute('crossorigin') === null);
    a.dispatchEvent(new w.Event('error'));
    t('CORS failure: crossorigin removed again so the video plays normally', a.getAttribute('crossorigin') === null && a.hasAttribute('data-vb-off'));
    t('CORS failure: the app\'s own onerror (which would drop the video) is NOT called the first time', appErr === 0);
    a.dispatchEvent(new w.Event('error'));
    t('a real second failure still reaches the app\'s onerror', appErr === 1);
    sliderTests().then(finish);
  }, 30);
}

// ---------- limiter + Loudness slider (jsdom with a fake Web Audio) ----------
function sliderTests() {
  const log = { edges: [], contexts: 0, comps: [] };
  function AC() {
    log.contexts++; this.state = 'running'; this.currentTime = 0; this.destination = { name: 'dest' };
    const node = (name, extra) => Object.assign({ name, connect(n) { log.edges.push(this.name + '>' + n.name); } }, extra);
    this.createMediaElementSource = () => node('src');
    this.createGain = () => { const n = node('gain', { gain: { value: 1, setTargetAtTime(v) { this.value = v; log.target = v; } } }); (log.gains = log.gains || []).push(n); return n; };
    this.createDynamicsCompressor = () => { const n = node('comp' + (log.comps.length + 1), { threshold: {}, knee: {}, ratio: {}, attack: {}, release: {} }); log.comps.push(n); return n; };
    this.resume = () => Promise.resolve();
  }
  function page(storage) {
    const d = new JSDOM('<!doctype html><body><div id="a"></div></body>', { url: base, runScripts: 'outside-only', pretendToBeVisual: true });
    const w = d.window; w.HTMLMediaElement.prototype.load = function () {}; w.AudioContext = AC;
    if (storage) for (const k in storage) w.localStorage.setItem(k, storage[k]);
    w.eval(fs.readFileSync(path.join(ROOT, 'public/vboost.js'), 'utf8'));
    return w;
  }
  const tick = ms => new Promise(r => setTimeout(r, ms));
  const mk = (w, src) => { const v = w.document.createElement('video'); v.setAttribute('src', src); w.document.getElementById('a').appendChild(v); return v; };
  const rows = w => w.document.querySelectorAll('.vb-row');
  return (async () => {
    // 1. chain with limiter, starts at 3x, slider appears only after the video is really boosted
    let w = page(); const v = mk(w, '/public-videos/a.mp4'); await tick(20);
    t('no slider before the student presses play (nothing is boosted yet)', rows(w).length === 0);
    v.dispatchEvent(new w.Event('play', { bubbles: true })); await tick(30);
    t('chain: video > gain > compressor > limiter > speakers', log.edges.join(',') === 'src>gain,gain>comp1,comp1>comp2,comp2>dest', log.edges.join(','));
    t('limiter is a hard, fast compressor (threshold -2, ratio 20)', log.comps[1] && log.comps[1].threshold.value === -2 && log.comps[1].ratio.value === 20 && log.comps[1].attack.value === 0.001);
    t('starts at 3x', log.gains[0].gain.value === 3);
    t('one Loudness slider appears right under the boosted video', rows(w).length === 1 && v.nextSibling === rows(w)[0]);
    const r = rows(w)[0].querySelector('input');
    t('slider is 1x to 4x and shows 3x', r.min === '1' && r.max === '4' && r.value === '3' && rows(w)[0].querySelector('.vb-val').textContent === '3x');
    // 2. moving the slider changes the live gain and is remembered
    r.value = '2'; r.dispatchEvent(new w.Event('input'));
    t('moving the slider changes the gain at once', log.gains[0].gain.value === 2 && rows(w)[0].querySelector('.vb-val').textContent === '2x');
    t('the choice is remembered on this phone', w.localStorage.getItem('orbit.vboost.gain') === '2' && w.VBoost.getLevel() === 2);
    // 3. a video moved/redrawn gets its slider back (no duplicate)
    rows(w)[0].remove(); w.document.getElementById('a').appendChild(v); await tick(30);
    t('video moved by a re-draw: slider is put back, only one', rows(w).length === 1);
    // 4. a second video shares one audio context and starts at the chosen level
    const v2 = mk(w, '/public-videos/b.mp4'); v2.dispatchEvent(new w.Event('play', { bubbles: true })); await tick(30);
    t('second video: same audio context, starts at the chosen 2x, own slider', log.contexts === 1 && log.gains[1].gain.value === 2 && rows(w).length === 2);
    const r2 = rows(w)[1].querySelector('input'); r2.value = '1'; r2.dispatchEvent(new w.Event('input'));
    t('one slider moves every video and every slider label', log.gains[0].gain.value === 1 && log.gains[1].gain.value === 1 && rows(w)[0].querySelector('input').value === '1');
    // 5. saved level is used on the next visit
    w = page({ 'orbit.vboost.gain': '1.5' }); const v3 = mk(w, '/public-videos/c.mp4'); v3.dispatchEvent(new w.Event('play', { bubbles: true })); await tick(30);
    t('saved level 1.5x is used next time', log.gains[log.gains.length - 1].gain.value === 1.5);
    w = page({ 'orbit.vboost.gain': '99' });
    t('saved junk above 4 is cut to 4', w.VBoost.getLevel() === 4);
    w = page({ 'orbit.vboost.gain': 'abc' });
    t('saved junk text falls back to 3x', w.VBoost.getLevel() === 3);
    // 6. another-site video that cannot be boosted never shows a slider
    w = page(); const x = mk(w, b2); await tick(20); x.removeAttribute('crossorigin'); x.dispatchEvent(new w.Event('play', { bubbles: true })); await tick(30);
    t('another-site video without CORS: not boosted, no slider', rows(w).length === 0);
    t('vboost.js has no innerHTML / eval / document.write (numbers.test rule)', !/innerHTML|eval\(|document\.write/.test(fs.readFileSync(path.join(ROOT, 'public/vboost.js'), 'utf8')));
  })();
}
function finish() { console.log('\n' + pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0); }
if (!JSDOM) finish();
