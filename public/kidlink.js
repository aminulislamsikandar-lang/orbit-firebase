// public/kidlink.js - Kid mode: a parent connects to a child's phone with a code.
//   Child's phone ("I am a kid"): sees only Bolo. In Bolo > "Parent ke liye" the parent makes an 8-character code (KIDLINK.kidPanelHTML).
//     The phone shares only a small summary (today's minutes, how many right / to repeat, total right) and reads the limit and mic switch the parent set.
//   Parent's phone ("I am parent"): sees only the parent screen (KIDLINK.parentHTML): paste the code, see the child's day, set the limit and the mic switch.
//   Mentor's phone ("I am mentor" > Kid): asks with the child's code; a parent approves it on the parent screen; the approved mentor sees the child's Online / Offline (KIDLINK.mentorHTML).
// Data lives in Firestore (window.CLOUD.kids, see firestore.rules: kidLinks). The code is the secret. No recognised text and no photos are shared. Audio is shared only for Byanjan "Saath me bolo" and only when the parent ticks it: the recording goes to the parent and is deleted after 2 hours (bolorec.js).
// The phone's role (kid or parent) is kept on that phone (index.html), so one Google account can be used on both phones.
(function (g) {
  'use strict';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const normCode = v => String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
  const goodCode = c => /^[A-HJ-NP-Z2-9]{8}$/.test(c);
  const fmt = c => String(c || '').slice(0, 4) + '-' + String(c || '').slice(4);
  const REV = 'orbit.kl.rev.', PUSH_MS = 20000, TICK_MS = 30000, PRES_MS = 45000, ONLINE_MS = 150000;   // the child's phone says "I am here" about once a minute; no word for 2.5 minutes = Offline
  const S = { uid: '', last: 0, pend: 0, kid: { loaded: false, busy: false, err: '', msg: '', link: null, parents: 0, pend: [], asks: [] }, par: { loaded: false, busy: false, err: '', msg: '', kids: [] }, men: { loaded: false, busy: false, err: '', msg: '', kids: [], filter: 'all' }, presAt: 0, presOn: null, accAt: 0, accOn: false, listen: [], polls: 0, repKey: '', repAt: 0, repSend: 0 };
  const cloud = () => (g.CLOUD && g.CLOUD.kids) || null;
  const draw = () => { if (typeof g.draw === 'function') g.draw(); };
  const role = () => (typeof KIDROLE !== 'undefined' && typeof COURSE !== 'undefined' && COURSE && COURSE.kid) ? KIDROLE : '';
  const firstName = () => { const u = typeof USER !== 'undefined' ? USER : null; return String((u && (u.name || u.displayName)) || '').trim().split(/\s+/)[0] || ''; };
  const fail = e => (e && e.code === 'permission-denied') ? 'Ye kaam nahi ho paaya (ijazat nahi mili). Dobara try karo.' : 'Net ya server ki dikkat. Thodi der baad try karo.';
  const field = 'width:100%;padding:10px;border:1px solid var(--ln);border-radius:10px;background:var(--bg);color:var(--tx);font:inherit;margin-top:4px;letter-spacing:2px';
  const min = s => Math.round((+s || 0) / 60);
  const limTxt = m => m < 60 ? m + ' min' : (m % 60 ? Math.floor(m / 60) + ' ghante ' + (m % 60) + ' min' : (m / 60) + ' ghante');   // limit up to 600 min (10 hours)
  const volOf = v => { v = Math.round(+v); return Number.isFinite(v) ? Math.min(5, Math.max(1, v)) : 3; };   // parent's "how loud" slider for Saath me bolo
  const VOLN = ['Bahut halka', 'Halka', 'Normal', 'Tez', 'Bahut tez'];

  // ---- child's phone ----
  async function kidLoad(force) {
    const C = cloud(), K = S.kid; if (!C || !S.uid || K.busy || (K.loaded && !force)) return;
    K.busy = true; K.err = '';
    try { K.link = await C.own(); K.parents = K.link ? (await C.parents(K.link.code)).length : 0; } catch (e) { K.err = fail(e); }
    K.loaded = true; K.busy = false; draw();
    if (K.link) { pull(); touch(true); listenPoll(); }
  }
  async function kidMake(renew) {
    const C = cloud(), K = S.kid; if (!C || K.busy) return;
    if (renew && !g.confirm('Naya code banane par purane code se jude parent hat jayenge. Pakka?')) return;
    K.busy = true; K.err = ''; K.msg = ''; draw();
    try {
      if (K.link) { await C.remove(K.link.code); K.link = null; K.parents = 0; }
      K.link = await C.create(firstName() || 'Bachcha'); K.parents = 0; K.msg = 'Code ban gaya. Ye code parent ke phone mein daalo.';
      touch(true);
    } catch (e) { K.err = fail(e); }
    K.busy = false; draw();
  }
  async function kidOff() {
    const C = cloud(), K = S.kid; if (!C || !K.link || K.busy) return;
    if (!g.confirm('Parent se judna band karein? Parent ko ab bachche ka din nahi dikhega.')) return;
    K.busy = true; K.err = ''; K.msg = ''; draw();
    try { await C.remove(K.link.code); K.link = null; K.parents = 0; K.msg = 'Judna band ho gaya.'; } catch (e) { K.err = fail(e); }
    K.busy = false; draw();
  }
  async function push() {
    const C = cloud(), B = g.BOLO; if (!C || !S.kid.link || !B || !B.summary) return;
    const s = B.summary();
    try { await C.putSum(S.kid.link.code, { day: s.day, sec: Math.min(86400, Math.round(s.sec)), ok: s.ok, redo: s.redo, total: s.total, at: Date.now() }); } catch (e) {}
  }
  // Called by Bolo whenever it saves: share the summary at most once in a while.
  function touch(now) {
    if (role() !== 'kid' || !S.kid.link) return;
    const wait = S.last + PUSH_MS - Date.now();
    if (!now && wait > 0) { if (!S.pend) S.pend = setTimeout(() => { S.pend = 0; touch(); }, wait); return; }
    S.last = Date.now(); push();
  }
  // Online / Offline: written while Orbit is open and on screen, and once more when it goes to the background.
  const seen = () => !(g.document.visibilityState && g.document.visibilityState !== 'visible');
  const dayKey = d => { const n = d || new Date(); return n.getFullYear() + '-' + String(n.getMonth() + 1).padStart(2, '0') + '-' + String(n.getDate()).padStart(2, '0'); };
  // Online time: seconds Orbit was open and on screen today, counted on the child's phone (a gap longer than 90 s is not counted).
  function addOnline(ms) {
    const k = 'orbit.kl.on.' + S.uid, d = dayKey(); let o = { day: d, sec: 0 };
    try { const j = JSON.parse(g.localStorage.getItem(k) || 'null'); if (j && j.day === d) o = { day: d, sec: Math.max(0, +j.sec || 0) }; } catch (e) {}
    if (ms > 0) {
      o.sec = Math.min(86400, o.sec + Math.round(Math.min(ms, 90000) / 1000)); try { g.localStorage.setItem(k, JSON.stringify(o)); } catch (e) {}
      const h = onlineHist(); h[d] = o.sec; const keep = Object.keys(h).sort().slice(-7), n = {}; keep.forEach(x => { n[x] = h[x]; });
      try { g.localStorage.setItem('orbit.kl.onh.' + S.uid, JSON.stringify(n)); } catch (e) {}
    }
    return o;
  }
  function onlineHist() { try { const j = JSON.parse(g.localStorage.getItem('orbit.kl.onh.' + S.uid) || 'null'); return j && typeof j === 'object' ? j : {}; } catch (e) { return {}; } }
  // For the mentor: the last 7 days and the items to repeat. Written when something changed, at most once a minute (online seconds alone: once in 5 minutes).
  function repBuild() {
    const b = g.BOLO && g.BOLO.report ? g.BOLO.report() : { days: [], weak: [] }, on = onlineHist(), map = {};
    (b.days || []).forEach(x => { map[x.d] = { d: x.d, o: 0, b: x.b, k: x.k, r: x.r }; });
    Object.keys(on).forEach(d => { (map[d] = map[d] || { d, o: 0, b: 0, k: 0, r: 0 }).o = Math.max(0, Math.min(86400, +on[d] || 0)); });
    return { days: Object.keys(map).sort().slice(-7).map(d => map[d]), weak: b.weak || [] };
  }
  // Live screen for a mentor whose window is open (see firestore.rules state/live): a clean copy of what the child's screen shows (the same boxes, colours and letters), never a photo, a sound or anything typed.
  // Left out on purpose: every <details> (the "Parent ke liye" box with PIN, limits and the mic switch), inputs, scripts, [data-nolive] (e.g. "Recording parent ko bhej di gayi") and the "Mentor sun rahe hain" card.
  // The same cleaner runs again on the mentor's phone, so a tampered document can never put script or a link into the mentor's page.
  const LIVE_MS = 5000, LIVE_MAX = 60000;
  const SNAP_DROP = 'details, input, textarea, select, script, style, iframe, audio, video, object, embed, canvas, link, meta, form, [data-nolive], .kl-listen';
  const SNAP_TAGS = /^(div|span|p|b|strong|i|em|u|br|h1|h2|h3|h4|ul|ol|li|table|thead|tbody|tr|td|th|button|label|img|small|section|main|header|nav|a|svg|g|path|circle|rect|line|polyline|polygon|ellipse|text|tspan)$/;
  const SNAP_ATTR = /^(class|lang|dir|alt|width|height|viewbox|d|fill|stroke|stroke-width|stroke-linecap|stroke-linejoin|cx|cy|r|rx|ry|x|y|x1|y1|x2|y2|points|transform|opacity|font-size|text-anchor)$/;
  function snapNode(n, d, depth, cnt) {
    if (n.nodeType === 3) { cnt.n++; return d.createTextNode(String(n.nodeValue || '').slice(0, 300)); }
    if (n.nodeType !== 1 || depth > 40 || cnt.n > 900) return null;
    let tag = String(n.localName || '').toLowerCase(); if (!SNAP_TAGS.test(tag)) return null;
    if (tag === 'a') tag = 'span';   // a link on the child's screen is shown as plain text: the mentor can not be sent anywhere
    cnt.n++;
    const svg = /^(svg|g|path|circle|rect|line|polyline|polygon|ellipse|text|tspan)$/.test(tag);
    const el = svg ? d.createElementNS('http://www.w3.org/2000/svg', tag) : d.createElement(tag);
    for (const a of Array.from(n.attributes || [])) {
      const k = String(a.name).toLowerCase(), v = String(a.value);
      if (k === 'style') { if (!/url\s*\(|expression|@import|javascript:|<|\\/.test(v) && v.length <= 400) el.setAttribute('style', v); continue; }
      if (k === 'src' && tag === 'img') { if (/^\/(?!\/)[\w\-./%]{1,200}$/.test(v) || /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]{1,6000}$/.test(v)) el.setAttribute('src', v); continue; }
      if (k === 'class') { el.setAttribute('class', v.replace(/[^\w\- ]/g, '').slice(0, 120)); continue; }
      if (SNAP_ATTR.test(k) && v.length <= 600 && !/javascript:|<|url\s*\(/i.test(v)) el.setAttribute(a.name, v);
    }
    if (tag === 'button') { el.setAttribute('tabindex', '-1'); el.setAttribute('type', 'button'); }
    for (const c of Array.from(n.childNodes)) { const r = snapNode(c, d, depth + 1, cnt); if (r) el.appendChild(r); }
    return el;
  }
  // Copies the children of src into dst (both are elements) through the cleaner. Returns how many nodes were copied.
  function snapInto(src, dst, d) {
    const cnt = { n: 0 };
    for (const c of Array.from(src.childNodes)) { const r = snapNode(c, d, 0, cnt); if (r) dst.appendChild(r); }
    return cnt.n;
  }
  function liveBuild() {
    const doc = g.document, root = doc.getElementById('app'); if (!root) return null;
    const h = root.querySelector('h2'), out = [], skip = 'details, input, textarea, select, script, style, svg, [aria-hidden="true"], [data-nolive]';
    root.querySelectorAll('*').forEach(el => {
      if (el.children.length || el.closest(skip)) return;
      if (h && !(h.compareDocumentPosition(el) & 4)) return;   // 4 = after the title: the tab buttons above it are not repeated
      const s = String(el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60);
      if (s && out[out.length - 1] !== s && out.length < 14) out.push(s);
    });
    let act = ''; try { act = String(g.BOLO && g.BOLO.activity ? g.BOLO.activity() || '' : '').slice(0, 40); } catch (e) {}
    // The picture: a copy of the screen without the left-out parts, run through the cleaner and written as HTML text.
    let html = '';
    try {
      const copy = root.cloneNode(true);
      copy.querySelectorAll(SNAP_DROP).forEach(x => { if (x.parentNode) x.parentNode.removeChild(x); });
      const box = doc.createElement('div');
      if (snapInto(copy, box, doc) > 0) html = box.innerHTML;
    } catch (e) { html = ''; }
    if (html.length > LIVE_MAX) html = '';   // too big for one document: the mentor still gets the words
    return { act, lines: out, html };
  }
  async function livePush(force) {
    const C = cloud(); if (role() !== 'kid' || !C || !S.uid || !S.kid.link || !C.putLive) return;
    const code = S.kid.link.code;
    if (!S.listen.length || !seen()) { if (S.liveOn && !S.listen.length) { S.liveOn = false; S.liveKey = ''; try { await C.delLive(code); } catch (e) {} } return; }
    const b = liveBuild(); if (!b) return;
    const key = JSON.stringify(b), now = Date.now();
    if (!force && key === S.liveKey && now - S.liveAt < 15000) return;
    S.liveKey = key; S.liveAt = now; S.liveOn = true;
    try { await C.putLive(code, { at: now, act: b.act, lines: b.lines, html: b.html }); } catch (e) { S.liveKey = ''; }
  }
  async function repPush(force) {
    const C = cloud(); if (role() !== 'kid' || !C || !S.uid || !S.kid.link || !seen()) return;
    const r = repBuild(), stable = JSON.stringify({ d: r.days.map(x => [x.d, x.b, x.k, x.r]), w: r.weak }), full = stable + JSON.stringify(r.days.map(x => x.o)), now = Date.now();
    if (!force) {
      if (full === S.repKey) return;
      const sameStable = S.repKey.startsWith(stable);
      if (now - S.repAt < (sameStable ? 300000 : 60000)) return;
    }
    S.repKey = full; S.repAt = now;
    try { await C.putRep(S.kid.link.code, { days: r.days, weak: r.weak, at: now }); } catch (e) { S.repKey = ''; }
  }
  async function beat(force) {
    const C = cloud(); if (role() !== 'kid' || !C || !S.uid) return;
    if (!S.kid.loaded) { kidLoad(); return; }   // the code is loaded first (a restart of the app, no panel opened)
    if (!S.kid.link) return;
    const now = Date.now(), on = seen();
    const o = addOnline(S.accOn && S.accAt ? now - S.accAt : 0); S.accAt = now; S.accOn = on;
    if (!force && on === S.presOn && now - S.presAt < PRES_MS) return;
    S.presOn = on; S.presAt = now;
    const rec = { on, at: now, day: o.day, sec: o.sec };
    if (on && g.BOLO && g.BOLO.activity) { try { const a = String(g.BOLO.activity() || '').slice(0, 40); if (a) rec.act = a; } catch (e) {} }
    try { await C.putPres(S.kid.link.code, rec); } catch (e) {}
  }
  // The parent's limit and mic switch, applied once per change.
  async function pull() {
    const C = cloud(); if (role() !== 'kid' || !C || !S.kid.link) return;
    try {
      const r = await C.getSet(S.kid.link.code); if (!r) return;
      let seen = 0; try { seen = +g.localStorage.getItem(REV + S.uid) || 0; } catch (e) {}
      if (r.rev > seen) { try { g.localStorage.setItem(REV + S.uid, String(r.rev)); } catch (e) {} if (g.BOLO && g.BOLO.applyRemote) g.BOLO.applyRemote({ limit: r.limit, mic: r.mic, rec: r.rec === true, vol: r.vol }); }
    } catch (e) {}
  }
  // Inside Bolo's "Parent ke liye" box. edit: false while a parent PIN is set and not entered, so the child can not make a code or leave Kid mode.
  function kidPanelHTML(edit) {
    if (role() !== 'kid') return '';
    const K = S.kid; if (!K.loaded && !K.busy && S.uid) kidLoad();
    const dis = edit && !K.busy ? '' : 'disabled';
    const body = !K.loaded ? '<p class="mut" style="margin:6px 0 0">Load ho raha hai…</p>'
      : K.link ? `<p class="mut" style="margin:6px 0 4px">Parent ke phone par Orbit kholo, Kid mode chuno, \"I am parent\" dabao aur ye code daalo:</p>
        <div style="font-size:28px;font-weight:700;letter-spacing:4px;margin:6px 0" id="klCodeShow" aria-label="Code">${esc(fmt(K.link.code))}</div>
        <div class="chips"><button class="chip" data-kl="copy">Code copy karo</button><button class="chip" data-kl="new" ${dis}>Naya code</button><button class="chip" data-kl="off" ${dis}>Judna band karo</button></div>
        <p class="mut" style="margin:8px 0 0">Jude hue parent: ${K.parents}</p>${kidMentorsHTML(edit)}`
      : `<p class="mut" style="margin:6px 0 8px">Parent ke phone se bachche ka din dekhne aur limit badalne ke liye code banao.</p><button class="btn bl-sec" data-kl="mk" ${dis}>Code banao</button>`;
    return `<div class="bl-kid" style="margin-top:14px;padding-top:12px;border-top:1px solid var(--ln)"><b>Parent ke phone se jodo</b>${body}
      ${K.msg ? `<p class="mut" role="status" style="margin:8px 0 0">${esc(K.msg)}</p>` : ''}${K.err ? `<p class="err">${esc(K.err)}</p>` : ''}
      <div style="margin-top:12px"><button class="chip" data-act="csback" ${edit ? '' : 'disabled'}>Kid mode band karo</button></div></div>`;
  }

  // ---- parent's phone ----
  // Join with a code. Used by the course screen ("I am parent") and by the "another child" box. Returns { ok: true } or { err: 'text' }.
  async function joinCode(raw) {
    const C = cloud(), code = normCode(raw);
    if (!goodCode(code)) return { err: 'Code 8 akshar ka hota hai (jaise ABCD-EFGH). Bachche ke phone se dobara dekho.' };
    if (!C) return { err: 'Net ya server ki dikkat. Thodi der baad try karo.' };
    try {
      const link = await C.link(code);
      if (!link) return { err: 'Ye code nahi mila. Bachche ke phone par dobara dekho, ya naya code banwao.' };
      await C.join(code, firstName() || 'Parent');
      S.par.loaded = false; return { ok: true, code };
    } catch (e) { return { err: fail(e) }; }
  }
  async function parLoad(force) {
    const C = cloud(), P = S.par; if (!C || !S.uid || P.busy || (P.loaded && !force)) return;
    P.busy = true; P.err = '';
    try {
      const out = [];
      for (const code of await C.myKids()) {
        const link = await C.link(code);
        if (!link) { try { await C.forget(code); } catch (e) {} continue; }   // the child stopped sharing
        let sum = null, set = null, mentors = [], pres = null, wa = null;
        try { sum = await C.getSum(code); } catch (e) {} try { set = await C.getSet(code); } catch (e) {} try { mentors = await C.mentors(code); } catch (e) {}
        try { pres = await C.getPres(code); } catch (e) {} wa = await C.getWa(code);
        const reviews = await C.reviews(code);
        out.push({ code, name: link.name, sum, set, mentors, pres, wa, reviews });
      }
      P.kids = out;
    } catch (e) { P.err = fail(e); }
    P.loaded = true; P.busy = false; draw();
  }
  async function parJoin() {
    const el = g.document.getElementById('klCode'), P = S.par; if (P.busy) return;
    P.busy = true; P.err = ''; P.msg = ''; draw();
    const r = await joinCode(el && el.value); P.busy = false;
    if (r.err) { P.err = r.err; draw(); return; }
    P.msg = 'Bachche se jud gaye.'; P.loaded = false; parLoad(true);
  }
  async function parLeave(code) {
    const C = cloud(), P = S.par; if (!C || P.busy) return;
    if (!g.confirm('Is bachche se judna band karein?')) return;
    P.busy = true; draw();
    try { await C.leave(code); P.msg = 'Hata diya.'; } catch (e) { P.err = fail(e); }
    P.busy = false; P.loaded = false; parLoad(true);
  }
  // The parent's WhatsApp number: 10 digits get 91 in front (India); 11 to 15 digits are taken as they are.
  const waNum = v => { const d = String(v || '').replace(/\D/g, ''); return /^[6-9][0-9]{9}$/.test(d) ? '91' + d : /^[0-9]{11,15}$/.test(d) ? d : ''; };
  async function parWa(code, del) {
    const C = cloud(), P = S.par; if (!C || P.busy) return;
    const el = g.document.getElementById('klWa-' + code), num = del ? '' : waNum(el && el.value);
    if (!del && !num) { P.err = 'Number galat hai. 10 digit ka number daalo (jaise 98XXXXXXXX).'; P.msg = ''; draw(); return; }
    P.busy = true; P.err = ''; P.msg = ''; draw();
    try { if (del) { await C.delWa(code); P.msg = 'Number hata diya.'; } else { await C.putWa(code, num); P.msg = 'Number save ho gaya. Manzoor kiya hua mentor ab report bhej sakta hai.'; } } catch (e) { P.err = fail(e); }
    P.busy = false; P.loaded = false; parLoad(true);
  }
  // The parent opens a 1-hour listening window for one approved mentor, or closes it. Opening also turns the Saath me bolo recording on (the mentor can only hear what is recorded).
  async function parListen(code, uid, on) {
    const C = cloud(), P = S.par; if (!C || P.busy) return;
    if (on && !g.confirm('Ye mentor 1 ghante tak bachche ki "Saath me bolo" recordings sun sakega aur bachche ki screen par likha hua (game, level, sawaal) live dekh sakega, photo ya awaaz nahi. Is ke liye recording bhi chalu ho jayegi (recording 2 ghante baad hat jaati hai). Bachche ki screen par "Mentor sun rahe hain" dikhega, aur aap ya bachcha kabhi bhi band kar sakte ho. Shuru karein?')) return;
    P.busy = true; P.err = ''; P.msg = ''; draw();
    try {
      await C.mentorListen(code, uid, on ? Date.now() + 3600000 : 0);
      const k = P.kids.find(x => x.code === code);
      if (on && !(k && k.set && k.set.rec === true)) { P.busy = false; await parSet(code, { rec: true }); P.busy = true; }
      P.msg = on ? 'Mentor 1 ghante tak sun sakta hai. Band karne ke liye "Abhi band karo" dabao.' : 'Sunna band kar diya.';
    } catch (e) { P.err = fail(e); }
    P.busy = false; P.loaded = false; parLoad(true);
  }
  async function parMentor(code, uid, ok) {
    const C = cloud(), P = S.par; if (!C || P.busy) return;
    if (!ok && !g.confirm('Is mentor ko hata dein? Ye bachche ka din dekh nahi payega.')) return;
    P.busy = true; P.err = ''; P.msg = ''; draw();
    try { if (ok) { await C.mentorApprove(code, uid); P.msg = 'Mentor ko manzoori mil gayi.'; } else { await C.mentorDrop(code, uid); P.msg = 'Mentor hata diya.'; } } catch (e) { P.err = fail(e); }
    P.busy = false; P.loaded = false; parLoad(true);
  }
  async function parSet(code, patch) {
    const C = cloud(), k = S.par.kids.find(x => x.code === code); if (!C || !k) return;
    const cur = k.set || { limit: 10, mic: true, rec: false, vol: 3 }, next = { limit: cur.limit, mic: patch.mic != null ? patch.mic : cur.mic, rec: patch.rec != null ? !!patch.rec : cur.rec === true, vol: patch.vol != null ? patch.vol : (cur.vol || 3), rev: Date.now(), at: Date.now() };
    try { await C.putSet(code, next); k.set = next; S.par.err = ''; S.par.msg = 'Bachche ke phone par agli baar khulte hi lag jayega.'; } catch (e) { S.par.err = fail(e); }
    draw();
  }
  // ---- the parent's numbers: a green ring (today's minutes against the limit), coloured number cards, a "right answers" meter ----
  const KI = {   // thin line icons (no emoji)
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', ok: '<path d="M5 12.5l4.2 4.2L19 7"/>',
    redo: '<path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1"/><path d="M3.5 4v4.6H8"/>', star: '<path d="M12 3.2l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17.2l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>'
  };
  const kic = n => `<svg class="kl-ic" viewBox="0 0 24 24" aria-hidden="true">${KI[n]}</svg>`;
  function klStyle() {
    if (g.document.getElementById('klStyle')) return;
    const e = g.document.createElement('style'); e.id = 'klStyle';
    e.textContent = `.kl-ic{width:22px;height:22px;flex:none;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.kl-kid{background:linear-gradient(165deg,rgba(34,197,94,.17),rgba(34,197,94,.03) 60%),var(--card);border:1px solid rgba(34,197,94,.32)}
.kl-head{display:flex;align-items:center;gap:12px}.kl-av{width:44px;height:44px;border-radius:50%;display:grid;place-items:center;color:#fff;font-weight:800;font-size:20px;background:linear-gradient(145deg,#4ade80,#15803d);box-shadow:0 4px 12px rgba(22,163,74,.4)}
.kl-head h2{margin:0}.kl-head small{display:block;color:var(--mut);font-size:12.5px}
.kl-hero{display:flex;align-items:center;gap:16px;margin:14px 0 10px}.kl-ringw{position:relative;width:132px;height:132px;flex:none}.kl-ringw svg{width:100%;height:100%;transform:rotate(-90deg)}
.kl-trk{fill:none;stroke:rgba(34,197,94,.18);stroke-width:12}.kl-arc{fill:none;stroke-width:12;stroke-linecap:round}
.kl-ctr{position:absolute;inset:0;display:grid;place-content:center;text-align:center;line-height:1}.kl-ctr b{font-size:36px;color:#15803d}.kl-ctr span{font-size:12px;color:var(--mut);margin-top:4px}
:root[data-theme="dark"] .kl-ctr b{color:#4ade80}@media(prefers-color-scheme:dark){:root:not([data-theme="light"]) .kl-ctr b{color:#4ade80}}
.kl-side{flex:1;min-width:0}.kl-side strong{display:block;font-size:17px}.kl-side p{margin:4px 0 0;color:var(--mut);font-size:13.5px}
.kl-pill{display:inline-flex;align-items:center;gap:6px;margin-top:8px;border-radius:99px;padding:4px 12px;font-size:13px;font-weight:700;color:#fff;background:linear-gradient(90deg,#16a34a,#22c55e)}.kl-pill .kl-ic{width:16px;height:16px;stroke-width:2.4}
.kl-tiles{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.kl-t{border-radius:16px;padding:12px 10px;color:#fff;display:flex;flex-direction:column;gap:2px;box-shadow:0 6px 14px rgba(0,0,0,.14)}.kl-t b{font-size:30px;line-height:1.05;font-variant-numeric:tabular-nums}.kl-t span{font-size:12.5px;opacity:.95;line-height:1.25}.kl-t .kl-ic{opacity:.9;margin-bottom:4px}
.kl-g{background:linear-gradient(145deg,#22c55e,#15803d)}.kl-a{background:linear-gradient(145deg,#fbbf24,#d97706)}.kl-c{background:linear-gradient(145deg,#2dd4bf,#0f766e)}
.kl-meter{margin-top:12px}.kl-meter div{display:flex;justify-content:space-between;font-size:13.5px;font-weight:600}.kl-meter i{display:block;height:12px;border-radius:99px;margin-top:6px;background:rgba(34,197,94,.18);overflow:hidden}.kl-meter u{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,#84cc16,#22c55e,#0d9488)}
.kl-wk{display:flex;gap:6px;align-items:flex-end;margin-top:10px}.kl-wd{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:3px}.kl-wd i{display:block;width:100%;border-radius:6px 6px 2px 2px;background:#e91e63;opacity:.85}.kl-wm,.kl-wl{font-size:11px;opacity:.7}
.md-i{width:18px;height:18px;flex:none;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}
.md-hero{margin-top:12px;border-radius:22px;padding:16px;color:#fff;background:linear-gradient(135deg,#6366f1,#a855f7 55%,#ec4899);box-shadow:0 10px 26px rgba(99,102,241,.35)}.md-hero small{display:block;opacity:.85;font-size:13px}.md-hero>div>b{font-size:24px}
.md-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:12px}.md-stats>div{background:rgba(255,255,255,.18);border-radius:14px;padding:10px 6px;text-align:center}.md-stats b{display:block;font-size:24px;line-height:1.1;font-variant-numeric:tabular-nums}.md-stats span{font-size:11.5px;opacity:.95}.md-stats .md-warn{background:rgba(251,191,36,.95);color:#78350f}
.md-hero p{margin:10px 0 0;font-size:13.5px}
.md-sticky{position:sticky;top:0;z-index:20;margin:0 -16px;padding:8px 16px 8px;background:rgba(255,255,255,.62);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px)}
:root[data-theme="dark"] .md-sticky{background:rgba(17,17,17,.7)}@media(prefers-color-scheme:dark){:root:not([data-theme="light"]) .md-sticky{background:rgba(17,17,17,.7)}}
.md-sticky .md-hero{margin-top:0;padding:10px 12px;border-radius:18px}.md-sticky .md-hero small{display:inline;margin-right:6px}.md-sticky .md-hero>div>b{font-size:17px}
.md-sticky .md-stats{margin-top:8px;gap:6px}.md-sticky .md-stats>div{padding:6px 4px;border-radius:12px}.md-sticky .md-stats b{font-size:18px}
.md-sw{display:flex;gap:8px;overflow-x:auto;margin-top:8px;padding-bottom:2px;scrollbar-width:none;-webkit-overflow-scrolling:touch}.md-sw::-webkit-scrollbar{display:none}
.md-sw .chip{flex:0 0 auto;display:inline-flex;align-items:center;gap:6px;white-space:nowrap}.md-sw .md-dot{width:9px;height:9px;border-radius:50%;background:#9ca3af;flex:0 0 auto}.md-sw .md-dot.on{background:#22c55e}
.md-card{margin-top:14px;border-radius:22px;overflow:hidden;background:var(--card);box-shadow:0 8px 22px rgba(0,0,0,.12)}
.md-top{display:flex;align-items:center;gap:12px;padding:14px 16px;color:#fff;background:linear-gradient(135deg,var(--k1),var(--k2))}.md-av{width:48px;height:48px;border-radius:50%;display:grid;place-items:center;background:rgba(255,255,255,.24);font-weight:800;font-size:22px;flex:none}
.md-nm{flex:1;min-width:0}.md-nm h2{margin:0 0 4px;font-size:20px;color:#fff}.md-pill{display:inline-flex;align-items:center;gap:6px;padding:3px 11px;border-radius:99px;background:rgba(255,255,255,.24);font-size:13px}.md-pill .kl-dot{box-shadow:0 0 0 2px rgba(255,255,255,.6)}
.md-streak{display:inline-flex;align-items:center;gap:4px;padding:6px 11px;border-radius:99px;background:rgba(255,255,255,.95);color:#c2410c;font-weight:800;font-size:15px}.md-streak .md-i{color:#ea580c}
.md-body{padding:12px 16px 16px}.md-h{display:flex;align-items:center;gap:8px;margin:16px 0 6px;font-weight:700;color:var(--k1)}
.md-flag{display:inline-flex;align-items:center;gap:6px;margin:6px 6px 0 0;padding:4px 10px;border-radius:99px;font-size:12.5px;font-weight:600}.md-flag.a{background:rgba(245,158,11,.18);color:#b45309}.md-flag.r{background:rgba(239,68,68,.16);color:#b91c1c}
:root[data-theme="dark"] .md-flag.a{color:#fbbf24}:root[data-theme="dark"] .md-flag.r{color:#fca5a5}@media(prefers-color-scheme:dark){:root:not([data-theme="light"]) .md-flag.a{color:#fbbf24}:root:not([data-theme="light"]) .md-flag.r{color:#fca5a5}}
.md-live{display:flex;align-items:center;gap:8px;margin:10px 0 0;padding:8px 12px;border-radius:12px;background:rgba(34,197,94,.14)}
.md-mirror{max-width:480px;max-height:70vh;overflow:auto;padding:8px;border-radius:14px;border:1px solid rgba(0,0,0,.12);background:var(--bg)}.md-mirror-in{pointer-events:none;user-select:none;-webkit-user-select:none}.md-mirror-in *{pointer-events:none!important;animation:none!important}
.md-tg{margin-top:12px;padding:12px;border-radius:16px;background:rgba(99,102,241,.1)}.md-bar{height:10px;border-radius:99px;background:rgba(99,102,241,.2);overflow:hidden}.md-bar u{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,var(--k1),var(--k2))}
.md-done{display:inline-flex;align-items:center;gap:4px;font-weight:700;color:#15803d}:root[data-theme="dark"] .md-done{color:#4ade80}@media(prefers-color-scheme:dark){:root:not([data-theme="light"]) .md-done{color:#4ade80}}
.md-n[aria-pressed="true"],.md-f[aria-pressed="true"]{background:linear-gradient(135deg,#6366f1,#a855f7);color:#fff}
.md-card .kl-wd i{background:linear-gradient(var(--k1),var(--k2));opacity:.5}.md-card .kl-wd.kl-wt i{opacity:1}
@media(max-width:360px){.md-stats{grid-template-columns:repeat(2,1fr)}}
.kl-state{display:inline-flex;align-items:center;gap:7px;font-size:14px}.kl-dot{width:10px;height:10px;border-radius:50%;display:inline-block}.kl-on{background:#22c55e;box-shadow:0 0 0 4px rgba(34,197,94,.2)}.kl-off{background:#9ca3af}
.kl-in .kl-t{animation:klup .5s cubic-bezier(.3,1.4,.5,1) backwards}.kl-in .kl-t:nth-child(2){animation-delay:.1s}.kl-in .kl-t:nth-child(3){animation-delay:.2s}
.kl-in .kl-arc{animation:klring 1.1s ease-out}.kl-in .kl-meter u{animation:klgrow 1s ease-out}
@keyframes klup{from{transform:translateY(14px) scale(.9);opacity:0}}@keyframes klring{from{stroke-dashoffset:326.7}}@keyframes klgrow{from{width:0}}
@media(prefers-reduced-motion:reduce){.kl-in *{animation:none!important}}
@media(max-width:360px){.kl-hero{flex-direction:column;align-items:flex-start}}`;
    g.document.head.appendChild(e);
  }
  const onlineSec = (pres, dk) => (pres && pres.day === dk) ? Math.max(0, +pres.sec || 0) : 0;
  const tiles = (sm, total) => { const ok = sm ? +sm.ok || 0 : 0, redo = sm ? +sm.redo || 0 : 0, tot = +total || 0; return { ok, redo, tot, pct: ok + redo ? Math.round(ok * 100 / (ok + redo)) : null }; };
  function tilesHTML(t) {
    return `<div class="kl-tiles"><div class="kl-t kl-g">${kic('ok')}<b>${t.ok}</b><span>Aaj sahi</span></div><div class="kl-t kl-a">${kic('redo')}<b>${t.redo}</b><span>Dobara karni hain</span></div><div class="kl-t kl-c">${kic('star')}<b>${t.tot}</b><span>Ab tak sahi (sab mode)</span></div></div>
    ${t.pct == null ? '' : `<div class="kl-meter"><div><span>Aaj sahi jawab ka hissa</span><span>${t.pct}%</span></div><i role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${t.pct}"><u style="width:${t.pct}%"></u></i></div>`}`;
  }
  function kidStats(k, i, sm, dk) {     // the coloured numbers for one child (parent's screen): online time, Bolo minutes, right / repeat counts
    const on = isOnline(k.pres), osec = onlineSec(k.pres, dk), bolo = sm ? +sm.sec || 0 : 0;
    return `<div class="kl-hero"><div class="kl-ringw" style="width:auto;height:auto"><div class="kl-ctr" style="position:static;text-align:left"><b>${min(osec)}</b><span>min online</span></div></div>
      <div class="kl-side"><strong>Aaj Orbit khula raha</strong><p>Bolo practice: ${min(bolo)} min.</p><span class="kl-state" style="margin-top:6px"><i class="kl-dot ${on ? 'kl-on' : 'kl-off'}" aria-hidden="true"></i><b>${on ? 'Abhi Online' : 'Abhi Offline'}</b></span>${on && k.pres.act ? `<p>Abhi: ${esc(k.pres.act)}</p>` : ''}</div></div>
    ${tilesHTML(tiles(sm, k.sum && k.sum.total))}`;
  }
  // The parent's WhatsApp number, for the mentor's report button.
  function waHTML(k) {
    const has = !!(k.wa && k.wa.num), id = 'klWa-' + esc(k.code);
    return `<div style="margin-top:14px"><label for="${id}"><b>Mera WhatsApp number</b></label><p class="mut" style="margin:2px 0 6px;font-size:12.5px">Manzoor kiya hua mentor is number par report bhej sakta hai. Number sirf wahi dekh sakta hai.</p>
      <input id="${id}" data-kl-wa="${esc(k.code)}" style="${field}" inputmode="numeric" maxlength="16" autocomplete="tel" placeholder="98XXXXXXXX" value="${has ? esc(k.wa.num) : ''}">
      <div class="chips" style="margin-top:8px"><button class="chip" data-kl="wasave" data-v="${esc(k.code)}" ${S.par.busy ? 'disabled' : ''}>Number save karo</button>${has ? `<button class="chip" data-kl="wadel" data-v="${esc(k.code)}">Number hatao</button>` : ''}</div></div>`;
  }
  // The parent's list of mentors of one child: a new request waits for "Manzoor karo".
  function mentorsHTML(k) {
    const list = k.mentors || []; if (!list.length) return '';
    const hm = t => new Date(t).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    const rows = list.map(m => m.status === 'approved'
      ? (() => {
        const hear = +m.listenUntil > Date.now(), mine = (k.reviews || []).filter(r => r.by === m.uid);
        let sahi = 0, galat = 0; mine.forEach(r => { for (const c of String(r.marks || '')) { if (c === '1') sahi++; else if (c === '0') galat++; } });
        return `<div class="bl-row" style="margin-top:6px"><span>${esc(m.name)} <span class="mut">(mentor)</span></span><button class="chip" data-kl="mno" data-v="${esc(k.code)}" data-u="${esc(m.uid)}">Hatao</button></div>
          ${+m.watchAsk > 0 && !hear ? `<p style="margin:6px 0 0"><b>${esc(m.name)} sunna aur dekhna chahta hai.</b></p><div class="chips" style="margin-top:6px"><button class="chip" data-kl="lno" data-v="${esc(k.code)}" data-u="${esc(m.uid)}" ${S.par.busy ? 'disabled' : ''}>Abhi nahi</button></div>` : ''}
          ${hear ? `<p style="margin:6px 0 0"><b>Sunna chalu hai</b>, ${hm(m.listenUntil)} tak.</p><div class="chips" style="margin-top:6px"><button class="chip" data-kl="lstop" data-v="${esc(k.code)}" data-u="${esc(m.uid)}" ${S.par.busy ? 'disabled' : ''}>Abhi band karo</button></div>`
          : `<div class="chips" style="margin-top:6px"><button class="chip" data-kl="lgo" data-v="${esc(k.code)}" data-u="${esc(m.uid)}" ${S.par.busy ? 'disabled' : ''}>1 ghante ke liye sunne do</button></div><p class="mut" style="margin:4px 0 0;font-size:12.5px">Padhai ke time par dabao. 1 ghante baad apne aap band. Mentor Saath me bolo recordings sunta hai, letter par sahi ya galat likhta hai, aur bachche ki screen par likha hua (game, level, sawaal) live dekh sakta hai.</p>`}
          ${m.listenCount ? `<p class="mut" style="margin:4px 0 0;font-size:12.5px">Is mentor ne ${+m.listenCount} recording suni. Aakhri baar: ${esc(new Date(+m.lastListenAt || 0).toLocaleString())}.</p>` : ''}
          ${mine.length ? `<p class="mut" style="margin:4px 0 0;font-size:12.5px">Mentor ke marks: ${sahi} sahi, ${galat} galat (${mine.length} recording).</p>` : ''}`;
      })()
      : `<div style="margin-top:8px"><b>${esc(m.name)}</b> <span class="mut">mentor banna chahta hai</span><div class="chips" style="margin-top:6px"><button class="chip" data-kl="myes" data-v="${esc(k.code)}" data-u="${esc(m.uid)}" ${S.par.busy ? 'disabled' : ''}>Manzoor karo</button><button class="chip" data-kl="mno" data-v="${esc(k.code)}" data-u="${esc(m.uid)}" ${S.par.busy ? 'disabled' : ''}>Mana karo</button></div></div>`).join('');
    return `<div style="margin-top:14px;padding-top:12px"><b>Mentor</b><p class="mut" style="margin:2px 0 0;font-size:12.5px">Manzoor kiya hua mentor bachche ka din aur Online/Offline dekh sakta hai.</p>${rows}</div>`;
  }
  function parentHTML() {
    klStyle();
    const P = S.par; if (!P.loaded && !P.busy && S.uid) parLoad();
    const now = new Date(), dk = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
    const cards = P.kids.map((k, i) => {
      const sm = k.sum && k.sum.day === dk ? k.sum : null, mic = k.set ? k.set.mic !== false : true;
      P.seen = P.seen || {}; const anim = !P.seen[k.code]; P.seen[k.code] = true;     // the ring and cards animate the first time only, not on every 30-second refresh (the kid objects are rebuilt on each refresh, so it is kept by code)
      return `<div class="card kl-kid${anim ? ' kl-in' : ''}" data-kl-card="${esc(k.code)}" style="margin-top:12px"><div class="kl-head"><div class="kl-av" aria-hidden="true">${esc(String(k.name || '?').trim().charAt(0).toUpperCase() || '?')}</div><div><h2 class="sec">${esc(k.name)}</h2><small>${k.sum ? 'Aakhri update: ' + esc(new Date(k.sum.at).toLocaleString()) : 'Bachche ke phone se abhi koi update nahi aaya.'}</small></div></div>
        ${kidStats(k, i, sm, dk)}
        <div style="margin-top:14px"></div>
        <label class="bl-row" style="justify-content:flex-start"><input type="checkbox" data-kl-mic="${esc(k.code)}" ${mic ? 'checked' : ''} style="accent-color:#22c55e"> Mic allow hai</label>
        <label class="bl-row" style="justify-content:flex-start"><input type="checkbox" data-kl-rec="${esc(k.code)}" ${k.set && k.set.rec === true ? 'checked' : ''} style="accent-color:#22c55e"> Byanjan "Saath me bolo": bachhe ki awaaz record hokar mujhe mile (2 ghante)</label>
        <div class="bl-row" style="margin-top:8px"><label for="klVol-${esc(k.code)}">Saath me bolo: awaaz kitni tez chahiye</label><b id="klVolV-${esc(k.code)}">${VOLN[volOf(k.set && k.set.vol) - 1]}</b></div>
        <input id="klVol-${esc(k.code)}" data-kl-vol="${esc(k.code)}" type="range" min="1" max="5" step="1" value="${volOf(k.set && k.set.vol)}" style="width:100%;accent-color:#22c55e">
        <p class="mut" style="margin:2px 0 8px;font-size:12.5px">Halka: dheere bolne par bhi letter green. Tez: zor se bolna padega.</p>
        ${g.BOLOREC ? g.BOLOREC.parentHTML(k.code) : ''}
        ${waHTML(k)}
        ${mentorsHTML(k)}
        <div class="chips" style="margin-top:8px"><button class="chip" data-kl="leave" data-v="${esc(k.code)}">Is bachche se judna band karo</button></div></div>`;
    }).join('');
    return `<h1 style="font-size:26px;margin-top:14px">Parent</h1><p class="mut" style="margin:4px 0 0">Bachche ka Bolo ka din dekho aur limit badlo.</p>
      ${P.busy && !P.loaded ? '<p class="mut" style="margin-top:14px">Load ho raha hai…</p>' : cards || '<p class="mut" style="margin-top:14px">Abhi koi bachcha juda nahi hai. Niche code daalo.</p>'}
      <div class="card" style="margin-top:12px"><h2 class="sec" style="margin:0 0 6px">Bachche ka code daalo</h2><p class="mut" style="margin:0 0 6px">Bachche ke phone par Bolo mein "Parent ke liye" kholo aur "Code banao" dabao.</p>
        <input id="klCode" style="${field}" maxlength="9" autocomplete="off" autocapitalize="characters" placeholder="ABCD-EFGH" aria-label="Bachche ka code"><button class="btn" data-kl="join" ${P.busy ? 'disabled' : ''} style="margin-top:10px">Jodo</button></div>
      ${P.msg ? `<p class="mut" role="status" style="margin-top:10px">${esc(P.msg)}</p>` : ''}${P.err ? `<p class="err">${esc(P.err)}</p>` : ''}
      <div class="chips" style="margin-top:16px"><button class="chip" data-kl="refresh">Taaza karo</button><button class="chip" data-act="csback">Kid mode band karo</button></div>`;
  }

  // ---- child's phone: \"Mentor sun rahe hain\" ----
  // While a parent's listening window is open, the child's screen says so, and the child can stop it with one tap.
  async function listenPoll() {
    const C = cloud(); if (role() !== 'kid' || !C || !S.uid || !S.kid.link) return;
    let all = [];
    try { all = await C.mentors(S.kid.link.code); } catch (e) { return; }
    const now = all.filter(m => m.status === 'approved' && +m.listenUntil > Date.now()).map(m => ({ uid: m.uid, name: m.name }));
    if (now.length && !S.listen.length) setTimeout(() => livePush(true), 50);   // a window just opened: the mentor sees the screen at once
    const pend = all.filter(m => m.status === 'pending').map(m => ({ uid: m.uid, name: m.name }));
    const same = now.length === S.listen.length && now.every((m, i) => m.uid === S.listen[i].uid);
    const asks = all.filter(m => m.status === 'approved' && +m.watchAsk > 0 && !(+m.listenUntil > Date.now())).map(m => ({ uid: m.uid, name: m.name }));
    const sameAsk = asks.length === (S.kid.asks || []).length && asks.every((m, i) => m.uid === S.kid.asks[i].uid);
    const samePend = pend.length === S.kid.pend.length && pend.every((m, i) => m.uid === S.kid.pend[i].uid);
    S.listen = now; S.kid.pend = pend; S.kid.asks = asks; if (!same || !samePend || !sameAsk) draw();
  }
  // Mentor requests on the child's phone ("Parent ke liye"). A parent joining is optional: the parent can approve or refuse right here.
  // The buttons work only while the parent PIN is open (edit), so a child can not approve when a PIN is set; a confirm question comes first.
  async function kidMentor(uid, ok) {
    const C = cloud(), K = S.kid; if (role() !== 'kid' || !C || !K.link || K.busy) return;
    if (ok && !g.confirm('Kya aap bachche ke parent ho? Ye mentor bachche ka din aur Online/Offline dekh sakega.')) return;
    if (!ok && !g.confirm('Is mentor ki request hata dein?')) return;
    K.busy = true; K.err = ''; K.msg = ''; draw();
    try { if (ok) { await C.mentorApprove(K.link.code, uid); K.msg = 'Mentor ko manzoori mil gayi.'; } else { await C.mentorDrop(K.link.code, uid); K.msg = 'Request hata di.'; } } catch (e) { K.err = fail(e); }
    K.busy = false; await listenPoll(); draw();
  }
  function kidMentorsHTML(edit) {
    const K = S.kid; if (!K.link) return '';
    const list = K.pend || [];
    const rows = list.map(m => `<div style="margin-top:8px"><b>${esc(m.name)}</b> <span class="mut">mentor banna chahta hai</span>${edit
      ? `<div class="chips" style="margin-top:6px"><button class="chip" data-kl="kmyes" data-u="${esc(m.uid)}" ${K.busy ? 'disabled' : ''}>Manzoor karo</button><button class="chip" data-kl="kmno" data-u="${esc(m.uid)}" ${K.busy ? 'disabled' : ''}>Mana karo</button></div>`
      : '<p class="mut" style="margin:4px 0 0;font-size:12.5px">Manzoori ke liye parent ka PIN chahiye.</p>'}</div>`).join('');
    const asks = (K.asks || []).map(m => `<div style="margin-top:8px"><b>${esc(m.name)}</b> <span class="mut">sunna aur dekhna chahta hai</span>${edit
      ? `<div class="chips" style="margin-top:6px"><button class="chip" data-kl="kwyes" data-u="${esc(m.uid)}" ${K.busy ? 'disabled' : ''}>1 ghante ke liye do</button><button class="chip" data-kl="kwno" data-u="${esc(m.uid)}" ${K.busy ? 'disabled' : ''}>Abhi nahi</button></div>`
      : '<p class="mut" style="margin:4px 0 0;font-size:12.5px">Manzoori ke liye parent ka PIN chahiye.</p>'}</div>`).join('');
    return `<div style="margin-top:12px"><b>Mentor ki request</b>${list.length ? rows : '<p class="mut" style="margin:4px 0 0;font-size:12.5px">Abhi koi request nahi.</p>'}${asks}</div>`;
  }
  function kidBannerHTML() {
    klStyle();
    const L = role() === 'kid' ? S.listen : []; if (!L.length) return '';
    return `<div class="card kl-listen" role="status" style="margin-top:12px"><div class="bl-row"><span class="kl-state"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3z"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg><b>Mentor sun rahe hain</b></span><button class="chip" data-kl="kstop">Band karo</button></div><p class="mut" style="margin:4px 0 0;font-size:12.5px">${esc(L.map(m => m.name).join(', '))} tumhari Saath me bolo recording sun sakte hain, aur ye bhi dekh sakte hain ki screen par kya likha hai (sirf likha hua, photo ya awaaz nahi).</p></div>`;
  }
  // A mentor asks to listen / watch (the ask is a time stamp on the mentor's own record), or takes the ask back.
  async function mentorWatch(code, on) {
    const C = cloud(), M = S.men; if (role() !== 'mentor' || !C || !C.mentorWatchAsk || M.busy) return;
    M.err = '';
    try { await C.mentorWatchAsk(code, on); } catch (e) { M.err = fail(e); }
    await menLoad(true); draw();
  }
  async function watchNo(code, uid, who) {
    const C = cloud(); if (!C || !C.mentorWatchNo) return;
    try { await C.mentorWatchNo(code, uid); } catch (e) {}
    if (who === 'par') { await parLoad(true); draw(); } else { await listenPoll(); draw(); }
  }
  // The child's phone ("Parent ke liye", parent PIN open): give the asking mentor the 1-hour window, or say no.
  async function kidWatch(uid, ok) {
    const C = cloud(), K = S.kid; if (role() !== 'kid' || !C || !K.link || K.busy) return;
    if (ok && !g.confirm('Kya aap bachche ke parent ho? Ye mentor 1 ghante tak screen par likha hua dekh sakega (photo ya awaaz nahi). Aap ya bachcha kabhi bhi band kar sakte ho.')) return;
    K.busy = true; K.err = ''; K.msg = ''; draw();
    try { if (ok) { await C.mentorListen(K.link.code, uid, Date.now() + 3600000); K.msg = 'Mentor 1 ghante tak dekh sakta hai.'; } else { await C.mentorWatchNo(K.link.code, uid); K.msg = 'Request mana kar di.'; } } catch (e) { K.err = fail(e); }
    K.busy = false; await listenPoll(); draw();
  }
  async function kidStop() {
    const C = cloud(); if (role() !== 'kid' || !C || !S.kid.link) return;
    const list = S.listen.slice(); S.listen = []; draw();
    for (const m of list) { try { await C.mentorListen(S.kid.link.code, m.uid, 0); } catch (e) {} }
    livePush();   // the window is closed: the live words are removed at once
  }
  // ---- mentor's phone ----
  // Ask with a child's code. The parent has to approve before the mentor sees anything. Returns { ok: true } or { err: 'text' }.
  async function mentorAsk(raw) {
    const C = cloud(), code = normCode(raw);
    if (!goodCode(code)) return { err: 'Code 8 akshar ka hota hai (jaise ABCD-EFGH). Bachche ke parent se dobara lo.' };
    if (!C) return { err: 'Net ya server ki dikkat. Thodi der baad try karo.' };
    try {
      const link = await C.link(code);
      if (!link) return { err: 'Ye code nahi mila. Parent se dobara code lo.' };
      const me = await C.mentorMe(code);
      if (me) return me.status === 'approved' ? { ok: true, code, again: true } : { ok: true, code, again: true, waiting: true };
      await C.mentorAsk(code, firstName() || 'Mentor');
      S.men.loaded = false; return { ok: true, code };
    } catch (e) { return { err: fail(e) }; }
  }
  async function menLoad(force) {
    const C = cloud(), M = S.men; if (!C || !S.uid || M.busy || (M.loaded && !force)) return;
    M.busy = true; M.err = '';
    try {
      const out = [];
      const mine = C.menteeData ? await C.menteeData() : (await C.myMentees()).map(id => ({ id })), tgt = {};
      mine.forEach(m => { tgt[m.id] = +m.target || 0; });
      for (const code of mine.map(m => m.id)) {
        const link = await C.link(code);
        const me = link ? await C.mentorMe(code) : null;
        if (!link || !me) { try { await C.forgetMentee(code); } catch (e) {} continue; }   // the child stopped sharing, or the parent said no
        let pres = null, sum = null, wa = null, rep = null;
        if (me.status === 'approved') { try { pres = await C.getPres(code); } catch (e) {} try { sum = await C.getSum(code); } catch (e) {} wa = await C.getWa(code); rep = await C.getRep(code); }
        out.push({ code, name: link.name, nk: link.nk === true, status: me.status, pres, sum, wa, rep, target: tgt[code] || 0, listenUntil: +me.listenUntil || 0, watchAsk: +me.watchAsk || 0 });
      }
      M.kids = out;
    } catch (e) { M.err = fail(e); }
    M.loaded = true; M.busy = false; draw();
  }
  // The report text for the parent: today only (online time, right and repeat counts). The mentor opens WhatsApp and presses Send.
  function reportText(k) {
    const dk = dayKey(), sm = k.sum && k.sum.day === dk ? k.sum : null, t = tiles(sm, k.sum && k.sum.total);
    return 'Namaste! ' + k.name + ' ki aaj ki Orbit report:\n'
      + 'Online time: ' + min(onlineSec(k.pres, dk)) + ' min\n'
      + 'Bolo practice: ' + min(sm ? +sm.sec || 0 : 0) + ' min\n'
      + 'Sahi jawab: ' + t.ok + ', dobara karne wale: ' + t.redo + '\n'
      + 'Ab tak kul sahi: ' + t.tot + '\n- ' + (firstName() || 'Mentor') + ' (mentor)';
  }
  function menWa(code) {
    const k = S.men.kids.find(x => x.code === code); if (!k || !k.wa || !/^[0-9]{10,15}$/.test(k.wa.num || '')) return;
    g.open('https://wa.me/' + k.wa.num + '?text=' + encodeURIComponent(reportText(k)), '_blank', 'noopener');
  }
  // The mentor's own daily target for one child (right answers a day). Private to the mentor; 0 removes it.
  async function menTarget(code, n) {
    const C = cloud(), M = S.men; n = +n; if (!C || !C.menteeSet || ![0, 5, 10, 15, 20].includes(n)) return;
    const k = M.kids.find(x => x.code === code); if (!k) return;
    k.target = n; draw();
    try { await C.menteeSet(code, { target: n }); } catch (e) { M.err = fail(e); draw(); }
  }
  async function menAdd() {
    const el = g.document.getElementById('klMCode'), M = S.men; if (M.busy) return;
    M.busy = true; M.err = ''; M.msg = ''; draw();
    const r = await mentorAsk(el && el.value); M.busy = false;
    if (r.err) { M.err = r.err; draw(); return; }
    M.msg = r.again ? (r.waiting ? 'Request pehle se bheji hui hai. Parent ki manzoori ka intezaar hai.' : 'Ye bachcha pehle se juda hai.') : 'Request bhej di. Parent manzoor karega tab bachcha dikhega.';
    M.loaded = false; menLoad(true);
  }
  async function menLeave(code) {
    const C = cloud(), M = S.men, u = S.uid; if (!C || M.busy) return;
    if (!g.confirm('Is bachche ke mentor nahi rehna?')) return;
    M.busy = true; draw();
    try { await C.mentorDrop(code, u); await C.forgetMentee(code); M.msg = 'Hata diya.'; } catch (e) { M.err = fail(e); }
    M.busy = false; M.loaded = false; menLoad(true);
  }
  // Week chart (online minutes per day), the streak, and the items still to repeat. All from the child's state/rep, read only.
  const nn = (v, hi) => Math.max(0, Math.min(hi, Math.round(+v) || 0));
  const addDay = (dk, n) => { const d = new Date(dk + 'T00:00:00'); d.setDate(d.getDate() + n); return dayKey(d); };
  // The streak alone (for the card header). null when the child has not sent a report yet.
  function streakOf(k) {
    const rep = k.rep, today = dayKey(); if (!rep || !Array.isArray(rep.days)) return 0;
    const map = {}; rep.days.forEach(x => { if (x && /^\d{4}-\d{2}-\d{2}$/.test(String(x.d))) map[x.d] = x; });
    const po = onlineSec(k.pres, today); if (po > nn((map[today] || {}).o, 86400)) map[today] = Object.assign({ k: 0, r: 0 }, map[today], { o: po });
    const act = d => { const x = map[d]; return !!x && (nn(x.o, 86400) >= 60 || nn(x.k, 9999) + nn(x.r, 9999) > 0); };
    let n = 0, d = act(today) ? today : addDay(today, -1); while (act(d) && n < 7) { n++; d = addDay(d, -1); } return n;
  }
  function weekHTML(k) {
    const rep = k.rep, today = dayKey();
    if (!rep || !Array.isArray(rep.days)) return '<p class="mut" style="margin:12px 0 0">Hafte ka chart aur "dobara karne wale" tab dikhenge jab bachcha Orbit par aayega.</p>';
    const map = {};
    rep.days.forEach(x => { if (x && /^\d{4}-\d{2}-\d{2}$/.test(String(x.d))) map[x.d] = { o: nn(x.o, 86400), b: nn(x.b, 86400), k: nn(x.k, 9999), r: nn(x.r, 9999) }; });
    const po = onlineSec(k.pres, today); if (po > ((map[today] || {}).o || 0)) map[today] = Object.assign({ b: 0, k: 0, r: 0 }, map[today], { o: po });
    const days = []; for (let i = 6; i >= 0; i--) { const d = addDay(today, -i); days.push(Object.assign({ d, o: 0, b: 0, k: 0, r: 0 }, map[d] || {})); }
    const active = x => x.o >= 60 || x.k + x.r > 0;
    let streak = 0, i = active(days[6]) ? 6 : 5; for (; i >= 0 && active(days[i]); i--) streak++;
    const max = Math.max(600, ...days.map(x => x.o)), tot = days.reduce((a, x) => a + x.o, 0), right = days.reduce((a, x) => a + x.k, 0);
    const bars = days.map((x, ix) => { const wd = new Date(x.d + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short' }), h = Math.max(3, Math.round(x.o / max * 56));
      return `<div class="kl-wd${ix === 6 ? ' kl-wt' : ''}" role="img" aria-label="${esc(wd)}: ${min(x.o)} min online, ${x.k} sahi, ${x.r} dobara"><span class="kl-wm">${min(x.o)}</span><i style="height:${h}px"></i><span class="kl-wl">${esc(wd)}</span></div>`; }).join('');
    const weak = Array.isArray(rep.weak) ? rep.weak.slice(0, 8) : [];
    const wk = weak.length ? weak.map(w => `<p style="margin:3px 0"><span class="mut">${esc(String(w && w.t || '').slice(0, 20))}:</span> <span lang="as" style="font-size:18px">${(Array.isArray(w && w.l) ? w.l : []).slice(0, 12).map(x => esc(String(x).slice(0, 8))).join('&nbsp; ')}</span></p>`).join('') : '<p class="mut" style="margin:3px 0">Abhi koi letter ya sawal dobara karne ke liye nahi hai.</p>';
    return `<p style="margin:14px 0 0"><b>Pichhle 7 din</b> <span class="mut">(online minutes)</span></p><div class="kl-wk">${bars}</div>
      <p style="margin:8px 0 0">Lagatar: <b>${streak} din</b>. Is hafte: <b>${min(tot)} min</b> online, <b>${right}</b> sahi.</p>
      <p style="margin:14px 0 2px"><b>Dobara karne wale</b></p>${wk}`;
  }
  const isOnline = p => !!(p && p.on === true && Date.now() - (+p.at || 0) < ONLINE_MS);
  // ---- the mentor's dashboard: overview, colour per child, "dhyan chahiye" alerts, filter, daily target ----
  const MI = { clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.5"/>', alert: '<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17h.01"/>', chart: '<path d="M4 20V10M10 20V4M16 20v-7M2 20h20"/>', check: '<path d="M5 13l4 4L19 7"/>', flame: '<path d="M12 3c1 3.5 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3.2 2-4 0 2 1 3 2 3 0-3-1-6 1-9z"/>', redo: '<path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 4v5h-5"/>', users: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20a6 6 0 0 1 12 0"/><path d="M16 5a3 3 0 0 1 0 6M18 20a5.5 5.5 0 0 0-3-5"/>', wave: '<path d="M2 12h3l2-6 4 12 3-9 2 3h6"/>' };
  const mi = n => `<svg class="md-i" viewBox="0 0 24 24" aria-hidden="true">${MI[n]}</svg>`;
  const KC = [['#ec4899', '#be185d'], ['#3b82f6', '#1d4ed8'], ['#22c55e', '#15803d'], ['#8b5cf6', '#6d28d9'], ['#f97316', '#c2410c'], ['#14b8a6', '#0f766e']];
  const kcol = code => { let h = 0; for (const c of String(code)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return KC[h % KC.length]; };
  // What needs the mentor's attention for one approved child. c: 'a' = amber, 'r' = red.
  function flagsOf(k) {
    if (k.status !== 'approved' || k.nk) return [];   // a Not Kid student shares no online time, so there is nothing to flag
    const f = [], dk = dayKey(), sm = k.sum && k.sum.day === dk ? k.sum : null;
    if (!k.pres) f.push({ c: 'r', t: 'Abhi tak Orbit par nahi aaya' });
    else if (!isOnline(k.pres)) { const d = Math.floor((Date.now() - (+k.pres.at || 0)) / 86400000); if (d >= 1) f.push({ c: d >= 2 ? 'r' : 'a', t: d === 1 ? 'Kal se Orbit par nahi aaya' : d + ' din se Orbit par nahi aaya' }); }
    if (sm) { const ok = +sm.ok || 0, n = ok + (+sm.redo || 0); if (n >= 6 && ok * 100 / n < 50) f.push({ c: 'a', t: 'Aaj sahi jawab kam hain (' + Math.round(ok * 100 / n) + '%)' }); }
    const w = k.rep && Array.isArray(k.rep.weak) ? k.rep.weak.reduce((a, x) => a + ((x && Array.isArray(x.l)) ? x.l.length : 0), 0) : 0;
    if (w >= 8) f.push({ c: 'a', t: w + ' letters dobara karne hain' });
    return f;
  }
  const rankOf = k => k.status !== 'approved' ? 3 : isOnline(k.pres) ? 0 : flagsOf(k).length ? 1 : 2;
  function kidCard(k) {
    const on = k.status === 'approved' && isOnline(k.pres), ok = k.status === 'approved', nk = !!k.nk, dk = dayKey(), [c1, c2] = kcol(k.code);
    const pill = !ok ? `<span class="md-pill">${nk ? 'Student' : 'Parent'} ki manzoori ka intezaar</span>`
      : nk ? `<span class="md-pill">Student</span>`
      : `<span class="md-pill kl-state"><i class="kl-dot ${on ? 'kl-on' : 'kl-off'}" aria-hidden="true"></i><b>${on ? 'Online' : 'Offline'}</b></span>`;
    const streak = ok ? streakOf(k) : 0, flags = flagsOf(k);
    const sm = k.sum && k.sum.day === dk ? k.sum : null, osec = onlineSec(k.pres, dk), bolo = sm ? +sm.sec || 0 : 0, right = sm ? +sm.ok || 0 : 0;
    const flagH = flags.length ? `<div>${flags.map(x => `<span class="md-flag ${x.c}">${mi('alert')}${esc(x.t)}</span>`).join('')}</div>` : '';
    const last = ok && !on ? `<p class="mut" style="margin:6px 0 0">${k.pres ? 'Aakhri baar: ' + esc(new Date(+k.pres.at || 0).toLocaleString()) : 'Abhi tak bachcha Orbit par nahi aaya.'}</p>` : '';
    const live = ok && on && k.pres.act ? `<p class="md-live">${mi('wave')}Abhi kar raha hai: <b>${esc(k.pres.act)}</b></p>` : '';
    let target = '';
    if (ok) {
      const t = +k.target || 0, pct = t ? Math.min(100, Math.round(right * 100 / t)) : 0;
      target = `<div class="md-tg"><div class="md-h" style="margin:0">${mi('target')}<span>Aaj ka target</span></div>
        ${t ? `<div class="bl-row" style="margin:8px 0 6px"><span><b>${right}</b> / ${t} sahi jawab</span>${right >= t ? `<span class="md-done">${mi('check')}Target poora</span>` : `<span class="mut">${t - right} baaki</span>`}</div><div class="md-bar"><u style="width:${pct}%"></u></div>` : '<p class="mut" style="margin:6px 0 0;font-size:12.5px">Roz ke sahi jawab ka target tay karo. Ye sirf tumhe dikhta hai.</p>'}
        <div class="chips" style="margin-top:8px">${[5, 10, 15, 20].map(n => `<button class="chip md-n" data-kl="mtarget" data-v="${esc(k.code)}" data-n="${n}" aria-pressed="${t === n}">${n}</button>`).join('')}${t ? `<button class="chip" data-kl="mtarget" data-v="${esc(k.code)}" data-n="0">Hatao</button>` : ''}</div></div>`;
    }
    const prog = ok ? `<div class="md-h">${mi('clock')}<span>Aaj ka progress</span></div><p style="margin:0">Aaj online: <b>${min(osec)} min</b>. Bolo practice: <b>${min(bolo)} min</b>.</p>${tilesHTML(tiles(sm, k.sum && k.sum.total))}` : '';
    const week = ok ? weekHTML(k) : '';
    const watching = ok && +k.listenUntil > Date.now();
    const watch = watching ? `<div class="md-h">${mi('wave')}<span>Live screen</span></div><div class="md-watch" data-kl-live="${esc(k.code)}" aria-live="polite">${liveHTML(S.men.live && S.men.live[k.code])}</div>` : '';
    const askBox = ok && !watching ? (+k.watchAsk > 0
      ? `<div class="md-h">${mi('wave')}<span>Sunna aur dekhna</span></div><p style="margin:0">Request bhej di (${esc(new Date(k.watchAsk).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }))}). Parent ya bachche ke parent ki manzoori ka intezaar.</p><div class="chips" style="margin-top:8px"><button class="chip" data-kl="mwatchoff" data-v="${esc(k.code)}">Request wapas lo</button></div>`
      : `<div class="md-h">${mi('wave')}<span>Sunna aur dekhna</span></div><div class="chips"><button class="chip" data-kl="mwatch" data-v="${esc(k.code)}">Sunna / Dekhna maango</button></div><p class="mut" style="margin:6px 0 0;font-size:12.5px">Parent manzoor karega to 1 ghante tak bachche ki recordings sun sakte ho aur uski screen par likha hua live dekh sakte ho.</p>`) : '';
    const voice = ok && g.BOLOREC && g.BOLOREC.mentorHTML ? g.BOLOREC.mentorHTML(k.code, k.listenUntil) : '';
    const wa = ok && k.wa && k.wa.num ? `<button class="chip" data-kl="mwa" data-v="${esc(k.code)}">WhatsApp report</button>` : '';
    const sand = ok && g.SANDESH && g.SANDESH.cardHTML ? g.SANDESH.cardHTML(k.code, k.name) : '';   // Sandesh bhejo (sandesh.js)
    return `<div class="md-card" data-kl-mcard="${esc(k.code)}" style="--k1:${c1};--k2:${c2}"><div class="md-top"><div class="md-av" aria-hidden="true">${esc(String(k.name || '?').trim().charAt(0).toUpperCase() || '?')}</div><div class="md-nm"><h2>${esc(k.name)}</h2>${pill}</div>${streak ? `<span class="md-streak" title="Lagatar din">${mi('flame')}${streak}</span>` : ''}</div>
      <div class="md-body">${sand}${nk ? '' : flagH + live + watch + askBox + last + target + prog + week + voice}
        <div class="chips" style="margin-top:14px">${nk ? '' : wa}<button class="chip" data-kl="mleave" data-v="${esc(k.code)}">${ok ? 'Is bachche se hatao' : 'Request wapas lo'}</button></div></div></div>`;
  }
  // Live screen on the mentor's side: the child's screen drawn again through the cleaner (never innerHTML of what came from Firestore), read-only. Older than 20 s means the phone is in the background.
  function liveHTML(l) {
    if (!l) return '<p class="mut" style="margin:0">Bachche ka screen yahan dikhega (kuch second mein).</p>';
    if (Date.now() - (+l.at || 0) > 20000) return '<p class="mut" style="margin:0">Bachche ka phone background mein hai ya Orbit band hai.</p>';
    const ln = (Array.isArray(l.lines) ? l.lines : []).slice(0, 14).map(x => `<div style="padding:3px 0">${esc(String(x).slice(0, 60))}</div>`).join('');
    return `${l.act ? `<p style="margin:0 0 4px"><b>${esc(String(l.act).slice(0, 40))}</b></p>` : ''}<div class="md-ln" style="padding:8px 12px;border-radius:12px;background:rgba(0,0,0,.05)">${ln || '<span class="mut">Abhi koi sawaal nahi.</span>'}</div>`;
  }
  // Updates the open box in place: the copy is built node by node (snapInto), so what the child's screen shows is never run as HTML or script.
  function liveFill(el, l) {
    const d = g.document, mk = (tag, txt, st) => { const n = d.createElement(tag); n.textContent = txt; if (st) n.setAttribute('style', st); return n; };
    while (el.firstChild) el.removeChild(el.firstChild);
    if (!l) { el.appendChild(mk('p', 'Bachche ka screen yahan dikhega (kuch second mein).', 'margin:0')); return; }
    if (Date.now() - (+l.at || 0) > 20000) { el.appendChild(mk('p', 'Bachche ka phone background mein hai ya Orbit band hai.', 'margin:0')); return; }
    if (l.act) { const p = d.createElement('p'); p.setAttribute('style', 'margin:0 0 4px'); p.appendChild(mk('b', String(l.act).slice(0, 40))); el.appendChild(p); }
    if (typeof l.html === 'string' && l.html && l.html.length <= LIVE_MAX) {
      let n = 0;
      try {
        const mirror = d.createElement('div'); mirror.className = 'md-mirror';   // the outer box scrolls; the copy inside can not be touched
        const inner = d.createElement('div'); inner.className = 'md-mirror-in'; inner.setAttribute('inert', ''); inner.setAttribute('aria-hidden', 'true'); mirror.appendChild(inner);
        const parsed = new g.DOMParser().parseFromString('<body>' + l.html + '</body>', 'text/html');
        n = snapInto(parsed.body, inner, d);
        if (n > 0) { el.appendChild(mirror); el.appendChild(mk('p', 'Sirf dekh sakte ho: yahan dabane se bachche ki screen par kuch nahi badlega.', 'margin:6px 0 0;font-size:12.5px;opacity:.7')); return; }
      } catch (e) { n = 0; }
    }
    const box = d.createElement('div'); box.className = 'md-ln'; box.setAttribute('style', 'padding:8px 12px;border-radius:12px;background:rgba(0,0,0,.05)');
    const lines = (Array.isArray(l.lines) ? l.lines : []).slice(0, 14);
    lines.forEach(x => box.appendChild(mk('div', String(x).slice(0, 60), 'padding:3px 0')));
    if (!lines.length) box.appendChild(mk('span', 'Abhi koi sawaal nahi.'));
    el.appendChild(box);
  }
  async function liveTick() {
    const C = cloud(), M = S.men; if (role() !== 'mentor' || !C || !C.getLive || !seen()) return;
    const open = (M.kids || []).filter(k => k.status === 'approved' && +k.listenUntil > Date.now());
    M.live = M.live || {};
    for (const k of open) {
      let l = null; try { l = await C.getLive(k.code); } catch (e) {}
      M.live[k.code] = l;
      const el = g.document.querySelector('[data-kl-live="' + k.code + '"]'); if (el) liveFill(el, l);
    }
  }
  function mentorHTML() {
    klStyle();
    const M = S.men; if (!M.loaded && !M.busy && S.uid) menLoad();
    const appr = M.kids.filter(k => k.status === 'approved'), dk = dayKey();
    const onl = appr.filter(k => isOnline(k.pres)).length, attn = appr.filter(k => flagsOf(k).length).length;
    const tmin = appr.reduce((a, k) => a + min(onlineSec(k.pres, dk)), 0), tright = appr.reduce((a, k) => a + ((k.sum && k.sum.day === dk) ? +k.sum.ok || 0 : 0), 0);
    const heroBox = appr.length ? `<div class="md-hero"><div><small>Namaste</small><b>${esc(firstName() || 'Mentor')}</b></div>
      <div class="md-stats"><div><b>${appr.length}</b><span>Bachche</span></div><div><b>${onl}</b><span>Abhi online</span></div><div><b>${tmin}</b><span>Aaj ke min</span></div><div class="${attn ? 'md-warn' : ''}"><b>${attn}</b><span>Dhyan chahiye</span></div></div>
      </div>` : '';
    const tsum = appr.length && tright ? `<p class="mut" style="margin:8px 0 0">Aaj sab bachchon ne milkar <b>${tright}</b> sahi jawab diye.</p>` : '';
    // One picker: Sab, each child (tap to see only that child), then Online and Dhyan chahiye. It stays on top together with the Namaste box.
    const F = ['all', 'online', 'attn'].includes(M.filter) || M.kids.some(k => k.code === M.filter) ? M.filter : 'all';
    const kidsSorted = M.kids.slice().sort((a, b) => rankOf(a) - rankOf(b) || String(a.name).localeCompare(String(b.name)));
    const pill = (v, label, dot) => `<button class="chip md-f" data-kl="mfilter" data-v="${esc(v)}" aria-pressed="${F === v}">${dot || ''}${label}</button>`;
    const filt = M.kids.length >= 2 ? `<div class="md-sw" role="group" aria-label="Bachche chuno">${pill('all', 'Sab (' + M.kids.length + ')')}${kidsSorted.map(k => pill(k.code, esc(String(k.name || '?').trim().split(/\s+/)[0].slice(0, 14)), k.status === 'approved' ? `<i class="md-dot ${isOnline(k.pres) ? 'on' : ''}" aria-hidden="true"></i>` : '')).join('')}${pill('online', 'Online (' + onl + ')')}${pill('attn', 'Dhyan chahiye (' + attn + ')')}</div>` : '';
    const hero = heroBox || filt ? `<div class="md-sticky">${heroBox}${filt}</div>${tsum}` : '';
    const shown = M.kids.filter(k => F === 'all' || F === k.code || (F === 'online' && k.status === 'approved' && isOnline(k.pres)) || (F === 'attn' && flagsOf(k).length))
      .sort((a, b) => rankOf(a) - rankOf(b) || String(a.name).localeCompare(String(b.name)));
    const cards = shown.map(kidCard).join('');
    return `<h1 style="font-size:26px;margin-top:14px">Mentor</h1>${hero}
      ${M.busy && !M.loaded ? '<p class="mut" style="margin-top:14px">Load ho raha hai…</p>' : cards || (M.kids.length ? '<p class="mut" style="margin-top:14px">Is filter me koi bachcha nahi hai.</p>' : '<p class="mut" style="margin-top:14px">Abhi koi bachcha juda nahi hai. Niche code daalo.</p>')}
      <div class="card" style="margin-top:14px"><h2 class="sec" style="margin:0 0 6px">Bachche ka code daalo</h2><p class="mut" style="margin:0 0 6px">Code bachche ke parent se lo. Parent ko request manzoor karni hogi.</p>
        <input id="klMCode" style="${field}" maxlength="9" autocomplete="off" autocapitalize="characters" placeholder="ABCD-EFGH" aria-label="Bachche ka code"><button class="btn" data-kl="madd" ${M.busy ? 'disabled' : ''} style="margin-top:10px">Request bhejo</button></div>
      ${M.msg ? `<p class="mut" role="status" style="margin-top:10px">${esc(M.msg)}</p>` : ''}${M.err ? `<p class="err">${esc(M.err)}</p>` : ''}
      <div class="chips" style="margin-top:16px"><button class="chip" data-kl="mrefresh">Taaza karo</button><button class="chip" data-act="csback">Kid mode band karo</button></div>`;
  }

  // ---- events ----
  g.document.addEventListener('click', e => {
    const b = e.target && e.target.closest ? e.target.closest('[data-kl]') : null; if (!b || b.disabled) return;
    const a = b.dataset.kl;
    if (a === 'mk') kidMake(false);
    else if (a === 'new') kidMake(true);
    else if (a === 'off') kidOff();
    else if (a === 'copy') { const c = S.kid.link && S.kid.link.code; if (c && g.navigator.clipboard && g.navigator.clipboard.writeText) g.navigator.clipboard.writeText(fmt(c)).then(() => { S.kid.msg = 'Code copy ho gaya.'; draw(); }, () => {}); }
    else if (a === 'join') parJoin();
    else if (a === 'leave') parLeave(b.dataset.v);
    else if (a === 'refresh') { S.par.msg = ''; parLoad(true); }
    else if (a === 'wasave') parWa(b.dataset.v, false);
    else if (a === 'wadel') parWa(b.dataset.v, true);
    else if (a === 'lgo') parListen(b.dataset.v, b.dataset.u, true);
    else if (a === 'lstop') parListen(b.dataset.v, b.dataset.u, false);
    else if (a === 'lno') watchNo(b.dataset.v, b.dataset.u, 'par');
    else if (a === 'mwatch') mentorWatch(b.dataset.v, true);
    else if (a === 'mwatchoff') mentorWatch(b.dataset.v, false);
    else if (a === 'kwyes') kidWatch(b.dataset.u, true);
    else if (a === 'kwno') kidWatch(b.dataset.u, false);
    else if (a === 'kstop') kidStop();
    else if (a === 'kmyes') kidMentor(b.dataset.u, true);
    else if (a === 'kmno') kidMentor(b.dataset.u, false);
    else if (a === 'myes') parMentor(b.dataset.v, b.dataset.u, true);
    else if (a === 'mno') parMentor(b.dataset.v, b.dataset.u, false);
    else if (a === 'madd') menAdd();
    else if (a === 'mwa') menWa(b.dataset.v);
    else if (a === 'mtarget') menTarget(b.dataset.v, b.dataset.n);
    else if (a === 'mfilter') { const v = b.dataset.v; S.men.filter = ['all', 'online', 'attn'].includes(v) || S.men.kids.some(k => k.code === v) ? v : 'all'; draw(); try { g.scrollTo(0, 0); } catch (e) {} }
    else if (a === 'mleave') menLeave(b.dataset.v);
    else if (a === 'mrefresh') { S.men.msg = ''; menLoad(true); }
  });
  g.document.addEventListener('change', e => {
    const t = e.target; if (!t || !t.dataset) return;
    if (t.dataset.klLim) parSet(t.dataset.klLim, { limit: +t.value });
    else if (t.dataset.klMic) parSet(t.dataset.klMic, { mic: !!t.checked });
    else if (t.dataset.klRec) parSet(t.dataset.klRec, { rec: !!t.checked });
    else if (t.dataset.klVol) parSet(t.dataset.klVol, { vol: volOf(t.value) });
  });
  g.document.addEventListener('input', e => { const t = e.target; if (t && t.dataset && t.dataset.klLim) { const l = g.document.getElementById('klLimV-' + t.dataset.klLim); if (l) l.textContent = limTxt(+t.value); } else if (t && t.dataset && t.dataset.klVol) { const l = g.document.getElementById('klVolV-' + t.dataset.klVol); if (l) l.textContent = VOLN[volOf(t.value) - 1]; } });
  // every 30 s: the child's phone reads the parent's settings, the parent's phone refreshes the child's day
  // The parent's screen is not redrawn while a code is being typed or a slider is being used (a redraw would wipe it).
  const editing = () => { const a = g.document.activeElement, c = g.document.getElementById('klCode'); return !!((c && c.value) || (a && (a.id === 'klCode' || (a.dataset && (a.dataset.klLim || a.dataset.klMic || a.dataset.klRec || a.dataset.klWa)))) || !!(g.BOLOREC && g.BOLOREC.busy())); };
  function tick() {
    if (!S.uid || (g.document.visibilityState && g.document.visibilityState !== 'visible')) return;
    const r = role();
    if (r === 'kid') { pull(); beat(); repPush(); if (++S.polls % 2 === 0) listenPoll(); } else if (r === 'parent' && !editing()) parLoad(true); else if (r === 'mentor' && !menEditing()) menLoad(true);
  }
  const menEditing = () => { const c = g.document.getElementById('klMCode'); return !!((c && (c.value || g.document.activeElement === c)) || (g.BOLOREC && g.BOLOREC.busy && g.BOLOREC.busy())); };
  setInterval(tick, TICK_MS);
  setInterval(() => { try { livePush(); } catch (e) {} }, LIVE_MS);
  setInterval(() => { try { liveTick(); } catch (e) {} }, 4000);
  // The child's phone goes to the background (or comes back): Offline / Online right away, not after the next minute.
  g.document.addEventListener('visibilitychange', () => { if (role() === 'kid') beat(true); });
  if (g.addEventListener) g.addEventListener('pagehide', () => { if (role() === 'kid') beat(true); });

  g.KIDLINK = {
    normCode, goodCode, fmt, joinCode, mentorAsk, waNum, reportText, kidBannerHTML, kidPanelHTML, parentHTML, mentorHTML, touch,
    kidCode: () => (S.kid.link && S.kid.link.code) || '',
    setUser(u) { const id = u && u.uid ? u.uid : ''; if (id === S.uid) return; S.uid = id; S.kid = { loaded: false, busy: false, err: '', msg: '', link: null, parents: 0, pend: [], asks: [] }; S.par = { loaded: false, busy: false, err: '', msg: '', kids: [] }; S.men = { loaded: false, busy: false, err: '', msg: '', kids: [], filter: 'all' }; S.presAt = 0; S.presOn = null; S.accAt = 0; S.accOn = false; S.listen = []; S.repKey = ''; S.repAt = 0; S.repSend = 0; },
    _state: S, _pull: pull, _push: push, _tick: tick, _beat: beat, _kidWatch: kidWatch, _livePush: livePush, _liveBuild: liveBuild, _liveTick: liveTick, _listenPoll: listenPoll, _kidMentor: kidMentor, _repPush: repPush, _flagsOf: flagsOf
  };
})(window);
