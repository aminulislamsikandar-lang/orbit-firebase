// public/voice-tutor.js - Phase 5 voice tutor: "Padhna check" (Task 27), "Baat-cheet" (Task 30) and the speaking helper VOICE.speak (Task 29, used by the Suno button).
// Reading check and Baat-cheet work only with the parent's Gemini key (the parent pays the AI). Orbit never saves the recordings: a clip lives in memory until it is sent.
// The AI voice is used only when the phone has no voice for the language (or the student chose "always AI voice" in Settings) and a parent key is set.
(function () {
  'use strict';
  const g = window;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const redraw = () => { if (typeof g.draw === 'function') g.draw(); };
  const uid = () => (typeof USER !== 'undefined' && USER && USER.uid) || '';
  const hasKey = () => !!(g.PARENT_KEY && g.PARENT_KEY.has && g.PARENT_KEY.has());
  const LANGS = { hi: 'Hindi', en: 'English', as: 'Assamese', bn: 'Bengali' };
  const LOCALE = { hi: 'hi-IN', en: 'en-IN', as: 'as-IN', bn: 'bn-IN' };
  const SRC = { Hindi: 'hi', Assamese: 'as', Bengali: 'bn' };
  const MAX_REC = 60, MAX_BYTES = 800000, TTS_CHUNK = 450, TTS_CHUNKS = 3, CACHE_MAX = 20;

  // ================= Task 29: speaking =================
  const ttsMode = () => (typeof ST !== 'undefined' && ST && (ST.tts === 'ai' || ST.tts === 'browser')) ? ST.tts : 'auto';
  const canBrowser = () => !!(g.speechSynthesis && g.SpeechSynthesisUtterance);
  let playing = null, tok = 0;
  const cache = new Map();

  function loadVoices() {
    return new Promise(ok => {
      if (!canBrowser()) return ok([]);
      const now = g.speechSynthesis.getVoices();
      if (now.length) return ok(now);
      let done = false; const fin = () => { if (done) return; done = true; try { g.speechSynthesis.removeEventListener('voiceschanged', fin); } catch (e) {} ok(g.speechSynthesis.getVoices()); };
      try { g.speechSynthesis.addEventListener('voiceschanged', fin); } catch (e) {}
      setTimeout(fin, 900);
    });
  }
  const voiceFor = (voices, lang) => voices.find(v => String(v.lang || '').toLowerCase().replace('_', '-').split('-')[0] === lang) || null;

  // Whole text -> pieces of at most TTS_CHUNK characters, cut at a sentence end where possible.
  function chunk(text, max) {
    const out = []; let rest = String(text || '').replace(/\s+/g, ' ').trim();
    while (rest.length > max) {
      let cut = Math.max(rest.lastIndexOf('. ', max), rest.lastIndexOf('। ', max), rest.lastIndexOf('? ', max), rest.lastIndexOf('! ', max));
      if (cut < max * 0.4) cut = rest.lastIndexOf(' ', max);
      if (cut < 1) cut = max;
      out.push(rest.slice(0, cut + 1).trim()); rest = rest.slice(cut + 1).trim();
    }
    if (rest) out.push(rest);
    return out;
  }
  const blobUrl = b64 => { const bin = g.atob(b64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return g.URL.createObjectURL(new g.Blob([u], { type: 'audio/wav' })); };

  function stop() {
    tok++;
    try { if (canBrowser()) g.speechSynthesis.cancel(); } catch (e) {}
    if (playing) { try { playing.pause(); } catch (e) {} playing = null; }
  }
  function playBrowser(text, lang, voice, myTok) {
    return new Promise(ok => {
      try {
        const u = new g.SpeechSynthesisUtterance(text); u.lang = LOCALE[lang] || 'en-IN'; if (voice) u.voice = voice; u.rate = 0.9;
        u.onend = () => ok({ ok: true, via: 'browser' }); u.onerror = () => ok(myTok === tok ? { ok: false, error: 'Browser awaaz nahi chala paya.' } : { ok: true });
        g.speechSynthesis.cancel(); g.speechSynthesis.speak(u);
      } catch (e) { ok({ ok: false, error: 'Browser awaaz nahi chala paya.' }); }
    });
  }
  async function aiPiece(text, lang) {
    const k = lang + '|' + text;
    if (!cache.has(k)) {
      const j = await g.api('/api/tts', { text, lang });
      cache.set(k, j.audio); if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value);
    }
    return cache.get(k);
  }
  function playBlob(b64, myTok) {
    return new Promise(ok => {
      let url; try { url = blobUrl(b64); } catch (e) { return ok({ ok: false, error: 'AI awaaz chal nahi payi.' }); }
      const a = new g.Audio(url); playing = a;
      const end = r => { try { g.URL.revokeObjectURL(url); } catch (e) {} if (playing === a) playing = null; ok(r); };
      a.onended = () => end({ ok: true, via: 'ai' }); a.onerror = () => end(myTok === tok ? { ok: false, error: 'AI awaaz chal nahi payi.' } : { ok: true });
      a.play().catch(() => end({ ok: false, error: 'Browser ne awaaz chalne nahi di. Screen par ek baar tap karke dobara try karo.' }));
    });
  }
  // speak(text, lang): resolves {ok, via, error}. Never throws. A newer speak() or stop() ends the older one.
  async function speak(text, lang) {
    lang = LANGS[lang] ? lang : 'en';
    stop(); const my = tok;
    const t = String(text || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    if (!t) return { ok: true };
    const mode = ttsMode(), voice = canBrowser() ? voiceFor(await loadVoices(), lang) : null;
    if (my !== tok) return { ok: true };
    const useAi = hasKey() && (mode === 'ai' || (mode === 'auto' && !voice));
    if (!useAi) {
      if (!voice && mode !== 'browser' && !hasKey() && lang !== 'en' && lang !== 'hi') return { ok: false, error: 'Is phone mein ' + LANGS[lang] + ' awaaz nahi hai. Parent ki Gemini key lagao (Advanced AI Features), tab AI awaaz mein sunai degi.' };
      if (!canBrowser()) return { ok: false, error: 'Is browser mein sunne ki suvidha nahi hai.' };
      return playBrowser(t, lang, voice, my);
    }
    try {
      const pieces = chunk(t, TTS_CHUNK).slice(0, TTS_CHUNKS);
      for (let i = 0; i < pieces.length; i++) {
        const b64 = await aiPiece(pieces[i], lang);
        if (my !== tok) return { ok: true };
        const r = await playBlob(b64, my);
        if (!r.ok || my !== tok) return r;
      }
      return { ok: true, via: 'ai' };
    } catch (e) {
      if (my !== tok) return { ok: true };
      if (voice && canBrowser() && mode !== 'ai') return playBrowser(t, lang, voice, my);   // AI voice failed: the phone's own voice still works
      return { ok: false, error: (e && e.message) || 'AI awaaz abhi nahi ban payi.' };
    }
  }

  // ================= recording (memory only) =================
  const CAN = !!(g.navigator && g.navigator.mediaDevices && g.navigator.mediaDevices.getUserMedia && g.MediaRecorder);
  const OKKEY = () => 'orbit.voice.ok.' + uid();
  const voiceOk = () => { try { return g.localStorage.getItem(OKKEY()) === '1'; } catch (e) { return false; } };
  const setVoiceOk = v => { try { v ? g.localStorage.setItem(OKKEY(), '1') : g.localStorage.removeItem(OKKEY()); } catch (e) {} };
  const rec = { on: false, sec: 0, clip: null, err: '' };
  let mr = null, stream = null, tick = null, chunks = [], bytes = 0, discard = false;
  const pickMime = () => ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'].find(m => g.MediaRecorder.isTypeSupported && g.MediaRecorder.isTypeSupported(m)) || '';
  const toBase64 = blob => new Promise((ok, no) => { const f = new g.FileReader(); f.onload = () => ok(String(f.result).split(',')[1] || ''); f.onerror = () => no(new Error('Recording padh nahi paye. Dobara record karo.')); f.readAsDataURL(blob); });
  function micOff() { try { stream && stream.getTracks().forEach(t => t.stop()); } catch (e) {} stream = null; }
  function stopRec(msg, drop) {
    clearInterval(tick); tick = null; discard = !!drop;
    if (msg) rec.err = msg;
    rec.on = false;
    try { if (mr && mr.state !== 'inactive') mr.stop(); } catch (e) {}
    micOff(); mr = null;
    if (drop) rec.clip = null;
    redraw();
  }
  async function startRec(onClip) {
    if (rec.on) return;
    stop();   // the tutor must not talk while the child is recording
    if (!CAN) { rec.err = 'Is browser mein recording nahi chalegi. Chrome ya Edge use karo.'; return redraw(); }
    if (!voiceOk()) { rec.err = 'Pehle parent ki ijazat wala box tick karo.'; return redraw(); }
    rec.err = '';
    try { stream = await g.navigator.mediaDevices.getUserMedia({ audio: true }); }
    catch (e) { rec.err = e && (e.name === 'NotAllowedError' || e.name === 'SecurityError') ? 'Browser ne mic ki ijazat nahi di. Address bar mein mic allow karo.' : 'Mic nahi mila. Mic lagaa hai ya nahi dekho.'; return redraw(); }
    let r; const mime = pickMime();
    try { r = new g.MediaRecorder(stream, Object.assign({ audioBitsPerSecond: 24000 }, mime ? { mimeType: mime } : {})); }
    catch (e) { micOff(); rec.err = 'Mic shuru nahi ho paya. Dobara try karo.'; return redraw(); }
    chunks = []; bytes = 0; discard = false; rec.clip = null;
    r.ondataavailable = e => { if (e.data && e.data.size) { chunks.push(e.data); bytes += e.data.size; if (bytes > MAX_BYTES && rec.on) stopRec('Recording bahut badi ho gayi, isliye ruk gayi.'); } };
    r.onerror = () => stopRec('Recording mein gadbad hui. Dobara try karo.');
    r.onstop = () => {
      if (!discard && chunks.length) { rec.clip = { blob: new g.Blob(chunks, { type: (mime || r.mimeType || 'audio/webm') }), sec: rec.sec }; if (onClip) onClip(); }
      chunks = []; redraw();
    };
    mr = r; rec.on = true; rec.sec = 0;
    try { r.start(1000); } catch (e) { mr = null; rec.on = false; micOff(); rec.err = 'Mic shuru nahi ho paya. Dobara try karo.'; return redraw(); }
    tick = setInterval(() => {
      if (g.document.hidden) return stopRec('', true);
      rec.sec++; const el = g.document.getElementById('vtTimer'); if (el) el.textContent = rec.sec + ' s';
      if (rec.sec >= MAX_REC) stopRec('Time poora hua (' + MAX_REC + ' second).');
    }, 1000);
    redraw();
  }
  const audioBody = async clip => ({ mime: String(clip.blob.type || 'audio/webm').split(';')[0], data: await toBase64(clip.blob) });

  // ================= chapters =================
  const courses = () => { const d = typeof DATA !== 'undefined' ? DATA : null; return d && Array.isArray(d.courses) ? d.courses : []; };
  const notesOk = ch => String((ch && ch.notes) || '').trim().length >= 200;
  const ready = (ch, c) => c.custom ? notesOk(ch) : (!!ch && !ch.locked && Array.isArray(ch.sections) && ch.sections.length > 0);
  function current(key) { for (const c of courses()) for (const ch of (c.chapters || [])) if (c.id + '|' + ch.no === key) return { c, ch }; return null; }
  const defLang = c => SRC[c && c.sourceLang] || 'en';
  const ctxBody = (cur) => cur.c.custom
    ? { custom: { cls: cur.c.class, subject: cur.c.subject, chapter: cur.ch.title, notes: g.CUSTOM && g.CUSTOM.pickNotes ? g.CUSTOM.pickNotes(cur.ch.notes, cur.ch.title, 14000) : String(cur.ch.notes || '').slice(0, 14000) } }
    : { course: cur.c.id, ch: cur.ch.no };
  function picker(S, busy) {
    const opts = courses().map(c => `<optgroup label="${esc('Class ' + c.class + ' ' + c.subject)}">${(c.chapters || []).filter(ch => ready(ch, c)).map(ch => { const v = c.id + '|' + ch.no; return `<option value="${esc(v)}" ${v === S.key ? 'selected' : ''}>${esc('Ch ' + ch.no + ': ' + ch.title)}</option>`; }).join('')}</optgroup>`).join('').replace(/<optgroup[^>]*><\/optgroup>/g, '');
    return `<label class="rsub" for="vtTopic">Chapter</label>
      <select id="vtTopic" class="rsel" ${busy ? 'disabled' : ''}><option value="">Chapter chuno…</option>${opts}</select>
      <label class="rsub" for="vtLang" style="margin-top:8px">Bhasha</label>
      <select id="vtLang" class="rsel" ${busy ? 'disabled' : ''}>${Object.keys(LANGS).map(k => `<option value="${k}" ${k === S.lang ? 'selected' : ''}>${LANGS[k]}</option>`).join('')}</select>`;
  }
  const gate = () => !hasKey()
    ? `<div class="card"><p>Ye feature parent ki Gemini key ke saath chalta hai, kyunki AI bachhe ki awaaz sunta hai.</p><button class="btn" data-vt="adv">Advanced AI Features kholein</button></div>`
    : '';
  const consent = () => (CAN && !voiceOk()) ? `<label style="display:flex;gap:10px;align-items:flex-start;margin:10px 0;font-size:13.5px"><input type="checkbox" id="vtOk" style="margin-top:3px"><span>Parent ki ijazat: bachhe ki awaaz AI (Gemini) ko bheji jayegi. Orbit ise save nahi karta.</span></label>` : '';
  const recBar = (label, busy, S) => `<div class="ccrow"><button class="btn" data-vt="${rec.on ? 'stop' : 'rec'}" ${busy || (!rec.on && (!voiceOk() || !CAN)) ? 'disabled' : ''} aria-pressed="${rec.on}">${rec.on ? 'Stop' : '🎙 ' + label}</button>${rec.on ? '<span id="vtTimer" class="mut" role="timer">' + rec.sec + ' s</span>' : ''}</div>${rec.err ? `<p class="err" role="alert">${esc(rec.err)}</p>` : ''}`;

  // ================= Task 27: reading check =================
  const R = { key: '', lang: 'hi', passage: null, n: 0, busy: false, err: '', res: null };
  const wordKey = w => String(w).toLowerCase().replace(/[^\p{L}\p{M}\p{N}]/gu, '');
  function passageHTML(text, res) {
    const bad = new Set(), skip = new Set();
    if (res) { (res.wrong || []).forEach(x => bad.add(wordKey(x.word))); (res.missed || []).forEach(x => skip.add(wordKey(x))); }
    return String(text).split(/(\s+)/).map(w => { const k = wordKey(w); return !k ? esc(w) : bad.has(k) ? `<mark class="vtbad">${esc(w)}</mark>` : skip.has(k) ? `<mark class="vtskip">${esc(w)}</mark>` : esc(w); }).join('');
  }
  async function loadPassage(n) {
    const cur = current(R.key); if (!cur) return;
    R.busy = true; R.err = ''; R.res = null; rec.clip = null; rec.err = ''; redraw();
    try { const j = await g.api('/api/read/passage', { ...ctxBody(cur), n }); R.passage = j; R.n = j.n; }
    catch (e) { R.passage = null; R.err = e.message; }
    R.busy = false; redraw();
  }
  async function checkReading() {
    const cur = current(R.key); if (!cur || !R.passage || !rec.clip || R.busy) return;
    R.busy = true; R.err = ''; redraw();
    try { const j = await g.api('/api/read/evaluate', { ...ctxBody(cur), n: R.passage.n, lang: R.lang, audio: await audioBody(rec.clip) }); R.res = j; rec.clip = null; }
    catch (e) { R.err = e.message; }
    R.busy = false; redraw();
  }
  function readView() {
    const g1 = gate(); if (g1) return `<h1>Padhne ki jaanch</h1>${g1}`;
    const p = R.passage, res = R.res;
    let h = `<h1>Padhne ki jaanch</h1><p class="mut">Chapter ka ek chhota hissa zor se padho. AI sunega aur batayega kaun se shabd galat bole gaye.</p>${picker(R, R.busy || rec.on)}`;
    h += `<div class="ccrow" style="margin-top:10px"><button class="btn" data-vt="rpass" ${R.busy || rec.on || !R.key ? 'disabled' : ''}>${p ? 'Naya paath' : 'Paath dikhao'}</button></div>`;
    if (R.err) h += `<p class="err" role="alert">${esc(R.err)}</p>`;
    if (p) {
      h += `<div class="card vtpass" lang="${R.lang}" style="font-size:1.25em;line-height:1.7">${passageHTML(p.text, res)}</div>
        <div class="ccrow"><button class="btn alt" data-vt="rsay" ${R.busy || rec.on ? 'disabled' : ''}>🔊 Sunao</button></div>${consent()}${recBar('Padhna shuru', R.busy, R)}`;
      if (rec.clip && !rec.on) h += `<p>Recording ready (${rec.clip.sec} s). <button class="btn" data-vt="rcheck" ${R.busy ? 'disabled' : ''}>${R.busy ? 'AI sun raha hai…' : 'Check karo'}</button> <button class="chip" data-vt="clipdel" style="cursor:pointer">Hatao</button></p>`;
    }
    if (res) {
      if (res.unclear) h += `<div class="card"><p>Awaaz saaf sunai nahi di ya paath se match nahi hui. Dobara, thoda zor se padho.</p></div>`;
      else h += `<div class="card" role="status"><h2 class="sec" style="margin-top:0">${res.accuracy}% sahi</h2>${res.praise ? `<p>${esc(res.praise)}</p>` : ''}
        ${res.wrong.length ? `<p><b>Galat bole gaye shabd</b></p><ul>${res.wrong.map(x => `<li><mark class="vtbad">${esc(x.word)}</mark>${x.said ? ' (tumne bola: ' + esc(x.said) + ')' : ''}${x.say ? ' → sahi: <b>' + esc(x.say) + '</b>' : ''}</li>`).join('')}</ul>` : '<p>Koi galat shabd nahi mila. Shabaash!</p>'}
        ${res.missed.length ? `<p><b>Chhoot gaye shabd:</b> ${res.missed.map(x => `<mark class="vtskip">${esc(x)}</mark>`).join(' ')}</p>` : ''}${res.tip ? `<p class="mut">${esc(res.tip)}</p>` : ''}
        <div class="ccrow"><button class="btn alt" data-vt="rtry">Dobara padho</button><button class="btn" data-vt="rnext">Agla paath</button></div></div>`;
    }
    return h;
  }

  // ================= Task 30: short conversation =================
  const T = { key: '', lang: 'hi', total: 4, turn: 0, asked: [], q: '', log: [], phase: 'idle', busy: false, err: '', summary: '', fb: null };
  const tbody = (cur, extra) => ({ ...ctxBody(cur), lang: T.lang, total: T.total, turn: T.turn, asked: T.asked, prevQ: T.q, ...extra });
  async function sayAndNote(text) { const r = await speak(text, T.lang); if (r && r.error) { T.err = r.error; redraw(); } }
  async function talkStart() {
    const cur = current(T.key); if (!cur) return;
    Object.assign(T, { turn: 0, asked: [], q: '', log: [], phase: 'asking', busy: true, err: '', summary: '', fb: null }); rec.clip = null; rec.err = ''; redraw();
    try {
      const j = await g.api('/api/talk/turn', tbody(cur, { turn: 0, asked: [], prevQ: '' }));
      T.q = j.next; T.asked = [j.next]; T.phase = 'wait'; T.busy = false; redraw(); sayAndNote(j.next);
    } catch (e) { T.err = e.message; T.phase = 'idle'; T.busy = false; redraw(); }
  }
  async function talkSend() {
    const cur = current(T.key); if (!cur || !rec.clip || T.busy) return;
    T.busy = true; T.err = ''; T.phase = 'think'; redraw();
    try {
      const done = T.turn + 1;
      const j = await g.api('/api/talk/turn', tbody(cur, { turn: done, audio: await audioBody(rec.clip) }));
      rec.clip = null; T.log.push({ q: T.q, verdict: j.verdict, heard: j.heard, feedback: j.feedback }); T.turn = done; T.fb = j;
      if (j.done) { T.phase = 'done'; T.summary = j.summary; T.busy = false; redraw(); sayAndNote((j.feedback || '') + ' ' + (j.summary || '')); }
      else { T.q = j.next; T.asked = T.asked.concat([j.next]).slice(0, 5); T.phase = 'wait'; T.busy = false; redraw(); sayAndNote((j.feedback || '') + ' ' + j.next); }
    } catch (e) { T.err = e.message; T.phase = 'wait'; T.busy = false; redraw(); }
  }
  const VW = { sahi: '✅ Sahi', adhoora: '🟡 Adhoora', galat: '❌ Dobara dekho' };
  function talkView() {
    const g1 = gate(); if (g1) return `<h1>Baat-cheet</h1>${g1}`;
    let h = `<h1>Baat-cheet</h1><p class="mut">Tutor sawaal poochhega, tum bol kar jawab do. ${T.total} sawaal ki chhoti baat-cheet, type karne ki zaroorat nahi.</p>${picker(T, T.busy || rec.on)}`;
    if (T.phase === 'idle' || T.phase === 'done') h += `<div class="ccrow" style="margin-top:10px"><button class="btn" data-vt="tstart" ${T.busy || !T.key ? 'disabled' : ''}>${T.phase === 'done' ? 'Nayi baat-cheet' : 'Shuru karo'}</button></div>`;
    if (T.err) h += `<p class="err" role="alert">${esc(T.err)}</p>`;
    if (T.phase === 'asking') h += '<p role="status">Tutor soch raha hai…</p>';
    if (T.phase === 'wait' || T.phase === 'think') {
      h += `<div class="card" role="status"><p class="mut" style="margin:0">Sawaal ${T.turn + 1} / ${T.total}</p><p style="font-size:1.2em;margin:6px 0" lang="${T.lang}">${esc(T.q)}</p>
        <button class="btn alt" data-vt="tsay" ${T.busy || rec.on ? 'disabled' : ''}>🔊 Dobara suno</button></div>${consent()}${recBar('Jawab bolo', T.busy, T)}`;
      if (rec.clip && !rec.on) h += `<p>Recording ready (${rec.clip.sec} s). <button class="btn" data-vt="tsend" ${T.busy ? 'disabled' : ''}>${T.busy ? 'AI sun raha hai…' : 'Jawab bhejo'}</button> <button class="chip" data-vt="clipdel" style="cursor:pointer">Hatao</button></p>`;
    }
    if (T.log.length) {
      h += `<h2 class="sec">Ab tak</h2>` + T.log.map(x => `<div class="card"><p class="mut" style="margin:0">${esc(x.q)}</p>${x.heard ? `<p style="margin:4px 0">Tumne kaha: ${esc(x.heard)}</p>` : ''}<p style="margin:4px 0"><b>${VW[x.verdict] || ''}</b> ${esc(x.feedback)}</p></div>`).join('');
      if (T.phase === 'done') {
        const n = T.log.filter(x => x.verdict === 'sahi').length;
        h += `<div class="card"><h2 class="sec" style="margin-top:0">${n} / ${T.log.length} sahi</h2>${T.summary ? `<p>${esc(T.summary)}</p>` : ''}</div>`;
      }
    }
    return h;
  }

  // ================= events =================
  g.document.addEventListener('change', e => {
    const t = e.target; if (!t) return;
    const S = (typeof VIEW !== 'undefined' && VIEW === 'talk') ? T : (typeof VIEW !== 'undefined' && VIEW === 'read') ? R : null;
    if (t.id === 'vtOk') { setVoiceOk(t.checked); rec.err = ''; redraw(); }
    else if (S && t.id === 'vtTopic') { S.key = t.value; const cur = current(S.key); if (cur) S.lang = defLang(cur.c); if (S === R) { R.passage = null; R.res = null; R.err = ''; } else Object.assign(T, { phase: 'idle', turn: 0, asked: [], q: '', log: [], summary: '', err: '' }); rec.clip = null; redraw(); }
    else if (S && t.id === 'vtLang') { S.lang = t.value; redraw(); }
  });
  g.document.addEventListener('click', e => {
    const b = e.target && e.target.closest ? e.target.closest('[data-vt]') : null;
    if (!b || b.disabled) return;
    const a = b.dataset.vt;
    if (a === 'adv') { if (typeof g.go === 'function') g.go('ai'); }
    else if (a === 'rec') startRec();
    else if (a === 'stop') stopRec('');
    else if (a === 'clipdel') { rec.clip = null; rec.sec = 0; redraw(); }
    else if (a === 'rpass') loadPassage(R.passage ? R.n + 1 : 0);
    else if (a === 'rnext') loadPassage(R.n + 1);
    else if (a === 'rtry') { R.res = null; rec.clip = null; redraw(); }
    else if (a === 'rsay') { if (R.passage) speak(R.passage.text, R.lang).then(r => { if (r && r.error) { R.err = r.error; redraw(); } }); }
    else if (a === 'rcheck') checkReading();
    else if (a === 'tstart') talkStart();
    else if (a === 'tsay') sayAndNote(T.q);
    else if (a === 'tsend') talkSend();
  });
  g.document.addEventListener('visibilitychange', () => { if (g.document.hidden && rec.on) stopRec('', true); });
  g.addEventListener('pagehide', () => { if (rec.on) stopRec('', true); });

  (function css() {
    const st = g.document.createElement('style');
    st.textContent = '.vtbad{background:#fecaca;color:#7f1d1d;border-radius:4px;padding:0 2px}.vtskip{background:#fde68a;color:#78350f;border-radius:4px;padding:0 2px}.vtpass{word-break:break-word}';
    g.document.head.appendChild(st);
  })();

  g.VOICE = {
    speak, stop, chunk, canBrowser,
    viewHTML(kind) { return kind === 'talk' ? talkView() : readView(); },
    leave() { if (rec.on) stopRec('', true); rec.clip = null; stop(); },   // the mic and the voice must never stay on after the student leaves the screen
    _t: { passageHTML, wordKey, ctxBody, state: { R, T, rec } }
  };
})();
