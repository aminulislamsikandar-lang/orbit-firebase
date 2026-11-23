// plan-core.js - the optional FREE PLAN (Render env FREE_PLAN=on; default is OFF, so nothing changes until you switch it on).
// A student without a Plus subscription gets FREE_SECONDS of study time per IST day (default 600 = 10 minutes) and only the first
// FREE_CHAPTERS chapters (default 1) of a course, with every feature (AI answer, translation, diagram, ...) working inside that.
// Plus = the same subscriptions/<uid>.until that the Razorpay payment already writes (pay-routes.js). Admins are never limited.
// No network and no Express here: tests/plan.test.js runs everything against fakes.
// The time is counted on the SERVER (dailyUsage/<uid>_<day>.secs, Admin SDK only: firestore.rules blocks the app from that collection),
// so a refresh, a second browser or a cleared cache can not give the time back.
'use strict';

const MAX_TICK = 20;   // seconds one heartbeat may add (the app sends 15 every 15 seconds)
const DAY_MS = 86400000;

function readConfig(env) {
  env = env || {};
  const num = (v, d, lo, hi) => { const x = parseInt(v, 10); return Number.isFinite(x) && x >= lo && x <= hi ? x : d; };
  return { on: String(env.FREE_PLAN || '').trim().toLowerCase() === 'on', seconds: num(env.FREE_SECONDS, 600, 60, 86400), chapters: num(env.FREE_CHAPTERS, 1, 1, 99) };
}

const istDay = ms => new Date(ms + 19800000).toISOString().slice(0, 10);

// 1-based position of a chapter inside its course (0 when it is not part of it).
function chapterNo(course, ch) {
  const i = course && Array.isArray(course.chapters) ? course.chapters.indexOf(ch) : -1;
  return i < 0 ? 0 : i + 1;
}

const MSG = {
  time: 'Aaj ka free time khatam. Kal phir aao, ya Plus lo.',
  chapter: 'Ye chapter Plus plan mein hai.'
};

// { ok: true } or { ok: false, status: 402, code, kind, error }
function decide({ cfg, plus, admin, used, chNo }) {
  if (!cfg || !cfg.on || plus || admin) return { ok: true };
  if (chNo > cfg.chapters) return { ok: false, status: 402, code: 'plan_locked', kind: 'chapter', error: MSG.chapter };
  if ((Number(used) || 0) >= cfg.seconds) return { ok: false, status: 402, code: 'plan_time_over', kind: 'time', error: MSG.time };
  return { ok: true };
}

// Used seconds per student per IST day. db = admin.firestore() (or a fake) or null (then in memory; fine for one Render instance).
function createUsage({ db, now = Date.now, log = console }) {
  const mem = new Map(), last = new Map();
  const key = uid => uid + '_' + istDay(now());
  const ref = uid => db.collection('dailyUsage').doc(key(uid));
  const warn = (what, e) => { try { log.error('[plan] ' + what + ' failed, using the in-memory count: ' + ((e && e.message) || e)); } catch (x) { /* logging must never break a request */ } };
  // A heartbeat can not claim more time than really passed since the previous one (plus one second), so a script can not fill the clock early.
  function credit(uid, requested) {
    const t = now(), prev = last.get(uid);
    last.set(uid, t);
    if (last.size > 5000) for (const [k, v] of last) if (t - v > 3600000) last.delete(k);
    let c = Math.max(0, Math.min(MAX_TICK, Math.floor(Number(requested) || 0)));
    if (prev) c = Math.min(c, Math.ceil((t - prev) / 1000) + 1);
    return c;
  }
  async function get(uid) {
    if (db) { try { const s = await ref(uid).get(); return s.exists ? Number((s.data() || {}).secs) || 0 : 0; } catch (e) { warn('read', e); } }
    return mem.get(key(uid)) || 0;
  }
  async function add(uid, requested) {
    const c = credit(uid, requested);
    if (c <= 0) return get(uid);
    if (db) {
      try {
        return await db.runTransaction(async tx => {
          const s = await tx.get(ref(uid));
          const n = (s.exists ? Number((s.data() || {}).secs) || 0 : 0) + c;
          tx.set(ref(uid), { uid, day: istDay(now()), secs: n, expireAt: new Date(now() + 2 * DAY_MS) }, { merge: true });
          return n;
        });
      } catch (e) { warn('write', e); }
    }
    const k = key(uid), n = (mem.get(k) || 0) + c; mem.set(k, n);
    if (mem.size > 20000) { const d = istDay(now()); for (const x of mem.keys()) if (!x.endsWith('_' + d)) mem.delete(x); }
    return n;
  }
  return { get, add };
}

// The check server.js runs before an AI route: returns { ok } or { ok:false, status, code, kind, error }.
// byId(id) -> { course, ch } | undefined, isPlus(req) / isAdmin(req) are passed in. Custom courses (b.cq) and unknown ids are not part of the plan.
function makeGate({ cfg, usage, isPlus, isAdmin, byId }) {
  return async function gate(req) {
    if (!cfg.on) return { ok: true };
    const b = req.body || {};
    if (b.cq) return { ok: true };
    const hit = byId(String(b.id || '').split('|')[0]);
    if (!hit) return { ok: true };
    if (isAdmin(req)) return { ok: true };
    const plus = await isPlus(req);
    const used = plus ? 0 : await usage.get(req.user.uid);
    return decide({ cfg, plus, admin: false, used, chNo: chapterNo(hit.course, hit.ch) });
  };
}

module.exports = { MAX_TICK, MSG, readConfig, istDay, chapterNo, decide, createUsage, makeGate };
