// public/abcsaath-core.js + public/abcsaath.js ("A–Z সাথে বলো", ABC saath me bolo) with a fake microphone, a fake teacher recording and fake timing:
// the 26 letters and their timings, the mic is on from before the first letter to after the last, a letter with no sound is a red alert, the word follows the letter ("A for Apple"),
// the finished recording goes to the parent once with the right report, the mic is released, and a refused mic or "Rok do" is handled. No browser needed.
let pass = 0, fail = 0;
const t = (name, ok, extra) => { if (ok) pass++; else { fail++; console.log('FAIL  ' + name + (extra ? '  ' + extra : '')); } };
const sleep = ms => new Promise(r => setTimeout(r, ms));
let AMP = 0, stopped = 0, started = 0, denied = false, au = null;
class FakeRec { constructor() { this.state = 'inactive'; this.mimeType = 'audio/webm;codecs=opus'; } start() { this.state = 'recording'; started++; this.ondataavailable({ data: new Blob([Buffer.alloc(600, 1)]) }); } stop() { this.state = 'inactive'; setTimeout(() => this.onstop(), 5); } }
const stream = { getTracks: () => [{ stop: () => { stopped++; } }] };
const dom = { sty: false };
global.window = global;
global.document = { addEventListener() {}, getElementById: id => (id === 'abzSty' && dom.sty ? {} : null), createElement: () => ({}), head: { appendChild() { dom.sty = true; } }, querySelectorAll: () => [] };
Object.defineProperty(global, 'navigator', { configurable: true, value: { mediaDevices: { getUserMedia: async () => { if (denied) throw new Error('no'); return stream; } } } });
global.MediaRecorder = FakeRec;
global.AudioContext = class { createAnalyser() { return { fftSize: 1024, getFloatTimeDomainData: b => b.fill(AMP) }; } createMediaStreamSource() { return { connect() {} }; } close() {} };
global.Audio = class { constructor(src) { this.src = src; this.currentTime = 0; au = this; } async play() { setTimeout(() => this.onplaying && this.onplaying(), 0); } pause() {} };
global.FileReader = class { readAsDataURL(b) { b.arrayBuffer().then(ab => { this.result = 'data:audio/webm;base64,' + Buffer.from(ab).toString('base64'); this.onload(); }); } };
global.BOLOREC_CORE = require('../public/bolorec-core.js'); global.ABCSAATH_CORE = require('../public/abcsaath-core.js');
require('../public/bolorec.js'); require('../public/abcsaath.js'); 
const SA = window.ABCSAATH, K = window.ABCSAATH_CORE, BCORE = require('../public/bolo-core.js');

