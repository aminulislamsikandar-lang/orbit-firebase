// public/bolorec.js - Bolo "Saath me bolo" (Byanjan): the mic stays on from the first letter to the last, the letters play one after another and the child speaks along.
// Nothing is recognised. Only the sound LEVEL is measured: a letter whose window (its clip + a short quiet time) had no sound is a red alert.
// The whole recording goes to the parent's phone (/api/bolo/rec/*), who can hear it for 2 hours. Needs the parent's tick (Bolo > Parent ke liye) and a Kid-mode code.
// BOLOREC.run(...) / BOLOREC.send(...) are used on the child's phone (send is used by saath.js).  BOLOREC.parentHTML(code) is used by kidlink.js on the parent's phone.
(function (g) {
  'use strict';
  const C = g.BOLOREC_CORE;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const can = () => !!(C && g.navigator && g.navigator.mediaDevices && g.navigator.mediaDevices.getUserMedia && g.MediaRecorder && (g.AudioContext || g.webkitAudioContext));
  const b64 = blob => new Promise((res, rej) => { const r = new g.FileReader(); r.onload = () => res(String(r.result).split(',')[1] || ''); r.onerror = () => rej(new Error('read')); r.readAsDataURL(blob); });

  // ---- child's phone ----
  // Uploads one finished recording with its report to the parent. o = { code, api, blob, total, letters: [{ i, l, t(ms from the recording start), s(1 = sound came) }] }
  async function send(o) {
    const mime = String(o.blob.type || 'audio/webm').split(';')[0];
    return o.api('/api/bolo/rec/upload', { code: o.code, mime, audio: await b64(o.blob), report: { total: o.total, letters: o.letters } });
  }
  // o = { items, code, api, clipMs(i), step(i), silent(i), cancelled() } -> { letters, silent, sent, err }
  async function run(o) {
    const out = { letters: [], silent: 0, sent: false, err: '' };
    let stream, ctx, rec, tmr = 0, win = null, level = () => 0;
    const chunks = [];
    try {
      stream = await g.navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: false } });
    } catch (e) { out.err = 'Mic ki ijazat nahi mili.'; return out; }
    try {
      ctx = new (g.AudioContext || g.webkitAudioContext)();
      const an = ctx.createAnalyser(); an.fftSize = 1024; const buf = new Float32Array(an.fftSize);
      ctx.createMediaStreamSource(stream).connect(an);          // only for measuring: never connected to the speaker, and the clips are never connected to the recorder
      level = () => { an.getFloatTimeDomainData(buf); let s = 0; for (let k = 0; k < buf.length; k++) s += buf[k] * buf[k]; return Math.sqrt(s / buf.length); };
      let opt = {}; try { opt = { audioBitsPerSecond: 24000 }; rec = new g.MediaRecorder(stream, opt); } catch (e) { rec = new g.MediaRecorder(stream); }
      rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
      const stopped = new Promise(r => { rec.onstop = r; });
      rec.start(1000); const t0 = Date.now();
      let last = Date.now(), peak = 0, thr = 0.02, calib = true;
      tmr = setInterval(() => {                                 // every 40 ms: add the time the sound was above the level to the current letter
        const n = Date.now(), dt = n - last, l = level(); last = n;
        if (calib) peak = Math.max(peak, l); else if (win && l > thr) win.voiced += dt;
      }, 40);
      await sleep(1000); calib = false; thr = C.threshold(peak);
      for (let i = 0; i < o.items.length && !(o.cancelled && o.cancelled()); i++) {
        win = { voiced: 0 }; const t = Date.now() - t0;
        o.step(i);
        await sleep(C.windowMs(o.clipMs(i)));
        const s = C.spoke(win.voiced); win = null;
        out.letters.push({ i, l: o.items[i].big, t, s: s ? 1 : 0 });
        if (!s) { out.silent++; o.silent(i); }                   // red alert
      }
      clearInterval(tmr); tmr = 0;
      if (rec.state !== 'inactive') rec.stop(); await stopped;
    } catch (e) { out.err = 'Recording mein dikkat aayi.'; }
    clearInterval(tmr); try { stream.getTracks().forEach(t => t.stop()); } catch (e) {} try { ctx && ctx.close(); } catch (e) {}
    chunks.length = 0;   // the recording is not sent to anyone: only the sound level was measured
    return out;
  }

  // ---- parent's phone ----
  const S = { open: {}, list: {}, busy: {}, err: {}, play: null };   // per code; play = { code, id, url, letters, silent }
  const draw = () => { if (typeof g.draw === 'function') g.draw(); };
  const hm = t => new Date(t).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  const api = (p, b) => (typeof g.api === 'function' ? g.api(p, b) : Promise.reject(new Error('Login chahiye.')));
  async function load(code) {
    if (S.busy[code]) return; S.busy[code] = true; S.err[code] = ''; draw();
    try { S.list[code] = (await api('/api/bolo/rec/list', { code })).items || []; } catch (e) { S.err[code] = e.message || 'Load nahi hua.'; }
    S.busy[code] = false; draw();
  }
  async function play(code, id) {
    const it = (S.list[code] || []).find(x => x.id === id); if (!it || S.busy[code]) return;
    S.busy[code] = true; S.err[code] = ''; draw();
    try {
      const r = await api('/api/bolo/rec/get', { code, id }), bin = g.atob(r.audio), u8 = new Uint8Array(bin.length);
      for (let k = 0; k < bin.length; k++) u8[k] = bin.charCodeAt(k);
      if (S.play && S.play.url) g.URL.revokeObjectURL(S.play.url);
      S.play = { code, id, url: g.URL.createObjectURL(new g.Blob([u8], { type: r.mime })), letters: it.letters || [] };
    } catch (e) { S.err[code] = e.message || 'Recording nahi chali.'; }
    S.busy[code] = false; draw();
  }
  function seek(ms) {
    const a = g.document.getElementById('brAud'); if (!a) return;
    const go = () => { a.currentTime = Math.max(0, ms / 1000 - 0.5); a.play(); };
    if (a.duration === Infinity) { a.currentTime = 1e7; a.addEventListener('timeupdate', function f() { a.removeEventListener('timeupdate', f); go(); }); } else go();   // a browser recording has no length until it is read once
  }
  function parentHTML(code) {
    if (!can() && !g.BOLOREC_CORE) return '';
    const open = !!S.open[code], items = S.list[code];
    let h = `<div class="chips" style="margin-top:8px"><button class="chip" data-br="toggle" data-v="${esc(code)}">${open ? 'Recordings band karo' : 'Bolo recordings sunao (2 ghante)'}</button></div>`;
    if (!open) return h;
    if (S.busy[code] && !items) return h + '<p class="mut">Load ho raha hai…</p>';
    if (S.err[code]) h += `<p class="err" role="alert">${esc(S.err[code])}</p>`;
    if (items && !items.length) return h + '<p class="mut" style="margin:8px 0 0">Abhi koi recording nahi hai. Recording 2 ghante baad apne aap hat jaati hai.</p>';
    (items || []).forEach(it => {
      const red = (it.letters || []).filter(x => !x.s), cur = S.play && S.play.code === code && S.play.id === it.id;
      h += `<div class="card" style="margin-top:8px;padding:12px"><div class="bl-row"><b>${hm(it.at)} ki recording</b><span class="mut" style="font-size:12.5px">${hm(it.expiresAt)} tak</span></div>
        <p style="margin:6px 0;font-weight:700;color:${red.length ? '#d64545' : '#1a9d5a'}">${red.length ? 'Red alert: ' + red.length + ' letter par awaaz nahi aayi' : 'Har letter par awaaz aayi'}</p>
        ${red.length ? `<p style="margin:0 0 6px;color:#d64545;font-size:20px" lang="as">${red.map(x => esc(x.l)).join(' ')}</p>` : ''}
        ${cur ? `<audio id="brAud" controls src="${esc(S.play.url)}" style="width:100%"></audio><div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px">${(it.letters || []).map(x => `<button class="chip" lang="as" data-br="seek" data-v="${+x.t}" style="${x.s ? '' : 'background:#d64545;color:#fff;border-color:#d64545'}">${esc(x.l)}</button>`).join('')}</div><p class="mut" style="font-size:12.5px;margin:6px 0 0">Kisi letter par dabao, wahin se sunai dega. Laal = awaaz nahi aayi.</p>`
          : `<button class="chip" data-br="play" data-v="${esc(it.id)}" data-c="${esc(code)}">Sunao</button>`}</div>`;
    });
    return h;
  }
  // ---- mentor's phone ----
  // While the parent's window is open (listenUntil), the approved mentor hears the recordings and marks each letter: 1 = sahi, 0 = galat. The server checks the window again on every request.
  const M = { open: {}, list: {}, busy: {}, err: {}, play: null, marks: {}, msg: {} };   // marks['CODE:ID'] = array of '-' | '1' | '0'
  const mk = (code, id) => code + ':' + id;
  async function mLoad(code) {
    if (M.busy[code]) return; M.busy[code] = true; M.err[code] = ''; draw();
    try { M.list[code] = (await api('/api/bolo/rec/list', { code })).items || []; } catch (e) { M.err[code] = e.message || 'Load nahi hua.'; }
    M.busy[code] = false; draw();
  }
  async function mPlay(code, id) {
    const it = (M.list[code] || []).find(x => x.id === id); if (!it || M.busy[code]) return;
    M.busy[code] = true; M.err[code] = ''; M.msg[code] = ''; draw();
    try {
      const r = await api('/api/bolo/rec/get', { code, id }), bin = g.atob(r.audio), u8 = new Uint8Array(bin.length);
      for (let k = 0; k < bin.length; k++) u8[k] = bin.charCodeAt(k);
      if (M.play && M.play.url) g.URL.revokeObjectURL(M.play.url);
      M.play = { code, id, url: g.URL.createObjectURL(new g.Blob([u8], { type: r.mime })), letters: it.letters || [] };
      if (!M.marks[mk(code, id)]) {
        const old = g.CLOUD && g.CLOUD.kids && g.CLOUD.kids.getReview ? await g.CLOUD.kids.getReview(code, id) : null;
        M.marks[mk(code, id)] = (it.letters || []).map((x, i) => (old && /^[01-]$/.test(old.marks[i] || '') ? old.marks[i] : '-'));
      }
    } catch (e) { M.err[code] = e.message || 'Recording nahi chali.'; }
    M.busy[code] = false; draw();
  }
  function mMark(code, id, i, v) {
    const a = M.marks[mk(code, id)]; if (!a || !(i >= 0 && i < a.length)) return;
    a[i] = a[i] === v ? '-' : v; M.msg[code] = ''; draw();
  }
  async function mSave(code, id) {
    const a = M.marks[mk(code, id)]; if (!a || !a.length || M.busy[code]) return;
    M.busy[code] = true; M.err[code] = ''; M.msg[code] = ''; draw();
    try { await g.CLOUD.kids.putReview(code, id, a.join('')); M.msg[code] = 'Marks save ho gaye.'; } catch (e) { M.err[code] = e && e.code === 'permission-denied' ? 'Sunne ka time khatam ho gaya. Marks save nahi hue.' : 'Save nahi hua. Dobara try karo.'; }
    M.busy[code] = false; draw();
  }
  function mClose(code) { M.open[code] = false; if (M.play && M.play.code === code) { if (M.play.url) g.URL.revokeObjectURL(M.play.url); M.play = null; } }
  // until = the end of the parent's window (ms). Outside the window nothing is listed and any open recording is dropped from the page.
  function mentorHTML(code, until) {
    if (!g.BOLOREC_CORE) return '';
    if (!(+until > Date.now())) { mClose(code); M.list[code] = null; return '<p class="mut" style="margin:10px 0 0">Bachche ki awaaz sunne ke liye parent se \"1 ghante ke liye sunne do\" ki manzoori maango.</p>'; }
    const open = !!M.open[code], items = M.list[code];
    let h = `<p style="margin:10px 0 0">Awaaz sunne ka time: <b>${hm(until)}</b> tak.</p><div class="chips" style="margin-top:8px"><button class="chip" data-br="mtoggle" data-v="${esc(code)}">${open ? 'Recordings band karo' : 'Bachche ki awaaz sunao'}</button></div>`;
    if (!open) return h;
    if (M.busy[code] && !items) return h + '<p class="mut">Load ho raha hai…</p>';
    if (M.err[code]) h += `<p class="err" role="alert">${esc(M.err[code])}</p>`;
    if (items && !items.length) return h + '<p class="mut" style="margin:8px 0 0">Abhi koi recording nahi hai. Bachcha Saath me bolo kare tab yahan aayegi. Recording 2 ghante baad hat jaati hai.</p>';
    (items || []).forEach(it => {
      const cur = M.play && M.play.code === code && M.play.id === it.id, marks = M.marks[mk(code, it.id)] || [];
      h += `<div class="card" style="margin-top:8px;padding:12px"><div class="bl-row"><b>${hm(it.at)} ki recording</b><span class="mut" style="font-size:12.5px">${hm(it.expiresAt)} tak</span></div>`;
      if (!cur) h += `<button class="chip" data-br="mplay" data-v="${esc(it.id)}" data-c="${esc(code)}">Sunao</button>`;
      else {
        h += `<audio id="brAud" controls src="${esc(M.play.url)}" style="width:100%"></audio>
          <p class="mut" style="font-size:12.5px;margin:6px 0">Letter dabao, wahin se sunai dega. Phir Sahi ya Galat dabao.</p>
          <div data-br-marks style="display:grid;gap:6px">${(it.letters || []).map((x, i) => `<div class="bl-row" style="margin:0"><button class="chip" lang="as" data-br="seek" data-v="${+x.t}">${esc(x.l)}</button><span style="display:flex;gap:6px"><button class="chip" data-br="mark" data-c="${esc(code)}" data-id="${esc(it.id)}" data-i="${i}" data-v="1" aria-pressed="${marks[i] === '1'}" aria-label="${esc(x.l)} sahi" style="${marks[i] === '1' ? 'background:#1a9d5a;color:#fff' : ''}">Sahi</button><button class="chip" data-br="mark" data-c="${esc(code)}" data-id="${esc(it.id)}" data-i="${i}" data-v="0" aria-pressed="${marks[i] === '0'}" aria-label="${esc(x.l)} galat" style="${marks[i] === '0' ? 'background:#d64545;color:#fff' : ''}">Galat</button></span></div>`).join('')}</div>
          <div class="chips" style="margin-top:10px"><button class="chip" data-br="msave" data-c="${esc(code)}" data-id="${esc(it.id)}">Marks save karo</button></div>
          ${M.msg[code] ? `<p class="mut" role="status" style="margin:6px 0 0">${esc(M.msg[code])}</p>` : ''}`;
      }
      h += '</div>';
    });
    return h;
  }
  g.document.addEventListener('click', e => {
    const b = e.target && e.target.closest ? e.target.closest('[data-br]') : null; if (!b || b.disabled) return;
    const a = b.dataset.br;
    if (a === 'toggle') { const c = b.dataset.v; S.open[c] = !S.open[c]; if (S.open[c]) load(c); else draw(); }
    else if (a === 'play') play(b.dataset.c, b.dataset.v);
    else if (a === 'seek') seek(+b.dataset.v);
    else if (a === 'mtoggle') { const c = b.dataset.v; if (M.open[c]) { mClose(c); draw(); } else { M.open[c] = true; mLoad(c); } }
    else if (a === 'mplay') mPlay(b.dataset.c, b.dataset.v);
    else if (a === 'mark') mMark(b.dataset.c, b.dataset.id, +b.dataset.i, b.dataset.v);
    else if (a === 'msave') mSave(b.dataset.c, b.dataset.id);
  });
  // The parent's page must not redraw (and cut the sound) while a recording is open and playing or paused half way.
  const busy = () => { const a = g.document.getElementById('brAud'); return !!(a && (!a.paused || a.currentTime > 0.5)); };
  g.BOLOREC = { can, run, send, parentHTML, mentorHTML, busy };
})(typeof window !== 'undefined' ? window : globalThis);
