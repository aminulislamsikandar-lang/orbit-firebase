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
    finish();
  }, 30);
}
function finish() { console.log('\n' + pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0); }
if (!JSDOM) finish();
