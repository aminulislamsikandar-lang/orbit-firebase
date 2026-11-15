// Phase 5 voice tutor: voice-core.js (passages, reading check, spoken Q&A, WAV), the server routes (parent-key gate, validation, prompts) and the browser module.
// Run: node tests/voice.test.js
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
const V = require(path.join(ROOT, 'voice-core.js')), RECALL = require(path.join(ROOT, 'recall-core.js')), CUSTOM = require(path.join(ROOT, 'custom-core.js'));
let pass = 0, fail = 0;
const t = (name, ok, extra) => { if (ok) pass++; else { fail++; console.log('FAIL  ' + name + (extra ? '  ' + extra : '')); } };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// ================= voice-core.js =================
const NOTES = 'Plants make their own food by photosynthesis. They use sunlight, water and carbon dioxide. The green pigment chlorophyll catches the sunlight. Oxygen is released into the air. Roots take in water from the soil. Leaves are the kitchen of the plant.';
const ps = V.passages(NOTES);
t('passages: whole sentences, each 60 to 280 characters', ps.length >= 2 && ps.every(p => p.length >= 60 && p.length <= 280 && /[.!?।]$/.test(p)));
t('passages: no sentence is lost or cut in the middle', ps.join(' ').replace(/\s+/g, ' ').startsWith('Plants make their own food') && ps.join(' ').includes('Leaves are the kitchen of the plant.'));
t('passages: mostly-number lines, figure notes, links and one giant sentence are skipped', V.passages('1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30. [Figure: a leaf with its parts and labels shown clearly]. See https://example.com/page for the full chapter text online now. ' + 'word '.repeat(80) + '.').length === 0);
t('passages: the Assamese/Hindi danda ends a sentence', V.passages('গছে সূৰ্যৰ পোহৰত নিজৰ খাদ্য নিজে প্ৰস্তুত কৰে। এই প্ৰক্ৰিয়াক সালোকসংশ্লেষণ বোলা হয়। পাতত সেউজীয়া ৰং থাকে।').length >= 1);
t('passages: empty or missing text gives nothing', same(V.passages(''), []) && same(V.passages(null), []) && V.pickPassage('', 0) === null);
const p0 = V.pickPassage(NOTES, 0), p1 = V.pickPassage(NOTES, 1);
t('pickPassage: n picks the piece, wraps around, and is the same every time', p0.n === 0 && p1.n === 1 && p0.count === ps.length && V.pickPassage(NOTES, ps.length).text === p0.text && V.pickPassage(NOTES, -1).n === ps.length - 1 && V.pickPassage(NOTES, 'x').n === 0 && V.pickPassage(NOTES, 1).text === p1.text);
t('readingText: chapter notes plus the hidden notes of each question, never the question text', V.readingText({ context: 'A note.', sections: [{ questions: [{ text: 'QUESTION TEXT', context: 'Q note.' }, { text: 'ANOTHER' }] }] }) === 'A note.\nQ note.' && V.readingText(null) === '' && V.readingText({}) === '');

const READ_OK = '{"accuracy":80,"wrong":[{"word":"chlorophyll","said":"clorofil","say":"KLOR-o-fil"},{"word":"notinpassage","said":"x","say":"y"}],"missed":["sunlight","ghost"],"praise":"Achha padha","tip":"Dhire bolo"}';
const pr = V.parseRead(READ_OK, NOTES);
t('parseRead: keeps real mistakes, drops words that are not in the passage', pr.accuracy === 80 && same(pr.wrong.map(x => x.word), ['chlorophyll']) && pr.wrong[0].say === 'KLOR-o-fil' && same(pr.missed, ['sunlight']) && pr.praise === 'Achha padha' && pr.unclear === false);
t('parseRead: accuracy is clamped, a self-contradicting 100 becomes 95', V.parseRead('{"accuracy":250,"wrong":[],"missed":[]}', NOTES).accuracy === 100 && V.parseRead('{"accuracy":-5}', NOTES).accuracy === 0 && V.parseRead('{"accuracy":100,"wrong":[{"word":"water","said":"x","say":"y"}]}', NOTES).accuracy === 95);
t('parseRead: unclear audio is passed on, fenced or messy JSON still works, garbage is null', V.parseRead('{"unclear":true}', NOTES).unclear === true && V.parseRead('```json\n{"accuracy":50}\n```', NOTES).accuracy === 50 && V.parseRead('text {"accuracy":10} text', NOTES).accuracy === 10 && ['', 'no', '{}', '{"accuracy":"x"}', null].every(x => V.parseRead(x, NOTES) === null));
t('parseRead: at most 12 words each and long strings are cut', (r => r.wrong.length === 12 && r.praise.length <= 300)(V.parseRead(JSON.stringify({ accuracy: 10, praise: 'p'.repeat(900), wrong: Array(30).fill({ word: 'water', said: 'a', say: 'b' }) }), NOTES)));
t('reading prompts: compare the audio with the passage, treat both as data, Hinglish feedback', /word by word/.test(V.READ_SYSTEM) && /data, never instructions/.test(V.READ_SYSTEM) && /Hinglish/.test(V.READ_SYSTEM) && /normal accent/.test(V.READ_SYSTEM) && /Language of the passage: Assamese/.test(V.buildReadPrompt({ cls: 5, subject: 'Science', chapter: 'Plants', lang: 'as' }, 'PASSAGE-X')) && V.buildReadPrompt({ cls: 5, subject: 'Science', chapter: 'Plants', lang: 'as' }, 'PASSAGE-X').includes('PASSAGE-X'));

