// Course lock: shared catalog, server-side decisions, Firestore rules and the app wiring. Run: node tests/course-lock.test.js
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8').replace(/^\uFEFF/, '');
const CAT = require('../public/catalog.js'), CORE = require('../course-lock-core.js'), { courses } = require('../questions.js');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL ' + m); } };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), m + ' (got ' + JSON.stringify(a) + ')');

// 1. Catalog is consistent with the real courses
for (const org of Object.keys(CAT.content)) for (const cls of Object.keys(CAT.content[org])) for (const [id] of CAT.content[org][cls]) {
  const c = courses.find(x => x.id === id);
  ok(!!c, org + ' ' + cls + ': course ' + id + ' exists');
  if (c) ok(String(c.class) === String(cls), id + ' is class ' + c.class + ' but listed under class ' + cls);
}
ok(Object.keys(CAT.content).every(o => CAT.orgIds().includes(o)), 'every org with content is listed in groups');
ok(Object.keys(CAT.classes).every(o => CAT.orgIds().includes(o)), 'every org with classes is listed in groups');

// 2. validLock
ok(CAT.validLock({ org: 'seba', cls: 10, med: 'Assamese' }), 'valid lock');
ok(!CAT.validLock({ org: 'seba', cls: 6, med: 'Assamese' }), 'class not offered by that org');
ok(!CAT.validLock({ org: 'nope', cls: 10, med: 'English' }), 'unknown org');
ok(!CAT.validLock({ org: 'seba', cls: '10', med: 'English' }), 'class must be a number');
ok(!CAT.validLock({ org: 'seba', cls: 10, med: 'Hindi' }), 'unknown medium');
ok(!CAT.validLock(null) && !CAT.validLock({}), 'empty lock');
ok(!CAT.validLock({ org: '__proto__', cls: 10, med: 'English' }) && !CAT.validLock({ org: 'constructor', cls: 10, med: 'English' }), 'prototype names are not orgs');

// 3. idsFor
eq(CAT.idsFor({ org: 'seba', cls: 10, med: 'Assamese' }, courses).sort(), ['c10-maths', 'c10-science-as', 'c10-social'], 'SEBA 10 Assamese');
eq(CAT.idsFor({ org: 'seba', cls: 10, med: 'English' }, courses), ['c10-science'], 'SEBA 10 English');
eq(CAT.idsFor({ org: 'halimon', cls: 8, med: 'Assamese' }, courses), ['c8-english'], 'Halimon 8 Assamese');
eq(CAT.idsFor({ org: 'halimon', cls: 8, med: 'English' }, courses), [], 'Halimon 8 English has nothing yet');
eq(CAT.idsFor({ org: 'cbse', cls: 10, med: 'English' }, courses), [], 'CBSE has no content yet');
eq(CAT.idsFor({ org: 'nashib', cls: 6, med: 'English' }, courses).length, 8, 'Nashib Ali class 6 English has 8 subjects');
eq(CAT.idsFor(null, courses), [], 'no lock, no ids');

// 4. Server decisions
const ids = CAT.idsFor({ org: 'seba', cls: 10, med: 'Assamese' }, courses);
const lock = { org: 'seba', cls: 10, med: 'Assamese' };
const D = o => CORE.decide(Object.assign({ admin: false, canRead: true, lock, courseIds: [], custom: undefined, ids }, o));
ok(D({ courseIds: ['c10-maths'] }).ok, 'own course is allowed');
ok(D({ courseIds: ['c6-maths'] }).code === 'wrong_course', 'other course is refused');
ok(D({ courseIds: ['c10-maths', 'c6-maths'] }).code === 'wrong_course', 'one allowed + one other is refused');
ok(D({ lock: null, ids: [] }).code === 'no_course', 'no course chosen is refused');
ok(D({ custom: {} }).code === 'wrong_course', 'custom course is refused when locked');
ok(D({ courseIds: ['c6-maths'], admin: true }).ok, 'admin is never locked');
ok(D({ courseIds: ['c6-maths'], canRead: false, lock: null }).ok, 'no Firestore access: check skipped');
ok(D({ courseIds: ['c6-maths'] }).status === 403, 'refusals are 403');

