'use strict';
// The two routes behind the prompt box (public/promptbox.js). server.js calls mount(app, deps) once; everything else stays as it was.
//   POST /api/ask    { text, doc?, files?, course?, ch? }  -> { answer, left } | { refuse: true, message }
//   POST /api/anime  { text, course?, ch? }                -> { video, left }  | { refuse: true, message }
// Both are listed in course-lock-core.js GATED, so the course lock already ran: a kid-mode or wrong-course student never reaches them.
// Free students get a daily number of uses (ASK_FREE_DAILY, ANIME_FREE_DAILY); with the parent's Gemini key there is no limit. Same-question
// repeats are answered from memory and cost nothing. A failed AI call gives the use back.
const A = require('./ask-core');

function mount(app, d) {
  const { QUIZ, geminiFor, failMsgFor, userKeyOf, limited, rateKey, quotas, max, isAdmin, lockOf, hasDb, haveKeys, videoModels } = d;
  const now = d.now || Date.now;
  const CACHE = new Map();   // key -> { at, v }, memory only
  const TTL = 6 * 3600000, CAP = 400;
  const cget = k => { const h = CACHE.get(k); if (h && now() - h.at < TTL) return h.v; CACHE.delete(k); return null; };
  const cput = (k, v) => { if (CACHE.size >= CAP) CACHE.delete(CACHE.keys().next().value); CACHE.set(k, { at: now(), v }); };

  // What the AI is told about the student: the chapter page they are on (a course id the course lock already approved), else the class they chose.
  async function contextOf(req, b) {
    const course = typeof b.course === 'string' ? QUIZ.courses.find(c => c.id === b.course) : null;
    if (course) {
      const ch = b.ch != null ? (course.chapters || []).find(x => String(x.no) === String(b.ch)) : null;
      return { course: course.id, cls: course.class, subject: course.subject, medium: course.medium || 'English', chapter: ch ? ch.title : '', notes: ch && ch.context ? ch.context : '' };
    }
    try {
      const lk = hasDb && req.user ? await lockOf(req.user.uid) : null;
      if (lk && lk.cls) return { cls: lk.cls, medium: lk.med || '' };
    } catch (e) { /* no course known: the answer is just a bit more general */ }
    return {};
  }

  // The checks every prompt-box request goes through. Returns { uid, uk, take, back } or null after replying.
  async function gate(req, res, kind) {
    if (!haveKeys() && !userKeyOf(req)) { res.status(500).json({ error: 'Server mein GEMINI_API_KEY set nahi hai.' }); return null; }
    if (limited(rateKey(req))) { res.status(429).json({ error: 'Thoda ruko, bahut zyada requests. 1 minute baad try karo.' }); return null; }
    return { uid: req.user.uid, uk: !!userKeyOf(req) || isAdmin(req), q: quotas[kind] };
  }
  const limitReply = (res, kind) => res.status(429).json({ code: 'limit_reached', kind, error: 'Aaj ki limit (' + max[kind] + ') poori ho gayi. Kal dobara try karo, ya Advanced AI Features me parent ki Gemini key lagwao.' });
  const REFUSE = { ask: 'Main sirf padhai ke sawal me madad karta hoon. Apne subject ka sawal likho.', anime: 'Video sirf padhai ke topic par banta hai. Apne subject ka topic likho.' };

  app.post('/api/ask', async (req, res) => {
    try {
      const b = req.body || {}, text = A.cleanText(b.text), doc = A.cleanDoc(b.doc), files = A.validFiles(b.files);
      if (files === null) return res.status(400).json({ error: 'Photo ya PDF sahi nahi hai. jpg, png ya PDF lo, 2 se zyada nahi.' });
      if (text.length < 2 && !files.length && !doc) return res.status(400).json({ error: 'Pehle apna sawal likho.' });
      const g = await gate(req, res, 'ask'); if (!g) return;
      const ctx = await contextOf(req, b), plain = !files.length && !doc && !g.uk, key = A.cacheKey('ask', ctx, text);
      const hit = plain ? cget(key) : null;
      if (hit) return res.json({ answer: hit, left: await quotas.ask.left(g.uid) });
      if (!g.uk && !(await quotas.ask.take(g.uid))) return limitReply(res, 'ask');
      const back = () => { if (!g.uk) Promise.resolve(quotas.ask.refund(g.uid)).catch(() => {}); };
      const r = await geminiFor(req, A.ASK_SYSTEM, A.buildAskPrompt({ text, doc, ctx, hasFiles: files.length > 0 }),
        { json: true, temperature: 0.3, maxTokens: 1800, images: files, ...(files.length ? { fallback: [] } : {}), reqMs: 30000, budgetMs: 55000 });
      if (!r.text) { back(); return res.status(502).json({ error: failMsgFor(req, r.status) }); }
      const out = A.parseAsk(r.text);
      if (!out) { back(); return res.status(502).json({ error: 'AI ka jawab samajh nahi aaya. Dobara try karo.' }); }
      if (out.refuse) return res.json({ refuse: true, message: REFUSE.ask });
      if (plain) cput(key, out.answer);
      res.json({ answer: out.answer, left: g.uk ? null : await quotas.ask.left(g.uid) });
    } catch (e) { console.error('[ask] ' + (e && e.message)); res.status(500).json({ error: 'Kuch gadbad hui. Dobara try karo.' }); }
  });

  app.post('/api/anime', async (req, res) => {
    try {
      const b = req.body || {}, text = A.cleanText(b.text);
      if (text.length < 2) return res.status(400).json({ error: 'Video ka topic likho.' });
      const g = await gate(req, res, 'anime'); if (!g) return;
      const ctx = await contextOf(req, b), key = A.cacheKey('anime', ctx, text), hit = g.uk ? null : cget(key);
      if (hit) return res.json({ video: hit, left: await quotas.anime.left(g.uid) });
      if (!g.uk && !(await quotas.anime.take(g.uid))) return limitReply(res, 'anime');
      const back = () => { if (!g.uk) Promise.resolve(quotas.anime.refund(g.uid)).catch(() => {}); };
      // Up to 2 tries: the finished video is compared with the topic by a program (video-guard-core.js). A swapped look-alike term
      // (square -> rectangle) is never accepted; an intro scene or missing key words get one retry with the exact problem told to the AI.
      const t0 = now(), basePrompt = A.buildAnimePrompt({ text, ctx });
      let prompt = basePrompt, out = null, lastStatus = 0, bad = false;
      for (let attempt = 1; attempt <= 2; attempt++) {
        const left = 88000 - (now() - t0);
        if (left < 15000) break;
        const r = await geminiFor(req, A.ANIME_SYSTEM, prompt,
          { json: true, temperature: attempt === 1 ? 0.4 : 0.2, maxTokens: 6000, models: videoModels, fallback: [], reqMs: 50000, budgetMs: Math.min(left, 58000) });
        if (!r.text) { lastStatus = r.status; break; }
        const o = A.parseAnime(r.text);
        if (!o) { prompt = basePrompt + '\n\nYour last reply was not usable. Reply with the JSON object only, 4 to 6 scenes.'; continue; }
        if (o.refuse) { out = o; break; }
        const c = A.checkVideo(o.video, text);
        if (c.hard.length) { bad = true; prompt = basePrompt + '\n\nYour previous video had this mistake. Fix it and reply with the full corrected JSON only:\n- ' + c.hard.concat(c.soft).join('\n- '); continue; }
        bad = false; out = o;
        if (!c.soft.length || attempt === 2) break;   // last try is always accepted when it has no hard mistake
        prompt = basePrompt + '\n\nYour previous video had these problems. Fix them and reply with the full corrected JSON only:\n- ' + c.soft.join('\n- ');
      }
      if (!out && lastStatus) { back(); return res.status(502).json({ error: failMsgFor(req, lastStatus) }); }
      if (!out) { back(); return res.status(502).json({ error: bad ? 'Video bilkul sahi nahi ban paayi (shape ya term galat aa raha tha). Dobara try karo.' : 'Video ban nahi paayi. Dobara try karo.' }); }
      if (out.refuse) return res.json({ refuse: true, message: REFUSE.anime });
      if (!g.uk) cput(key, out.video);
      res.json({ video: out.video, left: g.uk ? null : await quotas.anime.left(g.uid) });
    } catch (e) { console.error('[anime] ' + (e && e.message)); res.status(500).json({ error: 'Kuch gadbad hui. Dobara try karo.' }); }
  });
}

module.exports = { mount };
