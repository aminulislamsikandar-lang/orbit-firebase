// Two additions: (1) the daily Bolo limit can go up to 10 hours (600 min) in the same place as before; (2) a parent slider says how loud the child must be
// for a letter to turn green in Saath me bolo. Skipped (jsdom part) when jsdom is missing.
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/\r\n/g, '\n');
let pass = 0, fail = 0;
const t = (name, ok, extra) => { if (ok) pass++; else { fail++; console.log('FAIL  ' + name + (extra ? '  ' + extra : '')); } };
const K = require(path.join(ROOT, 'public', 'saath-core.js'));

// the loudness steps
t('step 3 (Normal) keeps the old level: x1', K.mult(3) === 1);
t('five steps, each stricter than the one before', K.SENS.length === 5 && K.SENS.every((m, i) => i === 0 || m > K.SENS[i - 1]));
t('out-of-range or missing value falls back to 3 / is clamped', K.vol(undefined) === 3 && K.vol('x') === 3 && K.vol(0) === 1 && K.vol(99) === 5 && K.mult(99) === K.SENS[4]);

// Firestore rules: parent may write vol 1..5 and a limit up to 600
const rules = rd('firestore.rules');
t('rules: limit up to 600, still a multiple of 5', /limit <= 600 && request\.resource\.data\.limit % 5 == 0/.test(rules) && !/limit <= 30\b/.test(rules));
t('rules: vol is allowed, optional, an int from 1 to 5', /hasOnly\(\['limit', 'mic', 'rec', 'vol', 'rev', 'at'\]\)/.test(rules) && /'vol' in request\.resource\.data\) \|\| \(request\.resource\.data\.vol is int && request\.resource\.data\.vol >= 1 && request\.resource\.data\.vol <= 5/.test(rules));
const kl = rd('public/kidlink.js');
t('parent phone: limit slider goes to 600, the new loudness slider is there, and it is saved with the other settings', /data-kl-lim[^>]*type="range" min="5" max="600" step="5"/.test(kl) && /data-kl-vol=/.test(kl) && /vol: patch\.vol != null \? patch\.vol : \(cur\.vol \|\| 3\)/.test(kl) && /vol: r\.vol/.test(kl));
t('nothing was removed from the parent card: mic switch, recording switch, recordings list and leave button are still there', /data-kl-mic=/.test(kl) && /data-kl-rec=/.test(kl) && /BOLOREC\.parentHTML/.test(kl) && /data-kl="leave"/.test(kl));

