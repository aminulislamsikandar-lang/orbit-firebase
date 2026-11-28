// Class 7 General Science, Assamese medium (Halimon Nessa Academy): Chapters 1, 2, 3, 4 and 5 exercises "প্ৰশ্নাৱলী" from the textbook photos, Chapters 6-18 listed by name only.
// Run: node tests/science7as.test.js
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
const QUIZ = require(path.join(ROOT, 'questions.js')), CAT = require(path.join(ROOT, 'public', 'catalog.js')), RECALL = require(path.join(ROOT, 'recall-core.js'));
let pass = 0, fail = 0;
const t = (name, ok, extra) => { if (ok) pass++; else { fail++; console.log('FAIL  ' + name + (extra ? '  ' + extra : '')); } };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const c = QUIZ.courses.find(x => x.id === 'c7-science-as');
const hasAs = s => /[\u0980-\u09FF]/.test(s || '');
const allQ = course => course.chapters.flatMap(ch => (ch.sections || []).flatMap(s => s.questions));

t('course exists: Class 7, Science, Assamese medium, Assamese source language', !!c && c.class === 7 && c.subject === 'Science' && c.medium === 'Assamese' && c.sourceLang === 'Assamese');
t('English Class 7 Science (c7-science) is untouched: still English, still has Chapter 1 questions', !QUIZ.courses.find(x => x.id === 'c7-science').medium && QUIZ.courses.find(x => x.id === 'c7-science').chapters[0].sections.length > 0);
t('the book has 18 chapters, numbered 1..18 in order', !!c && same(c.chapters.map(x => x.no), Array.from({ length: 18 }, (_, i) => i + 1)));
const ch1 = c.chapters[0];
t('Chapter 1 is open (not locked), has one exercise section and Recall agrees; it is the first chapter, so the free plan applies to it', !ch1.locked && ch1.sections.length === 1 && RECALL.isReady(ch1) && c.chapters.indexOf(ch1) === 0);
const ch2 = c.chapters[1];
const qs = allQ(c).filter(q => q.id.startsWith('s7ac1-'));   // Chapters 2 to 5 have their own checks further down
t('Chapter 1 has 5 questions numbered 1..5 with 5, 4, 5, 5 and 0 items', same(qs.map(q => q.no), [1, 2, 3, 4, 5]) && same(qs.map(q => (q.parts || []).length), [5, 4, 5, 5, 0]));
t('ids are unique, start with s7ac1-, and do not clash with any other course', new Set(qs.map(q => q.id)).size === qs.length && qs.every(q => q.id.startsWith('s7ac1-')) && QUIZ.courses.filter(x => x !== c).every(x => allQ(x).every(q => !q.id.startsWith('s7ac'))));
t('every question is in Assamese', qs.every(q => hasAs(q.text) && (q.parts || []).every(hasAs)));
t('spot checks against the photos', (() => {
  const P = (n, i) => qs[n - 1].parts[i];
  return P(1, 0).startsWith('i) সালোকসংশ্লেষণ কৰা উদ্ভিদৰ পৰিপুষ্টিক') && P(1, 4) === 'v) কলচী উদ্ভিদ এবিধ ______ উদ্ভিদ।' && /a\) স্বপোষী উদ্ভিদ.*d\) মৃতজীৱী উদ্ভিদ/.test(P(2, 0)) && /গ্লুক'জ/.test(P(2, 3)) && /ম'ন'ট্ৰপা/.test(P(2, 1))
    && P(3, 1) === 'ii) পাতক গছৰ ৰান্ধনি ঘৰ বুলি কিয় কোৱা হয়?' && P(4, 3).includes('আকাশীলতা') && /ইংৰাজী প্ৰতিশব্দ/.test(qs[4].text);
})());
t('Chapter 1 notes for the AI exist (English) and explain autotrophic and heterotrophic nutrition', /autotrophic/.test(ch1.context) && /heterotrophic/i.test(ch1.context) && ch1.context.length > 1500 && ch1.context.length < 7000);
const rest = c.chapters.slice(5);
t('Chapters 6-18 are listed by name, all locked with no questions', rest.length === 13 && rest.every(x => x.locked && x.sections.length === 0 && hasAs(x.title)) && rest[0].title === 'আমাৰ কাপোৰ' && rest[12].title === 'বৰ্জিত পানীৰ ব্যৱস্থাপনা');
// Chapter 2: Use of food in the body, exercise প্ৰশ্নাৱলী (pages 22-24 of the book)
const q2 = allQ(c).filter(q => q.id.startsWith('s7ac2-'));
t('Chapter 2 is open with one exercise section, Recall agrees, and its title is the book title', !ch2.locked && ch2.sections.length === 1 && RECALL.isReady(ch2) && ch2.title.startsWith('শৰীৰত খাদ্যৰ ব্যৱহাৰ'));
t('Chapter 2 has 7 questions numbered 1..7 with 6, 6, 5, 5, 8, 2 and 0 items', same(q2.map(q => q.no), [1, 2, 3, 4, 5, 6, 7]) && same(q2.map(q => (q.parts || []).length), [6, 6, 5, 5, 8, 2, 0]));
t('Chapter 2 ids are unique and start with s7ac2-, and every question is in Assamese', new Set(q2.map(q => q.id)).size === 7 && q2.every(q => hasAs(q.text) && (q.parts || []).every(hasAs)));
t('Chapter 2: spot checks against the photos', (() => {
  const P = (n, i) => q2[n - 1].parts[i];
  return P(1, 3).startsWith('iv) ক্ষুদ্ৰান্ত্ৰৰ ভিতৰৰ বেৰখনত') && P(2, 1) === 'ii) ৰোমন্থক প্ৰাণীৰ পাকস্থলীত চাৰিটা কোঠালি থাকে।' && /a\) ছেদক.*d\) কৃন্তক/.test(P(3, 0)) && /d\) গ্ৰাসননলীত/.test(P(3, 3)) && /হাঁওফাঁও/.test(P(3, 4))
    && P(4, 4) === 'e) মানুহৰ জিভাত থকা স্বাদকলিবোৰৰ কাৰ্য্য কি?' && P(5, 1) === 'b) পাগুলি খোৱা মানে কি বুজা?' && P(5, 7).startsWith('h) চিত্ৰৰ সহায়ত') && /অগ্ন্যাশয়.*স্নেহপদাৰ্থ/.test(P(6, 0)) && /ফেটি এছিড আৰু গ্লিচাৰল.*খাদ্যৰ সম্পূৰ্ণ শোষণ/.test(P(6, 1)) && /ইংৰাজী প্ৰতিশব্দ/.test(q2[6].text);
})());
t('Chapter 2 notes for the AI exist (English), cover digestion, teeth, ruminants and amoeba, and are not shown to students', /digestive system/.test(ch2.context) && /Ruminants/.test(ch2.context) && /Amoeba/.test(ch2.context) && ch2.context.length > 3000 && ch2.context.length < 8000);

