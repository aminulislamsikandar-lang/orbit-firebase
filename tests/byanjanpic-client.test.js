// public/byanjanpic-core.js + public/byanjanpic.js ("ছবিৰে সাথে বলো", Saath me bolo with pictures) with a fake microphone, a fake teacher recording and fake timing:
// the 41 letters, the recording and the timings are those of Saath me bolo, one picture and one word under the big letter (31 letters have one, 10 do not yet),
// the mic is on from before the first letter to after the last, a silent letter is a red alert, the recording goes to the parent once with the right report, and practice / "Rok do" / a refused mic work. No browser needed.
const fs = require('fs'), path = require('path');
let pass = 0, fail = 0;
const t = (name, ok, extra) => { if (ok) pass++; else { fail++; console.log('FAIL  ' + name + (extra ? '  ' + extra : '')); } };
const sleep = ms => new Promise(r => setTimeout(r, ms));
let AMP = 0, stopped = 0, started = 0, denied = false, au = null;
class FakeRec { constructor() { this.state = 'inactive'; this.mimeType = 'audio/webm;codecs=opus'; } start() { this.state = 'recording'; started++; this.ondataavailable({ data: new Blob([Buffer.alloc(600, 1)]) }); } stop() { this.state = 'inactive'; setTimeout(() => this.onstop(), 5); } }
const stream = { getTracks: () => [{ stop: () => { stopped++; } }] };
const dom = { sty: false };
global.window = global;
global.document = { addEventListener() {}, getElementById: id => (id === 'bpSty' && dom.sty ? {} : null), createElement: () => ({}), head: { appendChild() { dom.sty = true; } }, querySelectorAll: () => [] };
Object.defineProperty(global, 'navigator', { configurable: true, value: { mediaDevices: { getUserMedia: async () => { if (denied) throw new Error('no'); return stream; } } } });
global.MediaRecorder = FakeRec;
global.AudioContext = class { createAnalyser() { return { fftSize: 1024, getFloatTimeDomainData: b => b.fill(AMP) }; } createMediaStreamSource() { return { connect() {} }; } close() {} };
global.Audio = class { constructor(src) { this.src = src; this.currentTime = 0; au = this; } async play() { setTimeout(() => this.onplaying && this.onplaying(), 0); } pause() {} };
global.FileReader = class { readAsDataURL(b) { b.arrayBuffer().then(ab => { this.result = 'data:audio/webm;base64,' + Buffer.from(ab).toString('base64'); this.onload(); }); } };
global.BOLOREC_CORE = require('../public/bolorec-core.js'); global.SAATH_CORE = require('../public/saath-core.js'); global.BYANJANPIC_CORE = require('../public/byanjanpic-core.js');
require('../public/bolorec.js'); require('../public/byanjanpic.js');
const SA = window.BYANJANPIC, K = window.BYANJANPIC_CORE, S0 = window.SAATH_CORE;
const idx = ch => K.LETTERS.indexOf(ch);

