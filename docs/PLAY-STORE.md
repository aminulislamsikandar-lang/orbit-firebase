# Orbit: Google Play Store (Trusted Web Activity)

Orbit is a PWA, so the Play Store app is a thin Android shell (Trusted Web Activity, TWA) that opens https://orbittutorial.web.app full screen. No second code base: every `firebase deploy` updates the app too.

## Rules that apply today (checked 20 Nov 2026)
- New apps and updates must target **Android 16 (API 36)**: Bubblewrap **1.25.0 or newer** (this repo's config was written for the current 1.27.x).
- A **personal** Play Console account created after 13 Nov 2023 must first run a **closed test: at least 12 testers, opted in continuously for 14 days**, before it can apply for production. An organization account (needs a D-U-N-S number) is exempt.
- One-time Play Console fee (USD 25) + identity verification.

## Decisions only the owner can make (they cannot be changed later or are costly to change)
1. **Package name** `app.web.orbittutorial` (in `android/twa-manifest.json`). It can never be changed after the first upload.
2. **Account type**: personal (12-tester test) or organization.
3. **Target age** in Play Console. Orbit has Class 6 students (about 11-12) and Bolo for small children. If the audience includes children **under 13**, the Play *Families policy* applies (no persistent-ID analytics, no session recording, a privacy policy that covers children, ads only from certified networks). That is why the Android app turns **Google Analytics and Microsoft Clarity off** (`window.ORBIT_TWA`, `public/analytics.js`). The website keeps them.
4. **Money**: if the app ever charges for digital content (courses, locked chapters), Play requires Google Play Billing. Free means nothing to do.

## One-time setup (PowerShell, Node 18+ and JDK 17 needed; Bubblewrap offers to download the Android SDK)
```powershell
npm i -g @bubblewrap/cli
cd android
bubblewrap init --manifest=https://orbittutorial.web.app/manifest.webmanifest
#   accept the answers from twa-manifest.json; when it asks for a signing key choose "create new" (orbit-upload.keystore, alias orbit-upload)
bubblewrap build          # makes app-release-bundle.aab  (upload this) and app-release-signed.apk (test on a phone)
bubblewrap fingerprint    # prints the SHA-256 of the signing key
```
**Back up `android/orbit-upload.keystore` and its password in two places. Never commit it (.gitignore already blocks it).**

## Link the site and the app (Digital Asset Links), otherwise the address bar shows
1. In Play Console > Setup > **App signing**, copy the **SHA-256 of the app signing key** (Play re-signs the app; this one matters most). Add the upload-key SHA-256 from `bubblewrap fingerprint` too.
2. Put both into `public/.well-known/assetlinks.json`:
```json
[{ "relation": ["delegate_permission/common.handle_all_urls"],
   "target": { "namespace": "android_app", "package_name": "app.web.orbittutorial",
               "sha256_cert_fingerprints": ["AA:BB:...:SIGNING_KEY", "CC:DD:...:UPLOAD_KEY"] } }]
```
3. `firebase deploy --only hosting`, then open https://orbittutorial.web.app/.well-known/assetlinks.json to see it.

## Test on a real phone before uploading (these are the three risks)
- **Google login** inside the app (it uses redirect there). If it comes back not logged in, the fix is a same-domain `authDomain`; tell the developer.
- **Microphone** for Bolo: the permission prompt appears and recording works.
- **Back button** and opening Orbit links from WhatsApp.

## Play Console checklist
- Store listing: name, short (80 chars) and full description, **512x512 icon**, **1024x500 feature graphic**, at least 2 phone screenshots.
- **Privacy policy URL** (required; the app asks for sign-in and Bolo can record a child's voice). It must state: Google sign-in (name, email) through Firebase; study progress; Bolo "Saath me bolo" voice recording kept 2 hours on the phone and, in Kid mode, sent to the linked parent; AI answers processed by the server; who to contact; how to delete data.
- **Data safety form**: declare account info (email, name), app activity, and **voice or sound recordings** (Bolo, deleted after 2 hours). Declare as encrypted in transit; users can ask for deletion.
- Content rating questionnaire, target audience, "contains ads: no", news / government / health declarations (all no).
- Closed test (personal account): upload the .aab to **Closed testing**, add 12+ Gmail testers, keep them opted in 14 days, then **Apply for production**.
- Every release: raise `appVersionCode` in `android/twa-manifest.json`, `bubblewrap update`, `bubblewrap build`, upload. Content changes need no release (they ship with `firebase deploy`).
