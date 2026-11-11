'use strict';
/* sonex.js - Sonex Labs text-to-speech for Orbit (server side only; the API key never leaves Render).
 *
 * Env (Render): SONEX_API_KEY, SONEX_BASE_URL (default https://api.sonexlabs.com), SONEX_DEFAULT_VOICE_ID.
 *
 * Request fields used for POST /v1/speech: text, voice_id, language, speed, output_format.
 * Source: the Sentence Safari prototype that already ran against Sonex, plus Sonex's official client libraries
 * (voice_id required, language optional, speed ~0.75-1.5). The full API reference (docs.sonexlabs.com) was NOT
 * reachable while this was written, so confirm the fields there once (see SONEX_FIELDS below, one place to edit).
 *
 * Rules enforced here:
 *  - The voice must exist in GET /v1/voices. If the voice lists its languages, the language must be one of them.
 *  - Language is always sent explicitly (never "auto"), so Assamese can not drift to Bengali.
 *  - If Sonex answers with X-Voice-Fallback (anything except false/0/no/none), the audio is thrown away.
 *  - The reply must look like a real MP3 (size and header), otherwise it is rejected.
 */

const LANG_CODE = { en: 'en', hi: 'hi', as: 'as', bn: 'bn', hg: 'hi' };      // hg (Hinglish) is spoken by a Hindi voice, same as the existing player
const LANG_NAME = { en: 'english', hi: 'hindi', as: 'assamese', bn: 'bengali' };
const SONEX_FIELDS = { text: 'text', voice: 'voice_id', language: 'language', speed: 'speed', format: 'output_format' };

const MIN_SPEED = 0.75, MAX_SPEED = 1.5;
const MIN_BYTES = 1024, MAX_BYTES = 10 * 1024 * 1024;
const VOICE_ID_RE = /^[A-Za-z0-9_-]{3,64}$/;
const RETRY_STATUS = new Set([502, 503, 504]);

class SonexError extends Error {
  constructor(code, message, status, fatal) {
    super(message);
    this.name = 'SonexError';
    this.code = code;
    this.status = status || 500;
    this.fatal = !!fatal;          // true = every other segment in the same batch would fail the same way
  }
}

