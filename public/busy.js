// Orbit "Busy" indicator: the student must always be able to tell "loading" from "hung".
// While anything is waiting on the network (any fetch to Orbit's own server, any cloud call) this shows
//   1. a thin moving bar at the top of the screen, and
//   2. a small pill at the bottom: what is loading + a seconds counter that keeps ticking (a ticking counter proves the app is alive).
// After 8 s the pill says the server may be waking up; after 30 s it tells the student to check the internet or refresh.
// Nothing shows for requests that finish within 350 ms, so quick taps do not flicker.
// Needs no library. All text goes in with textContent (no innerHTML).
//   BUSY.begin(label) -> end()      manual start/stop for anything else
//   BUSY.track(promise, label)      shows the loader until the promise settles
//   BUSY.wrapCloud()                wraps every promise-returning window.CLOUD method (called once from index.html)
//   BUSY.endBoot()                  the first-start "Orbit khul raha hai" entry ends when login state is known
(function (g) {
  'use strict';
  const doc = g.document;
  const SHOW_AFTER = 350, SLOW_AFTER = 8000, LONG_AFTER = 30000, EXPIRE = 120000;   // ms; an entry never stays longer than EXPIRE, so the loader can never get stuck

  const N = (hing, en) => ({ hing, en });
  const TX = {
    load: N('Load ho raha hai', 'Loading'),
    boot: N('Orbit khul raha hai', 'Orbit is starting'),
    answer: N('Answer ban raha hai', 'Making the answer'),
    tr: N('Anuvaad ho raha hai', 'Translating'),
    vis: N('Diagram ban raha hai', 'Making the diagram'),
    video: N('Video load ho raha hai', 'Loading the video'),
    qs: N('Questions load ho rahe hain', 'Loading the questions'),
    img: N('Tasveer aa rahi hai', 'Loading the picture'),
    notes: N('Notes load ho rahe hain', 'Loading the notes'),
    save: N('Save ho raha hai', 'Saving'),
    slow: N('Server jaag raha hai, thoda ruko', 'The server is waking up, please wait'),
    long: N('Bahut der lag rahi hai. Internet check karo ya page refresh karo', 'This is taking very long. Check your internet or refresh the page'),
    off: N('Internet nahi hai', 'You are offline')
  };
  const lang = () => { try { return (g.orbitLang && g.orbitLang()) === 'en' ? 'en' : 'hing'; } catch (e) { return 'hing'; } };
  const T = k => TX[k][lang()] || TX[k].hing;

  // which words go with which address
  const LABELS = [[/\/api\/(translate|qtranslate|lesson|rules)\b/, 'tr'], [/\/api\/visual\b/, 'vis'], [/\/api\/(answer|review)\b/, 'answer'], [/\/api\/video\b|videos\.json$|publicvideos\.json$/, 'video'],
    [/questions\.json$|\/api\/questions\b/, 'qs'], [/\/api\/image\b/, 'img'], [/free-notes\.json$/, 'notes']];
  const labelFor = p => { for (const x of LABELS) if (x[0].test(p)) return x[1]; return 'load'; };
  // background calls the student never waits for
  const QUIET = /\/api\/ping$|analytics|beacon|\/api\/(track|event|log)\b/;

  const E = new Map();   // id -> { key, text, t0, kill }
  let seq = 0, tick = 0, bar = null, pill = null, txt = null, shown = false, lastText = '';

  function css() {
    if (!doc || doc.getElementById('busy-css')) return;
    const s = doc.createElement('style'); s.id = 'busy-css';
    s.textContent = '#busy-bar{position:fixed;top:0;left:0;right:0;height:3px;z-index:9999;overflow:hidden;pointer-events:none;opacity:0;transition:opacity .2s}'
      + '#busy-bar.on{opacity:1}'
      + '#busy-bar i{position:absolute;top:0;bottom:0;width:40%;background:#16a34a;border-radius:3px;animation:busyslide 1.1s ease-in-out infinite}'
      + '#busy-pill{position:fixed;left:50%;bottom:calc(16px + env(safe-area-inset-bottom,0px));transform:translate(-50%,20px);opacity:0;max-width:min(92vw,440px);z-index:9999;pointer-events:none;display:flex;gap:10px;align-items:center;'
      + 'background:var(--card,#fff);color:var(--tx,#111);border:1px solid var(--ln,#ddd);border-radius:22px;padding:8px 14px;font-size:14px;line-height:1.3;box-shadow:0 4px 18px rgba(0,0,0,.18);transition:opacity .2s,transform .2s}'
      + '#busy-pill.on{opacity:1;transform:translate(-50%,0)}#busy-pill.slow{border-color:#f59e0b}#busy-pill.long,#busy-pill.off{border-color:#dc2626}'
      + '.busy-spin{display:inline-block;flex:none;width:14px;height:14px;border:2px solid var(--ln,#ccc);border-top-color:#16a34a;border-radius:50%;animation:busyspin .8s linear infinite;vertical-align:-2px;margin-right:6px}'
      + '#busy-pill .busy-spin{margin:0}'
      + '@keyframes busyslide{0%{left:-40%}100%{left:100%}}@keyframes busyspin{to{transform:rotate(360deg)}}'
      + '@media(prefers-reduced-motion:reduce){#busy-bar i{animation:none;left:0;width:100%;opacity:.6}.busy-spin{animation:none}}';
    doc.head.appendChild(s);
  }
  function ui() {
    if (bar || !doc || !doc.body) return !!bar;
    css();
    bar = doc.createElement('div'); bar.id = 'busy-bar'; bar.setAttribute('aria-hidden', 'true'); bar.appendChild(doc.createElement('i'));
    pill = doc.createElement('div'); pill.id = 'busy-pill'; pill.setAttribute('role', 'status'); pill.setAttribute('aria-live', 'polite');
    const sp = doc.createElement('span'); sp.className = 'busy-spin'; sp.setAttribute('aria-hidden', 'true');
    txt = doc.createElement('span'); pill.appendChild(sp); pill.appendChild(txt);
    doc.body.appendChild(bar); doc.body.appendChild(pill);
    return true;
  }

  // what the pill says right now (pure: tests call BUSY._message)
  function message(list, now, online) {
    if (!list.length) return null;
    const old = list.reduce((a, b) => (b.t0 < a.t0 ? b : a)), ms = now - old.t0, sec = Math.floor(ms / 1000);
    if (online === false) return { cls: 'off', text: T('off') + '…' };
    const more = list.length > 1 ? ' (+' + (list.length - 1) + ')' : '';
    if (ms >= LONG_AFTER) return { cls: 'long', text: T('long') + ' · ' + sec + 's' };
    if (ms >= SLOW_AFTER) return { cls: 'slow', text: T('slow') + '… ' + sec + 's' };
    return { cls: '', text: T(old.key) + '…' + more + ' ' + sec + 's' };
  }
  function render() {
    const now = Date.now(), vis = [...E.values()].filter(x => now - x.t0 >= SHOW_AFTER);
    if (!vis.length) { hide(); return; }
    if (!ui()) return;
    const m = message(vis, now, g.navigator ? g.navigator.onLine : true);
    pill.className = (m.cls ? m.cls + ' ' : '') + 'on'; bar.className = 'on'; shown = true;
    if (m.text !== lastText) { txt.textContent = m.text; lastText = m.text; }
  }
  function hide() { if (!shown) return; shown = false; lastText = ''; if (pill) pill.className = ''; if (bar) bar.className = ''; }
  function ensureTick() { if (!tick && E.size) tick = setInterval(() => { const now = Date.now(); E.forEach((x, id) => { if (now - x.t0 >= EXPIRE) end(id); }); render(); if (!E.size) stopTick(); }, 500); }
  function stopTick() { if (tick) { clearInterval(tick); tick = 0; } }
  function end(id) { if (!E.delete(id)) return; if (!E.size) { stopTick(); hide(); } else render(); }

  function begin(key) {
    const id = ++seq; E.set(id, { key: TX[key] ? key : 'load', t0: Date.now() });
    ensureTick(); setTimeout(render, SHOW_AFTER + 20);
    return () => end(id);   // calling it twice is harmless
  }
  const track = (p, key) => { const done = begin(key); if (p && typeof p.then === 'function') p.then(done, done); else done(); return p; };

  // ---- every fetch to Orbit's own server ----
  function wantFetch(input, init) {
    try {
      const raw = typeof input === 'string' ? input : (input && input.url) || '';
      const u = new URL(raw, g.location.href);
      const api = g.ORBIT_API ? new URL(g.ORBIT_API, g.location.href).origin : '';
      if (u.origin !== g.location.origin && u.origin !== api) return null;   // Firebase, fonts, YouTube etc. are not tracked
      if (QUIET.test(u.pathname)) return null;
      const h = init && init.headers; if (h && (h['X-No-Busy'] || (typeof h.get === 'function' && h.get('X-No-Busy')))) return null;
      return labelFor(u.pathname);
    } catch (e) { return null; }
  }
  const rawFetch = g.fetch ? g.fetch.bind(g) : null;
  if (rawFetch) g.fetch = function (input, init) {
    const key = wantFetch(input, init); if (!key) return rawFetch(input, init);
    const done = begin(key);
    let p; try { p = rawFetch(input, init); } catch (e) { done(); throw e; }
    return p.then(r => { done(); return r; }, e => { done(); throw e; });
  };

  // ---- cloud calls (Firestore reads and writes) ----
  const SKIP = new Set(['token', 'login', 'logout', 'newId', 'id']);   // login waits on the person, not on us; the others are instant
  function wrapObj(o, depth) {
    Object.keys(o).forEach(k => {
      const v = o[k];
      if (typeof v === 'function') {
        if (SKIP.has(k) || v.__busy) return;
        const w = function () { const r = v.apply(this, arguments); return (r && typeof r.then === 'function') ? track(r, 'load') : r; };
        w.__busy = true; try { o[k] = w; } catch (e) { /* read-only property */ }
      } else if (v && typeof v === 'object' && depth < 2) wrapObj(v, depth + 1);
    });
  }
  const wrapCloud = () => { if (g.CLOUD && !g.CLOUD.__busy) { wrapObj(g.CLOUD, 0); try { g.CLOUD.__busy = true; } catch (e) { /* ignore */ } } };

  // the first start: from page load until Firebase says who is logged in
  let bootEnd = begin('boot');
  const endBoot = () => { if (bootEnd) { bootEnd(); bootEnd = null; } };
  if (g.addEventListener) { g.addEventListener('online', render); g.addEventListener('offline', render); }

  g.BUSY = { begin, track, wrapCloud, endBoot, _message: message, _count: () => E.size, _labels: LABELS.length };
})(typeof window !== 'undefined' ? window : globalThis);