// Chapter 3: শ্বাস-প্ৰশ্বাস (The Breath of Life), exercise প্ৰশ্নাৱলী (pages 34-35 of the book)
const ch3 = c.chapters[2], q3 = allQ(c).filter(q => q.id.startsWith('s7ac3-'));
t('Chapter 3 is open with one exercise section, Recall agrees, and its title is the book title', !ch3.locked && ch3.sections.length === 1 && RECALL.isReady(ch3) && ch3.title.startsWith('শ্বাস-প্ৰশ্বাস') && ch3.title.includes('The Breath of Life'));
t('Chapter 3 has 7 questions numbered 1..7 with 5, 5, 5, 5, 4, 2 and 0 items', same(q3.map(q => q.no), [1, 2, 3, 4, 5, 6, 7]) && same(q3.map(q => (q.parts || []).length), [5, 5, 5, 5, 4, 2, 0]));
t('Chapter 3 ids are unique and start with s7ac3-, and every question is in Assamese', new Set(q3.map(q => q.id)).size === 7 && q3.every(q => hasAs(q.text) && (q.parts || []).every(hasAs)));
t('Chapter 3: spot checks against the photos', (() => {
  const P = (n, i) => q3[n - 1].parts[i];
  return P(1, 0).startsWith('a) কোষীয় শ্বসনত খাদ্যৰ') && P(1, 4).includes('মেংগ্ৰভ') && /a\) হাইড্ৰ'ক্ল'ৰিক এছিড.*d\) লেক্টিক এছিড/.test(P(2, 0)) && /d\) উঠা-নমা কৰি থাকে/.test(P(2, 1)) && /c\) কেৱল জলীয় বাষ্প থাকে.*d\) আটাইবোৰ থাকে/.test(P(2, 2)) && /কেঁচুৱে/.test(P(2, 3)) && /d\) পত্ৰৰন্ধ্ৰ/.test(P(2, 4))
    && P(3, 4).startsWith('e) শ্বাস-প্ৰশ্বাসৰ বাবে ভেকুলীয়ে') && P(4, 3) === 'd) আমি হাঁচি আৰু কাহ মাৰোঁ কিয়?' && P(5, 1).includes('চাৰিটা প্ৰভেদ') && P(6, 1).startsWith('b) শিহু, তিমি') && /ইংৰাজী প্ৰতিশব্দ/.test(q3[6].text);
})());
t('Chapter 3 notes for the AI exist (English), cover aerobic and anaerobic respiration, breathing, animals and plants', /Aerobic respiration/.test(ch3.context) && /diaphragm/.test(ch3.context) && /mangrove/i.test(ch3.context) && ch3.context.length > 3500 && ch3.context.length < 9000);

