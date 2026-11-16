// Orbit "Padhai ka time" (study time), stage 1. A parent sets a daily study time once (name, time, minutes, days, which chapter); the child's phone
// then reminds the child at that time (while Orbit is open) and runs a study session with a timer. Parent section is behind a 4-digit PIN.
// The plan is kept on this device (localStorage) and, when the child is logged in, a copy on the server so a parent can link his own phone with a one-time code,
// change the plan from there and get a push notification when the child has not started (stage 2: study-routes.js on the server, push handler in sw.js).
//   STUDY.viewHTML()  string for the "Padhai ka time" page    STUDY.setUser(u)    STUDY.leave()    STUDY._t  pure helpers (tests)
// Privacy: only taps and time are counted. No camera, no microphone, no attention or emotion reading.
(function (g) {
  'use strict';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const PLAN = 'orbit.studyplan.', LOG = 'orbit.studylog.', PINK = 'orbit.studypin.', RUN = 'orbit.studyrun.';
  const SUBJ = ['ginti', 'eng', 'asm', 'evs'], SUBJN = { ginti: 'Ginti', eng: 'English', asm: 'Assamese', evs: 'Aas-paas' }, MINS = [10, 15, 20, 30, 45, 60], DAYN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const S = { sq: null, lastAct: Date.now(), uid: '', unlocked: false, msg: '', err: '', pinMsg: '', draft: null, run: null, snoozeUntil: 0, snoozes: 0, ringDay: '', ringing: false, timer: 0 };
  const ls = { get(k) { try { return g.localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { g.localStorage.setItem(k, v); } catch (e) {} }, del(k) { try { g.localStorage.removeItem(k); } catch (e) {} } };
  const N = (hing, en, as, bn) => ({ hing, en, as, bn });
  const TX = {
    title: N('Padhai ka time', 'Study time', 'পঢ়াৰ সময়', 'পড়ার সময়'),
    notset: N('Padhai ka time abhi set nahi hai. Parent ko bolo ki neeche "Parent ke liye" mein time lagayein.', 'Study time is not set yet. Ask a parent to set it below in "Parent ke liye".', 'পঢ়াৰ সময় এতিয়াও ঠিক কৰা হোৱা নাই। অভিভাৱকক তলৰ "Parent ke liye" ত সময় ঠিক কৰিবলৈ কওক।', 'পড়ার সময় এখনো ঠিক করা হয়নি। অভিভাবককে নিচের "Parent ke liye"-তে সময় ঠিক করতে বলো।'),
    rest: N('Aaj chhutti hai. Kal milte hain.', 'No study time today. See you tomorrow.', 'আজি বিশ্ৰাম। কালি লগ পাম।', 'আজ ছুটি। কাল দেখা হবে।'),
    before: N('Padhai ka time', 'Study time is at', 'পঢ়াৰ সময়', 'পড়ার সময়'),
    due: N('Padhai ka time ho gaya!', 'It is study time!', 'পঢ়াৰ সময় হ\'ল!', 'পড়ার সময় হয়েছে!'),
    start: N('Padhai shuru karo', 'Start studying', 'পঢ়া আৰম্ভ কৰা', 'পড়া শুরু করো'),
    cont: N('Padhai jaari rakho', 'Keep studying', 'পঢ়া অব্যাহত ৰাখক', 'পড়া চালিয়ে যাও'),
    left: N('minute baaki', 'minutes left', 'মিনিট বাকী', 'মিনিট বাকি'),
    open: N('Paath kholo', 'Open the lesson', 'পাঠ খোলক', 'পাঠ খোলো'),
    pick: N('Apna paath chuno', 'Choose a lesson', 'পাঠ বাছক', 'পাঠ বেছে নাও'),
    done: N('Shabash! Aaj ki padhai poori hui.', 'Well done! Today\'s study is complete.', 'বাহ! আজিৰ পঢ়া সম্পূৰ্ণ হ\'ল।', 'বাহ! আজকের পড়া শেষ হয়েছে।'),
    ringT: N('Padhai ka time ho gaya', 'It is study time', 'পঢ়াৰ সময় হ\'ল', 'পড়ার সময় হয়েছে'),
    snooze: N('5 minute baad', 'In 5 minutes', '৫ মিনিটৰ পিছত', '৫ মিনিট পরে'),
    back: N('Padhai par wapas', 'Back to study', 'পঢ়ালৈ উভতক', 'পড়ায় ফিরে যাও')
  };
  const lang = () => (g.orbitLang && g.orbitLang()) || 'hing';
  const T = k => { const o = TX[k]; return o[lang()] || o.hing; };

  // ---- pure helpers ----
  const pad = n => String(n).padStart(2, '0');
  const ymd = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const DEF = () => ({ on: false, name: '', time: '17:00', mins: 20, days: [0, 1, 2, 3, 4, 5, 6], course: '', ch: 0, cls: 1, subj: ['ginti', 'eng', 'evs'] });
  function clean(p) {
    const d = DEF(); p = p && typeof p === 'object' ? p : {};
    d.on = p.on === true; d.name = String(p.name || '').replace(/\s+/g, ' ').trim().slice(0, 30);
    if (/^([01]\d|2[0-3]):[0-5]\d$/.test(p.time)) d.time = p.time;
    if (MINS.includes(+p.mins)) d.mins = +p.mins;
    if (Array.isArray(p.days)) d.days = [...new Set(p.days.map(Number).filter(x => Number.isInteger(x) && x >= 0 && x <= 6))].sort();
    d.course = String(p.course || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 40); d.ch = Number.isInteger(+p.ch) && +p.ch >= 0 && +p.ch <= 99 ? +p.ch : 0;
    if ([1, 2, 3].includes(+p.cls)) d.cls = +p.cls;
    if (Array.isArray(p.subj)) { const k = SUBJ.filter(x => p.subj.includes(x)); if (k.length) d.subj = k; }
    return d;
  }
  const minOf = t => +t.slice(0, 2) * 60 + +t.slice(3);
  // off | rest | before (minutesLeft) | due | done
  function stateOf(p, log, now) {
    if (!p.on) return { k: 'off' };
    if (!p.days.includes(now.getDay())) return { k: 'rest' };
    const day = log.days[ymd(now)] || {};
    if (day.done) return { k: 'done' };
    const m = now.getHours() * 60 + now.getMinutes(), at = minOf(p.time);
    return m < at ? { k: 'before', in: at - m } : { k: 'due' };
  }
  const fmtClock = t => { const h = +t.slice(0, 2); return ((h + 11) % 12 + 1) + ':' + t.slice(3) + (h < 12 ? ' AM' : ' PM'); };
  const mmss = ms => { const s = Math.max(0, Math.ceil(ms / 1000)); return pad(Math.floor(s / 60)) + ':' + pad(s % 60); };

  // ---- storage ----
  const key = p => p + (S.uid || 'guest');
  const plan = () => { try { return clean(JSON.parse(ls.get(key(PLAN)) || 'null')); } catch (e) { return DEF(); } };
  const savePlan = p => ls.set(key(PLAN), JSON.stringify(clean(p)));
  const log = () => { try { const o = JSON.parse(ls.get(key(LOG)) || '{}'); return { days: o && typeof o.days === 'object' && o.days ? o.days : {} }; } catch (e) { return { days: {} }; } };
  function saveDay(patch) {
    const l = log(), k = ymd(new Date()); l.days[k] = Object.assign({}, l.days[k], patch);
    const keep = Object.keys(l.days).sort().slice(-30), out = {}; keep.forEach(x => { out[x] = l.days[x]; });
    ls.set(key(LOG), JSON.stringify({ days: out }));
  }
  const redraw = () => { if (typeof g.draw === 'function' && typeof VIEW !== 'undefined' && VIEW === 'study') g.draw(); };
  const courses = () => (typeof DATA !== 'undefined' && DATA && Array.isArray(DATA.courses) ? DATA.courses.filter(c => !c.custom && orgFor(c.id)) : []);
  function orgFor(id) { const C = typeof CATALOG !== 'undefined' ? CATALOG : null; if (!C) return ''; for (const o in C.content) for (const k in C.content[o]) if (C.content[o][k].some(x => x[0] === id)) return o; return ''; }

  // ---- stage 2: server link (parent code, father's alerts) ----
  const NET = { linked: null, code: '', expiresAt: 0, children: null, loading: false, subs: 0, push: 'unknown', lmsg: '', lerr: '', dmsg: '', derr: '', codeIn: '', dadOpen: false, pd: null, lastPull: 0, lastKids: 0 };
  const META = 'orbit.studymeta.';
  const meta = () => { try { const m = JSON.parse(ls.get(key(META)) || '{}'); return { updatedAt: +m.updatedAt || 0, dirty: m.dirty === true }; } catch (e) { return { updatedAt: 0, dirty: false }; } };
  const setMeta = m => ls.set(key(META), JSON.stringify(m));
  async function api(method, path, body) {
    const tok = g.CLOUD && g.CLOUD.token ? await g.CLOUD.token() : null;
    if (!tok) { const e = new Error('Pehle Google se log in karo.'); e.code = 'login'; throw e; }
    const res = await g.fetch((g.ORBIT_API || '') + '/api/study/' + path, { method, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok }, body: body ? JSON.stringify(body) : undefined });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) { const e = new Error(j.error || 'Server se jawab nahi aaya. Dobara try karo.'); e.status = res.status; e.code = j.code; throw e; }
    return j;
  }
  const evt = (type, mins, q, ok) => { if (S.uid) api('POST', 'event', { type, mins, q, ok }).catch(() => {}); };   // fire and forget: the child never waits for the server
  async function pushPlan() {                      // this phone's plan -> server (needs login). If it fails, it is tried again later.
    if (!S.uid) return false;
    try { const r = await api('POST', 'plan', { plan: plan() }); setMeta({ updatedAt: r.updatedAt, dirty: false }); return true; }
    catch (e) { setMeta({ updatedAt: meta().updatedAt, dirty: true }); return false; }
  }
  async function pullPlan(force) {                 // server -> this phone: a parent may have changed the time. Also tells how many parents are linked.
    if (!S.uid || (!force && Date.now() - NET.lastPull < 180000)) return; NET.lastPull = Date.now();
    try {
      if (meta().dirty) await pushPlan();
      const r = await api('GET', 'plan');
      NET.linked = r.linked || 0;
      if (!r.plan) { if (plan().on) await pushPlan(); }
      else if ((r.updatedAt || 0) > meta().updatedAt && !meta().dirty) { savePlan(r.plan); setMeta({ updatedAt: r.updatedAt, dirty: false }); S.draft = null; }
      redraw();
    } catch (e) { /* offline or not logged in: the local plan keeps working */ }
  }
  async function loadKids(force) {
    if (!S.uid || NET.loading || (!force && Date.now() - NET.lastKids < 60000)) return; NET.loading = true; NET.lastKids = Date.now();
    try { const r = await api('GET', 'children'); NET.children = r.children; NET.subs = r.subs; } catch (e) { if (NET.children === null) NET.children = []; if (e.code !== 'login') NET.derr = e.message; }
    NET.loading = false; redraw();
  }
  async function pushState() {
    if (!(g.navigator && 'serviceWorker' in g.navigator && 'PushManager' in g && 'Notification' in g)) { NET.push = 'unsupported'; return; }
    if (g.Notification.permission === 'denied') { NET.push = 'denied'; return; }
    try { const reg = await g.navigator.serviceWorker.ready, sub = await reg.pushManager.getSubscription(); NET.push = sub ? 'on' : 'off'; } catch (e) { NET.push = 'off'; }
  }
  const b64 = v => { const p = '='.repeat((4 - v.length % 4) % 4), r = (v + p).replace(/-/g, '+').replace(/_/g, '/'), raw = g.atob(r); return Uint8Array.from(raw, c => c.charCodeAt(0)); };
  async function pushOn() {
    const perm = await g.Notification.requestPermission();            // first, straight from the tap (iPhone needs this)
    if (perm !== 'granted') { NET.push = perm === 'denied' ? 'denied' : 'off'; throw new Error('Notification ki ijazat nahi mili. Browser settings mein allow karo.'); }
    const cfg = await api('GET', 'config');
    if (!cfg.ready || !cfg.vapid) throw new Error('Server par notification abhi chalu nahi hai. Admin ko VAPID keys lagani hain.');
    const reg = await g.navigator.serviceWorker.ready;
    const sub = (await reg.pushManager.getSubscription()) || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(cfg.vapid) });
    const r = await api('POST', 'push/subscribe', { sub: sub.toJSON() }); NET.subs = r.subs; NET.push = 'on';
  }
  async function pushOff() {
    const reg = await g.navigator.serviceWorker.ready, sub = await reg.pushManager.getSubscription();
    if (sub) { const ep = sub.endpoint; await sub.unsubscribe(); await api('POST', 'push/unsubscribe', { endpoint: ep }).catch(() => {}); }
    NET.push = 'off';
  }

  // ---- session ----
  function loadRun() { try { const r = JSON.parse(ls.get(key(RUN)) || 'null'); if (r && r.day === ymd(new Date()) && r.active >= 0) return { active: +r.active, paused: true, target: plan().mins * 60000 }; } catch (e) {} return null; }
  function startRun() {
    const p = plan(); S.run = S.run || { active: 0, target: p.mins * 60000 };
    S.lastAct = Date.now(); S.run.paused = false; S.run.target = p.mins * 60000; saveDay({ started: true }); evt('started'); if (!S.sq) nextQ(); stopRing(); startTicker(); pill(); redraw();
  }
  function finish() {
    S.run = null; ls.del(key(RUN)); const doneMins = Math.round(plan().mins), dq = (log().days[ymd(new Date())] || {}); saveDay({ done: true }); evt('done', doneMins, dq.asked || 0, dq.ok || 0); S.sq = null; if (g.WEEKLY && g.WEEKLY.mark) g.WEEKLY.mark(); pill(); redraw();
  }
  function startTicker() { if (!S.timer) S.timer = setInterval(tick, 1000); }
  let sinceSave = 0;
  function tick() {
    const now = new Date();
    if (S.run && !S.run.paused && !(g.document && g.document.hidden) && Date.now() - S.lastAct < 300000) {
      S.run.active += 1000; if (++sinceSave >= 5) { sinceSave = 0; ls.set(key(RUN), JSON.stringify({ day: ymd(now), active: S.run.active })); }
      const el = g.document.getElementById('spTimer'); if (el) el.textContent = mmss(S.run.target - S.run.active);
      const pl = g.document.getElementById('spPill'); if (pl) pl.firstChild.textContent = T('cont') + ' ' + mmss(S.run.target - S.run.active);
      if (S.run.active >= S.run.target) finish();
    }
    checkRing(now);
  }

  // ---- ring: shown only while Orbit is open. (Reminders while Orbit is closed need push notifications: stage 2.) ----
  let audio = null, ringTimer = 0, ringStop = 0, missTimer = 0;
  function beep() {
    try { const A = g.AudioContext || g.webkitAudioContext; if (!A) return; audio = audio || new A(); const o = audio.createOscillator(), v = audio.createGain();
      o.type = 'sine'; o.frequency.value = 880; v.gain.value = .2; o.connect(v); v.connect(audio.destination); o.start(); o.stop(audio.currentTime + .35); } catch (e) {}
    try { if (g.navigator && g.navigator.vibrate) g.navigator.vibrate([300, 150, 300]); } catch (e) {}
  }
  function checkRing(now) {
    if (S.ringing || S.run) return;                       // already ringing, or a session is on
    const p = plan(), st = stateOf(p, log(), now);
    if (st.k !== 'due' || now.getTime() < S.snoozeUntil) return;   // not time yet, or the child pressed "5 minute baad"
    ring(p, ymd(now));
  }
  function ring(p, day) {
    S.ringing = true; S.ringDay = day; saveDay({ rang: true });
    const d = g.document, ov = d.createElement('div'); ov.id = 'spRing'; ov.setAttribute('role', 'alertdialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', T('ringT'));
    ov.style.cssText = 'position:fixed;inset:0;z-index:300;background:var(--bg,#fff);color:var(--tx,#111);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;padding:24px;text-align:center';
    const h = d.createElement('h1'); h.style.cssText = 'font-size:30px;margin:0'; h.textContent = T('ringT');
    const nm = d.createElement('p'); nm.style.cssText = 'font-size:20px;margin:0'; nm.textContent = (p.name ? p.name + ', ' : '') + p.mins + ' ' + (lang() === 'en' ? 'minutes' : lang() === 'as' ? 'মিনিট' : lang() === 'bn' ? 'মিনিট' : 'minute');
    const go = d.createElement('button'); go.className = 'btn'; go.style.cssText = 'font-size:22px;padding:16px 28px'; go.textContent = T('start'); go.onclick = () => { startRun(); if (typeof g.go === 'function') g.go('study'); };
    const sn = d.createElement('button'); sn.className = 'chip'; sn.textContent = T('snooze'); sn.disabled = S.snoozes >= 3;
    sn.onclick = () => { S.snoozes++; S.snoozeUntil = Date.now() + 300000; stopRing(); };
    ov.appendChild(h); ov.appendChild(nm); ov.appendChild(go); ov.appendChild(sn); d.body.appendChild(ov);
    beep(); ringTimer = setInterval(beep, 1500); ringStop = setTimeout(() => { clearInterval(ringTimer); ringTimer = 0; }, 90000);   // sound stops itself after 90 seconds
    missTimer = setTimeout(() => saveDay({ missed: true }), 600000);                                                                 // no reaction for 10 minutes: remembered for stage 2
    go.focus();
  }
  function stopRing() {
    S.ringing = false; clearInterval(ringTimer); ringTimer = 0; clearTimeout(ringStop); clearTimeout(missTimer);
    const o = g.document && g.document.getElementById('spRing'); if (o) o.remove();
  }
  // small bar on other screens while a session runs
  function pill() {
    const d = g.document; let p = d.getElementById('spPill');
    if (!S.run || S.run.paused) { if (p) p.remove(); return; }
    if (!p) { p = d.createElement('button'); p.id = 'spPill'; p.className = 'chip'; p.style.cssText = 'position:fixed;left:12px;bottom:12px;z-index:70;font-weight:600'; p.appendChild(d.createTextNode('')); p.onclick = () => { if (typeof g.go === 'function') g.go('study'); }; d.body.appendChild(p); }
    p.firstChild.textContent = T('cont') + ' ' + mmss(S.run.target - S.run.active);
    p.style.display = typeof VIEW !== 'undefined' && VIEW === 'study' ? 'none' : '';
  }

  // ---- PIN ----
  async function hashPin(pin) { if (!(g.crypto && g.crypto.subtle)) return null; const b = await g.crypto.subtle.digest('SHA-256', new TextEncoder().encode('orbit-study:' + (S.uid || 'guest') + ':' + pin)); return Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, '0')).join(''); }
  const hasPin = () => !!ls.get(key(PINK));
  const field = 'width:100%;padding:10px;border:1px solid var(--ln);border-radius:10px;background:var(--bg);color:var(--tx);font:inherit;margin-top:4px;box-sizing:border-box';

  // ---- screens ----
  function childCard() {
    const p = plan(), l = log(), st = stateOf(p, l, new Date()), c = courses().find(x => x.id === p.course);
    const hi = p.name ? `<p style="font-size:20px;margin:0 0 4px"><b>${esc(p.name)}</b></p>` : '';
    const lesson = c ? `<button class="btn alt" style="margin:10px 0 0" data-sp="open">${esc(T('open'))}: ${esc(c.subject)}${p.ch ? ' ' + p.ch : ''}</button>` : `<p class="mut" style="margin:10px 0 0">${esc(T('pick'))}</p>`;
    let body;
    if (S.run && !S.run.paused) body = `<div style="font-size:52px;font-weight:700;margin:6px 0" id="spTimer" aria-live="off">${mmss(S.run.target - S.run.active)}</div><div class="mut">${esc(T('left'))}</div>${quizCard()}${lesson}`;
    else if (st.k === 'done') { const dd = l.days[ymd(new Date())] || {}; body = `<p style="font-size:22px;margin:6px 0"><b>${esc(T('done'))}</b></p>${dd.asked ? `<p class="mut" style="margin:0">${dd.asked} ${esc(QL('stat'))}, ${dd.ok || 0} ${esc(QL('okw'))}</p>` : ''}`; }
    else if (st.k === 'due' || (S.run && S.run.paused)) body = `<p style="font-size:22px;margin:6px 0"><b>${esc(T('due'))}</b></p><button class="btn" style="font-size:20px;padding:14px 24px" data-sp="start">${esc(S.run ? T('cont') : T('start'))}</button>${lesson}`;
    else if (st.k === 'before') body = `<p style="font-size:20px;margin:6px 0">${esc(T('before'))}: <b>${esc(fmtClock(p.time))}</b></p><p class="mut" style="margin:0">${Math.floor(st.in / 60) ? Math.floor(st.in / 60) + ' h ' : ''}${st.in % 60} min</p>${lesson}`;
    else if (st.k === 'rest') body = `<p style="font-size:18px;margin:6px 0">${esc(T('rest'))}</p>`;
    else body = `<p class="mut" style="margin:6px 0">${esc(T('notset'))}</p>`;
    return `<div class="card" style="text-align:center;padding:18px">${hi}${body}</div>`;
  }
  function weekLine() {
    const l = log(), now = new Date(); let n = 0;
    for (let i = 0; i < 7; i++) { const d = new Date(now.getTime() - i * 86400000), e = l.days[ymd(d)]; if (e && e.done) n++; }
    return `Pichhle 7 din mein ${n} din padhai poori hui.`;
  }
  function parentCard() {
    const locked = hasPin() && !S.unlocked;
    if (locked) return `<details class="card" id="spPar"><summary>Parent ke liye</summary><div><label class="mut" for="spPinIn">Badalne ke liye parent PIN (4 number) daalo</label><input id="spPinIn" inputmode="numeric" maxlength="4" autocomplete="off" style="${field}"><button class="btn" data-sp="unlock" style="margin:10px 0 0">Kholo</button>${S.pinMsg ? `<p class="mut" role="status">${esc(S.pinMsg)}</p>` : ''}</div></details>`;
    const d = S.draft || (S.draft = plan()), cs = courses(), c = cs.find(x => x.id === d.course), nch = c ? c.chapters.length : 0;
    const chips = (arr, sel, act) => `<div class="chips" role="group">${arr.map(([v, n]) => `<button class="chip" data-sp="${act}" data-v="${v}" aria-pressed="${sel(v)}">${esc(n)}</button>`).join('')}</div>`;
    return `<details class="card" id="spPar" open><summary>Parent ke liye</summary><div>
 <label class="bl-row" style="display:flex;gap:10px;align-items:center;margin:8px 0"><input type="checkbox" data-spf="on" ${d.on ? 'checked' : ''}> Padhai ka time chalu rakho</label>
 <label class="mut" for="spName">Bachhe ka naam</label><input id="spName" data-spf="name" maxlength="30" value="${esc(d.name)}" style="${field}">
 <label class="mut" for="spTime" style="display:block;margin-top:10px">Roz kitne baje</label><input id="spTime" type="time" data-spf="time" value="${esc(d.time)}" style="${field}">
 <div class="mut" style="margin-top:10px">Bachhe ki class</div>${chips([1, 2, 3].map(c => [c, 'Class ' + c]), v => d.cls === +v, 'cls')}
 <div class="mut" style="margin-top:10px">Tutor ke sawaal (kaun se vishay)</div>${chips(SUBJ.map(k => [k, SUBJN[k]]), v => d.subj.includes(v), 'subj')}
 <div class="mut" style="margin-top:10px">Kitne minute</div>${chips(MINS.map(m => [m, m + ' min']), v => d.mins === +v, 'mins')}
 <div class="mut" style="margin-top:10px">Kaun kaun se din</div>${chips(DAYN.map((n, i) => [i, n]), v => d.days.includes(+v), 'day')}
 <p class="mut" style="margin:10px 0 0;font-size:12.5px">Chhote bachhon ke liye 15 se 20 minute behtar hai. Zyada der ek saath padhna mushkil hota hai.</p>
 <label class="mut" for="spCourse" style="display:block;margin-top:10px">Aaj ka paath (optional)</label>
 <select id="spCourse" data-spf="course" style="${field}"><option value="">Koi nahi</option>${cs.map(x => `<option value="${esc(x.id)}" ${x.id === d.course ? 'selected' : ''}>Class ${esc(x.class)} ${esc(x.subject)}${x.medium ? ' (' + esc(x.medium) + ')' : ''}</option>`).join('')}</select>
 ${nch ? `<label class="mut" for="spCh" style="display:block;margin-top:8px">Chapter</label><select id="spCh" data-spf="ch" style="${field}">${c.chapters.map(h => `<option value="${h.no}" ${h.no === d.ch ? 'selected' : ''}>${h.no ? h.no + '. ' : ''}${esc(h.title)}</option>`).join('')}</select>` : ''}
 <button class="btn" data-sp="save" style="margin:14px 0 0">Save karo</button>
 ${S.err ? `<p class="err" role="alert">${esc(S.err)}</p>` : ''}${S.msg ? `<p class="mut" role="status">${esc(S.msg)}</p>` : ''}
 ${linkBlock()}
 <p class="mut" style="margin:12px 0 0">${esc(weekLine())}</p>
 <div style="border-top:1px solid var(--ln);margin-top:12px;padding-top:10px"><label class="mut" for="spPinIn">Parent PIN (optional, 4 number): bachha time na badal sake</label><input id="spPinIn" inputmode="numeric" maxlength="4" autocomplete="off" style="${field}">
 <div style="margin-top:8px"><button class="btn alt" data-sp="setpin" style="margin:0 8px 0 0">PIN lagao</button>${hasPin() ? '<button class="btn alt" data-sp="rmpin" style="margin:0">PIN hatao</button>' : ''}</div>${S.pinMsg ? `<p class="mut" role="status">${esc(S.pinMsg)}</p>` : ''}</div>
 <p class="mut" style="margin:12px 0 0;font-size:12.5px">Ye time sirf is phone par save hota hai. Reminder tabhi bajta hai jab Orbit khula ho. Orbit sirf tap aur samay ginta hai, camera ya mic nahi chalata.</p>
 </div></details>`;
  }
  // ---- tutor questions during the session (kidbank.js): big buttons, one question at a time. Every tap is a "response" the parent can trust. ----
  const QT = {
    right: N('Shabash! Sahi jawab.', 'Well done! Correct.', 'বাহ! শুদ্ধ উত্তৰ।', 'বাহ! সঠিক উত্তর।'), again: N('Phir se koshish karo.', 'Try again.', 'আকৌ চেষ্টা কৰা।', 'আবার চেষ্টা করো।'),
    reveal: N('Sahi jawab ye hai:', 'The right answer is:', 'শুদ্ধ উত্তৰ হ\'ল:', 'সঠিক উত্তর হলো:'), next: N('Agla sawaal', 'Next question', 'পৰৱৰ্তী প্ৰশ্ন', 'পরের প্রশ্ন'),
    listen: N('Sunao', 'Listen', 'শুনা', 'শোনো'), stat: N('sawaal', 'questions', 'প্ৰশ্ন', 'প্রশ্ন'), okw: N('sahi', 'correct', 'শুদ্ধ', 'সঠিক')
  };
  const QL = k => { const o = QT[k]; return o[lang()] || o.hing; };
  function nextQ() {
    const p = plan(), K = g.KIDBANK; if (!K) { S.sq = null; return; }
    const prev = S.sq ? S.sq.q.text : '', pool = p.subj && p.subj.length ? p.subj : ['ginti']; let q;
    for (let i = 0; i < 6; i++) { q = K.make(p.cls, pool[Math.floor(Math.random() * pool.length)], lang()); if (q.text !== prev) break; }
    S.sq = { q, tries: 0, state: 'ask', wrong: [], asked: S.sq ? S.sq.asked : (log().days[ymd(new Date())] || {}).asked || 0, ok: S.sq ? S.sq.ok : (log().days[ymd(new Date())] || {}).ok || 0 };
  }
  function answer(i) {
    const sq = S.sq; if (!sq || sq.state === 'right' || sq.state === 'reveal' || sq.wrong.includes(i)) return;
    if (i === sq.q.ans) { sq.state = 'right'; sq.asked++; if (sq.tries === 0) sq.ok++; }
    else { sq.tries++; sq.wrong.push(i); if (sq.tries >= 2) { sq.state = 'reveal'; sq.asked++; } else sq.state = 'wrong'; }
    if (sq.state === 'right' || sq.state === 'reveal') saveDay({ asked: sq.asked, ok: sq.ok });
  }
  function speak() {
    const sq = S.sq; if (!sq || !(g.speechSynthesis && g.SpeechSynthesisUtterance)) return;
    try { g.speechSynthesis.cancel(); const u = new g.SpeechSynthesisUtterance(sq.q.say); u.lang = sq.q.sayLang; u.rate = .85; u.onboundary = () => { if (g.AVATAR) g.AVATAR.pulse(); }; g.speechSynthesis.speak(u); if (g.AVATAR) g.AVATAR.set(true); } catch (e) {}
  }
  function quizCard() {
    const sq = S.sq; if (!sq) return '';
    const q = sq.q, dots = q.visual && q.visual.dots ? `<div aria-label="${q.visual.dots}" style="margin:8px 0">${'<span style="display:inline-block;width:24px;height:24px;border-radius:50%;background:#ef6c00;margin:3px"></span>'.repeat(q.visual.dots)}</div>` : '';
    const done = sq.state === 'right' || sq.state === 'reveal';
    const opts = q.opts.map((o, i) => {
      const isRight = done && i === q.ans, isWrong = sq.wrong.includes(i);
      return `<button class="btn alt" data-sp="ans" data-v="${i}" ${done || isWrong ? 'aria-disabled="true"' : ''} style="font-size:24px;min-height:60px;margin:0;${isRight ? 'border:3px solid #2e7d32;' : ''}${isWrong ? 'opacity:.4;text-decoration:line-through;' : ''}">${esc(o)}</button>`;
    }).join('');
    const msg = sq.state === 'right' ? QL('right') : sq.state === 'wrong' ? QL('again') : sq.state === 'reveal' ? QL('reveal') + ' ' + q.opts[q.ans] : '';
    const can = g.speechSynthesis && g.SpeechSynthesisUtterance;
    return `<div style="border-top:1px solid var(--ln);margin-top:14px;padding-top:12px;text-align:left"><div style="font-size:22px;font-weight:600;line-height:1.35">${esc(q.text)}</div>${dots}
 ${can ? `<button class="chip" data-sp="say" style="margin:8px 0">${esc(QL('listen'))}</button>` : ''}
 <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:6px">${opts}</div>
 <p role="status" style="font-size:18px;margin:12px 0 0;min-height:24px"><b>${esc(msg)}</b></p>
 ${done ? `<button class="btn" data-sp="nextq" style="margin:8px 0 0;font-size:20px;padding:12px 22px">${esc(QL('next'))}</button>` : ''}
 <p class="mut" style="margin:10px 0 0;font-size:13px">${sq.asked} ${esc(QL('stat'))}, ${sq.ok} ${esc(QL('okw'))}</p></div>`;
  }

  // ---- stage 2 screens ----
  const PREF = 'width:100%;padding:10px;border:1px solid var(--ln);border-radius:10px;background:var(--bg);color:var(--tx);font:inherit;margin-top:4px;box-sizing:border-box';
  const daysText = d => (d.length === 7 ? 'Roz' : d.map(i => DAYN[i]).join(' '));
  function linkBlock() {          // on the CHILD's phone, inside "Parent ke liye": make a one-time code for the father
    const top = '<div style="border-top:1px solid var(--ln);margin-top:12px;padding-top:10px"><b>Father ke phone par alert</b>';
    if (!S.uid) return top + '<p class="mut" style="margin:6px 0 0">Iske liye pehle Google se log in karo.</p></div>';
    const live = NET.code && NET.expiresAt > Date.now();
    return `${top}<p class="mut" style="margin:6px 0">${NET.linked ? NET.linked + ' parent jude hain.' : 'Abhi koi parent juda nahi hai.'} Bachha time par shuru na kare to parent ke phone par notification jayegi.</p>
 ${live ? `<div style="font-size:34px;letter-spacing:6px;font-weight:700;margin:8px 0" role="status" aria-label="Code ${esc(NET.code.split('').join(' '))}">${esc(NET.code)}</div><p class="mut" style="margin:0 0 8px">15 minute tak chalega. Father ke phone par Orbit kholo, Padhai ka time mein "Main parent hoon" mein ye code daalo.</p>` : ''}
 <button class="btn alt" data-sp="mklink" style="margin:0 8px 0 0">${live ? 'Naya code' : 'Parent ko jodo'}</button>${NET.linked ? '<button class="btn alt" data-sp="unlinkall" style="margin:0">Sab parent hatao</button>' : ''}
 ${NET.lerr ? `<p class="err" role="alert">${esc(NET.lerr)}</p>` : ''}${NET.lmsg ? `<p class="mut" role="status">${esc(NET.lmsg)}</p>` : ''}</div>`;
  }
  function kidRow(c) {
    const t = c.today || {}, studyDay = c.plan.days.includes(new Date().getDay());
    const st = !c.plan.on ? 'Padhai ka time band hai' : !studyDay ? 'Aaj chhutti' : t.done ? 'Aaj padhai poori hui' + (t.mins ? ' (' + t.mins + ' min' + (t.q ? ', ' + t.q + ' sawaal mein ' + (t.ok || 0) + ' sahi' : '') + ')' : '') : t.started ? 'Aaj padhai shuru ho gayi' : 'Aaj abhi tak shuru nahi hua';
    const chips = (arr, sel, act) => `<div class="chips" role="group">${arr.map(([v, n]) => `<button class="chip" data-sp="${act}" data-id="${esc(c.id)}" data-v="${v}" aria-pressed="${sel(v)}">${esc(n)}</button>`).join('')}</div>`;
    const pd = NET.pd && NET.pd.id === c.id ? NET.pd.d : null;
    const edit = pd ? `<div style="margin-top:8px"><label style="display:flex;gap:10px;align-items:center;margin:6px 0"><input type="checkbox" data-spp="on" ${pd.on ? 'checked' : ''}> Chalu rakho</label>
 <label class="mut" for="spPT">Roz kitne baje</label><input id="spPT" type="time" data-spp="time" value="${esc(pd.time)}" style="${PREF}">
 <div class="mut" style="margin-top:8px">Bachhe ki class</div>${chips([1, 2, 3].map(c => [c, 'Class ' + c]), v => pd.cls === +v, 'pcls')}
 <div class="mut" style="margin-top:8px">Tutor ke sawaal</div>${chips(SUBJ.map(k => [k, SUBJN[k]]), v => pd.subj.includes(v), 'psubj')}
 <div class="mut" style="margin-top:8px">Kitne minute</div>${chips(MINS.map(m => [m, m + ' min']), v => pd.mins === +v, 'pmins')}
 <div class="mut" style="margin-top:8px">Kaun se din</div>${chips(DAYN.map((n, i) => [i, n]), v => pd.days.includes(+v), 'pday')}
 <button class="btn" data-sp="psave" data-id="${esc(c.id)}" style="margin:10px 8px 0 0">Save karo</button><button class="btn alt" data-sp="pcancel" style="margin:10px 0 0">Raddh karo</button></div>` : '';
    return `<div style="border:1px solid var(--ln);border-radius:12px;padding:10px;margin:8px 0"><div><b>${esc(c.name || 'Bachha')}</b></div>
 <div style="margin:4px 0">${esc(st)}</div><div class="mut" style="font-size:13px">${esc(fmtClock(c.plan.time))}, ${c.plan.mins} min, ${esc(daysText(c.plan.days))}</div>
 ${pd ? '' : `<div style="margin-top:8px"><button class="btn alt" data-sp="pedit" data-id="${esc(c.id)}" style="margin:0 8px 0 0">Time badlo</button><button class="btn alt" data-sp="pleave" data-id="${esc(c.id)}" style="margin:0">Hata do</button></div>`}${edit}</div>`;
  }
  function dadCard() {            // on the FATHER's phone: join with the code, switch notifications on, see the children
    const o = NET.dadOpen ? ' open' : '', head = `<details class="card" id="spDad"${o}><summary>Main parent hoon (bachhe ka alert)</summary><div>`;
    if (!S.uid) return head + '<p class="mut">Iske liye pehle Google se log in karo.</p></div></details>';
    const NOTE = { unsupported: 'Is browser mein notification nahi hai. Android par Chrome use karo. iPhone par Orbit ko Home Screen par jodo.', denied: 'Notification band hai. Browser ki settings mein Orbit ke liye allow karo.' };
    const pushUi = NET.push === 'on' ? '<p style="margin:6px 0">Is phone par notification chalu hai.</p><button class="btn alt" data-sp="poff" style="margin:0">Notification band karo</button>'
      : NOTE[NET.push] ? `<p class="mut" style="margin:6px 0">${esc(NOTE[NET.push])}</p>` : '<button class="btn" data-sp="pon" style="margin:6px 0 0">Is phone par notification chalu karo</button>';
    const kids = NET.children === null ? '<p class="mut">Load ho raha hai...</p>' : NET.children.length ? NET.children.map(kidRow).join('') : '<p class="mut">Abhi koi bachha juda nahi hai.</p>';
    return `${head}<label class="mut" for="spJoin">Bachhe ke phone ka code (6 akshar)</label><input id="spJoin" data-spf="joincode" maxlength="7" autocomplete="off" autocapitalize="characters" value="${esc(NET.codeIn)}" style="${PREF};text-transform:uppercase;letter-spacing:3px">
 <button class="btn" data-sp="join" style="margin:10px 0 0">Jodo</button>
 <div style="border-top:1px solid var(--ln);margin-top:12px;padding-top:10px"><b>Notification</b><div>${pushUi}</div></div>
 <div style="border-top:1px solid var(--ln);margin-top:12px;padding-top:10px"><b>Mere bachhe</b>${kids}</div>
 ${NET.derr ? `<p class="err" role="alert">${esc(NET.derr)}</p>` : ''}${NET.dmsg ? `<p class="mut" role="status">${esc(NET.dmsg)}</p>` : ''}
 <p class="mut" style="margin:10px 0 0;font-size:12.5px">Aapko din mein zyada se zyada 2 notification milengi: bachha time par shuru na kare, aur jab padhai poori ho. Orbit camera ya mic nahi chalata.</p></div></details>`;
  }
  function viewHTML() {
    if (S.uid) { pullPlan(false); loadKids(false); if (NET.push === 'unknown') pushState().then(redraw); }
    return `<h1 style="font-size:26px;margin-top:10px">${esc(T('title'))}</h1>${childCard()}${parentCard()}${dadCard()}`;
  }

  // ---- events ----
  g.document.addEventListener('input', e => {
    const ds = e.target && e.target.dataset; if (!ds) return;
    if (ds.spf === 'joincode') NET.codeIn = e.target.value;
    else if (ds.spp === 'time' && NET.pd) NET.pd.d.time = e.target.value;
    else if (ds.spf && S.draft && (ds.spf === 'name' || ds.spf === 'time')) S.draft[ds.spf] = e.target.value;
  });
  g.document.addEventListener('toggle', e => { if (e.target && e.target.id === 'spDad') NET.dadOpen = e.target.open; }, true);
  g.document.addEventListener('change', e => {
    if (e.target && e.target.dataset && e.target.dataset.spp === 'on' && NET.pd) { NET.pd.d.on = e.target.checked; return; }
    const f = e.target && e.target.dataset && e.target.dataset.spf; if (!f || !S.draft) return;
    if (f === 'on') S.draft.on = e.target.checked; else if (f === 'course') { S.draft.course = e.target.value; S.draft.ch = 0; const c = courses().find(x => x.id === e.target.value); if (c && c.chapters.length) S.draft.ch = c.chapters[0].no; redraw(); }
    else if (f === 'ch') S.draft.ch = +e.target.value;
  });
  g.document.addEventListener('click', async e => {
    const b = e.target.closest && e.target.closest('[data-sp]'); if (!b) return;
    const a = b.dataset.sp, v = b.dataset.v;
    if (a === 'start') return startRun();
    if (a === 'ans') { answer(+b.dataset.v); return redraw(); }
    if (a === 'nextq') { nextQ(); return redraw(); }
    if (a === 'say') return speak();
    if (a === 'open') { const p = plan(), c = courses().find(x => x.id === p.course); if (c && typeof g.navTo === 'function') g.navTo({ page: 'chapter', org: orgFor(c.id) || 'nashib', med: c.medium || 'English', cls: c.class, sub: c.subject, ch: p.ch || 1 }); pill(); return; }
    S.msg = ''; S.err = ''; S.pinMsg = ''; NET.lmsg = NET.lerr = NET.dmsg = NET.derr = '';
    const fail = x => { (['mklink', 'unlinkall'].includes(a) ? (NET.lerr = x.message) : (NET.derr = x.message)); };
    if (a === 'mklink') { try { await pushPlan(); const r = await api('POST', 'link/new'); NET.code = r.code; NET.expiresAt = r.expiresAt; } catch (x) { fail(x); } }
    else if (a === 'unlinkall') { try { await api('POST', 'unlink', {}); NET.linked = 0; NET.code = ''; NET.lmsg = 'Sab parent hata diye.'; } catch (x) { fail(x); } }
    else if (a === 'join') { try { const r = await api('POST', 'link/join', { code: NET.codeIn }); NET.codeIn = ''; NET.dmsg = (r.name || 'Bachha') + ' juda gaya.'; NET.lastKids = 0; await loadKids(true); } catch (x) { fail(x); } }
    else if (a === 'pon') { try { await pushOn(); NET.dmsg = 'Notification chalu ho gayi.'; } catch (x) { fail(x); } }
    else if (a === 'poff') { try { await pushOff(); NET.dmsg = 'Notification band ho gayi.'; } catch (x) { fail(x); } }
    else if (a === 'pedit') { const c = (NET.children || []).find(k => k.id === b.dataset.id); if (c) NET.pd = { id: c.id, d: { on: c.plan.on, time: c.plan.time, mins: c.plan.mins, days: c.plan.days.slice(), cls: c.plan.cls || 1, subj: (c.plan.subj || ['ginti', 'eng', 'evs']).slice() } }; }
    else if (a === 'pcancel') NET.pd = null;
    else if (a === 'pcls' && NET.pd) NET.pd.d.cls = +v;
    else if (a === 'psubj' && NET.pd) { const k = new Set(NET.pd.d.subj); k.has(v) ? k.delete(v) : k.add(v); NET.pd.d.subj = SUBJ.filter(x => k.has(x)); }
    else if (a === 'pmins' && NET.pd) NET.pd.d.mins = +v;
    else if (a === 'pday' && NET.pd) { const i = +v, q = new Set(NET.pd.d.days); q.has(i) ? q.delete(i) : q.add(i); NET.pd.d.days = [...q].sort(); }
    else if (a === 'psave' && NET.pd) {
      const c = (NET.children || []).find(k => k.id === b.dataset.id), d = NET.pd.d;
      if (!c) NET.pd = null;
      else if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(d.time)) NET.derr = 'Time sahi nahi hai.';
      else if (d.on && !d.days.length) NET.derr = 'Kam se kam ek din chuno.';
      else if (!d.subj.length) NET.derr = 'Kam se kam ek vishay chuno.';
      else { try { await api('POST', 'plan', { child: c.id, plan: { ...c.plan, on: d.on, time: d.time, mins: d.mins, days: d.days, cls: d.cls, subj: d.subj } }); NET.pd = null; NET.dmsg = 'Bachhe ke phone par naya time agli baar Orbit kholte hi lag jayega.'; await loadKids(true); } catch (x) { fail(x); } }
    }
    else if (a === 'pleave') { try { await api('POST', 'unlink', { child: b.dataset.id }); NET.dmsg = 'Bachha hata diya.'; await loadKids(true); } catch (x) { fail(x); } }
    else if (a === 'cls' && S.draft) S.draft.cls = +v;
    else if (a === 'subj' && S.draft) { const k = new Set(S.draft.subj); k.has(v) ? k.delete(v) : k.add(v); S.draft.subj = SUBJ.filter(x => k.has(x)); }
    else if (a === 'mins' && S.draft) S.draft.mins = +v;
    else if (a === 'day' && S.draft) { const i = +v, s = new Set(S.draft.days); s.has(i) ? s.delete(i) : s.add(i); S.draft.days = [...s].sort(); }
    else if (a === 'save' && S.draft) {
      const d = S.draft;
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(d.time)) S.err = 'Time sahi nahi hai.';
      else if (d.on && !d.days.length) S.err = 'Kam se kam ek din chuno.';
      else if (!d.subj.length) S.err = 'Kam se kam ek vishay chuno.';
      else { savePlan(d); S.draft = plan(); S.msg = 'Save ho gaya.'; S.snoozes = 0; S.snoozeUntil = 0; startTicker(); if (S.uid) pushPlan().then(okk => { if (!okk) { S.msg = 'Save ho gaya. Server se sync nahi hua (internet ya login), baad mein khud ho jayega.'; redraw(); } }); }
    } else if (a === 'unlock' || a === 'setpin' || a === 'rmpin') {
      const el = g.document.getElementById('spPinIn'), pin = el ? el.value.trim() : '';
      if (!/^\d{4}$/.test(pin)) S.pinMsg = 'PIN 4 number ka hona chahiye.';
      else { const h = await hashPin(pin); if (!h) S.pinMsg = 'Is browser mein PIN support nahi hai.';
        else if (a === 'unlock') { if (h === ls.get(key(PINK))) { S.unlocked = true; S.draft = plan(); } else S.pinMsg = 'PIN galat hai.'; }
        else if (a === 'setpin') { ls.set(key(PINK), h); S.unlocked = true; S.pinMsg = 'PIN lag gaya.'; }
        else if (h === ls.get(key(PINK))) { ls.del(key(PINK)); S.unlocked = false; S.pinMsg = 'PIN hata diya.'; } else S.pinMsg = 'PIN galat hai.'; }
    }
    redraw();
  });
  ['pointerdown', 'keydown', 'scroll'].forEach(n => g.document.addEventListener(n, () => { S.lastAct = Date.now(); }, { passive: true, capture: true }));
  g.document.addEventListener('visibilitychange', () => { if (!g.document.hidden) { checkRing(new Date()); pullPlan(false); if (typeof VIEW !== 'undefined' && VIEW === 'study') loadKids(false); } });
  if (g.location && g.location.hash === '#study') setTimeout(() => { if (typeof g.go === 'function') g.go('study'); }, 700);   // tapped from a parent notification
  startTicker();

  g.STUDY = {
    viewHTML, sync: pill,
    setUser(u) { const id = u && u.uid ? u.uid : ''; if (id === S.uid) return; stopRing(); S.uid = id; S.unlocked = false; S.draft = null; S.msg = S.err = S.pinMsg = ''; S.run = loadRun(); S.snoozes = 0; S.snoozeUntil = 0; NET.children = null; NET.linked = null; NET.code = ''; NET.pd = null; NET.codeIn = ''; NET.lastPull = 0; NET.lastKids = 0; NET.push = 'unknown'; NET.lmsg = NET.lerr = NET.dmsg = NET.derr = ''; pill(); if (id) pullPlan(true); },
    leave() { S.unlocked = false; S.draft = null; S.msg = S.err = S.pinMsg = ''; pill(); },
    _t: { clean, stateOf, ymd, fmtClock, mmss, minOf, DEF, NET, getQ: () => S.sq }   // _t is for tests only
  };
})(window);
