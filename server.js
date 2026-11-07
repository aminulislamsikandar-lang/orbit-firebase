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
- For letters and applications: give the full format (To, Date, Subject, salutation, body in 2 short paragraphs, closing, name, class and roll no.) in plain text with line breaks. Use the model letter in the context if there is one.
- For true/false items: say True or False first, then one short reason.
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
// Translation styles the student can choose in the 3-dot menu. Each builds the prompt for the translator.
const TR_STYLES = {
  para: (l, t) => `Translate into ${l}:\n\n${t}`,
  sent: (l, t) => `Translate into ${l}, sentence by sentence.\nFor every sentence of the text below, write the original English sentence on one line, then on the next line write its translation starting with "→ ". Leave one blank line between sentences. Keep labels such as (a), (b), numbering, formulas and equations with the sentence they belong to. Do not add anything else.\n\n${t}`,
  words: (l, t) => `From the text below pick the 6 to 10 hardest words or terms a school student may not know. Do NOT translate the whole text.\nFormat: one per line, starting with "- ", as: English word: meaning in ${l}.\nKeep formulas as they are. Output only this list.\n\n${t}`,
  brackets: (l, t) => `Rewrite the text below in English exactly as it is, but after each difficult word or term put its meaning in ${l} inside round brackets, for example: word (meaning). Add brackets only for hard words (at most about one word in ten). Keep every other word, number, formula, equation and **bold** marker unchanged. Output only the rewritten text.\n\n${t}`
};
app.post('/api/translate', async (req, res) => {
  const hit = guard(req, res); if (!hit) return;
  const { q, course, ch } = hit, P = profileFor(course);
  const { id, to } = req.body;
  if (!LANGS[to]) return res.status(400).json({ error: 'Language supported nahi hai.' });
  const style = Object.prototype.hasOwnProperty.call(TR_STYLES, req.body.style) ? req.body.style : 'para';
  // Translate exactly the answer the student sees (the browser sends it); fall back to the server's copy.
  const base = clientText(req.body.text) || CACHE.get(id + '|en');
  if (!base) return res.status(400).json({ error: 'Pehle AI Answer banao, phir translate karo.' });
  const key = id + '|tr|' + to + '|' + style + '|' + hash(base);
  if (CACHE.has(key)) return res.json({ text: CACHE.get(key), cached: true });
  if (!guardAI(req, res)) return;
  const r = await gemini(P.tr, TR_STYLES[style](LANGS[to], base), { temperature: 0.2 });
  if (!r.text) return res.status(502).json({ error: failMsg(r.status) });
  CACHE.set(key, r.text);
  res.json({ text: r.text });
});

// ---- lesson reader: translate one paragraph of the chapter text ------------
const COURSE_BY_ID = new Map(QUIZ.courses.map(c => [c.id, c]));
const lessonOf = (cid, no) => { const c = COURSE_BY_ID.get(cid); const ch = c && c.chapters.find(x => x.no === +no); return c && ch ? { course: c, ch } : null; };
app.post('/api/lesson', async (req, res) => {
  const { course, ch: chNo, p, to } = req.body || {};
  const hit = lessonOf(course, chNo);
  const text = hit && (hit.ch.lesson || [])[+p];
  if (!text) return res.status(400).json({ error: 'Ye paragraph nahi mila.' });
  if (!LANGS[to]) return res.status(400).json({ error: 'Language supported nahi hai.' });
  const style = Object.prototype.hasOwnProperty.call(TR_STYLES, req.body.style) ? req.body.style : 'para';
  const key = ['lesson', course, chNo, p, to, style].join('|');
  if (CACHE.has(key)) return res.json({ text: CACHE.get(key), cached: true });
  if (!guardAI(req, res)) return;
  const r = await gemini(englishProfile(hit.course.class).tr, TR_STYLES[style](LANGS[to], text), { temperature: 0.2 });
  if (!r.text) return res.status(502).json({ error: failMsg(r.status) });
  CACHE.set(key, r.text);
  res.json({ text: r.text });
});

