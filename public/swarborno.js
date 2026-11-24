// Orbit Swar-borno: the Assamese vowels (অ আ ই ঈ উ ঊ ঋ এ ঐ ও ঔ) with the teacher's recording, a picture and a word for each one.
// It is a topic (chip "স্বৰ-বৰ্ণ") on the Bolo page, so Kid mode shows it too: bolo.js calls SWAR.viewHTML() to draw the page, SWAR.mount(root) after drawing and SWAR.leave() when the child goes elsewhere.
// "Sab sunao" plays the whole recording and the picture changes by itself exactly when each vowel is said; tapping one vowel plays only that one.
// The recording (public/swar/swar.mp3, 11 vowels with a pause between) is cut by time: LET[i][3] and LET[i][4] are the start and end second of vowel i (found from the pauses of the recording, tests/swarborno.test.js checks them).
// Pictures: public/swar/swar-NN.webp (transparent, NN = position of the vowel). Nothing else is needed: no network call, no library, no HTML strings.
(function (g) {
  'use strict';
  const V = 1, DUR = 27.68;
  // [vowel, word of the picture, colour of the tile, start s, end s]
  const LET = [
    ['\u0985', '\u0985\u09AE\u09BF\u09A4\u09BE', '#1f7a4a', 1.50, 1.99], ['\u0986', '\u0986\u09AE', '#8a4a9c', 3.82, 4.39], ['\u0987', '\u0987\u099F\u09BE', '#7b3a2c', 6.71, 7.42],
    ['\u0988', '\u0988\u0997\u09B2', '#6a3470', 9.39, 10.12], ['\u0989', '\u0989\u099F', '#1f7a4a', 12.21, 12.93], ['\u098A', '\u0989\u09A3\u09B8\u09C2\u09A4\u09BE', '#8a4a9c', 14.64, 15.42],
    ['\u098B', '\u098B\u09B7\u09BF', '#7b3a2c', 17.10, 17.67], ['\u098F', '\u098F\u09F0\u09BE\u0997\u099B', '#33335f', 19.72, 20.17], ['\u0990', '\u0990\u09F0\u09BE\u09F1\u09A4', '#e07a3a', 21.98, 22.47],
    ['\u0993', '\u0993\u09B2-\u0995\u099A\u09C1', '#6a3470', 24.26, 24.64], ['\u0994', '\u0994-\u099F\u09C7\u0999\u09BE', '#1f7a4a', 26.25, 26.64]
  ];
  const AUDIO = '/swar/swar.mp3?v=' + V, pic = i => '/swar/swar-' + String(i + 1).padStart(2, '0') + '.webp?v=' + V;
  const idxAt = t => { let k = -1; for (let i = 0; i < LET.length; i++) if (t >= LET[i][3] - 0.12) k = i; return k; };   // the vowel whose picture is on screen at second t (stays until the next one starts)

  let ROOT = null, au = null, cur = -2, mode = 'all', stopAt = 0, raf = 0, warmed = false;
  function h(tag, cls, text, attrs) {
    const e = g.document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }
  function css() {
    if (g.document.getElementById('swar-css')) return;
    const s = h('style');
    s.id = 'swar-css';
    s.textContent = '.sw-strip{display:grid;grid-template-columns:repeat(6,1fr);gap:8px;margin:6px 0 12px}'
      + '.sw-chip{border:0;border-radius:14px;height:50px;font-family:inherit;font-weight:700;font-size:26px;color:#fff;cursor:pointer;opacity:.6;transition:opacity .15s,transform .15s}'
      + '.sw-chip.on{opacity:1;transform:scale(1.08);box-shadow:0 0 0 3px var(--tx,#111)}'
      + '.sw-stage{background:var(--card,#fff);border:1px solid var(--ln,#ddd);border-radius:22px;padding:14px;min-height:340px;display:flex;flex-direction:column;align-items:center}'
      + '.sw-big{width:92px;height:92px;border-radius:22px;color:#fff;font-size:58px;line-height:92px;font-weight:700;text-align:center;margin-bottom:6px}'
      + '.sw-pic{flex:1;display:flex;align-items:center;justify-content:center;width:100%;min-height:190px}.sw-pic img{max-width:100%;max-height:220px;object-fit:contain;animation:swpop .35s ease-out}'
      + '.sw-word{font-size:28px;font-weight:700;margin-top:6px;min-height:42px;text-align:center}.sw-hint{margin:auto;text-align:center;color:var(--mut,#777);font-size:16px}'
      + '.sw-btns{display:flex;gap:8px;margin-top:12px}.sw-btns .btn{flex:1}'
      + '@keyframes swpop{from{opacity:0;transform:scale(.85)}to{opacity:1;transform:scale(1)}}@media(prefers-reduced-motion:reduce){.sw-pic img{animation:none}.sw-chip{transition:none}}';
    g.document.head.appendChild(s);
  }
  function audio() {
    if (!au) { au = new g.Audio(AUDIO); au.preload = 'auto'; au.addEventListener('ended', tick); }
    return au;
  }
  function paint() {   // draws the stage for vowel `cur` (or the hint when none is chosen yet); the chips only change their highlight
    if (!ROOT) return;
    const st = ROOT.querySelector('.sw-stage'); if (!st) return;
    ROOT.querySelectorAll('.sw-chip').forEach((c, k) => c.classList.toggle('on', k === cur));
    while (st.firstChild) st.removeChild(st.firstChild);
    if (cur < 0) { st.appendChild(h('div', 'sw-hint', 'Play dabao ya koi akshar chuno')); return; }
    const l = LET[cur], big = h('div', 'sw-big', l[0]), p = h('div', 'sw-pic'), im = new g.Image();
    big.style.background = l[2]; im.src = pic(cur); im.alt = l[1]; p.appendChild(im);
    st.appendChild(big); st.appendChild(p); st.appendChild(h('div', 'sw-word', l[1]));
  }
  function show(i) { if (i === cur) return; cur = i; paint(); }
  function tick() {
    const a = au; if (!a) return;
    if (mode === 'all') show(idxAt(a.currentTime));
    else if (a.currentTime >= stopAt) a.pause();
    g.cancelAnimationFrame(raf);
    if (!a.paused && !a.ended) raf = g.requestAnimationFrame(tick);
  }
  function go(t) {
    const a = audio();
    try { a.currentTime = t; } catch (e) { /* not loaded yet: it starts from the beginning */ }
    const p = a.play(); if (p && p.catch) p.catch(() => {});
    g.cancelAnimationFrame(raf); raf = g.requestAnimationFrame(tick);
  }
  function playOne(i) { mode = 'one'; stopAt = LET[i][4] + 0.25; show(i); go(Math.max(0, LET[i][3] - 0.15)); }
  function playAll() { mode = 'all'; const a = audio(); go(a.ended || a.currentTime >= DUR - 0.2 ? 0 : a.currentTime); }
  function stop() { if (au) au.pause(); g.cancelAnimationFrame(raf); }
  function warm() { if (warmed) return; warmed = true; LET.forEach((_, i) => { const im = new g.Image(); im.src = pic(i); }); audio(); }

  g.SWAR = {
    viewHTML() { return '<h2 class="sec">\u09B8\u09CD\u09AC\u09F0-\u09AC\u09F0\u09CD\u09A3</h2><div id="swar-root"></div>'; },
    mount(root) {
      const el = root && root.querySelector('#swar-root'); if (!el) return;
      ROOT = el; css(); while (el.firstChild) el.removeChild(el.firstChild);
      const strip = h('div', 'sw-strip', null, { role: 'group', 'aria-label': 'Swar-borno' });
      LET.forEach((l, i) => { const b = h('button', 'sw-chip', l[0], { type: 'button', 'aria-label': 'Akshar ' + l[0] }); b.style.background = l[2]; b.addEventListener('click', () => playOne(i)); strip.appendChild(b); });
      const btns = h('div', 'sw-btns'), all = h('button', 'btn', 'Sab sunao', { type: 'button' }), no = h('button', 'btn', 'Roko', { type: 'button' });
      all.addEventListener('click', playAll); no.addEventListener('click', stop);
      btns.appendChild(all); btns.appendChild(no);
      [strip, h('div', 'sw-stage', null, { 'aria-live': 'polite' }), btns].forEach(x => el.appendChild(x));
      if (cur === -2) cur = -1;
      paint(); warm();
    },
    leave() { stop(); g.cancelAnimationFrame(raf); ROOT = null; cur = -2; mode = 'all'; },
    _data: { LET, DUR, AUDIO, pic, idxAt }
  };
})(typeof window !== 'undefined' ? window : globalThis);
