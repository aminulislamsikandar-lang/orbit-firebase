/* vsave.js - "Save in Orbit": a download arrow in the control bar of the recorded lesson videos (<video data-vo="...">).
 *
 * The student taps the arrow: the video is fetched from the private Backblaze bucket (with a FRESH short-lived link from the server, so the
 * normal login / subscription check still runs) and kept INSIDE Orbit (the browser's IndexedDB). No mp4 file is created on the phone, so there
 * is nothing to forward on WhatsApp. Next time the student opens that video, Orbit plays the saved copy: it works without internet and it
 * does not use Backblaze bandwidth. Tap the check mark to delete the saved copy.
 *
 * It does NOT replace anything: vplayer.js only asks VSave.bind(video, button) for one extra button, index.html's openVideo() asks
 * VSave.url(id) for a saved copy, and vkeep.js / vboost.js / voiceover.js keep working on the same <video> element (a saved copy is a
 * same-site blob: address, so the loudness boost works on it too). If this file is missing or IndexedDB is blocked, nothing changes.
 *
 * The file is fetched in 8 MB pieces (HTTP Range), each piece is a Blob straight away, so a big video never sits in the phone's memory as
 * one lump. A saved copy is valid for KEEP_DAYS days (the subscription check cannot run offline), after that it is removed and the video
 * streams again.
 * Opt out for one video: add the attribute data-vs-off.
 * Console help: VSave.list() shows the saved videos and their sizes.
 */
