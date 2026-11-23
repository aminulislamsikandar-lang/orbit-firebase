// The free plan in a fake browser (jsdom): the lock follows the POSITION of a chapter in its list (so a course whose first chapter is numbered 2 still opens it),
// the "free time over" and "Orbit Plus" pages open as app views, and the old sheet is used when the app can not open a view (Kid mode).
// Real public/plan.js, a fake server answer. Skipped when jsdom is not installed. Run: node tests/plan-dom.test.js
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
let JSDOM = null; try { ({ JSDOM } = require('jsdom')); } catch (e) {}
let pass = 0, fail = 0;
const t = (name, ok, extra) => { if (ok) pass++; else { fail++; console.log('FAIL  ' + name + (extra ? '  ' + extra : '')); } };
if (!JSDOM) { console.log('SKIP  jsdom not installed - free plan DOM tests not run'); console.log('0 passed, 0 failed'); process.exit(0); }
const src = fs.readFileSync(path.join(ROOT, 'public', 'plan.js'), 'utf8').replace(/^﻿/, '');
const sleep = ms => new Promise(r => setTimeout(r, ms));

// opts: state (server answer), noGo (the app has no orbitGo), blockGo (orbitGo does nothing, like Kid mode)
function boot(opts) {
  const dom = new JSDOM('<!doctype html><body><div id="app"></div></body>', { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://orbittutorial.web.app/' });
  const w = dom.window, app = () => w.document.getElementById('app');
  w.AbortSignal = { timeout() { return undefined; } };   // the call timeout is not what is tested here
  const state = Object.assign({ on: true, plus: false, left: 300, seconds: 600, chapters: 1, pay: { enabled: true, rupees: 99, days: 365 } }, opts.state || {});
  w.fetch = () => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(state), clone() { return this; } });
  w.CLOUD = { token: () => Promise.resolve('tok') };
  w.orbitUser = () => ({ uid: 'u1' });
  let view = 'home'; const went = []; let redraws = 0;
  w.orbitRedraw = () => { redraws++; };
  if (!opts.noGo) w.orbitGo = v => { went.push(v); if (!opts.blockGo) { view = v; app().innerHTML = w.PLAN.viewHTML(v); } };
  w.orbitView = () => view;
  w.eval(src);
  return { w, app, went, state, redraws: () => redraws };
}
const list = nums => '<div class="rows">' + nums.map(n => '<button class="row" data-act="pg" data-p="chapter" data-ch="' + n + '"><span class="rgo">&gt;</span></button>').join('') + '</div>';
const locks = A => [...A.w.document.querySelectorAll('button.row')].map(r => r.getAttribute('data-plan-lock') === '1' && !!r.querySelector('svg') ? 'L' : 'o').join('');

