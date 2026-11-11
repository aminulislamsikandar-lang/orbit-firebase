/* Tests for the admin panel (public/narration-admin.js) and the student loader (public/narration-loader.js).
 * Run: node tests/narration-admin-loader.test.js     (needs jsdom, dev only: npm i -D jsdom; skipped if missing)
 * The server, Firestore and audio are STUBS: this proves our page logic (what is sent, what is saved, when "ready" is set, how failures behave),
 * not the live Sonex / Backblaze / Firebase services.
 */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
let JSDOM;
try { JSDOM = require('jsdom').JSDOM; } catch (e) { try { JSDOM = require('/tmp/jsd/node_modules/jsdom').JSDOM; } catch (e2) { console.log('SKIP  jsdom not installed (npm i -D jsdom)'); process.exit(0); } }

let pass = 0, fail = 0;
function t(name, ok, extra) { if (ok) { pass++; console.log('PASS  ' + name); } else { fail++; console.log('FAIL  ' + name + (extra ? '  -> ' + extra : '')); } }
const sleep = ms => new Promise(r => setTimeout(r, ms));
const code = f => fs.readFileSync(path.join(ROOT, 'public', f), 'utf8');

const VOICES = [{ id: 'i43sm02kv3', name: 'Dipannita', languages: ['as'], gender: 'female' }, { id: 'voice_en_1', name: 'Diya', languages: ['en', 'hi'] }, { id: 'mystery1', name: 'Mystery', languages: null }];
const PLAN = { title: { en: 'T' }, steps: [
  { cap: { en: 'a' }, say: { en: 'The car is blue.', as: 'এক' }, anim: { lines: ['The car is blue'], cues: [{ point: { line: 0, word: 'car' } }] } },
  { cap: { en: 'b' }, say: { en: 'The bird sits.', as: 'দুই' }, anim: { lines: ['The bird'] } } ] };

function setup(opts) {
  opts = opts || {};
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/', runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window, calls = [], store = { docs: {}, sets: [], getErr: null };
  w.confirm = () => true;
  w.ORBIT_API = 'https://api.test';
  w.CLOUD = { token: async () => 'tok', narration: {
    get: async id => { if (store.getErr) throw new Error(store.getErr); return store.docs[id] || null; },
    set: async (id, d) => { if (opts.setFails) throw new Error('rules said no'); store.sets.push({ id, d: JSON.parse(JSON.stringify(d)) }); store.docs[id] = JSON.parse(JSON.stringify(d)); } } };
  const handlers = Object.assign({
    'GET /api/narration/voices': () => ({ voices: VOICES, defaultVoiceId: 'voice_en_1' }),
    'POST /api/narration/generate': b => ({ status: 'ready', segments: b.segments.map(s => ({ index: s.index, status: 'ready', audioKey: 'audio/generated/lesson-one/' + b.language + '/step-0' + (s.index + 1) + '-aaaabbbbcccc.mp3', contentHash: 'h' + s.index, bytes: 5000, cached: false })) }),
    'POST /api/narration/url': b => ({ urls: Object.fromEntries(b.keys.map(k => [k, 'https://signed.test/' + k + '?sig=1'])), expiresIn: 3600 })
  }, opts.handlers || {});
  w.fetch = async (url, init) => {
    const p = url.replace('https://api.test', ''), key = (init && init.method || 'GET') + ' ' + p, body = init && init.body ? JSON.parse(init.body) : null;
    calls.push({ key, body });
    const h = handlers[key]; if (!h) return { ok: false, status: 404, json: async () => ({ error: 'no route ' + key }) };
    const r = await h(body);
    if (r && r.__status) return { ok: false, status: r.__status, json: async () => ({ error: r.error }) };
    return { ok: true, status: 200, json: async () => r };
  };
  class FakeAudio { constructor() { this.L = {}; this.attrs = {}; this.paused = true; this.ended = false; this._t = 0; this.duration = NaN; this.plays = 0; FakeAudio.all.push(this); }
    addEventListener(n, f) { (this.L[n] = this.L[n] || []).push(f); } fire(n) { (this.L[n] || []).forEach(f => f()); }
    setAttribute(k, v) { this.attrs[k] = v; } getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; } removeAttribute(k) { delete this.attrs[k]; }
    set src(v) { this.attrs.src = v; Promise.resolve().then(() => { this.duration = 7.25; this.fire('loadedmetadata'); }); } get src() { return this.attrs.src || ''; }
    get currentTime() { return this._t; } set currentTime(v) { this._t = v; }
    play() { this.plays++; this.paused = false; this.fire('play'); this.fire('playing'); return Promise.resolve(); } pause() { this.paused = true; this.fire('pause'); } load() {} }
  FakeAudio.all = []; w.Audio = FakeAudio;
  w.speechSynthesis = { getVoices: () => [], speak: u => { (w._spoken = w._spoken || []).push(u); }, cancel() {}, addEventListener() {}, removeEventListener() {} };
  w.SpeechSynthesisUtterance = function (x) { this.text = x; };
  w.eval(code('narration-sync.js')); w.eval(code('narration-sprites.js')); w.eval(code('mathvideo-player.js')); w.eval(code('narration-loader.js')); w.eval(code('narration-admin.js'));
  return { w, calls, store, FakeAudio };
}
const btn = (w, label, root) => Array.from((root || w.document).querySelectorAll('button')).filter(b => b.textContent === label)[0];
const text = w => w.document.body.textContent;

