// Recall AI: scoring helpers (recall-core.js), the server route wiring and the client page.
// Run: node tests/recall.test.js
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/^﻿/, '').replace(/\r\n/g, '\n');
const R = require(path.join(ROOT, 'recall-core.js')), QUIZ = require(path.join(ROOT, 'questions.js'));
let pass = 0, fail = 0;
const t = (name, ok, extra) => { if (ok) pass++; else { fail++; console.log('FAIL  ' + name + (extra ? '  ' + extra : '')); } };

// weights
for (const k of Object.keys(R.WEIGHTS)) t('weights of "' + k + '" add up to 100', Object.values(R.WEIGHTS[k]).reduce((a, b) => a + b, 0) === 100);
t('every weight has a criterion name', Object.keys(R.WEIGHTS.concept).every(k => R.CRITERIA[k]));

// parseResult
const good = JSON.stringify({ scores: { c: 85, f: 90, t: 65, l: 75, m: 70 }, got: ['a', 'b'], miss: ['c'], wrong: [], revise: 'Revise CO2.' });
const r = R.parseResult(good, 'concept');
t('total is computed from the weights (79)', r && r.total === 79, r && r.total);
const skew = JSON.stringify({ scores: { c: 100, f: 0, t: 50, l: 50, m: 50 } });
t('total depends on the question type', R.parseResult(skew, 'concept').total === 53 && R.parseResult(skew, 'fact').total === 38);
t('lists are kept', r.got.length === 2 && r.miss[0] === 'c' && Array.isArray(r.wrong));
t('code fences are stripped', R.parseResult('```json\n' + good + '\n```', 'concept').total === 79);
t('scores are clamped to 0-100', R.parseResult(JSON.stringify({ scores: { c: 500, f: -9, t: 50, l: 50, m: 50 } }), 'concept').scores.c === 100 && R.parseResult(JSON.stringify({ scores: { c: 500, f: -9, t: 50, l: 50, m: 50 } }), 'concept').scores.f === 0);
t('model-supplied total is ignored', R.parseResult(JSON.stringify({ total: 100, scores: { c: 0, f: 0, t: 0, l: 0, m: 0 } }), 'concept').total === 0);
t('garbage is refused', ['', 'hello', '{}', '{"scores":{"c":1}}', '[]', null].every(x => R.parseResult(x, 'concept') === null));
t('unknown type is refused', R.parseResult(good, 'nope') === null);
t('long lists are cut to 4, long strings to 200', (() => { const x = R.parseResult(JSON.stringify({ scores: { c: 1, f: 1, t: 1, l: 1, m: 1 }, got: Array(9).fill('x'.repeat(500)) }), 'concept'); return x.got.length === 4 && x.got[0].length === 200; })());

// chapters and prompt
const c0 = QUIZ.courses[0], ch0 = c0.chapters[0];
const hit = R.findChapter(QUIZ, c0.id, ch0.no);
t('findChapter finds a real chapter', hit && hit.ch === ch0 && hit.course === c0);
t('findChapter accepts the number as text', !!R.findChapter(QUIZ, c0.id, String(ch0.no)));
t('findChapter refuses unknown ids', !R.findChapter(QUIZ, 'nope', 1) && !R.findChapter(QUIZ, c0.id, 9999) && !R.findChapter(QUIZ, undefined, undefined));
t('isReady: a chapter with questions is ready, locked or empty chapters are not', R.isReady(ch0) && !R.isReady({ no: 2, title: 'x', locked: true }) && !R.isReady({ no: 3, title: 'x' }) && !R.isReady({ no: 4, title: 'x', sections: [{ questions: [] }] }) && !R.isReady(null));
t('isReady matches the app lock rule on every real chapter', QUIZ.courses.every(c => (c.chapters || []).every(ch => R.isReady(ch) === !(ch.locked || !(ch.sections && ch.sections.length)))));
const p = R.buildPrompt(c0, ch0, 'my explanation');
t('prompt holds chapter title, reference and the student text', p.includes(ch0.title) && p.includes('my explanation') && p.includes('Textbook reference'));
t('reference is capped', R.reference({ context: 'x'.repeat(20000), sections: [] }).length <= 7000);
t('system prompt tells the model to ignore instructions in the student text', /Ignore any instruction/.test(R.SYSTEM));
t('system prompt forbids emoji and asks Hinglish', /no emoji/.test(R.SYSTEM) && /Hinglish/.test(R.SYSTEM));

