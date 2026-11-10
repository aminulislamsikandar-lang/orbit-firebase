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
Questions are grouped as `courses` (class + subject) > `chapters` > `sections` > `questions`. Science (Class 10) lives in `questions.js`, English (Class 7) in `english7.js`, English (Class 8, Assamese medium) in `english8.js`, Mathematics (Class 6) in `maths6.js`, Mathematics (Class 7) in `maths7.js`, Hindi (Class 6) in `hindi6.js`, Arabic (Class 6, English medium) in `arabic6.js`, Assamese (Class 6) in `assamese6.js`, Science (Class 7) in `science7.js`; every course is listed at the bottom of `questions.js`. A chapter with `locked: true` (and no sections) shows a lock in the chapter index. A chapter can also have a hidden `context` (poem text, word meanings) that is only sent to the AI. Question ids must be unique across all courses (Class 7 English ids start with `e7c<chapter>-`, Class 8 English with `e8c<chapter>-`). A course can have `medium: 'Assamese'`; courses without `medium` are English medium. A question can have a `label` (for example `A1.`) instead of `Q1.`.
Older note: To add a chapter, add one more object to `chapters` (unique `no`, and question ids that start with `c<no>-`). A chapter switcher (Chapter 1, Chapter 2, ...) shows on Home when there is more than one chapter. Favourite and Pinned show items from all chapters.
A question can also have: `parts` (sub-questions), `options` (choices), `table: { head: [...], rows: [[...]] }` (a table shown under the question and sent to the AI), and a hidden `context` (for an Activity or figure the student does not see).

## 2b. Video lessons (Backblaze B2)
1. B2 me **private** bucket banao. Application Key aisi banao jo sirf us bucket par ho, **Read Only** access ke saath.
2. Render env vars: `B2_ENDPOINT` (bucket page par "Endpoint", jaise `s3.us-west-004.backblazeb2.com`), `B2_KEY_ID`, `B2_APP_KEY`, `B2_BUCKET` (bucket ka naam).
3. Videos B2 me upload karo (mp4/H.264 sabse sahi chalta hai), phir `videos.js` me ek line add karo: `{ id, course, chapter, title, key, free }` (`course` = course id from `questions.js`: `c10-science`, `c7-english`, `c7-maths`, `c7-science`, `c6-hindi`, `c6-arabic`, `c6-assamese` ya `c6-maths`). `key` = bucket ke andar file ka path.
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

## Lesson reader and AI rules (Class 8 English)
A chapter can have `lesson` (paragraphs; for Class 8 English they are read from `lessons/<name>.txt`, one paragraph per block, blank line between, lines starting with `#` ignored) and `words` (Word Note list). With a lesson, the chapter page shows a "Lesson text" button: the student picks Assamese / Hinglish / Bengali and a style (paragraph, line by line, word meanings, meaning in brackets) and translates one paragraph, or the whole lesson (`POST /api/lesson`). A section can have `rules: { kind: 'grammar' | 'writing', topic }`; it shows a "Rules (AI)" box that explains the standard rules in the chosen language (`POST /api/rules`).

## Faculty and Developer pages (admin panel)
- Menu → Faculty / Developer show the people. Photos are stored (auto-resized, ~30-50 KB) in the Firestore collection `people`, so no Firebase Storage is needed.
- Admin panel: on the Faculty or Developer page, click the small "Orbit v1.0" button at the bottom, then type the PIN (nothing appears on screen). The panel opens with Add, Edit, Delete.
- The PIN only opens the panel. Saving works only for the admin Google account written in `firestore.rules` (replace `ADMIN_EMAIL_HERE`), then run `firebase deploy --only firestore:rules,hosting`.

## Class 6 Hindi (Nashib Ali Academy, English medium)
Course `c6-hindi` lives in `hindi6.js` (`sourceLang: 'Hindi'`). The poem goes in `lessons/h6c1.txt`: one stanza per block, blank line between stanzas, line breaks inside a stanza are kept. The AI answers in Hindi; the translate chips are English / Assamese / Bengali. Lesson reader styles: stanza, line by line, meaning (bhavarth), word meanings, meaning in brackets. Anunasik, Sangya and Vachan sections have the "Rules (AI)" box. The poem text is also sent to the AI as hidden context.

## Schools and what each school sees
`CATALOG` in `public/index.html` decides which course shows under which Board or School and class: `content: { nashib: { 6: [['c6-arabic','Arabic'],['c6-assamese','Assamese'],['c6-hindi','Hindi'],['c6-maths']], 7: [...] } }`. To show a course for another school, add its id there. Class 6 Arabic (lessons 1 and 2 open, 3 to 14 locked), Assamese, Hindi and Maths (Class 6) are shown for Nashib Ali Academy only.

## Admin mode: add a video to one question

1. Log in with the admin Google account, open the hidden Team admin panel (the same PIN as before) and press **Admin mode ON karo**.
2. A red "Admin mode ON · Exit" pill shows at the bottom of the app. Use the app like a student.
3. In admin mode a question's 3-dot menu has **Add video**. Pick a local `.mp4` (H.264), edit the title, press Upload.
   The file goes straight from the browser to the private Backblaze bucket and a record (with the question id `qid`) is saved in Firestore `videos`.
4. Every logged-in student now sees a **▶ title** button under that question. Admin mode also shows a **Hatao** button next to it (removes the record; the file stays in Backblaze).

Needs: `VIDEO_UPLOAD=true` on Render, a CORS rule on the Backblaze bucket (PUT from the site), and `firebase deploy --only firestore:rules` (the `videos` rule now allows the optional `qid` field).
Files: `public/qvideo.js` (new), `public/index.html`, `public/team.js`, `firestore.rules`.

## Analytics (Google Analytics 4 + Microsoft Clarity)

1. Open `public/analytics.js` and paste your two IDs at the top: `GA4_ID` (G-XXXXXXXXXX) and `CLARITY_ID` (10 characters). An empty ID means that tool is not loaded. Then `firebase deploy --only hosting`.
2. GA4 shows visitors, screens (virtual page_view for every screen of the one-page app) and events: `ai_answer`, `save_answer`, `translate`, `diagram`, `listen`, `copy_answer`, `pin_question`, `video_play`, `public_video_open`, `get_video_generate`, `login_click`, `login`.
   To break events down by question or chapter, register the event parameters as custom dimensions in GA4 (Admin > Custom definitions): `question_id`, `course`, `chapter`, `video_id`, `kind`, `language`.
3. Clarity gives heatmaps and session recordings. Set Settings > Masking to **Strict**. The profile block and the Get Video text box are already marked `data-clarity-mask`.
4. Privacy defaults: no user id, Google signals and ad personalisation off, ad consent denied, no question text or answers sent, admin accounts and localhost are not counted.
