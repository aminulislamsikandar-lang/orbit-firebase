/* Tests for Get Video: powers, True/False, question normaliser, prompt switching.
 * Run:  node tests/mathvideo-power-tf.test.js        (no npm packages, no network, no real AI)
 */
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const MV = require(path.join(ROOT, 'public/mathvideo-admin.js'));
const demo = JSON.parse(fs.readFileSync(path.join(ROOT, 'integers-power-true-false-demo.json'), 'utf8'));

let pass = 0, fail = 0;
function t(name, ok, extra) { if (ok) { pass++; console.log('PASS  ' + name); } else { fail++; console.log('FAIL  ' + name + (extra ? '  -> ' + extra : '')); } }
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const clone = o => JSON.parse(JSON.stringify(o));
const val = (txt) => { const r = MV.calcEx(txt); return r && r.v !== undefined ? r.v : r; };

// a tiny one-step plan around some board lines, for line-level tests
function mini(lines, note, say) {
  return { id: 't', type: 'equation', version: 1, title: { en: 'a', hg: 'a', hi: 'a' },
    steps: [{ cap: { en: 'a', hg: 'a', hi: 'a' }, say: { en: 'a', hi: say || 'एक' }, anim: Object.assign({ lines: lines, highlight: [] }, note ? { note: note } : {}) }] };
}

console.log('--- 1. Validator: powers ---');
t('(-1)^103 = -1', val('(-1)^103') === -1);
t('(-1)^104 = 1', val('(-1)^104') === 1);
t('(-2)^2 = 4 (bracketed base)', val('(-2)^2') === 4);
t('-2^2 = -4 (no bracket)', val('-2^2') === -4);
t('2^10 = 1024', val('2^10') === 1024);
t('3^0 = 1', val('3^0') === 1);
t('2 ** 5 + 3 ^ 2 = 41', val('2 ** 5 + 3 ^ 2') === 41);
t('(1+2)^3 = 27 (bracketed expression as base)', val('(1+2)^3') === 27);
t('superscript in a line: (-1)\u00B9\u2070\u00B3 = -1', val('(-1)\u00B9\u2070\u00B3') === -1);
t('0^0 rejected', !!(MV.calcEx('0^0') || {}).err && MV.validate(mini(['0^0'])).errors.length > 0);
t('exponent 201 rejected', !!(MV.calcEx('2^201') || {}).err && MV.validate(mini(['2^201'])).errors.length > 0);
t('exponent 200 allowed for base 1', val('1^200') === 1);
t('huge result rejected (9^20)', !!(MV.calcEx('9^20') || {}).err && MV.validate(mini(['9^20'])).errors.length > 0);
t('15 digits allowed: 10^14', val('10^14') === 1e14);
t('16 digits rejected: 10^15', !!(MV.calcEx('10^15') || {}).err);
t('negative exponent rejected', !!(MV.calcEx('2^-1') || {}).err);
t('decimal base rejected', !!(MV.calcEx('1.5^2') || {}).err);
t('fraction base rejected', !!(MV.calcEx('(1/2)^2') || {}).err);
t('power chain 2^3^2 rejected', !!(MV.calcEx('2^3^2') || {}).err);
t('bracket exponent rejected', !!(MV.calcEx('2^(3)') || {}).err);
t('line "-2^2 = -4" validates', eq(MV.validate(mini(['-2^2 = -4'])).errors, []));
t('line "(-2)^2 = 4" validates', eq(MV.validate(mini(['(-2)^2 = 4'])).errors, []));
t('line "-2^2 = 4" rejected', MV.validate(mini(['-2^2 = 4'])).errors.length > 0);
t('wrong working line rejected', MV.validate(mini(['(-1)^103 + (-1)^104', '= -1 + 2'])).errors.length > 0);
t('right working line accepted', eq(MV.validate(mini(['(-1)^103 + (-1)^104', '= -1 + 1', '= 0'], 'Answer: 0')).errors, []));
t('wrong final number note rejected', MV.validate(mini(['(-1)^103 + (-1)^104', '= 0'], 'Answer: 5')).errors.length > 0);
t('digits inside say.hi still warned', MV.validate(mini(['2 + 3'], '', 'आंसर 5 है')).warnings.some(w => /digits/.test(w)));

console.log('--- 2. Normaliser ---');
const SUPQ = '(\u22121)\u00B9\u2070\u00B3 + (\u22121)\u00B9\u2070\u2074 = 0; True or False ?';
t('superscripts -> caret form', MV.prepQuestion(SUPQ) === '(-1)^103 + (-1)^104 = 0; True or False ?', MV.prepQuestion(SUPQ));
t('** -> ^', MV.prepQuestion('2 ** 5 + 3 ** 2') === '2 ^ 5 + 3 ^ 2');
t('flattened "(-1)103" -> "(-1)^103"', MV.prepQuestion('(\u22121)103 + (\u22121)104 = 0') === '(-1)^103 + (-1)^104 = 0');
t('ambiguous "(2)3 + 5" left alone', MV.prepQuestion('(2)3 + 5') === '(2)3 + 5');
t('ambiguous "(-3)4.5" left alone', MV.prepQuestion('(-3)4.5 + 1') === '(-3)4.5 + 1');
t('superscript key == caret key', MV.normQuestion(SUPQ) === MV.normQuestion('(-1)^103 + (-1)^104 = 0; True or False ?'));
t('** key == caret key', MV.normQuestion('(-2)**3') === MV.normQuestion('(-2)^3'));
t('plain question key unchanged', MV.normQuestion('(\u22128) + 5 ka answer batao') === '(-8)+5kaanswerbatao');
t('times/divide key unchanged', MV.normQuestion('(-3) \u00D7 4 \u00F7 2') === '(-3)*4/2');

