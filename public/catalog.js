// Boards, schools, classes, and which course ids each class has. ONE copy, used by the app (browser: window.ORBIT_CATALOG) and by server.js (Node: require).
// To add content later: put the course id into content[org][class]. A course's medium comes from the course itself (`medium`, English when missing).
// A student's course lock = { org, cls, med }, for example { org: 'seba', cls: 10, med: 'Assamese' }.
(function (root, make) {
  if (typeof module === 'object' && module.exports) module.exports = make();
  else root.ORBIT_CATALOG = make();
})(typeof self !== 'undefined' ? self : this, function () {
  const groups = [
    { t: 'Boards', items: [{ id: 'seba', name: 'SEBA', sub: 'Assam board' }, { id: 'cbse', name: 'CBSE', sub: 'Central board' }] },
    { t: 'Schools', items: [{ id: 'nashib', name: 'Nashib Ali Academy' }, { id: 'popular', name: 'Popular Academy' }, { id: 'halimon', name: 'Halimon Nessa Academy' }] }
  ];
  const classes = { seba: [9, 10], cbse: [9, 10], nashib: [2, 6, 7, 8, 9, 10], popular: [6, 7, 8, 9, 10], halimon: [6, 7, 8, 9, 10] };
  const content = {
    seba: { 10: [['c10-science', 'General Science'], ['c10-maths', 'Mathematics'], ['c10-social', 'Social Science'], ['c10-science-as', 'General Science']] },
    nashib: { 2: [['c2-assamese', 'Assamese']], 6: [['c6-english', 'English'], ['c6-grammar', 'English Grammar'], ['c6-social', 'Social Science'], ['c6-science', 'General Science'], ['c6-hindi', 'Hindi'], ['c6-assamese', 'Assamese'], ['c6-arabic', 'Arabic'], ['c6-maths']], 7: [['c7-english'], ['c7-maths'], ['c7-science']] },
    popular: { 7: [['c7-english'], ['c7-maths'], ['c7-science']] },
    halimon: { 7: [['c7-english'], ['c7-maths'], ['c7-maths-as'], ['c7-science']], 8: [['c8-english']] }
  };
  const mediums = ['Assamese', 'English'];
  // Class numbers: 1-12 = school classes. 13-18 = college / university years (only for courses a student adds themselves).
  const MAX_CLASS = 18;
  const isCollege = n => Number.isInteger(n) && n >= 13 && n <= MAX_CLASS;
  const classLabel = n => (n >= 1 && n <= 12 ? 'Class ' + n : n >= 13 && n <= 16 ? 'College Year ' + (n - 12) : n === 17 ? "Master's Year 1" : n === 18 ? "Master's Year 2" : 'Class ' + n);
  const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  const orgIds = () => groups.flatMap(g => g.items.map(o => o.id));
  const orgName = id => { const o = groups.flatMap(g => g.items).find(x => x.id === id); return o ? o.name : ''; };
  // A lock is valid only when the school/board, the class and the medium all exist in this catalog.
  // { own: true } = "my school or college is not in the list": the student adds their own course(s) with Add course instead of choosing from the catalog.
  const isOwn = l => !!l && l.own === true;
  const isKid = l => !!l && l.kid === true;   // { kid: true } = Kid mode: the account sees only the Bolo page (the phone's role, kid or parent, is kept on that phone)
  function validLock(l) {
    if (isOwn(l) || isKid(l)) return true;
    return !!l && typeof l.org === 'string' && orgIds().includes(l.org) && Number.isInteger(l.cls) && (classes[l.org] || []).includes(l.cls) && mediums.includes(l.med);
  }
  // Course ids a student with this lock may use. `courses` = [{ id, medium }] (the real course list), because the medium is a property of each course.
  function idsFor(lock, courses) {
    if (!validLock(lock) || !has(content, lock.org)) return [];
    return (content[lock.org][lock.cls] || []).map(r => r[0]).filter(id => {
      const c = (courses || []).find(x => x.id === id);
      return !!c && (c.medium || 'English') === lock.med;
    });
  }
  const labelOf = l => isKid(l) ? 'Kid mode' : isOwn(l) ? 'Mere apne courses' : orgName(l.org) + ' · ' + classLabel(l.cls) + ' · ' + l.med + ' medium';
  return { groups, classes, content, mediums, MAX_CLASS, isCollege, classLabel, isOwn, isKid, orgIds, orgName, validLock, idsFor, labelOf };
});
