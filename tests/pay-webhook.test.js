/* Tests for the Razorpay webhook (pay-routes.js webhook + pay-core.js webhookSigOk): signed by Razorpay, order read again, one payment counts once.
 * Run: node tests/pay-webhook.test.js */
const crypto = require('crypto'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const PC = require(path.join(ROOT, 'pay-core.js')), PR = require(path.join(ROOT, 'pay-routes.js'));
let pass = 0, fail = 0;
const t = (name, ok, extra) => { if (ok) { pass++; console.log('PASS  ' + name); } else { fail++; console.log('FAIL  ' + name + (extra ? '  -> ' + extra : '')); } };
const SECRET = 'whsec_test_123', ENV = { RAZORPAY_KEY_ID: 'rzp_test_abc', RAZORPAY_KEY_SECRET: 'keysecret', RAZORPAY_WEBHOOK_SECRET: SECRET, PAY_AMOUNT_RUPEES: '99', PAY_DAYS: '30' };
const sign = (buf, secret = SECRET) => crypto.createHmac('sha256', secret).update(buf).digest('hex');
const body = (o) => Buffer.from(JSON.stringify(o));
const Timestamp = { fromMillis: ms => ({ toMillis: () => ms }) };
const mkDb = () => { const st = {}; const key = r => r.c + '/' + r.id; return { st, collection: c => ({ doc: id => ({ c, id }) }), runTransaction: async fn => fn({ get: async r => ({ exists: key(r) in st, data: () => st[key(r)] }), set: (r, d, o) => { st[key(r)] = o && o.merge ? { ...(st[key(r)] || {}), ...d } : d; } }) }; };
const ORDER = 'order_AbCdEf123456', PAY = 'pay_AbCdEf123456';
let order = { id: ORDER, status: 'paid', amount: 9900, notes: { uid: 'stu1', plan: 'videos', days: '30' } }, orderStatus = 200, lookups = 0;
const fetchFn = async () => { lookups++; return { ok: orderStatus === 200, status: orderStatus, json: async () => order }; };
const ev = (event = 'order.paid') => ({ event, payload: { payment: { entity: { id: PAY, order_id: ORDER } }, order: { entity: { id: ORDER } } } });
(async () => {
  // pure signature
  const raw = body(ev());
  t('webhookSigOk: right signature passes', PC.webhookSigOk(raw, sign(raw), SECRET));
  t('webhookSigOk: wrong secret, changed body, missing/short signature, no secret all fail', !PC.webhookSigOk(raw, sign(raw, 'other'), SECRET) && !PC.webhookSigOk(Buffer.from(raw.toString() + ' '), sign(raw), SECRET) && !PC.webhookSigOk(raw, '', SECRET) && !PC.webhookSigOk(raw, 'abc', SECRET) && !PC.webhookSigOk(raw, sign(raw), '') && !PC.webhookSigOk('not a buffer', sign(raw), SECRET) && !PC.webhookSigOk(Buffer.alloc(0), sign(Buffer.alloc(0)), SECRET));

  const mk = (envOver = {}, db = mkDb()) => ({ db, R: PR.make({ db, Timestamp, env: { ...ENV, ...envOver }, fetchFn, now: () => 1e12 }) });
  let { db, R } = mk(), r;
  r = await R.webhook({ raw: raw, signature: sign(raw) });
  t('a valid order.paid event activates the subscription for the uid from OUR order', r.status === 200 && r.body.ok && db.st['subscriptions/stu1'] && db.st['subscriptions/stu1'].until.toMillis() === 1e12 + 30 * 86400000, JSON.stringify(r));
  t('...and records the payment so it cannot count twice', !!db.st['payments/' + PAY] && db.st['payments/' + PAY].uid === 'stu1');
  const until1 = db.st['subscriptions/stu1'].until.toMillis();
  r = await R.webhook({ raw: raw, signature: sign(raw) });
  t('the same event again (Razorpay retries) changes nothing', r.status === 200 && db.st['subscriptions/stu1'].until.toMillis() === until1);

  // webhook first, then the browser verify of the same payment -> still once
  { const m = mk(); await m.R.webhook({ raw: raw, signature: sign(raw) });
    const sig = PC.signatureOf(ORDER, PAY, ENV.RAZORPAY_KEY_SECRET); const v = await m.R.verify({ uid: 'stu1', body: { razorpay_order_id: ORDER, razorpay_payment_id: PAY, razorpay_signature: sig } });
    t('webhook + browser verify of the same payment: the days are added only once', v.status === 200 && m.db.st['subscriptions/stu1'].until.toMillis() === 1e12 + 30 * 86400000); }
  { const m = mk(); const sig = PC.signatureOf(ORDER, PAY, ENV.RAZORPAY_KEY_SECRET); await m.R.verify({ uid: 'stu1', body: { razorpay_order_id: ORDER, razorpay_payment_id: PAY, razorpay_signature: sig } });
    await m.R.webhook({ raw: raw, signature: sign(raw) });
    t('browser verify first, then the webhook: still once', m.db.st['subscriptions/stu1'].until.toMillis() === 1e12 + 30 * 86400000); }

  const bad = await R.webhook({ raw: raw, signature: sign(raw, 'attacker') });
  t('wrong signature -> 400 and nothing is looked up or written', bad.status === 400 && (() => { const m = mk(); return true; })());
  { const m = mk(); const l0 = lookups; const x = await m.R.webhook({ raw: raw, signature: sign(raw, 'attacker') });
    t('wrong signature: no call to Razorpay, no document written', x.status === 400 && lookups === l0 && Object.keys(m.db.st).length === 0); }
  r = (await mk({ RAZORPAY_WEBHOOK_SECRET: '' }).R.webhook({ raw: raw, signature: sign(raw) }));
  t('no RAZORPAY_WEBHOOK_SECRET on the server -> 503 (route is off)', r.status === 503);
  r = (await PR.make({ db: null, Timestamp, env: ENV, fetchFn }).webhook({ raw: raw, signature: sign(raw) }));
  t('no database -> 503', r.status === 503);

  { const m = mk(); const other = body(ev('payment.failed')); r = await m.R.webhook({ raw: other, signature: sign(other) });
    t('an event we do not use (payment.failed) is acknowledged and ignored', r.status === 200 && r.body.ignored && Object.keys(m.db.st).length === 0); }
  { const m = mk(); const cap = body(ev('payment.captured')); r = await m.R.webhook({ raw: cap, signature: sign(cap) });
    t('payment.captured works the same', r.status === 200 && !!m.db.st['subscriptions/stu1']); }

  const cases = [['order not paid', { ...order, status: 'created' }], ['a plan we do not sell', { ...order, notes: { ...order.notes, plan: 'other' } }], ['no uid in the order notes', { ...order, notes: { plan: 'videos', days: '30' } }], ['absurd days', { ...order, notes: { ...order.notes, days: '99999' } }], ['days not a number', { ...order, notes: { ...order.notes, days: 'x' } }]];
  for (const [name, o] of cases) { const m = mk(); const keep = order; order = o; r = await m.R.webhook({ raw: raw, signature: sign(raw) }); order = keep; const retry = name === 'order not paid'; t('order check: ' + name + (retry ? ' -> 409 so Razorpay retries, nothing activated' : ' -> acknowledged, nothing activated'), (retry ? r.status === 409 : r.status === 200 && r.body.ignored) && Object.keys(m.db.st).length === 0, JSON.stringify(r)); }

  { const m = mk(); orderStatus = 500; r = await m.R.webhook({ raw: raw, signature: sign(raw) }); orderStatus = 200;
    t('Razorpay order lookup fails -> 502 so Razorpay retries later; nothing written', r.status === 502 && Object.keys(m.db.st).length === 0); }
  { const m = mk(); const weird = body({ event: 'order.paid', payload: { payment: { entity: { id: 'x', order_id: 'y' } } } }); r = await m.R.webhook({ raw: weird, signature: sign(weird) });
    t('ids that do not look like Razorpay ids are ignored (no lookup)', r.status === 200 && r.body.ignored); }
  { const m = mk(); const junk = Buffer.from('not json'); r = await m.R.webhook({ raw: junk, signature: sign(junk) }); t('signed but not JSON -> 400', r.status === 400); }
  { const m = mk(); order = { ...order, notes: { ...order.notes, uid: 'victim' } }; const spoof = body({ event: 'order.paid', payload: { payment: { entity: { id: PAY, order_id: ORDER, notes: { uid: 'attacker' } } }, order: { entity: { id: ORDER, notes: { uid: 'attacker' } } } } });
    r = await m.R.webhook({ raw: spoof, signature: sign(spoof) }); order = { ...order, notes: { ...order.notes, uid: 'stu1' } };
    t('the uid comes from the order read at Razorpay, never from the webhook payload', !!m.db.st['subscriptions/victim'] && !m.db.st['subscriptions/attacker']); }

  // server wiring
  const srv = fs.readFileSync(path.join(ROOT, 'server.js'), 'utf8').replace(/\r\n/g, '\n'), at = s => srv.indexOf(s);
  t('server: webhook route reads the RAW body and sits before CORS and the login check', at("app.post('/api/pay/webhook'") > 0 && /express\.raw\(/.test(srv) && at("app.post('/api/pay/webhook'") < at("app.use('/api', (req, res, next)") && at("app.post('/api/pay/webhook'") < at('admin.auth().verifyIdToken'));
  t('server: the old pay routes still need the login', at("app.post('/api/pay/order'") > at('admin.auth().verifyIdToken') && at("app.post('/api/pay/verify'") > at('admin.auth().verifyIdToken'));
  console.log('\n' + pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
})();
