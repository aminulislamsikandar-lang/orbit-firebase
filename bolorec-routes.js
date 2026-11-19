'use strict';
// Bolo "Saath me bolo": the child's recording goes to the parent's phone and is deleted after 2 hours (bolorec-core.js TTL_MS).
// make({ db, store, now }) returns plain async handlers  (req) => ({ status, body })  with req = { uid, body }. server.js turns them into Express routes.
// db = Firestore (firebase-admin) or null. store = { put(key, buf), get(key) -> buf|null, list(prefix) -> [key], del(key) } (Backblaze B2, or memory when B2 is not set).
// Who may do what (the code is never enough on its own, the login is checked too):
//   upload  - only the child's own login: kidLinks/{code}.kidUid == uid
//   list/get - only a parent who joined that code: kidLinks/{code}/parents/{uid} exists
const C = require('./public/bolorec-core.js');

function make({ db, store, now }) {
  now = now || Date.now;
  const err = (status, error, code) => ({ status, body: code ? { error, code } : { error } });
  const ok = body => ({ status: 200, body });
  const NODB = err(503, 'Server par FIREBASE_SERVICE_ACCOUNT nahi laga hai, isliye recording abhi band hai.', 'no_db');
  const lim = (max, win) => { const m = new Map(); return k => { const t = now(), a = (m.get(k) || []).filter(x => t - x < win); if (a.length >= max) { m.set(k, a); return false; } a.push(t); m.set(k, a); if (m.size > 5000) m.delete(m.keys().next().value); return true; }; };
  const L = { up: lim(30, 3600000), rd: lim(120, 3600000) };
  const pre = code => 'bolo-rec/' + code + '/';

  async function isKid(code, uid) { const d = await db.collection('kidLinks').doc(code).get(); return !!(d && d.exists && d.data().kidUid === uid); }
  async function isParent(code, uid) { const d = await db.collection('kidLinks').doc(code).collection('parents').doc(uid).get(); return !!(d && d.exists); }

  let lastSweep = 0;
  async function sweep(force) {
    if (!force && now() - lastSweep < 5 * 60 * 1000) return 0;
    lastSweep = now(); let n = 0;
    for (const k of await store.list('bolo-rec/')) {
      const id = (/\/([^/]+)\.(?:bin|json)$/.exec(k) || [])[1];
      if (!id || C.expired(id, now())) { await store.del(k); n++; }
    }
    return n;
  }

  async function upload(req) {
    const uid = req.uid, b = req.body || {};
    if (!uid) return err(401, 'Pehle log in karo.');
    if (!db) return NODB;
    if (!C.okCode(b.code)) return err(400, 'Code sahi nahi hai.');
    const mime = C.cleanMime(b.mime);
    if (!mime) return err(400, 'Recording ka format sahi nahi hai.');
    if (typeof b.audio !== 'string' || !b.audio || b.audio.length > C.MAX_AUDIO_B64 || !/^[A-Za-z0-9+/]+=*$/.test(b.audio)) return err(400, 'Recording bahut badi ya galat hai.');
    if (!(await isKid(b.code, uid))) return err(403, 'Ye code is bachche ka nahi hai.');
    if (!L.up(uid)) return err(429, 'Bahut zyada recordings. Thodi der baad try karo.');
    const buf = Buffer.from(b.audio, 'base64');
    if (buf.length < 200) return err(400, 'Recording khaali hai.');
    const rep = C.cleanReport(b.report), id = C.newId(now());
    await store.put(pre(b.code) + id + '.bin', buf);
    await store.put(pre(b.code) + id + '.json', Buffer.from(JSON.stringify({ at: now(), mime, bytes: buf.length, ...rep })));
    sweep().catch(() => {});
    return ok({ id, expiresAt: now() + C.TTL_MS });
  }

  async function list(req) {
    const uid = req.uid, code = (req.body || {}).code;
    if (!uid) return err(401, 'Pehle log in karo.');
    if (!db) return NODB;
    if (!C.okCode(code)) return err(400, 'Code sahi nahi hai.');
    if (!L.rd(uid)) return err(429, 'Thodi der baad try karo.');
    if (!(await isParent(code, uid))) return err(403, 'Is bachche se juda parent hi recording sun sakta hai.');
    sweep().catch(() => {});
    const ids = (await store.list(pre(code))).map(k => (/\/([^/]+)\.json$/.exec(k) || [])[1]).filter(id => C.okId(id) && !C.expired(id, now())).sort().reverse().slice(0, 10);
    const items = [];
    for (const id of ids) {
      const raw = await store.get(pre(code) + id + '.json'); if (!raw) continue;
      let m; try { m = JSON.parse(raw.toString('utf8')); } catch (e) { continue; }
      items.push({ id, at: C.idTime(id), expiresAt: C.idTime(id) + C.TTL_MS, total: m.total, letters: m.letters, silent: C.silentOf(m).length });
    }
    return ok({ items, ttlMin: C.TTL_MS / 60000 });
  }

  async function get(req) {
    const uid = req.uid, b = req.body || {};
    if (!uid) return err(401, 'Pehle log in karo.');
    if (!db) return NODB;
    if (!C.okCode(b.code) || !C.okId(b.id)) return err(400, 'Recording ki detail sahi nahi hai.');
    if (!L.rd(uid)) return err(429, 'Thodi der baad try karo.');
    if (!(await isParent(b.code, uid))) return err(403, 'Is bachche se juda parent hi recording sun sakta hai.');
    if (C.expired(b.id, now())) return err(410, 'Ye recording 2 ghante baad hat gayi.', 'expired');
    const meta = await store.get(pre(b.code) + b.id + '.json'), buf = await store.get(pre(b.code) + b.id + '.bin');
    if (!meta || !buf) return err(404, 'Recording nahi mili.');
    let m = {}; try { m = JSON.parse(meta.toString('utf8')); } catch (e) {}
    return ok({ mime: C.cleanMime(m.mime) || 'audio/webm', audio: buf.toString('base64'), expiresAt: C.idTime(b.id) + C.TTL_MS });
  }

  return { upload, list, get, sweep };
}
module.exports = { make };
