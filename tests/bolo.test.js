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
t('sidebar has a Bolo item', /item\('bolo','mic','Bolo aur voice'/.test(H));
t('the bolo view is routed', /VIEW==='bolo'\)body=window\.BOLO/.test(H));
t('the mic icon exists', /\bmic:ic\(/.test(H));
t('the mic is switched off when the student leaves the screen', (H.match(/BOLO\.leave\(\)/g) || []).length >= 3);
t('service worker cache was bumped past v26', Number((/orbit-shell-v(\d+)/.exec(SW) || [])[1]) >= 27);
t('Permissions-Policy still allows the microphone for the app', /microphone=\(self\)/.test(read('firebase.json')));

// privacy and safety of the page
t('page never writes the recognised text or audio anywhere', !/localStorage\.setItem\([^)]*(alts|transcript)/.test(C) && !/(?<![.\w])fetch\(|XMLHttpRequest|sendBeacon/.test(C) && (C.match(/g\.fetch\([^)]*\)/g) || []).every(x => /items\[0\]\.src|it\.audio|o\.src/.test(x)) && !/localStorage\.setItem\([^)]*(blob|chunks|clip|audio)/i.test(C) && /const aiOn = \(\) => \(hasKey\(\) \|\| freeAs\(\)\) && CAN_REC && aiTick\(\) && typeof g\.api === 'function'/.test(C) && /const freeAs = \(\) => asMode\(\) && !st\.freeOff;/.test(C) && (C.match(/getUserMedia\(/g) || []).length === 1 && C.indexOf('getUserMedia(') > C.indexOf('async function listenAI()') && /function listen\(\) \{\n    if \(recOn\(\)\) return listenAI\(\);/.test(C));   // Phase 5: the mic is opened for the AI check only (parent key + parent tick); the only network call is api('/api/bolo/check')
t('page keeps only marks, time and settings', /prog/.test(C) && /days/.test(C) && !/alts\b[^;\n]*save/.test(C));
t('PIN is stored as a SHA-256 hash, never plain', /crypto\.subtle\.digest\('SHA-256'/.test(C) && /s\.set\.pin = h/.test(C));
t('settings can be edited only when no PIN or unlocked', /canEdit\(\)/.test(C) && (C.match(/canEdit\(\)/g) || []).length >= 3);
t('listening stops after a time limit', /LISTEN_MS/.test(C) && /setTimeout\(\(\) => \{ if \(rec === r\)/.test(C));
t('mic is off while the daily limit is over', /function listen\(\) \{\s*if \(recOn\(\)\) return listenAI\(\);\s*if \(over\(\)/.test(C) && /async function listenAI\(\) \{\s*if \(over\(\)/.test(C));
t('page escapes text it shows', /esc\(it\.big\)/.test(C) && /esc\(it\.sub\)/.test(C) && /esc\(st\.fb\.t\)/.test(C));
const EMO = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2728}\u{2B50}]/u, FLYLINE = (C.match(/^.*const FLY = .*$/m) || [''])[0];
t('emoji only in the Shabaash pop-up (the FLY line), nowhere else in the page, never as icons, none in the core', EMO.test(FLYLINE) && !EMO.test(C.replace(FLYLINE, '')) && !EMO.test(read('public/bolo-core.js')));
t('page does not say Premium', !/premium/i.test(C));

// ---- Assamese byanjan: 40 recorded clips + the mouth video ----
const BY = B.items('byanjan');
t('byanjan: 40 items, one per recorded clip', BY.length === 40 && B.BYANJAN_MS.length === 40);
t('byanjan: every letter is different and has a place', new Set(BY.map(x => x.big)).size === 40 && BY.every(x => B.PLACES[x.place]));
t('byanjan: every clip file exists, is named 01..40 and is a small mp3', BY.every((x, i) => { const f = path.join(ROOT, 'public/audio/byanjan', String(i + 1).padStart(2, '0') + '.mp3'); return fs.existsSync(f) && fs.statSync(f).size > 3000 && fs.statSync(f).size < 40000 && x.audio === B.byanjanAudio(i + 1); }));
t('byanjan: Assamese ra and wa are the Assamese letters (U+09F0, U+09F1)', BY[26].big.codePointAt(0) === 0x9f0 && BY[28].big.codePointAt(0) === 0x9f1);
t('byanjan: progress is saved under its own key, no mic matching', B.stateKey('byanjan') === 'byanjan' && B.stateKey('alpha') === 'alpha' && BY.every(x => x.match.kind === 'self') && B.check(BY[0], ['ko']) === false);
t('byanjan: the page escapes the letter and plays the clip, no browser voice for it', /speak = it => it && it\.audio \? playClip\(it\)/.test(C) && /data-v="byanjan"|\['byanjan', /.test(C));
const V = read('public/byanjan-video.js');
t('byanjan video: pure SVG, no network, no storage', !/fetch\(|XMLHttpRequest|localStorage|sessionStorage/.test(V) && /requestAnimationFrame/.test(V) && /prefers-reduced-motion/.test(V));
t('byanjan video: escapes the letter it draws', /esc\(it\.big\)/.test(V));

// Assamese "letter + word" mode (asvyanjan), beside the byanjan mode
const AV = B.items('asvyanjan');
t('asvyanjan: 23 items, first is ক – কল, last is ম', AV.length === 23 && AV[0].big === 'ক' && AV[0].sub.startsWith('ক – কল') && AV[22].big === 'ম');
t('asvyanjan: 46 cues in order, clips inside the recording and in order', B.AS_CUES.length === 46 && B.AS_CUES.every((x, i, a) => i === 0 || x > a[i - 1]) && AV.every((v, i) => v.clip.e > v.clip.s && (i === 0 || v.clip.s > AV[i - 1].clip.s)));
t('asvyanjan: own progress key, byanjan key unchanged', B.stateKey('asvyanjan') === 'asv' && B.stateKey('byanjan') === 'byanjan' && B.stateKey('alpha') === 'alpha');
t('asvyanjan: word or letter in Assamese script is right', say(AV[0], 'কল') && say(AV[0], 'ক') && say(AV[3], 'ঘৰ') && say(AV[3], 'ঘর'));
t('asvyanjan: Bengali র for ৰ and Roman spelling are accepted', say(AV[5], 'চরাই') && say(AV[22], 'মেকুরী') && say(AV[0], 'kal') && say(AV[12], 'dhol'));
t('asvyanjan: wrong word and empty speech are refused', !say(AV[0], 'গছ') && !say(AV[2], 'কল') && !say(AV[16], 'বাঘ') && !say(AV[0], '') && !B.check(AV[0], []));
t('byanjan mode still has its own clips', B.items('byanjan').length === B.BYANJAN_DATA.length && !!B.items('byanjan')[0].audio);
// Assamese: Hindi/Bengali engines, letter with a vowel sign, language rotation, spoken praise
t('asvyanjan: Hindi engine text (Devanagari) counts as the Assamese word', say(AV[0], 'कल') && say(AV[3], 'घर') && say(AV[5], 'चराई') && say(AV[16], 'धान'));
t('asvyanjan: letter heard with a vowel sign counts as the letter', say(AV[0], 'কা') && say(AV[0], 'का') && say(AV[1], 'খো') && say(AV[6], 'ছি'));
t('asvyanjan: a different letter or word is still refused', !say(AV[0], 'खा') && !say(AV[0], 'घर') && !say(AV[2], 'कल'));
t('bolo.js: Assamese listens in as, bn, hi in turn and the child is praised aloud', /AS_LANGS = \['as-IN', 'bn-IN', 'hi-IN'\]/.test(C) && /nextAsLang\(\)/.test(C) && /say\('शाबाश!', 'hi-IN'\)/.test(C));
t('Bolo has no Sunao button; a wrong answer plays the item by itself; Shabaash pop-up moves on by itself', !/data-bl="hear"/.test(C) && /else speak\(it\);/.test(C) && /advT = setTimeout\(afterPraise, PRAISE_MS\)/.test(C) && /class="bl-praise"/.test(C));
console.log(pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
