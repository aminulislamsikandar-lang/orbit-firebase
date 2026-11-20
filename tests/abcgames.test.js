// ABC Games (sidebar "ABC Games"): every puzzle has exactly one right answer, the games run in a fake browser (jsdom),
// every win shows the celebration, the voice is waited for, nothing leaks. Run: node tests/abcgames.test.js
const fs = require('fs'), path = require('path'), assert = require('assert');
const ROOT = path.join(__dirname, '..');
let n = 0; const ok = (c, m) => { assert(c, m); n++; };
const src = fs.readFileSync(path.join(ROOT, 'public', 'abcgames.js'), 'utf8');
const idx = fs.readFileSync(path.join(ROOT, 'public', 'index.html'), 'utf8');
const sw = fs.readFileSync(path.join(ROOT, 'public', 'sw.js'), 'utf8');

// ---- pure logic ----
global.window = global; global.orbitLang = () => 'en';
require(path.join(ROOT, 'public', 'abcgames.js'));
const A = window.ABC, { AL, D, WORDS } = A._data;
ok(D.length === 26 && D.every((d, i) => d[0] === AL[i] && d[1][0].toUpperCase() === d[0] && d[2]), 'every letter has a word that starts with it and a picture');
ok(WORDS.every(w => /^[A-Z]{3}$/.test(w[0]) && w[1]) && new Set(WORDS.map(w => w[0])).size === WORDS.length, 'puzzle words are 3 capital letters with a picture, no repeats');
for (let k = 0; k < 600; k++) {
  const q = A._makeQuiz();
  ok(q.opts.length === 4 && new Set(q.opts).size === 4 && q.opts.filter(o => o === q.q[0]).length === 1, 'quiz has exactly one right letter');
  const g = A._makeGaps(), st = AL.indexOf(g.seg[0]);
  ok(g.seg.length === 7 && g.seg.every((l, i) => l === AL[st + i]), 'gaps row is 7 letters in A-Z order');
  ok(g.miss.length === 3 && new Set(g.miss).size === 3 && g.tiles.length === 4, '3 gaps, 4 tiles');
  const wrongTiles = g.tiles.filter(t => !g.seg.includes(t));
  ok(wrongTiles.length === 1 && g.miss.every(m => g.tiles.includes(g.seg[m])), 'tiles are the 3 missing letters plus one wrong letter');
  const w = A._makeWord();
  ok(w.tiles.slice().sort().join('') === w.w.split('').sort().join(''), 'word tiles are exactly the letters of the word');
}
// fixed random source gives the same puzzle every time (tests are repeatable)
ok(JSON.stringify(A._makeGaps(() => 0.3)) === JSON.stringify(A._makeGaps(() => 0.3)), 'injected random source is respected');

