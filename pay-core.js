// pay-core.js - Razorpay payment helpers for Orbit (pure functions, no Express, no Firebase), so tests/pay.test.js can run them directly.
// One payment unlocks every non-free video for PAY_DAYS days: the server writes subscriptions/<uid>.until, which server.js hasAccess() already reads.
'use strict';
const crypto = require('crypto');

const ORDER_RE = /^order_[A-Za-z0-9]{6,40}$/;
const PAYMENT_RE = /^pay_[A-Za-z0-9]{6,40}$/;
const SIG_RE = /^[0-9a-f]{64}$/;

const num = (v, min, max, dflt) => { const n = Number(v); return Number.isFinite(n) && n >= min && n <= max ? n : dflt; };

// Render env: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, PAY_AMOUNT_RUPEES (default 99), PAY_DAYS (default 365).
function readConfig(env) {
  const e = env || {};
  const keyId = String(e.RAZORPAY_KEY_ID || '').trim(), keySecret = String(e.RAZORPAY_KEY_SECRET || '').trim();
  const rupees = num(e.PAY_AMOUNT_RUPEES, 1, 50000, 99);
  return {
    enabled: !!(keyId && keySecret),
    keyId, keySecret,
    test: /^rzp_test_/.test(keyId),
    amountPaise: Math.round(rupees * 100),
    days: Math.floor(num(e.PAY_DAYS, 1, 3650, 365))
  };
}

const basicAuth = (id, secret) => 'Basic ' + Buffer.from(id + ':' + secret).toString('base64');

// Razorpay Checkout signs "<order_id>|<payment_id>" with the Key Secret (HMAC SHA256, hex). Only a real, completed payment has a matching signature.
const signatureOf = (orderId, paymentId, secret) => crypto.createHmac('sha256', secret).update(orderId + '|' + paymentId).digest('hex');

function signatureOk(orderId, paymentId, signature, secret) {
  if (!ORDER_RE.test(orderId || '') || !PAYMENT_RE.test(paymentId || '') || !SIG_RE.test(signature || '') || !secret) return false;
  const a = Buffer.from(signatureOf(orderId, paymentId, secret)), b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// A new payment adds days on top of any time the student still has, so paying early never loses days.
const nextUntil = (currentMs, nowMs, days) => Math.max(Number(currentMs) || 0, nowMs) + days * 86400000;

// Razorpay receipt: at most 40 characters.
const receiptOf = (uid, nowMs) => ('o_' + String(uid || '').replace(/[^A-Za-z0-9]/g, '').slice(0, 14) + '_' + nowMs.toString(36)).slice(0, 40);

module.exports = { ORDER_RE, PAYMENT_RE, SIG_RE, readConfig, basicAuth, signatureOf, signatureOk, nextUntil, receiptOf };