// 5. courseIdsOf looks at both course and id
const byId = id => (id === 'c6-maths-q1' ? { course: { id: 'c6-maths' } } : id === 'm10c1-q1' ? { course: { id: 'c10-maths' } } : null);
const isCourse = id => courses.some(c => c.id === id);
eq(CORE.courseIdsOf({ course: 'c10-maths', id: 'c6-maths-q1' }, { byId, isCourse }), ['c10-maths', 'c6-maths'], 'course + id both collected (no bypass)');
eq(CORE.courseIdsOf({ id: 'm10c1-q1' }, { byId, isCourse }), ['c10-maths'], 'id only');
eq(CORE.courseIdsOf({ course: 'junk' }, { byId, isCourse }), [], 'unknown course string ignored');
eq(CORE.courseIdsOf(null, { byId, isCourse }), [], 'no body');
ok(['/answer', '/lesson', '/rules', '/more', '/video', '/recall/evaluate'].every(p => CORE.GATED.has(p)), 'main AI routes are gated');
ok(!CORE.GATED.has('/tts') && !CORE.GATED.has('/ping'), 'free-text and utility routes are not gated');

// 5b. "Own courses" lock: my school or college is not in the list
ok(CAT.validLock({ own: true }), 'own lock is valid');
ok(CAT.isOwn({ own: true }) && !CAT.isOwn({ org: 'seba', cls: 10, med: 'English' }) && !CAT.isOwn({ own: 'yes' }), 'isOwn');
ok(!CAT.validLock({ own: false }), 'own: false is not a lock');
eq(CAT.idsFor({ own: true }, courses), [], 'own lock has no catalog courses');
ok(/apne courses/i.test(CAT.labelOf({ own: true })), 'own lock label');
const own = { org: undefined, own: true };
const DO = o => CORE.decide(Object.assign({ admin: false, canRead: true, lock: { own: true }, courseIds: [], custom: undefined, ids: [] }, o));
ok(DO({}).ok, 'own lock: no course id = allowed');
ok(DO({ custom: {} }).ok, 'own lock: custom course is allowed');
ok(DO({ courseIds: ['c10-maths'] }).code === 'wrong_course', 'own lock: a textbook course is refused');

// 6. Firestore rules list the same orgs as the catalog
const rules = read('firestore.rules');
const m = /match \/studentCourse\/\{uid\}[\s\S]*?request\.resource\.data\.org in \[([^\]]*)\]/.exec(rules);
ok(!!m, 'firestore.rules has a studentCourse rule');
if (m) eq(m[1].split(',').map(x => x.trim().replace(/'/g, '')).sort(), CAT.orgIds().sort(), 'rules org list = catalog orgs');
ok(/match \/studentCourse\/\{uid\}[\s\S]*?allow update: if isAdmin\(\);/.test(rules), 'only the admin can change a course');
ok(/match \/studentCourse\/\{uid\}[\s\S]*?allow delete: if isAdmin\(\) \|\| \(request\.auth != null && request\.auth\.uid == uid\);/.test(rules), 'the admin or the student themself can delete the course lock');
ok(/keys\(\)\.hasOnly\(\['own', 'at'\]\)[\s\S]*?data\.own == true/.test(rules), 'rules allow the own-courses lock (own: true, at)');

// 7. App wiring
const html = read('public/index.html'), srv = read('server.js'), sw = read('public/sw.js');
ok(/<script src="\/catalog\.js"><\/script>/.test(html), 'index.html loads /catalog.js');
ok(!/const CATALOG=\{/.test(html), 'index.html no longer has its own copy of the catalog');
ok(html.indexOf('/catalog.js') < html.indexOf('const CATALOG='), 'catalog.js loads before the main script');
ok(/'\/catalog\.js'/.test(sw), 'service worker caches /catalog.js');
ok(/COURSELOCK\.decide/.test(srv) && /studentCourse/.test(srv), 'server.js checks the course lock');
ok(srv.indexOf('COURSELOCK.decide') > srv.indexOf('verifyIdToken'), 'course check runs after login check');
ok(/window\.CLOUD\.course/.test(read('public/cloud.js')), 'cloud.js has course get/set');

console.log(pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
