// Awaaz milao (public/voicematch-core.js): which recorded item is the child's clip closest to? Synthetic "voices" so no audio file is needed.
// Run: node tests/voicematch.test.js
const fs = require('fs'), path = require('path');
const V = require('../public/voicematch-core.js');
let pass = 0, fail = 0;
const t = (name, ok, extra) => { if (ok) pass++; else { fail++; console.log('FAIL  ' + name + (extra ? '  ' + extra : '')); } };
const SR = 16000;
// a "word" = a few 160 ms vowel-like sounds; each vowel is a pair of formants (Hz). A voice has a pitch and a size (formants scale with the size).
const VOW = { a: [750, 1200], i: [300, 2300], u: [320, 800], e: [500, 1800], o: [500, 1000] };
function voice(word, f0, size, noise, seed) {
  let s = seed || 1; const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 - 0.5; };
  const out = [], seg = Math.round(0.16 * SR), gap = Math.round(0.05 * SR);
  for (let i = 0; i < Math.round(0.15 * SR); i++) out.push(noise * rnd());
  for (const ch of word) {
    const [f1, f2] = VOW[ch].map(f => f * size);
    for (let n = 0; n < seg; n++) {
      let v = 0; const env = Math.min(1, n / 200, (seg - n) / 200);
      for (let h = 1; h * f0 < 3600; h++) { const f = h * f0; v += Math.exp(-Math.pow((f - f1) / 160, 2)) + 0.6 * Math.exp(-Math.pow((f - f2) / 220, 2)) > 0 ? (Math.exp(-Math.pow((f - f1) / 160, 2)) + 0.6 * Math.exp(-Math.pow((f - f2) / 220, 2))) * Math.sin(2 * Math.PI * f * n / SR) : 0; }
      out.push(0.08 * env * v + noise * rnd());
    }
    for (let n = 0; n < gap; n++) out.push(noise * rnd());
  }
  for (let i = 0; i < Math.round(0.2 * SR); i++) out.push(noise * rnd());
  return Float32Array.from(out);
}
const WORDS = ['aiu', 'uia', 'aeo', 'oie', 'iua', 'eoa'];
const refs = WORDS.map(w => [V.features(voice(w, 120, 1, 0.0005, 3), SR)]);
t('features: a clip with speech gives frames of 12 numbers, silence gives none', refs[0][0].length > 20 && refs[0][0][0].length === 12 && V.features(new Float32Array(SR), SR).length === 0);
t('dtw: a clip is at distance 0 from itself and further from another word', V.dtw(refs[0][0], refs[0][0]) < 1e-6 && V.dtw(refs[0][0], refs[1][0]) > 0.3);
t('down: 48 kHz is averaged to 8 kHz', V.down(new Float32Array(4800), 48000).sr === 8000 && V.down(new Float32Array(4800), 48000).x.length === 800);

let top1 = 0, n = 0;
for (const [f0, size, noise] of [[120, 1, 0.002], [260, 1.2, 0.003], [300, 1.3, 0.004], [95, 0.88, 0.003]]) {
  WORDS.forEach((w, i) => { const q = V.featuresMulti(voice(w, f0, size, noise, 11 + i), SR); const d = V.distances(q, refs); n++; if (V.rankOf(d, i) === 1) top1++; });
}
t('voice match: the right word is the closest one for adult, child and low voices (>= 90%)', top1 / n >= 0.9, top1 + '/' + n);

const q = V.featuresMulti(voice('aiu', 280, 1.25, 0.003, 5), SR), d = V.distances(q, refs);
t('decide: the right word is accepted, a different target is refused', V.decide(d, 0, { k: 1 }).ok && !V.decide(d, 3, { k: 1 }).ok && !V.decide(d, 4, { k: 1 }).ok);
const noiseClip = Float32Array.from({ length: SR }, (_, i) => 0.05 * (((i * 7919) % 1000) / 1000 - 0.5));
const nq = V.featuresMulti(noiseClip, SR);
t('decide: noise or silence is not accepted for any target', nq.length === 0 || WORDS.every((_, i) => !V.decide(V.distances(nq, refs), i, { k: 2, ratio: 0.9 }).ok));
t('decide: no distances at all is refused', !V.decide([Infinity, Infinity], 0).ok);

// wiring
const B = fs.readFileSync(path.join(__dirname, '../public/bolo.js'), 'utf8').replace(/\r\n/g, '\n'), H = fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf8'), SW = fs.readFileSync(path.join(__dirname, '../public/sw.js'), 'utf8');
t('bolo.js: both Assamese modes use the voice match', /const asMode = \(\) => st\.mode === 'asvyanjan' \|\| st\.mode === 'byanjan'/.test(B) && /const localMatch = \(\) => asMode\(\) && CAN_REC && !!g\.VMATCH && !st\.vmOff/.test(B) && /if \(recOn\(\)\) return listenAI\(\)/.test(B) && /if \(local\) \{ await matchLocal\(blob, idx\)/.test(B));
t('bolo.js: the mic works without browser speech when the voice match is on', /\(!SR && !recOn\(\)\)/.test(B));
t('index.html and sw.js load the matcher and the fusion before bolo', /voicematch-core\.js"><\/script>\r?\n<script src="\/assamese-fuse\.js"><\/script>\r?\n<script src="\/bolo-core\.js"/.test(H) && /'\/voicematch-core\.js'/.test(SW) && /'\/assamese-fuse\.js'/.test(SW));
console.log(pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
