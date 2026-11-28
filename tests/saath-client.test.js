// public/saath.js with a fake microphone, a fake teacher recording and fake timing: the mic is on from before the first letter to after the last, a letter with no sound is a red alert,
// the finished recording goes to the parent once with the right report (start time of every letter inside the recording), the mic is released, and a refused mic or "Rok do" is handled. No browser needed.
let pass = 0, fail = 0;
const t = (name, ok, extra) => { if (ok) pass++; else { fail++; console.log('FAIL  ' + name + (extra ? '  ' + extra : '')); } };
const sleep = ms => new Promise(r => setTimeout(r, ms));
let AMP = 0, stopped = 0, started = 0, denied = false, au = null;
class FakeRec { constructor() { this.state = 'inactive'; this.mimeType = 'audio/webm;codecs=opus'; } start() { this.state = 'recording'; started++; this.ondataavailable({ data: new Blob([Buffer.alloc(600, 1)]) }); } stop() { this.state = 'inactive'; setTimeout(() => this.onstop(), 5); } }
const stream = { getTracks: () => [{ stop: () => { stopped++; } }] };
const dom = { sty: false };
global.window = global;
global.document = { addEventListener() {}, getElementById: id => (id === 'saSty' && dom.sty ? {} : null), createElement: () => ({}), head: { appendChild() { dom.sty = true; } }, querySelectorAll: () => [] };
Object.defineProperty(global, 'navigator', { configurable: true, value: { mediaDevices: { getUserMedia: async () => { if (denied) throw new Error('no'); return stream; } } } });
global.MediaRecorder = FakeRec;
global.AudioContext = class { createAnalyser() { return { fftSize: 1024, getFloatTimeDomainData: b => b.fill(AMP) }; } createMediaStreamSource() { return { connect() {} }; } close() {} };
global.Audio = class { constructor(src) { this.src = src; this.currentTime = 0; au = this; } async play() { setTimeout(() => this.onplaying && this.onplaying(), 0); } pause() {} };
global.FileReader = class { readAsDataURL(b) { b.arrayBuffer().then(ab => { this.result = 'data:audio/webm;base64,' + Buffer.from(ab).toString('base64'); this.onload(); }); } };
global.BOLOREC_CORE = require('../public/bolorec-core.js'); global.SAATH_CORE = require('../public/saath-core.js');
require('../public/bolorec.js'); require('../public/saath.js');
const SA = window.SAATH, K = window.SAATH_CORE;

