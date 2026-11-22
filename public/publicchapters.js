// public/publicchapters.js - chapters whose recorded videos are LISTED for every logged-in student (not only the admin) and are not hidden by the course lock.
// Free or Paid is NOT decided here: it is the video's own "Free video" tick in the admin panel (server.js hasAccess), so a ticked video is free and an unticked one needs a payment.
// The app (index.html mergeV / videosHTML) reads this list.
// To open another chapter, add one line here and deploy (hosting + Render).
//   course      the course id the chapter belongs to (questions.js / catalog.js)
//   chapter     chapter number
//   alsoCourses other course ids whose videos of the same chapter number are shown here too (use it when an admin filed the video under the sibling course)
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PUBLIC_CHAPTERS = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  const CHAPTERS = [
    // Class 7 Mathematics, Assamese medium (Halimon Nessa Academy), Chapter 2 "ভগ্নাংশ আৰু দশমিক সংখ্যা". c7-maths is the English-medium book with the same chapter 2.
    { course: 'c7-maths-as', chapter: 2, alsoCourses: ['c7-maths'] }
  ];
  const cid = v => (v && v.course) || 'c10-science';          // a video without a course belongs to the first course, as in the app
  const match = (course, chapter) => CHAPTERS.find(e => +e.chapter === +chapter && (e.course === course || (e.alsoCourses || []).includes(course)));
  // Is this video in a public chapter? (v = { course, chapter })
  const isPublicVideo = v => !!v && Number.isInteger(+v.chapter) && !!match(cid(v), v.chapter);
  // Should this video be listed on the page of chapter `chapterNo` of course `courseId`?
  const belongs = (v, courseId, chapterNo) => !!v && +v.chapter === +chapterNo && (cid(v) === courseId || CHAPTERS.some(e => e.course === courseId && +e.chapter === +chapterNo && (e.alsoCourses || []).includes(cid(v))));
  return { CHAPTERS, isPublicVideo, belongs };
});
