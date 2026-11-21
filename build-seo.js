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
  return '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + esc(title) + '</title><meta name="description" content="' + esc(desc) + '"><link rel="canonical" href="' + SITE + url + '"><meta name="robots" content="' + (robots || 'index, follow') + '"><meta name="theme-color" content="#111111"><meta property="og:type" content="website"><meta property="og:site_name" content="Orbit Tutorial"><meta property="og:title" content="' + esc(title) + '"><meta property="og:description" content="' + esc(desc) + '"><meta property="og:url" content="' + SITE + url + '"><meta property="og:image" content="' + SITE + '/icon-512.png"><meta name="twitter:card" content="summary"><link rel="icon" type="image/png" href="/icon-192.png"><script type="application/ld+json">' + JSON.stringify(ld) + '</script><style>' + css + '</style></head><body>' + body + '<footer><p><a href="/">Orbit Tutorial</a> · <a href="/learn/">All classes and subjects</a> · <a href="/seba-class-10-notes/">SEBA Class 10 notes</a> · <a href="/notes/">Free notes</a> · Free AI study helper for school students in Assam</p><p><a href="/about/">About</a> · <a href="/faq/">FAQ</a> · <a href="/privacy/">Privacy</a> · <a href="/terms/">Terms</a> · <a href="/contact/">Contact</a></p></footer></body></html>';
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
// Info pages: About, FAQ, Privacy, Terms, Contact (static, no JS). Linked from the small footer on the home screen and from every generated page.
{
  const UPDATED = '21 November 2026';
  const WA = '919350633795';   // same WhatsApp number the app already uses for "Request a video"; change it here to change the Contact page
  const waLink = 'https://wa.me/' + WA + '?text=' + encodeURIComponent('Orbit Tutorial: ');
  const nav = name => '<nav><a href="/">Orbit</a> › ' + name + '</nav>';
  const cta = '<a class="cta" href="/">Open Orbit</a>';
  const info = (url, title, desc, name, body, pr, extraLd) => {
    out(url, page({ title, desc, url, ld: [crumbs([['Orbit', '/'], [name, url]])].concat(extraLd || []), body: nav(name) + body }));
    sm.push({ loc: url, pr });
  };

  info('/about/', 'About Orbit Tutorial – Free Study Helper for School Students in Assam',
    'Orbit Tutorial is a free study helper for school students in Assam: chapter-wise textbook questions, free notes in English and Assamese, and an AI study helper.', 'About',
    '<h1>About Orbit Tutorial</h1>' +
    '<p>Orbit Tutorial is a free study helper for school students in Assam. It lists the textbook questions chapter by chapter and gives short, textbook-style answers with an AI study helper, so a student can understand a lesson and revise it at home.</p>' +
    '<h2>What you can do on Orbit</h2><ul>' +
    '<li>Read free chapter notes (a short summary and key points) in English and Assamese. No login is needed. <a href="/notes/">Free notes</a></li>' +
    '<li>Practise chapter-wise textbook questions for several classes and subjects. <a href="/learn/">All classes and subjects</a></li>' +
    '<li>Get an AI answer for a question, translate it, and listen to it.</li>' +
    '<li>Use Bolo, a speaking practice for small children (letters, numbers, tables and poems), in Kid mode.</li>' +
    '<li>Let a parent or mentor set a daily study time and get an alert if the child has not started.</li>' +
    '<li>Let a teacher create a class and give homework.</li></ul>' +
    '<h2>Free to use</h2><p>Orbit is free to use. Free notes need no login. AI answers and saving your progress need a Google sign-in.</p>' +
    '<h2>About the AI answers</h2><p>AI answers can sometimes be wrong or incomplete. Always check an important answer with your textbook and your teacher. The chapter notes on Orbit are written in our own words as a revision aid, not as a copy of the textbook.</p>' + cta +
    '<p>Questions or feedback? See <a href="/faq/">FAQ</a> or <a href="/contact/">Contact</a>.</p>', '0.5');

  const FAQ = [
    ['What is Orbit Tutorial and who is it for?', 'Orbit Tutorial is a free study helper for school students in Assam. It has chapter-wise textbook questions, free notes in English and Assamese, and an AI study helper that gives short answers. Parents, teachers and mentors can also use it to follow a child’s study.'],
    ['Is Orbit free?', 'Yes. Orbit is free to use, and there is no payment or subscription today.'],
    ['Which classes and subjects are available?', 'Orbit has several classes and subjects, such as Science, Mathematics, English, Social Science and Assamese, and more chapters are added over time. The full list is on the All classes and subjects page (/learn/). Free SEBA Class 10 notes are on the SEBA Class 10 notes page (/seba-class-10-notes/).'],
    ['Why do I need to log in, and does it have to be Google?', 'Free notes need no login. To get AI answers, save answers, and keep your progress, you sign in with your Google account. Google is the only sign-in option for now.'],
    ['Who writes the notes, and are the AI answers always correct?', 'The chapter notes are written in our own words as a revision aid. They are not a copy of the textbook, so please keep reading your textbook. AI answers are produced by an AI and can sometimes be wrong or incomplete, so check important answers with your textbook and your teacher.'],
    ['What are Kid mode and Mentor?', 'Kid mode opens only Bolo, a simple speaking practice for small children. On a parent’s phone, “I am parent” connects to the child’s phone with a code, shows the child’s day, and lets the parent set a daily time limit and turn the microphone on or off. “I am mentor” opens Padhai ka time, where a parent or mentor sets a daily study time and gets an alert if the child has not started.'],
    ['How safe is my child’s data?', 'Orbit keeps only what it needs to work: the Google account name and email, saved answers, progress and scores. Kid mode shares only a small summary with the parent, such as the minutes practised and how many answers were right. Orbit does not use the camera. The microphone works only when you allow it. Read the full details on the Privacy page (/privacy/).'],
    ['I found a mistake, or I want a new chapter. What should I do?', 'Please send us a message on the Contact page (/contact/) with the class, subject, chapter and question number. We read every message.']
  ];
  const faqLd = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: FAQ.map(f => ({ '@type': 'Question', name: f[0], acceptedAnswer: { '@type': 'Answer', text: f[1] } })) };
  info('/faq/', 'FAQ – Orbit Tutorial: Free Study Helper for Students in Assam',
    'Answers to common questions about Orbit Tutorial: is it free, which classes and subjects it has, login, AI answers, Kid mode, Mentor and your child’s data.', 'FAQ',
    '<h1>Frequently asked questions</h1>' + FAQ.map(f => '<h2>' + esc(f[0]) + '</h2><p>' + esc(f[1]) + '</p>').join('') +
    '<p>Still have a question? <a href="/contact/">Contact us</a>.</p>' + cta, '0.6', [faqLd]);

  info('/privacy/', 'Privacy Policy – Orbit Tutorial',
    'How Orbit Tutorial handles your data: Google sign-in, saved study data, Kid mode, microphone, analytics, and how to ask for your data to be deleted.', 'Privacy',
    '<h1>Privacy Policy</h1><p>Last updated: ' + UPDATED + '</p>' +
    '<p>Orbit Tutorial is a free study helper for school students. This page explains what Orbit collects, why, and what you can do about it. We keep it short and plain on purpose.</p>' +
    '<h2>What Orbit collects</h2><ul>' +
    '<li><b>Account:</b> when you sign in with Google, Orbit receives your name, email address and profile picture through Google sign-in.</li>' +
    '<li><b>Study data:</b> your chosen course, saved answers and favourites, progress and scores, and class or homework data if you join a class.</li>' +
    '<li><b>Kid mode and study time:</b> a link code between a child’s phone and a parent’s phone, a small daily summary (minutes practised, how many answers were right or need repeating), the limit and microphone setting a parent chooses, and the study-time plan. If a parent turns on alerts, a notification address for that phone is stored.</li>' +
    '<li><b>Microphone:</b> Bolo uses the microphone only when you allow it in your browser. For one exercise (“Saath me bolo”), and only if a parent turns it on, a recording is shared with the parent and deleted after 2 hours.</li>' +
    '<li><b>Questions you ask:</b> the text of a question is sent to an AI service to produce the answer.</li>' +
    '<li><b>Usage analytics:</b> Orbit uses Google Analytics and Microsoft Clarity to see which screens are used and how. Our own analytics events send only ids and numbers (such as a chapter number), never your name, email or the text of your questions. Clarity may record anonymous screen interactions such as taps and scrolling.</li></ul>' +
    '<p>Orbit does not use the camera and does not collect photos.</p>' +
    '<h2>Why we use it</h2><p>To run the app, show your progress, give AI answers, send study-time alerts when a parent asks for them, keep Orbit working, and improve it.</p>' +
    '<h2>Who helps us run Orbit</h2><p>Orbit uses Google (Firebase sign-in, database, hosting, Analytics and the AI service), Render (our server), Backblaze (video files) and Microsoft (Clarity). These services process data for us to run Orbit. We do not sell your data.</p>' +
    '<h2>Sharing inside Orbit</h2><p>A parent who connects with your code can see the child summary described above. A teacher can see homework and scores of the students in their class. Nothing else is shown to other users.</p>' +
    '<h2>Children</h2><p>Kid mode is meant to be set up and watched by a parent. A parent can disconnect at any time from the app (“Sab parent hatao”). A parent can also ask us to delete a child’s data.</p>' +
    '<h2>Your choices</h2><ul><li>Turn the microphone or notifications off any time in your browser or phone settings.</li><li>Sign out from the app.</li><li>Ask us to delete your account data, or to show what we hold, on the <a href="/contact/">Contact</a> page.</li></ul>' +
    '<h2>Changes</h2><p>If this policy changes, we will update the date at the top.</p>' +
    '<p>Questions about privacy? <a href="/contact/">Contact us</a>.</p>', '0.3');

  info('/terms/', 'Terms of Use – Orbit Tutorial',
    'The simple rules for using Orbit Tutorial: free use for learning, AI answers can be wrong, respect other users, and how we may change the service.', 'Terms',
    '<h1>Terms of Use</h1><p>Last updated: ' + UPDATED + '</p>' +
    '<p>By using Orbit Tutorial you agree to these simple terms.</p>' +
    '<h2>Using Orbit</h2><ul><li>Orbit is for learning. Please use it for your own study, or to help a child or student you look after.</li><li>Children should use Orbit with the guidance of a parent or teacher.</li><li>Keep your Google account and any link codes private. You are responsible for what happens on your account.</li></ul>' +
    '<h2>AI answers and notes</h2><p>Answers from the AI and the chapter notes are study aids. They can contain mistakes. Check important answers with your textbook and your teacher. Orbit does not guarantee that an answer is correct or complete.</p>' +
    '<h2>Please do not</h2><ul><li>try to break, overload or misuse Orbit or its AI service;</li><li>copy Orbit’s content in bulk with automated tools;</li><li>use someone else’s account or link code;</li><li>post or share anything harmful or unlawful.</li></ul>' +
    '<h2>Content</h2><p>Textbooks and the questions taken from them belong to their respective owners. Orbit is an independent project and is not run by, or officially connected to, any school board.</p>' +
    '<h2>Free service, and changes</h2><p>Orbit is provided free and “as is”. We may change, pause or stop any part of Orbit, and we may limit use to keep it available for everyone. To the extent the law allows, we are not responsible for loss caused by using Orbit.</p>' +
    '<h2>Privacy</h2><p>How we handle your data is explained on the <a href="/privacy/">Privacy</a> page.</p>' +
    '<p>Questions? <a href="/contact/">Contact us</a>.</p>', '0.3');

  info('/contact/', 'Contact Orbit Tutorial',
    'Contact Orbit Tutorial for questions, feedback, mistakes in a chapter, new chapter requests, or to ask for your data to be deleted.', 'Contact',
    '<h1>Contact Orbit</h1><p>Write to us for a question, feedback, a mistake you found, a new chapter you want, or to ask for your data to be deleted.</p>' +
    '<p><a class="cta" href="' + waLink + '" rel="noopener">Message us on WhatsApp</a></p>' +
    '<h2>What to include</h2><ul><li>The class, subject and chapter, and the question number if it is about a question.</li><li>A short description of the problem or request.</li></ul>' +
    '<p>Please do not send passwords or one-time codes.</p>' +
    '<p>You can also read the <a href="/faq/">FAQ</a> and the <a href="/privacy/">Privacy</a> page.</p>', '0.4');
}
out('/learn/', page({ title: 'Classes and Subjects – Orbit Tutorial (Assam)', desc: 'All classes and subjects on Orbit Tutorial: chapter-wise textbook questions and a free AI study helper for school students in Assam.', url: '/learn/', ld: crumbs([['Orbit', '/'], ['Classes and subjects', '/learn/']]), body: '<nav><a href="/">Orbit</a></nav><h1>Classes and subjects</h1><ul>' + hub.join('') + '</ul>' }));
const day = new Date().toISOString().slice(0, 10);
fs.writeFileSync(path.join(PUB, 'sitemap.xml'), '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + sm.map(u => '  <url><loc>' + SITE + u.loc + '</loc><lastmod>' + day + '</lastmod><priority>' + u.pr + '</priority></url>').join('\n') + '\n</urlset>\n');
fs.writeFileSync(path.join(PUB, 'robots.txt'), 'User-agent: *\nAllow: /\n\nSitemap: ' + SITE + '/sitemap.xml\n');
console.log('SEO pages: ' + made + ' chapter pages (' + thin + ' noindex as thin), ' + sm.length + ' URLs in sitemap, base ' + SITE);
