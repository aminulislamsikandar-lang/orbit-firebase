/* mathvideo-admin.js
 * 1) MathVideo.validate(plan)  -> { errors:[], warnings:[] }  (schema + safety + maths check)
 * 2) MathVideo.mountAdmin(el, store, opts) -> admin panel (code + JSON paste, validate, preview, save, load, delete)
 * Sab text textContent se render hota hai, plan data kabhi innerHTML me nahi jata.
 */
(function (g) {
  "use strict";
  var MAX_STEPS = 12, MAX_LEN = 140, MAX_LINE = 60, MAX_NOTE = 60;
  var CODE_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,119}$/;     // jaise nashibali-class7-englishmedium-math-EX:1.1-Q1-i
  var UNSAFE = /<\s*\/?\s*[a-z!]|https?:|www\.|javascript:|data:text|\bon[a-z]+\s*=/i;

  /* ---------- tiny arithmetic parser (no eval) ---------- */
  function calc(s) {
    var t = s.replace(/[−–—]/g, "-").replace(/[×✕·]/g, "*").replace(/÷/g, "/")
             .replace(/,/g, "").replace(/\s+/g, "");
    if (!t || !/^[0-9+\-*\/().]+$/.test(t) || !/[0-9]/.test(t)) return null;
    var i = 0, bad = false;
    function num() {
      var m = /^\d+(\.\d+)?/.exec(t.slice(i));
      if (!m) { bad = true; return 0; }
      i += m[0].length; return parseFloat(m[0]);
    }
    function prim() {
      if (t[i] === "(") { i++; var v = expr(); if (t[i] === ")") i++; else bad = true; return v; }
      return num();
    }
    function unary() {
      if (t[i] === "-") { i++; return -unary(); }
      if (t[i] === "+") { i++; return unary(); }
      return prim();
    }
    function term() {
      var v = unary();
      while (t[i] === "*" || t[i] === "/") { var op = t[i++], r = unary(); v = op === "*" ? v * r : v / r; }
      return v;
    }
    function expr() {
      var v = term();
      while (t[i] === "+" || t[i] === "-") { var op = t[i++], r = term(); v = op === "+" ? v + r : v - r; }
      return v;
    }
    var out = expr();
    return (bad || i !== t.length || !isFinite(out)) ? null : out;
  }
  function same(a, b) { return Math.abs(a - b) < 1e-9 * Math.max(1, Math.abs(a), Math.abs(b)); }

  /* Har pure-number line check: "=" se shuru hone wali line pehli line ke barabar honi chahiye,
     aur line ke andar "A = B" ho to dono side barabar. Final note "Answer: N" bhi match hona chahiye. */
  function checkMath(plan, errors) {
    var ref = null, last = null, skipped = 0;
    plan.steps.forEach(function (st, si) {
      st.anim.lines.forEach(function (ln, li) {
        var s = ln.trim(), lead = s.charAt(0) === "=";
        var vals = s.replace(/^=/, "").split("=").map(calc);
        if (vals.some(function (v) { return v === null; })) { skipped++; return; }
        for (var k = 1; k < vals.length; k++)
          if (!same(vals[0], vals[k])) errors.push("Step " + (si + 1) + ", line " + (li + 1) + ": dono side barabar nahi (" + ln + ")");
        if (ref === null && !lead) ref = vals[0];
        else if (lead && ref !== null && !same(ref, vals[0]))
          errors.push("Step " + (si + 1) + ", line " + (li + 1) + ": value badal gayi (" + ln + ") — expected " + ref);
        last = vals[0];
      });
    });
    var lastNote = plan.steps[plan.steps.length - 1].anim.note || "";
    var m = /answer\s*:\s*([-−]?[\d,]+(?:\.\d+)?)/i.exec(lastNote);
    if (m && ref !== null) {
      var ans = parseFloat(m[1].replace("−", "-").replace(/,/g, ""));
      if (!same(ans, ref)) errors.push("Last note ka answer (" + m[1] + ") working se match nahi karta (" + ref + ")");
    }
    return skipped;
  }

  /* ---------- schema validation ---------- */
  function str(v, max, path, errors, required) {
    if (typeof v !== "string" || (required && !v.trim())) { errors.push(path + ": text chahiye"); return false; }
    if (v.length > max) errors.push(path + ": " + v.length + " characters (max " + max + ")");
    if (UNSAFE.test(v)) errors.push(path + ": HTML / URL / script allowed nahi");
    return true;
  }
  function langs(o, keys, max, path, errors, warnings) {
    if (!o || typeof o !== "object") { errors.push(path + ": object chahiye"); return; }
    keys.forEach(function (k) { str(o[k], max, path + "." + k, errors, true); });
  }

  /* ---------- number line + cues (optional) ---------- */
  var COLORS = ["red", "green", "blue", "orange"];
  function isInt(n) { return typeof n === "number" && Number.isInteger(n); }
  function checkDot(d, nl, path, errors) {
    if (!d || typeof d !== "object" || !isInt(d.v) || d.v < nl.min || d.v > nl.max) { errors.push(path + ": v number line ke andar ka integer hona chahiye"); return; }
    if (d.label !== undefined) str(d.label, 10, path + ".label", errors, false);
    if (d.color !== undefined && COLORS.indexOf(d.color) < 0) errors.push(path + ".color: " + COLORS.join(" / ") + " me se ek");
  }
  function checkVisuals(a, p, errors) {
    var nl = a.numberline, ok = false;
    if (nl !== undefined) {
      if (!nl || typeof nl !== "object" || !isInt(nl.min) || !isInt(nl.max) || nl.min >= nl.max || nl.max - nl.min > 20 || nl.min < -20 || nl.max > 20)
        errors.push(p + ".numberline: min < max, dono integer, range 20 se zyada nahi");
      else {
        ok = true;
        if (Array.isArray(a.lines) && a.lines.length > 4) errors.push(p + ": number line ke saath lines 4 se zyada nahi");
        if (nl.dots !== undefined) {
          if (!Array.isArray(nl.dots) || nl.dots.length > 12) errors.push(p + ".numberline.dots: list (max 12) chahiye");
          else nl.dots.forEach(function (d, i) { checkDot(d, nl, p + ".numberline.dots[" + (i + 1) + "]", errors); });
        }
      }
    }
    if (a.cues === undefined) return;
    if (!Array.isArray(a.cues) || a.cues.length > 8) { errors.push(p + ".cues: list chahiye (max 8)"); return; }
    a.cues.forEach(function (c, i) {
      var cp = p + ".cues[" + (i + 1) + "]", keys = c && typeof c === "object" ? Object.keys(c) : [];
      if (keys.length !== 1 || ["point", "hop", "dot"].indexOf(keys[0]) < 0) { errors.push(cp + ": sirf ek key: point, hop ya dot"); return; }
      var k = keys[0], v = c[k];
      if (!v || typeof v !== "object") { errors.push(cp + "." + k + ": object chahiye"); return; }
      if (k === "point" && v.value === undefined) {
        var ln = Array.isArray(a.lines) ? a.lines[v.line] : undefined;
        if (!isInt(v.line) || typeof ln !== "string") { errors.push(cp + ".point.line: valid line index chahiye"); return; }
        if (v.word !== undefined) {
          if (typeof v.word !== "string" || !v.word || v.word.length > 40) errors.push(cp + ".point.word: chhota text chahiye");
          else if (ln.indexOf(v.word) < 0) errors.push(cp + ".point.word: \"" + v.word + "\" line " + (v.line + 1) + " me nahi mila");
        }
        return;
      }
      if (!ok) { errors.push(cp + ": ye cue number line maangta hai (anim.numberline add karo)"); return; }
      if (k === "point") { if (!isInt(v.value) || v.value < nl.min || v.value > nl.max) errors.push(cp + ".point.value: number line ke andar ka integer chahiye"); }
      else if (k === "hop") { [v.from, v.to].forEach(function (x) { if (!isInt(x) || x < nl.min || x > nl.max) errors.push(cp + ".hop: from/to number line ke andar ke integers hone chahiye"); }); }
      else checkDot(v, nl, cp + ".dot", errors);
    });
  }

  function validate(plan) {
    var errors = [], warnings = [];
    if (!plan || typeof plan !== "object" || Array.isArray(plan)) return { errors: ["Plan ek JSON object hona chahiye"], warnings: warnings };
    str(plan.id, 80, "id", errors, true);
    if (plan.type !== "equation") errors.push("type abhi sirf \"equation\" allowed hai");
    if (plan.version !== 1) errors.push("version 1 hona chahiye");
    langs(plan.title, ["en", "hg", "hi"], MAX_LEN, "title", errors);
    if (!Array.isArray(plan.steps) || plan.steps.length < 1 || plan.steps.length > MAX_STEPS) {
      errors.push("steps 1 se " + MAX_STEPS + " ke beech hone chahiye"); return { errors: errors, warnings: warnings };
    }
    plan.steps.forEach(function (st, i) {
      var p = "steps[" + (i + 1) + "]";
      if (!st || typeof st !== "object") { errors.push(p + ": object chahiye"); return; }
      langs(st.cap, ["en", "hg", "hi"], MAX_LEN, p + ".cap", errors);
      langs(st.say, ["en", "hi"], MAX_LEN, p + ".say", errors);
      if (st.say && typeof st.say.hi === "string") {
        if (/[0-9]/.test(st.say.hi)) warnings.push(p + ".say.hi me digits hain — numbers ko Devanagari words me likho");
        if (!/[\u0900-\u097F]/.test(st.say.hi)) warnings.push(p + ".say.hi Devanagari me nahi hai");
      }
      var a = st.anim;
      if (!a || typeof a !== "object") { errors.push(p + ".anim chahiye"); return; }
      if (!Array.isArray(a.lines) || a.lines.length < 1 || a.lines.length > MAX_STEPS) errors.push(p + ".anim.lines 1–" + MAX_STEPS + " honi chahiye");
      else a.lines.forEach(function (l, j) { str(l, MAX_LINE, p + ".anim.lines[" + (j + 1) + "]", errors, true); });
      if (!Array.isArray(a.highlight) || a.highlight.some(function (n) { return !Number.isInteger(n) || n < 0 || n >= (a.lines || []).length; }))
        errors.push(p + ".anim.highlight: valid line index chahiye");
      if (a.note !== undefined) str(a.note, MAX_NOTE, p + ".anim.note", errors, false);
      checkVisuals(a, p + ".anim", errors);
    });
    if (!errors.length) {
      var skipped = checkMath(plan, errors);
      if (skipped) warnings.push(skipped + " line(s) me letters/algebra hai — code unka maths verify nahi kar paya, khud dekh lo");
    }
    return { errors: errors, warnings: warnings };
  }

  /* ---------- code builder (admin aur student side dono yahi use karein) ----------
     makeCode({school:"nashibali", cls:"class7", medium:"englishmedium", subject:"math", ex:"1.1", q:"1", part:"i"})
     -> "nashibali-class7-englishmedium-math-EX:1.1-Q1-i"   (part khali ho to aakhri "-i" nahi lagta) */
  function clean(s) { return String(s == null ? "" : s).trim().replace(/[\s\/]+/g, ""); }
  function makeCode(f) {
    var base = [f.school, f.cls, f.medium, f.subject].map(function (x) { return clean(x).toLowerCase(); });
    var ex = clean(f.ex).replace(/^ex[:.\-]?/i, ""), q = clean(f.q).replace(/^q[:.\-]?/i, ""), part = clean(f.part).toLowerCase();
    if (base.some(function (x) { return !x; }) || !ex || !q) return "";
    var out = base.concat(["EX:" + ex, "Q" + q]);
    if (part) out.push(part);
    return out.join("-");
  }

  /* ---------- admin panel ---------- */
  function h(tag, props, kids) {
    var e = document.createElement(tag);
    for (var k in (props || {})) { if (k === "text") e.textContent = props[k]; else if (k === "style") e.style.cssText = props[k]; else e[k] = props[k]; }
    (kids || []).forEach(function (c) { e.appendChild(c); });
    return e;
  }

  /* store = { get(code)->plan|null, set(code, plan), del(code), list()->[codes] }
     opts  = { preview(plan) }  (optional: apne player me plan chalane ke liye) */
  function mountAdmin(el, store, opts) {
    opts = opts || {};
    el.textContent = "";
    var code = h("input", { placeholder: "code yahan apne aap ban jayega", style: "width:100%;padding:10px;margin:6px 0;box-sizing:border-box;font-family:monospace;font-size:13px" });
    var saved = {}; try { saved = JSON.parse(localStorage.getItem("mvAdminDefaults") || "{}"); } catch (e) {}
    var fields = {}, fbox = h("div", { style: "display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:6px 0" });
    function sync() {
      var f = {}; for (var k in fields) f[k] = fields[k].value;
      code.value = makeCode(f);
      try { localStorage.setItem("mvAdminDefaults", JSON.stringify({ school: f.school, cls: f.cls, medium: f.medium, subject: f.subject })); } catch (e) {}
    }
    function field(key, label, init, options, hint) {
      var wrap = h("label", { style: "font-size:12px" });
      wrap.appendChild(document.createTextNode(label));
      var inp = options ? h("select") : h("input", { placeholder: hint || "" });
      if (options) options.forEach(function (o) { inp.appendChild(h("option", { text: o, value: o })); });
      inp.value = saved[key] || init || "";
      inp.style.cssText = "width:100%;padding:9px;margin-top:3px;box-sizing:border-box";
      inp.oninput = inp.onchange = sync;
      fields[key] = inp; wrap.appendChild(inp); fbox.appendChild(wrap);
    }
    field("school", "School", "nashibali");
    field("cls", "Class", "class7");
    field("medium", "Medium", "englishmedium", ["englishmedium", "assamesemedium", "hindimedium", "bengalimedium"]);
    field("subject", "Subject", "math");
    field("ex", "Exercise / Example", "", null, "jaise 1.1");
    field("q", "Question", "", null, "jaise 1");
    field("part", "Part (khali bhi chalega)", "", null, "i, ii, iii");
    var area = h("textarea", { placeholder: "Yahan plan JSON paste karo", style: "width:100%;height:240px;padding:10px;font-family:monospace;font-size:12px;box-sizing:border-box" });
    var msg = h("div", { style: "white-space:pre-wrap;font-size:13px;margin:8px 0;min-height:20px" });
    var list = h("div", { style: "display:flex;flex-wrap:wrap;gap:6px;margin-top:10px" });
    var bar = h("div", { style: "display:flex;flex-wrap:wrap;gap:8px" });

    function say(lines, ok) { msg.textContent = lines.join("\n"); msg.style.color = ok ? "#168653" : "#d74747"; }
    function parse() {
      var c = code.value.trim();
      if (!CODE_RE.test(c)) { say(["Code galat ya khali: Exercise aur Question bharo (space ya / allowed nahi)"]); return null; }
      var plan;
      try { plan = JSON.parse(area.value); } catch (e) { say(["JSON galat hai: " + e.message]); return null; }
      var r = validate(plan);
      if (r.errors.length) { say(["Save nahi hoga:"].concat(r.errors)); return null; }
      say(["Valid hai (" + plan.steps.length + " steps)"].concat(r.warnings.map(function (w) { return "Dhyan: " + w; })), true);
      return { code: c, plan: plan };
    }
    function btn(label, fn) { var b = h("button", { text: label, type: "button", style: "padding:10px 14px;border-radius:10px;border:0;background:rgba(128,128,128,.18);color:inherit;cursor:pointer" }); b.onclick = fn; bar.appendChild(b); return b; }

    btn("Validate", parse);
    if (opts.preview) btn("Preview", function () { var r = parse(); if (r) opts.preview(r.plan); });
    btn("Save", function () {
      var r = parse(); if (!r) return;
      store.set(r.code, r.plan).then(function () { say(["Saved: " + r.code], true); refresh(); },
        function (e) { say(["Save fail: " + (e && e.message ? e.message : e)]); });
    });
    btn("Load", function () {
      var c = code.value.trim(); if (!c) return say(["Pehle code likho"]);
      store.get(c).then(function (p) { if (!p) return say(["Is code ka video nahi mila"]); area.value = JSON.stringify(p, null, 2); say(["Loaded: " + c], true); },
        function (e) { say(["Load fail: " + (e && e.message ? e.message : e)]); });
    });
    btn("Delete", function () {
      var c = code.value.trim(); if (!c) return say(["Pehle code likho"]);
      if (!confirm("Delete karna hai: " + c + " ?")) return;
      store.del(c).then(function () { say(["Deleted: " + c], true); refresh(); }, function (e) { say(["Delete fail: " + (e && e.message ? e.message : e)]); });
    });

    function refresh() {
      store.list().then(function (codes) {
        list.textContent = "";
        codes.sort().forEach(function (c) {
          var chip = h("button", { text: c, type: "button", style: "padding:6px 10px;border-radius:999px;border:0;background:rgba(128,128,128,.18);color:inherit;font-size:12px;cursor:pointer" });
          chip.onclick = function () { code.value = c; store.get(c).then(function (p) { if (p) { area.value = JSON.stringify(p, null, 2); say(["Loaded: " + c], true); } }); };
          list.appendChild(chip);
        });
        if (!codes.length) list.textContent = "Abhi koi video saved nahi.";
      }, function () { list.textContent = "List load nahi hui."; });
    }

    [h("h3", { text: "Math Video (code se)" }), fbox, code, area, bar, msg,
     h("div", { text: "Saved videos:", style: "font-size:12px;margin-top:8px" }), list].forEach(function (n) { el.appendChild(n); });
    refresh();

    /* ---- student requests (Get Video): review, approve into the public library, or reject ---- */
    if (store.pendingList) {
      var cur = null;
      var pbox = h("div", { style: "margin-top:18px;padding-top:12px;border-top:1px solid rgba(128,128,128,.35)" });
      var plist = h("div", { style: "display:flex;flex-direction:column;gap:6px;margin-top:8px" });
      var pq = h("div", { style: "font-size:13px;margin:8px 0;white-space:pre-wrap" });
      var pbar = h("div", { style: "display:flex;flex-wrap:wrap;gap:8px" });
      var planOnly = function () {
        var p; try { p = JSON.parse(area.value); } catch (e) { say(["JSON galat hai: " + e.message]); return null; }
        var r = validate(p);
        if (r.errors.length) { say(["Nahi ho sakta:"].concat(r.errors)); return null; }
        say(["Valid hai (" + p.steps.length + " steps)"].concat(r.warnings.map(function (w) { return "Dhyan: " + w; })), true);
        return p;
      };
      var pbtn = function (label, fn) { var b = h("button", { text: label, type: "button", style: "padding:10px 14px;border-radius:10px;border:0;background:rgba(128,128,128,.18);color:inherit;cursor:pointer" }); b.onclick = fn; pbar.appendChild(b); };
      var prefresh = function () {
        store.pendingList().then(function (items) {
          plist.textContent = "";
          items.forEach(function (it) {
            var b = h("button", { text: String(it.text || "").slice(0, 80), type: "button", style: "text-align:left;padding:8px 10px;border-radius:10px;border:0;background:rgba(128,128,128,.14);color:inherit;font-size:13px;cursor:pointer" });
            b.onclick = function () { cur = it; pq.textContent = "Student ka question:\n" + it.text; area.value = JSON.stringify(it.plan, null, 2); say(["Request load hui. Preview dekho, phir Approve ya Reject."], true); };
            plist.appendChild(b);
          });
          if (!items.length) plist.textContent = "Abhi koi pending request nahi.";
        }, function (e) { plist.textContent = "Pending list load nahi hui: " + (e && e.message ? e.message : e); });
      };
      if (opts.preview) pbtn("Preview", function () { var p = planOnly(); if (p) opts.preview(p); });
      pbtn("Approve for Get Video", function () {
        if (!cur) return say(["Pehle list se ek request chuno"]);
        var p = planOnly(); if (!p) return;
        var id = cur.id, text = cur.text;
        store.askedSet(id, text, p).then(function () { return store.pendingDel(id); }).then(function () {
          say(["Approved. Ab ye question paste karne par sabhi students ko turant milega."], true); cur = null; pq.textContent = ""; prefresh();
        }, function (e) { say(["Approve fail: " + (e && e.message ? e.message : e)]); });
      });
      pbtn("Reject (delete)", function () {
        if (!cur) return say(["Pehle list se ek request chuno"]);
        if (!confirm("Ye request delete karni hai?")) return;
        var id = cur.id;
        store.pendingDel(id).then(function () { say(["Request delete ho gayi."], true); cur = null; pq.textContent = ""; prefresh(); }, function (e) { say(["Delete fail: " + (e && e.message ? e.message : e)]); });
      });
      pbtn("Refresh", prefresh);
      [h("h3", { text: "Student requests (pending)" }), h("div", { text: "Approve = Get Video library mein jata hai. Textbook question ke menu mein bhi dalna ho to upar code bharke Save dabao.", style: "font-size:12px;margin-top:4px" }), plist, pq, pbar].forEach(function (n) { pbox.appendChild(n); });
      el.appendChild(pbox);
      prefresh();
    }
  }

  var api = { validate: validate, mountAdmin: mountAdmin, makeCode: makeCode, calc: calc, CODE_RE: CODE_RE };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else g.MathVideo = api;
})(typeof window !== "undefined" ? window : globalThis);
