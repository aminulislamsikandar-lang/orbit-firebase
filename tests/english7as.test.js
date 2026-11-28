// Class 7 English and English Grammar, Assamese medium (Halimon Nessa Academy): the lessons (c7-english-as) and the grammar parts (c7-grammar-as) are separate subjects.
// Run: node tests/english7as.test.js
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
const QUIZ = require(path.join(ROOT, 'questions.js')), CAT = require(path.join(ROOT, 'public', 'catalog.js')), RECALL = require(path.join(ROOT, 'recall-core.js'));
let pass = 0, fail = 0;
const t = (name, ok, extra) => { if (ok) pass++; else { fail++; console.log('FAIL  ' + name + (extra ? '  ' + extra : '')); } };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const E = QUIZ.courses.find(x => x.id === 'c7-english-as'), G = QUIZ.courses.find(x => x.id === 'c7-grammar-as');
const allQ = course => course.chapters.flatMap(ch => (ch.sections || []).flatMap(s => s.questions));

t('English course: Class 7, subject English, Assamese medium', !!E && E.class === 7 && E.subject === 'English' && E.medium === 'Assamese');
t('Grammar course: Class 7, subject English Grammar (its own subject), Assamese medium', !!G && G.class === 7 && G.subject === 'English Grammar' && G.medium === 'Assamese');
t('the other Class 7 English (c7-english, The Blue Bird) and Class 6 grammar are untouched', QUIZ.courses.find(x => x.id === 'c7-english').chapters[0].title === 'The Blue Bird' && !QUIZ.courses.find(x => x.id === 'c7-english').medium && QUIZ.courses.find(x => x.id === 'c7-grammar-as') !== QUIZ.courses.find(x => x.id === 'c6-grammar'));
t('the book has 16 lessons, numbered 1..16, titles from the contents page', E.chapters.length === 16 && same(E.chapters.map(x => x.no), Array.from({ length: 16 }, (_, i) => i + 1)) && E.chapters[0].title === 'Love for Animals' && E.chapters[1].title === 'The Quarrel' && E.chapters[2].title === 'The Adventures of Tom Sawyer' && E.chapters[3].title === 'Revision Test 1' && E.chapters[5].title === 'Stopping by Woods on a Snowy Evening' && E.chapters[13].title === 'The Longest Train Journey' && E.chapters[15].title === 'Revision Test 4');
t('Lessons 1, 2 and 3 are open and Recall agrees; Lesson 1 is first (free plan applies); Lessons 4-16 are locked with no questions', [0, 1, 2].every(i => RECALL.isReady(E.chapters[i])) && E.chapters.slice(3).every(x => x.locked && x.sections.length === 0));
const eq = allQ(E), e1 = eq.filter(q => q.id.startsWith('e7ac1-')), e2 = eq.filter(q => q.id.startsWith('e7ac2-')), e3 = eq.filter(q => q.id.startsWith('e7ac3-'));
t('Lesson 1: two "before you read" items and Comprehension Q1-Q5 with 6, 0, 0, 10 and 14 items; Lesson 2: one question with 7 items', e1.length === 7 && same(e1.slice(2).map(q => (q.parts || []).length), [6, 0, 0, 10, 14]) && e2.length === 1 && e2[0].parts.length === 7);
t('Lesson 3: two "before you read" items and Comprehension Q1-Q5 with 7, 0, 0, 4 and 5 items', e3.length === 7 && same(e3.slice(2).map(q => (q.parts || []).length), [7, 0, 0, 4, 5]));
t('Lesson 3 spot checks against the photos', (() => {
  const c = e3.filter(q => q.id.startsWith('e7ac3-c'));
  return e3[1].text === 'Have you read any book of Mark Twain?' && c[0].parts[0] === 'a) Who was searching for Tom?' && c[0].parts[6] === 'g) What did he give Tom in return?' && c[1].text === 'How did Tom start his work?' && c[2].text === 'What did Tom collect at the end of the day?' && c[3].parts[3] === 'd) At the end of the day the fence had been whitewashed twice.' && c[4].parts.join('|') === 'get hold of|catch hold of|fly down|come up|search for';
})());
t('Lesson 3 notes for the AI exist (summary, writer, word notes) and keep the grammar out', /Aunt Polly/.test(E.chapters[2].context) && /Mark Twain/.test(E.chapters[2].context) && /whitewashed thrice/.test(E.chapters[2].context) && !/Distributive adjectives/.test(E.chapters[2].context) && E.chapters[2].context.length > 3000 && E.chapters[2].context.length < 9000);
t('English ids are unique, start with e7ac, and do not clash with any other course', new Set(eq.map(q => q.id)).size === eq.length && QUIZ.courses.filter(x => x !== E && x !== G).every(x => allQ(x).every(q => !q.id.startsWith('e7ac') && !q.id.startsWith('g7ac'))));
t('English spot checks against the photos', (() => {
  const c = e1.filter(q => q.id.startsWith('e7ac1-c'));
  return c[0].parts[0] === "a) Who formed 'Animal Lovers'?" && c[0].parts[5] === 'f) Which animals were the sufferers during that flood?' && c[1].text === "What animals have the members of 'Animal Lovers' adopted till now?" && c[3].parts[9] === 'caw' && c[4].parts[13] === 'protect' && e2[0].parts[6] === 'vii) Find out some rhyming words from the poem.' && e1[0].text === 'Do you feel sympathy for any ailing animals?';
})());
t('English notes for the AI exist, are a summary, and do not contain the grammar', /Barun/.test(E.chapters[0].context) && /Farjeon/.test(E.chapters[1].context) && !/Reflexive pronouns/.test(E.chapters[0].context) && E.chapters[0].context.length > 3500 && E.chapters[0].context.length < 9000);
t('Grammar: chapters for Lesson 1 (5 sections) and Lesson 3 (2 sections); the chapter number is the lesson number', same(G.chapters.map(x => x.no), [1, 3]) && G.chapters[0].sections.length === 5 && G.chapters[1].sections.length === 2 && G.chapters.every(x => RECALL.isReady(x) && !x.locked));
const gq = allQ(G).filter(q => q.id.startsWith('g7ac1-')), g3q = allQ(G).filter(q => q.id.startsWith('g7ac3-'));
t('Grammar questions: Activity 1 (14 items), Activity 2 (10), Activity 3 (10), 2 letter-writing activities, vocabulary fill-in (18 items)', same(gq.map(q => (q.parts || []).length), [14, 10, 10, 0, 0, 18]));
t('Grammar ids are unique and start with g7ac1-', new Set(gq.map(q => q.id)).size === 6 && gq.every(q => q.id.startsWith('g7ac1-')) && new Set(allQ(G).map(q => q.id)).size === 8);
t('Grammar spot checks against the photos', gq[0].parts[3] === 'iv) Her frock is as colourful as theirs.' && gq[0].parts[13] === 'xiv) This is the man whom I met at the station.' && gq[1].parts[1] === 'ii) (Have you ever been / Have you been going) to Mussoorie?' && gq[1].parts[9].startsWith('x) I (have not received') && gq[2].parts[9] === 'x) Kanak runs fast.' && /Orang National Park/.test(gq[4].text) && /paternal uncle/.test(gq[4].text) && /cousin/.test(gq[3].text) && gq[5].parts[0].startsWith('1. The lady was as proud as a ____.') && gq[5].parts[17].startsWith('18. The matter is as clear as'));
t('Grammar Lesson 3: Activity 1 (adjectives, items i and ii seen so far) and Activity 3 (change the narration, 10 items), ids g7ac3-', same(g3q.map(q => (q.parts || []).length), [2, 10]) && g3q.every(q => q.id.startsWith('g7ac3-')) && g3q[0].parts[1] === 'ii) These dishes are prepared with fresh tomatoes.' && g3q[1].parts[0] === 'i) Sankar said to me, "I have lost my pen."' && g3q[1].parts[9] === 'x) The teacher said, "Water flows downward."' && g3q[1].parts[5].includes('violin for two years'));
t('Grammar sections carry rules topics (grammar for pronoun, tenses, vocabulary, adjectives, speech; writing for the letters)', G.chapters.flatMap(ch => ch.sections).map(s => s.rules && s.rules.kind).join() === 'grammar,grammar,grammar,writing,grammar,grammar,grammar' && G.chapters.flatMap(ch => ch.sections).every(s => s.rules.topic.length > 10));
t('Grammar Lesson 3 notes for the AI: adjectives (8 kinds), direct and indirect speech rules and exceptions, tense table, phrasal verbs, idioms, and the missing page 25 noted', ['Adjectives of quality', 'Possessive adjectives', 'Direct and indirect speech', 'Exception', 'would / should', 'break up', 'a red alert', 'Page 25'].every(k => G.chapters[1].context.toLowerCase().includes(k.toLowerCase())) && G.chapters[1].context.length > 6000 && G.chapters[1].context.length < 14000);
t('Grammar notes for the AI cover the 9 kinds of pronouns, tenses, phrasal verbs, idioms, letters and similes', ['Reflexive pronouns', 'Relative pronouns', 'going to', 'Phrasal verbs', 'Idioms', 'Letter writing', 'peacock'].every(k => G.chapters[0].context.includes(k)) && G.chapters[0].context.length > 5000 && G.chapters[0].context.length < 12000);
const ids = (med, cls = 7) => CAT.idsFor({ org: 'halimon', cls, med }, QUIZ.courses.map(x => ({ id: x.id, medium: x.medium })));
t('catalog: both courses are shown for Halimon Class 7 Assamese medium, English medium is unchanged', ids('Assamese').slice(0, 2).join() === 'c7-english-as,c7-grammar-as' && same(ids('English').sort(), ['c7-english', 'c7-maths', 'c7-science']));
t('catalog labels: the grammar course is listed as "English Grammar", the lessons as "English"', JSON.stringify(read('public/catalog.js')).includes("['c7-english-as', 'English'], ['c7-grammar-as', 'English Grammar']"));
const idx = read('public/index.html'), src = (idx.match(/^const courseOf=.*$/m) || [''])[0];
const courseOf = new Function('DATA', 'isCustomOrg', 'NAV', src + '\nreturn courseOf;')(QUIZ, () => false, { org: 'halimon' });
t('app: Class 7 English in Assamese medium opens the lessons course, English Grammar opens the grammar course, English medium still opens the old one', (courseOf(7, 'English', 'Assamese') || {}).id === 'c7-english-as' && (courseOf(7, 'English Grammar', 'Assamese') || {}).id === 'c7-grammar-as' && (courseOf(7, 'English', 'English') || {}).id === 'c7-english');
t('server: both subjects use the English tutor profile', /const isEnglish = course => \/\^English\/\.test\(course\.subject\);/.test(read('server.js')));
console.log(pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
