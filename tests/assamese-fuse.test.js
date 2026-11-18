// Assamese fusion (public/assamese-fuse.js): how the browser listener, the voice match and the AI check are weighed. Run: node tests/assamese-fuse.test.js
const F = require('../public/assamese-fuse.js');
let pass = 0, fail = 0;
const t = (n, ok, extra) => { if (ok) pass++; else { fail++; console.log('FAIL  ' + n + (extra ? '  ' + extra : '')); } };
const D = (sr, vm, ai) => F.decide({ sr: { state: sr }, vm: { state: vm }, ai: { state: ai } }).verdict;

// one listener alone
t('browser heard the item: pass', D('yes', 'none', 'none') === 'pass');
t('voice match says yes: pass', D('none', 'yes', 'none') === 'pass' && D('none', 'strong_yes', 'none') === 'pass');
t('AI says yes: pass', D('none', 'none', 'yes') === 'pass');
t('browser heard a different word, nothing else: fail', D('no', 'none', 'none') === 'fail');
t('voice match no, nothing else: fail', D('none', 'no', 'none') === 'fail' && D('none', 'strong_no', 'none') === 'fail');
t('AI says no, nothing else: fail', D('none', 'none', 'no') === 'fail');
t('nobody heard anything: verdict none (not "wrong")', D('none', 'none', 'none') === 'none');

// two listeners
t('both agree it is right: pass', D('yes', 'yes', 'none') === 'pass' && D('yes', 'strong_yes', 'none') === 'pass');
t('browser yes, voice match is only unsure (weak no): still pass (a child voice often fails the match)', D('yes', 'no', 'none') === 'pass');
t('browser yes but the voice clearly sounds like another item: unsure, no praise and no wrong mark', D('yes', 'strong_no', 'none') === 'unsure');
t('browser heard another word but the voice match is clearly right: pass only when the match is strong', D('no', 'strong_yes', 'none') === 'pass' && D('no', 'yes', 'none') === 'unsure');
t('both say no: fail', D('no', 'no', 'none') === 'fail' && D('no', 'strong_no', 'none') === 'fail');
t('browser yes + AI no: AI wins, not a pass', D('yes', 'none', 'no') !== 'pass');
t('AI yes + both others against: not a pass', D('no', 'strong_no', 'yes') !== 'pass');
t('AI yes + browser yes + match yes: pass', D('yes', 'yes', 'yes') === 'pass');
t('AI no + browser yes + match yes: not a pass (AI is the strongest voice)', D('yes', 'yes', 'no') !== 'pass');

// robustness of the call itself
t('missing pieces are treated as none', F.decide({}).verdict === 'none' && F.decide(null).verdict === 'none' && F.decide({ sr: { state: 'yes' } }).verdict === 'pass');
t('the score is reported', F.decide({ sr: { state: 'yes' }, vm: { state: 'yes' } }).score === 1.8);

// vmState from distances
const d = (best, target, n, med) => { const a = Array(n).fill(med); a[best] = 0.4 * med; a[target] = best === target ? 0.4 * med : a[target]; return a; };
let s = F.vmState(d(3, 3, 23, 10), 3);
t('target is the clearest match: strong_yes, rank 1', s.state === 'strong_yes' && s.rank === 1);
const second = Array(23).fill(10); second[5] = 6; second[3] = 7.8;
s = F.vmState(second, 3);
t('target is second best and clearly closer than the median: yes', s.state === 'yes' && s.rank === 2, JSON.stringify(s));
const other = Array(23).fill(10); other[7] = 5; other[3] = 9.5;
s = F.vmState(other, 3);
t('another item is a clear match and the target is far down: strong_no', s.state === 'strong_no' && s.best === 7, JSON.stringify(s));
const flat = Array(23).fill(10); flat[3] = 9.8; flat[4] = 9.7; flat[5] = 9.6;
t('no clear winner (noise): no, never yes', ['no'].includes(F.vmState(flat, 3).state));
t('no distances or an infinite target: none', F.vmState([], 0).state === 'none' && F.vmState([Infinity, 1], 0).state === 'none' && F.vmState(null, 0).state === 'none');

console.log(pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