// ---- static checks ----
ok(!/\.(innerHTML|outerHTML)\s*\+?=/.test(src) && !/insertAdjacentHTML|document\.write|eval\(/.test(src), 'no HTML sinks');
ok(!/https?:\/\//.test(src), 'no external URLs');
ok(!/fetch\(|XMLHttpRequest|sendBeacon/.test(src), 'no network calls');
for (const k of ['/abcgames.js', "VIEW==='abc'", 'ABC.mount', "item('abc'", 'ABC.leave', "'models3d','abc'"]) ok(idx.includes(k), k + ' is wired into index.html');
ok((idx.match(/ABC\.leave\(\)/g) || []).length >= 2, 'leave is called from go() and from the back button');
ok(sw.includes('/abcgames.js'), 'cached for offline');
ok(+(/orbit-shell-v(\d+)/.exec(sw) || [])[1] >= 51, 'service worker cache version bumped');
ok(!/[\u{1F300}-\u{1FAFF}\u2600-\u27BF]/u.test(idx.slice(idx.indexOf("item('abc'"), idx.indexOf("item('abc'") + 40)), 'menu item has no emoji');
ok(src.length < 30000, 'stays small (' + src.length + ' bytes)');

// ---- fake browser ----
let JSDOM = null; try { ({ JSDOM } = require('jsdom')); } catch (e) {}
if (!JSDOM) { console.log('SKIP  jsdom not installed - ABC Games DOM tests not run'); console.log(n + ' passed, 0 failed'); process.exit(0); }
const wait = ms => new Promise(r => setTimeout(r, ms));
function boot(auto) {
  const dom = new JSDOM('<!doctype html><body><div id="app"></div></body>', { runScripts: 'outside-only', url: 'https://orbittutorial.web.app/', pretendToBeVisual: true });
  const w = dom.window, spoken = [], pend = [];
  w.setTimeout = (fn, ms) => { const t = setTimeout(fn, ms >= 3000 ? 60000 : 0);   // short delays run at once; the 3.2 s celebration and 8 s voice safety timers stay pending
    t.unref && t.unref(); return t; };
  w.clearTimeout = clearTimeout; w.orbitLang = () => 'en'; w.orbitLow = () => false;
  w.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } };
  w.speechSynthesis = { getVoices: () => [], cancel() {}, speak(u) { spoken.push(u.text); if (auto) setTimeout(() => u.onend && u.onend(), 0); else pend.push(u); } };
  w.eval(src);
  const app = w.document.getElementById('app'); app.innerHTML = w.ABC.viewHTML(); w.ABC.mount(app);
  const q = s => [...app.querySelectorAll(s)], click = el => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  return { w, app, q, click, spoken, pend, dom };
}
const chip = (b, label) => b.q('.chip').find(c => c.textContent === label);
(async () => {
  let b = boot(true);
  ok(b.q('.abc-card').length === 2 && b.app.textContent.includes('ABC Learn and Quiz') && b.app.textContent.includes('ABC Puzzle'), 'menu shows both games');

  // Learn: picture + "A for Apple", speaks once, next goes to B
  b.click(b.q('.abc-card')[0]); await wait(30);
  ok(b.app.textContent.includes('A for Apple') && b.q('.abc-pic')[0].textContent === D[0][2], 'learn shows A for Apple with its picture');
  await wait(30); ok(b.spoken.filter(t => t === 'A for Apple').length === 1, 'the letter is spoken once, not twice');
  b.click(b.q('.btn').find(x => x.textContent === 'Next')); await wait(30);
  ok(b.app.textContent.includes('B for Ball') && b.spoken[b.spoken.length - 1] === 'B for Ball', 'next shows and speaks the NEW letter');
  b.click(b.q('.btn').find(x => x.textContent === 'Previous')); b.click(b.q('.btn').find(x => x.textContent === 'Previous')); await wait(30);
  ok(b.app.textContent.includes('Z for Zebra'), 'previous wraps from A to Z');

  // Quiz: wrong answer shakes and does not celebrate; right answer celebrates; 10 right = Well done 10/10 and best score saved
  b.click(chip(b, 'Quiz')); await wait(30);
  const word = () => b.q('.abc-word')[0].textContent, right = () => D.find(d => d[1] === word())[0];
  let opt = l => b.q('.abc-opt').find(o => o.textContent === l);
  const bad = b.q('.abc-opt').find(o => o.textContent !== right());
  b.click(bad); ok(bad.classList.contains('abc-no') && !b.w.document.querySelector('.abc-cf') && b.app.textContent.includes('Try again'), 'wrong letter: shake + try again, no celebration');
  for (let k = 0; k < 10; k++) {
    const letter = right(); b.click(opt(letter));
    ok(!!b.w.document.querySelector('.abc-cf .abc-cheer'), 'every right answer shows the celebration (' + (k + 1) + ')');
    await wait(40);
  }
  ok(b.app.textContent.includes('Well done') && b.app.textContent.includes('10/10'), 'round ends with 10/10');
  ok(b.w.localStorage.getItem('orbit_abc_best_quiz') === '10', 'best score is kept on the device');
  ok(!!b.w.document.querySelector('.abc-cf'), 'champion celebration at the end');

  // Fill the gaps: solve by trying tiles; wrong tile never fills a gap; every solved puzzle celebrates; 8 puzzles end the round
  b.click(b.q('.abc-link')[0]); await wait(10); b.click(b.q('.abc-card')[1]); await wait(30);
  ok(b.app.textContent.includes('Which letters are missing?'), 'puzzle game opens on Fill the gaps');
  for (let p = 0; p < 8; p++) {
    ok(b.q('.abc-slot.gap').length === 3, 'puzzle ' + (p + 1) + ' starts with 3 gaps');
    let guard = 0;
    while (b.q('.abc-slot.gap').length && guard++ < 12) {
      const before = b.q('.abc-slot.ok').length;
      for (const t of b.q('.abc-tile:not(.used)')) { b.click(t); if (b.q('.abc-slot.ok').length > before || !b.q('.abc-slot.gap').length) break; }
    }
    ok(!!b.w.document.querySelector('.abc-cheer'), 'solved gaps puzzle celebrates');
    await wait(40);
  }
  ok(b.app.textContent.includes('8/8') && b.w.localStorage.getItem('orbit_abc_best_gaps') === '8', 'gaps round ends 8/8 and is saved');

  // Make the word
  b.click(chip(b, 'Make the word')); await wait(30);
  for (let p = 0; p < 8; p++) {
    let guard = 0;
    while (b.q('.abc-slot.sel').length && guard++ < 20) { for (const t of b.q('.abc-tile:not(.used)')) { const s = b.q('.abc-slot.ok').length; b.click(t); if (b.q('.abc-slot.ok').length > s) break; } }
    ok(!!b.w.document.querySelector('.abc-cheer'), 'built word celebrates');
    await wait(40);
  }
  ok(b.app.textContent.includes('8/8') && b.w.localStorage.getItem('orbit_abc_best_words') === '8', 'words round ends 8/8 and is saved');

  // leaving the page stops everything and restores a clean menu next time
  b.w.ABC.leave(); ok(!b.w.document.querySelector('.abc-cf'), 'leave removes any celebration');
  b.w.ABC.mount(b.app); ok(b.q('.abc-card').length === 2, 'coming back shows the menu again');

  // The next puzzle waits for the voice to finish (it must not cut the voice off)
  b = boot(false);
  b.click(b.q('.abc-card')[0]); b.click(chip(b, 'Quiz')); await wait(30);
  const w1 = b.q('.abc-word')[0].textContent, l1 = D.find(d => d[1] === w1)[0];
  b.click(b.q('.abc-opt').find(o => o.textContent === l1)); await wait(60);
  ok(b.q('.abc-word')[0].textContent === w1, 'next question does NOT come while the voice is still speaking');
  const u = b.pend[b.pend.length - 1]; u.onend(); await wait(40);
  ok(b.spoken.includes(l1 + ' for ' + w1), 'the full "letter for word" phrase is spoken after a right answer');
  ok(b.app.textContent.includes('Score 1 / 10'), 'moved on after the voice finished; score is 1');

  // a phone with no speech support still plays
  const dom2 = new JSDOM('<!doctype html><body><div id="app"></div></body>', { runScripts: 'outside-only', url: 'https://orbittutorial.web.app/', pretendToBeVisual: true });
  const w2 = dom2.window; w2.setTimeout = (fn) => { const t = setTimeout(fn, 0); t.unref && t.unref(); return t; }; w2.clearTimeout = clearTimeout; w2.orbitLang = () => 'hing'; w2.eval(src);
  const ap = w2.document.getElementById('app'); ap.innerHTML = w2.ABC.viewHTML(); w2.ABC.mount(ap);
  ok(ap.textContent.includes('ABC Seekho aur Quiz'), 'Hinglish labels follow the app language');
  ap.querySelectorAll('.abc-card')[0].dispatchEvent(new w2.MouseEvent('click', { bubbles: true })); await wait(20);
  ok(ap.textContent.includes('A for Apple'), 'works without speech support');
  console.log(n + ' passed, 0 failed');
})().catch(e => { console.log('FAIL  ' + (e && e.stack || e)); process.exit(1); });
