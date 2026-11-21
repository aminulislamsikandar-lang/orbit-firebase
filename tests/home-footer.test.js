// The SEO footer (All classes and subjects ... social icons) shows on the login page, the first "Apna course chuno" page and Home only, not on any other page.
// Source-level checks (no jsdom needed): the footer stays in the static HTML for crawlers, CSS hides it with body.nofoot, draw() sets nofoot.
// Run: node tests/home-footer.test.js
const fs = require('fs'), path = require('path'), assert = require('assert');
const src = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');
let n = 0; const ok = (c, m) => { assert(c, m); n++; };
ok(/<footer class="seofoot">/.test(src), 'the footer is still in the static HTML (search engines read it)');
ok(src.indexOf('<footer class="seofoot">') > src.indexOf('<div id="app">'), 'the footer sits outside #app');
ok(/body\.nofoot \.seofoot\{display:none\}/.test(src), 'CSS hides the footer when body has nofoot');
const draw = src.slice(src.indexOf('function draw(){'), src.indexOf('function drawSide()'));
ok(/toggle\('nofoot',!\(\(needCourse&&!KID_STEP&&!CSTEP&&!CS\.own&&!\(COURSE&&COURSE\.kid&&!KIDROLE\)\)\|\|\(VIEW==='home'&&!needCourse&&!KIDM\)\)\)/.test(draw), 'logged in: the first course page and Home keep the footer (not the school/custom/board steps, the Kid pages or any other screen)');
ok(/gateHTML\(\);document\.body\.classList\.toggle\('nofoot',!!\(FREE\|\|\(PARENT_LINK&&window\.PARENT_KEY\)\)\)/.test(draw), 'logged out: the login page keeps it, free notes and the parent link page hide it');
ok((draw.match(/'nofoot'/g) || []).length === 2, 'nofoot is set in exactly two places');
console.log(n + ' passed, 0 failed');
