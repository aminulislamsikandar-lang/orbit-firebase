// pending-core.js - a student's AI-made video waiting for the admin (Firestore mathVideoPending/<key>, sciencePending/<key>).
// Before: the browser wrote these documents itself, so any signed-in account could create unlimited documents (cost and a flooded admin list).
// Now: the browser asks the server (POST /api/videoreq/pending); the server checks the same fields the old Firestore rule checked, limits each student per day,
// and writes with the Admin SDK. firestore.rules no longer lets a browser create these documents.
// Dependencies are passed in (db = Firestore Admin or null), so tests/pending.test.js runs it with fakes.
'use strict';

const STORES = {
  math: { collection: 'mathVideoPending', planType: 'equation', maxText: 400, allowQid: true },
  science: { collection: 'sciencePending', planType: 'science', maxText: 700, allowQid: false }
};
const KEY_RE = /^[0-9a-f]{40}$/;
const MAX_PLAN_BYTES = 100 * 1024, MAX_STEPS = 12, QID_MAX = 40, DAILY_MAX = 20, DAY_MS = 24 * 3600000;
const reply = (status, body) => ({ status, body });

// Returns { error } or { doc, key, store }. The shape is exactly what firestore.rules used to accept.
function validate(body, uid, now) {
  const b = body || {}, store = STORES[b.store];
  if (!store) return { error: 'Store galat hai.' };
  if (typeof b.key !== 'string' || !KEY_RE.test(b.key)) return { error: 'Key galat hai.' };
  if (typeof b.text !== 'string' || !b.text.length || b.text.length > store.maxText) return { error: 'Question ka text galat hai.' };
  const plan = b.plan;
  if (!plan || typeof plan !== 'object' || Array.isArray(plan) || plan.type !== store.planType) return { error: 'Plan galat hai.' };
  if (!Array.isArray(plan.steps) || plan.steps.length < 1 || plan.steps.length > MAX_STEPS) return { error: 'Plan ke steps galat hain.' };
  let bytes = 0; try { bytes = Buffer.byteLength(JSON.stringify(plan)); } catch (e) { return { error: 'Plan galat hai.' }; }
  if (bytes > MAX_PLAN_BYTES) return { error: 'Plan bahut bada hai.' };
  const doc = { text: b.text, plan: JSON.parse(JSON.stringify(plan)), uid, ts: now() };
  if (store.allowQid && b.qid != null && b.qid !== '') {
    if (typeof b.qid !== 'string' || b.qid.length > QID_MAX) return { error: 'Question id galat hai.' };
    doc.qid = b.qid;
  }
  return { doc, key: b.key, store };
}

function make({ db, now, limiter }) {
  const clock = now || Date.now;
  // limiter: { take(uid) -> true when the student is over the daily limit }. Default: in memory, 20 per student per 24 h.
  const hits = new Map();
  const over = limiter || (uid => {
    const t = clock(), arr = (hits.get(uid) || []).filter(x => t - x < DAY_MS);
    arr.push(t); hits.set(uid, arr);
    if (hits.size > 5000) for (const [k, v] of hits) if (!v.length || t - v[v.length - 1] >= DAY_MS) hits.delete(k);
    return arr.length > DAILY_MAX;
  });

  async function add({ uid, body }) {
    if (!uid) return reply(401, { error: 'Pehle Google se log in karo.' });
    if (!db) return reply(503, { code: 'no_db', error: 'Server par database nahi laga hai.' });
    const v = validate(body, uid, clock);
    if (v.error) return reply(400, { code: 'bad_request', error: v.error });
    if (over(uid)) return reply(429, { code: 'limit_reached', error: 'Aaj ke liye bahut requests bhej di. Kal dobara try karo.' });
    const ref = db.collection(v.store.collection).doc(v.key);
    // Same question sent again (same key): keep the first one, do not overwrite or grow the list.
    const created = await db.runTransaction(async tx => { const s = await tx.get(ref); if (s.exists) return false; tx.set(ref, v.doc); return true; });
    return reply(200, { ok: true, created });
  }
  return { add };
}

module.exports = { STORES, KEY_RE, MAX_PLAN_BYTES, MAX_STEPS, DAILY_MAX, validate, make };
