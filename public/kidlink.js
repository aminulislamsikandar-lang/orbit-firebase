// public/kidlink.js - Kid mode: a parent connects to a child's phone with a code.
//   Child's phone ("I am a kid"): sees only Bolo. In Bolo > "Parent ke liye" the parent makes an 8-character code (KIDLINK.kidPanelHTML).
//     The phone shares only a small summary (today's minutes, how many right / to repeat, total right) and reads the limit and mic switch the parent set.
//   Parent's phone ("I am parent"): sees only the parent screen (KIDLINK.parentHTML): paste the code, see the child's day, set the limit and the mic switch.
// Data lives in Firestore (window.CLOUD.kids, see firestore.rules: kidLinks). The code is the secret. No recognised text and no photos are shared. Audio is shared only for Byanjan "Saath me bolo" and only when the parent ticks it: the recording goes to the parent and is deleted after 2 hours (bolorec.js).
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
      if (r.rev > seen) { try { g.localStorage.setItem(REV + S.uid, String(r.rev)); } catch (e) {} if (g.BOLO && g.BOLO.applyRemote) g.BOLO.applyRemote({ limit: r.limit, mic: r.mic, rec: r.rec === true }); }
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
    const cur = k.set || { limit: 10, mic: true, rec: false }, next = { limit: patch.limit != null ? patch.limit : cur.limit, mic: patch.mic != null ? patch.mic : cur.mic, rec: patch.rec != null ? !!patch.rec : cur.rec === true, rev: Date.now(), at: Date.now() };
    try { await C.putSet(code, next); k.set = next; S.par.err = ''; S.par.msg = 'Bachche ke phone par agli baar khulte hi lag jayega.'; } catch (e) { S.par.err = fail(e); }
    draw();
  }
  // ---- the parent's numbers: a green ring (today's minutes against the limit), coloured number cards, a "right answers" meter ----
  const KI = {   // thin line icons (no emoji)
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', ok: '<path d="M5 12.5l4.2 4.2L19 7"/>',
    redo: '<path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1"/><path d="M3.5 4v4.6H8"/>', star: '<path d="M12 3.2l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17.2l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>'
  };
  const kic = n => `<svg class="kl-ic" viewBox="0 0 24 24" aria-hidden="true">${KI[n]}</svg>`;
  function klStyle() {
    if (g.document.getElementById('klStyle')) return;
    const e = g.document.createElement('style'); e.id = 'klStyle';
    e.textContent = `.kl-ic{width:22px;height:22px;flex:none;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.kl-kid{background:linear-gradient(165deg,rgba(34,197,94,.17),rgba(34,197,94,.03) 60%),var(--card);border:1px solid rgba(34,197,94,.32)}
.kl-head{display:flex;align-items:center;gap:12px}.kl-av{width:44px;height:44px;border-radius:50%;display:grid;place-items:center;color:#fff;font-weight:800;font-size:20px;background:linear-gradient(145deg,#4ade80,#15803d);box-shadow:0 4px 12px rgba(22,163,74,.4)}
.kl-head h2{margin:0}.kl-head small{display:block;color:var(--mut);font-size:12.5px}
.kl-hero{display:flex;align-items:center;gap:16px;margin:14px 0 10px}.kl-ringw{position:relative;width:132px;height:132px;flex:none}.kl-ringw svg{width:100%;height:100%;transform:rotate(-90deg)}
.kl-trk{fill:none;stroke:rgba(34,197,94,.18);stroke-width:12}.kl-arc{fill:none;stroke-width:12;stroke-linecap:round}
.kl-ctr{position:absolute;inset:0;display:grid;place-content:center;text-align:center;line-height:1}.kl-ctr b{font-size:36px;color:#15803d}.kl-ctr span{font-size:12px;color:var(--mut);margin-top:4px}
:root[data-theme="dark"] .kl-ctr b{color:#4ade80}@media(prefers-color-scheme:dark){:root:not([data-theme="light"]) .kl-ctr b{color:#4ade80}}
.kl-side{flex:1;min-width:0}.kl-side strong{display:block;font-size:17px}.kl-side p{margin:4px 0 0;color:var(--mut);font-size:13.5px}
.kl-pill{display:inline-flex;align-items:center;gap:6px;margin-top:8px;border-radius:99px;padding:4px 12px;font-size:13px;font-weight:700;color:#fff;background:linear-gradient(90deg,#16a34a,#22c55e)}.kl-pill .kl-ic{width:16px;height:16px;stroke-width:2.4}
.kl-tiles{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.kl-t{border-radius:16px;padding:12px 10px;color:#fff;display:flex;flex-direction:column;gap:2px;box-shadow:0 6px 14px rgba(0,0,0,.14)}.kl-t b{font-size:30px;line-height:1.05;font-variant-numeric:tabular-nums}.kl-t span{font-size:12.5px;opacity:.95;line-height:1.25}.kl-t .kl-ic{opacity:.9;margin-bottom:4px}
.kl-g{background:linear-gradient(145deg,#22c55e,#15803d)}.kl-a{background:linear-gradient(145deg,#fbbf24,#d97706)}.kl-c{background:linear-gradient(145deg,#2dd4bf,#0f766e)}
.kl-meter{margin-top:12px}.kl-meter div{display:flex;justify-content:space-between;font-size:13.5px;font-weight:600}.kl-meter i{display:block;height:12px;border-radius:99px;margin-top:6px;background:rgba(34,197,94,.18);overflow:hidden}.kl-meter u{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,#84cc16,#22c55e,#0d9488)}
.kl-in .kl-t{animation:klup .5s cubic-bezier(.3,1.4,.5,1) backwards}.kl-in .kl-t:nth-child(2){animation-delay:.1s}.kl-in .kl-t:nth-child(3){animation-delay:.2s}
.kl-in .kl-arc{animation:klring 1.1s ease-out}.kl-in .kl-meter u{animation:klgrow 1s ease-out}
@keyframes klup{from{transform:translateY(14px) scale(.9);opacity:0}}@keyframes klring{from{stroke-dashoffset:326.7}}@keyframes klgrow{from{width:0}}
@media(prefers-reduced-motion:reduce){.kl-in *{animation:none!important}}
@media(max-width:360px){.kl-hero{flex-direction:column;align-items:flex-start}}`;
    g.document.head.appendChild(e);
  }
  function kidStats(k, i, sm, lim) {     // the coloured numbers for one child
    const sec = sm ? +sm.sec || 0 : 0, ok = sm ? +sm.ok || 0 : 0, redo = sm ? +sm.redo || 0 : 0, tot = k.sum ? +k.sum.total || 0 : 0;
    const p = Math.max(0, Math.min(1, sec / (lim * 60))), off = (326.7 * (1 - p)).toFixed(1), pct = ok + redo ? Math.round(ok * 100 / (ok + redo)) : null, full = p >= 1;
    return `<div class="kl-hero"><div class="kl-ringw"><svg viewBox="0 0 132 132" role="img" aria-label="Aaj ${min(sec)} minute, limit ${lim} minute"><defs><linearGradient id="klg${i}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#bef264"/><stop offset=".5" stop-color="#22c55e"/><stop offset="1" stop-color="#0d9488"/></linearGradient></defs>
      <circle class="kl-trk" cx="66" cy="66" r="52"/><circle class="kl-arc" cx="66" cy="66" r="52" stroke="url(#klg${i})" stroke-dasharray="326.7" stroke-dashoffset="${off}"/></svg>
      <div class="kl-ctr"><b>${min(sec)}</b><span>min</span></div></div>
      <div class="kl-side"><strong>Aaj Bolo chala</strong><p>Roz ki limit ${lim} min mein se ${min(sec)} min</p>${full ? `<span class="kl-pill">${kic('ok')}Aaj ka goal poora</span>` : ''}</div></div>
    <div class="kl-tiles"><div class="kl-t kl-g">${kic('ok')}<b>${ok}</b><span>Aaj sahi</span></div><div class="kl-t kl-a">${kic('redo')}<b>${redo}</b><span>Dobara karni hain</span></div><div class="kl-t kl-c">${kic('star')}<b>${tot}</b><span>Ab tak sahi (sab mode)</span></div></div>
    ${pct == null ? '' : `<div class="kl-meter"><div><span>Aaj sahi jawab ka hissa</span><span>${pct}%</span></div><i role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><u style="width:${pct}%"></u></i></div>`}`;
  }
  function parentHTML() {
    klStyle();
    const P = S.par; if (!P.loaded && !P.busy && S.uid) parLoad();
    const now = new Date(), dk = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
    const cards = P.kids.map((k, i) => {
      const sm = k.sum && k.sum.day === dk ? k.sum : null, lim = k.set ? k.set.limit : 10, mic = k.set ? k.set.mic !== false : true;
      P.seen = P.seen || {}; const anim = !P.seen[k.code]; P.seen[k.code] = true;     // the ring and cards animate the first time only, not on every 30-second refresh (the kid objects are rebuilt on each refresh, so it is kept by code)
      return `<div class="card kl-kid${anim ? ' kl-in' : ''}" data-kl-card="${esc(k.code)}" style="margin-top:12px"><div class="kl-head"><div class="kl-av" aria-hidden="true">${esc(String(k.name || '?').trim().charAt(0).toUpperCase() || '?')}</div><div><h2 class="sec">${esc(k.name)}</h2><small>${k.sum ? 'Aakhri update: ' + esc(new Date(k.sum.at).toLocaleString()) : 'Bachche ke phone se abhi koi update nahi aaya.'}</small></div></div>
        ${kidStats(k, i, sm, lim)}
        <div class="bl-row" style="margin-top:14px"><label for="klLim-${esc(k.code)}">Roz ki limit</label><b id="klLimV-${esc(k.code)}">${lim} min</b></div>
        <input id="klLim-${esc(k.code)}" data-kl-lim="${esc(k.code)}" type="range" min="5" max="30" step="5" value="${lim}" style="width:100%;accent-color:#22c55e">
        <label class="bl-row" style="justify-content:flex-start"><input type="checkbox" data-kl-mic="${esc(k.code)}" ${mic ? 'checked' : ''} style="accent-color:#22c55e"> Mic allow hai</label>
        <label class="bl-row" style="justify-content:flex-start"><input type="checkbox" data-kl-rec="${esc(k.code)}" ${k.set && k.set.rec === true ? 'checked' : ''} style="accent-color:#22c55e"> Byanjan "Saath me bolo": bachhe ki awaaz record hokar mujhe mile (2 ghante)</label>
        ${g.BOLOREC ? g.BOLOREC.parentHTML(k.code) : ''}
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
    else if (t.dataset.klRec) parSet(t.dataset.klRec, { rec: !!t.checked });
  });
  g.document.addEventListener('input', e => { const t = e.target; if (t && t.dataset && t.dataset.klLim) { const l = g.document.getElementById('klLimV-' + t.dataset.klLim); if (l) l.textContent = t.value + ' min'; } });
  // every 30 s: the child's phone reads the parent's settings, the parent's phone refreshes the child's day
  // The parent's screen is not redrawn while a code is being typed or a slider is being used (a redraw would wipe it).
  const editing = () => { const a = g.document.activeElement, c = g.document.getElementById('klCode'); return !!((c && c.value) || (a && (a.id === 'klCode' || (a.dataset && (a.dataset.klLim || a.dataset.klMic || a.dataset.klRec)))) || !!(g.BOLOREC && g.BOLOREC.busy())); };
  function tick() {
    if (!S.uid || (g.document.visibilityState && g.document.visibilityState !== 'visible')) return;
    if (role() === 'kid') pull(); else if (role() === 'parent' && !editing()) parLoad(true);
  }
  setInterval(tick, TICK_MS);

  g.KIDLINK = {
    normCode, goodCode, fmt, joinCode, kidPanelHTML, parentHTML, touch,
    kidCode: () => (S.kid.link && S.kid.link.code) || '',
    setUser(u) { const id = u && u.uid ? u.uid : ''; if (id === S.uid) return; S.uid = id; S.kid = { loaded: false, busy: false, err: '', msg: '', link: null, parents: 0 }; S.par = { loaded: false, busy: false, err: '', msg: '', kids: [] }; },
    _state: S, _pull: pull, _push: push, _tick: tick
  };
})(window);
