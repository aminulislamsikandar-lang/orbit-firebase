/* Tests for Sonex narration (sonex.js + narration.js).
 * Run:  node tests/narration.test.js      (no npm packages, no network: Sonex and Backblaze are faked)
 * These prove OUR logic (validation, fallback rejection, dedup, upload check). They do not prove the live Sonex/B2 services work.
 */
const path = require('path');
const ROOT = path.join(__dirname, '..');
const { createSonex, SonexError } = require(path.join(ROOT, 'sonex.js'));
const N = require(path.join(ROOT, 'narration.js'));

let pass = 0, fail = 0;
function t(name, ok, extra) { if (ok) { pass++; console.log('PASS  ' + name); } else { fail++; console.log('FAIL  ' + name + (extra ? '  -> ' + extra : '')); } }

const VOICES = [
  { id: 'i43sm02kv3', name: 'Dipannita', languages: ['as'] },
  { id: 'voice_en_1', name: 'Diya', languages: ['en', 'hi'] },
  { id: 'voice_nolang', name: 'Mystery' }
];
const mp3 = (n = 4000) => { const b = Buffer.alloc(n, 1); b[0] = 0x49; b[1] = 0x44; b[2] = 0x33; return b; };

function fakeFetch(over) {
  over = over || {};
  const calls = [];
  const f = async (url, init) => {
    calls.push({ url, init });
    if (over.throwNet) throw new Error('boom');
    if (url.endsWith('/v1/voices')) return new Response(JSON.stringify(over.voicesBody || { voices: VOICES }), { status: over.voicesStatus || 200 });
    if (over.speech) return over.speech(calls.filter(c => c.url.endsWith('/v1/speech')).length);
    return new Response(mp3(), { status: 200, headers: { 'content-type': 'audio/mpeg' } });
  };
  f.calls = calls;
  f.speechCalls = () => calls.filter(c => c.url.endsWith('/v1/speech')).length;
  return f;
}
const mk = (over, extra) => { const ff = fakeFetch(over); return { sonex: createSonex(Object.assign({ apiKey: 'vsk_SECRET123', fetchImpl: ff, defaultVoiceId: 'i43sm02kv3' }, extra || {})), ff }; };
const fakeStore = (over) => {
  over = over || {};
  const m = new Map(); const s = { m, puts: 0 };
  s.head = async k => { if (over.headFails) throw new Error('head down'); return m.has(k) ? { size: over.wrongSize ? m.get(k).length + 1 : m.get(k).length } : null; };
  s.put = async (k, b) => { s.puts++; if (over.putFails) throw new Error('b2 down'); if (!over.dropPut) m.set(k, b); };
  return s;
};
const rejects = async (fn, code) => { try { await fn(); return false; } catch (e) { return e.code === code ? true : 'got ' + (e.code || e.message); } };