(async () => {
  // ---- data: the same letters, recording and timings as Saath me bolo, plus words and pictures ----
  t('41 letters, 41 timings, 41 word slots; recording, timings, rows and loudness steps are exactly those of Saath me bolo', K.LETTERS.length === 41 && K.WORDS.length === 41 && K.CUES.length === 41 && K.SRC === S0.SRC && JSON.stringify(K.CUES) === JSON.stringify(S0.CUES) && JSON.stringify(K.rows()) === JSON.stringify(S0.rows()) && JSON.stringify(K.SENS) === JSON.stringify(S0.SENS) && K.win(5)[0] === S0.win(5)[0]);
  t('31 letters have a word and a picture file, 10 (ট ঠ ড ঢ ণ ত থ দ ধ ন) have neither yet', K.WORDS.filter(Boolean).length === 31 && 'টঠডঢণতথদধন'.split('').every(ch => !K.has(idx(ch)) && K.pic(idx(ch)) === '' && K.word(idx(ch)) === ''));
  const dir = path.join(__dirname, '..', 'public', 'byanjan-pic');
  t('every picture has a file bp-NN.webp (NN = letter number), a real webp, under 100 KB, and no file is left without a word', K.WORDS.every((w, i) => !w || fs.existsSync(path.join(dir, 'bp-' + String(i + 1).padStart(2, '0') + '.webp'))) && fs.readdirSync(dir).every(f => /^bp-\d\d\.webp$/.test(f) && K.has(parseInt(f.slice(3, 5), 10) - 1) && fs.readFileSync(path.join(dir, f)).slice(8, 12).toString() === 'WEBP' && fs.statSync(path.join(dir, f)).size < 100 * 1024));
  t('picture url is /byanjan-pic/bp-NN.webp?v=1; the first word of the AJB book for each letter', K.pic(0) === '/byanjan-pic/bp-01.webp?v=1' && K.pic(40) === '/byanjan-pic/bp-41.webp?v=1' && [['ক', 'কল'], ['খ', 'খৰম'], ['গ', 'গছ'], ['ঘ', 'ঘৰ'], ['ঙ', 'নাঙল'], ['চ', 'চিলা'], ['ছ', 'ছাতি'], ['জ', 'জাপি'], ['ঝ', 'ঝাওবন'], ['ঞ', 'জিঞা'], ['প', 'পখিলা'], ['ফ', 'ফেঁচা'], ['ব', 'বল'], ['ভ', 'ভালুক'], ['ম', 'মটৰ গাড়ী'], ['য', 'যাঠি'], ['ৰ', 'ৰজা'], ['ল', 'ল\'ৰা'], ['ৱ', 'দোৱাত'], ['শ', 'শিয়াল'], ['ষ', 'ষাঁড়গৰু'], ['স', 'সিংহ'], ['হ', 'হাঁহ'], ['ক্ষ', 'ক্ষুৰ'], ['ড়', 'গঁড়'], ['ঢ়', 'বাঢ়নী'], ['য়', 'ময়ূৰ'], ['ৎ', 'মৎস্য'], ['ং', 'ফৰিং'], ['ঃ', 'দুঃখী'], ['ঁ', 'কেঁচী']].every(([ch, w]) => K.word(idx(ch)) === w));
  t('the shown word starts with its letter for the 25 letters where that is true (a typing slip would show here)', ['ক', 'খ', 'গ', 'ঘ', 'চ', 'ছ', 'জ', 'ঝ', 'প', 'ফ', 'ব', 'ভ', 'ম', 'য', 'ৰ', 'ল', 'শ', 'ষ', 'স', 'হ', 'ক্ষ'].every(ch => K.word(idx(ch)).startsWith(ch)));

  const h0 = SA.html({ ready: true });
  t('idle screen: Start button (bpauto), 41 letters, the first letter ক with its picture and word কল, no red alert', /data-bl="bpauto"/.test(h0) && !/data-bl="auto"/.test(h0) && (h0.match(/data-i="/g) || []).length === 41 && !/Red alert/.test(h0) && /0 \/ 41/.test(h0) && /bp-01\.webp/.test(h0) && h0.includes('>কল<') && /ছবিৰে সাথে বলো/.test(h0));
  t('not ready: no Start button and the reason is shown', !/data-bl="bpauto"/.test(SA.html({ ready: false, why: 'Mic band hai' })) && /Mic band hai/.test(SA.html({ ready: false, why: 'Mic band hai' })));

  const uploads = [], api = async (p, b) => { uploads.push({ p, b }); return { id: 'x' }; };
  const run = SA.start({ replayMs: 0, code: 'ABCD2345', api, calibMs: 100, tailMs: 50, redraw() {} });
  await sleep(250);
  t('the teacher recording is the Saath me bolo one and plays only after the quiet measuring', au && /bolo-audio\/saath-byanjan\.mp3/.test(au.src) && started === 1 && SA.running());
  // ক spoken, খ silent, গ spoken; then ট (no picture yet) spoken
  au.currentTime = 1.8; AMP = 0.3; await sleep(400);
  const m0 = SA.html({ ready: true });
  t('live: the picture and word are those of the letter being said (ক: bp-01, কল)', /bp-01\.webp/.test(m0) && m0.includes('>কল<'));
  au.currentTime = 4.0; AMP = 0; await sleep(300);
  const mid = SA.html({ ready: true });
  t('while running only Rok do is offered, ক is green, the picture moved on to খ (bp-02, খৰম)', /data-bl="bpautostop"/.test(mid) && !/data-bl="bpauto"/.test(mid) && /bp-c ok" data-i="0"/.test(mid) && /bp-02\.webp/.test(mid) && mid.includes('>খৰম<'));
  au.currentTime = 6.5; AMP = 0.3; await sleep(400);
  au.currentTime = 25.4; AMP = 0.3; await sleep(350);   // ট (the 11th letter): a letter without a picture yet
  const noPic = SA.html({ ready: true });
  t('a letter without a picture: the big letter ট is shown, the picture is hidden (no src), the word is empty, nothing breaks', /id="bpBig"[^>]*>ট</.test(noPic) && /<img id="bpImg" hidden/.test(noPic) && !/bp-11\.webp/.test(noPic) && /id="bpWord"[^>]*><\/div>/.test(noPic));
  SA.stop(); await run; await sleep(20);
  const rep = { total: 41, letters: SA._state().letters };
  t('NOTHING is uploaded: the recording is not sent to the parent', uploads.length === 0);
  t('report: 41 letters in total, only the finished ones are judged, the quiet letter খ is a red alert', rep && rep.total === 41 && rep.letters.slice(0, 3).map(x => x.l).join('') === 'কখগ' && rep.letters.slice(0, 3).map(x => x.s).join('') === '101');
  t('report: start times grow and follow the Saath me bolo timings', rep && rep.letters[0].t >= 1670 && rep.letters[0].t < rep.letters[1].t && rep.letters[1].t < rep.letters[2].t && Math.abs((rep.letters[1].t - rep.letters[0].t) - (S0.CUES[1][0] - S0.CUES[0][0]) * 1000) < 5);
  t('the mic is released and one recording covered the whole session', started === 1 && stopped === 1);
  const done = SA.html({ ready: true });
  t('end screen: summary, the red letter, "not sent", Phir se', /\/ 41/.test(done) && /Awaaz nahi aayi/.test(done) && /খ/.test(done) && /Recording kisi ko nahi bheji/.test(done) && /Phir se/.test(done));

  // practice (no parent code): nothing is uploaded
  uploads.length = 0; AMP = 0;
  const run2 = SA.start({ replayMs: 0, code: '', api, calibMs: 50, tailMs: 20, redraw() {} });
  await sleep(200); au.currentTime = 1.8; AMP = 0.3; await sleep(400); au.currentTime = 4.0; AMP = 0; await sleep(60); SA.stop(); await run2; await sleep(20);
  const pd = SA.html({ ready: true, practice: true });
  t('practice: nothing is uploaded and the end screen says so', uploads.length === 0 && /Recording kisi ko nahi bheji/.test(pd));

  // Rok do at once: no upload, Start is back
  uploads.length = 0;
  const run3 = SA.start({ replayMs: 0, code: 'ABCD2345', api, calibMs: 2000, redraw() {} });
  await sleep(100); SA.stop(); await run3;
  t('Rok do at once: no letters, no upload, mic released, Start is back', uploads.length === 0 && !SA.running() && /data-bl="bpauto"/.test(SA.html({ ready: true })));

  denied = true; const run4 = SA.start({ replayMs: 0, code: 'ABCD2345', api, redraw() {} }); await run4;
  t('mic refused: a clear message, nothing uploaded', /Mic/.test(SA.html({ ready: true })) && uploads.length === 0 && !SA.running());
  denied = false;

  // a short burst above the line turns the current letter green at once
  AMP = 0; const run5 = SA.start({ replayMs: 0, code: 'ABCD2345', api, calibMs: 50, tailMs: 20, redraw() {} });
  await sleep(200); au.currentTime = 1.8; AMP = 0.3; await sleep(130); AMP = 0; await sleep(150);
  t('a short burst above the line turns the current letter green', /bp-c ok[^"]*" data-i="0"/.test(SA.html({ ready: true })) && SA._state().cells[0] === 1);
  SA.stop(); await run5;
  // auto replay: after a full natural run the lesson starts again by itself (5 s in the app, 150 ms here); Rok do during the wait cancels it
  AMP = 0; const run9 = SA.start({ code: '', api, calibMs: 20, tailMs: 20, replayMs: 150, redraw() {} });
  await sleep(150); au.currentTime = 1.8; AMP = 0.3; await sleep(200); au.onended(); await run9; await sleep(40);
  const wait = SA.html({ ready: true });
  t('auto replay: the end screen says it restarts and only Rok do is offered', SA._state().replay === true && /5 second mein phir shuru/.test(wait) && /data-bl="bpautostop"/.test(wait));
  await sleep(300);
  t('auto replay: the lesson started again by itself', (SA._state().phase === 'calib' || SA._state().phase === 'run') && !SA._state().replay && SA.running());
  SA.stop(); await sleep(150);
  AMP = 0; const run10 = SA.start({ code: '', api, calibMs: 20, tailMs: 20, replayMs: 200, redraw() {} });
  await sleep(150); au.currentTime = 1.8; AMP = 0.3; await sleep(200); au.onended(); await run10; await sleep(40);
  SA.stop(); await sleep(400);
  t('auto replay: Rok do during the wait cancels it', SA._state().phase === 'done' && !SA._state().replay && !SA.running());
  console.log(pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
})();
