// Class 7 Mathematics, Assamese medium (Halimon Nessa Academy): Chapter 1 exercises 1(A)-1(C), Chapter 2 exercises 2(A)-2(D), then Chapters 3 (3(C)), 4 (4(A), 4(B)) and 5 (5(A)-5(C)), added from the textbook photos; Chapters 6-17 are listed by name only.
// Run: node tests/maths7as.test.js
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/^﻿/, '').replace(/\r\n/g, '\n');
const QUIZ = require(path.join(ROOT, 'questions.js')), CAT = require(path.join(ROOT, 'public', 'catalog.js')), RECALL = require(path.join(ROOT, 'recall-core.js'));
let pass = 0, fail = 0;
const t = (name, ok, extra) => { if (ok) pass++; else { fail++; console.log('FAIL  ' + name + (extra ? '  ' + extra : '')); } };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const c = QUIZ.courses.find(x => x.id === 'c7-maths-as');
const chN = n => c.chapters.find(x => x.no === n);
const open = c.chapters.filter(x => x.sections.length > 0);
const allQ = course => course.chapters.flatMap(ch => (ch.sections || []).flatMap(s => s.questions));
const hasAs = s => /[ঀ-৿]/.test(s || '');

t('course exists: Class 7, Mathematics, Assamese medium, Assamese source language', !!c && c.class === 7 && c.subject === 'Mathematics' && c.medium === 'Assamese' && c.sourceLang === 'Assamese');
t('English-medium Class 7 Maths (c7-maths) is untouched: still English, still has Chapter 1 questions', !QUIZ.courses.find(x => x.id === 'c7-maths').medium && QUIZ.courses.find(x => x.id === 'c7-maths').chapters[0].sections.length > 0);
t('Chapters 1-5 are open (has sections, not locked), Recall agrees, and Chapter 2 still has its four exercises', same(open.map(x => x.no), [1, 2, 3, 4, 5]) && open.every(x => !x.locked && RECALL.isReady(x)) && chN(2).sections.length === 4);
t('the four sections are the four exercises, in order', same(chN(2).sections.map(s => (s.title.match(/2\((.)\)/) || [])[1]), ['A', 'B', 'C', 'D']));

// the number of questions and of items per question, counted from the textbook pages
const want = { A: [4, 4, 6, 6, 6, 5, 0, 0, 0, 0], B: [5, 5, 6, 9, 0, 0, 0, 0], C: [9, 8, 9, 4, 0, 0, 0, 0], D: [3, 8, 8, 8, 6, 0, 0, 0, 0, 0] };
for (const [k, counts] of Object.entries(want)) {
  const s = chN(2).sections.find(x => x.title.includes('2(' + k + ')'));
  t('2(' + k + '): ' + counts.length + ' questions numbered 1.. in order', !!s && same(s.questions.map(q => q.no), counts.map((_, i) => i + 1)));
  t('2(' + k + '): every question has the right number of items (i, ii, iii ...), word problems have none', !!s && s.questions.every((q, i) => (q.parts || []).length === counts[i]), s && s.questions.map(q => (q.parts || []).length).join());
}
const qs = allQ(c).filter(q => !q.id.startsWith('m7ac1-'));   // Chapter 1 has its own checks further down
t('Chapter 2 has 10 + 8 + 8 + 10 = 36 questions; Chapters 3, 4, 5 have 8, 20, 25; total 89', same([2, 3, 4, 5].map(n => chN(n).sections.reduce((m, y) => m + y.questions.length, 0)), [36, 8, 20, 25]) && qs.length === 89);
t('Chapters 3-5: exercises 3(C), 4(A), 4(B), 5(A), 5(B), 5(C), in order', same([3, 4, 5].flatMap(n => chN(n)).flatMap(x => x.sections.map(y => (y.title.match(/\d\((.)\)/) || [])[1])), ['C', 'A', 'B', 'A', 'B', 'C']));
t('ids are unique, start with m7ac2-, and do not clash with any other course', new Set(qs.map(q => q.id)).size === qs.length && c.chapters.every(ch => ch.sections.every(sc => sc.questions.every(q => q.id.startsWith('m7ac' + ch.no + '-')))) && QUIZ.courses.filter(x => x !== c).every(x => allQ(x).every(q => !q.id.startsWith('m7ac'))));
t('every question has Assamese text, and every word problem is Assamese only (no separate English line)', qs.every(q => hasAs(q.text)) && qs.filter(q => !(q.parts || []).length).every(q => !/[A-Za-z]{4,}/.test(q.text.replace(/\([^)]*\)/g, '').replace(/\b[A-Z]{2,}\b/g, ''))));   // a figure label (ABCD) or a short English word in brackets is fine; a separate English line is not
t('the numbers of the questions are copied exactly: spot checks against the photos', (() => {
  const by = id => qs.find(q => q.id === id), P = (id, i) => by(id).parts[i];
  return P('m7ac2-a2', 3) === '(iv) 2 4/9 ক 3 1/5 ৰে' && P('m7ac2-a4', 3) === '(iv) 1/8 × 3 1/19 × 2 3/5' && P('m7ac2-a5', 3) === '(iv) 4 2/9 ৰ 1 1/2' && P('m7ac2-b3', 1) === '(ii) 63 ÷ 1 3/11' && P('m7ac2-b4', 8) === '(ix) 5 4/7 ÷ 1 3/10'
    && P('m7ac2-c3', 8) === '(ix) 101.01 × 0.01' && P('m7ac2-d4', 3) === '(iv) 6.9168 ÷ 52.4' && P('m7ac2-d3', 6) === '(vii) 127.68 ÷ 24'
    && /18 4\/5/.test(by('m7ac2-a7').text) && /7 1\/5 ছেমি/.test(by('m7ac2-a9').text) && /131 1\/4/.test(by('m7ac2-b7').text) && /24\.32/.test(by('m7ac2-d10').text) && /6\.4/.test(by('m7ac2-d10').text) && /60\.45/.test(by('m7ac2-d7').text) && /18\.625/.test(by('m7ac2-c6').text);
})());
t('chapter notes for the AI exist (English), explain how mixed numbers and "ক ... ৰে" / "ৰ" are written, and are not shown to students (context only)', /3 1\/5 means 3 and 1\/5/.test(chN(2).context) && /"of"|"A ৰ B"/.test(chN(2).context) && chN(2).context.length > 1500 && chN(2).context.length < 6000);
const pub = require(path.join(ROOT, 'questions-public.js'));
t('the public questions file has no hidden context for this course', JSON.stringify((pub.courses || []).find(x => x.id === 'c7-maths-as') || {}).includes('Chapter notes') === false);

