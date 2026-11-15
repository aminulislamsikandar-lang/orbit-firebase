// Phase 2: daily limits in Firestore (Task 13), the friendly limit message (Task 14) and the Recall tracker in the student's account (Task 15).
// limits-core.js runs against a fake Firestore (restart = a new quota object on the same fake database), the limit message in all four languages,
// the server wiring, the Firestore rules text, and the Recall page merge/sync in a fake browser (jsdom; skipped when it is missing).
// Note: the fake database runs transactions one after another. It proves OUR logic is inside one transaction; Firestore itself does the real locking.
// Run: node tests/limits.test.js
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
const L = require(path.join(ROOT, 'limits-core.js'));
const M = require(path.join(ROOT, 'public', 'limit-msg.js'));
let pass = 0, fail = 0;
const t = (name, ok, extra) => { if (ok) pass++; else { fail++; console.log('FAIL  ' + name + (extra ? '  ' + extra : '')); } };

// ---- a tiny fake of the Admin SDK calls limits-core uses ----
function fakeDb(opts) {
  opts = opts || {};
  const docs = new Map(), stats = { reads: 0, writes: 0, txs: 0 };
  let chain = Promise.resolve();
  const snap = id => ({ exists: docs.has(id), data: () => (docs.has(id) ? JSON.parse(JSON.stringify(docs.get(id))) : undefined) });
  const ref = (col, id) => ({ col, id: col + '/' + id, async get() { if (opts.fail) throw new Error('firestore down'); stats.reads++; return snap(col + '/' + id); } });
  const db = {
    docs, stats,
    collection: col => ({ doc: id => ref(col, id) }),
    runTransaction(fn) {
      const run = async () => {
        if (opts.fail) throw new Error('firestore down');
        stats.txs++;
        const pending = [];
        const tx = { get: async r => { stats.reads++; return snap(r.id); }, set: (r, data, o) => { pending.push([r.id, data, o]); } };
        const out = await fn(tx);
        for (const [id, data, o] of pending) { stats.writes++; docs.set(id, o && o.merge ? { ...(docs.get(id) || {}), ...data } : data); }
        return out;
      };
      const p = chain.then(run, run); chain = p.catch(() => {}); return p;
    }
  };
  return db;
}
let clock = Date.UTC(2026, 10, 14, 5, 0, 0);   // 14 Nov 2026, 10:30 IST
const now = () => clock;
const silent = { error() {}, warn() {}, log() {} };
const mk = (db, kind, max) => L.createStoredQuota({ db, kind, max, now, log: silent });

