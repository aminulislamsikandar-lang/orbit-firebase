// The "Jahaz" (Orbit Jahaz plane game) topic chip in a fake browser (jsdom): it is a tile like the others, the game is only inside the Bolo page (a full-screen srcdoc iframe made from
// public/jahaz-game.js), there is NO separate page address for it, and its back arrow closes it. Skipped when jsdom is missing.
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
let JSDOM = null; try { ({ JSDOM } = require('jsdom')); } catch (e) {}
let pass = 0, fail = 0;
const t = (name, ok, extra) => { if (ok) pass++; else { fail++; console.log('FAIL  ' + name + (extra ? '  ' + extra : '')); } };
if (!JSDOM) { console.log('SKIP  jsdom not installed (npm i -D jsdom) - Chhobi saath me bolo click tests not run'); console.log('0 passed, 0 failed'); process.exit(0); }
const rd = f => fs.readFileSync(path.join(ROOT, 'public', f), 'utf8');

function boot(set, code) {
  const dom = new JSDOM('<!doctype html><body><div id="app"></div></body>', { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://orbittutorial.web.app/' });
  const w = dom.window;
  w.eval('var VIEW="bolo",USER={uid:"u1"};function draw(){document.getElementById("app").innerHTML=BOLO.viewHTML()}');
  Object.defineProperty(w, 'crypto', { value: require('crypto').webcrypto, configurable: true }); w.TextEncoder = TextEncoder;
  w.speechSynthesis = { cancel() {}, speak() {}, speaking: false }; w.SpeechSynthesisUtterance = function (t) { this.text = t; };
  w.localStorage.setItem('orbit.bolo.u1', JSON.stringify({ set: Object.assign({ limit: 30, mic: true, rec: false }, set), prog: {}, days: {} }));
  w.api = async () => ({}); w.KIDLINK = { kidCode: () => code || '', touch() {}, kidPanelHTML: () => '' };
  w.BOLOREC = { can: () => true, run() {}, send: async () => {}, parentHTML: () => '', busy: () => false };
  w.eval(rd('bolo-core.js')); w.eval(rd('bolorec-core.js')); w.eval(rd('saath-core.js')); w.eval(rd('saath.js')); w.eval(rd('swarsaath-core.js')); w.eval(rd('swarsaath.js')); w.eval(rd('byanjanpic-core.js')); w.eval(rd('byanjanpic.js')); w.eval(rd('jahaz-game.js')); w.eval(rd('byanjan-video.js')); w.eval(rd('swarborno.js'));
  // the real screens, but fake recorders: start/stop are only recorded (one pair for each of the three Saath tiles)
  w.__st = { s: 0, v: 0, p: 0 }; w.__o = null; w.__vo = null; w.__po = null;
  const mk = (real, key, setOpt) => { let running = false; return Object.assign({}, real, { start(o) { w[setOpt] = o; running = true; real._state().phase = 'run'; w.draw(); }, stop() { w.__st[key]++; running = false; real._reset(); }, running: () => running }); };
  w.SAATH = mk(w.SAATH, 's', '__o'); w.SWARSAATH = mk(w.SWARSAATH, 'v', '__vo'); w.BYANJANPIC = mk(w.BYANJANPIC, 'p', '__po');
  w.eval(rd('bolo.js'));
  w.Audio = class { play() { return Promise.resolve(); } pause() {} };
  w.eval('draw()');
  return { w, d: w.document, txt: () => w.document.getElementById('app').textContent, q: s => w.document.querySelector(s), click(s) { const e = w.document.querySelector(s); e && e.click(); } };
}
const tick = () => new Promise(r => setTimeout(r, 20));
const CH = '.bl-chips [data-bl=mode]';

(async () => {
  let b = boot({ rec: true }, '');
  const chips = [...b.d.querySelectorAll(CH)], jc = chips.find(x => x.dataset.v === 'jahaz');
  t('a Jahaz chip exists and is the last of all', !!jc && jc.textContent === 'Jahaz' && chips[chips.length - 1] === jc);
  jc.click(); await tick();
  const btn = b.q('[data-bl=jahazopen]');
  t('the Jahaz card has one button to open the game, and no iframe yet', !!btn && !b.d.getElementById('blJahaz'));
  btn.click(); await tick();
  const f = b.d.getElementById('blJahaz');
  t('the game opens full screen in an iframe built from srcdoc (not from an address)', !!f && f.tagName === 'IFRAME' && !f.getAttribute('src') && /Orbit Jahaz/.test(f.getAttribute('srcdoc') || '') && /position:\s*fixed/.test(f.style.cssText));
  btn.click(); await tick();
  t('pressing the button again does not open a second game', b.d.querySelectorAll('#blJahaz').length === 1);
  b.w.dispatchEvent(new b.w.MessageEvent('message', { data: 'orbit-jahaz-close', source: null }));
  t('a close message from anything but the game itself is ignored', !!b.d.getElementById('blJahaz'));
  b.w.dispatchEvent(new b.w.MessageEvent('message', { data: 'orbit-jahaz-close', source: f.contentWindow }));
  t('the close message from the game removes the iframe', !b.d.getElementById('blJahaz'));
  btn.click(); await tick(); b.w.BOLO.leave();
  t('leaving the Bolo page closes the game too', !b.d.getElementById('blJahaz'));
  t('the activity label for the mentor says Jahaz', (b.w.BOLO.activity() || '') === 'Jahaz');
  const idx = rd('index.html'), sw = rd('sw.js'), game = rd('jahaz-game.js');
  t('index.html loads jahaz-game.js before bolo.js, and the service worker keeps it for offline use', idx.indexOf('/jahaz-game.js') > 0 && idx.indexOf('/jahaz-game.js') < idx.indexOf('/bolo.js') && sw.includes("'/jahaz-game.js'"));
  t('there is no separate plane-game page any more, and nothing links to it', !fs.existsSync(path.join(ROOT, 'public', 'plane-game.html')) && !/plane-game/.test(idx + sw + rd('bolo.js')));
  t('the game asks its parent to close (back arrow) and never builds HTML with innerHTML', /orbit-jahaz-close/.test(game) && !/\.innerHTML\s*=/.test(game));
  console.log(pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
})();
