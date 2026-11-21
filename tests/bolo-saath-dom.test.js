// The "সাথে বলো" (Saath me bolo) topic chip in a fake browser (jsdom), with the real saath-core.js and saath.js. The Byanjan topic must stay exactly as it was; the chip has its own
// Start button (41 letters, one teacher recording), tells the child why Start is missing, hands the parent's code to the recorder and cancels it when the topic changes. Skipped when jsdom is missing.
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
let JSDOM = null; try { ({ JSDOM } = require('jsdom')); } catch (e) {}
let pass = 0, fail = 0;
const t = (name, ok, extra) => { if (ok) pass++; else { fail++; console.log('FAIL  ' + name + (extra ? '  ' + extra : '')); } };
if (!JSDOM) { console.log('SKIP  jsdom not installed (npm i -D jsdom) - Saath me bolo click tests not run'); console.log('0 passed, 0 failed'); process.exit(0); }
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
  w.eval(rd('bolo-core.js')); w.eval(rd('bolorec-core.js')); w.eval(rd('saath-core.js')); w.eval(rd('saath.js')); w.eval(rd('byanjan-video.js'));
  const real = w.SAATH; let running = false; w.__stops = 0;   // the real screen, but a fake recorder: start/stop are only recorded
  w.SAATH = Object.assign({}, real, { start(o) { w.__o = o; running = true; real._state().phase = 'run'; w.draw(); }, stop() { w.__stops++; running = false; real._reset(); }, running: () => running });
  w.eval(rd('bolo.js'));
  w.Audio = class { play() { return Promise.resolve(); } pause() {} };
  w.eval('draw()');
  return { w, d: w.document, txt: () => w.document.getElementById('app').textContent, q: s => w.document.querySelector(s), click(s) { const e = w.document.querySelector(s); e && e.click(); } };
}
const tick = () => new Promise(r => setTimeout(r, 20));

(async () => {
  let b = boot({ rec: true }, 'ABCD2345');
  const chip = [...b.d.querySelectorAll('.bl-chips [data-bl=mode]')].find(x => x.dataset.v === 'saath');
  t('a topic chip সাথে বলো exists, after ব্যঞ্জন', !!chip && chip.textContent === 'সাথে বলো' && [...b.d.querySelectorAll('.bl-chips [data-bl=mode]')].map(x => x.dataset.v).join() === 'alpha,table,poem,byanjan,saath,asvyanjan,abc,abclv,numg,numlv');
  b.click('[data-bl=mode][data-v=byanjan]');
  t('Byanjan topic is untouched: no Start button, its own buttons stay the same', !b.q('[data-bl=auto]') && !b.q('[data-bl=autostop]') && [...b.d.querySelectorAll('.bl-stage button')].map(x => x.dataset.bl).join() === 'next,self,self' && !!b.q('.bl-stage'));
  b.click('[data-bl=mode][data-v=saath]');
  t('Saath topic: Start button, no mic and no skip arrow, all 41 letters in a grid', !!b.q('[data-bl=auto]') && !b.q('[data-bl=mic]') && !b.q('[data-bl=next]') && /\/ 41/.test(b.txt()) && b.d.querySelectorAll('#saGrid .sa-c[data-i]').length === 41);
  t('the grid is laid out in rows of 5 and 4: 41 letters + 4 hidden padding cells', b.d.querySelectorAll('#saGrid .sa-c').length === 45 && b.d.querySelectorAll('#saGrid .sa-c.e').length === 4);
  b.click('[data-bl=auto]'); await tick();
  t('Start hands the recorder the parent code and the redraw hook', b.w.__o && b.w.__o.code === 'ABCD2345' && typeof b.w.__o.redraw === 'function' && typeof b.w.__o.api === 'function');
  t('while running only Rok do is on screen', !!b.q('[data-bl=autostop]') && !b.q('[data-bl=auto]') && /Saath me bolo/.test(b.txt()));
  b.click('[data-bl=autostop]'); await tick();
  t('Rok do stops the recorder', b.w.__stops >= 1);
  b.click('[data-bl=mode][data-v=byanjan]'); b.click('[data-bl=mode][data-v=saath]');
  t('back on the topic: Start is there again', !!b.q('[data-bl=auto]'));

  b = boot({ rec: false }, 'ABCD2345');
  b.click('[data-bl=mode][data-v=saath]');
  t('no parent tick: no Start button, a clear line says what to do', !b.q('[data-bl=auto]') && /Parent ke liye/.test(b.txt()) && /tick/.test(b.txt()));
  b = boot({ rec: true }, '');
  b.click('[data-bl=mode][data-v=saath]');
  t('no Kid-mode code: no Start button, a clear line says why', !b.q('[data-bl=auto]') && /Kid mode/.test(b.txt()));
  b = boot({ rec: true, mic: false }, 'ABCD2345');
  b.click('[data-bl=mode][data-v=saath]');
  t('parent switched the mic off: no Start button', !b.q('[data-bl=auto]') && /mic band/.test(b.txt()));

  b = boot({ rec: true }, 'ABCD2345'); b.click('[data-bl=mode][data-v=saath]'); b.click('[data-bl=auto]'); await tick();
  const before = b.w.__stops;
  b.click('[data-bl=mode][data-v=alpha]'); await tick();
  t('changing the topic while it runs stops the recorder', b.w.__stops > before);
  b = boot({ rec: true }, 'ABCD2345'); b.click('[data-bl=mode][data-v=saath]'); b.click('[data-bl=auto]'); await tick();
  b.w.BOLO.leave();
  t('leaving the Bolo screen while it runs stops the recorder', b.w.__stops >= 1);

  console.log(pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
})();
