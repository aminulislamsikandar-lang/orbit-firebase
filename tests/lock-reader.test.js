/* Tests for course-lock-core.js makeLockReader: the course lock stays CLOSED when Firestore fails (last known lock, else an error the server turns into 503).
 * Run: node tests/lock-reader.test.js */
const path = require('path');
const C = require(path.join(__dirname, '..', 'course-lock-core.js'));
let pass = 0, fail = 0;
const t = (name, ok, extra) => { if (ok) { pass++; console.log('PASS  ' + name); } else { fail++; console.log('FAIL  ' + name + (extra ? '  -> ' + extra : '')); } };
(async () => {
  let clock = 1e9, reads = 0, down = false, doc = { org: 'seba', cls: 10, med: 'Assamese' }; const warns = [];
  const R = C.makeLockReader({ readDoc: async () => { reads++; if (down) throw new Error('firestore down'); return doc; }, now: () => clock, warn: m => warns.push(m) });
  t('first read goes to Firestore and is cached', (await R.get('u1')).cls === 10 && reads === 1);
  t('second read within 10 minutes uses the cache', (await R.get('u1')).cls === 10 && reads === 1);
  clock += 11 * 60000; down = true;
  t('Firestore down + a recent lock: the last known lock is used (closed, not open)', (await R.get('u1')).cls === 10 && reads === 2 && warns.length === 1);
  t('the warning is logged once, not on every request', (await R.get('u1'), await R.get('u1'), warns.length === 1));
  clock += 25 * 3600000;
  let threw = false; try { await R.get('u1'); } catch (e) { threw = true; }
  t('Firestore down + the lock is older than 24 h: the error is thrown (server answers 503)', threw);
  let threw2 = false; try { await R.get('never-seen'); } catch (e) { threw2 = true; }
  t('Firestore down + no lock ever known: the error is thrown (server answers 503), never "allowed"', threw2);
  down = false; doc = null;
  t('"no course yet" (null) is not cached: choosing a course works at once', (await R.get('u2')) === null && R.size() === 1 && (doc = { org: 'cbse', cls: 7, med: 'English' }, (await R.get('u2')).cls === 7));
  const e1 = R.peek('u2'); R.forget('u2');
  t('forget() removes it, restore() puts it back (used when the second read fails)', R.peek('u2') === undefined && (R.restore('u2', e1), R.peek('u2') === e1));
  const small = C.makeLockReader({ readDoc: async () => ({ kid: true }), maxSize: 2 }); await small.get('a'); await small.get('b'); await small.get('c'); small.prune();
  t('prune() empties an over-full cache', small.size() === 0);
  console.log('\n' + pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
})();
