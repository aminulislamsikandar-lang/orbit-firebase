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

  // ---------- webhook: Razorpay itself tells the server (a payment the browser never confirmed, and refunds) ----------
  const crypto = require('crypto'), WH = 'whsec_test_123', ENVW = Object.assign({}, ENV, { RAZORPAY_WEBHOOK_SECRET: WH }), NOW = 1700000000000, DAY = 86400000;
  const signRaw = (raw, secret) => crypto.createHmac('sha256', secret || WH).update(raw).digest('hex');
  const mkHook = (ev, secret) => { const raw = Buffer.from(typeof ev === 'string' ? ev : JSON.stringify(ev), 'utf8'); return { raw, signature: signRaw(raw, secret) }; };
  const paidOrder = (uid, extra) => Object.assign({ id: OID, amount: 4900, status: 'paid', notes: { uid, plan: 'videos', days: '30' } }, extra || {});
  const evPaid = (o) => ({ event: 'order.paid', payload: { payment: { entity: Object.assign({ id: PID, order_id: OID, status: 'captured', amount: 4900 }, o || {}) }, order: { entity: { id: OID } } } });
  const evCaptured = { event: 'payment.captured', payload: { payment: { entity: { id: PID, order_id: OID, status: 'captured', amount: 4900 } } } };
  const RID = 'rfnd_ABCdef123456', RID2 = 'rfnd_ZZZdef123456';
  const evRefund = (amount, id) => ({ event: 'refund.processed', payload: { refund: { entity: { id: id || RID, payment_id: PID, amount, status: 'processed' } } } });
  const mkW = (db, orders) => mk(db, orders, ENVW);

  // core
  const rawA = Buffer.from('{"event":"order.paid"}'), sA = signRaw(rawA);
  t('webhook signature: right body and secret pass (Buffer or string)', P.webhookSigOk(rawA, sA, WH) && P.webhookSigOk('{"event":"order.paid"}', sA, WH));
  t('webhook signature: one changed byte, another secret, no secret, short or odd signature all fail',
    !P.webhookSigOk(Buffer.from('{"event":"order.paiD"}'), sA, WH) && !P.webhookSigOk(rawA, sA, 'other') && !P.webhookSigOk(rawA, sA, '') && !P.webhookSigOk(rawA, sA.slice(2), WH) && !P.webhookSigOk(rawA, 'z'.repeat(64), WH) && !P.webhookSigOk({}, sA, WH) && !P.webhookSigOk(undefined, undefined, WH));
  t('webhook secret is its own env value, not the Key Secret', P.readConfig(ENVW).webhookSecret === WH && P.readConfig(ENV).webhookSecret === '' && P.readConfig(ENVW).keySecret === 'secret_xyz');
  t('refund maths: takes the days back, never below now, an ended subscription is left alone',
    P.afterRefund(NOW + 60 * DAY, NOW, 30) === NOW + 30 * DAY && P.afterRefund(NOW + 10 * DAY, NOW, 30) === NOW && P.afterRefund(NOW - DAY, NOW, 30) === NOW - DAY && P.afterRefund(0, NOW, 30) === 0 && P.afterRefund('x', NOW, 30) === 0);

  // off, bad signature, bad body
  let wdb = fakeDb(), wx = mkW(wdb, { [OID]: paidOrder('u1') });
  t('webhook: no webhook secret = off (503), nothing written', (await mk(wdb, { [OID]: paidOrder('u1') }, ENV).h.webhook(mkHook(evPaid()))).status === 503 && wdb.store.size === 0);
  t('webhook: no keys = off (503)', (await mk(wdb, {}, {}).h.webhook(mkHook(evPaid()))).status === 503 && (await mk(null, {}, ENVW).h.webhook(mkHook(evPaid()))).status === 503);
  let h = mkHook(evPaid()), r2 = await wx.h.webhook({ raw: h.raw, signature: 'a'.repeat(64) });
  t('webhook: forged signature = 400, nothing written, Razorpay is not even asked', r2.status === 400 && r2.body.code === 'bad_signature' && wdb.store.size === 0 && wx.f.calls.length === 0);
  r2 = await wx.h.webhook({ raw: h.raw, signature: signRaw(h.raw, 'attackers_secret') });
  t('webhook: signed with the wrong secret = 400', r2.status === 400 && wdb.store.size === 0);
  r2 = await wx.h.webhook({ raw: Buffer.from(h.raw.toString().replace('captured', 'captureD')), signature: h.signature });
  t('webhook: body changed after signing = 400', r2.status === 400 && wdb.store.size === 0);
  r2 = await wx.h.webhook({ raw: {}, signature: h.signature });
  t('webhook: an empty or parsed (not raw) body = 400', r2.status === 400 && (await wx.h.webhook({ raw: undefined, signature: '' })).status === 400);
  const junk = mkHook('not json at all');
  t('webhook: signed but not JSON = 400', (await wx.h.webhook(junk)).status === 400 && wdb.store.size === 0);

  // paid, but the browser never confirmed
  r2 = await wx.h.webhook(mkHook(evPaid()));
  t('webhook order.paid: unlocks the student named in the ORDER, 30 days from now', r2.status === 200 && r2.body.ok && wdb.store.get('subscriptions/u1').until.toMillis() === NOW + 30 * DAY && wdb.store.get('payments/' + PID).uid === 'u1' && wdb.store.get('payments/' + PID).amount === 4900);
  t('webhook: the order was read from Razorpay with the server keys', wx.f.calls.length === 1 && /orders\/order_ABCdef123456$/.test(wx.f.calls[0].url) && /^Basic /.test(wx.f.calls[0].opt.headers.Authorization));
  r2 = await wx.h.webhook(mkHook(evPaid()));
  t('webhook: the same event again (Razorpay retries) adds nothing', r2.status === 200 && r2.body.already === true && wdb.store.get('subscriptions/u1').until.toMillis() === NOW + 30 * DAY);
  r2 = await wx.h.verify({ uid: 'u1', body: body() });
  t('webhook then browser: the browser confirming the same payment adds nothing', r2.status === 200 && wdb.store.get('subscriptions/u1').until.toMillis() === NOW + 30 * DAY);

  wdb = fakeDb(); wx = mkW(wdb, { [OID]: paidOrder('u1') });
  await wx.h.verify({ uid: 'u1', body: body() });
  r2 = await wx.h.webhook(mkHook(evPaid()));
  t('browser then webhook: the webhook adds nothing either', r2.status === 200 && r2.body.already === true && wdb.store.get('subscriptions/u1').until.toMillis() === NOW + 30 * DAY);

  wdb = fakeDb(); wx = mkW(wdb, { [OID]: paidOrder('u1') });
  r2 = await wx.h.webhook(mkHook(evCaptured));
  t('webhook payment.captured alone (no order in the event) also unlocks', r2.status === 200 && wdb.store.get('subscriptions/u1').until.toMillis() === NOW + 30 * DAY);

  wdb = fakeDb(); wx = mkW(wdb, { [OID]: paidOrder('u1') });
  r2 = await wx.h.webhook(mkHook(evPaid({ notes: { uid: 'evil' } })));
  t('webhook: the student comes from Razorpay\'s order, never from the event body', wdb.store.has('subscriptions/u1') && !wdb.store.has('subscriptions/evil') && wdb.store.get('payments/' + PID).uid === 'u1');

  wdb = fakeDb({ 'subscriptions/u1': { until: TS.fromMillis(NOW + 10 * DAY) } }); wx = mkW(wdb, { [OID]: paidOrder('u1') });
  await wx.h.webhook(mkHook(evPaid()));
  t('webhook: days are added on top of the time the student still has', wdb.store.get('subscriptions/u1').until.toMillis() === NOW + 40 * DAY);

  // things that must NOT unlock
  wdb = fakeDb(); wx = mkW(wdb, { [OID]: paidOrder('u1', { status: 'created' }) });
  r2 = await wx.h.webhook(mkHook(evPaid()));
  t('webhook: order not paid (yet) = 409 so Razorpay tries again, nothing written', r2.status === 409 && wdb.store.size === 0);
  wx = mkW(wdb, {});
  t('webhook: Razorpay cannot find the order = 502 (retry), nothing written', (await wx.h.webhook(mkHook(evPaid()))).status === 502 && wdb.store.size === 0);
  wx = mkW(wdb, { [OID]: paidOrder('u1', { notes: { uid: 'u1', plan: 'something_else', days: '30' } }) });
  r2 = await wx.h.webhook(mkHook(evPaid()));
  t('webhook: an order that is not ours (other plan) is ignored with 200, nothing written', r2.status === 200 && r2.body.ignored === 'not_ours' && wdb.store.size === 0);
  wx = mkW(wdb, { [OID]: paidOrder('u1', { notes: { plan: 'videos', days: '30' } }) });
  t('webhook: an order with no student is ignored', (await wx.h.webhook(mkHook(evPaid()))).status === 200 && wdb.store.size === 0);
  wx = mkW(wdb, { [OID]: paidOrder('u1', { notes: { uid: 'u1', plan: 'videos', days: '99999' } }) });
  t('webhook: silly days are ignored, nothing written', (await wx.h.webhook(mkHook(evPaid()))).status === 200 && wdb.store.size === 0);
  wx = mkW(wdb, { [OID]: paidOrder('u1') });
  t('webhook: a payment that is not captured is ignored, Razorpay is not asked', (await wx.h.webhook(mkHook(evPaid({ status: 'failed' })))).status === 200 && wx.f.calls.length === 0 && wdb.store.size === 0);
  t('webhook: junk ids are ignored', (await wx.h.webhook(mkHook(evPaid({ id: 'x', order_id: 'y' })))).status === 200 && wdb.store.size === 0);
  t('webhook: other events are answered 200 and ignored', (await wx.h.webhook(mkHook({ event: 'payment.failed', payload: {} }))).status === 200 && (await wx.h.webhook(mkHook({ event: 'order.paid' }))).status === 200 && (await wx.h.webhook(mkHook({}))).status === 200 && wdb.store.size === 0);

  // refunds
  const bought = () => { const d = fakeDb({ ['payments/' + PID]: { uid: 'u1', orderId: OID, amount: 4900, days: 30, at: TS.fromMillis(NOW - DAY) }, 'subscriptions/u1': { until: TS.fromMillis(NOW + 30 * DAY), keep: 'me' } }); return d; };
  wdb = bought(); wx = mkW(wdb, {});
  r2 = await wx.h.webhook(mkHook(evRefund(4900)));
  t('refund: a full refund takes back that payment\'s 30 days (the subscription ends now)', r2.status === 200 && r2.body.ok && wdb.store.get('subscriptions/u1').until.toMillis() === NOW && wdb.store.get('subscriptions/u1').keep === 'me' && wdb.store.get('payments/' + PID).revoked === true);
  t('refund: the refund and the amount are written on the payment', wdb.store.get('payments/' + PID).refunded === 4900 && wdb.store.get('payments/' + PID).refundIds.includes(RID) && wdb.store.get('payments/' + PID).uid === 'u1');
  wdb.store.set('subscriptions/u1', { until: TS.fromMillis(NOW + 90 * DAY) });
  await wx.h.webhook(mkHook(evRefund(4900)));
  t('refund: the same event again takes nothing more', wdb.store.get('subscriptions/u1').until.toMillis() === NOW + 90 * DAY);
  await wx.h.webhook(mkHook(evRefund(4900, RID2)));
  t('refund: days of one payment are taken back only once', wdb.store.get('subscriptions/u1').until.toMillis() === NOW + 90 * DAY);

  wdb = fakeDb({ ['payments/' + PID]: { uid: 'u1', orderId: OID, amount: 4900, days: 30, at: TS.fromMillis(NOW - 40 * DAY) }, 'subscriptions/u1': { until: TS.fromMillis(NOW + 60 * DAY) } }); wx = mkW(wdb, {});
  await wx.h.webhook(mkHook(evRefund(4900)));
  t('refund: time bought with another payment stays', wdb.store.get('subscriptions/u1').until.toMillis() === NOW + 30 * DAY);

  wdb = bought(); wx = mkW(wdb, {});
  r2 = await wx.h.webhook(mkHook(evRefund(1000)));
  t('refund: a partial refund is only written down, the days stay', r2.status === 200 && wdb.store.get('subscriptions/u1').until.toMillis() === NOW + 30 * DAY && wdb.store.get('payments/' + PID).refunded === 1000 && !wdb.store.get('payments/' + PID).revoked);
  await wx.h.webhook(mkHook(evRefund(3900, RID2)));
  t('refund: partial refunds that add up to the full amount take the days back', wdb.store.get('payments/' + PID).revoked === true && wdb.store.get('subscriptions/u1').until.toMillis() === NOW);

  wdb = fakeDb({ ['payments/' + PID]: { uid: 'u1', amount: 4900, days: 30 }, 'subscriptions/u1': { until: TS.fromMillis(NOW - 5 * DAY) } }); wx = mkW(wdb, {});
  await wx.h.webhook(mkHook(evRefund(4900)));
  t('refund: a subscription that already ended is left as it was', wdb.store.get('subscriptions/u1').until.toMillis() === NOW - 5 * DAY);

  wdb = fakeDb(); wx = mkW(wdb, {});
  r2 = await wx.h.webhook(mkHook(evRefund(4900)));
  t('refund: for a payment we never recorded = 200 and nothing written', r2.status === 200 && r2.body.skipped === 'unknown_payment' && wdb.store.size === 0);
  wdb = bought(); wx = mkW(wdb, {});
  t('refund: junk ids or amount are ignored', (await wx.h.webhook(mkHook(evRefund(0)))).status === 200 && (await wx.h.webhook(mkHook({ event: 'refund.processed', payload: { refund: { entity: { id: 'x', payment_id: PID, amount: 4900 } } } }))).status === 200 && wdb.store.get('subscriptions/u1').until.toMillis() === NOW + 30 * DAY);
  r2 = await wx.h.webhook({ raw: mkHook(evRefund(4900)).raw, signature: 'b'.repeat(64) });
  t('refund: a forged refund event changes nothing', r2.status === 400 && wdb.store.get('subscriptions/u1').until.toMillis() === NOW + 30 * DAY);

  // over real HTTP: the same registration as server.js (raw body first, JSON parser after). A body that was parsed first would never match its signature.
  {
    const express = require('express'), http = require('http');
    const wdb2 = fakeDb(), w2 = mkW(wdb2, { [OID]: paidOrder('u1') }), app = express();
    app.post('/api/pay/webhook', express.raw({ type: () => true, limit: '100kb' }), async (req, res) => { const r = await w2.h.webhook({ raw: req.body, signature: String(req.headers['x-razorpay-signature'] || '') }); res.status(r.status).json(r.body); });
    app.use(express.json({ limit: '10kb' }));
    const srv = await new Promise(ok => { const x = app.listen(0, '127.0.0.1', () => ok(x)); });
    const post = (raw, sig, type) => new Promise(ok => { const q = http.request({ host: '127.0.0.1', port: srv.address().port, path: '/api/pay/webhook', method: 'POST', headers: Object.assign({ 'Content-Type': type || 'application/json', 'Content-Length': raw.length }, sig ? { 'X-Razorpay-Signature': sig } : {}) }, res => { let d = ''; res.on('data', c => { d += c; }); res.on('end', () => ok({ status: res.statusCode, body: d })); }); q.end(raw); });
    const hk = mkHook('{\n  "event": "order.paid",   "payload": {"payment":{"entity":{"id":"' + PID + '","order_id":"' + OID + '","status":"captured"}}}\n}');   // odd spacing on purpose: re-serialised JSON would not match
    let rr = await post(hk.raw, hk.signature);
    t('HTTP: a correctly signed webhook (odd spacing, application/json) unlocks', rr.status === 200 && wdb2.store.has('subscriptions/u1'), rr.status + ' ' + rr.body);
    rr = await post(hk.raw, null); t('HTTP: no signature header = 400', rr.status === 400);
    rr = await post(Buffer.from(hk.raw.toString().replace('order.paid', 'order.paiD')), hk.signature); t('HTTP: changed body = 400', rr.status === 400);
    rr = await post(hk.raw, hk.signature, 'text/plain'); t('HTTP: the content type does not matter (Razorpay sends application/json, a proxy may change it)', rr.status === 200);
    await new Promise(ok => srv.close(ok));
  }

  // ---------- wiring in the app ----------
  const server = read('server.js'), html = read('public/index.html'), rules = read('firestore.rules'), fj = read('firebase.json');
  t('server: both pay routes sit behind the login check (registered after it) and use the rate limit', server.indexOf("app.post('/api/pay/order'") > server.indexOf("app.use('/api', async (req, res, next) => {") && /PAYLIM\.hit\(rateKey\(req\)\)/.test(server));
  const iWh = server.indexOf("app.post('/api/pay/webhook'");
  t('server: the webhook is registered before every JSON parser and before the login check (Razorpay has no login)', iWh > 0 && iWh < server.indexOf("app.use('/api/ask', jsonImage)") && iWh < server.indexOf('verifyIdToken'));
  t('server: the webhook reads the RAW body (the signature is over the exact bytes) and the X-Razorpay-Signature header', /app\.post\('\/api\/pay\/webhook', express\.raw\(/.test(server) && /x-razorpay-signature/.test(server) && /PAY\.webhook\(\{ raw: req\.body/.test(server));
  t('server: a webhook failure answers 5xx so Razorpay sends it again', /payWebhook[\s\S]{0,500}res\.status\(500\)/.test(server));
  t('webhook secret is read only from env, never written in the code', /RAZORPAY_WEBHOOK_SECRET/.test(read('pay-core.js')) && !/whsec_/.test(server + read('pay-routes.js') + read('pay-core.js')));
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
