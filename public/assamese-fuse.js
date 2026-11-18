// public/assamese-fuse.js - Assamese check: up to three independent listeners hear the same attempt and this file weighs their opinions.
//   sr = the browser's speech recogniser (Assamese, Bengali, Hindi engines)   vm = the voice match (public/voicematch-core.js)   ai = the parent's Gemini check
// They fail in different ways (a phone without an Assamese engine, a noisy room, a child's small voice), so together they pass far more correct
// attempts than any one of them, while a wrong attempt still needs the opinions to agree. No DOM, no network. Browser: window.AFUSE; tests: require().
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(); else root.AFUSE = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  // Weight of each opinion. "no" from the browser engine is weak because engines often mishear Assamese; a clear voice-match "no" (another item fits well) is strong.
  const W = { sr: { yes: 1.0, no: -0.2 }, vm: { strong_yes: 1.2, yes: 0.8, no: -0.2, strong_no: -1.0 }, ai: { yes: 1.5, no: -1.5 } };
  const PASS = 0.8;

  // dists = the voice-match distance of the child's clip to every item. target = the item the child was asked to say.
  function vmState(dists, target) {
    if (!dists || !dists.length || !isFinite(dists[target])) return { state: 'none' };
    const sorted = dists.filter(isFinite).sort((a, b) => a - b), med = sorted[Math.floor(sorted.length / 2)];
    const rank = 1 + dists.filter((d, i) => i !== target && d < dists[target]).length;
    const ratio = dists[target] / med, bestRatio = sorted[0] / med, best = dists.indexOf(sorted[0]);
    let state = 'no';
    if (rank === 1 && ratio <= 0.75) state = 'strong_yes';
    else if (rank <= 2 && ratio <= 0.9) state = 'yes';
    else if (best !== target && bestRatio <= 0.75 && ratio > 0.9) state = 'strong_no';   // the clip clearly sounds like another item, and not like the target
    return { state, rank, ratio, bestRatio, best };
  }

  // Each opinion is { state } with state 'yes' | 'no' | 'none' (none = it could not listen, or heard nothing). vm may also use 'strong_yes' / 'strong_no'.
  // verdict: 'pass' (praise), 'fail' (say it again), 'unsure' (the listeners disagree: ask for a clearer try, no mark), 'none' (nobody heard anything).
  function decide(o) {
    const s = (o && o.sr && o.sr.state) || 'none', v = (o && o.vm && o.vm.state) || 'none', a = (o && o.ai && o.ai.state) || 'none';
    const parts = [W.sr[s], W.vm[v], W.ai[a]].map(x => x || 0), score = parts.reduce((x, y) => x + y, 0);
    if (s === 'none' && v === 'none' && a === 'none') return { verdict: 'none', score: 0, sr: s, vm: v, ai: a };
    const verdict = score >= PASS - 1e-9 ? 'pass' : parts.some(x => x > 0) ? 'unsure' : 'fail';
    return { verdict, score: Math.round(score * 100) / 100, sr: s, vm: v, ai: a };
  }
  return { W, PASS, vmState, decide };
});
