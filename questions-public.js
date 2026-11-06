// What students may download: all questions except the hidden `context` fields (poem text, chapter notes, answer keys for the AI).
// Used by server.js (GET /api/questions) and by build-questions.js (public/questions.json on Firebase Hosting).
const QUIZ = require('./questions');
module.exports = {
  courses: QUIZ.courses.map(c => ({
    ...c,
    chapters: c.chapters.map(({ context, ...ch }) => ({
      ...ch,
      sections: (ch.sections || []).map(s => ({ ...s, questions: s.questions.map(({ context: _c, ...q }) => q) }))
    }))
  }))
};
