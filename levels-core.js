// levels-core.js - how AI text is pitched for a class (Task 44 base) + the "Kahani" and "Example" extra-help kinds (Task 37). Pure, no network.
// One place for the class bands, so every feature (AI Answer, story, quiz) can ask for the same level of words.
'use strict';

// Class bands: 2-5, 6-8, 9-12, and 13 or more = college / university. A missing or odd class counts as the middle band.
function band(cls) {
  const n = Math.floor(Number(cls));
  if (n >= 2 && n <= 5) return 'low';
  if (n >= 9 && n <= 12) return 'high';
  if (n >= 13) return 'college';
  return 'mid';
}

const STYLE = {
  low: 'The student is in Class 2 to 5 (age 7 to 11). Use very simple everyday words and short sentences of under 10 words. No difficult terms; if one is needed, explain it at once in a few simple words.',
  mid: 'The student is in Class 6 to 8 (age 11 to 14). Use simple clear words and short sentences. Explain any new term the first time it appears.',
  high: 'The student is in Class 9 to 12 (age 14 to 18). Use clear, precise textbook language, but keep sentences short. Use the correct terms.',
  college: 'The student is in college or university. Use clear academic language with the correct technical terms, keep sentences short, and explain a new term the first time it appears.'
};
const styleHint = cls => STYLE[band(cls)];

const WORDS = { low: [70, 110], mid: [110, 160], high: [140, 210], college: [160, 240] };

// Extra-help kinds that are added to the 3-dot menu of every subject.
const SAFE = 'Use ONLY facts that are in the answer above or in the textbook notes given. Do not invent facts, numbers, names of scientists or dates. Keep every fact correct. Plain text only, no headings, no tables.';
const EXTRA = {
  story: (cls) => {
    const w = WORDS[band(cls)];
    return `Write a short story that makes the main idea of this answer easy to remember. ${styleHint(cls)} ` +
      `Characters: children or elders from an Assam village, school or home (use common Assamese names). The story is ${w[0]} to ${w[1]} words, with a beginning, a small problem and an ending that shows the idea. ` +
      `Finish with one line that starts with "Yaad rakho:" and states the idea in one short sentence. Write in the same language as the answer. ${SAFE}`;
  },
  example: (cls) => {
    const n = band(cls) === 'low' ? 1 : 2;
    return `Give ${n} real-life example${n > 1 ? 's' : ''} from daily life in Assam (home, farm, market, school) that show the idea of this answer. ${styleHint(cls)} ` +
      `For each example: one line naming it, then 2 or 3 short sentences saying how it shows the idea. Write in the same language as the answer. ${SAFE}`;
  }
};
const isExtra = kind => Object.prototype.hasOwnProperty.call(EXTRA, kind);
const extraPrompt = (kind, cls) => (isExtra(kind) ? EXTRA[kind](cls) : null);

module.exports = { band, styleHint, WORDS, EXTRA, isExtra, extraPrompt };
