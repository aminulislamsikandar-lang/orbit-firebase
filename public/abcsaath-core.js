// public/abcsaath-core.js - pure helpers for Bolo "A–Z saath me bolo" (ABC saath me bolo): the teacher's recording says the 26 English letters one after another,
// the child speaks along, and only the sound LEVEL is measured (nothing is recognised). Same idea as saath-core.js (Byanjan) and swarsaath-core.js (Swar), kept apart so they never touch each other.
// Next to the big letter the picture word of the A se Z topic is shown ("A for Apple"). No DOM, no network.
// The browser loads it as window.ABCSAATH_CORE; tests load it with require().
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.ABCSAATH_CORE = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  const SRC = '/bolo-audio/saath-abc.mp3?v=1';
  const LETTERS = 'A B C D E F G H I J K L M N O P Q R S T U V W X Y Z'.split(' ');
  const WORDS = ['Apple', 'Ball', 'Cat', 'Dog', 'Egg', 'Fish', 'Goat', 'Hat', 'Ice cream', 'Jug', 'Kite', 'Lion', 'Mango', 'Nest', 'Orange', 'Parrot', 'Queen', 'Rabbit', 'Sun', 'Tiger', 'Umbrella', 'Van', 'Watch', 'Xylophone', 'Yak', 'Zebra'];   // the same words as the A se Z topic (bolo-core.js)
  // [start, end] in seconds of every letter inside SRC, same order as LETTERS
  const CUES = [[1.12, 1.66], [3.51, 4.3], [6.32, 7.03], [9.02, 9.72], [11.58, 12.14], [14.32, 14.93], [16.86, 17.45], [19.47, 20.05], [22.11, 22.64], [24.8, 25.46], [27.99, 28.54], [30.68, 31.36], [33.28, 33.82], [35.93, 36.62], [38.65, 39.33], [41.24, 41.82], [44.23, 44.92], [46.77, 47.47], [49.34, 50.09], [51.88, 52.36], [54.18, 54.93], [56.56, 57.39], [59.22, 60.05], [61.87, 62.7], [64.34, 65.05], [66.78, 67.46]];
  const COLS = 7, ROWS = [7, 7, 6, 6];   // 26 letters laid out in rows of 7, 7, 6 and 6
  const LEAD = 0.2, TAIL = 1.2;           // a letter's window opens LEAD s before its clip and runs to the next letter's window (the last one gets TAIL s after its clip)
  // the window of letter i, in seconds of the teacher recording
  const win = i => [CUES[i][0] - LEAD, i + 1 < CUES.length ? CUES[i + 1][0] - LEAD : CUES[i][1] + TAIL];
  // which letter's window the recording time t (seconds) is in; -1 before the first letter
  const letterAt = t => { let i = -1; for (let k = 0; k < CUES.length; k++) if (t >= win(k)[0]) i = k; return i; };
  // where letter i starts inside the child's recording (ms); off = seconds between the recording start and the teacher audio start
  const startMs = (off, i) => Math.max(0, Math.round(((+off || 0) + CUES[i][0]) * 1000));
  const rows = () => { const out = []; let k = 0; ROWS.forEach(n => { const r = []; for (let j = 0; j < COLS; j++) r.push(j < n ? k++ : -1); out.push(r); }); return out; };
  // The parent's "how loud must the voice be" slider (1 = very soft ... 5 = very loud), the same one as Saath me bolo. 3 = the room's own noise x 2.5.
  const SENS = [0.4, 0.7, 1, 1.3, 1.8];
  const vol = v => { v = Math.round(+v); return Number.isFinite(v) ? Math.min(5, Math.max(1, v)) : 3; };
  const mult = v => SENS[vol(v) - 1];
  const SPOKE_MS = 80;   // this much sound above the line inside a letter's window turns the letter green (two 40 ms checks)
  return { SRC, LETTERS, WORDS, CUES, COLS, ROWS, LEAD, TAIL, win, letterAt, startMs, rows, SENS, vol, mult, SPOKE_MS };
});
