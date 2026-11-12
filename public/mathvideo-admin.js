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

  /* ---------- superscripts / question normaliser (shared by server.js and index.html, so the cache key is the same everywhere) ---------- */
  var SUP_DIGITS = "\u2070\u00B9\u00B2\u00B3\u2074\u2075\u2076\u2077\u2078\u2079";
  var SUP_RUN = /[\u2070\u00B9\u00B2\u00B3\u2074-\u2079\u207A\u207B]+/g;
  // "(-1)\u00B9\u2070\u00B3" -> "(-1)^103"   (a run of superscript digits / signs becomes ^N)
  function supToCaret(s) {
    return String(s).replace(SUP_RUN, function (run) {
      var out = "";
      for (var i = 0; i < run.length; i++) {
        var c = run.charAt(i), d = SUP_DIGITS.indexOf(c);
        out += d >= 0 ? String(d) : c === "\u207B" ? "-" : "";     // superscript plus is dropped
      }
      return "^" + out;
    });
  }
  /* Question text as the AI should see it: superscripts, ** and the flattened "(-1)103" case become ^N.
     Spaces and letters are kept. Flattened digits are converted ONLY for a NEGATIVE bracketed integer written
     directly before 1-3 digits, like "(-1)103": nobody writes a product that way, so it is unambiguous.
     "(2)3" or "5 3" are left alone (the AI may say unsupported). */
  function prepQuestion(s) {
    var t = supToCaret(s == null ? "" : s).replace(/[\u2212\u2013\u2014]/g, "-").replace(/\*\*/g, "^");
    return t.replace(/(^|[\s(+\-*\/\u00D7\u00F7=,;:])(\(\s*-\s*\d+\s*\))(\d{1,3})(?=$|[\s)+\-*\/\u00D7\u00F7=,;:?!])/g,
      function (m, a, b, c) { return a + b + "^" + c; });
  }
  // Cache key. For questions without superscripts, "**" or flattened powers it is identical to the old key.
  function normQuestion(s) {
    return prepQuestion(s).toLowerCase().replace(/[\u00D7\u2715\u00B7]/g, "*").replace(/\u00F7/g, "/").replace(/\s+/g, "");
  }

  /* ---------- tiny arithmetic parser (no eval) ----------
     calcEx(text) -> null (not a pure number line) | { v: number } | { err: "reason" }.
     Supports + - * / brackets and ^ (power). Power rules: base = whole number or a bracketed whole-number expression,
     exponent = plain whole number 0..200 (no sign, no bracket, no a^b^c chain), 0^0 is an error, |result| at most 15 digits.
     Powers are computed exactly with BigInt. Precedence: ^ binds tighter than unary minus, so (-2)^2 = 4 but -2^2 = -4. */
  var MAX_EXP = 200, MAX_DIGITS = 15;
  function calcEx(s) {
    var t = supToCaret(s).replace(/[\u2212\u2013\u2014]/g, "-").replace(/[\u00D7\u2715\u00B7]/g, "*").replace(/\u00F7/g, "/")
             .replace(/\*\*/g, "^").replace(/,/g, "").replace(/\s+/g, "");
    if (!t || !/^[0-9+\-*\/().^]+$/.test(t) || !/[0-9]/.test(t)) return null;
    var i = 0, bad = false, err = null;
    function fail(m) { if (!err) err = m; bad = true; return 0; }
    function num() {
      var m = /^\d+(\.\d+)?/.exec(t.slice(i));
      if (!m) { bad = true; return 0; }
      i += m[0].length; return parseFloat(m[0]);
    }
    function power(base, lit) {              // t[i] is the "^"
      i++;
      if (lit !== null && lit.indexOf(".") >= 0) return fail("power ka base integer hona chahiye (" + lit + ")");
      if (!isFinite(base) || Math.floor(base) !== base) return fail("power ka base integer hona chahiye");
      if (t[i] === "-" || t[i] === "+") return fail("negative ya sign wala exponent allowed nahi (exponent 0 se " + MAX_EXP + " tak)");
      var m = /^\d+/.exec(t.slice(i));
      if (!m) return fail("exponent seedha non-negative number hona chahiye, jaise ^3 (bracket ya expression nahi)");
      i += m[0].length;
      if (t[i] === ".") return fail("exponent decimal nahi ho sakta");
      if (t[i] === "^") return fail("power ke upar power (a^b^c) allowed nahi, bracket lagao");
      var e = m[0].length > 4 ? Infinity : parseInt(m[0], 10);
      if (e > MAX_EXP) return fail("exponent " + MAX_EXP + " se zyada nahi ho sakta (mila: " + m[0] + ")");
      if (Math.abs(base) > 1e15) return fail("power ka base bahut bada hai");
      if (e === 0 && base === 0) return fail("0^0 undefined hai");
      var b = BigInt(base), r = BigInt(1);
      for (var k = 0; k < e; k++) r = r * b;
      var digits = (r < BigInt(0) ? -r : r).toString().length;
      if (digits > MAX_DIGITS) return fail("power ka result bahut bada hai (" + digits + " digits, max " + MAX_DIGITS + ")");
      return Number(r);
    }
    function prim() {
      var v, lit = null;
      if (t[i] === "(") { i++; v = expr(); if (t[i] === ")") i++; else bad = true; }
      else { var st = i; v = num(); lit = t.slice(st, i); }
      if (t[i] === "^") return power(v, lit);
      return v;
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
    if (err) return { err: err };
    return (bad || i !== t.length || !isFinite(out)) ? null : { v: out };
  }
  function calc(s) { var r = calcEx(s); return r && r.err === undefined ? r.v : null; }
  function same(a, b) { return Math.abs(a - b) < 1e-9 * Math.max(1, Math.abs(a), Math.abs(b)); }

  /* ---------- True / False questions ----------
     "(-1)^103 + (-1)^104 = 0; True or False ?"  ->  { tf:true, left:0, right:0 }
     The statement is the numeric chain around the first "=". Only "<expression> = <expression>" is understood. */
  var TF_RE = /\btrue\b[\s\S]*\bfalse\b|\bfalse\b[\s\S]*\btrue\b|\u0938\u0939\u0940\s*(?:\u092F\u093E|\/|\u0905\u0925\u0935\u093E)\s*(?:\u0917\u093C?\u0932\u0924|\u095A\u0932\u0924)|\bsahi\s*(?:ya|\/)\s*galat\b/i;
  function isTrueFalse(q) { return TF_RE.test(prepQuestion(q)); }
  var NUMCH = /[0-9+\-*\/().^\u00D7\u00F7\u00B7\u2715\s]/;
  function parseTF(q) {
    var t = prepQuestion(q);
    if (!TF_RE.test(t)) return { tf: false };
    t = t.replace(/^\s*(?:q(?:uestion)?\.?\s*)?(?:\d+\s*[.)]\s+|\(?[ivx]+\)\s*|\(?[a-d]\)\s*)/i, "")   // leading "1. " / "(i)" / "(a)"
         .replace(/(\d),(?=\d{3}(?!\d))/g, "$1")                                                // 1,000 -> 1000
         .replace(/([\d)])\s*[xX]\s*(?=[\d(])/g, "$1 \u00D7 ");                                  // "3 x 4" -> "3 \u00D7 4"
    var eq = t.indexOf("=");
    if (eq < 0) return { tf: true, left: null, right: null };
    var a = eq, b = eq + 1;
    while (a > 0 && NUMCH.test(t.charAt(a - 1))) a--;
    while (b < t.length && NUMCH.test(t.charAt(b))) b++;
    var left = t.slice(a, eq), right = t.slice(eq + 1, b);
    if (right.indexOf("=") >= 0) return { tf: true, left: null, right: null };
    function open(x) { return (x.match(/\(/g) || []).length - (x.match(/\)/g) || []).length; }
    left = left.trim(); right = right.trim();
    while (open(left) < 0) left = left.replace(/^\s*\)\s*/, "");         // leftover ")" of "(ii)" in front
    right = right.replace(/[\s.+\-*\/^]+$/, "");
    while (open(right) > 0) right = right.replace(/\s*\(\s*$/, "");       // leftover "(" of the next "(ii)"
    var L = calcEx(left), R = calcEx(right);
    if (L && L.err) return { tf: true, left: null, right: null, err: L.err };
    if (R && R.err) return { tf: true, left: null, right: null, err: R.err };
    if (!L || !R) return { tf: true, left: null, right: null };
    return { tf: true, left: L.v, right: R.v, text: left + " = " + right };
  }

  /* Har pure-number line check: \"=\" se shuru hone wali line pehli line ke barabar honi chahiye,
     aur line ke andar \"A = B\" ho to dono side barabar. Final note \"Answer: N\" bhi match hona chahiye.
     True/False plan (note \"Answer: True/False\" ya question True/False): pehli line pura statement \"X = N\" ho sakti hai;
     X ki value hi reference hai, N claimed value hai. Code khud truth nikalta hai aur note se milata hai.
     qinfo = parseTF(question) ya null. Returns number of lines it could not check. */
  function checkMath(plan, errors, warnings, qinfo) {
    var lastNote = plan.steps[plan.steps.length - 1].anim.note || "";
    var tfNote = /answer\s*:\s*(true|false)\b/i.exec(lastNote);
    var tf = !!(tfNote || (qinfo && qinfo.tf));
    var ref = null, claim = null, skipped = 0;
    plan.steps.forEach(function (st, si) {
      st.anim.lines.forEach(function (ln, li) {
        var s = ln.trim(), lead = s.charAt(0) === "=", where = "Step " + (si + 1) + ", line " + (li + 1) + ": ";
        var parts = s.replace(/^=/, "").split("=").map(calcEx);
        if (parts.some(function (r) { return r === null; })) { skipped++; return; }
        var bad = null;
        parts.forEach(function (r) { if (r.err && !bad) bad = r.err; });
        if (bad) { errors.push(where + bad + " (" + ln + ")"); return; }
        var vals = parts.map(function (r) { return r.v; });
        if (tf && ref === null && !lead && vals.length === 2) { ref = vals[0]; claim = vals[1]; return; }   // the statement itself
        for (var k = 1; k < vals.length; k++) {
          if (same(vals[0], vals[k])) continue;
          if (tf && claim !== null && same(vals[0], ref) && same(vals[k], claim)) continue;                 // comparison line like "0 = 5"
          errors.push(where + "dono side barabar nahi (" + ln + ")");
        }
        if (ref === null && !lead) ref = vals[0];
        else if (lead && ref !== null && !same(ref, vals[0]))
          errors.push(where + "value badal gayi (" + ln + ") — expected " + ref);
      });
    });
    if (!tf) {
      var m = /answer\s*:\s*([-−]?[\d,]+(?:\.\d+)?)/i.exec(lastNote);
      if (m && ref !== null) {
        var ans = parseFloat(m[1].replace("−", "-").replace(/,/g, ""));
        if (!same(ans, ref)) errors.push("Last note ka answer (" + m[1] + ") working se match nahi karta (" + ref + ")");
      }
      return skipped;
    }
    /* ---- True / False ---- */
    if (ref === null) { errors.push("True/False: pehli line me aisi expression chahiye jiska maths verify ho sake (jaise \"(-1)^103 + (-1)^104 = 0\")"); return skipped; }
    if (qinfo && qinfo.tf && qinfo.left !== null) {
      if (!same(ref, qinfo.left)) errors.push("Plan ka left side (" + ref + ") question ke left side (" + qinfo.left + ") se match nahi karta");
      if (claim !== null && !same(claim, qinfo.right)) errors.push("Plan ka claimed number (" + claim + ") question ke number (" + qinfo.right + ") se match nahi karta");
      claim = qinfo.right;
    }
    if (claim === null) warnings.push("True/False: claimed number (= ke baad wala) verify nahi ho paya — pehli line me poora statement likho");
    if (!tfNote) { errors.push("True/False question: last step ke note me \"Answer: True\" ya \"Answer: False\" likho"); return skipped; }
    var said = tfNote[1].toLowerCase() === "true";
    if (claim !== null) {
      var truth = same(ref, claim);
      if (said !== truth) errors.push("Note \"Answer: " + tfNote[1] + "\" galat hai: left side = " + ref + ", claimed number = " + claim + ", isliye statement " + (truth ? "True" : "False") + " hai");
      var br = /answer\s*:\s*(?:true|false)\s*\(([^)]*)\)/i.exec(lastNote);
      if (br) {
        var seg = br[1].split(/(\u2260|!=|=)/);
        if (seg.length === 3) {
          var va = calcEx(seg[0]), vb = calcEx(seg[2]), eqOp = seg[1] === "=";
          if (va && vb && va.err === undefined && vb.err === undefined &&
              (!same(va.v, ref) || !same(vb.v, claim) || eqOp !== truth))
            errors.push("Note ke bracket (" + br[1].trim() + ") me left value " + ref + " aur claimed number " + claim + " ka sahi comparison nahi hai");
        }
      }
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

  /* Optional Assamese ("as") and Bengali ("bn") text. Plans made before this feature do not have it. Both use the Bengali-Assamese script block. */
  function optLangs(o, max, path, errors, warnings, spoken) {
    if (!o || typeof o !== "object") return;
    ["as", "bn"].forEach(function (k) {
      if (o[k] === undefined) return;
      if (!str(o[k], max, path + "." + k, errors, true) || !spoken) return;
      if (/[0-9]/.test(o[k])) warnings.push(path + "." + k + " me digits hain — numbers ko English words me likho (jaise minus three)");
      if (!/[\u0980-\u09FF]/.test(o[k])) warnings.push(path + "." + k + " Bengali-Assamese script me nahi hai");
    });
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

  /* opts.question (optional): the student's original question. Used for True/False plans: the validator compares the plan
     with the statement in the question, so the AI cannot change the numbers. */
  function validate(plan, opts) {
    var errors = [], warnings = [];
    if (!plan || typeof plan !== "object" || Array.isArray(plan)) return { errors: ["Plan ek JSON object hona chahiye"], warnings: warnings };
    str(plan.id, 80, "id", errors, true);
    var sci = plan.type === "science";   // science plans use the same steps and pen cues, but no number line and no arithmetic check
    if (plan.type !== "equation" && !sci) errors.push("type \"equation\" ya \"science\" hona chahiye");
    if (plan.version !== 1) errors.push("version 1 hona chahiye");
    langs(plan.title, ["en", "hg", "hi"], MAX_LEN, "title", errors);
    optLangs(plan.title, MAX_LEN, "title", errors, warnings, false);
    if (!Array.isArray(plan.steps) || plan.steps.length < 1 || plan.steps.length > MAX_STEPS) {
      errors.push("steps 1 se " + MAX_STEPS + " ke beech hone chahiye"); return { errors: errors, warnings: warnings };
    }
    plan.steps.forEach(function (st, i) {
      var p = "steps[" + (i + 1) + "]";
      if (!st || typeof st !== "object") { errors.push(p + ": object chahiye"); return; }
      langs(st.cap, ["en", "hg", "hi"], MAX_LEN, p + ".cap", errors);
      optLangs(st.cap, MAX_LEN, p + ".cap", errors, warnings, false);
      langs(st.say, ["en", "hi"], MAX_LEN, p + ".say", errors);
      optLangs(st.say, MAX_LEN, p + ".say", errors, warnings, true);
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
      if (sci && a.numberline !== undefined) errors.push(p + ".anim.numberline: science video me number line nahi chalti");
      checkVisuals(a, p + ".anim", errors);
    });
    if (!errors.length && sci) warnings.push("Science video: code sirf format check karta hai, facts verify nahi karta. Approve karne se pehle khud padho.");
    if (!errors.length && !sci) {
      var qinfo = opts && opts.question ? parseTF(opts.question) : null;
      var skipped = checkMath(plan, errors, warnings, qinfo);
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

  /* ---------- hidden question id (Copy question -> Get Video -> admin form) ----------
     "Copy question" puts the textbook question id in front of the text as invisible characters
     (4 kinds of invisible character = 2 bits each, so one letter = 4 of them, between two marks).
     Get Video cuts the id out again before anything else (library key, AI prompt), so those never see it.
     If an app strips invisible characters the question still works; only the admin auto-fill is lost. */
  var ZW = [0x200B, 0x200C, 0x200D, 0x2060].map(function (c) { return String.fromCharCode(c); }), ZW_MARK = String.fromCharCode(0xFEFF);   // 4 invisible characters (2 bits each) + one invisible mark
  var QID_RE = /^[A-Za-z0-9._:-]{1,40}$/;
  var TAG_RE = new RegExp(ZW_MARK + "([" + ZW.join("") + "]{4,160})" + ZW_MARK);
  function tagQuestion(text, id) {
    var s = String(text == null ? "" : text);
    if (!QID_RE.test(String(id || ""))) return s;
    var body = "";
    for (var i = 0; i < id.length; i++) { var c = id.charCodeAt(i); body += ZW[(c >> 6) & 3] + ZW[(c >> 4) & 3] + ZW[(c >> 2) & 3] + ZW[c & 3]; }
    return ZW_MARK + body + ZW_MARK + untagQuestion(s).text;
  }
  /* untagQuestion(text) -> { text: text without the hidden id, qid: "m7c1-a4" or "" } */
  function untagQuestion(text) {
    var s = String(text == null ? "" : text), m = TAG_RE.exec(s);
    if (!m) return { text: s, qid: "" };
    var clean = s.replace(m[0], ""), qid = "";
    if (m[1].length % 4 === 0) {
      for (var i = 0; i < m[1].length; i += 4) {
        var n = 0; for (var j = 0; j < 4; j++) n = (n << 2) | ZW.indexOf(m[1].charAt(i + j));
        qid += String.fromCharCode(n);
      }
    }
    return { text: clean, qid: QID_RE.test(qid) ? qid : "" };
  }

  /* Admin form fields for a textbook question. They give the SAME code the student's 3-dot menu looks for (mvCtx in mathvideo-player.js):
     Exercise = chapter number + "." + section number (1, 2, 3 ... in the order the chapter lists its sections), Question = the question number.
     info = { cls, subject, medium, chNo, secNo, qNo }. School is not known from the question, so the admin's remembered School stays.
     Returns null when something is missing. */
  function qFields(info) {
    if (!info || !info.chNo || !info.secNo || !info.qNo || !info.cls) return null;
    var subject = String(info.subject || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    return { cls: "class" + info.cls, subject: subject === "mathematics" ? "math" : subject, medium: String(info.medium || "English").toLowerCase() + "medium",
             ex: info.chNo + "." + info.secNo, q: String(info.qNo), part: "" };
  }

  /* ---------- "only an existing textbook question" check (client and server use this same function) ----------
     lines = the question's text lines: [text, ...parts, ...options]. The pasted text may be the whole question, or only some of its
     lines in the same order (for example the stem and part (ii)); the first line (the question itself) must always be there. Spaces and capital letters are ignored; any other change fails.
     Too-short text (under 6 characters once spaces are gone) never matches. */
  function linesMatch(pasted, lines) {
    var p = normQuestion(pasted);
    if (p.length < 6) return false;
    var L = (lines || []).map(normQuestion).filter(Boolean), memo = {};
    function go(i, pos) {                                   // can p from pos on be built from lines i, i+1... (each used at most once, in order)?
      if (pos === p.length) return true;
      if (i >= L.length) return false;
      var k = i + ":" + pos; if (memo[k] !== undefined) return memo[k];
      return (memo[k] = (p.indexOf(L[i], pos) === pos && go(i + 1, pos + L[i].length)) || (i > 0 && go(i + 1, pos)));   // line 0 (the question itself) can never be skipped
    }
    return go(0, 0);
  }

  /* ---------- admin panel ---------- */
  function h(tag, props, kids) {
    var e = document.createElement(tag);
    for (var k in (props || {})) { if (k === "text") e.textContent = props[k]; else if (k === "style") e.style.cssText = props[k]; else e[k] = props[k]; }
    (kids || []).forEach(function (c) { e.appendChild(c); });
    return e;
  }

  /* store = { get(code)->plan|null, set(code, plan), del(code), list()->[codes] }
     opts  = { preview(plan), qFields(qid), science: <store like mathVideo, for the science requests box> }  (optional: preview = apne player me plan chalane ke liye;
             qFields = textbook question id se form ke details nikalne ke liye, null de to auto-fill nahi hota) */
  function mountAdmin(el, store, opts) {
    opts = opts || {};
    el.textContent = "";
    var code = h("input", { placeholder: "code yahan apne aap ban jayega", style: "width:100%;padding:10px;margin:6px 0;box-sizing:border-box;font-family:monospace;font-size:13px" });
    var saved = {}; try { saved = JSON.parse(localStorage.getItem("mvAdminDefaults") || "{}"); } catch (e) {}
    var fields = {}, fbox = h("div", { style: "display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:6px 0" });
    function sync(noSave) {
      var f = {}; for (var k in fields) f[k] = fields[k].value;
      code.value = makeCode(f);
      if (noSave === true) return;   // auto-fill from a request must not change the admin's remembered defaults
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
    // Adds Assamese + Bengali text to the plan in the box (the server translates the English text). Read it, then Save / Approve as usual.
    if (opts.translate) btn("Assamese/Bengali text banao", function () {
      var plan; try { plan = JSON.parse(area.value); } catch (e) { say(["JSON galat hai: " + e.message]); return; }
      var r0 = validate(plan); if (r0.errors.length) { say(["Pehle plan valid karo:"].concat(r0.errors)); return; }
      say(["Assamese aur Bengali text ban raha hai… (20 se 50 second)"], true);
      opts.translate(plan).then(function (res) {
        area.value = JSON.stringify(res.plan, null, 2);
        var r1 = validate(res.plan);
        say(["Ban gaya: " + res.added.join(" + ").toUpperCase() + ". Padh kar check karo, phir Save / Approve dabao."].concat(r1.warnings.map(function (w) { return "Dhyan: " + w; })), true);
      }, function (e) { say(["Translate nahi hua: " + (e && e.message ? e.message : e)]); });
    });
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

    /* ---- student requests (Get Video): review, approve into the public library, or reject. One box for maths, one for science ---- */
    var autoFilled = false;   // true while the form holds details filled from a request's textbook id
    // The form must not keep the previous request's Exercise / Question behind.
    function clearAutoFill() { if (autoFilled) { fields.ex.value = ""; fields.q.value = ""; fields.part.value = ""; sync(true); autoFilled = false; } }
    // Maths only: a request that carries a textbook question id fills Class, Subject, Medium, Exercise, Question and the code. Returns a short note for the admin.
    function fillFromRequest(it) {
      var f = it.qid && opts.qFields ? opts.qFields(it.qid) : null;
      if (f) {
        ["cls", "subject", "medium", "ex", "q", "part"].forEach(function (k) {
          if (f[k] === undefined || !fields[k]) return;
          var ok = fields[k].tagName !== "SELECT" || Array.prototype.some.call(fields[k].options || [], function (o) { return o.value === f[k]; });
          if (ok) fields[k].value = f[k];
        });
        sync(true); autoFilled = true;
        return "\nTextbook question: " + it.qid + "\nCode apne aap bhar gaya: " + code.value + "\n(School check kar lo. Galat ho to form mein badal sakte ho.)";
      }
      clearAutoFill();
      return it.qid ? "\nTextbook question: " + it.qid + " (iske details apne aap nahi bhar paye, khud bharo)" : "";
    }
    function planOnly() {
      var p; try { p = JSON.parse(area.value); } catch (e) { say(["JSON galat hai: " + e.message]); return null; }
      var r = validate(p);
      if (r.errors.length) { say(["Nahi ho sakta:"].concat(r.errors)); return null; }
      say(["Valid hai (" + p.steps.length + " steps)"].concat(r.warnings.map(function (w) { return "Dhyan: " + w; })), true);
      return p;
    }
    // api = { pendingList, askedSet, pendingDel }; cfg = { heading, help, approveLabel, approvedMsg, fill(request) -> note }
    function mountPending(api, cfg) {
      var cur = null;
      var pbox = h("div", { style: "margin-top:18px;padding-top:12px;border-top:1px solid rgba(128,128,128,.35)" });
      var plist = h("div", { style: "display:flex;flex-direction:column;gap:6px;margin-top:8px" });
      var pq = h("div", { style: "font-size:13px;margin:8px 0;white-space:pre-wrap" });
      var pbar = h("div", { style: "display:flex;flex-wrap:wrap;gap:8px" });
      var pbtn = function (label, fn) { var b = h("button", { text: label, type: "button", style: "padding:10px 14px;border-radius:10px;border:0;background:rgba(128,128,128,.18);color:inherit;cursor:pointer" }); b.onclick = fn; pbar.appendChild(b); };
      var prefresh = function () {
        api.pendingList().then(function (items) {
          plist.textContent = "";
          items.forEach(function (it) {
            var b = h("button", { text: (it.qid ? "[" + it.qid + "] " : "") + String(it.text || "").slice(0, 80), type: "button", style: "text-align:left;padding:8px 10px;border-radius:10px;border:0;background:rgba(128,128,128,.14);color:inherit;font-size:13px;cursor:pointer" });
            b.onclick = function () { cur = it; pq.textContent = "Student ka question:\n" + it.text + cfg.fill(it); area.value = JSON.stringify(it.plan, null, 2); say(["Request load hui. Preview dekho, phir Approve ya Reject."], true); };
            plist.appendChild(b);
          });
          if (!items.length) plist.textContent = "Abhi koi pending request nahi.";
        }, function (e) { plist.textContent = "Pending list load nahi hui: " + (e && e.message ? e.message : e); });
      };
      if (opts.preview) pbtn("Preview", function () { var p = planOnly(); if (p) opts.preview(p); });
      pbtn(cfg.approveLabel, function () {
        if (!cur) return say(["Pehle list se ek request chuno"]);
        var p = planOnly(); if (!p) return;
        var id = cur.id, text = cur.text;
        api.askedSet(id, text, p).then(function () { return api.pendingDel(id); }).then(function () {
          say([cfg.approvedMsg], true); cur = null; pq.textContent = ""; prefresh();
        }, function (e) { say(["Approve fail: " + (e && e.message ? e.message : e)]); });
      });
      pbtn("Reject (delete)", function () {
        if (!cur) return say(["Pehle list se ek request chuno"]);
        if (!confirm("Ye request delete karni hai?")) return;
        var id = cur.id;
        api.pendingDel(id).then(function () { say(["Request delete ho gayi."], true); cur = null; pq.textContent = ""; prefresh(); }, function (e) { say(["Delete fail: " + (e && e.message ? e.message : e)]); });
      });
      pbtn("Refresh", prefresh);
      [h("h3", { text: cfg.heading }), h("div", { text: cfg.help, style: "font-size:12px;margin-top:4px" }), plist, pq, pbar].forEach(function (n) { pbox.appendChild(n); });
      el.appendChild(pbox);
      prefresh();
    }
    if (store.pendingList) mountPending(store, {
      heading: "Student requests (pending)", fill: fillFromRequest, approveLabel: "Approve for Get Video",
      help: "Approve = Get Video library mein jata hai. Textbook question ke menu mein bhi dalna ho to upar code bharke Save dabao.",
      approvedMsg: "Approved. Ab ye question paste karne par sabhi students ko turant milega."
    });
    if (opts.science && opts.science.pendingList) mountPending(opts.science, {
      heading: "Science requests (pending)", approveLabel: "Approve for Science Video",
      help: "Approve = Science Get Video library mein jata hai. Science ke facts code se verify nahi hote, approve se pehle khud padho.",
      fill: function (it) { clearAutoFill(); return it.qid ? "\nTextbook question: " + it.qid : ""; },
      approvedMsg: "Approved. Ab ye science question paste karne par sabhi students ko turant milega."
    });
    // extra panels (AI narration) get the lesson code and the validated plan of this panel
    if (typeof opts.extra === "function") opts.extra({ el: el, getCode: function () { return code.value.trim(); }, getPlan: planOnly });
  }

  var api = { validate: validate, mountAdmin: mountAdmin, makeCode: makeCode, calc: calc, calcEx: calcEx, prepQuestion: prepQuestion, normQuestion: normQuestion, parseTF: parseTF, isTrueFalse: isTrueFalse, tagQuestion: tagQuestion, untagQuestion: untagQuestion, qFields: qFields, linesMatch: linesMatch, CODE_RE: CODE_RE };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else g.MathVideo = api;
})(typeof window !== "undefined" ? window : globalThis);
