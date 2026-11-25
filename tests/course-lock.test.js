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

// ---- Kid mode: the account lock { kid: true }, and the parent link (kidLinks) ----
ok(CAT.validLock({ kid: true }) && CAT.isKid({ kid: true }) && !CAT.isKid({ own: true }) && !CAT.validLock({ kid: false }), 'kid lock is valid only as { kid: true }');
eq(CAT.idsFor({ kid: true }, courses), [], 'Kid mode has no textbook course');
ok(CAT.labelOf({ kid: true }) === 'Kid mode', 'Kid mode label');
const kd = CORE.decide({ admin: false, canRead: true, lock: { kid: true }, courseIds: [], custom: undefined, ids: [] });
ok(!kd.ok && kd.status === 403 && kd.code === 'kid_mode', 'AI routes that need a course are closed in Kid mode');
ok(CORE.decide({ admin: true, canRead: true, lock: { kid: true }, courseIds: [], ids: [] }).ok, 'the admin is never locked, also in Kid mode');
ok(/d\.kid === true \? \{ kid: true \}/.test(read('server.js')), 'server reads the kid lock');
const rl = read('firestore.rules');
ok(/hasOnly\(\['kid', 'at'\]\)[\s\S]*?request\.resource\.data\.kid == true/.test(rl), 'a student can create the kid lock: only kid + at');
ok(/match \/kidLinks\/\{code\}[\s\S]*?code\.matches\('\^\[A-HJ-NP-Z2-9\]\{8\}\$'\)/.test(rl), 'kid link code is 8 easy-to-read characters');
ok(/match \/kidLinks\/\{code\}[\s\S]*?allow list: if request\.auth != null && resource\.data\.kidUid == request\.auth\.uid;/.test(rl), 'a link can be listed only by its child (a code can be looked up, never browsed)');
ok(/match \/state\/sum \{[\s\S]*?allow read: if kidOwner\(code\) \|\| kidParent\(code\) \|\| mentorOk\(code\);[\s\S]*?allow create, update: if kidOwner\(code\)/.test(rl), 'only the child writes the summary; only the child, joined parents and approved mentors read it');
ok(/function mentorOk\(code\)[^\n]*status == 'approved'/.test(rl), 'a mentor counts only when approved');
ok(/match \/mentors\/\{uid\}[\s\S]*?allow create: if request\.auth != null && request\.auth\.uid == uid[\s\S]*?request\.resource\.data\.status == 'pending'/.test(rl), 'a mentor can only ask (pending), for themselves');
ok(/match \/mentors\/\{uid\}[\s\S]*?allow update: if \(kidParent\(code\)[\s\S]*?hasOnly\(\['status', 'listenUntil'\]\)[\s\S]*?status == 'approved'[\s\S]*?listenUntil <= request\.time\.toMillis\(\) \+ 3660000/.test(rl), 'only a parent approves or opens the listening window, and never more than about 1 hour ahead');
ok(/match \/mentors\/\{uid\}[\s\S]*?\|\| \(kidOwner\(code\)[\s\S]*?hasOnly\(\['listenUntil'\]\)[\s\S]*?listenUntil == 0\)/.test(rl), 'the child can only close the window (0), never open or extend it');
ok(/match \/mentors\/\{uid\}[\s\S]*?\|\| \(kidOwner\(code\)\s*&& request\.resource\.data\.diff\(resource\.data\)\.affectedKeys\(\)\.hasOnly\(\['status'\]\)\s*&& request\.resource\.data\.status == 'approved'\);/.test(rl), 'the child phone can approve a pending mentor (status only, to approved) - a parent joining is optional');
ok(/function mentorListens\(code\)[^\n]*status == 'approved'[^\n]*listenUntil', 0\) > request\.time\.toMillis\(\)/.test(rl), 'a mentor listens only while approved and inside the window');
ok(/match \/reviews\/\{rid\}[\s\S]*?allow read: if kidParent\(code\) \|\| mentorOk\(code\);[\s\S]*?allow create, update: if mentorListens\(code\)[\s\S]*?marks\.matches\('\^\[01-\]\{1,60\}\$'\)[\s\S]*?by == request\.auth\.uid/.test(rl), 'marks: only a listening mentor writes them (1 / 0 / - per letter, no audio, no text)');
ok(/match \/state\/rep \{[\s\S]*?allow read: if kidOwner\(code\) \|\| mentorOk\(code\);[\s\S]*?allow create, update: if kidOwner\(code\)[\s\S]*?hasOnly\(\['days', 'weak', 'at'\]\)[\s\S]*?days\.size\(\) <= 7[\s\S]*?weak\.size\(\) <= 8/.test(rl), 'week chart data: only the child writes it (7 days, 8 topics at most); only the child and approved mentors read it (not even a parent screen)');
ok(/match \/state\/pres \{[\s\S]*?allow read: if kidOwner\(code\) \|\| kidParent\(code\) \|\| mentorOk\(code\);[\s\S]*?allow create, update: if kidOwner\(code\)/.test(rl), 'only the child writes Online/Offline; parents and approved mentors read it');
ok(/match \/state\/pres \{[\s\S]*?hasOnly\(\['on', 'at', 'day', 'sec', 'act'\]\)[\s\S]*?act\.size\(\) <= 40/.test(rl), 'Online/Offline record: only on, at, day, online seconds and a short topic label');
ok(/match \/state\/wa \{[\s\S]*?allow read: if kidParent\(code\) \|\| mentorOk\(code\);[\s\S]*?allow create, update: if kidParent\(code\)[\s\S]*?num\.matches\('\^\[0-9\]\{10,15\}\$'\)/.test(rl), 'the WhatsApp number: only a parent writes it; only parents and approved mentors read it');
ok(/match \/state\/set \{[\s\S]*?allow create, update: if kidParent\(code\)[\s\S]*?limit % 5 == 0/.test(rl), 'only a joined parent writes the limit, in steps of 5');
ok(/match \/parents\/\{uid\}[\s\S]*?allow create: if request\.auth != null && request\.auth\.uid == uid[\s\S]*?exists\(\/databases\/\$\(database\)\/documents\/kidLinks\/\$\(code\)\)/.test(rl), 'a parent can join only as themself and only to a link that exists');
ok(/window\.CLOUD\.kids/.test(read('public/cloud.js')), 'cloud.js has the kids layer');
ok(read('public/sw.js').includes("'/kidlink.js'"), 'service worker caches kidlink.js');
ok(/src="\/kidlink\.js"/.test(read('public/index.html')), 'index.html loads kidlink.js');
const KL = {}; global.window = global; global.document = { addEventListener() {}, getElementById() { return null; } }; global.CLOUD = {}; require('../public/kidlink.js');
const K = global.KIDLINK;
ok(K.normCode(' abcd-efgh9 ') === 'ABCDEFGH' && K.goodCode('ABCD2345') && !K.goodCode('ABCD234') && !K.goodCode('ABCD234O') && !K.goodCode('ABCD2341'), 'codes: spaces, dash and case are forgiven; 8 characters, no I/O/0/1');
ok(K.fmt('ABCD2345') === 'ABCD-2345', 'codes are shown as XXXX-XXXX');

console.log(pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