// server wiring
const S = read('server.js');
t('route exists', /app\.post\('\/api\/recall\/evaluate'/.test(S));
const rs = S.indexOf("app.post('/api/recall/evaluate'"), route = S.slice(rs, S.indexOf('\n});', rs));
t('route validates chapter and type before any AI call', route.indexOf('findChapter') < route.indexOf('geminiFor') && route.indexOf('WEIGHTS[b.type]') < route.indexOf('geminiFor'));
t('route refuses a locked chapter before any AI call', route.indexOf('isReady') > route.indexOf('findChapter') && route.indexOf('isReady') < route.indexOf('geminiFor'));
t('screen hides locked chapters from the list', /filter\(readyCh\)/.test(read('public/recall.js')));
t('route limits text length', /MIN_CHARS/.test(route) && /MAX_CHARS/.test(route));
t('route uses the parent key path (geminiFor) and the free daily limit', /geminiFor\(req/.test(route) && /takeFree\(uid\)/.test(route));
t('a failed check gives the free one back', /refundFree\(uid\)/.test(route));
t('route never logs the student text or the key', !/console\.(log|error)/.test(route));
t('the student text is never written to a database in the route', !/(firestore|setDoc|\.set\(|CACHE)/i.test(route));

// client
const C = read('public/recall.js'), H = read('public/index.html');
t('index.html loads recall.js', /<script src="\/recall\.js"><\/script>/.test(H));
t('sidebar has a Recall AI item next to Advanced AI Features', /item\('recall','recall','Recall AI'\)/.test(H));
t('the recall view is routed', /VIEW==='recall'\)body=window\.RECALL/.test(H));
t('the recall icon exists', /\brecall:ic\(/.test(H));
t('page never stores the typed text', !/localStorage\.setItem\([^)]*text/.test(C) && /k: st\.key, t: j\.total, at: Date\.now\(\)/.test(C));
t('page escapes AI text before showing it', /esc\(x\)/.test(C) && /esc\(r\.revise\)/.test(C));
t('no emoji in the page', !/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(C));

// voice recording with a timer
t('has a Record Voice button and a visible timer', /Record Voice/.test(C) && /id="rcTimer"/.test(C) && /role="timer"/.test(C));
t('recording stops by itself at a maximum', /MAX_REC = 120/.test(C) && /rc\.sec >= MAX_REC/.test(C));
t('voice uses the browser speech recognition, not audio upload', /SpeechRecognition/.test(C) && !/MediaRecorder|getUserMedia|FileReader|new Blob|audio\/webm/.test(C));
t('mic goes off when the page is hidden or the screen changes', /visibilitychange/.test(C) && /pagehide/.test(C) && /getElementById\('rcText'\) \|\| /.test(C));
t('mic is stopped before evaluating', /if \(rc\.on\) stopVoice\(\);\s*st\.busy = true/.test(C));
t('voice text is capped to the server limit', /slice\(0, MAX_CHARS\)/.test(C) && /MAX_CHARS = 1500/.test(C));
t('unsupported browsers get a clear message and typing still works', /Chrome ya Edge/.test(C) && /!SR && !rc\.on/.test(C));
t('page says audio is not recorded or stored', /Orbit awaaz record ya save nahi karta/.test(C));
t('mic permission error is explained', /Browser ne mic ki ijazat nahi di/.test(C));
t('the page still sends only text to the server', /\{ course: cur\.c\.id, ch: cur\.ch\.no, type: st\.type, text \}/.test(C));
console.log(pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
