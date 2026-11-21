// Razorpay payment: signature check, order + verify routes (with fakes, no network), and the wiring in the app files.
// Run: node tests/pay.test.js
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
const P = require(path.join(ROOT, 'pay-core.js')), R = require(path.join(ROOT, 'pay-routes.js'));
let pass = 0, fail = 0;
const t = (name, ok, extra) => { if (ok) pass++; else { fail++; console.log('FAIL  ' + name + (extra ? '  ' + extra : '')); } };

const ENV = { RAZORPAY_KEY_ID: 'rzp_test_abc123', RAZORPAY_KEY_SECRET: 'secret_xyz', PAY_AMOUNT_RUPEES: '49', PAY_DAYS: '30' };
const OID = 'order_ABCdef123456', PID = 'pay_ABCdef123456';

// ---------- core ----------
let c = P.readConfig(ENV);
t('config: keys, amount in paise, days, test mode', c.enabled && c.amountPaise === 4900 && c.days === 30 && c.test === true);
c = P.readConfig({});
t('config: no keys = disabled; default Rs 99 for 365 days', !c.enabled && c.amountPaise === 9900 && c.days === 365);
t('config: silly amount or days fall back to the defaults', P.readConfig({ PAY_AMOUNT_RUPEES: '-5', PAY_DAYS: '0' }).amountPaise === 9900 && P.readConfig({ PAY_DAYS: 'abc' }).days === 365);
const sig = P.signatureOf(OID, PID, 'secret_xyz');
t('signature is 64 hex characters', /^[0-9a-f]{64}$/.test(sig));
t('right signature passes', P.signatureOk(OID, PID, sig, 'secret_xyz'));
t('wrong secret, other payment id, other order id, short or empty signature all fail',
  !P.signatureOk(OID, PID, sig, 'other') && !P.signatureOk(OID, 'pay_ZZZZZZ123456', sig, 'secret_xyz') && !P.signatureOk('order_ZZZZZZ123456', PID, sig, 'secret_xyz') && !P.signatureOk(OID, PID, sig.slice(2), 'secret_xyz') && !P.signatureOk(OID, PID, '', 'secret_xyz'));
t('odd input never crashes', !P.signatureOk(undefined, null, {}, 'x') && !P.signatureOk(OID, PID, sig, ''));
t('days are added after the current end date', P.nextUntil(2000000000000, 1000, 10) === 2000000000000 + 864000000);
t('an expired or empty subscription starts from now', P.nextUntil(0, 5000, 1) === 5000 + 86400000 && P.nextUntil(100, 5000, 1) === 5000 + 86400000);
t('receipt is at most 40 characters', P.receiptOf('a'.repeat(80), Date.now()).length <= 40 && /^o_/.test(P.receiptOf('u1', 1)));

// ---------- routes ----------
function fakeDb(seed) {
  const store = new Map(Object.entries(seed || {}));
  return { store, collection: c => ({ doc: id => ({ path: c + '/' + id }) }),
    runTransaction: async fn => fn({ get: async ref => ({ exists: store.has(ref.path), data: () => store.get(ref.path) }),
      set: (ref, data, opt) => { store.set(ref.path, opt && opt.merge ? Object.assign({}, store.get(ref.path) || {}, data) : data); } }) };
}
const TS = { fromMillis: ms => ({ toMillis: () => ms }) };
function fakeFetch(orders) {
  const f = async (url, opt) => {
    f.calls.push({ url, opt });
    const m = /\/orders\/(.+)$/.exec(url);
    if (m) return orders[m[1]] ? { ok: true, status: 200, json: async () => orders[m[1]] } : { ok: false, status: 400, json: async () => ({}) };
    const b = JSON.parse(opt.body); orders[OID] = { id: OID, amount: b.amount, currency: b.currency, status: 'created', notes: b.notes };
    return { ok: true, status: 200, json: async () => orders[OID] };
  };
  f.calls = []; return f;
}
const mk = (db, orders, env) => { const f = fakeFetch(orders); return { f, h: R.make({ db, Timestamp: TS, env: env || ENV, fetchFn: f, now: () => 1700000000000 }) }; };
const body = (s) => ({ razorpay_order_id: OID, razorpay_payment_id: PID, razorpay_signature: s || sig });

