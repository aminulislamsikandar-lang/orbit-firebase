const express = require('express');
const path = require('path');
const crypto = require('crypto');
const QUIZ = require('./questions');

const app = express();
app.use(express.json({ limit: '10kb' }));

// ---- CORS + Firebase login check --------------------------------------------
// The website lives on Firebase Hosting; this server only answers AI requests from logged-in users.
// Render env vars: FIREBASE_PROJECT_ID (your Firebase project id) and ALLOWED_ORIGINS (comma separated,
// e.g. https://your-project.web.app,https://your-project.firebaseapp.com).
const admin = require('firebase-admin');
admin.initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID });
const ORIGINS = (process.env.ALLOWED_ORIGINS || '').split(',').map(x => x.trim()).filter(Boolean);
app.use('/api', (req, res, next) => {
  const o = req.headers.origin;
  if (o && ORIGINS.includes(o)) {
    res.setHeader('Access-Control-Allow-Origin', o);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
app.use('/api', async (req, res, next) => {
  if (req.path === '/questions') return next();
  const h = req.headers.authorization || '';
  const t = h.startsWith('Bearer ') ? h.slice(7) : '';
  if (!t) return res.status(401).json({ error: 'Pehle Google se log in karo.' });
  try { req.user = await admin.auth().verifyIdToken(t); next(); }
  catch (e) { res.status(401).json({ error: 'Login expire ho gaya. Dobara log in karo.' }); }
});
app.use(express.static(path.join(__dirname, 'public')));

const KEY = process.env.GEMINI_API_KEY;
// Models are tried in this order. Set GEMINI_MODEL in Render to choose the first one.
const MODELS = [...new Set([
  process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
  'gemini-3.5-flash-lite',
  'gemini-3.6-flash',
  'gemini-3.8-flash'
])];

// id -> {q, course, ch}. The client only ever sends an id (never free text),
// so nobody can use this server as a free general-purpose AI with your key.
const BY_ID = new Map();
QUIZ.courses.forEach(course => course.chapters.forEach(ch => (ch.sections || []).forEach(s => s.questions.forEach(q => BY_ID.set(q.id, { q, course, ch })))));

// What students may download (no hidden `context`): see questions-public.js
const PUBLIC = require('./questions-public');

const SYSTEM = `You are a friendly Class 10 Science tutor for SEBA/NCERT students.
Answer ONLY the given textbook question, at Class 10 level, in simple words.
Rules:
- For equations: give the BALANCED equation. Add state symbols (s), (l), (g), (aq) when asked or when relevant. Show a short balancing check (atoms on each side).
- For multiple-choice: state the correct option clearly, then explain why each wrong statement is wrong.
- For "why" questions: give the reason in 2-4 short sentences.
- If the question has parts (i), (ii), (a), (b)..., answer each part separately with its label.
- Write chemical formulas with Unicode subscripts (H₂O, Fe₂O₃, CO₂) and use → for arrows.
- Use plain text. You may use **bold** for key words. No headings, no tables, no LaTeX.
- Keep it concise: about 150 words for a single question, up to 300 words when there are several parts.`;

const SYSTEM_TR = `You are a careful translator for Class 10 science textbooks.
Translate the given text into the requested language.
Keep chemical formulas, equations, numbers, state symbols and **bold** markers exactly as they are.
Output ONLY the translation, nothing else.`;

const SYSTEM_VIS = `You draw simple educational diagrams as SVG for Class 10 students.
Output ONLY one <svg> element. No markdown fences, no explanation.
Requirements:
- xmlns="http://www.w3.org/2000/svg" and viewBox="0 0 640 360".
- First draw a white background <rect width="640" height="360" fill="#ffffff"/> so it is readable in dark mode.
- Dark text (#111), font-family Arial, font-size 15 to 20. Use coloured boxes and arrows (you may use <marker>).
- English labels, Unicode subscripts (H₂O).
- For a chemical equation: show reactants → products as boxes with an atom-count check under each side.
  For a concept or "why" question: a short labelled flow of 3 to 5 steps.
- No scripts, no images, no external links, no foreignObject. Keep it under 3500 characters.`;

const LANGS = {
  hing: 'Hinglish (Hindi written in English/Roman letters, simple everyday words; keep science terms in English)',
  as: 'Assamese (Assamese script)',
  bn: 'Bengali (Bengali script)'
};
const DTYPES = {
  auto: '',
  flow: 'Diagram type: FLOW DIAGRAM. 3 to 5 boxes joined by arrows showing the steps in order.',
  labelled: 'Diagram type: LABELLED DIAGRAM. A simple picture of the apparatus or particles with label lines naming each part.',
  compare: 'Diagram type: SIDE-BY-SIDE COMPARISON. Two columns with a heading each and 3 or 4 matching points.',
  mindmap: 'Diagram type: MIND MAP. The central idea in the middle with 4 to 6 branches.',
  chart: 'Diagram type: CHART. A simple bar chart or graph with axes and labels using the numbers in the answer; if there are no numbers, a simple labelled graph of the idea.',
  table: 'Diagram type: TABLE. A neat table drawn with SVG rectangles and text: a header row and 3 to 5 rows.'
};
const SYSTEM_MORE = `You are a friendly Class 10 Science tutor for SEBA/NCERT students.
You are given a textbook question and its answer. Write the extra help asked for, at Class 10 level, in simple English.
Rules: plain text only, you may use **bold** for key words; no headings, no tables, no LaTeX; write chemical formulas with Unicode subscripts (H₂O) and use → for arrows; keep the science correct.`;
const MORE_KINDS = {
  mnemonic: 'Create one easy mnemonic (a short phrase or rhyme) that helps remember the key points of this answer. Then say in 1 or 2 lines what each part stands for. Maximum 80 words.',
  analogy: 'Give one simple everyday analogy (from home, school or village life) that explains the main idea of this answer. 3 to 5 short sentences, then one line on where the analogy stops fitting. Maximum 110 words.',
  kid: 'Explain this answer the way you would to a 10-year-old child: very simple words, short sentences, one small everyday example. Keep the science correct. Maximum 120 words.',
  full: 'Write this answer the way a SEBA Class 10 exam answer should be written to score full marks: the correct statement or definition first, the balanced equation with state symbols if relevant, key terms in **bold**, and a one-line conclusion. 4 to 6 lines, exam style.',
  points: 'Give 4 to 6 key points to revise this answer. One point per line starting with "- ". Each point under 15 words.',
  mistakes: 'List 3 common mistakes students make on this question. For each: the mistake, then the correct version. 1 or 2 lines each.',
  mcq: 'Make 3 multiple-choice practice questions on the same topic, Class 10 level. Do not repeat the original question. Use exactly this format for each, with a blank line between questions:\nQ1. question\nA) option\nB) option\nC) option\nD) option\nAnswer: X (one-line reason)'
};
// ---- per-subject AI instructions -----------------------------------------
// Science keeps the prompts above. English (and any other subject) gets its own set.
const SCIENCE_P = { answer: SYSTEM, tr: SYSTEM_TR, vis: SYSTEM_VIS, more: SYSTEM_MORE, kinds: MORE_KINDS };
function englishProfile(cls) {
  const answer = `You are a friendly Class ${cls} English tutor for students in Assam, working from their textbook.
Answer ONLY the given textbook question, in simple English that a Class ${cls} student can write in an exam.
Rules:
- Use the lesson text and notes given in the context (the poem or story). Stay faithful to it. Never invent lines or events.
- For comprehension questions: 2 to 4 short sentences.
- If the question has parts (a), (b), (c) or (i), (ii), answer each part separately with its label.
- For "what do these lines mean" questions: say what the lines mean in simple words, then link them to the main idea of the lesson.
- For fill-in-the-blank or comparison items (for example "___ is compared to a ___"): give the answer first, then one short reason.
- For grammar or literary-device questions: define the term in one line, then apply it to the example.
- Plain text. You may use **bold** for key words. No headings, no tables, no LaTeX.
- Keep it concise: about 60 to 120 words for a single question, up to 200 words when there are several parts.`;
  const tr = `You are a careful translator for school English textbooks.
Translate the given text into the requested language.
Keep quoted English words, lines of the poem or story, names, numbers and **bold** markers exactly as they are.
Output ONLY the translation, nothing else.`;
  const vis = `You draw simple educational diagrams as SVG for Class ${cls} English students.
Output ONLY one <svg> element. No markdown fences, no explanation.
Requirements:
- xmlns="http://www.w3.org/2000/svg" and viewBox="0 0 640 360".
- First draw a white background <rect width="640" height="360" fill="#ffffff"/> so it is readable in dark mode.
- Dark text (#111), font-family Arial, font-size 15 to 20. Use coloured boxes and arrows (you may use <marker>).
- For a metaphor or comparison: two boxes joined by an arrow labelled "is compared to".
  For a poem or story idea: a mind map or a short labelled flow of 3 to 5 boxes using words from the text.
- No scripts, no images, no external links, no foreignObject. Keep it under 3500 characters.`;
  const more = `You are a friendly Class ${cls} English tutor for students in Assam.
You are given a textbook question and its answer. Write the extra help asked for, at Class ${cls} level, in simple English.
Rules: plain text only, you may use **bold** for key words; no headings, no tables, no LaTeX; keep the meaning of the lesson correct.`;
  const kinds = {
    ...MORE_KINDS,
    kid: 'Explain this answer the way you would to a 10-year-old child: very simple words, short sentences, one small everyday example. Keep the meaning of the lesson correct. Maximum 120 words.',
    full: `Write this answer the way a Class ${cls} English exam answer should be written to score full marks: a direct first sentence that answers the question, two or three supporting sentences that refer to the text, and a one-line conclusion. 4 to 6 lines, exam style.`,
    mcq: `Make 3 multiple-choice practice questions on the same lesson, Class ${cls} level. Do not repeat the original question. Use exactly this format for each, with a blank line between questions:\nQ1. question\nA) option\nB) option\nC) option\nD) option\nAnswer: X (one-line reason)`
  };
  return { answer, tr, vis, more, kinds };
}
function mathsProfile(cls) {
  const answer = `You are a friendly Class ${cls} Mathematics tutor for students in Assam, working from their textbook.
Solve ONLY the given textbook question, at Class ${cls} level, the way the textbook teaches.
Rules:
- Show the working step by step, one short line per step, then give the final answer in **bold**.
- If the question has parts (i), (ii), ... or (a), (b), ..., solve each part separately with its label, one or two lines each.
- For multiple-choice: show the working, then state the correct option clearly.
- For true/false: say T or F and give one short reason or a counter-example.
- For fill in the blanks: give the missing number or word. If asked, name the property used (closure, commutative, associative, distributive, identity, inverse).
- For "verify" questions: work out both sides, show they are equal, then name the property.
- Follow BODMAS; "of" means multiplication. Be very careful with the signs of negative numbers and double-check every calculation before answering.
- Use the symbols × and ÷, and Unicode superscripts for powers (for example (–1)¹⁰³). Plain text only; you may use **bold**. No headings, no tables, no LaTeX.
- Keep it concise: about 100 words for a single question, up to 250 words when there are many parts.`;
  const tr = `You are a careful translator for school mathematics textbooks.
Translate the given text into the requested language.
Keep numbers, symbols, equations, operation signs and **bold** markers exactly as they are.
Output ONLY the translation, nothing else.`;
  const vis = `You draw simple educational diagrams as SVG for Class ${cls} mathematics students.
Output ONLY one <svg> element. No markdown fences, no explanation.
Requirements:
- xmlns="http://www.w3.org/2000/svg" and viewBox="0 0 640 360".
- First draw a white background <rect width="640" height="360" fill="#ffffff"/> so it is readable in dark mode.
- Dark text (#111), font-family Arial, font-size 15 to 20. Use coloured boxes and arrows (you may use <marker>).
- For integer operations: a number line with tick marks and curved arrows showing the jumps (right for positive, left for negative) and the answer marked.
  For a property or rule: a few labelled boxes showing both sides of the equation. For a word problem: a labelled vertical or horizontal line with the start and end values.
- No scripts, no images, no external links, no foreignObject. Keep it under 3500 characters.`;
  const more = `You are a friendly Class ${cls} Mathematics tutor for students in Assam.
You are given a textbook question and its answer. Write the extra help asked for, at Class ${cls} level, in simple English.
Rules: plain text only, you may use **bold** for key words; no headings, no tables, no LaTeX; use × and ÷ and keep every calculation correct.`;
  const kinds = {
    ...MORE_KINDS,
    mnemonic: 'Create one easy memory trick (a short phrase, rhyme or rule of thumb) that helps remember the main rule used in this answer. Then say in 1 or 2 lines what each part stands for. Maximum 80 words.',
    kid: 'Explain this solution the way you would to a 10-year-old child: very simple words, short sentences, one small everyday example (money, temperature, stairs). Keep the maths correct. Maximum 120 words.',
    full: `Write this solution the way a Class ${cls} mathematics exam answer should be written to score full marks: one line on what is given and what is asked, the working step by step, and the final answer on its own line. 4 to 8 lines, exam style.`,
    mistakes: 'List 3 common mistakes students make on this kind of question (for example sign errors). For each: the mistake, then the correct step. 1 or 2 lines each.',
    mcq: `Make 3 multiple-choice practice questions on the same topic, Class ${cls} level, with small easy numbers. Do not repeat the original question. Use exactly this format for each, with a blank line between questions:\nQ1. question\nA) option\nB) option\nC) option\nD) option\nAnswer: X (one-line working)`
  };
  return { answer, tr, vis, more, kinds };
}
// Science for other classes (for example Class 7) reuses the Class 10 prompts with the class changed and a few extra rules.
function scienceProfile(cls) {
  if (cls === 10) return SCIENCE_P;
  const fix = t => t.replace(/SEBA Class 10/g, `Class ${cls}`).replace(/Class 10/g, `Class ${cls}`).replace(/SEBA\/NCERT students/g, 'students in Assam, working from their textbook');
  const extra = `- Use the chapter notes given in the context and stay faithful to the textbook. Do not invent facts.
- For "match the following" and "give one word" questions: give each answer on its own line. For fill in the blanks: give the missing words. For true/false: say T or F with one short reason.
- For assertion-reason questions: say which option (a, b, c or d) is correct and explain in 2 or 3 short sentences.
- For picture-based questions the picture is described in the question; answer from that description.
`;
  return {
    answer: fix(SYSTEM).replace('- Keep it concise: about 150 words for a single question, up to 300 words when there are several parts.', extra + '- Keep it concise: about 100 words for a single question, up to 250 words when there are several parts.'),
    tr: fix(SYSTEM_TR),
    vis: fix(SYSTEM_VIS),
    more: fix(SYSTEM_MORE),
    kinds: Object.fromEntries(Object.entries(MORE_KINDS).map(([k, v]) => [k, fix(v)]))
  };
}
const profileFor = course => course.subject === 'English' ? englishProfile(course.class)
  : course.subject === 'Mathematics' ? mathsProfile(course.class) : scienceProfile(course.class);

const MAX_CLIENT_TEXT = 2500;   // saved answers the browser may send back if the server forgot them (free-tier restarts)
const hash = t => crypto.createHash('sha1').update(String(t)).digest('hex').slice(0, 10);
const clientText = t => (typeof t === 'string' && t.length > 0 && t.length <= MAX_CLIENT_TEXT) ? t : null;

function buildPrompt(q, course, ch) {
  const parts = [];
  if (course && course.subject === 'English' && ch) parts.push(`Lesson: ${ch.title}${ch.author ? ' by ' + ch.author : ''}`);
  if (course && (course.subject === 'Mathematics' || (course.subject === 'Science' && course.class !== 10)) && ch) parts.push(`Chapter: ${ch.title}`);
  parts.push(`Question ${q.label || q.no}: ${q.text}`);
  if (q.table) {
    parts.push('Table:');
    parts.push(q.table.head.join(' | '));
    (q.table.rows || []).forEach(r => parts.push(r.map(c => c || '(blank)').join(' | ')));
  }
  (q.parts || []).forEach(p => parts.push(p));
  (q.options || []).forEach(o => parts.push(o));
  if (ch && ch.context) parts.push('\n(Textbook text and notes for this lesson, do not repeat them: ' + ch.context + ')');
  if (q.context) parts.push('\n(Textbook context, do not repeat it: ' + q.context + ')');
  return `Reply in simple English.\n\n${parts.join('\n')}`;
}

// ---- caches + rate limit -------------------------------------------------
const CACHE = new Map();   // "id|en", "id|hi", "id|tr|hi", "id|vis"
const HITS = new Map();
function limited(ip) {
  const now = Date.now();
  const arr = (HITS.get(ip) || []).filter(t => now - t < 60000);
  arr.push(now);
  HITS.set(ip, arr);
  return arr.length > 20;
}

// ---- one place that talks to Gemini -------------------------------------
// Tries each model in order. If Google says "busy" (503/429/500) or is slow,
// waits a moment and moves on. Stays under 55s so the browser never gives up first.
async function gemini(system, prompt, opts = {}) {
  const t0 = Date.now();
  const DEADLINE = t0 + 55000;
  let lastStatus = 0;
  for (const model of MODELS) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      const left = DEADLINE - Date.now();
      if (left < 4000) return { status: lastStatus };
      try {
        const r = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': KEY },
            signal: AbortSignal.timeout(Math.min(20000, left)),
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: system }] },
              contents: [{ role: 'user', parts: [{ text: prompt }] }],
              generationConfig: { temperature: opts.temperature ?? 0.3, maxOutputTokens: opts.maxTokens || 4096 }
            })
          }
        );
        const j = await r.json().catch(() => ({}));
        if (r.ok) {
          const text = ((j.candidates || [])[0]?.content?.parts || []).map(p => p.text || '').join('').trim();
          if (text) { console.log('Gemini ok', model, (Date.now() - t0) + 'ms'); return { text }; }
          console.error('Gemini empty answer', model);
          break;
        }
        lastStatus = r.status;
        console.error('Gemini error', r.status, model, JSON.stringify(j).slice(0, 300));
        if ((r.status === 503 || r.status === 429 || r.status === 500) && attempt === 1) {
          await new Promise(ok => setTimeout(ok, 1200));
          continue;
        }
        break;
      } catch (e) {
        console.error('Gemini request failed', model, (Date.now() - t0) + 'ms', e.name, e.message);
        lastStatus = 504;
        break;
      }
    }
  }
  return { status: lastStatus };
}

