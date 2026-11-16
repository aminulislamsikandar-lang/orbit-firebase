// Orbit kid questions (Class 1 to 3) for "Padhai ka time": original, simple questions made by small generators. No textbook text, no AI, no network.
//   KIDBANK.make(cls, subj, lang, rnd)  ->  { subj, kind, text, say, sayLang, visual, opts:[strings], ans:index, meta }
//   cls 1..3   subj 'ginti' | 'eng' | 'asm' | 'evs'   lang 'hing' | 'en' | 'as' | 'bn'   rnd = () => number in [0,1) (default Math.random; tests pass a fixed one)
// Every question has exactly one right option. `meta` carries the numbers so tests can work the answer out again on their own.
// The Assamese and Bengali wording is hand-written: have a native speaker read it before children use it.
(function (g) {
  'use strict';
  const N = (hing, en, as, bn) => ({ hing, en, as, bn });
  const P = {
    count: N('Kitne hain?', 'How many are there?', 'কিমান আছে?', 'কয়টি আছে?'),
    after: N('Number {n} ke baad kaun sa number aata hai?', 'Which number comes after {n}?', '{n} ৰ পিছত কোনটো সংখ্যা আহে?', '{n}-এর পরে কোন সংখ্যা আসে?'),
    before: N('Number {n} se pehle kaun sa number aata hai?', 'Which number comes before {n}?', '{n} ৰ আগত কোনটো সংখ্যা আহে?', '{n}-এর আগে কোন সংখ্যা আসে?'),
    big: N('Sabse bada number kaun sa hai?', 'Which number is the biggest?', 'কোনটো সংখ্যা আটাইতকৈ ডাঙৰ?', 'কোন সংখ্যাটি সবচেয়ে বড়?'),
    small: N('Sabse chhota number kaun sa hai?', 'Which number is the smallest?', 'কোনটো সংখ্যা আটাইতকৈ সৰু?', 'কোন সংখ্যাটি সবচেয়ে ছোট?'),
    tens: N('Number {n} mein dahai ka ank kya hai?', 'What is the tens digit of {n}?', '{n} ত দহকৰ ঘৰৰ অংকটো কি?', '{n}-এ দশকের ঘরের অঙ্কটি কত?'),
    plus: N('{a} jod {b}', '{a} plus {b}', '{a} যোগ {b}', '{a} যোগ {b}'), minus: N('{a} ghata {b}', '{a} minus {b}', '{a} বিয়োগ {b}', '{a} বিয়োগ {b}'), times: N('{a} guna {b}', '{a} times {b}', '{a} গুণ {b}', '{a} গুণ {b}'),
    fruit: N('Inmein se kaun sa phal hai?', 'Which one is a fruit?', 'এইবোৰৰ ভিতৰত কোনটো ফল?', 'এগুলোর মধ্যে কোনটি ফল?'),
    veg: N('Inmein se kaun sa sabzi hai?', 'Which one is a vegetable?', 'এইবোৰৰ ভিতৰত কোনটো পাচলি?', 'এগুলোর মধ্যে কোনটি সবজি?'),
    water: N('Kaun sa jaanwar paani mein rehta hai?', 'Which animal lives in water?', 'কোনটো জন্তু পানীত থাকে?', 'কোন প্রাণী জলে থাকে?'),
    bird: N('Inmein se kaun sa pakshi hai?', 'Which one is a bird?', 'এইবোৰৰ ভিতৰত কোনটো চৰাই?', 'এগুলোর মধ্যে কোনটি পাখি?'),
    week: N('Hafte mein kitne din hote hain?', 'How many days are there in a week?', 'এসপ্তাহত কিমান দিন থাকে?', 'এক সপ্তাহে কত দিন?'),
    fingers: N('Ek haath mein kitni ungliyan hoti hain?', 'How many fingers are there on one hand?', 'এখন হাতত কিমানটা আঙুলি থাকে?', 'এক হাতে কয়টি আঙুল থাকে?'),
    ears: N('Hamare kitne kaan hote hain?', 'How many ears do we have?', 'আমাৰ কিমানটা কাণ থাকে?', 'আমাদের কয়টি কান থাকে?'),
    eyes: N('Hamari kitni aankhein hoti hain?', 'How many eyes do we have?', 'আমাৰ কিমানটা চকু থাকে?', 'আমাদের কয়টি চোখ থাকে?'),
    colour: N('{x} ka rang kaisa hota hai?', 'What colour is {x}?', '{x}ৰ ৰং কেনে?', '{x}-এর রং কেমন?'),
    nextday: N('{d} ke baad kaun sa din aata hai?', 'Which day comes after {d}?', '{d}ৰ পিছত কোনটো বাৰ আহে?', '{d}-এর পরে কোন বার আসে?'),
    asmFirst: N('"{w}" ka pehla akshar kaun sa hai?', '"{w}" starts with which letter?', '"{w}"ৰ প্ৰথম আখৰ কোনটো?', '"{w}"-এর প্রথম অক্ষর কোনটি?'),
    asmVowel: N('Kaun sa swar-varn (vowel) hai?', 'Which one is a vowel letter?', 'কোনটো স্বৰবৰ্ণ?', 'কোনটি স্বরবর্ণ?'),
    asmCons: N('Kaun sa vyanjan-varn (consonant) hai?', 'Which one is a consonant letter?', 'কোনটো ব্যঞ্জনবৰ্ণ?', 'কোনটি ব্যঞ্জনবর্ণ?')
  };
  const fill = (s, o) => s.replace(/\{(\w+)\}/g, (m, k) => (o[k] == null ? m : o[k]));
  const T = (k, lang, o) => fill(P[k][lang] || P[k].hing, o || {});
  const SAYLANG = { hing: 'hi-IN', en: 'en-IN', as: 'as-IN', bn: 'bn-IN' };

  // small helpers with an injectable random source
  const mkR = rnd => { const r = rnd || Math.random; return { int: (a, b) => a + Math.floor(r() * (b - a + 1)), pick: arr => arr[Math.floor(r() * arr.length)], shuffle: arr => { const x = arr.slice(); for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; } return x; } }; };
  // right answer + wrong ones, shuffled; `right` is always one option and no option repeats
  function build(R, base, right, wrongs) {
    const seen = new Set([String(right)]), w = [];
    for (const x of R.shuffle(wrongs)) { const s = String(x); if (!seen.has(s)) { seen.add(s); w.push(s); } if (w.length === 3) break; }
    const opts = R.shuffle([String(right)].concat(w));
    return { ...base, opts, ans: opts.indexOf(String(right)) };
  }
  const near = (R, n, lo, hi) => { const s = new Set(); let guard = 0; while (s.size < 6 && guard++ < 60) { const d = R.int(-3, 3), v = n + d; if (d && v >= lo && v <= hi && v !== n) s.add(v); } for (let v = lo; s.size < 3 && v <= hi; v++) if (v !== n) s.add(v); return [...s]; };

  // ---- Ginti (maths) ----
  const MATH = {
    1: ['count', 'after', 'before', 'add', 'big'], 2: ['add', 'sub', 'after', 'before', 'big', 'small'], 3: ['add', 'sub', 'times', 'tens', 'big', 'small']
  };
  function ginti(cls, lang, R) {
    const kind = R.pick(MATH[cls]); let base, right, wrongs, meta;
    if (kind === 'count') { const n = R.int(1, 10); meta = { kind, n }; right = n; wrongs = near(R, n, 1, 10); base = { text: T('count', lang), say: T('count', lang), visual: { dots: n } }; }
    else if (kind === 'after' || kind === 'before') {
      const hi = cls === 1 ? 20 : 99, n = kind === 'after' ? R.int(1, hi - 1) : R.int(2, hi); meta = { kind, n }; right = kind === 'after' ? n + 1 : n - 1; wrongs = near(R, right, 0, hi + 1).concat([n]);
      base = { text: T(kind, lang, { n }), say: T(kind, lang, { n }) };
    } else if (kind === 'add') {
      let a, b; if (cls === 1) { a = R.int(1, 8); b = R.int(1, 10 - a); } else if (cls === 2) { a = R.int(2, 18); b = R.int(1, 20 - a); } else { a = R.int(10, 80); b = R.int(5, 99 - a); }
      meta = { kind, a, b }; right = a + b; wrongs = near(R, right, 1, 120).concat([a + b + 10, Math.abs(a - b)]);
      base = { text: a + ' + ' + b + ' = ?', say: T('plus', lang, { a, b }) };
    } else if (kind === 'sub') {
      let a, b; if (cls === 2) { a = R.int(5, 20); b = R.int(1, a - 1); } else { a = R.int(20, 99); b = R.int(5, a - 1); }
      meta = { kind, a, b }; right = a - b; wrongs = near(R, right, 0, 120).concat([a + b]);
      base = { text: a + ' \u2212 ' + b + ' = ?', say: T('minus', lang, { a, b }) };
    } else if (kind === 'times') {
      const a = R.pick([2, 3, 4, 5, 10]), b = R.int(1, 10); meta = { kind, a, b }; right = a * b; wrongs = near(R, right, 1, 100).concat([a + b, a * (b + 1), a * (b - 1 || 2)]);
      base = { text: a + ' \u00d7 ' + b + ' = ?', say: T('times', lang, { a, b }) };
    } else if (kind === 'tens') {
      const n = R.int(10, 99); meta = { kind, n }; right = Math.floor(n / 10); wrongs = [n % 10, right + 1, Math.max(0, right - 1), 0, 9].filter(x => x !== right);
      base = { text: T('tens', lang, { n }), say: T('tens', lang, { n }) };
    } else {   // big / small: three different numbers
      const hi = cls === 1 ? 20 : cls === 2 ? 99 : 999, lo = cls === 1 ? 1 : 10, s = new Set(); while (s.size < 3) s.add(R.int(lo, hi)); const nums = [...s];
      meta = { kind, nums }; right = kind === 'big' ? Math.max(...nums) : Math.min(...nums); wrongs = nums.filter(x => x !== right);
      base = { text: T(kind, lang), say: T(kind, lang) };
    }
    return build(R, { subj: 'ginti', kind, meta, sayLang: SAYLANG[lang], ...base }, right, wrongs);
  }

  // ---- English ----
  const LETTER = [['Apple', 'A'], ['Ball', 'B'], ['Cat', 'C'], ['Dog', 'D'], ['Egg', 'E'], ['Fish', 'F'], ['Goat', 'G'], ['Hen', 'H'], ['Ink', 'I'], ['Jug', 'J'], ['Kite', 'K'], ['Lion', 'L'], ['Mango', 'M'], ['Nest', 'N'], ['Owl', 'O'], ['Pen', 'P'], ['Queen', 'Q'], ['Rat', 'R'], ['Sun', 'S'], ['Tree', 'T'], ['Umbrella', 'U'], ['Van', 'V'], ['Watch', 'W'], ['Yak', 'Y'], ['Zebra', 'Z']];
  const OPP = [['big', 'small'], ['hot', 'cold'], ['up', 'down'], ['day', 'night'], ['happy', 'sad'], ['hard', 'soft'], ['old', 'new'], ['fast', 'slow'], ['tall', 'short'], ['open', 'close'], ['full', 'empty'], ['light', 'dark'], ['in', 'out'], ['yes', 'no']];
  const PLURAL = [['cat', 'cats'], ['dog', 'dogs'], ['book', 'books'], ['box', 'boxes'], ['bus', 'buses'], ['child', 'children'], ['man', 'men'], ['mouse', 'mice'], ['tooth', 'teeth'], ['foot', 'feet'], ['leaf', 'leaves'], ['watch', 'watches']];
  const AAN = [['apple', 'an'], ['orange', 'an'], ['egg', 'an'], ['umbrella', 'an'], ['ant', 'an'], ['elephant', 'an'], ['owl', 'an'], ['ball', 'a'], ['cat', 'a'], ['dog', 'a'], ['book', 'a'], ['pen', 'a'], ['house', 'a'], ['table', 'a']];
  const ENG = { 1: ['letter', 'vowel'], 2: ['letter', 'opp', 'vowel', 'aan'], 3: ['opp', 'plural', 'aan', 'vowel'] };
  function eng(cls, R) {
    const kind = R.pick(ENG[cls]); let base, right, wrongs, meta;
    if (kind === 'letter') { const [w, l] = R.pick(LETTER); meta = { kind, w, l }; right = l; wrongs = LETTER.map(x => x[1]); base = { text: 'Which letter does "' + w + '" start with?' }; }
    else if (kind === 'opp') { const [a, b] = R.pick(OPP), flip = R.int(0, 1), q = flip ? b : a; right = flip ? a : b; meta = { kind, q, right }; wrongs = OPP.map(x => x[R.int(0, 1)]).filter(x => x !== right && x !== q); base = { text: 'What is the opposite of "' + q + '"?' }; }
    else if (kind === 'plural') { const [s, p] = R.pick(PLURAL); meta = { kind, s, p }; right = p; wrongs = [s + 's', s + 'es', s + 'ies', s + 'en', 'many ' + s].filter(x => x !== p); base = { text: 'More than one "' + s + '" is:' }; }
    else if (kind === 'aan') { const [w, a] = R.pick(AAN); meta = { kind, w, a }; right = a; wrongs = ['a', 'an']; base = { text: 'Fill in: ___ ' + w }; }
    else { const V = ['a', 'e', 'i', 'o', 'u'], C = ['b', 'c', 'd', 'f', 'g', 'h', 'k', 'l', 'm', 'n', 'p', 'r', 's', 't']; right = R.pick(V); meta = { kind, right }; wrongs = C; base = { text: 'Which letter is a vowel?' }; }
    base.say = base.text.replace('___', 'blank'); return build(R, { subj: 'eng', kind, meta, sayLang: 'en-IN', ...base }, right, wrongs);
  }

  // ---- Assamese ----
  const ASM_WORD = [['আম', 'আ'], ['ঘৰ', 'ঘ'], ['গৰু', 'গ'], ['চৰাই', 'চ'], ['ফুল', 'ফ'], ['বল', 'ব'], ['মাছ', 'ম'], ['হাতী', 'হ'], ['নাও', 'ন'], ['পানী', 'প'], ['কলম', 'ক'], ['ভাত', 'ভ'], ['লাউ', 'ল'], ['সূৰ্য', 'স'], ['ইঁদুৰ', 'ই']];
  const ASM_V = ['অ', 'আ', 'ই', 'ঈ', 'উ', 'ঊ', 'ঋ', 'এ', 'ঐ', 'ও', 'ঔ'], ASM_C = ['ক', 'খ', 'গ', 'ঘ', 'চ', 'ছ', 'জ', 'ট', 'ড', 'ত', 'দ', 'ন', 'প', 'ব', 'ম', 'ৰ', 'ল', 'স', 'হ'];
  const ASM_DAYS = ['দেওবাৰ', 'সোমবাৰ', 'মঙ্গলবাৰ', 'বুধবাৰ', 'বৃহস্পতিবাৰ', 'শুক্ৰবাৰ', 'শনিবাৰ'];
  const ASM = { 1: ['first'], 2: ['first', 'vowel', 'cons'], 3: ['vowel', 'cons', 'day'] };
  function asm(cls, lang, R) {
    const kind = R.pick(ASM[cls]); let base, right, wrongs, meta;
    if (kind === 'first') { const [w, l] = R.pick(ASM_WORD); meta = { kind, w, l }; right = l; wrongs = ASM_WORD.map(x => x[1]).concat(ASM_C); base = { text: T('asmFirst', lang, { w }) }; }
    else if (kind === 'vowel') { right = R.pick(ASM_V); meta = { kind, right }; wrongs = ASM_C; base = { text: T('asmVowel', lang) }; }
    else if (kind === 'cons') { right = R.pick(ASM_C); meta = { kind, right }; wrongs = ASM_V; base = { text: T('asmCons', lang) }; }
    else { const i = R.int(0, 6); right = ASM_DAYS[(i + 1) % 7]; meta = { kind, d: ASM_DAYS[i], right }; wrongs = ASM_DAYS.filter(x => x !== right); base = { text: T('nextday', lang, { d: ASM_DAYS[i] }) }; }
    base.say = base.text; return build(R, { subj: 'asm', kind, meta, sayLang: 'as-IN', ...base }, right, wrongs);
  }

  // ---- EVS (our world) ----
  const NAME = {   // word -> per language
    mango: N('aam', 'mango', 'আম', 'আম'), banana: N('kela', 'banana', 'কল', 'কলা'), apple: N('seb', 'apple', 'আপেল', 'আপেল'), orange: N('santra', 'orange', 'কমলা', 'কমলা'),
    potato: N('aalu', 'potato', 'আলু', 'আলু'), onion: N('pyaaz', 'onion', 'পিয়াঁজ', 'পেঁয়াজ'), cabbage: N('patta gobhi', 'cabbage', 'বন্ধাকবি', 'বাঁধাকপি'), brinjal: N('baingan', 'brinjal', 'বেঙেনা', 'বেগুন'),
    fish: N('machhli', 'fish', 'মাছ', 'মাছ'), cow: N('gaay', 'cow', 'গৰু', 'গরু'), dog: N('kutta', 'dog', 'কুকুৰ', 'কুকুর'), cat: N('billi', 'cat', 'মেকুৰী', 'বিড়াল'), goat: N('bakri', 'goat', 'ছাগলী', 'ছাগল'),
    crow: N('kauwa', 'crow', 'কাউৰী', 'কাক'), parrot: N('tota', 'parrot', 'ভটো', 'টিয়া'), sky: N('aasman', 'the sky', 'আকাশ', 'আকাশ'), grass: N('ghaas', 'grass', 'ঘাঁহ', 'ঘাস'), bananaC: N('kela', 'a banana', 'কল', 'কলা'), tomato: N('tamatar', 'a tomato', 'বিলাহী', 'টমেটো'),
    blue: N('neela', 'blue', 'নীলা', 'নীল'), green: N('hara', 'green', 'সেউজীয়া', 'সবুজ'), yellow: N('peela', 'yellow', 'হালধীয়া', 'হলুদ'), red: N('laal', 'red', 'ৰঙা', 'লাল')
  };
  const nm = (k, lang) => NAME[k][lang] || NAME[k].hing;
  const COL = [['sky', 'blue'], ['grass', 'green'], ['bananaC', 'yellow'], ['tomato', 'red']];
  const EVS = { 1: ['colour', 'ears', 'eyes', 'fingers'], 2: ['fruit', 'veg', 'colour', 'week', 'fingers'], 3: ['fruit', 'veg', 'water', 'bird', 'week'] };
  function evs(cls, lang, R) {
    const kind = R.pick(EVS[cls]); let base, right, wrongs, meta, txt;
    const named = (list, rightKey, pool) => { right = nm(rightKey, lang); wrongs = pool.map(k => nm(k, lang)); meta = { kind, right: rightKey }; };
    if (kind === 'colour') { const [x, c] = R.pick(COL); named(0, c, ['blue', 'green', 'yellow', 'red'].filter(k => k !== c)); meta.x = x; txt = T('colour', lang, { x: nm(x, lang) }); }
    else if (kind === 'fruit') { const r = R.pick(['mango', 'banana', 'apple', 'orange']); named(0, r, ['potato', 'onion', 'cabbage', 'brinjal']); txt = T('fruit', lang); }
    else if (kind === 'veg') { const r = R.pick(['potato', 'onion', 'cabbage', 'brinjal']); named(0, r, ['mango', 'banana', 'apple', 'orange']); txt = T('veg', lang); }
    else if (kind === 'water') { named(0, 'fish', ['cow', 'dog', 'cat', 'goat']); txt = T('water', lang); }
    else if (kind === 'bird') { const r = R.pick(['crow', 'parrot']); named(0, r, ['cow', 'dog', 'cat', 'goat']); txt = T('bird', lang); }
    else { const num = { week: 7, fingers: 5, ears: 2, eyes: 2 }[kind]; right = num; meta = { kind, right: num }; wrongs = [num + 1, num + 2, Math.max(1, num - 1), num + 5, 10]; txt = T(kind, lang); }
    base = { text: txt, say: txt };
    return build(R, { subj: 'evs', kind, meta, sayLang: SAYLANG[lang], ...base }, right, wrongs);
  }

  function make(cls, subj, lang, rnd) {
    const R = mkR(rnd); cls = cls >= 1 && cls <= 3 ? Math.floor(cls) : 1; lang = P.count[lang] ? lang : 'hing';
    return subj === 'eng' ? eng(cls, R) : subj === 'asm' ? asm(cls, 'as', R)   // an Assamese lesson is always asked in Assamese, whatever the app language is
       : subj === 'evs' ? evs(cls, lang, R) : ginti(cls, lang, R);
  }
  g.KIDBANK = { make, SUBJECTS: ['ginti', 'eng', 'asm', 'evs'], SAYLANG, _kinds: { MATH, ENG, ASM, EVS }, _data: { LETTER, OPP, PLURAL, AAN, ASM_WORD, ASM_V, ASM_C, ASM_DAYS } };
})(typeof window !== 'undefined' ? window : globalThis);
