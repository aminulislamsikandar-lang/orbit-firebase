// public/swarsaath-core.js + public/swarsaath.js ("স্বৰ সাথে বলো", Swar saath me bolo) with a fake microphone, a fake teacher recording and fake timing:
// the 11 vowels and their timings are the ones of Swar-borno, the mic is on from before the first vowel to after the last, a vowel with no sound is a red alert, the picture and word follow the vowel,
// the finished recording goes to the parent once with the right report, the mic is released, and a refused mic or "Rok do" is handled. No browser needed.
let pass = 0, fail = 0;
const t = (name, ok, extra) => { if (ok) pass++; else { fail++; console.log('FAIL  ' + name + (extra ? '  ' + extra : '')); } };
const sleep = ms => new Promise(r => setTimeout(r, ms));
let AMP = 0, stopped = 0, started = 0, denied = false, au = null;
class FakeRec { constructor() { this.state = 'inactive'; this.mimeType = 'audio/webm;codecs=opus'; } start() { this.state = 'recording'; started++; this.ondataavailable({ data: new Blob([Buffer.alloc(600, 1)]) }); } stop() { this.state = 'inactive'; setTimeout(() => this.onstop(), 5); } }
const stream = { getTracks: () => [{ stop: () => { stopped++; } }] };
const dom = { sty: false };
global.window = global;
global.document = { addEventListener() {}, getElementById: id => (id === 'ssSty' && dom.sty ? {} : null), createElement: () => ({}), head: { appendChild() { dom.sty = true; } }, querySelectorAll: () => [] };
Object.defineProperty(global, 'navigator', { configurable: true, value: { mediaDevices: { getUserMedia: async () => { if (denied) throw new Error('no'); return stream; } } } });
global.MediaRecorder = FakeRec;
global.AudioContext = class { createAnalyser() { return { fftSize: 1024, getFloatTimeDomainData: b => b.fill(AMP) }; } createMediaStreamSource() { return { connect() {} }; } close() {} };
global.Audio = class { constructor(src) { this.src = src; this.currentTime = 0; au = this; } async play() { setTimeout(() => this.onplaying && this.onplaying(), 0); } pause() {} };
global.FileReader = class { readAsDataURL(b) { b.arrayBuffer().then(ab => { this.result = 'data:audio/webm;base64,' + Buffer.from(ab).toString('base64'); this.onload(); }); } };
global.BOLOREC_CORE = require('../public/bolorec-core.js'); global.SWARSAATH_CORE = require('../public/swarsaath-core.js');
require('../public/bolorec.js'); require('../public/swarsaath.js'); require('../public/swarborno.js');
const SA = window.SWARSAATH, K = window.SWARSAATH_CORE, D = window.SWAR._data;