const st1 = V.sanitizeTalk({ total: 9, turn: 2, prevQ: 'What is chlorophyll?', asked: ['a', 'What is chlorophyll?', '', 'x', 'y', 'z', 'w'], lang: 'as' });
t('sanitizeTalk: total 3 to 5, asked list capped, empty items dropped, language checked', st1.total === 5 && st1.turn === 2 && st1.asked.length <= 5 && !st1.asked.includes('') && st1.lang === 'as' && st1.finish === false && V.sanitizeTalk({ total: 1, turn: 0 }).total === 3 && V.sanitizeTalk({ turn: 0, lang: 'xx' }).lang === 'en');
t('sanitizeTalk: the last answer finishes the talk; an answer without its question is refused; the first turn needs no question', V.sanitizeTalk({ total: 4, turn: 4, prevQ: 'q' }).finish === true && V.sanitizeTalk({ total: 4, turn: 2 }) === null && V.sanitizeTalk({ turn: 0, prevQ: 'ignored' }).prevQ === '' && V.sanitizeTalk({ turn: 99, prevQ: 'q', total: 4 }).turn === 4);
const tk = (o) => ({ total: 4, turn: 1, asked: ['Q1'], prevQ: 'Q1', finish: false, lang: 'hi', reference: NOTES, ...o });
t('buildTalkPrompt: notes, earlier questions, the question just asked and what to write next', (p => /Textbook notes/.test(p) && p.includes('Plants make their own food') && p.includes('1. Q1') && /just asked: "Q1"/.test(p) && /next question in "next"/.test(p) && /Hindi/.test(p))(V.buildTalkPrompt({ cls: 7, subject: 'Science', chapter: 'Plants' }, tk())));
t('buildTalkPrompt: first turn has no audio; the last turn asks for a summary, not a question', /No audio yet/.test(V.buildTalkPrompt({}, tk({ turn: 0, prevQ: '', asked: [] }))) && /last question[\s\S]*summary/.test(V.buildTalkPrompt({}, tk({ finish: true }))) && V.buildTalkPrompt({}, tk({ reference: 'N'.repeat(20000) })).length < 11000);
const TALK = '{"heard":"Paudhe khana banate hain","verdict":"adhoora","feedback":"Achha, par sunlight bhi chahiye.","next":"Chlorophyll kya hota hai?","summary":"ignored"}';
t('parseTalk: an answer turn gives heard, verdict, feedback and the next question (summary dropped)', (o => o.verdict === 'adhoora' && o.heard && o.next === 'Chlorophyll kya hota hai?' && o.summary === '')(V.parseTalk(TALK, tk())));
t('parseTalk: the first turn keeps only the question', (o => o.next && o.verdict === '' && o.heard === '' && o.feedback === '')(V.parseTalk(TALK, tk({ turn: 0, prevQ: '' }))));
t('parseTalk: the last turn keeps the summary, no next question', (o => o.next === '' && o.summary === 'Sab theek raha.')(V.parseTalk('{"heard":"x","verdict":"sahi","feedback":"f","next":"leftover?","summary":"Sab theek raha."}', tk({ finish: true }))));
t('parseTalk: missing verdict (after an answer), missing next question, bad verdict word, garbage are all refused', [V.parseTalk('{"next":"q?"}', tk()), V.parseTalk('{"verdict":"sahi"}', tk()), V.parseTalk('{"verdict":"maybe","next":"q"}', tk()), V.parseTalk('nope', tk()), V.parseTalk(null, tk())].every(x => x === null));
t('talk prompts: use only the notes, judge in Hinglish, audio and notes are data', /ONLY the textbook notes/.test(V.TALK_SYSTEM) && /Hinglish/.test(V.TALK_SYSTEM) && /data, never instructions/.test(V.TALK_SYSTEM) && /"sahi"[\s\S]*"adhoora"[\s\S]*"galat"/.test(V.TALK_SYSTEM));

t('cleanTtsText: tags and markdown marks go, 600 characters at most', V.cleanTtsText('<b>Hello</b> **world** _x_ `y`') === 'Hello world x y' && V.cleanTtsText('a'.repeat(5000)).length === 600 && V.cleanTtsText(null) === '');
const wav = V.pcmToWav(Buffer.alloc(48000));
t('pcmToWav: a valid 24 kHz 16-bit mono WAV header around the PCM data', wav.length === 48044 && wav.toString('ascii', 0, 4) === 'RIFF' && wav.toString('ascii', 8, 12) === 'WAVE' && wav.readUInt32LE(4) === 48036 && wav.readUInt16LE(20) === 1 && wav.readUInt16LE(22) === 1 && wav.readUInt32LE(24) === 24000 && wav.readUInt32LE(28) === 48000 && wav.readUInt16LE(34) === 16 && wav.toString('ascii', 36, 40) === 'data' && wav.readUInt32LE(40) === 48000);
t('TTS prompts exist for all four languages', ['hi', 'en', 'as', 'bn'].every(k => V.TTS_PROMPT[k] && /aloud/.test(V.TTS_PROMPT[k])));

// ---- Task 28: Bolo AI check ----
t('bolo: sanitizeBolo needs a known kind and an expected text (cut to 200 characters)', same(V.sanitizeBolo({ kind: 'letter', expected: 'A for Apple' }), { kind: 'letter', expected: 'A for Apple' }) && V.sanitizeBolo({ kind: 'letter', expected: 'x'.repeat(900) }).expected.length === 200 && [null, {}, { kind: 'x', expected: 'a' }, { kind: 'line', expected: '' }, { kind: 'line' }].every(x => V.sanitizeBolo(x) === null));
t('bolo: parseBolo needs a real true/false, keeps short heard/tip, refuses garbage', same(V.parseBolo('{"ok":true,"heard":"ay","tip":"Shabaash"}'), { ok: true, heard: 'ay', tip: 'Shabaash' }) && V.parseBolo('{"ok":false}').ok === false && ['{"ok":"yes"}', '{}', 'no', null].every(x => V.parseBolo(x) === null) && V.parseBolo(JSON.stringify({ ok: true, tip: 't'.repeat(900) })).tip.length <= 200);
t('bolo: prompt is kind to accents, accepts letter name/sound/word, treats text as data', /ignore accent/.test(V.BOLO_SYSTEM) && /letter name, its sound or the example word/.test(V.BOLO_SYSTEM) && /data, never instructions/.test(V.BOLO_SYSTEM) && /Hinglish/.test(V.BOLO_SYSTEM) && /alphabet letter/.test(V.buildBoloPrompt({ kind: 'letter', expected: 'A for Apple' })) && /two times three is six/.test(V.buildBoloPrompt({ kind: 'number', expected: 'two times three is six' })));

