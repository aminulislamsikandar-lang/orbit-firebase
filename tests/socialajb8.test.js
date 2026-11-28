// AJB (Assam Jatiya Bidyalay) Class 8 Social Science, Assamese medium: built like the other Assamese-medium courses (AI Answer from a hidden chapter `context`).
// Covers the course data, the hidden context, its place in the AJB board of the catalog, and the real index.html in jsdom (skipped when jsdom is missing).
// Run: node tests/socialajb8.test.js
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
const QUIZ = require(path.join(ROOT, 'questions.js')), PUBLIC = require(path.join(ROOT, 'questions-public.js')), CAT = require(path.join(ROOT, 'public', 'catalog.js'));
let pass = 0, fail = 0;
const t = (name, ok, extra) => { if (ok) pass++; else { fail++; console.log('FAIL  ' + name + (extra ? '  ' + extra : '')); } };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const c = QUIZ.courses.find(x => x.id === 'c8-social-ajb');
const allQ = course => course.chapters.flatMap(ch => (ch.sections || []).flatMap(s => s.questions));
const hasAs = s => /[\u0980-\u09FF]/.test(s || '');
const count = ch => ch.sections.reduce((n, s) => n + s.questions.length, 0);

// ---- course data ----
t('course exists: Class 8, Social Science, Assamese medium, like the other Assamese courses (no `fixed`, no ready answers)', !!c && c.class === 8 && c.subject === 'Social Science' && c.medium === 'Assamese' && c.sourceLang === 'Assamese' && !c.fixed);
t('chapters 1, 2, 3, 14, 17 in order, every one open, with an Assamese title and a History / Geography kind', same(c.chapters.map(x => x.no), [1, 2, 3, 14, 17]) && c.chapters.every(x => !x.locked && hasAs(x.title) && /ইতিহাস|ভূগোল/.test(x.kind)));
t('question counts per chapter: 7, 10, 6, 8, 9 (40 in all), two sections each: very short and short answer', same(c.chapters.map(count), [7, 10, 6, 8, 9]) && allQ(c).length === 40 && c.chapters.every(ch => ch.sections.length === 2 && /Very Short/.test(ch.sections[0].title) && /Short Answer/.test(ch.sections[1].title)));
const qs = allQ(c);
t('ids are unique, start with sj8c<chapter>-, use only safe characters and clash with no other course', new Set(qs.map(q => q.id)).size === qs.length && c.chapters.every(ch => ch.sections.every(s => s.questions.every(q => q.id.startsWith('sj8c' + ch.no + '-') && /^[A-Za-z0-9._:-]{1,100}$/.test(q.id)))) && QUIZ.courses.filter(x => x.id !== c.id).every(x => allQ(x).every(q => !q.id.startsWith('sj8c'))));
t('every question is in Assamese, numbered 1.. in order inside its section, has a video search term, and no ready answer', qs.every(q => hasAs(q.text) && q.text.length > 12 && typeof q.video === 'string' && q.video.length > 8 && !('ans' in q)) && c.chapters.every(ch => ch.sections.every(s => same(s.questions.map(q => q.no), s.questions.map((_, i) => i + 1)))));

// ---- the hidden context (the only thing the AI may use) ----
t('every chapter has a context with the rules (simple Assamese, no extra facts) and its key facts', c.chapters.every(ch => typeof ch.context === 'string' && ch.context.length > 700 && /simple Assamese/.test(ch.context) && /Do not add facts that are not listed here/.test(ch.context) && /Key facts:/.test(ch.context)));
const ctx = n => c.chapters.find(x => x.no === n).context;
t('context facts: Panipat 1526, Plassey 1757, Buxar 1764, Yandabo 1826, Meerut 10 May 1857, Jorhat 1858, Richter, 82.5 degrees E = 5 h 30 min', /1526/.test(ctx(1)) && /1757/.test(ctx(2)) && /1764/.test(ctx(2)) && /1826/.test(ctx(2)) && /10 May 1857/.test(ctx(3)) && /Jorhat in 1858/.test(ctx(3)) && /Richter/.test(ctx(14)) && /82\.5/.test(ctx(17)) && /5 hours 30 minutes/.test(ctx(17)));
t('the context facts cover the question topics: mansabdari, Todar Mal, subsidiary alliance, doctrine of lapse, Mangal Pandey, Maniram, Barren Island, plateau, date line', /mansabdari/.test(ctx(1)) && /Todar Mal/.test(ctx(1)) && /Subsidiary Alliance/.test(ctx(2)) && /Doctrine of Lapse/.test(ctx(2)) && /Mangal Pandey/.test(ctx(3)) && /Maniram/.test(ctx(3)) && /Barren Island/.test(ctx(14)) && /plateau/.test(ctx(14)) && /International Date Line/.test(ctx(17)));
t('students never download the context: the public questions have none of it, but keep every question', (() => { const p = PUBLIC.courses.find(x => x.id === 'c8-social-ajb'); return !!p && allQ(p).length === 40 && p.chapters.every(ch => !('context' in ch)); })());

