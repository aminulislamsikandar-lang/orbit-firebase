/* vplayer.js - Orbit's own control bar for the recorded lesson videos (<video data-vo="...">).
 *
 *   [ seek bar ........................................ ]
 *   [ play ] [ -10 ] [ +10 ]  0:42 / 5:10        [ volume ] [ 1x ] [ fullscreen ]
 *
 * It is a SKIN, not a replacement: the <video> element stays exactly where the app put it, so vkeep.js (keeps a playing video
 * alive across re-draws), voiceover.js (narration bar + muting), vboost.js (louder sound + slider) and the no-download rules
 * (nodownload, no picture-in-picture, no right click) keep working unchanged. We only switch off the browser's own control bar
 * and put ours right under the video. If anything fails before the bar exists, the video keeps its normal browser controls.
 *
 * Fullscreen: the browser's own controls come back while the video is full screen (our bar is not part of it) and go away again
 * when the student leaves full screen.
 * Volume slider: set on the video itself (never "muted"), so voiceover.js, which follows the video volume, keeps working. It is
 * hidden on touch phones, where the phone's own volume keys are used.
 * Opt out for one video: add the attribute data-vp-off.
 */
(function (g) {
  "use strict";

  var SPEEDS = [0.75, 1, 1.25, 1.5, 2];

  /* ---------- pure helpers (tested in Node) ---------- */
  function fmt(sec) {
    var n = Number(sec);
    if (!isFinite(n) || n < 0) n = 0;
    n = Math.floor(n);
    var h = Math.floor(n / 3600), m = Math.floor((n % 3600) / 60), s = n % 60;
    var ss = (s < 10 ? "0" : "") + s;
    return h > 0 ? h + ":" + (m < 10 ? "0" : "") + m + ":" + ss : m + ":" + ss;
  }
  // 0.75 -> 1 -> 1.25 -> 1.5 -> 2 -> back to 0.75. An unknown speed goes to 1x.
  function nextSpeed(cur) {
    var i = SPEEDS.indexOf(Number(cur));
    return i < 0 ? 1 : SPEEDS[(i + 1) % SPEEDS.length];
  }
  // Where a +/- skip lands: never before 0, never after the end (when the length is known).
  function skipTarget(cur, delta, dur) {
    var t = (Number(cur) || 0) + delta;
    if (t < 0) t = 0;
    if (isFinite(dur) && dur > 0 && t > dur) t = dur;
    return t;
  }

  var api = { fmt: fmt, nextSpeed: nextSpeed, skipTarget: skipTarget, SPEEDS: SPEEDS };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (!g || !g.document) return;
  g.VPlayer = api;

  /* ---------- browser part ---------- */
  var doc = g.document, states = new WeakMap();
  var SVG = "http://www.w3.org/2000/svg";
  var ICONS = {
    play: "M8 5v14l11-7z",
    pause: "M6 5h4v14H6zM14 5h4v14h-4z",
    back: "M12 5V1L7 6l5 5V7a6 6 0 1 1-6 6H4a8 8 0 1 0 8-8z",
    fwd: "M12 5V1l5 5-5 5V7a6 6 0 1 0 6 6h2a8 8 0 1 1-8-8z",
    full: "M5 5h5v2H7v3H5V5zm9 0h5v5h-2V7h-3V5zM5 14h2v3h3v2H5v-5zm12 0h2v5h-5v-2h3v-3z"
  };
  var noop = function () {};

  function addStyle() {
    if (doc.getElementById("vp-css")) return;
    var st = doc.createElement("style"); st.id = "vp-css";
    st.textContent =
      ".vp-bar{display:flex;flex-wrap:wrap;align-items:center;gap:0 2px;margin:6px 0 4px;padding:4px 8px 6px;background:var(--card,#fff);color:var(--tx,#111);border:1px solid var(--ln,#cfcac0);border-radius:12px;font-size:13px}" +
      ".vp-bar input[type=range]{accent-color:var(--tx,#111);margin:0;cursor:pointer}" +
      ".vp-seek{flex:1 0 100%;width:100%;height:32px}" +
      ".vp-btn{min-width:44px;height:44px;border:0;border-radius:10px;background:transparent;color:inherit;display:inline-flex;align-items:center;justify-content:center;gap:4px;font:inherit;font-weight:600;cursor:pointer;padding:0 6px}" +
      ".vp-btn:hover{background:var(--hov,rgba(0,0,0,.07))}.vp-btn:focus-visible{outline:2px solid var(--tx,#111);outline-offset:-2px}" +
      ".vp-btn svg{width:22px;height:22px;fill:currentColor}" +
      ".vp-time{margin:0 6px;font-variant-numeric:tabular-nums;color:var(--mut,#6b6b6b);white-space:nowrap}" +
      ".vp-gap{flex:1}.vp-vol{width:80px}" +
      "@media (pointer:coarse){.vp-vol{display:none}}";
    (doc.head || doc.documentElement).appendChild(st);
  }

  function el(tag, cls, text) {
    var n = doc.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }
  function icon(name) {
    var s = doc.createElementNS(SVG, "svg"), p = doc.createElementNS(SVG, "path");
    s.setAttribute("viewBox", "0 0 24 24"); s.setAttribute("aria-hidden", "true");
    p.setAttribute("d", ICONS[name]); s.appendChild(p);
    return s;
  }
  function setIcon(b, name) { while (b.firstChild) b.removeChild(b.firstChild); b.appendChild(icon(name)); }
  function button(label, ic, text) {
    var b = el("button", "vp-btn");
    b.type = "button"; b.setAttribute("aria-label", label); b.title = label;
    if (ic) b.appendChild(icon(ic));
    if (text) b.appendChild(el("span", "", text));
    return b;
  }
  function togglePlay(v) {
    if (v.paused || v.ended) { var r; try { r = v.play(); } catch (e) { return; } if (r && r.catch) r.catch(noop); }
    else v.pause();
  }
  function dur(v) { return isFinite(v.duration) ? v.duration : 0; }

  function enterFull(v) {
    // our bar is not part of full screen, so give the browser's own controls back while it is open
    if (v.requestFullscreen || v.webkitRequestFullscreen) {
      v.controls = true;
      var r;
      try { r = v.requestFullscreen ? v.requestFullscreen() : v.webkitRequestFullscreen(); } catch (e) { v.controls = false; return; }
      if (r && r.catch) r.catch(function () { v.controls = false; });
    } else if (v.webkitEnterFullscreen) {
      try { v.webkitEnterFullscreen(); } catch (e) { /* ignore */ }   // iPhone: its own full screen player
    }
  }
  function leaveFull() {
    var f = doc.exitFullscreen || doc.webkitExitFullscreen;
    if (f) { try { var r = f.call(doc); if (r && r.catch) r.catch(noop); } catch (e) { /* ignore */ } }
  }
  function onFullChange() {
    if (doc.fullscreenElement || doc.webkitFullscreenElement) return;
    var list = doc.querySelectorAll("video[data-vp]");
    for (var i = 0; i < list.length; i++) list[i].controls = false;
  }
  doc.addEventListener("fullscreenchange", onFullChange);
  doc.addEventListener("webkitfullscreenchange", onFullChange);

  function build(v) {
    var bar = el("div", "vp-bar");
    bar.setAttribute("role", "group"); bar.setAttribute("aria-label", "Video controls");

    var seek = el("input", "vp-seek");
    seek.type = "range"; seek.min = "0"; seek.max = "1000"; seek.step = "1"; seek.value = "0";
    seek.setAttribute("aria-label", "Seek");

    var playB = button("Play", "play"), backB = button("Back 10 seconds", "back"), fwdB = button("Forward 10 seconds", "fwd");
    var time = el("span", "vp-time", "0:00 / 0:00");
    var gap = el("span", "vp-gap");
    var vol = el("input", "vp-vol");
    vol.type = "range"; vol.min = "0"; vol.max = "1"; vol.step = "0.05"; vol.value = "1"; vol.setAttribute("aria-label", "Volume");
    var speedB = button("Playback speed", null, "1x"), fullB = button("Fullscreen", "full");

    bar.appendChild(seek);
    [playB, backB, fwdB, time, gap, vol, speedB, fullB].forEach(function (n) { bar.appendChild(n); });

    function update() {
      var d = dur(v);
      seek.value = String(d ? Math.round((v.currentTime / d) * 1000) : 0);
      time.textContent = fmt(v.currentTime) + " / " + fmt(d);
      var lab = v.paused || v.ended ? "Play" : "Pause";
      if (playB.getAttribute("aria-label") !== lab) { setIcon(playB, lab === "Play" ? "play" : "pause"); playB.setAttribute("aria-label", lab); playB.title = lab; }
      speedB.lastChild.textContent = (v.playbackRate || 1) + "x";
      vol.value = String(v.volume);
    }
    ["loadedmetadata", "durationchange", "timeupdate", "play", "pause", "ended", "ratechange", "volumechange", "seeked"].forEach(function (e) { v.addEventListener(e, update); });

    playB.addEventListener("click", function () { togglePlay(v); });
    backB.addEventListener("click", function () { v.currentTime = skipTarget(v.currentTime, -10, dur(v)); });
    fwdB.addEventListener("click", function () { v.currentTime = skipTarget(v.currentTime, 10, dur(v)); });
    speedB.addEventListener("click", function () { v.playbackRate = nextSpeed(v.playbackRate); update(); });
    fullB.addEventListener("click", function () { if (doc.fullscreenElement || doc.webkitFullscreenElement) leaveFull(); else enterFull(v); });
    seek.addEventListener("input", function () { var d = dur(v); if (d) v.currentTime = (seek.value / 1000) * d; });
    vol.addEventListener("input", function () { v.volume = parseFloat(vol.value); });
    v.addEventListener("click", function () { togglePlay(v); });   // tap the picture to play / pause
    bar.addEventListener("keydown", function (e) {
      var inRange = e.target && e.target.tagName === "INPUT";
      if (inRange) return;
      if (e.key === "ArrowLeft" || e.key === "j") { e.preventDefault(); v.currentTime = skipTarget(v.currentTime, -10, dur(v)); }
      else if (e.key === "ArrowRight" || e.key === "l") { e.preventDefault(); v.currentTime = skipTarget(v.currentTime, 10, dur(v)); }
    });
    update();
    return bar;
  }

  // Our bar sits right under the video. The app re-draws its HTML and vkeep.js moves the real video back into the new page,
  // which leaves our bar behind: put the SAME bar back (never a second one).
  function place(v, bar) {
    if (v.nextSibling !== bar) v.parentNode.insertBefore(bar, v.nextSibling);   // always first under the video; other bars go below it
  }
  function decorate(v) {
    if (!v || v.tagName !== "VIDEO" || !v.isConnected || !v.parentNode) return;
    if (v.hasAttribute("data-vp-off") || !v.hasAttribute("data-vo")) return;
    var st = states.get(v);
    if (st) { place(v, st.bar); return; }
    try {
      addStyle();
      var bar = build(v);
      place(v, bar);
      states.set(v, { bar: bar });
      v.setAttribute("data-vp", "1");
      v.controls = false;            // only now: if anything above failed, the browser's controls stay
    } catch (e) { /* keep the normal controls */ }
  }
  function scan(node) {
    if (!node || node.nodeType !== 1) return;
    // another script (voiceover bar, loudness row) was just put between a video and our bar: move our bar back up
    if (node.className && /\b(vo-bar|vb-row)\b/.test(String(node.className))) {
      var pv = node.previousElementSibling, ps = pv && states.get(pv);
      if (ps && node.parentNode) { place(pv, ps.bar); }
      return;
    }
    if (node.tagName === "VIDEO") decorate(node);
    else if (node.querySelectorAll) { var l = node.querySelectorAll("video[data-vo]"); for (var i = 0; i < l.length; i++) decorate(l[i]); }
  }

  if (g.MutationObserver) {
    new g.MutationObserver(function (list) {
      for (var i = 0; i < list.length; i++) for (var j = 0; j < list[i].addedNodes.length; j++) scan(list[i].addedNodes[j]);
    }).observe(doc.documentElement, { childList: true, subtree: true });
  }
  scan(doc.documentElement);
})(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this));
