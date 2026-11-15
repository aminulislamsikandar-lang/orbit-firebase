// Builds crawlable static pages (no JS) for every course/chapter + /learn/ hub + sitemap.xml, from questions-public.js.
// Runs before deploy (see firebase.json predeploy). Change SITE_URL when you buy your own domain:  SITE_URL=https://yourdomain.in node build-seo.js
// Optional richer content per chapter: seo-content/<courseId>-<chapterNo>.json
//   { "summary": "…", "keyPoints": ["…"], "answers": { "<questionId>": "reviewed answer text" } }
const fs = require('fs'), path = require('path');
const SITE = (process.env.SITE_URL || 'https://orbittutorial.web.app').replace(/\/$/, '');
const MIN_Q = 5; // chapters with fewer questions (and no seo-content) are noindex + left out of the sitemap (thin pages hurt)
const PUB = path.join(__dirname, 'public'), Q = require('./questions-public');
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const hasAs = s => /[\u0980-\u09FF]/.test(s);
const board = c => c.class === 10 ? 'SEBA HSLC Class 10' : 'Class ' + c.class;
const subSlug = c => slug(c.subject) + (c.medium === 'Assamese' ? '-assamese-medium' : '');
const chSlug = ch => { const m = /\(([^)]*[A-Za-z][^)]*)\)/.exec(ch.title); return slug(m ? m[1] : ch.title) || 'chapter-' + ch.no; };
const qCount = ch => (ch.sections || []).reduce((n, s) => n + s.questions.length, 0);
const NOTES = (() => { try { return require('./freenotes') } catch (e) { return [] } })();   // free notes (no login): their summary and points also fill the chapter page
const noteOf = (c, ch) => NOTES.find(n => n.course === c.id && n.no === ch.no);
const extra = (c, ch) => {
  let f = null; try { f = JSON.parse(fs.readFileSync(path.join(__dirname, 'seo-content', c.id + '-' + ch.no + '.json'), 'utf8')) } catch (e) {}
  const n = noteOf(c, ch);
  if (!f && !n) return null;
  return Object.assign({}, n ? { summary: n.summary, keyPoints: n.points, as: n.as } : {}, f || {});   // a seo-content file wins over the free note
};
const css = 'body{font:16px/1.6 system-ui,sans-serif;max-width:720px;margin:0 auto;padding:16px;color:#111;background:#fff}a{color:#0b57d0}h1{font-size:1.5rem;line-height:1.3}h2{font-size:1.15rem;margin-top:1.6em}li{margin:.5em 0}nav,footer{font-size:.9rem;color:#444}.cta{display:inline-block;background:#111;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;margin:12px 0}table{border-collapse:collapse}td,th{border:1px solid #999;padding:4px 8px}@media(prefers-color-scheme:dark){body{background:#111;color:#eee}a{color:#8ab4f8}.cta{background:#eee;color:#111}nav,footer{color:#bbb}}';
function page({ title, desc, url, body, ld, robots }) {
  return '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + esc(title) + '</title><meta name="description" content="' + esc(desc) + '"><link rel="canonical" href="' + SITE + url + '"><meta name="robots" content="' + (robots || 'index, follow') + '"><meta name="theme-color" content="#111111"><meta property="og:type" content="website"><meta property="og:site_name" content="Orbit Tutorial"><meta property="og:title" content="' + esc(title) + '"><meta property="og:description" content="' + esc(desc) + '"><meta property="og:url" content="' + SITE + url + '"><meta property="og:image" content="' + SITE + '/icon-512.png"><meta name="twitter:card" content="summary"><link rel="icon" type="image/png" href="/icon-192.png"><script type="application/ld+json">' + JSON.stringify(ld) + '</script><style>' + css + '</style></head><body>' + body + '<footer><p><a href="/">Orbit Tutorial</a> · <a href="/learn/">All classes and subjects</a> · <a href="/seba-class-10-notes/">SEBA Class 10 notes</a> · <a href="/notes/">Free notes</a> · Free AI study helper for school students in Assam</p></footer></body></html>';
}
function crumbs(items) { return { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items.map((x, i) => ({ '@type': 'ListItem', position: i + 1, name: x[0], item: SITE + x[1] })) } }
function qHtml(q, ans) {
  const L = hasAs(q.text) ? ' lang="as"' : '';
  let h = '<li id="' + esc(q.id) + '"><p' + L + '>' + (q.label ? esc(q.label) + ' ' : '') + esc(q.text) + '</p>';
  if (q.parts && q.parts.length) h += '<ul>' + q.parts.map(p => '<li>' + esc(p) + '</li>').join('') + '</ul>';
  if (q.options && q.options.length) h += '<ul>' + q.options.map(p => '<li>' + esc(p) + '</li>').join('') + '</ul>';
  if (q.table) h += '<table><tr>' + q.table.head.map(x => '<th>' + esc(x) + '</th>').join('') + '</tr>' + q.table.rows.map(r => '<tr>' + r.map(x => '<td>' + esc(x) + '</td>').join('') + '</tr>').join('') + '</table>';
  if (ans) h += '<p><strong>Answer:</strong> ' + esc(ans) + '</p>';
  return h + '</li>';
}
const out = (url, html) => { const d = path.join(PUB, url.replace(/^\//, '')); fs.mkdirSync(d, { recursive: true }); fs.writeFileSync(path.join(d, 'index.html'), html) };
const sm = [{ loc: '/', pr: '1.0' }, { loc: '/learn/', pr: '0.9' }, { loc: '/notes/', pr: '0.7' }], hub = [];
let made = 0, thin = 0;
const noteUrl = {}, c10 = [];   // note id -> chapter page url (when that page exists); class 10 course pages for the SEBA hub
for (const c of Q.courses) {
  const chs = c.chapters.filter(ch => qCount(ch) > 0);
  if (!chs.length) continue;
  const cBase = '/class-' + c.class + '/' + subSlug(c) + '/', cName = board(c) + ' ' + c.subject + (c.medium === 'Assamese' ? ' (Assamese medium)' : '');
  const links = [];
  chs.forEach((ch, i) => {
    const ex = extra(c, ch), n = qCount(ch), url = cBase + chSlug(ch) + '/', rich = !!ex || n >= MIN_Q;
    const title = cName + ' Chapter ' + ch.no + ': ' + ch.title + ' – Questions | Orbit';
    const desc = cName + ' Chapter ' + ch.no + ' "' + ch.title + '": all ' + n + ' textbook questions listed chapter-wise, with an AI study helper for step-by-step answers. Free on Orbit Tutorial.';
    const prev = chs[i - 1], next = chs[i + 1];
    let b = '<nav><a href="/">Orbit</a> › <a href="/learn/">Classes</a> › <a href="' + cBase + '">' + esc(cName) + '</a></nav><h1>' + esc(cName) + ' – Chapter ' + ch.no + ': ' + esc(ch.title) + '</h1>';
    b += '<p>' + n + ' textbook questions from this chapter. Open Orbit to get a short, textbook-style answer for any question.</p><a class="cta" href="/">Open Orbit and get answers</a>';
    if (ex && ex.summary) b += '<h2>Chapter summary</h2><p>' + esc(ex.summary) + '</p>';
    if (ex && ex.keyPoints && ex.keyPoints.length) b += '<h2>Key points</h2><ul>' + ex.keyPoints.map(k => '<li>' + esc(k) + '</li>').join('') + '</ul>';
    if (ex && ex.as && ex.as.summary) b += '<div lang="as"><h2>অসমীয়াত সাৰাংশ আৰু মূল কথা</h2><p>' + esc(ex.as.summary) + '</p><ul>' + ex.as.points.map(k => '<li>' + esc(k) + '</li>').join('') + '</ul></div>';
    for (const s of ch.sections) b += '<h2>' + esc(s.title) + '</h2><ol>' + s.questions.map(q => qHtml(q, ex && ex.answers && ex.answers[q.id])).join('') + '</ol>';
    b += '<p>' + (prev ? '← <a href="' + cBase + chSlug(prev) + '/">' + esc('Chapter ' + prev.no) + '</a> ' : '') + (next ? '<a href="' + cBase + chSlug(next) + '/">' + esc('Chapter ' + next.no) + '</a> →' : '') + '</p>';
    out(url, page({ title, desc, url, body: b, robots: rich ? 'index, follow' : 'noindex, follow', ld: crumbs([['Orbit', '/'], [cName, cBase], ['Chapter ' + ch.no + ': ' + ch.title, url]]) }));
    const fn = noteOf(c, ch);
    if (fn && rich) noteUrl[fn.id] = url;
    if (fn && rich) {   // the free-note pages (English + Assamese) share their text with this chapter page: Google should list the chapter page
      for (const lang of ['en', 'as']) {
        try {
          const file = fn.id + (lang === 'as' ? '-as' : '') + '.html', f = path.join(PUB, 'notes', file), old = SITE + '/notes/' + file;
          const link = lang === 'as' ? '<p><a href="' + url + '">এই অধ্যায়ৰ সকলো পাঠ্যপুথিৰ প্ৰশ্ন</a></p>' : '<p><a href="' + url + '">All textbook questions of this chapter</a></p>';
          fs.writeFileSync(f, fs.readFileSync(f, 'utf8').split('<link rel="canonical" href="' + old + '">').join('<link rel="canonical" href="' + SITE + url + '">').split('<meta property="og:url" content="' + old + '">').join('<meta property="og:url" content="' + SITE + url + '">').replace('<!--chapter-link-->', link));
        } catch (e) {}
      }
    }
    links.push('<li><a href="' + url + '">Chapter ' + ch.no + ': ' + esc(ch.title) + '</a> (' + n + ' questions)</li>');
    if (rich) sm.push({ loc: url, pr: '0.8' }); else thin++;
    made++;
  });
  const cUrl = cBase;
  out(cUrl, page({ title: cName + ' – Chapter-wise Questions | Orbit', desc: cName + ': chapter-wise textbook questions with an AI study helper. Free on Orbit Tutorial.', url: cUrl, ld: crumbs([['Orbit', '/'], [cName, cUrl]]), body: '<nav><a href="/">Orbit</a> › <a href="/learn/">Classes</a></nav><h1>' + esc(cName) + '</h1><ul>' + links.join('') + '</ul><a class="cta" href="/">Open Orbit</a>' }));
  sm.push({ loc: cUrl, pr: '0.9' });
  if (c.class === 10) c10.push('<li><a href="' + cUrl + '">' + esc(cName) + '</a></li>');
  hub.push('<li><a href="' + cUrl + '">' + esc(cName) + '</a> (' + chs.length + ' chapters)</li>');
}
// Hub page for the broad queries ("SEBA Class 10 notes"): original intro text + every Class 10 note in both languages + links to the Class 10 course pages.
{
  const n10 = NOTES.filter(n => n.cls === 10), url = '/seba-class-10-notes/';
  const subs = [...new Set(n10.map(n => n.subject))];
  const sections = subs.map(sub => '<h2>' + esc(sub) + '</h2><ul>' + n10.filter(n => n.subject === sub).sort((a, b) => a.no - b.no).map(n =>
    '<li>Chapter ' + n.no + ': ' + esc(n.title) + ' — <a href="' + (noteUrl[n.id] || '/notes/' + n.id + '.html') + '">English</a> · <a lang="as" href="/notes/' + n.id + '-as.html">অসমীয়া (' + esc(n.as.title.split(' (')[0]) + ')</a></li>').join('') + '</ul>').join('');
  if (n10.length) {
    out(url, page({
      title: 'SEBA Class 10 Notes: Science, Maths and Social Science (English and Assamese) | Orbit Tutorial',
      desc: 'Free SEBA HSLC Class 10 chapter notes with a short summary and key points, in English and Assamese. Science, Mathematics and Social Science. No login needed.',
      url, ld: crumbs([['Orbit', '/'], ['SEBA Class 10 notes', url]]),
      body: '<nav><a href="/">Orbit</a> › <a href="/learn/">Classes</a></nav><h1>SEBA Class 10 notes (HSLC)</h1>' +
        '<p>Short chapter notes for students of Class 10 in Assam. Every note has a summary and the key points you need to revise, and each one is available in English and in Assamese so you can read it in your own medium. Read the note first, then practise the textbook questions of the same chapter in the Orbit Tutorial app.</p>' +
        sections + (c10.length ? '<h2>Chapter-wise questions</h2><ul>' + c10.join('') + '</ul>' : '') +
        '<p>All notes are free and need no login. For AI answers and whiteboard videos, sign in with Google in the app.</p><a class="cta" href="/">Open Orbit</a>'
    }));
    sm.push({ loc: url, pr: '0.9' });
  }
}
out('/learn/', page({ title: 'Classes and Subjects – Orbit Tutorial (Assam)', desc: 'All classes and subjects on Orbit Tutorial: chapter-wise textbook questions and a free AI study helper for school students in Assam.', url: '/learn/', ld: crumbs([['Orbit', '/'], ['Classes and subjects', '/learn/']]), body: '<nav><a href="/">Orbit</a></nav><h1>Classes and subjects</h1><ul>' + hub.join('') + '</ul>' }));
const day = new Date().toISOString().slice(0, 10);
fs.writeFileSync(path.join(PUB, 'sitemap.xml'), '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + sm.map(u => '  <url><loc>' + SITE + u.loc + '</loc><lastmod>' + day + '</lastmod><priority>' + u.pr + '</priority></url>').join('\n') + '\n</urlset>\n');
fs.writeFileSync(path.join(PUB, 'robots.txt'), 'User-agent: *\nAllow: /\n\nSitemap: ' + SITE + '/sitemap.xml\n');
console.log('SEO pages: ' + made + ' chapter pages (' + thin + ' noindex as thin), ' + sm.length + ' URLs in sitemap, base ' + SITE);
