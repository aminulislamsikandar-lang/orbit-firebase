// Bolo "Saath me bolo": the 2-hour recording for the parent. Core rules (silence, window, report cleaning, expiry) and the three routes
// (who may upload, who may listen, 2-hour deletion) against a tiny in-memory Firestore and store. No network.
const C = require('../public/bolorec-core.js'), R = require('../bolorec-routes.js');
let pass = 0, fail = 0;
const t = (name, ok, extra) => { if (ok) pass++; else { fail++; console.log('FAIL  ' + name + (extra ? '  ' + extra : '')); } };
const CODE = 'ABCD2345', KID = 'kid-1', PARENT = 'par-1', OTHER = 'other-9', MEN = 'men-1', MEN2 = 'men-2';
const fakeDb = () => {
  const links = { [CODE]: { kidUid: KID } }, parents = { [CODE]: { [PARENT]: { uid: PARENT } } }, mentors = {};
  const snap = v => ({ exists: v !== undefined, data: () => v });
  return { mentors, collection: n => ({ doc: id => ({ get: async () => snap(n === 'kidLinks' ? links[id] : undefined), collection: sub => ({ doc: u => ({ get: async () => snap(((sub === 'mentors' ? mentors : parents)[id] || {})[u]), update: async p => { Object.assign(mentors[id][u], p); } }) }) }) }) };
};
const memStore = () => { const m = new Map(); return { m, put: async (k, b) => { m.set(k, b); }, get: async k => m.get(k) || null, del: async k => { m.delete(k); }, list: async p => [...m.keys()].filter(k => k.startsWith(p)) }; };
const AUDIO = Buffer.alloc(900, 7).toString('base64');
const REP = { total: 3, letters: [{ i: 0, l: 'ক', t: 1000, s: 1 }, { i: 1, l: 'খ', t: 3500, s: 0 }, { i: 2, l: 'গ', t: 6000, s: 1 }] };

