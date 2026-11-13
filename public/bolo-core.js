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

  // Everything a mode needs: key (used for saving progress), title, and items {big, sub, say, match:{kind, ...}}
  function items(mode, opt) {
    opt = opt || {};
    if (mode === 'alpha') return WORDS.map((w, i) => { const c = String.fromCharCode(65 + i); return { big: c, sub: c + ' for ' + w, say: c + ' for ' + w, match: { kind: 'letter', letter: c, word: w } }; });
    if (mode === 'table') {
      const t = TABLES.includes(+opt.table) ? +opt.table : 2;
      return Array.from({ length: 10 }, (_, k) => { const n = k + 1; return { big: t + ' × ' + n, sub: '= ' + t * n, say: t + ' times ' + n + ' is ' + t * n, match: { kind: 'number', n: t * n } }; });
    }
    const p = POEMS.find(x => x.id === opt.poem) || POEMS[0];
    return p.lines.map(l => ({ big: l.split(' ')[0].replace(/[^A-Za-z]/g, ''), sub: l, say: l, match: { kind: 'line', line: l } }));
  }
  const stateKey = (mode, opt) => mode === 'table' ? 't' + ((opt && +opt.table) || 2) : mode === 'poem' ? 'p-' + ((opt && opt.poem) || POEMS[0].id) : 'alpha';

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
  function matchNumber(n, text) { return numbersIn(text).has(n); }

  // One spoken attempt. alternatives = the guesses of the speech engine (any one matching is enough).
  function check(item, alternatives) {
    const alts = (Array.isArray(alternatives) ? alternatives : [alternatives]).map(x => String(x == null ? '' : x)).filter(Boolean);
    const m = item && item.match;
    if (!m || !alts.length) return false;
    return alts.some(t => m.kind === 'letter' ? matchLetter(m, t) : m.kind === 'number' ? matchNumber(m.n, t) : m.kind === 'line' ? matchLine(m.line, t) : false);
  }

  const dayKey = d => { d = d || new Date(); const p = n => String(n).padStart(2, '0'); return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); };
  const fmtTime = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');

  return { WORDS, POEMS, TABLES, LETTER_SOUNDS, items, stateKey, norm, tokens, numbersIn, check, matchLetter, matchLine, matchNumber, dayKey, fmtTime };
});
