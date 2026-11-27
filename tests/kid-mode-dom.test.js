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

const newDb = () => ({ course: {}, links: {}, parents: {}, sums: {}, sets: {}, kids: {}, mentors: {}, pres: {}, mentees: {}, wa: {}, reviews: {}, rep: {}, live: {}, repWrites: 0, menteeData: {}, n: 0 });
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
      remove: async code => { delete db.links[code]; delete db.parents[code]; delete db.sums[code]; delete db.sets[code]; delete db.mentors[code]; delete db.pres[code]; delete db.wa[code]; delete db.reviews[code]; delete db.rep[code]; },
      putSum: async (code, sum) => { if (!db.links[code] || db.links[code].kidUid !== uid) throw denied(); db.sums[code] = sum; },
      getSum: async code => db.sums[code] || null,
      getSet: async code => db.sets[code] || null,
      putSet: async (code, set) => { if (!db.parents[code] || !db.parents[code][uid]) throw denied(); db.sets[code] = set; },
      join: async (code, name) => { if (!db.links[code]) throw denied(); db.parents[code][uid] = { uid, name }; (db.kids[uid] = db.kids[uid] || []).push(code); },
      myKids: async () => db.kids[uid] || [],
      leave: async code => { delete (db.parents[code] || {})[uid]; db.kids[uid] = (db.kids[uid] || []).filter(c => c !== code); },
      forget: async code => { db.kids[uid] = (db.kids[uid] || []).filter(c => c !== code); },
      // Online / Offline and mentors (same rules as firestore.rules: the child writes presence; a parent approves; only an approved mentor reads)
      putLive: async (code, l) => { if (!db.links[code] || db.links[code].kidUid !== uid) throw denied(); if (!l || Object.keys(l).some(k => !['at', 'act', 'lines'].includes(k)) || !Array.isArray(l.lines) || l.lines.length > 14) throw denied(); db.live[code] = l; },
      getLive: async code => { const m = (db.mentors[code] || {})[uid], own = db.links[code] && db.links[code].kidUid === uid, par = (db.parents[code] || {})[uid]; if (!(own || par || (m && m.status === 'approved' && +m.listenUntil > Date.now()))) return null; return db.live[code] || null; },
      delLive: async code => { if (db.links[code] && db.links[code].kidUid === uid) delete db.live[code]; },
      putPres: async (code, p) => { if (!db.links[code] || db.links[code].kidUid !== uid) throw denied(); db.pres[code] = p; },
      getPres: async code => { const m = (db.mentors[code] || {})[uid]; const ok = (db.parents[code] || {})[uid] || (db.links[code] && db.links[code].kidUid === uid) || (m && m.status === 'approved'); if (!ok) throw denied(); return db.pres[code] || null; },
      mentorAsk: async (code, name) => { if (!db.links[code]) throw denied(); (db.mentors[code] = db.mentors[code] || {})[uid] = { uid, name, status: 'pending', at: Date.now() }; (db.mentees[uid] = db.mentees[uid] || []).push(code); },
      mentorMe: async code => (db.mentors[code] || {})[uid] || null,
      mentors: async code => { if (!(db.parents[code] || {})[uid] && !(db.links[code] && db.links[code].kidUid === uid)) throw denied(); return Object.values(db.mentors[code] || {}); },
      mentorApprove: async (code, u) => { if (!(db.parents[code] || {})[uid] && !(db.links[code] && db.links[code].kidUid === uid)) throw denied(); db.mentors[code][u].status = 'approved'; },   // firestore.rules: a parent, or the child's phone (the app asks for the PIN and an opt-in first)
      mentorDrop: async (code, u) => { if (u !== uid && !(db.parents[code] || {})[uid] && !(db.links[code] && db.links[code].kidUid === uid)) throw denied(); delete (db.mentors[code] || {})[u]; },
      putWa: async (code, num) => { if (!(db.parents[code] || {})[uid] || !/^[0-9]{10,15}$/.test(num)) throw denied(); db.wa[code] = { num, at: Date.now() }; },
      getWa: async code => { const m = (db.mentors[code] || {})[uid]; if (!(db.parents[code] || {})[uid] && !(m && m.status === 'approved')) return null; return db.wa[code] || null; },
      delWa: async code => { if (!(db.parents[code] || {})[uid]) throw denied(); delete db.wa[code]; },
      // The same rules as firestore.rules: a parent opens the window (at most about 1 hour), parent or child closes it, only a listening mentor writes marks.
      mentorListen: async (code, u, until) => { const m = (db.mentors[code] || {})[u], isPar = (db.parents[code] || {})[uid], isKid = db.links[code] && db.links[code].kidUid === uid; if (!m) throw denied(); if (isPar && m.status === 'approved' && until >= 0 && until <= Date.now() + 3660000) { m.listenUntil = until; if (until > 0) m.watchAsk = 0; return; } if (isKid && until === 0) { m.listenUntil = 0; return; } if (isKid && m.status === 'approved' && m.watchAsk > 0 && until > 0 && until <= Date.now() + 3660000) { m.listenUntil = until; m.watchAsk = 0; return; } throw denied(); },   // firestore.rules: the child phone may open the window only to answer an ask by the mentor
      mentorWatchAsk: async (code, on) => { const m = (db.mentors[code] || {})[uid]; if (!m || m.status !== 'approved') throw denied(); m.watchAsk = on ? Date.now() : 0; },
      mentorWatchNo: async (code, u) => { const m = (db.mentors[code] || {})[u], isPar = (db.parents[code] || {})[uid], isKid = db.links[code] && db.links[code].kidUid === uid; if (!m || !(isPar || (isKid && m.watchAsk > 0))) throw denied(); m.watchAsk = 0; },
      putRep: async (code, r) => { if (!db.links[code] || db.links[code].kidUid !== uid || !Array.isArray(r.days) || r.days.length > 7 || !Array.isArray(r.weak) || r.weak.length > 8) throw denied(); db.rep[code] = r; db.repWrites++; },
      getRep: async code => { const m = (db.mentors[code] || {})[uid], own = db.links[code] && db.links[code].kidUid === uid; if (!own && !(m && m.status === 'approved')) throw denied(); return db.rep[code] || null; },
      getReview: async (code, rid) => ((db.reviews[code] || {})[rid]) || null,
      putReview: async (code, rid, marks) => { const m = (db.mentors[code] || {})[uid]; if (!m || m.status !== 'approved' || !(+m.listenUntil > Date.now()) || !/^[01-]{1,60}$/.test(marks)) throw denied(); (db.reviews[code] = db.reviews[code] || {})[rid] = { marks, by: uid, at: Date.now() }; },
      reviews: async code => Object.entries(db.reviews[code] || {}).map(([id, v]) => ({ id, ...v })),
      menteeData: async () => (db.mentees[uid] || []).map(id => ({ id, ...((db.menteeData[uid] || {})[id] || {}) })),
      menteeSet: async (code, p) => { (db.menteeData[uid] = db.menteeData[uid] || {})[code] = { ...((db.menteeData[uid] || {})[code] || {}), ...p }; },
      myMentees: async () => db.mentees[uid] || [],
      forgetMentee: async code => { db.mentees[uid] = (db.mentees[uid] || []).filter(c => c !== code); }
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
      for (const f of ['bolo-core.js', 'byanjan-video.js', 'bolo.js', 'bolorec-core.js', 'bolorec.js', 'kidlink.js']) w.eval(read('public/' + f));
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
  t('the parent sees the child by first name, online time, and no menu', /Rahul/.test(par.app()) && /Aaj Orbit khula raha/.test(par.app()) && !par.d.querySelector('[data-act=menu]') && !par.d.querySelector('[data-bl=mode]'));

  // 5. The child's day reaches the parent.
  kid.w.eval("BOLO.summary()"); await kid.w.KIDLINK._push(); await tick(50);
  t('the child phone shares only day, minutes and counts', Object.keys(db.sums[code.replace('-', '')]).sort().join() === 'at,day,ok,redo,sec,total');
  par.click('[data-kl=refresh]'); await tick(150);
  t('the parent screen shows the summary', /Aaj sahi/.test(par.app()) && /Ab tak sahi/.test(par.app()));
  t('the parent numbers are three coloured cards and a right-answers meter, no plain table, no ring', par.d.querySelectorAll('.kl-tiles .kl-t').length === 3 && !par.d.querySelector('.bl-tbl') && !par.d.querySelector('.kl-arc') && /min online/.test(par.app()));
  t('the animation plays only the first time (not on every 30-second refresh)', !par.d.querySelector('.kl-kid').classList.contains('kl-in'));

  par.d.getElementById('klCode').value = 'ABCD-2'; par.w.KIDLINK._tick(); await tick(150);
  t('the 30-second refresh does not wipe a code that is being typed', par.d.getElementById('klCode').value === 'ABCD-2');
  par.d.getElementById('klCode').value = '';

  // 6. The parent screen has no limit slider any more: it shows the online time. The mic switch still goes to the child's phone.
  t('the parent screen has no "Roz ki limit" slider', !par.d.querySelector('[data-kl-lim]') && !/Roz ki limit/.test(par.app()));
  t('the parent screen shows online minutes instead', /min online/.test(par.app()) && /Aaj Orbit khula raha/.test(par.app()));
  const mic = par.d.querySelector('[data-kl-mic]'); mic.checked = false; mic.dispatchEvent(new par.w.Event('change', { bubbles: true })); await tick(100);
  t('the mic switch is saved too, and the limit that was there stays', db.sets[code.replace('-', '')].mic === false && db.sets[code.replace('-', '')].limit === 10);
  await kid.w.KIDLINK._pull(); await tick(50);
  const saved = JSON.parse(kid.w.localStorage.getItem('orbit.bolo.kid1') || kid.w.localStorage.getItem(Object.keys(kid.w.localStorage).find(k => /bolo/.test(k) && /kid1/.test(k)) || '') || '{}');
  t('the child phone applied the mic switch (off)', saved.set && saved.set.mic === false, JSON.stringify(saved.set));
  kid.w.BOLO.applyRemote({ limit: 10 }); await kid.w.KIDLINK._pull(); await tick(30);
  const again = JSON.parse(kid.w.localStorage.getItem(Object.keys(kid.w.localStorage).find(k => /bolo/.test(k) && /kid1/.test(k))) || '{}');
  t('the same parent setting is not applied twice', again.set && again.set.limit === 10, JSON.stringify(again.set));

  // 6b. A mentor: asks with the code, the parent approves, then the mentor sees Online / Offline.
  const kcode = code.replace('-', '');
  await kid.w.KIDLINK._beat(true); await tick(50);
  t('the child phone says it is online (on screen)', db.pres[kcode] && db.pres[kcode].on === true && typeof db.pres[kcode].at === 'number');
  let men = await boot(db, 'men1');
  men.click('[data-act=kidmode]'); men.click('[data-act=kidrole][data-v=mentor]'); men.click('[data-act=kidof][data-v=kid]');
  t('"I am mentor" > Kid asks for the code and says the parent must approve', !!men.d.getElementById('kidCode') && /Mentor of Kid/.test(men.app()) && /manzoor/.test(men.app()) && !/abhi ban raha hai/.test(men.app()));
  men.click('[data-act=kidback]');
  t('Wapas from the mentor code screen goes to "Mentor of"', /Mentor of/.test(men.app()) && !men.d.getElementById('kidCode'));
  men.click('[data-act=kidof][data-v=kid]');
  men.d.getElementById('kidCode').value = 'ZZZZ-ZZZZ'; men.click('[data-act=mentorsend]'); await tick(100);
  t('a wrong code is refused and nothing is locked', /code nahi mila/.test(men.app()) && !db.course.men1 && !db.mentors.ZZZZZZZZ);
  men.d.getElementById('kidCode').value = code.toLowerCase(); men.click('[data-act=mentorsend]'); await tick(200);
  t('a right code sends a pending request and locks the account to Kid mode', db.mentors[kcode].men1.status === 'pending' && db.mentors[kcode].men1.name === 'Rahul' && JSON.stringify(db.course.men1) === '{"kid":true}');
  t('the phone remembers it is the mentor\'s', men.w.localStorage.getItem('orbit_kidrole_v1_men1') === 'mentor');
  t('the mentor sees the child by first name, "waiting for parent", and no Online/Offline yet', /Rahul/.test(men.app()) && /intezaar/.test(men.app()) && !/Online|Offline/.test(men.app()) && !men.d.querySelector('[data-act=menu]') && !men.d.querySelector('[data-bl=mode]'));
  par.click('[data-kl=refresh]'); await tick(150);
  t('the parent sees the request with Manzoor karo and Mana karo', /mentor banna chahta hai/.test(par.app()) && !!par.d.querySelector('[data-kl=myes]') && !!par.d.querySelector('[data-kl=mno]'));
  par.click('[data-kl=myes]'); await tick(200);
  t('the parent approves: the mentor is approved', db.mentors[kcode].men1.status === 'approved' && /Hatao/.test(par.app()));
  men.click('[data-kl=mrefresh]'); await tick(150);
  t('the approved mentor sees the child Online', /Online/.test(men.app()) && !/Offline/.test(men.app()) && !!men.d.querySelector('.kl-on'));
  // 6c. Online time, live activity, the mentor's progress view, and the WhatsApp report.
  const today = (() => { const n = new Date(); return n.getFullYear() + '-' + String(n.getMonth() + 1).padStart(2, '0') + '-' + String(n.getDate()).padStart(2, '0'); })();
  await tick(1200); await kid.w.KIDLINK._beat(true); await tick(50);
  t('the child phone counts online seconds for today', db.pres[kcode].day === today && db.pres[kcode].sec >= 1, JSON.stringify(db.pres[kcode]));
  t('the child phone shares what topic it is on (a short label only)', typeof db.pres[kcode].act === 'string' && db.pres[kcode].act.length > 0 && db.pres[kcode].act.length <= 40, JSON.stringify(db.pres[kcode]));
  db.sums[kcode] = { day: today, sec: 180, ok: 3, redo: 1, total: 9, at: Date.now() };
  men.click('[data-kl=mrefresh]'); await tick(150);
  t('the mentor sees online time, Bolo minutes, right and repeat counts, and the live topic', /Aaj online: \d+ min/.test(men.app()) && /Bolo practice: 3 min/.test(men.app()) && /3Aaj sahi/.test(men.app()) && /1Dobara karni hain/.test(men.app()) && /Abhi kar raha hai: /.test(men.app()));
  t('no WhatsApp button until the parent gives a number', !men.d.querySelector('[data-kl=mwa]'));
  par.click('[data-kl=refresh]'); await tick(150);
  par.d.getElementById('klWa-' + kcode).value = '123'; par.click('[data-kl=wasave]'); await tick(100);
  t('a wrong WhatsApp number is refused with a message', /Number galat hai/.test(par.app()) && !db.wa[kcode]);
  par.d.getElementById('klWa-' + kcode).value = '98765 43210'; par.click('[data-kl=wasave]'); await tick(200);
  t('a 10-digit number is saved with 91 in front', db.wa[kcode] && db.wa[kcode].num === '919876543210', JSON.stringify(db.wa[kcode]));
  men.click('[data-kl=mrefresh]'); await tick(150);
  let opened = null; men.w.open = (u, tg, f) => { opened = { u, tg, f }; };
  t('the approved mentor now has a WhatsApp report button', !!men.d.querySelector('[data-kl=mwa]'));
  men.click('[data-kl=mwa]');
  const txt = opened ? decodeURIComponent(opened.u.split('?text=')[1] || '') : '';
  t('the button opens wa.me on the parent\'s number with a ready report (nothing is sent by Orbit)', opened && opened.u.startsWith('https://wa.me/919876543210?text=') && opened.f === 'noopener' && /Rahul/.test(txt) && /Sahi jawab: 3, dobara karne wale: 1/.test(txt) && /Ab tak kul sahi: 9/.test(txt) && /Online time: \d+ min/.test(txt), txt);
  par.click('[data-kl=wadel]'); await tick(200);
  men.click('[data-kl=mrefresh]'); await tick(150);
  t('the parent removes the number: the mentor loses the button', !db.wa[kcode] && !men.d.querySelector('[data-kl=mwa]'));

  // 6d. Voice: the parent opens a 1-hour window, the child's screen says so, the mentor hears the recording and marks letters.
  const RID = '1800000000000-abc123';
  men.w.api = async (path, body) => path.endsWith('/list')
    ? { items: [{ id: RID, at: Date.now(), expiresAt: Date.now() + 7200000, total: 2, letters: [{ i: 0, l: 'ক', t: 1000, s: 1 }, { i: 1, l: 'খ', t: 3500, s: 0 }], silent: 1 }] }
    : { mime: 'audio/webm', audio: Buffer.alloc(900, 7).toString('base64') };
  men.w.URL.createObjectURL = () => 'blob:test'; men.w.URL.revokeObjectURL = () => {};
  men.click('[data-kl=mrefresh]'); await tick(150);
  t('before any window the mentor is told to ask the parent, and cannot open recordings', /manzoori maango/.test(men.app()) && !men.d.querySelector('[data-br=mtoggle]'));
  par.click('[data-kl=refresh]'); await tick(150);
  t('the parent sees "1 ghante ke liye sunne do" for the approved mentor', !!par.d.querySelector('[data-kl=lgo]') && /1 ghante baad apne aap band/.test(par.app()));
  par.click('[data-kl=lgo]'); await tick(300);
  const lu = db.mentors[kcode].men1.listenUntil;
  t('the parent opens a 1-hour window, and the recording is switched on with it', lu > Date.now() + 3500000 && lu <= Date.now() + 3610000 && db.sets[kcode].rec === true && /Sunna chalu hai/.test(par.app()));
  await kid.w.KIDLINK._listenPoll(); await tick(100);
  t('the child\'s screen says "Mentor sun rahe hain" with a Band karo button', /Mentor sun rahe hain/.test(kid.app()) && /Rahul/.test(kid.app()) && !!kid.d.querySelector('[data-kl=kstop]'));
  men.click('[data-kl=mrefresh]'); await tick(150);
  t('the mentor now sees the listening time and can open the recordings', /Awaaz sunne ka time/.test(men.app()) && !!men.d.querySelector('[data-br=mtoggle]'));
  // Live screen (words only): the child's phone writes it only while the window is open; the mentor sees it inside the window.
  await kid.w.KIDLINK._livePush(true); await tick(80);
  const lv = db.live[kcode];
  t('window open: the child phone writes the words on its screen (act + lines, nothing else)', !!lv && Object.keys(lv).sort().join() === 'act,at,lines' && Array.isArray(lv.lines) && lv.lines.length <= 14 && lv.lines.every(x => typeof x === 'string' && x.length <= 60));
  t('the live words never include the Parent ke liye box (PIN and settings)', !lv.lines.some(x => /PIN|Parent ke liye|Badalne ke liye/.test(x)));
  t('the mentor card has a Live screen box', !!men.d.querySelector('[data-kl-live]') && /Live screen/.test(men.app()));
  db.live[kcode] = { at: Date.now(), act: 'ABC Levels', lines: ['Level 1 · 1 / 10', 'Fish — ye kis letter se shuru hota hai?', 'F', 'B', 'C', 'Y', '<img src=x onerror=alert(1)>'] };
  await men.w.KIDLINK._liveTick(); await tick(50);
  const box = men.d.querySelector('[data-kl-live]');
  t('the mentor sees the game, level, question and answer buttons live', /ABC Levels/.test(box.textContent) && /Level 1 · 1 \/ 10/.test(box.textContent) && /Fish — ye kis letter/.test(box.textContent) && [...box.querySelectorAll('.md-ln div')].map(x => x.textContent).slice(2, 6).join() === 'F,B,C,Y');
  t('words from the child are shown as plain text (no HTML runs)', !box.querySelector('img') && /<img src=x/.test(box.textContent));
  db.live[kcode].at = Date.now() - 60000; await men.w.KIDLINK._liveTick(); await tick(50);
  t('a screen older than 20 s says the phone is in the background', /background mein hai/.test(men.d.querySelector('[data-kl-live]').textContent));
  men.click('[data-br=mtoggle]'); await tick(150);
  t('the recordings are listed', !!men.d.querySelector('[data-br=mplay]'));
  men.click('[data-br=mplay]'); await tick(200);
  t('the recording plays and every letter has Sahi and Galat', !!men.d.getElementById('brAud') && men.d.querySelectorAll('[data-br=mark]').length === 4);
  men.click('[data-br=mark][data-i="0"][data-v="1"]'); men.click('[data-br=mark][data-i="1"][data-v="0"]');
  t('a mark shows as pressed (and is not only a colour)', men.d.querySelector('[data-br=mark][data-i="0"][data-v="1"]').getAttribute('aria-pressed') === 'true' && men.d.querySelector('[data-br=mark][data-i="1"][data-v="0"]').getAttribute('aria-pressed') === 'true');
  men.click('[data-br=msave]'); await tick(200);
  t('Marks save karo stores one character per letter (1 = sahi, 0 = galat)', db.reviews[kcode][RID] && db.reviews[kcode][RID].marks === '10' && db.reviews[kcode][RID].by === 'men1' && /Marks save ho gaye/.test(men.app()));
  men.click('[data-br=mark][data-i="1"][data-v="0"]');
  t('tapping a pressed mark again clears it', men.d.querySelector('[data-br=mark][data-i="1"][data-v="0"]').getAttribute('aria-pressed') === 'false');
  db.mentors[kcode].men1.listenCount = 2; db.mentors[kcode].men1.lastListenAt = Date.now();
  par.click('[data-kl=refresh]'); await tick(150);
  t('the parent sees the log and the mentor\'s marks', /Is mentor ne 2 recording suni/.test(par.app()) && /1 sahi, 1 galat \(1 recording\)/.test(par.app()));
  let denied = 0;
  try { await kid.w.CLOUD.kids.mentorListen(kcode, 'men1', Date.now() + 1000); } catch (e) { denied++; }
  try { await men.w.CLOUD.kids.mentorListen(kcode, 'men1', Date.now() + 1000); } catch (e) { denied++; }
  try { await par.w.CLOUD.kids.mentorListen(kcode, 'men1', Date.now() + 5 * 3600000); } catch (e) { denied++; }
  t('only a parent can open the window, and never for more than about an hour', denied === 3);
  kid.click('[data-kl=kstop]'); await tick(150);
  t('the child stops the listening with one tap', db.mentors[kcode].men1.listenUntil === 0 && !/Mentor sun rahe hain/.test(kid.app()));
  await tick(200);
  t('closing the window also removes the live screen words', !db.live[kcode]);
  men.click('[data-kl=mrefresh]'); await tick(150);
  t('the mentor loses the recordings at once and the page drops the open recording', /manzoori maango/.test(men.app()) && !men.d.getElementById('brAud'));
  let mdenied = false; try { await men.w.CLOUD.kids.putReview(kcode, RID, '11'); } catch (e) { mdenied = true; }
  t('marks cannot be written after the window is closed', mdenied && db.reviews[kcode][RID].marks === '10');
  par.click('[data-kl=refresh]'); await tick(150);
  par.click('[data-kl=lgo]'); await tick(300);
  t('the parent can open it again', db.mentors[kcode].men1.listenUntil > Date.now());
  par.click('[data-kl=refresh]'); await tick(150);
  par.click('[data-kl=lstop]'); await tick(300);
  t('the parent closes the window any time', db.mentors[kcode].men1.listenUntil === 0 && !!par.d.querySelector('[data-kl=lgo]'));

  // 6d2. The mentor asks to listen / watch; a parent (parent phone) or the child's phone (Parent ke liye) answers.
  men.click('[data-kl=mrefresh]'); await tick(150);
  t('mentor: a "Sunna / Dekhna maango" button is on the card when no window is open', !!men.d.querySelector('[data-kl=mwatch]') && !men.d.querySelector('[data-kl=mwatchoff]'));
  men.click('[data-kl=mwatch]'); await tick(200);
  t('mentor: after tapping it the ask is saved and the card says the request is waiting', db.mentors[kcode].men1.watchAsk > 0 && /Request bhej di/.test(men.app()) && !!men.d.querySelector('[data-kl=mwatchoff]') && !men.d.querySelector('[data-kl=mwatch]'));
  men.click('[data-kl=mwatchoff]'); await tick(200);
  t('mentor: can take the ask back', db.mentors[kcode].men1.watchAsk === 0 && !!men.d.querySelector('[data-kl=mwatch]'));
  let denied2 = 0;
  try { await kid.w.CLOUD.kids.mentorListen(kcode, 'men1', Date.now() + 1000); } catch (e) { denied2++; }
  t('child phone can NOT open a window when the mentor has not asked', denied2 === 1 && db.mentors[kcode].men1.listenUntil === 0);
  men.click('[data-kl=mwatch]'); await tick(200);
  par.click('[data-kl=refresh]'); await tick(150);
  t('parent phone: sees "Rahul sunna aur dekhna chahta hai" with the usual open button and Abhi nahi', /Rahul sunna aur dekhna chahta hai/.test(par.app()) && !!par.d.querySelector('[data-kl=lgo]') && !!par.d.querySelector('[data-kl=lno]'));
  await kid.w.KIDLINK._listenPoll(); await tick(100);
  t('child phone: Parent ke liye shows the ask with "1 ghante ke liye do" and "Abhi nahi"', /Rahul/.test(kid.app()) && /sunna aur dekhna chahta hai/.test(kid.app()) && !!kid.d.querySelector('[data-kl=kwyes]') && !!kid.d.querySelector('[data-kl=kwno]'));
  kid.click('[data-kl=kwno]'); await tick(250);
  t('child phone: Abhi nahi clears the ask and opens no window', db.mentors[kcode].men1.watchAsk === 0 && db.mentors[kcode].men1.listenUntil === 0 && !kid.d.querySelector('[data-kl=kwyes]'));
  men.click('[data-kl=mrefresh]'); await tick(150);
  men.click('[data-kl=mwatch]'); await tick(200);
  await kid.w.KIDLINK._listenPoll(); await tick(100);
  kid.click('[data-kl=kwyes]'); await tick(300);
  t('child phone: 1 ghante ke liye do opens the 1-hour window (the parent does not have to be there) and clears the ask', db.mentors[kcode].men1.listenUntil > Date.now() + 3500000 && db.mentors[kcode].men1.watchAsk === 0 && /Mentor sun rahe hain/.test(kid.app()));
  men.click('[data-kl=mrefresh]'); await tick(150);
  t('mentor: the window is open, so the Live screen box shows and the ask button is gone', !!men.d.querySelector('[data-kl-live]') && !men.d.querySelector('[data-kl=mwatch]'));
  kid.click('[data-kl=kstop]'); await tick(250);
  men.click('[data-kl=mrefresh]'); await tick(150);
  t('after the child stops it the mentor can ask again', !!men.d.querySelector('[data-kl=mwatch]'));
  par.click('[data-kl=refresh]'); await tick(150);
  men.click('[data-kl=mwatch]'); await tick(200);
  par.click('[data-kl=refresh]'); await tick(150);
  par.click('[data-kl=lno]'); await tick(250);
  t('parent phone: Abhi nahi clears the ask', db.mentors[kcode].men1.watchAsk === 0 && !/sunna aur dekhna chahta hai/.test(par.app()));
  t('rules: mentor may only write watchAsk on its own approved record; child opens only to answer an ask; parent clears the ask on open', (() => { const r = require('fs').readFileSync(require('path').join(__dirname, '..', 'firestore.rules'), 'utf8'); return /hasOnly\(\['status', 'listenUntil', 'watchAsk'\]\)/.test(r) && /request\.auth\.uid == uid\s*&& resource\.data\.status == 'approved'\s*&& request\.resource\.data\.diff\(resource\.data\)\.affectedKeys\(\)\.hasOnly\(\['watchAsk'\]\)/.test(r) && /kidOwner\(code\)\s*&& resource\.data\.status == 'approved' && \('watchAsk' in resource\.data\) && resource\.data\.watchAsk > 0/.test(r); })());

  // 6e. Mentor upgrades: the 7-day chart with the streak, and the items still to repeat.
  const dkOf = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const dN = n => { const d = new Date(); d.setDate(d.getDate() - n); return dkOf(d); };
  const BCORE = require('../public/bolo-core.js'), BY = BCORE.items('byanjan');
  kid.w.localStorage.setItem('orbit.bolo.kid1', JSON.stringify({ set: { limit: 10, mic: true, vol: 3, pin: '' },
    prog: { byanjan: { '0': 'r', '3': 'r', '5': 'd' }, t3: { '1': 'r' } },
    days: { [dN(2)]: { sec: 400, ok: 4, redo: 1 }, [dN(1)]: { sec: 200, ok: 2, redo: 0 }, [dN(0)]: { sec: 300, ok: 3, redo: 2 } } }));
  kid.w.localStorage.setItem('orbit.kl.onh.kid1', JSON.stringify({ [dN(2)]: 1200, [dN(1)]: 600 }));
  kid.w.BOLO._reset();
  await kid.w.KIDLINK._repPush(true); await tick(80);
  const repDoc = db.rep[kcode];
  t('the child phone sends the last 7 days and the items to repeat (labels only)', repDoc && repDoc.days.length === 3 && repDoc.days.every(x => /^\d{4}-\d{2}-\d{2}$/.test(x.d) && typeof x.o === 'number') && repDoc.weak.length === 2, JSON.stringify(repDoc));
  const wk0 = repDoc && repDoc.weak.find(w => w.t === 'ব্যঞ্জন');
  t('the repeat list names the topic and the letters, and leaves out the done ones', wk0 && wk0.l.length === 2 && wk0.l[0] === BY[0].big && wk0.l[1] === BY[3].big && !wk0.l.includes(BY[5].big) && repDoc.weak.some(w => w.t === 'Table 3' && w.l.length === 1));
  t('nothing but days, topic names and short labels travels (no audio, no recognised text)', JSON.stringify(Object.keys(repDoc).sort()) === '["at","days","weak"]' && repDoc.weak.every(w => w.l.every(x => String(x).length <= 8)));
  const w0 = db.repWrites; await kid.w.KIDLINK._repPush(); await tick(30);
  t('an unchanged report is not written again', db.repWrites === w0);
  men.click('[data-kl=mrefresh]'); await tick(200);
  t('the mentor sees the 7-day chart with 7 bars and a text label for each', men.d.querySelectorAll('.kl-wk .kl-wd').length === 7 && /Pichhle 7 din/.test(men.app()) && /min online, \d+ sahi, \d+ dobara/.test(men.d.querySelector('.kl-wd').getAttribute('aria-label')));
  t('the streak counts the days in a row', /Lagatar: 3 din/.test(men.app()));
  t('the mentor sees the items to repeat', /Dobara karne wale/.test(men.app()) && men.app().includes(BY[0].big) && men.app().includes(BY[3].big) && /Table 3/.test(men.app()));
  let repDenied = false; try { await par.w.CLOUD.kids.getRep(kcode); } catch (e) { repDenied = true; }
  t('the parent screen and strangers are not given this data (mentor and child only)', repDenied);
  db.mentors[kcode].men1.status = 'pending';
  men.click('[data-kl=mrefresh]'); await tick(150);
  t('a mentor who is not approved sees no chart', !men.d.querySelector('.kl-wk'));
  db.mentors[kcode].men1.status = 'approved';
  men.click('[data-kl=mrefresh]'); await tick(150);

  // 6f. The colourful dashboard: overview, colour per child, "dhyan chahiye" alerts, daily target, filter.
  const nowPres = { on: true, at: Date.now(), day: today, sec: 300, act: 'ব্যঞ্জন' };
  db.pres[kcode] = nowPres;
  men.click('[data-kl=mrefresh]'); await tick(200);
  t('the overview shows the number of children, who is online, minutes and "Dhyan chahiye"', !!men.d.querySelector('.md-hero') && /Bachche/.test(men.d.querySelector('.md-hero').textContent) && /Abhi online/.test(men.d.querySelector('.md-hero').textContent) && /Dhyan chahiye/.test(men.d.querySelector('.md-hero').textContent) && men.d.querySelectorAll('.md-stats > div').length === 4);
  t('each child card has its own colour pair and a header with the name and the status', /--k1:#[0-9a-f]{6};--k2:#[0-9a-f]{6}/i.test(men.d.querySelector('.md-card').getAttribute('style')) && !!men.d.querySelector('.md-top .md-nm h2') && !!men.d.querySelector('.md-top .md-pill'));
  t('the card header shows the streak', /3/.test((men.d.querySelector('.md-streak') || { textContent: '' }).textContent));
  t('a child who is fine has no alert', !men.d.querySelector('.md-flag') && /0Dhyanchahiye/.test(men.d.querySelector(".md-hero").textContent.replace(/\s+/g, "")));
  db.pres[kcode] = { on: false, at: Date.now() - 3 * 86400000, day: today, sec: 0 };
  men.click('[data-kl=mrefresh]'); await tick(200);
  t('3 days away shows a red alert and counts in the overview', !!men.d.querySelector('.md-flag.r') && /3 din se Orbit par nahi aaya/.test(men.app()) && !!men.d.querySelector('.md-stats .md-warn'));
  db.pres[kcode] = { on: false, at: Date.now() - 30 * 3600000, day: today, sec: 0 };
  men.click('[data-kl=mrefresh]'); await tick(200);
  t('yesterday shows an amber alert', !!men.d.querySelector('.md-flag.a') && /Kal se Orbit par nahi aaya/.test(men.app()));
  db.pres[kcode] = nowPres;
  const sum0 = db.sums[kcode]; db.sums[kcode] = { day: today, sec: 60, ok: 2, redo: 6, total: 9, at: Date.now() };
  men.click('[data-kl=mrefresh]'); await tick(200);
  t('many wrong answers today show an alert with the percentage', /Aaj sahi jawab kam hain \(25%\)/.test(men.app()));
  db.sums[kcode] = sum0;
  const rep0 = db.rep[kcode]; db.rep[kcode] = { ...rep0, weak: [{ t: 'ব্যঞ্জন', l: ['ক', 'খ', 'গ', 'ঘ', 'ঙ', 'চ', 'ছ', 'জ'] }] };
  men.click('[data-kl=mrefresh]'); await tick(200);
  t('8 or more letters to repeat show an alert', /8 letters dobara karne hain/.test(men.app()));
  db.rep[kcode] = rep0;
  men.click('[data-kl=mrefresh]'); await tick(200);
  t('with everything fine again the alerts go away', !men.d.querySelector('.md-flag'));
  // the mentor's own target
  t('no target yet: the card invites the mentor to set one', /Aaj ka target/.test(men.app()) && !men.d.querySelector('.md-bar') && men.d.querySelectorAll('.md-n').length === 4);
  men.click('[data-kl=mtarget][data-n="10"]'); await tick(150);
  t('a target of 10 is saved privately for this mentor and shows the progress', db.menteeData.men1[kcode].target === 10 && /3 \/ 10 sahi jawab/.test(men.app()) && /7 baaki/.test(men.app()) && men.d.querySelector('.md-bar u').style.width === '30%' && men.d.querySelector('.md-n[data-n="10"]').getAttribute('aria-pressed') === 'true');
  men.click('[data-kl=mrefresh]'); await tick(200);
  t('the target is still there after a refresh', /3 \/ 10 sahi jawab/.test(men.app()));
  men.click('[data-kl=mtarget][data-n="5"]'); await tick(100);
  db.sums[kcode] = { ...sum0, ok: 5 };
  men.click('[data-kl=mrefresh]'); await tick(200);
  t('reaching the target says so', /Target poora/.test(men.app()) && !!men.d.querySelector('.md-done') && men.d.querySelector('.md-bar u').style.width === '100%');
  db.sums[kcode] = sum0;
  men.click('[data-kl=mtarget][data-n="0"]'); await tick(150);
  t('Hatao removes the target', db.menteeData.men1[kcode].target === 0 && !men.d.querySelector('.md-bar'));
  t('only the fixed targets are accepted', await (async () => { men.w.document.body.insertAdjacentHTML('beforeend', '<button id="zz" data-kl="mtarget" data-v="' + kcode + '" data-n="999">x</button>'); men.click('#zz'); await tick(50); return db.menteeData.men1[kcode].target === 0; })());
  // two children: order, filter
  db.links.WXYZ2345 = { kidUid: 'kidX', name: 'Meena', code: 'WXYZ2345' };
  db.mentors.WXYZ2345 = { men1: { uid: 'men1', name: 'Rahul', status: 'approved', at: Date.now() } };
  db.mentees.men1.push('WXYZ2345'); db.pres.WXYZ2345 = { on: false, at: Date.now() - 2 * 86400000, day: today, sec: 0 };
  men.click('[data-kl=mrefresh]'); await tick(250);
  const order = [...men.d.querySelectorAll('[data-kl-mcard]')].map(x => x.getAttribute('data-kl-mcard'));
  t('with two children the online one comes first and the one needing attention next', order.length === 2 && order[0] === kcode && order[1] === 'WXYZ2345');
  const styleBefore = men.d.querySelector('[data-kl-mcard="' + kcode + '"]').getAttribute('style');
  t('every card has a valid colour pair', [...men.d.querySelectorAll('.md-card')].every(x => /--k1:#[0-9a-f]{6};--k2:#[0-9a-f]{6}/i.test(x.getAttribute('style'))));
  t('filter buttons appear for two children, with counts', men.d.querySelectorAll('[data-kl=mfilter]').length === 5 && /Sab \(2\)/.test(men.app()) && /Dhyan chahiye \(1\)/.test(men.app()));
  men.click('[data-kl=mfilter][data-v=attn]');
  t('the "Dhyan chahiye" filter shows only the child who needs attention', [...men.d.querySelectorAll('[data-kl-mcard]')].map(x => x.getAttribute('data-kl-mcard')).join() === 'WXYZ2345' && men.d.querySelector('[data-kl=mfilter][data-v=attn]').getAttribute('aria-pressed') === 'true');
  men.click('[data-kl=mfilter][data-v=online]');
  t('the Online filter shows only the online child', [...men.d.querySelectorAll('[data-kl-mcard]')].map(x => x.getAttribute('data-kl-mcard')).join() === kcode);
  men.click('[data-kl=mfilter][data-v=all]');
  t('Sab shows both again', men.d.querySelectorAll('[data-kl-mcard]').length === 2);
  // The Namaste box stays on top and a child can be picked by name.
  const stk = men.d.querySelector('.md-sticky');
  t('the Namaste box and the picker are in one block that stays on top (sticky)', !!stk && !!stk.querySelector('.md-hero') && !!stk.querySelector('.md-sw') && /\.md-sticky\{position:sticky;top:0/.test(men.d.documentElement.innerHTML));
  t('the picker lists every child by first name, plus Sab, Online and Dhyan chahiye', [...stk.querySelectorAll('[data-kl=mfilter]')].map(x => x.getAttribute('data-v')).join() === ['all', kcode, 'WXYZ2345', 'online', 'attn'].join() || [...stk.querySelectorAll('[data-kl=mfilter]')].map(x => x.getAttribute('data-v')).sort().join() === ['all', kcode, 'WXYZ2345', 'online', 'attn'].sort().join());
  men.click('[data-kl=mfilter][data-v=' + kcode + ']');
  t('tapping a child shows only that child and the Namaste box is still there', [...men.d.querySelectorAll('[data-kl-mcard]')].map(x => x.getAttribute('data-kl-mcard')).join() === kcode && !!men.d.querySelector('.md-sticky .md-hero') && men.d.querySelector('[data-kl=mfilter][data-v=' + kcode + ']').getAttribute('aria-pressed') === 'true');
  men.click('[data-kl=mfilter][data-v=WXYZ2345]');
  t('tapping the other child switches to that child', [...men.d.querySelectorAll('[data-kl-mcard]')].map(x => x.getAttribute('data-kl-mcard')).join() === 'WXYZ2345');
  men.click('[data-kl=mfilter][data-v=all]');
  delete db.links.WXYZ2345; delete db.mentors.WXYZ2345; delete db.pres.WXYZ2345; db.mentees.men1 = db.mentees.men1.filter(c => c !== 'WXYZ2345');
  men.click('[data-kl=mrefresh]'); await tick(200);
  t('a child keeps the same colour after a refresh', men.d.querySelector('[data-kl-mcard="' + kcode + '"]').getAttribute('style') === styleBefore);
  t('a child who stopped sharing drops out of the dashboard, and the filter chips go away', men.d.querySelectorAll('[data-kl-mcard]').length === 1 && !men.d.querySelector('[data-kl=mfilter]'));

  Object.defineProperty(kid.d, 'visibilityState', { get: () => 'hidden', configurable: true });
  await kid.w.KIDLINK._beat(true); await tick(50);
  t('the child phone going to the background writes Offline', db.pres[kcode].on === false);
  men.click('[data-kl=mrefresh]'); await tick(150);
  t('the mentor sees Offline with the last time', /Offline/.test(men.app()) && /Aakhri baar/.test(men.app()) && !!men.d.querySelector('.kl-off'));
  Object.defineProperty(kid.d, 'visibilityState', { get: () => 'visible', configurable: true });
  db.pres[kcode] = { on: true, at: Date.now() - 200000 };
  men.click('[data-kl=mrefresh]'); await tick(150);
  t('no word from the child for over 2.5 minutes counts as Offline', /Offline/.test(men.app()));
  const men2 = await boot(db, 'men2');
  men2.click('[data-act=kidmode]'); men2.click('[data-act=kidrole][data-v=mentor]'); men2.click('[data-act=kidof][data-v=kid]');
  men2.d.getElementById('kidCode').value = code; men2.click('[data-act=mentorsend]'); await tick(200);
  par.click('[data-kl=refresh]'); await tick(150);
  par.click('[data-kl=mno][data-u=men2]'); await tick(200);
  t('the parent says no: the request is gone', !db.mentors[kcode].men2);
  men2.click('[data-kl=mrefresh]'); await tick(150);
  t('that mentor no longer sees the child', !/Rahul/.test(men2.app()) && !(db.mentees.men2 || []).length);
  men2.w.close();
  // 6d. The same request shows on the child's phone, in "Parent ke liye"; a parent can approve it there if he switched that on.
  const men3 = await boot(db, 'men3');
  men3.click('[data-act=kidmode]'); men3.click('[data-act=kidrole][data-v=mentor]'); men3.click('[data-act=kidof][data-v=kid]');
  men3.d.getElementById('kidCode').value = code; men3.click('[data-act=mentorsend]'); await tick(200);
  await kid.w.KIDLINK._listenPoll(); await tick(100);
  kid.w.document.querySelector('#blPar').open = true; await tick(50);
  t('child phone: the pending request shows in Parent ke liye', /Mentor ki request/.test(kid.app()) && /mentor banna chahta hai/.test(kid.app()));
  t('child phone: Manzoor karo and Mana karo are there right away (no parent has to join)', !!kid.d.querySelector('[data-kl=kmyes][data-u=men3]') && !!kid.d.querySelector('[data-kl=kmno][data-u=men3]'));
  par.click('[data-kl=refresh]'); await tick(150);
  t('parent phone still shows the same request', !!par.d.querySelector('[data-kl=myes][data-u=men3]'));
  kid.click('[data-kl=kmyes][data-u=men3]'); await tick(250);
  t('child phone: the parent approves from here and the mentor is approved', db.mentors[kcode].men3.status === 'approved' && !kid.d.querySelector('[data-kl=kmyes]') && /manzoori mil gayi/.test(kid.app()));
  men3.click('[data-kl=mrefresh]'); await tick(150);
  t('that mentor now sees the child', /Online|Offline/.test(men3.app()));
  const men4 = await boot(db, 'men4');
  men4.click('[data-act=kidmode]'); men4.click('[data-act=kidrole][data-v=mentor]'); men4.click('[data-act=kidof][data-v=kid]');
  men4.d.getElementById('kidCode').value = code; men4.click('[data-act=mentorsend]'); await tick(200);
  await kid.w.KIDLINK._listenPoll(); await tick(100);
  kid.click('[data-kl=kmno][data-u=men4]'); await tick(250);
  t('child phone: Mana karo removes the request', !db.mentors[kcode].men4 && !kid.d.querySelector('[data-kl=kmno]'));
  t('only the status can be approved by the child phone in firestore.rules (and only to approved)', /kidOwner\(code\)\s*&& request\.resource\.data\.diff\(resource\.data\)\.affectedKeys\(\)\.hasOnly\(\['status'\]\)\s*&& request\.resource\.data\.status == 'approved'/.test(fs.readFileSync(path.join(ROOT, 'firestore.rules'), 'utf8')));
  men3.w.close(); men4.w.close(); delete db.mentors[kcode].men3;
  men.click('[data-kl=mleave]'); await tick(200);
  t('a mentor can leave a child', !db.mentors[kcode].men1 && !/Rahul/.test(men.app()));
  men.click('[data-act=csback]'); await tick(150);
  t('the mentor phone can leave Kid mode', !db.course.men1 && /Apna course chuno/.test(men.app()));
  men.w.close();

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
