/* plan.js - the optional FREE PLAN on the student's screen (server side: plan-core.js, switched on with Render env FREE_PLAN=on).
 *
 * While the plan is on and the student has no Plus: a small "Free 09:42" countdown in the top-right corner, a lock on chapters after the free ones,
 * a "free time over" page, and a Free vs Plus page ("Orbit Plus") whose button starts the existing Razorpay payment (OrbitPay.start()).
 * The two pages are normal app views (VIEW 'planover' / 'plan', like the Exam pages): the app header and the prompt box stay on screen.
 * If the app can not open a view (Kid mode) the old bottom sheets are used, so the wall never disappears.
 * With FREE_PLAN off the server answers { on:false } and this file does nothing at all.
 *
 * The time is counted by the server (POST /api/plan/tick every 15 seconds while the app is visible and the student is active).
 * The countdown here is only a display; the real locks are the 402 answers of the server (plan_time_over / plan_locked).
 * The free chapters are counted by POSITION in the course (the first chapter of every class and subject is free), exactly like the server does it,
 * so a course whose first chapter is numbered 2 (for example Class 7 Maths, Assamese) still opens its first chapter.
 * It does not touch any existing screen: it only adds its own elements and watches the chapter list. The pages are strings with every value escaped.
 */
(function (g) {
  "use strict";
  function fmt(s) { s = Math.max(0, Math.floor(s)); var m = Math.floor(s / 60), r = s % 60; return (m < 10 ? "0" : "") + m + ":" + (r < 10 ? "0" : "") + r; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  // What the Free and Plus cards say. One place, used by the page and by the fallback sheet.
  function lines(st) {
    var mins = Math.round((st.seconds || 600) / 60), ch = st.chapters || 1;
    return {
      mins: mins,
      free: ["Roz " + mins + " minute", ch === 1 ? "Sirf Chapter 1" : "Pehle " + ch + " chapters", "AI Answer, translation, diagram, Get Video"],
      plus: ["Unlimited study time", "Saare chapters", "Saare video lessons", "Study-time alert (father ke phone par)"]
    };
  }

  var CLOCK = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path></svg>';

  // "Aaj ka free time khatam" page.
  function overHTML() {
    return '<div class="soon" style="margin-top:90px">' + CLOCK +
      '<h2 style="font-size:28px;margin:18px 0 0;color:var(--tx)">Aaj ka free time khatam</h2>' +
      '<p style="font-size:18px">Kal phir aao, ya Plus lo.</p>' +
      '<button type="button" class="btn" data-plan="plans" style="padding:16px 50px;font-size:20px;margin-top:22px;border-radius:14px">Plus lo</button>' +
      '<p style="font-size:15px;margin-top:20px">Jo answers device mein saved hai, wo offline dekh sakte ho.</p></div>';
  }

  // "Orbit Plus" page: Free card, Plus card, Plus lo button. st = { seconds, chapters, plus, pay: { enabled, rupees, days }, canPay }.
  function plansHTML(st) {
    var L = lines(st), pay = st.pay || {}, can = !!pay.enabled && st.canPay !== false;
    var li = function (a) { return a.map(function (t) { return "<li>" + esc(t) + "</li>"; }).join(""); };
    var ul = 'style="margin:12px 0 0;padding-left:20px;line-height:1.9"', row = 'style="display:flex;justify-content:space-between;align-items:baseline"';
    var price = pay.enabled ? '<span><b style="font-size:24px">Rs ' + esc(pay.rupees) + '</b> <span class="mut" style="font-size:15px">/ ' + esc(pay.days) + ' din</span></span>' : "";
    return '<h1 style="font-size:30px;margin-top:10px">Orbit Plus</h1>' +
      '<p class="mut" style="font-size:16px;margin:10px 0 0">Free mein roz ' + L.mins + ' minute. Plus mein koi limit nahi.</p>' +
      '<div class="card" style="margin-top:18px"><div ' + row + '><b style="font-size:20px">Free</b><span class="mut" style="font-size:16px">Rs 0</span></div><ul ' + ul + '>' + li(L.free) + '</ul>' +
      (st.plus ? "" : '<p class="mut" style="margin:10px 0 0">Aapka current plan</p>') + '</div>' +
      '<div class="card" style="box-shadow:0 0 0 2px var(--on)"><div ' + row + '><b style="font-size:20px">Plus</b>' + price + '</div><ul ' + ul + '>' + li(L.plus) + '</ul>' +
      '<button type="button" class="btn" data-plan="buy" style="width:100%;padding:14px 16px;margin-top:14px;font-size:18px"' + (can ? "" : " disabled") + '>Plus lo</button>' +
      '<p class="mut" style="font-size:13px;text-align:center;margin:10px 0 0">' + esc(pay.enabled ? "UPI, card, netbanking (Razorpay)" : "Payment abhi shuru nahi hua hai.") + '</p></div>';
  }

  var T = { fmt: fmt, esc: esc, lines: lines, overHTML: overHTML, plansHTML: plansHTML };
  if (typeof document === "undefined") { if (typeof module !== "undefined" && module.exports) module.exports = { _t: T }; return; }

  // The lock icon is built with DOM calls (the app forbids innerHTML assignments in client files).
  function lockIcon() {
    var NS = "http://www.w3.org/2000/svg";
    function el(tag, attrs) { var e = document.createElementNS(NS, tag); for (var k in attrs) e.setAttribute(k, attrs[k]); return e; }
    var svg = el("svg", { viewBox: "0 0 24 24", width: "20", height: "20", fill: "none", stroke: "currentColor", "stroke-width": "1.75", "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": "true" });
    svg.appendChild(el("rect", { x: "4", y: "11", width: "16", height: "10", rx: "2" }));
    svg.appendChild(el("path", { d: "M8 11V7a4 4 0 0 1 8 0v4" }));
    return svg;
  }
  var S = { on: false, plus: false, left: 0, seconds: 600, chapters: 1, pay: {}, unsent: 0, active: Date.now(), busy: false, shown: false, ready: false };
  var timerEl = null, sheet = null, origFetch = g.fetch ? g.fetch.bind(g) : null;

  function user() { return g.orbitUser ? g.orbitUser() : null; }
  function limited() { return S.on && !S.plus && !!user(); }
  function h(tag, props, kids) {
    var e = document.createElement(tag);
    for (var k in (props || {})) { if (k === "text") e.textContent = props[k]; else if (k === "style") e.style.cssText = props[k]; else e[k] = props[k]; }
    (kids || []).forEach(function (c) { if (c) e.appendChild(c); });
    return e;
  }

  // Own calls use the original fetch, so the 402 watcher below never reacts to them twice.
  function call(path) {
    if (!origFetch || !g.CLOUD || !g.CLOUD.token) return Promise.reject(new Error("no cloud"));
    var body = arguments[1] || {};
    return g.CLOUD.token().then(function (tok) {
      if (!tok) throw new Error("not logged in");
      return origFetch((g.ORBIT_API || "") + path, { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + tok }, body: JSON.stringify(body), signal: AbortSignal.timeout(20000) });
    }).then(function (r) { return r.json().then(function (j) { if (!r.ok) { var e = new Error(j.error || "error"); e.code = j.code; throw e; } return j; }); });
  }

  function apply(j) {
    if (!j || !j.on) { S.on = false; draw(); return; }
    var was = S.plus;
    S.on = true; S.plus = !!j.plus; S.seconds = j.seconds || 600; S.chapters = j.chapters || 1; S.pay = j.pay || {};
    S.left = S.plus ? 0 : (j.left == null ? S.left : j.left);
    if (S.left > 0) S.shown = false;
    S.ready = true; draw();
    if (S.plus && !was && g.orbitRedraw) g.orbitRedraw();   // a student who just got Plus: the chapter list is drawn again without the locks
  }
  function refresh() { if (!user()) return Promise.resolve(); return call("/api/plan").then(apply).catch(function () {}); }

  // ---- the small countdown (fixed in the top-right corner, so it survives every redraw of the app) ----
  function draw() {
    if (!timerEl) {
      timerEl = h("button", { type: "button", id: "plan-timer", style: "position:fixed;top:calc(28px + env(safe-area-inset-top,0px));right:14px;z-index:850;border:0;background:none;padding:2px 4px;font:12px system-ui,sans-serif;color:var(--mut,#777);font-variant-numeric:tabular-nums;cursor:pointer" });
      timerEl.setAttribute("aria-label", "Free time baaki. Plan dekhne ke liye dabao");
      timerEl.onclick = showPlans;
      document.body.appendChild(timerEl);
    }
    var on = limited();
    timerEl.style.display = on ? "block" : "none";
    if (on) timerEl.textContent = "Free " + fmt(S.left);
    decorate();
  }

  // ---- lock icon on the chapters after the free ones; tapping one opens the plan sheet instead of the chapter ----
  var st = document.createElement("style");
  st.textContent = 'button.row[data-plan-lock="1"]{opacity:.55}';
  document.head.appendChild(st);
  // 1-based place of a chapter row in its list (the same count as the server's chapterNo: the position in the course, not the chapter number).
  function position(row) {
    var p = row.parentNode, n = 0;
    if (!p) return 0;
    for (var k = 0; k < p.children.length; k++) {
      var c = p.children[k];
      if (c.tagName === "BUTTON" && c.classList.contains("row")) { n++; if (c === row) return n; }
    }
    return 0;
  }
  T.position = position;
  function decorate() {
    var rows = document.querySelectorAll('#app button.row[data-p="chapter"]');
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i], n = position(row), lock = limited() && n > S.chapters;
      if (lock && row.getAttribute("data-plan-lock") !== "1") {
        row.setAttribute("data-plan-lock", "1");
        var go = row.querySelector(".rgo"); if (go) { while (go.firstChild) go.removeChild(go.firstChild); go.appendChild(lockIcon()); }
      }
    }
  }
  g.addEventListener("click", function (e) {
    var row = e.target && e.target.closest ? e.target.closest('button.row[data-plan-lock="1"]') : null;
    if (!row || !limited()) return;
    e.preventDefault(); e.stopImmediatePropagation();
    sayWall("chapter");
  }, true);
  if (typeof MutationObserver !== "undefined") {
    var pend = false;
    new MutationObserver(function () { if (pend) return; pend = true; (g.requestAnimationFrame || setTimeout)(function () { pend = false; decorate(); }); })
      .observe(document.body, { childList: true, subtree: true });
  }

  // ---- sheets ----
  function closeSheet() { if (sheet) { sheet.remove(); sheet = null; } }
  function openSheet(box) {
    closeSheet();
    sheet = h("div", { style: "position:fixed;inset:0;z-index:2900;background:rgba(0,0,0,.45);display:flex;align-items:flex-end;justify-content:center" }, [box]);
    sheet.setAttribute("role", "dialog");
    sheet.onclick = function (e) { if (e.target === sheet) closeSheet(); };
    document.body.appendChild(sheet);
  }
  var BOX = "background:var(--bg,#f4f2ec);color:var(--tx,#111);width:100%;max-width:480px;max-height:92vh;overflow:auto;border-radius:20px 20px 0 0;padding:20px;padding-bottom:calc(20px + env(safe-area-inset-bottom,0px));box-sizing:border-box;font-family:system-ui,sans-serif";
  function muted(t, extra) { return h("p", { text: t, style: "color:var(--mut,#666);margin:6px 0 0;" + (extra || "") }); }

  // The two pages are app views (go('plan') / go('planover')); false when the app did not open them (Kid mode), then the sheets below are used.
  function openView(v) {
    if (typeof g.orbitGo !== "function") return false;
    closeSheet();
    try { g.orbitGo(v); } catch (e) { return false; }
    return !!g.orbitView && g.orbitView() === v;
  }
  function viewHTML(view) {
    if (!S.on) return "";
    return view === "planover" ? overHTML() : plansHTML({ seconds: S.seconds, chapters: S.chapters, plus: S.plus, pay: S.pay, canPay: !!g.OrbitPay });
  }

  function sayWall(kind) {
    var time = kind === "time";
    if (time && openView("planover")) return;
    var plus = h("button", { type: "button", text: "Plus lo", className: "btn", style: "padding:12px 26px" });
    plus.onclick = showPlans;
    var ok = h("button", { type: "button", text: "Theek hai", style: "border:0;background:none;color:var(--mut,#666);font-size:15px;padding:12px 16px;cursor:pointer" });
    ok.onclick = closeSheet;
    openSheet(h("div", { style: BOX + ";text-align:center" }, [
      h("h2", { text: time ? "Aaj ka free time khatam" : "Ye chapter Plus mein hai", style: "margin:4px 0 0;font-size:21px" }),
      muted(time ? "Kal phir aao, ya Plus lo." : "Free plan mein sirf " + (S.chapters === 1 ? "pehla chapter" : "pehle " + S.chapters + " chapters") + " khula hai."),
      time ? muted("Jo answers device mein saved hai, wo offline dekh sakte ho.", "font-size:13px") : null,
      h("div", { style: "display:flex;gap:6px;justify-content:center;align-items:center;margin-top:16px" }, [plus, ok])
    ]));
  }

  function card(title, price, lines, extra, strong) {
    return h("div", { className: "card", style: strong ? "box-shadow:0 0 0 2px var(--tx,#111)" : "" }, [
      h("div", { style: "display:flex;justify-content:space-between;align-items:baseline" }, [h("b", { text: title, style: "font-size:18px" }), h("span", { text: price, style: "color:var(--mut,#666)" })]),
      h("ul", { style: "margin:10px 0 0;padding-left:18px;line-height:1.9" }, lines.map(function (t) { return h("li", { text: t }); })),
      extra
    ]);
  }
  function showPlans() {
    if (openView("plan")) return;
    var L = lines(S), mins = L.mins, pay = S.pay || {};
    var buy = h("button", { type: "button", text: "Plus lo", className: "btn", style: "width:100%;padding:13px 16px;margin-top:12px" });
    var note = h("p", { text: pay.enabled ? "UPI, card, netbanking (Razorpay)" : "Payment abhi shuru nahi hua hai.", style: "color:var(--mut,#666);font-size:12px;text-align:center;margin:8px 0 0" });
    if (!pay.enabled || !g.OrbitPay) buy.disabled = true;
    buy.onclick = function () { closeSheet(); if (g.OrbitPay) g.OrbitPay.start(); };
    var free = card("Free", "Rs 0", L.free, S.plus ? null : h("p", { text: "Aapka current plan", style: "color:var(--mut,#666);margin:8px 0 0" }));
    var plus = card("Plus", pay.enabled ? "Rs " + pay.rupees + " / " + pay.days + " din" : "", L.plus, h("div", null, [buy, note]), true);
    var close = h("button", { type: "button", text: "Band karo", style: "border:0;background:none;color:var(--mut,#666);font-size:15px;padding:12px;width:100%;cursor:pointer" });
    close.onclick = closeSheet;
    openSheet(h("div", { style: BOX }, [h("h2", { text: "Orbit Plus", style: "margin:4px 0 0;font-size:24px" }), muted("Free mein roz " + mins + " minute. Plus mein koi limit nahi."), free, plus, close]));
  }

  // ---- the server's 402 answers (plan_time_over / plan_locked) from any existing request show the sheet ----
  if (origFetch) {
    g.fetch = function () {
      return origFetch.apply(g, arguments).then(function (r) {
        if (r && r.status === 402) r.clone().json().then(function (j) {
          if (j && j.code === "plan_time_over") { S.left = 0; S.shown = true; draw(); sayWall("time"); }
          else if (j && j.code === "plan_locked") sayWall("chapter");
        }).catch(function () {});
        return r;
      });
    };
  }

  // ---- heartbeat: 1 second ticks; every 15 active seconds the server is told and answers with the real time left ----
  ["pointerdown", "keydown", "touchstart", "scroll"].forEach(function (ev) { g.addEventListener(ev, function () { S.active = Date.now(); }, { capture: true, passive: true }); });
  function send() {
    var n = S.unsent; S.unsent = 0; S.busy = true;
    call("/api/plan/tick", { seconds: n }).then(apply).catch(function () { S.unsent += n; }).then(function () { S.busy = false; });
  }
  setInterval(function () {
    if (!limited()) { draw(); return; }
    var live = document.visibilityState === "visible" && Date.now() - S.active < 60000;
    if (live && S.left > 0) { S.left--; S.unsent++; }
    if (!S.busy && (S.unsent >= 15 || (S.left === 0 && S.unsent > 0))) send();
    if (S.left === 0 && !S.shown) { S.shown = true; sayWall("time"); }
    draw();
  }, 1000);

  // first read when somebody is logged in (and again when the tab comes back, and after a payment)
  var waits = 0;
  (function first() { if (user()) { refresh(); return; } if (++waits < 120) setTimeout(first, 1500); })();
  document.addEventListener("visibilitychange", function () { if (document.visibilityState === "visible") refresh(); });
  g.addEventListener("orbit-paid", function () {
    closeSheet();
    setTimeout(function () {
      refresh().then(function () {
        var v = g.orbitView ? g.orbitView() : "";
        if (S.plus && (v === "plan" || v === "planover") && g.orbitGo) g.orbitGo("home");   // the wall page is no longer needed
      });
    }, 1500);
  });

  // buttons of the two pages
  document.addEventListener("click", function (e) {
    var b = e.target && e.target.closest ? e.target.closest("[data-plan]") : null;
    if (!b || b.disabled) return;
    var a = b.getAttribute("data-plan");
    if (a === "plans") showPlans();
    else if (a === "buy" && g.OrbitPay) g.OrbitPay.start();
  });

  g.PLAN = { refresh: refresh, showPlans: showPlans, viewHTML: viewHTML, state: S, _t: T };
  if (typeof module !== "undefined" && module.exports) module.exports = g.PLAN;
})(typeof window !== "undefined" ? window : globalThis);
