// Class 6 English Grammar (English medium), a separate subject from English literature (english6.js).
// subject is 'English Grammar' so the Subjects page shows it as its own row; the AI uses the English tutor prompts for it.
// Question ids start with g6c<chapter>- so they never clash with other courses.
// `context` on a chapter is hidden from students and only sent to the AI (rules, examples, the textbook dialogue).
// A section can have `rules: { kind: 'grammar' | 'writing', topic }`, which shows the "Rules (AI)" box.
// Chapters with `locked: true` (and no sections) show a lock in the index until their questions are added.
module.exports = {
  id: 'c6-grammar',
  subject: 'English Grammar',
  class: 6,
  chapters: [
    {
      no: 1, title: 'The Sentence', kind: 'Grammar',
      context: `Chapter 1 "The Sentence" (Class 6 English Grammar). Notes for the AI, summarised from the textbook:
- Sentence: a group of words arranged in a proper order that gives a complete meaning. Every sentence has a verb, begins with a capital letter and ends with a full stop, a question mark or an exclamation mark.
- Phrase: a group of words that gives an incomplete meaning. It may or may not have a verb, it usually does not begin with a capital letter or end with a full stop/question mark/exclamation mark, and it is only a part of a sentence. Example: in the dialogue, Tia's reply "On the phone" is a phrase; the full sentence is "I am on the phone."
- Sentence vs phrase: a sentence must have a verb, gives complete meaning and stands complete on its own; a phrase gives incomplete meaning and is part of a sentence.
- Four types of sentences:
  1. Declarative (assertive): gives information or states something; ends with a full stop (.). Examples: I have two tickets to the IPL match. Arjun took the dog to the park.
  2. Imperative: a request, advice, instruction or command; usually starts with a verb; the subject "you" is not written but understood; ends with a full stop (or sometimes an exclamation mark). Examples: Please take me along. Keep the plates in the kitchen.
  3. Interrogative: asks a question; often starts with who, what, where, when, how, whom, whose, which, why; ends with a question mark (?). Examples: Where are you? What did you read during the weekend?
  4. Exclamatory: shows strong feeling or emotion; ends with an exclamation mark (!). Examples: What a wonderful movie! How beautiful is this sunset!
- Changing an assertive sentence into an exclamatory sentence with "What" or "How":
  - Use "What" when there is "a" or "an" before the adjective: She is a graceful dancer. -> What a graceful dancer she is! This is a heavy book. -> What a heavy book it is!
  - Use "How" when "a/an" is missing (adjective or adverb): She dances gracefully. -> How gracefully she dances! Madan rides his bicycle fast. -> How fast Madan rides his bicycle! Kashmir is a beautiful place. -> What a beautiful place Kashmir is! / How beautiful Kashmir is!
- Subject and predicate: every sentence has two parts. The subject is the noun, pronoun or group of words that tells who or what the sentence is about. The predicate is the part that says something about the subject and always has a verb. Example: The wolf and the hyena (subject) | ran towards the deer (predicate). The brown jacket | was very warm.
- Subject in imperative sentences: the subject is "you" but it is usually not spoken or written (implied). Example: Shut the door = (You) shut the door.
- Textbook dialogue for Practice A (page 8), Sachin and Shekhar: Sachin: How was the interview? Shekhar: Not so great (-> It was not so great.) Sachin: Are we going ahead with our evening plan? Shekhar: Yes, we are. Sachin: Where are we meeting? Shekhar: At the food court. Sachin: Is there an occasion for a party? Shekhar: Wait and see. Sachin: Okay, I'll wait as you say. Shekhar: See you.
Answer style: Class 6 students. For "change/rewrite" items give the corrected sentence first. For type-of-sentence items give the correctly punctuated sentence with a capital letter, then its type in one short reason.`,
      sections: [
        { title: 'Get, Set, Go! Rearrange the words to make sentences (page 7)', questions: [
          { id: 'g6c1-w1', no: 1, text: 'Rearrange the words to make a sentence: chocolate / I / a / cake / baked' },
          { id: 'g6c1-w2', no: 2, text: 'Rearrange the words to make a sentence: is / the / fascinating / movie' },
          { id: 'g6c1-w3', no: 3, text: 'Rearrange the words to make a sentence: tree / the / ran / the / squirrel / up' },
          { id: 'g6c1-w4', no: 4, text: 'Did the words make any sense before you rearranged them?' }
        ] },
        { title: 'Practice A: Change the phrases to sentences (page 8)',
          rules: { kind: 'grammar', topic: 'Sentence and phrase (what each is, how they differ, how to turn a phrase into a full sentence, capital letter and full stop / question mark / exclamation mark)' },
          questions: [
          { id: 'g6c1-pa1', no: 1, text: 'Read the conversation between Sachin and Shekhar. Change the phrase into a sentence. Shekhar says: "Yes, we are."' },
          { id: 'g6c1-pa2', no: 2, text: 'Read the conversation between Sachin and Shekhar. Change the phrase into a sentence. Sachin asks "Where are we meeting?" and Shekhar says: "At the food court"' },
          { id: 'g6c1-pa3', no: 3, text: 'Read the conversation between Sachin and Shekhar. Change the phrase into a sentence. Sachin asks "Is there an occasion for a party?" and Shekhar says: "Wait and see"' },
          { id: 'g6c1-pa4', no: 4, text: 'Read the conversation between Sachin and Shekhar. Change the phrase into a sentence. Shekhar says: "See you"' }
        ] },
        { title: 'Practice B: Punctuate the sentences and write the type (page 9)',
          rules: { kind: 'grammar', topic: 'Four types of sentences: declarative, imperative, interrogative and exclamatory (use, capital letter, end punctuation)' },
          questions: [
          { id: 'g6c1-pb1', no: 1, text: 'Punctuate the sentence correctly and write which type of sentence it is: the trek up the mountains is dangerous.' },
          { id: 'g6c1-pb2', no: 2, text: 'Punctuate the sentence correctly and write which type of sentence it is: stop the train, please.' },
          { id: 'g6c1-pb3', no: 3, text: 'Punctuate the sentence correctly and write which type of sentence it is: we won the world cup !' },
          { id: 'g6c1-pb4', no: 4, text: 'Punctuate the sentence correctly and write which type of sentence it is: which band will come to the concert ?' },
          { id: 'g6c1-pb5', no: 5, text: 'Punctuate the sentence correctly and write which type of sentence it is: follow the instructions carefully.' },
          { id: 'g6c1-pb6', no: 6, text: 'Punctuate the sentence correctly and write which type of sentence it is: congratulations on winning the scholarship !' }
        ] },
        { title: 'Practice C: Change the declarative sentences into exclamatory sentences (page 10)',
          rules: { kind: 'grammar', topic: 'Changing assertive (declarative) sentences into exclamatory sentences using What (when a/an is before the adjective) and How (when a/an is missing)' },
          questions: [
          { id: 'g6c1-pc1', no: 1, text: 'Change the declarative sentence into an exclamatory sentence: The woodcutter is an honest man.' },
          { id: 'g6c1-pc2', no: 2, text: 'Change the declarative sentence into an exclamatory sentence: The cricket match was exciting.' },
          { id: 'g6c1-pc3', no: 3, text: 'Change the declarative sentence into an exclamatory sentence: Mr Deep is an amazing writer.' },
          { id: 'g6c1-pc4', no: 4, text: 'Change the declarative sentence into an exclamatory sentence: Robin is an intelligent student.' },
          { id: 'g6c1-pc5', no: 5, text: 'Change the declarative sentence into an exclamatory sentence: The bird flew fast to reach its nest.' },
          { id: 'g6c1-pc6', no: 6, text: 'Change the declarative sentence into an exclamatory sentence: The whale travels far towards warm waters.' },
          { id: 'g6c1-pc7', no: 7, text: 'Change the declarative sentence into an exclamatory sentence: This is a beautiful Ming vase.' },
          { id: 'g6c1-pc8', no: 8, text: 'Change the declarative sentence into an exclamatory sentence: The food smells bad.' }
        ] },
        { title: 'Subject and Predicate, Practice A: Complete the sentences using suitable subjects and predicates (page 11)',
          rules: { kind: 'grammar', topic: 'Subject and predicate of a sentence, and the implied subject "you" in imperative sentences' },
          questions: [
          { id: 'g6c1-sa1', no: 1, text: 'Complete the sentence using a suitable predicate: The cat ________.' },
          { id: 'g6c1-sa2', no: 2, text: 'Complete the sentence using a suitable subject: ________ plays the guitar.' },
          { id: 'g6c1-sa3', no: 3, text: 'Complete the sentence using a suitable subject: ________ sets in the west.' },
          { id: 'g6c1-sa4', no: 4, text: 'Complete the sentence using a suitable subject: ________ gave us homework.' },
          { id: 'g6c1-sa5', no: 5, text: 'Complete the sentence using a suitable predicate: We ________.' },
          { id: 'g6c1-sa6', no: 6, text: 'Complete the sentence using a suitable subject: ________ waters the plants every morning.' },
          { id: 'g6c1-sa7', no: 7, text: "Complete the sentence using a suitable subject: ________ don't have to wait for the bus." },
          { id: 'g6c1-sa8', no: 8, text: 'Complete the sentence using suitable subjects: ________ and ________ are cousins.' },
          { id: 'g6c1-sa9', no: 9, text: 'Complete the sentence using a suitable subject (the subject comes after the predicate here): ________ sat a little bird.' },
          { id: 'g6c1-sa10', no: 10, text: 'Complete the sentence using a suitable predicate: Under the tree ________.' }
        ] },
        { title: 'Subject and Predicate, Practice B (HOTS, page 12)',
          rules: { kind: 'writing', topic: 'Writing an informal letter to a brother or friend (format: address and date, salutation, body in short paragraphs, closing, name), using all four types of sentences' },
          questions: [
          { id: 'g6c1-sb1', no: 1, label: 'B.', text: 'Write a letter to your brother telling him about a camping trip you went on in Rishikesh. Use the four different types of sentences you have learnt.' }
        ] }
      ]
    },
    { no: 2, title: 'Nouns', kind: 'Grammar', locked: true, sections: [] },
    { no: 3, title: 'Nouns: Number, Gender and Case', kind: 'Grammar', locked: true, sections: [] },
    { no: 4, title: 'Adjectives', kind: 'Grammar', locked: true, sections: [] },
    { no: 5, title: 'Adjectives: Degrees of Comparison', kind: 'Grammar', locked: true, sections: [] },
    { no: 6, title: 'Articles', kind: 'Grammar', locked: true, sections: [] },
    { no: 7, title: 'Pronouns', kind: 'Grammar', locked: true, sections: [] },
    { no: 8, title: 'Personal Pronouns: Number, Gender, Case', kind: 'Grammar', locked: true, sections: [] },
    { no: 9, title: 'Prepositions and Conjunctions', kind: 'Grammar', locked: true, sections: [] },
    { no: 10, title: 'Verbs', kind: 'Grammar', locked: true, sections: [] },
    { no: 11, title: 'Verbs: Complements, Auxiliaries, Finite and Non-finite', kind: 'Grammar', locked: true, sections: [] },
    { no: 12, title: 'Tenses', kind: 'Grammar', locked: true, sections: [] },
    { no: 13, title: 'Continuous Tenses', kind: 'Grammar', locked: true, sections: [] },
    { no: 14, title: 'Perfect Tenses', kind: 'Grammar', locked: true, sections: [] },
    { no: 15, title: 'Modals', kind: 'Grammar', locked: true, sections: [] },
    { no: 16, title: 'Active and Passive Voice', kind: 'Grammar', locked: true, sections: [] },
    { no: 17, title: 'Subject-Verb Agreement', kind: 'Grammar', locked: true, sections: [] },
    { no: 18, title: 'Direct and Indirect Speech', kind: 'Grammar', locked: true, sections: [] },
    { no: 19, title: 'Reading Comprehension', kind: 'Writing', locked: true, sections: [] },
    { no: 20, title: 'Informal Letters and Emails', kind: 'Writing', locked: true, sections: [] },
    { no: 21, title: 'Formal Letters and Emails', kind: 'Writing', locked: true, sections: [] },
    { no: 22, title: 'Paragraph Writing', kind: 'Writing', locked: true, sections: [] },
    { no: 23, title: 'Precis Writing', kind: 'Writing', locked: true, sections: [] },
    { no: 24, title: 'Notice Writing', kind: 'Writing', locked: true, sections: [] },
    { no: 25, title: 'Diary Writing', kind: 'Writing', locked: true, sections: [] },
    { no: 26, title: 'Message Writing', kind: 'Writing', locked: true, sections: [] },
    { no: 27, title: 'Dialogue Writing', kind: 'Writing', locked: true, sections: [] },
    { no: 28, title: 'Writing a Story', kind: 'Writing', locked: true, sections: [] }
  ]
};
