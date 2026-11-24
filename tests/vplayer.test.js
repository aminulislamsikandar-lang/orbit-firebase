/* Tests for public/vplayer.js (Orbit's own control bar under the lesson videos).
 * The real look and feel (and phone full screen) must be tried on a phone.
 * Run: node tests/vplayer.test.js
 */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const SRC = fs.readFileSync(path.join(ROOT, 'public/vplayer.js'), 'utf8');
const VP = require(path.join(ROOT, 'public/vplayer.js'));
let pass = 0, fail = 0;
function t(name, ok, extra) { if (ok) { pass++; console.log('PASS  ' + name); } else { fail++; console.log('FAIL  ' + name + (extra ? '  -> ' + extra : '')); } }
const base = 'https://orbittutorial.web.app/';

// ---------- pure helpers ----------
t('time format: 0:05, 1:05, 1:02:05, junk -> 0:00', VP.fmt(5) === '0:05' && VP.fmt(65) === '1:05' && VP.fmt(3725) === '1:02:05' && VP.fmt(NaN) === '0:00' && VP.fmt(-3) === '0:00');
t('speed goes 0.75 > 1 > 1.25 > 1.5 > 2 > back to 0.75', VP.nextSpeed(0.75) === 1 && VP.nextSpeed(1) === 1.25 && VP.nextSpeed(1.25) === 1.5 && VP.nextSpeed(1.5) === 2 && VP.nextSpeed(2) === 0.75);
t('unknown speed goes to 1x', VP.nextSpeed(3) === 1 && VP.nextSpeed(undefined) === 1);
t('skip never goes before 0 or after the end', VP.skipTarget(4, -10, 100) === 0 && VP.skipTarget(98, 10, 100) === 100 && VP.skipTarget(50, 10, 100) === 60 && VP.skipTarget(50, -10, 100) === 40);
t('skip with unknown length only keeps the lower limit', VP.skipTarget(50, 10, NaN) === 60 && VP.skipTarget(3, -10, NaN) === 0);
t('no innerHTML / eval / document.write (numbers.test rule)', !/innerHTML|eval\(|document\.write/.test(SRC));

const idx = fs.readFileSync(path.join(ROOT, 'public/index.html'), 'utf8'), sw = fs.readFileSync(path.join(ROOT, 'public/sw.js'), 'utf8');
t('index.html loads /vplayer.js once', (idx.match(/<script src="\/vplayer\.js"><\/script>/g) || []).length === 1);
t('service worker keeps vplayer.js offline', sw.includes("'/vplayer.js'"));

// ---------- DOM behaviour (jsdom, dev only) ----------
let JSDOM = null; try { ({ JSDOM } = require('jsdom')); } catch (e) { /* skipped below */ }
if (!JSDOM) { console.log('SKIP  jsdom not installed (npm i -D jsdom) - DOM checks not run'); finish(); }
else (async () => {
  const tick = ms => new Promise(r => setTimeout(r, ms));
  function page() {
    const d = new JSDOM('<!doctype html><body><div id="a"></div></body>', { url: base, runScripts: 'outside-only', pretendToBeVisual: true });
    const w = d.window; const P = w.HTMLMediaElement.prototype;
    P.play = function () { Object.defineProperty(this, 'paused', { value: false, configurable: true }); this.dispatchEvent(new w.Event('play')); return Promise.resolve(); };
    P.pause = function () { Object.defineProperty(this, 'paused', { value: true, configurable: true }); this.dispatchEvent(new w.Event('pause')); };
    w.eval(SRC);
    return w;
  }
  function mk(w, attrs) {
    const v = w.document.createElement('video');
    v.setAttribute('controls', ''); v.setAttribute('controlslist', 'nodownload'); v.setAttribute('disablepictureinpicture', '');
    v.setAttribute('oncontextmenu', 'return false'); v.setAttribute('data-vo', 'a1'); v.setAttribute('src', '/public-videos/a.mp4');
    for (const k in (attrs || {})) v.setAttribute(k, attrs[k]);
    w.document.getElementById('a').appendChild(v);
    return v;
  }
  const bars = w => w.document.querySelectorAll('.vp-bar');
  const q = (w, s) => w.document.querySelector(s);
  const setDur = (w, v, d) => { Object.defineProperty(v, 'duration', { value: d, configurable: true }); v.dispatchEvent(new w.Event('durationchange')); };

  let w = page(); let v = mk(w); await tick(30);
  t('a lesson video gets one control bar right under it', bars(w).length === 1 && v.nextSibling === bars(w)[0]);
  t('the browser\'s own controls are switched off', v.controls === false && !v.hasAttribute('controls'));
  t('no-download rules are untouched (nodownload, no picture-in-picture, right click blocked)', v.getAttribute('controlslist') === 'nodownload' && v.hasAttribute('disablepictureinpicture') && v.getAttribute('oncontextmenu') === 'return false');
  t('a video without data-vo (not a lesson video) is left alone', (() => { const o = w.document.createElement('video'); o.setAttribute('controls', ''); w.document.getElementById('a').appendChild(o); return true; })());
  await tick(30);
  const plain = w.document.querySelectorAll('video:not([data-vo])')[0];
  t('plain video keeps its controls and gets no bar', plain.hasAttribute('controls') && bars(w).length === 1);

  // play / pause
  q(w, '.vp-btn[aria-label="Play"]').click();
  t('Play starts the video and the button becomes Pause', v.paused === false && !!q(w, '.vp-btn[aria-label="Pause"]'));
  q(w, '.vp-btn[aria-label="Pause"]').click();
  t('Pause stops it and the button becomes Play again', v.paused === true && !!q(w, '.vp-btn[aria-label="Play"]'));
  v.click();
  t('tapping the picture plays it', v.paused === false);
  v.click();
  t('tapping again pauses it', v.paused === true);

  // time, seek, skip
  setDur(w, v, 100);
  t('time shows the length', q(w, '.vp-time').textContent === '0:00 / 1:40');
  v.currentTime = 50; v.dispatchEvent(new w.Event('timeupdate'));
  t('seek bar and time follow the video', q(w, '.vp-seek').value === '500' && q(w, '.vp-time').textContent === '0:50 / 1:40');
  q(w, '.vp-btn[aria-label="Back 10 seconds"]').click(); t('back 10 seconds', v.currentTime === 40);
  q(w, '.vp-btn[aria-label="Forward 10 seconds"]').click(); t('forward 10 seconds', v.currentTime === 50);
  v.currentTime = 97; q(w, '.vp-btn[aria-label="Forward 10 seconds"]').click(); t('forward stops at the end', v.currentTime === 100);
  v.currentTime = 4; q(w, '.vp-btn[aria-label="Back 10 seconds"]').click(); t('back stops at the start', v.currentTime === 0);
  q(w, '.vp-seek').value = '250'; q(w, '.vp-seek').dispatchEvent(new w.Event('input'));
  t('dragging the seek bar jumps there', v.currentTime === 25);

  // speed + volume
  const sp = q(w, '.vp-btn[aria-label="Playback speed"]');
  sp.click(); t('speed 1x > 1.25x and the label follows', v.playbackRate === 1.25 && sp.textContent === '1.25x');
  sp.click(); sp.click(); sp.click(); t('speed wraps back to 0.75x', v.playbackRate === 0.75 && sp.textContent === '0.75x');
  const vol = q(w, '.vp-vol'); vol.value = '0.4'; vol.dispatchEvent(new w.Event('input'));
  t('volume slider sets the video volume and never mutes it (voiceover keeps working)', Math.abs(v.volume - 0.4) < 1e-9 && v.muted === false);

  // full screen
  let fsCalls = 0; v.requestFullscreen = function () { fsCalls++; return Promise.resolve(); };
  q(w, '.vp-btn[aria-label="Fullscreen"]').click();
  t('full screen: asks the browser and gives its own controls back while it is open', fsCalls === 1 && v.controls === true);
  w.document.dispatchEvent(new w.Event('fullscreenchange'));
  t('leaving full screen: our bar is used again, browser controls off', v.controls === false);

  // keyboard on the bar
  v.currentTime = 30; bars(w)[0].dispatchEvent(new w.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
  t('Right arrow on the bar skips 10 seconds forward', v.currentTime === 40);

  // re-draw: app throws the page away, vkeep puts the real video back (no second bar, bar comes back)
  const holder = w.document.getElementById('a');
  while (holder.firstChild) holder.removeChild(holder.firstChild);          // the app re-draws
  const neu = mk(w); neu.setAttribute('data-fresh', '1');                   // fresh copy of the template
  neu.replaceWith(v);                                                       // vkeep.js: the old, playing element goes back in
  await tick(40);
  t('after a re-draw the SAME bar is put back under the kept video, only one', bars(w).length === 1 && v.nextSibling === bars(w)[0] && v.controls === false);
  setDur(w, v, 100); v.currentTime = 10; v.dispatchEvent(new w.Event('timeupdate'));
  t('the kept video\'s bar still follows it', q(w, '.vp-time').textContent === '0:10 / 1:40');

  // a new video added later is decorated; a decorated one is not doubled
  const v2 = mk(w, { 'data-vo': 'b2' }); await tick(40);
  t('a video added later gets its own bar, the old one is not doubled', bars(w).length === 2 && v2.nextSibling && v2.nextSibling.className === 'vp-bar');

  // opt-out
  const v3 = mk(w, { 'data-vo': 'c3', 'data-vp-off': '1' }); await tick(40);
  t('data-vp-off: video keeps its browser controls', v3.hasAttribute('controls') && bars(w).length === 2);

  // other scripts' bars (voiceover bar, loudness slider) can sit next to ours
  w = page(); v = mk(w);
  const vo = w.document.createElement('div'); vo.className = 'vo-bar'; v.parentNode.insertBefore(vo, v.nextSibling);   // voiceover.js does exactly this
  await tick(40);
  t('voiceover bar was there first: our bar still goes first under the video, voiceover bar below it', bars(w).length === 1 && v.nextSibling === bars(w)[0] && bars(w)[0].nextSibling === vo);
  const late = w.document.createElement('div'); late.className = 'vb-row'; v.parentNode.insertBefore(late, v.nextSibling);   // vboost.js adds its loudness row like this
  await tick(40);
  t('loudness row added later right under the video: our bar moves back up, order = video, controls, voiceover, loudness', v.nextSibling === bars(w)[0] && bars(w)[0].nextSibling === late || (v.nextSibling === bars(w)[0] && [...v.parentNode.children].indexOf(late) > [...v.parentNode.children].indexOf(bars(w)[0])));
  t('still exactly one bar after that', bars(w).length === 1);

  // safety: if building the bar fails, the browser's controls stay
  w = page(); const orig = w.document.createElementNS; w.document.createElementNS = function () { throw new Error('boom'); };
  v = mk(w); await tick(40);
  t('if the bar cannot be built, the browser controls stay on the video', v.hasAttribute('controls') && bars(w).length === 0);
  w.document.createElementNS = orig;

  finish();
})();
function finish() { console.log('\n' + pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0); }
