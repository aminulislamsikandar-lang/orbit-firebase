// Task 50 (Report button) and Task 54 (cartoon face): report documents, rules, wiring, and the face moving while speech is on.
const fs = require('fs'), path = require('path'), assert = require('assert');
const ROOT = path.join(__dirname, '..'), rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
let n = 0; const ok = (c, m) => { assert(c, m); n++; };
global.window = global; global.orbitLang = () => 'en';
require(path.join(ROOT, 'public', 'report.js'));

// --- report document ---
const long = 'x'.repeat(5000);
const d = window.REPORT._build({ qid: 'c10-sci:1.2', question: long, answer: long, course: 'Class 10 Science', lang: 'as' }, 'answer', ' wrong   fact \n here ');
ok(d.type === 'answer' && d.note === 'wrong fact here', 'note cleaned');
ok(d.question.length === 600 && d.answer.length === 2000, 'texts cut to the rules limits');
ok(JSON.stringify(Object.keys(d).sort()) === JSON.stringify(['answer', 'course', 'lang', 'note', 'qid', 'question', 'type']), 'only allowed fields (cloud adds uid, at, status)');
ok(window.REPORT._build({}, 'junk', '').type === 'question', 'unknown type becomes question');
for (const k in window.REPORT._tx) for (const l of ['hing', 'en', 'as', 'bn']) ok(window.REPORT._tx[k][l] && window.REPORT._tx[k][l].length > 3, 'text ' + k + '/' + l);
ok(!/[A-Za-z] [\u0980-\u09FF]|[\u0980-\u09FF] [a-z] /.test(window.REPORT._tx.note.as), 'no stray Latin letter inside Assamese text');

// --- rules / cloud / wiring ---
const rules = rd('firestore.rules');
ok(rules.includes('match /reports/{key}') && rules.includes("'_[1-5]')"), 'rules: reports with 5 slots a day');
ok(/match \/reports\/\{key\}[\s\S]*allow read, delete: if isAdmin\(\)/.test(rules), 'rules: only admin reads and deletes reports');
ok(/match \/reports\/\{key\}[\s\S]*request\.resource\.data\.at == request\.time/.test(rules), 'rules: server time');
const cloud = rd('public/cloud.js');
ok(cloud.includes('reports: {') && cloud.includes('updateDoc') && cloud.includes("'_' + n"), 'cloud reports API');
const idx = rd('public/index.html');
for (const k of ['data-act="qrep"', "act==='qrep'", 'REPORT.open(reportCtx(id))', '/report.js', '/avatar.js', 'AVATAR.set(anySay())', 'AVATAR.pulse()']) ok(idx.includes(k), 'index: ' + k);
const team = rd('public/team.js');
for (const k of ["a === 'rep'", 'REPORT.mountAdmin', 'repMode']) ok(team.includes(k), 'team: ' + k);
const sw = rd('public/sw.js'); ok(sw.includes('/report.js') && sw.includes('/avatar.js'), 'cached for offline');
for (const f of ['public/report.js', 'public/avatar.js']) { const s = rd(f); ok(!/\.(innerHTML|outerHTML)\s*\+?=/.test(s), f + ' no innerHTML sinks'); ok(!/https?:\/\/(?!www\.w3\.org)/.test(s), f + ' no external URLs'); }

// --- avatar: tiny fake DOM, fake voice ---
const mk = () => ({ attrs: {}, style: {}, kids: [], setAttribute(k, v) { this.attrs[k] = v; }, appendChild(c) { this.kids.push(c); c.isConnected = true; return c; }, remove() { this.isConnected = false; }, isConnected: false });
global.document = { createElementNS: () => mk(), createElement: () => mk(), body: mk() };
let talking = true; global.speechSynthesis = { get speaking() { return talking; }, cancel() { talking = false; } };
global.matchMedia = () => ({ matches: false });
require(path.join(ROOT, 'public', 'avatar.js'));
const A = window.AVATAR;
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  A.set(true); ok(A._s.root && A._s.root.style.display === '', 'face shows when an answer is read');
  A.pulse(); await sleep(260);
  const ry = +A._s.mouth.attrs.ry; ok(ry > 2.5, 'mouth opens while talking (ry=' + ry + ')');
  talking = false; await sleep(1800); ok(A._s.root.style.display === 'none' && A._s.timer === 0, 'face hides itself when the voice ends');
  talking = true; A.set(true); ok(A._s.root.style.display === '', 'shows again for the next answer');
  A._s.root.onclick(); ok(talking === false && A._s.root.style.display === 'none', 'tapping the face stops the voice');
  console.log(n + ' passed, 0 failed'); process.exit(0);
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
