// The Exam tabs in the real index.html (jsdom): Mock test and Daily challenge are tabs of the Exam menu item, use the student's own courses,
// and a running test survives a visit to the other tab. exam.js itself is tested in exam.test.js. Needs jsdom. Run: node tests/exam-page-dom.test.js
let JSDOM; try { ({ JSDOM } = require('jsdom')); } catch (e) { console.log('SKIP jsdom is not installed'); process.exit(0); }
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/^\uFEFF/, '');
const html = read('public/index.html').replace(/<script\b[^>]*\bsrc=[^>]*><\/script>/g, '');
const QDATA = JSON.parse(JSON.stringify(require('../questions-public')));
let pass = 0, fail = 0;
const t = (n, ok, extra) => { if (ok) pass++; else { fail++; console.log('FAIL  ' + n + (extra ? '  ' + extra : '')); } };
const tick = (ms = 30) => new Promise(r => setTimeout(r, ms));

(async () => {
  let DOCS = [];
  const dom = new JSDOM(html, {
    runScripts: 'dangerously', url: 'https://orbittutorial.web.app/', pretendToBeVisual: true,
    beforeParse(w) {
      w.eval(read('public/catalog.js'));
      w.matchMedia = w.matchMedia || (() => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
      w.scrollTo = () => {};
      w.fetch = async url => /questions\.json$/.test(url) ? { ok: true, json: async () => QDATA } : { ok: false, json: async () => ({}) };
      w.CLOUD = { token: async () => 't', push: async () => {}, login: async () => {}, logout: async () => {},
        course: { get: async () => ({ org: 'seba', cls: 10, med: 'Assamese' }), set: async () => {} },
        quiz: { async approvedForCourse(c) { return DOCS.filter(d => d.course === c); } } };
    }
  });
  const w = dom.window, d = w.document, app = () => d.querySelector('#app');
  await tick(60); w.onCloudUser({ uid: 'u1', name: 'Test', email: 't@example.com', photo: '' }); await tick(80);
  w.eval(read('public/quiz.js')); w.eval(read('public/exam.js'));
  const click = sel => { const b = d.querySelector(sel); if (!b) throw new Error('no ' + sel); b.dispatchEvent(new w.MouseEvent('click', { bubbles: true })); };

  const cs = w.orbitCourses();
  t('the page gives exam.js the student\'s own courses (class 10 Assamese medium), with chapters', cs.length >= 1 && cs.every(c => c.id && c.title && c.class === 10 && c.chapters.length >= 1), JSON.stringify(cs.map(c => c.id)));
  const c = cs[0];
  DOCS = c.chapters.slice(0, 4).map(ch => ({ id: c.id + '__' + ch.no + '__easy', course: c.id, ch: ch.no, level: 'easy', status: 'approved',
    items: Array.from({ length: 6 }, (_, i) => ({ q: c.id + ' ch' + ch.no + ' question ' + i + ' here?', o: ['a' + i, 'b' + i, 'c' + i, 'd' + i], a: i % 4, e: 'why ' + i })) }));

  click('.sitem[data-v=pyq]'); await tick();
  const tabs = () => [...d.querySelectorAll('.gtabs [data-v]')].map(b => b.dataset.v);
  t('Exam shows four tabs: PYQ, Pass mark, Mock test, Daily challenge', JSON.stringify(tabs()) === '["pyq","pass","mock","daily"]', JSON.stringify(tabs()));
  click('.gtabs [data-v=mock]'); await tick(80);
  t('Mock test tab opens its page and the menu still marks Exam', w.eval('VIEW') === 'mock' && d.querySelector('#side [aria-current=page]').dataset.v === 'pyq');
  t('Mock test setup is shown inside the page, tabs on top', /20 sawaal/.test(app().textContent) && !!app().querySelector('[data-ex=mstart]') && tabs().length === 4);
  click('[data-ex=mstart]'); await tick();
  t('the test runs with a timer', /Time 20:00|Time 19:59/.test(app().textContent) && app().querySelectorAll('[data-ex=mpick]').length === 4);
  click('.gtabs [data-v=daily]'); await tick(80);
  t('Daily challenge tab opens', w.eval('VIEW') === 'daily' && /Daily challenge/.test(app().textContent) && !!app().querySelector('[data-ex=dstart]'));
  click('[data-ex=dstart]'); await tick();
  t('daily: first of 5 questions', /Sawaal 1 \/ 5/.test(app().textContent));
  click('.gtabs [data-v=mock]'); await tick();
  t('back on the Mock test tab the test is still running', /Time \d\d:\d\d/.test(app().textContent) && !app().querySelector('[data-ex=mstart]'));
  click('.sitem[data-v=home]'); await tick(); click('.sitem[data-v=pyq]'); await tick();
  t('the PYQ and Pass mark tabs are still there (coming soon pages)', w.eval('VIEW') === 'pyq' && /PYQ/.test(app().textContent));
  w.EXAM._reset();
  console.log(pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})();
