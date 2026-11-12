// public/parent-key.js  -  Parent-assisted BYOK for Orbit: the key + consent logic and the "Advanced AI Features" page.
// Loaded in index.html (after cloud.js). index.html calls PARENT_KEY.setUser(uid) on login / logout and PARENT_KEY.viewHTML() for the page.
//
// The Gemini key lives ONLY on this device, saved PER LOGGED-IN ACCOUNT (a second student on the same phone never sees or uses it).
// It is sent to the Orbit server in the X-User-Key header on AI calls and is never stored or logged there.
(function () {
  'use strict';
  const g = window;
  const PREFIX = 'orbit.pk.';                                // one slot per account: orbit.pk.<uid>
  const LEGACY = ['orbit.userKey', 'orbit.userKey.on'];      // the first version used ONE slot for everybody: removed, never reused
  const KEY_RE = /^AIza[0-9A-Za-z_-]{35}$/;
  const GOOGLE_LINK = 'https://aistudio.google.com/apikey';
  const CONSENT_VERSION = 1;
  const get = k => { try { return g.localStorage.getItem(k) || ''; } catch (e) { return ''; } };
  const set = (k, v) => { try { v ? g.localStorage.setItem(k, v) : g.localStorage.removeItem(k); } catch (e) {} };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const redraw = () => { if (typeof g.draw === 'function') g.draw(); };

  const ERR = {
    bad_format: 'Ye key sahi nahi lag rahi. Key "AIza" se shuru hoti hai aur 39 akshar ki hoti hai. Dobara copy karke paste karein.',
    invalid: 'Google ne ye key accept nahi ki. Naya key banakar try karein.',
    quota: 'Is key ki aaj ki free limit khatam ho gayi hai. Kal dobara chalega.',
    busy: 'Google abhi busy hai. 1-2 minute baad "Test key" dobara dabayein.',
    net: 'Internet nahi hai. Net chalu karke dobara try karein.',
    login: 'Pehle bacche ke account se log in karein.',
    consent: 'Parent ki haan save nahi ho paayi. Internet check karke dobara try karein. Key save nahi hui.'
  };
  const STEPS = [
    'Neeche ka button dabakar Google ka page kholein. Apne (parent ke) Gmail se login karein.',
    '"Create API key" dabayein. Naya project banane ko kahe to bana lein.',
    'Jo lamba code aaye (AIza se shuru), "Copy" dabayein.',
    'Bacche ke phone par Orbit kholein: Menu > Advanced AI Features. Wahan key paste karein.'
  ];
  const WARN = [
    'Billing (paise wala option) on mat karein. Free key hi kaafi hai. Free key ki roz ki limit hoti hai; poori ho jaye to kal tak ruk jayein.',
    'Ye key kisi ke saath share mat karein (WhatsApp group mein bhi nahi).',
    'Key sirf is phone par rehti hai, Orbit ke database mein nahi. "Key hatayein" se kabhi bhi hata sakte hain. Chahein to Google AI Studio se key delete bhi kar dein.'
  ];
  const ytId = s => { s = String(s || '').trim(); const m = s.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([\w-]{11})/); return m ? m[1] : (/^[\w-]{11}$/.test(s) ? s : ''); };

  const PK = {
    uid: '',
    _session: '',                                           // key of a student who did not tick "remember": memory only, gone when the tab closes
    st: { lang: 'hi', consent: false, remember: true, key: '', show: false, busy: false, msg: '', err: false, edit: false },
    CONSENT_TEXT: 'Main (parent) samajhta/samajhti hoon: bacche ke jawab ka text Google ko bheja jayega taaki AI use check kare. Awaaz save nahi hoti. Orbit sirf text aur score save karta hai. Google ki free key par bheja gaya text Google apne product behtar banane ke liye use kar sakta hai. Isliye bacche ka naam, school ya phone number kabhi nahi bheja jata.',
    CONSENT_VERSION,
    STEPS, WARN, ERR,

    // index.html calls this whenever Firebase tells it who is logged in (uid, or '' when logged out).
    setUser(uid) {
      uid = uid || '';
      LEGACY.forEach(k => set(k, ''));
      if (uid === PK.uid) return;
      PK.uid = uid; PK._session = '';
      Object.assign(PK.st, { key: '', consent: false, show: false, busy: false, msg: '', err: false, edit: false });
    },
    _name: () => (PK.uid ? PREFIX + PK.uid : ''),
    key() { const n = PK._name(); return n ? get(n) : ''; },
    current() { return PK.uid ? (PK._session || PK.key()) : ''; },
    has() { return !!PK.current(); },
    mask() { const k = PK.current(); return k ? '••••' + k.slice(-4) : ''; },
    save(key, remember) {
      key = String(key || '').replace(/\s+/g, '');
      if (!PK.uid) throw new Error(ERR.login);
      if (!KEY_RE.test(key)) throw new Error(ERR.bad_format);
      set(PK._name(), remember ? key : '');                 // not ticked: never written to the device
      PK._session = remember && get(PK._name()) === key ? '' : key;   // storage blocked (private mode)? keep it in memory for this tab instead of losing it silently
    },
    disconnect() { const n = PK._name(); if (n) set(n, ''); PK._session = ''; },
    // Add to every AI request: fetch(url, { headers: { ...PK.headers(), ... } })
    headers() { const k = PK.current(); return k ? { 'X-User-Key': k } : {}; },

    // "Test key": the server pings Google once with the key; it is not stored or logged. Needs the Firebase login (window.CLOUD.token()).
    async test(key) {
      key = String(key || PK.current() || '').replace(/\s+/g, '');
      if (!KEY_RE.test(key)) return { ok: false, msg: ERR.bad_format };
      try {
        const tok = await g.CLOUD.token();
        const r = await g.fetch((g.ORBIT_API || '') + '/api/byok/test', { method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok, 'X-User-Key': key }, body: '{}' });
        const j = await r.json().catch(() => ({}));
        return r.ok ? { ok: true, msg: 'Key sahi hai. Ab Orbit mein AI check chalega.' } : { ok: false, msg: ERR[j.code] || ERR.busy };
      } catch (e) { return { ok: false, msg: ERR.net }; }
    },

    // Parent's consent -> Firestore users/{uid}/consent/byok (written by cloud.js consentSet). The key is NOT saved if this fails.
    async saveConsent() {
      if (!g.CLOUD || !g.CLOUD.consentSet) throw new Error('consent');
      await g.CLOUD.consentSet({ version: CONSENT_VERSION, text: PK.CONSENT_TEXT });
    },

    // WhatsApp "Parent ko bhejo" button (opens WhatsApp with a ready message).
    whatsappUrl() {
      const link = g.location.origin + '/?parent-setup=1';
      const msg = 'Namaste. Mera bachha Orbit mein AI se apna jawab check karega. Iske liye ek free Google key chahiye, 5 minute lagenge. Is link par video aur steps hain: ' + link;
      return 'https://wa.me/?text=' + encodeURIComponent(msg);
    },

    // The page is a normal Orbit screen (follows light / dark theme). Sidebar: go('ai'). Parents without a login see the guide only (?parent-setup=1).
    openPage() { if (typeof g.go === 'function') g.go('ai'); },

    videoHTML(lang) {
      const u = String(((g.ORBIT_AI_VIDEOS || {})[lang]) || '').trim(), box = 'width:100%;aspect-ratio:16/9;border:0;border-radius:12px;margin-top:8px;background:rgba(128,128,128,.15)';
      if (/^(https:\/\/|\/)\S+\.(mp4|webm)(\?\S*)?$/i.test(u)) return `<video controls playsinline preload="metadata" src="${esc(u)}" style="${box}"></video>`;
      const id = ytId(u);
      if (id) return `<iframe src="https://www.youtube-nocookie.com/embed/${id}" title="Gemini key tutorial" loading="lazy" allowfullscreen style="${box}"></iframe>`;
      return '<p class="mut" style="margin-top:8px">Is language ka video jaldi aa raha hai. Tab tak upar ke steps follow karein.</p>';
    },

    viewHTML() {
      const s = PK.st, guest = !PK.uid, has = PK.has(), connected = !guest && has && !s.edit, off = s.busy ? 'disabled' : '';
      const note = s.msg ? `<p class="${s.err ? 'err' : 'mut'}" role="status" style="margin:12px 0 0">${esc(s.msg)}</p>` : '';
      const ghost = 'background:var(--card);color:var(--tx);border:1px solid var(--ln)';
      let top = '';
      if (guest) {
        top = `<div class="card"><h2 class="sec" style="margin-top:0">Bacche ke phone par key lagani hai</h2>
          <p class="mut">Key bacche ke phone par Orbit mein paste hoti hai (Menu &gt; Advanced AI Features). Neeche key banane ke steps hain. Ye page kholne ke liye login ki zaroorat nahi.</p>
          <button class="btn" data-act="login">Is phone par bacche ke account se log in karein</button></div>`;
      } else if (connected) {
        top = `<div class="card"><h2 class="sec" style="margin-top:0">Gemini connected ✓</h2>
          <p class="mut">Key: ${esc(PK.mask())} · ${PK.key() ? 'sirf is phone par save hai' : 'sirf is tab mein hai (tab band hote hi hat jayegi)'}</p>
          <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" data-pk="test" ${off}>${s.busy ? 'Check ho raha hai…' : 'Test key'}</button>
          <button class="btn" data-pk="edit" style="${ghost}" ${off}>Key badlein</button><button class="btn" data-pk="off" style="${ghost}" ${off}>Key hatayein</button></div>${note}</div>`;
      } else {
        top = `<div class="card"><h2 class="sec" style="margin-top:0">Key connect karein</h2>
          <p class="mut">Ye kaam bacche ke parent/guardian ka hai. Key banane ke steps neeche hain.</p>
          <ul class="mut" style="padding-left:20px;margin:10px 0 0">${WARN.map(w => `<li style="margin:4px 0">${esc(w)}</li>`).join('')}</ul>
          <div style="display:flex;gap:8px;margin-top:14px"><input id="pkKey" type="${s.show ? 'text' : 'password'}" value="${esc(s.key)}" placeholder="AIza..." aria-label="Gemini API key" autocomplete="off" autocapitalize="off" spellcheck="false" style="flex:1;min-width:0;padding:12px;border:1px solid var(--ln);border-radius:12px;background:var(--card);color:var(--tx);font:inherit"><button class="chip" data-pk="show" aria-pressed="${s.show}">Dikhao</button></div>
          <label style="display:flex;gap:10px;align-items:flex-start;margin-top:12px"><input type="checkbox" data-pk="cons" ${s.consent ? 'checked' : ''} style="margin-top:4px;width:18px;height:18px;flex:none"><span>${esc(PK.CONSENT_TEXT)}</span></label>
          <label style="display:flex;gap:10px;align-items:flex-start;margin-top:10px"><input type="checkbox" data-pk="rem" ${s.remember ? 'checked' : ''} style="margin-top:4px;width:18px;height:18px;flex:none"><span class="mut">Is device par yaad rakho (key sirf is phone par rahegi, Orbit ke database mein nahi). Shared phone par tick hata dein.</span></label>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px"><button class="btn" data-pk="test" style="${ghost}" ${off}>Test key</button><button class="btn" data-pk="go" ${off || (s.consent ? '' : 'disabled')}>${s.busy ? 'Check ho raha hai…' : 'Connect karein'}</button></div>
          ${s.consent ? '' : '<p class="mut" style="margin:8px 0 0">Connect karne se pehle parent wala box tick karein.</p>'}${note}
          ${PK.has() ? '<button class="lnk" data-pk="cancel" style="margin-top:8px">Pehle wali key rehne dein</button>' : ''}
          <p class="mut" style="margin:12px 0 0;font-size:13px">Key na ho to bhi bachha roz ek baar free AI check kar sakta hai.</p></div>`;
      }
      const steps = `<div class="card"><h2 class="sec" style="margin-top:0">Key kaise banayein</h2>
        <ol style="padding-left:20px;margin:0">${STEPS.map(t => `<li style="margin:4px 0">${esc(t)}</li>`).join('')}</ol>
        <p class="mut" style="margin:8px 0">Google ki screen kabhi kabhi badal jaati hai. Video se alag dikhe to button wala page dekhein.</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap"><a class="btn" href="${GOOGLE_LINK}" target="_blank" rel="noopener" style="text-decoration:none;display:inline-block">Google key page kholein</a>
        ${guest ? '' : `<a class="btn" href="${esc(PK.whatsappUrl())}" target="_blank" rel="noopener" style="text-decoration:none;display:inline-block;${ghost}">Parent ko WhatsApp par bhejo</a>`}</div></div>`;
      const video = `<div class="card"><h2 class="sec" style="margin-top:0">Video: key kaise banti hai</h2>
        <div class="chips" role="group" aria-label="Video ki language">${[['hi', 'हिन्दी'], ['as', 'অসমীয়া'], ['bn', 'বাংলা']].map(([k, n]) => `<button class="chip" data-pk="lang" data-v="${k}" aria-pressed="${s.lang === k}">${n}</button>`).join('')}</div>
        ${PK.videoHTML(s.lang)}</div>`;
      return `<h1 style="font-size:26px;margin:14px 0 6px">Advanced AI Features</h1>
        <p class="mut" style="margin:0 0 4px">Aapka bachha Orbit mein AI se apna jawab check karega. Iske liye ek free Google key chahiye. 5 minute lagenge.</p>${top}${steps}${video}`;
    },

    // One click handler for every [data-pk] button of the page.
    act(a, el) {
      const s = PK.st;
      switch (a) {
        case 'lang': s.lang = (el && el.dataset && el.dataset.v) || 'hi'; break;
        case 'cons': s.consent = !s.consent; s.msg = ''; break;
        case 'show': s.show = !s.show; break;
        case 'rem': s.remember = !s.remember; return;       // the box has already changed itself; no redraw (keeps the typed key)
        case 'go': connect(); return;
        case 'test': testNow(); return;
        case 'edit': Object.assign(s, { edit: true, key: '', msg: '', err: false, consent: false }); break;
        case 'cancel': Object.assign(s, { edit: false, key: '', msg: '', err: false }); break;
        case 'off': PK.disconnect(); Object.assign(s, { edit: false, key: '', consent: false, err: false, msg: 'Key is phone se hata di gayi. Chahein to Google AI Studio se key delete bhi kar dein.' }); break;
        default: return;
      }
      redraw();
    }
  };

  const typedKey = () => String(PK.st.key || '').replace(/\s+/g, '');
  function say(msg, err, busy) { Object.assign(PK.st, { msg, err: !!err, busy: !!busy }); redraw(); }
  async function testNow() {
    const k = typedKey() || PK.current();
    if (!k) return say('Pehle key paste karein.', true);
    say('Check ho raha hai…', false, true);
    const r = await PK.test(k);
    say(r.msg, !r.ok);
  }
  async function connect() {
    const s = PK.st, k = typedKey();
    if (!s.consent) return say('Pehle parent wala box tick karein.', true);
    if (!KEY_RE.test(k)) return say(ERR.bad_format, true);
    say('Check ho raha hai…', false, true);
    const t = await PK.test(k);
    if (!t.ok) return say(t.msg, true);
    try { await PK.saveConsent(); } catch (e) { return say(ERR.consent, true); }   // consent first: no record, no key
    try { PK.save(k, s.remember); } catch (e) { return say(e.message, true); }
    Object.assign(s, { key: '', edit: false, consent: false, show: false });
    say('Gemini connect ho gaya ✓', false);
  }

  g.document.addEventListener('click', e => {
    const b = e.target && e.target.closest ? e.target.closest('[data-pk]') : null;
    if (b && !b.disabled) PK.act(b.dataset.pk, b);
  });
  g.document.addEventListener('input', e => { if (e.target && e.target.id === 'pkKey') PK.st.key = e.target.value; });

  g.PARENT_KEY = PK;
})();
