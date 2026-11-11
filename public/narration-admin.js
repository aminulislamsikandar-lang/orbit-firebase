/* narration-admin.js - admin panel for AI narration (Sonex) under the Math Video admin.
 *
 * NarrationAdmin.mount(el, { getCode(), getPlan(), store, preview(plan, playerOpts) })
 *   getCode / getPlan : the lesson code and the (validated) plan currently loaded in the Math Video panel above
 *   store             : CLOUD.narration { get, set }   (Firestore narration/<code>: keys + timings only)
 * Flow: pick language + voice -> Generate (server asks Sonex once, uploads to private B2, answers per segment)
 *       -> the page saves the metadata. Status becomes "ready" only when EVERY segment came back ready.
 *       -> Load audio / listen, set event times ("now" copies the audio's current time), Save, Preview synced lesson.
 * All text is written with textContent; nothing from the plan or the server is put into markup.
 */
(function (g) {
  "use strict";
  var LANGS = [["en", "English"], ["hi", "Hindi"], ["as", "Assamese"], ["bn", "Bengali"], ["hg", "Hinglish"]];
  var LCODE = { en: "en", hi: "hi", as: "as", bn: "bn", hg: "hi" }, LNAME = { en: "english", hi: "hindi", as: "assamese", bn: "bengali" };
  var SPRITES = ["car", "bird", "sun", "flower"], CHUNK = 12;
  var BTN = "padding:8px 12px;border-radius:10px;border:0;background:rgba(128,128,128,.18);color:inherit;cursor:pointer;font-size:13px";
  var INP = "padding:7px;border-radius:8px;border:1px solid rgba(128,128,128,.5);background:transparent;color:inherit;font-size:13px;box-sizing:border-box";

  function h(tag, props, kids) {
    var e = document.createElement(tag);
    for (var k in (props || {})) { if (k === "text") e.textContent = props[k]; else if (k === "style") e.style.cssText = props[k]; else e[k] = props[k]; }
    (kids || []).forEach(function (c) { if (c) e.appendChild(c); });
    return e;
  }
  function btn(label, fn, extra) { var b = h("button", { type: "button", text: label, style: BTN + (extra || "") }); b.onclick = fn; return b; }
  function r2(n) { return Math.round(n * 100) / 100; }
  function api(method, path, body) {
    return Promise.resolve(g.CLOUD && g.CLOUD.token ? g.CLOUD.token() : null).then(function (tok) {
      if (!tok) throw new Error("Login nahi hai. Dobara sign in karo.");
      var init = { method: method, headers: { Authorization: "Bearer " + tok } };
      if (body) { init.headers["Content-Type"] = "application/json"; init.body = JSON.stringify(body); }
      if (typeof AbortSignal !== "undefined" && AbortSignal.timeout) init.signal = AbortSignal.timeout(115000);
      return fetch((g.ORBIT_API || "") + path, init);
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) throw new Error(j.error || ("Server error " + r.status)); return j; });
    });
  }
  function voiceFits(v, lang) {
    if (!v.languages) return null;                       // Sonex did not say: unknown
    var c = LCODE[lang];
    return v.languages.some(function (l) { return l === c || l.indexOf(c + "-") === 0 || l.indexOf(c + "_") === 0 || l === LNAME[c]; });
  }

  function mount(el, ctx) {
    var S = { doc: { tracks: {}, steps: [] }, voices: [], defaultVoice: null, lang: "en", busy: false, lessonId: "", plan: null, msg: [], msgOk: false };
    var audioEls = {};                                    // "lang:index" -> <audio>, kept across re-renders
    var root = h("div", {});
    el.textContent = ""; el.appendChild(root);

    function setMsg(lines, ok) { S.msg = lines; S.msgOk = !!ok; if (msgBox) { msgBox.textContent = lines.join("\n"); msgBox.style.color = ok ? "#168653" : "#d74747"; } }
    var msgBox = null;
    function plan() { var p = null; try { p = ctx.getPlan(); } catch (e) {} if (p) S.plan = p; return p; }
    function stepText(p, i, lang) { var s = p && p.steps[i]; return s && s.say && typeof s.say[lang] === "string" ? s.say[lang].trim() : ""; }
    function track() { return S.doc.tracks[S.lang] || null; }
    function segOf(lang, i) { var t = S.doc.tracks[lang]; return t ? (t.segments || []).filter(function (s) { return s.index === i; })[0] || null : null; }
    function sceneOf(i, create) {
      var st = S.doc.steps.filter(function (x) { return x.index === i; })[0];
      if (!st && create) { st = { index: i, scene: [] }; S.doc.steps.push(st); }
      return st ? st.scene : [];
    }

    /* ---------- loading ---------- */
    function loadVoices() {
      return api("GET", "/api/narration/voices").then(function (r) { S.voices = r.voices || []; S.defaultVoice = r.defaultVoiceId || null; render(); },
        function (e) { S.voices = []; setMsg(["Voices load nahi hui: " + e.message]); render(); });
    }
    function loadSaved() {
      var id = ctx.getCode(); if (!id) return setMsg(["Pehle upar lesson code bharo."]);
      S.lessonId = id; setMsg(["Saved narration dhoondh raha hoon..."], true);
      return ctx.store.get(id).then(function (d) {
        S.doc = d ? { tracks: d.tracks || {}, steps: d.steps || [] } : { tracks: {}, steps: [] };
        audioEls = {};
        var langs = Object.keys(S.doc.tracks); if (langs.length && !S.doc.tracks[S.lang]) S.lang = langs[0];
        setMsg([d ? "Saved narration load hui." : "Is lesson ki narration abhi nahi bani."], true); render();
      }, function (e) { setMsg(["Load fail: " + (e && e.message ? e.message : e)]); });
    }

    /* ---------- validation + save ---------- */
    function validateAll() {
      var errors = [], p = plan(), NS = g.NarrationSync;
      S.doc.steps.forEach(function (st) {
        var ids = {};
        if ((st.scene || []).length > 8) errors.push("Step " + (st.index + 1) + ": max 8 pictures");
        (st.scene || []).forEach(function (sp, j) {
          var w = "Step " + (st.index + 1) + " picture " + (j + 1) + ": ";
          if (!/^[a-z][a-z0-9-]{0,19}$/.test(sp.id || "")) errors.push(w + "id chhota hona chahiye (a-z, 0-9, -)");
          else if (ids[sp.id]) errors.push(w + "id \"" + sp.id + "\" repeat hai");
          ids[sp.id] = 1;
          if (SPRITES.indexOf(sp.sprite) < 0) errors.push(w + "sprite " + SPRITES.join(" / ") + " me se ek");
          if (!(sp.x >= 0 && sp.x <= 600) || !(sp.y >= 0 && sp.y <= 420)) errors.push(w + "x 0-600, y 0-420 ke beech");
          if (sp.scale !== undefined && !(sp.scale >= 0.2 && sp.scale <= 4)) errors.push(w + "scale 0.2 se 4");
        });
      });
      Object.keys(S.doc.tracks).forEach(function (lang) {
        (S.doc.tracks[lang].segments || []).forEach(function (seg) {
          var cues = p && p.steps[seg.index] && p.steps[seg.index].anim && p.steps[seg.index].anim.cues ? p.steps[seg.index].anim.cues.length : 99;
          var ids = sceneOf(seg.index).map(function (x) { return x.id; });
          if (NS) NS.validateEvents(seg.events || [], cues, ids, seg.duration).forEach(function (m) { errors.push(lang + " step " + (seg.index + 1) + " " + m); });
        });
      });
      return errors;
    }
    function docStatus() {
      var langs = Object.keys(S.doc.tracks); if (!langs.length) return "pending";
      return langs.every(function (l) { return S.doc.tracks[l].status === "ready"; }) ? "ready" : "failed";
    }
    function save(quiet) {
      var id = S.lessonId || ctx.getCode(); if (!id) { setMsg(["Lesson code nahi hai."]); return Promise.resolve(false); }
      var errs = validateAll();
      if (errs.length) { setMsg(["Save nahi hua:"].concat(errs.slice(0, 8))); return Promise.resolve(false); }
      var doc = { lessonId: id, provider: "sonex", status: docStatus(), tracks: S.doc.tracks, steps: S.doc.steps };
      return ctx.store.set(id, doc).then(function () { if (!quiet) setMsg(["Save ho gaya (status: " + doc.status + ")."], true); return true; },
        function (e) { setMsg(["Save fail: " + (e && e.message ? e.message : e)]); return false; });
    }

    /* ---------- generate ---------- */
    function measure(lang) {      // real audio length, so cue times and event limits use it
      var t = S.doc.tracks[lang]; if (!t) return Promise.resolve();
      var need = (t.segments || []).filter(function (s) { return s.audioKey && !s.duration; });
      if (!need.length) return Promise.resolve();
      return api("POST", "/api/narration/url", { lessonId: S.lessonId, keys: need.map(function (s) { return s.audioKey; }).slice(0, 30) }).then(function (r) {
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
      var p = plan(), id = ctx.getCode();
      if (!p) return setMsg(["Pehle upar valid plan load ya paste karo (Validate pass hona chahiye)."]);
      if (!id) return setMsg(["Pehle upar lesson code bharo."]);
      S.lessonId = id; var lang = S.lang, segs = [];
      p.steps.forEach(function (s, i) { var tx = stepText(p, i, lang); if (tx) segs.push({ index: i, text: tx }); });
      if (!segs.length) return setMsg(["Plan mein is language (" + lang + ") ka bolne wala text nahi hai."]);
      var voiceId = voiceSel.value, speed = parseFloat(speedIn.value) || 1;
      if (!voiceId) return setMsg(["Voice chuno."]);
      var vInfo = S.voices.filter(function (v) { return v.id === voiceId; })[0];
      if (vInfo && voiceFits(vInfo, lang) === false) return setMsg([vInfo.name + " voice is language ke liye nahi hai. Doosri voice chuno."]);
      S.busy = true; setMsg(["Ban rahi hai aur upload ho rahi hai: " + segs.length + " segment. Thoda ruko..."], true); render();
      var chunks = []; for (var i = 0; i < segs.length; i += CHUNK) chunks.push(segs.slice(i, i + CHUNK));
      var results = [];
      chunks.reduce(function (pr, c) {
        return pr.then(function () { return api("POST", "/api/narration/generate", { lessonId: id, language: lang, voiceId: voiceId, speed: speed, force: !!force, segments: c }).then(function (r) { results = results.concat(r.segments || []); }); });
      }, Promise.resolve()).then(function () {
        var old = (S.doc.tracks[lang] || {}).segments || [];
        var out = segs.map(function (s) {
          var r = results.filter(function (x) { return x.index === s.index; })[0] || {}, prev = old.filter(function (x) { return x.index === s.index; })[0] || {}, ok = r.status === "ready";
          return { index: s.index, text: s.text, status: ok ? "ready" : "failed", audioKey: ok ? r.audioKey : undefined, contentHash: ok ? r.contentHash : undefined,
            duration: ok && prev.audioKey === r.audioKey ? prev.duration : undefined, events: prev.events || [], error: ok ? undefined : String(r.error || "fail").slice(0, 200) };
        });
        var allOk = out.every(function (s) { return s.status === "ready"; });
        S.doc.tracks[lang] = { voiceId: voiceId, voiceName: vInfo ? vInfo.name : voiceId, speed: speed, status: allOk ? "ready" : "failed", generatedAt: Date.now(), segments: out };
        Object.keys(audioEls).forEach(function (k) { if (k.indexOf(lang + ":") === 0) delete audioEls[k]; });
        return (allOk ? measure(lang) : Promise.resolve()).then(function () { return save(true); }).then(function (saved) {
          var bad = out.filter(function (s) { return s.status !== "ready"; });
          if (!saved) return;
          setMsg(allOk ? ["Narration ready aur save ho gayi (" + out.length + " segment)."] : ["Kuch segment nahi bane (" + bad.length + "). Pehla error: " + (bad[0].error || "?"), "Lesson ready nahi mana gaya. Dobara Generate karo (jo ban chuke wo dobara nahi lagte)."], allOk);
        });
      }).catch(function (e) { setMsg(["Generate fail: " + (e && e.message ? e.message : e)]); }).then(function () { S.busy = false; render(); });
    }

    /* ---------- preview of the whole lesson, like a student sees it ---------- */
    function previewLesson() {
      var p = plan(); if (!p) return setMsg(["Pehle upar valid plan load karo."]);
      var langs = Object.keys(S.doc.tracks).filter(function (l) { return S.doc.tracks[l].status === "ready"; });
      if (!langs.length) return setMsg(["Pehle narration banao (ready status chahiye)."]);
      var id = S.lessonId || ctx.getCode(), nar = { lang: {}, steps: S.doc.steps };
      setMsg(["Preview taiyar ho raha hai..."], true);
      Promise.all(langs.map(function (l) {
        var segs = (S.doc.tracks[l].segments || []).filter(function (s) { return s.audioKey; });
        return api("POST", "/api/narration/url", { lessonId: id, keys: segs.map(function (s) { return s.audioKey; }).slice(0, 30) }).then(function (r) {
          nar.lang[l] = { voiceName: S.doc.tracks[l].voiceName, segments: segs.map(function (s) { return { index: s.index, key: s.audioKey, url: r.urls[s.audioKey], duration: s.duration, events: s.events || [] }; }) };
        });
      })).then(function () {
        try { localStorage.setItem("mvLang", S.lang); } catch (e) {}
        setMsg([], true);
        ctx.preview(p, { narration: nar, refreshUrl: function (seg) { return api("POST", "/api/narration/url", { lessonId: id, keys: [seg.key] }).then(function (r) { return r.urls[seg.key]; }); } });
      }).catch(function (e) { setMsg(["Preview fail: " + (e && e.message ? e.message : e)]); });
    }

    /* ---------- UI ---------- */
    var langSel, voiceSel, speedIn;
    function num(v) { var n = parseFloat(v); return isFinite(n) ? n : undefined; }

    function sceneUI(p) {
      var d = h("details", { style: "margin:10px 0" }, [h("summary", { text: "Pictures (car, bird, sun, flower) har step ke liye", style: "cursor:pointer;font-size:13px" })]);
      var steps = p ? p.steps.length : 0;
      if (!steps) { d.appendChild(h("div", { text: "Pehle upar plan load karo.", style: "font-size:12px;margin:6px 0" })); return d; }
      for (var i = 0; i < steps; i++) (function (i) {
        var box = h("div", { style: "margin:8px 0;padding:8px;border:1px solid rgba(128,128,128,.35);border-radius:10px" }, [h("div", { text: "Step " + (i + 1), style: "font-size:12px;font-weight:600" })]);
        sceneOf(i).forEach(function (sp, j) {
          var id = h("input", { value: sp.id || "", style: INP + ";width:84px", placeholder: "id" });
          var spr = h("select", { style: INP }); SPRITES.forEach(function (n) { spr.appendChild(h("option", { value: n, text: n })); }); spr.value = sp.sprite || "car";
          var x = h("input", { type: "number", value: sp.x, style: INP + ";width:64px", placeholder: "x" }), y = h("input", { type: "number", value: sp.y, style: INP + ";width:64px", placeholder: "y" });
          var sc = h("input", { type: "number", step: "0.1", value: sp.scale === undefined ? "" : sp.scale, style: INP + ";width:64px", placeholder: "scale" });
          id.onchange = function () { sp.id = id.value.trim(); }; spr.onchange = function () { sp.sprite = spr.value; };
          x.onchange = function () { sp.x = num(x.value); }; y.onchange = function () { sp.y = num(y.value); };
          sc.onchange = function () { var v = num(sc.value); if (v === undefined) delete sp.scale; else sp.scale = v; };
          box.appendChild(h("div", { style: "display:flex;gap:6px;flex-wrap:wrap;margin:5px 0;align-items:center" }, [id, spr, x, y, sc, btn("x", function () { sceneOf(i).splice(j, 1); render(); })]));
        });
        box.appendChild(btn("+ Picture", function () { var sc = sceneOf(i, true); sc.push({ id: "pic" + (sc.length + 1), sprite: "car", x: 40, y: 250 }); render(); }));
        d.appendChild(box);
      })(i);
      return d;
    }

    function audioEl(lang, i) {
      var k = lang + ":" + i; if (audioEls[k]) return audioEls[k];
      var a = h("audio", { controls: true, preload: "none", style: "width:100%;margin:4px 0" }); audioEls[k] = a; return a;
    }
    function eventRow(seg, ev, cueLabels, ids, a) {
      var isCue = typeof ev.cue === "number";
      var target = h("select", { style: INP }), action = h("select", { style: INP });
      cueLabels.forEach(function (lb, c) { target.appendChild(h("option", { value: "cue:" + c, text: lb })); });
      ids.forEach(function (id) { target.appendChild(h("option", { value: "sprite:" + id, text: "Picture: " + id })); });
      (g.NarrationSync ? g.NarrationSync.ACTIONS : []).forEach(function (ac) { action.appendChild(h("option", { value: ac, text: ac })); });
      target.value = isCue ? "cue:" + ev.cue : "sprite:" + ev.target; action.value = ev.action || "appear"; action.disabled = isCue;
      var s = h("input", { type: "number", step: "0.1", min: "0", value: ev.start === undefined ? "" : ev.start, style: INP + ";width:70px", placeholder: "start" });
      var e = h("input", { type: "number", step: "0.1", min: "0", value: ev.end === undefined ? "" : ev.end, style: INP + ";width:70px", placeholder: "end" });
      function readTarget() { var v = target.value.split(":"); if (v[0] === "cue") { ev.cue = parseInt(v[1], 10); delete ev.target; delete ev.action; action.disabled = true; } else { ev.target = v.slice(1).join(":"); ev.action = action.value; delete ev.cue; action.disabled = false; } }
      target.onchange = readTarget; action.onchange = function () { if (ev.target !== undefined) ev.action = action.value; };
      s.onchange = function () { var v = num(s.value); if (v === undefined) delete ev.start; else ev.start = v; };
      e.onchange = function () { var v = num(e.value); if (v === undefined) delete ev.end; else ev.end = v; };
      var nowS = btn("now", function () { s.value = r2(a.currentTime || 0); s.onchange(); }), nowE = btn("now", function () { e.value = r2(a.currentTime || 0); e.onchange(); });
      return h("div", { style: "display:flex;gap:5px;flex-wrap:wrap;align-items:center;margin:4px 0" },
        [target, action, h("span", { text: "start", style: "font-size:11px" }), s, nowS, h("span", { text: "end", style: "font-size:11px" }), e, nowE,
          btn("x", function () { seg.events.splice(seg.events.indexOf(ev), 1); render(); })]);
    }
    function segUI(p, seg) {
      var t = track(), stale = p && stepText(p, seg.index, S.lang) !== seg.text;
      var cues = p && p.steps[seg.index] && p.steps[seg.index].anim && p.steps[seg.index].anim.cues ? p.steps[seg.index].anim.cues : [];
      var cueLabels = cues.map(function (c, i) { return "Cue " + (i + 1) + " (" + Object.keys(c)[0] + ")"; });
      var ids = sceneOf(seg.index).map(function (x) { return x.id; }).filter(Boolean);
      var a = audioEl(S.lang, seg.index);
      var status = seg.status === "ready" ? "ready" + (seg.duration ? ", " + seg.duration + "s" : "") : "FAILED: " + (seg.error || "?");
      var box = h("div", { style: "margin:10px 0;padding:10px;border:1px solid rgba(128,128,128,.35);border-radius:10px" }, [
        h("div", { text: "Step " + (seg.index + 1) + " - " + status + (stale ? "  (plan ka text badal gaya, dobara Generate karo)" : ""), style: "font-size:13px;font-weight:600;color:" + (seg.status !== "ready" || stale ? "#d74747" : "inherit") }),
        h("div", { text: String(seg.text || "").slice(0, 140), style: "font-size:12px;margin:4px 0;opacity:.8" })]);
      if (seg.audioKey) {
        box.appendChild(btn("Audio load karo", function () {
          api("POST", "/api/narration/url", { lessonId: S.lessonId || ctx.getCode(), keys: [seg.audioKey] }).then(function (r) { a.src = r.urls[seg.audioKey]; a.load(); a.onloadedmetadata = function () { if (isFinite(a.duration)) seg.duration = r2(a.duration); }; },
            function (e) { setMsg(["Audio link nahi bana: " + e.message]); });
        }));
        box.appendChild(a);
        (seg.events = seg.events || []).forEach(function (ev) { box.appendChild(eventRow(seg, ev, cueLabels, ids, a)); });
        var row = h("div", { style: "display:flex;gap:6px;flex-wrap:wrap;margin-top:6px" });
        if (cueLabels.length) row.appendChild(btn("+ Cue ka time", function () { var used = seg.events.filter(function (e) { return typeof e.cue === "number"; }).map(function (e) { return e.cue; }); var c = 0; while (used.indexOf(c) >= 0) c++; if (c < cueLabels.length) { seg.events.push({ start: r2(a.currentTime || 0), cue: c }); render(); } }));
        if (ids.length) row.appendChild(btn("+ Picture ka time", function () { seg.events.push({ start: r2(a.currentTime || 0), target: ids[0], action: "appear" }); render(); }));
        box.appendChild(row);
      }
      return box;
    }

    function render() {
      var p = plan(), t = track();
      root.textContent = "";
      root.appendChild(h("h3", { text: "AI narration (Sonex)" }));
      root.appendChild(h("div", { text: "Upar pehle plan load ya paste karo aur code bharo. Narration admin banata hai, students ke play dabane par kuch generate nahi hota.", style: "font-size:12px;margin-bottom:8px" }));
      langSel = h("select", { style: INP + ";width:100%" }); LANGS.forEach(function (o) { langSel.appendChild(h("option", { value: o[0], text: o[1] })); }); langSel.value = S.lang;
      langSel.onchange = function () { S.lang = langSel.value; render(); };
      voiceSel = h("select", { style: INP + ";width:100%" });
      var shown = S.voices.filter(function (v) { return voiceFits(v, S.lang) !== false; });
      shown.forEach(function (v) { voiceSel.appendChild(h("option", { value: v.id, text: v.name + (v.gender ? " (" + v.gender + ")" : "") + (voiceFits(v, S.lang) === null ? " - language Sonex ne nahi batayi" : "") })); });
      var has = function (id) { return !!id && shown.some(function (v) { return v.id === id; }); };
      S.pick = S.pick || {};
      voiceSel.value = (has(S.pick[S.lang]) ? S.pick[S.lang] : has(t && t.voiceId) ? t.voiceId : has(S.defaultVoice) ? S.defaultVoice : (shown[0] && shown[0].id)) || "";
      voiceSel.onchange = function () { S.pick[S.lang] = voiceSel.value; };         // the choice survives re-draws
      speedIn = h("input", { type: "number", step: "0.05", min: "0.75", max: "1.5", value: S.speedVal || (t && t.speed ? t.speed : 1), style: INP + ";width:100%" });
      speedIn.onchange = function () { S.speedVal = parseFloat(speedIn.value) || undefined; };
      root.appendChild(h("div", { style: "display:grid;grid-template-columns:1fr 1fr 90px;gap:8px;margin:6px 0" }, [
        h("label", { style: "font-size:12px" }, [document.createTextNode("Language"), langSel]),
        h("label", { style: "font-size:12px" }, [document.createTextNode("Voice"), voiceSel]),
        h("label", { style: "font-size:12px" }, [document.createTextNode("Speed"), speedIn])]));
      if (!shown.length) root.appendChild(h("div", { text: S.voices.length ? "Is language ke liye koi voice nahi mili. Doosri language chuno." : "Voices abhi load nahi hui (Render par SONEX_API_KEY check karo).", style: "font-size:12px;color:#d74747" }));
      var statusTxt = !t ? "Is language ki narration nahi bani" : t.status === "ready" ? "Status: ready (" + (t.voiceName || t.voiceId) + ")" : "Status: failed - dobara Generate karo";
      if (S.busy) statusTxt = "Status: generating / uploading...";
      root.appendChild(h("div", { text: statusTxt, style: "font-size:13px;font-weight:600;margin:6px 0;color:" + (t && t.status === "ready" && !S.busy ? "#168653" : "inherit") }));
      var b1 = btn("Generate narration", function () { generate(false); }), b2 = btn("Regenerate", function () { if (confirm("Naya take banana hai? Ye Sonex ka credit use karega.")) generate(true); });
      b1.disabled = b2.disabled = S.busy;
      root.appendChild(h("div", { style: "display:flex;gap:8px;flex-wrap:wrap" }, [b1, b2, btn("Saved load karo", loadSaved)]));
      root.appendChild(sceneUI(p));
      if (t) (t.segments || []).forEach(function (seg) { root.appendChild(segUI(p, seg)); });
      root.appendChild(h("div", { style: "display:flex;gap:8px;flex-wrap:wrap;margin-top:10px" }, [btn("Save timing + pictures", function () { save(false); }), btn("Preview synced lesson", previewLesson)]));
      msgBox = h("div", { text: S.msg.join("\n"), style: "white-space:pre-wrap;font-size:13px;margin:8px 0;min-height:20px;color:" + (S.msgOk ? "#168653" : "#d74747") });
      root.appendChild(msgBox);
    }

    render(); loadVoices();
    return { reload: loadSaved, _state: S, _generate: generate, _save: save, _preview: previewLesson, _render: render };
  }

  var api2 = { mount: mount };
  if (typeof module !== "undefined" && module.exports) module.exports = api2; else g.NarrationAdmin = api2;
})(typeof window !== "undefined" ? window : globalThis);
