// Virtual Lab: indicator colours match textbook ranges, and the page is wired into the app.
const fs = require('fs'), path = require('path'), assert = require('assert');
const ROOT = path.join(__dirname, '..');
global.window = global;
require(path.join(ROOT, 'public', 'vlab.js'));
let n = 0; const eq = (a, b, m) => { assert.strictEqual(a, b, m); n++; };
const col = (id, ph) => window.VLAB._ind(id, ph)[1].en;
eq(col('litmus', 3), 'Red'); eq(col('litmus', 7), 'Purple'); eq(col('litmus', 11), 'Blue');
eq(col('phenol', 3), 'Colourless'); eq(col('phenol', 8.0), 'Colourless'); eq(col('phenol', 8.3), 'Pink'); eq(col('phenol', 13), 'Pink');
eq(col('methyl', 2), 'Red'); eq(col('methyl', 4), 'Orange'); eq(col('methyl', 7), 'Yellow');
eq(col('uni', 1), 'Red'); eq(col('uni', 7), 'Green'); eq(col('uni', 13), 'Violet');
eq(window.VLAB._kind(2), 'acid'); eq(window.VLAB._kind(7), 'neu'); eq(window.VLAB._kind(12), 'base');
const html = window.VLAB.viewHTML();
assert(html.includes('vl-len') && html.includes('vl-ph')); n += 1;
const idx = fs.readFileSync(path.join(ROOT, 'public', 'index.html'), 'utf8');
for (const k of ['/vlab.js', "VIEW==='vlab'", 'VLAB.mount', "item('vlab'"]) { assert(idx.includes(k), k); n++; }
assert(fs.readFileSync(path.join(ROOT, 'public', 'sw.js'), 'utf8').includes('/vlab.js')); n++;
console.log(n + ' passed, 0 failed');
