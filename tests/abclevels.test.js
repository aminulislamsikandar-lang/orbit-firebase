// ABC Levels (a topic on the Bolo page): every question has exactly one right answer, a level opens only after the pass mark of the level before,
// the voice is the same phone voice as ABC Games and is waited for (never cut), the Bolo page shows ABC Games and ABC Levels, nothing leaks.
// Run: node tests/abclevels.test.js
const fs = require('fs'), path = require('path'), assert = require('assert');
const ROOT = path.join(__dirname, '..');
let n = 0; const ok = (c, m) => { assert(c, m); n++; };
const read = f => fs.readFileSync(path.join(ROOT, 'public', f), 'utf8');
const src = read('abclevels.js'), idx = read('index.html'), sw = read('sw.js'), bolo = read('bolo.js'), abc = read('abcgames.js');

// ---- pure rules ----
global.window = global; global.orbitLang = () => 'en';
require(path.join(ROOT, 'public', 'abclevels.js'));
const A = window.ABCLV, { AL, D, WORDS, LV, TOTAL } = A._data;
ok(LV.length === 6 && TOTAL === 10, 'six levels of ten questions');
ok(LV.map(l => l.pass).join() === '60,60,70,70,80,80', 'pass marks 60, 60, 70, 70, 80, 80');
ok(LV.every((l, i) => i === 0 || l.pass >= LV[i - 1].pass), 'later levels are never easier to pass');
ok([0, 59, 60, 79, 80, 99, 100].map(A._stars).join() === '0,0,1,1,2,2,3', 'stars: 60% one, 80% two, 100% three');
ok(A._isOpen([0, 0, 0, 0, 0, 0], 0) && !A._isOpen([0, 0, 0, 0, 0, 0], 1), 'only level 1 is open at the start');
ok(!A._isOpen([50, 0, 0, 0, 0, 0], 1) && A._isOpen([60, 0, 0, 0, 0, 0], 1), 'level 2 opens at 60%, not at 50%');
ok(!A._isOpen([100, 59, 0, 0, 0, 0], 2) && A._isOpen([100, 60, 0, 0, 0, 0], 2), 'level 3 needs level 2 to reach 60%');
ok(!A._isOpen([100, 100, 69, 0, 0, 0], 3) && A._isOpen([100, 100, 70, 0, 0, 0], 3), 'level 4 needs level 3 to reach 70%');
ok(!A._isOpen([100, 100, 100, 100, 79, 0], 5) && A._isOpen([100, 100, 100, 100, 80, 0], 5), 'level 6 needs level 5 to reach 80%');
for (let k = 0; k < 400; k++) {
  for (let lv = 0; lv < 6; lv++) {
    const q = A._makeQ(lv);
    if (q.k === 'pic') {
      ok(q.opts.length === 4 && new Set(q.opts).size === 4 && q.opts.filter(o => o === q.q[0]).length === 1, 'pic: exactly one right letter');
      ok(lv > 0 || D.slice(0, 10).includes(q.q), 'level 1 only uses A to J');
    } else if (q.k === 'case') ok(q.opts.length === 4 && new Set(q.opts).size === 4 && q.opts.filter(o => o === q.l.toLowerCase()).length === 1 && q.opts.every(o => o === o.toLowerCase()), 'case: exactly one right small letter');
    else if (q.k === 'gap1') {
      const st = AL.indexOf(q.seg[0]);
      ok(q.seg.length === 5 && q.seg.every((l, i) => l === AL[st + i]), 'gap1: 5 letters in order');
      ok(q.opts.length === 4 && new Set(q.opts).size === 4 && q.opts.filter(o => q.seg.includes(o)).length === 1 && q.opts.includes(q.seg[q.m]), 'gap1: exactly one right letter');
    } else if (q.k === 'gap3') {
      const st = AL.indexOf(q.seg[0]);
      ok(q.seg.length === 7 && q.seg.every((l, i) => l === AL[st + i]) && q.miss.length === 3 && q.tiles.length === 4, 'gap3: 7 letters, 3 gaps, 4 tiles');
      ok(q.tiles.filter(t => !q.seg.includes(t)).length === 1 && q.miss.every(m => q.tiles.includes(q.seg[m])), 'gap3: three right tiles and one wrong');
    } else ok(q.tiles.slice().sort().join('') === q.w.split('').sort().join(''), 'word: tiles are exactly the letters');
  }
}
ok(JSON.stringify(A._makeQ(4, () => 0.3)) === JSON.stringify(A._makeQ(4, () => 0.3)), 'injected random source is respected');
ok(WORDS.every(w => /^[A-Z]{3}$/.test(w[0])), 'words are 3 capital letters');

