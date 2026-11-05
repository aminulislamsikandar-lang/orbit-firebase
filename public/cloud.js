// Orbit: Google login (Firebase Auth) + per-user cloud copy of favourites, pins and settings (Firestore).
// If this file fails to load (for example offline), the app still works with data kept on the device.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js';
import { getAuth, onAuthStateChanged, signInWithPopup, signInWithRedirect, GoogleAuthProvider, signOut }
  from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc, deleteDoc, collection, getDocs }
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

window.CLOUD = {
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
  if (user) { try { await load(user); } catch (e) { console.warn('cloud load failed', e); } }
});
