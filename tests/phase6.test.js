// Phase 6 (Tasks 31-34) and the revision basics it needs (16/17/19): chapter topics, per-topic scores, the colour map, the Revise button, the home card.
// Pure modules, the two server routes (run with fakes) and the Recall page (jsdom; skipped when it is missing).
// Run: node tests/phase6.test.js
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
const R = require(path.join(ROOT, 'public', 'revision-core.js'));
const TP = require(path.join(ROOT, 'topics-core.js'));
const RC = require(path.join(ROOT, 'recall-core.js'));
let pass = 0, fail = 0;
const t = (name, ok, extra) => { if (ok) pass++; else { fail++; console.log('FAIL  ' + name + (extra ? '  ' + extra : '')); } };
const D = R.DAY, NOW = Date.UTC(2026, 10, 14, 5, 0, 0);

(async () => {
  // ================= revision-core: schedule (Tasks 16/17/19) =================
  {
    let r = R.update(null, 80, NOW);
    t('first right answer: stage 1, comes back in 1 day', r.stage === 1 && r.next === NOW + 1 * D && r.r === 1 && r.w === 0 && r.last === 80 && r.at === NOW);
    r = R.update(r, 90, NOW); t('second right: 3 days, stage 2', r.stage === 2 && r.next === NOW + 3 * D);
    r = R.update(r, 70, NOW); t('third right: 7 days, stage 3', r.stage === 3 && r.next === NOW + 7 * D);
    r = R.update(r, 60, NOW); t('fourth right (60 counts as right): 30 days, stage 4', r.stage === 4 && r.next === NOW + 30 * D);
    r = R.update(r, 100, NOW); t('keeps 30 days and stays at stage 4 after that', r.stage === 4 && r.next === NOW + 30 * D);
    const w = R.update(r, 59, NOW);
    t('a wrong answer (59): one step back, back tomorrow', w.stage === 3 && w.next === NOW + 1 * D && w.w === 1);
    t('a wrong answer at stage 0 stays at 0', R.update(null, 10, NOW).stage === 0 && R.update(R.update(null, 10, NOW), 0, NOW).stage === 0);
    let h = null; for (let i = 1; i <= 8; i++) h = R.update(h, i * 10, NOW);
    t('only the last 5 scores are kept', JSON.stringify(h.hist) === '[40,50,60,70,80]');
    t('score is clamped to 0-100 and junk becomes 0', R.update(null, 250, NOW).last === 100 && R.update(null, 'abc', NOW).last === 0 && R.update(null, -5, NOW).last === 0);
    const before = { stage: 2, hist: [50], r: 1, w: 1, last: 50, at: 1, next: 2 }, copy = JSON.stringify(before);
    R.update(before, 90, NOW); t('update never changes the record it was given', JSON.stringify(before) === copy);
  }
  // ================= strength + colours (Tasks 32/33) =================
  t('strength = average of the last scores, null if never scored', R.strength({ hist: [40, 60, 80] }) === 60 && R.strength(null) === null && R.strength({ hist: [] }) === null && R.strength({ hist: [49, 50] }) === 50);
  t('colour bands: 80+ good, 50-79 ok, below 50 weak, never scored new', R.band(80) === 'good' && R.band(79) === 'ok' && R.band(50) === 'ok' && R.band(49) === 'weak' && R.band(0) === 'weak' && R.band(100) === 'good' && R.band(null) === 'new' && R.band(undefined) === 'new');
  {
    const a = { 'c|1|t1': { stage: 1, hist: [50], at: 100, next: 200 }, 'c|1|t2': { stage: 2, hist: [90], at: 500, next: 900 } };
    const b = { 'c|1|t1': { stage: 2, hist: [50, 70], at: 300, next: 400 }, 'c|1|t3': { stage: 1, hist: [20], at: 50, next: 60 }, 'bad': { stage: 'x' }, 'bad2': null };
    const m = R.mergeTopics(a, b);
    t('mergeTopics: union, the record with the later time wins, junk dropped', m['c|1|t1'].at === 300 && m['c|1|t2'].at === 500 && m['c|1|t3'].at === 50 && !m.bad && !m.bad2 && Object.keys(m).length === 3);
    t('mergeTopics: either side may be missing', Object.keys(R.mergeTopics(null, a)).length === 2 && Object.keys(R.mergeTopics(undefined, undefined)).length === 0);
    const d = R.dueList({ x: { stage: 1, at: 1, next: NOW - 2 * D }, y: { stage: 1, at: 1, next: NOW + D }, z: { stage: 1, at: 1, next: NOW - 5 * D }, w: { stage: 1, at: 1, next: NOW } }, NOW);
    t('dueList: only due ones (due now counts), most overdue first', d.map(x => x.key).join() === 'z,x,w');
  }

  // ================= topics-core (Task 31) =================
  const QIDS = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6'];
  const good = { topics: [{ id: 'a', en: 'Photosynthesis', hi: 'प्रकाश संश्लेषण', as: 'সালোকসংশ্লেষণ', bn: 'সালোকসংশ্লেষণ' }, { id: 'b', en: 'Parts of a leaf', hi: 'पत्ती' }, { id: 'c', en: 'Nutrition types' }], map: { q1: 'a', q2: 'a', q3: 'b', q4: 'c', q5: 'c', q6: 'b' } };
  {
    const p = TP.parseTopics(JSON.stringify(good), QIDS);
    t('parseTopics: topics renumbered t1.. and every question is placed', p && p.topics.map(x => x.id).join() === 't1,t2,t3' && QIDS.every(q => /^t[1-3]$/.test(p.map[q])) && p.map.q1 === 't1' && p.map.q3 === 't2');
    t('parseTopics: all four languages present (English used when one is missing)', p.topics[0].hi === 'प्रकाश संश्लेषण' && p.topics[1].as === 'Parts of a leaf' && p.topics[2].bn === 'Nutrition types');
    t('parseTopics: fenced JSON and surrounding spaces are fine', !!TP.parseTopics('```json\n' + JSON.stringify(good) + '\n```', QIDS));
    t('parseTopics: not JSON / wrong shape = null', TP.parseTopics('hello', QIDS) === null && TP.parseTopics('{}', QIDS) === null && TP.parseTopics('{"topics":"x","map":{}}', QIDS) === null && TP.parseTopics('', QIDS) === null);
    t('parseTopics: fewer than 3 usable topics = null', TP.parseTopics(JSON.stringify({ topics: good.topics.slice(0, 2), map: good.map }), QIDS) === null);
    const many = { topics: Array.from({ length: 14 }, (_, i) => ({ id: 'i' + i, en: 'Topic ' + i })), map: Object.fromEntries(QIDS.map((q, i) => [q, 'i' + (i % 3)])) };
    t('parseTopics: at most 10 topics', TP.parseTopics(JSON.stringify(many), QIDS).topics.length === 10);
    const some = { topics: good.topics, map: { q1: 'a', q2: 'a', q3: 'b', q4: 'c', q5: 'c' } };
    const ps = TP.parseTopics(JSON.stringify(some), QIDS);
    t('parseTopics: one question the AI forgot goes to an "Other questions" topic (tx)', ps && ps.map.q6 === 'tx' && ps.topics[ps.topics.length - 1].id === 'tx' && /Other/.test(ps.topics[ps.topics.length - 1].en));
    t('parseTopics: more than half of the questions left out = null (not really placed)', TP.parseTopics(JSON.stringify({ topics: good.topics, map: { q1: 'a' } }), QIDS) === null);
    const wrongIds = { topics: good.topics, map: { ...good.map, q2: 'zzz', extra: 'a' } };
    const pw = TP.parseTopics(JSON.stringify(wrongIds), QIDS);
    t('parseTopics: a map to an unknown topic goes to Other, an unknown question id is dropped', pw.map.q2 === 'tx' && !('extra' in pw.map));
    const dirty = TP.parseTopics(JSON.stringify({ topics: [{ id: 'a', en: '<b>Bold</b>\nname' + 'x'.repeat(100) }, { id: 'b', en: 'B' }, { id: 'c', en: 'C' }], map: good.map }), QIDS);
    t('parseTopics: names are cleaned (no tags, no new lines) and cut to 60 characters', !/[<>\n]/.test(dirty.topics[0].en) && dirty.topics[0].en.length <= 60);
    t('parseTopics: a repeated topic id is ignored', TP.parseTopics(JSON.stringify({ topics: [{ id: 'a', en: 'A' }, { id: 'a', en: 'A again' }, { id: 'b', en: 'B' }, { id: 'c', en: 'C' }], map: good.map }), QIDS).topics.length === 3);
  }
  {
    const doc = { topics: [{ id: 't1', en: 'Leaf' }, { id: 't2', en: 'Roots' }, { id: 't3', en: 'Stem' }], map: { q1: 't1', q2: 't2', q3: 't1' } };
    const ch = { sections: [{ questions: [{ id: 'q1', text: 'What is a leaf?' }, { id: 'q2', text: 'Roots do what?' }] }, { questions: [{ id: 'q3', text: 'Why are leaves green?' }, { id: 'q9', text: 'unmapped' }] }] };
    const f = TP.focusOf(doc, 't1', ch);
    t('focusOf: the topic name and only its questions', f && f.id === 't1' && f.name === 'Leaf' && f.questions.join('|') === 'What is a leaf?|Why are leaves green?');
    t('focusOf: unknown topic / no doc = null', TP.focusOf(doc, 't9', ch) === null && TP.focusOf(null, 't1', ch) === null && TP.focusOf({}, 't1', ch) === null);
    t('validDoc accepts a good doc and refuses broken ones', TP.validDoc(doc) && !TP.validDoc(null) && !TP.validDoc({ topics: [] }) && !TP.validDoc({ topics: [{ id: 'evil/../x', en: 'a' }, { id: 't2', en: 'b' }, { id: 't3', en: 'c' }], map: {} }) && !TP.validDoc({ topics: doc.topics }));
    t('docId: only letters, digits and dashes of the course, then _ and the chapter number', TP.docId('c7-science', 3) === 'c7-science_3' && TP.docId('../x/y', '12') === 'xy_12');
    t('prompt lists every question id with its text', /q1: What is a leaf\?/.test(TP.buildPrompt({ class: 7, subject: 'Science' }, { no: 1, title: 'T' }, 'ref', [{ id: 'q1', text: 'What is a leaf?' }])));
  }

  // ================= recall-core: topic scores =================
  {
    const course = { class: 7, subject: 'Science' }, ch = { no: 1, title: 'Nutrition', sections: [{ questions: [{ id: 'q1', no: 1, text: 'Q one' }] }] };
    const topics = [{ id: 't1', en: 'Leaf' }, { id: 't2', en: 'Roots' }];
    const plain = RC.buildPrompt(course, ch, 'my text', {});
    t('prompt without topics is unchanged (no topic lines)', !/Topics of this chapter|ONLY this topic/.test(plain));
    const withT = RC.buildPrompt(course, ch, 'my text', { topics });
    t('prompt with topics lists each id and asks for a 0-100 score per topic', /t1: Leaf/.test(withT) && /t2: Roots/.test(withT) && /"topics":/.test(withT));
    const foc = RC.buildPrompt(course, ch, 'my text', { topics, focus: { id: 't2', name: 'Roots', questions: ['What do roots do?'] } });
    t('focus prompt: only that topic, its questions, one id asked', /ONLY this topic: "Roots"/.test(foc) && /What do roots do\?/.test(foc) && /"t2":/.test(foc) && !/t1: Leaf/.test(foc));
    const raw = o => JSON.stringify({ scores: { c: 70, f: 70, t: 70, l: 70, m: 70 }, got: [], miss: [], wrong: [], ...o });
    const a = RC.parseResult(raw({ topics: { t1: 82.4, t2: '15', t9: 99, t3: 'abc' } }), 'concept', ['t1', 't2']);
    t('parseResult: only the asked topic ids, numbers clamped and rounded', a.topics && a.topics.t1 === 82 && a.topics.t2 === 15 && !('t9' in a.topics) && !('t3' in a.topics));
    t('parseResult: topic scores above 100 or below 0 are clamped', RC.parseResult(raw({ topics: { t1: 500, t2: -3 } }), 'concept', ['t1', 't2']).topics.t1 === 100);
    t('parseResult: no topic ids asked = no "topics" in the result (old behaviour)', !('topics' in RC.parseResult(raw({ topics: { t1: 50 } }), 'concept')) && !('topics' in RC.parseResult(raw({}), 'concept', [])));
    t('parseResult: the AI left topics out = no "topics" key (the app then changes no topic record), the rest still works', !('topics' in RC.parseResult(raw({}), 'concept', ['t1'])) && RC.parseResult(raw({}), 'concept', ['t1']).total === 70);
  }

  // ================= server routes, run with fakes =================
  const src = read('server.js'), rules = read('firestore.rules');
  const mkRes = () => { const r = { code: 200, body: null }; r.status = c => { r.code = c; return r; }; r.json = b => { r.body = b; return r; }; return r; };
  const QUIZ = { courses: [{ id: 'c7-science', class: 7, subject: 'Science', chapters: [{ no: 1, title: 'Nutrition', sections: [{ title: 'S', questions: [{ id: 'q1', no: 1, text: 'Q one' }, { id: 'q2', no: 2, text: 'Q two' }, { id: 'q3', no: 3, text: 'Q three' }] }] }, { no: 2, title: 'Soon', locked: true, sections: [] }] }] };
  {
    const rs = src.indexOf("app.post('/api/topics/generate'"), route = src.slice(rs, src.indexOf('\n});', rs) + 4);
    const mk = o => {
      const h = {}, saved = [], calls = [], cache = new Map();
      const FSDB = o.noDb ? null : { collection: c => ({ doc: id => ({ set: async d => { if (o.saveFail) throw new Error('perm'); saved.push([c, id, d]); } }) }) };
      new Function('app', 'isAdminReq', 'RECALL', 'QUIZ', 'FSDB', 'TOPICS', 'topicsOf', 'guardAI', 'geminiFor', 'failMsgFor', 'TOPIC_CACHE', route)(
        { post: (p, fn) => { h[p] = fn; } }, () => o.admin !== false, RC, QUIZ, FSDB, TP, async () => o.have || null, async () => o.guard !== false,
        async (req, sys, prompt) => { calls.push(prompt); return o.ai || { text: JSON.stringify({ topics: [{ id: 'a', en: 'One' }, { id: 'b', en: 'Two' }, { id: 'c', en: 'Three' }], map: { q1: 'a', q2: 'b', q3: 'c' } }) }; }, () => 'AI error', cache);
      return { go: async body => { const r = mkRes(); await h['/api/topics/generate']({ body, user: { uid: 'adm' } }, r); return r; }, saved, calls, cache };
    };
    let x = mk({ admin: false }), r = await x.go({ course: 'c7-science', ch: 1 });
    t('generate: only the admin (403 for others), no AI call', r.code === 403 && x.calls.length === 0);
    x = mk({}); r = await x.go({ course: 'nope', ch: 1 }); t('generate: unknown chapter = 400', r.code === 400);
    r = await x.go({ course: 'c7-science', ch: 2 }); t('generate: a "coming soon" chapter = 400', r.code === 400);
    x = mk({ noDb: true }); r = await x.go({ course: 'c7-science', ch: 1 }); t('generate: no service account = clear 503 message, no AI call', r.code === 503 && /FIREBASE_SERVICE_ACCOUNT/.test(r.body.error) && x.calls.length === 0);
    x = mk({}); r = await x.go({ course: 'c7-science', ch: 1 });
    t('generate: AI answer is validated and saved once in chapterTopics/<course>_<chapter>', r.code === 200 && r.body.existing === false && x.saved.length === 1 && x.saved[0][0] === 'chapterTopics' && x.saved[0][1] === 'c7-science_1' && x.saved[0][2].topics.length === 3 && x.saved[0][2].map.q1 === 't1' && x.saved[0][2].course === 'c7-science');
    t('generate: the new doc is put in the server cache', x.cache.get('c7-science_1') && x.cache.get('c7-science_1').doc.topics.length === 3);
    const have = { topics: [{ id: 't1', en: 'A' }, { id: 't2', en: 'B' }, { id: 't3', en: 'C' }], map: { q1: 't1' } };
    x = mk({ have }); r = await x.go({ course: 'c7-science', ch: 1 });
    t('generate: topics already saved = returned as they are, NO AI call (not every time)', r.code === 200 && r.body.existing === true && x.calls.length === 0 && x.saved.length === 0);
    x = mk({ have }); r = await x.go({ course: 'c7-science', ch: 1, force: true });
    t('generate: force = make them again', x.calls.length === 1 && x.saved.length === 1);
    x = mk({ ai: { text: 'not json' } }); r = await x.go({ course: 'c7-science', ch: 1 }); t('generate: unusable AI answer = 502 and nothing saved', r.code === 502 && x.saved.length === 0);
    x = mk({ ai: { text: '', status: 500 } }); r = await x.go({ course: 'c7-science', ch: 1 }); t('generate: AI down = 502 with the normal message', r.code === 502 && r.body.error === 'AI error' && x.saved.length === 0);
    const ce = console.error; console.error = () => {}; x = mk({ saveFail: true }); r = await x.go({ course: 'c7-science', ch: 1 }); console.error = ce; t('generate: Firestore refuses the save = 500, not cached', r.code === 500 && !x.cache.has('c7-science_1'));
  }
  {   // topicsOf: the read helper with its cache
    const a = src.indexOf('const TOPIC_CACHE'), b = src.indexOf('\n}\n', src.indexOf('async function topicsOf', a)) + 3;
    let reads = 0, store = null;
    const FSDB = { collection: () => ({ doc: () => ({ get: async () => { reads++; return { exists: !!store, data: () => store }; } }) }) };
    const topicsOf = new Function('FSDB', 'TOPICS', 'console', src.slice(a, b) + '\nreturn topicsOf;')(FSDB, TP, { error() {} });
    store = { topics: [{ id: 't1', en: 'A' }, { id: 't2', en: 'B' }, { id: 't3', en: 'C' }], map: {} };
    const d1 = await topicsOf('c7-science', 1), d2 = await topicsOf('c7-science', 1);
    t('topicsOf: reads once, then the cache (a Recall check costs no extra read)', d1 && d2 && reads === 1);
    store = { topics: [] }; await topicsOf('c7-science', 2); t('topicsOf: a broken doc counts as "no topics"', (await topicsOf('c7-science', 2)) === null);
    const none = new Function('FSDB', 'TOPICS', 'console', src.slice(a, b) + '\nreturn topicsOf;')(null, TP, { error() {} });
    t('topicsOf: no Firestore = null', (await none('c7-science', 1)) === null);
  }
  {   // evaluate route with topics
    const rs = src.indexOf("app.post('/api/recall/evaluate'"), route = src.slice(rs, src.indexOf('\n});', rs) + 4);
    const doc = { topics: [{ id: 't1', en: 'Leaf' }, { id: 't2', en: 'Roots' }, { id: 't3', en: 'Stem' }], map: { q1: 't1', q2: 't2', q3: 't3' } };
    const mk = (tdoc, aiText) => {
      const h = {}, prompts = [];
      new Function('app', 'RECALL', 'QUIZ', 'userKeyOf', 'guardAI', 'takeFree', 'refundFree', 'freeLeft', 'geminiFor', 'failMsgFor', 'topicsOf', 'TOPICS', route)(
        { post: (p, fn) => { h[p] = fn; } }, RC, QUIZ, () => '', async () => true, async () => true, async () => {}, async () => 0,
        async (req, sys, prompt) => { prompts.push(prompt); return { text: aiText }; }, () => 'AI error', async () => tdoc, TP);
      return { prompts, go: async extra => { const r = mkRes(); await h['/api/recall/evaluate']({ body: { course: 'c7-science', ch: 1, type: 'concept', text: 'a long enough explanation here', ...extra }, headers: {}, user: { uid: 'kid' } }, r); return r; } };
    };
    const ai = JSON.stringify({ scores: { c: 80, f: 80, t: 80, l: 80, m: 80 }, got: [], miss: [], wrong: [], topics: { t1: 90, t2: 30, t3: 55, t9: 1 } });
    let x = mk(doc, ai), r = await x.go({});
    t('evaluate: with saved topics the prompt asks for them and the answer carries "topics"', r.code === 200 && /t2: Roots/.test(x.prompts[0]) && r.body.topics && r.body.topics.t1 === 90 && r.body.topics.t2 === 30 && !('t9' in r.body.topics));
    x = mk(doc, ai); r = await x.go({ topic: 't2' });
    t('evaluate: with a topic only that topic is asked and returned (Task 34)', r.code === 200 && /ONLY this topic: "Roots"/.test(x.prompts[0]) && Object.keys(r.body.topics).join() === 't2');
    x = mk(doc, ai); r = await x.go({ topic: 'zzz' }); t('evaluate: an unknown topic = 400, no AI call', r.code === 400 && x.prompts.length === 0);
    x = mk(null, ai); r = await x.go({ topic: 't1' }); t('evaluate: topic asked but chapter has no saved topics = 400', r.code === 400 && x.prompts.length === 0);
    x = mk(null, ai); r = await x.go({}); t('evaluate: chapter without topics works exactly as before (no "topics" key)', r.code === 200 && !('topics' in r.body) && !/Topics of this chapter/.test(x.prompts[0]));
  }
  t('rules: chapterTopics is readable by signed-in users and closed for writing', /match \/chapterTopics\/\{id\}\s*\{\s*allow read: if request\.auth != null;\s*allow write: if false;/.test(rules));
  t('cloud.js: CLOUD.topics.get reads chapterTopics with the same id as the server', /chapterTopics', id/.test(read('public/cloud.js')) && /replace\(\/\[\^A-Za-z0-9-\]\/g, ''\) \+ '_' \+ Number\(chNo\)/.test(read('public/cloud.js')));
  t('index.html loads revision-core.js before recall.js and puts the home card on the home page', read('public/index.html').indexOf('/revision-core.js') > 0 && read('public/index.html').indexOf('/revision-core.js') < read('public/index.html').indexOf('/recall.js') && /RECALL\.homeHTML/.test(read('public/index.html')));
  t('index.html syncs Recall when cloud data arrives (login)', /window\.onCloudData=cd=>\{\s*if\(window\.RECALL&&RECALL\.sync\)RECALL\.sync\(\)/.test(read('public/index.html')));

  // ================= the Recall page (jsdom) =================
  let JSDOM = null; try { ({ JSDOM } = require('jsdom')); } catch (e) { /* skipped */ }
  if (!JSDOM) console.log('SKIP  jsdom not installed - map / Revise / home card tests not run');
  else {
    const rsrc = read('public/recall.js'), rev = read('public/revision-core.js');
    const TDOC = { course: 'c7-science', ch: 1, topics: [{ id: 't1', en: 'Leaf', hi: 'पत्ती', as: 'পাত', bn: 'পাতা' }, { id: 't2', en: 'Roots', hi: 'जड़', as: 'শিপা', bn: 'মূল' }, { id: 't3', en: 'Stem' }, { id: 't4', en: 'Flowers' }], map: { q1: 't1', q2: 't2', q3: 't3', q4: 't1' } };
    const boot = opt => {
      opt = opt || {};
      const dom = new JSDOM('<!doctype html><body><div id="app"></div></body>', { runScripts: 'outside-only', url: 'https://orbittutorial.web.app/', pretendToBeVisual: true });
      const w = dom.window, state = { gone: [], posts: [], cloud: opt.cloud || {}, topicReads: 0 };
      w.scrollTo = () => {}; w.fetch = async () => ({ ok: true, json: async () => ({ left: 1 }) });
      w.api = async (p, body) => { state.posts.push([p, body]); if (p === '/api/topics/generate') { if (opt.genFail) throw new Error('AI limit'); return { existing: !!opt.genExisting && body.ch === 1 }; } if (p === '/api/recall/evaluate') return opt.result || { total: 70, scores: { c: 70, f: 70, t: 70, l: 70, m: 70 }, weights: { c: 30, f: 25, t: 20, l: 15, m: 10 }, got: [], miss: [], wrong: [], topics: { t1: 90, t2: 30 }, left: 0 }; return { ok: true }; };
      w.CLOUD = { token: async () => 't', topics: { get: async () => { state.topicReads++; return opt.noTopics ? null : TDOC; } },
        recall: { get: async () => (state.cloud.items === undefined ? null : { items: state.cloud.items, topics: state.cloud.topics || {} }), set: async d => { state.cloud.items = d.items; state.cloud.topics = d.topics; } } };
      if (opt.admin) w.QVideo = { isAdmin: () => true };
      w.eval('var ST={rvoice:"text",tlang:"' + (opt.tlang || 'as') + '"};var USER={uid:"u1"};var DATA={courses:[{id:"c7-science",class:7,subject:"Science",chapters:[{no:1,title:"Nutrition in Plants",sections:[{title:"S",questions:[{id:"q1",no:1,text:"What is a leaf?"},{id:"q2",no:2,text:"What do roots do?"},{id:"q3",no:3,text:"Stem job?"},{id:"q4",no:4,text:"Why are leaves green?"}]}]}]}]};function draw(){document.getElementById("app").innerHTML=RECALL.viewHTML()}');
      w.go = v => { state.gone.push(v); };
      w.eval(rev); w.eval(rsrc);
      if (opt.topicsLocal) w.localStorage.setItem('orbit.recall.topics.u1', JSON.stringify(opt.topicsLocal));
      return { w, state, html: () => w.document.getElementById('app').innerHTML, pickChapter: async () => { w.eval('RECALL._reset()'); w.document.getElementById('app').innerHTML = w.RECALL.viewHTML(); const sel = w.document.getElementById('rcTopic'); sel.value = 'c7-science|1'; sel.dispatchEvent(new w.Event('change', { bubbles: true })); await tick(); await tick(); }, local: () => JSON.parse(w.localStorage.getItem('orbit.recall.topics.u1') || '{}') };
    };
    const tick = () => new Promise(r => setTimeout(r, 25));
    const rec = (hist, next) => ({ stage: 1, hist, r: 1, w: 0, last: hist[hist.length - 1], at: Date.now() - 1000, next: next === undefined ? Date.now() + 86400000 : next });
    const topicsLocal = { 'c7-science|1|t1': rec([90, 85]), 'c7-science|1|t2': rec([30, 20]), 'c7-science|1|t3': rec([60, 70]) };   // good, weak, ok, t4 never scored
    {
      const p = boot({ topicsLocal }); await p.pickChapter();
      const tiles = [...p.w.document.querySelectorAll('.rc-tile')], by = id => tiles.find(x => x.innerHTML.includes('data-t="' + id + '"') || x.textContent.includes(id));
      t('map: one tile per topic of the chapter', tiles.length === 4);
      t('map: colours = bands: t1 good, t2 weak, t3 ok, t4 new', tiles.map(x => x.dataset.band).join() === 'good,weak,ok,new');
      t('map: each tile shows its word and percentage', /Pakka · 88%/.test(tiles[0].textContent) && /Kamzor · 25%/.test(tiles[1].textContent) && /Theek-thaak · 65%/.test(tiles[2].textContent) && /Abhi nahi dekha/.test(tiles[3].textContent) && !/%/.test(tiles[3].textContent));
      t('map: colour is not the only signal - every tile also has its word', tiles.every(x => /Pakka|Kamzor|Theek-thaak|Abhi nahi dekha/.test(x.textContent)));
      t('map: Revise karo only on the weak and ok tiles', tiles.map(x => !!x.querySelector('[data-rc="rev"]')).join() === 'false,true,true,false');
      t('map: topic names follow the translation language (Assamese here)', /পাত/.test(tiles[0].textContent) && /শিপা/.test(tiles[1].textContent) && /Stem/.test(tiles[2].textContent));
      const h = boot({ topicsLocal, tlang: 'hing' }); await h.pickChapter();
      t('map: Hinglish setting shows the Hindi names', /पत्ती/.test(h.html()) && /जड़/.test(h.html()));
      const e = boot({ topicsLocal, tlang: 'en' }); await e.pickChapter();
      t('map: English setting shows the English names', /Leaf/.test(e.html()) && !/पत्ती/.test(e.html()));
      t('the map also reads fine in a dark theme: tiles set their own text colour', tiles.every(x => /color:/.test(x.getAttribute('style'))));
      // Task 34: tap Revise
      p.w.document.querySelector('[data-rc="rev"][data-t="t2"]').click(); await tick();
      t('Revise karo: the form says it is only this topic and lists the topic\'s questions', /Sirf is topic ka revision: শিপা/.test(p.html()) && /What do roots do\?/.test(p.html()) && !/What is a leaf\?/.test(p.html()));
      t('Revise karo: that tile is marked as chosen', /outline:3px/.test(p.w.document.querySelector('[data-t="t2"]').closest('.rc-tile').getAttribute('style')));
      p.w.document.getElementById('rcText').value = 'Roots take water from the soil and hold the plant.'; p.w.document.getElementById('rcText').dispatchEvent(new p.w.Event('input', { bubbles: true }));
      p.w.document.querySelector('[data-rc="go"]').click(); await tick(); await tick();
      const post = p.state.posts.find(x => x[0] === '/api/recall/evaluate');
      t('Recall for one topic: the request carries the topic id and the chapter', post && post[1].topic === 't2' && post[1].course === 'c7-science' && post[1].ch === 1);
      const T = p.local();
      t('topic scores saved: t1 90 and t2 30 added to their last-5 lists, schedule set', T['c7-science|1|t1'].hist.join() === '90,85,90' && T['c7-science|1|t2'].hist.join() === '30,20,30' && T['c7-science|1|t2'].next > Date.now() && T['c7-science|1|t2'].w === 1 && T['c7-science|1|t1'].r === 2);
      t('topic not scored this time (t3) keeps its record untouched', JSON.stringify(T['c7-science|1|t3']) === JSON.stringify(topicsLocal['c7-science|1|t3']));
      t('the new records are saved in the account too', p.state.cloud.topics && p.state.cloud.topics['c7-science|1|t2'] && p.state.cloud.topics['c7-science|1|t2'].hist.length === 3);
      t('the result page shows the updated map under the report', /Topic map/.test(p.html()) && /rc-tile/.test(p.html()));
      p.w.document.querySelector('[data-rc="again"]').click(); await tick();
      t('"Dobara try" goes back to the form and the map', /Evaluate My Knowledge/.test(p.html()) && /Topic map/.test(p.html()));
      p.w.document.querySelector('[data-rc="alltopics"]').click(); await tick();
      t('"Poore chapter par jao" removes the topic focus', !/Sirf is topic ka revision/.test(p.html()));
    }
    {
      const p = boot({ topicsLocal }); await p.pickChapter();
      p.w.document.getElementById('rcText').value = 'A full explanation of the whole chapter here.'; p.w.document.getElementById('rcText').dispatchEvent(new p.w.Event('input', { bubbles: true }));
      p.w.document.querySelector('[data-rc="go"]').click(); await tick(); await tick();
      const post = p.state.posts.find(x => x[0] === '/api/recall/evaluate');
      t('whole-chapter Recall sends no topic', post && !('topic' in post[1]));
    }
    {
      const p = boot({ result: { total: 70, scores: { c: 70, f: 70, t: 70, l: 70, m: 70 }, weights: { c: 30, f: 25, t: 20, l: 15, m: 10 }, got: [], miss: [], wrong: [], left: 0 } }); await p.pickChapter();
      p.w.document.getElementById('rcText').value = 'A full explanation of the whole chapter here.'; p.w.document.getElementById('rcText').dispatchEvent(new p.w.Event('input', { bubbles: true }));
      p.w.document.querySelector('[data-rc="go"]').click(); await tick(); await tick();
      t('an answer without topic scores (chapter had none) changes no topic record', Object.keys(p.local()).length === 0);
    }
    {
      const p = boot({ noTopics: true }); await p.pickChapter();
      t('chapter without topics: a friendly line, no tiles, no admin button for a student', /abhi nahi bane/.test(p.html()) && !p.w.document.querySelector('.rc-tile') && !/data-rc="gen"/.test(p.html()));
      const a = boot({ noTopics: true, admin: true }); await a.pickChapter();
      t('chapter without topics: the admin sees "Topics banao"', /data-rc="gen"/.test(a.html()));
      a.w.document.querySelector('[data-rc="gen"]').click(); await tick(); await tick();
      t('admin button calls the generate route for that chapter', a.state.posts.some(x => x[0] === '/api/topics/generate' && x[1].course === 'c7-science' && x[1].ch === 1));
    }
    {
      const p = boot({}); p.w.eval('RECALL._reset()'); p.w.document.getElementById('app').innerHTML = p.w.RECALL.viewHTML();
      t('no chapter chosen yet: no map card, no topic request', !/Topic map/.test(p.html()) && p.state.topicReads === 0);
      await p.pickChapter(); const reads = p.state.topicReads; p.w.eval('draw();draw();draw()'); await tick();
      t('topics are fetched once per chapter, not on every redraw', reads === 1 && p.state.topicReads === 1);
    }
    {   // home card (Task 18, basic)
      const p = boot({}), H = () => p.w.RECALL.homeHTML();
      t('home: no revision records yet = no card', H() === '');
      p.w.localStorage.setItem('orbit.recall.topics.u1', JSON.stringify({ 'c7-science|1|t1': rec([90], Date.now() + 86400000) }));
      t('home: records but nothing due = "poora" message, no button', /poora/.test(H()) && !/data-rc="due"/.test(H()));
      p.w.localStorage.setItem('orbit.recall.topics.u1', JSON.stringify({ 'c7-science|1|t1': rec([90], Date.now() - 86400000), 'c7-science|1|t2': rec([20], Date.now() - 3 * 86400000), 'c7-science|1|t3': rec([60], Date.now() + 86400000) }));
      t('home: shows how many topics are due and the chapter of the most overdue one', /<b>2<\/b> topic/.test(H()) && /Nutrition in Plants/.test(H()) && /data-rc="due"/.test(H()));
      p.w.document.getElementById('app').innerHTML = H(); p.w.document.querySelector('[data-rc="due"]').click(); await tick();
      t('home: "Revise shuru karo" opens Recall on the most overdue topic (t2)', p.state.gone.join() === 'recall');
      p.w.document.getElementById('app').innerHTML = p.w.RECALL.viewHTML(); await tick(); await tick();
      t('... with the chapter chosen and the topic focus on', /Sirf is topic ka revision/.test(p.html()) && /What do roots do\?/.test(p.html()));
      const q = boot({}); q.w.eval('USER={uid:""}');
      t('home: nobody logged in = no card', q.w.RECALL.homeHTML() === '');
    }
    {   // account sync of topic records
      const cloud = { items: [], topics: { 'c7-science|1|t1': { stage: 2, hist: [95], r: 2, w: 0, last: 95, at: 5000, next: 9000 } } };
      const p = boot({ cloud, topicsLocal: { 'c7-science|1|t2': { stage: 1, hist: [30], r: 0, w: 1, last: 30, at: 6000, next: 7000 }, 'c7-science|1|t1': { stage: 1, hist: [40], r: 1, w: 0, last: 40, at: 1000, next: 2000 } } });
      await p.w.RECALL.sync(); await tick();
      const T = p.local();
      t('login sync: account and phone topic records are merged, the newer one wins per topic', T['c7-science|1|t1'].last === 95 && T['c7-science|1|t2'].last === 30 && Object.keys(T).length === 2);
      t('login sync: the merged records are written back to the account', Object.keys(cloud.topics).length === 2 && cloud.topics['c7-science|1|t2'].last === 30);
      const p2 = boot({ cloud }); await p2.w.RECALL.sync(); await tick();
      t('a second phone gets the same topic records after login', JSON.stringify(Object.keys(p2.local()).sort()) === JSON.stringify(['c7-science|1|t1', 'c7-science|1|t2']));
      const p3 = boot({ cloud: { items: [], topics: {} }, topicsLocal: {} }); let writes = 0; const orig = p3.w.CLOUD.recall.set; p3.w.CLOUD.recall.set = async d => { writes++; return orig(d); };
      await p3.w.RECALL.sync(); await tick(); t('nothing to merge = no write to Firestore', writes === 0);
    }
  }
  // ---- extra: Task 20 chapter marks, Task 18 queue, whole-course topics ----
  t('chapterStrength: average of the last 5 attempts of that chapter only, null if none', R.chapterStrength([{ k: 'a|1', t: 10, at: 1 }, { k: 'a|1', t: 20, at: 2 }, { k: 'a|1', t: 30, at: 3 }, { k: 'a|1', t: 40, at: 4 }, { k: 'a|1', t: 50, at: 5 }, { k: 'a|1', t: 100, at: 6 }, { k: 'b|1', t: 0, at: 7 }], 'a|1') === 48 && R.chapterStrength([], 'a|1') === null && R.chapterStrength(null, 'a|1') === null && R.chapterStrength([{ k: 'a|1', t: 'x', at: 1 }], 'a|1') === null);
  t('chapterStrength: attempts out of order are sorted by time first', R.chapterStrength([{ k: 'a|1', t: 90, at: 9 }, { k: 'a|1', t: 10, at: 1 }, { k: 'a|1', t: 20, at: 2 }, { k: 'a|1', t: 30, at: 3 }, { k: 'a|1', t: 40, at: 4 }, { k: 'a|1', t: 50, at: 5 }], 'a|1') === 46);
  if (JSDOM) {
    const rsrc2 = read('public/recall.js'), rev2 = read('public/revision-core.js'), tick2 = () => new Promise(r => setTimeout(r, 25));
    const TD2 = { course: 'c7-science', ch: 1, topics: [{ id: 't1', en: 'Leaf' }, { id: 't2', en: 'Roots' }, { id: 't3', en: 'Stem' }], map: { q1: 't1', q2: 't2', q3: 't3' } };
    const boot2 = opt => {
      const dom = new JSDOM('<!doctype html><body><div id="app"></div></body>', { runScripts: 'outside-only', url: 'https://orbittutorial.web.app/', pretendToBeVisual: true });
      const w = dom.window, posts = [], gone = [];
      w.scrollTo = () => {}; w.fetch = async () => ({ ok: true, json: async () => ({ left: 1 }) }); w.go = v => gone.push(v);
      w.api = async (p, body) => {
        posts.push([p, body]);
        if (p === '/api/topics/generate') { if (opt.genFail) throw new Error('AI limit'); return { existing: false }; }
        return { total: 70, scores: { c: 70, f: 70, t: 70, l: 70, m: 70 }, weights: { c: 30, f: 25, t: 20, l: 15, m: 10 }, got: [], miss: [], wrong: [], topics: body.topic ? { [body.topic]: 90 } : {}, left: null };   // left null = a parent key is set (no daily limit), so several revisions in a row are possible
      };
      w.CLOUD = { token: async () => 't', topics: { get: async () => TD2 }, recall: { get: async () => null, set: async () => {} } };
      if (opt.admin) w.QVideo = { isAdmin: () => true };
      w.eval('var ST={rvoice:"text",tlang:"en"};var USER={uid:"u1"};var DATA={courses:[{id:"c7-science",class:7,subject:"Science",chapters:[{no:1,title:"Nutrition in Plants",sections:[{title:"S",questions:[{id:"q1",no:1,text:"What is a leaf?"},{id:"q2",no:2,text:"What do roots do?"},{id:"q3",no:3,text:"Stem job?"}]}]},{no:2,title:"Respiration",sections:[{title:"S",questions:[{id:"q9",no:1,text:"x"}]}]},{no:3,title:"Soon",locked:true,sections:[]},{no:4,title:"Four",sections:[{title:"S",questions:[{id:"q8",no:1,text:"y"}]}]},{no:5,title:"Five",sections:[{title:"S",questions:[{id:"q7",no:1,text:"z"}]}]}]}]};function draw(){document.getElementById("app").innerHTML=RECALL.viewHTML()}');
      w.eval(rev2); w.eval(rsrc2);
      if (opt.items) w.localStorage.setItem('orbit.recall.u1', JSON.stringify(opt.items));
      if (opt.topics) w.localStorage.setItem('orbit.recall.topics.u1', JSON.stringify(opt.topics));
      const html = () => w.document.getElementById('app').innerHTML;
      const open = () => { w.document.getElementById('app').innerHTML = w.RECALL.viewHTML(); };
      return { w, posts, gone, html, open };
    };
    const day = 86400000, due = (h, ago) => ({ stage: 1, hist: h, r: 1, w: 0, last: h[h.length - 1], at: Date.now() - 5 * day, next: Date.now() - ago * day });
    {   // Task 20
      const att = (k, scores) => scores.map((t, i) => ({ k, t, at: 1000 + i }));
      const p = boot2({ items: [...att('c7-science|1', [90, 80, 85]), ...att('c7-science|2', [30, 20]), ...att('c7-science|4', [60])] });
      p.open();
      const opts = [...p.w.document.querySelectorAll('#rcTopic option')].map(o => o.textContent);
      t('Task 20: the chapter picker shows the word and % of each chapter the student has tried', /Nutrition in Plants · Pakka 85%/.test(opts.join('|')) && /Respiration · Kamzor 25%/.test(opts.join('|')) && /Four · Theek-thaak 60%/.test(opts.join('|')));
      t('Task 20: a chapter never tried has no mark', opts.some(o => o === 'Ch 5: Five'));
      const rows = [...p.w.document.querySelectorAll('.rc-chrow')];
      t('Task 20: "Chapter-wise haal" lists only tried chapters, weakest first, with a word and a bar', rows.length === 3 && rows[0].dataset.band === 'weak' && /Respiration/.test(rows[0].textContent) && /Kamzor 25%/.test(rows[0].textContent) && rows[2].dataset.band === 'good' && /width:85%/.test(rows[2].innerHTML));
      const none = boot2({}); none.open();
      t('Task 20: no attempts = no list and no marks', !/Chapter-wise haal/.test(none.html()) && !/ · (Pakka|Kamzor|Theek-thaak) \d/.test(none.html()));
      const AT = Date.now(); p.w.localStorage.setItem('orbit.recall.u1', JSON.stringify(att('c7-science|1', [10])));
      p.open(); t('Task 20: the mark follows the real scores (now 10% = red)', /Nutrition in Plants · Kamzor 10%/.test(p.html()));
    }
    {   // Task 18: walk through the due topics
      const topics = { 'c7-science|1|t1': due([70], 1), 'c7-science|1|t2': due([20], 3), 'c7-science|1|t3': due([60], 2), 'c7-science|2|t1': due([60], -5) };   // t2 most overdue, then t3, t1; chapter 2 is not due
      const p = boot2({ topics });
      p.w.eval('document.getElementById("app").innerHTML = RECALL.homeHTML()');
      t('home card counts exactly the due topics (3, not the one due later)', /<b>3<\/b> topic/.test(p.html()));
      p.w.document.querySelector('[data-rc="due"]').click(); await tick2(); p.open(); await tick2(); await tick2();
      t('Aaj ka revision: starts with the most overdue topic and only its questions', p.gone.join() === 'recall' && /Sirf is topic ka revision: Roots/.test(p.html()) && /What do roots do\?/.test(p.html()) && !/Stem job/.test(p.html()));
      p.w.document.getElementById('rcText').value = 'Roots take water from the soil for the plant.'; p.w.document.getElementById('rcText').dispatchEvent(new p.w.Event('input', { bubbles: true }));
      p.w.document.querySelector('[data-rc="go"]').click(); await tick2(); await tick2();
      t('after the answer: "Agla revision (2 baaki)"', /Agla revision \(2 baaki\)/.test(p.html()));
      const post = p.posts.find(x => x[0] === '/api/recall/evaluate'); t('... and that answer was only about the first topic', post[1].topic === 't2');
      p.w.document.querySelector('[data-rc="nextdue"]').click(); await tick2(); await tick2();
      t('Agla revision opens the next due topic (Stem)', /Sirf is topic ka revision: Stem/.test(p.html()) && /Stem job/.test(p.html()));
      p.w.document.getElementById('rcText').value = 'The stem carries water and food to every part.'; p.w.document.getElementById('rcText').dispatchEvent(new p.w.Event('input', { bubbles: true }));
      p.w.document.querySelector('[data-rc="go"]').click(); await tick2(); await tick2();
      t('a topic that is no longer due is skipped, and the last button says 1 baaki -> none', /Agla revision \(1 baaki\)/.test(p.html()));
      p.w.document.querySelector('[data-rc="nextdue"]').click(); await tick2(); await tick2();
      t('the last due topic (Leaf) comes up', /Sirf is topic ka revision: Leaf/.test(p.html()));
      p.w.document.getElementById('rcText').value = 'Leaves make food using sunlight and chlorophyll.'; p.w.document.getElementById('rcText').dispatchEvent(new p.w.Event('input', { bubbles: true }));
      p.w.document.querySelector('[data-rc="go"]').click(); await tick2(); await tick2();
      t('after the last one there is no Agla revision button', !/Agla revision/.test(p.html()));
      p.w.document.getElementById('app').innerHTML = p.w.RECALL.homeHTML();
      t('home card now says Aaj ka revision poora (all three moved to later dates)', /poora/.test(p.html()) && !/data-rc="due"/.test(p.html()));
    }
    {   // a revise chosen by hand has no queue
      const p = boot2({ topics: { 'c7-science|1|t2': due([20], 1) } }); p.open();
      const sel = p.w.document.getElementById('rcTopic'); sel.value = 'c7-science|1'; sel.dispatchEvent(new p.w.Event('change', { bubbles: true })); await tick2(); await tick2();
      p.w.document.querySelector('[data-rc="rev"]').click(); await tick2();
      p.w.document.getElementById('rcText').value = 'Roots take water from the soil for the plant.'; p.w.document.getElementById('rcText').dispatchEvent(new p.w.Event('input', { bubbles: true }));
      p.w.document.querySelector('[data-rc="go"]').click(); await tick2(); await tick2();
      t('a Revise karo done by hand has no "Agla revision" button', !/Agla revision/.test(p.html()));
    }
    {   // whole course topics (admin)
      const p = boot2({ admin: true }); p.open();
      const sel = p.w.document.getElementById('rcTopic'); sel.value = 'c7-science|1'; sel.dispatchEvent(new p.w.Event('change', { bubbles: true })); await tick2(); await tick2();
      t('admin sees the whole-course button, a student does not', /data-rc="genall"/.test(p.html()) && !/data-rc="genall"/.test((() => { const q = boot2({}); q.open(); const s2 = q.w.document.getElementById('rcTopic'); s2.value = 'c7-science|1'; s2.dispatchEvent(new q.w.Event('change', { bubbles: true })); return q.html(); })()));
      p.w.document.querySelector('[data-rc="genall"]').click(); for (let i = 0; i < 12; i++) await tick2();
      const calls = p.posts.filter(x => x[0] === '/api/topics/generate').map(x => x[1].ch);
      t('whole-course: one call per READY chapter in order (the "coming soon" one is skipped)', calls.join() === '1,2,4,5');
      t('whole-course: ends with a summary', /Ho gaya: 4 naye, 0 pehle se the, 0 nahi bane/.test(p.html()));
      const f = boot2({ admin: true, genFail: true }); f.open();
      const s3 = f.w.document.getElementById('rcTopic'); s3.value = 'c7-science|1'; s3.dispatchEvent(new f.w.Event('change', { bubbles: true })); await tick2(); await tick2();
      f.w.document.querySelector('[data-rc="genall"]').click(); for (let i = 0; i < 12; i++) await tick2();
      t('whole-course: 3 failures in a row stop it (AI limit / no service account), with the reason shown', f.posts.filter(x => x[0] === '/api/topics/generate').length === 3 && /AI limit/.test(f.html()) && /3 nahi bane/.test(f.html()));
    }
  }
  console.log(pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})();
