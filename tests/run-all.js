#!/usr/bin/env node
// Runs every tests/*.test.js in its own process, prints one line per file and exits 1 if any file fails.
// In CI (CI=true) a SKIP line also fails, so a DOM test that cannot run (jsdom missing) can never pass silently.
// Usage: npm test        (or: node tests/run-all.js [name-filter])
const { spawnSync } = require('child_process'), fs = require('fs'), path = require('path');
const dir = __dirname, filter = process.argv[2] || '', ci = process.env.CI === 'true' || process.env.CI === '1';
const files = fs.readdirSync(dir).filter(f => /\.test\.js$/.test(f) && f.includes(filter)).sort();
if (!files.length) { console.error('No test files found' + (filter ? ' for "' + filter + '"' : '') + '.'); process.exit(1); }
let bad = 0, total = 0;
for (const f of files) {
  const r = spawnSync(process.execPath, [path.join(dir, f)], { encoding: 'utf8', timeout: 180000, env: process.env });
  const out = (r.stdout || '') + (r.stderr || ''), lines = out.trim().split('\n');
  const m = /(\d+) passed, (\d+) failed/.exec(out), skipped = lines.filter(l => /^SKIP\b/.test(l));
  const n = m ? +m[1] : 0; total += n;
  const failed = r.status !== 0 || !m || +m[2] > 0 || (ci && skipped.length > 0);
  console.log((failed ? 'FAIL  ' : 'ok    ') + f.padEnd(40) + (m ? m[1] + ' passed' : 'no result line') + (skipped.length ? '  (' + skipped.length + ' skipped' + (ci ? ' -> not allowed in CI' : '') + ')' : ''));
  if (failed) { bad++; console.log(lines.filter(l => /^(FAIL|SKIP)|Error|error/.test(l)).slice(0, 12).map(l => '      ' + l).join('\n') || out.slice(-600)); }
}
console.log('\n' + (files.length - bad) + '/' + files.length + ' test files ok, ' + total + ' checks passed' + (bad ? ', ' + bad + ' file(s) FAILED' : ''));
process.exit(bad ? 1 : 0);
