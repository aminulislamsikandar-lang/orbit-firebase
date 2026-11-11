/* video-admin.js
 * Admin panel for recorded video lessons (files live in the private Backblaze bucket).
 *   VideoAdmin.mount(box, store)   store = { list()->[video], set(video), del(id) }  (window.CLOUD.videos)
 * A video record is { id, course, chapter, title, key, free }. `key` is the exact file name in the bucket.
 * Optional: if the server has VIDEO_UPLOAD=true, an mp4 can be uploaded straight from the browser to Backblaze.
 * All text is rendered with textContent, never innerHTML.
 */
(function (g) {
  "use strict";
  var FALLBACK = [["c10-science", "Class 10 Science"], ["c7-english", "Class 7 English"], ["c7-maths", "Class 7 Mathematics"]];
  var ID_RE = /^[a-z0-9][a-z0-9-]{2,79}$/;

  function h(tag, props, kids) {
    var e = document.createElement(tag);
    for (var k in (props || {})) { if (k === "text") e.textContent = props[k]; else if (k === "style") e.style.cssText = props[k]; else e[k] = props[k]; }
    (kids || []).forEach(function (c) { e.appendChild(c); });
    return e;
  }
  function courses() {
    try {
      if (typeof DATA !== "undefined" && DATA && DATA.courses && DATA.courses.length)
        return DATA.courses.map(function (c) { return [c.id, "Class " + c["class"] + " " + c.subject + (c.medium ? " (" + c.medium + ")" : "")]; });
    } catch (e) {}
    return FALLBACK;
  }
  function slug(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 30) || "video"; }
  function base() { return (g.ORBIT_API || ""); }
  function api(path, body) {
    var tokenP = g.CLOUD && g.CLOUD.token ? g.CLOUD.token() : Promise.resolve(null);
    return tokenP.then(function (tok) {
      if (!tok) throw new Error("Pehle log in karo.");
      return fetch(base() + path, { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + tok }, body: JSON.stringify(body), signal: AbortSignal.timeout(30000) });
    }).then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) throw new Error(j.error || ("Server error " + r.status)); return j; }); });
  }
  function putFile(url, file, onProgress) {
    return new Promise(function (res, rej) {
      var x = new XMLHttpRequest();
      x.open("PUT", url, true);
      x.setRequestHeader("Content-Type", "video/mp4");
      x.upload.onprogress = function (e) { if (e.lengthComputable) onProgress(Math.round(e.loaded * 100 / e.total)); };
      x.onload = function () { (x.status >= 200 && x.status < 300) ? res() : rej(new Error("Backblaze ne upload mana kiya (" + x.status + "). App key mein write permission check karo.")); };
      x.onerror = function () { rej(new Error("Upload block hua. Bucket par CORS rule lagana baaki hai, ya internet toot gaya.")); };
      x.send(file);
    });
  }

  function mount(box, store) {
    box.textContent = "";
    var editing = null, uploadOn = false;
    var inpStyle = "width:100%;padding:9px;margin-top:3px;box-sizing:border-box";
    var msg = h("div", { style: "white-space:pre-wrap;font-size:13px;margin:8px 0;min-height:20px" });
    function say(t, ok) { msg.textContent = t; msg.style.color = ok ? "#168653" : "#d74747"; }

    var course = h("select", { style: inpStyle });
    var chapter = h("input", { type: "number", min: "1", max: "99", placeholder: "jaise 1", style: inpStyle });
    var title = h("input", { maxLength: 120, placeholder: "Video ka naam, jaise Integers: Introduction", style: inpStyle });
    var key = h("input", { maxLength: 200, placeholder: "Backblaze mein file ka exact naam, jaise c7m1-intro.mp4", style: inpStyle + ";font-family:monospace;font-size:13px" });
    var free = h("input", { type: "checkbox", checked: true });
    function lab(text, el) { return h("label", { style: "display:block;font-size:12px;margin-top:8px" }, [document.createTextNode(text), el]); }
    function fill() { course.textContent = ""; courses().forEach(function (c) { course.appendChild(h("option", { value: c[0], text: c[1] })); }); }
    fill();

    /* optional upload box */
    var file = h("input", { type: "file", accept: "video/mp4,.mp4", style: "margin-top:4px;max-width:100%" });
    var upBtn = h("button", { type: "button", text: "Upload to Backblaze", style: "padding:9px 12px;border-radius:10px;border:0;background:rgba(128,128,128,.18);color:inherit;cursor:pointer;margin-top:6px" });
    var prog = h("div", { style: "font-size:12px;margin-top:4px" });
    var upBox = h("div", { style: "margin-top:10px;padding:10px;border:1px dashed rgba(128,128,128,.5);border-radius:10px" });
    function upHint(t) { prog.textContent = t; }
    upBtn.onclick = function () {
      var f = file.files && file.files[0];
      if (!f) return upHint("Pehle ek .mp4 file chuno.");
      upBtn.disabled = true; upHint("Link bana raha hoon...");
      api("/api/video/upload-url", { filename: f.name, size: f.size, contentType: "video/mp4" })
        .then(function (j) { return putFile(j.url, f, function (p) { upHint("Upload ho raha hai: " + p + "%"); }).then(function () { return j.key; }); })
        .then(function (k) { key.value = k; upHint("Upload ho gaya. File ka naam upar bhar diya hai. Ab Save dabao."); },
          function (e) { upHint(""); say("Upload fail: " + (e && e.message ? e.message : e)); })
        .then(function () { upBtn.disabled = false; });
    };
    function drawUpload() {
      upBox.textContent = "";
      if (uploadOn) { [h("div", { text: "File seedha Backblaze mein upload karo (sirf .mp4, H.264)", style: "font-size:12px" }), file, upBtn, prog].forEach(function (n) { upBox.appendChild(n); }); }
      else upBox.appendChild(h("div", { text: "Browser upload abhi off hai. Backblaze website par file upload karo aur uska naam upar likho. (Render mein VIDEO_UPLOAD=true karne se ye option on hoga.)", style: "font-size:12px" }));
    }
    drawUpload();
    fetch(base() + "/api/ping").then(function (r) { return r.json(); }).then(function (j) { uploadOn = !!(j && j.upload); drawUpload(); }, function () {});

    var saveBtn = h("button", { type: "button", text: "Save video", style: "padding:10px 14px;border-radius:10px;border:0;background:rgba(128,128,128,.28);color:inherit;cursor:pointer;font-weight:600" });
    var newBtn = h("button", { type: "button", text: "Naya form", style: "padding:10px 14px;border-radius:10px;border:0;background:rgba(128,128,128,.18);color:inherit;cursor:pointer" });
    var bar = h("div", { style: "display:flex;gap:8px;flex-wrap:wrap;margin-top:12px" }, [saveBtn, newBtn]);
    var list = h("div", { style: "display:flex;flex-direction:column;gap:6px;margin-top:10px" });
    var voBox = h("div", {});                                 // AI voiceover panel (public/voiceover-admin.js) opens here

    function clear() { editing = null; chapter.value = ""; title.value = ""; key.value = ""; free.checked = true; file.value = ""; upHint(""); say("", true); }
    newBtn.onclick = clear;

    saveBtn.onclick = function () {
      var ch = parseInt(chapter.value, 10), t = title.value.trim(), k = key.value.trim().replace(/^\/+/, "");
      if (!(ch >= 1 && ch <= 99)) return say("Chapter number 1 se 99 ke beech likho.");
      if (!t) return say("Video ka naam likho.");
      if (!k || /\s/.test(k)) return say("File ka naam likho (space nahi hona chahiye).");
      var id = editing || ("v-" + slug(t) + "-" + Date.now().toString(36));
      if (!ID_RE.test(id)) return say("Video id galat ban gayi. Naam badal ke try karo.");
      var v = { id: id, course: course.value, chapter: ch, title: t, key: k, free: !!free.checked };
      saveBtn.disabled = true;
      store.set(v).then(function () { say("Saved: " + t + ". Students ko 1-2 minute mein dikhega.", true); clear(); refresh(); },
        function (e) { say((e && e.code === "permission-denied") ? "Save nahi hua: ye Google account admin nahi hai, ya Firestore rules deploy nahi hue." : "Save fail: " + (e && e.message ? e.message : e)); })
        .then(function () { saveBtn.disabled = false; });
    };

    function row(v) {
      var cn = (courses().filter(function (c) { return c[0] === v.course; })[0] || [0, v.course])[1];
      var info = h("div", { style: "flex:1;min-width:0;font-size:13px" }, [
        h("div", { text: v.title, style: "font-weight:600" }),
        h("div", { text: cn + " · Chapter " + v.chapter + " · " + (v.free ? "Free" : "Paid") + " · " + v.key, style: "font-size:12px;opacity:.75;word-break:break-all" })
      ]);
      var ed = h("button", { type: "button", text: "Edit", style: "padding:7px 10px;border-radius:8px;border:0;background:rgba(128,128,128,.18);color:inherit;cursor:pointer" });
      ed.onclick = function () { editing = v.id; course.value = v.course; chapter.value = v.chapter; title.value = v.title; key.value = v.key; free.checked = !!v.free; say("Edit mode: " + v.title, true); box.scrollIntoView && box.scrollIntoView(); };
      var dl = h("button", { type: "button", text: "Delete", style: "padding:7px 10px;border-radius:8px;border:0;background:rgba(215,71,71,.2);color:inherit;cursor:pointer" });
      dl.onclick = function () {
        if (!confirm("Is video ko list se hatana hai?\n" + v.title + "\n(Backblaze mein file rahegi, wahan se alag delete karni hogi.)")) return;
        store.del(v.id).then(function () { say("Hata di gayi.", true); if (editing === v.id) clear(); refresh(); }, function (e) { say("Delete fail: " + (e && e.message ? e.message : e)); });
      };
      var vo = h("button", { type: "button", text: "Voiceover", style: "padding:7px 10px;border-radius:8px;border:0;background:rgba(128,128,128,.18);color:inherit;cursor:pointer" });
      vo.onclick = function () {
        if (!g.VoiceoverAdmin || !g.CLOUD || !g.CLOUD.narration) return say("Voiceover panel load nahi hua. Page refresh karo.");
        g.VoiceoverAdmin.mount(voBox, { video: v, store: g.CLOUD.narration }); voBox.scrollIntoView && voBox.scrollIntoView();
      };
      return h("div", { style: "display:flex;gap:8px;align-items:center;padding:8px 10px;border-radius:10px;background:rgba(128,128,128,.1)" }, [info, vo, ed, dl]);
    }
    function refresh() {
      store.list().then(function (items) {
        list.textContent = "";
        items.sort(function (a, b) { return String(a.course).localeCompare(String(b.course)) || a.chapter - b.chapter || String(a.title).localeCompare(String(b.title)); });
        items.forEach(function (v) { list.appendChild(row(v)); });
        if (!items.length) list.textContent = "Abhi admin panel se koi video add nahi hui. (videos.js wali purani videos yahan nahi dikhti, wo waise hi chalti rahengi.)";
      }, function (e) { list.textContent = "List load nahi hui: " + (e && e.message ? e.message : e); });
    }

    var freeLab = h("label", { style: "display:flex;gap:8px;align-items:center;font-size:13px;margin-top:10px" }, [free, document.createTextNode("Free video (sabko dikhegi)")]);
    [h("h3", { text: "Video lessons" }), lab("Course", course), lab("Chapter number", chapter), lab("Video ka naam", title), lab("Backblaze file ka naam", key), upBox, freeLab, bar, msg,
      h("div", { text: "Admin panel se add ki hui videos:", style: "font-size:12px;margin-top:8px" }), list, voBox].forEach(function (n) { box.appendChild(n); });
    refresh();
  }

  g.VideoAdmin = { mount: mount };
})(typeof window !== "undefined" ? window : globalThis);
