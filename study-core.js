'use strict';
// Orbit "Padhai ka time" stage 2: the plain rules behind the parent alerts (no Firebase, no network, so they can be tested alone).
//  - a plan is cleaned the same way as in public/studytime.js (tests keep the two in step)
//  - "today" is always counted in Indian time (IST, +5:30)
//  - a parent gets at most TWO pushes per child per day: "study time passed and not started" (10 minutes grace, only inside a 3 hour window) and "done"
const crypto = require('crypto');

const IST_MIN = 330, GRACE_MIN = 10, WINDOW_MIN = 180, CODE_TTL_MS = 15 * 60 * 1000;
const MINS = [10, 15, 20, 30, 45, 60];
const SUBJECTS = ['ginti', 'eng', 'asm', 'evs'], DEFAULT_SUBJ = ['ginti', 'eng', 'evs'];
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   // no 0, O, 1, I: easy to read out on the phone
const pad = n => String(n).padStart(2, '0');

function istNow(ms) {
  const d = new Date(ms + IST_MIN * 60000);
  return { day: d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()), dow: d.getUTCDay(), min: d.getUTCHours() * 60 + d.getUTCMinutes() };
}
const minOf = t => +t.slice(0, 2) * 60 + +t.slice(3);
const fmtClock = t => { const h = +t.slice(0, 2); return ((h + 11) % 12 + 1) + ':' + t.slice(3) + (h < 12 ? ' AM' : ' PM'); };

function cleanPlan(p) {
  const d = { on: false, name: '', time: '17:00', mins: 20, days: [0, 1, 2, 3, 4, 5, 6], course: '', ch: 0, cls: 1, subj: DEFAULT_SUBJ.slice() };
  p = p && typeof p === 'object' ? p : {};
  d.on = p.on === true;
  d.name = String(p.name || '').replace(/\s+/g, ' ').trim().slice(0, 30);
  if (typeof p.time === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(p.time)) d.time = p.time;
  if (MINS.includes(+p.mins)) d.mins = +p.mins;
  if (Array.isArray(p.days)) d.days = [...new Set(p.days.map(Number).filter(x => Number.isInteger(x) && x >= 0 && x <= 6))].sort();
  d.course = String(p.course || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 40);
  d.ch = Number.isInteger(+p.ch) && +p.ch >= 0 && +p.ch <= 99 ? +p.ch : 0;
  if ([1, 2, 3].includes(+p.cls)) d.cls = +p.cls;
  if (Array.isArray(p.subj)) { const k = SUBJECTS.filter(x => p.subj.includes(x)); if (k.length) d.subj = k; }   // canonical order, never empty
  return d;
}
const newCode = () => { let s = ''; for (let i = 0; i < 6; i++) s += CODE_CHARS[crypto.randomInt(CODE_CHARS.length)]; return s; };
const normCode = c => String(c == null ? '' : c).trim().toUpperCase().replace(/[\s-]/g, '');
const validCode = c => /^[A-HJ-NP-Z2-9]{6}$/.test(c);

// A browser PushSubscription. Only the three fields web-push needs are kept; the address must be https.
function cleanSub(s) {
  if (!s || typeof s !== 'object' || typeof s.endpoint !== 'string' || s.endpoint.length > 600 || !/^https:\/\//.test(s.endpoint)) return null;
  const k = s.keys; if (!k || typeof k.p256dh !== 'string' || typeof k.auth !== 'string' || k.p256dh.length > 200 || k.auth.length > 100) return null;
  if (!/^[A-Za-z0-9_-]+=*$/.test(k.p256dh) || !/^[A-Za-z0-9_-]+=*$/.test(k.auth)) return null;
  return { endpoint: s.endpoint, keys: { p256dh: k.p256dh, auth: k.auth } };
}

// What the server remembers about today for one child (reset when the Indian date changes).
const freshDay = day => ({ day, started: false, done: false, mins: 0, q: 0, ok: 0, alerted: false, summarySent: false });
const todayOf = (doc, day) => (doc && doc.today && doc.today.day === day ? doc.today : freshDay(day));

function applyEvent(doc, ev, ms) {
  const day = istNow(ms).day, t = { ...todayOf(doc, day) };
  if (ev && ev.type === 'started') t.started = true;
  else if (ev && ev.type === 'done') { t.started = true; t.done = true; const m = Math.round(+ev.mins); t.mins = Number.isFinite(m) ? Math.max(0, Math.min(120, m)) : 0;
    const q = Math.round(+ev.q), k = Math.round(+ev.ok); t.q = Number.isFinite(q) ? Math.max(0, Math.min(60, q)) : 0; t.ok = Number.isFinite(k) ? Math.max(0, Math.min(t.q, k)) : 0; }
  return t;
}

// Should the parent be told "not started"? Only once a day, only for a switched-on plan, only on a study day,
// from 10 minutes after the time until 3 hours later (a server that woke up late at night stays quiet).
function needsAlert(doc, ms) {
  if (!doc || !doc.plan || doc.plan.on !== true || !(doc.parents || []).length) return false;
  const n = istNow(ms), t = todayOf(doc, n.day), at = minOf(doc.plan.time);
  if (!doc.plan.days.includes(n.dow) || t.started || t.done || t.alerted) return false;
  return n.min >= at + GRACE_MIN && n.min <= at + GRACE_MIN + WINDOW_MIN;
}
const who = name => (name && String(name).trim()) || 'Bachha';
const alertPayload = plan => ({ title: 'Padhai ka time', body: who(plan.name) + ' ka padhai ka time ' + fmtClock(plan.time) + ' ho gaya, abhi tak Orbit mein shuru nahi hua (ya phone offline hai).', tag: 'study-alert', url: '/#study' });
const donePayload = (plan, mins, q, ok) => ({ title: 'Padhai poori hui', body: who(plan.name) + ' ne aaj ' + (mins > 0 ? mins + ' minute ' : '') + 'padhai poori ki' + (q > 0 ? ', ' + q + ' sawaal mein ' + ok + ' sahi.' : '.'), tag: 'study-done', url: '/#study' });

function safeEq(a, b) {
  const x = Buffer.from(String(a || '')), y = Buffer.from(String(b || ''));
  return x.length === y.length && x.length > 0 && crypto.timingSafeEqual(x, y);
}
module.exports = { SUBJECTS, IST_MIN, GRACE_MIN, WINDOW_MIN, CODE_TTL_MS, MINS, istNow, minOf, fmtClock, cleanPlan, newCode, normCode, validCode, cleanSub, freshDay, todayOf, applyEvent, needsAlert, alertPayload, donePayload, safeEq };
