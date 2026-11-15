// Task 40: AI Kahani / Example reach students only after the admin approves (public/aireview.js). Run: node tests/aireview.test.js (needs jsdom)
const fs = require('fs'), path = require('path');
let JSDOM = null; try { ({ JSDOM } = require('jsdom')); } catch (e) {}
let pass = 0, fail = 0;
const t = (name, ok, extra) => { if (ok) pass++; else { fail++; console.log('FAIL  ' + name + (extra ? '  ' + extra : '')); } };
if (!JSDOM) { console.log('SKIP  jsdom not installed'); console.log('0 passed, 0 failed'); process.exit(0); }
const ROOT = path.join(__dirname, '..'), src = fs.readFileSync(path.join(ROOT, 'public/aireview.js'), 'utf8');
const wait = () => new Promise(r => setTimeout(r, 10));
const TEXT = 'Rupam planted a seed and watered it every day until a small green plant came up.';

function boot(o) {
  o = o || {};
  const w = new JSDOM('<!doctype html><body><div id="app"></div></body>', { runScripts: 'outside-only', url: 'https://orbittutorial.web.app/' }).window;
  const db = { docs: Object.assign({}, o.docs || {}), sets: [], dels: [], alerts: [], draws: 0 };
  w.alert = m => db.alerts.push(m); w.draw = () => { db.draws++; };
  w.QVideo = { active: () => !!o.admin };
  w.CLOUD = { aicontent: {
    async get(id) { const d = db.docs[id]; if (!d) return null; if (d.status !== 'approved' && !o.admin) { const e = new Error('denied'); e.code = 'permission-denied'; throw e; } return d; },
    async set(d) { if (o.setFail) { const e = new Error('no'); e.code = 'permission-denied'; throw e; } db.sets.push(d); db.docs[d.qid + '__' + d.kind] = d; },
    async del(id) { db.dels.push(id); delete db.docs[id]; } } };
  if (o.nocloud) delete w.CLOUD;
  w.eval(src);
  return { w, db, R: w.AIREVIEW };
}
const gen = (calls, text) => async () => { calls.n++; return { text: text || TEXT }; };