(async () => {
  // ---- data: the 26 letters, the words of the A se Z topic, the recording and its timings ----
  t('26 letters A to Z with 26 words and 26 timings, in order', K.LETTERS.join('') === 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' && K.WORDS.length === 26 && K.CUES.length === 26 && K.CUES.every((c, i) => c[0] < c[1] && (i === 0 || K.CUES[i - 1][1] < c[0])));
  t('the words are exactly those of the A se Z topic', K.WORDS.every((w, i) => w === BCORE.WORDS[i]));
  t('the recording is the A–Z one and is not the Byanjan or Swar file', /^\/bolo-audio\/saath-abc\.mp3/.test(K.SRC) && K.SRC !== require('../public/saath-core.js').SRC);
  t('every timing sits inside the real recording (69.77 s)', K.CUES[25][1] < 69.77 && K.CUES[0][0] > 0.5);
  t('letterAt: none before the first window, then follows the timings', K.letterAt(0) === -1 && K.letterAt(1.8) === 0 && K.letterAt(4.0) === 1 && K.letterAt(7.0) === 2 && K.letterAt(68) === 25);
  t('windows follow each other without a gap and the last one has a tail', K.CUES.every((_, i) => i === 0 || K.win(i - 1)[1] === K.win(i)[0]) && K.win(25)[1] > K.CUES[25][1]);
  t('rows: 7 + 7 + 6 + 6 letters, every letter once, two hidden padding cells', K.rows().flat().filter(k => k >= 0).join() === Array.from({ length: 26 }, (_, i) => i).join() && K.rows().flat().filter(k => k < 0).length === 2 && K.rows().every(r => r.length === 7));
  t('volume steps are the same as Saath me bolo', JSON.stringify(K.SENS) === JSON.stringify(require('../public/saath-core.js').SENS) && K.mult(3) === 1 && K.vol('x') === 3);

  const h0 = SA.html({ ready: true });
  t('idle screen: Start button, 26 letters, the word of the first letter, no red alert', /data-bl="aauto"/.test(h0) && !/data-bl="auto"/.test(h0) && (h0.match(/data-i="/g) || []).length === 26 && !/Red alert/.test(h0) && /0 \/ 26/.test(h0) && h0.includes('A for Apple') && !/<img/.test(h0));
  t('not ready: no Start button and the reason is shown', !/data-bl="aauto"/.test(SA.html({ ready: false, why: 'Mic band hai' })) && /Mic band hai/.test(SA.html({ ready: false, why: 'Mic band hai' })));
  t('practice note only when asked for, and only at the end', !/Practice/.test(h0));

  const uploads = [], api = async (p, b) => { uploads.push({ p, b }); return { id: 'x' }; };
  const run = SA.start({ replayMs: 0, code: 'ABCD2345', api, calibMs: 100, tailMs: 50, redraw() {} });
  await sleep(250);
  t('the teacher recording plays only after the quiet measuring, from the A–Z file', au && /bolo-audio\/saath-abc\.mp3/.test(au.src) && started === 1 && SA.running());
  // letter 1 (অ): the child speaks; letter 2 (আ): silence; letter 3 (ই): the child speaks
  au.currentTime = 1.8; AMP = 0.3; await sleep(400);
  const m0 = SA.html({ ready: true });
  t('live: the word is the one of the letter being said', m0.includes('A for Apple'));
  au.currentTime = 4.0; AMP = 0; await sleep(300);
  const mid = SA.html({ ready: true });
  t('while running only Rok do is offered, the first letter is green, the word moved on', /data-bl="aautostop"/.test(mid) && !/data-bl="aauto"/.test(mid) && /abz-c ok" data-i="0"/.test(mid) && mid.includes('B for Ball'));
  au.currentTime = 7.0; AMP = 0.3; await sleep(400);
  au.onended(); await run; await sleep(20);
  const rep = { total: 26, letters: SA._state().letters };
  t('NOTHING is uploaded: the recording is not sent to the parent', uploads.length === 0);
  t('report: 11 letters in total, 3 judged, only the quiet letter is a red alert', rep && rep.total === 26 && rep.letters.map(x => x.s).join('') === '101' && rep.letters.map(x => x.l).join('') === 'ABC');
  t('report: start times grow and sit inside the child recording (teacher start + the quiet measuring)', rep && rep.letters[0].t >= 1100 && rep.letters[0].t < 1800 && rep.letters[0].t < rep.letters[1].t && rep.letters[1].t < rep.letters[2].t && Math.abs((rep.letters[1].t - rep.letters[0].t) - (K.CUES[1][0] - K.CUES[0][0]) * 1000) < 5);
  t('the mic is released and one recording covered the whole session', started === 1 && stopped === 1);
  const done = SA.html({ ready: true });
  t('end screen: summary, the red letter, "not sent", Phir se', /2 \/ 26/.test(done) && /Awaaz nahi aayi/.test(done) && /lang="en">B</.test(done) && /Recording kisi ko nahi bheji/.test(done) && /Phir se/.test(done) && /Red alert: awaaz nahi aayi: 1 letter/.test(done));

  // Rok do after the second letter began: the letter already judged is still sent
  uploads.length = 0; AMP = 0;
  const run2 = SA.start({ replayMs: 0, code: 'ABCD2345', api, calibMs: 50, tailMs: 50, redraw() {} });
  await sleep(200); au.currentTime = 1.8; AMP = 0.3; await sleep(400); au.currentTime = 4.0; AMP = 0; await sleep(100);
  SA.stop(); await run2; await sleep(20);
  t('Rok do: the finished letter is kept on screen, nothing is sent, the one in progress is not counted, the mic is released', uploads.length === 0 && SA._state().letters.length === 1 && SA._state().letters[0].s === 1 && stopped === 2 && !SA.running());

  // Rok do during the quiet measuring: nothing to send
  uploads.length = 0;
  const run3 = SA.start({ replayMs: 0, code: 'ABCD2345', api, calibMs: 2000, redraw() {} });
  await sleep(100); SA.stop(); await run3;
  t('Rok do at once: no letters, no upload, mic released, Start is back', uploads.length === 0 && stopped === 3 && !SA.running() && /data-bl="aauto"/.test(SA.html({ ready: true })));

  denied = true; const run4 = SA.start({ replayMs: 0, code: 'ABCD2345', api, redraw() {} }); await run4;
  t('mic refused: a clear message, nothing uploaded', /Mic/.test(SA.html({ ready: true })) && uploads.length === 0 && !SA.running());
  denied = false;


  // practice (no parent code): the whole thing runs, nothing is uploaded, the end screen says so
  uploads.length = 0; AMP = 0;
  const run8 = SA.start({ replayMs: 0, code: '', api, calibMs: 50, tailMs: 20, redraw() {} });
  await sleep(200); au.currentTime = 1.8; AMP = 0.3; await sleep(400); au.currentTime = 4.0; AMP = 0; await sleep(60); au.onended(); await run8; await sleep(20);
  const pd = SA.html({ ready: true, practice: true });
  t('practice: nothing is uploaded, the end screen says the recording was not sent', uploads.length === 0 && /1 \/ 26|2 \/ 26/.test(pd) && /Recording kisi ko nahi bheji/.test(pd));

  // the box turns green while the child is still on that letter (as soon as enough sound has come), not only when the letter is over
  AMP = 0; const run6 = SA.start({ replayMs: 0, code: 'ABCD2345', api, calibMs: 50, tailMs: 20, redraw() {} });
  await sleep(200); au.currentTime = 1.8; AMP = 0.3; await sleep(400);
  const live = SA.html({ ready: true });
  t('live: the letter is green while it is still the current one (no wait for the next letter)', /abz-c ok[^"]*" data-i="0"/.test(live) && SA._state().cur === 0);
  SA.stop(); await run6;

  // a short sound that crosses the line (about 0.12 s) is enough
  AMP = 0; const run7 = SA.start({ replayMs: 0, code: 'ABCD2345', api, calibMs: 50, tailMs: 20, redraw() {} });
  await sleep(200); au.currentTime = 1.8; AMP = 0.3; await sleep(130); AMP = 0; await sleep(150);
  t('a short burst above the line turns the current letter green', /abz-c ok[^"]*" data-i="0"/.test(SA.html({ ready: true })) && SA._state().cells[0] === 1);
  SA.stop(); await run7;
  // auto replay: after a full natural run the lesson starts again by itself (5 s in the app, 150 ms here); Rok do during the wait cancels it
  AMP = 0; const run9 = SA.start({ code: '', api, calibMs: 20, tailMs: 20, replayMs: 150, redraw() {} });
  await sleep(150); au.currentTime = 1.8; AMP = 0.3; await sleep(200); au.currentTime = 4.0; await sleep(60); au.onended(); await run9; await sleep(40);
  const wait = SA.html({ ready: true });
  t('auto replay: the end screen says it restarts and only Rok do is offered', SA._state().replay === true && /5 second mein phir shuru/.test(wait) && /data-bl="aautostop"/.test(wait));
  await sleep(300);
  t('auto replay: the lesson started again by itself', (SA._state().phase === 'calib' || SA._state().phase === 'run') && !SA._state().replay && SA.running());
  SA.stop(); await sleep(150);
  AMP = 0; const run10 = SA.start({ code: '', api, calibMs: 20, tailMs: 20, replayMs: 200, redraw() {} });
  await sleep(150); au.currentTime = 1.8; AMP = 0.3; await sleep(200); au.currentTime = 4.0; await sleep(60); au.onended(); await run10; await sleep(40);
  SA.stop(); await sleep(400);
  t('auto replay: Rok do during the wait cancels it', SA._state().phase === 'done' && !SA._state().replay && !SA.running());
  console.log(pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
})();
