// Orbit Task 47: weekly report for the parent on WhatsApp. The student's own device builds a short report from the student's own data
// (days studied + Recall results of the last 7 days) and opens WhatsApp with the message already typed (wa.me link). Nothing is sent by Orbit:
// the student or parent presses Send. The parent's number is kept only on this device, only after the parent's OK, and is never shown to anyone else.
(function (g) {
  'use strict';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const DAYKEY = 'orbit.study.', PHKEY = 'orbit.parentwa.', DAY = 86400000, WEAK = 50, STRONG = 70;
  const S = { uid: '', phone: '', err: '', msg: '' };
  const field = 'width:100%;padding:10px;border:1px solid var(--ln);border-radius:10px;background:var(--bg);color:var(--tx);font:inherit;margin-top:4px';
  const ymd = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const ls = { get(k) { try { return g.localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { g.localStorage.setItem(k, v); } catch (e) {} }, del(k) { try { g.localStorage.removeItem(k); } catch (e) {} } };
  const days = () => { try { const a = JSON.parse(ls.get(DAYKEY + S.uid) || '[]'); return Array.isArray(a) ? a.filter(x => /^\d{4}-\d{2}-\d{2}$/.test(x)) : []; } catch (e) { return []; } };
  const redraw = () => { const v = typeof VIEW !== 'undefined' ? VIEW : ''; if (v === 'report' && typeof g.draw === 'function') g.draw(); };

  // A day counts as "studied" when the student opens a chapter or does a Recall check. Only the date is kept.
  function mark(now) {
    if (!S.uid) return;
    const k = ymd(now || new Date()), a = days();
    if (a.includes(k)) return;
    a.push(k); ls.set(DAYKEY + S.uid, JSON.stringify(a.slice(-60)));
  }

  // Indian mobile number: 10 digits starting 6-9. Accepts spaces, dashes, +91, 91 and 0 in front. Returns '' when it is not valid.
  function cleanPhone(v) {
    let d = String(v || '').replace(/\D/g, '');
    if (d.length === 12 && d.startsWith('91')) d = d.slice(2); else if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
    return /^[6-9]\d{9}$/.test(d) ? d : '';
  }
  const waLink = (phone, text) => 'https://wa.me/' + (phone ? '91' + phone : '') + '?text=' + encodeURIComponent(text);

  // Pure: builds the report from this student's own data only. hist = Recall history [{k:'course|chapter', t:score, at:ms}], studied = ['YYYY-MM-DD'].
  function build(o) {
    const now = o.now || Date.now(), from = now - 7 * DAY;
    const dayKeys = new Set(); for (let i = 0; i < 7; i++) dayKeys.add(ymd(new Date(now - i * DAY)));
    const studied = new Set((o.studied || []).filter(d => dayKeys.has(d)));
    const week = (o.hist || []).filter(h => h && typeof h.t === 'number' && h.at >= from && h.at <= now + DAY);
    (week.forEach(h => studied.add(ymd(new Date(h.at)))));   // a Recall check is a study day too
    const last = {}; week.slice().sort((a, b) => a.at - b.at).forEach(h => { last[h.k] = h.t; });   // latest score of each chapter this week
    const strong = [], weak = [], mid = [];
    Object.keys(last).forEach(k => { const e = { title: (o.titleOf ? o.titleOf(k) : k), t: Math.round(last[k]) }; (e.t >= STRONG ? strong : e.t < WEAK ? weak : mid).push(e); });
    const fmt = (a, asc) => a.sort((x, y) => asc ? x.t - y.t : y.t - x.t).slice(0, 4).map(e => e.title + ' (' + e.t + '%)').join(', ');
    const name = String(o.name || '').trim().split(/\s+/)[0] || 'Bachha';
    const L = ['Orbit: ' + name + ' ki hafte ki padhai', 'Padha: ' + studied.size + '/7 din', 'Recall check: ' + week.length + ' (' + Object.keys(last).length + ' chapter)'];
    if (strong.length) L.push('Pakka hua: ' + fmt(strong));
    if (mid.length) L.push('Theek hai, thoda aur: ' + fmt(mid));
    if (weak.length) L.push('Dobara dekhna hai: ' + fmt(weak, true));
    L.push(!studied.size ? 'Is hafte padhai nahi hui. Roz 15 minute se shuru karo.' : weak.length ? 'Shabash! Kamzor chapter ko is hafte ek baar aur padhwa do.' : 'Shabash! Roz thoda thoda padhte raho.');
    return { text: L.join('\n'), daysStudied: studied.size, checks: week.length, strong: strong.length, weak: weak.length };
  }

  function titleOf(k) {
    const p = String(k).split('|'), d = typeof DATA !== 'undefined' ? DATA : null;
    const c = d && Array.isArray(d.courses) ? d.courses.find(x => x.id === p[0]) : null, ch = c && (c.chapters || []).find(x => x.no === +p[1]);
    return c ? c.subject + ' Ch ' + p[1] + (ch && ch.title ? ' ' + ch.title : '') : k;
  }
  const current = () => build({ name: (typeof USER !== 'undefined' && USER && USER.name) || '', hist: g.RECALL && g.RECALL.history ? g.RECALL.history() : [], studied: days(), titleOf });

  function viewHTML() {
    const r = current(), hasPhone = !!S.phone;
    return `<h1 style="font-size:26px;margin-top:14px">Weekly Report</h1>
      <p class="mut">Pichhle 7 din ki tumhari padhai ki chhoti report. Ye sirf tumhare apne data se banti hai. Orbit khud kuch nahi bhejta: WhatsApp khulega, tum Send dabaoge.</p>
      ${S.err ? `<p class="err" role="status">${esc(S.err)}</p>` : ''}${S.msg ? `<p role="status" style="margin:10px 0 0">${esc(S.msg)}</p>` : ''}
      <div class="card"><pre id="wkText" style="white-space:pre-wrap;font:inherit;margin:0">${esc(r.text)}</pre></div>
      <div class="card">
        ${hasPhone ? `<p style="margin:0">Parent ka number save hai: ${'•'.repeat(6)}${esc(S.phone.slice(-4))}</p><div class="chips"><button class="chip" data-wk="delphone">Number hatao</button></div>
          <button class="btn" data-wk="send">Parent ko WhatsApp par bhejo</button>`
        : `<label class="mut" for="wkPhone">Parent ka WhatsApp number (zaroori nahi)</label>
          <input id="wkPhone" inputmode="numeric" autocomplete="off" maxlength="16" placeholder="10 ank ka mobile number" style="${field}">
          <label style="display:flex;gap:10px;align-items:flex-start;margin-top:10px;font-size:13.5px"><input type="checkbox" id="wkOk" style="margin-top:3px"><span>Parent ki ijazat hai. Ye number sirf is phone par report bhejne ke liye save hoga, kisi ko dikhaya nahi jayega.</span></label>
          <div class="chips"><button class="chip" data-wk="savephone">Number save karo</button></div>
          <button class="btn" data-wk="send">WhatsApp par share karo</button>
          <p class="mut" style="margin:10px 0 0;font-size:12.5px">Number nahi diya to WhatsApp khulega aur tum khud parent ko chun loge.</p>`}
      </div>`;
  }

  g.document.addEventListener('click', e => {
    const b = e.target && e.target.closest ? e.target.closest('[data-wk]') : null; if (!b) return;
    const a = b.dataset.wk; S.err = ''; S.msg = '';
    if (a === 'savephone') {
      const p = cleanPhone((g.document.getElementById('wkPhone') || {}).value), ok = g.document.getElementById('wkOk');
      if (!p) S.err = 'Number sahi nahi hai. 10 ank ka mobile number likho.';
      else if (!ok || !ok.checked) S.err = 'Number save karne se pehle parent ki ijazat ka box tick karo.';
      else { S.phone = p; ls.set(PHKEY + S.uid, p); S.msg = 'Number is phone par save ho gaya.'; }
    } else if (a === 'delphone') { S.phone = ''; ls.del(PHKEY + S.uid); S.msg = 'Number hata diya.'; }
    else if (a === 'send') { const url = waLink(S.phone, current().text); if (g.open) g.open(url, '_blank', 'noopener'); }
    redraw();
  });

  g.WEEKLY = {
    viewHTML, mark,
    setUser(u) { const id = u && u.uid ? u.uid : ''; if (id === S.uid) return; S.uid = id; S.err = ''; S.msg = ''; S.phone = id ? (ls.get(PHKEY + id) || '') : ''; if (!/^[6-9]\d{9}$/.test(S.phone)) S.phone = ''; },
    _t: { build, cleanPhone, waLink, ymd }
  };
})(window);
