// public/promptbox.js - the prompt box fixed at the bottom of the app (Home, course pages, chapter pages).
//   + button  : add a photo, a PDF or a text file (.txt .json .html .svg .md) to the question
//   Anime     : switched on, the next prompt becomes a short explainer video (the AI writes JSON scenes, drawn here as SVG)
//   typing    : questions of the student's own course that match are offered first (opens the real question card, no AI cost); Enter asks the AI
// Self-contained: it adds its own element and style next to #app and never rewrites anything inside #app. It reads the page's globals
// (USER, COURSE, VIEW, NAV, DATA, navTo, api) but changes none of them. Server: /api/ask and /api/anime (ask-routes.js).
// Everything is built with createElement / textContent / setAttribute (no innerHTML): an answer or a video from the AI can never become markup.
(function (g) {
  'use strict';
  const doc = g.document, NS = 'http://www.w3.org/2000/svg';

  // ------------------------------------------------------------------ tiny DOM helpers
  function el(tag, props, kids) {
    const n = doc.createElement(tag);
    for (const k in (props || {})) {
      const v = props[k]; if (v == null || v === false) continue;
      if (k === 'text') n.textContent = v; else if (k === 'class') n.className = v; else n.setAttribute(k, v === true ? '' : String(v));
    }
    for (const c of (kids || [])) if (c) n.appendChild(typeof c === 'string' ? doc.createTextNode(c) : c);
    return n;
  }
  function sv(tag, attrs, kids) {
    const n = doc.createElementNS(NS, tag);
    for (const k in (attrs || {})) n.setAttribute(k, String(attrs[k]));
    for (const c of (kids || [])) if (c) n.appendChild(c);
    return n;
  }
  const clear = n => { while (n.firstChild) n.removeChild(n.firstChild); };
  const ICONS = {
    plus: [['path', { d: 'M12 5v14' }], ['path', { d: 'M5 12h14' }]],
    anime: [['rect', { x: 3, y: 10, width: 18, height: 11, rx: 2 }], ['path', { d: 'M3 10l2.5-5.5h4L7 10' }], ['path', { d: 'M9.5 10L12 4.5h4L13.5 10' }], ['path', { d: 'M16 10l2.5-5.5H21V10' }]],
    send: [['path', { d: 'M12 19V5' }], ['path', { d: 'M5 12l7-7 7 7' }]],
    img: [['rect', { x: 3, y: 4, width: 18, height: 16, rx: 2 }], ['circle', { cx: 9, cy: 10, r: 1.6 }], ['path', { d: 'M21 16l-5-5-8 9' }]],
    file: [['path', { d: 'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z' }], ['path', { d: 'M14 3v5h5' }], ['path', { d: 'M9 13h6' }], ['path', { d: 'M9 17h6' }]],
    ai: [['path', { d: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z' }], ['path', { d: 'M19 16l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z' }]],
    q: [['circle', { cx: 11, cy: 11, r: 6.5 }], ['path', { d: 'M20 20l-4.2-4.2' }]],
    close: [['path', { d: 'M6 6l12 12' }], ['path', { d: 'M18 6L6 18' }]],
    copy: [['rect', { x: 9, y: 9, width: 11, height: 11, rx: 2 }], ['path', { d: 'M5 15V6a1 1 0 0 1 1-1h9' }]],
    ok: [['path', { d: 'M5 13l4 4L19 7' }]],
    play: [['path', { d: 'M7 4.5l13 7.5-13 7.5z' }]],
    pause: [['path', { d: 'M8 5v14' }], ['path', { d: 'M16 5v14' }]],
    re: [['path', { d: 'M21 12a9 9 0 1 1-3-6.7' }], ['path', { d: 'M21 4v5h-5' }]]
  };
  const icon = k => sv('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true' }, ICONS[k].map(([t, a]) => sv(t, a)));
  // a button whose job is named by data-pbx (the click handler below reads it)
  const btn = (act, label, cls, kids, extra) => el('button', { type: 'button', class: cls, 'data-pbx': act, 'aria-label': label, ...(extra || {}) }, kids);

  // ------------------------------------------------------------------ style (app tokens, so light and dark follow the app)
  const CSS = `
.pbx{position:fixed;left:0;right:0;bottom:0;z-index:12;background:var(--bg);padding:8px max(16px,env(safe-area-inset-right,0px)) calc(10px + env(safe-area-inset-bottom,0px)) max(16px,env(safe-area-inset-left,0px));transform:translateY(calc(-1 * var(--pbx-kb,0px)))}
.pbx[hidden]{display:none}
.pbx *{box-sizing:border-box}
.pbx-in{position:relative;max-width:640px;margin:0 auto}
.pbx svg{width:19px;height:19px;fill:none;stroke:currentColor;stroke-width:1.75;stroke-linecap:round;stroke-linejoin:round}
.pbx button{font:inherit;color:inherit;cursor:pointer}
.pbx-box{display:flex;align-items:flex-end;gap:8px;background:var(--card);border:1px solid var(--ln);border-radius:14px;padding:7px 7px 7px 10px;box-shadow:0 1px 4px rgba(0,0,0,.06)}
.pbx-box:focus-within{border-color:var(--mut)}
.pbx-l{flex:none;display:flex;gap:6px;align-items:center}
.pbx-plus,.pbx-anime{height:34px;min-width:34px;border:1px solid var(--ln);background:transparent;color:var(--mut);border-radius:17px;display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:0}
.pbx-plus:hover,.pbx-anime:hover,.pbx-plus[aria-expanded=true]{background:var(--hov);color:var(--tx)}
.pbx-anime[aria-pressed=true]{padding:0 12px 0 9px;color:#16a34a;border-color:#16a34a;background:rgba(22,163,74,.12);font-weight:600;font-size:14px}
.pbx-t{flex:1;min-width:0;border:0;outline:0;background:transparent;color:var(--tx);font:inherit;resize:none;max-height:140px;min-height:26px;padding:4px 0;line-height:1.45}
.pbx-send{flex:none;width:34px;height:34px;border-radius:50%;border:0;background:#16a34a;color:#fff;display:inline-flex;align-items:center;justify-content:center;padding:0}
.pbx-send svg{width:18px;height:18px;stroke-width:2.4}
.pbx-send:disabled{background:var(--ans);color:var(--mut);cursor:default}
:root[data-theme="dark"] .pbx-send:not(:disabled){background:#22b35e}
:root[data-theme="dark"] .pbx-anime[aria-pressed=true]{color:#4ade80;border-color:#4ade80;background:rgba(74,222,128,.12)}
@media(prefers-color-scheme:dark){:root:not([data-theme="light"]) .pbx-send:not(:disabled){background:#22b35e}:root:not([data-theme="light"]) .pbx-anime[aria-pressed=true]{color:#4ade80;border-color:#4ade80;background:rgba(74,222,128,.12)}}
.pbx-pop{position:absolute;left:0;right:0;bottom:calc(100% + 8px);background:var(--card);border:1px solid var(--ln);border-radius:14px;padding:6px;box-shadow:0 6px 20px rgba(0,0,0,.14);z-index:2}
.pbx-menu{right:auto;width:min(250px,100%)}
.pbx-row{display:flex;align-items:center;gap:12px;width:100%;border:0;background:transparent;border-radius:10px;padding:10px 12px;text-align:left;color:var(--tx)}
.pbx-row:hover{background:var(--ans)}
.pbx-row>svg{flex:none;stroke:var(--mut)}
.pbx-row b{display:block;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pbx-row small{display:block;color:var(--mut);font-size:13px}
.pbx-rt{min-width:0;flex:1}
.pbx-line{border-top:1px solid var(--ln);margin:4px}
.pbx-files{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 6px}
.pbx-chip{border:1px solid var(--ln);background:var(--card);border-radius:99px;padding:3px 6px 3px 12px;font-size:13px;display:inline-flex;align-items:center;gap:4px;max-width:100%}
.pbx-chip span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:200px}
.pbx-chip button{border:0;background:transparent;padding:0;width:22px;height:22px;display:inline-flex;align-items:center;justify-content:center;color:var(--mut)}
.pbx-chip svg{width:14px;height:14px}
.pbx-sheet{position:absolute;left:0;right:0;bottom:calc(100% + 8px);max-height:min(66vh,560px);overflow:auto;background:var(--card);border:1px solid var(--ln);border-radius:16px;padding:14px 16px;box-shadow:0 8px 28px rgba(0,0,0,.18);z-index:2}
.pbx-sheet[hidden]{display:none}
.pbx-sh{display:flex;align-items:flex-start;gap:8px;justify-content:space-between}
.pbx-sh .pbx-qt{font-weight:700;overflow-wrap:anywhere;min-width:0}
.pbx-x{flex:none;width:32px;height:32px;margin:-4px -6px 0 0;border:0;background:transparent;border-radius:10px;color:var(--mut);display:inline-flex;align-items:center;justify-content:center;padding:0}
.pbx-x:hover{background:var(--hov);color:var(--tx)}
.pbx-ans{background:var(--ans);border-radius:12px;padding:12px 14px;margin-top:10px;overflow-wrap:anywhere;line-height:1.55}
.pbx-foot{display:flex;align-items:center;gap:4px;margin-top:6px;color:var(--mut);font-size:13px}
.pbx-foot .pbx-x{margin:0}
.pbx-think{display:flex;gap:12px;align-items:center;margin-top:8px;font-weight:600}
.pbx-think canvas{flex:none;display:block;background:transparent}
.pbx-err{color:#b3261e;margin-top:10px;font-size:14px}
:root[data-theme="dark"] .pbx-err{color:#ff8a80}
@media(prefers-color-scheme:dark){:root:not([data-theme="light"]) .pbx-err{color:#ff8a80}}
.pbx-stage{margin-top:10px;border-radius:12px;overflow:hidden;position:relative;background:#0f1d15}
.pbx-stage svg{display:block;width:100%;height:auto;stroke:none;stroke-width:0}
.pbx-bar{position:absolute;left:0;right:0;bottom:0;height:3px;background:rgba(255,255,255,.15)}
.pbx-bar i{display:block;height:100%;width:0;background:#4ade80;animation:pbxb linear forwards}
.pbx-bar i.ps{animation-play-state:paused}
@keyframes pbxb{to{width:100%}}
body.pbx-on #app{padding-bottom:120px}
@media(prefers-reduced-motion:reduce){.pbx-bar i{animation:none;width:100%}}`;
  function addStyle() {
    if (doc.getElementById('pbx-css')) return;
    const s = doc.createElement('style'); s.id = 'pbx-css'; s.textContent = CSS; doc.head.appendChild(s);
  }

  // ------------------------------------------------------------------ state
  const S = { anime: false, menu: false, text: '', att: [], busy: false, res: null, copied: false, hits: [] };
  let root, ta, sendB, sheetEl, popEl, filesEl, fimg, fdoc, vid = null, vp = { i: 0, on: true, t: 0 };

  // Where the box is allowed: a logged-in student with a normal course, on the home / course / chapter pages. Never in kid mode or other screens.
  function allowed() {
    try {
      return !!(typeof USER !== 'undefined' && USER && typeof COURSE_STATE !== 'undefined' && COURSE_STATE === 'set' && COURSE && !COURSE.kid &&
        typeof VIEW !== 'undefined' && VIEW === 'home' && !(typeof PEEK !== 'undefined' && PEEK) && typeof DATA !== 'undefined' && DATA);
    } catch (e) { return false; }
  }
  // The course page the student is on, when it is a textbook course: the AI then knows the class, subject and chapter.
  function context() {
    const o = {};
    try {
      if ((NAV.page === 'chapter' || NAV.page === 'index') && typeof courseOf === 'function') {
        const c = courseOf(NAV.cls, NAV.sub, NAV.med);
        if (c && !c.custom) { o.course = c.id; if (NAV.page === 'chapter' && NAV.ch != null) o.ch = NAV.ch; }
      }
    } catch (e) { /* no context: the server uses the class the student chose */ }
    return o;
  }

  // ------------------------------------------------------------------ search in the student's own course
  const STOP = new Set(['the', 'and', 'for', 'with', 'from', 'that', 'this', 'what', 'why', 'how', 'who', 'when', 'where', 'which', 'are', 'was', 'were', 'does', 'did', 'give', 'write', 'explain', 'about', 'kya', 'hai', 'hain', 'kyun', 'kaise', 'kis', 'ko', 'ki', 'ka', 'ke', 'me', 'mein', 'se', 'par', 'batao', 'samjhao', 'karo']);
  const words = t => (String(t || '').toLowerCase().match(/[\p{L}\p{N}]+/gu) || []).filter(w => Array.from(w).length > 2 && !STOP.has(w));
  let idx = null, idxFor = null;
  function index() {
    if (idx && idxFor === DATA) return idx;
    idx = []; idxFor = DATA;
    for (const c of (DATA.courses || [])) for (const ch of (c.chapters || [])) {
      if (typeof isLocked === 'function' && isLocked(ch)) continue;
      for (const sec of (ch.sections || [])) for (const q of (sec.questions || [])) {
        if (!q || !q.id || !q.text) continue;
        idx.push({ c, ch, q, hay: (String(q.text) + ' ' + (q.parts || []).join(' ')).toLowerCase() });
      }
    }
    return idx;
  }
  function search(text) {
    const ws = words(text);
    if (!ws.length) return [];
    const need = Math.max(1, Math.ceil(ws.length * 0.6));
    const out = [];
    for (const e of index()) {
      let n = 0; for (const w of ws) if (e.hay.includes(w)) n++;
      if (n >= need) out.push({ e, n });
    }
    out.sort((a, b) => b.n - a.n);
    return out.slice(0, 3).map(x => x.e);
  }
  function openQuestion(e) {
    const c = e.c, own = typeof COURSE !== 'undefined' && COURSE && !COURSE.own;
    const org = c.custom ? c.orgId : (own ? COURSE.org : NAV.org), med = (own && !c.custom) ? COURSE.med : (c.medium || 'English');
    if (!org || typeof navTo !== 'function') return false;
    closeSheet(); setText('');
    navTo({ page: 'chapter', org, med, cls: c.class, sub: c.subject, ch: e.ch.no });
    setTimeout(() => {
      const q = doc.querySelector('[data-qid="' + String(e.q.id).replace(/["\\]/g, '') + '"]');
      if (!q) return;
      try { q.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (x) { q.scrollIntoView(); }
      q.classList.add('exhit'); setTimeout(() => q.classList.remove('exhit'), 1800);
    }, 80);
    return true;
  }

  // ------------------------------------------------------------------ attachments
  const TEXT_EXT = /\.(txt|md|json|html?|svg|csv)$/i;
  function toB64(file) {
    return new Promise((ok, no) => { const r = new g.FileReader(); r.onload = () => ok(String(r.result).split(',')[1] || ''); r.onerror = () => no(new Error('File padh nahi paaya.')); r.readAsDataURL(file); });
  }
  function shrink(file) {
    if (g.CUSTOM && typeof g.CUSTOM.shrink === 'function') return g.CUSTOM.shrink(file);   // the app's own photo shrinker (JPEG, at most 1600 px)
    return toB64(file).then(data => ({ mime: file.type || 'image/jpeg', image: data }));
  }
  async function addFiles(list) {
    let err = '';
    for (const f of Array.from(list || [])) {
      if (S.att.length >= 2) { err = 'Ek baar me 2 se zyada file nahi.'; break; }
      try {
        if (/^image\//.test(f.type)) { const p = await shrink(f); S.att.push({ name: f.name, mime: p.mime, data: p.image }); }
        else if (f.type === 'application/pdf' || /\.pdf$/i.test(f.name)) {
          if (f.size > 2200000) throw new Error('PDF bahut badi hai (2 MB se chhoti lo).');
          S.att.push({ name: f.name, mime: 'application/pdf', data: await toB64(f) });
        } else if (TEXT_EXT.test(f.name) || /^text\//.test(f.type) || f.type === 'application/json') {
          if (S.att.some(a => a.text != null)) throw new Error('Ek hi text file jod sakte ho.');
          S.att.push({ name: f.name, text: String(await f.text()).slice(0, 12000) });
        } else throw new Error('Ye file nahi chalegi. Photo, PDF ya text file (.txt .json .html .svg) lo.');
      } catch (e) { err = e && e.message ? e.message : 'File jud nahi paayi.'; }
    }
    drawFiles(); if (err) { S.res = { kind: 'err', q: '', err }; drawSheet(); }
  }

  // ------------------------------------------------------------------ video (JSON scenes -> SVG elements)
  const HEX = /^#[0-9a-fA-F]{6}$/, col = v => HEX.test(String(v)) ? String(v) : '#ecf7ee', n = (v, d) => Number.isFinite(Number(v)) ? Number(v) : d;
  function itemNode(o) {
    const c = col(o.c), solid = o.fill !== false, paint = solid ? { fill: c } : { fill: 'none', stroke: c, 'stroke-width': 0.6 };
    let s;
    if (o.t === 'text') {
      s = sv('text', { x: n(o.x, 50), y: n(o.y, 28), 'font-size': n(o.s, 4), fill: c, 'text-anchor': 'middle', 'font-weight': 700, 'font-family': 'Hind, system-ui, sans-serif' });
      s.textContent = String(o.v == null ? '' : o.v);
    } else if (o.t === 'circle') s = sv('circle', { cx: n(o.x, 50), cy: n(o.y, 28), r: n(o.r, 4), ...paint });
    else if (o.t === 'rect') s = sv('rect', { x: n(o.x, 0), y: n(o.y, 0), width: n(o.w, 10), height: n(o.h, 10), rx: n(o.rx, 0), ...paint });
    else if (o.t === 'line' || o.t === 'arrow') {
      const x1 = n(o.x1, 0), y1 = n(o.y1, 0), x2 = n(o.x2, 0), y2 = n(o.y2, 0);
      s = sv('g', {}, [sv('line', { x1, y1, x2, y2, stroke: c, 'stroke-width': n(o.w, 0.8), 'stroke-linecap': 'round' })]);
      if (o.t === 'arrow') {
        const a = Math.atan2(y2 - y1, x2 - x1), h = 2.6, p = k => (x2 - Math.cos(a + k) * h).toFixed(2) + ',' + (y2 - Math.sin(a + k) * h).toFixed(2);
        s.appendChild(sv('polygon', { points: x2 + ',' + y2 + ' ' + p(0.45) + ' ' + p(-0.45), fill: c }));
      }
    } else if (o.t === 'orbit') {
      const a = n(o.rx, 20), b = n(o.ry, 8), d = 'M ' + (-a) + ' 0 a ' + a + ' ' + b + ' 0 1 0 ' + (2 * a) + ' 0 a ' + a + ' ' + b + ' 0 1 0 ' + (-2 * a) + ' 0';
      s = sv('g', { transform: 'translate(' + n(o.x, 50) + ' ' + n(o.y, 28) + ') rotate(' + n(o.rot, 0) + ')' }, [
        sv('path', { d, fill: 'none', stroke: c, 'stroke-width': 0.5, opacity: 0.6 }),
        sv('circle', { r: 2, fill: c }, [sv('animateMotion', { dur: n(o.sec, 4) + 's', repeatCount: 'indefinite', path: d })])]);
    } else return null;
    const kind = ['fade', 'rise', 'pop'].includes(o.in) ? o.in : (n(o.at, 0) > 0 ? 'fade' : '');
    if (!kind) return s;
    const b = n(o.at, 0) + 's', dur = kind === 'pop' ? '.25s' : '.6s', w = sv('g', { opacity: 0 });
    if (kind === 'rise') w.appendChild(sv('animateTransform', { attributeName: 'transform', type: 'translate', from: '0 4', to: '0 0', begin: b, dur, fill: 'freeze' }));
    w.appendChild(sv('animate', { attributeName: 'opacity', from: 0, to: 1, begin: b, dur, fill: 'freeze' }));
    w.appendChild(s);
    return w;
  }
  function sceneSVG(sc) {
    const s = sv('svg', { xmlns: NS, viewBox: '0 0 100 56', role: 'img', 'aria-label': 'Video scene' }, [sv('rect', { width: 100, height: 56, fill: HEX.test(String(sc.bg)) ? sc.bg : '#0f1d15' })]);
    for (const o of (sc.items || [])) { const x = itemNode(o); if (x) s.appendChild(x); }
    return s;
  }
  function drawStage() {
    const st = doc.getElementById('pbx-stage'); if (!st || !vid) return;
    const sc = vid.scenes[vp.i];
    clear(st); st.appendChild(sceneSVG(sc));
    st.appendChild(el('div', { class: 'pbx-bar' }, [el('i', { class: vp.on ? '' : 'ps', style: 'animation-duration:' + n(sc.dur, 3) + 's' })]));
    const b = doc.getElementById('pbx-vplay'); if (b) { clear(b); b.appendChild(icon(vp.on ? 'pause' : 'play')); b.setAttribute('aria-label', vp.on ? 'Pause karo' : 'Chalao'); }
  }
  function tick() {
    g.clearTimeout(vp.t);
    if (!vp.on || !vid || !doc.getElementById('pbx-stage')) return;
    vp.t = g.setTimeout(() => { vp.i = (vp.i + 1) % vid.scenes.length; drawStage(); tick(); }, n(vid.scenes[vp.i].dur, 3) * 1000);
  }

  // ------------------------------------------------------------------ drawing
  // **bold** and new lines only; every piece of text goes in as a text node.
  function fillText(box, text) {
    String(text == null ? '' : text).split('\n').forEach((line, li) => {
      if (li) box.appendChild(el('br'));
      const parts = line.split('**');
      if (parts.length % 2 === 0) { box.appendChild(doc.createTextNode(line)); return; }   // an unpaired ** is shown as it is
      parts.forEach((seg, i) => { if (seg) box.appendChild(i % 2 ? el('b', { text: seg }) : doc.createTextNode(seg)); });
    });
    return box;
  }
  // The app's green "warp" stars while the AI thinks (public/warp-loader.js animates every canvas.warp on the page).
  function think(text) {
    const cv = el('canvas', { class: 'warp', 'aria-hidden': 'true', style: 'width:44px;height:44px' });
    return el('div', { class: 'pbx-think', role: 'status' }, [cv, el('b', { text })]);
  }
  function drawSheet() {
    g.clearTimeout(vp.t);
    const r = S.res;
    sheetEl.hidden = !r; clear(sheetEl);
    if (!r) return;
    sheetEl.appendChild(el('div', { class: 'pbx-sh' }, [el('div', { class: 'pbx-qt', text: r.q }), btn('close', 'Band karo', 'pbx-x', [icon('close')])]));
    const left = (label, v) => typeof v === 'number' ? el('span', { text: label + v }) : null;
    if (r.kind === 'loading') { sheetEl.appendChild(think(r.anime ? 'Video ban raha hai…' : 'Soch raha hoon…')); if (g.WARP) g.WARP.start(); }
    else if (r.kind === 'err') sheetEl.appendChild(el('div', { class: 'pbx-err', role: 'alert', text: r.err }));
    else if (r.kind === 'refuse') sheetEl.appendChild(el('div', { class: 'pbx-ans', text: r.message }));
    else if (r.kind === 'answer') {
      sheetEl.appendChild(fillText(el('div', { class: 'pbx-ans' }), r.answer));
      sheetEl.appendChild(el('div', { class: 'pbx-foot' }, [btn('copy', 'Answer copy karo', 'pbx-x', [icon(S.copied ? 'ok' : 'copy')]), left('Aaj ke free sawal bache: ', r.left)]));
    } else if (r.kind === 'video') {
      sheetEl.appendChild(el('div', { class: 'pbx-stage', id: 'pbx-stage' }));
      sheetEl.appendChild(el('div', { class: 'pbx-foot' }, [btn('vplay', 'Pause karo', 'pbx-x', [icon('pause')], { id: 'pbx-vplay' }), btn('vre', 'Shuru se chalao', 'pbx-x', [icon('re')]), left('Aaj ke free video bache: ', r.left)]));
      drawStage(); tick();
    }
  }
  function closeSheet() { S.res = null; vid = null; drawSheet(); }
  function drawFiles() {
    filesEl.hidden = !S.att.length; clear(filesEl);
    S.att.forEach((a, i) => filesEl.appendChild(el('span', { class: 'pbx-chip' }, [el('span', { text: a.name }), btn('rmf', a.name + ' hatao', '', [icon('close')], { 'data-i': i })])));
  }
  const row = (act, ic, title, sub, extra) => btn(act, '', 'pbx-row', [icon(ic), el('span', { class: 'pbx-rt' }, [el('b', { text: title }), sub ? el('small', { text: sub }) : null])], extra);
  function drawPop() {
    clear(popEl);
    if (S.menu) {
      const m = el('div', { class: 'pbx-pop pbx-menu', role: 'menu' }, [row('pimg', 'img', 'Photo ya image', '', { role: 'menuitem' }), row('pdoc', 'file', 'PDF ya document', '', { role: 'menuitem' })]);
      popEl.appendChild(m);
    } else if (!S.anime && S.hits.length) {
      const l = el('div', { class: 'pbx-pop', role: 'listbox', 'aria-label': 'Milte hue sawal' });
      S.hits.forEach((e, i) => l.appendChild(row('hit', 'q', e.q.text, (e.ch.title || '') + (e.q.label ? ' · ' + String(e.q.label).replace(/\.$/, '') : ''), { role: 'option', 'data-i': i })));
      l.appendChild(el('div', { class: 'pbx-line' }));
      l.appendChild(row('askai', 'ai', 'AI se pucho', S.text.trim().slice(0, 80)));
      popEl.appendChild(l);
    }
    root.querySelector('.pbx-plus').setAttribute('aria-expanded', String(S.menu));
  }
  function drawAnime() {
    const b = root.querySelector('.pbx-anime'); b.setAttribute('aria-pressed', String(S.anime));
    clear(b); b.appendChild(icon('anime')); if (S.anime) b.appendChild(el('span', { text: 'Anime' }));
  }
  function grow() { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 140) + 'px'; }
  function setText(v) {
    S.text = v; if (ta.value !== v) ta.value = v;
    sendB.disabled = S.busy || (v.trim().length < 2 && !S.att.length);
    grow();
    S.hits = (!S.anime && v.trim().length >= 3) ? search(v) : [];
    if (!S.menu) drawPop();
  }

  // ------------------------------------------------------------------ asking
  const msg = e => (typeof g.errMsg === 'function' ? g.errMsg(e) : (e && e.message) || 'Kuch gadbad hui. Dobara try karo.');
  async function send() {
    const text = S.text.trim();
    if (S.busy || (text.length < 2 && !S.att.length)) return;
    const anime = S.anime, att = S.att.slice();
    if (anime && text.length < 2) { S.res = { kind: 'err', q: '', err: 'Video ka topic likho.' }; drawSheet(); return; }
    S.busy = true; S.menu = false; S.hits = []; S.res = { kind: 'loading', q: text || att.map(a => a.name).join(', '), anime }; drawPop(); drawSheet();
    setText(''); S.att = []; drawFiles();
    const body = { text, ...context() };
    try {
      let r;
      if (anime) r = await g.api('/api/anime', body);
      else {
        const files = att.filter(a => a.data).map(a => ({ mime: a.mime, data: a.data }));
        if (files.length) body.files = files;
        const d = att.find(a => a.text != null); if (d) body.doc = d.text;
        r = await g.api('/api/ask', body);
      }
      const q = S.res && S.res.q || text;
      if (r.refuse) S.res = { kind: 'refuse', q, message: r.message || 'Sirf padhai ka sawal puchho.' };
      else if (r.video) { vid = r.video; vp = { i: 0, on: true, t: 0 }; S.res = { kind: 'video', q, left: r.left }; }
      else S.res = { kind: 'answer', q, answer: r.answer || '', left: r.left };
    } catch (e) { S.res = { kind: 'err', q: S.res && S.res.q || text, err: msg(e) }; }
    S.busy = false; S.copied = false; drawSheet(); setText(S.text);
  }

  // ------------------------------------------------------------------ build + events
  function build() {
    addStyle();
    ta = el('textarea', { class: 'pbx-t', rows: 1, maxlength: 600, 'aria-label': 'Apna sawal likho', 'data-clarity-mask': 'true' });
    sendB = btn('send', 'Bhejo', 'pbx-send', [icon('send')], { disabled: true });
    sheetEl = el('div', { class: 'pbx-sheet', hidden: true }); popEl = el('div', { class: 'pbx-popw' }); filesEl = el('div', { class: 'pbx-files', hidden: true });
    fimg = el('input', { type: 'file', id: 'pbx-fimg', accept: 'image/*', multiple: true, hidden: true });
    fdoc = el('input', { type: 'file', id: 'pbx-fdoc', accept: '.pdf,.txt,.md,.json,.html,.htm,.svg,.csv,application/pdf,text/plain', multiple: true, hidden: true });
    const plus = btn('plus', 'Photo ya document jodo', 'pbx-plus', [icon('plus')], { 'aria-haspopup': 'menu', 'aria-expanded': 'false' });
    const anime = btn('anime', 'Anime video mode', 'pbx-anime', [icon('anime')], { 'aria-pressed': 'false' });
    root = el('div', { class: 'pbx', id: 'pbx', hidden: true }, [el('div', { class: 'pbx-in' }, [sheetEl, popEl, filesEl,
      el('div', { class: 'pbx-box' }, [el('div', { class: 'pbx-l' }, [plus, anime]), ta, sendB]), fimg, fdoc])]);
    doc.body.appendChild(root);
    ta.addEventListener('input', () => setText(ta.value));
    ta.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { if (e.isComposing || e.keyCode === 229) return; e.preventDefault(); send(); }   // Enter that only confirms a Hindi / Assamese keyboard word is left alone
      else if (e.key === 'Escape') { S.menu = false; S.hits = []; drawPop(); closeSheet(); }
    });
    for (const f of [fimg, fdoc]) f.addEventListener('change', () => { const l = Array.from(f.files || []); f.value = ''; addFiles(l).then(() => setText(S.text)); });
    root.addEventListener('click', e => {
      const b = e.target.closest('[data-pbx]'); if (!b) return;
      const a = b.dataset.pbx;
      if (a === 'send') send();
      else if (a === 'plus') { S.menu = !S.menu; drawPop(); }
      else if (a === 'pimg') { S.menu = false; drawPop(); fimg.click(); }
      else if (a === 'pdoc') { S.menu = false; drawPop(); fdoc.click(); }
      else if (a === 'anime') { S.anime = !S.anime; drawAnime(); setText(S.text); ta.focus(); }
      else if (a === 'rmf') { S.att.splice(+b.dataset.i, 1); drawFiles(); setText(S.text); }
      else if (a === 'hit') { const h = S.hits[+b.dataset.i]; if (h) openQuestion(h); }
      else if (a === 'askai') send();
      else if (a === 'close') closeSheet();
      else if (a === 'copy') {
        const t = S.res && S.res.answer; if (!t) return;
        const done = () => { S.copied = true; drawSheet(); g.setTimeout(() => { S.copied = false; if (S.res && S.res.kind === 'answer') drawSheet(); }, 1200); };
        try { g.navigator.clipboard.writeText(t).then(done, () => {}); } catch (x) { /* clipboard not allowed here */ }
      }
      else if (a === 'vplay') { vp.on = !vp.on; if (vp.on) tick(); else g.clearTimeout(vp.t); drawStage(); }
      else if (a === 'vre') { vp.i = 0; vp.on = true; drawStage(); tick(); }
    });
    doc.addEventListener('click', e => { if (S.menu && !e.target.closest('.pbx-menu,.pbx-plus')) { S.menu = false; drawPop(); } });
    drawAnime(); drawFiles();
    const vv = g.visualViewport;   // the phone keyboard covers a fixed box unless it is lifted by the keyboard's height
    if (vv) { const lift = () => root.style.setProperty('--pbx-kb', Math.max(0, g.innerHeight - vv.height - vv.offsetTop) + 'px'); vv.addEventListener('resize', lift); vv.addEventListener('scroll', lift); }
  }

  // The page redraws #app whenever something changes; the box only has to follow whether it is allowed to be there.
  function sync() {
    if (!root) return;
    const on = allowed();
    root.hidden = !on; doc.body.classList.toggle('pbx-on', on);
  }
  function start() {
    build(); sync();
    const app = doc.getElementById('app');
    if (app && g.MutationObserver) new g.MutationObserver(sync).observe(app, { childList: true });
    g.addEventListener('popstate', () => g.setTimeout(sync, 0));
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', start); else start();
  g.PROMPTBOX = { sync, search, state: S, _t: { allowed, context } };
})(window);