function createSonex(opts) {
  opts = opts || {};
  const apiKey = String(opts.apiKey || '').trim();
  const baseUrl = String(opts.baseUrl || 'https://api.sonexlabs.com').trim().replace(/\/+$/, '');
  const timeoutMs = opts.timeoutMs || 60000;
  const maxChars = opts.maxChars || 2000;
  const doFetch = opts.fetchImpl || globalThis.fetch;
  let voiceCache = null;           // { t, list }

  const configured = () => !!apiKey;
  function needKey() {
    if (!apiKey) throw new SonexError('NOT_CONFIGURED', 'Sonex abhi set nahi hai (Render mein SONEX_API_KEY daalo).', 503, true);
  }

  async function call(url, init, attempts) {
    let last;
    for (let a = 0; a < attempts; a++) {
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), timeoutMs);
      try {
        const res = await doFetch(url, Object.assign({}, init, { signal: ctl.signal }));
        if (RETRY_STATUS.has(res.status) && a < attempts - 1) { last = new SonexError('UPSTREAM', 'Sonex busy hai.', 502); continue; }
        return res;
      } catch (e) {
        last = e && e.name === 'AbortError'
          ? new SonexError('TIMEOUT', 'Sonex ne time par jawab nahi diya. Dobara try karo.', 504)
          : new SonexError('NETWORK', 'Sonex tak pahunch nahi paye. Internet ya SONEX_BASE_URL check karo.', 502);
        if (a === attempts - 1) throw last;
      } finally { clearTimeout(timer); }
    }
    throw last || new SonexError('UPSTREAM', 'Sonex jawab nahi de raha.', 502);
  }

  function httpError(status, bodyText) {
    const detail = String(bodyText || '').replace(/\s+/g, ' ').slice(0, 160);
    if (status === 401 || status === 403) return new SonexError('AUTH', 'Sonex API key galat hai ya allowed nahi hai.', 502, true);
    if (status === 402) return new SonexError('CREDITS', 'Sonex ka balance/credits khatam hain.', 502, true);
    if (status === 429) return new SonexError('RATE_LIMIT', 'Sonex rate limit lag gayi. Thodi der baad try karo.', 429, true);
    if (status === 400 || status === 422) return new SonexError('BAD_REQUEST', 'Sonex ne request manzoor nahi ki: ' + detail, 400);
    return new SonexError('UPSTREAM', 'Sonex error ' + status + (detail ? ': ' + detail : ''), 502);
  }

  async function listVoices(force) {
    needKey();
    if (!force && voiceCache && Date.now() - voiceCache.t < 600000) return voiceCache.list;
    const res = await call(baseUrl + '/v1/voices', { headers: { Authorization: 'Bearer ' + apiKey } }, 2);
    const body = await res.text();
    if (!res.ok) throw httpError(res.status, body);
    let parsed;
    try { parsed = JSON.parse(body); } catch (e) { throw new SonexError('BAD_RESPONSE', 'Sonex ki voice list samajh nahi aayi.', 502); }
    const raw = Array.isArray(parsed) ? parsed : (parsed.voices || parsed.data || []);
    const list = raw.map(v => {
      const langs = Array.isArray(v.languages) ? v.languages : (v.language ? [v.language] : (v.lang ? [v.lang] : null));
      return {
        id: String(v.id || v.voice_id || ''),
        name: String(v.name || ''),
        languages: langs ? langs.map(x => String(x).toLowerCase()) : null,   // null = Sonex did not say, so we can not pre-check
        gender: v.gender ? String(v.gender) : null
      };
    }).filter(v => v.id);
    voiceCache = { t: Date.now(), list };
    return list;
  }

  const voiceSupports = (voice, code) => !voice.languages || voice.languages.some(l => l === code || l.startsWith(code + '-') || l.startsWith(code + '_') || l === LANG_NAME[code]);

  function normalizeSpeed(speed) {
    if (speed === undefined || speed === null || speed === '') return 1;
    const n = Number(speed);
    if (!isFinite(n) || n < MIN_SPEED || n > MAX_SPEED) throw new SonexError('BAD_INPUT', 'Speed ' + MIN_SPEED + ' se ' + MAX_SPEED + ' ke beech honi chahiye.', 400);
    return Math.round(n * 100) / 100;
  }

  function checkMp3(buf) {
    if (buf.length < MIN_BYTES) throw new SonexError('BAD_AUDIO', 'Sonex ki audio bahut chhoti/khali hai.', 502);
    if (buf.length > MAX_BYTES) throw new SonexError('BAD_AUDIO', 'Audio file bahut badi hai (' + Math.round(buf.length / 1048576) + ' MB).', 502);
    const id3 = buf[0] === 0x49 && buf[1] === 0x44 && buf[2] === 0x33;
    const frame = buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0;
    if (!id3 && !frame) throw new SonexError('BAD_AUDIO', 'Sonex ka jawab MP3 audio nahi hai.', 502);
  }

  // { text, language, voiceId, speed } -> { audio:Buffer, bytes, voice, language, speed }
  async function synthesize(input) {
    needKey();
    input = input || {};
    const text = String(input.text == null ? '' : input.text).replace(/\s+/g, ' ').trim();
    if (!text) throw new SonexError('BAD_INPUT', 'Narration text khali hai.', 400);
    if (text.length > maxChars) throw new SonexError('BAD_INPUT', 'Narration text ' + maxChars + ' characters se chhota hona chahiye (abhi ' + text.length + ').', 400);
    const code = LANG_CODE[String(input.language || '').toLowerCase()];
    if (!code) throw new SonexError('BAD_INPUT', 'Language en, hi, as, bn ya hg honi chahiye.', 400);
    const voiceId = String(input.voiceId || opts.defaultVoiceId || '').trim();
    if (!VOICE_ID_RE.test(voiceId)) throw new SonexError('BAD_INPUT', 'Voice ID missing ya galat hai.', 400);
    const speed = normalizeSpeed(input.speed);

    const voice = (await listVoices()).find(v => v.id === voiceId);
    if (!voice) throw new SonexError('VOICE_NOT_FOUND', 'Ye voice (' + voiceId + ') Sonex account mein nahi mili. Dusri voice chuno.', 400);
    if (!voiceSupports(voice, code)) throw new SonexError('VOICE_LANGUAGE_MISMATCH', voice.name + ' voice ' + code + ' language support nahi karti. Doosri language ya voice chuno (kisi aur language ki awaaz nahi lagayi jayegi).', 400);

    const payload = {};
    payload[SONEX_FIELDS.text] = text;
    payload[SONEX_FIELDS.voice] = voiceId;
    payload[SONEX_FIELDS.language] = code;
    payload[SONEX_FIELDS.speed] = speed;
    payload[SONEX_FIELDS.format] = 'mp3';

    // Only network/timeout/502-504 are retried; 4xx (bad key, no credits, rate limit) never, so credits are not wasted.
    const res = await call(baseUrl + '/v1/speech', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }, 2);
    if (!res.ok) throw httpError(res.status, await res.text().catch(() => ''));

    const fb = res.headers.get('x-voice-fallback');
    if (fb && !/^(false|0|no|none)$/i.test(fb.trim()))
      throw new SonexError('VOICE_FALLBACK', 'Sonex ne ' + voice.name + ' ki jagah dusri awaaz lagayi. Ye audio rakha nahi gaya. Voice/language check karo.', 502);

    const ct = (res.headers.get('content-type') || '').toLowerCase();
    if (ct && !/^audio\/(mpeg|mp3|mpga)\b|^application\/octet-stream\b/.test(ct)) throw new SonexError('BAD_AUDIO', 'Sonex ne audio ki jagah ' + ct.split(';')[0] + ' bheja.', 502);
    const audio = Buffer.from(await res.arrayBuffer());
    checkMp3(audio);
    return { audio, bytes: audio.length, voice, language: code, speed };
  }

  return { configured, listVoices, synthesize, defaultVoiceId: String(opts.defaultVoiceId || '').trim(), LANG_CODE };
}

module.exports = { createSonex, SonexError, LANG_CODE, MIN_SPEED, MAX_SPEED };
