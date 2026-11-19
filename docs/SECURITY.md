# Orbit security notes

Orbit's students are children. The most sensitive things in the app are the **parent's Gemini key** and the **students' own text**. This page says what protects them, how to read the reports, and what is still open.

## What is in place

| Area | What it does | Where |
|---|---|---|
| Parent's Gemini key | Stored only on the device, per logged-in account (`orbit.pk.<uid>`). Sent in the `X-User-Key` header, never stored or logged on the server (logs say `own-key`). Used for every AI call of that student and never mixed with the shared keys or backup providers. | `public/parent-key.js`, `server.js` (`geminiFor`) |
| Parent consent | Recorded in Firestore (`users/{uid}/consent/byok`) **before** the key is saved. | `parent-key.js`, `cloud.js` |
| Session recording | The key box carries `data-clarity-mask="true"`, so Clarity never records it, even when "Dikhao" shows the text. | `parent-key.js` |
| Page text | AI answers go through `fmt()` which escapes first; everything else uses `esc()` or `textContent`. A test fails if a new `innerHTML`, `eval`, `new Function`, `document.write` or `insertAdjacentHTML` appears. | `tests/security.test.js` |
| HTML videos | Run in an iframe with `sandbox="allow-scripts"` (no same-origin), and `/public-videos/**` is also served with a CSP `sandbox` header. They cannot read the login, storage or the parent's key. | `index.html`, `firebase.json` |
| Headers (website) | `nosniff`, strict referrer, no framing, permissions policy (microphone only for the app itself), plus a **Report-Only** Content-Security-Policy. | `firebase.json` (Firebase Hosting serves the pages) |
| Headers (API server) | Same basics on every response, `Cache-Control: no-store` for personal API answers, `X-Powered-By` off. | `security.js` |
| Rate limit | 20 AI requests / minute and 40 picture searches / minute **per logged-in student**, not per IP (a school WiFi, or Render's proxy, gives many students one IP). Idle entries are pruned. | `security.js`, `server.js` |
| Admin | Server checks the verified Firebase token, verified e-mail and the admin list. | `server.js` (`isAdminReq`) |

## Content-Security-Policy rollout

The policy is **Report-Only**: the browser reports what it *would* block, nothing breaks. Reports arrive at `POST /csp-report` on the API server and appear in the Render logs as one line each:

```
CSP violation: connect-src blocked=https://example.com/x page=https://orbittutorial.web.app/
```

1. Deploy. Use the app normally for about a week (login, videos, answers, the parent page, analytics).
2. Read the logs (`CSP violation`). For each line decide: a real third-party host we use (add it to the policy in `firebase.json`; `tests/security.test.js` lists the hosts the code mentions and fails if one is missing) or something we did not expect (look into it; this is the point of the exercise).
3. **Phase 2 (not done yet):** the policy still allows `'unsafe-inline'` scripts, because the app has one big inline script and three inline `onerror` handlers. That means the CSP limits *where* scripts load from and *where data can be sent* (so a stolen key cannot easily leave the page), but does not stop an injected inline script. To close it: move the inline script to `/app.js`, replace the three `onerror` attributes with a delegated listener, then remove `'unsafe-inline'` from `script-src`.
4. When the logs are quiet, rename the header `Content-Security-Policy-Report-Only` to `Content-Security-Policy` in `firebase.json`. Keep the `report-uri`.

## Known open items

- `npm audit` (production dependencies) shows moderate advisories that come through `firebase-admin` (Google Cloud storage libraries). No high or critical ones. Fixing needs a major `firebase-admin` upgrade; Dependabot will propose it, test it on a branch first.
- Daily limits (`MV_USE`, free-check counters) are kept in server memory and reset when Render restarts.
- Third-party scripts (Google Analytics, Clarity) run on the page by design; they can see page content that is not masked.
- Chrome / Safari Content-Security-Policy support for `report-uri` is complete; the newer `report-to` is not used.

## Tests and CI

`npm test` runs every file in `tests/`. GitHub Actions (`.github/workflows/ci.yml`) runs it on every push to `main` and every pull request with `CI=true`, which makes a skipped test a failure (the DOM tests need jsdom; CI installs it, the app does not depend on it). A weekly job runs `npm audit` for production dependencies.

## Reporting a problem

Please tell the project admin directly (do not post a key, a token or a student's data in a public issue). Rotate any key that may have leaked: parents can delete a Gemini key in Google AI Studio at any time.

## Bolo "Saath me bolo" recording (the one place audio is stored)

Everywhere else Orbit never stores a child's voice. Byanjan "Saath me bolo" is the exception, and only when the parent ticks it (Bolo > Parent ke liye, or on the parent's phone in Kid mode):

- The child's phone records the mic from the first letter to the last. Nothing is recognised; only the sound level is measured (`public/bolorec.js`). A letter with no sound is a red alert in the parent's report.
- The recording goes to `/api/bolo/rec/upload`. Only the child's own login for that code may upload (`kidLinks/{code}.kidUid`). Only a parent who joined that code may list or play it (`kidLinks/{code}/parents/{uid}`). The code alone is not enough.
- Files live in Backblaze B2 under `bolo-rec/<code>/` (server memory when B2 is not set) and are deleted 2 hours after upload (`TTL_MS` in `public/bolorec-core.js`). B2 lifecycle rules cannot do less than a day, so the server deletes them itself every 10 minutes and on every upload / list.
- The recording is never sent to an AI and never shown to anyone but the parents of that code.
- Tests: `tests/bolorec.test.js`, `tests/bolorec-client.test.js`.
