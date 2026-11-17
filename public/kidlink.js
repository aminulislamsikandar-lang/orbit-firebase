// public/kidlink.js - Kid mode: a parent connects to a child's phone with a code.
//   Child's phone ("I am a kid"): sees only Bolo. In Bolo > "Parent ke liye" the parent makes an 8-character code (KIDLINK.kidPanelHTML).
//     The phone shares only a small summary (today's minutes, how many right / to repeat, total right) and reads the limit and mic switch the parent set.
//   Parent's phone ("I am parent"): sees only the parent screen (KIDLINK.parentHTML): paste the code, see the child's day, set the limit and the mic switch.
// Data lives in Firestore (window.CLOUD.kids, see firestore.rules: kidLinks). The code is the secret. No audio, no recognised text, no photos are shared.
// The phone's role (kid or parent) is kept on that phone (index.html), so one Google account can be used on both phones.
(function (g) {
  'use strict';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const normCode = v => String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
  const goodCode = c => /^[A-HJ-NP-Z2-9]{8}$/.test(c);
  const fmt = c => String(c || '').slice(0, 4) + '-' + String(c || '').slice(4);
  const REV = 'orbit.kl.rev.', PUSH_MS = 20000, TICK_MS = 30000;
  const S = { uid: '', last: 0, pend: 0, kid: { loaded: false, busy: false, err: '', msg: '', link: null, parents: 0 }, par: { loaded: false, busy: false, err: '', msg: '', kids: [] } };
  const cloud = () => (g.CLOUD && g.CLOUD.kids) || null;
  const draw = () => { if (typeof g.draw === 'function') g.draw(); };
  const role = () => (typeof KIDROLE !== 'undefined' && typeof COURSE !== 'undefined' && COURSE && COURSE.kid) ? KIDROLE : '';
  const firstName = () => { const u = typeof USER !== 'undefined' ? USER : null; return String((u && (u.name || u.displayName)) || '').trim().split(/\s+/)[0] || ''; };
  const fail = e => (e && e.code === 'permission-denied') ? 'Ye kaam nahi ho paaya (ijazat nahi mili). Dobara try karo.' : 'Net ya server ki dikkat. Thodi der baad try karo.';
  const field = 'width:100%;padding:10px;border:1px solid var(--ln);border-radius:10px;background:var(--bg);color:var(--tx);font:inherit;margin-top:4px;letter-spacing:2px';
  const min = s => Math.round((+s || 0) / 60);

  // ---- child's phone ----
  async function kidLoad(force) {
    const C = cloud(), K = S.kid; if (!C || !S.uid || K.busy || (K.loaded && !force)) return;
    K.busy = true; K.err = '';
    try { K.link = await C.own(); K.parents = K.link ? (await C.parents(K.link.code)).length : 0; } catch (e) { K.err = fail(e); }
    K.loaded = true; K.busy = false; draw();
    if (K.link) { pull(); touch(true); }
  }
  async function kidMake(renew) {
    const C = cloud(), K = S.kid; if (!C || K.busy) return;
    if (renew && !g.confirm('Naya code banane par purane code se jude parent hat jayenge. Pakka?')) return;
    K.busy = true; K.err = ''; K.msg = ''; draw();
    try {
      if (K.link) { await C.remove(K.link.code); K.link = null; K.parents = 0; }
      K.link = await C.create(firstName() || 'Bachcha'); K.parents = 0; K.msg = 'Code ban gaya. Ye code parent ke phone mein daalo.';
      touch(true);
    } catch (e) { K.err = fail(e); }
    K.busy = false; draw();
  }
  async function kidOff() {
    const C = cloud(), K = S.kid; if (!C || !K.link || K.busy) return;
    if (!g.confirm('Parent se judna band karein? Parent ko ab bachche ka din nahi dikhega.')) return;
    K.busy = true; K.err = ''; K.msg = ''; draw();
    try { await C.remove(K.link.code); K.link = null; K.parents = 0; K.msg = 'Judna band ho gaya.'; } catch (e) { K.err = fail(e); }
    K.busy = false; draw();
  }
  async function push() {
    const C = cloud(), B = g.BOLO; if (!C || !S.kid.link || !B || !B.summary) return;
    const s = B.summary();
    try { await C.putSum(S.kid.link.code, { day: s.day, sec: Math.min(86400, Math.round(s.sec)), ok: s.ok, redo: s.redo, total: s.total, at: Date.now() }); } catch (e) {}
  }
  // Called by Bolo whenever it saves: share the summary at most once in a while.
  function touch(now) {
    if (role() !== 'kid' || !S.kid.link) return;
    const wait = S.last + PUSH_MS - Date.now();
    if (!now && wait > 0) { if (!S.pend) S.pend = setTimeout(() => { S.pend = 0; touch(); }, wait); return; }
    S.last = Date.now(); push();
  }
  // The parent's limit and mic switch, applied once per change.
  async function pull() {
    const C = cloud(); if (role() !== 'kid' || !C || !S.kid.link) return;
    try {
      const r = await C.getSet(S.kid.link.code); if (!r) return;
      let seen = 0; try { seen = +g.localStorage.getItem(REV + S.uid) || 0; } catch (e) {}
      if (r.rev > seen) { try { g.localStorage.setItem(REV + S.uid, String(r.rev)); } catch (e) {} if (g.BOLO && g.BOLO.applyRemote) g.BOLO.applyRemote({ limit: r.limit, mic: r.mic }); }
    } catch (e) {}
  }
  // Inside Bolo's "Parent ke liye" box. edit: false while a parent PIN is set and not entered, so the child can not make a code or leave Kid mode.
  function kidPanelHTML(edit) {
    if (role() !== 'kid') return '';
    const K = S.kid; if (!K.loaded && !K.busy && S.uid) kidLoad();
    const dis = edit && !K.busy ? '' : 'disabled';
    const body = !K.loaded ? '<p class="mut" style="margin:6px 0 0">Load ho raha hai…</p>'
      : K.link ? `<p class="mut" style="margin:6px 0 4px">Parent ke phone par Orbit kholo, Kid mode chuno, \"I am parent\" dabao aur ye code daalo:</p>
        <div style="font-size:28px;font-weight:700;letter-spacing:4px;margin:6px 0" id="klCodeShow" aria-label="Code">${esc(fmt(K.link.code))}</div>
        <div class="chips"><button class="chip" data-kl="copy">Code copy karo</button><button class="chip" data-kl="new" ${dis}>Naya code</button><button class="chip" data-kl="off" ${dis}>Judna band karo</button></div>
        <p class="mut" style="margin:8px 0 0">Jude hue parent: ${K.parents}</p>`
      : `<p class="mut" style="margin:6px 0 8px">Parent ke phone se bachche ka din dekhne aur limit badalne ke liye code banao.</p><button class="btn bl-sec" data-kl="mk" ${dis}>Code banao</button>`;
    return `<div class="bl-kid" style="margin-top:14px;padding-top:12px;border-top:1px solid var(--ln)"><b>Parent ke phone se jodo</b>${body}
      ${K.msg ? `<p class="mut" role="status" style="margin:8px 0 0">${esc(K.msg)}</p>` : ''}${K.err ? `<p class="err">${esc(K.err)}</p>` : ''}
      <div style="margin-top:12px"><button class="chip" data-act="csback" ${edit ? '' : 'disabled'}>Kid mode band karo</button></div></div>`;
  }

  // ---- parent's phone ----
  // Join with a code. Used by the course screen ("I am parent") and by the "another child" box. Returns { ok: true } or { err: 'text' }.
  async function joinCode(raw) {
    const C = cloud(), code = normCode(raw);
    if (!goodCode(code)) return { err: 'Code 8 akshar ka hota hai (jaise ABCD-EFGH). Bachche ke phone se dobara dekho.' };
    if (!C) return { err: 'Net ya server ki dikkat. Thodi der baad try karo.' };
    try {
      const link = await C.link(code);
      if (!link) return { err: 'Ye code nahi mila. Bachche ke phone par dobara dekho, ya naya code banwao.' };
      await C.join(code, firstName() || 'Parent');
      S.par.loaded = false; return { ok: true, code };
    } catch (e) { return { err: fail(e) }; }
  }
  async function parLoad(force) {
    const C = cloud(), P = S.par; if (!C || !S.uid || P.busy || (P.loaded && !force)) return;
    P.busy = true; P.err = '';
    try {
      const out = [];
      for (const code of await C.myKids()) {
        const link = await C.link(code);
        if (!link) { try { await C.forget(code); } catch (e) {} continue; }   // the child stopped sharing
        let sum = null, set = null;
        try { sum = await C.getSum(code); } catch (e) {} try { set = await C.getSet(code); } catch (e) {}
        out.push({ code, name: link.name, sum, set });
      }
      P.kids = out;
    } catch (e) { P.err = fail(e); }
    P.loaded = true; P.busy = false; draw();
  }
  async function parJoin() {
    const el = g.document.getElementById('klCode'), P = S.par; if (P.busy) return;
    P.busy = true; P.err = ''; P.msg = ''; draw();
    const r = await joinCode(el && el.value); P.busy = false;
    if (r.err) { P.err = r.err; draw(); return; }
    P.msg = 'Bachche se jud gaye.'; P.loaded = false; parLoad(true);
  }
  async function parLeave(code) {
    const C = cloud(), P = S.par; if (!C || P.busy) return;
    if (!g.confirm('Is bachche se judna band karein?')) return;
    P.busy = true; draw();
    try { await C.leave(code); P.msg = 'Hata diya.'; } catch (e) { P.err = fail(e); }
    P.busy = false; P.loaded = false; parLoad(true);
  }
  async function parSet(code, patch) {
    const C = cloud(), k = S.par.kids.find(x => x.code === code); if (!C || !k) return;
    const cur = k.set || { limit: 10, mic: true }, next = { limit: patch.limit != null ? patch.limit : cur.limit, mic: patch.mic != null ? patch.mic : cur.mic, rev: Date.now(), at: Date.now() };
    try { await C.putSet(code, next); k.set = next; S.par.err = ''; S.par.msg = 'Bachche ke phone par agli baar khulte hi lag jayega.'; } catch (e) { S.par.err = fail(e); }
    draw();
  }
  function parentHTML() {
    const P = S.par; if (!P.loaded && !P.busy && S.uid) parLoad();
    const now = new Date(), dk = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
    const cards = P.kids.map(k => {
      const sm = k.sum && k.sum.day === dk ? k.sum : null, lim = k.set ? k.set.limit : 10, mic = k.set ? k.set.mic !== false : true;
      return `<div class="card" data-kl-card="${esc(k.code)}" style="margin-top:12px"><h2 class="sec" style="margin:0 0 6px">${esc(k.name)}</h2>
        <table class="bl-tbl"><tr><td>Aaj Bolo chala</td><td>${sm ? min(sm.sec) + ' min' : '0 min'}</td></tr><tr><td>Aaj sahi</td><td>${sm ? sm.ok : 0}</td></tr><tr><td>Dobara karni hain</td><td>${sm ? sm.redo : 0}</td></tr><tr><td>Ab tak sahi (sab mode)</td><td>${k.sum ? k.sum.total : 0}</td></tr></table>
        <p class="mut" style="margin:6px 0 0">${k.sum ? 'Aakhri update: ' + esc(new Date(k.sum.at).toLocaleString()) : 'Bachche ke phone se abhi koi update nahi aaya.'}</p>
        <div class="bl-row" style="margin-top:12px"><label for="klLim-${esc(k.code)}">Roz ki limit</label><b id="klLimV-${esc(k.code)}">${lim} min</b></div>
        <input id="klLim-${esc(k.code)}" data-kl-lim="${esc(k.code)}" type="range" min="5" max="30" step="5" value="${lim}" style="width:100%">
        <label class="bl-row" style="justify-content:flex-start"><input type="checkbox" data-kl-mic="${esc(k.code)}" ${mic ? 'checked' : ''}> Mic allow hai</label>
        <div class="chips" style="margin-top:8px"><button class="chip" data-kl="leave" data-v="${esc(k.code)}">Is bachche se judna band karo</button></div></div>`;
    }).join('');
    return `<h1 style="font-size:26px;margin-top:14px">Parent</h1><p class="mut" style="margin:4px 0 0">Bachche ka Bolo ka din dekho aur limit badlo.</p>
      ${P.busy && !P.loaded ? '<p class="mut" style="margin-top:14px">Load ho raha hai…</p>' : cards || '<p class="mut" style="margin-top:14px">Abhi koi bachcha juda nahi hai. Niche code daalo.</p>'}
      <div class="card" style="margin-top:12px"><h2 class="sec" style="margin:0 0 6px">Bachche ka code daalo</h2><p class="mut" style="margin:0 0 6px">Bachche ke phone par Bolo mein "Parent ke liye" kholo aur "Code banao" dabao.</p>
        <input id="klCode" style="${field}" maxlength="9" autocomplete="off" autocapitalize="characters" placeholder="ABCD-EFGH" aria-label="Bachche ka code"><button class="btn" data-kl="join" ${P.busy ? 'disabled' : ''} style="margin-top:10px">Jodo</button></div>
      ${P.msg ? `<p class="mut" role="status" style="margin-top:10px">${esc(P.msg)}</p>` : ''}${P.err ? `<p class="err">${esc(P.err)}</p>` : ''}
      <div class="chips" style="margin-top:16px"><button class="chip" data-kl="refresh">Taaza karo</button><button class="chip" data-act="csback">Kid mode band karo</button></div>`;
  }

  // ---- events ----
  g.document.addEventListener('click', e => {
    const b = e.target && e.target.closest ? e.target.closest('[data-kl]') : null; if (!b || b.disabled) return;
    const a = b.dataset.kl;
    if (a === 'mk') kidMake(false);
    else if (a === 'new') kidMake(true);
    else if (a === 'off') kidOff();
    else if (a === 'copy') { const c = S.kid.link && S.kid.link.code; if (c && g.navigator.clipboard && g.navigator.clipboard.writeText) g.navigator.clipboard.writeText(fmt(c)).then(() => { S.kid.msg = 'Code copy ho gaya.'; draw(); }, () => {}); }
    else if (a === 'join') parJoin();
    else if (a === 'leave') parLeave(b.dataset.v);
    else if (a === 'refresh') { S.par.msg = ''; parLoad(true); }
  });
  g.document.addEventListener('change', e => {
    const t = e.target; if (!t || !t.dataset) return;
    if (t.dataset.klLim) parSet(t.dataset.klLim, { limit: +t.value });
    else if (t.dataset.klMic) parSet(t.dataset.klMic, { mic: !!t.checked });
  });
  g.document.addEventListener('input', e => { const t = e.target; if (t && t.dataset && t.dataset.klLim) { const l = g.document.getElementById('klLimV-' + t.dataset.klLim); if (l) l.textContent = t.value + ' min'; } });
  // every 30 s: the child's phone reads the parent's settings, the parent's phone refreshes the child's day
  // The parent's screen is not redrawn while a code is being typed or a slider is being used (a redraw would wipe it).
  const editing = () => { const a = g.document.activeElement, c = g.document.getElementById('klCode'); return !!((c && c.value) || (a && (a.id === 'klCode' || (a.dataset && (a.dataset.klLim || a.dataset.klMic))))); };
  function tick() {
    if (!S.uid || (g.document.visibilityState && g.document.visibilityState !== 'visible')) return;
    if (role() === 'kid') pull(); else if (role() === 'parent' && !editing()) parLoad(true);
  }
  setInterval(tick, TICK_MS);

  g.KIDLINK = {
    normCode, goodCode, fmt, joinCode, kidPanelHTML, parentHTML, touch,
    setUser(u) { const id = u && u.uid ? u.uid : ''; if (id === S.uid) return; S.uid = id; S.kid = { loaded: false, busy: false, err: '', msg: '', link: null, parents: 0 }; S.par = { loaded: false, busy: false, err: '', msg: '', kids: [] }; },
    _state: S, _pull: pull, _push: push, _tick: tick
  };
})(window);
