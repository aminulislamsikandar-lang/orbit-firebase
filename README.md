# Orbit AI Tutor (Firebase version)

- Website (`public/`) -> Firebase Hosting (free Spark plan)
- Google login -> Firebase Authentication
- Favourites, pins, settings per user -> Firestore (`firestore.rules`)
- AI answers (`server.js`, Gemini) -> Render free Web Service; it accepts only requests with a valid Firebase login token

## 1. Firebase (ek baar)
1. console.firebase.google.com -> Add project (naya, jaise `orbit-v2`). Google Analytics band rakh sakte ho. Plan Spark (free) hi rehne do.
2. Build -> Authentication -> Get started -> Sign-in method -> **Google** -> Enable -> Save.
3. Build -> Firestore Database -> Create database -> production mode, location `asia-south1`.
4. Project settings (gear) -> Your apps -> Web (`</>`) -> app register -> `firebaseConfig` copy karke `public/firebase-config.js` me paste karo.
5. `.firebaserc` me `YOUR_PROJECT_ID` ki jagah apna project id likho.

## 2. Render (AI server)
Environment variables:
- `GEMINI_API_KEY` = tumhari Gemini key
- `FIREBASE_PROJECT_ID` = Firebase project id
- `ALLOWED_ORIGINS` = `https://PROJECT_ID.web.app,https://PROJECT_ID.firebaseapp.com`

Build command `npm install`, start command `npm start`. Deploy hone par Render ka URL `public/config.js` me daalo.

## 2b. Video lessons (Backblaze B2)
1. B2 me **private** bucket banao. Application Key aisi banao jo sirf us bucket par ho, **Read Only** access ke saath.
2. Render env vars: `B2_ENDPOINT` (bucket page par "Endpoint", jaise `s3.us-west-004.backblazeb2.com`), `B2_KEY_ID`, `B2_APP_KEY`, `B2_BUCKET` (bucket ka naam).
3. Videos B2 me upload karo (mp4/H.264 sabse sahi chalta hai), phir `videos.js` me ek line add karo: `{ id, chapter, title, key, free }`. `key` = bucket ke andar file ka path.
4. Subscription lagani ho to Render me `REQUIRE_SUBSCRIPTION=true`. Phir Firebase Console -> Firestore me collection `subscriptions`, document id = student ka uid (Authentication tab me dikhta hai), field `until` (type timestamp). Jab tak `until` aage ki date hai tab tak video chalegi. `free: true` wali videos sabko dikhti hain.
5. App video ka link har baar server se leta hai, jo 1 ghante me expire ho jata hai. Bucket private rehta hai, to link share karne se video permanent public nahi hoti.

## 3. Deploy
```
npm install -g firebase-tools
firebase login
firebase deploy --only hosting,firestore:rules
```
Deploy se pehle `questions.json` apne aap ban jata hai (`build-questions.js`). Questions badalne ke baad bas dobara deploy karo.

## 4. Login domain
Authentication -> Settings -> Authorized domains me `PROJECT_ID.web.app` pehle se hota hai. Custom domain lagao to wahan add karna.

## Local test
`npm install`, `.env` me `GEMINI_API_KEY`, `FIREBASE_PROJECT_ID`, `ALLOWED_ORIGINS=http://localhost:3000`, phir `npm run dev`.
