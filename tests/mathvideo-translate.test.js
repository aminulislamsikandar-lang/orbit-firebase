// Assamese + Bengali text for video plans: the AI translation step (server.js), the validator and the admin button.
// Run: node tests/mathvideo-translate.test.js
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(ROOT, 'server.js'), 'utf8');
const MV = require(path.join(ROOT, 'public/mathvideo-admin.js'));
const cut = (from, to) => { const i = src.indexOf(from), j = src.indexOf(to, i); if (i < 0 || j < 0) throw new Error('server marker missing: ' + from); return src.slice(i, j); };

let pass = 0, fail = 0;
const t = (name, ok, extra) => { if (ok) pass++; else { fail++; console.log('FAIL  ' + name + (extra ? '  ' + extra : '')); } };

// ---- run the real server code with a fake AI -------------------------------------------------
const logs = [];
const state = { calls: 0, reply: null, delay: 0, handlers: {}, admin: true };
const gemini = async (system, prompt, opts) => { state.calls++; state.last = { system, prompt, opts }; if (state.delay) await new Promise(r => setTimeout(r, state.delay)); if (state.reply instanceof Error) throw state.reply; return state.reply === null ? { text: '' } : { text: typeof state.reply === 'string' ? state.reply : JSON.stringify(state.reply) }; };
const app = { post: (p, h) => { state.handlers[p] = h; } };
const parseChunk = cut('function mvParse', '// Get Video accepts ONLY');
const trChunk = cut('// ---- Assamese + Bengali text for a video plan', '// ---- Get Video: student pastes');
const mod = new Function('console', 'crypto', 'MV', 'gemini', 'VIDEO_MODELS', 'app', 'isAdminReq', 'guardAI',
  parseChunk + '\n' + trChunk + '\nreturn {mvLangs, mvHasLangs, MV_TR_SYSTEM, MV_TR_CACHE, MV_TR_BUSY, MV_HARD, MV_TR_MS};')(
  { error: m => logs.push(String(m)), log() {} }, require('crypto'), MV, gemini, ['m1'], app, () => state.admin, () => true);

const base = () => ({ id: 'ask-1', type: 'equation', version: 1, title: { en: '(-8) + 5', hg: '(-8) + 5', hi: '(-8) + 5' }, steps: [
  { cap: { en: 'Question: (-8) + 5', hg: 'Question: (-8) + 5', hi: 'क्वेश्चन: (-8) + 5' }, say: { en: 'Our question is minus eight plus five.', hi: 'हमारा क्वेश्चन है, minus eight plus five।' }, anim: { lines: ['(-8) + 5'], highlight: [0] } },
  { cap: { en: 'Answer: -3', hg: 'Answer: -3', hi: 'आंसर: -3' }, say: { en: 'So the answer is minus three.', hi: 'तो आंसर है minus three।' }, anim: { lines: ['(-8) + 5', '= -3'], highlight: [1], note: 'Answer: -3' } }] });
const reply = (over) => {
  const r = { as: { title: '(-8) + 5 নম্বৰ লাইনত', steps: [{ cap: 'প্ৰশ্ন: (-8) + 5', say: "আমাৰ প্ৰশ্ন হ'ল minus eight plus five।" }, { cap: 'উত্তৰ: -3', say: 'গতিকে উত্তৰ হ\'ল minus three।' }] },
              bn: { title: '(-8) + 5 নাম্বার লাইনে', steps: [{ cap: 'প্রশ্ন: (-8) + 5', say: 'আমাদের প্রশ্ন হলো minus eight plus five।' }, { cap: 'উত্তর: -3', say: 'তাহলে উত্তর হলো minus three।' }] } };
  return Object.assign(r, over || {});
};
const reset = () => { state.calls = 0; state.reply = reply(); state.delay = 0; state.admin = true; mod.MV_TR_CACHE.clear(); mod.MV_TR_BUSY.clear(); logs.length = 0; };

