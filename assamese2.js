// Class 2 Assamese (English medium, Nashib Ali Academy). Question ids start with as2c<chapter>- so they never clash with other courses.
// `context` on a chapter is hidden from students and only sent to the AI. It holds notes written in our own words, never the poem text.
// Lesson text lives in lessons/as2c1.txt: one block per STANZA. The app shows each stanza with its own Translate button.
const fs = require('fs');
const path = require('path');
const lessonText = name => {
  try {
    return fs.readFileSync(path.join(__dirname, 'lessons', name + '.txt'), 'utf8')
      .split(/\r?\n/).filter(l => !l.trim().startsWith('#')).join('\n')
      .split(/\n\s*\n/).map(x => x.split('\n').map(l => l.trim()).filter(Boolean).join('\n')).filter(Boolean);
  } catch (e) { return []; }
};

module.exports = {
  id: 'c2-assamese',
  subject: 'Assamese',
  class: 2,
  sourceLang: 'Assamese',
  chapters: [
    {
      no: 1, title: "ৰ'দালি", kind: 'পদ্য (Poem)',
      lesson: lessonText('as2c1'),
      context: `Lesson 1 "ৰ'দালি" (Sunshine), a short children's poem in 3 stanzas. Notes for the AI, written in our own words. Do not recite the poem. Answer in very simple Assamese for a Class 2 child.

Main idea: the poem follows the sunshine through one day, from early morning to evening.

Stanza gist (in our words):
1. Morning: the sunshine is lively and red-gold in colour. It comes out from the east and spreads its light.
2. The sunshine slowly climbs higher in the sky. When it is right above our heads, it is noon (দুপৰ).
3. When the sun leans down, it is afternoon (আবেলি). When the sunshine hides, dusk (গধূলি) arrives.

Order of the day in the poem: morning, noon, afternoon, dusk.`,
      sections: [
        { title: 'Poem questions', questions: [
          { id: 'as2c1-1', no: 1, label: '1.', text: 'What is the poem about? Write in one or two simple sentences.' },
          { id: 'as2c1-2', no: 2, label: '2.', text: 'In which direction does the sunshine come up in the morning, according to the poem?' },
          { id: 'as2c1-3', no: 3, label: '3.', text: 'Write the four parts of the day that the poem talks about, in order.' },
          { id: 'as2c1-4', no: 4, label: '4.', text: 'What happens when the sunshine hides?' }
        ] }
      ]
    }
  ]
};
