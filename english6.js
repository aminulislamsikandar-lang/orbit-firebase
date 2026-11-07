// Class 6 English (English medium). Question ids start with e6c<chapter>- so they never clash with other courses.
// `context` on a chapter is hidden from students and only sent to the AI (summary, word meanings, notes).
// Chapters with `locked: true` (and no sections) show a lock in the index until their questions are added.
const fs = require('fs');
const path = require('path');
// Lesson text lives in lessons/<name>.txt: one block per paragraph (for a poem: one block per STANZA, lines kept as they are),
// blank line between blocks, lines starting with # are ignored. The app shows each block with its own Translate button.
const lessonText = name => {
  try {
    return fs.readFileSync(path.join(__dirname, 'lessons', name + '.txt'), 'utf8')
      .split(/\r?\n/).filter(l => !l.trim().startsWith('#')).join('\n')
      .split(/\n\s*\n/).map(x => x.split('\n').map(l => l.trim()).filter(Boolean).join('\n')).filter(Boolean);
  } catch (e) { return []; }
};

module.exports = {
  id: 'c6-english',
  subject: 'English',
  class: 6,
  chapters: [
    {
      no: 1, title: 'The Laburnum', kind: 'Poem', author: 'Meera Uberoi',
      lesson: lessonText('e6c1'),
      context: `Poem "The Laburnum" by Meera Uberoi (1952-2012), a 7-stanza poem. Notes for the AI, summarised from the textbook (the poem text itself is not reproduced here):
- The poet describes a lone laburnum tree growing just down the road from her house. Unlike the cawing crows, it does not advertise itself or make noise to get attention.
- Stanza 2: Like the crows, people might say there is nothing special about this tree: its height is unremarkable and its leaves are ordinary.
- Stanza 3: When summer comes, in May, golden light seems trapped inside the tree and the flowers break out for everyone to see. The flowers are called "crystallized sunbeams" (a metaphor).
- Stanza 4: The thundery grey sky casts gloom on everything, but the little tree is quite untouched and burns with topaz (golden-yellow) light.
- Stanza 5: Flowers of sunshine cloak (cover) the tree and dazzle every eye; each puff of a wayward (unpredictable) breeze drops gold (petals) on passers-by.
- Stanza 6: Even the beggar down the street smiles when he sees the tree, and for some moments feels a joy that comes for free.
- Rhyme: the word in the poem that rhymes with 'right' is 'light' ("sight" also rhymes with it). Other rhyming pairs in the poem include tree/see and eye/by.
- Theme: nature affects human beings deeply and can calm and soothe body and mind; beauty in humility (a modest, quiet thing can be wonderful); joy from nature is free and open to everyone, rich or poor; beauty is fleeting, so appreciate the present moment.
- Figures of speech: metaphor ("crystallized sunbeams", "flowers of sunshine", "burns with topaz light"), contrast between the crows (noisy, show-off) and the laburnum (quiet, humble), personification of the sky casting gloom.
Word meanings: laburnum = a tree which has long stems of yellow flowers; crystallized sunbeams = a metaphor for the flowers of the laburnum; cloak = cover; puff = a short, explosive burst of breath or wind; ravages = destructive effects; unremarkable = not special or worth noticing; wayward = unpredictable, going its own way; topaz = a yellow-gold gemstone; dazzle = to amaze with brightness.
About the poet: Meera Uberoi (1952-2012) was a beloved Indian writer who wrote about Indian culture, with retellings of fairy tales, myths and legends (for example The Mahabharata, Grateful Parrot, The Jackals and the Goat). Her poems fondly celebrate beauty in humility.
Answer style: Class 6 students; short, simple sentences in the student's own words.`,
      words: [
        ['laburnum', 'a tree which has long stems of yellow flowers'],
        ['crystallized sunbeams', 'a metaphor for the flowers of the laburnum'],
        ['cloak', 'cover'],
        ['puff', 'a short, explosive burst of breath or wind'],
        ['ravages', 'destructive effects']
      ],
      sections: [
        { title: 'Reading Comprehension A: Fill in the blanks with words from the poem', questions: [
          { id: 'e6c1-a1', no: 1, label: 'A1.', text: 'The laburnum flowers blossom in the month of ________.' },
          { id: 'e6c1-a2', no: 2, label: 'A2.', text: 'When the beggar sees the beautiful golden laburnum flowers, he ________.' },
          { id: 'e6c1-a3', no: 3, label: 'A3.', text: 'The cawing crows ________ themselves with the sound they make.' },
          { id: 'e6c1-a4', no: 4, label: 'A4.', text: 'The height and the leaves of the laburnum tree are very ________ and ________.' },
          { id: 'e6c1-a5', no: 5, label: 'A5.', text: "The word ________ in the poem rhymes with the word 'right'." }
        ] },
        { title: 'Reading Comprehension B: Answer the following questions', questions: [
          { id: 'e6c1-b1', no: 1, label: 'B1.', text: 'What is the difference between the laburnum and the cawing crows?' },
          { id: 'e6c1-b2', no: 2, label: 'B2.', text: "What happens when the poet says, 'But comes the summer...'?" },
          { id: 'e6c1-b3', no: 3, label: 'B3.', text: 'What brings happiness to the beggar?' },
          { id: 'e6c1-b4', no: 4, label: 'B4.', text: "Why does the laburnum tree stand unaffected under the 'thundery grey sky'?" }
        ] },
        { title: 'Reading Comprehension C: With Reference to the Context', questions: [
          { id: 'e6c1-c1', no: 1, label: 'C1.',
            text: "Answer the following questions with reference to the stanza beginning \"But like the cawing crows, you'd say...\" (its height is unremarkable, its leaves so ordinary).",
            parts: ["(a) What makes the 'cawing crow' and the laburnum tree similar?", "(b) List two things that make the tree 'nothing'.", '(c) What makes the tree superb? Think and write.'] },
          { id: 'e6c1-c2', no: 2, label: 'C2.',
            text: 'Answer the following questions with reference to the stanza beginning "Flowers of sunshine cloak the tree...".',
            parts: ["(a) Why does the poet say 'flowers of sunshine'?", '(b) What effect do the flowers of sunshine have on every eye?', "(c) What does the 'wayward breeze' do?"] },
          { id: 'e6c1-c3', no: 3, label: 'C3.',
            text: 'Answer the following questions with reference to the stanza beginning "Even the beggar down the street...".',
            parts: ["(a) What does 'this tree' refer to in the above stanza?", '(b) Why is the joy said to be free?', '(c) What makes the beggar smile?'] }
        ] }
      ]
    },
    { no: 2, title: 'Building a Windmill in Malawi', kind: 'Graphic Story', locked: true, sections: [] },
    { no: 3, title: 'The Burglary at the Vicarage', kind: 'Prose', author: 'H.G. Wells', locked: true, sections: [] },
    { no: 4, title: 'The Return', kind: 'Poem', author: 'John Burroughs', locked: true, sections: [] },
    { no: 5, title: 'Painting the Breeze', kind: 'Prose', author: 'Subhadra Sen Gupta', locked: true, sections: [] },
    { no: 6, title: 'Long Live Friendship', kind: 'Drama', locked: true, sections: [] },
    { no: 7, title: 'Eldorado', kind: 'Poem', author: 'Edgar Allan Poe', locked: true, sections: [] },
    { no: 8, title: 'The Ransom of Red Chief', kind: 'Prose', author: 'O. Henry', locked: true, sections: [] },
    { no: 9, title: 'Nightfall in the City of Hyderabad', kind: 'Poem', author: 'Sarojini Naidu', locked: true, sections: [] },
    { no: 10, title: 'Bulli and the Tiger', kind: 'Prose', author: 'Shalini Reys', locked: true, sections: [] },
    { no: 11, title: 'The Village Blacksmith', kind: 'Poem', author: 'Henry Wadsworth Longfellow', locked: true, sections: [] },
    { no: 12, title: 'As You Like It', kind: 'Drama', author: 'William Shakespeare', locked: true, sections: [] }
  ]
};
