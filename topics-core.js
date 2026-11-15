// topics-core.js - Task 31: split a chapter into 5-10 topics and tie every question to one topic. The AI does it ONCE per chapter (admin),
// the result is saved in Firestore chapterTopics/<course>_<chapterNo> and read by everyone. Pure functions, no network: tests/phase6.test.js.
'use strict';

const MAX_TOPICS = 10, MIN_TOPICS = 3, NAME_MAX = 60, LANGS = ['en', 'hi', 'as', 'bn'];
const docId = (course, chNo) => String(course).replace(/[^A-Za-z0-9-]/g, '') + '_' + Number(chNo);
const clean = (s, n = NAME_MAX) => String(s == null ? '' : s).replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);

const SYSTEM = `You split a school chapter into topics for a student's revision map. Reply with ONE JSON object only, no markdown:
{"topics":[{"id":"a","en":"...","hi":"...","as":"...","bn":"..."}],"map":{"<question id>":"<topic id>"}}
Rules: ${MIN_TOPICS} to ${MAX_TOPICS} topics, each a clear idea of the chapter (not "Introduction"). Names are short (max 6 words), in simple words a child knows: en = English, hi = Hindi (Devanagari), as = Assamese, bn = Bengali. Every question id in the list must appear in "map" exactly once, pointing to the best-fitting topic id. Topic ids are short (a, b, c ...). Use only the notes and questions given.`;

function buildPrompt(course, ch, refText, questionList) {
  return `Class ${course.class} ${course.subject}, chapter ${ch.no}: ${ch.title}\n\nNOTES / QUESTIONS (reference):\n${refText}\n\nQUESTIONS TO PLACE IN TOPICS (id: text):\n` +
    questionList.map(q => q.id + ': ' + clean(q.text, 160)).join('\n');
}

const OTHER = { en: 'Other questions', hi: 'अन्य सवाल', as: 'অন্য প্ৰশ্ন', bn: 'অন্যান্য প্রশ্ন' };

// raw = the AI text (JSON), qids = every question id of the chapter. Returns { topics:[{id,en,hi,as,bn}], map:{qid:topicId} } or null if unusable.
// Topic ids are renumbered t1, t2, ... (the AI's own ids are never trusted). A question the AI left out goes to an "Other questions" topic (tx).
function parseTopics(raw, qids) {
  let j;
  try { j = JSON.parse(String(raw).replace(/^```(?:json)?\s*|\s*```$/g, '').trim()); } catch (e) { return null; }
  if (!j || !Array.isArray(j.topics) || !j.map || typeof j.map !== 'object') return null;
  const idMap = new Map(), topics = [];
  for (const t of j.topics.slice(0, MAX_TOPICS)) {
    const en = clean(t && t.en);
    if (!en || !t.id || idMap.has(String(t.id))) continue;
    const id = 't' + (topics.length + 1);
    idMap.set(String(t.id), id);
    const row = { id };
    LANGS.forEach(l => { row[l] = clean(t[l]) || en; });
    topics.push(row);
  }
  if (topics.length < MIN_TOPICS) return null;
  const map = {}, ids = new Set(qids);
  let missing = 0;
  qids.forEach(q => { const to = idMap.get(String(j.map[q])); if (to) map[q] = to; else missing++; });
  if (missing > Math.ceil(qids.length / 2)) return null;   // the AI did not really place the questions
  if (missing) { topics.push({ id: 'tx', ...OTHER }); qids.forEach(q => { if (!map[q]) map[q] = 'tx'; }); }
  Object.keys(map).forEach(q => { if (!ids.has(q)) delete map[q]; });
  return { topics, map };
}

// The data for a "revise only this topic" Recall: { id, name, questions:[text] } or null when the topic is not in the chapter doc.
function focusOf(doc, topicId, ch) {
  if (!doc || !Array.isArray(doc.topics)) return null;
  const t = doc.topics.find(x => x.id === topicId);
  if (!t) return null;
  const texts = [];
  (ch.sections || []).forEach(s => (s.questions || []).forEach(q => { if (doc.map && doc.map[q.id] === t.id) texts.push(clean(q.text, 200)); }));
  return { id: t.id, name: t.en, questions: texts.slice(0, 12) };
}

// What the server keeps in Firestore (only the fields the app needs).
const toDoc = (course, chNo, parsed, now = Date.now) => ({ course: course.id, ch: Number(chNo), topics: parsed.topics, map: parsed.map, updatedAt: new Date(now()) });
// A doc read back from Firestore (or the cache), checked before it is trusted.
function validDoc(d) {
  return !!d && Array.isArray(d.topics) && d.topics.length >= MIN_TOPICS && d.topics.every(t => t && /^t[0-9x]+$/.test(t.id) && typeof t.en === 'string') && !!d.map && typeof d.map === 'object';
}

module.exports = { SYSTEM, MAX_TOPICS, MIN_TOPICS, LANGS, docId, buildPrompt, parseTopics, focusOf, toDoc, validDoc };
