// public/swarsaath-core.js - pure helpers for Bolo "স্বৰ সাথে বলো" (Swar saath me bolo): the teacher's Swar-borno recording says the 11 Assamese vowels one after another,
// the child speaks along, and only the sound LEVEL is measured (nothing is recognised). Same idea as saath-core.js (Byanjan), kept apart so the two never touch each other.
// The recording and the pictures are the ones of the Swar-borno topic (public/swar/); the vowel timings are the ones of public/swarborno.js. No DOM, no network.
// The browser loads it as window.SWARSAATH_CORE; tests load it with require().
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SWARSAATH_CORE = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  const V = 2;   // same file version as swarborno.js, so the browser keeps one copy of the recording and the pictures
  const SRC = '/swar/swar.mp3?v=' + V;
  const LETTERS = 'অ আ ই ঈ উ ঊ ঋ এ ঐ ও ঔ'.split(' ');
  const WORDS = ['অমিতা', 'আম', 'ইটা', 'ঈগল', 'উট', 'উণসূতা', 'ঋষি', 'এৰাগছ', 'ঐৰাৱত', 'ওল-কচু', 'ঔ-টেঙা'];   // the picture word of every vowel (the long U is written with the short U sign, as in the book)
  // [start, end] in seconds of every vowel inside SRC, same order as LETTERS
  const CUES = [[1.5,1.99],[3.82,4.39],[6.71,7.42],[9.39,10.12],[12.21,12.93],[14.64,15.42],[17.1,17.67],[19.72,20.17],[21.98,22.47],[24.26,24.64],[26.25,26.64]];
  const COLS = 6, ROWS = [6, 5];   // 11 vowels laid out in rows of 6 and 5
  const LEAD = 0.2, TAIL = 1.2;     // a vowel's window opens LEAD s before its clip and runs to the next vowel's window (the last one gets TAIL s after its clip)
  // the window of vowel i, in seconds of the teacher recording
  const win = i => [CUES[i][0] - LEAD, i + 1 < CUES.length ? CUES[i + 1][0] - LEAD : CUES[i][1] + TAIL];
  // which vowel's window the recording time t (seconds) is in; -1 before the first vowel
  const letterAt = t => { let i = -1; for (let k = 0; k < CUES.length; k++) if (t >= win(k)[0]) i = k; return i; };
  // where vowel i starts inside the child's recording (ms); off = seconds between the recording start and the teacher audio start
  const startMs = (off, i) => Math.max(0, Math.round(((+off || 0) + CUES[i][0]) * 1000));
  const rows = () => { const out = []; let k = 0; ROWS.forEach(n => { const r = []; for (let j = 0; j < COLS; j++) r.push(j < n ? k++ : -1); out.push(r); }); return out; };
  const pic = i => '/swar/swar-' + String(i + 1).padStart(2, '0') + '.webp?v=' + V;
  // The parent's "how loud must the voice be" slider (1 = very soft ... 5 = very loud), the same one as Saath me bolo. 3 = the room's own noise x 2.5.
  const SENS = [0.4, 0.7, 1, 1.6, 2.4];
  const vol = v => { v = Math.round(+v); return Number.isFinite(v) ? Math.min(5, Math.max(1, v)) : 3; };
  const mult = v => SENS[vol(v) - 1];
  const SPOKE_MS = 80;   // this much sound above the line inside a vowel's window turns the vowel green (two 40 ms checks)
  return { SRC, LETTERS, WORDS, CUES, COLS, ROWS, LEAD, TAIL, win, letterAt, startMs, rows, pic, SENS, vol, mult, SPOKE_MS };
});
