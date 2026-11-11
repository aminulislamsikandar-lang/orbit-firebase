/* Integration tests: the real MathVideoPlayer + narration-sync + sprites, driven by a SIMULATED audio element.
 * Run:  node tests/narration-player.test.js
 * Needs jsdom (dev only, not a runtime dependency):  npm i -D jsdom     (skipped with a notice if it is not installed)
 * What this proves: our scheduling / pause / seek / end / fallback logic. What it does NOT prove: real MP3 decoding, real browser timing,
 * or how it looks and feels on a low-end phone - test that on a real device.
 */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
let JSDOM;
try { JSDOM = require('jsdom').JSDOM; } catch (e) { try { JSDOM = require('/tmp/jsd/node_modules/jsdom').JSDOM; } catch (e2) { console.log('SKIP  jsdom not installed (npm i -D jsdom) - player integration tests not run'); process.exit(0); } }

let pass = 0, fail = 0;
function t(name, ok, extra) { if (ok) { pass++; console.log('PASS  ' + name); } else { fail++; console.log('FAIL  ' + name + (extra ? '  -> ' + extra : '')); } }
const sleep = ms => new Promise(r => setTimeout(r, ms));
const code = f => fs.readFileSync(path.join(ROOT, 'public', f), 'utf8');

function setup(lang) {
  const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', { url: 'http://localhost/', runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window;
  w.localStorage.setItem('mvLang', lang);
  const spoken = []; let cancels = 0;
  w.speechSynthesis = { getVoices: () => [], speak: u => { spoken.push(u); }, cancel: () => { cancels++; }, addEventListener() {}, removeEventListener() {} };
  w.SpeechSynthesisUtterance = function (text) { this.text = text; };
  const audios = [];
  class FakeAudio {
    constructor() {
      this.L = {}; this.attrs = {}; this.paused = true; this.ended = false; this._t = 0; this.duration = NaN; this.playbackRate = 1; this.plays = 0; this.pauses = 0; this.loads = 0;
      audios.push(this);
    }
    addEventListener(n, f) { (this.L[n] = this.L[n] || []).push(f); }
    fire(n) { (this.L[n] || []).forEach(f => f()); }
    setAttribute(k, v) { this.attrs[k] = v; }
    getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }
    removeAttribute(k) { delete this.attrs[k]; }
    set src(v) { this.attrs.src = v; this.ended = false; this._t = 0; this.duration = NaN; Promise.resolve().then(() => { if (this.attrs.src === v) { this.duration = (FakeAudio.durations[v] || 10); this.fire('loadedmetadata'); } }); }
    get src() { return this.attrs.src || ''; }
    get currentTime() { return this._t; }
    set currentTime(v) { this._t = v; }
    play() { this.plays++; this.paused = false; this.ended = false; this.fire('play'); this.fire('playing'); return Promise.resolve(); }
    pause() { this.pauses++; if (!this.paused) { this.paused = true; this.fire('pause'); } }
    load() { this.loads++; }
    // test helpers
    tickTo(x) { this._t = x; this.fire('timeupdate'); }
    seekTo(x) { this._t = x; this.fire('seeked'); }
    finish() { this._t = this.duration; this.paused = true; this.ended = true; this.fire('pause'); this.fire('ended'); }
    fail() { this.fire('error'); }
  }
  FakeAudio.durations = { 'u0.mp3': 10, 'u1.mp3': 6 };
  w.Audio = FakeAudio;
  ['narration-sync.js', 'narration-sprites.js', 'mathvideo-player.js'].forEach(f => { w.eval(code(f)); });
  return { w, spoken, audios, cancels: () => cancels };
}

const plan = {
  title: { en: 'Car lesson', as: 'Car' },
  steps: [
    { cap: { en: 'one' }, say: { en: 'The car is blue. The bird sits.', as: 'x' }, anim: { lines: ['The car is blue'], cues: [{ point: { line: 0, word: 'car' } }] } },
    { cap: { en: 'two' }, say: { en: 'Second step.', as: 'y' }, anim: { lines: ['Second'] } }
  ]
};
const narration = () => ({
  lang: { as: { segments: [
    { index: 0, url: 'u0.mp3', duration: 10, events: [{ start: 1, cue: 0 }, { start: 2, end: 5, target: 'car', action: 'enter' }, { start: 6, end: 9, target: 'bird', action: 'appear-and-flap' }] },
    { index: 1, url: 'u1.mp3', duration: 6 }] } },
  steps: [{ index: 0, scene: [{ id: 'car', sprite: 'car', x: 20, y: 200 }, { id: 'bird', sprite: 'bird', x: 300, y: 80 }] }]
});
const btn = (w, label) => Array.from(w.document.querySelectorAll('button')).filter(b => b.textContent === label)[0];
const spr = (w, name) => w.document.querySelector('.nv-sprite[data-sprite="' + name + '"]');
const cl = e => (e ? (e.getAttribute('class') || '') : '');
const board = w => w.document.querySelector('svg[aria-label="Whiteboard"]');
const hasMark = w => !!Array.from(board(w).querySelectorAll('rect')).filter(r => r.getAttribute('fill') === '#d74747').length;