// Chapter 4: প্ৰাণী আৰু উদ্ভিদত দ্ৰব্যৰ পৰিবহণ (Transportation in animals and plants), exercise প্ৰশ্নাৱলী (pages 45-46 of the book)
const ch4 = c.chapters[3], q4 = allQ(c).filter(q => q.id.startsWith('s7ac4-'));
t('Chapter 4 is open with one exercise section, Recall agrees, and its title is the book title', !ch4.locked && ch4.sections.length === 1 && RECALL.isReady(ch4) && ch4.title.startsWith('প্ৰাণী আৰু উদ্ভিদত দ্ৰব্যৰ পৰিবহণ') && ch4.title.includes('Transportation in animals and plants'));
t('Chapter 4 has 5 questions numbered 1..5 with 5, 5, 5, 10 and 0 items', same(q4.map(q => q.no), [1, 2, 3, 4, 5]) && same(q4.map(q => (q.parts || []).length), [5, 5, 5, 10, 0]));
t('Chapter 4 ids are unique and start with s7ac4-, and every question is in Assamese', new Set(q4.map(q => q.id)).size === 5 && q4.every(q => hasAs(q.text) && (q.parts || []).every(hasAs)));
t('Chapter 4: spot checks against the photos', (() => {
  const P = (n, i) => q4[n - 1].parts[i];
  return P(1, 0) === 'a) তেজ প্ৰধানকৈ ______ অংশেৰে গঠিত।' && P(1, 3).includes('উদ্ভিদৰ সংবহন তন্ত্ৰ') && /a\) জাইলেম.*d\) পত্ৰৰন্ধ্ৰ/.test(P(2, 0)) && /c\) লোহিত ৰক্তকণিকা  d\) ওপৰৰ আটাইবোৰ/.test(P(2, 1)) && /d\) চাৰিটা/.test(P(2, 2)) && /c\) ইউৰিয়া/.test(P(2, 4))
    && P(3, 4).startsWith('e) কৃত্ৰিম উপায়ে যন্ত্ৰৰ সহায়ত') && P(4, 4) === "e) হিম'গ্লবিন কি? ইয়াৰ কাম কি?" && P(4, 7) === 'h) বৃক্কৰ কাৰ্য্যৰ বিষয়ে চমুকৈ লিখা।' && P(4, 9) === 'j) প্ৰস্বেদন কাক বোলে? ইয়াৰ গুৰুত্ব কি?' && /ইংৰাজী প্ৰতিশব্দ/.test(q4[4].text);
})());
t('Chapter 4 notes for the AI exist (English), cover blood, heart, excretion, xylem/phloem and transpiration', /haemoglobin/.test(ch4.context) && /four chambers/.test(ch4.context) && /Dialysis/.test(ch4.context) && /Transpiration/.test(ch4.context) && ch4.context.length > 4500 && ch4.context.length < 10000);