(async () => {
  // ---- data: the same vowels, words, recording and timings as Swar-borno ----
  t('11 vowels with 11 words and 11 timings, in order', K.LETTERS.length === 11 && K.WORDS.length === 11 && K.CUES.length === 11 && K.CUES.every((c, i) => c[0] < c[1] && (i === 0 || K.CUES[i - 1][1] < c[0])));
  t('vowels, words and timings are exactly those of Swar-borno', D.LET.every((l, i) => l[0] === K.LETTERS[i] && l[1] === K.WORDS[i] && l[3] === K.CUES[i][0] && l[4] === K.CUES[i][1]));
  t('same recording and pictures as Swar-borno', K.SRC === D.AUDIO && K.LETTERS.every((_, i) => K.pic(i) === D.pic(i)));
  t('letterAt: none before the first window, then follows the timings', K.letterAt(0) === -1 && K.letterAt(1.8) === 0 && K.letterAt(4.0) === 1 && K.letterAt(27) === 10);
  t('windows follow each other without a gap and the last one has a tail', K.CUES.every((_, i) => i === 0 || K.win(i - 1)[1] === K.win(i)[0]) && K.win(10)[1] > K.CUES[10][1]);
  t('rows: 6 + 5 vowels, every vowel once, one hidden padding cell', K.rows().flat().filter(k => k >= 0).join() === '0,1,2,3,4,5,6,7,8,9,10' && K.rows().flat().filter(k => k < 0).length === 1);
  t('volume steps are the same as Saath me bolo', JSON.stringify(K.SENS) === JSON.stringify(require('../public/saath-core.js').SENS) && K.mult(3) === 1 && K.vol('x') === 3);

  const h0 = SA.html({ ready: true });
  t('idle screen: Start button, 11 vowels, picture and word of the first vowel, no red alert', /data-bl="sauto"/.test(h0) && !/data-bl="auto"/.test(h0) && (h0.match(/data-i="/g) || []).length === 11 && !/Red alert/.test(h0) && /0 \/ 11/.test(h0) && /swar-01\.webp/.test(h0) && h0.includes(K.WORDS[0]));
  t('not ready: no Start button and the reason is shown', !/data-bl="sauto"/.test(SA.html({ ready: false, why: 'Mic band hai' })) && /Mic band hai/.test(SA.html({ ready: false, why: 'Mic band hai' })));
  t('practice note only when asked for, and only at the end', !/Practice/.test(h0));

  const uploads = [], api = async (p, b) => { uploads.push({ p, b }); return { id: 'x' }; };
  const run = SA.start({ code: 'ABCD2345', api, calibMs: 100, tailMs: 50, redraw() {} });
  await sleep(250);
  t('the teacher recording plays only after the quiet measuring, from the Swar file', au && /swar\/swar\.mp3/.test(au.src) && started === 1 && SA.running());
  // vowel 1 (অ): the child speaks; vowel 2 (আ): silence; vowel 3 (ই): the child speaks
  au.currentTime = 1.8; AMP = 0.3; await sleep(400);
  const m0 = SA.html({ ready: true });
  t('live: the picture and word are those of the vowel being said', /swar-01\.webp/.test(m0) && m0.includes(K.WORDS[0]));
  au.currentTime = 4.0; AMP = 0; await sleep(300);
  const mid = SA.html({ ready: true });
  t('while running only Rok do is offered, the first vowel is green, the picture moved on', /data-bl="sautostop"/.test(mid) && !/data-bl="sauto"/.test(mid) && /ss-c ok" data-i="0"/.test(mid) && /swar-02\.webp/.test(mid) && mid.includes(K.WORDS[1]));
  au.currentTime = 7.0; AMP = 0.3; await sleep(400);
  au.onended(); await run; await sleep(20);
  const rep = uploads[0] && uploads[0].b.report;
  t('one upload to the parent route with the code and webm', uploads.length === 1 && uploads[0].p === '/api/bolo/rec/upload' && uploads[0].b.code === 'ABCD2345' && uploads[0].b.mime === 'audio/webm' && uploads[0].b.audio.length > 100);
  t('report: 11 vowels in total, 3 judged, only the quiet vowel is a red alert', rep && rep.total === 11 && rep.letters.map(x => x.s).join('') === '101' && rep.letters.map(x => x.l).join('') === 'অআই');
  t('report: start times grow and sit inside the child recording (teacher start + the quiet measuring)', rep && rep.letters[0].t >= 1500 && rep.letters[0].t < 2200 && rep.letters[0].t < rep.letters[1].t && rep.letters[1].t < rep.letters[2].t && Math.abs((rep.letters[1].t - rep.letters[0].t) - (K.CUES[1][0] - K.CUES[0][0]) * 1000) < 5);
  t('the mic is released and one recording covered the whole session', started === 1 && stopped === 1);
  const done = SA.html({ ready: true });
  t('end screen: summary, the red vowel, "sent to the parent", Phir se', /2 \/ 11/.test(done) && /Awaaz nahi aayi/.test(done) && /আ/.test(done) && /2 ghante/.test(done) && /Phir se/.test(done) && /Red alert: awaaz nahi aayi: 1 swar/.test(done));

  // Rok do after the second vowel began: the vowel already judged is still sent
  uploads.length = 0; AMP = 0;
  const run2 = SA.start({ code: 'ABCD2345', api, calibMs: 50, tailMs: 50, redraw() {} });
  await sleep(200); au.currentTime = 1.8; AMP = 0.3; await sleep(400); au.currentTime = 4.0; AMP = 0; await sleep(100);
  SA.stop(); await run2; await sleep(20);
  t('Rok do: the finished vowel is sent, the one in progress is not, the mic is released', uploads.length === 1 && uploads[0].b.report.letters.length === 1 && uploads[0].b.report.letters[0].s === 1 && stopped === 2 && !SA.running());

  // Rok do during the quiet measuring: nothing to send
  uploads.length = 0;
  const run3 = SA.start({ code: 'ABCD2345', api, calibMs: 2000, redraw() {} });
  await sleep(100); SA.stop(); await run3;
  t('Rok do at once: no vowels, no upload, mic released, Start is back', uploads.length === 0 && stopped === 3 && !SA.running() && /data-bl="sauto"/.test(SA.html({ ready: true })));

  denied = true; const run4 = SA.start({ code: 'ABCD2345', api, redraw() {} }); await run4;
  t('mic refused: a clear message, nothing uploaded', /Mic/.test(SA.html({ ready: true })) && uploads.length === 0 && !SA.running());
  denied = false;

  const run5 = SA.start({ code: 'ABCD2345', api: async () => { throw new Error('Net nahi hai'); }, calibMs: 50, tailMs: 20, redraw() {} });
  await sleep(200); au.currentTime = 1.8; AMP = 0.3; await sleep(400); au.currentTime = 4.0; await sleep(60); au.onended(); await run5;
  t('failed upload: the error is shown, the session still finished', /Net nahi hai/.test(SA.html({ ready: true })) && !SA.running());

  // practice (no parent code): the whole thing runs, nothing is uploaded, the end screen says so
  uploads.length = 0; AMP = 0;
  const run8 = SA.start({ code: '', api, calibMs: 50, tailMs: 20, redraw() {} });
  await sleep(200); au.currentTime = 1.8; AMP = 0.3; await sleep(400); au.currentTime = 4.0; AMP = 0; await sleep(60); au.onended(); await run8; await sleep(20);
  const pd = SA.html({ ready: true, practice: true });
  t('practice: nothing is uploaded, the end screen says the recording was not sent', uploads.length === 0 && /1 \/ 11|2 \/ 11/.test(pd) && /Practice: recording kisi ko nahi bheji gayi/.test(pd) && !/2 ghante/.test(pd));

  // the box turns green while the child is still on that vowel (as soon as enough sound has come), not only when the vowel is over
  AMP = 0; const run6 = SA.start({ code: 'ABCD2345', api, calibMs: 50, tailMs: 20, redraw() {} });
  await sleep(200); au.currentTime = 1.8; AMP = 0.3; await sleep(400);
  const live = SA.html({ ready: true });
  t('live: the vowel is green while it is still the current one (no wait for the next vowel)', /ss-c ok[^"]*" data-i="0"/.test(live) && SA._state().cur === 0);
  SA.stop(); await run6;

  // a short sound that crosses the line (about 0.12 s) is enough
  AMP = 0; const run7 = SA.start({ code: 'ABCD2345', api, calibMs: 50, tailMs: 20, redraw() {} });
  await sleep(200); au.currentTime = 1.8; AMP = 0.3; await sleep(130); AMP = 0; await sleep(150);
  t('a short burst above the line turns the current vowel green', /ss-c ok[^"]*" data-i="0"/.test(SA.html({ ready: true })) && SA._state().cells[0] === 1);
  SA.stop(); await run7;
  console.log(pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
})();
