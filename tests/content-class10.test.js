// Class 10 SEBA Assamese-medium content (Maths, Social Science, Science) and the Assamese answer language.
// Run: node tests/content-class10.test.js
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');   // Windows checkouts have CRLF
const QUIZ = require(path.join(ROOT, 'questions.js')), RECALL = require(path.join(ROOT, 'recall-core.js'));
let pass = 0, fail = 0;
const t = (name, ok, extra) => { if (ok) pass++; else { fail++; console.log('FAIL  ' + name + (extra ? '  ' + extra : '')); } };
const course = id => QUIZ.courses.find(c => c.id === id);
const allQ = c => (c.chapters || []).flatMap(ch => (ch.sections || []).flatMap(s => s.questions || []));
const hasAssamese = s => /[\u0980-\u09FF]/.test(s || '');

// ---- the three courses ----
const want = { 'c10-maths': ['Mathematics', 'm10c'], 'c10-social': ['Social Science', 's10c'], 'c10-science-as': ['Science', 'sc10c'] };
for (const [id, [subject, prefix]] of Object.entries(want)) {
  const c = course(id);
  t(id + ': exists, Class 10, ' + subject + ', Assamese medium, Assamese source language', !!c && c.class === 10 && c.subject === subject && c.medium === 'Assamese' && c.sourceLang === 'Assamese');
  t(id + ': every question id starts with ' + prefix + ' (cannot clash with another course)', !!c && allQ(c).every(q => q.id.startsWith(prefix)));
}
t('English-medium Class 10 Science (c10-science) is untouched: no medium set, still English', !course('c10-science').medium);

// ---- data shape ----
const ids = new Map(), dup = [];
for (const c of QUIZ.courses) for (const q of allQ(c)) { if (ids.has(q.id)) dup.push(q.id); ids.set(q.id, c.id); }
t('question ids are unique across ALL courses', dup.length === 0, dup.slice(0, 5).join(', '));
t('course ids are unique', new Set(QUIZ.courses.map(c => c.id)).size === QUIZ.courses.length);
const noBody = Object.keys(want).flatMap(id => allQ(course(id)).filter(q => !(q.text || (q.parts && q.parts.length))).map(q => q.id));
t('every new question has text or parts (a multi-part question has empty text and filled parts)', noBody.length === 0, noBody.join(', '));
t('question numbers are numeric and unique inside a section', Object.keys(want).every(id => course(id).chapters.every(ch => (ch.sections || []).every(s => s.questions.every(q => typeof q.no === 'number') && new Set(s.questions.map(q => q.no)).size === s.questions.length))));
t('Assamese text really is Assamese script in the new questions (not an English copy)', allQ(course('c10-maths')).filter(q => hasAssamese(q.text || (q.parts || []).join(' '))).length > 20 && allQ(course('c10-social')).filter(q => hasAssamese(q.text)).length > 10);

// ---- chapters: locked ones are really "coming soon"; chapter 0 (Revision) works everywhere ----
const m = course('c10-maths');
t('Maths: chapters 0..14 are listed (0 = Revision, 1 = Real Numbers ... 14 = Probability)', m.chapters.map(c => c.no).join() === [...Array(15).keys()].join());
t('Maths: chapters 0 and 1 have questions; chapters 2-14 are locked with no sections', m.chapters.filter(c => c.no <= 1).every(c => (c.sections || []).length > 0) && m.chapters.filter(c => c.no >= 2).every(c => c.locked && !(c.sections || []).length));
t('Science (Assamese): chapter 1 is a locked title only (no exercise questions until the textbook is checked)', course('c10-science-as').chapters.length === 1 && course('c10-science-as').chapters[0].locked === true && allQ(course('c10-science-as')).length === 0);
const lockRule = ch => !(ch.locked || !(ch.sections && ch.sections.length));
t('Recall can be asked only when the app shows a chapter open: the lock rule and RECALL.isReady agree on every chapter of every course', QUIZ.courses.every(c => c.chapters.every(ch => RECALL.isReady(ch) === lockRule(ch))));
const h0 = RECALL.findChapter(QUIZ, 'c10-maths', 0), h0s = RECALL.findChapter(QUIZ, 'c10-maths', '0');
t('chapter number 0 is found (not treated as "missing"), as a number or a string', !!h0 && !!h0s && h0.ch.no === 0 && RECALL.isReady(h0.ch));
t('a locked chapter is found but refused', (h => !!h && !RECALL.isReady(h.ch))(RECALL.findChapter(QUIZ, 'c10-maths', 5)));

