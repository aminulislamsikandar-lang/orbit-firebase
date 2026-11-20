// Menu and navigation in the real index.html (jsdom): every menu item is still there, grouped and collapsible; feature pages have a Home button;
// the phone Back button returns to the previous page instead of skipping it.
// Needs jsdom (CI installs it). Run: node tests/navigation-dom.test.js
let JSDOM; try { ({ JSDOM } = require('jsdom')); } catch (e) { console.log('SKIP jsdom is not installed'); process.exit(0); }
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/^\uFEFF/, '');
const html = read('public/index.html').replace(/<script\b[^>]*\bsrc=[^>]*><\/script>/g, '');
const QDATA = JSON.parse(JSON.stringify(require('../questions-public')));
let pass = 0, fail = 0;
const t = (n, ok, extra) => { if (ok) pass++; else { fail++; console.log('FAIL  ' + n + (extra ? '  ' + extra : '')); } };
const tick = (ms = 30) => new Promise(r => setTimeout(r, ms));

async function boot() {
  const dom = new JSDOM(html, {
    runScripts: 'dangerously', url: 'https://orbittutorial.web.app/', pretendToBeVisual: true,
    beforeParse(w) {
      w.eval(read('public/catalog.js'));
      w.matchMedia = w.matchMedia || (() => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
      w.scrollTo = () => {};
      w.fetch = async url => /questions\.json$/.test(url) ? { ok: true, json: async () => QDATA } : { ok: false, json: async () => ({}) };
      w.CLOUD = { token: async () => 't', push: async () => {}, login: async () => {}, logout: async () => {},
        course: { get: async () => ({ org: 'seba', cls: 10, med: 'Assamese' }), set: async () => {} } };
    }
  });
  const w = dom.window;
  await tick(60);
  w.onCloudUser({ uid: 'u1', name: 'Test', email: 't@example.com', photo: '' });
  await tick(80);
  const click = sel => { const b = w.document.querySelector(sel); if (!b) throw new Error('no button ' + sel); b.dispatchEvent(new w.MouseEvent('click', { bubbles: true })); };
  return { w, click, view: () => w.eval('VIEW'), side: () => w.document.querySelector('#side'), app: () => w.document.querySelector('#app') };
}

(async () => {
  const s = await boot();
  const side = () => s.side();
  const items = () => [...side().querySelectorAll('.sitem')].map(b => b.dataset.v);

  // 1. Nothing was removed from the menu.
  const need = ['home', 'fav', 'pins', 'getvideo', 'pubvideo', 'vlab', 'models3d', 'recall', 'bolo', 'read', 'talk', 'ai', 'class', 'report', 'study', 'pyq', 'pass', 'topper', 'faculty', 'dev', 'settings', 'login'];
  t('every menu item is still in the menu', need.every(v => items().includes(v)), 'missing: ' + need.filter(v => !items().includes(v)).join(','));
  t('ABC Games moved out of the menu (it is a topic on the Bolo page now)', !items().includes('abc'));
  t('menu has no duplicate items', new Set(items()).size === items().length);

  // 2. Grouped, with the rarely used group closed.
  const grp = k => side().querySelector('.sgrp[data-g=' + k + ']');
  const body = k => grp(k).nextElementSibling;
  t('four menu groups exist', ['learn', 'practice', 'me', 'more'].every(k => grp(k)));
  t('Seekho, Practice and Meri progress start open', ['learn', 'practice', 'me'].every(k => grp(k).getAttribute('aria-expanded') === 'true' && !body(k).hidden));
  t('"Aur" (coming soon, Faculty, Developer) starts closed', grp('more').getAttribute('aria-expanded') === 'false' && body('more').hidden);
  t('Home, Favourite and Pinned stay at the top, outside the groups', !!side().querySelector('.sitem[data-v=home]') && side().querySelector('.sitem[data-v=home]').parentElement === side());

  // 3. Collapse / open is remembered.
  s.click('.sgrp[data-g=learn]');
  t('tapping a group header closes it', grp('learn').getAttribute('aria-expanded') === 'false' && body('learn').hidden);
  t('the choice is saved on the device', /"learn":false/.test(s.w.localStorage.getItem('orbit_side_groups') || ''));
  s.click('.sgrp[data-g=learn]');
  t('tapping again opens it', grp('learn').getAttribute('aria-expanded') === 'true' && !body('learn').hidden);

  // 4. The group that holds the page you are on is always open.
  s.click('.sitem[data-v=faculty]'); await tick();
  t('opening Faculty works', s.view() === 'faculty');
  t('its group ("Aur") is open while you are on that page', grp('more').getAttribute('aria-expanded') === 'true' && !body('more').hidden);
  t('the current page is marked in the menu', side().querySelector('[aria-current=page]').dataset.v === 'faculty');

  // 5. Feature pages have a visible Home button; chapter pages keep their own Back.
  t('feature page shows a Home button', !!s.app().querySelector('button.back[data-act=nav][data-v=home]'));
  s.click('#app button.back[data-act=nav][data-v=home]'); await tick();
  t('the Home button goes home', s.view() === 'home');
  t('the Home page itself has no extra Home button', !s.app().querySelector('button.back[data-act=nav][data-v=home]'));

  // 6. Phone Back button goes to the page you were on, not two pages back.
  s.w.eval("go('fav')"); await tick();
  t('Favourite page is in the browser history', s.w.history.state && s.w.history.state.view === 'fav');
  s.w.eval("go('report')"); await tick();
  t('now on Weekly Report', s.view() === 'report');
  s.w.history.back(); await tick(80);
  t('Back from Weekly Report returns to Favourite', s.view() === 'fav', 'view=' + s.view());
  s.w.history.back(); await tick(80);
  t('Back again returns to the Home page', s.view() === 'home', 'view=' + s.view());
  s.w.eval("go('fav')"); s.w.eval("go('fav')"); await tick();
  t('opening the same page twice does not add a second history step', s.w.history.length >= 1 && (() => { s.w.history.back(); return true; })());
  await tick(80);
  t('one Back from a repeated page goes home', s.view() === 'home', 'view=' + s.view());

  s.w.close();
  console.log(pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('FAIL  crashed: ' + e.stack); process.exit(1); });
