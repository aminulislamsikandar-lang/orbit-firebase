'use strict';
// Accuracy guard for every AI-made video (Anime mode, Maths Get Video, Science Get Video).
//  1. ACCURACY_RULES / NO_INTRO_RULES: English text added to the hidden server prompt. Students never see or type it.
//  2. check(): a program (no AI call) that compares the finished video with the student's topic:
//       hard problem = the video swapped a term of the question for a look-alike (square -> rectangle, mitosis -> meiosis, ...). The video is NOT accepted.
//       soft problem = intro scene at the start, or the key words of the question are missing. The AI is asked to fix it once; the last try is accepted.
// Pure functions, no network. Tests: tests/video-guard.test.js

const ACCURACY_RULES = `ACCURACY RULES (very important, for every subject)
- Before writing anything, silently make a FACT SHEET from the question and the notes: every object, shape, organism, apparatus, formula, unit and number the question names, with its exact properties (for example a square has 4 equal sides and 4 right angles). Build every scene ONLY from this fact sheet.
- Never replace, simplify or approximate an object or term. If the question says "square", show a square (all sides equal), never a rectangle. If it says "mitosis", never explain meiosis. Same for every subject: use the exact term, figure, formula, organism, apparatus or unit named in the question.
- Do not add objects, numbers or facts that are not in the question, the notes or their direct solution. If you are not sure of a fact, leave it out.
- Every label, number and unit shown on screen must match the question exactly.
- Before you finish, check each scene against the fact sheet and fix any mismatch.`;

const NO_INTRO_RULES = `NO INTRODUCTION
- Do NOT make an introduction or title scene. Never show or say the subject name, chapter name, class, a greeting, "welcome" or "today we will learn".
- Scene 1 starts directly with the question's own content: show the given figure, data or statement and begin solving or explaining at once.
- Class, subject and chapter are given only so you understand the level. Never write them in the video.
- No filler scenes: every scene must help answer this one question.`;

// Look-alike groups. A video must not swap one member of a group for another.
const GROUPS = [
  ['square', 'rectangle', 'rhombus', 'parallelogram', 'trapezium', 'trapezoid', 'kite'],
  ['circle', 'ellipse', 'oval', 'semicircle'],
  ['triangle', 'quadrilateral', 'pentagon', 'hexagon'],
  ['cube', 'cuboid', 'sphere', 'cylinder', 'cone', 'pyramid', 'prism'],
  ['equilateral', 'isosceles', 'scalene'],
  ['acute', 'obtuse', 'reflex'],
  ['perimeter', 'area', 'volume', 'circumference'],
  ['numerator', 'denominator'],
  ['prime', 'composite'],
  ['factor', 'multiple'],
  ['hcf', 'lcm', 'gcd'],
  ['mean', 'median', 'mode'],
  ['sine', 'cosine', 'tangent'],
  ['mitosis', 'meiosis'],
  ['artery', 'vein', 'capillary'],
  ['xylem', 'phloem'],
  ['stamen', 'pistil', 'sepal', 'petal'],
  ['photosynthesis', 'respiration', 'transpiration'],
  ['herbivore', 'carnivore', 'omnivore'],
  ['autotroph', 'heterotroph', 'saprotroph', 'parasite'],
  ['evaporation', 'condensation', 'boiling', 'melting', 'freezing', 'sublimation'],
  ['conduction', 'convection', 'radiation'],
  ['speed', 'velocity', 'acceleration', 'displacement'],
  ['mass', 'weight'],
  ['oxidation', 'reduction'],
  ['endothermic', 'exothermic'],
  ['fission', 'fusion'],
  ['solute', 'solvent', 'solution'],
  ['element', 'compound', 'mixture'],
  ['acid', 'base', 'alkali', 'salt'],
  ['reflection', 'refraction'],
  ['convex', 'concave'],
  ['noun', 'pronoun', 'verb', 'adjective', 'adverb']
];

const STOP = new Set(('about above after again also among because before being below between both could does doing during each every explain find from give have here into just kind like make many more most much must name often only other over please question same should show some state such than that their them then there these they this those through under until very want what when where which while whose will with would write your answer answers class chapter solve tell video draw given following statement true false correct incorrect option options define describe discuss'.split(' ')));

