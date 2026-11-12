// Every file parses (one typo in the big inline script or a module would break the whole app) and the project files are consistent.
// Run: node tests/syntax.test.js
const fs = require('fs'), path = require('path'), vm = require('vm'), { spawnSync } = require('child_process');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/^\uFEFF/, '');
let pass = 0, fail = 0;
const t = (name, ok, extra) => { if (ok) pass++; else { fail++; console.log('FAIL  ' + name + (extra ? '  ' + extra : '')); } };
const parses = (src, isModule) => isModule ? spawnSync(process.execPath, ['--input-type=module', '--check'], { input: src, encoding: 'utf8' }) : (() => { try { new vm.Script(src); return { status: 0 }; } catch (e) { return { status: 1, stderr: e.message }; } })();

// browser files (classic scripts, or ES modules for cloud.js / firebase-config.js)
for (const f of fs.readdirSync(path.join(ROOT, 'public')).filter(x => /\.js$/.test(x))) {
  const src = read('public/' + f), mod = /^\s*(import|export)\s/m.test(src), r = parses(src, mod);
  t('public/' + f + ' parses' + (mod ? ' (module)' : ''), r.status === 0, (r.stderr || '').split('\n')[0]);
}
// the two inline scripts of the page
const html = read('public/index.html');
[...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].forEach((m, i) => { const r = parses(m[1], false); t('index.html inline script #' + (i + 1) + ' parses', r.status === 0, (r.stderr || '').split('\n')[0]); });
// server side
for (const f of fs.readdirSync(ROOT).filter(x => /\.js$/.test(x))) { const r = spawnSync(process.execPath, ['--check', path.join(ROOT, f)], { encoding: 'utf8' }); t(f + ' parses', r.status === 0, (r.stderr || '').split('\n')[0]); }
// data files
for (const f of ['firebase.json', 'package.json', 'public/manifest.webmanifest']) { let ok = true; try { JSON.parse(read(f)); } catch (e) { ok = false; } t(f + ' is valid JSON', ok); }

// project consistency
const pkg = JSON.parse(read('package.json'));
t('npm test runs the whole suite', pkg.scripts && pkg.scripts.test === 'node tests/run-all.js');
t('every page script that index.html loads exists', [...html.matchAll(/<script[^>]*\bsrc="(\/[^"]+)"/g)].every(m => fs.existsSync(path.join(ROOT, 'public', m[1].slice(1)))));
t('service worker cache name is versioned (bump it whenever a page file changes)', /const SHELL = 'orbit-shell-v\d+'/.test(read('public/sw.js')));
const wf = fs.existsSync(path.join(ROOT, '.github/workflows/ci.yml')) ? read('.github/workflows/ci.yml') : '';
t('CI: workflow runs on every push to main and every pull request', /on:/.test(wf) && /pull_request/.test(wf) && /push:/.test(wf) && /branches: \[main\]/.test(wf));
t('CI: installs from the lock file, adds jsdom for the DOM tests, runs npm test with CI=true', /npm ci/.test(wf) && /jsdom@\d+/.test(wf) && /npm test/.test(wf) && /CI: 'true'/.test(wf));
t('CI: read-only token, current Node, pinned action versions', /permissions:\s*\n\s*contents: read/.test(wf) && /node-version: 22/.test(wf) && /actions\/checkout@v\d+/.test(wf) && /actions\/setup-node@v\d+/.test(wf));
t('CI: weekly dependency audit (not blocking pull requests)', /schedule:/.test(wf) && /npm audit --omit=dev --audit-level=high/.test(wf) && /github\.event_name != 'pull_request'/.test(wf));
t('Dependabot watches npm and GitHub Actions weekly', (d => /package-ecosystem: npm/.test(d) && /package-ecosystem: github-actions/.test(d) && (d.match(/interval: weekly/g) || []).length === 2)(fs.existsSync(path.join(ROOT, '.github/dependabot.yml')) ? read('.github/dependabot.yml') : ''));
t('jsdom is NOT an app dependency (Render builds stay small)', !(pkg.dependencies || {}).jsdom && !(pkg.devDependencies || {}).jsdom);
t('docs/SECURITY.md exists and README points to it', fs.existsSync(path.join(ROOT, 'docs/SECURITY.md')) && /docs\/SECURITY\.md/.test(read('README.md')));
t('.env and node_modules are ignored by git', /(^|\n)\.env(\r?\n|$)/.test(read('.gitignore')) && /(^|\n)node_modules(\r?\n|$)/.test(read('.gitignore')));

console.log(pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
