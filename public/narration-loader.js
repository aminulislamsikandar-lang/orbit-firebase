/* narration-loader.js - student side of AI narration.
 *
 * NarrationLoader.open(plan, lessonId) replaces MathVideoPlayer.open(plan) wherever a lesson code is known.
 *  1. Reads Firestore narration/<lessonId> (one small document; no document = nothing else happens, the old player opens at once).
 *  2. Asks the server for short-lived signed links (the server checks login + subscription again) - selected language first, then the rest.
 *  3. Opens the player. The player reads the narration object LIVE, so a slow server (Render waking up) never delays the lesson:
 *     steps whose audio is not ready yet simply use the browser voice, later steps pick up the MP3 as soon as the link arrives.
 *  4. An expired link is replaced once by refreshUrl; a refused / failed link falls back to the browser voice (the player shows a message).
 * No audio is ever generated here and no permanent audio URL exists.
 */
(function (g) {
  "use strict";
  var WAIT_MS = 1500;                       // how long to wait for the first links before opening anyway
  var STATE = { lastError: "" };

  function api(path, body) {
    return Promise.resolve(g.CLOUD && g.CLOUD.token ? g.CLOUD.token() : null).then(function (tok) {
      if (!tok) throw new Error("login");
      var init = { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + tok }, body: JSON.stringify(body) };
      if (typeof AbortSignal !== "undefined" && AbortSignal.timeout) init.signal = AbortSignal.timeout(70000);
      return fetch((g.ORBIT_API || "") + path, init);
    }).then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) throw new Error(j.error || ("HTTP " + r.status)); return j; }); });
  }
  function refreshFor(lessonId) {
    return function (seg) { return api("/api/narration/url", { lessonId: lessonId, keys: [seg.key] }).then(function (r) { return r.urls[seg.key]; }); };
  }

  // doc -> { lang:{ x:{ segments:[{index,key,url:null,duration,events}] } }, steps }  (only tracks that are fully ready)
  function shape(doc) {
    var nar = { lang: {}, steps: Array.isArray(doc.steps) ? doc.steps : [] }, tracks = doc.tracks || {};
    Object.keys(tracks).forEach(function (l) {
      var t = tracks[l]; if (!t || t.status !== "ready") return;
      var segs = (t.segments || []).filter(function (s) { return s && s.status === "ready" && typeof s.audioKey === "string"; });
      if (segs.length) nar.lang[l] = { voiceName: t.voiceName, segments: segs.map(function (s) { return { index: s.index, key: s.audioKey, url: null, duration: s.duration, events: s.events || [] }; }) };
    });
    return nar;
  }
  // Sign each language (selected one first). Each finished language becomes playable immediately.
  function signAll(lessonId, nar) {
    var want = ""; try { want = localStorage.getItem("mvLang") || ""; } catch (e) {}
    var langs = Object.keys(nar.lang).sort(function (a, b) { return (a === want ? -1 : 0) - (b === want ? -1 : 0); });
    var first = null;
    var chain = langs.reduce(function (p, l) {
      var run = function () {
        var segs = nar.lang[l].segments;
        return api("/api/narration/url", { lessonId: lessonId, keys: segs.map(function (s) { return s.key; }).slice(0, 30) }).then(function (r) {
          segs.forEach(function (s) { if (r.urls && r.urls[s.key]) s.url = r.urls[s.key]; });
        }).catch(function (e) { STATE.lastError = String(e && e.message || e); try { console.warn("narration:", STATE.lastError); } catch (x) {} });
      };
      var q = p.then(run); if (!first) first = q; return q;
    }, Promise.resolve());
    return { firstDone: first || Promise.resolve(), all: chain };
  }

  function plain(plan) { if (g.MathVideoPlayer) g.MathVideoPlayer.open(plan); }

  function open(plan, lessonId) {
    if (!g.MathVideoPlayer) return;
    if (!lessonId || !g.CLOUD || !g.CLOUD.narration || !/^[A-Za-z0-9][A-Za-z0-9._:-]{2,119}$/.test(String(lessonId))) return plain(plan);
    var opened = false;
    function go(nar) {
      if (opened) return; opened = true;
      g.MathVideoPlayer.open(plan, nar ? { narration: nar, refreshUrl: refreshFor(lessonId) } : undefined);
    }
    Promise.resolve().then(function () { return g.CLOUD.narration.get(String(lessonId)); }).then(function (doc) {
      var nar = doc ? shape(doc) : null;
      if (!nar || !Object.keys(nar.lang).length) return go(null);       // no narration for this lesson: exactly the old behaviour
      var s = signAll(String(lessonId), nar);
      return Promise.race([s.firstDone, new Promise(function (r) { setTimeout(r, WAIT_MS); })]).then(function () { go(nar); });
    }).catch(function (e) { STATE.lastError = String(e && e.message || e); go(null); });   // Firestore / network problem: the lesson still opens
  }

  var api2 = { open: open, _shape: shape, state: STATE };
  if (typeof module !== "undefined" && module.exports) module.exports = api2; else g.NarrationLoader = api2;
})(typeof window !== "undefined" ? window : globalThis);
