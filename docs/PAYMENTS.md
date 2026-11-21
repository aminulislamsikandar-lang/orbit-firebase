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
| `REQUIRE_SUBSCRIPTION` | `true` (paid videos stay locked until someone pays) |
| `FIREBASE_SERVICE_ACCOUNT` | already set for the daily limits; payments need it too |

## Test mode
UPI: `success@razorpay` (pays) or `failure@razorpay` (fails). Card: `4111 1111 1111 1111`, any future expiry, any CVV, OTP page: Success.
Open a paid video while logged in, press "Videos unlock karo". Check Razorpay Dashboard > Test Mode > Transactions, and Firestore `subscriptions/<uid>` and `payments/<payment id>`.

## Going live
Turn Test Mode off in Razorpay, make Live keys, replace the two Render variables. No code change. Try a Rs 1 live payment first.

## Safety rules kept in the code
- The amount and days come from server env, never from the browser.
- A payment is accepted only with a valid signature AND an order made by this server for this same student AND status `paid`.
- `payments/<payment id>` is written together with the subscription in one transaction: the same payment can never add days twice.
- Firestore rules are unchanged: students cannot write `subscriptions` or `payments`.
- A confirmed-but-not-yet-unlocked payment (tab closed, bad network) is saved in the browser and confirmed again at the next app start.
