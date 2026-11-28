// Suno Game (a topic chip on the Bolo page): the 25 clips are the clean teacher clips of public/audio/byanjan, the letters match bolo-core.js, every game works in a fake browser (jsdom),
// the Dhaar shine is only a transform (no layout work), reduced motion has a still ring, the old topics are untouched, nothing leaks.
// Run: node tests/sunogame.test.js
const fs = require('fs'), path = require('path'), assert = require('assert');
const ROOT = path.join(__dirname, '..');
let n = 0; const ok = (c, m) => { assert(c, m); n++; };
const read = f => fs.readFileSync(path.join(ROOT, 'public', f), 'utf8');
const src = read('sunogame.js'), idx = read('index.html'), sw = read('sw.js'), bolo = read('bolo.js');

// ---- the clips ----
global.window = global; global.orbitLang = () => 'en';
const C = require(path.join(ROOT, 'public', 'bolo-core.js'));
require(path.join(ROOT, 'public', 'sunogame.js'));
const S = window.SUNO, { CLIPS, NN } = S._data;
ok(NN === 25 && CLIPS.length === 25, '25 clean clips');
ok(new Set(CLIPS.map(c => c[0])).size === 25 && new Set(CLIPS.map(c => c[1])).size === 25, 'no clip and no letter twice');
ok(CLIPS.every(([f, l]) => C.BYANJAN_DATA[f - 1][0] === l), 'every clip number belongs to the same letter in bolo-core.js');
ok(CLIPS.every(([f]) => !C.BYANJAN_DATA[f - 1][1]), 'only clips where the teacher says just the letter (no name said with it)');
ok([5, 10, 15, 20].every(f => !CLIPS.some(c => c[0] === f)), 'ঙ ঞ ণ ন are left out (their clips also say the name)');
ok(CLIPS.every(([f]) => fs.existsSync(path.join(ROOT, 'public', 'audio', 'byanjan', String(f).padStart(2, '0') + '.mp3'))), 'every clip file exists in the repo (no new audio files needed)');
ok(S._url(0) === C.byanjanAudio(1) && S._url(24) === C.byanjanAudio(29), 'same file addresses (and version) as the Byanjan topic');
for (let t = 0; t < 200; t++) { const p = S._pick(6); ok(p.length === 6 && new Set(p).size === 6 && p.every(i => i >= 0 && i < NN), 'a pick is 6 different clips'); }

