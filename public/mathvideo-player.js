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

    function show(i) {
      st.i = i; var s = plan.steps[i];
      while (board.firstChild) board.removeChild(board.firstChild);
      var lines = (s.anim && s.anim.lines) || [], hl = (s.anim && s.anim.highlight) || [];
      var lh = Math.min(52, Math.floor(330 / Math.max(lines.length, 1)));
      var fs = Math.max(18, Math.min(30, lh - 12));
      lines.forEach(function (ln, j) {
        var y = 56 + j * lh;
        if (hl.indexOf(j) >= 0) board.appendChild(svg("rect", { x: 20, y: y - fs, width: 560, height: fs + 12, rx: 8, fill: "#f5c542", opacity: "0.35" }));
        var t = svg("text", { x: 36, y: y, "font-size": fs, "font-family": "system-ui,Segoe UI,sans-serif", fill: "currentColor", opacity: "0", style: "color:var(--tx,#111);transition:opacity .5s" }, ln);
        board.appendChild(t);
        setTimeout(function () { t.setAttribute("opacity", "1"); }, 250 + j * 450);
      });
      if (s.anim && s.anim.note) board.appendChild(svg("text", { x: 36, y: 400, "font-size": 20, fill: "#168653", "font-family": "system-ui,sans-serif", style: "font-weight:600" }, s.anim.note));
      cap.textContent = (s.cap && (s.cap[lang] || s.cap.en)) || "";
      prog.textContent = "Step " + (i + 1) + " / " + plan.steps.length;
      bPrev.disabled = i === 0; bNext.disabled = i === plan.steps.length - 1;
      bPlay.textContent = st.playing ? "Pause" : "Play";
    }

    function stopSpeech() { st.token++; clearTimeout(st.timer); if (g.speechSynthesis) g.speechSynthesis.cancel(); }
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
    cur = { root: root, key: key, stop: function () { st.playing = false; stopSpeech(); clearTimeout(vt1); clearTimeout(vt2); if (g.speechSynthesis) g.speechSynthesis.removeEventListener("voiceschanged", vch); } };
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
