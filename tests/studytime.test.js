// "Padhai ka time" (study time): plan cleaning, which state the child sees, and that the page is wired into the app.
const fs = require('fs'), path = require('path'), assert = require('assert');
const ROOT = path.join(__dirname, '..'), rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
let n = 0; const ok = (c, m) => { assert(c, m); n++; };
// the module needs a window with a document that can take listeners
const listeners = [];
global.window = global; global.document = { addEventListener: (t, f) => listeners.push(t), hidden: false, getElementById: () => null, body: { appendChild() {} } };
global.localStorage = { _: {}, getItem(k) { return this._[k] == null ? null : this._[k]; }, setItem(k, v) { this._[k] = String(v); }, removeItem(k) { delete this._[k]; } };
global.setInterval = () => 0; global.orbitLang = () => 'en';
require(path.join(ROOT, 'public', 'studytime.js'));
const T = window.STUDY._t;

// clean(): never trusts what is stored
ok(JSON.stringify(T.clean(null)) === JSON.stringify(T.DEF()), 'empty plan = defaults, switched off');
const c = T.clean({ on: true, name: '  Rahul   Ali ' + 'x'.repeat(50), time: '25:99', mins: 7, days: [1, 1, 9, 'x', 3, -1], course: 'c2-assamese', ch: 500 });
ok(c.on === true && c.name.length <= 30 && c.name.startsWith('Rahul Ali'), 'name cleaned and cut');
ok(c.time === '17:00' && c.mins === 20, 'bad time or minutes fall back');
ok(JSON.stringify(c.days) === '[1,3]' && c.ch === 0, 'days de-duplicated and limited to 0-6; chapter limited');
ok(T.clean({ on: 'yes' }).on === false, 'on must be exactly true');

// stateOf(): what the child sees (Mon 2026-11-16 as the test day)
const d = (h, m) => new Date(2026, 10, 16, h, m);
const plan = T.clean({ on: true, time: '17:00', mins: 20, days: [1, 2, 3, 4, 5] }), none = { days: {} };
ok(T.stateOf(T.clean({}), none, d(18, 0)).k === 'off', 'off');
ok(T.stateOf(plan, none, d(16, 30)).k === 'before' && T.stateOf(plan, none, d(16, 30)).in === 30, 'before, 30 minutes left');
ok(T.stateOf(plan, none, d(17, 0)).k === 'due' && T.stateOf(plan, none, d(21, 0)).k === 'due', 'due at the time and stays due');
ok(T.stateOf(plan, { days: { '2026-11-16': { done: true } } }, d(18, 0)).k === 'done', 'done today');
ok(T.stateOf(plan, none, new Date(2026, 10, 15, 17, 30)).k === 'rest', 'Sunday is not a study day');

ok(T.fmtClock('17:05') === '5:05 PM' && T.fmtClock('00:30') === '12:30 AM' && T.fmtClock('12:00') === '12:00 PM', 'clock text');
ok(T.mmss(20 * 60000) === '20:00' && T.mmss(61000) === '01:01' && T.mmss(-5) === '00:00', 'timer text');

// the phone and the server clean a plan in the same way
const SC = require('../study-core');
for (const x of [null, {}, { on: true, name: ' A  B ', time: '25:00', mins: 7, days: [1, 1, 9, 3], course: 'c2-as<script>', ch: 500 }, { on: true, name: 'Rahul', time: '06:05', mins: 45, days: [0, 6], course: 'c10-science', ch: 12, cls: 3, subj: ['evs', 'asm'] }, { on: 'yes', mins: '30', time: 5 }, { cls: 9, subj: ['x'] }, { cls: '2', subj: [] }])
  ok(JSON.stringify(T.clean(x)) === JSON.stringify(SC.cleanPlan(x)), 'client and server clean the same: ' + JSON.stringify(x));

// the father's card for one child: green status pill + coloured number cards (no numbers hidden in a sentence)
{
  const plan = { on: true, time: '17:00', mins: 30, days: [0, 1, 2, 3, 4, 5, 6] };
  const row = today => T.kidRow({ id: 'c1', name: 'Rahul', plan, today });
  const done = row({ done: true, mins: 30, q: 8, ok: 6 });
  ok(/sp-kid sp-g/.test(done) && />Aaj padhai poori hui</.test(done) && /<b>30<\/b><span>minute padhai/.test(done) && /<b>6\/8<\/b><span>sawaal sahi/.test(done), 'done: green pill, minutes card and sawaal card');
  ok(/sp-kid sp-l/.test(row({ started: true })) && !/sp-st/.test(row({ started: true })), 'started: lime pill, no number cards');
  ok(/sp-kid sp-a/.test(row({})) && /abhi tak shuru nahi hua/.test(row({})), 'not started: amber pill');
  ok(/sp-kid sp-n/.test(T.kidRow({ id: 'c1', name: 'Rahul', plan: { on: false, time: '17:00', mins: 30, days: [1] }, today: {} })), 'switched off: grey');
  ok(/class="sp-av"[^>]*>R</.test(done) && !/<script/.test(T.kidRow({ id: 'c1', name: '<script>x</script>', plan, today: {} })), 'initial letter shown, name escaped');
}

// wiring
const idx = rd('public/index.html');
for (const k of ['/kidbank.js', "item('study','recall'", "VIEW==='study'", 'STUDY.viewHTML()', 'STUDY.setUser(u)', "STUDY.leave()", 'STUDY.sync()', '/studytime.js']) ok(idx.includes(k), 'index: ' + k);
const swSrc = rd('public/sw.js');
ok(swSrc.includes('/studytime.js') && swSrc.includes('/kidbank.js'), 'cached for offline');
ok(swSrc.includes("addEventListener('push'") && swSrc.includes("addEventListener('notificationclick'"), 'service worker shows pushes and opens the app on tap');
ok(!/data:\s*\{\s*url:\s*d\./.test(swSrc), 'tap always opens the app own page, never an address from the message');
const src = rd('public/studytime.js');
ok(!/\.(innerHTML|outerHTML)\s*\+?=/.test(src), 'no innerHTML sinks');
ok(src.includes('link/join') && src.includes('push/subscribe') && src.includes('applicationServerKey'), 'parent link + push subscribe wired');
ok(src.includes('KIDBANK') && src.includes('data-sp="ans"') && src.includes('data-sp="nextq"'), 'tutor questions wired into the session');
ok(!/getUserMedia|MediaRecorder|SpeechRecognition/.test(src), 'no camera or microphone (child privacy)');
ok(!/https?:\/\//.test(src), 'no external URLs');
for (const k of Object.keys(window.STUDY._t)) ok(true, k);
console.log(n + ' passed, 0 failed');
