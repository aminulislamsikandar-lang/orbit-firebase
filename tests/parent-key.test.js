// Parent-assisted BYOK: per-account key storage, consent-before-save, connect flow, the Advanced AI Features page and its wiring in index.html.
// Run: node tests/parent-key.test.js   (the click/typing part needs jsdom: npm i -D jsdom; it is skipped without it)
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(ROOT, 'public/parent-key.js'), 'utf8');
const html = fs.readFileSync(path.join(ROOT, 'public/index.html'), 'utf8');
let pass = 0, fail = 0;
const t = (name, ok, extra) => { if (ok) pass++; else { fail++; console.log('FAIL  ' + name + (extra ? '  ' + extra : '')); } };

const KEY = 'AIzaSyD' + 'a'.repeat(32), KEY2 = 'AIzaSyD' + 'b'.repeat(32);   // 39 characters, shape of a real key
function make(over) {
  const store = {}, log = [], listeners = {}, o = Object.assign({ blocked: false, consent: 'ok', fetchRes: { ok: true, json: {} }, tokenErr: false, fetchErr: false }, over);
  const w = {
    localStorage: { getItem: k => { if (o.blocked) throw new Error('blocked'); return k in store ? store[k] : null; }, setItem: (k, v) => { if (o.blocked) throw new Error('blocked'); log.push('ls.set ' + k); store[k] = String(v); }, removeItem: k => { delete store[k]; } },
    location: { origin: 'https://orbit.test' }, ORBIT_API: 'https://api.test', draws: 0, draw() { w.draws++; },
    document: { addEventListener: (type, fn) => { (listeners[type] = listeners[type] || []).push(fn); } },
    CLOUD: { token: async () => { if (o.tokenErr) throw new Error('t'); return 'TOK'; }, consentSet: async d => { log.push('consent ' + d.version); if (o.consent !== 'ok') throw new Error('c'); w.lastConsent = d; } },
    fetch: async (url, init) => { w.lastFetch = { url, init }; if (o.fetchErr) throw new Error('net'); return { ok: o.fetchRes.ok, json: async () => o.fetchRes.json }; }
  };
  if (o.noConsentFn) delete w.CLOUD.consentSet;
  new Function('window', src)(w);
  return { w, PK: w.PARENT_KEY, store, log, listeners };
}
const tick = () => new Promise(r => setTimeout(r, 0));

