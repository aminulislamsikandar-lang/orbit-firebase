// Recall AI voice answer in a fake browser (jsdom): permission box, Record / Stop, running timer, clip is sent to the AI inside the evaluate request,
// auto stop, size stop, mic off, screen change, errors. Skipped when jsdom is not installed. Run: node tests/recall-dom.test.js
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
let JSDOM = null; try { ({ JSDOM } = require('jsdom')); } catch (e) {}
let pass = 0, fail = 0;
const t = (name, ok, extra) => { if (ok) pass++; else { fail++; console.log('FAIL  ' + name + (extra ? '  ' + extra : '')); } };
if (!JSDOM) { console.log('SKIP  jsdom not installed (npm i -D jsdom) - Recall voice tests not run'); console.log('0 passed, 0 failed'); process.exit(0); }
const src = fs.readFileSync(path.join(ROOT, 'public', 'recall.js'), 'utf8');
const revSrc = fs.readFileSync(path.join(ROOT, 'public', 'revision-core.js'), 'utf8');   // index.html loads it before recall.js
const wait = () => new Promise(r => setTimeout(r, 15));

function boot(opts) {
  opts = opts || {};
  const dom = new JSDOM('<!doctype html><body><div id="app"></div></body>', { runScripts: 'outside-only', url: 'https://orbittutorial.web.app/', pretendToBeVisual: true });
  const w = dom.window, ticks = [], mrs = [], calls = [], st = { tracksStopped: 0, denied: false, reply: null, fail: null };
  w.setInterval = fn => { ticks.push(fn); return ticks.length; };
  w.clearInterval = id => { ticks[id - 1] = null; };
  w.scrollTo = () => {}; const gos = []; w.go = v => gos.push(v);
  const srs = [];
  if (opts.SR !== false) w.SpeechRecognition = class { constructor() { srs.push(this); this.started = 0; this.stopped = 0; } start() { this.started++; } stop() { this.stopped++; } };
  if (!opts.noMR) {
    w.MediaRecorder = class {
      constructor(stream, o) { mrs.push(this); this.stream = stream; this.o = o; this.state = 'inactive'; this.mimeType = (o && o.mimeType) || ''; }
      start(ms) { this.state = 'recording'; this.ms = ms; }
      stop() { if (this.state === 'inactive') return; this.state = 'inactive'; setTimeout(() => { if (this.chunkOnStop) this.ondataavailable({ data: new w.Blob([new Uint8Array(this.chunkOnStop)]) }); this.onstop(); }, 0); }
      push(n) { this.ondataavailable({ data: new w.Blob([new Uint8Array(n)]) }); }
      static isTypeSupported(m) { return m === 'audio/webm;codecs=opus'; }
    };
    Object.defineProperty(w.navigator, 'mediaDevices', { value: { getUserMedia: async () => { if (st.denied) { const e = new Error('no'); e.name = 'NotAllowedError'; throw e; } return { getTracks: () => [{ stop() { st.tracksStopped++; } }] }; } }, configurable: true });
  }
  w.api = async (p, body) => { calls.push({ p, body }); if (st.fail) throw new Error(st.fail); return st.reply || { total: 72, scores: { c: 70, f: 80, t: 60, l: 70, m: 80 }, weights: { c: 30, f: 25, t: 20, l: 15, m: 10 }, got: ['a'], miss: ['b'], wrong: [], revise: 'Revise b.', heard: 'photosynthesis mein plants', left: 0 }; };
  const custom = opts.custom ? ',{id:\"cc-abc\",custom:true,orgId:\"u-1\",class:9,subject:\"Geography\",chapters:[{no:1,title:\"My chapter\",notes:\"' + 'Plants make food by photosynthesis. '.repeat(8) + '\",sections:[{title:\"Questions\",questions:[{id:\"cq1\",no:1,text:\"Q\"}]}]},{no:2,title:\"No notes yet\",notes:\"\",sections:[{title:\"Questions\",questions:[{id:\"cq2\",no:1,text:\"Q2\"}]}]}]}' : '';
  w.eval('var ST={rvoice:"' + (opts.mode || 'ai') + '"};var USER={uid:"u1"};var DATA={courses:[{id:"c7-science",class:7,subject:"Science",chapters:[{no:1,title:"Nutrition in Plants",sections:[{title:"S",questions:[{id:"q1",no:1,text:"Q"}]}]}]}' + custom + ']};function draw(){document.getElementById("app").innerHTML=RECALL.viewHTML()}');
  if (opts.key !== false) w.eval('window.PARENT_KEY={has:function(){return true}}');   // voice needs a parent key (Task 4)
  if (opts.allowed !== false) w.localStorage.setItem('orbit.recall.voiceok.u1', '1');
  w.eval(revSrc); w.eval(src); w.eval('draw()');
  const d = w.document;
  const change = (id, v) => { const el = d.getElementById(id); if (v !== undefined) { if (el.type === 'checkbox') el.checked = v; else el.value = v; } el.dispatchEvent(new w.Event('change', { bubbles: true })); };
  return { w, d, mrs, srs, gos, calls, st, change, click: sel => { const el = d.querySelector(sel); el && el.click(); }, tick: () => ticks.forEach(f => f && f()), timer: () => (d.getElementById('rcTimer') || {}).textContent, app: () => d.getElementById('app').textContent,
    record: async function (n) { this.click('[data-rc=rec]'); await wait(); if (n) this.mrs[this.mrs.length - 1].chunkOnStop = n; } };
}

