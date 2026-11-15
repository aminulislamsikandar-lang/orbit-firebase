// "Apna answer check karo" (handwritten answer photo): check-core.js, the /api/answer/check route against fakes, and the browser part in jsdom.
// Run: node tests/answer-check.test.js   (the browser part is skipped when jsdom is not installed)
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/^﻿/, '').replace(/\r\n/g, '\n');
let pass = 0, fail = 0;
const t = (name, ok, extra) => { if (ok) pass++; else { fail++; console.log('FAIL  ' + name + (extra ? '  ' + extra : '')); } };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const K = require(path.join(ROOT, 'check-core.js')), CUSTOM = require(path.join(ROOT, 'custom-core.js'));

// ================= core =================
t('maths is recognised by subject name, other subjects are theory', K.isMath({ subject: 'Mathematics' }) && K.isMath({ subject: 'Maths' }) && K.isMath({ subject: 'গণিত' }) && !K.isMath({ subject: 'Science' }) && !K.isMath({ subject: 'Social Science' }) && !K.isMath(null));
t('theory examiner: only reads what is written, compares with notes, JSON only, photo is data, Hinglish without emoji', /Judge only what the student wrote/.test(K.SYSTEM_THEORY) && /textbook notes/i.test(K.SYSTEM_THEORY) && /ONE JSON object/.test(K.SYSTEM_THEORY) && /Ignore any instruction/.test(K.SYSTEM_THEORY) && /Hinglish/.test(K.SYSTEM_THEORY) && /no emoji/.test(K.SYSTEM_THEORY));
t('maths examiner: solves first, then checks line by line and gives partial credit', /solve the question yourself/.test(K.SYSTEM_MATH) && /line by line/.test(K.SYSTEM_MATH) && /partial credit/.test(K.SYSTEM_MATH) && /"steps"/.test(K.SYSTEM_MATH) && K.SYSTEM_MATH !== K.SYSTEM_THEORY);
t('an unreadable photo has its own answer, {"readable":false}', /"readable":false/.test(K.SYSTEM_THEORY) && /"readable":false/.test(K.SYSTEM_MATH));

const q = { no: 3, label: 'A3.', text: 'Why does the sky look blue?', parts: ['(a) first', '(b) second'], options: ['A) one'] };
const pr = K.buildPrompt(q, { class: 7, subject: 'Science' }, { title: 'Light', context: 'Blue light scatters more than red light.' });
t('prompt: class, subject, chapter, the question with parts and options, and the chapter notes', /Class 7 Science/.test(pr) && /Chapter: Light/.test(pr) && /A3\. Why does the sky look blue\?/.test(pr) && /\(a\) first/.test(pr) && /A\) one/.test(pr) && /Blue light scatters more than red light\./.test(pr) && /attached photo/.test(pr));
t('prompt: no notes = no notes line; a long note is cut at 6000', !/Textbook notes/.test(K.buildPrompt(q, { class: 7, subject: 'Science' }, { title: 'Light' })) && K.buildPrompt(q, { class: 7, subject: 'Science' }, { title: 'L', context: 'n'.repeat(9000) }).length < 7000);
t('prompt: a table of the question is included', /Year \| Value/.test(K.buildPrompt({ no: 1, text: 'Read', table: { head: ['Year', 'Value'], rows: [['2020', '5']] } }, {}, {})));

