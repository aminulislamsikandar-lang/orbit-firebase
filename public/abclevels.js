// Orbit ABC Levels: the ABC letters learnt level by level (easy to hard). A child plays a level of 10 questions, gets a score and stars,
// and the next level opens only after the pass mark of the level before it.
// It lives inside the Bolo page as the "ABC Levels" topic: bolo.js calls ABCLV.viewHTML() to draw it, ABCLV.mount(root) after the page is drawn, ABCLV.leave() when the child goes elsewhere.
// Needs no network and no library. The voice is the same phone voice as ABC Games (best natural female English voice of the phone) and every phrase is waited for until it has finished, so nothing is cut off.
// The level rules are small pure functions (random source can be injected) so tests can check every question has exactly one right answer.
(function (g) {
  'use strict';
  const N = (hing, en) => ({ hing, en });
  const TX = {
    title: N('ABC Levels', 'ABC Levels'),
    intro: N('Level pass karo, agla level khulega.', 'Pass a level to open the next one.'),
    pass: N('Pass', 'Pass'), best: N('Sabse achha', 'Best'), back: N('Levels par wapas', 'Back to levels'),
    locked: N('Pichhla level pass karo', 'Pass the level before'),
    again: N('Phir koshish karo', 'Try again'), great: N('Shabaash!', 'Well done!'),
    next: N('Agla level', 'Next level'), replay: N('Dobara khelo', 'Play again'), retry: N('Phir se khelo', 'Try again'), levels: N('Levels', 'Levels'),
    opened: N('Shabaash! Agla level khul gaya.', 'Well done! The next level is open.'), allDone: N('Shabaash! ABC ke saare level poore.', 'Well done! All ABC levels are finished.'),
    needs: N('Pass hone ke liye', 'To pass you need'), needs2: N('chahiye. Ek baar aur khelo.', '. Play once more.'),
    q: N('Sawaal', 'Question'), level: N('Level', 'Level'),
    askPic: N('ye kis letter se shuru hota hai?', 'which letter does it start with?'),
    askCase: N('Iska chhota letter kaun sa hai?', 'Which is its small letter?'),
    askGap1: N('Kaun sa letter gayab hai?', 'Which letter is missing?'),
    askGap3: N('Teeno khali jagah bharo', 'Fill all three gaps'),
    askWord: N('Letters ko sahi order mein dabao', 'Tap the letters in order'),
    lv: [N('Pehchano A\u2013J', 'Know A\u2013J'), N('Pehchano A\u2013Z', 'Know A\u2013Z'), N('Bada aur chhota', 'Big and small'), N('Ek khali jagah', 'One gap'), N('Teen khali jagah', 'Three gaps'), N('Shabd banao', 'Make the word')],
    ld: [N('Picture dekho, pehla letter chuno', 'See the picture, pick the first letter'), N('Saare 26 letters', 'All 26 letters'), N('A ke saath a jodo', 'Match A with a'),
      N('Gayab letter dhundo', 'Find the missing letter'), N('Teen letters bharo', 'Fill three letters'), N('Letters ko order mein lagao', 'Put the letters in order')]
  };
  const lang = () => (g.orbitLang && g.orbitLang()) || 'hing';
  const L = k => TX[k][lang()] || TX[k].hing;
  const LN = (arr, i) => TX[arr][i][lang()] || TX[arr][i].hing;

  const AL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  // letter, word, picture (the same pictures as ABC Games)
  const D = [['A', 'Apple', '\uD83C\uDF4E'], ['B', 'Ball', '\u26BD'], ['C', 'Cat', '\uD83D\uDC31'], ['D', 'Dog', '\uD83D\uDC36'], ['E', 'Elephant', '\uD83D\uDC18'], ['F', 'Fish', '\uD83D\uDC1F'], ['G', 'Grapes', '\uD83C\uDF47'], ['H', 'Hat', '\uD83C\uDFA9'], ['I', 'Ice cream', '\uD83C\uDF66'], ['J', 'Juice', '\uD83E\uDDC3'], ['K', 'Kite', '\uD83E\uDE81'], ['L', 'Lion', '\uD83E\uDD81'], ['M', 'Moon', '\uD83C\uDF19'], ['N', 'Nest', '\uD83E\uDEBA'], ['O', 'Orange', '\uD83C\uDF4A'], ['P', 'Parrot', '\uD83E\uDD9C'], ['Q', 'Queen', '\uD83D\uDC78'], ['R', 'Rainbow', '\uD83C\uDF08'], ['S', 'Sun', '\u2600\uFE0F'], ['T', 'Tiger', '\uD83D\uDC2F'], ['U', 'Umbrella', '\u2602\uFE0F'], ['V', 'Van', '\uD83D\uDE90'], ['W', 'Watch', '\u231A'], ['X', 'Xylophone', '\uD83C\uDFB9'], ['Y', 'Yo-yo', '\uD83E\uDE80'], ['Z', 'Zebra', '\uD83E\uDD93']];
  const WORDS = [['CAT', '\uD83D\uDC31'], ['DOG', '\uD83D\uDC36'], ['SUN', '\u2600\uFE0F'], ['PIG', '\uD83D\uDC37'], ['HEN', '\uD83D\uDC14'], ['BEE', '\uD83D\uDC1D'], ['COW', '\uD83D\uDC2E'], ['BUS', '\uD83D\uDE8C'], ['CAR', '\uD83D\uDE97'], ['EGG', '\uD83E\uDD5A'], ['KEY', '\uD83D\uDD11'], ['BED', '\uD83D\uDECF\uFE0F'], ['BAT', '\uD83E\uDD87'], ['OWL', '\uD83E\uDD89'], ['FOX', '\uD83E\uDD8A']];
  // the levels: kind of question, how many letters are used, pass mark in percent (easy levels are forgiving, later ones stricter)
  const LV = [{ k: 'pic', pool: 10, pass: 60 }, { k: 'pic', pool: 26, pass: 60 }, { k: 'case', pass: 70 }, { k: 'gap1', pass: 70 }, { k: 'gap3', pass: 80 }, { k: 'word', pass: 80 }];
  const TOTAL = 10, BESTKEY = 'orbit_abclv_best';

  // ---- pure rules ----
  const stars = p => (p >= 100 ? 3 : p >= 80 ? 2 : p >= 60 ? 1 : 0);
  const isOpen = (best, i) => i === 0 || (best[i - 1] || 0) >= LV[i - 1].pass;   // level 1 is always open; the others need the pass mark of the level before
  const mkR = rnd => { const r = rnd || Math.random; return { int: (a, b) => a + Math.floor(r() * (b - a + 1)), pick: arr => arr[Math.floor(r() * arr.length)], shuffle: arr => { const x = arr.slice(); for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; } return x; } }; };
  // One question of a level. Every question has exactly one right answer (or one right order).
  function makeQ(level, rnd) {
    const R = mkR(rnd), d = LV[level];
    if (d.k === 'pic') { const q = R.pick(D.slice(0, d.pool)); return { k: 'pic', q, opts: R.shuffle([q[0]].concat(R.shuffle(AL.filter(l => l !== q[0])).slice(0, 3))), slip: false, msg: '' }; }
    if (d.k === 'case') { const l = R.pick(AL); return { k: 'case', l, opts: R.shuffle([l.toLowerCase()].concat(R.shuffle(AL.filter(x => x !== l)).slice(0, 3).map(x => x.toLowerCase()))), slip: false, msg: '' }; }
    if (d.k === 'gap1') {
      const len = 5, st = R.int(0, 26 - len), seg = AL.slice(st, st + len), m = R.int(0, len - 1);
      return { k: 'gap1', seg, m, opts: R.shuffle([seg[m]].concat(R.shuffle(AL.filter(l => !seg.includes(l))).slice(0, 3))), slip: false, msg: '' };
    }
    if (d.k === 'gap3') {
      const len = 7, st = R.int(0, 26 - len), seg = AL.slice(st, st + len), miss = R.shuffle([0, 1, 2, 3, 4, 5, 6]).slice(0, 3).sort((a, b) => a - b);
      const tiles = miss.map(k => seg[k]); tiles.push(R.pick(AL.filter(l => !seg.includes(l))));
      return { k: 'gap3', seg, miss, tiles: R.shuffle(tiles), fill: {}, used: {}, sel: miss[0], slip: false, msg: '' };
    }
    const w = R.pick(WORDS);
    return { k: 'word', w: w[0], e: w[1], pos: 0, tiles: R.shuffle(w[0].split('')), used: {}, slip: false, msg: '' };
  }

  // ---- speech: same phone voice as ABC Games, each phrase once, the callback runs only after the voice has finished (so nothing is cut off) ----
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
  try { if (g.speechSynthesis) g.speechSynthesis.addEventListener ? g.speechSynthesis.addEventListener('voiceschanged', pickVoice) : (g.speechSynthesis.onvoiceschanged = pickVoice); } catch (e) { /* ignore */ }

  // ---- tiny DOM helpers (no innerHTML anywhere) ----
  const timers = [];
  function later(fn, ms) { const t = setTimeout(() => { const i = timers.indexOf(t); if (i >= 0) timers.splice(i, 1); fn(); }, ms); timers.push(t); return t; }
  const h = (tag, cls, txt, attrs) => { const e = g.document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };
  const btn = (cls, txt, fn, attrs) => { const b = h('button', cls, txt, attrs); b.type = 'button'; b.addEventListener('click', fn); return b; };
  const clear = el => { while (el.firstChild) el.removeChild(el.firstChild); };

  const CSS = '.lv-top{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:8px 0}'
    + '.lv-link{border:0;background:transparent;color:var(--mut);padding:6px 6px 6px 0}'
    + '.lv-pill{border:1px solid var(--ln);background:var(--card);border-radius:18px;padding:3px 12px;font-weight:700}'
    + '.lv-trail{position:relative;margin:16px 0 4px}'
    + '.lv-trail:before{content:"";position:absolute;left:50%;top:30px;bottom:30px;width:6px;margin-left:-3px;border-radius:6px;background:repeating-linear-gradient(var(--ln) 0 12px,transparent 12px 22px)}'
    + '.lv-row{position:relative;margin:0 0 20px;width:80%}.lv-row.r{margin-left:20%}'
    + '.lv-hit{display:flex;align-items:center;gap:12px;width:100%;text-align:left;border:0;background:transparent;padding:0;color:inherit;font:inherit}'
    + '.lv-row.r .lv-hit{flex-direction:row-reverse;text-align:right}'
    + '.lv-node{flex:none;width:68px;height:68px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:30px;font-weight:800;color:#fff;background:#16a34a;box-shadow:0 4px 0 #0f7a36;position:relative;z-index:1}'
    + '.lv-row.lock .lv-node{background:#9aa9b8;box-shadow:0 4px 0 #77879a;font-size:24px}.lv-row.done .lv-node{background:#f5b301;box-shadow:0 4px 0 #c58d00}'
    + '.lv-row.now .lv-node{animation:lvbob 1.6s ease-in-out infinite}'
    + '.lv-nm{display:block;font-weight:700;font-size:17px;line-height:1.2}.lv-sm{display:block;color:var(--mut);font-size:14px}'
    + '.lv-st{color:#f5b301;letter-spacing:2px}.lv-st i{font-style:normal;color:var(--ln)}'
    + '.lv-c{background:var(--card);border-radius:22px;padding:18px;margin:12px 0;text-align:center;box-shadow:0 1px 0 var(--ln)}'
    + '.lv-bar{height:10px;border-radius:8px;background:var(--ln);overflow:hidden;margin:8px 0}.lv-bar i{display:block;height:100%;background:#16a34a}'
    + '.lv-pic{font-size:88px;line-height:1.15;border:0;background:transparent;cursor:pointer;padding:0}'
    + '.lv-big{font-size:84px;line-height:1.05;font-weight:700}.lv-ask{font-size:19px;margin:6px 0 10px}.lv-msg{min-height:28px;margin-top:8px;font-weight:600}'
    + '.lv-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:10px}'
    + '.lv-opt{font-size:38px;font-weight:700;padding:14px;border:1px solid var(--ln);background:var(--card);border-radius:16px}.lv-opt.ok{background:#2e7d32;color:#fff;border-color:#2e7d32}'
    + '.lv-rowt{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin:12px 0}'
    + '.lv-slot{width:46px;height:56px;border:2px solid var(--ln);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:700;background:var(--bg)}'
    + '.lv-slot.gap{border-style:dashed;border-color:#16a34a}.lv-slot.ok{background:#2e7d32;border-color:#2e7d32;color:#fff}'
    + '.lv-tile{width:60px;height:60px;font-size:28px;font-weight:700;border:1px solid var(--ln);background:var(--card);border-radius:14px}.lv-tile.used{visibility:hidden}'
    + '.lv-no{animation:lvsh .4s;background:#c62828!important;color:#fff!important}'
    + '.lv-res .lv-big{font-size:60px}.lv-res .lv-stars{font-size:48px;letter-spacing:6px;margin:6px 0;color:#f5b301}.lv-res .lv-stars span{display:inline-block;animation:lvpop .5s both}'
    + '.lv-acts{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:12px}'
    + '@keyframes lvbob{50%{transform:translateY(-5px)}}@keyframes lvsh{25%{transform:translateX(-8px)}75%{transform:translateX(8px)}}@keyframes lvpop{0%{transform:scale(0)}70%{transform:scale(1.25)}100%{transform:scale(1)}}'
    + '@media(prefers-reduced-motion:reduce){.lv-row.now .lv-node,.lv-no,.lv-res .lv-stars span{animation:none}}';
  function css() { if (g.document.getElementById('abclv-css')) return; const s = h('style', null, CSS); s.id = 'abclv-css'; g.document.head.appendChild(s); }

  // ---- state (the screen is always drawn from this, so a redraw of the page keeps the child exactly where they were) ----
  let ROOT = null, S = { r: null }, cur = null, Q = null, RES = null, lock = false;
  let best = null;
  const loadBest = () => { if (best) return best; best = LV.map(() => 0); try { const a = JSON.parse(g.localStorage.getItem(BESTKEY) || 'null'); if (Array.isArray(a)) LV.forEach((_, i) => { best[i] = Math.max(0, Math.min(100, +a[i] || 0)); }); } catch (e) { /* blocked storage */ } return best; };
  const saveBest = () => { try { g.localStorage.setItem(BESTKEY, JSON.stringify(best)); } catch (e) { /* storage full or blocked */ } };
  const show = nodes => { clear(ROOT); nodes.forEach(x => ROOT.appendChild(x)); };
  const starRow = n => { const e = h('span', 'lv-st'); for (let i = 0; i < 3; i++) e.appendChild(h(i < n ? 'span' : 'i', null, '\u2605')); return e; };

  // ---- level map ----
  function map() {
    S.r = map; cur = null; Q = null; stopAll();
    const b = loadBest(), trail = h('div', 'lv-trail');
    let now = -1; for (let i = 0; i < LV.length; i++) if (isOpen(b, i) && b[i] < LV[i].pass) { now = i; break; }
    LV.forEach((d, i) => {
      const op = isOpen(b, i), done = b[i] >= d.pass;
      const row = h('div', 'lv-row' + (i % 2 ? ' r' : '') + (op ? '' : ' lock') + (done ? ' done' : '') + (i === now ? ' now' : ''));
      const hit = op ? btn('lv-hit', null, () => play(i), { 'aria-label': L('level') + ' ' + (i + 1) + ' ' + LN('lv', i) }) : h('div', 'lv-hit', null, { 'aria-label': L('level') + ' ' + (i + 1) + ' (' + L('locked') + ')' });
      hit.appendChild(h('span', 'lv-node', op ? String(i + 1) : '\uD83D\uDD12'));
      const tx = h('span'); tx.appendChild(h('span', 'lv-nm', LN('lv', i)));
      if (!op) tx.appendChild(h('span', 'lv-sm', L('locked') + ' (' + LV[i - 1].pass + '%)'));
      else {
        tx.appendChild(h('span', 'lv-sm', LN('ld', i)));
        const sm = h('span', 'lv-sm'); if (b[i] > 0) { sm.appendChild(starRow(stars(b[i]))); sm.appendChild(g.document.createTextNode('  ' + L('best') + ' ' + b[i] + '%')); } else sm.textContent = L('pass') + ': ' + d.pass + '%';
        tx.appendChild(sm);
      }
      hit.appendChild(tx); row.appendChild(hit); trail.appendChild(row);
    });
    const tot = b.reduce((a, p) => a + stars(p), 0), top = h('div', 'lv-top');
    top.appendChild(h('span', 'mut', L('intro'))); top.appendChild(h('span', 'lv-pill', '\u2605 ' + tot + ' / ' + LV.length * 3));
    show([top, trail]);
  }
  function stopAll() { sid++; try { if (g.speechSynthesis) g.speechSynthesis.cancel(); } catch (e) { /* ignore */ } }

  // ---- playing a level ----
  function play(i) { cur = { i, q: 0, score: 0 }; nextQ(); }
  function nextQ() {
    if (!cur) return;
    if (cur.q >= TOTAL) return result();
    Q = makeQ(cur.i); lock = false; drawQ(true);
  }
  function wrong(b) { Q.slip = true; Q.msg = L('again'); if (b) { b.classList.add('lv-no'); later(() => b.classList.remove('lv-no'), 450); } const m = ROOT && ROOT.querySelector('.lv-msg'); if (m) m.textContent = Q.msg; say('Try again'); }
  function right(phrase) {   // the correct answer is spoken in full, then the next question comes
    lock = true; cur.q++; if (!Q.slip) cur.score++; Q.msg = L('great');
    const m = ROOT && ROOT.querySelector('.lv-msg'); if (m) m.textContent = Q.msg;
    say(phrase, nextQ);
  }
  function opts(c, list, good, phrase) {
    const gr = h('div', 'lv-grid');
    list.forEach(o => { gr.appendChild(btn('lv-opt', o, function () { if (lock) return; if (o === good) { this.classList.add('ok'); right(phrase); } else wrong(this); })); });
    c.appendChild(gr);
  }
  function drawQ(speakNow) {
    S.r = () => drawQ(false);
    const q = Q, c = h('div', 'lv-c'), top = h('div', 'lv-top');
    top.appendChild(btn('lv-link', '\u2190 ' + L('back'), () => map()));
    top.appendChild(h('span', 'lv-pill', L('level') + ' ' + (cur.i + 1) + '  \u00B7  ' + Math.min(cur.q + 1, TOTAL) + ' / ' + TOTAL));
    const bar = h('div', 'lv-bar'), fill = h('i'); fill.style.width = (cur.q / TOTAL * 100) + '%'; bar.appendChild(fill);
    let intro = '';
    if (q.k === 'pic') {
      const sp = () => say(q.q[1]);
      c.appendChild(btn('lv-pic', q.q[2], sp, { 'aria-label': q.q[1] })); c.appendChild(h('div', 'lv-ask', q.q[1] + ' \u2014 ' + L('askPic')));
      opts(c, q.opts, q.q[0], q.q[0] + ' for ' + q.q[1]); intro = q.q[1];
    } else if (q.k === 'case') {
      c.appendChild(h('div', 'lv-big', q.l)); c.appendChild(h('div', 'lv-ask', L('askCase')));
      opts(c, q.opts, q.l.toLowerCase(), q.l + '. ' + q.l.toLowerCase()); intro = q.l;
    } else if (q.k === 'gap1') {
      const row = h('div', 'lv-rowt'); q.seg.forEach((l, k) => row.appendChild(h('div', 'lv-slot' + (k === q.m ? ' gap' : ''), k === q.m ? '?' : l)));
      c.appendChild(h('div', 'lv-ask', L('askGap1'))); c.appendChild(row);
      opts(c, q.opts, q.seg[q.m], q.seg.join(', ')); intro = 'Which letter is missing?';
    } else if (q.k === 'gap3') {
      c.appendChild(h('div', 'lv-ask', L('askGap3')));
      const row = h('div', 'lv-rowt');
      q.seg.forEach((l, k) => { if (!q.miss.includes(k)) row.appendChild(h('div', 'lv-slot', l)); else if (q.fill[k]) row.appendChild(h('div', 'lv-slot ok', l)); else row.appendChild(h('div', 'lv-slot gap', k === q.sel ? '?' : '')); });
      c.appendChild(row);
      const tr = h('div', 'lv-rowt');
      q.tiles.forEach((l, k) => tr.appendChild(btn('lv-tile' + (q.used[k] ? ' used' : ''), l, function () {
        if (lock) return;
        if (l === q.seg[q.sel]) {
          q.fill[q.sel] = true; q.used[k] = true; const left = q.miss.filter(m => !q.fill[m]);
          if (!left.length) { drawQ(false); right(q.seg.join(', ')); } else { q.sel = left[0]; drawQ(false); say(l); }
        } else wrong(this);
      })));
      c.appendChild(tr); intro = 'Fill the missing letters';
    } else {
      const sp = () => say(q.w.toLowerCase());
      c.appendChild(btn('lv-pic', q.e, sp, { 'aria-label': q.w.toLowerCase() })); c.appendChild(h('div', 'lv-ask', L('askWord')));
      const row = h('div', 'lv-rowt'); for (let k = 0; k < q.w.length; k++) row.appendChild(h('div', 'lv-slot' + (k < q.pos ? ' ok' : ' gap'), k < q.pos ? q.w[k] : ''));
      c.appendChild(row);
      const tr = h('div', 'lv-rowt');
      q.tiles.forEach((l, k) => tr.appendChild(btn('lv-tile' + (q.used[k] ? ' used' : ''), l, function () {
        if (lock) return;
        if (l === q.w[q.pos]) {
          q.used[k] = true; q.pos++;
          if (q.pos >= q.w.length) { drawQ(false); right(q.w.split('').join(', ') + '. ' + q.w.toLowerCase() + '!'); } else { drawQ(false); say(l); }
        } else wrong(this);
      })));
      c.appendChild(tr); intro = 'Make the word';
    }
    c.appendChild(h('div', 'lv-msg', q.msg || '', { 'aria-live': 'polite' }));
    show([top, bar, c]);
    if (speakNow) say(intro);
  }

  // ---- end of a level ----
  function result() {
    const d = LV[cur.i], pct = Math.round(cur.score / TOTAL * 100), pass = pct >= d.pass, b = loadBest();
    if (pct > b[cur.i]) { b[cur.i] = pct; saveBest(); }
    RES = { i: cur.i, score: cur.score, pct, pass }; Q = null; drawRes(true);
  }
  function drawRes(speakNow) {
    S.r = () => drawRes(false);
    const r = RES, d = LV[r.i], c = h('div', 'lv-c lv-res'), top = h('div', 'lv-top');
    top.appendChild(btn('lv-link', '\u2190 ' + L('back'), () => map()));
    c.appendChild(h('div', 'mut', L('level') + ' ' + (r.i + 1) + ' \u00B7 ' + LN('lv', r.i)));
    c.appendChild(h('div', 'lv-big', r.score + ' / ' + TOTAL));
    const s = h('div', 'lv-stars'), n = stars(r.pct); for (let k = 0; k < 3; k++) s.appendChild(h('span', null, k < n ? '\u2605' : '\u2606', { style: 'animation-delay:' + (k * .2) + 's' + (k < n ? '' : ';color:var(--ln)') }));
    c.appendChild(s);
    const last = r.i >= LV.length - 1;
    c.appendChild(h('div', 'lv-ask', r.pass ? (last ? L('allDone') : L('opened')) : L('needs') + ' ' + d.pass + '% ' + L('needs2')));
    const a = h('div', 'lv-acts');
    if (r.pass && !last) a.appendChild(btn('btn', L('next'), () => play(r.i + 1)));
    a.appendChild(btn('btn', r.pass ? L('replay') : L('retry'), () => play(r.i)));
    a.appendChild(btn('btn', L('levels'), () => map()));
    c.appendChild(a); show([top, c]);
    if (speakNow) say(r.pass ? 'Well done! You got ' + r.score + ' out of ' + TOTAL : 'Good try! You got ' + r.score + ' out of ' + TOTAL + '. Try again');
  }

  g.ABCLV = {
    viewHTML() { return '<h2 class="sec">' + L('title') + '</h2><div id="abclv-root"></div>'; },
    mount(root) { const el = root && root.querySelector('#abclv-root'); if (!el) return; ROOT = el; css(); (S.r || map)(); },
    leave() { stopAll(); timers.splice(0).forEach(clearTimeout); clearTimeout(stT); S = { r: null }; ROOT = null; cur = null; Q = null; RES = null; lock = false; },
    _makeQ: makeQ, _isOpen: isOpen, _stars: stars, _data: { AL, D, WORDS, LV, TOTAL }, _resetBest() { best = null; }
  };
})(typeof window !== 'undefined' ? window : globalThis);
