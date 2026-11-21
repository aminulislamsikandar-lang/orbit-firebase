// Orbit 123 (numbers): the shared core of "123 Levels" (numlevels.js) and "123 Games" (numgames.js), the same way ABC Levels / ABC Games work.
// It holds the question rules (small pure functions, the random source can be injected so tests can check every question has exactly one right answer),
// the phone voice (the SAME voice code as ABC Levels / ABC Games: best natural English voice, each phrase once, the next step runs only after the voice has finished, so nothing is cut off),
// the tiny DOM helpers and the style. Needs no network and no library.
(function (g) {
  'use strict';
  const N = (hing, en) => ({ hing, en });
  const TX = {
    lTitle: N('123 Levels', '123 Levels'), gTitle: N('123 Games', '123 Games'),
    lIntro: N('Level pass karo, agla level khulega.', 'Pass a level to open the next one.'),
    gIntro: N('Chhote bachhon ke liye numbers ke khel. Ek khel chuno.', 'Number games for little children. Pick a game.'),
    pass: N('Pass', 'Pass'), best: N('Sabse achha', 'Best'), back: N('Levels par wapas', 'Back to levels'), gback: N('Khelon par wapas', 'Back to games'),
    locked: N('Pichhla level pass karo', 'Pass the level before'),
    again: N('Phir koshish karo', 'Try again'), great: N('Shabaash!', 'Well done!'),
    next: N('Agla level', 'Next level'), replay: N('Dobara khelo', 'Play again'), retry: N('Phir se khelo', 'Try again'), levels: N('Levels', 'Levels'),
    opened: N('Shabaash! Agla level khul gaya.', 'Well done! The next level is open.'), allDone: N('Shabaash! 123 ke saare level poore.', 'Well done! All 123 levels are finished.'),
    needs: N('Pass hone ke liye', 'To pass you need'), needs2: N('chahiye. Ek baar aur khelo.', '. Play once more.'),
    level: N('Level', 'Level'), score: N('Score', 'Score'), done: N('Shabaash', 'Well done'), listen: N('Suno', 'Listen'), time: N('Time', 'Time'),
    askCount: N('Kitne hain? Gino aur number chuno', 'How many are there? Count and pick'),
    askName: N('Is number ka naam chuno', 'Pick the name of this number'),
    askBig: N('Kaun sa number bada hai?', 'Which number is bigger?'),
    askGap1: N('Kaun sa number gayab hai?', 'Which number is missing?'),
    askGap3: N('Teeno khali jagah bharo', 'Fill all three gaps'),
    askOrder: N('Chhote se bade ke order mein dabao', 'Tap from smallest to biggest'),
    askAdd: N('Jodo! Kitne hue?', 'Add them. How many?'), askSub: N('Ghatao! Kitne bache?', 'Take away. How many are left?'),
    askTens: N('Kitne das aur kitne ikai?', 'How many tens and how many ones?'),
    askEO: N('Jod (even) hai ya bejod (odd)?', 'Is it even or odd?'), askTable: N('Table poora karo', 'Finish the table'),
    askSign: N('Sahi chinh chuno', 'Pick the right sign'), askBefore: N('Kaun sa number pehle aata hai?', 'Which number comes just before?'),
    askAfter: N('Kaun sa number baad mein aata hai?', 'Which number comes just after?'),
    even: N('Jod', 'Even'), odd: N('Bejod', 'Odd'), tens: N('das', 'tens'), ones: N('ikai', 'ones'),
    lv: [N('Gino aur chuno', 'Count and pick'), N('Number ka naam 1\u201310', 'Number names 1\u201310'), N('Number ka naam 11\u201320', 'Number names 11\u201320'), N('Chhota ya bada', 'Bigger or smaller'), N('Ek khali jagah', 'One gap'), N('Teen khali jagah', 'Three gaps'), N('Number order', 'Number order'), N('Jodo', 'Add'), N('Ghatao', 'Take away'), N('Das aur ikai', 'Tens and ones')],
    ld: [N('Picture gino, number chuno', 'Count the pictures, pick the number'), N('Digit dekho, naam chuno', 'See the digit, pick its name'), N('Digit dekho, naam chuno', 'See the digit, pick its name'), N('Bada number dhundo', 'Find the bigger number'), N('Gayab number dhundo', 'Find the missing number'), N('Teen numbers bharo', 'Fill three numbers'), N('Chhote se bade tak lagao', 'Put them in order'), N('Pictures ke saath addition', 'Adding with pictures'), N('Subtraction seekho', 'Learn subtraction'), N('Place value samjho', 'Understand place value')]
  };
  const lang = () => (g.orbitLang && g.orbitLang()) || 'hing';
  const L = k => TX[k][lang()] || TX[k].hing;
  const LN = (arr, i) => TX[arr][i][lang()] || TX[arr][i].hing;

  const NAMES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'];
  // picture, word, plural (the same kind of emoji pictures as ABC)
  const PIC = [['\uD83C\uDF4E', 'apple', 'apples'], ['\u2B50', 'star', 'stars'], ['\uD83D\uDC1F', 'fish', 'fish'], ['\uD83C\uDF88', 'balloon', 'balloons'], ['\uD83D\uDC25', 'chick', 'chicks'], ['\uD83C\uDF4C', 'banana', 'bananas'], ['\u26BD', 'ball', 'balls'], ['\uD83C\uDF38', 'flower', 'flowers']];

  // ---- pure rules ----
  const stars = p => (p >= 100 ? 3 : p >= 80 ? 2 : p >= 60 ? 1 : 0);
  const mkR = rnd => { const r = rnd || Math.random; return { int: (a, b) => a + Math.floor(r() * (b - a + 1)), pick: arr => arr[Math.floor(r() * arr.length)], shuffle: arr => { const x = arr.slice(); for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; } return x; } }; };
  const near = (R, ans, lo, hi) => { const s = new Set([ans]); while (s.size < 4) s.add(R.int(lo, hi)); return R.shuffle([...s]).map(String); };   // 4 different numbers, one of them is the answer
  // One question. d = {k: kind, lo, hi}. Every question has exactly one right answer (or one right order). q.good is the right option text.
  function makeQ(d, rnd) {
    const R = mkR(rnd), k = d.k, base = { k, slip: false, msg: '' };
    if (k === 'count') { const n = R.int(1, 10), p = R.pick(PIC); return Object.assign(base, { pic: p[0].repeat(n), ask: 'askCount', intro: 'How many are there?', good: String(n), opts: near(R, n, 1, 10), ok: n + ' ' + (n === 1 ? p[1] : p[2]) }); }
    if (k === 'name') {
      const lo = d.lo || 1, hi = d.hi || 10, n = R.int(lo, hi), pool = []; for (let i = lo; i <= hi; i++) if (i !== n) pool.push(i);
      return Object.assign(base, { big: String(n), ask: 'askName', intro: n + '. Which word is this number?', good: NAMES[n], opts: R.shuffle([n].concat(R.shuffle(pool).slice(0, 3))).map(x => NAMES[x]), ok: n + '. ' + NAMES[n] });
    }
    if (k === 'big') { let a = R.int(1, 50), b = R.int(1, 50); while (a === b) b = R.int(1, 50); return Object.assign(base, { big: a + '   ' + b, ask: 'askBig', intro: a + ' or ' + b + '. Which number is bigger?', good: String(Math.max(a, b)), opts: R.shuffle([a, b]).map(String), ok: Math.max(a, b) + ' is bigger than ' + Math.min(a, b) }); }
    if (k === 'gap1') { const len = 5, st = R.int(1, 17), seg = []; for (let i = 0; i < len; i++) seg.push(st + i); const m = R.int(0, len - 1); return Object.assign(base, { row: seg.map((x, i) => (i === m ? '?' : String(x))), ask: 'askGap1', intro: 'Which number is missing?', good: String(seg[m]), opts: R.shuffle([seg[m]].concat(R.shuffle(Array.from({ length: 22 }, (_, i) => i + 1).filter(x => !seg.includes(x))).slice(0, 3))).map(String), ok: seg.join(', ') }); }
    if (k === 'gap3') {
      const len = 7, st = R.int(1, 14), seg = []; for (let i = 0; i < len; i++) seg.push(st + i);
      const miss = R.shuffle([0, 1, 2, 3, 4, 5, 6]).slice(0, 3).sort((a, b) => a - b), tiles = miss.map(i => seg[i]);
      tiles.push(R.pick(Array.from({ length: 22 }, (_, i) => i + 1).filter(x => !seg.includes(x))));
      return Object.assign(base, { seg, miss, tiles: R.shuffle(tiles), fill: {}, used: {}, sel: miss[0], ask: 'askGap3', intro: 'Fill the missing numbers', ok: seg.join(', ') });
    }
    if (k === 'order') {
      const set = new Set(); while (set.size < 5) set.add(R.int(1, 30)); const w = R.shuffle([...set]), sorted = w.slice().sort((a, b) => a - b);
      return Object.assign(base, { w: sorted, pos: 0, tiles: w, used: {}, ask: 'askOrder', intro: 'Tap the numbers from smallest to biggest', ok: sorted.join(', ') });
    }
    if (k === 'add') { const a = R.int(1, 6), b = R.int(1, 6), p = R.pick(PIC)[0]; return Object.assign(base, { pic: p.repeat(a) + ' + ' + p.repeat(b), big: a + ' + ' + b + ' = ?', ask: 'askAdd', intro: a + ' plus ' + b + ' equals?', good: String(a + b), opts: near(R, a + b, 2, 12), ok: a + ' plus ' + b + ' equals ' + (a + b) }); }
    if (k === 'sub') { const a = R.int(3, 10), b = R.int(1, a - 1); return Object.assign(base, { big: a + ' \u2212 ' + b + ' = ?', ask: 'askSub', intro: a + ' minus ' + b + ' equals?', good: String(a - b), opts: near(R, a - b, 0, 10), ok: a + ' minus ' + b + ' equals ' + (a - b) }); }
    if (k === 'tens') {
      const t = R.int(1, 9), u = R.int(0, 9), n = t * 10 + u, f = (x, y) => x + ' ' + L('tens') + '  ' + y + ' ' + L('ones'), o = new Set([f(t, u)]);
      while (o.size < 4) o.add(f(R.int(1, 9), R.int(0, 9)));
      return Object.assign(base, { big: String(n), ask: 'askTens', intro: n + '. How many tens and how many ones?', good: f(t, u), opts: R.shuffle([...o]), ok: n + ' is ' + t + ' tens and ' + u + ' ones' });
    }
    if (k === 'evenodd') { const n = R.int(1, 30); return Object.assign(base, { big: String(n), ask: 'askEO', intro: n + '. Is it even or odd?', good: n % 2 ? L('odd') : L('even'), opts: [L('even'), L('odd')], ok: n + ' is ' + (n % 2 ? 'odd' : 'even') }); }
    if (k === 'table') { const t = R.int(2, 5), m = R.int(1, 10); return Object.assign(base, { big: t + ' \u00D7 ' + m + ' = ?', ask: 'askTable', intro: t + ' times ' + m + ' equals?', good: String(t * m), opts: near(R, t * m, t, t * 10), ok: t + ' times ' + m + ' equals ' + t * m }); }
    if (k === 'sign') {
      const a = R.int(1, 30), b = R.int(0, 4) === 0 ? a : R.int(1, 30), ans = a < b ? '<' : a > b ? '>' : '=';
      return Object.assign(base, { big: a + '  \u2026  ' + b, ask: 'askSign', intro: a + ' and ' + b + '. Pick the right sign', good: ans, opts: ['<', '>', '='], ok: a + (ans === '<' ? ' is less than ' : ans === '>' ? ' is greater than ' : ' is equal to ') + b });
    }
    if (k === 'before') {   // d.after: the number just after, else just before
      const n = R.int(2, 29), after = !!d.after, good = after ? n + 1 : n - 1;
      return Object.assign(base, { big: String(n), ask: after ? 'askAfter' : 'askBefore', intro: n + '. Which number comes just ' + (after ? 'after' : 'before') + '?', good: String(good), opts: near(R, good, Math.max(0, n - 4), n + 5), ok: good + ' comes just ' + (after ? 'after ' : 'before ') + n });
    }
    throw new Error('unknown question kind ' + k);
  }

  // ---- speech: the same phone voice as ABC Games / ABC Levels, each phrase once, the callback runs only after the voice has finished (so nothing is cut off) ----
  let VO = null, sid = 0, stT = 0;
  const timers = [];
  function later(fn, ms) { const t = setTimeout(() => { const i = timers.indexOf(t); if (i >= 0) timers.splice(i, 1); fn(); }, ms); timers.push(t); return t; }
  function pickVoice() {
    try {
      const vs = g.speechSynthesis.getVoices().filter(v => /^en/i.test(v.lang)); if (!vs.length) return;
      const pref = [/natural|neural|online/i, /google us english/i, /samantha|ava|allison|zira|jenny|aria|karen|moira/i, /en[-_]US/i, /en[-_](IN|GB|AU)/i];
      for (const p of pref) { const f = vs.filter(v => p.test(v.name + ' ' + v.lang)); if (f.length) { VO = f[0]; return; } }
      VO = vs[0];
    } catch (e) { /* no speech on this device */ }
  }
  function say(t, cb) {
    let done = false; const id = ++sid;
    const fin = () => { if (!done && cb && id === sid) { done = true; later(cb, 500); } };
    try {
      if (!g.speechSynthesis || !g.SpeechSynthesisUtterance) { fin(); return; }
      if (!VO) pickVoice();
      const u = new g.SpeechSynthesisUtterance(t);
      if (VO) { u.voice = VO; u.lang = VO.lang; } else u.lang = 'en-US';
      u.rate = .85; u.pitch = 1.05; u.onend = fin; u.onerror = fin;
      later(fin, 8000);   // safety: some phones never report the end of a phrase
      clearTimeout(stT); g.speechSynthesis.cancel(); stT = setTimeout(() => g.speechSynthesis.speak(u), 150);
    } catch (e) { fin(); }
  }
  function stopAll() { sid++; try { if (g.speechSynthesis) g.speechSynthesis.cancel(); } catch (e) { /* ignore */ } }
  function clearAll() { stopAll(); timers.splice(0).forEach(clearTimeout); clearTimeout(stT); }
  try { if (g.speechSynthesis) g.speechSynthesis.addEventListener ? g.speechSynthesis.addEventListener('voiceschanged', pickVoice) : (g.speechSynthesis.onvoiceschanged = pickVoice); } catch (e) { /* ignore */ }

  // ---- tiny DOM helpers (no innerHTML anywhere) ----
  const h = (tag, cls, txt, attrs) => { const e = g.document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };
  const btn = (cls, txt, fn, attrs) => { const b = h('button', cls, txt, attrs); b.type = 'button'; b.addEventListener('click', fn); return b; };
  const clear = el => { while (el.firstChild) el.removeChild(el.firstChild); };
  const starRow = n => { const e = h('span', 'nl-st'); for (let i = 0; i < 3; i++) e.appendChild(h(i < n ? 'span' : 'i', null, '\u2605')); return e; };

  const CSS = '.nl-top{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:8px 0}'
    + '.nl-link{border:0;background:#16a34a;color:#fff;font-weight:700;border-radius:18px;padding:6px 14px;box-shadow:0 3px 0 #0f7a36}'   // green = tap here (the same rule as the answer and result buttons)
    + '.nl-pill{border:1px solid var(--ln);background:var(--card);border-radius:18px;padding:3px 12px;font-weight:700}'
    + '.nl-trail{position:relative;margin:16px 0 4px}'
    + '.nl-trail:before{content:"";position:absolute;left:50%;top:30px;bottom:30px;width:6px;margin-left:-3px;border-radius:6px;background:repeating-linear-gradient(var(--ln) 0 12px,transparent 12px 22px)}'
    + '.nl-row{position:relative;margin:0 0 20px;width:80%}.nl-row.r{margin-left:20%}'
    + '.nl-hit{display:flex;align-items:center;gap:12px;width:100%;text-align:left;border:0;background:transparent;padding:0;color:inherit;font:inherit}'
    + '.nl-row.r .nl-hit{flex-direction:row-reverse;text-align:right}'
    + '.nl-node{flex:none;width:68px;height:68px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:30px;font-weight:800;color:#fff;background:#16a34a;box-shadow:0 4px 0 #0f7a36;position:relative;z-index:1}'
    + '.nl-row.lock .nl-node{background:#9aa9b8;box-shadow:0 4px 0 #77879a;font-size:24px}.nl-row.done .nl-node{background:#f5b301;box-shadow:0 4px 0 #c58d00}'
    + '.nl-row.now .nl-node{animation:nlbob 1.6s ease-in-out infinite}'
    + '.nl-nm{display:block;font-weight:700;font-size:17px;line-height:1.2}.nl-sm{display:block;color:var(--mut);font-size:14px}'
    + '.nl-st{color:#f5b301;letter-spacing:2px}.nl-st i{font-style:normal;color:var(--ln)}'
    + '.nl-c{background:var(--card);border-radius:22px;padding:18px;margin:12px 0;text-align:center;box-shadow:0 1px 0 var(--ln)}'
    + '.nl-bar{height:10px;border-radius:8px;background:var(--ln);overflow:hidden;margin:8px 0}.nl-bar i{display:block;height:100%;background:#16a34a}'
    + '.nl-pic{font-size:88px;line-height:1.15;border:0;background:transparent;cursor:pointer;padding:0}'
    + '.nl-big{font-size:84px;line-height:1.05;font-weight:700}.nl-ask{font-size:19px;margin:6px 0 10px}.nl-msg{min-height:28px;margin-top:8px;font-weight:600}'
    + '.nl-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:10px}'
    + '.nl-opt{font-size:38px;font-weight:700;padding:14px;border:0;background:#16a34a;color:#fff;border-radius:16px;box-shadow:0 4px 0 #0f7a36}.nl-opt.ok{background:#14532d;color:#fff;box-shadow:0 4px 0 #0b3a1f}'
    + '.nl-rowt{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin:12px 0}'
    + '.nl-slot{width:46px;height:56px;border:2px solid var(--ln);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:700;background:var(--bg)}'
    + '.nl-slot.gap{border-style:dashed;border-color:#16a34a}.nl-slot.ok{background:#2e7d32;border-color:#2e7d32;color:#fff}'
    + '.nl-slot.tg{background:linear-gradient(90deg,rgba(255,122,168,.35),rgba(255,200,97,.35),rgba(110,231,183,.35),rgba(125,211,252,.35),rgba(196,181,253,.35),rgba(255,122,168,.35)),var(--bg);background-size:300% 100%,100% 100%;animation:nltg 2.4s linear infinite,nltgg 1.2s ease-in-out infinite;color:#16a34a}'
    + '@keyframes nltg{to{background-position:300% 0,0 0}}@keyframes nltgg{0%,100%{box-shadow:inset 0 0 4px 0 rgba(255,255,255,.2)}50%{box-shadow:inset 0 0 16px 5px rgba(255,255,255,.45)}}'
    + '.nl-tile{width:60px;height:60px;font-size:28px;font-weight:700;border:0;background:#16a34a;color:#fff;border-radius:14px;box-shadow:0 3px 0 #0f7a36}.nl-tile.used{visibility:hidden}'
    + '.nl-no{animation:nlsh .4s;background:#c62828!important;color:#fff!important}'
    + '.nl-res .nl-big{font-size:60px}.nl-res .nl-stars{font-size:48px;letter-spacing:6px;margin:6px 0;color:#f5b301}.nl-res .nl-stars span{display:inline-block;animation:nlpop .5s both}'
    + '.nl-acts{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:12px}'
    + '.nl-acts .btn{background:#16a34a;color:#fff;box-shadow:0 3px 0 #0f7a36}'   // Agla level, Dobara khelo / Phir se khelo, Levels: all green
    + '@keyframes nlbob{50%{transform:translateY(-5px)}}@keyframes nlsh{25%{transform:translateX(-8px)}75%{transform:translateX(8px)}}@keyframes nlpop{0%{transform:scale(0)}70%{transform:scale(1.25)}100%{transform:scale(1)}}'
    + '.nl-pic.cnt{font-size:44px;word-break:break-all;line-height:1.3}.nl-big.sm{font-size:56px}.nl-opt.sm{font-size:22px}'
    + '.nl-menu{display:grid;gap:12px;margin-top:14px}'
    + '.nl-card{display:flex;align-items:center;gap:14px;width:100%;text-align:left;border:1px solid var(--ln);background:var(--card);border-radius:18px;padding:14px 16px;color:inherit;font:inherit;box-shadow:0 3px 0 var(--ln)}'
    + '.nl-card b{display:block;font-family:"Baloo 2",system-ui,sans-serif;font-size:20px}.nl-card .em{font-size:38px;flex:none}.nl-card .hs{margin-left:auto;color:var(--mut);font-weight:700;white-space:nowrap}'
    + '.nl-bgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:12px}'
    + '.nl-bal{height:84px;border:0;border-radius:50% 50% 48% 48%;color:#fff;font-size:30px;font-weight:800;background:#16a34a;box-shadow:inset -6px -8px 0 rgba(0,0,0,.14);transition:transform .2s,opacity .25s}.nl-bal.c1{background:#f5b301}.nl-bal.c2{background:#2aa7d6}.nl-bal.c3{background:#7a5aa6}.nl-bal.gone{transform:scale(1.5);opacity:0;pointer-events:none}'
    + '.nl-mgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:12px}'
    + '.nl-mc{height:88px;border:0;border-radius:16px;background:#16a34a;color:#fff;font-size:30px;font-weight:800;box-shadow:0 4px 0 #0f7a36;padding:4px;word-break:break-all}.nl-mc.sm{font-size:15px}.nl-mc.open{background:var(--card);color:inherit;box-shadow:0 4px 0 var(--ln)}.nl-mc.done{background:#f5b301;color:#fff;box-shadow:0 4px 0 #c58d00;pointer-events:none}'
    + '.nl-tgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:12px}'
    + '.nl-tb{height:80px;border:0;border-radius:18px;background:#16a34a;color:#fff;font-size:36px;font-weight:800;box-shadow:0 4px 0 #0f7a36}.nl-tb.done{background:#f5b301;box-shadow:0 4px 0 #c58d00;opacity:.6;pointer-events:none}'
    + '.nl-time{font-weight:800}'
    + '@media(prefers-reduced-motion:reduce){.nl-row.now .nl-node,.nl-no,.nl-res .nl-stars span{animation:none}}';
  function css() { if (g.document.getElementById('num-css')) return; const s = h('style', null, CSS); s.id = 'num-css'; g.document.head.appendChild(s); }

  g.NUM = { N, L, LN, lang, NAMES, PIC, stars, mkR, makeQ, say, stopAll, clearAll, later, h, btn, clear, starRow, css };
})(typeof window !== 'undefined' ? window : globalThis);
