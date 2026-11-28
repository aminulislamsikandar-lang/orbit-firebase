// public/bolo.js - Bolo screen: the child speaks (A to Z, tables, poems), the browser's speech recognition listens, bolo-core.js checks it.
// index.html calls BOLO.viewHTML() for the "Bolo" page. Normally no server and no AI cost. Only with the parent's Gemini key AND the parent's tick (Task 28) the child's short clip goes to the AI (/api/bolo/check) for the sahi / dobara check.
// Privacy: normally Orbit never records, uploads or stores audio or the recognised text. The one exception is Byanjan "Saath me bolo" and only when the parent ticks it (Parent ke liye): the child's voice is then recorded and sent to the parent's phone and deleted after 2 hours (bolorec.js). Nothing is recognised. Only "sahi / dobara" marks, time used and the parent's settings are kept, on THIS device (per account).
(function () {
  'use strict';
  const g = window, C = g.BOLO_CORE;
  if (!C) return;
  const PREFIX = 'orbit.bolo.', DAYS_KEEP = 60, LISTEN_MS = 9000;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const redraw = () => { if (typeof g.draw === 'function') g.draw(); };
  const uid = () => (typeof USER !== 'undefined' && USER && USER.uid) || 'guest';
  const onScreen = () => typeof VIEW !== 'undefined' && VIEW === 'bolo';
  const SR = g.SpeechRecognition || g.webkitSpeechRecognition;
  const TTS = !!g.speechSynthesis;

  const ico = p => `<svg class="bl-ic" viewBox="0 0 24 24" aria-hidden="true">${p}</svg>`;
  const ICON = {
    mic: ico('<rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/>'),
    next: ico('<path d="M9 6l6 6-6 6"/>'), back: ico('<path d="M15 6l-6 6 6 6"/>'),
    ok: ico('<path d="M5 13l4 4L19 7"/>'), redo: ico('<path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 4v5h-5"/>')
  };

  // ---- saved data (this device, this account) ----
  const MAXLIM = 600;   // minutes a day: 10 hours (raised from 30 min while the app is being tested)
  const limTxt = m => m < 60 ? m + ' min' : (m % 60 ? Math.floor(m / 60) + ' ghante ' + (m % 60) + ' min' : (m / 60) + ' ghante');
  const volOf = v => { v = Math.round(+v); return Number.isFinite(v) ? Math.min(5, Math.max(1, v)) : 3; };   // parent's "how loud" slider for Saath me bolo
  const VOLN = ['Bahut halka', 'Halka', 'Normal', 'Tez', 'Bahut tez'];
  const blank = () => ({ set: { limit: 10, mic: true, vol: 3, pin: '' }, prog: {}, days: {} });
  let store = null, storeFor = '';
  function load() {
    if (store && storeFor === uid()) return store;
    storeFor = uid(); store = blank();
    try {
      const j = JSON.parse(g.localStorage.getItem(PREFIX + storeFor) || 'null');
      if (j && typeof j === 'object') {
        store.set = Object.assign(store.set, j.set || {});
        store.set.limit = Math.min(MAXLIM, Math.max(5, Math.round((+store.set.limit || 10) / 5) * 5)); store.set.vol = volOf(store.set.vol);
        store.set.mic = store.set.mic !== false; store.set.rec = store.set.rec === true; store.set.pin = typeof store.set.pin === 'string' ? store.set.pin : '';
        store.prog = j.prog && typeof j.prog === 'object' ? j.prog : {}; store.days = j.days && typeof j.days === 'object' ? j.days : {};
      }
    } catch (e) {}
    return store;
  }
  function save() {
    const s = load(), keep = Object.keys(s.days).sort().slice(-DAYS_KEEP), d = {};
    keep.forEach(k => { d[k] = s.days[k]; }); s.days = d;
    try { g.localStorage.setItem(PREFIX + storeFor, JSON.stringify(s)); } catch (e) {}
    if (g.KIDLINK && g.KIDLINK.touch) g.KIDLINK.touch();   // Kid mode: the parent's phone sees today's minutes and counts
  }
  const today = () => { const s = load(), k = C.dayKey(); return s.days[k] || (s.days[k] = { sec: 0, ok: 0, redo: 0 }); };
  const over = () => today().sec >= load().set.limit * 60;
  const totalDone = () => Object.values(load().prog).reduce((a, m) => a + Object.values(m).filter(v => v === 'd').length, 0);

  // ---- screen state (not saved) ----
  const st = { mode: 'alpha', table: 2, poem: C.POEMS[0].id, i: 0, fb: null, listening: false, err: '', unlocked: false, parOpen: false, pinMsg: '', praise: null, enter: true };
  const opt = () => ({ table: st.table, poem: st.poem });
  const list = () => C.items(st.mode, opt());
  const key = () => C.stateKey(st.mode, opt());
  const marks = () => (load().prog[key()] || {});
  const hasPin = () => !!load().set.pin;
  const canEdit = () => !hasPin() || st.unlocked;
  function firstOpen() { const m = marks(), n = list().length; for (let i = 0; i < n; i++) if (m[i] !== 'd') return i; return 0; }
  const stopAbc = () => { if (g.ABC) g.ABC.leave(); if (g.ABCLV) g.ABCLV.leave(); if (g.NUMG) g.NUMG.leave(); if (g.NUMLV) g.NUMLV.leave(); if (g.NUMCT) g.NUMCT.leave(); if (g.SUNO) g.SUNO.leave(); if (g.SWAR) g.SWAR.leave(); };   // the ABC topics keep their own speech and timers: stop them when the child changes topic or leaves
  function reset(mode) { if (g.SAATH && g.SAATH.running()) g.SAATH.stop(); if (g.SWARSAATH && g.SWARSAATH.running()) g.SWARSAATH.stop(); if (g.ABCSAATH && g.ABCSAATH.running()) g.ABCSAATH.stop(); if (g.BYANJANPIC && g.BYANJANPIC.running()) g.BYANJANPIC.stop(); stopListen(); stopSay(); clearAdv(); if (mode) { st.mode = mode; stopAbc(); } st.fb = null; st.err = ''; st.enter = true; st.i = firstOpen(); }

  // ---- voice out ----
  // Byanjan items carry a recorded voice clip (item.audio) and a mouth "video" (byanjan-video.js); everything else uses the browser voice.
  const LEAD = 350;   // the mouth starts moving a moment before the voice
  let clip = null, clipTimer = 0;
  function stopClip() { clearTimeout(clipTimer); if (clip) { try { clip.pause(); } catch (e) {} clip = null; } if (g.BYANJAN_VIDEO) g.BYANJAN_VIDEO.stop(); }
  function playClip(it) {
    stopSay(); if (!g.Audio) return;
    try {
      const a = new g.Audio(it.audio); clip = a; a.preload = 'auto';
      a.onerror = () => { if (clip === a) { st.err = 'Awaaz load nahi hui. Internet check karke dobara Sunao dabao.'; redraw(); } };
      clipTimer = setTimeout(() => { if (clip === a) { const p = a.play(); if (p && p.catch) p.catch(() => {}); } }, LEAD);
    } catch (e) {}
    if (g.BYANJAN_VIDEO) g.BYANJAN_VIDEO.play(it, { lead: LEAD, ms: it.ms });
  }
  // Asvyanjan items play a part (it.clip = start/end seconds) of one longer recording (it.src); if it cannot play, the browser voice reads the text.
  let rangeAudio = null, rangeTimer = 0;
  function stopRange() { clearTimeout(rangeTimer); if (rangeAudio) try { rangeAudio.pause(); } catch (e) {} }
  function playRange(it) {
    stopSay();
    try {
      if (!rangeAudio) rangeAudio = new g.Audio(it.src);
      rangeAudio.currentTime = it.clip.s;
      const p = rangeAudio.play(); if (p && p.catch) p.catch(() => say(it.say, it.lang));
      rangeTimer = setTimeout(stopRange, (it.clip.e - it.clip.s) * 1000 + 150);
    } catch (e) { say(it.say, it.lang); }
  }
  const speak = it => it && it.audio ? playClip(it) : it && it.clip ? playRange(it) : it && say(it.say);
  function stopSay() { try { g.speechSynthesis && g.speechSynthesis.cancel(); } catch (e) {} stopClip(); stopRange(); }
  function say(t, lang) { if (!TTS) return; try { const u = new g.SpeechSynthesisUtterance(t); u.lang = lang || 'en-IN'; u.rate = 0.8; g.speechSynthesis.cancel(); g.speechSynthesis.speak(u); } catch (e) {} }

  // ---- Task 28: AI check (only with the parent's Gemini key and the parent's tick) ----
  // The child's clip goes to /api/bolo/check, the AI says sahi or dobara. Nothing is saved. If the AI check fails once, the browser's own check takes over for the rest of the visit.
  const CAN_REC = !!(g.navigator && g.navigator.mediaDevices && g.navigator.mediaDevices.getUserMedia && g.MediaRecorder);
  const hasKey = () => !!(g.PARENT_KEY && g.PARENT_KEY.has && g.PARENT_KEY.has());
  const OKKEY = () => 'orbit.voice.ok.' + uid();
  const aiTick = () => { try { return g.localStorage.getItem(OKKEY()) === '1'; } catch (e) { return false; } };
  // Assamese modes: the AI check also works without the parent's key (the server's free daily checks); it still needs the parent's tick. When the day's free checks
  // are used up, or it fails once, the other two listeners (browser, voice match) carry on.
  const freeAs = () => asMode() && !st.freeOff;
  const aiOn = () => (hasKey() || freeAs()) && CAN_REC && aiTick() && typeof g.api === 'function' && !st.aiOff;
  const AI_MS = 6000;
  let aiRec = null, aiStream = null, aiChunks = [], aiTimer = 0, aiDrop = false;
  let fuseSR = null, onSRDone = null;   // the browser listener that runs next to the recording in the Assamese modes
  function aiStop(drop) {
    clearTimeout(aiTimer); aiDrop = !!drop;
    try { if (aiRec && aiRec.state !== 'inactive') aiRec.stop(); } catch (e) {}
    try { aiStream && aiStream.getTracks().forEach(t => t.stop()); } catch (e) {}
    aiRec = null; aiStream = null;
    if (drop) { st.listening = false; aiChunks = []; }
  }
  const b64 = blob => new Promise((ok, no) => { const f = new g.FileReader(); f.onload = () => ok(String(f.result).split(',')[1] || ''); f.onerror = () => no(new Error('Recording padh nahi paye.')); f.readAsDataURL(blob); });
  // ---- Awaaz milao (Assamese): the browser cannot hear Assamese, so the child's clip is compared on the phone with the teacher's recording of every item ----
  // public/voicematch-core.js does the comparing (MFCC + DTW with a voice-size search). No key, no internet, nothing leaves the phone.
  const asMode = () => st.mode === 'asvyanjan' || st.mode === 'byanjan';
  const localMatch = () => asMode() && CAN_REC && !!g.VMATCH && !st.vmOff;
  // Assamese: the browser listener, the voice match and (with the parent's key) the AI check all hear the same attempt, and public/assamese-fuse.js weighs them.
  const fuseOn = () => localMatch() && !!g.AFUSE;
  const recOn = () => aiOn() || localMatch();
  const decodeBuf = (ac, ab) => new Promise((ok, no) => { const p = ac.decodeAudioData(ab, ok, no); if (p && p.then) p.then(ok, no); });
  const vmCache = {};
  async function vmRefs(ac) {
    const mode = st.mode;
    if (vmCache[mode]) return vmCache[mode];
    const items = C.items(mode), V = g.VMATCH;
    if (mode === 'byanjan') {   // one teacher recording per letter
      vmCache[mode] = await Promise.all(items.map(async it => {
        const b = await decodeBuf(ac, await (await g.fetch(it.audio)).arrayBuffer()), f = V.features(b.getChannelData(0), b.sampleRate);
        return f.length ? [f] : [];
      }));
      return vmCache[mode];
    }
    // the teacher recordings: the main one, and a second one when AS_CUES2 is filled in (its failing to load never stops the first)
    const srcs = [{ src: items[0].src, cues: C.AS_CUES }];
    if (C.AS_CUES2 && C.AS_CUES2.length === C.AS_CUES.length) srcs.push({ src: C.AS_SRC2, cues: C.AS_CUES2, optional: true });
    const perSrc = [];
    for (const o of srcs) {
      try {
        const buf = await decodeBuf(ac, await (await g.fetch(o.src)).arrayBuffer()), pcm = buf.getChannelData(0), sr = buf.sampleRate, cues = o.cues;
        const cut = (a, b) => pcm.subarray(Math.max(0, Math.round(a * sr)), Math.round(b * sr));
        // three recordings per item: the letter, the word, and both
        perSrc.push(items.map((_, i) => [cut(cues[2 * i] - 0.1, cues[2 * i] + 0.7), cut(cues[2 * i + 1] - 0.1, cues[2 * i + 1] + 0.8), cut(cues[2 * i] - 0.1, cues[2 * i + 1] + 0.8)].map(p => V.features(p, sr)).filter(f => f.length)));
      } catch (e) { if (!o.optional) throw e; }
    }
    // every recording is a separate reference: the child is compared with each one and the closest counts
    vmCache[mode] = items.map((_, i) => [].concat(...perSrc.map(r => r[i])));
    return vmCache[mode];
  }
  async function matchLocal(blob, idx) {
    const AC = g.AudioContext || g.webkitAudioContext, ac = new AC();
    try {
      const buf = await decodeBuf(ac, await blob.arrayBuffer()), refs = await vmRefs(ac);
      const q = g.VMATCH.featuresMulti(buf.getChannelData(0), buf.sampleRate);
      if (!onScreen() || st.i !== idx) return;
      if (!q.length) { st.asMiss = (st.asMiss || 0) + 1; st.err = 'Awaaz saaf nahi aayi. Mic ke paas zor se bolo: "' + list()[idx].say + '"'; redraw(); return; }
      const res = g.VMATCH.decide(g.VMATCH.distances(q, refs), idx, { k: 3, ratio: 0.95 });
      if (!res.ok) st.asMiss = (st.asMiss || 0) + 1;
      mark(res.ok);
    } finally { try { ac.close(); } catch (e) {} }
  }
  // stops the recording about a second after the child has finished speaking
  // ---- Fusion: the three listeners of one attempt ----
  const NONE = { state: 'none' };
  async function vmScore(blob, idx) {   // voice match: how well the clip fits each teacher recording
    const AC = g.AudioContext || g.webkitAudioContext, ac = new AC();
    try {
      const buf = await decodeBuf(ac, await blob.arrayBuffer()), refs = await vmRefs(ac);
      const q = g.VMATCH.featuresMulti(buf.getChannelData(0), buf.sampleRate);
      return q.length ? g.AFUSE.vmState(g.VMATCH.distances(q, refs), idx) : NONE;
    } finally { try { ac.close(); } catch (e) {} }
  }
  async function aiCheck(blob, item) {   // the parent's AI check (only when the parent turned it on)
    const j = await g.api('/api/bolo/check', { kind: item.match.kind === 'self' ? 'asletter' : item.match.kind, expected: item.say, audio: { mime: String(blob.type).split(';')[0], data: await b64(blob) } });
    return { state: j.ok ? 'yes' : 'no', tip: j.tip };
  }
  // A letter on its own (byanjan) has no word to match, so the browser's text is checked as the letter alone (with a matra, in Bengali or in Hindi letters).
  const srHit = (item, alts) => item.match.kind === 'self' ? alts.some(a => C.matchAsm({ letter: item.big, word: '', roman: [] }, a)) : C.check(item, alts);
  // The browser's own listener runs at the same time as the recording. It is one more opinion: when a phone can not run both, or it hears nothing,
  // the other listeners decide alone. A language the phone does not have moves on to the next one (Assamese, Bengali, Hindi).
  function startSR(item) {
    if (!SR) return { p: Promise.resolve(NONE), stop() {} };
    let done = false, cur = null, tries = 0, settle;
    const p = new Promise(ok => { settle = ok; });
    const fin = v => {
      if (done) return; done = true;
      if (cur) { const c = cur; cur = null; c.onresult = c.onerror = c.onend = null; try { c.abort(); } catch (e) {} }
      settle(v); if (onSRDone) onSRDone(v);
    };
    const go = () => {
      let r; try { r = new SR(); } catch (e) { return fin(NONE); }
      cur = r; r.lang = AS_LANGS[(st.asLang || 0) % AS_LANGS.length]; r.interimResults = false; r.maxAlternatives = 3; r.continuous = false;
      r.onresult = e => {
        const res = e.results && e.results[0], alts = res ? Array.from(res).map(x => x.transcript) : [];
        fin(alts.length ? { state: srHit(item, alts) ? 'yes' : 'no', alts } : NONE);
      };
      r.onerror = e => {
        const code = e && e.error;
        if (code === 'aborted') return;
        if (code === 'language-not-supported' && ++tries < AS_LANGS.length) { nextAsLang(); cur = null; try { r.abort(); } catch (x) {} return go(); }
        fin({ state: 'none', err: code });
      };
      r.onend = () => { if (cur === r) fin(NONE); };
      try { r.start(); } catch (e) { fin(NONE); }
    };
    go();
    return { p, stop() { fin(NONE); } };
  }
  async function finishFuse(blob, item, idx, sr) {
    const late = ms => new Promise(ok => setTimeout(() => ok(NONE), ms));
    const srP = sr ? Promise.race([sr.p, late(1800)]) : Promise.resolve(NONE);
    const vmP = blob ? vmScore(blob, idx).catch(() => NONE) : Promise.resolve(NONE);
    const aiP = blob && aiOn() ? aiCheck(blob, item).catch(() => { st.aiOff = true; return NONE; }) : Promise.resolve(NONE);
    const [s, v, a] = await Promise.all([srP, vmP, aiP]);
    if (sr) { sr.stop(); fuseSR = null; }
    if (!onScreen() || st.i !== idx) return;
    const d = g.AFUSE.decide({ sr: s, vm: v, ai: a });
    st.fuse = d;
    if (d.verdict === 'pass') mark(true);
    else {
      st.asMiss = (st.asMiss || 0) + 1;
      if (s.state === 'no') nextAsLang();
      if (d.verdict === 'fail') mark(false);
      else { st.err = d.verdict === 'unsure' ? 'Thoda aur dheere aur saaf bolo: \"' + item.say + '\"' : 'Kuch sunai nahi diya. Mic ke paas zor se bolo: \"' + item.say + '\"'; redraw(); }
    }
    if (a.tip) { st.fb = { ok: d.verdict === 'pass', t: a.tip }; redraw(); }
  }
  function watchSilence(stream) {
    try {
      const AC = g.AudioContext || g.webkitAudioContext, ac = new AC(), an = ac.createAnalyser(), buf = new Float32Array(1024);
      an.fftSize = 1024; ac.createMediaStreamSource(stream).connect(an);
      let heard = 0, quiet = 0;
      const iv = setInterval(() => {
        if (!aiRec) { clearInterval(iv); try { ac.close(); } catch (e) {} return; }
        an.getFloatTimeDomainData(buf); let s = 0; for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i];
        if (Math.sqrt(s / buf.length) > 0.015) { heard++; quiet = 0; } else if (heard > 3 && ++quiet >= 10) { clearInterval(iv); try { ac.close(); } catch (e) {} aiStop(false); }
      }, 100);
    } catch (e) {}
  }
  async function listenAI() {
    if (over() || !load().set.mic || st.listening) return;
    stopSay(); st.fb = null; st.err = '';
    const item = list()[st.i], idx = st.i, local = !aiOn(), fuse = fuseOn();   // local: voice match only; otherwise the AI check; fuse: both and the browser listener together
    let sr = null;
    try { aiStream = await g.navigator.mediaDevices.getUserMedia({ audio: true }); }
    catch (e) { st.err = e && (e.name === 'NotAllowedError' || e.name === 'SecurityError') ? 'Browser ne mic ki ijazat nahi di. Address bar mein mic allow karo.' : 'Mic nahi mila. Phone ka mic check karo.'; return redraw(); }
    const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'].find(m => g.MediaRecorder.isTypeSupported && g.MediaRecorder.isTypeSupported(m)) || '';
    let r; try { r = new g.MediaRecorder(aiStream, Object.assign({ audioBitsPerSecond: 24000 }, mime ? { mimeType: mime } : {})); } catch (e) { aiStop(true); st.err = 'Mic shuru nahi ho paya. Dobara try karo.'; return redraw(); }
    aiChunks = []; aiDrop = false; aiRec = r; st.listening = true;
    r.ondataavailable = e => { if (e.data && e.data.size) aiChunks.push(e.data); };
    r.onstop = async () => {
      const chunks = aiChunks; aiChunks = []; st.listening = false;
      if (aiDrop || (!chunks.length && !fuse)) return redraw();
      st.busy = true; redraw();
      try {
        const blob = chunks.length ? new g.Blob(chunks, { type: mime || r.mimeType || 'audio/webm' }) : null;
        if (fuse) { await finishFuse(blob, item, idx, sr); st.busy = false; redraw(); return; }
        if (local) { await matchLocal(blob, idx); st.busy = false; redraw(); return; }
        const j = await g.api('/api/bolo/check', { kind: item.match.kind === 'self' ? 'asletter' : item.match.kind, expected: item.say, audio: { mime: String(blob.type).split(';')[0], data: await b64(blob) } });
        st.busy = false;
        if (!onScreen()) return;
        mark(!!j.ok); if (j.tip && !j.ok) { st.fb = { ok: false, t: j.tip }; redraw(); }
      } catch (e) {
        if (fuse) { st.busy = false; st.err = 'Awaaz check nahi ho paya. Dobara bolo.'; return redraw(); }
        if (local) { st.busy = false; st.vmOff = true; st.err = 'Awaaz check nahi ho paya, ab browser se check hoga. Dobara bolo.'; return redraw(); }   // the browser check takes over
        st.busy = false; st.aiOff = true;   // the browser check takes over
        st.err = (e && e.message ? e.message + ' ' : '') + 'AI check nahi ho paya, ab browser se check hoga. Dobara bolo.'; redraw();
      }
    };
    try { r.start(); } catch (e) { aiStop(true); st.err = 'Mic shuru nahi ho paya. Dobara try karo.'; return redraw(); }
    aiTimer = setTimeout(() => aiStop(false), AI_MS); if (local || fuse) watchSilence(aiStream);
    if (fuse) {   // the browser listener starts now, next to the recording; once it has an answer the recording ends a moment later
      onSRDone = v => { if (v && v.state !== 'none') setTimeout(() => { if (aiRec === r) aiStop(false); }, 350); };
      sr = fuseSR = startSR(item);
    }   // 6 seconds is plenty for a letter, a table line or a poem line
    redraw();
  }

  // ---- voice in ----
  let rec = null, recTimer = 0;
  function stopListen() {
    if (fuseSR) { const f = fuseSR; fuseSR = null; f.stop(); }
    aiStop(true);
    clearTimeout(recTimer); st.listening = false;
    if (rec) { const r = rec; rec = null; r.onresult = r.onerror = r.onend = null; try { r.abort(); } catch (e) {} }
  }
  // Letters ং ঃ ঁ are marks: alone the font draws a dotted circle, so a no-break space is their base.
  const shown = ch => /^[\u0981-\u0983]$/.test(ch) ? '\u00a0' + ch : ch;
  function mark(ok, manual) {
    const s = load(), k = key(), it = list()[st.i], d = today();
    s.prog[k] = s.prog[k] || {};
    if (ok) { s.prog[k][st.i] = 'd'; d.ok++; st.asMiss = 0; } else { if (s.prog[k][st.i] !== 'd') s.prog[k][st.i] = 'r'; d.redo++; }
    save(); stopListen(); clearAdv();
    st.fb = ok ? null : { ok: false, t: 'Phir se bolo: "' + it.say + '"' };
    st.praise = ok ? (manual || it.match.kind === 'self' ? shown(it.big) + ' ho gaya' : 'Sahi bola: ' + it.say) : null;
    redraw();
    if (ok) { say('शाबाश!', 'hi-IN'); advT = setTimeout(afterPraise, PRAISE_MS); }   // praise is spoken, the pop-up goes by itself and the next item comes
    else speak(it);                                                                  // every wrong answer plays the item again by itself (no Sunao button)
  }
  const PRAISE_MS = 1700; let advT = 0;
  function clearAdv() { clearTimeout(advT); advT = 0; st.praise = null; }
  function afterPraise() {
    advT = 0; st.praise = null; if (!onScreen()) return;
    if (st.i < list().length - 1) { st.i++; st.fb = null; st.err = ''; st.enter = true; redraw(); if (st.mode === 'byanjan') speak(list()[st.i]); }
    else redraw();
  }
  // The browser's voice engine often cannot hear Assamese. After two empty tries the child may tick by themselves instead of seeing the same message again.
  // Assamese is heard by trying one language after the other (Assamese, then Bengali, then Hindi: their engines are much better); Hindi text is read as Assamese by matchAsm.
  const AS_LANGS = ['as-IN', 'bn-IN', 'hi-IN'];
  const nextAsLang = () => { st.asLang = ((st.asLang || 0) + 1) % AS_LANGS.length; };
  function asMissMsg() {
    if (st.mode !== 'asvyanjan') return '';
    st.asMiss = (st.asMiss || 0) + 1; nextAsLang();
    return st.asMiss >= 2 ? 'Browser Assamese awaaz nahi pakad paa raha. Neeche "Maine bol diya" dabao.' : '';
  }
  function listen() {
    if (recOn()) return listenAI();
    if (over() || !load().set.mic || st.listening || !SR) return;
    stopSay(); stopListen(); st.fb = null; st.err = '';
    let r; try { r = new SR(); } catch (e) { st.err = 'Mic shuru nahi ho paya. Dobara try karo.'; redraw(); return; }
    rec = r; r.lang = st.mode === 'asvyanjan' ? AS_LANGS[(st.asLang || 0) % AS_LANGS.length] : 'en-IN'; r.interimResults = false; r.maxAlternatives = 3; r.continuous = false;
    const item = list()[st.i];
    r.onresult = e => {
      const res = e.results && e.results[0], alts = res ? Array.from(res).map(a => a.transcript) : [];
      const good = C.check(item, alts);
      if (!good && st.mode === 'asvyanjan') nextAsLang();   // heard something else: next try listens in the next language
      mark(good);
    };
    r.onerror = e => {
      const code = e && e.error; if (code === 'aborted') return;
      if (code === 'language-not-supported' && st.mode === 'asvyanjan' && (st.asLang || 0) < AS_LANGS.length - 1) { nextAsLang(); stopListen(); listen(); return; }   // this browser cannot hear that language: try the next one
      stopListen();
      st.err = code === 'not-allowed' || code === 'service-not-allowed' ? 'Browser ne mic ki ijazat nahi di. Address bar mein mic allow karo.'
        : code === 'no-speech' ? 'Kuch sunai nahi diya. Mic dabao aur zor se bolo.'
        : code === 'network' ? 'Internet nahi hai. Voice sunne ke liye internet chahiye.'
        : code === 'audio-capture' ? 'Mic nahi mila. Phone ka mic check karo.' : 'Sunai nahi diya. Dobara try karo.';
      if (!/^(not-allowed|service-not-allowed|network|audio-capture)$/.test(code)) st.err = asMissMsg() || st.err;
      redraw();
    };
    r.onend = () => { if (rec === r && st.listening) { stopListen(); st.err = asMissMsg() || 'Kuch sunai nahi diya. Mic dabao aur bolo.'; redraw(); } };
    st.listening = true;
    try { r.start(); } catch (e) { stopListen(); st.err = 'Mic shuru nahi ho paya. Dobara try karo.'; }
    recTimer = setTimeout(() => { if (rec === r) try { r.stop(); } catch (e) {} }, LISTEN_MS);
    redraw();
  }

  // ---- parent PIN (optional): stops a child from changing the limit. Stored only as a SHA-256 hash, salted with the account id. ----
  async function hashPin(pin) {
    if (!(g.crypto && g.crypto.subtle)) return null;
    const buf = await g.crypto.subtle.digest('SHA-256', new TextEncoder().encode('orbit-bolo:' + uid() + ':' + pin));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  async function pinAction(kind) {
    const el = g.document.getElementById('blPin'), v = el ? el.value.trim() : '';
    if (!/^\d{4}$/.test(v)) { st.pinMsg = 'PIN 4 numbers ka hona chahiye.'; redraw(); return; }
    const h = await hashPin(v);
    if (!h) { st.pinMsg = 'Is browser mein PIN support nahi hai.'; redraw(); return; }
    const s = load();
    if (kind === 'unlock') { if (h === s.set.pin) { st.unlocked = true; st.pinMsg = ''; } else st.pinMsg = 'PIN galat hai.'; }
    else if (kind === 'set') { s.set.pin = h; st.unlocked = true; st.pinMsg = 'PIN lag gaya.'; save(); }
    else if (kind === 'remove') { if (h === s.set.pin) { s.set.pin = ''; st.unlocked = false; st.pinMsg = 'PIN hata diya.'; save(); } else st.pinMsg = 'PIN galat hai.'; }
    redraw();
  }

  // ---- timer: counts only while this screen is open and visible ----
  let tick = 0;
  setInterval(() => {
    if (!onScreen() || g.document.hidden || over()) return;
    const d = today(); d.sec++;
    const el = g.document.getElementById('blTm'); if (el) el.textContent = C.fmtTime(d.sec);
    if (++tick % 10 === 0) save();
    if (over()) { stopListen(); stopSay(); save(); redraw(); }
  }, 1000);
  g.document.addEventListener('visibilitychange', () => { if (g.document.hidden) { stopListen(); stopSay(); save(); } });
  g.addEventListener('pagehide', save);

  // ---- views ----
  // Simple screen for small children: topic chips on top, one big coloured card, one big orange mic. Nothing else to press.
  const HUES = ['233,30,99', '33,150,243', '46,170,100', '142,68,173', '0,150,160', '229,57,53', '63,81,181'];   // card colour changes with every item
  const FLY = ['⭐', '✨', '🎉', '👏', '🌟', '🎈'];                                                           // tiny emojis, only inside the Shabaash pop-up
  function style() {
    if (g.document.getElementById('blStyle')) return '';
    const s = g.document.createElement('style'); s.id = 'blStyle';
    s.textContent = `.bl-ic{width:20px;height:20px;flex:none;fill:none;stroke:currentColor;stroke-width:1.75;stroke-linecap:round;stroke-linejoin:round}
.bl-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.bl-chips{margin:12px 0 4px}.bl-chips .chip{font-weight:700;font-size:15px;padding:8px 16px;border:2px solid var(--c);color:var(--c);background:var(--card)}
.bl-chips .chip[aria-pressed=true]{background:var(--c);color:#fff;border-color:var(--c)}
.bl-stage{position:relative;overflow:hidden;border-radius:26px;margin-top:10px;padding:16px 14px 24px;border:2px solid rgba(var(--rgb),.35);background:linear-gradient(160deg,rgba(var(--rgb),.24),rgba(var(--rgb),.05)),var(--card)}
.bl-stage>*{position:relative}
.bl-bub{position:absolute!important;border-radius:50%;background:rgba(var(--rgb),.16);animation:blfl 7s ease-in-out infinite}
.bl-bub:nth-child(1){width:90px;height:90px;left:-24px;top:50px}.bl-bub:nth-child(2){width:56px;height:56px;right:18px;top:96px;animation-delay:-2s}.bl-bub:nth-child(3){width:70px;height:70px;right:-18px;bottom:90px;animation-delay:-4s}
.bl-top{display:flex;justify-content:space-between;align-items:center;gap:10px;font-weight:700}.bl-ttl{font-size:17px}.bl-cnt{font-size:15px;background:rgba(var(--rgb),.18);border-radius:99px;padding:3px 12px}
.bl-bar{height:12px;border-radius:99px;background:rgba(var(--rgb),.15);margin-top:10px;overflow:hidden}.bl-bar span{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,rgb(var(--rgb)),#ffc83d);transition:width .5s}
.bl-big{text-align:center;font-weight:800;line-height:1.1;overflow-wrap:anywhere;padding:18px 0 4px;color:rgb(var(--rgb));text-shadow:0 5px 0 rgba(var(--rgb),.22);animation:blbob 2.6s ease-in-out infinite}
.bl-in .bl-big{animation:blin .55s cubic-bezier(.3,1.6,.5,1),blbob 2.6s .55s ease-in-out infinite}
.bl-shake .bl-big{animation:blshake .45s}
.bl-sub{text-align:center;font-size:21px;font-weight:700;margin:0 0 2px}
.bl-micw{position:relative;display:grid;place-items:center;min-height:56px;margin:18px 0 6px}
.bl-mic{position:relative;width:132px;height:132px;border-radius:50%;border:0;background:linear-gradient(145deg,#ffa63d,#ff6a00);color:#fff;display:grid;place-items:center;box-shadow:0 12px 28px rgba(255,106,0,.45),inset 0 -7px 0 rgba(0,0,0,.12);transition:transform .12s}
.bl-mic:active{transform:scale(.93)}.bl-mic .bl-ic{width:58px;height:58px;stroke-width:2}
.bl-mic:not(.on):not(:disabled){animation:blbeat 2.2s ease-in-out infinite}
.bl-mic.on{background:linear-gradient(145deg,#4cd964,#1e9e45);box-shadow:0 12px 28px rgba(30,158,69,.45),inset 0 -7px 0 rgba(0,0,0,.12)}
.bl-mic.on::before,.bl-mic.on::after{content:'';position:absolute;inset:0;border-radius:50%;border:4px solid #3fcf5f;animation:blring 1.4s ease-out infinite}.bl-mic.on::after{animation-delay:.7s}
.bl-mic:disabled{opacity:.4;box-shadow:none;animation:none}.bl-mic.on:disabled{opacity:1;box-shadow:0 12px 28px rgba(30,158,69,.45),inset 0 -7px 0 rgba(0,0,0,.12)}
.bl-msg{text-align:center;margin:0;font-size:14px;color:var(--mut)}
.bl-fb{border-radius:16px;padding:10px 12px;text-align:center;font-weight:700;font-size:17px;background:rgba(229,57,53,.16);margin-top:10px}
.bl-skip{position:absolute!important;right:2px;top:50%;margin-top:-21px;width:42px;height:42px;border-radius:50%;border:0;background:rgba(var(--rgb),.18);color:var(--tx);display:grid;place-items:center;padding:0}.bl-skip:disabled{opacity:.3}
.bl-two{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}.bl-two .btn{margin:0;display:flex;align-items:center;justify-content:center;gap:8px}
.btn.bl-sec{background:var(--ans);color:var(--tx)}.btn.bl-go{margin-top:10px;width:100%}
.bl-praise{position:fixed;inset:0;display:grid;place-items:center;pointer-events:none;z-index:50}
.bl-praise>div{max-width:84vw;box-sizing:border-box;background:#fff;color:#111;border:4px solid #ffc83d;border-radius:30px;padding:22px 36px;text-align:center;box-shadow:0 18px 50px rgba(0,0,0,.35);animation:blpopin .5s cubic-bezier(.3,1.6,.5,1)}
.bl-praise b{display:block;font-size:38px;color:#e65100}.bl-praise span{display:block;font-size:16px;font-weight:600;margin-top:4px}.bl-praise .bl-em{font-size:20px;letter-spacing:4px}
.bl-fly{position:absolute;bottom:12%;font-size:22px;animation:blfly 1.5s ease-out forwards}
.bl-fld{width:100%;box-sizing:border-box;margin-top:6px;padding:10px;border:1px solid var(--ln);border-radius:10px;background:var(--bg);color:var(--tx);font:inherit}
.bl-par summary{font-weight:600;cursor:pointer}.bl-par>div{margin-top:12px}.bl-row{display:flex;justify-content:space-between;align-items:center;gap:10px;margin:8px 0}
.bl-tbl{width:100%;border-collapse:collapse;font-variant-numeric:tabular-nums}.bl-tbl td{padding:6px 0;border-top:1px solid var(--ln)}.bl-tbl td:last-child{text-align:right}
@keyframes blbob{50%{transform:translateY(-7px)}}@keyframes blin{from{transform:scale(.2) rotate(-12deg);opacity:0}to{transform:none;opacity:1}}
@keyframes blshake{20%,60%{transform:translateX(-10px)}40%,80%{transform:translateX(10px)}}
@keyframes blbeat{50%{transform:scale(1.06)}}@keyframes blring{from{transform:scale(1);opacity:.8}to{transform:scale(1.55);opacity:0}}
@keyframes blfl{50%{transform:translateY(-16px)}}@keyframes blpopin{from{transform:scale(.3);opacity:0}to{transform:none;opacity:1}}
@keyframes blfly{from{transform:translateY(0);opacity:1}to{transform:translateY(-52vh);opacity:0}}
@media(prefers-reduced-motion:reduce){.bl-stage *,.bl-praise *{animation:none!important}}`;
    g.document.head.appendChild(s); return '';
  }

  const MODES = [['alpha', 'A se Z', '#e91e63'], ['table', 'Table', '#2196f3'], ['poem', 'Poem', '#2eaa64'], ['byanjan', 'ব্যঞ্জন', '#8e44ad'], ['saath', 'সাথে বলো', '#e0613a'], ['asvyanjan', 'ক – কল', '#00969f'], ['abc', 'ABC Games', '#f59e0b'], ['abclv', 'ABC Levels', '#16a34a'], ['numg', '123 Games', '#f59e0b'], ['numlv', '123 Levels', '#16a34a'], ['numct', '123 Ginti', '#f59e0b'], ['suno', 'Suno Game', '#f59e0b'], ['swar', 'স্বৰ-বৰ্ণ', '#8e44ad'], ['swarsaath', 'স্বৰ সাথে বলো', '#8e44ad'], ['abcsaath', 'A–Z সাথে বলো', '#e91e63'], ['byanjanpic', 'ছবিৰে সাথে বলো', '#e0613a']];
  const chipRow = (label, arr) => `<div class="chips bl-chips" role="group" aria-label="${label}">${arr.map(m => `<button class="chip" style="--c:${m[3]}" data-bl="${m[0]}" data-v="${m[1]}" aria-pressed="${m[4]}">${m[2]}</button>`).join('')}</div>`;
  const modeChips = () => chipRow('Kya bolna hai', MODES.map(m => ['mode', m[0], m[1], m[2], st.mode === m[0]]));
  function subPick() {   // the second row of chips (table number, or which poem) - still only chips at the top
    if (st.mode === 'table') return chipRow('Kiska table?', C.TABLES.map(t => ['table', t, t, '#2196f3', t === st.table]));
    if (st.mode === 'poem') return chipRow('Kaun si poem?', C.POEMS.map(p => ['poem', p.id, esc(p.title), '#2eaa64', p.id === st.poem]));
    return '';
  }
  // The Shabaash pop-up: it shows by itself and goes by itself (taps pass through it), then the next item comes.
  const praiseHTML = () => st.praise ? `<div class="bl-praise" role="status"><div><b>Shabaash!</b><span>${esc(st.praise)}</span><span class="bl-em" aria-hidden="true">${FLY.slice(0, 5).join(' ')}</span></div>${FLY.concat(FLY).map((e, i) => `<span class="bl-fly" aria-hidden="true" style="left:${6 + i * 8}%;animation-delay:${(i % 4) * 0.12}s">${e}</span>`).join('')}</div>` : '';

  // ---- The "সাথে বলো" topic chip (Saath me bolo): letters play one after another, the mic stays on from the first to the last, a silent letter is a red alert (bolorec.js) ----
  // Needs: the mic switch on. With a Kid-mode code the parent's tick (set.rec) is also needed and the recording goes to that parent; without a code it is practice only and nothing is sent. Nothing is recognised.
  const linked = () => !!(g.KIDLINK && g.KIDLINK.kidCode && g.KIDLINK.kidCode());   // a Kid-mode code is joined: only then can a recording go to a parent's phone
  const recWhy = () => {   // why Start is not available yet ('' = ready); shown to the child so the button is never just missing
    if (!(g.BOLOREC && g.BOLOREC.can())) return 'Is browser me recording nahi chalegi. Chrome ya Safari ka naya version use karo.';
    const s = load().set;
    if (!s.mic) return 'Parent ne mic band kiya hai. Parent section se allow karo.';
    // Not joined to a parent: Start still works as plain practice (nothing is sent anywhere). Joined: the parent's tick is still needed before the recording goes to the parent's phone.
    if (linked() && s.rec !== true) return 'Recording parent ki ijazat se chalti hai. Neeche "Parent ke liye" kholo aur "Saath me bolo" ka tick lagao.';
    return '';
  };
  const recOK = () => !recWhy() && !over();
  // The screen, the recording and the red alerts live in public/saath.js (letters and timings in saath-core.js); this file only checks that Start is allowed.
  function saathCard() {
    if (!g.SAATH) return '<div class="card"><p class="mut" style="margin:0">Ye hissa abhi load nahi hua. Page dobara kholo.</p></div>';
    return g.SAATH.html({ ready: recOK(), why: over() ? '' : recWhy(), sens: load().set.vol, practice: !linked() });
  }
  function saathStart() {
    if (!g.SAATH || g.SAATH.running() || !recOK()) return;
    reset(); stopSay();
    g.SAATH.start({ sens: load().set.vol, code: linked() ? g.KIDLINK.kidCode() : '', api: g.api, redraw: () => { if (onScreen()) redraw(); }, alive: () => onScreen() && st.mode === 'saath' });
  }
  // "স্বৰ সাথে বলো" (Swar saath me bolo): the same thing for the 11 vowels, its own screen and recorder in public/swarsaath.js; the same Start rules (mic switch, parent's tick when joined, practice when not joined).
  function swarSaathCard() {
    if (!g.SWARSAATH) return '<div class="card"><p class="mut" style="margin:0">Ye hissa abhi load nahi hua. Page dobara kholo.</p></div>';
    return g.SWARSAATH.html({ ready: recOK(), why: over() ? '' : recWhy(), sens: load().set.vol, practice: !linked() });
  }
  function swarSaathStart() {
    if (!g.SWARSAATH || g.SWARSAATH.running() || !recOK()) return;
    reset(); stopSay();
    g.SWARSAATH.start({ sens: load().set.vol, code: linked() ? g.KIDLINK.kidCode() : '', api: g.api, redraw: () => { if (onScreen()) redraw(); }, alive: () => onScreen() && st.mode === 'swarsaath' });
  }

  // "ছবিৰে সাথে বলো" (Saath me bolo with pictures): the same 41 letters and the same teacher recording as Saath me bolo, with the picture and word of the AJB book under the big letter. Its own screen and recorder in public/byanjanpic.js; the same Start rules (mic switch, parent's tick when joined, practice when not joined).
  function picSaathCard() {
    if (!g.BYANJANPIC) return '<div class="card"><p class="mut" style="margin:0">Ye hissa abhi load nahi hua. Page dobara kholo.</p></div>';
    return g.BYANJANPIC.html({ ready: recOK(), why: over() ? '' : recWhy(), sens: load().set.vol, practice: !linked() });
  }
  function picSaathStart() {
    if (!g.BYANJANPIC || g.BYANJANPIC.running() || !recOK()) return;
    reset(); stopSay();
    g.BYANJANPIC.start({ sens: load().set.vol, code: linked() ? g.KIDLINK.kidCode() : '', api: g.api, redraw: () => { if (onScreen()) redraw(); }, alive: () => onScreen() && st.mode === 'byanjanpic' });
  }

  // "A–Z সাথে বলো" (ABC saath me bolo): the same thing for the 26 English letters, its own screen and recorder in public/abcsaath.js; the same Start rules (mic switch, parent's tick when joined, practice when not joined).
  function abcSaathCard() {
    if (!g.ABCSAATH) return '<div class="card"><p class="mut" style="margin:0">Ye hissa abhi load nahi hua. Page dobara kholo.</p></div>';
    return g.ABCSAATH.html({ ready: recOK(), why: over() ? '' : recWhy(), sens: load().set.vol, practice: !linked() });
  }
  function abcSaathStart() {
    if (!g.ABCSAATH || g.ABCSAATH.running() || !recOK()) return;
    reset(); stopSay();
    g.ABCSAATH.start({ sens: load().set.vol, code: linked() ? g.KIDLINK.kidCode() : '', api: g.api, redraw: () => { if (onScreen()) redraw(); }, alive: () => onScreen() && st.mode === 'abcsaath' });
  }

  function card() {
    const s = load(), items = list(), it = items[st.i], m = marks(), done = items.filter((_, i) => m[i] === 'd').length, last = st.i >= items.length - 1;
    if (over()) return `<div class="card"><h2 class="sec" style="margin:0 0 6px">Aaj ka time poora hua</h2><p class="mut" style="margin:0">Kal dobara bolenge. Aaj ${today().ok} baar sahi bola.</p><p class="mut" style="margin:10px 0 0">Parent ne roz ki limit ${limTxt(s.set.limit)} rakhi hai.</p></div>`;
    if (st.mode === 'abc') return g.ABC ? g.ABC.viewHTML() : '';   // ABC Games (moved here from the menu) and ABC Levels draw their own page; index.html mounts them after the page is drawn
    if (st.mode === 'abclv') return g.ABCLV ? g.ABCLV.viewHTML() : '';
    if (st.mode === 'numg') return g.NUMG ? g.NUMG.viewHTML() : '';   // 123 Games and 123 Levels: the same way as the ABC topics
    if (st.mode === 'numlv') return g.NUMLV ? g.NUMLV.viewHTML() : '';
    if (st.mode === 'suno') return g.SUNO ? g.SUNO.viewHTML() : '';   // Suno Game: listening games with the teacher's recorded byanjan
    if (st.mode === 'numct') return g.NUMCT ? g.NUMCT.viewHTML() : '';   // 123 Ginti: fruit counting, easy to hard
    if (st.mode === 'swar') return g.SWAR ? g.SWAR.viewHTML() : '';   // Swar-borno: the vowels with the teacher's recording, a picture and a word each
    if (st.mode === 'saath') return saathCard();
    if (st.mode === 'swarsaath') return swarSaathCard();
    if (st.mode === 'abcsaath') return abcSaathCard();
    if (st.mode === 'byanjanpic') return picSaathCard();
    const by = st.mode === 'byanjan', asv = st.mode === 'asvyanjan';
    const big = it.big.length > 5 ? 'font-size:44px' : it.big.length > 3 ? 'font-size:60px' : 'font-size:104px';
    const bigHTML = by && g.BYANJAN_VIDEO ? g.BYANJAN_VIDEO.stageHTML(it, C.PLACES) : `<div class="bl-big" style="${big}">${esc(it.big)}</div>`;
    const micOff = !s.set.mic;
    const aiAsk = (hasKey() || freeAs()) && CAN_REC && !aiTick() ? '<label style="display:flex;gap:10px;align-items:flex-start;margin-top:12px;font-size:13.5px"><input type="checkbox" id="blAiOk" style="margin-top:3px"><span>Parent ki ijazat: AI se jaanch ke liye bachhe ki awaaz Gemini ko jayegi (Orbit save nahi karta). Tick na ho to phone khud check karega.</span></label>' : '';
    const msg = by && !recOn() ? 'Suno, mukh ki taraf dekho, phir khud bolo. Bol diya to "Maine bol diya" dabao.' : micOff ? 'Parent ne mic band kiya hai. Parent section se allow karo.' : st.busy ? (aiOn() ? 'AI sun raha hai...' : 'Awaaz check ho rahi hai...') : recOn() && st.listening ? 'Sun raha hoon... bolo, phir mic dobara dabao' : aiOn() ? 'Mic dabao aur bolo (AI check karega)' : localMatch() ? (by ? 'Mic dabao aur letter bolo' : 'Mic dabao aur bolo: letter aur shabd, jaise "ক, কল"') : !SR ? 'Is browser mein sunne ka feature nahi hai. Chrome ya Edge use karo, ya neeche khud check karo.' : st.listening ? 'Sun raha hoon... bolo' : 'Mic dabao aur bolo';
    const self = (by && !recOn()) || (!by && !SR && !recOn() && !micOff) || ((asv || by) && (st.asMiss || 0) >= 2) ? `<div class="bl-two"><button class="btn" data-bl="self" data-v="1">${ICON.ok}<span>Maine bol diya</span></button><button class="btn bl-sec" data-bl="self" data-v="0">${ICON.redo}<span>Dobara bolunga</span></button></div>` : '';
    const skip = `<button class="bl-skip" data-bl="next" aria-label="Aage" ${last ? 'disabled' : ''}>${ICON.next}</button>`;
    const mic = `<div class="bl-micw">${by && !recOn() ? '' : `<button class="bl-mic ${st.listening ? 'on' : ''}" data-bl="mic" aria-label="Bolo" ${micOff || st.busy || st.praise || (!SR && !recOn()) || (st.listening && !aiRec) ? 'disabled' : ''}>${ICON.mic}</button>`}${skip}</div>`;
    const enter = st.enter; st.enter = false;
    const title = st.mode === 'table' ? st.table + ' ka table' : st.mode === 'poem' ? (C.POEMS.find(p => p.id === st.poem) || C.POEMS[0]).title : by ? 'অসমীয়া ব্যঞ্জন' : asv ? 'ব্যঞ্জন + শব্দ' : 'A se Z';
    return `<div class="bl-stage${enter ? ' bl-in' : ''}${st.fb && !st.fb.ok ? ' bl-shake' : ''}" style="--rgb:${HUES[st.i % HUES.length]}"><i class="bl-bub"></i><i class="bl-bub"></i><i class="bl-bub"></i>
      <div class="bl-top"><span class="bl-ttl">${esc(title)}</span><span class="bl-cnt">${done} / ${items.length}</span></div>
      <div class="bl-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${items.length}" aria-valuenow="${done}"><span style="width:${Math.round(done / items.length * 100)}%"></span></div>
      ${bigHTML}<p class="bl-sub" ${by ? 'lang="as"' : ''}>${by && it.sub === it.big ? '' : esc(it.sub)}</p>
      ${mic}<p class="bl-msg" role="status">${msg}</p>
      ${st.err ? `<p class="err" role="alert" style="text-align:center">${esc(st.err)}</p>` : ''}
      ${st.fb && !st.fb.ok ? `<div class="bl-fb" role="status">${esc(st.fb.t)}</div>` : ''}${self}${aiAsk}</div>${praiseHTML()}`;
  }

  function parent() {
    const s = load(), d = today(), edit = canEdit();
    const lock = hasPin() && !st.unlocked ? `<div class="bl-row" style="display:block"><label class="mut" for="blPin">Badalne ke liye parent PIN daalo</label><input id="blPin" class="bl-fld" type="password" inputmode="numeric" maxlength="4" autocomplete="off" placeholder="4 number"><button class="btn bl-sec bl-go" data-bl="pin" data-v="unlock">Kholo</button></div>` : '';
    const pinBox = edit ? (hasPin()
      ? `<div style="display:block"><label class="mut" for="blPin">PIN hatane ke liye PIN dobara daalo</label><input id="blPin" class="bl-fld" type="password" inputmode="numeric" maxlength="4" autocomplete="off" placeholder="4 number"><button class="btn bl-sec bl-go" data-bl="pin" data-v="remove">PIN hatao</button></div>`
      : `<div style="display:block"><label class="mut" for="blPin">Parent PIN (optional): bachha limit na badal sake</label><input id="blPin" class="bl-fld" type="password" inputmode="numeric" maxlength="4" autocomplete="off" placeholder="4 number"><button class="btn bl-sec bl-go" data-bl="pin" data-v="set">PIN lagao</button></div>`) : '';
    return `<details class="card bl-par" id="blPar" ${st.parOpen ? 'open' : ''}><summary>Parent ke liye</summary><div>
      <p class="mut" style="margin:0 0 10px">Orbit awaaz record ya save nahi karta, na bheje hua text. Sirf "sahi / dobara" ke nishaan, time aur ye settings is phone par rehti hain. Chrome mein sunne ka kaam browser ki voice service karti hai, isliye internet chahiye.</p>
      <div class="bl-row"><span>Aaj Bolo chala</span><b id="blTm">${C.fmtTime(d.sec)}</b></div>
      <div class="bl-row"><label for="blLim">Roz ki limit</label><b id="blLimV">${limTxt(s.set.limit)}</b></div>
      <input id="blLim" type="range" min="5" max="${MAXLIM}" step="5" value="${s.set.limit}" style="width:100%" ${edit ? '' : 'disabled'}>
      <label class="bl-row" style="justify-content:flex-start"><input type="checkbox" id="blMc" ${s.set.mic ? 'checked' : ''} ${edit ? '' : 'disabled'}> Mic allow hai (parent ki ijazat)</label>
      ${g.BOLOREC && g.BOLOREC.can() ? `<label class="bl-row" style="justify-content:flex-start"><input type="checkbox" id="blRc" ${s.set.rec ? 'checked' : ''} ${edit ? '' : 'disabled'}> Byanjan "Saath me bolo": bachhe ki awaaz record hoke parent ke phone par jaye (2 ghante)</label>` : ''}
      <div class="bl-row"><label for="blVol">Saath me bolo: awaaz kitni tez chahiye</label><b id="blVolV">${VOLN[volOf(s.set.vol) - 1]}</b></div>
      <input id="blVol" type="range" min="1" max="5" step="1" value="${volOf(s.set.vol)}" style="width:100%" ${edit ? '' : 'disabled'}>
      <table class="bl-tbl"><tr><td>Aaj boli gayi cheezein</td><td>${d.ok + d.redo}</td></tr><tr><td>Sahi</td><td>${d.ok}</td></tr><tr><td>Dobara karni hain</td><td>${d.redo}</td></tr><tr><td>Ab tak sahi (sab mode)</td><td>${totalDone()}</td></tr></table>
      ${g.KIDLINK ? g.KIDLINK.kidPanelHTML(edit) : ''}
      ${lock}${pinBox}${st.pinMsg ? `<p class="mut" role="status" style="margin:8px 0 0">${esc(st.pinMsg)}</p>` : ''}
    </div></details>`;
  }

  // ---- events ----
  g.document.addEventListener('click', e => {
    const b = e.target && e.target.closest ? e.target.closest('[data-bl]') : null;
    if (!b || b.disabled) return;
    const a = b.dataset.bl, v = b.dataset.v;
    if (a === 'mode') { reset(v); redraw(); if (v === 'byanjan') speak(list()[st.i]); }   // recorded-voice letters have no mic: the voice plays by itself
    else if (a === 'table') { st.table = +v; reset(); redraw(); }
    else if (a === 'poem') { st.poem = v; reset(); redraw(); }
    else if (a === 'next') { stopListen(); stopSay(); clearAdv(); st.i = Math.min(list().length - 1, st.i + 1); st.fb = null; st.err = ''; st.enter = true; redraw(); if (st.mode === 'byanjan') speak(list()[st.i]); }
    else if (a === 'mic') { if (aiRec) aiStop(false); else listen(); }
    else if (a === 'self') mark(v === '1', true);
    else if (a === 'auto') saathStart();
    else if (a === 'autostop') { if (g.SAATH) g.SAATH.stop(); }
    else if (a === 'sauto') swarSaathStart();
    else if (a === 'sautostop') { if (g.SWARSAATH) g.SWARSAATH.stop(); }
    else if (a === 'aauto') abcSaathStart();
    else if (a === 'aautostop') { if (g.ABCSAATH) g.ABCSAATH.stop(); }
    else if (a === 'bpauto') picSaathStart();
    else if (a === 'bpautostop') { if (g.BYANJANPIC) g.BYANJANPIC.stop(); }
    else if (a === 'pin') pinAction(v);
  });
  g.document.addEventListener('change', e => {
    const t = e.target, id = t && t.id;
    if (id === 'blAiOk') { try { t.checked ? g.localStorage.setItem(OKKEY(), '1') : g.localStorage.removeItem(OKKEY()); } catch (e) {} redraw(); }
    else if (id === 'blLim' && canEdit()) { load().set.limit = +t.value; save(); redraw(); }
    else if (id === 'blVol' && canEdit()) { load().set.vol = volOf(t.value); save(); redraw(); }
    else if (id === 'blRc' && canEdit()) { load().set.rec = t.checked; save(); redraw(); }
    else if (id === 'blMc' && canEdit()) { load().set.mic = t.checked; if (!t.checked) stopListen(); save(); redraw(); }
  });
  g.document.addEventListener('input', e => { const t = e.target; if (!t) return; if (t.id === 'blLim') { const l = g.document.getElementById('blLimV'); if (l) l.textContent = limTxt(+t.value); } else if (t.id === 'blVol') { const l = g.document.getElementById('blVolV'); if (l) l.textContent = VOLN[volOf(t.value) - 1]; } });
  g.document.addEventListener('toggle', e => { if (e.target && e.target.id === 'blPar') st.parOpen = e.target.open; }, true);

  g.BOLO = {
    lastFuse: () => st.fuse,   // how the last Assamese attempt was judged: states and a score only, never the words (used by tests)
    viewHTML() {
      style(); load();
      if (!st.fbInit) { st.fbInit = true; st.i = firstOpen(); }
      return `<h1 class="bl-sr">Bolo</h1>${modeChips()}${subPick()}${card()}${parent()}`;
    },
    kidStart() {   // Kid mode (child), first screen of every app open: ABC Levels, at the level the child was last trying to pass. Later redraws and the child's own topic taps are left alone.
      if (st.kidInit) return; st.kidInit = true; st.mode = 'abclv'; st.fbInit = false; if (g.ABCLV && g.ABCLV.openAtLast) g.ABCLV.openAtLast();
    },
    leave() { stopAbc(); if (g.SAATH && g.SAATH.running()) g.SAATH.stop(); if (g.SWARSAATH && g.SWARSAATH.running()) g.SWARSAATH.stop(); if (g.ABCSAATH && g.ABCSAATH.running()) g.ABCSAATH.stop(); if (g.BYANJANPIC && g.BYANJANPIC.running()) g.BYANJANPIC.stop(); stopListen(); stopSay(); clearAdv(); save(); },
    // Kid mode: what the parent's phone may see (no audio, no text), and the limit / mic switch the parent set there.
    // Kid mode: a short label of what the child is doing right now (the topic only), for the mentor's "live activity".
    activity() {
      const OTHER = { abc: 'ABC Games', abclv: 'ABC Levels', numg: '123 Games', numlv: '123 Levels', suno: 'Suno Game', numct: '123 Ginti' };
      if (st.mode === 'table') return 'Table ' + st.table;
      const m = MODES.find(x => x[0] === st.mode); return String((m && m[1]) || OTHER[st.mode] || 'Bolo').slice(0, 40);
    },
    summary() { const d = today(); return { day: C.dayKey(), sec: d.sec, ok: d.ok, redo: d.redo, total: totalDone() }; },
    // Kid mode, for the mentor (read only): the last 7 days (seconds, right, repeat) and the items still to repeat, as labels only.
    report() {
      const s = load(), days = Object.keys(s.days).sort().slice(-7).map(k => ({ d: k, b: Math.round(+s.days[k].sec || 0), k: +s.days[k].ok || 0, r: +s.days[k].redo || 0 }));
      const NAME = { alpha: 'A se Z', byanjan: 'ব্যঞ্জন', saath: 'সাথে বলো', asv: 'ক – কল' }, weak = [];
      Object.keys(s.prog).forEach(k => {
        let items = null, name = NAME[k];
        if (k === 'alpha') items = C.items('alpha'); else if (k === 'byanjan') items = C.items('byanjan'); else if (k === 'saath') items = C.items('saath'); else if (k === 'asv') items = C.items('asvyanjan');
        else if (/^t\d+$/.test(k)) { items = C.items('table', { table: +k.slice(1) }); name = 'Table ' + k.slice(1); }
        else if (/^p-/.test(k)) { items = C.items('poem', { poem: k.slice(2) }); name = 'Poem'; }
        if (!items) return;
        const l = Object.keys(s.prog[k]).filter(i => s.prog[k][i] === 'r' && items[+i]).slice(0, 12).map(i => String(items[+i].big).replace(/[<>&"']/g, '').slice(0, 8));
        if (l.length) weak.push({ t: name, l });
      });
      return { days, weak: weak.slice(0, 8) };
    },
    applyRemote(set) { const s = load(); if (set && set.limit) s.set.limit = Math.min(MAXLIM, Math.max(5, Math.round(+set.limit / 5) * 5)); if (set && set.vol != null) s.set.vol = volOf(set.vol); if (set && typeof set.mic === 'boolean') { s.set.mic = set.mic; if (!set.mic) stopListen(); } if (set && typeof set.rec === 'boolean') s.set.rec = set.rec; save(); redraw(); },
    _reset() { stopListen(); clearAdv(); store = null; Object.assign(st, { mode: 'alpha', table: 2, poem: C.POEMS[0].id, i: 0, fb: null, err: '', unlocked: false, parOpen: false, pinMsg: '', fbInit: false, kidInit: false, aiOff: false, busy: false, enter: true }); }
  };
})();
