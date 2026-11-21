// pay-routes.js - the two payment routes (create order, verify payment). Dependencies are passed in, so tests/pay.test.js runs them with fakes.
// Each handler returns { status, body }. server.js turns that into the HTTP answer. The login check already ran (req.user).
'use strict';
const P = require('./pay-core');

const RZP = 'https://api.razorpay.com/v1/orders';
const toMs = v => (v && typeof v.toMillis === 'function') ? v.toMillis() : (v instanceof Date ? v.getTime() : (Number(v) || 0));
const reply = (status, body) => ({ status, body });

// deps: db (Firestore Admin or null), Timestamp (admin.firestore.Timestamp), env, fetchFn, now
function make({ db, Timestamp, env, fetchFn, now }) {
  const clock = now || Date.now, doFetch = fetchFn || fetch, getEnv = () => env || process.env;

  async function order({ uid }) {
    const cfg = P.readConfig(getEnv());
    if (!uid) return reply(401, { error: 'Pehle Google se log in karo.' });
    if (!cfg.enabled || !db) return reply(503, { code: 'pay_off', error: 'Payment abhi set nahi hai. Thodi der baad try karo.' });
    const r = await doFetch(RZP, {
      method: 'POST',
      headers: { Authorization: P.basicAuth(cfg.keyId, cfg.keySecret), 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: cfg.amountPaise, currency: 'INR', receipt: P.receiptOf(uid, clock()), notes: { uid, plan: 'videos', days: String(cfg.days) } })
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.id) {
      console.error('[pay] order failed ' + r.status + ' ' + String((j.error && j.error.description) || '').slice(0, 200));
      return reply(502, { error: 'Payment shuru nahi ho paya. Thodi der baad dobara try karo.' });
    }
    return reply(200, { orderId: j.id, amount: j.amount, currency: j.currency, keyId: cfg.keyId, days: cfg.days });
  }

  async function verify({ uid, body }) {
    const cfg = P.readConfig(getEnv()), b = body || {};
    if (!uid) return reply(401, { error: 'Pehle Google se log in karo.' });
    if (!cfg.enabled || !db) return reply(503, { code: 'pay_off', error: 'Payment abhi set nahi hai. Thodi der baad try karo.' });
    const oid = b.razorpay_order_id, pid = b.razorpay_payment_id, sig = b.razorpay_signature;
    if (!P.ORDER_RE.test(String(oid || '')) || !P.PAYMENT_RE.test(String(pid || '')) || !P.SIG_RE.test(String(sig || ''))) return reply(400, { code: 'bad_request', error: 'Payment ki details galat hain.' });
    if (!P.signatureOk(oid, pid, sig, cfg.keySecret)) return reply(400, { code: 'bad_signature', error: 'Payment check fail hua. Agar paisa kata hai to Orbit ko contact karo.' });

    // The order itself must be ours (made by this server for this student) and fully paid.
    const r = await doFetch(RZP + '/' + oid, { headers: { Authorization: P.basicAuth(cfg.keyId, cfg.keySecret) } });
    const o = await r.json().catch(() => ({}));
    if (!r.ok || !o.id) { console.error('[pay] order lookup failed ' + r.status); return reply(502, { error: 'Payment abhi confirm nahi ho paya. Dobara try karo.' }); }
    const n = o.notes || {};
    if (n.uid !== uid || n.plan !== 'videos') return reply(403, { code: 'not_yours', error: 'Ye payment is account ka nahi hai.' });
    if (o.status !== 'paid') return reply(409, { error: 'Payment abhi confirm nahi hua. Thodi der baad dobara try karo.' });
    const days = parseInt(n.days, 10);
    if (!Number.isFinite(days) || days < 1 || days > 3650) return reply(400, { code: 'bad_request', error: 'Payment ki details galat hain.' });

    // One payment can unlock only once: payments/<payment id> is created together with the subscription, in one transaction.
    const payRef = db.collection('payments').doc(pid), subRef = db.collection('subscriptions').doc(uid);
    const untilMs = await db.runTransaction(async tx => {
      const p = await tx.get(payRef), s = await tx.get(subRef), cur = s.exists ? toMs((s.data() || {}).until) : 0;
      if (p.exists) return cur;
      const t = clock(), until = P.nextUntil(cur, t, days);
      tx.set(payRef, { uid, orderId: oid, amount: o.amount, days, at: Timestamp.fromMillis(t) });
      tx.set(subRef, { until: Timestamp.fromMillis(until), updatedAt: Timestamp.fromMillis(t) }, { merge: true });
      return until;
    });
    return reply(200, { ok: true, until: untilMs });
  }

  return { order, verify };
}

module.exports = { make };
