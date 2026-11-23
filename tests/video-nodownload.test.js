// Recorded lesson videos (the ones played from the private Backblaze links): the player menu has no Download and no Picture-in-picture,
// and a right click on the video does nothing. This only hides the buttons; a student who really wants the file can still record or copy it.
// The DOM part needs jsdom (dev only) and is skipped if it is missing. Run: node tests/video-nodownload.test.js
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
let JSDOM = null; try { ({ JSDOM } = require('jsdom')); } catch (e) {}
let pass = 0, fail = 0;
const t = (name, ok, extra) => { if (ok) pass++; else { fail++; console.log('FAIL  ' + name + (extra ? '  ' + extra : '')); } };

const html = fs.readFileSync(path.join(ROOT, 'public', 'index.html'), 'utf8');
const sw = fs.readFileSync(path.join(ROOT, 'public', 'sw.js'), 'utf8');
const tags = html.match(/<video\b[^>]*>/g) || [];

t('index.html has the recorded-video templates (the lesson list and the chapter page)', tags.length >= 2, 'found ' + tags.length);
tags.forEach((tag, i) => {
  const n = 'video template ' + (i + 1) + ': ';
  t(n + 'still has the player controls, inline play and the voiceover id', /\bcontrols\b/.test(tag) && /\bplaysinline\b/.test(tag) && /data-vo=/.test(tag));
  t(n + 'controlsList="nodownload" (no Download in the player menu)', /controlsList="nodownload"/.test(tag));
  t(n + 'disablePictureInPicture', /\bdisablePictureInPicture\b/.test(tag));
  t(n + 'right click is switched off', /oncontextmenu="return false"/.test(tag));
  t(n + 'playback speed is NOT removed (students use it)', !/noplaybackrate/i.test(tag));
});
t('service worker cache version moved up, so phones get the new index.html', /const SHELL = 'orbit-shell-v(7[6-9]|[89]\d|\d{3,})'/.test(sw));

if (!JSDOM) { console.log('SKIP  jsdom not installed - the right-click check on a real element was not run'); }
else {
  tags.forEach((tag, i) => {
    const w = new JSDOM('<!doctype html><body></body>', { runScripts: 'dangerously' }).window;
    w.document.body.innerHTML = tag.replace(/\$\{[^}]*\}/g, 'x') + '</video>';
    const v = w.document.querySelector('video');
    const ev = new w.MouseEvent('contextmenu', { bubbles: true, cancelable: true });
    v.dispatchEvent(ev);
    t('video template ' + (i + 1) + ' on a real element: right click is cancelled', ev.defaultPrevented === true);
    t('video template ' + (i + 1) + ' on a real element: the attributes are on the element', v.getAttribute('controlslist') === 'nodownload' && v.hasAttribute('disablepictureinpicture') && v.hasAttribute('controls'));
  });
}
console.log(pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
