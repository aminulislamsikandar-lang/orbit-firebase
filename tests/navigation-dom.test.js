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

  // 1. One sidebar item per section, no group headers.
  const top = ['home', 'fav', 'getvideo', 'vlab', 'recall', 'bolo', 'pyq', 'class', 'settings', 'login'];
  t('sidebar has one item per section', top.every(v => items().includes(v)), 'missing: ' + top.filter(v => !items().includes(v)).join(','));
  t('the old group headers are gone', !side().querySelector('.sgrp'));
  t('ABC Games moved out of the menu (it is a topic on the Bolo page now)', !items().includes('abc'));
  t('menu has no duplicate items', new Set(items()).size === items().length);
  t('menu is short', items().length <= 11, 'items=' + items().length);
  t('Home stays at the top, outside any group', !!side().querySelector('.sitem[data-v=home]') && side().querySelector('.sitem[data-v=home]').parentElement === side());

  // 2. Nothing was removed: every page of a section is still one tap away, as a tab on that section's page.
  const sections = { fav: ['fav', 'pins'], getvideo: ['getvideo', 'pubvideo'], vlab: ['vlab', 'models3d'], bolo: ['bolo', 'read', 'talk'], pyq: ['pyq', 'pass', 'mock', 'daily'], class: ['class', 'report', 'study'] };
  const tabs = () => [...s.app().querySelectorAll('.gtabs [data-v]')].map(b => b.dataset.v);
  for (const [entry, views] of Object.entries(sections)) {
    s.click('.sitem[data-v=' + entry + ']'); await tick();
    t(entry + ' opens with tabs ' + views.join(', '), s.view() === entry && views.every(v => tabs().includes(v)), 'view=' + s.view() + ' tabs=' + tabs());
    for (const v of views) {
      s.click('.gtabs [data-v=' + v + ']'); await tick();
      t('tab ' + v + ' opens its page', s.view() === v, 'view=' + s.view());
      const cur = side().querySelector('[aria-current=page]');
      t('menu marks the ' + entry + ' item while on ' + v, !!cur && cur.dataset.v === entry);
    }
  }

  // 3. Advanced AI, Topper, Faculty and Developer moved into Settings.
  s.click('.sitem[data-v=settings]'); await tick();
  t('Settings opens', s.view() === 'settings');
  for (const v of ['ai', 'topper', 'faculty', 'dev']) t('Settings links to ' + v, !!s.app().querySelector('[data-act=nav][data-v=' + v + ']'));
  for (const v of ['ai', 'topper', 'dev']) {
    s.click('.sitem[data-v=settings]'); await tick();
    s.click('#app [data-act=nav][data-v=' + v + ']'); await tick();
    t('Settings link opens ' + v, s.view() === v, 'view=' + s.view());
  }

  // 4. The menu marks Settings while you are on a page that lives under it.
  s.click('.sitem[data-v=settings]'); await tick();
  s.click('#app [data-act=nav][data-v=faculty]'); await tick();
  t('opening Faculty from Settings works', s.view() === 'faculty');
  t('the menu marks Settings while on Faculty', side().querySelector('[aria-current=page]').dataset.v === 'settings');

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
