// Everyday phone UX: a login tap can not start two logins, the login button shows it is working, controls have no tap delay,
// fields are 16 px (no iPhone zoom), tap targets are big enough, login errors are announced. Run: node tests/ux-polish.test.js
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');
const sw = fs.readFileSync(path.join(__dirname, '..', 'public', 'sw.js'), 'utf8');
let pass = 0, fail = 0;
const t = (n, ok) => { if (ok) pass++; else { fail++; console.log('FAIL  ' + n); } };
const btns = html.match(/<button[^>]*data-act="login"[^>]*>[\s\S]*?<\/button>/g) || [];
t('three login buttons exist (gate, account, home card)', btns.length === 3);
btns.forEach((b, i) => {
  t('login button ' + i + ' is disabled and aria-busy while a login is running', /!LOGINBUSY/.test(b) && /aria-busy="\$\{LOGINBUSY\}"/.test(b));
  t('login button ' + i + ' shows a spinner and "Login ho raha hai"', /LOGINBUSY\?SPN\+'Login ho raha hai/.test(b));
});
const click = (html.match(/else if\(act==='login'\)\{[^\n]*/) || [''])[0];
t('a second tap on login while one is running does nothing', /if\(LOGINBUSY\)return;/.test(click));
t('the busy flag is always cleared (finally)', /\.finally\(\(\)=>\{LOGINBUSY=false;draw\(\)\}\)/.test(click));
t('LOGINBUSY is declared', /let USER=null,LOGINERR='',LOGINBUSY=false/.test(html));
t('login error is announced to screen readers (role=alert)', /LOGINERR\?`<p class="err" role="alert"/.test(html));
t('no tap delay: touch-action manipulation on controls', /button,a,input,select,textarea,summary,label\{touch-action:manipulation\}/.test(html));
t('fields are 16 px so iPhones do not zoom in', /input,textarea,select\{font-size:16px\}/.test(html));
t('tap targets: buttons 44 px, chips 36 px', /\.btn\{min-height:44px\}\.chip\{min-height:36px\}/.test(html));
t('viewport has no zoom lock', !/user-scalable=no|maximum-scale/.test(html));
t('service worker cache version is v86 or newer', /SHELL = 'orbit-shell-v(8[6-9]|9\d|\d{3,})'/.test(sw));
console.log(pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
