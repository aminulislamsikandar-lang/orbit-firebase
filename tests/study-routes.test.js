// "Padhai ka time" stage 2: plan cleaning, Indian-time day, one-time parent code, who may read or change what, the alert rules,
// dead push addresses, and the cron key. The handlers run against a tiny in-memory Firestore, no network and no Express.
const assert = require('assert'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const C = require('../study-core'), R = require('../study-routes');
let pass = 0, fail = 0;
const t = (name, ok, extra) => { if (ok) pass++; else { fail++; console.log('FAIL  ' + name + (extra ? '  ' + extra : '')); } };

// ---- minimal Firestore: collection/doc/get/set/update/delete, where('a.b','==',x), limit, runTransaction ----
function fakeDb() {
  const data = {}, col = n => (data[n] = data[n] || {});
  const getPath = (o, p) => p.split('.').reduce((a, k) => (a == null ? undefined : a[k]), o);
  const clone = x => (x === undefined ? undefined : JSON.parse(JSON.stringify(x)));
  const snapOf = (n, id) => { const v = col(n)[id]; return { exists: v !== undefined, id, data: () => clone(v), ref: docRef(n, id) }; };
  function docRef(n, id) { return { id, get: async () => snapOf(n, id), set: async v => { col(n)[id] = clone(v); }, update: async v => { col(n)[id] = { ...col(n)[id], ...clone(v) }; }, delete: async () => { delete col(n)[id]; } }; }
  const query = (n, f) => ({ where: (p, op, v) => query(n, rows => f(rows).filter(r => getPath(r, p) === v)), limit: () => query(n, f),
    get: async () => ({ docs: f(Object.entries(col(n)).map(([id, v]) => ({ ...clone(v), __id: id }))).map(r => snapOf(n, r.__id)) }) });
  return { _: data, collection: n => ({ doc: id => docRef(n, id), where: (p, op, v) => query(n, x => x).where(p, op, v) }),
    runTransaction: async fn => { const writes = []; const tx = { get: async r => r.get(), set: (r, v) => writes.push(() => r.set(v)), update: (r, v) => writes.push(() => r.update(v)), delete: r => writes.push(() => r.delete()) }; await fn(tx); for (const w of writes) await w(); } };
}
const sent = []; let pushErr = null;
const webpush = { sendNotification: async (sub, body) => { if (pushErr && pushErr(sub)) throw Object.assign(new Error('gone'), { statusCode: pushErr(sub) }); sent.push({ ep: sub.endpoint, body: JSON.parse(body) }); } };
const T0 = Date.UTC(2026, 10, 16, 10, 0);   // Mon 2026-11-16 15:30 IST
let clock = T0; const now = () => clock;
const mk = (db, wp) => R.make({ db, webpush: wp === undefined ? webpush : wp, now, env: { VAPID_PUBLIC_KEY: 'PUB', STUDY_CRON_KEY: 'secret-cron-key-123' } });
const SUB = n => ({ endpoint: 'https://push.example/' + n, keys: { p256dh: 'BPKkey' + n, auth: 'auth' + n } });

(async () => {
  // ---- core ----
  t('IST day: 18:30 UTC is already the next Indian day', C.istNow(Date.UTC(2026, 10, 16, 18, 30)).day === '2026-11-17' && C.istNow(Date.UTC(2026, 10, 16, 18, 30)).min === 0);
  t('cleanPlan keeps what is valid only', JSON.stringify(C.cleanPlan({ on: true, name: ' A  B ', time: '25:00', mins: 7, days: [1, 1, 9, 3], course: 'c2-as<script>', ch: 500 })) === JSON.stringify({ on: true, name: 'A B', time: '17:00', mins: 20, days: [1, 3], course: 'c2-asscript', ch: 0, cls: 1, subj: ['ginti', 'eng', 'evs'] }));
  t('cleanPlan: class 1 to 3 only, subjects in fixed order and never empty', C.cleanPlan({ cls: 7 }).cls === 1 && C.cleanPlan({ cls: '3' }).cls === 3 && JSON.stringify(C.cleanPlan({ subj: ['evs', 'asm', 'junk'] }).subj) === '["asm","evs"]' && JSON.stringify(C.cleanPlan({ subj: ['junk'] }).subj) === '["ginti","eng","evs"]' && JSON.stringify(C.cleanPlan({ subj: [] }).subj) === '["ginti","eng","evs"]');
  t('cleanPlan: on must be exactly true', C.cleanPlan({ on: 'yes' }).on === false);
  const codes = new Set(); for (let i = 0; i < 300; i++) codes.add(C.newCode());
  t('codes: 6 easy letters/digits, no look-alikes, no repeats in 300', [...codes].every(c => C.validCode(c) && !/[01OI]/.test(c)) && codes.size === 300);
  t('code typed with spaces, dash and small letters still works', C.normCode(' abc-d 23 ') === 'ABCD23');
  t('subscription: https only, three fields only', C.cleanSub({ endpoint: 'http://x', keys: {} }) === null && C.cleanSub({ endpoint: 'https://a/b', keys: { p256dh: 'ab-_=', auth: 'cd' }, extra: 1 }).extra === undefined && C.cleanSub({ endpoint: 'https://a', keys: { p256dh: '<x>', auth: 'a' } }) === null);
  t('timing-safe compare', C.safeEq('abc', 'abc') && !C.safeEq('abc', 'abd') && !C.safeEq('', '') && !C.safeEq('abc', 'abcd'));

  const db = fakeDb(), S = mk(db);
  const child = { uid: 'child1' }, dad = { uid: 'dad1' }, stranger = { uid: 'x9' };
  const plan = { on: true, name: 'Rahul', time: '17:00', mins: 20, days: [0, 1, 2, 3, 4, 5, 6], course: 'c2-assamese', ch: 1 };
  const call = (h, who, body, query) => S[h]({ uid: who.uid, body: body || {}, query: query || {}, headers: {} });

  // ---- ids ----
  for (const bad of ['a/b', '../x', 'a.b', '', 'x'.repeat(129)]) { const q = await S.planGet({ uid: 'child1', query: { child: bad }, body: {}, headers: {} }); if (bad !== '') t('bad child id refused: ' + bad.slice(0, 12), q.status === 400); }
  t('unlink with a bad id refused', (await call('unlink', child, { parent: 'a/b' })).status === 400 && (await call('planSet', child, { child: 'a/b', plan })).status === 400);

  // ---- no database ----
  t('no service account -> clear 503, not a crash', (await mk(null).planGet({ uid: 'a', query: {} })).status === 503);

  // ---- plan + link ----
  let r = await call('linkNew', child); t('code needs a saved plan first', r.status === 400 && r.body.code === 'no_plan');
  r = await call('planSet', child, { plan }); t('child saves plan', r.status === 200 && r.body.plan.name === 'Rahul');
  r = await call('planSet', dad, { child: 'child1', plan }); t('a stranger cannot change a child plan', r.status === 403);
  r = await call('planSet', dad, { child: 'nobody', plan }); t('a parent cannot create a plan for a child', r.status === 403);
  r = await call('linkNew', child); const code = r.body.code; t('child gets a code valid for 15 minutes', r.status === 200 && C.validCode(code) && r.body.expiresAt - T0 === 15 * 60000);
  const code2 = (await call('linkNew', child)).body.code; t('a new code replaces the old one', Object.keys(db._.studyLinks).length === 1 && code2 !== code);
  r = await call('linkJoin', dad, { code }); t('old code no longer works', r.status === 404);
  r = await call('linkJoin', child, { code: code2 }); t('own code refused', r.status === 400);
  clock = T0 + 16 * 60000; r = await call('linkJoin', dad, { code: code2 }); t('expired code refused', r.status === 404); clock = T0;
  r = await call('linkJoin', dad, { code: code2.toLowerCase() }); t('parent joins with the code (case does not matter)', r.status === 200 && r.body.child === 'child1' && r.body.name === 'Rahul');
  t('code is single use', !db._.studyLinks[code2] && (await call('linkJoin', stranger, { code: code2 })).status === 404);
  r = await call('planGet', dad, null, { child: 'child1' }); t('linked parent can read the plan', r.status === 200 && r.body.plan.time === '17:00' && r.body.linked === 1);
  r = await call('planGet', stranger, null, { child: 'child1' }); t('stranger cannot read it', r.status === 403);
  r = await call('planSet', dad, { child: 'child1', plan: { ...plan, time: '18:30', mins: 30 } }); t('father changes the time from his phone', r.status === 200 && db._.studyPlans.child1.plan.time === '18:30' && db._.studyPlans.child1.parents.length === 1);
  r = await call('planGet', child); t('child phone sees the new plan and linked count', r.body.plan.time === '18:30' && r.body.linked === 1 && r.body.updatedAt === T0);
  // brute force guess of codes
  let last; for (let i = 0; i < 9; i++) last = await call('linkJoin', stranger, { code: 'ZZZZZ' + i.toString().replace(/[01]/g, '2') }); t('guessing codes is stopped after 8 tries an hour', last.status === 429);
  // 3 parents max
  for (const u of ['mum', 'uncle']) { const c = (await call('linkNew', child)).body.code; r = await call('linkJoin', { uid: u }, { code: c }); t('parent ' + u + ' joins', r.status === 200); }
  { const c = (await call('linkNew', child)).body.code; r = await call('linkJoin', { uid: 'aunt' }, { code: c }); t('a 4th parent is refused', r.status === 400); }

  // ---- push address + children list ----
  r = await call('pushSubscribe', dad, { sub: { endpoint: 'http://bad', keys: {} } }); t('bad subscription refused', r.status === 400);
  r = await call('pushSubscribe', dad, { sub: SUB('A') }); t('father subscribes', r.status === 200 && r.body.subs === 1);
  await call('pushSubscribe', dad, { sub: SUB('A') }); r = await call('pushSubscribe', dad, { sub: SUB('B') }); t('same address twice is stored once', r.body.subs === 2);
  r = await call('children', dad); t('children list: name, plan and today', r.body.children.length === 1 && r.body.children[0].name === 'Rahul' && r.body.children[0].today.started === false && r.body.subs === 2);

  // ---- alert rules ----
  const tick = async ms => { clock = ms; return S.tickCore(ms); };
  const ist = (h, m, dayOffset) => Date.UTC(2026, 10, 16 + (dayOffset || 0), h - 5, m - 30);   // Indian clock time -> UTC ms
  await call('planSet', dad, { child: 'child1', plan: { ...plan, time: '17:00', mins: 20 } });
  sent.length = 0;
  r = await tick(ist(17, 5)); t('before the 10 minute grace: quiet', r.alerted === 0 && sent.length === 0);
  r = await tick(ist(17, 10)); t('10 minutes after the time and not started: alert', r.alerted === 1 && sent.length === 2 && /Rahul ka padhai ka time 5:00 PM/.test(sent[0].body.body));
  sent.length = 0; r = await tick(ist(17, 11)); t('only one alert a day', r.alerted === 0 && sent.length === 0);
  r = await tick(ist(17, 10, 1)); t('next day it alerts again', r.alerted === 1);
  sent.length = 0;
  // started -> no alert; done -> one summary
  clock = ist(17, 3, 2); await call('event', child, { type: 'started' });
  clock = ist(17, 12, 2); r = await S.tickCore(clock); t('child started: no alert', r.alerted === 0 && sent.length === 0);
  clock = ist(17, 25, 2); await call('event', child, { type: 'done', mins: 30, q: 8, ok: 6 }); t('done: one summary to every device, with the question numbers', sent.length === 2 && /30 minute/.test(sent[0].body.body) && /8 sawaal mein 6 sahi/.test(sent[0].body.body));
  r = await call('children', dad); t('father list carries the question numbers', r.body.children[0].today.q === 8 && r.body.children[0].today.ok === 6);
  t('numbers are clamped: ok never above asked, asked never above 60', (() => { const x = C.applyEvent(null, { type: 'done', mins: 20, q: 999, ok: 5000 }, clock); return x.q === 60 && x.ok === 60; })() && (() => { const x = C.applyEvent(null, { type: 'done', mins: 20, q: 'x', ok: -3 }, clock); return x.q === 0 && x.ok === 0; })() && C.donePayload({ name: 'A' }, 20, 0, 0).body === 'A ne aaj 20 minute padhai poori ki.');
  sent.length = 0; await call('event', child, { type: 'done', mins: 30 }); t('summary is sent once a day', sent.length === 0);
  r = await call('event', child, { type: 'bogus' }); t('unknown event refused', r.status === 400);
  // windows and days
  await call('planSet', dad, { child: 'child1', plan: { ...plan, time: '17:00', days: [2] } }); sent.length = 0;
  r = await tick(ist(17, 30, 3)); t('Thursday is not a study day when only Tuesday is chosen: quiet', r.alerted === 0 && new Date(ist(17, 30, 3)).getUTCDay() === 4);
  await call('planSet', dad, { child: 'child1', plan: { ...plan, time: '17:00', days: [0, 1, 2, 3, 4, 5, 6] } });
  r = await tick(ist(23, 0, 5)); t('a server that wakes up at 11 pm does not alert for a 5 pm plan', r.alerted === 0);
  await call('planSet', dad, { child: 'child1', plan: { ...plan, on: false } }); r = await tick(ist(17, 30, 6)); t('switched off plan: quiet', r.alerted === 0);
  await call('planSet', dad, { child: 'child1', plan }); clock = ist(17, 30, 7);

  // ---- dead addresses removed ----
  pushErr = s => (s.endpoint.endsWith('/A') ? 410 : 0); sent.length = 0; r = await tick(ist(17, 30, 8));
  t('a 410 address is removed, the other still gets the push', db._.studyParents.dad1.subs.length === 1 && db._.studyParents.dad1.subs[0].endpoint.endsWith('/B') && sent.length === 1); pushErr = null;

  // ---- unlink ----
  r = await call('unlink', child, { parent: 'mum' }); t('child removes one parent', r.status === 200 && !db._.studyPlans.child1.parents.includes('mum') && !(db._.studyParents.mum.children || []).includes('child1'));
  r = await call('unlink', dad, { child: 'child1' }); t('parent leaves', !db._.studyPlans.child1.parents.includes('dad1') && db._.studyParents.dad1.children.length === 0);
  r = await call('children', dad); t('after leaving, the child is gone from the list', r.body.children.length === 0);
  await call('unlink', child, {}); t('child removes everyone', db._.studyPlans.child1.parents.length === 0);
  sent.length = 0; r = await tick(ist(17, 30, 9)); t('no parents -> no alert', r.alerted === 0 && sent.length === 0);

  // ---- cron key ----
  r = await S.tick({ headers: {}, query: {} }); t('tick without key refused', r.status === 403);
  r = await S.tick({ headers: {}, query: { key: 'nope' } }); t('tick with wrong key refused', r.status === 403);
  r = await S.tick({ headers: { 'x-cron-key': 'secret-cron-key-123' }, query: {} }); t('tick with the right key (header) works', r.status === 200 && typeof r.body.checked === 'number');
  r = await S.tick({ headers: {}, query: { key: 'secret-cron-key-123' } }); t('tick with the right key (query) works', r.status === 200);
  r = await mk(db, null).tick({ headers: { 'x-cron-key': 'secret-cron-key-123' }, query: {} }); t('no VAPID keys -> 503 with a clear message', r.status === 503);
  r = await mk(db).config(); t('config gives only the PUBLIC key', r.body.vapid === 'PUB' && r.body.ready === true);

  // ---- server.js wiring ----
  const srv = fs.readFileSync(path.join(ROOT, 'server.js'), 'utf8');
  for (const k of ["req.path === '/study/tick'", "app.get('/api/study/tick'", "app.post('/api/study/link/join'", "app.post('/api/study/event'", 'setVapidDetails', "require('./study-routes')"]) t('server.js: ' + k, srv.includes(k));
  t('private key never sent to the browser', !/VAPID_PRIVATE_KEY[^\n]*res\.|res\.[^\n]*VAPID_PRIVATE/.test(srv));
  const rules = fs.readFileSync(path.join(ROOT, 'firestore.rules'), 'utf8');
  t('study collections have no browser rule (closed)', !/study(Plans|Links|Parents)/.test(rules));
  t('web-push pinned in package.json', JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).dependencies['web-push'] === '3.6.7');
  console.log(pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
})().catch(e => { console.error('CRASH', e); process.exit(1); });
