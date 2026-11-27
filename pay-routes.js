// pay-routes.js - the payment routes: create order, verify payment (the student's browser), and the Razorpay webhook (Razorpay itself: unlocks a payment the browser never confirmed, takes days back after a full refund). Dependencies are passed in, so tests/pay.test.js runs them with fakes.
// Each handler returns { status, body }. server.js turns that into the HTTP answer. The login check already ran (req.user).
'use strict';
const P = require('./pay-core');

const RZP = 'https://api.razorpay.com/v1/orders';
const toMs = v => (v && typeof v.toMillis === 'function') ? v.toMillis() : (v instanceof Date ? v.getTime() : (Number(v) || 0));
const reply = (status, body) => ({ status, body });

// deps: db (Firestore Admin or null), Timestamp (admin.firestore.Timestamp), env, fetchFn, now
function make({ db, Timestamp, env, fetchFn, now }) {
  const clock = now || Date.now, doFetch = fetchFn || fetch, getEnv = () => env || process.env;

  const lookup = async (cfg, oid) => {
    const r = await doFetch(RZP + '/' + oid, { headers: { Authorization: P.basicAuth(cfg.keyId, cfg.keySecret) } });
    const o = await r.json().catch(() => ({}));
    return { ok: r.ok && !!o.id, status: r.status, o };
  };
  // One payment can unlock only once: payments/<payment id> is created together with the subscription, in one transaction.
  // The browser (verify) and Razorpay (webhook) can both report the same payment; whoever comes second changes nothing.
  async function unlock(uid, oid, pid, amount, days) {
    const payRef = db.collection('payments').doc(pid), subRef = db.collection('subscriptions').doc(uid);
    return db.runTransaction(async tx => {
      const p = await tx.get(payRef), s = await tx.get(subRef), cur = s.exists ? toMs((s.data() || {}).until) : 0;
      if (p.exists) return { until: cur, fresh: false };
      const t = clock(), until = P.nextUntil(cur, t, days);
      tx.set(payRef, { uid, orderId: oid, amount, days, at: Timestamp.fromMillis(t) });
      tx.set(subRef, { until: Timestamp.fromMillis(until), updatedAt: Timestamp.fromMillis(t) }, { merge: true });
      return { until, fresh: true };
    });
  }

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
    const L = await lookup(cfg, oid), o = L.o;
    if (!L.ok) { console.error('[pay] order lookup failed ' + L.status); return reply(502, { error: 'Payment abhi confirm nahi ho paya. Dobara try karo.' }); }
    const n = o.notes || {};
    if (n.uid !== uid || n.plan !== 'videos') return reply(403, { code: 'not_yours', error: 'Ye payment is account ka nahi hai.' });
    if (o.status !== 'paid') return reply(409, { error: 'Payment abhi confirm nahi hua. Thodi der baad dobara try karo.' });
    const days = parseInt(n.days, 10);
    if (!Number.isFinite(days) || days < 1 || days > 3650) return reply(400, { code: 'bad_request', error: 'Payment ki details galat hain.' });

    const untilMs = (await unlock(uid, oid, pid, o.amount, days)).until;
    return reply(200, { ok: true, until: untilMs });
  }

  // Razorpay calls this itself (no login). The signature over the RAW body is checked first; nothing else is trusted before that.
  // 2xx = done or nothing to do. 4xx/5xx makes Razorpay try again later, so a payment is never lost to a slow server or a failed lookup.
  async function webhook({ raw, signature }) {
    const cfg = P.readConfig(getEnv());
    if (!cfg.enabled || !db || !cfg.webhookSecret) return reply(503, { code: 'pay_off', error: 'Webhook abhi set nahi hai.' });
    if (!P.webhookSigOk(raw, signature, cfg.webhookSecret)) return reply(400, { code: 'bad_signature', error: 'Signature galat hai.' });
    let ev; try { ev = JSON.parse(Buffer.isBuffer(raw) ? raw.toString('utf8') : String(raw)); } catch (e) { ev = null; }
    if (!ev || typeof ev !== 'object') return reply(400, { code: 'bad_request', error: 'Body galat hai.' });
    const name = String(ev.event || ''), pl = ev.payload || {};

    if (name === 'order.paid' || name === 'payment.captured') {
      const pay = (pl.payment && pl.payment.entity) || {}, ord = (pl.order && pl.order.entity) || {};
      const oid = String(pay.order_id || ord.id || ''), pid = String(pay.id || '');
      if (!P.ORDER_RE.test(oid) || !P.PAYMENT_RE.test(pid) || (pay.status && pay.status !== 'captured')) return reply(200, { ignored: name });
      const L = await lookup(cfg, oid), o = L.o;   // the order is read from Razorpay itself: the notes tell whose payment this is
      if (!L.ok) { console.error('[pay] webhook order lookup failed ' + L.status); return reply(502, { error: 'Order abhi nahi mila.' }); }
      const n = o.notes || {};
      if (n.plan !== 'videos' || typeof n.uid !== 'string' || !n.uid) return reply(200, { ignored: 'not_ours' });
      if (o.status !== 'paid') return reply(409, { error: 'Order abhi paid nahi dikh raha.' });
      const days = parseInt(n.days, 10);
      if (!Number.isFinite(days) || days < 1 || days > 3650) return reply(200, { ignored: 'bad_days' });
      const r = await unlock(n.uid, oid, pid, o.amount, days);
      return reply(200, r.fresh ? { ok: true, did: 'unlocked ' + pid } : { ok: true, already: true });
    }

    if (name === 'refund.processed') {
      const rf = (pl.refund && pl.refund.entity) || {};
      const rid = String(rf.id || ''), pid = String(rf.payment_id || ''), amount = Number(rf.amount);
      if (!P.REFUND_RE.test(rid) || !P.PAYMENT_RE.test(pid) || !Number.isFinite(amount) || amount <= 0) return reply(200, { ignored: name });
      const r = await refund(rid, pid, amount);
      return reply(200, r.revoked ? { ok: true, did: 'refund took back days ' + pid } : { ok: true, skipped: r.skipped || null });
    }
    return reply(200, { ignored: name });   // other events are not used
  }

  // Money was given back. A FULL refund takes back the days that payment gave; a partial refund is only written down (decide by hand).
  // Each refund id counts once, and the days are taken back once, even if Razorpay sends the event again.
  async function refund(rid, pid, amount) {
    const payRef = db.collection('payments').doc(pid);
    return db.runTransaction(async tx => {
      const p = await tx.get(payRef); if (!p.exists) return { skipped: 'unknown_payment' };
      const d = p.data() || {}; if (typeof d.uid !== 'string' || !d.uid) return { skipped: 'no_student' };
      const ids = Array.isArray(d.refundIds) ? d.refundIds : [];
      if (ids.includes(rid)) return { skipped: 'seen' };
      const subRef = db.collection('subscriptions').doc(d.uid), s = await tx.get(subRef);   // every read happens before the first write
      const refunded = (Number(d.refunded) || 0) + amount, full = refunded >= (Number(d.amount) || Infinity) && !d.revoked, t = clock();
      const upd = { refundIds: ids.concat([rid]).slice(-20), refunded, refundedAt: Timestamp.fromMillis(t) };
      if (full) {
        upd.revoked = true;
        tx.set(subRef, { until: Timestamp.fromMillis(P.afterRefund(s.exists ? toMs((s.data() || {}).until) : 0, t, Number(d.days) || 0)), updatedAt: Timestamp.fromMillis(t) }, { merge: true });
      }
      tx.set(payRef, upd, { merge: true });
      return { revoked: full };
    });
  }

  return { order, verify, webhook };
}

module.exports = { make };
