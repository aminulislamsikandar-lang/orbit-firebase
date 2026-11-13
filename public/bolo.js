// public/bolo.js - Bolo screen: the child speaks (A to Z, tables, poems), the browser's speech recognition listens, bolo-core.js checks it.
// index.html calls BOLO.viewHTML() for the "Bolo" page. No server and no AI cost.
// Privacy: Orbit never records, uploads or stores audio or the recognised text. Only "sahi / dobara" marks, time used and the parent's settings are kept, on THIS device (per account).
(function () {
  'use strict';
  const g = window, C = g.BOLO_CORE;
  if (!C) return;
  const PREFIX = 'orbit.bolo.', DAYS_KEEP = 60, LISTEN_MS = 9000;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const redraw = () => { if (typeof g.draw === 'function') g.draw(); };
  const uid = () => (typeof USER !== 'undefined' && USER && USER.uid) || 'guest';
  const onScreen = () => typeof VIEW !== 'undefined' && VIEW === 'bolo';
  const SR = g.SpeechRecognition || g.webkitSpeechRecognition;
  const TTS = !!g.speechSynthesis;

  const ico = p => `<svg class="bl-ic" viewBox="0 0 24 24" aria-hidden="true">${p}</svg>`;
  const ICON = {
    mic: ico('<rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/>'),
    say: ico('<path d="M11 5L6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/>'),
    next: ico('<path d="M9 6l6 6-6 6"/>'), back: ico('<path d="M15 6l-6 6 6 6"/>'),
    ok: ico('<path d="M5 13l4 4L19 7"/>'), redo: ico('<path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 4v5h-5"/>')
  };

  // ---- saved data (this device, this account) ----
  const blank = () => ({ set: { limit: 10, mic: true, pin: '' }, prog: {}, days: {} });
  let store = null, storeFor = '';
  function load() {
    if (store && storeFor === uid()) return store;
    storeFor = uid(); store = blank();
    try {
      const j = JSON.parse(g.localStorage.getItem(PREFIX + storeFor) || 'null');
      if (j && typeof j === 'object') {
        store.set = Object.assign(store.set, j.set || {});
        store.set.limit = Math.min(30, Math.max(5, Math.round((+store.set.limit || 10) / 5) * 5));
        store.set.mic = store.set.mic !== false; store.set.pin = typeof store.set.pin === 'string' ? store.set.pin : '';
        store.prog = j.prog && typeof j.prog === 'object' ? j.prog : {}; store.days = j.days && typeof j.days === 'object' ? j.days : {};
      }
    } catch (e) {}
    return store;
  }
  function save() {
    const s = load(), keep = Object.keys(s.days).sort().slice(-DAYS_KEEP), d = {};
    keep.forEach(k => { d[k] = s.days[k]; }); s.days = d;
    try { g.localStorage.setItem(PREFIX + storeFor, JSON.stringify(s)); } catch (e) {}
  }
  const today = () => { const s = load(), k = C.dayKey(); return s.days[k] || (s.days[k] = { sec: 0, ok: 0, redo: 0 }); };
  const over = () => today().sec >= load().set.limit * 60;
  const totalDone = () => Object.values(load().prog).reduce((a, m) => a + Object.values(m).filter(v => v === 'd').length, 0);

  // ---- screen state (not saved) ----
  const st = { mode: 'alpha', table: 2, poem: C.POEMS[0].id, i: 0, fb: null, listening: false, err: '', unlocked: false, parOpen: false, pinMsg: '' };
  const opt = () => ({ table: st.table, poem: st.poem });
  const list = () => C.items(st.mode, opt());
  const key = () => C.stateKey(st.mode, opt());
  const marks = () => (load().prog[key()] || {});
  const hasPin = () => !!load().set.pin;
  const canEdit = () => !hasPin() || st.unlocked;
  function firstOpen() { const m = marks(), n = list().length; for (let i = 0; i < n; i++) if (m[i] !== 'd') return i; return 0; }
  function reset(mode) { stopListen(); stopSay(); if (mode) st.mode = mode; st.fb = null; st.err = ''; st.i = firstOpen(); }

  // ---- voice out ----
  function stopSay() { try { g.speechSynthesis && g.speechSynthesis.cancel(); } catch (e) {} }
  function say(t) { if (!TTS) return; try { const u = new g.SpeechSynthesisUtterance(t); u.lang = 'en-IN'; u.rate = 0.8; g.speechSynthesis.cancel(); g.speechSynthesis.speak(u); } catch (e) {} }

  // ---- voice in ----
  let rec = null, recTimer = 0;
  function stopListen() {
    clearTimeout(recTimer); st.listening = false;
    if (rec) { const r = rec; rec = null; r.onresult = r.onerror = r.onend = null; try { r.abort(); } catch (e) {} }
  }
  function mark(ok) {
    const s = load(), k = key(), it = list()[st.i], d = today();
    s.prog[k] = s.prog[k] || {};
    if (ok) { s.prog[k][st.i] = 'd'; d.ok++; } else { if (s.prog[k][st.i] !== 'd') s.prog[k][st.i] = 'r'; d.redo++; }
    save(); stopListen();
    st.fb = ok ? { ok: true, t: 'Shabaash! Sahi bola: ' + it.say } : { ok: false, t: 'Phir se bolo: "' + it.say + '"' };
    if (!ok) say(it.say);
    redraw();
  }
  function listen() {
    if (over() || !load().set.mic || st.listening || !SR) return;
    stopSay(); stopListen(); st.fb = null; st.err = '';
    let r; try { r = new SR(); } catch (e) { st.err = 'Mic shuru nahi ho paya. Dobara try karo.'; redraw(); return; }
    rec = r; r.lang = 'en-IN'; r.interimResults = false; r.maxAlternatives = 3; r.continuous = false;
    const item = list()[st.i];
    r.onresult = e => {
      const res = e.results && e.results[0], alts = res ? Array.from(res).map(a => a.transcript) : [];
      mark(C.check(item, alts));
    };
    r.onerror = e => {
      const code = e && e.error; if (code === 'aborted') return;
      stopListen();
      st.err = code === 'not-allowed' || code === 'service-not-allowed' ? 'Browser ne mic ki ijazat nahi di. Address bar mein mic allow karo.'
        : code === 'no-speech' ? 'Kuch sunai nahi diya. Mic dabao aur zor se bolo.'
        : code === 'network' ? 'Internet nahi hai. Voice sunne ke liye internet chahiye.'
        : code === 'audio-capture' ? 'Mic nahi mila. Phone ka mic check karo.' : 'Sunai nahi diya. Dobara try karo.';
      redraw();
    };
    r.onend = () => { if (rec === r && st.listening) { stopListen(); st.err = 'Kuch sunai nahi diya. Mic dabao aur bolo.'; redraw(); } };
    st.listening = true;
    try { r.start(); } catch (e) { stopListen(); st.err = 'Mic shuru nahi ho paya. Dobara try karo.'; }
    recTimer = setTimeout(() => { if (rec === r) try { r.stop(); } catch (e) {} }, LISTEN_MS);
    redraw();
  }

  // ---- parent PIN (optional): stops a child from changing the limit. Stored only as a SHA-256 hash, salted with the account id. ----
  async function hashPin(pin) {
    if (!(g.crypto && g.crypto.subtle)) return null;
    const buf = await g.crypto.subtle.digest('SHA-256', new TextEncoder().encode('orbit-bolo:' + uid() + ':' + pin));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  async function pinAction(kind) {
    const el = g.document.getElementById('blPin'), v = el ? el.value.trim() : '';
    if (!/^\d{4}$/.test(v)) { st.pinMsg = 'PIN 4 numbers ka hona chahiye.'; redraw(); return; }
    const h = await hashPin(v);
    if (!h) { st.pinMsg = 'Is browser mein PIN support nahi hai.'; redraw(); return; }
    const s = load();
    if (kind === 'unlock') { if (h === s.set.pin) { st.unlocked = true; st.pinMsg = ''; } else st.pinMsg = 'PIN galat hai.'; }
    else if (kind === 'set') { s.set.pin = h; st.unlocked = true; st.pinMsg = 'PIN lag gaya.'; save(); }
    else if (kind === 'remove') { if (h === s.set.pin) { s.set.pin = ''; st.unlocked = false; st.pinMsg = 'PIN hata diya.'; save(); } else st.pinMsg = 'PIN galat hai.'; }
    redraw();
  }

  // ---- timer: counts only while this screen is open and visible ----
  let tick = 0;
  setInterval(() => {
    if (!onScreen() || g.document.hidden || over()) return;
    const d = today(); d.sec++;
    const el = g.document.getElementById('blTm'); if (el) el.textContent = C.fmtTime(d.sec);
    if (++tick % 10 === 0) save();
    if (over()) { stopListen(); stopSay(); save(); redraw(); }
  }, 1000);
  g.document.addEventListener('visibilitychange', () => { if (g.document.hidden) { stopListen(); stopSay(); save(); } });
  g.addEventListener('pagehide', save);

  // ---- views ----
  function style() {
    if (g.document.getElementById('blStyle')) return '';
    const s = g.document.createElement('style'); s.id = 'blStyle';
    s.textContent = `.bl-ic{width:20px;height:20px;flex:none;fill:none;stroke:currentColor;stroke-width:1.75;stroke-linecap:round;stroke-linejoin:round}
.bl-prog{display:flex;flex-wrap:wrap;gap:4px}.bl-prog button{width:26px;height:26px;border:0;border-radius:7px;background:var(--ans);color:var(--mut);font:600 11px inherit;padding:0}
.bl-prog button.d{background:var(--on);color:var(--onbg)}.bl-prog button.r{background:var(--ans);color:var(--tx);text-decoration:underline}.bl-prog button.c{outline:2px solid var(--on);outline-offset:1px}
.bl-big{text-align:center;font-weight:700;line-height:1.1;overflow-wrap:anywhere;padding:14px 0 2px}.bl-sub{text-align:center;font-size:20px;font-weight:600;margin:0 0 4px}
.bl-two{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}.bl-two .btn{margin:0;display:flex;align-items:center;justify-content:center;gap:8px}
.btn.bl-sec{background:var(--ans);color:var(--tx)}.btn.bl-go{margin-top:10px;width:100%}
.bl-mic{width:88px;height:88px;border-radius:50%;border:0;background:var(--on);color:var(--onbg);display:grid;place-items:center;margin:14px auto 6px}
.bl-mic .bl-ic{width:36px;height:36px}.bl-mic.on{animation:blp 1s infinite}.bl-mic:disabled{opacity:.35}
@keyframes blp{50%{opacity:.55}}@media(prefers-reduced-motion:reduce){.bl-mic.on{animation:none}}
.bl-fb{min-height:46px;border-radius:12px;padding:10px 12px;text-align:center;font-weight:600;background:var(--ans);margin-top:8px;display:grid;place-items:center}
.bl-status{display:flex;gap:10px;align-items:center;background:var(--ans);border-radius:12px;padding:10px 12px;font-size:14px}
.bl-fld{width:100%;box-sizing:border-box;margin-top:6px;padding:10px;border:1px solid var(--ln);border-radius:10px;background:var(--bg);color:var(--tx);font:inherit}
.bl-par summary{font-weight:600;cursor:pointer}.bl-par>div{margin-top:12px}.bl-row{display:flex;justify-content:space-between;align-items:center;gap:10px;margin:8px 0}
.bl-tbl{width:100%;border-collapse:collapse;font-variant-numeric:tabular-nums}.bl-tbl td{padding:6px 0;border-top:1px solid var(--ln)}.bl-tbl td:last-child{text-align:right}`;
    g.document.head.appendChild(s); return '';
  }

  const modeChips = () => `<div class="chips" role="group" aria-label="Kya bolna hai">${[['alpha', 'A se Z'], ['table', 'Table'], ['poem', 'Poem']].map(m => `<button class="chip" data-bl="mode" data-v="${m[0]}" aria-pressed="${st.mode === m[0]}">${m[1]}</button>`).join('')}</div>`;
  function subPick() {
    if (st.mode === 'table') return `<label class="mut" for="blTable">Kiska table?</label><select id="blTable" class="bl-fld">${C.TABLES.map(t => `<option value="${t}" ${t === st.table ? 'selected' : ''}>${t} ka table</option>`).join('')}</select>`;
    if (st.mode === 'poem') return `<label class="mut" for="blPoem">Kaun si poem?</label><select id="blPoem" class="bl-fld">${C.POEMS.map(p => `<option value="${p.id}" ${p.id === st.poem ? 'selected' : ''}>${esc(p.title)}</option>`).join('')}</select>`;
    return '';
  }

  function card() {
    const s = load(), items = list(), it = items[st.i], m = marks(), done = items.filter((_, i) => m[i] === 'd').length, last = st.i >= items.length - 1;
    if (over()) return `<div class="card"><h2 class="sec" style="margin:0 0 6px">Aaj ka time poora hua</h2><p class="mut" style="margin:0">Kal dobara bolenge. Aaj ${today().ok} baar sahi bola.</p><p class="mut" style="margin:10px 0 0">Parent ne roz ki limit ${s.set.limit} minute rakhi hai.</p></div>`;
    const cells = items.map((_, i) => `<button data-bl="jump" data-v="${i}" class="${m[i] === 'd' ? 'd' : m[i] === 'r' ? 'r' : ''} ${i === st.i ? 'c' : ''}" aria-label="${esc(items[i].big)} ${m[i] === 'd' ? 'sahi' : m[i] === 'r' ? 'dobara' : ''}" ${i === st.i ? 'aria-current="true"' : ''}>${st.mode === 'alpha' ? items[i].big : i + 1}</button>`).join('');
    const big = it.big.length > 5 ? 'font-size:44px' : it.big.length > 3 ? 'font-size:56px' : 'font-size:96px';
    const micOff = !s.set.mic;
    const status = micOff ? 'Parent ne mic band kiya hai. Parent section se allow karo.' : !SR ? 'Is browser mein sunne ka feature nahi hai. Chrome ya Edge use karo, ya neeche khud check karo.' : st.listening ? 'Sun raha hoon... bolo' : 'Mic dabao aur bolo';
    const self = !SR && !micOff ? `<div class="bl-two"><button class="btn" data-bl="self" data-v="1">${ICON.ok}<span>Maine bol diya</span></button><button class="btn bl-sec" data-bl="self" data-v="0">${ICON.redo}<span>Dobara bolunga</span></button></div>` : '';
    return `<div class="card"><div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><h2 class="sec" style="margin:0">${esc(st.mode === 'table' ? st.table + ' ka table' : st.mode === 'poem' ? (C.POEMS.find(p => p.id === st.poem) || C.POEMS[0]).title : 'A se Z')}</h2><span class="mut">${done} / ${items.length} sahi</span></div>
      <div class="bl-prog" style="margin-top:10px">${cells}</div>
      <div class="bl-big" style="${big}">${esc(it.big)}</div><p class="bl-sub">${esc(it.sub)}</p>
      <div class="bl-two"><button class="btn bl-sec" data-bl="hear" ${TTS ? '' : 'disabled'}>${ICON.say}<span>Sunao</span></button><button class="btn ${st.fb && st.fb.ok ? '' : 'bl-sec'}" data-bl="next" ${last ? 'disabled' : ''}><span>Aage</span>${ICON.next}</button></div>
      <button class="bl-mic ${st.listening ? 'on' : ''}" data-bl="mic" aria-label="Bolo" ${micOff || !SR || st.listening ? 'disabled' : ''}>${ICON.mic}</button>
      <p class="mut" style="text-align:center;margin:0" role="status">${status}</p>
      ${st.err ? `<p class="err" role="alert" style="text-align:center">${esc(st.err)}</p>` : ''}
      <div class="bl-fb" role="status" ${st.fb ? '' : 'hidden'}>${st.fb ? esc(st.fb.t) : ''}</div>${self}</div>`;
  }

  function parent() {
    const s = load(), d = today(), edit = canEdit();
    const lock = hasPin() && !st.unlocked ? `<div class="bl-row" style="display:block"><label class="mut" for="blPin">Badalne ke liye parent PIN daalo</label><input id="blPin" class="bl-fld" type="password" inputmode="numeric" maxlength="4" autocomplete="off" placeholder="4 number"><button class="btn bl-sec bl-go" data-bl="pin" data-v="unlock">Kholo</button></div>` : '';
    const pinBox = edit ? (hasPin()
      ? `<div style="display:block"><label class="mut" for="blPin">PIN hatane ke liye PIN dobara daalo</label><input id="blPin" class="bl-fld" type="password" inputmode="numeric" maxlength="4" autocomplete="off" placeholder="4 number"><button class="btn bl-sec bl-go" data-bl="pin" data-v="remove">PIN hatao</button></div>`
      : `<div style="display:block"><label class="mut" for="blPin">Parent PIN (optional): bachha limit na badal sake</label><input id="blPin" class="bl-fld" type="password" inputmode="numeric" maxlength="4" autocomplete="off" placeholder="4 number"><button class="btn bl-sec bl-go" data-bl="pin" data-v="set">PIN lagao</button></div>`) : '';
    return `<details class="card bl-par" id="blPar" ${st.parOpen ? 'open' : ''}><summary>Parent ke liye</summary><div>
      <p class="mut" style="margin:0 0 10px">Orbit awaaz record ya save nahi karta, na bheje hua text. Sirf "sahi / dobara" ke nishaan, time aur ye settings is phone par rehti hain. Chrome mein sunne ka kaam browser ki voice service karti hai, isliye internet chahiye.</p>
      <div class="bl-row"><span>Aaj Bolo chala</span><b id="blTm">${C.fmtTime(d.sec)}</b></div>
      <div class="bl-row"><label for="blLim">Roz ki limit</label><b id="blLimV">${s.set.limit} min</b></div>
      <input id="blLim" type="range" min="5" max="30" step="5" value="${s.set.limit}" style="width:100%" ${edit ? '' : 'disabled'}>
      <label class="bl-row" style="justify-content:flex-start"><input type="checkbox" id="blMc" ${s.set.mic ? 'checked' : ''} ${edit ? '' : 'disabled'}> Mic allow hai (parent ki ijazat)</label>
      <table class="bl-tbl"><tr><td>Aaj boli gayi cheezein</td><td>${d.ok + d.redo}</td></tr><tr><td>Sahi</td><td>${d.ok}</td></tr><tr><td>Dobara karni hain</td><td>${d.redo}</td></tr><tr><td>Ab tak sahi (sab mode)</td><td>${totalDone()}</td></tr></table>
      ${lock}${pinBox}${st.pinMsg ? `<p class="mut" role="status" style="margin:8px 0 0">${esc(st.pinMsg)}</p>` : ''}
    </div></details>`;
  }

  // ---- events ----
  g.document.addEventListener('click', e => {
    const b = e.target && e.target.closest ? e.target.closest('[data-bl]') : null;
    if (!b || b.disabled) return;
    const a = b.dataset.bl, v = b.dataset.v;
    if (a === 'mode') { reset(v); redraw(); }
    else if (a === 'jump') { stopListen(); stopSay(); st.i = +v; st.fb = null; st.err = ''; redraw(); }
    else if (a === 'next') { stopListen(); stopSay(); st.i = Math.min(list().length - 1, st.i + 1); st.fb = null; st.err = ''; redraw(); }
    else if (a === 'hear') say(list()[st.i].say);
    else if (a === 'mic') listen();
    else if (a === 'self') mark(v === '1');
    else if (a === 'pin') pinAction(v);
  });
  g.document.addEventListener('change', e => {
    const t = e.target, id = t && t.id;
    if (id === 'blTable') { st.table = +t.value; reset(); redraw(); }
    else if (id === 'blPoem') { st.poem = t.value; reset(); redraw(); }
    else if (id === 'blLim' && canEdit()) { load().set.limit = +t.value; save(); redraw(); }
    else if (id === 'blMc' && canEdit()) { load().set.mic = t.checked; if (!t.checked) stopListen(); save(); redraw(); }
  });
  g.document.addEventListener('input', e => { if (e.target && e.target.id === 'blLim') { const l = g.document.getElementById('blLimV'); if (l) l.textContent = e.target.value + ' min'; } });
  g.document.addEventListener('toggle', e => { if (e.target && e.target.id === 'blPar') st.parOpen = e.target.open; }, true);

  g.BOLO = {
    viewHTML() {
      style(); load();
      if (!st.fbInit) { st.fbInit = true; st.i = firstOpen(); }
      return `<h1 style="font-size:26px;margin-top:14px">Bolo</h1><p class="mut" style="margin:4px 0 0">Bolo aur seekho. Mic dabao, bolo, Orbit sunega.</p>
        <div class="bl-status" style="margin-top:12px" role="status"><span>${st.listening ? 'Mic chalu hai. Sirf sunta hai, awaaz save nahi hoti.' : 'Mic band hai. Awaaz save nahi hoti.'}</span></div>
        ${modeChips()}${subPick()}${card()}${parent()}`;
    },
    leave() { stopListen(); stopSay(); save(); },
    _reset() { stopListen(); store = null; Object.assign(st, { mode: 'alpha', table: 2, poem: C.POEMS[0].id, i: 0, fb: null, err: '', unlocked: false, parOpen: false, pinMsg: '', fbInit: false }); }
  };
})();