(async () => {
  t('the 41 letters have 41 timings and a window each, in order', K.LETTERS.length === 41 && K.CUES.length === 41 && K.CUES.every((c, i) => c[0] < c[1] && (i === 0 || K.CUES[i - 1][1] < c[0])));
  t('letterAt: none before the first window, then follows the timings', K.letterAt(0) === -1 && K.letterAt(1.8) === 0 && K.letterAt(4.0) === 1 && K.letterAt(97) === 40);
  const h0 = SA.html({ ready: true });
  t('idle screen: Start button, 41 letters, no red alert', /data-bl="auto"/.test(h0) && (h0.match(/data-i="/g) || []).length === 41 && !/Red alert/.test(h0) && /0 \/ 41/.test(h0));
  t('not ready: no Start button and the reason is shown', !/data-bl="auto"/.test(SA.html({ ready: false, why: 'Kid mode me code jodo' })) && /Kid mode me code jodo/.test(SA.html({ ready: false, why: 'Kid mode me code jodo' })));

  const uploads = [], api = async (p, b) => { uploads.push({ p, b }); return { id: 'x' }; };
  const run = SA.start({ replayMs: 0, code: 'ABCD2345', api, calibMs: 100, tailMs: 50, redraw() {} });
  await sleep(250);
  t('the teacher recording plays only after the quiet measuring, from the Saath file', au && /saath-byanjan\.mp3/.test(au.src) && started === 1 && SA.running());
  // letter 1 (ক): the child speaks; letter 2 (খ): silence; letter 3 (গ): the child speaks
  au.currentTime = 1.8; AMP = 0.3; await sleep(400);
  au.currentTime = 4.0; AMP = 0; await sleep(300);
  const mid = SA.html({ ready: true });
  t('while running only Rok do is offered, the first letter is green', /data-bl="autostop"/.test(mid) && !/data-bl="auto"/.test(mid) && /sa-c ok" data-i="0"/.test(mid));
  au.currentTime = 6.4; AMP = 0.3; await sleep(400);
  au.onended(); await run; await sleep(20);
  const rep = { total: 41, letters: SA._state().letters };
  t('NOTHING is uploaded: the recording is not sent to the parent', uploads.length === 0);
  t('report: 41 letters in total, 3 judged, only the quiet letter is a red alert', rep && rep.total === 41 && rep.letters.map(x => x.s).join('') === '101' && rep.letters.map(x => x.l).join('') === 'কখগ');
  t('report: start times grow and sit inside the child recording (teacher start + the quiet measuring)', rep && rep.letters[0].t >= 1670 && rep.letters[0].t < 2200 && rep.letters[0].t < rep.letters[1].t && rep.letters[1].t < rep.letters[2].t && Math.abs((rep.letters[1].t - rep.letters[0].t) - (K.CUES[1][0] - K.CUES[0][0]) * 1000) < 5);
  t('the mic is released and one recording covered the whole session', started === 1 && stopped === 1);
  const done = SA.html({ ready: true });
  t('end screen: summary, the red letter, "not sent", Phir se', /2 \/ 41/.test(done) && /Awaaz nahi aayi/.test(done) && /খ/.test(done) && /Recording kisi ko nahi bheji/.test(done) && /Phir se/.test(done) && /Red alert: awaaz nahi aayi: 1 letter/.test(done));

  // Rok do after the second letter began: the letter already judged is still sent
  uploads.length = 0; AMP = 0;
  const run2 = SA.start({ replayMs: 0, code: 'ABCD2345', api, calibMs: 50, tailMs: 50, redraw() {} });
  await sleep(200); au.currentTime = 1.8; AMP = 0.3; await sleep(400); au.currentTime = 4.0; AMP = 0; await sleep(100);
  SA.stop(); await run2; await sleep(20);
  t('Rok do: nothing is sent, the finished letter is kept on screen, the one in progress is not, the mic is released', uploads.length === 0 && SA._state().letters.length === 1 && SA._state().letters[0].s === 1 && stopped === 2 && !SA.running());

  // Rok do during the quiet measuring: nothing to send
  uploads.length = 0;
  const run3 = SA.start({ replayMs: 0, code: 'ABCD2345', api, calibMs: 2000, redraw() {} });
  await sleep(100); SA.stop(); await run3;
  t('Rok do at once: no letters, no upload, mic released, Start is back', uploads.length === 0 && stopped === 3 && !SA.running() && /data-bl="auto"/.test(SA.html({ ready: true })));

  denied = true; const run4 = SA.start({ replayMs: 0, code: 'ABCD2345', api, redraw() {} }); await run4;
  t('mic refused: a clear message, nothing uploaded', /Mic/.test(SA.html({ ready: true })) && uploads.length === 0 && !SA.running());
  denied = false;


  // the box turns green while the child is still on that letter (as soon as enough sound has come), not only when the letter is over
  AMP = 0; const run6 = SA.start({ replayMs: 0, code: 'ABCD2345', api, calibMs: 50, tailMs: 20, redraw() {} });
  await sleep(200); au.currentTime = 1.8; AMP = 0.3; await sleep(400);
  const live = SA.html({ ready: true });
  t('live: the letter is green while it is still the current one (no wait for the next letter)', /sa-c ok[^"]*" data-i="0"/.test(live) && SA._state && SA._state().cur === 0);
  SA.stop(); await run6;

  // a short sound that crosses the line (about 0.12 s) is enough: the box does not wait for 0.25 s
  AMP = 0; const run7 = SA.start({ replayMs: 0, code: 'ABCD2345', api, calibMs: 50, tailMs: 20, redraw() {} });
  await sleep(200); au.currentTime = 1.8; AMP = 0.3; await sleep(130); AMP = 0; await sleep(150);
  t('a short burst above the line turns the current letter green', /sa-c ok[^"]*" data-i="0"/.test(SA.html({ ready: true })) && SA._state().cells[0] === 1);
  SA.stop(); await run7;
  // auto replay: after a full natural run the lesson starts again by itself (5 s in the app, 150 ms here); Rok do during the wait cancels it
  AMP = 0; const run9 = SA.start({ code: '', api, calibMs: 20, tailMs: 20, replayMs: 150, redraw() {} });
  await sleep(150); au.currentTime = 1.8; AMP = 0.3; await sleep(200); au.onended(); await run9; await sleep(40);
  const wait = SA.html({ ready: true });
  t('auto replay: the end screen says it restarts and only Rok do is offered', SA._state().replay === true && /5 second mein phir shuru/.test(wait) && /data-bl="autostop"/.test(wait));
  await sleep(300);
  t('auto replay: the lesson started again by itself', (SA._state().phase === 'calib' || SA._state().phase === 'run') && !SA._state().replay && SA.running());
  SA.stop(); await sleep(150);
  AMP = 0; const run10 = SA.start({ code: '', api, calibMs: 20, tailMs: 20, replayMs: 200, redraw() {} });
  await sleep(150); au.currentTime = 1.8; AMP = 0.3; await sleep(200); au.onended(); await run10; await sleep(40);
  SA.stop(); await sleep(400);
  t('auto replay: Rok do during the wait cancels it', SA._state().phase === 'done' && !SA._state().replay && !SA.running());
  console.log(pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
})();
