// A parent's Gemini key (X-User-Key) really pays for the student's AI calls: key choice, no mixing with shared keys / backup providers,
// stop at once on a wrong key, no key in logs, no daily video limit for key holders, every student AI route wired.
// Run: node tests/byok-routes.test.js
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(ROOT, 'server.js'), 'utf8');
const cut = (from, to) => { const i = src.indexOf(from), j = src.indexOf(to, i); if (i < 0 || j < 0) throw new Error('server marker missing: ' + from); return src.slice(i, j); };
let pass = 0, fail = 0;
const t = (name, ok, extra) => { if (ok) pass++; else { fail++; console.log('FAIL  ' + name + (extra ? '  ' + extra : '')); } };

const OWN = 'AIzaSyD' + 'o'.repeat(32), SERVER_A = 'AIzaServerKeyAAAAAAAAAAAAAAAAAAAAAAAA', SERVER_B = 'AIzaServerKeyBBBBBBBBBBBBBBBBBBBBBBBB';
const state = { calls: [], script: [], logs: [], fbCalls: 0 };
const respond = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body });
const okText = txt => respond(200, { candidates: [{ content: { parts: [{ text: txt }] } }] });
const fetchStub = async (url, init) => {
  if (/generativelanguage/.test(url)) { state.calls.push({ url, key: init.headers['x-goog-api-key'], body: init.body }); const r = state.script.shift(); return r || okText('fine'); }
  state.fbCalls++; return respond(500, {});          // a backup provider (groq / openrouter) must never be reached for a key holder
};
const code = src.slice(src.indexOf('const USER_KEY_RE'), src.indexOf('// Free daily limit')) + '\n' + cut('async function fallbackChat', '// Common checks for every AI route');
const mod = new Function('console', 'fetch', 'AbortSignal', 'KEYS', 'MODELS', 'FALLBACK',
  'let keyStart = 0;\n' + code + '\nreturn {gemini, geminiFor, failMsg, failMsgFor, userKeyOf};')(
  { log: (...a) => state.logs.push(a.join(' ')), error: (...a) => state.logs.push(a.join(' ')) }, fetchStub, { timeout: () => undefined },
  [SERVER_A, SERVER_B], ['m1', 'm2'], { groq: { name: 'Groq', key: () => 'GROQKEY', models: () => ['g1'], url: 'https://groq.test', headers: {}, maxTok: 4096 } });
const req = key => ({ headers: key ? { 'x-user-key': key } : {} });
const reset = (...script) => { state.calls = []; state.script = script; state.logs = []; state.fbCalls = 0; };
const allLogs = () => state.logs.join('\n');