(function (g) {
  "use strict";
  var DB_NAME = "orbit-vsave", STORE = "videos", PART = 8 * 1024 * 1024, KEEP_DAYS = 30;

  /* ---------- pure helpers (tested in Node) ---------- */
  // "bytes 0-8388607/52428800" -> 52428800 (0 when unknown)
  function parseTotal(contentRange) {
    var m = /\/(\d+)\s*$/.exec(String(contentRange || ""));
    return m ? Number(m[1]) : 0;
  }
  function rangeHeader(start, part) { return "bytes=" + start + "-" + (start + part - 1); }
  function isFresh(savedAt, now, days) {
    var a = Number(savedAt);
    return isFinite(a) && a > 0 && now - a < days * 86400000;
  }
  function fmtMb(n) { var x = Number(n); return (isFinite(x) ? Math.round(x / 104857.6) / 10 : 0) + " MB"; }
  // Enough room for the whole video plus 15 % spare? (quota 0 = the browser cannot tell: let it try)
  function roomOk(total, quota, usage) {
    if (!quota || !total) return true;
    return quota - (usage || 0) > total * 1.15;
  }
  function pctOf(got, total) { return total > 0 ? Math.max(0, Math.min(100, Math.floor((got / total) * 100))) : 0; }
  // Friendly Hinglish text for a failed save (shown for a few seconds on the button).
  function errText(e) {
    var c = e && (e.code || e.name || ""), s = e && e.status;
    if (c === "space" || c === "QuotaExceededError") return "Jagah kam hai";
    if (c === "AbortError") return "";
    if (s === 403 || s === 401) return "Link band, dobara try karo";
    if (e && e.offline) return "Internet nahi hai";
    return "Save nahi hua";
  }

  var api = { parseTotal: parseTotal, rangeHeader: rangeHeader, isFresh: isFresh, fmtMb: fmtMb, roomOk: roomOk, pctOf: pctOf, errText: errText, PART: PART, KEEP_DAYS: KEEP_DAYS };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (!g || !g.document) return;
  g.VSave = api;

  /* ---------- browser part ---------- */
  var doc = g.document, SVG = "http://www.w3.org/2000/svg";
  var state = {};      // id -> { s: "idle" | "busy" | "saved", pct, msg, size, ctl }
  var urls = {};       // id -> blob: address of the saved copy (one per id, so a playing video keeps the same address)
  var subs = {};       // id -> [{ btn, fn }]
  var dbp = null;
  var PATHS = {
    down: "M5 20h14v-2H5v2zM19 9h-4V3H9v6H5l7 7 7-7z",
    ok: "M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z",
    stop: "M6 6h12v12H6z"
  };

  /* ----- IndexedDB (a few lines, no library) ----- */
  function open() {
    if (dbp) return dbp;
    dbp = new Promise(function (res, rej) {
      var r;
      try { r = g.indexedDB.open(DB_NAME, 1); } catch (e) { rej(e); return; }
      r.onupgradeneeded = function () { try { r.result.createObjectStore(STORE, { keyPath: "id" }); } catch (e) { /* already there */ } };
      r.onsuccess = function () { res(r.result); };
      r.onerror = function () { rej(r.error || new Error("idb")); };
      r.onblocked = function () { rej(new Error("idb blocked")); };
    });
    dbp.catch(function () { dbp = null; });
    return dbp;
  }
  function getRec(id) {
    return open().then(function (db) {
      return new Promise(function (res, rej) {
        var r = db.transaction(STORE, "readonly").objectStore(STORE).get(id);
        r.onsuccess = function () { res(r.result || null); };
        r.onerror = function () { rej(r.error); };
      });
    });
  }
  function putRec(rec) {
    return open().then(function (db) {
      return new Promise(function (res, rej) {
        var t = db.transaction(STORE, "readwrite");
        t.objectStore(STORE).put(rec);
        t.oncomplete = function () { res(); };
        t.onerror = t.onabort = function () { rej(t.error || new Error("idb write")); };
      });
    });
  }
  function delRec(id) {
    return open().then(function (db) {
      return new Promise(function (res, rej) {
        var t = db.transaction(STORE, "readwrite");
        t.objectStore(STORE).delete(id);
        t.oncomplete = function () { res(); };
        t.onerror = t.onabort = function () { rej(t.error || new Error("idb delete")); };
      });
    });
  }
  function allRecs() {
    return open().then(function (db) {
      return new Promise(function (res, rej) {
        var r = db.transaction(STORE, "readonly").objectStore(STORE).getAll();
        r.onsuccess = function () { res(r.result || []); };
        r.onerror = function () { rej(r.error); };
      });
    });
  }

  /* ----- state + buttons ----- */
  function notify(id) {
    var list = subs[id] || [];
    // A bar can be out of the page for a moment while the app re-draws, so a button is only forgotten when many have piled up.
    if (list.length > 8) subs[id] = list = list.filter(function (x) { return x.btn.isConnected !== false; });
    list.forEach(function (x) { try { x.fn(); } catch (e) { /* ignore */ } });
  }
  function set(id, s) { state[id] = s; notify(id); }
  function icon(name) {
    var s = doc.createElementNS(SVG, "svg"), p = doc.createElementNS(SVG, "path");
    s.setAttribute("viewBox", "0 0 24 24"); s.setAttribute("aria-hidden", "true");
    p.setAttribute("d", PATHS[name]); s.appendChild(p);
    return s;
  }
  function render(btn, id) {
    var st = state[id] || { s: "idle" }, label, text = "", ic = "down";
    if (st.s === "busy") { ic = "stop"; text = st.pct + "%"; label = "Save ruko (cancel)"; }
    else if (st.s === "saved") { ic = "ok"; text = "Saved"; label = "Saved video hatao" + (st.size ? " (" + fmtMb(st.size) + ")" : ""); }
    else if (st.msg) { text = st.msg; label = st.msg; }
    else { label = "Video Orbit mein save karo (bina internet ke chalegi)"; }
    while (btn.firstChild) btn.removeChild(btn.firstChild);
    btn.appendChild(icon(ic));
    if (text) { var sp = doc.createElement("span"); sp.textContent = text; btn.appendChild(sp); }
    btn.setAttribute("aria-label", label); btn.title = label;
    btn.setAttribute("data-vs", st.s);
  }

  /* ----- saved copy lookup ----- */
  // Is there a fresh saved copy? (an old one is removed here)
  function has(id) {
    return getRec(id).then(function (rec) {
      if (!rec || !rec.blob) return false;
      if (!isFresh(rec.savedAt, Date.now(), KEEP_DAYS)) { return remove(id, true).then(function () { return false; }); }
      var cur = state[id];
      if (!cur || cur.s !== "busy") set(id, { s: "saved", size: rec.size || (rec.blob && rec.blob.size) || 0 });
      return true;
    }).catch(function () { return false; });
  }
  // The blob: address of the saved copy, or null. One address per video id while the page lives.
  function url(id) {
    return has(id).then(function (ok) {
      if (!ok) return null;
      if (urls[id]) return urls[id];
      return getRec(id).then(function (rec) {
        if (!rec || !rec.blob) return null;
        try { urls[id] = g.URL.createObjectURL(rec.blob); } catch (e) { return null; }
        return urls[id];
      });
    }).catch(function () { return null; });
  }
  function remove(id, quiet) {
    return delRec(id).catch(function () { /* ignore */ }).then(function () {
      if (urls[id]) { try { g.URL.revokeObjectURL(urls[id]); } catch (e) { /* ignore */ } delete urls[id]; }
      var cur = state[id];
      if (!cur || cur.s !== "busy") set(id, { s: "idle" });
    });
  }

  /* ----- download ----- */
  function freshLink(id) {
    if (!g.orbitVideoUrl) return Promise.reject(new Error("no link helper"));
    return g.orbitVideoUrl(id).then(function (u) { if (!u) throw new Error("no link"); return u; });
  }
  function httpError(status) { var e = new Error("http " + status); e.status = status; return e; }
  function checkRoom(total) {
    var sm = g.navigator && g.navigator.storage;
    if (!sm || !sm.estimate) return Promise.resolve();
    return sm.estimate().then(function (est) {
      if (!roomOk(total, est && est.quota, est && est.usage)) { var e = new Error("space"); e.code = "space"; throw e; }
    }, function () { /* cannot tell: let it try */ });
  }
  // Fetch the whole file in PART-sized pieces. Each piece becomes a Blob at once.
  function download(link, ctl, onPct) {
    var parts = [], got = 0, total = 0, signal = ctl ? ctl.signal : undefined;
    function next() {
      return g.fetch(link, { headers: { Range: rangeHeader(got, PART) }, signal: signal, mode: "cors", credentials: "omit", cache: "no-store" }).then(function (r) {
        if (r.status === 416 && got > 0) { total = got; return null; }             // asked past the end: the last piece was exact
        if (r.status === 200) {                                                      // the server ignored Range: this is the whole file
          return r.blob().then(function (b) { parts = [b]; got = b.size; total = got; onPct(100); return null; });
        }
        if (r.status !== 206) throw httpError(r.status);
        var t = parseTotal(r.headers.get("content-range"));
        var first = !total;
        if (t) total = t;
        var pre = first && t ? checkRoom(t) : Promise.resolve();
        return pre.then(function () { return r.blob(); }).then(function (b) {
          if (!b.size) return null;
          parts.push(b); got += b.size;
          if (total) onPct(pctOf(got, total));
          if (b.size < PART || (total && got >= total)) { total = total || got; return null; }
          return "more";
        });
      }).then(function (more) { return more ? next() : null; });
    }
    return next().then(function () {
      if (!got) throw httpError(0);
      return new Blob(parts, { type: "video/mp4" });
    });
  }

  function save(id) {
    var cur = state[id];
    if (cur && cur.s === "busy") return Promise.resolve();
    if (g.navigator && g.navigator.onLine === false) { flash(id, { offline: true }); return Promise.resolve(); }
    var ctl = g.AbortController ? new g.AbortController() : null;
    set(id, { s: "busy", pct: 0, ctl: ctl });
    try { if (g.navigator.storage && g.navigator.storage.persist) g.navigator.storage.persist().catch(function () { /* ignore */ }); } catch (e) { /* ignore */ }
    return freshLink(id).then(function (link) {
      return download(link, ctl, function (p) { var c = state[id]; if (c && c.s === "busy") { c.pct = p; notify(id); } });
    }).then(function (blob) {
      return putRec({ id: id, blob: blob, size: blob.size, savedAt: Date.now() }).then(function () { set(id, { s: "saved", size: blob.size }); });
    }).catch(function (e) {
      // a half-written record never exists: the record is written only after the whole file arrived
      flash(id, e);
    });
  }
  // Back to the arrow; a short reason is shown on the button for 4 seconds.
  function flash(id, e) {
    var msg = errText(e);
    set(id, { s: "idle", msg: msg });
    if (msg) setTimeout(function () { var c = state[id]; if (c && c.s === "idle" && c.msg === msg) set(id, { s: "idle" }); }, 4000);
  }

  /* ----- the button in the player bar ----- */
  function bind(v, btn) {
    var id = v && v.getAttribute && v.getAttribute("data-vo");
    if (!id || v.hasAttribute("data-vs-off") || !g.indexedDB || !g.fetch) return false;
    var ent = { btn: btn, fn: function () { render(btn, id); } };
    (subs[id] = subs[id] || []).push(ent);
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      var st = state[id] || { s: "idle" };
      if (st.s === "busy") { if (st.ctl) { try { st.ctl.abort(); } catch (x) { /* ignore */ } } return; }
      if (st.s === "saved") {
        if (g.confirm && !g.confirm("Saved video hata dein? Phir se dekhne ke liye internet chahiye hoga.")) return;
        remove(id); return;
      }
      save(id);
    });
    render(btn, id);
    has(id).then(function () { render(btn, id); });
    return true;
  }
  function list() {
    return allRecs().then(function (a) { return a.map(function (r) { return { id: r.id, size: fmtMb(r.size), savedAt: new Date(r.savedAt).toISOString() }; }); });
  }

  api.bind = bind; api.has = has; api.url = url; api.remove = remove; api.save = save; api.list = list; api.state = function () { return state; };
})(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this));