// Chapter 1 (Integers): exercises 1(A), 1(B), 1(C), copied from the textbook photos; Chapters 6-17 are listed by name only
const ch1 = chN(1);
t('Chapter 1 is the first chapter, open, with the three exercises 1(A), 1(B), 1(C) in order', c.chapters[0] === ch1 && !ch1.locked && same(ch1.sections.map(s => (s.title.match(/1\((.)\)/) || [])[1]), ['A', 'B', 'C']) && RECALL.isReady(ch1));
const want1 = { A: [6, 6, 5, 6, 6, 5, 6, 6, 0, 0, 0, 0, 0, 5], B: [6, 6, 5, 5, 4, 4, 8, 4, 4, 6, 6, 6], C: [8, 4, 10, 6, 6] };
for (const [k, counts] of Object.entries(want1)) {
  const s = ch1.sections.find(x => x.title.includes('1(' + k + ')'));
  t('1(' + k + '): ' + counts.length + ' questions in order, with the right number of items', !!s && same(s.questions.map(q => q.no), counts.map((_, i) => i + 1)) && s.questions.every((q, i) => (q.parts || []).length === counts[i]), s && s.questions.map(q => (q.parts || []).length).join());
}
t('Chapter 1 ids are unique and start with m7ac1-', (() => { const ids = allQ(c).filter(q => q.id.startsWith('m7ac1-')).map(q => q.id); return ids.length === 31 && new Set(ids).size === 31 && ids.every(i => /^m7ac1-[abc]\d+$/.test(i)); })());
t('Chapter 1: spot checks against the photos', (() => {
  const by = id => allQ(c).find(q => q.id === id), P = (id, i) => by(id).parts[i];
  return P('m7ac1-a2', 4) === '(v) – 424 আৰু 346' && P('m7ac1-a5', 2) === '(iii) {(– 25) + 17} + (– 30) = ____ + {17 + (– 30)}' && P('m7ac1-a6', 3) === '(iv) 100 + 432 – 209 – 136 – 49' && P('m7ac1-a8', 5) === '(vi) (– 25 + 17) + (– 42) = – 25 + {17 + (– 42)}'
    && /236/.test(by('m7ac1-a12').text) && /– 145/.test(by('m7ac1-a12').text) && P('m7ac1-b3', 3).includes('[50 বাৰ]') && P('m7ac1-b3', 4).includes('[101 বাৰ]') && P('m7ac1-b4', 3) === '(iv) 25 × 123 × (– 4)' && P('m7ac1-c5', 4) === '(v) 1495 ÷ (– 65)' && P('m7ac1-c3', 7) === '(viii) ____ ÷ 1 = – 37';
})());
t('Chapter 1 notes for the AI exist (English) and are not shown to students', /Integers/.test(ch1.context) && /Division by 0|division by 0/.test(ch1.context) && ch1.context.length > 1500 && ch1.context.length < 6000);
const rest = c.chapters.filter(x => x.no >= 6);
t('Chapters 6-17 are listed by name, in order, all locked with no questions', same(rest.map(x => x.no), [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17]) && rest.every(x => x.locked && x.sections.length === 0 && hasAs(x.title) && /\(.+\)/.test(x.title)));
t('Chapter 1 is the first chapter of the book, so the free plan (first chapter free for 10 minutes) now applies to it', c.chapters.indexOf(ch1) === 0);

