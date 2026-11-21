// Course lock in the real index.html (jsdom): first login shows only the course picker; after "Pakka karo" the app has only that course.
// Needs jsdom (CI installs it). Run: node tests/course-lock-dom.test.js
let JSDOM; try { ({ JSDOM } = require('jsdom')); } catch (e) { console.log('SKIP jsdom is not installed'); process.exit(0); }
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/^\uFEFF/, '');
const html = read('public/index.html').replace(/<script\b[^>]*\bsrc=[^>]*><\/script>/g, '');   // only the inline app script; modules are not needed here
const QDATA = JSON.parse(JSON.stringify(require('../questions-public')));
let pass = 0, fail = 0;
const t = (n, ok, extra) => { if (ok) pass++; else { fail++; console.log('FAIL  ' + n + (extra ? '  ' + extra : '')); } };
const tick = (ms = 30) => new Promise(r => setTimeout(r, ms));

async function boot({ stored, cache, getFails, hash = '', uid = 'u1' }) {
  const box = { stored: stored || null, setCalls: 0, clearCalls: 0 };
  const dom = new JSDOM(html, {
    runScripts: 'dangerously', url: 'https://orbittutorial.web.app/' + hash, pretendToBeVisual: true,
    beforeParse(w) {
      w.eval(read('public/catalog.js'));
      w.matchMedia = w.matchMedia || (() => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
      w.scrollTo = () => {};
      w.fetch = async url => /questions\.json$/.test(url) ? { ok: true, json: async () => QDATA } : { ok: false, json: async () => ({}) };
      if (cache) w.localStorage.setItem('orbit_course_v1_' + uid, JSON.stringify(cache));
      w.CLOUD = { token: async () => 't', push: async () => {}, login: async () => {}, logout: async () => {},
        course: { get: async () => { if (getFails) throw new Error('offline'); return box.stored; }, set: async c => { box.setCalls++; if (box.stored) { const e = new Error('denied'); e.code = 'permission-denied'; throw e; } box.stored = c.own ? { own: true } : { org: c.org, cls: +c.cls, med: c.med }; }, clear: async () => { box.clearCalls++; box.stored = null; } } };
    }
  });
  const w = dom.window;
  await tick(60);
  w.onCloudUser({ uid, name: 'Test', email: 't@example.com', photo: '' });
  await tick(80);
  const click = sel => { const b = w.document.querySelector(sel); if (!b) throw new Error('no button ' + sel); b.dispatchEvent(new w.MouseEvent('click', { bubbles: true })); };
  const app = () => w.document.querySelector('#app').textContent;
  return { w, box, click, app, ids: () => w.eval('DATA.courses.map(c=>c.id)') };
}

(async () => {
  // 1. First login: only the picker. No school list, no subjects, no menu.
  let s = await boot({});
  t('first login shows the course picker', /Apna course chuno/.test(s.app()));
  t('picker shows the four tiles but no subjects yet', /SCHOOL/i.test(s.app()) && /CUSTOM/i.test(s.app()) && /BOARD/i.test(s.app()) && /KID/i.test(s.app()) && !/Mathematics/.test(s.app()) && !/SEBA/.test(s.app()));
  s.click('[data-act=cstep][data-v=school]');
  t('School tile lists the schools', /Nashib Ali Academy/.test(s.app()) && /Halimon Nessa Academy/.test(s.app()) && !/SEBA/.test(s.app()));
  s.click('[data-act=cstep][data-v=""]');
  s.click('[data-act=cstep][data-v=board]');
  t('Board tile lists the boards', /SEBA/.test(s.app()) && /CBSE/.test(s.app()) && !/Nashib/.test(s.app()));
  t('the menu bar is hidden on the picker', /display:none/.test(s.w.document.querySelector('.top').outerHTML));
  s.click('[data-act=csorg][data-v=seba]');
  t('after choosing SEBA, only its classes are offered', /Class 10/.test(s.app()) && !/Class 6\b/.test(s.app()));
  s.click('[data-act=cscls][data-v="10"]');
  s.click('[data-act=csmed][data-v=Assamese]');
  t('"Pakka karo" appears with the subject count', /Pakka karo/.test(s.app()) && /3 subjects/.test(s.app()));
  s.click('[data-act=cssave]'); await tick(80);
  t('the course is saved once, to the account', s.box.setCalls === 1 && JSON.stringify(s.box.stored) === '{"org":"seba","cls":10,"med":"Assamese"}');
  t('the app now shows the course title', /SEBA · Class 10 · Assamese medium/.test(s.app()));
  t('only that class and medium subjects are shown', /Mathematics/.test(s.app()) && /Social Science/.test(s.app()) && /General Science/.test(s.app()) && !/Nashib/.test(s.app()) && !/English Grammar/.test(s.app()));
  t('every screen reads a DATA that has only the locked courses', JSON.stringify(s.ids().sort()) === JSON.stringify(['c10-maths', 'c10-science-as', 'c10-social']));
  t('no school / class / medium chips on the home screen', !/data-act="org"/.test(s.w.document.querySelector('#app').innerHTML) && !/data-act="pcls"/.test(s.w.document.querySelector('#app').innerHTML));
  t('"My Courses" (custom) is gone from the menu', !/My Courses/.test(s.w.document.querySelector('#side').textContent));
  t('the saved course is remembered on this device', /"seba"/.test(s.w.localStorage.getItem('orbit_course_v1_u1') || ''));
  s.w.close();

  // 2. Second visit: the saved course opens straight to the subjects.
  s = await boot({ stored: { org: 'seba', cls: 10, med: 'Assamese' } });
  t('returning student goes straight to their subjects', /SEBA · Class 10 · Assamese medium/.test(s.app()) && !/Apna course chuno/.test(s.app()));
  s.w.close();

  // 3. Offline: the copy remembered on this device works when Firestore can not be read.
  s = await boot({ cache: { org: 'seba', cls: 10, med: 'English' }, getFails: true });
  t('offline: the remembered course still opens', /SEBA · Class 10 · English medium/.test(s.app()) && JSON.stringify(s.ids()) === '["c10-science"]');
  s.w.close();
  // The cloud copy wins: if Firestore has no course (for example the admin reset it), the picker returns.
  s = await boot({ cache: { org: 'seba', cls: 10, med: 'English' } });
  t('cloud copy wins: no course in Firestore -> picker', /Apna course chuno/.test(s.app()));
  s.w.close();
  s = await boot({ stored: { org: 'nashib', cls: 6, med: 'English' } });
  t('Nashib Ali class 6 English shows its 8 subjects only', s.ids().length === 8 && s.ids().every(id => id.startsWith('c6-')));
  s.w.close();

  // 4. A saved course can not be changed by the student (server/rules refuse); the app shows a clear message.
  s = await boot({ stored: null });
  s.click('[data-act=cstep][data-v=school]'); s.click('[data-act=csorg][data-v=halimon]'); s.click('[data-act=cscls][data-v="8"]'); s.click('[data-act=csmed][data-v=Assamese]');
  s.box.stored = { org: 'seba', cls: 10, med: 'Assamese' };   // someone already saved a course for this account
  s.click('[data-act=cssave]'); await tick(80);
  t('a refused save shows a message and keeps the picker', /pehle se chuna hua/.test(s.app()) && !!s.w.document.querySelector('[data-act=csorg]') && !s.w.document.querySelector('.top .back'));
  s.w.close();

  // 5. A class/medium with no content yet can not be locked.
  s = await boot({});
  s.click('[data-act=cstep][data-v=board]'); s.click('[data-act=csorg][data-v=cbse]'); s.click('[data-act=cscls][data-v="10"]'); s.click('[data-act=csmed][data-v=English]');
  t('empty course: "Coming soon" and no Pakka karo button', /Coming soon/.test(s.app()) && !/Pakka karo/.test(s.app()));
  s.w.close();

  // 6. "My school or college is not in the list" -> own courses (school, college, master's)
  s = await boot({});
  t('the picker offers "my school or college is not in the list"', !!s.w.document.querySelector('[data-act=csown]') && /CUSTOM/i.test(s.app()));
  s.click('[data-act=csown]');
  t('own option explains Add course and shows Pakka karo', /Add course/.test(s.app()) && /Master's/.test(s.app()) && /Pakka karo/.test(s.app()) && !/Class\b.*Medium/.test(s.app()));
  s.click('[data-act=cssave]'); await tick(80);
  t('own choice is NOT locked yet: nothing saved before a course exists', s.box.stored === null && s.box.setCalls === 0, JSON.stringify(s.box.stored));
  t('own choice: no textbook subjects, only "Mere courses"', /Mere courses/.test(s.app()) && s.ids().length === 0 && !/Mathematics/.test(s.app()));
  t('own choice keeps "My Courses" in the menu', /My Courses/.test(s.w.document.querySelector('#side').textContent));
  // no course yet: a back button returns to the chooser (needs the custom-course module, so it is faked here)
  s.w.CUSTOM = { count: () => 0, ready: () => true, homeHTML: () => '', apply() {}, start() {}, stop() {}, hooks: {} };
  s.w.eval('draw()');
  t('no course yet: "Course chuno / badlo" button is shown', /Course chuno \/ badlo/.test(s.app()));
  s.click('[data-act=csback]'); await tick(80);
  t('back button returns to the course picker, nothing saved', /Apna course chuno/.test(s.app()) && s.box.stored === null && s.box.clearCalls === 0);
  s.click('[data-act=csown]'); s.click('[data-act=cssave]'); await tick(80);
  // the first custom course (or saved shared course) saves the lock
  await s.w.eval('ensureOwnLock()');
  t('first custom course saves the lock { own: true }', JSON.stringify(s.box.stored) === '{"own":true}', JSON.stringify(s.box.stored));
  await s.w.eval('ensureOwnLock()');
  t('ensureOwnLock saves only once', s.box.setCalls === 1, String(s.box.setCalls));
  s.w.close();
  // a course exists: no back button; the lock stays
  s = await boot({ stored: { own: true } });
  s.w.CUSTOM = { count: () => 1, ready: () => true, homeHTML: () => '', apply() {}, start() {}, stop() {}, hooks: {} };
  s.w.eval('draw()');
  t('a course exists: no back button', !/Course chuno \/ badlo/.test(s.app()));
  s.w.close();
  // stuck account: lock saved earlier but no course made -> back button removes the lock
  s = await boot({ stored: { own: true } });
  s.w.CUSTOM = { count: () => 0, ready: () => true, homeHTML: () => '', apply() {}, start() {}, stop() {}, hooks: {} };
  s.w.eval('draw()');
  s.click('[data-act=csback]'); await tick(80);
  t('saved lock without any course: back button deletes it and shows the picker', /Apna course chuno/.test(s.app()) && s.box.stored === null && s.box.clearCalls === 1);
  s.w.close();
  s = await boot({ stored: { own: true } });
  t('own lock: returning student goes straight to Mere courses', /Mere courses/.test(s.app()) && !/Apna course chuno/.test(s.app()));
  s.w.eval("CATALOG.classes['u-x']=[13,17]");
  t('college and master years have readable labels in the app', s.w.eval("clsLabel(13)+'|'+clsLabel(17)+'|'+clsLabel(10)") === "College Year 1|Master's Year 1|Class 10");
  s.w.close();

  // 6b. Course badlo: a student can delete their textbook course lock; it stays locked until they do
  s = await boot({ stored: { org: 'seba', cls: 10, med: 'English' } });
  t('locked student sees the Course badlo button', !!s.w.document.querySelector('[data-act=csback]') && /Course badlo/.test(s.app()));
  s.w.confirm = () => false; s.click('[data-act=csback]'); await tick(80);
  t('Course badlo cancelled: the lock stays', JSON.stringify(s.box.stored) === '{"org":"seba","cls":10,"med":"English"}' && s.box.clearCalls === 0 && !/Apna course chuno/.test(s.app()));
  s.w.confirm = () => true; s.click('[data-act=csback]'); await tick(80);
  t('Course badlo confirmed: lock deleted and the picker is back', s.box.stored === null && s.box.clearCalls === 1 && /Apna course chuno/.test(s.app()));
  s.w.close();

  // 7. A parent (father's phone) can open "Padhai ka time" without choosing a course; every other view still needs one.
  s = await boot({});
  t('the course screen no longer shows the parent door', !/data-act="csparent"/.test(s.app()));
  s.click('[data-act=kidmode]'); await tick(40);
  t('the Kid mode screen has a door for parents', /I am mentor/.test(s.app()));
  s.click('[data-act=csparent]'); await tick(40);
  t('parent door opens the Padhai ka time view, not the course picker', s.w.eval('VIEW') === 'study' && !/Apna course chuno/.test(s.app()));
  s.w.eval("go('home')"); await tick(40);
  t('any other view is the course picker again', /Apna course chuno/.test(s.app()));
  s.w.close();

  // 8. Tapping the parent's alert (…/#study) opens Padhai ka time straight away, even with no course chosen.
  s = await boot({ hash: '#study' });
  s.w.eval("go('study')"); await tick(40);
  t('alert link #study: study view opens without the course picker', s.w.eval('VIEW') === 'study' && !/Apna course chuno/.test(s.app()));
  s.w.close();

  console.log(pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('FAIL  crashed: ' + e.stack); process.exit(1); });
