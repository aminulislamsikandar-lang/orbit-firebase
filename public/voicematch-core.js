// public/voicematch-core.js - "Awaaz milao": tells which recorded word/letter a child's voice is closest to, on the phone, with no speech-to-text.
// The browser cannot hear Assamese well, so instead the child's clip is compared (MFCC features + DTW) with the teacher's recorded clips of every item
// of the mode; the item whose recording sounds most alike wins. Nothing leaves the phone. No DOM, no network. Browser: window.VMATCH; tests: require().
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(); else root.VMATCH = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const NF = 24, NC = 12;                                  // mel filters, kept cepstral coefficients (c1..c12)

  // speech engines and phones use 8 to 48 kHz: average down to about 8 kHz first
  function down(pcm, sr) {
    const f = Math.max(1, Math.floor(sr / 8000));
    if (f === 1) return { x: pcm, sr };
    const n = Math.floor(pcm.length / f), x = new Float32Array(n);
    for (let i = 0; i < n; i++) { let s = 0; for (let j = 0; j < f; j++) s += pcm[i * f + j]; x[i] = s / f; }
    return { x, sr: sr / f };
  }
  const hz2mel = h => 2595 * Math.log10(1 + h / 700), mel2hz = m => 700 * (Math.pow(10, m / 2595) - 1);
  function fft(re, im) {                                    // in place, length power of two
    const n = re.length;
    for (let i = 1, j = 0; i < n; i++) { let b = n >> 1; for (; j & b; b >>= 1) j ^= b; j ^= b; if (i < j) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; } }
    for (let len = 2; len <= n; len <<= 1) {
      const ang = -2 * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang);
      for (let i = 0; i < n; i += len) {
        let cr = 1, ci = 0;
        for (let k = 0; k < len / 2; k++) {
          const a = i + k, b = a + len / 2, tr = re[b] * cr - im[b] * ci, ti = re[b] * ci + im[b] * cr;
          re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti;
          const nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr;
        }
      }
    }
  }
  const bankCache = {};
  // alpha stretches the filters along the frequency axis: a child's voice has higher formants than the recorded adult, alpha > 1 listens higher up to match
  function bank(N, sr, alpha) {
    const key = N + ':' + sr + ':' + alpha; if (bankCache[key]) return bankCache[key];
    const lo = hz2mel(100 * alpha), hi = hz2mel(Math.min(2900 * alpha, sr / 2 * 0.95)), pts = [];
    for (let i = 0; i < NF + 2; i++) pts.push(Math.floor((N + 1) * mel2hz(lo + (hi - lo) * i / (NF + 1)) / sr));
    const fb = [];
    for (let m = 1; m <= NF; m++) {
      const f = new Float32Array(N / 2 + 1);
      for (let k = pts[m - 1]; k < pts[m]; k++) f[k] = (k - pts[m - 1]) / Math.max(1, pts[m] - pts[m - 1]);
      for (let k = pts[m]; k < pts[m + 1]; k++) f[k] = (pts[m + 1] - k) / Math.max(1, pts[m + 1] - pts[m]);
      fb.push(f);
    }
    const dct = [];
    for (let c = 1; c <= NC; c++) { const r = new Float32Array(NF); for (let m = 0; m < NF; m++) r[m] = Math.cos(Math.PI * c * (m + 0.5) / NF); dct.push(r); }
    return (bankCache[key] = { fb, dct });
  }

  // pcm: Float32Array of one mono clip. Returns an array of feature vectors, speech frames only (silence, also inside the clip, is dropped).
  function features(pcm, sr, alpha) {
    alpha = alpha || 1;
    const d = down(pcm, sr), x = d.x, s2 = d.sr;
    const L = Math.round(0.025 * s2), H = Math.round(0.010 * s2);
    let N = 1; while (N < L) N <<= 1;
    const { fb, dct } = bank(N, s2, alpha), win = new Float32Array(L);
    for (let i = 0; i < L; i++) win[i] = 0.54 - 0.46 * Math.cos(2 * Math.PI * i / (L - 1));
    const logm = [], en = [], re = new Float32Array(N), im = new Float32Array(N);
    for (let st = 0; st + L <= x.length; st += H) {
      re.fill(0); im.fill(0);
      for (let i = 0; i < L; i++) re[i] = (x[st + i] - (i ? 0.97 * x[st + i - 1] : 0)) * win[i];
      fft(re, im);
      const p = new Float32Array(N / 2 + 1); let tot = 0;
      for (let k = 0; k <= N / 2; k++) { p[k] = re[k] * re[k] + im[k] * im[k]; tot += p[k]; }
      const lm = new Float32Array(NF);
      for (let m = 0; m < NF; m++) { let a = 0; const f = fb[m]; for (let k = 0; k <= N / 2; k++) a += f[k] * p[k]; lm[m] = Math.log(a + 1e-9); }
      logm.push(lm); en.push(10 * Math.log10(tot + 1e-9));
    }
    if (!logm.length) return [];
    const sorted = en.slice().sort((a, b) => a - b), top = sorted[Math.floor(sorted.length * 0.95)], floor = sorted[Math.floor(sorted.length * 0.1)];
    const thr = Math.max(top - 28, floor + 9), out = [];
    for (let t = 0; t < logm.length; t++) {
      if (en[t] < thr) continue;
      const v = new Float32Array(NC);
      for (let c = 0; c < NC; c++) { let a = 0; for (let m = 0; m < NF; m++) a += dct[c][m] * logm[t][m]; v[c] = a; }
      out.push(v);
    }
    if (out.length < 5) return [];
    for (let c = 0; c < NC; c++) {                           // per-clip mean and variance normalisation: takes away the mic, the room and part of the voice
      let m = 0; for (const v of out) m += v[c]; m /= out.length;
      let s = 0; for (const v of out) s += (v[c] - m) * (v[c] - m); s = Math.sqrt(s / out.length) || 1;
      for (const v of out) v[c] = (v[c] - m) / s;
    }
    return out;
  }

  // distance between two feature sequences (smaller = more alike), DTW with a band, length-normalised
  function dtw(a, b) {
    const n = a.length, m = b.length; if (!n || !m) return Infinity;
    const band = Math.max(Math.round(0.4 * Math.max(n, m)), Math.abs(n - m) + 3);
    let prev = new Float32Array(m + 1).fill(Infinity), cur = new Float32Array(m + 1);
    prev[0] = 0;
    for (let i = 1; i <= n; i++) {
      cur.fill(Infinity);
      const j0 = Math.max(1, i - band), j1 = Math.min(m, i + band);
      for (let j = j0; j <= j1; j++) {
        let c = 0; const u = a[i - 1], v = b[j - 1];
        for (let k = 0; k < NC; k++) { const dd = u[k] - v[k]; c += dd * dd; }
        c = Math.sqrt(c);
        const best = Math.min(prev[j - 1] + 2 * c, prev[j] + c, cur[j - 1] + c);
        cur[j] = best;
      }
      const t = prev; prev = cur; cur = t;
    }
    return prev[m] / (n + m);
  }

  const WARPS = [0.8, 0.9, 1, 1.1, 1.2, 1.3];
  // the clip as several feature sequences, one per warp, so the best fitting voice size can be used
  function featuresMulti(pcm, sr, alphas) { return (alphas || WARPS).map(a => features(pcm, sr, a)).filter(f => f.length); }
  // refs: array per item of [feature sequences] (the recording of the letter, of the word, of both). Returns the distance per item.
  // q: one feature sequence or an array of them (from featuresMulti); each item gets its best distance over the warps
  function distances(q, refs) { const qs = q.length && q[0] && q[0].length !== undefined && typeof q[0][0] === 'object' ? q : [q]; return refs.map(vs => Math.min(...qs.map(a => Math.min(...vs.map(v => dtw(a, v)))))); }
  // 1 = the target item is the closest one
  function rankOf(dists, target) { let r = 1; for (let i = 0; i < dists.length; i++) if (i !== target && dists[i] < dists[target]) r++; return r; }
  // the decision: the target must be among the closest K items AND clearly closer than the typical item (so noise or silence is refused)
  function decide(dists, target, opt) {
    const K = opt && opt.k || 1, R = opt && opt.ratio || 0.9;
    const sorted = dists.slice().sort((a, b) => a - b), med = sorted[Math.floor(sorted.length / 2)];
    const rank = rankOf(dists, target);
    return { ok: isFinite(dists[target]) && rank <= K && dists[target] <= R * med, rank, d: dists[target], med };
  }
  return { features, featuresMulti, WARPS, dtw, distances, rankOf, decide, down };
});
