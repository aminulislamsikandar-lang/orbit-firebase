// Mock test + Daily challenge (public/exam.js): question picking, scoring, streak, and the pages themselves.
// The pure helpers run in plain node; the pages run in a fake browser (jsdom, skipped without it). Run: node tests/exam.test.js
const fs = require('fs'), path = require('path');
let JSDOM = null; try { ({ JSDOM } = require('jsdom')); } catch (e) {}
let pass = 0, fail = 0;
const t = (name, ok, extra) => { if (ok) pass++; else { fail++; console.log('FAIL  ' + name + (extra ? '  ' + extra : '')); } };
const read = f => fs.readFileSync(path.join(__dirname, '..', 'public', f), 'utf8');
const quizSrc = read('quiz.js'), examSrc = read('exam.js');
const wait = ms => new Promise(r => setTimeout(r, ms || 10));

const mk = (course, ch, level, i, tag) => ({ q: (tag || course) + ' ch' + ch + ' ' + level + ' question ' + i + ' here?', o: ['one ' + i, 'two ' + i, 'three ' + i, 'four ' + i], a: i % 4, e: 'Reason ' + ch + '-' + i });
const doc = (course, ch, level, n, status) => ({ id: course + '__' + ch + '__' + level, course, ch, level, status: status || 'approved', at: 1, items: Array.from({ length: n || 6 }, (_, i) => mk(course, ch, level, i)) });
const COURSES = [
  { id: 'c7-science', title: 'Science', class: 7, subject: 'Science', chapters: [{ no: 1, title: 'Nutrition' }, { no: 2, title: 'Acids' }, { no: 3, title: 'Heat' }, { no: 4, title: 'Light' }] },
  { id: 'c7-maths', title: 'Maths', class: 7, subject: 'Maths', chapters: [{ no: 1, title: 'Integers' }, { no: 2, title: 'Fractions' }] }
];

function boot(o) {
  o = o || {};
  const dom = new JSDOM('<!doctype html><body><div id="app"></div></body>', { runScripts: 'outside-only', url: 'https://orbittutorial.web.app/', pretendToBeVisual: true });
  const w = dom.window, db = { docs: (o.docs || []).map(d => JSON.parse(JSON.stringify(d))), reads: 0, fail: !!o.cloudFail };
  w.orbitUser = () => (o.user === null ? null : { uid: 'u1', email: 'a@b.c' });
  w.orbitCourses = () => (o.courses === undefined ? COURSES : o.courses);
  w.QVideo = { active: () => false };
  w.CLOUD = { quiz: { async approvedForCourse(c) { db.reads++; if (db.fail) throw new Error('x'); return db.docs.filter(d => d.course === c && d.status === 'approved'); } } };
  w.view = o.view || 'mock';
  w.draw = () => { w.document.getElementById('app').innerHTML = w.EXAM.viewHTML(w.view); };
  if (o.store) Object.keys(o.store).forEach(k => w.localStorage.setItem(k, JSON.stringify(o.store[k])));
  w.eval(quizSrc); w.eval(examSrc);
  const d = w.document, app = () => d.getElementById('app');
  const click = sel => { const b = app().querySelector(sel); if (!b) throw new Error('no ' + sel + ' in: ' + app().textContent.slice(0, 120)); b.click(); };
  return { w, d, db, app, click, text: () => app().textContent, S: () => w.EXAM._state, store: k => JSON.parse(w.localStorage.getItem(k) || '{}'), done() { w.EXAM._reset(); w.close(); } };
}

