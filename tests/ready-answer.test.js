// "Ready answer" (3-dot menu): an AI answer somebody already generated is kept in Firestore readyAnswers/<id> and opens at once for the next student.
// Covers ready-core.js (against a fake Firestore), the three server routes (against fakes), the rules / course lock, and the real index.html in jsdom.
// Run: node tests/ready-answer.test.js   (the browser part is skipped when jsdom is not installed)
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/^﻿/, '').replace(/\r\n/g, '\n');
let pass = 0, fail = 0;
const t = (name, ok, extra) => { if (ok) pass++; else { fail++; console.log('FAIL  ' + name + (extra ? '  ' + extra : '')); } };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const R = require(path.join(ROOT, 'ready-core.js'));

// ================= core =================
t('question ids: letters, digits, . _ : - only, 1..100 characters, never a path', R.okId('m7c1-a4') && R.okId('c10s.ch1:q2_x') && !R.okId('') && !R.okId('a/b') && !R.okId('../x') && !R.okId('a b') && !R.okId(null) && !R.okId(5) && !R.okId('a'.repeat(101)));
t('text is trimmed, CRLF made LF and cut at the limit; a non-string is empty', R.cleanText('  hi\r\nthere \n') === 'hi\nthere' && R.cleanText(null) === '' && R.cleanText('x'.repeat(R.MAX_TEXT + 50)).length === R.MAX_TEXT);
t('stored doc holds only qid, text, sig and time (nothing about the student)', same(Object.keys(R.toDoc('q1', ' a ', 's', 5)).sort(), ['at', 'qid', 'sig', 'text']) && R.toDoc('q1', ' a ', 's', 5).text === 'a');
t('a doc is usable only with text and a matching question fingerprint', R.usable({ text: 'a', sig: 's' }, 's') && !R.usable({ text: 'a', sig: 's' }, 'other') && !R.usable({ text: '', sig: 's' }, 's') && !R.usable(null, 's') && R.usable({ text: 'a' }, 's') && R.usable({ text: 'a', sig: 's' }, ''));

