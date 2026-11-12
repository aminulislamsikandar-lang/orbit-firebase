// Security: response headers, per-student rate limit, CSP + report endpoint, sandboxed videos, XSS guards, key never recorded.
// Run: node tests/security.test.js
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/^\uFEFF/, '');
const SEC = require(path.join(ROOT, 'security.js'));
let pass = 0, fail = 0;
const t = (name, ok, extra) => { if (ok) pass++; else { fail++; console.log('FAIL  ' + name + (extra ? '  ' + extra : '')); } };

(async () => {
  // ---------- response headers (Render server) ----------
  const run = p => { const h = {}; let nexted = false; SEC.securityHeaders({ path: p }, { setHeader: (k, v) => { h[k] = v; } }, () => { nexted = true; }); return { h, nexted }; };
  let r = run('/api/answer');
  t('every response: nosniff, strict referrer, no framing, permissions policy', r.h['X-Content-Type-Options'] === 'nosniff' && r.h['Referrer-Policy'] === 'strict-origin-when-cross-origin' && r.h['X-Frame-Options'] === 'SAMEORIGIN' && /camera=\(\)/.test(r.h['Permissions-Policy']) && /geolocation=\(\)/.test(r.h['Permissions-Policy']));
  t('microphone stays allowed for the app itself (voice recall comes later)', /microphone=\(self\)/.test(r.h['Permissions-Policy']));
  t('personal API answers are never cached by a shared cache', r.h['Cache-Control'] === 'no-store' && r.nexted);
  t('question list, ping and static files stay cacheable', ['/api/questions', '/api/ping', '/index.html', '/'].every(p => !run(p).h['Cache-Control'] && run(p).nexted));
  t('a request without a path does not crash', (() => { try { run(undefined); return true; } catch (e) { return false; } })());

  // ---------- rate limit key ----------
  t('rate key is the logged-in student', SEC.rateKey({ user: { uid: 'u1' }, ip: '1.2.3.4' }) === 'u:u1');
  t('two students on the same IP (school WiFi / proxy) get different keys', SEC.rateKey({ user: { uid: 'a' }, ip: '9.9.9.9' }) !== SEC.rateKey({ user: { uid: 'b' }, ip: '9.9.9.9' }));
  t('no login: falls back to the IP, never crashes', SEC.rateKey({ ip: '1.2.3.4' }) === 'ip:1.2.3.4' && SEC.rateKey({}) === 'ip:' && SEC.rateKey(undefined) === 'ip:');
  // ---------- limiter ----------
  let clock = 1000; const L = SEC.createLimiter(3, 60000, () => clock);
  t('limit: the 4th request in a minute is refused, the first 3 pass', [L.hit('a'), L.hit('a'), L.hit('a'), L.hit('a')].join() === 'false,false,false,true');
  t('limit is per key: another student is not affected', L.hit('b') === false);
  clock += 61000; t('after the window the student can ask again', L.hit('a') === false);
  clock += 30000; L.hit('c'); clock += 31000;
  t('prune removes idle keys (the table cannot grow forever)', L.prune() === 1 && L.size() === 1);
  const L2 = SEC.createLimiter(20, 60000, () => clock);
  for (let i = 0; i < 20; i++) L2.hit('s'); t('server setting: 20 requests per minute are fine, the 21st is not', L2.hit('s') === true && L2.hit('other') === false);

  // ---------- CSP report endpoint ----------
  const logs = []; let t0 = 0;
  const report = SEC.cspReport({ log: m => logs.push(m), maxPerMinute: 3, now: () => t0 });
  const post = body => { const out = { status: 0, ended: false }; report({ body }, { status(s) { out.status = s; return this; }, end() { out.ended = true; } }); return out; };
  let o = post({ 'csp-report': { 'violated-directive': 'script-src', 'effective-directive': 'script-src-elem', 'blocked-uri': 'https://evil.test/x.js?token=SECRET#frag', 'document-uri': 'https://orbittutorial.web.app/?parent-setup=1' } });
  t('report (old format): 204 and one short log line', o.status === 204 && o.ended && logs.length === 1 && /script-src-elem/.test(logs[0]) && /evil\.test\/x\.js/.test(logs[0]));
  t('log line has no query string or fragment (no tokens in logs)', !/SECRET|parent-setup|frag|\?/.test(logs[0]));
  logs.length = 0; t0 = 70000;
  post([{ type: 'csp-violation', body: { effectiveDirective: 'connect-src', blockedURL: 'https://x.test/a', documentURL: 'https://orbittutorial.web.app/' } }]);
  t('report (new Reporting API format) is understood', logs.length === 1 && /connect-src/.test(logs[0]));
  logs.length = 0; t0 = 140000;
  post({ 'csp-report': { 'blocked-uri': 'a\nCSP violation: FAKE LINE\r\nb', 'effective-directive': 'img-src' } });
  t('line breaks in a report cannot forge extra log lines', logs.length === 1 && !/\n|\r/.test(logs[0]));
  logs.length = 0; post({ 'csp-report': { 'blocked-uri': 'x'.repeat(5000), 'effective-directive': 'img-src' } });
  t('very long values are cut', logs[0].length < 400);
  logs.length = 0; t0 = 210000; for (let i = 0; i < 10; i++) post({ 'csp-report': { 'effective-directive': 'img-src', 'blocked-uri': 'https://x.test/' + i } });
  t('a broken page cannot flood the log (max 3 per minute here)', logs.length === 3);
  t0 = 280000; post({ 'csp-report': { 'effective-directive': 'img-src', 'blocked-uri': 'https://x.test/again' } }); t('the cap resets after a minute', logs.length === 4);
  logs.length = 0;
  t('junk bodies are ignored and still answered 204 (null, string, number, nested junk, empty)', [null, undefined, 'x', 42, {}, [], [null, 1, 'a'], { 'csp-report': 'x' }].every(b => post(b).status === 204) && logs.length === 0);

  // ---------- wiring in server.js ----------
  const srv = read('server.js');
  const at = s => srv.indexOf(s);
  t('x-powered-by is off, security headers are added before routes and static files', at('app.disable(\'x-powered-by\')') > 0 && at('app.use(securityHeaders)') > at('app.disable') && at('app.use(securityHeaders)') < at('express.static') && at('app.use(securityHeaders)') < at('app.post(\'/api/answer\''));
  t('CSP report route sits BEFORE the login check and outside /api', at("app.post('/csp-report'") > 0 && at("app.post('/csp-report'") < at("app.use('/api', async") && /type: \[[^\]]*csp-report/.test(srv) && /limit: '8kb'/.test(srv));
  t('a malformed report body is swallowed (no crash, no stack in the log)', /app\.use\('\/csp-report', \(err, req, res, next\) => res\.status\(204\)\.end\(\)\)/.test(srv));
  t('AI routes are limited per student, not per IP', (srv.match(/limited\(rateKey\(req\)\)/g) || []).length === 2 && /imgLimiter\.hit\(rateKey\(req\)\)/.test(srv));
  t('no request counting by req.ip is left in server.js', !/req\.ip/.test(srv) && !/new Map\(\);\s*\nfunction limited/.test(srv));
  t('limits are the same as before (20 AI / 40 pictures per minute)', /createLimiter\(20, 60000\)/.test(srv) && /createLimiter\(40, 60000\)/.test(srv));

  // ---------- firebase.json: headers + CSP (Report-Only first) ----------
  const fj = JSON.parse(read('firebase.json')), rules = fj.hosting.headers, byKey = (src) => Object.fromEntries(((rules.find(x => x.source === src) || {}).headers || []).map(h => [h.key, h.value]));
  const all = byKey('**'), pv = byKey('/public-videos/**'), csp = all['Content-Security-Policy-Report-Only'] || '';
  const dir = n => (csp.split(';').map(x => x.trim()).find(x => x.startsWith(n + ' ')) || '');
  t('website: nosniff / referrer / framing / permissions headers on every file', all['X-Content-Type-Options'] === 'nosniff' && all['Referrer-Policy'] === 'strict-origin-when-cross-origin' && all['X-Frame-Options'] === 'SAMEORIGIN' && /microphone=\(self\)/.test(all['Permissions-Policy']));
  t('CSP is Report-Only for now (it cannot break the app); not enforced by accident', !!csp && !all['Content-Security-Policy']);
  t('CSP closes the usual holes: no plugins, fixed <base>, same-site forms and framing', /object-src 'none'/.test(csp) && /base-uri 'self'/.test(csp) && /form-action 'self'/.test(csp) && /frame-ancestors 'self'/.test(csp) && /default-src 'self'/.test(csp));
  t('CSP never allows a wildcard for scripts or "data:" scripts', !/script-src[^;]*(\s\*|\sdata:|https:(\s|;|$))/.test(csp));
  const api = new URL(read('public/config.js').match(/ORBIT_API\s*=\s*"([^"]+)"/)[1]).origin, authDomain = read('public/firebase-config.js').match(/authDomain:\s*"([^"]+)"/)[1];
  t('CSP connect-src allows our API and the Firebase login domain (and report-uri points at our API)', dir('connect-src').includes(api) && dir('connect-src').includes(authDomain) && dir('connect-src').includes('googleapis.com') && new RegExp('report-uri ' + api.replace(/\./g, '\\.') + '/csp-report').test(csp));
  t('CSP: Firebase SDK, analytics and Clarity scripts are allowed from their own hosts only', ['www.gstatic.com', 'www.googletagmanager.com', 'www.clarity.ms'].every(h => dir('script-src').includes(h)));
  t('CSP: fonts, images, videos and frames match what the app really loads', dir('style-src').includes('fonts.googleapis.com') && dir('font-src').includes('fonts.gstatic.com') && dir('img-src').includes('upload.wikimedia.org') && dir('img-src').includes('images.pexels.com') && dir('media-src').includes('backblazeb2.com') && dir('frame-src').includes('youtube-nocookie.com'));
  // ratchet: a new third-party host in the client must be added to the policy (or listed here as navigation-only)
  const NAV_ONLY = new Set(['aistudio.google.com', 'wa.me', 'www.youtube.com', 'orbittutorial.web.app']);
  const hosts = new Set(); for (const f of fs.readdirSync(path.join(ROOT, 'public')).filter(x => /\.(js|html)$/.test(x)).map(x => 'public/' + x)) for (const m of read(f).matchAll(/https:\/\/([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g)) hosts.add(m[1]);
  const covered = h => csp.split(/[\s;]+/).some(tok => { const x = tok.replace(/^https:\/\//, ''); return x === h || (x.startsWith('*.') && h.endsWith(x.slice(1))); });
  const missing = [...hosts].filter(h => !NAV_ONLY.has(h) && !covered(h));
  t('every external host used by the client is in the CSP (or is a plain link)', missing.length === 0, 'missing: ' + missing.join(', '));
  t('old cache rules are still there', ['/sw.js', '/config.js', '**/*.json'].every(s => byKey(s)['Cache-Control'] === 'no-cache'));

  // ---------- uploaded / bundled HTML videos cannot reach the app ----------
  t('public-videos files are served in a sandbox (own empty origin: no login, no storage, no parent key)', /^sandbox\b/.test(pv['Content-Security-Policy'] || '') && /allow-scripts/.test(pv['Content-Security-Policy']) && !/allow-same-origin/.test(pv['Content-Security-Policy']));
  const idx = read('public/index.html');
  t('public video iframe also carries sandbox="allow-scripts" (never allow-same-origin)', /<iframe src="\/public-videos\/[^>]*sandbox="allow-scripts"[^>]*><\/iframe>/.test(idx) && !/sandbox="[^"]*allow-same-origin/.test(idx));
  t('HTML animation viewer: sandbox allow-scripts only', /setAttribute\('sandbox','allow-scripts'\)/.test(idx) && /f\.srcdoc=html/.test(idx));
  t('the bundled HTML video needs no storage, network or cookies (so the sandbox cannot break it)', !/localStorage|sessionStorage|indexedDB|document\.cookie|fetch\(|XMLHttpRequest|https?:\/\//.test(fs.readdirSync(path.join(ROOT, 'public/public-videos')).filter(f => /\.html$/.test(f)).map(f => read('public/public-videos/' + f)).join('\n')));

  // ---------- XSS: escaping and sinks ----------
  const inline = [...idx.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]).join('\n');
  const pick = re => { const m = inline.match(re); if (!m) throw new Error('missing in index.html: ' + re); return m[0]; };
  const ctx = vm.createContext({}); vm.runInContext(pick(/const esc=.*\n/) + pick(/const fmt=.*\n/) + 'this.esc=esc;this.fmt=fmt;', ctx);
  const evil = ['<img src=x onerror=alert(1)>', '"><script>alert(1)</script>', "'><svg onload=alert(1)>", '**<b onmouseover=alert(1)>x</b>**', '&lt;already&gt;'];
  t('esc(): nothing from an AI answer or a name can open a tag or leave an attribute', evil.every(e => !/[<>"']/.test(ctx.esc(e))));
  t('fmt() (AI answer renderer): escapes FIRST, then only adds <b> and <br>', evil.every(e => !/[<>]/.test(ctx.fmt(e + '\nline2').replace(/<\/?b>|<br>/g, ''))) && ctx.fmt('**x**\ny') === '<b>x</b><br>y');
  const ratchet = { 'public/index.html': 8, 'public/team.js': 3 };
  const sinkFiles = fs.readdirSync(path.join(ROOT, 'public')).filter(x => /\.(js|html)$/.test(x)).map(x => 'public/' + x);
  const bad = sinkFiles.filter(f => (read(f).match(/\.(innerHTML|outerHTML)\s*\+?=/g) || []).length > (ratchet[f] || 0));
  t('no new innerHTML / outerHTML assignment anywhere in the client (video players, admin, parent page use textContent / strings only)', bad.length === 0, bad.join(', '));
  t('no insertAdjacentHTML, eval, new Function or document.write in the client', !sinkFiles.some(f => /insertAdjacentHTML|\beval\(|new Function\(|document\.write\(/.test(read(f))));
  t('srcdoc is used once, only for the sandboxed HTML animation viewer, and the sandbox is set on that same iframe first', sinkFiles.filter(f => /srcdoc/.test(read(f))).join() === 'public/index.html' && (idx.match(/srcdoc/g) || []).length === 1 && /createElement\('iframe'\);[^\n]*setAttribute\('sandbox','allow-scripts'\)[^\n]*f\.srcdoc=html/.test(idx));
  t('external links open with noopener', !/target="_blank"(?![^>]*rel="[^"]*noopener)/.test(read('public/parent-key.js')) && !/target="_blank"(?![^>]*noopener)/.test(idx));
  t('plan / video player code renders text only (no HTML)', ['mathvideo-player.js', 'mathvideo-admin.js', 'qvideo.js', 'video-admin.js', 'parent-key.js'].every(f => !/\.innerHTML\s*=/.test(read('public/' + f))));

  // ---------- the parent's key stays out of recordings and logs ----------
  const pk = read('public/parent-key.js');
  t('session-recording tool (Clarity) never records the key box, even when "Dikhao" shows the text', /<input id="pkKey" data-clarity-mask="true"/.test(pk));
  t('key is only ever sent in a header (never in a URL, localStorage key name or log)', !/console\.(log|error|warn)/.test(pk) && !/[?&]key=/.test(pk + srv.replace(/\/\/.*$/gm, '')));
  t('analytics note mentions the masked key box', /Gemini key box/.test(read('public/analytics.js')));

  console.log(pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})();
