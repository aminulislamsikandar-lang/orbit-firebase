// Sandesh (mentor message to a child): the plain rules (public/sandesh-core.js), the Firestore rules text, and that the app loads the scripts.
// Run: node tests/sandesh-core.test.js
const fs = require('fs'), path = require('path');
const C = require('../public/sandesh-core.js');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8').replace(/^\uFEFF/, '');
let pass = 0, fail = 0;
const t = (n, ok, extra) => { if (ok) pass++; else { fail++; console.log('FAIL  ' + n + (extra ? '  ' + extra : '')); } };
const NOW = 1_800_000_000_000, AUD = 'data:audio/webm;codecs=opus;base64,' + 'A'.repeat(200);

// build: what the mentor's phone writes
t('build: text only', (m => m && m.ins === 'Kaam karo' && m.secs === 300 && m.from === 'u1' && m.fromName === 'Rina' && !('q' in m) && !('aud' in m) && m.at === NOW)(C.build({ from: 'u1', fromName: 'Rina', ins: '  Kaam karo ' }, NOW)));
t('build: instruction + question + voice + chosen time', (m => m && m.ins === 'A' && m.q === 'Q?' && m.aud === AUD && m.secs === 600)(C.build({ from: 'u', ins: 'A', q: 'Q?', aud: AUD, secs: 600 }, NOW)));
t('build: only a question is fine', !!C.build({ from: 'u', q: 'x' }, NOW));
t('build: only a voice is fine', !!C.build({ from: 'u', aud: AUD }, NOW));
t('build: nothing to send = null', C.build({ from: 'u', ins: '   ', q: '' }, NOW) === null && C.build(null, NOW) === null);
t('build: a voice that is not an audio data URL is refused', C.build({ from: 'u', ins: 'x', aud: 'http://evil/x.mp3' }, NOW) === null && C.build({ from: 'u', ins: 'x', aud: 'data:text/html;base64,AAAA' }, NOW) === null);
t('build: too-big voice is refused', C.build({ from: 'u', aud: 'data:audio/webm;base64,' + 'A'.repeat(C.MAX_DATA) }, NOW) === null);
t('build: long text is cut to the limits', (m => m.ins.length === C.MAX_INS && m.q.length === C.MAX_Q)(C.build({ from: 'u', ins: 'a'.repeat(5000), q: 'b'.repeat(5000) }, NOW)));
t('build: a time that is not on the list becomes 5 minutes', C.build({ from: 'u', ins: 'x', secs: 7 }, NOW).secs === 300 && C.build({ from: 'u', ins: 'x', secs: 1800 }, NOW).secs === 1800);
t('build: name defaults to Mentor and is cut at 40', C.build({ from: 'u', ins: 'x' }, NOW).fromName === 'Mentor' && C.build({ from: 'u', ins: 'x', fromName: 'N'.repeat(90) }, NOW).fromName.length === 40);
t('build: control characters are removed, new lines kept', C.build({ from: 'u', ins: 'a\u0000b\nc' }, NOW).ins === 'ab\nc');

// ids and data
const id = C.newId(NOW, () => 0.5);
t('newId matches the rule pattern', /^[0-9]{13}-[a-z0-9]{6}$/.test(id) && C.okId(id) && !C.okId('x') && !C.okId(''));
t('okData: audio and photo kinds', C.okData(AUD, 'audio') && !C.okData(AUD, 'photo') && C.okData('data:image/jpeg;base64,' + '/9j/'.repeat(10), 'photo') && !C.okData('data:image/png;base64,' + 'A'.repeat(50), 'photo') && !C.okData(null, 'audio'));
t('cleanMime', C.cleanMime('audio/webm;codecs=opus') === 'audio/webm' && C.cleanMime('video/mp4') === '');

// the countdown
const M = (o) => Object.assign({ id: C.newId(NOW), secs: 300, at: NOW }, o);
t('left: not seen yet = full time', C.left(M(), NOW + 1000) === 300);
t('left: counts down from shownAt', C.left(M({ shownAt: NOW }), NOW + 60000) === 240 && C.left(M({ shownAt: NOW }), NOW + 299500) === 1);
t('left: over = null', C.left(M({ shownAt: NOW }), NOW + 300000) === null && C.left(M({ shownAt: NOW }), NOW + 900000) === null);
t('left: closed (doneAt) = null even with time left', C.left(M({ shownAt: NOW, doneAt: NOW + 5 }), NOW + 10000) === null);
t('left: not seen within 2 hours = missed', C.left(M(), NOW + C.VALID_MS + 1000) === null && C.left(M(), NOW + C.VALID_MS - 1000) === 300);
t('left: a reload keeps the countdown (shownAt, not "now")', C.left(M({ shownAt: NOW }), NOW + 100000) === 200);
t('left: bad input', C.left(null) === null && C.left('x') === null);
t('pick: the oldest running one, skipping finished and missed', (() => {
  const a = M({ at: NOW - 400000, shownAt: NOW - 350000 }), b = M({ id: C.newId(NOW + 1), at: NOW + 1 }), c2 = M({ id: C.newId(NOW + 2), at: NOW + 2 }), gone = M({ id: C.newId(NOW - 9e6), at: NOW - 9e6 });
  const p = C.pick([c2, b, a, gone], NOW + 10); return p && p.id === b.id;
})());
t('pick: nothing to show = null', C.pick([], NOW) === null && C.pick(null, NOW) === null);
t('old: the child\'s phone deletes after 48 hours', C.old({ at: NOW - C.KEEP_MS - 1 }, NOW) && !C.old({ at: NOW - 1000 }, NOW));
t('mmss / secsTxt', C.mmss(300) === '5:00' && C.mmss(65) === '1:05' && C.mmss(-3) === '0:00' && C.secsTxt(60) === '1 min' && C.secsTxt(1800) === '30 min');
t('stateOf', C.stateOf(M({ shownAt: NOW }), NOW).k === 'seen' && C.stateOf(M(), NOW + 1000).k === 'wait' && C.stateOf(M(), NOW + C.VALID_MS + 5000).k === 'missed');

