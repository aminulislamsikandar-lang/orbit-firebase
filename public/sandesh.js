// public/sandesh.js - "Sandesh": a mentor sends a message to a child; it appears on the child's screen with a countdown (or the voice starts playing).
//   Mentor's phone: the child's card has "Sandesh bhejo". It opens a sheet (outside the app's page, so a redraw never wipes what is typed):
//     instruction (typed), a question (optional, to copy-paste), or a recorded voice; how long it stays on the child's screen; the list of earlier messages with the child's replies.
//   Child's phone (Kid mode child, or a Not Kid student with a mentor): the message interrupts the screen. The countdown starts when it first appears (shownAt is stored, so a reload does not restart it).
//     Kid: the text is big and the voice plays by itself. Not Kid: the instruction + the question, a camera icon (photo of the written answer) and a voice icon (a spoken answer) go to the mentor.
//   Not Kid student: the "Mentor" page makes a code, the mentor enters it (Mentor of > Not Kid), the student approves once. A Kid child links the old way (parent approves).
// Data: window.CLOUD.kids (kidLinks/{code}/msgs/{id}, msgs/{id}/reps/{rid}; see firestore.rules). Everything that came from Firestore is put on the page with textContent, never as HTML.
(function (g) {
  'use strict';
  const SC = g.SANDESH_CORE;
  if (!SC) return;
  const d = g.document;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const S = { uid: '', own: '', ownLoaded: false, watching: '', unsub: null, msgs: [], local: {}, cur: null, timer: 0, audio: null, over: null, sheet: null, pg: { loaded: false, busy: false, err: '', msg: '', link: null, mentors: [] }, rec: null, sent: 0 };
  const cloud = () => (g.CLOUD && g.CLOUD.kids) || null;
  const fail = e => (e && e.code === 'permission-denied') ? 'Ye kaam nahi ho paaya (ijazat nahi mili). Dobara try karo.' : 'Net ya server ki dikkat. Thodi der baad try karo.';
  const firstName = () => { const u = typeof USER !== 'undefined' ? USER : null; return String((u && (u.name || u.displayName)) || '').trim().split(/\s+/)[0] || ''; };
  const draw = () => { if (typeof g.draw === 'function') g.draw(); };
  const fmt = c => String(c || '').slice(0, 4) + '-' + String(c || '').slice(4);
  const reduce = () => !!(g.matchMedia && g.matchMedia('(prefers-reduced-motion: reduce)').matches);
  // Who is this phone? 'kid' = a Kid mode child; 'notkid' = a normal student; '' = a parent / mentor phone or nobody (those never get messages).
  function mode() {
    try {
      if (typeof COURSE !== 'undefined' && COURSE && COURSE.kid === true) return (typeof KIDROLE !== 'undefined' && KIDROLE === 'kid') ? 'kid' : '';
      return (typeof USER !== 'undefined' && USER && typeof COURSE_STATE !== 'undefined' && COURSE_STATE === 'set') ? 'notkid' : '';
    } catch (e) { return ''; }
  }
  const visible = () => !d.visibilityState || d.visibilityState === 'visible';

  // ---- small DOM helpers (text only: nothing from Firestore is ever parsed as HTML) ----
  function el(tag, attrs, kids) {
    const n = d.createElement(tag);
    Object.keys(attrs || {}).forEach(k => { if (k === 'text') n.textContent = attrs[k]; else if (attrs[k] !== false && attrs[k] != null) n.setAttribute(k, attrs[k] === true ? '' : attrs[k]); });
    (kids || []).forEach(c => { if (c) n.appendChild(typeof c === 'string' ? d.createTextNode(c) : c); });
    return n;
  }
  const ICON = {
    cam: '<path d="M4 8h3l1.5-2h7L17 8h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
    mic: '<rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/>',
    play: '<path d="M8 5l11 7-11 7z"/>', stop: '<rect x="6" y="6" width="12" height="12" rx="2"/>',
    close: '<path d="M6 6l12 12"/><path d="M18 6L6 18"/>', back: '<path d="M15 5l-7 7 7 7"/>', send: '<path d="M4 12l16-8-6 16-3-7z"/>', trash: '<path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13"/>',
    msg: '<path d="M4 5h16v11H9l-5 4z"/>'
  };
  function svg(name, cls) {
    const doc = new g.DOMParser().parseFromString('<svg xmlns="http://www.w3.org/2000/svg" class="' + (cls || 'sd-ic') + '" viewBox="0 0 24 24" aria-hidden="true">' + (ICON[name] || '') + '</svg>', 'image/svg+xml');   // fixed icon strings only, no innerHTML
    return d.importNode(doc.documentElement, true);
  }
  function style() {
    if (d.getElementById('sdStyle')) return;
    const s = d.createElement('style'); s.id = 'sdStyle';
    s.textContent = `.sd-ic{width:22px;height:22px;flex:none;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
body.sd-lock{overflow:hidden}
.sd-over{position:fixed;inset:0;z-index:9000;display:flex;align-items:center;justify-content:center;padding:14px;background:rgba(15,23,42,.74);animation:sdfade .18s ease-out}
.sd-card{position:relative;width:100%;max-width:520px;max-height:94vh;overflow:auto;background:var(--card,#fff);color:var(--tx,#111);border-radius:22px;padding:18px 18px 16px;box-shadow:0 20px 60px rgba(0,0,0,.45);outline:0;animation:sdpop .22s cubic-bezier(.2,.9,.3,1.2)}
.sd-top{display:flex;align-items:center;gap:10px}.sd-from{flex:1;min-width:0;font-weight:700;font-size:14px;color:var(--mut,#666);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sd-time{font-variant-numeric:tabular-nums;font-weight:800;font-size:22px;padding:2px 12px;border-radius:999px;background:rgba(22,163,74,.14);color:#15803d}.sd-time.low{background:rgba(220,38,38,.14);color:#b91c1c}
.sd-bar{height:6px;border-radius:999px;background:rgba(0,0,0,.08);margin:10px 0 12px;overflow:hidden}.sd-bar i{display:block;height:100%;width:100%;background:linear-gradient(90deg,#22c55e,#16a34a);transition:width .5s linear}
.sd-ins{margin:6px 0 10px;font-size:20px;line-height:1.45;font-weight:700;white-space:pre-wrap;word-break:break-word}.sd-kid .sd-ins{font-size:30px;line-height:1.35;text-align:center}
.sd-q{margin:0 0 12px;padding:12px 14px;border-radius:14px;background:rgba(59,130,246,.09);border:1px solid rgba(59,130,246,.28);white-space:pre-wrap;word-break:break-word;font-size:17px;line-height:1.5;user-select:text;-webkit-user-select:text}
.sd-qh{display:block;font-size:12px;font-weight:700;color:#1d4ed8;margin-bottom:4px;letter-spacing:.3px}
.sd-play{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;padding:14px;border-radius:16px;border:0;background:linear-gradient(145deg,#4ade80,#16a34a);color:#fff;font:inherit;font-weight:800;font-size:18px;cursor:pointer}.sd-play[aria-pressed=true]{background:linear-gradient(145deg,#60a5fa,#2563eb)}
.sd-act{display:flex;gap:10px;margin:12px 0 4px}.sd-rb{flex:1;display:flex;align-items:center;justify-content:center;gap:8px;padding:13px 8px;border-radius:14px;border:1.5px solid var(--ln,#ddd);background:var(--bg,#fff);color:var(--tx,#111);font:inherit;font-weight:700;cursor:pointer}
.sd-rb.rec{border-color:#dc2626;color:#b91c1c;background:rgba(220,38,38,.08)}.sd-rb:disabled{opacity:.55}
.sd-st{min-height:20px;margin:6px 0 0;font-size:13.5px;color:var(--mut,#666)}.sd-st.ok{color:#15803d}.sd-st.bad{color:#b91c1c}
.sd-ok{width:100%;margin-top:10px}
.sd-sheet{position:fixed;inset:0;z-index:8000;background:var(--bg,#fff);color:var(--tx,#111);overflow:auto;-webkit-overflow-scrolling:touch;animation:sdslide .22s ease-out}
.sd-sin{max-width:560px;margin:0 auto;padding:12px 16px 40px}
.sd-sh{display:flex;align-items:center;gap:8px;position:sticky;top:0;background:var(--bg,#fff);padding:10px 0;z-index:2}.sd-sh h2{margin:0;font-size:19px;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sd-ib{width:42px;height:42px;display:grid;place-items:center;border-radius:12px;border:1px solid var(--ln,#ddd);background:var(--card,#fff);color:inherit;cursor:pointer}
.sd-f label{display:block;font-weight:700;margin:14px 0 4px}.sd-f small{font-weight:400;color:var(--mut,#666)}
.sd-f textarea{width:100%;box-sizing:border-box;padding:11px;border:1px solid var(--ln,#ddd);border-radius:12px;background:var(--card,#fff);color:var(--tx,#111);font:inherit;resize:vertical;min-height:76px}
.sd-cnt{text-align:right;font-size:12px;color:var(--mut,#666);margin-top:2px}
.sd-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.sd-chips{display:flex;flex-wrap:wrap;gap:8px}.sd-chips .chip[aria-pressed=true]{background:var(--ac,#16a34a);color:#fff;border-color:transparent}
.sd-voice{padding:12px;border:1px dashed var(--ln,#ccc);border-radius:14px}
.sd-send{width:100%;margin-top:18px;display:flex;align-items:center;justify-content:center;gap:8px}
.sd-h{margin:26px 0 8px;font-size:16px;font-weight:800}
.sd-it{padding:12px;border:1px solid var(--ln,#ddd);border-radius:14px;margin-bottom:10px;background:var(--card,#fff)}.sd-it p{margin:0 0 4px;word-break:break-word}
.sd-meta{font-size:12.5px;color:var(--mut,#666)}.sd-rep{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}
.sd-th{width:84px;height:84px;object-fit:cover;border-radius:10px;border:1px solid var(--ln,#ddd);cursor:pointer;display:block}
.sd-lb{position:fixed;inset:0;z-index:9500;background:rgba(0,0,0,.9);display:flex;align-items:center;justify-content:center;padding:10px}.sd-lb img{max-width:100%;max-height:100%;border-radius:8px}.sd-lb .sd-ib{position:absolute;top:12px;right:12px}
.sd-toast{position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:9600;background:#111827;color:#fff;padding:11px 18px;border-radius:999px;font-weight:700;box-shadow:0 8px 24px rgba(0,0,0,.35)}
.sd-pulse{animation:sdpulse 1s infinite}
@keyframes sdfade{from{opacity:0}to{opacity:1}}@keyframes sdpop{from{transform:translateY(24px) scale(.96);opacity:0}to{transform:none;opacity:1}}@keyframes sdslide{from{transform:translateX(24px);opacity:0}to{transform:none;opacity:1}}@keyframes sdpulse{50%{opacity:.45}}
@media (prefers-reduced-motion:reduce){.sd-over,.sd-card,.sd-sheet,.sd-pulse{animation:none}.sd-bar i{transition:none}}`;
    d.head.appendChild(s);
  }
  function toast(t) {
    const old = d.getElementById('sdToast'); if (old) old.remove();
    const n = el('div', { id: 'sdToast', class: 'sd-toast', role: 'status', text: t }); d.body.appendChild(n);
    setTimeout(() => { try { n.remove(); } catch (e) {} }, 2600);
  }

  // ---- recording and pictures ----
  const toDataURL = blob => new Promise((res, rej) => { const r = new g.FileReader(); r.onload = () => res(String(r.result || '')); r.onerror = () => rej(new Error('read')); r.readAsDataURL(blob); });
  // Starts the microphone. Returns { stop(), cancel(), done: Promise<dataURL> }. onTick(seconds) is called while recording; it stops by itself at maxS.
  async function startRec(maxS, onTick) {
    const nav = g.navigator;
    if (!nav.mediaDevices || !nav.mediaDevices.getUserMedia || !g.MediaRecorder) throw new Error('nosupport');
    const stream = await nav.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    const mt = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'].find(m => g.MediaRecorder.isTypeSupported && g.MediaRecorder.isTypeSupported(m)) || '';
    const rec = new g.MediaRecorder(stream, mt ? { mimeType: mt, audioBitsPerSecond: 24000 } : { audioBitsPerSecond: 24000 });
    const chunks = [], t0 = Date.now(); let cancelled = false, timer = 0, finish;
    const done = new Promise(res => { finish = res; });
    const stop = () => { try { if (rec.state !== 'inactive') rec.stop(); } catch (e) {} };
    rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
    rec.onstop = () => {
      clearInterval(timer); stream.getTracks().forEach(t => { try { t.stop(); } catch (e) {} });
      if (cancelled || !chunks.length) { finish(''); return; }
      toDataURL(new g.Blob(chunks, { type: rec.mimeType || mt || 'audio/webm' })).then(finish, () => finish(''));
    };
    rec.start();
    timer = setInterval(() => { const s = (Date.now() - t0) / 1000; try { onTick && onTick(s); } catch (e) {} if (s >= maxS) stop(); }, 250);
    return { stop, cancel: () => { cancelled = true; stop(); }, done };
  }
  // A photo from the camera / gallery, made small enough for one Firestore document (JPEG, longest side 1280, quality lowered until it fits).
  function photoData(file) {
    return new Promise((res, rej) => {
      const url = g.URL.createObjectURL(file), img = new g.Image();
      img.onload = () => {
        try {
          let w = img.naturalWidth || img.width, h = img.naturalHeight || img.height; const k = Math.min(1, 1280 / Math.max(w, h)); w = Math.max(1, Math.round(w * k)); h = Math.max(1, Math.round(h * k));
          for (let tries = 0; tries < 6; tries++) {
            const c = d.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(img, 0, 0, w, h);
            for (const q of [0.72, 0.6, 0.48, 0.38]) { const u = c.toDataURL('image/jpeg', q); if (SC.okData(u, 'photo')) { g.URL.revokeObjectURL(url); res(u); return; } }
            w = Math.round(w * 0.75); h = Math.round(h * 0.75);
          }
          g.URL.revokeObjectURL(url); rej(new Error('big'));
        } catch (e) { g.URL.revokeObjectURL(url); rej(e); }
      };
      img.onerror = () => { g.URL.revokeObjectURL(url); rej(new Error('img')); };
      img.src = url;
    });
  }

  // =====================================================  CHILD'S PHONE  =====================================================
  const shownOf = m => +m.shownAt > 0 ? +m.shownAt : (+S.local[m.id] || 0);
  function stopAudio() { if (S.audio) { try { S.audio.pause(); } catch (e) {} S.audio = null; } }
  function closeOver(markDone) {
    const o = S.over; if (S.timer) { clearInterval(S.timer); S.timer = 0; }
    stopAudio(); if (S.rec) { try { S.rec.cancel(); } catch (e) {} S.rec = null; }
    const m = S.cur; S.cur = null;
    if (o) { o.remove(); S.over = null; d.body.classList.remove('sd-lock'); }
    if (markDone && m && S.watching) { const C = cloud(); if (C && C.msgMark && !(+m.doneAt > 0)) { S.local[m.id + ':done'] = Date.now(); C.msgMark(S.watching, m.id, { doneAt: Date.now() }).catch(() => {}); } }
  }
  const alive = m => { const x = Object.assign({}, m, { shownAt: shownOf(m) || m.shownAt }); if (S.local[m.id + ':done']) x.doneAt = S.local[m.id + ':done']; return x; };
  function show() {
    if (!S.watching || !mode()) { if (S.over) closeOver(false); return; }
    if (!visible()) return;   // shown the moment the phone comes back
    const now = Date.now();
    if (S.cur) {
      const fresh = S.msgs.find(m => m.id === S.cur.id);
      if (!fresh || SC.left(alive(fresh), now) == null) closeOver(false); else return;
    }
    const next = SC.pick(S.msgs.map(alive), now);
    if (!next) return;
    openOver(next);
  }
  function openOver(m) {
    style(); const kid = mode() === 'kid', C = cloud();
    S.cur = m;
    if (!(shownOf(m) > 0)) { S.local[m.id] = Date.now(); if (C && C.msgMark) C.msgMark(S.watching, m.id, { shownAt: S.local[m.id] }).catch(() => {}); }
    d.querySelectorAll('audio,video').forEach(x => { try { x.pause(); } catch (e) {} });
    const t = el('span', { class: 'sd-time', id: 'sdLeft', 'aria-hidden': 'true', text: SC.mmss(SC.left(alive(m)) || 0) });
    const bar = el('i'), status = el('p', { class: 'sd-st', id: 'sdSt', role: 'status', 'aria-live': 'polite' });
    const card = el('div', { class: 'sd-card' + (kid ? ' sd-kid' : ''), tabindex: '-1' }, [
      el('div', { class: 'sd-top' }, [el('span', { class: 'sd-from', id: 'sdOverT', text: (m.fromName || 'Mentor') + ' ka sandesh' }), t]),
      el('div', { class: 'sd-bar', 'aria-hidden': 'true' }, [bar])
    ]);
    if (m.ins) card.appendChild(el('p', { class: 'sd-ins', text: m.ins }));
    if (m.q) card.appendChild(el('div', { class: 'sd-q' }, [el('span', { class: 'sd-qh', text: 'SAWAAL' }), d.createTextNode(m.q)]));
    let playBtn = null;
    if (m.aud && SC.okData(m.aud, 'audio')) {
      playBtn = el('button', { type: 'button', class: 'sd-play', 'aria-pressed': 'false' }, [svg('play'), el('span', { text: 'Suno' })]);
      let heard = false;
      const setP = on => { if (on) heard = true; playBtn.setAttribute('aria-pressed', on ? 'true' : 'false'); playBtn.lastChild.textContent = on ? 'Ruko' : (heard ? 'Phir se suno' : 'Suno'); };
      const start = () => {
        stopAudio(); const a = new g.Audio(m.aud); S.audio = a;
        a.onended = () => { setP(false); };
        a.play().then(() => setP(true), () => { setP(false); status.textContent = 'Awaaz sunne ke liye "Suno" dabao.'; });
      };
      playBtn.addEventListener('click', () => { if (S.audio && !S.audio.paused) { S.audio.pause(); setP(false); } else start(); });
      card.appendChild(playBtn);
      start();   // the voice starts by itself (if the browser does not allow it, the big Suno button is there)
    }
    if (!kid) {
      const cam = el('button', { type: 'button', class: 'sd-rb', 'aria-label': 'Copy ki photo bhejo' }, [svg('cam'), el('span', { text: 'Photo' })]);
      const mic = el('button', { type: 'button', class: 'sd-rb', 'aria-label': 'Awaaz mein jawab do' }, [svg('mic'), el('span', { text: 'Bolo' })]);
      const file = el('input', { type: 'file', accept: 'image/*', capture: 'environment', hidden: true, 'aria-hidden': 'true' });
      let sentN = 0;
      const say = (txt, cls) => { status.textContent = txt; status.className = 'sd-st' + (cls ? ' ' + cls : ''); };
      const sendRep = async (kind, data) => {
        if (sentN >= 5) { say('Ek sandesh par 5 jawab bahut hain.', 'bad'); return; }
        const C2 = cloud(); if (!C2 || !C2.repPut) return;
        try { await C2.repPut(S.watching, m.id, SC.newId(Date.now()), { kind, data, at: Date.now() }); sentN++; say('Mentor ko bhej diya ✓', 'ok'); } catch (e) { say(fail(e), 'bad'); }
      };
      cam.addEventListener('click', () => file.click());
      file.addEventListener('change', async () => {
        const f = file.files && file.files[0]; file.value = ''; if (!f) return;
        say('Photo chhoti ho rahi hai…'); cam.disabled = true;
        try { await sendRep('photo', await photoData(f)); } catch (e) { say('Photo nahi ja paayi. Dobara try karo.', 'bad'); }
        cam.disabled = false;
      });
      mic.addEventListener('click', async () => {
        if (S.rec) { S.rec.stop(); return; }   // second tap = stop
        if (S.audio) { try { S.audio.pause(); } catch (e) {} }
        try {
          const lab = mic.lastChild; mic.classList.add('rec'); lab.textContent = 'Roko 0:00'; say('Bol rahe ho… (roko dabao)');
          const r = await startRec(SC.MAX_REPLY_S, s => { lab.textContent = 'Roko ' + SC.mmss(s); }); S.rec = r;
          const data = await r.done; S.rec = null; mic.classList.remove('rec'); lab.textContent = 'Bolo';
          if (!data) { say('Awaaz record nahi hui.', 'bad'); return; }
          if (!SC.okData(data, 'audio')) { say('Awaaz bahut lambi hai. Chhoti record karo.', 'bad'); return; }
          say('Bhej raha hoon…'); await sendRep('voice', data);
        } catch (e) { S.rec = null; mic.classList.remove('rec'); mic.lastChild.textContent = 'Bolo'; say(e && e.message === 'nosupport' ? 'Is phone par awaaz record nahi ho sakti.' : 'Mic ki ijazat chahiye (browser mein Allow dabao).', 'bad'); }
      });
      card.appendChild(el('div', { class: 'sd-act' }, [cam, mic, file]));
    }
    card.appendChild(status);
    const ok = el('button', { type: 'button', class: 'btn sd-ok', text: 'Ho gaya' }); ok.addEventListener('click', () => { closeOver(true); setTimeout(show, 50); });
    card.appendChild(ok);
    const over = el('div', { class: 'sd-over', id: 'sdOver', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'sdOverT' }, [card]);
    d.body.appendChild(over); d.body.classList.add('sd-lock'); S.over = over;
    try { card.focus({ preventScroll: true }); } catch (e) {}
    const secs = SC.secsOf(m.secs);
    const tick = () => {
      const cur = S.msgs.find(x => x.id === m.id) || m, r = SC.left(alive(cur));
      if (r == null) { closeOver(true); setTimeout(show, 50); return; }
      t.textContent = SC.mmss(r); t.classList.toggle('low', r <= 10); bar.style.width = Math.max(0, Math.min(100, r * 100 / secs)) + '%';
    };
    tick(); if (S.timer) clearInterval(S.timer); S.timer = setInterval(tick, 500);
  }
  function onMsgs(list) {
    S.msgs = list;
    const C = cloud(), now = Date.now();
    if (C && C.msgDel && S.watching) list.filter(m => SC.old(m, now)).forEach(m => { C.msgDel(S.watching, m.id).catch(() => {}); });   // the child's phone cleans up after 48 hours
    S.msgs = list.filter(m => !SC.old(m, now));
    show();
  }
  function unwatch() { if (S.unsub) { try { S.unsub(); } catch (e) {} S.unsub = null; } S.watching = ''; S.msgs = []; if (S.over) closeOver(false); }
  // Which link does this phone listen to? Kid: its own Kid code (KIDLINK). Not Kid: the code made on the Mentor page.
  function sync() {
    const C = cloud(); if (!C || !S.uid) { if (S.watching) unwatch(); return; }
    const m = mode(); let code = '';
    if (m === 'kid') code = (g.KIDLINK && g.KIDLINK.kidCode && g.KIDLINK.kidCode()) || '';
    else if (m === 'notkid') { if (!S.ownLoaded) { S.ownLoaded = true; ownLoad(); } code = S.own; }
    if (code !== S.watching) {
      unwatch();
      if (code && C.msgWatch) { S.watching = code; S.unsub = C.msgWatch(code, onMsgs); }
    }
  }
  async function ownLoad() {
    const C = cloud(); if (!C || !C.own) return;
    try { const l = await C.own(); S.own = l ? l.code : ''; S.pg.link = l || null; } catch (e) {}
    sync();
  }

  // =====================================================  MENTOR'S PHONE  =====================================================
  const cardHTML = (code, name) => `<div class="chips" style="margin:0 0 12px"><button class="chip" data-sd="open" data-v="${esc(code)}" data-nm="${esc(String(name || '').slice(0, 40))}" style="font-weight:800;padding:10px 16px;background:var(--ac,#16a34a);color:#fff;border-color:transparent">Sandesh bhejo</button></div>`;
  function openSheet(code, name) {
    if (S.sheet) return; style();
    const C = cloud(); if (!C || !C.msgSend || !S.uid) return;
    const F = { ins: '', q: '', secs: SC.DEFAULT_SECS, aud: '', busy: false, rec: null, prev: null }, timers = [];
    let reps = {};
    const insT = el('textarea', { id: 'sdIns', maxlength: String(SC.MAX_INS), placeholder: 'Bachche ko kya karna hai? (jaise: Ye 5 sawaal copy mein hal karo)', rows: '3' });
    const qT = el('textarea', { id: 'sdQ', maxlength: String(SC.MAX_Q), placeholder: 'Sawaal yahan paste karo (zaroori nahi)', rows: '4' });
    const insC = el('div', { class: 'sd-cnt', text: '0/' + SC.MAX_INS }), qC = el('div', { class: 'sd-cnt', text: '0/' + SC.MAX_Q });
    insT.addEventListener('input', () => { insC.textContent = insT.value.length + '/' + SC.MAX_INS; upd(); }); qT.addEventListener('input', () => { qC.textContent = qT.value.length + '/' + SC.MAX_Q; upd(); });
    const chips = el('div', { class: 'sd-chips', role: 'group', 'aria-label': 'Kitni der dikhega' });
    const chipEls = SC.SECS.map(s => { const b = el('button', { type: 'button', class: 'chip', 'aria-pressed': String(s === F.secs), text: SC.secsTxt(s) }); b.addEventListener('click', () => { F.secs = s; chipEls.forEach((x, i) => x.setAttribute('aria-pressed', String(SC.SECS[i] === s))); }); chips.appendChild(b); return b; });
    // voice
    const vStat = el('span', { class: 'sd-meta', text: 'Awaaz record karke bhi bhej sakte ho (bachche ke phone par apne aap bajegi).' });
    const vRec = el('button', { type: 'button', class: 'sd-rb', style: 'flex:none;padding:12px 16px' }, [svg('mic'), el('span', { text: 'Record karo' })]);
    const vPlay = el('button', { type: 'button', class: 'sd-rb', style: 'flex:none;padding:12px 16px', hidden: true }, [svg('play'), el('span', { text: 'Sunao' })]);
    const vDel = el('button', { type: 'button', class: 'sd-rb', style: 'flex:none;padding:12px 16px', hidden: true, 'aria-label': 'Record ki hui awaaz hatao' }, [svg('trash'), el('span', { text: 'Hatao' })]);
    function vUi() { vPlay.hidden = vDel.hidden = !F.aud; vRec.lastChild.textContent = F.aud ? 'Dobara record' : 'Record karo'; }
    vRec.addEventListener('click', async () => {
      if (F.rec) { F.rec.stop(); return; }
      try {
        vRec.classList.add('rec'); vRec.lastChild.textContent = 'Roko 0:00'; vStat.textContent = 'Record ho raha hai… (max ' + SC.MAX_REC_S + ' sec)';
        const r = await startRec(SC.MAX_REC_S, s => { vRec.lastChild.textContent = 'Roko ' + SC.mmss(s); }); F.rec = r;
        const data = await r.done; F.rec = null; vRec.classList.remove('rec');
        if (!data) { vStat.textContent = 'Record nahi hua.'; vUi(); return; }
        if (!SC.okData(data, 'audio')) { vStat.textContent = 'Awaaz bahut lambi hai. Chhoti record karo.'; vUi(); return; }
        F.aud = data; vStat.textContent = 'Awaaz ready. Sunkar dekh lo.'; vUi(); upd();
      } catch (e) { F.rec = null; vRec.classList.remove('rec'); vStat.textContent = e && e.message === 'nosupport' ? 'Is phone par awaaz record nahi ho sakti. Likhkar bhejo.' : 'Mic ki ijazat chahiye (browser mein Allow dabao).'; vUi(); }
    });
    vPlay.addEventListener('click', () => { if (F.prev) { try { F.prev.pause(); } catch (e) {} F.prev = null; vPlay.lastChild.textContent = 'Sunao'; return; } if (!F.aud) return; const a = new g.Audio(F.aud); F.prev = a; vPlay.lastChild.textContent = 'Ruko'; a.onended = () => { F.prev = null; vPlay.lastChild.textContent = 'Sunao'; }; a.play().catch(() => { F.prev = null; vPlay.lastChild.textContent = 'Sunao'; }); });
    vDel.addEventListener('click', () => { F.aud = ''; if (F.prev) { try { F.prev.pause(); } catch (e) {} F.prev = null; } vStat.textContent = 'Awaaz hata di.'; vUi(); upd(); });
    const err = el('p', { class: 'sd-st bad', role: 'alert' });
    const sendB = el('button', { type: 'button', class: 'btn sd-send', disabled: true }, [svg('send'), el('span', { text: 'Bhejo' })]);
    function upd() { sendB.disabled = F.busy || !(insT.value.trim() || qT.value.trim() || F.aud); }
    sendB.addEventListener('click', async () => {
      if (F.busy) return; err.textContent = '';
      if (Date.now() - S.sent < 3000) { err.textContent = 'Thoda ruko, phir bhejo.'; return; }
      const m = SC.build({ from: S.uid, fromName: firstName() || 'Mentor', ins: insT.value, q: qT.value, aud: F.aud, secs: F.secs }, Date.now());
      if (!m) { err.textContent = 'Kuch likho ya awaaz record karo.'; return; }
      F.busy = true; upd(); sendB.lastChild.textContent = 'Bhej raha hoon…';
      try {
        await C.msgSend(code, SC.newId(m.at), m); S.sent = Date.now();
        insT.value = qT.value = ''; insC.textContent = '0/' + SC.MAX_INS; qC.textContent = '0/' + SC.MAX_Q; F.aud = ''; vStat.textContent = 'Awaaz record karke bhi bhej sakte ho (bachche ke phone par apne aap bajegi).'; vUi();
        toast('Sandesh bhej diya ✓'); loadList();
      } catch (e) { err.textContent = fail(e); }
      F.busy = false; sendB.lastChild.textContent = 'Bhejo'; upd();
    });
    const list = el('div', { id: 'sdList', 'aria-live': 'polite' });
    const closeB = el('button', { type: 'button', class: 'sd-ib', 'aria-label': 'Wapas' }, [svg('back')]);
    const root = el('div', { class: 'sd-sheet', id: 'sdSheet', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'sdSheetT' }, [
      el('div', { class: 'sd-sin' }, [
        el('div', { class: 'sd-sh' }, [closeB, el('h2', { id: 'sdSheetT', text: 'Sandesh: ' + (name || 'Bachcha') })]),
        el('div', { class: 'sd-f' }, [
          el('label', { for: 'sdIns' }, ['Instruction ', el('small', { text: '(mentor likhta hai)' })]), insT, insC,
          el('label', { for: 'sdQ' }, ['Sawaal ', el('small', { text: '(optional: copy-paste)' })]), qT, qC,
          el('label', { text: 'Ya awaaz' }), el('div', { class: 'sd-voice' }, [el('div', { class: 'sd-row' }, [vRec, vPlay, vDel]), el('p', { style: 'margin:8px 0 0' }, [vStat])]),
          el('label', { text: 'Bachche ki screen par kitni der dikhega' }), chips,
          err, sendB
        ]),
        el('h3', { class: 'sd-h', text: 'Pichhle sandesh' }), list
      ])
    ]);
    d.body.appendChild(root); d.body.classList.add('sd-lock');
    S.sheet = { root, code };
    try { g.history.pushState(Object.assign({}, g.history.state || {}, { sd: 1 }), ''); S.sheet.pushed = true; } catch (e) {}
    const shut = () => { if (!S.sheet) return; if (F.rec) { try { F.rec.cancel(); } catch (e) {} } if (F.prev) { try { F.prev.pause(); } catch (e) {} } timers.forEach(clearInterval); root.remove(); S.sheet = null; if (!S.over) d.body.classList.remove('sd-lock'); d.removeEventListener('keydown', onKey, true); g.removeEventListener('popstate', onPop); };
    const onKey = e => { if (e.key === 'Escape' && !d.getElementById('sdLb')) { e.preventDefault(); back(); } };
    const onPop = () => { if (S.sheet && S.sheet.pushed) { S.sheet.pushed = false; shut(); } };
    const back = () => { if (S.sheet && S.sheet.pushed) { S.sheet.pushed = false; shut(); try { g.history.back(); } catch (e) {} } else shut(); };
    closeB.addEventListener('click', back); d.addEventListener('keydown', onKey, true); g.addEventListener('popstate', onPop);
    // earlier messages: what happened to each one, and the child's replies
    async function loadList() {
      if (!S.sheet) return;
      let ms = []; try { ms = (await C.msgsMine(code)).filter(m => !SC.old(m)).sort((a, b) => (+b.at || 0) - (+a.at || 0)).slice(0, 8); } catch (e) { return; }
      for (const m of ms) { if (+m.shownAt > 0 && C.reps) { try { reps[m.id] = await C.reps(code, m.id); } catch (e) {} } }
      if (!S.sheet) return;
      while (list.firstChild) list.removeChild(list.firstChild);
      if (!ms.length) { list.appendChild(el('p', { class: 'sd-meta', text: 'Abhi koi sandesh nahi bheja.' })); return; }
      ms.forEach(m => {
        const st = SC.stateOf(m), rs = (reps[m.id] || []).slice().sort((a, b) => (+a.at || 0) - (+b.at || 0));
        const item = el('div', { class: 'sd-it' }, [
          el('p', { text: m.ins || m.q || 'Awaaz sandesh' }),
          el('div', { class: 'sd-meta', text: new Date(+m.at || 0).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' }) + ' · ' + SC.secsTxt(SC.secsOf(m.secs)) + (m.aud ? ' · awaaz' : '') + ' · ' + st.t })
        ]);
        if (rs.length) {
          const box = el('div', { class: 'sd-rep' });
          rs.forEach(r => {
            if (r.kind === 'photo' && SC.okData(r.data, 'photo')) { const im = el('img', { class: 'sd-th', src: r.data, alt: 'Bachche ka jawab (photo)', tabindex: '0', role: 'button' }); const open = () => lightbox(r.data); im.addEventListener('click', open); im.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } }); box.appendChild(im); }
            else if (r.kind === 'voice' && SC.okData(r.data, 'audio')) { const b = el('button', { type: 'button', class: 'sd-rb', style: 'flex:none;padding:10px 14px' }, [svg('play'), el('span', { text: 'Jawab suno' })]); let a = null; b.addEventListener('click', () => { if (a && !a.paused) { a.pause(); b.lastChild.textContent = 'Jawab suno'; return; } a = new g.Audio(r.data); a.onended = () => { b.lastChild.textContent = 'Jawab suno'; }; a.play().then(() => { b.lastChild.textContent = 'Ruko'; }, () => {}); }); box.appendChild(b); }
          });
          item.appendChild(box);
        }
        const del = el('button', { type: 'button', class: 'chip', style: 'margin-top:8px', text: 'Hatao' });
        del.addEventListener('click', async () => { if (!g.confirm('Ye sandesh (aur bachche ke jawab) hata dein?')) return; try { await C.msgDel(code, m.id); } catch (e) {} loadList(); });
        item.appendChild(del); list.appendChild(item);
      });
    }
    loadList(); timers.push(setInterval(() => { if (visible()) loadList(); }, 8000));
    setTimeout(() => { try { insT.focus({ preventScroll: true }); } catch (e) {} }, 60);
  }
  function lightbox(src) {
    const close = el('button', { type: 'button', class: 'sd-ib', 'aria-label': 'Band karo' }, [svg('close')]);
    const lb = el('div', { class: 'sd-lb', id: 'sdLb', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Photo' }, [el('img', { src, alt: 'Bachche ka jawab (photo)' }), close]);
    const shut = () => { lb.remove(); d.removeEventListener('keydown', onKey, true); };
    const onKey = e => { if (e.key === 'Escape') { e.stopPropagation(); shut(); } };
    lb.addEventListener('click', e => { if (e.target === lb || e.target === close || close.contains(e.target)) shut(); }); d.addEventListener('keydown', onKey, true); d.body.appendChild(lb); close.focus();
  }

  // =====================================================  NOT KID STUDENT: the "Mentor" page  =====================================================
  async function pgLoad(force) {
    const C = cloud(), P = S.pg; if (!C || !S.uid || P.busy || (P.loaded && !force)) return;
    P.busy = true; P.err = '';
    try { P.link = await C.own(); S.own = P.link ? P.link.code : ''; P.mentors = P.link ? await C.mentors(P.link.code) : []; } catch (e) { P.err = fail(e); }
    P.loaded = true; P.busy = false; sync(); draw();
  }
  function viewHTML() {
    style(); const P = S.pg;
    if (!S.uid) return `<h1 style="font-size:26px;margin-top:14px">Mentor</h1><p class="mut">Pehle login karo.</p>`;
    if (!P.loaded && !P.busy) pgLoad();
    const head = `<h1 style="font-size:26px;margin-top:14px">Mentor</h1>`;
    if (!P.loaded) return head + '<p class="mut" style="margin-top:14px">Load ho raha hai…</p>';
    const msg = (P.msg ? `<p class="mut" role="status" style="margin-top:10px">${esc(P.msg)}</p>` : '') + (P.err ? `<p class="err">${esc(P.err)}</p>` : '');
    if (!P.link) return head + `<div class="card" style="margin-top:12px"><p style="margin:0 0 8px">Mentor tumhe padhai ke sandesh bhej sakta hai: tumhari screen par sawaal ya kaam aayega, aur tum photo ya awaaz se jawab de sakte ho.</p>
      <p class="mut" style="margin:0 0 12px">Code banao aur apne mentor ko do. Mentor ke code daalne ke baad yahan tumhe use manzoor karna hoga.</p>
      <button class="btn" data-sd="mk" ${P.busy ? 'disabled' : ''}>Mentor code banao</button></div>${msg}`;
    const ms = P.mentors || [], pend = ms.filter(m => m.status !== 'approved'), appr = ms.filter(m => m.status === 'approved');
    const row = (m, ok) => `<div class="bl-row" style="margin-top:8px;gap:8px"><span>${esc(String(m.name || 'Mentor').slice(0, 40))}${ok ? ' <span class="mut">(mentor)</span>' : ' <span class="mut">judna chahta hai</span>'}</span><span style="display:flex;gap:6px">${ok ? '' : `<button class="chip" data-sd="ok" data-u="${esc(m.uid)}" ${P.busy ? 'disabled' : ''}>Manzoor karo</button>`}<button class="chip" data-sd="no" data-u="${esc(m.uid)}" ${P.busy ? 'disabled' : ''}>${ok ? 'Hatao' : 'Mana karo'}</button></span></div>`;
    return head + `<div class="card" style="margin-top:12px"><p class="mut" style="margin:0">Ye code apne mentor ko do</p>
      <p style="margin:6px 0 10px;font-size:30px;font-weight:800;letter-spacing:4px" aria-label="Mentor code">${esc(fmt(P.link.code))}</p>
      <div class="chips"><button class="chip" data-sd="cp">Code copy karo</button><button class="chip" data-sd="new" ${P.busy ? 'disabled' : ''}>Naya code</button></div></div>
      <div class="card" style="margin-top:12px"><h2 class="sec" style="margin:0 0 4px">Mentor</h2>
      ${pend.length ? `<p class="mut" style="margin:0">Request aayi hai: pehchano to manzoor karo.</p>${pend.map(m => row(m, false)).join('')}` : ''}
      ${appr.length ? appr.map(m => row(m, true)).join('') : (pend.length ? '' : '<p class="mut" style="margin:0">Abhi koi mentor juda nahi hai.</p>')}
      <p class="mut" style="margin:10px 0 0;font-size:12.5px">Manzoor kiya hua mentor tumhe sandesh bhej sakta hai. Tum jab chaho use hata sakte ho.</p></div>${msg}
      <div class="chips" style="margin-top:14px"><button class="chip" data-sd="rf">Taaza karo</button><button class="chip" data-sd="off" ${P.busy ? 'disabled' : ''}>Mentor band karo</button></div>`;
  }
  async function pgDo(a, u) {
    const C = cloud(), P = S.pg; if (!C || P.busy) return;
    if (a === 'cp') { const c = P.link && P.link.code; if (c && g.navigator.clipboard && g.navigator.clipboard.writeText) g.navigator.clipboard.writeText(fmt(c)).then(() => { P.msg = 'Code copy ho gaya.'; draw(); }, () => {}); return; }
    if (a === 'rf') { P.msg = ''; pgLoad(true); return; }
    if (a === 'no' && !g.confirm('Is mentor ko hata dein? Wo ab sandesh nahi bhej payega.')) return;
    if (a === 'ok' && !g.confirm('Kya tum is mentor ko jaante ho? Ye tumhe padhai ke sandesh bhej sakega.')) return;
    if (a === 'off' && !g.confirm('Mentor band karein? Mentor aur uske sandesh sab hat jayenge.')) return;
    if (a === 'new' && !g.confirm('Naya code banane par purane code se jude mentor hat jayenge. Pakka?')) return;
    P.busy = true; P.err = ''; P.msg = ''; draw();
    try {
      if (a === 'mk') { const l = await C.create(firstName() || 'Bachcha', true); P.link = l; S.own = l.code; P.mentors = []; P.msg = 'Code ban gaya. Ye code mentor ko do.'; }
      else if (a === 'ok') { await C.mentorApprove(P.link.code, u); P.msg = 'Mentor juda gaya.'; }
      else if (a === 'no') { await C.mentorDrop(P.link.code, u); P.msg = 'Hata diya.'; }
      else if (a === 'off') { await C.remove(P.link.code); P.link = null; S.own = ''; P.mentors = []; P.msg = 'Mentor band ho gaya.'; }
      else if (a === 'new') { await C.remove(P.link.code); const l = await C.create(firstName() || 'Bachcha', true); P.link = l; S.own = l.code; P.mentors = []; P.msg = 'Naya code ban gaya.'; }
    } catch (e) { P.err = fail(e); }
    P.busy = false; P.loaded = false; sync(); await pgLoad(true);
  }
  // A number for the sidebar: requests waiting for the student's yes.
  const badge = () => { const n = (S.pg.mentors || []).filter(m => m.status !== 'approved').length; return n > 0 ? n : null; };

  // ---- events ----
  d.addEventListener('click', e => {
    const b = e.target && e.target.closest ? e.target.closest('[data-sd]') : null; if (!b || b.disabled) return;
    const a = b.dataset.sd;
    if (a === 'open') openSheet(b.dataset.v, b.dataset.nm);
    else pgDo(a, b.dataset.u);
  });
  d.addEventListener('visibilitychange', () => { if (visible()) { sync(); show(); } });
  setInterval(() => { try { sync(); } catch (e) {} }, 4000);
  setInterval(() => { try { if (typeof VIEW !== 'undefined' && VIEW === 'mentor' && visible() && mode() === 'notkid' && !S.pg.busy) pgLoad(true); } catch (e) {} }, 15000);

  g.SANDESH = {
    cardHTML, viewHTML, badge, open: openSheet,
    setUser(u) { const id = u && u.uid ? u.uid : ''; if (id === S.uid) return; unwatch(); S.uid = id; S.own = ''; S.ownLoaded = false; S.local = {}; S.pg = { loaded: false, busy: false, err: '', msg: '', link: null, mentors: [] }; if (S.sheet) { S.sheet.root.remove(); S.sheet = null; d.body.classList.remove('sd-lock'); } sync(); },
    busy: () => !!(S.sheet || S.rec),
    _state: S, _sync: sync, _show: show, _onMsgs: onMsgs, _pgLoad: pgLoad
  };
})(window);
