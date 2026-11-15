// Orbit Task 48: "My Class". A teacher makes a class (6-character code) and gives homework (a chapter + a due date). A student joins with the code,
// sees the homework on Home and in My Class, and marks it done. The teacher sees who did it. Only a name and done flags are kept (DPDP).
// Data lives in Firestore (window.CLOUD.classes, see firestore.rules). Screen code is plain DOM like recall.js.
(function (g) {
  'use strict';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const S = { uid: '', loaded: false, busy: false, err: '', msg: '', mine: [], teach: [], open: '' };
  const field = 'width:100%;padding:10px;border:1px solid var(--ln);border-radius:10px;background:var(--bg);color:var(--tx);font:inherit;margin-top:4px';
  const cloud = () => (g.CLOUD && g.CLOUD.classes) || null;
  const draw = () => { const v = typeof VIEW !== 'undefined' ? VIEW : '', n = typeof NAV !== 'undefined' ? NAV : {}; if (typeof g.draw === 'function' && (v === 'class' || (v === 'home' && n.page === 'home'))) g.draw(); };
  const catalog = () => (typeof CATALOG !== 'undefined' ? CATALOG : { groups: [], classes: {} });
  const orgName = id => { const o = catalog().groups.flatMap(x => x.items).find(i => i.id === id); return o ? o.name : id; };
  const courses = () => (typeof DATA !== 'undefined' && DATA && Array.isArray(DATA.courses) ? DATA.courses.filter(c => !c.custom) : []);
  const courseOf = id => courses().find(c => c.id === id);
  const today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const dueText = d => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d || ''); if (!m) return ''; return +m[3] + ' ' + ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][+m[2] - 1]; };
  const normCode = v => String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  const goodCode = c => /^[A-HJ-NP-Z2-9]{6}$/.test(c);
  const className = c => 'Class ' + c.class + ' · ' + orgName(c.school);
  const chapterTitle = (cid, no) => { const c = courseOf(cid), ch = c && (c.chapters || []).find(x => x.no === no); return c ? (c.subject + ' · Ch ' + no + (ch && ch.title ? ': ' + ch.title : '')) : 'Chapter ' + no; };
  const userName = () => { const u = typeof USER !== 'undefined' ? USER : null; return (u && (u.name || u.displayName)) || 'Student'; };
  const fail = e => (e && e.code === 'permission-denied') ? 'Ye kaam nahi ho paaya (ijazat nahi mili). Dobara try karo.' : 'Net ya server ki dikkat. Thodi der baad try karo.';

  // ---- loading
  async function load() {
    const C = cloud(); if (!C || !S.uid) return;
    S.busy = true; S.err = '';
    try {
      const codes = await C.myCodes();
      const mine = [];
      for (const code of codes) {
        const cls = await C.get(code);
        if (!cls) { try { await C.forget(code); } catch (e) {} continue; }   // the teacher deleted the class
        let hw = [], done = {};
        try { hw = await C.hwList(code); (await C.doneList(code, true)).forEach(d => { done[d.hw] = true; }); } catch (e) {}
        hw.sort((a, b) => String(a.due).localeCompare(String(b.due)));
        mine.push({ cls, hw, done });
      }
      S.mine = mine;
      const own = await C.listOwn(), teach = [];
      for (const cls of own) teach.push({ cls, members: [], hw: [], done: [], scores: [] });
      S.teach = teach;
      S.loaded = true;
      await Promise.all(S.teach.map(loadTeach));
    } catch (e) { S.err = fail(e); }
    S.loaded = true; S.busy = false; draw();   // loaded even after an error, so the screen never retries in a loop
  }
  async function loadTeach(t) {
    const C = cloud(); if (!C) return;
    try { const [m, h, d, sc] = await Promise.all([C.members(t.cls.code), C.hwList(t.cls.code), C.doneList(t.cls.code, false), C.scoreList(t.cls.code)]); t.members = m; t.hw = h.sort((a, b) => String(a.due).localeCompare(String(b.due))); t.done = d; t.scores = sc; } catch (e) { S.err = fail(e); }
  }

  // ---- actions
  async function join() {
    const el = g.document.getElementById('clCode'), code = normCode(el && el.value);
    if (!goodCode(code)) { S.err = 'Class code 6 akshar ka hota hai. Teacher se poochkar dobara likho.'; S.msg = ''; return draw(); }
    if (S.mine.some(m => m.cls.code === code)) { S.err = 'Tum is class mein pehle se ho.'; return draw(); }
    S.busy = true; S.err = ''; S.msg = ''; draw();
    try {
      const cls = await cloud().get(code);
      if (!cls) { S.err = 'Ye class code nahi mila. Code dobara check karo.'; S.busy = false; return draw(); }
      await cloud().join(code, userName());
      S.msg = className(cls) + ' mein judh gaye.';
      await load();
    } catch (e) { S.err = fail(e); S.busy = false; draw(); }
  }
  async function act(label, fn) { S.busy = true; S.err = ''; S.msg = ''; draw(); try { await fn(); } catch (e) { S.err = fail(e); } S.busy = false; draw(); }
  const mineOf = code => S.mine.find(m => m.cls.code === code);
  const teachOf = code => S.teach.find(t => t.cls.code === code);

  function markDone(code, hw, on) {
    return act('done', async () => {
      if (on) await cloud().doneSet(code, hw); else await cloud().doneDel(code, hw);
      const m = mineOf(code); if (m) { if (on) m.done[hw] = true; else delete m.done[hw]; }
    });
  }
  function leave(code) {
    if (g.confirm && !g.confirm('Is class ko chhodna hai? Teacher ko tumhara naam aur homework status dikhna band ho jayega.')) return;
    return act('leave', async () => { await cloud().leave(code); S.mine = S.mine.filter(m => m.cls.code !== code); });
  }
  function createClass() {
    const school = (g.document.getElementById('clSchool') || {}).value, cls = +((g.document.getElementById('clClass') || {}).value);
    if (!school || !cls) { S.err = 'School aur class chuno.'; return draw(); }
    return act('create', async () => { const c = await cloud().create(school, cls); const t = { cls: c, members: [], hw: [], done: [], scores: [] }; S.teach.push(t); S.open = c.code; S.msg = 'Class ban gayi. Code: ' + c.code; });
  }
  function addHomework(code) {
    const v = id => (g.document.getElementById(id) || {}).value || '';
    const cid = v('clCourse'), no = +v('clChapter'), due = v('clDue'), note = v('clNote').trim().slice(0, 200), t = teachOf(code);
    const c = courseOf(cid), ch = c && (c.chapters || []).find(x => x.no === no);
    if (!c || !ch) { S.err = 'Subject aur chapter chuno.'; return draw(); }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(due)) { S.err = 'Last date chuno.'; return draw(); }
    const hw = { course: cid, chapter: no, title: (c.subject + ': ' + (ch.title || 'Chapter ' + no)).slice(0, 120), due, note, createdAt: Date.now() };
    return act('hw', async () => { const id = await cloud().hwAdd(code, hw); t.hw.push({ id, ...hw }); t.hw.sort((a, b) => String(a.due).localeCompare(String(b.due))); S.msg = 'Homework de diya.'; });
  }
  function delHomework(code, id) {
    if (g.confirm && !g.confirm('Ye homework hata dein?')) return;
    const t = teachOf(code); return act('hwdel', async () => { await cloud().hwDel(code, id); t.hw = t.hw.filter(h => h.id !== id); t.done = t.done.filter(d => d.hw !== id); });
  }
  function delClass(code) {
    if (g.confirm && !g.confirm('Poori class, uske bachhe aur homework hamesha ke liye hat jayenge. Pakka?')) return;
    return act('delclass', async () => { await cloud().removeClass(code); S.teach = S.teach.filter(t => t.cls.code !== code); if (S.open === code) S.open = ''; });
  }
  // Recall result -> this student's score of that chapter goes to every class they joined (one record per chapter, the latest score).
  function score(cid, no, total) {
    const C = cloud(); if (!C || !S.uid || !S.mine.length || !cid || !(no >= 1) || typeof total !== 'number') return;
    const ch = cid + '_' + no;
    S.mine.forEach(m => { try { C.scoreSet(m.cls.code, ch, total).catch(() => {}); } catch (e) {} });
  }
  // Teacher: chapters ranked by how many students are weak (score under 50), weakest first. Counts only, no names.
  function weakTopics(scores) {
    const by = {};
    (scores || []).forEach(s => { const e = by[s.ch] = by[s.ch] || { ch: s.ch, n: 0, weak: 0, sum: 0 }; e.n++; e.sum += s.score; if (s.score < 50) e.weak++; });
    return Object.values(by).map(e => ({ ch: e.ch, n: e.n, weak: e.weak, avg: Math.round(e.sum / e.n), pct: Math.round(100 * e.weak / e.n) }))
      .sort((a, b) => b.pct - a.pct || b.weak - a.weak || a.avg - b.avg);
  }
  function weakHTML(t) {
    const w = weakTopics(t.scores).slice(0, 6);
    const title = ch => { const i = ch.lastIndexOf('_'); return chapterTitle(ch.slice(0, i), +ch.slice(i + 1)); };
    return `<div style="border-top:1px solid var(--ln);margin-top:10px;padding-top:6px"><div style="font-weight:600;margin-top:6px">Class ke kamzor topics</div>
      ${w.length ? `<ol style="margin:6px 0 0;padding-left:20px;font-size:14px">${w.map(e => `<li style="margin-bottom:4px">${esc(title(e.ch))}<div class="mut" style="font-size:13px">${e.weak}/${e.n} bachhe kamzor (${e.pct}%) · average ${e.avg}%</div></li>`).join('')}</ol>
        <p class="mut" style="margin:6px 0 0;font-size:12.5px">Sirf wo bachhe jinhone Recall check kiya. Kamzor = 50% se kam. Naam nahi dikhte.</p>`
      : '<p class="mut" style="margin:6px 0 0">Abhi kisi bachhe ne Recall check nahi kiya.</p>'}</div>`;
  }
  function openChapter(code, cid, no) {
    const c = courseOf(cid); const m = mineOf(code) || teachOf(code);
    if (!c || typeof g.navTo !== 'function') { S.err = 'Ye chapter abhi app mein nahi mila.'; return draw(); }
    g.navTo({ page: 'chapter', org: m ? m.cls.school : 'nashib', med: c.medium || 'English', cls: c.class, sub: c.subject, ch: no });
  }

  // ---- screens
  function hwRowStudent(m, h) {
    const done = !!m.done[h.id], late = !done && h.due < today();
    return `<div style="padding:10px 0;border-top:1px solid var(--ln)">
      <div style="font-weight:600">${esc(h.title)}</div>
      <div class="mut" style="font-size:13px">${esc(chapterTitle(h.course, h.chapter))} · Last date ${esc(dueText(h.due))}${late ? ' (nikal gayi)' : ''}${done ? ' · Ho gaya' : ''}</div>
      ${h.note ? `<div style="margin-top:4px;font-size:14px">${esc(h.note)}</div>` : ''}
      <div class="chips"><button class="chip" data-cl="open" data-code="${m.cls.code}" data-course="${esc(h.course)}" data-ch="${h.chapter}">Chapter kholo</button>
      <button class="chip" data-cl="${done ? 'undone' : 'done'}" data-code="${m.cls.code}" data-hw="${h.id}" aria-pressed="${done}" ${S.busy ? 'disabled' : ''}>${done ? 'Wapas karo' : 'Ho gaya'}</button></div></div>`;
  }
  function studentSection() {
    const cards = S.mine.map(m => `<div class="card"><div style="font-weight:700">${esc(className(m.cls))}</div><div class="mut" style="font-size:13px">Code ${esc(m.cls.code)}</div>
      ${m.hw.length ? m.hw.map(h => hwRowStudent(m, h)).join('') : '<p class="mut" style="margin:10px 0 0">Abhi koi homework nahi.</p>'}
      <div class="chips"><button class="chip" data-cl="leave" data-code="${m.cls.code}" ${S.busy ? 'disabled' : ''}>Class chhodo</button></div></div>`).join('');
    return `<h2 class="sec">Meri class</h2>
      <div class="card"><label class="mut" for="clCode">Teacher ka class code</label>
        <input id="clCode" maxlength="6" autocapitalize="characters" autocomplete="off" placeholder="jaise K7M2QX" style="${field};letter-spacing:3px;text-transform:uppercase">
        <button class="btn" data-cl="join" ${S.busy ? 'disabled' : ''}>Class se judo</button>
        <p class="mut" style="margin:10px 0 0;font-size:12.5px">Judne par teacher ko tumhara naam, homework ho gaya ya nahi, aur Recall check ka chapter score dikh sakta hai. Photo, awaaz ya phone number nahi.</p></div>${cards}`;
  }
  function teacherSection() {
    const cat = catalog(), orgs = cat.groups.flatMap(x => x.items);
    const schoolSel = `<option value="">School / board chuno</option>${orgs.map(o => `<option value="${o.id}">${esc(o.name)}</option>`).join('')}`;
    const classSel = `<option value="">Class chuno</option>${Array.from({ length: 12 }, (_, i) => `<option value="${i + 1}">Class ${i + 1}</option>`).join('')}`;
    const cards = S.teach.map(t => teacherCard(t)).join('');
    return `<h2 class="sec">Teacher ke liye</h2>
      <div class="card"><label class="mut" for="clSchool">School</label><select id="clSchool" style="${field}">${schoolSel}</select>
        <label class="mut" for="clClass" style="display:block;margin-top:10px">Class</label><select id="clClass" style="${field}">${classSel}</select>
        <button class="btn" data-cl="create" ${S.busy ? 'disabled' : ''}>Nayi class banao</button></div>${cards}`;
  }
  function teacherCard(t) {
    const code = t.cls.code, isOpen = S.open === code, n = t.members.length;
    const head = `<div style="display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap"><div><div style="font-weight:700">${esc(className(t.cls))}</div>
      <div class="mut" style="font-size:13px">${n} bachhe</div></div><div style="font-size:22px;letter-spacing:4px;font-weight:700">${esc(code)}</div></div>
      <div class="chips"><button class="chip" data-cl="toggle" data-code="${code}" aria-expanded="${isOpen}">${isOpen ? 'Band karo' : 'Kholo'}</button><button class="chip" data-cl="copy" data-code="${code}">Code copy karo</button></div>`;
    if (!isOpen) return `<div class="card">${head}</div>`;
    const cs = courses().filter(c => c.class === t.cls.class), selCourse = (g.document.getElementById('clCourse') || {}).value || (cs[0] && cs[0].id) || '';
    const sc = courseOf(selCourse), chs = sc ? (sc.chapters || []).filter(x => !x.locked) : [];
    const hwHTML = t.hw.map(h => {
      const doneIds = new Set(t.done.filter(d => d.hw === h.id).map(d => d.uid));
      const names = t.members.map(m => `<li>${esc(m.name)} — ${doneIds.has(m.uid) ? 'ho gaya' : 'baaki'}</li>`).join('');
      return `<div style="padding:10px 0;border-top:1px solid var(--ln)"><div style="font-weight:600">${esc(h.title)}</div>
        <div class="mut" style="font-size:13px">Last date ${esc(dueText(h.due))} · ${doneIds.size}/${n} ne kiya</div>${h.note ? `<div style="font-size:14px;margin-top:4px">${esc(h.note)}</div>` : ''}
        ${n ? `<details style="margin-top:6px"><summary class="mut" style="font-size:13px">Kisne kiya</summary><ul style="margin:6px 0 0;padding-left:18px;font-size:14px">${names}</ul></details>` : ''}
        <div class="chips"><button class="chip" data-cl="hwdel" data-code="${code}" data-hw="${h.id}">Homework hatao</button></div></div>`;
    }).join('');
    return `<div class="card">${head}
      <div style="border-top:1px solid var(--ln);margin-top:10px;padding-top:6px">
        <label class="mut" for="clCourse" style="display:block;margin-top:6px">Subject</label>
        <select id="clCourse" style="${field}">${cs.map(c => `<option value="${esc(c.id)}" ${c.id === selCourse ? 'selected' : ''}>${esc(c.subject)}${c.medium && c.medium !== 'English' ? ' (' + esc(c.medium) + ')' : ''}</option>`).join('') || '<option value="">Is class ke liye subject nahi</option>'}</select>
        <label class="mut" for="clChapter" style="display:block;margin-top:10px">Chapter</label>
        <select id="clChapter" style="${field}">${chs.map(x => `<option value="${x.no}">Ch ${x.no}${x.title ? ': ' + esc(x.title) : ''}</option>`).join('')}</select>
        <label class="mut" for="clDue" style="display:block;margin-top:10px">Last date</label><input type="date" id="clDue" min="${today()}" style="${field}">
        <label class="mut" for="clNote" style="display:block;margin-top:10px">Note (zaroori nahi)</label><input id="clNote" maxlength="200" style="${field}">
        <button class="btn" data-cl="hwadd" data-code="${code}" ${S.busy ? 'disabled' : ''}>Homework do</button></div>
      ${hwHTML || '<p class="mut" style="margin:10px 0 0">Abhi koi homework nahi diya.</p>'}
      ${weakHTML(t)}
      <div class="chips"><button class="chip" data-cl="delclass" data-code="${code}">Class hatao</button></div></div>`;
  }
  function viewHTML() {
    if (S.uid && !S.loaded && !S.busy) load();
    return `<h1 style="font-size:26px;margin-top:14px">My Class</h1>
      ${S.busy && !S.loaded ? '<p class="mut">Load ho raha hai...</p>' : ''}
      ${S.err ? `<p class="err" role="status">${esc(S.err)}</p>` : ''}${S.msg ? `<p role="status" style="margin:10px 0 0">${esc(S.msg)}</p>` : ''}
      ${studentSection()}${teacherSection()}`;
  }
  // Home: a small card with homework that is not done yet (at most 3, nearest last date first).
  function homeHTML() {
    const rows = [];
    S.mine.forEach(m => m.hw.forEach(h => { if (!m.done[h.id]) rows.push({ m, h }); }));
    if (!rows.length) return '';
    rows.sort((a, b) => String(a.h.due).localeCompare(String(b.h.due)));
    return `<div class="card"><h2 class="sec" style="margin:0 0 6px;font-size:18px">Homework</h2>${rows.slice(0, 3).map(({ m, h }) => `<button class="row" data-cl="open" data-code="${m.cls.code}" data-course="${esc(h.course)}" data-ch="${h.chapter}" style="text-align:left"><span class="rmain"><div class="rtitle">${esc(h.title)}</div><div class="rsub">Last date ${esc(dueText(h.due))}${h.due < today() ? ' (nikal gayi)' : ''}</div></span></button>`).join('')}
      <div class="chips"><button class="chip" data-cl="page">Poora homework dekho</button></div></div>`;
  }

  g.document.addEventListener('change', e => { if (e.target.id === 'clCourse') draw(); });
  g.document.addEventListener('click', e => {
    const b = e.target && e.target.closest ? e.target.closest('[data-cl]') : null;
    if (!b || b.disabled) return;
    const a = b.dataset.cl, code = b.dataset.code;
    if (a === 'join') join();
    else if (a === 'done') markDone(code, b.dataset.hw, true);
    else if (a === 'undone') markDone(code, b.dataset.hw, false);
    else if (a === 'leave') leave(code);
    else if (a === 'create') createClass();
    else if (a === 'toggle') { S.open = S.open === code ? '' : code; draw(); }
    else if (a === 'copy') { try { g.navigator.clipboard.writeText(code); S.msg = 'Code copy ho gaya: ' + code; } catch (x) { S.msg = 'Code: ' + code; } draw(); }
    else if (a === 'hwadd') addHomework(code);
    else if (a === 'hwdel') delHomework(code, b.dataset.hw);
    else if (a === 'delclass') delClass(code);
    else if (a === 'open') openChapter(code, b.dataset.course, +b.dataset.ch);
    else if (a === 'page' && typeof g.go === 'function') g.go('class');
  });

  g.CLASSROOM = {
    viewHTML, homeHTML, score,
    setUser(u) { const id = u && u.uid ? u.uid : ''; if (id === S.uid) return; Object.assign(S, { uid: id, loaded: false, busy: false, err: '', msg: '', mine: [], teach: [], open: '' }); if (id) load(); },
    refresh() { S.loaded = false; },   // the next time My Class opens it loads again
    _s: S, _t: { normCode, goodCode, dueText, weakTopics }
  };
})(window);
