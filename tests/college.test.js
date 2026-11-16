// "Add course" is not limited to school: class 13-18 = College Year 1-4 and Master's Year 1-2. Run: node tests/college.test.js
const fs = require('fs'), path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8').replace(/^\uFEFF/, '');
const CAT = require('../public/catalog.js'), C = require('../custom-core.js'), LV = require('../levels-core.js');
let pass = 0, fail = 0;
const t = (n, ok, extra) => { if (ok) pass++; else { fail++; console.log('FAIL  ' + n + (extra ? '  ' + extra : '')); } };

// labels
t('school classes keep the old label', CAT.classLabel(1) === 'Class 1' && CAT.classLabel(10) === 'Class 10' && CAT.classLabel(12) === 'Class 12');
t('13-16 are College Year 1-4', [13, 14, 15, 16].map(CAT.classLabel).join('|') === 'College Year 1|College Year 2|College Year 3|College Year 4');
t("17 and 18 are Master's Year 1 and 2", CAT.classLabel(17) === "Master's Year 1" && CAT.classLabel(18) === "Master's Year 2");
t('isCollege is true only for 13-18', !CAT.isCollege(12) && CAT.isCollege(13) && CAT.isCollege(18) && !CAT.isCollege(19) && !CAT.isCollege(null));
t('MAX_CLASS is 18', CAT.MAX_CLASS === 18);

// server accepts college classes for a custom question, and still refuses nonsense
const base = { text: 'What is the work-energy theorem?', cls: 14, subject: 'Physics', chapter: 'Mechanics', lang: 'English', medium: 'English' };
t('college year 2 is accepted', !!C.sanitizeCq(base));
t('every class from 1 to 18 is accepted', Array.from({ length: 18 }, (_, i) => i + 1).every(n => !!C.sanitizeCq({ ...base, cls: n })));
t('0 and 19 and a decimal are refused', [0, 19, 7.5, -3, 'abc'].every(n => C.sanitizeCq({ ...base, cls: n }) === null));
t('the custom course object keeps the college class', C.sanitizeCq(base).course.class === 14);

// AI prompts: school wording stays for school, college wording for college
const school = C.customProfile(8, 'Science', 'English'), col = C.customProfile(14, 'Physics', 'English');
const all = p => Object.values(p).map(v => typeof v === 'string' ? v : JSON.stringify(v)).join('\n');
t('school prompt is unchanged: Class 8, school students', /Class 8 Science tutor for school students in India/.test(school.answer) && /school exam answer/.test(school.answer));
t('college prompt names the college year and college students', /College Year 2 Physics tutor for college and university students in India/.test(col.answer));
t('college prompt does not say school', !/school students|school exam|school study/.test(col.answer + col.more));
t('college prompt asks for a college level answer', /at College Year 2 level/.test(col.answer) && /College Year 2 level/.test(col.more));
t('the "not a study question" reply says college', /Ye college ka sawaal nahi lagta/.test(col.answer) && /Ye school ka sawaal nahi lagta/.test(school.answer));
t('photo prompts name the college year', /^College Year 2 Physics, chapter "Mechanics"/.test(C.buildExtractPrompt({ cls: 14, subject: 'Physics', chapter: 'Mechanics', lang: 'English' })) && /^Class 8 Science/.test(C.buildExtractPrompt({ cls: 8, subject: 'Science', chapter: '', lang: 'English' })));

// language level of AI text
t('levels: class 13+ is the college band', LV.band(13) === 'college' && LV.band(18) === 'college' && LV.band(12) === 'high' && LV.band(3) === 'low');
t('levels: college hint talks about college or university', /college or university/.test(LV.styleHint(15)));
t('levels: story and example prompts work for college', /college or university/.test(LV.extraPrompt('story', 15)) && /college or university/.test(LV.extraPrompt('example', 15)));

// Firestore rules and the form
const rules = read('firestore.rules'), form = read('public/custom-course.js');
t('rules accept custom courses up to class 18', /d\['class'\] >= 1 && d\['class'\] <= 18/.test(rules));
t('the form has a College / University group with 6 years', /optgroup label="College \/ University"/.test(form) && /length: 6/.test(form) && /i \+ 13/.test(form));
t('the form checks class 1 to MAX_CLASS (18)', /cls >= 1 && cls <= MAX_CLASS/.test(form) && /MAX_CLASS = 18/.test(form));
t('titles use the label (no hard-coded "Class" for custom courses)', !/\$\{d\.org\} · Class \$\{d\.class\}/.test(form));

console.log(pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
