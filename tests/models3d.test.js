// 3D Models: every model draws without errors in every language and many angles, labels exist, the circuit lights up only when closed.
const fs = require('fs'), path = require('path'), assert = require('assert');
const ROOT = path.join(__dirname, '..');
global.window = global; let lng = 'en'; global.orbitLang = () => lng;
require(path.join(ROOT, 'public', 'models3d.js'));
let n = 0; const ok = (c, m) => { assert(c, m); n++; };
const calls = {}; const ctx = new Proxy({}, { get: (_, k) => k === 'createRadialGradient' ? () => ({ addColorStop() {} }) : (...a) => { calls[k] = (calls[k] || 0) + 1; }, set: () => true });
const V = { yaw: 0, pitch: .3, cx: 200, cy: 200, S: 148, W: 400 };
for (const l of ['hing', 'en', 'as', 'bn']) { lng = l;
  for (const tab of ['cell', 'solar', 'circuit']) for (const sw of [true, false]) {
    for (const yaw of [0, 1.3, 3, 5]) { const sc = window.M3D._render(ctx, tab, { ...V, yaw }, { labels: true, sw, t: 3 + yaw }, '#111'); ok(sc.items.length > 5, tab + ' draws parts'); ok(sc.labels.every(x => x.t && isFinite(x.x) && isFinite(x.y)), tab + ' labels ok (' + l + ')'); }
  } }
lng = 'en';
const lab = (tab, sw) => window.M3D._scene(tab, V, { labels: true, sw, t: 0 }).labels.map(x => x.t);
ok(lab('cell').includes('Nucleus') && lab('cell').includes('Mitochondria'), 'cell labels');
ok(lab('solar').includes('Earth') && lab('solar').includes('Neptune') && lab('solar').includes('Sun'), 'solar labels: 8 planets + sun');
ok(lab('solar').length === 9, 'solar has 9 labels');
ok(lab('circuit', true).includes('Current') && !lab('circuit', false).includes('Current'), 'current label only when closed');
const cnt = (tab, sw) => window.M3D._scene(tab, V, { labels: false, sw, t: 0 }).items.length;
ok(cnt('circuit', true) > cnt('circuit', false), 'moving current dots only when closed');
ok(window.M3D._scene('cell', V, { labels: false, t: 0 }).labels.length === 0, 'Names off hides labels');
const src = fs.readFileSync(path.join(ROOT, 'public', 'models3d.js'), 'utf8');
ok(!/\.(innerHTML|outerHTML)\s*\+?=/.test(src), 'no innerHTML sinks');
ok(!/https?:\/\//.test(src), 'no external URLs');
const idx = fs.readFileSync(path.join(ROOT, 'public', 'index.html'), 'utf8');
for (const k of ['/models3d.js', "VIEW==='models3d'", 'M3D.mount', "item('models3d'", 'M3D.leave']) ok(idx.includes(k), k);
ok(fs.readFileSync(path.join(ROOT, 'public', 'sw.js'), 'utf8').includes('/models3d.js'), 'cached for offline');
ok(src.length < 30000, 'stays small (' + src.length + ' bytes)');
console.log(n + ' passed, 0 failed');
