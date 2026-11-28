// The "ছবিৰে সাথে বলো" (Saath me bolo with pictures) topic chip in a fake browser (jsdom), with the real byanjanpic-core.js / byanjanpic.js. It is an extra tile: Saath me bolo, Swar saath me bolo,
// Byanjan and Swar-borno must stay exactly as they were. The tile has its own Start button (41 letters, the Saath me bolo recording, picture + word), tells the child why Start is missing,
// hands the parent's code to the recorder and cancels it when the topic changes. Without a parent code it is practice. Skipped when jsdom is missing.
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
  w.eval(rd('bolo-core.js')); w.eval(rd('bolorec-core.js')); w.eval(rd('saath-core.js')); w.eval(rd('saath.js')); w.eval(rd('swarsaath-core.js')); w.eval(rd('swarsaath.js')); w.eval(rd('byanjanpic-core.js')); w.eval(rd('byanjanpic.js')); w.eval(rd('byanjan-video.js')); w.eval(rd('swarborno.js'));
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
  let b = boot({ rec: true }, 'ABCD2345');
  const chips = [...b.d.querySelectorAll(CH)];
  const chip = chips.find(x => x.dataset.v === 'byanjanpic');
  t('a topic chip ছবিৰে সাথে বলো exists, last of all, and the old chips are unchanged', !!chip && chip.textContent === 'ছবিৰে সাথে বলো' && chips.map(x => x.dataset.v).join() === 'alpha,table,poem,byanjan,saath,asvyanjan,abc,abclv,numg,numlv,numct,suno,swar,swarsaath,abcsaath,byanjanpic,jahaz' && chips.find(x => x.dataset.v === 'saath').textContent === 'সাথে বলো' && chips.find(x => x.dataset.v === 'swarsaath').textContent === 'স্বৰ সাথে বলো');

  // the other tiles are untouched
  b.click('[data-bl=mode][data-v=saath]');
  t('Saath me bolo is untouched: its own Start (auto), 41 letters, no picture, none of the new tile', !!b.q('[data-bl=auto]') && !b.q('[data-bl=bpauto]') && b.d.querySelectorAll('#saGrid .sa-c[data-i]').length === 41 && !b.q('#bpGrid') && !b.q('.sa-pic') && !b.q('#bpImg'));
  b.click('[data-bl=mode][data-v=swarsaath]');
  t('Swar saath me bolo is untouched: its own Start (sauto), 11 vowels, none of the new tile', !!b.q('[data-bl=sauto]') && !b.q('[data-bl=bpauto]') && b.d.querySelectorAll('#ssGrid .ss-c[data-i]').length === 11 && !b.q('#bpGrid'));
  b.click('[data-bl=mode][data-v=byanjan]');
  t('Byanjan topic is untouched: no Start button of any Saath tile', !b.q('[data-bl=auto]') && !b.q('[data-bl=sauto]') && !b.q('[data-bl=bpauto]'));

  b.click('[data-bl=mode][data-v=byanjanpic]');
  t('new tile: its own Start button, no Saath me bolo Start, no skip arrow', !!b.q('[data-bl=bpauto]') && !b.q('[data-bl=auto]') && !b.q('[data-bl=sauto]') && !b.q('[data-bl=next]'));
  t('new tile: all 41 letters in the same rows of 5 and 4 as Saath me bolo', /\/ 41/.test(b.txt()) && b.d.querySelectorAll('#bpGrid .bp-c[data-i]').length === 41 && b.d.querySelectorAll('#bpGrid .bp-c.e').length === 4 && b.d.querySelectorAll('#bpGrid .bp-g > *, #bpGrid > *').length === 45);
  t('new tile: the letter ক with the picture and the word কল (bp-01) is on the screen', /bp-01\.webp/.test(b.q('#bpImg').getAttribute('src')) && b.q('#bpWord').textContent === 'কল' && b.q('#bpBig').textContent === 'ক' && !b.q('#bpImg').hidden);
  b.click('[data-bl=bpauto]'); await tick();
  t('Start hands the recorder the parent code and the redraw hook (and does not start the other two tiles)', b.w.__po && b.w.__po.code === 'ABCD2345' && typeof b.w.__po.redraw === 'function' && typeof b.w.__po.api === 'function' && b.w.__o === null && b.w.__vo === null);
  t('while running only Rok do is on screen', !!b.q('[data-bl=bpautostop]') && !b.q('[data-bl=bpauto]') && /Saath me bolo/.test(b.txt()));
  b.click('[data-bl=bpautostop]'); await tick();
  t('Rok do stops the new recorder only', b.w.__st.p >= 1 && b.w.__st.s === 0 && b.w.__st.v === 0);
  b.click('[data-bl=mode][data-v=byanjan]'); b.click('[data-bl=mode][data-v=byanjanpic]');
  t('back on the tile: Start is there again', !!b.q('[data-bl=bpauto]'));

  // the other two tiles still start their own recorder only
  b = boot({ rec: true }, 'ABCD2345'); b.click('[data-bl=mode][data-v=saath]'); b.click('[data-bl=auto]'); await tick();
  t('Saath me bolo Start still starts only its own recorder', b.w.__o && b.w.__o.code === 'ABCD2345' && b.w.__po === null && b.w.__vo === null);
  b = boot({ rec: true }, 'ABCD2345'); b.click('[data-bl=mode][data-v=swarsaath]'); b.click('[data-bl=sauto]'); await tick();
  t('Swar saath me bolo Start still starts only its own recorder', b.w.__vo && b.w.__vo.code === 'ABCD2345' && b.w.__po === null && b.w.__o === null);

  // Start rules (the same as Saath me bolo)
  b = boot({ rec: false }, 'ABCD2345'); b.click('[data-bl=mode][data-v=byanjanpic]');
  t('joined to a parent but no tick: no Start button, a clear line says what to do', !b.q('[data-bl=bpauto]') && /Parent ke liye/.test(b.txt()) && /tick/.test(b.txt()));
  b = boot({ rec: true }, ''); b.click('[data-bl=mode][data-v=byanjanpic]');
  t('no Kid-mode code: Start is there (practice)', !!b.q('[data-bl=bpauto]'));
  b.click('[data-bl=bpauto]'); await tick();
  t('practice: the recorder gets an empty code, so nothing is uploaded', b.w.__po && b.w.__po.code === '');
  b = boot({ rec: false }, ''); b.click('[data-bl=mode][data-v=byanjanpic]'); b.click('[data-bl=bpauto]'); await tick();
  t('no code and no tick: practice still starts with an empty code', b.w.__po && b.w.__po.code === '');
  b = boot({ rec: false, mic: false }, ''); b.click('[data-bl=mode][data-v=byanjanpic]');
  t('mic switched off: no Start button, the reason is shown', !b.q('[data-bl=bpauto]') && /mic band/.test(b.txt()));

  b = boot({ rec: true }, 'ABCD2345'); b.click('[data-bl=mode][data-v=byanjanpic]'); b.click('[data-bl=bpauto]'); await tick();
  const before = b.w.__st.p;
  b.click('[data-bl=mode][data-v=alpha]'); await tick();
  t('changing the topic while it runs stops the recorder', b.w.__st.p > before);
  b = boot({ rec: true }, 'ABCD2345'); b.click('[data-bl=mode][data-v=byanjanpic]'); b.click('[data-bl=bpauto]'); await tick();
  b.w.BOLO.leave();
  t('leaving the Bolo screen while it runs stops the recorder', b.w.__st.p >= 1);

  // wiring: scripts, offline list and the cache header of the pictures
  const idx = rd('index.html'), sw = rd('sw.js'), fb = JSON.parse(fs.readFileSync(path.join(ROOT, 'firebase.json'), 'utf8'));
  t('index.html loads the two new scripts after saath-core.js and before bolo.js', idx.indexOf('/saath-core.js') < idx.indexOf('/byanjanpic-core.js') && idx.indexOf('/byanjanpic-core.js') < idx.indexOf('/byanjanpic.js') && idx.indexOf('/byanjanpic.js') < idx.indexOf('/bolo.js'));
  t('the service worker keeps the two new scripts for offline use', sw.includes("'/byanjanpic-core.js'") && sw.includes("'/byanjanpic.js'"));
  const hdr = JSON.stringify(fb.hosting.headers || []);
  t('firebase.json gives the pictures the same one-week cache header as the Swar pictures', /"source":"\/byanjan-pic\/\*\*"/.test(hdr) && /"source":"\/swar\/\*\*"/.test(hdr));
  console.log(pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
})();
