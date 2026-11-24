/* vboost.js - makes the sound of every recorded <video> on the page louder (default 3x) while it plays.
 * The video file itself is never changed; nothing is downloaded or uploaded again.
 *
 *   video -> GainNode (x3) -> DynamicsCompressor (evens out loud parts) -> limiter (catches the last peaks) -> speakers
 *
 * Every boosted video gets a small "Loudness" slider (1x to 4x) under it, so a student can turn it down. The choice is remembered
 * on that phone (localStorage) and applies to every video. The slider only appears for a video that is really boosted.
 *
 * Videos are picked up with a MutationObserver (the app re-draws its HTML, so <video> elements are replaced often).
 * A video from another site (Backblaze) can only go through Web Audio if the browser fetched it with CORS; otherwise the browser
 * would play SILENCE. So:
 *   - for such a video we set crossorigin="anonymous" and reload it before it plays;
 *   - if that fails (the bucket has no CORS rule yet) we remove crossorigin again and the video plays normally, without boost;
 *   - a video is only connected to Web Audio when that is safe AND the AudioContext is running.
 * First-time loudness (before a student moves the slider): window.ORBIT_VIDEO_GAIN = 2 (before this file loads), default 3.
 */
(function (g) {
  "use strict";
  var DEFAULT_GAIN = 3, MAX_GAIN = 6, LEVEL_MAX = 4, STORE_KEY = "orbit.vboost.gain";

  /* ---------- pure helpers (tested in Node) ---------- */
  function gainValue(x) { var n = Number(x); return isFinite(n) && n >= 1 ? Math.min(n, MAX_GAIN) : DEFAULT_GAIN; }
  // The student's slider: 1x to 4x. Anything else (junk, below 1) falls back to `fallback`; above 4 is cut to 4.
  function levelValue(x, fallback) { var n = Number(x); return isFinite(n) && n >= 1 ? Math.min(n, LEVEL_MAX) : fallback; }
  function isCross(src, base) {
    try { var u = new URL(src, base), b = new URL(base); return /^https?:$/.test(u.protocol) && u.origin !== b.origin; } catch (e) { return false; }
  }
  // Is it safe to send this video through Web Audio? Same-site / blob: always; another site only when it was loaded with CORS.
  function safeToBoost(src, crossOrigin, base) { return !isCross(src, base) || crossOrigin === "anonymous"; }

  var api = { gainValue: gainValue, levelValue: levelValue, isCross: isCross, safeToBoost: safeToBoost, DEFAULT_GAIN: DEFAULT_GAIN, LEVEL_MAX: LEVEL_MAX };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (!g || !g.document) return;
  g.VBoost = api;

  /* ---------- browser part ---------- */
  var doc = g.document, ctx = null, done = new WeakSet(), failed = new WeakSet();
  var here = function () { return g.location.href; };
  var srcOf = function (v) { return v.currentSrc || v.getAttribute("src") || ""; };

  // ---- loudness level (slider) ----
  var level = (function () {
    var fb = Math.min(gainValue(g.ORBIT_VIDEO_GAIN), LEVEL_MAX);
    try { var saved = g.localStorage.getItem(STORE_KEY); if (saved !== null) return levelValue(saved, fb); } catch (e) { /* storage blocked */ }
    return fb;
  })();
  var gains = [];   // { v: video, node: GainNode } of the boosted videos
  var fmt = function (n) { return (Math.round(n * 10) / 10) + "x"; };

  function addStyle() {
    if (doc.getElementById("vb-css")) return;
    var st = doc.createElement("style"); st.id = "vb-css";
    st.textContent = ".vb-row{display:flex;align-items:center;gap:10px;margin:6px 0 10px;font-size:13px}" +
      ".vb-row label{font-weight:600;white-space:nowrap}.vb-row input{flex:1;min-width:0;height:32px}" +
      ".vb-val{min-width:2.5em;text-align:right;font-variant-numeric:tabular-nums}";
    (doc.head || doc.documentElement).appendChild(st);
  }
  function setLevel(x) {
    level = levelValue(x, level);
    try { g.localStorage.setItem(STORE_KEY, String(level)); } catch (e) { /* ignore */ }
    gains = gains.filter(function (o) { return o.v.isConnected !== false; });
    gains.forEach(function (o) {
      try { if (ctx && o.node.gain.setTargetAtTime) o.node.gain.setTargetAtTime(level, ctx.currentTime, 0.03); else o.node.gain.value = level; }
      catch (e) { o.node.gain.value = level; }
    });
    var rows = doc.querySelectorAll(".vb-row");
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i].querySelector("input"), l = rows[i].querySelector(".vb-val");
      if (r) r.value = String(level);
      if (l) l.textContent = fmt(level);
    }
    return level;
  }
  // One slider row right under a boosted video (also after the app re-draws and the video is moved back in).
  function ensureRow(v) {
    if (!done.has(v) || !v.parentNode) return;
    for (var n = v.nextSibling, k = 0; n && k < 4; n = n.nextSibling, k++) if (n.classList && n.classList.contains("vb-row")) return;
    addStyle();
    var row = doc.createElement("div"); row.className = "vb-row";
    var lab = doc.createElement("label"); lab.textContent = "Loudness";
    var rng = doc.createElement("input"); rng.type = "range"; rng.min = "1"; rng.max = String(LEVEL_MAX); rng.step = "0.5";
    rng.value = String(level); rng.setAttribute("aria-label", "Loudness");
    var val = doc.createElement("span"); val.className = "vb-val"; val.textContent = fmt(level);
    rng.addEventListener("input", function () { setLevel(parseFloat(rng.value)); });
    row.appendChild(lab); row.appendChild(rng); row.appendChild(val);
    v.parentNode.insertBefore(row, v.nextSibling);
  }
  g.VBoost.setLevel = setLevel; g.VBoost.getLevel = function () { return level; };

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
    if (node.tagName === "VIDEO") { prep(node); ensureRow(node); }
    else if (node.querySelectorAll) { var l = node.querySelectorAll("video"); for (var i = 0; i < l.length; i++) { prep(l[i]); ensureRow(l[i]); } }
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
      var src = ctx.createMediaElementSource(v), gain = ctx.createGain(), comp = ctx.createDynamicsCompressor(), lim = ctx.createDynamicsCompressor();
      gain.gain.value = level;
      comp.threshold.value = -10; comp.knee.value = 8; comp.ratio.value = 12; comp.attack.value = 0.003; comp.release.value = 0.2;
      lim.threshold.value = -2; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = 0.001; lim.release.value = 0.05;   // catches the peaks the compressor lets through
      src.connect(gain); gain.connect(comp); comp.connect(lim); lim.connect(ctx.destination);
      done.add(v); gains.push({ v: v, node: gain });
      ensureRow(v);
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