// ---- grammar / writing rules explained by the AI ---------------------------
app.post('/api/rules', async (req, res) => {
  const { course, ch: chNo, sec, to } = req.body || {};
  const hit = lessonOf(course, chNo);
  const section = hit && (hit.ch.sections || [])[+sec];
  if (!section || !section.rules) return res.status(400).json({ error: 'Is section ke liye rules nahi hain.' });
  if (!LANGS[to]) return res.status(400).json({ error: 'Language supported nahi hai.' });
  const key = ['rules', course, chNo, sec, to].join('|');
  if (CACHE.has(key)) return res.json({ text: CACHE.get(key), cached: true });
  if (!guardAI(req, res)) return;
  const { kind, topic } = section.rules, cls = hit.course.class;
  const system = `You are a friendly English teacher for Class ${cls} students in Assam. You explain standard English ${kind === 'writing' ? 'writing (letter and application) format' : 'grammar rules'} in ${LANGS[to]}.
Rules for your reply:
- Explain in ${LANGS[to]}. Keep every English example, grammar term (in English, with the local-language meaning once) and the parts of a letter in English.
- Follow the standard school syllabus (SEBA/NCERT level). Be correct and do not invent exceptions.
- Plain text. You may use **bold** for key words. No headings with #, no tables, no LaTeX.
- Short numbered points. Every rule is followed by one or two English example sentences, each with its meaning in the local language.
- Use the textbook examples given in the notes where they fit.`;
  const body = kind === 'writing'
    ? `Topic: ${topic}\nExplain the standard format step by step: where the sender's details, date, receiver, subject line, salutation, body (opening line, reason, request), closing line, and signature (name, class, roll no.) go; what language and tone to use; 5 common mistakes; then one short model application in English with the local-language meaning of its first paragraph.`
    : `Topic: ${topic}\nExplain the standard rules: what it is, its kinds, the rule for each kind with examples, the exceptions the textbook mentions, 5 common mistakes, and a quick memory trick.\nTextbook notes: ${hit.ch.context || ''}`;
  const r = await gemini(system, body, { temperature: 0.3, maxTokens: 6000 });
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
  if (req.body.fresh) CACHE.delete(key);
  if (CACHE.has(key)) return res.json({ text: CACHE.get(key), cached: true });
  if (!guardAI(req, res)) return;
  const prompt = `${buildPrompt(q, course, ch)}\n\nHere is the answer:\n${base}\n\nExtra help kind: ${kind}.\n${P.kinds[kind]}` + (req.body.fresh ? '\nThe student wants a different version than before. Use new wording and a different example.' : '');
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

// ---- one picture under the answer (Wikipedia + Wikimedia Commons, optional Pexels) ---------------
// Only for Science. The server searches Commons with words from the question, keeps the best match and remembers it,
// so the search runs once per question, not once per student. No good match = {} and the app shows nothing.
// Optional Render env vars: PEXELS_API_KEY (extra photo source) and WIKI_UA: a contact for Wikimedia, e.g. "OrbitTutor/1.0 (you@example.com)".
const WIKI_UA = process.env.WIKI_UA || 'OrbitTutor/1.0 (school tutor app, Assam India)';
const IMG_CACHE = new Map();     // question id -> {url,page,title,by,lic,licUrl} or null (no good picture)
const IMG_PENDING = new Map();   // question id -> promise (two students asking at once share one search)
const IMG_HITS = new Map();
const STOP = new Set(('a an the is are was were be been being of in on at to for and or but why what how which who whom when where does do did ' +
  'give write state explain define name list differentiate distinguish following given below above with by from that this it its as can should ' +
  'would will if then than into any all each one two three four only also you your we our they their them these those not no yes find mention ' +
  'identify justify describe answer question class chapter student students textbook example examples called using use used show shown between ' +
  'during after before about there here some such more most other another very much many make made makes').split(' '));
function keywords(text, n) {
  const seen = new Set(), out = [];
  for (const w of String(text || '').toLowerCase().replace(/[^a-z\s-]/g, ' ').split(/[\s-]+/)) {
    if (w.length < 3 || STOP.has(w) || seen.has(w)) continue;
    seen.add(w); out.push(w);
    if (out.length >= n) break;
  }
  return out;
}
const strip = h => String(h || '').replace(/<[^>]*>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim();
const BAD_TITLE = /\b(logo|flag|icon|stamp|signature|portrait|poster|cover|screenshot|banner|coat of arms|diploma|certificate)\b/i;
const OK_MIME = new Set(['image/jpeg', 'image/png', 'image/svg+xml', 'image/gif', 'image/webp']);

async function commonsSearch(terms) {
  const url = 'https://commons.wikimedia.org/w/api.php?' + new URLSearchParams({
    action: 'query', format: 'json', generator: 'search', gsrnamespace: '6', gsrlimit: '10', gsrsearch: terms.join(' '),
    prop: 'imageinfo', iiprop: 'url|mime|size|extmetadata', iiurlwidth: '800'
  });
  const r = await fetch(url, { headers: { 'User-Agent': WIKI_UA, 'Api-User-Agent': WIKI_UA }, signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error('commons ' + r.status);
  const j = await r.json();
  return Object.values((j.query && j.query.pages) || {}).sort((a, b) => (a.index || 0) - (b.index || 0));
}
// Picks the first result that is a real picture and mentions enough of our words.
function pickImage(pages, words, need) {
  let best = null;
  for (const p of pages) {
    const ii = (p.imageinfo || [])[0];
    if (!ii || !OK_MIME.has(ii.mime) || (ii.width || 0) < 300 || (ii.height || 0) < 200) continue;
    const title = String(p.title || '').replace(/^File:/, '').replace(/\.[a-z]+$/i, '');
    if (BAD_TITLE.test(title)) continue;
    const em = ii.extmetadata || {};
    if (em.NonFree && String(em.NonFree.value).toLowerCase() === 'true') continue;
    const hay = (title + ' ' + strip((em.ImageDescription || {}).value)).toLowerCase();
    const hits = words.filter(w => hay.includes(w)).length;
    if (hits < need) continue;
    const url = ii.thumburl || ii.url, page = ii.descriptionurl;
    if (!/^https:\/\/upload\.wikimedia\.org\//.test(url || '') || !/^https:\/\/commons\.wikimedia\.org\//.test(page || '')) continue;
    if (!best || hits > best.hits) best = {
      hits, url, page, title: title.slice(0, 120),
      by: strip((em.Artist || {}).value).slice(0, 80),
      lic: strip((em.LicenseShortName || {}).value).slice(0, 40),
      licUrl: /^https:\/\//.test(strip((em.LicenseUrl || {}).value)) ? strip((em.LicenseUrl || {}).value) : ''
    };
    if (best.hits >= words.length) break;
  }
  if (!best) return null;
  delete best.hits;
  return best;
}
const SYSTEM_TOPIC = `You choose a picture topic for a school science textbook question.
Reply with ONLY one English Wikipedia article title (1 to 4 words) naming the specific thing a photo or diagram should show, for example: Food chain, Photosynthesis, Human heart, Rusting of iron.
If the question is an opinion, a general "why/what if" with no specific object or process to show, or you doubt that a good picture of it exists on Wikipedia, reply exactly: NONE
No quotes, no punctuation, no explanation.`;

// Asks Gemini once per question for the picture topic. It sees the question and (if already made) the answer.
// If Gemini is busy or fails we return '' and the old keyword search still runs.
async function pictureTopic({ q, ch }, id) {
  if (!KEY) return '';
  try {
    const prompt = `Question: ${[q.text].concat(q.parts || []).join(' ').slice(0, 500)}\nChapter: ${(ch && ch.title) || ''}\nAnswer: ${String(CACHE.get(id + '|en') || '').slice(0, 400)}`;
    const r = await Promise.race([
      gemini(SYSTEM_TOPIC, prompt, { temperature: 0, maxTokens: 200 }),
      new Promise(ok => setTimeout(() => ok({}), 15000))
    ]);
    const t = String(r.text || '').split('\n')[0].replace(/[^A-Za-z0-9 '-]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60);
    return /^none$/i.test(t) ? 'NONE' : t;
  } catch (e) { return ''; }
}
// A picture is shown only if its title/description really mentions the topic words (plural/singular ignored).
const stem = w => (w.length > 4 ? w.replace(/(es|s)$/, '') : w);
function relevant(text, words, ratio) {
  const hay = String(text || '').toLowerCase();
  if (!words.length) return false;
  return words.filter(w => hay.includes(stem(w))).length >= Math.ceil(words.length * ratio);
}

const WIKI_HEADERS = { 'User-Agent': WIKI_UA, 'Api-User-Agent': WIKI_UA };
async function wikiJson(url) {
  const r = await fetch(url, { headers: WIKI_HEADERS, signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error('wikimedia ' + r.status);
  return r.json();
}
// Source 1: the main picture of the English Wikipedia article for this topic (free-licence pictures only).
// First the exact article title (redirects followed, disambiguation pages skipped); if there is none, a search whose
// result title must match the topic words. Licence and author come from the Commons file page.
const okFile = n => n && /\.(jpe?g|png|svg|webp)$/i.test(n) && !BAD_TITLE.test(n.replace(/_/g, ' '));
async function wikiImage(topic) {
  const WIKI = 'https://en.wikipedia.org/w/api.php?';
  const names = [];
  const ex = await wikiJson(WIKI + new URLSearchParams({
    action: 'query', format: 'json', titles: topic, redirects: '1',
    prop: 'pageimages|pageprops', piprop: 'name', pilicense: 'free', ppprop: 'disambiguation'
  }));
  for (const pg of Object.values((ex.query && ex.query.pages) || {})) {
    if (!pg.missing && !(pg.pageprops && 'disambiguation' in pg.pageprops) && okFile(pg.pageimage)) names.push(pg.pageimage);
  }
  if (!names.length) {
    const tw = keywords(topic, 4);
    const j = await wikiJson(WIKI + new URLSearchParams({
      action: 'query', format: 'json', generator: 'search', gsrsearch: topic, gsrlimit: '4',
      prop: 'pageimages', piprop: 'name', pilicense: 'free'
    }));
    for (const pg of Object.values((j.query && j.query.pages) || {}).sort((x, y) => (x.index || 0) - (y.index || 0))) {
      if (okFile(pg.pageimage) && relevant(pg.title, tw, 1)) names.push(pg.pageimage);
    }
  }
  if (!names.length) return null;
  const titles = names.map(n => 'File:' + n.replace(/_/g, ' '));
  const k = await wikiJson('https://commons.wikimedia.org/w/api.php?' + new URLSearchParams({
    action: 'query', format: 'json', titles: titles.join('|'), prop: 'imageinfo',
    iiprop: 'url|mime|size|extmetadata', iiurlwidth: '800'
  }));
  const pages = Object.values((k.query && k.query.pages) || {}).sort((x, y) => titles.indexOf(x.title) - titles.indexOf(y.title));
  const found = pickImage(pages, [], 0);
  return found ? Object.assign(found, { src: 'Wikimedia Commons' }) : null;
}
// Source 2: Commons search with a list of words (needs `need` of them in the file title or description).
async function commonsWords(words, need) {
  if (!words.length) return null;
  const found = pickImage(await commonsSearch(words), words, Math.min(need, words.length));
  return found ? Object.assign(found, { src: 'Wikimedia Commons' }) : null;
}
async function commonsByQuestion({ q, ch }) {
  const qText = [q.text].concat(q.parts || []).join(' ');
  const done = new Set();
  for (const t of [{ words: keywords(qText, 6) }, { words: keywords(qText, 3) }, { words: keywords(ch && ch.title, 4) }]) {
    if (t.words.length < 2) continue;
    const key = t.words.join(' ');
    if (done.has(key)) continue;
    done.add(key);
    const found = await commonsWords(t.words, 2);
    if (found) return found;
  }
  return null;
}
// Source 3 (optional, last): Pexels stock photo. Needs the Render env var PEXELS_API_KEY (free at pexels.com/api).
async function pexelsImage(topic) {
  const key = process.env.PEXELS_API_KEY;
  if (!key || !topic) return null;
  const r = await fetch('https://api.pexels.com/v1/search?' + new URLSearchParams({ query: topic, per_page: '5', orientation: 'landscape' }),
    { headers: { Authorization: key }, signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error('pexels ' + r.status);
  const j = await r.json();
  for (const p of (j.photos || [])) {
    const url = p.src && (p.src.large || p.src.medium), page = p.url;
    if (!/^https:\/\/images\.pexels\.com\//.test(url || '') || !/^https:\/\/www\.pexels\.com\//.test(page || '')) continue;
    if (!relevant(p.alt, keywords(topic, 4), 0.67)) continue;   // stock photos often drift: no match in the description = no picture
    return {
      url, page, title: String(p.alt || topic).slice(0, 120), by: String(p.photographer || '').slice(0, 80),
      lic: 'Pexels License', licUrl: 'https://www.pexels.com/license/', src: 'Pexels'
    };
  }
  return null;
}
// Tries the sources in order. A source that errors is skipped. If nothing was found and something errored,
// we throw so the "no picture" result is not remembered and the next student tries again.
async function findImage(hit, id) {
  const topic = await pictureTopic(hit, id);
  if (topic === 'NONE') return null;            // Gemini: nothing specific to picture, so show no image
  const tw = keywords(topic, 4);
  const steps = [];
  if (topic) steps.push(() => wikiImage(topic));
  if (tw.length) steps.push(() => commonsWords(tw, Math.ceil(tw.length * 2 / 3)));
  if (!topic) steps.push(() => commonsByQuestion(hit));   // only when Gemini was unavailable
  if (topic) steps.push(() => pexelsImage(topic));
  let errors = 0;
  for (const step of steps) {
    try { const found = await step(); if (found) return found; }
    catch (e) { errors++; console.error('Image source failed', id, e.message); }
  }
  if (errors) throw new Error('image sources failed: ' + errors);
  return null;
}
app.post('/api/image', async (req, res) => {
  const hit = guard(req, res); if (!hit) return;
  const id = req.body.id;
  if (hit.course.subject !== 'Science') return res.json({});
  if (IMG_CACHE.has(id)) return res.json(IMG_CACHE.get(id) || {});
  const now = Date.now(), arr = (IMG_HITS.get(req.ip) || []).filter(t => now - t < 60000);
  arr.push(now); IMG_HITS.set(req.ip, arr);
  if (arr.length > 40) return res.status(429).json({ error: 'Thoda ruko, bahut zyada requests. 1 minute baad try karo.' });
  try {
    if (!IMG_PENDING.has(id)) IMG_PENDING.set(id, findImage(hit, id).finally(() => IMG_PENDING.delete(id)));
    const found = await IMG_PENDING.get(id);
    IMG_CACHE.set(id, found);
    res.json(found || {});
  } catch (e) {
    console.error('Image search failed', id, e.message);
    res.json({});   // not cached: the next student triggers a fresh try
  }
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