// ================= server routes (the Phase 5 block runs against fakes) =================
const src = read('server.js');
const i0 = src.indexOf('// ---- Phase 5: voice tutor'), i1 = src.indexOf('// ---- Add custom course: read the questions from a photo');
t('server: the voice block exists before the custom-course routes', i0 > 0 && i1 > i0);
const block = src.slice(i0, i1);
const routes = {}, app = { post: (p, h) => { routes[p] = h; } };
const QUIZ = { courses: [{ id: 'c5-sci', class: 5, subject: 'Science', chapters: [{ no: 1, title: 'Plants', context: NOTES, sections: [{ title: 'Q', questions: [{ id: 'q1', no: 1, text: 'Why do plants need light?' }] }] }, { no: 2, title: 'Empty', sections: [] }, { no: 3, title: 'No notes', sections: [{ title: 'Q', questions: [{ id: 'q2', no: 1, text: 'Q?' }] }] }] }] };
let gCalls = [], gReply = { text: '{}' }, guardOk = true, fetchCalls = [], fetchReply = null, limitedNow = false;
const mkRes = () => { const r = { code: 200, body: null, status(c) { r.code = c; return r; }, json(b) { r.body = b; return r; } }; return r; };
const makeRoutes = () => new Function('app', 'VOICE', 'RECALL', 'QUIZ', 'CUSTOM', 'userKeyOf', 'guardAI', 'geminiFor', 'failMsgFor', 'aiLimiter', 'rateKey', 'fetch', 'AbortSignal', 'process', 'console', 'Buffer', block)(
  app, V, RECALL, QUIZ, CUSTOM, req => String(req.headers['x-user-key'] || ''), (req, res) => { if (!guardOk) { res.status(429).json({ error: 'slow' }); return false; } return true; },
  async (req, system, prompt, opts) => { gCalls.push({ system, prompt, opts }); return gReply; }, (req, s) => 'AI error ' + s, { hit: () => limitedNow }, () => 'k',
  async (url, o) => { fetchCalls.push({ url, o }); return fetchReply; }, { timeout: () => undefined }, { env: {} }, { error() {} }, Buffer);
