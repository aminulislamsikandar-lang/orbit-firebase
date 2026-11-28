// Orbit ABC Games: two small alphabet games for young children.
//   1. ABC Learn and Quiz  - see a picture for every letter, listen to it, then answer a quiz
//   2. ABC Puzzle          - fill the missing letters of the A-Z strip, and build words from jumbled letters
// index.html calls ABC.viewHTML() to draw the page, ABC.mount(root) after drawing and ABC.leave() when the student goes elsewhere.
// Needs no library. The 26 letter pictures are small transparent files (public/abc/a.webp ... z.webp, saved for offline by sw.js); the other pictures are emoji (they live inside the games only; the Orbit menu keeps its line icons).
// The game logic is in small pure functions with an injectable random source so tests can check every puzzle has exactly one right answer.
(function (g) {
  'use strict';
  const N = (hing, en) => ({ hing, en });
  const TX = {
    title: N('ABC Games', 'ABC Games'),
    intro: N('Chhote bachhon ke liye alphabet ke khel. Ek khel chuno.', 'Alphabet games for little children. Pick a game.'),
    gLearn: N('ABC Seekho aur Quiz', 'ABC Learn and Quiz'),
    dLearn: N('Har letter ki tasveer dekho, awaaz suno, phir quiz khelo.', 'See a picture for every letter, listen to it, then play a quiz.'),
    gPuz: N('ABC Puzzle', 'ABC Puzzle'),
    dPuz: N('Khali jagah bharo aur bikhre letters se shabd banao.', 'Fill the missing letters and build words from jumbled letters.'),
    best: N('Sabse achha', 'Best'), back: N('Khelon par wapas', 'Back to games'),
    tLearn: N('Seekho', 'Learn'), tQuiz: N('Quiz', 'Quiz'), tGaps: N('Khali jagah', 'Fill the gaps'), tWords: N('Shabd banao', 'Make the word'),
    listen: N('Suno', 'Listen'), prev: N('Pichhla', 'Previous'), next: N('Agla', 'Next'),
    which: N('Ye kis letter se shuru hota hai?', 'Which letter does it start with?'),
    missing: N('Kaun se letters gayab hain?', 'Which letters are missing?'),
    order: N('Letters ko sahi order mein dabao', 'Tap the letters in order'),
    again: N('Phir koshish karo', 'Try again'), replay: N('Dobara khelo', 'Play again'),
    done: N('Shabaash', 'Well done'), score: N('Score', 'Score')
  };
  const lang = () => (g.orbitLang && g.orbitLang()) || 'hing';
  const L = k => TX[k][lang()] || TX[k].hing;

  const AL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  // letter, word, picture
  const D = [['A', 'Apple', '\uD83C\uDF4E'], ['B', 'Ball', '\u26BD'], ['C', 'Cat', '\uD83D\uDC31'], ['D', 'Dog', '\uD83D\uDC36'], ['E', 'Elephant', '\uD83D\uDC18'], ['F', 'Fish', '\uD83D\uDC1F'], ['G', 'Grapes', '\uD83C\uDF47'], ['H', 'Hat', '\uD83C\uDFA9'], ['I', 'Ice cream', '\uD83C\uDF66'], ['J', 'Juice', '\uD83E\uDDC3'], ['K', 'Kite', '\uD83E\uDE81'], ['L', 'Lion', '\uD83E\uDD81'], ['M', 'Moon', '\uD83C\uDF19'], ['N', 'Nest', '\uD83E\uDEBA'], ['O', 'Orange', '\uD83C\uDF4A'], ['P', 'Parrot', '\uD83E\uDD9C'], ['Q', 'Queen', '\uD83D\uDC78'], ['R', 'Rainbow', '\uD83C\uDF08'], ['S', 'Sun', '\u2600\uFE0F'], ['T', 'Tiger', '\uD83D\uDC2F'], ['U', 'Umbrella', '\u2602\uFE0F'], ['V', 'Van', '\uD83D\uDE90'], ['W', 'Watch', '\u231A'], ['X', 'Xylophone', '\uD83C\uDFB9'], ['Y', 'Yo-yo', '\uD83E\uDE80'], ['Z', 'Zebra', '\uD83E\uDD93']];
  const WORDS = [['CAT', '\uD83D\uDC31'], ['DOG', '\uD83D\uDC36'], ['SUN', '\u2600\uFE0F'], ['PIG', '\uD83D\uDC37'], ['HEN', '\uD83D\uDC14'], ['BEE', '\uD83D\uDC1D'], ['COW', '\uD83D\uDC2E'], ['BUS', '\uD83D\uDE8C'], ['CAR', '\uD83D\uDE97'], ['EGG', '\uD83E\uDD5A'], ['KEY', '\uD83D\uDD11'], ['BED', '\uD83D\uDECF\uFE0F'], ['BAT', '\uD83E\uDD87'], ['OWL', '\uD83E\uDD89'], ['FOX', '\uD83E\uDD8A']];
  const CHEER = ['Awesome!', 'Super!', 'Great job!', 'Hooray!', 'Wow!', 'Fantastic!', 'Brilliant!'];
  const BEST = 'orbit_abc_best_';

  // ---- pure game logic (random source can be injected, tests pass a fixed one) ----
  const mkR = rnd => { const r = rnd || Math.random; return { int: (a, b) => a + Math.floor(r() * (b - a + 1)), pick: arr => arr[Math.floor(r() * arr.length)], shuffle: arr => { const x = arr.slice(); for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; } return x; } }; };
  // Quiz: a picture + 4 letters, exactly one is the first letter of the word.
  function makeQuiz(rnd) {
    const R = mkR(rnd), q = R.pick(D);
    return { q, opts: R.shuffle([q[0]].concat(R.shuffle(AL.filter(l => l !== q[0])).slice(0, 3))) };
  }
  // Fill the gaps: 7 letters in a row, 3 are missing; tiles = the 3 missing letters + 1 wrong letter from outside the row.
  function makeGaps(rnd) {
    const R = mkR(rnd), len = 7, st = R.int(0, 26 - len), seg = AL.slice(st, st + len);
    const miss = R.shuffle([0, 1, 2, 3, 4, 5, 6]).slice(0, 3).sort((a, b) => a - b);
    const tiles = miss.map(k => seg[k]);
    tiles.push(R.pick(AL.filter(l => !seg.includes(l))));
    return { seg, miss, tiles: R.shuffle(tiles), fill: {}, used: {}, sel: miss[0] };
  }
  // Make the word: a picture and the letters of its word, jumbled.
  function makeWord(rnd) {
    const R = mkR(rnd), w = R.pick(WORDS);
    return { w: w[0], e: w[1], pos: 0, tiles: R.shuffle(w[0].split('')), used: {} };
  }

  // ---- speech: best natural English voice of the phone, each phrase once, callback only after the voice has finished ----
  let VO = null, sid = 0, stT = 0;
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
  try { if (g.speechSynthesis) g.speechSynthesis.onvoiceschanged = pickVoice; } catch (e) { /* ignore */ }

  // ---- tiny DOM helpers (no innerHTML anywhere) ----
  const timers = [];
  function later(fn, ms) { const t = setTimeout(() => { const i = timers.indexOf(t); if (i >= 0) timers.splice(i, 1); fn(); }, ms); timers.push(t); return t; }
  const h = (tag, cls, txt, attrs) => { const e = g.document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };
  const btn = (cls, txt, fn, attrs) => { const b = h('button', cls, txt, attrs); b.type = 'button'; b.addEventListener('click', fn); return b; };
  // The picture of a letter (public/abc/a.webp ... z.webp, transparent). If it can not load (first visit offline), the old emoji is shown instead.
  const picBtn = (cls, d, fn) => {
    const b = btn(cls, null, fn, { 'aria-label': d[1] });
    const im = h('img', 'abc-img', null, { src: '/abc/' + d[0].toLowerCase() + '.webp?v=1', alt: '', width: '128', height: '128', draggable: 'false' });
    im.addEventListener('error', () => { b.textContent = d[2]; });
    b.appendChild(im); return b;
  };
  const clear = el => { while (el.firstChild) el.removeChild(el.firstChild); };

  const CSS = '.abc-bar{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:10px 0 4px}'
    + '.abc-link{border:0;background:transparent;color:var(--mut);padding:6px 6px 6px 0}'
    + '.abc-menu{display:grid;gap:12px;margin-top:14px}'
    + '.abc-card{display:block;width:100%;text-align:left;border:1px solid var(--ln);background:var(--card);border-radius:18px;padding:16px}'
    + '.abc-card b{display:block;font-family:"Baloo 2",system-ui,sans-serif;font-size:20px}'
    + '.abc-c{background:var(--card);border-radius:22px;padding:18px;margin:12px 0;text-align:center;box-shadow:0 1px 0 var(--ln)}'
    + '.abc-big{font-family:"Baloo 2",system-ui,sans-serif;font-size:92px;line-height:1.05;font-weight:700}'
    + '.abc-pic{font-size:88px;line-height:1.15;border:0;background:transparent;cursor:pointer;padding:0}'
    + '.abc-pic .abc-img{display:block;width:128px;height:128px;object-fit:contain;margin:0 auto;pointer-events:none;-webkit-user-drag:none}'
    + '.abc-word{font-size:26px;margin:6px 0 10px}.abc-q{font-size:19px;margin:6px 0 10px}.abc-msg{min-height:28px;margin-top:8px;font-weight:600}'
    + '.abc-strip{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin:12px 0}.abc-strip .chip{min-width:36px;justify-content:center;padding:4px 8px}'
    + '.abc-nav{display:flex;gap:10px;justify-content:center}'
    + '.abc-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px}'
    + '.abc-opt{font-size:38px;font-weight:700;padding:14px;border:1px solid var(--ln);background:var(--card);border-radius:16px}'
    + '.abc-row{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin:12px 0}'
    + '.abc-slot{width:46px;height:56px;border:2px solid var(--ln);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:700;background:var(--bg)}'
    + '.abc-slot.gap{border-style:dashed;cursor:pointer}.abc-slot.sel{border-color:var(--tx)}'
    + '.abc-slot.ok{background:#2e7d32;border-color:#2e7d32;color:#fff;animation:abcpop .3s}'
    + '.abc-tile{width:60px;height:60px;font-size:28px;font-weight:700;border:1px solid var(--ln);background:var(--card);border-radius:14px}'
    + '.abc-tile.used{visibility:hidden}.abc-no{animation:abcsh .4s;background:#c62828!important;color:#fff!important}.abc-opt.abc-ok{background:#2e7d32;color:#fff;border-color:#2e7d32}'
    + '.abc-cf{position:fixed;inset:0;pointer-events:none;overflow:hidden;z-index:60}'
    + '.abc-cf i{position:absolute;top:-24px;width:10px;height:14px;animation:abcfall linear forwards}'
    + '.abc-cheer{position:fixed;left:50%;top:34%;font-size:34px;font-weight:700;background:var(--on);color:var(--onbg);padding:12px 26px;border-radius:30px;white-space:nowrap;transform:translate(-50%,-50%) scale(0);animation:abccheer 1.8s ease forwards}'
    + '.abc-bounce{animation:abcbnc .8s}'
    + '@keyframes abcfall{to{transform:translateY(115vh) rotate(720deg)}}'
    + '@keyframes abccheer{0%{transform:translate(-50%,-50%) scale(0) rotate(-10deg)}25%{transform:translate(-50%,-50%) scale(1.2) rotate(5deg)}40%{transform:translate(-50%,-50%) scale(1)}80%{opacity:1}100%{transform:translate(-50%,-50%) scale(1.1);opacity:0}}'
    + '@keyframes abcbnc{30%{transform:scale(1.05) rotate(-1.5deg)}60%{transform:scale(.98) rotate(1.5deg)}}'
    + '@keyframes abcpop{50%{transform:scale(1.2)}}@keyframes abcsh{25%{transform:translateX(-8px)}75%{transform:translateX(8px)}}'
    + '@media(prefers-reduced-motion:reduce){.abc-cf i{display:none}.abc-bounce,.abc-slot.ok,.abc-no{animation:none}}';
  function css() { if (g.document.getElementById('abc-css')) return; const s = h('style', null, CSS); s.id = 'abc-css'; g.document.head.appendChild(s); }

  // ---- state ----
  let ROOT = null, S = { r: null }, P = null, score = 0, n = 0, lock = false, kind = '';
  const TOTAL = 10, TOTAL_PUZ = 8;
  const bestGet = k => { try { return +localStorage.getItem(BEST + k) || 0; } catch (e) { return 0; } };
  const bestSet = (k, v) => { try { if (v > bestGet(k)) localStorage.setItem(BEST + k, String(v)); } catch (e) { /* storage full or blocked */ } };
  const show = nodes => { clear(ROOT); nodes.forEach(x => ROOT.appendChild(x)); };
  const scoreLine = tot => h('div', 'mut', L('score') + ' ' + score + ' / ' + tot);

  function celebrate(big) {
    try {
      const low = (g.orbitLow && g.orbitLow()) || (g.matchMedia && g.matchMedia('(prefers-reduced-motion: reduce)').matches);
      const o = h('div', 'abc-cf', null, { 'aria-hidden': 'true' });
      if (!low) {
        const C = ['#e53935', '#1e88e5', '#43a047', '#fb8c00', '#8e24aa', '#fdd835'], cnt = big ? 70 : 40;
        for (let k = 0; k < cnt; k++) { const i = h('i'); i.style.left = (Math.random() * 100) + '%'; i.style.background = C[k % C.length]; i.style.borderRadius = k % 2 ? '50%' : '2px'; i.style.animationDuration = (1.4 + Math.random() * 1.4) + 's'; i.style.animationDelay = (Math.random() * .5) + 's'; o.appendChild(i); }
      }
      o.appendChild(h('b', 'abc-cheer', big ? 'Champion!' : CHEER[Math.floor(Math.random() * CHEER.length)]));
      g.document.body.appendChild(o);
      const cd = ROOT && ROOT.querySelector('.abc-c'); if (cd && !low) cd.classList.add('abc-bounce');
      later(() => { if (o.parentNode) o.parentNode.removeChild(o); }, 3200);
    } catch (e) { /* the celebration is only decoration */ }
  }
  function wrong(b) { b.classList.add('abc-no'); later(() => b.classList.remove('abc-no'), 450); const m = ROOT.querySelector('.abc-msg'); if (m) m.textContent = L('again'); say('Try again'); }

  // ---- screens ----
  function menu() {
    S.r = menu; kind = '';
    const card = (title, desc, fn, bests) => { const b = btn('abc-card'); b.appendChild(h('b', null, title)); b.appendChild(h('span', 'mut', desc)); const t = bests.filter(x => x[1] > 0).map(x => x[0] + ' ' + x[1]).join('  |  '); if (t) b.appendChild(h('span', 'mut', L('best') + ': ' + t, { style: 'display:block;margin-top:6px' })); b.addEventListener('click', fn); return b; };
    const m = h('div', 'abc-menu');
    m.appendChild(card(L('gLearn'), L('dLearn'), () => learn(true), [[L('tQuiz'), bestGet('quiz')]]));
    m.appendChild(card(L('gPuz'), L('dPuz'), () => newGaps(), [[L('tGaps'), bestGet('gaps')], [L('tWords'), bestGet('words')]]));
    show([m]);
  }
  function head(tabs, cur) {
    const bar = h('div', 'abc-bar'); bar.appendChild(btn('abc-link', L('back'), () => { stopAll(); menu(); }));
    const ch = h('div', 'chips');
    tabs.forEach(t => { const c = btn('chip', t[1], t[2], { 'aria-pressed': String(t[0] === cur) }); ch.appendChild(c); });
    return [bar, ch];
  }
  function stopAll() { sid++; try { if (g.speechSynthesis) g.speechSynthesis.cancel(); } catch (e) { /* ignore */ } }
  const learnTabs = () => [['learn', L('tLearn'), () => learn(true)], ['quiz', L('tQuiz'), () => newQuiz()]];
  const puzTabs = () => [['gaps', L('tGaps'), () => newGaps()], ['words', L('tWords'), () => newWord()]];

  // Learn
  let li = 0;
  function learn(auto) {
    S.r = () => learn(false); kind = 'learn'; lock = false;
    const d = D[li], sp = () => say(d[0] + ' for ' + d[1]);
    const c = h('div', 'abc-c');
    c.appendChild(h('div', 'abc-big', d[0] + ' ' + d[0].toLowerCase()));
    c.appendChild(picBtn('abc-pic', d, sp));
    c.appendChild(h('div', 'abc-word', d[0] + ' for ' + d[1]));
    c.appendChild(btn('btn', L('listen'), sp));
    const strip = h('div', 'abc-strip'); D.forEach((x, k) => strip.appendChild(btn('chip', x[0], () => { li = k; learn(true); }, { 'aria-pressed': String(k === li) })));
    const nav = h('div', 'abc-nav'); nav.appendChild(btn('btn', L('prev'), () => { li = (li + 25) % 26; learn(true); })); nav.appendChild(btn('btn', L('next'), () => { li = (li + 1) % 26; learn(true); }));
    show(head(learnTabs(), 'learn').concat([c, nav, strip]));
    if (auto) sp();
  }
  // Quiz
  function newQuiz() { score = 0; n = 0; nextQuiz(); }
  function nextQuiz() {
    if (n >= TOTAL) return end('quiz', TOTAL, newQuiz);
    P = makeQuiz(); lock = false; drawQuiz(true);
  }
  function drawQuiz(speak) {
    S.r = () => drawQuiz(false); kind = 'quiz';
    const q = P.q, sp = () => say(q[1]);
    const c = h('div', 'abc-c'); c.appendChild(scoreLine(TOTAL));
    c.appendChild(picBtn('abc-pic', q, sp));
    c.appendChild(h('div', 'abc-word', q[1])); c.appendChild(h('div', 'abc-q', L('which')));
    c.appendChild(btn('btn', L('listen'), sp));
    const grid = h('div', 'abc-grid');
    P.opts.forEach(o => { const b = btn('abc-opt', o, () => {
      if (lock) return;
      if (o === q[0]) { lock = true; b.classList.add('abc-ok'); score++; n++; celebrate(false); say(q[0] + ' for ' + q[1], nextQuiz); }
      else wrong(b);
    }); grid.appendChild(b); });
    c.appendChild(grid); c.appendChild(h('div', 'abc-msg', null, { 'aria-live': 'polite' }));
    show(head(learnTabs(), 'quiz').concat([c]));
    if (speak) sp();
  }
  // Fill the gaps
  function newGaps() { score = 0; n = 0; nextGaps(); }
  function nextGaps() { if (n >= TOTAL_PUZ) return end('gaps', TOTAL_PUZ, newGaps); P = makeGaps(); lock = false; drawGaps(true); }
  function drawGaps(speak) {
    S.r = () => drawGaps(false); kind = 'gaps';
    const c = h('div', 'abc-c'); c.appendChild(scoreLine(TOTAL_PUZ)); c.appendChild(h('div', 'abc-q', L('missing')));
    const row = h('div', 'abc-row');
    P.seg.forEach((l, k) => {
      if (!P.miss.includes(k)) row.appendChild(h('div', 'abc-slot', l));
      else if (P.fill[k]) row.appendChild(h('div', 'abc-slot ok', l));
      else row.appendChild(btn('abc-slot gap' + (P.sel === k ? ' sel' : ''), '?', () => { P.sel = k; drawGaps(false); }, { 'aria-label': 'Empty place ' + (k + 1) }));
    });
    c.appendChild(row);
    const tiles = h('div', 'abc-row');
    P.tiles.forEach((l, k) => { const b = btn('abc-tile' + (P.used[k] ? ' used' : ''), l, () => {
      if (lock) return;
      if (l === P.seg[P.sel]) {
        P.fill[P.sel] = true; P.used[k] = true;
        const left = P.miss.filter(m => !P.fill[m]);
        if (!left.length) { lock = true; score++; n++; drawGaps(false); celebrate(false); say(P.seg.join(', '), nextGaps); }
        else { P.sel = left[0]; drawGaps(false); say(l); }
      } else wrong(b);
    }); tiles.appendChild(b); });
    c.appendChild(tiles); c.appendChild(h('div', 'abc-msg', null, { 'aria-live': 'polite' }));
    show(head(puzTabs(), 'gaps').concat([c]));
    if (speak) say('Fill the missing letters');
  }
  // Make the word
  function newWord() { score = 0; n = 0; nextWord(); }
  function nextWord() { if (n >= TOTAL_PUZ) return end('words', TOTAL_PUZ, newWord); P = makeWord(); lock = false; drawWord(true); }
  function drawWord(speak) {
    S.r = () => drawWord(false); kind = 'words';
    const c = h('div', 'abc-c'); c.appendChild(scoreLine(TOTAL_PUZ));
    c.appendChild(btn('abc-pic', P.e, () => say(P.w.toLowerCase()), { 'aria-label': P.w.toLowerCase() }));
    c.appendChild(h('div', 'abc-q', L('order')));
    const row = h('div', 'abc-row');
    for (let k = 0; k < P.w.length; k++) row.appendChild(h('div', 'abc-slot' + (k < P.pos ? ' ok' : (k === P.pos ? ' sel' : '')), k < P.pos ? P.w[k] : ''));
    c.appendChild(row);
    const tiles = h('div', 'abc-row');
    P.tiles.forEach((l, k) => { const b = btn('abc-tile' + (P.used[k] ? ' used' : ''), l, () => {
      if (lock) return;
      if (l === P.w[P.pos]) {
        P.used[k] = true; P.pos++;
        if (P.pos >= P.w.length) { lock = true; score++; n++; drawWord(false); celebrate(false); say(P.w.split('').join(', ') + '. ' + P.w.toLowerCase() + '!', nextWord); }
        else { drawWord(false); say(l); }
      } else wrong(b);
    }); tiles.appendChild(b); });
    c.appendChild(tiles); c.appendChild(h('div', 'abc-msg', null, { 'aria-live': 'polite' }));
    show(head(puzTabs(), 'words').concat([c]));
    if (speak) say('Make the word');
  }
  // End of a round
  function end(k, tot, again) {
    S.r = null; bestSet(k, score);
    const c = h('div', 'abc-c'); c.appendChild(h('div', 'abc-big', score + '/' + tot, { style: 'font-size:64px' }));
    c.appendChild(h('div', 'abc-word', L('done')));
    c.appendChild(btn('btn', L('replay'), again));
    const tabs = (k === 'quiz') ? learnTabs() : puzTabs();
    show(head(tabs, k).concat([c]));
    S.r = () => end(k, tot, again);
    celebrate(true); say('Well done! You got ' + score + ' out of ' + tot);
  }

  g.ABC = {
    viewHTML() { return '<h1 style="font-size:26px;margin-top:14px">' + L('title') + '</h1><p class="mut">' + L('intro') + '</p><div id="abc-root"></div>'; },
    mount(root) { const el = root && root.querySelector('#abc-root'); if (!el) return; ROOT = el; css(); (S.r || menu)(); },
    leave() { stopAll(); timers.splice(0).forEach(clearTimeout); clearTimeout(stT); S = { r: null }; ROOT = null; P = null; try { g.document.querySelectorAll('.abc-cf').forEach(x => x.parentNode && x.parentNode.removeChild(x)); } catch (e) { /* ignore */ } },
    _makeQuiz: makeQuiz, _makeGaps: makeGaps, _makeWord: makeWord, _data: { AL, D, WORDS }
  };
})(typeof window !== 'undefined' ? window : globalThis);
