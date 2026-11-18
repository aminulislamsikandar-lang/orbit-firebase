// The Assamese modes in a fake browser (jsdom): the browser listener, the voice match and the AI check hear one attempt together, and the fusion decides.
// Real bolo.js, real voice match, synthetic voices (no audio files). Skipped when jsdom is not installed. Run: node tests/assamese-fuse-dom.test.js
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
let JSDOM = null; try { ({ JSDOM } = require('jsdom')); } catch (e) {}
let pass = 0, fail = 0;
const t = (name, ok, extra) => { if (ok) pass++; else { fail++; console.log('FAIL  ' + name + (extra ? '  ' + extra : '')); } };
if (!JSDOM) { console.log('SKIP  jsdom not installed'); console.log('0 passed, 0 failed'); process.exit(0); }
const rd = f => fs.readFileSync(path.join(ROOT, 'public', f), 'utf8');
const V = require('../public/voicematch-core.js'), F = require('../public/assamese-fuse.js'), C = require('../public/bolo-core.js');

// synthetic voices (same generator as tests/voicematch.test.js)
const SR16 = 16000, VOW = { a: [750, 1200], i: [300, 2300], u: [320, 800], e: [500, 1800], o: [500, 1000] };
const voice = new Function('SR', 'VOW', /function voice\(word, f0, size, noise, seed\) \{[\s\S]*?\n\}\n/.exec(fs.readFileSync(path.join(__dirname, 'voicematch.test.js'), 'utf8'))[0] + ';return voice;')(SR16, VOW);
const word3 = i => { const a = 'aiueo'; let c = i * 3 + 1, w = ''; for (let k = 0; k < 3; k++) { w += a[c % 5]; c = Math.floor(c / 5) + k + 1; } return w; };
const gapOf = sec => new Float32Array(Math.round(sec * SR16));
const cat = (...a) => { const o = new Float32Array(a.reduce((n, x) => n + x.length, 0)); let p = 0; a.forEach(x => { o.set(x, p); p += x.length; }); return o; };
const child = (w, seed) => voice(w, 260, 1.2, 0.003, seed);
const buf = f32 => f32.buffer.slice(f32.byteOffset, f32.byteOffset + f32.byteLength);

// references: byanjan = one clip per letter; asvyanjan = one long recording with the letter and the word at every cue
const BY = C.items('byanjan'), AS = C.items('asvyanjan');
const REF = {};
BY.forEach((it, i) => { REF[it.audio.split('?')[0]] = buf(voice(word3(i), 120, 1, 0.0005, 3)); });
// asvyanjan: the letter and the word of item i are two different synthetic words placed at the real cue times
{ const all = new Float32Array(Math.round(78.4 * SR16)); AS.forEach((_, i) => { all.set(voice(word3(i), 120, 1, 0.0005, 3), Math.round(C.AS_CUES[2 * i] * SR16)); all.set(voice(word3(i + 23), 120, 1, 0.0005, 3), Math.round(C.AS_CUES[2 * i + 1] * SR16)); }); REF[AS[0].src.split('?')[0]] = buf(all); }

