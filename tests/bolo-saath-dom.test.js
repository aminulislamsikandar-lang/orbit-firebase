// The "সাথে বলো" (Saath me bolo) topic chip in a fake browser (jsdom). The Byanjan topic must stay exactly as it was; the new chip has its own Start button,
// tells the child why Start is missing, shows a red alert for a silent letter and a note when the recording has gone to the parent. Skipped when jsdom is missing.
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
  w.KIDLINK = { kidCode: () => code || '', touch() {}, kidPanelHTML: () => '' };
  w.BOLOREC = { can: () => true, run: o => new Promise(res => { w.__o = o; w.__res = res; }), parentHTML: () => '', busy: () => false };
  w.eval(rd('bolo-core.js')); w.eval(rd('byanjan-video.js')); w.eval(rd('bolo.js'));
  w.Audio = class { play() { return Promise.resolve(); } pause() {} };
  w.eval('draw()');
  return { w, d: w.document, txt: () => w.document.getElementById('app').textContent, q: s => w.document.querySelector(s), click(s) { const e = w.document.querySelector(s); e && e.click(); } };
}
const tick = () => new Promise(r => setTimeout(r, 20));

(async () => {
  let b = boot({ rec: true }, 'ABCD2345');
  const chip = [...b.d.querySelectorAll('.bl-chips [data-bl=mode]')].find(x => x.dataset.v === 'saath');
  t('a new topic chip সাথে বলো exists, after ব্যঞ্জন', !!chip && chip.textContent === 'সাথে বলো' && [...b.d.querySelectorAll('.bl-chips [data-bl=mode]')].map(x => x.dataset.v).join() === 'alpha,table,poem,byanjan,saath,asvyanjan');
  b.click('[data-bl=mode][data-v=byanjan]');
  t('Byanjan topic is untouched: no Start button, its own buttons stay the same', !b.q('[data-bl=auto]') && !b.q('[data-bl=autostop]') && [...b.d.querySelectorAll('.bl-stage button')].map(x => x.dataset.bl).join() === 'next,self,self' && !!b.q('.bl-stage'));
  b.click('[data-bl=mode][data-v=saath]');
  t('Saath topic: Start button, no mic and no skip arrow, same 40 letters', !!b.q('[data-bl=auto]') && !b.q('[data-bl=mic]') && !b.q('[data-bl=next]') && /\/ 40/.test(b.txt()));
  b.click('[data-bl=auto]'); await tick();
  t('while running only Rok do is on screen', !!b.q('[data-bl=autostop]') && !b.q('[data-bl=auto]') && /Saath-saath/.test(b.txt()));
  b.w.__o.step(0); b.w.__o.silent(0); await tick();
  t('a silent letter shows a red alert with the letter', /Red alert/.test(b.txt()) && !!b.q('[role=alert]') && b.q('[role=alert]').textContent.includes('ক'));
  t('the run was given the parent code and 40 letters with clip lengths', b.w.__o.code === 'ABCD2345' && b.w.__o.items.length === 40 && b.w.__o.clipMs(0) > 0);
  b.w.__res({ letters: [{}], silent: 1, sent: true, err: '' }); await tick();
  t('after the run: a note says the recording went to the parent, Start is back', /Recording parent ko bhej di/.test(b.txt()) && /1 letter/.test(b.txt()) && !!b.q('[data-bl=auto]'));
  b.click('[data-bl=mode][data-v=byanjan]'); b.click('[data-bl=mode][data-v=saath]');

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
  b.click('[data-bl=mode][data-v=alpha]'); await tick();
  t('changing the topic while it runs cancels the run', b.w.__o.cancelled() === true);

  console.log(pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
})();
