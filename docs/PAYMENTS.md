# Razorpay payments (Orbit)

One payment unlocks every non-free video for `PAY_DAYS` days. The server (never the browser) makes the order, checks the payment signature and
writes `subscriptions/<uid>.until`, the same document `hasAccess()` in `server.js` already reads.

## Render env vars (Environment tab of the orbit-firebase service)

| Name | Value |
| --- | --- |
| `RAZORPAY_KEY_ID` | `rzp_test_...` first, `rzp_live_...` after Razorpay approves |
| `RAZORPAY_KEY_SECRET` | the matching Key Secret (server only) |
| `PAY_AMOUNT_RUPEES` | optional, default 99 (use 1 while testing) |
| `PAY_DAYS` | optional, default 365 |
| `RAZORPAY_WEBHOOK_SECRET` | the secret you type when you add the webhook in the Razorpay Dashboard (see Webhook below). NOT the Key Secret. Without it the webhook answers 503 and payments still work through the browser, but a payment the browser never confirmed is not rescued |
| `REQUIRE_SUBSCRIPTION` | `true` (paid videos stay locked until someone pays) |
| `FIREBASE_SERVICE_ACCOUNT` | already set for the daily limits; payments need it too |

## Test mode
UPI: `success@razorpay` (pays) or `failure@razorpay` (fails). Card: `4111 1111 1111 1111`, any future expiry, any CVV, OTP page: Success.
Open a paid video while logged in, press "Videos unlock karo". Check Razorpay Dashboard > Test Mode > Transactions, and Firestore `subscriptions/<uid>` and `payments/<payment id>`.

## Webhook (set this up before going live)
The browser confirms a payment right after it is made. If the student closes the tab or loses the network at that moment, the money is taken but the browser never tells the server. The webhook is Razorpay telling the server itself, so that payment unlocks anyway. It also takes the days back after a full refund.

1. Razorpay Dashboard > Account & Settings > Webhooks > Add New Webhook (do it in Test Mode first, then again in Live Mode).
2. Webhook URL: `https://orbit-firebase.onrender.com/api/pay/webhook`
3. Secret: type a long random string of your own. Put the same string in the Render variable `RAZORPAY_WEBHOOK_SECRET`.
4. Active events: `order.paid` and `refund.processed`. (`payment.captured` also works and does the same as `order.paid`; it is not needed.)
5. Save. Render restarts by itself when you change a variable.

Check: make a test payment. In the Render logs a line `[pay] webhook unlocked pay_...` appears when the webhook was the first to confirm it; if the browser was first you see nothing, which is fine (a payment unlocks only once). In Razorpay > Webhooks you can see each delivery and its answer (200 is good).
If the server was asleep or failed, Razorpay tries again for up to 24 hours, so nothing is lost.

## Refunds
Refund from the Razorpay Dashboard (Transactions > the payment > Refund). When the refund is processed the webhook arrives:
- A full refund (or partial refunds that add up to the full amount) takes back the days that payment gave: `subscriptions/<uid>.until` moves back by that payment's days, never below now. Days from other payments stay. The payment's own `payments/<payment id>` document gets `refunded`, `refundIds`, `revoked: true`.
- A partial refund is only written on the payment document (`refunded`). Change `subscriptions/<uid>.until` by hand if you want to take days back.
- The same refund event arriving twice takes nothing more.

## Going live
Turn Test Mode off in Razorpay, make Live keys, replace the two Render variables. No code change. Try a Rs 1 live payment first.

## Safety rules kept in the code
- The amount and days come from server env, never from the browser.
- A payment is accepted only with a valid signature AND an order made by this server for this same student AND status `paid`.
- `payments/<payment id>` is written together with the subscription in one transaction: the same payment can never add days twice.
- Firestore rules are unchanged: students cannot write `subscriptions` or `payments`.
- The webhook checks the signature of the raw request body (HMAC SHA256 with the webhook secret) before it reads anything else. The student is taken from the order Razorpay itself returns, never from the event body.
- The browser and the webhook can both report the same payment: whichever comes second changes nothing.
- A confirmed-but-not-yet-unlocked payment (tab closed, bad network) is saved in the browser and confirmed again at the next app start.
