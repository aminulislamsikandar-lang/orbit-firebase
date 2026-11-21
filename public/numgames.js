// Orbit 123 Games: number games for young children, built like ABC Games (a menu of games inside the Bolo page, topic "123 Games").
//   Number Match, Before and After, Even or Odd, Table Time, Right Sign   - a round of 8 questions, a picture or number and 2 to 4 answers
//   Balloon Pop, Memory Match, Tap in Order, Fast Math                      - small action games with a score
// bolo.js calls NUMG.viewHTML() to draw the page, NUMG.mount(root) after drawing and NUMG.leave() when the child goes elsewhere.
// Rules, voice (the same phone voice as ABC) and style are in numcore.js. The voice is never cut: a phrase is waited for before the next step; the action games speak only at the start and at the end.
(function (g) {
  'use strict';
  const C = g.NUM; if (!C) return;
  const { N, L, h, btn, clear, say, later, stopAll, mkR } = C;
  const R = mkR();
  const TX = {
    bal: N('Balloon Pop', 'Balloon Pop'), balD: N('Sahi number wale gubbare phodo (30 second).', 'Pop the balloons with the right number (30 seconds).'),
    mem: N('Memory Match', 'Memory Match'), memD: N('Number aur uski gintiyon ki jodi milao.', 'Match every number with its pictures.'),
    tap: N('Tap in Order', 'Tap in Order'), tapD: N('1 se 9 tak jaldi se order mein dabao.', 'Tap 1 to 9 in order, as fast as you can.'),
    fast: N('Fast Math', 'Fast Math'), fastD: N('30 second mein jitne sahi jawab de sako.', 'Answer as many as you can in 30 seconds.'),
    match: N('Number Match', 'Number Match'), matchD: N('Gino aur sahi number chuno.', 'Count and pick the right number.'),
    before: N('Pehle aur Baad', 'Before and After'), beforeD: N('Kaun sa number pehle ya baad mein aata hai?', 'Which number comes just before or after?'),
    eo: N('Jod ya Bejod', 'Even or Odd'), eoD: N('Even aur odd numbers pehchano.', 'Tell even numbers from odd ones.'),
    table: N('Table Time', 'Table Time'), tableD: N('2 se 5 ke tables.', 'Tables of 2 to 5.'),
    sign: N('Sahi Chinh', 'Right Sign'), signD: N('Chhota <, bada > ya barabar =.', 'Less than, greater than or equal.'),
    popIt: N('Is number wale gubbare phodo', 'Pop the balloons with this number'), memAsk: N('Jodi milao', 'Find the pairs'), tapAsk: N('1 se 9 tak order mein dabao', 'Tap 1 to 9 in order'),
    moves: N('Chaal', 'Moves')
  };
  const T = k => TX[k][C.lang()] || TX[k].hing;
  const GAMES = [
    { key: 'match', em: '\uD83D\uDD22', n: 'match', d: 'matchD', t: 'quiz', mk: () => C.makeQ({ k: 'count' }) },
    { key: 'before', em: '\u2194\uFE0F', n: 'before', d: 'beforeD', t: 'quiz', mk: () => C.makeQ({ k: 'before', after: Math.random() < .5 }) },
    { key: 'evenodd', em: '\u2796', n: 'eo', d: 'eoD', t: 'quiz', mk: () => C.makeQ({ k: 'evenodd' }) },
    { key: 'table', em: '\u2716\uFE0F', n: 'table', d: 'tableD', t: 'quiz', mk: () => C.makeQ({ k: 'table' }) },
    { key: 'sign', em: '\u2696\uFE0F', n: 'sign', d: 'signD', t: 'quiz', mk: () => C.makeQ({ k: 'sign' }) },
    { key: 'balloon', em: '\uD83C\uDF88', n: 'bal', d: 'balD', t: 'balloon' },
    { key: 'memory', em: '\uD83C\uDCCF', n: 'mem', d: 'memD', t: 'memory' },
    { key: 'tap', em: '\uD83D\uDC46', n: 'tap', d: 'tapD', t: 'tap' },
    { key: 'fast', em: '\u26A1', n: 'fast', d: 'fastD', t: 'fast', mk: () => C.makeQ({ k: R.pick(['add', 'sub', 'big', 'gap1']) }) }
  ];
  const TOTAL = 8, TIME = 30, BEST = 'orbit_num_best_';
  const bestGet = k => { try { return +g.localStorage.getItem(BEST + k) || 0; } catch (e) { return 0; } };
  const bestSet = (k, v) => { try { if (v > bestGet(k)) g.localStorage.setItem(BEST + k, String(v)); } catch (e) { /* storage full or blocked */ } };

  let ROOT = null, S = { r: null }, G = null, lock = false;
  const show = nodes => { clear(ROOT); nodes.forEach(x => ROOT.appendChild(x)); };
  const head = (pillTxt, timeCls) => { const top = h('div', 'nl-top'); top.appendChild(btn('nl-link', '\u2190 ' + L('gback'), () => menu())); top.appendChild(h('span', 'nl-pill' + (timeCls ? ' ' + timeCls : ''), pillTxt)); return top; };
  const timeTxt = () => '\u2605 ' + G.score + '  \u00B7  ' + L('time') + ' ' + G.time;
  const scoreTxt = () => L('score') + ' ' + G.score + (G.game.t === 'quiz' ? ' / ' + TOTAL : '');

  function menu() {
    S.r = menu; G = null; stopAll(); C.clearAll();
    const m = h('div', 'nl-menu');
    GAMES.forEach(x => {
      const b = bestGet(x.key), c = btn('nl-card', null, () => start(x));
      c.appendChild(h('span', 'em', x.em)); const t = h('span'); t.appendChild(h('b', null, T(x.n))); t.appendChild(h('span', 'mut', T(x.d))); c.appendChild(t);
      if (b) c.appendChild(h('span', 'hs', '\u2605 ' + b)); m.appendChild(c);
    });
    show([m]);
  }
  function start(x) {
    C.clearAll(); G = { game: x, score: 0, n: 0, over: false, time: TIME };
    if (x.t === 'quiz' || x.t === 'fast') return nextQ();
    if (x.t === 'balloon') { say('Pop the balloons with the right number'); tick(); return balloonRound(); }
    if (x.t === 'memory') return memoryStart();
    return tapStart();
  }
  function tick() {   // one second of a timed game
    later(() => { if (!G || G.over || G.game.t === 'memory' || G.game.t === 'tap') return; G.time--; setPill(); if (G.time <= 0) return end(); tick(); }, 1000);
  }

  // ---- quiz rounds (Number Match, Before and After, Even or Odd, Table Time, Right Sign) and Fast Math ----
  function nextQ() {
    if (G.game.t === 'quiz' && G.n >= TOTAL) return end();
    G.q = G.game.mk(); lock = false; drawQ(true);
    if (G.game.t === 'fast' && G.n === 0 && !G.started) { G.started = true; tick(); }
  }
  function drawQ(speakNow) {
    S.r = () => drawQ(false);
    const q = G.q, fast = G.game.t === 'fast', c = h('div', 'nl-c');
    if (q.pic) c.appendChild(btn('nl-pic cnt', q.pic, () => say(q.intro), { 'aria-label': q.intro }));
    if (q.big) c.appendChild(h('div', 'nl-big' + (q.big.length > 5 ? ' sm' : ''), q.big));
    if (q.row) { const row = h('div', 'nl-rowt'); q.row.forEach(l => row.appendChild(h('div', 'nl-slot' + (l === '?' ? ' gap tg' : ''), l))); c.appendChild(row); }
    c.appendChild(h('div', 'nl-ask', L(q.ask)));
    const gr = h('div', 'nl-grid'), sm = q.opts.some(o => o.length > 5);
    q.opts.forEach(o => gr.appendChild(btn('nl-opt' + (sm ? ' sm' : ''), o, function () {
      if (lock) return; lock = true;
      if (o === q.good) {
        this.classList.add('ok'); if (!q.slip) G.score++; G.n++;
        if (fast) later(nextQ, 350); else { const m = ROOT.querySelector('.nl-msg'); if (m) m.textContent = L('great'); say(q.ok, nextQ); }
      } else {
        q.slip = true; this.classList.add('nl-no'); const m = ROOT.querySelector('.nl-msg'); if (m) m.textContent = L('again');
        if (fast) { G.n++; later(nextQ, 350); } else { say('Try again'); later(() => { this.classList.remove('nl-no'); lock = false; }, 450); }
      }
    })));
    c.appendChild(gr); c.appendChild(h('div', 'nl-msg', null, { 'aria-live': 'polite' }));
    show([head(fast ? timeTxt() : scoreTxt(), fast ? 'nl-time' : ''), c]);
    if (speakNow && !fast) say(q.intro);
  }

  // ---- Balloon Pop ----
  function balloonRound() {
    if (!G || G.over) return;
    S.r = balloonRound;
    const tg = G.tg = R.int(1, 20); G.left = 3;
    const others = R.shuffle(Array.from({ length: 20 }, (_, i) => i + 1).filter(x => x !== tg)).slice(0, 9), nums = R.shuffle([tg, tg, tg].concat(others));
    const c = h('div', 'nl-c'); c.appendChild(h('div', 'nl-ask', T('popIt'))); c.appendChild(h('div', 'nl-big', String(tg)));
    const gr = h('div', 'nl-bgrid');
    nums.forEach((n, k) => gr.appendChild(btn('nl-bal c' + (k % 4), String(n), function () {
      if (G.over || this.classList.contains('gone')) return;
      if (n === G.tg) { G.score++; this.classList.add('gone'); G.left--; setPill(); if (!G.left) later(balloonRound, 250); }
      else { G.score = Math.max(0, G.score - 1); setPill(); this.classList.add('nl-no'); later(() => this.classList.remove('nl-no'), 400); }
    })));
    c.appendChild(gr); show([head(timeTxt(), 'nl-time'), c]);
    say(tg + '. Pop the balloons with number ' + tg);
  }
  const setPill = () => { const e = ROOT && ROOT.querySelector('.nl-time'); if (e && G) e.textContent = timeTxt(); };

  // ---- Memory Match: a number and its pictures ----
  function memoryStart() {
    const ns = R.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, 4), p = R.pick(C.PIC)[0];
    G.cards = R.shuffle(ns.flatMap(n => [{ k: n, t: String(n) }, { k: n, t: p.repeat(n) }])); G.moves = 0; G.found = 0; G.open = []; lock = false;
    say('Match every number with its pictures'); drawMemory();
  }
  function drawMemory() {
    S.r = drawMemory;
    const c = h('div', 'nl-c'); c.appendChild(h('div', 'nl-ask', T('memAsk')));
    const gr = h('div', 'nl-mgrid');
    G.cards.forEach((cd, i) => {
      const shown = G.open.includes(i) || cd.done;
      gr.appendChild(btn('nl-mc' + (shown ? ' open' : '') + (cd.done ? ' done' : '') + (shown && cd.t.length > 2 ? ' sm' : ''), shown ? cd.t : '?', () => flip(i)));
    });
    c.appendChild(gr); show([head(T('moves') + ' ' + G.moves), c]);
  }
  function flip(i) {
    if (lock || G.over || G.cards[i].done || G.open.includes(i)) return;
    G.open.push(i); drawMemory();
    if (G.open.length < 2) return;
    G.moves++; lock = true; const [a, b] = G.open;
    later(() => {
      if (!G || G.over) return;
      if (G.cards[a].k === G.cards[b].k) { G.cards[a].done = G.cards[b].done = true; G.found++; }
      G.open = []; lock = false;
      if (G.found === 4) { G.score = Math.max(1, 20 - (G.moves - 4) * 2); return end(); }
      drawMemory();
    }, 900);
  }

  // ---- Tap in Order: 1 to 9 ----
  function tapStart() { G.next = 1; G.start = Date.now(); G.tiles = R.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]); say('Tap the numbers from one to nine, in order'); drawTap(); }
  function drawTap() {
    S.r = drawTap;
    const c = h('div', 'nl-c'); c.appendChild(h('div', 'nl-ask', T('tapAsk')));
    const gr = h('div', 'nl-tgrid');
    G.tiles.forEach(n => gr.appendChild(btn('nl-tb' + (n < G.next ? ' done' : ''), String(n), function () {
      if (G.over || n < G.next) return;
      if (n === G.next) { G.next++; if (G.next > 9) { G.score = Math.max(1, 60 - Math.floor((Date.now() - G.start) / 1000)); return end(); } drawTap(); }
      else { this.classList.add('nl-no'); later(() => this.classList.remove('nl-no'), 400); }
    })));
    c.appendChild(gr); show([head(L('best') + ' ' + (bestGet('tap') || '-')), c]);
  }

  // ---- end of a round ----
  function drawEnd(x, sc) {
    const c = h('div', 'nl-c nl-res');
    c.appendChild(h('div', 'nl-big', x.t === 'quiz' ? sc + ' / ' + TOTAL : String(sc)));
    c.appendChild(h('div', 'nl-ask', L('done') + '! ' + L('best') + ' ' + bestGet(x.key)));
    const a = h('div', 'nl-acts'); a.appendChild(btn('btn', L('replay'), () => start(x))); a.appendChild(btn('btn', L('gback'), () => menu()));
    c.appendChild(a); show([head(T(x.n)), c]);
  }
  function end() {
    if (!G || G.over) return; G.over = true;
    const x = G.game, sc = G.score; bestSet(x.key, sc);
    S.r = () => drawEnd(x, sc); drawEnd(x, sc);
    say('Well done! Your score is ' + sc);
  }

  g.NUMG = {
    viewHTML() { return '<h2 class="sec">' + L('gTitle') + '</h2><p class="mut">' + L('gIntro') + '</p><div id="numg-root"></div>'; },
    mount(root) { const el = root && root.querySelector('#numg-root'); if (!el) return; ROOT = el; C.css(); (S.r || menu)(); },
    leave() { C.clearAll(); S = { r: null }; ROOT = null; G = null; lock = false; },
    _games: GAMES, _total: TOTAL, _state: () => G
  };
})(typeof window !== 'undefined' ? window : globalThis);
