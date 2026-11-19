// public/saath-core.js - pure helpers for Bolo "সাথে বলো" (Saath me bolo): one teacher recording says the 41 Assamese letters one after another,
// the child speaks along, and only the sound LEVEL is measured (nothing is recognised). No DOM, no network.
// The browser loads it as window.SAATH_CORE; tests load it with require().
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SAATH_CORE = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  const SRC = '/bolo-audio/saath-byanjan.mp3?v=3';
  const LETTERS = 'ক খ গ ঘ ঙ চ ছ জ ঝ ঞ ট ঠ ড ঢ ণ ত থ দ ধ ন প ফ ব ভ ম য ৰ ল ৱ শ ষ স হ ক্ষ ড় ঢ় য় ৎ ং ঃ ঁ'.split(' ');
  // [start, end] in seconds of every letter inside SRC, same order as LETTERS
  const CUES = [[1.67, 2.12], [3.84, 4.32], [6.33, 6.77], [8.33, 8.84], [10.83, 11.28], [13.36, 13.83], [15.56, 16.08], [18.12, 18.7], [20.36, 20.94], [22.54, 23.06], [25.09, 25.54], [27.62, 28.14], [30.13, 30.63], [32.25, 32.79], [34.63, 35.31], [37.04, 37.44], [39.02, 39.5], [41.54, 41.91], [43.43, 43.94], [45.86, 46.63], [48.46, 48.86], [50.79, 51.19], [53.0, 53.4], [54.89, 55.44], [56.88, 57.36], [59.15, 59.67], [61.26, 61.74], [63.44, 63.92], [65.52, 66.09], [68.05, 68.74], [70.43, 71.17], [73.03, 73.79], [75.5, 75.83], [77.97, 78.76], [80.36, 81.13], [82.9, 83.59], [85.7, 86.59], [88.51, 89.29], [91.15, 91.79], [93.42, 94.16], [95.94, 96.68]];
  const ROWS = [5, 5, 5, 5, 5, 4, 4, 4, 4];   // 41 letters laid out in rows of 5 / 4
  const LEAD = 0.2, TAIL = 1.2;               // a letter's window opens LEAD s before its clip and runs to the next letter's window (the last one gets TAIL s after its clip)
  // the window of letter i, in seconds of the teacher recording
  const win = i => [CUES[i][0] - LEAD, i + 1 < CUES.length ? CUES[i + 1][0] - LEAD : CUES[i][1] + TAIL];
  // which letter's window the recording time t (seconds) is in; -1 before the first letter
  const letterAt = t => { let i = -1; for (let k = 0; k < CUES.length; k++) if (t >= win(k)[0]) i = k; return i; };
  // where letter i starts inside the child's recording (ms); off = seconds between the recording start and the teacher audio start
  const startMs = (off, i) => Math.max(0, Math.round(((+off || 0) + CUES[i][0]) * 1000));
  const rows = () => { const out = []; let k = 0; ROWS.forEach(n => { const r = []; for (let j = 0; j < 5; j++) r.push(j < n ? k++ : -1); out.push(r); }); return out; };
  // The parent's "how loud must the voice be" slider (1 = very soft ... 5 = very loud). 3 is the level used before this slider existed (the room's own noise x 2.5).
  const SENS = [0.4, 0.7, 1, 1.6, 2.4];
  const vol = v => { v = Math.round(+v); return Number.isFinite(v) ? Math.min(5, Math.max(1, v)) : 3; };
  const mult = v => SENS[vol(v) - 1];
  const SPOKE_MS = 80;   // this much sound above the line inside a letter's window turns the letter green (two 40 ms checks), so a short "ka" counts as soon as it crosses the line
  return { SRC, LETTERS, CUES, ROWS, LEAD, TAIL, win, letterAt, startMs, rows, SENS, vol, mult, SPOKE_MS };
});
