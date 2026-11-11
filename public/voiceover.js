/* voiceover.js - student side of AI voiceover for recorded MP4 lessons.
 *
 * The VIDEO is the master clock; the voiceover is a separate private audio track (made by the admin, stored in B2, listed in Firestore
 * narration/<video id>). Each segment has an `offset` (seconds into the video where it starts). Nothing is generated here.
 *
 * Any <video data-vo="<video id>"> on the page is picked up through document-level events (the app re-draws its HTML, so elements are
 * replaced often; state is kept per element and audio stops by itself when its video leaves the page).
 *   - No voiceover / not allowed / any failure  ->  nothing changes: the original video and its own sound play exactly as before.
 *   - Voiceover available: a small bar appears under the video (Voiceover on/off, language). While it is ON the video is muted, so the
 *     two sounds never overlap; unmuting the video yourself switches the voiceover off.
 *   - play / pause / seek / speed change / buffering of the video are followed by the audio; drift over 0.35 s is corrected.
 * Voiceover.attach(video, id, { info }) is used by the admin preview with already-signed data.
 */
(function (g) {
  "use strict";
  var DRIFT = 0.35, TTL = 50 * 60 * 1000, ORDER = ["as", "en", "hi", "bn", "hg"];
  var SILENT = "data:audio/wav;base64,UklGRkQDAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YSADAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgA==";
  var CACHE = {};

  /* ---------- pure helpers (tested in Node) ---------- */
  function segEnd(segs, i) {
    var s = segs[i], e = s.offset + (s.duration > 0 ? s.duration : 1e9), n = segs[i + 1];
    return n ? Math.min(e, n.offset) : e;
  }
  function pick(segs, t) {
    for (var i = 0; i < segs.length; i++) if (t >= segs[i].offset && t < segEnd(segs, i)) return segs[i];
    return null;
  }
  function nextBoundary(segs, t) {
    var best = null;
    segs.forEach(function (s, i) { [s.offset, segEnd(segs, i)].forEach(function (v) { if (isFinite(v) && v > t && (best === null || v < best)) best = v; }); });
    return best;
  }
  // doc -> { lang: [ {index,key,url:null,offset,duration} sorted by offset ] }   (only ready tracks whose segments have an offset)
  function shape(doc) {
    var out = {}, tracks = (doc && doc.tracks) || {};
    Object.keys(tracks).forEach(function (l) {
      var t = tracks[l]; if (!t || t.status !== "ready") return;
      var segs = (t.segments || []).filter(function (s) { return s && s.status === "ready" && typeof s.audioKey === "string" && typeof s.offset === "number" && isFinite(s.offset) && s.offset >= 0; })
        .map(function (s) { return { index: s.index, key: s.audioKey, url: null, offset: s.offset, duration: typeof s.duration === "number" ? s.duration : 0 }; })
        .sort(function (a, b) { return a.offset - b.offset; });
      if (segs.length) out[l] = { voiceName: t.voiceName, segments: segs };
    });
    return out;
  }
  function chooseLang(tracks, pref) {
    var langs = Object.keys(tracks); if (!langs.length) return null;
    if (pref && tracks[pref]) return pref;
    for (var i = 0; i < ORDER.length; i++) if (tracks[ORDER[i]]) return ORDER[i];
    return langs[0];
  }

  /* ---------- server ---------- */
  function api(path, body) {
    return Promise.resolve(g.CLOUD && g.CLOUD.token ? g.CLOUD.token() : null).then(function (tok) {
      if (!tok) throw new Error("login");
      var init = { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + tok }, body: JSON.stringify(body) };
      if (typeof AbortSignal !== "undefined" && AbortSignal.timeout) init.signal = AbortSignal.timeout(70000);
      return fetch((g.ORBIT_API || "") + path, init);
    }).then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) throw new Error(j.error || ("HTTP " + r.status)); return j; }); });
  }
  function signLang(info, lang) {
    if (!info.signed[lang]) {
      var segs = info.tracks[lang].segments;
      info.signed[lang] = api("/api/narration/url", { lessonId: info.id, keys: segs.map(function (s) { return s.key; }).slice(0, 30) }).then(function (r) {
        segs.forEach(function (s) { if (r.urls && r.urls[s.key]) s.url = r.urls[s.key]; });
        if (!segs.every(function (s) { return s.url; })) throw new Error("no url");
      }).catch(function (e) { delete info.signed[lang]; throw e; });
    }
    return info.signed[lang];
  }
  function refreshOne(info, seg) { return api("/api/narration/url", { lessonId: info.id, keys: [seg.key] }).then(function (r) { return r.urls[seg.key]; }); }
  function loadInfo(id) {
    var c = CACHE[id]; if (c && Date.now() - c.t < TTL) return c.p;
    var p = Promise.resolve().then(function () { return g.CLOUD && g.CLOUD.narration ? g.CLOUD.narration.get(id) : null; }).then(function (doc) {
      var tracks = shape(doc); if (!Object.keys(tracks).length) return null;
      return { id: id, tracks: tracks, signed: {} };
    });
    CACHE[id] = { t: Date.now(), p: p };
    p.catch(function () { delete CACHE[id]; });
    return p;
  }

  /* ---------- per-video controller ---------- */
  var ST = typeof WeakMap !== "undefined" ? new WeakMap() : null;
  function state(video, id) {
    var st = ST.get(video);
    if (!st) { st = { video: video, id: id, status: "idle", on: true, lang: null, info: null, audio: null, cur: null, wake: 0, bar: null, hint: null, btn: null, unlocked: false, unlocking: null, buffering: false, retried: {} }; ST.set(video, st); }
    return st;
  }
  var alive = function (st) { return !!(st.video && document.contains(st.video)); };
  function audioOf(st) {
    if (st.audio) return st.audio;
    var a = new Audio(); a.preload = "auto"; st.audio = a;
    a.addEventListener("timeupdate", function () { if (!alive(st)) teardown(st); });
    a.addEventListener("error", function () { onAudioError(st); });
    return a;
  }
  function setHint(st, text) { if (st.hint) st.hint.textContent = text || ""; }
  function paintBtn(st) { if (st.btn) st.btn.textContent = "Voiceover: " + (st.on ? "ON" : "OFF"); }
  function mute(st, on) { try { st.video.muted = !!on; } catch (e) {} }
  function teardown(st) { clearTimeout(st.wake); st.wake = 0; if (st.audio) { try { st.audio.pause(); } catch (e) {} } st.status = "gone"; }
  function turnOff(st, text) { st.on = false; clearTimeout(st.wake); st.wake = 0; if (st.audio) { try { st.audio.pause(); } catch (e) {} } mute(st, false); paintBtn(st); if (text !== undefined) setHint(st, text); }

  function unlock(st) {                 // plays a silent clip inside the user's Play action so the browser lets us start audio later
    if (st.unlocked) return Promise.resolve(true);
    if (st.unlocking) return st.unlocking;
    var a = audioOf(st), pr; a.src = SILENT;
    try { pr = a.play(); } catch (e) { pr = Promise.reject(e); }
    st.unlocking = Promise.resolve(pr).then(function () { st.unlocked = true; st.cur = null; return true; }, function () { setHint(st, "Voiceover ke liye video dobara Play karo."); return false; })
      .then(function (ok) { st.unlocking = null; return ok; });
    return st.unlocking;
  }
  function engage(st) {
    if (st.status !== "ready" || !st.on) return;
    unlock(st).then(function (ok) { if (ok && st.on && alive(st)) { mute(st, true); setHint(st, ""); tick(st); } });
  }
  function tick(st) {
    clearTimeout(st.wake); st.wake = 0;
    if (st.status === "gone") return;
    if (!alive(st)) return teardown(st);
    if (st.status !== "ready" || !st.on || !st.unlocked) return;
    var v = st.video, t = v.currentTime || 0, segs = st.info.tracks[st.lang].segments, a = audioOf(st);
    var seg = pick(segs, t), playing = !v.paused && !v.ended && !st.buffering;
    if (!seg) { if (!a.paused) a.pause(); st.cur = null; }
    else {
      var want = t - seg.offset;
      if (st.cur !== seg) { st.cur = seg; a.src = seg.url; try { a.currentTime = want; } catch (e) {} }
      else if (Math.abs((a.currentTime || 0) - want) > DRIFT) { try { a.currentTime = want; } catch (e) {} }
      a.playbackRate = v.playbackRate || 1;
      if (typeof v.volume === "number") a.volume = v.volume;
      if (playing && a.paused) { var pr; try { pr = a.play(); } catch (e) {} if (pr && pr.catch) pr.catch(function () {}); }
      if (!playing && !a.paused) a.pause();
    }
    if (playing) {
      var nb = nextBoundary(segs, t);
      if (nb !== null) st.wake = setTimeout(function () { tick(st); }, Math.max(0, (nb - t) / (v.playbackRate || 1) * 1000) + 10);
    }
  }
  function onAudioError(st) {
    var a = st.audio, seg = st.cur;
    if (!a || !seg || /^data:/.test(a.getAttribute("src") || "")) return;
    if (!st.retried[seg.key]) {                                  // expired signed link: one fresh link
      st.retried[seg.key] = true;
      refreshOne(st.info, seg).then(function (url) { if (!url) throw new Error("no url"); seg.url = url; st.cur = null; tick(st); }, function () { turnOff(st, "Voiceover nahi chal payi. Original awaaz chal rahi hai."); });
      return;
    }
    turnOff(st, "Voiceover nahi chal payi. Original awaaz chal rahi hai.");
  }
  function buildBar(st) {
    if ((st.bar && st.bar.isConnected) || !st.video.parentNode) return;       // rebuilt if the page re-drew around the video
    var bar = document.createElement("div"); bar.className = "vo-bar";
    bar.style.cssText = "display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:4px 0;font-size:13px";
    var b = document.createElement("button"); b.type = "button"; b.style.cssText = "padding:6px 10px;border-radius:8px;border:0;background:rgba(128,128,128,.22);color:inherit;cursor:pointer;font-size:13px";
    st.btn = b; paintBtn(st);
    b.onclick = function () {
      if (st.on) { turnOff(st, ""); return; }
      st.on = true; paintBtn(st); engage(st);
    };
    bar.appendChild(b);
    var langs = Object.keys(st.info.tracks);
    if (langs.length > 1) {
      var sel = document.createElement("select"); sel.setAttribute("aria-label", "Voiceover language"); sel.style.cssText = "padding:5px;border-radius:8px;font-size:13px";
      langs.forEach(function (l) { var o = document.createElement("option"); o.value = l; o.textContent = l.toUpperCase(); sel.appendChild(o); });
      sel.value = st.lang;
      sel.onchange = function () {
        var l = sel.value; setHint(st, "Voiceover load ho rahi hai...");
        signLang(st.info, l).then(function () { st.lang = l; st.cur = null; setHint(st, ""); if (st.audio) { try { st.audio.pause(); } catch (e) {} } tick(st); }, function () { sel.value = st.lang; setHint(st, "Is language ki voiceover abhi nahi mil rahi."); });
      };
      bar.appendChild(sel);
    }
    st.hint = document.createElement("span"); st.hint.style.cssText = "opacity:.8"; bar.appendChild(st.hint);
    st.video.parentNode.insertBefore(bar, st.video.nextSibling); st.bar = bar;
  }
  function begin(st, info) {
    st.info = info; var pref = ""; try { pref = localStorage.getItem("mvLang") || ""; } catch (e) {}
    st.lang = chooseLang(info.tracks, pref);
    return signLang(info, st.lang).then(function () {
      st.status = "ready"; buildBar(st);
      if (!st.video.paused && !st.video.ended) engage(st);
    });
  }
  function init(st) {
    if (st.status !== "idle") return;
    st.status = "loading";
    loadInfo(st.id).then(function (info) { if (!info) { st.status = "none"; return; } return begin(st, info); })
      .catch(function () { st.status = "none"; });                // no access / offline / any problem: original video untouched
  }

  var EVENTS = ["loadedmetadata", "play", "playing", "pause", "seeking", "seeked", "ratechange", "waiting", "ended", "timeupdate", "volumechange"];
  function onEvent(e) {
    var v = e.target;
    if (!v || v.tagName !== "VIDEO" || !v.getAttribute) return;
    var id = v.getAttribute("data-vo"); if (!id) return;
    var st = state(v, id);
    switch (e.type) {
      case "loadedmetadata": init(st); break;
      case "play": init(st); engage(st); break;
      case "pause": case "ended": clearTimeout(st.wake); st.wake = 0; if (st.audio && st.status === "ready") { try { st.audio.pause(); } catch (x) {} } break;
      case "seeking": if (st.audio && st.status === "ready") { try { st.audio.pause(); } catch (x) {} } break;
      case "waiting": st.buffering = true; tick(st); break;
      case "playing": st.buffering = false; tick(st); break;
      case "volumechange": if (st.status === "ready" && st.on && st.unlocked && !v.muted) { turnOff(st, "Original awaaz on hai, isliye voiceover band."); } break;
      default: tick(st);
    }
  }
  var installed = false;
  function install() {
    if (installed || typeof document === "undefined") return; installed = true;
    EVENTS.forEach(function (n) { document.addEventListener(n, onEvent, true); });   // capture: media events do not bubble
  }

  // Admin preview: attach to a video with data that is already signed. info = { id, tracks:{lang:{segments:[{index,key,url,offset,duration}]}}, signed:{} }
  function attach(video, id, opts) {
    install(); video.setAttribute("data-vo", id);
    var st = state(video, id);
    if (opts && opts.info) { st.status = "loading"; Object.keys(opts.info.tracks).forEach(function (l) { opts.info.signed = opts.info.signed || {}; opts.info.signed[l] = opts.info.signed[l] || Promise.resolve(); }); begin(st, opts.info).catch(function () { st.status = "none"; }); }
    return st;
  }
  function reset() { CACHE = {}; }

  var api2 = { pick: pick, nextBoundary: nextBoundary, shape: shape, chooseLang: chooseLang, attach: attach, install: install, _reset: reset, _state: function (v) { return ST.get(v); } };
  if (typeof module !== "undefined" && module.exports) module.exports = api2; else { g.Voiceover = api2; install(); }
})(typeof window !== "undefined" ? window : globalThis);
