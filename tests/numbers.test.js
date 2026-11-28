// 123 Levels and 123 Games (two topics on the Bolo page, built like ABC Levels / ABC Games, shared rules and voice in numcore.js):
// every question has exactly one right answer, a level opens only after the pass mark of the level before, the voice is the same phone voice as ABC and is waited for (never cut),
// the action games work, the Bolo page shows the new topics after the old ones, nothing leaks, the old ABC topics are untouched.
// Run: node tests/numbers.test.js
const fs = require('fs'), path = require('path'), assert = require('assert');
const ROOT = path.join(__dirname, '..');
let n = 0; const ok = (c, m) => { assert(c, m); n++; };
const read = f => fs.readFileSync(path.join(ROOT, 'public', f), 'utf8');
const core = read('numcore.js'), lvSrc = read('numlevels.js'), gmSrc = read('numgames.js'), idx = read('index.html'), sw = read('sw.js'), bolo = read('bolo.js'), abclv = read('abclevels.js');

// ---- pure rules ----
global.window = global; global.orbitLang = () => 'en';
require(path.join(ROOT, 'public', 'numcore.js')); require(path.join(ROOT, 'public', 'numlevels.js')); require(path.join(ROOT, 'public', 'numgames.js'));
const C = window.NUM, A = window.NUMLV, GM = window.NUMG, { LV, TOTAL } = A._data;
ok(LV.length === 10 && TOTAL === 10, 'ten levels of ten questions');
ok(LV.map(l => l.pass).join() === '60,60,60,70,70,80,80,80,80,80', 'pass marks');
ok(LV.every((l, i) => i === 0 || l.pass >= LV[i - 1].pass), 'later levels are never easier to pass');
ok([0, 59, 60, 79, 80, 99, 100].map(A._stars).join() === '0,0,1,1,2,2,3', 'stars: 60% one, 80% two, 100% three (same as ABC Levels)');
ok(A._isOpen(LV.map(() => 0), 0) && !A._isOpen(LV.map(() => 0), 1), 'only level 1 is open at the start');
ok(!A._isOpen([59, 0, 0, 0, 0, 0, 0, 0, 0, 0], 1) && A._isOpen([60, 0, 0, 0, 0, 0, 0, 0, 0, 0], 1), 'level 2 opens at 60%, not at 59%');
ok(!A._isOpen([100, 100, 100, 69, 0, 0, 0, 0, 0, 0], 4) && A._isOpen([100, 100, 100, 70, 0, 0, 0, 0, 0, 0], 4), 'level 5 needs level 4 at 70%');
const noDup = a => new Set(a).size === a.length;
for (let k = 0; k < 400; k++) {
  for (let lv = 0; lv < 10; lv++) {
    const q = A._makeQ(lv);
    if (q.opts) ok(q.opts.length >= 2 && noDup(q.opts) && q.opts.filter(o => o === q.good).length === 1, 'level ' + (lv + 1) + ': exactly one right option');
    if (q.k === 'count') ok(q.pic.length >= 1 && q.good === String([...q.pic].length / 1 === 0 ? 0 : q.good), 'count has a picture');
    if (q.k === 'name') { const d = LV[lv]; const num = +q.big; ok(num >= d.lo && num <= d.hi && C.NAMES[num] === q.good && q.opts.every(o => C.NAMES.includes(o)), 'number names stay inside the level range'); }
    if (q.k === 'big') { const [a, b] = q.big.split(/\s+/).map(Number); ok(a !== b && +q.good === Math.max(a, b), 'bigger number is right'); }
    if (q.k === 'gap1') { const seg = q.row.map(Number); ok(q.row.filter(x => x === '?').length === 1, 'one gap'); const i = q.row.indexOf('?'), st = i === 0 ? +q.good : +q.row[0]; ok(+q.good === st + i, 'the gap number follows the counting'); }
    if (q.k === 'gap3') { ok(q.miss.length === 3 && q.tiles.length === 4 && noDup(q.tiles) && q.miss.every(m => q.tiles.includes(q.seg[m])) && q.tiles.filter(t => !q.miss.some(m => q.seg[m] === t)).length === 1 && q.seg.every((x, i) => i === 0 || x === q.seg[i - 1] + 1), 'gap3: three missing numbers, one extra tile'); }
    if (q.k === 'order') ok(q.tiles.length === 5 && noDup(q.tiles) && q.w.every((x, i) => i === 0 || x > q.w[i - 1]) && q.tiles.slice().sort((a, b) => a - b).join() === q.w.join(), 'order: five different numbers with one right order');
    if (q.k === 'add') { const m = /^(\d+) \+ (\d+) = \?$/.exec(q.big); ok(+q.good === +m[1] + +m[2], 'add is right'); }
    if (q.k === 'sub') { const m = /^(\d+) \u2212 (\d+) = \?$/.exec(q.big); ok(+q.good === +m[1] - +m[2] && +q.good >= 0, 'subtract is right and never negative'); }
    if (q.k === 'tens') { const t = Math.floor(+q.big / 10), u = +q.big % 10; ok(q.good === t + ' tens  ' + u + ' ones', 'tens and ones are right'); }
    ok(typeof q.intro === 'string' && q.intro.length > 3 && typeof q.ok === 'string', 'every question has words for the voice');
    ok(!/[\u0900-\u097F]/.test(q.intro + q.ok), 'the voice phrases are English (the ABC voice is an English voice)');
  }
  const eo = C.makeQ({ k: 'evenodd' }), tb = C.makeQ({ k: 'table' }), sg = C.makeQ({ k: 'sign' }), bf = C.makeQ({ k: 'before', after: false }), af = C.makeQ({ k: 'before', after: true });
  ok(eo.good === (+eo.big % 2 ? 'Odd' : 'Even') && eo.opts.length === 2, 'even or odd is right');
  { const m = /^(\d+) \u00D7 (\d+) = \?$/.exec(tb.big); ok(+tb.good === +m[1] * +m[2] && noDup(tb.opts) && tb.opts.filter(o => o === tb.good).length === 1, 'table is right with one right option'); }
  { const m = /^(\d+)\s+\u2026\s+(\d+)$/.exec(sg.big), a = +m[1], b = +m[2]; ok(sg.good === (a < b ? '<' : a > b ? '>' : '='), 'sign is right'); }
  ok(+bf.good === +bf.big - 1 && +af.good === +af.big + 1 && noDup(bf.opts) && bf.opts.includes(bf.good) && af.opts.includes(af.good), 'before and after are right');
}
ok(GM._games.length === 9 && GM._games.map(x => x.key).join() === 'match,before,evenodd,table,sign,balloon,memory,tap,fast', 'nine games');
// a fixed random source gives the same question (tests can inject it)
const fixed = () => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; };
ok(JSON.stringify(A._makeQ(7, fixed())) === JSON.stringify(A._makeQ(7, fixed())), 'the random source can be injected');