makeRoutes();
const KEY = 'AIza' + 'k'.repeat(30);
const call = async (p, body, key = KEY) => { const rs = mkRes(); await routes[p]({ body, headers: key ? { 'x-user-key': key } : {}, user: { uid: 'stu1' } }, rs); return rs; };
const clip = { mime: 'audio/webm;codecs=opus', data: Buffer.alloc(3000, 1).toString('base64') };
(async () => {
  for (const p of ['/api/read/passage', '/api/read/evaluate', '/api/talk/turn', '/api/tts']) {
    const r = await call(p, { course: 'c5-sci', ch: 1, n: 0, audio: clip, text: 'hi', lang: 'hi', turn: 0 }, '');
    t('parent key: ' + p + ' is refused without the parent key (403, need_parent_key), before any AI call', r.code === 403 && r.body.code === 'need_parent_key' && gCalls.length === 0 && fetchCalls.length === 0);
  }
  let r = await call('/api/read/passage', { course: 'c5-sci', ch: 1, n: 0 });
  t('passage: a built-in chapter gives a short piece of its hidden notes', r.code === 200 && r.body.text && NOTES.includes(r.body.text.split(' ')[0]) && r.body.count >= 2 && r.body.n === 0);
  t('passage: n moves on to the next piece', (await call('/api/read/passage', { course: 'c5-sci', ch: 1, n: 1 })).body.n === 1);
  r = await call('/api/read/passage', { course: 'c5-sci', ch: 3, n: 0 });
  t('passage: a chapter with questions but no reading notes says so (404)', r.code === 404 && /notes/.test(r.body.error));
  r = await call('/api/read/passage', { course: 'c5-sci', ch: 2, n: 0 }); t('passage: a locked or empty chapter is refused', r.code === 400 && /coming soon/.test(r.body.error));
  r = await call('/api/read/passage', { course: 'nope', ch: 1 }); t('passage: unknown course is refused', r.code === 400);
  r = await call('/api/read/passage', { custom: { cls: 7, subject: 'Science', chapter: 'Light', notes: NOTES.repeat(2) }, n: 0 });
  t('passage: a student\'s own chapter works from its notes', r.code === 200 && r.body.text);
  r = await call('/api/read/passage', { custom: { cls: 7, subject: 'Science', chapter: 'Light', notes: 'short' }, n: 0 }); t('passage: own chapter with too little notes is refused', r.code === 400);

  // reading check
  gReply = { text: READ_OK };
  r = await call('/api/read/evaluate', { course: 'c5-sci', ch: 1, n: 0, lang: 'en', audio: clip });
  const g0 = gCalls[gCalls.length - 1], pass0 = V.pickPassage(NOTES, 0).text;
  t('read: sends the recording and the server-chosen passage to the AI with the reading prompts', r.code === 200 && g0.system === V.READ_SYSTEM && g0.prompt.includes(pass0) && g0.opts.audio.mime === 'audio/webm' && g0.opts.json === true && g0.opts.audio.data === clip.data);
  t('read: returns the result and the passage that was checked, only words from that passage', r.body.accuracy === 80 && r.body.passage === pass0 && r.body.wrong.every(x => pass0.includes(x.word)));
  const nCalls = gCalls.length;
  r = await call('/api/read/evaluate', { course: 'c5-sci', ch: 1, n: 0, lang: 'en', audio: clip, text: 'MY OWN PASSAGE', passage: 'MY OWN PASSAGE' });
  t('read: a passage text sent by the browser is ignored (no free AI on arbitrary text)', !gCalls[gCalls.length - 1].prompt.includes('MY OWN PASSAGE'));
  r = await call('/api/read/evaluate', { course: 'c5-sci', ch: 1, n: 0, lang: 'en' }); t('read: no recording is refused', r.code === 400 && gCalls.length === nCalls + 1);
  r = await call('/api/read/evaluate', { course: 'c5-sci', ch: 1, n: 0, lang: 'en', audio: { mime: 'video/mp4', data: clip.data } }); t('read: a wrong recording type is refused', r.code === 400);
  const before = gCalls.length; guardOk = false; r = await call('/api/read/evaluate', { course: 'c5-sci', ch: 1, n: 0, audio: clip }); guardOk = true;
  t('read: the per-student AI limit (guardAI) applies', r.code === 429 && gCalls.length === before);
  gReply = { text: 'garbage' }; r = await call('/api/read/evaluate', { course: 'c5-sci', ch: 1, n: 0, audio: clip }); t('read: an unreadable AI answer is 502 with a retry message', r.code === 502 && /dobara/i.test(r.body.error));
  gReply = { status: 503 }; r = await call('/api/read/evaluate', { course: 'c5-sci', ch: 1, n: 0, audio: clip }); t('read: AI down is 502', r.code === 502 && /AI error 503/.test(r.body.error));

  // talk
  gReply = { text: '{"next":"Paudhe khana kaise banate hain?"}' };
  r = await call('/api/talk/turn', { course: 'c5-sci', ch: 1, lang: 'hi', turn: 0, total: 4 });
  t('talk: the first turn needs no audio and returns the first question', r.code === 200 && r.body.next === 'Paudhe khana kaise banate hain?' && r.body.turn === 0 && r.body.done === false && !gCalls[gCalls.length - 1].opts.audio && gCalls[gCalls.length - 1].system === V.TALK_SYSTEM);
  t('talk: the AI gets the chapter notes and no answer part on turn 0', /Plants make their own food/.test(gCalls[gCalls.length - 1].prompt) && /No audio yet/.test(gCalls[gCalls.length - 1].prompt));
  gReply = { text: TALK };
  r = await call('/api/talk/turn', { course: 'c5-sci', ch: 1, lang: 'hi', turn: 1, total: 4, prevQ: 'Paudhe khana kaise banate hain?', asked: ['Paudhe khana kaise banate hain?'], audio: clip });
  t('talk: an answer turn sends the audio and returns verdict, feedback and the next question', r.code === 200 && r.body.verdict === 'adhoora' && r.body.next && r.body.turn === 1 && r.body.done === false && gCalls[gCalls.length - 1].opts.audio.mime === 'audio/webm' && /just asked/.test(gCalls[gCalls.length - 1].prompt));
  gReply = { text: '{"heard":"x","verdict":"sahi","feedback":"Shabaash","summary":"Achha raha."}' };
  r = await call('/api/talk/turn', { course: 'c5-sci', ch: 1, lang: 'hi', turn: 4, total: 4, prevQ: 'Q4?', asked: ['a', 'b', 'c', 'Q4?'], audio: clip });
  t('talk: the last answer finishes with a summary and done:true', r.code === 200 && r.body.done === true && r.body.summary === 'Achha raha.' && r.body.next === '');
  r = await call('/api/talk/turn', { course: 'c5-sci', ch: 1, turn: 2, total: 4, audio: clip }); t('talk: an answer without the question it answers is refused', r.code === 400);
  r = await call('/api/talk/turn', { course: 'c5-sci', ch: 1, turn: 1, total: 4, prevQ: 'q', asked: ['q'] }); t('talk: an answer turn without a recording is refused', r.code === 400);
  r = await call('/api/talk/turn', { course: 'c5-sci', ch: 3, turn: 0, total: 4 }); t('talk: a chapter with too little notes is refused before the AI is called', r.code === 400 && /notes/.test(r.body.error));
  gReply = { text: '{"verdict":"sahi"}' }; r = await call('/api/talk/turn', { course: 'c5-sci', ch: 1, turn: 1, total: 4, prevQ: 'q', asked: ['q'], audio: clip });
  t('talk: an answer with no next question is a 502, never a stuck screen', r.code === 502);


  // ---- Bolo AI check route ----
  gReply = { text: '{"ok":true,"heard":"ay for apple","tip":"Shabaash!"}' };
  r = await call('/api/bolo/check', { kind: 'letter', expected: 'A for Apple', audio: clip }, '');
  t('bolo route: refused without the parent key (403), before any AI call', r.code === 403 && r.body.code === 'need_parent_key');
  const nb = gCalls.length;
  r = await call('/api/bolo/check', { kind: 'letter', expected: 'A for Apple', audio: clip });
  const gb = gCalls[gCalls.length - 1];
  t('bolo route: sends the clip and the expected text with the Bolo prompts, returns ok/heard/tip', r.code === 200 && r.body.ok === true && r.body.tip === 'Shabaash!' && gb.system === V.BOLO_SYSTEM && gb.prompt.includes('A for Apple') && gb.opts.audio.mime === 'audio/webm' && gb.opts.json === true && gCalls.length === nb + 1);
  r = await call('/api/bolo/check', { kind: 'bad', expected: 'x', audio: clip }); t('bolo route: unknown kind refused', r.code === 400);
  r = await call('/api/bolo/check', { kind: 'line', expected: 'Twinkle' }); t('bolo route: no recording refused', r.code === 400);
  guardOk = false; r = await call('/api/bolo/check', { kind: 'line', expected: 'Twinkle', audio: clip }); guardOk = true; t('bolo route: per-student AI limit applies', r.code === 429);
  gReply = { text: 'junk' }; r = await call('/api/bolo/check', { kind: 'line', expected: 'Twinkle', audio: clip }); t('bolo route: unreadable AI answer is 502', r.code === 502 && /Dobara bolo/.test(r.body.error));
  gReply = { status: 429 }; r = await call('/api/bolo/check', { kind: 'line', expected: 'Twinkle', audio: clip }); t('bolo route: AI quota problem is 502 with the usual message', r.code === 502 && /AI error 429/.test(r.body.error));

  // AI voice
  const pcm = Buffer.alloc(2400, 3).toString('base64');
  fetchReply = { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ inlineData: { mimeType: 'audio/L16;rate=24000', data: pcm } }] } }] }) };
  r = await call('/api/tts', { text: 'Paudhe sunlight se khana banate hain.', lang: 'as' });
  const f0 = fetchCalls[fetchCalls.length - 1], fb = JSON.parse(f0.o.body);
  t('tts: calls Gemini TTS with the parent\'s own key, AUDIO output, a voice, and the language prompt', /gemini-2\.5-flash-preview-tts:generateContent/.test(f0.url) && f0.o.headers['x-goog-api-key'] === KEY && same(fb.generationConfig.responseModalities, ['AUDIO']) && fb.generationConfig.speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName === 'Kore' && fb.contents[0].parts[0].text.includes('Assamese') && fb.contents[0].parts[0].text.includes('Paudhe sunlight'));
  t('tts: returns a WAV (base64) made from the PCM', r.code === 200 && r.body.mime === 'audio/wav' && (b => b.toString('ascii', 0, 4) === 'RIFF' && b.length === 44 + 2400)(Buffer.from(r.body.audio, 'base64')));
  t('tts: the key is never put in the URL or the answer', !f0.url.includes(KEY) && !JSON.stringify(r.body).includes(KEY));
  r = await call('/api/tts', { text: '', lang: 'as' }); t('tts: no text is refused', r.code === 400);
  r = await call('/api/tts', { text: 'hello', lang: 'zz' }); t('tts: unknown language is refused', r.code === 400);
  const nf = fetchCalls.length; limitedNow = true; r = await call('/api/tts', { text: 'hello', lang: 'en' }); limitedNow = false; t('tts: the per-student rate limit applies before any call', r.code === 429 && fetchCalls.length === nf);
  fetchReply = { ok: false, status: 429, json: async () => ({ error: { message: 'quota' } }) }; r = await call('/api/tts', { text: 'hello', lang: 'en' }); t('tts: parent key quota used up = clear message', r.code === 502 && /limit poori/.test(r.body.error));
  fetchReply = { ok: false, status: 403, json: async () => ({}) }; r = await call('/api/tts', { text: 'hello', lang: 'en' }); t('tts: a key that does not work = 401 message', r.code === 401 && /key kaam nahi/.test(r.body.error));
  fetchReply = { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: 'no audio' }] } }] }) }; r = await call('/api/tts', { text: 'hello', lang: 'en' }); t('tts: an answer without audio is 502', r.code === 502);
  fetchReply = null; r = await call('/api/tts', { text: 'hello', lang: 'en' }); t('tts: a network failure is 502, not a crash', r.code === 502);

  // ---- wiring ----
  t('server: body limits: notes + audio routes get 1.5 MB, the passage route 64 kB, tts stays 10 kB', /VOICE_AUDIO_PATHS = new Set\(\['\/api\/read\/evaluate', '\/api\/talk\/turn', '\/api\/bolo\/check'\]\)/.test(src) && /VOICE_AUDIO_PATHS\.has\(req\.path\) \? jsonAudio/.test(src) && /NOTES_PATHS = new Set\(\['\/api\/read\/passage'/.test(src) && !/'\/api\/tts'[^\n]*jsonAudio/.test(src));
  t('server: the TTS model and voice can be changed from Render without a code change', /GEMINI_TTS_MODEL/.test(block) && /GEMINI_TTS_VOICE/.test(block));
  t('server: the read passage is always recomputed on the server (pickPassage), never taken from the request', (m => m.includes('VOICE.pickPassage') && !/b\.passage|b\.text/.test(m))(block.slice(block.indexOf("'/api/read/evaluate'"), block.indexOf("'/api/talk/turn'"))));

  // ================= browser module =================
  const html = read('public/index.html'), vt = read('public/voice-tutor.js'), sw = read('public/sw.js');
  t('index.html: loads voice-tutor.js, has the two pages in the sidebar and the view switch', /<script src="\/voice-tutor\.js"><\/script>/.test(html) && /item\('read','mic','Padhne ki jaanch'\)/.test(html) && /item\('talk','mic','Baat-cheet'\)/.test(html) && /VIEW==='read'\|\|VIEW==='talk'\)body=window\.VOICE\?VOICE\.viewHTML\(VIEW\)/.test(html));
  t('index.html: leaving the screen stops the mic and the voice (go, navTo, back button, stopSay)', /if\(window\.VOICE\)VOICE\.leave\(\);\n draw\(\);window\.scrollTo/.test(html) && /VOICE\.leave\(\)\}?;?\s*draw\(\);openSide|v!=='read'&&v!=='talk'\)VOICE\.leave\(\)/.test(html) && /function stopSay\(\)\{\n if\(window\.VOICE\)VOICE\.stop\(\)/.test(html) && /VOICE\.leave\(\);NAV=e\.state\.nav/.test(html));
  t('index.html: the Suno button uses VOICE.speak with the language of the answer and shows its error message', /VOICE\.speak\(t,lc\)\.then\(r=>\{u\.say=false;if\(r&&r\.error\)u\.msg=r\.error;draw\(\)\}\)/.test(html) && /\.slice\(0,2\)/.test(html));
  t('index.html: Settings has the awaaz choice (auto, always AI, phone only) and it is saved', /settts/.test(html) && /\['auto','Phone ki awaaz, na ho to AI'\]/.test(html) && /ST\.tts=b\.dataset\.v==='ai'\|\|b\.dataset\.v==='browser'\?b\.dataset\.v:'auto';stSave\(\)/.test(html));
  t('service worker version was bumped for the new script', +/orbit-shell-v(\d+)/.exec(sw)[1] >= 32);
  t('voice-tutor.js: AI audio is played from a blob: URL (the CSP allows blob: media, not data:)', /createObjectURL/.test(vt) && !/new g\.Audio\('data:/.test(vt) && !/\.src = 'data:/.test(vt));
  t('voice-tutor.js: recordings stay in memory, nothing is written to storage except the parent consent tick', !/localStorage\.setItem\([^)]*clip|IndexedDB|indexedDB/.test(vt));

  let JSDOM; try { ({ JSDOM } = require('jsdom')); } catch (e) { console.log('SKIP browser tests (jsdom missing)'); return done(); }
  const mk = (extra = {}) => {
    const dom = new JSDOM('<!doctype html><body><div id="app"></div></body>', { runScripts: 'outside-only', url: 'https://orbit.test/' });
    const w = dom.window; const log = { api: [], spoken: [], draws: 0 };
    w.eval("var USER={uid:'u1'};var VIEW='read';var ST={};var DATA={courses:[{id:'c5-sci',class:5,subject:'Science',chapters:[{no:1,title:'Plants',sections:[{questions:[{id:'q'}]}]},{no:2,title:'Locked',locked:true,sections:[]}]},{id:'cc-1',custom:true,class:7,subject:'Geo',chapters:[{no:1,title:'Rivers',notes:'" + 'River water flows. '.repeat(20) + "'},{no:2,title:'Bare',notes:'short'}]}]};");
    w.draw = () => { log.draws++; };
    w.PARENT_KEY = { has: () => extra.key !== false, headers: () => ({}) };
    w.api = async (p, b) => { log.api.push({ p, b }); return typeof extra.api === 'function' ? extra.api(p, b) : {}; };
    w.speechSynthesis = extra.noSynth ? undefined : { speaking: false, cancel() { log.cancel = (log.cancel || 0) + 1; }, speak(u) { log.spoken.push({ text: u.text, lang: u.lang, voice: u.voice && u.voice.lang }); setTimeout(() => u.onend && u.onend(), 0); }, getVoices: () => (extra.voices || []), addEventListener() {}, removeEventListener() {} };
    w.SpeechSynthesisUtterance = function (t) { this.text = t; };
    w.eval(vt);
    return { w, d: w.document, log };
  };
  const wait = ms => new Promise(r => setTimeout(r, ms || 20));
  const hi = { lang: 'hi-IN' }, asv = { lang: 'as-IN' }, bnv = { lang: 'bn_IN' }, env = { lang: 'en-IN' };
  let b = mk({ voices: [hi, env] });
  let s = await b.w.VOICE.speak('Namaste', 'hi');
  t('speak: the phone\'s Hindi voice is used when it exists (auto mode)', s.ok && s.via === 'browser' && b.log.spoken[0].lang === 'hi-IN' && b.log.spoken[0].voice === 'hi-IN' && b.log.api.length === 0);
  b = mk({ voices: [hi, env], key: true, api: async (p) => { if (p === '/api/tts') return { mime: 'audio/wav', audio: Buffer.alloc(100).toString('base64') }; return {}; } });
  b.w.Audio = function () { this.play = () => { b.log.played = (b.log.played || 0) + 1; setTimeout(() => this.onended && this.onended(), 0); return Promise.resolve(); }; this.pause = () => {}; };
  b.w.URL.createObjectURL = () => 'blob:x'; b.w.URL.revokeObjectURL = () => {};
  s = await b.w.VOICE.speak('এইটো এটা পৰীক্ষা।', 'as');
  t('speak: no Assamese voice on the phone + parent key = AI voice via /api/tts, played from a blob', s.ok && s.via === 'ai' && b.log.api[0].p === '/api/tts' && b.log.api[0].b.lang === 'as' && b.log.played === 1 && b.log.spoken.length === 0);
  await b.w.VOICE.speak('এইটো এটা পৰীক্ষা।', 'as');
  t('speak: the same text is not bought twice (cached)', b.log.api.filter(x => x.p === '/api/tts').length === 1);
  b = mk({ voices: [hi, env], key: false });
  s = await b.w.VOICE.speak('x', 'as');
  t('speak: no Assamese voice and no parent key = a clear message, nothing is spoken in a wrong language', !s.ok && /Assamese awaaz nahi hai/.test(s.error) && /Gemini key/.test(s.error) && b.log.spoken.length === 0);
  s = await b.w.VOICE.speak('hello', 'en'); t('speak: English still works with the phone voice and no key', s.ok && b.log.spoken.length === 1);
  b = mk({ voices: [], key: false }); s = await b.w.VOICE.speak('Namaste', 'hi'); t('speak: Hindi with no voice list loaded still tries the phone (the list can load late)', s.ok && b.log.spoken.length === 1);
  b = mk({ noSynth: true, key: false }); s = await b.w.VOICE.speak('hello', 'en'); t('speak: a browser without speech gives a message, not an error', !s.ok && /suvidha nahi/.test(s.error));
  b = mk({ voices: [hi, env, bnv], key: true }); b.w.ST.tts = 'browser'; s = await b.w.VOICE.speak('x', 'bn'); t('speak: "phone only" never calls the AI even when a key is set', s.ok && b.log.api.length === 0 && b.log.spoken.length === 1);
  b = mk({ voices: [hi, env], key: true, api: async () => ({ mime: 'audio/wav', audio: Buffer.alloc(100).toString('base64') }) }); b.w.ST.tts = 'ai';
  b.w.Audio = function () { this.play = () => { setTimeout(() => this.onended && this.onended(), 0); return Promise.resolve(); }; this.pause = () => {}; }; b.w.URL.createObjectURL = () => 'blob:x'; b.w.URL.revokeObjectURL = () => {};
  s = await b.w.VOICE.speak('Namaste', 'hi'); t('speak: "always AI voice" uses the AI even if the phone has the voice', s.via === 'ai' && b.log.api.length === 1 && b.log.spoken.length === 0);
  b = mk({ voices: [env], key: true, api: async () => { throw new Error('parent key limit'); } }); s = await b.w.VOICE.speak('hello', 'as');
  t('speak: AI voice failing with no phone voice gives the server\'s message', !s.ok && /parent key limit/.test(s.error));
  const ch = b.w.VOICE.chunk('Pehla vaakya hai. ' + 'Doosra bada vaakya hai jo kaafi lamba chalta hai. '.repeat(20), 450);
  t('chunk: pieces are at most 450 characters, cut at sentence ends, nothing lost', ch.length > 1 && ch.every(x => x.length <= 450) && ch.every(x => /[.]$/.test(x)) && ch.join(' ').replace(/\s+/g, ' ').length >= 900);
  const longAns = Array.from({ length: 300 }, (_, i) => 'Vaakya number ' + i + '.').join(' '); b = mk({ voices: [hi, env], key: true, api: async () => ({ mime: 'audio/wav', audio: Buffer.alloc(100).toString('base64') }) });
  b.w.Audio = function () { this.play = () => { setTimeout(() => this.onended && this.onended(), 0); return Promise.resolve(); }; this.pause = () => {}; }; b.w.URL.createObjectURL = () => 'blob:x'; b.w.URL.revokeObjectURL = () => {}; b.w.ST.tts = 'ai';
  await b.w.VOICE.speak(longAns, 'hi'); t('speak: a very long answer is read in at most 3 AI pieces (cost cap)', b.log.api.length === 3);

  // ---- screens ----
  b = mk({ key: false });
  t('read screen without a parent key: explains and offers Advanced AI Features, no mic button', /parent ki Gemini key/.test(b.w.VOICE.viewHTML('read')) && /data-vt="adv"/.test(b.w.VOICE.viewHTML('read')) && !/data-vt="rec"/.test(b.w.VOICE.viewHTML('read')));
  t('talk screen without a parent key: same gate', /data-vt="adv"/.test(b.w.VOICE.viewHTML('talk')) && !/data-vt="tstart"/.test(b.w.VOICE.viewHTML('talk')));
  b = mk({ key: true });
  const rh = b.w.VOICE.viewHTML('read');
  t('read screen: chapter list has ready built-in chapters and own chapters with notes only', /Ch 1: Plants/.test(rh) && !/Locked/.test(rh) && /Ch 1: Rivers/.test(rh) && !/Ch 2: Bare/.test(rh));
  t('read screen: language list has the four languages', ['Hindi', 'English', 'Assamese', 'Bengali'].every(l => rh.includes('>' + l + '<')));
  b.d.body.innerHTML = '<select id="vtTopic"><option value="c5-sci|1">x</option></select>'; b.w.eval("VIEW='read'");
  const tp = b.d.getElementById('vtTopic'); tp.value = 'c5-sci|1'; tp.dispatchEvent(new b.w.Event('change', { bubbles: true }));
  t('choosing a chapter stores it for the screen', b.w.VOICE._t.state.R.key === 'c5-sci|1');
  const st2 = b.w.VOICE._t.state;
  t('ctxBody: built-in = course id + chapter; own chapter = class, subject, title, notes (no course id)', same(b.w.VOICE._t.ctxBody({ c: { id: 'c5-sci' }, ch: { no: 1 } }), { course: 'c5-sci', ch: 1 }) && (x => x.custom && x.custom.cls === 7 && x.custom.chapter === 'Rivers' && x.custom.notes.length > 200 && !('course' in x))(b.w.VOICE._t.ctxBody({ c: { custom: true, class: 7, subject: 'Geo' }, ch: { title: 'Rivers', notes: 'River water flows. '.repeat(20) } })));
  const ph = b.w.VOICE._t.passageHTML('The green chlorophyll, absorbs light today.', { wrong: [{ word: 'chlorophyll' }], missed: ['light'] });
  t('passage markup: wrong words red, skipped words yellow, punctuation does not hide a match, text is escaped', /<mark class="vtbad">chlorophyll,<\/mark>/.test(ph) && /<mark class="vtskip">light<\/mark>/.test(ph) && b.w.VOICE._t.passageHTML('<b>x</b>', null) === '&lt;b&gt;x&lt;/b&gt;');
  t('notes search words keep Assamese/Hindi vowel signs (so matching works in those scripts)', (m => m.length === 2 && m[0].length > 4)('সালোকসংশ্লেষণ প্ৰক্ৰিয়া'.match(/[\p{L}\p{M}\p{N}]{3,}/gu)) && /\\p\{L\}\\p\{M\}\\p\{N\}/.test(read('custom-core.js')) && /\\p\{L\}\\p\{M\}\\p\{N\}/.test(read('public/custom-course.js')));
  t('wordKey ignores punctuation and case in every script', b.w.VOICE._t.wordKey('Chlorophyll,') === 'chlorophyll' && b.w.VOICE._t.wordKey('সালোক।') === 'সালোক' && b.w.VOICE._t.wordKey('...') === '');

  // ---- reading check flow ----
  {
    const SENT = 'The green pigment chlorophyll catches sunlight for the leaf today.';
    const b2 = mk({ key: true, api: async (p, bd) => {
      if (p === '/api/read/passage') return { text: SENT, n: bd.n || 0, count: 3 };
      if (p === '/api/read/evaluate') return { accuracy: 70, wrong: [{ word: 'chlorophyll', said: 'clorofil', say: 'KLOR-o-fil' }], missed: ['sunlight'], praise: 'Achha', tip: 'Dhire padho', unclear: false, passage: SENT };
      return {};
    } });
    const S = b2.w.VOICE._t.state, d2 = b2.d;
    b2.w.eval("VIEW='read'"); S.R.key = 'c5-sci|1'; S.R.lang = 'en';
    const press = async (a) => { d2.body.innerHTML = '<button data-vt="' + a + '">x</button>'; d2.querySelector('button').click(); await wait(30); };
    await press('rpass');
    t('read flow: "Paath dikhao" asks the server for piece 0 of the chosen chapter and shows it', b2.log.api[0].p === '/api/read/passage' && b2.log.api[0].b.course === 'c5-sci' && b2.log.api[0].b.ch === 1 && b2.log.api[0].b.n === 0 && S.R.passage.text === SENT && b2.w.VOICE.viewHTML('read').includes('chlorophyll') && /data-vt="rec"/.test(b2.w.VOICE.viewHTML('read')));
    S.rec.clip = { blob: new b2.w.Blob(['x'.repeat(2000)], { type: 'audio/webm;codecs=opus' }), sec: 4 };
    t('read flow: with a recording the Check button appears', /data-vt="rcheck"/.test(b2.w.VOICE.viewHTML('read')));
    t('read flow: where the browser can record, the parent tick box is shown until ticked, and the mic button stays off without it', (() => { const b9 = mk({ key: true }); b9.w.navigator.mediaDevices = { getUserMedia: async () => ({}) }; b9.w.MediaRecorder = function () {}; const src2 = read('public/voice-tutor.js'); return /\(CAN && !voiceOk\(\)\) \? `<label/.test(src2) && /disabled' : ''\}\s*aria-pressed|\(!rec\.on && \(!voiceOk\(\) \|\| !CAN\)\)/.test(src2); })());
    await press('rcheck');
    const ev = b2.log.api.find(x => x.p === '/api/read/evaluate');
    t('read flow: the recording goes as base64 with its type, with the passage number and language, never the passage text', ev && ev.b.audio.mime === 'audio/webm' && ev.b.audio.data.length > 100 && ev.b.n === 0 && ev.b.lang === 'en' && ev.b.course === 'c5-sci' && !('text' in ev.b) && !('passage' in ev.b));
    const rv = b2.w.VOICE.viewHTML('read');
    t('read flow: result shows 70%, the wrong word with its right pronunciation, the skipped word, and marks them in the passage; the clip is dropped', /70% sahi/.test(rv) && /KLOR-o-fil/.test(rv) && /tumne bola: clorofil/.test(rv) && /<mark class="vtbad">chlorophyll<\/mark>/.test(rv) && /<mark class="vtskip">sunlight<\/mark>/.test(rv) && S.rec.clip === null);
    await press('rnext');
    t('read flow: "Agla paath" asks for piece 1 and clears the old result', b2.log.api.filter(x => x.p === '/api/read/passage').pop().b.n === 1 && S.R.res === null);
    S.rec.clip = { blob: new b2.w.Blob(['x'.repeat(2000)], { type: 'audio/webm' }), sec: 2 };
    const b3 = mk({ key: true, api: async () => { throw new Error('Aaj ki limit poori.'); } }); b3.w.VOICE._t.state.R.key = 'c5-sci|1'; b3.w.VOICE._t.state.R.passage = { text: SENT, n: 0, count: 3 }; b3.w.VOICE._t.state.rec.clip = { blob: new b3.w.Blob(['x'.repeat(2000)], { type: 'audio/webm' }), sec: 2 };
    b3.d.body.innerHTML = '<button data-vt="rcheck">x</button>'; b3.d.querySelector('button').click(); await wait(30);
    t('read flow: a server error is shown and the recording is kept so the child can retry', /Aaj ki limit poori/.test(b3.w.VOICE.viewHTML('read')) && b3.w.VOICE._t.state.rec.clip !== null && b3.w.VOICE._t.state.R.busy === false);
  }
  // ---- Baat-cheet flow ----
  {
    let turnNo = 0;
    const b4 = mk({ voices: [env, hi], key: true, api: async (p, bd) => {
      if (p !== '/api/talk/turn') return {};
      turnNo = bd.turn;
      return bd.turn === 0 ? { next: 'Q1 kya hai?', turn: 0, total: 4, done: false }
        : bd.turn < 4 ? { heard: 'jawab ' + bd.turn, verdict: bd.turn === 2 ? 'galat' : 'sahi', feedback: 'fb' + bd.turn, next: 'Q' + (bd.turn + 1) + ' kya hai?', turn: bd.turn, total: 4, done: false }
        : { heard: 'jawab 4', verdict: 'sahi', feedback: 'fb4', next: '', summary: 'Sab achha raha.', turn: 4, total: 4, done: true };
    } });
    const S = b4.w.VOICE._t.state, d4 = b4.d;
    b4.w.eval("VIEW='talk'"); S.T.key = 'c5-sci|1'; S.T.lang = 'hi';
    const press = async (a) => { d4.body.innerHTML = '<button data-vt="' + a + '">x</button>'; d4.querySelector('button').click(); await wait(40); };
    await press('tstart');
    t('talk flow: Shuru asks turn 0, shows the question and speaks it (phone voice)', b4.log.api[0].b.turn === 0 && S.T.q === 'Q1 kya hai?' && S.T.phase === 'wait' && b4.log.spoken.length >= 1 && b4.log.spoken[0].text === 'Q1 kya hai?' && b4.log.spoken[0].lang === 'hi-IN' && /Sawaal 1 \/ 4/.test(b4.w.VOICE.viewHTML('talk')));
    for (let k = 1; k <= 4; k++) {
      S.rec.clip = { blob: new b4.w.Blob(['x'.repeat(2000)], { type: 'audio/webm' }), sec: 3 };
      await press('tsend');
      if (k === 1) {
        const sent = b4.log.api[1].b;
        t('talk flow: an answer is sent with the turn number, the question it answers, the questions so far and the audio', sent.turn === 1 && sent.prevQ === 'Q1 kya hai?' && same(sent.asked, ['Q1 kya hai?']) && sent.audio.data.length > 100 && sent.course === 'c5-sci' && sent.lang === 'hi' && S.T.q === 'Q2 kya hai?' && S.T.log.length === 1 && S.rec.clip === null);
        t('talk flow: feedback and the next question are spoken together', b4.log.spoken.some(x => /fb1/.test(x.text) && /Q2 kya hai\?/.test(x.text)));
      }
    }
    const tv = b4.w.VOICE.viewHTML('talk');
    t('talk flow: after 4 answers it is done: summary, score and every answer listed, no mic button left', S.T.phase === 'done' && /3 \/ 4 sahi/.test(tv) && /Sab achha raha/.test(tv) && (tv.match(/Tumne kaha/g) || []).length === 4 && !/data-vt="rec"/.test(tv) && /Nayi baat-cheet/.test(tv) && turnNo === 4);
    t('talk flow: the last answer is spoken with the summary', b4.log.spoken.some(x => /fb4/.test(x.text) && /Sab achha raha/.test(x.text)));
    const b5 = mk({ key: true, api: async () => { throw new Error('Server ne jawab nahi diya.'); } }); b5.w.VOICE._t.state.T.key = 'c5-sci|1'; b5.w.eval("VIEW='talk'");
    b5.d.body.innerHTML = '<button data-vt="tstart">x</button>'; b5.d.querySelector('button').click(); await wait(30);
    t('talk flow: if the first question cannot be fetched the error shows and Shuru is available again', /Server ne jawab nahi diya/.test(b5.w.VOICE.viewHTML('talk')) && b5.w.VOICE._t.state.T.phase === 'idle' && /data-vt="tstart"/.test(b5.w.VOICE.viewHTML('talk')));
  }
  b.w.VOICE.leave(); t('leave() is safe to call when nothing is recording', true);
  done();
})();
function done() { console.log(pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0); }
