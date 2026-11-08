/* mathvideo-player.js
 * 1) MathVideoPlayer.open(plan): SVG whiteboard + browser text-to-speech (Hindi voice dropdown).
 * 2) Student side: chapter khulte hi us chapter ke video plans ek query se aate hain, jis question ka video hai uske neeche "Video" button.
 * Plan ka text sirf textContent / SVG textContent se render hota hai, innerHTML me kabhi nahi jata.
 */
(function (g) {
  "use strict";
  var NS = "http://www.w3.org/2000/svg";
  var LANG_KEY = "mvLang", VOICE_KEY = "mvVoice", EN_KEY = "mvVoiceEn";
  var LANGS = [["hg", "Hinglish"], ["en", "English"], ["hi", "Hindi"], ["as", "অসমীয়া (Assamese)"], ["bn", "বাংলা (Bengali)"]];
  var LANG_NAME = { hi: "Hindi", as: "Assamese", bn: "Bengali" };
  function voiceKey(code) { return code === "hi" ? VOICE_KEY : VOICE_KEY + "_" + code; }   // "mvVoice" (Hindi) purani key jaisi hi rahi

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
  function voicesWith(code) {
    if (!g.speechSynthesis) return [];
    var re = new RegExp("^" + code + "([-_]|$)", "i");
    return g.speechSynthesis.getVoices().filter(function (v) { return re.test(v.lang); });
  }
  function hiVoices() { return voicesWith("hi"); }
  function enVoices() { return voicesWith("en"); }
  // Voices that will really be used for a language. Assamese uses a Bengali voice if no Assamese voice is installed (almost the same script).
  function pickList(code) { var l = voicesWith(code); if (!l.length && code === "as") l = voicesWith("bn"); return l; }

  // Caption / title text for a language (falls back to English when the plan has no text for it)
  function tx(o, lang) { return (o && (o[lang] || o.en || o.hg)) || ""; }


  /* ---------- "English words" slider: kitne maths words English me, kitne apni language me ----------
     Level 0 Bilkul kam : numbers, plus/minus/into/equal to aur teaching words (answer, jump...) apni language me
     Level 1 Kam        : plus / minus / into / equal to English me, baaki apni language me
     Level 2 Normal     : + numbers bhi English me (default)
     Level 3 Zyada      : + teaching words (number line, jump, step, answer, question, positive, negative, right, left, sign) bhi English me
     Ye shabd-list (GLOSSARY) seedhi edit ki ja sakti hai: ek line = ek shabd. Isse ek shabd ki saari spellings (English, transliteration, apni language)
     ek hi shabd maani jaati hain, aur level ke hisaab se wahi form dikhti / bolti hai. Jo shabd list me nahi hai wo jaisa hai waisa rehta hai. */
  var ENG_NAMES = ["Bilkul kam", "Kam", "Normal", "Zyada"], ENG_DEFAULT = 2;
  // N = numbers: [english, hindi, assamese, bengali, [hindi spellings in Devanagari]]
  var G_NUM = [
    ["zero", "शून्य", "শূন্য", "শূন্য", ["ज़ीरो", "जीरो"]], ["one", "एक", "এক", "এক", ["वन"]], ["two", "दो", "দুই", "দুই", ["टू"]],
    ["three", "तीन", "তিনি", "তিন", ["थ्री"]], ["four", "चार", "চাৰি", "চার", ["फोर"]], ["five", "पाँच", "পাঁচ", "পাঁচ", ["फाइव", "पांच"]],
    ["six", "छह", "ছয়", "ছয়", ["सिक्स"]], ["seven", "सात", "সাত", "সাত", ["सेवन"]], ["eight", "आठ", "আঠ", "আট", ["एट"]],
    ["nine", "नौ", "ন", "নয়", ["नाइन"]], ["ten", "दस", "দহ", "দশ", ["टेन"]], ["eleven", "ग्यारह", "এঘাৰ", "এগারো", ["इलेवन"]],
    ["twelve", "बारह", "বাৰ", "বারো", ["ट्वेल्व"]], ["thirteen", "तेरह", "তেৰ", "তেরো", ["थर्टीन"]], ["fourteen", "चौदह", "চৌদ্দ", "চৌদ্দ", ["फोर्टीन"]],
    ["fifteen", "पंद्रह", "পোন্ধৰ", "পনেরো", ["फिफ्टीन", "पन्द्रह"]], ["sixteen", "सोलह", "ষোল", "ষোলো", ["सिक्सटीन"]],
    ["seventeen", "सत्रह", "সোতৰ", "সতেরো", ["सेवेंटीन"]], ["eighteen", "अठारह", "আঠৰ", "আঠারো", ["एटीन"]],
    ["nineteen", "उन्नीस", "ঊনৈশ", "ঊনিশ", ["नाइनटीन"]], ["twenty", "बीस", "কুৰি", "কুড়ি", ["ट्वेंटी"]]
  ];
  // O = operation words. nat: text, or [sign, between-two-numbers] (minus: "minus three" / "eight minus five")
  var G_OPS = [
    { en: ["plus"], nat: { hi: "जोड़", as: "যোগ", bn: "যোগ" }, al: { hi: ["प्लस"] } },
    { en: ["minus"], nat: { hi: ["ऋण", "घटा"], as: ["ঋণাত্মক", "বিয়োগ"], bn: ["ঋণাত্মক", "বিয়োগ"] }, al: { hi: ["माइनस"] } },
    { en: ["into"], nat: { hi: "गुणा", as: "পূৰণ", bn: "গুণ" }, al: { hi: ["इनटू"] } },
    { en: ["equal to", "equals"], nat: { hi: "बराबर", as: "সমান", bn: "সমান" }, al: { hi: ["इक्वल टू"] } }
  ];
  // T = teaching words. loan = how it is usually written in the language's own script, nat = pure native word
  var G_TERMS = [
    { en: ["number line"], loan: { hi: "नंबर लाइन", as: "নম্বৰ লাইন", bn: "নাম্বার লাইন" }, nat: { hi: "संख्या रेखा", as: "সংখ্যা ৰেখা", bn: "সংখ্যারেখা" }, al: { hi: ["नम्बर लाइन"], bn: ["নম্বর লাইন"], as: ["নাম্বাৰ লাইন"] } },
    { en: ["jump", "jumps"], loan: { hi: "जंप", as: "জাম্প", bn: "জাম্প" }, nat: { hi: "छलांग", bn: "লাফ" }, al: { hi: ["जम्प"] } },
    { en: ["step", "steps"], loan: { hi: "स्टेप", as: "ষ্টেপ", bn: "স্টেপ" }, nat: { hi: "कदम", as: "পদক্ষেপ", bn: "ধাপ" }, al: { as: ["স্টেপ"] } },
    { en: ["answer"], loan: { hi: "आंसर", as: "আন্সাৰ", bn: "আনসার" }, nat: { hi: "उत्तर", as: "উত্তৰ", bn: "উত্তর" }, al: { hi: ["आन्सर"] } },
    { en: ["question"], loan: { hi: "क्वेश्चन", as: "কোৱেশ্চন", bn: "কোয়েশ্চেন" }, nat: { hi: "प्रश्न", as: "প্ৰশ্ন", bn: "প্রশ্ন" }, al: {} },
    { en: ["positive"], loan: { hi: "पॉज़िटिव", as: "পজিটিভ", bn: "পজিটিভ" }, nat: { hi: "धनात्मक", as: "ধনাত্মক", bn: "ধনাত্মক" }, al: { hi: ["पॉजिटिव"] } },
    { en: ["negative"], loan: { hi: "नेगेटिव", as: "নেগেটিভ", bn: "নেগেটিভ" }, nat: { hi: "ऋणात्मक", as: "ঋণাত্মক", bn: "ঋণাত্মক" }, al: {} },
    { en: ["right"], loan: { hi: "राइट", as: "ৰাইট", bn: "রাইট" }, nat: { hi: "दाईं", bn: "ডান" }, al: {} },
    { en: ["left"], loan: { hi: "लेफ्ट", as: "লেফ্ট", bn: "লেফট" }, nat: { hi: "बाईं", bn: "বাম" }, al: {} },
    { en: ["sign"], loan: { hi: "साइन", as: "চাইন", bn: "সাইন" }, nat: { hi: "चिह्न", as: "চিন", bn: "চিহ্ন" }, al: {} }
  ];
  var GKEYS = { hi: {}, as: {}, bn: {} };
  (function () {
    function add(L, form, c) { GKEYS[L][String(form).toLowerCase()] = c; }
    ["hi", "as", "bn"].forEach(function (L, li) {
      G_NUM.forEach(function (r) {
        var c = { cls: "N", en: r[0], enForms: [r[0]], nat: {} }; c.nat[L] = r[1 + li];
        add(L, r[0], c); if (L === "hi") r[4].forEach(function (a) { add(L, a, c); });
      });
      G_OPS.forEach(function (o) {
        var c = { cls: "O", en: o.en[0], enForms: o.en, nat: o.nat };
        o.en.forEach(function (f) { add(L, f, c); }); (o.al[L] || []).forEach(function (a) { add(L, a, c); });
      });
      G_TERMS.forEach(function (t) {
        var c = { cls: "T", en: t.en[0], enForms: t.en, nat: t.nat, loan: t.loan };
        t.en.forEach(function (f) { add(L, f, c); });
        [t.loan[L], t.nat[L]].concat(t.al[L] || []).forEach(function (f) { if (f) add(L, f, c); });
      });
    });
  })();
  // Numbers / plus / minus ki native spellings (do, ten...) jaan-boojh kar keys me nahi: "दो" ka matlab "give" bhi hota hai, "বাৰ" ka matlab "times" bhi.
  var WORD_RE = /([A-Za-z]+|[\u0900-\u0963\u0966-\u097F\u0980-\u09FF]+)/;
  function renderWord(c, surface, code, level, afterNum) {
    if (c.cls === "T") {                                    // teaching words: sirf dono kinaaron par badalte hain; Normal(2) me jaisa AI ne likha waisa
      if (level >= 3) return c.enForms.indexOf(surface.toLowerCase()) >= 0 ? surface : c.en;
      if (level === 2) return surface;
      var latin = /^[A-Za-z]/.test(surface);
      if (level === 1) return latin ? (c.loan[code] || surface) : surface;
      return c.nat[code] || c.loan[code] || surface;        // level 0
    }
    if (c.cls === "O" ? level >= 1 : level >= 2) return c.enForms.indexOf(surface.toLowerCase()) >= 0 ? surface : c.en;
    var n = c.nat[code];
    if (Array.isArray(n)) n = afterNum ? n[1] : n[0];
    return n || surface;
  }
  function adjustEnglish(text, code, level) {
    var K = GKEYS[code]; text = String(text == null ? "" : text);
    if (!K || !(level >= 0 && level <= 3)) return text;
    var parts = text.split(WORD_RE), out = [], lastNum = false;
    for (var i = 0; i < parts.length; i++) {
      if (i % 2 === 0) { out.push(parts[i]); if (/\S/.test(parts[i])) lastNum = false; continue; }
      var hit = null;
      for (var k = 3; k >= 1 && !hit; k--) {
        var key = [], ok = true;
        for (var j = 0; j < k; j++) {
          var idx = i + 2 * j;
          if (idx >= parts.length || (j > 0 && !/^\s+$/.test(parts[idx - 1]))) { ok = false; break; }
          key.push(parts[idx]);
        }
        if (!ok) continue;
        var c = K[key.join(" ").toLowerCase()];
        if (c) hit = { c: c, k: k, surface: key.join(" ") };
      }
      if (!hit) { out.push(parts[i]); lastNum = false; continue; }
      out.push(renderWord(hit.c, hit.surface, code, level, lastNum));
      lastNum = hit.c.cls === "N";
      i += 2 * (hit.k - 1);
    }
    var res = out.join("");
    if (code === "hi" && level === 0) res = res.replace(/जोड़ (करते|करो|करना|करें|करता|करती)/g, function (m, v) { return { "करते": "जोड़ते", "करो": "जोड़ो", "करना": "जोड़ना", "करें": "जोड़ें", "करता": "जोड़ता", "करती": "जोड़ती" }[v]; });   // "जोड़ करते हैं" -> "जोड़ते हैं"
    return res;
  }
  function rcode(lang) { return lang === "en" ? null : lang === "as" ? "as" : lang === "bn" ? "bn" : "hi"; }   // hg bolta hai Hindi voice me
  function engFor(lang) { var c = rcode(lang), v = c ? parseInt(ls("mvEng_" + c), 10) : NaN; return v >= 0 && v <= 3 ? v : ENG_DEFAULT; }

  /* Spoken line -> pieces. English runs (maths phrases, numbers, plus / minus / into / equal to, written in Latin letters)
     are read by an English voice, everything else by the language's own voice. Eg "हमारा क्वेश्चन है, minus eight plus five।" */
  function splitRuns(text, code) {
    text = String(text || "");
    if (code === "en") return /\S/.test(text) ? [{ t: text.trim(), en: true }] : [];
    var out = [], bits = text.split(/([A-Za-z][A-Za-z0-9'\u2019 ,.\-]*[A-Za-z0-9]|[A-Za-z])/);
    bits.forEach(function (b, i) {
      if (i % 2) { b = b.trim(); if (b) out.push({ t: b, en: true }); }
      else if (/[^\s.,;:!?'"()\u0964\u0965\-\u2013\u2014]/.test(b)) out.push({ t: b.trim(), en: false });
    });
    return out;
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
    if (!LANGS.some(function (o) { return o[0] === lang; })) lang = "hg";
    // caption / title: exactly the text in the plan. No English-words slider in the player any more: the level is chosen on the
    // Get Video page and only changes how the AI WRITES the text, so nothing is swapped at playback time.
    function lt(o) { return tx(o, lang); }

    var root = el("div", { style: "position:fixed;inset:0;z-index:2000;background:var(--bg,#fff);color:var(--tx,#111);overflow:auto;padding:12px 14px 40px" });
    root.setAttribute("role", "dialog"); root.setAttribute("aria-modal", "true");
    var inner = el("div", { style: "max-width:680px;margin:0 auto" });
    var title = el("h2", { style: "font-size:18px;margin:6px 0", text: lt(plan.title) });
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
      var tn = document.createTextNode(label);
      return { wrap: el("label", { style: "font-size:12px;display:block" }, [tn, el("br"), s]), s: s, lab: tn };
    }
    var langSel = sel("Language", function () { lang = langSel.s.value; ls(LANG_KEY, lang); title.textContent = lt(plan.title); fillVoices(); show(st.i); if (st.playing) { stopSpeech(); speak(); } });
    LANGS.forEach(function (o) { langSel.s.appendChild(el("option", { value: o[0], text: o[1] })); });
    langSel.s.value = lang;
    function regionalCode() { return rcode(lang); }
    var voiceSel = sel("Voice", function () { var c = regionalCode(); if (c) ls(voiceKey(c), voiceSel.s.value); if (st.playing) { stopSpeech(); speak(); } });
    var enSel = sel("English voice", function () { ls(EN_KEY, enSel.s.value); if (st.playing) { stopSpeech(); speak(); } });
    var opts = el("div", { style: "display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end;margin:6px 0" }, [langSel.wrap, voiceSel.wrap, enSel.wrap]);

    [top, board, cap, bar, opts, msg, prog].forEach(function (n) { inner.appendChild(n); });
    root.appendChild(inner); document.body.appendChild(root);

    function fillVoices() {
      voiceSel.s.textContent = ""; enSel.s.textContent = ""; msg.textContent = "";
      if (!g.speechSynthesis) { voiceSel.wrap.style.display = "none"; enSel.wrap.style.display = "none"; msg.textContent = "Is browser me awaaz (text-to-speech) support nahi hai. Video bina awaaz ke chalega."; return; }
      var code = regionalCode(), notes = [];
      function fill(sl, list, key) {
        list.forEach(function (v) { sl.s.appendChild(el("option", { value: v.name, text: v.name + " (" + v.lang + ")" })); });
        var want = ls(key);
        if (want && list.some(function (v) { return v.name === want; })) sl.s.value = want;
      }
      if (code) {
        var rl = pickList(code), nm = LANG_NAME[code];
        voiceSel.lab.nodeValue = nm + " voice";
        if (!rl.length) {
          voiceSel.wrap.style.display = "none";
          notes.push(code === "hi"
            ? "Is device me Hindi (hi-IN) voice install nahi hai, isliye awaaz English accent me aayegi.\nWindows: Settings > Time & language > Speech > Add voices > Hindi. Phir browser band karke dobara kholo."
            : "Is device me " + nm + " voice install nahi hai, isliye awaaz English me aayegi.\nPhone/PC ki Text-to-speech settings me " + nm + " voice add karke browser dobara kholo.");
        } else {
          voiceSel.wrap.style.display = ""; fill(voiceSel, rl, voiceKey(code));
          if (code === "as" && !voicesWith("as").length) notes.push("Is device me Assamese (as-IN) voice nahi hai, isliye Bengali voice use ho rahi hai. Kuch Assamese shabd thode alag sunai de sakte hain.");
        }
      } else voiceSel.wrap.style.display = "none";
      var ev = enVoices();
      if (ev.length && !code) {
        enSel.wrap.style.display = ""; fill(enSel, ev, EN_KEY);
        if (!ls(EN_KEY)) { var inn = ev.filter(function (v) { return /en-IN/i.test(v.lang); })[0]; if (inn) enSel.s.value = inn.name; }
      } else enSel.wrap.style.display = "none";
      msg.textContent = notes.join("\n");
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
    var NLY = 310, layout = { lh: 52, fs: 30 }, textEls = [], ctimers = [], NL = null, statG = null, dynG = null, pen = null, penShape = null, penPlaced = false, mark = null, curStep = null;
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
      cap.textContent = lt(s.cap);
      prog.textContent = "Step " + (i + 1) + " / " + plan.steps.length + ((lang === "as" || lang === "bn") && !(s.say && s.say[lang]) ? "  •  Is video me " + LANG_NAME[lang] + " nahi hai, English dikha raha hoon" : "");
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
    function voiceFor(code) {
      var list = code === "en" ? enVoices() : pickList(code), sel2 = code === "en" ? enSel : voiceSel, name = sel2.s.value;
      return list.filter(function (v) { return v.name === name; })[0] ||
        (code === "en" ? list.filter(function (v) { return /en-IN/i.test(v.lang); })[0] : null) || list[0] || null;
    }
    function speak() {
      var tok = ++st.token, s = plan.steps[st.i], say = s.say || {}, code = regionalCode() || "en", text;
      if (code !== "en" && !pickList(code).length) code = "en";                   // is language ki voice nahi: English line, English awaaz
      text = code === "en" ? say.en : (say[code] || (code === "hi" ? say.en : ""));
      if (code !== "en" && !text) { code = "en"; text = say.en; }                 // is video me ye language nahi: English line
      text = text || "";
      runCues(Math.max(3000, text.length * 72));                                  // pen/arrow cues awaaz ki length me failte hain
      // ONE piece, ONE voice: the whole sentence is read by the language voice, so the voice never switches in the middle of a line
      var parts = /\S/.test(text) ? [{ t: text.trim(), en: code === "en" }] : [];
      if (!g.speechSynthesis || !parts.length) { st.timer = setTimeout(function () { advance(tok); }, 3500); return; }
      g.speechSynthesis.cancel();
      var k = 0;
      (function next() {
        if (tok !== st.token) return;
        if (k >= parts.length) return advance(tok);
        var p = parts[k++], u = new SpeechSynthesisUtterance(p.t), v = voiceFor(p.en ? "en" : code);
        if (v) { u.voice = v; u.lang = v.lang; } else u.lang = p.en ? "en-IN" : (code === "hi" ? "hi-IN" : code + "-IN");
        u.rate = p.en ? 0.9 : 0.95; u.onend = next; u.onerror = next;
        g.speechSynthesis.speak(u);
      })();
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

  g.MathVideoPlayer = { open: open, close: close, _split: splitRuns, _adjust: adjustEnglish, debug: function () { var cc = null, ctx = null; try { cc = curCh(); var q0 = null; (cc.ch.sections || []).some(function (s) { return (s.questions || []).some(function (q) { q0 = q; return true; }); }); ctx = q0 && mvCtx(q0); } catch (e) {} return { loaded: Object.keys(LOADED), videos: Object.keys(MV), retry: RETRY, lastError: LASTERR, prefix: ctx && ctx.prefix, base: ctx && window.MathVideo.makeCode(ctx.f) }; } };

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