(async () => {
  // ---------- narration present ----------
  {
    const { w, spoken, audios } = setup('as');
    w.MathVideoPlayer.open(plan, { narration: narration() });
    btn(w, 'Play').click(); await sleep(5);
    const au = audios[0];
    t('Play with narration starts the MP3, not the browser voice', au && au.getAttribute('src') === 'u0.mp3' && au.plays === 1 && spoken.length === 0);
    t('sprites exist but are hidden until their time', spr(w, 'car') && spr(w, 'bird') && !/nv-(in|enter|pop)/.test(cl(spr(w, 'car'))));
    t('audio progress control is shown', w.document.querySelector('input[aria-label="Audio progress"]').style.display !== 'none');

    au.tickTo(0.5); t('before its time nothing has happened', !hasMark(w) && !/nv-enter/.test(cl(spr(w, 'car'))));
    au.tickTo(1.2); t('cue fires from the audio clock (pen underline)', hasMark(w));
    au.tickTo(2.4); t('"The car is blue": car enters at its timestamp and stays visible', /nv-enter/.test(cl(spr(w, 'car'))));
    for (let x = 2.4; x < 5.9; x += 0.25) au.tickTo(x); au.tickTo(5.9);
    t('car remains visible after its event ends', /nv-enter/.test(cl(spr(w, 'car'))));
    t('bird still hidden before 6s', !/nv-(in|enter|pop)/.test(cl(spr(w, 'bird'))));
    au.tickTo(6.2); t('bird appears and flaps at 6s', /nv-pop/.test(cl(spr(w, 'bird'))) && /nv-flap/.test(cl(spr(w, 'bird'))));

    // pause / resume
    btn(w, 'Pause').click();
    t('Pause pauses the audio element (does not restart it)', au.paused && au.pauses >= 1);
    t('animations freeze when audio pauses (nv-paused)', /nv-paused/.test(cl(board(w))));
    const srcBefore = au.getAttribute('src'), playsBefore = au.plays;
    btn(w, 'Play').click();
    t('Resume continues the same audio from where it was', au.getAttribute('src') === srcBefore && au.plays === playsBefore + 1 && au._t === 6.2);
    t('animations resume with the audio', !/nv-paused/.test(cl(board(w))));

    // seek backwards
    au.seekTo(3);
    t('seek back: later sprite state removed', !/nv-(in|enter|pop|flap)/.test(cl(spr(w, 'bird'))));
    t('seek back: earlier state restored instantly (car visible, no entrance animation)', /nv-in/.test(cl(spr(w, 'car'))) && !/nv-enter/.test(cl(spr(w, 'car'))));
    t('seek back: pen mark restored', hasMark(w));
    au.seekTo(0.4);
    t('seek to start: everything cleared', !hasMark(w) && !/nv-(in|enter|pop)/.test(cl(spr(w, 'car'))));
    // seek forward
    au.seekTo(7.5);
    t('seek forward: bird shown and flapping, car shown without loops', /nv-in/.test(cl(spr(w, 'bird'))) && /nv-flap/.test(cl(spr(w, 'bird'))) && /nv-in/.test(cl(spr(w, 'car'))));
    au.seekTo(9.4);
    t('seek forward past an event end: bird visible, flapping stopped', /nv-in/.test(cl(spr(w, 'bird'))) && !/nv-flap/.test(cl(spr(w, 'bird'))));
    // seek bar
    const sk = w.document.querySelector('input[aria-label="Audio progress"]');
    sk.value = '300'; sk.oninput(); sk.onchange();
    t('dragging the progress bar seeks the audio', Math.abs(au._t - 3) < 0.01);
    au.tickTo(5); t('progress bar follows playback', Math.abs(Number(sk.value) - 500) <= 1);

    // replay
    btn(w, 'Replay').click(); await sleep(5);
    t('Replay restarts the step from zero with a clean board', au.getAttribute('src') === 'u0.mp3' && au._t === 0 && !hasMark(w) && !/nv-(in|enter|pop)/.test(cl(spr(w, 'car'))));
    au.tickTo(0.3);
    // loops must stop at the end, then go to next step
    au.tickTo(6.2); au.finish(); 
    t('when audio ends nothing keeps animating', !/nv-flap/.test(cl(spr(w, 'bird'))));
    await sleep(900);
    t('after the end, the next step starts its own audio', au.getAttribute('src') === 'u1.mp3');
    t('next step has a clean board (old sprites gone)', !spr(w, 'car'));
    t('step counter moved on', /Step 2 \/ 2/.test(w.document.body.textContent));
    w.MathVideoPlayer.close();
  }

  // ---------- changing slides while audio plays ----------
  {
    const { w, audios } = setup('as');
    w.MathVideoPlayer.open(plan, { narration: narration() });
    btn(w, 'Play').click(); await sleep(5);
    const au = audios[0]; au.tickTo(2.4);
    btn(w, 'Next').click(); await sleep(5);
    t('Next while playing switches audio and drops the old step visuals', au.getAttribute('src') === 'u1.mp3' && !spr(w, 'car'));
    btn(w, 'Prev').click(); await sleep(5);
    t('Prev returns to step 1 audio from the start with fresh sprites hidden', au.getAttribute('src') === 'u0.mp3' && au._t === 0 && spr(w, 'car') && !/nv-(in|enter|pop)/.test(cl(spr(w, 'car'))));
    w.MathVideoPlayer.close();
    t('closing the player stops the audio', au.paused || !au.getAttribute('src'));
  }

  // ---------- no narration / other language: old behaviour ----------
  {
    const { w, spoken, audios } = setup('en');
    w.MathVideoPlayer.open(plan, { narration: narration() });
    btn(w, 'Play').click(); await sleep(5);
    t('language without narration uses the existing browser voice', spoken.length >= 1 && (audios.length === 0 || !audios[0].getAttribute('src')));
    w.MathVideoPlayer.close();
  }
  {
    const { w, spoken, audios } = setup('as');
    w.MathVideoPlayer.open(plan);
    btn(w, 'Play').click(); await sleep(5);
    t('existing lessons (no narration option at all) behave as before', spoken.length >= 1 && audios.length === 0);
    t('no sprites or audio bar for existing lessons', !spr(w, 'car') && w.document.querySelector('input[aria-label="Audio progress"]').style.display === 'none');
    w.MathVideoPlayer.close();
  }

  // ---------- audio errors ----------
  {
    const { w, spoken, audios } = setup('as'); let asked = 0;
    w.MathVideoPlayer.open(plan, { narration: narration(), refreshUrl: async () => { asked++; return 'u0-fresh.mp3'; } });
    btn(w, 'Play').click(); await sleep(5);
    const au = audios[0]; au.fail(); await sleep(10);
    t('expired link: a fresh signed URL is requested once and playback continues', asked === 1 && au.getAttribute('src') === 'u0-fresh.mp3' && au.plays === 2);
    w.MathVideoPlayer.close();
  }
  {
    const { w, spoken, audios } = setup('as');
    w.MathVideoPlayer.open(plan, { narration: narration(), refreshUrl: async () => { throw new Error('no access'); } });
    btn(w, 'Play').click(); await sleep(5);
    audios[0].fail(); await sleep(15);
    t('refresh refused (e.g. no access): clear message, browser voice takes over', /nahi chal payi/.test(w.document.body.textContent) && spoken.length >= 1);
    w.MathVideoPlayer.close();
  }
  {
    const { w, spoken, audios } = setup('as');
    w.MathVideoPlayer.open(plan, { narration: narration() });
    btn(w, 'Play').click(); await sleep(5);
    audios[0].fail(); await sleep(10);
    t('audio error without refresh hook: understandable message + fallback voice', /nahi chal payi/.test(w.document.body.textContent) && spoken.length >= 1);
    w.MathVideoPlayer.close();
  }
  {
    const { w, audios } = setup('as');
    w.MathVideoPlayer.open(plan, { narration: narration() });
    audios.length = 0;
    btn(w, 'Play').click(); await sleep(5);
    t('loading message shown while the audio loads, cleared when it plays', !/load ho rahi/.test(w.document.body.textContent));
    w.MathVideoPlayer.close();
  }

  // ---------- CSS ----------
  {
    const css = require(path.join(ROOT, 'public/narration-sprites.js')).CSS;
    t('CSS respects prefers-reduced-motion', /prefers-reduced-motion:reduce/.test(css) && /animation:none/.test(css));
    t('CSS pauses all sprite animation with nv-paused', /nv-paused[^}]*animation-play-state:paused/.test(css));
    t('no JavaScript animation loop in the sprite code', !/requestAnimationFrame|setInterval/.test(code('narration-sprites.js') + code('narration-sync.js')));
  }

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('TEST CRASH', e); process.exit(2); });