(async () => {
  // ================= Task 13: limits-core.js =================
  {
    const db = fakeDb(), q = mk(db, 'ai', 3);
    t('uses up to the limit, then refused', (await q.take('u1')) && (await q.take('u1')) && (await q.take('u1')) && !(await q.take('u1')));
    t('left() counts down to zero', (await q.left('u1')) === 0 && (await q.left('u2')) === 3);
    const doc = db.docs.get('dailyUsage/u1_2026-11-14');
    t('one small document per student per IST day, with the three counters in it', !!doc && doc.uid === 'u1' && doc.day === '2026-11-14' && doc.ai === 3 && db.docs.size === 1);
    t('the document has an expireAt (for a Firestore TTL policy) about two days ahead', doc.expireAt instanceof Date && doc.expireAt.getTime() === clock + 2 * 86400000);
    const w = db.stats.writes; await q.take('u1'); t('a refused use writes nothing', db.stats.writes === w);
    t('each allowed use is one transaction with one write', db.stats.writes === 3 && db.stats.txs >= 3);
  }
  {   // the main point of Task 13: a restart (new server process) must not give the uses back
    const db = fakeDb();
    const before = mk(db, 'recall', 1); await before.take('kid');
    const afterRestart = mk(db, 'recall', 1);
    t('after a restart the count is still there: no free second check', !(await afterRestart.take('kid')) && (await afterRestart.left('kid')) === 0);
    t('another student is not affected', await afterRestart.take('other'));
  }
  {   // three kinds share one document
    const db = fakeDb(), r = mk(db, 'recall', 1), a = mk(db, 'ai', 40), p = mk(db, 'photos', 8);
    await r.take('u'); await a.take('u'); await a.take('u'); await p.take('u');
    const d = db.docs.get('dailyUsage/u_2026-11-14');
    t('Recall, AI calls and photos are three counters of the same document', db.docs.size === 1 && d.recall === 1 && d.ai === 2 && d.photos === 1);
    t('a refund only touches its own counter', (await a.refund('u'), db.docs.get('dailyUsage/u_2026-11-14').ai === 1 && db.docs.get('dailyUsage/u_2026-11-14').recall === 1));
  }
  {
    const db = fakeDb(), q = mk(db, 'photos', 2);
    await q.take('u'); await q.refund('u'); await q.refund('u'); await q.refund('nobody');
    t('refund never goes below zero, and gives one use back', (await q.left('u')) === 2 && (await q.left('nobody')) === 2);
    t('a refund of a student with no document creates none', !db.docs.has('dailyUsage/nobody_2026-11-14'));
  }
  {   // two requests at the same moment can not both get the last use
    const db = fakeDb(), q = mk(db, 'ai', 3);
    const res = await Promise.all(Array.from({ length: 8 }, () => q.take('race')));
    t('8 requests at once, limit 3: exactly 3 get through', res.filter(Boolean).length === 3 && db.docs.get('dailyUsage/race_2026-11-14').ai === 3);
  }
  {   // a new IST day starts again; the day changes at 18:30 UTC
    const db = fakeDb(), q = mk(db, 'recall', 1);
    clock = Date.UTC(2026, 10, 14, 18, 29, 0); await q.take('u'); const refusedBefore = !(await q.take('u'));
    clock = Date.UTC(2026, 10, 14, 18, 31, 0); const openAfter = await q.take('u');
    t('limit starts again at midnight IST (18:30 UTC), not midnight UTC', refusedBefore && openAfter && db.docs.has('dailyUsage/u_2026-11-14') && db.docs.has('dailyUsage/u_2026-11-15'));
    clock = Date.UTC(2026, 10, 14, 5, 0, 0);
  }
  {   // Firestore problems must not stop the app or open the limit wide
    const db = fakeDb({ fail: true }), logs = [], q = L.createStoredQuota({ db, kind: 'ai', max: 2, now, log: { error: m => logs.push(m) } });
    t('Firestore down: the in-memory count is used, so the limit still holds', (await q.take('u')) && (await q.take('u')) && !(await q.take('u')));
    t('... left() and refund() also work, and nothing throws', (await q.left('u')) === 0 && (await q.refund('u'), (await q.left('u')) === 1));
    t('... and the problem is logged without the student id', logs.length >= 3 && logs.every(l => /\[limits\]/.test(l) && !/\bu\b.*u_2026/.test(l)));
    const none = L.createStoredQuota({ db: null, kind: 'photos', max: 1, now, log: silent });
    t('no Firestore at all (no service account): memory only, same behaviour', (await none.take('x')) && !(await none.take('x')) && (await none.left('x')) === 0);
    t('an unknown kind is refused early', (() => { try { L.createStoredQuota({ db: null, kind: 'video', max: 1 }); return false; } catch (e) { return true; } })());
  }
  {
    const sa = { client_email: 'a@b.iam.gserviceaccount.com', private_key: '-----BEGIN PRIVATE KEY-----\nx\n-----END PRIVATE KEY-----\n', project_id: 'p' };
    t('service account: plain JSON and base64 JSON both work', L.parseServiceAccount(JSON.stringify(sa)).client_email === sa.client_email && L.parseServiceAccount(Buffer.from(JSON.stringify(sa)).toString('base64')).project_id === 'p');
    t('service account: empty, garbage or incomplete = null (the server then uses memory)', ['', '   ', undefined, 'nope', '{"a":1}', JSON.stringify({ client_email: 'x' })].every(x => L.parseServiceAccount(x) === null));
  }

  // ================= Task 13: server wiring + rules =================
  const src = read('server.js'), rules = read('firestore.rules');
  t('server: the three limits are stored quotas on the Firestore handle', /createStoredQuota\(\{ db: FSDB, kind: 'recall'/.test(src) && /createStoredQuota\(\{ db: FSDB, kind: 'ai'/.test(src) && /createStoredQuota\(\{ db: FSDB, kind: 'photos'/.test(src));
  t('server: no more in-memory FREE_USED map', !/FREE_USED/.test(src));
  t('server: Firestore handle exists only with a service account; login check does not need one', /FIREBASE_SERVICE_ACCOUNT/.test(src) && /if \(sa\) FSDB = admin\.firestore\(\)/.test(src) && /verifyIdToken/.test(src));
  t('server: every AI route waits for guardAI (18 routes, none without await)', (src.replace('async function guardAI(req, res)', '').match(/guardAI\(req, res\)/g) || []).length === (src.match(/await guardAI\(req, res\)/g) || []).length && (src.match(/await guardAI\(req, res\)/g) || []).length === 18);
  t('rules: dailyUsage is closed to the app (only the server, through the Admin SDK, uses it)', /match \/dailyUsage\/\{id\}\s*\{\s*allow read, write: if false;/.test(rules));
  const code = rules.split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
  t('rules: braces are balanced', (code.match(/\{/g) || []).length === (code.match(/\}/g) || []).length);
  t('rules: the per-user rule (which covers users/<uid>/recall/tracker) is still there', /match \/users\/\{uid\}\/\{document=\*\*\}\s*\{\s*allow read, write: if request\.auth != null && request\.auth\.uid == uid;/.test(rules));

  // routes, run with fakes: Recall free check + photo route
  const cut = (from, to) => { const i = src.indexOf(from), j = src.indexOf(to, i + 1); if (i < 0 || j < 0) throw new Error('marker missing: ' + from); return src.slice(i, j); };
  const mkRes = () => { const r = { code: 200, body: null }; r.status = c => { r.code = c; return r; }; r.json = b => { r.body = b; return r; }; return r; };
  {
    const rs = src.indexOf("app.post('/api/recall/evaluate'"), route = src.slice(rs, src.indexOf('\n});', rs) + 4);
    const quota = mk(fakeDb(), 'recall', 1), handlers = {}, calls = [];
    let script = [];
    const RECALL = { findChapter: () => ({ course: { class: 7, subject: 'Science' }, ch: { title: 'Light' } }), WEIGHTS: { concept: {} }, isReady: () => true, MIN_CHARS: 5, MAX_CHARS: 1500, LANGS: { en: 'English' }, SYSTEM: 's', buildPrompt: () => 'p', parseResult: txt => (txt === 'good' ? { total: 70 } : null), checkAudio: () => ({ ok: false }) };
    new Function('app', 'RECALL', 'QUIZ', 'userKeyOf', 'guardAI', 'takeFree', 'refundFree', 'freeLeft', 'geminiFor', 'failMsgFor', 'topicsOf', 'TOPICS', route)(
      { post: (p, fn) => { handlers[p] = fn; } }, RECALL, {}, r => String((r.headers || {})['x-user-key'] || ''), async () => true,
      u => quota.take(u), u => quota.refund(u), u => quota.left(u),
      async () => { calls.push(1); return script.shift() || { text: 'good' }; }, () => 'AI error', async () => null, {});
    const go = async key => { const rs2 = mkRes(); await handlers['/api/recall/evaluate']({ body: { course: 'c', ch: 1, type: 'concept', text: 'a long enough answer here', lang: 'en' }, headers: key ? { 'x-user-key': key } : {}, user: { uid: 'kid' } }, rs2); return rs2; };
    let r = await go();
    t('recall: first free check works and says 0 are left', r.code === 200 && r.body.total === 70 && r.body.left === 0);
    r = await go();
    t('recall: second one = 429 with code limit_reached, kind recall, and no AI call', r.code === 429 && r.body.code === 'limit_reached' && r.body.kind === 'recall' && r.body.left === 0 && calls.length === 1);
    r = await go('AIza' + 'o'.repeat(30));
    t('recall: the parent\'s key has no limit, "left" is null, nothing is counted', r.code === 200 && r.body.left === null && calls.length === 2);
    const fresh = mk(fakeDb(), 'recall', 1); script = [{ text: 'garbage' }];
    // a failed check gives the free one back (uses the same quota object through takeFree/refundFree)
    const quota2 = fresh; const h2 = {}; 
    new Function('app', 'RECALL', 'QUIZ', 'userKeyOf', 'guardAI', 'takeFree', 'refundFree', 'freeLeft', 'geminiFor', 'failMsgFor', 'topicsOf', 'TOPICS', route)(
      { post: (p, fn) => { h2[p] = fn; } }, RECALL, {}, () => '', async () => true, u => quota2.take(u), u => quota2.refund(u), u => quota2.left(u), async () => ({ text: 'garbage' }), () => 'AI error', async () => null, {});
    const rs3 = mkRes(); await h2['/api/recall/evaluate']({ body: { course: 'c', ch: 1, type: 'concept', text: 'a long enough answer here' }, headers: {}, user: { uid: 'kid2' } }, rs3);
    t('recall: a failed check does not use up the free one', rs3.code === 502 && (await quota2.left('kid2')) === 1);
  }
  {
    const qs = src.indexOf("app.get('/api/recall/quota'"), line = src.slice(qs, src.indexOf('\n', qs));
    const quota = mk(fakeDb(), 'recall', 1), h = {};
    new Function('app', 'freeLeft', line)({ get: (p, fn) => { h[p] = fn; } }, u => quota.left(u));
    const rs = mkRes(); await h['/api/recall/quota']({ user: { uid: 'kid' } }, rs);
    t('recall quota route: waits for the stored count', rs.body && rs.body.left === 1);
  }
  t('video daily-limit answers carry the same code (message only; those counts are unchanged)', (src.match(/code: 'limit_reached', kind: 'video'/g) || []).length === 2);

  // ================= Task 14: the message =================
  const kinds = ['recall', 'ai', 'photos', 'video'], langs = ['en', 'hing', 'as', 'bn'];
  t('every language has a message for every kind', langs.every(l => kinds.every(k => typeof M.MSG[l][k] === 'string' && M.MSG[l][k].length > 20)));
  t('Assamese and Bengali messages are in their own script, Hindi in Devanagari, English in Latin', /[\u0980-\u09FF]/.test(M.limitMessage('as', 'ai')) && /[\u0980-\u09FF]/.test(M.limitMessage('bn', 'ai')) && M.limitMessage('as', 'ai') !== M.limitMessage('bn', 'ai') && /[\u0900-\u097F]/.test(M.limitMessage('hing', 'ai')) && !/[^\x00-\x7F]/.test(M.limitMessage('en', 'ai')));
  t('every message says: finished today, come back tomorrow / parent key (no scary words, no error code)', langs.every(l => kinds.every(k => !/error|fail|429|server/i.test(M.MSG[l][k]))) && /tomorrow/.test(M.MSG.en.ai) && /parent/.test(M.MSG.en.ai));
  t('unknown language falls back to Hindi, unknown kind to the general AI message', M.limitMessage('xx', 'ai') === M.MSG.hing.ai && M.limitMessage('as', 'zzz') === M.MSG.as.ai && M.limitMessage(undefined, undefined) === M.MSG.hing.ai);
  t('the message names the kind: photo limit talks about photos, video about videos', /photo/.test(M.limitMessage('en', 'photos')) && /video/.test(M.limitMessage('en', 'video')));

  const html = read('public/index.html');
  t('index.html loads limit-msg.js before the main script', html.indexOf('<script src="/limit-msg.js"></script>') > 0 && html.indexOf('<script src="/limit-msg.js"></script>') < html.indexOf('const $=s=>document.querySelector'));
  // api(): run the real function text against a fake fetch
  {
    const a = html.indexOf('async function api(path,body){'), b = html.indexOf('const errMsg=', a);
    const apiSrc = html.slice(a, b);
    const mkApi = (status, body, tlang) => new Function('cqOf', 'window', 'wake', 'fetch', 'AbortSignal', 'ST', 'PARENT_KEY', 'L4', 'M_NEEDNET', 'navigator', apiSrc + '\nreturn api;')(
      () => null, { CLOUD: { token: async () => 't' }, ORBIT_API: '', LIMITMSG: M }, async () => {}, async () => ({ ok: status < 400, json: async () => body }), { timeout: () => undefined }, { tlang }, undefined, x => String(x), 'no internet', { onLine: true });
    const tryApi = async (status, body, tlang) => { try { await mkApi(status, body, tlang)('/x', {}); return null; } catch (e) { return e; } };
    let e = await tryApi(429, { code: 'limit_reached', kind: 'photos', error: 'Aaj ki photo limit poori ho gayi.' }, 'as');
    t('api(): a used-up limit becomes the friendly message in the student\'s language, with code and kind kept', e && e.message === M.limitMessage('as', 'photos') && e.code === 'limit_reached' && e.kind === 'photos');
    e = await tryApi(429, { code: 'limit_reached', kind: 'recall' }, 'bn'); t('api(): Bengali setting gives the Bengali message', e && e.message === M.limitMessage('bn', 'recall'));
    e = await tryApi(429, { error: 'Thoda ruko, bahut zyada requests. 1 minute baad try karo.' }, 'as'); t('api(): the per-minute "slow down" answer is not changed', e && /Thoda ruko/.test(e.message) && !e.code);
    e = await tryApi(502, { error: 'AI error' }, 'as'); t('api(): other errors keep the server text', e && e.message === 'AI error');
    e = await tryApi(500, {}, 'as'); t('api(): an empty error body still gets the old fallback text', e && /Kuch gadbad hui/.test(e.message));
  }

  // ================= Task 15: tracker merge + sync (fake browser) =================
  let JSDOM = null; try { ({ JSDOM } = require('jsdom')); } catch (e) { /* skipped below */ }
  const cloudSrc = read('public/cloud.js');
  t('cloud.js: CLOUD.recall has get() and set() on users/<uid>/recall/tracker', /recall: \{/.test(cloudSrc) && /'users', u\.uid, 'recall', 'tracker'/.test(cloudSrc.slice(cloudSrc.indexOf('recall: {'))) && /async get\(\)/.test(cloudSrc.slice(cloudSrc.indexOf('recall: {'))));
  if (!JSDOM) console.log('SKIP  jsdom not installed (npm i -D jsdom) - Recall tracker sync tests not run');
  else {
    const rsrc = read('public/recall.js');
    const boot = (uid, cloud, local) => {
      const dom = new JSDOM('<!doctype html><body><div id="app"></div></body>', { runScripts: 'outside-only', url: 'https://orbittutorial.web.app/', pretendToBeVisual: true });
      const w = dom.window, sets = [];
      w.scrollTo = () => {}; w.go = () => {}; w.api = async () => { throw new Error('no api here'); };
      w.fetch = async () => ({ ok: true, json: async () => ({ left: 1 }) });
      w.CLOUD = { token: async () => 't', recall: { get: async () => { if (cloud.fail) throw new Error('offline'); return cloud.items === undefined ? null : { items: JSON.parse(JSON.stringify(cloud.items)), topics: JSON.parse(JSON.stringify(cloud.topics || {})) }; }, set: async data => { if (cloud.failSet) throw new Error('denied'); cloud.items = JSON.parse(JSON.stringify(data.items)); cloud.topics = JSON.parse(JSON.stringify(data.topics || {})); sets.push(data.items.length); } } };
      w.eval('var ST={rvoice:"text"};var USER={uid:"' + uid + '"};var DATA={courses:[{id:"c7",class:7,subject:"Science",chapters:[{no:1,title:"Light",sections:[{title:"S",questions:[{id:"q1",no:1,text:"Q"}]}]}]}]};var draws=0;function draw(){draws++;document.getElementById("app").innerHTML=RECALL.viewHTML()}');
      if (local) w.localStorage.setItem('orbit.recall.' + uid, JSON.stringify(local));
      w.eval(read('public/revision-core.js'));
      w.eval(rsrc);
      return { w, sets, html: () => w.document.getElementById('app').innerHTML, local: () => JSON.parse(w.localStorage.getItem('orbit.recall.' + uid) || '[]') };
    };
    const tick = () => new Promise(r => setTimeout(r, 20));
    const A = { k: 'c7|1', t: 60, at: 1000 }, B = { k: 'c7|1', t: 72, at: 2000 }, C2 = { k: 'c7|1', t: 85, at: 3000 };
    {
      const p = boot('u1', {}, []);
      const m = p.w.RECALL.merge;
      t('merge: union of both lists, oldest first', JSON.stringify(m([A, C2], [B]).map(x => x.at)) === '[1000,2000,3000]');
      t('merge: the same attempt in both lists is kept once', m([A, B], [B, C2]).length === 3);
      t('merge: junk entries are dropped, non-arrays are fine', m([A, null, 5, { k: 1 }, { k: 'x', t: 'a', at: 1 }], 'zzz').length === 1 && m(null, undefined).length === 0);
      t('merge: only the newest 300 are kept', m(Array.from({ length: 400 }, (_, i) => ({ k: 'k', t: 1, at: i + 1 })), []).length === 300 && m(Array.from({ length: 400 }, (_, i) => ({ k: 'k', t: 1, at: i + 1 })), [])[0].at === 101);
      t('merge: extra fields on an attempt (later: nextReview) travel along untouched', m([{ ...A, nextReview: 5, stage: 1 }], [])[0].stage === 1);
    }
    {   // the Task 15 test: Recall on phone 1, login on phone 2, same tracker
      const cloud = {};
      const phone1 = boot('u1', cloud, [A, B]);
      await phone1.w.RECALL.sync(); await tick();
      t('phone 1: its attempts are saved in the account', cloud.items && cloud.items.length === 2 && phone1.sets.length === 1);
      const phone2 = boot('u1', cloud, []);
      await phone2.w.RECALL.sync(); await tick();
      t('phone 2 (empty): after login it gets the same tracker', JSON.stringify(phone2.local()) === JSON.stringify([A, B]));
      t('phone 2: nothing needed to be written back', phone2.sets.length === 0);
      phone2.w.eval('RECALL._reset(); document.getElementById("app").innerHTML = ""');
      const ph3 = boot('u1', cloud, [C2]);
      await ph3.w.RECALL.sync(); await tick();
      t('a phone with a newer attempt and an account with older ones: both are merged, on the phone and in the account', ph3.local().length === 3 && cloud.items.length === 3 && ph3.sets.length === 1);
    }
    {
      const cloud = { items: [A] }, p = boot('u2', cloud, [A]);
      await p.w.RECALL.sync(); await tick();
      t('already the same: no write at all (saves Firestore writes)', p.sets.length === 0);
    }
    {
      const cloud = { fail: true }, p = boot('u3', cloud, [A, B]);
      await p.w.RECALL.sync(); await tick();
      t('offline / read error: the phone copy stays untouched, nothing throws', p.local().length === 2);
      const c2 = { items: [A], failSet: true }, q = boot('u4', c2, [B]);
      await q.w.RECALL.sync(); await tick();
      t('write error (no permission): the phone still shows the merged list and keeps it for the next try', q.local().length === 2);
    }
    {
      const cloud = { items: [A, B] }, p = boot('u5', cloud, []);
      p.w.eval('RECALL._reset()'); p.w.document.getElementById('app').innerHTML = p.w.RECALL.viewHTML(); await tick();
      const sel = p.w.document.getElementById('rcTopic'); sel.value = 'c7|1'; sel.dispatchEvent(new p.w.Event('change', { bubbles: true })); await tick();
      t('opening Recall pulls the account tracker once, and it shows for the chosen chapter WITHOUT a new attempt', /Knowledge Retention Tracker/.test(p.html()) && p.local().length === 2);
      t('the tracker text says it is saved in the account, not only on this phone', /account mein save/.test(p.html()) && !/is phone par save/.test(p.html()));
    }
    {
      const p = boot('u6', { items: [] }, []);
      p.w.eval('RECALL._reset()'); p.w.document.getElementById('app').innerHTML = p.w.RECALL.viewHTML(); await tick();
      t('no attempts yet: no empty tracker card on the form', !/Knowledge Retention Tracker/.test(p.html()));
    }
  }
  const recallSrc = read('public/recall.js');
  t('Recall page: after an attempt the local copy is written first and then synced', recallSrc.indexOf('write(read().concat([{ k: st.key, t: j.total, at: Date.now() }]));') > 0 && recallSrc.indexOf('write(read().concat') < recallSrc.indexOf('sync();   // also saves it in the account'));
  t('Recall page: a limit_reached answer shows 0 left', /e\.code === 'limit_reached'/.test(recallSrc));
  t('Recall page: the typed text is still never stored in the tracker', !/text:/.test(recallSrc.slice(recallSrc.indexOf('function syncOnce'), recallSrc.indexOf('function sync()'))));

  console.log(pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})();
