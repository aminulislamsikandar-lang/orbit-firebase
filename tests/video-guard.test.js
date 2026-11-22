// Accuracy guard for AI videos (video-guard-core.js) + the Anime "square" item and the no-intro rule (ask-core.js).
// Run: node tests/video-guard.test.js
const path = require('path');
const ROOT = path.join(__dirname, '..');
const G = require(path.join(ROOT, 'video-guard-core.js'));
const A = require(path.join(ROOT, 'ask-core.js'));
let pass = 0, fail = 0;
const t = (name, ok) => { if (ok) pass++; else { fail++; console.log('FAIL  ' + name); } };

const anime = (...texts) => ({ title: 'x', scenes: texts.map(v => ({ items: [{ t: 'text', v }] })) });
const plan = (...caps) => ({ title: { en: 't' }, steps: caps.map(c => ({ cap: { en: c }, say: { en: c }, anim: { lines: [c] } })) });

// look-alike swap = hard
let c = G.check(anime('Rectangle has 2 pairs of sides', 'Area = l x b'), 'Find the perimeter of a square of side 5 cm');
t('square question answered with a rectangle: hard problem', c.hard.some(h => /square/.test(h) && /rectangle/.test(h)));
c = G.check(anime('Square: all sides equal', 'Perimeter = 4 x side = 20'), 'Find the perimeter of a square of side 5 cm');
t('square question answered with a square: no problem', c.hard.length === 0);
c = G.check(anime('A square is a special rectangle', 'Perimeter of square = 4a'), 'perimeter of a square');
t('square kept and rectangle only mentioned: allowed', c.hard.length === 0);
c = G.check(plan('Meiosis makes gametes', 'Four cells form'), 'Explain the stages of mitosis');
t('mitosis question explained as meiosis: hard problem', c.hard.length === 1);
c = G.check(plan('Squares of numbers', 'Square of 5 is 25'), 'What is the square of 5?');
t('plural / singular forms match', c.hard.length === 0);
c = G.check(plan('Veins carry blood to the heart'), 'How do arteries carry blood?');
t('artery vs vein swap: hard problem', c.hard.length === 1);

// intro = soft
c = G.check(anime('Chapter 3: Nutrition in Plants', 'Class 7 Science', 'Plants make food'), 'How do plants make food?');
t('first scene with chapter/class: soft problem', c.soft.some(s => /introduction/.test(s)));
c = G.check(plan('Welcome! Today we will learn about plants', 'Plants make food'), 'How do plants make food?');
t('welcome / today we will: soft problem', c.soft.some(s => /introduction/.test(s)));
c = G.check(plan('Question: how do plants make food?', 'Leaves take carbon dioxide'), 'How do plants make food?');
t('first step that starts with the question: no intro problem', !c.soft.some(s => /introduction/.test(s)));
c = G.check(plan('Chapter test question: find x'), 'Chapter test question: find x');
t('word chapter in the question itself is not an intro', !c.soft.some(s => /introduction/.test(s)));

// coverage = soft
c = G.check(plan('Water cycle', 'Rain falls'), 'Explain photosynthesis chlorophyll sunlight glucose');
t('video about something else: key-word coverage problem', c.soft.some(s => /key words/.test(s)));
c = G.check(plan('Photosynthesis needs sunlight and chlorophyll', 'Glucose is made'), 'Explain photosynthesis chlorophyll sunlight glucose');
t('video covering the key words: fine', !c.soft.some(s => /key words/.test(s)));
c = G.check(plan('(-8) + 5'), '(-8) + 5', { skipCoverage: true });
t('maths numbers only: nothing flagged', c.hard.length === 0 && c.soft.length === 0);

// prompts
t('rules mention fact sheet and square/rectangle', /FACT SHEET/.test(G.ACCURACY_RULES) && /square/.test(G.ACCURACY_RULES));
t('no-intro rules forbid subject/chapter/class', /NO INTRODUCTION/.test(G.NO_INTRO_RULES) && /chapter/.test(G.NO_INTRO_RULES));
t('Anime prompt has both rule blocks and no title scene', /ACCURACY RULES/.test(A.ANIME_SYSTEM) && /NO INTRODUCTION/.test(A.ANIME_SYSTEM) && !/Scene 1 is the title/.test(A.ANIME_SYSTEM));
t('Anime prompt documents the square item', /"t":"square"/.test(A.ANIME_SYSTEM));
t('Anime prompt tells the AI that class/chapter are not to be written', /Never write them in the video/.test(A.buildAnimePrompt({ text: 'square', ctx: { cls: 7, subject: 'Maths', chapter: 'Shapes' } })));

// square item is drawn as an exact square
const v = A.sanitizeVideo({ scenes: [
  { items: [{ t: 'square', x: 10, y: 10, side: 20, c: '#fbbf24' }, { t: 'text', v: 'a' }] },
  { items: [{ t: 'square', x: 80, y: 40, side: 999, c: '#fbbf24' }, { t: 'text', v: 'b' }] },
  { items: [{ t: 'square', x: 5, y: 5, w: 8, h: 3, c: '#fbbf24' }, { t: 'text', v: 'c' }] }] });
const sq = v.scenes.map(s => s.items[0]);
t('square becomes a rect with width == height', sq.every(i => i.t === 'rect' && i.w === i.h));
t('square side is limited so it stays on the canvas', sq[1].w <= 52 && sq[1].x + sq[1].w <= 100 && sq[1].y + sq[1].h <= 56);
t('square with only w/h given still gets equal sides', sq[2].w === 8 && sq[2].h === 8);
t('a normal rect is still allowed to be a rectangle', (r => r.w !== r.h)(A.sanitizeVideo({ scenes: [{ items: [{ t: 'rect', x: 5, y: 5, w: 30, h: 10, c: '#2dd4bf' }, { t: 'text', v: 'a' }] }, { items: [{ t: 'text', v: 'b' }] }] }).scenes[0].items[0]));

// Get Video prompts in server.js carry the shared rules (the rules are interpolated, so a wrong name would print "undefined")
const srv = require('fs').readFileSync(path.join(ROOT, 'server.js'), 'utf8');
t('server.js adds the accuracy + no-intro rules to both Get Video prompts', (srv.match(/\$\{VG\.ACCURACY_RULES\}/g) || []).length === 2 && (srv.match(/\$\{VG\.NO_INTRO_RULES\}/g) || []).length === 2);
t('server.js runs the program check in both Get Video routes', (srv.match(/VG\.check\(/g) || []).length === 2);

console.log(pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