(async () => {
  // 1. prompt
  t('prompt: asks for Assamese and Bengali in their own script, English phrases kept in English letters', /Assamese/.test(mod.MV_TR_SYSTEM) && /Bengali/.test(mod.MV_TR_SYSTEM) && /ENGLISH LETTERS/.test(mod.MV_TR_SYSTEM) && /Never write digits in "say"/.test(mod.MV_TR_SYSTEM));
  t('prompt: example is itself a valid shape (a plan with as/bn from it validates)', (() => { const p = base(); p.title.as = 'ক'; p.steps[0].say.bn = 'আমাদের প্রশ্ন হলো minus eight plus five।'; return MV.validate(p).errors.length === 0; })());
  t('translation time fits inside the 90 s the app waits', mod.MV_HARD < 90000 && mod.MV_TR_MS <= 30000);

  // 2. happy path
  reset(); let p = base(); let added = await mod.mvLangs(p, 24000, {});
  t('adds both languages', added.join() === 'as,bn' && mod.mvHasLangs(p));
  t('result passes the validator without warnings', (v => v.errors.length === 0 && v.warnings.length === 0)(MV.validate(p)));
  t('title, caption and spoken line of every step are filled for both', p.title.as && p.title.bn && p.steps.every(s => s.cap.as && s.cap.bn && s.say.as && s.say.bn));
  t('Latin-letter phrase is kept in the spoken line (for the English voice and the slider)', /minus eight plus five/.test(p.steps[0].say.as) && /minus eight plus five/.test(p.steps[0].say.bn));
  t('the AI got only the English text', (() => { const j = JSON.parse(state.last.prompt); return j.title === '(-8) + 5' && j.steps[1].say === 'So the answer is minus three.' && !/क्वेश्चन/.test(state.last.prompt); })());
  t('existing en / hg / hi text is not touched', p.steps[0].say.hi === base().steps[0].say.hi && p.title.hg === '(-8) + 5');

  // 3. cache + dedupe
  const calls1 = state.calls; const p2 = base(); await mod.mvLangs(p2, 24000, {});
  t('same English text again: served from the translation cache, no new AI call', state.calls === calls1 && mod.mvHasLangs(p2));
  reset(); state.delay = 40; const a = base(), b = base();
  await Promise.all([mod.mvLangs(a, 24000, {}), mod.mvLangs(b, 24000, {})]);
  t('two students at the same moment share ONE AI call', state.calls === 1 && mod.mvHasLangs(a) && mod.mvHasLangs(b));
  t('in-flight table is cleaned up', mod.MV_TR_BUSY.size === 0);

  // 4. skip rules
  reset(); p = base(); await mod.mvLangs(p, 5000, {}); t('less than 8 s left: no AI call, plan unchanged', state.calls === 0 && !('as' in p.title));
  reset(); p = base(); await mod.mvLangs(p, 24000, {}); const c = state.calls; await mod.mvLangs(p, 24000, {}); t('plan that already has both languages: no AI call', state.calls === c);
  reset(); t('junk input is ignored safely', (await mod.mvLangs(null, 24000, {})).length === 0 && (await mod.mvLangs({}, 24000, {})).length === 0 && (await mod.mvLangs({ title: {}, steps: [] }, 24000, {})).length === 0);

  // 5. failures never break the video and never half-write a plan
  reset(); state.reply = null; p = base(); t('AI gives no text: [] and plan untouched', (await mod.mvLangs(p, 24000, {})).length === 0 && !('as' in p.title) && !('as' in p.steps[0].say));
  reset(); state.reply = new Error('boom'); p = base(); t('AI throws: [] (no exception), error logged', (await mod.mvLangs(p, 24000, {})).length === 0 && logs.some(l => /translate failed/.test(l)));
  reset(); state.reply = 'not json at all'; p = base(); t('AI gives junk: []', (await mod.mvLangs(p, 24000, {})).length === 0);
  reset(); state.reply = reply({ as: { title: 'ক', steps: [{ cap: 'ক', say: 'ক' }] } }); p = base(); added = await mod.mvLangs(p, 24000, {});
  t('wrong number of steps in "as": only "bn" is added', added.join() === 'bn' && !('as' in p.title) && !('as' in p.steps[0].say) && p.steps[0].say.bn);
  t('a half-good answer is NOT cached (the next request tries again)', mod.MV_TR_CACHE.size === 0);
  reset(); const r = reply(); r.bn.steps[1].say = 'Answer is 3'; state.reply = r; p = base(); added = await mod.mvLangs(p, 24000, {});
  t('"bn" with digits and no Bengali script is rejected by the validator, "as" is kept', added.join() === 'as' && !p.steps[1].say.bn && p.steps[1].say.as);
  t('rejected language is logged with the reason', logs.some(l => /translate bn rejected/.test(l)));
  reset(); const r2 = reply(); r2.as.steps[0].cap = '<script>alert(1)</script>'; state.reply = r2; p = base(); added = await mod.mvLangs(p, 24000, {});
  t('HTML / script in a translated caption is rejected', added.join() === 'bn' && !p.steps[0].cap.as);
  reset(); const r3 = reply(); r3.bn.steps[0].say = 'ক'.repeat(141); state.reply = r3; p = base(); added = await mod.mvLangs(p, 24000, {});
  t('text longer than 140 characters is rejected', added.join() === 'as');

  // 6. admin route
  const H = state.handlers['/api/mathvideo/translate']; t('admin translate route is registered', typeof H === 'function');
  const call = async (body) => { const out = { status: 200 }; await H({ body }, { status(s) { out.status = s; return this; }, json(j) { out.json = j; return this; } }); return out; };
  reset(); state.admin = false; let o = await call({ plan: base() }); t('route: non-admin gets 403 and no AI call', o.status === 403 && state.calls === 0);
  reset(); o = await call({ plan: { id: 'x' } }); t('route: an invalid plan gets 400', o.status === 400 && /valid/.test(o.json.error) && state.calls === 0);
  reset(); const old = base(); old.title.as = 'পুরানো'; old.title.bn = 'পুরনো'; old.steps.forEach(s => { s.cap.as = s.cap.bn = 'পুরানো'; s.say.as = s.say.bn = 'পুরানো minus one'; });
  o = await call({ plan: old }); t('route: admin gets a plan with fresh as + bn (old ones replaced)', o.status === 200 && o.json.added.join() === 'as,bn' && o.json.plan.title.as !== 'পুরানো' && MV.validate(o.json.plan).errors.length === 0);
  t('route: the plan sent in is not mutated', old.title.as === 'পুরানো');
  reset(); state.reply = null; o = await call({ plan: base() }); t('route: nothing translated -> 502 with a clear message', o.status === 502 && /dobara/.test(o.json.error));

  // 7. wiring in server.js
  const mathH = cut("app.post('/api/mathvideo/generate'", "app.post('/api/sciencevideo/generate'"), sciH = cut("app.post('/api/sciencevideo/generate'", "const PORT");
  t('maths route: finished video is translated before it is sent and cached (awaited)', /const mvDone = async/.test(mathH) && /await mvLangs\(plan,/.test(mathH) && /return await mvDone\(plan/.test(mathH) && /return await mvDone\(best/.test(mathH));
  t('science route: same', /const done = async/.test(sciH) && /await mvLangs\(plan,/.test(sciH) && /return await done\(plan/.test(sciH) && /return await done\(best/.test(sciH));
  t('both routes: an older cached plan gets its text on the next request', /if \(c\.plan\) await mvLangs\(c\.plan, MV_TR_MS, \{ question: raw \}, userKeyOf\(req\)\)/.test(mathH) && /if \(c\.plan\) await mvLangs\(c\.plan, MV_TR_MS, \{ question: typed \}, userKeyOf\(req\)\)/.test(sciH));
  t('both routes: translation time is limited by the 90 s the app waits', /MV_HARD - \(Date\.now\(\) - t0\)/.test(mathH) && /MV_HARD - \(Date\.now\(\) - t0\)/.test(sciH));
  t('bank check still comes before the cache lookup (unchanged)', mathH.indexOf('mvKnown(typed') < mathH.indexOf('MV_CACHE.has') && sciH.indexOf("mvKnown(typed, 'Science')") < sciH.indexOf('MV_CACHE.has'));
  t('translate route gets a bigger JSON body limit than the 10 kb default', /jsonPlan = express\.json\(\{ limit: '128kb' \}\)/.test(src) && /'\/api\/mathvideo\/translate' \? jsonPlan/.test(src));

  // 8. validator
  t('old plans (no as/bn) are still valid', MV.validate(base()).errors.length === 0);
  const v1 = base(); v1.steps[0].say.as = 'আমাৰ প্ৰশ্ন, minus eight plus five।'; v1.steps[0].cap.bn = 'প্রশ্ন'; v1.title.as = 'শিৰোনাম';
  t('as / bn text is accepted', MV.validate(v1).errors.length === 0 && MV.validate(v1).warnings.length === 0);
  const v2 = base(); v2.steps[0].say.as = 'minus 8 plus 5'; const w2 = MV.validate(v2).warnings.join('|');
  t('spoken as/bn with digits or without Bengali-Assamese script gets a warning', /say\.as me digits/.test(w2) && /say\.as Bengali-Assamese script/.test(w2));
  const v3 = base(); v3.steps[0].cap.bn = 'http://x.y'; t('URL in bn caption is an error', MV.validate(v3).errors.some(e => /cap\.bn/.test(e)));
  const v4 = base(); v4.steps[0].say.as = 5; t('non-string as is an error', MV.validate(v4).errors.some(e => /say\.as/.test(e)));
  const v5 = base(); v5.steps[0].say.bn = 'ক'.repeat(141); t('141 characters in bn is an error', MV.validate(v5).errors.some(e => /say\.bn/.test(e)));

  // 9. admin panel button
  const adm = fs.readFileSync(path.join(ROOT, 'public/mathvideo-admin.js'), 'utf8'), team = fs.readFileSync(path.join(ROOT, 'public/team.js'), 'utf8');
  t('admin panel: button only when the host gives a translate function', /if \(opts\.translate\) btn\("Assamese\/Bengali text banao"/.test(adm));
  t('admin panel: plan must be valid first, result goes into the box for review', /validate\(plan\); if \(r0\.errors\.length\)/.test(adm) && /area\.value = JSON\.stringify\(res\.plan, null, 2\)/.test(adm));
  t('team.js passes translate with the admin token to the right route', /translate: function \(p\)[^}]*\/api\/mathvideo\/translate/.test(team) && /Authorization: 'Bearer ' \+ tok/.test(team.slice(team.indexOf('translate: function'))));

  console.log(pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})();