function boot(o) {
  o = o || {};
  const dom = new JSDOM('<!doctype html><body><div id="app"></div></body>', { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://orbittutorial.web.app/' });
  const w = dom.window, log = { sr: 0, srLangs: [], api: [] };
  w.eval('var VIEW="bolo",USER={uid:"u1"};function draw(){document.getElementById("app").innerHTML=BOLO.viewHTML()}');
  // the browser's recogniser: 'yes' = hears the item, 'no' = hears another word, 'silent' = hears nothing, 'throws' = can not start, 'nolang' = has no Assamese engine, 'hang' = never answers
  const srMode = () => o.sr;
  w.SpeechRecognition = class {
    start() {
      log.sr++; log.srLangs.push(this.lang); const m = srMode();
      if (m === 'throws') throw new Error('busy');
      if (m === 'hang') return;
      setTimeout(() => {
        if (m === 'silent') return this.onerror && this.onerror({ error: 'no-speech' });
        if (m === 'nolang' && this.lang === 'as-IN') return this.onerror && this.onerror({ error: 'language-not-supported' });
        const it = (o.mode === 'byanjan' ? BY : AS)[0], say = m === 'no' ? 'zebra' : !o.mode ? 'a for apple' : (o.mode === 'byanjan' ? it.big : it.match.letter + ' ' + it.match.word);
        this.onresult && this.onresult({ results: [[{ transcript: say }]] });
      }, 0);
    }
    stop() {} abort() {}
  };
  Object.defineProperty(w, 'crypto', { value: require('crypto').webcrypto, configurable: true }); w.TextEncoder = TextEncoder;
  w.speechSynthesis = { cancel() {}, speak() {}, speaking: false }; w.SpeechSynthesisUtterance = function (x) { this.text = x; };
  Object.defineProperty(w.navigator, 'mediaDevices', { value: { getUserMedia: async () => ({ getTracks: () => [] }) }, configurable: true });
  w.MediaRecorder = class {
    constructor() { this.state = 'inactive'; }
    start() { this.state = 'recording'; if (o.clip) setTimeout(() => this.ondataavailable && this.ondataavailable({ data: { size: 1, pcm: o.clip } }), 0); }
    stop() { if (this.state === 'inactive') return; this.state = 'inactive'; setTimeout(() => this.onstop && this.onstop(), 0); }
  };
  w.Blob = class { constructor(parts, opt) { this.parts = parts; this.type = (opt && opt.type) || ''; } arrayBuffer() { const p = this.parts[0] && this.parts[0].pcm; return Promise.resolve(p ? buf(p) : new ArrayBuffer(0)); } };
  w.AudioContext = class { decodeAudioData(ab, ok) { const x = new Float32Array(ab); const r = { getChannelData: () => x, sampleRate: SR16, length: x.length }; if (ok) ok(r); return Promise.resolve(r); } close() {} };
  w.fetch = async url => { const b = REF[String(url).split('?')[0]]; if (!b) throw new Error('no ' + url); return { arrayBuffer: async () => b }; };
  if (o.ai) { w.PARENT_KEY = { has: () => true }; w.localStorage.setItem('orbit.voice.ok.u1', '1'); w.api = async (u, body) => { log.api.push(body); return { ok: o.ai === 'yes', tip: o.ai === 'yes' ? 'Shabaash AI!' : 'Phir se' }; }; }
  if (o.free) {   // no parent key: the server's free Assamese checks ('yes' = AI hears it right, 'limit' = the day's free checks are used up)
    w.PARENT_KEY = { has: () => false }; if (!o.noTick) w.localStorage.setItem('orbit.voice.ok.u1', '1');
    w.api = async (u, body) => { log.api.push(body); if (o.free === 'limit') throw new Error('Aaj ke free awaaz check ho gaye'); return { ok: true, tip: 'Shabaash AI!' }; };
  }
  w.FileReader = class { readAsDataURL() { this.result = 'data:audio/webm;base64,AAAA'; setTimeout(() => this.onload && this.onload(), 0); } };
  w.Audio = class { play() { return Promise.resolve(); } pause() {} };
  ['bolo-core.js', 'voicematch-core.js', 'assamese-fuse.js', 'byanjan-video.js', 'bolo.js'].forEach(f => w.eval(rd(f)));
  w.eval('draw()');
  const d = w.document;
  const click = sel => { const el = d.querySelector(sel); el && el.click(); };
  if (o.mode) { click('[data-bl=mode][data-v=' + o.mode + ']'); }
  return { w, d, log, click, txt: () => d.getElementById('app').textContent, wait: ms => new Promise(r => setTimeout(r, ms || 30)),
    // press the mic (optionally press again to stop), then wait until the attempt has been judged (the fusion publishes a new result) or maxMs has passed
    mic: async function (tapAgain, maxMs) {
      const before = w.BOLO.lastFuse && w.BOLO.lastFuse(); click('[data-bl=mic]'); await this.wait(150); if (tapAgain) click('[data-bl=mic]');
      const end = Date.now() + (maxMs || 8000); while (Date.now() < end && w.BOLO.lastFuse() === before) await this.wait(40);
      await this.wait(60);
    } };
}

(async () => {
  // premises of the synthetic voices (so a failure below is about bolo.js, not about the test data)
  const refsBy = BY.map((_, i) => [V.features(voice(word3(i), 120, 1, 0.0005, 3), SR16)]);
  const own = F.vmState(V.distances(V.featuresMulti(child(word3(0), 11), SR16), refsBy), 0).state;
  let wrongIdx = -1, other = 'none';
  for (let j = 1; j < 40 && wrongIdx < 0; j++) { const s = F.vmState(V.distances(V.featuresMulti(child(word3(j), 12 + j), SR16), refsBy), 0).state; if (s === 'strong_no') { wrongIdx = j; other = s; } }
  t('premise: the child clip of letter 1 is a strong voice match for letter 1', own === 'strong_yes', own);
  t('premise: the child clip of another letter is a strong "no" for letter 1', other === 'strong_no', other);
  const good = child(word3(0), 11), wrong = child(word3(wrongIdx < 0 ? 7 : wrongIdx), 12 + (wrongIdx < 0 ? 0 : wrongIdx));

  // ---- byanjan (single letters) ----
  let b = boot({ mode: 'byanjan', sr: 'silent', clip: good });
  t('byanjan now has a mic (it was tick-only before)', !!b.d.querySelector('[data-bl=mic]') && !b.d.querySelector('[data-bl=mic]').disabled && /Mic dabao aur letter bolo/.test(b.txt()));
  await b.mic(true);
  t('browser hears nothing, voice match hears the right letter: Shabaash', /Shabaash/.test(b.txt()) && b.w.BOLO.lastFuse().verdict === 'pass' && b.w.BOLO.lastFuse().vm === 'strong_yes' && b.w.BOLO.lastFuse().sr === 'none');

  b = boot({ mode: 'byanjan', sr: 'yes', clip: null });
  await b.mic(false, 1200);
  t('mic recording is muted (phone cannot share the mic) but the browser heard the letter: Shabaash', /Shabaash/.test(b.txt()) && b.w.BOLO.lastFuse().vm === 'none' && b.w.BOLO.lastFuse().sr === 'yes');

  b = boot({ mode: 'byanjan', sr: 'yes', clip: good });
  await b.mic(false, 1200);
  t('both listeners agree: Shabaash, and the recording stopped by itself after the browser answered', /Shabaash/.test(b.txt()) && b.w.BOLO.lastFuse().score === 2.2 && b.w.BOLO.lastFuse().vm === 'strong_yes');

  b = boot({ mode: 'byanjan', sr: 'yes', clip: wrong });
  await b.mic(false, 1200);
  t('browser says yes but the voice is clearly another letter: no praise, no wrong mark, asks for a clearer try', !/Shabaash/.test(b.txt()) && /Thoda aur dheere aur saaf bolo/.test(b.txt()) && b.w.BOLO.lastFuse().verdict === 'unsure' && !b.d.querySelector('.bl-shake'));

  b = boot({ mode: 'byanjan', sr: 'no', clip: wrong });
  await b.mic(false, 1200);
  t('both listeners say it is wrong: Phir se bolo and the screen shakes', /Phir se bolo/.test(b.txt()) && !!b.d.querySelector('.bl-stage.bl-shake'));
  await b.mic(false, 1200);
  t('after two misses the child may tick by themselves ("Maine bol diya")', !!b.d.querySelector('[data-bl=self]'));

  b = boot({ mode: 'byanjan', sr: 'silent', clip: null });
  await b.mic(true, 500);
  t('nobody hears anything: a clear message, not "wrong"', /Kuch sunai nahi diya/.test(b.txt()) && !b.d.querySelector('.bl-shake'));

  b = boot({ mode: 'byanjan', sr: 'throws', clip: good });
  await b.mic(true);
  t('the browser listener cannot start next to the recording: the voice match decides alone', /Shabaash/.test(b.txt()) && b.w.BOLO.lastFuse().sr === 'none');

  b = boot({ mode: 'byanjan', sr: 'nolang', clip: good });
  await b.mic(false, 1200);
  t('no Assamese engine: the next language (Bengali) is tried, in the same attempt', b.log.srLangs.join() === 'as-IN,bn-IN' && /Shabaash/.test(b.txt()), b.log.srLangs.join());

  b = boot({ mode: 'byanjan', sr: 'hang', clip: good });
  const t0 = Date.now(); await b.mic(true, 2600);
  t('the browser listener never answers: the voice match decides after a short wait', /Shabaash/.test(b.txt()) && Date.now() - t0 > 1500);

  b = boot({ mode: 'byanjan', sr: 'no', clip: good, ai: 'yes' });
  await b.mic(false, 1500);
  t('parent AI says yes + voice match yes + browser says another word: pass; all three were asked', /Shabaash/.test(b.txt()) && b.log.api.length === 1 && b.w.BOLO.lastFuse().ai === 'yes');
  b = boot({ mode: 'byanjan', sr: 'yes', clip: good, ai: 'no' });
  await b.mic(false, 1500);
  t('parent AI says no: it outweighs the browser and the voice match', !/Shabaash!/.test(b.txt().replace(/Shabaash AI!/g, '')) && b.w.BOLO.lastFuse().verdict !== 'pass');

  // ---- free AI check without the parent's key (Assamese modes only, parent's tick still needed) ----
  b = boot({ mode: 'byanjan', sr: 'no', clip: good, free: 'yes' });
  await b.mic(false, 1500);
  t('no parent key, tick on: the AI is still asked in an Assamese mode (server free check)', b.log.api.length === 1 && b.w.BOLO.lastFuse().ai === 'yes' && /Shabaash/.test(b.txt()));
  b = boot({ mode: 'byanjan', sr: 'no', clip: good, free: 'yes', noTick: true });
  await b.mic(false, 1500);
  t('no parent key and no tick: the clip is never sent', b.log.api.length === 0 && b.w.BOLO.lastFuse().ai === 'none');
  b = boot({ mode: 'byanjan', sr: 'no', clip: good, free: 'limit' });
  await b.mic(false, 1500);
  t('free checks used up: the AI step fails quietly, the voice match still decides', b.log.api.length === 1 && b.w.BOLO.lastFuse().ai === 'none' && b.w.BOLO.lastFuse().vm !== 'none');

  // ---- asvyanjan (letter + word, one recording with 23 items) ----
  const asGood = cat(child(word3(0), 21), gapOf(0.3), child(word3(23), 22));   // the child says the letter, then the word
  b = boot({ mode: 'asvyanjan', sr: 'silent', clip: asGood });
  await b.mic(true, 1800);
  t('asvyanjan: voice match hears the item when the browser hears nothing', /Shabaash/.test(b.txt()) && b.w.BOLO.lastFuse().vm !== 'none', JSON.stringify(b.w.BOLO.lastFuse().fuse));
  b = boot({ mode: 'asvyanjan', sr: 'yes', clip: null });
  await b.mic(false, 1200);
  t('asvyanjan: browser alone still works (muted recording)', /Shabaash/.test(b.txt()));

  // ---- not Assamese: the old flow is untouched ----
  b = boot({ sr: 'yes', clip: good });
  b.click('[data-bl=mic]'); await b.wait(60);
  t('A to Z does not use the fusion (browser listener only, one SR start)', b.log.sr === 1 && /Shabaash/.test(b.txt()) && b.w.BOLO.lastFuse() === undefined);

  console.log(pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('FAIL  crashed: ' + e.stack); process.exit(1); });
