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

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
