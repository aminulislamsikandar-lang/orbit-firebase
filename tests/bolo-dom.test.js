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
  const dom = new JSDOM('<!doctype html><body><div id="app"></div></body>', { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://orbittutorial.web.app/' });
  const w = dom.window;
  w.eval('var VIEW="bolo",USER={uid:"u1"};function draw(){document.getElementById("app").innerHTML=BOLO.viewHTML()}');
  const heard = { next: ['a for apple'], started: 0, aborted: 0 }, spoken = [];
  if (!opts.noSR) w.SpeechRecognition = class {
    start() { heard.started++; setTimeout(() => { if (opts.silent) { if (this.onerror) this.onerror({ error: 'no-speech' }); return; } if (this.onresult) this.onresult({ results: [[...heard.next.map(x => ({ transcript: x }))]] }); }, 0); }
    stop() {} abort() { heard.aborted++; }
  };
  Object.defineProperty(w, 'crypto', { value: require('crypto').webcrypto, configurable: true }); w.TextEncoder = TextEncoder;
  w.speechSynthesis = { cancel() {}, speak(u) { spoken.push(u.text); }, speaking: false }; w.SpeechSynthesisUtterance = function (t) { this.text = t; };
  if (opts.store) w.localStorage.setItem('orbit.bolo.u1', JSON.stringify(opts.store));
  if (opts.ai) {   // parent key + parent tick + a recorder: the AI check is on
    w.PARENT_KEY = { has: () => true }; w.localStorage.setItem('orbit.voice.ok.u1', '1'); w.sent = []; w.api = async (u, body) => { w.sent.push(body); return { ok: true, heard: 'ক', tip: 'Shabaash!' }; };
    Object.defineProperty(w.navigator, 'mediaDevices', { value: { getUserMedia: async () => ({ getTracks: () => [] }) }, configurable: true });
    w.MediaRecorder = class { constructor() { this.state = 'inactive'; } start() { this.state = 'recording'; setTimeout(() => this.ondataavailable && this.ondataavailable({ data: new w.Blob(['x'], { type: 'audio/webm' }) }), 0); } stop() { this.state = 'inactive'; setTimeout(() => this.onstop && this.onstop(), 0); } static isTypeSupported() { return true; } };
  }
  w.eval(rd('bolo-core.js')); w.eval(rd('byanjan-video.js')); w.eval(rd('bolo.js'));
  const clips = { made: [], played: 0 }; w.Audio = class { constructor(src) { this.src = src; clips.made.push(src); } play() { clips.played++; return Promise.resolve(); } pause() {} };
  w.eval('draw()');
  const goto = n => { for (let i = 0; i < n; i++) w.document.querySelector('[data-bl=next]').click(); };
  return { w, d: w.document, heard, clips, spoken, goto, click: sel => { const el = w.document.querySelector(sel); el && el.click(); }, txt: () => w.document.getElementById('app').textContent, wait: () => new Promise(r => setTimeout(r, 20)) };
}

(async () => {
  let b = boot();
  t('screen shows the big letter A and the topic chips on top', b.d.querySelector('.bl-big').textContent === 'A' && b.d.querySelectorAll('.bl-chips [data-bl=mode]').length === 13);   // 8 old topics + 123 Games + 123 Levels + 123 Ginti + Suno Game + Swar-borno
  t('mic button is enabled', !b.d.querySelector('[data-bl=mic]').disabled);
  t('there is no Sunao button at all', !b.d.querySelector('[data-bl=hear]') && !/Sunao/.test(b.txt()));
  t('only the mic and a small skip arrow can be pressed on the card (topic chips are on top)', [...b.d.querySelectorAll('.bl-stage button')].map(x => x.dataset.bl).join() === 'mic,next');
  const css = b.d.getElementById('blStyle').textContent;
  t('mic is orange and big (132px)', /\.bl-mic\{[^}]*#ff6a00/.test(css) && /\.bl-mic\{[^}]*width:132px/.test(css));
  t('the screen is animated (letter bobs, mic beats) and respects reduced motion', /blbob/.test(css) && /blbeat/.test(css) && /prefers-reduced-motion/.test(css));
  b.click('[data-bl=mic]'); await b.wait();
  t('right answer: Shabaash pop-up with tiny emojis, A is counted', !!b.d.querySelector('.bl-praise') && /Shabaash/.test(b.d.querySelector('.bl-praise').textContent) && /⭐/.test(b.d.querySelector('.bl-praise').textContent) && /1 \/ 26/.test(b.txt()));
  t('the praise is spoken and the mic is paused while the pop-up shows', b.spoken.includes('शाबाश!') && b.d.querySelector('[data-bl=mic]').disabled);
  await new Promise(r => setTimeout(r, 1900));
  t('pop-up goes away by itself and the next letter B comes by itself (no Aage press)', !b.d.querySelector('.bl-praise') && b.d.querySelector('.bl-big').textContent === 'B' && !b.d.querySelector('[data-bl=mic]').disabled);
  const saved = JSON.parse(b.w.localStorage.getItem('orbit.bolo.u1'));
  t('only marks and counts are saved, not the spoken text', saved.prog.alpha['0'] === 'd' && saved.days[b.w.BOLO_CORE.dayKey()].ok === 1 && !/apple/i.test(JSON.stringify(saved)));
  b.heard.next = ['zebra']; b.spoken.length = 0; b.click('[data-bl=mic]'); await b.wait();
  t('wrong answer asks to say it again and marks redo', /Phir se bolo/.test(b.txt()) && !b.d.querySelector('.bl-praise') && JSON.parse(b.w.localStorage.getItem('orbit.bolo.u1')).prog.alpha['1'] === 'r');
  t('a wrong answer plays the item by itself (no Sunao press)', b.spoken.includes('B for Ball'), JSON.stringify(b.spoken));
  t('a wrong answer does not move on', b.d.querySelector('.bl-big').textContent === 'B');
  b.click('[data-bl=next]');
  t('the small skip arrow moves to C', b.d.querySelector('.bl-big').textContent === 'C');
  b.click('[data-bl=mode][data-v=table]');
  t('table mode shows 2 x 1', /2 × 1/.test(b.txt()));
  t('table numbers are chips on top, not a drop-down', b.d.querySelectorAll('.bl-chips [data-bl=table]').length === 9 && !b.d.getElementById('blTable'));
  b.click('[data-bl=table][data-v="5"]');
  t('choosing 5 ka table changes the card', /5 × 1/.test(b.txt()) && /= 5/.test(b.txt()));
  b.heard.next = ['five ones are five']; b.click('[data-bl=mic]'); await b.wait();
  t('table answer in words is accepted', /Shabaash/.test(b.txt()));
  b.click('[data-bl=mode][data-v=poem]');
  t('poems are chips on top too', b.d.querySelectorAll('.bl-chips [data-bl=poem]').length === 2);
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
  t('self-check marks the item', /1 \/ 26/.test(b.txt()) && !!b.d.querySelector('.bl-praise'));

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

  // Assamese byanjan: recorded clip + mouth video, no mic
  b = boot(); b.click('[data-bl=mode][data-v=byanjan]');
  t('byanjan mode shows the first letter in the mouth video', b.d.querySelector('#bvGlyph').textContent === 'ক' && !!b.d.querySelector('svg.bv-mouth #bvTongue'));
  t('byanjan mode has no mic button but the self-check buttons', !b.d.querySelector('[data-bl=mic]') && !!b.d.querySelector('[data-bl=self][data-v="1"]'));
  t('byanjan: the place is explained under the video', /কণ্ঠ্য/.test(b.d.querySelector('.bv-note').textContent));
  await new Promise(r => setTimeout(r, 450));
  t('choosing the topic plays the recorded clip of the letter by itself (no Sunao button)', b.clips.made[0] === '/audio/byanjan/01.mp3?v=1' && b.clips.played === 1, JSON.stringify(b.clips));
  await new Promise(r => setTimeout(r, 300));
  t('the tongue moves toward the sound position while it plays', /^M/.test(b.d.getElementById('bvTongue').getAttribute('d')) && (b.d.getElementById('bvTongue').getAttribute('d').match(/C/g) || []).length === 12);
  b.click('[data-bl=self][data-v="1"]');
  t('"Maine bol diya" marks the letter done', /1 \/ 40/.test(b.txt()) && /Shabaash/.test(b.txt()));
  b.click('[data-bl=next]'); await new Promise(r => setTimeout(r, 450));
  t('Aage shows the next letter and plays its clip at once', b.d.querySelector('#bvGlyph').textContent === 'খ' && b.clips.made[b.clips.made.length - 1] === '/audio/byanjan/02.mp3?v=1');
  b.click('[data-bl=self][data-v="0"]'); await new Promise(r => setTimeout(r, 450));
  t('"Dobara bolunga" plays the clip again, not the browser voice', b.clips.made.filter(x => x.includes('02.mp3')).length === 2);
  b.click('[data-bl=mode][data-v=alpha]');
  t('back to A se Z: big letter again, mic is back', b.d.querySelector('.bl-big').textContent === 'A' && !!b.d.querySelector('[data-bl=mic]'));
  // every letter draws a mouth without errors, and labial / throat / nasal poses are set
  b = boot(); b.click('[data-bl=mode][data-v=byanjan]');
  let drawn = 0; for (let i = 0; i < 40; i++) { if (i) b.click('[data-bl=next]'); if (b.d.getElementById('bvTongue') && b.d.querySelector('.bv-note').textContent.length > 10) drawn++; }
  t('all 40 letters draw the mouth video with a note', drawn === 40, String(drawn));
  b = boot(); b.click('[data-bl=mode][data-v=byanjan]'); b.goto(20);
  t('labial letter (প): lips are closed in the picture', /translate\(0 16\)/.test(b.d.getElementById('bvUL').getAttribute('transform')));
  b.goto(19);
  t('chandrabindu: nose airflow shown', b.d.getElementById('bvNasal').getAttribute('opacity') !== '0');

    // Assamese: the AI judges the child's voice (parent key + tick); without it, byanjan stays self-check and the browser mic gives way after two empty tries
  b = boot({ ai: true }); b.click('[data-bl=mode][data-v=byanjan]');
  t('byanjan with the AI check: mic button shown, tick buttons hidden', !!b.d.querySelector('[data-bl=mic]') && !b.d.querySelector('[data-bl=self]'));
  b.click('[data-bl=mic]'); await b.wait(); await b.wait(); b.click('[data-bl=mic]'); await b.wait(); await b.wait(); await b.wait();
  t('byanjan: the clip goes to the AI as an Assamese letter and ক is marked done', b.w.sent.length === 1 && b.w.sent[0].kind === 'asletter' && b.w.sent[0].expected === 'ক' && /1 \/ 40/.test(b.txt()), JSON.stringify(b.w.sent[0] && { k: b.w.sent[0].kind, e: b.w.sent[0].expected }));
  b = boot({ ai: true }); b.click('[data-bl=mode][data-v=asvyanjan]'); b.click('[data-bl=mic]'); await b.wait(); await b.wait(); b.click('[data-bl=mic]'); await b.wait(); await b.wait(); await b.wait();
  t('letter + word: the AI check is used too (kind asm, letter and word expected)', b.w.sent.length === 1 && b.w.sent[0].kind === 'asm' && b.w.sent[0].expected === 'ক, কল');
  b = boot(); b.click('[data-bl=mode][data-v=byanjan]'); for (let i = 0; i < 37; i++) b.click('[data-bl=next]');
  t('ং ঃ ঁ are drawn with a no-break-space base (no dotted circle)', b.d.querySelector('#bvGlyph span').textContent === '\u00a0ং');
  b = boot({ silent: true }); b.click('[data-bl=mode][data-v=asvyanjan]');
  b.click('[data-bl=mic]'); await b.wait(); b.click('[data-bl=mic]'); await b.wait();
  t('letter + word: after two empty tries the child gets the tick buttons', !!b.d.querySelector('[data-bl=self]') && /Browser Assamese/.test(b.txt()));
console.log(pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})();