(async () => {
  // ================= ADMIN =================
  function mountAdmin(s, over) {
    const box = s.w.document.createElement('div'); s.w.document.body.appendChild(box);
    let previewed = null;
    const api = s.w.NarrationAdmin.mount(box, Object.assign({ getCode: () => 'lesson-one', getPlan: () => PLAN, store: s.w.CLOUD.narration, preview: (p, o) => { previewed = { p, o }; } }, over || {}));
    return { box, api, previewed: () => previewed };
  }
  const setLang = (a, l) => { const sel = a.box.querySelectorAll('select')[0]; sel.value = l; sel.onchange(); };

  { const s = setup(); const a = mountAdmin(s); await sleep(10);
    t('admin panel loads the Sonex voices', s.calls.some(c => c.key === 'GET /api/narration/voices') && /Diya/.test(a.box.textContent));
    t('voices that do not support the language are not offered (English: no Dipannita)', !/Dipannita/.test(a.box.textContent));
    t('voice with unknown languages is offered but marked', /Mystery.*nahi batayi/.test(a.box.textContent));
    setLang(a, 'as');
    t('Assamese offers Dipannita and not the English voice', /Dipannita/.test(a.box.textContent) && !/Diya/.test(a.box.textContent));
    t('default voice from the server is preselected for English', (setLang(a, 'en'), a.box.querySelectorAll('select')[1].value === 'voice_en_1')); }

  { const s = setup(); const a = mountAdmin(s); await sleep(10); setLang(a, 'as');
    btn(s.w, 'Generate narration', a.box).click(); await sleep(60);
    const gen = s.calls.filter(c => c.key === 'POST /api/narration/generate')[0];
    t('generate sends lesson, language, voice, speed and each step text', gen && gen.body.lessonId === 'lesson-one' && gen.body.language === 'as' && gen.body.voiceId === 'i43sm02kv3' && gen.body.speed === 1 && gen.body.force === false && gen.body.segments.length === 2 && gen.body.segments[0].text === 'এক');
    const saved = s.store.sets[s.store.sets.length - 1];
    t('after success the metadata is saved with status ready', saved && saved.d.status === 'ready' && saved.d.provider === 'sonex' && saved.d.tracks.as.status === 'ready' && saved.d.tracks.as.voiceName === 'Dipannita');
    t('saved segments carry audio key, hash, text and measured duration (keys only, no audio)', saved.d.tracks.as.segments.every(g => /^audio\/generated\//.test(g.audioKey) && g.contentHash && g.text && g.duration === 7.25) && !JSON.stringify(saved.d).includes('base64'));
    t('success message shown', /ready aur save ho gayi/.test(text(s.w)));
    t('the API key is never in anything the page sends', !JSON.stringify(s.calls).toLowerCase().includes('sonex_api_key')); }

  { const s = setup({ handlers: { 'POST /api/narration/generate': b => ({ status: 'failed', segments: [{ index: 0, status: 'ready', audioKey: 'audio/generated/lesson-one/en/step-01-aaaabbbbcccc.mp3', contentHash: 'h', bytes: 5000 }, { index: 1, status: 'failed', code: 'UPLOAD_FAILED', error: 'Upload nahi ho payi.' }] }) } });
    const a = mountAdmin(s); await sleep(10); btn(s.w, 'Generate narration', a.box).click(); await sleep(60);
    const saved = s.store.sets[s.store.sets.length - 1];
    t('one segment failed -> track and lesson are NOT ready', saved.d.status === 'failed' && saved.d.tracks.en.status === 'failed' && saved.d.tracks.en.segments[1].status === 'failed' && !saved.d.tracks.en.segments[1].audioKey);
    t('admin sees which segment failed and why', /Upload nahi ho payi/.test(text(s.w)) && /ready nahi/.test(text(s.w))); }

  { const s = setup({ handlers: { 'POST /api/narration/generate': () => ({ __status: 400, error: 'Ye voice (x) Sonex account mein nahi mili.' }) } });
    const a = mountAdmin(s); await sleep(10); btn(s.w, 'Generate narration', a.box).click(); await sleep(40);
    t('server refusal (e.g. missing voice) shown clearly and nothing is saved', /nahi mili/.test(text(s.w)) && s.store.sets.length === 0); }

  { const s = setup(); const a = mountAdmin(s); await sleep(10);
    btn(s.w, 'Regenerate', a.box).click(); await sleep(60);
    t('Regenerate asks the server for a new take (force)', s.calls.filter(c => c.key === 'POST /api/narration/generate')[0].body.force === true); }

  { const s = setup(); const a = mountAdmin(s, { getPlan: () => null }); await sleep(10);
    btn(s.w, 'Generate narration', a.box).click(); await sleep(20);
    t('no valid plan loaded -> clear message, no server call', /valid plan/.test(text(s.w)) && !s.calls.some(c => c.key === 'POST /api/narration/generate')); }

  { const s = setup(); let plan = PLAN; const a = mountAdmin(s, { getPlan: () => plan }); await sleep(10);
    btn(s.w, 'Generate narration', a.box).click(); await sleep(60);
    plan = JSON.parse(JSON.stringify(PLAN)); plan.steps[0].say.en = 'The car is red now.'; a.api._render();
    t('changed plan text is flagged as stale', /plan ka text badal gaya/.test(text(s.w))); }

  { const s = setup(); const a = mountAdmin(s); await sleep(10);
    btn(s.w, 'Generate narration', a.box).click(); await sleep(60);
    const doc = a.api._state.doc;
    doc.steps.push({ index: 0, scene: [{ id: 'car', sprite: 'car', x: 20, y: 250 }] });
    doc.tracks.en.segments[0].events = [{ start: 2.4, end: 5.5, target: 'car', action: 'enter' }, { start: 1, cue: 0 }];
    s.store.sets.length = 0; await a.api._save(false);
    t('valid timings + pictures are saved with the lesson', s.store.sets.length === 1 && s.store.sets[0].d.steps[0].scene[0].id === 'car' && s.store.sets[0].d.tracks.en.segments[0].events.length === 2);
    doc.tracks.en.segments[0].events.push({ start: 3, target: 'ghost', action: 'enter' });
    s.store.sets.length = 0; await a.api._save(false);
    t('event pointing to a picture that does not exist blocks the save with a clear error', s.store.sets.length === 0 && /ghost/.test(text(s.w)));
    doc.tracks.en.segments[0].events.pop(); doc.steps[0].scene.push({ id: 'Bad Id', sprite: 'car', x: 1, y: 1 });
    s.store.sets.length = 0; await a.api._save(false);
    t('bad picture id / position blocks the save', s.store.sets.length === 0 && /id chhota/.test(text(s.w)));
    doc.steps[0].scene.pop(); doc.steps[0].scene[0].x = 9999;
    await a.api._save(false); t('picture outside the board blocks the save', s.store.sets.length === 0 && /x 0-600/.test(text(s.w))); }

  { const s = setup({ setFails: true }); const a = mountAdmin(s); await sleep(10);
    btn(s.w, 'Generate narration', a.box).click(); await sleep(60);
    t('Firestore refusing the write is reported, not hidden', /Save fail: rules said no/.test(text(s.w)) && !/ready aur save ho gayi/.test(text(s.w))); }

  { const s = setup(); const a = mountAdmin(s); await sleep(10);
    btn(s.w, 'Generate narration', a.box).click(); await sleep(60); s.calls.length = 0;
    await a.api._preview(); await sleep(40);
    const pv = a.previewed();
    t('Preview signs the audio and opens the real player with narration data', pv && pv.o.narration.lang.en.segments.length === 2 && /^https:\/\/signed\.test\//.test(pv.o.narration.lang.en.segments[0].url) && typeof pv.o.refreshUrl === 'function');
    const u = await pv.o.refreshUrl({ key: 'audio/generated/lesson-one/en/step-01-aaaabbbbcccc.mp3' });
    t('refreshUrl gives a fresh signed link', /signed\.test/.test(u)); }

  { const s = setup(); const a = mountAdmin(s); await sleep(10);
    await a.api._preview(); t('preview before any narration exists -> clear message', /Pehle narration banao/.test(text(s.w))); }

  { const s = setup(); s.store.docs['lesson-one'] = { lessonId: 'lesson-one', provider: 'sonex', status: 'ready', steps: [], tracks: { en: { voiceId: 'voice_en_1', voiceName: 'Diya', speed: 1, status: 'ready', segments: [{ index: 0, text: 'The car is blue.', status: 'ready', audioKey: 'audio/generated/lesson-one/en/step-01-aaaabbbbcccc.mp3', duration: 4, events: [] }] } } };
    const a = mountAdmin(s); await sleep(10); btn(s.w, 'Saved load karo', a.box).click(); await sleep(30);
    t('Load saved shows the stored status and segments', /Status: ready \(Diya\)/.test(text(s.w)) && /Step 1 - ready, 4s/.test(text(s.w))); }

  // ================= LOADER =================
  const lessonDoc = () => ({ lessonId: 'lesson-one', provider: 'sonex', status: 'ready', steps: [{ index: 0, scene: [{ id: 'car', sprite: 'car', x: 20, y: 250 }] }], tracks: {
    as: { voiceId: 'i43sm02kv3', voiceName: 'Dipannita', status: 'ready', segments: [{ index: 0, status: 'ready', audioKey: 'audio/generated/lesson-one/as/step-01-aaaabbbbcccc.mp3', duration: 5, events: [] }, { index: 1, status: 'ready', audioKey: 'audio/generated/lesson-one/as/step-02-ddddeeeeffff.mp3', duration: 5, events: [] }] },
    en: { voiceId: 'voice_en_1', voiceName: 'Diya', status: 'ready', segments: [{ index: 0, status: 'ready', audioKey: 'audio/generated/lesson-one/en/step-01-111122223333.mp3', events: [] }] },
    hi: { voiceId: 'x', status: 'failed', segments: [{ index: 0, status: 'failed' }] } } });
  function spyPlayer(s) { const opened = []; const real = s.w.MathVideoPlayer.open; s.w.MathVideoPlayer.open = (p, o) => { opened.push({ p, o }); }; return { opened, real }; }

  { const s = setup(); const sp = spyPlayer(s);
    s.w.NarrationLoader.open(PLAN, 'lesson-one'); await sleep(30);
    t('lesson without narration doc: player opens at once, exactly as before, no server call', sp.opened.length === 1 && sp.opened[0].o === undefined && s.calls.length === 0); }
  { const s = setup(); const sp = spyPlayer(s); s.store.docs['lesson-one'] = lessonDoc(); s.w.localStorage.setItem('mvLang', 'as');
    s.w.NarrationLoader.open(PLAN, 'lesson-one'); await sleep(60);
    const o = sp.opened[0] && sp.opened[0].o;
    t('narration lesson: signs audio then opens the player with it', o && o.narration && o.narration.lang.as.segments.every(g => /^https:\/\/signed\.test\//.test(g.url)));
    t('only ready tracks are used (failed Hindi track ignored)', o.narration.lang.as && o.narration.lang.en && !o.narration.lang.hi);
    t('selected language is signed first', s.calls.filter(c => c.key === 'POST /api/narration/url')[0].body.keys[0].includes('/as/'));
    t('every sign request names the lesson (server re-checks login + subscription)', s.calls.filter(c => c.key === 'POST /api/narration/url').every(c => c.body.lessonId === 'lesson-one'));
    t('step pictures reach the player', o.narration.steps[0].scene[0].id === 'car');
    t('a refreshUrl hook is supplied for expired links', typeof o.refreshUrl === 'function'); }
  { const s = setup({ handlers: { 'POST /api/narration/url': () => ({ __status: 403, error: 'Ye narration sunne ke liye subscription chahiye.' }) } }); const sp = spyPlayer(s); s.store.docs['lesson-one'] = lessonDoc();
    s.w.NarrationLoader.open(PLAN, 'lesson-one'); await sleep(60);
    t('student without access: lesson still opens, audio stays unavailable (browser voice used), reason kept', sp.opened.length === 1 && sp.opened[0].o.narration.lang.as.segments.every(g => g.url === null) && /subscription/.test(s.w.NarrationLoader.state.lastError)); }
  { const s = setup(); const sp = spyPlayer(s); s.store.docs['lesson-one'] = { tracks: { en: { status: 'failed', segments: [] } } };
    s.w.NarrationLoader.open(PLAN, 'lesson-one'); await sleep(30);
    t('only failed tracks: plain player, no server call', sp.opened[0].o === undefined && s.calls.length === 0); }
  { const s = setup(); const sp = spyPlayer(s); s.store.getErr = 'offline';
    s.w.NarrationLoader.open(PLAN, 'lesson-one'); await sleep(30);
    t('Firestore error: lesson still opens', sp.opened.length === 1 && sp.opened[0].o === undefined); }
  { const s = setup(); const sp = spyPlayer(s);
    s.w.NarrationLoader.open(PLAN, '../bad'); s.w.NarrationLoader.open(PLAN, ''); await sleep(20);
    t('invalid lesson id: plain player, no lookups', sp.opened.length === 2 && s.calls.length === 0); }
  { let release; const gate = new Promise(r => { release = r; });
    const s = setup({ handlers: { 'POST /api/narration/url': async b => { await gate; return { urls: Object.fromEntries(b.keys.map(k => [k, 'https://signed.test/' + k])) }; } } });
    const sp = spyPlayer(s); s.store.docs['lesson-one'] = lessonDoc(); const t0 = Date.now();
    s.w.NarrationLoader.open(PLAN, 'lesson-one'); await sleep(1700);
    t('slow server (Render waking up): player opens after ~1.5s anyway', sp.opened.length === 1 && Date.now() - t0 < 2500);
    const seg = sp.opened[0].o.narration.lang.en.segments[0]; const before = seg.url;
    release(); await sleep(40);
    t('links arriving later fill the live narration object', before === null && /^https:\/\/signed\.test\//.test(seg.url)); }

  // ---- loader + real player together ----
  { const s = setup(); s.store.docs['lesson-one'] = lessonDoc(); s.w.localStorage.setItem('mvLang', 'as');
    s.w.NarrationLoader.open(PLAN, 'lesson-one'); await sleep(80);
    btn(s.w, 'Play').click(); await sleep(10);
    const au = s.FakeAudio.all.filter(a => a.getAttribute('src'))[0];
    t('end to end: Play streams the signed MP3, browser voice stays silent', au && /signed\.test\/audio\/generated\/lesson-one\/as\/step-01/.test(au.getAttribute('src')) && !(s.w._spoken && s.w._spoken.length));
    s.w.MathVideoPlayer.close(); }
  { const s = setup(); s.store.docs['lesson-one'] = lessonDoc(); s.w.localStorage.setItem('mvLang', 'hi');
    s.w.NarrationLoader.open(PLAN, 'lesson-one'); await sleep(80);
    btn(s.w, 'Play').click(); await sleep(10);
    t('language with no narration track still uses the browser voice', s.w._spoken && s.w._spoken.length >= 1 && !s.FakeAudio.all.some(a => a.getAttribute('src')));
    s.w.MathVideoPlayer.close(); }

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('TEST CRASH', e); process.exit(2); });