console.log('--- 3. True / False validator ---');
const Q = '(-1)^103 + (-1)^104 = 0; True or False ?';
t('parseTF sample', eq(MV.parseTF(Q), { tf: true, left: 0, right: 0, text: '(-1)^103 + (-1)^104 = 0' }), JSON.stringify(MV.parseTF(Q)));
t('parseTF false statement', MV.parseTF('(-1)^103 + (-1)^104 = 5; True or False?').right === 5);
t('parseTF Hindi phrase', MV.parseTF('7 - (-3) = 10 \u0938\u0939\u0940 \u092F\u093E \u0917\u0932\u0924').left === 10);
t('parseTF "3 x 4" as times', MV.parseTF('(-3) x 4 = -12. State whether true or false').left === -12);
t('not True/False -> tf false', MV.parseTF('(-8) + 5 ka answer batao').tf === false);
// REGRESSION: the exact sample from the student
const vSample = MV.validate(demo, { question: Q });
t('REGRESSION (-1)^103 + (-1)^104 = 0 -> demo plan: 0 errors', vSample.errors.length === 0, vSample.errors.join(' | '));
t('REGRESSION demo plan: 0 warnings', vSample.warnings.length === 0, vSample.warnings.join(' | '));
t('REGRESSION demo ends with "Answer: True"', /^Answer: True/.test(demo.steps[demo.steps.length - 1].anim.note));
t('demo also valid without the question (admin panel)', eq(MV.validate(demo), { errors: [], warnings: [] }));
t('demo also valid for the superscript spelling', MV.validate(demo, { question: MV.prepQuestion(SUPQ) }).errors.length === 0);
// helper: change the claimed number "= 0" to "= N" in the statement lines (steps 1, 2, 9) and in the pen cues that point at it
function setClaim(plan, n) {
  [0, 1, 8].forEach(i => {
    const an = plan.steps[i].anim;
    an.lines[0] = '(-1)^103 + (-1)^104 = ' + n;
    (an.cues || []).forEach(c => { if (c.point && c.point.line === 0 && c.point.word === '= 0') c.point.word = '= ' + n; });
  });
  return plan;
}
// plan says True, maths says False
const wrongTrue = setClaim(clone(demo), 5);                      // statement "= 5" but the note still says "Answer: True (0 = 0)"
const vWT = MV.validate(wrongTrue);
t('plan says True for "= 5" -> rejected (plan alone)', vWT.errors.some(e => /galat hai/.test(e)), JSON.stringify(vWT.errors));
t('plan says True for "= 5" -> rejected (with question)', MV.validate(wrongTrue, { question: '(-1)^103 + (-1)^104 = 5; True or False?' }).errors.some(e => /galat hai/.test(e)));
// proper False plan
const falsePlan = setClaim(clone(demo), 5);
falsePlan.steps[7].anim.lines = ['(-1)^103 + (-1)^104', '= 0', '0 = 5'];
falsePlan.steps[8].anim.note = 'Answer: False (0 \u2260 5)';
const QF = '(-1)^103 + (-1)^104 = 5; True or False?';
const vF = MV.validate(falsePlan, { question: QF });
t('ACCEPTANCE False statement + "Answer: False (0 \u2260 5)" -> accepted', vF.errors.length === 0 && vF.warnings.length === 0, JSON.stringify(vF));
t('False plan sent for the TRUE question -> rejected', MV.validate(falsePlan, { question: Q }).errors.length > 0);
t('True plan sent for the FALSE question -> rejected', MV.validate(demo, { question: QF }).errors.length > 0);
const badBr = clone(falsePlan); badBr.steps[8].anim.note = 'Answer: False (0 = 5)';
t('note bracket with wrong operator rejected', MV.validate(badBr, { question: QF }).errors.some(e => /bracket/.test(e)), JSON.stringify(MV.validate(badBr, { question: QF }).errors));
const noNote = clone(demo); noNote.steps[8].anim.note = 'Answer: 0';
t('True/False question but numeric note -> rejected', MV.validate(noNote, { question: Q }).errors.length > 0);
const changedQ = setClaim(clone(demo), 7);                       // the AI quietly changed 0 into 7
t('AI changes the claimed number -> rejected', MV.validate(changedQ, { question: Q }).errors.some(e => /question/.test(e)), JSON.stringify(MV.validate(changedQ, { question: Q }).errors));
const badLine = clone(demo); badLine.steps[5].anim.lines[1] = '= -1 + 2';
t('wrong working line inside True/False plan rejected', MV.validate(badLine, { question: Q }).errors.length > 0);
const trueSmall = mini(['(-3) \u00D7 4 = -12', '= -12'], 'Answer: True (-12 = -12)');
t('plain-integer True statement accepted', eq(MV.validate(trueSmall, { question: '(-3) x 4 = -12. True or False?' }).errors, []));

