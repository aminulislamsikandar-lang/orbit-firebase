// Phase 7 page side: the Chapter quiz card (levels, playing, score, level suggestion) and the admin panel (AI draft -> edit -> pending/approved).
// Runs public/quiz.js in a fake browser (jsdom). Skipped without jsdom. Run: node tests/quiz-dom.test.js
const fs = require('fs'), path = require('path');
let JSDOM = null; try { ({ JSDOM } = require('jsdom')); } catch (e) {}
let pass = 0, fail = 0;
const t = (name, ok, extra) => { if (ok) pass++; else { fail++; console.log('FAIL  ' + name + (extra ? '  ' + extra : '')); } };
if (!JSDOM) { console.log('SKIP  jsdom not installed'); console.log('0 passed, 0 failed'); process.exit(0); }
const src = fs.readFileSync(path.join(__dirname, '..', 'public', 'quiz.js'), 'utf8');
const wait = () => new Promise(r => setTimeout(r, 10));
const item = (n, a) => ({ q: 'Question number ' + n + ' here?', o: ['one ' + n, 'two ' + n, 'three ' + n, 'four ' + n], a: a == null ? 0 : a, e: 'Reason ' + n });
const doc = (level, status, n) => ({ id: 'c7-science__1__' + level, course: 'c7-science', ch: 1, level, status, at: 1, items: Array.from({ length: n || 5 }, (_, i) => item(level[0] + i)) });
const C = { id: 'c7-science', class: 7 }, CH = { no: 1, title: 'Nutrition' };

function boot(o) {
  o = o || {};
  const dom = new JSDOM('<!doctype html><body><div id="app"></div></body>', { runScripts: 'outside-only', url: 'https://orbittutorial.web.app/', pretendToBeVisual: true });
  const w = dom.window, db = { docs: (o.docs || []).map(d => JSON.parse(JSON.stringify(d))), sets: [], dels: [], reads: [] };
  w.confirm = () => o.confirm !== false;
  w.orbitUser = () => (o.user === null ? null : { uid: 'u1', email: 'a@b.c' });
  w.QVideo = { active: () => !!o.admin };
  w.RECALL = { mastery: () => (o.mastery == null ? null : o.mastery) };
  w.api = async (p, body) => { db.reads.push({ p, body }); if (o.apiFail) throw new Error('AI band hai'); return { items: [{ ...item('g1', 2), ev: 'proof phrase one' }, { ...item('g2', 1), ev: 'proof phrase two' }, { ...item('g3', 3), ev: 'proof phrase three' }, { ...item('g4', 0), ev: 'proof phrase four' }, { ...item('g5', 2), ev: 'proof phrase five' }, { ...item('g6', 1), ev: 'proof phrase six' }], dropped: 1 }; };
  w.CLOUD = { quiz: {
    async approved(c, ch) { if (o.cloudFail) throw new Error('x'); return db.docs.filter(d => d.course === c && d.ch === ch && d.status === 'approved'); },
    async forChapter(c, ch) { return db.docs.filter(d => d.course === c && d.ch === ch); },
    async set(d) { if (o.setFail) { const e = new Error('no'); e.code = 'permission-denied'; throw e; } db.sets.push(d); const id = d.course + '__' + d.ch + '__' + d.level, i = db.docs.findIndex(x => x.id === id); const n = { id, ...JSON.parse(JSON.stringify(d)) }; if (i >= 0) db.docs[i] = n; else db.docs.push(n); },
    async del(id) { db.dels.push(id); db.docs = db.docs.filter(d => d.id !== id); } } };
  w.draw = () => { w.document.getElementById('app').innerHTML = w.QUIZ.chapterHTML(C, CH); };
  if (o.hist) w.localStorage.setItem('orbit.quiz.u1', JSON.stringify(o.hist));
  w.eval(src);
  const d = w.document, app = () => d.getElementById('app');
  const click = sel => { const b = typeof sel === 'string' ? app().querySelector(sel) : sel; if (!b) throw new Error('no ' + sel); b.click(); };
  return { w, d, db, app, click, text: () => app().textContent, html: () => app().innerHTML, hist: () => JSON.parse(w.localStorage.getItem('orbit.quiz.u1') || '{}') };
}

