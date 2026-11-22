// Prompt box in the real index.html (jsdom): where it shows, search in the course, asking the AI, Anime mode, attachments, and that the page itself is untouched.
// Needs jsdom (CI installs it). Run: node tests/promptbox-dom.test.js
let JSDOM; try { ({ JSDOM } = require('jsdom')); } catch (e) { console.log('SKIP jsdom is not installed'); process.exit(0); }
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/^﻿/, '');
const rawHtml = read('public/index.html');
const html = rawHtml.replace(/<script\b[^>]*\bsrc=[^>]*><\/script>/g, '');
const QDATA = JSON.parse(JSON.stringify(require('../questions-public')));
let pass = 0, fail = 0;
const t = (n, ok, extra) => { if (ok) pass++; else { fail++; console.log('FAIL  ' + n + (extra ? '  ' + extra : '')); } };
const tick = (ms = 30) => new Promise(r => setTimeout(r, ms));

async function boot() {
  const dom = new JSDOM(html, {
    runScripts: 'dangerously', url: 'https://orbittutorial.web.app/', pretendToBeVisual: true,
    beforeParse(w) {
      w.eval(read('public/catalog.js'));
      w.matchMedia = w.matchMedia || (() => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
      w.scrollTo = () => {};
      w.fetch = async url => /questions\.json$/.test(url) ? { ok: true, json: async () => QDATA } : { ok: false, json: async () => ({}) };
      w.CLOUD = { token: async () => 't', push: async () => {}, login: async () => {}, logout: async () => {}, course: { get: async () => ({ org: 'seba', cls: 10, med: 'Assamese' }), set: async () => {} } };
    }
  });
  const w = dom.window;
  await tick(60);
  w.onCloudUser({ uid: 'u1', name: 'Test', email: 't@example.com', photo: '' });
  await tick(80);
  w.eval(read('public/promptbox.js'));   // index.html's script tags are stripped in this test, so the file is loaded by hand
  await tick(20);
  return w;
}

(async () => {
  const w = await boot(), d = w.document;
  w.HTMLElement.prototype.scrollIntoView = function () { w.__scrolled = this.dataset.qid; };
  const box = () => d.getElementById('pbx'), ta = () => d.querySelector('.pbx-t');
  const click = el => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  const type = v => { ta().value = v; ta().dispatchEvent(new w.Event('input', { bubbles: true })); };
  const key = (k, o) => ta().dispatchEvent(new w.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...o }));
  const sheet = () => d.querySelector('.pbx-sheet');

  t('index.html loads promptbox.js (after the other scripts, before the cloud module)', /<script src="\/promptbox\.js"><\/script>/.test(rawHtml) && rawHtml.indexOf('/promptbox.js') < rawHtml.indexOf("import('/cloud.js')"));
  t('the box is on the page for a logged-in student with a course, outside #app', !!box() && !box().hidden && box().parentElement === d.body && !d.getElementById('app').contains(box()));
  t('buttons on the left: plus and Anime; send on the right; the box is empty with no instruction text', !!d.querySelector('.pbx-plus') && !!d.querySelector('.pbx-anime') && !!d.querySelector('.pbx-send') && ta().getAttribute('placeholder') == null && ta().value === '');
  t('send is off while the box is empty', d.querySelector('.pbx-send').disabled === true);
  t('the page leaves room under its content for the box', d.body.classList.contains('pbx-on'));

  // where it shows
  w.eval("VIEW='settings';draw()"); await tick();
  t('hidden on other screens', box().hidden === true && !d.body.classList.contains('pbx-on'));
  w.eval("VIEW='home';draw()"); await tick();
  t('back on the home screens', box().hidden === false);
  w.eval("USER=null;draw()"); await tick();
  t('hidden when logged out', box().hidden === true);
  w.eval("USER={uid:'u1'};draw()"); await tick();
  w.eval("COURSE=Object.assign({},COURSE,{kid:true});draw()"); await tick();
  t('hidden in kid mode', box().hidden === true);
  w.eval("COURSE=Object.assign({},COURSE,{kid:false});draw()"); await tick();
  t('shown again outside kid mode', box().hidden === false);

  // plus menu and Anime
  click(d.querySelector('.pbx-plus')); await tick();
  t('plus opens a menu: photo, and PDF or document', d.querySelectorAll('.pbx-menu .pbx-row').length === 2 && d.querySelector('.pbx-plus').getAttribute('aria-expanded') === 'true');
  click(d.body); await tick();
  t('clicking elsewhere closes the menu', !d.querySelector('.pbx-menu'));
  const an = d.querySelector('.pbx-anime');
  t('Anime is off at first', an.getAttribute('aria-pressed') === 'false' && !an.textContent.trim());
  click(an); await tick();
  t('tapping Anime turns it on and shows its name', an.getAttribute('aria-pressed') === 'true' && /Anime/.test(an.textContent));
  click(an); await tick();
  t('tapping again turns it off', an.getAttribute('aria-pressed') === 'false');

  // search in the student's own course
  const pick = w.eval(`(function(){const STOPW=['what','why','how','the','and'];for(const c of DATA.courses)for(const ch of c.chapters){if(isLocked(ch))continue;for(const s of (ch.sections||[]))for(const q of (s.questions||[])){const ws=(q.text.toLowerCase().match(/[a-z]{6,}/g)||[]);if(ws.length)return {id:q.id,word:ws[0],text:q.text,chNo:ch.no,sub:c.subject}}}return null})()`);
  t('the course has a question to search for', !!pick);
  type(pick.word); await tick();
  const rows = () => [...d.querySelectorAll('.pbx-pop .pbx-row')];
  t('typing a word shows the matching questions of the course, then "AI se pucho"', rows().length >= 2 && rows()[rows().length - 1].dataset.pbx === 'askai' && rows()[0].dataset.pbx === 'hit', rows().map(r => r.dataset.pbx).join());
  t('send turns on once there is text', d.querySelector('.pbx-send').disabled === false);
  click(rows()[0]); await tick(150);
  t('picking a match opens that chapter and jumps to the question card (the real card, no AI cost)', w.eval('NAV.page') === 'chapter' && !!d.querySelector('[data-qid="' + String(w.__scrolled || '') + '"]') && w.eval('VIEW') === 'home', w.eval('JSON.stringify(NAV)') + ' ' + w.__scrolled);
  t('the box is empty again afterwards and the box is still there', ta().value === '' && !box().hidden);
  type('zzzzzzzz qqqqqqqq'); await tick();
  t('no match: no list, Enter simply asks the AI', !d.querySelector('.pbx-pop'));

  // asking
  const calls = [];
  w.api = async (p, b) => { calls.push({ p, b }); return p === '/api/anime' ? { video: { title: 'T', scenes: [{ dur: 3, bg: '#0f1d15', items: [{ t: 'text', x: 50, y: 24, s: 5, c: '#ecf7ee', v: 'Solar <system>' }, { t: 'orbit', x: 50, y: 40, rx: 20, ry: 6, rot: -10, sec: 4, c: '#4ade80', in: 'fade', at: 1 }] }, { dur: 3, bg: '#101a2b', items: [{ t: 'arrow', x1: 10, y1: 30, x2: 60, y2: 30, w: 1, c: '#38bdf8' }, { t: 'text', x: 50, y: 20, s: 4, c: '#ecf7ee', v: 'Second' }] }] }, left: 2 } : { answer: 'Because of **scattering**.\nH₂O', left: 13 }; };
  type('Why is the sky blue?'); await tick();
  key('Enter', { isComposing: true });
  await tick();
  t('Enter while a keyboard is still composing a word does not send', calls.length === 0);
  key('Enter'); await tick(); await tick();
  t('Enter asks the AI: /api/ask with the text', calls.length === 1 && calls[0].p === '/api/ask' && calls[0].b.text === 'Why is the sky blue?', JSON.stringify(calls));
  t('the answer is shown above the box, bold works, nothing is left in the box', /scattering/.test(sheet().innerHTML) && /<b>scattering<\/b>/.test(sheet().innerHTML) && /Aaj ke free sawal bache: 13/.test(sheet().textContent) && ta().value === '' && !sheet().hidden);
  t('the chapter page sends its course and chapter so the AI knows the book', w.eval("(function(){NAV={page:'chapter',org:'seba',med:'Assamese',cls:10,sub:'Science',ch:2};return JSON.stringify(window.PROMPTBOX._t.context())})()") === '{"course":"c10-science-as","ch":2}');
  click(sheet().querySelector('[data-pbx=close]')); await tick();
  t('the answer sheet closes', sheet().hidden === true);

  type('solar system'); click(d.querySelector('.pbx-anime')); await tick();
  t('with Anime on, the match list is not shown', !d.querySelector('.pbx-pop'));
  click(d.querySelector('.pbx-send')); await tick(); await tick();
  t('Anime sends the prompt to /api/anime', calls[calls.length - 1].p === '/api/anime' && calls[calls.length - 1].b.text === 'solar system');
  t('the video shows in the sheet as an SVG scene, with play / restart and no JSON / HTML / SVG tabs', !!d.querySelector('#pbx-stage svg') && /Solar/.test(d.querySelector('#pbx-stage').innerHTML) && !!d.getElementById('pbx-vplay') && !/JSON|HTML tab/.test(sheet().textContent));
  t('text from the AI is escaped, never markup', !d.querySelector('#pbx-stage system') && /Solar &lt;system&gt;/.test(d.querySelector('#pbx-stage').innerHTML));
  t('an orbit item animates and appears with a fade', /animateMotion/.test(d.querySelector('#pbx-stage').innerHTML) && /<animate attributeName="opacity"/.test(d.querySelector('#pbx-stage').innerHTML));
  t('Anime stays on for the next prompt', d.querySelector('.pbx-anime').getAttribute('aria-pressed') === 'true');
  click(d.getElementById('pbx-vplay')); await tick();
  t('pause shows the play icon', /M7 4\.5l13 7\.5-13 7\.5z/.test(d.getElementById('pbx-vplay').innerHTML));
  click(d.getElementById('pbx-vplay')); await tick();
  click(sheet().querySelector('[data-pbx=close]'));

  // errors from the server (limits, refusals) are shown as they come
  click(d.querySelector('.pbx-anime')); await tick();
  w.api = async () => { const e = new Error('Aaj ki AI limit khatam. Kal aana.'); e.code = 'limit_reached'; throw e; };
  type('what is a mole'); key('Enter'); await tick(); await tick();
  t('a used-up limit shows the friendly message in the sheet', /Aaj ki AI limit khatam/.test(sheet().textContent) && !!sheet().querySelector('.pbx-err'));
  w.api = async () => ({ refuse: true, message: 'Sirf padhai ka sawal puchho.' });
  type('tell me a joke'); key('Enter'); await tick(); await tick();
  t('an off-topic question shows the refusal', /Sirf padhai/.test(sheet().textContent));

  // attachments
  const sent = [];
  w.api = async (p, b) => { sent.push({ p, b }); return { answer: 'Read it.', left: 12 }; };
  const fdoc = d.getElementById('pbx-fdoc');
  const pdf = new w.File([new w.Uint8Array(600).fill(65)], 'notes.pdf', { type: 'application/pdf' });
  Object.defineProperty(fdoc, 'files', { value: [pdf], configurable: true });
  fdoc.dispatchEvent(new w.Event('change', { bubbles: true })); await tick(80);
  t('a PDF shows as a chip above the box and can be removed', d.querySelectorAll('.pbx-chip').length === 1 && /notes\.pdf/.test(d.querySelector('.pbx-chip').textContent));
  t('send works with only an attachment (no text)', d.querySelector('.pbx-send').disabled === false);
  click(d.querySelector('.pbx-send')); await tick(); await tick();
  t('the PDF goes with the question as mime + base64, then the chip is cleared', sent.length === 1 && sent[0].b.files && sent[0].b.files[0].mime === 'application/pdf' && sent[0].b.files[0].data.length >= 400 && d.querySelectorAll('.pbx-chip').length === 0);
  const bad = new w.File(['x'], 'movie.mp4', { type: 'video/mp4' });
  Object.defineProperty(fdoc, 'files', { value: [bad], configurable: true });
  fdoc.dispatchEvent(new w.Event('change', { bubbles: true })); await tick(60);
  t('a file type that is not supported is refused with a message', /nahi chalegi/.test(sheet().textContent) && d.querySelectorAll('.pbx-chip').length === 0);
  const two = [1, 2, 3].map(i => new w.File([new w.Uint8Array(300).fill(66)], 'p' + i + '.pdf', { type: 'application/pdf' }));
  Object.defineProperty(fdoc, 'files', { value: two, configurable: true });
  fdoc.dispatchEvent(new w.Event('change', { bubbles: true })); await tick(80);
  t('at most 2 files per question', d.querySelectorAll('.pbx-chip').length === 2);
  click(d.querySelector('.pbx-chip button')); await tick();
  t('removing a chip works', d.querySelectorAll('.pbx-chip').length === 1);

  // the page itself is untouched
  const exp = ['draw', 'api', 'navTo'];
  t('the page\'s own functions and state are still there', exp.every(f => typeof w[f] === 'function') && w.eval('typeof DATA') === 'object');
  w.eval("NAV={page:'home'};VIEW='home';draw()"); await tick();
  t('the home page is drawn as before (heading, subjects)', /Science/.test(d.getElementById('app').textContent) && !d.getElementById('app').querySelector('.pbx'));

  console.log(pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('FAIL  crashed: ' + (e && e.stack || e)); console.log(pass + ' passed, ' + (fail + 1) + ' failed'); process.exit(1); });
