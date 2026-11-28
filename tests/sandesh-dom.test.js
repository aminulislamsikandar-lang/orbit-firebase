// Sandesh in a browser (jsdom): the child's screen is interrupted with a countdown, the Not Kid student can answer, the mentor's sheet sends, the Mentor page links a student.
// Needs jsdom (CI installs it). Run: node tests/sandesh-dom.test.js
let JSDOM; try { ({ JSDOM } = require('jsdom')); } catch (e) { console.log('SKIP jsdom is not installed'); process.exit(0); }
const fs = require('fs'), path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8').replace(/^\uFEFF/, '');
let pass = 0, fail = 0;
const t = (n, ok, extra) => { if (ok) pass++; else { fail++; console.log('FAIL  ' + n + (extra ? '  ' + extra : '')); } };
const tick = (ms = 30) => new Promise(r => setTimeout(r, ms));
const C = require('../public/sandesh-core.js');
const AUD = 'data:audio/webm;codecs=opus;base64,' + 'A'.repeat(120);

function phone(opts) {
  const dom = new JSDOM('<!doctype html><body><div id="app"></div></body>', { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://orbit.test/' });
  const w = dom.window, calls = { mark: [], send: [], rep: [], del: [], watch: [], create: [], drawn: 0, played: [] };
  w.eval('var USER = ' + JSON.stringify(opts.user || { uid: 'u1', name: 'Rina Das' }) + '; var COURSE_STATE = "set"; var COURSE = ' + JSON.stringify(opts.course || { org: 'x', cls: 7, med: 'en' }) + '; var KIDROLE = ' + JSON.stringify(opts.role || '') + '; var VIEW = "home";');
  w.draw = () => { calls.drawn++; };
  w.confirm = () => true;
  w.Audio = function (src) { this.src = src; this.paused = true; calls.played.push(src); this.play = () => { this.paused = false; return Promise.resolve(); }; this.pause = () => { this.paused = true; }; };
  const db = { msgs: opts.msgs || [], link: opts.link === undefined ? { code: 'ABCD2345', kidUid: 'u1', name: 'Rina' } : opts.link, mentors: opts.mentors || [] };
  w.CLOUD = { kids: {
    own: async () => db.link, mentors: async () => db.mentors,
    msgWatch: (code, cb) => { calls.watch.push(code); db.cb = cb; setTimeout(() => cb(db.msgs.slice()), 0); return () => { calls.unwatch = (calls.unwatch || 0) + 1; }; },
    msgMark: async (code, id, patch) => { calls.mark.push({ code, id, patch }); const m = db.msgs.find(x => x.id === id); if (m) Object.assign(m, patch); db.cb && db.cb(db.msgs.slice()); },
    msgSend: async (code, id, m) => { calls.send.push({ code, id, m }); },
    msgsMine: async () => calls.send.map(s => Object.assign({ id: s.id }, s.m)),
    msgDel: async (code, id) => { calls.del.push(id); }, repPut: async (code, mid, rid, rep) => { calls.rep.push({ mid, rep }); }, reps: async () => [],
    create: async (name, nk) => { calls.create.push({ name, nk }); db.link = { code: 'WXYZ6789', kidUid: 'u1', name, nk }; return db.link; },
    mentorApprove: async () => {}, mentorDrop: async () => {}, remove: async () => {}
  } };
  if (opts.kidCode) w.KIDLINK = { kidCode: () => opts.kidCode };
  w.eval(read('public/sandesh-core.js')); w.eval(read('public/sandesh.js'));
  return { w, d: w.document, calls, db };
}
const msg = (o) => Object.assign({ id: C.newId(Date.now()), from: 'm1', fromName: 'Biren', secs: 300, at: Date.now() }, o);
const q = (d, s) => d.querySelector(s);

(async () => {
  // ---- Not Kid student ----
  {
    const m = msg({ ins: 'Ye 5 sawaal hal karo', q: '2x + 3 = 9 ho to x kya hai?' });
    const p = phone({ msgs: [m] });
    p.w.SANDESH.setUser({ uid: 'u1' }); await tick(60); p.w.SANDESH._sync(); await tick(60);
    const o = q(p.d, '#sdOver');
    t('Not Kid: the message interrupts the screen', !!o && o.getAttribute('role') === 'dialog' && o.getAttribute('aria-modal') === 'true');
    t('Not Kid: shows the mentor name, the instruction and the question', /Biren ka sandesh/.test(o.textContent) && /Ye 5 sawaal hal karo/.test(o.textContent) && /2x \+ 3 = 9/.test(o.textContent));
    t('Not Kid: a countdown is shown (5:00 or just under)', /^[45]:\d\d$/.test(q(p.d, '#sdLeft').textContent));
    t('Not Kid: camera and voice icons are there', !!o.querySelector('button[aria-label="Copy ki photo bhejo"]') && !!o.querySelector('button[aria-label="Awaaz mein jawab do"]') && !!o.querySelector('input[type=file][accept="image/*"]'));
    t('the page is locked behind the message', p.d.body.classList.contains('sd-lock'));
    t('shownAt is written once, to the right message', p.calls.mark.length === 1 && p.calls.mark[0].id === m.id && p.calls.mark[0].patch.shownAt > 0 && p.calls.mark[0].code === 'ABCD2345');
    q(p.d, '.sd-ok').click(); await tick(120);
    t('"Ho gaya" closes it and writes doneAt', !q(p.d, '#sdOver') && p.calls.mark.some(x => x.patch.doneAt > 0) && !p.d.body.classList.contains('sd-lock'));
    p.w.SANDESH._sync(); await tick(40);
    t('a closed message does not come back', !q(p.d, '#sdOver'));
    // the reply is saved under the message (photo path needs a canvas, so test the writer through the voice reply failing safe: no mic in jsdom)
    p.w.close();
  }
  // ---- text from Firestore is never run as HTML ----
  {
    const m = msg({ ins: '<img src=x onerror="window.hacked=1">hello', q: '<script>window.hacked=2<\/script>', fromName: '<b>Evil</b>' });
    const p = phone({ msgs: [m] }); p.w.SANDESH.setUser({ uid: 'u1' }); await tick(60); p.w.SANDESH._sync(); await tick(60);
    const o = q(p.d, '#sdOver');
    t('XSS: markup in a message is shown as text only', !!o && !o.querySelector('img:not(.sd-th)') && !o.querySelector('script') && !o.querySelector('b') && !p.w.hacked && /<img src=x/.test(o.textContent));
    p.w.close();
  }
  // ---- countdown rules ----
  {
    const seen = msg({ ins: 'purana', shownAt: Date.now() - 400000 }), missed = msg({ id: C.newId(Date.now() - 3e6), ins: 'chhoot gaya', at: Date.now() - 3 * 3600000 }), run = msg({ id: C.newId(Date.now() + 1), ins: 'chal raha hai', at: Date.now() - 1000, shownAt: Date.now() - 100000 });
    const p = phone({ msgs: [seen, missed, run] }); p.w.SANDESH.setUser({ uid: 'u1' }); await tick(60); p.w.SANDESH._sync(); await tick(60);
    const o = q(p.d, '#sdOver');
    t('a finished and a missed message are not shown; the running one resumes where it was', !!o && /chal raha hai/.test(o.textContent) && !/purana|chhoot gaya/.test(o.textContent) && /^[1-3]:\d\d$/.test(q(p.d, '#sdLeft').textContent) && !p.calls.mark.some(x => x.patch.shownAt));
    p.w.close();
  }
  // ---- Kid mode child ----
  {
    const m = msg({ ins: 'Suno aur bolo', aud: AUD, secs: 120 });
    const p = phone({ role: 'kid', course: { kid: true }, kidCode: 'KIDC2345', link: null, msgs: [m] });
    p.w.SANDESH.setUser({ uid: 'u1' }); await tick(60); p.w.SANDESH._sync(); await tick(60);
    const o = q(p.d, '#sdOver');
    t('Kid: listens to the kid link code', p.calls.watch[0] === 'KIDC2345');
    t('Kid: big text, the voice starts by itself, no camera / voice reply icons', !!o && !!q(p.d, '.sd-kid') && p.calls.played[0] === AUD && !o.querySelector('.sd-act') && /Suno aur bolo/.test(o.textContent));
    t('Kid: a big Suno button replays the voice', !!o.querySelector('.sd-play'));
    t('Kid: 2 minutes countdown', /^[12]:\d\d$/.test(q(p.d, '#sdLeft').textContent));
    p.w.close();
  }
  // ---- parent / mentor phones get nothing ----
  {
    const p = phone({ role: 'mentor', course: { kid: true }, kidCode: 'KIDC2345', msgs: [msg({ ins: 'x' })] });
    p.w.SANDESH.setUser({ uid: 'u1' }); await tick(60); p.w.SANDESH._sync(); await tick(60);
    t('a mentor / parent phone never listens and never shows a message', !p.calls.watch.length && !q(p.d, '#sdOver'));
    p.w.close();
  }
  // ---- no link yet: nothing is watched ----
  {
    const p = phone({ link: null, msgs: [] }); p.w.SANDESH.setUser({ uid: 'u1' }); await tick(60); p.w.SANDESH._sync(); await tick(40);
    t('a student without a mentor listens to nothing', !p.calls.watch.length);
    p.w.close();
  }
  // ---- the mentor's sheet ----
  {
    const p = phone({ role: 'mentor', course: { kid: true }, msgs: [] });
    p.w.SANDESH.setUser({ uid: 'm1' });
    t('card button carries the code and name (escaped)', /data-sd="open" data-v="ABCD2345" data-nm="Ri&lt;na"/.test(p.w.SANDESH.cardHTML('ABCD2345', 'Ri<na')));
    p.w.SANDESH.open('ABCD2345', 'Rina'); await tick(40);
    const sh = q(p.d, '#sdSheet'), send = sh.querySelector('.sd-send');
    t('sheet opens with instruction, question, voice and time choices', !!sh && !!sh.querySelector('#sdIns') && !!sh.querySelector('#sdQ') && !!sh.querySelector('.sd-voice') && sh.querySelectorAll('.sd-chips .chip').length === 6);
    t('Bhejo is off until there is something to send', send.disabled === true);
    const ins = sh.querySelector('#sdIns'), qq = sh.querySelector('#sdQ');
    ins.value = 'Copy mein hal karo'; ins.dispatchEvent(new p.w.Event('input', { bubbles: true })); qq.value = 'Q1. 12 x 4'; qq.dispatchEvent(new p.w.Event('input', { bubbles: true }));
    sh.querySelectorAll('.sd-chips .chip')[3].click();   // 10 min
    t('typing enables Bhejo; the chosen time is marked', send.disabled === false && sh.querySelectorAll('.sd-chips .chip')[3].getAttribute('aria-pressed') === 'true' && sh.querySelectorAll('.sd-chips .chip')[2].getAttribute('aria-pressed') === 'false');
    send.click(); await tick(60);
    const s0 = p.calls.send[0];
    t('Bhejo writes one message with the right fields', p.calls.send.length === 1 && s0.code === 'ABCD2345' && C.okId(s0.id) && s0.m.ins === 'Copy mein hal karo' && s0.m.q === 'Q1. 12 x 4' && s0.m.secs === 600 && s0.m.from === 'm1' && s0.m.fromName === 'Rina' && !('aud' in s0.m));
    t('the form is cleared after sending and a toast says so', ins.value === '' && qq.value === '' && !!q(p.d, '#sdToast'));
    t('the sent message is listed with its state', /Copy mein hal karo/.test(sh.querySelector('#sdList').textContent) && /intezaar/.test(sh.querySelector('#sdList').textContent));
    send.click(); await tick(30);
    t('a second tap on an empty form sends nothing', p.calls.send.length === 1);
    sh.querySelector('.sd-ib').click(); await tick(30);
    t('the back button closes the sheet and unlocks the page', !q(p.d, '#sdSheet') && !p.d.body.classList.contains('sd-lock'));
    p.w.close();
  }
  // ---- the Mentor page of a Not Kid student ----
  {
    const p = phone({ link: null, mentors: [] }); p.w.SANDESH.setUser({ uid: 'u1' }); p.w.eval('VIEW = "mentor"');
    let h = p.w.SANDESH.viewHTML(); await tick(60); h = p.w.SANDESH.viewHTML();
    t('no code yet: explains and offers "Mentor code banao"', /Mentor code banao/.test(h) && /data-sd="mk"/.test(h));
    const b = p.d.createElement('button'); b.dataset.sd = 'mk'; p.d.body.appendChild(b); b.click(); await tick(80);
    t('creating the code marks the link as Not Kid (nk) with the first name', p.calls.create.length === 1 && p.calls.create[0].nk === true && p.calls.create[0].name === 'Rina');
    h = p.w.SANDESH.viewHTML();
    t('then the code is shown big', /WXYZ-6789/.test(h));
    p.w.SANDESH._state.pg.mentors = [{ uid: 'm9', name: 'Mi<b>', status: 'pending' }, { uid: 'm8', name: 'Anu', status: 'approved' }]; h = p.w.SANDESH.viewHTML();
    t('a pending request can be approved, names are escaped, an approved one can be removed', /data-sd="ok" data-u="m9"/.test(h) && /Mi&lt;b&gt;/.test(h) && /data-sd="no" data-u="m8"/.test(h) && p.w.SANDESH.badge() === 1);
    p.w.close();
  }
  // ---- a Not Kid student's link does not show fake "Offline" flags to the mentor ----
  {
    const p = phone({ role: 'mentor', course: { kid: true } });
    const kl = require('fs').readFileSync(path.join(__dirname, '..', 'public/kidlink.js'), 'utf8');
    t('mentor card: nk students get no online / target / week blocks', /nk \? '' : flagH \+ live/.test(kl) && /k\.status !== 'approved' \|\| k\.nk/.test(kl) && /nk: link\.nk === true/.test(kl));
    p.w.close();
  }
  console.log(pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
})();