function failMsg(status) {
  if (status === 429) return 'AI ki free limit abhi poori ho gayi hai. Thodi der baad try karo.';
  if (status === 503 || status === 504) return 'Google ka AI abhi busy hai. 1-2 minute baad dobara try karo.';
  return 'AI se answer nahi mila. Dobara try karo.';
}

// Common checks for every AI route. Returns {q, course, ch}, or null after replying.
function guard(req, res) {
  const hit = BY_ID.get((req.body || {}).id);
  if (!hit) { res.status(400).json({ error: 'Unknown question.' }); return null; }
  return hit;
}
function guardAI(req, res) {
  if (!KEY) { res.status(500).json({ error: 'Server mein GEMINI_API_KEY set nahi hai.' }); return false; }
  if (limited(req.ip)) { res.status(429).json({ error: 'Thoda ruko, bahut zyada requests. 1 minute baad try karo.' }); return false; }
  return true;
}

app.get('/api/questions', (req, res) => res.json(PUBLIC));

// ---- answer ---------------------------------------------------------------
app.post('/api/answer', async (req, res) => {
  const hit = guard(req, res); if (!hit) return;
  const { q, course, ch } = hit, P = profileFor(course);
  const { id, fresh } = req.body;
  const key = id + '|en';
  if (fresh) for (const k of [...CACHE.keys()]) if (k.startsWith(id + '|')) CACHE.delete(k); // old translations/diagram are stale too
  if (!fresh && CACHE.has(key)) return res.json({ answer: CACHE.get(key), cached: true });
  if (!guardAI(req, res)) return;
  const r = await gemini(P.answer, buildPrompt(q, course, ch));
  if (!r.text) return res.status(502).json({ error: failMsg(r.status) });
  CACHE.set(key, r.text);
  res.json({ answer: r.text });
});