// Chapter 5: উদ্ভিদৰ প্ৰজনন আৰু বংশবিস্তাৰ (Reproduction in plants), exercise প্ৰশ্নাৱলী (pages 54-55 of the book)
const ch5 = c.chapters[4], q5 = allQ(c).filter(q => q.id.startsWith('s7ac5-'));
t('Chapter 5 is open with one exercise section, Recall agrees, and its title is the book title', !ch5.locked && ch5.sections.length === 1 && RECALL.isReady(ch5) && ch5.title.startsWith('উদ্ভিদৰ প্ৰজনন আৰু বংশবিস্তাৰ') && ch5.title.includes('Reproduction in plants'));
t('Chapter 5 has 5 questions numbered 1..5 with 5, 3, 5, 2 and 0 items', same(q5.map(q => q.no), [1, 2, 3, 4, 5]) && same(q5.map(q => (q.parts || []).length), [5, 3, 5, 2, 0]));
t('Chapter 5 ids are unique and start with s7ac5-, and every question is in Assamese', new Set(q5.map(q => q.id)).size === 5 && q5.every(q => hasAs(q.text) && (q.parts || []).every(hasAs)));
t('Chapter 5: spot checks against the photos', (() => {
  const P = (n, i) => q5[n - 1].parts[i];
  return /a\) ডাল  b\) পাত  c\) মুকুল  d\) ফুল/.test(P(1, 0)) && /a\) নিষেচন.*d\) মুকুলন/.test(P(1, 1)) && /a\) শুল্কপত্ৰ  b\) গাঁঠি  c\) মুকুল  d\) শিপা/.test(P(1, 2)) && /d\) ফল/.test(P(1, 3)) && /d\) গৰ্ভাশয়/.test(P(1, 4))
    && P(2, 0).startsWith('i) পুংকেশৰৰ পৰাগৰেণু গৰ্ভমুণ্ডত থিতাপি') && P(2, 2).startsWith('iii) উদ্ভিদদেহৰ অংশৰ পৰা নিষেচন নোহোৱাকৈ') && P(3, 1) === 'ii) স্বপৰাগযোগ আৰু ইতৰ পৰাগযোগৰ পাৰ্থক্য লিখা।' && P(3, 4) === 'v) মানুহে কিদৰে বীজৰ বিস্তাৰণ ঘটাব পাৰে?' && P(4, 0).includes('অংগজ প্ৰজনন') && /ইংৰাজী প্ৰতিশব্দ/.test(q5[4].text);
})());
t('Chapter 5 notes for the AI exist (English), cover vegetative propagation, flower parts, pollination, fertilisation and seed dispersal', /Vegetative propagation/.test(ch5.context) && /Pollination/.test(ch5.context) && /Fertilisation/.test(ch5.context) && /Seed dispersal/.test(ch5.context) && ch5.context.length > 5000 && ch5.context.length < 11000);
const pub = require(path.join(ROOT, 'questions-public.js'));
t('the public questions file has no hidden context for this course', JSON.stringify((pub.courses || []).find(x => x.id === 'c7-science-as') || {}).includes('Chapter notes') === false);
t('Halimon Class 7 Assamese medium shows this course, Halimon Class 7 English medium is unchanged', CAT.idsFor({ org: 'halimon', cls: 7, med: 'Assamese' }, QUIZ.courses.map(x => ({ id: x.id, medium: x.medium }))).includes('c7-science-as') && same(CAT.idsFor({ org: 'halimon', cls: 7, med: 'English' }, QUIZ.courses.map(x => ({ id: x.id, medium: x.medium }))).sort(), ['c7-english', 'c7-maths', 'c7-science']));
const idx = read('public/index.html'), src = (idx.match(/^const courseOf=.*$/m) || [''])[0];
const courseOf = new Function('DATA', 'isCustomOrg', 'NAV', src + '\nreturn courseOf;')(QUIZ, () => false, { org: 'halimon' });
t('app: Class 7 Science in Assamese opens this course, in English it opens the old one', (courseOf(7, 'Science', 'Assamese') || {}).id === 'c7-science-as' && (courseOf(7, 'Science', 'English') || {}).id === 'c7-science');
const srv = read('server.js');
t('server: Assamese-medium Science gets the Assamese answer language line', /course\.medium === 'Assamese' && \['Mathematics', 'Social Science', 'Science'\]\.includes\(course\.subject\)/.test(srv));
console.log(pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
