// Orbit: Google login (Firebase Auth) + per-user cloud copy of favourites, pins and settings (Firestore).
// If this file fails to load (for example offline), the app still works with data kept on the device.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js';
import { getAuth, onAuthStateChanged, signInWithPopup, signInWithRedirect, GoogleAuthProvider, signOut }
  from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc, deleteDoc, collection, getDocs, query, where, documentId }
  from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js';
import { firebaseConfig } from './firebase-config.js';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
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

async function loadPeople() {
  try {
    const s = await getDocs(collection(db, 'people'));
    const list = []; s.forEach(d => list.push({ id: d.id, ...d.data() }));
    if (window.onPeople) window.onPeople(list);
  } catch (e) { console.warn('people load failed', e); }
}

window.CLOUD = {
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
    pendingAdd(key, text, plan, qid) {
      const u = auth.currentUser; if (!u) return Promise.reject(new Error('login'));
      const d = { text, plan, uid: u.uid, ts: Date.now() };
      if (qid) d.qid = qid;
      return setDoc(doc(db, 'mathVideoPending', key), JSON.parse(JSON.stringify(d)));
    },
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
    pendingAdd(key, text, plan) {
      const u = auth.currentUser; if (!u) return Promise.reject(new Error('login'));
      return setDoc(doc(db, 'sciencePending', key), JSON.parse(JSON.stringify({ text, plan, uid: u.uid, ts: Date.now() })));
    },
    async pendingList() { const s = await getDocs(collection(db, 'sciencePending')); const a = []; s.forEach(d => a.push({ id: d.id, ...d.data() })); a.sort((x, y) => (y.ts || 0) - (x.ts || 0)); return a; },
    pendingDel(key) { return deleteDoc(doc(db, 'sciencePending', key)); }
  },
  // Video lessons added from the admin panel (collection videos). Read: signed-in. Write: admin only (firestore.rules).
  videos: {
    async list() { const s = await getDocs(collection(db, 'videos')); const a = []; s.forEach(d => a.push({ id: d.id, ...d.data() })); return a; },
    set(v) { return setDoc(doc(db, 'videos', v.id), JSON.parse(JSON.stringify(v))); },
    del(id) { return deleteDoc(doc(db, 'videos', id)); }
  },
  // Faculty / Developer people. Writes only work for the admin Google account (see firestore.rules).
  savePerson(p) { return setDoc(doc(db, 'people', p.id), JSON.parse(JSON.stringify(p))); },
  deletePerson(id, tombstone) { return tombstone ? setDoc(doc(db, 'people', id), tombstone) : deleteDoc(doc(db, 'people', id)); },
  async login() {
    const provider = new GoogleAuthProvider();
    try { await signInWithPopup(auth, provider); }
    catch (e) {
      if (e.code === 'auth/popup-blocked') { await signInWithRedirect(auth, provider); return; }
      throw e;
    }
  },
  logout() { return signOut(auth); },
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

onAuthStateChanged(auth, async user => {
  if (window.onCloudUser) window.onCloudUser(user ? { uid: user.uid, name: user.displayName, email: user.email, photo: user.photoURL } : null);
  if (user) { loadPeople(); loadVideos(); try { await load(user); } catch (e) { console.warn('cloud load failed', e); } }
});
