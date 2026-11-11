// Video JSON repair in server.js: lenient parsing + dropping highlight indexes that do not exist.
// Run: node tests/mvfix.test.js
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(ROOT, 'server.js'), 'utf8');
const chunk = src.slice(src.indexOf('function mvParse'), src.indexOf('// Get Video accepts ONLY'));
const logs = [];
const { mvParse, mvFix, mvBad } = new Function('console', chunk + ';return {mvParse,mvFix,mvBad};')({ error: m => logs.push(m) });
const MV = require(path.join(ROOT, 'public/mathvideo-admin.js'));

let pass = 0, fail = 0;
const t = (name, ok) => { if (ok) { pass++; } else { fail++; console.log('FAIL  ' + name); } };
const plan = () => ({ id: 'x', type: 'equation', version: 1, title: { en: 't', hg: 't', hi: 'ट' }, steps: [
  { cap: { en: 'a', hg: 'a', hi: 'क' }, say: { en: 'a', hi: 'क' }, anim: { lines: ['(-8) + 5'], highlight: [0] } },
  { cap: { en: 'b', hg: 'b', hi: 'क' }, say: { en: 'b', hi: 'क' }, anim: { lines: ['(-8) + 5', '= -3'], highlight: [1], note: 'Answer: -3' } }] });

const bad = plan(); bad.steps[1].anim.highlight = [1, 5, -1, 'x', 1.5];
t('validator rejects a highlight index that does not exist', MV.validate(JSON.parse(JSON.stringify(bad))).errors.length > 0);
const fixed = mvFix(JSON.parse(JSON.stringify(bad)));
t('mvFix keeps only valid, unique indexes', JSON.stringify(fixed.steps[1].anim.highlight) === '[1]');
t('mvFix makes the plan pass the validator', MV.validate(fixed).errors.length === 0);
const none = plan(); delete none.steps[0].anim.highlight;
t('missing highlight becomes an empty list (validator needs an array)', MV.validate(mvFix(none)).errors.length === 0 && Array.isArray(none.steps[0].anim.highlight));
t('mvFix leaves a good plan unchanged', JSON.stringify(mvFix(plan())) === JSON.stringify(plan()));
t('mvFix ignores junk safely', mvFix(null) === null && mvFix({}).steps === undefined);

const j = JSON.stringify(plan());
t('parse: plain JSON', !!mvParse(j));
t('parse: fenced ```json', !!mvParse('```json\n' + j + '\n```'));
t('parse: text around the JSON', !!mvParse('Here you go:\n' + j + '\nDone.'));
t('parse: trailing commas repaired', JSON.stringify(mvParse('{"a":[1,2,],"b":{"c":3,},}')) === '{"a":[1,2],"b":{"c":3}}');
t('parse: stray backslash repaired', (mvParse('{"a":"uses \\(x\\) here"}') || {}).a === 'uses \\(x\\) here');
t('parse: truncated JSON gives null', mvParse(j.slice(0, 100)) === null);
t('parse: no JSON at all gives null', mvParse('sorry, I cannot') === null);

mvBad('Video', { text: '{"title":"abc"' + 'x'.repeat(400), provider: 'groq' });
t('mvBad logs provider, length and only head/tail of the reply', logs.length === 1 && /groq/.test(logs[0]) && logs[0].length < 420);

console.log(pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
