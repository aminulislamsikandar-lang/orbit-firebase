// public/exam.js - Exam section: Mock test and Daily challenge.
//   Both are made from the chapter quizzes the admin approved (Firestore `quizzes`, see quiz.js): no new collection, no new rules, no AI call.
//   Mock test:       questions from every approved chapter quiz of ONE course (class + medium), spread over the chapters, with a timer,
//                    no hints until you submit, then the score, the weak chapters and a review of the wrong answers.
//   Daily challenge: 5 questions a day, the same all day (seeded by the date), a reason after each answer, and a streak.
// Everything a student does here stays in this browser (localStorage), like the Chapter quiz history. Rendered as strings with esc().
(function () {
  'use strict';
  const g = window;
  const MOCK_N = 20, MOCK_SECS = 1200, DAILY_N = 5, PASS = 60, MIN_MOCK = 5, MIN_DAILY = 3;
  const MKEY = 'orbit.mock.', DKEY = 'orbit.daily.';
  const OK = '#1a7f37', BAD = '#cf222e';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const redraw = () => { if (typeof g.draw === 'function') g.draw(); };
  const uid = () => { const u = g.orbitUser ? g.orbitUser() : null; return (u && u.uid) || ''; };
  const cloud = () => (g.CLOUD && g.CLOUD.quiz && typeof g.CLOUD.quiz.approvedForCourse === 'function') ? g.CLOUD.quiz : null;
  const norm = s => String(s == null ? '' : s).toLowerCase().replace(/\s+/g, ' ').trim();
  const clean = x => (g.QUIZ && typeof g.QUIZ.cleanItem === 'function') ? g.QUIZ.cleanItem(x) : null;
  const courses = () => { try { return (g.orbitCourses ? g.orbitCourses() : []) || []; } catch (e) { return []; } };

  // ---- pure helpers (tested in tests/exam.test.js) ----
  function hash(str) { let h = 1779033703 ^ str.length; for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); } return h >>> 0; }
  function rngFrom(seed) { let a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function shuffle(arr, rng) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  // every playable question of the approved quizzes, each once (same question in two levels counts once), in a fixed order
  function buildPool(docs) {
    const seen = new Set(), out = [];
    (Array.isArray(docs) ? docs : []).slice().sort((a, b) => String(a && a.id).localeCompare(String(b && b.id))).forEach(d => {
      if (!d || d.status !== 'approved' || !Array.isArray(d.items)) return;
      d.items.forEach((x, i) => {
        const it = clean(x); if (!it) return;
        const k = norm(it.q); if (seen.has(k)) return;
        seen.add(k); out.push({ q: it.q, o: it.o, a: it.a, e: it.e, ch: d.ch, level: d.level, k: d.id + '#' + i });
      });
    });
    return out;
  }
  // n questions taken one chapter at a time, so no chapter takes over; then the order is mixed
  function pickSpread(pool, n, rng) {
    const by = {}; pool.forEach(it => { (by[it.ch] = by[it.ch] || []).push(it); });
    const groups = shuffle(Object.keys(by).sort((a, b) => a - b), rng).map(c => shuffle(by[c], rng)), out = [];
    while (out.length < n && groups.some(x => x.length)) for (const gr of groups) { if (out.length >= n) break; if (gr.length) out.push(gr.shift()); }
    return shuffle(out, rng);
  }
  function mixOptions(it, rng) { const idx = shuffle([0, 1, 2, 3], rng); return { q: it.q, o: idx.map(i => it.o[i]), a: idx.indexOf(it.a), e: it.e, ch: it.ch }; }
  function score(qs, ans) {
    let r = 0; const by = {};
    qs.forEach((q, i) => { const ok = ans[i] === q.a; if (ok) r++; const b = by[q.ch] = by[q.ch] || { r: 0, t: 0 }; b.t++; if (ok) b.r++; });
    const pct = qs.length ? Math.round(r * 100 / qs.length) : 0;
    return { score: r, total: qs.length, pct, pass: pct >= PASS, by };
  }
  const pad = n => (n < 10 ? '0' : '') + n;
  const ymd = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  function shiftDay(s, delta) { const p = String(s).split('-').map(Number); return ymd(new Date(p[0], p[1] - 1, p[2] + delta)); }
  // the streak counts days in a row; it is still alive today if yesterday was played, and gone if a day was missed
  function streakShown(st, today) { return st && st.last && (st.last === today || st.last === shiftDay(today, -1)) ? (st.n | 0) : 0; }
  function streakBump(st, today) {
    st = st && typeof st === 'object' ? st : {};
    const days = (Array.isArray(st.days) ? st.days : []).filter(d => d !== today).concat([today]).slice(-30);
    if (st.last === today) return { last: today, n: (st.n | 0) || 1, best: Math.max(st.best | 0, (st.n | 0) || 1), days };
    const n = st.last === shiftDay(today, -1) ? (st.n | 0) + 1 : 1;
    return { last: today, n, best: Math.max(st.best | 0, n), days };
  }
  const fmt = t => pad(Math.floor(t / 60)) + ':' + pad(t % 60);

  // ---- state ----
  const rd = k => { try { const o = JSON.parse(g.localStorage.getItem(k + uid()) || '{}'); return o && typeof o === 'object' ? o : {}; } catch (e) { return {}; } };
  const wr = (k, o) => { try { g.localStorage.setItem(k + uid(), JSON.stringify(o)); } catch (e) {} };
  const S = { course: '', pools: {}, busy: {}, err: {}, tick: null, m: null };
  const freshM = () => ({ stage: 'setup', course: '', qs: [], ans: [], flag: [], i: 0, endsAt: 0, warn: false, res: null });
  S.m = freshM();
  const left = () => Math.max(0, Math.ceil((S.m.endsAt - Date.now()) / 1000));
  function stopTick() { if (S.tick) { clearInterval(S.tick); S.tick = null; } }
  const cur = () => { const cs = courses(); return cs.find(c => c.id === S.course) || cs[0] || null; };

  function load(cid) {
    if (!cid || S.pools[cid] || S.busy[cid] || S.err[cid] || !cloud()) return;   // after an error it waits for the Retry button
    S.busy[cid] = true;
    cloud().approvedForCourse(cid).then(docs => { S.pools[cid] = { items: buildPool(docs), n: (docs || []).length }; S.busy[cid] = false; redraw(); },
      () => { S.busy[cid] = false; S.err[cid] = 'Sawaal abhi load nahi hue.'; redraw(); });
  }
  function chTitle(c, no) { const ch = c && (c.chapters || []).find(x => x.no === no); return ch && ch.title ? ch.title : 'Chapter ' + no; }

  // ---- shared pieces ----
  const note = html => `<p class="mut" style="margin:10px 0">${html}</p>`;
  const optBtn = (act, i, t, style) => `<button class="btn" data-ex="${act}" data-i="${i}" style="display:block;width:100%;text-align:left;margin:6px 0;${style || ''}">${String.fromCharCode(65 + i)}. ${esc(t)}</button>`;
  function courseSelect(c, locked) {
    const cs = courses(); if (cs.length < 2) return '';
    return `<label class="mut" style="display:block;margin:8px 0;font-size:12.5px">Course<select data-exs="course" ${locked ? 'disabled' : ''} style="width:100%;box-sizing:border-box;margin-top:3px;padding:8px;border:1px solid var(--ln);border-radius:8px;background:var(--bg);color:var(--tx);font:inherit">${cs.map(x => `<option value="${esc(x.id)}" ${c && x.id === c.id ? 'selected' : ''}>${esc(x.title)} · Class ${esc(x.class)}</option>`).join('')}</select></label>`;
  }
  function gate(c, title) {
    if (!uid()) return `<h2 class="sec">${title}</h2><div class="card"><p style="margin:0">Pehle log in karo, phir yahan test de sakte ho.</p></div>`;
    if (!c) return `<h2 class="sec">${title}</h2><div class="card"><p style="margin:0">Abhi koi course nahi mila.</p></div>`;
    return '';
  }
  // the pool of the chosen course: '' when ready, else the card to show
  function poolGate(c, title, min) {
    load(c.id);
    const p = S.pools[c.id];
    if (S.err[c.id]) return `<div class="card"><h2 class="sec" style="margin:0 0 6px">${title}</h2>${courseSelect(c)}<p style="margin:8px 0">${esc(S.err[c.id])}</p><button class="btn" data-ex="retry">Dobara try karo</button></div>`;
    if (!p) return `<div class="card"><h2 class="sec" style="margin:0 0 6px">${title}</h2>${courseSelect(c)}<p class="mut" style="margin:8px 0" role="status">Sawaal load ho rahe hain...</p></div>`;
    if (p.items.length < min) return `<div class="card"><h2 class="sec" style="margin:0 0 6px">${title}</h2>${courseSelect(c)}<p style="margin:8px 0">Is course ke abhi sirf ${p.items.length} sawaal taiyaar hain. ${title} ke liye kam se kam ${min} chahiye. Jaise hi chapter quizzes approve honge, yahan aa jaayenge.</p></div>`;
    return '';
  }
  function reviewRows(qs, ans, c) {
    return qs.map((q, k) => {
      const a = ans[k], ok = a === q.a;
      return `<div style="padding:8px 0;border-top:1px solid var(--ln);font-size:13.5px"><div style="display:flex;justify-content:space-between;gap:8px"><span>Q${k + 1} · ${a == null ? 'chhoda' : 'aapka jawab ' + String.fromCharCode(65 + a)}</span><b style="color:${ok ? OK : BAD}">${ok ? 'Sahi' : 'Sahi jawab ' + String.fromCharCode(65 + q.a)}</b></div>${ok ? '' : `<div class="mut" style="margin-top:4px">${esc(q.e)}</div>`}</div>`;
    }).join('');
  }

  // ---- Mock test ----
  function mockHTML() {
    const c = cur(), T = 'Mock test', gt = gate(c, T); if (gt) return gt;
    const m = S.m;
    if (m.stage === 'run') return mockRun(c);
    if (m.stage === 'done') return mockDone(c);
    const pg = poolGate(c, T, MIN_MOCK); if (pg) return pg;
    const n = Math.min(MOCK_N, S.pools[c.id].items.length), h = ((rd(MKEY)[c.id]) || []), last = h.length ? h[h.length - 1] : null;
    return `<div class="card"><h2 class="sec" style="margin:0 0 6px">${T}</h2>${courseSelect(c)}` +
      `<p style="margin:8px 0 4px">${n} sawaal · ${Math.round(MOCK_SECS / 60)} minute · sab chapters se mixed</p>` +
      `<p class="mut" style="margin:0 0 10px;font-size:12.5px">Beech me sahi jawab nahi dikhta. Submit ke baad score, kamzor chapters aur galti ka reason milta hai.${last ? ` Pichhli baar ${last.p}%.` : ''}</p>` +
      `<button class="btn" data-ex="mstart" style="margin:0">Test shuru karo</button></div>`;
  }
  function mockRun(c) {
    const m = S.m, q = m.qs[m.i], last = m.i === m.qs.length - 1, un = m.ans.filter(a => a == null).length;
    const pal = m.qs.map((_, k) => `<button class="chip" data-ex="mjump" data-i="${k}" aria-pressed="${k === m.i}" aria-label="Sawaal ${k + 1}${m.ans[k] != null ? ', jawab diya' : ''}${m.flag[k] ? ', flag kiya' : ''}" style="min-width:34px;${m.ans[k] != null ? 'font-weight:700;' : ''}${m.flag[k] ? 'outline:2px solid #bf8700;' : ''}">${k + 1}</button>`).join('');
    return `<div class="card"><div style="display:flex;justify-content:space-between;align-items:center"><span class="mut">Mock test · bina hint ke</span><b>Time <span id="ex-tm" role="timer">${fmt(left())}</span></b></div>` +
      `<div class="chips" role="group" aria-label="Sawaal chuno" style="display:flex;gap:6px;flex-wrap:wrap;margin:10px 0">${pal}</div>` +
      `<p class="mut" style="margin:0 0 4px;font-size:12.5px">${esc(chTitle(c, q.ch))}</p><p style="font-weight:600;margin:0 0 8px">Q${m.i + 1}. ${esc(q.q)}</p>` +
      q.o.map((t, i) => optBtn('mpick', i, t, m.ans[m.i] === i ? 'outline:2px solid var(--on)' : '')).join('') +
      `<div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-top:6px"><button class="chip" data-ex="mflag" aria-pressed="${!!m.flag[m.i]}">${m.flag[m.i] ? 'Flag hatao' : 'Flag karo'}</button><span style="display:flex;gap:8px">${m.i > 0 ? `<button class="btn" data-ex="mjump" data-i="${m.i - 1}" style="margin:0">Back</button>` : ''}${last ? `<button class="btn" data-ex="msubmit" style="margin:0">${m.warn && un ? 'Phir bhi submit' : 'Submit'}</button>` : `<button class="btn" data-ex="mjump" data-i="${m.i + 1}" style="margin:0">Next</button>`}</span></div>` +
      (m.warn && un ? `<p role="alert" style="margin:10px 0 0;color:${BAD};font-size:13.5px">${un} sawaal baaki hai. Phir bhi submit karna hai?</p>` : '') + `</div>`;
  }
  function mockDone(c) {
    const m = S.m, r = m.res;
    const rows = Object.keys(r.by).sort((a, b) => a - b).map(k => {
      const b = r.by[k], p = Math.round(b.r * 100 / b.t), weak = p < PASS;
      return `<div style="display:flex;align-items:center;gap:8px;margin:6px 0;font-size:13.5px"><span style="flex:0 0 38%">${esc(chTitle(c, Number(k)))}</span><span style="flex:1;height:6px;border-radius:3px;background:var(--ans);overflow:hidden"><i style="display:block;height:6px;width:${p}%;background:${weak ? BAD : OK}"></i></span><span style="flex:0 0 74px;text-align:right;color:${weak ? BAD : OK}">${b.r}/${b.t}${weak ? ' weak' : ''}</span></div>`;
    }).join('');
    return `<div class="card"><p class="mut" style="margin:0">Mock test result${m.timeUp ? ' · time khatam' : ''}</p><p style="font-size:34px;font-weight:700;margin:6px 0 0">${r.score}<span class="mut" style="font-size:18px"> / ${r.total} · ${r.pct}%</span></p>` +
      `<p style="margin:0 0 10px;font-weight:600;color:${r.pass ? OK : BAD}">${r.pass ? 'Pass (' + PASS + '% se upar)' : 'Pass mark (' + PASS + '%) se neeche'}</p>` +
      `<p class="mut" style="margin:0;font-size:12.5px">Chapter ke hisaab se</p>${rows}<p class="mut" style="margin:14px 0 0;font-size:12.5px">Review</p>${reviewRows(m.qs, m.ans, c)}` +
      `<button class="btn" data-ex="mstart">Dobara test do</button></div>`;
  }
  function mstart() {
    const c = cur(), p = c && S.pools[c.id]; if (!c || !p || p.items.length < MIN_MOCK) return;
    const rng = rngFrom((Date.now() ^ hash(c.id)) >>> 0), n = Math.min(MOCK_N, p.items.length);
    const qs = pickSpread(p.items, n, rng).map(it => mixOptions(it, rng));
    stopTick();
    S.m = { stage: 'run', course: c.id, qs, ans: qs.map(() => null), flag: qs.map(() => 0), i: 0, endsAt: Date.now() + MOCK_SECS * 1000, warn: false, res: null };
    S.tick = setInterval(() => {
      if (S.m.stage !== 'run') { stopTick(); return; }
      if (left() <= 0) { finish(true); redraw(); return; }
      const t = g.document.getElementById('ex-tm'); if (t) t.textContent = fmt(left());
    }, 1000);
    redraw();
  }
  function finish(timeUp) {
    const m = S.m; if (m.stage !== 'run') return;
    stopTick(); m.res = score(m.qs, m.ans); m.stage = 'done'; m.timeUp = !!timeUp;
    const o = rd(MKEY); o[m.course] = (Array.isArray(o[m.course]) ? o[m.course] : []).concat([{ p: m.res.pct, n: m.res.total, at: Date.now() }]).slice(-10); wr(MKEY, o);
  }

  // ---- Daily challenge ----
  const dailyData = () => {
    const o = rd(DKEY), today = ymd(new Date());
    if (!o.today || o.today.date !== today) o.today = { date: today, c: {} };
    if (!o.today.c || typeof o.today.c !== 'object') o.today.c = {};
    if (!o.streak || typeof o.streak !== 'object') o.streak = { last: '', n: 0, best: 0, days: [] };
    return o;
  };
  function weekDots(st, today) {
    const days = Array.isArray(st.days) ? st.days : [];
    return `<div style="display:flex;justify-content:space-between;margin:10px 0" aria-hidden="true">${[6, 5, 4, 3, 2, 1, 0].map(k => {
      const d = shiftDay(today, -k), p = d.split('-').map(Number), on = days.includes(d), lab = 'SMTWTFS'[new Date(p[0], p[1] - 1, p[2]).getDay()];
      return `<span style="width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;background:${on ? OK : 'var(--ans)'};color:${on ? '#fff' : 'var(--mut)'};${k === 0 ? 'outline:2px solid var(--on)' : ''}">${lab}</span>`;
    }).join('')}</div>`;
  }
  function dailyHTML() {
    const c = cur(), T = 'Daily challenge', gt = gate(c, T); if (gt) return gt;
    const o = dailyData(), today = o.today.date, st = o.today.c[c.id], sh = streakShown(o.streak, today);
    const top = `<div style="display:flex;justify-content:space-between;align-items:center"><h2 class="sec" style="margin:0">${T}</h2><b>${sh} din ka streak</b></div>${weekDots(o.streak, today)}`;
    if (!st) {
      const pg = poolGate(c, T, MIN_DAILY); if (pg) return pg;
      const n = Math.min(DAILY_N, S.pools[c.id].items.length);
      return `<div class="card">${top}${courseSelect(c)}<p style="margin:8px 0">Aaj ke ${n} sawaal, har jawab ke baad reason.</p><button class="btn" data-ex="dstart" style="margin:0">Shuru karo</button></div>`;
    }
    if (st.done) {
      return `<div class="card">${top}${courseSelect(c)}<p style="font-size:34px;font-weight:700;margin:6px 0 0">${st.score}<span class="mut" style="font-size:18px"> / ${st.qs.length} aaj</span></p><p class="mut" style="margin:0 0 6px">Streak badh gaya. Agla challenge kal khulega.</p>${reviewRows(st.qs, st.ans, c)}</div>`;
    }
    const q = st.qs[st.i], picked = st.ans[st.i], dots = st.qs.map((_, k) => `<span style="flex:1;height:6px;border-radius:3px;background:${k < st.i ? OK : k === st.i ? 'var(--on)' : 'var(--ans)'}"></span>`).join('');
    return `<div class="card">${top}<div style="display:flex;gap:6px;margin-bottom:8px" aria-hidden="true">${dots}</div><p class="mut" style="margin:0 0 4px;font-size:12.5px">Sawaal ${st.i + 1} / ${st.qs.length} · ${esc(chTitle(c, q.ch))}</p><p style="font-weight:600;margin:0 0 8px">${esc(q.q)}</p>` +
      q.o.map((t, i) => { const done = picked != null, right = done && i === q.a, wrong = done && i === picked && i !== q.a; return optBtn('dpick', i, t, `${right ? 'outline:2px solid ' + OK : wrong ? 'outline:2px solid ' + BAD : ''}`).replace('<button', done ? '<button disabled' : '<button'); }).join('') +
      (picked != null ? `<p role="status" style="margin:8px 0;padding:10px 12px;border-radius:10px;background:var(--ans)"><b>${picked === q.a ? 'Sahi jawab!' : 'Sahi jawab: ' + String.fromCharCode(65 + q.a)}</b><br>${esc(q.e)}</p><button class="btn" data-ex="dnext" style="margin:0">${st.i + 1 >= st.qs.length ? 'Khatam' : 'Agla sawaal'}</button>` : '') + `</div>`;
  }
  function dstart() {
    const c = cur(), p = c && S.pools[c.id]; if (!c || !p || p.items.length < MIN_DAILY) return;
    const o = dailyData(); if (o.today.c[c.id]) return;
    const rng = rngFrom(hash(o.today.date + '|' + c.id)), n = Math.min(DAILY_N, p.items.length);
    o.today.c[c.id] = { qs: pickSpread(p.items, n, rng).map(it => mixOptions(it, rng)), ans: [], i: 0, done: false, score: 0 };
    wr(DKEY, o); redraw();
  }
  function dpick(j) {
    const c = cur(); if (!c) return; const o = dailyData(), st = o.today.c[c.id];
    if (!st || st.done || st.ans[st.i] != null || !(j >= 0 && j <= 3)) return;
    st.ans[st.i] = j; if (j === st.qs[st.i].a) st.score++; wr(DKEY, o); redraw();
  }
  function dnext() {
    const c = cur(); if (!c) return; const o = dailyData(), st = o.today.c[c.id];
    if (!st || st.done || st.ans[st.i] == null) return;
    if (st.i + 1 >= st.qs.length) { st.done = true; o.streak = streakBump(o.streak, o.today.date); } else st.i++;
    wr(DKEY, o); redraw();
  }

  // ---- events ----
  g.document.addEventListener('click', e => {
    const b = e.target && e.target.closest ? e.target.closest('[data-ex]') : null;
    if (!b || b.disabled) return;
    const a = b.dataset.ex, i = Number(b.dataset.i), m = S.m;
    if (a === 'mstart') mstart();
    else if (a === 'retry') { const c = cur(); if (c) { delete S.pools[c.id]; delete S.err[c.id]; redraw(); } }
    else if (m.stage === 'run' && a === 'mpick' && i >= 0 && i <= 3) { m.ans[m.i] = i; redraw(); }
    else if (m.stage === 'run' && a === 'mjump' && i >= 0 && i < m.qs.length) { m.i = i; m.warn = false; redraw(); }
    else if (m.stage === 'run' && a === 'mflag') { m.flag[m.i] = m.flag[m.i] ? 0 : 1; redraw(); }
    else if (m.stage === 'run' && a === 'msubmit') { const un = m.ans.filter(x => x == null).length; if (un && !m.warn) { m.warn = true; redraw(); return; } finish(false); redraw(); }
    else if (a === 'dstart') dstart();
    else if (a === 'dpick') dpick(i);
    else if (a === 'dnext') dnext();
  });
  g.document.addEventListener('change', e => {
    const t = e.target; if (!t || !t.dataset || t.dataset.exs !== 'course') return;
    if (S.m.stage === 'run') return;
    S.course = t.value; if (S.m.stage === 'done') S.m = freshM(); redraw();
  });

  g.EXAM = {
    // view: 'mock' or 'daily'
    viewHTML(view) { return view === 'daily' ? dailyHTML() : mockHTML(); },
    // leaving the page does not stop a running test: the clock is a time stamp, so it is still right when the student comes back
    hash, rngFrom, shuffle, buildPool, pickSpread, mixOptions, score, ymd, shiftDay, streakShown, streakBump, fmt,
    PASS, MOCK_N, MOCK_SECS, DAILY_N, MIN_MOCK, MIN_DAILY,
    _state: S, _reset() { stopTick(); S.course = ''; S.pools = {}; S.busy = {}; S.err = {}; S.m = freshM(); }
  };
})();
