// public/bolo-core.js - pure helpers for Orbit Bolo ("speak and learn" for small children): what to say, and did the child say it?
// No DOM, no network. The browser loads it as window.BOLO_CORE; tests/bolo.test.js loads it with require().
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.BOLO_CORE = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const WORDS = ['Apple', 'Ball', 'Cat', 'Dog', 'Egg', 'Fish', 'Goat', 'Hat', 'Ice cream', 'Jug', 'Kite', 'Lion', 'Mango', 'Nest', 'Orange', 'Parrot', 'Queen', 'Rabbit', 'Sun', 'Tiger', 'Umbrella', 'Van', 'Watch', 'Xylophone', 'Yak', 'Zebra'];
  // How speech engines usually write the NAME of a letter. A child saying "bee" must count as B.
  const LETTER_SOUNDS = {
    A: ['a', 'ay', 'eh', 'hey', 'aye'], B: ['b', 'bee', 'be', 'bi'], C: ['c', 'see', 'sea', 'si'], D: ['d', 'dee', 'di'], E: ['e', 'ee'],
    F: ['f', 'ef', 'eff'], G: ['g', 'gee', 'ji'], H: ['h', 'aitch', 'age', 'ech'], I: ['i', 'eye', 'aye', 'ai'], J: ['j', 'jay', 'jai'],
    K: ['k', 'kay', 'ke', 'okay'], L: ['l', 'el', 'ell'], M: ['m', 'em'], N: ['n', 'en'], O: ['o', 'oh', 'owe'],
    P: ['p', 'pee', 'pi'], Q: ['q', 'queue', 'cue', 'kyu'], R: ['r', 'are', 'ar'], S: ['s', 'es', 'ess'], T: ['t', 'tea', 'tee', 'ti'],
    U: ['u', 'you', 'yu'], V: ['v', 'vee', 'vi'], W: ['w', 'double u', 'double you'], X: ['x', 'ex'], Y: ['y', 'why', 'wy'], Z: ['z', 'zed', 'zee', 'ze']
  };
  const NUM_WORDS = {
    zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14,
    fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90, hundred: 100,
    // Hindi in Roman letters, as speech engines and children produce it
    ek: 1, do: 2, teen: 3, char: 4, chaar: 4, panch: 5, paanch: 5, chhe: 6, che: 6, chha: 6, saat: 7, sat: 7, aath: 8, ath: 8, nau: 9, das: 10, dus: 10, bees: 20, tees: 30, chalis: 40, pachas: 50, saath: 60, sattar: 70, assi: 80, nabbe: 90, sau: 100
  };
  const POEMS = [
    { id: 'twinkle', title: 'Twinkle, Twinkle', lines: ['Twinkle, twinkle, little star', 'How I wonder what you are', 'Up above the world so high', 'Like a diamond in the sky'] },
    { id: 'baa', title: 'Baa, Baa, Black Sheep', lines: ['Baa, baa, black sheep', 'Have you any wool', 'Yes sir, yes sir', 'Three bags full'] }
  ];
  const TABLES = [2, 3, 4, 5, 6, 7, 8, 9, 10];

  // Assamese byanjan (consonants), in the order of the recording: public/audio/byanjan/01.mp3 ... 40.mp3 (one clip per row, same order).
  // [letter, name as spoken in the recording (when it is more than the letter), place where the sound is made, nasal?]
  // Place is the traditional one (kanthya, talabya, murdhanya, dantya, oshthya); change it here if the school book says otherwise.
  const BYANJAN_DATA = [
    ['ক', '', 'velar'], ['খ', '', 'velar'], ['গ', '', 'velar'], ['ঘ', '', 'velar'], ['ঙ', 'উঙ', 'velar', 1],
    ['চ', '', 'palatal'], ['ছ', '', 'palatal'], ['জ', '', 'palatal'], ['ঝ', '', 'palatal'], ['ঞ', 'ঞিঁয়', 'palatal', 1],
    ['ট', '', 'retroflex'], ['ঠ', '', 'retroflex'], ['ড', '', 'retroflex'], ['ঢ', '', 'retroflex'], ['ণ', 'মূৰ্দ্ধন্য ণ', 'retroflex', 1],
    ['ত', '', 'dental'], ['থ', '', 'dental'], ['দ', '', 'dental'], ['ধ', '', 'dental'], ['ন', 'দন্ত্য ন', 'dental', 1],
    ['প', '', 'labial'], ['ফ', '', 'labial'], ['ব', '', 'labial'], ['ভ', '', 'labial'], ['ম', '', 'labial', 1],
    ['য', '', 'palatal'], ['ৰ', '', 'retroflex'], ['ল', '', 'dental'], ['ৱ', '', 'labial'],
    ['শ', 'তালব্য শ', 'palatal'], ['ষ', 'মূৰ্দ্ধন্য ষ', 'retroflex'], ['স', 'দন্ত্য স', 'dental'], ['হ', '', 'throat'],
    ['\u09DC', 'ড-ৰে বিন্দু ড\u09DC', 'retroflex'], ['\u09DD', 'ঢ-ৰে বিন্দু ঢ\u09DD', 'retroflex'], ['\u09DF', 'অন্তঃস্থ য\u09DF', 'palatal'],
    ['ৎ', 'খণ্ড ত', 'dental'], ['ং', 'অনুস্বাৰ', 'velar', 1], ['ঃ', 'বিসৰ্গ', 'throat'], ['ঁ', 'চন্দ্ৰবিন্দু', 'none', 1]
  ];
  // Clip length in ms (voice + a little silence), used to time the mouth animation. Same order as BYANJAN_DATA.
  const BYANJAN_MS = [836, 967, 940, 862, 888, 784, 967, 1071, 1019, 1019, 862, 993, 1019, 1019, 1254, 836, 810, 1019, 1019, 1358, 836, 810, 888, 1071, 1019, 967, 940, 967, 967, 1228, 1411, 1306, 862, 1437, 1411, 1541, 1358, 1176, 1176, 1228];
  const PLACES = {
    velar: { as: 'কণ্ঠ্য', hint: 'Jeebh ka peeche wala hissa upar naram taalu ko chhoota hai.' },
    palatal: { as: 'তালব্য', hint: 'Jeebh ka beech wala hissa upar ke kadak taalu ko chhoota hai.' },
    retroflex: { as: 'মূৰ্ধন্য', hint: 'Jeebh ki nok mudkar upar taalu ko chhoti hai.' },
    dental: { as: 'দন্ত্য', hint: 'Jeebh ki nok upar ke daanton ke peeche lagti hai.' },
    labial: { as: 'ওষ্ঠ্য', hint: 'Dono hont milte hain.' },
    throat: { as: 'কণ্ঠ্য', hint: 'Awaaz gale se nikalti hai, jeebh upar nahi lagti.' },
    none: { as: 'নাসিক্য', hint: 'Awaaz naak se nikalti hai.' }
  };
  const AUDIO_V = 1;   // bump when the clips are re-recorded, so phones fetch the new files
  const byanjanAudio = n => '/audio/byanjan/' + String(n).padStart(2, '0') + '.mp3?v=' + AUDIO_V;

  // Assamese "letter + word" lesson (second Assamese mode, beside byanjan): 23 rows from one recording, public/bolo-audio/assamese-vyanjan.mp3,
  // two cues per row (the letter, then its word). Each clip runs from its letter to just before the next one, so Sunao plays the real voice.
  const AS_CUES = [1.25, 2.8, 4.99, 6.71, 8.63, 10.56, 12.33, 13.97, 16.29, 17.85, 19.62, 21.2, 23.17, 25.02, 26.87, 28.55, 30.26, 31.71, 33.58, 35.24, 37.02, 38.68, 40.62, 42.08, 43.76, 45.36, 47.06, 48.6, 50.38, 51.95, 53.56, 55.24, 56.94, 58.59, 60.08, 61.59, 63.24, 64.79, 66.6, 68.15, 69.83, 71.33, 72.87, 74.31, 75.8, 77.35];
  const AS_TOTAL = 78.3;
  const AS_SRC = '/bolo-audio/assamese-vyanjan.mp3?v=' + AUDIO_V;
  // A second teacher recording of the same 23 items (same order: letter, word, letter, word...). Only the voice match uses it: the child's voice is compared with
  // both recordings separately and the closer one counts. Put the file in public/bolo-audio/ and the cue times from `node scripts/find-cues.js <file>` here;
  // while AS_CUES2 is null nothing changes.
  const AS_SRC2 = '/bolo-audio/assamese-vyanjan2.mp3?v=' + AUDIO_V;
  const AS_CUES2 = null;
  const AS_ROWS = [
    ['ক', 'ka', 'কল', 'kal', 'banana'], ['খ', 'kha', 'খৰাহি', 'kharahi', 'basket'], ['গ', 'ga', 'গছ', 'gos', 'tree'], ['ঘ', 'gha', 'ঘৰ', 'ghor', 'house'], ['ঙ', 'nga', 'নাঙল', 'nangal', 'plough'],
    ['চ', 'ca', 'চৰাই', 'sorai', 'bird'], ['ছ', 'cha', 'ছাগলী', 'sagoli', 'goat'], ['জ', 'ja', 'জোন', 'jon', 'moon'], ['ঝ', 'jha', 'ঝৰ্ণা', 'jhorna', 'waterfall'],
    ['ট', 'ta', 'টেঙা', 'tenga', 'sour fruit'], ['ঠ', 'tha', 'ঠেলা', 'thela', 'cart'], ['ড', 'da', 'ডাল', 'dal', 'branch'], ['ঢ', 'dha', 'ঢোল', 'dhol', 'drum'],
    ['ত', 'ta', 'তৰা', 'tora', 'star'], ['থ', 'tha', 'থাল', 'thal', 'plate'], ['দ', 'da', 'দৰ্জা', 'dorja', 'door'], ['ধ', 'dha', 'ধান', 'dhan', 'paddy'], ['ন', 'na', 'নাও', 'nao', 'boat'],
    ['প', 'pa', 'পানী', 'pani', 'water'], ['ফ', 'pha', 'ফুল', 'phul', 'flower'], ['ব', 'ba', 'বাঘ', 'bagh', 'tiger'], ['ভ', 'bha', 'ভালুক', 'bhaluk', 'bear'], ['ম', 'ma', 'মেকুৰী', 'mekuri', 'cat']
  ];

  // Everything a mode needs: key (used for saving progress), title, and items {big, sub, say, match:{kind, ...}}
  function items(mode, opt) {
    opt = opt || {};
    if (mode === 'saath') return items('byanjan', opt);   // "Saath me bolo" is its own topic chip with the same letters; the Byanjan topic itself is not touched
    if (mode === 'alpha') return WORDS.map((w, i) => { const c = String.fromCharCode(65 + i); return { big: c, sub: c + ' for ' + w, say: c + ' for ' + w, match: { kind: 'letter', letter: c, word: w } }; });
    if (mode === 'table') {
      const t = TABLES.includes(+opt.table) ? +opt.table : 2;
      return Array.from({ length: 10 }, (_, k) => { const n = k + 1; return { big: t + ' × ' + n, sub: '= ' + t * n, say: t + ' times ' + n + ' is ' + t * n, match: { kind: 'number', n: t * n } }; });
    }
    if (mode === 'asvyanjan') return AS_ROWS.map((r, i) => ({ big: r[0], sub: r[0] + ' – ' + r[2] + ' (' + r[3] + ' · ' + r[4] + ')', say: r[0] + ', ' + r[2], lang: 'bn-IN', src: AS_SRC,
      clip: { s: Math.max(0, AS_CUES[2 * i] - 0.12), e: 2 * i + 2 < AS_CUES.length ? AS_CUES[2 * i + 2] - 0.3 : AS_TOTAL },
      match: { kind: 'asm', letter: r[0], word: r[2], roman: [r[1], r[3]] } }));
    if (mode === 'byanjan') return BYANJAN_DATA.map((d, i) => ({ big: d[0], sub: d[1] || d[0], say: d[1] || d[0], audio: byanjanAudio(i + 1), ms: BYANJAN_MS[i], place: d[2], nasal: !!d[3], match: { kind: 'self' } }));
    const p = POEMS.find(x => x.id === opt.poem) || POEMS[0];
    return p.lines.map(l => ({ big: l.split(' ')[0].replace(/[^A-Za-z]/g, ''), sub: l, say: l, match: { kind: 'line', line: l } }));
  }
  const stateKey = (mode, opt) => mode === 'saath' ? 'saath' : mode === 'asvyanjan' ? 'asv' : mode === 'byanjan' ? 'byanjan' : mode === 'table' ? 't' + ((opt && +opt.table) || 2) : mode === 'poem' ? 'p-' + ((opt && opt.poem) || POEMS[0].id) : 'alpha';

  // ---- matching ----
  const norm = s => String(s == null ? '' : s).toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9\u0900-\u097f ]+/g, ' ').replace(/\s+/g, ' ').trim();
  const tokens = s => { const n = norm(s); return n ? n.split(' ') : []; };

  function lev(a, b) {
    if (a === b) return 0;
    if (Math.abs(a.length - b.length) > 2) return 3;
    let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
      const cur = [i];
      for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = cur;
    }
    return prev[b.length];
  }
  // Short words must be exact (a one-letter slip changes the word); longer words may be one slip away ("tiger" heard as "tigar").
  const sameWord = (a, b) => a === b || (a.length >= 5 && b.length >= 5 && lev(a, b) <= 1);

  // numbers said as digits ("10"), words ("ten", "das") or small sums of words ("twenty five")
  function numbersIn(text) {
    const out = new Set(), tk = tokens(text);
    let run = null;
    const flush = () => { if (run != null) out.add(run); run = null; };
    for (const w of tk) {
      if (/^\d{1,3}$/.test(w)) { flush(); out.add(+w); continue; }
      if (Object.prototype.hasOwnProperty.call(NUM_WORDS, w)) {
        const v = NUM_WORDS[w];
        if (v >= 20 && v % 10 === 0 && v < 100) { flush(); run = v; out.add(v); }
        else if (v < 10 && run != null && run % 10 === 0 && run >= 20) { run += v; out.add(run); flush(); }
        else { flush(); out.add(v); }
      } else flush();
    }
    flush();
    return out;
  }

  function matchLetter(m, text) {
    const tk = tokens(text), word = tokens(m.word), snd = LETTER_SOUNDS[m.letter] || [m.letter.toLowerCase()];
    const joined = tk.join(' ');
    if (word.length && word.every(w => tk.some(t => sameWord(t, w)))) return true;                 // said the word ("apple")
    if (snd.some(s => (' ' + joined + ' ').includes(' ' + s + ' '))) return true;                   // said the letter name ("ay", "bee")
    return false;
  }
  function matchLine(line, text) {
    const want = tokens(line), got = tokens(text);
    if (!want.length || !got.length) return false;
    let hit = 0;
    for (const w of want) if (got.some(g => sameWord(g, w))) hit++;
    return hit / want.length >= 0.6 && got.length <= want.length * 2 + 2;                             // most words, and not a long unrelated sentence
  }
  // ---- Assamese (Bengali script) matching: the browser may write the word in Assamese or Bengali letters, with র for ৰ and ব for ৱ ----
  // Hindi speech engines write Assamese words in Devanagari (कल for কল): the two blocks line up letter by letter, so shift it into Bengali script before comparing
  const devToBn = s => s.replace(/[\u0900-\u097f]/g, c => String.fromCharCode(c.charCodeAt(0) + 0x80));
  const normA = s => devToBn(String(s == null ? '' : s)).toLowerCase().replace(/[’'.,!?।|\-]/g, ' ').replace(/ৰ/g, 'র').replace(/ৱ/g, 'ব').replace(/\s+/g, ' ').trim();
  function matchAsm(m, text) {
    const t = normA(text), tk = t ? t.split(' ') : [], word = normA(m.word), letter = normA(m.letter);
    if (!tk.length) return false;
    if (word && t.replace(/ /g, '').includes(word)) return true;                                              // said the word (also when the engine adds an ending)
    if (word.length >= 4 && tk.some(x => lev(x, word) <= 1)) return true;                                       // one slip on a longer word
    if (tk.some(x => x === letter || (x.startsWith(letter) && x.length <= letter.length + 2 && /^[\u09be-\u09cc\u09d7\u0981-\u0983অআ]+$/.test(x.slice(letter.length))))) return true;                    // said the letter ("ক", "কো")
    return (m.roman || []).some(r => tk.includes(String(r).toLowerCase()));                                     // engine wrote it in Roman letters ("kal")
  }
  function matchNumber(n, text) { return numbersIn(text).has(n); }

  // One spoken attempt. alternatives = the guesses of the speech engine (any one matching is enough).
  function check(item, alternatives) {
    const alts = (Array.isArray(alternatives) ? alternatives : [alternatives]).map(x => String(x == null ? '' : x)).filter(Boolean);
    const m = item && item.match;
    if (!m || !alts.length) return false;
    return alts.some(t => m.kind === 'letter' ? matchLetter(m, t) : m.kind === 'asm' ? matchAsm(m, t) : m.kind === 'number' ? matchNumber(m.n, t) : m.kind === 'line' ? matchLine(m.line, t) : false);
  }

  const dayKey = d => { d = d || new Date(); const p = n => String(n).padStart(2, '0'); return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); };
  const fmtTime = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');

  return { WORDS, POEMS, TABLES, BYANJAN_DATA, BYANJAN_MS, AS_ROWS, AS_CUES, AS_SRC2, AS_CUES2, matchAsm, PLACES, byanjanAudio, LETTER_SOUNDS, items, stateKey, norm, tokens, numbersIn, check, matchLetter, matchLine, matchNumber, dayKey, fmtTime };
});