console.log('--- 4. Server prompt switching (server.js code extracted and run, AI not called) ---');
const src = fs.readFileSync(path.join(ROOT, 'server.js'), 'utf8');
const a = src.indexOf("const MV = require('./public/mathvideo-admin.js');"), b = src.indexOf("app.post('/api/mathvideo/generate'");
t('found the Get Video block in server.js', a > 0 && b > a);
const S = new vm.Script('(function(require){' + src.slice(a, b) + '\nreturn {mvSystem,mvBase,mvKind,mvNorm,mvQuality,mvPrecheck,MV_SYSTEM,MV_EXAMPLE,MV_EXAMPLE_POW,MV_TF_SHORT,MV_STYLE,MV_STYLE_LINE};})');
const sv = S.runInThisContext()(() => MV);
const exJSON = JSON.stringify(sv.MV_EXAMPLE), powJSON = JSON.stringify(sv.MV_EXAMPLE_POW);
t('MV_EXAMPLE (old) still valid', eq(MV.validate(sv.MV_EXAMPLE), { errors: [], warnings: [] }));
t('MV_EXAMPLE_POW valid (0 errors, 0 warnings)', eq(MV.validate(sv.MV_EXAMPLE_POW, { question: '(-1)^103 + (-1)^104' }), { errors: [], warnings: [] }));
t('MV_TF_SHORT == steps 8-9 of the demo file', eq(sv.MV_TF_SHORT, demo.steps.slice(-2)));
const plainP = sv.mvSystem(2, '(-8) + 5 ka answer batao');
t('plain question: prompt is exactly the old MV_SYSTEM', plainP === sv.MV_SYSTEM && plainP.includes(exJSON) && !plainP.includes(powJSON));
const powP = sv.mvSystem(2, '(-2)^3 ka answer batao');
t('power question: second example + POWERS recipe', powP.includes(powJSON) && !powP.includes(exJSON) && powP.includes('POWERS (this question has a power)') && !powP.includes('TRUE / FALSE'));
t('power question: unsupported rule mentions powers', powP.includes('powers written with ^') && powP.includes('Use + - \u00D7 \u00F7, ^ (power)'));
t('"square" / "cube" / "power" trigger the power prompt', ['square of -3', 'cube of 2', 'power of 2'].every(q => sv.mvKind(q).pow));
t('superscript question (after prep) triggers the power prompt', sv.mvKind(MV.prepQuestion(SUPQ)).pow);
const tfPlain = sv.mvSystem(2, '(-3) x 4 = -12; True or False?');
t('True/False without power: old example + TRUE / FALSE recipe', tfPlain.includes(exJSON) && tfPlain.includes('TRUE / FALSE') && !tfPlain.includes('POWERS (this'));
const both = sv.mvSystem(2, MV.prepQuestion(SUPQ));
t('True/False with power: both recipes + short example', both.includes(powJSON) && both.includes('POWERS (this') && both.includes('TRUE / FALSE') && both.includes(JSON.stringify(sv.MV_TF_SHORT)));
[0, 1, 3].forEach(l => {
  ['(-8) + 5', '(-2)^3', MV.prepQuestion(SUPQ)].forEach(q => {
    const p = sv.mvSystem(l, q);
    t('English-words level ' + l + ' works for "' + q.slice(0, 14) + '..."', p.includes(sv.MV_STYLE[l]) && !p.includes(sv.MV_STYLE_LINE) && p.includes('IMPORTANT: the example above'));
  });
});
t('level 2 has no IMPORTANT note (as before)', !sv.mvSystem(2, '(-2)^3').includes('IMPORTANT: the example above'));
t('cache key: level appended only for level != 2 (code path unchanged)', /mvNorm\(raw\) \+ \(eng === 2 \? '' : '\|e' \+ eng\)/.test(src));
t('server cache key: superscript == caret', sv.mvNorm(MV.prepQuestion(SUPQ)) === sv.mvNorm(Q));
const oldNorm = x => String(x || '').toLowerCase().replace(/[\u2212\u2013\u2014]/g, '-').replace(/[\u00D7\u2715\u00B7]/g, '*').replace(/\u00F7/g, '/').replace(/\s+/g, '');
['(\u22128) + 5', '(-3) \u00D7 4', '7 - (-3)', '(-12) \u00F7 3', '(-12) / 3 ka answer', '2 + 3 \u00D7 4 - 1'].forEach(q =>
  t('old key == new key for "' + q + '"', sv.mvNorm(q) === oldNorm(q)));
const flatPlan = { steps: [{ anim: {} }, { anim: {} }, { anim: {} }, { anim: {} }, { anim: {} }, { anim: {} }, { anim: { cues: [1, 2, 3, 4] } }] };
t('mvQuality: power question does NOT demand a number line', !sv.mvQuality(flatPlan, '(-1)^103 + (-1)^104').some(m => /number line/.test(m)));
t('mvQuality: plain small question still demands it', sv.mvQuality(flatPlan, '(-8) + 5').some(m => /number line/.test(m)));
t('multi-option question -> clear Hinglish reason', /kai options/.test(sv.mvPrecheck('Circle the problem whose answer is -5: (a) 40 / 8 (b) 15 - 10 (c) (-20) / 4')));
t('multi-option without letters -> clear reason', /kai options/.test(sv.mvPrecheck('Circle the problem whose answer is -5: 40 / 8, (-25) / 5, 15 - 10')));
['(-8) + 5 ka answer batao', '(-1)^103 + (-1)^104 = 0; True or False ?', '2^5 + 3^2', 'Choose the correct answer: (-12) / 3 = ?'].forEach(q =>
  t('no pre-check block for "' + q.slice(0, 30) + '"', sv.mvPrecheck(q) === ''));
