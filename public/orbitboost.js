// Orbit loudness boost - ONE FILE (boost engine + automatic loudness slider).
//
// Makes the app's lesson videos (<video data-vo="...">) louder than the browser's
// 100% limit: video -> gain (default 3x) -> compressor -> limiter -> speakers.
// Each video gets a small "Loudness" slider (1x-4x) under it. The native
// controls, the voiceover and the app's redraws are not touched.
//
// Safe by design: if a video cannot be boosted it plays normally and the slider hides.
//
// SETUP: add  <script src="/orbitboost.js"></script>  after ytplayer.js in index.html,
// add '/orbitboost.js' to the file list in sw.js (and bump SHELL version).
// Videos on another site (Backblaze B2) need CORS allowed for this site first; then set
// corsReady to true below. While it is false, videos load exactly as before.

(function (g) {
  'use strict';

  var DEFAULT_GAIN = 3;
  var MIN_GAIN = 1;
  var MAX_GAIN = 4;
  var STORE_KEY = 'orbit.boost.gain';

  function clampGain(v) {
    v = Number(v);
    if (!isFinite(v)) return DEFAULT_GAIN;
    return Math.min(MAX_GAIN, Math.max(MIN_GAIN, v));
  }

  function loadGain() {
    try {
      var s = g.localStorage.getItem(STORE_KEY);
      return s === null ? DEFAULT_GAIN : clampGain(s);
    } catch (e) { return DEFAULT_GAIN; }
  }

  function saveGain(v) {
    try { g.localStorage.setItem(STORE_KEY, String(v)); } catch (e) { /* ignore */ }
  }

  // ONE audio context for the whole page. The app redraws its video elements
  // often; a new context per video would pile up and browsers cap how many exist.
  var shared = null;
  function getCtx(AC) {
    if (!shared || shared.state === 'closed') shared = new AC();
    return shared;
  }

  function sameOrigin(url) {
    try { return new URL(url, g.location.href).origin === g.location.origin; }
    catch (e) { return false; }
  }

  // A video can be boosted only if the browser is allowed to read its audio:
  // same site, or loaded with the crossorigin attribute (and the server sent
  // CORS headers). Otherwise Web Audio would output silence, so we do not try.
  function canBoost(video) {
    if (video.getAttribute && video.getAttribute('crossorigin') !== null) return true;
    return sameOrigin(video.currentSrc || video.src || '');
  }

  function attach(video, opts) {
    opts = opts || {};
    var AC = opts.AudioContext || g.AudioContext || g.webkitAudioContext;
    var state = { gain: opts.gain !== undefined ? clampGain(opts.gain) : loadGain(), active: false, failed: false };
    var ctx = null;
    var gainNode = null;
    var nodes = [];

    function build() {
      if (state.active || state.failed) return state.active;
      if (!AC || !canBoost(video)) { state.failed = true; return false; }
      try {
        ctx = getCtx(AC);
        var src = ctx.createMediaElementSource(video);
        gainNode = ctx.createGain();
        var comp = ctx.createDynamicsCompressor();
        comp.threshold.value = -14;
        comp.knee.value = 10;
        comp.ratio.value = 10;
        comp.attack.value = 0.003;
        comp.release.value = 0.25;
        var lim = ctx.createDynamicsCompressor();
        lim.threshold.value = -2;
        lim.knee.value = 0;
        lim.ratio.value = 20;
        lim.attack.value = 0.001;
        lim.release.value = 0.05;
        gainNode.gain.value = state.gain;
        src.connect(gainNode);
        gainNode.connect(comp);
        comp.connect(lim);
        lim.connect(ctx.destination);
        nodes = [src, gainNode, comp, lim];
        state.active = true;
      } catch (e) {
        state.failed = true;
        ctx = null;
        gainNode = null;
      }
      return state.active;
    }

    // Browsers only allow audio processing after the student presses play.
    function onPlay() {
      if (!build()) return;
      try { if (ctx.state === 'suspended') ctx.resume(); } catch (e) { /* ignore */ }
    }
    video.addEventListener('play', onPlay);

    return {
      getGain: function () { return state.gain; },
      isActive: function () { return state.active; },
      isUnavailable: function () { return state.failed; },
      setGain: function (v) {
        state.gain = clampGain(v);
        saveGain(state.gain);
        if (gainNode && ctx) {
          try {
            if (gainNode.gain.setTargetAtTime) gainNode.gain.setTargetAtTime(state.gain, ctx.currentTime, 0.03);
            else gainNode.gain.value = state.gain;
          } catch (e) { gainNode.gain.value = state.gain; }
        }
        return state.gain;
      },
      destroy: function () {
        video.removeEventListener('play', onPlay);
        nodes.forEach(function (n) { try { n.disconnect(); } catch (e) { /* ignore */ } });
        nodes = [];
      }
    };
  }

  var api = {
    // Flip to true ONLY after the video storage (Backblaze B2) sends CORS headers
    // for https://orbittutorial.web.app. While false, videos load exactly as before.
    corsReady: false,
    DEFAULT_GAIN: DEFAULT_GAIN, MIN_GAIN: MIN_GAIN, MAX_GAIN: MAX_GAIN,
    clampGain: clampGain, loadGain: loadGain, saveGain: saveGain,
    canBoost: canBoost, attach: attach
  };
  g.OrbitBoost = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);

(function (g) {
  'use strict';

  var doc = g.document;
  var B = g.OrbitBoost;
  if (!doc || !B) return;

  var SELECTOR = 'video[data-vo]';

  function addStyle() {
    if (doc.getElementById('orbit-boost-css')) return;
    var s = doc.createElement('style');
    s.id = 'orbit-boost-css';
    s.textContent = [
      '.ob-row{display:flex;align-items:center;gap:10px;margin:6px 0 10px;font-size:13px}',
      '.ob-row[hidden]{display:none}',
      '.ob-row label{font-weight:600;white-space:nowrap}',
      '.ob-row input{flex:1;min-width:0;height:32px}',
      '.ob-val{min-width:2.5em;text-align:right;font-variant-numeric:tabular-nums}'
    ].join('');
    (doc.head || doc.documentElement).appendChild(s);
  }

  function fmt(v) { return (Math.round(v * 10) / 10) + 'x'; }

  function decorate(video) {
    if (video.getAttribute('data-ob') === '1') return;
    video.setAttribute('data-ob', '1');
    // Cross-site video: the browser may only read its audio if it was loaded with
    // the crossorigin attribute. Do it here (before play) once CORS is confirmed.
    if (B.corsReady && !video.hasAttribute('crossorigin') && video.paused &&
        video.getAttribute('src') && !B.canBoost(video)) {
      video.setAttribute('crossorigin', 'anonymous');
      try { video.load(); } catch (e) { /* ignore */ }
    }
    var ctl = B.attach(video);

    var row = doc.createElement('div');
    row.className = 'ob-row';
    var label = doc.createElement('label');
    label.textContent = 'Loudness';
    var range = doc.createElement('input');
    range.type = 'range';
    range.min = String(B.MIN_GAIN);
    range.max = String(B.MAX_GAIN);
    range.step = '0.5';
    range.value = String(ctl.getGain());
    range.setAttribute('aria-label', 'Loudness');
    var val = doc.createElement('span');
    val.className = 'ob-val';
    val.textContent = fmt(ctl.getGain());
    row.appendChild(label);
    row.appendChild(range);
    row.appendChild(val);

    range.addEventListener('input', function () {
      var v = ctl.setGain(parseFloat(range.value));
      val.textContent = fmt(v);
    });
    // After the first play we know whether this video can be boosted.
    video.addEventListener('play', function () {
      g.setTimeout(function () { if (ctl.isUnavailable()) row.hidden = true; }, 0);
    });

    if (video.parentNode) video.parentNode.insertBefore(row, video.nextSibling);
  }

  function scan() {
    var list = doc.querySelectorAll(SELECTOR);
    for (var i = 0; i < list.length; i++) decorate(list[i]);
  }

  addStyle();
  scan();
  if (typeof g.MutationObserver !== 'undefined' && doc.body) {
    var pending = false;
    new g.MutationObserver(function () {
      if (pending) return;
      pending = true;
      (g.requestAnimationFrame || g.setTimeout)(function () { pending = false; scan(); });
    }).observe(doc.body, { childList: true, subtree: true });
  }
})(typeof window !== 'undefined' ? window : globalThis);