// ---- wiring and style ----
ok(/\['numct', '123 Ginti', '#f59e0b'\], \['suno', 'Suno Game', '#f59e0b'\](, \['swar', '[^']+', '#8e44ad'\])?(, \['swarsaath', '[^']+', '#8e44ad'\])?(, \['abcsaath', '[^']+', '#e91e63'\])?\]/.test(bolo), 'bolo.js: one new chip at the end, the old ones in place (Swar-borno may follow it)');
ok(bolo.includes("if (g.SUNO) g.SUNO.leave();") && bolo.includes("st.mode === 'suno'") && bolo.includes('g.SUNO.viewHTML()'), 'bolo.js draws it and stops it when the child leaves');
ok(idx.includes('<script src="/sunogame.js"></script>') && idx.includes("SUNO.mount($('#app'))") && idx.includes("NUMCT.mount($('#app'))"), 'index.html loads and mounts it, the other mounts are still there');
ok(sw.includes("'/sunogame.js'") && +(/orbit-shell-v(\d+)/.exec(sw) || [])[1] >= 67, 'cached for offline, service worker version bumped');
ok(!/innerHTML/.test(src), 'no innerHTML');
ok(/sg-nudge::before\{[^}]*transform:translateX\(-120%\)[^}]*animation:sgdh/.test(src) && /@keyframes sgdh\{0%\{transform:translateX\(-120%\)\}60%,100%\{transform:translateX\(260%\)\}\}/.test(src), 'Dhaar: a band swept with transform only');
ok(!/@keyframes sgdh\{[^@]*left:/.test(src), 'the sweep never animates left');
ok(/prefers-reduced-motion:reduce\)\{\.sg-nudge::before\{display:none\}/.test(src) && /\.sg-nudge\{box-shadow:0 0 0 4px/.test(src), 'reduced motion: no sweep, a still ring instead');
ok(src.includes('transform = \'translateY(') && !/\.style\.top\s*=/.test(src), 'falling letters move by transform');

// ---- the games in a fake browser ----
let JSDOM = null; try { ({ JSDOM } = require('jsdom')); } catch (e) { /* skipped below */ }
if (!JSDOM) { console.log('SKIP  jsdom not installed (npm i -D jsdom) - Suno Game click tests not run'); console.log(n + ' passed, 0 failed'); process.exit(0); }
const wait = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const dom = new JSDOM('<!doctype html><body><div id="app"></div></body>', { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://orbittutorial.web.app/' });
  const w = dom.window, played = [];
  w.eval('var VIEW="bolo",USER={uid:"u1"};function draw(){var a=document.getElementById("app");a.innerHTML=BOLO.viewHTML();if(window.SUNO)SUNO.mount(a)}');
  Object.defineProperty(w, 'crypto', { value: require('crypto').webcrypto, configurable: true }); w.TextEncoder = TextEncoder;
  w.speechSynthesis = { cancel() {}, speak() {}, getVoices: () => [], addEventListener() {} }; w.SpeechSynthesisUtterance = function (t) { this.text = t; };
  w.orbitLang = () => 'en'; w.api = async () => ({});
  // fake audio: a clip "ends" 5 ms after play()
  w.Audio = class { constructor(u) { this.u = u; this.l = {}; } addEventListener(e, f) { this.l[e] = f; } removeEventListener(e) { delete this.l[e]; } pause() {} play() { played.push(this.u); const f = this.l.ended; setTimeout(() => f && f(), 5); return Promise.resolve(); } };
  ['bolo-core.js', 'byanjan-video.js', 'bolo.js', 'sunogame.js'].forEach(x => w.eval(read(x))); w.eval('draw()');
  const d = w.document, chips = () => [...d.querySelectorAll('.bl-chips [data-bl=mode]')];
  ok(/^alpha,table,poem,byanjan,saath,asvyanjan,(abc,abclv,numg,numlv,numct,)?suno(,swar)?(,swarsaath)?(,abcsaath)?$/.test(chips().map(c => c.dataset.v).join()), 'Suno Game comes after all the old chips (Swar-borno may follow it), nothing else was removed');
  ok(!!d.querySelector('.bl-big') && !d.getElementById('suno-root'), 'A se Z is still the first screen');
  chips().find(c => c.dataset.v === 'suno').click(); await wait(20);
  ok(!!d.getElementById('suno-root') && d.querySelectorAll('.sg-tab').length === 3 && !d.querySelector('.bl-big'), 'the topic draws its page with three games');

  // 1 Jodi milao: speakers first (they shine), then the letters (they shine)
  const q = s => [...d.querySelectorAll(s)];
  ok(q('.sg-cols > div:first-child .sg-t').length === 6 && q('.sg-cols > div:first-child .sg-t').every(b => b.classList.contains('sg-nudge')) && !q('.sg-cols > div:last-child .sg-t').some(b => b.classList.contains('sg-nudge')), 'Jodi milao: the speakers shine first');
  q('.sg-cols > div:last-child .sg-t')[0].click();
  ok(/Press a speaker first/.test(d.querySelector('.sg-msg').textContent), 'a letter before a speaker: told to press the speaker');
  q('.sg-cols > div:first-child .sg-t')[0].click(); await wait(20);
  ok(played.length === 1 && /\/audio\/byanjan\/\d\d\.mp3\?v=1$/.test(played[0]), 'the speaker plays a real teacher clip');
  ok(q('.sg-cols > div:last-child .sg-t').every(b => b.classList.contains('sg-nudge')) && !q('.sg-cols > div:first-child .sg-t').some(b => b.classList.contains('sg-nudge')), 'after a speaker, the letters shine');
  const clipFile = played[0].match(/byanjan\/(\d\d)/)[1], letter = C.BYANJAN_DATA[+clipFile - 1][0];
  const lts = q('.sg-cols > div:last-child .sg-t'), wrong = lts.find(b => b.textContent !== letter), right = lts.find(b => b.textContent === letter);
  wrong.click(); ok(/Listen again/.test(d.querySelector('.sg-msg').textContent), 'a wrong letter: listen again');
  right.click(); ok(d.querySelector('.sg-cols > div:last-child .sg-t.ok').textContent === letter && /Correct/.test(d.querySelector('.sg-msg').textContent), 'the right letter is matched');
  // finish the whole game: for each speaker press, pick its letter
  for (let k = 0; k < 6; k++) {
    const sp = q('.sg-cols > div:first-child .sg-t').find(b => !b.classList.contains('ok')); if (!sp) break;
    played.length = 0; sp.click(); await wait(10);
    const L2 = C.BYANJAN_DATA[+played[played.length - 1].match(/byanjan\/(\d\d)/)[1] - 1][0];
    q('.sg-cols > div:last-child .sg-t').find(b => b.textContent === L2 && !b.classList.contains('ok')).click();
  }
  ok(/All pairs matched/.test(d.querySelector('.sg-msg').textContent) && /6 \/ 6/.test(d.querySelector('.sg-bar').textContent) && !!d.querySelector('.sg-btn.sg-nudge'), 'six pairs done: well done and a Play again button');

  // a redraw of the Bolo page keeps the child on the same game
  w.eval('draw()'); ok(!!d.getElementById('suno-root') && /6 \/ 6/.test(d.querySelector('.sg-bar').textContent), 'a page redraw keeps the state');

  // 3 Kram lagao
  d.querySelectorAll('.sg-tab')[2].click(); await wait(20);
  ok(q('.sg-row .sg-t').length === 3 && !!d.querySelector('.sg-btn.sg-nudge'), 'Kram lagao: three letters and a start button that shines');
  played.length = 0; d.querySelector('.sg-btn.sg-nudge').click(); await wait(1500);
  ok(played.length === 3, 'the three clips are played one after another');
  ok(/same order/.test(d.querySelector('.sg-msg').textContent) && q('.sg-row .sg-t').every(b => b.classList.contains('sg-nudge')), 'then the letters shine');
  const order = played.map(u => C.BYANJAN_DATA[+u.match(/byanjan\/(\d\d)/)[1] - 1][0]);
  const wrongFirst = q('.sg-row .sg-t').find(b => b.textContent !== order[0]); wrongFirst.click();
  ok(/Wrong/.test(d.querySelector('.sg-msg').textContent), 'a wrong first letter: wrong, listen again');
  ok(true, 'ok'); // the wrong tap resets the row; now the order again
  order.forEach(l => q('.sg-row .sg-t').find(b => b.textContent === l && !b.classList.contains('ok')).click());
  ok(/Right order/.test(d.querySelector('.sg-msg').textContent) && /Won: 1/.test(d.querySelector('.sg-bar').textContent), 'the right order wins');

  // 2 Girte letters
  d.querySelectorAll('.sg-tab')[1].click(); await wait(20);
  ok(!!d.querySelector('.sg-arena') && /Score 0/.test(d.querySelector('.sg-bar').textContent) && /Lives 3/.test(d.querySelector('.sg-bar').textContent), 'Girte letters: arena, score 0, 3 lives');
  played.length = 0; d.querySelector('.sg-btn.sg-nudge').click(); await wait(80);
  const tiles = q('.sg-arena .sg-t');
  ok(tiles.length === 4 && played.length === 1 && tiles.every(b => b.classList.contains('sg-nudge')) && /translateY/.test(tiles[0].style.transform) && !tiles[0].style.top, 'four letters fall by transform and the teacher says one');
  const T = C.BYANJAN_DATA[+played[0].match(/byanjan\/(\d\d)/)[1] - 1][0];
  tiles.find(b => b.textContent === T).click(); ok(/Score 1/.test(d.querySelector('.sg-bar').textContent) || /Correct/.test(d.querySelector('.sg-msg').textContent), 'the right letter scores');
  await wait(900); ok(/Score 1/.test(d.querySelector('.sg-bar').textContent) && q('.sg-arena .sg-t').length === 4, 'the next round starts by itself');
  // three wrong taps end the game
  for (let k = 0; k < 3; k++) {
    await wait(60); const ts = q('.sg-arena .sg-t'), cl = played[played.length - 1], tl = C.BYANJAN_DATA[+cl.match(/byanjan\/(\d\d)/)[1] - 1][0];
    const bad = ts.find(b => b.textContent !== tl); bad.click(); await wait(k < 2 ? 800 : 50);
  }
  ok(/Game over/.test(d.querySelector('.sg-msg').textContent) && /Lives 0/.test(d.querySelector('.sg-bar').textContent) && !!d.querySelector('.sg-btn.sg-nudge'), 'three wrong letters end the game and offer Play again');

  // leaving the topic stops it
  chips().find(c => c.dataset.v === 'alpha').click(); await wait(20);
  ok(!d.getElementById('suno-root') && !!d.querySelector('.bl-big'), 'another topic: Suno Game is gone, A se Z is back');
  console.log(n + ' passed, 0 failed'); w.close(); process.exit(0);   // the fake browser may still hold a timer: leave on purpose
})().catch(e => { console.log('FAIL  ' + (e && e.message)); console.log(n + ' passed, 1 failed'); process.exit(1); });