// ---- static checks ----
ok(!/\.(innerHTML|outerHTML)\s*\+?=/.test(src) && !/insertAdjacentHTML|document\.write|eval\(/.test(src), 'no HTML sinks');
ok(!/https?:\/\//.test(src) && !/fetch\(|XMLHttpRequest|sendBeacon/.test(src), 'no network, no external URLs');
ok(src.length < 30000, 'stays small (' + src.length + ' bytes)');
const voice = s => (/function pickVoice[\s\S]*?\n  }\n/.exec(s) || [''])[0].replace(/\s+/g, ' ');
ok(voice(src).length > 100 && voice(src) === voice(abc), 'same voice choice as ABC Games');
ok(/u\.rate = \.85; u\.pitch = 1\.05;/.test(src) && /later\(fin, 8000\)/.test(src) && /later\(cb, 500\)/.test(src), 'same voice speed, and the end of every phrase is waited for');
ok(idx.includes('/abclevels.js') && idx.includes('ABCLV.mount'), 'wired into index.html');
ok(/\['abclv', 'ABC Levels'/.test(bolo) && /\['abc', 'ABC Games'/.test(bolo) && /g\.ABCLV\.viewHTML\(\)/.test(bolo) && /stopAbc\(\); if \(g\.SAATH/.test(bolo), 'Bolo has both topics and stops them when the child leaves');
ok(sw.includes('/abclevels.js') && +(/orbit-shell-v(\d+)/.exec(sw) || [])[1] >= 54, 'cached for offline, service worker version bumped');

// ---- fake browser ----
let JSDOM = null; try { ({ JSDOM } = require('jsdom')); } catch (e) {}
if (!JSDOM) { console.log('SKIP  jsdom not installed - ABC Levels DOM tests not run'); console.log(n + ' passed, 0 failed'); process.exit(0); }
const wait = ms => new Promise(r => setTimeout(r, ms));
function boot(auto, store) {
  const dom = new JSDOM('<!doctype html><body><div id="app"></div></body>', { runScripts: 'outside-only', url: 'https://orbittutorial.web.app/', pretendToBeVisual: true });
  const w = dom.window, spoken = [], pend = [];
  w.setTimeout = (fn, ms) => { const t = setTimeout(fn, ms >= 3000 ? 60000 : 0); t.unref && t.unref(); return t; };   // short delays run at once; the 8 s voice safety timer stays pending
  w.clearTimeout = clearTimeout; w.orbitLang = () => 'en';
  w.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } };
  w.speechSynthesis = { getVoices: () => [], cancel() {}, speak(u) { spoken.push(u.text); if (auto) setTimeout(() => u.onend && u.onend(), 0); else pend.push(u); }, addEventListener() {} };
  if (store) w.localStorage.setItem('orbit_abclv_best', store);
  w.eval(src);
  const app = w.document.getElementById('app'); app.innerHTML = w.ABCLV.viewHTML(); w.ABCLV.mount(app);
  const q = s => [...app.querySelectorAll(s)], click = el => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  // answer the question on screen correctly, the way a child would
  const solve = () => {
    const pic = app.querySelector('.lv-pic'), quest = A._lastQ;   // not used: read the screen instead
    return quest;
  };
  return { w, app, q, click, spoken, pend };
}
// helper: the right answers are read from the page state through the exposed random source is not possible, so the test plays by reading the screen
function answer(b) {
  const ask = b.app.querySelector('.lv-ask'), t = ask ? ask.textContent : '';
  const opts = b.q('.lv-opt'), tiles = b.q('.lv-tile:not(.used)'), slots = b.q('.lv-slot');
  if (opts.length) {
    const big = b.app.querySelector('.lv-big'), pic = b.app.querySelector('.lv-pic');
    if (big) { const l = big.textContent; return opts.find(o => o.textContent === l.toLowerCase()); }                        // case level
    if (!slots.length) { const w = /^(.+?) \u2014/.exec(t)[1]; const d = D.find(x => x[1] === w); return opts.find(o => o.textContent === d[0]); }   // picture level
    const segL = slots.map(s => s.textContent); const first = segL.find(x => x !== '?'); const st = AL.indexOf(first) - segL.indexOf(first);   // one gap
    const miss = AL[st + segL.indexOf('?')]; return opts.find(o => o.textContent === miss);
  }
  return null;
}
(async () => {
  let b = boot(true);
  const rows = () => b.q('.lv-row');
  ok(rows().length === 6 && b.q('.lv-hit').filter(x => x.tagName === 'BUTTON').length === 1, 'map shows six levels, only level 1 can be tapped');
  ok(rows()[1].classList.contains('lock') && /Pass the level before/.test(rows()[1].textContent), 'level 2 shows a lock and why');
  ok(!b.app.querySelector('canvas') && !/innerHTML/.test(b.app.textContent), 'plain page');

  // play level 1: wrong taps do not cost the score of other questions, a right tap moves on only after the voice finished
  b.click(b.q('.lv-hit')[0]); await wait(30);
  ok(/Level 1\s+\u00B7\s+1 \/ 10/.test(b.app.textContent), 'level 1, question 1 of 10');
  let wrongOk = true;
  for (let k = 0; k < 10; k++) {
    await wait(20);
    const right = answer(b); ok(!!right, 'found the right answer on screen');
    if (k === 0) { const bad = b.q('.lv-opt').find(o => o !== right); b.click(bad); ok(bad.classList.contains('lv-no') && /Try again/.test(b.app.textContent), 'a wrong tap shakes and says try again'); }
    b.click(right); await wait(40);
  }
  await wait(60);
  ok(/9 \/ 10/.test(b.app.textContent) && /\u2605/.test(b.app.textContent), 'result: 9 / 10 (the first question had a slip) with stars');
  ok(/open/.test(b.app.textContent) && b.q('button').some(x => x.textContent === 'Next level'), 'passed level 1: the next level is open');
  b.click(b.q('button').find(x => x.textContent === 'Levels')); await wait(20);
  ok(JSON.parse(b.w.localStorage.getItem('orbit_abclv_best'))[0] === 90, 'best score 90 saved');
  ok(b.q('.lv-hit').filter(x => x.tagName === 'BUTTON').length === 2, 'now levels 1 and 2 can be tapped');
  ok(b.spoken.some(t => /^Which|^Apple|for/.test(t)) || b.spoken.length > 5, 'the phone voice was used');

  // the voice is waited for: while a phrase is still being spoken the next question does not appear
  b = boot(false); b.click(b.q('.lv-hit')[0]); await wait(30);
  const right = answer(b); b.click(right); await wait(40);
  ok(/Level 1\s+\u00B7\s+1 \/ 10/.test(b.app.textContent) && /Well done/.test(b.app.textContent), 'while the voice is still speaking, the child stays on the question (nothing cut)');
  b.pend[b.pend.length - 1].onend(); await wait(40);
  ok(/Level 1\s+\u00B7\s+2 \/ 10/.test(b.app.textContent), 'when the voice has finished, the next question comes');

  // a redraw of the page (mount again) keeps the same question
  const before = b.app.textContent; b.w.ABCLV.mount(b.app); ok(b.app.textContent === before, 'mounting again keeps the child on the same question');
  // leaving stops everything
  b.w.ABCLV.leave(); b.w.ABCLV.mount(b.app); ok(b.q('.lv-row').length === 6 && !/\/ 10/.test(b.app.textContent), 'after leaving, coming back starts at the level map (the old question is gone)');

  // a saved score unlocks levels on the next visit
  b = boot(true, JSON.stringify([100, 100, 70, 0, 0, 0]));
  ok(b.q('.lv-hit').filter(x => x.tagName === 'BUTTON').length === 4, 'saved scores: levels 1 to 4 are open');
  ok(/\u2605 \d+ \/ 18/.test(b.app.textContent), 'total stars out of 18');
  // inside the real Bolo page: two new topic chips, each draws its own page and is stopped when the child changes topic
  {
    const dom = new JSDOM('<!doctype html><body><div id="app"></div></body>', { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://orbittutorial.web.app/' });
    const w = dom.window, rd = f => read(f);
    w.eval('var VIEW="bolo",USER={uid:"u1"};function draw(){var a=document.getElementById("app");a.innerHTML=BOLO.viewHTML();if(window.ABC)ABC.mount(a);if(window.ABCLV)ABCLV.mount(a)}');
    w.speechSynthesis = { cancel() {}, speak() {}, getVoices: () => [], addEventListener() {} }; w.SpeechSynthesisUtterance = function (t) { this.text = t; };
    Object.defineProperty(w, 'crypto', { value: require('crypto').webcrypto, configurable: true }); w.TextEncoder = TextEncoder;
    ['bolo-core.js', 'byanjan-video.js', 'bolo.js', 'abcgames.js', 'abclevels.js'].forEach(x => w.eval(rd(x))); w.eval('draw()');
    const d = w.document, chips = () => [...d.querySelectorAll('.bl-chips [data-bl=mode]')];
    ok(/^alpha,table,poem,byanjan,saath,asvyanjan,abc,abclv,numg,numlv,numct(,suno)?(,swar)?(,swarsaath)?$/.test(chips().map(c => c.dataset.v).join()), 'Bolo shows ABC Games and ABC Levels after the old topics, then 123 Games and 123 Levels (the old ones are untouched)');
    ok(!!d.querySelector('.bl-big') && !d.getElementById('abclv-root'), 'A se Z is still the first screen');
    chips().find(c => c.dataset.v === 'abclv').click(); await wait(20);
    ok(!!d.getElementById('abclv-root') && d.querySelectorAll('.lv-row').length === 6 && !d.querySelector('.bl-big'), 'ABC Levels topic: the level map is drawn inside Bolo');
    d.querySelector('.lv-hit').click(); await wait(20);
    ok(/Level 1/.test(d.getElementById('app').textContent), 'a level can be started');
    chips().find(c => c.dataset.v === 'abc').click(); await wait(20);
    ok(!!d.getElementById('abc-root') && !d.getElementById('abclv-root') && d.querySelectorAll('#abc-root button').length >= 2, 'ABC Games topic: its own menu is drawn inside Bolo');
    chips().find(c => c.dataset.v === 'alpha').click(); await wait(20);
    ok(!d.getElementById('abc-root') && !d.getElementById('abclv-root') && !!d.querySelector('.bl-big'), 'going back to another topic removes both and the normal Bolo screen is back');
    chips().find(c => c.dataset.v === 'abclv').click(); await wait(20);
    ok(d.querySelectorAll('.lv-row').length === 6, 'coming back to ABC Levels starts at the level map');
    w.BOLO.leave(); await wait(5); ok(true, 'leaving Bolo does not throw');
  }
  console.log(n + ' passed, 0 failed'); process.exit(0);   // Bolo keeps a timer alive in the fake browser
})().catch(x => { console.log('FAIL  ' + (x && x.stack || x)); console.log(n + ' passed, 1 failed'); process.exit(1); });