// a tiny fake Firestore: collection().doc().get()/set() and getAll()
function fakeDb(seed = {}) {
  const docs = new Map(Object.entries(seed)), stats = { get: 0, getAll: 0, set: 0, lastRefs: 0 }; let broken = false;
  const ref = id => ({ id, get: async () => { stats.get++; if (broken) throw new Error('down'); return { id, exists: docs.has(id), data: () => docs.get(id) }; }, set: async d => { stats.set++; if (broken) throw new Error('down'); docs.set(id, d); } });
  return { docs, stats, break: () => { broken = true; }, collection: name => { if (name !== 'readyAnswers') throw new Error('wrong collection ' + name); return { doc: ref }; },
    getAll: async (...refs) => { stats.getAll++; stats.lastRefs = refs.length; if (broken) throw new Error('down'); return refs.map(r => ({ id: r.id, exists: docs.has(r.id), data: () => docs.get(r.id) })); } };
}
(async () => {
  let clock = 1000; const now = () => clock;
  const db = fakeDb({ q1: { qid: 'q1', text: 'Answer one', sig: 'A', at: 1 }, q2: { qid: 'q2', text: 'Answer two', sig: 'B', at: 1 } });
  const S = R.createStore({ db, now });
  t('get: reads Firestore once, then memory (no second read)', await S.get('q1', 'A') === 'Answer one' && await S.get('q1', 'A') === 'Answer one' && db.stats.get === 1);
  t('get: an answer for an edited question (other fingerprint) is not shown', await S.get('q2', 'B') === 'Answer two' && await S.get('q2', 'CHANGED') === '');
  const g0 = db.stats.get, e1 = await S.get('q9', 'x'), g1 = db.stats.get, e2 = await S.get('q9', 'x'), g2 = db.stats.get; clock += 61000; const e3 = await S.get('q9', 'x'), g3 = db.stats.get;
  t('get: nothing saved = empty text; the "none" is remembered for a minute (no read storm), then Firestore is asked again', e1 === '' && e2 === '' && e3 === '' && g1 === g0 + 1 && g2 === g1 && g3 === g2 + 1);
  t('get: a bad id never reaches Firestore', await S.get('a/b', 'x') === '' && db.stats.get === g3);

  const db2 = fakeDb({ a: { text: 'A', sig: '1' }, b: { text: 'B', sig: '1' }, c: { text: 'C', sig: 'old' } }), S2 = R.createStore({ db: db2, now });
  const got = await S2.list([{ id: 'a', sig: '1' }, { id: 'b', sig: '1' }, { id: 'c', sig: 'new' }, { id: 'zz', sig: '1' }, { id: 'a', sig: '1' }, { id: 'bad/id', sig: '1' }, null]);
  t('list: ONE Firestore call for all ids; returns only usable ones, once each, in the asked order', db2.stats.getAll === 1 && same(got, ['a', 'b']));
  t('list: a second ask is answered from memory / the "none" memory (no new call)', same(await S2.list([{ id: 'a', sig: '1' }, { id: 'zz', sig: '1' }]), ['a']) && db2.stats.getAll === 1);
  const many = Array.from({ length: 400 }, (_, i) => ({ id: 'q' + i, sig: 's' })), db3 = fakeDb();
  await R.createStore({ db: db3, now }).list(many);
  t('list: 400 asked ids are cut to ' + R.MAX_IDS + ' and sent as ONE Firestore call', R.MAX_IDS === 150 && db3.stats.getAll === 1 && db3.stats.lastRefs === 150);

  const db4 = fakeDb(), S4 = R.createStore({ db: db4, now });
  t('save: writes { qid, text, sig, at } to Firestore and the next get/list see it at once', await S4.save('q5', '  New answer ', 'S') === true && same(db4.docs.get('q5'), { qid: 'q5', text: 'New answer', sig: 'S', at: clock }) && await S4.get('q5', 'S') === 'New answer' && same(await S4.list([{ id: 'q5', sig: 'S' }]), ['q5']));
  t('save: a new answer replaces the old one (Dobara banao)', await S4.save('q5', 'Better answer', 'S') && db4.docs.get('q5').text === 'Better answer' && await S4.get('q5', 'S') === 'Better answer');
  t('save: empty text or a bad id is refused and nothing is written', await S4.save('q6', '   ', 'S') === false && await S4.save('a/b', 'x', 'S') === false && !db4.docs.has('q6') && db4.stats.set === 2);
  const db5 = fakeDb(); db5.break(); const logs = [], S5 = R.createStore({ db: db5, now, log: m => logs.push(m) });
  t('Firestore down: save keeps the answer in memory, get/list return nothing instead of throwing, problems are logged', await S5.save('q7', 'kept', 's') === false && await S5.get('q7', 's') === 'kept' && await S5.get('q8', 's') === '' && same(await S5.list([{ id: 'q7', sig: 's' }, { id: 'q8', sig: 's' }]), ['q7']) && logs.length >= 2);
  const S6 = R.createStore({ now });
  t('no service account (db null): works from memory only', await S6.save('q1', 'mem', 's') === true && await S6.get('q1', 's') === 'mem' && same(await S6.list([{ id: 'q1', sig: 's' }, { id: 'q2', sig: 's' }]), ['q1']) && await S6.get('q2', 's') === '');

  // ================= server =================
  const SRV = read('server.js');
  t('server loads ready-core, builds the store on the Firestore handle and fingerprints the question text, parts, options and table', /require\('\.\/ready-core'\)/.test(SRV) && /READYC\.createStore\(\{ db: FSDB/.test(SRV) && /const qsig = q => hash\(JSON\.stringify\(\[q\.text \|\| '', q\.parts \|\| \[\], q\.options \|\| \[\], q\.table \|\| null\]\)\)/.test(SRV));
  t('both new routes sit behind the login check', SRV.indexOf("app.use('/api', async") < SRV.indexOf("app.post('/api/answer/ready-list'") && SRV.indexOf("app.use('/api', async") < SRV.indexOf("app.post('/api/answer/ready'"));
  const a0 = SRV.indexOf("app.post('/api/answer', async"), a1 = SRV.indexOf('// ---- translate (Hindi / Assamese)'), code = SRV.slice(a0, a1);
  t('the three routes were found in server.js', a0 > 0 && a1 > a0 && /app\.post\('\/api\/answer\/ready-list'/.test(code) && /app\.post\('\/api\/answer\/ready'/.test(code));
  const handlers = {}, calls = [], aiCalls = []; let aiText = 'Fresh AI answer', aiOk = true, aiFail = false;
  const BY_ID = new Map([['t1', { q: { id: 't1', text: 'Why?', parts: ['(a)'] }, course: { id: 'c1' }, ch: { no: 1 } }], ['t2', { q: { id: 't2', text: 'How?' }, course: { id: 'c1' }, ch: { no: 1 } }]]);
  const guard = (req, res) => { const b = req.body || {}; if (b.cq) { req.customHit = true; req.body.id = 'cust-' + b.cq.text; return { q: { id: req.body.id, text: b.cq.text }, course: { id: 'cc' }, ch: { no: 1 } }; } const h = BY_ID.get(b.id); if (!h) { res.status(400).json({ error: 'Unknown question.' }); return null; } return h; };
  const dbR = fakeDb(), store = R.createStore({ db: dbR, now }), CACHE = new Map(), hash = s => require('crypto').createHash('sha1').update(String(s)).digest('hex').slice(0, 10);
  const qsig = q => hash(JSON.stringify([q.text || '', q.parts || [], q.options || [], q.table || null]));
  new Function('app', 'guard', 'guardAI', 'geminiFor', 'failMsgFor', 'profileFor', 'buildPrompt', 'CACHE', 'READY', 'READYC', 'qsig', 'BY_ID', code)(
    { post: (p, fn) => { handlers[p] = fn; } }, guard, async () => aiOk, async (req, sys, prompt) => { aiCalls.push(prompt); return aiFail ? { status: 503 } : { text: aiText }; }, (req, s) => 'AI error ' + s, () => ({ answer: 'sys' }), (q) => 'prompt:' + q.text, CACHE, store, R, qsig, BY_ID);
  const mkRes = () => { const r = { code: 200, body: null }; r.status = c => { r.code = c; return r; }; r.json = b => { r.body = b; return r; }; return r; };
  const post = async (p, body) => { const rs = mkRes(); await handlers[p]({ body, headers: {}, user: { uid: 'stu' } }, rs); return rs; };

  let r = await post('/api/answer/ready', { id: 't1' });
  t('ready: nobody asked yet = 404 with code no_ready (a clear message, no AI call)', r.code === 404 && r.body.code === 'no_ready' && /AI Answer/.test(r.body.error) && aiCalls.length === 0);
  r = await post('/api/answer/ready-list', { ids: ['t1', 't2'] });
  t('ready-list: nothing ready yet = empty list', r.code === 200 && same(r.body, { ids: [] }));
  r = await post('/api/answer', { id: 't1' });
  t('answer: the first student gets an AI answer', r.code === 200 && r.body.answer === 'Fresh AI answer' && aiCalls.length === 1 && !r.body.cached);
  await new Promise(rr => setTimeout(rr, 5));
  t('answer: it is saved to Firestore for everybody, with the question fingerprint', dbR.docs.has('t1') && dbR.docs.get('t1').text === 'Fresh AI answer' && dbR.docs.get('t1').sig === qsig(BY_ID.get('t1').q) && same(Object.keys(dbR.docs.get('t1')).sort(), ['at', 'qid', 'sig', 'text']));
  r = await post('/api/answer/ready-list', { ids: ['t1', 't2', 'nope', 7, null, { a: 1 }] });
  t('ready-list: only the question that has an answer is listed; unknown / non-string ids are ignored', same(r.body, { ids: ['t1'] }));
  r = await post('/api/answer/ready', { id: 't1' });
  t('ready: the second student gets the same answer at once, no AI call', r.code === 200 && r.body.answer === 'Fresh AI answer' && r.body.cached === true && aiCalls.length === 1);
  r = await post('/api/answer/ready', { id: 't2' });
  t('ready: a question nobody asked is still 404', r.code === 404 && r.body.code === 'no_ready');
  const badBodies = [{}, { id: 5 }, { id: 'unknown' }, { id: ['t1'] }, null], badRes = [];
  for (const bad of badBodies) badRes.push(await post('/api/answer/ready', bad));
  t('ready: an unknown id, a non-string id or no body are all a plain 404 no_ready, never an error', badRes.every(x => x.code === 404 && x.body.code === 'no_ready'));
  CACHE.clear(); store._mem.clear();
  r = await post('/api/answer', { id: 't1' });
  t('answer after a restart (memory empty): served from Firestore, the AI is NOT called again', r.code === 200 && r.body.answer === 'Fresh AI answer' && r.body.cached === true && aiCalls.length === 1);
  aiText = 'Second try'; r = await post('/api/answer', { id: 't1', fresh: true }); await new Promise(rr => setTimeout(rr, 5));
  t('Dobara banao (fresh): calls the AI again and the new answer replaces the shared one', r.body.answer === 'Second try' && aiCalls.length === 2 && dbR.docs.get('t1').text === 'Second try' && (await post('/api/answer/ready', { id: 't1' })).body.answer === 'Second try');
  BY_ID.get('t2').q.text = 'How? (edited)'; aiText = 'x';
  dbR.docs.set('t2', { qid: 't2', text: 'Old answer of the old question', sig: 'oldsig', at: 1 });
  r = await post('/api/answer/ready', { id: 't2' });
  t('an answer saved for an older version of the question text is not shown', r.code === 404 && same((await post('/api/answer/ready-list', { ids: ['t2'] })).body, { ids: [] }));
  aiFail = true; r = await post('/api/answer', { id: 't2' }); await new Promise(rr => setTimeout(rr, 5));
  t('answer: when the AI fails nothing is saved', r.code === 502 && dbR.docs.get('t2').text === 'Old answer of the old question');
  aiFail = false; aiText = 'Own custom answer';
  const before = dbR.stats.set; r = await post('/api/answer', { cq: { text: 'My own question' } }); await new Promise(rr => setTimeout(rr, 5));
  t('a student\'s own custom question is never saved to the shared store', r.code === 200 && r.body.answer === 'Own custom answer' && dbR.stats.set === before && !dbR.docs.has('cust-My own question'));
  r = await post('/api/answer/ready', { id: 'cust-My own question' });
  t('and its id can not be opened through ready either', r.code === 404);
  t('the answer route does not wait for Firestore (save is not awaited) and skips the shared store for custom questions', /READY\.save\(id, r\.text, qsig\(q\)\)/.test(code) && !/await READY\.save/.test(code) && /!req\.customHit\) READY\.save/.test(code) && /if \(!fresh && !req\.customHit\)/.test(code));

  // ================= rules and course lock =================
  const rules = read('firestore.rules'), lock = require(path.join(ROOT, 'course-lock-core.js'));
  t('Firestore rules: readyAnswers can not be read or written by any app user (only the server)', /match \/readyAnswers\/\{id\} \{\s*allow read, write: if false;\s*\}/.test(rules));
  t('course lock: /answer/ready is gated like /answer (a student can not open another course\'s answer)', lock.GATED.has('/answer/ready') && lock.GATED.has('/answer'));
  const sw = read('public/sw.js');
  t('service worker cache version was bumped so phones get the new index.html', /SHELL = 'orbit-shell-v(6[1-9]|[7-9]\d|\d{3,})'/.test(sw));

  // ================= index.html =================
  const html = read('public/index.html');
  t('menu: "Ready answer" item sits at the top, shows only when an answer is ready, not yet shown, and not loading; thin line icon, no emoji', /<div class="qmenu" role="menu">\$\{READY\.ids\[q\.id\]&&!has&&!a\.loading\?`<button class="qmi" role="menuitem" data-act="qready" data-id="\$\{q\.id\}">\$\{I\.ready\}<span>Ready answer<\/span><\/button>`:''\}<button class="qmi" role="menuitem" data-act="pin"/.test(html) && /ready:ic\('<path d="M13 2L4 14h8l-1 8 9-12h-8z"\/>'\)/.test(html));
  t('the click goes to ask(id, false, true) and ask() uses the ready route only then', /act==='qready'\)\{ui\(id\)\.qm=false;ask\(id,false,true\)\}/.test(html) && /api\(ready\?'\/api\/answer\/ready':'\/api\/answer',ready\?\{id\}:\{id,fresh:!!fresh\}\)/.test(html));
  t('draw() ends with readyScan()', /STUDY\.sync\(\);\n readyScan\(\);/.test(html));

  // ================= browser part =================
  let JSDOM = null; try { ({ JSDOM } = require('jsdom')); } catch (e) {}
  if (!JSDOM) { console.log('SKIP  jsdom not installed (npm i -D jsdom) - Ready answer page tests not run'); console.log(pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0); }
  const page = html.replace(/<script\b[^>]*\bsrc=[^>]*><\/script>/g, '');
  const QDATA = JSON.parse(JSON.stringify(require('../questions-public')));
  const tick = (ms = 30) => new Promise(rr => setTimeout(rr, ms));
  const fetches = []; let listReply = { ids: ['rd-a1'] }, readyReply = { status: 200, body: { answer: 'Ready text **one**' } }, listFails = false;
  const dom = new JSDOM(page, {
    runScripts: 'dangerously', url: 'https://orbittutorial.web.app/', pretendToBeVisual: true,
    beforeParse(w) {
      w.eval(read('public/catalog.js'));
      w.matchMedia = w.matchMedia || (() => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
      w.scrollTo = () => {};
      w.WARP = { block: txt => '<div class="warp">' + txt + '</div>' };   // the loading animation script is stripped in this test
      w.fetch = async (url, opt) => {
        const body = opt && opt.body ? JSON.parse(opt.body) : null; fetches.push({ url, body });
        if (/questions\.json$/.test(url)) return { ok: true, json: async () => QDATA };
        if (/\/api\/ping$/.test(url)) return { ok: true, json: async () => ({ ok: true }) };
        if (/\/api\/answer\/ready-list$/.test(url)) return listFails ? { ok: false, status: 500, json: async () => ({ error: 'down' }) } : { ok: true, json: async () => listReply };
        if (/\/api\/answer\/ready$/.test(url)) return { ok: readyReply.status === 200, status: readyReply.status, json: async () => readyReply.body };
        return { ok: false, status: 404, json: async () => ({}) };
      };
      w.CLOUD = { token: async () => 't', push: async () => {}, login: async () => {}, logout: async () => {}, course: { get: async () => ({ org: 'seba', cls: 10, med: 'Assamese' }), set: async () => {} } };
    }
  });
  const w = dom.window, d = w.document; await tick(60);
  w.onCloudUser({ uid: 'u1', name: 'Test', email: 't@example.com', photo: '' }); await tick(80);
  const readyCalls = () => fetches.filter(f => /\/api\/answer\/ready-list$/.test(f.url));
  const click = el => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  const menuOf = id => { const b = d.querySelector('[data-act=qm][data-id="' + id + '"]'); click(b); return d.querySelector('.qmenu'); };
  const closeMenu = () => click(d.body);
  w.eval(`(function(){const c=DATA.courses[0];const ch=c.chapters[0];
    ch.sections=[{title:'Exercise 1',questions:[{id:'rd-a1',no:1,text:'Q one'},{id:'rd-a2',no:2,text:'Q two'},{id:'rd-a3',no:3,text:'Q three'},{id:'cx-1',no:4,text:'My own'}]}];
    COURSE=Object.assign({},COURSE||{});NAV={page:'chapter',org:COURSE.org||'seba',med:COURSE.med||'Assamese',cls:c.class,sub:c.subject,ch:ch.no};
    IDX['cx-1']={course:Object.assign({},c,{custom:true}),ch,q:ch.sections[0].questions[3]};VIEW='home';draw()})()`);
  await tick(120);
  t('browser: opening a chapter asks the server ONCE which questions have a ready answer (a list of ids, nothing else)', readyCalls().length === 1 && same(Object.keys(readyCalls()[0].body), ['ids']) && same(readyCalls()[0].body.ids, ['rd-a1', 'rd-a2', 'rd-a3']) );
  t('browser: a student\'s own custom question is never offered to the shared store', !readyCalls().some(f => f.body.ids.includes('cx-1')));
  t('browser: redrawing the page does not ask again for questions already asked about', (w.eval('draw()'), await tick(60), readyCalls().length === 1));
  let menu = menuOf('rd-a1');
  t('browser: the 3-dot menu of a question with a ready answer shows "Ready answer" first, with an icon', !!menu && menu.querySelector('.qmi').textContent.trim() === 'Ready answer' && !!menu.querySelector('.qmi svg') && menu.querySelector('.qmi').dataset.act === 'qready');
  closeMenu(); menu = menuOf('rd-a2');
  t('browser: a question with no ready answer has no such item (the menu is as before)', !!menu && !/Ready answer/.test(menu.textContent) && /Pin karo/.test(menu.textContent) && /Translate question/.test(menu.textContent));
  closeMenu(); menu = menuOf('rd-a1');
  click(menu.querySelector('[data-act=qready]')); await tick(120);
  const rc = fetches.filter(f => /\/api\/answer\/ready$/.test(f.url));
  t('browser: tapping it calls the ready route with the question id only (not the AI route)', rc.length === 1 && same(rc[0].body, { id: 'rd-a1' }) && !fetches.some(f => /\/api\/answer$/.test(f.url)));
  const card = d.querySelector('.q[data-qid="rd-a1"]');
  t('browser: the answer shows at once under the question, open, formatted like an AI answer', !!card && !!card.querySelector('.ans') && /Ready text/.test(card.querySelector('.ans').textContent) && !/\*\*/.test(card.querySelector('.ans').textContent) && !card.querySelector('[data-act=ask]'));
  t('browser: it is kept on this device like any AI answer (opens later without internet)', /Ready text/.test(w.localStorage.getItem('orbit_answers_v1') || ''));
  menu = menuOf('rd-a1');
  t('browser: once the answer is shown the "Ready answer" item is gone from that question\'s menu', !!menu && !/Ready answer/.test(menu.textContent));
  closeMenu();
  // the server says "not ready" (for example the question was edited): clear message, item removed, AI button still works
  w.eval("READY.ids['rd-a3']=true;draw()"); await tick(30);
  readyReply = { status: 404, body: { code: 'no_ready', error: 'Is question ka ready answer abhi nahi hai. AI Answer dabao.' } };
  menu = menuOf('rd-a3'); click(menu.querySelector('[data-act=qready]')); await tick(120);
  const c3 = d.querySelector('.q[data-qid="rd-a3"]');
  t('browser: when the answer is not there after all, a clear message is shown, the item disappears and the AI Answer button is still there', !!c3 && /abhi nahi hai/.test(c3.textContent) && !!c3.querySelector('[data-act=ask]') && w.eval("READY.ids['rd-a3']") === false && (closeMenu(), !/Ready answer/.test(menuOf('rd-a3').textContent)));
  closeMenu();
  // not logged in / offline / server down: no list, no error shown, tried again later
  const n0 = readyCalls().length;
  w.eval("USER=null;READY.seen={};readyScan()"); await tick(40);
  t('browser: nobody logged in = the server is not asked', readyCalls().length === n0);
  w.eval("USER={uid:'u1'};READY.seen={};READY.ids={};READY.wait=0"); listFails = true; w.eval('draw()'); await tick(120);
  t('browser: a server error on the list is silent (no message), the questions are asked about again after a short wait, and the page still works', readyCalls().length === n0 + 1 && !/down/.test(d.querySelector('#app').textContent) && w.eval('READY.wait') > Date.now() && w.eval('Object.keys(READY.seen).length') === 0 && !!d.querySelector('.q[data-qid="rd-a2"]'));
  listFails = false; w.eval('READY.wait=0'); listReply = { ids: ['rd-a2'] }; w.eval('draw()'); await tick(150);
  t('browser: after the wait it asks again and the menu item appears for the question that has an answer', w.eval("READY.ids['rd-a2']") === true && /Ready answer/.test(menuOf('rd-a2').textContent));
  closeMenu();

  console.log(pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})();