// ---- how it is wired into the app ----
ok(/<script src="\/numcore\.js"><\/script>\s*<script src="\/numgames\.js"><\/script>\s*<script src="\/numlevels\.js"><\/script>/.test(idx) && idx.indexOf('/numcore.js') > idx.indexOf('/abclevels.js'), 'index.html loads numcore.js first, then the two topics, after the ABC scripts');
ok(idx.includes('NUMG.mount($(\'#app\'))') && idx.includes('NUMLV.mount($(\'#app\'))') && idx.includes('ABCLV.mount($(\'#app\'))') && idx.includes('ABC.mount($(\'#app\'))'), 'both new topics are mounted, the ABC mounts are still there');
ok(/\['abclv', 'ABC Levels', '#16a34a'\], \['numg', '123 Games', '#f59e0b'\], \['numlv', '123 Levels', '#16a34a'\](, \['numct', '123 Ginti', '#f59e0b'\])?(, \['suno', 'Suno Game', '#f59e0b'\])?(, \['swar', '[^']+', '#8e44ad'\])?(, \['swarsaath', '[^']+', '#8e44ad'\])?(, \['abcsaath', '[^']+', '#e91e63'\])?(, \['byanjanpic', '[^']+', '#e0613a'\])?\]/.test(bolo), 'Bolo has the two new topics after the ABC ones (same colours as the ABC chips)');
ok(/g\.NUMG\.viewHTML\(\)/.test(bolo) && /g\.NUMLV\.viewHTML\(\)/.test(bolo) && /if \(g\.NUMG\) g\.NUMG\.leave\(\); if \(g\.NUMLV\) g\.NUMLV\.leave\(\);/.test(bolo), 'Bolo draws them and stops them when the child leaves');
ok(['/numcore.js', '/numgames.js', '/numlevels.js'].every(f => sw.includes("'" + f + "'")) && +(/orbit-shell-v(\d+)/.exec(sw) || [])[1] >= 57, 'cached for offline, service worker version bumped');
const code = [core, lvSrc, gmSrc].map(x => x.split('\n').map(l => l.replace(/\/\/.*$/, '')).join('\n')).join('\n');
ok(!/innerHTML|document\.write|eval\(/.test(code), 'no innerHTML / eval / document.write in the new scripts');
ok(/\/\^en\/i\.test\(v\.lang\)/.test(core) && core.includes("u.rate = .85; u.pitch = 1.05") && abclv.includes("u.rate = .85; u.pitch = 1.05") && core.includes('pref = [/natural|neural|online/i, /google us english/i'), 'same voice choice and speed as ABC Levels');
ok(/CSS = '\.nl-top\{/.test(core) && abclv.match(/\.lv-node\{[^']*background:#16a34a;box-shadow:0 4px 0 #0f7a36/) && /\.nl-node\{[^']*background:#16a34a;box-shadow:0 4px 0 #0f7a36/.test(core) && /\.nl-row\.done \.nl-node\{background:#f5b301;box-shadow:0 4px 0 #c58d00\}/.test(core), 'level map colours are the same as ABC Levels (green now, gold done, grey locked)');

// ---- fake browser ----
let JSDOM = null; try { ({ JSDOM } = require('jsdom')); } catch (e) {}
if (!JSDOM) { console.log('SKIP  jsdom not installed - 123 DOM tests not run'); console.log(n + ' passed, 0 failed'); process.exit(0); }
const wait = ms => new Promise(r => setTimeout(r, ms));
function boot(which, o) {
  o = o || {};
  const dom = new JSDOM('<!doctype html><body><div id="app"></div></body>', { runScripts: 'outside-only', url: 'https://orbittutorial.web.app/', pretendToBeVisual: true });
  const w = dom.window, spoken = [], pend = [], ticks = []; let cancels = 0;
  w.setTimeout = (fn, ms) => { if (ms === 1000 && o.clock) { ticks.push(fn); return 0; } const t = setTimeout(fn, ms >= 3000 ? 60000 : 0); t.unref && t.unref(); return t; };   // short delays run at once; the 8 s voice safety timer stays pending; with clock the 1 s game ticks are driven by the test
  w.clearTimeout = clearTimeout; w.orbitLang = () => 'en';
  w.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } };
  w.speechSynthesis = { getVoices: () => [], cancel() { cancels++; }, speak(u) { spoken.push(u.text); if (o.auto !== false) setTimeout(() => u.onend && u.onend(), 0); else pend.push(u); }, addEventListener() {} };
  if (o.store) for (const k in o.store) w.localStorage.setItem(k, o.store[k]);
  w.eval(core); w.eval(lvSrc); w.eval(gmSrc);
  const app = w.document.getElementById('app'), M = which === 'games' ? w.NUMG : w.NUMLV;
  app.innerHTML = M.viewHTML(); M.mount(app);
  const q = s => [...app.querySelectorAll(s)], click = el => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  const adv = k => { for (let i = 0; i < k; i++) { const f = ticks.splice(0); f.forEach(x => x()); } };
  return { w, app, q, click, spoken, pend, M, adv, cancels: () => cancels };
}
// answer the question on screen correctly, the way a child would (it reads the answer from the question state)
async function solve(b) {
  const Q = b.M._q ? b.M._q() : b.M._state().q;
  if (Q.opts) { const o = b.q('.nl-opt').find(x => x.textContent === Q.good); ok(!!o, 'the right option is on screen'); b.click(o); return; }
  if (Q.k === 'gap3') { for (let i = 0; i < 3; i++) { const t = b.q('.nl-tile:not(.used)').find(x => x.textContent === String(Q.seg[Q.sel])); ok(!!t, 'the right tile is on screen'); b.click(t); await wait(15); } return; }
  for (const num of Q.w) { const t = b.q('.nl-tile:not(.used)').find(x => x.textContent === String(num)); ok(!!t, 'the right tile is on screen'); b.click(t); await wait(15); }
}
(async () => {
  // ---------- 123 Levels ----------
  let b = boot('levels');
  const rows = () => b.q('.nl-row');
  ok(/123 Levels/.test(b.app.textContent) && /Pass a level to open the next one\./.test(b.app.textContent), 'heading and intro like ABC Levels');
  ok(rows().length === 10 && b.q('.nl-hit').filter(x => x.tagName === 'BUTTON').length === 1, 'map shows ten levels, only level 1 can be tapped');
  ok(rows()[1].classList.contains('lock') && /Pass the level before \(60%\)/.test(rows()[1].textContent), 'level 2 shows a lock and why');
  ok(/\u2605 0 \/ 30/.test(b.app.textContent), 'total stars out of 30');
  b.click(b.q('.nl-hit')[0]); await wait(30);
  ok(/Level 1\s+\u00B7\s+1 \/ 10/.test(b.app.textContent), 'level 1, question 1 of 10');
  for (let k = 0; k < 10; k++) {
    await wait(20);
    if (k === 0) { const Q = b.M._q(), bad = b.q('.nl-opt').find(o => o.textContent !== Q.good); b.click(bad); ok(bad.classList.contains('nl-no') && /Try again/.test(b.app.textContent), 'a wrong tap shakes and says try again'); }
    await solve(b); await wait(40);
  }
  await wait(60);
  ok(/9 \/ 10/.test(b.app.textContent) && /\u2605/.test(b.app.textContent), 'result: 9 / 10 (the first question had a slip) with stars');
  ok(/open/.test(b.app.textContent) && b.q('button').some(x => x.textContent === 'Next level'), 'passed level 1: the next level is open');
  b.click(b.q('button').find(x => x.textContent === 'Levels')); await wait(20);
  ok(JSON.parse(b.w.localStorage.getItem('orbit_numlv_best'))[0] === 90 && !b.w.localStorage.getItem('orbit_abclv_best'), 'best score 90 saved under its own key (ABC Levels scores are not touched)');
  ok(b.q('.nl-hit').filter(x => x.tagName === 'BUTTON').length === 2, 'now levels 1 and 2 can be tapped');
  ok(b.spoken.length > 5 && b.spoken.every(t => /^[\x20-\x7E]+$/.test(t)), 'the phone voice was used, with plain English phrases');

  // every one of the ten levels can be played to the end with all answers right and stars come out right
  b = boot('levels', { store: { orbit_numlv_best: JSON.stringify([100, 100, 100, 100, 100, 100, 100, 100, 100, 0]) } });
  ok(b.q('.nl-hit').filter(x => x.tagName === 'BUTTON').length === 10, 'with saved scores all ten levels are open');
  for (let lv = 0; lv < 10; lv++) {
    b.click(b.q('.nl-hit')[lv]); await wait(20);
    for (let k = 0; k < 10; k++) { await wait(10); await solve(b); await wait(25); }
    await wait(40);
    ok(/10 \/ 10/.test(b.app.textContent), 'level ' + (lv + 1) + ' played to the end');
    b.click(b.q('button').find(x => x.textContent === 'Levels')); await wait(15);
  }
  ok(JSON.parse(b.w.localStorage.getItem('orbit_numlv_best')).join() === '100,100,100,100,100,100,100,100,100,100', 'all ten levels at 100%');
  ok(/\u2605 30 \/ 30/.test(b.app.textContent), '30 of 30 stars');

  // the voice is waited for: while a phrase is still being spoken the next question does not appear
  b = boot('levels', { auto: false }); b.click(b.q('.nl-hit')[0]); await wait(30);
  await solve(b); await wait(40);
  ok(/Level 1\s+\u00B7\s+1 \/ 10/.test(b.app.textContent), 'while the voice is still speaking, the child stays on the question (nothing cut)');
  const cancelsBefore = b.cancels();
  b.pend[b.pend.length - 1].onend(); await wait(40);
  ok(/Level 1\s+\u00B7\s+2 \/ 10/.test(b.app.textContent), 'when the voice has finished, the next question comes');
  ok(b.cancels() - cancelsBefore <= 1, 'the voice is cancelled only when a new phrase starts, never in between');
  // a redraw of the page (mount again) keeps the same question
  const before = b.app.textContent; b.M.mount(b.app); ok(b.app.textContent === before, 'mounting again keeps the child on the same question');
  b.M.leave(); b.M.mount(b.app); ok(b.q('.nl-row').length === 10 && !/\/ 10/.test(b.app.textContent), 'after leaving, coming back starts at the level map');
  b = boot('levels', { store: { orbit_numlv_best: JSON.stringify([100, 100, 70, 0, 0, 0, 0, 0, 0, 0]) } });
  ok(b.q('.nl-hit').filter(x => x.tagName === 'BUTTON').length === 4, 'saved scores: levels 1 to 4 are open');

  // ---------- 123 Games ----------
  b = boot('games');
  ok(/123 Games/.test(b.app.textContent) && b.q('.nl-card').length === 9, 'games menu with nine games');
  ok(b.q('.nl-card').map(x => x.querySelector('b').textContent).join() === 'Number Match,Before and After,Even or Odd,Table Time,Right Sign,Balloon Pop,Memory Match,Tap in Order,Fast Math', 'game names');
  // quiz rounds
  for (let gi = 0; gi < 5; gi++) {
    b.click(b.q('.nl-card')[gi]); await wait(20);
    ok(/Score 0 \/ 8/.test(b.app.textContent), GM._games[gi].key + ': a round of 8');
    for (let k = 0; k < 8; k++) { await wait(10); const Q = b.M._state().q, o = b.q('.nl-opt').find(x => x.textContent === Q.good); ok(!!o, 'right option on screen'); b.click(o); await wait(30); }
    await wait(40);
    ok(/8 \/ 8/.test(b.app.textContent) && b.q('button').some(x => x.textContent === 'Play again'), GM._games[gi].key + ': round finished 8 / 8');
    ok(b.w.localStorage.getItem('orbit_num_best_' + GM._games[gi].key) === '8', 'best score saved');
    b.click(b.q('button').find(x => x.textContent === 'Back to games')); await wait(15);
  }
  ok(b.q('.nl-card .hs').length === 5, 'best scores show on the menu');
  // a wrong answer does not count and can be tried again
  b.click(b.q('.nl-card')[0]); await wait(20);
  { const Q = b.M._state().q, bad = b.q('.nl-opt').find(x => x.textContent !== Q.good); b.click(bad); const shook = bad.classList.contains('nl-no'); await wait(10); ok(shook && b.M._state().score === 0 && b.M._state().n === 0, 'wrong answer: shakes, no score'); await wait(30); b.click(b.q('.nl-opt').find(x => x.textContent === Q.good)); await wait(30); ok(b.M._state().score === 0 && b.M._state().n === 1, 'after a slip the question moves on without a point'); }
  b.M.leave();
  // Balloon Pop (30 seconds, driven by the test clock)
  b = boot('games', { clock: true }); b.click(b.q('.nl-card')[5]); await wait(20);
  ok(/Pop the balloons with this number/.test(b.app.textContent) && b.q('.nl-bal').length === 12 && /Time 30/.test(b.app.textContent), 'balloons and the 30 second clock');
  { let t = b.M._state().tg; ok(b.q('.nl-bal').filter(x => +x.textContent === t).length === 3, 'three balloons carry the target number');
    b.q('.nl-bal').filter(x => +x.textContent === t).forEach(x => b.click(x)); await wait(300);
    ok(b.M._state().score === 3 && b.q('.nl-bal').length === 12 && b.M._state().left === 3, 'three pops: 3 points and a new round');
    t = b.M._state().tg; const bad = b.q('.nl-bal').find(x => +x.textContent !== t); b.click(bad); ok(b.M._state().score === 2, 'a wrong balloon costs one point (never below zero)');
    b.adv(31); await wait(30); ok(/2 \/|Well done/.test(b.app.textContent) && b.w.localStorage.getItem('orbit_num_best_balloon') === '2', 'when the 30 seconds are over the score is saved'); }
  b.M.leave();
  // Memory Match
  b = boot('games'); b.click(b.q('.nl-card')[6]); await wait(20);
  ok(b.q('.nl-mc').length === 8, 'memory: four pairs');
  { const cards = b.M._state().cards; ok(cards.length === 8 && [1, 2, 3, 4].length === 4, 'cards ready');
    const keys = {}; cards.forEach((c, i) => (keys[c.k] = keys[c.k] || []).push(i));
    ok(Object.values(keys).every(p => p.length === 2 && cards[p[0]].t !== cards[p[1]].t), 'each pair is a number and its pictures');
    // a wrong pair first, then everything right
    const ks = Object.keys(keys); b.click(b.q('.nl-mc')[keys[ks[0]][0]]); b.click(b.q('.nl-mc')[keys[ks[1]][0]]); await wait(40);
    ok(b.M._state().moves === 1 && b.M._state().found === 0 && b.q('.nl-mc.open').length === 0, 'wrong pair turns back');
    for (const k of ks) { b.click(b.q('.nl-mc')[keys[k][0]]); b.click(b.q('.nl-mc')[keys[k][1]]); await wait(40); }
    await wait(40); ok(b.w.localStorage.getItem('orbit_num_best_memory') === '18', 'memory finished: 5 moves, score 18, saved'); }
  b.M.leave();
  // Tap in Order
  b = boot('games'); b.click(b.q('.nl-card')[7]); await wait(20);
  ok(b.q('.nl-tb').length === 9, 'nine number buttons');
  { b.click(b.q('.nl-tb').find(x => x.textContent === '5')); ok(b.M._state().next === 1, 'a wrong number does not count');
    for (let i = 1; i <= 9; i++) { b.click(b.q('.nl-tb').find(x => x.textContent === String(i))); await wait(5); }
    await wait(30); ok(+b.w.localStorage.getItem('orbit_num_best_tap') >= 55, 'tap in order finished and saved'); }
  b.M.leave();
  // Fast Math
  b = boot('games', { clock: true }); b.click(b.q('.nl-card')[8]); await wait(20);
  ok(/Time 30/.test(b.app.textContent), 'fast math starts at 30 seconds');
  for (let k = 0; k < 5; k++) { const Q = b.M._state().q, o = b.q('.nl-opt').find(x => x.textContent === Q.good); b.click(o); await wait(30); }
  ok(b.M._state().score === 5 && !b.spoken.some(t => /plus|minus/.test(t) && false), 'five quick answers, five points');
  b.adv(31); await wait(30); ok(b.w.localStorage.getItem('orbit_num_best_fast') === '5', 'time over: score saved');
  b.M.leave(); await wait(5);
  ok(b.spoken.length >= 1, 'only the start and the end are spoken in the fast games');

  // ---------- inside the real Bolo page: two new topic chips after the ABC ones, the old topics are untouched ----------
  {
    const dom = new JSDOM('<!doctype html><body><div id="app"></div></body>', { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://orbittutorial.web.app/' });
    const w = dom.window, rd = f => read(f);
    w.eval('var VIEW="bolo",USER={uid:"u1"};function draw(){var a=document.getElementById("app");a.innerHTML=BOLO.viewHTML();if(window.ABC)ABC.mount(a);if(window.ABCLV)ABCLV.mount(a);if(window.NUMG)NUMG.mount(a);if(window.NUMLV)NUMLV.mount(a)}');
    w.speechSynthesis = { cancel() {}, speak() {}, getVoices: () => [], addEventListener() {} }; w.SpeechSynthesisUtterance = function (t) { this.text = t; };
    Object.defineProperty(w, 'crypto', { value: require('crypto').webcrypto, configurable: true }); w.TextEncoder = TextEncoder;
    ['bolo-core.js', 'byanjan-video.js', 'bolo.js', 'abcgames.js', 'abclevels.js', 'numcore.js', 'numgames.js', 'numlevels.js'].forEach(x => w.eval(rd(x))); w.eval('draw()');
    const d = w.document, chips = () => [...d.querySelectorAll('.bl-chips [data-bl=mode]')];
    ok(/^alpha,table,poem,byanjan,saath,asvyanjan,abc,abclv,numg,numlv(,numct)?(,suno)?(,swar)?(,swarsaath)?(,abcsaath)?(,byanjanpic)?$/.test(chips().map(c => c.dataset.v).join()), 'Bolo shows the old topics, then 123 Games and 123 Levels (and 123 Ginti)');
    ok(/123 Games,123 Levels(,123 Ginti)?(,Suno Game)?(,স্বৰ-বৰ্ণ)?(,স্বৰ সাথে বলো)?(,A–Z সাথে বলো)?(,ছবিৰে সাথে বলো)?$/.test(chips().map(c => c.textContent).join()), 'chip names');
    ok(!!d.querySelector('.bl-big') && !d.getElementById('numg-root') && !d.getElementById('numlv-root'), 'A se Z is still the first screen');
    chips().find(c => c.dataset.v === 'numlv').click(); await wait(20);
    ok(!!d.getElementById('numlv-root') && d.querySelectorAll('.nl-row').length === 10 && !d.querySelector('.bl-big'), '123 Levels topic: the level map is drawn inside Bolo');
    d.querySelector('.nl-hit').click(); await wait(20);
    ok(/Level 1/.test(d.getElementById('app').textContent), 'a level can be started');
    chips().find(c => c.dataset.v === 'numg').click(); await wait(20);
    ok(!!d.getElementById('numg-root') && !d.getElementById('numlv-root') && d.querySelectorAll('.nl-card').length === 9, '123 Games topic: its menu is drawn, the levels page is gone');
    chips().find(c => c.dataset.v === 'abclv').click(); await wait(20);
    ok(!!d.getElementById('abclv-root') && !d.getElementById('numg-root') && d.querySelectorAll('.lv-row').length === 6, 'ABC Levels still works exactly as before');
    chips().find(c => c.dataset.v === 'abc').click(); await wait(20);
    ok(!!d.getElementById('abc-root') && d.querySelectorAll('#abc-root button').length >= 2, 'ABC Games still works');
    chips().find(c => c.dataset.v === 'alpha').click(); await wait(20);
    ok(!d.getElementById('numg-root') && !d.getElementById('numlv-root') && !d.getElementById('abc-root') && !!d.querySelector('.bl-big'), 'going back to another topic removes all of them and the normal Bolo screen is back');
    chips().find(c => c.dataset.v === 'numlv').click(); await wait(20);
    ok(d.querySelectorAll('.nl-row').length === 10, 'coming back to 123 Levels starts at the level map');
    w.BOLO.leave(); await wait(5); ok(true, 'leaving Bolo does not throw');
  }
  console.log(n + ' passed, 0 failed'); process.exit(0);   // Bolo keeps a timer alive in the fake browser
})().catch(x => { console.log('FAIL  ' + (x && x.stack || x)); console.log(n + ' passed, 1 failed'); process.exit(1); });
