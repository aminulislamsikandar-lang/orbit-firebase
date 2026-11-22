// Task 48: class code + homework. Rules / wiring checks (text) and the My Class screen in a fake browser (jsdom, skipped without jsdom).
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..'), read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
let pass = 0, fail = 0;
const t = (name, ok, extra) => { if (ok) pass++; else { fail++; console.log('FAIL  ' + name + (extra ? '  ' + extra : '')); } };

const R = read('firestore.rules'), cs = R.slice(R.indexOf('match /classes/{code}'), R.indexOf('// Subscriptions are readable'));
t('rules: a class is read by code (get), only the teacher lists, nobody edits it', /allow get: if request\.auth != null;/.test(cs) && /allow list: if request\.auth != null && resource\.data\.teacherId == request\.auth\.uid/.test(cs) && /allow update: if false;/.test(cs));
t('rules: class create needs the right code shape, own teacherId and only the allowed fields', /\[A-HJ-NP-Z2-9\]\{6\}/.test(cs) && /hasOnly\(\['code', 'school', 'class', 'teacherId', 'createdAt'\]\)/.test(cs) && /teacherId == request\.auth\.uid/.test(cs));
t('rules: a member document is created only by that student, with name and joinedAt only', /match \/members\/\{uid\}/.test(cs) && /request\.auth\.uid == uid\s*&&\s*exists\(/.test(cs) && /hasOnly\(\['uid', 'name', 'joinedAt'\]\)/.test(cs));
t('rules: only the teacher lists members; a student reads only their own member document', /allow list: if clsTeacher\(code\);/.test(cs) && /allow get: if request\.auth != null && \(request\.auth\.uid == uid \|\| clsTeacher\(code\)\)/.test(cs));
t('rules: homework is read by members and the teacher, written only by the teacher with a checked shape', /allow read: if clsMember\(code\) \|\| clsTeacher\(code\)/.test(cs) && /allow create, update: if clsTeacher\(code\) && validHomework/.test(cs) && /\^\[0-9\]\{4\}-\[0-9\]\{2\}-\[0-9\]\{2\}\$/.test(R));
t('rules: a done record is created by a member for themselves only, with a fixed id; read by the teacher or its owner only', /id == request\.resource\.data\.hw \+ '_' \+ request\.auth\.uid/.test(cs) && /allow get, list: if clsTeacher\(code\) \|\| \(request\.auth != null && resource\.data\.uid == request\.auth\.uid\)/.test(cs));
t('rules: no phone numbers, marks or photos are stored (only the listed keys)', !/phone|mobile|marks|photo/i.test(cs));
t('rules: the other rules are still there (users, customCourses, subscriptions)', /match \/users\/\{uid\}\/\{document=\*\*\}/.test(R) && /match \/customCourses\/\{id\}/.test(R) && /match \/subscriptions\/\{uid\}/.test(R));
const C = read('public/cloud.js');
t('cloud: classes API (create, join, leave, homework, done, removeClass)', /classes: \{/.test(C) && ['create', 'listOwn', 'get', 'myCodes', 'join', 'leave', 'members', 'hwList', 'hwAdd', 'hwDel', 'doneList', 'doneSet', 'doneDel', 'removeClass'].every(n => new RegExp('\\b' + n + '\\(').test(C.slice(C.indexOf('classes: {'), C.indexOf('// Faculty / Developer')))));
t('cloud: the class code uses an alphabet without I, O, 0, 1 and crypto randomness', /ABCDEFGHJKLMNPQRSTUVWXYZ23456789/.test(C) && /crypto\.getRandomValues/.test(C));
t('cloud: deleting a class removes scores, done, homework and members first', /for \(const sub of \['scores', 'done', 'homework', 'members'\]\)/.test(C));
const H = read('public/index.html');
t('app: My Class view, sidebar item, icon, home card, setUser and script are wired', /VIEW==='class'\)body=window\.CLASSROOM/.test(H) && /item\('class','class','Meri progress'/.test(H) && /\['class','My Class'\]/.test(H) && /\n class:ic\(/.test(H) && /CLASSROOM\.homeHTML\(\)/.test(H) && /CLASSROOM\.setUser\(u\)/.test(H) && /src="\/classroom\.js"/.test(H));
t('app: no emoji in the new screen', !/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(read('public/classroom.js')));
t('app: no "Premium" word in the new screen', !/premium/i.test(read('public/classroom.js')));

let JSDOM = null; try { ({ JSDOM } = require('jsdom')); } catch (e) {}
if (!JSDOM) { console.log('SKIP  jsdom not installed - My Class screen tests not run'); console.log(pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0); }
const src = read('public/classroom.js'), wait = () => new Promise(r => setTimeout(r, 10));

// An in-memory Firestore stand-in for window.CLOUD.classes
function makeCloud() {
  const db = { classes: {}, members: {}, hw: {}, done: {}, users: {}, scores: {} }; let n = 0, cn = 0, me = 'u1';
  const C = {
    async create(school, cls) { const code = 'K7M2Q' + 'ABCDEFGH'[cn++]; const d = { code, school, class: cls, teacherId: me, createdAt: 1 }; db.classes[code] = d; return d; },
    async listOwn() { return Object.values(db.classes).filter(c => c.teacherId === me); },
    async get(code) { return db.classes[code] || null; },
    async myCodes() { return Object.keys(db.users[me] || {}); },
    async join(code, name) { (db.members[code] = db.members[code] || {})[me] = { uid: me, name, joinedAt: 1 }; (db.users[me] = db.users[me] || {})[code] = 1; },
    async leave(code) { delete (db.members[code] || {})[me]; delete (db.users[me] || {})[code]; db.done[code] = (db.done[code] || []).filter(d => d.uid !== me); db.scores[code] = (db.scores[code] || []).filter(d => d.uid !== me); },
    async forget(code) { delete (db.users[me] || {})[code]; },
    async members(code) { return Object.values(db.members[code] || {}); },
    async hwList(code) { return (db.hw[code] || []).slice(); },
    async hwAdd(code, hw) { const id = 'h' + (++n); (db.hw[code] = db.hw[code] || []).push({ id, ...hw }); return id; },
    async hwDel(code, id) { db.hw[code] = db.hw[code].filter(h => h.id !== id); db.done[code] = (db.done[code] || []).filter(d => d.hw !== id); },
    async scoreSet(code, ch, score) { const a = db.scores[code] = (db.scores[code] || []).filter(x => !(x.ch === ch && x.uid === me)); a.push({ ch, uid: me, score: Math.round(score), at: 1 }); },
    async scoreList(code) { return (db.scores[code] || []).slice(); },
    async doneList(code, mine) { return (db.done[code] || []).filter(d => !mine || d.uid === me); },
    async doneSet(code, hw) { (db.done[code] = db.done[code] || []).push({ hw, uid: me, at: 1 }); },
    async doneDel(code, hw) { db.done[code] = db.done[code].filter(d => !(d.hw === hw && d.uid === me)); },
    async removeClass(code) { delete db.classes[code]; delete db.members[code]; delete db.hw[code]; delete db.done[code]; delete db.scores[code]; }
  };
  return { C, db, as: u => { me = u; } };
}
function boot(cloud) {
  const dom = new JSDOM('<!doctype html><body><div id="app"></div></body>', { runScripts: 'outside-only', url: 'https://orbittutorial.web.app/', pretendToBeVisual: true });
  const w = dom.window, navs = [], gos = []; let draws = 0;
  w.CLOUD = { classes: cloud.C }; w.navTo = n => navs.push(n); w.go = v => gos.push(v); w.confirm = () => true; w.scrollTo = () => {};
  w.eval('var VIEW="class",NAV={page:"home"},USER={uid:"u1",name:"Rina Das"},CATALOG={groups:[{t:"Schools",items:[{id:"nashib",name:"Nashib Ali Academy"}]}],classes:{nashib:[7]}},DATA={courses:[{id:"c7-science",class:7,subject:"Science",medium:"English",chapters:[{no:1,title:"Nutrition in Plants"},{no:2,title:"Locked one",locked:true}]},{id:"cc-x",custom:true,class:7,subject:"Mine",chapters:[{no:1,title:"x"}]}]};function draw(){ document.getElementById("app").innerHTML = window.CLASSROOM.viewHTML() + "<div id=home>" + window.CLASSROOM.homeHTML() + "</div>"; window.__d = (window.__d||0)+1; }');
  w.eval(src);
  const d = w.document, app = () => d.getElementById('app').textContent;
  const click = sel => { const el = d.querySelector(sel); if (!el) throw new Error('no ' + sel); el.click(); };
  const set = (id, v) => { const el = d.getElementById(id); el.value = v; el.dispatchEvent(new w.Event('change', { bubbles: true })); };
  return { w, d, navs, gos, app, click, set, home: () => d.getElementById('home').textContent };
}

(async () => {
  const cloud = makeCloud(); let a = boot(cloud);
  // ---- teacher
  a.w.CLASSROOM.setUser({ uid: 'u1' }); await wait(); await wait(); a.w.eval('draw()');
  t('screen: join box, privacy line and teacher part are shown', /Teacher ka class code/.test(a.app()) && /Recall check ka chapter score dikh sakta hai/.test(a.app()) && /Nayi class banao/.test(a.app()));
  a.click('[data-cl=create]'); await wait();
  t('teacher: School/Class must be chosen first', /School aur class chuno/.test(a.app()) && Object.keys(cloud.db.classes).length === 0);
  a.set('clSchool', 'nashib'); a.set('clClass', '7'); a.click('[data-cl=create]'); await wait(); await wait();
  const code = Object.keys(cloud.db.classes)[0];
  t('teacher: class is made and its code shown', !!code && new RegExp(code).test(a.app()) && /Class 7 · Nashib Ali Academy/.test(a.app()) && cloud.db.classes[code].teacherId === 'u1');
  t('teacher: the class stores only code, school, class, teacher and time', Object.keys(cloud.db.classes[code]).sort().join() === 'class,code,createdAt,school,teacherId');
  t('teacher: subject list has built-in courses of that class only, locked chapters are not offered', /Science/.test(a.d.getElementById('clCourse').textContent) && !/Mine/.test(a.d.getElementById('clCourse').textContent) && /Nutrition in Plants/.test(a.d.getElementById('clChapter').textContent) && !/Locked one/.test(a.d.getElementById('clChapter').textContent));
  a.click('[data-cl=hwadd]'); await wait();
  t('teacher: homework needs a last date', /Last date chuno/.test(a.app()) && !cloud.db.hw[code]);
  a.set('clDue', '2099-01-31'); a.set('clNote', 'Poora padh ke aana'); a.click('[data-cl=hwadd]'); await wait(); await wait();
  const hw = (cloud.db.hw[code] || [])[0];
  t('teacher: homework saved with course, chapter, title, due, note', hw && hw.course === 'c7-science' && hw.chapter === 1 && /Science: Nutrition in Plants/.test(hw.title) && hw.due === '2099-01-31' && hw.note === 'Poora padh ke aana' && Object.keys(hw).sort().join() === 'chapter,course,createdAt,due,id,note,title');
  t('teacher: sees 0/0 done before anyone joins', /0\/0 ne kiya/.test(a.app()));

  // ---- student
  cloud.as('u2'); const s = boot(cloud); s.w.eval('USER={uid:"u2",name:"Rina Das"}'); s.w.CLASSROOM.setUser({ uid: 'u2' }); await wait(); await wait(); s.w.eval('draw()');
  s.d.getElementById('clCode').value = 'abc'; s.click('[data-cl=join]'); await wait();
  t('student: a short code is refused', /6 akshar/.test(s.app()) && !cloud.db.members[code]);
  s.d.getElementById('clCode').value = 'ZZZZZZ'; s.click('[data-cl=join]'); await wait(); await wait();
  t('student: an unknown code says so', /code nahi mila/.test(s.app()));
  s.d.getElementById('clCode').value = code.toLowerCase(); s.click('[data-cl=join]'); await wait(); await wait(); await wait();
  t('student: joins with the code (lowercase works); only name is stored', cloud.db.members[code] && cloud.db.members[code].u2 && Object.keys(cloud.db.members[code].u2).sort().join() === 'joinedAt,name,uid' && /Class 7 · Nashib Ali Academy/.test(s.app()));
  t('student: sees the homework in My Class and on Home', /Science: Nutrition in Plants/.test(s.app()) && /Poora padh ke aana/.test(s.app()) && /Homework/.test(s.home()) && /Science: Nutrition in Plants/.test(s.home()));
  s.click('#app [data-cl=open]');
  t('student: Chapter kholo goes to that chapter', s.navs.length === 1 && s.navs[0].page === 'chapter' && s.navs[0].cls === 7 && s.navs[0].sub === 'Science' && s.navs[0].ch === 1 && s.navs[0].org === 'nashib');
  s.click('#app [data-cl=done]'); await wait(); await wait();
  t('student: Ho gaya is saved; Home card disappears', cloud.db.done[code].length === 1 && cloud.db.done[code][0].uid === 'u2' && /Ho gaya/.test(s.app()) && !/Homework/.test(s.home()));
  // ---- teacher sees who did it
  cloud.as('u1'); a.w.CLASSROOM.refresh(); a.w.eval('draw()'); await wait(); await wait(); await wait();
  t('teacher: sees 1/1 and the student name as done', /1\/1 ne kiya/.test(a.app()) && /Rina Das — ho gaya/.test(a.app()));
  // ---- Task 49: weak topics of the class (counts only)
  cloud.as('u2'); s.w.CLASSROOM.score('c7-science', 1, 40.4); await wait(); await wait();
  cloud.db.scores[code].push({ ch: 'c7-science_1', uid: 'u3', score: 30, at: 1 }, { ch: 'c7-science_1', uid: 'u4', score: 80, at: 1 }, { ch: 'c7-science_2', uid: 'u3', score: 90, at: 1 }, { ch: 'c7-science_2', uid: 'u4', score: 20, at: 1 });
  t('class score: a Recall result is saved for the joined class (rounded, latest per chapter)', cloud.db.scores[code].some(x => x.uid === 'u2' && x.ch === 'c7-science_1' && x.score === 40));
  cloud.as('u1'); a.w.CLASSROOM.refresh(); a.w.eval('draw()'); await wait(); await wait(); await wait();
  const wk = a.app().slice(a.app().indexOf('Class ke kamzor topics'));
  t('teacher: weak topics are ranked, weakest share first, with counts and average', /Class ke kamzor topics/.test(wk) && wk.indexOf('Nutrition in Plants') < wk.indexOf('Locked one') && /2\/3 bachhe kamzor \(67%\) · average 50%/.test(wk) && /1\/2 bachhe kamzor \(50%\) · average 55%/.test(wk));
  t('teacher: the weak-topic list shows no student names', !/Rina Das/.test(wk) && /Naam nahi dikhte/.test(wk));
  const WT = a.w.CLASSROOM._t.weakTopics;
  t('weakTopics: ties go to the lower average; empty is empty', WT([{ ch: 'a_1', score: 40 }, { ch: 'b_1', score: 10 }]).map(e => e.ch).join() === 'b_1,a_1' && WT([]).length === 0);
  // student undo + leave
  cloud.as('u2'); s.click('#app [data-cl=undone]'); await wait(); await wait();
  t('student: can take Ho gaya back', (cloud.db.done[code] || []).length === 0);
  s.click('[data-cl=leave]'); await wait(); await wait();
  t('student: leaving removes the member, their scores and the shortcut', !cloud.db.members[code].u2 && !(cloud.db.scores[code] || []).some(x => x.uid === 'u2') && !(cloud.db.users.u2 || {})[code] && !/Class 7 · Nashib/.test(s.app()));
  // ---- teacher removes homework and class
  cloud.as('u1'); a.click('[data-cl=hwdel]'); await wait(); await wait();
  t('teacher: can remove homework', (cloud.db.hw[code] || []).length === 0);
  a.click('[data-cl=delclass]'); await wait(); await wait();
  t('teacher: removing the class removes everything', !cloud.db.classes[code] && !cloud.db.members[code] && !cloud.db.hw[code]);
  // ---- class deleted by teacher while a student still has it
  const c2 = makeCloud(); await c2.C.create('nashib', 7); c2.db.members.K7M2QA = { u1: { uid: 'u1', name: 'A', joinedAt: 1 } }; c2.db.users.u1 = { K7M2QA: 1 }; delete c2.db.classes.K7M2QA;
  const g2 = boot(c2); g2.w.CLASSROOM.setUser({ uid: 'u1' }); await wait(); await wait();
  t('student: a class the teacher deleted is dropped quietly', !(c2.db.users.u1 || {}).K7M2QA);
  // ---- errors never loop
  const bad = makeCloud(); bad.C.myCodes = async () => { throw new Error('x'); };
  const b = boot(bad); b.w.CLASSROOM.setUser({ uid: 'u1' }); await wait(); await wait(); await wait();
  t('load error: message shown, screen draws a bounded number of times', /Net ya server/.test(b.app()) && b.w.eval('window.__d') < 6);
  console.log(pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
})();
