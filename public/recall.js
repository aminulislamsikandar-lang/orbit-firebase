// public/recall.js - Recall AI screen: the student explains a chapter from memory, the server scores it (POST /api/recall/evaluate).
// index.html calls RECALL.viewHTML() for the "Recall AI" page. Scores are kept on THIS device only (per account), never the typed text.
(function () {
  'use strict';
  const g = window;
  const PREFIX = 'orbit.recall.';
  const KEEP = 300;
  const TYPES = { concept: 'Concept', fact: 'Fact / definition', reason: 'Reasoning' };
  const CRIT = { c: 'Conceptual understanding', f: 'Factual accuracy', t: 'Topic coverage', l: 'Logical explanation', m: 'Terminology' };
  const W = { concept: { c: 30, f: 25, t: 20, l: 15, m: 10 }, fact: { c: 15, f: 40, t: 25, l: 5, m: 15 }, reason: { c: 25, f: 20, t: 15, l: 30, m: 10 } };   // shown as hints only; the server decides
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const redraw = () => { if (typeof g.draw === 'function') g.draw(); };
  const uid = () => (typeof USER !== 'undefined' && USER && USER.uid) || '';
  const read = () => { try { const a = JSON.parse(g.localStorage.getItem(PREFIX + uid()) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } };
  const write = a => { try { g.localStorage.setItem(PREFIX + uid(), JSON.stringify(a.slice(-KEEP))); } catch (e) {} };

  const st = { key: '', type: 'concept', text: '', busy: false, err: '', res: null, left: null, quotaFor: '' };

  // ---- Voice: the student's answer is recorded in the browser and sent to the AI (Gemini) with the request. Orbit does not save it. ----
  // The clip lives in memory only until Evaluate is done (or the student removes it). Hindi, English, Assamese and Bengali can be spoken.
  const CAN = !!(g.navigator && g.navigator.mediaDevices && g.navigator.mediaDevices.getUserMedia && g.MediaRecorder);
  const MAX_REC = 120;                                    // seconds: a recording stops by itself here
  const MAX_BYTES = 900000;                               // safety stop if a browser ignores the low bitrate (server limit is 1,000,000)
  const MAX_CHARS = 1500;
  const LANGS = { hi: 'Hindi', en: 'English', as: 'Assamese', bn: 'Bengali' };
  const rc = { on: false, sec: 0, lang: 'hi', err: '', clip: null };
  let mr = null, stream = null, tick = null, chunks = [], bytes = 0, discard = false;

  // Two ways to speak (the student picks in Settings > Recall AI voice, saved as ST.rvoice):
  //  'ai'   the recording goes to the AI (Gemini). Works for Hindi, English, Assamese and Bengali.
  //  'text' the browser turns speech into text and the words land in the box (Chrome / Edge). Only that text goes to the AI. The student can fix it first.
  const mode = () => (typeof ST !== 'undefined' && ST && ST.rvoice === 'text') ? 'text' : 'ai';
  const SR = g.SpeechRecognition || g.webkitSpeechRecognition;
  const TLANG = { hi: 'hi-IN', en: 'en-IN', as: 'as-IN', bn: 'bn-IN' };
  const canRec = () => mode() === 'text' ? !!SR : CAN;
  let recog = null, base = '', fin = '';
  const fmt = n => Math.floor(n / 60) + ':' + String(n % 60).padStart(2, '0');
  const OKKEY = () => PREFIX + 'voiceok.' + uid();
  const voiceOk = () => { try { return g.localStorage.getItem(OKKEY()) === '1'; } catch (e) { return false; } };
  const setVoiceOk = v => { try { v ? g.localStorage.setItem(OKKEY(), '1') : g.localStorage.removeItem(OKKEY()); } catch (e) {} };
  const pickMime = () => ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'].find(m => { try { return g.MediaRecorder.isTypeSupported(m); } catch (e) { return false; } }) || '';

  function showTimer() {
    const el = g.document.getElementById('rcTimer');
    if (el) el.textContent = fmt(rc.sec) + ' / ' + fmt(MAX_REC);
  }
  function micOff() { if (stream) { try { stream.getTracks().forEach(t => t.stop()); } catch (e) {} stream = null; } }
  // keep=false: throw the recording away (screen changed). The mic is always switched off right here.
  function stopVoice(msg, keep) {
    const was = rc.on;
    rc.on = false; discard = keep === false;
    if (tick) { clearInterval(tick); tick = null; }
    if (mr) { const r = mr; mr = null; try { if (r.state !== 'inactive') r.stop(); } catch (e) {} }
    if (recog) { const r = recog; recog = null; r.onresult = r.onerror = r.onend = null; try { r.stop(); } catch (e) {} }
    micOff();
    if (msg !== undefined) rc.err = msg;
    if (was) redraw();
  }
  function fillBox(interim) {
    st.text = (base + fin + (interim || '')).slice(0, MAX_CHARS);
    const ta = g.document.getElementById('rcText');
    if (ta && ta.value !== st.text) ta.value = st.text;
  }
  function startTick() {
    tick = setInterval(() => {
      if (!g.document.getElementById('rcText') || g.document.hidden) return stopVoice('', g.document.getElementById('rcText') ? true : false);   // screen changed: drop it. Tab hidden: keep it.
      rc.sec++; showTimer();
      if (rc.sec >= MAX_REC) stopVoice('Time poora hua (' + fmt(MAX_REC) + ').' + (mode() === 'ai' ? ' Recording ready hai.' : ''));
    }, 1000);
  }
  function startText() {
    if (!SR) { rc.err = 'Is browser mein voice-to-text nahi chalega. Chrome ya Edge use karo, ya Settings mein "AI ko recording bhejo" chuno, ya type karo.'; return redraw(); }
    let r; try { r = new SR(); } catch (e) { rc.err = 'Mic shuru nahi ho paya. Dobara try karo.'; return redraw(); }
    base = st.text && !/\s$/.test(st.text) ? st.text + ' ' : st.text; fin = ''; rc.err = '';
    r.lang = TLANG[rc.lang] || 'en-IN'; r.continuous = true; r.interimResults = true; r.maxAlternatives = 1;
    r.onresult = e => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) fin += t.trim() + ' '; else interim += t;
      }
      fillBox(interim);
    };
    r.onerror = e => {
      const c = e && e.error;
      if (c === 'no-speech' || c === 'aborted') return;   // onend decides what happens next
      stopVoice(c === 'not-allowed' || c === 'service-not-allowed' ? 'Browser ne mic ki ijazat nahi di. Address bar mein mic allow karo.'
        : c === 'audio-capture' ? 'Mic nahi mila. Mic lagaa hai ya nahi dekho.'
        : c === 'language-not-supported' ? 'Is language ke liye browser voice-to-text nahi chalega. Settings mein "AI ko recording bhejo" chuno.'
        : c === 'network' ? 'Internet check karo, phir dobara try karo.' : 'Voice band ho gayi. Dobara try karo.');
    };
    // Chrome ends a session after a short silence: while the student is still recording, start it again so the timer and the text carry on.
    r.onend = () => {
      if (recog !== r || !rc.on) return;
      try { r.start(); } catch (e) { stopVoice('Voice band ho gayi. Dobara try karo.'); }
    };
    recog = r; rc.on = true; rc.sec = 0; rc.clip = null;
    try { r.start(); } catch (e) { recog = null; rc.on = false; rc.err = 'Mic shuru nahi ho paya. Dobara try karo.'; return redraw(); }
    startTick(); redraw();
  }
  async function startVoice() {
    if (rc.on || st.busy) return;
    if (mode() === 'text') return startText();
    if (!CAN) { rc.err = 'Is browser mein recording nahi chalegi. Chrome ya Edge use karo, ya type karo.'; return redraw(); }
    if (!voiceOk()) { rc.err = 'Pehle parent ki ijazat wala box tick karo.'; return redraw(); }
    rc.err = '';
    try { stream = await g.navigator.mediaDevices.getUserMedia({ audio: true }); }
    catch (e) { rc.err = e && (e.name === 'NotAllowedError' || e.name === 'SecurityError') ? 'Browser ne mic ki ijazat nahi di. Address bar mein mic allow karo.' : 'Mic nahi mila. Mic lagaa hai ya nahi dekho.'; return redraw(); }
    let r; const mime = pickMime();
    try { r = new g.MediaRecorder(stream, Object.assign({ audioBitsPerSecond: 24000 }, mime ? { mimeType: mime } : {})); }
    catch (e) { micOff(); rc.err = 'Mic shuru nahi ho paya. Dobara try karo.'; return redraw(); }
    chunks = []; bytes = 0; discard = false; rc.clip = null;
    r.ondataavailable = e => { if (e.data && e.data.size) { chunks.push(e.data); bytes += e.data.size; if (bytes > MAX_BYTES && rc.on) stopVoice('Recording bahut badi ho gayi, isliye ruk gayi. Chhota bol ke dobara try karo.'); } };
    r.onerror = () => stopVoice('Recording mein gadbad hui. Dobara try karo.');
    r.onstop = () => {
      if (!discard && chunks.length) rc.clip = { blob: new g.Blob(chunks, { type: (mime || r.mimeType || 'audio/webm') }), sec: rc.sec };
      chunks = []; redraw();
    };
    mr = r; rc.on = true; rc.sec = 0;
    try { r.start(1000); } catch (e) { mr = null; rc.on = false; micOff(); rc.err = 'Mic shuru nahi ho paya. Dobara try karo.'; return redraw(); }
    startTick(); redraw();
  }
  const toBase64 = blob => new Promise((ok, no) => { const f = new g.FileReader(); f.onload = () => ok(String(f.result).split(',')[1] || ''); f.onerror = () => no(new Error('Recording padh nahi paye. Dobara record karo.')); f.readAsDataURL(blob); });
  g.document.addEventListener('visibilitychange', () => { if (g.document.hidden && rc.on) stopVoice(''); });
  g.addEventListener('pagehide', () => { if (rc.on) stopVoice('', false); });

  const hasKey = () => !!(g.PARENT_KEY && g.PARENT_KEY.has && g.PARENT_KEY.has());

  const readyCh = ch => !!ch && !ch.locked && Array.isArray(ch.sections) && ch.sections.length > 0;   // locked / empty chapters (Coming soon) cannot be tested
  function chapters() {
    const d = typeof DATA !== 'undefined' ? DATA : null;
    return d && Array.isArray(d.courses) ? d.courses : [];
  }
  function current() {
    for (const c of chapters()) for (const ch of (c.chapters || [])) if (c.id + '|' + ch.no === st.key) return { c, ch };
    return null;
  }

  async function loadQuota() {
    if (!uid() || st.quotaFor === uid() || !g.CLOUD) return;
    st.quotaFor = uid();
    try {
      const tok = await g.CLOUD.token();
      const r = await fetch((g.ORBIT_API || '') + '/api/recall/quota', { headers: { Authorization: 'Bearer ' + tok } });
      const j = await r.json().catch(() => ({}));
      if (r.ok && typeof j.left === 'number') { st.left = j.left; redraw(); }
    } catch (e) { st.quotaFor = ''; }
  }

  const label = n => n >= 85 ? 'Strong understanding' : n >= 65 ? 'Good understanding' : n >= 40 ? 'Needs revision' : 'Start again';
  const bar = n => `<div style="height:8px;border-radius:9px;background:var(--ln);overflow:hidden"><div style="height:100%;width:${n}%;background:var(--on)"></div></div>`;
  const list = (title, a, empty) => `<h3 style="margin:14px 0 4px;font-size:15px">${title}</h3>` + (a.length ? `<ul style="margin:0;padding-left:18px">${a.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : `<p class="mut" style="margin:0">${empty}</p>`);

  function spark(a) {
    if (a.length < 2) return '<p class="mut" style="margin:8px 0 0">Graph ke liye kam se kam 2 attempts chahiye.</p>';
    const Wd = 300, H = 64, p = 8, x = i => p + i * (Wd - 2 * p) / (a.length - 1), y = v => H - p - (v / 100) * (H - 2 * p);
    return `<svg viewBox="0 0 ${Wd} ${H}" style="width:100%;height:64px;margin-top:8px" role="img" aria-label="Score trend"><polyline fill="none" stroke="currentColor" stroke-width="2" points="${a.map((r, i) => x(i) + ',' + y(r.t)).join(' ')}"/>${a.map((r, i) => `<circle cx="${x(i)}" cy="${y(r.t)}" r="${i === a.length - 1 ? 4 : 2.5}" fill="currentColor"/>`).join('')}</svg>`;
  }
  const dayStr = ts => new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

  function quotaCard() {
    const k = hasKey();
    return `<div class="card"><div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><h2 class="sec" style="margin:0">Aaj ka AI check</h2><span class="chip">${k ? 'Parent key connected' : st.left === 0 ? 'Daily limit reached' : 'Free access'}</span></div>
      <p style="font-size:34px;font-weight:700;margin:10px 0 2px">${k ? 'Extended' : (st.left == null ? '1' : st.left) + ' / 1'}</p>
      <p class="mut" style="margin:0">${k ? 'Parent ki key se roz ki limit nahi lagti.' : st.left === 0 ? 'Aaj ka free check ho gaya. Parent se key lagwayein ya kal aayein.' : 'Roz ek free evaluation milta hai.'}</p>
      ${!k && st.left === 0 ? '<button class="btn" data-rc="adv">Advanced AI Features kholein</button>' : ''}</div>`;
  }

  function form() {
    const cs = chapters(), blocked = !hasKey() && st.left === 0;
    const opts = cs.map(c => `<optgroup label="${esc('Class ' + c.class + ' ' + c.subject)}">${(c.chapters || []).filter(readyCh).map(ch => { const v = c.id + '|' + ch.no; return `<option value="${esc(v)}" ${v === st.key ? 'selected' : ''}>${esc('Ch ' + ch.no + ': ' + ch.title)}</option>`; }).join('')}</optgroup>`).join('').replace(/<optgroup[^>]*><\/optgroup>/g, '');
    const w = W[st.type], field = 'width:100%;box-sizing:border-box;margin-top:6px;padding:10px;border:1px solid var(--ln);border-radius:10px;background:var(--bg);color:var(--tx);font:inherit';
    return `<div class="card"><h2 class="sec" style="margin-top:0">Test your knowledge</h2>
      <p class="mut" style="margin:0 0 10px">Book band karo. Jo yaad hai, apne words mein explain karo.</p>
      <label class="mut" for="rcTopic">Topic</label><select id="rcTopic" style="${field}"><option value="">Chapter chuno</option>${opts}</select>
      <label class="mut" for="rcType" style="display:block;margin-top:10px">Sawaal ka type</label><select id="rcType" style="${field}">${Object.keys(TYPES).map(k => `<option value="${k}" ${k === st.type ? 'selected' : ''}>${TYPES[k]}</option>`).join('')}</select>
      <p class="mut" style="margin:6px 0 0;font-size:12.5px">Marks: ${Object.keys(CRIT).map(k => CRIT[k] + ' ' + w[k]).join(', ')}.</p>
      <label class="mut" style="display:block;margin-top:10px">Aapka jawab: bolo ya likho</label>
      ${mode() === 'ai' && CAN && !voiceOk() ? `<label style="display:flex;gap:10px;align-items:flex-start;margin-top:8px;font-size:13.5px"><input type="checkbox" id="rcVoiceOk" style="margin-top:3px"><span>Parent ki ijazat hai: meri awaaz ki chhoti recording AI (Google Gemini) ko bheji jayegi. Orbit ise save nahi karta.</span></label>` : ''}
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:8px">
        <button class="btn" data-rc="${rc.on ? 'stop' : 'rec'}" style="margin:0" ${st.busy || (!canRec() && !rc.on) ? 'disabled' : ''} aria-pressed="${rc.on}">${rc.on ? 'Stop' : rc.clip ? 'Dobara record' : 'Record Voice'}</button>
        <select id="rcLang" aria-label="Bolne ki language" style="padding:9px;border:1px solid var(--ln);border-radius:10px;background:var(--bg);color:var(--tx);font:inherit" ${rc.on ? 'disabled' : ''}>${Object.keys(LANGS).map(k => `<option value="${k}" ${rc.lang === k ? 'selected' : ''}>${LANGS[k]}</option>`).join('')}</select>
        <span id="rcTimer" role="timer" aria-live="off" style="font-variant-numeric:tabular-nums;font-weight:600">${rc.on || rc.sec ? fmt(rc.sec) + ' / ' + fmt(MAX_REC) : '0:00 / ' + fmt(MAX_REC)}</span>
        ${rc.on ? '<span class="mut">Mic chalu hai</span>' : ''}
      </div>
      ${rc.clip && !rc.on ? `<p style="margin:8px 0 0">Recording ready (${fmt(rc.clip.sec)}). Evaluate dabane par AI ise sunega. <button class="chip" data-rc="clipdel" style="cursor:pointer">Hatao</button></p>` : ''}
      ${rc.err ? `<p class="err" role="status" style="margin:8px 0 0">${esc(rc.err)}</p>` : !canRec() ? '<p class="mut" style="margin:8px 0 0;font-size:12.5px">Voice ke liye Chrome ya Edge chahiye. Abhi type kar sakte ho.</p>' : ''}
      <p class="mut" style="margin:8px 0 0;font-size:12.5px">${mode() === 'text' ? 'Voice: bole hue ko text mein badla jata hai, aap use theek kar sakte ho.' : 'Voice: recording AI ko jati hai.'} <button class="chip" data-rc="settings" style="cursor:pointer">Settings mein badlo</button></p>
      <textarea id="rcText" rows="6" maxlength="1500" placeholder="Ya yahan likho: explain everything you remember..." style="${field}">${esc(st.text)}</textarea>
      <button class="btn" data-rc="go" ${st.busy || blocked || !st.key ? 'disabled' : ''}>${st.busy ? 'Evaluate ho raha hai...' : 'Evaluate My Knowledge'}</button>
      ${st.err ? `<p class="err" role="status" style="margin:10px 0 0">${esc(st.err)}</p>` : ''}
      <p class="mut" style="margin:10px 0 0;font-size:12.5px">${mode() === 'text' ? 'Browser bole hue ko text mein badalta hai (Chrome ye kaam Google ki service se karta hai). Sirf wahi text AI ko jata hai. Orbit awaaz save nahi karta, sirf score is phone par yaad rakhta hai.' : 'Aapka likha text ya bolne ki recording AI ko jati hai taaki wo check kare. Orbit recording save nahi karta, sirf score is phone par yaad rakhta hai.'} Naam, school ya phone number nahi bheje jate.</p></div>`;
  }

  function report() {
    const r = st.res, cur = current();
    if (!r || !cur) return '';
    const hist = read().filter(a => a.k === st.key);
    return `<div class="card"><div style="display:flex;justify-content:space-between;gap:10px;align-items:center"><h2 class="sec" style="margin:0">Your knowledge report</h2><span class="chip">${esc(cur.ch.title)}</span></div>
      <p style="font-size:42px;font-weight:700;margin:10px 0 0">${r.total}<span class="mut" style="font-size:18px">/100</span></p><p style="margin:0 0 10px"><b>${label(r.total)}</b></p>
      ${Object.keys(CRIT).map(k => `<div style="margin:8px 0"><div style="display:flex;justify-content:space-between;font-size:14px"><span>${CRIT[k]} <span class="mut">(${r.weights[k]})</span></span><span>${r.scores[k]}%</span></div>${bar(r.scores[k])}</div>`).join('')}
      ${r.heard ? `<p class="mut" style="margin:10px 0 0"><b>AI ne ye suna:</b> ${esc(r.heard)}</p>` : ''}
      ${list('Aapne sahi samjha', r.got, 'Abhi koi poora point nahi mila.')}${r.wrong.length ? list('Galat baat', r.wrong, '') : ''}${list('Jo chhoot gaya', r.miss, 'Kuch nahi chhoota.')}
      ${r.revise ? `<p style="margin:14px 0 0;padding:10px 12px;border-radius:10px;background:var(--ans)"><b>Recommended revision</b><br>${esc(r.revise)}</p>` : ''}
      <button class="btn" data-rc="again">Dobara try karein</button></div>
      <div class="card"><h2 class="sec" style="margin-top:0">Knowledge Retention Tracker</h2>${spark(hist)}
      <table class="qt" style="width:100%;margin-top:8px"><tr><th>Attempt</th><th style="text-align:right">Score</th></tr>${hist.slice(-8).reverse().map(a => `<tr><td>${dayStr(a.at)}</td><td style="text-align:right">${a.t}%</td></tr>`).join('')}</table>
      <p class="mut" style="margin:8px 0 0;font-size:12.5px">Har attempt ka score is phone par save hota hai, taaki dikhe ki concept kitne din baad bhi yaad hai.</p></div>`;
  }

  async function evaluate() {
    const cur = current(), text = st.text.trim();
    if (!cur) return say('Pehle chapter chuno.');
    if (rc.on) return say('Pehle Stop dabao.');
    if (!rc.clip && text.length < 20) return say('Thoda aur likho ya bolo. Kam se kam ek do line explain karo.');
    st.busy = true; st.err = ''; redraw();
    try {
      const body = { course: cur.c.id, ch: cur.ch.no, type: st.type, lang: rc.lang, text };
      if (rc.clip) body.audio = { mime: rc.clip.blob.type || 'audio/webm', data: await toBase64(rc.clip.blob) };
      const j = await g.api('/api/recall/evaluate', body);
      st.res = j; if (typeof j.left === 'number') st.left = j.left;
      rc.clip = null; rc.sec = 0;   // the recording is gone once it has been checked
      write(read().concat([{ k: st.key, t: j.total, at: Date.now() }]));
    } catch (e) {
      st.err = e && e.message ? e.message : 'Kuch gadbad hui. Dobara try karo.';
      if (/free AI check ho chuka/.test(st.err)) st.left = 0;
    }
    st.busy = false; redraw();
    if (st.res) g.scrollTo(0, 0);
  }
  function say(m) { st.err = m; redraw(); }

  g.document.addEventListener('change', e => {
    if (e.target.id === 'rcTopic') { st.key = e.target.value; st.res = null; st.err = ''; redraw(); }
    else if (e.target.id === 'rcType') { st.type = e.target.value; redraw(); }
    else if (e.target.id === 'rcLang') rc.lang = e.target.value;
    else if (e.target.id === 'rcVoiceOk') { setVoiceOk(e.target.checked); rc.err = ''; redraw(); }
  });
  g.document.addEventListener('input', e => { if (e.target.id === 'rcText') st.text = e.target.value; });
  g.document.addEventListener('click', e => {
    const b = e.target && e.target.closest ? e.target.closest('[data-rc]') : null;
    if (!b || b.disabled) return;
    if (b.dataset.rc === 'go') evaluate();
    else if (b.dataset.rc === 'rec') startVoice();
    else if (b.dataset.rc === 'stop') stopVoice('');
    else if (b.dataset.rc === 'settings') { if (typeof g.go === 'function') g.go('settings'); }
    else if (b.dataset.rc === 'clipdel') { rc.clip = null; rc.sec = 0; redraw(); }
    else if (b.dataset.rc === 'again') { st.res = null; st.text = ''; st.err = ''; rc.sec = 0; rc.err = ''; rc.clip = null; redraw(); g.scrollTo(0, 0); }
    else if (b.dataset.rc === 'adv' && typeof g.go === 'function') g.go('ai');
  });

  g.RECALL = {
    viewHTML() {
      loadQuota();
      return `<h1 style="font-size:26px;margin-top:14px">Recall AI</h1>${quotaCard()}${st.res ? report() : form()}<p class="mut" style="margin-top:20px">AI se kabhi galti ho sakti hai. Exam se pehle apni kitab se check kar lo.</p>`;
    },
    voiceChanged() { stopVoice('', false); rc.sec = 0; rc.err = ''; rc.clip = null; },   // Settings changed the voice mode: nothing from the old mode stays
    _reset() { stopVoice('', false); rc.sec = 0; rc.err = ''; rc.clip = null; Object.assign(st, { key: '', type: 'concept', text: '', busy: false, err: '', res: null, left: null, quotaFor: '' }); }
  };
})();
