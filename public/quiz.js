// public/quiz.js - Chapter quiz (MCQ made from the chapter notes by the AI, checked and approved by the admin).
//   Students: a "Chapter quiz" card on the chapter page. Easy / Medium / Hard, one question at a time, instant right or wrong with a one-line reason.
//             Playing costs no AI call: the questions are read from Firestore `quizzes`, and the rules only give out approved ones.
//   Admin (admin mode ON, see qvideo.js): the same card gets a panel to make a draft with the AI (POST /api/quiz/generate), edit it, and save it
//             as Pending (students do not see it) or Approved. Rendered as strings with esc(); the page never assigns innerHTML here.
// The level suggested to a student comes from the last quiz on that chapter (80%+ goes up, under 50% goes down) or, before any quiz, from Recall AI.
(function () {
  'use strict';
  const g = window;
  const ORDER = ['easy', 'medium', 'hard'], NAME = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };
  const HKEY = 'orbit.quiz.';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const redraw = () => { if (typeof g.draw === 'function') g.draw(); };
  const uid = () => { const u = g.orbitUser ? g.orbitUser() : null; return (u && u.uid) || ''; };
  const isAdmin = () => !!(g.QVideo && g.QVideo.active && g.QVideo.active());
  const cloud = () => (g.CLOUD && g.CLOUD.quiz) || null;
  const norm = s => String(s == null ? '' : s).toLowerCase().replace(/\s+/g, ' ').trim();

  // ---- level choice (Task 36) ----
  function suggest(hist, mastery, avail) {
    avail = (avail || []).filter(l => ORDER.includes(l));
    if (!avail.length) return '';
    let want = 'medium';
    const last = Array.isArray(hist) && hist.length ? hist[hist.length - 1] : null;
    if (last && ORDER.includes(last.l) && typeof last.p === 'number') {
      const i = ORDER.indexOf(last.l);
      want = last.p >= 80 ? ORDER[Math.min(i + 1, 2)] : last.p < 50 ? ORDER[Math.max(i - 1, 0)] : last.l;
    } else if (typeof mastery === 'number') want = mastery >= 80 ? 'hard' : mastery < 50 ? 'easy' : 'medium';
    if (avail.includes(want)) return want;
    const wi = ORDER.indexOf(want);
    return avail.slice().sort((a, b) => Math.abs(ORDER.indexOf(a) - wi) - Math.abs(ORDER.indexOf(b) - wi) || ORDER.indexOf(a) - ORDER.indexOf(b))[0];
  }
  // a quiz item the student can play: 4 different options, a valid right answer
  function cleanItem(x) {
    if (!x || typeof x !== 'object') return null;
    const q = String(x.q || '').trim(), e = String(x.e || '').trim(), o = Array.isArray(x.o) ? x.o.map(v => String(v == null ? '' : v).trim()) : [];
    if (q.length < 8 || q.length > 300 || !e || e.length > 250 || o.length !== 4 || !o.every(v => v && v.length <= 150) || new Set(o.map(norm)).size !== 4) return null;
    if (!Number.isInteger(x.a) || x.a < 0 || x.a > 3) return null;
    return { q, o, a: x.a, e };
  }

  const readH = () => { try { const o = JSON.parse(g.localStorage.getItem(HKEY + uid()) || '{}'); return o && typeof o === 'object' ? o : {}; } catch (e) { return {}; } };
  const pushH = (k, rec) => { try { const o = readH(); o[k] = (Array.isArray(o[k]) ? o[k] : []).concat([rec]).slice(-10); g.localStorage.setItem(HKEY + uid(), JSON.stringify(o)); } catch (e) {} };
  const mastery = k => (g.RECALL && typeof g.RECALL.mastery === 'function') ? g.RECALL.mastery(k) : null;

  const S = { key: '', loaded: '', busy: false, quizzes: {}, level: '', play: null, err: '',
    adm: { for: '', docs: [], lvl: 'medium', n: 5, busy: false, msg: '', ok: false, draft: null } };

  function load(c, ch) {
    const k = c.id + '|' + ch.no, admin = isAdmin(), tag = k + (admin ? '|a' : '');
    if (S.loaded === tag || !cloud() || !uid()) return;
    if (S.key !== k) { S.quizzes = {}; S.level = ''; S.play = null; A.draft = null; A.msg = ''; A.docs = []; }
    S.loaded = tag; S.key = k; S.err = '';
    (admin ? cloud().forChapter(c.id, ch.no) : cloud().approved(c.id, ch.no)).then(list => {
      if (S.key !== k) return;
      S.quizzes = {};
      list.forEach(d => { if (ORDER.includes(d.level) && d.status === 'approved') S.quizzes[d.level] = d; });
      if (admin) A.docs = list;
      A.for = k; redraw();
    }, () => { if (S.key === k) { S.err = 'Quiz abhi load nahi hua.'; redraw(); } });
  }

  function avail() { return ORDER.filter(l => S.quizzes[l] && Array.isArray(S.quizzes[l].items) && S.quizzes[l].items.map(cleanItem).filter(Boolean).length >= 5); }
  function cur() {
    const a = avail();
    if (S.level && a.includes(S.level)) return S.level;
    return suggest(readH()[S.key], mastery(S.key), a);
  }
  const items = l => (S.quizzes[l] ? S.quizzes[l].items : []).map(cleanItem).filter(Boolean);

  // ---- student card ----
  function studentCard() {
    const a = avail();
    if (!a.length) return '';
    const l = cur(), its = items(l), h = (readH()[S.key] || []).filter(x => x.l === l), last = h.length ? h[h.length - 1] : null;
    const chips = ORDER.filter(x => a.includes(x)).map(x => `<button class="chip" data-qz="level" data-l="${x}" aria-pressed="${x === l}">${NAME[x]}</button>`).join('');
    let body;
    if (S.play && S.play.level === l && !S.play.done) {
      const p = S.play, it = p.items[p.i], picked = p.picked;
      body = `<p class="mut" style="margin:10px 0 4px">Sawaal ${p.i + 1} / ${p.items.length}</p><p style="font-weight:600;margin:0 0 8px">${esc(it.q)}</p>` +
        it.o.map((t, i) => {
          const done = picked != null, right = done && i === it.a, wrong = done && i === picked && i !== it.a;
          return `<button class="btn" data-qz="pick" data-i="${i}" ${done ? 'disabled' : ''} style="display:block;width:100%;text-align:left;margin:6px 0;${right ? 'outline:2px solid #1a7f37' : wrong ? 'outline:2px solid #cf222e' : ''}">${String.fromCharCode(65 + i)}) ${esc(t)}${right ? ' <b>(Sahi)</b>' : wrong ? ' <b>(Galat)</b>' : ''}</button>`;
        }).join('') +
        (picked != null ? `<p role="status" style="margin:8px 0;padding:10px 12px;border-radius:10px;background:var(--ans)"><b>${picked === it.a ? 'Sahi jawab!' : 'Sahi jawab: ' + String.fromCharCode(65 + it.a)}</b><br>${esc(it.e)}</p><button class="btn" data-qz="next">${p.i + 1 >= p.items.length ? 'Result dekho' : 'Agla sawaal'}</button>` : '');
    } else if (S.play && S.play.level === l && S.play.done) {
      const p = S.play, pct = Math.round(p.score * 100 / p.items.length), ni = ORDER.indexOf(l), up = pct >= 80 && a.includes(ORDER[ni + 1]) ? ORDER[ni + 1] : '';
      body = `<p style="font-size:34px;font-weight:700;margin:10px 0 0">${p.score}<span class="mut" style="font-size:18px"> / ${p.items.length}</span></p><p style="margin:0 0 8px"><b>${pct >= 80 ? 'Bahut badhiya!' : pct >= 50 ? 'Achha, thoda aur practice karo.' : 'Chapter dobara padho, phir try karo.'}</b></p>` +
        `<button class="btn" data-qz="again">Dobara khelo</button>${up ? ` <button class="btn" data-qz="level" data-l="${up}">${NAME[up]} try karo</button>` : ''}`;
    } else {
      body = `<p style="margin:10px 0 4px">${its.length} sawaal${last ? ` · pichhli baar ${last.p}%` : ''}</p>${S.level ? '' : `<p class="mut" style="margin:0 0 8px;font-size:12.5px">Aapke liye suggested level: ${NAME[l]}. Badal bhi sakte ho.</p>`}<button class="btn" data-qz="start">Quiz shuru karo</button>`;
    }
    return `<div class="card"><div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><h2 class="sec" style="margin:0">Chapter quiz</h2><span class="chips" role="group" style="display:flex;gap:6px">${chips}</span></div>${body}</div>`;
  }

  // ---- admin panel ----
  const A = S.adm;
  function admField(label, html) { return `<label class="mut" style="display:block;margin-top:8px;font-size:12.5px">${label}${html}</label>`; }
  const inp = 'width:100%;box-sizing:border-box;margin-top:3px;padding:8px;border:1px solid var(--ln);border-radius:8px;background:var(--bg);color:var(--tx);font:inherit';
  function draftHTML() {
    const d = A.draft; if (!d) return '';
    return `<h3 style="margin:14px 0 4px;font-size:15px">Draft: ${NAME[d.level]} (${d.items.length} sawaal)</h3>` + d.items.map((it, i) =>
      `<div style="border:1px solid var(--ln);border-radius:10px;padding:10px;margin-top:8px">${admField('Sawaal ' + (i + 1), `<textarea data-qzf="q:${i}" rows="2" style="${inp}">${esc(it.q)}</textarea>`)}` +
      it.o.map((t, k) => `<div style="display:flex;gap:8px;align-items:center;margin-top:6px"><input type="radio" name="qzc${i}" data-qzc="${i}" value="${k}" ${it.a === k ? 'checked' : ''} aria-label="Sahi option ${String.fromCharCode(65 + k)}"><input data-qzf="o:${i}:${k}" value="${esc(t)}" style="${inp};margin-top:0"></div>`).join('') +
      admField('Kyun sahi hai (1 line)', `<input data-qzf="e:${i}" value="${esc(it.e)}" style="${inp}">`) +
      (it.ev ? `<p class="mut" style="margin:6px 0 0;font-size:12px">Notes mein saboot: ${esc(it.ev)}</p>` : '') +
      `<button class="chip" data-qz="drm" data-i="${i}" style="margin-top:8px;cursor:pointer">Ye sawaal hatao</button></div>`).join('') +
      `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px"><button class="btn" data-qz="dsave" data-st="pending" style="margin:0" ${A.busy ? 'disabled' : ''}>Pending save</button><button class="btn" data-qz="dsave" data-st="approved" style="margin:0" ${A.busy ? 'disabled' : ''}>Approve karke dikhao</button><button class="chip" data-qz="ddiscard" style="cursor:pointer">Draft hatao</button></div>`;
  }
  function adminCard(c, ch) {
    const docs = A.docs.slice().sort((x, y) => ORDER.indexOf(x.level) - ORDER.indexOf(y.level));
    return `<div class="card"><h2 class="sec" style="margin-top:0">Admin: Quiz library</h2><p class="mut" style="margin:0 0 6px;font-size:12.5px">AI notes se sawaal banata hai. Aap dekho, theek karo, phir Approve karo. Approved quiz hi bachhon ko dikhta hai.</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><select data-qzs="lvl" aria-label="Level" style="${inp};width:auto;margin:0">${ORDER.map(l => `<option value="${l}" ${A.lvl === l ? 'selected' : ''}>${NAME[l]}</option>`).join('')}</select>
      <select data-qzs="n" aria-label="Kitne sawaal" style="${inp};width:auto;margin:0">${[5, 8, 10].map(n => `<option value="${n}" ${A.n === n ? 'selected' : ''}>${n} sawaal</option>`).join('')}</select>
      <button class="btn" data-qz="gen" style="margin:0" ${A.busy ? 'disabled' : ''}>${A.busy ? 'Ban raha hai...' : 'AI se banao'}</button></div>
      ${A.msg ? `<p role="status" style="margin:8px 0 0;font-size:13px;color:${A.ok ? '#1a7f37' : '#cf222e'}">${esc(A.msg)}</p>` : ''}
      ${docs.length ? `<h3 style="margin:14px 0 4px;font-size:15px">Is chapter ke quiz</h3>` + docs.map(d => `<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:6px;flex-wrap:wrap"><span>${NAME[d.level]} · ${(d.items || []).length} sawaal · <b>${d.status === 'approved' ? 'Approved' : 'Pending'}</b></span><span><button class="chip" data-qz="dtog" data-id="${esc(d.id)}" style="cursor:pointer">${d.status === 'approved' ? 'Pending karo' : 'Approve'}</button> <button class="chip" data-qz="dedit" data-id="${esc(d.id)}" style="cursor:pointer">Edit</button> <button class="chip" data-qz="ddel" data-id="${esc(d.id)}" style="cursor:pointer">Delete</button></span></div>`).join('') : '<p class="mut" style="margin:10px 0 0">Abhi is chapter ka koi quiz nahi.</p>'}
      ${draftHTML()}</div>`;
  }
  const say = (m, ok) => { A.msg = m || ''; A.ok = !!ok; redraw(); };
  function chapterNow() { return g.__quizCtx || null; }
  async function reloadDocs() { const c = chapterNow(); if (!c || !cloud()) return; try { A.docs = await cloud().forChapter(c.c.id, c.ch.no); S.quizzes = {}; A.docs.forEach(d => { if (d.status === 'approved') S.quizzes[d.level] = d; }); } catch (e) {} }

  async function gen() {
    const c = chapterNow(); if (!c || A.busy) return;
    A.busy = true; A.msg = ''; redraw();
    try {
      const j = await g.api('/api/quiz/generate', { course: c.c.id, ch: c.ch.no, level: A.lvl, n: A.n });
      A.draft = { level: A.lvl, items: (j.items || []).map(x => ({ q: x.q, o: x.o.slice(0, 4), a: x.a, e: x.e, ev: x.ev || '' })) };
      A.msg = 'Draft taiyar (' + A.draft.items.length + ' sawaal' + (j.dropped ? ', ' + j.dropped + ' sawaal notes se match nahi hue isliye hata diye' : '') + '). Dekho aur theek karo.'; A.ok = true;
    } catch (e) { A.msg = (e && e.message) || 'Quiz nahi bana.'; A.ok = false; }
    A.busy = false; redraw();
  }
  async function dsave(status) {
    const c = chapterNow(), d = A.draft; if (!c || !d || A.busy || !cloud()) return;
    const its = d.items.map(cleanItem);
    const badAt = its.findIndex(x => !x);
    if (badAt >= 0) return say('Sawaal ' + (badAt + 1) + ' theek nahi: sawaal 8+ akshar, 4 alag options, sahi option chuna hua aur ek line ka reason chahiye.');
    if (its.length < 5) return say('Kam se kam 5 sawaal chahiye.');
    const old = A.docs.find(x => x.level === d.level);
    if (status !== 'approved' && old && old.status === 'approved' && !g.confirm('Is level ka approved quiz badal jayega aur bachhon ko tab tak nahi dikhega jab tak aap dobara approve na karo. Aage badhein?')) return;
    A.busy = true; redraw();
    try {
      await cloud().set({ course: c.c.id, ch: c.ch.no, level: d.level, status, items: its, at: Date.now() });
      A.draft = null; await reloadDocs(); A.msg = status === 'approved' ? 'Approved: ab bachhon ko dikhega.' : 'Pending save ho gaya. Bachhon ko nahi dikhega.'; A.ok = true;
    } catch (e) { A.msg = e && e.code === 'permission-denied' ? 'Save nahi hua: admin account ya firestore.rules check karo.' : 'Save fail: ' + ((e && e.message) || ''); A.ok = false; }
    A.busy = false; redraw();
  }
  async function dtog(id) {
    const c = chapterNow(), d = A.docs.find(x => x.id === id); if (!c || !d || !cloud()) return;
    const st = d.status === 'approved' ? 'pending' : 'approved';
    try { await cloud().set({ course: d.course, ch: d.ch, level: d.level, status: st, items: d.items, at: Date.now() }); await reloadDocs(); say(st === 'approved' ? 'Approved.' : 'Ab pending hai, bachhon ko nahi dikhega.', true); }
    catch (e) { say('Nahi hua: ' + ((e && e.message) || '')); }
  }
  async function ddel(id) {
    if (!cloud() || !g.confirm('Ye quiz hamesha ke liye hata dein?')) return;
    try { await cloud().del(id); await reloadDocs(); say('Hata diya.', true); } catch (e) { say('Nahi hata: ' + ((e && e.message) || '')); }
  }

  // ---- events ----
  g.document.addEventListener('click', e => {
    const b = e.target && e.target.closest ? e.target.closest('[data-qz]') : null;
    if (!b || b.disabled) return;
    const a = b.dataset.qz, l = cur();
    if (a === 'level') { S.level = b.dataset.l; S.play = null; redraw(); }
    else if (a === 'start' || a === 'again') {
      const its = items(l); if (its.length < 5) return;
      const pool = its.map(x => ({ x, k: Math.random() })).sort((p, r) => p.k - r.k).map(p => p.x);
      S.play = { level: l, items: pool, i: 0, picked: null, score: 0, done: false }; redraw();
    }
    else if (a === 'pick' && S.play && S.play.picked == null) { const i = Number(b.dataset.i); S.play.picked = i; if (i === S.play.items[S.play.i].a) S.play.score++; redraw(); }
    else if (a === 'next' && S.play) {
      if (S.play.i + 1 >= S.play.items.length) { S.play.done = true; pushH(S.key, { l: S.play.level, p: Math.round(S.play.score * 100 / S.play.items.length), at: Date.now() }); }
      else { S.play.i++; S.play.picked = null; }
      redraw();
    }
    else if (a === 'gen') gen();
    else if (a === 'dsave') dsave(b.dataset.st === 'approved' ? 'approved' : 'pending');
    else if (a === 'ddiscard') { A.draft = null; A.msg = ''; redraw(); }
    else if (a === 'drm' && A.draft) { A.draft.items.splice(Number(b.dataset.i), 1); redraw(); }
    else if (a === 'dedit') { const d = A.docs.find(x => x.id === b.dataset.id); if (d) { A.draft = { level: d.level, items: (d.items || []).map(x => ({ q: x.q, o: (x.o || []).slice(0, 4), a: x.a, e: x.e, ev: '' })) }; A.msg = ''; redraw(); } }
    else if (a === 'dtog') dtog(b.dataset.id);
    else if (a === 'ddel') ddel(b.dataset.id);
  });
  g.document.addEventListener('input', e => {
    const f = e.target && e.target.dataset && e.target.dataset.qzf; if (!f || !A.draft) return;
    const p = f.split(':'), it = A.draft.items[Number(p[1])]; if (!it) return;
    if (p[0] === 'q') it.q = e.target.value; else if (p[0] === 'e') it.e = e.target.value; else if (p[0] === 'o') it.o[Number(p[2])] = e.target.value;
  });
  g.document.addEventListener('change', e => {
    const t = e.target; if (!t || !t.dataset) return;
    if (t.dataset.qzc != null && A.draft) { const it = A.draft.items[Number(t.dataset.qzc)]; if (it) it.a = Number(t.value); }
    else if (t.dataset.qzs === 'lvl' && ORDER.includes(t.value)) A.lvl = t.value;
    else if (t.dataset.qzs === 'n') A.n = Number(t.value) || 5;
  });

  g.QUIZ = {
    // Chapter page: the quiz card (students) and, in admin mode, the admin panel. '' until the first approved quiz is loaded.
    chapterHTML(c, ch) {
      if (!c || !ch || c.custom || !uid()) return '';
      g.__quizCtx = { c, ch };
      load(c, ch);
      return studentCard() + (isAdmin() ? adminCard(c, ch) : '');
    },
    suggest, cleanItem,
    _state: S, _reset() { Object.assign(S, { key: '', loaded: '', busy: false, quizzes: {}, level: '', play: null, err: '' }); Object.assign(A, { for: '', docs: [], lvl: 'medium', n: 5, busy: false, msg: '', ok: false, draft: null }); }
  };
})();