// ---- translate (Hindi / Assamese) ----------------------------------------
app.post('/api/translate', async (req, res) => {
  const hit = guard(req, res); if (!hit) return;
  const { q, course, ch } = hit, P = profileFor(course);
  const { id, to } = req.body;
  if (!LANGS[to]) return res.status(400).json({ error: 'Language supported nahi hai.' });
  // Translate exactly the answer the student sees (the browser sends it); fall back to the server's copy.
  const base = clientText(req.body.text) || CACHE.get(id + '|en');
  if (!base) return res.status(400).json({ error: 'Pehle AI Answer banao, phir translate karo.' });
  const key = id + '|tr|' + to + '|' + hash(base);
  if (CACHE.has(key)) return res.json({ text: CACHE.get(key), cached: true });
  if (!guardAI(req, res)) return;
  const r = await gemini(P.tr, `Translate into ${LANGS[to]}:\n\n${base}`, { temperature: 0.2 });
  if (!r.text) return res.status(502).json({ error: failMsg(r.status) });
  CACHE.set(key, r.text);
  res.json({ text: r.text });
});

// ---- extra help (3-dot menu) ---------------------------------------------
app.post('/api/more', async (req, res) => {
  const hit = guard(req, res); if (!hit) return;
  const { q, course, ch } = hit, P = profileFor(course);
  const { id, kind } = req.body;
  if (!Object.prototype.hasOwnProperty.call(P.kinds, kind)) return res.status(400).json({ error: 'Ye option supported nahi hai.' });
  const base = clientText(req.body.text) || CACHE.get(id + '|en');
  if (!base) return res.status(400).json({ error: 'Pehle AI Answer banao, phir ye option use karo.' });
  const key = id + '|more|' + kind + '|' + hash(base);
  if (CACHE.has(key)) return res.json({ text: CACHE.get(key), cached: true });
  if (!guardAI(req, res)) return;
  const prompt = `${buildPrompt(q, course, ch)}\n\nHere is the answer:\n${base}\n\nExtra help kind: ${kind}.\n${P.kinds[kind]}`;
  const r = await gemini(P.more, prompt, { temperature: 0.5 });
  if (!r.text) return res.status(502).json({ error: failMsg(r.status) });
  CACHE.set(key, r.text);
  res.json({ text: r.text });
});

