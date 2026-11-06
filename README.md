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

## Add more questions
Questions are grouped as `courses` (class + subject) > `chapters` > `sections` > `questions`. Science (Class 10) lives in `questions.js`, English (Class 7) in `english7.js`, Mathematics (Class 7) in `maths7.js`, Science (Class 7) in `science7.js`; every course is listed at the bottom of `questions.js`. A chapter with `locked: true` (and no sections) shows a lock in the chapter index. A chapter can also have a hidden `context` (poem text, word meanings) that is only sent to the AI. Question ids must be unique across all courses (Class 7 English ids start with `e7c<chapter>-`). A question can have a `label` (for example `A1.`) instead of `Q1.`.
Older note: To add a chapter, add one more object to `chapters` (unique `no`, and question ids that start with `c<no>-`). A chapter switcher (Chapter 1, Chapter 2, ...) shows on Home when there is more than one chapter. Favourite and Pinned show items from all chapters.
A question can also have: `parts` (sub-questions), `options` (choices), `table: { head: [...], rows: [[...]] }` (a table shown under the question and sent to the AI), and a hidden `context` (for an Activity or figure the student does not see).

## 2b. Video lessons (Backblaze B2)
1. B2 me **private** bucket banao. Application Key aisi banao jo sirf us bucket par ho, **Read Only** access ke saath.
2. Render env vars: `B2_ENDPOINT` (bucket page par "Endpoint", jaise `s3.us-west-004.backblazeb2.com`), `B2_KEY_ID`, `B2_APP_KEY`, `B2_BUCKET` (bucket ka naam).
3. Videos B2 me upload karo (mp4/H.264 sabse sahi chalta hai), phir `videos.js` me ek line add karo: `{ id, course, chapter, title, key, free }` (`course` = course id from `questions.js`: `c10-science`, `c7-english`, `c7-maths` ya `c7-science`). `key` = bucket ke andar file ka path.
4. Subscription lagani ho to Render me `REQUIRE_SUBSCRIPTION=true`. Phir Firebase Console -> Firestore me collection `subscriptions`, document id = student ka uid (Authentication tab me dikhta hai), field `until` (type timestamp). Jab tak `until` aage ki date hai tab tak video chalegi. `free: true` wali videos sabko dikhti hain.
5. App video ka link har baar server se leta hai, jo 1 ghante me expire ho jata hai. Bucket private rehta hai, to link share karne se video permanent public nahi hoti.

## 3. Deploy
```
npm install -g firebase-tools
firebase login
firebase deploy --only hosting,firestore:rules
```
Deploy se pehle `questions.json` apne aap ban jata hai (`build-questions.js`, hidden `context` hata kar; `questions-public.js` dekho). Questions badalne ke baad bas dobara deploy karo.

## 4. Login domain
Authentication -> Settings -> Authorized domains me `PROJECT_ID.web.app` pehle se hota hai. Custom domain lagao to wahan add karna.

## Local test
`npm install`, `.env` me `GEMINI_API_KEY`, `FIREBASE_PROJECT_ID`, `ALLOWED_ORIGINS=http://localhost:3000`, phir `npm run dev`.

## More options (3-dot menu)
The last icon under an answer opens: Mnemonic, Analogy, Explain like a kid, Full marks answer, Key points, Common mistakes, Practice MCQ.
Results come from `POST /api/more` and are saved on the device (`orbit_more_v1`) per answer; they are dropped when the answer is regenerated.

## Navigation
Page 1: classes. Page 2: subjects of the class. Page 3: chapter index (chapters with no questions yet show a lock and say "Coming soon"). Then the chapter's questions.
The app remembers the last place (`orbit_nav_v1`) and opens there; the sidebar Home item goes back to page 1. The phone back button moves one level up.
