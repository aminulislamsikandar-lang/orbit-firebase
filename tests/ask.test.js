// Prompt box server side: ask-core.js (cleaning, parsing, the video JSON rebuild) and the two routes in ask-routes.js (limits, refund, cache, course lock).
// Run: node tests/ask.test.js
const assert = require('assert');
const A = require('../ask-core');
const { mount } = require('../ask-routes');
const LIMITS = require('../limits-core');
const LOCK = require('../course-lock-core');
let pass = 0, fail = 0;
const t = (n, ok, extra) => { if (ok) pass++; else { fail++; console.log('FAIL  ' + n + (extra ? '  ' + extra : '')); } };
const B64 = 'A'.repeat(400);

(async () => {
  // ---- cleaning
  t('text is trimmed, control characters removed, cut at 600', A.cleanText('  hi\u0000 there \u0007 ') === 'hi there' && A.cleanText('x'.repeat(900)).length === 600);
  t('no files is fine', JSON.stringify(A.validFiles(undefined)) === '[]' && JSON.stringify(A.validFiles([])) === '[]');
  t('a photo and a pdf are accepted', A.validFiles([{ mime: 'image/jpeg', data: B64 }, { mime: 'application/pdf', data: 'data:application/pdf;base64,' + B64 }]).length === 2);
  t('3 files, a wrong type, a tiny file, bad base64 are refused', [
    [{ mime: 'image/png', data: B64 }, { mime: 'image/png', data: B64 }, { mime: 'image/png', data: B64 }],
    [{ mime: 'application/zip', data: B64 }], [{ mime: 'image/png', data: 'AAAA' }], [{ mime: 'image/png', data: '!!' + B64 }], 'x'
  ].every(l => A.validFiles(l) === null));
  t('one file over the size limit is refused', A.validFiles([{ mime: 'image/png', data: 'A'.repeat(3000001) }]) === null);

  // ---- answers
  t('answer JSON is read', A.parseAsk('{"refuse":false,"answer":"H₂O is water"}').answer === 'H₂O is water');
  t('answer JSON inside a code fence is read', A.parseAsk('```json\n{"refuse":false,"answer":"ok"}\n```').answer === 'ok');
  t('refuse is passed on', A.parseAsk('{"refuse":true,"answer":""}').refuse === true);
  t('a plain-text reply (model ignored JSON) still counts as the answer', A.parseAsk('Photosynthesis makes food.').answer === 'Photosynthesis makes food.');
  t('broken JSON and an empty answer are not accepted', A.parseAsk('{"refuse":false,"answer":') === null && A.parseAsk('{"refuse":false,"answer":"  "}') === null && A.parseAsk('') === null);
  t('prompt carries class, subject, chapter and the question; an attached file text is marked as data',
    (p => /Class 10, Assamese medium/.test(p) && /Subject: Science/.test(p) && /Chapter: Acids/.test(p) && /Student question: why/.test(p) && /"""\nfile text\n"""/.test(p))(A.buildAskPrompt({ text: 'why', doc: 'file text', ctx: { cls: 10, medium: 'Assamese', subject: 'Science', chapter: 'Acids' } })));
  t('system prompt keeps it to studies and asks for no emoji', /ONLY with school study/.test(A.ASK_SYSTEM) && /no emoji/i.test(A.ASK_SYSTEM) && /"refuse": true/.test(A.ASK_SYSTEM));
  t('cache key ignores case and punctuation but not the course', A.cacheKey('ask', { course: 'a' }, 'Why? Sky!') === A.cacheKey('ask', { course: 'a' }, ' why sky ') && A.cacheKey('ask', { course: 'a' }, 'why sky') !== A.cacheKey('ask', { course: 'b' }, 'why sky'));

  // ---- the video JSON is rebuilt, never trusted
  const good = { title: 'Solar system', scenes: [
    { dur: 3, bg: '#0f1d15', items: [{ t: 'text', x: 50, y: 24, s: 5, c: '#ecf7ee', v: 'Solar system' }] },
    { dur: 4, bg: '#101a2b', items: [{ t: 'orbit', x: 50, y: 28, rx: 24, ry: 9, rot: -20, sec: 4, c: '#4ade80' }, { t: 'circle', x: 50, y: 28, r: 5, c: '#fbbf24', in: 'pop', at: 1 }, { t: 'arrow', x1: 10, y1: 30, x2: 40, y2: 30, c: '#38bdf8' }] }
  ] };
  const v = A.sanitizeVideo(good);
  t('a good video keeps its scenes and item types', v && v.scenes.length === 2 && v.scenes[1].items.map(i => i.t).join() === 'orbit,circle,arrow' && v.format === 'orbit-anime-1');
  const evil = A.sanitizeVideo({ title: '<script>x</script>', scenes: [
    { dur: 999, bg: 'url(javascript:alert(1))', items: [{ t: 'text', x: -50, y: 900, s: 99, c: 'red', v: '<img src=x onerror=alert(1)>&' }, { t: 'script', v: 'x' }, { t: 'circle', x: 'a', y: null, r: 1e9, c: '#12' }] },
    { items: [{ t: 'text', v: 'second' }, ...Array.from({ length: 40 }, () => ({ t: 'circle' }))] }
  ] });
  const all = JSON.stringify(evil);
  t('hostile values are clamped and replaced: colours, numbers, markup, unknown types', evil && !/[<>&]/.test(all) && !/javascript/i.test(all) && evil.scenes[0].dur <= 8 && evil.scenes[0].bg === '#0f1d15'
    && evil.scenes[0].items.every(i => ['text', 'circle'].includes(i.t)) && evil.scenes[0].items.find(i => i.t === 'circle').r <= 22, all.slice(0, 300));
  t('no more than 14 items per scene and 8 scenes', evil.scenes[1].items.length <= 14 && A.sanitizeVideo({ scenes: Array.from({ length: 20 }, () => ({ items: [{ t: 'text', v: 'a' }] })) }).scenes.length === 8);
  t('long text is shrunk to fit the canvas', (it => it.s * 0.58 * Array.from(it.v).length <= 94.5 && it.x - it.s * 0.29 * Array.from(it.v).length >= 1)(A.sanitizeVideo({ scenes: [{ items: [{ t: 'text', x: 3, y: 20, s: 9, v: 'A fairly long line of text that must still fit' }] }, { items: [{ t: 'text', v: 'b' }] }] }).scenes[0].items[0]));
  t('text that cannot be read on its background gets a readable colour', A.readable('#0f1d15', '#0f1d15') !== '#0f1d15' && A.readable('#ecf7ee', '#0f1d15') === '#ecf7ee');
  t('fewer than 2 scenes, no text at all, or no scenes: refused', A.sanitizeVideo({ scenes: [{ items: [{ t: 'text', v: 'a' }] }] }) === null && A.sanitizeVideo({ scenes: [{ items: [{ t: 'circle' }] }, { items: [{ t: 'circle' }] }] }) === null && A.sanitizeVideo({}) === null && A.sanitizeVideo(null) === null);
  t('anime reply: video, refuse and garbage', A.parseAnime(JSON.stringify(good)).video && A.parseAnime('{"refuse":true}').refuse === true && A.parseAnime('nope') === null);

  // ---- the routes
  const QUIZ = { courses: [{ id: 'c10-science', class: 10, subject: 'Science', medium: 'Assamese', chapters: [{ no: 2, title: 'Acids, Bases and Salts', context: 'NOTES-ABC' }] }] };
  function rig(over = {}) {
    const handlers = {}, calls = [], taken = { ask: 0, anime: 0 }, refunded = { ask: 0, anime: 0 }, left = { ask: 14, anime: 2 };
    const mk = k => ({ take: async () => { if (over.empty) return false; taken[k]++; return true; }, refund: async () => { refunded[k]++; }, left: async () => left[k] });
    mount({ post: (p, h) => { handlers[p] = h; } }, {
      QUIZ, userKeyOf: req => (req.headers && req.headers['x-user-key']) || '', failMsgFor: (req, s) => 'FAIL' + s, limited: () => !!over.rate, rateKey: () => 'k',
      quotas: { ask: mk('ask'), anime: mk('anime') }, max: { ask: 15, anime: 3 }, isAdmin: req => !!over.admin, lockOf: async () => over.lock === undefined ? { org: 'seba', cls: 10, med: 'Assamese' } : over.lock, hasDb: true,
      haveKeys: () => over.noKeys ? false : true, videoModels: ['vm'],
      geminiFor: async (req, system, prompt, opts) => { calls.push({ system, prompt, opts }); return over.gem ? over.gem(calls.length) : { text: system === A.ANIME_SYSTEM ? JSON.stringify(good) : JSON.stringify({ refuse: false, answer: 'Answer ' + calls.length }) }; }
    });
    const run = async (path, body, headers) => { let out; const res = { status(c) { this.code = c; return this; }, json(b) { out = { code: this.code || 200, body: b }; }, on() {} }; await handlers[path]({ body, user: { uid: 'u1' }, headers: headers || {} }, res); return out; };
    return { run, calls, taken, refunded };
  }
  let r = rig(), o = await r.run('/api/ask', { text: 'why is the sky blue', course: 'c10-science', ch: 2 });
  t('ask: answer comes back with the number of uses left', o.code === 200 && o.body.answer === 'Answer 1' && o.body.left === 14 && r.taken.ask === 1);
  t('ask: the chapter page gives the AI the class, subject, chapter and notes', /Class 10, Assamese medium/.test(r.calls[0].prompt) && /Chapter: Acids, Bases and Salts/.test(r.calls[0].prompt) && /NOTES-ABC/.test(r.calls[0].prompt) && r.calls[0].opts.json === true);
  o = await r.run('/api/ask', { text: 'Why is the SKY blue?', course: 'c10-science', ch: 2 });
  t('ask: the same question again is answered from memory (no AI call, no use taken)', o.body.answer === 'Answer 1' && r.calls.length === 1 && r.taken.ask === 1);
  o = await r.run('/api/ask', { text: 'what is a mole' });
  t('ask: without a course page the class the student chose is used', /Class 10, Assamese medium/.test(r.calls[1].prompt) && !/Chapter:/.test(r.calls[1].prompt));
  o = await r.run('/api/ask', { text: 'a' });
  t('ask: a one-letter question is refused with 400', o.code === 400);
  o = await r.run('/api/ask', { text: 'read this', files: [{ mime: 'image/png', data: B64 }] });
  t('ask: a photo goes to the AI and skips the backup providers and the cache', o.code === 200 && r.calls[r.calls.length - 1].opts.images.length === 1 && JSON.stringify(r.calls[r.calls.length - 1].opts.fallback) === '[]');
  o = await r.run('/api/ask', { text: 'read this', files: [{ mime: 'application/zip', data: B64 }] });
  t('ask: a bad file is 400', o.code === 400);
  o = await r.run('/api/ask', { text: 'summarise', doc: 'line one of a text file' });
  t('ask: attached text is passed along', /line one of a text file/.test(r.calls[r.calls.length - 1].prompt));

  r = rig({ gem: () => ({ text: '{"refuse":true,"answer":""}' }) }); o = await r.run('/api/ask', { text: 'tell me a joke' });
  t('ask: an off-topic question gets the refusal message (and still counts)', o.body.refuse === true && /padhai/.test(o.body.message) && r.taken.ask === 1 && r.refunded.ask === 0);
  r = rig({ gem: () => ({ status: 503 }) }); o = await r.run('/api/ask', { text: 'something real' });
  t('ask: when the AI fails the use is given back', o.code === 502 && o.body.error === 'FAIL503' && r.refunded.ask === 1);
  r = rig({ gem: () => ({ text: '{"refuse":false' }) }); o = await r.run('/api/ask', { text: 'something real' });
  t('ask: an unreadable AI reply gives the use back too', o.code === 502 && r.refunded.ask === 1);
  r = rig({ empty: true }); o = await r.run('/api/ask', { text: 'something real' });
  t('ask: used-up daily limit -> 429 limit_reached (the app shows its friendly message)', o.code === 429 && o.body.code === 'limit_reached' && o.body.kind === 'ask' && r.calls.length === 0);
  r = rig({ empty: true }); o = await r.run('/api/ask', { text: 'something real' }, { 'x-user-key': 'K'.repeat(30) });
  t('ask: with the parent\'s own Gemini key there is no daily limit and no use is taken', o.code === 200 && r.taken.ask === 0);
  r = rig({ empty: true, admin: true }); o = await r.run('/api/ask', { text: 'something real' });
  t('ask: the admin account has no daily limit', o.code === 200);
  r = rig({ rate: true }); o = await r.run('/api/ask', { text: 'something real' });
  t('ask: too many requests a minute -> 429', o.code === 429 && r.calls.length === 0);
  r = rig({ noKeys: true }); o = await r.run('/api/ask', { text: 'something real' });
  t('ask: no server key and no parent key -> clear error', o.code === 500);
  r = rig({ lock: null }); o = await r.run('/api/ask', { text: 'what is a mole' });
  t('ask: a student without a saved course still works, with no class in the prompt', o.code === 200 && !/Student: Class/.test(r.calls[0].prompt));

  r = rig(); o = await r.run('/api/anime', { text: 'solar system', course: 'c10-science', ch: 2 });
  t('anime: a rebuilt video comes back, with the video models and no backup providers', o.code === 200 && o.body.video && o.body.video.scenes.length >= 2 && o.body.left === 2 && r.taken.anime === 1 && JSON.stringify(r.calls[0].opts.models) === '["vm"]' && JSON.stringify(r.calls[0].opts.fallback) === '[]', JSON.stringify(o.body).slice(0, 200));
  r = rig({ gem: () => ({ text: JSON.stringify(good) }) }); o = await r.run('/api/anime', { text: 'solar system' }); const o2 = await r.run('/api/anime', { text: 'Solar System' });
  t('anime: the same topic again is served from memory', o.code === 200 && o2.code === 200 && r.calls.length === 1 && r.taken.anime === 1);
  r = rig({ gem: () => ({ text: '{"refuse":true}' }) }); o = await r.run('/api/anime', { text: 'a cartoon fight' });
  t('anime: off-topic -> refusal message', o.body.refuse === true && /padhai/.test(o.body.message));
  r = rig({ gem: () => ({ text: 'not json at all' }) }); o = await r.run('/api/anime', { text: 'solar system' });
  t('anime: garbage from the AI -> 502 and the use is given back', o.code === 502 && r.refunded.anime === 1);
  r = rig({ empty: true }); o = await r.run('/api/anime', { text: 'solar system' });
  t('anime: daily limit -> 429 limit_reached kind anime', o.code === 429 && o.body.kind === 'anime');
  o = await rig().run('/api/anime', { text: 'x' });
  t('anime: a too short topic is 400', o.code === 400);

  // ---- wiring with the rest of the server
  t('both routes are behind the course lock (kid mode and other courses are refused)', LOCK.GATED.has('/ask') && LOCK.GATED.has('/anime'));
  t('kid mode student is refused by the lock', LOCK.decide({ admin: false, canRead: true, lock: { kid: true }, courseIds: [], ids: [] }).code === 'kid_mode');
  t('a course that is not the student\'s is refused by the lock', LOCK.decide({ admin: false, canRead: true, lock: { org: 'seba', cls: 10, med: 'Assamese' }, courseIds: ['c8-english'], ids: ['c10-science'] }).code === 'wrong_course');
  t('limit kinds exist and a stored quota can be made for them', LIMITS.KINDS.includes('ask') && LIMITS.KINDS.includes('anime') && (() => { try { LIMITS.createStoredQuota({ db: null, kind: 'ask', max: 1 }); LIMITS.createStoredQuota({ db: null, kind: 'anime', max: 1 }); return true; } catch (e) { return false; } })());
  const q = LIMITS.createStoredQuota({ db: null, kind: 'ask', max: 2 });
  t('the daily quota counts and stops at the maximum', (await q.take('s')) && (await q.take('s')) && !(await q.take('s')));
  const srv = require('fs').readFileSync(require('path').join(__dirname, '..', 'server.js'), 'utf8');
  t('server.js mounts the routes and gives /api/ask the 4 MB body limit', /require\('\.\/ask-routes'\)\.mount\(app,/.test(srv) && /app\.use\('\/api\/ask', jsonImage\);/.test(srv) && srv.indexOf("app.use('/api/ask', jsonImage)") < srv.indexOf("app.use((req, res, next) => ((req.path === '/api/custom/extract'"));

  console.log(pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('FAIL  crashed: ' + (e && e.stack || e)); console.log(pass + ' passed, ' + (fail + 1) + ' failed'); process.exit(1); });
