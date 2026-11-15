// Task 12: does the chapter "notes" really make the AI's answer better? Runs the SAME question twice (with notes, without notes)
// through the same prompts the server uses (AI Answer and Recall), and writes both side by side to notes-test-result.md.
//
//   Windows (PowerShell):  $env:GEMINI_API_KEY="your key"; node scripts/notes-test.js
//   Your own chapter:      node scripts/notes-test.js --notes my-notes.txt --question "Question text from the book" --subject Science --cls 7 --chapter "Light"
//
// Needs Node 18+. The key is used only for these calls. Nothing is stored, except the result file next to where you run it.
'use strict';
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const CUSTOM = require(path.join(ROOT, 'custom-core.js')), RECALL = require(path.join(ROOT, 'recall-core.js'));
const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const KEY = process.env.GEMINI_API_KEY, MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
if (!KEY) { console.error('GEMINI_API_KEY set karo (upar ka example dekho).'); process.exit(1); }

// A small invented chapter (not from any textbook) so the test works out of the box. Replace it with your own with --notes / --question.
const SAMPLE_NOTES = `The Village Pond Experiment.
Meena measured the water in a shallow pond every morning for one week. On Monday the water was 40 cm deep, on Tuesday 38 cm, on Wednesday 35 cm, on Thursday 33 cm, on Friday 30 cm. On Saturday it rained, and the pond rose to 36 cm. On Sunday it was 35 cm.
Meena's teacher explained that the water level falls on dry sunny days because of evaporation: the Sun heats the water and it rises into the air as invisible vapour. Rain is the water coming back down, so the level rises again.
Meena also noted that the pond fell fastest on Friday, the hottest day of the week, when the temperature was 38 degrees.`;
const SAMPLE_Q = 'Read the passage about Meena\'s pond. (a) On which day did the water level fall the most compared with the day before? (b) Why did the level rise on Saturday? (c) How deep was the pond on Wednesday?';
const notes = arg('notes') ? fs.readFileSync(arg('notes'), 'utf8') : SAMPLE_NOTES;
const question = arg('question', SAMPLE_Q), subject = arg('subject', 'Science'), cls = +arg('cls', 6), chapter = arg('chapter', 'The Village Pond');
const student = arg('student', 'The pond lost water on hot days because the Sun makes it evaporate, and rain fills it up again.');

// The server's own prompt builder (buildPrompt) is cut out of server.js, so this test always uses the real one.
const srv = fs.readFileSync(path.join(ROOT, 'server.js'), 'utf8');
const bp = srv.slice(srv.indexOf('function buildPrompt('), srv.indexOf('// ---- caches + rate limit'));
const buildPrompt = new Function('isEnglish', bp + '\nreturn buildPrompt;')(() => false);

async function gemini(system, prompt, json) {
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': KEY },
    body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { temperature: 0.2, maxOutputTokens: 4096, ...(json ? { responseMimeType: 'application/json' } : {}) } })
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error('Gemini ' + r.status + ' ' + JSON.stringify(j).slice(0, 200));
  return ((j.candidates || [])[0]?.content?.parts || []).map(p => p.text || '').join('').trim();
}

(async () => {
  const base = { text: question, cls, subject, chapter, medium: 'English', lang: 'English' };
  const withN = CUSTOM.sanitizeCq({ ...base, notes }), without = CUSTOM.sanitizeCq(base), P = CUSTOM.customProfile(cls, subject, 'English');
  const out = ['# Notes test result', '', `Model: ${MODEL}   Class ${cls} ${subject}, chapter "${chapter}"`, '', '## Question', '', question, ''];

  console.log('AI Answer: with notes and without notes...');
  const [a1, a0] = await Promise.all([gemini(P.answer, buildPrompt(withN.q, withN.course, withN.ch)), gemini(P.answer, buildPrompt(without.q, without.course, without.ch))]);
  out.push('## AI Answer, WITH notes', '', a1, '', '## AI Answer, WITHOUT notes', '', a0, '');

  console.log('Recall: the same student answer, with and without notes...');
  const rc = (ch) => gemini(RECALL.SYSTEM, RECALL.buildPrompt({ class: cls, subject }, ch, student, { lang: 'en', audio: false }), true);
  const [r1, r0] = await Promise.all([rc({ no: 0, title: chapter, context: CUSTOM.sanitizeRecallCustom({ cls, subject, chapter, notes: notes.length < 200 ? notes + ' '.repeat(200) : notes }).ch.context, sections: [] }), rc({ no: 0, title: chapter, sections: [{ title: 'Questions', questions: [{ text: question }] }] })]);
  const show = t => { try { const j = JSON.parse(t); return '```json\n' + JSON.stringify(j, null, 2) + '\n```'; } catch (e) { return t; } };
  out.push('## Student answer used for Recall', '', student, '', '## Recall, WITH notes', '', show(r1), '', '## Recall, WITHOUT notes (only the question text)', '', show(r0), '');
  out.push('## Your verdict (fill in)', '', '- AI Answer with notes is better / same / worse:', '- Uses the numbers and words from the notes (yes / no):', '- Recall score with notes is fairer (yes / no):', '');
  fs.writeFileSync('notes-test-result.md', out.join('\n'));
  console.log('\nDone. Open notes-test-result.md and compare the answers; fill in the verdict lines at the bottom.');
})().catch(e => { console.error('Test failed:', e.message); process.exit(1); });
