/* voiceover-admin.js - admin panel to add an AI voiceover to a RECORDED (mp4) video lesson. The original video is never changed.
 *
 * VoiceoverAdmin.mount(el, { video, store })      video = { id, course, chapter, title, key, free }   store = CLOUD.narration
 *   1. Write the script as segments; each segment starts at an offset (seconds into the video).
 *   2. Generate (Sonex via the server, once; same text + voice = reused), audio goes to private B2, keys/offsets go to Firestore narration/<video id>.
 *   3. Load the video, press Play: the real student logic (voiceover.js) plays the voiceover; "now" copies the video's current time into an offset.
 * Segments must not overlap (offset + audio length <= next offset). Status becomes "ready" only if every segment was generated.
 * Students hear the voiceover while the video's own sound is muted, so the two never overlap (voiceover.js).
 */
(function (g) {
  "use strict";
  var LANGS = [["en", "English"], ["hi", "Hindi"], ["as", "Assamese"], ["bn", "Bengali"], ["hg", "Hinglish"]];
  var LCODE = { en: "en", hi: "hi", as: "as", bn: "bn", hg: "hi" }, LNAME = { en: "english", hi: "hindi", as: "assamese", bn: "bengali" };
  var BTN = "padding:8px 12px;border-radius:10px;border:0;background:rgba(128,128,128,.18);color:inherit;cursor:pointer;font-size:13px";
  var INP = "padding:7px;border-radius:8px;border:1px solid rgba(128,128,128,.5);background:transparent;color:inherit;font-size:13px;box-sizing:border-box";
  var MAX_SEGS = 12, MAX_CHARS = 2000;

  function h(tag, props, kids) {
    var e = document.createElement(tag);
    for (var k in (props || {})) { if (k === "text") e.textContent = props[k]; else if (k === "style") e.style.cssText = props[k]; else e[k] = props[k]; }
    (kids || []).forEach(function (c) { if (c) e.appendChild(c); });
    return e;
  }
  function btn(label, fn) { var b = h("button", { type: "button", text: label, style: BTN }); b.onclick = fn; return b; }
  function r2(n) { return Math.round(n * 100) / 100; }
  function api(method, path, body) {
    return Promise.resolve(g.CLOUD && g.CLOUD.token ? g.CLOUD.token() : null).then(function (tok) {
      if (!tok) throw new Error("Login nahi hai. Dobara sign in karo.");
      var init = { method: method, headers: { Authorization: "Bearer " + tok } };
      if (body) { init.headers["Content-Type"] = "application/json"; init.body = JSON.stringify(body); }
      if (typeof AbortSignal !== "undefined" && AbortSignal.timeout) init.signal = AbortSignal.timeout(115000);
      return fetch((g.ORBIT_API || "") + path, init);
    }).then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) throw new Error(j.error || ("Server error " + r.status)); return j; }); });
  }
  function voiceFits(v, lang) {
    if (!v.languages) return null;
    var c = LCODE[lang];
    return v.languages.some(function (l) { return l === c || l.indexOf(c + "-") === 0 || l.indexOf(c + "_") === 0 || l === LNAME[c]; });
  }
  function folderOf(v) {
    var c = String(v.course || "video").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 39) || "video";
    return c + "/chapter-" + (parseInt(v.chapter, 10) || 0);
  }

  function mount(el, ctx) {
    var video = ctx.video, S = { lang: "en", voices: [], defaultVoice: null, rows: [{ text: "", offset: 0 }], tracks: {}, busy: false, msg: [], ok: false, pick: {}, speedVal: null };
    var root = h("div", { style: "margin-top:14px;padding:12px;border:1px solid rgba(128,128,128,.4);border-radius:12px" });
    el.textContent = ""; el.appendChild(root);
    var msgBox = null, vEl = null, voiceSel, speedIn, langSel;

    function setMsg(lines, ok) { S.msg = lines; S.ok = !!ok; if (msgBox) { msgBox.textContent = lines.join("\n"); msgBox.style.color = ok ? "#168653" : "#d74747"; } }
    function trackSegs(lang) { var t = S.tracks[lang]; return t ? t.segments || [] : []; }

    function rowsFromTrack(lang) {
      var segs = trackSegs(lang).slice().sort(function (a, b) { return a.offset - b.offset; });
      S.rows = segs.length ? segs.map(function (s) { return { text: s.text || "", offset: s.offset || 0 }; }) : [{ text: "", offset: 0 }];
    }
    function loadSaved() {
      return ctx.store.get(video.id).then(function (d) {
        S.tracks = d && d.tracks ? d.tracks : {}; var langs = Object.keys(S.tracks);
        if (langs.length && !S.tracks[S.lang]) S.lang = langs[0];
        rowsFromTrack(S.lang); setMsg([d ? "Saved voiceover load hui." : "Is video ki voiceover abhi nahi bani."], true); render();
      }, function (e) { setMsg(["Load fail: " + (e && e.message ? e.message : e)]); });
    }
    function loadVoices() {
      return api("GET", "/api/narration/voices").then(function (r) { S.voices = r.voices || []; S.defaultVoice = r.defaultVoiceId || null; render(); },
        function (e) { setMsg(["Voices load nahi hui: " + e.message]); render(); });
    }

    /* the rows as typed, checked */
    function cleanRows() {
      var errs = [], out = [];
      S.rows.forEach(function (r, i) {
        var tx = String(r.text || "").replace(/\s+/g, " ").trim(), off = Number(r.offset);
        if (!tx && S.rows.length === 1) return;
        if (!tx) { errs.push("Segment " + (i + 1) + ": text khali hai"); return; }
        if (tx.length > MAX_CHARS) errs.push("Segment " + (i + 1) + ": text " + MAX_CHARS + " characters se chhota hona chahiye");
        if (!isFinite(off) || off < 0) errs.push("Segment " + (i + 1) + ": offset 0 ya usse bada number chahiye (seconds)");
        out.push({ text: tx, offset: off });
      });
      if (out.length > MAX_SEGS) errs.push("Ek baar mein max " + MAX_SEGS + " segment");
      out.sort(function (a, b) { return a.offset - b.offset; });
      return { rows: out, errors: errs };
    }
    function overlapErrors(segs) {
      var errs = [], s = segs.slice().sort(function (a, b) { return a.offset - b.offset; });
      for (var i = 0; i + 1 < s.length; i++) if (s[i].duration && s[i].offset + s[i].duration > s[i + 1].offset + 0.05)
        errs.push("Segment " + (i + 1) + " (" + s[i].offset + "s se " + r2(s[i].offset + s[i].duration) + "s tak) agle segment (" + s[i + 1].offset + "s) se takra rahi hai.");
      return errs;
    }
    function docStatus() { var l = Object.keys(S.tracks); if (!l.length) return "pending"; return l.every(function (k) { return S.tracks[k].status === "ready"; }) ? "ready" : "failed"; }
    function save(quiet) {
      var errs = [];
      Object.keys(S.tracks).forEach(function (l) { overlapErrors(trackSegs(l)).forEach(function (m) { errs.push(l + ": " + m); }); });
      if (errs.length) { setMsg(["Save nahi hua:"].concat(errs)); return Promise.resolve(false); }
      var doc = { lessonId: video.id, provider: "sonex", status: docStatus(), tracks: S.tracks, steps: [] };
      return ctx.store.set(video.id, doc).then(function () { if (!quiet) setMsg(["Save ho gaya (status: " + doc.status + ")."], true); return true; },
        function (e) { setMsg(["Save fail: " + (e && e.message ? e.message : e)]); return false; });
    }
    function measure(lang) {
      var need = trackSegs(lang).filter(function (s) { return s.audioKey && !s.duration; });
      if (!need.length) return Promise.resolve();
      return api("POST", "/api/narration/url", { lessonId: video.id, keys: need.map(function (s) { return s.audioKey; }).slice(0, 30) }).then(function (r) {
        return Promise.all(need.map(function (s) {
          return new Promise(function (res) {
            var a = new Audio(), done = false, fin = function (d) { if (done) return; done = true; if (d && isFinite(d) && d > 0) s.duration = r2(d); res(); };
            a.preload = "metadata"; a.addEventListener("loadedmetadata", function () { fin(a.duration); }); a.addEventListener("error", function () { fin(0); });
            setTimeout(function () { fin(0); }, 8000); a.src = r.urls[s.audioKey];
          });
        }));
      }).catch(function () {});
    }

    function generate(force) {
      if (S.busy) return;
      var c = cleanRows(); if (c.errors.length) return setMsg(["Pehle ye theek karo:"].concat(c.errors));
      if (!c.rows.length) return setMsg(["Script likho (kam se kam ek segment)."]);
      var voiceId = voiceSel.value, speed = parseFloat(speedIn.value) || 1, lang = S.lang;
      if (!voiceId) return setMsg(["Voice chuno."]);
      var vInfo = S.voices.filter(function (v) { return v.id === voiceId; })[0];
      if (vInfo && voiceFits(vInfo, lang) === false) return setMsg([vInfo.name + " voice is language ke liye nahi hai."]);
      S.busy = true; setMsg(["Voiceover ban rahi hai aur upload ho rahi hai: " + c.rows.length + " segment..."], true); render();
      var old = trackSegs(lang);
      api("POST", "/api/narration/generate", { lessonId: video.id, folder: folderOf(video), language: lang, voiceId: voiceId, speed: speed, force: !!force,
        segments: c.rows.map(function (r, i) { return { index: i, text: r.text }; }) }).then(function (res) {
        var out = c.rows.map(function (r, i) {
          var x = (res.segments || []).filter(function (q) { return q.index === i; })[0] || {}, ok = x.status === "ready";
          var prev = old.filter(function (o) { return o.audioKey && o.audioKey === x.audioKey; })[0];
          return { index: i, text: r.text, offset: r.offset, status: ok ? "ready" : "failed", audioKey: ok ? x.audioKey : undefined, contentHash: ok ? x.contentHash : undefined,
            duration: prev ? prev.duration : undefined, error: ok ? undefined : String(x.error || "fail").slice(0, 200), events: [] };
        });
        var allOk = out.every(function (s) { return s.status === "ready"; });
        S.tracks[lang] = { voiceId: voiceId, voiceName: vInfo ? vInfo.name : voiceId, speed: speed, status: allOk ? "ready" : "failed", generatedAt: Date.now(), segments: out };
        return (allOk ? measure(lang) : Promise.resolve()).then(function () {
          var ov = allOk ? overlapErrors(out) : [];
          return save(true).then(function (saved) {
            if (!saved) return;
            var bad = out.filter(function (s) { return s.status !== "ready"; });
            if (!allOk) setMsg(["Kuch segment nahi bane (" + bad.length + "). Pehla error: " + (bad[0].error || "?"), "Voiceover ready nahi mani gayi. Dobara Generate karo."]);
            else if (ov.length) setMsg(["Voiceover ban gayi par ye segment takra rahe hain, offset badal ke Save karo:"].concat(ov));
            else setMsg(["Voiceover ready aur save ho gayi (" + out.length + " segment)."], true);
          });
        });
      }).catch(function (e) { setMsg(["Generate fail: " + (e && e.message ? e.message : e)]); }).then(function () { S.busy = false; render(); });
    }
    function saveOffsets() {      // change only the start times of segments that already exist (no new audio)
      var segs = trackSegs(S.lang); if (!segs.length) return setMsg(["Pehle Generate karo."]);
      var c = cleanRows(); if (c.errors.length) return setMsg(["Pehle ye theek karo:"].concat(c.errors));
      if (c.rows.length !== segs.length) return setMsg(["Segment ki ginti badal gayi hai. Dobara Generate karo."]);
      var bySorted = segs.slice().sort(function (a, b) { return a.index - b.index; });
      for (var i = 0; i < bySorted.length; i++) if (bySorted[i].text !== S.rows[i].text.replace(/\s+/g, " ").trim()) return setMsg(["Segment " + (i + 1) + " ka text badal gaya hai. Dobara Generate karo."]);
      bySorted.forEach(function (s, i) { s.offset = Number(S.rows[i].offset); });
      save(false);
    }
    function removeAll() {
      if (!confirm("Is video ki voiceover hatani hai? (Video waise hi rahegi. Backblaze mein audio files rahengi.)")) return;
      ctx.store.del(video.id).then(function () { S.tracks = {}; S.rows = [{ text: "", offset: 0 }]; setMsg(["Voiceover hata di gayi."], true); render(); }, function (e) { setMsg(["Delete fail: " + (e && e.message ? e.message : e)]); });
    }

    /* ---------- preview: the real student logic on the real video ---------- */
    function loadVideo() {
      api("POST", "/api/video", { id: video.id }).then(function (r) {
        vEl = vEl || h("video", { controls: true, playsInline: true, preload: "metadata", style: "width:100%;max-height:300px;background:#000;margin-top:6px" });
        vEl.src = r.url; render();
      }, function (e) { setMsg(["Video nahi khuli: " + e.message]); });
    }
    function previewVoiceover() {
      var segs = trackSegs(S.lang).filter(function (s) { return s.audioKey; });
      if (!vEl || !vEl.src) return setMsg(["Pehle \"Video load karo\" dabao."]);
      if (!segs.length) return setMsg(["Pehle Generate karo."]);
      api("POST", "/api/narration/url", { lessonId: video.id, keys: segs.map(function (s) { return s.audioKey; }).slice(0, 30) }).then(function (r) {
        var info = { id: video.id, signed: {}, tracks: {} };
        info.tracks[S.lang] = { segments: segs.map(function (s) { return { index: s.index, key: s.audioKey, url: r.urls[s.audioKey], offset: Number(s.offset) || 0, duration: s.duration || 0 }; }) };
        try { localStorage.setItem("mvLang", S.lang); } catch (e) {}
        if (!g.Voiceover) return setMsg(["voiceover.js load nahi hua."]);
        g.Voiceover.attach(vEl, video.id, { info: info });
        setMsg(["Video chalao. Voiceover original awaaz ki jagah chalegi."], true);
      }, function (e) { setMsg(["Preview fail: " + e.message]); });
    }

    function render() {
      root.textContent = "";
      root.appendChild(h("h3", { text: "Voiceover: " + video.title, style: "margin:0 0 4px" }));
      root.appendChild(h("div", { text: "Original video waisi hi rahegi. Students ko voiceover chalegi aur video ki apni awaaz band rahegi, taaki dono overlap na hon.", style: "font-size:12px;margin-bottom:8px" }));
      langSel = h("select", { style: INP + ";width:100%" }); LANGS.forEach(function (o) { langSel.appendChild(h("option", { value: o[0], text: o[1] })); }); langSel.value = S.lang;
      langSel.onchange = function () { S.lang = langSel.value; rowsFromTrack(S.lang); render(); };
      voiceSel = h("select", { style: INP + ";width:100%" });
      var shown = S.voices.filter(function (v) { return voiceFits(v, S.lang) !== false; });
      shown.forEach(function (v) { voiceSel.appendChild(h("option", { value: v.id, text: v.name + (v.gender ? " (" + v.gender + ")" : "") + (voiceFits(v, S.lang) === null ? " - language Sonex ne nahi batayi" : "") })); });
      var t = S.tracks[S.lang], has = function (id) { return !!id && shown.some(function (v) { return v.id === id; }); };
      voiceSel.value = (has(S.pick[S.lang]) ? S.pick[S.lang] : has(t && t.voiceId) ? t.voiceId : has(S.defaultVoice) ? S.defaultVoice : (shown[0] && shown[0].id)) || "";
      voiceSel.onchange = function () { S.pick[S.lang] = voiceSel.value; };
      speedIn = h("input", { type: "number", step: "0.05", min: "0.75", max: "1.5", value: S.speedVal || (t && t.speed ? t.speed : 1), style: INP + ";width:100%" });
      speedIn.onchange = function () { S.speedVal = parseFloat(speedIn.value) || null; };
      root.appendChild(h("div", { style: "display:grid;grid-template-columns:1fr 1fr 90px;gap:8px;margin:6px 0" }, [
        h("label", { style: "font-size:12px" }, [document.createTextNode("Language"), langSel]),
        h("label", { style: "font-size:12px" }, [document.createTextNode("Voice"), voiceSel]),
        h("label", { style: "font-size:12px" }, [document.createTextNode("Speed"), speedIn])]));
      var status = S.busy ? "Status: generating / uploading..." : !t ? "Is language ki voiceover nahi bani" : t.status === "ready" ? "Status: ready (" + (t.voiceName || t.voiceId) + ")" : "Status: failed - dobara Generate karo";
      root.appendChild(h("div", { text: status, style: "font-size:13px;font-weight:600;margin:6px 0" }));

      S.rows.forEach(function (r, i) {
        var seg = trackSegs(S.lang).filter(function (x) { return x.index === i; })[0];
        var ta = h("textarea", { value: r.text, placeholder: "Is hisse mein jo bolna hai", style: INP + ";width:100%;min-height:64px" });
        ta.onchange = function () { r.text = ta.value; };
        var off = h("input", { type: "number", step: "0.1", min: "0", value: r.offset, style: INP + ";width:84px" });
        off.onchange = function () { r.offset = Number(off.value); };
        var now = btn("now", function () { if (vEl) { off.value = r2(vEl.currentTime || 0); off.onchange(); } });
        var stale = seg && seg.text !== String(r.text || "").replace(/\s+/g, " ").trim();
        var info = seg ? (seg.status === "ready" ? "audio ready" + (seg.duration ? ", " + seg.duration + "s" : "") : "FAILED: " + (seg.error || "?")) : "abhi audio nahi";
        root.appendChild(h("div", { style: "margin:8px 0;padding:8px;border:1px solid rgba(128,128,128,.35);border-radius:10px" }, [
          h("div", { style: "display:flex;gap:6px;align-items:center;flex-wrap:wrap;font-size:12px" }, [document.createTextNode("Segment " + (i + 1) + "  video ke second:"), off, now,
            h("span", { text: info + (stale ? "  (text badla, dobara Generate karo)" : ""), style: "color:" + (stale || (seg && seg.status !== "ready") ? "#d74747" : "inherit") }),
            btn("x", function () { S.rows.splice(i, 1); if (!S.rows.length) S.rows.push({ text: "", offset: 0 }); render(); })]), ta]));
      });
      var b1 = btn("Generate voiceover", function () { generate(false); }), b2 = btn("Regenerate", function () { if (confirm("Naya take banana hai? Ye Sonex ka credit use karega.")) generate(true); });
      b1.disabled = b2.disabled = S.busy;
      root.appendChild(h("div", { style: "display:flex;gap:8px;flex-wrap:wrap" }, [btn("+ Segment", function () { var last = S.rows[S.rows.length - 1]; S.rows.push({ text: "", offset: last ? Number(last.offset) + 5 : 0 }); render(); }), b1, b2,
        btn("Sirf offsets save", saveOffsets), btn("Saved load karo", loadSaved), btn("Voiceover hatao", removeAll)]));
      root.appendChild(h("div", { style: "display:flex;gap:8px;flex-wrap:wrap;margin-top:10px" }, [btn("Video load karo", loadVideo), btn("Voiceover ke saath preview", previewVoiceover)]));
      if (vEl) root.appendChild(vEl);
      msgBox = h("div", { text: S.msg.join("\n"), style: "white-space:pre-wrap;font-size:13px;margin:8px 0;min-height:20px;color:" + (S.ok ? "#168653" : "#d74747") });
      root.appendChild(msgBox);
    }

    render(); loadVoices(); loadSaved();
    return { _state: S, _generate: generate, _save: save, _render: render, _saveOffsets: saveOffsets };
  }

  var api2 = { mount: mount };
  if (typeof module !== "undefined" && module.exports) module.exports = api2; else g.VoiceoverAdmin = api2;
})(typeof window !== "undefined" ? window : globalThis);
