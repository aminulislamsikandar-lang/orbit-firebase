/* report.js (Task 50): "Report" button for a wrong question or AI answer.
 *   REPORT.open({ qid, question, answer, course, lang })  -> small dialog; the student picks what is wrong, adds one line, sends.
 *   REPORT.mountAdmin(box, store)   store = window.CLOUD.reports { list(), setStatus(id, status), del(id) }  (admin panel list)
 * Reports go to Firestore (collection reports, max 5 a day per student: see firestore.rules). All text is set with textContent, never innerHTML.
 * Texts follow the child's language (orbitLang(): hing, en, as, bn).
 */
(function (g) {
  'use strict';
  var N = function (hing, en, as, bn) { return { hing: hing, en: en, as: as, bn: bn }; };
  var TX = {
    title: N('Galti report karo', 'Report a mistake', 'ভুল জনাওক', 'ভুল জানাও'),
    what: N('Kya galat lagta hai?', 'What looks wrong?', 'কি ভুল যেন লাগিছে?', 'কী ভুল মনে হচ্ছে?'),
    q: N('Sawaal galat hai', 'The question is wrong', 'প্ৰশ্নটো ভুল', 'প্রশ্নটি ভুল'),
    a: N('AI ka jawab galat hai', 'The AI answer is wrong', 'AI ৰ উত্তৰ ভুল', 'AI-এর উত্তর ভুল'),
    note: N('Ek line mein batao (zaroori nahi)', 'Tell us in one line (optional)', 'এটা লাইনত কওক (বাধ্যতামূলক নহয়)', 'এক লাইনে বলো (না লিখলেও চলবে)'),
    send: N('Bhejo', 'Send', 'পঠাওক', 'পাঠাও'), cancel: N('Band karo', 'Close', 'বন্ধ কৰক', 'বন্ধ করো'),
    ok: N('Shukriya! Teacher aur admin isse dekhenge.', 'Thank you! The admin will look at it.', 'ধন্যবাদ! এডমিনে এইটো চাব।', 'ধন্যবাদ! অ্যাডমিন এটা দেখবে।'),
    login: N('Report bhejne ke liye pehle Google se log in karo.', 'Please log in with Google to send a report.', 'ৰিপৰ্ট পঠিয়াবলৈ প্ৰথমে Google ৰে লগ ইন কৰক।', 'রিপোর্ট পাঠাতে আগে Google দিয়ে লগ ইন করো।'),
    limit: N('Aaj ke 5 report ho gaye. Kal phir bhejna.', 'You have sent 5 reports today. Please try again tomorrow.', 'আজিৰ ৫টা ৰিপৰ্ট হ\'ল। কাইলৈ আকৌ পঠাব।', 'আজকের ৫টি রিপোর্ট হয়ে গেছে। কাল আবার পাঠাও।'),
    fail: N('Report nahi gaya. Internet check karke dobara try karo.', 'Could not send. Check your internet and try again.', 'পঠিওৱা নগ\'ল। ইণ্টাৰনেট চাই আকৌ চেষ্টা কৰক।', 'পাঠানো যায়নি। ইন্টারনেট দেখে আবার চেষ্টা করো।'),
    noans: N('Abhi is sawaal ka AI jawab nahi bana, isliye sirf sawaal report ho sakta hai.', 'This question has no AI answer yet, so you can only report the question.', 'এই প্ৰশ্নৰ AI উত্তৰ এতিয়াও হোৱা নাই, গতিকে কেৱল প্ৰশ্নটো ৰিপৰ্ট কৰিব পাৰি।', 'এই প্রশ্নের AI উত্তর এখনো হয়নি, তাই শুধু প্রশ্ন রিপোর্ট করা যাবে।')
  };
  function lang() { return (g.orbitLang && g.orbitLang()) || 'hing'; }
  function L(k) { var o = TX[k]; return o[lang()] || o.hing; }
  function clip(s, n) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, n); }

  // The document that is stored. Pure function (also used by the tests).
  function build(ctx, type, note) {
    return { type: type === 'answer' ? 'answer' : 'question', qid: clip(ctx.qid, 80), course: clip(ctx.course, 80), lang: clip(ctx.lang, 10) || 'en',
      question: clip(ctx.question, 600), answer: clip(ctx.answer, 2000), note: clip(note, 200) };
  }
  function h(tag, props, kids) {
    var e = document.createElement(tag);
    for (var k in (props || {})) { if (k === 'text') e.textContent = props[k]; else if (k === 'style') e.style.cssText = props[k]; else e[k] = props[k]; }
    (kids || []).forEach(function (c) { e.appendChild(c); });
    return e;
  }

  function open(ctx) {
    close();
    var hasAns = !!clip(ctx.answer, 5), type = hasAns ? 'answer' : 'question', sending = false;
    var ov = h('div', { id: 'rp-ov', role: 'dialog', style: 'position:fixed;inset:0;z-index:200;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;padding:16px' });
    ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', L('title'));
    var box = h('div', { style: 'background:var(--card,#fff);color:var(--tx,#111);border:1px solid var(--ln,#ddd);border-radius:14px;padding:16px;width:100%;max-width:420px;max-height:90vh;overflow:auto' });
    var msg = h('p', { style: 'margin:10px 0 0;font-size:14px', text: '' }); msg.setAttribute('role', 'status');
    var chips = h('div', { className: 'chips' });
    function chip(key, t) { var b = h('button', { className: 'chip', text: L(key) }); b.type = 'button'; b.setAttribute('aria-pressed', String(type === t)); b.onclick = function () { type = t; paint(); }; return b; }
    function paint() { chips.textContent = ''; chips.appendChild(chip('q', 'question')); if (hasAns) chips.appendChild(chip('a', 'answer')); }
    paint();
    var ta = h('textarea', { maxLength: 200, rows: 3, style: 'width:100%;box-sizing:border-box;margin-top:10px;padding:9px;border:1px solid var(--ln,#ccc);border-radius:10px;background:transparent;color:inherit;font:inherit' });
    ta.setAttribute('aria-label', L('note')); ta.placeholder = L('note');
    var send = h('button', { className: 'btn', text: L('send'), style: 'margin:12px 8px 0 0' }); send.type = 'button';
    var cancel = h('button', { className: 'chip', text: L('cancel') }); cancel.type = 'button'; cancel.onclick = close;
    send.onclick = function () {
      if (sending) return;
      var store = g.CLOUD && g.CLOUD.reports;
      if (!store) { msg.textContent = L('fail'); return; }
      sending = true; send.disabled = true; msg.textContent = '';
      Promise.resolve().then(function () { return store.add(build(ctx, type, ta.value)); }).then(function () {
        msg.textContent = L('ok'); send.style.display = 'none'; ta.disabled = true; setTimeout(close, 1800);
      }).catch(function (e) {
        sending = false; send.disabled = false;
        msg.textContent = e && e.code === 'login' ? L('login') : e && e.code === 'limit' ? L('limit') : L('fail');
      });
    };
    box.appendChild(h('h2', { text: L('title'), style: 'margin:0 0 6px;font-size:19px' }));
    box.appendChild(h('p', { text: L('what'), style: 'margin:0 0 6px;font-size:14px' }));
    box.appendChild(chips);
    if (!hasAns) box.appendChild(h('p', { className: 'mut', text: L('noans'), style: 'margin:6px 0 0;font-size:13px' }));
    box.appendChild(ta); box.appendChild(send); box.appendChild(cancel); box.appendChild(msg);
    ov.appendChild(box);
    ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
    document.body.appendChild(ov); ta.focus();
  }
  function close() { var o = document.getElementById('rp-ov'); if (o) o.remove(); }

  // ---- admin list (Hinglish, like the other admin panels) ----
  function mountAdmin(box, store) {
    box.textContent = '';
    var info = h('p', { style: 'font-size:13px;color:var(--mut)', text: 'Bachhon ke report. "Seen" = dekh liya, "Fixed" = theek kar diya. Roz max 5 report har bachha bhej sakta hai.' });
    var list = h('div'), msg = h('p', { style: 'font-size:13px', text: 'Load ho raha hai...' });
    box.appendChild(info); box.appendChild(msg); box.appendChild(list);
    var filter = 'new';
    function when(ts) { return ts ? new Date(ts).toLocaleString() : ''; }
    function row(r) {
      var d = h('div', { style: 'border:1px solid var(--ln,#ddd);border-radius:12px;padding:10px;margin:8px 0' });
      d.appendChild(h('div', { style: 'font-size:12px;color:var(--mut)', text: (r.type === 'answer' ? 'AI jawab galat' : 'Sawaal galat') + ' | ' + (r.course || '-') + ' | ' + (r.lang || '-') + ' | ' + when(r.ts) + ' | ' + (r.status || 'new') }));
      d.appendChild(h('p', { style: 'margin:6px 0;font-size:14px', text: 'Sawaal: ' + (r.question || '-') }));
      if (r.answer) d.appendChild(h('p', { style: 'margin:6px 0;font-size:13px;color:var(--mut)', text: 'Jawab: ' + r.answer.slice(0, 400) + (r.answer.length > 400 ? '...' : '') }));
      if (r.note) d.appendChild(h('p', { style: 'margin:6px 0;font-size:14px;font-weight:600', text: 'Bachhe ne likha: ' + r.note }));
      d.appendChild(h('div', { style: 'font-size:12px;color:var(--mut)', text: 'Question id: ' + (r.qid || '-') }));
      var acts = h('div', { style: 'margin-top:8px' });
      [['seen', 'Seen'], ['fixed', 'Fixed'], ['new', 'Wapas New']].forEach(function (p) {
        if ((r.status || 'new') === p[0]) return;
        var b = h('button', { className: 'tm-b2', text: p[1] }); b.type = 'button';
        b.onclick = function () { b.disabled = true; store.setStatus(r.id, p[0]).then(load).catch(function () { msg.textContent = 'Status badla nahi (admin account se log in hai?).'; b.disabled = false; }); };
        acts.appendChild(b); acts.appendChild(document.createTextNode(' '));
      });
      var del = h('button', { className: 'tm-b2', text: 'Delete' }); del.type = 'button';
      del.onclick = function () { del.disabled = true; store.del(r.id).then(load).catch(function () { msg.textContent = 'Delete nahi hua.'; del.disabled = false; }); };
      acts.appendChild(del); d.appendChild(acts);
      return d;
    }
    var bar = h('div', { style: 'margin:8px 0' });
    [['new', 'New'], ['seen', 'Seen'], ['fixed', 'Fixed'], ['all', 'Sab']].forEach(function (p) {
      var b = h('button', { className: 'tm-b2', text: p[1] }); b.type = 'button'; b.onclick = function () { filter = p[0]; load(); }; bar.appendChild(b); bar.appendChild(document.createTextNode(' '));
    });
    box.insertBefore(bar, msg);
    var cache = null;
    function show() {
      list.textContent = '';
      var rows = cache.filter(function (r) { return filter === 'all' || (r.status || 'new') === filter; });
      msg.textContent = rows.length ? rows.length + ' report' : 'Is list mein koi report nahi hai.';
      rows.forEach(function (r) { list.appendChild(row(r)); });
    }
    function load() {
      msg.textContent = 'Load ho raha hai...';
      store.list().then(function (a) { cache = a; show(); }).catch(function () { msg.textContent = 'Reports load nahi hue. Admin Google account se log in karo aur firestore rules deploy hue hain ya nahi dekho.'; });
    }
    load();
  }
  g.REPORT = { open: open, close: close, mountAdmin: mountAdmin, _build: build, _tx: TX };
})(typeof window !== 'undefined' ? window : globalThis);
