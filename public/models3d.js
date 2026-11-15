// Orbit 3D Models (Task 52): cell, solar system and electric circuit. Drag to rotate. Needs no library and no download:
// a tiny perspective renderer on a 2D canvas, so it stays light on slow phones. Labels follow the child's language (ST.tlang).
// index.html calls M3D.viewHTML() to draw the page and M3D.mount(root) after drawing.
(function (g) {
  'use strict';
  const N = (hing, en, as, bn) => ({ hing, en, as, bn });
  const TX = {
    title: N('3D Models', '3D Models', '৩ডি মডেল', '৩ডি মডেল'),
    intro: N('Ungli se ghumao aur har hissa dekho. Naam on rakho to hisson ke naam dikhenge.', 'Drag with your finger to turn the model and look at every part. Keep Names on to see the labels.', 'আঙুলিৰে ঘূৰাই প্ৰতিটো অংশ চোৱা। নাম অন ৰাখিলে অংশবোৰৰ নাম দেখা যাব।', 'আঙুল দিয়ে ঘুরিয়ে প্রতিটি অংশ দেখো। নাম চালু রাখলে অংশের নাম দেখা যাবে।'),
    cell: N('Cell', 'Cell', 'কোষ', 'কোষ'), solar: N('Solar system', 'Solar system', 'সৌৰজগত', 'সৌরজগৎ'), circuit: N('Electric circuit', 'Electric circuit', 'বৈদ্যুতিক বৰ্তনী', 'বৈদ্যুতিক বর্তনী'),
    names: N('Naam', 'Names', 'নাম', 'নাম'), spin: N('Apne aap ghume', 'Auto-spin', 'নিজে নিজে ঘূৰক', 'নিজে নিজে ঘুরুক'),
    swClose: N('Switch band karo', 'Close the switch', 'চুইচ বন্ধ কৰা', 'সুইচ বন্ধ করো'), swOpen: N('Switch kholo', 'Open the switch', 'চুইচ খোলা', 'সুইচ খোলো'),
    lowdata: N('Kam data mode on hai, isliye model ruka hua hai. Ungli se ghumao ya "Apne aap ghume" dabao.', 'Low data mode is on, so the model is paused. Drag it, or press Auto-spin.', 'কম ডাটা মোড অন আছে, গতিকে মডেল ৰৈ আছে। আঙুলিৰে ঘূৰোৱা বা নিজে নিজে ঘূৰক টিপা।', 'কম ডেটা মোড চালু, তাই মডেল থেমে আছে। আঙুল দিয়ে ঘোরাও বা নিজে নিজে ঘুরুক চাপো।'),
    nCell: N('Cell ke hisse: membrane, nucleus, mitochondria, Golgi body aur lysosome. Chhote dot ribosome hain.', 'Parts of a cell: membrane, nucleus, mitochondria, Golgi body and lysosomes. The tiny dots are ribosomes.', 'কোষৰ অংশ: আৱৰণী, কেন্দ্ৰক, মাইটোকন্ড্ৰিয়া, গলজি বডি আৰু লাইছোজোম। সৰু ফুটাবোৰ ৰাইবোজোম।', 'কোষের অংশ: ঝিল্লি, নিউক্লিয়াস, মাইটোকন্ড্রিয়া, গলগি বস্তু ও লাইসোজোম। ছোট বিন্দুগুলো রাইবোজোম।'),
    nSolar: N('Doori aur size asli napo se nahi hain, taaki saare grah ek saath dikhein. Grah Sun ke chakkar lagate hain.', 'Distances and sizes are not to scale, so all planets fit on screen. Planets go around the Sun.', 'দূৰত্ব আৰু আকাৰ আচল জোখৰ নহয়, যাতে সকলো গ্ৰহ এলগে দেখা যায়। গ্ৰহবোৰে সূৰ্যৰ চাৰিওফালে ঘূৰে।', 'দূরত্ব ও আকার আসল মাপের নয়, যাতে সব গ্রহ একসঙ্গে দেখা যায়। গ্রহগুলো সূর্যকে ঘিরে ঘোরে।'),
    nCircOn: N('Switch band hai: current battery ke + se chalkar bulb se hota hua − par lautta hai, isliye bulb jalta hai.', 'Switch closed: current flows from the + of the battery through the bulb back to the −, so the bulb glows.', 'চুইচ বন্ধ: কাৰেণ্ট বেটাৰীৰ + ৰ পৰা বাল্ব হৈ − লৈ ঘূৰি আহে, গতিকে বাল্ব জ্বলে।', 'সুইচ বন্ধ: কারেন্ট ব্যাটারির + থেকে বাল্ব হয়ে − এ ফিরে আসে, তাই বাল্ব জ্বলে।'),
    nCircOff: N('Switch khula hai: raasta toot gaya, current nahi chalta aur bulb nahi jalta.', 'Switch open: the path is broken, so no current flows and the bulb stays off.', 'চুইচ খোলা: পথ ভাঙিছে, কাৰেণ্ট নাযায় আৰু বাল্ব নজ্বলে।', 'সুইচ খোলা: পথ ভাঙা, কারেন্ট চলে না আর বাল্ব জ্বলে না।')
  };
  const NM = {
    mem: N('Cell membrane', 'Cell membrane', 'কোষ-আৱৰণী', 'কোষঝিল্লি'), nuc: N('Nucleus', 'Nucleus', 'কেন্দ্ৰক', 'নিউক্লিয়াস'), nucl: N('Nucleolus', 'Nucleolus', 'কেন্দ্ৰিকা', 'নিউক্লিওলাস'),
    mit: N('Mitochondria', 'Mitochondria', 'মাইটোকন্ড্ৰিয়া', 'মাইটোকন্ড্রিয়া'), gol: N('Golgi body', 'Golgi body', 'গলজি বডি', 'গলগি বস্তু'), lys: N('Lysosome', 'Lysosome', 'লাইছোজোম', 'লাইসোজোম'), rib: N('Ribosome', 'Ribosome', 'ৰাইবোজোম', 'রাইবোজোম'),
    sun: N('Sun', 'Sun', 'সূৰ্য', 'সূর্য'), p0: N('Mercury (Budh)', 'Mercury', 'বুধ', 'বুধ'), p1: N('Venus (Shukra)', 'Venus', 'শুক্ৰ', 'শুক্র'), p2: N('Earth (Prithvi)', 'Earth', 'পৃথিৱী', 'পৃথিবী'),
    p3: N('Mars (Mangal)', 'Mars', 'মঙ্গল', 'মঙ্গল'), p4: N('Jupiter (Brihaspati)', 'Jupiter', 'বৃহস্পতি', 'বৃহস্পতি'), p5: N('Saturn (Shani)', 'Saturn', 'শনি', 'শনি'), p6: N('Uranus (Arun)', 'Uranus', 'ইউৰেনাছ', 'ইউরেনাস'), p7: N('Neptune (Varun)', 'Neptune', 'নেপচুন', 'নেপচুন'),
    bat: N('Battery', 'Battery', 'বেটাৰী', 'ব্যাটারি'), bulb: N('Bulb', 'Bulb', 'বাল্ব', 'বাল্ব'), sw: N('Switch', 'Switch', 'চুইচ', 'সুইচ'), wire: N('Wire', 'Wire', 'তাঁৰ', 'তার'), cur: N('Current', 'Current', 'কাৰেণ্ট', 'কারেন্ট')
  };
  const lang = () => (g.orbitLang && g.orbitLang()) || 'hing';
  const pick = o => o[lang()] || o.hing;
  const L = k => pick(TX[k]), NAME = k => pick(NM[k]);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // ---- tiny 3D helpers ----
  function shade(hex, f) {   // f < 1 darker, f > 1 lighter
    const n = parseInt(hex.slice(1), 16), c = i => Math.max(0, Math.min(255, Math.round(((n >> i) & 255) * f)));
    return 'rgb(' + c(16) + ',' + c(8) + ',' + c(0) + ')';
  }
  function proj(p, V) {
    const cy = Math.cos(V.yaw), sy = Math.sin(V.yaw), cp = Math.cos(V.pitch), sp = Math.sin(V.pitch);
    const x = p[0] * cy + p[2] * sy, z = -p[0] * sy + p[2] * cy, y2 = p[1] * cp - z * sp, z2 = p[1] * sp + z * cp, k = 5 / (5 - z2);
    return { x: V.cx + x * k * V.S, y: V.cy - y2 * k * V.S, z: z2, k };
  }
  // A scene is a list of items {z, draw(ctx)} (sorted far to near) plus a list of labels.
  function scene(tab, V, st) {
    const items = [], labels = [];
    const P = p => proj(p, V);
    const sphere = (p, r, col, o) => { o = o || {}; const q = P(p), R = r * q.k * V.S;
      items.push({ z: q.z, draw(c) {
        if (o.alpha) { c.globalAlpha = o.alpha; c.beginPath(); c.arc(q.x, q.y, R, 0, 6.2832); c.fillStyle = col; c.fill(); c.globalAlpha = 1; if (o.edge) { c.strokeStyle = o.edge; c.lineWidth = 1.5; c.stroke(); } return; }
        const gr = c.createRadialGradient(q.x - R * .35, q.y - R * .35, R * .1, q.x, q.y, R); gr.addColorStop(0, shade(col, 1.45)); gr.addColorStop(.55, col); gr.addColorStop(1, shade(col, .6));
        c.beginPath(); c.arc(q.x, q.y, R, 0, 6.2832); c.fillStyle = gr; c.fill(); } }); return q; };
    const line = (a, b, col, w, z0) => { const qa = P(a), qb = P(b); items.push({ z: z0 != null ? z0 : (qa.z + qb.z) / 2, draw(c) { c.beginPath(); c.moveTo(qa.x, qa.y); c.lineTo(qb.x, qb.y); c.strokeStyle = col; c.lineWidth = w; c.lineCap = 'round'; c.stroke(); } }); };
    const capsule = (a, b, r, col) => { const qa = P(a), qb = P(b), k = (qa.k + qb.k) / 2; items.push({ z: (qa.z + qb.z) / 2, draw(c) { c.beginPath(); c.moveTo(qa.x, qa.y); c.lineTo(qb.x, qb.y); c.strokeStyle = shade(col, .7); c.lineWidth = 2 * r * k * V.S; c.lineCap = 'round'; c.stroke(); c.strokeStyle = col; c.lineWidth = 1.4 * r * k * V.S; c.stroke(); } }); };
    const poly = (pts, col, w, z0, fill) => { const q = pts.map(P); items.push({ z: z0, draw(c) { c.beginPath(); q.forEach((u, i) => i ? c.lineTo(u.x, u.y) : c.moveTo(u.x, u.y)); if (fill) { c.fillStyle = fill; c.fill(); } if (w) { c.strokeStyle = col; c.lineWidth = w; c.lineJoin = 'round'; c.stroke(); } } }); };
    const label = (p, key, dy) => { const q = P(p); labels.push({ x: q.x, y: q.y + (dy || 0), t: NAME(key), z: q.z }); };
    const t = st.t;

    if (tab === 'cell') {
      const R = 1.1, q = P([0, 0, 0]);
      items.push({ z: q.z, draw(c) { c.globalAlpha = .13; c.beginPath(); c.arc(q.x, q.y, R * q.k * V.S, 0, 6.2832); c.fillStyle = '#4fc3f7'; c.fill(); c.globalAlpha = 1; c.strokeStyle = '#2f93c9'; c.lineWidth = 2.5; c.stroke(); } });
      sphere([.12, .08, 0], .4, '#7e57c2'); sphere([.3, .16, .24], .13, '#4527a0');
      [[.62, -.35, .3, .85, -.5, .45], [-.7, .35, .2, -.45, .65, .35], [.4, .55, -.45, .15, .75, -.65], [-.35, -.6, -.4, -.7, -.35, -.2]].forEach(m => capsule([m[0], m[1], m[2]], [m[3], m[4], m[5]], .11, '#ef6c00'));
      for (let i = 0; i < 3; i++) capsule([-.78 + i * .06, -.5 + i * .1, .5 - i * .06], [-.35 + i * .06, -.62 + i * .1, .62 - i * .06], .045, '#f9a825');
      [[.55, .25, .55], [-.25, .78, .15], [.1, -.8, .3]].forEach(p => sphere(p, .075, '#c62828'));
      let s = 7; for (let i = 0; i < 16; i++) { s = (s * 9301 + 49297) % 233280; const a = s / 233280 * 6.2832; s = (s * 9301 + 49297) % 233280; const b = (s / 233280 - .5) * 2.6, rr = .7 + (i % 3) * .08, pp = [Math.cos(a) * rr * Math.cos(b * .5), Math.sin(b * .5) * rr, Math.sin(a) * rr * Math.cos(b * .5)]; sphere(pp, .03, '#37474f'); }
      if (st.labels) { label([R * .72, R * .72, 0], 'mem'); label([-.12, .12, .4], 'nuc'); label([.36, .34, .3], 'nucl', -4); label([.85, -.5, .45], 'mit'); label([-.55, -.56, .56], 'gol'); label([.55, .25, .62], 'lys'); label([-.62, .1, .75], 'rib'); }
    } else if (tab === 'solar') {
      const orb = [.4, .53, .66, .8, .93, 1.04, 1.14, 1.22], rad = [.035, .06, .065, .05, .14, .12, .09, .09], per = [.24, .62, 1, 1.88, 11.86, 29.5, 84, 165], col = ['#9e9e9e', '#e0b060', '#2e86de', '#d9532f', '#d9a066', '#e6c98a', '#7fd0d8', '#3f5fd0'];
      orb.forEach(r => { const ring = []; for (let i = 0; i <= 72; i++) { const a = i / 72 * 6.2832; ring.push([Math.cos(a) * r, 0, Math.sin(a) * r]); } poly(ring, 'rgba(150,150,150,.35)', 1, -50); });
      const sq = sphere([0, 0, 0], .24, '#ffb300'); items.push({ z: sq.z - .001, draw(c) { c.globalAlpha = .25; c.beginPath(); c.arc(sq.x, sq.y, .36 * sq.k * V.S, 0, 6.2832); c.fillStyle = '#ffca28'; c.fill(); c.globalAlpha = 1; } });
      for (let i = 0; i < 8; i++) {
        const a = t * .5 / Math.pow(per[i], .7) + i * 1.3, p = [Math.cos(a) * orb[i], 0, Math.sin(a) * orb[i]], pq = P(p);
        if (i === 5) { const back = [], front = []; for (let j = 0; j <= 40; j++) { const b = j / 40 * 6.2832, u = [p[0] + Math.cos(b) * .21, p[1] + Math.sin(b) * .21 * Math.sin(.45), p[2] + Math.sin(b) * .21 * Math.cos(.45)], uq = P(u); (uq.z < pq.z ? back : front).push(u); }
          if (back.length > 1) poly(back, '#cdb87a', 3, pq.z - .002); sphere(p, rad[i], col[i]); if (front.length > 1) poly(front, '#cdb87a', 3, pq.z + .002);
        } else sphere(p, rad[i], col[i]);
        if (st.labels) label(p, 'p' + i, -rad[i] * V.S * 1.2 - 6);
      }
      if (st.labels) label([0, 0, 0], 'sun', 0);
    } else {   // circuit: a flat board with a battery, bulb, switch and wires
      const A = [-1, 0, -.6], B = [1, 0, -.6], C = [1, 0, .6], D = [-1, 0, .6], bp = [-1, 0, -.12], bn = [-1, 0, .12], b1 = [1, 0, -.15], b2 = [1, 0, .15], s1 = [-.25, 0, .6], s2 = [.25, 0, .6];
      poly([[-1.25, -.06, -.85], [1.25, -.06, -.85], [1.25, -.06, .85], [-1.25, -.06, .85]], 'rgba(120,120,120,.5)', 1.5, -50, 'rgba(120,160,120,.18)');
      const wire = '#8d6e63';
      [[bp, A], [A, B], [B, b1], [b2, C], [C, s2], [s1, D], [D, bn]].forEach(w => line(w[0], w[1], wire, 4));
      line([-1, 0, -.12], [-1, .38, -.12], '#c62828', 5); line([-1, 0, .12], [-1, .22, .12], '#1565c0', 5);   // battery plates: long = +, short = -
      line([-1, .1, -.12], [-1, .1, .12], 'rgba(120,120,120,.6)', 1);
      sphere(s1, .035, '#555'); sphere(s2, .035, '#555');
      line(s1, st.sw ? s2 : [.12, .38, .6], '#37474f', 5);
      line([1, 0, -.1], [1, .08, .1], '#90a4ae', 7);
      const bq = sphere([1, .2, 0], .15, st.sw ? '#ffe082' : '#cfd8dc');
      if (st.sw) items.push({ z: bq.z - .001, draw(c) { const gr = c.createRadialGradient(bq.x, bq.y, 0, bq.x, bq.y, .5 * bq.k * V.S); gr.addColorStop(0, 'rgba(255,235,59,.65)'); gr.addColorStop(1, 'rgba(255,235,59,0)'); c.beginPath(); c.arc(bq.x, bq.y, .5 * bq.k * V.S, 0, 6.2832); c.fillStyle = gr; c.fill(); } });
      if (st.sw) {   // moving dots show the current going + -> bulb -> -
        const path = [bp, A, B, b1, b2, C, s2, s1, D, bn], seg = [], tot = path.slice(1).reduce((s, p, i) => { const d = Math.hypot(p[0] - path[i][0], p[1] - path[i][1], p[2] - path[i][2]); seg.push(d); return s + d; }, 0);
        for (let i = 0; i < 12; i++) { let d = ((t * .55 + i * tot / 12) % tot), j = 0; while (j < seg.length - 1 && d > seg[j]) { d -= seg[j]; j++; } const f = d / seg[j], a = path[j], b = path[j + 1]; sphere([a[0] + (b[0] - a[0]) * f, .03, a[2] + (b[2] - a[2]) * f], .045, '#fdd835'); }
      }
      if (st.labels) { label([-1, .38, -.12], 'bat', -10); label([1, .38, 0], 'bulb'); label([0, .3, .6], 'sw'); label([0, .05, -.6], 'wire', -8); if (st.sw) label([.55, .05, -.6], 'cur', 14); }
    }
    items.sort((a, b) => a.z - b.z);
    return { items, labels };
  }
  function render(ctx, tab, V, st, textCol) {
    ctx.clearRect(0, 0, V.W, V.W);
    const sc = scene(tab, V, st);
    for (const it of sc.items) it.draw(ctx);
    if (st.labels) {
      ctx.font = '600 ' + Math.max(11, Math.round(V.W / 28)) + 'px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (const l of sc.labels) { ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.strokeText(l.t, l.x, l.y); ctx.fillStyle = '#111'; ctx.fillText(l.t, l.x, l.y); }
    }
    return sc;
  }

  const S = { tab: 'cell', yaw: .5, pitch: .3, labels: true, auto: true, sw: true, t: 0, raf: 0, last: 0, drag: null };
  const START = { cell: [.5, .3], solar: [.3, .85], circuit: [.5, .75] };
  const byId = id => document.getElementById(id);
  const lowOn = () => !!(g.orbitLow && g.orbitLow());
  let lowApplied = false;

  function viewHTML() {
    const chips = Object.keys(START).map(k => `<button class="chip" data-m3="${k}" aria-pressed="${S.tab === k}">${esc(L(k))}</button>`).join('');
    return `<h1 style="font-size:26px;margin-top:10px">${esc(L('title'))}</h1><p class="mut">${esc(L('intro'))}</p>
 <div class="chips" role="group">${chips}</div>
 <canvas id="m3-cv" role="img" aria-label="${esc(L(S.tab))}" style="display:block;width:100%;max-width:440px;aspect-ratio:1/1;margin:10px auto 0;touch-action:none;color:var(--tx);border:1px solid var(--ln);border-radius:14px;background:var(--card)"></canvas>
 <div class="chips" role="group"><button class="chip" id="m3-lb" aria-pressed="${S.labels}">${esc(L('names'))}</button><button class="chip" id="m3-au" aria-pressed="${S.auto}">${esc(L('spin'))}</button><button class="chip" id="m3-sw" style="${S.tab === 'circuit' ? '' : 'display:none'}">${esc(L(S.sw ? 'swOpen' : 'swClose'))}</button></div>
 <p class="mut" id="m3-note" style="margin-top:8px"></p><p class="mut" id="m3-low" style="display:none">${esc(L('lowdata'))}</p>`;
  }
  function noteText() { return S.tab === 'cell' ? L('nCell') : S.tab === 'solar' ? L('nSolar') : L(S.sw ? 'nCircOn' : 'nCircOff'); }

  function mount(root) {
    const cv = byId('m3-cv'); if (!cv) return;
    if (S.raf) cancelAnimationFrame(S.raf);
    if (lowOn() && !lowApplied) { S.auto = false; lowApplied = true; byId('m3-au').setAttribute('aria-pressed', 'false'); }
    if (lowOn()) byId('m3-low').style.display = '';
    const ctx = cv.getContext('2d'); if (!ctx) return;
    const setTab = k => { S.tab = k; S.yaw = START[k][0]; S.pitch = START[k][1]; root.querySelectorAll('[data-m3]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.m3 === k))); byId('m3-sw').style.display = k === 'circuit' ? '' : 'none'; byId('m3-note').textContent = noteText(); cv.setAttribute('aria-label', L(k)); dirty = true; };
    let dirty = true, size = 0, textCol = '#111';
    root.querySelectorAll('[data-m3]').forEach(b => b.onclick = () => setTab(b.dataset.m3));
    byId('m3-lb').onclick = e => { S.labels = !S.labels; e.currentTarget.setAttribute('aria-pressed', String(S.labels)); dirty = true; };
    byId('m3-au').onclick = e => { S.auto = !S.auto; e.currentTarget.setAttribute('aria-pressed', String(S.auto)); };
    byId('m3-sw').onclick = e => { S.sw = !S.sw; e.currentTarget.textContent = L(S.sw ? 'swOpen' : 'swClose'); byId('m3-note').textContent = noteText(); dirty = true; };
    cv.onpointerdown = e => { S.drag = { x: e.clientX, y: e.clientY }; try { cv.setPointerCapture(e.pointerId); } catch (x) { } };
    cv.onpointermove = e => { if (!S.drag) return; S.yaw += (e.clientX - S.drag.x) * .01; S.pitch = Math.max(-1.5, Math.min(1.5, S.pitch + (e.clientY - S.drag.y) * .01)); S.drag = { x: e.clientX, y: e.clientY }; dirty = true; };
    cv.onpointerup = cv.onpointercancel = () => { S.drag = null; };
    byId('m3-note').textContent = noteText();
    function frame(ts) {
      if (!cv.isConnected) { S.raf = 0; return; }
      S.raf = requestAnimationFrame(frame);
      if (document.hidden || ts - S.last < 33) return;   // about 30 frames a second is plenty and saves battery
      const dt = S.last ? Math.min((ts - S.last) / 1000, .1) : 0; S.last = ts;
      const animated = S.auto || (S.tab === 'circuit' && S.sw) || S.tab === 'solar';
      if (S.auto && !S.drag) { S.yaw += dt * .35; dirty = true; }
      if (!lowOn() || S.auto) S.t += dt;
      if (animated && !(lowOn() && !S.auto)) dirty = true;
      const w = Math.round(cv.clientWidth); if (!w) return;
      const dpr = Math.min(g.devicePixelRatio || 1, 2);
      if (w !== size) { size = w; cv.width = cv.height = Math.round(w * dpr); dirty = true; textCol = getComputedStyle(cv).color; }
      if (!dirty) return; dirty = false;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      render(ctx, S.tab, { yaw: S.yaw, pitch: S.pitch, cx: w / 2, cy: w / 2, S: w / 2.7, W: w }, S, textCol);
    }
    S.raf = requestAnimationFrame(frame);
  }
  function leave() { if (S.raf) cancelAnimationFrame(S.raf); S.raf = 0; lowApplied = false; }
  g.M3D = { viewHTML, mount, leave, _render: render, _scene: scene, _s: S };
})(typeof window !== 'undefined' ? window : globalThis);
