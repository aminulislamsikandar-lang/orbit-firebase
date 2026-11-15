// public/aireview.js - admin approval for AI "Kahani" and "Example" (Task 40). The AI text is a DRAFT until the admin approves it.
//   Students: pressing Kahani / Example shows the APPROVED text saved in Firestore `aicontent` (no AI call). Nothing approved yet -> a kind message.
//   Admin (admin mode ON, see qvideo.js): the same press asks the AI for a draft, shows it with three buttons: Approve (students see it),
//             Pending save (saved, students do not see it), Hatao (reject: delete the saved copy). Pending ones come back when the admin opens the same question.
// Own (custom) questions are not gated: they are private to the student. The real locks are firestore.rules (students read only approved) and
// server.js (/api/more answers story/example only to the admin or for the student's own question).
(function () {
  'use strict';
  const g = window;
  const GATED = ['story', 'example'];
  const LIB = {};   // docId -> { status, text } as saved in Firestore, or null when nothing is saved
  const CUR = {};   // docId -> the text on screen (what Approve would publish)
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const isAdmin = () => !!(g.QVideo && g.QVideo.active && g.QVideo.active());
  const cloud = () => (g.CLOUD && g.CLOUD.aicontent) || null;
  const redraw = () => { if (typeof g.draw === 'function') g.draw(); };
  const safe = id => String(id || '').toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 100);
  const docId = (id, k) => safe(id) + '__' + k;
  const NAME = { story: 'kahani', example: 'example' };

  async function fetchDoc(id, k) {
    const c = cloud(); if (!c) return null;
    try { const d = await c.get(docId(id, k)); LIB[docId(id, k)] = d && typeof d.text === 'string' ? { status: d.status, text: d.text } : null; return LIB[docId(id, k)]; }
    catch (e) { return null; }   // a student asking for a pending copy is refused by the rules: same as "nothing approved yet"
  }

  // gen() asks the AI (admin only, and only when no approved copy exists unless force). Returns { text }.
  async function load(id, k, gen, force) {
    const dId = docId(id, k), d = await fetchDoc(id, k);
    if (!isAdmin()) {                                    // student: only an approved copy (the rules hide pending ones anyway)
      if (d && d.status === 'approved' && d.text) { CUR[dId] = d.text; return { text: d.text }; }
      throw new Error('Ye ' + (NAME[k] || 'content') + ' abhi taiyar nahi hai. Jaldi aayega.');
    }
    if (d && d.text && !force) { CUR[dId] = d.text; return { text: d.text }; }   // admin: the saved copy (approved or pending) first
    const j = await gen(); CUR[dId] = j.text; return j;                          // otherwise a fresh AI draft
  }

  // Strip shown under the text in admin mode (called while the answer is drawn). '' for students and for other kinds.
  function adminBar(id, k, text) {
    if (!isAdmin() || GATED.indexOf(k) < 0 || !text) return '';
    const dId = docId(id, k), lib = LIB[dId];
    CUR[dId] = text;
    const same = lib && lib.text === text;
    const state = same ? (lib.status === 'approved' ? 'Approved: bachhon ko dikhta hai' : 'Pending: bachhon ko nahi dikhta') : lib ? 'Naya draft (saved copy alag hai)' : 'Draft: abhi save nahi hua, bachhon ko nahi dikhta';
    const btn = (a, label) => `<button class="chip" data-air="${a}" data-id="${esc(id)}" data-k="${esc(k)}" style="cursor:pointer">${label}</button>`;
    return `<div class="mut" role="status" style="margin:8px 0;font-size:13px"><b>Admin:</b> ${esc(state)}<br>${btn('pub', 'Approve karo')} ${btn('pend', 'Pending save')} ${lib ? btn('del', 'Hatao (reject)') : ''}</div>`;
  }

  async function act(a, id, k) {
    const c = cloud(), dId = docId(id, k), text = CUR[dId];
    if (!c || !isAdmin()) return;
    try {
      if (a === 'del') { await c.del(dId); LIB[dId] = null; }
      else {
        if (!text || text.length < 20 || text.length > 4000) { g.alert('Text 20 se 4000 akshar ke beech hona chahiye.'); return; }
        await c.set({ qid: safe(id), kind: k, status: a === 'pub' ? 'approved' : 'pending', text, at: Date.now() });
        LIB[dId] = { status: a === 'pub' ? 'approved' : 'pending', text };
      }
    } catch (e) { g.alert(e && e.code === 'permission-denied' ? 'Save nahi hua: admin account ya firestore.rules check karo.' : 'Nahi hua: ' + ((e && e.message) || '')); return; }
    redraw();
  }
  g.document.addEventListener('click', e => {
    const b = e.target && e.target.closest ? e.target.closest('[data-air]') : null;
    if (b) act(b.dataset.air, b.dataset.id, b.dataset.k);
  });

  g.AIREVIEW = { gated: k => GATED.indexOf(k) >= 0, docId, load, adminBar, _lib: LIB };
})();