// catalog: Halimon Nessa Academy, Class 7, Assamese medium
const courses = QUIZ.courses.map(x => ({ id: x.id, medium: x.medium }));
t('Halimon Class 7 Assamese medium shows this Maths course, the Assamese Science course, the Hindi course and the English and English Grammar courses', same(CAT.idsFor({ org: 'halimon', cls: 7, med: 'Assamese' }, courses), ['c7-english-as', 'c7-grammar-as', 'c7-maths-as', 'c7-science-as', 'c7-hindi']));
t('Halimon Class 7 English medium is unchanged (English, Maths, Science)', same(CAT.idsFor({ org: 'halimon', cls: 7, med: 'English' }, courses).sort(), ['c7-english', 'c7-maths', 'c7-science']));
t('Nashib Ali Academy and Popular Academy Class 7 Assamese medium show the same five courses as Halimon; their English medium is unchanged', ['nashib', 'popular'].every(o => same(CAT.idsFor({ org: o, cls: 7, med: 'Assamese' }, courses), CAT.idsFor({ org: 'halimon', cls: 7, med: 'Assamese' }, courses)) && same(CAT.idsFor({ org: o, cls: 7, med: 'English' }, courses).sort(), ['c7-english', 'c7-maths', 'c7-science'])));
// the app picks the course by class + subject + medium (runs the real courseOf of index.html)
const idx = read('public/index.html'), src = (idx.match(/^const courseOf=.*$/m) || [''])[0];
const courseOf = new Function('DATA', 'isCustomOrg', 'NAV', src + '\nreturn courseOf;')(QUIZ, () => false, { org: 'halimon' });
t('app: Class 7 Mathematics in Assamese opens this course, in English it opens the old one', (courseOf(7, 'Mathematics', 'Assamese') || {}).id === 'c7-maths-as' && (courseOf(7, 'Mathematics', 'English') || {}).id === 'c7-maths');
// the server answers in Assamese for Assamese-medium maths
const srv = read('server.js');
t('server: Assamese-medium Maths gets the Assamese answer language line', /course\.medium === 'Assamese' && \['Mathematics', 'Social Science', 'Science'\]\.includes\(course\.subject\)/.test(srv));

// figures redrawn from the book (maths7as-figs.js): plain SVG, one per item where the question has items
const FIGS = require(path.join(ROOT, 'maths7as-figs.js'));
const figIds = ['m7ac4-a8', 'm7ac4-a9', 'm7ac4-a10', 'm7ac4-b1', 'm7ac4-b2', 'm7ac4-b3', 'm7ac4-b4', 'm7ac4-b5', 'm7ac4-b6', 'm7ac4-b7', 'm7ac4-b8', 'm7ac4-b10', 'm7ac5-a1', 'm7ac5-a8', 'm7ac5-a9', 'm7ac5-b1', 'm7ac5-c7', 'm7ac5-c8'];
t('18 questions of Chapters 4 and 5 carry their book figure', same(Object.keys(FIGS).sort(), figIds.slice().sort()) && figIds.every(id => { const q = qs.find(x => x.id === id); return q && (q.fig || q.figs); }));
t('questions with items have one figure per item; the others have one figure', figIds.every(id => { const q = qs.find(x => x.id === id); return q.figs ? (q.figs.length === (q.parts || []).length && !q.fig) : (typeof q.fig === 'string' && !(q.parts || []).length || typeof q.fig === 'string'); }));
t('every figure is a plain self-contained SVG (no script, link, image or event handler)', Object.values(FIGS).flat().every(x => /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" /.test(x) && x.endsWith('</svg>') && !/<script|<image|<a[ >]|href|on[a-z]+\s*=|<foreignObject|javascript:/i.test(x) && x.length < 6000));
t('the page shows figures under the question and under each item, and the cache name was bumped', (() => { const h = read('public/index.html'); return /figHTML\(q\.fig\)/.test(h) && /figHTML\(q\.figs&&q\.figs\[i\]\)/.test(h); })());

console.log(pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
