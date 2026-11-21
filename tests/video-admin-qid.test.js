// Admin panel > Video lessons > Edit > Save must keep the qid, or a question video (3-dot menu) turns into a chapter video and vanishes from its question.
// Run: node tests/video-admin-qid.test.js
const fs = require('fs'), path = require('path'), vm = require('vm');
const src = fs.readFileSync(path.join(__dirname, '..', 'public', 'video-admin.js'), 'utf8').replace(/^\uFEFF/, '');
let pass = 0, fail = 0;
const t = (name, ok) => { if (ok) pass++; else { fail++; console.log('FAIL  ' + name); } };
t('video-admin.js still parses', (() => { try { new vm.Script(src); return true; } catch (e) { return false; } })());
t('Edit remembers the saved record', /editRec = v;/.test(src) && /var editing = null, editRec = null/.test(src));
t('Save copies the qid back from that record, only for the same id', /editRec && editRec\.id === id && typeof editRec\.qid === "string" && editRec\.qid\) v\.qid = editRec\.qid/.test(src));
t('a new video (not edited) gets no qid, and clear() forgets the record', /function clear\(\) \{ editing = null; editRec = null;/.test(src));
console.log(pass + ' passed, ' + fail + ' failed'); process.exit(fail ? 1 : 0);
