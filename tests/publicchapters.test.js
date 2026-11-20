// Public chapters: Class 7 Assamese-medium Maths (Halimon Nessa Academy) Chapter 2 videos are open to every logged-in student: no admin, no subscription, no course-lock hiding.
const fs = require('fs'), path = require('path');
const R = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const P = require('../public/publicchapters.js'), CAT = require('../public/catalog.js');
let pass = 0, fail = 0;
const t = (name, ok, extra) => { if (ok) pass++; else { fail++; console.log('FAIL  ' + name + (extra ? '  ' + extra : '')); } };

t('Class 7 Assamese Maths chapter 2 video is public', P.isPublicVideo({ course: 'c7-maths-as', chapter: 2 }));
t('chapter number can come as a string or number', P.isPublicVideo({ course: 'c7-maths-as', chapter: '2' }));
t('the sibling English-medium Maths chapter 2 (filed there by mistake) counts too', P.isPublicVideo({ course: 'c7-maths', chapter: 2 }));
t('other chapters stay as they were (not public)', !P.isPublicVideo({ course: 'c7-maths-as', chapter: 3 }) && !P.isPublicVideo({ course: 'c7-maths-as', chapter: 1 }) && !P.isPublicVideo({ course: 'c10-science', chapter: 2 }) && !P.isPublicVideo({ course: 'c7-science', chapter: 2 }));
t('junk input is never public', !P.isPublicVideo(null) && !P.isPublicVideo({}) && !P.isPublicVideo({ course: 'c7-maths-as' }) && !P.isPublicVideo({ course: 'c7-maths-as', chapter: 'x' }));
t('a video with no course belongs to the first course, like in the app', !P.isPublicVideo({ chapter: 2 }));
t('page of Assamese Maths chapter 2 lists its own video', P.belongs({ course: 'c7-maths-as', chapter: 2 }, 'c7-maths-as', 2));
t('...and the one filed under the sibling course', P.belongs({ course: 'c7-maths', chapter: 2 }, 'c7-maths-as', 2));
t('other pages are unchanged: chapter 3 does not list chapter 2 videos, other courses do not borrow them', !P.belongs({ course: 'c7-maths-as', chapter: 2 }, 'c7-maths-as', 3) && !P.belongs({ course: 'c7-maths-as', chapter: 2 }, 'c7-science', 2) && P.belongs({ course: 'c10-science', chapter: 1 }, 'c10-science', 1) && !P.belongs({ course: 'c10-science', chapter: 1 }, 'c10-science', 2));
t('the English course page does not start showing Assamese-filed videos', !P.belongs({ course: 'c7-maths-as', chapter: 2 }, 'c7-maths', 2));
const ids = CAT.idsFor({ org: 'halimon', cls: 7, med: 'Assamese' }, [{ id: 'c7-english', medium: 'English' }, { id: 'c7-maths', medium: 'English' }, { id: 'c7-maths-as', medium: 'Assamese' }, { id: 'c7-science', medium: 'English' }]);
t('a Halimon Class 7 Assamese student is locked to the Assamese Maths course (the case being fixed)', ids.join() === 'c7-maths-as');

const srv = R('server.js'), idx = R('public/index.html');
t('server: a public chapter needs no subscription, even when REQUIRE_SUBSCRIPTION=true', /PUBCH\.isPublicVideo\(v\)\) return true/.test(srv) && /require\('\.\/public\/publicchapters\.js'\)/.test(srv));
t('server: videos added from the admin panel carry their course and chapter into that check', /course: f\.course && f\.course\.stringValue, chapter: f\.chapter && Number\(f\.chapter\.integerValue\)/.test(srv));
t('app: loaded before the app script; keeps public-chapter videos past the course lock; lists them on the chapter page', idx.indexOf('/publicchapters.js') > 0 && idx.indexOf('/publicchapters.js') < idx.indexOf('function mergeV') && /PC\.isPublicVideo\(v\)\)\)/.test(idx) && /PUBLIC_CHAPTERS\.belongs\(v,c\.id,ch\.no\)/.test(idx));
t('service worker caches it and the shell version moved up', /'\/publicchapters\.js'/.test(R('public/sw.js')) && Number((/orbit-shell-v(\d+)/.exec(R('public/sw.js')) || [])[1]) >= 54);
console.log(pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
