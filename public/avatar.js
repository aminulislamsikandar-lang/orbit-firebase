/* avatar.js (Task 54): a simple cartoon face that moves its mouth while an answer is read aloud (the "Sunao" button).
 *   AVATAR.set(on)   index.html tells it whether any answer is being read.   AVATAR.pulse()   one spoken word -> the mouth opens for a moment.
 * It follows the browser voice itself (speechSynthesis.speaking), so it can never get stuck on screen. No images, no library, about 3 KB.
 * Not a real person: a round friendly face only. Tapping the face stops the voice. Everything is built with DOM calls (no innerHTML).
 */
(function (g) {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var LABEL = { hing: 'Awaaz band karo', en: 'Stop the voice', as: 'মাতটো বন্ধ কৰক', bn: 'আওয়াজ বন্ধ করো' };
  var st = { wanted: false, since: 0, last: -9999, timer: 0, root: null, mouth: null, eyeL: null, eyeR: null, open: 0, blinkAt: 0 };
  function now() { return (g.performance && performance.now) ? performance.now() : Date.now(); }
  function el(tag, attrs, parent) { var e = document.createElementNS(NS, tag); for (var k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }
  function speaking() { try { return !!(g.speechSynthesis && g.speechSynthesis.speaking); } catch (e) { return false; } }
  function lang() { return (g.orbitLang && g.orbitLang()) || 'hing'; }
  function still() { return !!(g.matchMedia && g.matchMedia('(prefers-reduced-motion: reduce)').matches); }

  function build() {
    var d = document.createElement('div');
    d.id = 'avatar'; d.setAttribute('role', 'button'); d.tabIndex = 0;
    d.style.cssText = 'position:fixed;right:12px;bottom:84px;width:76px;height:76px;z-index:60;cursor:pointer;touch-action:manipulation;filter:drop-shadow(0 2px 6px rgba(0,0,0,.25))';
    var svg = el('svg', { viewBox: '0 0 100 100', width: '76', height: '76', 'aria-hidden': 'true' }, d);
    el('line', { x1: 50, y1: 6, x2: 50, y2: 16, stroke: '#546e7a', 'stroke-width': 3, 'stroke-linecap': 'round' }, svg);   // antenna: friendly helper, not a person
    el('circle', { cx: 50, cy: 5, r: 4, fill: '#ff7043' }, svg);
    el('circle', { cx: 50, cy: 55, r: 40, fill: '#4dd0e1', stroke: '#00838f', 'stroke-width': 3 }, svg);
    el('circle', { cx: 28, cy: 62, r: 6, fill: '#ff8a80', opacity: '.6' }, svg); el('circle', { cx: 72, cy: 62, r: 6, fill: '#ff8a80', opacity: '.6' }, svg);
    st.eyeL = el('ellipse', { cx: 36, cy: 46, rx: 6, ry: 7, fill: '#263238' }, svg); st.eyeR = el('ellipse', { cx: 64, cy: 46, rx: 6, ry: 7, fill: '#263238' }, svg);
    el('circle', { cx: 38, cy: 43, r: 2, fill: '#fff' }, svg); el('circle', { cx: 66, cy: 43, r: 2, fill: '#fff' }, svg);
    st.mouth = el('ellipse', { cx: 50, cy: 70, rx: 11, ry: 2, fill: '#b71c1c', stroke: '#263238', 'stroke-width': 2 }, svg);
    d.onclick = function () { try { g.speechSynthesis.cancel(); } catch (e) { } st.wanted = false; hide(); };
    d.onkeydown = function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); d.onclick(); } };
    return d;
  }
  function show() {
    if (!st.root || !st.root.isConnected) { st.root = build(); document.body.appendChild(st.root); }
    st.root.setAttribute('aria-label', LABEL[lang()] || LABEL.hing); st.root.style.display = '';
    if (!st.timer) st.timer = setInterval(tick, 80);
  }
  function hide() {
    if (st.timer) { clearInterval(st.timer); st.timer = 0; }
    if (st.root) st.root.style.display = 'none';
  }
  function tick() {
    var t = now();
    if (!st.wanted || (!speaking() && t - st.since > 1500)) { st.wanted = false; hide(); return; }
    var target;
    if (still()) target = .35;                                   // no wobbling for children who asked their phone for less motion
    else if (t - st.last < 140) target = .6 + .4 * Math.abs(Math.sin(t / 55));   // a word was just spoken: mouth open
    else if (t - st.last > 800) target = .5 + .5 * Math.abs(Math.sin(t / 120)); // this voice sends no word events: keep a gentle talking motion
    else target = .08;                                           // short gap between words
    st.open += (target - st.open) * .6;
    st.mouth.setAttribute('ry', (2 + st.open * 12).toFixed(1)); st.mouth.setAttribute('rx', (12 - st.open * 3).toFixed(1));
    if (t > st.blinkAt) { st.eyeL.setAttribute('ry', 1.5); st.eyeR.setAttribute('ry', 1.5); if (t > st.blinkAt + 140) { st.eyeL.setAttribute('ry', 7); st.eyeR.setAttribute('ry', 7); st.blinkAt = t + 2200 + Math.random() * 2200; } }
  }
  function set(on) {
    if (on && !st.wanted) { st.wanted = true; st.since = now(); st.last = -9999; st.blinkAt = now() + 1500; show(); }
    else if (!on && st.wanted && !speaking()) { st.wanted = false; hide(); }
  }
  function pulse() { st.last = now(); }
  g.AVATAR = { set: set, pulse: pulse, _s: st };
})(typeof window !== 'undefined' ? window : globalThis);
