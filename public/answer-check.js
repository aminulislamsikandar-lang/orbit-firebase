// public/answer-check.js - "Apna answer check karo": the student photographs an answer written by hand, the AI reads it and says what is right,
// what is missing and (for maths) which step is wrong. It sits in the 3-dot menu ("Aur options") of every question.
// index.html calls ACHECK.html(q) inside the question's toolbar. The photo is shrunk here, sent once, and never kept: not on this device, not on the server.
(function (g) {
  'use strict';
  const doc = g.document;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const redraw = () => { if (typeof g.draw === 'function') g.draw(); };
  const hooks = {};   // tests replace the photo shrinker (jsdom has no canvas)
  const S = {};       // per question id: { open, busy, err, res }
  const st = id => S[id] || (S[id] = { open: false, busy: false, err: '', res: null });

  function shrink(file) {   // photo -> JPEG of at most 1600 px (about 0.4 MB), so it is quick to send on a phone connection
    return new Promise((ok, no) => {
      const url = URL.createObjectURL(file), img = new g.Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        const r = Math.min(1, 1600 / Math.max(img.width, img.height, 1)), c = doc.createElement('canvas');
        c.width = Math.max(1, Math.round(img.width * r)); c.height = Math.max(1, Math.round(img.height * r));
        const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height);
        for (const q of [0.8, 0.6, 0.45]) { const data = c.toDataURL('image/jpeg', q).split(',')[1]; if (data.length < 2900000) return ok({ mime: 'image/jpeg', image: data }); }
        no(new Error('Photo bahut badi hai. Page ke paas se dobara photo lo.'));
      };
      img.onerror = () => { URL.revokeObjectURL(url); no(new Error('Ye photo khul nahi paayi. jpg ya png photo lo.')); };
      img.src = url;
    });
  }

  async function check(id, file) {
    const s = st(id); if (s.busy) return;
    s.busy = true; s.err = ''; s.res = null; redraw();
    try {
      const p = await (hooks.shrink || shrink)(file);
      s.res = await g.api('/api/answer/check', { id, mime: p.mime, image: p.image });   // api() adds the question text for a custom question
    } catch (e) {
      s.err = (typeof g.errMsg === 'function' ? g.errMsg(e) : String((e && e.message) || e));
    }
    s.busy = false; redraw();
  }

  const bar = n => `<div style="height:8px;border-radius:9px;background:var(--ln);overflow:hidden"><div style="height:100%;width:${n}%;background:var(--on)"></div></div>`;
  const ul = (title, a) => a && a.length ? `<h3 style="margin:12px 0 4px;font-size:15px">${title}</h3><ul style="margin:0;padding-left:18px">${a.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : '';
  const verdict = n => n >= 85 ? 'Bahut accha' : n >= 60 ? 'Theek hai, thoda sudhaar' : n >= 35 ? 'Aur mehnat chahiye' : 'Dobara try karo';

  function resultHTML(r) {
    const steps = r.mode === 'math' && (r.steps || []).length ? `<h3 style="margin:12px 0 4px;font-size:15px">Aapki working, line by line</h3><ol style="margin:0;padding-left:20px">${r.steps.map(x =>
      `<li style="margin:6px 0"><b>${x.ok ? 'Sahi' : 'Galat'}:</b> ${esc(x.text)}${x.ok ? '' : `<br><span class="mut">Sudhaar: ${esc(x.fix)}</span>`}</li>`).join('')}</ol>` : '';
    return `<div class="ans" style="margin-top:10px"><b>Answer check</b>
      <p style="font-size:30px;font-weight:700;margin:6px 0 0">${r.percent}<span class="mut" style="font-size:16px">/100</span></p><p style="margin:0 0 6px"><b>${verdict(r.percent)}</b>${r.mode === 'math' ? (r.finalOk ? ' · Final answer sahi hai' : ' · Final answer sahi nahi hai') : ''}</p>${bar(r.percent)}
      ${r.read ? `<p class="mut" style="margin:10px 0 0"><b>AI ne ye padha:</b> ${esc(r.read)}</p>` : ''}
      ${steps}${ul('Sahi likha', r.good)}${ul('Galat baat', r.wrong)}${ul('Jo chhoot gaya', r.missing)}
      ${r.better ? `<p style="margin:12px 0 0;padding:10px 12px;border-radius:10px;background:var(--ans)"><b>Behtar kaise karein</b><br>${esc(r.better)}</p>` : ''}
      ${r.tip ? `<p class="mut" style="margin:8px 0 0">Tip: ${esc(r.tip)}</p>` : ''}
      <p class="mut" style="margin:10px 0 0;font-size:12.5px">AI se galti ho sakti hai. Shak ho to apne teacher ya kitab se milao.</p></div>`;
  }

  // The block that goes into the question's 3-dot menu.
  function html(q) {
    if (!q || !q.id) return '';
    const id = q.id, s = st(id);
    const chip = `<div class="chips"><button class="chip" data-ac="toggle" data-id="${esc(id)}" aria-expanded="${s.open}">Apna answer check karo (photo)</button></div>`;
    if (!s.open) return chip;
    return chip + `<div class="card" style="margin-top:10px">
      <p class="mut" style="margin:0 0 8px">Kaapi mein haath se likha answer ki photo lo. AI padhega, kitab ke notes se milayega aur batayega kahan galti hui. Maths mein har line check hoti hai.</p>
      <p class="mut" style="margin:0 0 8px;font-size:12.5px">Sirf answer wale page ki photo lo (chehra ya naam nahi). Photo save nahi hoti, sirf padhi jaati hai. Ye roz ki photo limit mein ginti hai (parent ki key ho to limit nahi).</p>
      <input type="file" accept="image/*" hidden data-ac-file="${esc(id)}">
      <button class="btn" data-ac="pick" data-id="${esc(id)}" ${s.busy ? 'disabled' : ''}>${s.busy ? 'Padh raha hoon… (10 se 40 second)' : s.res ? 'Doosra answer check karo' : 'Photo lo ya chuno'}</button>
      ${s.err ? `<div class="err" role="alert" style="margin-top:8px">${esc(s.err)}</div>` : ''}${s.res ? resultHTML(s.res) : ''}</div>`;
  }

  doc.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('[data-ac]'); if (!b || b.disabled) return;
    const id = b.dataset.id, a = b.dataset.ac;
    if (a === 'toggle') { const s = st(id); s.open = !s.open; redraw(); }
    else if (a === 'pick') { const f = b.parentNode && b.parentNode.querySelector('[data-ac-file]'); if (f) f.click(); }
  });
  doc.addEventListener('change', e => {
    const t = e.target; if (!t || !t.dataset || t.dataset.acFile === undefined) return;
    const f = t.files && t.files[0]; t.value = '';   // the picked photo is not kept anywhere
    if (!f) return;
    if (!/^image\//.test(f.type)) { const s = st(t.dataset.acFile); s.err = 'Photo chuno (jpg ya png).'; redraw(); return; }
    check(t.dataset.acFile, f);
  });

  g.ACHECK = { html, hooks, _state: S, _check: check };
})(window);
