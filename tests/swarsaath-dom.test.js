// The "স্বৰ সাথে বলো" (Swar saath me bolo) topic chip in a fake browser (jsdom), with the real swarsaath-core.js / swarsaath.js. It is an extra tile: Saath me bolo, Byanjan and Swar-borno must stay exactly as they were.
// The tile has its own Start button (11 vowels, one teacher recording, picture + word), tells the child why Start is missing, hands the parent's code to the recorder and cancels it when the topic changes.
// Without a parent code it is practice. Skipped when jsdom is missing.
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
let JSDOM = null; try { ({ JSDOM } = require('jsdom')); } catch (e) {}
let pass = 0, fail = 0;
const t = (name, ok, extra) => { if (ok) pass++; else { fail++; console.log('FAIL  ' + name + (extra ? '  ' + extra : '')); } };
if (!JSDOM) { console.log('SKIP  jsdom not installed (npm i -D jsdom) - Swar saath me bolo click tests not run'); console.log('0 passed, 0 failed'); process.exit(0); }
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
  w.eval(rd('bolo-core.js')); w.eval(rd('bolorec-core.js')); w.eval(rd('saath-core.js')); w.eval(rd('saath.js')); w.eval(rd('swarsaath-core.js')); w.eval(rd('swarsaath.js')); w.eval(rd('byanjan-video.js')); w.eval(rd('swarborno.js'));
  // the real screens, but fake recorders: start/stop are only recorded (one pair for Saath me bolo, one for the new tile)
  w.__stops = 0; w.__sstops = 0; w.__o = null; w.__so = null; let running = false, srunning = false;
  const real = w.SAATH, sreal = w.SWARSAATH;
  w.SAATH = Object.assign({}, real, { start(o) { w.__o = o; running = true; real._state().phase = 'run'; w.draw(); }, stop() { w.__stops++; running = false; real._reset(); }, running: () => running });
  w.SWARSAATH = Object.assign({}, sreal, { start(o) { w.__so = o; srunning = true; sreal._state().phase = 'run'; w.draw(); }, stop() { w.__sstops++; srunning = false; sreal._reset(); }, running: () => srunning });
  w.eval(rd('bolo.js'));
  w.Audio = class { play() { return Promise.resolve(); } pause() {} };
  w.eval('draw()');
  return { w, d: w.document, txt: () => w.document.getElementById('app').textContent, q: s => w.document.querySelector(s), click(s) { const e = w.document.querySelector(s); e && e.click(); } };
}
const tick = () => new Promise(r => setTimeout(r, 20));
const CH = '.bl-chips [data-bl=mode]';

