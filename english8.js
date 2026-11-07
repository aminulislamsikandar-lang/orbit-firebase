// Class 8 English, Assamese medium. Question ids start with e8c<chapter>- so they never clash with other courses.
// `medium` tells the app which Medium chip shows this course (courses without `medium` are English medium).
// `context` on a chapter is hidden from students and only sent to the AI (lesson notes, word meanings, grammar notes).
const fs = require('fs');
const path = require('path');
// Lesson text lives in lessons/<name>.txt: one paragraph per block, blank line between paragraphs, lines starting with # are ignored.
const lessonText = name => {
  try {
    return fs.readFileSync(path.join(__dirname, 'lessons', name + '.txt'), 'utf8')
      .split(/\r?\n/).filter(l => !l.trim().startsWith('#')).join('\n')
      .split(/\n\s*\n/).map(x => x.replace(/\s*\n\s*/g, ' ').trim()).filter(Boolean);
  } catch (e) { return []; }
};

module.exports = {
  id: 'c8-english',
  subject: 'English',
  class: 8,
  medium: 'Assamese',
  chapters: [
    {
      no: 1, title: 'Essence of Etiquette', kind: 'Prose',
      lesson: lessonText('e8c1'),
      words: [
        ['subordinates', 'placed in a lower class, rank, or position'],
        ['upbringing', 'early training; a particular way of bringing up a child'],
        ['aid', 'to provide with what is useful in achieving an end'],
        ['genuine', 'sincere, honest'],
        ['virtue', 'a particular moral excellence'],
        ['tool', 'a handheld device that aids in accomplishing a task'],
        ['shifty', 'given to deception'],
        ['pivotal', 'vitally important'],
        ['litter', 'to strew with scattered articles'],
        ['graffiti', 'to deface with unauthorized writing or drawing']
      ],
      context: `Lesson 1 "Essence of Etiquette" (prose). Notes for the AI, summarised from the textbook:
- Etiquette is good behaviour which makes a human being different from animals. Etiquette or appropriate behaviour is important because a human being is a social animal. A man has good etiquette if he behaves in a socially responsible way.
- Origin: the idea of etiquette began among the nobles in early modern France. The word "etiquette" comes from the French word for ticket or label, which means these rules were printed and used as labels for good manners.
- Emily Post's book "Etiquette in Society, in Business, in Politics and at Home" was published in 1922. Through it she became famous as the pioneer of modern etiquette.
- Why etiquette is important: it enables a person to earn respect and appreciation in society. It teaches one the way to talk, walk and, most importantly, behave in polite company. The way one interacts with superiors, subordinates, fellow workers, friends, teachers and parents speaks a lot about one's personality and upbringing. No one feels like talking to a person who does not know how to speak or behave in a society.
- Important types of etiquette: social etiquette, meeting etiquette, eating etiquette, wedding etiquette, bathroom etiquette, business etiquette, telephone etiquette, etc.
- Social etiquette is especially important because being in a society is an everyday affair for a human being. Some basic rules of social etiquette have been followed for a very long time and are considered essential even today.
- Saying "thank you" costs nothing. It is good manners to thank people who come to your aid. Using words of appreciation and offering compliments and praise whenever required are also basic etiquette, but one needs to be genuine in one's appreciation.
- Self-control is also a basic rule of etiquette. Self-control is the ability to regulate one's emotions, thoughts and behaviour effectively in different situations. Keep a check on your behaviour, voice and emotions in a society. Do not be too loud. Do not boast about the things you possess or have accomplished.
- Talking and listening: do not be the only person talking all the time in a group. Let others speak and listen actively. The art of genuine listening is a precious virtue. Active listening builds relationships, career, respect and trust. Words are considered a strong tool in building and destroying relationships. Speak with kindness and due caution, choose words carefully and keep body language open.
- Punctuality: being on time is one of the most desired traits. Arriving too early is not good etiquette, nor is arriving late. Good etiquette tells us to be punctual at any cost.
- Eye contact: it is absolutely important to maintain eye contact during a conversation. It establishes a level of trust and understanding. It is also a sign of self-confidence and assurance. A person who looks at numerous other things during a conversation is viewed as unsure, untrustworthy and shifty.
- School etiquette plays a pivotal role in the character-building of a young student. As a future adult and responsible citizen, a student must follow school etiquette. Marks and academic excellence help a student become successful, but knowing how to conduct oneself and understanding what is right and wrong are essential to survive in this competitive world.
- Important rules of school and classroom etiquette: be punctual; obey the school rules; be respectful to the teachers and staff; pay attention while the teacher is talking; do not litter the classroom and school grounds; do not mess the toilets; do not make graffiti or vandalize school property; respect everyone's rights; practise being well-mannered.
- Closing idea: people who follow proper etiquette stand out in a crowd. A kind, soft-spoken, well-mannered person is the jewel of a polite society who inspires joy and positivity wherever he goes.
Word notes: subordinates = placed in a lower class, rank or position; upbringing = early training, a particular way of bringing up a child; aid = to provide with what is useful in achieving an end; genuine = sincere, honest; virtue = a particular moral excellence; tool = a handheld device that aids in accomplishing a task; shifty = given to deception; pivotal = vitally important; litter = to strew with scattered articles; graffiti = to deface with unauthorized writing or drawing.
Grammar notes (Determiners): determiners are words used before nouns to fix or determine the number, quantity or position of the noun; they work as adjectives. Kinds: articles (a, an, the); demonstratives (this, that, these, those); possessive determiners (my, your, his, her, their); distributives (each, every, neither, either); cardinals and ordinals (one, two, first, second); quantifiers (few, a few, the few, little, a little, the little, many, much, some, any, a lot of, plenty of). Rules: some is used in affirmative sentences, any in negative and interrogative sentences (exceptions: "Any woman can do this", "Some people don't like coffee"). Much = large quantity, with uncountable nouns; many = large number, with plural countable nouns; a lot of / plenty of = both. Few (plural countable) and little (uncountable) have a negative force and mean almost none. A few / the few go with plural countable nouns (a small number); a little / the little go with uncountable nouns (a small quantity). Each = a person or thing individually in a group of two or more, used with countable nouns ("Each of the boys will get a prize"); every = a group as a whole, with countable nouns ("Every room in the hotel was booked"). Either = one of two; neither = none of two. Use a before a consonant sound and an before a vowel sound (a European University because European starts with a "yoo" sound; an NCC cadet because NCC starts with the vowel sound "en"; a one rupee note because one starts with a "w" sound).
Key words: etiquette, thank you, self-control, talking, listening actively, on time, punctual, obey, eye contact, manners, kind, polite, positivity, respectful, pay attention.`,
      sections: [
        { title: 'Comprehension 1: Answer in complete sentences (page 3)', questions: [
          { id: 'e8c1-a1', no: 1, label: '1a.', text: 'What is etiquette?' },
          { id: 'e8c1-a2', no: 2, label: '1b.', text: 'Where is the word etiquette derived from and what does it mean?' },
          { id: 'e8c1-a3', no: 3, label: '1c.', text: 'Why is etiquette important?' },
          { id: 'e8c1-a4', no: 4, label: '1d.', text: 'What does etiquette teach us?' },
          { id: 'e8c1-a5', no: 5, label: '1e.', text: 'What are some of the important types of etiquette?' },
          { id: 'e8c1-a6', no: 6, label: '1f.', text: 'What is self-control?' },
          { id: 'e8c1-a7', no: 7, label: '1g.', text: 'How does active listening help?' }
        ] },
        { title: 'Comprehension 2 and 3 (page 3)', questions: [
          { id: 'e8c1-b1', no: 1, label: '2.', text: 'State some important rules of school and classroom etiquette.' },
          { id: 'e8c1-b2', no: 2, label: '3.', text: 'Why is maintaining eye contact during a conversation important?' }
        ] },
        { title: 'Comprehension 4: True or False (page 3)', questions: [
          { id: 'e8c1-t1', no: 1, label: '4a.', text: 'Write whether the following statement is true or false: Etiquette is not very important.', options: ['True', 'False'] },
          { id: 'e8c1-t2', no: 2, label: '4b.', text: "Write whether the following statement is true or false: To say 'thank you' costs you nothing.", options: ['True', 'False'] },
          { id: 'e8c1-t3', no: 3, label: '4c.', text: 'Write whether the following statement is true or false: Self-control is one of the basic rules of etiquette.', options: ['True', 'False'] },
          { id: 'e8c1-t4', no: 4, label: '4d.', text: 'Write whether the following statement is true or false: We should speak as loudly as possible.', options: ['True', 'False'] },
          { id: 'e8c1-t5', no: 5, label: '4e.', text: 'Write whether the following statement is true or false: People usually don\'t like a kind, soft spoken, well-mannered person.', options: ['True', 'False'] }
        ] },
        { title: 'Grammar and Usage: Determiners, Activity 1 (page 6)', rules: { kind: 'grammar', topic: 'Determiners (articles a/an/the; some and any; much, many, a lot of, plenty of; few and little; a few, the few, a little, the little; each and every; either and neither)' }, questions: [
          { id: 'e8c1-g1', no: 1, label: 'a)', text: 'Fill in the blank with the correct determiner: He received ______ help from his teachers.', options: ['much', 'many'] },
          { id: 'e8c1-g2', no: 2, label: 'b)', text: 'Fill in the blank with the correct determiner: I can depend on ______ friends I have.', options: ['a few', 'the few'] },
          { id: 'e8c1-g3', no: 3, label: 'c)', text: 'Fill in the blank with the correct determiner: My brother is studying in ______ European University.', options: ['a', 'an'] },
          { id: 'e8c1-g4', no: 4, label: 'd)', text: 'Fill in the blank with the correct determiner: He gave away ______ money he had to the beggars.', options: ['a little', 'the little'] },
          { id: 'e8c1-g5', no: 5, label: 'e)', text: 'Fill in the blank with the correct determiner: ______ of my friends helped me much in my distress.', options: ['some', 'any'] },
          { id: 'e8c1-g6', no: 6, label: 'f)', text: 'Fill in the blank with the correct determiner: My brother is ______ NCC cadet.', options: ['a', 'an'] },
          { id: 'e8c1-g7', no: 7, label: 'g)', text: 'Fill in the blank with the correct determiner: He does not trust ______ friends he has.', options: ['a few', 'the few'] },
          { id: 'e8c1-g8', no: 8, label: 'h)', text: 'Fill in the blank with the correct determiner: A busy person has ______ time to waste.', options: ['little', 'a little'] },
          { id: 'e8c1-g9', no: 9, label: 'i)', text: 'Fill in the blank with the correct determiner: He gave me ______ one rupee note.', options: ['a', 'an'] },
          { id: 'e8c1-g10', no: 10, label: 'j)', text: 'Fill in the blank with the correct determiner: Can you lend me ______ books?', options: ['few', 'a few'] },
          { id: 'e8c1-g11', no: 11, label: 'k)', text: 'Fill in the blank with the correct determiner: He will stay here for ______ while.', options: ['a', 'an'] },
          { id: 'e8c1-g12', no: 12, label: 'l)', text: 'Fill in the blank with the correct determiner: ______ of the boys has done his work.', options: ['each', 'every'] },
          { id: 'e8c1-g13', no: 13, label: 'm)', text: 'Fill in the blank with the correct determiner: She has ______ things to do.', options: ['a lot of', 'much'] },
          { id: 'e8c1-g14', no: 14, label: 'n)', text: 'Fill in the blank with the correct determiner: I cannot give you ______ money.', options: ['some', 'any'] },
          { id: 'e8c1-g15', no: 15, label: 'o)', text: 'Fill in the blank with the correct determiner: This is not ______ usual happening.', options: ['a', 'an'] },
          { id: 'e8c1-g16', no: 16, label: 'p)', text: 'Fill in the blank with the correct determiner: That girl has ______ good qualities.', options: ['many', 'much'] },
          { id: 'e8c1-g17', no: 17, label: 'q)', text: 'Fill in the blank with the correct determiner: Can you help me with ______ money?', options: ['some', 'any'] },
          { id: 'e8c1-g18', no: 18, label: 'r)', text: 'Fill in the blank with the correct determiner: Did you buy ______ oranges today?', options: ['some', 'any'] },
          { id: 'e8c1-g19', no: 19, label: 's)', text: 'Fill in the blank with the correct determiner: Our teacher gave us ______ useful advice.', options: ['much', 'many'] },
          { id: 'e8c1-g20', no: 20, label: 't)', text: 'Fill in the blank with the correct determiner: Kalidasa is ______ Shakespeare of India.', options: ['a', 'the'] }
        ] },
        { title: 'Writing Activity: Application (page 7)', rules: { kind: 'writing', topic: 'Writing a formal application or letter to the Principal / Head of the school (leave application, request application)' }, questions: [
          {
            id: 'e8c1-w1', no: 1, label: '1.', text: 'Write a letter to the principal of your school seeking a leave of absence for three days.',
            context: `Textbook model answer (use this format): To / The Principal / XYZ School / Chandmari, Guwahati-3. Date: 26-12-2023. Subject: Application for leave of absence. Respected sir, Most respectfully I beg to state to you that I will not be able to attend my classes from 27.12.2023 to 29.12.2023 because of my elder brother's marriage ceremony which is going to be solemnized on 28.12.2023. I, therefore, request you to kindly grant me the leave of absence for those three days. I will remain grateful to you for your kind consideration. Yours faithfully, X, Class: VIII (C), Roll No: 3.`
          },
          { id: 'e8c1-w2', no: 2, label: 'Activity 1.', text: 'Write an application to the Head of your school to provide better library facilities to the students.' },
          { id: 'e8c1-w3', no: 3, label: 'Activity 2.', text: 'Write an application to the Principal of your school asking for a half-day leave to attend a puja at home.' }
        ] }
      ]
    }
  ]
};