// ---- app: catalog, chapter-0 handling ----
const idx = read('public/index.html');
const cat = (idx.match(/seba:\{10:\[(.*?)\]\}/) || [])[1] || '';
t('SEBA Class 10 shows Science, Mathematics, Social Science and the Assamese Science', ['c10-science', 'c10-maths', 'c10-social', 'c10-science-as'].every(id => cat.includes("'" + id + "'")));
t('every course in the catalog exists in the question data', [...idx.matchAll(/\['(c\d+-[a-z-]+)'/g)].every(x => !!course(x[1])));
const courseOfSrc = (idx.match(/^const courseOf=.*$/m) || [''])[0];
const courseOf = new Function('DATA', 'isCustomOrg', 'NAV', courseOfSrc + '\nreturn courseOf;')(QUIZ, () => false, { org: 'seba' });
t('app: the course page picks the right course by class + subject + medium (it runs the real courseOf of index.html)', !!courseOfSrc && (courseOf(10, 'Science', 'Assamese') || {}).id === 'c10-science-as' && (courseOf(10, 'Science', 'English') || {}).id === 'c10-science' && (courseOf(10, 'Mathematics', 'Assamese') || {}).id === 'c10-maths' && (courseOf(10, 'Social Science', 'Assamese') || {}).id === 'c10-social' && !courseOf(10, 'Mathematics', 'English'));
t('app: chapter 0 shows an "R" badge and a title without "Chapter 0"', idx.includes("(ch.no===0?'R':ch.no)") && idx.includes('ch.no===0?ch.title:`Chapter ${ch.no}: ${ch.title}`'));
t('app: opening chapter 0 works ("0" from data-ch is a non-empty string, +"0" is 0, compared with ===)', idx.includes('ch:b.dataset.ch?+b.dataset.ch:null') && idx.includes('c.chapters.find(x=>x.no===NAV.ch)'));
t('admin panel allows chapter 0 (Revision)', read('public/mathvideo-admin.js').includes('info.chNo == null || info.chNo === ""'));
t('video admin lists Class 10 Mathematics (Assamese) as a course', read('public/video-admin.js').includes('c10-maths'));

// ---- server: answers in Assamese for Assamese-medium courses, and the locked-chapter fix is still there ----
const srv = read('server.js');
t('server: Assamese-medium Maths answers in Assamese, with the Assamese maths terms', srv.includes('function mathsProfile(cls, medium)') && srv.includes("medium === 'Assamese'") && srv.includes('HCF = গ.সা.গু.'));
t('server: Assamese-medium Social Science and Science answer in Assamese; other courses keep the normal profile', srv.includes('function assameseMedium(P, cls)') && srv.includes("course.medium === 'Assamese' && (course.subject === 'Social Science' || course.subject === 'Science')") && srv.includes('baseProfileFor(course)'));
t('server: translate reply for Assamese-medium courses is Assamese', srv.includes("Reply in simple Assamese (Assamese script). Keep numbers, symbols, formulas and equations in normal notation."));
t('server: the locked-chapter refusal of Recall (PR #10) is still there', srv.includes('if (!RECALL.isReady(hit.ch)) return res.status(400)'));
const ev = srv.indexOf("app.post('/api/recall/evaluate'");
t("server: Recall's AI call still uses the student's key helper", ev > 0 && srv.slice(ev, ev + 4000).includes('await geminiFor(req, '));

console.log(pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
