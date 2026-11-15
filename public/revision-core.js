// public/revision-core.js - revision schedule + topic strength (Phase 3 basics Tasks 16/17/19, used by the Phase 6 concept map).
// One record per topic of a chapter: { stage, hist:[last scores], r, w, last, at, next }. Pure functions, no DOM, so tests can run them.
// Recall scores a whole chapter explanation, so the unit here is the TOPIC (Task 31), not a single question.
(function (root) {
  'use strict';
  const DAY = 86400000, PASS = 60, GAP_DAYS = [1, 3, 7, 30], MAX_STAGE = 4, KEEP_HIST = 5;
  const num = x => typeof x === 'number' && isFinite(x);

  // Task 17 + 19. score >= PASS counts as right. Right: next review after 1, 3, 7, then 30 days, stage goes up (max 4).
  // Wrong: stage goes ONE step back (not below 0) and the topic comes back tomorrow.
  function update(rec, score, now) {
    const r = rec && num(rec.stage) ? rec : { stage: 0, hist: [], r: 0, w: 0 };
    const s = Math.max(0, Math.min(100, Math.round(Number(score) || 0)));
    const ok = s >= PASS, gap = ok ? GAP_DAYS[Math.min(r.stage, GAP_DAYS.length - 1)] : 1;
    return {
      stage: ok ? Math.min(r.stage + 1, MAX_STAGE) : Math.max(0, r.stage - 1),
      hist: (Array.isArray(r.hist) ? r.hist : []).filter(num).concat([s]).slice(-KEEP_HIST),
      r: (r.r || 0) + (ok ? 1 : 0), w: (r.w || 0) + (ok ? 0 : 1),
      last: s, at: now, next: now + gap * DAY
    };
  }
  // Task 32: strength = average of the last (up to 5) scores, 0-100, or null when the topic was never scored.
  function strength(rec) {
    const h = rec && Array.isArray(rec.hist) ? rec.hist.filter(num) : [];
    return h.length ? Math.round(h.reduce((a, b) => a + b, 0) / h.length) : null;
  }
  // Task 33 colours: good >= 80 (green), ok 50-79 (yellow), weak < 50 (red), new = never scored (grey).
  function band(avg) { return avg === null || avg === undefined ? 'new' : avg >= 80 ? 'good' : avg >= 50 ? 'ok' : 'weak'; }
  // Task 20: how well a whole chapter is known = average of its last 5 Recall scores (the attempts list: [{ k:'course|ch', t:score, at }]), or null.
  function chapterStrength(items, key) {
    const h = (Array.isArray(items) ? items : []).filter(a => a && a.k === key && num(a.t)).sort((p, q) => p.at - q.at).slice(-KEEP_HIST).map(a => a.t);
    return h.length ? Math.round(h.reduce((a, b) => a + b, 0) / h.length) : null;
  }
  const isDue = (rec, now) => !!rec && num(rec.next) && rec.next <= now;
  // Union of two topic-record maps (this phone + the account): per topic the record with the later `at` wins.
  function mergeTopics(a, b) {
    const out = {};
    [a, b].forEach(m => { if (m && typeof m === 'object') Object.keys(m).forEach(k => { const v = m[k]; if (v && num(v.at) && num(v.stage) && (!out[k] || v.at >= out[k].at)) out[k] = v; }); });
    return out;
  }
  // Due topics, most overdue first: [{ key, rec }]
  function dueList(map, now) {
    return Object.keys(map || {}).filter(k => isDue(map[k], now)).sort((x, y) => map[x].next - map[y].next).map(k => ({ key: k, rec: map[k] }));
  }
  root.REVISION = { DAY, PASS, GAP_DAYS, MAX_STAGE, update, strength, chapterStrength, band, isDue, mergeTopics, dueList };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.REVISION;
})(typeof window !== 'undefined' ? window : globalThis);