const words = t => String(t || '').toLowerCase().replace(/[^a-z0-9\u0900-\u097f\u0980-\u09ff\s]/g, ' ').split(/\s+/).filter(Boolean);
const stem = w => w.length > 4 ? w.replace(/(ies|es|s)$/, m => (m === 'ies' ? 'y' : '')) : w;
const same = (w, term) => w === term || stem(w) === stem(term) || w === term + 's' || w === term + 'es';
const has = (ws, term) => ws.some(w => same(w, term));

// The text a person sees or hears: a Get Video plan (title, caps, say, board lines, notes) or an Anime video (title and text items).
function planText(v) {
  const out = [];
  if (!v || typeof v !== 'object') return '';
  if (v.title) out.push(typeof v.title === 'string' ? v.title : (v.title.en || ''));
  for (const s of (v.steps || [])) {
    out.push((s.cap && (s.cap.en || '')) || '', (s.say && (s.say.en || '')) || '');
    if (s.anim) { out.push(...(s.anim.lines || []), s.anim.note || ''); }
  }
  for (const sc of (v.scenes || [])) for (const it of (sc.items || [])) if (it.t === 'text') out.push(it.v);
  return out.join(' \n ');
}

// Text of the FIRST step / scene only (the place where an intro would be).
function firstText(v) {
  if (!v) return '';
  if (Array.isArray(v.steps) && v.steps[0]) {
    const s = v.steps[0];
    return [(s.cap && (s.cap.en || s.cap.hg || s.cap.hi)) || '', (s.say && (s.say.en || s.say.hi)) || '', ...((s.anim && s.anim.lines) || [])].join(' \n ');
  }
  if (Array.isArray(v.scenes) && v.scenes[0]) return (v.scenes[0].items || []).filter(i => i.t === 'text').map(i => i.v).join(' \n ');
  return '';
}

const INTRO_EN = /\b(welcome|hello|hi everyone|namaste|swagat|today we(?:\s+will|\s+are|'ll)?|in this (?:video|lesson|chapter)|let'?s (?:learn|begin|start)|introduction|intro|chapter\s*\d*|class\s*\d+|subject)\b/i;
const INTRO_HI = /(\u0906\u091C \u0939\u092E|\u0928\u092E\u0938\u094D\u0924\u0947|\u0935\u0947\u0932\u0915\u092E|\u091A\u0948\u092A\u094D\u091F\u0930|\u0905\u0927\u094D\u092F\u093E\u092F|\u0915\u094D\u0932\u093E\u0938 \d|\u0907\u0902\u091F\u094D\u0930\u094B\u0921\u0915\u094D\u0936\u0928|\u092A\u0930\u093F\u091A\u092F)/;
const INTRO_HG = /\b(aaj hum|aaj ham|swagat|namaste)\b/i;

function check(video, topic, opts) {
  const o = opts || {}, hard = [], soft = [];
  const q = words(topic), v = words(planText(video));
  if (!q.length) return { hard, soft };

  // 1) look-alike swap: the question names X, the video never names X but names Y of the same group.
  for (const g of GROUPS) {
    const inQ = g.filter(t => has(q, t)), inV = g.filter(t => has(v, t));
    if (!inQ.length) continue;
    const kept = inQ.some(t => has(v, t)), swapped = inV.filter(t => !has(q, t));
    if (!kept && swapped.length) hard.push('The question is about "' + inQ[0] + '" but the video talks about "' + swapped[0] + '". Use "' + inQ[0] + '" exactly as in the question; never replace it with a look-alike.');
  }

  // 2) intro scene at the start
  const first = firstText(video), qs = String(topic || '');
  const hit = [INTRO_EN, INTRO_HI, INTRO_HG].map(r => r.exec(first)).find(m => m && !new RegExp(String(m[0]).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(qs));
  if (hit) soft.push('Step/scene 1 is an introduction ("' + String(hit[0]).slice(0, 20) + '"). Remove it: start directly with the question\'s own content. Never mention subject, chapter, class or a greeting.');

  // 3) key words of the question must appear in the video
  const keys = [...new Set(q.filter(w => /^[a-z]+$/.test(w) && w.length >= 5 && !STOP.has(w)))].slice(0, 12);
  if (!o.skipCoverage && keys.length >= 2) {
    const miss = keys.filter(k => !v.some(w => w.slice(0, 5) === k.slice(0, 5)));
    if (miss.length / keys.length > 0.6) soft.push('The video does not cover the key words of the question: ' + miss.slice(0, 5).join(', ') + '. Explain exactly what the question asks.');
  }
  return { hard, soft };
}

module.exports = { ACCURACY_RULES, NO_INTRO_RULES, GROUPS, check, planText, firstText };