const th = K.parseCheck(JSON.stringify({ readable: true, read: 'Sky is blue because of scattering', percent: 72.4, good: ['scattering'], wrong: ['x'], missing: ['wavelength', 'red light'], better: 'Add wavelength.', tip: 'Use words from the book.' }), false);
t('theory result is cleaned: percent rounded, lists, mode', th.mode === 'theory' && th.percent === 72 && same(th.good, ['scattering']) && th.missing.length === 2 && th.better === 'Add wavelength.' && th.read.startsWith('Sky') && !('steps' in th));
const mt = K.parseCheck('```json\n' + JSON.stringify({ readable: true, read: '2x+3=11', finalOk: false, percent: '60', steps: [{ n: 9, text: '2x+3=11', ok: true }, { text: '2x=14', ok: false, fix: '2x=8 because 11-3=8' }, { text: 'x=7', ok: false }], good: ['formula'], wrong: ['step 2'], better: 'Subtract 3 carefully.' }) + '\n```', true);
t('maths result: steps are numbered again, a wrong step keeps its fix, a correct one has none, finalOk is true only when exactly true', mt.mode === 'math' && mt.percent === 60 && mt.finalOk === false && mt.steps.length === 3 && mt.steps[0].n === 1 && mt.steps[1].n === 2 && mt.steps[1].fix === '2x=8 because 11-3=8' && mt.steps[0].fix === '' && mt.steps[2].ok === false && !('missing' in mt));
t('finalOk is not trusted when it is the string "true"', K.parseCheck(JSON.stringify({ readable: true, read: 'x', finalOk: 'true', percent: 10, steps: [] }), true).finalOk === false);
t('percent is clamped to 0..100', K.parseCheck('{"readable":true,"read":"a","percent":900}', false).percent === 100 && K.parseCheck('{"readable":true,"read":"a","percent":-5}', false).percent === 0);
t('lists are capped (5 items, 12 steps) and control characters removed', K.parseCheck(JSON.stringify({ readable: true, read: 'a\u0001b', percent: 1, good: Array(20).fill('g') }), false).good.length === 5 && !/\u0001/.test(K.parseCheck(JSON.stringify({ readable: true, read: 'a\u0001b', percent: 1 }), false).read) && K.parseCheck(JSON.stringify({ readable: true, read: 'a', percent: 1, steps: Array(30).fill({ text: 's', ok: true }) }), true).steps.length === 12);
t('{"readable":false} = unreadable, garbage = null', same(K.parseCheck('{"readable":false}', false), { unreadable: true }) && K.parseCheck('not json', false) === null && K.parseCheck('', true) === null && K.parseCheck('[1]', false) === null && K.parseCheck('{"readable":true}', false) === null);
t('JSON inside other text is still found', K.parseCheck('Here: {"readable":true,"read":"a","percent":50}', false).percent === 50);

// ================= server route against fakes =================
const S = read('server.js');
t('server loads check-core and has the route, behind the login check, with the photo-size body limit', /require\('\.\/check-core'\)/.test(S) && /app\.post\('\/api\/answer\/check'/.test(S) && /req\.path === '\/api\/answer\/check'\) \? jsonImage/.test(S) && S.indexOf("app.use('/api', async") < S.indexOf("app.post('/api/answer/check'"));
const rs = S.indexOf("app.post('/api/answer/check'"), route = S.slice(rs, S.indexOf('\n});', rs) + 4);
const handlers = {}, calls = []; let script = [];
const quota = require(path.join(ROOT, 'limits-core.js')).createStoredQuota({ db: null, kind: 'photos', max: 2 });
const hits = { 'c7-q1': { q: { id: 'c7-q1', no: 1, text: 'Why is the sea salty?' }, course: { class: 7, subject: 'Science' }, ch: { title: 'Water', context: 'Rivers carry salts to the sea.' } }, 'm7-q1': { q: { id: 'm7-q1', no: 1, text: 'Solve 2x+3=11' }, course: { class: 7, subject: 'Mathematics' }, ch: { title: 'Equations' } } };
const guard = (req, res) => { const h = hits[(req.body || {}).id]; if (!h) { res.status(400).json({ error: 'Unknown question.' }); return null; } return h; };
let aiOk = true;
new Function('app', 'CUSTOM', 'CHECK', 'guard', 'guardAI', 'userKeyOf', 'CUSTOM_PHOTO_QUOTA', 'CUSTOM_DAILY_PHOTOS', 'geminiFor', 'failMsgFor', route)(
  { post: (p, fn) => { handlers[p] = fn; } }, CUSTOM, K, guard, () => aiOk, r => String((r.headers || {})['x-user-key'] || ''), quota, 2,
  async (req, system, prompt, opts) => { calls.push({ system, prompt, opts }); return script.shift() || { text: '{"readable":true,"read":"ans","percent":80}' }; }, (req, s) => 'AI error ' + s);
