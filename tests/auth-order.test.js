/* Tests that the server answers a stranger BEFORE reading any request body, counts only WRONG logins per IP, and fails closed when asked to.
 * It starts the real server.js on a free port (no Firebase service account, no network needed: a fake token is rejected locally).
 * Run: node tests/auth-order.test.js */
const { spawn } = require('child_process'), path = require('path'), fs = require('fs');
const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
const t = (name, ok, extra) => { if (ok) { pass++; console.log('PASS  ' + name); } else { fail++; console.log('FAIL  ' + name + (extra ? '  -> ' + extra : '')); } };
const srvText = fs.readFileSync(path.join(ROOT, 'server.js'), 'utf8').replace(/\r\n/g, '\n');
const at = s => srvText.indexOf(s);

function start(env) {
  const port = 20000 + Math.floor(Math.random() * 20000);
  const p = spawn(process.execPath, [path.join(ROOT, 'server.js')], { env: { ...process.env, FIREBASE_PROJECT_ID: 'dummy-project', PORT: String(port), ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
  let out = ''; p.stdout.on('data', d => out += d); p.stderr.on('data', d => out += d);
  const ready = new Promise((res, rej) => { const iv = setInterval(() => { if (/running on port/.test(out)) { clearInterval(iv); res(); } }, 50); setTimeout(() => { clearInterval(iv); rej(new Error('server did not start: ' + out.slice(-300))); }, 15000); p.on('exit', c => { clearInterval(iv); rej(new Error('server exited ' + c + ': ' + out.slice(-300))); }); });
  return { p, port, ready, base: 'http://127.0.0.1:' + port };
}
const post = (base, p, body, headers = {}) => fetch(base + p, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body });

(async () => {
  // ---- order in the source ----
  t('the login check comes BEFORE the body parsers in server.js', at('admin.auth().verifyIdToken') > 0 && at('admin.auth().verifyIdToken') < at("app.use('/api/ask', jsonImage)") && at('admin.auth().verifyIdToken') < at('(req.path === \'/api/custom/extract\''));
  t('/csp-report keeps its own small parser and sits before the login check', at("app.post('/csp-report'") > 0 && at("app.post('/csp-report'") < at('admin.auth().verifyIdToken'));
  t('the course lock and the free-plan gate answer 503 on a Firestore error (no more "next()" after the error)', (srvText.match(/temporarily_unavailable/g) || []).length === 2 && !/check failed: ' \+ e\.message\); next\(\)/.test(srvText));

  // ---- the real server ----
  const S = start({}); await S.ready;
  try {
    let r = await post(S.base, '/api/ask', '{"broken');
    t('no login + broken JSON -> 401, not 400 (the body is never parsed)', r.status === 401, 'got ' + r.status);
    const big = JSON.stringify({ a: 'x'.repeat(4400000) });
    r = await post(S.base, '/api/bolo/rec/upload', big);
    t('no login + 4.4 MB body -> 401', r.status === 401, 'got ' + r.status);
    r = await post(S.base, '/api/answer', '{}', { Authorization: 'Bearer not-a-real-token' });
    t('a fake token -> 401', r.status === 401, 'got ' + r.status);
    r = await fetch(S.base + '/api/ping'); t('/api/ping stays public', r.status === 200);
    r = await fetch(S.base + '/api/questions'); t('/api/questions stays public', r.status === 200);
    r = await fetch(S.base + '/api/answer', { method: 'OPTIONS', headers: { Origin: 'https://orbittutorial.web.app', 'Access-Control-Request-Method': 'POST' } });
    t('CORS preflight still answers 204 without a login', r.status === 204 && r.headers.get('access-control-allow-origin') === 'https://orbittutorial.web.app', 'got ' + r.status);
    r = await fetch(S.base + '/api/answer', { method: 'OPTIONS', headers: { Origin: 'https://evil.example', 'Access-Control-Request-Method': 'POST' } });
    t('a foreign origin gets no CORS header', !r.headers.get('access-control-allow-origin'));
    r = await post(S.base, '/csp-report', JSON.stringify({ 'csp-report': { 'violated-directive': 'x' } }), { 'Content-Type': 'application/csp-report' });
    t('/csp-report still needs no login', r.status === 204, 'got ' + r.status);
  } finally { S.p.kill(); }

  // ---- failed-login limit (fresh server: exact count) ----
  const L = start({}); await L.ready;
  try {
    const codes = []; for (let i = 0; i < 33; i++) codes.push((await post(L.base, '/api/answer', '{}', { Authorization: 'Bearer bad' + i })).status);
    t('wrong logins: the first 30 in a minute get 401', codes.slice(0, 30).every(c => c === 401), codes.slice(0, 30).join(','));
    t('wrong logins: the 31st and later from the same IP get 429', codes.slice(30).every(c => c === 429), codes.slice(30).join(','));
    const ok = await fetch(L.base + '/api/ping'); t('public routes are never blocked by the failed-login limit', ok.status === 200);
  } finally { L.p.kill(); }

  // ---- REQUIRE_FIRESTORE ----
  const code = await new Promise(res => { const p = spawn(process.execPath, [path.join(ROOT, 'server.js')], { env: { ...process.env, FIREBASE_PROJECT_ID: 'dummy-project', PORT: '0', REQUIRE_FIRESTORE: 'true', FIREBASE_SERVICE_ACCOUNT: '' }, stdio: 'ignore' }); p.on('exit', c => res(c)); setTimeout(() => { p.kill(); res('timeout'); }, 15000); });
  t('REQUIRE_FIRESTORE=true without a service account: the server refuses to start (exit 1)', code === 1, 'exit ' + code);

  console.log('\n' + pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
})().catch(e => { console.log('FAIL  ' + e.message); console.log('\n' + pass + ' passed, ' + (fail + 1) + ' failed'); process.exit(1); });
