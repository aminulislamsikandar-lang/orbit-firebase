/* Tests for the audio-clock scheduler (public/narration-sync.js). Run: node tests/narration-sync.test.js  (no packages, no network) */
const path = require('path');
const S = require(path.join(__dirname, '..', 'public/narration-sync.js'));
let pass = 0, fail = 0;
function t(name, ok, extra) { if (ok) { pass++; console.log('PASS  ' + name); } else { fail++; console.log('FAIL  ' + name + (extra ? '  -> ' + extra : '')); } }

function rig(events) {
  const log = [];
  const h = {
    reset: () => log.push('reset'),
    start: (ev, inst) => log.push('start:' + (ev.kind === 'cue' ? 'cue' + ev.cue : ev.target + '/' + ev.action) + (inst ? ':instant' : '')),
    end: (ev, inst) => log.push('end:' + (ev.kind === 'cue' ? 'cue' + ev.cue : ev.target) + (inst ? ':instant' : ''))
  };
  return { log, s: S.createScheduler(events, h) };
}
const walk = (s, from, to) => { for (let x = from; x < to; x += 0.25) s.sync(Math.round(x * 100) / 100); s.sync(to); };   // timeupdate arrives about every 0.25s
const car = { start: 2.4, end: 5.5, kind: 'sprite', target: 'car', action: 'enter', order: 1000 };
const bird = { start: 8.2, end: 13, kind: 'sprite', target: 'bird', action: 'appear-and-flap', order: 1001 };
const cue0 = { start: 1, end: null, kind: 'cue', cue: 0, order: 0 };

{ const { log, s } = rig([cue0, car, bird]);
  s.sync(0.5); s.sync(0.9);
  t('nothing fires before its start time', log.length === 0);
  s.sync(1.1); t('cue starts (animated) when audio time passes its start', log.join() === 'start:cue0');
  s.sync(1.3); s.sync(1.5); t('an event starts only once', log.length === 1);
  walk(s, 1.5, 2.5); t('sprite starts at its time', log[log.length - 1] === 'start:car/enter');
  walk(s, 2.5, 5.6); t('sprite ends after its end time (loops stop)', log[log.length - 1] === 'end:car');
  walk(s, 5.6, 8.6); walk(s, 8.6, 13.1); t('second sprite starts then ends', log.includes('start:bird/appear-and-flap') && log[log.length - 1] === 'end:bird'); }

{ const { log, s } = rig([cue0, car, bird]);
  s.sync(0.2); s.sync(0.5); s.sync(9); // forward jump of > 1.5s
  t('big forward jump (seek) rebuilds state instantly, in order', log.join() === 'reset,start:cue0:instant,start:car/enter:instant,end:car:instant,start:bird/appear-and-flap:instant', log.join());
  log.length = 0; s.sync(3);
  t('seeking backwards resets and restores only what existed at that time', log.join() === 'reset,start:cue0:instant,start:car/enter:instant', log.join());
  log.length = 0; walk(s, 3, 5.7);
  t('after a restore, normal playback continues from there', log.join() === 'end:car', log.join()); }

{ const { log, s } = rig([cue0, car]);
  s.sync(4, { restore: true });
  t('restore:true forces an instant rebuild (e.g. the seeked event)', log.join() === 'reset,start:cue0:instant,start:car/enter:instant');
  s.reset(); t('reset() clears everything', log[log.length - 1] === 'reset');
  log.length = 0; s.sync(0.1); s.sync(1.2);
  t('replay from zero fires events again', log.join() === 'start:cue0', log.join()); }

{ const { s } = rig([cue0, car, bird]);
  s.sync(0.1);
  t('nextAt gives the next start', s.nextAt(0.1) === 1);
  s.sync(1.2); t('nextAt after a cue is the sprite start', s.nextAt(1.2) === 2.4);
  s.sync(2.5); t('nextAt for an active sprite is its end', s.nextAt(2.5) === 5.5);
  s.sync(13.5); t('nothing left -> null', s.nextAt(13.5) === null); }

{ const { log, s } = rig([{ start: 3, end: null, kind: 'sprite', target: 'sun', action: 'highlight', order: 1000 }]);
  s.sync(2.9); s.sync(3.1); s.sync(40, { restore: true });
  t('event without end stays active (no end call)', !log.some(l => l.startsWith('end:'))); }

// ---- buildEvents ----
{ const ev = S.buildEvents({ events: [{ start: 2.4, end: 5.5, target: 'car', action: 'enter' }, { start: 3, cue: 1 }, { start: 9, target: 'ghost', action: 'enter' }, { start: 4, target: 'car', action: 'fly' }, { start: -1, cue: 0 }] }, 2, ['car'], 20);
  t('buildEvents keeps valid sprite + cue events', ev.some(e => e.kind === 'sprite' && e.target === 'car') && ev.filter(e => e.kind === 'cue').length === 2);
  t('unknown target / bad action / negative start are skipped and reported', ev.skipped.length === 3, JSON.stringify(ev.skipped));
  t('events are sorted by start time', ev.every((e, i) => i === 0 || ev[i - 1].start <= e.start));
  const c1 = ev.filter(e => e.kind === 'cue' && e.cue === 1)[0];
  t('admin-set cue time is used, the unset cue gets an automatic time', c1.start === 3 && ev.filter(e => e.kind === 'cue' && e.cue === 0)[0].start >= 0.5); }
{ const a = S.autoStarts(4, 20);
  t('auto cue times are increasing and inside the audio', a.every((x, i) => i === 0 || a[i - 1] < x) && a[3] < 20);
  const b = S.autoStarts(8, 5);
  t('many cues on short audio still fit inside it', b[7] < 5, JSON.stringify(b)); }
{ const ev = S.buildEvents({ events: [{ start: 50, target: 'car', action: 'enter' }] }, 0, ['car'], 10);
  t('event after the end of the audio is pulled inside it', ev[0].start < 10); }

// ---- validateEvents ----
{ t('valid events -> no errors', S.validateEvents([{ start: 1, end: 3, target: 'car', action: 'enter' }, { start: 2, cue: 0 }], 1, ['car'], 10).length === 0);
  const bad = S.validateEvents([{ start: -1, cue: 0 }, { start: 2, end: 1, target: 'car', action: 'enter' }, { start: 3, target: 'x', action: 'enter' }, { start: 3, target: 'car', action: 'zzz' }, { start: 99, cue: 5 }, { start: 1 }], 1, ['car'], 10);
  t('validateEvents reports each kind of mistake', bad.length >= 6, bad.length + ' errors'); }

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
