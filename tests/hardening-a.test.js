/* Tests for the small hardening fixes: the cron key header, and no storage details for students in the video error.
 * Run: node tests/hardening-a.test.js */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
const t = (name, ok, extra) => { if (ok) { pass++; console.log('PASS  ' + name); } else { fail++; console.log('FAIL  ' + name + (extra ? '  -> ' + extra : '')); } };
const srv = fs.readFileSync(path.join(ROOT, 'server.js'), 'utf8').replace(/\r\n/g, '\n');
(async () => {
  const warns = []; let clock = 1e9;
  const fakeDb = { collection: () => ({ get: async () => ({ docs: [], forEach() {} }), where() { return this; } }) };
  const R = require(path.join(ROOT, 'study-routes.js')).make({ db: null, webpush: null, now: () => clock, log: m => warns.push(m), env: { STUDY_CRON_KEY: 'secret-key-123' } });
  let r = await R.tick({ headers: { 'x-cron-key': 'secret-key-123' }, query: {} });
  t('cron key in the x-cron-key header is accepted (503 only because this fake has no database)', r.status === 503, JSON.stringify(r));
  t('...and no warning is logged for the header', warns.length === 0);
  r = await R.tick({ headers: {}, query: { key: 'secret-key-123' } });
  t('cron key in the URL still works for now (not 403)', r.status === 503);
  t('...but a warning says to use the header', warns.length === 1 && /x-cron-key/.test(warns[0]));
  await R.tick({ headers: {}, query: { key: 'secret-key-123' } });
  t('the warning is logged at most once an hour', warns.length === 1);
  clock += 3700000; await R.tick({ headers: {}, query: { key: 'secret-key-123' } });
  t('...and again after an hour', warns.length === 2);
  r = await R.tick({ headers: { 'x-cron-key': 'wrong' }, query: {} });
  t('a wrong key is 403', r.status === 403);
  r = await R.tick({ headers: {}, query: {} });
  t('no key is 403', r.status === 403);
  t('the warning never contains the key itself', warns.every(w => !/secret-key-123/.test(w)));

  const i = srv.indexOf("app.post('/api/video'", 0), seg = srv.slice(i, srv.indexOf("app.post('/api/video/upload-url'", i));
  t('video error: the Backblaze status/code only goes to the admin', /isAdminReq\(req\) \? 'Video storage ne mana kiya \(/.test(seg) && /Video abhi nahi chal paa rahi/.test(seg));
  t('video error: the detailed text is not sent unconditionally any more', !/json\(\{ error: 'Video storage ne mana kiya/.test(seg));
  console.log('\n' + pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
})();