(async () => {
  // ---- the lock counts places in the list, not chapter numbers ----
  let A = boot({});
  A.app().innerHTML = list([1, 2, 3]);
  await sleep(250);
  t('Class 10 style list (1, 2, 3): chapter 1 open, chapters 2 and 3 locked', locks(A) === 'oLL', locks(A));
  A = boot({});
  A.app().innerHTML = list([2, 3, 4, 5]);
  await sleep(250);
  t('Class 7 Maths Assamese style list (2, 3, 4, 5): the FIRST chapter is open, the rest locked', locks(A) === 'oLLL', locks(A));
  A = boot({});
  A.app().innerHTML = list([0, 1, 2]);
  await sleep(250);
  t('list that starts with a revision chapter (0, 1, 2): the first place is open', locks(A) === 'oLL', locks(A));
  A = boot({});
  A.app().innerHTML = '<div class="rows"><button class="row" data-act="pg" data-p="chapter" data-ch="1"><span class="rgo">&gt;</span></button><button class="row" data-act="lock" data-ch="2"><span class="rgo">x</span></button><div class="rnote">Coming soon</div><button class="row" data-act="pg" data-p="chapter" data-ch="3"><span class="rgo">&gt;</span></button></div>';
  await sleep(250);
  t('a "coming soon" row and its note still count as one place each way the server counts (position 3 is locked)', locks(A).charAt(2) === 'L' && locks(A).charAt(0) === 'o', locks(A));
  A = boot({ state: { chapters: 2 } });
  A.app().innerHTML = list([2, 3, 4]);
  await sleep(250);
  t('FREE_CHAPTERS=2: first two places open', locks(A) === 'ooL', locks(A));
  A = boot({ state: { plus: true, left: 0 } });
  A.app().innerHTML = list([2, 3, 4]);
  await sleep(250);
  t('Plus student: nothing locked, no timer', locks(A) === 'ooo' && A.w.document.getElementById('plan-timer').style.display === 'none', locks(A));
  A = boot({ state: { on: false } });
  A.app().innerHTML = list([2, 3, 4]);
  await sleep(250);
  t('plan off: nothing locked, no timer', locks(A) === 'ooo' && (!A.w.document.getElementById('plan-timer') || A.w.document.getElementById('plan-timer').style.display === 'none'), locks(A));
  A = boot({ state: { plus: false, left: 300 } });
  await sleep(250);
  t('free student sees the countdown in the corner', A.w.document.getElementById('plan-timer').textContent === 'Free 05:00', A.w.document.getElementById('plan-timer').textContent);

  // ---- tapping a locked chapter ----
  A = boot({});
  A.app().innerHTML = list([2, 3]);
  await sleep(250);
  A.w.document.querySelectorAll('button.row')[1].click();
  t('tapping a locked chapter opens the "Ye chapter Plus mein hai" sheet and not the chapter', /Ye chapter Plus mein hai/.test(A.w.document.body.textContent) && /Free plan mein sirf pehla chapter khula hai/.test(A.w.document.body.textContent));
  A.w.document.querySelectorAll('button.row')[0].click();
  t('the free chapter is not stopped', A.went.length === 0);

  // ---- free time over: a page, with the Plus lo button leading to the plans page ----
  A = boot({ state: { left: 0 } });
  await sleep(1500);
  t('time over: the app is sent to the "free time over" view', A.went[0] === 'planover', A.went.join());
  t('time over page text', /Aaj ka free time khatam/.test(A.app().textContent) && /Kal phir aao, ya Plus lo\./.test(A.app().textContent) && /Jo answers device mein saved hai, wo offline dekh sakte ho\./.test(A.app().textContent));
  t('time over: the corner shows Free 00:00', A.w.document.getElementById('plan-timer').textContent === 'Free 00:00', A.w.document.getElementById('plan-timer').textContent);
  t('time over page shows once (not again every second)', A.went.filter(v => v === 'planover').length === 1, A.went.join());
  A.w.document.querySelector('[data-plan="plans"]').click();
  t('Plus lo on the time over page opens the Orbit Plus page', A.went[A.went.length - 1] === 'plan' && /Orbit Plus/.test(A.app().textContent) && /Study-time alert \(father ke phone par\)/.test(A.app().textContent));
  let started = 0; A.w.OrbitPay = { start() { started++; } };
  A.app().innerHTML = A.w.PLAN.viewHTML('plan');
  A.w.document.querySelector('[data-plan="buy"]').click();
  t('Plus lo on the Orbit Plus page starts the existing Razorpay payment', started === 1);

  // ---- the timer in the corner opens the plans page ----
  A = boot({});
  await sleep(250);
  A.w.document.getElementById('plan-timer').click();
  t('tapping the countdown opens the Orbit Plus page', A.went[0] === 'plan' && /Rs 99/.test(A.app().textContent) && /365 din/.test(A.app().textContent));

  // ---- Kid mode (the app does not open the view): the old sheet is still shown ----
  A = boot({ state: { left: 0 }, blockGo: true });
  await sleep(1500);
  t('app refuses the view: the time over sheet appears instead (the wall never disappears)', A.went.includes('planover') && /Aaj ka free time khatam/.test(A.w.document.body.textContent) && !!A.w.document.querySelector('[role="dialog"]') && /Theek hai/.test(A.w.document.body.textContent));
  A = boot({ state: { left: 0 }, noGo: true });
  await sleep(1500);
  t('app without orbitGo: the sheet appears too', /Aaj ka free time khatam/.test(A.w.document.body.textContent) && !!A.w.document.querySelector('[role="dialog"]'));

  // ---- Plus bought: the page is closed and the chapter list is drawn again ----
  A = boot({ state: { left: 0 } });
  await sleep(1500);
  A.state.plus = true;
  A.w.dispatchEvent(new A.w.Event('orbit-paid'));
  await sleep(2200);
  t('after payment the wall page goes back to Home and the lists are drawn again without locks', A.went[A.went.length - 1] === 'home' && A.redraws() >= 1, A.went.join() + ' redraws=' + A.redraws());

  console.log(pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})();
