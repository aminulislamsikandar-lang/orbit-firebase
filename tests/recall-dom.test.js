// Recall AI voice recording in a fake browser (jsdom): Record / Stop button, running timer, text lands in the box, auto stop, mic permission error.
// Skipped when jsdom is not installed. Run: node tests/recall-dom.test.js
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
let JSDOM = null; try { ({ JSDOM } = require('jsdom')); } catch (e) {}
let pass = 0, fail = 0;
const t = (name, ok, extra) => { if (ok) pass++; else { fail++; console.log('FAIL  ' + name + (extra ? '  ' + extra : '')); } };
if (!JSDOM) { console.log('SKIP  jsdom not installed (npm i -D jsdom) - Recall voice tests not run'); console.log('0 passed, 0 failed'); process.exit(0); }
const src = fs.readFileSync(path.join(ROOT, 'public', 'recall.js'), 'utf8');

function boot(opts) {
  opts = opts || {};
  const dom = new JSDOM('<!doctype html><body><div id="app"></div></body>', { runScripts: 'outside-only', url: 'https://orbittutorial.web.app/', pretendToBeVisual: true });
  const w = dom.window, ticks = [], inst = [];
  w.setInterval = fn => { ticks.push(fn); return ticks.length; };
  w.clearInterval = id => { ticks[id - 1] = null; };
  if (!opts.noSR) w.SpeechRecognition = class { constructor() { inst.push(this); this.started = 0; this.stopped = 0; } start() { this.started++; } stop() { this.stopped++; } };
  w.eval('var USER={uid:"u1"};var DATA={courses:[{id:"c7-science",class:7,subject:"Science",chapters:[{no:1,title:"Nutrition in Plants"}]}]};function draw(){document.getElementById("app").innerHTML=RECALL.viewHTML()}');
  w.eval(src); w.eval('draw()');
  const d = w.document;
  const say = (r, text, final) => { const res = Object.assign([{ transcript: text }], { isFinal: !!final }); r.onresult({ resultIndex: 0, results: [res] }); };
  return { w, d, inst, say, click: sel => { const el = d.querySelector(sel); el && el.click(); }, tick: () => ticks.forEach(f => f && f()), timer: () => (d.getElementById('rcTimer') || {}).textContent, app: () => d.getElementById('app').textContent, box: () => d.getElementById('rcText') };
}

(function () {
  let b = boot();
  t('Record Voice button and a timer are on the screen', !!b.d.querySelector('[data-rc=rec]') && /Record Voice/.test(b.app()) && b.timer() === '0:00 / 2:00');
  t('the button is enabled when the browser can listen', !b.d.querySelector('[data-rc=rec]').disabled);
  b.click('[data-rc=rec]');
  t('recording starts: button says Stop, "Mic chalu hai" shows', !!b.d.querySelector('[data-rc=stop]') && /Mic chalu hai/.test(b.app()) && b.inst.length === 1 && b.inst[0].started === 1);
  t('recogniser is Hindi, continuous, with live text', b.inst[0].lang === 'hi-IN' && b.inst[0].continuous === true && b.inst[0].interimResults === true);
  b.say(b.inst[0], 'photosynthesis mein', true);
  t('spoken words land in the box', b.box().value.trim() === 'photosynthesis mein');
  b.say(b.inst[0], 'plants sunlight lete hain', false);
  t('live (not final) words show too', /plants sunlight lete hain/.test(b.box().value));
  b.tick(); b.tick(); b.tick();
  t('timer runs: 0:03 / 2:00', b.timer() === '0:03 / 2:00', b.timer());
  b.inst[0].onend();
  t('a silence break restarts listening while recording', b.inst[0].started === 2);
  b.click('[data-rc=stop]');
  t('Stop: button back to Record Voice, timer keeps the length', !!b.d.querySelector('[data-rc=rec]') && b.timer() === '0:03 / 2:00' && b.inst[0].stopped === 1);
  t('the typed text is kept after Stop', /photosynthesis mein/.test(b.box().value));
  b.click('[data-rc=rec]');
  b.say(b.inst[1], 'chlorophyll bhi', true);
  t('a second recording adds to the text', /photosynthesis mein/.test(b.box().value) && /chlorophyll bhi/.test(b.box().value));
  t('the second recording starts at 0:00', b.timer() === '0:00 / 2:00');
  for (let i = 0; i < 120; i++) b.tick();
  t('recording stops by itself at 2:00 with a message', !b.d.querySelector('[data-rc=stop]') && /Time poora hua/.test(b.app()) && b.timer() === '2:00 / 2:00', b.timer());

  b = boot(); b.click('[data-rc=rec]'); b.inst[0].onerror({ error: 'not-allowed' });
  t('mic permission refused: clear message, recording off', /ijazat nahi di/.test(b.app()) && !!b.d.querySelector('[data-rc=rec]'));
  b = boot(); b.click('[data-rc=rec]'); b.inst[0].onerror({ error: 'no-speech' });
  t('"no speech" does not stop the recording', !!b.d.querySelector('[data-rc=stop]'));

  b = boot(); b.d.getElementById('rcLang').value = 'en-IN'; b.d.getElementById('rcLang').dispatchEvent(new b.w.Event('change', { bubbles: true })); b.click('[data-rc=rec]');
  t('English can be chosen', b.inst[0].lang === 'en-IN');
  t('language cannot change while recording', b.d.getElementById('rcLang').disabled);

  b = boot(); b.click('[data-rc=rec]'); b.d.getElementById('app').innerHTML = '<p>other screen</p>'; b.tick();
  t('mic goes off when the screen is changed', b.inst[0].stopped === 1);

  b = boot(); b.click('[data-rc=rec]'); Object.defineProperty(b.d, 'hidden', { value: true, configurable: true }); b.d.dispatchEvent(new b.w.Event('visibilitychange'));
  t('mic goes off when the tab is hidden', b.inst[0].stopped === 1);

  b = boot({ noSR: true });
  t('no speech support: button disabled, message shown, typing still works', b.d.querySelector('[data-rc=rec]').disabled && /Chrome ya Edge/.test(b.app()) && !!b.box());

  b = boot(); b.click('[data-rc=rec]'); b.say(b.inst[0], 'x'.repeat(2000), true);
  t('voice text is cut at 1500 characters', b.box().value.length === 1500);

  console.log(pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})();
