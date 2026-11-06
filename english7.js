// Class 7 English. Question ids start with e7c<chapter>- so they never clash with other courses.
// `context` on a chapter is hidden from students and only sent to the AI (poem text, word meanings, notes).
// Chapters with `locked: true` (and no sections) show a lock in the index until their questions are added.
module.exports = {
  id: 'c7-english',
  subject: 'English',
  class: 7,
  chapters: [
    {
      no: 1, title: 'The Blue Bird', kind: 'Poem', author: 'Sri Aurobindo',
      context: `Poem "The Blue Bird" by Sri Aurobindo (1872-1950):
I am the bird of God in His blue;
Divinely high and clear
I sing the notes of the sweet and the true
For the god's and the seraph's ear.
I rise like a fire from the mortal's earth
Into a griefless sky
And drop in the suffering soil of his birth
Fire-seeds of ecstasy.
My pinions soar beyond Time and Space
Into unfading Light;
I bring the bliss of the Eternal's face
And the boon of the Spirit's sight.
I measure the worlds with my ruby eyes;
I have perched on Wisdom's tree
Thronged with the blossoms of Paradise
By the streams of Eternity.
Nothing is hid from my burning heart;
My mind is shoreless and still;
My song is rapture's mystic art,
My flight immortal will.
Word meanings: seraph = an angel of the highest rank; griefless = free from sorrow; ecstasy = very great happiness; pinions = a bird's wings; bliss = perfect happiness, great joy; boon = a blessing or favour; thronged = crowded with; shoreless = having no shore or limit; rapture = great delight; immortal = living forever, never dying.
Notes: The poem is a metaphor for a mystical creature that has seen everything and has freedom, wisdom and happiness, born from joining its will with the will of the Eternal (God). The poem was written by the poet after he experienced divine inspiration. A metaphor is a statement in which two things, often unrelated, are compared to each other without using like or as (for example: The snow is a white blanket; He has a heart of gold).`,
      sections: [
        { title: 'Reading Comprehension A (page 11)', questions: [
          { id: 'e7c1-a1', no: 1, label: 'A1.', text: "What does the bird do for the god's and the seraph's ear?" },
          { id: 'e7c1-a2', no: 2, label: 'A2.', text: 'What does the bird rise and do?' },
          { id: 'e7c1-a3', no: 3, label: 'A3.', text: 'According to the poet, what do the following lines mean?',
            parts: ["'I bring the bliss of the Eternal's face", "And the boon of the Spirit's sight.'"] },
          { id: 'e7c1-a4', no: 4, label: 'A4.', text: 'Why does the bird measure the world?' },
          { id: 'e7c1-a5', no: 5, label: 'A5.', text: 'How is nothing hidden from the bird?' }
        ] },
        { title: 'Reading Comprehension B: With Reference to the Context (page 11)', questions: [
          { id: 'e7c1-b1', no: 1, label: 'B1.',
            text: "Answer the following questions with reference to the context. \"I rise like a fire from the mortal's earth / Into a griefless sky / And drop in the suffering soil of his birth / Fire-seeds of ecstasy.\"",
            parts: ["(a) Who is 'I' referred to here?", "(b) What does the word 'ecstasy' suggest?", "(c) Why does the poet refer to the place of his birth as 'suffering soil'?"] },
          { id: 'e7c1-b2', no: 2, label: 'B2.',
            text: "Answer the following questions with reference to the context. \"My pinions soar beyond Time and Space / Into unfading Light; / I bring the bliss of the Eternal's face / And the boon of the Spirit's sight.\"",
            parts: ['(a) What could the poet mean in the first line?', "(b) The 'Eternal's face' refers to ________.", '(c) What blessing is the poet talking about?'] }
        ] },
        { title: 'Think and Discuss (page 11)', questions: [
          { id: 'e7c1-t1', no: 1, text: 'The poet brings in two opposites in the second stanza. He says that the sky is griefless and the soil is suffering. What could he mean by that?' }
        ] },
        { title: 'Appreciation: Metaphor (page 12)', questions: [
          { id: 'e7c1-m1', no: 1, text: 'Write the comparison in the following metaphor: "The Sun is a golden ball."', parts: ['______ is compared to a ______.'], video: 'metaphor explained with examples' },
          { id: 'e7c1-m2', no: 2, text: 'Write the comparison in the following metaphor: "She is a couch potato."', parts: ['______ is compared to a ______.'], video: 'metaphor explained with examples' },
          { id: 'e7c1-m3', no: 3, text: 'Write the comparison in the following metaphor: "All the world\'s a stage."', parts: ['______ is compared to a ______.'], video: 'metaphor explained with examples' },
          { id: 'e7c1-m4', no: 4, text: 'Write the comparison in the following metaphor: "Hope is the thing with feathers."', parts: ['______ is compared to a ______.'], video: 'metaphor explained with examples' },
          { id: 'e7c1-m5', no: 5, text: 'Write the comparison in the following metaphor: "Fame is a bee."', parts: ['______ is compared to a ______.'], video: 'metaphor explained with examples' },
          { id: 'e7c1-m6', no: 6, text: 'Write the comparison in the following metaphor: "The classroom was a zoo."', parts: ['______ is compared to a ______.'], video: 'metaphor explained with examples' }
        ] }
      ]
    },
    { no: 2, title: 'The Bodhisattva', kind: 'Graphic Story', locked: true, sections: [] },
    { no: 3, title: 'How Much Land Does a Man Need?', kind: 'Story', author: 'Count Lev Nikolayevich Tolstoy', locked: true, sections: [] },
    { no: 4, title: 'When a Giant Has a Haircut', kind: 'Poem', author: 'Kenn Nesbitt', locked: true, sections: [] },
    { no: 5, title: 'Pride Hath a Fall', kind: 'Story', locked: true, sections: [] },
    { no: 6, title: 'Amal', kind: 'Drama', author: 'Rabindranath Tagore', locked: true, sections: [] },
    { no: 7, title: "All the World's a Stage", kind: 'Poem', author: 'William Shakespeare', locked: true, sections: [] },
    { no: 8, title: 'Frankenstein', kind: 'Story', author: 'Mary Wollstonecraft Shelley', locked: true, sections: [] },
    { no: 9, title: 'Sonnet', kind: 'Poem', author: 'Toru Dutt', locked: true, sections: [] },
    { no: 10, title: 'Professor Shonku in Space', kind: 'Story', author: 'Satyajit Ray', locked: true, sections: [] },
    { no: 11, title: 'The Cabin of Mystery', kind: 'Poem', author: 'James W. Whitt', locked: true, sections: [] },
    { no: 12, title: 'A Pound of Flesh', kind: 'Drama', author: 'William Shakespeare', locked: true, sections: [] },
  ]
};
