/* Tests for MP4 voiceover: public/voiceover.js (student side) and public/voiceover-admin.js (admin side).
 * Run: node tests/voiceover.test.js        (the controller / admin parts need jsdom, dev only: npm i -D jsdom; skipped if missing)
 * The video, the audio element, the server and Firestore are SIMULATED. This proves our sync / mute / failure logic,
 * not how it feels with a real phone, real MP3s and the real services.
 */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const VO = require(path.join(ROOT, 'public/voiceover.js'));

let pass = 0, fail = 0;
function t(name, ok, extra) { if (ok) { pass++; console.log('PASS  ' + name); } else { fail++; console.log('FAIL  ' + name + (extra ? '  -> ' + extra : '')); } }
const sleep = ms => new Promise(r => setTimeout(r, ms));
const code = f => fs.readFileSync(path.join(ROOT, 'public', f), 'utf8');

// ---------- pure logic ----------
{ const segs = [{ offset: 0, duration: 5 }, { offset: 10, duration: 4 }, { offset: 12, duration: 3 }];
  t('pick: inside a segment', VO.pick(segs, 2) === segs[0] && VO.pick(segs, 10) === segs[1]);
  t('pick: gap between segments -> none (silence, no overlap)', VO.pick(segs, 5) === null && VO.pick(segs, 7.5) === null);
  t('pick: a segment is cut where the next one starts', VO.pick(segs, 11.9) === segs[1] && VO.pick(segs, 12) === segs[2]);
  t('pick: after the last segment -> none', VO.pick(segs, 15) === null && VO.pick(segs, 99) === null);
  t('nextBoundary: next start or end after t', VO.nextBoundary(segs, 0) === 5 && VO.nextBoundary(segs, 5) === 10 && VO.nextBoundary(segs, 10.5) === 12 && VO.nextBoundary(segs, 15) === null);
  const unk = [{ offset: 2, duration: 0 }, { offset: 8, duration: 0 }];
  t('unknown duration: runs until the next segment starts', VO.pick(unk, 5) === unk[0] && VO.pick(unk, 9) === unk[1]); }
{ const doc = { tracks: {
    en: { status: 'ready', voiceName: 'Diya', segments: [{ index: 1, status: 'ready', audioKey: 'audio/generated/a/b.mp3', offset: 10, duration: 3 }, { index: 0, status: 'ready', audioKey: 'audio/generated/a/c.mp3', offset: 1, duration: 3 }, { index: 2, status: 'failed', audioKey: 'x', offset: 20 }, { index: 3, status: 'ready', audioKey: 'audio/generated/a/d.mp3' }] },
    hi: { status: 'failed', segments: [{ status: 'ready', audioKey: 'k', offset: 0 }] },
    as: { status: 'ready', segments: [{ index: 0, status: 'ready', audioKey: 'audio/generated/a/e.mp3' }] } } };
  const s = VO.shape(doc);
  t('shape keeps only ready tracks with offsets, sorted by offset', Object.keys(s).join() === 'en' && s.en.segments.map(x => x.offset).join() === '1,10');
  t('plan-lesson narration (no offsets) is ignored by the voiceover', !VO.shape({ tracks: { as: { status: 'ready', segments: [{ index: 0, status: 'ready', audioKey: 'k' }] } } }).as);
  t('shape of nothing is empty', Object.keys(VO.shape(null)).length === 0);
  t('chooseLang prefers the saved language, else a sensible default', VO.chooseLang({ en: 1, hi: 1 }, 'hi') === 'hi' && VO.chooseLang({ en: 1, hi: 1 }, 'bn') === 'en' && VO.chooseLang({}, 'en') === null); }

let JSDOM;
try { JSDOM = require('jsdom').JSDOM; } catch (e) { try { JSDOM = require('/tmp/jsd/node_modules/jsdom').JSDOM; } catch (e2) { JSDOM = null; } }
if (!JSDOM) { console.log('SKIP  jsdom not installed: controller/admin tests not run'); console.log('\n' + pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0); }

