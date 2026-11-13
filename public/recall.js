// public/recall.js - Recall AI screen: the student explains a chapter from memory, the server scores it (POST /api/recall/evaluate).
// index.html calls RECALL.viewHTML() for the "Recall AI" page. Scores are kept on THIS device only (per account), never the typed text.
(function () {
  'use strict';
  const g = window;
  const PREFIX = 'orbit.recall.';
  const KEEP = 300;
  const TYPES = { concept: 'Concept', fact: 'Fact / definition', reason: 'Reasoning' };
  const CRIT = { c: 'Conceptual understanding', f: 'Factual accuracy', t: 'Topic coverage', l: 'Logical explanation', m: 'Terminology' };
  const W = { concept: { c: 30, f: 25, t: 20, l: 15, m: 10 }, fact: { c: 15, f: 40, t: 25, l: 5, m: 15 }, reason: { c: 25, f: 20, t: 15, l: 30, m: 10 } };   // shown as hints only; the server decides
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const redraw = () => { if (typeof g.draw === 'function') g.draw(); };
  const uid = () => (typeof USER !== 'undefined' && USER && USER.uid) || '';
  const read = () => { try { const a = JSON.parse(g.localStorage.getItem(PREFIX + uid()) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } };
  const write = a => { try { g.localStorage.setItem(PREFIX + uid(), JSON.stringify(a.slice(-KEEP))); } catch (e) {} };

  const st = { key: '', type: 'concept', text: '', busy: false, err: '', res: null, left: null, quotaFor: '' };
  const hasKey = () => !!(g.PARENT_KEY && g.PARENT_KEY.has && g.PARENT_KEY.has());

  const readyCh = ch => !!ch && !ch.locked && Array.isArray(ch.sections) && ch.sections.length > 0;   // locked / empty chapters (Coming soon) cannot be tested
  function chapters() {
    const d = typeof DATA !== 'undefined' ? DATA : null;
    return d && Array.isArray(d.courses) ? d.courses : [];
  }
  function current() {
    for (const c of chapters()) for (const ch of (c.chapters || [])) if (c.id + '|' + ch.no === st.key) return { c, ch };
    return null;
  }

  async function loadQuota() {
    if (!uid() || st.quotaFor === uid() || !g.CLOUD) return;
    st.quotaFor = uid();
    try {
      const tok = await g.CLOUD.token();
      const r = await fetch((g.ORBIT_API || '') + '/api/recall/quota', { headers: { Authorization: 'Bearer ' + tok } });
      const j = await r.json().catch(() => ({}));
      if (r.ok && typeof j.left === 'number') { st.left = j.left; redraw(); }
    } catch (e) { st.quotaFor = ''; }
  }

  const label = n => n >= 85 ? 'Strong understanding' : n >= 65 ? 'Good understanding' : n >= 40 ? 'Needs revision' : 'Start again';
  const bar = n => `<div style="height:8px;border-radius:9px;background:var(--ln);overflow:hidden"><div style="height:100%;width:${n}%;background:var(--on)"></div></div>`;
  const list = (title, a, empty) => `<h3 style="margin:14px 0 4px;font-size:15px">${title}</h3>` + (a.length ? `<ul style="margin:0;padding-left:18px">${a.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : `<p class="mut" style="margin:0">${empty}</p>`);

  function spark(a) {
    if (a.length < 2) return '<p class="mut" style="margin:8px 0 0">Graph ke liye kam se kam 2 attempts chahiye.</p>';
    const Wd = 300, H = 64, p = 8, x = i => p + i * (Wd - 2 * p) / (a.length - 1), y = v => H - p - (v / 100) * (H - 2 * p);
    return `<svg viewBox="0 0 ${Wd} ${H}" style="width:100%;height:64px;margin-top:8px" role="img" aria-label="Score trend"><polyline fill="none" stroke="currentColor" stroke-width="2" points="${a.map((r, i) => x(i) + ',' + y(r.t)).join(' ')}"/>${a.map((r, i) => `<circle cx="${x(i)}" cy="${y(r.t)}" r="${i === a.length - 1 ? 4 : 2.5}" fill="currentColor"/>`).join('')}</svg>`;
  }
  const dayStr = ts => new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

  function quotaCard() {
    const k = hasKey();
    return `<div class="card"><div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><h2 class="sec" style="margin:0">Aaj ka AI check</h2><span class="chip">${k ? 'Parent key connected' : st.left === 0 ? 'Daily limit reached' : 'Free access'}</span></div>
      <p style="font-size:34px;font-weight:700;margin:10px 0 2px">${k ? 'Extended' : (st.left == null ? '1' : st.left) + ' / 1'}</p>
      <p class="mut" style="margin:0">${k ? 'Parent ki key se roz ki limit nahi lagti.' : st.left === 0 ? 'Aaj ka free check ho gaya. Parent se key lagwayein ya kal aayein.' : 'Roz ek free evaluation milta hai.'}</p>
      ${!k && st.left === 0 ? '<button class="btn" data-rc="adv">Advanced AI Features kholein</button>' : ''}</div>`;
  }

  function form() {
    const cs = chapters(), blocked = !hasKey() && st.left === 0;
    const opts = cs.map(c => `<optgroup label="${esc('Class ' + c.class + ' ' + c.subject)}">${(c.chapters || []).filter(readyCh).map(ch => { const v = c.id + '|' + ch.no; return `<option value="${esc(v)}" ${v === st.key ? 'selected' : ''}>${esc('Ch ' + ch.no + ': ' + ch.title)}</option>`; }).join('')}</optgroup>`).join('').replace(/<optgroup[^>]*><\/optgroup>/g, '');
    const w = W[st.type], field = 'width:100%;box-sizing:border-box;margin-top:6px;padding:10px;border:1px solid var(--ln);border-radius:10px;background:var(--bg);color:var(--tx);font:inherit';
    return `<div class="card"><h2 class="sec" style="margin-top:0">Test your knowledge</h2>
      <p class="mut" style="margin:0 0 10px">Book band karo. Jo yaad hai, apne words mein explain karo.</p>
      <label class="mut" for="rcTopic">Topic</label><select id="rcTopic" style="${field}"><option value="">Chapter chuno</option>${opts}</select>
      <label class="mut" for="rcType" style="display:block;margin-top:10px">Sawaal ka type</label><select id="rcType" style="${field}">${Object.keys(TYPES).map(k => `<option value="${k}" ${k === st.type ? 'selected' : ''}>${TYPES[k]}</option>`).join('')}</select>
      <p class="mut" style="margin:6px 0 0;font-size:12.5px">Marks: ${Object.keys(CRIT).map(k => CRIT[k] + ' ' + w[k]).join(', ')}.</p>
      <label class="mut" for="rcText" style="display:block;margin-top:10px">Aapka explanation</label>
      <textarea id="rcText" rows="6" maxlength="1500" placeholder="Explain everything you remember..." style="${field}">${esc(st.text)}</textarea>
      <button class="btn" data-rc="go" ${st.busy || blocked || !st.key ? 'disabled' : ''}>${st.busy ? 'Evaluate ho raha hai...' : 'Evaluate My Knowledge'}</button>
      ${st.err ? `<p class="err" role="status" style="margin:10px 0 0">${esc(st.err)}</p>` : ''}
      <p class="mut" style="margin:10px 0 0;font-size:12.5px">Sirf aapka likha text AI ko jata hai. Naam, school ya phone number nahi. Orbit sirf score aapke phone par yaad rakhta hai.</p></div>`;
  }

  function report() {
    const r = st.res, cur = current();
    if (!r || !cur) return '';
    const hist = read().filter(a => a.k === st.key);
    return `<div class="card"><div style="display:flex;justify-content:space-between;gap:10px;align-items:center"><h2 class="sec" style="margin:0">Your knowledge report</h2><span class="chip">${esc(cur.ch.title)}</span></div>
      <p style="font-size:42px;font-weight:700;margin:10px 0 0">${r.total}<span class="mut" style="font-size:18px">/100</span></p><p style="margin:0 0 10px"><b>${label(r.total)}</b></p>
      ${Object.keys(CRIT).map(k => `<div style="margin:8px 0"><div style="display:flex;justify-content:space-between;font-size:14px"><span>${CRIT[k]} <span class="mut">(${r.weights[k]})</span></span><span>${r.scores[k]}%</span></div>${bar(r.scores[k])}</div>`).join('')}
      ${list('Aapne sahi samjha', r.got, 'Abhi koi poora point nahi mila.')}${r.wrong.length ? list('Galat baat', r.wrong, '') : ''}${list('Jo chhoot gaya', r.miss, 'Kuch nahi chhoota.')}
      ${r.revise ? `<p style="margin:14px 0 0;padding:10px 12px;border-radius:10px;background:var(--ans)"><b>Recommended revision</b><br>${esc(r.revise)}</p>` : ''}
      <button class="btn" data-rc="again">Dobara try karein</button></div>
      <div class="card"><h2 class="sec" style="margin-top:0">Knowledge Retention Tracker</h2>${spark(hist)}
      <table class="qt" style="width:100%;margin-top:8px"><tr><th>Attempt</th><th style="text-align:right">Score</th></tr>${hist.slice(-8).reverse().map(a => `<tr><td>${dayStr(a.at)}</td><td style="text-align:right">${a.t}%</td></tr>`).join('')}</table>
      <p class="mut" style="margin:8px 0 0;font-size:12.5px">Har attempt ka score is phone par save hota hai, taaki dikhe ki concept kitne din baad bhi yaad hai.</p></div>`;
  }

  async function evaluate() {
    const cur = current(), text = st.text.trim();
    if (!cur) return say('Pehle chapter chuno.');
    if (text.length < 20) return say('Thoda aur likho. Kam se kam ek do line explain karo.');
    st.busy = true; st.err = ''; redraw();
    try {
      const j = await g.api('/api/recall/evaluate', { course: cur.c.id, ch: cur.ch.no, type: st.type, text });
      st.res = j; if (typeof j.left === 'number') st.left = j.left;
      write(read().concat([{ k: st.key, t: j.total, at: Date.now() }]));
    } catch (e) {
      st.err = e && e.message ? e.message : 'Kuch gadbad hui. Dobara try karo.';
      if (/free AI check ho chuka/.test(st.err)) st.left = 0;
    }
    st.busy = false; redraw();
    if (st.res) g.scrollTo(0, 0);
  }
  function say(m) { st.err = m; redraw(); }

  g.document.addEventListener('change', e => {
    if (e.target.id === 'rcTopic') { st.key = e.target.value; st.res = null; st.err = ''; redraw(); }
    else if (e.target.id === 'rcType') { st.type = e.target.value; redraw(); }
  });
  g.document.addEventListener('input', e => { if (e.target.id === 'rcText') st.text = e.target.value; });
  g.document.addEventListener('click', e => {
    const b = e.target && e.target.closest ? e.target.closest('[data-rc]') : null;
    if (!b || b.disabled) return;
    if (b.dataset.rc === 'go') evaluate();
    else if (b.dataset.rc === 'again') { st.res = null; st.text = ''; st.err = ''; redraw(); g.scrollTo(0, 0); }
    else if (b.dataset.rc === 'adv' && typeof g.go === 'function') g.go('ai');
  });

  g.RECALL = {
    viewHTML() {
      loadQuota();
      return `<h1 style="font-size:26px;margin-top:14px">Recall AI</h1>${quotaCard()}${st.res ? report() : form()}<p class="mut" style="margin-top:20px">AI se kabhi galti ho sakti hai. Exam se pehle apni kitab se check kar lo.</p>`;
    },
    _reset() { Object.assign(st, { key: '', type: 'concept', text: '', busy: false, err: '', res: null, left: null, quotaFor: '' }); }
  };
})();
