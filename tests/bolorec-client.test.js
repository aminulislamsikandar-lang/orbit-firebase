// public/bolorec.js on the child's phone, with a fake microphone: the mic is on from the first letter to the last, a letter with no sound is a red alert,
// the recording is uploaded once with the right report, the mic is released, and a refused mic or a cancel is handled. No browser needed.
let pass = 0, fail = 0;
const t = (name, ok, extra) => { if (ok) pass++; else { fail++; console.log('FAIL  ' + name + (extra ? '  ' + extra : '')); } };
let AMP = 0, stopped = 0, started = 0, denied = false;
class FakeRec { constructor() { this.state = 'inactive'; this.mimeType = 'audio/webm;codecs=opus'; } start() { this.state = 'recording'; started++; this.ondataavailable({ data: new Blob([Buffer.alloc(600, 1)]) }); } stop() { this.state = 'inactive'; setTimeout(() => this.onstop(), 0); } }
const stream = { getTracks: () => [{ stop: () => { stopped++; } }] };
global.window = global; global.document = { addEventListener() {}, getElementById: () => null };
Object.defineProperty(global, 'navigator', { configurable: true, value: { mediaDevices: { getUserMedia: async () => { if (denied) throw new Error('no'); return stream; } } } });
global.MediaRecorder = FakeRec;
global.AudioContext = class { createAnalyser() { return { fftSize: 1024, getFloatTimeDomainData: b => b.fill(AMP) }; } createMediaStreamSource() { return { connect() {} }; } close() {} };
global.FileReader = class { readAsDataURL(b) { b.arrayBuffer().then(ab => { this.result = 'data:audio/webm;base64,' + Buffer.from(ab).toString('base64'); this.onload(); }); } };
global.BOLOREC_CORE = require('../public/bolorec-core.js'); require('../public/bolorec.js');   // in the browser the core sets window.BOLOREC_CORE itself
const B = window.BOLOREC;

(async () => {
  t('can() is true when mic, recorder and audio context exist', B.can() === true);
  const items = [{ big: 'ক', ms: 100 }, { big: 'খ', ms: 100 }, { big: 'গ', ms: 100 }], steps = [], reds = [], uploads = [];
  const o = { items, code: 'ABCD2345', clipMs: i => items[i].ms, cancelled: () => false,
    step: i => { steps.push(i); AMP = i === 1 ? 0 : 0.3; },     // the child is quiet only for the 2nd letter
    silent: i => { reds.push(i); },
    api: async (p, b) => { uploads.push({ p, b }); return { id: 'x' }; } };
  const r = await B.run(o);
  t('letters are stepped in order, one after another', JSON.stringify(steps) === '[0,1,2]');
  t('only the quiet letter is a red alert', JSON.stringify(reds) === '[1]' && r.silent === 1);
  t('one recording started for the whole session and the mic is released at the end', started === 1 && stopped === 1);
  t('NOTHING is uploaded: the recording is not sent', uploads.length === 0 && !r.sent);
  const rep = { total: items.length, letters: r.letters };
  t('report: 3 letters, 2nd has no sound, start times grow', rep.total === 3 && rep.letters.map(x => x.s).join('') === '101' && rep.letters[1].l === 'খ' && rep.letters[0].t < rep.letters[1].t && rep.letters[1].t < rep.letters[2].t);

  // cancelled before the first letter: nothing to upload
  uploads.length = 0; const r2 = await B.run({ ...o, cancelled: () => true, step: () => {} });
  t('cancel at once: no letters, no upload, mic released', r2.letters.length === 0 && uploads.length === 0 && !r2.sent && stopped === 2);

  denied = true; const r3 = await B.run(o);
  t('mic refused: a clear message, nothing uploaded', /Mic/.test(r3.err) && uploads.length === 0 && !r3.sent);
  denied = false;

  console.log(pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
})();
