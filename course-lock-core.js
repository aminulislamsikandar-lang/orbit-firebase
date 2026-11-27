// Course lock (server side). A student chooses ONE course (School/Board + Class + Medium) on first login; it is saved in Firestore studentCourse/<uid>.
// These are the pure decisions, so they can be tested without a server. server.js reads the saved course and calls them on every AI request.

// AI routes that carry a question id or a course id. Free-text routes (Get Video, Bolo, Read, Talk) have no course in them.
const GATED = new Set(['/answer', '/answer/ready', '/answer/check', '/translate', '/qtranslate', '/lesson', '/rules', '/more', '/visual', '/image', '/video', '/recall/evaluate', '/topics/generate', '/ask', '/anime']);

// Every course the request points at. Both `course` and `id` are checked, so nobody can pass an allowed course next to another course's question id.
function courseIdsOf(body, { byId, isCourse }) {
  const b = body || {}, out = [];
  if (typeof b.course === 'string' && isCourse(b.course)) out.push(b.course);
  if (typeof b.id === 'string') { const h = byId(b.id); if (h && h.course) out.push(h.course.id); }
  return out;
}

// admin: the developer account is never locked. canRead: false when the server has no Firestore access (no service account), so it can not know the course.
function decide({ admin, canRead, lock, courseIds, custom, ids }) {
  if (admin || !canRead) return { ok: true };
  if (!lock) return { ok: false, status: 403, code: 'no_course', error: 'Pehle apna course chuno (School ya Board, Class, Medium).' };
  if (lock.kid) return { ok: false, status: 403, code: 'kid_mode', error: 'Kid mode mein sirf Bolo chalta hai.' };
  if (lock.own) return (courseIds || []).length ? { ok: false, status: 403, code: 'wrong_course', error: 'Tumne apne khud ke courses chune hain, isliye textbook ke courses nahi khul sakte.' } : { ok: true };
  if (custom != null) return { ok: false, status: 403, code: 'wrong_course', error: 'Ye feature tumhare course mein nahi hai.' };
  if ((courseIds || []).some(id => !(ids || []).includes(id))) return { ok: false, status: 403, code: 'wrong_course', error: 'Ye sawaal tumhare course ka nahi hai.' };
  return { ok: true };
}

// The student's course lock, read from Firestore through a small cache. If Firestore fails, the last known lock (up to staleMs old) is used, so a
// hiccup never opens the gate; with nothing to fall back on, the error is thrown and the caller answers 503 (closed).
// readDoc(uid) -> the lock object or null ("no course yet", never cached) and may throw.
function makeLockReader({ readDoc, now = Date.now, freshMs = 600000, staleMs = 24 * 3600000, maxSize = 5000, warn = () => {} } = {}) {
  const cache = new Map();   // uid -> { lock, at }
  let warnedAt = 0;
  async function get(uid) {
    const hit = cache.get(uid);
    if (hit && now() - hit.at < freshMs) return hit.lock;
    try {
      const lock = await readDoc(uid);
      if (!lock) return null;
      cache.set(uid, { lock, at: now() });
      return lock;
    } catch (e) {
      if (hit && now() - hit.at < staleMs) {
        if (now() - warnedAt > 600000) { warnedAt = now(); warn('Firestore read failed, using the last known lock: ' + (e && e.message)); }
        return hit.lock;
      }
      throw e;
    }
  }
  const forget = uid => cache.delete(uid);
  const peek = uid => cache.get(uid);
  const restore = (uid, entry) => { if (entry) cache.set(uid, entry); };
  const prune = () => { if (cache.size > maxSize) cache.clear(); };
  return { get, forget, peek, restore, prune, size: () => cache.size };
}

module.exports = { GATED, courseIdsOf, decide, makeLockReader };
