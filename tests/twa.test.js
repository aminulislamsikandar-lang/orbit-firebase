// Play Store (Trusted Web Activity) wiring: the Android app config, the site-link file, the tracker switch-off and the redirect login inside the app. No network.
const fs = require('fs'), path = require('path');
const R = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
let pass = 0, fail = 0;
const t = (name, ok, extra) => { if (ok) pass++; else { fail++; console.log('FAIL  ' + name + (extra ? '  ' + extra : '')); } };

const fj = JSON.parse(R('firebase.json')), ig = fj.hosting.ignore || [];
t('firebase.json: the .well-known folder is deployed (no pattern hides every dot-folder)', !ig.includes('**/.*') && !ig.some(p => /^\*\*\/\.\*+$/.test(p) || /well-known/.test(p)));
const al = JSON.parse(R('public/.well-known/assetlinks.json'));
t('assetlinks.json is a JSON list; every entry (once filled) names the package and has SHA-256 fingerprints', Array.isArray(al) && al.every(e => e.target && e.target.namespace === 'android_app' && e.target.package_name === 'app.web.orbittutorial' && Array.isArray(e.target.sha256_cert_fingerprints) && e.target.sha256_cert_fingerprints.every(f => /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(f))));

const tw = JSON.parse(R('android/twa-manifest.json')), man = JSON.parse(R('public/manifest.webmanifest'));
t('twa-manifest: valid package id, https host, start url flags the app, version code is a whole number', /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/.test(tw.packageId) && tw.host === 'orbittutorial.web.app' && tw.startUrl === '/?source=twa' && Number.isInteger(tw.appVersionCode) && tw.appVersionCode >= 1);
t('twa-manifest: icons are https and match the web manifest icons', /^https:\/\/orbittutorial\.web\.app\/icon-512\.png$/.test(tw.iconUrl) && man.icons.some(i => i.src === '/icon-512.png') && /maskable/.test(tw.maskableIconUrl) && man.icons.some(i => i.purpose === 'maskable'));
t('twa-manifest: no notifications asked, minSdk at least 23, signing key not stored in the repo', tw.enableNotifications === false && tw.minSdkVersion >= 23 && !/^\//.test(tw.signingKey.path) && /\.keystore$/.test(tw.signingKey.path));
t('the signing key can never be committed (.gitignore)', /android\/\*\.keystore/.test(R('.gitignore')) && /android\/\*\.jks/.test(R('.gitignore')));
t('web manifest: standalone, education category, same scope as the app host', man.display === 'standalone' && (man.categories || []).includes('education') && man.start_url === '/' && man.scope === '/');

const idx = R('public/index.html'), head = idx.slice(0, idx.indexOf('</head>'));
t('index.html: the app flag is set in the head, before any script that uses it', /source=twa/.test(head) && head.indexOf('ORBIT_TWA') > -1 && head.indexOf('ORBIT_TWA') < (head.indexOf('analytics.js') > -1 ? head.indexOf('analytics.js') : 1e9));
const vm = require('vm');
const run = (search, store) => { const ss = store || {}, ctx = { location: { search }, sessionStorage: { getItem: k => ss[k] || null, setItem: (k, v) => { ss[k] = v; } } }; ctx.window = ctx; vm.runInNewContext(/<script>(\/\* Android app[\s\S]*?)<\/script>/.exec(head)[1], ctx); return { flag: ctx.window.ORBIT_TWA, ss }; };
const a = run('?source=twa'), b = run('', a.ss), c = run('?class=7'), d = run('?x=1&source=twa');
t('app flag: set by /?source=twa, kept for the tab, never set for normal visits', a.flag === true && b.flag === true && c.flag === false && d.flag === true);
t('analytics.js: off inside the Android app (no Google Analytics, no Clarity)', /off = LOCAL \|\| !!g\.ORBIT_TWA/.test(R('public/analytics.js')));
const cl = R('public/cloud.js');
t('cloud.js: inside the app login uses redirect, in a browser it still tries the pop-up first', cl.indexOf('window.ORBIT_TWA') > -1 && cl.indexOf('window.ORBIT_TWA') < cl.indexOf('signInWithPopup(auth, provider)') && /auth\/popup-blocked/.test(cl));
t('PLAY-STORE.md exists and carries the current rules (API 36, 12 testers / 14 days)', /API 36/.test(R('docs/PLAY-STORE.md')) && /12 testers/.test(R('docs/PLAY-STORE.md')));
console.log(pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