// firestore.rules text: who can do what
const R = read('firestore.rules'), blk = R.slice(R.indexOf('match /msgs/{mid}'), R.indexOf('// Online / Offline: the child'));
t('rules: only an approved mentor creates, with its own uid and fixed keys', /allow create: if mentorOk\(code\)/.test(blk) && /hasOnly\(\['from', 'fromName', 'ins', 'q', 'aud', 'secs', 'at'\]\)/.test(blk) && /data\.from == request\.auth\.uid/.test(blk));
t('rules: the time can only be one of the six choices', /secs in \[60, 120, 300, 600, 900, 1800\]/.test(blk));
t('rules: sizes match the client (600 / 1200 / 380000)', /ins\.size\(\) <= 600/.test(blk) && /q\.size\(\) <= 1200/.test(blk) && /aud\.size\(\) <= 380000/.test(blk) && C.MAX_INS === 600 && C.MAX_Q === 1200 && C.MAX_DATA === 380000);
t('rules: the voice must be an audio data URL', /aud\.startsWith\('data:audio\/'\)/.test(blk));
t('rules: a message has some content (text, question or voice)', /'ins' in request\.resource\.data \|\| 'q' in request\.resource\.data \|\| 'aud' in request\.resource\.data/.test(blk));
t('rules: the message time must be near the server time', /at <= request\.time\.toMillis\(\) \+ 60000/.test(blk) && /at >= request\.time\.toMillis\(\) - 600000/.test(blk));
t('rules: the child sets only shownAt / doneAt, once', /affectedKeys\(\)\.hasOnly\(\['shownAt', 'doneAt'\]\)/.test(blk) && /!\('shownAt' in resource\.data\)/.test(blk) && /!\('doneAt' in resource\.data\)/.test(blk));
t('rules: a mentor reads / deletes only his own messages; the child reads and deletes all', /allow get, list: if kidOwner\(code\) \|\| \(mentorOk\(code\) && resource\.data\.from == request\.auth\.uid\)/.test(blk) && /allow delete: if kidOwner\(code\) \|\| \(mentorOk\(code\) && resource\.data\.from == request\.auth\.uid\)/.test(blk));
t('rules: replies are written only by the child, read by the sending mentor', /match \/reps\/\{rid\}/.test(blk) && /allow create: if kidOwner\(code\)\s*&& exists\(/.test(blk) && /\.data\.from == request\.auth\.uid/.test(blk.slice(blk.indexOf('match /reps'))));
t('rules: reply kinds are photo (jpeg) or voice (audio)', /kind in \['photo', 'voice'\]/.test(blk) && /startsWith\('data:image\/jpeg;base64,'\)/.test(blk) && /startsWith\('data:audio\/'\)/.test(blk));
t('rules: nobody can write a message as the child, the child cannot create messages', !/allow create: if kidOwner\(code\)\s*\n\s*&& mid/.test(blk));
t('rules: a Not Kid link carries only nk = true', /hasOnly\(\['code', 'kidUid', 'name', 'createdAt', 'nk'\]\)/.test(R) && /nk == true/.test(R));

// the app loads and caches the scripts
const html = read('public/index.html'), sw = read('public/sw.js');
t('index.html loads sandesh-core.js before sandesh.js, after kidlink.js', html.indexOf('/kidlink.js') < html.indexOf('/sandesh-core.js') && html.indexOf('/sandesh-core.js') < html.indexOf('/sandesh.js'));
t('service worker caches both scripts', sw.includes("'/sandesh-core.js'") && sw.includes("'/sandesh.js'"));
t('the Mentor page is in the sidebar and in the view switch', html.includes("item('mentor','mentor','Mentor'") && html.includes("VIEW==='mentor'"));
t('index.html tells SANDESH who logged in', html.includes('window.SANDESH.setUser(u)'));
t('cloud.js has the Sandesh calls and removes messages with the link', ['msgSend', 'msgsMine', 'msgWatch', 'msgMark', 'msgDel', 'repPut', 'reps('].every(k => read('public/cloud.js').includes(k)) && /'msgs'\)\); for \(const m of ms\.docs\)/.test(read('public/cloud.js')));
console.log(pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
