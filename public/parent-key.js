// public/parent-key.js  -  Parent-assisted BYOK for Orbit. Add <script src="/parent-key.js"></script> in index.html (after cloud.js).
// Key lives ONLY in this device's localStorage. It is sent to the Orbit server in header X-User-Key on each AI call, never stored there.
(function () {
  const LS = 'orbit.userKey', LS_ON = 'orbit.userKey.on';
  const KEY_RE = /^AIza[0-9A-Za-z_-]{35}$/;
  const get = k => { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } };
  const set = (k, v) => { try { v ? localStorage.setItem(k, v) : localStorage.removeItem(k); } catch (e) {} };
  const GOOGLE_LINK = 'https://aistudio.google.com/apikey';

  const ERR = {
    bad_format: 'Ye key sahi nahi lag rahi. Key "AIza" se shuru hoti hai aur 39 akshar ki hoti hai. Dobara copy karke paste karein.',
    invalid: 'Google ne ye key accept nahi ki. Naya key banakar try karein.',
    quota: 'Is key ki aaj ki free limit khatam ho gayi hai. Kal dobara chalega.',
    busy: 'Google abhi busy hai. 1-2 minute baad "Test key" dobara dabayein.',
    net: 'Internet nahi hai. Net chalu karke dobara try karein.'
  };

  const PK = {
    key: () => (get(LS_ON) === '1' ? get(LS) : ''),
    has: () => !!PK.key(),
    save(key, remember) {
      key = String(key || '').trim();
      if (!KEY_RE.test(key)) throw new Error(ERR.bad_format);
      set(LS, key); set(LS_ON, remember ? '1' : '');
      if (!remember) PK._session = key;       // not ticked: kept in memory only until the tab closes
    },
    disconnect() { set(LS, ''); set(LS_ON, ''); PK._session = ''; },
    current: () => PK._session || PK.key(),
    // Add to every AI request: fetch(url, { headers: { ...PK.headers(), ... } })
    headers() { const k = PK.current(); return k ? { 'X-User-Key': k } : {}; },

    // "Test key" button. Needs window.CLOUD.token() (Firebase login).
    async test(key) {
      key = String(key || PK.current() || '').trim();
      if (!KEY_RE.test(key)) return { ok: false, msg: ERR.bad_format };
      try {
        const tok = await window.CLOUD.token();
        const r = await fetch((window.ORBIT_API || '') + '/api/byok/test', { method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok, 'X-User-Key': key }, body: '{}' });
        const j = await r.json().catch(() => ({}));
        return r.ok ? { ok: true, msg: 'Key sahi hai. Ab Orbit mein AI check chalega.' } : { ok: false, msg: ERR[j.code] || ERR.busy };
      } catch (e) { return { ok: false, msg: ERR.net }; }
    },

    // Consent -> Firestore users/{uid}/consent/byok (existing rules already allow this path; no rule change needed).
    // Add one line in cloud.js window.CLOUD: consentSet: d => setDoc(doc(db,'users',auth.currentUser.uid,'consent','byok'), {...d, at: serverTimestamp()})
    async saveConsent() {
      if (window.CLOUD && window.CLOUD.consentSet) await window.CLOUD.consentSet({ version: 1, text: PK.CONSENT_TEXT });
    },

    CONSENT_TEXT: 'Main (parent) samajhta/samajhti hoon: bacche ke jawab ka text Google ko bheja jayega taaki AI use check kare. Awaaz save nahi hoti. Orbit sirf text aur score save karta hai. Google ki free key par bheja gaya text Google apne product behtar banane ke liye use kar sakta hai. Isliye bacche ka naam, school ya phone number kabhi nahi bheja jata.',

    // WhatsApp "Parent ko bhejo" button (opens WhatsApp with a ready message).
    whatsappUrl() {
      const link = location.origin + '/?parent-setup=1';
      const msg = 'Namaste. Mera bachha Orbit mein AI se apna jawab check karega. Iske liye ek free Google key chahiye, 5 minute lagenge. Is link par video aur steps hain: ' + link;
      return 'https://wa.me/?text=' + encodeURIComponent(msg);
    },

    // Parent page. Call PK.openPage() from a menu item, or auto-open when location.search has parent-setup=1.
    openPage() {
      let el = document.getElementById('pk-page');
      if (el) el.remove();
      el = document.createElement('div'); el.id = 'pk-page';
      el.style.cssText = 'position:fixed;inset:0;z-index:9999;background:#fff;color:#222;overflow:auto;padding:20px;font:16px/1.6 system-ui,sans-serif';
      const stepsDone = PK.has();
      el.innerHTML = `
<div style="max-width:560px;margin:0 auto">
 <button id="pk-x" style="float:right;border:0;background:none;font-size:22px">&times;</button>
 <h2 style="margin:0 0 6px">Orbit ke liye ek free key</h2>
 <p>Aapka bachha Orbit mein AI se apna jawab check karega. Iske liye ek free Google key chahiye. 5 minute lagenge.</p>

 <h3>Video dekhein</h3>
 <p style="color:#666">Hindi, Assamese aur Bengali mein video yahan lagega (src add karna hai).</p>
 <video id="pk-video" controls playsinline style="width:100%;background:#eee;border-radius:8px;min-height:160px"></video>

 <h3>Steps</h3>
 <ol>
  <li>Neeche ka button dabakar Google ka page kholein. Apne Gmail se login karein.</li>
  <li>"Create API key" dabayein. Naya project banane ko kahe to bana lein.</li>
  <li>Jo lamba code aaye, "Copy" dabayein.</li>
  <li>Wapas yahan aakar neeche paste karein.</li>
 </ol>
 <p><a href="${GOOGLE_LINK}" target="_blank" rel="noopener" style="display:block;text-align:center;padding:12px;border:1px solid #bbb;border-radius:8px;color:#222;text-decoration:none">Google key page kholein</a></p>
 <p style="color:#666;font-size:14px">Google ki screen kabhi kabhi badal jaati hai. Agar video se alag dikhe to upar wale button ka page dekhein.</p>

 <h3>Zaroori baatein</h3>
 <ul>
  <li>Billing (paise wala option) on mat karein. Free key hi kaafi hai.</li>
  <li>Ye key kisi ke saath share mat karein.</li>
 </ul>

 <h3>Key paste karein</h3>
 <input id="pk-in" placeholder="AIza..." autocomplete="off" style="width:100%;box-sizing:border-box;padding:12px;border:1px solid #bbb;border-radius:8px">
 <label style="display:block;margin:10px 0"><input type="checkbox" id="pk-rem" checked> Is device par yaad rakho (key sirf is phone par rahegi, Orbit ke database mein nahi)</label>
 <label style="display:block;margin:10px 0"><input type="checkbox" id="pk-ok"> ${PK.CONSENT_TEXT}</label>
 <button id="pk-test" style="padding:12px 16px;border:1px solid #bbb;border-radius:8px;background:#fff">Test key</button>
 <button id="pk-save" style="padding:12px 16px;border:0;border-radius:8px;background:#222;color:#fff">Save karein</button>
 <p id="pk-msg" style="min-height:24px"></p>

 <h3>Parent ko bhejo</h3>
 <p><a href="${PK.whatsappUrl()}" target="_blank" rel="noopener">WhatsApp par parent ko link bhejein</a></p>

 <div id="pk-conn" style="${stepsDone ? '' : 'display:none'}">
  <h3>Key connected hai</h3>
  <button id="pk-off" style="padding:10px 14px;border:1px solid #bbb;border-radius:8px;background:#fff">Key hatayein ya badlein</button>
 </div>
 <p style="color:#666;font-size:14px">Key na ho to bhi bachha roz ek baar free AI check kar sakta hai.</p>
</div>`;
      document.body.appendChild(el);
      const $ = id => el.querySelector(id), say = t => { $('#pk-msg').textContent = t; };
      $('#pk-x').onclick = () => el.remove();
      $('#pk-test').onclick = async () => { say('Check ho raha hai...'); say((await PK.test($('#pk-in').value)).msg); };
      $('#pk-save').onclick = async () => {
        if (!$('#pk-ok').checked) return say('Pehle upar wali baat padhkar tick karein.');
        const t = await PK.test($('#pk-in').value); if (!t.ok) return say(t.msg);
        try { PK.save($('#pk-in').value, $('#pk-rem').checked); await PK.saveConsent(); say('Ho gaya. Key save ho gayi.'); $('#pk-conn').style.display = ''; }
        catch (e) { say(e.message); }
      };
      $('#pk-off').onclick = () => { PK.disconnect(); $('#pk-conn').style.display = 'none'; say('Key is device se hata di gayi.'); };
    }
  };
  window.PARENT_KEY = PK;
  if (/[?&]parent-setup=1/.test(location.search)) addEventListener('load', () => setTimeout(PK.openPage, 300));
})();
