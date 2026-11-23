// Kid mode in the real index.html (jsdom): the child's phone sees only Bolo, the parent's phone connects with a code, sees the child's day and sets the limit.
// Two windows (a child's phone and a parent's phone) share one in-memory Firestore. Needs jsdom (CI installs it). Run: node tests/kid-mode-dom.test.js
let JSDOM; try { ({ JSDOM } = require('jsdom')); } catch (e) { console.log('SKIP jsdom is not installed'); process.exit(0); }
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/^\uFEFF/, '');
const html = read('public/index.html').replace(/<script\b[^>]*\bsrc=[^>]*><\/script>/g, '');
const QDATA = JSON.parse(JSON.stringify(require('../questions-public')));
let pass = 0, fail = 0;
const t = (n, ok, extra) => { if (ok) pass++; else { fail++; console.log('FAIL  ' + n + (extra ? '  ' + extra : '')); } };
const tick = (ms = 40) => new Promise(r => setTimeout(r, ms));

const newDb = () => ({ course: {}, links: {}, parents: {}, sums: {}, sets: {}, kids: {}, n: 0 });
function cloudFor(db, uid) {
  const denied = () => { const e = new Error('denied'); e.code = 'permission-denied'; return e; };
  return {
    token: async () => 't', push: async () => {}, login: async () => {}, logout: async () => {},
    course: {
      get: async () => db.course[uid] || null,
      set: async c => { if (db.course[uid]) throw denied(); db.course[uid] = c.kid ? { kid: true } : c.own ? { own: true } : { org: c.org, cls: +c.cls, med: c.med }; },
      clear: async () => { delete db.course[uid]; }
    },
    kids: {
      create: async name => { const code = 'KMN' + (23456 + ++db.n); db.links[code] = { code, kidUid: uid, name, createdAt: Date.now() }; db.parents[code] = {}; return db.links[code]; },
      own: async () => Object.values(db.links).find(l => l.kidUid === uid) || null,
      link: async code => db.links[code] || null,
      parents: async code => Object.values(db.parents[code] || {}),
      remove: async code => { delete db.links[code]; delete db.parents[code]; delete db.sums[code]; delete db.sets[code]; },
      putSum: async (code, sum) => { if (!db.links[code] || db.links[code].kidUid !== uid) throw denied(); db.sums[code] = sum; },
      getSum: async code => db.sums[code] || null,
      getSet: async code => db.sets[code] || null,
      putSet: async (code, set) => { if (!db.parents[code] || !db.parents[code][uid]) throw denied(); db.sets[code] = set; },
      join: async (code, name) => { if (!db.links[code]) throw denied(); db.parents[code][uid] = { uid, name }; (db.kids[uid] = db.kids[uid] || []).push(code); },
      myKids: async () => db.kids[uid] || [],
      leave: async code => { delete (db.parents[code] || {})[uid]; db.kids[uid] = (db.kids[uid] || []).filter(c => c !== code); },
      forget: async code => { db.kids[uid] = (db.kids[uid] || []).filter(c => c !== code); }
    }
  };
}

