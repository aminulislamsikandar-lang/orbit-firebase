// Class 7 Hindi (Halimon Nessa Academy, Assamese medium): Chapter 1 and Chapter 2 exercises "अभ्यास-माला" from the textbook photos, Chapters 3-16 listed by name only.
// Run: node tests/hindi7.test.js
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
const QUIZ = require(path.join(ROOT, 'questions.js')), CAT = require(path.join(ROOT, 'public', 'catalog.js')), RECALL = require(path.join(ROOT, 'recall-core.js'));
let pass = 0, fail = 0;
const t = (name, ok, extra) => { if (ok) pass++; else { fail++; console.log('FAIL  ' + name + (extra ? '  ' + extra : '')); } };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const c = QUIZ.courses.find(x => x.id === 'c7-hindi');
const allQ = course => course.chapters.flatMap(ch => (ch.sections || []).flatMap(s => s.questions));
const hasDev = s => /[\u0900-\u097F]/.test(s || '');

t('course exists: Class 7, Hindi, Assamese medium, Hindi source language', !!c && c.class === 7 && c.subject === 'Hindi' && c.medium === 'Assamese' && c.sourceLang === 'Hindi');
t('Class 6 Hindi (c6-hindi) is untouched', !!QUIZ.courses.find(x => x.id === 'c6-hindi') && QUIZ.courses.find(x => x.id === 'c6-hindi').class === 6);
t('the book has 16 chapters, numbered 1..16 in order, in Devanagari', same(c.chapters.map(x => x.no), Array.from({ length: 16 }, (_, i) => i + 1)) && c.chapters.every(x => hasDev(x.title)));
t('chapter titles match the contents page (पाठ-सूची)', c.chapters[0].title === 'हम प्रभात की नई किरण हैं' && c.chapters[1].title === 'पंचतंत्र' && c.chapters[2].title === 'असम का वृन्दावन' && c.chapters[9].title === 'कल्पना चावला' && c.chapters[15].title === 'भारत का राष्ट्रीय खेल : हॉकी');
const ch1 = c.chapters[0], ch2 = c.chapters[1];
t('Chapters 1 and 2 are open, Recall agrees, and Chapter 1 is the first chapter (free plan applies to it)', [ch1, ch2].every(x => !x.locked && RECALL.isReady(x)) && c.chapters.indexOf(ch1) === 0);
const q1 = allQ(c).filter(q => q.id.startsWith('h7c1-')), q2 = allQ(c).filter(q => q.id.startsWith('h7c2-'));
t('Chapter 1 has the reading item (no. 1, passage + 3 questions) and the book questions 2, 3, 4, 5, 7 with 4, 8, 0, 8 and 6 items', same(q1.map(q => q.no), [1, 2, 3, 4, 5, 7]) && same(q1.map(q => (q.parts || []).length), [4, 4, 8, 0, 8, 6]));
t('Chapter 2 has the reading item (no. 9, passage + 4 questions) first and the book questions 1 to 8 with 11, 5, 2, 2, 15, 8, 3 and 3 items', same(q2.map(q => q.no), [9, 1, 2, 3, 4, 5, 6, 7, 8]) && same(q2.map(q => (q.parts || []).length), [5, 11, 5, 2, 2, 15, 8, 3, 3]));
t('ids are unique, start with h7c<chapter>-, and do not clash with any other course', (() => { const ids = allQ(c).map(q => q.id); return new Set(ids).size === ids.length && ids.length === 15 && QUIZ.courses.filter(x => x !== c).every(x => allQ(x).every(q => !q.id.startsWith('h7c'))); })());
t('every book question is in Hindi (Devanagari); only the two reading items are in Assamese', allQ(c).filter(q => !q.id.includes('-r')).every(q => hasDev(q.text) && (q.parts || []).every(hasDev)));
t('spot checks against the photos', (() => {
  const P = (qs, n, i) => qs.find(q => q.no === n && !q.id.includes('-r')).parts[i];
  return P(q1, 2, 1).startsWith('(ii) प्रताप और शिवा कौन थे?') && P(q1, 3, 4).includes('हम नवीन भारत के सैनिक') && P(q1, 3, 7).includes('कौन-से गुण धारण करने के लिये') && P(q1, 5, 3) === 'अभिराम' && P(q1, 7, 5) === 'प्रहरी'
    && P(q2, 1, 8).includes('कितने भागों में विभक्त') && P(q2, 1, 10) === 'xi) पंचतन्त्र के लेखक कौन हैं?' && P(q2, 2, 3).startsWith('iv) राजा की बातों से विष्णुशर्मा को क्यों गुस्सा आया?') && P(q2, 3, 0).includes('अस्सी साल') && /लक्ष्मीनाथ बेजबरुवा/.test(P(q2, 4, 0)) && /कीर्तनघोषा/.test(P(q2, 4, 1))
    && P(q2, 5, 14) === 'तरल' && P(q2, 6, 7) === 'प्रसन्न' && P(q2, 7, 2).includes('कक्षा में सुनाओ') && /खा, पढ़, जा/.test(q2.find(q => q.no === 8).text);
})());
t('Assamese reading (পঠন-বোধ): each chapter has a summary in Assamese (own words, not a translation of the lesson) and Hindi questions', (() => {
  const r1 = q1.find(q => q.id === 'h7c1-r1'), r2 = q2.find(q => q.id === 'h7c2-r9'), asm = s => /[\u0980-\u09FF]/.test(s);
  return !!r1 && !!r2 && asm(r1.text) && asm(r1.parts[0]) && asm(r2.parts[0]) && r1.parts[0].startsWith('সাৰাংশ :') && r1.parts[0].length > 250 && r1.parts[0].length < 700 && r2.parts[0].length > 350 && r2.parts[0].length < 900 && r1.parts.slice(1).every(hasDev) && r2.parts.slice(1).every(hasDev) && r2.parts[0].includes('পঞ্চতন্ত্ৰ');
})());
t('word meanings (शब्दार्थ) are listed: 8 for Chapter 1 and 7 for Chapter 2', ch1.words.length === 8 && ch1.words[0][0] === 'आलोक' && ch1.words[0][1] === 'प्रकाश' && ch2.words.length === 7 && ch2.words[6][0] === 'तरकीब' && ch2.words[6][1] === 'उपाय');
t('the lesson text itself is not stored; Chapter 1 and 2 notes for the AI exist (English with Hindi words)', !ch1.lesson && !ch2.lesson && /Dinkar/.test(ch1.context) && /Vishnusharma/.test(ch2.context) && ch1.context.length > 2000 && ch2.context.length > 3500 && ch2.context.length < 12000);
t('Chapter 2 notes include the verb-form table and the matching answers', /खाया होगा/.test(ch2.context) && /जायेगा/.test(ch2.context) && /Budhi Aair Sadhu/.test(ch2.context));
const rest = c.chapters.slice(2);
t('Chapters 3-16 are listed by name, all locked with no questions', rest.length === 14 && rest.every(x => x.locked && x.sections.length === 0));
t('grammar sections carry a topic for the "explain" button', c.chapters.flatMap(ch => ch.sections).filter(s => s.rules).every(s => s.rules.kind === 'grammar' && s.rules.topic.length > 10) && c.chapters.flatMap(ch => ch.sections).filter(s => s.rules).length === 3);
t('catalog: Halimon Class 7 Assamese medium shows the Hindi course, English medium is unchanged', CAT.idsFor({ org: 'halimon', cls: 7, med: 'Assamese' }, QUIZ.courses.map(x => ({ id: x.id, medium: x.medium }))).includes('c7-hindi') && same(CAT.idsFor({ org: 'halimon', cls: 7, med: 'English' }, QUIZ.courses.map(x => ({ id: x.id, medium: x.medium }))).sort(), ['c7-english', 'c7-maths', 'c7-science']));
const idx = read('public/index.html'), src = (idx.match(/^const courseOf=.*$/m) || [''])[0];
const courseOf = new Function('DATA', 'isCustomOrg', 'NAV', src + '\nreturn courseOf;')(QUIZ, () => false, { org: 'halimon' });
t('app: Class 7 Hindi in Assamese medium opens this course, Class 6 Hindi still opens the old one', (courseOf(7, 'Hindi', 'Assamese') || {}).id === 'c7-hindi' && (courseOf(6, 'Hindi', 'English') || {}).id === 'c6-hindi');
t('server: Hindi subject uses the Hindi tutor profile and Hindi answers', /course\.subject === 'Hindi' \? hindiProfile\(course\.class\)/.test(read('server.js')));
console.log(pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
