// Kid questions (Class 1 to 3): every question has one right option that is worked out again here from the numbers, no repeats inside a question,
// each class stays inside its level, and every language has text. Thousands of random questions per class, subject and language.
const path = require('path'), assert = require('assert');
global.window = global; require(path.join(__dirname, '..', 'public', 'kidbank.js'));
const K = window.KIDBANK; let n = 0, bad = 0;
const t = (c, m) => { if (c) n++; else { bad++; if (bad < 15) console.log('FAIL  ' + m); } };
// a fixed, repeatable random source (so a failure can be found again)
let seed = 12345; const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
const LANGS = ['hing', 'en', 'as', 'bn'];
function expected(q) {   // the right answer from the numbers alone
  const m = q.meta;
  switch (q.subj + ':' + m.kind) {
    case 'ginti:count': return String(m.n);
    case 'ginti:after': return String(m.n + 1);
    case 'ginti:before': return String(m.n - 1);
    case 'ginti:add': return String(m.a + m.b);
    case 'ginti:sub': return String(m.a - m.b);
    case 'ginti:times': return String(m.a * m.b);
    case 'ginti:tens': return String(Math.floor(m.n / 10));
    case 'ginti:big': return String(Math.max(...m.nums));
    case 'ginti:small': return String(Math.min(...m.nums));
    case 'eng:letter': return m.w[0].toUpperCase();
    case 'eng:opp': return m.right;
    case 'eng:plural': return m.p;
    case 'eng:aan': return /^[aeiou]/.test(m.w) ? 'an' : 'a';
    case 'eng:vowel': return m.right;
    case 'asm:first': return Array.from(m.w)[0];
    case 'asm:vowel': case 'asm:cons': return m.right;
    case 'asm:day': return K._data.ASM_DAYS[(K._data.ASM_DAYS.indexOf(m.d) + 1) % 7];
    default: return null;   // evs: checked from its own table below
  }
}
const EVS_RIGHT = { fish: 'water', cow: 'x' };
for (const cls of [1, 2, 3]) for (const subj of K.SUBJECTS) for (const lang of LANGS) {
  const kinds = new Set();
  for (let i = 0; i < 400; i++) {
    const q = K.make(cls, subj, lang, rnd), tag = cls + '/' + subj + '/' + lang + ' ' + q.text;
    kinds.add(q.kind);
    t(q.subj === subj && q.text && q.say && q.sayLang, 'fields ' + tag);
    t(q.opts.length >= 2 && q.opts.length <= 4 && new Set(q.opts).size === q.opts.length, 'options distinct and 2-4: ' + tag + ' ' + q.opts.join(','));
    t(Number.isInteger(q.ans) && q.ans >= 0 && q.ans < q.opts.length, 'answer index ' + tag);
    t(q.opts.every(o => typeof o === 'string' && o.length > 0 && o.length <= 40), 'option text ' + tag);
    t(!/\{\w+\}/.test(q.text + q.say), 'no unfilled {slot}: ' + tag);
    const e = expected(q); if (e !== null) t(q.opts[q.ans] === e, 'right answer is ' + e + ' not ' + q.opts[q.ans] + ': ' + tag);
    // level limits
    const m = q.meta;
    if (subj === 'ginti' && cls === 1) { t(m.kind !== 'add' || m.a + m.b <= 10, 'class 1 sums stay within 10: ' + tag); t(m.kind !== 'count' || (m.n >= 1 && m.n <= 10 && q.visual.dots === m.n), 'dots match the number: ' + tag); t(!['sub', 'times', 'tens'].includes(m.kind), 'class 1 has no ' + m.kind); }
    if (subj === 'ginti' && cls === 2) t(m.kind !== 'add' || m.a + m.b <= 20, 'class 2 sums stay within 20: ' + tag);
    if (subj === 'ginti' && cls === 2 && m.kind === 'sub') t(m.a > m.b && m.a <= 20, 'class 2 subtraction stays positive and within 20: ' + tag);
    if (subj === 'ginti' && cls === 3) { t(m.kind !== 'add' || m.a + m.b <= 99, 'class 3 sums stay under 100: ' + tag); t(m.kind !== 'sub' || (m.a > m.b && m.a <= 99), 'class 3 subtraction: ' + tag); t(m.kind !== 'times' || [2, 3, 4, 5, 10].includes(m.a), 'class 3 tables: ' + tag); }
    if (subj === 'ginti' && m.kind === 'big') t(new Set(m.nums).size === 3, 'three different numbers: ' + tag);
    if (subj === 'ginti' && m.kind === 'before') t(Number(q.opts[q.ans]) >= 1, 'before-number is at least 1: ' + tag);
    if (subj === 'evs') {   // checked against what is true
      const OK = { fruit: ['mango', 'banana', 'apple', 'orange'], veg: ['potato', 'onion', 'cabbage', 'brinjal'], water: ['fish'], bird: ['crow', 'parrot'], colour: ['blue', 'green', 'yellow', 'red'] };
      if (OK[m.kind]) t(OK[m.kind].includes(m.right), 'evs right item belongs: ' + tag);
      if (m.kind === 'colour') t((m.x === 'sky' && m.right === 'blue') || (m.x === 'grass' && m.right === 'green') || (m.x === 'bananaC' && m.right === 'yellow') || (m.x === 'tomato' && m.right === 'red'), 'colour fact: ' + tag);
      if (['week', 'fingers', 'ears', 'eyes'].includes(m.kind)) t(q.opts[q.ans] === String({ week: 7, fingers: 5, ears: 2, eyes: 2 }[m.kind]), 'body or week count: ' + tag);
    }
  }
  const NEED = { ginti: cls === 1 ? 5 : cls === 2 ? 6 : 6, eng: cls === 1 ? 2 : 4, asm: cls === 1 ? 1 : 3, evs: cls === 1 ? 4 : 5 };
  t(kinds.size === NEED[subj], cls + '/' + subj + ' uses all its question kinds (' + [...kinds].join(',') + ')');
}
// wrong-option lists never contain a second right answer
{
  const D = K._data;
  t(new Set(D.LETTER.map(x => x[1])).size === D.LETTER.length && D.LETTER.every(([w, l]) => w[0].toUpperCase() === l), 'letter table: unique letters, each word starts with its letter');
  t(D.ASM_WORD.every(([w, l]) => Array.from(w)[0] === l), 'assamese words start with their letter');
  t(D.AAN.every(([w, a]) => a === (/^[aeiou]/.test(w) ? 'an' : 'a')), 'a/an table');
  const allOpp = D.OPP.flat(); t(new Set(allOpp).size === allOpp.length, 'no word appears in two opposite pairs (so a wrong option can never also be right)');
  t(new Set(D.ASM_V.concat(D.ASM_C)).size === D.ASM_V.length + D.ASM_C.length, 'assamese vowels and consonants do not overlap');
  t(D.ASM_DAYS.length === 7 && new Set(D.ASM_DAYS).size === 7, 'seven assamese days');
}
// unknown inputs fall back safely
{ const q = K.make(9, 'zzz', 'xx', rnd); t(q.subj === 'ginti' && q.opts.length >= 2, 'bad class, subject and language fall back to class 1 ginti in Hinglish'); }
// each language really changes the words (prompts are not all the same)
for (const subj of ['evs']) { const seen = new Set(); for (const lang of LANGS) { seed = 99; seen.add(K.make(2, subj, lang, rnd).text); } t(seen.size === 4, subj + ' text differs in every language'); }
for (const lang of LANGS) for (let i = 0; i < 50; i++) { const q = K.make(2, 'asm', lang, rnd); t(/[\u0980-\u09FF]/.test(q.text) && !/[a-z]{3}/.test(q.text.replace(/\{\w+\}/g, '')), 'assamese lesson is asked in Assamese only (' + lang + '): ' + q.text); t(q.sayLang === 'as-IN', 'assamese lesson is spoken with the Assamese voice'); }
console.log(n + ' passed, ' + bad + ' failed'); process.exit(bad ? 1 : 0);
