// The real server.js with a fake Firebase (login token = the uid, Firestore = a small in-memory map): the course lock on the AI routes.
// Run: node tests/course-lock-server.test.js
const path = require('path');
const ROOT = path.join(__dirname, '..');
const QUIZ = require(path.join(ROOT, 'questions.js'));
const firstQ = id => QUIZ.courses.find(c => c.id === id).chapters.flatMap(ch => (ch.sections || []).flatMap(s => s.questions))[0].id;
const Q10 = firstQ('c10-maths'), Q6 = firstQ('c6-maths');

const docs = new Map([
  ['studentCourse/seba10', { org: 'seba', cls: 10, med: 'Assamese' }],
  ['studentCourse/badlock', { org: 'seba', cls: 6, med: 'Assamese' }],
  ['studentCourse/owner', { own: true }]
]);
const fakeDb = { collection: name => ({ doc: id => ({ get: async () => { const d = docs.get(name + '/' + id); return { exists: !!d, data: () => d }; } }) }) };
const fakeAdmin = {
  apps: [], initializeApp() { this.apps.push({}); }, credential: { cert: x => x },
  auth: () => ({ verifyIdToken: async t => { if (!t) throw new Error('no token'); return { uid: t, email: t + '@example.com', email_verified: true }; } }),
  firestore: () => fakeDb
};
require.cache[require.resolve('firebase-admin')] = { id: 'firebase-admin', filename: 'firebase-admin', loaded: true, exports: fakeAdmin };
process.env.FIREBASE_SERVICE_ACCOUNT = JSON.stringify({ client_email: 'a@b.c', private_key: 'k' });
process.env.PORT = '3918'; process.env.MV_ADMIN_EMAILS = 'boss@example.com'; process.env.ALLOWED_ORIGINS = '';
require(path.join(ROOT, 'server.js'));

let pass = 0, fail = 0;
const t = (n, ok, extra) => { if (ok) pass++; else { fail++; console.log('FAIL  ' + n + (extra ? '  ' + extra : '')); } };
const post = async (route, uid, body) => {
  const r = await fetch('http://127.0.0.1:3918/api' + route, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + uid }, body: JSON.stringify(body) });
  let j = {}; try { j = await r.json(); } catch (e) {}
  return { status: r.status, code: j.code, error: j.error };
};
const blocked = r => r.status === 403 && (r.code === 'no_course' || r.code === 'wrong_course');

(async () => {
  await new Promise(r => setTimeout(r, 400));
  let r = await post('/answer', 'newuser', { id: Q10 });
  t('no course chosen yet: AI answer refused with code no_course', r.status === 403 && r.code === 'no_course', JSON.stringify(r));
  r = await post('/lesson', 'newuser', { course: 'c10-maths', ch: 1 });
  t('no course chosen yet: lesson refused too', r.code === 'no_course', JSON.stringify(r));
  r = await post('/answer', 'seba10', { id: Q6 });
  t('another course question is refused with code wrong_course', r.status === 403 && r.code === 'wrong_course', JSON.stringify(r));
  r = await post('/answer', 'seba10', { id: Q10 });
  t('own course question passes the course check', !blocked(r), JSON.stringify(r));
  r = await post('/answer', 'seba10', { course: 'c10-maths', id: Q6 });
  t('allowed course next to another course question is still refused (no bypass)', r.code === 'wrong_course', JSON.stringify(r));
  r = await post('/lesson', 'seba10', { course: 'c6-maths', ch: 1 });
  t('lesson of another course is refused', r.code === 'wrong_course', JSON.stringify(r));
  r = await post('/lesson', 'seba10', { course: 'c10-maths', ch: 1 });
  t('lesson of own course passes the course check', !blocked(r), JSON.stringify(r));
  r = await post('/recall/evaluate', 'seba10', { course: 'c6-maths', ch: 1, type: 'topic' });
  t('Recall AI for another course is refused', r.code === 'wrong_course', JSON.stringify(r));
  r = await post('/recall/evaluate', 'seba10', { custom: { title: 'x' }, type: 'topic' });
  t('a custom course is refused when a course is locked', r.code === 'wrong_course', JSON.stringify(r));
  r = await post('/answer', 'badlock', { id: Q10 });
  t('a stored lock that is not valid counts as no course', r.code === 'no_course', JSON.stringify(r));
  r = await post('/answer', 'boss', { id: Q6 });
  t('the admin account is never locked', !blocked(r), JSON.stringify(r));
  r = await post('/tts', 'newuser', { text: 'hello' });
  t('routes without a course are not gated', !blocked(r), JSON.stringify(r));
  r = await post('/answer', 'owner', { id: Q10 });
  t('own-courses student: a textbook course is refused', r.code === 'wrong_course', JSON.stringify(r));
  r = await post('/recall/evaluate', 'owner', { custom: { title: 'x' }, type: 'topic' });
  t('own-courses student: a custom course is allowed', !blocked(r), JSON.stringify(r));
  docs.set('studentCourse/newuser', { org: 'seba', cls: 10, med: 'Assamese' });
  r = await post('/answer', 'newuser', { id: Q10 });
  t('choosing a course works at once (no stale "no course" cache)', !blocked(r), JSON.stringify(r));
  // The student leaves the own-courses choice and picks a textbook course: /course/reset drops the cached own lock at once.
  docs.set('studentCourse/owner', { org: 'seba', cls: 10, med: 'Assamese' });
  r = await post('/answer', 'owner', { id: Q10 });
  t('stale own lock is re-read from Firestore: the new textbook course works at once', !blocked(r), JSON.stringify(r));
  r = await post('/course/reset', 'owner', {});
  t('/course/reset answers ok', r.status === 200, JSON.stringify(r));
  r = await post('/answer', 'owner', { id: Q10 });
  t('after /course/reset the new course works at once', !blocked(r), JSON.stringify(r));
  r = await post('/course/reset', '', {});
  t('/course/reset needs login', r.status === 401, JSON.stringify(r));
  console.log(pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('FAIL  crashed: ' + e.stack); process.exit(1); });