async function boot(db, uid, { role } = {}) {
  const dom = new JSDOM(html, {
    runScripts: 'dangerously', url: 'https://orbittutorial.web.app/', pretendToBeVisual: true,
    beforeParse(w) {
      w.eval(read('public/catalog.js'));
      w.matchMedia = w.matchMedia || (() => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
      w.scrollTo = () => {}; w.confirm = () => true;
      w.fetch = async url => /questions\.json$/.test(url) ? { ok: true, json: async () => QDATA } : { ok: false, json: async () => ({}) };
      if (role) w.localStorage.setItem('orbit_kidrole_v1_' + uid, role);
      w.CLOUD = cloudFor(db, uid);
      for (const f of ['bolo-core.js', 'byanjan-video.js', 'bolo.js', 'kidlink.js']) w.eval(read('public/' + f));
    }
  });
  const w = dom.window;
  await tick(60);
  w.onCloudUser({ uid, name: 'Rahul Das', email: 't@example.com', photo: '' });
  await tick(100);
  const click = sel => { const b = w.document.querySelector(sel); if (!b) throw new Error('no button ' + sel); b.dispatchEvent(new w.MouseEvent('click', { bubbles: true })); };
  const app = () => w.document.querySelector('#app').textContent;
  return { w, click, app, d: w.document };
}

(async () => {
  const db = newDb();

  // 1. The course screen offers Kid mode; the phone says who it is.
  let kid = await boot(db, 'kid1');
  t('course screen has a Kid mode button', !!kid.d.querySelector('[data-act=kidmode]'));
  kid.click('[data-act=kidmode]');
  t('Kid mode asks who is on this phone', /Main bachcha hoon/.test(kid.app()) && /I am parent/.test(kid.app()) && !/Apna course chuno/.test(kid.app()));
  const roleBtns = kid.d.querySelectorAll('.btn[data-act=kidrole]');
  t('role screen: three big buttons (kid, parent, mentor) and no small mentor pill', roleBtns.length === 3 && /I am mentor/.test(kid.app()) && !kid.d.querySelector('[data-act=csparent]') && !kid.d.querySelector('.chip[data-act=kidrole]'));
  kid.click('[data-act=kidrole][data-v=parent]');
  t('"I am parent" shows "Parent of" with Kid and Not Kid', /Parent of/.test(kid.app()) && kid.d.querySelectorAll('[data-act=kidof]').length === 2 && /Not Kid/.test(kid.app()));
  kid.click('[data-act=kidback]');
  t('Wapas from "Parent of" goes back to the role screen', /Main bachcha hoon/.test(kid.app()));
  kid.click('[data-act=kidrole][data-v=mentor]');
  t('"I am mentor" shows "Mentor of" with Kid and Not Kid', /Mentor of/.test(kid.app()) && kid.d.querySelectorAll('[data-act=kidof]').length === 2);
  kid.click('[data-act=kidback]');
  t('Wapas from "Mentor of" goes back to the role screen', /Main bachcha hoon/.test(kid.app()));
  kid.click('[data-act=kidback]');
  t('Wapas returns to the course screen', /Apna course chuno/.test(kid.app()));
  kid.click('[data-act=kidmode]'); kid.click('[data-act=kidrole][data-v=kid]'); await tick(100);
  t('the account is locked to Kid mode', JSON.stringify(db.course.kid1) === '{"kid":true}');
  t('the phone remembers it is the child\'s', kid.w.localStorage.getItem('orbit_kidrole_v1_kid1') === 'kid');

  // 2. The child sees only Bolo.
  t('child sees the Bolo page', /Bolo/.test(kid.app()) && !!kid.d.querySelector('[data-bl=mode]'));
  t('no menu button, no Home link, no subjects', !kid.d.querySelector('[data-act=menu]') && !kid.d.querySelector('.back') && !/Subjects|SEBA|Mathematics/.test(kid.app()));
  kid.w.eval("go('fav')"); kid.w.eval("go('home')"); kid.w.eval("navTo({page:'home'})"); await tick(30);
  t('go() and navTo() do nothing in Kid mode', /Bolo/.test(kid.app()) && !!kid.d.querySelector('[data-bl=mode]'));

  // 3. The parent makes a code in "Parent ke liye".
  t('Parent ke liye has a "Code banao" button', !!kid.d.querySelector('[data-kl=mk]'));
  kid.click('[data-kl=mk]'); await tick(100);
  const code = (kid.d.getElementById('klCodeShow') || {}).textContent || '';
  t('a code is shown as XXXX-XXXX', /^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/.test(code), code);
  t('the link is saved with the first name only', Object.values(db.links)[0].name === 'Rahul' && Object.values(db.links)[0].kidUid === 'kid1');

  // 4. The parent's phone: Kid mode > I am parent > paste the code.
  let par = await boot(db, 'par1');
  par.click('[data-act=kidmode]'); par.click('[data-act=kidrole][data-v=parent]'); par.click('[data-act=kidof][data-v=kid]');
  t('"I am parent" asks for the code', !!par.d.getElementById('kidCode'));
  par.d.getElementById('kidCode').value = 'ZZZZ-ZZZZ'; par.click('[data-act=kidjoin]'); await tick(100);
  t('a wrong code is refused with a message and nothing is locked', /code nahi mila/.test(par.app()) && !db.course.par1);
  par.d.getElementById('kidCode').value = code.toLowerCase(); par.click('[data-act=kidjoin]'); await tick(150);
  t('a right code (any case, with the dash) connects and locks the account to Kid mode', db.parents[code.replace('-', '')].par1 && JSON.stringify(db.course.par1) === '{"kid":true}');
  t('the parent sees the child by first name, today\'s time, and no menu', /Rahul/.test(par.app()) && /Aaj Bolo chala/.test(par.app()) && !par.d.querySelector('[data-act=menu]') && !par.d.querySelector('[data-bl=mode]'));

  // 5. The child's day reaches the parent.
  kid.w.eval("BOLO.summary()"); await kid.w.KIDLINK._push(); await tick(50);
  t('the child phone shares only day, minutes and counts', Object.keys(db.sums[code.replace('-', '')]).sort().join() === 'at,day,ok,redo,sec,total');
  par.click('[data-kl=refresh]'); await tick(150);
  t('the parent screen shows the summary', /Aaj sahi/.test(par.app()) && /Ab tak sahi/.test(par.app()));
  t('the parent numbers are a green ring and three coloured cards (not a plain table)', !!par.d.querySelector('.kl-kid .kl-arc') && par.d.querySelectorAll('.kl-tiles .kl-t').length === 3 && !par.d.querySelector('.bl-tbl') && /Roz ki limit \d+ min mein se/.test(par.app()));
  t('the animation plays only the first time (not on every 30-second refresh)', !par.d.querySelector('.kl-kid').classList.contains('kl-in'));

  par.d.getElementById('klCode').value = 'ABCD-2'; par.w.KIDLINK._tick(); await tick(150);
  t('the 30-second refresh does not wipe a code that is being typed', par.d.getElementById('klCode').value === 'ABCD-2');
  par.d.getElementById('klCode').value = '';

  // 6. The parent sets the limit and the mic; the child's phone takes it.
  const lim = par.d.querySelector('[data-kl-lim]'); lim.value = '20'; lim.dispatchEvent(new par.w.Event('change', { bubbles: true })); await tick(100);
  t('the parent\'s limit is saved for the child', db.sets[code.replace('-', '')] && db.sets[code.replace('-', '')].limit === 20 && db.sets[code.replace('-', '')].mic === true);
  const mic = par.d.querySelector('[data-kl-mic]'); mic.checked = false; mic.dispatchEvent(new par.w.Event('change', { bubbles: true })); await tick(100);
  t('the mic switch is saved too', db.sets[code.replace('-', '')].mic === false);
  await kid.w.KIDLINK._pull(); await tick(50);
  const saved = JSON.parse(kid.w.localStorage.getItem('orbit.bolo.kid1') || kid.w.localStorage.getItem(Object.keys(kid.w.localStorage).find(k => /bolo/.test(k) && /kid1/.test(k)) || '') || '{}');
  t('the child phone applied limit 20 and mic off', saved.set && saved.set.limit === 20 && saved.set.mic === false, JSON.stringify(saved.set));
  kid.w.BOLO.applyRemote({ limit: 10 }); await kid.w.KIDLINK._pull(); await tick(30);
  const again = JSON.parse(kid.w.localStorage.getItem(Object.keys(kid.w.localStorage).find(k => /bolo/.test(k) && /kid1/.test(k))) || '{}');
  t('the same parent setting is not applied twice', again.set && again.set.limit === 10, JSON.stringify(again.set));

  // 7. Leaving Kid mode on the child's phone.
  kid.w.document.querySelector('#blPar').open = true;
  t('"Kid mode band karo" is there for the parent', !!kid.d.querySelector('[data-act=csback]') && !kid.d.querySelector('[data-act=csback]').disabled);
  kid.click('[data-act=csback]'); await tick(150);
  t('Kid mode closes: the lock is gone and the course screen is back', !db.course.kid1 && /Apna course chuno/.test(kid.app()) && kid.w.localStorage.getItem('orbit_kidrole_v1_kid1') === null);
  kid.w.close();

  // 8. The same account on a second phone: the lock is there, the phone still has to say who it is.
  db.course.kid1 = { kid: true };
  let second = await boot(db, 'kid1');
  t('a new phone on a Kid mode account asks who is there (no new lock write)', /Main bachcha hoon/.test(second.app()) && /I am parent/.test(second.app()));
  second.click('[data-act=kidrole][data-v=kid]'); await tick(100);
  t('then it shows Bolo', !!second.d.querySelector('[data-bl=mode]') && second.w.localStorage.getItem('orbit_kidrole_v1_kid1') === 'kid');
  second.w.close();

  // 9. The parent can also leave Kid mode.
  par.click('[data-act=csback]'); await tick(150);
  t('the parent phone can leave Kid mode', !db.course.par1 && /Apna course chuno/.test(par.app()));
  par.w.close();

  console.log(pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('FAIL  crashed: ' + e.stack); process.exit(1); });
