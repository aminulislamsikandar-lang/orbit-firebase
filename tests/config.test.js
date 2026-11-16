// The server URL in public/config.js must also be allowed by the CSP in firebase.json (connect-src),
// and the site domain must be one of the server's default allowed origins. Catches a half-done domain or server change before deploy.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8').replace(/^\uFEFF/, '');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL ' + m); } };

const api = (/ORBIT_API\s*=\s*"([^"]+)"/.exec(read('public/config.js')) || [])[1];
ok(!!api, 'public/config.js must set window.ORBIT_API');
const fb = JSON.parse(read('firebase.json'));
const csp = fb.hosting.headers.flatMap(h => h.headers).find(h => /^Content-Security-Policy/.test(h.key));
ok(!!csp, 'firebase.json must have a Content-Security-Policy(-Report-Only) header');
if (api && csp) ok(csp.value.split(';').find(d => d.trim().startsWith('connect-src')).includes(api), 'CSP connect-src must contain ' + api);

const site = (/<link rel="canonical" href="(https:\/\/[^/"]+)/.exec(read('public/index.html')) || [])[1];
ok(!!site, 'index.html needs a canonical link');
if (site) ok(read('server.js').includes("'" + site + "'"), 'server.js DEFAULT_ORIGINS must contain ' + site);
ok(!fs.readFileSync(path.join(root, 'firebase.json')).slice(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf])), 'firebase.json must not start with a BOM');

console.log(pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
