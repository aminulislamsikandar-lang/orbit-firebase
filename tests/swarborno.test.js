// Swar-borno topic of the Bolo page (public/swarborno.js): the vowels with the teacher's recording, a picture and a word each.
// Data, files, wiring into bolo.js / index.html / sw.js, and (jsdom) the sync: the picture changes exactly when each vowel is said. Run: node tests/swarborno.test.js
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/^\uFEFF/, '');
let pass = 0, fail = 0;
const t = (n, ok, extra) => { if (ok) pass++; else { fail++; console.log('FAIL  ' + n + (extra ? '  ' + extra : '')); } };
const tick = (ms = 20) => new Promise(r => setTimeout(r, ms));

(async () => {
  global.window = undefined;
  require('../public/swarborno.js');
  const S = globalThis.SWAR; const D = S._data, LET = D.LET;
  // ---- data ----
  t('11 vowels in the book order', LET.map(l => l[0]).join(' ') === '\u0985 \u0986 \u0987 \u0988 \u0989 \u098A \u098B \u098F \u0990 \u0993 \u0994');
  t('every vowel has a word and a colour', LET.every(l => l[1] && /^#[0-9a-f]{6}$/i.test(l[2])));
  t('the vowel is the first letter of its word', LET.every(l => l[1][0] === l[0] || (l[0] === '\u098A' && l[1][0] === '\u0989')));   // the book writes the word of the long U with the short U sign
  const okTimes = LET.every((l, i) => l[3] < l[4] && l[4] - l[3] > 0.2 && l[4] - l[3] < 1.2 && l[4] <= D.DUR && (i === 0 || l[3] - LET[i - 1][4] > 1));
  t('start/end seconds are in order, inside the recording, with a pause of more than a second between vowels', okTimes);
  t('idxAt: nothing before the first vowel, then each vowel until the next one starts', D.idxAt(0) === -1 && D.idxAt(1.4) === 0 && D.idxAt(3.0) === 0 && D.idxAt(3.75) === 1 && D.idxAt(26.5) === 10 && D.idxAt(27.6) === 10);
  // ---- files ----
  const f = n => path.join(ROOT, 'public', 'swar', n);
  t('swar.mp3 exists and is an mp3', fs.existsSync(f('swar.mp3')) && ['ID3', '\xFF\xFB', '\xFF\xF3', '\xFF\xF2'].some(h => fs.readFileSync(f('swar.mp3')).slice(0, h.length).toString('latin1') === h));
  let imgs = true; for (let i = 1; i <= 11; i++) { const p = f('swar-' + String(i).padStart(2, '0') + '.webp'); if (!fs.existsSync(p)) { imgs = false; continue; } const b = fs.readFileSync(p); if (b.slice(0, 4).toString() !== 'RIFF' || b.slice(8, 12).toString() !== 'WEBP' || b.length < 5000 || b.length > 200000) imgs = false; }
  t('11 transparent pictures swar-01..11.webp exist and are real webp files', imgs);
  t('every picture is a webp with an alpha channel (VP8X/VP8L/ALPH)', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].every(i => { const b = fs.readFileSync(f('swar-' + String(i).padStart(2, '0') + '.webp')); const s = b.toString('latin1'); return /VP8X|VP8L|ALPH/.test(s.slice(0, 400)); }));
  t('audio and picture addresses', D.AUDIO.startsWith('/swar/swar.mp3') && D.pic(0).startsWith('/swar/swar-01.webp') && D.pic(10).startsWith('/swar/swar-11.webp'));
  // ---- wiring ----
  const bolo = read('public/bolo.js'), idx = read('public/index.html'), sw = read('public/sw.js');
  t('bolo.js: new chip, page and leave()', /\['swar', '[^']+', '#8e44ad'\]\];/.test(bolo) && bolo.includes("st.mode === 'swar') return g.SWAR ? g.SWAR.viewHTML() : ''") && bolo.includes('if (g.SWAR) g.SWAR.leave();'));
  t('bolo.js: all the old chips are still there', ["['alpha', 'A se Z'", "['table', 'Table'", "['poem', 'Poem'", "['byanjan'", "['saath'", "['asvyanjan'", "['abc', 'ABC Games'", "['abclv'", "['numg'", "['numlv'", "['numct', '123 Ginti'", "['suno', 'Suno Game'"].every(x => bolo.includes(x)));
  t('index.html: script loaded after sunogame.js, mounted with the other Bolo topics', idx.indexOf('<script src="/swarborno.js"></script>') > idx.indexOf('<script src="/sunogame.js"></script>') && idx.includes("if(window.SUNO)SUNO.mount($('#app'));if(window.SWAR)SWAR.mount($('#app'))}"));
  t('sw.js caches the script, the recording and all 11 pictures for offline use', ["'/swarborno.js'", "'/swar/swar.mp3'"].concat([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(i => "'/swar/swar-" + String(i).padStart(2, '0') + ".webp'")).every(x => sw.includes(x)));
  t('the module never writes HTML strings (no innerHTML)', !/innerHTML|outerHTML|insertAdjacentHTML/.test(read('public/swarborno.js').replace(/^\s*\/\/.*$/gm, '')));
  // ---- jsdom: the sync ----
  let JSDOM; try { ({ JSDOM } = require('jsdom')); } catch (e) { console.log('SKIP jsdom parts (jsdom is not installed)'); console.log(pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0); }
  const dom = new JSDOM('<!doctype html><body><div id="app"></div></body>', { runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window; const plays = [], pauses = [];
  class FakeAudio { constructor(src) { this.src = src; this.currentTime = 0; this.paused = true; this.ended = false; this.l = {}; w.__au = this; } addEventListener(e, fn) { this.l[e] = fn; } play() { this.paused = false; plays.push(this.currentTime); return Promise.resolve(); } pause() { this.paused = true; pauses.push(this.currentTime); } }
  w.Audio = FakeAudio; let frames = []; w.requestAnimationFrame = fn => { frames.push(fn); return frames.length; }; w.cancelAnimationFrame = () => {};
  w.eval(read('public/swarborno.js'));
  const run = () => { const fs2 = frames; frames = []; fs2.forEach(fn => fn()); };
  const app = w.document.getElementById('app'); app.innerHTML = w.SWAR.viewHTML(); w.SWAR.mount(app);
  const chips = () => [...app.querySelectorAll('.sw-chip')], stage = () => app.querySelector('.sw-stage');
  const click = el => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  t('page title is the Assamese name', /\u09B8\u09CD\u09AC\u09F0-\u09AC\u09F0\u09CD\u09A3/.test(app.parentNode.innerHTML) || /\u09B8\u09CD\u09AC\u09F0-\u09AC\u09F0\u09CD\u09A3/.test(w.SWAR.viewHTML()));
  t('11 coloured vowel buttons and the two big buttons', chips().length === 11 && app.querySelectorAll('.sw-btns .btn').length === 2 && chips()[7].style.background !== '');
  t('first: only a hint, no picture', !stage().querySelector('img') && /Play/.test(stage().textContent));
  click(chips()[1]);   // tap Aa: only that vowel plays
  t('tapping a vowel shows its big letter, picture and word', stage().querySelector('.sw-big').textContent === '\u0986' && /swar-02\.webp/.test(stage().querySelector('img').src) && stage().querySelector('.sw-word').textContent === '\u0986\u09AE');
  t('and plays from 0.15 s before it starts', Math.abs(plays[plays.length - 1] - 3.67) < 0.01);
  w.__au.currentTime = 4.7; run();
  t('and stops after the vowel (end + 0.25 s)', pauses.length === 1);
  const all = app.querySelectorAll('.sw-btns .btn')[0]; w.__au.currentTime = 0; click(all);
  t('Sab sunao starts from the beginning', plays[plays.length - 1] === 0);
  const seen = []; for (const sec of [0.5, 1.6, 3.0, 3.9, 6.8, 9.5, 12.3, 14.7, 17.2, 19.8, 22.0, 24.3, 26.3]) { w.__au.currentTime = sec; run(); const c = chips().findIndex(x => x.classList.contains('on')); seen.push(c); }
  t('the picture follows the voice: vowel by vowel exactly when it is said', seen.join(',') === '-1,0,0,1,2,3,4,5,6,7,8,9,10');
  t('the last picture is the ou-tenga one', /swar-11\.webp/.test(stage().querySelector('img').src) && stage().querySelector('.sw-word').textContent === '\u0994-\u099F\u09C7\u0999\u09BE');
  click(app.querySelectorAll('.sw-btns .btn')[1]); t('Roko pauses', w.__au.paused === true);
  w.SWAR.mount(app); t('a redraw of the Bolo page keeps the vowel that is shown', /swar-11\.webp/.test(stage().querySelector('img').src));
  w.SWAR.leave(); t('leave() stops the sound and forgets the screen', w.__au.paused === true);
  console.log(pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
})();
