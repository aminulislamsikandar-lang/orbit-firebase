// Orbit Bolo: matching of what the child says (bolo-core.js), screen wiring, and privacy rules of the page (bolo.js).
// Run: node tests/bolo.test.js
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
const B = require(path.join(ROOT, 'public/bolo-core.js'));
let pass = 0, fail = 0;
const t = (name, ok, extra) => { if (ok) pass++; else { fail++; console.log('FAIL  ' + name + (extra ? '  ' + extra : '')); } };
const A = B.items('alpha'), say = (item, ...x) => B.check(item, x);

// content
t('alphabet has 26 items A to Z with a word each', A.length === 26 && A[0].big === 'A' && A[25].big === 'Z' && A[0].sub === 'A for Apple' && A[25].sub === 'Z for Zebra');
t('every letter has sounds', Object.keys(B.LETTER_SOUNDS).length === 26);
const T = B.items('table', { table: 7 });
t('table of 7 has 10 rows and correct answers', T.length === 10 && T[0].sub === '= 7' && T[9].sub === '= 70' && T[5].match.n === 42);
t('unknown table falls back to 2', B.items('table', { table: 99 })[1].match.n === 4);
t('poems have lines and stateKey differs per choice', B.POEMS.length >= 2 && B.items('poem', { poem: 'baa' }).length === 4 && B.stateKey('table', { table: 3 }) !== B.stateKey('table', { table: 4 }) && B.stateKey('poem', { poem: 'baa' }) !== B.stateKey('poem', { poem: 'twinkle' }));

// letters
t('letter: "a for apple" is right', say(A[0], 'a for apple'));
t('letter: just "apple" is right', say(A[0], 'Apple.'));
t('letter: letter name "bee" is right for B', say(A[1], 'bee'));
t('letter: "tigar" (one slip) is right for T', say(A[19], 'tigar'));
t('letter: wrong word is refused', !say(A[0], 'ball') && !say(A[2], 'dog'));
t('letter: ice cream needs both words', say(A[8], 'ice cream') && !say(A[8], 'ice'));
t('letter: one of several engine guesses is enough', say(A[3], 'doll', 'dog'));
t('letter: empty or silent is refused', !say(A[0], '') && !B.check(A[0], []) && !B.check(A[0], null));

// numbers
const n10 = T[0 + 0], t2 = B.items('table', { table: 2 });
t('number: digits "10"', B.check(t2[4], ['2 into 5 is 10']));
t('number: english word "ten"', B.check(t2[4], ['two fives are ten']));
t('number: hindi word "das"', B.check(t2[4], ['do paanch das']));
t('number: compound "twenty five" for 25', B.check(B.items('table', { table: 5 })[4], ['twenty five']));
t('number: wrong number refused', !B.check(t2[4], ['2 into 5 is 12']));
t('number: 10 is not matched by 1 or 0 alone', !B.check(t2[4], ['one']) && !B.check(t2[4], ['zero']));

// lines
const P = B.items('poem', { poem: 'twinkle' });
t('line: exact line', B.check(P[0], ['twinkle twinkle little star']));
t('line: punctuation and case are ignored', B.check(P[0], ['Twinkle, Twinkle, little STAR!']));
t('line: most words is enough (3 of 4)', B.check(P[1], ['how i wonder what are']));
t('line: wrong line refused', !B.check(P[0], ['how i wonder what you are']));
t('line: long unrelated sentence refused', !B.check(P[0], ['twinkle twinkle little star and then I went to the market to buy some vegetables today']));

// numbers helper
t('numbersIn reads mixed text', (() => { const s = B.numbersIn('2 into 3 is six'); return s.has(2) && s.has(3) && s.has(6); })());
t('dayKey and fmtTime', /^\d{4}-\d{2}-\d{2}$/.test(B.dayKey()) && B.fmtTime(65) === '1:05' && B.fmtTime(600) === '10:00');

// wiring
const H = read('public/index.html'), C = read('public/bolo.js'), SW = read('public/sw.js');
t('index.html loads bolo-core.js before bolo.js', H.indexOf('/bolo-core.js') > 0 && H.indexOf('/bolo-core.js') < H.indexOf('/bolo.js'));
t('sidebar has a Bolo item', /item\('bolo','mic','Bolo'\)/.test(H));
t('the bolo view is routed', /VIEW==='bolo'\)body=window\.BOLO/.test(H));
t('the mic icon exists', /\bmic:ic\(/.test(H));
t('the mic is switched off when the student leaves the screen', (H.match(/BOLO\.leave\(\)/g) || []).length >= 3);
t('service worker cache was bumped past v26', Number((/orbit-shell-v(\d+)/.exec(SW) || [])[1]) >= 27);
t('Permissions-Policy still allows the microphone for the app', /microphone=\(self\)/.test(read('firebase.json')));

// privacy and safety of the page
t('page never writes the recognised text or audio anywhere', !/localStorage\.setItem\([^)]*(alts|transcript)/.test(C) && !/fetch\(|XMLHttpRequest|sendBeacon|MediaRecorder|getUserMedia/.test(C));
t('page keeps only marks, time and settings', /prog/.test(C) && /days/.test(C) && !/alts\b[^;\n]*save/.test(C));
t('PIN is stored as a SHA-256 hash, never plain', /crypto\.subtle\.digest\('SHA-256'/.test(C) && /s\.set\.pin = h/.test(C));
t('settings can be edited only when no PIN or unlocked', /canEdit\(\)/.test(C) && (C.match(/canEdit\(\)/g) || []).length >= 3);
t('listening stops after a time limit', /LISTEN_MS/.test(C) && /setTimeout\(\(\) => \{ if \(rec === r\)/.test(C));
t('mic is off while the daily limit is over', /function listen\(\) \{\s*if \(over\(\)/.test(C));
t('page escapes text it shows', /esc\(it\.big\)/.test(C) && /esc\(it\.sub\)/.test(C) && /esc\(st\.fb\.t\)/.test(C));
t('no emoji in the page or the core', !/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(C) && !/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(read('public/bolo-core.js')));
t('page does not say Premium', !/premium/i.test(C));

console.log(pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
