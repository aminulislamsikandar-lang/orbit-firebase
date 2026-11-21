// ready-core.js - "Ready answer": the AI answer of a textbook question is kept in Firestore readyAnswers/<question id>,
// so the next student sees it at once (3-dot menu > Ready answer) without calling the AI again.
// Only the server (Admin SDK) reads and writes it. Nothing about the student who asked is stored: only { qid, text, sig, at }.
// `sig` is a short fingerprint of the question text; if the question is edited later, the old answer is no longer shown.
// Without a service account (db = null) the answers are kept in memory only, until Render restarts.
const COLL = 'readyAnswers', MAX_TEXT = 8000, MAX_IDS = 150, MAX_MEM = 4000, NONE_MS = 60000;

const okId = id => typeof id === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,99}$/.test(id);
const cleanText = t => (typeof t === 'string' ? t.replace(/\r\n/g, '\n').trim() : '').slice(0, MAX_TEXT);
const toDoc = (id, text, sig, now) => ({ qid: id, text: cleanText(text), sig: String(sig || ''), at: now });
// A stored doc is usable only when it has text and (if the question has a fingerprint) the same fingerprint.
const usable = (d, sig) => !!d && typeof d.text === 'string' && d.text.length > 0 && (!sig || !d.sig || d.sig === sig);

function createStore({ db = null, now = Date.now, log = () => {} } = {}) {
  const mem = new Map();    // id -> { text, sig }
  const none = new Map();   // id -> time until which "no answer in Firestore" is trusted
  const remember = (id, text, sig) => { if (mem.size >= MAX_MEM) mem.clear(); mem.set(id, { text, sig: String(sig || '') }); none.delete(id); };
  const inMem = (id, sig) => { const m = mem.get(id); return m && (!sig || !m.sig || m.sig === sig) ? m.text : ''; };
  const skip = id => (none.get(id) || 0) > now();

  async function get(id, sig) {
    if (!okId(id)) return '';
    const m = inMem(id, sig); if (m) return m;
    if (!db || skip(id)) return '';
    try {
      const snap = await db.collection(COLL).doc(id).get();
      const d = snap.exists ? snap.data() : null;
      if (usable(d, sig)) { remember(id, d.text, d.sig); return d.text; }
    } catch (e) { log('[ready] read failed: ' + e.message); return ''; }
    none.set(id, now() + NONE_MS);
    return '';
  }

  // items: [{ id, sig }]. Returns the ids that have a ready answer. One Firestore call for all that are not in memory.
  async function list(items) {
    const seen = new Set(), want = [];
    for (const it of Array.isArray(items) ? items : []) {
      if (!it || !okId(it.id) || seen.has(it.id)) continue;
      seen.add(it.id); want.push(it);
      if (want.length >= MAX_IDS) break;
    }
    const ready = new Set(), ask = [];
    for (const it of want) { if (inMem(it.id, it.sig)) ready.add(it.id); else if (db && !skip(it.id)) ask.push(it); }
    if (ask.length) {
      try {
        const snaps = await db.getAll(...ask.map(it => db.collection(COLL).doc(it.id)));
        const byId = new Map(ask.map(it => [it.id, it]));
        for (const s of snaps) {
          const it = byId.get(s.id), d = s.exists ? s.data() : null;
          if (it && usable(d, it.sig)) { remember(it.id, d.text, d.sig); ready.add(it.id); }
          else if (it) none.set(it.id, now() + NONE_MS);
        }
      } catch (e) { log('[ready] list failed: ' + e.message); }
    }
    return want.filter(it => ready.has(it.id)).map(it => it.id);
  }

  // Keeps the newest answer (a student who presses "Dobara banao" replaces it for everybody). Never throws.
  async function save(id, text, sig) {
    if (!okId(id)) return false;
    const doc = toDoc(id, text, sig, now());
    if (!doc.text) return false;
    remember(id, doc.text, doc.sig);
    if (!db) return true;
    try { await db.collection(COLL).doc(id).set(doc); return true; }
    catch (e) { log('[ready] save failed: ' + e.message); return false; }
  }

  return { get, list, save, _mem: mem, _none: none };
}

module.exports = { COLL, MAX_TEXT, MAX_IDS, okId, cleanText, toDoc, usable, createStore };
