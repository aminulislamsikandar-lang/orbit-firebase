// The 3-dot menu video item shows the title the admin typed (not a bare "Video"), and a student sees that title + a loading line once the video is tapped.
const fs = require('fs'), path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8').replace(/\r\n/g, '\n');
let pass = 0, fail = 0;
const t = (n, ok) => { if (ok) pass++; else { fail++; console.log('FAIL  ' + n); } };
const menu = (src.match(/^const qvMenuVideos=.*$/m) || [''])[0];
t('menu item uses the video title, with "Video" only as the fallback', /v\.title/.test(menu) && /'Video'/.test(menu) && !/<span>Video\$\{/.test(menu));
t('menu title is escaped and cut to 60 characters', /esc\(String\(v\.title/.test(menu) && /slice\(0,60\)/.test(menu));
t('student view (not admin) shows title and "load ho raha hai" while loading', /const hd=!adm&&\(s\.loading\|\|s\.url\|\|s\.err\)/.test(src) && /video load ho raha hai/.test(src));
const f = new Function('esc', 'VIDEOS', 'lowData', 'I', 'qVids', menu + '\nreturn qvMenuVideos;');
const m = f(s => String(s).replace(/</g, '&lt;'), [], () => false, { vid: '' }, () => [{ id: 'a', title: 'Discuss Q3 <b>' }, { id: 'b', title: '' }]);
const out = m('x');
t('rendered: first button shows the title (escaped), blank title falls back to "Video (2)"', out.includes('<span>Discuss Q3 &lt;b></span>') && out.includes('<span>Video (2)</span>'));
// one video at a time
t('openVideo closes the other videos before opening a new one (but not when the same video is tapped to close)', /function closeOtherVideos\(keep\)/.test(src) && /if\(!\(VID\[id\]&&VID\[id\]\.url\)\)closeOtherVideos\(id\)/.test(src));
const fn = (src.match(/function closeOtherVideos[\s\S]*?\n}\n/) || [''])[0];
let closedPV = 0, mpClosed = 0, paused = 0;
const run = new Function('VID', 'closePV', 'document', 'window', fn + '\nreturn closeOtherVideos;')(
  { a: { url: 'u1' }, b: { url: 'u2' }, c: { err: 'x' } }, () => { closedPV++; }, { querySelectorAll: () => [{ pause() { paused++; } }, { pause() { paused++; } }] }, { MathVideoPlayer: { close() { mpClosed++; } } });
const VIDS = { a: { url: 'u1' }, b: { url: 'u2' } };
const run2 = new Function('VID', 'closePV', 'document', 'window', fn + '\nreturn closeOtherVideos;')(VIDS, () => { closedPV++; }, { querySelectorAll: () => [{ pause() { paused++; } }] }, { MathVideoPlayer: { close() { mpClosed++; } } });
run2('b');
t('closing others: keeps the one being opened, drops the other url, pauses players, closes overlay and math player', VIDS.b.url === 'u2' && !VIDS.a.url && closedPV === 1 && mpClosed === 1 && paused === 1);
console.log(pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
