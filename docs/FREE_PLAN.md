# Free plan (optional, OFF by default)

Switch on in Render > Environment: `FREE_PLAN=on` (then redeploy). Remove it or set anything else to switch it off again; the app then behaves exactly as before.

| Env | Default | Meaning |
|---|---|---|
| `FREE_PLAN` | off | `on` turns the free plan on |
| `FREE_SECONDS` | 600 | free study time per IST day (60 to 86400) |
| `FREE_CHAPTERS` | 1 | how many chapters of a course are free (1 to 99) |

**Free student:** `FREE_SECONDS` of study time a day (counted on the server while the app is open and the student is active), only the first `FREE_CHAPTERS` chapters, all features inside that.
**Plus student:** has `subscriptions/<uid>.until` in the future (written by the Razorpay payment, see PAYMENTS.md). No limits. Admin emails are never limited.

How it works: `plan-core.js` (rules, server clock `dailyUsage/<uid>_<day>.secs`, gate), `server.js` (gate before the AI routes, `POST /api/plan`, `POST /api/plan/tick`), `public/plan.js` (small countdown top-right, lock on later chapters, "free time over" sheet, Free vs Plus sheet with the Razorpay button).
The AI routes answer HTTP 402 with `code: plan_time_over` or `plan_locked`; the app shows the sheet. Custom courses and the parent "Padhai ka time" feature are not part of the plan.
The price on the Plus card is the existing `PAY_AMOUNT_RUPEES` / `PAY_DAYS` (default Rs 99, 365 days).