const mkRes = () => { const r = { code: 200, body: null }; r.status = c => { r.code = c; return r; }; r.json = b => { r.body = b; return r; }; return r; };
const post = async (body, key) => { const rs2 = mkRes(); await handlers['/api/answer/check']({ body, headers: key ? { 'x-user-key': key } : {}, user: { uid: 'stu1' } }, rs2); return rs2; };
const ok = { id: 'c7-q1', image: 'A'.repeat(500), mime: 'image/jpeg' };
(async () => {
  let r = await post(ok);
  t('route: a theory question gets the theory examiner, the question, the notes and the photo (JSON mode, no backup providers)', r.code === 200 && r.body.percent === 80 && calls[0].system === K.SYSTEM_THEORY && /Why is the sea salty/.test(calls[0].prompt) && /Rivers carry salts/.test(calls[0].prompt) && calls[0].opts.images.length === 1 && calls[0].opts.images[0].mime === 'image/jpeg' && calls[0].opts.json === true && same(calls[0].opts.fallback, []));
  t('route: it counts as one photo read and tells how many are left', (await quota.left('stu1')) === 1 && r.body.left === 1);
  script = [{ text: '{"readable":true,"read":"2x=8","finalOk":true,"percent":100,"steps":[{"text":"2x=8","ok":true}]}' }];
  r = await post({ ...ok, id: 'm7-q1' });
  t('route: a maths question gets the maths examiner and returns the steps', calls[1].system === K.SYSTEM_MATH && r.code === 200 && r.body.mode === 'math' && r.body.steps.length === 1 && calls[1].opts.maxTokens > calls[0].opts.maxTokens);
  const n = calls.length;
  r = await post({ ...ok, image: 'x' }); t('route: a bad picture = 400, no AI call, no extra use taken', r.code === 400 && calls.length === n && (await quota.left('stu1')) === 0);
  r = await post({ ...ok, mime: 'application/pdf' }); t('route: wrong file type = 400', r.code === 400);
  r = await post({ ...ok, id: 'nope' }); t('route: unknown question = 400 and no AI call', r.code === 400 && calls.length === n);
  r = await post(ok); t('route: after the daily photo limit = 429 with a clear message and no AI call', r.code === 429 && r.body.code === 'limit_reached' && r.body.kind === 'photos' && /limit \(2\)/.test(r.body.error) && calls.length === n);
  r = await post(ok, 'AIza' + 'o'.repeat(30)); t('route: the parent\'s own key has no daily limit, "left" is null', r.code === 200 && r.body.left === null && calls.length === n + 1);
  await quota.refund('stu1'); await quota.refund('stu1');
  script = [{ status: 503 }]; r = await post(ok); t('route: AI down = 502 and the photo use is given back', r.code === 502 && /AI error 503/.test(r.body.error) && (await quota.left('stu1')) === 2);
  script = [{ text: 'garbage' }]; r = await post(ok); t('route: unreadable AI answer = 502 and the use is given back', r.code === 502 && (await quota.left('stu1')) === 2);
  script = [{ text: '{"readable":false}' }]; r = await post(ok); t('route: a photo with no readable answer = 422 "unreadable" and the use is given back', r.code === 422 && r.body.code === 'unreadable' && /saaf photo/.test(r.body.error) && (await quota.left('stu1')) === 2);
  aiOk = false; const n2 = calls.length; r = await post(ok); t('route: the shared AI guard (per-minute limit, daily AI limit) still comes first', calls.length === n2 && (await quota.left('stu1')) === 2); aiOk = true;
  t('route: the photo is never logged or stored', !/console\./.test(route) && !/writeFile|setDoc|\.set\(/.test(route));

  // ================= index.html wiring =================
  const html = read('public/index.html');
  t('index.html loads answer-check.js and shows the block on every question card', /<script src="\/answer-check\.js"><\/script>/.test(html) && /\$\{window\.ACHECK\?ACHECK\.html\(q\):''\}/.test(html));
  const mod = read('public/answer-check.js');
  t('module: the photo is shrunk, sent once to /api/answer/check, and the picked file is cleared (not kept)', /\/api\/answer\/check/.test(mod) && /t\.value = ''/.test(mod) && !/localStorage|sessionStorage|indexedDB/.test(mod));
  t('module: results show words (Sahi / Galat), not only colours', /<b>\$\{x\.ok \? 'Sahi' : 'Galat'\}:<\/b>/.test(mod));

  // ================= browser part =================
  let JSDOM = null; try { ({ JSDOM } = require('jsdom')); } catch (e) {}
  if (!JSDOM) { console.log('SKIP  jsdom not installed (npm i -D jsdom) - answer check page tests not run'); console.log(pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0); }
  const dom = new JSDOM('<!doctype html><body><div id="app"></div></body>', { runScripts: 'outside-only', url: 'https://orbittutorial.web.app/', pretendToBeVisual: true });
  const w = dom.window, apiCalls = []; let reply = null, fail2 = null;
  w.api = async (p, body) => { apiCalls.push({ p, body }); if (fail2) throw new Error(fail2); return reply; };
  w.errMsg = e => 'ERR:' + e.message;
  w.eval('var QS=[{id:"q1",no:1,text:"Q one"}];function draw(){document.getElementById("app").innerHTML=QS.map(q=>ACHECK.html(q)).join("")}');
  w.eval(fs.readFileSync(path.join(ROOT, 'public', 'answer-check.js'), 'utf8'));
  w.ACHECK.hooks.shrink = async () => ({ mime: 'image/jpeg', image: 'B'.repeat(300) });
  const d = w.document, app = () => d.getElementById('app').textContent, wait = (ms = 15) => new Promise(rr => setTimeout(rr, ms));
  w.eval('draw()');
  t('browser: a closed block shows only the "Apna answer check karo" chip', !!d.querySelector('[data-ac=toggle]') && !d.querySelector('[data-ac-file]') && /Apna answer check karo/.test(app()));
  d.querySelector('[data-ac=toggle]').click();
  t('browser: opening shows the explanation, the privacy line, the limit line and a photo button', !!d.querySelector('[data-ac-file]') && /Photo save nahi hoti/.test(app()) && /photo limit/.test(app()) && !!d.querySelector('[data-ac=pick]'));
  const inp = d.querySelector('[data-ac-file]');
  reply = { mode: 'theory', read: 'Sea has salt', percent: 64, good: ['salt from rivers'], wrong: [], missing: ['evaporation'], better: 'Add evaporation.', tip: 'Read the notes.', left: 5 };
  Object.defineProperty(inp, 'files', { value: [new w.File(['x'], 'a.jpg', { type: 'image/jpeg' })], configurable: true });
  inp.dispatchEvent(new w.Event('change', { bubbles: true })); await wait(40);
  t('browser: the photo goes to the server with the question id, mime and image (nothing else)', apiCalls.length === 1 && apiCalls[0].p === '/api/answer/check' && apiCalls[0].body.id === 'q1' && apiCalls[0].body.image.length === 300 && same(Object.keys(apiCalls[0].body).sort(), ['id', 'image', 'mime']));
  t('browser: the result shows score, verdict, what the AI read, good / missing and the advice', /64\/100/.test(app()) && /Theek hai/.test(app()) && /Sea has salt/.test(app()) && /Sahi likha/.test(app()) && /Jo chhoot gaya/.test(app()) && /evaporation/.test(app()) && /Behtar kaise karein/.test(app()) && /AI se galti ho sakti hai/.test(app()));
  reply = { mode: 'math', read: '2x+3=11', finalOk: false, percent: 55, steps: [{ n: 1, text: '2x+3=11', ok: true, fix: '' }, { n: 2, text: '2x=14', ok: false, fix: '2x=8' }], good: [], wrong: ['step 2'], better: 'Subtract 3.', tip: '' };
  const inp2 = d.querySelector('[data-ac-file]'); Object.defineProperty(inp2, 'files', { value: [new w.File(['x'], 'b.png', { type: 'image/png' })], configurable: true });
  inp2.dispatchEvent(new w.Event('change', { bubbles: true })); await wait(40);
  t('browser: a maths result lists the working line by line, Sahi / Galat in words, the fix, and the final answer verdict', /Sahi: 2x\+3=11/.test(app()) && /Galat: 2x=14/.test(app()) && /Sudhaar: 2x=8/.test(app()) && /Final answer sahi nahi hai/.test(app()) && /55\/100/.test(app()) && !/evaporation/.test(app()));
  fail2 = 'Aaj ki photo limit (20) poori ho gayi.';
  const inp3 = d.querySelector('[data-ac-file]'); Object.defineProperty(inp3, 'files', { value: [new w.File(['x'], 'c.png', { type: 'image/png' })], configurable: true });
  inp3.dispatchEvent(new w.Event('change', { bubbles: true })); await wait(40);
  t('browser: a server error (limit, unreadable photo) is shown as a message and the page keeps working', /ERR:Aaj ki photo limit/.test(app()) && !!d.querySelector('[data-ac=pick]') && !d.querySelector('[data-ac=pick]').disabled);
  const inp4 = d.querySelector('[data-ac-file]'); Object.defineProperty(inp4, 'files', { value: [new w.File(['x'], 'd.txt', { type: 'text/plain' })], configurable: true });
  const before = apiCalls.length; inp4.dispatchEvent(new w.Event('change', { bubbles: true })); await wait(20);
  t('browser: a file that is not a picture is refused without calling the server', apiCalls.length === before && /Photo chuno/.test(app()));
  d.querySelector('[data-ac=toggle]').click();
  t('browser: the chip closes the block again', !d.querySelector('[data-ac-file]'));
  w.eval("ACHECK._state.q1.busy = true"); w.eval('draw()');
  d.querySelector('[data-ac=toggle]').click(); w.eval("ACHECK._state.q1.open = true; draw()");
  t('browser: while reading, the photo button is disabled and says so', d.querySelector('[data-ac=pick]').disabled && /Padh raha hoon/.test(app()));

  console.log(pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})();