// ---- diagram (SVG) --------------------------------------------------------
function cleanSvg(raw) {
  const m = String(raw || '').match(/<svg[\s\S]*<\/svg>/i);
  if (!m) return null;
  let svg = m[0];
  if (svg.length > 20000) return null;
  if (/<script|<foreignObject|<iframe|<image|\son[a-z]+\s*=|javascript:/i.test(svg)) return null;
  if (!/xmlns\s*=/.test(svg.slice(0, 200))) svg = svg.replace(/<svg/i, '<svg xmlns="http://www.w3.org/2000/svg"');
  return svg;
}
app.post('/api/visual', async (req, res) => {
  const hit = guard(req, res); if (!hit) return;
  const { q, course, ch } = hit, P = profileFor(course);
  const { id, fresh } = req.body;
  const dtype = Object.prototype.hasOwnProperty.call(DTYPES, req.body.dtype) ? req.body.dtype : 'auto';
  const base = clientText(req.body.text) || CACHE.get(id + '|en') || '';
  const key = id + '|vis|' + dtype + '|' + hash(base);
  if (fresh) CACHE.delete(key);
  if (CACHE.has(key)) return res.json({ svg: CACHE.get(key), cached: true });
  if (!guardAI(req, res)) return;
  const prompt = buildPrompt(q, course, ch) + (base ? `\n\nHere is the answer to illustrate:\n${base}` : '') + '\n\nDraw ONE clear diagram for this.' + (DTYPES[dtype] ? '\n' + DTYPES[dtype] : '')
    + (fresh ? '\nThe student did not like the previous diagram. Use a clearly different layout and style.' : '');
  const r = await gemini(P.vis, prompt, { temperature: 0.4, maxTokens: 4096 });
  if (!r.text) return res.status(502).json({ error: failMsg(r.status) });
  const svg = cleanSvg(r.text);
  if (!svg) return res.status(502).json({ error: 'Diagram sahi nahi bana. Dobara try karo.' });
  CACHE.set(key, svg);
  res.json({ svg });
});

