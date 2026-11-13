// Orbit: "Add custom course". A student builds their own School/Board > Medium > Class > Subject > Chapter, adds the chapter's questions
// from a photo (the AI reads them, the student checks them), and can share the course with a link (receivers can view it or copy it).
// index.html calls CUSTOM.viewHTML() for the "My Courses" page, CUSTOM.homeHTML() on the home page and CUSTOM.apply() after the question list is loaded.
// Data: one Firestore document per subject (customCourses/<id>, see firestore.rules), a copy is kept on this device so it opens offline.
// The course is added to the app's normal course list (DATA.courses + CATALOG), so the usual screens, AI Answer, translate, diagram and
// Save/Pin work on it with no change. The AI routes get the question text with the request (see custom-core.js on the server).
(function (g) {
  'use strict';
  const doc = g.document;
  const KEY = 'orbit_custom_v1', PEND = 'orbit_cc_pending';
  const MAX_COURSES = 15, MAX_CHAPTERS = 40, MAX_Q = 80, MAX_BYTES = 800000, MAX_PHOTOS = 3;
  const MEDIUMS = ['English', 'Assamese'], LANGS = ['English', 'Hindi', 'Assamese'];
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const CLOUD = () => g.CLOUD && g.CLOUD.custom;
  const redraw = force => {
    if (typeof g.draw !== 'function' || typeof DATA === 'undefined' || !DATA) return;
    if (!force && typeof VIEW !== 'undefined' && VIEW === 'custom' && (S.page === 'new' || S.page === 'chapter')) return;   // never wipe what the student is typing
    g.draw();
  };

  const hooks = {};   // tests replace the photo shrinker (jsdom has no canvas)
  const S = { page: 'list', uid: '', own: [], shared: [], gone: [], loading: false, err: '', msg: '', cur: '', work: null, busy: false, incoming: null, newCh: '', form: { org: '', medium: 'English', cls: '', subject: '', lang: 'English' } };

  // ---- the copy kept on this device ----
  function cacheLoad() {
    try { const c = JSON.parse(localStorage.getItem(KEY) || 'null'); if (c && c.uid && Array.isArray(c.own) && Array.isArray(c.shared)) { S.uid = c.uid; S.own = c.own; S.shared = c.shared; } } catch (e) { /* no copy yet */ }
  }
  function cacheSave() { try { localStorage.setItem(KEY, JSON.stringify({ uid: S.uid, own: S.own, shared: S.shared })); } catch (e) { /* storage full: the cloud copy is the real one */ } }
  cacheLoad();

  // ---- course documents -> the app's course objects ----
  const hash36 = t => { let x = 5381; t = String(t); for (let i = 0; i < t.length; i++) x = ((x << 5) + x + t.charCodeAt(i)) | 0; return (x >>> 0).toString(36); };
  const orgId = name => 'u-' + hash36(String(name).trim().toLowerCase());
  const normLabel = l => { l = String(l || '').trim(); return !l ? '' : /[.):]$/.test(l) ? l : l + '.'; };
  const nQ = d => (d.chapters || []).reduce((n, ch) => n + (ch.questions || []).length, 0);
  function toCourse(d, own) {
    return {
      id: 'cc-' + d.id, custom: true, own, docId: d.id, org: d.org, orgId: orgId(d.org), class: d.class, subject: d.subject, medium: d.medium, lang: d.lang,
      ...(d.lang && d.lang !== 'English' ? { sourceLang: d.lang } : {}),
      chapters: (d.chapters || []).map(ch => ({
        no: ch.no, title: ch.title,
        sections: (ch.questions || []).length ? [{ title: 'Questions', questions: ch.questions.map((q, i) => ({ id: 'cq_' + d.id + '_' + q.k, no: i + 1, label: normLabel(q.label), text: q.text, parts: q.parts || [], options: q.options || [] })) }] : []
      }))
    };
  }
  // Put the student's courses into the app's own lists (called after every load or change). Safe to call again and again.
  function apply() {
    if (typeof DATA === 'undefined' || !DATA || typeof CATALOG === 'undefined') return;
    DATA.courses = DATA.courses.filter(c => !c.custom);
    for (const id of Object.keys(IDX)) if (IDX[id].course && IDX[id].course.custom) delete IDX[id];
    CATALOG.groups = CATALOG.groups.filter(x => !x.custom);
    for (const o of Object.keys(CATALOG.content)) if (/^u-/.test(o)) { delete CATALOG.content[o]; delete CATALOG.classes[o]; }
    const orgs = new Map();
    for (const c of [...S.own.map(d => toCourse(d, true)), ...S.shared.map(d => toCourse(d, false))]) {
      DATA.courses.push(c);
      c.chapters.forEach(ch => (ch.sections || []).forEach(sec => sec.questions.forEach(q => { IDX[q.id] = { course: c, ch, q }; })));
      if (!orgs.has(c.orgId)) orgs.set(c.orgId, { id: c.orgId, name: c.org, sub: 'Custom course' });
      const byClass = CATALOG.content[c.orgId] = CATALOG.content[c.orgId] || {};
      (byClass[c.class] = byClass[c.class] || []).push([c.id, c.subject]);
      const cl = CATALOG.classes[c.orgId] = CATALOG.classes[c.orgId] || [];
      if (!cl.includes(c.class)) { cl.push(c.class); cl.sort((a, b) => a - b); }
    }
    if (orgs.size) CATALOG.groups.push({ t: 'My courses', custom: true, items: [...orgs.values()] });
  }

  // ---- load / refresh from the cloud ----
  const pendingId = () => { try { return sessionStorage.getItem(PEND) || ''; } catch (e) { return ''; } };
  (function readLink() {   // ?cc=<course id> from a share link: remembered until the student is logged in, then removed from the address bar
    try {
      const u = new URL(g.location.href), id = u.searchParams.get('cc');
      if (id && /^[A-Za-z0-9]{15,40}$/.test(id)) { sessionStorage.setItem(PEND, id); u.searchParams.delete('cc'); g.history.replaceState(g.history.state, '', u.pathname + (u.search || '') + u.hash); }
    } catch (e) { /* no share link */ }
  })();

  async function refresh() {
    const C = CLOUD(); if (!C || !S.uid) return;
    S.loading = true; S.err = '';
    try {
      const [own, ids] = await Promise.all([C.listOwn(), C.savedIds()]);
      const docs = await Promise.all(ids.map(id => C.get(id)));
      S.own = own.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      S.shared = docs.filter(d => d && d.ownerId !== S.uid);
      S.gone = ids.filter((id, i) => !docs[i]);
      cacheSave();
    } catch (e) { S.err = 'Courses cloud se load nahi hue. Internet check karo (purane courses dikh rahe hain).'; }
    S.loading = false; apply(); redraw();
  }
  async function start(user) {
    if (!user || !user.uid) return;
    if (S.uid && S.uid !== user.uid) { S.own = []; S.shared = []; S.gone = []; }   // another student on this device
    S.uid = user.uid; apply(); redraw();
    await refresh();
    checkIncoming();
  }
  function stop() {
    S.uid = ''; S.own = []; S.shared = []; S.gone = []; S.page = 'list'; S.work = null; S.cur = '';
    try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
    apply();
  }

  async function checkIncoming() {
    const id = pendingId(); if (!id || !S.uid) return;
    try { sessionStorage.removeItem(PEND); } catch (e) { /* ignore */ }
    if (S.own.some(d => d.id === id)) { S.cur = id; S.page = 'manage'; g.go('custom'); return; }
    if (S.shared.some(d => d.id === id)) { S.page = 'list'; S.msg = 'Ye course pehle se aapke paas hai.'; g.go('custom'); return; }
    const d = await CLOUD().get(id);
    if (!d) { S.page = 'list'; S.err = 'Ye link band hai ya galat hai. Owner se naya link maango.'; g.go('custom'); return; }
    S.incoming = d; S.page = 'incoming'; S.err = ''; g.go('custom');
  }

  // ---- saving ----
  const bytesOf = d => new Blob([JSON.stringify(d)]).size;
  async function put(d) {
    d.updatedAt = Date.now();
    const { id, ...data } = d;
    if (bytesOf(data) > MAX_BYTES) throw new Error('Ye course bahut bada ho gaya. Kuch questions ya chapters kam karo.');
    await CLOUD().set(id, data);
    cacheSave();
  }
  const cur = () => S.own.find(d => d.id === S.cur);
  const rk = () => { const a = new Uint8Array(6); (g.crypto || {}).getRandomValues ? g.crypto.getRandomValues(a) : a.forEach((_, i) => { a[i] = Math.random() * 256; }); return [...a].map(x => (x % 36).toString(36)).join(''); };
  const errText = e => (e && e.code === 'permission-denied') ? 'Save nahi hua (permission). Dobara login karo ya thodi der baad try karo.' : (typeof errMsg === 'function' ? errMsg(e) : String((e && e.message) || e));
  // An edited or deleted question must not keep the old answer, translation or heart on this device.
  function forget(id) {
    try {
      delete ANS[id]; delete CACHE[id]; cachePersist(); delete TRC[id]; trPersist(); delete MRC[id]; mrPersist(); delete VIS[id]; delete OPEN[id];
      for (const t of Object.keys(TR)) if (t.startsWith(id + '|')) delete TR[t];
      for (const t of Object.keys(MR)) if (t.startsWith(id + '|')) delete MR[t];
      if (SAVED[id]) { delete SAVED[id]; persist(); }
    } catch (e) { /* the app shell is not ready: nothing to forget */ }
  }

  // ---- actions ----
  async function create() {
    const f = S.form, org = f.org.trim(), subject = f.subject.trim(), cls = parseInt(f.cls, 10);
    if (org.length < 2) return say('School ya board ka naam likho (kam se kam 2 akshar).', true);
    if (!MEDIUMS.includes(f.medium)) return say('Medium chuno.', true);
    if (!(cls >= 1 && cls <= 12)) return say('Class chuno.', true);
    if (subject.length < 2) return say('Subject ka naam likho.', true);
    if (S.own.length >= MAX_COURSES) return say('Aap ' + MAX_COURSES + ' se zyada courses nahi bana sakte. Pehle koi purana hata do.', true);
    if (S.own.some(d => d.org.toLowerCase() === org.toLowerCase() && d.class === cls && d.medium === f.medium && d.subject.toLowerCase() === subject.toLowerCase())) return say('Ye course (same school, class, medium, subject) pehle se hai.', true);
    const d = { id: CLOUD().newId(), ownerId: S.uid, org: org.slice(0, 60), medium: f.medium, class: cls, subject: subject.slice(0, 40), lang: LANGS.includes(f.lang) ? f.lang : 'English', chapters: [], shared: false, updatedAt: Date.now() };
    S.busy = true; S.err = ''; redraw(true);
    try { await put(d); S.own.unshift(d); S.cur = d.id; S.page = 'manage'; S.msg = 'Course ban gaya. Ab chapter jodo.'; S.form.subject = ''; apply(); }
    catch (e) { S.err = errText(e); }
    S.busy = false; redraw(true);
  }
  async function addChapter() {
    const d = cur(), title = S.newCh.trim();
    if (!d) return;
    if (title.length < 1) return say('Chapter ka naam likho.', true);
    if ((d.chapters || []).length >= MAX_CHAPTERS) return say('Ek course me ' + MAX_CHAPTERS + ' chapters tak ho sakte hain.', true);
    const no = Math.max(0, ...(d.chapters || []).map(c => c.no)) + 1;
    const next = { ...d, chapters: [...(d.chapters || []), { no, title: title.slice(0, 80), questions: [] }] };
    await save(next, () => { S.newCh = ''; S.msg = 'Chapter ' + no + ' jud gaya.'; });
  }
  async function save(next, after) {   // write a changed copy of the open course; swap it in only when the cloud accepted it
    S.busy = true; S.err = ''; S.msg = ''; redraw(true);
    try {
      await put(next);
      const i = S.own.findIndex(x => x.id === next.id); if (i >= 0) S.own[i] = next;
      if (after) after();
      apply();
    } catch (e) { S.err = errText(e); }
    S.busy = false; redraw(true);
  }
  function say(m, isErr) { if (isErr) { S.err = m; S.msg = ''; } else { S.msg = m; S.err = ''; } redraw(true); }
  async function delChapter(no) {
    const d = cur(), ch = d && d.chapters.find(c => c.no === no);
    if (!ch || !g.confirm('Chapter ' + no + ' (' + ch.title + ') aur uske ' + (ch.questions || []).length + ' questions hata dein?')) return;
    const ids = (ch.questions || []).map(q => 'cq_' + d.id + '_' + q.k);
    await save({ ...d, chapters: d.chapters.filter(c => c.no !== no) }, () => { ids.forEach(forget); S.msg = 'Chapter hata diya.'; });
  }
  async function delCourse(id) {
    const d = S.own.find(x => x.id === id);
    if (!d || !g.confirm('Poora course "' + d.subject + '" (Class ' + d.class + ') hata dein? Ye wapas nahi aayega' + (d.shared ? ' aur share link bhi band ho jayega.' : '.'))) return;
    S.busy = true; redraw(true);
    try {
      await CLOUD().del(id);
      (d.chapters || []).forEach(ch => (ch.questions || []).forEach(q => forget('cq_' + id + '_' + q.k)));
      S.own = S.own.filter(x => x.id !== id); S.page = 'list'; S.cur = ''; S.msg = 'Course hata diya.'; cacheSave(); apply();
    } catch (e) { S.err = errText(e); }
    S.busy = false; redraw(true);
  }
  async function setShared(on) { const d = cur(); if (d) await save({ ...d, shared: !!on }, () => { S.msg = on ? 'Sharing chalu. Link kisi ko bhi bhejo, wo sirf dekh sakta hai.' : 'Sharing band. Purana link ab kaam nahi karega.'; }); }
  const link = d => g.location.origin + '/?cc=' + d.id;
  async function copyText(t) {
    try { await g.navigator.clipboard.writeText(t); say('Link copy ho gaya.'); }
    catch (e) { g.prompt('Is link ko copy karo:', t); }
  }
  async function removeSaved(id) {
    try { await CLOUD().unsaveRef(id); S.shared = S.shared.filter(d => d.id !== id); S.gone = S.gone.filter(x => x !== id); S.msg = 'Course aapki list se hata diya.'; cacheSave(); apply(); }
    catch (e) { S.err = errText(e); }
    redraw(true);
  }
  async function saveIncoming() {
    const d = S.incoming; if (!d) return;
    try { await CLOUD().saveRef(d.id); S.shared.unshift(d); S.incoming = null; S.page = 'list'; S.msg = 'Course save ho gaya (sirf dekh sakte ho). Edit karna ho to "Meri copy banao" dabao.'; cacheSave(); apply(); }
    catch (e) { S.err = errText(e); }
    redraw(true);
  }
  async function copyCourse(src) {
    if (!src) return;
    if (S.own.length >= MAX_COURSES) return say('Aap ' + MAX_COURSES + ' se zyada courses nahi bana sakte.', true);
    const d = { id: CLOUD().newId(), ownerId: S.uid, org: src.org, medium: src.medium, class: src.class, subject: src.subject, lang: src.lang || 'English', shared: false, updatedAt: Date.now(),
      chapters: (src.chapters || []).map(ch => ({ no: ch.no, title: ch.title, questions: (ch.questions || []).map(q => ({ k: rk(), label: q.label || '', text: q.text, parts: q.parts || [], options: q.options || [] })) })) };
    S.busy = true; redraw(true);
    try { await put(d); S.own.unshift(d); S.incoming = null; S.cur = d.id; S.page = 'manage'; S.msg = 'Ye aapki apni copy hai. Ab ise edit kar sakte ho.'; apply(); }
    catch (e) { S.err = errText(e); }
    S.busy = false;
    if (typeof VIEW !== 'undefined' && VIEW !== 'custom') g.go('custom'); else redraw(true);
  }
  function openCourse(c) {   // jump into the normal app screens for this course
    if (!c) return;
    g.navTo({ page: 'index', org: c.orgId, med: c.medium, cls: c.class, sub: c.subject });
  }
  const allDocs = () => [...S.own, ...S.shared];
  const courseOfDoc = d => (DATA.courses || []).find(c => c.docId === d.id);

  // ---- chapter editor (questions list + photo) ----
  function openChapter(no) {
    const d = cur(), ch = d && d.chapters.find(c => c.no === no); if (!ch) return;
    S.work = { no, title: ch.title, qs: (ch.questions || []).map(q => ({ k: q.k, label: q.label || '', text: q.text, parts: [...(q.parts || [])], options: [...(q.options || [])], orig: JSON.stringify([q.text, q.parts || [], q.options || []]) })), dirty: false };
    S.page = 'chapter'; S.msg = ''; S.err = ''; redraw(true);
  }
  async function saveWork() {
    const d = cur(), w = S.work; if (!d || !w) return;
    const qs = w.qs.map(q => ({ ...q, text: q.text.trim() })).filter(q => q.text.length >= 3);
    if (qs.length > MAX_Q) return say('Ek chapter me ' + MAX_Q + ' questions tak rakh sakte ho.', true);
    const dropped = w.qs.length - qs.length;
    const old = (d.chapters.find(c => c.no === w.no) || {}).questions || [];
    const keep = new Set(qs.filter(q => q.k).map(q => q.k));
    const changed = [];
    const out = qs.map(q => {
      const k = q.k || rk();
      if (q.k && q.orig !== JSON.stringify([q.text, q.parts, q.options])) changed.push(k);
      return { k, label: String(q.label || '').trim().slice(0, 12), text: q.text.slice(0, 700), parts: (q.parts || []).map(x => x.slice(0, 300)).slice(0, 8), options: (q.options || []).map(x => x.slice(0, 300)).slice(0, 6) };
    });
    const gone = old.filter(q => !keep.has(q.k)).map(q => q.k);
    await save({ ...d, chapters: d.chapters.map(c => c.no === w.no ? { ...c, questions: out } : c) }, () => {
      changed.concat(gone).forEach(k => forget('cq_' + d.id + '_' + k));
      S.work = null; S.page = 'manage';
      S.msg = out.length + ' questions save ho gaye' + (dropped ? ' (' + dropped + ' khaali question hata diye)' : '') + '. Ab "Open course" se AI Answer try karo.';
    });
  }
  function shrink(file) {   // photo -> JPEG of at most 1600 px (about 0.4 MB), so it is quick to send on a phone connection
    return new Promise((ok, no) => {
      const url = URL.createObjectURL(file), img = new g.Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        const r = Math.min(1, 1600 / Math.max(img.width, img.height, 1)), c = doc.createElement('canvas');
        c.width = Math.max(1, Math.round(img.width * r)); c.height = Math.max(1, Math.round(img.height * r));
        const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height);
        for (const q of [0.8, 0.6, 0.45]) { const data = c.toDataURL('image/jpeg', q).split(',')[1]; if (data.length < 2900000) return ok({ mime: 'image/jpeg', image: data }); }
        no(new Error('Photo bahut badi hai. Page ke paas se dobara photo lo.'));
      };
      img.onerror = () => { URL.revokeObjectURL(url); no(new Error('Ye photo khul nahi paayi. jpg ya png photo lo.')); };
      img.src = url;
    });
  }
  async function onFiles(files) {
    const d = cur(), w = S.work; if (!d || !w || S.busy) return;
    const list = [...files].filter(f => /^image\//.test(f.type)).slice(0, MAX_PHOTOS);
    if (!list.length) return say('Photo chuno (jpg ya png).', true);
    S.busy = true; S.err = ''; let added = 0, full = false;
    for (let i = 0; i < list.length; i++) {
      S.msg = 'Photo ' + (i + 1) + '/' + list.length + ' padh raha hoon… (10 se 30 second lag sakte hain)'; redraw(true);
      try {
        const p = await (hooks.shrink || shrink)(list[i]);
        const j = await g.api('/api/custom/extract', { ...p, cls: d.class, subject: d.subject, chapter: w.title, medium: d.medium, lang: d.lang || 'English' });
        const have = new Set(w.qs.map(q => q.text.trim().toLowerCase()));
        for (const q of j.questions || []) {
          if (have.has(String(q.text).trim().toLowerCase())) continue;
          if (w.qs.length >= MAX_Q) { full = true; break; }
          w.qs.push({ k: '', label: q.label || '', text: q.text, parts: q.parts || [], options: q.options || [], isNew: true }); added++;
        }
        if (added) w.dirty = true;
      } catch (e) { S.err = errText(e); break; }
    }
    S.busy = false;
    S.msg = added ? added + ' naye questions mile (neeche "Naya" likha hai). Check karo, galti ho to sudharo, phir Save dabao.' + (full ? ' (Limit ' + MAX_Q + ' questions poori ho gayi.)' : '') : (S.err ? '' : 'Is photo me koi question nahi mila. Sirf exercise ke questions wala hissa saaf dikhao.');
    redraw(true);
  }

  // ---- screens ----
  const rowBtn = (cc, attrs, badge, title, sub) => `<button class="row" data-cc="${cc}" ${attrs || ''}><span class="rbadge">${badge}</span><span class="rmain"><div class="rtitle">${esc(title)}</div>${sub ? `<div class="rsub">${esc(sub)}</div>` : ''}</span></button>`;
  const back = (cc, label, attrs) => `<button class="back" data-cc="${cc}" ${attrs || ''}>${typeof I !== 'undefined' ? I.back : '‹'}<span>${esc(label)}</span></button>`;
  const h1 = t => `<h1 style="font-size:26px;margin-top:10px">${esc(t)}</h1>`;
  const note = () => (S.err ? `<div class="err" role="alert">${esc(S.err)}</div>` : '') + (S.msg ? `<div class="mut" style="margin-top:10px" role="status">${esc(S.msg)}</div>` : '');
  const title = d => `${d.org} · Class ${d.class} · ${d.subject}`;
  const sub = d => `${d.medium} medium · ${(d.chapters || []).length} chapters · ${nQ(d)} questions`;

  function listHTML() {
    const card = (d, own) => `<div class="card"><div class="rtitle">${esc(title(d))}</div><div class="rsub">${esc(sub(d))}${own && d.shared ? ' · Shared' : ''}${own ? '' : ' · Sirf dekh sakte ho'}</div>
      <div class="ccrow"><button class="btn alt" data-cc="open" data-id="${d.id}">Open course</button>${own ? `<button class="btn alt" data-cc="manage" data-id="${d.id}">Edit / Share</button>` : `<button class="btn alt" data-cc="copy" data-id="${d.id}">Meri copy banao</button><button class="lnk" data-cc="unsave" data-id="${d.id}">Hatao</button>`}</div></div>`;
    return h1('My Courses') + `<p class="mut">Apna school, class, subject aur chapter banao. Chapter ke questions ki photo lo, AI questions padh leta hai. Phir har question ka AI Answer, translate aur diagram milta hai.</p>
      <button class="btn" data-cc="new">+ Add custom course</button>` + note()
      + (S.loading ? '<p class="mut">Load ho raha hai…</p>' : '')
      + (S.own.length ? `<h2 class="sec">Meri courses</h2>${S.own.map(d => card(d, true)).join('')}` : '')
      + (S.shared.length ? `<h2 class="sec">Mere saath share hue</h2>${S.shared.map(d => card(d, false)).join('')}` : '')
      + (S.gone.length ? `<h2 class="sec">Ab nahi mil rahe</h2>${S.gone.map(id => `<div class="card"><div class="mut">Ye share kiya hua course ab band ya delete ho gaya hai.</div><div class="ccrow"><button class="lnk" data-cc="unsave" data-id="${id}">List se hatao</button></div></div>`).join('')}` : '')
      + (!S.own.length && !S.shared.length && !S.loading ? '<p class="mut" style="margin-top:22px">Abhi koi custom course nahi hai. Upar "+ Add custom course" dabao.</p>' : '');
  }
  function formHTML() {
    const f = S.form, orgs = [...new Set(S.own.map(d => d.org))];
    const opt = (list, v) => list.map(x => `<option ${String(x) === String(v) ? 'selected' : ''}>${esc(x)}</option>`).join('');
    return back('list', 'My Courses') + h1('Add custom course') + `<div class="ccf">
      <label for="ccOrg">School ya Board ka naam</label><input id="ccOrg" list="ccOrgs" maxlength="60" autocomplete="off" placeholder="jaise Nashib Ali Academy, SEBA" value="${esc(f.org)}"><datalist id="ccOrgs">${orgs.map(o => `<option value="${esc(o)}">`).join('')}</datalist>
      <label for="ccMed">Medium</label><select id="ccMed">${opt(MEDIUMS, f.medium)}</select>
      <label for="ccCls">Class</label><select id="ccCls"><option value="">Class chuno</option>${Array.from({ length: 12 }, (_, i) => `<option value="${i + 1}" ${String(f.cls) === String(i + 1) ? 'selected' : ''}>Class ${i + 1}</option>`).join('')}</select>
      <label for="ccSub">Subject</label><input id="ccSub" maxlength="40" autocomplete="off" placeholder="jaise Science, Maths, Geography" value="${esc(f.subject)}">
      <label for="ccLang">Kitab ki language (questions kis language me hain)</label><select id="ccLang">${opt(LANGS, f.lang)}</select>
      <button class="btn" data-cc="create" ${S.busy ? 'disabled' : ''}>${S.busy ? 'Ban raha hai…' : 'Course banao'}</button></div>` + note();
  }
  function manageHTML() {
    const d = cur(); if (!d) return back('list', 'My Courses') + '<p class="mut">Course nahi mila.</p>';
    const url = link(d);
    return back('list', 'My Courses') + h1(d.subject) + `<div class="mut">${esc(d.org)} · Class ${d.class} · ${esc(d.medium)} medium</div>
      <div class="ccrow"><button class="btn" data-cc="open" data-id="${d.id}">Open course</button></div>` + note()
      + `<h2 class="sec">Chapters</h2>`
      + ((d.chapters || []).length ? d.chapters.map(ch => `<div class="card"><div class="rtitle">Chapter ${ch.no}: ${esc(ch.title)}</div><div class="rsub">${(ch.questions || []).length} questions</div>
          <div class="ccrow"><button class="btn alt" data-cc="chapter" data-no="${ch.no}">Questions / Photo</button><button class="lnk" data-cc="delch" data-no="${ch.no}">Hatao</button></div></div>`).join('') : '<p class="mut">Abhi koi chapter nahi. Neeche chapter ka naam likhkar jodo.</p>')
      + `<div class="ccf"><label for="ccNewCh">Naya chapter</label><input id="ccNewCh" maxlength="80" autocomplete="off" placeholder="jaise Integers" value="${esc(S.newCh)}"><button class="btn" data-cc="addch" ${S.busy ? 'disabled' : ''}>+ Chapter jodo</button></div>`
      + `<h2 class="sec">Share</h2><div class="card">` + (d.shared
        ? `<div class="mut">Sharing chalu hai. Link wale log ye course sirf dekh sakte hain ya apni copy bana sakte hain. Aapka course unse edit nahi hoga.</div>
           <input readonly class="ccl" value="${esc(url)}" aria-label="Share link" onclick="this.select()">
           <div class="ccrow"><button class="btn alt" data-cc="copylink">Link copy karo</button><a class="btn alt" style="text-decoration:none;display:inline-block" target="_blank" rel="noopener noreferrer" href="https://wa.me/?text=${encodeURIComponent('Orbit Tutorial par meri ' + d.subject + ' (Class ' + d.class + ') course dekho: ' + url)}">WhatsApp</a><button class="lnk" data-cc="shareoff">Sharing band karo</button></div>`
        : `<div class="mut">Abhi sirf aap ye course dekh sakte ho. Share karoge to link wala koi bhi student ise dekh sakta hai.</div><div class="ccrow"><button class="btn alt" data-cc="shareon" ${S.busy ? 'disabled' : ''}>Link se share karo</button></div>`)
      + `</div><div style="margin-top:26px"><button class="lnk" data-cc="delcourse" data-id="${d.id}">Ye poora course delete karo</button></div>`;
  }
  function chapterHTML() {
    const d = cur(), w = S.work; if (!d || !w) return back('list', 'My Courses') + '<p class="mut">Chapter nahi mila.</p>';
    const q = (x, i) => `<div class="ccq ${x.isNew ? 'isnew' : ''}">${x.isNew ? '<div class="rsub" style="margin:0 0 6px"><b>Naya</b>: AI ne padha hai, check karo</div>' : ''}
      <div class="ccrow" style="margin:0"><input class="ccsm" data-ccq="${i}" data-ccf="label" maxlength="12" placeholder="No." aria-label="Question number" value="${esc(x.label)}"><span class="rsub" style="flex:1">Question ${i + 1}</span><button class="lnk" data-cc="delq" data-i="${i}" aria-label="Question ${i + 1} hatao">Hatao</button></div>
      <textarea data-ccq="${i}" data-ccf="text" maxlength="700" rows="3" aria-label="Question ${i + 1}">${esc(x.text)}</textarea>
      <details ${(x.parts || []).length || (x.options || []).length ? 'open' : ''}><summary class="rsub">Parts (i, ii…) / Options (A, B…)</summary>
        <textarea data-ccq="${i}" data-ccf="parts" rows="2" placeholder="Parts: ek line me ek part" aria-label="Parts">${esc((x.parts || []).join('\n'))}</textarea>
        <textarea data-ccq="${i}" data-ccf="options" rows="2" placeholder="Options: ek line me ek option" aria-label="Options">${esc((x.options || []).join('\n'))}</textarea></details></div>`;
    return back('manage', 'Chapters', w.dirty ? 'data-dirty="1"' : '') + h1('Chapter ' + w.no + ': ' + w.title) + `<div class="mut">${esc(d.subject)} · Class ${d.class}</div>
      <p class="mut">Kitab ke questions wale page ki saaf photo lo (ek baar me 3 tak). AI questions padhega, aap check karke Save karo. Photo save nahi hoti, sirf padhi jaati hai.</p>
      <div class="ccrow"><input id="ccFile" type="file" accept="image/*" multiple hidden><button class="btn" data-cc="pick" ${S.busy ? 'disabled' : ''}>📷 Photo se questions jodo</button><button class="btn alt" data-cc="addq" ${S.busy ? 'disabled' : ''}>+ Khud likho</button></div>` + note()
      + (w.qs.length ? w.qs.map(q).join('') : '<p class="mut" style="margin-top:18px">Abhi koi question nahi. Photo lo ya khud likho.</p>')
      + `<div class="ccbar"><button class="btn" data-cc="saveq" ${S.busy || !w.dirty ? 'disabled' : ''}>${S.busy ? 'Ho raha hai…' : 'Save (' + w.qs.length + ' questions)'}</button></div>`;
  }
  function incomingHTML() {
    const d = S.incoming; if (!d) return listHTML();
    return h1('Course share hua hai') + `<div class="card"><div class="rtitle">${esc(title(d))}</div><div class="rsub">${esc(sub(d))}</div></div>
      <p class="mut">"Save" karoge to ye aapki My Courses list me aa jayega (sirf dekh sakte ho). Edit karna ho to "Meri copy banao" dabao.</p>
      <div class="ccrow"><button class="btn" data-cc="savein">Save karo</button><button class="btn alt" data-cc="copyin">Meri copy banao</button><button class="lnk" data-cc="cancelin">Abhi nahi</button></div>` + note();
  }
  function viewHTML() {
    injectCss();
    if (!S.uid) return h1('My Courses') + '<p class="mut">Pehle Google se log in karo.</p>';
    return S.page === 'new' ? formHTML() : S.page === 'manage' ? manageHTML() : S.page === 'chapter' ? chapterHTML() : S.page === 'incoming' ? incomingHTML() : listHTML();
  }
  // Home page: the way in.
  function homeHTML() {
    return `<h2 class="sec">Apna course</h2><div class="rows">${rowBtn('new', '', '+', 'Add custom course', 'Apna school, class, subject aur chapter banao. Photo se questions jodo.')}${(S.own.length || S.shared.length) ? rowBtn('list', '', '≡', 'My Courses', S.own.length + ' meri · ' + S.shared.length + ' share hue') : ''}</div>`;
  }
  // Small bar on the subject's chapter list (index page) of a custom course.
  function courseBar(c) {
    if (!c || !c.custom) return '';
    return c.own ? `<div class="chips"><button class="chip" data-cc="manage" data-id="${c.docId}">Edit / Share course</button></div>`
      : `<div class="chips"><span class="mut" style="align-self:center">Share hua course: sirf dekh sakte ho.</span><button class="chip" data-cc="copy" data-id="${c.docId}">Meri copy banao</button></div>`;
  }

  let cssDone = false;
  function injectCss() {
    if (cssDone) return; cssDone = true;
    const st = doc.createElement('style');
    st.textContent = `.ccf label{display:block;font-weight:600;margin:14px 0 4px}
.ccf input,.ccf select,.ccq textarea,.ccl{width:100%;font:inherit;color:var(--tx);background:var(--card);border:1px solid var(--ln);border-radius:12px;padding:10px 12px}
.ccf .btn{margin-top:18px}.ccl{margin-top:10px;font-size:14px}
.ccq{background:var(--card);border:1px solid var(--ln);border-radius:14px;padding:12px;margin:12px 0}
.ccq.isnew{border-color:var(--tx);border-width:2px}
.ccq textarea{margin-top:8px;resize:vertical;min-height:64px}.ccq details{margin-top:8px}.ccq summary{cursor:pointer}
.ccsm{width:76px!important;padding:6px 10px!important;font:inherit;color:var(--tx);background:var(--card);border:1px solid var(--ln);border-radius:10px}
.ccrow{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-top:10px}.ccrow .btn{margin-top:0}
.btn.alt{background:transparent;color:var(--tx);border:1px solid var(--ln)}
.ccbar{position:sticky;bottom:0;background:var(--bg);padding:10px 0 calc(10px + env(safe-area-inset-bottom,0px));margin-top:14px}.ccbar .btn{width:100%;margin-top:0}`;
    doc.head.appendChild(st);
  }

  // ---- events ----
  const FORM = { ccOrg: 'org', ccMed: 'medium', ccCls: 'cls', ccSub: 'subject', ccLang: 'lang' };
  function onField(e) {
    const t = e.target; if (!t) return;
    if (t.dataset && t.dataset.ccq !== undefined && S.work) {
      const q = S.work.qs[+t.dataset.ccq], f = t.dataset.ccf; if (!q) return;
      q[f] = (f === 'parts' || f === 'options') ? t.value.split('\n').map(x => x.trim()).filter(Boolean) : t.value;
      S.work.dirty = true;
      const b = doc.querySelector('[data-cc="saveq"]'); if (b && !S.busy) b.disabled = false;
    } else if (t.id && FORM[t.id]) S.form[FORM[t.id]] = t.value;
    else if (t.id === 'ccNewCh') S.newCh = t.value;
  }
  doc.addEventListener('input', onField);
  doc.addEventListener('change', e => {
    onField(e);
    if (e.target && e.target.id === 'ccFile') { const fl = [...e.target.files]; e.target.value = ''; onFiles(fl); }
  });
  doc.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('[data-cc]'); if (!b || b.disabled) return;
    const a = b.dataset.cc, id = b.dataset.id;
    const show = p => { S.page = p; S.err = ''; S.msg = ''; if (typeof VIEW !== 'undefined' && VIEW === 'custom') redraw(true); else g.go('custom'); };
    if (a === 'new') { if (S.page !== 'new') S.form = { ...S.form, subject: '' }; show('new'); }
    else if (a === 'list') { S.work = null; show('list'); }
    else if (a === 'create') create();
    else if (a === 'manage') { if (S.page === 'chapter' && S.work && S.work.dirty && !g.confirm('Aapne badlav save nahi kiye. Bina save kiye wapas jaana hai?')) return; S.work = null; if (id) S.cur = id; show('manage'); }
    else if (a === 'open') { const d = allDocs().find(x => x.id === id) || cur(); openCourse(d && courseOfDoc(d)); }
    else if (a === 'copy') copyCourse(allDocs().find(x => x.id === id));
    else if (a === 'unsave') removeSaved(id);
    else if (a === 'addch') addChapter();
    else if (a === 'delch') delChapter(+b.dataset.no);
    else if (a === 'delcourse') delCourse(id);
    else if (a === 'chapter') openChapter(+b.dataset.no);
    else if (a === 'pick') { const f = doc.getElementById('ccFile'); if (f) f.click(); }
    else if (a === 'addq') { if (S.work) { if (S.work.qs.length >= MAX_Q) return say('Limit ' + MAX_Q + ' questions.', true); S.work.qs.push({ k: '', label: '', text: '', parts: [], options: [], isNew: true }); S.work.dirty = true; redraw(true); } }
    else if (a === 'delq') { if (S.work) { S.work.qs.splice(+b.dataset.i, 1); S.work.dirty = true; redraw(true); } }
    else if (a === 'saveq') saveWork();
    else if (a === 'shareon') setShared(true);
    else if (a === 'shareoff') setShared(false);
    else if (a === 'copylink') { const d = cur(); if (d) copyText(link(d)); }
    else if (a === 'savein') saveIncoming();
    else if (a === 'copyin') copyCourse(S.incoming);
    else if (a === 'cancelin') { S.incoming = null; show('list'); }
  });

  g.CUSTOM = { hooks, viewHTML, homeHTML, courseBar, apply, start, stop, state: S, _t: { orgId, normLabel, toCourse } };
})(window);