(async () => {
  let b = boot();
  t('only story and example are gated', b.R.gated('story') && b.R.gated('example') && !b.R.gated('mcq') && !b.R.gated('analogy'));
  t('doc id = safe question id + __ + kind (what firestore.rules expect)', b.R.docId('c1-p6-1', 'story') === 'c1-p6-1__story' && b.R.docId('C1/P6 x', 'example') === 'c1-p6-x__example');

  // ---- student ----
  let calls = { n: 0 };
  b = boot({ docs: { 'q1__story': { qid: 'q1', kind: 'story', status: 'approved', text: TEXT } } });
  let r = await b.R.load('q1', 'story', gen(calls));
  t('student: approved text is shown, the AI is not asked', r.text === TEXT && calls.n === 0);
  calls = { n: 0 }; b = boot();
  let err = null; try { await b.R.load('q1', 'story', gen(calls)); } catch (e) { err = e; }
  t('student: nothing approved -> a kind message, the AI is not asked', err && /kahani abhi taiyar nahi hai/.test(err.message) && calls.n === 0);
  calls = { n: 0 }; b = boot({ docs: { 'q1__example': { qid: 'q1', kind: 'example', status: 'pending', text: TEXT } } }); err = null;
  try { await b.R.load('q1', 'example', gen(calls)); } catch (e) { err = e; }
  t('student: a pending copy is never shown (rules refuse the read)', err && /example abhi taiyar nahi hai/.test(err.message) && calls.n === 0);
  calls = { n: 0 }; b = boot({ nocloud: true }); err = null;
  try { await b.R.load('q1', 'story', gen(calls)); } catch (e) { err = e; }
  t('student: no cloud -> same message, no AI call', !!err && calls.n === 0);
  t('student: no admin buttons', b.R.adminBar('q1', 'story', TEXT) === '');

  // ---- admin ----
  calls = { n: 0 }; b = boot({ admin: true });
  r = await b.R.load('q1', 'story', gen(calls));
  t('admin: nothing saved -> a fresh AI draft', r.text === TEXT && calls.n === 1);
  let bar = b.R.adminBar('q1', 'story', TEXT);
  t('admin: the bar says Draft, offers Approve and Pending save, no Reject yet', /Draft: abhi save nahi hua, bachhon ko nahi dikhta/.test(bar) && /data-air="pub"/.test(bar) && /data-air="pend"/.test(bar) && !/data-air="del"/.test(bar));
  t('admin: no bar for other kinds or empty text', b.R.adminBar('q1', 'mcq', TEXT) === '' && b.R.adminBar('q1', 'story', '') === '');
  const host = b.w.document.getElementById('app'); host.innerHTML = bar;
  host.querySelector('[data-air=pend]').click(); await wait();
  t('Pending save writes status pending with the exact text', b.db.sets.length === 1 && b.db.sets[0].status === 'pending' && b.db.sets[0].text === TEXT && b.db.sets[0].qid === 'q1' && b.db.sets[0].kind === 'story' && Object.keys(b.db.sets[0]).sort().join() === 'at,kind,qid,status,text');
  bar = b.R.adminBar('q1', 'story', TEXT);
  t('the bar now says Pending and offers Reject', /Pending: bachhon ko nahi dikhta/.test(bar) && /data-air="del"/.test(bar));
  host.innerHTML = bar; host.querySelector('[data-air=pub]').click(); await wait();
  t('Approve writes status approved', b.db.sets[1].status === 'approved' && /Approved: bachhon ko dikhta hai/.test(b.R.adminBar('q1', 'story', TEXT)));
  // a student on another phone now gets it
  const st = boot({ docs: b.db.docs }); calls = { n: 0 };
  r = await st.R.load('q1', 'story', gen(calls));
  t('after approval a student gets exactly that text, no AI call', r.text === TEXT && calls.n === 0);
  host.innerHTML = b.R.adminBar('q1', 'story', TEXT); host.querySelector('[data-air=del]').click(); await wait();
  t('Reject deletes the saved copy and students lose it', b.db.dels.join() === 'q1__story' && !b.db.docs['q1__story'] && !/data-air="del"/.test(b.R.adminBar('q1', 'story', TEXT)));
  const st2 = boot({ docs: b.db.docs }); let e2 = null; try { await st2.R.load('q1', 'story', gen({ n: 0 })); } catch (e) { e2 = e; }
  t('...a student asking again gets the "not ready" message', !!e2);

  calls = { n: 0 }; b = boot({ admin: true, docs: { 'q2__story': { qid: 'q2', kind: 'story', status: 'pending', text: TEXT + ' (saved)' } } });
  r = await b.R.load('q2', 'story', gen(calls));
  t('admin: a saved pending copy comes back first (no AI call)', r.text.endsWith('(saved)') && calls.n === 0);
  r = await b.R.load('q2', 'story', gen(calls, 'A brand new draft text that is long enough.'), true);
  t('admin: "Dobara banao" asks the AI for a new draft', calls.n === 1 && /brand new draft/.test(r.text));
  t('admin: the bar tells the draft differs from the saved copy', /Naya draft \(saved copy alag hai\)/.test(b.R.adminBar('q2', 'story', r.text)));

  // ---- safety ----
  b = boot({ admin: true }); const short = b.w.document.getElementById('app');
  short.innerHTML = b.R.adminBar('q3', 'story', 'too short'); short.querySelector('[data-air=pub]').click(); await wait();
  t('text under 20 characters is not saved', b.db.sets.length === 0 && b.db.alerts.length === 1);
  short.innerHTML = b.R.adminBar('q3', 'story', 'x'.repeat(4001)); short.querySelector('[data-air=pub]').click(); await wait();
  t('text over 4000 characters is not saved', b.db.sets.length === 0 && b.db.alerts.length === 2);
  b = boot({ admin: true, setFail: true }); const h2 = b.w.document.getElementById('app');
  h2.innerHTML = b.R.adminBar('q4', 'story', TEXT); h2.querySelector('[data-air=pub]').click(); await wait();
  t('Firestore refusing the save gives a clear admin message', /admin account ya firestore\.rules/.test(b.db.alerts[0] || ''));
  b = boot({ admin: true }); const bar2 = b.R.adminBar('"><img src=x>', 'story', TEXT);
  t('ids are escaped inside the buttons', !/<img/.test(bar2));
  b = boot({ admin: false }); const h3 = b.w.document.getElementById('app'); h3.innerHTML = '<button data-air="pub" data-id="q9" data-k="story">x</button>'; b.R._lib.x = 1;
  h3.querySelector('button').click(); await wait();
  t('a student cannot publish even by forging a button', b.db.sets.length === 0 && b.db.dels.length === 0);

  // ---- wiring ----
  const H = fs.readFileSync(path.join(ROOT, 'public/index.html'), 'utf8');
  t('index.html: story/example go through AIREVIEW.load for built-in questions and are not saved in the local answer cache', /g2\?await AIREVIEW\.load\(id,k,gen\):await gen\(\)/.test(H) && /g2\?await AIREVIEW\.load\(id,k,gen,true\):await gen\(\)/.test(H) && (H.match(/if\(!g2\)\{\(MRC\[id\]/g) || []).length === 2);
  t('index.html: the admin bar is drawn under the Kahani / Example text', /\$\{gatedK\(id,k\)\?AIREVIEW\.adminBar\(id,k,srcText\(xk\)\):''\}/.test(H));
  t('aireview.js never assigns innerHTML', !/\.innerHTML\s*=/.test(src) && !/insertAdjacentHTML|eval\(|document\.write/.test(src));

  console.log(pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})();
