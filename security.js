// security.js - response headers, CSP violation reports and the per-student rate limiter for the Render server.
// Plain helpers (no Express app, no Firebase) so tests/security.test.js can run them directly. The website itself is served by Firebase Hosting:
// its headers (including the Content-Security-Policy) live in firebase.json, see docs/SECURITY.md.
'use strict';

// Headers for every response of this server (API and the static fallback).
function securityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Permissions-Policy', 'camera=(), geolocation=(), payment=(), microphone=(self)');
  // Answers, video plans and signed video links are personal: never keep them in a shared cache. (Question list and ping stay cacheable.)
  if (/^\/api\//.test(req.path || '') && !/^\/api\/(questions|ping)$/.test(req.path)) res.setHeader('Cache-Control', 'no-store');
  next();
}

// Rate-limit key: the logged-in student, not the IP. A school's WiFi (and any proxy in front of the server) gives many students one IP.
const rateKey = req => (req && req.user && req.user.uid ? 'u:' + req.user.uid : 'ip:' + String((req && req.ip) || ''));

// "max requests per windowMs per key". hit(key) records a request and returns true when the key is over the limit.
// Old keys are pruned regularly, so the table never grows without bound.
function createLimiter(max, windowMs = 60000, now = Date.now) {
  const hits = new Map();
  function hit(key) {
    const t = now(), arr = (hits.get(key) || []).filter(x => t - x < windowMs);
    arr.push(t); hits.set(key, arr);
    return arr.length > max;
  }
  function prune() {
    const t = now();
    for (const [k, arr] of hits) if (!arr.length || t - arr[arr.length - 1] >= windowMs) hits.delete(k);
    return hits.size;
  }
  const timer = setInterval(prune, Math.max(windowMs, 60000));
  if (timer.unref) timer.unref();
  return { hit, prune, size: () => hits.size };
}

// POST /csp-report: browsers send a report here when the page breaks the Content-Security-Policy (we run it in Report-Only mode first).
// One short log line per report, no query strings, no line breaks, at most maxPerMinute lines a minute (a broken page must not flood the log).
function cspReport({ log = console.warn, maxPerMinute = 30, now = Date.now } = {}) {
  let start = 0, n = 0;
  const clean = v => String(v == null ? '' : v).split(/[?#]/)[0].replace(/[\r\n\t]+/g, ' ').slice(0, 120);
  return (req, res) => {
    res.status(204).end();
    try {
      const t = now(); if (t - start >= 60000) { start = t; n = 0; }
      const raw = req.body, list = Array.isArray(raw) ? raw : [raw];                  // old format: {"csp-report": {...}}   new format: [{type, body}]
      for (const item of list.slice(0, 5)) {
        const r = item && typeof item === 'object' ? (item['csp-report'] || item.body || item) : null;
        if (!r || typeof r !== 'object') continue;
        const directive = clean(r['effective-directive'] || r.effectiveDirective || r['violated-directive'] || r.violatedDirective);
        const blocked = clean(r['blocked-uri'] || r.blockedURL || r.blockedUri), doc = clean(r['document-uri'] || r.documentURL || r.documentUri);
        if (!directive && !blocked) continue;
        if (++n > maxPerMinute) return;
        log('CSP violation: ' + directive + ' blocked=' + (blocked || '-') + ' page=' + (doc || '-'));
      }
    } catch (e) { /* never fail on a report */ }
  };
}

module.exports = { securityHeaders, rateKey, createLimiter, cspReport };
