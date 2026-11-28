// public/sandesh-core.js - pure helpers for "Sandesh": a mentor sends a message that appears on the child's screen for a time the mentor sets.
// No DOM, no network. The browser loads it as window.SANDESH_CORE; tests load it with require().
//   message  = { from, fromName, ins (instruction), q (question, optional), aud (voice, a data: URL, optional), secs (how long it stays), at }
//   The child's phone writes shownAt (the moment it first appeared) and doneAt once; the countdown is shownAt + secs, so a reload never restarts it.
//   reply    = { kind: 'photo' | 'voice', data (a data: URL), at }, written by the child's phone under the message.
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SANDESH_CORE = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  const MAX_INS = 600, MAX_Q = 1200, MAX_NAME = 40;
  const MAX_DATA = 380000;                    // characters of a data: URL (about 280 KB of sound or picture); a Firestore document is 1 MB
  const MAX_REC_S = 60, MAX_REPLY_S = 45;     // longest voice the mentor / the child can record
  const SECS = [60, 120, 300, 600, 900, 1800];                         // what the mentor can choose: 1, 2, 5, 10, 15, 30 minutes
  const DEFAULT_SECS = 300;
  const VALID_MS = 2 * 3600 * 1000;           // a message nobody saw within 2 hours is missed: it is not shown any more
  const KEEP_MS = 48 * 3600 * 1000;           // the child's phone deletes messages (and replies) older than this
  const MIMES = ['audio/webm', 'audio/mp4', 'audio/ogg'];

  const str = (v, n) => String(v == null ? '' : v).replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').slice(0, n);
  const clean = (v, n) => str(v, n).trim();
  const secsOf = v => { v = Math.round(+v); return SECS.includes(v) ? v : DEFAULT_SECS; };
  const okId = id => /^[0-9]{13}-[a-z0-9]{6}$/.test(String(id || ''));
  const newId = (now, rnd) => { const a = 'abcdefghijklmnopqrstuvwxyz0123456789'; let s = ''; for (let i = 0; i < 6; i++) s += a[Math.floor((typeof rnd === 'function' ? rnd() : Math.random()) * a.length) % a.length]; return String(Math.floor(now == null ? Date.now() : now)).padStart(13, '0') + '-' + s; };
  // A data: URL we are willing to store and play. kind: 'audio' | 'photo'.
  const okData = (d, kind) => {
    if (typeof d !== 'string' || d.length > MAX_DATA || d.length < 30) return false;
    if (kind === 'photo') return /^data:image\/jpeg;base64,[A-Za-z0-9+\/=]+$/.test(d);
    return /^data:audio\/(webm|mp4|ogg)(;codecs=[a-z0-9.,]+)?;base64,[A-Za-z0-9+\/=]+$/.test(d);
  };
  const cleanMime = m => { m = String(m || '').split(';')[0].trim().toLowerCase(); return MIMES.includes(m) ? m : ''; };
  // What the mentor's phone writes. Returns null when there is nothing to send (no text, no question, no voice) or the voice is not acceptable.
  function build(o, now) {
    o = o && typeof o === 'object' ? o : {};
    const ins = clean(o.ins, MAX_INS), q = clean(o.q, MAX_Q), aud = o.aud ? String(o.aud) : '';
    if (aud && !okData(aud, 'audio')) return null;
    if (!ins && !q && !aud) return null;
    const m = { from: String(o.from || ''), fromName: clean(o.fromName, MAX_NAME) || 'Mentor', secs: secsOf(o.secs), at: Math.floor(now == null ? Date.now() : now) };
    if (ins) m.ins = ins;
    if (q) m.q = q;
    if (aud) m.aud = aud;
    return m;
  }
  // Seconds left on the countdown. Before the child has seen it the full time is left; null once it is over or the message is closed.
  function left(m, now) {
    if (!m || typeof m !== 'object') return null;
    now = now == null ? Date.now() : now;
    if (+m.doneAt > 0) return null;
    const secs = secsOf(m.secs);
    if (!(+m.shownAt > 0)) return now - (+m.at || 0) > VALID_MS ? null : secs;
    const r = Math.ceil((+m.shownAt + secs * 1000 - now) / 1000);
    return r > 0 ? Math.min(r, secs) : null;
  }
  // Which message the child's phone shows now: the oldest one that is still running (or not yet seen and not missed).
  function pick(list, now) {
    return (Array.isArray(list) ? list : []).filter(m => m && okId(m.id) && left(m, now) != null).sort((a, b) => (+a.at || 0) - (+b.at || 0) || (a.id < b.id ? -1 : 1))[0] || null;
  }
  const old = (m, now) => !m || (now == null ? Date.now() : now) - (+m.at || 0) > KEEP_MS;
  const mmss = s => { s = Math.max(0, Math.round(+s) || 0); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  const secsTxt = s => s < 60 ? s + ' sec' : (s % 60 ? mmss(s) + ' min' : (s / 60) + ' min');
  // For the mentor's list: what happened to a message.
  function stateOf(m, now) {
    now = now == null ? Date.now() : now;
    if (!m) return { k: 'none', t: '' };
    if (+m.shownAt > 0) return { k: 'seen', t: 'Bachche ne dekha' };
    if (now - (+m.at || 0) > VALID_MS) return { k: 'missed', t: 'Bachcha dekh nahi paya (time nikal gaya)' };
    return { k: 'wait', t: 'Bachche ke phone par aane ka intezaar' };
  }
  return { MAX_INS, MAX_Q, MAX_NAME, MAX_DATA, MAX_REC_S, MAX_REPLY_S, SECS, DEFAULT_SECS, VALID_MS, KEEP_MS, MIMES, clean, secsOf, okId, newId, okData, cleanMime, build, left, pick, old, mmss, secsTxt, stateOf };
});
