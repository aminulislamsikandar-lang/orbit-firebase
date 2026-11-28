// Orbit: Google login (Firebase Auth) + per-user cloud copy of favourites, pins and settings (Firestore).
// If this file fails to load (for example offline), the app still works with data kept on the device.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js';
import { getAuth, onAuthStateChanged, signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider, signOut }
  from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs, query, where, documentId, serverTimestamp, onSnapshot }
  from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js';
import { firebaseConfig } from './firebase-config.js';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
// authDomain is our own site (firebase-config.js), so the redirect login keeps working when the browser blocks storage of another domain (phone Chrome, Safari).
// If a redirect login comes back with an error, show it on the login screen instead of staying silent.
getRedirectResult(auth).catch(e => { try { if (window.onCloudLoginError) window.onCloudLoginError(e); } catch (x) {} console.warn('redirect login failed', e); });
const db = getFirestore(app);

let pushed = {};   // saved id -> JSON last written to the cloud (so only changes are sent)

async function load(user) {
  const uref = doc(db, 'users', user.uid);
  const [u, s] = await Promise.all([getDoc(uref), getDocs(collection(db, 'users', user.uid, 'saved'))]);
  const saved = {};
  s.forEach(d => { saved[d.id] = d.data(); });
  pushed = {};
  for (const id in saved) pushed[id] = JSON.stringify(saved[id]);
  const d = u.exists() ? u.data() : {};
  if (window.onCloudData) window.onCloudData({ saved, pins: d.pins || {}, settings: d.settings || null });
}

async function loadVideos() {
  try {
    const s = await getDocs(collection(db, 'videos'));
    const list = []; s.forEach(d => list.push({ id: d.id, ...d.data() }));
    if (window.onCloudVideos) window.onCloudVideos(list);
  } catch (e) { console.warn('videos load failed', e); }
}

// Optional YouTube links the admin attached to questions (collection ytLinks, doc id = question id): { questionId: videoId }.
async function loadYtLinks() {
  try {
    const s = await getDocs(collection(db, 'ytLinks'));
    const m = {}; s.forEach(d => { const v = d.data(); if (v && typeof v.yt === 'string') m[d.id] = v.yt; });
    window.__ytLinks = m;
    if (window.onCloudYt) window.onCloudYt(m);
  } catch (e) { console.warn('yt links load failed', e); }
}

async function loadPeople() {
  try {
    const s = await getDocs(collection(db, 'people'));
    const list = []; s.forEach(d => list.push({ id: d.id, ...d.data() }));
    if (window.onPeople) window.onPeople(list);
  } catch (e) { console.warn('people load failed', e); }
}

