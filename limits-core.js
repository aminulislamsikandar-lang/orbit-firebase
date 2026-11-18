// limits-core.js - daily limits kept in Firestore (Task 13), so a Render restart or sleep no longer sets the counts back to zero.
// One small document per student per IST day: dailyUsage/<uid>_<YYYY-MM-DD> = { uid, day, recall, ai, photos, expireAt }.
// The server reads and writes it with the Firebase Admin SDK, which ignores Firestore rules. The rules block the app itself from this
// collection (see firestore.rules), so a student can not reset or lower their own count.
// No network and no Express here: tests/limits.test.js runs it against a fake Firestore.
// If Firestore can not be reached (or no service account is set on Render), the limit falls back to the old in-memory count for that call:
// the free Gemini key stays protected and the app keeps working.
'use strict';

const COLLECTION = 'dailyUsage';
const KINDS = ['recall', 'ai', 'photos', 'bolo'];   // Recall free check, custom-course AI calls, custom-course photo reads, Bolo Assamese voice checks
const DAY_MS = 86400000;

const istDay = (now = Date.now) => new Date(now() + 19800000).toISOString().slice(0, 10);

// The same in-memory count that the server used before. Used only as the fallback.
function createMemoryQuota(max, now = Date.now) {
  const used = new Map();
  const key = uid => uid + '|' + istDay(now);
  return {
    take(uid) { const k = key(uid), n = used.get(k) || 0; if (n >= max) return false; used.set(k, n + 1); return true; },
    refund(uid) { const k = key(uid), n = used.get(k) || 0; if (n > 0) used.set(k, n - 1); },
    left(uid) { return Math.max(0, max - (used.get(key(uid)) || 0)); },
    prune() { const d = istDay(now); for (const k of used.keys()) if (!k.endsWith('|' + d)) used.delete(k); return used.size; }
  };
}

// db = admin.firestore() (or a fake with the same calls), or null when Firestore is not set up: then everything is in memory.
// kind = 'recall' | 'ai' | 'photos' | 'bolo'. Every method is async. take/refund use ONE transaction (one read + one small write),
// so two requests at the same moment can not both get the last use.
function createStoredQuota({ db, kind, max, now = Date.now, log = console }) {
  if (!KINDS.includes(kind)) throw new Error('unknown limit kind: ' + kind);
  const mem = createMemoryQuota(max, now);
  const ref = uid => db.collection(COLLECTION).doc(uid + '_' + istDay(now));
  const warn = (what, e) => { try { log.error('[limits] ' + what + ' failed, using the in-memory count for this call: ' + ((e && e.message) || e)); } catch (x) { /* logging must never break a request */ } };
  return {
    async take(uid) {
      if (!db) return mem.take(uid);
      try {
        return await db.runTransaction(async tx => {
          const snap = await tx.get(ref(uid));
          const n = snap.exists ? Number((snap.data() || {})[kind]) || 0 : 0;
          if (n >= max) return false;
          tx.set(ref(uid), { uid, day: istDay(now), [kind]: n + 1, expireAt: new Date(now() + 2 * DAY_MS) }, { merge: true });
          return true;
        });
      } catch (e) { warn('take', e); return mem.take(uid); }
    },
    async refund(uid) {   // a failed AI call gives the use back; never goes below zero
      if (!db) return mem.refund(uid);
      try {
        await db.runTransaction(async tx => {
          const snap = await tx.get(ref(uid));
          const n = snap.exists ? Number((snap.data() || {})[kind]) || 0 : 0;
          if (n > 0) tx.set(ref(uid), { [kind]: n - 1 }, { merge: true });
        });
      } catch (e) { warn('refund', e); mem.refund(uid); }
    },
    async left(uid) {
      if (!db) return mem.left(uid);
      try {
        const snap = await ref(uid).get();
        const n = snap.exists ? Number((snap.data() || {})[kind]) || 0 : 0;
        return Math.max(0, max - n);
      } catch (e) { warn('read', e); return mem.left(uid); }
    },
    prune() { return mem.prune(); }
  };
}

// Render env FIREBASE_SERVICE_ACCOUNT = the service-account JSON (plain, or base64 of it). Returns the object, or null when it is not set / not usable.
function parseServiceAccount(raw) {
  const s = String(raw || '').trim();
  if (!s) return null;
  let j = null;
  try { j = JSON.parse(s); } catch (e) {
    try { j = JSON.parse(Buffer.from(s, 'base64').toString('utf8')); } catch (e2) { return null; }
  }
  return j && typeof j === 'object' && typeof j.client_email === 'string' && typeof j.private_key === 'string' ? j : null;
}

module.exports = { COLLECTION, KINDS, istDay, createMemoryQuota, createStoredQuota, parseServiceAccount };
