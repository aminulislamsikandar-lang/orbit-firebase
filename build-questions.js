// Writes public/questions.json and public/videos.json so Firebase Hosting can serve them without the AI server.
// questions.json has no hidden `context` (poem text, notes for the AI); videos.json has no bucket file paths (keys).
const fs = require('fs');
const path = require('path');
const w = (f, d) => fs.writeFileSync(path.join(__dirname, 'public', f), JSON.stringify(d));
w('questions.json', require('./questions-public'));
w('videos.json', require('./videos').map(({ id, course, chapter, title, free }) => ({ id, course: course || 'c10-science', chapter, title, free: !!free })));
w('publicvideos.json', require('./publicvideos').map(({ id, cls, title, desc, file }) => ({ id, cls, title, desc, file })));

// Free notes (no login): JSON for the app + static pages for Google, in English and Assamese (/notes/<id>.html and /notes/<id>-as.html).
// sitemap.xml and robots.txt are written by build-seo.js, which also points a note page to its chapter page (canonical) when one exists.
const NOTES = require('./freenotes');
const SITE = (process.env.SITE_URL || 'https://orbittutorial.web.app').replace(/\/$/, '');   // same setting as build-seo.js
const x = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const cut = t => t.length > 155 ? t.slice(0, 155).replace(/\s+\S*$/, '') + '…' : t;
const SUB_AS = { 'Mathematics': 'গণিত', 'Science': 'বিজ্ঞান', 'Social Science': 'সমাজ বিজ্ঞান', 'Social Science (History)': 'সমাজ বিজ্ঞান (ইতিহাস)', 'English Grammar': 'ইংৰাজী ব্যাকৰণ' };
w('free-notes.json', NOTES);
const dir = path.join(__dirname, 'public', 'notes');
fs.rmSync(dir, { recursive: true, force: true });
fs.mkdirSync(dir, { recursive: true });
const CSS = 'body{margin:0;background:#f4f2ec;color:#111;font:16px/1.6 system-ui,sans-serif}main{max-width:720px;margin:0 auto;padding:20px}h1{font-size:26px;line-height:1.25}li{margin:8px 0}a{color:inherit}.mut{color:#6b6b6b}a.btn{display:inline-block;background:#111;color:#f4f2ec;border-radius:12px;padding:12px 18px;text-decoration:none;font-weight:600;margin:10px 8px 0 0}@media(prefers-color-scheme:dark){body{background:#111;color:#f2f2f2}.mut{color:#9a9a9a}a.btn{background:#f2f2f2;color:#111}}';
for (const n of NOTES) {
  for (const lang of ['en', 'as']) {
    const as = lang === 'as', d = as ? n.as : n, file = n.id + (as ? '-as' : '') + '.html', url = SITE + '/notes/' + file;
    const sub = as ? (SUB_AS[n.subject] || n.subject) : n.subject;
    const title = as ? `শ্ৰেণী ${n.cls} ${sub}: ${d.title} – অধ্যায় ${n.no} নোট আৰু মূল কথা | Orbit Tutorial` : `Class ${n.cls} ${n.subject} Chapter ${n.no} ${d.title}: Notes and Key Points | Orbit Tutorial`;
    const desc = cut(d.summary);
    const share = `https://wa.me/?text=${encodeURIComponent((as ? d.title : n.title) + ' (Class ' + n.cls + ' ' + n.subject + ') notes: ' + url)}`;
    const medium = n.medium === 'Assamese' ? (as ? 'অসমীয়া মাধ্যম' : 'Assamese medium') : (as ? 'ইংৰাজী মাধ্যম' : 'English medium');
    fs.writeFileSync(path.join(dir, file), `<!doctype html>
<html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${x(title)}</title>
<meta name="description" content="${x(desc)}">
<link rel="canonical" href="${url}">
<link rel="alternate" hreflang="en" href="${SITE}/notes/${n.id}.html"><link rel="alternate" hreflang="as" href="${SITE}/notes/${n.id}-as.html">
<meta property="og:type" content="article"><meta property="og:title" content="${x(title)}"><meta property="og:description" content="${x(desc)}"><meta property="og:image" content="${SITE}/icon-512.png"><meta property="og:url" content="${url}">
<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'LearningResource', name: d.title, description: d.summary, inLanguage: lang, educationalLevel: 'Class ' + n.cls, about: n.subject, isAccessibleForFree: true, provider: { '@type': 'Organization', name: 'Orbit Tutorial' } }).replace(/</g, '\\u003c')}</script>
<style>${CSS}</style>
</head><body><main>
<p class="mut">${as ? 'শ্ৰেণী' : 'Class'} ${n.cls} · ${x(sub)} · ${medium}</p>
<h1>${as ? 'অধ্যায়' : 'Chapter'} ${n.no}: ${x(d.title)}</h1>
<p>${x(d.summary)}</p>
<h2>${as ? 'মূল কথা' : 'Key points'}</h2>
<ul>${d.points.map(p => `<li>${x(p)}</li>`).join('\n')}</ul>
<!--chapter-link-->
<p class="mut">${as ? 'এই অধ্যায়ৰ AI উত্তৰ, ব্লেকব\'ৰ্ড ভিডিঅ\' আৰু অনুশীলন Orbit Tutorial এপত পোৱা যাব (বিনামূলীয়া Google লগইন)।' : 'AI answers, whiteboard videos and practice for this chapter are inside the Orbit Tutorial app (free Google login).'}</p>
<a class="btn" href="/">${as ? 'Orbit Tutorial খোলক' : 'Open Orbit Tutorial'}</a><a class="btn" href="/notes/">${as ? 'আটাইবোৰ বিনামূলীয়া নোট' : 'All free notes'}</a><a class="btn" href="${share}">${as ? 'WhatsApp ত শ্বেয়াৰ কৰক' : 'Share on WhatsApp'}</a><a class="btn" href="/notes/${n.id}${as ? '' : '-as'}.html">${as ? 'English' : 'অসমীয়া'}</a>
</main></body></html>`);
  }
}
const ititle = 'Free Class 6, 7 and 10 Notes and Key Points (English and Assamese) | Orbit Tutorial';
fs.writeFileSync(path.join(dir, 'index.html'), `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${x(ititle)}</title>
<meta name="description" content="Free chapter notes and key points in English and Assamese for school students in Assam: Maths, Science, Social Science and English Grammar. No login needed.">
<link rel="canonical" href="${SITE}/notes/">
<style>${CSS}</style>
</head><body><main>
<h1>Free chapter notes · বিনামূলীয়া নোট</h1>
<p class="mut">No login needed. English and Assamese medium. For AI answers and videos, open the Orbit Tutorial app.</p>
<ul>${NOTES.map(n => `<li>Class ${n.cls} ${x(n.subject)}: Chapter ${n.no} ${x(n.title)} — <a href="/notes/${n.id}.html">English</a> · <a href="/notes/${n.id}-as.html" lang="as">অসমীয়া (${x(n.as.title.split(' (')[0])})</a></li>`).join('\n')}</ul>
<a class="btn" href="/">Open Orbit Tutorial</a>
</main></body></html>`);
console.log('public/questions.json, public/videos.json, public/publicvideos.json, public/free-notes.json, public/notes/*.html (English + Assamese) written');
