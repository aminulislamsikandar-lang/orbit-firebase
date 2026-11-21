// Orbit 123 Levels: numbers learnt level by level (easy to hard), built exactly like ABC Levels. A child plays a level of 10 questions, gets a score and stars,
// and the next level opens only after the pass mark of the level before it.
// It lives inside the Bolo page as the "123 Levels" topic: bolo.js calls NUMLV.viewHTML() to draw it, NUMLV.mount(root) after the page is drawn, NUMLV.leave() when the child goes elsewhere.
// Shared rules, voice (same as ABC) and style are in numcore.js. Best scores are kept on the phone (localStorage), like ABC Levels.
(function (g) {
  'use strict';
  const C = g.NUM; if (!C) return;
  const { L, LN, h, btn, clear, say, later, stopAll, starRow, stars } = C;
  const LV = [{ k: 'count', pass: 60 }, { k: 'name', lo: 1, hi: 10, pass: 60 }, { k: 'name', lo: 11, hi: 20, pass: 60 }, { k: 'big', pass: 70 }, { k: 'gap1', pass: 70 }, { k: 'gap3', pass: 80 }, { k: 'order', pass: 80 }, { k: 'add', pass: 80 }, { k: 'sub', pass: 80 }, { k: 'tens', pass: 80 }];
  const TOTAL = 10, BESTKEY = 'orbit_numlv_best';
  const isOpen = (best, i) => i === 0 || (best[i - 1] || 0) >= LV[i - 1].pass;   // level 1 is always open; the others need the pass mark of the level before
  const makeQ = (level, rnd) => C.makeQ(LV[level], rnd);

  let ROOT = null, S = { r: null }, cur = null, Q = null, RES = null, lock = false, best = null;
  const loadBest = () => { if (best) return best; best = LV.map(() => 0); try { const a = JSON.parse(g.localStorage.getItem(BESTKEY) || 'null'); if (Array.isArray(a)) LV.forEach((_, i) => { best[i] = Math.max(0, Math.min(100, +a[i] || 0)); }); } catch (e) { /* blocked storage */ } return best; };
  const saveBest = () => { try { g.localStorage.setItem(BESTKEY, JSON.stringify(best)); } catch (e) { /* storage full or blocked */ } };
  const show = nodes => { clear(ROOT); nodes.forEach(x => ROOT.appendChild(x)); };

  // ---- level map ----
  function map() {
    S.r = map; cur = null; Q = null; stopAll();
    const b = loadBest(), trail = h('div', 'nl-trail');
    let now = -1; for (let i = 0; i < LV.length; i++) if (isOpen(b, i) && b[i] < LV[i].pass) { now = i; break; }
    LV.forEach((d, i) => {
      const op = isOpen(b, i), done = b[i] >= d.pass;
      const row = h('div', 'nl-row' + (i % 2 ? ' r' : '') + (op ? '' : ' lock') + (done ? ' done' : '') + (i === now ? ' now' : ''));
      const hit = op ? btn('nl-hit', null, () => play(i), { 'aria-label': L('level') + ' ' + (i + 1) + ' ' + LN('lv', i) }) : h('div', 'nl-hit', null, { 'aria-label': L('level') + ' ' + (i + 1) + ' (' + L('locked') + ')' });
      hit.appendChild(h('span', 'nl-node', op ? String(i + 1) : '\uD83D\uDD12'));
      const tx = h('span'); tx.appendChild(h('span', 'nl-nm', LN('lv', i)));
      if (!op) tx.appendChild(h('span', 'nl-sm', L('locked') + ' (' + LV[i - 1].pass + '%)'));
      else {
        tx.appendChild(h('span', 'nl-sm', LN('ld', i)));
        const sm = h('span', 'nl-sm'); if (b[i] > 0) { sm.appendChild(starRow(stars(b[i]))); sm.appendChild(g.document.createTextNode('  ' + L('best') + ' ' + b[i] + '%')); } else sm.textContent = L('pass') + ': ' + d.pass + '%';
        tx.appendChild(sm);
      }
      hit.appendChild(tx); row.appendChild(hit); trail.appendChild(row);
    });
    const tot = b.reduce((a, p) => a + stars(p), 0), top = h('div', 'nl-top');
    top.appendChild(h('span', 'mut', L('lIntro'))); top.appendChild(h('span', 'nl-pill', '\u2605 ' + tot + ' / ' + LV.length * 3));
    show([top, trail]);
  }

  // ---- playing a level ----
  function play(i) { cur = { i, q: 0, score: 0 }; nextQ(); }
  function nextQ() {
    if (!cur) return;
    if (cur.q >= TOTAL) return result();
    Q = makeQ(cur.i); lock = false; drawQ(true);
  }
  function wrong(b) { Q.slip = true; Q.msg = L('again'); if (b) { b.classList.add('nl-no'); later(() => b.classList.remove('nl-no'), 450); } const m = ROOT && ROOT.querySelector('.nl-msg'); if (m) m.textContent = Q.msg; say('Try again'); }
  function right(phrase) {   // the correct answer is spoken in full, then the next question comes
    lock = true; cur.q++; if (!Q.slip) cur.score++; Q.msg = L('great');
    const m = ROOT && ROOT.querySelector('.nl-msg'); if (m) m.textContent = Q.msg;
    say(phrase, nextQ);
  }
  function opts(c, q) {
    const gr = h('div', 'nl-grid'), sm = q.opts.some(o => o.length > 5);
    q.opts.forEach(o => { gr.appendChild(btn('nl-opt' + (sm ? ' sm' : ''), o, function () { if (lock) return; if (o === q.good) { this.classList.add('ok'); right(q.ok); } else wrong(this); })); });
    c.appendChild(gr);
  }
  function drawQ(speakNow) {
    S.r = () => drawQ(false);
    const q = Q, c = h('div', 'nl-c'), top = h('div', 'nl-top');
    top.appendChild(btn('nl-link', '\u2190 ' + L('back'), () => map()));
    top.appendChild(h('span', 'nl-pill', L('level') + ' ' + (cur.i + 1) + '  \u00B7  ' + Math.min(cur.q + 1, TOTAL) + ' / ' + TOTAL));
    const bar = h('div', 'nl-bar'), fill = h('i'); fill.style.width = (cur.q / TOTAL * 100) + '%'; bar.appendChild(fill);
    if (q.k === 'gap3') {
      c.appendChild(h('div', 'nl-ask', L('askGap3')));
      const row = h('div', 'nl-rowt');
      q.seg.forEach((l, k) => { if (!q.miss.includes(k)) row.appendChild(h('div', 'nl-slot', String(l))); else if (q.fill[k]) row.appendChild(h('div', 'nl-slot ok', String(l))); else row.appendChild(h('div', 'nl-slot gap' + (k === q.sel ? ' tg' : ''), k === q.sel ? '?' : '')); });
      c.appendChild(row);
      const tr = h('div', 'nl-rowt');
      q.tiles.forEach((l, k) => tr.appendChild(btn('nl-tile' + (q.used[k] ? ' used' : ''), String(l), function () {
        if (lock) return;
        if (l === q.seg[q.sel]) {
          q.fill[q.sel] = true; q.used[k] = true; const left = q.miss.filter(m => !q.fill[m]);
          if (!left.length) { drawQ(false); right(q.ok); } else { q.sel = left[0]; drawQ(false); say(String(l)); }
        } else wrong(this);
      })));
      c.appendChild(tr);
    } else if (q.k === 'order') {
      c.appendChild(h('div', 'nl-ask', L('askOrder')));
      const row = h('div', 'nl-rowt'); q.w.forEach((n, k) => row.appendChild(h('div', 'nl-slot' + (k < q.pos ? ' ok' : ' gap'), k < q.pos ? String(n) : '')));
      c.appendChild(row);
      const tr = h('div', 'nl-rowt');
      q.tiles.forEach((l, k) => tr.appendChild(btn('nl-tile' + (q.used[k] ? ' used' : ''), String(l), function () {
        if (lock) return;
        if (l === q.w[q.pos]) {
          q.used[k] = true; q.pos++;
          if (q.pos >= q.w.length) { drawQ(false); right(q.ok); } else { drawQ(false); say(String(l)); }
        } else wrong(this);
      })));
      c.appendChild(tr);
    } else {
      if (q.pic) c.appendChild(btn('nl-pic cnt', q.pic, () => say(q.intro), { 'aria-label': q.intro }));
      if (q.big) c.appendChild(h('div', 'nl-big' + (q.big.length > 5 ? ' sm' : ''), q.big));
      if (q.row) { const row = h('div', 'nl-rowt'); q.row.forEach(l => row.appendChild(h('div', 'nl-slot' + (l === '?' ? ' gap tg' : ''), l))); c.appendChild(row); }
      c.appendChild(h('div', 'nl-ask', L(q.ask)));
      opts(c, q);
    }
    c.appendChild(h('div', 'nl-msg', q.msg || '', { 'aria-live': 'polite' }));
    show([top, bar, c]);
    if (speakNow) say(q.intro);
  }

  // ---- end of a level ----
  function result() {
    const d = LV[cur.i], pct = Math.round(cur.score / TOTAL * 100), pass = pct >= d.pass, b = loadBest();
    if (pct > b[cur.i]) { b[cur.i] = pct; saveBest(); }
    RES = { i: cur.i, score: cur.score, pct, pass }; Q = null; drawRes(true);
  }
  function drawRes(speakNow) {
    S.r = () => drawRes(false);
    const r = RES, d = LV[r.i], c = h('div', 'nl-c nl-res'), top = h('div', 'nl-top');
    top.appendChild(btn('nl-link', '\u2190 ' + L('back'), () => map()));
    c.appendChild(h('div', 'mut', L('level') + ' ' + (r.i + 1) + ' \u00B7 ' + LN('lv', r.i)));
    c.appendChild(h('div', 'nl-big', r.score + ' / ' + TOTAL));
    const s = h('div', 'nl-stars'), n = stars(r.pct); for (let k = 0; k < 3; k++) s.appendChild(h('span', null, k < n ? '\u2605' : '\u2606', { style: 'animation-delay:' + (k * .2) + 's' + (k < n ? '' : ';color:var(--ln)') }));
    c.appendChild(s);
    const last = r.i >= LV.length - 1;
    c.appendChild(h('div', 'nl-ask', r.pass ? (last ? L('allDone') : L('opened')) : L('needs') + ' ' + d.pass + '% ' + L('needs2')));
    const a = h('div', 'nl-acts');
    if (r.pass && !last) a.appendChild(btn('btn', L('next'), () => play(r.i + 1)));
    a.appendChild(btn('btn', r.pass ? L('replay') : L('retry'), () => play(r.i)));
    a.appendChild(btn('btn', L('levels'), () => map()));
    c.appendChild(a); show([top, c]);
    if (speakNow) say(r.pass ? 'Well done! You got ' + r.score + ' out of ' + TOTAL : 'Good try! You got ' + r.score + ' out of ' + TOTAL + '. Try again');
  }

  g.NUMLV = {
    viewHTML() { return '<h2 class="sec">' + L('lTitle') + '</h2><div id="numlv-root"></div>'; },
    mount(root) { const el = root && root.querySelector('#numlv-root'); if (!el) return; ROOT = el; C.css(); (S.r || map)(); },
    leave() { C.clearAll(); S = { r: null }; ROOT = null; cur = null; Q = null; RES = null; lock = false; },
    _makeQ: makeQ, _isOpen: isOpen, _stars: stars, _data: { LV, TOTAL }, _resetBest() { best = null; }, _q: () => Q
  };
})(typeof window !== 'undefined' ? window : globalThis);
