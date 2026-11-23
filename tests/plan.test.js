// The optional free plan: plan-core.js (rules, server clock, gate) + the wiring in server.js / index.html / sw.js.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8').replace(/^\uFEFF/, '');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL ' + m); } };
const P = require('../plan-core.js');

(async () => {
  // config: OFF unless FREE_PLAN=on, so deploying the code changes nothing
  ok(P.readConfig({}).on === false && P.readConfig(undefined).on === false, 'off by default');
  ok(P.readConfig({ FREE_PLAN: 'off' }).on === false && P.readConfig({ FREE_PLAN: 'true' }).on === false, 'only "on" switches it on');
  const on = P.readConfig({ FREE_PLAN: ' ON ' });
  ok(on.on && on.seconds === 600 && on.chapters === 1, 'defaults: 10 minutes, 1 chapter');
  const c2 = P.readConfig({ FREE_PLAN: 'on', FREE_SECONDS: '900', FREE_CHAPTERS: '2' });
  ok(c2.seconds === 900 && c2.chapters === 2, 'env overrides');
  ok(P.readConfig({ FREE_PLAN: 'on', FREE_SECONDS: '5', FREE_CHAPTERS: '0' }).seconds === 600 && P.readConfig({ FREE_PLAN: 'on', FREE_SECONDS: 'x' }).chapters === 1, 'bad env values fall back');

  // IST day and chapter numbers
  ok(P.istDay(Date.parse('2026-11-23T18:29:59Z')) === '2026-11-23' && P.istDay(Date.parse('2026-11-23T18:30:00Z')) === '2026-11-24', 'day changes at 12:00 am IST');
  const chs = [{ t: 1 }, { t: 2 }, { t: 3 }], course = { chapters: chs };
  ok(P.chapterNo(course, chs[0]) === 1 && P.chapterNo(course, chs[2]) === 3 && P.chapterNo(course, {}) === 0 && P.chapterNo(null, chs[0]) === 0, 'chapterNo');

  // decide
  const cfg = P.readConfig({ FREE_PLAN: 'on' });
  ok(P.decide({ cfg, plus: false, admin: false, used: 0, chNo: 1 }).ok, 'free: chapter 1 with time left is allowed');
  const l = P.decide({ cfg, plus: false, admin: false, used: 0, chNo: 2 });
  ok(!l.ok && l.status === 402 && l.code === 'plan_locked' && l.kind === 'chapter', 'free: chapter 2 is locked');
  const t = P.decide({ cfg, plus: false, admin: false, used: 600, chNo: 1 });
  ok(!t.ok && t.status === 402 && t.code === 'plan_time_over' && /Plus/.test(t.error), 'free: time over');
  ok(P.decide({ cfg, plus: false, admin: false, used: 599, chNo: 1 }).ok, 'free: 599 of 600 seconds still allowed');
  ok(P.decide({ cfg, plus: true, admin: false, used: 9999, chNo: 5 }).ok && P.decide({ cfg, plus: false, admin: true, used: 9999, chNo: 5 }).ok, 'Plus and admin are never limited');
  ok(P.decide({ cfg: P.readConfig({}), plus: false, admin: false, used: 9999, chNo: 5 }).ok, 'plan off: nothing is limited');

  // usage: server clock, anti-cheat, memory + fake Firestore
  let clock = Date.parse('2026-11-23T05:00:00Z'); const now = () => clock;
  const mem = P.createUsage({ db: null, now });
  ok(await mem.get('u1') === 0, 'usage starts at 0');
  ok(await mem.add('u1', 15) === 15, 'first heartbeat adds 15');
  ok(await mem.add('u1', 15) === 16, 'a heartbeat sent at once can not claim 15 seconds (only elapsed + 1)');
  clock += 15000; ok(await mem.add('u1', 15) === 31, 'a normal heartbeat after 15 seconds adds 15');
  clock += 60000; ok(await mem.add('u1', 9999) === 51, 'one heartbeat adds at most ' + P.MAX_TICK + ' seconds');
  ok(await mem.add('u1', -5) === 51 && await mem.add('u1', 'abc') === 51, 'negative / junk seconds add nothing');
  ok(await mem.get('u2') === 0, 'users are separate');
  clock += 19 * 3600000; ok(await mem.get('u1') === 0, 'a new IST day starts at 0 again');
  clock = Date.parse('2026-11-23T05:00:00Z');

  const store = {};
  const fakeDb = { collection: () => ({ doc: id => ({ get: async () => ({ exists: id in store, data: () => store[id] }) }) }),
    runTransaction: async fn => fn({ get: async r => r.get(), set: (r, d) => { store[r._id] = Object.assign({}, store[r._id], d); } }) };
  // give the doc refs an id for the fake transaction
  fakeDb.collection = () => ({ doc: id => { const r = { _id: id, get: async () => ({ exists: id in store, data: () => store[id] }) }; return r; } });
  const dbu = P.createUsage({ db: fakeDb, now });
  ok(await dbu.add('s1', 15) === 15, 'Firestore usage: first add');
  clock += 15000; ok(await dbu.add('s1', 15) === 30, 'Firestore usage: second add');
  const key = Object.keys(store)[0];
  ok(/^s1_2026-11-23$/.test(key) && store[key].secs === 30 && store[key].expireAt instanceof Date, 'saved as dailyUsage/<uid>_<IST day> with secs and expireAt');
  const bad = P.createUsage({ db: { collection: () => { throw new Error('down'); } }, now, log: { error() {} } });
  ok(await bad.add('s2', 10) === 10 && await bad.get('s2') === 10, 'Firestore down: falls back to memory, never throws');

  // gate
  const byId = id => id === 'q1' ? { course, ch: chs[0] } : id === 'q2' ? { course, ch: chs[1] } : undefined;
  let plus = false, admin = false, usedNow = 0;
  const gate = P.makeGate({ cfg, usage: { get: async () => usedNow }, isPlus: async () => plus, isAdmin: () => admin, byId });
  const rq = body => ({ body, user: { uid: 'u' } });
  ok((await gate(rq({ id: 'q1' }))).ok, 'gate: chapter 1 passes');
  ok((await gate(rq({ id: 'q2' }))).code === 'plan_locked', 'gate: chapter 2 blocked');
  ok((await gate(rq({ id: 'q2|more' }))).code === 'plan_locked', 'gate: 3-dot extra results (id|kind) follow the question');
  usedNow = 600; ok((await gate(rq({ id: 'q1' }))).code === 'plan_time_over', 'gate: time over blocked');
  ok((await gate(rq({ id: 'nope' }))).ok && (await gate(rq({ cq: { text: 'x' } }))).ok, 'gate: unknown ids and custom courses are left to the route');
  plus = true; ok((await gate(rq({ id: 'q2' }))).ok, 'gate: Plus passes'); plus = false;
  admin = true; ok((await gate(rq({ id: 'q2' }))).ok, 'gate: admin passes'); admin = false;
  const off = P.makeGate({ cfg: P.readConfig({}), usage: { get: async () => 9999 }, isPlus: async () => false, isAdmin: () => false, byId });
  ok((await off(rq({ id: 'q2' }))).ok, 'gate: plan off passes everything');

  // wiring
  const srv = read('server.js'), html = read('public/index.html'), sw = read('public/sw.js'), rules = read('firestore.rules');
  ok(srv.includes("require('./plan-core.js')") && srv.includes("app.post('/api/plan'") && srv.includes("app.post('/api/plan/tick'"), 'server.js has the plan routes');
  ok(/PLAN_GATED = new Set\(\[[^\]]*'\/answer'[^\]]*'\/translate'[^\]]*'\/visual'/.test(srv), 'server gates the AI routes');
  ok(srv.indexOf('PLAN_GATE(req)') > 0 && srv.indexOf('PLAN_GATE(req)') < srv.indexOf('express.static(path.join(__dirname'), 'the plan gate runs before the static files and routes');
  ok(/match \/dailyUsage\/\{id\}\s*\{\s*allow read, write: if false;/.test(rules), 'the app can not touch dailyUsage (students can not reset their time)');
  ok(html.includes('<script src="/plan.js"></script>') && sw.includes("'/plan.js'"), 'plan.js is loaded and cached');
  ok(/async function hasAccess\(req, v\) \{\s*if \(process\.env\.REQUIRE_SUBSCRIPTION !== 'true' \|\| v\.free\) return true;/.test(srv), 'existing paid-video check (hasAccess) is unchanged');
  const C = require('../public/plan.js');
  ok(C._t.fmt(600) === '10:00' && C._t.fmt(59) === '00:59' && C._t.fmt(-3) === '00:00' && C._t.fmt(61) === '01:01', 'countdown format');

  // the two pages (same words as the design pictures)
  const txt = s => s.replace(/<[^>]+>/g, '|').replace(/\|+/g, '|');
  const over = txt(C._t.overHTML());
  ok(over.includes('Aaj ka free time khatam') && over.includes('Kal phir aao, ya Plus lo.') && over.includes('Plus lo') && over.includes('Jo answers device mein saved hai, wo offline dekh sakte ho.'), 'free time over page: title, line, Plus lo button, offline note');
  ok(/<svg[^>]*>[\s\S]*<circle[\s\S]*<\/svg>/.test(C._t.overHTML()) && /data-plan="plans"/.test(C._t.overHTML()), 'free time over page: clock icon (line svg, no emoji) and the button opens the plans');
  const st = { seconds: 600, chapters: 1, plus: false, pay: { enabled: true, rupees: 99, days: 365 }, canPay: true };
  const pl = txt(C._t.plansHTML(st));
  ['Orbit Plus', 'Free mein roz 10 minute. Plus mein koi limit nahi.', 'Rs 0', 'Roz 10 minute', 'Sirf Chapter 1', 'AI Answer, translation, diagram, Get Video', 'Aapka current plan',
    'Rs 99', '/ 365 din', 'Unlimited study time', 'Saare chapters', 'Saare video lessons', 'Study-time alert (father ke phone par)', 'Plus lo', 'UPI, card, netbanking (Razorpay)']
    .forEach(w => ok(pl.includes(w), 'plans page says: ' + w));
  ok(/data-plan="buy"[^>]*>Plus lo/.test(C._t.plansHTML(st)) && !/data-plan="buy"[^>]* disabled/.test(C._t.plansHTML(st)), 'plans page: Plus lo button is on and starts the payment');
  ok(/data-plan="buy"[^>]* disabled/.test(C._t.plansHTML({ ...st, pay: { enabled: false } })) && txt(C._t.plansHTML({ ...st, pay: { enabled: false } })).includes('Payment abhi shuru nahi hua hai.'), 'plans page: payment not started -> button off, clear note');
  ok(!txt(C._t.plansHTML({ ...st, plus: true })).includes('Aapka current plan'), 'plans page: a Plus student is not told Free is the current plan');
  ok(txt(C._t.plansHTML({ ...st, seconds: 900, chapters: 2 })).includes('Roz 15 minute') && txt(C._t.plansHTML({ ...st, seconds: 900, chapters: 2 })).includes('Pehle 2 chapters'), 'plans page follows FREE_SECONDS / FREE_CHAPTERS');
  ok(!txt(C._t.plansHTML({ ...st, pay: { enabled: true, rupees: '<b>9', days: 1 } })).includes('<b>9') && C._t.plansHTML({ ...st, pay: { enabled: true, rupees: '<b>9', days: 1 } }).includes('&lt;b&gt;9'), 'plans page: every value is escaped');
  // the app opens the pages as views, and the client code never assigns innerHTML
  const plansrc = read('public/plan.js');
  ok(/else if\(VIEW==='plan'\|\|VIEW==='planover'\)body=window\.PLAN\?PLAN\.viewHTML\(VIEW\):''/.test(html) && html.includes('window.orbitGo=v=>go(v)') && html.includes('window.orbitView=()=>VIEW'), 'index.html draws the two plan views and exports orbitGo / orbitView');
  ok(!/\.(innerHTML|outerHTML)\s*\+?=/.test(plansrc) && !/insertAdjacentHTML|document\.write|eval\(/.test(plansrc), 'plan.js has no HTML sinks');
  ok(/const SHELL = 'orbit-shell-v(7[2-9]|[89]\d|\d{3,})'/.test(sw), 'service worker cache version moved up (phones must get the new plan.js and index.html)');
  console.log(pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})();
