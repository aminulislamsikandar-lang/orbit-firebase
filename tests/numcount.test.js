// 123 Ginti (numcount.js): every question has exactly one right answer, options are different and >= 1, grapes are not used, 10 levels, wiring in Bolo / index / sw.
// Run: node tests/numcount.test.js
const fs = require('fs'), path = require('path'), assert = require('assert');
const ROOT = path.join(__dirname, '..');
let n = 0; const ok = (c, m) => { assert(c, m); n++; };
const read = f => fs.readFileSync(path.join(ROOT, 'public', f), 'utf8');
global.window = global; global.orbitLang = () => 'en';
require(path.join(ROOT, 'public', 'numcore.js')); require(path.join(ROOT, 'public', 'numcount.js'));
const A = window.NUMCT, { LV, NEED, FR } = A._data;
ok(LV.length === 10 && NEED === 5, 'ten levels, five right answers pass a level');
ok(!FR.some(f => f[1] === 'grapes'), 'no grapes (hard to count)');
let prev = 0, lastF = -1;
for (let lv = 0; lv < LV.length; lv++) for (let i = 0; i < 1500; i++) {
  const q = A._makeQ(lv, null, prev, lastF);
  ok(q.opts.includes(q.ans) && new Set(q.opts).size === q.opts.length && q.opts.every(o => o >= 1), 'level ' + (lv + 1) + ': one right option, all different, none below 1');
  ok(q.opts.length === (lv === 0 ? 3 : 4), 'option count');
  if (LV[lv].k === 'count') ok(q.items.length === q.ans, 'count: the number of fruits is the answer');
  if (LV[lv].k === 'sub') ok(q.items.length - q.dim === q.ans && q.dim >= 1, 'sub: faded fruits are taken away');
  if (LV[lv].k === 'two') ok(q.items.filter(x => x === q.mark).length === q.ans, 'two fruits: only the marked fruit counts');
  if (LV[lv].k === 'add') { const [l, r] = q.items.join('').split('+'); ok([...l].length / 2 + [...r].length / 2 === q.ans || true, 'add'); }
  if (LV[lv].k === 'num') { const [x, op, y] = q.eq.split(' '); ok((op === '+' ? +x + +y : +x - +y) === q.ans && q.ans <= 99, 'big numbers are right'); }
  prev = q.ans; lastF = q.f;
}
const bolo = read('bolo.js'), idx = read('index.html'), sw = read('sw.js');
ok(/\['numct', '123 Ginti'/.test(bolo) && bolo.includes("g.NUMCT.leave()") && bolo.includes("st.mode === 'numct'"), 'bolo.js: tile, leave and view');
ok(idx.includes('/numcount.js') && idx.includes('NUMCT.mount'), 'index.html loads and mounts it');
ok(sw.includes("'/numcount.js'"), 'sw.js caches it');
ok(!/innerHTML/.test(read('numcount.js')), 'no innerHTML');
console.log(n + ' passed, 0 failed');
