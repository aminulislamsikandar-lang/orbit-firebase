'use strict';
/* narration.js - generate-once narration for Orbit lessons.
 *
 * Flow per segment: hash(text, language, voice, speed) -> object key -> already in B2? reuse : Sonex -> upload -> verify size.
 * The hash is part of the key (audio/generated/<folder>/<lesson>/<lang>/step-01-<hash12>.mp3), so
 *  - unchanged text never calls Sonex again (even after a server restart or from another admin tab),
 *  - changed text gets a NEW object and the old one is never overwritten,
 *  - only the changed segments are regenerated.
 * Firestore is NOT touched here: the admin browser saves the metadata the server returns (see firestore.rules, narration/{lessonId}).
 */
const crypto = require('crypto');

const MAX_SEGMENTS = 12;          // same cap as video plans; keeps one request well inside Render's time limit
const LESSON_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,119}$/;
const FOLDER_RE = /^[a-z0-9][a-z0-9-]{0,39}(\/[a-z0-9][a-z0-9-]{0,39}){0,4}$/;
const KEY_RE = /^audio\/(generated|narration)\/[a-z0-9][a-z0-9._-]*(\/[a-z0-9][a-z0-9._-]*)*\.mp3$/;
const NARRATION_VERSION = 'v1';

class NarrationError extends Error {
  constructor(code, message, status) { super(message); this.name = 'NarrationError'; this.code = code; this.status = status || 400; }
}

const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
const normText = t => String(t == null ? '' : t).normalize('NFC').replace(/\s+/g, ' ').trim();

function contentHash(p) {
  return crypto.createHash('sha256')
    .update(JSON.stringify([NARRATION_VERSION, 'sonex', p.code, p.voiceId, p.speed, normText(p.text)]))
    .digest('hex');
}

function audioKey(p) {
  const base = ['audio', 'generated'];
  if (p.folder) base.push(p.folder);
  base.push(slug(p.lessonId), p.language, 'step-' + String(p.index + 1).padStart(2, '0') + '-' + p.hash.slice(0, 12) + '.mp3');
  return base.join('/');
}

const isNarrationKey = key => typeof key === 'string' && key.length <= 300 && !key.includes('..') && KEY_RE.test(key);
const keyBelongsToLesson = (key, lessonId) => isNarrationKey(key) && ('/' + key).includes('/' + slug(lessonId) + '/');