// ---- other courses untouched ----
t('the other courses are still there and none of them was changed into a ready-answer course', QUIZ.courses.every(x => !x.fixed));

// ---- catalog ----
t('AJB board lists Class 8 Assamese: only this course; English medium and other classes have nothing', same(CAT.idsFor({ org: 'ajb', cls: 8, med: 'Assamese' }, QUIZ.courses), ['c8-social-ajb']) && !CAT.idsFor({ org: 'ajb', cls: 8, med: 'English' }, QUIZ.courses).length && !CAT.idsFor({ org: 'ajb', cls: 7, med: 'Assamese' }, QUIZ.courses).length);
t('the catalog row has the subject name and AJB is a board next to SEBA and CBSE', same(CAT.content.ajb[8], [['c8-social-ajb', 'Social Science']]) && same(CAT.groups[0].items.map(o => o.id), ['seba', 'cbse', 'ajb']));

(async () => {
  let JSDOM = null; try { ({ JSDOM } = require('jsdom')); } catch (e) {}
  if (!JSDOM) { console.log('SKIP  jsdom not installed (npm i -D jsdom) - AJB page tests not run'); console.log(pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0); }
  const page = read('public/index.html').replace(/<script\b[^>]*\bsrc=[^>]*><\/script>/g, '');
  const QDATA = JSON.parse(JSON.stringify(PUBLIC));
  const tick = (ms = 30) => new Promise(r => setTimeout(r, ms));
  const dom = new JSDOM(page, {
    runScripts: 'dangerously', url: 'https://orbittutorial.web.app/', pretendToBeVisual: true,
    beforeParse(w) {
      w.eval(read('public/catalog.js'));
      w.matchMedia = w.matchMedia || (() => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
      w.scrollTo = () => {};
      w.WARP = { block: txt => '<div class="warp">' + txt + '</div>' };
      w.fetch = async url => /questions\.json$/.test(url) ? { ok: true, json: async () => QDATA } : { ok: false, status: 404, json: async () => ({}) };
      w.CLOUD = { token: async () => 't', push: async () => {}, login: async () => {}, logout: async () => {}, course: { get: async () => ({ org: 'ajb', cls: 8, med: 'Assamese' }), set: async () => {} } };
    }
  });
  const w = dom.window, d = w.document; await tick(60);
  w.onCloudUser({ uid: 'u1', name: 'Test', email: 't@example.com', photo: '' }); await tick(80);
  const show = ch => { w.eval(`NAV={page:'chapter',org:'ajb',med:'Assamese',cls:8,sub:'Social Science',ch:${ch}};VIEW='home';draw()`); return tick(150); };
  await show(1);
  const cards = [...d.querySelectorAll('.q[data-qid]')];
  t('browser: the AJB student sees chapter 1 with its 7 questions, in two sections', cards.length === 7 && cards[0].dataset.qid === 'sj8c1-a1' && /মোগল সাম্ৰাজ্যৰ প্ৰতিষ্ঠাপক/.test(cards[0].textContent) && d.body.textContent.includes('চুটি উত্তৰৰ প্ৰশ্ন'));
  t('browser: every question has the AI Answer button and the 3-dot menu, like the Class 7 courses', d.querySelectorAll('.q[data-qid] [data-act=ask]').length === 7 && d.querySelectorAll('.q[data-qid] [data-act=qm]').length === 7);
  await show(17);
  t('browser: chapter 17 shows its 9 questions and the date-line question', d.querySelectorAll('.q[data-qid]').length === 9 && /আন্তৰ্জাতিক তাৰিখ ৰেখা/.test(d.body.textContent));
  console.log(pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
})();
