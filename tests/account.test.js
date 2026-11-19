// Sidebar "Account" page: it must exist and offer a working Log out button.
const fs = require('fs'), path = require('path');
const idx = fs.readFileSync(path.join(__dirname, '..', 'public/index.html'), 'utf8');
let pass = 0, fail = 0;
const t = (n, c) => { if (c) pass++; else { fail++; console.log('FAIL  ' + n); } };
t('loginHTML() is defined (the Account page)', /function loginHTML\(\)/.test(idx));
t('Account page has a Log out button', /data-act="logout"/.test(idx));
t('logout handler asks first and calls CLOUD.logout()', /act==='logout'\)\{[^}]*confirm\([^}]*CLOUD\.logout\(\)/.test(idx));
t('after logout the view goes back to home', /CLOUD\.logout\(\)\.then\(\(\)=>\{VIEW='home'/.test(idx));
t('sidebar item opens the login view', /item\('login','login',USER\?'Account':'Log in'\)/.test(idx));
console.log(pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
