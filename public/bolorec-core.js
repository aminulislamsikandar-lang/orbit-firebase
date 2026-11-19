// public/bolorec-core.js - pure helpers for Bolo "Saath me bolo" (the child's voice is recorded for the parent; nothing is recognised).
// No DOM, no network. The browser loads it as window.BOLOREC_CORE; server.js / bolorec-routes.js / tests load it with require().
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.BOLOREC_CORE = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  const TTL_MS = 2 * 3600 * 1000;      // a recording is kept for 2 hours
  const MIN_VOICE_MS = 250;            // this much sound inside a letter's window counts as "spoke"
  const GAP_MS = 1200;                 // quiet time after a letter's clip, still part of that letter's window
  const LEAD_MS = 350;                 // bolo.js starts the clip this long after it shows the letter
  const MAX_LETTERS = 60, MAX_AUDIO_B64 = 3200000, MAX_SESSION_MS = 15 * 60 * 1000;
  const MIMES = { 'audio/webm': 'webm', 'audio/mp4': 'mp4', 'audio/ogg': 'ogg' };

  const okCode = c => typeof c === 'string' && /^[A-HJ-NP-Z2-9]{8}$/.test(c);
  const okId = id => typeof id === 'string' && /^\d{13}-[a-z0-9]{6}$/.test(id);
  const newId = (now, rnd) => String(now).padStart(13, '0') + '-' + Array.from({ length: 6 }, () => 'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor((rnd || Math.random)() * 36)]).join('');
  const idTime = id => (okId(id) ? +id.slice(0, 13) : 0);
  const expired = (id, now) => !okId(id) || now - idTime(id) >= TTL_MS;
  const cleanMime = m => { const b = String(m || '').split(';')[0].trim().toLowerCase(); return MIMES[b] ? b : ''; };
  const extOf = m => MIMES[cleanMime(m)] || '';
  const windowMs = clipMs => LEAD_MS + Math.max(0, Math.min(10000, +clipMs || 0)) + GAP_MS;   // how long one letter's window lasts
  const spoke = voicedMs => (+voicedMs || 0) >= MIN_VOICE_MS;
  const threshold = ambientPeak => Math.max(0.02, (+ambientPeak || 0) * 2.5);   // RMS level that counts as a voice

  const int = (v, lo, hi) => { v = Math.round(+v); return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : lo; };
  // The report that travels with a recording: how many letters, and for each letter when it started (ms from the recording start) and whether any sound came.
  function cleanReport(r) {
    r = r && typeof r === 'object' ? r : {};
    const src = Array.isArray(r.letters) ? r.letters.slice(0, MAX_LETTERS) : [];
    const letters = src.map(x => x && typeof x === 'object' ? ({ i: int(x.i, 0, 999), l: String(x.l == null ? '' : x.l).replace(/[<>&"']/g, '').slice(0, 8), t: int(x.t, 0, MAX_SESSION_MS), s: x.s ? 1 : 0 }) : null).filter(Boolean);
    return { total: int(r.total, letters.length, MAX_LETTERS), letters };
  }
  const silentOf = rep => (rep && rep.letters || []).filter(x => !x.s);
  return { TTL_MS, MIN_VOICE_MS, GAP_MS, LEAD_MS, MAX_LETTERS, MAX_AUDIO_B64, MAX_SESSION_MS, okCode, okId, newId, idTime, expired, cleanMime, extOf, windowMs, spoke, threshold, cleanReport, silentOf };
});
