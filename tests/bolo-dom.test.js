// Orbit Bolo in a fake browser (jsdom): real clicks, a fake speech recogniser, daily limit, PIN, mic off. Skipped when jsdom is not installed.
// Run: node tests/bolo-dom.test.js
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
let JSDOM = null; try { ({ JSDOM } = require('jsdom')); } catch (e) {}
let pass = 0, fail = 0;
const t = (name, ok, extra) => { if (ok) pass++; else { fail++; console.log('FAIL  ' + name + (extra ? '  ' + extra : '')); } };
if (!JSDOM) { console.log('SKIP  jsdom not installed (npm i -D jsdom) - Bolo click tests not run'); console.log('0 passed, 0 failed'); process.exit(0); }
const rd = f => fs.readFileSync(path.join(ROOT, 'public', f), 'utf8');

function boot(opts) {
  opts = opts || {};
  const dom = new JSDOM('<!doctype html><body><div id="app"></div></body>', { runScripts: 'outside-only', url: 'https://orbittutorial.web.app/' });
  const w = dom.window;
  w.eval('var VIEW="bolo",USER={uid:"u1"};function draw(){document.getElementById("app").innerHTML=BOLO.viewHTML()}');
  const heard = { next: ['a for apple'], started: 0, aborted: 0 };
  if (!opts.noSR) w.SpeechRecognition = class {
    start() { heard.started++; setTimeout(() => { if (this.onresult) this.onresult({ results: [[...heard.next.map(x => ({ transcript: x }))]] }); }, 0); }
    stop() {} abort() { heard.aborted++; }
  };
  Object.defineProperty(w, 'crypto', { value: require('crypto').webcrypto, configurable: true }); w.TextEncoder = TextEncoder;
  w.speechSynthesis = { cancel() {}, speak() {}, speaking: false }; w.SpeechSynthesisUtterance = function (t) { this.text = t; };
  if (opts.store) w.localStorage.setItem('orbit.bolo.u1', JSON.stringify(opts.store));
  w.eval(rd('bolo-core.js')); w.eval(rd('bolo.js'));
  w.eval('draw()');
  return { w, d: w.document, heard, click: sel => { const el = w.document.querySelector(sel); el && el.click(); }, txt: () => w.document.getElementById('app').textContent, wait: () => new Promise(r => setTimeout(r, 20)) };
}

(async () => {
  let b = boot();
  t('screen shows title, big letter A and the privacy line', /Bolo/.test(b.txt()) && b.d.querySelector('.bl-big').textContent === 'A' && /Awaaz save nahi hoti/.test(b.txt()));
  t('mic button is enabled', !b.d.querySelector('[data-bl=mic]').disabled);
  b.click('[data-bl=mic]'); await b.wait();
  t('right answer shows Shabaash and marks A done', /Shabaash/.test(b.txt()) && /1 \/ 26 sahi/.test(b.txt()));
  const saved = JSON.parse(b.w.localStorage.getItem('orbit.bolo.u1'));
  t('only marks and counts are saved, not the spoken text', saved.prog.alpha['0'] === 'd' && saved.days[b.w.BOLO_CORE.dayKey()].ok === 1 && !/apple/i.test(JSON.stringify(saved)));
  b.click('[data-bl=next]');
  t('Aage moves to B', b.d.querySelector('.bl-big').textContent === 'B');
  b.heard.next = ['zebra']; b.click('[data-bl=mic]'); await b.wait();
  t('wrong answer asks to say it again and marks redo', /Phir se bolo/.test(b.txt()) && b.d.querySelector('.bl-prog button.r'));
  b.click('[data-bl=mode][data-v=table]');
  t('table mode shows 2 x 1', /2 × 1/.test(b.txt()));
  b.w.eval('document.getElementById("app").querySelector("#blTable")'); const sel = b.d.getElementById('blTable'); sel.value = '5'; sel.dispatchEvent(new b.w.Event('change', { bubbles: true }));
  t('choosing 5 ka table changes the card', /5 × 1/.test(b.txt()) && /= 5/.test(b.txt()));
  b.heard.next = ['five ones are five']; b.click('[data-bl=mic]'); await b.wait();
  t('table answer in words is accepted', /Shabaash/.test(b.txt()));
  b.click('[data-bl=mode][data-v=poem]');
  b.heard.next = ['twinkle twinkle little star']; b.click('[data-bl=mic]'); await b.wait();
  t('poem line is accepted', /Shabaash/.test(b.txt()));

  // limit reached
  b = boot({ store: { set: { limit: 5, mic: true, pin: '' }, prog: {}, days: { [new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0') + '-' + String(new Date().getDate()).padStart(2, '0')]: { sec: 300, ok: 2, redo: 0 } } } });
  t('daily limit over: time-poora card, no mic button', /Aaj ka time poora hua/.test(b.txt()) && !b.d.querySelector('[data-bl=mic]'));
  t('parent section still shows usage', /5:00/.test(b.txt()));

  // mic switched off by parent
  b = boot({ store: { set: { limit: 10, mic: false, pin: '' }, prog: {}, days: {} } });
  t('mic off by parent: button disabled and message shown', b.d.querySelector('[data-bl=mic]').disabled && /Parent ne mic band kiya/.test(b.txt()));

  // no speech recognition in this browser
  b = boot({ noSR: true });
  t('no recognition: self-check buttons appear and work', !!b.d.querySelector('[data-bl=self][data-v="1"]'));
  b.click('[data-bl=self][data-v="1"]');
  t('self-check marks the item', /1 \/ 26 sahi/.test(b.txt()));

  // PIN
  b = boot();
  b.d.getElementById('blPin').value = '1234'; b.click('[data-bl=pin][data-v=set]'); await b.wait();
  const s2 = JSON.parse(b.w.localStorage.getItem('orbit.bolo.u1'));
  t('PIN saved as a 64-char hash, not the number', /^[0-9a-f]{64}$/.test(s2.set.pin) && !/1234/.test(JSON.stringify(s2)));
  b.w.eval('BOLO._reset()'); b.w.eval('draw()');
  t('after PIN, limit slider is locked until unlocked', b.d.getElementById('blLim').disabled && !!b.d.querySelector('[data-bl=pin][data-v=unlock]'));
  b.d.getElementById('blPin').value = '0000'; b.click('[data-bl=pin][data-v=unlock]'); await b.wait();
  t('wrong PIN keeps it locked', /PIN galat/.test(b.txt()) && b.d.getElementById('blLim').disabled);
  b.d.getElementById('blPin').value = '1234'; b.click('[data-bl=pin][data-v=unlock]'); await b.wait();
  t('right PIN unlocks the controls', !b.d.getElementById('blLim').disabled);
  const lim = b.d.getElementById('blLim'); lim.value = '20'; lim.dispatchEvent(new b.w.Event('change', { bubbles: true }));
  t('limit change is saved', JSON.parse(b.w.localStorage.getItem('orbit.bolo.u1')).set.limit === 20);

  // leaving the screen stops the mic
  b = boot(); b.w.SpeechRecognition = class { start() {} stop() {} abort() { b.heard.aborted++; } }; b.w.eval('BOLO._reset()'); b.w.eval('draw()');
  b.click('[data-bl=mic]'); b.w.BOLO.leave();
  t('leave() aborts a running listen', b.heard.aborted >= 1);

  console.log(pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})();
