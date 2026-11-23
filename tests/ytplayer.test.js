// public/ytplayer.js: the optional in-app YouTube player (admin attaches a link to a question; students see it in the app).
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8').replace(/^\uFEFF/, '');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL ' + m); } };

const Y = require('../public/ytplayer.js');
const ID = 'dQw4w9WgXcQ';
const good = [
  ID, ' ' + ID + ' ',
  'https://www.youtube.com/watch?v=' + ID, 'https://youtube.com/watch?v=' + ID + '&t=42s&list=PL123',
  'https://m.youtube.com/watch?v=' + ID, 'youtube.com/watch?v=' + ID, 'https://music.youtube.com/watch?v=' + ID,
  'https://youtu.be/' + ID, 'https://youtu.be/' + ID + '?si=abc',
  'https://www.youtube.com/embed/' + ID, 'https://www.youtube-nocookie.com/embed/' + ID,
  'https://www.youtube.com/shorts/' + ID, 'https://www.youtube.com/live/' + ID
];
good.forEach(x => ok(Y.parse(x) === ID, 'parse should accept: ' + x));
const bad = [
  '', '   ', null, undefined, 'hello', 'dQw4w9WgXc', 'dQw4w9WgXcQQ',
  'https://www.youtube.com/results?search_query=' + ID, 'https://www.youtube.com/watch', 'https://www.youtube.com/watch?v=short',
  'https://evil.com/watch?v=' + ID, 'https://youtube.com.evil.com/watch?v=' + ID, 'https://youtu.be/', 'javascript:alert(1)',
  'https://www.youtube.com/@channel'
];
bad.forEach(x => ok(Y.parse(x) === '', 'parse should reject: ' + String(x)));
ok(Y.embedUrl(ID).startsWith('https://www.youtube-nocookie.com/embed/' + ID), 'embed url must use youtube-nocookie');
ok(!Y.has('c1-p6-1') && typeof Y.open === 'function' && typeof Y.edit === 'function', 'API shape');
ok(Y.open('c1-p6-1') === false, 'open without a saved link does nothing');

// wiring
const html = read('public/index.html'), rules = read('firestore.rules'), cloud = read('public/cloud.js'), sw = read('public/sw.js'), fb = read('firebase.json');
ok(html.includes('<script src="/ytplayer.js"></script>'), 'index.html must load ytplayer.js');
ok(html.includes("act==='ytv'") && html.includes("act==='ytadd'"), 'index.html must handle ytv and ytadd');
ok((html.match(/\$\{ytIcon\(q\)\}/g) || []).length === 2, 'both video icons must use ytIcon(q)');
ok(html.includes('youtube.com/results?search_query='), 'old YouTube search must stay as the fallback');
ok(/match \/ytLinks\/\{id\}/.test(rules) && /ytLinks[\s\S]{0,900}isAdmin\(\)/.test(rules), 'firestore.rules must have an admin-write ytLinks rule');
ok(/ytLinks\/\{id\}\s*\{\s*allow read: if request\.auth != null;/.test(rules), 'ytLinks read must need login');
ok(cloud.includes("'ytLinks'") && cloud.includes('window.onCloudYt'), 'cloud.js must load and expose ytLinks');
ok(sw.includes("'/ytplayer.js'"), 'service worker must cache ytplayer.js');
const csp = JSON.parse(fb).hosting.headers.flatMap(h => h.headers).find(h => /^Content-Security-Policy/.test(h.key));
ok(!!csp && /frame-src[^;]*https:\/\/www\.youtube-nocookie\.com/.test(csp.value), 'CSP frame-src must allow youtube-nocookie.com');
console.log(pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