(async () => {
  // ---- level suggestion ----
  const b0 = boot(), Z = b0.w.QUIZ.suggest, all = ['easy', 'medium', 'hard'];
  t('no history, no Recall score: medium', Z([], null, all) === 'medium');
  t('Recall chapter score: under 50 easy, 50-79 medium, 80+ hard', Z([], 30, all) === 'easy' && Z([], 65, all) === 'medium' && Z([], 90, all) === 'hard');
  t('last quiz 80%+ goes one level up, under 50% one level down, otherwise stays', Z([{ l: 'easy', p: 90 }], 10, all) === 'medium' && Z([{ l: 'hard', p: 90 }], null, all) === 'hard' && Z([{ l: 'medium', p: 40 }], 99, all) === 'easy' && Z([{ l: 'easy', p: 20 }], null, all) === 'easy' && Z([{ l: 'medium', p: 60 }], null, all) === 'medium');
  t('the quiz history beats the Recall score', Z([{ l: 'medium', p: 85 }], 10, all) === 'hard');
  t('suggestion falls back to the nearest level that exists (easier on a tie)', Z([], 90, ['easy', 'medium']) === 'medium' && Z([], null, ['easy', 'hard']) === 'easy' && Z([], null, []) === '');

  // ---- item check ----
  const CI = b0.w.QUIZ.cleanItem;
  t('cleanItem accepts a good item and refuses broken ones', !!CI(item(1)) && !CI({ ...item(1), a: 4 }) && !CI({ ...item(1), o: ['a', 'a', 'b', 'c'] }) && !CI({ ...item(1), e: '' }) && !CI({ ...item(1), o: ['a', 'b', 'c'] }) && !CI(null) && !CI({ ...item(1), q: 'short' }));

  // ---- student ----
  let b = boot({ docs: [doc('easy', 'approved'), doc('medium', 'approved'), doc('hard', 'pending')] });
  b.w.draw(); await wait();
  t('first draw loads and then shows the card with only the approved levels', /Chapter quiz/.test(b.text()) && b.app().querySelectorAll('[data-qz=level]').length === 2 && !/Hard/.test(b.text()));
  t('students never see the admin panel', !/Quiz library/.test(b.text()) && !/AI se banao/.test(b.text()));
  t('level medium is suggested and said so', b.app().querySelector('[data-l=medium]').getAttribute('aria-pressed') === 'true' && /suggested level: Medium/.test(b.text()));
  b.click('[data-l=easy]');
  t('student can pick another level', b.app().querySelector('[data-l=easy]').getAttribute('aria-pressed') === 'true' && !/suggested level/.test(b.text()));
  b.click('[data-qz=start]');
  t('start shows question 1 of 5 with 4 options and no answer yet', /Sawaal 1 \/ 5/.test(b.text()) && b.app().querySelectorAll('[data-qz=pick]').length === 4 && !/Sahi jawab/.test(b.text()));
  const play = () => { const it = b.w.QUIZ._state.play.items[b.w.QUIZ._state.play.i]; return it; };
  let it = play(); b.click('[data-i="' + it.a + '"]');
  t('right answer: says Sahi, shows the reason, locks the options', /Sahi jawab!/.test(b.text()) && /\(Sahi\)/.test(b.text()) && /Reason/.test(b.text()) && [...b.app().querySelectorAll('[data-qz=pick]')].every(x => x.disabled));
  b.click('[data-qz=next]'); it = play(); b.click('[data-i="' + ((it.a + 1) % 4) + '"]');
  t('wrong answer: says Galat on the choice and names the right option', /\(Galat\)/.test(b.text()) && new RegExp('Sahi jawab: ' + String.fromCharCode(65 + it.a)).test(b.text()));
  b.click('[data-qz=next]'); it = play(); b.click('[data-i="' + it.a + '"]'); b.click('[data-qz=next]'); it = play(); b.click('[data-i="' + it.a + '"]');
  b.click('[data-qz=next]'); it = play(); b.click('[data-i="' + ((it.a + 1) % 4) + '"]');
  t('last question button says Result dekho', /Result dekho/.test(b.text()));
  b.click('[data-qz=next]');
  t('score 3 / 5 shown and saved with level and percent', /3\s*\/ 5/.test(b.text()) && b.hist()['c7-science|1'].length === 1 && b.hist()['c7-science|1'][0].l === 'easy' && b.hist()['c7-science|1'][0].p === 60);
  t('60% offers dobara only (no level up under 80)', !!b.app().querySelector('[data-qz=again]') && !/try karo/.test(b.text()));
  b.click('[data-qz=again]'); for (let i = 0; i < 5; i++) { it = play(); b.click('[data-i="' + it.a + '"]'); b.click('[data-qz=next]'); }
  t('100% offers the next level', /5\s*\/ 5/.test(b.text()) && /Medium try karo/.test(b.text()));
  b.click('[data-qz=level][data-l=medium]');
  t('level up button opens the medium level', b.app().querySelector('[data-l=medium]').getAttribute('aria-pressed') === 'true' && /Quiz shuru karo/.test(b.text()));

  b = boot({ docs: [doc('easy', 'approved'), doc('medium', 'approved')], hist: { 'c7-science|1': [{ l: 'medium', p: 90, at: 1 }] } });
  b.w.draw(); await wait();
  t('a student who scored 90% on medium is offered hard; none exists, so medium stays', b.app().querySelector('[data-l=medium]').getAttribute('aria-pressed') === 'true');
  b = boot({ docs: [doc('easy', 'approved'), doc('medium', 'approved'), doc('hard', 'approved')], mastery: 30 });
  b.w.draw(); await wait();
  t('first quiz on a chapter Recall found weak starts at easy', b.app().querySelector('[data-l=easy]').getAttribute('aria-pressed') === 'true');
  b = boot({ docs: [doc('easy', 'approved', 4)] });
  b.w.draw(); await wait();
  t('a quiz with fewer than 5 playable questions is not shown', b.html() === '');
  b = boot({ docs: [doc('easy', 'pending')] }); b.w.draw(); await wait();
  t('only pending quizzes: students see nothing', b.html() === '');
  b = boot({ docs: [doc('easy', 'approved')], user: null }); b.w.draw(); await wait();
  t('signed out: nothing, no cloud read', b.html() === '');
  b = boot({ cloudFail: true }); b.w.draw(); await wait();
  t('cloud read fails: page stays quiet and does not loop', b.html() === '' && b.w.QUIZ._state.err !== '');
  t('custom (own) courses get no quiz card', boot().w.QUIZ.chapterHTML({ id: 'x', custom: true }, { no: 1 }) === '');
  const evilDoc = doc('easy', 'approved'); evilDoc.items[0].q = '<img src=x onerror=alert(1)> question'; evilDoc.items[0].o[0] = '"><script>alert(1)</script>';
  b = boot({ docs: [evilDoc] }); b.w.draw(); await wait(); b.click('[data-qz=start]');
  for (let i = 0; i < 4; i++) { if (b.app().querySelector('img[src=x]') || b.app().querySelector('script')) break; b.click('[data-i="0"]'); b.click('[data-qz=next]'); }
  t('question and option text is escaped (no tag can come out of a quiz)', !b.app().querySelector('img[src=x]') && !b.app().querySelector('script'));

  // ---- admin ----
  b = boot({ admin: true, docs: [doc('easy', 'approved'), doc('hard', 'pending', 5)] });
  b.w.draw(); await wait();
  t('admin sees the quiz library with each level and its status', /Quiz library/.test(b.text()) && /Easy · 5 sawaal · Approved/.test(b.text()) && /Hard · 5 sawaal · Pending/.test(b.text()));
  const sel = (name, v) => { const e = b.app().querySelector('[data-qzs=' + name + ']'); e.value = v; e.dispatchEvent(new b.w.Event('change', { bubbles: true })); };
  sel('lvl', 'medium'); sel('n', '5'); b.click('[data-qz=gen]'); await wait(); await wait();
  t('generate sends course, chapter, level and count', b.db.reads.length === 1 && b.db.reads[0].p === '/api/quiz/generate' && b.db.reads[0].body.level === 'medium' && b.db.reads[0].body.ch === 1 && b.db.reads[0].body.course === 'c7-science' && b.db.reads[0].body.n === 5);
  t('draft shows 6 editable questions, the proof from the notes and what was dropped', b.app().querySelectorAll('textarea[data-qzf]').length === 6 && /proof phrase one/.test(b.text()) && /1 sawaal notes se match nahi hue/.test(b.text()));
  const typ = (f, v) => { const e = b.app().querySelector('[data-qzf="' + f + '"]'); e.value = v; e.dispatchEvent(new b.w.Event('input', { bubbles: true })); };
  typ('q:0', 'Edited question text here?'); typ('o:0:3', 'edited option four');
  const rad = b.app().querySelector('[data-qzc="0"][value="1"]'); rad.checked = true; rad.dispatchEvent(new b.w.Event('change', { bubbles: true }));
  b.click('[data-qz=drm][data-i="5"]'); b.click('[data-qz=drm][data-i="4"]');
  t('removing two questions leaves 4 and keeps the edits', b.app().querySelectorAll('textarea[data-qzf]').length === 4 && b.app().querySelector('[data-qzf="q:0"]').value === 'Edited question text here?');
  b.click('[data-qz=dsave][data-st=approved]'); await wait();
  t('4 questions is too few: nothing saved, clear message', b.db.sets.length === 0 && /Kam se kam 5 sawaal/.test(b.text()));
  b.click('[data-qz=gen]'); await wait(); await wait();
  typ('q:0', 'Edited question text here?'); typ('o:0:3', 'edited option four');
  const rad2 = b.app().querySelector('[data-qzc="0"][value="1"]'); rad2.checked = true; rad2.dispatchEvent(new b.w.Event('change', { bubbles: true }));
  b.click('[data-qz=drm][data-i="5"]');
  typ('e:1', '');
  b.click('[data-qz=dsave][data-st=pending]'); await wait();
  t('a question with an empty reason is refused and says which one', b.db.sets.length === 0 && /Sawaal 2 theek nahi/.test(b.text()));
  typ('e:1', 'Fixed reason');
  b.click('[data-qz=dsave][data-st=pending]'); await wait(); await wait();
  const s0 = b.db.sets[0];
  t('Pending save writes the edited quiz without the proof text', b.db.sets.length === 1 && s0.status === 'pending' && s0.level === 'medium' && s0.course === 'c7-science' && s0.ch === 1 && s0.items.length === 5 && s0.items[0].q === 'Edited question text here?' && s0.items[0].o[3] === 'edited option four' && s0.items[0].a === 1 && s0.items.every(x => Object.keys(x).sort().join() === 'a,e,o,q'));
  t('after saving the draft is gone and the list shows Medium as Pending', !b.app().querySelector('textarea') && /Medium · 5 sawaal · Pending/.test(b.text()));
  const medBtn = [...b.app().querySelectorAll('[data-qz=dtog]')].find(x => x.dataset.id === 'c7-science__1__medium'); medBtn.click(); await wait(); await wait();
  t('Approve flips pending to approved', b.db.sets[1].status === 'approved' && /Medium · 5 sawaal · Approved/.test(b.text()));
  const hardBtn = [...b.app().querySelectorAll('[data-qz=dtog]')].find(x => x.dataset.id === 'c7-science__1__easy'); hardBtn.click(); await wait(); await wait();
  t('an approved quiz can be taken back to pending', b.db.sets[2].status === 'pending' && /Easy · 5 sawaal · Pending/.test(b.text()));
  [...b.app().querySelectorAll('[data-qz=ddel]')].find(x => x.dataset.id === 'c7-science__1__hard').click(); await wait(); await wait();
  t('delete removes it', b.db.dels.join() === 'c7-science__1__hard' && !/Hard ·/.test(b.text()));
  [...b.app().querySelectorAll('[data-qz=dedit]')].find(x => x.dataset.id === 'c7-science__1__easy').click();
  t('Edit opens the saved questions in the editor', b.app().querySelectorAll('textarea[data-qzf]').length === 5);
  b = boot({ admin: true, docs: [doc('easy', 'approved')], confirm: false }); b.w.draw(); await wait();
  b.click('[data-qz=dedit]'); b.click('[data-qz=dsave][data-st=pending]'); await wait();
  t('confirm "no" when replacing an approved quiz with a pending one: nothing is written', b.db.sets.length === 0 && /textarea/.test(b.html()));
  b = boot({ admin: true, apiFail: true }); b.w.draw(); await wait(); b.click('[data-qz=gen]'); await wait(); await wait();
  t('AI error is shown and the button works again', /AI band hai/.test(b.text()) && !b.app().querySelector('[data-qz=gen]').disabled);
  b = boot({ admin: true, setFail: true }); b.w.draw(); await wait(); b.click('[data-qz=gen]'); await wait(); await wait(); b.click('[data-qz=dsave][data-st=approved]'); await wait(); await wait();
  t('Firestore refusing the save gives a clear admin message and keeps the draft', /admin account ya firestore.rules/.test(b.text()) && !!b.app().querySelector('textarea'));
  const ev = boot({ admin: true }); ev.w.draw(); await wait();
  t('the panel only appears in admin mode', !/Quiz library/.test(boot().html()) );

  // ---- wiring ----
  const H = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');
  t('index.html loads quiz.js and puts the card between the videos and the question list', /<script src="\/quiz\.js"><\/script>/.test(H) && /videosHTML\(c,ch\)\+\(window\.QUIZ\?QUIZ\.chapterHTML\(c,ch\):''\)\+listHTML/.test(H));
  t('quiz.js never assigns innerHTML', !/\.innerHTML\s*=/.test(src) && !/insertAdjacentHTML|eval\(|document\.write/.test(src));

  console.log(pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})();
