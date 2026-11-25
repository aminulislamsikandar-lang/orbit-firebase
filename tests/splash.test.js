// Orbit start screen (the logo with a satellite going round, "Orbit khul raha hai..."): shown from the first paint, removed when the app
// knows the login state (busy.js endBoot -> ORBIT_SPLASH.done()), and always removed by a 12 s safety timer.
// The behaviour part runs the inline script of index.html in a tiny fake DOM (no jsdom needed). Run: node tests/splash.test.js
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
const t = (name, ok, extra) => { if (ok) pass++; else { fail++; console.log('FAIL  ' + name + (extra ? '  ' + extra : '')); } };
const html = fs.readFileSync(path.join(ROOT, 'public', 'index.html'), 'utf8');
const busy = fs.readFileSync(path.join(ROOT, 'public', 'busy.js'), 'utf8');
const sw = fs.readFileSync(path.join(ROOT, 'public', 'sw.js'), 'utf8');

const bi = html.indexOf('<body>');
const si = html.indexOf('id="splash"');
t('the start screen is the first thing inside <body>, before the app container', bi > 0 && si > bi && si < html.indexOf('id="app"') && html.slice(bi + 6, si).replace(/<!--[\s\S]*?-->/g, '').trim() === '<div');
t('it uses the app theme colours (light and dark), covers the whole screen and has the Orbit text', /#splash\{[^}]*position:fixed;inset:0;[^}]*background:var\(--bg\);color:var\(--tx\)/.test(html) && /Orbit khul raha hai<span class="sp-d">/.test(html));
t('the logo is the planet + tilted ring + ONE satellite dot (no tail)', /id="sp-sat"/.test(html) && !/class="sp-t"/.test(html) && /rotate\(-25 24 24\)/.test(html));
t('the satellite goes once round the ring in 1.5 seconds', /DUR=1\.5,/.test(html));
t('reduced-motion users get no animation', /prefers-reduced-motion:reduce\)\{\.sp-d\{animation:none/.test(html) && /prefers-reduced-motion: reduce/.test(html));
t('no outside resource: no src/href/url() inside the start screen', !/<div id="splash"[\s\S]*?<div id="scrim"/.exec(html)[0].match(/\bsrc=|\bhref=|url\(|@import/));
t('busy.js ends the start screen when the boot entry ends', /const endBoot = \(\) => \{ if \(bootEnd\) \{ bootEnd\(\); bootEnd = null; \} if \(g\.ORBIT_SPLASH\) g\.ORBIT_SPLASH\.done\(\);/.test(busy));
t('service worker cache moved up, so phones get the new index.html', /const SHELL = 'orbit-shell-v(8[3-9]|9\d|\d{3,})'/.test(sw));

// ---- run the inline script with a fake DOM
const block = /<div id="splash"[\s\S]*?<script>([\s\S]*?)<\/script>/.exec(html)[1];
function run(saved) {
  const attrs = {}, cls = new Set(); let removed = false; const root = { dataset: {} };
  const mk = () => ({ s: {}, setAttribute(k, v) { this[k] = v; }, getAttribute(k) { return this['data-' + k.replace('data-', '')] || this[k] || '0'; } });
  const sat = mk(), tails = [];
  const el = { parentNode: { removeChild() { removed = true; } }, classList: { add(c) { cls.add(c); } } };
  let now = 1000, timers = [], rafs = [];
  const win = { matchMedia: () => ({ matches: false }) };
  const ctx = { window: win, localStorage: { getItem: k => (k === 'orbit_settings_v1' ? saved : null) }, document: { documentElement: root, getElementById: id => id === 'splash' ? el : id === 'sp-sat' ? sat : null, querySelectorAll: () => tails },
    Date: { now: () => now }, Math, setTimeout: (f, ms) => { timers.push({ f, at: now + ms }); }, requestAnimationFrame: f => { rafs.push(f); return rafs.length; }, cancelAnimationFrame() {} };
  vm.createContext(ctx); vm.runInContext(block, ctx);
  const advance = ms => { now += ms; let again = true; while (again) { again = false; const due = timers.filter(x => x.at <= now); timers = timers.filter(x => x.at > now); due.forEach(x => { x.f(); again = true; }); const r = rafs.splice(0); r.forEach(f => f()); if (r.length && !again && rafs.length) again = false; } };
  return { win, cls, root, advance, get removed() { return removed; }, sat, tails };
}
let s = run();
t('auto theme (nothing saved): no data-theme is forced, the OS light/dark setting decides', s.root.dataset.theme === undefined);
t('Settings > Theme = dark is applied before the first paint of the start screen', run('{"theme":"dark"}').root.dataset.theme === 'dark');
t('Settings > Theme = light is applied before the first paint of the start screen', run('{"theme":"light"}').root.dataset.theme === 'light');
t('a broken saved setting does not stop the start screen', (() => { try { const r = run('{oops'); return r.root.dataset.theme === undefined && !!r.win.ORBIT_SPLASH; } catch (e) { return false; } })());
t('ORBIT_SPLASH.done exists after the script runs', s.win.ORBIT_SPLASH && typeof s.win.ORBIT_SPLASH.done === 'function');
t('the satellite sits on the ring at the start', Math.abs(+s.sat.cx - (24 + 20 * Math.cos(-0.35))) < 0.01 && Math.abs(+s.sat.cy - (24 + 9 * Math.sin(-0.35))) < 0.01);
s.advance(100); s.win.ORBIT_SPLASH.done(); s.advance(100);
t('done() before 0.9 s does not remove it yet (so the animation is not a flash)', !s.cls.has('sp-hide') && !s.removed);
s.advance(900);
t('after the minimum time it fades out', s.cls.has('sp-hide'));
s.advance(400);
t('and is then removed from the page', s.removed);
s = run(); s.advance(5000); s.win.ORBIT_SPLASH.done(); s.advance(50);
t('when the app was slow, done() hides it straight away (no extra wait)', s.cls.has('sp-hide'));
s = run(); s.advance(11000);
t('not hidden before the safety time when nobody calls done()', !s.cls.has('sp-hide'));
s.advance(2000);
t('the 12 s safety timer removes it even if the app never reports', s.cls.has('sp-hide'));

console.log(pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
