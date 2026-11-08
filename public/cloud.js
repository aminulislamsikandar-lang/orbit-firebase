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
    async byPrefix(prefix) {
      const q = query(collection(db, 'mathVideos'), where(documentId(), '>=', prefix), where(documentId(), '<', prefix + '\uf8ff'));
      const s = await getDocs(q); const m = {}; s.forEach(d => { m[d.id] = d.data(); }); return m;
    }
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
  if (user) { loadPeople(); try { await load(user); } catch (e) { console.warn('cloud load failed', e); } }
});
