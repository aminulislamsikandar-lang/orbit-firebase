// Orbit 123 Ginti: a counting game for the Bolo page (topic "123 Ginti"), easy to hard in 10 levels. Fruits are shown, the child taps one green number.
// 5 right answers pass a level and the next level starts by itself; every right answer shows a big green thumbs-up. A wrong number only shakes red, nothing is lost.
// Built like 123 Levels: bolo.js calls NUMCT.viewHTML() to draw the page, NUMCT.mount(root) after drawing and NUMCT.leave() when the child goes elsewhere.
// Rules, voice and style come from numcore.js (the same phone voice and the same green buttons). The last level reached is kept on the phone (localStorage).
(function (g) {
  'use strict';
  const C = g.NUM; if (!C) return;
  const { N, L, h, btn, clear, say, later, stopAll, mkR } = C;
  const FR = [['\uD83E\uDD6D', 'mangoes'], ['\uD83C\uDF4E', 'apples'], ['\uD83C\uDF4C', 'bananas'], ['\uD83C\uDF4A', 'oranges'], ['\uD83C\uDF53', 'strawberries']];   // single, round-ish fruits (no bunches like grapes: they are hard to count)
  const LV = [
    { k: 'count', max: 3, nopt: 3, t: N('Ginti 1\u20133', 'Count 1\u20133') }, { k: 'count', max: 5, t: N('Ginti 1\u20135', 'Count 1\u20135') }, { k: 'count', max: 10, t: N('Ginti 1\u201310', 'Count 1\u201310') },
    { k: 'two', t: N('Do phal, ek ginna', 'Two fruits, count one') }, { k: 'add', m: 5, cap: 10, t: N('Jodna +', 'Adding +') },
    { k: 'count', max: 20, t: N('Ginti 1\u201320', 'Count 1\u201320') }, { k: 'add', m: 10, cap: 20, t: N('Jodna 1\u201320', 'Adding 1\u201320') },
    { k: 'sub', cap: 12, t: N('Ghatana', 'Taking away') }, { k: 'num', op: '+', cap: 99, t: N('Bade number +', 'Big numbers +') }, { k: 'num', op: '-', cap: 99, t: N('Bade number \u2212', 'Big numbers \u2212') }
  ];
  const NEED = 5, KEY = 'orbit_numct_level';
  const TX = { ask: N('Kitne hain? Ginke dabao', 'How many? Count and tap'), askTwo: N('Sirf ye phal gino', 'Count only this fruit'), askAdd: N('Total kitne?', 'How many in all?'), askSub: N('Halke phal hata do. Kitne bache?', 'Take away the faded ones. How many are left?'), askNum: N('Sahi jawab chuno', 'Pick the right answer'), again: N('Phir se ginke dekho', 'Count again'), great: N('Shabaash!', 'Well done!'), up: N('Shabaash! Naya level', 'Well done! New level'), all: N('Shabaash! Sab level poore!', 'Well done! All levels finished!') };
  const T = k => TX[k][C.lang()] || TX[k].hing;

  // One question. Exactly one option is the answer; the options are all different and never below 1. `prev` is the last answer (the same number never comes twice in a row).
  function makeQ(level, rnd, prev, lastF) {
    const R = mkR(rnd), d = LV[level], items = [], extra = [];
    let f = R.int(0, FR.length - 1); while (f === lastF) f = R.int(0, FR.length - 1);
    let ans, ask = 'ask', say = '', eq = '', dim = 0, a, b, i;
    if (d.k === 'count') { do { ans = R.int(1, d.max); } while (ans === prev && d.max > 1); for (i = 0; i < ans; i++) items.push(FR[f][0]); say = 'How many ' + FR[f][1] + '?'; }
    else if (d.k === 'two') { let o = R.int(0, FR.length - 1); while (o === f) o = R.int(0, FR.length - 1); a = R.int(1, 5); b = R.int(1, 4); ans = a; for (i = 0; i < a; i++) items.push(FR[f][0]); for (i = 0; i < b; i++) items.push(FR[o][0]); R.shuffle(items).forEach((x, k) => { items[k] = x; }); extra.push(a + b); ask = 'askTwo'; say = 'Count only the ' + FR[f][1]; eq = FR[f][0]; }
    else if (d.k === 'add') { a = R.int(1, d.m); b = R.int(1, d.m); ans = a + b; for (i = 0; i < a; i++) items.push(FR[f][0]); items.push('+'); for (i = 0; i < b; i++) items.push(FR[f][0]); ask = 'askAdd'; say = a + ' plus ' + b + '. How many in all?'; }
    else if (d.k === 'sub') { a = R.int(4, 12); b = R.int(1, a - 1); ans = a - b; for (i = 0; i < a; i++) items.push(FR[f][0]); dim = b; ask = 'askSub'; say = a + ' minus ' + b + '. How many are left?'; }
    else { if (d.op === '+') { a = R.int(10, 60); b = R.int(10, 99 - a); ans = a + b; eq = a + ' + ' + b; say = a + ' plus ' + b + '. What is the total?'; } else { a = R.int(30, 99); b = R.int(10, a - 5); ans = a - b; eq = a + ' \u2212 ' + b; say = a + ' minus ' + b + '. What is left?'; } ask = 'askNum'; }
    const cap = d.cap || d.max || 12; let opts;
    if (d.nopt === 3) opts = [1, 2, 3];
    else {
      const pool = []; extra.forEach(x => { if (x !== ans && x <= 12) pool.push(x); });
      R.shuffle(d.k === 'num' ? [-10, -2, -1, 1, 2, 10] : [-3, -2, -1, 1, 2, 3]).forEach(x => { const v = ans + x; if (v >= 1 && v <= cap && !pool.includes(v)) pool.push(v); });
      opts = [ans].concat(pool.slice(0, 3)); while (opts.length < 4) { const v = R.int(1, cap); if (!opts.includes(v)) opts.push(v); }
      opts = R.shuffle(opts);
    }
    return { items, eq: d.k === 'two' ? '' : eq, mark: d.k === 'two' ? eq : '', dim, ans, opts, ask, say, f };
  }

  let ROOT = null, lv = 0, stars = 0, Q = null, lock = false, prev = 0, lastF = -1, likeT = 0;
  const loadLv = () => { try { const n = +g.localStorage.getItem(KEY); return n >= 0 && n < LV.length ? Math.floor(n) : 0; } catch (e) { return 0; } };
  const saveLv = () => { try { g.localStorage.setItem(KEY, String(lv)); } catch (e) { /* storage full or blocked */ } };
  const css = () => {
    if (g.document.getElementById('numct-css')) return;
    const s = h('style', null,
      '.nct-stage{display:flex;flex-wrap:wrap;align-content:center;justify-content:center;gap:4px 8px;min-height:150px;padding:6px 0}.nct-f{line-height:1.1;animation:nctpop .35s both}.nct-f.dim{opacity:.22}.nct-f.eq{font-weight:800}'
      + '.nct-mark{font-size:30px;margin:4px 0}.nct-grid3{grid-template-columns:1fr 1fr 1fr}'
      + '.nct-like{position:fixed;left:0;right:0;bottom:12vh;height:0;display:none;pointer-events:none;z-index:50}.nct-like.on{display:block}'
      + '.nct-lk{position:absolute;bottom:0;width:min(20vw,84px);height:min(20vw,84px);margin-left:calc(min(20vw,84px) / -2);opacity:0}.nct-lk.a{left:32%}.nct-lk.b{left:50%}.nct-lk.c{left:68%}'
      + '.nct-lk svg{width:100%;height:100%;fill:#16a34a;stroke:#fff;stroke-width:.7;stroke-linejoin:round;paint-order:stroke;filter:drop-shadow(0 4px 0 #0f7a36)}'
      + '.nct-like.on .nct-lk{animation:nctfloat 1.5s ease-out both}.nct-like.on .nct-lk.b{animation-delay:.18s}.nct-like.on .nct-lk.c{animation-delay:.36s}'
      + '@keyframes nctpop{from{transform:scale(.2);opacity:0}to{transform:scale(1);opacity:1}}@keyframes nctfloat{0%{transform:translate(0,0) scale(.3);opacity:0}12%{transform:translate(0,-6vh) scale(1);opacity:1}35%{transform:translate(-14px,-22vh) scale(1)}60%{transform:translate(14px,-40vh) scale(1);opacity:1}100%{transform:translate(-6px,-62vh) scale(.9);opacity:0}}'
      + '@media(prefers-reduced-motion:reduce){.nct-f{animation:none}.nct-like.on .nct-lk{animation:none;opacity:1}}');
    s.id = 'numct-css'; g.document.head.appendChild(s);
  };
  function likeEl() {   // small green thumbs-ups (SVG, no background) that float from the bottom to the top, one after another
    const ns = 'http://www.w3.org/2000/svg', box = h('div', 'nct-like', null, { 'aria-hidden': 'true' });
    ['a', 'b', 'c'].forEach(k => {
      const w = h('span', 'nct-lk ' + k), svg = g.document.createElementNS(ns, 'svg'), p = g.document.createElementNS(ns, 'path');
      svg.setAttribute('viewBox', '0 0 24 24'); p.setAttribute('d', 'M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z');
      svg.appendChild(p); w.appendChild(svg); box.appendChild(w);
    });
    return box;
  }
  function showLike() { const e = ROOT && ROOT.querySelector('.nct-like'); if (!e) return; clearTimeout(likeT); e.classList.remove('on'); void e.offsetWidth; e.classList.add('on'); likeT = later(() => e.classList.remove('on'), 2000); }
  function draw(speakNow) {
    const q = Q, d = LV[lv], c = h('div', 'nl-c'), top = h('div', 'nl-top'), n = q.items.length;
    top.appendChild(h('span', 'nl-pill', L('level') + ' ' + (lv + 1) + '  \u00B7  ' + (C.lang() === 'en' ? d.t.en : d.t.hing)));
    top.appendChild(h('span', 'nl-pill', '\u2605'.repeat(stars) + '\u2606'.repeat(NEED - stars)));
    const bar = h('div', 'nl-bar'), fill = h('i'); fill.style.width = (stars / NEED * 100) + '%'; bar.appendChild(fill);
    if (q.mark) c.appendChild(h('div', 'nct-mark', T('askTwo') + ' ' + q.mark));
    const st = h('div', 'nct-stage'), sz = n > 12 ? 'min(8vw,38px)' : n > 9 ? 'min(11vw,52px)' : n > 6 ? 'min(14vw,68px)' : n > 3 ? 'min(17vw,84px)' : 'min(20vw,96px)';
    if (q.eq) { const e = h('span', 'nct-f eq', q.eq); e.style.fontSize = 'min(17vw,84px)'; st.appendChild(e); }
    q.items.forEach((x, i) => { const s = h('span', 'nct-f' + (i >= n - q.dim && q.dim ? ' dim' : ''), x); s.style.fontSize = sz; s.style.animationDelay = (i * 0.08) + 's'; st.appendChild(s); });
    c.appendChild(st); c.appendChild(h('div', 'nl-ask', T(q.ask === 'askTwo' ? 'askTwo' : q.ask)));
    const gr = h('div', 'nl-grid' + (q.opts.length === 3 ? ' nct-grid3' : ''));
    q.opts.forEach(o => gr.appendChild(btn('nl-opt', String(o), function () { pick(this, o); })));
    c.appendChild(gr); c.appendChild(h('div', 'nl-msg', '', { 'aria-live': 'polite' }));
    clear(ROOT); [top, bar, c, likeEl()].forEach(x => ROOT.appendChild(x));
    if (speakNow) say(q.say);
  }
  function msg(t) { const m = ROOT && ROOT.querySelector('.nl-msg'); if (m) m.textContent = t; }
  function next() { if (!ROOT) return; Q = makeQ(lv, null, prev, lastF); prev = Q.ans; lastF = Q.f; lock = false; draw(true); }
  function pick(b, o) {
    if (lock || !Q) return;
    if (o !== Q.ans) { b.classList.add('nl-no'); later(() => b.classList.remove('nl-no'), 450); msg(T('again')); say('Try again'); return; }   // wrong: red shake, try again, nothing is lost
    lock = true; b.classList.add('ok'); showLike(); stars++;
    if (stars >= NEED) {   // level passed: the next level starts by itself (after the last one: back to level 1)
      const last = lv >= LV.length - 1; lv = last ? 0 : lv + 1; stars = 0; saveLv(); msg(T(last ? 'all' : 'up'));
      say(last ? 'Great job! All levels finished!' : 'Level up! Level ' + (lv + 1), next);
    } else { msg(T('great') + ' ' + Q.ans); say('Well done! ' + Q.ans, next); }
  }

  g.NUMCT = {
    viewHTML() { return '<h2 class="sec">123 Ginti</h2><div id="numct-root"></div>'; },
    mount(root) { const el = root && root.querySelector('#numct-root'); if (!el) return; ROOT = el; C.css(); css(); if (!Q) { lv = loadLv(); stars = 0; next(); } else draw(false); },
    leave() { clearTimeout(likeT); C.clearAll(); ROOT = null; Q = null; lock = false; stars = 0; prev = 0; lastF = -1; },
    _makeQ: makeQ, _data: { LV, NEED, FR }
  };
})(typeof window !== 'undefined' ? window : globalThis);