const KEY0 = 'audio/generated/c7-maths/chapter-3/v-intro-abc/en/step-01-aaaabbbbcccc.mp3', KEY1 = 'audio/generated/c7-maths/chapter-3/v-intro-abc/en/step-02-ddddeeeeffff.mp3';
const mkDoc = extra => Object.assign({ lessonId: 'v-intro-abc', provider: 'sonex', status: 'ready', steps: [], tracks: { en: { voiceId: 'v1', voiceName: 'Diya', speed: 1, status: 'ready', segments: [
  { index: 0, status: 'ready', audioKey: KEY0, offset: 0, duration: 5, text: 'one' }, { index: 1, status: 'ready', audioKey: KEY1, offset: 10, duration: 4, text: 'two' }] } } }, extra || {});

function setup(opts) {
  opts = opts || {};
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/', runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window, calls = [], store = { docs: {}, sets: [], dels: [] }; let urlCounter = 0;
  w.confirm = () => true; w.ORBIT_API = 'https://api.test';
  w.CLOUD = { token: async () => 'tok', narration: {
    get: async id => store.docs[id] || null,
    set: async (id, d) => { store.sets.push({ id, d: JSON.parse(JSON.stringify(d))}); store.docs[id] = JSON.parse(JSON.stringify(d)); },
    del: async id => { store.dels.push(id); delete store.docs[id]; } } };
  const handlers = Object.assign({
    'GET /api/narration/voices': () => ({ voices: [{ id: 'i43sm02kv3', name: 'Dipannita', languages: ['as'] }, { id: 'v1', name: 'Diya', languages: ['en', 'hi'] }], defaultVoiceId: 'v1' }),
    'POST /api/narration/url': b => ({ urls: Object.fromEntries(b.keys.map(k => [k, 'https://signed.test/' + k + '?n=' + (++urlCounter)])) }),
    'POST /api/narration/generate': b => ({ status: 'ready', segments: b.segments.map(s => ({ index: s.index, status: 'ready', audioKey: 'audio/generated/' + b.folder + '/v-intro-abc/' + b.language + '/step-0' + (s.index + 1) + '-aaaabbbbcccc.mp3', contentHash: 'h' + s.index, bytes: 4000 })) }),
    'POST /api/video': () => ({ url: 'https://signed.test/video.mp4' })
  }, opts.handlers || {});
  w.fetch = async (url, init) => {
    const p = url.replace('https://api.test', ''), key = (init && init.method || 'GET') + ' ' + p, body = init && init.body ? JSON.parse(init.body) : null;
    calls.push({ key, body }); const hd = handlers[key];
    if (!hd) return { ok: false, status: 404, json: async () => ({ error: 'no route ' + key }) };
    const r = await hd(body);
    if (r && r.__status) return { ok: false, status: r.__status, json: async () => ({ error: r.error }) };
    return { ok: true, status: 200, json: async () => r };
  };
  class FakeAudio {
    constructor() { this.L = {}; this.attrs = {}; this.paused = true; this._t = 0; this.duration = NaN; this.playbackRate = 1; this.volume = 1; this.srcs = []; this.plays = 0; FakeAudio.all.push(this); }
    addEventListener(n, f) { (this.L[n] = this.L[n] || []).push(f); } fire(n) { (this.L[n] || []).forEach(f => f()); }
    setAttribute(k, v) { this.attrs[k] = v; } getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; } removeAttribute(k) { delete this.attrs[k]; }
    set src(v) { this.attrs.src = v; this.srcs.push(v); Promise.resolve().then(() => { this.duration = 7.25; this.fire('loadedmetadata'); }); } get src() { return this.attrs.src || ''; }
    get currentTime() { return this._t; } set currentTime(v) { this._t = v; }
    play() { this.plays++; if (opts.blockPlay) return Promise.reject(Object.assign(new Error('blocked'), { name: 'NotAllowedError' })); this.paused = false; return Promise.resolve(); }
    pause() { this.paused = true; } load() {} }
  FakeAudio.all = []; w.Audio = FakeAudio;
  w.eval(code('voiceover.js')); w.eval(code('voiceover-admin.js'));
  return { w, calls, store, FakeAudio };
}
function makeVideo(w, id) {
  const v = w.document.createElement('video'); v.setAttribute('data-vo', id); w.document.body.appendChild(v);
  const st = { t: 0, base: 0, t0: 0, clock: false, paused: true, ended: false, rate: 1, vol: 1 };
  Object.defineProperty(v, 'currentTime', { get: () => st.clock ? st.base + (Date.now() - st.t0) / 1000 : st.t, set: x => { st.t = x; st.base = x; st.t0 = Date.now(); }, configurable: true });
  Object.defineProperty(v, 'paused', { get: () => st.paused, configurable: true });
  Object.defineProperty(v, 'ended', { get: () => st.ended, configurable: true });
  Object.defineProperty(v, 'playbackRate', { get: () => st.rate, set: x => { st.rate = x; }, configurable: true });
  Object.defineProperty(v, 'volume', { get: () => st.vol, set: x => { st.vol = x; }, configurable: true });
  v.__s = st; return v;
}
const fire = (w, v, type) => v.dispatchEvent(new w.Event(type));
const press = async (w, v) => { v.__s.paused = false; if (!v.__s.clock) { v.__s.t0 = Date.now(); } fire(w, v, 'loadedmetadata'); fire(w, v, 'play'); await sleep(30); };
const bar = w => w.document.querySelector('.vo-bar');
const barBtn = w => bar(w) && bar(w).querySelector('button');