(async () => {
  // Phase 4 / Task 24: handwritten photo answer
  const stub = 'window.CUSTOM={shrink:async function(f){ if(f.name==="bad.txt") throw new Error("Ye photo khul nahi paayi. jpg ya png photo lo."); return {mime:"image/jpeg",image:"QUJD".repeat(300)}; }}';
  const pick = (bb, name) => { const i = bb.d.getElementById('rcPhotoFile'); Object.defineProperty(i, 'files', { value: [{ name }], configurable: true }); i.dispatchEvent(new bb.w.Event('change', { bubbles: true })); };
  { const pb = boot({ key: false }); pb.w.eval(stub); pb.change('rcTopic', 'c7-science|1');
    t('photo: button and hidden file input are on screen', !!pb.d.querySelector('[data-rc=photo]') && !!pb.d.getElementById('rcPhotoFile') && /Photo se answer/.test(pb.app()));
    pick(pb, 'ans.jpg'); await wait(); await wait();
    t('photo: thumbnail, "Photo ready" and Hatao appear, button says Doosri photo', !!pb.d.querySelector('img[alt="Aapke answer ki photo"]') && /Photo ready hai/.test(pb.app()) && !!pb.d.querySelector('[data-rc=photodel]') && /Doosri photo/.test(pb.app()));
    pb.click('[data-rc=photodel]');
    t('photo: Hatao removes it', !pb.d.querySelector('img[alt="Aapke answer ki photo"]'));
    pick(pb, 'ans.jpg'); await wait(); await wait();
    pb.click('[data-rc=go]'); await wait(); await wait();
    const c = pb.calls[0];
    t('photo: Evaluate sends {mime, data} as photo, no audio, no typed text needed', c && c.p === '/api/recall/evaluate' && c.body.photo && c.body.photo.mime === 'image/jpeg' && /^[A-Za-z0-9+/]+=*$/.test(c.body.photo.data) && c.body.audio === undefined);
    t('photo: gone from the screen after it was checked and never written to storage', !/Photo ready hai/.test(pb.app()) && !Object.keys(pb.w.localStorage).some(k => /QUJD/.test(pb.w.localStorage.getItem(k))));
  }
  { const pb = boot({ key: false }); pb.w.eval(stub); pick(pb, 'bad.txt'); await wait(); await wait();
    t('photo: unreadable file shows the error and sends nothing', /khul nahi paayi/.test(pb.app()) && pb.calls.length === 0 && !pb.d.querySelector('[data-rc=photodel]')); }
  { const pb = boot({ key: false }); pb.w.eval(stub); pb.w.api = async () => ({ total: 60, scores: { c: 60, f: 60, t: 60, l: 60, m: 60 }, weights: { c: 30, f: 25, t: 20, l: 15, m: 10 }, got: [], miss: [], wrong: ['Step 2: 3 x 4 = 12, 11 nahi'], revise: 'x', heard: '3 x 4 = 11', src: 'photo', left: 0 });
    pb.change('rcTopic', 'c7-science|1'); pick(pb, 'ans.jpg'); await wait(); await wait(); pb.click('[data-rc=go]'); await wait(); await wait();
    t('photo result: heading says "AI ne ye padha" and the wrong step is shown', /AI ne ye padha: 3 x 4 = 11/.test(pb.app()) && /Step 2: 3 x 4 = 12/.test(pb.app()) && !/AI ne ye suna/.test(pb.app())); }
  { const pb = boot(); pb.w.eval(stub); pick(pb, 'ans.jpg'); await wait(); await wait(); await pb.record(3000);
    t('starting a voice recording drops the photo (one source at a time)', !pb.d.querySelector('img[alt="Aapke answer ki photo"]')); }
  // Task 4: no parent key = no voice, in both voice modes
  for (const m of ['ai', 'text']) {
    const nb = boot({ key: false, mode: m });
    nb.click('[data-rc=rec]'); await wait();
    t('no parent key (' + m + '): Record Voice shows the parent-key message', /Voice ke liye parent ki key chahiye/.test(nb.app()));
    t('no parent key (' + m + '): mic and speech recogniser are never started', nb.mrs.length === 0 && nb.srs.length === 0 && nb.st.tracksStopped === 0);
    t('no parent key (' + m + '): the parent permission box is not shown', !nb.d.getElementById('rcVoiceOk'));
    t('no parent key (' + m + '): a button leads to Advanced AI Features', !!nb.d.querySelector('[data-rc=adv]'));
  }
  { // a clip made while a key was set must not be sent after the key is gone
    const kb = boot(); kb.change('rcTopic', 'c7-science|1'); await kb.record(3000); kb.tick(); kb.click('[data-rc=stop]'); await wait();
    kb.w.eval('window.PARENT_KEY={has:function(){return false}}');
    kb.d.getElementById('rcText').value = 'photosynthesis mein plants sunlight se khana banate hain'; kb.d.getElementById('rcText').dispatchEvent(new kb.w.Event('input', { bubbles: true }));
    kb.click('[data-rc=go]'); await wait(); await wait();
    t('key removed after recording: request has no audio', kb.calls.length === 1 && kb.calls[0].body.audio === undefined);
  }
  { // typing still works without a key
    const tb = boot({ key: false }); tb.change('rcTopic', 'c7-science|1');
    tb.d.getElementById('rcText').value = 'photosynthesis mein plants sunlight se khana banate hain'; tb.d.getElementById('rcText').dispatchEvent(new tb.w.Event('input', { bubbles: true }));
    tb.click('[data-rc=go]'); await wait(); await wait();
    t('no parent key: typed answer is still evaluated', tb.calls.length === 1 && tb.calls[0].body.audio === undefined && tb.calls[0].body.text.length > 20);
  }

  let b = boot({ allowed: false });
  t('Record Voice, language list, timer and the parent permission box are on screen', !!b.d.querySelector('[data-rc=rec]') && b.d.getElementById('rcLang').options.length === 4 && b.timer() === '0:00 / 2:00' && !!b.d.getElementById('rcVoiceOk'));
  t('languages are Hindi, English, Assamese, Bengali', [...b.d.getElementById('rcLang').options].map(o => o.textContent).join() === 'Hindi,English,Assamese,Bengali');
  b.click('[data-rc=rec]'); await wait();
  t('without the permission box the mic is not opened', b.mrs.length === 0 && /ijazat wala box tick karo/.test(b.app()));
  b.change('rcVoiceOk', true);
  t('ticking the box remembers it and hides it', !b.d.getElementById('rcVoiceOk') && b.w.localStorage.getItem('orbit.recall.voiceok.u1') === '1');

  b = boot();
  t('no permission box once allowed', !b.d.getElementById('rcVoiceOk'));
  await b.record(3000);
  t('recording starts: Stop button, "Mic chalu hai", low bitrate, 1 second chunks', !!b.d.querySelector('[data-rc=stop]') && /Mic chalu hai/.test(b.app()) && b.mrs[0].o.audioBitsPerSecond === 24000 && b.mrs[0].ms === 1000 && b.mrs[0].o.mimeType === 'audio/webm;codecs=opus');
  b.tick(); b.tick(); b.tick();
  t('timer runs: 0:03 / 2:00', b.timer() === '0:03 / 2:00', b.timer());
  t('language cannot change while recording', b.d.getElementById('rcLang').disabled);
  b.click('[data-rc=stop]'); await wait();
  t('Stop: mic tracks stopped, "Recording ready (0:03)" shown, button says Dobara record', b.st.tracksStopped === 1 && /Recording ready \(0:03\)/.test(b.app()) && /Dobara record/.test(b.app()));
  b.change('rcTopic', 'c7-science|1'); b.change('rcLang', 'as');
  b.click('[data-rc=go]'); await wait(); await wait();
  const call = b.calls[0];
  t('Evaluate sends the clip to /api/recall/evaluate with chapter, type and the spoken language', call && call.p === '/api/recall/evaluate' && call.body.course === 'c7-science' && call.body.ch === 1 && call.body.lang === 'as' && call.body.type === 'concept');
  t('the clip is sent as base64 with its mime type', call && call.body.audio && call.body.audio.mime === 'audio/webm;codecs=opus' && /^[A-Za-z0-9+/]+=*$/.test(call.body.audio.data) && Buffer.from(call.body.audio.data, 'base64').length === 3000);
  t('report shows the score and what the AI heard', /72/.test(b.app()) && /AI ne ye suna: photosynthesis mein plants/.test(b.app()));
  t('the recording is gone after it was checked', !/Recording ready/.test(b.app()));
  b.click('[data-rc=again]');
  t('Dobara try: timer back to 0:00', b.timer() === '0:00 / 2:00' && !/Recording ready/.test(b.app()));

  b = boot(); b.change('rcTopic', 'c7-science|1');
  b.d.getElementById('rcText').value = 'photosynthesis mein plants sunlight se khana banate hain'; b.d.getElementById('rcText').dispatchEvent(new b.w.Event('input', { bubbles: true }));
  b.click('[data-rc=go]'); await wait(); await wait();
  t('typing only: no audio in the request', b.calls.length === 1 && b.calls[0].body.audio === undefined && b.calls[0].body.text.length > 20);

  b = boot(); b.change('rcTopic', 'c7-science|1'); b.click('[data-rc=go]'); await wait();
  t('nothing typed and no clip: asks for more and does not call the server', b.calls.length === 0 && /Thoda aur likho ya bolo/.test(b.app()));

  b = boot(); await b.record(2000); b.change('rcTopic', 'c7-science|1'); b.click('[data-rc=go]'); await wait();
  t('Evaluate while recording asks to press Stop first', b.calls.length === 0 && /Pehle Stop dabao/.test(b.app()));

  b = boot(); await b.record(2000); b.tick(); b.click('[data-rc=stop]'); await wait(); b.change('rcTopic', 'c7-science|1'); b.st.fail = 'AI busy'; b.click('[data-rc=go]'); await wait(); await wait();
  t('a failed check keeps the recording so the student can try again', /AI busy/.test(b.app()) && /Recording ready/.test(b.app()));

  b = boot(); await b.record(2000); b.tick(); b.click('[data-rc=stop]'); await wait(); b.click('[data-rc=clipdel]');
  t('Hatao removes the recording', !/Recording ready/.test(b.app()) && b.timer() === '0:00 / 2:00');

  b = boot(); await b.record(2000);
  for (let i = 0; i < 120; i++) b.tick();
  await wait();
  t('recording stops by itself at 2:00, keeps the clip and says so', !b.d.querySelector('[data-rc=stop]') && /Time poora hua/.test(b.app()) && /Recording ready \(2:00\)/.test(b.app()) && b.st.tracksStopped === 1, b.timer());

  b = boot(); await b.record(2000); b.mrs[0].push(950000); await wait();
  t('a clip that grows too big stops safely with a message', !b.d.querySelector('[data-rc=stop]') && /bahut badi ho gayi/.test(b.app()) && b.st.tracksStopped === 1);

  b = boot(); b.st.denied = true; b.click('[data-rc=rec]'); await wait();
  t('mic permission refused: clear message and no recording', /ijazat nahi di/.test(b.app()) && !b.d.querySelector('[data-rc=stop]') && b.mrs.length === 0);

  b = boot(); await b.record(2000); b.d.getElementById('app').innerHTML = '<p>other screen</p>'; b.tick(); await wait();
  t('mic goes off and the recording is dropped when the screen is changed', b.st.tracksStopped === 1 && b.mrs[0].state === 'inactive');
  b.w.eval('draw()');
  t('nothing is left over after a screen change', !/Recording ready/.test(b.app()));

  b = boot(); await b.record(2000); b.tick(); Object.defineProperty(b.d, 'hidden', { value: true, configurable: true }); b.d.dispatchEvent(new b.w.Event('visibilitychange')); await wait();
  t('mic goes off when the tab is hidden', b.st.tracksStopped === 1 && b.mrs[0].state === 'inactive');

  b = boot({ noMR: true });
  t('no recording support: button disabled, message shown, typing still works', b.d.querySelector('[data-rc=rec]').disabled && /Chrome ya Edge/.test(b.app()) && !!b.d.getElementById('rcText'));

  // ---- text mode (browser speech-to-text, chosen in Settings) ----
  const say = (r, text, final) => { const res = Object.assign([{ transcript: text }], { isFinal: !!final }); r.onresult({ resultIndex: 0, results: [res] }); };
  b = boot({ mode: 'text', allowed: false });
  t('text mode: no permission box, Record Voice enabled, mode line and Settings link shown', !b.d.getElementById('rcVoiceOk') && !b.d.querySelector('[data-rc=rec]').disabled && /bole hue ko text mein badla/.test(b.app()) && !!b.d.querySelector('[data-rc=settings]'));
  b.click('[data-rc=settings]');
  t('the Settings link opens Settings', b.gos[0] === 'settings');
  b.click('[data-rc=rec]'); await wait();
  t('text mode: starts the browser recogniser (Hindi), not the audio recorder', b.srs.length === 1 && b.srs[0].started === 1 && b.srs[0].lang === 'hi-IN' && b.srs[0].continuous && b.srs[0].interimResults && b.mrs.length === 0);
  say(b.srs[0], 'photosynthesis mein', true);
  t('text mode: spoken words land in the box', b.d.getElementById('rcText').value.trim() === 'photosynthesis mein');
  say(b.srs[0], 'plants sunlight lete hain', false);
  t('text mode: live words show too', /plants sunlight lete hain/.test(b.d.getElementById('rcText').value));
  b.tick(); b.tick();
  t('text mode: timer runs', b.timer() === '0:02 / 2:00', b.timer());
  b.srs[0].onend();
  t('text mode: a silence break restarts listening', b.srs[0].started === 2);
  b.click('[data-rc=stop]');
  t('text mode: Stop keeps the text, no clip is made', b.srs[0].stopped === 1 && /photosynthesis mein/.test(b.d.getElementById('rcText').value) && !/Recording ready/.test(b.app()));
  b.click('[data-rc=rec]'); say(b.srs[1], 'chlorophyll bhi', true);
  t('text mode: a second recording adds to the text', /photosynthesis mein/.test(b.d.getElementById('rcText').value) && /chlorophyll bhi/.test(b.d.getElementById('rcText').value));
  b.click('[data-rc=stop]'); b.change('rcTopic', 'c7-science|1'); b.change('rcLang', 'as');
  b.click('[data-rc=go]'); await wait(); await wait();
  t('text mode: Evaluate sends the text and no audio', b.calls.length === 1 && b.calls[0].body.audio === undefined && /chlorophyll bhi/.test(b.calls[0].body.text) && b.calls[0].body.lang === 'as');
  b = boot({ mode: 'text' }); b.change('rcLang', 'as'); b.click('[data-rc=rec]'); await wait();
  t('text mode: Assamese uses as-IN', b.srs[0].lang === 'as-IN');
  b.srs[0].onerror({ error: 'language-not-supported' });
  t('text mode: language not supported gives a clear message and stops', /AI ko recording bhejo/.test(b.app()) && !b.d.querySelector('[data-rc=stop]'));
  b = boot({ mode: 'text' }); b.click('[data-rc=rec]'); await wait(); b.srs[0].onerror({ error: 'not-allowed' });
  t('text mode: mic permission refused is explained', /ijazat nahi di/.test(b.app()));
  b = boot({ mode: 'text' }); b.click('[data-rc=rec]'); await wait(); b.srs[0].onerror({ error: 'no-speech' });
  t('text mode: "no speech" does not stop it', !!b.d.querySelector('[data-rc=stop]'));
  b = boot({ mode: 'text' }); b.click('[data-rc=rec]'); await wait(); b.d.getElementById('app').innerHTML = '<p>x</p>'; b.tick();
  t('text mode: mic goes off when the screen changes', b.srs[0].stopped === 1);
  b = boot({ mode: 'text', SR: false });
  t('text mode without browser support: disabled with a clear message, typing works', b.d.querySelector('[data-rc=rec]').disabled && /Chrome ya Edge/.test(b.app()) && !!b.d.getElementById('rcText'));
  b = boot({ mode: 'ai' });
  t('AI mode shows its own mode line', /recording AI ko jati hai/.test(b.app()));
  await b.record(2000); b.tick(); b.w.RECALL.voiceChanged();
  t('changing the voice mode in Settings stops the mic and clears the old recording', b.st.tracksStopped === 1 && b.mrs[0].state === 'inactive');

  // ---- a student's own (custom) course: Recall works on a custom chapter only when it has notes (the notes are the textbook reference) ----
  b = boot({ custom: true });
  const optVals = [...b.d.getElementById('rcTopic').options].map(o => o.value);
  t('a custom chapter WITH notes is in the Recall topic list', optVals.includes('cc-abc|1'), optVals.join());
  t('a custom chapter without notes is not offered (the score would be a guess)', !optVals.includes('cc-abc|2'));
  t('built-in chapters are still offered', optVals.includes('c7-science|1'));
  t('a short note tells where to add notes for the other custom chapters', /chapter yahan tabhi dikhte hain jab unme kitab ke notes ho/.test(b.app()) && /My Courses/.test(b.app()));
  b.change('rcTopic', 'cc-abc|1'); b.d.getElementById('rcText').value = 'photosynthesis mein plants sunlight se khana banate hain'; b.d.getElementById('rcText').dispatchEvent(new b.w.Event('input', { bubbles: true }));
  b.click('[data-rc=go]'); await wait();
  const cb = b.calls[0] && b.calls[0].body;
  t('Recall on a custom chapter sends its class, subject, title and notes (no course id), type and text', cb && b.calls[0].p === '/api/recall/evaluate' && cb.custom && cb.custom.cls === 9 && cb.custom.subject === 'Geography' && cb.custom.chapter === 'My chapter' && /photosynthesis/.test(cb.custom.notes) && !('course' in cb) && !('ch' in cb) && cb.type && /photosynthesis/.test(cb.text));
  b = boot();
  t('no note when there is no custom course', !/custom\) chapter/.test(b.app()));
  b = boot({ custom: true }); b.change('rcTopic', 'c7-science|1'); b.d.getElementById('rcText').value = 'photosynthesis mein plants sunlight se khana banate hain'; b.d.getElementById('rcText').dispatchEvent(new b.w.Event('input', { bubbles: true }));
  b.click('[data-rc=go]'); await wait();
  t('a built-in chapter is sent exactly as before (course id + chapter number)', b.calls[0] && b.calls[0].body.course === 'c7-science' && b.calls[0].body.ch === 1 && !('custom' in b.calls[0].body));

  console.log(pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})();
