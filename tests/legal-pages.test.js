// The legal pages say what the code does: paid videos, Razorpay, one-time payment, refunds. Source-level checks of build-seo.js and the app footer.
// Run: node tests/legal-pages.test.js
const fs = require('fs'), path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8').replace(/^\uFEFF/, '');
const seo = read('build-seo.js'), html = read('public/index.html'), ign = read('.gitignore');
let pass = 0, fail = 0;
const t = (n, ok) => { if (ok) pass++; else { fail++; console.log('FAIL  ' + n); } };
const page = p => { const i = seo.indexOf("info('" + p + "'"); const j = seo.indexOf("\n  info('", i + 5); return i < 0 ? '' : seo.slice(i, j < 0 ? undefined : j); };
const terms = page('/terms/'), priv = page('/privacy/'), refund = page('/refund/'), contact = page('/contact/');

t('a Refund and Cancellation page exists and is a normal info page (sitemap, footer)', refund.length > 500 && /Refund and Cancellation Policy/.test(refund));
t('refund page: one-time payment, no auto-renewal, nothing to cancel', /one-time payment/i.test(refund) && /never renews by itself/.test(refund) && /nothing to cancel/.test(refund));
t('refund page: unlock problems, double payment, how long a refund takes, full refund ends the days', /did not unlock/.test(refund) && /twice/.test(refund) && /5 to 7 working days/.test(refund) && /refunded in full, the days that payment unlocked end/.test(refund));
t('refund page: gives a way to reach us', /href="\/contact\/"/.test(refund));
t('terms: paid video lessons, one-time, Razorpay, link to Refunds', /Paid video lessons/.test(terms) && /one-time payment/.test(terms) && /Razorpay/.test(terms) && /\/refund\//.test(terms));
t('terms: no longer says the whole service is free', !/provided free and/.test(terms));
t('privacy: says Razorpay handles payments, Orbit never stores card or UPI details, and what it does keep', /Razorpay/.test(priv) && /never sees or stores your card, UPI or bank details/.test(priv) && /payment id/.test(priv));
t('privacy: Razorpay is in the list of helpers', /Razorpay \(payments\)/.test(priv));
t('faq no longer says there is no payment', !/no payment or subscription today/.test(seo) && /Some video lessons are paid/.test(seo));
t('Refunds link is in the website footer and in the app footer', /<a href="\/refund\/">Refunds<\/a>/.test(seo) && /<a href="\/refund\/">Refunds<\/a>/.test(html));
t('the generated refund page is git-ignored like the other generated info pages', /^public\/refund\/$/m.test(ign) && /^public\/terms\/$/m.test(ign));
t('the pages are dated', /const UPDATED = '\d{1,2} [A-Z][a-z]+ 20\d\d'/.test(seo));
t('payment text never says Premium', !/premium/i.test(refund + terms));
console.log(pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