(async () => {
  let orders = {}, db = fakeDb(), x = mk(db, orders);
  let r = await x.h.order({ uid: 'u1' });
  const sent = JSON.parse(x.f.calls[0].opt.body);
  t('order: Razorpay gets the server amount (Rs 49 = 4900 paise), INR and the student in notes', r.status === 200 && sent.amount === 4900 && sent.currency === 'INR' && sent.notes.uid === 'u1' && sent.notes.days === '30');
  t('order: the student cannot choose the amount', (await x.h.order({ uid: 'u1', body: { amount: 1 } })).status === 200 && JSON.parse(x.f.calls[x.f.calls.length - 1].opt.body).amount === 4900);
  t('order: answer carries the public Key ID, never the secret', r.body.keyId === 'rzp_test_abc123' && !JSON.stringify(r.body).includes('secret_xyz'));
  t('order: Basic auth header is used toward Razorpay', /^Basic /.test(x.f.calls[0].opt.headers.Authorization));
  t('order: no keys = payment off (503)', (await mk(db, {}, {}).h.order({ uid: 'u1' })).status === 503);
  t('order: no Firestore = payment off (503)', (await mk(null, {}).h.order({ uid: 'u1' })).status === 503);
  t('order: no login = 401', (await x.h.order({})).status === 401);

  orders[OID].status = 'paid';
  r = await x.h.verify({ uid: 'u1', body: body() });
  t('verify: good payment unlocks 30 days from now', r.status === 200 && r.body.ok && r.body.until === 1700000000000 + 30 * 86400000);
  t('verify: subscriptions/<uid>.until is written', db.store.get('subscriptions/u1').until.toMillis() === 1700000000000 + 30 * 86400000);
  t('verify: the payment is recorded once, by payment id', db.store.get('payments/' + PID).uid === 'u1' && db.store.get('payments/' + PID).amount === 4900);
  r = await x.h.verify({ uid: 'u1', body: body() });
  t('verify: sending the same payment again does NOT add days again', r.status === 200 && db.store.get('subscriptions/u1').until.toMillis() === 1700000000000 + 30 * 86400000);

  db = fakeDb({ 'subscriptions/u1': { until: TS.fromMillis(1700000000000 + 10 * 86400000), note: 'kept' } }); orders = { [OID]: { id: OID, amount: 4900, status: 'paid', notes: { uid: 'u1', plan: 'videos', days: '30' } } };
  x = mk(db, orders);
  await x.h.verify({ uid: 'u1', body: body() });
  t('verify: days are added on top of time the student still has, other fields stay', db.store.get('subscriptions/u1').until.toMillis() === 1700000000000 + 40 * 86400000 && db.store.get('subscriptions/u1').note === 'kept');

  db = fakeDb(); x = mk(db, { [OID]: { id: OID, amount: 4900, status: 'paid', notes: { uid: 'u1', plan: 'videos', days: '30' } } });
  r = await x.h.verify({ uid: 'u1', body: body('a'.repeat(64)) });
  t('verify: forged signature is refused and nothing is written', r.status === 400 && r.body.code === 'bad_signature' && db.store.size === 0);
  r = await x.h.verify({ uid: 'u2', body: body() });
  t('verify: another student cannot use this payment', r.status === 403 && r.body.code === 'not_yours' && db.store.size === 0);
  r = await x.h.verify({ uid: 'u1', body: { razorpay_order_id: 'x', razorpay_payment_id: 'y', razorpay_signature: 'z' } });
  t('verify: junk fields = 400', r.status === 400 && r.body.code === 'bad_request');
  x = mk(db, { [OID]: { id: OID, amount: 4900, status: 'created', notes: { uid: 'u1', plan: 'videos', days: '30' } } });
  r = await x.h.verify({ uid: 'u1', body: body() });
  t('verify: an order that is not paid yet unlocks nothing', r.status === 409 && db.store.size === 0);
  x = mk(db, { [OID]: { id: OID, amount: 4900, status: 'paid', notes: { uid: 'u1', plan: 'videos', days: '99999' } } });
  t('verify: silly days in the order are refused', (await x.h.verify({ uid: 'u1', body: body() })).status === 400 && db.store.size === 0);
  x = mk(db, {});
  t('verify: Razorpay does not know the order = 502, nothing written', (await x.h.verify({ uid: 'u1', body: body() })).status === 502 && db.store.size === 0);

  // ---------- wiring in the app ----------
  const server = read('server.js'), html = read('public/index.html'), rules = read('firestore.rules'), fj = read('firebase.json');
  t('server: both pay routes sit behind the login check (registered after it) and use the rate limit', server.indexOf("app.post('/api/pay/order'") > server.indexOf("app.use('/api', async (req, res, next) => {") && /PAYLIM\.hit\(rateKey\(req\)\)/.test(server));
  t('server: paid-video 403 carries the code the app reacts to', /code: 'subscription_required'/.test(server));
  t('server: the Key Secret is read only from env', /RAZORPAY_KEY_SECRET/.test(read('pay-core.js')) && !/rzp_(test|live)_/.test(server + read('pay-routes.js') + read('public/pay.js')));
  t('app: pay.js is loaded and the unlock button is wired', /<script src="\/pay\.js"><\/script>/.test(html) && /data-act="payunlock"/.test(html) && /act==='payunlock'/.test(html));
  t('app: the unlock text never says Premium', !/premium/i.test(read('public/pay.js')) && !/payBtnHTML=\(\)=>'[^']*premium/i.test(html));
  t('client: no secret and no hard-coded key in the browser file', !/RAZORPAY_KEY_SECRET|key_secret/i.test(read('public/pay.js')));
  t('firestore rules: students still cannot write subscriptions, and there is no rule that opens payments', /match \/subscriptions\/\{uid\}[\s\S]{0,200}allow write: if false/.test(rules) && !/match \/payments\//.test(rules));
  t('CSP allows the Razorpay script, API and frame', /script-src[^;]*checkout\.razorpay\.com/.test(fj) && /connect-src[^;]*api\.razorpay\.com/.test(fj) && /frame-src[^;]*api\.razorpay\.com/.test(fj));
  t('microphone stays allowed for the app itself', /microphone=\(self\)/.test(fj));

  // ---------- pay.js in a fake browser ----------
  const store = {}, events = [], calls = [], toastNodes = {};
  const doc = { getElementById: id => toastNodes[id] || null, createElement: tag => ({ tag, style: {}, setAttribute() {}, set textContent(v) { this._t = v; }, get textContent() { return this._t; } }),
    body: { appendChild: n => { toastNodes[n.id] = n; } }, head: { appendChild: n => { setTimeout(() => { global.__win.Razorpay = function (o) { this.o = o; global.__rz = this; this.on = () => {}; this.open = () => setTimeout(() => o.handler({ razorpay_order_id: OID, razorpay_payment_id: PID, razorpay_signature: sig }), 0); }; n.onload(); }, 0); } } };
  const win = { document: doc, localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } },
    CLOUD: { token: async () => 'tok' }, ORBIT_API: 'https://x.test', dispatchEvent: e => { events.push(e.type); }, orbitUser: () => ({ displayName: 'Asha', email: 'a@b.c' }),
    fetch: async (url, opt) => { calls.push(url); if (/pay\/order/.test(url)) return { ok: true, json: async () => ({ orderId: OID, amount: 4900, currency: 'INR', keyId: 'rzp_test_k', days: 30 }) }; if (/pay\/verify/.test(url)) return { ok: true, json: async () => ({ ok: true, until: 1 }) }; return { ok: true, json: async () => ({}) }; },
    setTimeout, clearTimeout, AbortSignal, CustomEvent: function (type, o) { this.type = type; this.detail = o && o.detail; }, JSON, Promise };
  win.window = win; global.__win = win;
  vm.runInNewContext(read('public/pay.js'), Object.assign(win, { document: doc }), { filename: 'pay.js' });
  t('pay.js exposes OrbitPay.start', win.OrbitPay && typeof win.OrbitPay.start === 'function');
  const ok = await win.OrbitPay.start();
  t('pay.js: order -> Razorpay window -> verify -> orbit-paid event', ok === true && /pay\/order/.test(calls.join()) && /pay\/verify/.test(calls.join()) && events.includes('orbit-paid'));
  t('pay.js: Razorpay gets the order id and the student name, with no secret', global.__rz && global.__rz.o.order_id === OID && global.__rz.o.prefill.name === 'Asha' && global.__rz.o.key === 'rzp_test_k');
  t('pay.js: the pending payment note is removed after the server says yes', !('orbit_pay_pending' in store));
  console.log(pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.log('FAIL  crashed: ' + e.stack); console.log(pass + ' passed, ' + (fail + 1) + ' failed'); process.exit(1); });