let JSDOM = null; try { ({ JSDOM } = require('jsdom')); } catch (e) {}
function boot(set) {
  const dom = new JSDOM('<!doctype html><body><div id="app"></div></body>', { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://orbittutorial.web.app/' });
  const w = dom.window, r = f => rd('public/' + f);
  w.eval('var VIEW="bolo",USER={uid:"u1"};function draw(){document.getElementById("app").innerHTML=BOLO.viewHTML()}');
  Object.defineProperty(w, 'crypto', { value: require('crypto').webcrypto, configurable: true }); w.TextEncoder = TextEncoder;
  w.speechSynthesis = { cancel() {}, speak() {}, speaking: false }; w.SpeechSynthesisUtterance = function (t) { this.text = t; };
  w.localStorage.setItem('orbit.bolo.u1', JSON.stringify({ set: Object.assign({ limit: 30, mic: true, rec: true }, set), prog: {}, days: {} }));
  w.api = async () => ({}); w.KIDLINK = { kidCode: () => 'ABCD2345', touch() {}, kidPanelHTML: () => '' };
  w.BOLOREC = { can: () => true, run() {}, send: async () => {}, parentHTML: () => '', busy: () => false };
  w.eval(r('bolo-core.js')); w.eval(r('bolorec-core.js')); w.eval(r('saath-core.js')); w.eval(r('saath.js')); w.eval(r('byanjan-video.js'));
  const real = w.SAATH; w.__starts = [];
  w.SAATH = Object.assign({}, real, { start(o) { w.__starts.push(o); }, stop() {}, running: () => false });
  w.eval(r('bolo.js')); w.Audio = class { play() { return Promise.resolve(); } pause() {} };
  w.eval('draw()');
  return { w, d: w.document, real, q: s => w.document.querySelector(s), saved: () => JSON.parse(w.localStorage.getItem('orbit.bolo.u1')) };
}
const fire = (w, el, type) => el.dispatchEvent(new w.Event(type, { bubbles: true }));

(async () => {
  if (!JSDOM) { console.log('SKIP  jsdom not installed - page tests not run'); console.log(pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0); }
  let b = boot({ limit: 600, vol: 5 });
  t('Bolo page: the limit slider is the same one, now up to 600, and 600 shows as 10 ghante', b.q('#blLim').max === '600' && b.q('#blLim').value === '600' && b.q('#blLimV').textContent === '10 ghante');
  b.q('#blLim').value = '90'; fire(b.w, b.q('#blLim'), 'input');
  t('while dragging, the label reads 1 ghante 30 min', b.q('#blLimV').textContent === '1 ghante 30 min');
  fire(b.w, b.q('#blLim'), 'change');
  t('the new limit is saved', b.saved().set.limit === 90);
  b = boot({ limit: 5000 });
  t('a saved limit above 10 hours is shown as 10 ghante (cut to 600)', b.q('#blLim').value === '600' && b.q('#blLimV').textContent === '10 ghante');
  b.w.BOLO.applyRemote({ limit: 5000 });
  t('parent sends 5000: the child phone keeps 600 at most', b.saved().set.limit === 600);
  b.w.BOLO.applyRemote({ limit: 600, vol: 4 });
  t('parent sends limit 600 and loudness 4: both are applied', b.saved().set.limit === 600 && b.saved().set.vol === 4);
  b.w.BOLO.applyRemote({ vol: 99 });
  t('loudness is kept between 1 and 5', b.saved().set.vol === 5);

  b = boot({ vol: 2 });
  t('Parent ke liye on the child phone: loudness slider after the recording tick, saved value shown', !!b.q('#blVol') && b.q('#blVol').value === '2' && b.q('#blVolV').textContent === 'Halka');
  t('the older parent items are all still there', !!b.q('#blLim') && !!b.q('#blMc') && !!b.q('#blRc') && /Aaj boli gayi cheezein/.test(b.d.getElementById('app').textContent));
  b.q('#blVol').value = '5'; fire(b.w, b.q('#blVol'), 'input');
  t('moving the loudness slider changes its label', b.q('#blVolV').textContent === 'Bahut tez');
  fire(b.w, b.q('#blVol'), 'change');
  t('the loudness is saved', b.saved().set.vol === 5);
  t('default for a child with nothing saved is 3 (Normal)', boot({}).q('#blVol').value === '3');

  // Start passes the loudness on; the screen shows where the line is
  b = boot({ vol: 4 });
  const chip = [...b.d.querySelectorAll('.bl-chips [data-bl=mode]')].find(x => x.dataset.v === 'saath'); chip.click();
  const mk = () => +b.q('#saMk').style.left.replace('%', '');
  t('Saath screen: the line sits at 35% x multiplier (Tez = 56%)', Math.abs(mk() - 56) < 0.2, String(mk()));
  b.q('[data-bl=auto]').click();
  t('Start passes the loudness step to the recorder', b.w.__starts.length === 1 && b.w.__starts[0].sens === 4);
  b = boot({ vol: 1 }); [...b.d.querySelectorAll('.bl-chips [data-bl=mode]')].find(x => x.dataset.v === 'saath').click();
  t('Bahut halka puts the line at 14%', Math.abs(+b.q('#saMk').style.left.replace('%', '') - 14) < 0.2);
  b = boot({}); [...b.d.querySelectorAll('.bl-chips [data-bl=mode]')].find(x => x.dataset.v === 'saath').click();
  t('Normal keeps the line at 35%, where the old green started', Math.abs(+b.q('#saMk').style.left.replace('%', '') - 35) < 0.2);

  // the recorder code: the parent's step scales the room level; the bar scale does not change with the slider
  const sa = rd('public/saath.js');
  t('recorder: threshold = room level x 2.5 x the parent multiplier, and the bar is drawn against the unscaled level', /const base = BC\.threshold\(peak\), thr = base \* S\.mult;/.test(sa) && /Math\.min\(100, l \/ base \* 35\)/.test(sa) && /l > thr\) S\.voiced\[i\] \+= dt/.test(sa));
  t('recording, red alerts and the 41-letter grid are unchanged (still the same calls)', /S\.cells\[k\] = ok \? 1 : 2/.test(sa) && /BOLOREC\.send/.test(sa) && /K\.letterAt\(t\)/.test(sa));
  console.log(pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('FAIL  crashed -> ' + (e && e.stack || e)); process.exit(1); });