(async () => {
  // ---- core ----
  t('spoke: 250 ms of sound counts, less does not', C.spoke(250) && !C.spoke(249) && !C.spoke(0) && !C.spoke(undefined));
  t('window: lead + clip + quiet time, clip length is capped', C.windowMs(1000) === C.LEAD_MS + 1000 + C.GAP_MS && C.windowMs(1e9) === C.LEAD_MS + 10000 + C.GAP_MS && C.windowMs(-5) === C.LEAD_MS + C.GAP_MS);
  t('threshold: never below 0.02, 2.5 times the room noise above it', C.threshold(0) === 0.02 && Math.abs(C.threshold(0.1) - 0.25) < 1e-9);
  t('threshold: an optional lower floor works, the default stays 0.02', C.threshold(0, 0.015) === 0.015 && C.threshold(0) === 0.02 && Math.abs(C.threshold(0.1, 0.015) - 0.25) < 1e-9);
  t('ambient: one loud click in the quiet second does not set the room level; empty or bad input is 0', C.ambient([0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.5]) === 0.01 && C.ambient([]) === 0 && C.ambient(null) === 0 && C.ambient([0.02]) === 0.02);
  t('TTL is exactly 2 hours', C.TTL_MS === 7200000);
  t('ids: 13 digits + 6 chars, time can be read back', C.okId(C.newId(1700000000000)) && C.idTime(C.newId(1700000000123)) === 1700000000123 && !C.okId('../x') && !C.okId('1700000000000-ABCDEF'));
  t('expired: just under 2 hours is kept, 2 hours is gone, bad id is gone', !C.expired(C.newId(1000), 1000 + C.TTL_MS - 1) && C.expired(C.newId(1000), 1000 + C.TTL_MS) && C.expired('nope', 1));
  t('codes: 8 easy characters only', C.okCode('ABCD2345') && !C.okCode('ABCD234') && !C.okCode('ABCD234O') && !C.okCode('../../x'));
  t('mime: only webm, mp4, ogg (codec part ignored)', C.cleanMime('audio/webm;codecs=opus') === 'audio/webm' && C.cleanMime('audio/mp4') === 'audio/mp4' && C.cleanMime('text/html') === '' && C.extOf('audio/ogg') === 'ogg');
  const dirty = C.cleanReport({ total: 9999, letters: [{ i: '2', l: '<b>ক</b>"x', t: -5, s: 'yes' }, null, 'x', { i: 1e9, l: 'অ'.repeat(20), t: 1e12, s: 0 }] });
  t('cleanReport: tags and quotes removed, numbers limited, junk dropped', dirty.letters.length === 2 && !/[<>"&]/.test(dirty.letters[0].l) && dirty.letters[0].t === 0 && dirty.letters[0].s === 1 && dirty.letters[1].l.length === 8 && dirty.letters[1].t <= C.MAX_SESSION_MS && dirty.total <= C.MAX_LETTERS);
  t('cleanReport: junk input gives an empty report', C.cleanReport(null).letters.length === 0 && C.cleanReport('x').total === 0);
  t('silentOf lists the letters with no sound', C.silentOf(REP).length === 1 && C.silentOf(REP)[0].l === 'খ');

  const BC = require('../public/bolo-core.js');
  t('new topic "saath": same 40 letters and clips as Byanjan, its own progress key, Byanjan unchanged', BC.items('saath').length === 40 && BC.items('saath')[3].audio === BC.items('byanjan')[3].audio && BC.stateKey('saath') === 'saath' && BC.stateKey('byanjan') === 'byanjan' && BC.items('byanjan').length === 40);

  // ---- routes ----
  let clock = 1800000000000; const now = () => clock;
  const store = memStore(), DB = fakeDb(), S = R.make({ db: DB, store, now });
  let r = await S.upload({ uid: KID, body: { code: CODE, mime: 'audio/webm;codecs=opus', audio: AUDIO, report: REP } });
  t('child uploads own recording', r.status === 200 && C.okId(r.body.id) && r.body.expiresAt === clock + C.TTL_MS && store.m.size === 2);
  const id = r.body.id;
  t('upload: not logged in', (await S.upload({ body: { code: CODE } })).status === 401);
  t('upload: another login (not the child) is refused', (await S.upload({ uid: OTHER, body: { code: CODE, mime: 'audio/webm', audio: AUDIO, report: REP } })).status === 403);
  t('upload: the parent cannot upload for the child', (await S.upload({ uid: PARENT, body: { code: CODE, mime: 'audio/webm', audio: AUDIO, report: REP } })).status === 403);
  t('upload: wrong code, wrong format, empty, huge, not base64 all refused', (await S.upload({ uid: KID, body: { code: 'ZZZZ2222', mime: 'audio/webm', audio: AUDIO } })).status === 403
    && (await S.upload({ uid: KID, body: { code: 'bad', mime: 'audio/webm', audio: AUDIO } })).status === 400
    && (await S.upload({ uid: KID, body: { code: CODE, mime: 'video/mp4', audio: AUDIO } })).status === 400
    && (await S.upload({ uid: KID, body: { code: CODE, mime: 'audio/webm', audio: 'QQ==' } })).status === 400
    && (await S.upload({ uid: KID, body: { code: CODE, mime: 'audio/webm', audio: 'A'.repeat(C.MAX_AUDIO_B64 + 4) } })).status === 400
    && (await S.upload({ uid: KID, body: { code: CODE, mime: 'audio/webm', audio: '<script>' } })).status === 400);
  t('upload: no database means a clear 503', (await R.make({ db: null, store, now }).upload({ uid: KID, body: {} })).status === 503);

  r = await S.list({ uid: PARENT, body: { code: CODE } });
  t('parent sees the recording with its red letters', r.status === 200 && r.body.items.length === 1 && r.body.items[0].silent === 1 && r.body.items[0].letters[1].s === 0 && r.body.items[0].id === id && r.body.ttlMin === 120);
  t('list: the child and strangers cannot listen', (await S.list({ uid: KID, body: { code: CODE } })).status === 403 && (await S.list({ uid: OTHER, body: { code: CODE } })).status === 403 && (await S.list({ body: { code: CODE } })).status === 401);
  r = await S.get({ uid: PARENT, body: { code: CODE, id } });
  t('parent gets the audio back unchanged', r.status === 200 && r.body.audio === AUDIO && r.body.mime === 'audio/webm');
  t('get: stranger refused, bad id refused, unknown id not found', (await S.get({ uid: OTHER, body: { code: CODE, id } })).status === 403 && (await S.get({ uid: PARENT, body: { code: CODE, id: '../../x' } })).status === 400 && (await S.get({ uid: PARENT, body: { code: CODE, id: C.newId(clock) } })).status === 404);

  // ---- a mentor listens only while the parent's window is open ----
  const mreq = (uid, body) => ({ uid, body: { code: CODE, ...body } });
  DB.mentors[CODE] = { [MEN]: { uid: MEN, status: 'pending', listenUntil: clock + 3600000 } };
  t('mentor: a pending request cannot listen, even with a window', (await S.list(mreq(MEN, {}))).status === 403 && (await S.get(mreq(MEN, { id }))).status === 403);
  DB.mentors[CODE][MEN] = { uid: MEN, status: 'approved' };
  t('mentor: approved but no window = no recordings', (await S.list(mreq(MEN, {}))).status === 403 && (await S.get(mreq(MEN, { id }))).status === 403);
  DB.mentors[CODE][MEN].listenUntil = clock + 3600000;
  r = await S.list(mreq(MEN, {}));
  t('mentor: with the parent\'s window open the list works', r.status === 200 && r.body.items.length === 1 && r.body.items[0].letters.length === 3);
  r = await S.get(mreq(MEN, { id }));
  t('mentor: gets the audio, and the parent\'s log counts it', r.status === 200 && r.body.audio === AUDIO && DB.mentors[CODE][MEN].listenCount === 1 && DB.mentors[CODE][MEN].lastListenAt === clock);
  await S.get(mreq(MEN, { id }));
  t('mentor: the log counts every recording heard', DB.mentors[CODE][MEN].listenCount === 2);
  t('mentor: another mentor of nobody, the child and a stranger still get nothing', (await S.list(mreq(MEN2, {}))).status === 403 && (await S.list(mreq(KID, {}))).status === 403);
  t('mentor: cannot upload', (await S.upload(mreq(MEN, { mime: 'audio/webm', audio: AUDIO, report: REP }))).status === 403);
  DB.mentors[CODE][MEN].listenUntil = 0;
  t('mentor: the parent (or child) closes the window = refused at once', (await S.list(mreq(MEN, {}))).status === 403 && (await S.get(mreq(MEN, { id }))).status === 403);
  DB.mentors[CODE][MEN].listenUntil = clock + 1000; clock += 1000;
  t('mentor: the window ends exactly at its time', (await S.get(mreq(MEN, { id }))).status === 403);
  DB.mentors[CODE][MEN].listenUntil = 0;
  t('parent still hears everything', (await S.get({ uid: PARENT, body: { code: CODE, id } })).status === 200);
  clock -= 1000;

  clock += C.TTL_MS - 1000;
  t('1 hour 59 minutes later it is still there', (await S.get({ uid: PARENT, body: { code: CODE, id } })).status === 200);
  clock += 2000;
  t('after 2 hours: get says gone (410), list is empty', (await S.get({ uid: PARENT, body: { code: CODE, id } })).status === 410 && (await S.list({ uid: PARENT, body: { code: CODE } })).body.items.length === 0);
  await S.sweep(true);
  t('both files of an expired recording are deleted (by the sweep that runs on list, or the 10-minute one)', store.m.size === 0);
  await S.upload({ uid: KID, body: { code: CODE, mime: 'audio/mp4', audio: AUDIO, report: REP } });
  clock += 1000; await S.sweep(true);
  t('sweep keeps a fresh recording', store.m.size === 2);
  let blocked = 0; for (let i = 0; i < 40; i++) if ((await S.upload({ uid: KID, body: { code: CODE, mime: 'audio/webm', audio: AUDIO, report: REP } })).status === 429) blocked++;
  t('too many uploads in an hour are slowed down', blocked > 0);

  console.log(pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
})();
