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
  if (req.path === '/questions' || req.path === '/ping') return next();
  const h = req.headers.authorization || '';
  const t = h.startsWith('Bearer ') ? h.slice(7) : '';
  if (!t) return res.status(401).json({ error: 'Pehle Google se log in karo.' });
  try { req.user = await admin.auth().verifyIdToken(t); next(); }
  catch (e) { res.status(401).json({ error: 'Login expire ho gaya. Dobara log in karo.' }); }
});
app.use(express.static(path.join(__dirname, 'public')));

// Add more free keys (each from a DIFFERENT Google project) in Render as GEMINI_API_KEYS=key1,key2,key3
// GEMINI_API_KEY (single) still works. When one key hits its free limit, the next key is used automatically.
const KEYS = [...new Set([...(process.env.GEMINI_API_KEYS || '').split(','), process.env.GEMINI_API_KEY || ''].map(k => k.trim()).filter(Boolean))];
const KEY = KEYS[0];
let keyStart = 0; // round-robin so load is spread across keys
// Models are tried in priority order: first one first. Set GEMINI_MODELS in Render, comma separated,
// e.g. GEMINI_MODELS=gemini-3.5-flash-lite,gemini-3.6-flash,gemini-3.8-flash
// (old GEMINI_MODEL still works and is put first). For each model ALL keys are tried before moving to the next model.
const MODELS = [...new Set([
  process.env.GEMINI_MODEL || '',
  ...(process.env.GEMINI_MODELS || '').split(','),
  ...(process.env.GEMINI_MODELS ? [] : ['gemini-3.5-flash-lite', 'gemini-3.6-flash', 'gemini-3.8-flash'])
].map(m => m.trim()).filter(Boolean))];

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
  en: 'simple English (for a school student)',
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
function socialProfile(cls) {
  const answer = `You are a friendly Class ${cls} Social Science tutor (Geography, History, Civics, Economics) for students in Assam, working from their textbook (NCERT / NCF 2023 level).
Answer ONLY the given textbook question, in simple English that a Class ${cls} student can write in an exam.
Rules:
- Use the chapter notes given in the context and stay faithful to the textbook. Do not invent facts, dates or figures.
- For multiple-choice questions: state the correct option clearly, then give one short reason.
- For fill in the blanks: give the missing word(s). For true/false: say True or False first, then one short reason (if false, give the correct statement).
- For "match the following": give each pair on its own line.
- For "answer briefly" (very short) questions: 1 to 3 short sentences. For "answer in detail" questions: 5 to 8 short sentences or short points, with a one-line heading idea first, and examples from the chapter.
- For "differences between" questions: give the points in a clear list, one difference per line.
- For picture, grid or map based questions: the picture is described in the context; answer from that description, and say the direction or square clearly.
- For calculation questions (scale, time, distance): show the working in short steps, then the final answer in **bold**.
- For opinion / HOTS questions: give a balanced answer of 4 to 6 sentences with a reason for each point.
- Plain text. You may use **bold** for key words. No headings, no tables, no LaTeX. Use "-" for lists.
- Keep it concise: about 40 words for a brief question, 120 to 200 words for a detailed question, up to 250 words when there are several parts.`;
  const tr = `You are a careful translator for school Social Science textbooks.
Translate the given text into the requested language.
Keep place names, technical terms (in English, with the meaning once), numbers, directions and **bold** markers exactly as they are.
Output ONLY the translation, nothing else.`;
  const vis = `You draw simple educational diagrams and sketch maps as SVG for Class ${cls} Social Science students.
Output ONLY one <svg> element. No markdown fences, no explanation.
Requirements:
- xmlns="http://www.w3.org/2000/svg" and viewBox="0 0 640 360".
- First draw a white background <rect width="640" height="360" fill="#ffffff"/> so it is readable in dark mode.
- Dark text (#111), font-family Arial, font-size 14 to 20. Use coloured boxes, circles and arrows (you may use <marker>).
- For the globe, latitudes or heat zones: a circle with horizontal lines or coloured bands, each labelled (Equator, Tropic of Cancer, Tropic of Capricorn, Arctic Circle, Antarctic Circle, poles).
  For directions: a compass rose with N, E, S, W and NE, SE, SW, NW. For a grid or sketch map: a labelled grid or simple symbols with a north arrow. For a comparison or classification: a small tree diagram of labelled boxes.
- No scripts, no images, no external links, no foreignObject. Keep it under 3500 characters.`;
  const more = `You are a friendly Class ${cls} Social Science tutor for students in Assam.
You are given a textbook question and its answer. Write the extra help asked for, at Class ${cls} level, in simple English.
Rules: plain text only, you may use **bold** for key words; no headings, no tables, no LaTeX; keep every fact correct and faithful to the textbook.`;
  const kinds = {
    ...MORE_KINDS,
    kid: 'Explain this answer the way you would to a 10-year-old child: very simple words, short sentences, one small everyday example. Keep the facts correct. Maximum 120 words.',
    full: `Write this answer the way a Class ${cls} Social Science exam answer should be written to score full marks: a direct first sentence that answers the question, then 3 to 5 short points or sentences with facts and examples from the chapter, and a one-line conclusion. Exam style.`,
    mcq: `Make 3 multiple-choice practice questions on the same topic, Class ${cls} level. Do not repeat the original question. Use exactly this format for each, with a blank line between questions:\nQ1. question\nA) option\nB) option\nC) option\nD) option\nAnswer: X (one-line reason)`
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
// Hindi (Class 6 and others): the lesson and answers are in Hindi; students read English / Assamese / Bengali help.
function hindiProfile(cls) {
  const answer = `You are a friendly Class ${cls} Hindi tutor for students in Assam, working from their Hindi textbook.
Answer ONLY the given textbook question, in simple Hindi (Devanagari script) that a Class ${cls} student can write in an exam.
Rules:
- Use the poem or lesson text and notes given in the context. Stay faithful to it. Never invent lines, events or facts.
- For comprehension questions: 2 to 4 short sentences. For one-word or fill-in-the-blank items: give the answer first, then one short reason.
- If the question has parts (क), (ख), (ग), answer each part separately with its label.
- For "explain the lines in your own words" questions: give the meaning in simple Hindi, then link it to the main idea of the poem.
- For multiple-choice items: write the correct option with its number and text, then one short reason.
- For grammar items (anunasik, sangya, vachan and so on): give the answer, then the rule in one line.
- For "make a sentence" questions: give one correct sentence for every word, each showing the meaning of the word.
- For opinion or value-based questions: give a short, balanced answer of 3 or 4 sentences.
- Plain text. You may use **bold** for key words. No headings, no tables, no LaTeX.
- Keep it concise: about 40 to 90 words for a single question, up to 150 words when there are several parts.`;
  const tr = `You are a careful translator for Hindi school textbooks.
Translate the given Hindi text into the requested language, in simple words a Class ${cls} student understands.
Keep Hindi proper names, numbers and **bold** markers as they are, and keep line breaks.
Output ONLY the translation, nothing else.`;
  const vis = `You draw simple educational diagrams as SVG for Class ${cls} Hindi students.
Output ONLY one <svg> element. No markdown fences, no explanation.
Requirements:
- xmlns="http://www.w3.org/2000/svg" and viewBox="0 0 640 360".
- First draw a white background <rect width="640" height="360" fill="#ffffff"/> so it is readable in dark mode.
- Dark text (#111), font-family Arial, font-size 15 to 20. Use coloured boxes and arrows (you may use <marker>).
- Write labels in English with the Hindi word in brackets where it helps (the SVG text may contain Devanagari).
- For a poem or story idea: a mind map or a short labelled flow of 3 to 5 boxes using words from the text. For grammar: a tree with the kinds of the topic and one example in each box.
- No scripts, no images, no external links, no foreignObject. Keep it under 3500 characters.`;
  const more = `You are a friendly Class ${cls} Hindi tutor for students in Assam.
You are given a textbook question and its answer. Write the extra help asked for, at Class ${cls} level, in simple English (keep Hindi words in Devanagari with their English meaning).
Rules: plain text only, you may use **bold** for key words; no headings, no tables, no LaTeX; keep the meaning of the lesson correct.`;
  const kinds = {
    ...MORE_KINDS,
    kid: 'Explain this answer the way you would to a 10-year-old child: very simple words, short sentences, one small everyday example. Keep the meaning of the lesson correct. Maximum 120 words.',
    full: `Write this answer the way a Class ${cls} Hindi exam answer should be written to score full marks, in simple Hindi: a direct first sentence that answers the question, two or three supporting sentences that refer to the text, and a one-line conclusion. 4 to 6 lines.`,
    mcq: `Make 3 multiple-choice practice questions in Hindi on the same lesson or grammar topic, Class ${cls} level. Do not repeat the original question. Use exactly this format for each, with a blank line between questions:\nQ1. question\nA) option\nB) option\nC) option\nD) option\nAnswer: letter`
  };
  return { answer, tr, vis, more, kinds };
}
// Assamese language subject: the AI writes in simple Assamese (Assamese script), working from the lesson notes in the hidden context.
function assameseProfile(cls) {
  const answer = `You are a friendly Class ${cls} Assamese language tutor for students in Assam, working from their textbook.
Answer ONLY the given textbook question, in simple Assamese (Assamese script) that a Class ${cls} student can write in an exam.
Rules:
- Use the lesson notes given in the context. Stay faithful to them. Never invent lines, names or events. Never copy the poem; explain it in your own words.
- For short questions: 1 to 3 short sentences.
- For summary (সাৰাংশ) questions: 4 to 6 short sentences covering the main idea.
- If the question has parts (ক), (খ), (গ) ..., answer each part separately with its label, one or two lines each.
- For grammar questions such as বৰ্ণ-বিন্যাস: follow the format and example in the context, write the letters joined by + , then say the word again to check.
- If the context does not say something clearly, say so briefly and answer only what is certain.
- Plain text. You may use **bold** for key words. No headings, no tables, no LaTeX.
- Keep it concise: about 40 to 100 words for a single question, up to 180 words when there are several parts.`;
  const tr = `You are a careful translator for school Assamese textbooks.
Translate the given text into the requested language.
Keep names, numbers, Assamese words that are being explained, and **bold** markers exactly as they are.
Output ONLY the translation, nothing else.`;
  const vis = `You draw simple educational diagrams as SVG for Class ${cls} Assamese students.
Output ONLY one <svg> element. No markdown fences, no explanation.
Requirements:
- xmlns="http://www.w3.org/2000/svg" and viewBox="0 0 640 360".
- First draw a white background <rect width="640" height="360" fill="#ffffff"/> so it is readable in dark mode.
- Dark text (#111), font-family Arial, font-size 15 to 20. Use short Assamese labels (a few words each) in coloured boxes with arrows (you may use <marker>).
- For a poem or lesson idea: a mind map or a short labelled flow of 3 to 6 boxes using words from the lesson.
- No scripts, no images, no external links, no foreignObject. Keep it under 3500 characters.`;
  const more = `You are a friendly Class ${cls} Assamese language tutor for students in Assam.
You are given a textbook question and its answer. Write the extra help asked for, at Class ${cls} level, in simple Assamese (Assamese script).
Rules: plain text only, you may use **bold** for key words; no headings, no tables, no LaTeX; keep the meaning of the lesson correct.`;
  const kinds = {
    ...MORE_KINDS,
    full: `Write this answer the way a Class ${cls} Assamese exam answer should be written to score full marks: a direct first sentence that answers the question, two or three supporting sentences that refer to the lesson, and a one-line conclusion. 4 to 6 lines, exam style.`
  };
  return { answer, tr, vis, more, kinds };
}
function arabicProfile(cls) {
  const answer = `You are a friendly Class ${cls} Arabic tutor for beginners in Assam. The student uses an Assamese-medium Arabic textbook (Adarsha Arabi Path) but learns in English medium, so explain in simple English.
Answer ONLY the given textbook exercise question.
Rules:
- Write Arabic letters and words in Arabic script and give the Roman transliteration in brackets, for example ب (Ba).
- Use the chapter notes in the context for letter names, dots and shapes; they are correct, so never contradict them.
- If the exact letters or words of the exercise are not given in the question, say in one short line that the list is in the textbook, explain the method in 2 to 4 steps and show 2 or 3 examples of your own.
- For handwriting or writing-practice questions explain how to write it letter by letter, remind that Arabic is written from right to left, and give the meaning.
- For letter-shape questions use the words isolated, initial, middle and final, and remember that ا د ذ ر ز و do not join to the letter after them.
- Plain text, short (about 80 to 150 words). You may use **bold** for key words. No headings, no tables, no LaTeX.`;
  const tr = `You are a careful translator for school Arabic textbooks.
Translate the given text into the requested language.
Keep Arabic script, transliteration, letter names, numbers and **bold** markers exactly as they are.
Output ONLY the translation, nothing else.`;
  const vis = `You draw simple educational diagrams as SVG for Class ${cls} beginners learning Arabic.
Output ONLY one <svg> element. No markdown fences, no explanation.
Requirements:
- xmlns="http://www.w3.org/2000/svg" and viewBox="0 0 640 360".
- First draw a white background <rect width="640" height="360" fill="#ffffff"/> so it is readable in dark mode.
- Dark text (#111), font-family "Noto Naskh Arabic", Arial, font-size 18 to 36 for Arabic letters and 14 to 18 for English labels.
- For letter shapes: a row of four boxes labelled isolated, initial, middle, final with the letter shown in each. For alphabet groups: boxes with the letters and their dots in clear colour. Write Arabic from right to left.
- No scripts, no images, no external links, no foreignObject. Keep it under 3500 characters.`;
  const more = `You are a friendly Class ${cls} Arabic tutor for beginners in Assam.
You are given a textbook question and its answer. Write the extra help asked for, at Class ${cls} level, in simple English.
Rules: plain text only, you may use **bold** for key words; no headings, no tables, no LaTeX; write Arabic in Arabic script with the Roman transliteration in brackets and keep every letter name, dot and shape correct.`;
  const kinds = {
    ...MORE_KINDS,
    mnemonic: 'Create one easy memory trick (a short phrase, rhyme or grouping) that helps remember what this answer teaches, for example how to remember letters that look alike. Then say in 1 or 2 lines what each part stands for. Maximum 80 words.',
    kid: 'Explain this answer the way you would to a 10-year-old child: very simple words, short sentences, one small everyday example. Keep the Arabic correct. Maximum 120 words.',
    full: `Write this answer the way a Class ${cls} Arabic exam answer should be written to score full marks: a direct first line that answers the question, the Arabic written clearly with transliteration, and a one-line conclusion. 4 to 6 lines, exam style.`,
    mistakes: 'List 3 common mistakes beginners make on this kind of question (for example mixing up letters that look alike, wrong number of dots, or writing from left to right). For each: the mistake, then the correct version. 1 or 2 lines each.',
    mcq: `Make 3 multiple-choice practice questions on the same topic, Class ${cls} beginner level. Do not repeat the original question. Show Arabic in Arabic script with transliteration in brackets. Use exactly this format for each, with a blank line between questions:\nQ1. question\nA) option\nB) option\nC) option\nD) option\nAnswer: X (one-line reason)`
  };
  return { answer, tr, vis, more, kinds };
}
const isEnglish = course => /^English/.test(course.subject);
const profileFor = course => course.subject === 'Assamese' ? assameseProfile(course.class)
  : isEnglish(course) ? englishProfile(course.class)
  : course.subject === 'Hindi' ? hindiProfile(course.class)
  : course.subject === 'Arabic' ? arabicProfile(course.class)
  : course.subject === 'Social Science' ? socialProfile(course.class)
  : course.subject === 'Mathematics' ? mathsProfile(course.class) : scienceProfile(course.class);

const MAX_CLIENT_TEXT = 2500;   // saved answers the browser may send back if the server forgot them (free-tier restarts)
const hash = t => crypto.createHash('sha1').update(String(t)).digest('hex').slice(0, 10);
const clientText = t => (typeof t === 'string' && t.length > 0 && t.length <= MAX_CLIENT_TEXT) ? t : null;

function buildPrompt(q, course, ch) {
  const parts = [];
  if (course && (isEnglish(course) || ['Hindi', 'Arabic', 'Assamese'].includes(course.subject)) && ch) parts.push(`Lesson: ${ch.title}${ch.author ? ' by ' + ch.author : ''}`);
  if (course && (course.subject === 'Mathematics' || course.subject === 'Social Science' || (course.subject === 'Science' && course.class !== 10)) && ch) parts.push(`Chapter: ${ch.title}`);
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
  const lang = course && course.subject === 'Hindi' ? 'Reply in simple Hindi (Devanagari).'
    : course && course.subject === 'Assamese' ? 'Reply in simple Assamese (Assamese script).' : 'Reply in simple English.';
  return `${lang}\n\n${parts.join('\n')}`;
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
  const DEADLINE = t0 + (opts.budgetMs || 55000);
  let lastStatus = 0;
  let useJson = !!opts.json;
  const start = keyStart++ % Math.max(KEYS.length, 1);
  const order = KEYS.map((_, i) => KEYS[(start + i) % KEYS.length]);
  for (const model of MODELS) {
    for (let ki = 0; ki < order.length; ki++) {
      const apiKey = order[ki];
      for (let attempt = 1; attempt <= 2; attempt++) {
        const left = DEADLINE - Date.now();
        if (left < 4000) return { status: lastStatus };
        try {
          const r = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
              signal: AbortSignal.timeout(Math.min(15000, left)),
              body: JSON.stringify({
                systemInstruction: { parts: [{ text: system }] },
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: { temperature: opts.temperature ?? 0.3, maxOutputTokens: opts.maxTokens || 4096, ...(useJson ? { responseMimeType: 'application/json' } : {}) }
              })
            }
          );
          const j = await r.json().catch(() => ({}));
          if (r.ok) {
            const text = ((j.candidates || [])[0]?.content?.parts || []).map(p => p.text || '').join('').trim();
            if (text) { console.log('Gemini ok', model, 'key#' + (KEYS.indexOf(apiKey) + 1), (Date.now() - t0) + 'ms'); return { text }; }
            console.error('Gemini empty answer', model);
            break;
          }
          lastStatus = r.status;
          console.error('Gemini error', r.status, model, 'key#' + (KEYS.indexOf(apiKey) + 1), JSON.stringify(j).slice(0, 300));
          if (r.status === 400 && useJson && attempt === 1) { useJson = false; continue; } // model refused JSON mode: retry as plain text
          if (r.status === 429) break; // this key is out of quota: try the next key right away
          if ((r.status === 503 || r.status === 500) && attempt === 1) {
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
  if (!KEYS.length) { res.status(500).json({ error: 'Server mein GEMINI_API_KEY set nahi hai.' }); return false; }
  if (limited(req.ip)) { res.status(429).json({ error: 'Thoda ruko, bahut zyada requests. 1 minute baad try karo.' }); return false; }
  return true;
}

app.get('/api/ping', (req, res) => res.json({ ok: true })); // wakes the sleeping Render server
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
// Same styles for a Hindi source text (poem stanzas, answers). Keys match TR_STYLES; `mean` is extra (meaning of a stanza).
const HI_STYLES = {
  para: (l, t) => `Translate this Hindi text into ${l}. Keep the line breaks (for a poem, every line on its own line):\n\n${t}`,
  sent: (l, t) => `Translate into ${l}, line by line.\nFor every line (for prose, every sentence) of the Hindi text below, write the original Hindi line, then on the next line write its translation starting with "→ ". Leave one blank line between pairs. Keep labels such as (क), (ख) and numbering with the line. Output only this.\n\n${t}`,
  mean: (l, t) => `Explain the Hindi text below in ${l}, in simple words for a school student. First give the meaning line by line (one short sentence for each line), then one sentence for the main idea. Use only what is in the text; add no outside facts. Output only the explanation.\n\n${t}`,
  words: (l, t) => `From the Hindi text below pick the 6 to 10 hardest words a school student may not know. Do NOT translate the whole text.\nFormat: one per line, starting with "- ", as: Hindi word: meaning in ${l}.\nOutput only this list.\n\n${t}`,
  brackets: (l, t) => `Rewrite the Hindi text below exactly as it is (same words, same line breaks), but after each difficult word put its meaning in ${l} inside round brackets, for example: word (meaning). Add brackets only for hard words (about one word in eight). Output only the rewritten text.\n\n${t}`
};
const stylesFor = course => (course && course.sourceLang === 'Hindi') ? HI_STYLES : TR_STYLES;
app.post('/api/translate', async (req, res) => {
  const hit = guard(req, res); if (!hit) return;
  const { q, course, ch } = hit, P = profileFor(course);
  const { id, to } = req.body;
  if (!LANGS[to]) return res.status(400).json({ error: 'Language supported nahi hai.' });
  const ST = stylesFor(course);
  const style = Object.prototype.hasOwnProperty.call(ST, req.body.style) ? req.body.style : 'para';
  // Translate exactly the answer the student sees (the browser sends it); fall back to the server's copy.
  const base = clientText(req.body.text) || CACHE.get(id + '|en');
  if (!base) return res.status(400).json({ error: 'Pehle AI Answer banao, phir translate karo.' });
  const key = id + '|tr|' + to + '|' + style + '|' + hash(base);
  if (CACHE.has(key)) return res.json({ text: CACHE.get(key), cached: true });
  if (!guardAI(req, res)) return;
  const r = await gemini(P.tr, ST[style](LANGS[to], base), { temperature: 0.2 });
  if (!r.text) return res.status(502).json({ error: failMsg(r.status) });
  CACHE.set(key, r.text);
  res.json({ text: r.text });
});

// ---- translate the QUESTION itself (3-dot menu). The server builds the text from its own question list,
// so nobody can send free text through this route. Translations are remembered per question + language.
app.post('/api/qtranslate', async (req, res) => {
  const hit = guard(req, res); if (!hit) return;
  const { q, course } = hit, P = profileFor(course);
  const { id, to } = req.body;
  if (!LANGS[to]) return res.status(400).json({ error: 'Language supported nahi hai.' });
  const base = [q.text].concat(q.parts || [], q.options || []).filter(Boolean).join('\n');
  if (!base) return res.status(400).json({ error: 'Is question ka text nahi hai.' });
  const key = id + '|qtr|' + to;
  if (CACHE.has(key)) return res.json({ text: CACHE.get(key), cached: true });
  if (!guardAI(req, res)) return;
  const r = await gemini(P.tr, stylesFor(course).para(LANGS[to], base), { temperature: 0.2 });
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
  const ST = stylesFor(hit.course);
  const style = Object.prototype.hasOwnProperty.call(ST, req.body.style) ? req.body.style : 'para';
  const key = ['lesson', course, chNo, p, to, style].join('|');
  if (CACHE.has(key)) return res.json({ text: CACHE.get(key), cached: true });
  if (!guardAI(req, res)) return;
  const r = await gemini(profileFor(hit.course).tr, ST[style](LANGS[to], text), { temperature: 0.2 });
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
  const hindi = hit.course.subject === 'Hindi';
  const system = hindi ? `You are a friendly Hindi teacher for Class ${cls} students in Assam (English-medium school). You explain standard Hindi grammar rules in ${LANGS[to]}.
Rules for your reply:
- Explain in ${LANGS[to]}. Keep every Hindi example word or sentence in Hindi (Devanagari) and put its meaning in ${LANGS[to]} after it. Name each grammar term in Hindi (Devanagari) with its usual English name once, for example: sangya (noun).
- Follow the standard school syllabus (NCERT / SEBA level). Be correct and do not invent exceptions.
- Plain text. You may use **bold** for key words. No headings with #, no tables, no LaTeX.
- Short numbered points. Every rule is followed by one or two Hindi examples with their meaning.
- Use the textbook examples given in the notes where they fit.` : `You are a friendly English teacher for Class ${cls} students in Assam. You explain standard English ${kind === 'writing' ? 'writing (letter and application) format' : 'grammar rules'} in ${LANGS[to]}.
Rules for your reply:
- Explain in ${LANGS[to]}. Keep every English example, grammar term (in English, with the local-language meaning once) and the parts of a letter in English.
- Follow the standard school syllabus (SEBA/NCERT level). Be correct and do not invent exceptions.
- Plain text. You may use **bold** for key words. No headings with #, no tables, no LaTeX.
- Short numbered points. Every rule is followed by one or two English example sentences, each with its meaning in the local language.
- Use the textbook examples given in the notes where they fit.`;
  const body = kind === 'writing'
    ? `Topic: ${topic}\nExplain the standard format step by step: where the sender's details, date, receiver, subject line, salutation, body (opening line, reason, request), closing line, and signature (name, class, roll no.) go; what language and tone to use; 5 common mistakes; then one short model application in English with the local-language meaning of its first paragraph.`
    : `Topic: ${topic}\nExplain the standard rules: what it is, its kinds, the rule for each kind with examples, the exceptions the textbook mentions, 5 common mistakes, and a quick memory trick.${hindi ? ' Give the Hindi examples in Devanagari.' : ''}\nTextbook notes: ${hit.ch.context || ''}`;
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


// ---- Get Video: student pastes a maths question, AI makes a video plan (JSON) ----------------------------
// The plan is checked by the same validator the admin panel uses (public/mathvideo-admin.js), including the
// arithmetic check. If it fails, the errors are sent back to the AI and it tries again (within a time budget).
// Students see their own result at once; it is saved as "pending" and only becomes public after the admin approves.
const MV = require('./public/mathvideo-admin.js');
const MV_ADMINS = (process.env.MV_ADMIN_EMAILS || 'aminulislamsikandar@gmail.com').split(',').map(x => x.trim().toLowerCase()).filter(Boolean);
const MV_DAILY = Math.max(1, parseInt(process.env.MV_DAILY || '5', 10) || 5);   // AI videos per student per day (admin: unlimited)
const MV_CACHE = new Map();    // normalized question -> plan (or {unsupported}), so the same question never calls the AI twice
const MV_USE = new Map();      // uid -> {day, n}
const mvNorm = t => String(t || '').toLowerCase().replace(/[−–—]/g, '-').replace(/[×✕·]/g, '*').replace(/÷/g, '/').replace(/\s+/g, '');
const mvDay = () => new Date().toISOString().slice(0, 10);

const MV_SYSTEM = `You make short whiteboard maths videos for school students (Class 6-8, Assam, textbook style).
Reply with ONE JSON object only. No markdown, no commentary.

If the question is not a school maths question, or it cannot be solved with plain number arithmetic (only numbers, + - × ÷ and brackets; no letters or variables, no geometry figures), reply exactly:
{"unsupported": true, "reason": "<one short Hinglish sentence in Roman letters>"}

Otherwise reply with a plan in this exact shape:
{
 "id": "ask",
 "type": "equation",
 "version": 1,
 "title": {"en": "...", "hg": "...", "hi": "..."},
 "steps": [
  {
   "cap": {"en": "...", "hg": "...", "hi": "..."},
   "say": {"en": "...", "hi": "..."},
   "anim": {
    "lines": ["(-8) + 5", "= -3"],
    "highlight": [1],
    "note": "Answer: -3",
    "numberline": {"min": -10, "max": 5, "dots": [{"v": -8, "label": "-8", "color": "red"}]},
    "cues": [{"hop": {"from": -8, "to": -3}}]
   }
  }
 ]
}
Meaning of the fields:
- "en" = simple English, "hg" = Hinglish in Roman letters, "hi" = Hindi in Devanagari script. "say" is what is spoken aloud.
- In "say.hi" write every number as Hindi words (no digits), for example ऋण आठ, पाँच.
- Each cap/say/title text is at most 140 characters. Use 3 to 7 steps (never more than 12).
- "lines": 1 to 6 short strings (each at most 60 characters) shown on the board, in order. highlight = zero-based indexes of the lines to emphasise.
- Maths lines are checked by a program, so they must be pure numeric: first line is the expression, later lines start with "=" and must have exactly the same value. Use the symbols + - × ÷ and brackets. Do not put words, units or letters inside a maths line. Words belong in cap/say.
- The last step's "note" must be "Answer: <number>" and match the working. If the question has several parts, make the video for the first part only.
- "numberline" (optional): integers only, min and max between -20 and 20, at most 12 dots; colors red, green, blue or orange. With a number line use at most 4 lines.
- "cues" (optional, at most 8): each cue has exactly one key. {"point": {"line": 0, "word": "text that appears in that line"}} or {"point": {"value": 3}} (number line), {"hop": {"from": -8, "to": -3}} (number line, integers inside min..max), {"dot": {"v": 2, "label": "2", "color": "green"}}.
- No HTML, no links, no emoji. Keep every explanation correct and simple. Never invent facts.`;

function mvParse(text) {
  let t = String(text || '').trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const a = t.indexOf('{'), b = t.lastIndexOf('}');
  if (a < 0 || b <= a) return null;
  try { return JSON.parse(t.slice(a, b + 1)); } catch (e) { return null; }
}

app.post('/api/mathvideo/generate', async (req, res) => {
  if (!guardAI(req, res)) return;
  const raw = String((req.body || {}).text || '').replace(/\s+/g, ' ').trim();
  if (raw.length < 8) return res.status(400).json({ error: 'Question thoda aur likho (kam se kam 8 akshar).' });
  if (raw.length > 400) return res.status(400).json({ error: 'Question bahut lamba hai. 400 akshar tak likho.' });
  const norm = mvNorm(raw);
  if (MV_CACHE.has(norm)) return res.json({ ...MV_CACHE.get(norm), cached: true });

  const email = String((req.user && req.user.email) || '').toLowerCase();
  if (!MV_ADMINS.includes(email)) {
    const u = MV_USE.get(req.user.uid), day = mvDay();
    const cur = u && u.day === day ? u : { day, n: 0 };
    if (cur.n >= MV_DAILY) return res.status(429).json({ error: `Aaj ki video limit (${MV_DAILY}) poori ho gayi. Kal dobara try karo.` });
    cur.n++; MV_USE.set(req.user.uid, cur);
  }

  const t0 = Date.now(), TOTAL = 75000;
  let prompt = 'Question:\n"""\n' + raw + '\n"""', lastErrors = [], lastStatus = 0;
  for (let attempt = 1; attempt <= 3; attempt++) {
    const left = TOTAL - (Date.now() - t0);
    if (left < 8000) break;
    const r = await gemini(MV_SYSTEM, prompt, { json: true, temperature: 0.2, maxTokens: 8192, budgetMs: Math.min(left, attempt === 1 ? 40000 : 30000) });
    if (!r.text) { lastStatus = r.status; break; }
    const plan = mvParse(r.text);
    if (!plan) { prompt += '\n\nYour last reply was not valid JSON. Reply with the JSON object only.'; lastErrors = ['not valid JSON']; continue; }
    if (plan.unsupported) {
      const out = { unsupported: true, reason: String(plan.reason || 'Is type ka video abhi nahi ban sakta.').slice(0, 200) };
      MV_CACHE.set(norm, out);
      return res.json(out);
    }
    plan.id = 'ask-' + crypto.createHash('sha1').update(norm).digest('hex').slice(0, 20);
    const v = MV.validate(plan);
    const soft = v.warnings.filter(w => /digits|Devanagari/.test(w));     // spoken Hindi problems: retry if there is time
    if (!v.errors.length && !(soft.length && attempt < 3)) {
      const out = { plan };
      MV_CACHE.set(norm, out);
      if (MV_CACHE.size > 500) MV_CACHE.delete(MV_CACHE.keys().next().value);
      console.log('MathVideo ok', attempt, 'try', (Date.now() - t0) + 'ms');
      return res.json(out);
    }
    lastErrors = v.errors.length ? v.errors : soft;
    console.error('MathVideo invalid (try ' + attempt + '):', lastErrors.slice(0, 4).join(' | '));
    prompt = 'Question:\n"""\n' + raw + '\n"""\n\nYour previous plan had these problems. Fix them and reply with the full corrected JSON only:\n- ' + lastErrors.slice(0, 8).join('\n- ');
  }
  if (lastStatus) return res.status(502).json({ error: failMsg(lastStatus) });
  res.status(502).json({ error: 'Is question ka video theek se nahi ban paya. Question ko seedha number wala likh ke dobara try karo.' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Orbit AI tutor running on port ' + PORT));
