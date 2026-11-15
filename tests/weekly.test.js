// Task 47: weekly report on WhatsApp (wa.me link, built on the student's device from their own data). Skipped without jsdom for the screen part.
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..'), read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
let pass = 0, fail = 0;
const t = (name, ok, extra) => { if (ok) pass++; else { fail++; console.log('FAIL  ' + name + (extra ? '  ' + extra : '')); } };
const src = read('public/weekly.js'), H = read('public/index.html'), RC = read('public/recall.js');

t('wired: Weekly Report view, sidebar item, icon, setUser, script, chapter-open day mark', /VIEW==='report'\)body=window\.WEEKLY/.test(H) && /item\('report','report','Weekly Report'\)/.test(H) && /\n report:ic\(/.test(H) && /WEEKLY\.setUser\(u\)/.test(H) && /src="\/report\.js"/.test(H) && /n\.page==='chapter'&&window\.WEEKLY\)WEEKLY\.mark\(\)/.test(H));
t('wired: a Recall check marks the day and sends the chapter score to the joined classes; RECALL exposes history()', /g\.WEEKLY\.mark\(\)/.test(RC) && /g\.CLASSROOM\.score\(p\[0\], \+p\[1\], j\.total\)/.test(RC) && /history: \(\) => read\(\)\.slice\(\)/.test(RC));
t('privacy: the number stays on the device (localStorage only), never sent to a server', !/fetch\(|api\(|CLOUD/.test(src) && /localStorage/.test(src));
t('privacy: nothing is sent by Orbit, only a wa.me link is opened', /wa\.me\//.test(src) && /g\.open\(url, '_blank', 'noopener'\)/.test(src));
t('no emoji, no Premium word', !/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(src) && !/premium/i.test(src));

const g = { localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} }, document: { addEventListener() {} } };
global.window = g; global.document = g.document; eval(src);
const T = g.WEEKLY._t, DAY = 86400000, now = new Date(2026, 10, 14, 20, 0, 0).getTime(), d = n => T.ymd(new Date(now - n * DAY));
const title = k => ({ 'c7-science|1': 'Science Ch 1 Nutrition', 'c7-science|2': 'Science Ch 2 Heat', 'c7-maths|3': 'Maths Ch 3 Fractions' }[k] || k);

t('phone: accepts plain, spaced, +91, 91 and 0 forms', ['9876543210', '98765 43210', '+91 98765-43210', '919876543210', '09876543210'].every(x => T.cleanPhone(x) === '9876543210'));
t('phone: refuses short, long, letters and numbers starting 0-5', ['', '12345', '98765432109999', 'abcdefghij', '5876543210', '0000000000'].every(x => T.cleanPhone(x) === ''));
t('link: number gets 91 in front, text is URL-encoded; no number gives a chooser link', T.waLink('9876543210', 'Hi\nA&B').startsWith('https://wa.me/919876543210?text=Hi%0AA%26B') && T.waLink('', 'x') === 'https://wa.me/?text=x');

let r = T.build({ now, name: 'Rina Das', studied: [d(0), d(2), d(9)], hist: [
  { k: 'c7-science|1', t: 40, at: now - 3 * DAY }, { k: 'c7-science|1', t: 82.4, at: now - 1 * DAY },
  { k: 'c7-science|2', t: 30, at: now - 2 * DAY }, { k: 'c7-maths|3', t: 60, at: now - 5 * DAY }, { k: 'c7-science|2', t: 99, at: now - 20 * DAY }], titleOf: title });
t('report: days = studied days in the last 7 + Recall days, older days ignored', r.daysStudied === 5 && /Padha: 5\/7 din/.test(r.text), r.text);
t('report: first line has only the first name', /^Orbit: Rina ki hafte ki padhai/.test(r.text) && !/Das/.test(r.text));
t('report: uses the latest score of each chapter this week; old checks are ignored', /Pakka hua: Science Ch 1 Nutrition \(82%\)/.test(r.text) && /Dobara dekhna hai: Science Ch 2 Heat \(30%\)/.test(r.text) && /Theek hai, thoda aur: Maths Ch 3 Fractions \(60%\)/.test(r.text) && r.checks === 4);
t('report: a weak chapter gets the "padhwa do" advice', /Kamzor chapter ko is hafte ek baar aur padhwa do/.test(r.text));
r = T.build({ now, name: '', studied: [], hist: [], titleOf: title });
t('empty week: says no study, first-name fallback', /Padha: 0\/7 din/.test(r.text) && /Is hafte padhai nahi hui/.test(r.text) && /^Orbit: Bachha ki/.test(r.text));
r = T.build({ now, name: 'A', studied: [d(0)], hist: [{ k: 'c7-science|1', t: 90, at: now - DAY }], titleOf: title });
t('good week: no weak line, praise only', !/Dobara dekhna/.test(r.text) && /Shabash! Roz thoda thoda/.test(r.text));
const many = Array.from({ length: 9 }, (_, i) => ({ k: 'x|' + i, t: 90 - i, at: now - DAY }));
t('long list: at most 4 chapters per line', (T.build({ now, name: 'A', hist: many, titleOf: title }).text.match(/\(\d+%\)/g) || []).length === 4);
t('only this student: no other names or phone in the text', !/\d{10}/.test(T.build({ now, name: 'A', hist: many, titleOf: title }).text));

let JSDOM = null; try { ({ JSDOM } = require('jsdom')); } catch (e) {}
if (!JSDOM) { console.log('SKIP  jsdom not installed - Weekly Report screen tests not run'); console.log(pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0); }
const wait = () => new Promise(r => setTimeout(r, 10));
function boot(hist) {
  const dom = new JSDOM('<!doctype html><body><div id="app"></div></body>', { runScripts: 'outside-only', url: 'https://orbittutorial.web.app/', pretendToBeVisual: true });
  const w = dom.window, opened = []; w.open = (u, a, b) => opened.push({ u, a, b });
  w.RECALL = { history: () => hist || [] };
  w.eval('var VIEW="report",USER={uid:"u1",name:"Rina Das"},DATA={courses:[{id:"c7-science",class:7,subject:"Science",chapters:[{no:1,title:"Nutrition"}]}]};function draw(){document.getElementById("app").innerHTML=window.WEEKLY.viewHTML();}');
  w.eval(src); w.WEEKLY.setUser({ uid: 'u1' }); w.eval('draw()');
  const d = w.document;
  return { w, d, opened, app: () => d.getElementById('app').textContent, click: s => d.querySelector(s).click() };
}
(async () => {
  const hist = [{ k: 'c7-science|1', t: 85, at: Date.now() - 3600000 }];
  let a = boot(hist);
  t('screen: report preview, consent box and Orbit-sends-nothing note', /Rina ki hafte ki padhai/.test(a.app()) && /Science Ch 1 Nutrition \(85%\)/.test(a.app()) && /Orbit khud kuch nahi bhejta/.test(a.app()) && !!a.d.getElementById('wkOk'));
  a.w.WEEKLY.mark(); a.w.eval('draw()');
  t('screen: opening a chapter counts as a study day (stored as a date only)', /Padha: 1\/7 din/.test(a.app()) && /^\["\d{4}-\d{2}-\d{2}"\]$/.test(a.w.localStorage.getItem('orbit.study.u1')));
  a.click('[data-wk=send]');
  t('send without number: opens the WhatsApp chooser with the report text', a.opened.length === 1 && a.opened[0].u.startsWith('https://wa.me/?text=') && decodeURIComponent(a.opened[0].u).includes('Pakka hua: Science Ch 1 Nutrition (85%)') && a.opened[0].b === 'noopener');
  a.d.getElementById('wkPhone').value = '98765'; a.click('[data-wk=savephone]');
  t('save number: a wrong number is refused', /Number sahi nahi hai/.test(a.app()) && !a.w.localStorage.getItem('orbit.parentwa.u1'));
  a.d.getElementById('wkPhone').value = '+91 98765 43210'; a.click('[data-wk=savephone]');
  t('save number: refused without the parent OK tick', /ijazat ka box tick karo/.test(a.app()) && !a.w.localStorage.getItem('orbit.parentwa.u1'));
  a.d.getElementById('wkPhone').value = '+91 98765 43210'; a.d.getElementById('wkOk').checked = true; a.click('[data-wk=savephone]');
  t('save number: saved on this device only, shown masked', a.w.localStorage.getItem('orbit.parentwa.u1') === '9876543210' && /••••••3210/.test(a.app()) && !/9876543210/.test(a.app()));
  a.click('[data-wk=send]');
  t('send with number: opens the parent chat with the report', a.opened.length === 2 && a.opened[1].u.startsWith('https://wa.me/919876543210?text='));
  const b = boot(hist); b.w.localStorage.setItem('orbit.parentwa.u1', '9876543210'); b.w.WEEKLY.setUser({ uid: 'u9' }); b.w.WEEKLY.setUser({ uid: 'u1' }); b.w.eval('draw()');
  t('number is remembered next time, per student', /••••••3210/.test(b.app()));
  b.w.WEEKLY.setUser({ uid: 'u9' }); b.w.eval('draw()');
  t('another student on the same phone does not see that number', !/••••/.test(b.app()) && !!b.d.getElementById('wkPhone'));
  a.click('[data-wk=delphone]');
  t('number can be removed', !a.w.localStorage.getItem('orbit.parentwa.u1') && !!a.d.getElementById('wkPhone'));
  console.log(pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
})();