// ---- recorded videos (private Backblaze B2 bucket, short-lived links) -------------
// Render env vars: B2_ENDPOINT (e.g. s3.us-west-004.backblazeb2.com), B2_KEY_ID, B2_APP_KEY, B2_BUCKET.
// REQUIRE_SUBSCRIPTION=true makes non-free videos need an active subscription: Firestore doc subscriptions/<uid> with a
// timestamp field `until` (you edit it by hand in the Firebase console; users cannot write it, see firestore.rules).
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const VIDEOS = require('./videos');
const VBY = new Map(VIDEOS.map(v => [v.id, v]));
const B2HOST = (process.env.B2_ENDPOINT || '').replace(/^https?:\/\//, '').replace(/\/$/, '');
const B2 = B2HOST && process.env.B2_KEY_ID && process.env.B2_APP_KEY && process.env.B2_BUCKET
  ? new S3Client({
      region: (B2HOST.match(/^s3\.([^.]+)\./) || [])[1] || 'us-west-004',
      endpoint: 'https://' + B2HOST,
      credentials: { accessKeyId: process.env.B2_KEY_ID, secretAccessKey: process.env.B2_APP_KEY },
      requestChecksumCalculation: 'WHEN_REQUIRED'
    })
  : null;

async function hasAccess(req, v) {
  if (process.env.REQUIRE_SUBSCRIPTION !== 'true' || v.free) return true;
  try {
    // Read the student's own subscription doc with THEIR login token, so Firestore rules decide (no service account needed).
    const r = await fetch(`https://firestore.googleapis.com/v1/projects/${process.env.FIREBASE_PROJECT_ID}/databases/(default)/documents/subscriptions/${req.user.uid}`,
      { headers: { Authorization: req.headers.authorization } });
    if (!r.ok) return false;
    const until = ((await r.json()).fields || {}).until;
    return !!(until && until.timestampValue && new Date(until.timestampValue) > new Date());
  } catch (e) { return false; }
}

app.post('/api/video', async (req, res) => {
  const v = VBY.get((req.body || {}).id);
  if (!v) return res.status(400).json({ error: 'Video nahi mili.' });
  if (!B2) return res.status(500).json({ error: 'Video storage abhi set nahi hai.' });
  if (!(await hasAccess(req, v))) return res.status(403).json({ error: 'Ye video dekhne ke liye subscription chahiye.' });
  try {
    const url = await getSignedUrl(B2, new GetObjectCommand({ Bucket: process.env.B2_BUCKET, Key: v.key }), { expiresIn: 3600 });
    // Try the link once ourselves, so a storage problem shows up as a clear message instead of a dead video player.
    const chk = await fetch(url, { headers: { Range: 'bytes=0-0' } });
    if (!chk.ok) {
      const body = (await chk.text()).slice(0, 400);
      console.error('B2 check failed', chk.status, body);
      const code = (body.match(/<Code>([^<]+)<\/Code>/) || [])[1] || '';
      return res.status(502).json({ error: 'Video storage ne mana kiya (' + chk.status + (code ? ' ' + code : '') + '). Key, bucket ya endpoint check karo.' });
    }
    res.json({ url });
  } catch (e) {
    console.error('B2 sign failed', e.message);
    res.status(502).json({ error: 'Video ka link nahi ban paya. Dobara try karo.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Orbit AI tutor running on port ' + PORT));
