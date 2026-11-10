/* analytics.js - Google Analytics 4 + Microsoft Clarity for Orbit Tutorial.
 *
 * SETUP: paste your two IDs below, deploy hosting. While an ID is empty, that tool is simply not loaded.
 *   GA4_ID      GA4 > Admin > Data streams > your web stream > "Measurement ID" (looks like G-ABC123XYZ9)
 *   CLARITY_ID  Clarity > your project > Settings > Overview > "Project ID" (10 letters/digits)
 *
 * What it records
 *   - A "page_view" every time the student moves to a new screen (the app is one page, so we send these ourselves):
 *     login gate, home, class/subject picker, chapter list, a chapter, favourites, settings, Public Videos ...
 *   - Click events: ai_answer, save_answer, translate, diagram, listen, copy_answer, pin_question, video_play,
 *     public_video_open, get_video_generate, login_click, login ... (see EVENTS below). Only ids and numbers are sent
 *     (question id, course id, chapter number), never question text, answers, names or e-mails.
 * Privacy choices
 *   - No user id is sent to GA4, Google signals and ad personalisation are off, ad consent is denied.
 *   - The admin's own visits are not counted (tools start only after login state is known, and not for admin accounts).
 *   - Nothing runs on localhost / file://.
 *   - Profile block and the Get Video text box carry data-clarity-mask="true" (index.html). In Clarity set
 *     Settings > Masking to "Strict" as well.
 */
(function (g) {
  "use strict";
  var GA4_ID = "G-4ML4HZNZCQ";   // GA4 Measurement ID (property orbitai-9feb8)
  var CLARITY_ID = "zbdsqya72b";   // Clarity project "Orbit Tutorial"

  var LOCAL = /^(localhost|127\.|0\.0\.0\.0|\[::1\])/.test(location.hostname) || location.protocol === "file:";
  var started = false, off = LOCAL, last = "", queue = [], pendingLogin = false;

  var EVENTS = {
    ask: "ai_answer", re: "ai_answer", like: "save_answer", cp: "copy_answer", qcp: "copy_question",
    tr: "translate", trset: "translate", qtr: "translate_question", qtrset: "translate_question",
    vis: "diagram", visre: "diagram", say: "listen", pin: "pin_question", mk: "more_explain", xre: "more_explain",
    vid: "video_play", pvopen: "public_video_open", gvgo: "get_video_generate", login: "login_click", lock: "locked_chapter_tap"
  };

  function isAdmin() { return !!(g.QVideo && g.QVideo.isAdmin && g.QVideo.isAdmin()); }

  function loadGA() {
    g.dataLayer = g.dataLayer || [];
    g.gtag = function () { g.dataLayer.push(arguments); };
    g.gtag("consent", "default", { ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied", analytics_storage: "granted" });
    g.gtag("js", new Date());
    g.gtag("config", GA4_ID, { send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false });
    var s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(GA4_ID);
    document.head.appendChild(s);
  }
  function loadClarity() {
    (function (c, l, a, r, i, t, y) {
      c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
      t = l.createElement(r); t.async = 1; t.src = "https://www.clarity.ms/tag/" + i;
      y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
    })(g, document, "clarity", "script", CLARITY_ID);
  }

  // run fn now, or after the tools have started (login state is known first, so the admin can be left out)
  function defer(fn) {
    if (off) return;
    if (!started) { if (queue.length < 60) queue.push(fn); return; }
    try { fn(); } catch (e) {}
  }
  function start(admin) {
    if (started) return;
    started = true;
    if (LOCAL || admin) { off = true; queue = []; return; }
    if (GA4_ID) loadGA();
    if (CLARITY_ID) loadClarity();
    var q = queue; queue = [];
    q.forEach(function (fn) { try { fn(); } catch (e) {} });
  }

  function ga(name, params) { if (GA4_ID && g.gtag) g.gtag("event", name, params || {}); }
  function cl() { if (CLARITY_ID && g.clarity) g.clarity.apply(g, arguments); }

  function track(name, params) {
    defer(function () { ga(name, params); cl("event", name); });
  }

  // o = { name, org, cls, sub, med, ch }  (see screenInfo() in index.html)
  function screen(o) {
    if (!o || !o.name) return;
    var parts = [o.name, o.org, o.cls ? "class-" + o.cls : "", o.sub, o.med, o.ch ? "ch-" + o.ch : ""]
      .filter(Boolean).map(function (x) { return encodeURIComponent(String(x).toLowerCase().replace(/\s+/g, "-")); });
    var path = "/" + parts.join("/");
    if (path === last) return;
    last = path;
    defer(function () {
      var p = { page_path: path, page_location: location.origin + path, page_title: o.name };
      if (o.cls) p.class_no = o.cls;
      if (o.sub) p.subject = o.sub;
      if (o.med) p.medium = o.med;
      if (o.ch) p.chapter = o.ch;
      ga("page_view", p);
      cl("set", "screen", o.name);
      if (o.cls) cl("set", "class", String(o.cls));
      if (o.sub) cl("set", "subject", String(o.sub));
    });
  }

  // called from the click handler in index.html for every [data-act] button
  function act(a, id, ds) {
    if (a === "login") pendingLogin = true;
    var n = EVENTS[a];
    if (!n) return;
    ds = ds || {};
    var p = {};
    if (a === "vid" || a === "pvopen") { if (id) p.video_id = String(id).slice(0, 60); }
    else if (id) {
      p.question_id = String(id).slice(0, 40);
      var q = g.orbitQ && g.orbitQ(id);
      if (q) { p.course = q.courseId; p.chapter = q.chapter; }
    }
    if (a === "re") p.regenerate = 1;
    if (a === "mk" || a === "xre") p.kind = ds.k;
    if (a === "trset" || a === "qtrset") p.language = ds.to || "original";
    if (a === "lock") p.chapter = ds.ch;
    track(n, p);
  }

  // called from onCloudUser (index.html) once Firebase knows who is logged in (u = null if nobody)
  function userKnown(u) {
    var admin = isAdmin();
    if (!started) start(admin);
    else if (admin) { off = true; if (GA4_ID) g["ga-disable-" + GA4_ID] = true; }
    if (off) return;
    if (u && pendingLogin) { pendingLogin = false; track("login", { method: "Google" }); }
    defer(function () {
      if (GA4_ID && g.gtag) g.gtag("set", "user_properties", { logged_in: u ? "yes" : "no" });
      cl("set", "logged_in", u ? "yes" : "no");
    });
  }

  // If Firebase never answers (offline, blocked), start anyway after 5 seconds.
  setTimeout(function () { if (!started) start(isAdmin()); }, 5000);

  g.Analytics = { screen: screen, act: act, userKnown: userKnown, track: track };
})(window);
