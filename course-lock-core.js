// Course lock (server side). A student chooses ONE course (School/Board + Class + Medium) on first login; it is saved in Firestore studentCourse/<uid>.
// These are the pure decisions, so they can be tested without a server. server.js reads the saved course and calls them on every AI request.

// AI routes that carry a question id or a course id. Free-text routes (Get Video, Bolo, Read, Talk) have no course in them.
const GATED = new Set(['/answer', '/answer/ready', '/answer/check', '/translate', '/qtranslate', '/lesson', '/rules', '/more', '/visual', '/image', '/video', '/recall/evaluate', '/topics/generate']);

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

module.exports = { GATED, courseIdsOf, decide };