// A student's AI video for the admin to review: the SERVER writes it (daily limit, size and shape checks). firestore.rules no longer lets a browser create it.
async function postPending(body) {
  const u = auth.currentUser; if (!u) throw new Error('login');
  const tok = await u.getIdToken();
  const r = await fetch((window.ORBIT_API || '') + '/api/videoreq/pending', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error('pending ' + r.status);
  return r.json();
}
window.CLOUD = {
  // AI narration metadata (collection narration, doc id = lesson code): audio KEYS and timings only, never audio. Read: signed-in. Write: admin only (firestore.rules).
  narration: {
    async get(id) { const s = await getDoc(doc(db, 'narration', id)); return s.exists() ? s.data() : null; },
    set(id, data) { const d = JSON.parse(JSON.stringify(data)); d.updatedAt = serverTimestamp(); return setDoc(doc(db, 'narration', id), d); },
    del(id) { return deleteDoc(doc(db, 'narration', id)); }
  },
  // Report button (collection reports). Students add (max 5 a day, see firestore.rules); only the admin lists, marks and deletes.
  reports: {
    async add(d) {
      const u = auth.currentUser; if (!u) throw Object.assign(new Error('login'), { code: 'login' });
      const day = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const body = { ...d, uid: u.uid, at: serverTimestamp(), status: 'new' };
      for (let n = 1; n <= 5; n++) {   // a taken slot is refused by the rules (students can not update), so move on to the next one
        try { await setDoc(doc(db, 'reports', u.uid + '_' + day + '_' + n), body); return n; }
        catch (e) { if (!e || e.code !== 'permission-denied') throw e; }
      }
      throw Object.assign(new Error('limit'), { code: 'limit' });
    },
    async list() { const s = await getDocs(collection(db, 'reports')); const a = []; s.forEach(x => { const v = x.data(); a.push({ id: x.id, ...v, ts: v.at && v.at.toMillis ? v.at.toMillis() : 0 }); }); a.sort((x, y) => (y.ts || 0) - (x.ts || 0)); return a; },
    setStatus(id, status) { return updateDoc(doc(db, 'reports', id), { status }); },
    del(id) { return deleteDoc(doc(db, 'reports', id)); }
  },
  // Maths video plans (collection mathVideos, doc id = question code). Read: signed-in. Write: admin only (firestore.rules).
  mathVideo: {
    async get(code) { const s = await getDoc(doc(db, 'mathVideos', code)); return s.exists() ? s.data() : null; },
    set(code, plan) { return setDoc(doc(db, 'mathVideos', code), JSON.parse(JSON.stringify(plan))); },
    del(code) { return deleteDoc(doc(db, 'mathVideos', code)); },
    async list() { const s = await getDocs(collection(db, 'mathVideos')); const a = []; s.forEach(d => a.push(d.id)); return a; },
    // Get Video: approved library (mathVideoAsked, doc id = hash of the question) + student requests waiting for admin review (mathVideoPending)
    async askedGet(key) { const s = await getDoc(doc(db, 'mathVideoAsked', key)); return s.exists() ? s.data().plan || null : null; },
    askedSet(key, text, plan) { return setDoc(doc(db, 'mathVideoAsked', key), JSON.parse(JSON.stringify({ text, plan }))); },
    // qid (optional) = textbook question id from "Copy question"; the admin form uses it to fill Exercise / Question by itself
    pendingAdd(key, text, plan, qid) { return postPending({ store: 'math', key, text, plan, qid: qid || undefined }); },
    async pendingList() { const s = await getDocs(collection(db, 'mathVideoPending')); const a = []; s.forEach(d => a.push({ id: d.id, ...d.data() })); a.sort((x, y) => (y.ts || 0) - (x.ts || 0)); return a; },
    pendingDel(key) { return deleteDoc(doc(db, 'mathVideoPending', key)); },
    async byPrefix(prefix) {
      const q = query(collection(db, 'mathVideos'), where(documentId(), '>=', prefix), where(documentId(), '<', prefix + '\uf8ff'));
      const s = await getDocs(q); const m = {}; s.forEach(d => { m[d.id] = d.data(); }); return m;
    }
  },
  // Science Get Video: approved library (scienceVideoAsked) + student requests waiting for the admin (sciencePending). Same rules as the maths ones.
  scienceVideo: {
    async askedGet(key) { const s = await getDoc(doc(db, 'scienceVideoAsked', key)); return s.exists() ? s.data().plan || null : null; },
    askedSet(key, text, plan) { return setDoc(doc(db, 'scienceVideoAsked', key), JSON.parse(JSON.stringify({ text, plan }))); },
    pendingAdd(key, text, plan) { return postPending({ store: 'science', key, text, plan }); },
    async pendingList() { const s = await getDocs(collection(db, 'sciencePending')); const a = []; s.forEach(d => a.push({ id: d.id, ...d.data() })); a.sort((x, y) => (y.ts || 0) - (x.ts || 0)); return a; },
    pendingDel(key) { return deleteDoc(doc(db, 'sciencePending', key)); }
  },
  // Video lessons added from the admin panel (collection videos). Read: signed-in. Write: admin only (firestore.rules).
  videos: {
    async list() { const s = await getDocs(collection(db, 'videos')); const a = []; s.forEach(d => a.push({ id: d.id, ...d.data() })); return a; },
    set(v) { return setDoc(doc(db, 'videos', v.id), JSON.parse(JSON.stringify(v))); },
    del(id) { return deleteDoc(doc(db, 'videos', id)); },
    // content of JSON ("plan") and HTML videos: videoCode/{id} = {kind:'plan', plan} or {kind:'html', html}
    setCode(id, body) { return setDoc(doc(db, 'videoCode', id), JSON.parse(JSON.stringify(body))); },
    async getCode(id) { const s = await getDoc(doc(db, 'videoCode', id)); return s.exists() ? s.data() : null; },
    delCode(id) { return deleteDoc(doc(db, 'videoCode', id)); }
  },
  // Add custom course (collection customCourses, one document per subject; see firestore.rules). The owner reads/writes; other signed-in students
  // can only get() a document by its id while the owner has sharing on. A student keeps shared courses as users/<uid>/savedCourses/<id>.
  custom: {
    newId() { return doc(collection(db, 'customCourses')).id; },
    async listOwn() {
      const u = auth.currentUser; if (!u) return [];
      const s = await getDocs(query(collection(db, 'customCourses'), where('ownerId', '==', u.uid)));
      const a = []; s.forEach(d => a.push({ id: d.id, ...d.data() })); return a;
    },
    async get(id) {   // null when it does not exist or is not shared (rules answer "permission denied" for both)
      try { const s = await getDoc(doc(db, 'customCourses', id)); return s.exists() ? { id: s.id, ...s.data() } : null; }
      catch (e) { return null; }
    },
    set(id, data) { return setDoc(doc(db, 'customCourses', id), JSON.parse(JSON.stringify(data))); },
    del(id) { return deleteDoc(doc(db, 'customCourses', id)); },
    async savedIds() {
      const u = auth.currentUser; if (!u) return [];
      const s = await getDocs(collection(db, 'users', u.uid, 'savedCourses'));
      const a = []; s.forEach(d => a.push(d.id)); return a;
    },
    saveRef(id) { const u = auth.currentUser; if (!u) return Promise.reject(new Error('login')); return setDoc(doc(db, 'users', u.uid, 'savedCourses', id), { at: Date.now() }); },
    unsaveRef(id) { const u = auth.currentUser; if (!u) return Promise.reject(new Error('login')); return deleteDoc(doc(db, 'users', u.uid, 'savedCourses', id)); }
  },
  // Recall retention tracker (Task 15): users/<uid>/recall/tracker = { items: [{k, t, at}], updatedAt }. Covered by the per-user rule in firestore.rules.
  recall: {
    async get() {
      const u = auth.currentUser; if (!u) return null;
      const s = await getDoc(doc(db, 'users', u.uid, 'recall', 'tracker'));
      if (!s.exists()) return null;
      const d = s.data();
      return { items: Array.isArray(d.items) ? d.items : [], topics: d.topics && typeof d.topics === 'object' && !Array.isArray(d.topics) ? d.topics : {} };
    },
    // data = { items: [attempts], topics: { 'course|ch|tN': record } } (Phase 6: per-topic revision records live in the same document)
    set(data) {
      const u = auth.currentUser; if (!u) return Promise.reject(new Error('login'));
      return setDoc(doc(db, 'users', u.uid, 'recall', 'tracker'), { items: JSON.parse(JSON.stringify(data.items || [])), topics: JSON.parse(JSON.stringify(data.topics || {})), updatedAt: serverTimestamp() });
    }
  },
  // Chapter topics (Task 31): chapterTopics/<course>_<chapter>, written by the server only, readable by every signed-in student.
  topics: {
    async get(course, chNo) {
      const id = String(course).replace(/[^A-Za-z0-9-]/g, '') + '_' + Number(chNo);
      const s = await getDoc(doc(db, 'chapterTopics', id));
      return s.exists() ? s.data() : null;
    }
  },
  // Task 48: classes + homework (collection classes, doc id = 6-character class code; see firestore.rules). Teacher creates a class and homework;
  // a student joins with the code (members/<uid>) and marks homework done (done/<hw>_<uid>). Only a name and done flags are kept.
  classes: {
    async create(school, cls) {
      const u = auth.currentUser; if (!u) throw new Error('login');
      const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   // no I, O, 0, 1: easy to read aloud and copy
      for (let i = 0; i < 6; i++) {
        let code = ''; crypto.getRandomValues(new Uint8Array(6)).forEach(b => { code += A[b % A.length]; });
        let taken = false; try { taken = (await getDoc(doc(db, 'classes', code))).exists(); } catch (e) {}
        if (taken) continue;
        const d = { code, school, class: cls, teacherId: u.uid, createdAt: Date.now() };
        await setDoc(doc(db, 'classes', code), d); return d;
      }
      throw new Error('code');
    },
    async listOwn() {
      const u = auth.currentUser; if (!u) return [];
      const s = await getDocs(query(collection(db, 'classes'), where('teacherId', '==', u.uid)));
      const a = []; s.forEach(d => a.push(d.data())); return a;
    },
    async get(code) { try { const s = await getDoc(doc(db, 'classes', code)); return s.exists() ? s.data() : null; } catch (e) { return null; } },
    async myCodes() {
      const u = auth.currentUser; if (!u) return [];
      const s = await getDocs(collection(db, 'users', u.uid, 'classes')); const a = []; s.forEach(d => a.push(d.id)); return a;
    },
    async join(code, name) {
      const u = auth.currentUser; if (!u) throw new Error('login');
      await setDoc(doc(db, 'classes', code, 'members', u.uid), { uid: u.uid, name: String(name || 'Student').slice(0, 40), joinedAt: Date.now() });
      await setDoc(doc(db, 'users', u.uid, 'classes', code), { at: Date.now() });
    },
    async leave(code) {
      const u = auth.currentUser; if (!u) throw new Error('login');
      for (const sub of ['done', 'scores']) { try { const s = await getDocs(query(collection(db, 'classes', code, sub), where('uid', '==', u.uid))); await Promise.all(s.docs.map(d => deleteDoc(d.ref))); } catch (e) {} }
      try { await deleteDoc(doc(db, 'classes', code, 'members', u.uid)); } catch (e) {}
      await deleteDoc(doc(db, 'users', u.uid, 'classes', code));
    },
    async forget(code) { const u = auth.currentUser; if (u) await deleteDoc(doc(db, 'users', u.uid, 'classes', code)); },   // the class no longer exists: drop only the shortcut
    async members(code) { const s = await getDocs(collection(db, 'classes', code, 'members')); const a = []; s.forEach(d => a.push(d.data())); return a; },
    async hwList(code) { const s = await getDocs(collection(db, 'classes', code, 'homework')); const a = []; s.forEach(d => a.push({ id: d.id, ...d.data() })); return a; },
    async hwAdd(code, hw) { const id = doc(collection(db, 'classes', code, 'homework')).id; await setDoc(doc(db, 'classes', code, 'homework', id), JSON.parse(JSON.stringify(hw))); return id; },
    async hwDel(code, id) {
      try { const s = await getDocs(query(collection(db, 'classes', code, 'done'), where('hw', '==', id))); await Promise.all(s.docs.map(d => deleteDoc(d.ref))); } catch (e) {}
      await deleteDoc(doc(db, 'classes', code, 'homework', id));
    },
    scoreSet(code, ch, score) { const u = auth.currentUser; if (!u) return Promise.reject(new Error('login')); return setDoc(doc(db, 'classes', code, 'scores', ch + '_' + u.uid), { ch, uid: u.uid, score: Math.max(0, Math.min(100, Math.round(score))), at: Date.now() }); },
    async scoreList(code) { const s = await getDocs(collection(db, 'classes', code, 'scores')); const a = []; s.forEach(d => a.push(d.data())); return a; },   // teacher only (rules)
    async doneList(code, mineOnly) {   // teacher: everybody's; student: only their own
      const u = auth.currentUser; if (!u) return [];
      const c = collection(db, 'classes', code, 'done');
      const s = await getDocs(mineOnly ? query(c, where('uid', '==', u.uid)) : c); const a = []; s.forEach(d => a.push(d.data())); return a;
    },
    doneSet(code, hw) { const u = auth.currentUser; if (!u) return Promise.reject(new Error('login')); return setDoc(doc(db, 'classes', code, 'done', hw + '_' + u.uid), { hw, uid: u.uid, at: Date.now() }); },
    doneDel(code, hw) { const u = auth.currentUser; if (!u) return Promise.reject(new Error('login')); return deleteDoc(doc(db, 'classes', code, 'done', hw + '_' + u.uid)); },
    async removeClass(code) {   // teacher: removes the class with every member, homework and done record
      for (const sub of ['scores', 'done', 'homework', 'members']) { const s = await getDocs(collection(db, 'classes', code, sub)); await Promise.all(s.docs.map(d => deleteDoc(d.ref))); }
      await deleteDoc(doc(db, 'classes', code));
    }
  },
  // Faculty / Developer people. Writes only work for the admin Google account (see firestore.rules).
  savePerson(p) { return setDoc(doc(db, 'people', p.id), JSON.parse(JSON.stringify(p))); },
  deletePerson(id, tombstone) { return tombstone ? setDoc(doc(db, 'people', id), tombstone) : deleteDoc(doc(db, 'people', id)); },
  async login() {
    const provider = new GoogleAuthProvider();
    if (window.ORBIT_TWA) { await signInWithRedirect(auth, provider); return; }   // inside the Android app a pop-up window cannot hand the result back
    try { await signInWithPopup(auth, provider); }
    catch (e) {
      if (e.code === 'auth/popup-blocked') { await signInWithRedirect(auth, provider); return; }
      throw e;
    }
  },
  logout() { return signOut(auth); },
  // Admin-approved AI Kahani / Example (collection aicontent, doc id = question id + '__' + kind). Students can read only approved ones (firestore.rules).
  aicontent: {
    async get(id) { const s = await getDoc(doc(db, 'aicontent', id)); return s.exists() ? s.data() : null; },
    set(d) { return setDoc(doc(db, 'aicontent', d.qid + '__' + d.kind), JSON.parse(JSON.stringify(d))); },
    del(id) { return deleteDoc(doc(db, 'aicontent', id)); }
  },
  // Chapter quizzes (collection quizzes, doc id = course__chapter__level). Students get only approved ones (firestore.rules); the admin reads and writes all.
  quiz: {
    id(course, ch, level) { return course + '__' + ch + '__' + level; },
    async approved(course, ch) {
      const s = await getDocs(query(collection(db, 'quizzes'), where('course', '==', course), where('ch', '==', ch), where('status', '==', 'approved')));
      const a = []; s.forEach(d => a.push({ id: d.id, ...d.data() })); return a;
    },
    async approvedForCourse(course) {   // Mock test / Daily challenge: every approved quiz of one course (a query must say status == 'approved', firestore.rules)
      const s = await getDocs(query(collection(db, 'quizzes'), where('course', '==', course), where('status', '==', 'approved')));
      const a = []; s.forEach(d => a.push({ id: d.id, ...d.data() })); return a;
    },
    async forChapter(course, ch) {   // admin: every status
      const s = await getDocs(query(collection(db, 'quizzes'), where('course', '==', course), where('ch', '==', ch)));
      const a = []; s.forEach(d => a.push({ id: d.id, ...d.data() })); return a;
    },
    set(d) { return setDoc(doc(db, 'quizzes', d.course + '__' + d.ch + '__' + d.level), JSON.parse(JSON.stringify(d))); },
    del(id) { return deleteDoc(doc(db, 'quizzes', id)); }
  },
  // Parent consent for BYOK: users/{uid}/consent/byok (covered by the existing users/{uid}/** rule).
  async consentSet(d) { if (!auth.currentUser) throw new Error('login'); return setDoc(doc(db, 'users', auth.currentUser.uid, 'consent', 'byok'), { ...d, at: serverTimestamp() }); },
  async token() { return auth.currentUser ? auth.currentUser.getIdToken() : null; },
  async push({ saved, pins, settings }) {
    const user = auth.currentUser; if (!user) return;
    await setDoc(doc(db, 'users', user.uid), { pins, settings });
    for (const id in saved) {
      const entry = JSON.parse(JSON.stringify(saved[id]));
      const j = JSON.stringify(entry);
      if (pushed[id] === j) continue;
      await setDoc(doc(db, 'users', user.uid, 'saved', id), entry);
      pushed[id] = j;
    }
    for (const id of Object.keys(pushed)) {
      if (!saved[id]) { await deleteDoc(doc(db, 'users', user.uid, 'saved', id)); delete pushed[id]; }
    }
  }
};

// The student's course lock (School/Board + Class + Medium): one document per account. The student can create it once; only the admin can change it (firestore.rules).
window.CLOUD.course = {
  async get() {
    const u = auth.currentUser; if (!u) return null;
    const s = await getDoc(doc(db, 'studentCourse', u.uid)), d = s.exists() ? s.data() : null;
    if (d && d.kid === true) return { kid: true };
    if (d && d.own === true) return { own: true };
    return d && typeof d.org === 'string' ? { org: d.org, cls: +d.cls, med: d.med } : null;
  },
  async set(c) {
    const u = auth.currentUser; if (!u) throw new Error('login');
    await setDoc(doc(db, 'studentCourse', u.uid), c.kid ? { kid: true, at: Date.now() } : c.own ? { own: true, at: Date.now() } : { org: c.org, cls: +c.cls, med: c.med, at: Date.now() });   // fails if it already exists (update is admin-only)
  },
  async clear() {   // the student removes their own course lock (Course badlo); the lock stays until they do
    const u = auth.currentUser; if (!u) throw new Error('login');
    await deleteDoc(doc(db, 'studentCourse', u.uid));
  }
};

// Admin: attach / remove a YouTube video on one question (firestore.rules: only the admin account can write ytLinks).
window.CLOUD.ytLinks = {
  set(qid, yt) { return setDoc(doc(db, 'ytLinks', qid), { yt, at: serverTimestamp() }); },
  del(qid) { return deleteDoc(doc(db, 'ytLinks', qid)); }
};

// Kid mode: a parent connects to a child's phone with an 8-character code (firestore.rules: kidLinks). The child's phone shares a small summary, the parent sets the limit and the mic switch.
window.CLOUD.kids = {
  async create(name, nk) {   // nk = true: a Not Kid student's link (mentor messages only)
    const u = auth.currentUser; if (!u) throw new Error('login');
    const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   // no I, O, 0, 1: easy to read aloud and copy
    for (let i = 0; i < 6; i++) {
      let code = ''; crypto.getRandomValues(new Uint8Array(8)).forEach(b => { code += A[b % A.length]; });
      let taken = false; try { taken = (await getDoc(doc(db, 'kidLinks', code))).exists(); } catch (e) {}
      if (taken) continue;
      const d = { code, kidUid: u.uid, name: String(name || 'Bachcha').slice(0, 40) || 'Bachcha', createdAt: Date.now() };
      if (nk === true) d.nk = true;
      await setDoc(doc(db, 'kidLinks', code), d); return d;
    }
    throw new Error('code');
  },
  async own() { const u = auth.currentUser; if (!u) return null; const s = await getDocs(query(collection(db, 'kidLinks'), where('kidUid', '==', u.uid))); let a = null; s.forEach(d => { if (!a) a = d.data(); }); return a; },
  async link(code) { try { const s = await getDoc(doc(db, 'kidLinks', code)); return s.exists() ? s.data() : null; } catch (e) { return null; } },
  async parents(code) { const s = await getDocs(collection(db, 'kidLinks', code, 'parents')); const a = []; s.forEach(d => a.push(d.data())); return a; },
  async remove(code) {   // the child's phone stops sharing: the link and everything under it go
    for (const sub of ['parents', 'mentors', 'reviews']) { try { const s = await getDocs(collection(db, 'kidLinks', code, sub)); await Promise.all(s.docs.map(d => deleteDoc(d.ref))); } catch (e) {} }
    for (const id of ['sum', 'set', 'pres', 'wa', 'rep', 'live']) { try { await deleteDoc(doc(db, 'kidLinks', code, 'state', id)); } catch (e) {} }
    try { const ms = await getDocs(collection(db, 'kidLinks', code, 'msgs')); for (const m of ms.docs) { try { const rs = await getDocs(collection(m.ref, 'reps')); await Promise.all(rs.docs.map(d => deleteDoc(d.ref))); } catch (e) {} try { await deleteDoc(m.ref); } catch (e) {} } } catch (e) {}   // Sandesh messages and replies
    await deleteDoc(doc(db, 'kidLinks', code));
  },
  async putSum(code, sum) { await setDoc(doc(db, 'kidLinks', code, 'state', 'sum'), sum); },
  async getSum(code) { const s = await getDoc(doc(db, 'kidLinks', code, 'state', 'sum')); return s.exists() ? s.data() : null; },
  async getSet(code) { const s = await getDoc(doc(db, 'kidLinks', code, 'state', 'set')); return s.exists() ? s.data() : null; },
  async putSet(code, set) { await setDoc(doc(db, 'kidLinks', code, 'state', 'set'), set); },
  async join(code, name) {
    const u = auth.currentUser; if (!u) throw new Error('login');
    await setDoc(doc(db, 'kidLinks', code, 'parents', u.uid), { uid: u.uid, name: String(name || 'Parent').slice(0, 40) || 'Parent', joinedAt: Date.now() });
    await setDoc(doc(db, 'users', u.uid, 'kids', code), { at: Date.now() });
  },
  async myKids() { const u = auth.currentUser; if (!u) return []; const s = await getDocs(collection(db, 'users', u.uid, 'kids')); const a = []; s.forEach(d => a.push(d.id)); return a; },
  async leave(code) {
    const u = auth.currentUser; if (!u) throw new Error('login');
    try { await deleteDoc(doc(db, 'kidLinks', code, 'parents', u.uid)); } catch (e) {}
    await deleteDoc(doc(db, 'users', u.uid, 'kids', code));
  },
  async forget(code) { const u = auth.currentUser; if (u) await deleteDoc(doc(db, 'users', u.uid, 'kids', code)); },   // the child stopped sharing: drop only the shortcut
  // Online / Offline: written by the child's phone, read by the parent and by an approved mentor.
  async putPres(code, pres) { await setDoc(doc(db, 'kidLinks', code, 'state', 'pres'), pres); },
  async getPres(code) { const s = await getDoc(doc(db, 'kidLinks', code, 'state', 'pres')); return s.exists() ? s.data() : null; },
  async putLive(code, live) { await setDoc(doc(db, 'kidLinks', code, 'state', 'live'), live); },   // child's phone, only while a mentor's window is open: the words on the child's screen
  async getLive(code) { try { const s = await getDoc(doc(db, 'kidLinks', code, 'state', 'live')); return s.exists() ? s.data() : null; } catch (e) { return null; } },
  async delLive(code) { try { await deleteDoc(doc(db, 'kidLinks', code, 'state', 'live')); } catch (e) {} },
  async putRep(code, rep) { await setDoc(doc(db, 'kidLinks', code, 'state', 'rep'), rep); },   // the last 7 days and the items to repeat, for the mentor
  async getRep(code) { try { const s = await getDoc(doc(db, 'kidLinks', code, 'state', 'rep')); return s.exists() ? s.data() : null; } catch (e) { return null; } },
  async putWa(code, num) { await setDoc(doc(db, 'kidLinks', code, 'state', 'wa'), { num, at: Date.now() }); },
  async getWa(code) { try { const s = await getDoc(doc(db, 'kidLinks', code, 'state', 'wa')); return s.exists() ? s.data() : null; } catch (e) { return null; } },
  async delWa(code) { await deleteDoc(doc(db, 'kidLinks', code, 'state', 'wa')); },
  // Mentor: ask with the code (pending), a parent approves, the mentor then reads the child's Online / Offline and summary.
  async mentorAsk(code, name) {
    const u = auth.currentUser; if (!u) throw new Error('login');
    await setDoc(doc(db, 'kidLinks', code, 'mentors', u.uid), { uid: u.uid, name: String(name || 'Mentor').slice(0, 40) || 'Mentor', status: 'pending', at: Date.now() });
    await setDoc(doc(db, 'users', u.uid, 'mentees', code), { at: Date.now() });
  },
  async mentorMe(code) { const u = auth.currentUser; if (!u) return null; try { const s = await getDoc(doc(db, 'kidLinks', code, 'mentors', u.uid)); return s.exists() ? s.data() : null; } catch (e) { return null; } },
  async mentorWatchAsk(code, on) { const u = auth.currentUser; if (!u) throw new Error('login'); await updateDoc(doc(db, 'kidLinks', code, 'mentors', u.uid), { watchAsk: on ? Date.now() : 0 }); },   // mentor: ask to listen / watch (or withdraw)
  async mentorWatchNo(code, uid) { await updateDoc(doc(db, 'kidLinks', code, 'mentors', uid), { watchAsk: 0 }); },   // parent or the child's phone: say no to the ask
  async mentors(code) { const s = await getDocs(collection(db, 'kidLinks', code, 'mentors')); const a = []; s.forEach(d => a.push(d.data())); return a; },
  async mentorApprove(code, uid) { await updateDoc(doc(db, 'kidLinks', code, 'mentors', uid), { status: 'approved' }); },
  async mentorListen(code, uid, until) { await updateDoc(doc(db, 'kidLinks', code, 'mentors', uid), until > 0 ? { listenUntil: until, watchAsk: 0 } : { listenUntil: until }); },   // opening also clears the mentor's ask   // parent: open the window (at most 1 hour); parent or child: until = 0 closes it
  async getReview(code, rid) { try { const s = await getDoc(doc(db, 'kidLinks', code, 'reviews', rid)); return s.exists() ? s.data() : null; } catch (e) { return null; } },
  async putReview(code, rid, marks) { const u = auth.currentUser; if (!u) throw new Error('login'); await setDoc(doc(db, 'kidLinks', code, 'reviews', rid), { marks, by: u.uid, at: Date.now() }); },
  async reviews(code) { try { const s = await getDocs(collection(db, 'kidLinks', code, 'reviews')); const a = []; s.forEach(d => a.push({ id: d.id, ...d.data() })); return a; } catch (e) { return []; } },
  async mentorDrop(code, uid) { await deleteDoc(doc(db, 'kidLinks', code, 'mentors', uid)); },   // parent says no / removes, or the mentor leaves
  async myMentees() { const u = auth.currentUser; if (!u) return []; const s = await getDocs(collection(db, 'users', u.uid, 'mentees')); const a = []; s.forEach(d => a.push(d.id)); return a; },
  async menteeData() { const u = auth.currentUser; if (!u) return []; const s = await getDocs(collection(db, 'users', u.uid, 'mentees')); const a = []; s.forEach(d => a.push({ id: d.id, ...d.data() })); return a; },
  async menteeSet(code, patch) { const u = auth.currentUser; if (!u) throw new Error('login'); await setDoc(doc(db, 'users', u.uid, 'mentees', code), patch, { merge: true }); },   // the mentor's own notes (daily target): private
  async forgetMentee(code) { const u = auth.currentUser; if (u) await deleteDoc(doc(db, 'users', u.uid, 'mentees', code)); },
  // Sandesh: a mentor's message to the child (kidLinks/{code}/msgs/{id}); the child's phone adds shownAt / doneAt and replies (msgs/{id}/reps/{rid}).
  async msgSend(code, id, m) { await setDoc(doc(db, 'kidLinks', code, 'msgs', id), m); },
  async msgsMine(code) { const u = auth.currentUser; if (!u) return []; const s = await getDocs(query(collection(db, 'kidLinks', code, 'msgs'), where('from', '==', u.uid))); const a = []; s.forEach(d => a.push({ id: d.id, ...d.data() })); return a; },
  msgWatch(code, cb) { return onSnapshot(collection(db, 'kidLinks', code, 'msgs'), s => { const a = []; s.forEach(d => a.push({ id: d.id, ...d.data() })); cb(a); }, () => {}); },   // the child's phone: live, so a message appears at once
  async msgMark(code, id, patch) { await updateDoc(doc(db, 'kidLinks', code, 'msgs', id), patch); },
  async msgDel(code, id) { try { const rs = await getDocs(collection(db, 'kidLinks', code, 'msgs', id, 'reps')); await Promise.all(rs.docs.map(d => deleteDoc(d.ref))); } catch (e) {} await deleteDoc(doc(db, 'kidLinks', code, 'msgs', id)); },
  async repPut(code, mid, rid, rep) { await setDoc(doc(db, 'kidLinks', code, 'msgs', mid, 'reps', rid), rep); },
  async reps(code, mid) { try { const s = await getDocs(collection(db, 'kidLinks', code, 'msgs', mid, 'reps')); const a = []; s.forEach(d => a.push({ id: d.id, ...d.data() })); return a; } catch (e) { return []; } }
};

onAuthStateChanged(auth, async user => {
  if (window.onCloudUser) window.onCloudUser(user ? { uid: user.uid, name: user.displayName, email: user.email, photo: user.photoURL } : null);
  if (user) { loadPeople(); loadVideos(); loadYtLinks(); try { await load(user); } catch (e) { console.warn('cloud load failed', e); } }
});
