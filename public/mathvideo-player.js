/* mathvideo-player.js
 * 1) MathVideoPlayer.open(plan): SVG whiteboard + browser text-to-speech (Hindi voice dropdown).
 * 2) Student side: chapter khulte hi us chapter ke video plans ek query se aate hain, jis question ka video hai uske neeche "Video" button.
 * Plan ka text sirf textContent / SVG textContent se render hota hai, innerHTML me kabhi nahi jata.
 */
(function (g) {
  "use strict";
  var NS = "http://www.w3.org/2000/svg";
  var LANG_KEY = "mvLang", VOICE_KEY = "mvVoice";

  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) {} return null; }
  function el(tag, props, kids) {
    var e = document.createElement(tag);
    for (var k in (props || {})) { if (k === "text") e.textContent = props[k]; else if (k === "style") e.style.cssText = props[k]; else e[k] = props[k]; }
    (kids || []).forEach(function (c) { e.appendChild(c); });
    return e;
  }
  function svg(tag, attrs, text) {
    var e = document.createElementNS(NS, tag);
    for (var k in (attrs || {})) e.setAttribute(k, attrs[k]);
    if (text !== undefined) e.textContent = text;
    return e;
  }

  /* ---------- voices ---------- */
  function hiVoices() {
    if (!g.speechSynthesis) return [];
    return g.speechSynthesis.getVoices().filter(function (v) { return /^hi([-_]|$)/i.test(v.lang); });
  }
  function enVoices() {
    if (!g.speechSynthesis) return [];
    return g.speechSynthesis.getVoices().filter(function (v) { return /^en([-_]|$)/i.test(v.lang); });
  }
  function voicesReady(cb) {
    if (!g.speechSynthesis) return cb();
    if (g.speechSynthesis.getVoices().length) return cb();
    var done = false;
    function fin() { if (done) return; done = true; g.speechSynthesis.removeEventListener("voiceschanged", fin); cb(); }
    g.speechSynthesis.addEventListener("voiceschanged", fin);
    setTimeout(fin, 1500);
  }

  /* ---------- player ---------- */
  var cur = null;
  function close() {
    if (!cur) return;
    cur.stop(); if (cur.root.parentNode) cur.root.parentNode.removeChild(cur.root);
    document.removeEventListener("keydown", cur.key); cur = null;
  }

  function open(plan) {
    close();
    if (!plan || !plan.steps || !plan.steps.length) return;
    var st = { i: 0, playing: false, token: 0, timer: 0 };
    var lang = ls(LANG_KEY) || "hg";
    if (["hg", "en", "hi"].indexOf(lang) < 0) lang = "hg";

    var root = el("div", { style: "position:fixed;inset:0;z-index:2000;background:var(--bg,#fff);color:var(--tx,#111);overflow:auto;padding:12px 14px 40px" });
    root.setAttribute("role", "dialog"); root.setAttribute("aria-modal", "true");
    var inner = el("div", { style: "max-width:680px;margin:0 auto" });
    var title = el("h2", { style: "font-size:18px;margin:6px 0", text: (plan.title && (plan.title[lang] || plan.title.en)) || "" });
    var closeBtn = el("button", { type: "button", text: "Close", style: "padding:8px 14px;border:0;border-radius:10px;background:var(--card,#eee);color:inherit;cursor:pointer" });
    var top = el("div", { style: "display:flex;justify-content:space-between;align-items:center;gap:8px" }, [title, closeBtn]);

    var board = svg("svg", { viewBox: "0 0 600 420", role: "img", "aria-label": "Whiteboard", style: "width:100%;height:auto;display:block;border:1px solid var(--ln,#999);border-radius:14px;background:var(--card,#fafafa)" });
    var cap = el("div", { style: "min-height:48px;margin:10px 0;font-size:17px;line-height:1.4" });
    var msg = el("div", { style: "font-size:13px;margin:6px 0;color:#c0392b;white-space:pre-wrap" });
    var prog = el("div", { style: "font-size:12px;color:var(--mut,#666)" });

    function btn(t, fn) { var b = el("button", { type: "button", text: t, style: "padding:10px 14px;border:0;border-radius:10px;background:var(--card,#eee);color:inherit;cursor:pointer" }); b.onclick = fn; return b; }
    var bPrev = btn("Prev", function () { go(st.i - 1, st.playing); });
    var bPlay = btn("Play", function () { st.playing ? pause() : play(); });
    var bNext = btn("Next", function () { go(st.i + 1, st.playing); });
    var bar = el("div", { style: "display:flex;gap:8px;flex-wrap:wrap;margin:8px 0" }, [bPrev, bPlay, bNext]);

    function sel(label, onchange) {
      var s = el("select", { style: "padding:8px;border-radius:10px;border:1px solid var(--ln,#999);background:var(--card,#fff);color:inherit;max-width:100%" });
      s.onchange = onchange;
      return { wrap: el("label", { style: "font-size:12px;display:block" }, [document.createTextNode(label), el("br"), s]), s: s };
    }
    var langSel = sel("Language", function () { lang = langSel.s.value; ls(LANG_KEY, lang); title.textContent = (plan.title && (plan.title[lang] || plan.title.en)) || ""; show(st.i); if (st.playing) { stopSpeech(); speak(); } });
    [["hg", "Hinglish"], ["en", "English"], ["hi", "Hindi"]].forEach(function (o) { langSel.s.appendChild(el("option", { value: o[0], text: o[1] })); });
    langSel.s.value = lang;
    var voiceSel = sel("Hindi voice", function () { ls(VOICE_KEY, voiceSel.s.value); if (st.playing) { stopSpeech(); speak(); } });
    var opts = el("div", { style: "display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end;margin:6px 0" }, [langSel.wrap, voiceSel.wrap]);

    [top, board, cap, bar, opts, msg, prog].forEach(function (n) { inner.appendChild(n); });
    root.appendChild(inner); document.body.appendChild(root);

    function fillVoices() {
      var hv = hiVoices(); voiceSel.s.textContent = "";
      if (!g.speechSynthesis) { voiceSel.wrap.style.display = "none"; msg.textContent = "Is browser me awaaz (text-to-speech) support nahi hai. Video bina awaaz ke chalega."; return; }
      if (!hv.length) {
        voiceSel.wrap.style.display = "none";
        msg.textContent = "Is device me Hindi (hi-IN) voice install nahi hai, isliye awaaz English accent me aayegi.\nWindows: Settings > Time & language > Speech > Add voices > Hindi. Phir browser band karke dobara kholo.";
        return;
      }
      voiceSel.wrap.style.display = ""; msg.textContent = "";
      var want = ls(VOICE_KEY);
      hv.forEach(function (v) { voiceSel.s.appendChild(el("option", { value: v.name, text: v.name + " (" + v.lang + ")" })); });
      if (want && hv.some(function (v) { return v.name === want; })) voiceSel.s.value = want;
    }
    voicesReady(fillVoices);
    // Chrome voices der se / kai baar load karta hai: list dobara bharte rahenge (voiceschanged + 2s, 5s par)
    var vch = function () { fillVoices(); };
    if (g.speechSynthesis) g.speechSynthesis.addEventListener("voiceschanged", vch);
    var vt1 = setTimeout(fillVoices, 2000), vt2 = setTimeout(fillVoices, 5000);

    /* ---------- number line + pen/arrow cues ----------
       anim.numberline = { min, max, dots:[{v, label?, color?}] }   (static, hamesha dikhta hai)
       anim.cues = [ {point:{line, word}} | {point:{value}} | {hop:{from,to}} | {dot:{v, label?, color?}} ]
       Cues step ki awaaz ke dauran barabar gap se chalte hain (pen word/number par jaata hai). */
    var NLY = 310, textEls = [], ctimers = [], NL = null, statG = null, dynG = null, pen = null, penShape = null, penPlaced = false, mark = null, curStep = null;
    function clearCues() { ctimers.forEach(clearTimeout); ctimers = []; }
    function colorOf(c) { return { red: "#d74747", green: "#168653", blue: "#2f6fdb", orange: "#e08a00" }[c] || "#2f6fdb"; }
    function nx(v) { return 50 + (v - NL.min) / (NL.max - NL.min) * 500; }
    function drawNL(nl) {
      var gr = svg("g", { style: "color:var(--tx,#111)" });
      gr.appendChild(svg("line", { x1: 24, y1: NLY, x2: 576, y2: NLY, stroke: "currentColor", "stroke-width": 3 }));
      gr.appendChild(svg("polygon", { points: "576," + NLY + " 566," + (NLY - 6) + " 566," + (NLY + 6), fill: "currentColor" }));
      gr.appendChild(svg("polygon", { points: "24," + NLY + " 34," + (NLY - 6) + " 34," + (NLY + 6), fill: "currentColor" }));
      for (var v = nl.min; v <= nl.max; v++) {
        var x = nx(v);
        gr.appendChild(svg("line", { x1: x, y1: NLY - 8, x2: x, y2: NLY + 8, stroke: "currentColor", "stroke-width": v === 0 ? 3 : 2 }));
        gr.appendChild(svg("text", { x: x, y: NLY + 34, "text-anchor": "middle", "font-size": 18, "font-family": "system-ui,Segoe UI,sans-serif", fill: "currentColor", style: v === 0 ? "font-weight:700" : "" }, String(v)));
      }
      return gr;
    }
    function addDot(d, fade) {
      if (!NL || typeof d.v !== "number") return;
      var c = svg("circle", { cx: nx(d.v), cy: NLY, r: 8, fill: colorOf(d.color), stroke: "#fff", "stroke-width": 1.5 });
      if (fade) { c.style.opacity = "0"; c.style.transition = "opacity .4s"; }
      dynG.appendChild(c);
      if (d.label) dynG.appendChild(svg("text", { x: nx(d.v), y: NLY - 18, "text-anchor": "middle", "font-size": 18, "font-weight": "700", fill: colorOf(d.color), "font-family": "system-ui,sans-serif" }, d.label));
      if (fade) setTimeout(function () { c.style.opacity = "1"; }, 20);
    }
    function resetDyn() {
      while (dynG && dynG.firstChild) dynG.removeChild(dynG.firstChild);
      mark = null; penPlaced = false; if (pen) pen.style.opacity = "0";
      if (NL && curStep && curStep.anim.numberline.dots) curStep.anim.numberline.dots.forEach(function (d) { addDot(d, false); });
    }
    function movePen(x, y, flip) {
      penShape.setAttribute("transform", flip ? "scale(1,-1)" : "");
      if (!penPlaced) { pen.style.transition = "none"; pen.style.transform = "translate(" + x + "px," + y + "px)"; void pen.getBoundingClientRect(); pen.style.transition = "transform .7s ease, opacity .3s"; penPlaced = true; }
      else pen.style.transform = "translate(" + x + "px," + y + "px)";
      pen.style.opacity = "1";
    }
    function wordBox(j, word) {
      var line = (curStep.anim.lines || [])[j]; if (line === undefined) return null;
      var idx = word ? line.indexOf(word) : 0, len = word ? word.length : line.length; if (idx < 0) return null;
      var lh = layout.lh, fs = layout.fs, y = 56 + j * lh, x0, x1, el = textEls[j];
      try { x0 = el.getStartPositionOfChar(idx).x; x1 = el.getEndPositionOfChar(idx + len - 1).x; } catch (e) { x0 = NaN; }
      if (!isFinite(x0) || !isFinite(x1) || x1 <= x0) { x0 = 36 + idx * fs * 0.55; x1 = x0 + len * fs * 0.55; }
      return { x0: x0, x1: x1, y: y };
    }
    function pointAt(p) {
      if (mark && mark.parentNode) mark.parentNode.removeChild(mark); mark = null;
      if (p.value !== undefined) {
        if (!NL) return;
        var x = nx(p.value);
        mark = svg("circle", { cx: x, cy: NLY, r: 14, fill: "none", stroke: "#d74747", "stroke-width": 3 }); dynG.appendChild(mark);
        movePen(x, NLY - 16, true);
      } else {
        var w = wordBox(p.line, p.word); if (!w) return;
        mark = svg("rect", { x: w.x0 - 3, y: w.y + 6, width: 0, height: 4, rx: 2, fill: "#d74747" }); mark.style.transition = "width .5s ease";
        dynG.appendChild(mark); setTimeout(function () { mark.setAttribute("width", Math.max(8, w.x1 - w.x0 + 6)); }, 30);
        movePen((w.x0 + w.x1) / 2, w.y + 10, false);
      }
    }
    function hop(h) {
      if (!NL) return;
      var x1 = nx(h.from), x2 = nx(h.to), ya = NLY - 14, cy = ya - Math.max(40, Math.abs(x2 - x1) * 0.35);
      var path = svg("path", { d: "M" + x1 + " " + ya + " Q" + ((x1 + x2) / 2) + " " + cy + " " + x2 + " " + ya, fill: "none", stroke: "#d74747", "stroke-width": 3, "stroke-linecap": "round" });
      dynG.appendChild(path);
      var L = 0; try { L = path.getTotalLength(); } catch (e) {}
      if (L) { path.style.strokeDasharray = L; path.style.strokeDashoffset = L; void path.getBoundingClientRect(); path.style.transition = "stroke-dashoffset .9s ease"; path.style.strokeDashoffset = "0"; }
      setTimeout(function () { dynG.appendChild(svg("polygon", { points: x2 + "," + (ya + 2) + " " + (x2 - 6) + "," + (ya - 11) + " " + (x2 + 6) + "," + (ya - 11), fill: "#d74747" })); }, 850);
      movePen(x2, NLY - 16, true);
    }
    function doCue(c) {
      try { if (c.dot) addDot(c.dot, true); else if (c.hop) hop(c.hop); else if (c.point) pointAt(c.point); } catch (e) {}
    }
    function runCues(totalMs) {
      clearCues(); resetDyn();
      var cues = (curStep && curStep.anim.cues) || []; if (!cues.length) return;
      var gap = Math.max(1000, (totalMs - 500) / cues.length);
      cues.forEach(function (c, k) { ctimers.push(setTimeout(function () { doCue(c); }, 500 + k * gap)); });
    }

    function show(i) {
      st.i = i; var s = plan.steps[i]; curStep = s; clearCues();
      while (board.firstChild) board.removeChild(board.firstChild);
      var lines = (s.anim && s.anim.lines) || [], hl = (s.anim && s.anim.highlight) || [];
      NL = (s.anim && s.anim.numberline) || null;
      var lh = Math.min(52, Math.floor((NL ? 190 : 330) / Math.max(lines.length, 1)));
      var fs = Math.max(18, Math.min(30, lh - 12));
      layout = { lh: lh, fs: fs }; textEls = [];
      lines.forEach(function (ln, j) {
        var y = 56 + j * lh;
        if (hl.indexOf(j) >= 0) board.appendChild(svg("rect", { x: 20, y: y - fs, width: 560, height: fs + 12, rx: 8, fill: "#f5c542", opacity: "0.35" }));
        var t = svg("text", { x: 36, y: y, "font-size": fs, "font-family": "system-ui,Segoe UI,sans-serif", fill: "currentColor", opacity: "0", style: "color:var(--tx,#111);transition:opacity .5s" }, ln);
        board.appendChild(t); textEls.push(t);
        setTimeout(function () { t.setAttribute("opacity", "1"); }, 250 + j * 450);
      });
      if (s.anim && s.anim.note) board.appendChild(svg("text", { x: 36, y: 400, "font-size": 20, fill: "#168653", "font-family": "system-ui,sans-serif", style: "font-weight:600" }, s.anim.note));
      if (NL) board.appendChild(drawNL(NL));
      dynG = svg("g", {}); board.appendChild(dynG);
      pen = svg("g", { style: "opacity:0;pointer-events:none;transition:transform .7s ease,opacity .3s" });
      penShape = svg("g", {});
      penShape.appendChild(svg("polygon", { points: "0,0 9,3 44,38 38,44 3,9", fill: "#f5a623", stroke: "#8a5a00", "stroke-width": 1.5, "stroke-linejoin": "round" }));
      penShape.appendChild(svg("polygon", { points: "0,0 9,3 3,9", fill: "#333" }));
      pen.appendChild(penShape); board.appendChild(pen);
      cap.textContent = (s.cap && (s.cap[lang] || s.cap.en)) || "";
      prog.textContent = "Step " + (i + 1) + " / " + plan.steps.length;
      bPrev.disabled = i === 0; bNext.disabled = i === plan.steps.length - 1;
      bPlay.textContent = st.playing ? "Pause" : "Play";
      runCues(((s.anim && s.anim.cues) || []).length * 1800 + 500);
    }

    function stopSpeech() { st.token++; clearTimeout(st.timer); clearCues(); if (g.speechSynthesis) g.speechSynthesis.cancel(); }
    function advance(tok) {
      if (tok !== st.token || !st.playing) return;
      st.timer = setTimeout(function () {
        if (tok !== st.token || !st.playing) return;
        if (st.i < plan.steps.length - 1) { show(st.i + 1); speak(); } else { st.playing = false; bPlay.textContent = "Play"; }
      }, 700);
    }
    function speak() {
      var tok = ++st.token, s = plan.steps[st.i];
      var useHi = lang !== "en", text = useHi ? (s.say && s.say.hi) : (s.say && s.say.en);
      var hv = hiVoices(), hasHi = hv.length > 0;
      if (useHi && !hasHi) text = (s.say && s.say.en) || text;   // Hindi voice nahi: English line, English accent
      runCues(Math.max(3000, (text || "").length * 72));       // pen/arrow cues awaaz ki length me failte hain
      if (!g.speechSynthesis || !text) { st.timer = setTimeout(function () { advance(tok); }, 3500); return; }
      g.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text);
      if (useHi && hasHi) {
        u.lang = "hi-IN"; var name = voiceSel.s.value;
        u.voice = hv.filter(function (v) { return v.name === name; })[0] || hv[0];
      } else {
        u.lang = "en-IN"; var ev = enVoices().filter(function (v) { return /en-IN/i.test(v.lang); })[0] || enVoices()[0];
        if (ev) u.voice = ev;
      }
      u.rate = 0.95; u.onend = function () { advance(tok); }; u.onerror = function () { advance(tok); };
      g.speechSynthesis.speak(u);
    }
    function play() { st.playing = true; bPlay.textContent = "Pause"; speak(); }
    function pause() { st.playing = false; stopSpeech(); bPlay.textContent = "Play"; }
    function go(i, resume) {
      if (i < 0 || i >= plan.steps.length) return;
      stopSpeech(); show(i); if (resume) { st.playing = true; speak(); }
    }
    function key(e) { if (e.key === "Escape") close(); }
    closeBtn.onclick = close; document.addEventListener("keydown", key);
    cur = { root: root, key: key, stop: function () { st.playing = false; stopSpeech(); clearCues(); clearTimeout(vt1); clearTimeout(vt2); if (g.speechSynthesis) g.speechSynthesis.removeEventListener("voiceschanged", vch); } };
    show(0);
  }

  g.MathVideoPlayer = { open: open, close: close, debug: function () { var cc = null, ctx = null; try { cc = curCh(); var q0 = null; (cc.ch.sections || []).some(function (s) { return (s.questions || []).some(function (q) { q0 = q; return true; }); }); ctx = q0 && mvCtx(q0); } catch (e) {} return { loaded: Object.keys(LOADED), videos: Object.keys(MV), retry: RETRY, lastError: LASTERR, prefix: ctx && ctx.prefix, base: ctx && window.MathVideo.makeCode(ctx.f) }; } };

  /* ---------- student side ---------- */
  var SCHOOL = { nashib: "nashibali" };            // app org id -> code me school
  var MV = {};                                      // code -> plan
  var LOADED = {};                                  // prefix -> true
  var LASTERR = "";                                // debug: aakhri load error
  var RETRY = 0;                                    // fail hone par auto-retry ginti
  function mvCtx(q) {
    try {
      var x = IDX[q.id]; if (!x || !x.course || !x.ch) return null;      // IDX / NAV: index.html ke globals
      var c = x.course, ch = x.ch;
      if (c.subject !== "Mathematics" || !window.MathVideo || !NAV || !NAV.org) return null;
      var si = (ch.sections || []).findIndex(function (s) { return s.questions.indexOf(x.q) >= 0; });
      if (si < 0) return null;
      var f = {
        school: SCHOOL[NAV.org] || NAV.org, cls: "class" + c["class"], medium: String(c.medium || "English").toLowerCase() + "medium",
        subject: "math", ex: ch.no + "." + (si + 1), q: String(q.no)
      };
      return { f: f, prefix: [f.school, f.cls, f.medium, f.subject].join("-").toLowerCase() + "-EX:" + ch.no + "." };
    } catch (e) { return null; }
  }
  function codesFor(q) {
    var c = mvCtx(q); if (!c) return [];
    var base = window.MathVideo.makeCode(c.f), out = [];
    for (var k in MV) if (k === base || k.indexOf(base + "-") === 0) out.push(k);
    return out.sort();
  }
  function itemsHTML(q) {
    var codes = codesFor(q); if (!codes.length) return "";
    var base = window.MathVideo.makeCode(mvCtx(q).f);
    var esc2 = function (s) { return String(s).replace(/[&<>"']/g, function (ch) { return { "&": "&amp;", "<": "&lt;", '"': "&quot;", "'": "&#39;", ">": "&gt;" }[ch]; }); };
    return codes.map(function (c) {
      var part = c === base ? "" : c.slice(base.length + 1);
      return '<button class="qmi" role="menuitem" data-act="mv" data-code="' + esc2(c) + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg><span>Video' + (part ? " (" + esc2(part) + ")" : "") + "</span></button>";
    }).join("");
  }
  function load() {
    try {
      if (typeof NAV === "undefined" || NAV.page !== "chapter" || !window.CLOUD || !window.CLOUD.mathVideo || !window.CLOUD.mathVideo.byPrefix) return;
      var cc = curCh(); if (!cc || cc.c.subject !== "Mathematics") return;
      var q0 = null; (cc.ch.sections || []).some(function (s) { return (s.questions || []).some(function (q) { q0 = q; return true; }); });
      var ctx = q0 && mvCtx(q0); if (!ctx || LOADED[ctx.prefix]) return;
      LOADED[ctx.prefix] = true;
      var settled = false;
      function fail(why) {                               // signed-in na ho / offline / atak gaya: thodi der baad apne aap dobara try
        if (settled) return; settled = true; LASTERR = String(why || "fail");
        delete LOADED[ctx.prefix];
        if (RETRY < 5) { RETRY++; setTimeout(load, 3000 * RETRY); }
      }
      var guard = setTimeout(function () { fail("timeout"); }, 8000);   // query pending reh jaye to bhi retry
      window.CLOUD.mathVideo.byPrefix(ctx.prefix).then(function (map) {
        if (settled) return; settled = true; clearTimeout(guard); RETRY = 0; LASTERR = "";
        var n = 0; for (var k in map) { MV[k] = map[k]; n++; }
        if (n) draw();
      }, function (e) { clearTimeout(guard); fail(e && (e.code || e.message)); });
    } catch (e) {}
  }

  if (typeof draw === "function" && typeof qHTML === "function") {
    var _draw = window.draw, _q = window.qHTML;
    window.draw = function () { var r = _draw.apply(this, arguments); load(); return r; };
    window.qHTML = function (q) {
      var h = _q.apply(this, arguments);
      try {                                            // videos 3-dot menu me: menu khula ho tabhi items judte hain
        var m = h.indexOf('class="qmenu"');
        if (m >= 0) { var e = h.indexOf("</div>", m), it = itemsHTML(q); if (e > m && it) h = h.slice(0, e) + it + h.slice(e); }
      } catch (e) {}
      return h;
    };
    window.addEventListener("online", function () { RETRY = 0; load(); });
    document.addEventListener("click", function (e) {
      var b = e.target.closest && e.target.closest('[data-act="mv"]'); if (!b) return;
      var p = MV[b.dataset.code]; if (!p) return;
      try { var card = b.closest("[data-qid]"); if (card && typeof ui === "function") { ui(card.dataset.qid).qm = false; draw(); } } catch (x) {}
      open(p);
    });
  }
})(typeof window !== "undefined" ? window : globalThis);
