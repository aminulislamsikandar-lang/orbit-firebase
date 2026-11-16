# Padhai ka time: father ke phone par alert (setup)

Kya karta hai: bachha mother ke phone par padhta hai. Agar padhai ke time ke 10 minute baad bhi bachha Orbit mein shuru nahi karta, to father ke phone par ek notification jata hai.
Padhai poori hone par ek "poori hui" notification. Din mein zyada se zyada 2. Father apne phone se time bhi badal sakte hain.

## Ek baar ka setup (Render)

1. `npm install` (naya package: `web-push` 3.6.7).
2. VAPID keys banao (apne computer par, ye keys kisi ko mat bhejo):
   `npx web-push generate-vapid-keys`
   Render > Environment mein lagao:
   - `VAPID_PUBLIC_KEY` = Public Key
   - `VAPID_PRIVATE_KEY` = Private Key (sirf Render par, repo ya chat mein kabhi nahi)
   - `VAPID_SUBJECT` = `mailto:aapka-email` (optional)
3. `STUDY_CRON_KEY` = koi lambi random string (jaise `openssl rand -hex 24`).
4. `FIREBASE_SERVICE_ACCOUNT` pehle se lagi honi chahiye (limits ke liye bhi wahi use hoti hai). Bina iske parent link kaam nahi karega (server saaf message dega).
5. Free cron (jaise cron-job.org): har 1 minute `GET https://<aapka-render-app>/api/study/tick` aur header `x-cron-key: <STUDY_CRON_KEY>`.
   (Header na laga sako to `?key=<STUDY_CRON_KEY>` bhi chalega, lekin tab key logs mein dikh sakti hai.)
   Render ka free server so jata hai; cron use jagata hai. Isliye alert 30 se 60 second late ho sakta hai.
6. Deploy: `firebase deploy --only hosting` aur Render par naya deploy.
   `firestore.rules` mein badlav nahi hai. Naye collections (`studyPlans`, `studyLinks`, `studyParents`) par browser ka koi rule nahi, yaani browser unhe padh ya likh nahi sakta, sirf server.

## Chalane ke tareeke (test)

1. Bachhe ke phone par Orbit mein Google se log in > Padhai ka time > Parent ke liye: naam, time lagao, Save karo.
2. Wahin "Parent ko jodo" dabao: 6 akshar ka code aayega (15 minute, ek baar).
3. Father ke phone par log in > Padhai ka time > "Main parent hoon": code daalo > Jodo.
4. Wahin "Is phone par notification chalu karo" > allow.
5. Time se 10 minute baad bachha shuru na kare to notification aana chahiye. Shuru kare to nahi aayegi.

## Jaan lena zaroori

- Notification pakka nahi hota: phone ka battery saver, Do Not Disturb ya band internet use rok sakta hai. Bachha phone par offline ho to "shuru nahi hua" ka galat alert ja sakta hai (message mein ye likha hai).
- iPhone par notification tabhi aata hai jab Orbit Home Screen par jodi ho (iOS 16.4 ya naya).
- Alert sirf time ke 10 minute baad se 3 ghante tak ke liye hai. Server late jage to raat ko purana alert nahi jata.
- Server 500 se zyada chalu plans ek baar mein nahi dekhta (aage badhane par badalna padega).
- Asli phone call nahi jati (paid service chahiye). Notification dekhkar father khud ghar call kar sakte hain.
- Server par sirf: bachhe ka naam, padhai ka time/din/minute, aaj shuru hua ya poora hua, parent ka login id aur notification ka pata. Camera, mic ya kuch aur nahi.
- Bachhe ke phone se "Sab parent hatao", ya parent ke phone se "Hata do" dabane par link turant khatam.
