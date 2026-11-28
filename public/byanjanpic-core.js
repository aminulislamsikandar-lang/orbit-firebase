// public/byanjanpic-core.js - pure helpers for Bolo "ছবিৰে সাথে বলো" (Saath me bolo with pictures): the same teacher recording and the same 41 letters as Saath me bolo
// (they are read from public/saath-core.js, so the recording, the timings and the loudness steps stay in one place), plus one picture and one word under the big letter.
// The picture and the word are the first one of the three of the AJB book (one per letter). A letter whose picture is not added yet shows no picture and no word, like Saath me bolo.
// The pictures are public/byanjan-pic/bp-NN.webp, NN = the letter's number (1-based) in the order of LETTERS. No DOM, no network.
// The browser loads it as window.BYANJANPIC_CORE (after saath-core.js); tests load it with require().
(function (root, factory) {
  const base = typeof module !== 'undefined' && module.exports ? require('./saath-core.js') : root.SAATH_CORE;
  const api = base ? factory(base) : null;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.BYANJANPIC_CORE = api;
})(typeof window !== 'undefined' ? window : globalThis, function (S) {
  'use strict';
  const V = 1;   // change when a picture is replaced, so the browser fetches the new one
  // the word of every letter, in the order of S.LETTERS ('' = no picture yet)
  const WORDS = [
    'কল', 'খৰম', 'গছ', 'ঘৰ', 'নাঙল',                       // ক খ গ ঘ ঙ
    'চিলা', 'ছাতি', 'জাপি', 'ঝাওবন', 'জিঞা',               // চ ছ জ ঝ ঞ
    '', '', '', '', '',                                      // ট ঠ ড ঢ ণ   (book page not added yet)
    '', '', '', '', '',                                      // ত থ দ ধ ন   (book page not added yet)
    'পখিলা', 'ফেঁচা', 'বল', 'ভালুক', 'মটৰ গাড়ী',          // প ফ ব ভ ম
    'যাঠি', 'ৰজা', 'ল\'ৰা', 'দোৱাত',                       // য ৰ ল ৱ
    'শিয়াল', 'ষাঁড়গৰু', 'সিংহ', 'হাঁহ',                   // শ ষ স হ
    'ক্ষুৰ', 'গঁড়', 'বাঢ়নী', 'ময়ূৰ',                      // ক্ষ ড় ঢ় য়
    'মৎস্য', 'ফৰিং', 'দুঃখী', 'কেঁচী'                       // ৎ ং ঃ ঁ
  ];
  const word = i => WORDS[i] || '';
  const has = i => !!WORDS[i];
  const pic = i => has(i) ? '/byanjan-pic/bp-' + String(i + 1).padStart(2, '0') + '.webp?v=' + V : '';
  return Object.assign({}, S, { V, WORDS, word, has, pic });
});
