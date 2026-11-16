'use strict';
// Orbit "Padhai ka time" stage 2: the routes behind the parent link and the father's alerts.
// make({ db, webpush, env, now }) returns plain async handlers  (req) => ({ status, body })  with req = { uid, query, body, headers }.
// server.js turns them into Express routes. db = Firestore (firebase-admin) or null, webpush = configured web-push or null. Nothing here needs Express,
// so tests/study-routes.test.js runs them against a small in-memory Firestore.
// Collections (the browser can never read or write them: firestore.rules has no rule for them, so they are closed):
//   studyPlans/{childUid}    { plan, updatedAt, parents: [uid], today: {day, started, done, mins, alerted, summarySent} }
//   studyLinks/{code}        { childUid, name, exp }        one-time code, 15 minutes
//   studyParents/{parentUid} { children: [childUid], subs: [PushSubscription] }
const C = require('./study-core');

function make({ db, webpush, env, now }) {
  env = env || {}; now = now || Date.now;
  const err = (status, error, code) => ({ status, body: code ? { error, code } : { error } });
  const ok = body => ({ status: 200, body });
  const plans = () => db.collection('studyPlans'), parentsC = () => db.collection('studyParents'), links = () => db.collection('studyLinks');
  const NODB = err(503, 'Server par FIREBASE_SERVICE_ACCOUNT nahi laga hai, isliye parent link abhi band hai.', 'no_db');

  function limiter(max, windowMs) {
    const m = new Map();
    return { take(k) { const t = now(), a = (m.get(k) || []).filter(x => t - x < windowMs); if (a.length >= max) { m.set(k, a); return false; } a.push(t); m.set(k, a); if (m.size > 5000) for (const [kk, v] of m) if (!v.some(x => t - x < windowMs)) m.delete(kk); return true; },
      full(k) { const t = now(); return (m.get(k) || []).filter(x => t - x < windowMs).length >= max; } };
  }
  const L = { link: limiter(6, 3600000), bad: limiter(8, 3600000), plan: limiter(40, 3600000), event: limiter(40, 3600000), push: limiter(20, 3600000) };
  const okId = v => typeof v === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(v);   // Firebase uids; anything else (slashes, dots) never reaches Firestore
  const BADID = err(400, 'Bachhe ki id sahi nahi hai.');
  const isChildOrParent = (doc, uid, child) => child === uid || (doc.parents || []).includes(uid);

  async function pushTo(parentIds, payload) {
    if (!webpush) return { sent: 0 };
    let sent = 0; const body = JSON.stringify(payload);
    for (const pid of parentIds || []) {
      const s = await parentsC().doc(pid).get(); const subs = s.exists ? (s.data().subs || []) : []; if (!subs.length) continue;
      const dead = new Set();
      await Promise.all(subs.map(async sub => {
        try { await webpush.sendNotification(sub, body, { TTL: 3600, urgency: 'high' }); sent++; }
        catch (e) { if (e && (e.statusCode === 404 || e.statusCode === 410)) dead.add(sub.endpoint); else console.error('[study] push failed ' + (e && e.statusCode || e && e.message)); }
      }));
      if (dead.size) await db.runTransaction(async tx => { const r = parentsC().doc(pid), x = await tx.get(r); if (x.exists) tx.update(r, { subs: (x.data().subs || []).filter(q => !dead.has(q.endpoint)) }); });
    }
    return { sent };
  }

  const handlers = {
    config: async () => ok({ vapid: env.VAPID_PUBLIC_KEY || '', ready: !!webpush && !!db }),

    // the child's phone (or a linked parent) reads the plan
    planGet: async r => {
      if (!db) return NODB;
      const child = String((r.query && r.query.child) || r.uid); if (!okId(child)) return BADID;
      const s = await plans().doc(child).get();
      if (!s.exists) return ok({ plan: null, linked: 0 });
      const d = s.data(); if (!isChildOrParent(d, r.uid, child)) return err(403, 'Ye bachha aapse juda nahi hai.');
      return ok({ plan: d.plan, updatedAt: d.updatedAt || 0, linked: (d.parents || []).length });
    },
    // the child's phone saves its plan, or a linked parent changes it from his own phone (last save wins)
    planSet: async r => {
      if (!db) return NODB;
      if (!L.plan.take(r.uid)) return err(429, 'Bahut baar badla. Thodi der baad try karo.');
      const b = r.body || {}, child = String(b.child || r.uid), plan = C.cleanPlan(b.plan), t = now(); if (!okId(child)) return BADID;
      let res;
      await db.runTransaction(async tx => {
        const ref = plans().doc(child), s = await tx.get(ref), d = s.exists ? s.data() : null;
        if (d && !isChildOrParent(d, r.uid, child)) { res = err(403, 'Ye bachha aapse juda nahi hai.'); return; }
        if (!d && child !== r.uid) { res = err(403, 'Pehle bachhe ke phone par time save hona chahiye.'); return; }
        tx.set(ref, { plan, updatedAt: t, parents: d ? (d.parents || []) : [], ...(d && d.today ? { today: d.today } : {}) });
        res = ok({ plan, updatedAt: t });
      });
      return res;
    },

    // child phone: make a one-time code
    linkNew: async r => {
      if (!db) return NODB;
      if (!L.link.take(r.uid)) return err(429, 'Bahut codes bane. Ek ghante baad try karo.');
      const ps = await plans().doc(r.uid).get();
      if (!ps.exists) return err(400, 'Pehle padhai ka time save karo, phir parent ko jodo.', 'no_plan');
      const old = await links().where('childUid', '==', r.uid).get(); for (const d of old.docs) await d.ref.delete();
      for (let i = 0; i < 6; i++) {
        const code = C.newCode(), ref = links().doc(code), ex = await ref.get();
        if (ex.exists && ex.data().exp > now()) continue;
        await ref.set({ childUid: r.uid, name: ps.data().plan.name || '', exp: now() + C.CODE_TTL_MS });
        return ok({ code, expiresAt: now() + C.CODE_TTL_MS });
      }
      return err(500, 'Code nahi ban paya. Dobara try karo.');
    },
    // parent phone: use the code
    linkJoin: async r => {
      if (!db) return NODB;
      const code = C.normCode(r.body && r.body.code);
      if (L.bad.full(r.uid)) return err(429, 'Bahut galat code. Ek ghante baad try karo.');
      const bad = () => { L.bad.take(r.uid); return err(404, 'Code galat hai ya purana ho gaya. Bachhe ke phone par naya code banao.'); };
      if (!C.validCode(code)) return bad();
      const ls = await links().doc(code).get();
      if (!ls.exists || ls.data().exp < now()) return bad();
      const child = ls.data().childUid;
      if (child === r.uid) return err(400, 'Ye aapka apna code hai. Ise parent ke phone par daalo.');
      let res;
      await db.runTransaction(async tx => {
        const pr = plans().doc(child), qr = parentsC().doc(r.uid), [ps, qs] = [await tx.get(pr), await tx.get(qr)];
        if (!ps.exists) { res = bad(); return; }
        const d = ps.data(), kids = qs.exists ? (qs.data().children || []) : [];
        const had = (d.parents || []).includes(r.uid);
        if (!had && (d.parents || []).length >= 3) { res = err(400, 'Is bachhe ke 3 parent pehle se judey hain.'); return; }
        if (!kids.includes(child) && kids.length >= 5) { res = err(400, 'Aap 5 bachhon se zyada nahi jod sakte.'); return; }
        tx.update(pr, { parents: had ? d.parents : [...(d.parents || []), r.uid] });
        const nk = kids.includes(child) ? kids : [...kids, child];
        if (qs.exists) tx.update(qr, { children: nk }); else tx.set(qr, { children: nk, subs: [] });
        tx.delete(links().doc(code));
        res = ok({ child, name: d.plan.name || '' });
      });
      return res;
    },
    unlink: async r => {
      if (!db) return NODB;
      const b = r.body || {}, asParent = b.child && String(b.child) !== r.uid;
      if ((b.child && !okId(String(b.child))) || (b.parent && !okId(String(b.parent)))) return BADID;
      await db.runTransaction(async tx => {
        const child = asParent ? String(b.child) : r.uid, pr = plans().doc(child), ps = await tx.get(pr); if (!ps.exists) return;
        const d = ps.data(), cur = d.parents || [];
        const gone = asParent ? (cur.includes(r.uid) ? [r.uid] : []) : (b.parent ? cur.filter(x => x === String(b.parent)) : cur.slice());
        if (!gone.length) return;
        const docs = []; for (const pid of gone) docs.push([parentsC().doc(pid), await tx.get(parentsC().doc(pid))]);
        tx.update(pr, { parents: cur.filter(x => !gone.includes(x)) });
        for (const [ref, s] of docs) if (s.exists) tx.update(ref, { children: (s.data().children || []).filter(x => x !== child) });
      });
      return ok({ ok: true });
    },
    // parent phone: my children and how today is going
    children: async r => {
      if (!db) return NODB;
      const qs = await parentsC().doc(r.uid).get(), q = qs.exists ? qs.data() : { children: [], subs: [] }, day = C.istNow(now()).day, out = [], stale = [];
      for (const id of q.children || []) {
        const s = await plans().doc(id).get();
        if (!s.exists || !(s.data().parents || []).includes(r.uid)) { stale.push(id); continue; }
        const d = s.data(), t = C.todayOf(d, day);
        out.push({ id, name: d.plan.name || '', plan: d.plan, updatedAt: d.updatedAt || 0, today: { started: t.started, done: t.done, mins: t.mins, q: t.q || 0, ok: t.ok || 0, alerted: t.alerted } });
      }
      if (stale.length) await db.runTransaction(async tx => { const ref = parentsC().doc(r.uid), s = await tx.get(ref); if (s.exists) tx.update(ref, { children: (s.data().children || []).filter(x => !stale.includes(x)) }); });
      return ok({ children: out, subs: (q.subs || []).length });
    },
    pushSubscribe: async r => {
      if (!db) return NODB;
      if (!L.push.take(r.uid)) return err(429, 'Bahut baar try kiya. Thodi der baad.');
      const sub = C.cleanSub(r.body && r.body.sub); if (!sub) return err(400, 'Notification ki detail sahi nahi hai.');
      let n = 0;
      await db.runTransaction(async tx => {
        const ref = parentsC().doc(r.uid), s = await tx.get(ref), d = s.exists ? s.data() : { children: [], subs: [] };
        const subs = [...(d.subs || []).filter(x => x.endpoint !== sub.endpoint), sub].slice(-5); n = subs.length;
        if (s.exists) tx.update(ref, { subs }); else tx.set(ref, { children: [], subs });
      });
      return ok({ subs: n });
    },
    pushUnsubscribe: async r => {
      if (!db) return NODB;
      const ep = String(r.body && r.body.endpoint || '');
      await db.runTransaction(async tx => { const ref = parentsC().doc(r.uid), s = await tx.get(ref); if (s.exists) tx.update(ref, { subs: (s.data().subs || []).filter(x => x.endpoint !== ep) }); });
      return ok({ ok: true });
    },

    // child phone: "I started" / "I finished"
    event: async r => {
      if (!db) return NODB;
      if (!L.event.take(r.uid)) return err(429, 'Bahut baar.');
      const b = r.body || {}; if (b.type !== 'started' && b.type !== 'done') return err(400, 'Event sahi nahi hai.');
      let fire = null;
      await db.runTransaction(async tx => {
        const ref = plans().doc(r.uid), s = await tx.get(ref); if (!s.exists) return;
        const d = s.data(), t = C.applyEvent(d, b, now());
        if (b.type === 'done' && !t.summarySent && (d.parents || []).length) { t.summarySent = true; fire = { plan: d.plan, parents: d.parents, mins: t.mins, q: t.q, ok: t.ok }; }
        tx.update(ref, { today: t });
      });
      if (fire) await pushTo(fire.parents, C.donePayload(fire.plan, fire.mins, fire.q, fire.ok));
      return ok({ ok: true });
    },

    // called every minute by a free cron service (and by a timer while the server is awake)
    tickCore: async (ms) => {
      if (!db || !webpush) return { checked: 0, alerted: 0 };
      ms = ms || now(); const snap = await plans().where('plan.on', '==', true).limit(500).get(); let checked = 0, alerted = 0;
      for (const doc of snap.docs) {
        checked++; if (!C.needsAlert(doc.data(), ms)) continue;
        let fire = null;
        await db.runTransaction(async tx => { const s = await tx.get(doc.ref), cur = s.data(); if (!C.needsAlert(cur, ms)) return; tx.update(doc.ref, { today: { ...C.todayOf(cur, C.istNow(ms).day), alerted: true } }); fire = { plan: cur.plan, parents: cur.parents }; });
        if (fire) { alerted++; await pushTo(fire.parents, C.alertPayload(fire.plan)); }
      }
      return { checked, alerted };
    },
    tick: async r => {
      const key = (r.headers && r.headers['x-cron-key']) || (r.query && r.query.key) || '';
      if (!env.STUDY_CRON_KEY || !C.safeEq(key, env.STUDY_CRON_KEY)) return err(403, 'Key galat hai.');
      if (!db || !webpush) return err(503, 'FIREBASE_SERVICE_ACCOUNT ya VAPID keys nahi lagi.');
      return ok(await handlers.tickCore());
    }
  };
  return handlers;
}
module.exports = { make };
