// Orbit Suno Game: three listening games for the Bolo page (topic chip "Suno Game") with the teacher's real recordings of the Assamese byanjan.
//   Jodi milao (press the speaker, then pick the same letter), Girte letters (the teacher says a letter, catch it before it falls), Kram lagao (tap the letters in the order you heard them).
// It lives inside the Bolo page: bolo.js calls SUNO.viewHTML() to draw it, SUNO.mount(root) after the page is drawn, SUNO.leave() when the child goes elsewhere.
// Voice: the same clips as the Byanjan topic (public/audio/byanjan/NN.mp3). Only the 25 clean clips are used: the clips of ঙ ঞ ণ ন (and the later ones) also say the name of the letter.
// Signal: the "Dhaar" shine. A soft white band sweeps across whatever the child should tap next (transform only, so it is smooth on cheap phones). Reduced motion: a still gold ring instead.
// Looks: the same green buttons as ABC Levels. No network, no library, no HTML strings.
(function (g) {
  'use strict';
  const N = (hing, en) => ({ hing, en });
  const TX = {
    title: N('Suno Game', 'Listen Game'),
    intro: N('Teacher ki asli awaaz se Assamese byanjan pehchano.', "Know the Assamese consonants from the teacher's real voice."),
    g1: N('Jodi milao', 'Match'), g2: N('Girte letters', 'Falling letters'), g3: N('Kram lagao', 'Order'),
    h1: N('Speaker dabao, phir wahi letter chuno', 'Press the speaker, then pick the same letter'),
    h3: N('Jis kram mein suna, usi mein dabao', 'Tap them in the order you heard'),
    firstSpk: N('Pehle speaker dabao.', 'Press a speaker first.'),
    right: N('Sahi!', 'Correct!'), again: N('Phir se suno aur dekho.', 'Listen again and look.'),
    allMatched: N('Shabaash! Saari jodi mil gayi.', 'Well done! All pairs matched.'),
    replay: N('Dobara khelo', 'Play again'), start: N('Shuru karo', 'Start'), listen: N('Sunna shuru karo', 'Start listening'),
    score: N('Score', 'Score'), lives: N('Jaan', 'Lives'), won: N('Jeete', 'Won'),
    sayAgain: N('Phir se sunao', 'Hear again'), teacher: N('Teacher bolega. Wahi letter dabao.', 'The teacher will speak. Tap that letter.'),
    fell: N('Letter neeche aa gaya.', 'The letter fell down.'), notThat: N('Ye wo letter nahi tha.', 'That was not the letter.'),
    over: N('Khel khatam. Score', 'Game over. Score'), listenClose: N('Dhyan se suno...', 'Listen carefully...'),
    nowTap: N('Ab usi kram mein letters dabao.', 'Now tap the letters in the same order.'),
    great: N('Shabaash! Sahi kram.', 'Well done! Right order.'), wrongOrder: N('Galat. Phir se sunao.', 'Wrong. Listen again.'), next: N('Agla', 'Next'),
    noSound: N('Awaaz nahi chali. Ek baar screen dabao aur phir se try karo.', 'No sound. Tap the screen once and try again.'), speaker: N('Awaaz sunao', 'Play the sound')
  };
  const lang = () => (g.orbitLang && g.orbitLang()) || 'hing';
  const L = k => TX[k][lang()] || TX[k].hing;

  // The 25 clean clips: [file number in public/audio/byanjan, letter]. Same order as BYANJAN_DATA in bolo-core.js (the test checks both).
  const CLIPS = [[1, 'ক'], [2, 'খ'], [3, 'গ'], [4, 'ঘ'], [6, 'চ'], [7, 'ছ'], [8, 'জ'], [9, 'ঝ'], [11, 'ট'], [12, 'ঠ'], [13, 'ড'], [14, 'ঢ'], [16, 'ত'], [17, 'থ'], [18, 'দ'], [19, 'ধ'], [21, 'প'], [22, 'ফ'], [23, 'ব'], [24, 'ভ'], [25, 'ম'], [26, 'য'], [27, 'ৰ'], [28, 'ল'], [29, 'ৱ']];
  const NN = CLIPS.length, AUDIO_V = 1;
  const url = i => '/audio/byanjan/' + String(CLIPS[i][0]).padStart(2, '0') + '.mp3?v=' + AUDIO_V;

  // ---- pure rules (random source can be injected, so tests can check them) ----
  const mkR = rnd => { const r = rnd || Math.random; return { int: (a, b) => a + Math.floor(r() * (b - a + 1)), shuffle: arr => { const x = arr.slice(); for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; } return x; } }; };
  const pick = (n, rnd) => mkR(rnd).shuffle(Array.from({ length: NN }, (_, i) => i)).slice(0, n);   // n different clips

  // ---- tiny DOM helpers (built with createElement only) ----
  const timers = [];
  function later(fn, ms) { const t = setTimeout(() => { const i = timers.indexOf(t); if (i >= 0) timers.splice(i, 1); fn(); }, ms); timers.push(t); return t; }
  const h = (tag, cls, txt, attrs) => { const e = g.document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };
  const btn = (cls, txt, fn, attrs) => { const b = h('button', cls, txt, attrs); b.type = 'button'; b.addEventListener('click', fn); return b; };
  const clear = el => { while (el.firstChild) el.removeChild(el.firstChild); };
  const SPK = 'http://www.w3.org/2000/svg';
  function icon(kind) {
    const s = g.document.createElementNS(SPK, 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('class', 'sg-ic'); s.setAttribute('aria-hidden', 'true');
    (kind === 'sp' ? ['M4 9h4l5-4v14l-5-4H4z', 'M16.5 9a4 4 0 0 1 0 6M19 6.5a8 8 0 0 1 0 11'] : ['M4 12a8 8 0 1 0 3-6.2', 'M4 4v5h5']).forEach(d => { const p = g.document.createElementNS(SPK, 'path'); p.setAttribute('d', d); s.appendChild(p); });
    return s;
  }

  // ---- the recorded voice: one clip at a time, the promise ends when the clip has finished (so nothing is cut off) ----
  const aud = {};
  let cur = null, sid = 0;
  function clipOf(i) { if (!aud[i]) { try { const a = new g.Audio(url(i)); a.preload = 'auto'; aud[i] = a; } catch (e) { aud[i] = null; } } return aud[i]; }
  function say(i) {
    return new Promise(res => {
      const a = clipOf(i), id = ++sid; let done = false;
      const fin = () => { if (done) return; done = true; if (a && a.removeEventListener) a.removeEventListener('ended', fin); res(); };
      if (!a) { fin(); return; }
      try {
        if (cur && cur !== a) cur.pause();
        cur = a; a.currentTime = 0; a.addEventListener('ended', fin);
        const p = a.play();
        if (p && p.catch) p.catch(() => { const m = ROOT && ROOT.querySelector('.sg-msg'); if (m && id === sid) m.textContent = L('noSound'); fin(); });
        later(fin, 4000);   // safety: a phone that never reports the end of a clip must not freeze a game
      } catch (e) { fin(); }
    });
  }
  function stopVoice() { sid++; try { if (cur) cur.pause(); } catch (e) { /* ignore */ } cur = null; }

  // ---- look: Orbit's green buttons; the Dhaar band is the ::before of .sg-nudge ----
  const CSS = '.sg-tabs{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0}'
    + '.sg-tab{border:1px solid var(--ln);background:var(--card);color:var(--tx);border-radius:99px;padding:8px 16px;font-weight:700}.sg-tab[aria-selected=true]{background:#16a34a;color:#fff;border-color:#16a34a}'
    + '.sg-c{background:var(--card);border-radius:22px;padding:16px;margin:12px 0;box-shadow:0 1px 0 var(--ln)}'
    + '.sg-bar{display:flex;justify-content:space-between;align-items:center;gap:8px;color:var(--mut);font-size:14px;margin-bottom:12px}'
    + '.sg-cols{display:grid;grid-template-columns:1fr 1fr;gap:12px 14px}.sg-cols>div{display:grid;gap:10px;align-content:start}'
    + '.sg-t{position:relative;min-height:62px;border:0;border-radius:16px;background:#16a34a;color:#fff;display:grid;place-items:center;font-size:34px;font-weight:700;box-shadow:0 4px 0 #0f7a36;overflow:hidden}'
    + '.sg-t.on{background:#15803d;box-shadow:0 4px 0 #0b3a1f,0 0 0 3px #f5b301}.sg-t.ok{background:#14532d;box-shadow:0 4px 0 #0b3a1f;pointer-events:none}.sg-t.bad{animation:sgsh .35s;background:#c62828;box-shadow:0 4px 0 #8e1b1b}'
    + '.sg-ic{width:26px;height:26px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}'
    + '.sg-nudge{position:relative;overflow:hidden}'
    + '.sg-nudge::before{content:"";position:absolute;top:0;bottom:0;left:0;width:60%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.55),transparent);transform:translateX(-120%);animation:sgdh 3.4s ease-in-out infinite;pointer-events:none}'   // Dhaar: the band sweeps from left to right
    + '.sg-t.ok::before{display:none}'
    + '.sg-arena{position:relative;height:340px;border-radius:18px;background:linear-gradient(rgba(22,163,74,.16),transparent);overflow:hidden}'
    + '.sg-arena .sg-t{position:absolute;top:0;width:20%;min-height:0;height:64px;will-change:transform}'
    + '.sg-row{display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-top:12px}.sg-row .sg-t{width:84px}'
    + '.sg-btn{position:relative;border:0;border-radius:99px;padding:12px 26px;font-weight:800;font-size:16px;background:#16a34a;color:#fff;box-shadow:0 3px 0 #0f7a36;display:flex;align-items:center;gap:8px;margin:14px auto 0}'
    + '.sg-btn.say{background:var(--card);color:var(--tx);border:1px solid var(--ln);box-shadow:none;padding:10px 16px}'
    + '.sg-msg{min-height:24px;text-align:center;font-weight:700;margin:10px 0 0}'
    + '@keyframes sgdh{0%{transform:translateX(-120%)}60%,100%{transform:translateX(260%)}}@keyframes sgsh{25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}'
    + '@media(prefers-reduced-motion:reduce){.sg-nudge::before{display:none}.sg-t.bad{animation:none}.sg-nudge{box-shadow:0 0 0 4px rgba(245,179,1,.7)}}';   // reduced motion: a still gold ring, no sweep
  function css() { if (g.document.getElementById('sg-css')) return; const s = h('style', null, CSS); s.id = 'sg-css'; g.document.head.appendChild(s); }

  // ---- state: the screen is always drawn from it, so a redraw of the Bolo page keeps the child exactly where they were ----
  let ROOT = null, BODY = null, K = 0, tok = 0, S = {};
  const setMsg = t => { const m = ROOT && ROOT.querySelector('.sg-msg'); if (m) m.textContent = t || ''; };
  const nudge = (els, on) => els.forEach(b => b.classList.toggle('sg-nudge', !!on && !b.classList.contains('ok')));

  function tabs() {
    const bar = h('div', 'sg-tabs', null, { role: 'tablist' });
    ['g1', 'g2', 'g3'].forEach((k, i) => bar.appendChild(btn('sg-tab', L(k), () => open(i), { role: 'tab', 'aria-selected': String(i === K) })));
    return bar;
  }
  function open(k) { tok++; stopVoice(); timers.splice(0).forEach(clearTimeout); K = k; S = {}; frame(); }
  function frame() {
    if (!ROOT) return; clear(ROOT);
    ROOT.appendChild(h('p', 'mut', L('intro'))); ROOT.appendChild(tabs());
    BODY = h('div', 'sg-c'); ROOT.appendChild(BODY);
    [g1, g2, g3][K]();
  }

  // 1 Jodi milao: press the speaker, then pick the same letter
  function g1() {
    if (!S.ids) { S.ids = pick(6); S.left = mkR().shuffle(S.ids); S.right = mkR().shuffle(S.ids); S.sel = -1; S.done = {}; S.n = 0; S.msg = ''; }
    const my = tok; clear(BODY);
    BODY.appendChild(h('div', 'sg-bar')).appendChild(h('span', null, L('h1')));
    const cnt = h('span', null, S.n + ' / 6'); BODY.firstChild.appendChild(cnt);
    const cols = h('div', 'sg-cols'), a = h('div'), b = h('div'), spk = [], lts = [];
    S.left.forEach(i => { const e = btn('sg-t' + (S.done[i] ? ' ok' : '') + (S.sel === i ? ' on' : ''), null, () => { if (my !== tok || S.done[i]) return; S.sel = i; S.msg = ''; say(i); g1(); }, { 'aria-label': L('speaker') }); e.appendChild(icon('sp')); a.appendChild(e); spk.push(e); });
    S.right.forEach(i => { const e = btn('sg-t' + (S.done[i] ? ' ok' : ''), CLIPS[i][1], () => {
      if (my !== tok || S.done[i]) return;
      if (S.sel < 0) { setMsg(S.msg = L('firstSpk')); return; }
      if (i === S.sel) { S.done[i] = true; S.sel = -1; S.n++; S.msg = S.n === 6 ? L('allMatched') : L('right'); g1(); }
      else { e.classList.remove('bad'); void e.offsetWidth; e.classList.add('bad'); setMsg(S.msg = L('again')); }
    }); b.appendChild(e); lts.push(e); });
    cols.appendChild(a); cols.appendChild(b); BODY.appendChild(cols);
    BODY.appendChild(h('p', 'sg-msg', S.msg, { 'aria-live': 'polite' }));
    if (S.n === 6) { const r = btn('sg-btn sg-nudge', L('replay'), () => { S = {}; g1(); }); BODY.appendChild(r); }
    else { nudge(spk, S.sel < 0); nudge(lts, S.sel >= 0); }   // Dhaar on the speakers first, then on the letters
  }

  // 2 Girte letters: the teacher says a letter, tap it before it reaches the bottom. Positions come from the clock, so a redraw continues where it was.
  function g2() {
    if (!S.init) { S.init = true; S.score = 0; S.lives = 3; S.round = 0; S.T = -1; S.run = false; S.msg = L('teacher'); S.start = true; S.tiles = []; S.t0 = 0; S.dur = 9000; }
    const my = tok; clear(BODY);
    const bar = h('div', 'sg-bar'); bar.appendChild(h('span', null, L('score') + ' ' + S.score)); bar.appendChild(h('span', null, L('lives') + ' ' + S.lives)); BODY.appendChild(bar);
    const ar = h('div', 'sg-arena'); BODY.appendChild(ar);
    S.els = S.tiles.map((id, k) => { const e = btn('sg-t sg-nudge', CLIPS[id][1], () => hit(e, id)); e.style.left = (3 + k * 24.5) + '%'; ar.appendChild(e); return e; });
    BODY.appendChild(btn('sg-btn say', null, () => { if (S.T >= 0) say(S.T); })).append(icon('re'), g.document.createTextNode(L('sayAgain')));
    BODY.appendChild(h('p', 'sg-msg', S.msg, { 'aria-live': 'polite' }));
    if (S.start) BODY.appendChild(btn('sg-btn sg-nudge', S.round || S.lives < 3 || S.score ? L('replay') : L('start'), () => { S.score = 0; S.lives = 3; S.round = 0; S.start = false; S.msg = ''; next(my); }));
    if (S.run) requestAnimationFrame(now => loop(my, now));
    function hit(e, id) {
      if (!S.run || my !== tok) return; S.run = false;
      if (id === S.T) { S.score++; S.round++; S.msg = L('right'); e.classList.add('ok'); setMsg(S.msg); later(() => my === tok && next(my), 600); }
      else { e.classList.add('bad'); lose(my, L('notThat')); }
    }
  }
  function next(my) {
    if (my !== tok) return;
    const ids = pick(4); S.tiles = ids; S.T = ids[mkR().int(0, 3)]; S.dur = Math.max(4500, 9000 - S.round * 350); S.t0 = performance.now(); S.run = true; S.msg = '';
    g2(); say(S.T);
  }
  function loop(my, now) {
    if (!S.run || my !== tok || !S.els) return;
    const ar = BODY && BODY.querySelector('.sg-arena'); if (!ar) return;
    const H = ar.clientHeight - 64, p = (now - S.t0) / S.dur;
    S.els.forEach(e => { if (e.isConnected && !e.classList.contains('ok')) e.style.transform = 'translateY(' + (-70 + (H + 70) * Math.min(p, 1)) + 'px)'; });   // transform only: no layout work on every frame
    if (p >= 1) { S.run = false; lose(my, L('fell')); } else requestAnimationFrame(t => loop(my, t));
  }
  function lose(my, t) {
    S.lives--;
    if (S.lives <= 0) { S.run = false; S.msg = L('over') + ' ' + S.score; S.tiles = []; S.T = -1; S.start = true; g2(); return; }
    S.msg = t; g2(); later(() => my === tok && next(my), 700);
  }

  // 3 Kram lagao: three letters are spoken one after another; tap them in the same order
  function g3() {
    const my = tok;
    if (!S.ids) { S.ids = pick(3); S.shown = mkR().shuffle(S.ids); S.k = 0; S.busy = false; S.win = S.win || 0; S.msg = ''; S.began = false; S.fin = false; }
    clear(BODY);
    const bar = h('div', 'sg-bar'); bar.appendChild(h('span', null, L('h3'))); bar.appendChild(h('span', null, L('won') + ': ' + S.win)); BODY.appendChild(bar);
    const row = h('div', 'sg-row'), tl = [];
    S.shown.forEach(i => { const e = btn('sg-t' + (S.ok && S.ok[i] ? ' ok' : ''), CLIPS[i][1], () => {
      if (S.busy || !S.began || S.fin || my !== tok) return;
      if (i === S.ids[S.k]) { (S.ok = S.ok || {})[i] = true; S.k++; if (S.k === 3) { S.win++; S.fin = true; S.msg = L('great'); } g3(); }
      else { S.k = 0; S.ok = {}; S.msg = L('wrongOrder'); g3(); }
    }); row.appendChild(e); tl.push(e); });
    BODY.appendChild(row);
    const rp = btn('sg-btn say', null, () => { if (!S.busy && S.began && !S.fin) { S.k = 0; S.ok = {}; seq(my); } }); rp.append(icon('re'), g.document.createTextNode(L('sayAgain'))); BODY.appendChild(rp);
    BODY.appendChild(h('p', 'sg-msg', S.msg, { 'aria-live': 'polite' }));
    if (!S.began) BODY.appendChild(btn('sg-btn sg-nudge', L('listen'), () => { S.began = true; seq(my); }));
    else if (S.fin) BODY.appendChild(btn('sg-btn sg-nudge', L('next'), () => { const w = S.win; S = { win: w }; g3(); }));
    else nudge(tl, !S.busy);
  }
  async function seq(my) {
    S.busy = true; S.msg = L('listenClose'); g3();
    for (const i of S.ids) { if (my !== tok) return; await say(i); await new Promise(r => later(r, 300)); }
    if (my !== tok) return; S.busy = false; S.msg = L('nowTap'); g3();
  }

  g.SUNO = {
    viewHTML() { return '<h2 class="sec">' + L('title') + '</h2><div id="suno-root"></div>'; },
    mount(root) { const el = root && root.querySelector('#suno-root'); if (!el) return; ROOT = el; css(); frame(); },
    leave() { tok++; stopVoice(); timers.splice(0).forEach(clearTimeout); ROOT = null; BODY = null; K = 0; S = {}; },
    _data: { CLIPS, NN }, _pick: pick, _url: url
  };
})(typeof window !== 'undefined' ? window : globalThis);
