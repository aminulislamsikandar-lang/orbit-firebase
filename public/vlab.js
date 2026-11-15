// Orbit Virtual Lab (Task 53): two small experiments that run in the browser, no server, no images.
//   1. Simple pendulum (Physics)   2. Acid-base indicators (Chemistry, Class 10 Acids, Bases and Salts)
// index.html calls VLAB.viewHTML() to draw the page and VLAB.mount(root) after drawing. Text follows the child's language (ST.tlang).
(function (g) {
  'use strict';
  const TX = {
    title: { hing: 'Virtual Lab', en: 'Virtual Lab', as: 'ভাৰ্চুৱেল লেব', bn: 'ভার্চুয়াল ল্যাব' },
    intro: { hing: 'Slider ya button se kuch badlo aur result dekho. Lab nahi hai to yahin prayog karo.', en: 'Change a slider or button and watch the result. No lab at school? Experiment here.', as: 'স্লাইডাৰ সলনি কৰি ফলাফল চোৱা। স্কুলত লেব নাই নেকি? ইয়াতে পৰীক্ষা কৰা।', bn: 'স্লাইডার বদলে ফল দেখো। স্কুলে ল্যাব না থাকলে এখানেই পরীক্ষা করো।' },
    pTitle: { hing: 'Simple pendulum (jhoola)', en: 'Simple pendulum', as: 'সৰল দোলক', bn: 'সরল দোলক' },
    pChap: { hing: 'Physics: Oscillations / Class 11. Dekho: lambai badlo to time period badalta hai, bob ka vazan nahi.', en: 'Physics: Oscillations (Class 11). See: changing the length changes the time period, the mass does not.', as: 'পদাৰ্থ বিজ্ঞান: দোলন। দৈৰ্ঘ্য সলনি কৰিলে দোলনকাল সলনি হয়, ভৰ নহয়।', bn: 'পদার্থবিজ্ঞান: দোলন। দৈর্ঘ্য বদলালে দোলনকাল বদলায়, ভর নয়।' },
    len: { hing: 'Dhaage ki lambai', en: 'String length', as: 'সূতাৰ দৈৰ্ঘ্য', bn: 'সুতোর দৈর্ঘ্য' },
    ang: { hing: 'Shuruaati kon', en: 'Starting angle', as: 'আৰম্ভণি কোণ', bn: 'শুরুর কোণ' },
    start: { hing: 'Chalao', en: 'Start', as: 'আৰম্ভ কৰা', bn: 'শুরু করো' },
    stop: { hing: 'Roko', en: 'Pause', as: 'ৰখোৱা', bn: 'থামাও' },
    reset: { hing: 'Dobara', en: 'Reset', as: 'পুনৰ', bn: 'আবার' },
    tTheory: { hing: 'Time period (formula)', en: 'Time period (formula)', as: 'দোলনকাল (সূত্ৰ)', bn: 'দোলনকাল (সূত্র)' },
    tMeas: { hing: 'Time period (naapa hua)', en: 'Time period (measured)', as: 'দোলনকাল (জোখা)', bn: 'দোলনকাল (মাপা)' },
    swings: { hing: 'Poore jhoole', en: 'Full swings', as: 'সম্পূৰ্ণ দোল', bn: 'পূর্ণ দোল' },
    big: { hing: 'Bada kon (30 degree se zyada) mein formula thoda alag aata hai. Chhote kon par sahi baithta hai.', en: 'For angles above 30 degrees the formula is slightly off. It fits small angles best.', as: '৩০ ডিগ্ৰীতকৈ ডাঙৰ কোণত সূত্ৰ অলপ সলনি হয়। সৰু কোণত ভাল মিলে।', bn: '৩০ ডিগ্রির বেশি কোণে সূত্র সামান্য আলাদা হয়। ছোট কোণে ভালো মেলে।' },
    aTitle: { hing: 'Acid-base indicator ka rang', en: 'Acid-base indicator colours', as: 'অম্ল-ক্ষাৰক সূচকৰ ৰং', bn: 'অম্ল-ক্ষার সূচকের রং' },
    aChap: { hing: 'Chemistry: Acids, Bases and Salts (Class 10). pH chuno aur indicator ka rang dekho.', en: 'Chemistry: Acids, Bases and Salts (Class 10). Pick a pH and see the indicator colour.', as: 'ৰসায়ন: অম্ল, ক্ষাৰক আৰু লবণ। pH বাছি সূচকৰ ৰং চোৱা।', bn: 'রসায়ন: অম্ল, ক্ষার ও লবণ। pH বেছে সূচকের রং দেখো।' },
    ind: { hing: 'Indicator', en: 'Indicator', as: 'সূচক', bn: 'সূচক' },
    sol: { hing: 'Ghol (solution)', en: 'Solution', as: 'দ্ৰৱ', bn: 'দ্রবণ' },
    acid: { hing: 'Amla (acid)', en: 'Acidic', as: 'অম্লীয়', bn: 'অম্লীয়' },
    neu: { hing: 'Samaan (neutral)', en: 'Neutral', as: 'প্ৰশম', bn: 'প্রশম' },
    base: { hing: 'Kshaar (base)', en: 'Basic', as: 'ক্ষাৰীয়', bn: 'ক্ষারীয়' },
    color: { hing: 'Rang', en: 'Colour', as: 'ৰং', bn: 'রং' }
  };
  const L = k => { const o = TX[k], l = (g.orbitLang && g.orbitLang()) || 'hing'; return o[l] || o.hing; };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // ---- Indicators: [upper pH limit, colour name (4 languages), hex] ranges, first match wins ----
  const N = (hing, en, as, bn) => ({ hing, en, as, bn });
  const IND = {
    litmus: { n: N('Litmus', 'Litmus', 'লিটমাছ', 'লিটমাস'), r: [
      [5, N('Laal', 'Red', 'ৰঙা', 'লাল'), '#d9363e'], [8, N('Baingani', 'Purple', 'বেঙুনীয়া', 'বেগুনি'), '#8b5fbf'], [15, N('Neela', 'Blue', 'নীলা', 'নীল'), '#2f5fd0']] },
    phenol: { n: N('Phenolphthalein', 'Phenolphthalein', 'ফিনলফথেলিন', 'ফেনলফথ্যালিন'), r: [
      [8.2, N('Rangheen', 'Colourless', 'বৰ্ণহীন', 'বর্ণহীন'), '#f3f6f8'], [15, N('Gulabi', 'Pink', 'গুলপীয়া', 'গোলাপি'), '#e8559a']] },
    methyl: { n: N('Methyl orange', 'Methyl orange', 'মিথাইল কমলা', 'মিথাইল অরেঞ্জ'), r: [
      [3.1, N('Laal', 'Red', 'ৰঙা', 'লাল'), '#d9363e'], [4.4, N('Narangi', 'Orange', 'কমলা', 'কমলা'), '#ee8a2b'], [15, N('Peela', 'Yellow', 'হালধীয়া', 'হলুদ'), '#f2cc2e']] },
    uni: { n: N('Universal indicator', 'Universal indicator', 'ইউনিভাৰ্চেল সূচক', 'ইউনিভার্সাল সূচক'), r: [
      [3, N('Laal', 'Red', 'ৰঙা', 'লাল'), '#d9363e'], [5, N('Narangi', 'Orange', 'কমলা', 'কমলা'), '#ee8a2b'], [6.5, N('Peela', 'Yellow', 'হালধীয়া', 'হলুদ'), '#f2cc2e'],
      [7.5, N('Hara', 'Green', 'সেউজীয়া', 'সবুজ'), '#4caf50'], [10, N('Neela', 'Blue', 'নীলা', 'নীল'), '#2f6fd0'], [15, N('Baingani', 'Violet', 'বেঙুনীয়া', 'বেগুনি'), '#6a3fa8']] }
  };
  const SOL = [
    [2, N('Nimbu ka ras', 'Lemon juice', 'নেমুৰ ৰস', 'লেবুর রস')], [3, N('Sirka', 'Vinegar', 'ভিনেগাৰ', 'ভিনেগার')],
    [6.5, N('Doodh', 'Milk', 'গাখীৰ', 'দুধ')], [7, N('Saaf paani', 'Pure water', 'বিশুদ্ধ পানী', 'বিশুদ্ধ জল')],
    [8.3, N('Baking soda ghol', 'Baking soda solution', 'বেকিং ছোডাৰ দ্ৰৱ', 'বেকিং সোডার দ্রবণ')], [10, N('Sabun ka ghol', 'Soap solution', 'চাবোনৰ দ্ৰৱ', 'সাবানের দ্রবণ')],
    [13, N('Sodium hydroxide', 'Sodium hydroxide', 'ছডিয়াম হাইড্ৰক্সাইড', 'সোডিয়াম হাইড্রক্সাইড')]
  ];
  const lang = () => ((g.orbitLang && g.orbitLang()) || 'hing');
  const pick = (o) => o[lang()] || o.hing;
  function indColor(id, ph) { const r = IND[id].r; for (const x of r) if (ph < x[0]) return x; return r[r.length - 1]; }
  function kind(ph) { return ph < 6.95 ? 'acid' : ph > 7.05 ? 'base' : 'neu'; }

  const S = { len: 1, ang: 20, run: false, th: 0, w: 0, ph: 7, ind: 'uni', t0: 0, swings: 0, lastSign: 0, lastCross: null, measured: null, raf: 0, last: 0 };
  const G = 9.8;
  function resetPend() { S.th = S.ang * Math.PI / 180; S.w = 0; S.swings = 0; S.lastSign = 0; S.lastCross = null; S.measured = null; S.t0 = 0; }
  resetPend();

  function pendSVG() {
    const px = 70 + S.len * 80, x = 150 + Math.sin(S.th) * px, y = 20 + Math.cos(S.th) * px;
    return `<svg viewBox="0 0 300 270" role="img" aria-label="${esc(L('pTitle'))}" style="width:100%;max-width:340px;display:block;margin:0 auto">
 <line x1="110" y1="20" x2="190" y2="20" stroke="currentColor" stroke-width="3"/>
 <line id="vl-str" x1="150" y1="20" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="currentColor" stroke-width="1.5"/>
 <circle id="vl-bob" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="13" fill="currentColor"/></svg>`;
  }
  function pendReadout() {
    const T = 2 * Math.PI * Math.sqrt(S.len / G);
    return `<div class="mut" id="vl-read">${esc(L('tTheory'))}: <b id="vl-rt">${T.toFixed(2)} s</b><br>${esc(L('tMeas'))}: <b id="vl-rm">${S.measured ? S.measured.toFixed(2) + ' s' : '-'}</b><br>${esc(L('swings'))}: <b id="vl-rw">${S.swings}</b></div>`;
  }
  function pendHTML() {
    return `<section class="vlab" style="margin-top:22px;border:1px solid var(--ln);border-radius:14px;padding:14px;background:var(--card)">
 <h2 class="sec" style="margin-top:0">${esc(L('pTitle'))}</h2><p class="mut">${esc(L('pChap'))}</p>
 <div id="vl-pend">${pendSVG()}</div>
 <label class="mut" style="display:block;margin-top:8px">${esc(L('len'))}: <b id="vl-lv">${S.len.toFixed(1)} m</b>
  <input id="vl-len" type="range" min="0.2" max="2" step="0.1" value="${S.len}" style="width:100%"></label>
 <label class="mut" style="display:block;margin-top:8px">${esc(L('ang'))}: <b id="vl-av">${S.ang}&deg;</b>
  <input id="vl-ang" type="range" min="5" max="60" step="5" value="${S.ang}" style="width:100%"></label>
 <div class="chips"><button class="chip" id="vl-go">${esc(L(S.run ? 'stop' : 'start'))}</button><button class="chip" id="vl-rs">${esc(L('reset'))}</button></div>
 ${pendReadout()}<p class="mut" id="vl-big" style="margin-top:6px;${S.ang > 30 ? '' : 'display:none'}">${esc(L('big'))}</p></section>`;
  }

  function beakerSVG() {
    const c = indColor(S.ind, S.ph), name = pick(c[1]), k = kind(S.ph);
    return `<svg viewBox="0 0 200 190" role="img" aria-label="${esc(name)}" style="width:100%;max-width:240px;display:block;margin:0 auto">
 <path d="M50 20 L50 150 Q50 170 70 170 L130 170 Q150 170 150 150 L150 20" fill="none" stroke="currentColor" stroke-width="3"/>
 <path d="M52 70 L52 150 Q52 168 70 168 L130 168 Q148 168 148 150 L148 70 Z" id="vl-liq" fill="${c[2]}" stroke="${S.ind === 'phenol' && S.ph < 8.2 ? 'var(--ln)' : 'none'}"/></svg>
 <p style="text-align:center;margin:8px 0 0"><b id="vl-cn">${esc(L('color'))}: ${esc(name)}</b><br><span class="mut" id="vl-pk">pH ${S.ph.toFixed(1)} &middot; ${esc(L(k))}</span></p>`;
  }
  function acidHTML() {
    const chips = (list, cur, a) => `<div class="chips" role="group">${list.map(([k, n, d]) => `<button class="chip" data-vl="${a}" data-v="${k}" aria-pressed="${String(cur) === String(k)}">${esc(n)}</button>`).join('')}</div>`;
    return `<section class="vlab" style="margin-top:22px;border:1px solid var(--ln);border-radius:14px;padding:14px;background:var(--card)">
 <h2 class="sec" style="margin-top:0">${esc(L('aTitle'))}</h2><p class="mut">${esc(L('aChap'))}</p>
 <div id="vl-beak">${beakerSVG()}</div>
 <label class="mut" style="display:block;margin-top:8px">pH: <b id="vl-pv">${S.ph.toFixed(1)}</b>
  <input id="vl-ph" type="range" min="0" max="14" step="0.1" value="${S.ph}" style="width:100%"></label>
 <h3 class="sec" style="font-size:15px">${esc(L('sol'))}</h3>${chips(SOL.map(s => [s[0], pick(s[1])]), S.ph, 'sol')}
 <h3 class="sec" style="font-size:15px">${esc(L('ind'))}</h3>${chips(Object.keys(IND).map(k => [k, pick(IND[k].n)]), S.ind, 'ind')}</section>`;
  }

  const byId = id => document.getElementById(id);
  function setText(id, t) { const e = byId(id); if (e) e.textContent = t; }
  function updPend() {   // move the string and bob, refresh the numbers: attributes and textContent only
    const px = 70 + S.len * 80, x = (150 + Math.sin(S.th) * px).toFixed(1), y = (20 + Math.cos(S.th) * px).toFixed(1);
    const st = byId('vl-str'), bb = byId('vl-bob');
    if (st) { st.setAttribute('x2', x); st.setAttribute('y2', y); }
    if (bb) { bb.setAttribute('cx', x); bb.setAttribute('cy', y); }
    setText('vl-rm', S.measured ? S.measured.toFixed(2) + ' s' : '-'); setText('vl-rw', String(S.swings));
    setText('vl-rt', (2 * Math.PI * Math.sqrt(S.len / G)).toFixed(2) + ' s');
  }
  function updAcid() {
    const c = indColor(S.ind, S.ph), liq = byId('vl-liq');
    if (liq) { liq.setAttribute('fill', c[2]); liq.setAttribute('stroke', S.ind === 'phenol' && S.ph < 8.2 ? 'var(--ln)' : 'none'); }
    setText('vl-cn', L('color') + ': ' + pick(c[1])); setText('vl-pk', 'pH ' + S.ph.toFixed(1) + ' \u00b7 ' + L(kind(S.ph)));
    setText('vl-pv', S.ph.toFixed(1));
  }
  function frame(ts) {
    const root = byId('vl-pend');
    if (!root || !root.isConnected) { S.raf = 0; return; }
    if (S.run) {
      let dt = S.last ? Math.min((ts - S.last) / 1000, 0.05) : 0; S.last = ts;
      const n = 8, h = dt / n;
      for (let i = 0; i < n; i++) {
        S.w += -(G / S.len) * Math.sin(S.th) * h; S.th += S.w * h; S.t0 += h;
        const sg = S.th > 0 ? 1 : S.th < 0 ? -1 : 0;
        if (S.lastSign < 0 && sg > 0) {   // same-direction zero crossing = one full swing
          if (S.lastCross != null) { S.measured = S.t0 - S.lastCross; S.swings++; }
          S.lastCross = S.t0;
        }
        if (sg) S.lastSign = sg;
      }
      updPend();
    } else S.last = 0;
    S.raf = requestAnimationFrame(frame);
  }

  function mount(root) {
    if (!root) return;
    const $ = id => document.getElementById(id);
    if (S.raf) cancelAnimationFrame(S.raf);
    const redrawPend = () => { updPend(); $('vl-big').style.display = S.ang > 30 ? '' : 'none'; };
    $('vl-len').oninput = e => { S.len = +e.target.value; $('vl-lv').textContent = S.len.toFixed(1) + ' m'; resetPend(); redrawPend(); };
    $('vl-ang').oninput = e => { S.ang = +e.target.value; $('vl-av').textContent = S.ang + '\u00b0'; resetPend(); redrawPend(); };
    $('vl-go').onclick = e => { S.run = !S.run; S.last = 0; e.target.textContent = L(S.run ? 'stop' : 'start'); };
    $('vl-rs').onclick = () => { S.run = false; resetPend(); $('vl-go').textContent = L('start'); redrawPend(); };
    const redrawAcid = () => { root.querySelectorAll('[data-vl="sol"]').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.v === S.ph))); root.querySelectorAll('[data-vl="ind"]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === S.ind))); updAcid(); $('vl-ph').value = S.ph; };
    $('vl-ph').oninput = e => { S.ph = +e.target.value; redrawAcid(); };
    root.querySelectorAll('[data-vl]').forEach(b => b.onclick = () => { if (b.dataset.vl === 'sol') S.ph = +b.dataset.v; else S.ind = b.dataset.v; redrawAcid(); });
    S.raf = requestAnimationFrame(frame);
  }
  function leave() { S.run = false; if (S.raf) cancelAnimationFrame(S.raf); S.raf = 0; }
  function viewHTML() {
    return `<h1 style="font-size:26px;margin-top:10px">${esc(L('title'))}</h1><p class="mut">${esc(L('intro'))}</p>${pendHTML()}${acidHTML()}`;
  }
  g.VLAB = { viewHTML, mount, leave, _s: S, _ind: indColor, _kind: kind };
})(typeof window !== 'undefined' ? window : globalThis);