(async () => {
  // ---------- nothing to do: original video untouched ----------
  { const s = setup(); const v = makeVideo(s.w, 'v-plain-xyz'); await press(s.w, v);
    t('video without a voiceover: untouched (not muted, no bar, no audio, one cheap lookup)', v.muted === false && !bar(s.w) && s.FakeAudio.all.length === 0 && s.calls.length === 0); }
  { const s = setup(); const d = mkDoc(); d.tracks.en.segments.forEach(x => delete x.offset); s.store.docs['v-intro-abc'] = d;
    const v = makeVideo(s.w, 'v-intro-abc'); await press(s.w, v);
    t('a plan-lesson narration doc (no offsets) never touches an mp4', v.muted === false && !bar(s.w)); }
  { const s = setup({ handlers: { 'POST /api/narration/url': () => ({ __status: 403, error: 'Ye narration sunne ke liye subscription chahiye.' }) } }); s.store.docs['v-intro-abc'] = mkDoc();
    const v = makeVideo(s.w, 'v-intro-abc'); await press(s.w, v);
    t('student without access: original video and sound play exactly as before', v.muted === false && !bar(s.w) && s.FakeAudio.all.length === 0); }
  { const s = setup({ blockPlay: true }); s.store.docs['v-intro-abc'] = mkDoc();
    const v = makeVideo(s.w, 'v-intro-abc'); await press(s.w, v);
    t('browser blocks audio start: video is NOT muted (student keeps hearing the original) and is told to press Play again', v.muted === false && /dobara Play/.test(bar(s.w).textContent)); }

  // ---------- main playback ----------
  { const s = setup(); s.store.docs['v-intro-abc'] = mkDoc();
    const v = makeVideo(s.w, 'v-intro-abc'); await press(s.w, v); const a = s.FakeAudio.all[0];
    t('Play: voiceover starts at its offset and the original sound is muted', v.muted === true && a.getAttribute('src').includes('/step-01-') && !a.paused && a._t === 0);
    t('signing request names the video and the keys (server re-checks login + subscription)', s.calls.some(c => c.key === 'POST /api/narration/url' && c.body.lessonId === 'v-intro-abc' && c.body.keys.length === 2));
    t('a small bar appears under the video', bar(s.w) && /Voiceover: ON/.test(bar(s.w).textContent) && v.nextSibling === bar(s.w));
    v.currentTime = 5.5; fire(s.w, v, 'timeupdate');
    t('gap between segments: audio silent, video STILL muted (no overlap with the original)', a.paused && v.muted === true);
    v.currentTime = 10.2; fire(s.w, v, 'timeupdate');
    t('second segment starts at its offset, positioned correctly', a.getAttribute('src').includes('/step-02-') && Math.abs(a._t - 0.2) < 0.01 && !a.paused);
    const loads = a.srcs.length;
    v.__s.paused = true; fire(s.w, v, 'pause');
    t('video pause -> audio pauses', a.paused);
    v.__s.paused = false; fire(s.w, v, 'play'); await sleep(20);
    t('video resume -> same audio resumes (not reloaded)', !a.paused && a.srcs.length === loads && a.getAttribute('src').includes('/step-02-'));
    v.__s.paused = false; v.currentTime = 11; fire(s.w, v, 'seeking'); t('while seeking the audio waits', a.paused); fire(s.w, v, 'seeked');
    t('seek: audio jumps to the matching moment of that segment', !a.paused && Math.abs(a._t - 1) < 0.01);
    v.currentTime = 2; fire(s.w, v, 'seeking'); fire(s.w, v, 'seeked');
    t('seek backwards into the first segment: it restarts at the right place', a.getAttribute('src').includes('/step-01-') && Math.abs(a._t - 2) < 0.01);
    a._t = 4; fire(s.w, v, 'timeupdate');
    t('drift over 0.35s is corrected', Math.abs(a._t - 2) < 0.01);
    a._t = 2.2; fire(s.w, v, 'timeupdate');
    t('small drift is left alone (no audible jumps)', Math.abs(a._t - 2.2) < 0.01);
    v.playbackRate = 1.5; fire(s.w, v, 'ratechange');
    t('playback speed follows the video', a.playbackRate === 1.5);
    v.volume = 0.4; fire(s.w, v, 'timeupdate'); t('video volume slider controls the voiceover loudness', a.volume === 0.4);
    fire(s.w, v, 'waiting'); t('video buffering -> audio waits', a.paused); fire(s.w, v, 'playing'); t('video continues -> audio continues', !a.paused);
    v.__s.ended = true; v.__s.paused = true; fire(s.w, v, 'ended'); t('video ended -> audio stops', a.paused);
    v.__s.ended = false;

    // toggle + manual unmute
    v.__s.paused = false; v.currentTime = 1; fire(s.w, v, 'seeked');
    barBtn(s.w).click();
    t('Voiceover OFF: original sound returns, audio stops', v.muted === false && a.paused && /OFF/.test(bar(s.w).textContent));
    barBtn(s.w).click(); await sleep(20);
    t('Voiceover ON again: muted again and audio plays', v.muted === true && !a.paused && /ON/.test(bar(s.w).textContent));
    v.muted = false; fire(s.w, v, 'volumechange');
    t('student unmutes the video themself -> voiceover switches off (never both)', a.paused && /OFF/.test(bar(s.w).textContent) && /Original awaaz/.test(bar(s.w).textContent));

    // video removed by a page re-draw
    barBtn(s.w).click(); await sleep(20); t('(back on)', !a.paused);
    v.remove(); a.fire('timeupdate');
    t('video removed from the page (re-draw): audio stops by itself', a.paused); }

  // ---------- audio problems ----------
  { const s = setup(); s.store.docs['v-intro-abc'] = mkDoc();
    const v = makeVideo(s.w, 'v-intro-abc'); await press(s.w, v); const a = s.FakeAudio.all[0]; const before = a.getAttribute('src'); s.calls.length = 0;
    a.fire('error'); await sleep(30);
    const refresh = s.calls.filter(c => c.key === 'POST /api/narration/url');
    t('expired link: one fresh signed link is requested for that segment and playback continues', refresh.length === 1 && refresh[0].body.keys.length === 1 && a.getAttribute('src') !== before && !a.paused);
    a.fire('error'); await sleep(30);
    t('second failure: voiceover off, original sound back, clear message', v.muted === false && a.paused && /nahi chal payi/.test(bar(s.w).textContent)); }
  { const s = setup({ handlers: { 'POST /api/narration/url': (b) => b.keys.length === 1 ? { __status: 403, error: 'no' } : { urls: Object.fromEntries(b.keys.map(k => [k, 'https://signed.test/' + k])) } } }); s.store.docs['v-intro-abc'] = mkDoc();
    const v = makeVideo(s.w, 'v-intro-abc'); await press(s.w, v); const a = s.FakeAudio.all[0];
    a.fire('error'); await sleep(30);
    t('refresh refused: voiceover off, original sound back', v.muted === false && /nahi chal payi/.test(bar(s.w).textContent)); }

  // ---------- languages ----------
  { const s = setup(); const d = mkDoc(); d.tracks.as = { voiceId: 'i43sm02kv3', voiceName: 'Dipannita', status: 'ready', segments: [{ index: 0, status: 'ready', audioKey: KEY0.replace('/en/', '/as/'), offset: 0, duration: 5 }] };
    s.store.docs['v-intro-abc'] = d; s.w.localStorage.setItem('mvLang', 'en');
    const v = makeVideo(s.w, 'v-intro-abc'); await press(s.w, v); const a = s.FakeAudio.all[0];
    const sel = bar(s.w).querySelector('select');
    t('two languages: a language selector is shown', sel && sel.options.length === 2 && a.getAttribute('src').includes('/en/'));
    s.calls.length = 0; sel.value = 'as'; sel.onchange(); await sleep(40);
    t('switching language signs that language and plays it from the right place', s.calls.some(c => c.body && c.body.keys && c.body.keys[0].includes('/as/')) && a.getAttribute('src').includes('/as/') && !a.paused); }

  // ---------- wake-up timer (no timeupdate needed) ----------
  { const s = setup(); const d = mkDoc(); d.tracks.en.segments = [{ index: 0, status: 'ready', audioKey: KEY0, offset: 0.35, duration: 1 }]; s.store.docs['v-intro-abc'] = d;
    const v = makeVideo(s.w, 'v-intro-abc'); v.__s.clock = true; v.currentTime = 0; await press(s.w, v); const a = s.FakeAudio.all[0];
    t('before its offset the voiceover is silent', a.paused && v.muted === true);
    await sleep(450);
    t('audio starts at the offset from ONE wake-up timer, without any timeupdate event', !a.paused && a.getAttribute('src').includes('/step-01-')); }

  // ---------- admin ----------
  const VIDEO = { id: 'v-intro-abc', course: 'c7-maths', chapter: 3, title: 'Integers intro', key: 'x.mp4', free: true };
  function mountAdmin(s) { const box = s.w.document.createElement('div'); s.w.document.body.appendChild(box); const api = s.w.VoiceoverAdmin.mount(box, { video: VIDEO, store: s.w.CLOUD.narration }); return { box, api }; }
  const abtn = (a, label) => Array.from(a.box.querySelectorAll('button')).filter(b => b.textContent === label)[0];
  const setRow = (a, i, text, offset) => { const ta = a.box.querySelectorAll('textarea')[i]; ta.value = text; ta.onchange(); const off = a.box.querySelectorAll('input[type=number][step="0.1"]')[i]; off.value = offset; off.onchange(); };
  const msg = a => a.box.textContent;

  { const s = setup(); const a = mountAdmin(s); await sleep(20);
    t('admin panel loads voices and offers only voices that fit the language', /Diya/.test(msg(a)) && !/Dipannita/.test(msg(a)));
    setRow(a, 0, 'Namaskar friends.', 2); abtn(a, 'Generate voiceover').click(); await sleep(80);
    const g = s.calls.filter(c => c.key === 'POST /api/narration/generate')[0];
    t('generate: lesson = video id, B2 folder from course/chapter, one segment per script part', g && g.body.lessonId === 'v-intro-abc' && g.body.folder === 'c7-maths/chapter-3' && g.body.segments.length === 1 && g.body.segments[0].text === 'Namaskar friends.' && g.body.force === false);
    const sv = s.store.sets[s.store.sets.length - 1];
    t('saved: ready, with the start offset, measured duration, keys only', sv && sv.d.status === 'ready' && sv.d.tracks.en.segments[0].offset === 2 && sv.d.tracks.en.segments[0].duration === 7.25 && /^audio\/generated\/c7-maths\/chapter-3\//.test(sv.d.tracks.en.segments[0].audioKey) && Array.isArray(sv.d.steps));
    t('success message', /ready aur save ho gayi/.test(msg(a))); }

  { const s = setup(); const a = mountAdmin(s); await sleep(20);
    abtn(a, '+ Segment').click(); setRow(a, 0, 'First part.', 0); setRow(a, 1, 'Second part.', 3);
    abtn(a, 'Generate voiceover').click(); await sleep(80);
    t('segments whose audio runs into the next one are NOT saved, with a clear message', s.store.sets.length === 0 && /takra/.test(msg(a)));
    setRow(a, 1, 'Second part.', 8); abtn(a, 'Sirf offsets save').click(); await sleep(30);
    const sv = s.store.sets[s.store.sets.length - 1];
    t('fixing the offset and saving works without new audio', sv && sv.d.tracks.en.segments.map(x => x.offset).join() === '0,8' && s.calls.filter(c => c.key === 'POST /api/narration/generate').length === 1); }

  { const s = setup(); const a = mountAdmin(s); await sleep(20);
    abtn(a, '+ Segment').click(); setRow(a, 0, 'Only first.', 0); abtn(a, 'Generate voiceover').click(); await sleep(20);
    t('an empty segment is refused with a clear message, nothing sent', /text khali/.test(msg(a)) && !s.calls.some(c => c.key === 'POST /api/narration/generate')); }
  { const s = setup({ handlers: { 'POST /api/narration/generate': () => ({ status: 'failed', segments: [{ index: 0, status: 'failed', code: 'VOICE_FALLBACK', error: 'Sonex ne dusri awaaz lagayi.' }] }) } }); const a = mountAdmin(s); await sleep(20);
    setRow(a, 0, 'Hello.', 0); abtn(a, 'Generate voiceover').click(); await sleep(80);
    const sv = s.store.sets[s.store.sets.length - 1];
    t('failed generation is recorded as failed (never ready) and the reason is shown', sv && sv.d.status === 'failed' && !sv.d.tracks.en.segments[0].audioKey && /dusri awaaz/.test(msg(a))); }
  { const s = setup({ handlers: { 'POST /api/narration/generate': () => ({ __status: 400, error: 'Ye voice nahi mili.' }) } }); const a = mountAdmin(s); await sleep(20);
    setRow(a, 0, 'Hello.', 0); abtn(a, 'Generate voiceover').click(); await sleep(50);
    t('server refusal shown, nothing saved', /nahi mili/.test(msg(a)) && s.store.sets.length === 0); }
  { const s = setup(); s.store.docs['v-intro-abc'] = mkDoc(); const a = mountAdmin(s); await sleep(30);
    t('saved voiceover is loaded into the form', a.box.querySelectorAll('textarea').length === 2 && /Status: ready \(Diya\)/.test(msg(a)));
    abtn(a, 'Voiceover hatao').click(); await sleep(20);
    t('Remove voiceover deletes the record (video untouched)', s.store.dels.join() === 'v-intro-abc'); }
  { const s = setup(); s.store.docs['v-intro-abc'] = mkDoc(); const a = mountAdmin(s); await sleep(30);
    abtn(a, 'Video load karo').click(); await sleep(30);
    const vid = a.box.querySelector('video'); t('Video load: the real (signed) video is shown', vid && /signed\.test\/video\.mp4/.test(vid.src));
    abtn(a, 'Voiceover ke saath preview').click(); await sleep(60);
    t('preview attaches the real student logic to that video (bar appears)', vid.getAttribute('data-vo') === 'v-intro-abc' && !!a.box.querySelector('.vo-bar')); }

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('TEST CRASH', e); process.exit(2); });