(async () => {
  // ---- sonex.js ----
  { const { sonex } = mk();
    const v = await sonex.listVoices();
    t('voice list normalised (id, name, languages)', v.length === 3 && v[0].id === 'i43sm02kv3' && v[0].languages[0] === 'as' && v[2].languages === null);
    const r = await sonex.synthesize({ text: 'নমস্কাৰ', language: 'as', voiceId: 'i43sm02kv3', speed: 0.92 });
    t('Assamese + Dipannita returns MP3 bytes', r.bytes === 4000 && r.voice.name === 'Dipannita' && r.language === 'as'); }

  { const { sonex, ff } = mk();
    await sonex.synthesize({ text: 'hello', language: 'as', voiceId: 'i43sm02kv3' });
    const body = JSON.parse(ff.calls.filter(c => c.url.endsWith('/v1/speech'))[0].init.body);
    t('request sends explicit language (never auto), voice_id, mp3, speed', body.language === 'as' && body.voice_id === 'i43sm02kv3' && body.output_format === 'mp3' && body.speed === 1 && body.language !== 'auto');
    const auth = ff.calls[0].init.headers.Authorization;
    t('API key goes only in the Authorization header', auth === 'Bearer vsk_SECRET123' && !JSON.stringify(body).includes('SECRET')); }

  { const { sonex } = mk();
    t('Assamese text on a Hindi/English voice is refused (no silent substitute)', (await rejects(() => sonex.synthesize({ text: 'x', language: 'as', voiceId: 'voice_en_1' }), 'VOICE_LANGUAGE_MISMATCH')) === true);
    t('Hindi on a Hindi-capable voice is allowed', (await sonex.synthesize({ text: 'namaste', language: 'hi', voiceId: 'voice_en_1' })).bytes === 4000);
    t('Hinglish (hg) is spoken with a Hindi voice', (await sonex.synthesize({ text: 'kaise ho', language: 'hg', voiceId: 'voice_en_1' })).language === 'hi');
    t('missing voice -> VOICE_NOT_FOUND', (await rejects(() => sonex.synthesize({ text: 'x', language: 'en', voiceId: 'nope12345' }), 'VOICE_NOT_FOUND')) === true);
    t('bad language rejected', (await rejects(() => sonex.synthesize({ text: 'x', language: 'fr', voiceId: 'voice_en_1' }), 'BAD_INPUT')) === true);
    t('empty text rejected', (await rejects(() => sonex.synthesize({ text: '   ', language: 'en', voiceId: 'voice_en_1' }), 'BAD_INPUT')) === true);
    t('too-long text rejected', (await rejects(() => sonex.synthesize({ text: 'a'.repeat(2001), language: 'en', voiceId: 'voice_en_1' }), 'BAD_INPUT')) === true);
    t('speed out of range rejected', (await rejects(() => sonex.synthesize({ text: 'x', language: 'en', voiceId: 'voice_en_1', speed: 3 }), 'BAD_INPUT')) === true);
    t('malformed voice id rejected', (await rejects(() => sonex.synthesize({ text: 'x', language: 'en', voiceId: '../etc' }), 'BAD_INPUT')) === true); }

  { const { sonex } = mk({ speech: () => new Response(mp3(), { status: 200, headers: { 'content-type': 'audio/mpeg', 'x-voice-fallback': 'true' } }) });
    t('X-Voice-Fallback header -> audio rejected', (await rejects(() => sonex.synthesize({ text: 'x', language: 'as', voiceId: 'i43sm02kv3' }), 'VOICE_FALLBACK')) === true); }
  { const { sonex } = mk({ speech: () => new Response(mp3(), { status: 200, headers: { 'content-type': 'audio/mpeg', 'x-voice-fallback': 'false' } }) });
    t('X-Voice-Fallback: false is accepted', (await sonex.synthesize({ text: 'x', language: 'as', voiceId: 'i43sm02kv3' })).bytes === 4000); }
  { const { sonex } = mk({ speech: () => new Response(Buffer.alloc(4000, 7), { status: 200, headers: { 'content-type': 'audio/mpeg' } }) });
    t('non-MP3 bytes rejected', (await rejects(() => sonex.synthesize({ text: 'x', language: 'en', voiceId: 'voice_en_1' }), 'BAD_AUDIO')) === true); }
  { const { sonex } = mk({ speech: () => new Response(Buffer.alloc(10, 1), { status: 200, headers: { 'content-type': 'audio/mpeg' } }) });
    t('tiny/empty audio rejected', (await rejects(() => sonex.synthesize({ text: 'x', language: 'en', voiceId: 'voice_en_1' }), 'BAD_AUDIO')) === true); }
  { const { sonex } = mk({ speech: () => new Response('{"a":1}', { status: 200, headers: { 'content-type': 'application/json' } }) });
    t('JSON instead of audio rejected', (await rejects(() => sonex.synthesize({ text: 'x', language: 'en', voiceId: 'voice_en_1' }), 'BAD_AUDIO')) === true); }
  { const { sonex } = mk({ speech: () => new Response(mp3(), { status: 200 }) });
    t('MP3 without content-type header still accepted if bytes are MP3', (await sonex.synthesize({ text: 'x', language: 'en', voiceId: 'voice_en_1' })).bytes === 4000); }

  for (const [status, code] of [[401, 'AUTH'], [402, 'CREDITS'], [429, 'RATE_LIMIT'], [400, 'BAD_REQUEST'], [500, 'UPSTREAM']]) {
    const { sonex, ff } = mk({ speech: () => new Response('nope', { status }) });
    const ok = await rejects(() => sonex.synthesize({ text: 'x', language: 'en', voiceId: 'voice_en_1' }), code);
    t('HTTP ' + status + ' -> ' + code + ' (not retried)', ok === true && ff.speechCalls() === 1, String(ok)); }
  { const { sonex, ff } = mk({ speech: n => n === 1 ? new Response('busy', { status: 503 }) : new Response(mp3(), { status: 200, headers: { 'content-type': 'audio/mpeg' } }) });
    const r = await sonex.synthesize({ text: 'x', language: 'en', voiceId: 'voice_en_1' });
    t('503 is retried once and then succeeds', r.bytes === 4000 && ff.speechCalls() === 2); }
  { const { sonex } = mk({ throwNet: true });
    t('network failure -> NETWORK error', (await rejects(() => sonex.synthesize({ text: 'x', language: 'en', voiceId: 'voice_en_1' }), 'NETWORK')) === true); }
  { const sonex = createSonex({ apiKey: '' });
    t('no API key -> NOT_CONFIGURED', (await rejects(() => sonex.synthesize({ text: 'x', language: 'en', voiceId: 'voice_en_1' }), 'NOT_CONFIGURED')) === true); }
  { const hang = (url, init) => new Promise((_, rej) => init.signal.addEventListener('abort', () => { const e = new Error('aborted'); e.name = 'AbortError'; rej(e); }));
    const sonex = createSonex({ apiKey: 'k', fetchImpl: hang, timeoutMs: 30 });
    t('timeout -> TIMEOUT error', (await rejects(() => sonex.listVoices(), 'TIMEOUT')) === true); }
  { let msg = '';
    const { sonex } = mk({ speech: () => new Response('denied vsk_SECRET123', { status: 401 }) });
    try { await sonex.synthesize({ text: 'x', language: 'en', voiceId: 'voice_en_1' }); } catch (e) { msg = e.message; }
    t('auth error message does not echo the key', msg && !msg.includes('SECRET')); }

  // ---- narration.js ----
  const seg = (text, index) => ({ text, index });
  { const { sonex, ff } = mk(); const store = fakeStore();
    const nar = N.createNarration({ sonex, store });
    const r1 = await nar.generate({ lessonId: 'math-ex1.1-q1', folder: 'class-7/mathematics', language: 'as', voiceId: 'i43sm02kv3', segments: [seg('এক', 0), seg('দুই', 1)] });
    t('generate -> ready, two keys under audio/generated/...', r1.status === 'ready' && r1.segments.length === 2 && r1.segments[0].audioKey.startsWith('audio/generated/class-7/mathematics/math-ex1-1-q1/as/step-01-') && r1.segments[1].audioKey.includes('/step-02-'), JSON.stringify(r1.segments[0]));
    t('MP3 really uploaded to the store', store.m.size === 2 && store.puts === 2);
    const r2 = await nar.generate({ lessonId: 'math-ex1.1-q1', folder: 'class-7/mathematics', language: 'as', voiceId: 'i43sm02kv3', segments: [seg('এক', 0), seg('দুই', 1)] });
    t('same lesson again -> cached, Sonex NOT called again', r2.status === 'ready' && r2.segments.every(s => s.cached) && ff.speechCalls() === 2 && store.puts === 2);
    const r3 = await nar.generate({ lessonId: 'math-ex1.1-q1', folder: 'class-7/mathematics', language: 'as', voiceId: 'i43sm02kv3', segments: [seg('এক', 0), seg('তিনি', 1)] });
    t('one changed segment -> only that one regenerated, new key', r3.segments[0].cached === true && r3.segments[1].cached === false && r3.segments[1].audioKey !== r1.segments[1].audioKey && ff.speechCalls() === 3);
    t('old audio is kept (never overwritten)', store.m.has(r1.segments[1].audioKey));
    const r4 = await nar.generate({ lessonId: 'math-ex1.1-q1', folder: 'class-7/mathematics', language: 'as', voiceId: 'i43sm02kv3', speed: 0.9, segments: [seg('এক', 0)] });
    t('different speed -> different cache key', r4.segments[0].cached === false && r4.segments[0].audioKey !== r1.segments[0].audioKey);
    const r5 = await nar.generate({ lessonId: 'math-ex1.1-q1', folder: 'class-7/mathematics', language: 'as', voiceId: 'i43sm02kv3', segments: [seg('  এক  ', 0)] });
    t('extra whitespace does not change the cache key', r5.segments[0].cached === true); }

  { const { sonex, ff } = mk(); const store = fakeStore(); const nar = N.createNarration({ sonex, store });
    const input = { lessonId: 'regen-1', language: 'en', voiceId: 'voice_en_1', segments: [seg('take one', 0)] };
    const a = await nar.generate(input); const b = await nar.generate(Object.assign({}, input, { force: true })); const c = await nar.generate(input);
    t('Regenerate (force) calls Sonex again and replaces the same clip', a.segments[0].cached === false && b.segments[0].cached === false && b.segments[0].audioKey === a.segments[0].audioKey && ff.speechCalls() === 2);
    t('after a forced take the normal request is cached again', c.segments[0].cached === true && ff.speechCalls() === 2); }

  { const { sonex, ff } = mk(); const store = fakeStore(); const nar = N.createNarration({ sonex, store });
    const input = { lessonId: 'dup-lesson-1', language: 'en', voiceId: 'voice_en_1', segments: [seg('same text', 0)] };
    const [a, b] = await Promise.all([nar.generate(input), nar.generate(input)]);
    t('two simultaneous requests pay Sonex only once', a.status === 'ready' && b.status === 'ready' && ff.speechCalls() === 1 && store.puts === 1, 'calls=' + ff.speechCalls()); }

  { const { sonex } = mk(); const store = fakeStore({ putFails: true }); const nar = N.createNarration({ sonex, store });
    const r = await nar.generate({ lessonId: 'upl-fail-1', language: 'en', voiceId: 'voice_en_1', segments: [seg('hello', 0)] });
    t('B2 upload failure -> NOT ready, clear code', r.status === 'failed' && r.segments[0].status === 'failed' && r.segments[0].code === 'UPLOAD_FAILED' && !r.segments[0].audioKey); }
  { const { sonex } = mk(); const store = fakeStore({ wrongSize: true }); const nar = N.createNarration({ sonex, store });
    const r = await nar.generate({ lessonId: 'upl-verify-1', language: 'en', voiceId: 'voice_en_1', segments: [seg('hello', 0)] });
    t('size mismatch after upload -> NOT ready', r.status === 'failed' && r.segments[0].code === 'UPLOAD_VERIFY'); }
  { const { sonex } = mk({ speech: () => new Response('no credits', { status: 402 }) }); const store = fakeStore(); const nar = N.createNarration({ sonex, store });
    const r = await nar.generate({ lessonId: 'credits-1', language: 'en', voiceId: 'voice_en_1', segments: [seg('a', 0), seg('b', 1), seg('c', 2)] });
    t('fatal error (no credits) stops the batch, rest skipped, lesson not ready', r.status === 'failed' && r.segments[0].code === 'CREDITS' && r.segments[1].status === 'skipped' && r.segments[2].status === 'skipped' && store.puts === 0); }
  { const { sonex } = mk({ speech: () => new Response(mp3(), { status: 200, headers: { 'content-type': 'audio/mpeg', 'x-voice-fallback': '1' } }) }); const store = fakeStore(); const nar = N.createNarration({ sonex, store });
    const r = await nar.generate({ lessonId: 'fb-1', language: 'as', voiceId: 'i43sm02kv3', segments: [seg('a', 0)] });
    t('voice fallback is never stored or marked ready', r.status === 'failed' && r.segments[0].code === 'VOICE_FALLBACK' && store.puts === 0); }
  { const { sonex } = mk(); const store = fakeStore(); const nar = N.createNarration({ sonex, store });
    const r = await nar.generate({ lessonId: 'partial-1', language: 'en', voiceId: 'voice_en_1', segments: [seg('ok', 0), seg('   ', 1)] });
    t('empty segment fails alone, lesson not ready', r.status === 'failed' && r.segments[0].status === 'ready' && r.segments[1].code === 'BAD_INPUT'); }

  { const { sonex } = mk(); const nar = N.createNarration({ sonex, store: fakeStore() });
    const bad = async input => { try { await nar.generate(input); return false; } catch (e) { return e.code === 'BAD_INPUT'; } };
    const base = { lessonId: 'valid-1', language: 'en', voiceId: 'voice_en_1', segments: [seg('x', 0)] };
    t('bad lesson id rejected', await bad(Object.assign({}, base, { lessonId: '../x' })));
    t('bad folder rejected', await bad(Object.assign({}, base, { folder: '../../secret' })));
    t('bad language rejected', await bad(Object.assign({}, base, { language: 'fr' })));
    t('no segments rejected', await bad(Object.assign({}, base, { segments: [] })));
    t('more than 12 segments rejected', await bad(Object.assign({}, base, { segments: Array.from({ length: 13 }, (_, i) => seg('x', i)) })));
    t('duplicate segment index rejected', await bad(Object.assign({}, base, { segments: [seg('a', 0), seg('b', 0)] })));
    t('non-numeric speed rejected', await bad(Object.assign({}, base, { speed: 'fast' }))); }

  // ---- key validation (used by the student URL route) ----
  t('narration key accepted', N.isNarrationKey('audio/generated/class-7/maths/q1/as/step-01-abc123.mp3'));
  t('video key refused (cannot sign paid videos through the narration route)', !N.isNarrationKey('lesson-01-abc123.mp4') && !N.isNarrationKey('videos/recorded/class-6/x.mp4'));
  t('path traversal refused', !N.isNarrationKey('audio/generated/../videos/x.mp3') && !N.isNarrationKey('audio/generated//x.mp3'));
  t('uppercase / odd chars refused', !N.isNarrationKey('audio/generated/Q1/step.mp3') && !N.isNarrationKey('audio/generated/a b/step.mp3'));
  t('key must belong to the requested lesson', N.keyBelongsToLesson('audio/generated/class-7/maths/q1-a/as/step-01-abc123.mp3', 'Q1-A') && !N.keyBelongsToLesson('audio/generated/class-7/maths/q2/as/step-01-abc123.mp3', 'q1-a'));

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('TEST CRASH', e); process.exit(2); });
