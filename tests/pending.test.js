/* Tests for pending-core.js: a student's AI video waiting for the admin is written by the SERVER, with the old field checks plus a daily limit.
 * Run: node tests/pending.test.js */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const P = require(path.join(ROOT, 'pending-core.js'));
let pass = 0, fail = 0;
const t = (name, ok, extra) => { if (ok) { pass++; console.log('PASS  ' + name); } else { fail++; console.log('FAIL  ' + name + (extra ? '  -> ' + extra : '')); } };
const K = 'a1'.repeat(20), mathPlan = () => ({ type: 'equation', steps: [{ say: 'hi' }] }), sciPlan = () => ({ type: 'science', steps: [{ say: 'hi' }] });
const fakeDb = () => { const store = {}; return { store, collection: c => ({ doc: id => ({ c, id }) }), runTransaction: async fn => fn({ get: async ref => ({ exists: (ref.c + '/' + ref.id) in store }), set: (ref, d) => { store[ref.c + '/' + ref.id] = d; } }) }; };
(async () => {
  const v = (o, uid = 'u1') => P.validate(o, uid, () => 111);
  t('a good maths request is accepted and gets uid + ts from the SERVER (not from the browser)', (() => { const r = v({ store: 'math', key: K, text: 'x+1=2', plan: mathPlan(), uid: 'someone-else', ts: 5 }); return r.doc && r.doc.uid === 'u1' && r.doc.ts === 111 && r.store.collection === 'mathVideoPending'; })());
  t('a good science request goes to sciencePending and has no qid', (() => { const r = v({ store: 'science', key: K, text: 'why sky blue', plan: sciPlan(), qid: 'q1' }); return r.store.collection === 'sciencePending' && !('qid' in r.doc); })());
  t('qid is kept for maths only when it is a string up to 40 characters', v({ store: 'math', key: K, text: 'x', plan: mathPlan(), qid: 'q'.repeat(40) }).doc.qid.length === 40 && !!v({ store: 'math', key: K, text: 'x', plan: mathPlan(), qid: 'q'.repeat(41) }).error && !!v({ store: 'math', key: K, text: 'x', plan: mathPlan(), qid: 5 }).error);
  t('unknown store, bad key, empty/too long text are rejected', !!v({ store: 'x', key: K, text: 'x', plan: mathPlan() }).error && !!v({ store: 'math', key: 'zz', text: 'x', plan: mathPlan() }).error && !!v({ store: 'math', key: K, text: '', plan: mathPlan() }).error && !!v({ store: 'math', key: K, text: 'x'.repeat(401), plan: mathPlan() }).error && !v({ store: 'science', key: K, text: 'x'.repeat(700), plan: sciPlan() }).error && !!v({ store: 'science', key: K, text: 'x'.repeat(701), plan: sciPlan() }).error);
  t('wrong plan type for the store, no steps, more than 12 steps, or a non-object plan are rejected', !!v({ store: 'math', key: K, text: 'x', plan: sciPlan() }).error && !!v({ store: 'science', key: K, text: 'x', plan: mathPlan() }).error && !!v({ store: 'math', key: K, text: 'x', plan: { type: 'equation', steps: [] } }).error && !!v({ store: 'math', key: K, text: 'x', plan: { type: 'equation', steps: new Array(13).fill({}) } }).error && !!v({ store: 'math', key: K, text: 'x', plan: [1] }).error && !!v({ store: 'math', key: K, text: 'x', plan: 'p' }).error);
  t('a plan over 100 kB is rejected (a document cannot be made huge)', !!v({ store: 'math', key: K, text: 'x', plan: { type: 'equation', steps: [{ say: 'a'.repeat(110 * 1024) }] } }).error);
  t('a request with no body is rejected', !!v(undefined).error && !!v(null).error);

  const db = fakeDb(); let clock = 1e9; const R = P.make({ db, now: () => clock });
  let r = await R.add({ uid: 'u1', body: { store: 'math', key: K, text: 'x', plan: mathPlan() } });
  t('server writes the document with the Admin SDK', r.status === 200 && r.body.created === true && db.store['mathVideoPending/' + K] && db.store['mathVideoPending/' + K].uid === 'u1');
  r = await R.add({ uid: 'u2', body: { store: 'math', key: K, text: 'CHANGED', plan: mathPlan() } });
  t('the same question sent again does not overwrite the first one', r.status === 200 && r.body.created === false && db.store['mathVideoPending/' + K].text === 'x');
  r = await R.add({ uid: null, body: {} }); t('no uid -> 401', r.status === 401);
  r = await P.make({ db: null }).add({ uid: 'u1', body: {} }); t('no database -> 503', r.status === 503);
  r = await R.add({ uid: 'u1', body: { store: 'x' } }); t('a bad request -> 400', r.status === 400);

  const R2 = P.make({ db: fakeDb(), now: () => clock }); const codes = [];
  for (let i = 0; i < 22; i++) codes.push((await R2.add({ uid: 'spammer', body: { store: 'science', key: i.toString(16).padStart(40, '0'), text: 't', plan: sciPlan() } })).status);
  t('daily limit: 20 requests are accepted, the 21st and later get 429', codes.slice(0, 20).every(c => c === 200) && codes.slice(20).every(c => c === 429), codes.join());
  t('daily limit is per student: another student is not affected', (await R2.add({ uid: 'other', body: { store: 'science', key: K, text: 't', plan: sciPlan() } })).status === 200);
  clock += 25 * 3600000;
  t('daily limit: after 24 hours the student can send again', (await R2.add({ uid: 'spammer', body: { store: 'science', key: 'f'.repeat(40), text: 't', plan: sciPlan() } })).status === 200);

  const rules = fs.readFileSync(path.join(ROOT, 'firestore.rules'), 'utf8').replace(/\r\n/g, '\n');
  const blk = n => rules.slice(rules.indexOf('match /' + n + '/'), rules.indexOf('match /', rules.indexOf('match /' + n + '/') + 5));
  t('rules: neither Pending collection can be created or changed from a browser', ['mathVideoPending', 'sciencePending'].every(n => /allow create, update: if false;/.test(blk(n)) && /allow read, delete: if isAdmin\(\)/.test(blk(n)) && !/request\.auth != null/.test(blk(n))));
  const srv = fs.readFileSync(path.join(ROOT, 'server.js'), 'utf8').replace(/\r\n/g, '\n'), cloud = fs.readFileSync(path.join(ROOT, 'public/cloud.js'), 'utf8');
  t('server: route sits after the login check and uses the 128 kB plan parser', srv.indexOf("app.post('/api/videoreq/pending'") > srv.indexOf('admin.auth().verifyIdToken') && /req\.path === '\/api\/videoreq\/pending' \? jsonPlan/.test(srv));
  t('client: cloud.js sends pending videos to the server and no longer writes the two collections with setDoc', /postPending\(\{ store: 'math'/.test(cloud) && /postPending\(\{ store: 'science'/.test(cloud) && !/setDoc\(doc\(db, '(mathVideoPending|sciencePending)'/.test(cloud));
  console.log('\n' + pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
})();