t('True/False with a too-big power -> pre-check reason', /bahut bada/.test(sv.mvPrecheck('9^20 = 5; True or False?')));

/* ---------- 5. Hidden question id: Copy question -> Get Video -> admin form auto-fill ---------- */
async function hiddenIdTests() {
  console.log('--- 5. Hidden question id (copy -> paste -> admin form) ---');
  const html = fs.readFileSync(path.join(ROOT, 'public/index.html'), 'utf8');
  const courses = require(path.join(ROOT, 'questions-public.js')).courses;
  const mathsQs = [];
  courses.filter(c => c.subject === 'Mathematics').forEach(c => c.chapters.forEach(ch => (ch.sections || []).forEach(s => s.questions.forEach(q => mathsQs.push({ c, ch, q })))));
  const IDX = {}; courses.forEach(c => c.chapters.forEach(ch => (ch.sections || []).forEach(s => s.questions.forEach(q => { IDX[q.id] = { course: c, ch, q }; }))));
  const secOf = (ch, q) => (ch.sections || []).findIndex(sec => sec.questions.indexOf(q) >= 0) + 1;
  const infoOf = (c, ch, q) => ({ id: q.id, cls: c.class, subject: c.subject, medium: c.medium, chNo: ch.no, secNo: secOf(ch, q), qNo: q.no });
  const qSrc = q => [q.text].concat(q.parts || [], q.options || []).filter(Boolean).join('\n');

  // 5a. tag / untag
  const A4 = IDX['m7c1-a4'].q, A4txt = qSrc(A4);
  const tagged = MV.tagQuestion(A4txt, 'm7c1-a4');
  t('tag is invisible: text + only zero-width characters added', tagged.replace(/[\uFEFF\u200B\u200C\u200D\u2060]/g, '') === A4txt && tagged.length > A4txt.length);
  t('untag gives back the clean text and the id', eq(MV.untagQuestion(tagged), { text: A4txt, qid: 'm7c1-a4' }));
  t('text without a tag is unchanged', eq(MV.untagQuestion('(-8) + 5 ka answer batao'), { text: '(-8) + 5 ka answer batao', qid: '' }));
  t('tagging twice keeps only the new id', MV.untagQuestion(MV.tagQuestion(tagged, 'm7c1-b2')).qid === 'm7c1-b2' && MV.untagQuestion(MV.tagQuestion(tagged, 'm7c1-b2')).text === A4txt);
  t('bad id is not tagged', MV.tagQuestion('abc', 'bad id!') === 'abc' && MV.tagQuestion('abc', '') === 'abc');
  t('tag pasted after other text is still found', MV.untagQuestion('hello ' + tagged).qid === 'm7c1-a4');
  t('library key: tagged paste == typed question', MV.normQuestion(MV.untagQuestion(tagged).text) === MV.normQuestion(A4txt));
  const Z = ['\u200B', '\u200C', '\u200D', '\u2060'], ch = c => Z[(c >> 6) & 3] + Z[(c >> 4) & 3] + Z[(c >> 2) & 3] + Z[c & 3];
  const fake = '\uFEFF' + ch(1) + ch(2) + '\uFEFF' + 'hello';   // decodes to control characters
  t('tag that decodes to junk is removed, no id', eq(MV.untagQuestion(fake), { text: 'hello', qid: '' }));
  t('too-short invisible run is left alone', MV.untagQuestion('\uFEFF\u200B\u200C\uFEFFhi').qid === '');
  t('longest allowed id still fits the 570 box (162 + 400)', MV.tagQuestion('x'.repeat(400), 'a'.repeat(40)).length <= 570);

  // 5b. every maths question: round trip + admin fields + unique valid codes
  let allOk = true, codes = new Set(), dup = '', badCode = '';
  mathsQs.forEach(({ c, ch, q }) => {
    const rt = MV.untagQuestion(MV.tagQuestion(qSrc(q), q.id));
    if (rt.qid !== q.id || rt.text !== qSrc(q)) allOk = false;
    const f = MV.qFields(infoOf(c, ch, q));
    if (!f) { allOk = false; return; }
    const code = MV.makeCode({ school: 'nashibali', cls: f.cls, medium: f.medium, subject: f.subject, ex: f.ex, q: f.q, part: f.part });
    if (!MV.CODE_RE.test(code)) badCode = badCode || (q.id + ' -> ' + code);
    if (codes.has(code)) dup = dup || (q.id + ' -> ' + code);
    codes.add(code);
  });
  t('all ' + mathsQs.length + ' maths questions: id round trip + fields found', allOk && mathsQs.length > 100);
  t('every maths code passes CODE_RE', badCode === '', badCode);
  t('no two maths questions get the same code', dup === '', dup);
  t('m7c1-a4 -> class7 / math / englishmedium / EX:1.1 / Q4', eq(MV.qFields({ cls: 7, subject: 'Mathematics', medium: undefined, chNo: 1, secNo: 1, qNo: 4 }), { cls: 'class7', subject: 'math', medium: 'englishmedium', ex: '1.1', q: '4', part: '' }));
  t('qFields from the real index: m7c1-a4 and m6c1-mm1 (section 9)', (f => f && f.ex === '1.1' && f.q === '4')(MV.qFields(infoOf(IDX['m7c1-a4'].course, IDX['m7c1-a4'].ch, IDX['m7c1-a4'].q))) && (f => f && f.ex === '1.9' && f.q === '1')(MV.qFields(infoOf(IDX['m6c1-mm1'].course, IDX['m6c1-mm1'].ch, IDX['m6c1-mm1'].q))));
  t('qFields: missing section / question number -> null', MV.qFields({ cls: 7, subject: 'Mathematics', chNo: 1, qNo: 4 }) === null && MV.qFields({ cls: 7, subject: 'Mathematics', chNo: 1, secNo: 1 }) === null);
  t('unknown medium: still filled; the admin form ignores a value its Medium list does not have', (f => f && f.medium === 'klingonmedium' && f.ex === '1.1')(MV.qFields({ cls: 7, subject: 'Mathematics', medium: 'Klingon', chNo: 1, secNo: 1, qNo: 4 })));

  // 5c. index.html glue: mvQFields, qCopy and gvRun are cut out of the real file and run with stubs
  const grab = (from, to) => { const i = html.indexOf(from), j = html.indexOf(to, i); if (i < 0 || j < 0) throw new Error('marker missing: ' + from); return html.slice(i, j); };
  const mvq = grab('window.mvQFields=', '\nasync function copy(id)');
  const winA = { MathVideo: MV };
  const mvQFields = new vm.Script('(function(window,IDX){' + mvq + '\nreturn window.mvQFields;})').runInThisContext()(winA, IDX);
  t('window.mvQFields(m7c1-a4) -> admin fields', (f => f && f.ex === '1.1' && f.q === '4' && f.cls === 'class7' && f.medium === 'englishmedium')(mvQFields('m7c1-a4')));
  t('window.mvQFields(unknown id) -> null', mvQFields('nope') === null);

  const qcopySrc = grab('async function qCopy(id){', '// Used by the admin Math Video panel');
  async function copyOf(qid) {
    let written = null; const UI = {};
    const run = new vm.Script('(function(ui,qFor,qSrc,courseOfId,window,navigator,draw,setTimeout,document){' + qcopySrc + '\nreturn qCopy;})').runInThisContext();
    const qCopy = run(id => UI[id] || (UI[id] = {}), id => (IDX[id] || {}).q, qSrc, id => (IDX[id] || {}).course, { MathVideo: MV },
      { clipboard: { writeText: async x => { written = x; } } }, () => {}, () => 0, {});
    await qCopy(qid); return written;
  }
  const copiedMath = await copyOf('m7c1-a4');
  t('Copy question (maths): clean text + hidden id', eq(MV.untagQuestion(copiedMath), { text: A4txt, qid: 'm7c1-a4' }) && copiedMath !== A4txt);
  const sciId = courses.find(c => c.subject === 'Science').chapters[0].sections[0].questions[0].id;
  const copiedSci = await copyOf(sciId);
  t('Copy question (science): plain text, no hidden characters', copiedSci === qSrc(IDX[sciId].q) && !/[\uFEFF\u200B\u200C\u200D\u2060]/.test(copiedSci));

  const gvSrc = grab('const gvNorm=', 'document.addEventListener(\'input\',e=>{if(e.target&&e.target.id===\'gvText\')');
  async function runGv(pasted, eng, sub) {
    const calls = { api: null, pending: null, played: false }, GV = { sub: sub || 'Mathematics', tx: { Mathematics: '', Science: '' }, text: pasted, busy: false, msg: '', err: false, plan: null, eng: eng == null ? 2 : eng };
    const planStub = { id: 'p', steps: [] };
    const win = { MathVideo: MV, MathVideoPlayer: { open: () => { calls.played = true; } },
      CLOUD: { mathVideo: { askedGet: async () => null, pendingAdd: (k, x, p, qid) => { calls.pending = { k, x, p, qid, store: 'math' }; return Promise.resolve(); } },
        scienceVideo: { askedGet: async () => null, pendingAdd: (k, x, p, qid) => { calls.pending = { k, x, p, qid, store: 'science' }; return Promise.resolve(); } } } };
    const mk = new vm.Script('(function(window,GV,document,navigator,draw,api,errMsg,crypto,TextEncoder,IDX){' + gvSrc + '\nreturn {gvRun,gvKey};})').runInThisContext();
    const fns = mk(win, GV, { getElementById: () => null }, { onLine: true }, () => {}, async (u, body) => { calls.api = body; calls.url = u; return { plan: planStub }; }, e => String(e), globalThis.crypto, TextEncoder, IDX);
    await fns.gvRun(); return { calls, GV, gvKey: fns.gvKey };
  }
  const r1 = await runGv(tagged);
  const typed = await runGv(A4txt);
  t('Get Video: AI gets the clean question (no hidden characters)', r1.calls.api && r1.calls.api.text === A4txt.replace(/\s+/g, ' ').trim() && !/[\uFEFF\u200B\u200C\u200D\u2060]/.test(r1.calls.api.text));
  t('Get Video: request is saved with the textbook id', r1.calls.pending && r1.calls.pending.qid === 'm7c1-a4' && r1.calls.pending.x === r1.calls.api.text);
  t('Get Video: library key is the same for tagged paste and typed text', r1.calls.pending.k === typed.calls.pending.k && /^[0-9a-f]{40}$/.test(r1.calls.pending.k));
  t('Get Video: typed text -> request saved without a textbook id', typed.calls.pending && !typed.calls.pending.qid);
  const longTagged = MV.tagQuestion('1 + 2 = 3. '.repeat(40), 'm7c1-a4');
  const r2 = await runGv(longTagged);
  t('Get Video: clean text over 400 characters is refused, AI not called', r2.GV.err === true && /lamba/.test(r2.GV.msg) && r2.calls.api === null);
  t('textarea box fits question + hidden id (maths) and the longest science question', /id="gvText"[^>]*maxlength="760"/.test(html));

  // 5c2. only app questions, per subject; the science box
  const SQ = courses.filter(c => c.subject === 'Science').flatMap(c => c.chapters.flatMap(ch => (ch.sections || []).flatMap(sec => sec.questions)));
  const sq = SQ.find(q => !q.parts && !q.options && q.text.length > 25) || SQ[0];
  const ok1 = await runGv(sq.text, 2, 'Science');
  t('Science box: an app science question goes to /api/sciencevideo/generate', ok1.calls.api && ok1.calls.url === '/api/sciencevideo/generate' && ok1.calls.api.text === sq.text.replace(/\s+/g, ' ').trim() && ok1.calls.api.eng === undefined);
  t('Science box: request is saved in the science store without a textbook id', ok1.calls.pending && ok1.calls.pending.store === 'science' && !ok1.calls.pending.qid);
  t('Science box: library key differs from the maths key for the same words', ok1.calls.pending.k !== (await ok1.gvKey(sq.text, 2)) && /^[0-9a-f]{40}$/.test(ok1.calls.pending.k));
  const bad1 = await runGv(sq.text, 2, 'Mathematics');
  t('Maths box: an app SCIENCE question is refused, AI not called', bad1.GV.err === true && /sirf app ke Maths/.test(bad1.GV.msg) && bad1.calls.api === null);
  const bad2 = await runGv(A4txt, 2, 'Science');
  t('Science box: an app MATHS question is refused, AI not called', bad2.GV.err === true && /sirf app ke Science/.test(bad2.GV.msg) && bad2.calls.api === null);
  const bad3 = await runGv('(-8) + 5 ka answer batao', 2, 'Mathematics');
  t('Maths box: typed text that is not an app question is refused', bad3.GV.err === true && bad3.calls.api === null && bad3.calls.pending === null);
  const bad4 = await runGv('What is the capital of France and why is it famous', 2, 'Science');
  t('Science box: any other typed text is refused', bad4.GV.err === true && bad4.calls.api === null);
  const part = await runGv(A4txt + ' hello', 2, 'Mathematics');
  t('Maths box: app question + extra words is refused', part.GV.err === true && part.calls.api === null);
  t('Maths box: the app question with a hidden id still goes through', r1.GV.err === false || r1.calls.api !== null);
  const gvh = html.slice(html.indexOf('function gvHTML(){'), html.indexOf('async function gvRun(){'));
  t('Get Video page has a Maths / Science switch and hides the English-words slider for science', /data-act="gvsub"/.test(gvh) && /\$\{sci\?'':`<div style="margin-top:12px"><label for="gvEng"/.test(gvh));
  t('click handler wires the switch', /act==='gvsub'\)gvSwitch/.test(html));

  // 5c3. server: bank check + science prompt + science plan format
  const srv = fs.readFileSync(path.join(ROOT, 'server.js'), 'utf8');
  const cut = (from, to) => { const i = srv.indexOf(from), j = srv.indexOf(to, i); if (i < 0 || j < 0) throw new Error('server marker missing: ' + from); return srv.slice(i, j); };
  const QUIZ = require(path.join(ROOT, 'questions.js'));
  const bank = new vm.Script('(function(QUIZ,MV){' + cut('const MV_BANK', "app.post('/api/mathvideo/generate'") + '\nreturn {mvKnown,mvBank,MV_UNKNOWN_MSG};})').runInThisContext()(QUIZ, MV);
  const mq = mathsQs[0].q, mqSrc = qSrc(mq);
  t('server bank: every app maths question is known as Mathematics', mathsQs.every(({ q }) => bank.mvKnown(qSrc(q), 'Mathematics')));
  t('server bank: every app science question is known as Science', SQ.every(q => bank.mvKnown(qSrc(q), 'Science')));
  t('server bank: a maths question is NOT known as Science, and the reverse', !bank.mvKnown(mqSrc, 'Science') && !bank.mvKnown(qSrc(sq), 'Mathematics'));
  t('server bank: typed / changed text is refused', !bank.mvKnown('(-8) + 5 ka answer batao', 'Mathematics') && !bank.mvKnown(mqSrc + ' extra', 'Mathematics') && !bank.mvKnown('', 'Science'));
  t('server bank: spaces and capital letters do not matter', !!bank.mvKnown('  ' + mqSrc.toUpperCase().replace(/ /g, '   ') + ' ', 'Mathematics'));
  t('server bank: part-only paste (without the main question line) is refused', (() => { const x = mathsQs.find(({ q }) => (q.parts || []).length > 1); return !x || !bank.mvKnown(x.q.parts[1], 'Mathematics'); })());
  t('server bank: part (ii) with the main question line is accepted', (() => { const x = mathsQs.find(({ q }) => (q.parts || []).length > 1); return !x || !!bank.mvKnown(x.q.text + '\n' + x.q.parts[1], 'Mathematics'); })());
  t('server: maths route checks the bank before the cache, the AI and the daily quota', (h => h.indexOf('mvKnown(typed') > 0 && h.indexOf('mvKnown(typed') < h.indexOf('MV_CACHE.has') && h.indexOf('mvKnown(typed') < h.indexOf('MV_USE.get'))(cut("app.post('/api/mathvideo/generate'", "app.post('/api/sciencevideo/generate'")));
  t('server: science route checks the bank before the cache, the AI and the daily quota', (h => h.indexOf("mvKnown(typed, 'Science')") > 0 && h.indexOf("mvKnown(typed, 'Science')") < h.indexOf('MV_CACHE.has') && h.indexOf("mvKnown(typed, 'Science')") < h.indexOf('MV_USE.get'))(cut("app.post('/api/sciencevideo/generate'", 'const PORT')));
  const sciCode = new vm.Script('(function(){' + cut('const SCI_EXAMPLE', 'app.post(\'/api/sciencevideo/generate\'') + '\nreturn {SCI_EXAMPLE,SCI_SYSTEM,sciQuality};})').runInThisContext()();
  const sv = MV.validate(sciCode.SCI_EXAMPLE);
  t('science example plan passes the validator with no errors', sv.errors.length === 0, sv.errors.join(' | '));
  t('science example plan: no digits / Devanagari warnings, and the science notice is shown', sv.warnings.filter(w => /digits|Devanagari/.test(w)).length === 0 && sv.warnings.some(w => /Science video/.test(w)));
  t('science example plan passes the quality gate', sciCode.sciQuality(sciCode.SCI_EXAMPLE).length === 0);
  t('science prompt contains the example, the "unsupported" escape and the notes rule', sciCode.SCI_SYSTEM.indexOf(JSON.stringify(sciCode.SCI_EXAMPLE)) > 0 && /"unsupported": true/.test(sciCode.SCI_SYSTEM) && /Never invent facts/.test(sciCode.SCI_SYSTEM));
  t('science quality gate: 2 steps / no cues is rejected', sciCode.sciQuality({ steps: [{ anim: { cues: [] } }, { anim: { cues: [] } }] }).length === 2);
  const bad = clone(sciCode.SCI_EXAMPLE); bad.steps[2].anim.numberline = { min: 0, max: 5, dots: [] };
  t('science plan with a number line is rejected', MV.validate(bad).errors.some(e => /number line/.test(e)));
  const hop = clone(sciCode.SCI_EXAMPLE); hop.steps[0].anim.cues = [{ hop: { from: 1, to: 2 } }];
  t('science plan with a hop cue is rejected', MV.validate(hop).errors.length > 0);
  const wrongT = clone(sciCode.SCI_EXAMPLE); wrongT.type = 'poem';
  t('unknown plan type is rejected', MV.validate(wrongT).errors.some(e => /type/.test(e)));

  // 5d. admin panel: click a request -> form fills by itself (fake DOM, no browser)
  const store = (items) => ({ log: [], get: async () => null, set: async function (c, p) { this.log.push(['set', c, p]); }, del: async () => {}, list: async () => [],
    pendingList: async () => items, askedSet: async () => {}, pendingDel: async () => {} });
  const mkEl = tag => ({ tagName: tag.toUpperCase(), children: [], options: [], style: {}, value: '', textContent: '', appendChild(c) { this.children.push(c); if (this.tagName === 'SELECT') this.options.push(c); return c; } });
  global.document = { createElement: mkEl, createTextNode: x => ({ text: x }) };
  let saves = 0; global.localStorage = { getItem: () => null, setItem: () => { saves++; } }; global.confirm = () => true;
  const all = n => [n].concat(...(n.children || []).map(all));
  async function mount(items, optsExtra) {
    const root = mkEl('div'), st = store(items);
    MV.mountAdmin(root, st, Object.assign({}, optsExtra));
    await new Promise(r => setTimeout(r, 5));
    const els = all(root);
    const fieldOf = label => els.find(e => e.tagName === 'LABEL' && e.children[0] && e.children[0].text === label).children[1];
    const code = els.find(e => e.placeholder === 'code yahan apne aap ban jayega'), area = els.find(e => e.placeholder === 'Yahan plan JSON paste karo');
    const btn = text => els.find(e => e.tagName === 'BUTTON' && String(e.textContent).indexOf(text) === 0);
    const pq = els.find(e => e.tagName === 'DIV' && /^font-size:13px;margin:8px 0;white-space:pre-wrap/.test((e.style && e.style.cssText) || ''));   // the request box (the status line "msg" has the same words in another order)
    return { st, els, code, area, btn, pq, ex: fieldOf('Exercise / Example'), q: fieldOf('Question'), part: fieldOf('Part (khali bhi chalega)'), cls: fieldOf('Class'), subject: fieldOf('Subject'), medium: fieldOf('Medium'), school: fieldOf('School') };
  }
  const planOK = clone(demo);
  const reqs = [{ id: 'k1', text: A4txt, plan: planOK, qid: 'm7c1-a4' }, { id: 'k2', text: '2^5 + 3^2', plan: planOK }, { id: 'k3', text: 'x', plan: planOK, qid: 'zz-unknown9' }];
  const M = await mount(reqs, { qFields: mvQFields });
  t('request button shows the textbook id', !!M.btn('[m7c1-a4] '));
  saves = 0; M.btn('[m7c1-a4] ').onclick();
  t('click request: Exercise / Question / Class / Subject / Medium filled', M.ex.value === '1.1' && M.q.value === '4' && M.cls.value === 'class7' && M.subject.value === 'math' && M.medium.value === 'englishmedium' && M.part.value === '');
  t('click request: code is built', M.code.value === 'nashibali-class7-englishmedium-math-EX:1.1-Q4', M.code.value);
  t('click request: plan JSON is loaded and question + id shown', JSON.parse(M.area.value).type === 'equation' && /Textbook question: m7c1-a4/.test(M.pq.textContent) && /Code apne aap bhar gaya/.test(M.pq.textContent));
  t('auto-fill does not overwrite the admin remembered defaults', saves === 0, 'setItem calls: ' + saves);
  M.btn('Save').onclick(); await new Promise(r => setTimeout(r, 5));
  t('Save right after the click uses the auto-filled code (no retyping)', M.st.log.length === 1 && M.st.log[0][1] === 'nashibali-class7-englishmedium-math-EX:1.1-Q4' && M.st.log[0][2].type === 'equation');
  M.btn('2^5').onclick();
  t('next request without id: old Exercise / Question / code cleared', M.ex.value === '' && M.q.value === '' && M.part.value === '' && M.code.value === '' && M.pq.textContent.indexOf('Textbook question') < 0);
  M.btn('[zz-unknown9]').onclick();
  t('unknown textbook id: nothing guessed, admin told to fill by hand', M.ex.value === '' && /nahi bhar paye/.test(M.pq.textContent));
  M.school.value = 'otherschool'; M.btn('[m7c1-a4] ').onclick();
  t('School stays what the admin typed', M.code.value === 'otherschool-class7-englishmedium-math-EX:1.1-Q4', M.code.value);
  const M2 = await mount(reqs, {});
  M2.btn('[m7c1-a4] ').onclick();
  t('no qFields option: no crash, nothing filled', M2.ex.value === '' && /nahi bhar paye/.test(M2.pq.textContent));
  delete global.document; delete global.localStorage; delete global.confirm;

  // 5e. rules + service worker + cloud.js
  const rules = fs.readFileSync(path.join(ROOT, 'firestore.rules'), 'utf8'), pend = rules.slice(rules.indexOf('match /mathVideoPending/'), rules.indexOf('match /subscriptions/'));
  t('rules: pending allows only text, plan, uid, ts, qid', /hasOnly\(\['text', 'plan', 'uid', 'ts', 'qid'\]\)/.test(pend));
  t('rules: qid must be a string of at most 40 characters', /get\('qid', ''\) is string/.test(pend) && /get\('qid', ''\)\.size\(\) <= 40/.test(pend));
  t('rules: approved library keys unchanged (text, plan only)', /match \/mathVideoAsked\/\{key\}[\s\S]*?hasOnly\(\['text', 'plan'\]\)/.test(rules));
  const cloud = fs.readFileSync(path.join(ROOT, 'public/cloud.js'), 'utf8');
  t('cloud.js: qid is added to the request only when present', /pendingAdd\(key, text, plan, qid\)/.test(cloud) && /if \(qid\) d\.qid = qid/.test(cloud));
  t('sw.js: SHELL version is v29', /const SHELL = 'orbit-shell-v29'/.test(fs.readFileSync(path.join(ROOT, 'public/sw.js'), 'utf8')));
  const rsci = rules.slice(rules.indexOf('match /scienceVideoAsked/'), rules.indexOf('match /subscriptions/'));
  t('rules: science library is admin-write, signed-in read, type science, text <= 700', /scienceVideoAsked\/\{key\}[\s\S]*?allow read: if request\.auth != null;[\s\S]*?allow create, update: if isAdmin\(\)[\s\S]*?hasOnly\(\['text', 'plan'\]\)[\s\S]*?plan\.type == 'science'[\s\S]*?size\(\) <= 700/.test(rsci));
  t('rules: science pending = students add only, admin reads / deletes, own uid, key = 40 hex', /match \/sciencePending\/\{key\}[\s\S]*?hasOnly\(\['text', 'plan', 'uid', 'ts'\]\)[\s\S]*?uid == request\.auth\.uid[\s\S]*?plan\.type == 'science'[\s\S]*?allow read, delete: if isAdmin\(\)/.test(rsci) && /\[0-9a-f\]\{40\}/.test(rsci));
  t('rules: maths collections still only accept type equation', /mathVideoAsked[\s\S]*?plan\.type == 'equation'/.test(rules) && /mathVideoPending[\s\S]*?plan\.type == 'equation'/.test(rules));
  t('cloud.js: scienceVideo store uses scienceVideoAsked + sciencePending', /scienceVideo: \{/.test(cloud) && /'scienceVideoAsked'/.test(cloud) && /'sciencePending'/.test(cloud));
  t('team.js passes the science store to the admin panel', /science: window\.CLOUD\.scienceVideo/.test(fs.readFileSync(path.join(ROOT, 'public/team.js'), 'utf8')));
  t('team.js passes qFields to the admin panel', /qFields: function \(id\) \{ return window\.mvQFields/.test(fs.readFileSync(path.join(ROOT, 'public/team.js'), 'utf8')));
}

hiddenIdTests().then(() => {
  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
}).catch(e => { console.log('FAIL  section 5 crashed -> ' + (e && e.stack || e)); process.exit(1); });
