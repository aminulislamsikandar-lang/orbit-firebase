/* qvideo.js - Admin mode + "Add video" for a single question.
 *
 * 1) Admin mode is switched on from the hidden Team admin panel (team.js) and works only for the admin Google account(s) below.
 * 2) In admin mode the question's 3-dot menu shows "Add video". The admin picks a local .mp4; it goes straight from the browser
 *    to the private Backblaze bucket (the server only signs the link: POST /api/video/upload-url, needs VIDEO_UPLOAD=true on Render),
 *    then a record {id, course, chapter, title, key, free, qid} is saved in Firestore collection `videos`.
 * 3) Every student then sees a "Video" button under that question (index.html: qvHTML). Playback uses the same short-lived link as
 *    the chapter videos (POST /api/video).
 *
 * The real locks are firestore.rules (only the admin account can write `videos`) and server.js (isAdminReq).
 * The email list below only decides who sees the buttons. All text is rendered with textContent, never innerHTML.
 */
(function (g) {
  "use strict";
  var ADMINS = ["aminulislamsikandar@gmail.com"];   // keep the same as firestore.rules / MV_ADMIN_EMAILS
  var KEY = "orbit_admin_mode_v1";
  var mode = false;
  try { mode = localStorage.getItem(KEY) === "1"; } catch (e) {}
  var xhr = null;

  function user() { return g.orbitUser ? g.orbitUser() : null; }
  function isAdmin() { var u = user(); return !!(u && u.email && ADMINS.indexOf(String(u.email).toLowerCase()) >= 0); }
  function active() { return mode && isAdmin(); }

  function h(tag, props, kids) {
    var e = document.createElement(tag);
    for (var k in (props || {})) { if (k === "text") e.textContent = props[k]; else if (k === "style") e.style.cssText = props[k]; else e[k] = props[k]; }
    (kids || []).forEach(function (c) { if (c) e.appendChild(c); });
    return e;
  }

  var css = document.createElement("style");
  css.textContent =
    ".qv-badge{position:fixed;left:12px;bottom:calc(12px + env(safe-area-inset-bottom,0px));z-index:900;display:flex;align-items:center;gap:8px;background:#b3261e;color:#fff;border-radius:999px;padding:6px 6px 6px 14px;font:600 13px system-ui,sans-serif;box-shadow:0 4px 14px rgba(0,0,0,.3)}" +
    ".qv-badge button{border:0;border-radius:999px;background:#fff;color:#b3261e;font:700 12px system-ui,sans-serif;padding:6px 12px;cursor:pointer}" +
    ".qv-ov{position:fixed;inset:0;z-index:1100;background:rgba(0,0,0,.55);display:flex;align-items:flex-end;justify-content:center}" +
    "@media(min-width:600px){.qv-ov{align-items:center}}" +
    ".qv-box{width:min(100%,520px);max-height:92vh;overflow:auto;box-sizing:border-box;background:var(--card,#fff);color:var(--tx,#111);border-radius:18px 18px 0 0;padding:18px 16px calc(18px + env(safe-area-inset-bottom,0px))}" +
    "@media(min-width:600px){.qv-box{border-radius:18px}}" +
    ".qv-box h3{margin:0 0 4px;font:700 20px Baloo 2,Hind,system-ui,sans-serif}" +
    ".qv-q{color:var(--mut,#666);font-size:14px;margin:0 0 10px;overflow-wrap:anywhere}" +
    ".qv-box label{display:block;margin:12px 0 4px;font-size:14px;color:var(--mut,#666)}" +
    ".qv-box input[type=text],.qv-box input[type=file]{width:100%;box-sizing:border-box;padding:10px;border:1px solid var(--ln,#ccc);border-radius:10px;background:var(--bg,#fff);color:var(--tx,#111);font:inherit}" +
    ".qv-chk{display:flex;align-items:center;gap:8px;margin-top:12px;font-size:14px}" +
    ".qv-bar{height:8px;border-radius:4px;background:var(--ans,#eee);overflow:hidden;margin-top:14px;display:none}" +
    ".qv-bar i{display:block;height:100%;width:0;background:#2e7d32;transition:width .2s}" +
    ".qv-msg{margin-top:10px;font-size:14px;min-height:1.2em}.qv-msg.err{color:#d9534f}" +
    ".qv-acts{display:flex;gap:10px;margin-top:16px}" +
    ".qv-acts .btn{margin:0}" +
    ".qv-sec{background:none;border:1px solid var(--ln,#ccc);color:var(--tx,#111);border-radius:12px;padding:10px 16px;font:inherit;font-weight:600;cursor:pointer}";
  document.head.appendChild(css);

  /* ---------- admin mode ---------- */
  function badge() {
    var old = document.getElementById("qv-badge");
    if (!active()) { if (old) old.remove(); return; }
    if (old) return;
    var b = h("div", { id: "qv-badge", className: "qv-badge", role: "status" }, [
      h("span", { text: "Admin mode ON" }),
      h("button", { type: "button", text: "Exit", onclick: function () { setMode(false); } })
    ]);
    document.body.appendChild(b);
  }
  function setMode(on) {
    mode = !!on && isAdmin();
    try { localStorage.setItem(KEY, mode ? "1" : "0"); } catch (e) {}
    badge();
    if (g.orbitRedraw) g.orbitRedraw();
    return mode;
  }

  /* ---------- upload ---------- */
  function newId(qid) {
    var base = String(qid).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50) || "q";
    return "qv-" + base + "-" + Math.random().toString(16).slice(2, 6);
  }
  function signUpload(file) {
    var tokenP = g.CLOUD && g.CLOUD.token ? g.CLOUD.token() : Promise.resolve(null);
    return tokenP.then(function (tok) {
      if (!tok) throw new Error("Pehle admin Google account se log in karo.");
      // Render's free server can be asleep: allow up to 90 seconds for the first answer.
      return fetch((g.ORBIT_API || "") + "/api/video/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + tok },
        body: JSON.stringify({ filename: file.name, size: file.size, contentType: "video/mp4" }),
        signal: AbortSignal.timeout(90000)
      });
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok) throw new Error(j.error || ("Server error " + r.status));
        if (!j.url || !j.key) throw new Error("Server ne upload link nahi diya.");
        return j;
      });
    });
  }
  function putFile(url, file, onProgress) {
    return new Promise(function (res, rej) {
      var x = new XMLHttpRequest();
      xhr = x;
      x.open("PUT", url, true);
      x.setRequestHeader("Content-Type", "video/mp4");
      x.upload.onprogress = function (e) { if (e.lengthComputable) onProgress(Math.round(e.loaded * 100 / e.total)); };
      x.onload = function () { xhr = null; (x.status >= 200 && x.status < 300) ? res() : rej(new Error("Upload fail (" + x.status + "). Backblaze bucket ka CORS rule aur key check karo.")); };
      x.onerror = function () { xhr = null; rej(new Error("Upload nahi ho paya. Internet check karo; Backblaze bucket me CORS rule bhi hona chahiye.")); };
      x.onabort = function () { xhr = null; rej(new Error("Upload cancel ho gaya.")); };
      x.send(file);
    });
  }

  function close() {
    if (xhr) { try { xhr.abort(); } catch (e) {} xhr = null; }
    var o = document.getElementById("qv-ov"); if (o) o.remove();
    document.removeEventListener("keydown", onKey);
  }
  function onKey(e) { if (e.key === "Escape") close(); }

  function open(qid) {
    if (!active()) return;
    var info = g.orbitQ ? g.orbitQ(qid) : null;
    if (!info) return;
    close();

    var file = h("input", { type: "file", id: "qv-file", accept: "video/mp4,.mp4" });
    var title = h("input", { type: "text", id: "qv-title", maxLength: 120, value: info.label + " video" });
    var free = h("input", { type: "checkbox", id: "qv-free", checked: true });
    var fill = h("i");
    var bar = h("div", { className: "qv-bar" }, [fill]);
    var msg = h("div", { className: "qv-msg", role: "status" });
    var go = h("button", { type: "button", className: "btn", text: "Upload" });
    var cancel = h("button", { type: "button", className: "qv-sec", text: "Cancel", onclick: close });

    function say(t, err) { msg.textContent = t || ""; msg.className = "qv-msg" + (err ? " err" : ""); }
    function lock(on) { go.disabled = on; file.disabled = on; title.disabled = on; free.disabled = on; }

    go.onclick = function () {
      var f = file.files && file.files[0];
      var t = title.value.trim();
      if (!f) return say("Pehle apni .mp4 video file chuno.", true);
      if (!/\.mp4$/i.test(f.name)) return say("Sirf .mp4 (H.264) file chalti hai.", true);
      if (!f.size) return say("File khaali hai.", true);
      if (!t) return say("Video ka title likho.", true);
      if (!Number.isInteger(info.chapter) || info.chapter < 1 || info.chapter > 99) return say("Is chapter ka number video ke liye sahi nahi hai.", true);
      lock(true); bar.style.display = "block"; fill.style.width = "0";
      say("Server se upload link le raha hoon...");
      signUpload(f).then(function (s) {
        say("Upload ho raha hai... 0%");
        return putFile(s.url, f, function (p) { fill.style.width = p + "%"; say("Upload ho raha hai... " + p + "%"); }).then(function () { return s.key; });
      }).then(function (key) {
        say("Save ho raha hai...");
        var rec = { id: newId(info.id), course: info.courseId, chapter: info.chapter, title: t, key: key, free: !!free.checked, qid: info.id };
        if (!g.CLOUD || !g.CLOUD.videos) throw new Error("Cloud load nahi hua. Page refresh karke dobara try karo.");
        return g.CLOUD.videos.set(rec).then(function () { return rec; });
      }).then(function (rec) {
        if (g.qvAdded) g.qvAdded(rec);
        close();
      }).catch(function (e) {
        lock(false); bar.style.display = "none";
        var m = (e && e.name === "TimeoutError") ? "Server ne jawab nahi diya. Thodi der baad dobara try karo." : (e && e.message) || "Kuch gadbad ho gayi.";
        if (/permission|insufficient/i.test(m)) m = "Firestore ne save nahi karne diya. firestore.rules deploy kiye? Admin account se log in ho?";
        say(m, true);
      });
    };

    var ov = h("div", { id: "qv-ov", className: "qv-ov", role: "dialog" }, [
      h("div", { className: "qv-box" }, [
        h("h3", { text: "Add video" }),
        h("p", { className: "qv-q", text: info.label + (info.text ? " " + info.text : "") + (info.count ? "  (is question par " + info.count + " video pehle se hai)" : "") }),
        h("label", { text: "Video file (.mp4)", htmlFor: "qv-file" }), file,
        h("label", { text: "Title (students ko button par dikhega)", htmlFor: "qv-title" }), title,
        h("label", { className: "qv-chk", htmlFor: "qv-free" }, [free, h("span", { text: "Sabke liye free" })]),
        bar, msg,
        h("div", { className: "qv-acts" }, [go, cancel])
      ])
    ]);
    ov.addEventListener("click", function (e) { if (e.target === ov && !xhr) close(); });
    document.body.appendChild(ov);
    document.addEventListener("keydown", onKey);
  }

  /* ---------- delete (record only; the file stays in Backblaze) ---------- */
  function remove(id) {
    if (!active() || !id) return;
    if (!g.confirm("Ye video question se hata dein?\n(Backblaze me file bachi rahegi, sirf app se hategi.)")) return;
    if (!g.CLOUD || !g.CLOUD.videos) { g.alert("Cloud load nahi hua. Page refresh karo."); return; }
    g.CLOUD.videos.del(id).then(function () { if (g.qvRemoved) g.qvRemoved(id); })
      .catch(function (e) { g.alert("Video nahi hati: " + ((e && e.message) || "error")); });
  }

  g.QVideo = { active: active, isAdmin: isAdmin, setMode: setMode, badge: badge, open: open, remove: remove };
  document.addEventListener("DOMContentLoaded", badge);
})(window);