(async () => {
  // ---- key choice ----
  reset(); let r = await mod.geminiFor(req(), 'sys', 'hi');
  t('no key header: shared keys are used as before', r.text === 'fine' && [SERVER_A, SERVER_B].includes(state.calls[0].key) && state.calls[0].key !== OWN);
  reset(); r = await mod.geminiFor(req(OWN), 'sys', 'hi');
  t('key header: the student\'s own key is used', r.text === 'fine' && state.calls.length === 1 && state.calls[0].key === OWN);
  reset(okText(''), respond(503, {}), respond(503, {}), respond(500, {}), respond(500, {}), respond(404, {}));
  r = await mod.geminiFor(req(OWN), 'sys', 'hi', { fallback: ['groq'] });
  t('own key + every model failing: ONLY the own key was ever sent to Google, and no backup provider was called', state.calls.length > 1 && state.calls.every(c => c.key === OWN) && state.fbCalls === 0 && !r.text);
  reset(); r = await mod.geminiFor(req('AIza-too-short'), 'sys', 'hi');
  t('a malformed header is ignored (shared keys are used, nothing breaks)', r.text === 'fine' && state.calls[0].key !== 'AIza-too-short');
  t('userKeyOf: trims, checks the shape', mod.userKeyOf(req('  ' + OWN + ' ')) === OWN && mod.userKeyOf(req('x')) === '' && mod.userKeyOf(req()) === '');
  reset(); await mod.geminiFor(req(OWN), 'sys', 'hi', { temperature: 0.1, models: ['only-model'], json: true });
  t('other options (models, temperature, json) are kept when the own key is added', state.calls[0].url.includes('only-model') && /"temperature":0.1/.test(state.calls[0].body) && /application\/json/.test(state.calls[0].body));

  // ---- wrong / switched-off key stops at once ----
  for (const [name, res] of [['403', respond(403, { error: { message: 'denied' } })], ['401', respond(401, {})], ['400 API_KEY_INVALID', respond(400, { error: { message: 'API key not valid. Please pass a valid API key.', details: [{ reason: 'API_KEY_INVALID' }] } })]]) {
    reset(res); r = await mod.geminiFor(req(OWN), 'sys', 'hi');
    t('wrong key (' + name + '): ONE request only, result is status 401 (no model loop, no backup providers)', state.calls.length === 1 && r.status === 401 && !r.text && state.fbCalls === 0);
  }
  reset(respond(400, { error: { message: 'JSON mode not supported' } })); r = await mod.geminiFor(req(OWN), 'sys', 'hi', { json: true });
  t('a normal 400 (model refuses JSON mode) is NOT mistaken for a wrong key: it retries as plain text', r.text === 'fine' && state.calls.length === 2 && !/application\/json/.test(state.calls[1].body));
  reset(respond(403, {})); r = await mod.geminiFor(req(), 'sys', 'hi');
  t('shared keys: behaviour unchanged (a 403 does not become 401)', r.status !== 401);
  reset(respond(429, {}), respond(429, {}), respond(429, {}), respond(429, {})); r = await mod.geminiFor(req(OWN), 'sys', 'hi');
  t('own key out of free quota (429): other models are tried with the same key, then status 429', state.calls.length >= 2 && state.calls.every(c => c.key === OWN) && r.status === 429);

  // ---- no key in logs ----
  reset(respond(500, { error: { message: 'boom' } }), respond(500, {}), respond(429, {}), respond(403, { error: { message: 'x' } })); await mod.geminiFor(req(OWN), 'sys', 'hi');
  state.script = []; await mod.geminiFor(req(OWN), 'sys', 'hi');      // (logs of the failing call are kept and the success call is added)
  t('logs never contain the student\'s key (success and error paths)', !allLogs().includes(OWN) && !allLogs().includes(OWN.slice(0, 20)) && /own-key/.test(allLogs()));
  reset(); await mod.geminiFor(req(), 'sys', 'hi'); t('shared keys still log as key#N', /key#[12]/.test(allLogs()));

  // ---- messages ----
  t('failMsgFor: no key -> the old messages', [429, 503, 504, 0].every(s => mod.failMsgFor(req(), s) === mod.failMsg(s)));
  t('failMsgFor: own key wrong -> tells where to fix it', /Advanced AI Features/.test(mod.failMsgFor(req(OWN), 401)) && /kaam nahi kar rahi/.test(mod.failMsgFor(req(OWN), 403)));
  t('failMsgFor: own key out of quota -> says it is THEIR key', /Aapki Gemini key/.test(mod.failMsgFor(req(OWN), 429)) && /Kal/.test(mod.failMsgFor(req(OWN), 429)));
  t('failMsgFor: Google busy -> same friendly message as before', mod.failMsgFor(req(OWN), 503) === mod.failMsg(503));

  // ---- wiring: every student AI route ----
  const routes = ['/api/answer', '/api/translate', '/api/qtranslate', '/api/lesson', '/api/rules', '/api/more', '/api/visual', '/api/mathvideo/generate', '/api/sciencevideo/generate'];
  for (const rt of routes) {
    const start = src.indexOf("app.post('" + rt + "'"), end = src.indexOf('\napp.', start + 10), h = src.slice(start, end < 0 ? undefined : end);
    t(rt + ': AI call uses geminiFor(req, ...) and the failure message knows about own keys', start > 0 && /await geminiFor\(req, /.test(h) && !/await gemini\(/.test(h) && !/failMsg\(/.test(h));
  }
  const bare = src.split('\n').filter(l => /\bgemini\(/.test(l) && !/^\s*\/\//.test(l) && !/function gemini\(|const geminiFor/.test(l));
  t('the only direct gemini() calls left: key test, picture topic and the translation helper (all pass an explicit key)', bare.length === 3 && bare.every(l => /userKey/.test(l)), bare.map(l => l.trim().slice(0, 70)).join(' || '));
  t('picture topic gets the student\'s key (and no longer needs a shared key when there is one)', /pictureTopic\(hit, id, userKeyOf\(req\)\)/.test(src) && /if \(!KEY && !userKey\) return ''/.test(src));
  t('video translation (as/bn) is paid with the same key', (src.match(/userKeyOf\(req\)\)/g) || []).length >= 4 && /mvTranslateCall\(src, budgetMs, userKey\)/.test(src) && /\.\.\.\(userKey \? \{ userKey \} : \{\}\)/.test(src));
  t('admin translate route is NOT paid with a student key (admin uses the shared keys)', (h => !/userKey/.test(h))(cut("app.post('/api/mathvideo/translate'", '// ---- Get Video: student pastes')));
  t('key test route: a key Google refuses (401 / 400 / 403) is reported as "invalid"', /s === 400 \|\| s === 401 \|\| s === 403\) \? 'invalid'/.test(src));

  // ---- daily video limit ----
  for (const [name, from, to] of [['maths', "app.post('/api/mathvideo/generate'", "app.post('/api/sciencevideo/generate'"], ['science', "app.post('/api/sciencevideo/generate'", 'const PORT']]) {
    const h = cut(from, to);
    t(name + ' video: the daily limit is skipped for a student with a key, kept for everybody else', /if \(!MV_ADMINS\.includes\(email\) && !userKeyOf\(req\)\) \{/.test(h) && /cur\.n >= MV_DAILY/.test(h));
    t(name + ' video: the bank check still comes before the limit (a key does not open other questions)', h.indexOf('mvKnown(typed') > 0 && h.indexOf('mvKnown(typed') < h.indexOf('MV_USE.get'));
  }
  t('Get Video page tells a key holder that the limit does not apply', /Aapki apni Gemini key use ho rahi hai, isliye roz ki video limit nahi lagegi/.test(fs.readFileSync(path.join(ROOT, 'public/index.html'), 'utf8')));
  t('shared free-limit helpers are untouched', /const FREE_DAILY = 1/.test(src) && /function takeFree/.test(src));

  console.log(pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})();