(async () => {
  // ---------- key storage: per account, on the device only ----------
  let m = make(); let PK = m.PK;
  t('logged out: no key, no header, save refused', !PK.has() && Object.keys(PK.headers()).length === 0 && (() => { try { PK.save(KEY, true); } catch (e) { return /log in/.test(e.message); } return false; })());
  PK.setUser('u1'); PK.save(KEY, true);
  t('saved in this account\'s own slot on the device', m.store['orbit.pk.u1'] === KEY && PK.has() && PK.headers()['X-User-Key'] === KEY);
  t('page shows only the last 4 characters', PK.mask() === '••••' + KEY.slice(-4) && !PK.mask().includes(KEY.slice(0, 10)));
  PK.setUser('u2');
  t('a second student on the same phone does NOT get the first one\'s key', !PK.has() && Object.keys(PK.headers()).length === 0 && PK.key() === '');
  t('...and the first student\'s key is still stored', m.store['orbit.pk.u1'] === KEY);
  PK.save(KEY2, true); PK.setUser('u1');
  t('each account keeps its own key', PK.current() === KEY && (PK.setUser('u2'), PK.current() === KEY2));
  PK.setUser('');
  t('logout: key hidden, header empty (nothing is sent for a logged-out visitor)', !PK.has() && Object.keys(PK.headers()).length === 0);
  PK.setUser('u1'); PK.disconnect(); t('disconnect removes the key from the device', !('orbit.pk.u1' in m.store) && !PK.has() && 'orbit.pk.u2' in m.store);

  // remember = false
  m = make(); PK = m.PK; PK.setUser('u1'); PK.save('  ' + KEY.slice(0, 20) + '\n' + KEY.slice(20) + ' ', false);
  t('not remembered: key is NEVER written to the device, only kept in memory', !m.log.some(l => /^ls\.set/.test(l)) && PK.current() === KEY && PK.has());
  PK.setUser('u1'); t('same account re-announced (login refresh): memory key survives', PK.current() === KEY);
  PK.setUser('u2'); PK.setUser('u1'); t('switching accounts drops the memory-only key', !PK.has());
  m = make({ blocked: true }); PK = m.PK; PK.setUser('u1'); PK.save(KEY, true);
  t('storage blocked (private mode): key still works for this tab instead of vanishing', PK.has() && PK.current() === KEY);

  // format + legacy slot
  m = make(); PK = m.PK; PK.setUser('u1');
  t('bad format refused with a clear message', ['', 'abc', 'AIza' + 'x'.repeat(10), 'AIza' + '!'.repeat(30), KEY + '$$'].every(k => { try { PK.save(k, true); return false; } catch (e) { return /key sahi nahi/.test(e.message); } }));
  t('newer Google key shape (AQ.…) is accepted', (() => { try { PK.save('AQ.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', true); return true; } catch (e) { return false; } })());
  m = make(); m.store['orbit.userKey'] = KEY; m.store['orbit.userKey.on'] = '1'; PK = m.PK; PK.setUser('u1');
  t('old shared slot (first version) is removed and never used by any account', !('orbit.userKey' in m.store) && !('orbit.userKey.on' in m.store) && !PK.has() && (PK.setUser('u2'), !PK.has()));

  // ---------- Test key (server check) ----------
  m = make(); PK = m.PK; PK.setUser('u1');
  let r = await PK.test(KEY);
  t('test: calls the server route with the login token and the key in X-User-Key (never in the URL or body)', r.ok && m.w.lastFetch.url === 'https://api.test/api/byok/test' && m.w.lastFetch.init.headers.Authorization === 'Bearer TOK' && m.w.lastFetch.init.headers['X-User-Key'] === KEY && !m.w.lastFetch.url.includes(KEY) && m.w.lastFetch.init.body === '{}');
  t('test: bad format never reaches the network', (m.w.lastFetch = null, (await PK.test('nope')).ok === false && m.w.lastFetch === null));
  for (const [code, key] of [['invalid', 'invalid'], ['quota', 'quota'], ['busy', 'busy'], ['weird', 'busy']]) {
    m = make({ fetchRes: { ok: false, json: { code } } }); m.PK.setUser('u1'); r = await m.PK.test(KEY);
    t('test: server code "' + code + '" -> friendly message', !r.ok && r.msg === m.PK.ERR[key]);
  }
  m = make({ fetchErr: true }); m.PK.setUser('u1'); t('test: network error -> "internet nahi hai"', (await m.PK.test(KEY)).msg === m.PK.ERR.net);
  m = make({ tokenErr: true }); m.PK.setUser('u1'); t('test: login token problem does not crash', (await m.PK.test(KEY)).ok === false);

  // ---------- consent + connect flow ----------
  m = make(); PK = m.PK; PK.setUser('u1'); await PK.saveConsent();
  t('consent: saved with version and the exact text the parent saw', m.w.lastConsent.version === 2 && m.w.lastConsent.text === PK.CONSENT_TEXT && PK.CONSENT_TEXT.length > 100);
  m = make({ noConsentFn: true }); m.PK.setUser('u1'); t('consent: missing cloud function is an error (never silently skipped)', await m.PK.saveConsent().then(() => false, () => true));

  const connectWith = async (over, mut) => { const k = make(over); k.PK.setUser('u1'); Object.assign(k.PK.st, { key: KEY, consent: true, remember: true }, mut || {}); k.w.draws = 0; k.PK.act('go'); for (let i = 0; i < 6; i++) await tick(); return k; };
  let c = await connectWith();
  t('connect: key saved, parent consent recorded BEFORE the key was written', c.store['orbit.pk.u1'] === KEY && c.log.indexOf('consent 2') >= 0 && c.log.indexOf('consent 2') < c.log.indexOf('ls.set orbit.pk.u1'));
  t('connect: typed key is wiped from the page state, success message shown', c.PK.st.key === '' && /connect ho gaya/.test(c.PK.st.msg) && !c.PK.st.err && !c.PK.st.busy && c.w.draws > 0);
  c = await connectWith({}, { consent: false }); t('connect: refused without the parent tick (nothing sent, nothing saved)', c.w.lastFetch === undefined && !c.PK.has() && c.PK.st.err);
  c = await connectWith({ consent: 'fail' }); t('connect: if the consent cannot be saved, the key is NOT saved', !c.PK.has() && c.PK.st.err && c.PK.st.msg === c.PK.ERR.consent);
  c = await connectWith({ fetchRes: { ok: false, json: { code: 'invalid' } } }); t('connect: key Google rejects is not saved and consent is not recorded', !c.PK.has() && !c.log.includes('consent 2') && c.PK.st.msg === c.PK.ERR.invalid);
  c = await connectWith({}, { key: 'short' }); t('connect: wrong shape stops before any network call', c.w.lastFetch === undefined && c.PK.st.msg === c.PK.ERR.bad_format);
  c = await connectWith({}, { remember: false }); t('connect with "remember" off keeps the key out of storage', c.PK.has() && !c.log.some(l => /^ls\.set/.test(l)));
  c = await connectWith({ fetchRes: { ok: false, json: { code: 'quota' } } }); c.PK.st.key = KEY; c.w.lastFetch = undefined; c.PK.act('test'); for (let i = 0; i < 5; i++) await tick();
  t('"Test key" button works with a typed key and shows the server verdict', c.PK.st.msg === c.PK.ERR.quota && c.PK.st.err && !c.PK.has());

  // ---------- the page ----------
  m = make({}); PK = m.PK; let v = PK.viewHTML();
  t('guest page (parent with the WhatsApp link, not logged in): steps + login button, no key box, no WhatsApp button', /data-act="login"/.test(v) && /aistudio\.google\.com\/apikey/.test(v) && !/id="pkKey"/.test(v) && !/wa\.me/.test(v) && /Advanced AI Features/.test(v));
  PK.setUser('u1'); v = PK.viewHTML();
  t('logged in, no key: password box, consent text, Test + Connect, WhatsApp share with the parent-setup link', /id="pkKey"[^>]*type="password"|type="password"[^>]*id="pkKey"/.test(v) && v.includes(PK.CONSENT_TEXT.slice(0, 40)) && /data-pk="test"/.test(v) && /data-pk="go"[^>]*disabled/.test(v) && /wa\.me\/\?text=[^"]*parent-setup%3D1/.test(v));
  PK.st.consent = true; t('Connect button is enabled only after the parent tick', !/data-pk="go"[^>]*disabled/.test(PK.viewHTML()));
  PK.st.show = true; t('"Dikhao" switches the box to plain text', /type="text"/.test(PK.viewHTML()));
  PK.st.key = '"><img src=x onerror=alert(1)>'; v = PK.viewHTML(); t('typed key is HTML-escaped in the page', !/<img src=x/.test(v) && /&quot;&gt;&lt;img/.test(v)); PK.st.key = '';
  PK.save(KEY, true); v = PK.viewHTML();
  t('connected page: "Gemini connected ✓", last 4 only, full key never in the HTML, no key box', /Gemini connected ✓/.test(v) && v.includes('••••' + KEY.slice(-4)) && !v.includes(KEY) && !v.includes(KEY.slice(0, 20)) && !/id="pkKey"/.test(v));
  t('connected page: Test key / Key badlein / Key hatayein', /data-pk="test"/.test(v) && /data-pk="edit"/.test(v) && /data-pk="off"/.test(v));
  PK.act('edit'); t('"Key badlein" opens the form again and asks for the parent tick again', /id="pkKey"/.test(PK.viewHTML()) && PK.st.consent === false);
  PK.act('cancel'); t('cancel returns to the connected page with the old key', /Gemini connected ✓/.test(PK.viewHTML()) && PK.has());
  PK.act('off'); t('"Key hatayein" removes it and says so', !PK.has() && /hata di gayi/.test(PK.st.msg) && m.store['orbit.pk.u1'] === undefined);
  PK.setUser('u2'); m.w.ORBIT_AI_VIDEOS = { hi: 'https://cdn.test/a.mp4', as: 'https://youtu.be/dQw4w9WgXcQ', bn: 'javascript:alert(1)' };
  PK.act('lang', { dataset: { v: 'hi' } }); t('video: mp4/webm link plays in a <video>', /<video[^>]*src="https:\/\/cdn\.test\/a\.mp4"/.test(PK.viewHTML()));
  PK.act('lang', { dataset: { v: 'as' } }); t('video: YouTube link uses the no-cookie embed', /youtube-nocookie\.com\/embed\/dQw4w9WgXcQ/.test(PK.viewHTML()));
  PK.act('lang', { dataset: { v: 'bn' } }); v = PK.viewHTML(); t('video: a javascript: link is never used; placeholder shown', !/javascript:/.test(v) && /jaldi aa raha hai/.test(v));
  m.w.ORBIT_AI_VIDEOS = {}; t('video: nothing configured -> placeholder', /jaldi aa raha hai/.test(PK.viewHTML()));
  PK.act('lang', { dataset: { v: 'as' } }); t('language chips mark the selected language', /data-v="as" aria-pressed="true"/.test(PK.viewHTML()) && /data-v="hi" aria-pressed="false"/.test(PK.viewHTML()));

  // ---------- wiring in index.html / service worker / config ----------
  t('sidebar has "Advanced AI Features" opening view ai', /item\('ai','ai','Advanced AI Features'\)/.test(html) && /VIEW==='ai'\)body=window\.PARENT_KEY\?PARENT_KEY\.viewHTML\(\)/.test(html));
  t('login / logout tells the module who is logged in, before anything else in onCloudUser', /window\.onCloudUser=u=>\{USER=u;AUTH_READY=true;if\(window\.PARENT_KEY\)window\.PARENT_KEY\.setUser\(u\?u\.uid:''\)/.test(html));
  t('WhatsApp link (?parent-setup=1) opens the page, and shows the guide even before login', /const PARENT_LINK=/.test(html) && /if\(PARENT_LINK\)VIEW='ai'/.test(html) && /!USER\)\{openSide\(false,true\);\$\('#app'\)\.innerHTML=PARENT_LINK&&window\.PARENT_KEY\?/.test(html));
  t('AI calls still send the key header from the module', /\.\.\.\(window\.PARENT_KEY\?PARENT_KEY\.headers\(\):\{\}\)/.test(html));
  t('parent-key.js is still loaded by the app', /<script src="\/parent-key\.js"><\/script>/.test(html));
  t('old white full-screen overlay is gone (the page follows the app theme)', !/pk-page/.test(src) && !/#fff/.test(src) && !/auto-open|addEventListener\('load'/.test(src));
  t('page only uses the app\'s theme classes / variables', /class="card"/.test(src) && /var\(--ln\)/.test(src) && /class="btn"/.test(src));
  t('service worker cache version was bumped (new page must not come from the old cache)', (v => v >= 25)(+(/orbit-shell-v(\d+)/.exec(fs.readFileSync(path.join(ROOT, 'public/sw.js'), 'utf8')) || [])[1]));
  t('config.js has the (empty) tutorial video slots for hi / as / bn', /window\.ORBIT_AI_VIDEOS = \{ hi: "", as: "", bn: "" \}/.test(fs.readFileSync(path.join(ROOT, 'public/config.js'), 'utf8')));
  t('Firestore rules already cover the consent path (no rule change needed)', /match \/users\/\{uid\}\/\{document=\*\*\}/.test(fs.readFileSync(path.join(ROOT, 'firestore.rules'), 'utf8')));

  // ---------- clicking and typing in a real DOM (jsdom) ----------
  let JSDOM = null; try { ({ JSDOM } = require('jsdom')); } catch (e) { /* optional */ }
  if (!JSDOM) console.log('SKIP  jsdom not installed (npm i -D jsdom) - click/typing tests not run');
  else {
    const dom = new JSDOM('<!doctype html><body><div id="app"></div></body>', { runScripts: 'outside-only', url: 'https://orbit.test/' }), w = dom.window;
    w.draw = () => { w.document.getElementById('app').innerHTML = w.PARENT_KEY.viewHTML(); };
    w.CLOUD = { token: async () => 'TOK', consentSet: async () => {} }; w.fetch = async () => ({ ok: true, json: async () => ({}) });
    w.eval(src); const P = w.PARENT_KEY, app = w.document.getElementById('app'), q = s => app.querySelector(s);
    P.setUser('u1'); w.draw();
    const typeKey = v => { const i = q('#pkKey'); i.value = v; i.dispatchEvent(new w.Event('input', { bubbles: true })); };
    typeKey(KEY); t('typing in the key box updates the state without redrawing', P.st.key === KEY && q('#pkKey').value === KEY);
    q('[data-pk=show]').click(); t('clicking "Dikhao" redraws and keeps the typed key', q('#pkKey').type === 'text' && q('#pkKey').value === KEY);
    t('Connect is disabled until the consent box is ticked', q('[data-pk=go]').disabled === true);
    q('[data-pk=cons]').click(); t('ticking consent enables Connect', q('[data-pk=go]').disabled === false && P.st.consent === true);
    q('[data-pk=rem]').click(); t('"remember" box changes state without wiping the typed key', P.st.remember === false && P.st.key === KEY);
    q('[data-pk=go]').click(); for (let i = 0; i < 8; i++) await tick();
    t('Connect click in the DOM connects, and the page shows "Gemini connected"', P.has() && /Gemini connected/.test(app.textContent) && !q('#pkKey') && !app.innerHTML.includes(KEY));
    q('[data-pk=off]').click(); t('Key hatayein click disconnects', !P.has() && !!q('#pkKey'));
    q('[data-pk=lang][data-v=bn]').click(); t('video language chip click switches language', P.st.lang === 'bn');
  }

  console.log(pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})();
