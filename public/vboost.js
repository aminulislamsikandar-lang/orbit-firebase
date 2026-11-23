/* vboost.js - makes the sound of every recorded <video> on the page louder (default 3x) while it plays.
 * The video file itself is never changed; nothing is downloaded or uploaded again.
 *
 *   video -> GainNode (x3) -> DynamicsCompressor (stops loud parts from cracking) -> speakers
 *
 * Videos are picked up with a MutationObserver (the app re-draws its HTML, so <video> elements are replaced often).
 * A video from another site (Backblaze) can only go through Web Audio if the browser fetched it with CORS; otherwise the browser
 * would play SILENCE. So:
 *   - for such a video we set crossorigin="anonymous" and reload it before it plays;
 *   - if that fails (the bucket has no CORS rule yet) we remove crossorigin again and the video plays normally, without boost;
 *   - a video is only connected to Web Audio when that is safe AND the AudioContext is running.
 * Change the loudness with window.ORBIT_VIDEO_GAIN = 2 (before this file loads), allowed 1 to 6.
 */
(function (g) {
  "use strict";
  var DEFAULT_GAIN = 3, MAX_GAIN = 6;

  /* ---------- pure helpers (tested in Node) ---------- */
  function gainValue(x) { var n = Number(x); return isFinite(n) && n >= 1 ? Math.min(n, MAX_GAIN) : DEFAULT_GAIN; }
  function isCross(src, base) {
    try { var u = new URL(src, base), b = new URL(base); return /^https?:$/.test(u.protocol) && u.origin !== b.origin; } catch (e) { return false; }
  }
  // Is it safe to send this video through Web Audio? Same-site / blob: always; another site only when it was loaded with CORS.
  function safeToBoost(src, crossOrigin, base) { return !isCross(src, base) || crossOrigin === "anonymous"; }

  var api = { gainValue: gainValue, isCross: isCross, safeToBoost: safeToBoost, DEFAULT_GAIN: DEFAULT_GAIN };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (!g || !g.document) return;
  g.VBoost = api;

  /* ---------- browser part ---------- */
  var doc = g.document, ctx = null, done = new WeakSet(), failed = new WeakSet();
  var here = function () { return g.location.href; };
  var srcOf = function (v) { return v.currentSrc || v.getAttribute("src") || ""; };

  // New <video> with a file from another site: ask for CORS before it loads, so Web Audio is allowed to touch it later.
  function prep(v) {
    if (!v || v.tagName !== "VIDEO" || done.has(v) || failed.has(v)) return;
    if (v.hasAttribute("data-vb-off") || v.hasAttribute("data-vb-cors")) return;
    var src = v.getAttribute("src") || "";
    if (!src || !isCross(src, here()) || v.getAttribute("crossorigin") !== null) return;
    v.setAttribute("data-vb-cors", "1");
    v.crossOrigin = "anonymous";
    try { v.load(); } catch (e) { /* ignore */ }
  }
  function scan(node) {
    if (!node || node.nodeType !== 1) return;
    if (node.tagName === "VIDEO") prep(node);
    else if (node.querySelectorAll) { var l = node.querySelectorAll("video"); for (var i = 0; i < l.length; i++) prep(l[i]); }
  }

  // The CORS request failed (no CORS rule on the bucket): fall back to the plain video. Runs BEFORE the app's own onerror, which
  // would otherwise throw the video away.
  doc.addEventListener("error", function (e) {
    var v = e.target;
    if (!v || v.tagName !== "VIDEO" || !v.hasAttribute("data-vb-cors") || v.hasAttribute("data-vb-off")) return;
    e.stopImmediatePropagation();
    v.setAttribute("data-vb-off", "1");
    failed.add(v);
    v.removeAttribute("crossorigin");
    try { v.load(); } catch (x) { /* ignore */ }
  }, true);

  function attach(v) {
    if (done.has(v) || failed.has(v) || !ctx || ctx.state !== "running") return;
    if (!safeToBoost(srcOf(v), v.crossOrigin, here())) { failed.add(v); return; }
    try {
      var src = ctx.createMediaElementSource(v), gain = ctx.createGain(), comp = ctx.createDynamicsCompressor();
      gain.gain.value = gainValue(g.ORBIT_VIDEO_GAIN);
      comp.threshold.value = -10; comp.knee.value = 8; comp.ratio.value = 12; comp.attack.value = 0.003; comp.release.value = 0.2;
      src.connect(gain); gain.connect(comp); comp.connect(ctx.destination);
      done.add(v);
    } catch (e) { failed.add(v); }
  }

  doc.addEventListener("play", function (e) {
    var v = e.target;
    if (!v || v.tagName !== "VIDEO" || failed.has(v)) return;
    var AC = g.AudioContext || g.webkitAudioContext;
    if (!AC) return;
    try { if (!ctx) ctx = new AC(); } catch (x) { return; }
    // A video that is already connected goes silent if the context was suspended (phone call, background tab): wake it again.
    var ready = ctx.state === "running" ? Promise.resolve() : ctx.resume();
    ready.then(function () { attach(v); }, function () { /* context blocked: the video keeps its normal sound */ });
  }, true);

  if (g.MutationObserver) {
    new g.MutationObserver(function (list) {
      for (var i = 0; i < list.length; i++) for (var j = 0; j < list[i].addedNodes.length; j++) scan(list[i].addedNodes[j]);
    }).observe(doc.documentElement, { childList: true, subtree: true });
  }
  scan(doc.documentElement);
})(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this));