// ---------- pure helpers (need the quiz.js item check, so they run in the fake browser too) ----------
(async () => {
  if (!JSDOM) { console.log('SKIP  jsdom not installed'); console.log('0 passed, 0 failed'); process.exit(0); }
  const b0 = boot(), X = b0.w.EXAM;

  t('hash is stable and different for different text', X.hash('a|b') === X.hash('a|b') && X.hash('a|b') !== X.hash('a|c'));
  const r1 = X.rngFrom(5), r2 = X.rngFrom(5), r3 = X.rngFrom(6), s1 = [r1(), r1(), r1()], s2 = [r2(), r2(), r2()], s3 = [r3(), r3(), r3()];
  t('the same seed gives the same numbers, in 0..1; another seed gives others', JSON.stringify(s1) === JSON.stringify(s2) && JSON.stringify(s1) !== JSON.stringify(s3) && s1.every(v => v >= 0 && v < 1));
  const sh = X.shuffle([1, 2, 3, 4, 5, 6], X.rngFrom(1));
  t('shuffle keeps every item once and does not touch the input', sh.slice().sort().join() === '1,2,3,4,5,6');

  // pool
  const docs = [doc('c7-science', 2, 'hard', 6), doc('c7-science', 1, 'easy', 6), doc('c7-science', 1, 'medium', 6, 'pending'), doc('c7-science', 3, 'easy', 6)];
  docs[1].items.push({ q: 'bad', o: ['a', 'a'], a: 9, e: '' });                 // broken: dropped
  docs[3].items.push(docs[0].items[0]);                                         // the same question again: counted once
  const pool = X.buildPool(docs);
  t('pool: only approved quizzes, only playable items, each question once', pool.length === 18 && pool.every(p => p.level !== 'medium') && new Set(pool.map(p => p.q)).size === 18, 'n=' + pool.length);
  t('pool: same result whatever the order the quizzes arrive in', JSON.stringify(X.buildPool(docs.slice().reverse())) === JSON.stringify(pool));
  t('pool: nothing breaks on empty or odd input', X.buildPool([]).length === 0 && X.buildPool(null).length === 0 && X.buildPool([null, {}, { status: 'approved' }]).length === 0);

  // picking
  const big = X.buildPool([doc('c', 1, 'easy', 12), doc('c', 2, 'easy', 2), doc('c', 3, 'easy', 2)]);
  const pk = X.pickSpread(big, 6, X.rngFrom(3)), cnt = c => pk.filter(p => p.ch === c).length;
  t('pick: asks for 6 and gets 6 different questions', pk.length === 6 && new Set(pk.map(p => p.k)).size === 6);
  t('pick: every chapter is in (a big chapter does not take over)', cnt(1) >= 2 && cnt(2) >= 2 && cnt(3) >= 2, cnt(1) + ',' + cnt(2) + ',' + cnt(3));
  t('pick: asking for more than the pool gives the whole pool', X.pickSpread(big, 99, X.rngFrom(3)).length === 16);
  t('pick: same seed same questions, another seed another order', JSON.stringify(X.pickSpread(big, 6, X.rngFrom(3))) === JSON.stringify(pk) && JSON.stringify(X.pickSpread(big, 6, X.rngFrom(4))) !== JSON.stringify(pk));
  const mx = X.mixOptions(big[0], X.rngFrom(9));
  t('options are mixed but the right answer stays right', mx.o.slice().sort().join() === big[0].o.slice().sort().join() && mx.o[mx.a] === big[0].o[big[0].a] && mx.e === big[0].e && mx.ch === big[0].ch);

  // score
  const qs = [{ a: 0, ch: 1 }, { a: 1, ch: 1 }, { a: 2, ch: 2 }, { a: 3, ch: 2 }, { a: 0, ch: 2 }];
  let sc = X.score(qs, [0, 1, 2, null, 3]);
  t('score: counts right answers, skipped and wrong are not right', sc.score === 3 && sc.total === 5 && sc.pct === 60);
  t('score: 60% is a pass, 59% is not', sc.pass === true && X.score(qs, [0, null, null, null, null]).pass === false && X.score(Array.from({ length: 100 }, () => ({ a: 0, ch: 1 })), Array.from({ length: 100 }, (_, i) => (i < 59 ? 0 : 1))).pass === false);
  t('score: chapter by chapter', sc.by[1].r === 2 && sc.by[1].t === 2 && sc.by[2].r === 1 && sc.by[2].t === 3);
  t('score: an empty test is 0 and not a pass, no crash', X.score([], []).pct === 0 && X.score([], []).pass === false);

  // days and streak
  t('shiftDay crosses month, year and leap day', X.shiftDay('2026-03-01', -1) === '2026-02-28' && X.shiftDay('2026-01-01', -1) === '2025-12-31' && X.shiftDay('2024-03-01', -1) === '2024-02-29' && X.shiftDay('2026-12-31', 1) === '2027-01-01');
  t('ymd pads month and day', X.ymd(new Date(2026, 0, 5)) === '2026-01-05');
  let st = X.streakBump(null, '2026-11-20');
  t('streak: first day is 1', st.n === 1 && st.last === '2026-11-20' && st.best === 1);
  t('streak: playing twice the same day changes nothing', X.streakBump(st, '2026-11-20').n === 1);
  st = X.streakBump(st, '2026-11-21'); st = X.streakBump(st, '2026-11-22');
  t('streak: the next days add one each', st.n === 3 && st.best === 3 && st.days.length === 3);
  const st2 = X.streakBump(st, '2026-11-25');
  t('streak: a missed day starts again at 1 but the best stays', st2.n === 1 && st2.best === 3);
  t('streak shown: alive today or yesterday, gone after a missed day', X.streakShown(st, '2026-11-22') === 3 && X.streakShown(st, '2026-11-23') === 3 && X.streakShown(st, '2026-11-24') === 0 && X.streakShown(null, '2026-11-24') === 0);
  t('streak keeps only the last 30 days', (() => { let s = null; for (let i = 0; i < 40; i++) s = X.streakBump(s, X.shiftDay('2026-01-01', i)); return s.days.length === 30 && s.n === 40; })());
  t('clock text', X.fmt(1200) === '20:00' && X.fmt(59) === '00:59' && X.fmt(0) === '00:00');
  b0.done();

  // ---------- pages ----------
  const full = [doc('c7-science', 1, 'easy', 6), doc('c7-science', 2, 'easy', 6), doc('c7-science', 3, 'medium', 6), doc('c7-science', 4, 'hard', 6), doc('c7-maths', 1, 'easy', 3)];

  let b = boot({ user: null, docs: full }); b.w.draw();
  t('logged out: asks to log in, no test', /log in/i.test(b.text()) && !b.app().querySelector('[data-ex=mstart]')); b.done();
  b = boot({ courses: [], docs: full }); b.w.draw();
  t('no course: says so', /koi course nahi/.test(b.text())); b.done();

  // mock: setup
  b = boot({ docs: full }); b.w.draw();
  t('first draw says loading, then shows the setup', /load ho rahe/.test(b.text())); await wait();
  t('setup: 20 questions, 20 minutes, a start button, a course choice', /20 sawaal/.test(b.text()) && /20 minute/.test(b.text()) && !!b.app().querySelector('[data-ex=mstart]') && !!b.app().querySelector('[data-exs=course]'), b.text().slice(0, 160));
  t('one query for the course', b.db.reads === 1); b.w.draw(); t('drawing again does not read again', b.db.reads === 1);
  // mock: run
  b.click('[data-ex=mstart]');
  t('run: 20 numbered buttons, 4 options, question 1, timer 20:00', b.app().querySelectorAll('.chips [data-ex=mjump]').length === 20 && b.app().querySelectorAll('[data-ex=mpick]').length === 4 && /Q1\./.test(b.text()) && /Time 20:00|Time 19:59/.test(b.text()), 'palette=' + b.app().querySelectorAll('.chips [data-ex=mjump]').length);
  t('run: no hint, no right answer shown', !/Sahi jawab/.test(b.text()) && !/Reason/.test(b.text()));
  t('run: the questions come from all four science chapters', new Set(b.S().m.qs.map(q => q.ch)).size === 4 && b.S().m.qs.length === 20);
  t('run: the course choice is gone while the test runs', !b.app().querySelector('[data-exs=course]'));
  const w1 = (b.S().m.qs[0].a + 1) % 4, w2 = (b.S().m.qs[0].a + 2) % 4;
  b.click('[data-ex=mpick][data-i="' + w1 + '"]');
  t('pick marks the answer and nothing else', b.S().m.ans[0] === w1 && b.S().m.ans.filter(a => a != null).length === 1);
  b.click('[data-ex=mpick][data-i="' + w2 + '"]'); t('a pick can be changed', b.S().m.ans[0] === w2);
  b.click('[data-ex=mflag]'); t('flag on', b.S().m.flag[0] === 1); b.click('[data-ex=mflag]'); t('flag off', b.S().m.flag[0] === 0);
  b.click('[data-ex=mjump][data-i="5"]'); t('jump opens question 6', b.S().m.i === 5 && /Q6\./.test(b.text()));
  b.click('[data-ex=mjump][data-i="19"]');
  t('last question has Submit, not Next', !!b.app().querySelector('[data-ex=msubmit]'));
  b.click('[data-ex=msubmit]');
  t('submit with unanswered questions warns first', /19 sawaal baaki/.test(b.text()) && b.S().m.stage === 'run');
  b.click('[data-ex=msubmit]');
  t('second tap submits', b.S().m.stage === 'done' && /Mock test result/.test(b.text()));
  const r = b.S().m.res;
  t('result: 0 right (one wrong answer, rest skipped), a fail, reasons for the wrong ones', r.score === 0 && r.pass === false && /Pass mark \(60%\) se neeche/.test(b.text()) && /Reason/.test(b.text()));
  t('result: every chapter shown with weak marks', /weak/.test(b.text()) && /Nutrition/.test(b.text()) && /Acids/.test(b.text()));
  t('result is saved in this browser', (b.store('orbit.mock.u1')['c7-science'] || []).length === 1 && b.store('orbit.mock.u1')['c7-science'][0].p === 0);
  // mock: all right
  b.click('[data-ex=mstart]');
  const Q = b.S().m.qs;
  for (let i = 0; i < Q.length; i++) { b.click('[data-ex=mjump][data-i="' + i + '"]'); b.click('[data-ex=mpick][data-i="' + Q[i].a + '"]'); }
  b.click('[data-ex=msubmit]');
  t('all right: 100% and a pass, no warning needed', b.S().m.stage === 'done' && b.S().m.res.pct === 100 && /Pass \(60% se upar\)/.test(b.text()) && !/weak/.test(b.text()));
  b.S().m = { stage: 'setup' }; b.w.draw();
  t('setup remembers the last result', /Pichhli baar 100%/.test(b.text()), b.text().slice(0, 200));
  b.done();

  // mock: time up
  b = boot({ docs: full }); b.w.draw(); await wait(); b.click('[data-ex=mstart]');
  b.S().m.endsAt = Date.now() - 1; await wait(1150);
  t('time up: the test ends by itself with a result', b.S().m.stage === 'done' && /time khatam/.test(b.text())); b.done();

  // mock: the clock is a time stamp, leaving the page does not freeze it
  b = boot({ docs: full }); b.w.draw(); await wait(); b.click('[data-ex=mstart]');
  b.S().m.endsAt = Date.now() + 65 * 1000; b.w.draw();
  t('timer text follows the time stamp', /Time 01:0[45]/.test(b.text())); b.done();

  // mock: few questions, failing cloud, two courses
  b = boot({ docs: [doc('c7-science', 1, 'easy', 3)] }); b.w.draw(); await wait();
  t('too few questions: says how many, no start button', /sirf 3 sawaal/.test(b.text()) && !b.app().querySelector('[data-ex=mstart]')); b.done();
  b = boot({ docs: [doc('c7-science', 1, 'easy', 7)] }); b.w.draw(); await wait();
  t('7 questions: a 7-question test', /7 sawaal/.test(b.text())); b.click('[data-ex=mstart]'); t('and it runs with 7', b.S().m.qs.length === 7); b.done();
  b = boot({ docs: full, cloudFail: true }); b.w.draw(); await wait();
  t('cloud error: message and a retry button', /load nahi hue/.test(b.text()) && !!b.app().querySelector('[data-ex=retry]'));
  t('cloud error: it asked once, not again and again', b.db.reads === 1, 'reads=' + b.db.reads);
  b.db.fail = false; b.click('[data-ex=retry]'); await wait();
  t('retry works', !!b.app().querySelector('[data-ex=mstart]')); b.done();
  b = boot({ docs: full }); b.w.draw(); await wait();
  const sel = b.app().querySelector('[data-exs=course]'); sel.value = 'c7-maths'; sel.dispatchEvent(new b.w.Event('change', { bubbles: true })); await wait();
  t('another course: its own pool (3 maths questions is too few)', /sirf 3 sawaal/.test(b.text()) && b.db.reads === 2); b.done();
  b = boot({ docs: [{ ...doc('c7-science', 1, 'easy', 6), items: Array.from({ length: 6 }, (_, i) => ({ ...mk('x', 1, 'easy', i), q: '<img src=x onerror=alert(1)> question ' + i + ' here' })) }] }); b.w.draw(); await wait(); b.click('[data-ex=mstart]');
  t('question text is escaped, never markup', !b.app().querySelector('img') && /&lt;img|<img/.test(b.text() + b.app().innerHTML) && b.app().innerHTML.indexOf('<img') === -1); b.done();

  // daily
  b = boot({ docs: full, view: 'daily' }); b.w.draw(); await wait();
  t('daily: intro with 5 questions, streak 0, start button', /5 sawaal/.test(b.text()) && /0 din ka streak/.test(b.text()) && !!b.app().querySelector('[data-ex=dstart]'));
  b.click('[data-ex=dstart]');
  const dq = b.store('orbit.daily.u1').today.c['c7-science'].qs;
  t('daily: 5 questions made and saved', dq.length === 5 && /Sawaal 1 \/ 5/.test(b.text()));
  b.click('[data-ex=dpick][data-i="' + ((dq[0].a + 1) % 4) + '"]');
  t('daily: a wrong pick shows the right letter and the reason, and locks', /Sahi jawab: /.test(b.text()) && /Reason/.test(b.text()) && b.app().querySelectorAll('[data-ex=dpick]:not([disabled])').length === 0);
  b.click('[data-ex=dnext]');
  t('daily: next question', /Sawaal 2 \/ 5/.test(b.text()) && !/Reason/.test(b.text()));
  b.click('[data-ex=dpick][data-i="' + dq[1].a + '"]'); t('daily: a right pick says so', /Sahi jawab!/.test(b.text()));
  b.w.EXAM._reset(); b.w.draw();
  t('daily: after a reload the same test continues on the same question, answer remembered', /Sawaal 2 \/ 5/.test(b.text()) && /Sahi jawab!/.test(b.text()), b.text().slice(0, 100));
  for (let i = 1; i < 5; i++) { const s = b.store('orbit.daily.u1').today.c['c7-science']; if (s.ans[i] == null) b.click('[data-ex=dpick][data-i="' + s.qs[i].a + '"]'); b.click('[data-ex=dnext]'); }
  const dn = b.store('orbit.daily.u1');
  t('daily: finished: 4 of 5, streak 1', dn.today.c['c7-science'].done === true && dn.today.c['c7-science'].score === 4 && dn.streak.n === 1 && /4 \/ 5 aaj/.test(b.text()) && /1 din ka streak/.test(b.text()));
  t('daily: the review lists the missed one', /Sahi jawab [A-D]/.test(b.text()));
  t('daily: no second go the same day', !b.app().querySelector('[data-ex=dstart]') && !b.app().querySelector('[data-ex=dpick]'));
  b.done();

  // daily: same questions for everybody on the same day, streak carries on from yesterday
  const mkDaily = () => { const x = boot({ docs: full, view: 'daily' }); x.w.draw(); return x; };
  let da = mkDaily(); await wait(); da.click('[data-ex=dstart]'); const qa = JSON.stringify(da.store('orbit.daily.u1').today.c['c7-science'].qs); da.done();
  let db2 = mkDaily(); await wait(); db2.click('[data-ex=dstart]'); const qb = JSON.stringify(db2.store('orbit.daily.u1').today.c['c7-science'].qs);
  t('daily: two phones, same day, same questions', qa === qb); db2.done();
  const probe = boot(); const today = probe.w.EXAM.ymd(new Date()), yest = probe.w.EXAM.shiftDay(today, -1); probe.done();
  let dc = boot({ docs: full, view: 'daily', store: { 'orbit.daily.u1': { streak: { last: yest, n: 4, best: 6, days: [yest] } } } }); dc.w.draw(); await wait();
  t('daily: yesterday played, the streak is still alive today', /4 din ka streak/.test(dc.text()));
  dc.click('[data-ex=dstart]');
  for (let i = 0; i < 5; i++) { const s = dc.store('orbit.daily.u1').today.c['c7-science']; dc.click('[data-ex=dpick][data-i="' + s.qs[i].a + '"]'); dc.click('[data-ex=dnext]'); }
  const ds = dc.store('orbit.daily.u1').streak;
  t('daily: finishing makes it 5 and keeps the best', ds.n === 5 && ds.best === 6 && ds.last === today); dc.done();
  let dd = boot({ docs: full, view: 'daily', store: { 'orbit.daily.u1': { streak: { last: X.shiftDay(today, -3), n: 9, best: 9, days: [] } } } }); dd.w.draw(); await wait();
  t('daily: a missed day: the streak shows 0 again', /0 din ka streak/.test(dd.text())); dd.done();
  let de = boot({ docs: [doc('c7-science', 1, 'easy', 2)], view: 'daily' }); de.w.draw(); await wait();
  t('daily: under 3 questions in the pool: says so', /sirf 2 sawaal/.test(de.text()) && !de.app().querySelector('[data-ex=dstart]')); de.done();
  let df = boot({ docs: [doc('c7-science', 1, 'easy', 4)], view: 'daily' }); df.w.draw(); await wait(); df.click('[data-ex=dstart]');
  t('daily: 4 in the pool: a 4-question challenge', df.store('orbit.daily.u1').today.c['c7-science'].qs.length === 4); df.done();
  let dg = boot({ docs: full, view: 'daily', store: { 'orbit.daily.u1': { today: { date: '2001-01-01', c: { 'c7-science': { qs: [], ans: [], i: 0, done: true, score: 0 } } }, streak: { last: '2001-01-01', n: 2, best: 2, days: [] } } } }); dg.w.draw(); await wait();
  t('daily: yesterday\'s test is not shown today, a new one can start', !!dg.app().querySelector('[data-ex=dstart]')); dg.done();
  let dh = boot({ docs: full, view: 'daily', store: { 'orbit.daily.u1': 'broken' } }); dh.w.draw(); await wait();
  t('daily: broken saved data does not crash it', !!dh.app().querySelector('[data-ex=dstart]')); dh.done();

  console.log(pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})();