/* sonex: { synthesize, LANG_CODE }   store: { head(key) -> {size}|null, put(key, buffer) } */
function createNarration(deps) {
  const sonex = deps.sonex, store = deps.store, log = deps.log || (() => {});
  const inflight = new Map();      // key -> Promise, so two clicks / two admins never pay Sonex twice for the same clip

  async function putWithRetry(key, buf) {
    try { await store.put(key, buf); }
    catch (e) { await store.put(key, buf); }     // one retry; a second failure propagates
  }

  async function makeOne(key, seg, ctx) {
    const existing = await store.head(key);
    if (existing && existing.size > 0 && !ctx.force) return { cached: true, bytes: existing.size, voiceName: null };
    const r = await sonex.synthesize({ text: seg.text, language: ctx.language, voiceId: ctx.voiceId, speed: ctx.speed });
    try { await putWithRetry(key, r.audio); }
    catch (e) { log('B2 upload failed', key, e && e.name); throw new NarrationError('UPLOAD_FAILED', 'Audio banayi gayi par Backblaze mein upload nahi ho payi. Dobara try karo.', 502); }
    const check = await store.head(key).catch(() => null);
    if (!check || check.size !== r.bytes) throw new NarrationError('UPLOAD_VERIFY', 'Upload ke baad file check nahi ho payi. Dobara try karo.', 502);
    return { cached: false, bytes: r.bytes, voiceName: r.voice.name };
  }

  function once(flightKey, seg, ctx, key) {
    if (inflight.has(flightKey)) return inflight.get(flightKey);
    const p = makeOne(key, seg, ctx).finally(() => inflight.delete(flightKey));
    inflight.set(flightKey, p);
    return p;
  }

  /* input: { lessonId, folder?, language, voiceId?, speed?, segments:[{index?, text}] }
   * returns { status:'ready'|'failed', language, voiceId, speed, segments:[{index, status, audioKey, contentHash, bytes, cached, error?, code?}] } */
  async function generate(input) {
    input = input || {};
    if (!LESSON_RE.test(String(input.lessonId || ''))) throw new NarrationError('BAD_INPUT', 'Lesson code galat hai.');
    const folder = input.folder ? String(input.folder) : '';
    if (folder && !FOLDER_RE.test(folder)) throw new NarrationError('BAD_INPUT', 'Folder naam sirf a-z, 0-9 aur - ho sakta hai (jaise class-7/mathematics).');
    const code = sonex.LANG_CODE[String(input.language || '').toLowerCase()];
    if (!code) throw new NarrationError('BAD_INPUT', 'Language en, hi, as, bn ya hg honi chahiye.');
    const language = String(input.language).toLowerCase();
    const voiceId = String(input.voiceId || sonex.defaultVoiceId || '').trim();
    if (!voiceId) throw new NarrationError('BAD_INPUT', 'Voice chuno (ya Render mein SONEX_DEFAULT_VOICE_ID set karo).');
    const segs = input.segments;
    if (!Array.isArray(segs) || !segs.length) throw new NarrationError('BAD_INPUT', 'Kam se kam ek narration segment chahiye.');
    if (segs.length > MAX_SEGMENTS) throw new NarrationError('BAD_INPUT', 'Ek baar mein sirf ' + MAX_SEGMENTS + ' segment banao.');
    let speed = Number(input.speed === undefined || input.speed === null || input.speed === '' ? 1 : input.speed);
    if (!Number.isFinite(speed)) throw new NarrationError('BAD_INPUT', 'Speed ek number honi chahiye.');
    speed = Math.round(speed * 100) / 100;      // same rounding as sonex.js, so the hash matches what is really sent

    const seen = new Set();
    const items = segs.map((s, n) => {
      const index = Number.isInteger(s && s.index) ? s.index : n;
      if (index < 0 || index > 98 || seen.has(index)) throw new NarrationError('BAD_INPUT', 'Segment index galat ya repeat hai.');
      seen.add(index);
      return { index, text: normText(s && s.text) };
    });

    const ctx = { language, voiceId, speed, force: input.force === true };   // force = admin pressed Regenerate: make a new take even if the same clip exists
    const out = [];
    let stopped = null;
    for (const it of items) {
      const base = { index: it.index };
      if (stopped) { out.push(Object.assign(base, { status: 'skipped', error: 'Pichle error ki wajah se roka gaya.', code: stopped })); continue; }
      if (!it.text) { out.push(Object.assign(base, { status: 'failed', code: 'BAD_INPUT', error: 'Is segment ka text khali hai.' })); continue; }
      const hash = contentHash({ code, voiceId, speed, text: it.text });
      const key = audioKey({ folder, lessonId: input.lessonId, language, index: it.index, hash });
      try {
        const r = await once(ctx.force ? key + '#force' : key, it, ctx, key);
        out.push(Object.assign(base, { status: 'ready', audioKey: key, contentHash: hash, bytes: r.bytes, cached: r.cached, voiceName: r.voiceName || undefined }));
      } catch (e) {
        log('segment failed', it.index, e && e.code);
        out.push(Object.assign(base, { status: 'failed', code: e.code || 'ERROR', error: e.code ? e.message : 'Narration nahi ban payi.' }));
        if (e.fatal) stopped = e.code;
      }
    }
    return { status: out.every(s => s.status === 'ready') ? 'ready' : 'failed', language, voiceId, speed, segments: out };
  }

  return { generate };
}

module.exports = { createNarration, NarrationError, contentHash, audioKey, isNarrationKey, keyBelongsToLesson, slug, MAX_SEGMENTS };
