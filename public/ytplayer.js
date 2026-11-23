/* ytplayer.js - optional in-app YouTube player for a question's video icon.
 *
 * The admin (Admin mode, same switch as qvideo.js) attaches a YouTube link to a question from the question's 3-dot menu > "YouTube link".
 * It is saved in Firestore `ytLinks/<questionId>` = { yt: "<11 character video id>", at }. Questions without a link keep the old behaviour
 * (the video icon opens a YouTube search in a new tab). With a link, the icon opens a full-screen player inside the app
 * (youtube-nocookie.com embed, already allowed by the CSP frame-src), and Back returns to the question.
 *
 * The real lock is firestore.rules (only the admin account writes `ytLinks`). Everything is rendered with textContent, never innerHTML.
 */
(function (g) {
  "use strict";
  var ID_RE = /^[A-Za-z0-9_-]{11}$/;
  var map = {};

  // Accepts a full YouTube link (watch, youtu.be, embed, shorts, live, mobile, music) or a bare 11 character id. Returns "" when it is not one.
  function parse(input) {
    var s = String(input == null ? "" : input).trim();
    if (!s) return "";
    if (ID_RE.test(s)) return s;
    if (!/^[a-z]+:\/\//i.test(s)) s = "https://" + s;
    var u;
    try { u = new URL(s); } catch (e) { return ""; }
    var host = u.hostname.toLowerCase().replace(/^www\./, "").replace(/^m\./, "").replace(/^music\./, "");
    var id = "";
    if (host === "youtu.be") id = u.pathname.split("/")[1] || "";
    else if (host === "youtube.com" || host === "youtube-nocookie.com") {
      var p = u.pathname.split("/").filter(Boolean);
      if (p[0] === "watch") id = u.searchParams.get("v") || "";
      else if (/^(embed|shorts|live|v)$/.test(p[0] || "")) id = p[1] || "";
    }
    return ID_RE.test(id) ? id : "";
  }

  function embedUrl(id) { return "https://www.youtube-nocookie.com/embed/" + id + "?rel=0&modestbranding=1&playsinline=1"; }
  function has(qid) { return !!map[qid]; }
  function admin() { return !!(g.QVideo && g.QVideo.active && g.QVideo.active()); }
  function redraw() { if (g.orbitRedraw) g.orbitRedraw(); }

  function h(tag, props, kids) {
    var e = document.createElement(tag);
    for (var k in (props || {})) { if (k === "text") e.textContent = props[k]; else if (k === "style") e.style.cssText = props[k]; else e[k] = props[k]; }
    (kids || []).forEach(function (c) { if (c) e.appendChild(c); });
    return e;
  }

  var player = null;
  function close() {
    if (!player) return;
    document.removeEventListener("keydown", onKey);
    player.remove(); player = null;
  }
  function onKey(e) { if (e.key === "Escape") close(); }

  function open(qid) {
    var id = map[qid];
    if (!id) return false;
    close();
    var back = h("button", { type: "button", text: "\u2190 Back", style: "border:0;background:none;color:var(--tx,#111);font:600 16px system-ui,sans-serif;padding:12px 14px;cursor:pointer" });
    back.setAttribute("aria-label", "Wapas question par jao");
    back.onclick = close;
    var yt = h("a", { text: "YouTube par kholo", href: "https://www.youtube.com/watch?v=" + id, target: "_blank", rel: "noopener noreferrer", style: "margin-left:auto;padding:12px 14px;color:var(--mut,#666);font:14px system-ui,sans-serif" });
    var frame = h("iframe", { src: embedUrl(id), title: "Video lecture", allowFullscreen: true, referrerPolicy: "strict-origin-when-cross-origin", style: "width:100%;aspect-ratio:16/9;border:0;background:#000;display:block" });
    frame.setAttribute("allow", "accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen");
    var note = h("p", { text: "Video nahi chal raha? Upar \"YouTube par kholo\" dabao.", style: "color:var(--mut,#666);font:13px system-ui,sans-serif;padding:10px 14px;margin:0" });
    player = h("div", { style: "position:fixed;inset:0;z-index:3000;background:var(--bg,#f4f2ec);display:flex;flex-direction:column;padding-top:env(safe-area-inset-top,0px)" }, [
      h("div", { style: "display:flex;align-items:center" }, [back, yt]), frame, note
    ]);
    player.setAttribute("role", "dialog"); player.setAttribute("aria-label", "Video lecture");
    document.body.appendChild(player);
    document.addEventListener("keydown", onKey);
    return true;
  }

  // Admin: a small dialog with one input. Empty + Save, or Remove, deletes the link.
  function edit(qid) {
    if (!admin() || !g.CLOUD || !g.CLOUD.ytLinks) return;
    var input = h("input", { type: "url", placeholder: "YouTube link yahan paste karo", value: map[qid] ? "https://www.youtube.com/watch?v=" + map[qid] : "", style: "width:100%;box-sizing:border-box;font-size:16px;padding:10px;border:1px solid var(--ln,#ccc);border-radius:10px;background:var(--card,#fff);color:var(--tx,#111)" });
    var err = h("p", { style: "color:#b3261e;font-size:13px;min-height:18px;margin:8px 0 0" });
    var busy = false;
    function done() { ov.remove(); }
    function run(fn) {
      if (busy) return; busy = true; err.textContent = "";
      fn().then(function () { done(); redraw(); }).catch(function (e) {
        busy = false; err.textContent = e && e.code === "permission-denied" ? "Sirf admin account ye link save kar sakta hai." : (e && e.message) || "Save nahi hua. Dobara try karo.";
      });
    }
    var save = h("button", { type: "button", text: "Save", className: "btn" });
    save.onclick = function () {
      var raw = input.value.trim();
      if (!raw) { if (!map[qid]) { done(); return; } run(function () { return g.CLOUD.ytLinks.del(qid).then(function () { delete map[qid]; }); }); return; }
      var id = parse(raw);
      if (!id) { err.textContent = "Ye YouTube ka sahi link nahi lag raha."; return; }
      run(function () { return g.CLOUD.ytLinks.set(qid, id).then(function () { map[qid] = id; }); });
    };
    var cancel = h("button", { type: "button", text: "Cancel", className: "btn", style: "background:transparent;color:var(--tx,#111);border:1px solid var(--ln,#ccc);margin-left:8px" });
    cancel.onclick = done;
    var rm = map[qid] ? h("button", { type: "button", text: "Link hatao", style: "border:0;background:none;color:#b3261e;font-size:14px;text-decoration:underline;margin-left:auto;cursor:pointer" }) : null;
    if (rm) rm.onclick = function () { run(function () { return g.CLOUD.ytLinks.del(qid).then(function () { delete map[qid]; }); }); };
    var box = h("div", { style: "background:var(--card,#fff);color:var(--tx,#111);width:100%;max-width:480px;border-radius:18px 18px 0 0;padding:18px;padding-bottom:calc(18px + env(safe-area-inset-bottom,0px))" }, [
      h("h3", { text: "YouTube link", style: "margin:0 0 4px;font-size:18px" }),
      h("p", { text: "Is question ke video icon par ye video app ke andar khulega.", style: "margin:0 0 10px;font-size:13px;color:var(--mut,#666)" }),
      input, err,
      h("div", { style: "display:flex;align-items:center;margin-top:6px" }, [save, cancel, rm])
    ]);
    var ov = h("div", { style: "position:fixed;inset:0;z-index:3100;background:rgba(0,0,0,.5);display:flex;align-items:flex-end;justify-content:center" }, [box]);
    ov.onclick = function (e) { if (e.target === ov) done(); };
    document.body.appendChild(ov);
    input.focus();
  }

  // Called by cloud.js after login with { questionId: videoId }. Also picks up a list that arrived before this file loaded.
  g.onCloudYt = function (m) { map = m && typeof m === "object" ? m : {}; redraw(); };
  if (g.__ytLinks) { map = g.__ytLinks; }

  g.YTP = { parse: parse, embedUrl: embedUrl, has: has, open: open, edit: edit, close: close };
  if (typeof module !== "undefined" && module.exports) module.exports = g.YTP;
})(typeof window !== "undefined" ? window : globalThis);
