// "EX" button on a chapter page (real index.html in jsdom): EX -> exercises (2(A), 2(B)...) -> question numbers -> jumps to that question.
// Needs jsdom (CI installs it). Run: node tests/exnav-dom.test.js
let JSDOM; try { ({ JSDOM } = require('jsdom')); } catch (e) { console.log('SKIP jsdom is not installed'); process.exit(0); }
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/^\uFEFF/, '');
const html = read('public/index.html').replace(/<script\b[^>]*\bsrc=[^>]*><\/script>/g, '');
const QDATA = JSON.parse(JSON.stringify(require('../questions-public')));
let pass = 0, fail = 0;
const t = (n, ok, extra) => { if (ok) pass++; else { fail++; console.log('FAIL  ' + n + (extra ? '  ' + extra : '')); } };
const tick = (ms = 30) => new Promise(r => setTimeout(r, ms));

async function boot() {
  const dom = new JSDOM(html, {
    runScripts: 'dangerously', url: 'https://orbittutorial.web.app/', pretendToBeVisual: true,
    beforeParse(w) {
      w.eval(read('public/catalog.js'));
      w.matchMedia = w.matchMedia || (() => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
      w.scrollTo = () => {};
      w.fetch = async url => /questions\.json$/.test(url) ? { ok: true, json: async () => QDATA } : { ok: false, json: async () => ({}) };
      w.CLOUD = { token: async () => 't', push: async () => {}, login: async () => {}, logout: async () => {},
        course: { get: async () => ({ org: 'seba', cls: 10, med: 'Assamese' }), set: async () => {} } };
    }
  });
  const w = dom.window;
  await tick(60);
  w.onCloudUser({ uid: 'u1', name: 'Test', email: 't@example.com', photo: '' });
  await tick(80);
  const click = sel => { const b = w.document.querySelector(sel); if (!b) throw new Error('no button ' + sel); b.dispatchEvent(new w.MouseEvent('click', { bubbles: true })); };
  return { w, click, view: () => w.eval('VIEW'), side: () => w.document.querySelector('#side'), app: () => w.document.querySelector('#app') };
}

(async () => {
  const s = await boot(), w = s.w, d = w.document;
  w.HTMLElement.prototype.scrollIntoView = function () { w.__scrolled = this.dataset.qid; };
  // a small chapter with two exercises, shown through the real chapter page
  w.eval(`(function(){const c=DATA.courses[0];const ch=c.chapters[0];
    ch.sections=[{title:'Exercise 2(A) (multiply)',questions:[{id:'ex-a1',no:1,text:'A one'},{id:'ex-a2',no:2,text:'A two'}]},{title:'2(B) (divide)',questions:[{id:'ex-b1',no:1,text:'B one'}]}];
    COURSE=Object.assign({},COURSE||{});NAV={page:'chapter',org:COURSE.org||'seba',med:COURSE.med||'Assamese',cls:c.class,sub:c.subject,ch:ch.no};IDX['ex-a1']={course:c,ch,q:ch.sections[0].questions[0]};VIEW='home';draw()})()`);
  await tick();
  const btn = () => d.querySelector('[data-act=exnav]');
  const click = el => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  t('chapter page has the EX button at the top, next to Back', !!btn() && btn().textContent === 'EX' && btn().parentElement.className === 'exrow' && !!btn().parentElement.querySelector('.back'));
  t('the exercise list is hidden until EX is tapped', !d.querySelector('.exp'));
  click(btn()); await tick();
  const secs = () => [...d.querySelectorAll('[data-act=exsec]')].map(b => b.textContent);
  t('tapping EX shows the exercises: 2(A) and 2(B)', JSON.stringify(secs()) === JSON.stringify(['2(A)', '2(B)']), secs().join());
  t('no question numbers yet', !d.querySelector('.exq'));
  click(d.querySelector('[data-act=exsec][data-id="0"]')); await tick();
  t('tapping 2(A) shows its question numbers 1, 2', JSON.stringify([...d.querySelectorAll('[data-act=exq]')].map(b => b.textContent)) === '["1","2"]');
  t('2(A) is marked as selected', d.querySelector('[data-act=exsec][data-id="0"]').getAttribute('aria-pressed') === 'true');
  click(d.querySelector('[data-act=exsec][data-id="1"]')); await tick();
  t('tapping 2(B) switches to its numbers (1)', JSON.stringify([...d.querySelectorAll('[data-act=exq]')].map(b => b.textContent)) === '["1"]');
  click(d.querySelector('[data-act=exsec][data-id="0"]')); await tick();
  click(d.querySelector('[data-act=exq][data-id="ex-a2"]')); await tick();
  t('tapping a number closes the panel and scrolls to that question', !d.querySelector('.exp') && w.__scrolled === 'ex-a2');
  t('that question card is highlighted for a moment', d.querySelector('[data-qid="ex-a2"]').classList.contains('exhit'));
  click(btn()); await tick(); click(btn()); await tick();
  t('tapping EX again closes the list', !d.querySelector('.exp'));
  console.log(pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('FAIL  crashed -> ' + (e && e.stack || e)); process.exit(1); });