(async () => {
  let b = boot({ rec: true }, 'ABCD2345');
  const chips = [...b.d.querySelectorAll(CH)];
  const chip = chips.find(x => x.dataset.v === 'swarsaath');
  t('a topic chip স্বৰ সাথে বলো exists, right after স্বৰ-বৰ্ণ, and the old chips are unchanged', !!chip && chip.textContent === 'স্বৰ সাথে বলো' && chips.map(x => x.dataset.v).join() === 'alpha,table,poem,byanjan,saath,asvyanjan,abc,abclv,numg,numlv,numct,suno,swar,swarsaath,abcsaath' && chips.find(x => x.dataset.v === 'swar').textContent === 'স্বৰ-বৰ্ণ' && chips.find(x => x.dataset.v === 'saath').textContent === 'সাথে বলো');

  // the other tiles are untouched
  b.click('[data-bl=mode][data-v=swar]');
  t('Swar-borno topic is untouched: its own page, none of the new tile', !!b.q('#swar-root') && !b.q('[data-bl=sauto]') && !b.q('#ssGrid'));
  b.click('[data-bl=mode][data-v=byanjan]');
  t('Byanjan topic is untouched: no Start button of either tile', !b.q('[data-bl=auto]') && !b.q('[data-bl=sauto]') && [...b.d.querySelectorAll('.bl-stage button')].map(x => x.dataset.bl).join() === 'next,self,self');
  b.click('[data-bl=mode][data-v=saath]');
  t('Saath me bolo is untouched: its own Start (auto), 41 letters, none of the new tile', !!b.q('[data-bl=auto]') && !b.q('[data-bl=sauto]') && b.d.querySelectorAll('#saGrid .sa-c[data-i]').length === 41 && !b.q('#ssGrid'));

  b.click('[data-bl=mode][data-v=swarsaath]');
  t('new tile: its own Start button, no mic and no skip arrow, no Saath me bolo Start', !!b.q('[data-bl=sauto]') && !b.q('[data-bl=auto]') && !b.q('[data-bl=mic]') && !b.q('[data-bl=next]'));
  t('new tile: all 11 vowels in a grid of 6 + 5 (and one hidden padding cell)', /\/ 11/.test(b.txt()) && b.d.querySelectorAll('#ssGrid .ss-c[data-i]').length === 11 && b.d.querySelectorAll('#ssGrid .ss-c').length === 12 && b.d.querySelectorAll('#ssGrid .ss-c.e').length === 1);
  t('new tile: the picture and the word of the first vowel are on the screen', /swar-01\.webp/.test(b.q('#ssImg').getAttribute('src')) && b.q('#ssWord').textContent === 'অমিতা' && b.q('#ssBig').textContent === 'অ');
  b.click('[data-bl=sauto]'); await tick();
  t('Start hands the recorder the parent code and the redraw hook (and does not start Saath me bolo)', b.w.__so && b.w.__so.code === 'ABCD2345' && typeof b.w.__so.redraw === 'function' && typeof b.w.__so.api === 'function' && b.w.__o === null);
  t('while running only Rok do is on screen', !!b.q('[data-bl=sautostop]') && !b.q('[data-bl=sauto]') && /Saath me bolo/.test(b.txt()));
  b.click('[data-bl=sautostop]'); await tick();
  t('Rok do stops the new recorder only', b.w.__sstops >= 1 && b.w.__stops === 0);
  b.click('[data-bl=mode][data-v=byanjan]'); b.click('[data-bl=mode][data-v=swarsaath]');
  t('back on the tile: Start is there again', !!b.q('[data-bl=sauto]'));

  // Saath me bolo still starts its own recorder, not the new one
  b = boot({ rec: true }, 'ABCD2345'); b.click('[data-bl=mode][data-v=saath]'); b.click('[data-bl=auto]'); await tick();
  t('Saath me bolo Start still starts only its own recorder', b.w.__o && b.w.__o.code === 'ABCD2345' && b.w.__so === null);

  // Start rules (the same as Saath me bolo)
  b = boot({ rec: false }, 'ABCD2345'); b.click('[data-bl=mode][data-v=swarsaath]');
  t('joined to a parent but no tick: no Start button, a clear line says what to do', !b.q('[data-bl=sauto]') && /Parent ke liye/.test(b.txt()) && /tick/.test(b.txt()));
  b = boot({ rec: true }, ''); b.click('[data-bl=mode][data-v=swarsaath]');
  t('no Kid-mode code: Start is there (practice)', !!b.q('[data-bl=sauto]'));
  b.click('[data-bl=sauto]'); await tick();
  t('practice: the recorder gets an empty code, so nothing is uploaded', b.w.__so && b.w.__so.code === '');
  b = boot({ rec: false }, ''); b.click('[data-bl=mode][data-v=swarsaath]'); b.click('[data-bl=sauto]'); await tick();
  t('no code and no tick: practice still starts with an empty code', b.w.__so && b.w.__so.code === '');
  b = boot({ rec: false, mic: false }, ''); b.click('[data-bl=mode][data-v=swarsaath]');
  t('mic switched off: no Start button, the reason is shown', !b.q('[data-bl=sauto]') && /mic band/.test(b.txt()));
  b = boot({ rec: true, mic: false }, 'ABCD2345'); b.click('[data-bl=mode][data-v=swarsaath]');
  t('parent switched the mic off: no Start button', !b.q('[data-bl=sauto]') && /mic band/.test(b.txt()));

  b = boot({ rec: true }, 'ABCD2345'); b.click('[data-bl=mode][data-v=swarsaath]'); b.click('[data-bl=sauto]'); await tick();
  const before = b.w.__sstops;
  b.click('[data-bl=mode][data-v=alpha]'); await tick();
  t('changing the topic while it runs stops the recorder', b.w.__sstops > before);
  b = boot({ rec: true }, 'ABCD2345'); b.click('[data-bl=mode][data-v=swarsaath]'); b.click('[data-bl=sauto]'); await tick();
  b.w.BOLO.leave();
  t('leaving the Bolo screen while it runs stops the recorder', b.w.__sstops >= 1);

  // wiring: scripts and offline list
  const idx = rd('index.html'), sw = rd('sw.js');
  t('index.html loads the two new scripts before bolo.js', idx.indexOf('/swarsaath-core.js') > 0 && idx.indexOf('/swarsaath-core.js') < idx.indexOf('/swarsaath.js') && idx.indexOf('/swarsaath.js') < idx.indexOf('/bolo.js'));
  t('the service worker keeps the two new scripts for offline use', sw.includes("'/swarsaath-core.js'") && sw.includes("'/swarsaath.js'"));
  console.log(pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
})();
